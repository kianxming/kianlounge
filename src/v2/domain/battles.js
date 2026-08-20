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

export function createStrategicBattle(state,{location,attackerArmyId,defenderArmyId}){
  const attacker=state.armies[attackerArmyId],defender=state.armies[defenderArmyId];
  if(!attacker||!defender)throw new Error('Battle armies must exist');
  const id=nextBattleId(state);
  const battle={
    id,location,startDay:state.day,status:'ongoing',elapsedBattleDays:0,
    attackerFactionId:attacker.factionId,defenderFactionId:defender.factionId,
    attackerArmyIds:[attackerArmyId],defenderArmyIds:[defenderArmyId],
    reinforcementArrivals:[],result:null
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
  army.status='battle';army.battleId=battle.id;
  battle.reinforcementArrivals.push({day:state.day,armyId:army.id});
  return true;
}

function contactAllowed(state,army){
  const op=army.operationId?state.operations[army.operationId]:null;
  return op?.doctrine?.enemyContact!=='avoid';
}

export function processArmyContacts(state){
  // Reinforcements reaching an existing node battle join before new contacts are created.
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
        createStrategicBattle(state,{location:{kind:'edge',id:edgeId},attackerArmyId:armies[i].id,defenderArmyId:armies[j].id});
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
        createStrategicBattle(state,{location:{kind:'node',id:nodeId},attackerArmyId:armies[i].id,defenderArmyId:armies[j].id});
        break outer;
      }
    }
  }
}

export function advanceBattlesOneDay(state){
  for(const battle of Object.values(state.battles)){
    if(battle.status!=='ongoing')continue;
    battle.elapsedBattleDays++;
  }
}

export function resolveStrategicBattle(state,battleId,{winner}){
  const battle=state.battles[battleId];
  if(!battle||battle.status!=='ongoing')return false;
  battle.status='resolved';battle.result={winner,resolvedDay:state.day};
  const all=[...battle.attackerArmyIds,...battle.defenderArmyIds];
  for(const id of all){
    const army=state.armies[id];if(!army)continue;
    army.battleId=null;
    if(army.status==='battle')army.status='waiting';
  }
  return true;
}
