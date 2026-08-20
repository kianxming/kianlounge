import { shortestRoute } from '../world/graph.js';

function hostile(state,a,b){return a!==b&&(state.hostile?.(a,b)??true)}
function ownSettlements(state,fid){return Object.values(state.settlements||{}).filter(s=>s.ownerFactionId===fid)}

function nearestHostileDistance(state,fid,nodeId){
  let best=Infinity,targetId=null;
  for(const target of Object.values(state.settlements||{})){
    if(!hostile(state,fid,target.ownerFactionId))continue;
    const route=shortestRoute(state.graph,nodeId,target.nodeId);if(route&&route.days<best){best=route.days;targetId=target.nodeId}
  }
  return {days:best,targetId};
}

export function analyzeFactionTheater(state,factionId){
  const settlements=ownSettlements(state,factionId),entries=settlements.map(s=>({settlement:s,...nearestHostileDistance(state,factionId,s.nodeId)}));
  const frontline=entries.filter(x=>x.days<=14).sort((a,b)=>a.days-b.days),rear=entries.filter(x=>x.days>14).sort((a,b)=>b.settlement.development-a.settlement.development);
  const supplyHub=[...entries].sort((a,b)=>(b.settlement.food+b.settlement.market*30)-(a.settlement.food+a.settlement.market*30))[0]?.settlement||null;
  const reserve=[...entries].sort((a,b)=>(b.settlement.troops+b.settlement.food*.18)-(a.settlement.troops+a.settlement.food*.18))[0]?.settlement||null;
  const objective=frontline.map(x=>({source:x.settlement,targetNodeId:x.targetId,days:x.days})).filter(x=>x.targetNodeId).sort((a,b)=>a.days-b.days)[0]||null;
  const result={turn:state.turn,factionId,frontlineNodeIds:frontline.map(x=>x.settlement.nodeId),rearNodeIds:rear.map(x=>x.settlement.nodeId),supplyHubNodeId:supplyHub?.nodeId||null,reserveNodeId:reserve?.nodeId||null,objectiveNodeId:objective?.targetNodeId||null};
  if(state.factions?.[factionId])state.factions[factionId].theater=result;
  return result;
}
