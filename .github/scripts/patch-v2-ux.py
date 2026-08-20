from pathlib import Path
import re

APP = Path('src/v2/ui/app.js')
CSS = Path('v2.css')
TEST = Path('e2e/v2-final.spec.mjs')

app = APP.read_text(encoding='utf-8')


def replace_once(old: str, new: str, label: str) -> None:
    global app
    if old not in app:
        raise SystemExit(f'missing UX patch anchor: {label}')
    app = app.replace(old, new, 1)


# Map viewport state. Mobile starts zoomed out enough to survey the battlefield.
replace_once(
    "const SAVE_KEY='wano-strategy-v2-final';",
    "const SAVE_KEY='wano-strategy-v2-final';\nconst MAP_W=1440,MAP_H=1150,MAP_ZOOM_MIN=.45,MAP_ZOOM_MAX=1.4;",
    'map constants',
)
replace_once(
    "let showRightPanel=false;",
    "let showRightPanel=false;\nlet mapZoom=window.innerWidth<=760?.58:1;\nlet selectedBattleId=null;\nlet mapInteracting=false;",
    'map state',
)

# Remove the invented objective card. Phase/budget already exist in the top bar.
objective_pattern = re.compile(
    r"\n   <section class=\"panel objective\"><div class=\"panel-h\"><span>현재 목표</span>.*?</section>\n   \$\{sel\?",
    re.S,
)
app, count = objective_pattern.subn("\n   ${sel?", app, count=1)
if count != 1:
    raise SystemExit('failed to remove invented objective card')

# Map: explicit zoom controls, persistent target instruction and battle HUD.
render_map_pattern = re.compile(r"function renderMap\(\)\{return `.*?`}\n", re.S)
render_map_new = r'''function renderMap(){const targetText=targetMode?(targetMode.kind==='attack'?'공격 목표를 선택하세요':'이동 목표를 선택하세요'):'';return `<section class="map-wrap ${targetMode?'targeting':''}"><div class="map-toolbar"><button data-action="map-zoom-out" aria-label="지도 축소">−</button><button id="map-zoom-label" data-action="map-zoom-reset" aria-label="지도 배율 초기화">${Math.round(mapZoom*100)}%</button><button data-action="map-zoom-in" aria-label="지도 확대">＋</button><button data-action="map-home">◎ 본거지</button><button data-action="map-battles">⚔ 전투</button><button data-action="toggle-left">☰ 정보</button></div>${targetMode?`<div class="target-hint"><b>${targetText}</b><span>빛나는 거점 전체가 터치 영역입니다.</span><button data-action="cancel-target">취소</button></div>`:''}${renderBattleHud()}<div id="major-banner" class="major-banner"><div class="major-banner-inner"><h2></h2><p></p></div></div><div id="map-scroll" class="map-scroll"><div id="map-space" class="map-space" style="width:${Math.round(MAP_W*mapZoom)}px;height:${Math.round(MAP_H*mapZoom)}px"><div class="map-stage" id="map-stage" style="transform:scale(${mapZoom})">${renderRoutes()}${renderNodes()}${renderBattles()}${renderMissions()}${renderArmies()}</div></div></div></section>`}
'''
app, count = render_map_pattern.subn(render_map_new, app, count=1)
if count != 1:
    raise SystemExit('failed to replace renderMap')

# Make the whole visible node (icon + label + padding) a single native button.
render_nodes_pattern = re.compile(r"function renderNodes\(\)\{return Object\.values\(state\.graph\.nodes\).*?\}\n", re.S)
render_nodes_new = r'''function renderNodes(){return Object.values(state.graph.nodes).map(n=>{const owner=nodeOwner(n.id),sett=settlementAt(n.id),isBase=!!sett,selectedNow=selected.kind==='node'&&selected.id===n.id,targetArmy=targetMode?state.armies[targetMode.armyId]:null,targetOk=!!(targetArmy&&targetArmy.currentNodeId!==n.id&&routeDays(targetArmy.currentNodeId,n.id)!=null);let art;if(isBase){art=assetUse(strongholdAsset(n.id),'node-art',n.name)}else{const key=NODE_ART[n.type]||'junction';art=`<svg class="op-art" viewBox="0 0 100 100" aria-hidden="true"><use href="./assets/v3/v2-world-art.svg#op-${key}"></use></svg>`};const troop=sett?`<small>${fmt(sett.troops)}</small>`:'';return `<button class="node ${isBase?'base':'minor'} ${selectedNow?'selected':''} ${targetMode?(targetOk?'target-valid':'target-invalid'):''}" style="left:${n.x}px;top:${n.y}px;--faction:${factionColor(owner)}" data-action="select-node" data-id="${n.id}" aria-label="${esc(n.name)}">${isBase?`<span class="owner-ring"></span>`:''}${art}<span class="node-label"><b>${esc(n.name)}</b>${troop}</span></button>`}).join('')}
'''
app, count = render_nodes_pattern.subn(render_nodes_new, app, count=1)
if count != 1:
    raise SystemExit('failed to replace renderNodes')

