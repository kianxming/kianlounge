import { createInitialState, deserialize, event, serialize } from './world.js';
import { step } from './simulation.js';
import { render } from './view.js';
import { bind } from './ui.js';

const root=document.querySelector('#app');
let state=createInitialState(20260819),selected=null,last=performance.now(),acc=0;
const saveKey='wano-sandbox-save-v1';
const getState=()=>state;
const setSelected=v=>{selected=v};
function draw(){root.innerHTML=render(state,selected);bind(root,getState,setSelected,draw,save,load)}
function save(){localStorage.setItem(saveKey,serialize(state));event(state,'World state saved to this browser.','system');draw()}
function load(){try{const raw=localStorage.getItem(saveKey);if(!raw)throw Error('No local save found.');state=deserialize(raw);selected=null;event(state,'World state loaded.','system');draw()}catch(err){event(state,err.message,'warning');draw()}}
function frame(now){const dt=Math.min(250,now-last);last=now;if(!state.paused){acc+=dt*state.speed;while(acc>=500){step(state,30);acc-=500}if(dt>0&&Math.floor(now/250)!==Math.floor((now-dt)/250))draw()}requestAnimationFrame(frame)}
draw();requestAnimationFrame(frame);
