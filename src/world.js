import { BASE_TRAVEL_MINUTES, DEFAULT_PLAYER_FACTION, FACTIONS, GAME_VERSION, OFFICERS, ROUTES, STRONGHOLDS } from './data.js';
const clone=v=>JSON.parse(JSON.stringify(v));
export const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
export const faction=id=>FACTIONS.find(f=>f.id===id);
export const neighbors=id=>ROUTES.flatMap(r=>r.a===id?[r.b]:r.b===id?[r.a]:[]);
export function path(start,goal){if(start===goal)return[start];const q=[[start]],seen=new Set([start]);while(q.length){const p=q.shift(),cur=p.at(-1);for(const n of neighbors(cur)){if(seen.has(n))continue;const np=[...p,n];if(n===goal)return np;seen.add(n);q.push(np)}}return null}
export function createInitialState(seed=1337){
 const strongholds=Object.fromEntries(STRONGHOLDS.map(s=>[s.id,{...clone(s),morale:100}]));
 const first=f=>STRONGHOLDS.find(s=>s.owner===f)?.id??STRONGHOLDS[0].id;
 const officers=Object.fromEntries(OFFICERS.map(o=>[o.id,{...clone(o),status:'available',location:first(o.faction),assignedUnitId:null}]));
 return{version:GAME_VERSION,seed,rngState:seed>>>0,elapsedMinutes:0,speed:1,paused:false,playerFaction:DEFAULT_PLAYER_FACTION,strongholds,officers,armies:{},transports:{},battles:{},nextIds:{army:1,transport:1,battle:1},aiCooldownMinutes:0,eventFeed:[{t:0,type:'world',text:'Wano sandbox initialized. Canon defines the starting state only.'}],stats:{battlesResolved:0,ownershipChanges:0,aiOrders:0}};
}
export function setPlayerFaction(s,id){if(!faction(id))return false;s.playerFaction=id;event(s,`Player faction changed to ${faction(id).short}.`,'system');return true}
export const available=(s,f,loc)=>Object.values(s.officers).filter(o=>o.faction===f&&o.location===loc&&o.status==='available');
export function command(o){if(!o)return 40;const bonus=(o.traits||[]).reduce((n,t)=>n+({'Natural Leader':8,Commander:10,'Grand Commander':16,Strategist:7,Logistician:4}[t]||0),0);return clamp(o.charisma*.46+o.martial*.22+o.intelligence*.2+o.politics*.12+bonus,1,120)}
export function travel(s,a,b){const x=s.strongholds[a],y=s.strongholds[b];return Math.round(BASE_TRAVEL_MINUTES+Math.hypot(x.x-y.x,x.y-y.y)*7)}
export function develop(s,id,actor=s.playerFaction){const h=s.strongholds[id];if(!h||h.owner!==actor||h.money<300||h.development>=h.cap)return false;h.money-=300;h.development=Math.min(h.cap,h.development+3);event(s,`${h.name} development increased to ${h.development}/${h.cap}.`,'economy');return true}
export function recruit(s,id,amount=500,actor=s.playerFaction){const h=s.strongholds[id],n=Math.max(100,Math.floor(amount/100)*100),mc=Math.round(n*.7),fc=Math.round(n*.5);if(!h||h.owner!==actor||h.money<mc||h.food<fc)return false;h.money-=mc;h.food-=fc;h.troops+=n;event(s,`${h.name} recruited ${n.toLocaleString()} troops.`,'military');return true}
function assign(s,id,unit){const o=s.officers[id];o.status='deployed';o.assignedUnitId=unit}
export function release(s,id,loc,status='available'){const o=s.officers[id];if(!o)return;o.location=loc;o.status=status;o.assignedUnitId=null}
export function createArmy(s,{factionId=s.playerFaction,origin,destination,commanderId,deputyId=null,troops=1000,food=500}){
 const h=s.strongholds[origin],c=s.officers[commanderId],d=deputyId?s.officers[deputyId]:null,p=path(origin,destination),t=Math.max(100,Math.floor(troops/100)*100),f=Math.max(0,Math.floor(food/100)*100);
 if(!h||h.owner!==factionId||!c||c.faction!==factionId||c.status!=='available'||c.location!==origin||!p||p.length<2||h.troops<t||h.food<f||deputyId===commanderId)return null;
 if(d&& (d.faction!==factionId||d.status!=='available'||d.location!==origin))return null;
 h.troops-=t;h.food-=f;const id=`army_${s.nextIds.army++}`;s.armies[id]={id,factionId,commanderId,deputyId,troops:t,food:f,morale:100,location:origin,destination,path:p,legIndex:0,legElapsed:0,legDuration:travel(s,p[0],p[1]),status:'moving'};assign(s,commanderId,id);if(d)assign(s,deputyId,id);event(s,`${c.name} formed an army of ${t.toLocaleString()} at ${h.name}.`,'military');return id;
}
export function createTransport(s,{factionId=s.playerFaction,origin,destination,commanderId,cargo={}}){
 const h=s.strongholds[origin],c=s.officers[commanderId],p=path(origin,destination),norm=k=>Math.max(0,Math.floor(Number(cargo[k]||0)/100)*100),load={money:norm('money'),food:norm('food'),troops:norm('troops'),prisoners:clone(cargo.prisoners||[]),devilFruits:clone(cargo.devilFruits||[])};
 if(!h||h.owner!==factionId||!c||c.faction!==factionId||c.status!=='available'||c.location!==origin||!p||p.length<2||h.money<load.money||h.food<load.food||h.troops<load.troops)return null;
 h.money-=load.money;h.food-=load.food;h.troops-=load.troops;const id=`transport_${s.nextIds.transport++}`;s.transports[id]={id,factionId,commanderId,cargo:load,location:origin,destination,path:p,legIndex:0,legElapsed:0,legDuration:travel(s,p[0],p[1]),status:'moving'};assign(s,commanderId,id);event(s,`${c.name} departed ${h.name} with a transport bound for ${s.strongholds[destination].name}.`,'logistics');return id;
}
export function moveArmy(s,id,destination){const a=s.armies[id],p=a?path(a.location,destination):null;if(!a||a.status==='battle'||!p||p.length<2)return false;Object.assign(a,{destination,path:p,legIndex:0,legElapsed:0,legDuration:travel(s,p[0],p[1]),status:'moving'});event(s,`${s.officers[a.commanderId].name}'s army is moving toward ${s.strongholds[destination].name}.`,'military');return true}
export function disband(s,id){const a=s.armies[id],h=a?s.strongholds[a.location]:null;if(!a||!h||h.owner!==a.factionId||a.status!=='waiting')return false;h.troops+=a.troops;h.food+=a.food;release(s,a.commanderId,a.location);if(a.deputyId)release(s,a.deputyId,a.location);delete s.armies[id];event(s,`Army disbanded into ${h.name}'s garrison.`,'military');return true}
export function event(s,text,type='world'){s.eventFeed.unshift({t:s.elapsedMinutes,type,text});s.eventFeed=s.eventFeed.slice(0,80)}
export function rng(s){let x=s.rngState||1;x^=x<<13;x^=x>>>17;x^=x<<5;s.rngState=x>>>0;return s.rngState/4294967296}
export function worldTime(m){const d=Math.floor(m/1440)+1,x=m%1440;return`Wano Day ${d} · ${String(Math.floor(x/60)).padStart(2,'0')}:${String(x%60).padStart(2,'0')}`}
export function unitPosition(s,u){if(u.status!=='moving'){const h=s.strongholds[u.location];return{x:h.x,y:h.y}}const a=s.strongholds[u.path[u.legIndex]],b=s.strongholds[u.path[u.legIndex+1]],p=clamp(u.legElapsed/u.legDuration,0,1);return{x:a.x+(b.x-a.x)*p,y:a.y+(b.y-a.y)*p}}
export const eta=u=>u.status==='moving'?Math.max(0,Math.round(u.legDuration-u.legElapsed)):0;
export const serialize=s=>JSON.stringify(s);
export function deserialize(raw){const s=JSON.parse(raw);if(!s||s.version!==GAME_VERSION||!s.strongholds||!s.officers)throw Error('Incompatible or invalid save data.');return s}