# Battle presentation: clickable marker + live compact HUD with losses and troop/morale state.
render_battles_pattern = re.compile(r"function renderBattles\(\)\{return Object\.values\(state\.battles\|\|\{\}\).*?\}\n", re.S)
battle_new = r'''function battleSideSummary(ids=[]){const armies=ids.map(id=>state.armies[id]).filter(Boolean),troops=armies.reduce((n,a)=>n+(a.troops||0),0),morale=armies.length?Math.round(armies.reduce((n,a)=>n+(a.morale??100),0)/armies.length):0,commander=state.officers[armies[0]?.commanderId];return{armies,troops,morale,name:commander?.name||factionName(armies[0]?.factionId)}}
function renderBattleHud(){const b=selectedBattleId&&state.battles?.[selectedBattleId];if(!b||b.status!=='ongoing')return'';const a=battleSideSummary(b.attackerArmyIds),d=battleSideSummary(b.defenderArmyIds),last=b.dailyHistory?.at(-1),where=b.location?.kind==='node'?nodeName(b.location.id):'가도 교전';return `<div class="battle-hud"><button class="battle-close" data-action="close-battle" aria-label="전투 정보 닫기">×</button><div class="battle-hud-title">⚔ ${esc(where)} · 교전 ${b.elapsedBattleDays||0}일째</div><div class="battle-vs"><div><b>${esc(a.name)}</b><strong>${fmt(a.troops)}</strong><span>사기 ${a.morale}</span></div><i>VS</i><div><b>${esc(d.name)}</b><strong>${fmt(d.troops)}</strong><span>사기 ${d.morale}</span></div></div>${last?`<div class="battle-loss">오늘 손실 · ${esc(a.name)} -${fmt(last.attackerLoss)} / ${esc(d.name)} -${fmt(last.defenderLoss)}</div>`:'<div class="battle-loss">접촉 직후 · 첫 교전 결과 대기</div>'}</div>`}
function renderBattles(){return Object.values(state.battles||{}).filter(b=>b.status==='ongoing').map(b=>{const p=battlePos(b),a=battleSideSummary(b.attackerArmyIds),d=battleSideSummary(b.defenderArmyIds);return `<button class="battle-focus ${selectedBattleId===b.id?'selected':''}" data-action="select-battle" data-id="${b.id}" style="left:${p.x}px;top:${p.y}px" aria-label="전투 ${esc(a.name)} 대 ${esc(d.name)}"><span class="battle-clash">⚔</span><span class="battle-mini">${fmt(a.troops)} : ${fmt(d.troops)}</span></button><div class="battle-pulse" style="left:${p.x}px;top:${p.y}px"></div>`}).join('')+Object.values(state.sieges||{}).filter(s=>s.status==='ongoing').map(s=>{const n=state.graph.nodes[s.targetNodeId||s.nodeId];return n?`<div class="battle-swarm" style="left:${n.x}px;top:${n.y}px"></div><div class="battle-pulse" style="left:${n.x}px;top:${n.y}px;border-color:#ba55c8"><span></span></div>`:''}).join('')}
'''
app, count = render_battles_pattern.subn(battle_new, app, count=1)
if count != 1:
    raise SystemExit('failed to replace renderBattles')

