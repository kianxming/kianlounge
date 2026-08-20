import { beginArmyRetreat, beginArmyWithdrawalFromEdge } from '../core/operations.js';

function hostile(state,a,b){
  if(a===b)return false;
  if(state.hostile)return state.hostile(a,b);
  if(state.allied?.(a,b))return false;
  return true;
}

function locationKey(location){return `${location.kind}:${location.id}`}

function nextBattleId(state){
  state.nextIds.battle??=1;
  return `battle_v2_${state.nextIds.battle++}`;
}

function activeOperation(state,army){return army.operationId?state.operations[army.operationId]:null}

function chooseContactRoles(state,a,b,location){
  if(location.kind==='node'){
    const owner=state.graph.nodes[location.id]?.ownerFactionId;
    if(owner===a.factionId)return {attacker:b,defender:a};
    if(owner===b.factionId)return {attacker:a,defender:b};
  }
  const ao=activeOperation(state,a),bo=activeOperation(state,b);
  if(ao?.objective==='intercept'&&bo?.objective!=='intercept')return {attacker:b,defender:a};
  if(bo?.objective==='intercept'&&ao?.objective!=='intercept')return {attacker:a,defender:b};
  if(ao?.objective==='attack'&&bo?.objective!=='attack')return {attacker:a,defender:b};
  if(bo?.objective==='attack'&&ao?.objective!=='attack')return {attacker:b,defender:a};
  return {attacker:a,defender:b};
}

export function createStrategicBattle(state,{location,attackerArmyId,defenderArmyId}){
  const attacker=state.armies[attackerArmyId],defender=state.armies[defenderArmyId];
  if(!attacker||!defender)throw new Error('Battle armies must exist');
  const id=nextBattleId(state);
  const battle={
    id,location,startDay:state.day,status:'ongoing',elapsedBattleDays:0,
    attackerFactionId:attacker.factionId,defenderFactionId:defender.factionId,
    attackerArmyIds:[attackerArmyId],defenderArmyIds:[defenderArmyId],
    reinforcementArrivals:[],dailyHistory:[],
    initialTroops:{[attackerArmyId]:attacker.troops||0,[defenderArmyId]:defender.troops||0},
    result:null
  };
  state.battles[id]=battle;
  for(const army of [attacker,defender]){army.status='battle';army.battleId=id}
  return battle;
}

export function ongoingBattleAt(state,location){
  const key=locationKey(location);
  return Object.values(state.battles).find(b=>b.status==='ongoing'&&locationKey(b.location)===key)||null;
}

function attachReinforcement(state,battle,army){
  if(army.factionId===battle.attackerFactionId){
    if(!battle.attackerArmyIds.includes(army.id))battle.attackerArmyIds.push(army.id);
  }else if(army.factionId===battle.defenderFactionId){
    if(!battle.defenderArmyIds.includes(army.id))battle.defenderArmyIds.push(army.id);
  }else return false;
  battle.initialTroops[army.id]??=army.troops||0;
  army.status='battle';army.battleId=battle.id;
  battle.reinforcementArrivals.push({day:state.day,armyId:army.id});
  return true;
}

function contactAllowed(state,army){
  if(['retreating','routed','stranded'].includes(army.status))return false;
  const op=activeOperation(state,army);
  if(['army_retreat','army_withdrawal'].includes(op?.type))return false;
  return op?.doctrine?.enemyContact!=='avoid';
}

