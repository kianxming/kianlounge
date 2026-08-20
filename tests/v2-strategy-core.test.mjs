import test from 'node:test';
import assert from 'node:assert/strict';
import { buildGraph, shortestRoute } from '../src/v2/world/graph.js';
import {
  createOfficerMission, beginArmyRetreat, createArmyMarchOperation,
  createReinforcementOperation
} from '../src/v2/core/operations.js';
import {
  createStrategyState, commitCommandPhase, advanceOneDay, executeCurrentWindow,
  beginNextCommandPhase, runStrategicTurn
} from '../src/v2/core/engine.js';
import { evaluateArmySupply, advanceArmySupplyOneDay } from '../src/v2/domain/supply.js';
import { createStrategicBattle } from '../src/v2/domain/battles.js';
import { markOperationDetected, chooseReactiveResponse } from '../src/v2/ai/reactive.js';
import { WANO_V2_NODES, WANO_V2_EDGES, createWanoV2Graph } from '../src/v2/data/wano-network.js';

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

function simpleArmy(id,factionId,nodeId,extra={}){
  return {
    id,factionId,officerIds:[],currentNodeId:nodeId,currentEdgeId:null,status:'waiting',
    troops:2000,supplies:100,morale:100,readiness:100,...extra
  };
}

test('route ETA is the sum of explicit strategic edges rather than screen distance',()=>{
  const route=shortestRoute(missionGraph(),'home','far_town');
  assert.deepEqual(route.edgeIds,['road_a','road_b']);
  assert.deepEqual(route.edgeDays,[18,19]);
  assert.equal(route.days,37);
});

