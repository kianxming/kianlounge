function fail(errors,message){errors.push(message)}
const terminalOperation=new Set(['completed','failed','cancelled']);
const activeArmyStatuses=new Set(['moving','waiting','battle','siege','retreating','routed','stranded','destroyed']);
const diplomaticStatuses=new Set(['neutral','alliance','joint_front','truce','war']);

export function validateStrategyState(state,{throwOnError=false}={}){
  const errors=[];
  if(!state?.graph)fail(errors,'state.graph is required');
  if(!Number.isInteger(state?.day)||state.day<0)fail(errors,`invalid day ${state?.day}`);
  if(!Number.isInteger(state?.turn)||state.turn<1)fail(errors,`invalid turn ${state?.turn}`);
  if(!['command','execution','report'].includes(state?.phase))fail(errors,`invalid phase ${state?.phase}`);

  for(const [fid,budget] of Object.entries(state.commandBudgets||{})){
    if((budget.remaining??0)<0||(budget.spent??0)<0||(budget.max??0)<0)fail(errors,`faction ${fid} has invalid command budget`);
    if((budget.remaining??0)>(budget.max??0))fail(errors,`faction ${fid} command budget exceeds max`);
  }
  for(const [key,relation] of Object.entries(state.diplomacy||{})){
    if(!diplomaticStatuses.has(relation.status))fail(errors,`diplomacy ${key} has invalid status ${relation.status}`);
    if((relation.trust??0)<0||(relation.trust??0)>100)fail(errors,`diplomacy ${key} trust out of range`);
  }

  for(const [id,army] of Object.entries(state.armies||{})){
    if(army.id!==id)fail(errors,`army key/id mismatch ${id}/${army.id}`);
    if(!activeArmyStatuses.has(army.status))fail(errors,`army ${id} has invalid status ${army.status}`);
    if((army.troops??0)<0)fail(errors,`army ${id} has negative troops`);
    if((army.supplies??0)<0)fail(errors,`army ${id} has negative supplies`);
    if((army.morale??0)<0||(army.morale??0)>100)fail(errors,`army ${id} morale out of range`);
    if((army.readiness??0)<0||(army.readiness??0)>100)fail(errors,`army ${id} readiness out of range`);
    if(army.status!=='destroyed'&&army.currentNodeId&&army.currentEdgeId)fail(errors,`army ${id} cannot occupy node ${army.currentNodeId} and edge ${army.currentEdgeId} simultaneously`);
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
    if(army.siegeId){
      const siege=state.sieges?.[army.siegeId];
      if(siege?.status!=='ongoing')fail(errors,`army ${id} references non-ongoing siege ${army.siegeId}`);
      else if(army.currentNodeId!==siege.nodeId)fail(errors,`army ${id} siege location does not match ${siege.nodeId}`);
      else if(army.factionId!==siege.attackerFactionId)fail(errors,`army ${id} is not on siege attacker faction`);
      else if(!['siege','battle','retreating','routed'].includes(army.status))fail(errors,`army ${id} retains siege ${army.siegeId} while status is ${army.status}`);
    }else if(army.status==='siege')fail(errors,`siege army ${id} has no siegeId`);
  }

  for(const [id,op] of Object.entries(state.operations||{})){
    if(op.id!==id)fail(errors,`operation key/id mismatch ${id}/${op.id}`);
    if(op.armyId){
      const army=state.armies?.[op.armyId];
      // Terminal operations are campaign history and may legitimately outlive a demobilized army.
      if(!army&&!terminalOperation.has(op.status))fail(errors,`active operation ${id} references missing army ${op.armyId}`);
      if(army&&!terminalOperation.has(op.status)&&army.operationId!==id&&!['battle','siege'].includes(army.status))fail(errors,`active operation ${id} is not owned by army ${op.armyId}`);
    }
    if(op.currentNodeId&&op.currentEdgeId)fail(errors,`operation ${id} occupies node and edge simultaneously`);
    if(op.currentNodeId&&!state.graph.nodes[op.currentNodeId])fail(errors,`operation ${id} references unknown node ${op.currentNodeId}`);
    if(op.currentEdgeId&&!state.graph.edges[op.currentEdgeId])fail(errors,`operation ${id} references unknown edge ${op.currentEdgeId}`);
    if((op.travelDaysRemaining??0)<0||(op.edgeDaysRemaining??0)<0)fail(errors,`operation ${id} has negative travel time`);
    if(!terminalOperation.has(op.status))for(const actorId of op.actorIds||[]){
      const actor=state.officers?.[actorId];if(!actor)fail(errors,`operation ${id} references missing officer ${actorId}`);
      else if(op.armyId){if(actor.assignment?.kind!=='army'||actor.assignment.armyId!==op.armyId)fail(errors,`army operation ${id} officer ${actorId} is double-booked`)}
      else if(actor.assignment?.kind!=='operation'||actor.assignment.operationId!==id)fail(errors,`operation ${id} officer ${actorId} is not reserved`);
    }
  }

  const battleLocations=new Map();
  for(const [id,battle] of Object.entries(state.battles||{})){
    if(battle.id!==id)fail(errors,`battle key/id mismatch ${id}/${battle.id}`);if(battle.status!=='ongoing')continue;
    const key=`${battle.location.kind}:${battle.location.id}`;if(battleLocations.has(key))fail(errors,`duplicate ongoing battles ${battleLocations.get(key)} and ${id} at ${key}`);else battleLocations.set(key,id);
    if(battle.location.kind==='node'&&!state.graph.nodes[battle.location.id])fail(errors,`battle ${id} references unknown node ${battle.location.id}`);
    if(battle.location.kind==='edge'&&!state.graph.edges[battle.location.id])fail(errors,`battle ${id} references unknown edge ${battle.location.id}`);
    for(const armyId of [...battle.attackerArmyIds,...battle.defenderArmyIds]){const army=state.armies?.[armyId];if(!army)fail(errors,`battle ${id} references missing army ${armyId}`);else if(army.battleId!==id||army.status!=='battle')fail(errors,`battle ${id} army ${armyId} is not synchronized with battle state`)}
  }

  for(const [id,s] of Object.entries(state.settlements||{})){
    if(s.id!==id)fail(errors,`settlement key/id mismatch ${id}/${s.id}`);if(!state.graph.nodes[s.nodeId])fail(errors,`settlement ${id} references unknown node ${s.nodeId}`);
    if((s.money??0)<0||(s.food??0)<0||(s.troops??0)<0)fail(errors,`settlement ${id} has negative local resources`);if((s.morale??0)<0||(s.morale??0)>100)fail(errors,`settlement ${id} morale out of range`);if((s.development??0)<0||(s.development??0)>(s.cap??100))fail(errors,`settlement ${id} development out of range`);
    if(state.graph.nodes[s.nodeId]&&state.graph.nodes[s.nodeId].ownerFactionId!==s.ownerFactionId)fail(errors,`settlement ${id} owner is out of sync with map node`);if(s.activeSiegeId&&state.sieges?.[s.activeSiegeId]?.status!=='ongoing')fail(errors,`settlement ${id} references non-ongoing siege ${s.activeSiegeId}`);
  }
  for(const [id,siege] of Object.entries(state.sieges||{})){
    if(siege.id!==id)fail(errors,`siege key/id mismatch ${id}/${siege.id}`);if(siege.status!=='ongoing')continue;const settlement=state.settlements?.[siege.settlementId];if(!settlement)fail(errors,`siege ${id} references missing settlement ${siege.settlementId}`);else if(settlement.activeSiegeId!==id)fail(errors,`siege ${id} is not synchronized with settlement ${settlement.id}`);
    for(const armyId of siege.attackerArmyIds){const army=state.armies?.[armyId];if(!army)fail(errors,`siege ${id} references missing army ${armyId}`);else if(army.siegeId===id&&!['siege','battle','retreating','routed'].includes(army.status))fail(errors,`siege ${id} army ${armyId} has invalid participant status ${army.status}`)}
  }
  for(const [id,officer] of Object.entries(state.officers||{})){
    const assignment=officer.assignment;if(!assignment)continue;
    if(assignment.kind==='army'&&!state.armies?.[assignment.armyId])fail(errors,`officer ${id} references missing army ${assignment.armyId}`);
    if(assignment.kind==='operation'&&!state.operations?.[assignment.operationId])fail(errors,`officer ${id} references missing operation ${assignment.operationId}`);
    if(assignment.kind==='base'&&assignment.nodeId&&!state.graph.nodes[assignment.nodeId])fail(errors,`officer ${id} references unknown base node ${assignment.nodeId}`);
  }
  const result={ok:errors.length===0,errors};if(throwOnError&&!result.ok)throw new Error(`Strategy state invariant violation:\n- ${errors.join('\n- ')}`);return result;
}