# Important events may announce themselves, but never steal the player's camera.
replace_once(
    "function showBanner(e){const el=$('#major-banner');if(!el)return;$('.major-banner h2',el).textContent=eventTitle(e);$('.major-banner p',el).textContent=e.message;el.classList.add('show');clearTimeout(bannerTimer);bannerTimer=setTimeout(()=>el.classList.remove('show'),2600);const n=eventNodeId(e);if(n)focusNode(n,true)}",
    "function showBanner(e){const el=$('#major-banner');if(!el)return;$('.major-banner h2',el).textContent=eventTitle(e);$('.major-banner p',el).textContent=e.message;el.classList.add('show');clearTimeout(bannerTimer);bannerTimer=setTimeout(()=>el.classList.remove('show'),2600)}",
    'camera stealing banner',
)

# Zoom preserves the current world-space center. Focus actions only happen on explicit user commands.
replace_once(
    "function focusNode(id,smooth=true){const n=state.graph.nodes[id],map=$('#map-scroll');if(!n||!map)return;map.scrollTo({left:clamp(n.x-map.clientWidth/2,0,1440-map.clientWidth),top:clamp(n.y-map.clientHeight/2,0,1150-map.clientHeight),behavior:smooth?'smooth':'auto'})}",
    "function focusNode(id,smooth=true){const n=state.graph.nodes[id],map=$('#map-scroll');if(!n||!map)return;map.scrollTo({left:clamp(n.x*mapZoom-map.clientWidth/2,0,MAP_W*mapZoom-map.clientWidth),top:clamp(n.y*mapZoom-map.clientHeight/2,0,MAP_H*mapZoom-map.clientHeight),behavior:smooth?'smooth':'auto'})}",
    'zoom-aware focusNode',
)
replace_once(
    "function focusBattles(){const b=Object.values(state.battles).find(x=>x.status==='ongoing')||Object.values(state.sieges).find(x=>x.status==='ongoing');if(!b){toast('현재 진행 중인 전투가 없습니다.');return}const p=battlePos(b),map=$('#map-scroll');map?.scrollTo({left:clamp(p.x-map.clientWidth/2,0,1440-map.clientWidth),top:clamp(p.y-map.clientHeight/2,0,1150-map.clientHeight),behavior:'smooth'})}",
    "function setMapZoom(next){const map=$('#map-scroll'),stage=$('#map-stage'),space=$('#map-space'),old=mapZoom;next=clamp(next,MAP_ZOOM_MIN,MAP_ZOOM_MAX);if(Math.abs(next-old)<.001)return;const worldX=map?(map.scrollLeft+map.clientWidth/2)/old:MAP_W/2,worldY=map?(map.scrollTop+map.clientHeight/2)/old:MAP_H/2;mapZoom=next;if(space){space.style.width=`${Math.round(MAP_W*mapZoom)}px`;space.style.height=`${Math.round(MAP_H*mapZoom)}px`}if(stage)stage.style.transform=`scale(${mapZoom})`;const label=$('#map-zoom-label');if(label)label.textContent=`${Math.round(mapZoom*100)}%`;if(map){map.scrollLeft=clamp(worldX*mapZoom-map.clientWidth/2,0,MAP_W*mapZoom-map.clientWidth);map.scrollTop=clamp(worldY*mapZoom-map.clientHeight/2,0,MAP_H*mapZoom-map.clientHeight)}}\nfunction focusBattles(){const b=Object.values(state.battles).find(x=>x.status==='ongoing'),siege=!b&&Object.values(state.sieges).find(x=>x.status==='ongoing');if(!b&&!siege){toast('현재 진행 중인 전투가 없습니다.');return}if(b)selectedBattleId=b.id;render();requestAnimationFrame(()=>{const p=b?battlePos(b):state.graph.nodes[siege.targetNodeId||siege.nodeId],map=$('#map-scroll');if(!p||!map)return;map.scrollTo({left:clamp(p.x*mapZoom-map.clientWidth/2,0,MAP_W*mapZoom-map.clientWidth),top:clamp(p.y*mapZoom-map.clientHeight/2,0,MAP_H*mapZoom-map.clientHeight),behavior:'smooth'})})}",
    'zoom and battle focus',
)

