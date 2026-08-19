import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const view=fs.readFileSync(new URL('../src/view.js',import.meta.url),'utf8');
const ui=fs.readFileSync(new URL('../src/ui.js',import.meta.url),'utf8');
const main=fs.readFileSync(new URL('../src/main.js',import.meta.url),'utf8');
const hitTargets=fs.readFileSync(new URL('../src/hit-targets.js',import.meta.url),'utf8');
const i18n=fs.readFileSync(new URL('../src/i18n.js',import.meta.url),'utf8');
const art=fs.readFileSync(new URL('../assets/v1-art.svg',import.meta.url),'utf8');
const polish=fs.readFileSync(new URL('../v1-polish.css',import.meta.url),'utf8');

test('v1 UI is Korean-first and map-first',()=>{
  for(const token of ['전략 지도','병력 모집','군단 편성','수송대 편성','인물 일람','외교','특수 물품','수동 지휘']) assert.match(view,new RegExp(token));
  assert.match(i18n,/몽키 D\. 루피/);
  assert.match(i18n,/백수 해적단/);
});

test('input uses one delegated root listener instead of per-render element binding',()=>{
  assert.match(ui,/delegatedUiBound/);
  assert.match(ui,/root\.addEventListener\('click'/);
  assert.doesNotMatch(ui,/querySelectorAll\([^)]*\)\.forEach\(el=>el\.addEventListener/);
});

test('auto render cannot replace DOM during pointer click and form submit sequence',()=>{
  assert.match(main,/interactionUntil/);
  assert.match(main,/pointerdown/);
  assert.match(main,/pointermove/);
  assert.match(main,/root\.addEventListener\('submit'/);
  assert.match(main,/if\(interactionLocked\)return true/);
});

test('map has explicit painted hit geometry and decorative SVG cannot steal input',()=>{
  assert.match(main,/installMapHitTargets/);
  assert.match(hitTargets,/stronghold-hit/);
  assert.match(hitTargets,/ensureCircle\(g,'stronghold-hit',6\.4\)/);
  assert.match(polish,/#strategy-map\{pointer-events:none/);
  assert.match(polish,/#strategy-map \.stronghold,#strategy-map \.unit,#strategy-map \.battle-marker\{pointer-events:all\}/);
  assert.match(polish,/\.stronghold-hit,.unit-hit,.battle-hit\{fill:#000;fill-opacity:\.001;stroke:none;pointer-events:all\}/);
  assert.match(polish,/\.stronghold-name,.garrison\{pointer-events:none\}/);
  assert.match(polish,/@media\(max-width:1280px\)/);
  assert.match(polish,/\.topbar,.officer-dock\{position:relative;top:0;z-index:auto\}/);
});

test('v1 art sheet contains required production asset categories',()=>{
  for(const id of [
    'faction-straw_hat','faction-beasts','stronghold-capital','frame-core',
    'portrait-luffy','portrait-zoro','portrait-sanji','portrait-kaido','portrait-big_mom','portrait-law','portrait-kid','portrait-yamato','portrait-king','portrait-queen',
    'fruit-fruit_nika','fruit-fruit_ope','weapon-weapon_enma','weapon-weapon_kikoku',
    'haki-armament','haki-observation','haki-conqueror',
    'sprite-kaido','sprite-law','sprite-zoro','sprite-chopper'
  ]) assert.match(art,new RegExp(`id="${id}"`));
});
