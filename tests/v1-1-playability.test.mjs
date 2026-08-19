import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { createInitialState } from '../src/world.js';
import { getFactionAIProfile, runStrategicAI, AI_PLANNING_INTERVAL_MINUTES } from '../src/ai.js';
import { createTacticalState, tickTactical, runAutoBattle } from '../src/tactical.js';
import { step } from '../src/simulation.js';

test('v1.1 AI doctrines produce meaningfully different faction personalities',()=>{
  const s=createInitialState(20260819);
  const beasts=getFactionAIProfile(s,'beasts');
  const heart=getFactionAIProfile(s,'heart');
  const kid=getFactionAIProfile(s,'kid');
  const kurozumi=getFactionAIProfile(s,'kurozumi');
  assert.ok(beasts.aggression>heart.aggression);
  assert.ok(kid.aggression>kurozumi.aggression+.45);
  assert.ok(heart.caution>kid.caution+.45);
  assert.ok(heart.logistics>beasts.logistics);
  assert.ok(kurozumi.diplomacy>beasts.diplomacy+.5);
  assert.equal(AI_PLANNING_INTERVAL_MINUTES,90);
});

test('one AI planning cycle can issue multiple orders across the world',()=>{
  const s=createInitialState(424242);
  const before=s.stats.aiOrders;
  runStrategicAI(s);
  assert.ok(s.stats.aiOrders-before>=4,`expected multiple AI orders, got ${s.stats.aiOrders-before}`);
});

test('seven unattended days are more active than the v1.0 cadence',()=>{
  const s=createInitialState(606060);
  for(let i=0;i<7*48;i++)step(s,30);
  assert.ok(s.stats.aiOrders>=150,`AI orders too sparse: ${s.stats.aiOrders}`);
  assert.ok(s.stats.battlesResolved>=1,'world should generate autonomous conflict');
});

test('balanced tactical armies do not resolve in the opening seconds',()=>{
  const s=createInitialState(778899);
  s.armies.test_a={id:'test_a',factionId:'straw_hat',commanderId:'luffy',deputyId:null,troops:2200,food:900,morale:100,location:'kibi_camp',status:'battle'};
  s.armies.test_d={id:'test_d',factionId:'beasts',commanderId:'kaido',deputyId:null,troops:2200,food:900,morale:100,location:'kibi_camp',status:'battle'};
  const battle={id:'test',type:'field',strongholdId:'kibi_camp',attackerArmyIds:['test_a'],defenderArmyIds:['test_d'],attackerFaction:'straw_hat',defenderFaction:'beasts',garrisonTroops:0,garrisonMorale:100,status:'auto'};
  const t=createTacticalState(s,battle);
  for(let i=0;i<40;i++)tickTactical(s,t,.5); // 20 tactical seconds
  assert.equal(t.winner,null,`battle ended too quickly: ${t.winner} at ${t.elapsedSeconds}s`);
  battle.tactical=t;
  const winner=runAutoBattle(s,battle,1400);
  assert.ok(['attacker','defender','draw'].includes(winner));
});

test('strategic 3x no longer multiplies tactical tick a second time',()=>{
  const main=fs.readFileSync(new URL('../src/main.js',import.meta.url),'utf8');
  const sim=fs.readFileSync(new URL('../src/simulation.js',import.meta.url),'utf8');
  assert.match(main,/worldAcc\+=dt\*state\.speed/);
  assert.match(main,/tacticalAcc\+=dt\*\(state\.tacticalSpeed\|\|1\)/);
  assert.doesNotMatch(main,/tacticalAcc\+=dt\*state\.speed/);
  assert.match(sim,/tickTactical\(s,b\.tactical,seconds\)/);
  assert.doesNotMatch(sim,/seconds\*s\.speed/);
});

test('phone density layer keeps visual strongholds small while preserving hit-target architecture',()=>{
  const css=fs.readFileSync(new URL('../v1-1.css',import.meta.url),'utf8');
  const index=fs.readFileSync(new URL('../index.html',import.meta.url),'utf8');
  assert.match(index,/v1-1\.css/);
  assert.match(css,/@media\(max-width:600px\)/);
  assert.match(css,/\.stronghold > svg\{transform:scale\(\.49\)/);
  assert.match(css,/\.garrison\{display:none\}/);
  assert.match(css,/\.context\{position:relative;display:block;max-height:43dvh/);
});
