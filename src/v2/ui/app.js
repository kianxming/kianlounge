import { createWanoV2Scenario } from '../data/wano-scenario.js';
import { commitCommandPhase, advanceOneDay, beginNextCommandPhase } from '../core/engine.js';
import { serializeStrategyState, deserializeStrategyState } from '../core/save.js';
import { runAllFactionMonthlyDirectors, runDailyReactiveDirector } from '../ai/director.js';
import {
  availableOfficersAt, bestOfficerAt, commandBudget, formArmy, orderArmyMarch,
  orderDevelopment, orderRecruitTroops, orderProduction, orderTransport,
  orderScoutMission, orderDiplomacyMission, orderRecruitOfficerMission, reinforceArmy,
} from '../domain/commands.js';
import { diplomacyBetween } from '../domain/diplomacy.js';
import { shortestRoute } from '../world/graph.js';
import { assetUse, factionAsset, portraitAsset, strongholdAsset } from '../../assets.js';

const $=(s,el=document)=>el.querySelector(s);
const $$=(s,el=document)=>[...el.querySelectorAll(s)];
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const fmt=n=>Number(n||0).toLocaleString('ko-KR');
const esc=s=>String(s??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
const ACTIVE=o=>o&&!['completed','failed','cancelled'].includes(o.status);
const FACTION_FALLBACK={straw_hat:'#3d7fc1',beasts:'#a83928',kozuki:'#648f55',kurozumi:'#6e4b85',heart:'#c8a33b',kid:'#9b4e3c',big_mom:'#8b6599'};
const NODE_ART={
  base:'castle',port:'port',gate:'gate',pass:'pass',forest:'forest',junction:'junction',bridge:'junction',sea:'strait'
};
const NODE_TYPES_KO={base:'거점',port:'항구',gate:'관문',pass:'산길',forest:'숲길',junction:'길목',bridge:'다리',sea:'해로'};
const STATUS_KO={waiting:'대기',moving:'행군',battle:'전투',siege:'공성',retreating:'퇴각',stranded:'고립',destroyed:'괴멸'};
const MISSION_KO={development:'개발',troop_recruitment:'모집',food_production:'생산',transport:'수송',scout:'정찰',diplomacy:'외교',officer_recruitment:'등용',officer_transfer:'전근',army_march:'출정',reinforcement:'지원군',intercept:'요격',army_retreat:'퇴각',army_withdrawal:'철수'};
const SAVE_KEY='wano-strategy-v2-final';

let state=createWanoV2Scenario({playerFactionId:'straw_hat'});
let selected={kind:'node',id:state.factions[state.playerFactionId].capitalNodeId};
let drawer=null;
let targetMode=null;
let speed=1;
let paused=false;
let executionTimer=null;
let lastEventIndex=state.events.length;
let bannerTimer=null;
let mobilePanelOpen=false;
let showRightPanel=false;

function factionColor(fid){return state.factions?.[fid]?.color||FACTION_FALLBACK[fid]||'#8d8d8d'}
function factionName(fid){return state.factions?.[fid]?.name||fid||'중립'}
function nodeOwner(nodeId){return state.settlements?.[nodeId]?.ownerFactionId ?? state.graph.nodes?.[nodeId]?.ownerFactionId ?? null}
function nodeName(id){return state.graph.nodes?.[id]?.name||id||'길 위'}
function settlementAt(id){return state.settlements?.[id]||Object.values(state.settlements||{}).find(s=>s.nodeId===id)||null}
function playerArmies(){return Object.values(state.armies||{}).filter(a=>a.factionId===state.playerFactionId&&a.status!=='destroyed')}
function playerOfficers(){return Object.values(state.officers||{}).filter(o=>o.factionId===state.playerFactionId&&o.status!=='dead')}
function availableAt(nodeId){return availableOfficersAt(state,state.playerFactionId,nodeId)}
function phaseName(){return state.phase==='command'?'명령 단계':state.phase==='execution'?'30일 실행':'월간 보고'}
function budget(){return commandBudget(state,state.playerFactionId)}
function routeDays(a,b){return shortestRoute(state.graph,a,b)?.days??null}
function eventClass(e){
  const m=`${e.type||''} ${e.message||''}`;
  if(/함락|괴멸|사망|전쟁|공성.*시작|대규모|점령/.test(m))return 's';
  if(/전투|교전|지원|차단|휴전|동맹|포로|등용|침공|요격/.test(m))return 'a';
  return 'b';
}
function eventTitle(e){
  const m=e.message||'';
  if(/함락/.test(m))return '거점 함락'; if(/공성/.test(m))return '공성 발생'; if(/전투|교전/.test(m))return '교전 발생';
  if(/지원/.test(m))return '지원군'; if(/수송/.test(m))return '수송'; if(/휴전/.test(m))return '휴전'; if(/동맹/.test(m))return '동맹';
  if(/등용/.test(m))return '인재'; if(/정찰/.test(m))return '정찰'; if(/편성/.test(m))return '군단 편성'; if(/30일/.test(m))return '월간 실행';
  return MISSION_KO[e.type]||'전황 보고';
}
function eventColor(e){return eventClass(e)==='s'?'#d25b3e':eventClass(e)==='a'?'#d09a42':'#4c7ca0'}
function eventNodeId(e){
  const d=e.data||{}; if(d.nodeId&&state.graph.nodes[d.nodeId])return d.nodeId; if(d.destinationNodeId&&state.graph.nodes[d.destinationNodeId])return d.destinationNodeId;
  if(d.targetNodeId&&state.graph.nodes[d.targetNodeId])return d.targetNodeId; if(d.armyId&&state.armies[d.armyId])return armyPos(state.armies[d.armyId]).nodeId;
  return null;
}

function render(){
  const scroll=captureScroll();
  const app=$('#app');
  app.innerHTML=`${renderTop()}<main class="content">${renderLeft()}${renderMap()}${renderRight()}</main>${renderBottom()}${renderDrawer()}${renderReport()}<div id="toast" class="toast"></div>`;
  restoreScroll(scroll);
  bindTransient();
}
function captureScroll(){const map=$('#map-scroll'),left=$('.side-panel.left'),right=$('.side-panel.right');return{mx:map?.scrollLeft||0,my:map?.scrollTop||0,ly:left?.scrollTop||0,ry:right?.scrollTop||0}}
function restoreScroll(s){requestAnimationFrame(()=>{const map=$('#map-scroll'),left=$('.side-panel.left'),right=$('.side-panel.right');if(map){map.scrollLeft=s.mx;map.scrollTop=s.my}if(left)left.scrollTop=s.ly;if(right)right.scrollTop=s.ry})}
function renderTop(){
  const own=Object.values(state.settlements).filter(s=>s.ownerFactionId===state.playerFactionId);const money=own.reduce((n,s)=>n+s.money,0),food=own.reduce((n,s)=>n+s.food,0),troops=own.reduce((n,s)=>n+s.troops,0)+playerArmies().reduce((n,a)=>n+a.troops,0);const b=budget();
  return `<header class="topbar">
    <div class="brand"><div><div class="brand-title">와노 전란기</div><div class="brand-sub">ONE PIECE × 삼국지 전략 시뮬레이션</div></div></div>
    <div class="turnbox"><div><div class="turn-main">${state.turn}턴 · ${state.day}일째</div><div class="turn-sub">${phaseName()} · 명령 ${b.remaining}/${b.max}</div></div><div class="phase-strip"><span class="phase-pill ${state.phase==='command'?'active':''}">명령</span><span class="phase-pill ${state.phase==='execution'?'active':''}">30일</span><span class="phase-pill ${state.phase==='report'?'active':''}">보고</span></div></div>
    <div class="resources"><div class="res"><span class="res-icon">🌾</span><span><b>식량 ${fmt(food)}</b><small>거점 합계</small></span></div><div class="res"><span class="res-icon">🪙</span><span><b>자금 ${fmt(money)}</b><small>거점 합계</small></span></div><div class="res"><span class="res-icon">⚔</span><span><b>병력 ${fmt(troops)}</b><small>주둔+군단</small></span></div><div class="res"><span class="res-icon">🏯</span><span><b>거점 ${own.length}</b><small>와노 전역</small></span></div><div class="res"><span class="res-icon">📜</span><span><b>작전 ${Object.values(state.operations).filter(ACTIVE).length}</b><small>진행 중</small></span></div></div>
    <div class="top-actions"><button class="mini-btn ${paused?'active':''}" data-action="pause-exec">${paused?'▶':'Ⅱ'}</button><button class="mini-btn ${speed===1?'active':''}" data-action="speed" data-speed="1">1x</button><button class="mini-btn ${speed===2?'active':''}" data-action="speed" data-speed="2">2x</button><button class="mini-btn ${speed===4?'active':''}" data-action="speed" data-speed="4">4x</button><button class="mini-btn" data-action="save">저장</button><button class="mini-btn" data-action="load">불러오기</button><button class="mini-btn" data-action="toggle-events">전황</button></div>
  </header>`
}
function renderLeft(){
  const b=budget();const sel=selected.kind==='node'?settlementAt(selected.id):null;const army=selected.kind==='army'?state.armies[selected.id]:null;
  return `<aside class="side-panel left ${mobilePanelOpen?'open':''}">
   <section class="panel objective"><div class="panel-h"><span>현재 목표</span><span>${state.phase==='command'?'월간 명령':'전황 관찰'}</span></div><div class="panel-b"><div class="objective-title">와노의 주도권을 장악하라</div><div class="objective-desc">길목·보급·장수의 시간을 관리해 적의 거점을 무너뜨리십시오. 원작은 시작 배치만 정의합니다.</div><div class="tag-row"><span class="tag ${state.phase==='command'?'ok':'danger'}">${phaseName()}</span><span class="tag">명령력 ${b.remaining}/${b.max}</span><span class="tag">진행 작전 ${Object.values(state.operations).filter(ACTIVE).length}</span></div>${state.phase==='execution'?`<div class="exec-progress"><i style="width:${((30-state.executionDaysRemaining)/30)*100}%"></i></div>`:''}</div></section>
   ${sel?renderSettlementPanel(sel):army?renderArmyPanel(army):renderFactionPanel()}
   <section class="panel"><div class="panel-h"><span>진행 중 작전</span><span>${Object.values(state.operations).filter(ACTIVE).length}</span></div><div class="panel-b list">${renderOperationList()}</div></section>
  </aside>`
}
function renderSettlementPanel(s){const node=state.graph.nodes[s.nodeId],off=availableAt(s.nodeId);return `<section class="panel"><div class="panel-h"><span>${esc(node?.name||s.name)}</span><span style="color:${factionColor(s.ownerFactionId)}">${esc(factionName(s.ownerFactionId))}</span></div><div class="panel-b">
    <div class="statgrid"><div class="stat"><label>주둔 병력</label><b>${fmt(s.troops)}</b></div><div class="stat"><label>식량</label><b>${fmt(s.food)}</b></div><div class="stat"><label>자금</label><b>${fmt(s.money)}</b></div><div class="stat"><label>개발도</label><b>${s.development}/${s.cap}</b><div class="progress"><i style="width:${s.development/s.cap*100}%"></i></div></div><div class="stat"><label>사기</label><b>${Math.round(s.morale)}</b></div><div class="stat"><label>가용 장수</label><b>${off.length}명</b></div></div>
    <div class="tag-row">${off.slice(0,5).map(o=>`<button class="tag" data-action="select-officer" data-id="${o.id}">${esc(o.name)}</button>`).join('')||'<span class="tag danger">가용 장수 없음</span>'}</div>
    ${s.ownerFactionId===state.playerFactionId&&state.phase==='command'?`<div class="tag-row"><button class="action-btn" data-action="quick-develop" data-node="${s.nodeId}">개발</button><button class="action-btn" data-action="quick-recruit" data-node="${s.nodeId}">모집</button><button class="action-btn" data-action="quick-production" data-node="${s.nodeId}">생산</button><button class="action-btn" data-action="open-form-army" data-node="${s.nodeId}">군단 편성</button></div>`:''}
  </div></section>`}
function renderArmyPanel(a){const commander=state.officers[a.commanderId];const pos=armyPos(a);return `<section class="panel"><div class="panel-h"><span>${esc(commander?.name||a.id)} 군단</span><span>${STATUS_KO[a.status]||a.status}</span></div><div class="panel-b"><div style="display:flex;gap:10px;align-items:center"><div style="width:58px;height:58px">${assetUse(portraitAsset(a.commanderId),'portrait-svg',commander?.name||'장수')}</div><div style="flex:1"><b>${esc(commander?.name||a.commanderId)}</b><div class="tag-row"><span class="tag">병력 ${fmt(a.troops)}</span><span class="tag">사기 ${Math.round(a.morale??0)}</span><span class="tag">군량 ${Math.round(a.supplies??0)}</span></div></div></div><div class="statgrid" style="margin-top:9px"><div class="stat"><label>현재 위치</label><b>${esc(pos.label)}</b></div><div class="stat"><label>보급원</label><b>${esc(nodeName(a.supplySourceNodeId))}</b></div><div class="stat"><label>준비도</label><b>${Math.round(a.readiness??0)}</b></div><div class="stat"><label>상태</label><b>${STATUS_KO[a.status]||a.status}</b></div></div>${a.factionId===state.playerFactionId&&state.phase==='command'&&a.status==='waiting'?`<div class="tag-row"><button class="action-btn danger" data-action="target-attack" data-army="${a.id}">공격 출정</button><button class="action-btn" data-action="target-move" data-army="${a.id}">이동/지원</button><button class="action-btn" data-action="open-reinforce" data-army="${a.id}">보충</button></div>`:''}</div></section>`}
function renderFactionPanel(){const f=state.factions[state.playerFactionId];return `<section class="panel"><div class="panel-h"><span>${esc(f.name)}</span><span>세력</span></div><div class="panel-b">${assetUse(factionAsset(f.id),'faction-big',f.name)}<div class="objective-desc">거점을 선택하면 내정·군단·수송 명령을 내릴 수 있습니다. 군단을 선택한 뒤 출정을 누르면 목표 거점을 직접 지정할 수 있습니다.</div></div></section>`}
function renderOperationList(){const ops=Object.values(state.operations).filter(ACTIVE).sort((a,b)=>a.startDay-b.startDay);if(!ops.length)return '<div class="objective-desc">진행 중인 작전이 없습니다.</div>';return ops.slice(0,12).map(o=>{const actor=state.officers[o.actorIds?.[0]];return `<div class="list-item"><div><b>${MISSION_KO[o.type]||o.type} · ${esc(actor?.name||state.armies[o.armyId]?.commanderId||'부대')}</b><small>${esc(nodeName(o.originNodeId))} → ${esc(nodeName(o.destinationNodeId))}</small></div><span class="tag">${o.travelDaysRemaining??o.taskDaysRemaining??''}일</span></div>`}).join('')}

function renderMap(){return `<section class="map-wrap"><div class="map-toolbar"><button data-action="map-home">◎ 내 세력</button><button data-action="map-battles">⚔ 전투</button><button data-action="toggle-left">☰ 정보</button></div><div id="major-banner" class="major-banner"><div class="major-banner-inner"><h2></h2><p></p></div></div><div id="map-scroll" class="map-scroll"><div class="map-stage" id="map-stage">${renderRoutes()}${renderNodes()}${renderBattles()}${renderMissions()}${renderArmies()}</div></div></section>`}
function renderRoutes(){const lines=Object.values(state.graph.edges).map(e=>{const a=state.graph.nodes[e.a],b=state.graph.nodes[e.b],hot=state.hostile?.(nodeOwner(e.a),nodeOwner(e.b));return `<line class="route ${e.mode==='sea'?'sea':''} ${hot?'hot':''}" x1="${a.x}" y1="${a.y}" x2="${b.x}" y2="${b.y}"/>`}).join('');return `<svg class="map-svg" viewBox="0 0 1440 1150" preserveAspectRatio="none">${lines}</svg>`}
function renderNodes(){return Object.values(state.graph.nodes).map(n=>{const owner=nodeOwner(n.id),sett=settlementAt(n.id),isBase=!!sett,selectedNow=selected.kind==='node'&&selected.id===n.id;let art;if(isBase){art=assetUse(strongholdAsset(n.id),'node-art',n.name)}else{const key=NODE_ART[n.type]||'junction';art=`<svg class="op-art" viewBox="0 0 100 100" aria-hidden="true"><use href="./assets/v3/v2-world-art.svg#op-${key}"></use></svg>`};const troop=sett?`<small>${fmt(sett.troops)}</small>`:'';return `<div class="node ${isBase?'base':'minor'} ${selectedNow?'selected':''}" style="left:${n.x}px;top:${n.y}px;--faction:${factionColor(owner)}"><button data-action="select-node" data-id="${n.id}" aria-label="${esc(n.name)}">${isBase?`<span class="owner-ring"></span>`:''}${art}</button><div class="node-label"><b>${esc(n.name)}</b>${troop}</div></div>`}).join('')}
function armyPos(a){
  if(a.currentNodeId){const n=state.graph.nodes[a.currentNodeId];return{x:n?.x??720,y:n?.y??575,nodeId:a.currentNodeId,label:nodeName(a.currentNodeId)}}
  if(a.currentEdgeId){const e=state.graph.edges[a.currentEdgeId],op=state.operations[a.operationId];if(!e)return{x:720,y:575,label:'이동 중'};let from=e.a,to=e.b,total=e.baseDays||1,remaining=op?.edgeDaysRemaining??total;if(op?.activeRoute){const i=op.routeEdgeIndex||0;from=op.activeRoute.nodeIds[i]||from;to=op.activeRoute.nodeIds[i+1]||to;total=op.activeRoute.edgeDays[i]||total}const f=clamp(1-remaining/Math.max(1,total),0.08,.92),A=state.graph.nodes[from],B=state.graph.nodes[to];return{x:A.x+(B.x-A.x)*f,y:A.y+(B.y-A.y)*f,nodeId:null,label:`${A.name}–${B.name}`}}
  return{x:720,y:575,label:'위치 미상'}
}
function renderArmies(){return Object.values(state.armies).filter(a=>a.status!=='destroyed').map(a=>{const p=armyPos(a),o=state.officers[a.commanderId],sel=selected.kind==='army'&&selected.id===a.id;return `<div class="army ${a.status} ${sel?'selected':''}" style="left:${p.x}px;top:${p.y}px;--faction:${factionColor(a.factionId)}"><div class="army-piece">${'<i></i>'.repeat(Math.max(3,Math.min(7,Math.ceil((a.troops||1)/500))))}</div><button data-action="select-army" data-id="${a.id}"><div class="army-marker"><span class="face">${assetUse(portraitAsset(a.commanderId),'portrait-svg',o?.name||'장수')}</span><span><b>${esc(o?.name||a.commanderId)}</b><small>${fmt(a.troops)} · ${STATUS_KO[a.status]||a.status}</small></span></div></button></div>`}).join('')}
function battlePos(b){if(b.nodeId&&state.graph.nodes[b.nodeId])return state.graph.nodes[b.nodeId];if(b.edgeId&&state.graph.edges[b.edgeId]){const e=state.graph.edges[b.edgeId],a=state.graph.nodes[e.a],c=state.graph.nodes[e.b];return{x:(a.x+c.x)/2,y:(a.y+c.y)/2}}const aa=state.armies[b.attackerArmyId]||state.armies[b.sideAArmyId],p=aa?armyPos(aa):null;return p||{x:720,y:575}}
function renderBattles(){return Object.values(state.battles||{}).filter(b=>b.status==='ongoing').map(b=>{const p=battlePos(b);return `<div class="battle-swarm" style="left:${p.x}px;top:${p.y}px"></div><div class="battle-pulse" style="left:${p.x}px;top:${p.y}px"></div>`}).join('')+Object.values(state.sieges||{}).filter(s=>s.status==='ongoing').map(s=>{const n=state.graph.nodes[s.targetNodeId||s.nodeId];return n?`<div class="battle-swarm" style="left:${n.x}px;top:${n.y}px"></div><div class="battle-pulse" style="left:${n.x}px;top:${n.y}px;border-color:#ba55c8"><span></span></div>`:''}).join('')}
function missionPos(o){if(o.currentNodeId&&state.graph.nodes[o.currentNodeId])return state.graph.nodes[o.currentNodeId];if(o.currentEdgeId){const e=state.graph.edges[o.currentEdgeId],A=state.graph.nodes[e.a],B=state.graph.nodes[e.b],total=o.activeRoute?.edgeDays?.[o.routeEdgeIndex]||e.baseDays||1,f=clamp(1-(o.edgeDaysRemaining??total)/total,.1,.9);return{x:A.x+(B.x-A.x)*f,y:A.y+(B.y-A.y)*f}}return null}
function renderMissions(){return Object.values(state.operations).filter(o=>ACTIVE(o)&&!['army_march','reinforcement','intercept','army_retreat','army_withdrawal'].includes(o.type)).map(o=>{const p=missionPos(o);if(!p)return'';return `<div class="mission-dot ${o.type}" style="left:${p.x}px;top:${p.y}px" title="${MISSION_KO[o.type]||o.type}"></div>`}).join('')}
function renderRight(){const events=[...state.events].slice(-35).reverse();return `<aside class="side-panel right ${showRightPanel?'peek':''}"><section class="panel"><div class="panel-h"><span>전황 이벤트</span><span>${events.length}</span></div><div class="panel-b event-feed">${events.map(e=>`<div class="event-card ${eventClass(e)}" style="--ec:${eventColor(e)}" data-event-node="${eventNodeId(e)||''}"><div class="row"><b>${esc(eventTitle(e))}</b><time>${e.day}일</time></div><p>${esc(e.message)}</p></div>`).join('')||'<div class="objective-desc">아직 보고가 없습니다.</div>'}</div></section></aside>`}
function renderBottom(){const disabled=state.phase!=='command';const cmds=[['target-attack','⚔','출정'],['open-transport','🛒','수송'],['open-scout','🔭','정찰'],['open-diplomacy','🤝','외교'],['open-recruit-officer','🎖','등용'],['quick-develop-selected','🔨','개발'],['quick-recruit-selected','🚩','모집'],['quick-production-selected','🌾','생산'],['open-form-selected','👥','편성'],['open-reinforce-selected','➕','보충']];return `<footer class="bottom-bar">${cmds.map(([a,i,t])=>`<button class="cmd" data-action="${a}" ${disabled?'disabled':''}><i>${i}</i><span>${t}</span></button>`).join('')}<button class="commit" data-action="commit-month" ${state.phase==='execution'?'disabled':''}>${state.phase==='command'?'30일 실행':state.phase==='report'?'다음 달':'실행 중'}</button></footer>`}
function renderDrawer(){if(!drawer)return'<aside class="drawer"></aside>';return `<aside class="drawer open"><div class="drawer-h"><b>${esc(drawer.title)}</b><button class="close" data-action="close-drawer">닫기</button></div><div class="drawer-b">${drawer.html}</div></aside>`}
function renderReport(){if(state.phase!=='report')return'<div class="report-overlay"></div>';const r=state.reports.at(-1),ev=state.events.filter(e=>e.day>state.day-30);return `<div class="report-overlay show"><article class="report"><h1>${r?.turn||state.turn}턴 월간 보고</h1><div class="objective-desc">${state.day-29}일 ~ ${state.day}일, 와노 전역의 30일 실행 결과입니다.</div><div class="report-summary"><div class="stat"><label>완료 작전</label><b>${r?.completedOperationIds?.length||0}</b></div><div class="stat"><label>진행 작전</label><b>${r?.activeOperationIds?.length||0}</b></div><div class="stat"><label>전투</label><b>${r?.ongoingBattleIds?.length||0}</b></div><div class="stat"><label>공성</label><b>${r?.ongoingSiegeIds?.length||0}</b></div></div><div class="panel"><div class="panel-h">주요 사건</div><div class="panel-b report-events event-feed">${ev.slice(-18).reverse().map(e=>`<div class="event-card ${eventClass(e)}"><div class="row"><b>${esc(eventTitle(e))}</b><time>${e.day}일</time></div><p>${esc(e.message)}</p></div>`).join('')}</div></div><button class="commit" data-action="next-month">다음 명령 단계</button></article></div>`}

function openFormArmy(nodeId){const officers=availableAt(nodeId),s=settlementAt(nodeId);drawer={title:`${nodeName(nodeId)} · 군단 편성`,html:`<div class="formgrid"><div class="field full"><label>지휘관</label><select id="form-commander">${officers.map(o=>`<option value="${o.id}">${esc(o.name)} · 무력 ${o.martial} / 매력 ${o.charisma}</option>`).join('')}</select></div><div class="field"><label>병력</label><input id="form-troops" type="number" min="500" step="100" value="${Math.min(1800,Math.max(500,(s?.troops||1500)-700))}"></div><div class="field"><label>군량 포인트</label><input id="form-supply" type="number" min="20" step="10" value="140"></div><div class="field full"><button class="action-btn danger" data-action="submit-form-army" data-node="${nodeId}">군단 편성</button></div></div>`};render()}
function openTransport(nodeId){const sources=settlementAt(nodeId);if(!sources||sources.ownerFactionId!==state.playerFactionId){toast('내 거점을 먼저 선택하세요.');return}const officers=availableAt(nodeId),targets=Object.values(state.settlements).filter(s=>s.ownerFactionId===state.playerFactionId&&s.nodeId!==nodeId);drawer={title:`${nodeName(nodeId)} · 수송대 편성`,html:`<div class="formgrid"><div class="field full"><label>수송 지휘관</label><select id="transport-officer">${officers.map(o=>`<option value="${o.id}">${esc(o.name)}</option>`).join('')}</select></div><div class="field full"><label>목적지</label><select id="transport-target">${targets.map(t=>`<option value="${t.nodeId}">${esc(nodeName(t.nodeId))} · ${routeDays(nodeId,t.nodeId)}일</option>`).join('')}</select></div><div class="field"><label>식량</label><input id="transport-food" type="number" min="0" step="100" value="800"></div><div class="field"><label>병력</label><input id="transport-troops" type="number" min="0" step="100" value="0"></div><div class="field"><label>자금</label><input id="transport-money" type="number" min="0" step="100" value="0"></div><div class="field full"><button class="action-btn" data-action="submit-transport" data-node="${nodeId}">수송 명령</button></div></div>`};render()}
function openScout(nodeId){const base=nodeId&&settlementAt(nodeId)?.ownerFactionId===state.playerFactionId?nodeId:state.factions[state.playerFactionId].capitalNodeId,officers=availableAt(base),targets=Object.values(state.graph.nodes).filter(n=>n.id!==base);drawer={title:'정찰 임무',html:`<div class="formgrid"><div class="field full"><label>정찰 담당</label><select id="scout-officer">${officers.map(o=>`<option value="${o.id}">${esc(o.name)} · 지력 ${o.intelligence}</option>`).join('')}</select></div><div class="field full"><label>정찰 목표</label><select id="scout-target">${targets.map(n=>`<option value="${n.id}">${esc(n.name)} · ${routeDays(base,n.id)}일 거리</option>`).join('')}</select></div><div class="field full"><button class="action-btn" data-action="submit-scout" data-node="${base}">파견</button></div></div>`};render()}
function openDiplomacy(){const base=state.factions[state.playerFactionId].capitalNodeId,officers=availableAt(base),targets=Object.values(state.factions).filter(f=>f.id!==state.playerFactionId);drawer={title:'외교 · 사절 파견',html:`<div class="formgrid"><div class="field full"><label>사절</label><select id="dip-officer">${officers.map(o=>`<option value="${o.id}">${esc(o.name)} · 정치 ${o.politics}</option>`).join('')}</select></div><div class="field full"><label>대상 세력</label><select id="dip-target">${targets.map(f=>{const r=diplomacyBetween(state,state.playerFactionId,f.id);return`<option value="${f.id}">${esc(f.name)} · ${r.status} / 신뢰 ${r.trust}</option>`}).join('')}</select></div><div class="field full"><label>제안</label><select id="dip-proposal"><option value="truce">휴전</option><option value="alliance">동맹 제안</option><option value="aid">원조 협상</option></select></div><div class="field full"><button class="action-btn" data-action="submit-diplomacy" data-node="${base}">사절 파견</button></div></div><div class="panel" style="margin-top:12px"><div class="panel-h">외교 현황</div><div class="panel-b list">${targets.map(f=>{const r=diplomacyBetween(state,state.playerFactionId,f.id);return`<div class="list-item"><b>${esc(f.name)}</b><span class="tag ${r.status==='war'?'danger':r.status==='alliance'?'ok':''}">${r.status} · ${r.trust}</span></div>`}).join('')}</div></div>`};render()}
function openRecruitOfficer(){const base=state.factions[state.playerFactionId].capitalNodeId,officers=availableAt(base),targets=Object.values(state.officers).filter(o=>o.factionId!==state.playerFactionId&&o.status==='available'&&o.assignment?.kind==='base').sort((a,b)=>(a.loyalty??70)-(b.loyalty??70)).slice(0,40);drawer={title:'인재 등용',html:`<div class="formgrid"><div class="field full"><label>설득 담당</label><select id="recruit-officer">${officers.map(o=>`<option value="${o.id}">${esc(o.name)} · 매력 ${o.charisma}</option>`).join('')}</select></div><div class="field full"><label>대상 장수</label><select id="recruit-target">${targets.map(o=>`<option value="${o.id}">${esc(o.name)} · ${esc(factionName(o.factionId))} · 충성 ${o.loyalty??70} · 위치 ${esc(nodeName(o.assignment.nodeId))}</option>`).join('')}</select></div><div class="field full"><button class="action-btn" data-action="submit-recruit-officer" data-node="${base}">등용 사절 파견</button></div></div>`};render()}
function openReinforce(armyId){const a=state.armies[armyId];drawer={title:'군단 보충',html:`<div class="formgrid"><div class="field"><label>보충 병력</label><input id="reinforce-troops" type="number" min="0" step="100" value="500"></div><div class="field"><label>군량</label><input id="reinforce-supply" type="number" min="0" step="10" value="60"></div><div class="field full"><button class="action-btn" data-action="submit-reinforce" data-army="${armyId}">보충 실행</button></div></div>`};render()}

function bindTransient(){
  // one global delegated listener is installed once below; only UI-state restoration belongs here.
  if(!window.__wanoInitialFocus){window.__wanoInitialFocus=true;requestAnimationFrame(()=>focusNode(state.factions[state.playerFactionId].capitalNodeId,false))}
}
function toast(msg){const el=$('#toast');if(!el)return;el.textContent=msg;el.classList.add('show');clearTimeout(el._t);el._t=setTimeout(()=>el.classList.remove('show'),1700)}
function showBanner(e){const el=$('#major-banner');if(!el)return;$('.major-banner h2',el).textContent=eventTitle(e);$('.major-banner p',el).textContent=e.message;el.classList.add('show');clearTimeout(bannerTimer);bannerTimer=setTimeout(()=>el.classList.remove('show'),2600);const n=eventNodeId(e);if(n)focusNode(n,true)}
function focusNode(id,smooth=true){const n=state.graph.nodes[id],map=$('#map-scroll');if(!n||!map)return;map.scrollTo({left:clamp(n.x-map.clientWidth/2,0,1440-map.clientWidth),top:clamp(n.y-map.clientHeight/2,0,1150-map.clientHeight),behavior:smooth?'smooth':'auto'})}
function focusBattles(){const b=Object.values(state.battles).find(x=>x.status==='ongoing')||Object.values(state.sieges).find(x=>x.status==='ongoing');if(!b){toast('현재 진행 중인 전투가 없습니다.');return}const p=battlePos(b),map=$('#map-scroll');map?.scrollTo({left:clamp(p.x-map.clientWidth/2,0,1440-map.clientWidth),top:clamp(p.y-map.clientHeight/2,0,1150-map.clientHeight),behavior:'smooth'})}
function processNewEvents(){const fresh=state.events.slice(lastEventIndex);lastEventIndex=state.events.length;return fresh.filter(e=>eventClass(e)!=='b').at(-1)||null}

async function runExecution(){
  if(state.phase!=='command')return;
  const before=state.events.length;
  commitCommandPhase(state,{strategicAI:s=>runAllFactionMonthlyDirectors(s,{playerFactionId:s.playerFactionId})});
  const opening=state.events.slice(before).filter(e=>eventClass(e)!=='b').at(-1)||null;
  lastEventIndex=state.events.length;render();if(opening)requestAnimationFrame(()=>showBanner(opening));
  const tick=()=>{if(state.phase!=='execution'){executionTimer=null;render();return}if(paused){executionTimer=setTimeout(tick,220);return}try{advanceOneDay(state,{reactiveAI:s=>runDailyReactiveDirector(s,{playerFactionId:s.playerFactionId})});const important=processNewEvents();render();if(important)requestAnimationFrame(()=>showBanner(important))}catch(err){console.error(err);toast(`실행 오류: ${err.message}`);paused=true;return}const delay=speed===4?90:speed===2?180:360;executionTimer=setTimeout(tick,delay)};tick()
}

function issueQuick(kind,nodeId){const officerRole=kind==='develop'?'politics':kind==='recruit'?'recruitment':'logistics',o=bestOfficerAt(state,state.playerFactionId,nodeId,officerRole);if(!o){toast('사용 가능한 장수가 없습니다.');return}let op=null;if(kind==='develop')op=orderDevelopment(state,{factionId:state.playerFactionId,nodeId,officerId:o.id});if(kind==='recruit')op=orderRecruitTroops(state,{factionId:state.playerFactionId,nodeId,officerId:o.id,amount:500});if(kind==='production')op=orderProduction(state,{factionId:state.playerFactionId,nodeId,officerId:o.id});if(op){render();requestAnimationFrame(()=>toast(`${o.name}: ${kind==='develop'?'개발':kind==='recruit'?'모집':'생산'} 명령 접수`))}else toast('자원·장수·명령력을 확인하세요.')}
function selectedNode(){return selected.kind==='node'?selected.id:selected.kind==='army'?state.armies[selected.id]?.currentNodeId:null}
function selectedArmy(){return selected.kind==='army'?state.armies[selected.id]:playerArmies().find(a=>a.status==='waiting')||null}

async function handleAction(btn){const a=btn.dataset.action,id=btn.dataset.id,node=btn.dataset.node,armyId=btn.dataset.army;
  if(a==='select-node'){selected={kind:'node',id};mobilePanelOpen=true;if(targetMode){const army=state.armies[targetMode.armyId];if(!army){targetMode=null;return}const owner=nodeOwner(id),objective=targetMode.kind==='attack'&&owner!==state.playerFactionId?'attack':'move';const op=orderArmyMarch(state,{factionId:state.playerFactionId,armyId:army.id,destinationNodeId:id,objective});if(op){toast(`${state.officers[army.commanderId]?.name||'군단'} → ${nodeName(id)} · ETA ${op.route?.days||op.travelDaysRemaining}일`);targetMode=null}else toast('출정할 수 없습니다. 군단 상태와 명령력을 확인하세요.')}render();return}
  if(a==='select-army'){selected={kind:'army',id};mobilePanelOpen=true;render();return}
  if(a==='select-officer'){const o=state.officers[id];drawer={title:o.name,html:`<div style="display:flex;gap:14px;align-items:center"><div style="width:90px">${assetUse(portraitAsset(o.id),'portrait-svg',o.name)}</div><div><h2>${esc(o.name)}</h2><div class="tag-row"><span class="tag">무력 ${o.martial}</span><span class="tag">지력 ${o.intelligence}</span><span class="tag">정치 ${o.politics}</span><span class="tag">매력 ${o.charisma}</span></div></div></div><div class="panel" style="margin-top:12px"><div class="panel-h">특성</div><div class="panel-b tag-row">${(o.traits||[]).map(t=>`<span class="tag">${esc(t)}</span>`).join('')||'-'}</div></div>`};render();return}
  if(a==='pause-exec'){if(state.phase==='execution'){paused=!paused;toast(paused?'실행 일시정지':'실행 재개');render()}return} if(a==='speed'){speed=Number(btn.dataset.speed)||1;toast(`실행 속도 ${speed}x`);render();return} if(a==='toggle-left'){mobilePanelOpen=!mobilePanelOpen;render();return} if(a==='toggle-events'){showRightPanel=!showRightPanel;render();return} if(a==='map-home'){focusNode(state.factions[state.playerFactionId].capitalNodeId);return} if(a==='map-battles'){focusBattles();return}
  if(a==='close-drawer'){drawer=null;render();return}
  if(a==='save'){try{localStorage.setItem(SAVE_KEY,serializeStrategyState(state));toast('V2 캠페인을 저장했습니다.')}catch(e){toast(`저장 실패: ${e.message}`)}return}
  if(a==='load'){try{const raw=localStorage.getItem(SAVE_KEY);if(!raw)return toast('저장 데이터가 없습니다.');state=deserializeStrategyState(raw);lastEventIndex=state.events.length;selected={kind:'node',id:state.factions[state.playerFactionId].capitalNodeId};render();requestAnimationFrame(()=>toast('저장된 캠페인을 불러왔습니다.'))}catch(e){toast(`불러오기 실패: ${e.message}`)}return}
  if(a==='commit-month'){if(state.phase==='command')runExecution();else if(state.phase==='report'){beginNextCommandPhase(state);render()}return} if(a==='next-month'){beginNextCommandPhase(state);render();return}
  if(state.phase!=='command')return toast('명령은 월간 명령 단계에서만 내릴 수 있습니다.');
  if(a==='quick-develop')return issueQuick('develop',node); if(a==='quick-recruit')return issueQuick('recruit',node); if(a==='quick-production')return issueQuick('production',node);
  if(a==='quick-develop-selected'){const n=selectedNode();return n?issueQuick('develop',n):toast('내 거점을 선택하세요.')} if(a==='quick-recruit-selected'){const n=selectedNode();return n?issueQuick('recruit',n):toast('내 거점을 선택하세요.')}
  if(a==='open-form-army')return openFormArmy(node); if(a==='open-form-selected'){const n=selectedNode();return n?openFormArmy(n):toast('내 거점을 선택하세요.')}
  if(a==='submit-form-army'){const commanderId=$('#form-commander')?.value,troops=Number($('#form-troops')?.value),supplyPoints=Number($('#form-supply')?.value);const ar=formArmy(state,{factionId:state.playerFactionId,nodeId:node,commanderId,troops,supplyPoints});if(ar){selected={kind:'army',id:ar.id};drawer=null;render();requestAnimationFrame(()=>toast('군단이 편성되었습니다.'))}else toast('병력·식량·지휘관·명령력을 확인하세요.');return}
  if(a==='target-attack'||a==='target-move'){
  const ar=armyId?state.armies[armyId]:selectedArmy();
  if(!ar)return toast('먼저 대기 중인 군단을 선택하거나 편성하세요.');
  if(ar.status!=='waiting')return toast('대기 중인 군단만 새 이동 명령을 받을 수 있습니다.');
  targetMode={kind:a==='target-attack'?'attack':'move',armyId:ar.id};drawer=null;mobilePanelOpen=false;render();
  requestAnimationFrame(()=>toast(a==='target-attack'?'공격할 거점을 지도에서 선택하세요.':'이동할 거점을 지도에서 선택하세요.'));return;
}
if(a==='open-transport'){const n=selectedNode();return n?openTransport(n):toast('내 거점을 선택하세요.');}
if(a==='open-scout'){return openScout(selectedNode());}
if(a==='open-diplomacy'){return openDiplomacy();}
if(a==='open-recruit-officer'){return openRecruitOfficer();}
if(a==='quick-production-selected'){const n=selectedNode();return n?issueQuick('production',n):toast('내 거점을 선택하세요.');}
if(a==='open-reinforce'||a==='open-reinforce-selected'){const ar=armyId?state.armies[armyId]:selectedArmy();return ar?openReinforce(ar.id):toast('보충할 대기 군단을 선택하세요.');}
if(a==='submit-transport'){
  const commanderId=$('#transport-officer')?.value,destinationNodeId=$('#transport-target')?.value;
  const cargo={food:Number($('#transport-food')?.value||0),troops:Number($('#transport-troops')?.value||0),money:Number($('#transport-money')?.value||0)};
  const op=orderTransport(state,{factionId:state.playerFactionId,originNodeId:node,destinationNodeId,commanderId,cargo});
  if(op){drawer=null;render();requestAnimationFrame(()=>toast(`수송대 출발 · ${nodeName(destinationNodeId)}`))}else toast('수송 조건·자원·명령력을 확인하세요.');return;
}
if(a==='submit-scout'){
  const officerId=$('#scout-officer')?.value,targetNodeId=$('#scout-target')?.value;
  const op=orderScoutMission(state,{factionId:state.playerFactionId,originNodeId:node,targetNodeId,officerId});
  if(op){drawer=null;render();requestAnimationFrame(()=>toast(`정찰대 파견 · ${nodeName(targetNodeId)}`))}else toast('정찰 담당·경로·명령력을 확인하세요.');return;
}
if(a==='submit-diplomacy'){
  const officerId=$('#dip-officer')?.value,targetFactionId=$('#dip-target')?.value,proposal=$('#dip-proposal')?.value||'truce';
  const op=orderDiplomacyMission(state,{factionId:state.playerFactionId,targetFactionId,originNodeId:node,officerId,proposal});
  if(op){drawer=null;render();requestAnimationFrame(()=>toast(`사절 파견 · ${factionName(targetFactionId)}`))}else toast('외교 담당·대상·명령력을 확인하세요.');return;
}
if(a==='submit-recruit-officer'){
  const officerId=$('#recruit-officer')?.value,targetOfficerId=$('#recruit-target')?.value;
  const op=orderRecruitOfficerMission(state,{factionId:state.playerFactionId,originNodeId:node,officerId,targetOfficerId});
  if(op){drawer=null;render();requestAnimationFrame(()=>toast(`등용 사절 파견 · ${state.officers[targetOfficerId]?.name||'대상 장수'}`))}else toast('등용 담당·대상·명령력을 확인하세요.');return;
}
if(a==='submit-reinforce'){
  const troops=Number($('#reinforce-troops')?.value||0),supplyPoints=Number($('#reinforce-supply')?.value||0);
  const ok=reinforceArmy(state,{factionId:state.playerFactionId,armyId,troops,supplyPoints});
  if(ok){drawer=null;render();requestAnimationFrame(()=>toast('군단 보충을 완료했습니다.'))}else toast('주둔 자원·군단 상태·명령력을 확인하세요.');return;
}
}
function actionError(err){console.error(err);toast(`명령 오류: ${err?.message||err}`)}
document.addEventListener('click',e=>{const btn=e.target.closest('[data-action]');if(btn){if(btn.disabled)return;Promise.resolve(handleAction(btn)).catch(actionError);return}const card=e.target.closest('[data-event-node]');if(card?.dataset.eventNode)focusNode(card.dataset.eventNode);});
document.addEventListener('keydown',e=>{if(e.key==='Escape'){if(targetMode){targetMode=null;render();requestAnimationFrame(()=>toast('목표 선택을 취소했습니다.'));return}if(drawer){drawer=null;render();return}if(mobilePanelOpen||showRightPanel){mobilePanelOpen=false;showRightPanel=false;render();}}});
window.addEventListener('resize',()=>{const map=$('#map-scroll');if(map&&window.innerWidth<760)map.style.scrollBehavior='auto'});
render();
