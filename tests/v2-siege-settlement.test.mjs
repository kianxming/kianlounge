import test from 'node:test';
import assert from 'node:assert/strict';
import { buildGraph } from '../src/v2/world/graph.js';
import { createArmyMarchOperation } from '../src/v2/core/operations.js';
import { createStrategyState, commitCommandPhase, advanceOneDay, executeCurrentWindow } from '../src/v2/core/engine.js';
import { advanceSettlementsOneDay } from '../src/v2/domain/settlements.js';
import { createSiege, advanceSiegesOneDay } from '../src/v2/domain/sieges.js';
import { createStrategicBattle, resolveStrategicBattle } from '../src/v2/domain/battles.js';
import { validateStrategyState } from '../src/v2/domain/invariants.js';
import { serializeStrategyState, deserializeStrategyState } from '../src/v2/core/save.js';

function army(id,factionId,nodeId,extra={}){
  return {id,factionId,officerIds:[],currentNodeId:nodeId,currentEdgeId:null,status:'waiting',troops:3000,supplies:500,morale:100,readiness:100,...extra};
}

function settlement(id,ownerFactionId,extra={}){
  return {id,nodeId:id,ownerFactionId,money:2000,food:3000,troops:2000,development:50,cap:100,market:45,agriculture:45,morale:80,...extra};
}

test('garrison food is local and starvation eventually causes morale loss and desertion',()=>{
  const graph=buildGraph([{id:'city',type:'base',ownerFactionId:'kozuki'}],[]);
  const state=createStrategyState({graph,settlements:[settlement('city','kozuki',{food:0,troops:3000,morale:80})]});
  const before=state.settlements.city.troops;
  for(let i=0;i<4;i++)advanceSettlementsOneDay(state);
  assert.equal(state.settlements.city.food,0);
  assert.equal(state.settlements.city.starvationDays,4);
  assert.ok(state.settlements.city.morale<80);
  assert.ok(state.settlements.city.troops<before);
});

test('arriving at a hostile stronghold starts a persistent siege instead of instant capture',()=>{
  const graph=buildGraph([
    {id:'home',type:'base',ownerFactionId:'straw_hat'},
    {id:'target',type:'base',ownerFactionId:'beasts'}
  ],[{id:'road',a:'home',b:'target',baseDays:1}]);
  const state=createStrategyState({
    graph,
    settlements:[settlement('target','beasts',{troops:650,morale:42,development:35,food:500})],
    armies:{attack:army('attack','straw_hat','home',{troops:5200,supplies:999})},
    hostile:(a,b)=>a!==b
  });
  createArmyMarchOperation(state,{armyId:'attack',destinationNodeId:'target',objective:'attack'});
  commitCommandPhase(state);
  advanceOneDay(state);
  const siege=Object.values(state.sieges)[0];
  assert.ok(siege);
  assert.equal(state.settlements.target.ownerFactionId,'beasts','one arrival day must not instantly flip ownership');
  assert.equal(state.armies.attack.status,'siege');
  assert.equal(siege.elapsedDays,1);

  for(let i=0;i<20&&siege.status==='ongoing';i++)advanceOneDay(state);
  assert.equal(siege.status,'resolved');
  assert.equal(siege.result.winner,'straw_hat');
  assert.ok(siege.elapsedDays>1);
  assert.equal(state.settlements.target.ownerFactionId,'straw_hat');
  assert.equal(state.graph.nodes.target.ownerFactionId,'straw_hat');
  assert.ok(state.settlements.target.development<35,'combat-scale capture must damage development');
  assert.equal(state.armies.attack.status,'waiting');
  const checked=validateStrategyState(state);
  assert.equal(checked.ok,true,checked.errors.join('\n'));
});