# Do not replace the map DOM while the user is actively touching/scrolling it.
replace_once(
    "try{advanceOneDay(state,{reactiveAI:s=>runDailyReactiveDirector(s,{playerFactionId:s.playerFactionId})});const important=processNewEvents();render();if(important)requestAnimationFrame(()=>showBanner(important))}",
    "try{advanceOneDay(state,{reactiveAI:s=>runDailyReactiveDirector(s,{playerFactionId:s.playerFactionId})});const important=processNewEvents();if(!mapInteracting)render();if(important&&!mapInteracting)requestAnimationFrame(()=>showBanner(important))}",
    'execution interaction lock',
)

# Selection on phone stays map-first. Target selection now gives durable visual feedback and a real success toast after re-render.
select_pattern = re.compile(
    r"  if\(a==='select-node'\)\{.*?\n  if\(a==='select-army'\)\{selected=\{kind:'army',id\};mobilePanelOpen=true;render\(\);return\}",
    re.S,
)
select_new = r'''  if(a==='select-node'){
    if(targetMode){const army=state.armies[targetMode.armyId];if(!army){targetMode=null;render();return}const owner=nodeOwner(id),objective=targetMode.kind==='attack'&&owner!==state.playerFactionId?'attack':'move';const op=orderArmyMarch(state,{factionId:state.playerFactionId,armyId:army.id,destinationNodeId:id,objective});if(op){selected={kind:'army',id:army.id};targetMode=null;mobilePanelOpen=false;render();requestAnimationFrame(()=>toast(`${state.officers[army.commanderId]?.name||'군단'} → ${nodeName(id)} · ETA ${op.route?.days||op.travelDaysRemaining}일`))}else{render();requestAnimationFrame(()=>toast('출정할 수 없습니다. 경로·군단 상태·명령력을 확인하세요.'))}return}
    selected={kind:'node',id};mobilePanelOpen=false;render();return;
  }
  if(a==='select-army'){selected={kind:'army',id};mobilePanelOpen=false;render();return}'''
app, count = select_pattern.subn(select_new, app, count=1)
if count != 1:
    raise SystemExit('failed to replace node/army selection')

# New explicit map/battle actions.
replace_once(
    "if(a==='pause-exec'){if(state.phase==='execution'){paused=!paused;toast(paused?'실행 일시정지':'실행 재개');render()}return} if(a==='speed'){speed=Number(btn.dataset.speed)||1;toast(`실행 속도 ${speed}x`);render();return} if(a==='toggle-left'){mobilePanelOpen=!mobilePanelOpen;render();return} if(a==='toggle-events'){showRightPanel=!showRightPanel;render();return} if(a==='map-home'){focusNode(state.factions[state.playerFactionId].capitalNodeId);return} if(a==='map-battles'){focusBattles();return}",
    "if(a==='pause-exec'){if(state.phase==='execution'){paused=!paused;toast(paused?'실행 일시정지':'실행 재개');render()}return} if(a==='speed'){speed=Number(btn.dataset.speed)||1;toast(`실행 속도 ${speed}x`);render();return} if(a==='toggle-left'){mobilePanelOpen=!mobilePanelOpen;render();return} if(a==='toggle-events'){showRightPanel=!showRightPanel;render();return} if(a==='map-zoom-in'){setMapZoom(mapZoom+.12);return} if(a==='map-zoom-out'){setMapZoom(mapZoom-.12);return} if(a==='map-zoom-reset'){setMapZoom(window.innerWidth<=760?.58:1);return} if(a==='map-home'){focusNode(state.factions[state.playerFactionId].capitalNodeId);return} if(a==='map-battles'){focusBattles();return} if(a==='cancel-target'){targetMode=null;render();return} if(a==='select-battle'){selectedBattleId=id;render();requestAnimationFrame(()=>{const b=state.battles[id],p=b&&battlePos(b),map=$('#map-scroll');if(p&&map)map.scrollTo({left:clamp(p.x*mapZoom-map.clientWidth/2,0,MAP_W*mapZoom-map.clientWidth),top:clamp(p.y*mapZoom-map.clientHeight/2,0,MAP_H*mapZoom-map.clientHeight),behavior:'smooth'})});return} if(a==='close-battle'){selectedBattleId=null;render();return}",
    'new map actions',
)

