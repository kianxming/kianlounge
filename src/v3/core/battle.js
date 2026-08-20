import {nameOf,coreOf,skillName,pick,clamp} from './config.js';

const FALLBACK_POWER={kaido:98,king:91,queen:86,jack:84,ulti:77,page_one:75};
const STRONG_HUNTERS=new Set(['luffy','zoro','law','kid','sanji']);

export function fighter(id,side){
  const generic=id==='garrison_captain'||id==='enemy_garrison';
  const m=generic?68:(coreOf(id).martial||FALLBACK_POWER[id]||72);
  return{id,name:generic?'수비대장':nameOf(id),side,hp:100,martial:m,down:false,generic};
}

export function beginBattle(sim){
  const e=sim.encounter;if(!e)return false;
  const a=sim.armies.find(x=>x.id===e.armyId),t=sim.settlements[e.targetId];if(!a||!t)return false;
  const defender=e.playerSide==='defender';
  const alliedIds=defender?(t.chars.filter(id=>sim.characters.some(c=>c.id===id))):a.charIds;
  const enemyIds=defender?a.charIds:t.chars;
  sim.battle={
    armyId:a.id,targetId:t.id,playerSide:e.playerSide,attackerOwner:a.owner,
    allies:(alliedIds.length?alliedIds:['garrison_captain']).map(id=>fighter(id,'ally')),
    enemies:(enemyIds.length?enemyIds:['enemy_garrison']).map(id=>fighter(id,'enemy')),
    allyTroops:defender?t.troops:a.troops,enemyTroops:defender?a.troops:t.troops,
    allyLineBroken:false,enemyLineBroken:false,
    focus:{},selectedAlly:null,clock:0,round:0,assaultRounds:0,forceSpecial:false,commandUsed:{assault:false,rally:false,special:false},
    log:[defender?'거점을 지키기 위한 전투가 시작되었습니다!':'공격군이 적과 충돌했습니다!'],finished:false
  };
  sim.encounter=null;sim.paused=false;sim.mode='battle';return true;
}

export function issueBattleCommand(sim,type){
  const b=sim.battle;if(!b||b.finished)return false;
  if(type==='auto'){b.focus={};b.selectedAlly=null;b.log.unshift('🔄 캐릭터들이 다시 자율적으로 적을 선택합니다.');return true;}
  if(type==='assault'&&!b.commandUsed.assault){b.commandUsed.assault=true;b.assaultRounds=3;b.log.unshift('📣 총공격! 병사들이 전선을 강하게 밀어붙입니다.');return true;}
  if(type==='rally'&&!b.commandUsed.rally){b.commandUsed.rally=true;b.allyTroops+=Math.max(80,Math.round(b.allyTroops*.08));b.log.unshift('🔥 사기 상승! 흔들리던 아군 전선이 다시 버팁니다.');return true;}
  if(type==='special'&&!b.commandUsed.special){b.commandUsed.special=true;b.forceSpecial=true;b.log.unshift('✨ 필살기 지시! 다음 캐릭터 행동에서 강력한 기술을 노립니다.');return true;}
  return false;
}

function autoTarget(f,enemies){
  if(!enemies.length)return null;
  if(STRONG_HUNTERS.has(f.id)&&Math.random()<.72)return [...enemies].sort((a,b)=>b.martial-a.martial)[0];
  return pick(enemies);
}

function hit(a,t,b,forced=false){
  if(!t||t.down)return;
  const lineBonus=t.side==='enemy'&&b.enemyLineBroken?2:t.side==='ally'&&b.allyLineBroken?2:0;
  const skills=(coreOf(a.id).skills||[]).filter(id=>id!=='basic_strike');
  const special=skills.length&&(forced||Math.random()<.2),powerBoost=special?1.65:1;
  const d=clamp(Math.round((a.martial/13+Math.random()*7+lineBonus)*powerBoost),5,special?27:17);
  t.hp=Math.max(0,t.hp-d);
  if(special)b.log.unshift(`✨ ${a.name}의 ${skillName(pick(skills))}! ${t.name}에게 큰 피해!`);
  else if(Math.random()<.2)b.log.unshift(`${a.name} → ${t.name} 강타!`);
  if(!t.hp){t.down=true;b.log.unshift(`⚔ ${t.name} 전투불능!`);}
  if(b.log.length>10)b.log.length=10;
}

function support(allies,b){
  const chopper=allies.find(x=>x.id==='chopper'&&!x.down),hurt=[...allies].filter(x=>!x.down&&x.hp<65).sort((a,b)=>a.hp-b.hp)[0];
  if(chopper&&hurt&&Math.random()<.24){const heal=10+Math.floor(Math.random()*10);hurt.hp=Math.min(100,hurt.hp+heal);b.log.unshift(`💚 쵸파가 ${hurt.name}을(를) 치료했습니다!`);return true;}
  return false;
}

function breakLine(b,side){
  const prop=side==='enemy'?'enemyLineBroken':'allyLineBroken';
  if(b[prop])return;b[prop]=true;
  b.log.unshift(side==='enemy'?'💥 적 병력의 전선이 무너졌습니다. 이제 적장들이 직접 버텨야 합니다!':'🚨 아군 병력이 무너졌습니다. 캐릭터들이 전선을 버티고 있습니다!');
}

