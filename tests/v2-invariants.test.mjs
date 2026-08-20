import test from 'node:test';
import assert from 'node:assert/strict';
import { buildGraph } from '../src/v2/world/graph.js';
import { createArmyMarchOperation } from '../src/v2/core/operations.js';
import { createStrategyState, commitCommandPhase, advanceOneDay } from '../src/v2/core/engine.js';
import { validateStrategyState } from '../src/v2/domain/invariants.js';

function army(id,factionId,nodeId,extra={}){
  return {id,factionId,officerIds:[],currentNodeId:nodeId,currentEdgeId:null,status:'waiting',troops:1800,supplies:200,morale:100,readiness:100,...extra};
}

test('normal V2 movement and road battle states satisfy structural invariants',()=>{
  const graph=buildGraph([
    {id:'west',type:'base',ownerFactionId:'straw_hat'},
    {id:'east',type:'base',ownerFactionId:'beasts'}
  ],[
    {id:'road',a:'west',b:'east',baseDays:6}
  ]);
  const state=createStrategyState({
    graph,
    armies:{a:army('a','straw_hat','west'),b:army('b','beasts','east')},
    hostile:(a,b)=>a!==b
  });
  createArmyMarchOperation(state,{armyId:'a',destinationNodeId:'east',objective:'attack'});
  createArmyMarchOperation(state,{armyId:'b',destinationNodeId:'west',objective:'attack'});
  assert.deepEqual(validateStrategyState(state),{ok:true,errors:[]});
  commitCommandPhase(state);
  advanceOneDay(state);
  const checked=validateStrategyState(state);
  assert.equal(checked.ok,true,checked.errors.join('\n'));
  assert.equal(Object.values(state.battles).length,1);
});

test('validator catches impossible simultaneous node/edge occupancy and stale battle linkage',()=>{
  const graph=buildGraph([
    {id:'west',type:'base',ownerFactionId:'straw_hat'},
    {id:'east',type:'base',ownerFactionId:'beasts'}
  ],[
    {id:'road',a:'west',b:'east',baseDays:3}
  ]);
  const state=createStrategyState({graph,armies:{a:army('a','straw_hat','west')}});
  state.armies.a.currentEdgeId='road';
  state.armies.a.battleId='ghost_battle';
  const checked=validateStrategyState(state);
  assert.equal(checked.ok,false);
  assert.ok(checked.errors.some(x=>x.includes('cannot occupy node')));
  assert.ok(checked.errors.some(x=>x.includes('still references battle')));
  assert.throws(()=>validateStrategyState(state,{throwOnError:true}),/invariant violation/);
});