# Keep target mode visible until a valid destination is chosen.
replace_once(
    "targetMode={kind:a==='target-attack'?'attack':'move',armyId:ar.id};drawer=null;mobilePanelOpen=false;render();\n  requestAnimationFrame(()=>toast(a==='target-attack'?'공격할 거점을 지도에서 선택하세요.':'이동할 거점을 지도에서 선택하세요.'));return;",
    "targetMode={kind:a==='target-attack'?'attack':'move',armyId:ar.id};drawer=null;mobilePanelOpen=false;render();return;",
    'target mode persistent hint',
)

# Touching the map temporarily suppresses execution re-renders so iOS scrolling is not interrupted.
replace_once(
    "document.addEventListener('click',e=>{const btn=e.target.closest('[data-action]');if(btn){if(btn.disabled)return;Promise.resolve(handleAction(btn)).catch(actionError);return}const card=e.target.closest('[data-event-node]');if(card?.dataset.eventNode)focusNode(card.dataset.eventNode);});",
    "document.addEventListener('click',e=>{const btn=e.target.closest('[data-action]');if(btn){if(btn.disabled)return;Promise.resolve(handleAction(btn)).catch(actionError);return}const card=e.target.closest('[data-event-node]');if(card?.dataset.eventNode)focusNode(card.dataset.eventNode);});\ndocument.addEventListener('touchstart',e=>{if(e.target.closest('#map-scroll'))mapInteracting=true},{passive:true});\nconst endMapTouch=e=>{if(!mapInteracting)return;if(e.target?.closest?.('#map-scroll')||!e.touches?.length)setTimeout(()=>{mapInteracting=false},140)};\ndocument.addEventListener('touchend',endMapTouch,{passive:true});\ndocument.addEventListener('touchcancel',endMapTouch,{passive:true});",
    'map touch interaction lock',
)

APP.write_text(app, encoding='utf-8')

