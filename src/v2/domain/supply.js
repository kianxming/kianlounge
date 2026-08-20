import { shortestRoute } from '../world/graph.js';

export function armyDailySupplyNeed(army){
  return Math.max(1,Math.ceil((army.troops||0)/500));
}

function hostile(state,a,b){
  if(a===b)return false;
  if(state.hostile)return state.hostile(a,b);
  if(state.allied?.(a,b))return false;
  return true;
}

function armyRearNode(state,army){
  if(army.currentNodeId)return army.currentNodeId;
  const op=army.operationId?state.operations[army.operationId]:null;
  if(op?.activeRoute){
    const rearIndex=Math.max(0,op.routeEdgeIndex||0);
    return op.activeRoute.nodeIds[rearIndex]||op.originNodeId;
  }
  return army.originNodeId||army.supplySourceNodeId||null;
}

export function supplyInterdictionForArmy(state,army){
  const blockedEdges=new Set(state.blockedSupplyEdges||[]);
  const blockedNodes=new Set();

  for(const other of Object.values(state.armies)){
    if(other.id===army.id||other.status==='destroyed'||!hostile(state,army.factionId,other.factionId))continue;
    if(other.currentEdgeId)blockedEdges.add(other.currentEdgeId);
    if(other.currentNodeId)blockedNodes.add(other.currentNodeId);
  }

  for(const battle of Object.values(state.battles||{})){
    if(battle.status!=='ongoing')continue;
    const involved=[...battle.attackerArmyIds,...battle.defenderArmyIds].map(id=>state.armies[id]).filter(Boolean);
    if(!involved.some(a=>hostile(state,army.factionId,a.factionId)))continue;
    if(battle.location.kind==='edge')blockedEdges.add(battle.location.id);
    else if(battle.location.kind==='node')blockedNodes.add(battle.location.id);
  }

  return {blockedEdges,blockedNodes};
}

export function supplyRouteForArmy(state,army){
  const source=army.supplySourceNodeId||army.originNodeId;
  const target=armyRearNode(state,army);
  if(!source||!target)return null;
  const {blockedEdges,blockedNodes}=supplyInterdictionForArmy(state,army);
  return shortestRoute(state.graph,source,target,{
    edgeAllowed:(edge,from,to)=>{
      if(blockedEdges.has(edge.id))return false;
      if(to!==target&&to!==source&&blockedNodes.has(to))return false;
      return true;
    }
  });
}

export function evaluateArmySupply(state,army){
  const need=armyDailySupplyNeed(army);
  const route=supplyRouteForArmy(state,army);
  if(!route)return {state:'cut',route:null,dailyNeed:need,daysOfStock:0,stretch:Infinity};
  const stretch=1+route.days/30;
  const effectiveNeed=Math.max(1,Math.ceil(need*stretch));
  const stock=Math.max(0,army.supplies??0);
  const daysOfStock=stock/effectiveNeed;
  let supplyState='secure';
  if(stock<=0)supplyState='critical';
  else if(daysOfStock<=3)supplyState='critical';
  else if(daysOfStock<=8)supplyState='strained';
  return {state:supplyState,route,dailyNeed:effectiveNeed,daysOfStock,stretch};
}

export function advanceArmySupplyOneDay(state){
  for(const army of Object.values(state.armies)){
    if(!['moving','waiting','battle','retreating','routed'].includes(army.status))continue;
    const info=evaluateArmySupply(state,army);
    army.supplyState=info.state;
    army.supplyRouteEdgeIds=info.route?.edgeIds||[];
    if(info.state==='cut'){
      army.morale=Math.max(0,(army.morale??100)-3);
      army.readiness=Math.max(0,(army.readiness??100)-4);
      continue;
    }
    army.supplies=Math.max(0,(army.supplies??0)-info.dailyNeed);
    if(info.state==='critical'){
      army.morale=Math.max(0,(army.morale??100)-1);
      army.readiness=Math.max(0,(army.readiness??100)-2);
    }else if(info.state==='strained'){
      army.readiness=Math.max(0,(army.readiness??100)-1);
    }
  }
}
