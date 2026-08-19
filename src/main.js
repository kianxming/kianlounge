import { createInitialState, deserialize, event, serialize } from './world.js';
import { step, tickManualBattle } from './simulation.js';
import { render } from './view.js';
import { bind } from './ui.js';
const root=document.querySelector('#app');let state=createInitialState(20260819),selected=null,selectedTactical=null,last=performance.now(),worldAcc=0,tacticalAcc=0;const saveKey='wano-sandbox-save-v2';const getState=()=>state,setSelected=v=>selected=v,getSelectedTactical=()=>selectedTactical,setSelectedTactical=v=>selectedTactical=v;
function draw(){root.innerHTML=render(state,selected,selectedTactical);bind(root,getState,setSelected,getSelectedTactical,setSelectedTactical,draw,save,load)}
function save(){localStorage.setItem(saveKey,serialize(state));event(state,'World state saved to this browser.','system');draw()}
function load(){try{const raw=localStorage.getItem(saveKey);if(!raw)throw Error('No compatible local save found.');state=deserialize(raw);selected=null;selectedTactical=null;event(state,'World state loaded.','system');draw()}catch(err){event(state,err.message,'warning');draw()}}
function frame(now){const dt=Math.min(250,now-last);last=now;if(!state.paused){worldAcc+=dt*state.speed;tacticalAcc+=dt*state.speed;while(worldAcc>=500){step(state,30);worldAcc-=500}while(tacticalAcc>=250&&state.activeManualBattleId){tickManualBattle(state,.25);tacticalAcc-=250}if(dt>0&&Math.floor(now/180)!==Math.floor((now-dt)/180))draw()}requestAnimationFrame(frame)}
draw();requestAnimationFrame(frame);
