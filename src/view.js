import { FACTIONS, ROUTES } from './data.js';
import { available, eta, faction, unitPosition, worldTime } from './world.js';

const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const fmt=n=>Math.max(0,Math.round(n||0)).toLocaleString();
const option=(v,label,selected=false)=>`<option value="${esc(v)}" ${selected?'selected':''}>${esc(label)}</option>`;
const facOptions=s=>FACTIONS.map(f=>option(f.id,f.short,f.id===s.playerFaction)).join('');
const targetOptions=(s,origin)=>Object.values(s.strongholds).filter(h=>h.id!==origin).map(h=>option(h.id,h.name)).join('');
const officerOptions=(list,blank='Select officer')=>`${option('',blank)}${list.map(o=>option(o.id,o.name)).join('')}`;

function topBar(s){
 const speed=x=>`<button class="speed ${!s.paused&&s.speed===x?'active':''}" data-action="speed" data-speed="${x}">${x}x</button>`;
 return `<header class="topbar">
   <div class="brand"><span class="eyebrow">STRATEGIC SANDBOX</span><strong>WANO // WAR TABLE</strong></div>
   <div class="clock"><span>${worldTime(s.elapsedMinutes)}</span><small>Global simulation clock</small></div>
   <div class="top-actions">
     <label>Faction <select id="player-faction">${facOptions(s)}</select></label>
     <div class="speed-group"><button class="speed ${s.paused?'active':''}" data-action="pause">Pause</button>${speed(1)}${speed(2)}${speed(3)}</div>
     <button data-action="save">Save</button><button data-action="load">Load</button>
   </div>
 </header>`;
}

function routeSvg(s){
 return ROUTES.map(r=>{const a=s.strongholds[r.a],b=s.strongholds[r.b];return `<line class="route" x1="${a.x}" y1="${a.y}" x2="${b.x}" y2="${b.y}"/>`}).join('');
}
function strongholdSvg(s,selected){
 return Object.values(s.strongholds).map(h=>{const f=faction(h.owner),sel=selected?.type==='stronghold'&&selected.id===h.id;return `<g class="stronghold ${sel?'selected':''}" data-select="stronghold" data-id="${h.id}" transform="translate(${h.x} ${h.y})">
   <circle r="${sel?3.4:2.7}" fill="${f.color}"/><circle class="node-ring" r="4.1"/><text x="0" y="-5.6">${esc(h.name)}</text><text class="garrison" x="0" y="7">${fmt(h.troops)}</text>
 </g>`}).join('');
}
function unitSvg(s,selected){
 const armies=Object.values(s.armies).map(a=>{const p=unitPosition(s,a),f=faction(a.factionId),sel=selected?.type==='army'&&selected.id===a.id;return `<g class="unit army ${sel?'selected':''}" data-select="army" data-id="${a.id}" transform="translate(${p.x} ${p.y})"><path d="M0 -2.8 L3 2.5 L-3 2.5 Z" fill="${f.accent}"/><circle r="4.1"/></g>`}).join('');
 const transports=Object.values(s.transports).map(t=>{const p=unitPosition(s,t),f=faction(t.factionId),sel=selected?.type==='transport'&&selected.id===t.id;return `<g class="unit transport ${sel?'selected':''}" data-select="transport" data-id="${t.id}" transform="translate(${p.x} ${p.y})"><rect x="-2.4" y="-2.4" width="4.8" height="4.8" rx=".6" fill="${f.accent}"/><circle r="4.1"/></g>`}).join('');
 return armies+transports;
}
function mapPanel(s,selected){
 return `<section class="map-shell">
  <div class="map-title"><div><span class="eyebrow">WANO COUNTRY</span><h1>Strategic Map</h1></div><div class="map-kpis"><span>14 Strongholds</span><span>17 Routes</span><span>${Object.keys(s.armies).length} Armies</span><span>${Object.keys(s.transports).length} Transports</span></div></div>
  <div class="map-wrap">
   <svg id="strategy-map" viewBox="0 0 100 86" role="img" aria-label="Wano strategic route map">
    <defs><filter id="glow"><feGaussianBlur stdDeviation=".7" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter></defs>
    <path class="island island-a" d="M12,28 C18,17 31,14 43,20 C50,13 63,14 68,24 C77,19 90,24 87,35 C92,43 85,50 74,49 C69,60 57,62 50,55 C39,65 23,61 24,50 C13,48 8,39 12,28Z"/>
    <path class="island island-b" d="M11,62 C19,56 30,58 36,66 C48,60 58,64 61,74 C70,67 85,68 89,76 C82,84 66,85 54,80 C43,87 26,83 22,76 C15,76 9,70 11,62Z"/>
    <path class="island island-c" d="M70,6 C78,2 89,5 92,12 C90,20 83,24 75,21 C67,19 64,11 70,6Z"/>
    <g>${routeSvg(s)}</g><g>${strongholdSvg(s,selected)}</g><g filter="url(#glow)">${unitSvg(s,selected)}</g>
   </svg>
   <div class="legend">${FACTIONS.map(f=>`<span><i style="background:${f.color}"></i>${esc(f.short)}</span>`).join('')}<span><b>▲</b> Army</span><span><b>■</b> Transport</span></div>
  </div>
 </section>`;
}

