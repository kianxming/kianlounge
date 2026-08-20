import { shortestRoute } from '../world/graph.js';
import { armyDailySupplyNeed } from '../domain/supply.js';
import { orderArmyMarch } from '../domain/commands.js';
import { armyTravelModifiers } from '../domain/onepiece.js';

const BASE_PROFILES={straw_hat:{aggression:.78,caution:.42,logistics:.56,opportunism:.58,allySupport:.95},beasts:{aggression:.95,caution:.18,logistics:.48,opportunism:.52,allySupport:.18},kozuki:{aggression:.62,caution:.68,logistics:.74,opportunism:.66,allySupport:.94},kurozumi:{aggression:.28,caution:.94,logistics:.64,opportunism:.42,allySupport:.12},heart:{aggression:.48,caution:.90,logistics:.95,opportunism:.98,allySupport:.60},kid:{aggression:.98,caution:.14,logistics:.36,opportunism:.70,allySupport:.10},big_mom:{aggression:.82,caution:.48,logistics:.68,opportunism:.78,allySupport:.30}};
const clamp=(v,min=0,max=1)=>Math.max(min,Math.min(max,v));const ownableNode=n=>['base','port'].includes(n.type);
function hostile(state,a,b){if(a===b)return false;if(state.hostile)return state.hostile(a,b);if(state.allied?.(a,b))return false;return true}
function applyTrait(p,t){if(t==='Reckless'){p.aggression+=.14;p.caution-=.12}if(t==='Strategist'){p.opportunism+=.16;p.caution+=.10;p.logistics+=.05}if(t==='Calm'){p.caution+=.08;p.opportunism+=.05}if(t==='Cowardly'){p.aggression-=.22;p.caution+=.22}if(t==='Logistician')p.logistics+=.18;if(t==='Natural Leader'){p.allySupport+=.08;p.aggression+=.04}if(t==='Commander')p.aggression+=.05;if(t==='Grand Commander'){p.aggression+=.09;p.caution+=.03}}
export function getFactionStrategicProfile(state,factionId){const f=state.factions?.[factionId]||{},p={...(BASE_PROFILES[factionId]||BASE_PROFILES.kozuki),...(f.aiProfile||{})},leader=f.leaderId?state.officers?.[f.leaderId]:null;for(const t of leader?.traits||[])applyTrait(p,t);for(const k of ['aggression','caution','logistics','opportunism','allySupport'])p[k]=clamp(p[k]);return {...p,leaderId:leader?.id||null}}
function commanderProfile(state,army,factionProfile){const p={...factionProfile},id=army.commanderId||army.officerIds?.[0],o=id?state.officers?.[id]:null;for(const t of o?.traits||[])applyTrait(p,t);for(const k of ['aggression','caution','logistics','opportunism'])p[k]=clamp(p[k]);return p}
function settlementAtNode(state,nodeId){return state.settlements?.[nodeId]||Object.values(state.settlements||{}).find(s=>s.nodeId===nodeId)||null}
export function enemyStrengthAtNode(state,factionId,nodeId){const s=settlementAtNode(state,nodeId),legacy=Math.max(0,state.graph.nodes[nodeId]?.garrisonTroops||0),garrison=Math.max(legacy,s?.troops||0),field=Object.values(state.armies).filter(a=>a.factionId!==factionId&&hostile(state,factionId,a.factionId)&&a.currentNodeId===nodeId&&a.status!=='destroyed').reduce((n,a)=>n+(a.troops||0),0);return garrison+field}
function projectedSupplyRequirement(army,route,profile){const daily=armyDailySupplyNeed(army)*(1+route.days/30),days=Math.max(7,route.days+Math.ceil(6+profile.caution*8));return Math.ceil(daily*days*(.82+profile.logistics*.38))}
function targetValue(node,state){if(Number.isFinite(node.strategicValue))return node.strategicValue;const s=settlementAtNode(state,node.id),bonus=Math.min(14,(s?.development||0)*.12+(s?.market||0)*.05);return node.type==='base'?30+bonus:node.type==='port'?26+bonus:10}
function candidateScore(state,army,target,route,p,inactivity){const own=Math.max(100,army.troops||0)*(0.55+0.45*(army.morale??100)/100)*(0.55+0.45*(army.readiness??100)/100),enemy=Math.max(450,enemyStrengthAtNode(state,army.factionId,target.id)),ratio=own/enemy,supplyNeed=projectedSupplyRequirement(army,route,p),supplyRatio=(army.supplies??0)/Math.max(1,supplyNeed),bias=state.factions?.[army.factionId]?.aiTargetBias?.[target.id]||0;let score=targetValue(target,state)+bias+p.aggression*34+p.opportunism*Math.min(28,Math.max(-10,(ratio-.65)*22))-route.days*(.32+p.caution*.72)-Math.max(0,1.05-ratio)*p.caution*36-Math.max(0,1-supplyRatio)*p.logistics*45+Math.min(18,inactivity*3.5);return {score,ratio,supplyNeed,supplyRatio,enemyStrength:enemy}}
function viableTargets(state,fid){return Object.values(state.graph.nodes).filter(n=>ownableNode(n)&&n.ownerFactionId&&hostile(state,fid,n.ownerFactionId))}
function availableArmies(state,fid){return Object.values(state.armies).filter(a=>a.factionId===fid&&a.status==='waiting'&&a.currentNodeId&&!a.operationId&&(a.troops||0)>=600)}
function ensureAIState(state,fid){state.factions??={};state.factions[fid]??={id:fid};state.factions[fid].aiState??={inactivityMonths:0,lastActionTurn:null,ordersIssued:0};return state.factions[fid].aiState}

