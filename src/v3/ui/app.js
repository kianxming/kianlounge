import {V3Sim} from '../core/sim.js';
import {issueBattleCommand} from '../core/battle.js';
import {FACILITIES,SPECIAL_ITEMS,nameOf} from '../core/config.js';
import * as V from './views.js';

const SAVE_KEY='wano-kairo-v3-save';
function loadSaved(){try{const raw=localStorage.getItem(SAVE_KEY);return raw?JSON.parse(raw):null;}catch{return null;}}
let sim=new V3Sim(loadSaved());
const app=document.querySelector('#app');
const ui={modal:null,facility:null,node:null,buildType:null,sortie:null,chars:new Set(),troops:1200,giftItem:null,toast:''};

function treasureName(id){return SPECIAL_ITEMS[id]?.name||id;}
function modal(){
  if(sim.encounter)return V.encounter(sim);
  if(ui.sortie){
    const t=sim.settlements[ui.sortie],max=Math.max(0,sim.availableTroops());ui.troops=Math.min(Math.max(100,ui.troops),Math.max(100,max));
    return `<div class="shade"><section class="sheet"><button class="x" data-action="close">×</button><h2>${t.name} 공격</h2><p>목적지를 먼저 고른 뒤 보낼 캐릭터와 병력을 선택합니다. 캐릭터 수 제한과 군량은 없습니다.</p><div class="roster">${sim.characters.filter(c=>c.location==='flower_capital').map(c=>`<button data-char="${c.id}" class="${ui.chars.has(c.id)?'on':''}">${ui.chars.has(c.id)?'☑':'☐'} <b>${c.name}</b><small>${c.gearName}</small></button>`).join('')}</div><label>병력 <input id="troops" type="range" min="100" max="${Math.max(100,max)}" step="100" value="${Math.min(ui.troops,Math.max(100,max))}" ${max<100?'disabled':''}> <b>${Math.min(ui.troops,max)}</b> / ${max}</label><button class="primary" data-action="dispatch" ${!ui.chars.size||max<100?'disabled':''}>출정</button></section></div>`;
  }
  if(ui.modal==='build'){
    const facilityRows=Object.entries(FACILITIES).filter(([t])=>t!=='headquarters').map(([t,d])=>`<button class="build-row" data-build="${t}" ${d.rank>sim.townRank?'disabled':''}><b>${d.icon} ${d.name}</b><small>${d.rank<=sim.townRank?`${600+d.rank*450}B`:`★${d.rank} 해금`}</small></button>`).join('');
    return `<div class="shade"><section class="sheet"><button class="x" data-action="close">×</button><h2>🔨 건설</h2><p>길과 시설을 직접 배치합니다. 거점 ★랭크가 오르면 새 시설이 열립니다.</p><button class="build-row road-choice" data-build="__road__"><b>🛤️ 길</b><small>40B / 1칸</small></button>${facilityRows}</section></div>`;
  }
  if(ui.modal==='mates')return `<div class="shade"><section class="sheet"><button class="x" data-action="close">×</button><h2>👥 동료</h2>${sim.characters.map(c=>`<div class="mate"><b>${c.name}</b><span>${c.location==='flower_capital'?'꽃의 도시':c.location==='march'?'출정 중':sim.settlements[c.location]?.name||c.location}</span><small>${c.personalMoney.toLocaleString()}B · ${c.gearName} · ${c.injury==='normal'?'정상':'경상'}${c.specialItems.length?` · ${c.specialItems.map(treasureName).join(', ')}`:''}</small></div>`).join('')}</section></div>`;
  if(ui.modal==='menu')return `<div class="shade"><section class="sheet"><button class="x" data-action="close">×</button><h2>☰ 메뉴</h2><button class="menu" data-action="prison">⛓️ 감옥 / 포로 ${sim.prisoners.length}</button><button class="menu" data-action="treasure">🍈 보물고 / 특별 아이템 ${sim.treasury.length}</button><button class="menu" data-action="save">💾 저장</button><button class="menu" data-action="reset">↻ 새 게임</button><button class="menu">📖 도감</button><button class="menu">⚙️ 설정</button></section></div>`;
  if(ui.modal==='prison')return `<div class="shade"><section class="sheet"><button class="x" data-action="close">×</button><h2>⛓️ 감옥</h2><p>회유 후 5게임일 동안 다시 시도할 수 없습니다. 기존 세력에 대한 충성도와 수감 기간이 회유에 영향을 줍니다.</p>${sim.prisoners.length?sim.prisoners.map(p=>`<div class="prisoner"><b>${p.name}</b><span>충성도 ${p.loyalty>=95?'매우 높음':p.loyalty>=80?'높음':'보통'} · 전향 가능성 ${sim.persuasionLabel(p)}</span><small>${p.cooldown?`${p.nextPersuadeDay}일째 재시도`:'회유 가능'} · 침공 시 탈옥 가능</small><button data-persuade="${p.id}" ${p.cooldown?'disabled':''}>회유</button></div>`).join(''):'<p>포로 없음</p>'}</section></div>`;
  if(ui.modal==='treasure'){
    if(!sim.treasury.length)return `<div class="shade"><section class="sheet"><button class="x" data-action="close">×</button><h2>🍈 보물고</h2><p>현재 보관 중인 특별 아이템이 없습니다.</p></section></div>`;
    const items=sim.treasury.map(id=>{const it=SPECIAL_ITEMS[id];return`<button class="treasure-row ${ui.giftItem===id?'on':''}" data-gift-item="${id}"><b>${it.icon} ${it.name}</b><small>${it.desc}</small></button>`;}).join('');
    const targets=ui.giftItem?`<h3>${SPECIAL_ITEMS[ui.giftItem].name} 수여 대상</h3><div class="roster gift">${sim.characters.map(c=>`<button data-gift-char="${c.id}"><b>${c.name}</b><small>${c.hasFruit?'악마의 열매 능력자 · ':''}${c.gearName}</small></button>`).join('')}</div>`:'';
    return `<div class="shade"><section class="sheet"><button class="x" data-action="close">×</button><h2>🍈 보물고</h2><p>일반 장비는 캐릭터가 스스로 구매하고, 악마의 열매와 명검은 플레이어가 직접 수여합니다.</p>${items}${targets}</section></div>`;
  }
  if(ui.modal==='rank'){
    const r=sim.rankRequirements();
    return `<div class="shade"><section class="sheet"><button class="x" data-action="close">×</button><h2>${'★'.repeat(sim.townRank)} ${sim.townName}</h2><p>다음 ★${r.target}: 명성 ${sim.fame}/${r.fame} · 시설 ${sim.facilities.length}/${r.facilities}</p><button class="primary" data-action="rank-up" ${sim.canRankUp()?'':'disabled'}>거점 승급</button></section></div>`;
  }
  if(ui.facility){
    const f=sim.facilityAt(ui.facility),d=f&&FACILITIES[f.type];
    if(d)return `<div class="mini"><button class="x" data-action="close-mini">×</button><h3>${d.icon} ${d.name} Lv.${f.level}</h3><small>이용 ${f.uses}회 · 수입 ${f.revenue.toLocaleString()}B</small><button data-action="upgrade" ${f.level>=5?'disabled':''}>강화 ${700*f.level}B</button></div>`;
  }
  if(ui.node){
    const s=sim.settlements[ui.node];
    return `<div class="mini world-pop"><button class="x" data-action="close-mini">×</button><div class="art">${s.kind==='요새'?'🏯':s.kind==='감옥도시'?'⛓️':'🏘️'}</div><h3>${s.name}</h3><small>${V.faction(s.owner)} · 병력 ${s.troops.toLocaleString()}</small><div>${s.owner==='straw_hat'?'<button data-action="enter">들어가기</button>':`<button data-action="attack">공격</button><button data-action="scout">정찰</button>`}<button data-action="info">정보</button></div></div>`;
  }
  return '';
}