test('failed siege sends attacker onto a physical retreat route instead of leaving it in the hostile stronghold',()=>{
  const graph=buildGraph([
    {id:'home',type:'base',ownerFactionId:'straw_hat'},
    {id:'pass',type:'pass',ownerFactionId:null},
    {id:'target',type:'base',ownerFactionId:'beasts'}
  ],[
    {id:'home_road',a:'home',b:'pass',baseDays:3},
    {id:'target_road',a:'pass',b:'target',baseDays:3}
  ]);
  const state=createStrategyState({
    graph,
    settlements:[settlement('target','beasts',{troops:6500,morale:95,development:80,food:5000})],
    armies:{attack:army('attack','straw_hat','target',{troops:650,morale:45,readiness:55,supplies:300,originNodeId:'home',supplySourceNodeId:'home'})},
    hostile:(a,b)=>a!==b
  });
  commitCommandPhase(state);
  advanceOneDay(state);
  const siege=Object.values(state.sieges)[0];
  assert.ok(siege);
  for(let i=0;i<20&&siege.status==='ongoing';i++)advanceOneDay(state);
  assert.equal(siege.status,'resolved');
  assert.equal(siege.result.winner,'beasts');
  assert.equal(state.settlements.target.ownerFactionId,'beasts');
  assert.equal(state.armies.attack.currentNodeId,null);
  assert.equal(state.armies.attack.currentEdgeId,'target_road');
  assert.equal(state.armies.attack.status,'retreating');
});

test('siege pauses for a relief field battle and resumes if the besieger wins',()=>{
  const graph=buildGraph([
    {id:'target',type:'base',ownerFactionId:'beasts'},
    {id:'relief_home',type:'base',ownerFactionId:'beasts'}
  ],[{id:'relief_road',a:'relief_home',b:'target',baseDays:2}]);
  const state=createStrategyState({
    graph,
    settlements:[settlement('target','beasts',{troops:1800,morale:75,food:3000})],
    armies:{
      besieger:army('besieger','straw_hat','target',{troops:4200,supplies:999}),
      relief:army('relief','beasts','target',{troops:1300,supplies:300})
    },
    hostile:(a,b)=>a!==b
  });
  const siege=createSiege(state,{nodeId:'target',attackerArmyId:'besieger'});
  const battle=createStrategicBattle(state,{location:{kind:'node',id:'target'},attackerArmyId:'besieger',defenderArmyId:'relief'});
  assert.equal(state.armies.besieger.status,'battle');
  assert.equal(state.armies.besieger.siegeId,siege.id);

  const duringBattle=validateStrategyState(state);
  assert.equal(duringBattle.ok,true,duringBattle.errors.join('\n'));
  const restored=deserializeStrategyState(serializeStrategyState(state),{hostile:(a,b)=>a!==b});
  assert.equal(restored.armies.besieger.status,'battle','save/load must preserve a siege temporarily interrupted by field battle');
  assert.equal(restored.armies.besieger.siegeId,siege.id);

  resolveStrategicBattle(state,battle.id,{winner:'straw_hat',reason:'relief_defeated'});
  assert.equal(state.armies.besieger.status,'siege');
  assert.equal(state.armies.besieger.siegeId,siege.id);
  const before=siege.elapsedDays;
  advanceSiegesOneDay(state);
  assert.equal(siege.status,'ongoing');
  assert.equal(siege.elapsedDays,before+1,'siege must continue rather than fail as attackers_disengaged');
  const afterBattle=validateStrategyState(state);
  assert.equal(afterBattle.ok,true,afterBattle.errors.join('\n'));
});

test('month end applies local settlement production and includes ownership/resources in report',()=>{
  const graph=buildGraph([{id:'city',type:'base',ownerFactionId:'kozuki'}],[]);
  const state=createStrategyState({graph,settlements:[settlement('city','kozuki',{money:1000,food:2000,troops:1000,development:40,market:40,agriculture:50})]});
  commitCommandPhase(state);
  const report=executeCurrentWindow(state);
  assert.equal(state.day,30);
  assert.ok(state.settlements.city.lastMonthlyIncome>0);
  assert.ok(state.settlements.city.lastMonthlyFoodProduction>0);
  assert.equal(report.settlements.city.ownerFactionId,'kozuki');
  assert.equal(report.settlements.city.money,state.settlements.city.money);
});