export function processArmyContacts(state){
  for(const battle of Object.values(state.battles)){
    if(battle.status!=='ongoing'||battle.location.kind!=='node')continue;
    for(const army of Object.values(state.armies)){
      if(army.status!=='waiting'||army.currentNodeId!==battle.location.id)continue;
      attachReinforcement(state,battle,army);
    }
  }

  const edgeGroups=new Map();
  for(const army of Object.values(state.armies)){
    if(!army.currentEdgeId||army.status==='battle'||army.status==='destroyed')continue;
    if(!contactAllowed(state,army))continue;
    if(!edgeGroups.has(army.currentEdgeId))edgeGroups.set(army.currentEdgeId,[]);
    edgeGroups.get(army.currentEdgeId).push(army);
  }
  for(const [edgeId,armies] of edgeGroups){
    if(ongoingBattleAt(state,{kind:'edge',id:edgeId}))continue;
    outer: for(let i=0;i<armies.length;i++)for(let j=i+1;j<armies.length;j++){
      if(hostile(state,armies[i].factionId,armies[j].factionId)){
        const roles=chooseContactRoles(state,armies[i],armies[j],{kind:'edge',id:edgeId});
        createStrategicBattle(state,{location:{kind:'edge',id:edgeId},attackerArmyId:roles.attacker.id,defenderArmyId:roles.defender.id});
        break outer;
      }
    }
  }

  const nodeGroups=new Map();
  for(const army of Object.values(state.armies)){
    if(!army.currentNodeId||army.status==='battle'||army.status==='destroyed')continue;
    if(!nodeGroups.has(army.currentNodeId))nodeGroups.set(army.currentNodeId,[]);
    nodeGroups.get(army.currentNodeId).push(army);
  }
  for(const [nodeId,armies] of nodeGroups){
    const existing=ongoingBattleAt(state,{kind:'node',id:nodeId});
    if(existing){for(const army of armies)attachReinforcement(state,existing,army);continue}
    outer: for(let i=0;i<armies.length;i++)for(let j=i+1;j<armies.length;j++){
      if(hostile(state,armies[i].factionId,armies[j].factionId)){
        const roles=chooseContactRoles(state,armies[i],armies[j],{kind:'node',id:nodeId});
        createStrategicBattle(state,{location:{kind:'node',id:nodeId},attackerArmyId:roles.attacker.id,defenderArmyId:roles.defender.id});
        break outer;
      }
    }
  }
}

function supplyModifier(army){
  return {secure:1,strained:.92,critical:.78,cut:.62}[army.supplyState]??1;
}

function armyPower(army){
  const troops=Math.max(0,army.troops||0);
  const morale=.35+.65*Math.max(0,Math.min(100,army.morale??100))/100;
  const readiness=.45+.55*Math.max(0,Math.min(100,army.readiness??100))/100;
  return troops*morale*readiness*supplyModifier(army);
}

function defenderTerrainMultiplier(state,battle){
  if(battle.location.kind==='node'){
    const node=state.graph.nodes[battle.location.id];
    return {gate:1.28,pass:1.24,bridge:1.15,forest:1.13,base:1.10,port:1.08,junction:1.04}[node?.type]||1.04;
  }
  const edge=state.graph.edges[battle.location.id];
  return 1+Math.min(.2,(edge?.ambushValue||0)*.18);
}

function sideArmies(state,ids){return ids.map(id=>state.armies[id]).filter(a=>a&&a.status!=='destroyed')}
function sideTroops(armies){return armies.reduce((sum,a)=>sum+Math.max(0,a.troops||0),0)}
function sidePower(armies){return armies.reduce((sum,a)=>sum+armyPower(a),0)}

function applyLosses(armies,totalLoss,moraleLoss,readinessLoss){
  const total=Math.max(1,sideTroops(armies));
  let assigned=0;
  for(let i=0;i<armies.length;i++){
    const army=armies[i];
    const share=i===armies.length-1?Math.max(0,totalLoss-assigned):Math.floor(totalLoss*Math.max(0,army.troops||0)/total);
    assigned+=share;
    army.troops=Math.max(0,(army.troops||0)-share);
    army.morale=Math.max(0,(army.morale??100)-moraleLoss-(army.supplyState==='cut'?1:0));
    army.readiness=Math.max(0,(army.readiness??100)-readinessLoss-(army.supplyState==='critical'||army.supplyState==='cut'?1:0));
  }
}

function sideBattleCapable(armies){
  return armies.some(a=>(a.troops||0)>50&&(a.morale??100)>12&&(a.readiness??100)>8);
}

function snapshotSide(armies){
  return {
    troops:sideTroops(armies),
    morale:armies.length?Math.round(armies.reduce((s,a)=>s+(a.morale??100),0)/armies.length):0,
    readiness:armies.length?Math.round(armies.reduce((s,a)=>s+(a.readiness??100),0)/armies.length):0
  };
}

