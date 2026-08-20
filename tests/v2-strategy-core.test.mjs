import test from 'node:test';
import assert from 'node:assert/strict';
import { buildGraph, shortestRoute } from '../src/v2/world/graph.js';
import { createOfficerMission, beginArmyRetreat } from '../src/v2/core/operations.js';
import {
  createStrategyState, commitCommandPhase, advanceOneDay, executeCurrentWindow,
  beginNextCommandPhase, runStrategicTurn
} from '../src/v2/core/engine.js';

function missionGraph(){
  return buildGraph([
    {id:'home',type:'base',ownerFactionId:'straw_hat'},
    {id:'mountain_pass',type:'pass',ownerFactionId:null},
    {id:'far_town',type:'base',ownerFactionId:null}
  ],[
    {id:'road_a',a:'home',b:'mountain_pass',baseDays:18},
    {id:'road_b',a:'mountain_pass',b:'far_town',baseDays:19}
  ]);
}

test('route ETA is the sum of explicit strategic edges rather than screen distance',()=>{
  const route=shortestRoute(missionGraph(),'home','far_town');
  assert.deepEqual(route.edgeIds,['road_a','road_b']);
  assert.deepEqual(route.edgeDays,[18,19]);
  assert.equal(route.days,37);
});

test('115-day recruitment mission persists across monthly command cycles and returns physically',()=>{
  const state=createStrategyState({
    graph:missionGraph(),
    officers:{nami:{id:'nami',factionId:'straw_hat',assignment:{kind:'base',nodeId:'home'}}}
  });
  const op=createOfficerMission(state,{
    type:'recruitment',officerId:'nami',originNodeId:'home',destinationNodeId:'far_town',
    prepareDays:4,taskDays:37,returnRequired:true
  });
  assert.equal(op.status,'preparing');
  assert.equal(state.officers.nami.assignment.kind,'operation');

  for(let turn=0;turn<3;turn++){
    commitCommandPhase(state);executeCurrentWindow(state);beginNextCommandPhase(state);
  }
  assert.equal(state.day,90);
  assert.equal(op.status,'returning');
  assert.equal(state.officers.nami.assignment.kind,'operation');

  commitCommandPhase(state);
  for(let i=0;i<24;i++)advanceOneDay(state);
  assert.equal(state.day,114);
  assert.notEqual(op.status,'completed');
  advanceOneDay(state);
  assert.equal(state.day,115);
  assert.equal(op.status,'completed');
  assert.deepEqual(state.officers.nami.assignment,{kind:'base',nodeId:'home'});
});

test('failed siege starts a multi-edge retreat and officers never remain stationed in the unconquered target',()=>{
  const graph=buildGraph([
    {id:'flower_capital',type:'base',ownerFactionId:'kurozumi'},
    {id:'south_gate',type:'gate',ownerFactionId:null},
    {id:'kibi_camp',type:'base',ownerFactionId:'straw_hat'}
  ],[
    {id:'capital_gate_road',a:'flower_capital',b:'south_gate',baseDays:5},
    {id:'kibi_road',a:'south_gate',b:'kibi_camp',baseDays:6}
  ]);
  const state=createStrategyState({
    graph,
    officers:{
      luffy:{id:'luffy',factionId:'straw_hat',assignment:{kind:'army',armyId:'army_1'}},
      zoro:{id:'zoro',factionId:'straw_hat',assignment:{kind:'army',armyId:'army_1'}}
    },
    armies:{army_1:{id:'army_1',factionId:'straw_hat',officerIds:['luffy','zoro'],currentNodeId:'flower_capital',currentEdgeId:null,status:'defeated'}}
  });
  commitCommandPhase(state);
  const retreat=beginArmyRetreat(state,'army_1',{preferredNodeId:'kibi_camp'});
  assert.ok(retreat);
  assert.equal(retreat.route.days,11);
  assert.equal(state.armies.army_1.currentNodeId,null,'army must leave hostile city location as soon as retreat begins');
  assert.equal(state.armies.army_1.currentEdgeId,'capital_gate_road');
  assert.deepEqual(state.officers.luffy.assignment,{kind:'army',armyId:'army_1'});
  assert.deepEqual(state.officers.zoro.assignment,{kind:'army',armyId:'army_1'});

  for(let i=0;i<10;i++)advanceOneDay(state);
  assert.notEqual(state.armies.army_1.currentNodeId,'flower_capital');
  advanceOneDay(state);
  assert.equal(state.armies.army_1.currentNodeId,'kibi_camp');
  assert.equal(state.armies.army_1.currentEdgeId,null);
  assert.equal(state.armies.army_1.status,'waiting');
});

test('strategic AI plans once per monthly command phase while reactive AI is bounded to daily execution',()=>{
  const state=createStrategyState({graph:missionGraph()});
  let plans=0,reactions=0;
  runStrategicTurn(state,{strategicAI:()=>plans++,reactiveAI:()=>reactions++});
  assert.equal(plans,1);
  assert.equal(reactions,30);
  assert.equal(state.aiStats.strategicPlans,1);
  assert.equal(state.aiStats.reactiveTicks,30);
  beginNextCommandPhase(state);
  runStrategicTurn(state,{strategicAI:()=>plans++,reactiveAI:()=>reactions++});
  assert.equal(plans,2);
  assert.equal(reactions,60);
});
