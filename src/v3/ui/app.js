import {V3Sim} from '../core/sim.js';
import {FACILITIES,nameOf} from '../core/config.js';
import * as V from './views.js';

const sim=new V3Sim();
const app=document.querySelector('#app');
const ui={modal:null,facility:null,node:null,buildType:null,sortie:null,chars:new Set(),troops:1200};

function modal(){
  if(sim.encounter)return V.encounter(sim);
  if(ui.sortie){
    const t=sim.settlements[ui.sortie];
    return `<div class="shade"><section class="sheet"><button class="x" data-action="close">×</button><h2>${t.name} 공격</h2><p>보낼 캐릭터는 제한 없이 선택합니다.</p><div class="roster">${sim.characters.filter(c=>c.location==='flower_capital').map(c=>`<button data-char="${c.id}" class="${ui.chars.has(c.id)?'on':''}">${ui.chars.has(c.id)?'☑':'☐'} <b>${c.name}</b></button>`).join('')}</div><label>병력 <input id="troops" type="range" min="100" max="2400" step="100" value="${ui.troops}"> <b>${ui.troops}</b></label><button class="primary" data-action="dispatch">출정</button></section></div>`;
  }
  if(ui.modal==='build'){
    const facilityRows=Object.entries(FACILITIES).filter(([t])=>t!=='headquarters').map(([t,d])=>`<button class="build-row" data-build="${t}" ${d.rank>sim.townRank?'disabled':''}><b>${d.icon} ${d.name}</b><small>${d.rank<=sim.townRank?`${600+d.rank*450}B`:`★${d.rank} 해금`}</small></button>`).join('');
    return `<div class="shade"><section class="sheet"><button class="x" data-action="close">×</button><h2>🔨 건설</h2><button class="build-row road-choice" data-build="__road__"><b>🛤️ 길</b><small>40B / 1칸</small></button>${facilityRows}</section></div>`;
  }
  if(ui.modal==='mates')return `<div class="shade"><section class="sheet"><button class="x" data-action="close">×</button><h2>👥 동료</h2>${sim.characters.map(c=>`<div class="mate"><b>${c.name}</b><span>${c.location==='flower_capital'?'꽃의 도시':c.location==='march'?'출정 중':sim.settlements[c.location]?.name||c.location}</span><small>${c.personalMoney.toLocaleString()}B · ${c.injury==='normal'?'정상':'경상'}</small></div>`).join('')}</section></div>`;
  if(ui.modal==='menu')return `<div class="shade"><section class="sheet"><button class="x" data-action="close">×</button><h2>☰ 메뉴</h2><button class="menu" data-action="prison">⛓️ 감옥 / 포로 ${sim.prisoners.length}</button><button class="menu">🍈 보물고</button><button class="menu">📖 도감</button><button class="menu">⚙️ 설정</button></section></div>`;
  if(ui.modal==='prison')return `<div class="shade"><section class="sheet"><button class="x" data-action="close">×</button><h2>⛓️ 감옥</h2>${sim.prisoners.length?sim.prisoners.map(p=>`<div class="prisoner"><b>${p.name}</b><span>충성도 ${p.loyalty>=90?'매우 높음':p.loyalty>=70?'높음':'보통'}</span><small>${p.cooldown?`${p.nextPersuadeDay}일째 재시도`:'회유 가능'}</small><button data-persuade="${p.id}" ${p.cooldown?'disabled':''}>회유</button></div>`).join(''):'<p>포로 없음</p>'}</section></div>`;
  if(ui.modal==='rank'){
    const r=sim.rankRequirements();
    return `<div class="shade"><section class="sheet"><button class="x" data-action="close">×</button><h2>${'★'.repeat(sim.townRank)} ${sim.townName}</h2><p>다음 ★${r.target}: 명성 ${sim.fame}/${r.fame} · 시설 ${sim.facilities.length}/${r.facilities}</p><button class="primary" data-action="rank-up" ${sim.canRankUp()?'':'disabled'}>거점 승급</button></section></div>`;
  }
  if(ui.facility){
    const f=sim.facilityAt(ui.facility),d=f&&FACILITIES[f.type];
    if(d)return `<div class="mini"><button class="x" data-action="close-mini">×</button><h3>${d.icon} ${d.name} Lv.${f.level}</h3><small>이용 ${f.uses}회 · 수입 ${f.revenue.toLocaleString()}B</small><button data-action="upgrade">강화 ${700*f.level}B</button></div>`;
  }
  if(ui.node){
    const s=sim.settlements[ui.node];
    return `<div class="mini world-pop"><button class="x" data-action="close-mini">×</button><div class="art">${s.kind==='요새'?'🏯':s.kind==='감옥도시'?'⛓️':'🏘️'}</div><h3>${s.name}</h3><small>${V.faction(s.owner)}</small><div>${s.owner==='straw_hat'?'<button data-action="enter">들어가기</button>':`<button data-action="attack">공격</button><button data-action="scout">정찰</button>`}<button data-action="info">정보</button></div></div>`;
  }
  return '';
}

