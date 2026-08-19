import { SKILLS, TACTICAL_TICK_SECONDS } from './data.js';
import { clamp, command, rng, skillPerformance } from './world.js';

const D={attacker:1,defender:-1};
const enemySide=side=>side==='attacker'?'defender':'attacker';
const dist=(a,b)=>Math.abs(a.x-b.x)+Math.abs(a.y-b.y);
const capable=u=>!u.retreated&&!u.incapacitated&&u.troops>0&&u.morale>0;
const round10=n=>Math.max(0,Math.round(n/10)*10);

function makeUnit({id,side,officerId=null,troops,morale=100,x,y,garrison=false,hp=100,energy=100}){
  return {
    id,side,officerId,troops:Math.max(0,troops),morale,hp,maxHp:100,energy,x,y,
    order:'auto',targetId:null,skillId:null,hold:false,retreated:false,incapacitated:false,
    garrison,cooldown:0,moveCooldown:0
  };
}

export function createTacticalState(s,battle){
  const units={};let n=1;
  for(const aid of battle.attackerArmyIds){
    const a=s.armies[aid];if(!a)continue;
    const o=s.officers[a.commanderId];
    units[`tu_${n++}`]=makeUnit({id:`tu_${n-1}`,side:'attacker',officerId:a.commanderId,troops:a.troops,morale:a.morale,x:1,y:2+(n%4),hp:o?.hp||100,energy:o?.energyMax||100});
  }
  for(const aid of battle.defenderArmyIds||[]){
    const a=s.armies[aid];if(!a)continue;
    const o=s.officers[a.commanderId];
    units[`tu_${n++}`]=makeUnit({id:`tu_${n-1}`,side:'defender',officerId:a.commanderId,troops:a.troops,morale:a.morale,x:10,y:2+(n%4),hp:o?.hp||100,energy:o?.energyMax||100});
  }
  if(battle.garrisonTroops>0)units[`tu_${n++}`]=makeUnit({id:`tu_${n-1}`,side:'defender',troops:battle.garrisonTroops,morale:battle.garrisonMorale||100,x:10,y:4,garrison:true});
  return {width:12,height:8,elapsedSeconds:0,units,winner:null,log:[],manualSide:null,selectedUnitId:null};
}

export function setManualSide(tactical,side){
  tactical.manualSide=side;
  for(const u of Object.values(tactical.units))if(u.side===side)u.order='hold';
}

export function issueOrder(tactical,unitId,order,{x=null,y=null,targetId=null,skillId=null}={}){
  const u=tactical.units[unitId];
  if(!u||u.retreated||u.incapacitated)return false;
  if(!['move','attack','hold','retreat','auto','skill'].includes(order))return false;
  u.order=order;u.targetId=targetId;u.skillId=skillId;
  if(x!==null)u.destX=clamp(Math.round(x),0,tactical.width-1);
  if(y!==null)u.destY=clamp(Math.round(y),0,tactical.height-1);
  return true;
}

function closestEnemy(t,u){
  return Object.values(t.units).filter(e=>e.side!==u.side&&capable(e)).sort((a,b)=>dist(u,a)-dist(u,b))[0];
}

function moveToward(u,x,y){
  if(u.x===x&&u.y===y)return;
  if(Math.abs(x-u.x)>=Math.abs(y-u.y))u.x+=Math.sign(x-u.x);else u.y+=Math.sign(y-u.y);
}

function tryMove(u,x,y){
  if(u.moveCooldown>0)return false;
  moveToward(u,x,y);u.moveCooldown=.65;return true;
}

function weaponProficiency(o){
  if(!o)return 20;
  const grades={NONE:0,E:10,D:20,C:35,B:50,A:70,S:90};
  return Math.max(...Object.values(o.proficiencies||{}).map(g=>grades[g]||0),20);
}

function basicAttack(s,t,u,target){
  const o=u.officerId?s.officers[u.officerId]:null,eo=target.officerId?s.officers[target.officerId]:null;
  const attack=(o?.martial||55)*.46+weaponProficiency(o)*.20+(o?command(o):45)*.13+u.morale*.16+(o?.intelligence||50)*.05;
  const defense=(eo?.martial||50)*.27+weaponProficiency(eo)*.13+target.morale*.22+(eo?command(eo):45)*.10+(target.garrison?14:0);
  const variance=.92+rng(s)*.16;
  const edge=clamp((attack-defense*.62)/80,.18,1.05);
  const forceRatio=Math.sqrt(clamp((u.troops+500)/(target.troops+500),.55,1.8));
  const raw=(18+edge*42)*forceRatio*variance;
  const troopLoss=Math.max(10,Math.min(round10(raw),round10(Math.max(20,target.troops*.055))));
  target.troops=Math.max(0,target.troops-troopLoss);
  target.morale=Math.max(0,target.morale-Math.max(1,Math.round(troopLoss/170)));
  if(target.officerId){
    const charDamage=Math.max(1,Math.min(5,Math.round(1.2+edge*2.6)));
    target.hp=Math.max(0,target.hp-charDamage);
    if(target.hp<=0)target.incapacitated=true;
  }
  u.cooldown=2.25;
  t.log.unshift(`${u.officerId?s.officers[u.officerId].name:'Garrison'} hit ${target.officerId?s.officers[target.officerId].name:'garrison'} (${troopLoss} troop loss).`);
}

