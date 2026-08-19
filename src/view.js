import { FACTIONS, ROUTES, SKILLS } from './data.js';
import { available, diplomacyStatus, eta, faction, prisonersAt, relation, skillPerformance, unitPosition } from './world.js';
import { assetUse, factionAsset, frameAsset, fruitAsset, hakiAsset, portraitAsset, strongholdAsset, tacticalAsset, weaponAsset } from './assets.js';
import { koCharacter, koEvent, koFaction, koHaki, koProficiency, koRelationshipTier, koStat, koStatus, koStronghold, koTier, koWorldTime } from './i18n.js';

const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const fmt=n=>Math.max(0,Math.round(Number(n)||0)).toLocaleString('ko-KR');
const option=(v,label,selected=false)=>`<option value="${esc(v)}"${selected?' selected':''}>${esc(label)}</option>`;
const facOptions=s=>FACTIONS.map(f=>option(f.id,koFaction(f.id),f.id===s.playerFaction)).join('');
const targetOptions=(s,origin)=>Object.values(s.strongholds).filter(h=>h.id!==origin).map(h=>option(h.id,koStronghold(h.id))).join('');
const officerOptions=(list,blank='장수 선택')=>`${option('',blank)}${list.map(o=>option(o.id,koCharacter(o.name))).join('')}`;
const aliveFactionOfficers=(s,f)=>Object.values(s.officers).filter(o=>o.faction===f&&o.status!=='dead');

function portrait(o,size='normal'){
  if(!o) return '';
  return `<div class="portrait ${size} tier-${String(o.tier||'MINOR').toLowerCase()}">
    ${assetUse(portraitAsset(o.id),'portrait-art',koCharacter(o.name))}
    ${assetUse(frameAsset(o.tier),'portrait-frame')}
  </div>`;
}

function factionBadge(id,compact=false){
  return `<span class="faction-badge ${compact?'compact':''}">
    ${assetUse(factionAsset(id),'faction-emblem')}
    <b>${esc(koFaction(id))}</b>
  </span>`;
}

function topBar(s){
  const speed=x=>`<button class="speed ${!s.paused&&s.speed===x?'active':''}" data-action="speed" data-speed="${x}">${x}배속</button>`;
  return `<header class="topbar">
    <div class="brand">
      <span class="eyebrow">실시간 세력 전략 시뮬레이션</span>
      <strong>와노 전란기 <em>v1.0.0</em></strong>
    </div>
    <div class="clock">
      <span>${koWorldTime(s.elapsedMinutes)}</span>
      <small>전략 지도와 전투가 하나의 시간축을 공유합니다</small>
    </div>
    <div class="top-actions">
      <label class="faction-picker">플레이 세력<select id="player-faction">${facOptions(s)}</select></label>
      <div class="speed-group"><button class="speed ${s.paused?'active':''}" data-action="pause">일시정지</button>${speed(1)}${speed(2)}${speed(3)}</div>
      <button data-action="open" data-type="roster">인물</button>
      <button data-action="open" data-type="diplomacy">외교</button>
      <button data-action="open" data-type="objects">특수 물품</button>
      <button data-action="open" data-type="battles">전투</button>
      <button data-action="save">저장</button>
      <button data-action="load">불러오기</button>
    </div>
  </header>`;
}

function officerDock(s){
  const rank={CORE:0,MAJOR:1,SUPPORT:2,MINOR:3};
  const officers=aliveFactionOfficers(s,s.playerFaction).sort((a,b)=>(rank[a.tier]??9)-(rank[b.tier]??9)||b.martial-a.martial);
  return `<section class="officer-dock">
    <div class="dock-label">${factionBadge(s.playerFaction,true)}<small>${officers.length}명</small></div>
    <div class="dock-scroll">
      ${officers.slice(0,16).map(o=>`<button class="officer-chip" data-select="character" data-id="${o.id}">
        ${portrait(o,'tiny')}
        <span><b>${esc(koCharacter(o.name))}</b><small>${koTier(o.tier)} · 무력 ${o.martial} · ${o.status==='deployed'?'출진 중':esc(koStronghold(o.location))}</small></span>
      </button>`).join('')}
    </div>
    <button class="dock-all" data-action="open" data-type="roster">전체 보기</button>
  </section>`;
}

function routeSvg(s){
  return ROUTES.map(r=>{
    const a=s.strongholds[r.a],b=s.strongholds[r.b];
    return `<line class="route" x1="${a.x}" y1="${a.y}" x2="${b.x}" y2="${b.y}"/>`;
  }).join('');
}

