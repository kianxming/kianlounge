import { CHARACTERS, DEVIL_FRUITS, FACTIONS, INITIAL_DIPLOMACY, INITIAL_RELATIONSHIPS, WEAPONS } from '../../data.js';
import { createStrategyState } from '../core/engine.js';
import { resetCommandBudgets } from '../domain/commands.js';
import { bindDiplomacyFunctions, createDiplomacyState, diplomacyPairKey } from '../domain/diplomacy.js';
import { createWanoV2Graph } from './wano-network.js';
import { WANO_V2_SETTLEMENTS } from './wano-settlements.js';

const clone=v=>JSON.parse(JSON.stringify(v));
const LEADERS={straw_hat:'luffy',beasts:'kaido',kozuki:'momonosuke',kurozumi:'orochi',heart:'law',kid:'kid',big_mom:'big_mom'};
const CAPITALS={straw_hat:'kibi_camp',beasts:'onigashima',kozuki:'amigasa',kurozumi:'flower_capital',heart:'itachi_port',kid:'mogura_port',big_mom:'big_mom_anchorage'};
const NAMES={straw_hat:'밀짚모자 일당',beasts:'백수 해적단',kozuki:'코즈키 세력',kurozumi:'쿠로즈미 세력',heart:'하트 해적단',kid:'키드 해적단',big_mom:'빅 맘 해적단'};
const SPECIAL_LOCATIONS={
  luffy:'kibi_camp',zoro:'kibi_camp',nami:'kibi_camp',sanji:'kibi_camp',law:'itachi_port',bepo:'itachi_port',kid:'mogura_port',killer:'mogura_port',
  kaido:'onigashima',king:'onigashima',queen:'udon_prison',jack:'bakura',big_mom:'big_mom_anchorage',perospero:'big_mom_anchorage',orochi:'flower_capital',
  momonosuke:'amigasa',kinemon:'habu_port',yamato:'onigashima',kanjuro:'flower_capital'
};
const INITIAL_WARS=[
  ['straw_hat','beasts'],['straw_hat','kurozumi'],['kozuki','beasts'],['kozuki','kurozumi'],['heart','beasts'],['kid','beasts']
];

function defaultLocation(factionId){return WANO_V2_SETTLEMENTS.find(s=>s.ownerFactionId===factionId)?.nodeId||'flower_capital'}
function officerLocation(character){return SPECIAL_LOCATIONS[character.id]||defaultLocation(character.faction)}

function relationshipMap(){
  const result={};
  for(const [a,b,value,tags] of INITIAL_RELATIONSHIPS){
    result[diplomacyPairKey(a,b)]={value,tags:[...tags]};
  }
  return result;
}

function officerRelationships(id,all){
  const result={};
  for(const [key,relation] of Object.entries(all)){
    const [a,b]=key.split('|');
    if(a===id)result[b]=relation.value;
    else if(b===id)result[a]=relation.value;
  }
  return result;
}

export function createWanoV2Scenario({seed=20260820,playerFactionId='straw_hat'}={}){
  const graph=createWanoV2Graph();
  const factions=Object.fromEntries(FACTIONS.map(f=>[f.id,{
    id:f.id,name:NAMES[f.id]||f.name,color:f.color,accent:f.accent,leaderId:LEADERS[f.id],capitalNodeId:CAPITALS[f.id],
    aiState:{inactivityMonths:0,lastActionTurn:null,ordersIssued:0},theater:null
  }]));
  const rels=relationshipMap();
  const officers=Object.fromEntries(CHARACTERS.map(c=>{
    const nodeId=officerLocation(c);
    return [c.id,{...clone(c),factionId:c.faction,status:'available',assignment:{kind:'base',nodeId},hp:100,maxHp:100,relationships:officerRelationships(c.id,rels),captorFactionId:null,deathResolved:false}];
  }));
  const state=createStrategyState({graph,officers,armies:{},factions,settlements:WANO_V2_SETTLEMENTS,seed});
  state.playerFactionId=playerFactionId;
  state.diplomacy=createDiplomacyState(Object.keys(factions),INITIAL_DIPLOMACY,INITIAL_WARS);
  state.relationships=rels;
  state.fruits=Object.fromEntries(DEVIL_FRUITS.map(f=>[f.id,{...clone(f),ownerId:f.ownerId||null,location:f.ownerId?null:CAPITALS.straw_hat,hidden:false}]));
  state.weapons=Object.fromEntries(WEAPONS.map(w=>[w.id,{...clone(w),ownerId:w.ownerId||null,location:null}]));
  state.stats={battlesStarted:0,siegesStarted:0,ownershipChanges:0,aiOrders:0,missionsCompleted:0};
  state.events.push({day:0,turn:1,type:'world',message:'와노 V2 시나리오 시작 — 원작은 초기 배치만 정의한다.',data:{}});
  bindDiplomacyFunctions(state);
  resetCommandBudgets(state);
  return state;
}

export { LEADERS as WANO_V2_LEADERS, CAPITALS as WANO_V2_CAPITALS, INITIAL_WARS as WANO_V2_INITIAL_WARS };
