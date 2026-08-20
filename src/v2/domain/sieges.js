import { beginArmyRetreat } from '../core/operations.js';
import { settlementAtNode } from './settlements.js';

function hostile(state,a,b){
  if(a===b)return false;
  if(state.hostile)return state.hostile(a,b);
  if(state.allied?.(a,b))return false;
  return true;
}

function nextSiegeId(state){
  state.nextIds.siege??=1;
  return `siege_v2_${state.nextIds.siege++}`;
}

function ongoingFieldBattleAtNode(state,nodeId){
  return Object.values(state.battles||{}).some(b=>b.status==='ongoing'&&b.location.kind==='node'&&b.location.id===nodeId);
}

function attackerSupplyModifier(army){
  return {secure:1,strained:.92,critical:.78,cut:.62}[army.supplyState]??1;
}

function attackerPower(army){
  const morale=.35+.65*Math.max(0,Math.min(100,army.morale??100))/100;
  const readiness=.45+.55*Math.max(0,Math.min(100,army.readiness??100))/100;
  return Math.max(0,army.troops||0)*morale*readiness*attackerSupplyModifier(army);
}

function defenderPower(settlement){
  const morale=.35+.65*Math.max(0,Math.min(100,settlement.morale??80))/100;
  const devRatio=(settlement.development||0)/Math.max(1,settlement.cap||100);
  const fortification=1+Math.min(.45,devRatio*.35);
  const foodModifier=(settlement.food||0)>0?1:.72;
  return Math.max(0,settlement.troops||0)*morale*fortification*foodModifier;
}

function applyArmyLosses(armies,totalLoss,moraleLoss,readinessLoss){
  const total=Math.max(1,armies.reduce((s,a)=>s+(a.troops||0),0));
  let assigned=0;
  for(let i=0;i<armies.length;i++){
    const army=armies[i];
    const loss=i===armies.length-1?Math.max(0,totalLoss-assigned):Math.floor(totalLoss*(army.troops||0)/total);
    assigned+=loss;
    army.troops=Math.max(0,(army.troops||0)-loss);
    army.morale=Math.max(0,(army.morale??100)-moraleLoss);
    army.readiness=Math.max(0,(army.readiness??100)-readinessLoss);
  }
}

function activeAttackers(state,siege){
  return siege.attackerArmyIds.map(id=>state.armies[id]).filter(a=>
    a&&a.status==='siege'&&a.currentNodeId===siege.nodeId&&(a.troops||0)>0
  );
}

function addAttackerToSiege(state,siege,army){
  if(army.factionId!==siege.attackerFactionId)return false;
  if(!siege.attackerArmyIds.includes(army.id))siege.attackerArmyIds.push(army.id);
  army.status='siege';army.siegeId=siege.id;army.battleId=null;
  return true;
}

export function createSiege(state,{nodeId,attackerArmyId}){
  const settlement=settlementAtNode(state,nodeId);
  const attacker=state.armies[attackerArmyId];
  if(!settlement||!attacker)throw new Error('Siege requires settlement and attacker army');
  if(!hostile(state,attacker.factionId,settlement.ownerFactionId))throw new Error('Cannot siege non-hostile settlement');
  if(attacker.currentNodeId!==nodeId)throw new Error('Attacker must physically be at settlement node');
  if(settlement.activeSiegeId)throw new Error(`Settlement ${settlement.id} already has active siege`);

  const id=nextSiegeId(state);
  const siege={
    id,nodeId,settlementId:settlement.id,status:'ongoing',startDay:state.day,elapsedDays:0,
    attackerFactionId:attacker.factionId,defenderFactionId:settlement.ownerFactionId,
    attackerArmyIds:[attacker.id],initialGarrisonTroops:settlement.troops||0,
    attackerArrivals:[{day:state.day,armyId:attacker.id}],dailyHistory:[],result:null
  };
  state.sieges[id]=siege;
  settlement.activeSiegeId=id;
  attacker.status='siege';attacker.siegeId=id;attacker.battleId=null;
  return siege;
}

export function startEligibleSieges(state){
  for(const settlement of Object.values(state.settlements||{})){
    if(ongoingFieldBattleAtNode(state,settlement.nodeId))continue;
    const candidates=Object.values(state.armies).filter(a=>
      a.status==='waiting'&&a.currentNodeId===settlement.nodeId&&(a.troops||0)>0&&hostile(state,a.factionId,settlement.ownerFactionId)
    );
    if(!candidates.length)continue;

    const existing=settlement.activeSiegeId?state.sieges[settlement.activeSiegeId]:null;
    if(existing?.status==='ongoing'){
      for(const army of candidates){
        if(addAttackerToSiege(state,existing,army))existing.attackerArrivals.push({day:state.day,armyId:army.id});
      }
      continue;
    }

    createSiege(state,{nodeId:settlement.nodeId,attackerArmyId:candidates[0].id});
  }

  for(const siege of Object.values(state.sieges||{})){
    if(siege.status!=='ongoing'||ongoingFieldBattleAtNode(state,siege.nodeId))continue;
    const settlement=state.settlements[siege.settlementId];
    if(!settlement)continue;
    for(const army of Object.values(state.armies)){
      if(army.status==='waiting'&&army.currentNodeId===siege.nodeId&&army.factionId===siege.attackerFactionId){
        if(addAttackerToSiege(state,siege,army))siege.attackerArrivals.push({day:state.day,armyId:army.id});
      }
    }
  }
}

