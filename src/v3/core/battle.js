import {nameOf,coreOf,pick,clamp} from './config.js';

const FALLBACK_POWER={kaido:98,king:91,queen:86,jack:84,ulti:77,page_one:75};
const STRONG_HUNTERS=new Set(['luffy','zoro','law','kid','sanji']);

export function fighter(id,side){
  const generic=id==='garrison_captain';
  const m=generic?68:(coreOf(id).martial||FALLBACK_POWER[id]||72);
  return{id,name:generic?'수비대장':nameOf(id),side,hp:100,martial:m,down:false,generic};
}

export function beginBattle(sim){
  const e=sim.encounter;if(!e)return false;
  const a=sim.armies.find(x=>x.id===e.armyId),t=sim.settlements[e.targetId];if(!a||!t)return false;
  sim.battle={
    armyId:a.id,targetId:t.id,
    allies:a.charIds.map(id=>fighter(id,'ally')),
    enemies:(t.chars.length?t.chars:['garrison_captain']).map(id=>fighter(id,'enemy')),
    allyTroops:a.troops,enemyTroops:t.troops,
    allyLineBroken:false,enemyLineBroken:false,
    focus:{},selectedAlly:null,clock:0,log:['전투가 시작되었습니다!'],finished:false
  };
  sim.encounter=null;sim.paused=false;sim.mode='battle';return true;
}

function autoTarget(f,enemies){
  if(!enemies.length)return null;
  if(STRONG_HUNTERS.has(f.id)&&Math.random()<.72)return [...enemies].sort((a,b)=>b.martial-a.martial)[0];
  return pick(enemies);
}

function hit(a,t,b){
  if(!t||t.down)return;
  const lineBonus=t.side==='enemy'&&b.enemyLineBroken?2:t.side==='ally'&&b.allyLineBroken?2:0;
  const d=clamp(Math.round(a.martial/13+Math.random()*7+lineBonus),5,17);
  t.hp=Math.max(0,t.hp-d);
  if(Math.random()<.2)b.log.unshift(`${a.name} → ${t.name} 강타!`);
  if(!t.hp){t.down=true;b.log.unshift(`⚔ ${t.name} 전투불능!`);}
  if(b.log.length>8)b.log.length=8;
}

function breakLine(b,side){
  const prop=side==='enemy'?'enemyLineBroken':'allyLineBroken';
  if(b[prop])return;b[prop]=true;
  b.log.unshift(side==='enemy'?'💥 적 병력의 전선이 무너졌습니다. 이제 적장만 남았습니다!':'🚨 아군 병력이 무너졌습니다. 캐릭터들이 전선을 버티고 있습니다!');
}

export function updateBattle(sim,dt){
  const b=sim.battle;if(sim.mode!=='battle'||!b||b.finished)return;
  b.clock+=dt;if(b.clock<.75)return;b.clock=0;

  let A=b.allies.filter(x=>!x.down),E=b.enemies.filter(x=>!x.down);
  if(!A.length||!E.length){finish(sim,A.length>0);return;}

  for(const f of A){const target=E.find(x=>x.id===b.focus[f.id]&&!x.down)||autoTarget(f,E.filter(x=>!x.down));hit(f,target,b);}
  E=b.enemies.filter(x=>!x.down);
  if(!E.length){finish(sim,true);return;}

  for(const f of E){const available=b.allies.filter(x=>!x.down);if(!available.length)break;hit(f,autoTarget(f,available),b);}
  A=b.allies.filter(x=>!x.down);
  if(!A.length){finish(sim,false);return;}

  b.enemyTroops=Math.max(0,b.enemyTroops-A.length*18);
  b.allyTroops=Math.max(0,b.allyTroops-E.length*15);
  if(!b.enemyTroops)breakLine(b,'enemy');
  if(!b.allyTroops)breakLine(b,'ally');

  // 병력은 전황을 유리하게 만들지만 이름 있는 캐릭터를 대신 쓰러뜨리지는 않는다.
  if(b.enemyLineBroken)for(const f of E)f.hp=Math.max(1,f.hp-1);
  if(b.allyLineBroken)for(const f of A)f.hp=Math.max(1,f.hp-1);
}

export function finish(sim,win){
  const b=sim.battle;if(!b||b.finished)return;
  b.finished=true;b.victory=win;
  const a=sim.armies.find(x=>x.id===b.armyId),t=sim.settlements[b.targetId];
  if(win){
    const originalDefenders=[...t.chars];
    for(const e of b.enemies.filter(x=>x.down&&!x.generic))if(Math.random()<.42)sim.capture(e.id,t.id);
    t.owner='straw_hat';t.troops=Math.max(250,Math.round(Math.max(0,b.allyTroops)*.35));
    t.chars=[...a.charIds];
    a.charIds.forEach(id=>{const c=sim.characters.find(x=>x.id===id);if(c)c.location=t.id;});
    const escaped=originalDefenders.filter(id=>!sim.prisoners.some(p=>p.id===id));
    if(escaped.length)b.log.unshift(`💨 ${escaped.map(nameOf).join('·')}은(는) 포획을 피해 후퇴했습니다.`);
    b.log.unshift(`🏴 ${t.name} 점령 성공!`);
  }else{
    a.charIds.forEach(id=>{const c=sim.characters.find(x=>x.id===id);if(c){c.location='flower_capital';c.injury=Math.random()<.45?'light':'normal';}});
    b.log.unshift('아군이 후퇴했습니다.');
  }
}