function strongholdSvg(s,selected){
  return Object.values(s.strongholds).map(h=>{
    const f=faction(h.owner),sel=selected?.type==='stronghold'&&selected.id===h.id;
    return `<g class="stronghold ${sel?'selected':''}" data-select="stronghold" data-id="${h.id}" transform="translate(${h.x} ${h.y})">
      <circle class="stronghold-halo" r="${sel?6.1:5.2}" fill="${f.color}"/>
      <svg x="-4.4" y="-4.4" width="8.8" height="8.8" viewBox="0 0 100 100"><use href="./assets/v1-art.svg#${strongholdAsset(h.id)}"></use></svg>
      <text class="stronghold-name" x="0" y="-7">${esc(koStronghold(h.id))}</text>
      <text class="garrison" x="0" y="8">${fmt(h.troops)}</text>
    </g>`;
  }).join('');
}

function unitSvg(s,selected){
  const armies=Object.values(s.armies).map(a=>{
    const p=unitPosition(s,a),f=faction(a.factionId),sel=selected?.type==='army'&&selected.id===a.id;
    return `<g class="unit army ${sel?'selected':''}" data-select="army" data-id="${a.id}" transform="translate(${p.x} ${p.y})">
      <path d="M0 -3.3 L3.7 3 L-3.7 3 Z" fill="${f.accent}"/><circle r="5"/>
    </g>`;
  }).join('');
  const transports=Object.values(s.transports).map(t=>{
    const p=unitPosition(s,t),f=faction(t.factionId),sel=selected?.type==='transport'&&selected.id===t.id;
    return `<g class="unit transport ${sel?'selected':''}" data-select="transport" data-id="${t.id}" transform="translate(${p.x} ${p.y})">
      <rect x="-3" y="-3" width="6" height="6" rx="1" fill="${f.accent}"/><circle r="5"/>
    </g>`;
  }).join('');
  const battles=Object.values(s.battles).filter(b=>b.status!=='resolved').map(b=>{
    const h=s.strongholds[b.strongholdId]; if(!h)return'';
    return `<g class="battle-marker" data-select="battle" data-id="${b.id}" transform="translate(${h.x} ${h.y})"><circle r="5"/><text>⚔</text></g>`;
  }).join('');
  return armies+transports+battles;
}

function mapPanel(s,selected){
  return `<section class="map-shell">
    <div class="map-title">
      <div><span class="eyebrow">와노쿠니</span><h1>전략 지도</h1></div>
      <div class="map-kpis"><span>거점 14</span><span>도로 17</span><span>군단 ${Object.keys(s.armies).length}</span><span>진행 중 전투 ${Object.values(s.battles).filter(b=>b.status!=='resolved').length}</span></div>
    </div>
    <div class="map-wrap">
      <svg id="strategy-map" viewBox="0 0 100 86" aria-label="와노 전략 지도">
        <image href="./assets/wano-map.svg" x="0" y="0" width="100" height="86" preserveAspectRatio="none"/>
        <g>${routeSvg(s)}</g><g>${strongholdSvg(s,selected)}</g><g>${unitSvg(s,selected)}</g>
      </svg>
      <div class="map-help">거점을 한 번 클릭하면 명령창이 열립니다. ▲ 군단 · ■ 수송대 · ⚔ 전투</div>
      <div class="legend">${FACTIONS.map(f=>`<span>${assetUse(factionAsset(f.id),'legend-emblem')} ${esc(koFaction(f.id))}</span>`).join('')}</div>
    </div>
  </section>`;
}

function eventFeed(s){
  return `<aside class="feed">
    <div class="panel-heading"><span class="eyebrow">실시간 세계</span><h2>사건 기록</h2></div>
    <div class="feed-list">${s.eventFeed.slice(0,30).map(e=>`<article class="feed-item ${esc(e.type)}"><time>${koWorldTime(e.t).replace('와노 ','')}</time><p>${esc(koEvent(e.text))}</p></article>`).join('')}</div>
  </aside>`;
}

function resources(h){
  return `<div class="resource-row">
    <div><span>자금</span><strong>${fmt(h.money)}</strong></div>
    <div><span>식량</span><strong>${fmt(h.food)}</strong></div>
    <div><span>병력</span><strong>${fmt(h.troops)}</strong></div>
    <div><span>사기</span><strong>${Math.round(h.morale)}</strong></div>
    <div><span>개발</span><strong>${h.development}/${h.cap}</strong></div>
  </div>`;
}

