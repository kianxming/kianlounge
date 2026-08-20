import test from 'node:test';
import assert from 'node:assert/strict';
import { createWanoV2Scenario } from '../src/v2/data/wano-scenario.js';
import { bestOfficerAt, commandBudget, formArmy, orderArmyMarch, orderDevelopment, orderTransport } from '../src/v2/domain/commands.js';
import { commitCommandPhase, advanceOneDay, executeCurrentWindow, beginNextCommandPhase } from '../src/v2/core/engine.js';
import { runAllFactionMonthlyDirectors, runDailyReactiveDirector } from '../src/v2/ai/director.js';
import { validateStrategyState } from '../src/v2/domain/invariants.js';
import { deserializeStrategyState, serializeStrategyState } from '../src/v2/core/save.js';
import { diplomacyBetween } from '../src/v2/domain/diplomacy.js';

function valid(state,label='state'){const result=validateStrategyState(state);assert.equal(result.ok,true,`${label}: ${result.errors.join('\n')}`)}

test('full Wano V2 scenario starts with 130 physical officers, local settlements and serializable diplomacy',()=>{
  const state=createWanoV2Scenario();
  assert.equal(Object.keys(state.officers).length,130);
  assert.equal(Object.keys(state.settlements).length,14);
  assert.equal(diplomacyBetween(state,'straw_hat','beasts').status,'war');
  assert.equal(diplomacyBetween(state,'straw_hat','kozuki').status,'alliance');
  assert.equal(state.officers.luffy.assignment.nodeId,'kibi_camp');
  assert.ok(commandBudget(state,'straw_hat').remaining>0);
  valid(state);
});

test('domestic development occupies a real officer and resolves only after execution days',()=>{
  const state=createWanoV2Scenario();
  const officer=bestOfficerAt(state,'straw_hat','kibi_camp','politics');
  const before=state.settlements.kibi_camp.development;
  const op=orderDevelopment(state,{factionId:'straw_hat',nodeId:'kibi_camp',officerId:officer.id});
  assert.ok(op);assert.equal(state.officers[officer.id].assignment.kind,'operation');assert.equal(state.settlements.kibi_camp.development,before);
  commitCommandPhase(state);for(let i=0;i<23;i++)advanceOneDay(state);assert.equal(state.settlements.kibi_camp.development,before);
  advanceOneDay(state);assert.ok(state.settlements.kibi_camp.development>before);assert.equal(state.officers[officer.id].assignment.kind,'base');
});

test('player army and transport use the same physical map and monthly command budget',()=>{
  const state=createWanoV2Scenario();
  const luffy=state.officers.luffy,nami=state.officers.nami,before=commandBudget(state,'straw_hat').remaining;
  const army=formArmy(state,{factionId:'straw_hat',nodeId:'kibi_camp',commanderId:luffy.id,troops:1400,supplyPoints:140});assert.ok(army);
  const march=orderArmyMarch(state,{factionId:'straw_hat',armyId:army.id,destinationNodeId:'flower_capital',objective:'attack'});assert.ok(march);assert.ok(march.route.days>=12);
  const transport=orderTransport(state,{factionId:'straw_hat',originNodeId:'kibi_camp',destinationNodeId:'amigasa',commanderId:nami.id,cargo:{food:500}});assert.ok(transport);assert.ok(transport.outboundRoute.days>0);
  assert.ok(commandBudget(state,'straw_hat').remaining<=before-3);
  valid(state);
});

test('save/load restores diplomacy functions as well as physical campaign state',()=>{
  const state=createWanoV2Scenario();
  const army=formArmy(state,{factionId:'straw_hat',nodeId:'kibi_camp',commanderId:'luffy',troops:1200,supplyPoints:120});
  orderArmyMarch(state,{factionId:'straw_hat',armyId:army.id,destinationNodeId:'flower_capital',objective:'attack'});commitCommandPhase(state);for(let i=0;i<4;i++)advanceOneDay(state);
  const loaded=deserializeStrategyState(serializeStrategyState(state));
  assert.equal(loaded.hostile('straw_hat','beasts'),true);assert.equal(loaded.allied('straw_hat','kozuki'),true);assert.equal(loaded.armies[army.id].currentEdgeId,state.armies[army.id].currentEdgeId);valid(loaded);
});

test('360-day unattended campaign keeps creating late operations and conflict without corrupting state',()=>{
  const state=createWanoV2Scenario({seed:424242,playerFactionId:'observer'});
  const monthly=[];
  for(let month=1;month<=12;month++){
    commitCommandPhase(state,{strategicAI:s=>runAllFactionMonthlyDirectors(s,{playerFactionId:null})});
    executeCurrentWindow(state,{reactiveAI:s=>runDailyReactiveDirector(s,{playerFactionId:null})});
    valid(state,`month ${month}`);
    monthly.push({month,day:state.day,operations:Object.values(state.operations).filter(o=>o.startDay>state.day-30).length,battles:Object.values(state.battles).filter(b=>b.startDay>state.day-30).length,sieges:Object.values(state.sieges).filter(s=>s.startDay>state.day-30).length,aiOrders:state.stats.aiOrders});
    if(month<12)beginNextCommandPhase(state);
  }
  assert.equal(state.day,360);
  assert.ok(state.stats.aiOrders>=35,`too few AI orders: ${state.stats.aiOrders}`);
  const late=monthly.slice(6);
  assert.ok(late.reduce((s,m)=>s+m.operations,0)>=12,`late campaign froze: ${JSON.stringify(late)}`);
  assert.ok(Object.values(state.battles).some(b=>b.startDay>90),`no battle after opening quarter; total=${Object.keys(state.battles).length}`);
  assert.ok(Object.values(state.operations).some(o=>o.startDay>180&&['army_march','reinforcement','intercept','transport'].includes(o.type)),`no late physical operations`);
  for(const s of Object.values(state.settlements)){assert.ok(s.money>=0&&s.food>=0&&s.troops>=0)}
});
