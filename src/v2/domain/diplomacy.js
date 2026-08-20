const PAIR_SEP='|';

export function diplomacyPairKey(a,b){return [a,b].sort().join(PAIR_SEP)}

export function createDiplomacyState(factionIds,initial=[],wars=[]){
  const relations={};
  for(let i=0;i<factionIds.length;i++)for(let j=i+1;j<factionIds.length;j++){
    relations[diplomacyPairKey(factionIds[i],factionIds[j])]={status:'neutral',trust:50,sinceDay:0,untilDay:null};
  }
  for(const [a,b,status] of initial){
    const trust=status==='alliance'?78:status==='joint_front'?70:status==='truce'?60:50;
    relations[diplomacyPairKey(a,b)]={status,trust,sinceDay:0,untilDay:status==='truce'?90:null};
  }
  for(const [a,b] of wars)relations[diplomacyPairKey(a,b)]={status:'war',trust:18,sinceDay:0,untilDay:null};
  return relations;
}

export function diplomacyBetween(state,a,b){
  if(a===b)return {status:'same_faction',trust:100,sinceDay:state.day,untilDay:null};
  return state.diplomacy?.[diplomacyPairKey(a,b)]||{status:'neutral',trust:50,sinceDay:0,untilDay:null};
}

export function areAllied(state,a,b){
  if(a===b)return true;
  return ['alliance','joint_front'].includes(diplomacyBetween(state,a,b).status);
}

export function areHostile(state,a,b){return a!==b&&diplomacyBetween(state,a,b).status==='war'}

function pushEvent(state,type,message,data={}){
  state.events??=[];
  state.events.push({day:state.day,turn:state.turn,type,message,data});
}

export function setDiplomacyStatus(state,a,b,status,{trustDelta=0,durationDays=null,reason='diplomacy'}={}){
  if(a===b)return false;
  if(!['neutral','alliance','joint_front','truce','war'].includes(status))throw new Error(`Unsupported diplomacy status ${status}`);
  state.diplomacy??={};
  const key=diplomacyPairKey(a,b),prev=diplomacyBetween(state,a,b);
  const baseDelta=status==='war'?-22:status==='alliance'?12:status==='joint_front'?8:status==='truce'?5:0;
  state.diplomacy[key]={
    status,
    trust:Math.max(0,Math.min(100,(prev.trust??50)+baseDelta+trustDelta)),
    sinceDay:state.day,
    untilDay:durationDays?state.day+durationDays:null
  };
  pushEvent(state,'diplomacy',`${a} ↔ ${b}: ${status}`,{a,b,status,reason});
  return true;
}

export function declareWar(state,a,b,reason='strategic_decision'){
  if(areHostile(state,a,b))return false;
  return setDiplomacyStatus(state,a,b,'war',{reason});
}

export function concludeTruce(state,a,b,{durationDays=90,reason='negotiated_truce'}={}){
  return setDiplomacyStatus(state,a,b,'truce',{durationDays,reason});
}

export function changeDiplomaticTrust(state,a,b,delta){
  if(a===b)return 100;
  state.diplomacy??={};
  const key=diplomacyPairKey(a,b),current=diplomacyBetween(state,a,b);
  state.diplomacy[key]={...current,trust:Math.max(0,Math.min(100,(current.trust??50)+delta))};
  return state.diplomacy[key].trust;
}

export function advanceDiplomacyOneDay(state){
  for(const [key,relation] of Object.entries(state.diplomacy||{})){
    if(relation.status!=='truce'||!relation.untilDay||state.day<relation.untilDay)continue;
    state.diplomacy[key]={...relation,status:'neutral',sinceDay:state.day,untilDay:null};
    const [a,b]=key.split(PAIR_SEP);
    pushEvent(state,'diplomacy',`${a} ↔ ${b}: 휴전 기간 종료`,{a,b,status:'neutral'});
  }
}

export function bindDiplomacyFunctions(state){
  state.allied=(a,b)=>areAllied(state,a,b);
  state.hostile=(a,b)=>areHostile(state,a,b);
  return state;
}
