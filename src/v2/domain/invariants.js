function fail(errors,message){errors.push(message)}

const terminalOperation=new Set(['completed','failed','cancelled']);
const activeArmyStatuses=new Set(['moving','waiting','battle','siege','retreating','routed','stranded','destroyed']);

export function validateStrategyState(state,{throwOnError=false}={}){
  const errors=[];
  if(!state?.graph)fail(errors,'state.graph is required');
  if(!Number.isInteger(state?.day)||state.day<0)fail(errors,`invalid day ${state?.day}`);
  if(!Number.isInteger(state?.turn)||state.turn<1)fail(errors,`invalid turn ${state?.turn}`);
  if(!['command','execution','report'].includes(state?.phase))fail(errors,`invalid phase ${state?.phase}`);

  for(const [id,army] of Object.entries(state.armies||{})){
    if(army.id!==id)fail(errors,`army key/id mismatch ${id}/${army.id}`);
    if(!activeArmyStatuses.has(army.status))fail(errors,`army ${id} has invalid status ${army.status}`);
    if((army.troops??0)<0)fail(errors,`army ${id} has negative troops`);
    if((army.supplies??0)<0)fail(errors,`army ${id} has negative supplies`);
    if((army.morale??0)<0||(army.morale??0)>100)fail(errors,`army ${id} morale out of range`);
    if((army.readiness??0)<0||(army.readiness??0)>100)fail(errors,`army ${id} readiness out of range`);
    if(army.status!=='destroyed'&&army.currentNodeId&&army.currentEdgeId)fail(errors,`army ${id} cannot occupy node and edge simultaneously`);
    if(army.currentNodeId&&!state.graph.nodes[army.currentNodeId])fail(errors,`army ${id} references unknown node ${army.currentNodeId}`);
    if(army.currentEdgeId&&!state.graph.edges[army.currentEdgeId])fail(errors,`army ${id} references unknown edge ${army.currentEdgeId}`);

    if(army.operationId){
      const op=state.operations?.[army.operationId];
      if(!op)fail(errors,`army ${id} references missing operation ${army.operationId}`);
      else if(op.armyId&&op.armyId!==id)fail(errors,`army ${id} operation ${op.id} belongs to ${op.armyId}`);
      else if(terminalOperation.has(op.status)&&army.status!=='stranded')fail(errors,`army ${id} retains terminal operation ${op.id}`);
    }

    if(army.status==='battle'){
      if(!army.battleId)fail(errors,`battle army ${id} has no battleId`);
      else if(state.battles?.[army.battleId]?.status!=='ongoing')fail(errors,`battle army ${id} references non-ongoing battle ${army.battleId}`);
    }else if(army.battleId)fail(errors,`non-battle army ${id} still references battle ${army.battleId}`);

    if(army.status==='siege'){
      if(!army.siegeId)fail(errors,`siege army ${id} has no siegeId`);
      else if(state.sieges?.[army.siegeId]?.status!=='ongoing')fail(errors,`siege army ${id} references non-ongoing siege ${army.siegeId}`);
    }else if(army.siegeId)fail(errors,`non-siege army ${id} still references siege ${army.siegeId}`);
  }

  for(const [id,op] of Object.entries(state.operations||{})){
    if(op.id!==id)fail(errors,`operation key/id mismatch ${id}/${op.id}`);
    if(op.armyId){
      const army=state.armies?.[op.armyId];
      if(!army)fail(errors,`operation ${id} references missing army ${op.armyId}`);
      if(!terminalOperation.has(op.status)&&army&&army.operationId!==id&&!['battle','siege'].includes(army.status))fail(errors,`active operation ${id} is not owned by army ${op.armyId}`);
    }
    if(op.currentNodeId&&op.currentEdgeId)fail(errors,`operation ${id} occupies node and edge simultaneously`);
    if(op.currentNodeId&&!state.graph.nodes[op.currentNodeId])fail(errors,`operation ${id} references unknown node ${op.currentNodeId}`);
    if(op.currentEdgeId&&!state.graph.edges[op.currentEdgeId])fail(errors,`operation ${id} references unknown edge ${op.currentEdgeId}`);
    if((op.travelDaysRemaining??0)<0||(op.edgeDaysRemaining??0)<0)fail(errors,`operation ${id} has negative travel time`);
  }

  const battleLocations=new Map();
  for(const [id,battle] of Object.entries(state.battles||{})){
    if(battle.id!==id)fail(errors,`battle key/id mismatch ${id}/${battle.id}`);
    if(battle.status!=='ongoing')continue;
    const key=`${battle.location.kind}:${battle.location.id}`;
    if(battleLocations.has(key))fail(errors,`duplicate ongoing battles ${battleLocations.get(key)} and ${id} at ${key}`);
    else battleLocations.set(key,id);
    if(battle.location.kind==='node'&&!state.graph.nodes[battle.location.id])fail(errors,`battle ${id} references unknown node ${battle.location.id}`);
    if(battle.location.kind==='edge'&&!state.graph.edges[battle.location.id])fail(errors,`battle ${id} references unknown edge ${battle.location.id}`);
    for(const armyId of [...battle.attackerArmyIds,...battle.defenderArmyIds]){
      const army=state.armies?.[armyId];
      if(!army)fail(errors,`battle ${id} references missing army ${armyId}`);
      else if(army.battleId!==id||army.status!=='battle')fail(errors,`battle ${id} army ${armyId} is not synchronized with battle state`);
    }
  }

  for(const [id,settlement] of Object.entries(state.settlements||{})){
    if(settlement.id!==id)fail(errors,`settlement key/id mismatch ${id}/${settlement.id}`);
    if(!state.graph.nodes[settlement.nodeId])fail(errors,`settlement ${id} references unknown node ${settlement.nodeId}`);
    if((settlement.money??0)<0||(settlement.food??0)<0||(settlement.troops??0)<0)fail(errors,`settlement ${id} has negative local resources`);
    if((settlement.morale??0)<0||(settlement.morale??0)>100)fail(errors,`settlement ${id} morale out of range`);
    if((settlement.development??0)<0||(settlement.development??0)>(settlement.cap??100))fail(errors,`settlement ${id} development out of range`);
    if(state.graph.nodes[settlement.nodeId]&&state.graph.nodes[settlement.nodeId].ownerFactionId!==settlement.ownerFactionId)fail(errors,`settlement ${id} owner is out of sync with map node`);
    if(settlement.activeSiegeId&&state.sieges?.[settlement.activeSiegeId]?.status!=='ongoing')fail(errors,`settlement ${id} references non-ongoing siege ${settlement.activeSiegeId}`);
  }

  for(const [id,siege] of Object.entries(state.sieges||{})){
    if(siege.id!==id)fail(errors,`siege key/id mismatch ${id}/${siege.id}`);
    if(siege.status!=='ongoing')continue;
    const settlement=state.settlements?.[siege.settlementId];
    if(!settlement)fail(errors,`siege ${id} references missing settlement ${siege.settlementId}`);
    else if(settlement.activeSiegeId!==id)fail(errors,`siege ${id} is not synchronized with settlement ${settlement.id}`);
    for(const armyId of siege.attackerArmyIds){
      const army=state.armies?.[armyId];
      if(!army)fail(errors,`siege ${id} references missing army ${armyId}`);
      else if(army.status==='siege'&&army.siegeId!==id)fail(errors,`siege ${id} army ${armyId} has mismatched siegeId`);
    }
  }

  for(const [id,officer] of Object.entries(state.officers||{})){
    const assignment=officer.assignment;
    if(!assignment)continue;
    if(assignment.kind==='army'&&!state.armies?.[assignment.armyId])fail(errors,`officer ${id} references missing army ${assignment.armyId}`);
    if(assignment.kind==='operation'&&!state.operations?.[assignment.operationId])fail(errors,`officer ${id} references missing operation ${assignment.operationId}`);
    if(assignment.kind==='base'&&assignment.nodeId&&!state.graph.nodes[assignment.nodeId])fail(errors,`officer ${id} references unknown base node ${assignment.nodeId}`);
  }

  const result={ok:errors.length===0,errors};
  if(throwOnError&&!result.ok)throw new Error(`Strategy state invariant violation:\n- ${errors.join('\n- ')}`);
  return result;
}
