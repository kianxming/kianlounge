import { shortestRoute } from '../world/graph.js';
import { createInterceptOperation, createReinforcementOperation } from '../core/operations.js';

function hostile(state,a,b){
  if(a===b)return false;
  if(state.hostile)return state.hostile(a,b);
  if(state.allied?.(a,b))return false;
  return true;
}

export function markOperationDetected(state,factionId,operationId,{confidence=1}={}){
  state.intelligence??={detectedByFaction:{}};
  state.intelligence.detectedByFaction[factionId]??={};
  state.intelligence.detectedByFaction[factionId][operationId]={detectedDay:state.day,confidence};
}

export function isOperationDetected(state,factionId,operationId){
  return !!state.intelligence?.detectedByFaction?.[factionId]?.[operationId];
}

function availableArmies(state,factionId){
  return Object.values(state.armies).filter(a=>
    a.factionId===factionId&&a.status==='waiting'&&a.currentNodeId&&!a.operationId&&(a.troops||0)>0
  );
}

function prefixEta(route,nodeId){
  const index=route.nodeIds.indexOf(nodeId);
  if(index<0)return Infinity;
  return route.edgeDays.slice(0,index).reduce((a,b)=>a+b,0);
}

function chokepointScore(node,enemyEta,friendlyEta){
  const typeBonus={pass:8,gate:8,bridge:6,forest:5,junction:2}[node.type]||0;
  const concealment=(node.concealment||0)*5;
  return (enemyEta-friendlyEta)+typeBonus+concealment;
}

export function chooseReactiveResponse(state,factionId,threatOp,{minimumSourceTroops=600,reinforcementGraceDays=5}={}){
  if(!threatOp||threatOp.status!=='marching'||threatOp.objective!=='attack')return null;
  if(!isOperationDetected(state,factionId,threatOp.id))return null;
  if(!hostile(state,factionId,threatOp.factionId))return null;
  const target=state.graph.nodes[threatOp.destinationNodeId];
  if(!target||target.ownerFactionId!==factionId)return null;

  state.reactiveResponses??={};
  const key=`${factionId}:${threatOp.id}`;
  if(state.reactiveResponses[key])return state.operations[state.reactiveResponses[key]]||null;

  const candidates=availableArmies(state,factionId).filter(a=>(a.troops||0)>=minimumSourceTroops);
  if(!candidates.length)return null;

  const route=threatOp.route;
  let bestIntercept=null;
  for(const nodeId of route.nodeIds.slice(1,-1)){
    const node=state.graph.nodes[nodeId];
    if(!['pass','gate','bridge','forest','junction'].includes(node.type))continue;
    const enemyEta=prefixEta(route,nodeId);
    for(const army of candidates){
      const friendly=shortestRoute(state.graph,army.currentNodeId,nodeId);
      if(!friendly||friendly.days>enemyEta+1)continue;
      const score=chokepointScore(node,enemyEta,friendly.days);
      if(!bestIntercept||score>bestIntercept.score)bestIntercept={army,nodeId,score,enemyEta,friendlyEta:friendly.days};
    }
  }

  if(bestIntercept){
    const op=createInterceptOperation(state,{
      armyId:bestIntercept.army.id,destinationNodeId:bestIntercept.nodeId,
      doctrine:{enemyContact:'engage',postObjective:'hold'},
      payload:{threatOperationId:threatOp.id,targetNodeId:threatOp.destinationNodeId}
    });
    state.reactiveResponses[key]=op.id;
    return op;
  }

  let bestReinforcement=null;
  for(const army of candidates){
    if(army.currentNodeId===threatOp.destinationNodeId)continue;
    const routeToTarget=shortestRoute(state.graph,army.currentNodeId,threatOp.destinationNodeId);
    if(!routeToTarget)continue;
    if(routeToTarget.days>threatOp.travelDaysRemaining+reinforcementGraceDays)continue;
    if(!bestReinforcement||routeToTarget.days<bestReinforcement.days)bestReinforcement={army,days:routeToTarget.days};
  }
  if(bestReinforcement){
    const op=createReinforcementOperation(state,{
      armyId:bestReinforcement.army.id,destinationNodeId:threatOp.destinationNodeId,
      doctrine:{enemyContact:'engage',postObjective:'hold'},
      payload:{threatOperationId:threatOp.id,targetNodeId:threatOp.destinationNodeId}
    });
    state.reactiveResponses[key]=op.id;
    return op;
  }
  return null;
}

export function reactToDetectedInvasions(state,factionId,options={}){
  const responses=[];
  for(const op of Object.values(state.operations)){
    if(op.type!=='army_march'||op.objective!=='attack'||op.status!=='marching')continue;
    const response=chooseReactiveResponse(state,factionId,op,options);
    if(response)responses.push(response);
  }
  return responses;
}
