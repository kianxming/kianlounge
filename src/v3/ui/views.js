import {GRID,FACILITIES,nameOf} from '../core/config.js';

export const faction=o=>o==='straw_hat'?'밀짚모자 동맹':o==='beasts'?'백수 해적단':o==='kozuki'?'코즈키 세력':o;

export function top(sim){
  const title=sim.mode==='village'?sim.townName:sim.mode==='scout'&&sim.scout?sim.scout.name:sim.mode==='battle'?'전투':'와노쿠니';
  const sub=sim.mode==='scout'?`정찰 관찰 · 제 ${sim.day}일 · ${sim.formatTime()}`:`제 ${sim.day}일 · ${sim.formatTime()}`;
  return `<header class="topbar"><div><b>${title}</b><small>${sub}</small></div><div class="hud"><span>💰 ${sim.money.toLocaleString()}B</span><span>⭐ ${sim.fame}</span><span>${'★'.repeat(sim.townRank)}${'☆'.repeat(5-sim.townRank)}</span></div></header>`;
}

export function nav(sim){
  const worldOn=['world','scout'].includes(sim.mode);
  return `<nav class="bottom-nav"><button data-nav="village" class="${sim.mode==='village'?'on':''}">🏯<span>영지</span></button><button data-nav="mates">👥<span>동료</span></button><button data-nav="sortie">⚔️<span>출정</span></button><button data-nav="world" class="${worldOn?'on':''}">🌏<span>세계</span></button><button data-nav="menu">☰<span>메뉴</span></button></nav>`;
}

function roadsHtml(roads){return[...roads].map(k=>{const[x,y]=k.split(',');return`<i class="road" style="--x:${x};--y:${y}"></i>`;}).join('');}
function facilitiesHtml(facilities,interactive=true){return facilities.map(f=>{const d=FACILITIES[f.type];return `${interactive?'<button':'<div'} class="facility ${interactive?'':'readonly'}" ${interactive?`data-fac="${f.id}"`:''} style="--x:${f.x};--y:${f.y};--w:${d.size[0]};--h:${d.size[1]}"><b>${d.icon}</b><span>${d.name}</span><em>Lv.${f.level}</em>${interactive?'</button>':'</div>'}`;}).join('');}
function charsHtml(chars,readonly=false){return chars.map(c=>`<${readonly?'div':'button'} class="chara ${readonly?'readonly':''}" style="--x:${c.x};--y:${c.y}"><i>${c.name.slice(0,1)}</i><small>${c.name}</small>${c.bubble?`<b>${c.bubble}</b>`:''}</${readonly?'div':'button'}>`).join('');}

export function village(sim,ui){
  let cells='';
  if(ui.buildType){
    for(let y=0;y<GRID.h;y++)for(let x=0;x<GRID.w;x++){
      const ok=ui.buildType==='__road__'?sim.canBuildRoad(x,y):sim.canBuild(ui.buildType,x,y);
      if(ok)cells+=`<button class="build-cell ${ui.buildType==='__road__'?'road-cell':''}" data-build-x="${x}" data-build-y="${y}" style="--x:${x};--y:${y}"></button>`;
    }
  }
  return `<section class="village"><div class="vtools"><button data-action="build">🔨 건설</button><button data-action="rank">${'★'.repeat(sim.townRank)} 거점</button></div><div class="grid" style="--cols:${GRID.w};--rows:${GRID.h}">${roadsHtml(sim.roads)}${facilitiesHtml(sim.facilities)}${charsHtml(sim.activeCharacters())}${cells}</div><div class="ticker">${sim.log[0]||''}</div></section>`;
}

