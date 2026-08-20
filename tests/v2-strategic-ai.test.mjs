import test from 'node:test';
import assert from 'node:assert/strict';
import { buildGraph } from '../src/v2/world/graph.js';
import { createStrategyState } from '../src/v2/core/engine.js';
import { getFactionStrategicProfile, planFactionMonth } from '../src/v2/ai/strategic.js';
import { validateStrategyState } from '../src/v2/domain/invariants.js';

function army(id,factionId,nodeId,extra={}){
  return {id,factionId,officerIds:[],currentNodeId:nodeId,currentEdgeId:null,status:'waiting',troops:2000,supplies:800,morale:100,readiness:100,...extra};
}

function duelGraph(days=35){
  return buildGraph([
    {id:'kid_home',type:'base',ownerFactionId:'kid'},
    {id:'heart_home',type:'base',ownerFactionId:'heart'},
    {id:'enemy',type:'base',ownerFactionId:'beasts',garrisonTroops:0,strategicValue:30}
  ],[
    {id:'kid_route',a:'kid_home',b:'enemy',baseDays:days},
    {id:'heart_route',a:'heart_home',b:'enemy',baseDays:days}
  ]);
}

test('leader traits modify faction strategic doctrine rather than being cosmetic labels',()=>{
  const graph=duelGraph();
  const state=createStrategyState({
    graph,
    factions:{heart:{id:'heart',leaderId:'law'}},
    officers:{law:{id:'law',traits:['Strategist','Calm']}}
  });
  const profile=getFactionStrategicProfile(state,'heart');
  assert.equal(profile.leaderId,'law');
  assert.equal(profile.opportunism,1);
  assert.equal(profile.logistics,1);
  assert.equal(profile.caution,1);
});

test('aggressive Kid accepts a long viable campaign that cautious Heart declines in the same month',()=>{
  const graph=duelGraph(35);
  const state=createStrategyState({
    graph,
    factions:{kid:{id:'kid'},heart:{id:'heart'},beasts:{id:'beasts'}},
    armies:{
      kid_force:army('kid_force','kid','kid_home'),
      heart_force:army('heart_force','heart','heart_home')
    },
    hostile:(a,b)=>a!==b
  });
  const kidOrders=planFactionMonth(state,'kid');
  const heartOrders=planFactionMonth(state,'heart');
  assert.equal(kidOrders.length,1);
  assert.equal(kidOrders[0].destinationNodeId,'enemy');
  assert.equal(heartOrders.length,0);
  assert.equal(state.factions.heart.aiState.inactivityMonths,1);
  const checked=validateStrategyState(state);
  assert.equal(checked.ok,true,checked.errors.join('\n'));
});

test('inactivity pressure prevents a viable cautious faction from remaining passive forever',()=>{
  const graph=duelGraph(31);
  const state=createStrategyState({
    graph,
    factions:{heart:{id:'heart'},beasts:{id:'beasts'}},
    armies:{heart_force:army('heart_force','heart','heart_home',{supplies:900})},
    hostile:(a,b)=>a!==b
  });
  const first=planFactionMonth(state,'heart');
  assert.equal(first.length,0);
  assert.equal(state.factions.heart.aiState.inactivityMonths,1);
  const second=planFactionMonth(state,'heart');
  assert.equal(second.length,1,'a viable force should eventually receive an order instead of idling forever');
  assert.equal(state.factions.heart.aiState.inactivityMonths,0);
  assert.equal(state.armies.heart_force.status,'moving');
});

test('even an aggressive faction refuses an expedition it cannot provision',()=>{
  const graph=duelGraph(20);
  const state=createStrategyState({
    graph,
    factions:{kid:{id:'kid'},beasts:{id:'beasts'}},
    armies:{kid_force:army('kid_force','kid','kid_home',{supplies:20,troops:3000})},
    hostile:(a,b)=>a!==b
  });
  const orders=planFactionMonth(state,'kid');
  assert.equal(orders.length,0);
  assert.equal(state.armies.kid_force.status,'waiting');
  assert.equal(state.factions.kid.aiState.inactivityMonths,1);
});