css = CSS.read_text(encoding='utf-8')
marker = '/* V2 map-first mobile UX correction. */'
if marker not in css:
    css += r'''

/* V2 map-first mobile UX correction. */
.map-space{position:relative;flex:none}
.node{border:0;background:transparent;color:inherit;padding:10px 12px;cursor:pointer;pointer-events:auto;min-width:78px;min-height:82px}
.node .node-label{display:block;pointer-events:none}
.node.target-valid{z-index:10;filter:drop-shadow(0 0 10px #ffd25a)}
.node.target-valid:before{content:"";position:absolute;inset:3px;border:2px solid #f3c85f;border-radius:16px;animation:targetGlow .8s ease-in-out infinite alternate;background:#f3c85f14}
.node.target-invalid{opacity:.32;filter:grayscale(.65)}
@keyframes targetGlow{from{box-shadow:0 0 3px #f4ca5b55}to{box-shadow:0 0 18px #f4ca5bdd}}
.target-hint{position:absolute;z-index:18;left:50%;top:10px;transform:translateX(-50%);display:flex;align-items:center;gap:9px;max-width:calc(100% - 210px);padding:8px 10px;border:1px solid #d3a448;border-radius:9px;background:#171109ed;box-shadow:0 8px 24px #000a;color:#f6d68d}
.target-hint span{font-size:10px;color:#c7b98f}.target-hint button{border:1px solid #805a29;background:#27180e;border-radius:6px;padding:5px 8px;color:#f6d68d}
.map-toolbar button{min-width:38px}
.battle-focus{position:absolute;z-index:9;transform:translate(-50%,-50%);display:flex;flex-direction:column;align-items:center;gap:2px;border:1px solid #e06a43;border-radius:999px;padding:5px 9px;background:#2b0e0ce8;color:#ffd2a5;box-shadow:0 0 18px #e14d3199;animation:battleBob .75s ease-in-out infinite alternate}
.battle-focus.selected{border-color:#ffd270;box-shadow:0 0 28px #ffb849cc}.battle-clash{font-size:20px;line-height:1}.battle-mini{font-size:9px;font-weight:800;white-space:nowrap}
@keyframes battleBob{to{transform:translate(-50%,calc(-50% - 4px))}}
.map-wrap.targeting .battle-focus{pointer-events:none;opacity:.45}
.battle-hud{position:absolute;z-index:17;right:12px;top:12px;width:min(310px,calc(100% - 24px));padding:10px 12px;border:1px solid #a95536;border-radius:10px;background:#100c0bea;box-shadow:0 12px 30px #000c;backdrop-filter:blur(8px)}
.battle-close{position:absolute;right:7px;top:6px;border:0;background:transparent;font-size:20px;color:#bcae91}.battle-hud-title{font-weight:900;color:#f0c27f;padding-right:24px;margin-bottom:8px}.battle-vs{display:grid;grid-template-columns:1fr auto 1fr;gap:8px;align-items:center}.battle-vs>div{display:flex;flex-direction:column;gap:2px}.battle-vs>div:last-child{text-align:right}.battle-vs b{font-size:11px;color:#d9cdb4}.battle-vs strong{font-size:18px;color:#fff0c5}.battle-vs span{font-size:9px;color:#a8a391}.battle-vs i{font-style:normal;font-weight:900;color:#d05d3d}.battle-loss{margin-top:7px;padding-top:6px;border-top:1px solid #4b3427;font-size:10px;color:#d5aa8e}

@media(max-width:760px){
  :root{--top:46px;--bottom:56px}
  .app-shell{grid-template-rows:var(--top) minmax(0,1fr) var(--bottom)}
  .topbar{padding:3px 5px;gap:4px}.brand-title{font-size:14px}.turnbox{padding:3px 5px}.turn-main{font-size:9px}.top-actions{gap:3px}.top-actions .mini-btn{padding:5px 6px;font-size:9px}
  .side-panel.left{bottom:var(--bottom);height:min(34dvh,300px);padding:6px;transform:translateY(105%);border-radius:12px 12px 0 0}
  .side-panel.left.open{transform:none}.side-panel.left:before{display:none}
  .side-panel.left .panel{margin-bottom:6px}.side-panel.left .panel-h{padding:6px 8px;font-size:11px}.side-panel.left .panel-b{padding:7px}.side-panel.left .stat{padding:5px 6px}.side-panel.left .stat b{font-size:11px}
  .map-stage{width:1440px;height:1150px}
  .map-toolbar{top:6px;left:6px;right:6px;gap:3px;overflow-x:auto;max-width:calc(100% - 12px);scrollbar-width:none}.map-toolbar::-webkit-scrollbar{display:none}.map-toolbar button{padding:6px 7px;font-size:10px;min-width:34px;flex:0 0 auto}
  .target-hint{left:6px;right:6px;top:42px;transform:none;max-width:none;padding:7px 8px;gap:6px}.target-hint b{font-size:11px}.target-hint span{display:none}
  .node{padding:9px 11px;min-width:70px;min-height:72px}.node.base .node-art{width:68px;height:80px}.node .op-art{width:46px;height:46px}.node-label{font-size:8px;margin-top:-4px;padding:3px 5px}
  .bottom-bar{padding:4px 5px;gap:3px}.cmd{min-width:54px;height:47px;padding:3px 2px}.cmd i{font-size:14px}.cmd span{font-size:8px}.commit{min-width:78px;font-size:10px;padding:4px 7px}
  .battle-hud{top:auto;right:6px;left:6px;bottom:6px;width:auto;padding:8px 10px}.battle-hud-title{font-size:11px;margin-bottom:5px}.battle-vs strong{font-size:14px}.battle-loss{font-size:9px}
  .battle-focus{padding:4px 7px}.battle-clash{font-size:17px}.battle-mini{font-size:8px}
  .major-banner{top:43px;width:82%}.major-banner-inner{padding:6px 9px}.major-banner h2{font-size:14px}.major-banner p{font-size:9px}
}
'''
    CSS.write_text(css, encoding='utf-8')