function eventFeed(s){
 const items=s.eventFeed.slice(0,18).map(e=>`<article class="feed-item ${esc(e.type)}"><time>${worldTime(e.t).replace('Wano ','')}</time><p>${esc(e.text)}</p></article>`).join('');
 return `<aside class="feed"><div class="panel-heading"><span class="eyebrow">LIVE WORLD</span><h2>Event Feed</h2></div><div class="feed-list">${items||'<p class="muted">No events yet.</p>'}</div></aside>`;
}

function strongholdPanel(s,id){
 const h=s.strongholds[id],f=faction(h.owner),ours=h.owner===s.playerFaction,off=available(s,h.owner,id),dest=targetOptions(s,id);
 const actions=ours?`<div class="actions-grid">
   <button data-action="develop" data-id="${id}">Develop <small>₿300 → +3</small></button>
   <button data-action="recruit" data-id="${id}">Recruit <small>500 troops</small></button>
 </div>
 <div class="order-columns">
  <form data-form="army" data-origin="${id}" class="order-card"><h3>Form Combat Army</h3>
   <label>Commander<select name="commander">${officerOptions(off)}</select></label><label>Deputy<select name="deputy">${officerOptions(off,'None')}</select></label>
   <label>Destination<select name="destination">${dest}</select></label><div class="inline"><label>Troops<input name="troops" type="number" min="100" step="100" value="1000"></label><label>Food<input name="food" type="number" min="0" step="100" value="500"></label></div>
   <button type="submit">Deploy Army</button></form>
  <form data-form="transport" data-origin="${id}" class="order-card"><h3>Create Transport</h3>
   <label>Commander<select name="commander">${officerOptions(off)}</select></label><label>Destination<select name="destination">${dest}</select></label>
   <div class="inline"><label>Money<input name="money" type="number" min="0" step="100" value="0"></label><label>Food<input name="food" type="number" min="0" step="100" value="1000"></label><label>Troops<input name="troops" type="number" min="0" step="100" value="0"></label></div>
   <button type="submit">Dispatch Transport</button><small class="muted">Cannot attack. Evades or defends if intercepted.</small></form>
 </div>`:`<div class="notice">This stronghold belongs to ${esc(f.short)}. Its resources are visible but cannot be spent by your faction.</div>`;
 return `<div class="context-title"><div><span class="eyebrow">STRONGHOLD</span><h2>${esc(h.name)}</h2></div><span class="owner" style="--owner:${f.color}">${esc(f.name)}</span></div>
 <div class="resource-row"><div><span>Money</span><strong>${fmt(h.money)}</strong></div><div><span>Food</span><strong>${fmt(h.food)}</strong></div><div><span>Troops</span><strong>${fmt(h.troops)}</strong></div><div><span>Morale</span><strong>${Math.round(h.morale)}</strong></div><div><span>Development</span><strong>${h.development}/${h.cap}</strong></div></div>${actions}`;
}
function armyPanel(s,id){
 const a=s.armies[id];if(!a)return emptyPanel();const c=s.officers[a.commanderId],d=a.deputyId?s.officers[a.deputyId]:null,f=faction(a.factionId),ours=a.factionId===s.playerFaction;
 const orders=ours?`<form data-form="move-army" data-id="${id}" class="inline-order"><label>New destination<select name="destination">${targetOptions(s,a.location)}</select></label><button type="submit">Move</button></form>${a.status==='waiting'&&s.strongholds[a.location].owner===a.factionId?`<button data-action="disband" data-id="${id}">Disband into garrison</button>`:''}`:'';
 return `<div class="context-title"><div><span class="eyebrow">COMBAT ARMY</span><h2>${esc(c.name)}'s Army</h2></div><span class="owner" style="--owner:${f.color}">${esc(f.short)}</span></div>
 <div class="resource-row"><div><span>Troops</span><strong>${fmt(a.troops)}</strong></div><div><span>Food</span><strong>${fmt(a.food)}</strong></div><div><span>Morale</span><strong>${Math.round(a.morale)}</strong></div><div><span>Status</span><strong>${esc(a.status)}</strong></div><div><span>ETA</span><strong>${a.status==='moving'?`${eta(a)}m`:'—'}</strong></div></div>
 <p class="summary">Commander: <b>${esc(c.name)}</b>${d?` · Deputy: <b>${esc(d.name)}</b>`:''} · Destination: <b>${esc(s.strongholds[a.destination]?.name||a.location)}</b></p>${orders}`;
}
function transportPanel(s,id){
 const t=s.transports[id];if(!t)return emptyPanel();const c=s.officers[t.commanderId],f=faction(t.factionId);
 return `<div class="context-title"><div><span class="eyebrow">TRANSPORT</span><h2>${esc(c.name)}'s Convoy</h2></div><span class="owner" style="--owner:${f.color}">${esc(f.short)}</span></div>
 <div class="resource-row"><div><span>Money</span><strong>${fmt(t.cargo.money)}</strong></div><div><span>Food</span><strong>${fmt(t.cargo.food)}</strong></div><div><span>Troops</span><strong>${fmt(t.cargo.troops)}</strong></div><div><span>Status</span><strong>${esc(t.status)}</strong></div><div><span>ETA</span><strong>${t.status==='moving'?`${eta(t)}m`:'—'}</strong></div></div>
 <div class="notice">Destination: <b>${esc(s.strongholds[t.destination]?.name)}</b>. Transport has no Attack order and consumes no food.</div>`;
}
function emptyPanel(){return `<div class="empty-context"><span class="eyebrow">COMMAND DESK</span><h2>Select a stronghold or unit</h2><p>Inspect local resources, form armies, dispatch transports, or watch AI factions change Wano without player input.</p></div>`}
function contextPanel(s,selected){let body=emptyPanel();if(selected?.type==='stronghold'&&s.strongholds[selected.id])body=strongholdPanel(s,selected.id);if(selected?.type==='army')body=armyPanel(s,selected.id);if(selected?.type==='transport')body=transportPanel(s,selected.id);return `<section class="context">${body}</section>`}

export function render(s,selected){return `<div class="game">${topBar(s)}<main class="workspace">${mapPanel(s,selected)}${eventFeed(s)}</main>${contextPanel(s,selected)}<footer>Prototype v${esc(s.version)} · Placeholder-first strategic vertical slice · No fog of war</footer></div>`}
