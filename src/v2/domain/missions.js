import { changeDiplomaticTrust, concludeTruce, diplomacyBetween, setDiplomacyStatus } from './diplomacy.js';

const GRADE={NONE:0,E:1,D:2,C:3,B:4,A:5,S:6};
function settlementAt(state,nodeId){return state.settlements?.[nodeId]||Object.values(state.settlements||{}).find(s=>s.nodeId===nodeId)||null}
function event(state,type,message,data={}){state.events.push({day:state.day,turn:state.turn,type,message,data})}
function actor(state,op){return state.officers?.[op.actorIds?.[0]]||null}
function effectMoment(op){return !op.effectResolved&&(op.status==='returning'||op.status==='completed')}

function resolveDevelopment(state,op){
  const s=settlementAt(state,op.destinationNodeId),o=actor(state,op);if(!s)return {success:false,reason:'settlement_missing'};
  const gain=Math.max(1,Math.min(7,(op.payload?.developmentGain||3)+Math.floor((o?.politics||50)/35)));
  const before=s.development;s.development=Math.min(s.cap,s.development+gain);
  event(state,'economy',`${s.name} 개발 완료 +${s.development-before}`,{operationId:op.id,nodeId:s.nodeId});
  return {success:true,gain:s.development-before};
}

function resolveRecruitment(state,op){
  const s=settlementAt(state,op.destinationNodeId),o=actor(state,op);if(!s)return {success:false,reason:'settlement_missing'};
  const base=op.payload?.troops||500,bonus=Math.floor((o?.charisma||50)/25)*100;
  const gain=base+bonus;s.troops+=gain;
  event(state,'military',`${s.name} 병력 모집 완료 +${gain.toLocaleString()}`,{operationId:op.id,nodeId:s.nodeId,gain});
  return {success:true,gain};
}

function resolveProduction(state,op){
  const s=settlementAt(state,op.destinationNodeId),o=actor(state,op);if(!s)return {success:false,reason:'settlement_missing'};
  const gain=Math.round(500+s.development*5+(o?.intelligence||50)*3+(o?.politics||50)*2);s.food+=gain;
  event(state,'economy',`${s.name} 생산 완료 +${gain.toLocaleString()} 식량`,{operationId:op.id,nodeId:s.nodeId,gain});
  return {success:true,gain};
}

function resolveScout(state,op){
  const fid=op.factionId,target=op.payload?.targetNodeId||op.destinationNodeId,o=actor(state,op);
  state.intelligence.scoutedNodes??={};state.intelligence.scoutedNodes[fid]??={};
  const obs=GRADE[o?.haki?.observation?.grade||'NONE']||0;
  const duration=45+obs*8+Math.floor((o?.intelligence||50)/4);
  state.intelligence.scoutedNodes[fid][target]={scoutedDay:state.day,untilDay:state.day+duration,officerId:o?.id||null};
  let detected=0;
  for(const candidate of Object.values(state.operations||{})){
    if(candidate.factionId===fid||['completed','failed','cancelled'].includes(candidate.status))continue;
    const nodes=candidate.route?.nodeIds||candidate.activeRoute?.nodeIds||[];
    if(candidate.destinationNodeId===target||nodes.includes(target)){
      state.intelligence.detectedByFaction[fid]??={};
      state.intelligence.detectedByFaction[fid][candidate.id]={detectedDay:state.day,confidence:Math.min(1,.65+obs*.05)};detected++;
    }
  }
  event(state,'intelligence',`${state.graph.nodes[target]?.name||target} 정찰 완료`,{operationId:op.id,detected});
  return {success:true,duration,detected};
}

function resolveDiplomacy(state,op){
  const o=actor(state,op),target=op.payload?.targetFactionId,proposal=op.payload?.proposal||'truce';
  if(!o||!state.factions?.[target])return {success:false,reason:'invalid_target'};
  const relation=diplomacyBetween(state,op.factionId,target);
  const score=(relation.trust??50)+(o.charisma||50)*.27+(o.intelligence||50)*.14;
  let success=false;
  if(proposal==='truce'&&relation.status==='war'&&score>=45){concludeTruce(state,op.factionId,target,{durationDays:90,reason:'envoy'});success=true}
  else if(proposal==='alliance'&&['neutral','truce'].includes(relation.status)&&score>=82){setDiplomacyStatus(state,op.factionId,target,'alliance',{reason:'envoy'});success=true}
  else if(proposal==='joint_front'&&['neutral','truce','alliance'].includes(relation.status)&&score>=74){setDiplomacyStatus(state,op.factionId,target,'joint_front',{reason:'envoy'});success=true}
  else changeDiplomaticTrust(state,op.factionId,target,success?5:2);
  event(state,'diplomacy',`${o.name}의 ${target} 협상 ${success?'성공':'결렬'}`,{operationId:op.id,proposal,score:Number(score.toFixed(1))});
  return {success,proposal,score:Number(score.toFixed(1))};
}

