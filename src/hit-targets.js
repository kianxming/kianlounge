const SVG_NS='http://www.w3.org/2000/svg';

function ensureCircle(group,cls,r){
  let hit=group.querySelector(`:scope > .${cls}`);
  if(!hit){
    hit=document.createElementNS(SVG_NS,'circle');
    hit.setAttribute('class',cls);
    hit.setAttribute('r',String(r));
    hit.setAttribute('cx','0');
    hit.setAttribute('cy','0');
    hit.setAttribute('aria-hidden','true');
    // Copy semantic selection data onto the painted hit surface itself.
    if(group.dataset.select)hit.dataset.select=group.dataset.select;
    if(group.dataset.id)hit.dataset.id=group.dataset.id;
    group.insertBefore(hit,group.firstChild);
  }
  return hit;
}

function pointOf(group){
  const m=String(group.getAttribute('transform')||'').match(/translate\(\s*([-\d.]+)[ ,]+([-\d.]+)\s*\)/);
  return m?{x:Number(m[1]),y:Number(m[2])}:null;
}

export function installMapHitTargets(root){
  const strongholds=[...root.querySelectorAll('#strategy-map g.stronghold[data-select="stronghold"]')];
  const strongholdPoints=strongholds.map(g=>({g,p:pointOf(g)})).filter(x=>x.p);
  // On the phone map 4.8 map-units is roughly a 44px target after the wider map layout.
  // The old 6.4 radius made neighboring Wano strongholds overlap each other's touch regions.
  strongholds.forEach(g=>ensureCircle(g,'stronghold-hit',4.8));

  root.querySelectorAll('#strategy-map g.unit[data-select]').forEach(g=>{
    const hit=ensureCircle(g,'unit-hit',4.0);
    const p=pointOf(g);
    // When a moving/waiting unit visually overlaps a city, the city remains the primary touch target.
    // The unit is still selectable everywhere else and through its detail lists.
    const overlaps=p&&strongholdPoints.some(x=>Math.hypot(p.x-x.p.x,p.y-x.p.y)<5.0);
    hit.style.pointerEvents=overlaps?'none':'all';
  });

  root.querySelectorAll('#strategy-map g.battle-marker[data-select="battle"]').forEach(g=>ensureCircle(g,'battle-hit',4.2));
}