function releaseSiegeArmy(army){
  army.siegeId=null;
  if(army.status==='siege')army.status='waiting';
}

function failSiege(state,siege,reason){
  const settlement=state.settlements[siege.settlementId];
  siege.status='resolved';siege.result={winner:siege.defenderFactionId,reason,resolvedDay:state.day};
  if(settlement)settlement.activeSiegeId=null;
  for(const armyId of siege.attackerArmyIds){
    const army=state.armies[armyId];if(!army)continue;
    army.siegeId=null;
    if(army.currentNodeId===siege.nodeId&&army.status==='siege'){
      army.status='routed';
      try{beginArmyRetreat(state,army.id)}catch{army.status='stranded'}
    }
  }
}

function captureSettlement(state,siege){
  const settlement=state.settlements[siege.settlementId];
  if(!settlement)return;
  const oldOwner=settlement.ownerFactionId;
  const garrisonLoss=Math.max(0,siege.initialGarrisonTroops-(settlement.troops||0));
  const devDamage=Math.min(20,Math.max(3,Math.ceil(siege.elapsedDays*.25+garrisonLoss/650)));

  settlement.ownerFactionId=siege.attackerFactionId;
  settlement.troops=Math.max(0,settlement.troops||0);
  settlement.morale=45;
  settlement.development=Math.max(0,(settlement.development||0)-devDamage);
  settlement.starvationDays=0;
  settlement.activeSiegeId=null;
  if(state.graph.nodes[siege.nodeId])state.graph.nodes[siege.nodeId].ownerFactionId=siege.attackerFactionId;

  siege.status='resolved';
  siege.result={winner:siege.attackerFactionId,reason:'garrison_removed',resolvedDay:state.day,oldOwner,newOwner:siege.attackerFactionId,developmentDamage:devDamage};
  for(const armyId of siege.attackerArmyIds){
    const army=state.armies[armyId];if(army)releaseSiegeArmy(army);
  }
}

export function advanceSiegesOneDay(state){
  for(const siege of Object.values(state.sieges||{})){
    if(siege.status!=='ongoing')continue;
    if(ongoingFieldBattleAtNode(state,siege.nodeId))continue;
    const settlement=state.settlements[siege.settlementId];
    if(!settlement){siege.status='cancelled';continue}
    const attackers=activeAttackers(state,siege);
    if(!attackers.length){failSiege(state,siege,'attackers_disengaged');continue}

    siege.elapsedDays++;
    const aPower=Math.max(1,attackers.reduce((s,a)=>s+attackerPower(a),0));
    const dPower=Math.max(1,defenderPower(settlement));
    const aRatio=Math.max(.45,Math.min(2.7,dPower/aPower));
    const dRatio=Math.max(.45,Math.min(2.7,aPower/dPower));
    const pressure=Math.floor((siege.elapsedDays-1)/12);
    const attackerTroops=attackers.reduce((s,a)=>s+(a.troops||0),0);
    const attackerLoss=Math.max(1,Math.ceil(attackerTroops*.0038*aRatio));
    const defenderLoss=Math.max(1,Math.ceil((settlement.troops||0)*.0048*dRatio));
    const attackerMoraleLoss=1+Math.max(0,Math.floor((aRatio-.8)*2))+pressure;
    const defenderMoraleLoss=1+Math.max(0,Math.floor((dRatio-.75)*2))+pressure+((settlement.food||0)<=0?1:0);

    applyArmyLosses(attackers,attackerLoss,attackerMoraleLoss,aRatio>1.3?2:1);
    settlement.troops=Math.max(0,(settlement.troops||0)-defenderLoss);
    settlement.morale=Math.max(0,(settlement.morale??80)-defenderMoraleLoss);
    siege.dailyHistory.push({
      day:state.day,attackerLoss,defenderLoss,
      attackerTroops:attackers.reduce((s,a)=>s+(a.troops||0),0),
      defenderTroops:settlement.troops,
      attackerMorale:Math.round(attackers.reduce((s,a)=>s+(a.morale??100),0)/attackers.length),
      defenderMorale:settlement.morale,
      defenderFood:settlement.food||0
    });

    const attackerCapable=attackers.some(a=>(a.troops||0)>50&&(a.morale??100)>12&&(a.readiness??100)>8);
    const defenderCapable=(settlement.troops||0)>50&&(settlement.morale??80)>12;
    if(!attackerCapable){failSiege(state,siege,'attacker_broken');continue}
    if(!defenderCapable)captureSettlement(state,siege);
  }
}
