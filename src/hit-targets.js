const SVG_NS='http://www.w3.org/2000/svg';

function ensureCircle(group,cls,r){
  if(group.querySelector(`:scope > .${cls}`))return;
  const hit=document.createElementNS(SVG_NS,'circle');
  hit.setAttribute('class',cls);
  hit.setAttribute('r',String(r));
  hit.setAttribute('cx','0');
  hit.setAttribute('cy','0');
  hit.setAttribute('aria-hidden','true');
  group.insertBefore(hit,group.firstChild);
}

export function installMapHitTargets(root){
  root.querySelectorAll('#strategy-map g.stronghold[data-select="stronghold"]').forEach(g=>ensureCircle(g,'stronghold-hit',6.4));
  root.querySelectorAll('#strategy-map g.unit[data-select]').forEach(g=>ensureCircle(g,'unit-hit',5.8));
  root.querySelectorAll('#strategy-map g.battle-marker[data-select="battle"]').forEach(g=>ensureCircle(g,'battle-hit',6));
}
