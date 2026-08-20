import { nearestReachableNode, shortestRoute } from '../world/graph.js';

function nextId(state,prefix){
  state.nextIds??={operation:1};
  const n=state.nextIds.operation++;
  return `${prefix}_${n}`;
}

function reserveOfficer(state,officerId,operationId){
  const officer=state.officers[officerId];
  if(!officer)throw new Error(`Unknown officer ${officerId}`);
  if(officer.assignment?.kind!=='base')throw new Error(`${officerId} is not available at a base`);
  officer.assignment={kind:'operation',operationId};
}

function startTravel(op,route){
  op.activeRoute=route;
  op.routeEdgeIndex=0;
  op.travelDaysRemaining=route.days;
  if(route.edgeIds.length){
    op.currentNodeId=null;
    op.currentEdgeId=route.edgeIds[0];
    op.edgeDaysRemaining=route.edgeDays[0];
  }else{
    op.currentNodeId=route.nodeIds[0];op.currentEdgeId=null;op.edgeDaysRemaining=0;
  }
}

function advanceTravelOneDay(op){
  if(!op.activeRoute||!op.currentEdgeId)return true;
  op.travelDaysRemaining=Math.max(0,op.travelDaysRemaining-1);
  op.edgeDaysRemaining=Math.max(0,op.edgeDaysRemaining-1);
  if(op.edgeDaysRemaining>0)return false;

  const reachedNodeIndex=op.routeEdgeIndex+1;
  op.currentNodeId=op.activeRoute.nodeIds[reachedNodeIndex];
  op.routeEdgeIndex++;
  if(op.routeEdgeIndex>=op.activeRoute.edgeIds.length){
    op.currentEdgeId=null;op.activeRoute=null;return true;
  }

  op.currentNodeId=null;
  op.currentEdgeId=op.activeRoute.edgeIds[op.routeEdgeIndex];
  op.edgeDaysRemaining=op.activeRoute.edgeDays[op.routeEdgeIndex];
  return false;
}

export function createOfficerMission(state,{
  type='officer_mission',officerId,originNodeId,destinationNodeId,
  prepareDays=0,taskDays=0,returnRequired=true,payload={}
}){
  const outbound=shortestRoute(state.graph,originNodeId,destinationNodeId);
  if(!outbound)throw new Error(`No route ${originNodeId} -> ${destinationNodeId}`);
  const id=nextId(state,type);
  reserveOfficer(state,officerId,id);
  const returning=returnRequired?shortestRoute(state.graph,destinationNodeId,originNodeId):null;
  const op={
    id,type,factionId:state.officers[officerId].factionId,status:prepareDays>0?'preparing':outbound.days>0?'outbound':'executing',
    originNodeId,destinationNodeId,actorIds:[officerId],startDay:state.day,
    prepareDaysRemaining:prepareDays,taskDaysRemaining:taskDays,
    outboundRoute:outbound,returnRoute:returning,travelDaysRemaining:0,
    currentNodeId:originNodeId,currentEdgeId:null,edgeDaysRemaining:0,routeEdgeIndex:0,activeRoute:null,
    returnRequired,payload,result:null
  };
  if(op.status==='outbound')startTravel(op,outbound);
  state.operations[id]=op;
  return op;
}

function finishOfficerMission(state,op,nodeId){
  op.status='completed';op.currentNodeId=nodeId;op.currentEdgeId=null;op.activeRoute=null;op.completedDay=state.day;
  for(const officerId of op.actorIds){
    const officer=state.officers[officerId];
    if(officer?.assignment?.operationId===op.id)officer.assignment={kind:'base',nodeId};
  }
}

function advanceMissionOneDay(state,op){
  if(op.status==='preparing'){
    op.prepareDaysRemaining=Math.max(0,op.prepareDaysRemaining-1);
    if(op.prepareDaysRemaining===0){
      if(op.outboundRoute.days>0){op.status='outbound';startTravel(op,op.outboundRoute)}
      else op.status='executing';
    }
    return;
  }
  if(op.status==='outbound'){
    if(advanceTravelOneDay(op)){
      op.currentNodeId=op.destinationNodeId;
      if(op.taskDaysRemaining>0)op.status='executing';
      else if(op.returnRequired){op.status='returning';startTravel(op,op.returnRoute)}
      else finishOfficerMission(state,op,op.destinationNodeId);
    }
    return;
  }
  if(op.status==='executing'){
    op.taskDaysRemaining=Math.max(0,op.taskDaysRemaining-1);
    if(op.taskDaysRemaining===0){
      if(op.returnRequired){op.status='returning';startTravel(op,op.returnRoute)}
      else finishOfficerMission(state,op,op.destinationNodeId);
    }
    return;
  }
  if(op.status==='returning'&&advanceTravelOneDay(op))finishOfficerMission(state,op,op.originNodeId);
}

export function beginArmyRetreat(state,armyId,{preferredNodeId=null}={}){
  const army=state.armies[armyId];
  if(!army)throw new Error(`Unknown army ${armyId}`);
  const start=army.currentNodeId;
  if(!start)throw new Error(`Army ${armyId} is not at a retreat origin node`);
  const candidates=Object.values(state.graph.nodes)
    .filter(n=>n.ownerFactionId===army.factionId)
    .map(n=>n.id);
  if(preferredNodeId&&candidates.includes(preferredNodeId)){
    candidates.splice(candidates.indexOf(preferredNodeId),1);candidates.unshift(preferredNodeId);
  }
  const route=nearestReachableNode(state.graph,start,candidates,{
    edgeAllowed:(edge,from,to)=>{
      const node=state.graph.nodes[to];
      return !node.ownerFactionId||node.ownerFactionId===army.factionId||state.allied?.(army.factionId,node.ownerFactionId);
    }
  });
  if(!route){army.status='stranded';army.retreatRoute=null;return null}

  const id=nextId(state,'retreat');
  const op={
    id,type:'army_retreat',factionId:army.factionId,status:'retreating',originNodeId:start,destinationNodeId:route.targetId,
    actorIds:[...army.officerIds],armyId,startDay:state.day,route,travelDaysRemaining:0,
    currentNodeId:start,currentEdgeId:null,edgeDaysRemaining:0,routeEdgeIndex:0,activeRoute:null,result:null
  };
  startTravel(op,route);
  state.operations[id]=op;army.status='retreating';army.operationId=id;army.retreatTargetNodeId=route.targetId;
  army.currentNodeId=op.currentNodeId;army.currentEdgeId=op.currentEdgeId;
  for(const officerId of army.officerIds){
    const officer=state.officers[officerId];if(officer)officer.assignment={kind:'army',armyId};
  }
  return op;
}

function advanceRetreatOneDay(state,op){
  const army=state.armies[op.armyId];
  if(!army||army.status==='destroyed'){op.status='failed';return}
  const arrived=advanceTravelOneDay(op);
  army.currentNodeId=op.currentNodeId;army.currentEdgeId=op.currentEdgeId;
  if(arrived){
    army.currentNodeId=op.destinationNodeId;army.currentEdgeId=null;army.status='waiting';army.operationId=null;army.retreatTargetNodeId=null;
    op.currentNodeId=op.destinationNodeId;op.status='completed';op.completedDay=state.day;
  }
}

export function advanceOperationsOneDay(state){
  for(const op of Object.values(state.operations)){
    if(['completed','failed','cancelled'].includes(op.status))continue;
    if(op.type==='army_retreat')advanceRetreatOneDay(state,op);
    else advanceMissionOneDay(state,op);
  }
}
