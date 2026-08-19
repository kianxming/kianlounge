import { createArmy, createTransport, develop, disband, moveArmy, recruit, setPlayerFaction } from './world.js';

const num=(form,name)=>Number(new FormData(form).get(name)||0);
const val=(form,name)=>String(new FormData(form).get(name)||'');

export function bind(root,getState,setSelected,rerender,save,load){
 root.querySelectorAll('[data-select]').forEach(el=>el.addEventListener('click',()=>{setSelected({type:el.dataset.select,id:el.dataset.id});rerender()}));
 root.querySelector('[data-action="pause"]')?.addEventListener('click',()=>{getState().paused=!getState().paused;rerender()});
 root.querySelectorAll('[data-action="speed"]').forEach(el=>el.addEventListener('click',()=>{const s=getState();s.paused=false;s.speed=Number(el.dataset.speed);rerender()}));
 root.querySelector('[data-action="save"]')?.addEventListener('click',save);
 root.querySelector('[data-action="load"]')?.addEventListener('click',load);
 root.querySelector('#player-faction')?.addEventListener('change',e=>{setPlayerFaction(getState(),e.target.value);setSelected(null);rerender()});
 root.querySelectorAll('[data-action="develop"]').forEach(el=>el.addEventListener('click',()=>{develop(getState(),el.dataset.id);rerender()}));
 root.querySelectorAll('[data-action="recruit"]').forEach(el=>el.addEventListener('click',()=>{recruit(getState(),el.dataset.id,500);rerender()}));
 root.querySelectorAll('[data-action="disband"]').forEach(el=>el.addEventListener('click',()=>{const loc=getState().armies[el.dataset.id]?.location;if(disband(getState(),el.dataset.id))setSelected({type:'stronghold',id:loc});rerender()}));
 root.querySelector('form[data-form="army"]')?.addEventListener('submit',e=>{e.preventDefault();const f=e.currentTarget,id=createArmy(getState(),{origin:f.dataset.origin,destination:val(f,'destination'),commanderId:val(f,'commander'),deputyId:val(f,'deputy')||null,troops:num(f,'troops'),food:num(f,'food')});if(id)setSelected({type:'army',id});rerender()});
 root.querySelector('form[data-form="transport"]')?.addEventListener('submit',e=>{e.preventDefault();const f=e.currentTarget,id=createTransport(getState(),{origin:f.dataset.origin,destination:val(f,'destination'),commanderId:val(f,'commander'),cargo:{money:num(f,'money'),food:num(f,'food'),troops:num(f,'troops')}});if(id)setSelected({type:'transport',id});rerender()});
 root.querySelector('form[data-form="move-army"]')?.addEventListener('submit',e=>{e.preventDefault();moveArmy(getState(),e.currentTarget.dataset.id,val(e.currentTarget,'destination'));rerender()});
}
