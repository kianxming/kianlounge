import { analyzeFactionTheater } from './theater.js';
import { getFactionStrategicProfile, planFactionMonth } from './strategic.js';
import { markOperationDetected, reactToDetectedInvasions } from './reactive.js';
import { bestOfficerAt, commandBudget, disbandArmy, formArmy, orderDevelopment, orderProduction, orderRecruitTroops, orderTransport, reinforceArmy } from '../domain/commands.js';
import { observationDetectionBonus } from '../domain/onepiece.js';
import { exhaustedArmies } from '../domain/recovery.js';

function settlements(state,fid){return Object.values(state.settlements||{}).filter(s=>s.ownerFactionId===fid)}
function armies(state,fid){return Object.values(state.armies||{}).filter(a=>a.factionId===fid&&a.status!=='destroyed')}
function waitingAt(state,fid,nodeId){return armies(state,fid).filter(a=>a.status==='waiting'&&a.currentNodeId===nodeId)}

function demobilizeBroken(state,fid){
  let n=0;
  for(const army of exhaustedArmies(state,fid)){if(commandBudget(state,fid).remaining<=0)break;if(disbandArmy(state,{factionId:fid,armyId:army.id}))n++}
  return n;
}

function replenishFrontArmies(state,fid,theater){
  let n=0;
  for(const nodeId of theater.frontlineNodeIds){
    for(const army of waitingAt(state,fid,nodeId)){
      if(commandBudget(state,fid).remaining<=0)return n;
      if((army.troops||0)<1200||(army.supplies||0)<70){if(reinforceArmy(state,{factionId:fid,armyId:army.id,troops:400,supplyPoints:50}))n++}
    }
  }
  return n;
}

function formForces(state,fid,theater,profile){
  const desired=Math.max(1,Math.min(4,1+Math.floor(settlements(state,fid).length/2)+(profile.aggression>.8?1:0))),existing=armies(state,fid).length;
  if(existing>=desired||commandBudget(state,fid).remaining<=0)return 0;
  const candidates=[...theater.frontlineNodeIds,...theater.rearNodeIds].map(id=>state.settlements[id]).filter(Boolean).sort((a,b)=>b.troops-a.troops);
  let formed=0;
  for(const s of candidates){
    if(existing+formed>=desired||commandBudget(state,fid).remaining<=0)break;
    const officer=bestOfficerAt(state,fid,s.nodeId,'command');if(!officer||s.troops<1900||s.food<1100)continue;
    const troops=Math.min(2400,Math.max(1000,Math.floor((s.troops-700)*.62/100)*100));
    const army=formArmy(state,{factionId:fid,nodeId:s.nodeId,commanderId:officer.id,troops,supplyPoints:Math.min(220,100+Math.floor(profile.logistics*100))});if(army)formed++;
  }
  return formed;
}

function feedFront(state,fid,theater){
  if(commandBudget(state,fid).remaining<=0)return 0;
  const target=theater.frontlineNodeIds.map(id=>state.settlements[id]).filter(s=>s&&s.food<2600).sort((a,b)=>a.food-b.food)[0];if(!target)return 0;
  const donor=settlements(state,fid).filter(s=>s.nodeId!==target.nodeId&&s.food>5200).sort((a,b)=>b.food-a.food)[0];if(!donor)return 0;
  const officer=bestOfficerAt(state,fid,donor.nodeId,'logistics');if(!officer)return 0;
  return orderTransport(state,{factionId:fid,originNodeId:donor.nodeId,destinationNodeId:target.nodeId,commanderId:officer.id,cargo:{food:Math.min(1800,donor.food-3600)}})?1:0;
}

function domesticOrders(state,fid,theater,profile){
  let n=0;
  const list=settlements(state,fid).sort((a,b)=>(theater.frontlineNodeIds.includes(a.nodeId)?1:0)-(theater.frontlineNodeIds.includes(b.nodeId)?1:0));
  for(const s of list){
    if(commandBudget(state,fid).remaining<=0)break;
    if(s.food<2200&&s.money>=220){const o=bestOfficerAt(state,fid,s.nodeId,'logistics');if(o&&orderProduction(state,{factionId:fid,nodeId:s.nodeId,officerId:o.id})){n++;continue}}
    if(s.troops<1800+(theater.frontlineNodeIds.includes(s.nodeId)?1000:0)&&s.money>=700&&s.food>=700){const o=bestOfficerAt(state,fid,s.nodeId,'recruitment');if(o&&orderRecruitTroops(state,{factionId:fid,nodeId:s.nodeId,officerId:o.id,amount:profile.aggression>.75?600:400})){n++;continue}}
    if(s.development<s.cap-4&&s.money>=900&&profile.aggression<.9){const o=bestOfficerAt(state,fid,s.nodeId,'politics');if(o&&orderDevelopment(state,{factionId:fid,nodeId:s.nodeId,officerId:o.id}))n++}
  }
  return n;
}

export function runFactionMonthlyDirector(state,factionId){
  const profile=getFactionStrategicProfile(state,factionId),theater=analyzeFactionTheater(state,factionId),summary={factionId,demobilized:0,replenished:0,formed:0,transports:0,domestic:0,offensives:0};
  summary.demobilized=demobilizeBroken(state,factionId);
  summary.replenished=replenishFrontArmies(state,factionId,theater);
  summary.formed=formForces(state,factionId,theater,profile);
  summary.transports=feedFront(state,factionId,theater);
  summary.offensives=planFactionMonth(state,factionId,{maxOrders:Math.max(1,Math.floor(1+profile.aggression*2))}).length;
  summary.domestic=domesticOrders(state,factionId,theater,profile);
  if(state.stats)state.stats.aiOrders=(state.stats.aiOrders||0)+summary.demobilized+summary.replenished+summary.formed+summary.transports+summary.offensives+summary.domestic;
  return summary;
}

export function runAllFactionMonthlyDirectors(state,{playerFactionId=state.playerFactionId}={}){
  const result={};for(const fid of Object.keys(state.factions||{})){if(fid===playerFactionId)continue;result[fid]=runFactionMonthlyDirector(state,fid)}return result;
}

function autoDetectThreats(state){
  for(const op of Object.values(state.operations||{})){
    if(op.type!=='army_march'||op.objective!=='attack'||op.status!=='marching')continue;
    const defender=state.graph.nodes[op.destinationNodeId]?.ownerFactionId;if(!defender||defender===op.factionId||state.intelligence.detectedByFaction?.[defender]?.[op.id])continue;
    const observation=observationDetectionBonus(state,defender,op.destinationNodeId),scouted=state.intelligence.scoutedNodes?.[defender]?.[op.destinationNodeId];
    const horizon=7+Math.floor(observation/2)+(scouted&&scouted.untilDay>=state.day?12:0);
    if((op.travelDaysRemaining??999)<=horizon)markOperationDetected(state,defender,op.id,{confidence:Math.min(1,.62+observation*.025+(scouted?.untilDay>=state.day?.18:0))});
  }
}

export function runDailyReactiveDirector(state,{playerFactionId=state.playerFactionId}={}){
  autoDetectThreats(state);const result={};
  for(const fid of Object.keys(state.factions||{})){if(fid===playerFactionId)continue;result[fid]=reactToDetectedInvasions(state,fid)}return result;
}