function presentCharacters(s,h){
  const chars=Object.values(s.officers).filter(o=>o.location===h.id&&!o.assignedUnitId&&o.status!=='dead').sort((a,b)=>b.martial-a.martial);
  return `<div class="subpanel character-presence">
    <div class="subheading"><h3>현재 거점 인물</h3><span>${chars.length}명</span></div>
    ${chars.length?`<div class="mini-character-grid">${chars.map(o=>`<button class="mini-character" data-select="character" data-id="${o.id}">
      ${portrait(o,'small')}<span><b>${esc(koCharacter(o.name))}</b><small>${esc(koFaction(o.faction))} · ${koStatus(o.status)} · 무력 ${o.martial}</small></span>
    </button>`).join('')}</div>`:'<p class="muted">이 거점에 대기 중인 인물이 없습니다.</p>'}
  </div>`;
}

function strongholdPanel(s,id){
  const h=s.strongholds[id]; if(!h)return emptyPanel();
  const f=faction(h.owner),ours=h.owner===s.playerFaction,off=available(s,h.owner,id),dest=targetOptions(s,id);
  const prisoners=prisonersAt(s,id).filter(p=>p.captorFaction===s.playerFaction);
  const fruits=Object.values(s.fruits).filter(fr=>!fr.ownerId&&fr.location===id);
  const weapons=Object.values(s.weapons).filter(w=>!w.ownerId&&w.location===id);
  const ownOff=ours?available(s,s.playerFaction,id):[];
  const actions=ours?`
    <div class="actions-grid primary-actions">
      <button data-action="develop" data-id="${id}"><b>개발</b><small>자금 300 → 개발 +3</small></button>
      <button data-action="recruit" data-id="${id}"><b>병력 모집</b><small>병력 +500</small></button>
      <button data-action="produce" data-id="${id}"><b>생산</b><small>자금 → 식량</small></button>
      <button data-action="buy-food" data-id="${id}"><b>식량 구매</b><small>시장 거래</small></button>
      <button data-action="sell-food" data-id="${id}"><b>식량 판매</b><small>시장 거래</small></button>
    </div>
    <form data-form="assign-officer" data-origin="${id}" class="inline-order">
      <label>거점 담당<select name="officer">${officerOptions(off)}</select></label>
      <label>직책<select name="role">${option('governor','태수')}${option('recruiter','모병 담당')}${option('logistics','병참 담당')}</select></label>
      <button>임명</button>
    </form>
    <div class="order-columns">
      <form data-form="army" data-origin="${id}" class="order-card">
        <h3>군단 편성</h3>
        <label>지휘관<select name="commander">${officerOptions(off)}</select></label>
        <label>부장<select name="deputy">${officerOptions(off,'없음')}</select></label>
        <label>목적지<select name="destination">${dest}</select></label>
        <div class="inline"><label>병력<input name="troops" type="number" step="100" min="100" value="1000"></label><label>군량<input name="food" type="number" step="100" min="0" value="500"></label></div>
        <button type="submit">군단 출진</button>
      </form>
      <form data-form="transport" data-origin="${id}" class="order-card">
        <h3>수송대 편성</h3>
        <label>지휘관<select name="commander">${officerOptions(off)}</select></label>
        <label>목적지<select name="destination">${dest}</select></label>
        <div class="inline"><label>자금<input name="money" type="number" step="100" min="0" value="0"></label><label>식량<input name="food" type="number" step="100" min="0" value="1000"></label><label>병력<input name="troops" type="number" step="100" min="0" value="0"></label></div>
        <label>포로<select name="prisoner">${option('','없음')}${prisoners.map(p=>option(p.id,koCharacter(p.name))).join('')}</select></label>
        <label>악마의 열매<select name="fruit">${option('','없음')}${fruits.filter(fr=>!fr.hidden&&fr.discoveredBy===s.playerFaction).map(fr=>option(fr.id,fr.name)).join('')}</select></label>
        <button type="submit">수송 출발</button>
      </form>
    </div>`:`<div class="notice">${factionBadge(h.owner)}<p>이 거점은 현재 플레이 세력의 소유가 아닙니다.</p></div>`;

  const prisonerHtml=ours&&prisoners.length?`<div class="subpanel"><h3>포로</h3>${prisoners.map(p=>`<div class="rowline">
      <button class="link" data-select="character" data-id="${p.id}">${esc(koCharacter(p.name))}</button>
      <button data-action="prisoner-recruit" data-id="${p.id}">등용</button><button data-action="prisoner-release" data-id="${p.id}">석방</button>
      <button data-action="prisoner-confiscate" data-id="${p.id}">무기 몰수</button>
      <select data-prisoner-transfer="${p.id}">${FACTIONS.filter(x=>x.id!==s.playerFaction).map(x=>option(x.id,koFaction(x.id))).join('')}</select>
      <button data-action="prisoner-transfer" data-id="${p.id}">이송</button><button class="danger" data-action="prisoner-execute" data-id="${p.id}">처형</button>
    </div>`).join('')}</div>`:'';

  const objectHtml=ours?`<div class="subpanel"><h3>이 거점의 특수 물품</h3>
    <div class="object-mini-grid">
      ${fruits.map(fr=>`<div class="object-mini">${assetUse(fruitAsset(fr.id),'object-icon')}<span><b>${esc(fr.name)}</b><small>${fr.hidden?'미발견':fr.discoveredBy?'발견됨':'조사 가능'}</small></span>${!fr.hidden&&!fr.discoveredBy?`<button data-action="fruit-discover" data-id="${fr.id}">조사</button>`:''}${fr.discoveredBy===s.playerFaction?`<select data-fruit-officer="${fr.id}">${officerOptions(ownOff)}</select><button data-action="fruit-give" data-id="${fr.id}">사용자 지정</button>`:''}</div>`).join('')}
      ${weapons.map(w=>`<div class="object-mini">${assetUse(weaponAsset(w.id),'object-icon')}<span><b>${esc(w.name)}</b><small>${esc(w.quality)}급 무기</small></span><select data-weapon-officer="${w.id}">${officerOptions(ownOff)}</select><button data-action="weapon-equip" data-id="${w.id}">장비</button></div>`).join('')}
      ${!fruits.length&&!weapons.length?'<p class="muted">보관 중인 특수 물품이 없습니다.</p>':''}
    </div></div>`:'';

  return `<div class="context-title"><div><span class="eyebrow">거점</span><h2>${esc(koStronghold(h.id))}</h2></div>${factionBadge(h.owner,true)}</div>
    ${presentCharacters(s,h)}${resources(h)}${actions}${prisonerHtml}${objectHtml}`;
}

