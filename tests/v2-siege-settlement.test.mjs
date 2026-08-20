import test from 'node:test';
import assert from 'node:assert/strict';
import { buildGraph } from '../src/v2/world/graph.js';
import { createArmyMarchOperation } from '../src/v2/core/operations.js';
import { createStrategyState, commitCommandPhase, advanceOneDay, executeCurrentWindow } from '../src/v2/core/engine.js';
import { advanceSettlementsOneDay } from '../src/v2/domain/settlements.js';
import { validateStrategyState } from '../src/v2/domain/invariants.js';

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
