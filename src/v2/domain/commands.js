import { createArmyMarchOperation, createOfficerMission } from '../core/operations.js';
import { declareWar, diplomacyBetween } from './diplomacy.js';

export const SUPPLY_FOOD_PER_POINT=5;
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const round100=v=>Math.max(0,Math.floor(Number(v||0)/100)*100);

function commandPhase(state){if(state.phase!=='command')throw new Error(`Commands are only available during command phase, got ${state.phase}`)}
function settlementAt(state,nodeId){return state.settlements?.[nodeId]||Object.values(state.settlements||{}).find(s=>s.nodeId===nodeId)||null}
function ownedSettlements(state,factionId){return Object.values(state.settlements||{}).filter(s=>s.ownerFactionId===factionId)}

export function factionCommandPointMax(state,factionId){
  const bases=ownedSettlements(state,factionId).length;
  const leader=state.factions?.[factionId]?.leaderId?state.officers?.[state.factions[factionId].leaderId]:null;
  const charisma=leader?.charisma??60;
  return clamp(4+bases+Math.floor(charisma/40),4,12);
}

export function resetCommandBudgets(state){
  state.commandBudgets={};
  for(const factionId of Object.keys(state.factions||{})){
    const max=factionCommandPointMax(state,factionId);
    state.commandBudgets[factionId]={max,remaining:max,spent:0};
  }
  return state.commandBudgets;
}

export function commandBudget(state,factionId){
  state.commandBudgets??={};
  if(!state.commandBudgets[factionId]){
    const max=factionCommandPointMax(state,factionId);
    state.commandBudgets[factionId]={max,remaining:max,spent:0};
  }
  return state.commandBudgets[factionId];
}

function spend(state,factionId,cost=1){
  const budget=commandBudget(state,factionId);
  if(budget.remaining<cost)return false;
  budget.remaining-=cost;budget.spent+=cost;return true;
}
function refund(state,factionId,cost=1){const b=commandBudget(state,factionId);b.remaining=Math.min(b.max,b.remaining+cost);b.spent=Math.max(0,b.spent-cost)}

export function availableOfficersAt(state,factionId,nodeId){
  return Object.values(state.officers||{}).filter(o=>o.factionId===factionId&&o.assignment?.kind==='base'&&o.assignment.nodeId===nodeId&&o.status!=='dead'&&o.status!=='prisoner');
}

export function officerCommandValue(o){
  if(!o)return 0;
  const trait=(o.traits||[]).reduce((n,t)=>n+({'Natural Leader':8,Commander:10,'Grand Commander':16,Strategist:7,Logistician:4}[t]||0),0);
  return o.charisma*.46+o.martial*.22+o.intelligence*.20+o.politics*.12+trait;
}

export function bestOfficerAt(state,factionId,nodeId,role='command'){
  const score={
    command:o=>officerCommandValue(o),
    politics:o=>o.politics*.62+o.intelligence*.23+o.charisma*.15,
    logistics:o=>o.intelligence*.58+o.politics*.30+o.charisma*.12,
    recruitment:o=>o.charisma*.55+o.politics*.25+o.intelligence*.20,
    scout:o=>o.intelligence*.52+o.martial*.18+o.charisma*.12+(o.haki?.observation?.grade==='A'?12:o.haki?.observation?.grade==='S'?16:0)
  }[role]||((o)=>officerCommandValue(o));
  return availableOfficersAt(state,factionId,nodeId).sort((a,b)=>score(b)-score(a))[0]||null;
}

function domesticOrder(state,{factionId,nodeId,officerId,type,taskDays,payload,cost=1}){
  commandPhase(state);
  const settlement=settlementAt(state,nodeId),officer=state.officers?.[officerId];
  if(!settlement||settlement.ownerFactionId!==factionId)return null;
  if(!officer||officer.factionId!==factionId||officer.assignment?.kind!=='base'||officer.assignment.nodeId!==nodeId)return null;
  if(!spend(state,factionId,cost))return null;
  try{return createOfficerMission(state,{type,officerId,originNodeId:nodeId,destinationNodeId:nodeId,taskDays,returnRequired:false,payload});}
  catch(error){refund(state,factionId,cost);throw error}
}

export function orderDevelopment(state,{factionId,nodeId,officerId}){
  const s=settlementAt(state,nodeId);if(!s||s.money<300||s.development>=s.cap)return null;
  s.money-=300;
  const op=domesticOrder(state,{factionId,nodeId,officerId,type:'development',taskDays:24,payload:{developmentGain:3,costMoney:300}});
  if(!op)s.money+=300;
  return op;
}