# Replace the old permissive E2E with checks that match actual player experience.
TEST.write_text(r'''import { test, expect } from '@playwright/test';

test.describe('Wano Strategy Core V2 player experience',()=>{
  test('map-first monthly loop, real target selection, camera stability and save/load', async ({page},testInfo)=>{
    const errors=[];
    page.on('pageerror',e=>errors.push(e.message));
    page.on('console',m=>{ if(m.type()==='error') errors.push(m.text()) });
    const phone=testInfo.project.name.includes('iphone');
    await page.goto('/v2.html');
    await expect(page.getByText('와노 전란기').first()).toBeVisible();
    await expect(page.getByText('와노의 주도권을 장악하라')).toHaveCount(0);
    const kibi=page.getByRole('button',{name:'키비 주둔지',exact:true});
    await expect(kibi).toBeVisible();
    await kibi.click();
    if(phone){
      await expect(page.locator('.side-panel.left')).not.toHaveClass(/open/);
      await page.locator('[data-action="toggle-left"]').click();
      await expect(page.locator('.side-panel.left')).toHaveClass(/open/);
    }
    await expect(page.getByText('주둔 병력')).toBeAttached();
    await page.locator('[data-action="open-form-army"]').click();
    await expect(page.getByText('군단 편성').last()).toBeVisible();
    await page.locator('#form-troops').fill('1200');
    await page.locator('#form-supply').fill('120');
    await page.locator('[data-action="submit-form-army"]').click();
    await expect(page.getByText(/군단이 편성되었습니다/)).toBeVisible();

    await page.locator('[data-action="target-attack"]').first().click();
    await expect(page.locator('.target-hint')).toBeVisible();
    const bakura=page.getByRole('button',{name:'바쿠라',exact:true});
    await expect(bakura).toHaveClass(/target-valid/);
    await bakura.click();
    await expect(page.locator('.target-hint')).toHaveCount(0);
    await expect(page.getByText(/바쿠라.*ETA|ETA.*일/).first()).toBeVisible();
    await expect(page.locator('.list-item').filter({hasText:'바쿠라'}).first()).toBeAttached();

    await page.locator('[data-action="save"]').click();
    await expect(page.getByText('V2 캠페인을 저장했습니다.')).toBeVisible();

    const map=page.locator('#map-scroll');
    await map.evaluate(el=>{el.scrollLeft=Math.min(180,el.scrollWidth-el.clientWidth);el.scrollTop=Math.min(160,el.scrollHeight-el.clientHeight)});
    const before=await map.evaluate(el=>({x:el.scrollLeft,y:el.scrollTop}));
    await page.locator('[data-action="commit-month"]').click();
    await page.waitForTimeout(850);
    const during=await map.evaluate(el=>({x:el.scrollLeft,y:el.scrollTop}));
    expect(Math.abs(during.x-before.x)).toBeLessThanOrEqual(3);
    expect(Math.abs(during.y-before.y)).toBeLessThanOrEqual(3);

    await page.locator('[data-action="speed"][data-speed="4"]').click();
    const report=page.locator('.report-overlay.show');
    await expect(report).toBeVisible({timeout:20000});
    await expect(report.getByText(/월간 보고/).first()).toBeVisible();
    await page.locator('[data-action="next-month"]').click();
    await expect(page.getByText('2턴 · 30일째')).toBeVisible();

    await page.locator('[data-action="load"]').click();
    await expect(page.getByText('저장된 캠페인을 불러왔습니다.')).toBeVisible();
    await expect(page.getByText('1턴 · 0일째')).toBeVisible();
    expect(errors).toEqual([]);
  });

  test('iphone map zooms and selection does not auto-cover the battlefield', async ({page},testInfo)=>{
    test.skip(!testInfo.project.name.includes('iphone'));
    await page.goto('/v2.html');
    const map=page.locator('#map-scroll'),space=page.locator('#map-space');
    const before=await space.evaluate(el=>el.getBoundingClientRect().width);
    await page.locator('[data-action="map-zoom-in"]').click();
    const after=await space.evaluate(el=>el.getBoundingClientRect().width);
    expect(after).toBeGreaterThan(before+100);

    await page.getByRole('button',{name:'키비 주둔지',exact:true}).tap();
    await expect(page.locator('.side-panel.left')).not.toHaveClass(/open/);
    await expect(map).toBeVisible();
    await page.locator('[data-action="toggle-left"]').tap();
    await expect(page.locator('.side-panel.left')).toHaveClass(/open/);
    await page.locator('[data-action="toggle-left"]').tap();
    await expect(page.locator('.side-panel.left')).not.toHaveClass(/open/);
  });
});
''', encoding='utf-8')
