import { SIM_MINUTES_PER_STEP } from './data.js';
import { runStrategicAI, AI_PLANNING_INTERVAL_MINUTES } from './ai.js';
import {
  captureOfficer, clamp, command, event, faction, isHostile, moveArmy, neighbors,
  release, rng, travel
} from './world.js';
import { createTacticalState, runAutoBattle, setManualSide, tickTactical } from './tactical.js';

export function step(s,minutes=SIM_MINUTES_PER_STEP){
  if(s.paused)return s;
  s.elapsedMinutes+=minutes;
  respawnObjects(s);
  moveUnits(s,minutes);
  processBattles(s,minutes);
  economy(s,minutes);
  characterRecovery(s,minutes);
  s.aiCooldownMinutes-=minutes;
  if(s.aiCooldownMinutes<=0){
    runStrategicAI(s);
    s.aiCooldownMinutes+=AI_PLANNING_INTERVAL_MINUTES;
  }
  return s;
}

function advance(s,u,minutes,onArrival){
  if(u.status!=='moving')return;
  u.legElapsed+=minutes;
  while(u.status==='moving'&&u.legElapsed>=u.legDuration){
    u.legElapsed-=u.legDuration;
    u.legIndex++;
    u.location=u.path[u.legIndex];
    if(s.officers[u.commanderId])s.officers[u.commanderId].location=u.location;
    if(u.deputyId&&s.officers[u.deputyId])s.officers[u.deputyId].location=u.location;
    if(u.legIndex>=u.path.length-1){
      u.status='waiting';u.legElapsed=0;u.legDuration=0;onArrival(u);return;
    }
    u.legDuration=travel(s,u.path[u.legIndex],u.path[u.legIndex+1]);
  }
}

function moveUnits(s,m){
  for(const a of Object.values(s.armies)){
    if(a.status==='waiting'||a.status==='battle')armyFood(s,a,m);
    advance(s,a,m,u=>armyArrive(s,u));
  }
  for(const t of Object.values(s.transports))advance(s,t,m,u=>deliver(s,u));
}

function armyFood(s,a,m){
  if(a.status==='moving')return;
  a._foodDebt=(a._foodDebt||0)+Math.ceil(a.troops/150)*m/1440;
  const n=Math.floor(a._foodDebt);
  if(n){a.food=Math.max(0,a.food-n);a._foodDebt-=n}
  if(a.food<=0){
    a.morale=Math.max(20,a.morale-m/180);
    if(a.morale<45&&rng(s)<.08*m/60&&a.troops>=100){
      a.troops-=100;
      event(s,`${s.officers[a.commanderId].name}'s army lost 100 troops to desertion.`,'warning');
    }
  }
}

function deliver(s,t){
  const h=s.strongholds[t.destination];
  if(h.owner===t.factionId||!isHostile(s,t.factionId,h.owner)){
    h.money+=t.cargo.money;h.food+=t.cargo.food;h.troops+=t.cargo.troops;
    for(const pid of t.cargo.prisoners){const p=s.officers[pid];p.location=h.id;p.captorFaction=t.factionId}
    for(const fid of t.cargo.devilFruits){const fr=s.fruits[fid];fr.location=h.id;fr.discoveredBy=t.factionId;fr.hidden=false}
    release(s,t.commanderId,h.id);delete s.transports[t.id];
    event(s,`Transport completed its mission at ${h.name}.`,'logistics');return;
  }
  const escape=command(s.officers[t.commanderId])*18+t.cargo.troops*.35>h.troops*.7&&rng(s)>.35;
  if(escape){
    event(s,`Transport evaded hostile forces near ${h.name} and returned.`,'warning');
    t.destination=t.path[0];t.path=[...t.path].reverse();t.legIndex=0;t.legElapsed=0;
    t.legDuration=travel(s,t.path[0],t.path[1]);t.status='moving';
  }else{
    h.money+=Math.floor(t.cargo.money*.7);h.food+=Math.floor(t.cargo.food*.7);
    for(const pid of t.cargo.prisoners){const p=s.officers[pid];p.status='prisoner';p.location=h.id;p.captorFaction=h.owner}
    for(const fid of t.cargo.devilFruits){const fr=s.fruits[fid];fr.location=h.id;fr.hidden=false;fr.discoveredBy=h.owner}
    captureOfficer(s,t.commanderId,h.owner,h.id);delete s.transports[t.id];
    event(s,`Transport was captured near ${h.name}.`,'battle');
  }
}