function armyPanel(s,id){
  const a=s.armies[id];if(!a)return emptyPanel();const c=s.officers[a.commanderId],d=a.deputyId?s.officers[a.deputyId]:null;
  const ours=a.factionId===s.playerFaction,spares=ours?available(s,a.factionId,a.location):[];
  const mergeable=Object.values(s.armies).filter(x=>x.id!==a.id&&x.factionId===a.factionId&&x.location===a.location&&x.status==='waiting');
  return `<div class="context-title"><div><span class="eyebrow">군단</span><h2>${esc(koCharacter(c?.name))} 군단</h2></div>${factionBadge(a.factionId,true)}</div>
    <div class="commander-card">${portrait(c,'medium')}<div><b>${esc(koCharacter(c?.name))}</b><small>지휘관${d?` · 부장 ${esc(koCharacter(d.name))}`:''}</small></div></div>
    <div class="resource-row"><div><span>병력</span><strong>${fmt(a.troops)}</strong></div><div><span>군량</span><strong>${fmt(a.food)}</strong></div><div><span>사기</span><strong>${Math.round(a.morale)}</strong></div><div><span>상태</span><strong>${koStatus(a.status)}</strong></div><div><span>도착 예정</span><strong>${a.status==='moving'?eta(a)+'분':'—'}</strong></div></div>
    ${ours?`<form data-form="move-army" data-id="${id}" class="inline-order"><label>새 목적지<select name="destination">${targetOptions(s,a.location)}</select></label><button>이동 명령</button></form>
    ${a.status==='waiting'?`<button data-action="disband" data-id="${id}">군단 해산</button>
      ${spares.length&&a.troops>=300?`<form data-form="split-army" data-id="${id}" class="subpanel"><h3>군단 분할</h3><label>새 지휘관<select name="commander">${officerOptions(spares)}</select></label><label>목적지<select name="destination">${targetOptions(s,a.location)}</select></label><div class="inline"><input name="troops" type="number" step="100" value="200"><input name="food" type="number" step="100" value="100"></div><button>분할</button></form>`:''}
      ${mergeable.length?`<form data-form="merge-army" data-id="${id}" class="subpanel"><label>합류할 군단<select name="source">${mergeable.map(x=>option(x.id,koCharacter(s.officers[x.commanderId]?.name))).join('')}</select></label><button>병합</button></form>`:''}`:''}`:''}`;
}

