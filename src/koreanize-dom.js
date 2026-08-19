import { koCharacter, koFaction, koStronghold } from './i18n.js';

const RELEASE_LABEL='v1.1.0';

const factionShorts = {
  'Straw Hats':'밀짚모자 일당',
  'Beasts':'백수 해적단',
  'Kozuki':'코즈키 세력',
  'Kurozumi':'쿠로즈미 세력',
  'Heart':'하트 해적단',
  'Kid':'키드 해적단',
  'Big Mom':'빅 맘 해적단'
};

function replacements(state){
  const pairs=[];
  for(const h of Object.values(state.strongholds||{})){
    if(h?.name)pairs.push([h.name,koStronghold(h.id)]);
  }
  for(const o of Object.values(state.officers||{})){
    if(o?.name)pairs.push([o.name,koCharacter(o.name)]);
  }
  for(const [en,ko] of Object.entries(factionShorts))pairs.push([en,ko]);
  return pairs.filter(([a,b])=>a&&b&&a!==b).sort((a,b)=>b[0].length-a[0].length);
}

function replaceText(text,pairs){
  let out=text;
  for(const [from,to] of pairs)out=out.split(from).join(to);
  return out;
}

function applyReleaseLabel(root){
  const badge=root.querySelector('.brand em');
  if(badge)badge.textContent=RELEASE_LABEL;
  const footer=root.querySelector('footer');
  if(footer&&footer.textContent.includes('v1.0.0'))footer.textContent=footer.textContent.replace('v1.0.0',RELEASE_LABEL);
}

export function koreanizeDynamicDOM(root,state){
  applyReleaseLabel(root);
  const pairs=replacements(state);
  const scopes=root.querySelectorAll('.feed, .ui-notice, .battle-card, .tlog');
  for(const scope of scopes){
    const walker=document.createTreeWalker(scope,NodeFilter.SHOW_TEXT);
    const nodes=[];
    while(walker.nextNode())nodes.push(walker.currentNode);
    for(const node of nodes){
      const next=replaceText(node.nodeValue||'',pairs);
      if(next!==node.nodeValue)node.nodeValue=next;
    }
  }
}