function makeBattle(s,{strongholdId=null,attackerArmyIds=[],defenderArmyIds=[],garrisonTroops=0,garrisonMorale=100,type='field'}){
  const id=`battle_${s.nextIds.battle++}`;
  const af=s.armies[attackerArmyIds[0]]?.factionId;
  const df=defenderArmyIds.length?s.armies[defenderArmyIds[0]]?.factionId:s.strongholds[strongholdId]?.owner;
  const playerInvolved=[af,df].includes(s.playerFaction);
  s.battles[id]={
    id,type,strongholdId,attackerArmyIds:[...attackerArmyIds],defenderArmyIds:[...defenderArmyIds],
    attackerFaction:af,defenderFaction:df,garrisonTroops,garrisonMorale,
    status:playerInvolved?'awaiting_order':'auto',createdAt:s.elapsedMinutes,tactical:null,winner:null
  };
  for(const aid of [...attackerArmyIds,...defenderArmyIds])if(s.armies[aid])s.armies[aid].status='battle';
  event(s,`${type==='siege'?'Siege':'Field battle'} started${strongholdId?` at ${s.strongholds[strongholdId].name}`:''}: ${faction(af)?.short||af} vs ${faction(df)?.short||df}.`,'battle');
  return id;
}

function armyArrive(s,a){
  const h=s.strongholds[a.location];
  event(s,`${s.officers[a.commanderId].name}'s army arrived at ${h.name}.`,'military');
  const hostileArmy=Object.values(s.armies).find(x=>x.id!==a.id&&x.location===a.location&&x.status==='waiting'&&isHostile(s,a.factionId,x.factionId));
  if(hostileArmy){makeBattle(s,{strongholdId:h.id,attackerArmyIds:[a.id],defenderArmyIds:[hostileArmy.id],type:'field'});return}
  if(h.owner===a.factionId||!isHostile(s,a.factionId,h.owner)){a.status='waiting';return}
  makeBattle(s,{strongholdId:h.id,attackerArmyIds:[a.id],garrisonTroops:h.troops,garrisonMorale:h.morale,type:'siege'});
}

export function beginManualBattle(s,battleId){
  const b=s.battles[battleId];
  if(!b||!['awaiting_order','auto'].includes(b.status)||s.activeManualBattleId)return false;
  if(![b.attackerFaction,b.defenderFaction].includes(s.playerFaction))return false;
  if(!b.tactical)b.tactical=createTacticalState(s,b);
  const side=b.attackerFaction===s.playerFaction?'attacker':'defender';
  setManualSide(b.tactical,side);b.status='manual';s.activeManualBattleId=b.id;s.stats.manualBattles++;
  if(!Number.isFinite(s.tacticalSpeed))s.tacticalSpeed=1;
  event(s,`Manual command assumed for battle ${b.id}.`,'battle');
  return true;
}

export function setBattleAuto(s,battleId){
  const b=s.battles[battleId];if(!b||b.status==='resolved')return false;
  if(s.activeManualBattleId===battleId)s.activeManualBattleId=null;
  if(!b.tactical)b.tactical=createTacticalState(s,b);
  b.tactical.manualSide=null;b.status='auto';
  event(s,`Battle ${battleId} switched to AUTO.`,'battle');return true;
}

export function tickManualBattle(s,seconds=.5){
  const id=s.activeManualBattleId,b=id?s.battles[id]:null;
  if(!b||b.status!=='manual'||s.paused)return false;
  // Tactical time is intentionally independent from strategic 1x/2x/3x speed.
  tickTactical(s,b.tactical,seconds);
  if(b.tactical.winner)resolveBattle(s,b);
  return true;
}

function processBattles(s){
  for(const b of Object.values(s.battles)){
    if(b.status==='resolved'||b.status==='cancelled'||b.status==='manual')continue;
    // Player-involved battles wait indefinitely until Manual or AUTO is chosen explicitly.
    if(b.status==='awaiting_order')continue;
    if(!b.tactical)b.tactical=createTacticalState(s,b);
    runAutoBattle(s,b);resolveBattle(s,b);
  }
}

function strategicUnitForOfficer(s,b,officerId){
  for(const aid of [...b.attackerArmyIds,...b.defenderArmyIds])if(s.armies[aid]?.commanderId===officerId)return s.armies[aid];
  return null;
}

function safeRetreat(s,a,from){
  const r=neighbors(from).find(x=>s.strongholds[x].owner===a.factionId);
  if(r){a.location=from;a.status='waiting';moveArmy(s,a.id,r)}else a.status='waiting';
}