export function orderRecruitTroops(state,{factionId,nodeId,officerId,amount=500}){
  const s=settlementAt(state,nodeId),troops=Math.max(100,round100(amount)),moneyCost=Math.round(troops*.7),foodCost=Math.round(troops*.5);
  if(!s||s.money<moneyCost||s.food<foodCost)return null;
  s.money-=moneyCost;s.food-=foodCost;
  const op=domesticOrder(state,{factionId,nodeId,officerId,type:'troop_recruitment',taskDays:Math.max(10,Math.ceil(troops/50)),payload:{troops,moneyCost,foodCost}});
  if(!op){s.money+=moneyCost;s.food+=foodCost}
  return op;
}

export function orderProduction(state,{factionId,nodeId,officerId}){
  const s=settlementAt(state,nodeId);if(!s||s.money<220)return null;
  s.money-=220;
  const op=domesticOrder(state,{factionId,nodeId,officerId,type:'food_production',taskDays:15,payload:{moneyCost:220}});
  if(!op)s.money+=220;
  return op;
}

export function formArmy(state,{factionId,nodeId,commanderId,deputyId=null,troops=1200,supplyPoints=120}){
  commandPhase(state);
  const s=settlementAt(state,nodeId),commander=state.officers?.[commanderId],deputy=deputyId?state.officers?.[deputyId]:null;
  troops=Math.max(500,round100(troops));supplyPoints=Math.max(20,Math.floor(supplyPoints));
  const foodCost=supplyPoints*SUPPLY_FOOD_PER_POINT;
  if(!s||s.ownerFactionId!==factionId||s.troops-troops<500||s.food<foodCost)return null;
  if(!commander||commander.factionId!==factionId||commander.assignment?.kind!=='base'||commander.assignment.nodeId!==nodeId)return null;
  if(deputyId===commanderId)return null;
  if(deputy&&(!deputy.assignment||deputy.assignment.kind!=='base'||deputy.assignment.nodeId!==nodeId||deputy.factionId!==factionId))return null;
  if(!spend(state,factionId,1))return null;
  state.nextIds.army??=1;
  const id=`army_v2_${state.nextIds.army++}`;
  s.troops-=troops;s.food-=foodCost;
  const officerIds=[commanderId,...(deputyId?[deputyId]:[])];
  state.armies[id]={id,factionId,commanderId,deputyId,officerIds,currentNodeId:nodeId,currentEdgeId:null,status:'waiting',troops,supplies:supplyPoints,morale:100,readiness:100,originNodeId:nodeId,supplySourceNodeId:nodeId,operationId:null,battleId:null,siegeId:null};
  for(const oid of officerIds)state.officers[oid].assignment={kind:'army',armyId:id};
  state.events.push({day:state.day,turn:state.turn,type:'military',message:`${commander.name} 군단 편성`,data:{armyId:id,nodeId,troops}});
  return state.armies[id];
}

export function reinforceArmy(state,{factionId,armyId,troops=500,supplyPoints=60}){
  commandPhase(state);
  const army=state.armies?.[armyId];if(!army||army.factionId!==factionId||army.status!=='waiting'||!army.currentNodeId)return false;
  const s=settlementAt(state,army.currentNodeId);if(!s||s.ownerFactionId!==factionId)return false;
  troops=Math.max(0,round100(troops));supplyPoints=Math.max(0,Math.floor(supplyPoints));
  const food=supplyPoints*SUPPLY_FOOD_PER_POINT;
  if(s.troops-troops<500||s.food<food||!spend(state,factionId,1))return false;
  s.troops-=troops;s.food-=food;army.troops+=troops;army.supplies+=supplyPoints;army.morale=Math.min(100,(army.morale??100)+10);army.readiness=Math.min(100,(army.readiness??100)+12);
  return true;
}

export function disbandArmy(state,{factionId,armyId}){
  commandPhase(state);
  const army=state.armies?.[armyId];if(!army||army.factionId!==factionId||army.status!=='waiting'||!army.currentNodeId)return false;
  const s=settlementAt(state,army.currentNodeId);if(!s||s.ownerFactionId!==factionId)return false;
  if(!spend(state,factionId,1))return false;
  s.troops+=army.troops;s.food+=Math.floor((army.supplies||0)*SUPPLY_FOOD_PER_POINT*.7);
  for(const oid of army.officerIds||[]){const o=state.officers[oid];if(o)o.assignment={kind:'base',nodeId:s.nodeId};}
  delete state.armies[armyId];
  return true;
}