function render(){
  const scene=sim.mode==='village'?V.village(sim,ui):sim.mode==='world'?V.world(sim):sim.mode==='scout'?V.scout(sim):V.battle(sim);
  app.innerHTML=`<div class="game">${V.top(sim)}<main>${scene}</main>${V.nav(sim)}${modal()}${ui.toast?`<div class="save-toast">${ui.toast}</div>`:''}</div>`;
  bind();
}

function bind(){
  document.querySelectorAll('[data-nav]').forEach(b=>b.onclick=()=>{
    if(b.disabled)return;const n=b.dataset.nav;ui.facility=null;ui.node=null;
    if(n==='village')sim.returnToVillage();
    else if(n==='world'||n==='sortie')sim.returnToWorld();
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
  document.querySelectorAll('[data-command]').forEach(b=>b.onclick=()=>{if(issueBattleCommand(sim,b.dataset.command))render();});
  document.querySelectorAll('[data-persuade]').forEach(b=>b.onclick=()=>{notify(sim.persuade(b.dataset.persuade).msg);render();});
  document.querySelectorAll('[data-gift-item]').forEach(b=>b.onclick=()=>{ui.giftItem=b.dataset.giftItem;render();});
  document.querySelectorAll('[data-gift-char]').forEach(b=>b.onclick=()=>{const r=sim.giveTreasure(ui.giftItem,b.dataset.giftChar);if(r.ok)ui.giftItem=null;notify(r.msg);render();});
  const s=document.querySelector('#troops');if(s)s.oninput=()=>{ui.troops=+s.value;s.nextElementSibling.textContent=ui.troops;};
  document.querySelectorAll('[data-action]').forEach(b=>b.onclick=act);
}

function notify(msg){ui.toast=msg;clearTimeout(notify.t);notify.t=setTimeout(()=>{ui.toast='';render();},1500);}
function saveGame(silent=false){try{localStorage.setItem(SAVE_KEY,JSON.stringify(sim.snapshot()));if(!silent)notify('저장했습니다.');return true;}catch{if(!silent)notify('저장에 실패했습니다.');return false;}}
function finishBattleScene(){if(sim.battle?.finished)sim.battle=null;sim.returnToWorld();saveGame(true);}

function act(e){
  const a=e.currentTarget.dataset.action;
  if(a==='build')ui.modal='build';
  else if(a==='cancel-build')ui.buildType=null;
  else if(a==='rank')ui.modal='rank';
  else if(a==='close'){ui.modal=null;ui.sortie=null;ui.giftItem=null;}
  else if(a==='close-mini'){ui.facility=null;ui.node=null;}
  else if(a==='upgrade')sim.upgradeFacility(ui.facility);
  else if(a==='rank-up'){sim.rankUp();ui.modal=null;}
  else if(a==='prison')ui.modal='prison';
  else if(a==='treasure'){ui.modal='treasure';ui.giftItem=null;}
  else if(a==='save'){saveGame();}
  else if(a==='reset'){if(confirm('현재 저장을 지우고 새 게임을 시작할까요?')){localStorage.removeItem(SAVE_KEY);location.reload();}}
  else if(a==='attack'){ui.sortie=ui.node;ui.node=null;ui.chars.clear();ui.troops=Math.min(1200,sim.availableTroops());}
  else if(a==='scout'){const id=ui.node;ui.node=null;sim.startScout(id);}
  else if(a==='back-world')sim.returnToWorld();
  else if(a==='info'){const s=sim.settlements[ui.node];notify(`${s.name} · 병력 ${s.troops.toLocaleString()} · ${s.chars.map(nameOf).join(', ')||'이름 있는 캐릭터 없음'}`);}
  else if(a==='dispatch'){if(sim.dispatch(ui.sortie,[...ui.chars],ui.troops)){ui.sortie=null;ui.chars.clear();saveGame(true);}else notify('출정 편성을 확인해주세요.');}
  else if(a==='battle-view')sim.startBattle();
  else if(a==='battle-auto'){sim.autoResolveEncounter();sim.battle=null;saveGame(true);}
  else if(a==='battle-done')finishBattleScene();
  else if(a==='enter'){sim.returnToVillage();ui.node=null;}
  render();
}

sim.onChange(render);
render();
let last=performance.now(),lastPaint=0,lastAutoSave=performance.now();
function loop(now){
  sim.tick(Math.min(.1,(now-last)/1000));last=now;
  if(now-lastAutoSave>=5000&&!sim.battle&&!sim.encounter){lastAutoSave=now;saveGame(true);}
  if(now-lastPaint>=240){lastPaint=now;render();}
  requestAnimationFrame(loop);
}
requestAnimationFrame(loop);
document.addEventListener('visibilitychange',()=>{if(document.hidden&&!sim.battle&&!sim.encounter)saveGame(true);});
window.__V3__={get sim(){return sim;},render,saveGame};