function render(){
  const scene=sim.mode==='village'?V.village(sim,ui):sim.mode==='world'?V.world(sim):sim.mode==='scout'?V.scout(sim):V.battle(sim);
  app.innerHTML=`<div class="game">${V.top(sim)}<main>${scene}</main>${V.nav(sim)}${modal()}</div>`;
  bind();
}

function bind(){
  document.querySelectorAll('[data-nav]').forEach(b=>b.onclick=()=>{
    const n=b.dataset.nav;ui.facility=null;ui.node=null;
    if(n==='village')sim.returnToVillage();
    else if(n==='world'||n==='sortie'){sim.returnToWorld();}
    else{ui.modal=n;render();}
  });
  document.querySelectorAll('[data-fac]').forEach(b=>b.onclick=()=>{ui.facility=b.dataset.fac;render();});
  document.querySelectorAll('[data-node]').forEach(b=>b.onclick=()=>{ui.node=b.dataset.node;render();});
  document.querySelectorAll('[data-build]').forEach(b=>b.onclick=()=>{ui.buildType=b.dataset.build;ui.modal=null;render();});
  document.querySelectorAll('[data-build-x]').forEach(b=>b.onclick=()=>{
    const x=+b.dataset.buildX,y=+b.dataset.buildY;
    if(ui.buildType==='__road__')sim.buildRoad(x,y);
    else if(sim.build(ui.buildType,x,y))ui.buildType=null;
    render();
  });
  document.querySelectorAll('[data-char]').forEach(b=>b.onclick=()=>{ui.chars.has(b.dataset.char)?ui.chars.delete(b.dataset.char):ui.chars.add(b.dataset.char);render();});
  document.querySelectorAll('[data-fighter]').forEach(b=>b.onclick=()=>{
    const id=b.dataset.fighter;
    if(b.dataset.side==='ally')sim.battle.selectedAlly=id;
    else if(sim.battle.selectedAlly){sim.setBattleFocus(sim.battle.selectedAlly,id);sim.battle.selectedAlly=null;}
    render();
  });
  document.querySelectorAll('[data-persuade]').forEach(b=>b.onclick=()=>{alert(sim.persuade(b.dataset.persuade).msg);render();});
  const s=document.querySelector('#troops');if(s)s.oninput=()=>{ui.troops=+s.value;s.nextElementSibling.textContent=ui.troops;};
  document.querySelectorAll('[data-action]').forEach(b=>b.onclick=act);
}

function act(e){
  const a=e.currentTarget.dataset.action;
  if(a==='build')ui.modal='build';
  else if(a==='cancel-build')ui.buildType=null;
  else if(a==='rank')ui.modal='rank';
  else if(a==='close'){ui.modal=null;ui.sortie=null;}
  else if(a==='close-mini'){ui.facility=null;ui.node=null;}
  else if(a==='upgrade')sim.upgradeFacility(ui.facility);
  else if(a==='rank-up'){sim.rankUp();ui.modal=null;}
  else if(a==='prison')ui.modal='prison';
  else if(a==='attack'){ui.sortie=ui.node;ui.node=null;ui.chars.clear();}
  else if(a==='scout'){const id=ui.node;ui.node=null;sim.startScout(id);}
  else if(a==='back-world')sim.returnToWorld();
  else if(a==='info'){const s=sim.settlements[ui.node];alert(`${s.name}\n병력 ${s.troops}\n캐릭터 ${s.chars.map(nameOf).join(', ')||'없음'}`);}
  else if(a==='dispatch'){if(sim.dispatch(ui.sortie,[...ui.chars],ui.troops)){ui.sortie=null;ui.chars.clear();}}
  else if(a==='battle-view')sim.startBattle();
  else if(a==='battle-auto')sim.autoResolveEncounter();
  else if(a==='battle-done')sim.returnToWorld();
  else if(a==='enter'){sim.returnToVillage();ui.node=null;}
  render();
}

sim.onChange(render);
render();
let last=performance.now(),lastPaint=0;
function loop(now){
  sim.tick(Math.min(.1,(now-last)/1000));last=now;
  if(now-lastPaint>=240){lastPaint=now;render();}
  requestAnimationFrame(loop);
}
requestAnimationFrame(loop);
window.__V3__={sim,render};
