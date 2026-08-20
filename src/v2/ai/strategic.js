import { shortestRoute } from '../world/graph.js';
import { createArmyMarchOperation } from '../core/operations.js';
import { armyDailySupplyNeed } from '../domain/supply.js';

const BASE_PROFILES={
  straw_hat:{aggression:.78,caution:.42,logistics:.56,opportunism:.58,allySupport:.95},
  beasts:{aggression:.95,caution:.18,logistics:.48,opportunism:.52,allySupport:.18},
  kozuki:{aggression:.62,caution:.68,logistics:.74,opportunism:.66,allySupport:.94},
  kurozumi:{aggression:.28,caution:.94,logistics:.64,opportunism:.42,allySupport:.12},
  heart:{aggression:.48,caution:.90,logistics:.95,opportunism:.98,allySupport:.60},
  kid:{aggression:.98,caution:.14,logistics:.36,opportunism:.70,allySupport:.10},
  big_mom:{aggression:.82,caution:.48,logistics:.68,opportunism:.78,allySupport:.30}
};

const clamp=(v,min=0,max=1)=>Math.max(min,Math.min(max,v));
const ownableNode=n=>['base','port'].includes(n.type);

function hostile(state,a,b){
  if(a===b)return false;
  if(state.hostile)return state.hostile(a,b);
  if(state.allied?.(a,b))return false;
  return true;
}

function applyTrait(profile,trait){
  if(trait==='Reckless'){profile.aggression+=.14;profile.caution-=.12}
  if(trait==='Strategist'){profile.opportunism+=.16;profile.caution+=.10;profile.logistics+=.05}
  if(trait==='Calm'){profile.caution+=.08;profile.opportunism+=.05}
  if(trait==='Cowardly'){profile.aggression-=.22;profile.caution+=.22}
  if(trait==='Logistician')profile.logistics+=.18;
  if(trait==='Natural Leader'){profile.allySupport+=.08;profile.aggression+=.04}
  if(trait==='Commander')profile.aggression+=.05;
  if(trait==='Grand Commander'){profile.aggression+=.09;profile.caution+=.03}
}

export function getFactionStrategicProfile(state,factionId){
  const faction=state.factions?.[factionId]||{};
  const base={...(BASE_PROFILES[factionId]||BASE_PROFILES.kozuki),...(faction.aiProfile||{})};
  const leader=faction.leaderId?state.officers?.[faction.leaderId]:null;
  for(const trait of leader?.traits||[])applyTrait(base,trait);
  for(const key of ['aggression','caution','logistics','opportunism','allySupport'])base[key]=clamp(base[key]);
  return {...base,leaderId:leader?.id||null};
}

function commanderProfile(state,army,factionProfile){
  const p={...factionProfile};
  const commanderId=army.commanderId||army.officerIds?.[0];
  const commander=commanderId?state.officers?.[commanderId]:null;
  for(const trait of commander?.traits||[])applyTrait(p,trait);
  for(const key of ['aggression','caution','logistics','opportunism'])p[key]=clamp(p[key]);
  return p;
}

function settlementAtNode(state,nodeId){
  return Object.values(state.settlements||{}).find(s=>s.nodeId===nodeId||s.id===nodeId)||null;
}

export function enemyStrengthAtNode(state,factionId,nodeId){
  const settlement=settlementAtNode(state,nodeId);
  const legacyGarrison=Math.max(0,state.graph.nodes[nodeId]?.garrisonTroops||0);
  const garrison=Math.max(legacyGarrison,settlement?.troops||0);
  const field=Object.values(state.armies).filter(a=>
    a.factionId!==factionId&&hostile(state,factionId,a.factionId)&&a.currentNodeId===nodeId&&a.status!=='destroyed'
  ).reduce((s,a)=>s+(a.troops||0),0);
  return garrison+field;
}

function projectedSupplyRequirement(army,route,profile){
  const daily=armyDailySupplyNeed(army)*(1+route.days/30);
  const campaignDays=Math.max(7,route.days+Math.ceil(6+profile.caution*8));
  return Math.ceil(daily*campaignDays*(.82+profile.logistics*.38));
}

function targetValue(node,state){
  if(Number.isFinite(node.strategicValue))return node.strategicValue;
  const settlement=settlementAtNode(state,node.id);
  const development=settlement?.development||0;
  const economicBonus=Math.min(14,development*.12+(settlement?.market||0)*.05);
  if(node.type==='base')return 30+economicBonus;
  if(node.type==='port')return 26+economicBonus;
  return 10;
}

