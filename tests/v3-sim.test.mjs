import test from 'node:test';
import assert from 'node:assert/strict';
import {V3Sim} from '../src/v3/core/sim.js';

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

test('V3 sortie reaches encounter and auto pauses',()=>{
  const s=new V3Sim();
  assert.equal(s.dispatch('bakura',['luffy','zoro','sanji'],1200),true);
  for(let i=0;i<300&&!s.encounter;i++)s.tick(.1);
  assert.ok(s.encounter);
  assert.equal(s.paused,true);
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

test('V3 battle supports explicit one-on-one and many-on-one focus',()=>{
  const s=new V3Sim();
  s.dispatch('bakura',['luffy','zoro','sanji'],2400);
  for(let i=0;i<300&&!s.encounter;i++)s.tick(.1);
  s.startBattle();
  s.setBattleFocus('luffy','jack');
  s.setBattleFocus('zoro','jack');
  assert.equal(s.battle.focus.luffy,'jack');
  assert.equal(s.battle.focus.zoro,'jack');
  assert.ok(s.battle.log.some(x=>x.includes('2대1 협공')));
  let guard=0;while(!s.battle.finished&&guard++<1200)s.tick(.1);
  assert.equal(s.battle.finished,true);
});

test('V3 prisoner persuasion enforces cooldown',()=>{
  const s=new V3Sim();
  s.capture('king','onigashima');
  s.persuade('king');
  const p=s.prisoners.find(x=>x.id==='king');
  if(p)assert.equal(p.cooldown,true);
});
