import test from 'node:test';
import assert from 'node:assert/strict';
import { buildGraph } from '../src/v2/world/graph.js';
import { createStrategyState, commitCommandPhase, advanceOneDay } from '../src/v2/core/engine.js';
import { createSiege } from '../src/v2/domain/sieges.js';
import { evaluateArmySupply } from '../src/v2/domain/supply.js';
import { enemyStrengthAtNode, planFactionMonth } from '../src/v2/ai/strategic.js';
import { validateStrategyState } from '../src/v2/domain/invariants.js';

function army(id,factionId,nodeId,extra={}){
  return {id,factionId,officerIds:[],currentNodeId:nodeId,currentEdgeId:null,status:'waiting',troops:2500,supplies:300,morale:100,readiness:100,...extra};
}

function settlement(id,ownerFactionId,extra={}){
  return {id,nodeId:id,ownerFactionId,money:2000,food:3000,troops:1500,development:45,cap:100,market:40,agriculture:45,morale:80,...extra};
}

test('a besieging army still consumes campaign supplies every day',()=>{
  const graph=buildGraph([
    {id:'home',type:'base',ownerFactionId:'straw_hat'},
    {id:'target',type:'base',ownerFactionId:'beasts'}
  ],[{id:'road',a:'home',b:'target',baseDays:4}]);
  const state=createStrategyState({
    graph,
    settlements:[settlement('target','beasts',{troops:5000,food:5000,morale:95})],
    armies:{attack:army('attack','straw_hat','target',{originNodeId:'home',supplySourceNodeId:'home',supplies:100,troops:3000})},
    hostile:(a,b)=>a!==b
  });
  createSiege(state,{nodeId:'target',attackerArmyId:'attack'});
  const before=state.armies.attack.supplies;
  commitCommandPhase(state);
  advanceOneDay(state);
  assert.equal(state.armies.attack.status,'siege');
  assert.ok(state.armies.attack.supplies<before,'siege must not become a free-supply state');
});

test('a hostile stronghold on the only rear route physically interdicts supply',()=>{
  const graph=buildGraph([
    {id:'home',type:'base',ownerFactionId:'straw_hat'},
    {id:'enemy_gate',type:'base',ownerFactionId:'beasts'},
    {id:'front',type:'base',ownerFactionId:'straw_hat'}
  ],[
    {id:'rear_a',a:'home',b:'enemy_gate',baseDays:3},
    {id:'rear_b',a:'enemy_gate',b:'front',baseDays:3}
  ]);
  const state=createStrategyState({
    graph,
    settlements:[settlement('enemy_gate','beasts')],
    armies:{front:army('front','straw_hat','front',{originNodeId:'home',supplySourceNodeId:'home'})},
    hostile:(a,b)=>a!==b
  });
  const info=evaluateArmySupply(state,state.armies.front);
  assert.equal(info.state,'cut');
  assert.equal(info.route,null);
});

test('strategic AI reads local settlement garrisons and prefers the genuinely weaker objective',()=>{
  const graph=buildGraph([
    {id:'kid_home',type:'base',ownerFactionId:'kid'},
    {id:'weak_target',type:'base',ownerFactionId:'beasts',strategicValue:30},
    {id:'strong_target',type:'base',ownerFactionId:'beasts',strategicValue:30}
  ],[
    {id:'weak_road',a:'kid_home',b:'weak_target',baseDays:8},
    {id:'strong_road',a:'kid_home',b:'strong_target',baseDays:8}
  ]);
  const state=createStrategyState({
    graph,
    settlements:[
      settlement('weak_target','beasts',{troops:450,development:35}),
      settlement('strong_target','beasts',{troops:6200,development:35})
    ],
    factions:{kid:{id:'kid'},beasts:{id:'beasts'}},
    armies:{kid_force:army('kid_force','kid','kid_home',{troops:3000,supplies:900})},
    hostile:(a,b)=>a!==b
  });
  assert.equal(enemyStrengthAtNode(state,'kid','strong_target'),6200);
  const orders=planFactionMonth(state,'kid');
  assert.equal(orders.length,1);
  assert.equal(orders[0].destinationNodeId,'weak_target');
  assert.equal(orders[0].payload.estimatedEnemyStrength,450);
  const checked=validateStrategyState(state);
  assert.equal(checked.ok,true,checked.errors.join('\n'));
});
