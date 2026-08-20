import test from 'node:test';
import assert from 'node:assert/strict';
import { buildGraph } from '../src/v2/world/graph.js';
import { createArmyMarchOperation } from '../src/v2/core/operations.js';
import { createStrategyState, commitCommandPhase, advanceOneDay, executeCurrentWindow } from '../src/v2/core/engine.js';
import { evaluateArmySupply } from '../src/v2/domain/supply.js';
import { createStrategicBattle } from '../src/v2/domain/battles.js';

function army(id,factionId,nodeId,extra={}){
  return {
    id,factionId,officerIds:[],currentNodeId:nodeId,currentEdgeId:null,status:'waiting',
    troops:2000,supplies:300,morale:100,readiness:100,...extra
  };
}

test('enemy physical occupation of the only road cuts supply without a debug blocked-edge flag',()=>{
  const graph=buildGraph([
    {id:'home',type:'base',ownerFactionId:'straw_hat'},
    {id:'pass',type:'pass',ownerFactionId:null},
    {id:'front',type:'base',ownerFactionId:'straw_hat'}
  ],[
    {id:'rear_road',a:'home',b:'pass',baseDays:4},
    {id:'front_road',a:'pass',b:'front',baseDays:3}
  ]);
  const state=createStrategyState({
    graph,
    armies:{
      frontline:army('frontline','straw_hat','front',{originNodeId:'home',supplySourceNodeId:'home'}),
      raider:army('raider','beasts',null,{currentEdgeId:'rear_road',status:'moving'})
    },
    hostile:(a,b)=>a!==b
  });
  const info=evaluateArmySupply(state,state.armies.frontline);
  assert.equal(info.state,'cut');
  assert.equal(state.blockedSupplyEdges.length,0,'interdiction must come from world state, not a test/debug flag');
});

test('balanced strategic battle causes daily attrition and survives a full 30-day execution window',()=>{
  const graph=buildGraph([{id:'mountain_pass',type:'pass',ownerFactionId:null}],[]);
  const state=createStrategyState({
    graph,
    armies:{
      attacker:army('attacker','straw_hat','mountain_pass',{originNodeId:'mountain_pass',supplies:999}),
      defender:army('defender','beasts','mountain_pass',{originNodeId:'mountain_pass',supplies:999})
    },
    hostile:(a,b)=>a!==b
  });
  const battle=createStrategicBattle(state,{location:{kind:'node',id:'mountain_pass'},attackerArmyId:'attacker',defenderArmyId:'defender'});
  const initial={a:state.armies.attacker.troops,d:state.armies.defender.troops};
  commitCommandPhase(state);
  const report=executeCurrentWindow(state);
  assert.equal(battle.status,'ongoing');
  assert.equal(battle.elapsedBattleDays,30);
  assert.equal(battle.dailyHistory.length,30);
  assert.ok(state.armies.attacker.troops<initial.a);
  assert.ok(state.armies.defender.troops<initial.d);
  assert.ok(state.armies.attacker.morale<100);
  assert.ok(state.armies.defender.morale<100);
  assert.ok(report.ongoingBattleIds.includes(battle.id));
});

test('a badly outmatched army loses after multiple battle days, then withdraws physically toward its rear',()=>{
  const graph=buildGraph([
    {id:'west',type:'base',ownerFactionId:'straw_hat'},
    {id:'east',type:'base',ownerFactionId:'beasts'}
  ],[
    {id:'long_road',a:'west',b:'east',baseDays:8,ambushValue:.2}
  ]);
  const state=createStrategyState({
    graph,
    armies:{
      weak:army('weak','straw_hat','west',{troops:700,morale:50,readiness:60,supplies:200}),
      strong:army('strong','beasts','east',{troops:3200,morale:100,readiness:100,supplies:400})
    },
    hostile:(a,b)=>a!==b
  });
  createArmyMarchOperation(state,{armyId:'weak',destinationNodeId:'east',objective:'attack',doctrine:{enemyContact:'engage'}});
  createArmyMarchOperation(state,{armyId:'strong',destinationNodeId:'west',objective:'attack',doctrine:{enemyContact:'engage'}});
  commitCommandPhase(state);

  let battle=null;
  for(let i=0;i<25&&state.phase==='execution';i++){
    advanceOneDay(state);
    battle=Object.values(state.battles)[0]||battle;
    if(battle?.status==='resolved')break;
  }
  assert.ok(battle);
  assert.equal(battle.status,'resolved');
  assert.ok(battle.elapsedBattleDays>1,'field battle must not collapse into a one-tick result');
  assert.equal(battle.result.winner,'beasts');
  assert.equal(state.armies.weak.status,'retreating');
  assert.equal(state.armies.weak.currentNodeId,null);
  assert.equal(state.armies.weak.currentEdgeId,'long_road');
  assert.equal(state.operations[state.armies.weak.operationId].type,'army_withdrawal');

  while(state.phase==='execution'&&state.armies.weak.status==='retreating')advanceOneDay(state);
  assert.equal(state.armies.weak.currentNodeId,'west');
  assert.equal(state.armies.weak.currentEdgeId,null);
  assert.equal(state.armies.weak.status,'waiting');
  assert.equal(Object.values(state.battles).length,1,'retreat must not immediately create a duplicate road battle when pursuit is disabled');
});