test('Wano V2 is an operational network rather than fourteen directly linked city markers',()=>{
  assert.ok(WANO_V2_NODES.length>=40,`expected >=40 nodes, got ${WANO_V2_NODES.length}`);
  assert.ok(WANO_V2_EDGES.length>=48,`expected >=48 edges, got ${WANO_V2_EDGES.length}`);
  const graph=createWanoV2Graph();
  const kibiToCapital=shortestRoute(graph,'kibi_camp','flower_capital');
  const ringoToUdon=shortestRoute(graph,'ringo','udon_prison');
  assert.ok(kibiToCapital.edgeIds.length>=5,'Kibi -> Flower Capital needs operational waypoints for interception');
  assert.ok(kibiToCapital.days>=12,`Kibi -> capital is still too compressed: ${kibiToCapital.days}d`);
  assert.ok(ringoToUdon.days>30,`cross-region Ringo -> Udon should be able to span a monthly window: ${ringoToUdon.days}d`);
  assert.ok(WANO_V2_NODES.some(n=>n.type==='pass'));
  assert.ok(WANO_V2_NODES.some(n=>n.type==='forest'));
  assert.ok(WANO_V2_NODES.some(n=>n.type==='sea'));
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
    armies:{army_1:{...simpleArmy('army_1','straw_hat','flower_capital'),officerIds:['luffy','zoro'],status:'defeated'}}
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

test('moving armies consume supplies and a long supply line imposes more daily pressure',()=>{
  const graph=buildGraph([
    {id:'home',type:'base',ownerFactionId:'straw_hat'},
    {id:'near',type:'junction',ownerFactionId:null},
    {id:'far',type:'junction',ownerFactionId:null}
  ],[
    {id:'short',a:'home',b:'near',baseDays:3},
    {id:'long',a:'near',b:'far',baseDays:12}
  ]);
  const state=createStrategyState({graph,armies:{marcher:simpleArmy('marcher','straw_hat','home')}});
  const op=createArmyMarchOperation(state,{armyId:'marcher',destinationNodeId:'far'});
  assert.equal(state.armies.marcher.status,'moving');
  assert.equal(state.armies.marcher.supplies,100);
  commitCommandPhase(state);
  advanceOneDay(state);
  assert.ok(state.armies.marcher.supplies<100,'moving army must consume supply every day');

  const nearArmy=simpleArmy('near_army','straw_hat','near',{originNodeId:'home',supplySourceNodeId:'home'});
  const farArmy=simpleArmy('far_army','straw_hat','far',{originNodeId:'home',supplySourceNodeId:'home'});
  const comparison=createStrategyState({graph,armies:{near_army:nearArmy,far_army:farArmy}});
  const nearInfo=evaluateArmySupply(comparison,comparison.armies.near_army);
  const farInfo=evaluateArmySupply(comparison,comparison.armies.far_army);
  assert.ok(farInfo.route.days>nearInfo.route.days);
  assert.ok(farInfo.dailyNeed>nearInfo.dailyNeed,`long supply line must cost more: short=${nearInfo.dailyNeed}, long=${farInfo.dailyNeed}`);
  assert.equal(op.route.days,15);
});

test('cutting the only supply route creates a real supply crisis and readiness loss',()=>{
  const graph=buildGraph([
    {id:'home',type:'base',ownerFactionId:'straw_hat'},
    {id:'front',type:'pass',ownerFactionId:null}
  ],[
    {id:'only_road',a:'home',b:'front',baseDays:6}
  ]);
  const state=createStrategyState({
    graph,
    armies:{front_army:simpleArmy('front_army','straw_hat','front',{originNodeId:'home',supplySourceNodeId:'home'})}
  });
  state.blockedSupplyEdges=['only_road'];
  const before={morale:state.armies.front_army.morale,readiness:state.armies.front_army.readiness};
  const info=evaluateArmySupply(state,state.armies.front_army);
  assert.equal(info.state,'cut');
  advanceArmySupplyOneDay(state);
  assert.equal(state.armies.front_army.supplyState,'cut');
  assert.ok(state.armies.front_army.morale<before.morale);
  assert.ok(state.armies.front_army.readiness<before.readiness);
});

test('reactive defence does nothing before detection, then physically intercepts at a chokepoint when ETA permits',()=>{
  const graph=buildGraph([
    {id:'enemy_base',type:'base',ownerFactionId:'beasts'},
    {id:'mountain_pass',type:'pass',ownerFactionId:null,concealment:.7},
    {id:'target',type:'base',ownerFactionId:'kozuki'},
    {id:'reserve',type:'base',ownerFactionId:'kozuki'}
  ],[
    {id:'enemy_to_pass',a:'enemy_base',b:'mountain_pass',baseDays:6},
    {id:'pass_to_target',a:'mountain_pass',b:'target',baseDays:6},
    {id:'reserve_to_pass',a:'reserve',b:'mountain_pass',baseDays:2}
  ]);
  const state=createStrategyState({
    graph,
    armies:{
      invader:simpleArmy('invader','beasts','enemy_base',{troops:3000}),
      reserve_army:simpleArmy('reserve_army','kozuki','reserve',{troops:2200})
    },
    hostile:(a,b)=>a!==b
  });
  const threat=createArmyMarchOperation(state,{armyId:'invader',destinationNodeId:'target',objective:'attack',doctrine:{enemyContact:'engage'}});
  assert.equal(chooseReactiveResponse(state,'kozuki',threat),null,'perfect information must not be assumed');
  markOperationDetected(state,'kozuki',threat.id,{confidence:.9});
  const response=chooseReactiveResponse(state,'kozuki',threat);
  assert.ok(response);
  assert.equal(response.type,'intercept');
  assert.equal(response.destinationNodeId,'mountain_pass');
  assert.equal(state.armies.reserve_army.status,'moving');
  assert.equal(state.armies.reserve_army.currentNodeId,null);
  assert.equal(state.armies.reserve_army.currentEdgeId,'reserve_to_pass');
});

test('when no useful chokepoint exists, another base sends a physical reinforcement with ETA',()=>{
  const graph=buildGraph([
    {id:'enemy_base',type:'base',ownerFactionId:'beasts'},
    {id:'target',type:'base',ownerFactionId:'kozuki'},
    {id:'reserve',type:'base',ownerFactionId:'kozuki'}
  ],[
    {id:'invasion_road',a:'enemy_base',b:'target',baseDays:8},
    {id:'reinforce_road',a:'reserve',b:'target',baseDays:3}
  ]);
  const state=createStrategyState({
    graph,
    armies:{
      invader:simpleArmy('invader','beasts','enemy_base',{troops:3000}),
      reserve_army:simpleArmy('reserve_army','kozuki','reserve',{troops:1800})
    },
    hostile:(a,b)=>a!==b
  });
  const threat=createArmyMarchOperation(state,{armyId:'invader',destinationNodeId:'target',objective:'attack'});
  markOperationDetected(state,'kozuki',threat.id);
  const response=chooseReactiveResponse(state,'kozuki',threat);
  assert.ok(response);
  assert.equal(response.type,'reinforcement');
  assert.equal(response.destinationNodeId,'target');
  assert.equal(response.route.days,3);
  assert.equal(state.armies.reserve_army.currentEdgeId,'reinforce_road');
});

test('hostile armies meeting on the same road create a field battle before either reaches a city',()=>{
  const graph=buildGraph([
    {id:'west',type:'base',ownerFactionId:'straw_hat'},
    {id:'east',type:'base',ownerFactionId:'beasts'}
  ],[
    {id:'contested_road',a:'west',b:'east',baseDays:5}
  ]);
  const state=createStrategyState({
    graph,
    armies:{
      straw:simpleArmy('straw','straw_hat','west'),
      beasts:simpleArmy('beasts','beasts','east')
    },
    hostile:(a,b)=>a!==b
  });
  createArmyMarchOperation(state,{armyId:'straw',destinationNodeId:'east',objective:'attack',doctrine:{enemyContact:'engage'}});
  createArmyMarchOperation(state,{armyId:'beasts',destinationNodeId:'west',objective:'attack',doctrine:{enemyContact:'engage'}});
  commitCommandPhase(state);
  advanceOneDay(state);
  const battles=Object.values(state.battles);
  assert.equal(battles.length,1);
  assert.equal(battles[0].status,'ongoing');
  assert.deepEqual(battles[0].location,{kind:'edge',id:'contested_road'});
  assert.equal(state.armies.straw.status,'battle');
  assert.equal(state.armies.beasts.status,'battle');
  assert.equal(battles[0].elapsedBattleDays,1);
});

test('reinforcement joins an already ongoing node battle only on its physical arrival day',()=>{
  const graph=buildGraph([
    {id:'target',type:'base',ownerFactionId:'kozuki'},
    {id:'reserve',type:'base',ownerFactionId:'kozuki'}
  ],[
    {id:'reinforce_road',a:'reserve',b:'target',baseDays:2}
  ]);
  const state=createStrategyState({
    graph,
    armies:{
      attacker:simpleArmy('attacker','beasts','target',{originNodeId:'target'}),
      defender:simpleArmy('defender','kozuki','target',{originNodeId:'target'}),
      relief:simpleArmy('relief','kozuki','reserve')
    },
    hostile:(a,b)=>a!==b
  });
  const battle=createStrategicBattle(state,{location:{kind:'node',id:'target'},attackerArmyId:'attacker',defenderArmyId:'defender'});
  const reinforcement=createReinforcementOperation(state,{armyId:'relief',destinationNodeId:'target'});
  assert.equal(reinforcement.route.days,2);
  commitCommandPhase(state);
  advanceOneDay(state);
  assert.ok(!battle.defenderArmyIds.includes('relief'),'reinforcement cannot join before arrival');
  advanceOneDay(state);
  assert.ok(battle.defenderArmyIds.includes('relief'));
  assert.deepEqual(battle.reinforcementArrivals.at(-1),{day:2,armyId:'relief'});
  assert.equal(state.armies.relief.status,'battle');
});

test('an unresolved strategic battle survives the 30-day boundary and appears in the monthly report',()=>{
  const graph=buildGraph([{id:'pass',type:'pass',ownerFactionId:null}],[]);
  const state=createStrategyState({
    graph,
    armies:{
      a:simpleArmy('a','straw_hat','pass',{originNodeId:'pass',supplies:999}),
      d:simpleArmy('d','beasts','pass',{originNodeId:'pass',supplies:999})
    },
    hostile:(a,b)=>a!==b
  });
  const battle=createStrategicBattle(state,{location:{kind:'node',id:'pass'},attackerArmyId:'a',defenderArmyId:'d'});
  commitCommandPhase(state);
  const report=executeCurrentWindow(state);
  assert.equal(state.day,30);
  assert.equal(state.phase,'report');
  assert.equal(battle.status,'ongoing');
  assert.equal(battle.elapsedBattleDays,30);
  assert.ok(report.ongoingBattleIds.includes(battle.id));
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
