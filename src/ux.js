const esc = v => String(v ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const tierRank = { CORE:0, MAJOR:1, SUPPORT:2, MINOR:3 };

function officerLocation(s,o){
  if(o.assignedUnitId){
    const unit=s.armies[o.assignedUnitId]||s.transports[o.assignedUnitId];
    if(unit) return unit.status==='moving' ? `Moving → ${s.strongholds[unit.destination]?.name||'route'}` : (s.strongholds[unit.location]?.name||unit.status);
  }
  return s.strongholds[o.location]?.name || (o.status==='prisoner'?'Prisoner':'Unknown');
}

function avatar(name){
  return name.split(/\s+/).map(x=>x[0]).join('').replace(/[^A-Za-z]/g,'').slice(0,2).toUpperCase() || '?';
}

function toast(message,tone='info'){
  let box=document.querySelector('#ux-toast');
  if(!box){box=document.createElement('div');box.id='ux-toast';document.body.appendChild(box)}
  box.className=`ux-toast ${tone}`;
  box.textContent=message;
  box.classList.add('show');
  clearTimeout(box._timer);
  box._timer=setTimeout(()=>box.classList.remove('show'),2600);
}

function bindFeedback(root,getState){
  if(root.dataset.uxFeedbackBound==='1') return;
  root.dataset.uxFeedbackBound='1';
  const commandActions=new Set(['develop','recruit','produce','buy-food','sell-food','disband','train-stat','train-haki','train-fruit','unlock-haki','prisoner-recruit','prisoner-release','prisoner-execute','prisoner-confiscate','prisoner-transfer','fruit-discover','fruit-give','weapon-equip','diplomacy','manual-battle','auto-battle']);
  const track=(target)=>{
    const actionEl=target.closest?.('[data-action]');
    const form=target.closest?.('form[data-form]');
    if(!form && (!actionEl || !commandActions.has(actionEl.dataset.action))) return;
    const before=getState().eventFeed?.[0]?.text||'';
    setTimeout(()=>{
      const after=getState().eventFeed?.[0]?.text||'';
      if(after && after!==before) toast(after,'success');
      else toast('Command could not be completed. Check ownership, resources, destination and available officers.','warning');
    },0);
  };
  root.addEventListener('click',e=>track(e.target),true);
  root.addEventListener('submit',e=>track(e.target),true);
}

function injectOfficerDock(root,s,setSelected,rerender){
  const top=root.querySelector('.topbar');
  if(!top) return;
  const officers=Object.values(s.officers)
    .filter(o=>o.faction===s.playerFaction&&o.status!=='dead')
    .sort((a,b)=>(tierRank[a.tier]??9)-(tierRank[b.tier]??9)||b.martial-a.martial);
  const dock=document.createElement('section');
  dock.className='ux-officer-dock';
  dock.innerHTML=`<div class="ux-dock-label"><span class="eyebrow">YOUR CHARACTERS</span><b>${officers.length} officers</b></div><div class="ux-officer-scroll">${officers.slice(0,14).map(o=>`<button class="ux-officer-chip" data-ux-character="${esc(o.id)}"><i>${avatar(o.name)}</i><span><b>${esc(o.name)}</b><small>${esc(o.tier)} · M${o.martial} · ${esc(officerLocation(s,o))}</small></span></button>`).join('')}</div><button class="ux-all-roster" data-ux-roster>All roster</button>`;
  top.insertAdjacentElement('afterend',dock);
  dock.querySelectorAll('[data-ux-character]').forEach(el=>el.addEventListener('click',()=>{setSelected({type:'character',id:el.dataset.uxCharacter});rerender()}));
  dock.querySelector('[data-ux-roster]')?.addEventListener('click',()=>{setSelected({type:'roster'});rerender()});
}

function injectStrongholdCharacters(context,s,selected,setSelected,rerender){
  if(selected?.type!=='stronghold') return;
  const h=s.strongholds[selected.id];
  if(!h) return;
  const present=Object.values(s.officers)
    .filter(o=>o.location===h.id&&o.status!=='dead'&&!o.assignedUnitId)
    .sort((a,b)=>(tierRank[a.tier]??9)-(tierRank[b.tier]??9)||b.martial-a.martial);
  const block=document.createElement('div');
  block.className='ux-present-characters subpanel';
  block.innerHTML=`<div class="ux-section-title"><h3>Characters at ${esc(h.name)}</h3><span>${present.length}</span></div>${present.length?`<div class="ux-character-grid">${present.map(o=>`<button data-ux-character="${esc(o.id)}" class="ux-character-card"><i>${avatar(o.name)}</i><span><b>${esc(o.name)}</b><small>${esc(o.faction)} · ${esc(o.status)} · M${o.martial}</small></span></button>`).join('')}</div>`:'<p class="muted">No characters are physically present at this stronghold.</p>'}`;
  const title=context.querySelector('.context-title');
  title?.insertAdjacentElement('afterend',block);
  block.querySelectorAll('[data-ux-character]').forEach(el=>el.addEventListener('click',()=>{setSelected({type:'character',id:el.dataset.uxCharacter});rerender()}));
}

function explainUnavailableForms(context){
  context.querySelectorAll('form[data-form="army"],form[data-form="transport"],form[data-form="assign-officer"]').forEach(form=>{
    const officer=form.querySelector('select[name="commander"],select[name="officer"]');
    const usable=officer&&[...officer.options].some(o=>o.value);
    if(!usable){
      form.querySelector('button[type="submit"],button:not([type])')?.setAttribute('disabled','disabled');
      const p=document.createElement('p');p.className='ux-inline-warning';p.textContent='No available officer is present here. A commander/officer must be physically at this stronghold.';form.appendChild(p);
    }
  });
}

export function enhanceUI(root,getState,selected,setSelected,rerender){
  bindFeedback(root,getState);
  const s=getState();
  injectOfficerDock(root,s,setSelected,rerender);
  const context=root.querySelector('.context');
  if(!context) return;
  if(!selected){context.classList.remove('ux-open');return}
  context.classList.add('ux-open');
  const close=document.createElement('button');
  close.className='ux-close';close.setAttribute('aria-label','Close command panel');close.textContent='×';
  close.addEventListener('click',()=>{setSelected(null);rerender()});
  context.prepend(close);
  injectStrongholdCharacters(context,s,selected,setSelected,rerender);
  explainUnavailableForms(context);
}
