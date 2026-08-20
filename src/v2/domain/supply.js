import { shortestRoute } from '../world/graph.js';

export function armyDailySupplyNeed(army){
  return Math.max(1,Math.ceil((army.troops||0)/500));
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

export function supplyRouteForArmy(state,army){
  const source=army.supplySourceNodeId||army.originNodeId;
  const target=armyRearNode(state,army);
  if(!source||!target)return null;
  const blocked=new Set(state.blockedSupplyEdges||[]);
  return shortestRoute(state.graph,source,target,{edgeAllowed:edge=>!blocked.has(edge.id)});
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
    if(!['moving','waiting','battle','retreating'].includes(army.status))continue;
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