function transportPanel(s,id){
  const t=s.transports[id];if(!t)return emptyPanel();const c=s.officers[t.commanderId];
  return `<div class="context-title"><div><span class="eyebrow">수송대</span><h2>${esc(koCharacter(c?.name))} 수송대</h2></div>${factionBadge(t.factionId,true)}</div>
    <div class="commander-card">${portrait(c,'medium')}<div><b>${esc(koCharacter(c?.name))}</b><small>${koStatus(t.status)} · 목적지 ${esc(koStronghold(t.destination))}</small></div></div>
    <div class="resource-row"><div><span>자금</span><strong>${fmt(t.cargo.money)}</strong></div><div><span>식량</span><strong>${fmt(t.cargo.food)}</strong></div><div><span>병력</span><strong>${fmt(t.cargo.troops)}</strong></div><div><span>포로</span><strong>${t.cargo.prisoners.length}</strong></div><div><span>열매</span><strong>${t.cargo.devilFruits.length}</strong></div></div>
    <p class="muted">수송대는 공격 명령을 받을 수 없으며 식량을 소비하지 않습니다.</p>`;
}

function characterPanel(s,id){
  const o=s.officers[id];if(!o)return emptyPanel();const fr=o.fruitId?s.fruits[o.fruitId]:null;
  const rels=Object.values(s.officers).filter(x=>x.id!==o.id).map(x=>({x,r:relation(s,o.id,x.id)})).filter(x=>x.r.value!==0||x.r.tags.length).sort((a,b)=>Math.abs(b.r.value)-Math.abs(a.r.value)).slice(0,6);
  const techByLine={armament:['Emission','Internal Destruction'],observation:['Future Sight'],conqueror:['Conqueror Coating']};
  const normalUnlocked=o.unlockedSkills.filter(sid=>!SKILLS[sid]?.ultimate),ultUnlocked=o.unlockedSkills.filter(sid=>SKILLS[sid]?.ultimate);
  const own=o.faction===s.playerFaction&&o.status==='available';
  return `<div class="character-hero">
      <div class="character-art">${portrait(o,'hero')}</div>
      <div class="character-summary"><span class="eyebrow">인물</span><h2>${esc(koCharacter(o.name))}</h2>${factionBadge(o.faction,true)}
        <p>${koTier(o.tier)} · ${koStatus(o.status)} · 충성 ${o.loyalty}</p>
        <div class="hero-stats">${['martial','intelligence','politics','charisma'].map(k=>`<div><span>${koStat(k)}</span><strong>${o[k]}</strong><small>재능 ${o.talents[k]}</small>${own?`<button data-action="train-stat" data-id="${o.id}" data-stat="${k}">훈련</button>`:''}</div>`).join('')}</div>
      </div>
    </div>
    <div class="resource-row"><div><span>HP</span><strong>${Math.round(o.hp)}/${o.maxHp}</strong></div><div><span>기력</span><strong>${Math.round(o.energy)}</strong></div><div><span>상태</span><strong>${koStatus(o.status)}</strong></div><div><span>지휘</span><strong>${Math.round(o.charisma*.46+o.martial*.22+o.intelligence*.2+o.politics*.12)}</strong></div><div><span>현재 위치</span><strong>${esc(koStronghold(o.location))}</strong></div></div>
    <div class="detail-grid">
      <section class="subpanel"><h3>패기</h3><div class="haki-grid">${Object.entries(o.haki).map(([k,v])=>`<div class="haki-card">${assetUse(hakiAsset(k),'haki-icon')}<span><b>${koHaki(k)} ${v.grade}</b><small>재능 ${v.talent} · ${v.techniques.join(', ')||'고급 기술 없음'}</small></span>${own?`<button data-action="train-haki" data-id="${o.id}" data-line="${k}">수련</button>${techByLine[k].map(t=>`<button data-action="unlock-haki" data-id="${o.id}" data-line="${k}" data-technique="${t}">${esc(t)} 해금</button>`).join('')}`:''}</div>`).join('')}</div></section>
      <section class="subpanel"><h3>전투 숙련</h3><div class="proficiency-list">${Object.entries(o.proficiencies).map(([k,v])=>`<span>${koProficiency(k)} <b>${v}</b></span>`).join('')}</div></section>
      <section class="subpanel"><h3>악마의 열매</h3>${fr?`<div class="object-feature">${assetUse(fruitAsset(fr.id),'feature-icon')}<div><b>${esc(fr.name)}</b><small>${esc(fr.kind)}</small><p>개인 숙련 ${o.fruitMastery?.mastery??0}/100 · ${o.fruitMastery?.proficiency||'NONE'}</p></div></div>${own?`<button data-action="train-fruit" data-id="${o.id}">열매 숙련 훈련</button>`:''}`:'<p class="muted">악마의 열매 능력 없음</p>'}</section>
      <section class="subpanel"><h3>장비</h3><div class="equipment-row">${o.equipment.map(w=>`${assetUse(weaponAsset(w),'equipment-icon')}<span>${esc(s.weapons[w]?.name)}</span>`).join('')||'<span class="muted">장비 없음</span>'}</div></section>
    </div>
    <section class="subpanel"><h3>장착 기술 4 + 1</h3><div class="skills-grid">${o.skills.map((sid,i)=>`<div class="skill-slot"><span>${i===4?'필살기':`기술 ${i+1}`}</span><b>${esc(SKILLS[sid]?.name||sid)}</b><small>위력 ${skillPerformance(o,sid)?.power||0}</small></div>`).join('')}</div>
      ${own?`<div class="skill-equip">${[0,1,2,3].map(slot=>`<form data-form="equip-skill" data-id="${o.id}" data-slot="${slot}"><label>기술 ${slot+1}<select name="skill">${normalUnlocked.map(sid=>option(sid,SKILLS[sid]?.name||sid,sid===o.skills[slot])).join('')}</select></label><button>장착</button></form>`).join('')}<form data-form="equip-skill" data-id="${o.id}" data-slot="4"><label>필살기<select name="skill">${ultUnlocked.map(sid=>option(sid,SKILLS[sid]?.name||sid,sid===o.skills[4])).join('')}</select></label><button>장착</button></form></div>`:''}
    </section>
    <section class="subpanel"><h3>주요 관계</h3>${rels.map(({x,r})=>`<p><b>${esc(koCharacter(x.name))}</b> · ${koRelationshipTier(r.value)} · ${r.tags.join(', ')||'태그 없음'}</p>`).join('')||'<p class="muted">특기할 관계 정보가 없습니다.</p>'}</section>`;
}