export function scout(sim){
  const s=sim.scout;if(!s)return world(sim);
  return `<section class="village scout"><div class="vtools"><button data-action="back-world">← 세계지도</button><span>👁 관찰 전용</span></div><div class="grid" style="--cols:${GRID.w};--rows:${GRID.h}">${roadsHtml(s.roads)}${facilitiesHtml(s.facilities,false)}${charsHtml(s.characters,true)}</div><div class="ticker">${s.log[0]||`${s.name} 내부를 관찰 중입니다.`}</div></section>`;
}

export function world(sim){
  const nodes=Object.values(sim.settlements).map(s=>`<button class="node ${s.owner==='straw_hat'?'ally':'enemy'}" data-node="${s.id}" style="left:${s.x}%;top:${s.y}%"><b>${s.kind==='요새'?'🏯':s.kind==='감옥도시'?'⛓️':'🏘️'}</b><span>${s.name}</span></button>`).join('');
  const armies=sim.armies.filter(a=>!a.done).map(a=>{const f=sim.settlements[a.from],t=sim.settlements[a.target],x=f.x+(t.x-f.x)*a.progress,y=f.y+(t.y-f.y)*a.progress;const names=a.charIds.map(id=>sim.characters.find(c=>c.id===id)?.name).filter(Boolean).join('·');return`<div class="march" style="left:${x}%;top:${y}%">🚩<span>${names}</span><em>${Math.round(a.progress*100)}%</em></div>`;}).join('');
  return `<section class="world"><div class="island"></div>${nodes}${armies}<div class="ticker">${sim.log[0]||''}</div></section>`;
}

export function battle(sim){
  const b=sim.battle;if(!b)return'<div class="empty">전투 없음</div>';
  const focusCounts=Object.values(b.focus).reduce((m,id)=>(m[id]=(m[id]||0)+1,m),{});
  const side=(a,s)=>a.map(f=>{const target=b.focus[f.id],duel=s==='enemy'&&focusCounts[f.id]?`<em>${focusCounts[f.id]}:1 교전</em>`:'';return`<button class="fighter ${s} ${f.down?'down':''} ${b.selectedAlly===f.id?'selected':''}" data-fighter="${f.id}" data-side="${s}"><i>${f.name.slice(0,1)}</i><b>${f.name}</b><span><u style="width:${f.hp}%"></u></span>${s==='ally'&&target?`<em>→ ${b.enemies.find(e=>e.id===target)?.name}</em>`:duel}</button>`;}).join('');
  return `<section class="battle"><div class="battle-head"><span>아군 ${Math.round(b.allyTroops)}${b.allyLineBroken?' · 전선 붕괴':''}</span><b>⚔ 전투</b><span>적군 ${Math.round(b.enemyTroops)}${b.enemyLineBroken?' · 전선 붕괴':''}</span></div><div class="field"><div>${side(b.allies,'ally')}</div><strong>💥</strong><div>${side(b.enemies,'enemy')}</div></div><div class="battle-log">${b.log.slice(0,4).map(x=>`<span>${x}</span>`).join('')}</div><small class="help">아군 캐릭터 → 적장을 누르면 1:1·다대1 교전을 지정</small>${b.finished?`<button class="result" data-action="battle-done">${b.victory?'승리!':'후퇴'} →</button>`:''}</section>`;
}

export function encounter(sim){
  if(!sim.encounter)return'';const a=sim.armies.find(x=>x.id===sim.encounter.armyId),t=sim.settlements[sim.encounter.targetId];
  return `<div class="shade"><section class="sheet"><h2>⚔ 군단 조우!</h2><div class="vs"><div><b>밀짚모자 동맹</b><small>${a.charIds.map(id=>sim.characters.find(c=>c.id===id)?.name).join(' · ')}</small><strong>병력 ${a.troops}</strong></div><i>VS</i><div><b>${faction(t.owner)}</b><small>${t.chars.map(nameOf).join(' · ')||'수비대'}</small><strong>병력 ${t.troops}</strong></div></div><div class="actions"><button data-action="battle-view">전투 보기</button><button data-action="battle-auto">자동 전투</button></div></section></div>`;
}