export function orderArmyMarch(state,{factionId,armyId,destinationNodeId,objective='move',doctrine={}}){
  commandPhase(state);
  const army=state.armies?.[armyId];if(!army||army.factionId!==factionId||army.status!=='waiting')return null;
  const targetOwner=state.graph.nodes[destinationNodeId]?.ownerFactionId;
  if(objective==='attack'&&targetOwner&&targetOwner!==factionId&&!state.hostile(factionId,targetOwner))declareWar(state,factionId,targetOwner,'invasion_order');
  if(!spend(state,factionId,1))return null;
  try{return createArmyMarchOperation(state,{armyId,destinationNodeId,objective,doctrine:{enemyContact:'engage',postObjective:objective==='attack'?'siege':'hold',retreatMorale:24,...doctrine},payload:{orderedTurn:state.turn}})}
  catch(error){refund(state,factionId,1);throw error}
}

export function orderTransport(state,{factionId,originNodeId,destinationNodeId,commanderId,cargo={}}){
  commandPhase(state);
  const source=settlementAt(state,originNodeId),target=settlementAt(state,destinationNodeId),commander=state.officers?.[commanderId];
  if(!source||!target||source.ownerFactionId!==factionId||(!state.allied(factionId,target.ownerFactionId)&&target.ownerFactionId!==factionId))return null;
  if(!commander||commander.factionId!==factionId||commander.assignment?.kind!=='base'||commander.assignment.nodeId!==originNodeId)return null;
  const normalized={money:round100(cargo.money),food:round100(cargo.food),troops:round100(cargo.troops),prisoners:[...(cargo.prisoners||[])],devilFruits:[...(cargo.devilFruits||[])]};
  if(source.money<normalized.money||source.food<normalized.food||source.troops-normalized.troops<500)return null;
  if(!spend(state,factionId,1))return null;
  source.money-=normalized.money;source.food-=normalized.food;source.troops-=normalized.troops;
  try{return createOfficerMission(state,{type:'transport',officerId:commanderId,originNodeId,destinationNodeId,taskDays:0,returnRequired:false,payload:{cargo:normalized}})}
  catch(error){source.money+=normalized.money;source.food+=normalized.food;source.troops+=normalized.troops;refund(state,factionId,1);throw error}
}

export function orderScoutMission(state,{factionId,originNodeId,targetNodeId,officerId}){
  commandPhase(state);if(!spend(state,factionId,1))return null;
  try{return createOfficerMission(state,{type:'scout',officerId,originNodeId,destinationNodeId:targetNodeId,prepareDays:1,taskDays:5,returnRequired:true,payload:{targetNodeId}})}catch(e){refund(state,factionId,1);throw e}
}

export function orderDiplomacyMission(state,{factionId,targetFactionId,originNodeId,officerId,proposal='truce'}){
  commandPhase(state);
  const targetNodeId=state.factions?.[targetFactionId]?.capitalNodeId;if(!targetNodeId||targetFactionId===factionId)return null;
  if(!spend(state,factionId,1))return null;
  try{return createOfficerMission(state,{type:'diplomacy',officerId,originNodeId,destinationNodeId:targetNodeId,prepareDays:2,taskDays:7,returnRequired:true,payload:{targetFactionId,proposal,relationAtDeparture:diplomacyBetween(state,factionId,targetFactionId).status}})}catch(e){refund(state,factionId,1);throw e}
}

export function orderRecruitOfficerMission(state,{factionId,originNodeId,officerId,targetOfficerId}){
  commandPhase(state);
  const target=state.officers?.[targetOfficerId];
  const targetNodeId=target?.assignment?.kind==='base'?target.assignment.nodeId:null;
  if(!target||!targetNodeId||target.factionId===factionId)return null;
  if(!spend(state,factionId,1))return null;
  try{return createOfficerMission(state,{type:'officer_recruitment',officerId,originNodeId,destinationNodeId:targetNodeId,prepareDays:2,taskDays:14,returnRequired:true,payload:{targetOfficerId,targetFactionAtDeparture:target.factionId}})}catch(e){refund(state,factionId,1);throw e}
}

export function orderOfficerTransfer(state,{factionId,originNodeId,destinationNodeId,officerId}){
  commandPhase(state);if(!spend(state,factionId,1))return null;
  try{return createOfficerMission(state,{type:'officer_transfer',officerId,originNodeId,destinationNodeId,taskDays:0,returnRequired:false,payload:{}})}catch(e){refund(state,factionId,1);throw e}
}
