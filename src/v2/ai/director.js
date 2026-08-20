import { analyzeFactionTheater } from './theater.js';
import { getFactionStrategicProfile, planFactionMonth } from './strategic.js';
import { markOperationDetected, reactToDetectedInvasions } from './reactive.js';
import { bestOfficerAt, commandBudget, disbandArmy, formArmy, orderDevelopment, orderDiplomacyMission, orderProduction, orderRecruitOfficerMission, orderRecruitTroops, orderScoutMission, orderTransport, reinforceArmy } from '../domain/commands.js';
import { observationDetectionBonus } from '../domain/onepiece.js';
import { exhaustedArmies } from '../domain/recovery.js';
import { diplomacyBetween } from '../domain/diplomacy.js';
import { orderWarDeclaration } from '../domain/foreign-policy.js';
import { shortestRoute } from '../world/graph.js';

function settlements(state,fid){return Object.values(state.settlements||{}).filter(s=>s.ownerFactionId===fid)}
function armies(state,fid){return Object.values(state.armies||{}).filter(a=>a.factionId===fid&&a.status!=='destroyed')}
function waitingAt(state,fid,nodeId){return armies(state,fid).filter(a=>a.status==='waiting'&&a.currentNodeId===nodeId)}
function totalStrength(state,fid){return settlements(state,fid).reduce((n,s)=>n+(s.troops||0),0)+armies(state,fid).reduce((n,a)=>n+(a.troops||0),0)}
function activeMission(state,fid,type,target=null){return Object.values(state.operations||{}).some(o=>o.factionId===fid&&o.type===type&&!['completed','failed','cancelled'].includes(o.status)&&(!target||o.payload?.targetFactionId===target||o.payload?.targetNodeId===target))}
function demobilizeBroken(state,fid){let n=0;for(const a of exhaustedArmies(state,fid)){if(commandBudget(state,fid).remaining<=0)break;if(disbandArmy(state,{factionId:fid,armyId:a.id}))n++}return n}
function replenishFrontArmies(state,fid,theater){let n=0;for(const nodeId of theater.frontlineNodeIds)for(const a of waitingAt(state,fid,nodeId)){if(commandBudget(state,fid).remaining<=0)return n;if((a.troops||0)<1200||(a.supplies||0)<70){if(reinforceArmy(state,{factionId:fid,armyId:a.id,troops:400,supplyPoints:50}))n++}}return n}
function formForces(state,fid,theater,profile){
  const desired=Math.max(1,Math.min(4,1+Math.floor(settlements(state,fid).length/2)+(profile.aggression>.8?1:0))),existing=armies(state,fid).length;if(existing>=desired||commandBudget(state,fid).remaining<=0)return 0;
  const candidates=[...theater.frontlineNodeIds,...theater.rearNodeIds].map(id=>state.settlements[id]).filter(Boolean).sort((a,b)=>b.troops-a.troops);let formed=0;
  for(const s of candidates){if(existing+formed>=desired||commandBudget(state,fid).remaining<=0)break;const o=bestOfficerAt(state,fid,s.nodeId,'command');if(!o||s.troops<1900||s.food<1100)continue;const troops=Math.min(2400,Math.max(1000,Math.floor((s.troops-700)*.62/100)*100));if(formArmy(state,{factionId:fid,nodeId:s.nodeId,commanderId:o.id,troops,supplyPoints:Math.min(220,100+Math.floor(profile.logistics*100))}))formed++}return formed;
}
function feedFront(state,fid,theater){if(commandBudget(state,fid).remaining<=0)return 0;const target=theater.frontlineNodeIds.map(id=>state.settlements[id]).filter(s=>s&&s.food<2600).sort((a,b)=>a.food-b.food)[0];if(!target)return 0;const donor=settlements(state,fid).filter(s=>s.nodeId!==target.nodeId&&s.food>5200).sort((a,b)=>b.food-a.food)[0];if(!donor)return 0;const o=bestOfficerAt(state,fid,donor.nodeId,'logistics');return o&&orderTransport(state,{factionId:fid,originNodeId:donor.nodeId,destinationNodeId:target.nodeId,commanderId:o.id,cargo:{food:Math.min(1800,donor.food-3600)}})?1:0}
function domesticOrders(state,fid,theater,profile){let n=0;const list=settlements(state,fid).sort((a,b)=>(theater.frontlineNodeIds.includes(a.nodeId)?1:0)-(theater.frontlineNodeIds.includes(b.nodeId)?1:0));for(const s of list){if(commandBudget(state,fid).remaining<=0)break;if(s.food<2200&&s.money>=220){const o=bestOfficerAt(state,fid,s.nodeId,'logistics');if(o&&orderProduction(state,{factionId:fid,nodeId:s.nodeId,officerId:o.id})){n++;continue}}if(s.troops<1800+(theater.frontlineNodeIds.includes(s.nodeId)?1000:0)&&s.money>=700&&s.food>=700){const o=bestOfficerAt(state,fid,s.nodeId,'recruitment');if(o&&orderRecruitTroops(state,{factionId:fid,nodeId:s.nodeId,officerId:o.id,amount:profile.aggression>.75?600:400})){n++;continue}}if(s.development<s.cap-4&&s.money>=900&&profile.aggression<.9){const o=bestOfficerAt(state,fid,s.nodeId,'politics');if(o&&orderDevelopment(state,{factionId:fid,nodeId:s.nodeId,officerId:o.id}))n++}}return n}
function missionOrigin(state,fid,role='scout'){
  const preferred=state.factions?.[fid]?.capitalNodeId,owned=settlements(state,fid);const nodes=[preferred,...owned.map(s=>s.nodeId)].filter(Boolean);
  for(const node of nodes){const o=bestOfficerAt(state,fid,node,role);if(o)return {nodeId:node,officer:o}}return null;
}
function foreignPolicyOrders(state,fid,theater,profile){
  const result={orders:0,seekTruce:false};if(commandBudget(state,fid).remaining<=0)return result;
  const enemies=Object.keys(state.factions||{}).filter(x=>x!==fid&&diplomacyBetween(state,fid,x).status==='war');const own=totalStrength(state,fid);
  if(profile.caution>.68&&enemies.length&&!armies(state,fid).some(a=>a.status==='moving')){
    const strongest=enemies.map(e=>({fid:e,strength:totalStrength(state,e)})).sort((a,b)=>b.strength-a.strength)[0];
    if(strongest&&own<strongest.strength*.82&&!activeMission(state,fid,'diplomacy',strongest.fid)){
      const envoy=missionOrigin(state,fid,'politics');if(envoy&&orderDiplomacyMission(state,{factionId:fid,targetFactionId:strongest.fid,originNodeId:envoy.nodeId,officerId:envoy.officer.id,proposal:'truce'})){result.orders++;result.seekTruce=true}
    }
  }
  if(!enemies.length&&profile.aggression>.68&&(state.factions[fid].aiState?.inactivityMonths||0)>=1&&commandBudget(state,fid).remaining>0){
    const neutrals=Object.keys(state.factions).filter(x=>x!==fid&&diplomacyBetween(state,fid,x).status==='neutral');let best=null;
    for(const target of neutrals)for(const ownBase of settlements(state,fid))for(const targetBase of settlements(state,target)){
      const route=shortestRoute(state.graph,ownBase.nodeId,targetBase.nodeId);if(route&&(!best||route.days<best.days))best={target,days:route.days};
    }
    if(best&&best.days<=45&&orderWarDeclaration(state,{factionId:fid,targetFactionId:best.target}))result.orders++;
  }
  if(theater.objectiveNodeId&&!activeMission(state,fid,'scout',theater.objectiveNodeId)&&commandBudget(state,fid).remaining>0){const scout=missionOrigin(state,fid,'scout');if(scout&&orderScoutMission(state,{factionId:fid,originNodeId:scout.nodeId,targetNodeId:theater.objectiveNodeId,officerId:scout.officer.id}))result.orders++}
  if(profile.opportunism>.85&&state.turn%4===0&&commandBudget(state,fid).remaining>0&&!activeMission(state,fid,'officer_recruitment')){
    const recruiter=missionOrigin(state,fid,'recruitment'),target=Object.values(state.officers).filter(o=>o.factionId!==fid&&o.status==='available'&&o.assignment?.kind==='base'&&(o.loyalty??70)<=70).sort((a,b)=>(a.loyalty??70)-(b.loyalty??70))[0];
    if(recruiter&&target&&orderRecruitOfficerMission(state,{factionId:fid,originNodeId:recruiter.nodeId,officerId:recruiter.officer.id,targetOfficerId:target.id}))result.orders++;
  }
  return result;
}

