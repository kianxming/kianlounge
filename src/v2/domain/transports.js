const GRADE={NONE:0,E:1,D:2,C:3,B:4,A:5,S:6};
function commander(state,op){return state.officers?.[op.actorIds?.[0]]||null}
function armyCommander(state,army){return state.officers?.[army.commanderId||army.officerIds?.[0]]||null}
function observation(o){return GRADE[o?.haki?.observation?.grade||'NONE']||0}
function sameLocation(op,army){return (op.currentEdgeId&&op.currentEdgeId===army.currentEdgeId)||(op.currentNodeId&&op.currentNodeId===army.currentNodeId)}
function hostile(state,a,b){return a!==b&&(state.hostile?.(a,b)??true)}

function captureTransport(state,op,enemy){
  const cargo=op.payload?.cargo||{},leader=commander(state,op);
  enemy.loot??={money:0,food:0,troops:0,prisoners:[],devilFruits:[]};
  enemy.loot.money+=(cargo.money||0);enemy.loot.food+=(cargo.food||0);enemy.loot.troops+=(cargo.troops||0);
  enemy.loot.prisoners.push(...(cargo.prisoners||[]));enemy.loot.devilFruits.push(...(cargo.devilFruits||[]));
  for(const prisonerId of cargo.prisoners||[]){const p=state.officers?.[prisonerId];if(p){p.captorFactionId=enemy.factionId;p.assignment={kind:'army',armyId:enemy.id};p.status='prisoner'}}
  if(leader){leader.status='prisoner';leader.captorFactionId=enemy.factionId;leader.assignment={kind:'army',armyId:enemy.id}}
  op.status='failed';op.effectResolved=true;op.completedDay=state.day;op.result={success:false,reason:'captured_en_route',captorArmyId:enemy.id,captorFactionId:enemy.factionId};
  state.events.push({day:state.day,turn:state.turn,type:'logistics',message:`${leader?.name||'수송대'}가 이동 중 나포됨`,data:{operationId:op.id,captorArmyId:enemy.id}});
}

export function processTransportThreatsOneDay(state){
  for(const op of Object.values(state.operations||{})){
    if(op.type!=='transport'||!['outbound','executing'].includes(op.status)||op.effectResolved)continue;
    const leader=commander(state,op);if(!leader)continue;
    const threats=Object.values(state.armies||{}).filter(a=>a.status!=='destroyed'&&hostile(state,op.factionId,a.factionId)&&sameLocation(op,a));
    if(!threats.length)continue;
    threats.sort((a,b)=>(b.troops||0)-(a.troops||0));const enemy=threats[0],enemyLeader=armyCommander(state,enemy);
    const concealment=op.currentNodeId?(state.graph.nodes[op.currentNodeId]?.concealment||0):(state.graph.edges[op.currentEdgeId]?.ambushValue||0);
    const evade=(leader.intelligence||50)*.48+(leader.charisma||50)*.12+observation(leader)*9+concealment*18;
    const catchScore=(enemyLeader?.intelligence||50)*.20+(enemyLeader?.martial||50)*.34+observation(enemyLeader)*7+Math.min(25,(enemy.troops||0)/160);
    if(evade>=catchScore){op.payload.evasions=(op.payload.evasions||0)+1;continue}
    captureTransport(state,op,enemy);
  }
}