function useSkill(s,t,u,target,skillId){
  const o=u.officerId?s.officers[u.officerId]:null,sk=SKILLS[skillId],perf=o?skillPerformance(o,skillId):null;
  if(!o||!sk||!perf||u.energy<perf.cost)return false;
  const targets=Object.values(t.units).filter(e=>e.side!==u.side&&capable(e)&&dist(u,e)<=perf.range+(perf.area||0)).sort((a,b)=>dist(u,a)-dist(u,b)).slice(0,perf.area?3:1);
  if(!targets.length)return false;
  u.energy-=perf.cost;
  for(const e of targets){
    const pressure=(.70+rng(s)*.20)*(1+Math.sqrt(Math.max(0,u.troops))/180);
    const raw=perf.power*(sk.troopBias||1)*pressure*.62;
    const casualtyCap=Math.max(40,e.troops*(sk.ultimate ? .09 : .07));
    const troopLoss=Math.max(30,Math.min(round10(raw),round10(casualtyCap)));
    e.troops=Math.max(0,e.troops-troopLoss);
    e.morale=Math.max(0,e.morale-Math.max(2,Math.round((perf.morale||perf.power/22)*.72)));
    if(e.officerId){
      const hpRaw=perf.power*(sk.troopBias>1 ? .035 : .065);
      e.hp=Math.max(0,e.hp-Math.max(2,Math.min(sk.ultimate?14:9,Math.round(hpRaw))));
      if(e.hp<=0)e.incapacitated=true;
    }
  }
  if(perf.moraleRestore){
    for(const ally of Object.values(t.units).filter(e=>e.side===u.side&&dist(u,e)<=perf.range+(perf.area||0)))ally.morale=clamp(ally.morale+perf.moraleRestore,0,100);
  }
  u.cooldown=sk.ultimate?6:4.25;
  t.log.unshift(`${o.name} used ${sk.name}.`);
  return true;
}

function autoDecision(s,t,u){
  const e=closestEnemy(t,u);if(!e)return;
  if(u.morale<15||u.troops<100){u.order='retreat';return}
  const o=u.officerId?s.officers[u.officerId]:null;
  if(o){
    const skillChoices=(o.skills||[]).filter(Boolean).map(id=>({id,perf:skillPerformance(o,id),skill:SKILLS[id]}))
      .filter(x=>x.perf&&x.perf.cost<=u.energy&&dist(u,e)<=x.perf.range)
      .sort((a,b)=>(Number(b.skill?.ultimate)*24+b.perf.power)-(Number(a.skill?.ultimate)*24+a.perf.power));
    if(skillChoices[0]&&rng(s)>.66){u.order='skill';u.skillId=skillChoices[0].id;u.targetId=e.id;return}
  }
  u.order=dist(u,e)<=1?'attack':'move';u.targetId=e.id;u.destX=e.x;u.destY=e.y;
}

export function tickTactical(s,t,seconds=TACTICAL_TICK_SECONDS){
  if(t.winner)return t;
  t.elapsedSeconds+=seconds;
  for(const u of Object.values(t.units)){
    if(!capable(u))continue;
    u.energy=clamp(u.energy+seconds*1.15,0,100);
    u.cooldown=Math.max(0,u.cooldown-seconds);
    u.moveCooldown=Math.max(0,(u.moveCooldown||0)-seconds);
    if(u.side!==t.manualSide||u.order==='auto')autoDecision(s,t,u);
    const e=u.targetId?t.units[u.targetId]:closestEnemy(t,u);
    if(u.order==='retreat'){
      if(u.moveCooldown<=0){u.x+=D[u.side]*-1;u.moveCooldown=.55}
      if(u.x<0||u.x>=t.width){u.retreated=true;t.log.unshift(`${u.officerId?s.officers[u.officerId].name:'Unit'} retreated.`)}
      continue;
    }
    if(u.order==='hold')continue;
    if(u.order==='move'){
      const x=e?.x??u.destX,y=e?.y??u.destY;
      if(x!==undefined&&y!==undefined)tryMove(u,x,y);
      if(e&&dist(u,e)<=1&&u.side!==t.manualSide)u.order='attack';
      continue;
    }
    if(u.order==='skill'&&e&&u.cooldown<=0){
      const perf=u.officerId?skillPerformance(s.officers[u.officerId],u.skillId):null;
      if(perf&&dist(u,e)<=perf.range){if(useSkill(s,t,u,e,u.skillId)&&u.side!==t.manualSide)u.order='auto'}
      else tryMove(u,e.x,e.y);
      continue;
    }
    if(u.order==='attack'&&e&&u.cooldown<=0){
      if(dist(u,e)<=1)basicAttack(s,t,u,e);else tryMove(u,e.x,e.y);
    }
  }
  for(const u of Object.values(t.units))if(u.morale<=0||u.troops<=0)u.retreated=true;
  const a=Object.values(t.units).some(u=>u.side==='attacker'&&capable(u));
  const d=Object.values(t.units).some(u=>u.side==='defender'&&capable(u));
  if(!a||!d)t.winner=a?'attacker':d?'defender':'draw';
  return t;
}

export function runAutoBattle(s,battle,maxTicks=1400){
  if(!battle.tactical)battle.tactical=createTacticalState(s,battle);
  battle.tactical.manualSide=null;
  for(let i=0;i<maxTicks&&!battle.tactical.winner;i++)tickTactical(s,battle.tactical);
  return battle.tactical.winner;
}

export function tacticalSnapshot(t){
  return {winner:t.winner,elapsedSeconds:t.elapsedSeconds,units:Object.values(t.units).map(u=>({id:u.id,side:u.side,officerId:u.officerId,troops:u.troops,morale:Math.round(u.morale),hp:u.hp,energy:Math.round(u.energy),x:u.x,y:u.y,retreated:u.retreated,incapacitated:u.incapacitated,garrison:u.garrison}))};
}
