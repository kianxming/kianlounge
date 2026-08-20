import { advanceOperationsOneDay } from './operations.js';

export const STRATEGIC_WINDOW_DAYS=30;

export function createStrategyState({graph,officers={},armies={},factions={},seed=1,allied=null}={}){
  return {
    version:'strategy-core-v2',seed,day:0,turn:1,phase:'command',executionDaysRemaining:0,
    graph,officers:structuredClone(officers),armies:structuredClone(armies),factions:structuredClone(factions),
    operations:{},battles:{},events:[],reports:[],nextIds:{operation:1},
    aiStats:{strategicPlans:0,reactiveTicks:0},
    allied:allied||(()=>false)
  };
}

export function event(state,type,message,data={}){
  state.events.push({day:state.day,turn:state.turn,type,message,data});
}

export function commitCommandPhase(state,{strategicAI=null}={}){
  if(state.phase!=='command')throw new Error(`Cannot commit during ${state.phase}`);
  if(strategicAI){strategicAI(state);state.aiStats.strategicPlans++}
  state.phase='execution';state.executionDaysRemaining=STRATEGIC_WINDOW_DAYS;
  event(state,'turn','Command phase committed',{windowDays:STRATEGIC_WINDOW_DAYS});
  return state;
}

export function advanceOneDay(state,{reactiveAI=null}={}){
  if(state.phase!=='execution')throw new Error(`Cannot advance a day during ${state.phase}`);
  if(state.executionDaysRemaining<=0)throw new Error('Execution window is already complete');
  state.day++;
  advanceOperationsOneDay(state);
  if(reactiveAI){reactiveAI(state);state.aiStats.reactiveTicks++}
  state.executionDaysRemaining--;
  if(state.executionDaysRemaining===0){
    state.phase='report';
    const report=buildMonthlyReport(state);
    state.reports.push(report);
    return report;
  }
  return null;
}

export function executeCurrentWindow(state,hooks={}){
  if(state.phase!=='execution')throw new Error(`Cannot execute during ${state.phase}`);
  let report=null;
  while(state.phase==='execution')report=advanceOneDay(state,hooks)||report;
  return report;
}

export function beginNextCommandPhase(state){
  if(state.phase!=='report')throw new Error(`Cannot begin next command phase during ${state.phase}`);
  state.turn++;
  state.phase='command';
  return state;
}

export function runStrategicTurn(state,{strategicAI=null,reactiveAI=null}={}){
  commitCommandPhase(state,{strategicAI});
  return executeCurrentWindow(state,{reactiveAI});
}

export function buildMonthlyReport(state){
  const active=Object.values(state.operations).filter(o=>!['completed','failed','cancelled'].includes(o.status));
  const completed=Object.values(state.operations).filter(o=>o.completedDay&&o.completedDay>state.day-STRATEGIC_WINDOW_DAYS);
  return {
    turn:state.turn,
    throughDay:state.day,
    activeOperationIds:active.map(o=>o.id),
    completedOperationIds:completed.map(o=>o.id),
    ongoingBattleIds:Object.values(state.battles).filter(b=>b.status==='ongoing').map(b=>b.id)
  };
}