function resumeArmyAfterBattle(state,army){
  army.battleId=null;
  const op=activeOperation(state,army);
  if(op&&!['completed','failed','cancelled'].includes(op.status)){
    army.status=['army_retreat','army_withdrawal'].includes(op.type)?'retreating':'moving';
  }else army.status='waiting';
}

function routeArmyAfterBattle(state,army){
  army.battleId=null;
  army.status='routed';
  army.morale=Math.min(army.morale??12,12);
  army.readiness=Math.min(army.readiness??20,20);
  try{
    if(army.currentEdgeId)beginArmyWithdrawalFromEdge(state,army.id);
    else if(army.currentNodeId)beginArmyRetreat(state,army.id);
    else army.status='stranded';
  }catch{
    army.status='stranded';
  }
}

export function resolveStrategicBattle(state,battleId,{winner,reason='battle_capability'}={}){
  const battle=state.battles[battleId];
  if(!battle||battle.status!=='ongoing')return false;
  battle.status='resolved';battle.result={winner,reason,resolvedDay:state.day};
  const attackers=sideArmies(state,battle.attackerArmyIds),defenders=sideArmies(state,battle.defenderArmyIds);
  if(winner==='draw'){
    for(const army of [...attackers,...defenders])routeArmyAfterBattle(state,army);
    return true;
  }
  for(const army of attackers){
    if(army.factionId===winner)resumeArmyAfterBattle(state,army);else routeArmyAfterBattle(state,army);
  }
  for(const army of defenders){
    if(army.factionId===winner)resumeArmyAfterBattle(state,army);else routeArmyAfterBattle(state,army);
  }
  return true;
}

export function advanceBattlesOneDay(state){
  for(const battle of Object.values(state.battles)){
    if(battle.status!=='ongoing')continue;
    battle.elapsedBattleDays++;
    const attackers=sideArmies(state,battle.attackerArmyIds),defenders=sideArmies(state,battle.defenderArmyIds);
    if(!attackers.length||!defenders.length)continue;

    const attackerPower=Math.max(1,sidePower(attackers));
    const defenderPower=Math.max(1,sidePower(defenders)*defenderTerrainMultiplier(state,battle));
    const attackerRatio=Math.max(.45,Math.min(2.5,defenderPower/attackerPower));
    const defenderRatio=Math.max(.45,Math.min(2.5,attackerPower/defenderPower));
    const pressure=Math.floor((battle.elapsedBattleDays-1)/15);
    const attackerLoss=Math.max(1,Math.ceil(sideTroops(attackers)*.0045*attackerRatio));
    const defenderLoss=Math.max(1,Math.ceil(sideTroops(defenders)*.0045*defenderRatio));
    const attackerMoraleLoss=1+Math.max(0,Math.floor((attackerRatio-.75)*2))+pressure;
    const defenderMoraleLoss=1+Math.max(0,Math.floor((defenderRatio-.75)*2))+pressure;
    const attackerReadinessLoss=attackerRatio>1.25?2:1;
    const defenderReadinessLoss=defenderRatio>1.25?2:1;

    applyLosses(attackers,attackerLoss,attackerMoraleLoss,attackerReadinessLoss);
    applyLosses(defenders,defenderLoss,defenderMoraleLoss,defenderReadinessLoss);
    battle.dailyHistory.push({
      day:state.day,
      attackerLoss,defenderLoss,
      attacker:snapshotSide(attackers),defender:snapshotSide(defenders)
    });

    const attackerCapable=sideBattleCapable(attackers),defenderCapable=sideBattleCapable(defenders);
    if(attackerCapable&&defenderCapable)continue;
    if(!attackerCapable&&!defenderCapable){
      const a=sidePower(attackers),d=sidePower(defenders)*defenderTerrainMultiplier(state,battle);
      if(Math.max(a,d)<=0||Math.abs(a-d)/Math.max(a,d)<.12)resolveStrategicBattle(state,battle.id,{winner:'draw',reason:'mutual_collapse'});
      else resolveStrategicBattle(state,battle.id,{winner:a>d?battle.attackerFactionId:battle.defenderFactionId,reason:'mutual_collapse'});
    }else resolveStrategicBattle(state,battle.id,{winner:attackerCapable?battle.attackerFactionId:battle.defenderFactionId});
  }
}
