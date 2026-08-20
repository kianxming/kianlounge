const GRADE={NONE:0,E:1,D:2,C:3,B:4,A:5,S:6};
const QUALITY={E:0,D:.01,C:.02,B:.035,A:.055,S:.08};

export function armyOfficers(state,army){return (army.officerIds||[]).map(id=>state.officers?.[id]).filter(Boolean)}
export function armyCommander(state,army){return state.officers?.[army.commanderId||army.officerIds?.[0]]||null}

function hakiValue(officer,line){return GRADE[officer?.haki?.[line]?.grade||'NONE']||0}
function ownedFruit(state,officer){return officer?Object.values(state.fruits||{}).find(f=>f.ownerId===officer.id)||null:null}
function ownedWeapons(state,officer){return officer?Object.values(state.weapons||{}).filter(w=>w.ownerId===officer.id):[]}

export function armyStrategicCombatModifier(state,army){
  const officers=armyOfficers(state,army);if(!officers.length)return 1;
  const commander=armyCommander(state,army)||officers[0];
  const armament=Math.max(...officers.map(o=>hakiValue(o,'armament')),0);
  const conqueror=Math.max(...officers.map(o=>hakiValue(o,'conqueror')),0);
  const martial=(commander.martial||50)/100,command=(commander.charisma*.46+commander.martial*.22+commander.intelligence*.20+commander.politics*.12)/100;
  const weaponBonus=ownedWeapons(state,commander).reduce((n,w)=>n+(QUALITY[w.quality]||0),0);
  const fruit=ownedFruit(state,commander);
  const fruitBonus=fruit?.awakeningPotential==='S'?.06:fruit?.awakeningPotential==='A'?.04:fruit?.ownerId?.03:0;
  return Math.max(.8,Math.min(1.45,.88+martial*.09+command*.08+armament*.018+conqueror*.01+weaponBonus+fruitBonus));
}

export function armyTravelModifiers(state,army,edge){
  const commander=armyCommander(state,army),fruit=ownedFruit(state,commander);
  let mobility=1;
  if(fruit?.passives?.includes('Flight'))mobility*=edge.mode==='sea'?1.05:1.18;
  if(fruit?.passives?.includes('Flame Clouds'))mobility*=1.08;
  if(edge.mode==='sea'&&(commander?.id==='nami'||(commander?.traits||[]).includes('Logistician')))mobility*=1.10;
  if((commander?.traits||[]).includes('Strategist'))mobility*=1.03;
  return {mobility};
}

export function observationDetectionBonus(state,factionId,nodeId=null){
  const officers=Object.values(state.officers||{}).filter(o=>o.factionId===factionId&&o.status!=='dead'&&o.status!=='prisoner');
  const nearby=nodeId?officers.filter(o=>o.assignment?.kind==='base'&&o.assignment.nodeId===nodeId):officers;
  const pool=nearby.length?nearby:officers;
  return Math.max(0,...pool.map(o=>hakiValue(o,'observation')))*2;
}

export function conquerorMoralePressure(state,sourceArmies,targetArmies){
  const strongest=Math.max(0,...sourceArmies.flatMap(a=>armyOfficers(state,a)).map(o=>hakiValue(o,'conqueror')));
  if(strongest<4)return 0;
  const targetResistance=Math.max(0,...targetArmies.flatMap(a=>armyOfficers(state,a)).map(o=>Math.max(hakiValue(o,'conqueror'),hakiValue(o,'armament')*.6)));
  return Math.max(0,Math.min(3,Math.floor((strongest-targetResistance*.55)/2)));
}

export function operationOnePieceSummary(state,army){
  const commander=armyCommander(state,army),fruit=ownedFruit(state,commander);
  return {commanderId:commander?.id||null,observation:hakiValue(commander,'observation'),armament:hakiValue(commander,'armament'),conqueror:hakiValue(commander,'conqueror'),fruitId:fruit?.id||null};
}