function resolveBattle(s,b){
  if(b.status==='resolved')return;
  const t=b.tactical,winner=t?.winner||'draw';
  b.winner=winner;b.status='resolved';s.stats.battlesResolved++;
  if(s.activeManualBattleId===b.id)s.activeManualBattleId=null;
  let garrisonRemaining=b.garrisonTroops;
  for(const tu of Object.values(t.units)){
    if(tu.garrison){garrisonRemaining=tu.troops;continue}
    if(!tu.officerId)continue;
    const o=s.officers[tu.officerId],a=strategicUnitForOfficer(s,b,tu.officerId);if(!o||!a)continue;
    o.hp=tu.incapacitated?0:Math.max(1,tu.hp);o.energy=Math.round(tu.energy);
    a.troops=Math.max(0,Math.floor(tu.troops/100)*100);a.morale=Math.round(tu.morale);
    if(tu.incapacitated){o.status='incapacitated';o.assignedUnitId=null}
    if(tu.retreated&&a.troops>0)a.status='waiting';
  }
  const h=b.strongholdId?s.strongholds[b.strongholdId]:null;
  if(h&&b.type==='siege')h.troops=Math.max(0,Math.floor(garrisonRemaining/100)*100);
  const attackerWon=winner==='attacker';
  if(attackerWon&&h&&b.type==='siege'){
    const old=h.owner;h.owner=b.attackerFaction;
    h.development=Math.max(0,h.development-Math.max(2,Math.round((b.garrisonTroops-h.troops)/1500)));
    h.morale=62;s.stats.ownershipChanges++;
    event(s,`${faction(b.attackerFaction).short} captured ${h.name} from ${faction(old).short}.`,'capture');
  }
  for(const aid of b.attackerArmyIds){
    const a=s.armies[aid];if(!a)continue;
    if(a.troops<=0){const o=s.officers[a.commanderId];if(o?.status!=='incapacitated')o.status='incapacitated';delete s.armies[aid]}
    else if(attackerWon){a.status='waiting';a.location=h?.id||a.location}else safeRetreat(s,a,h?.id||a.location);
  }
  for(const aid of b.defenderArmyIds){
    const a=s.armies[aid];if(!a)continue;
    if(a.troops<=0)delete s.armies[aid];else if(!attackerWon)a.status='waiting';else safeRetreat(s,a,h?.id||a.location);
  }
  const winningFaction=attackerWon?b.attackerFaction:b.defenderFaction;
  for(const tu of Object.values(t.units)){
    if(tu.incapacitated&&tu.officerId){
      const o=s.officers[tu.officerId];
      if(o&&o.faction!==winningFaction&&h)captureOfficer(s,o.id,winningFaction,h.id);
    }
  }
  event(s,`Battle ${b.id} resolved: ${winner}.`,'battle');
}

function economy(s,m){
  for(const h of Object.values(s.strongholds)){
    const gov=h.officerAssignments?.governor?s.officers[h.officerAssignments.governor]:null;
    const log=h.officerAssignments?.logistics?s.officers[h.officerAssignments.logistics]:null;
    const govBonus=gov?gov.politics/250:0,logBonus=log?log.intelligence/300:0;
    h._moneyFloat=(h._moneyFloat||0)+(10+h.development*(.8+govBonus))*m/1440;
    h._foodFloat=(h._foodFloat||0)+(18+h.development*(1.1+logBonus)-Math.ceil(h.troops/160))*m/1440;
    const a=Math.trunc(h._moneyFloat),b=Math.trunc(h._foodFloat);
    if(a){h.money+=a;h._moneyFloat-=a}
    if(b){h.food=Math.max(0,h.food+b);h._foodFloat-=b}
    if(!h.food){
      h.morale=Math.max(30,h.morale-m/240);
      if(h.morale<50&&rng(s)<.03*m/60&&h.troops>=200){h.troops-=100;event(s,`${h.name} garrison lost 100 troops to desertion.`,'warning')}
    }else h.morale=Math.min(100,h.morale+m/720);
  }
}

function characterRecovery(s,m){
  for(const o of Object.values(s.officers)){
    if(o.status!=='incapacitated'||!o.location)continue;
    const h=s.strongholds[o.location];if(!h||h.owner!==o.faction)continue;
    o.hp=Math.min(o.maxHp,o.hp+m/240);
    if(o.hp>=35){o.hp=Math.round(o.hp);o.status='available';event(s,`${o.name} recovered from incapacitation at ${h.name}.`,'growth')}
  }
}

function respawnObjects(s){
  for(const fr of Object.values(s.fruits)){
    if(fr.hidden&&fr.respawnAt!==null&&s.elapsedMinutes>=fr.respawnAt){
      fr.hidden=false;fr.respawnAt=null;s.stats.fruitRespawns=(s.stats.fruitRespawns||0)+1;
      event(s,`Rumors spread of a Devil Fruit appearing near ${s.strongholds[fr.location]?.name||'Wano'}.`,'fruit');
    }
  }
}
