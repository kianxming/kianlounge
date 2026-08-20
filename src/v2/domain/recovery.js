import { SUPPLY_FOOD_PER_POINT } from './commands.js';

function settlementAt(state,nodeId){return state.settlements?.[nodeId]||Object.values(state.settlements||{}).find(s=>s.nodeId===nodeId)||null}

export function recoverArmiesAtFriendlyBasesOneDay(state){
  for(const army of Object.values(state.armies||{})){
    if(army.status!=='waiting'||!army.currentNodeId)continue;
    const base=settlementAt(state,army.currentNodeId);if(!base||base.ownerFactionId!==army.factionId)continue;
    army.morale=Math.min(100,(army.morale??100)+2);
    army.readiness=Math.min(100,(army.readiness??100)+3);
    if((army.supplies??0)<80&&base.food>=SUPPLY_FOOD_PER_POINT*10){
      const points=Math.min(15,Math.floor(base.food/SUPPLY_FOOD_PER_POINT),120-(army.supplies||0));
      if(points>0){base.food-=points*SUPPLY_FOOD_PER_POINT;army.supplies=(army.supplies||0)+points}
    }
  }
}

export function exhaustedArmies(state,factionId){
  return Object.values(state.armies||{}).filter(a=>a.factionId===factionId&&a.status==='waiting'&&a.currentNodeId&&((a.troops||0)<500||(a.morale??100)<25||(a.readiness??100)<25));
}