function candidateScore(state,army,target,route,profile,inactivityMonths){
  const own=Math.max(100,army.troops||0)*(0.55+0.45*(army.morale??100)/100)*(0.55+0.45*(army.readiness??100)/100);
  const enemy=Math.max(450,enemyStrengthAtNode(state,army.factionId,target.id));
  const ratio=own/enemy;
  const supplyNeed=projectedSupplyRequirement(army,route,profile);
  const supplyRatio=(army.supplies??0)/Math.max(1,supplyNeed);
  const bias=state.factions?.[army.factionId]?.aiTargetBias?.[target.id]||0;

  let score=targetValue(target,state)+bias;
  score+=profile.aggression*34;
  score+=profile.opportunism*Math.min(28,Math.max(-10,(ratio-0.65)*22));
  score-=route.days*(.32+profile.caution*.72);
  score-=Math.max(0,1.05-ratio)*profile.caution*36;
  score-=Math.max(0,1-supplyRatio)*profile.logistics*45;
  score+=Math.min(18,inactivityMonths*3.5);
  return {score,ratio,supplyNeed,supplyRatio,enemyStrength:enemy};
}

function viableTargets(state,factionId){
  return Object.values(state.graph.nodes).filter(n=>ownableNode(n)&&n.ownerFactionId&&hostile(state,factionId,n.ownerFactionId));
}

function availableArmies(state,factionId){
  return Object.values(state.armies).filter(a=>
    a.factionId===factionId&&a.status==='waiting'&&a.currentNodeId&&!a.operationId&&(a.troops||0)>=600
  );
}

function ensureAIState(state,factionId){
  state.factions??={};
  state.factions[factionId]??={id:factionId};
  state.factions[factionId].aiState??={inactivityMonths:0,lastActionTurn:null,ordersIssued:0};
  return state.factions[factionId].aiState;
}

export function planFactionMonth(state,factionId,{maxOrders=null}={}){
  const profile=getFactionStrategicProfile(state,factionId);
  const aiState=ensureAIState(state,factionId);
  const targets=viableTargets(state,factionId);
  const armies=availableArmies(state,factionId);
  const orderLimit=maxOrders??Math.max(1,Math.min(3,1+Math.floor(profile.aggression*2)));
  const orders=[];
  const reservedTargets=new Set();

  for(const army of armies){
    if(orders.length>=orderLimit)break;
    const personal=commanderProfile(state,army,profile);
    let best=null;
    for(const target of targets){
      if(reservedTargets.has(target.id)&&personal.opportunism<.8)continue;
      const route=shortestRoute(state.graph,army.currentNodeId,target.id);
      if(!route||route.days===0)continue;
      const detail=candidateScore(state,army,target,route,personal,aiState.inactivityMonths);
      if((army.supplies??0)<detail.supplyNeed*.55)continue;
      if(!best||detail.score>best.detail.score)best={target,route,detail,profile:personal};
    }
    if(!best)continue;

    const threshold=42+best.profile.caution*13-best.profile.aggression*12-Math.min(12,aiState.inactivityMonths*2.5);
    if(best.detail.score<threshold)continue;
    const op=createArmyMarchOperation(state,{
      armyId:army.id,destinationNodeId:best.target.id,objective:'attack',
      doctrine:{enemyContact:'engage',postObjective:'siege',retreatMorale:18+Math.round(best.profile.caution*18)},
      payload:{plannedTurn:state.turn,targetScore:Number(best.detail.score.toFixed(2)),projectedSupplyNeed:best.detail.supplyNeed,estimatedEnemyStrength:best.detail.enemyStrength}
    });
    orders.push(op);reservedTargets.add(best.target.id);
  }

  if(orders.length){
    aiState.inactivityMonths=0;
    aiState.lastActionTurn=state.turn;
    aiState.ordersIssued+=orders.length;
  }else aiState.inactivityMonths=Math.min(12,aiState.inactivityMonths+1);
  return orders;
}

export function planAllAIFactionsMonth(state,{playerFactionId=null}={}){
  const factions=new Set([
    ...Object.keys(state.factions||{}),
    ...Object.values(state.graph.nodes).map(n=>n.ownerFactionId).filter(Boolean),
    ...Object.values(state.armies).map(a=>a.factionId).filter(Boolean)
  ]);
  const result={};
  for(const factionId of factions){
    if(factionId===playerFactionId)continue;
    result[factionId]=planFactionMonth(state,factionId);
  }
  return result;
}
