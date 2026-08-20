export function buildGraph(nodes,edges){
  const nodeMap=Object.fromEntries(nodes.map(n=>[n.id,{...n}]));
  const edgeMap=Object.fromEntries(edges.map(e=>[e.id,{...e}]));
  const adjacency=Object.fromEntries(nodes.map(n=>[n.id,[]]));
  for(const e of edges){
    if(!nodeMap[e.a]||!nodeMap[e.b])throw new Error(`Unknown edge endpoint for ${e.id}`);
    adjacency[e.a].push({to:e.b,edgeId:e.id});
    adjacency[e.b].push({to:e.a,edgeId:e.id});
  }
  return {nodes:nodeMap,edges:edgeMap,adjacency};
}

export function edgeTravelDays(edge,{terrain=1,weather=1,load=1,formation=1,mobility=1,condition=1}={}){
  const raw=edge.baseDays*(edge.terrainFactor??terrain)*weather*load*formation*condition/Math.max(.1,mobility);
  return Math.max(1,Math.ceil(raw));
}

export function shortestRoute(graph,startId,endId,options={}){
  if(!graph.nodes[startId]||!graph.nodes[endId])return null;
  if(startId===endId)return {nodeIds:[startId],edgeIds:[],edgeDays:[],days:0};

  const dist=new Map([[startId,0]]),prev=new Map(),unvisited=new Set(Object.keys(graph.nodes));
  while(unvisited.size){
    let cur=null,best=Infinity;
    for(const id of unvisited){const d=dist.get(id)??Infinity;if(d<best){best=d;cur=id}}
    if(cur===null||best===Infinity)break;
    unvisited.delete(cur);
    if(cur===endId)break;
    for(const link of graph.adjacency[cur]){
      if(!unvisited.has(link.to))continue;
      const edge=graph.edges[link.edgeId];
      if(options.edgeAllowed&&!options.edgeAllowed(edge,cur,link.to))continue;
      const weight=edgeTravelDays(edge,options.travelModifiers?.(edge,cur,link.to)||{});
      const nd=best+weight;
      if(nd<(dist.get(link.to)??Infinity)){
        dist.set(link.to,nd);prev.set(link.to,{from:cur,edgeId:link.edgeId,days:weight});
      }
    }
  }
  if(!prev.has(endId))return null;
  const nodeIds=[endId],edgeIds=[],edgeDays=[];
  let cur=endId;
  while(cur!==startId){
    const p=prev.get(cur);if(!p)return null;
    edgeIds.push(p.edgeId);edgeDays.push(p.days);nodeIds.push(p.from);cur=p.from;
  }
  nodeIds.reverse();edgeIds.reverse();edgeDays.reverse();
  return {nodeIds,edgeIds,edgeDays,days:dist.get(endId)};
}

export function nearestReachableNode(graph,startId,candidateIds,options={}){
  let best=null;
  for(const id of candidateIds){
    const route=shortestRoute(graph,startId,id,options);
    if(route&&(!best||route.days<best.days))best={...route,targetId:id};
  }
  return best;
}
