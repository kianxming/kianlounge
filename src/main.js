import { createInitialState, deserialize, event, serialize } from './world.js';
import { step, tickManualBattle } from './simulation.js';
import { render } from './view.js';
import { bind } from './ui.js';
import { koreanizeDynamicDOM } from './koreanize-dom.js';
import { installMapHitTargets } from './hit-targets.js';

const root=document.querySelector('#app');
let state=createInitialState(20260819);
state.tacticalSpeed=1;
state.uiNotice={text:'와노 전란기 v1.1 플레이어빌리티 패스입니다. 지도에서 거점을 한 번 탭해 명령을 시작하세요.',tone:'info',stamp:Date.now()};
let selected={type:'stronghold',id:'kibi_camp'};
let selectedTactical=null;
let last=performance.now(),worldAcc=0,tacticalAcc=0,lastAutoDraw=0;
const saveKey='wano-sandbox-save-v1';

const getState=()=>state;
const setSelected=v=>{selected=v};
const getSelectedTactical=()=>selectedTactical;
const setSelectedTactical=v=>{selectedTactical=v};

function captureScrollState(){
  const pick=(selector,axis='top')=>{
    const el=root.querySelector(selector);if(!el)return null;
    return axis==='left'?el.scrollLeft:el.scrollTop;
  };
  return {
    x:window.scrollX,
    y:window.scrollY,
    context:pick('.context'),
    dock:pick('.dock-scroll','left'),
    actions:pick('.top-actions','left'),
    mapX:pick('.map-wrap','left')
  };
}

function restoreScrollState(pos){
  if(!pos)return;
  const apply=()=>{
    window.scrollTo(pos.x,pos.y);
    const context=root.querySelector('.context');if(context&&pos.context!==null)context.scrollTop=pos.context;
    const dock=root.querySelector('.dock-scroll');if(dock&&pos.dock!==null)dock.scrollLeft=pos.dock;
    const actions=root.querySelector('.top-actions');if(actions&&pos.actions!==null)actions.scrollLeft=pos.actions;
    const map=root.querySelector('.map-wrap');if(map&&pos.mapX!==null)map.scrollLeft=pos.mapX;
  };
  apply();
  requestAnimationFrame(apply);
}

function draw({preserveScroll=false}={}){
  const scroll=preserveScroll?captureScrollState():null;
  root.innerHTML=render(state,selected,selectedTactical);
  installMapHitTargets(root);
  koreanizeDynamicDOM(root,state);
  bind(root,getState,setSelected,getSelectedTactical,setSelectedTactical,draw,save,load);
  if(scroll)restoreScrollState(scroll);
}

function save(){
  localStorage.setItem(saveKey,serialize(state));
  event(state,'World state saved to this browser.','system');
  state.uiNotice={text:'현재 세계 상태를 이 브라우저에 저장했습니다.',tone:'success',stamp:Date.now()};
  draw();
}

function load(){
  try{
    const raw=localStorage.getItem(saveKey);
    if(!raw)throw Error('저장된 v1 세이브가 없습니다.');
    state=deserialize(raw);
    if(!Number.isFinite(state.tacticalSpeed))state.tacticalSpeed=1;
    selected={type:'stronghold',id:'kibi_camp'};
    selectedTactical=null;
    event(state,'World state loaded.','system');
    state.uiNotice={text:'저장된 세계 상태를 불러왔습니다.',tone:'success',stamp:Date.now()};
  }catch(err){
    state.uiNotice={text:err.message==='Incompatible or invalid save data.'?'저장 데이터가 현재 게임 상태와 호환되지 않습니다.':err.message,tone:'warning',stamp:Date.now()};
  }
  draw();
}

// pointerdown → click → submit 사이에는 자동 렌더가 DOM을 교체하지 못하게 한다.
const holdInteraction=()=>{root.dataset.interactionUntil=String(performance.now()+1200)};
const holdNavigation=()=>{root.dataset.interactionUntil=String(performance.now()+4000)};
root.addEventListener('pointerdown',holdInteraction,true);
root.addEventListener('pointermove',holdInteraction,true);
root.addEventListener('keydown',holdInteraction,true);
root.addEventListener('submit',holdInteraction,true);
root.addEventListener('scroll',holdNavigation,true);
window.addEventListener('scroll',holdNavigation,{passive:true});

function userEditing(){
  const interactionLocked=Number(root.dataset.interactionUntil||0)>performance.now();
  if(interactionLocked)return true;
  const a=document.activeElement;
  return a&&root.contains(a)&&['INPUT','SELECT','TEXTAREA'].includes(a.tagName);
}

function frame(now){
  const dt=Math.min(250,now-last);last=now;
  let changed=false;
  if(!state.paused){
    // 전략 시간은 1x/2x/3x를 사용한다.
    worldAcc+=dt*state.speed;
    // 수동 전술은 별도 시간축이다. 전략 3x가 전술에 중복 적용되지 않는다.
    tacticalAcc+=dt*(state.tacticalSpeed||1);
    while(worldAcc>=500){step(state,30);worldAcc-=500;changed=true}
    while(tacticalAcc>=250&&state.activeManualBattleId){tickManualBattle(state,.25);tacticalAcc-=250;changed=true}
  }
  if(changed&&!userEditing()&&now-lastAutoDraw>900){draw({preserveScroll:true});lastAutoDraw=now}
  requestAnimationFrame(frame);
}

draw();
requestAnimationFrame(frame);