export function runFactionMonthlyDirector(state,factionId){
  const profile=getFactionStrategicProfile(state,factionId),theater=analyzeFactionTheater(state,factionId),summary={factionId,demobilized:0,replenished:0,formed:0,transports:0,diplomacy:0,domestic:0,offensives:0};
  summary.demobilized=demobilizeBroken(state,factionId);summary.replenished=replenishFrontArmies(state,factionId,theater);summary.formed=formForces(state,factionId,theater,profile);summary.transports=feedFront(state,factionId,theater);const foreign=foreignPolicyOrders(state,factionId,theater,profile);summary.diplomacy=foreign.orders;if(!foreign.seekTruce)summary.offensives=planFactionMonth(state,factionId,{maxOrders:Math.max(1,Math.floor(1+profile.aggression*2))}).length;summary.domestic=domesticOrders(state,factionId,theater,profile);
  if(state.stats)state.stats.aiOrders=(state.stats.aiOrders||0)+Object.entries(summary).filter(([k])=>k!=='factionId').reduce((n,[,v])=>n+(Number(v)||0),0);return summary;
}
export function runAllFactionMonthlyDirectors(state,{playerFactionId=state.playerFactionId}={}){const result={};for(const fid of Object.keys(state.factions||{})){if(fid===playerFactionId)continue;result[fid]=runFactionMonthlyDirector(state,fid)}return result}
function autoDetectThreats(state){for(const op of Object.values(state.operations||{})){if(op.type!=='army_march'||op.objective!=='attack'||op.status!=='marching')continue;const defender=state.graph.nodes[op.destinationNodeId]?.ownerFactionId;if(!defender||defender===op.factionId||state.intelligence.detectedByFaction?.[defender]?.[op.id])continue;const observation=observationDetectionBonus(state,defender,op.destinationNodeId),scouted=state.intelligence.scoutedNodes?.[defender]?.[op.destinationNodeId],scoutActive=Boolean(scouted&&scouted.untilDay>=state.day),horizon=7+Math.floor(observation/2)+(scoutActive?12:0);if((op.travelDaysRemaining??999)<=horizon)markOperationDetected(state,defender,op.id,{confidence:Math.min(1,.62+observation*.025+(scoutActive?0.18:0))})}}
export function runDailyReactiveDirector(state,{playerFactionId=state.playerFactionId}={}){autoDetectThreats(state);const result={};for(const fid of Object.keys(state.factions||{})){if(fid===playerFactionId)continue;result[fid]=reactToDetectedInvasions(state,fid)}return result}