function rosterPanel(s){
  const groups=FACTIONS.map(f=>{
    const list=aliveFactionOfficers(s,f.id);
    return `<section class="roster-group"><div class="roster-group-head">${factionBadge(f.id)}<span>${list.length}명</span></div>
      <div class="roster-cards">${list.map(o=>`<button class="roster-card" data-select="character" data-id="${o.id}">${portrait(o,'small')}<span><b>${esc(koCharacter(o.name))}</b><small>${koTier(o.tier)} · 무 ${o.martial} / 지 ${o.intelligence} / 정 ${o.politics} / 매 ${o.charisma}</small><small>${koStatus(o.status)} · ${esc(koStronghold(o.location))}</small></span></button>`).join('')}</div>
    </section>`;
  }).join('');
  return `<div class="context-title"><div><span class="eyebrow">시나리오 인물 130명</span><h2>인물 일람</h2></div></div><div class="roster">${groups}</div>`;
}

function diplomacyPanel(s){
  const from=s.playerFaction,ownHs=Object.values(s.strongholds).filter(h=>h.owner===from),ownOff=Object.values(s.officers).filter(o=>o.faction===from&&o.status==='available'&&o.loyalty<90);
  const looseFruits=Object.values(s.fruits).filter(fr=>!fr.ownerId&&!fr.hidden&&fr.discoveredBy===from),held=Object.values(s.officers).filter(o=>o.status==='prisoner'&&o.captorFaction===from);
  return `<div class="context-title"><div><span class="eyebrow">세력 관계</span><h2>외교</h2></div>${factionBadge(from,true)}</div>
    <div class="diplomacy-list">${FACTIONS.filter(f=>f.id!==from).map(f=>{
      const d=diplomacyStatus(s,from,f.id),targetHs=Object.values(s.strongholds).filter(h=>h.owner===f.id),theirHeld=Object.values(s.officers).filter(o=>o.status==='prisoner'&&o.captorFaction===f.id&&o.faction===from),theirPrisoner=held.filter(o=>o.faction===f.id);
      return `<section class="dip-card"><div class="dip-head">${factionBadge(f.id)}<span>${koStatus(d.status)} · 신뢰 ${d.trust}</span></div>
        <div class="actions-grid"><button data-action="diplomacy" data-target="${f.id}" data-status="alliance">동맹</button><button data-action="diplomacy" data-target="${f.id}" data-status="truce">휴전</button><button data-action="diplomacy" data-target="${f.id}" data-status="joint_front">공동전선</button><button class="danger" data-action="diplomacy" data-target="${f.id}" data-status="war">선전포고</button></div>
        ${ownHs.length&&targetHs.length?`<form data-form="aid" data-target="${f.id}"><h4>원조</h4><label>보내는 거점<select name="fromStronghold">${ownHs.map(h=>option(h.id,koStronghold(h.id))).join('')}</select></label><label>받는 거점<select name="toStronghold">${targetHs.map(h=>option(h.id,koStronghold(h.id))).join('')}</select></label><div class="inline"><input name="money" type="number" step="100" value="0" placeholder="자금"><input name="food" type="number" step="100" value="500" placeholder="식량"><input name="troops" type="number" step="100" value="0" placeholder="병력"></div><button>원조 보내기</button></form>`:''}
        ${ownOff.length?`<form data-form="character-transfer" data-target="${f.id}"><h4>인물 교섭</h4><select name="officer">${ownOff.map(o=>option(o.id,koCharacter(o.name))).join('')}</select><button>이적 제안</button></form>`:''}
        ${looseFruits.length?`<form data-form="fruit-transfer" data-target="${f.id}"><h4>악마의 열매 교섭</h4><select name="fruit">${looseFruits.map(fr=>option(fr.id,fr.name)).join('')}</select><button>열매 양도</button></form>`:''}
        ${theirPrisoner.length&&theirHeld.length?`<form data-form="prisoner-exchange" data-target="${f.id}"><h4>포로 교환</h4><select name="theirs">${theirPrisoner.map(o=>option(o.id,koCharacter(o.name))).join('')}</select><select name="ours">${theirHeld.map(o=>option(o.id,koCharacter(o.name))).join('')}</select><button>교환</button></form>`:''}
      </section>`;
    }).join('')}</div>`;
}

