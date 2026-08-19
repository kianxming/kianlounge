const base='./assets/v1-art.svg';
export const assetUse=(id,cls='asset-icon',label='')=>`<svg class="${cls}" viewBox="0 0 100 100" ${label?`aria-label="${label}" role="img"`:'aria-hidden="true"'}><use href="${base}#${id}"></use></svg>`;

export const factionAsset=id=>`faction-${id}`;
export const portraitAsset=id=>({
  luffy:'portrait-luffy',zoro:'portrait-zoro',sanji:'portrait-sanji',kaido:'portrait-kaido',
  big_mom:'portrait-big_mom',law:'portrait-law',kid:'portrait-kid',yamato:'portrait-yamato',
  king:'portrait-king',queen:'portrait-queen'
}[id]||'portrait-generic');

export const frameAsset=tier=>`frame-${String(tier||'minor').toLowerCase()}`;

export const strongholdAsset=id=>({
  flower_capital:'stronghold-capital',ebisu:'stronghold-village',onigashima:'stronghold-fortress',
  udon_prison:'stronghold-prison',tokage_port:'stronghold-port',bakura:'stronghold-town',
  amigasa:'stronghold-village',itachi_port:'stronghold-port',habu_port:'stronghold-port',
  mogura_port:'stronghold-port',ringo:'stronghold-cemetery',kaeru_port:'stronghold-port',
  kibi_camp:'stronghold-camp',big_mom_anchorage:'stronghold-anchorage'
}[id]||'stronghold-town');

export const fruitAsset=id=>`fruit-${id}`;
export const weaponAsset=id=>`weapon-${id}`;
export const hakiAsset=line=>`haki-${line}`;

export const tacticalAsset=officerId=>({
  kaido:'sprite-kaido',law:'sprite-law',zoro:'sprite-zoro',chopper:'sprite-chopper'
}[officerId]||'sprite-generic');