export function planFactionMonth(state,factionId,{maxOrders=null}={}){
  const profile=getFactionStrategicProfile(state,factionId),aiState=ensureAIState(state,factionId),targets=viableTargets(state,factionId),armies=availableArmies(state,factionId),limit=maxOrders??Math.max(1,Math.min(3,1+Math.floor(profile.aggression*2))),orders=[],reserved=new Set();
  for(const army of armies){
    if(orders.length>=limit)break;const personal=commanderProfile(state,army,profile);let best=null;
    for(const target of targets){
      if(reserved.has(target.id)&&personal.opportunism<.8)continue;
      const route=shortestRoute(state.graph,army.currentNodeId,target.id,{travelModifiers:edge=>armyTravelModifiers(state,army,edge)});if(!route||route.days===0)continue;
      const detail=candidateScore(state,army,target,route,personal,aiState.inactivityMonths);if((army.supplies??0)<detail.supplyNeed*.55)continue;if(!best||detail.score>best.detail.score)best={target,route,detail,profile:personal};
    }
    if(!best)continue;const threshold=42+best.profile.caution*13-best.profile.aggression*12-Math.min(12,aiState.inactivityMonths*2.5);if(best.detail.score<threshold)continue;
    const op=orderArmyMarch(state,{factionId,armyId:army.id,destinationNodeId:best.target.id,objective:'attack',doctrine:{enemyContact:'engage',postObjective:'siege',retreatMorale:18+Math.round(best.profile.caution*18)}});
    if(op){op.payload={...(op.payload||{}),plannedTurn:state.turn,targetScore:Number(best.detail.score.toFixed(2)),projectedSupplyNeed:best.detail.supplyNeed,estimatedEnemyStrength:best.detail.enemyStrength};orders.push(op);reserved.add(best.target.id)}
  }
  if(orders.length){aiState.inactivityMonths=0;aiState.lastActionTurn=state.turn;aiState.ordersIssued+=orders.length}else aiState.inactivityMonths=Math.min(12,aiState.inactivityMonths+1);return orders;
}
export function planAllAIFactionsMonth(state,{playerFactionId=null}={}){const factions=new Set([...Object.keys(state.factions||{}),...Object.values(state.graph.nodes).map(n=>n.ownerFactionId).filter(Boolean),...Object.values(state.armies).map(a=>a.factionId).filter(Boolean)]),result={};for(const fid of factions){if(fid===playerFactionId)continue;result[fid]=planFactionMonth(state,fid)}return result}