function objectsPanel(s){
  const fruits=Object.values(s.fruits).map(fr=>`<article class="object-card">${assetUse(fruitAsset(fr.id),'object-large')}<div><b>${esc(fr.name)}</b><small>${esc(fr.kind)}</small><p>${fr.ownerId?`사용자: ${esc(koCharacter(s.officers[fr.ownerId]?.name))}`:fr.hidden?'행방불명':`위치: ${esc(koStronghold(fr.location))}`}</p></div></article>`).join('');
  const weapons=Object.values(s.weapons).map(w=>`<article class="object-card">${assetUse(weaponAsset(w.id),'object-large')}<div><b>${esc(w.name)}</b><small>${esc(w.type)} · ${esc(w.quality)}급</small><p>${w.ownerId?`소유자: ${esc(koCharacter(s.officers[w.ownerId]?.name))}`:`위치: ${esc(koStronghold(w.location))}`}</p></div></article>`).join('');
  return `<div class="context-title"><div><span class="eyebrow">유일 세계 오브젝트</span><h2>특수 물품</h2></div></div><h3>악마의 열매</h3><div class="objects-grid">${fruits}</div><h3>이름 있는 무기</h3><div class="objects-grid">${weapons}</div>`;
}

function battlesPanel(s){
  const bs=Object.values(s.battles).sort((a,b)=>b.createdAt-a.createdAt);
  return `<div class="context-title"><div><span class="eyebrow">동시 전투 관리</span><h2>전투 상황</h2></div></div>${bs.map(b=>`<article class="battle-card"><div><b>${esc(b.id)}</b><span>${b.type==='siege'?'공성전':'야전'} · ${koFaction(b.attackerFaction)} vs ${koFaction(b.defenderFaction)} · ${koStatus(b.status)}</span></div>${['awaiting_order','auto'].includes(b.status)&&[b.attackerFaction,b.defenderFaction].includes(s.playerFaction)?`<button data-action="manual-battle" data-id="${b.id}">수동 지휘</button><button data-action="auto-battle" data-id="${b.id}">자동 진행</button>`:''}<button class="link" data-select="battle" data-id="${b.id}">상세</button></article>`).join('')||'<p>현재 진행 중인 전투가 없습니다.</p>'}`;
}

function battlePanel(s,id){
  const b=s.battles[id];if(!b)return emptyPanel();
  return `<div class="context-title"><div><span class="eyebrow">전투</span><h2>${esc(id)}</h2></div><span>${koStatus(b.status)}</span></div><p>${b.type==='siege'?'공성전':'야전'} · ${koFaction(b.attackerFaction)} vs ${koFaction(b.defenderFaction)}</p><p>전장: ${esc(koStronghold(b.strongholdId))}</p>${['awaiting_order','auto'].includes(b.status)&&[b.attackerFaction,b.defenderFaction].includes(s.playerFaction)?`<button data-action="manual-battle" data-id="${b.id}">수동 지휘</button><button data-action="auto-battle" data-id="${b.id}">자동 진행</button>`:''}`;
}

function emptyPanel(){
  return `<div class="empty-context"><span class="eyebrow">명령창</span><h2>지도에서 거점·군단을 선택하거나 상단 메뉴를 이용하세요</h2><p>플레이어가 아무 명령도 내리지 않아도 와노의 시간과 AI 세력은 계속 움직입니다.</p></div>`;
}

