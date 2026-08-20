import test from 'node:test';
import assert from 'node:assert/strict';
import {V3Sim} from '../src/v3/core/sim.js';
import {issueBattleCommand} from '../src/v3/core/battle.js';

test('V3 starts with only the eight player-side village characters',()=>{
  const s=new V3Sim();
  assert.equal(s.characters.length,8);
  assert.deepEqual(s.characters.map(c=>c.id).sort(),['chopper','franky','luffy','nami','robin','sanji','usopp','zoro']);
});

test('V3 village agents use facilities and create revenue',()=>{
  const s=new V3Sim();
  for(let i=0;i<500;i++)s.tick(.1);
  assert.ok(s.facilities.some(f=>f.uses>0));
  assert.ok(s.money>=25800);
});

test('V3 supports lightweight road placement without adding a new resource system',()=>{
  const s=new V3Sim();
  let spot=null;
  for(let y=0;y<13&&!spot;y++)for(let x=0;x<18&&!spot;x++)if(s.canBuildRoad(x,y))spot=[x,y];
  assert.ok(spot);
  const before=s.roads.size;
  assert.equal(s.buildRoad(...spot),true);
  assert.equal(s.roads.size,before+1);
  assert.equal(s.money,25800-40);
});

test('V3 scout mode is a live read-only enemy village simulation',()=>{
  const s=new V3Sim();
  assert.equal(s.startScout('bakura'),true);
  assert.equal(s.mode,'scout');
  assert.equal(s.scout.characters.length,3);
  for(let i=0;i<500;i++)s.tick(.1);
  assert.ok(s.scout.facilities.some(f=>f.uses>0));
});

test('V3 sortie deducts real troops, reaches encounter and auto pauses',()=>{
  const s=new V3Sim(),before=s.availableTroops();
  assert.equal(s.dispatch('bakura',['luffy','zoro','sanji'],1200),true);
  assert.equal(s.availableTroops(),before-1200);
  for(let i=0;i<300&&!s.encounter;i++)s.tick(.1);
  assert.ok(s.encounter);
  assert.equal(s.paused,true);
  assert.equal(s.encounter.playerSide,'attacker');
});

test('V3 named characters decide battle even after troop line collapses',()=>{
  const s=new V3Sim();
  s.dispatch('bakura',['luffy','zoro'],1200);
  for(let i=0;i<300&&!s.encounter;i++)s.tick(.1);
  s.startBattle();
  s.battle.enemyTroops=0;
  s.tick(.8);
  assert.equal(s.battle.enemyLineBroken,true);
  assert.equal(s.battle.finished,false);
  assert.ok(s.battle.enemies.some(e=>!e.down));
});

test('V3 battle supports explicit one-on-one, many-on-one and light commands',()=>{
  const s=new V3Sim();
  s.dispatch('bakura',['luffy','zoro','sanji'],1200);
  for(let i=0;i<300&&!s.encounter;i++)s.tick(.1);
  s.startBattle();
  s.setBattleFocus('luffy','jack');
  s.setBattleFocus('zoro','jack');
  assert.equal(s.battle.focus.luffy,'jack');
  assert.equal(s.battle.focus.zoro,'jack');
  assert.ok(s.battle.log.some(x=>x.includes('2대1 협공')));
  assert.equal(issueBattleCommand(s,'assault'),true);
  assert.equal(issueBattleCommand(s,'rally'),true);
  assert.equal(issueBattleCommand(s,'special'),true);
  assert.equal(issueBattleCommand(s,'assault'),false);
  let guard=0;while(!s.battle.finished&&guard++<1200)s.tick(.1);
  assert.equal(s.battle.finished,true);
});

test('V3 general gear is bought autonomously while special treasure is player-gifted',()=>{
  const s=new V3Sim(),c=s.characters.find(x=>x.id==='usopp'),shop=s.facilities.find(f=>f.type==='shop');
  c.personalMoney=5000;
  assert.equal(s.tryAutoBuyGear(c,shop),true);
  assert.equal(c.gearRank,2);
  const r=s.giveTreasure('fruit_mera','usopp');
  assert.equal(r.ok,true);
  assert.equal(c.hasFruit,true);
  assert.equal(s.treasury.includes('fruit_mera'),false);
  assert.equal(s.giveTreasure('sword_shusui','zoro').ok,true);
});

test('V3 prisoner persuasion enforces cooldown and invasion can free matching prisoners',()=>{
  const s=new V3Sim();
  s.capture('king','onigashima');
  s.persuade('king');
  const p=s.prisoners.find(x=>x.id==='king');
  if(p)assert.equal(p.cooldown,true);
  s.prisoners=[];s.capture('queen','udon');
  const army={owner:'beasts',charIds:[]},old=Math.random;
  Math.random=()=>0;
  try{const escaped=s.tryPrisonBreak(army,'flower_capital');assert.equal(escaped.length,1);assert.ok(army.charIds.includes('queen'));}
  finally{Math.random=old;}
});

test('V3 enemy faction can launch a continuous-time invasion and create a defensive encounter',()=>{
  const s=new V3Sim();
  assert.equal(s.spawnEnemySortie(),true);
  const a=s.armies.find(x=>x.owner==='beasts'&&!x.done);assert.ok(a);
  a.duration=.01;s.updateArmies(1);
  assert.ok(s.encounter);
  assert.equal(s.encounter.playerSide,'defender');
  s.startBattle();
  assert.equal(s.battle.playerSide,'defender');
});

test('V3 save snapshot restores simulation state without restoring modal combat scenes',()=>{
  const s=new V3Sim();
  s.money=12345;s.fame=987;s.giveTreasure('sword_shusui','zoro');
  const restored=new V3Sim(s.snapshot());
  assert.equal(restored.money,12345);
  assert.equal(restored.fame,987);
  assert.equal(restored.treasury.includes('sword_shusui'),false);
  assert.ok(restored.characters.find(c=>c.id==='zoro').specialItems.includes('sword_shusui'));
  assert.equal(restored.mode,'village');
  assert.equal(restored.battle,null);
});
