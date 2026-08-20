const clamp=(v,min,max)=>Math.max(min,Math.min(max,v));

export function normalizeSettlements(settlements=[]){
  if(!Array.isArray(settlements))return structuredClone(settlements||{});
  return Object.fromEntries(settlements.map(s=>[s.id,structuredClone(s)]));
}

export function garrisonFoodNeed(settlement){
  return Math.max(0,Math.ceil((settlement.troops||0)/1000));
}

export function advanceSettlementsOneDay(state){
  for(const settlement of Object.values(state.settlements||{})){
    settlement.money=Math.max(0,settlement.money??0);
    settlement.food=Math.max(0,settlement.food??0);
    settlement.troops=Math.max(0,settlement.troops??0);
    settlement.morale=clamp(settlement.morale??80,0,100);
    settlement.development=clamp(settlement.development??0,0,settlement.cap??100);

    const need=garrisonFoodNeed(settlement);
    if(need<=0){settlement.starvationDays=0;continue}
    if(settlement.food>=need){
      settlement.food-=need;
      settlement.starvationDays=0;
      continue;
    }

    settlement.food=0;
    settlement.starvationDays=(settlement.starvationDays||0)+1;
    settlement.morale=Math.max(0,settlement.morale-2);
    if(settlement.starvationDays>=3&&settlement.troops>0){
      const deserters=Math.max(1,Math.ceil(settlement.troops*.01));
      settlement.troops=Math.max(0,settlement.troops-deserters);
    }
  }
}

export function applyMonthlySettlementEconomy(state){
  for(const settlement of Object.values(state.settlements||{})){
    const dev=settlement.development??0;
    const market=settlement.market??Math.round(dev*.8);
    const income=Math.max(0,Math.floor(dev*4+market*3));
    const foodProduction=Math.max(0,Math.floor(dev*8+(settlement.agriculture??dev)*5));
    settlement.money=(settlement.money||0)+income;
    settlement.food=(settlement.food||0)+foodProduction;
    settlement.lastMonthlyIncome=income;
    settlement.lastMonthlyFoodProduction=foodProduction;
  }
}

export function settlementAtNode(state,nodeId){
  return Object.values(state.settlements||{}).find(s=>s.nodeId===nodeId||s.id===nodeId)||null;
}
