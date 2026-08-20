import { validateStrategyState } from '../domain/invariants.js';
import { bindDiplomacyFunctions } from '../domain/diplomacy.js';

export const STRATEGY_SAVE_SCHEMA_VERSION=1;

function cloneSerializable(value){
  return JSON.parse(JSON.stringify(value,(key,current)=>typeof current==='function'?undefined:current));
}

export function serializeStrategyState(state,{pretty=false}={}){
  const checked=validateStrategyState(state);
  if(!checked.ok)throw new Error(`Cannot save invalid Strategy Core V2 state:\n- ${checked.errors.join('\n- ')}`);
  const payload={schema:'kianlounge.strategy-core-v2',schemaVersion:STRATEGY_SAVE_SCHEMA_VERSION,savedAtDay:state.day,state:cloneSerializable(state)};
  return JSON.stringify(payload,null,pretty?2:0);
}

export function deserializeStrategyState(serialized,{allied=null,hostile=null}={}){
  const payload=typeof serialized==='string'?JSON.parse(serialized):cloneSerializable(serialized);
  if(payload?.schema!=='kianlounge.strategy-core-v2')throw new Error('Unsupported strategy save schema');
  if(payload.schemaVersion!==STRATEGY_SAVE_SCHEMA_VERSION)throw new Error(`Unsupported strategy save version ${payload.schemaVersion}`);
  if(!payload.state||payload.state.version!=='strategy-core-v2')throw new Error('Save does not contain a Strategy Core V2 state');
  const state=cloneSerializable(payload.state);
  if(allied||hostile){state.allied=allied||(()=>false);state.hostile=hostile||((a,b)=>a!==b)}
  else if(state.diplomacy)bindDiplomacyFunctions(state);
  else{state.allied=()=>false;state.hostile=(a,b)=>a!==b}
  const checked=validateStrategyState(state);
  if(!checked.ok)throw new Error(`Loaded Strategy Core V2 state is invalid:\n- ${checked.errors.join('\n- ')}`);
  return state;
}

export function strategyStateDigest(state){
  const plain=cloneSerializable(state);delete plain.events;return JSON.stringify(plain);
}
