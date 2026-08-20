import test from 'node:test';
import assert from 'node:assert/strict';
import { buildGraph } from '../src/v2/world/graph.js';
import { createArmyMarchOperation } from '../src/v2/core/operations.js';
import { createStrategyState, commitCommandPhase, advanceOneDay } from '../src/v2/core/engine.js';
import { serializeStrategyState, deserializeStrategyState, strategyStateDigest } from '../src/v2/core/save.js';

function army(id,factionId,nodeId,extra={}){
  return {id,factionId,officerIds:[],currentNodeId:nodeId,currentEdgeId:null,status:'waiting',troops:2000,supplies:400,morale:100,readiness:100,...extra};
}

test('save/load preserves exact day and edge progress in the middle of a long march',()=>{
  const graph=buildGraph([
    {id:'home',type:'base',ownerFactionId:'straw_hat'},
    {id:'pass',type:'pass',ownerFactionId:null},
    {id:'front',type:'base',ownerFactionId:'beasts'}
  ],[
    {id:'road_a',a:'home',b:'pass',baseDays:7},
    {id:'road_b',a:'pass',b:'front',baseDays:9}
  ]);
  const state=createStrategyState({graph,armies:{a:army('a','straw_hat','home')},hostile:(a,b)=>a!==b});
  const op=createArmyMarchOperation(state,{armyId:'a',destinationNodeId:'front',objective:'attack'});
  commitCommandPhase(state);
  for(let i=0;i<3;i++)advanceOneDay(state);
  assert.equal(state.day,3);
  assert.equal(state.armies.a.currentEdgeId,'road_a');
  assert.equal(op.edgeDaysRemaining,4);

  const loaded=deserializeStrategyState(serializeStrategyState(state),{hostile:(a,b)=>a!==b});
  assert.equal(loaded.day,3);
  assert.equal(loaded.armies.a.currentEdgeId,'road_a');
  assert.equal(loaded.operations[op.id].edgeDaysRemaining,4);
  assert.equal(strategyStateDigest(loaded),strategyStateDigest(state));

  advanceOneDay(state);
  advanceOneDay(loaded);
  assert.equal(strategyStateDigest(loaded),strategyStateDigest(state),'continued deterministic state must match after reload');
});

test('save/load preserves an ongoing road battle including accumulated battle days and daily history',()=>{
  const graph=buildGraph([
    {id:'west',type:'base',ownerFactionId:'straw_hat'},
    {id:'east',type:'base',ownerFactionId:'beasts'}
  ],[
    {id:'road',a:'west',b:'east',baseDays:8}
  ]);
  const state=createStrategyState({
    graph,
    armies:{a:army('a','straw_hat','west',{supplies:999}),b:army('b','beasts','east',{supplies:999})},
    hostile:(a,b)=>a!==b
  });
  createArmyMarchOperation(state,{armyId:'a',destinationNodeId:'east',objective:'attack'});
  createArmyMarchOperation(state,{armyId:'b',destinationNodeId:'west',objective:'attack'});
  commitCommandPhase(state);
  for(let i=0;i<5;i++)advanceOneDay(state);
  const battle=Object.values(state.battles)[0];
  assert.equal(battle.status,'ongoing');
  assert.equal(battle.elapsedBattleDays,5);
  assert.equal(battle.dailyHistory.length,5);

  const loaded=deserializeStrategyState(serializeStrategyState(state),{hostile:(a,b)=>a!==b});
  const loadedBattle=loaded.battles[battle.id];
  assert.equal(loadedBattle.status,'ongoing');
  assert.equal(loadedBattle.elapsedBattleDays,5);
  assert.deepEqual(loadedBattle.dailyHistory,battle.dailyHistory);
  assert.equal(strategyStateDigest(loaded),strategyStateDigest(state));

  advanceOneDay(state);
  advanceOneDay(loaded);
  assert.equal(strategyStateDigest(loaded),strategyStateDigest(state));
});
