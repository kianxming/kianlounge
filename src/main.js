import { createInitialState, deserialize, event, serialize } from './world.js';
import { step, tickManualBattle } from './simulation.js';
import { render } from './view.js';
import { bind } from './ui.js';

const root=document.querySelector('#app');
let state=createInitialState(20260819);
state.version='1.0.0';
state.uiNotice={text:'와노 전란기 v1에 오신 것을 환영합니다. 지도에서 거점을 한 번 클릭해 명령을 시작하세요.',tone:'info',stamp:Date.now()};
let selected={type:'stronghold',id:'kibi_camp'};
let selectedTactical=null;
let last=performance.now(),worldAcc=0,tacticalAcc=0,lastAutoDraw=0;
const saveKey='wano-sandbox-save-v1';

const getState=()=>state;
const setSelected=v=>{selected=v};
const getSelectedTactical=()=>selectedTactical;
const setSelectedTactical=v=>{selectedTactical=v};

function draw(){
  root.innerHTML=render(state,selected,selectedTactical);
  bind(root,getState,setSelected,getSelectedTactical,setSelectedTactical,draw,save,load);
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
    state.version='1.0.0';
    selected={type:'stronghold',id:'kibi_camp'};
    selectedTactical=null;
    event(state,'World state loaded.','system');
    state.uiNotice={text:'저장된 세계 상태를 불러왔습니다.',tone:'success',stamp:Date.now()};
  }catch(err){
    state.uiNotice={text:err.message,tone:'warning',stamp:Date.now()};
  }
  draw();
}

function userEditing(){
  const a=document.activeElement;
  return a && root.contains(a) && ['INPUT','SELECT','TEXTAREA'].includes(a.tagName);
}

function frame(now){
  const dt=Math.min(250,now-last);last=now;
  let changed=false;
  if(!state.paused){
    worldAcc+=dt*state.speed;
    tacticalAcc+=dt*state.speed;
    while(worldAcc>=500){step(state,30);worldAcc-=500;changed=true}
    while(tacticalAcc>=250&&state.activeManualBattleId){tickManualBattle(state,.25);tacticalAcc-=250;changed=true}
  }
  // 자동 갱신은 입력 중 DOM을 교체하지 않는다. 클릭/폼 입력 안정성을 우선한다.
  if(changed&&!userEditing()&&now-lastAutoDraw>450){draw();lastAutoDraw=now}
  requestAnimationFrame(frame);
}

draw();
requestAnimationFrame(frame);