function contextPanel(s,selected){
  let body=emptyPanel();
  if(selected?.type==='stronghold')body=strongholdPanel(s,selected.id);
  if(selected?.type==='army')body=armyPanel(s,selected.id);
  if(selected?.type==='transport')body=transportPanel(s,selected.id);
  if(selected?.type==='character')body=characterPanel(s,selected.id);
  if(selected?.type==='roster')body=rosterPanel(s);
  if(selected?.type==='diplomacy')body=diplomacyPanel(s);
  if(selected?.type==='objects')body=objectsPanel(s);
  if(selected?.type==='battles')body=battlesPanel(s);
  if(selected?.type==='battle')body=battlePanel(s,selected.id);
  return `<aside class="context ${selected?'open':''}"><button class="panel-close" data-action="close-panel" aria-label="명령창 닫기">×</button>${body}</aside>`;
}

function tacticalOverlay(s,selectedTactical){
  const b=s.activeManualBattleId?s.battles[s.activeManualBattleId]:null;if(!b?.tactical)return'';
  const t=b.tactical,units=Object.values(t.units);const me=selectedTactical?t.units[selectedTactical]:units.find(u=>u.side===t.manualSide&&!u.retreated&&!u.incapacitated);
  const cells=Array.from({length:t.width*t.height},()=>'<i></i>').join('');
  const pieces=units.map(u=>{
    const o=s.officers[u.officerId];const label=o?koCharacter(o.name):'주둔군';
    return `<button class="tunit ${u.side} ${u.id===me?.id?'selected':''} ${u.retreated||u.incapacitated?'down':''}" data-tunit="${u.id}" style="--x:${u.x+1};--y:${u.y+1}">${assetUse(tacticalAsset(u.officerId),'tactical-sprite')}<b>${esc(label)}</b><span>${fmt(u.troops)}</span><small>HP ${Math.round(u.hp)} · 사기 ${Math.round(u.morale)}</small></button>`;
  }).join('');
  const enemies=units.filter(u=>u.side!==t.manualSide&&!u.retreated&&!u.incapacitated),skills=me?.officerId?(s.officers[me.officerId].skills||[]).filter(Boolean):[];
  return `<div class="tactical-overlay"><div class="tactical-head"><div><span class="eyebrow">실시간 전술 전투</span><h2>${koFaction(b.attackerFaction)} vs ${koFaction(b.defenderFaction)}</h2></div><button data-action="auto-battle" data-id="${b.id}">자동 전투로 전환</button></div>
    <div class="tactical-body"><div class="tactical-grid">${cells}${pieces}</div><aside class="tactical-controls">${me?`<h3>${esc(koCharacter(s.officers[me.officerId]?.name)||'주둔군')}</h3><p>병력 ${fmt(me.troops)} · HP ${Math.round(me.hp)} · 기력 ${Math.round(me.energy)}</p><div class="actions-grid"><button data-torder="hold" data-unit="${me.id}">고수</button><button data-torder="auto" data-unit="${me.id}">개별 AUTO</button><button data-torder="retreat" data-unit="${me.id}">퇴각</button></div><form data-form="tattack" data-unit="${me.id}"><label>공격 대상<select name="target">${enemies.map(e=>option(e.id,koCharacter(s.officers[e.officerId]?.name)||'주둔군')).join('')}</select></label><button>공격</button></form><form data-form="tmove" data-unit="${me.id}"><div class="inline"><label>X<input name="x" type="number" min="0" max="11" value="${me.x}"></label><label>Y<input name="y" type="number" min="0" max="7" value="${me.y}"></label></div><button>이동</button></form><div class="skill-buttons">${skills.map(sid=>`<button data-tskill="${sid}" data-unit="${me.id}" data-target="${enemies[0]?.id||''}">${esc(SKILLS[sid]?.name||sid)} <small>${skillPerformance(s.officers[me.officerId],sid)?.cost||0} EN</small></button>`).join('')}</div>`:'<p>아군 유닛을 선택하세요.</p>'}<h3>전투 기록</h3><div class="tlog">${t.log.slice(0,12).map(x=>`<p>${esc(x)}</p>`).join('')}</div></aside></div>
  </div>`;
}

function notice(s){
  const n=s.uiNotice;if(!n)return'';
  return `<div class="ui-notice ${esc(n.tone||'info')}" role="status">${esc(n.text)}</div>`;
}

export function render(s,selected,selectedTactical){
  return `<div class="game">${topBar(s)}${officerDock(s)}
    <main class="workspace">${mapPanel(s,selected)}${contextPanel(s,selected)}${eventFeed(s)}</main>
    <footer>v1.0.0 · 130명 데이터 기반 시나리오 · AUTO/수동 전투 동일 시뮬레이션 · 전장의 안개 없음</footer>
    ${notice(s)}${tacticalOverlay(s,selectedTactical)}
  </div>`;
}