export function updateBattle(sim,dt){
  const b=sim.battle;if(sim.mode!=='battle'||!b||b.finished)return;
  b.clock+=dt;if(b.clock<.72)return;b.clock=0;b.round++;

  let A=b.allies.filter(x=>!x.down),E=b.enemies.filter(x=>!x.down);
  if(!A.length||!E.length){finish(sim,A.length>0);return;}

  support(A,b);
  let forced=b.forceSpecial;b.forceSpecial=false;
  for(const f of A){const target=E.find(x=>x.id===b.focus[f.id]&&!x.down)||autoTarget(f,E.filter(x=>!x.down));hit(f,target,b,forced);forced=false;}
  E=b.enemies.filter(x=>!x.down);
  if(!E.length){finish(sim,true);return;}

  for(const f of E){const available=b.allies.filter(x=>!x.down);if(!available.length)break;hit(f,autoTarget(f,available),b);}
  A=b.allies.filter(x=>!x.down);
  if(!A.length){finish(sim,false);return;}

  const assault=b.assaultRounds>0?1.55:1;if(b.assaultRounds>0)b.assaultRounds--;
  b.enemyTroops=Math.max(0,b.enemyTroops-A.length*18*assault);
  b.allyTroops=Math.max(0,b.allyTroops-E.length*15);
  if(!b.enemyTroops)breakLine(b,'enemy');
  if(!b.allyTroops)breakLine(b,'ally');

  // 병력은 전선을 밀어주는 역할이고, 이름 있는 캐릭터를 대신 쓰러뜨리지는 않는다.
  if(b.enemyLineBroken)for(const f of E)f.hp=Math.max(1,f.hp-1);
  if(b.allyLineBroken)for(const f of A)f.hp=Math.max(1,f.hp-1);
  if(b.log.length>10)b.log.length=10;
}

function enemyRetreatBase(sim,exclude){return Object.values(sim.settlements).find(s=>s.owner==='beasts'&&s.id!==exclude);}
function playerRetreatBase(sim,exclude){return Object.values(sim.settlements).find(s=>s.owner==='straw_hat'&&s.id!==exclude);}

export function finish(sim,win){
  const b=sim.battle;if(!b||b.finished)return;
  b.finished=true;b.victory=win;
  const a=sim.armies.find(x=>x.id===b.armyId),t=sim.settlements[b.targetId];if(!a||!t)return;
  a.done=true;

  if(b.playerSide==='attacker'){
    if(win){
      const originalDefenders=[...t.chars];
      for(const e of b.enemies.filter(x=>x.down&&!x.generic))if(Math.random()<.44)sim.capture(e.id,t.id,t.owner);
      const escaped=originalDefenders.filter(id=>!sim.prisoners.some(p=>p.id===id)),retreat=enemyRetreatBase(sim,t.id);
      if(retreat)retreat.chars=[...new Set([...retreat.chars,...escaped])];
      t.owner='straw_hat';const garrison=Math.max(250,Math.round(Math.max(0,b.allyTroops)*.35));t.troops=garrison;t.chars=[];
      const returning=Math.max(0,b.allyTroops-garrison);sim.createReturnArmy(t.id,a.charIds,returning);
      if(escaped.length)b.log.unshift(`💨 ${escaped.map(nameOf).join('·')}은(는) 포획을 피해 후퇴했습니다.`);
      b.log.unshift(`🏴 ${t.name} 점령 성공! 출정대가 꽃의 도시로 귀환합니다.`);
    }else{
      sim.createReturnArmy(t.id,a.charIds,Math.max(0,b.allyTroops));
      b.log.unshift('아군이 패배해 꽃의 도시로 후퇴합니다.');
    }
    return;
  }

  if(win){
    for(const e of b.enemies.filter(x=>x.down&&!x.generic))if(Math.random()<.38)sim.capture(e.id,a.from,a.owner);
    const captured=new Set(sim.prisoners.map(p=>p.id)),escaped=a.charIds.filter(id=>!captured.has(id)),source=sim.settlements[a.from];
    if(source)source.chars=[...new Set([...source.chars,...escaped])];
    t.troops=Math.max(150,Math.floor(b.allyTroops));b.log.unshift(`🛡️ ${t.name} 방어 성공!`);
  }else{
    const retreat=playerRetreatBase(sim,t.id),playerIds=t.chars.filter(id=>sim.characters.some(c=>c.id===id));
    if(retreat){retreat.chars=[...new Set([...retreat.chars,...playerIds])];for(const id of playerIds){const c=sim.characters.find(x=>x.id===id);if(c){c.location=retreat.id;c.injury=Math.random()<.55?'light':'normal';}}}
    const freed=sim.prisoners.filter(p=>p.faction===a.owner);sim.prisoners=sim.prisoners.filter(p=>p.faction!==a.owner);
    t.owner=a.owner;t.troops=Math.max(250,Math.floor(b.enemyTroops));t.chars=[...new Set([...a.charIds,...freed.map(p=>p.id)])];
    b.log.unshift(`🚨 ${t.name}이(가) 함락되었습니다.${freed.length?` ${freed.map(p=>p.name).join('·')}도 구출되었습니다.`:''}`);
  }
}