function resolveOfficerRecruitment(state,op){
  const recruiter=actor(state,op),target=state.officers?.[op.payload?.targetOfficerId];
  if(!recruiter||!target)return {success:false,reason:'target_missing'};
  if(target.factionId!==op.payload?.targetFactionAtDeparture)return {success:false,reason:'target_changed_faction'};
  if(target.assignment?.kind!=='base'||target.assignment.nodeId!==op.destinationNodeId)return {success:false,reason:'target_moved'};
  const relationship=(target.relationships?.[recruiter.id]||0)+(recruiter.relationships?.[target.id]||0);
  const score=recruiter.charisma*.48+recruiter.intelligence*.24+relationship*.12-(target.loyalty??70)*.48;
  const success=score>=20;
  if(success){
    target.factionId=op.factionId;target.faction=op.factionId;target.loyalty=Math.max(45,Math.min(80,50+Math.round(recruiter.charisma/5)));
    target.assignment={kind:'operation',operationId:op.id};
    if(!op.actorIds.includes(target.id))op.actorIds.push(target.id);
  }
  event(state,'personnel',`${recruiter.name}의 ${target.name} 등용 ${success?'성공':'실패'}`,{operationId:op.id,score:Number(score.toFixed(1))});
  return {success,targetOfficerId:target.id,score:Number(score.toFixed(1))};
}

function resolveTransport(state,op){
  const target=settlementAt(state,op.destinationNodeId),cargo=op.payload?.cargo||{},commander=actor(state,op);
  if(!target)return {success:false,reason:'destination_missing'};
  const friendly=target.ownerFactionId===op.factionId||state.allied(op.factionId,target.ownerFactionId);
  if(!friendly){
    target.money+=(cargo.money||0);target.food+=(cargo.food||0);target.troops+=(cargo.troops||0);
    if(commander){commander.status='prisoner';commander.captorFactionId=target.ownerFactionId;commander.assignment={kind:'base',nodeId:target.nodeId}}
    event(state,'logistics',`${target.name} 도착 직전 수송대가 적에게 나포됨`,{operationId:op.id});
    return {success:false,reason:'destination_captured'};
  }
  target.money+=(cargo.money||0);target.food+=(cargo.food||0);target.troops+=(cargo.troops||0);
  for(const prisonerId of cargo.prisoners||[]){const p=state.officers?.[prisonerId];if(p){p.status='prisoner';p.assignment={kind:'base',nodeId:target.nodeId};p.captorFactionId=op.factionId}}
  for(const fruitId of cargo.devilFruits||[]){const f=state.fruits?.[fruitId];if(f&&!f.ownerId){f.location=target.nodeId;f.hidden=false}}
  event(state,'logistics',`${target.name} 수송 도착`,{operationId:op.id,cargo});
  return {success:true,cargo};
}

export function resolveMissionEffectsOneDay(state){
  for(const op of Object.values(state.operations||{})){
    if(!effectMoment(op))continue;
    let result=null;
    if(op.type==='development')result=resolveDevelopment(state,op);
    else if(op.type==='troop_recruitment')result=resolveRecruitment(state,op);
    else if(op.type==='food_production')result=resolveProduction(state,op);
    else if(op.type==='scout')result=resolveScout(state,op);
    else if(op.type==='diplomacy')result=resolveDiplomacy(state,op);
    else if(op.type==='officer_recruitment')result=resolveOfficerRecruitment(state,op);
    else if(op.type==='transport')result=resolveTransport(state,op);
    else if(op.type==='officer_transfer')result={success:true};
    if(result!==null){op.effectResolved=true;op.result={...(op.result||{}),...result,effectDay:state.day};}
  }
}
