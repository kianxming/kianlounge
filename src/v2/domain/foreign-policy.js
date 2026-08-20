import { commandBudget } from './commands.js';
import { declareWar, diplomacyBetween } from './diplomacy.js';

export function orderWarDeclaration(state,{factionId,targetFactionId}){
  if(state.phase!=='command'||factionId===targetFactionId)return false;
  const relation=diplomacyBetween(state,factionId,targetFactionId);
  if(['war','alliance','joint_front','truce'].includes(relation.status))return false;
  const budget=commandBudget(state,factionId);if(budget.remaining<1)return false;
  budget.remaining--;budget.spent++;
  return declareWar(state,factionId,targetFactionId,'formal_war_declaration');
}
