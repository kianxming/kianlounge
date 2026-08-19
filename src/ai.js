import { FACTIONS } from './data.js';
import {
  assignOfficerRole, available, clamp, command, createArmy, createTransport, develop, diplomacyStatus,
  event, isHostile, moveArmy, neighbors, path, produce, recruit, recruitPrisoner, release, rng, setDiplomacy, trade
} from './world.js';

export const AI_PLANNING_INTERVAL_MINUTES = 45;

const LEADERS = {
  straw_hat:'luffy', beasts:'kaido', kozuki:'momonosuke', kurozumi:'orochi',
  heart:'law', kid:'kid', big_mom:'big_mom'
};

const BASE_DOCTRINES = {
  straw_hat:{aggression:.78,caution:.42,logistics:.56,development:.34,diplomacy:.76,allySupport:.95,opportunism:.56,armyBonus:0,strongEnemy:.15},
  beasts:{aggression:.94,caution:.20,logistics:.48,development:.34,diplomacy:.10,allySupport:.18,opportunism:.48,armyBonus:1,strongEnemy:.80},
  kozuki:{aggression:.62,caution:.68,logistics:.72,development:.58,diplomacy:.82,allySupport:.92,opportunism:.65,armyBonus:0,strongEnemy:.10},
  kurozumi:{aggression:.22,caution:.96,logistics:.62,development:.74,diplomacy:.88,allySupport:.10,opportunism:.38,armyBonus:0,strongEnemy:0},
  heart:{aggression:.48,caution:.90,logistics:.94,development:.52,diplomacy:.70,allySupport:.58,opportunism:.98,armyBonus:0,strongEnemy:0},
  kid:{aggression:.97,caution:.16,logistics:.36,development:.30,diplomacy:.18,allySupport:.12,opportunism:.66,armyBonus:0,strongEnemy:.30},
  big_mom:{aggression:.80,caution:.50,logistics:.66,development:.68,diplomacy:.68,allySupport:.28,opportunism:.76,armyBonus:1,strongEnemy:.20}
};

const clamp01=v=>clamp(v,0,1);
const copyProfile=p=>({...p});
const MIN_OPERATIONAL_ARMY=400;

function applyTrait(profile,trait){
  if(trait==='Reckless'){profile.aggression+=.12;profile.caution-=.12}
  if(trait==='Strategist'){profile.opportunism+=.16;profile.caution+=.10;profile.logistics+=.06}
  if(trait==='Calm'){profile.caution+=.07;profile.opportunism+=.04}
  if(trait==='Cowardly'){profile.aggression-=.20;profile.caution+=.20;profile.diplomacy+=.10}
  if(trait==='Logistician')profile.logistics+=.18;
  if(trait==='Natural Leader'){profile.allySupport+=.08;profile.aggression+=.04}
  if(trait==='Commander')profile.aggression+=.05;
  if(trait==='Grand Commander'){profile.aggression+=.08;profile.armyBonus+=1}
  if(trait==='Engineer')profile.development+=.12;
}

export function getFactionAIProfile(s,factionId){
  const p=copyProfile(BASE_DOCTRINES[factionId]||BASE_DOCTRINES.kozuki);
  const leader=s.officers?.[LEADERS[factionId]];
  for(const trait of leader?.traits||[])applyTrait(p,trait);
  for(const k of ['aggression','caution','logistics','development','diplomacy','allySupport','opportunism','strongEnemy'])p[k]=clamp01(p[k]);
  return {...p,leaderId:leader?.id||null};
}

const factionHoldings=(s,fid)=>Object.values(s.strongholds).filter(h=>h.owner===fid);
const factionOfficers=(s,fid)=>Object.values(s.officers).filter(o=>o.faction===fid&&o.status!=='dead');
const activeArmies=(s,fid)=>Object.values(s.armies).filter(a=>a.factionId===fid);
const operationalArmies=(s,fid)=>activeArmies(s,fid).filter(a=>a.troops>=MIN_OPERATIONAL_ARMY);
const round100=n=>Math.max(0,Math.floor(n/100)*100);

function frontlineInfo(s,h,fid){
  const hostile=neighbors(h.id).map(id=>s.strongholds[id]).filter(x=>isHostile(s,fid,x.owner));
  const enemyTroops=hostile.reduce((m,x)=>Math.max(m,x.troops),0);
  return {hostile,enemyTroops,frontline:hostile.length>0};
}

function declareWarForAttack(s,fid,targetFaction){
  if(!targetFaction||targetFaction===fid)return;
  const d=diplomacyStatus(s,fid,targetFaction);
  if(d.status==='neutral')setDiplomacy(s,fid,targetFaction,'war',fid);
}

function cleanupExhaustedArmies(s,fid){
  let cleaned=0;
  for(const a of activeArmies(s,fid)){
    if(a.status!=='waiting'||a.troops>=MIN_OPERATIONAL_ARMY)continue;
    const h=s.strongholds[a.location];
    if(!h||h.owner!==fid)continue;
    h.troops+=a.troops;
    h.food+=a.food||0;
    release(s,a.commanderId,h.id);
    if(a.deputyId)release(s,a.deputyId,h.id);
    delete s.armies[a.id];
    event(s,`${s.officers[a.commanderId]?.name||'An exhausted army'} demobilized at ${h.name} and returned its survivors to the garrison.`,'military');
    cleaned++;
  }
  return cleaned;
}

function maxConcurrentArmies(s,fid,profile){
  const hs=factionHoldings(s,fid);
  const officerCount=factionOfficers(s,fid).length;
  return clamp(1+Math.floor(hs.length/2)+Math.floor(officerCount/18)+(profile.armyBonus||0),1,5);
}

function cycleBudget(s,fid){
  const hs=factionHoldings(s,fid),free=factionOfficers(s,fid).filter(o=>o.status==='available').length;
  return clamp(2+Math.ceil(hs.length/2)+Math.floor(free/14),2,5);
}

function commanderScore(o,p){
  if(!o)return -Infinity;
  return command(o)*.42+o.martial*(.18+.18*p.aggression)+o.intelligence*(.10+.15*p.opportunism)+o.politics*(.05+.10*p.logistics)+o.charisma*.12;
}

function bestCommander(s,fid,location,p){
  return available(s,fid,location).sort((a,b)=>commanderScore(b,p)-commanderScore(a,p))[0]||null;
}

function attackCandidates(s,fid,p){
  const result=[];
  for(const base of factionHoldings(s,fid)){
    const lead=bestCommander(s,fid,base.id,p);if(!lead)continue;
    for(const targetId of neighbors(base.id)){
      const target=s.strongholds[targetId];if(!isHostile(s,fid,target.owner))continue;
      const reserve=1200+Math.round(p.caution*900);
      const deployable=Math.max(0,base.troops-reserve);
      if(deployable<900||base.food<800)continue;
      const targetPower=target.troops+target.development*14;
      const ownPower=deployable+command(lead)*10;
      const ratio=ownPower/Math.max(1,targetPower);
      let score=p.aggression*48+p.opportunism*28*clamp(ratio-.55,0,1.6)+(target.development/target.cap)*12;
      score-=p.caution*Math.max(0,1.05-ratio)*58;
      score+=p.strongEnemy*Math.min(1,targetPower/5000)*14;
      if(fid==='kozuki'&&target.id==='flower_capital')score+=34;
      if(fid==='straw_hat'&&['beasts','kurozumi'].includes(target.owner))score+=8;
      if(fid==='heart'&&ratio>1.25)score+=10;
      if(fid==='kid')score+=7;
      const desired=Math.max(900,target.troops*(.72+p.aggression*.42));
      const troops=round100(Math.min(deployable,desired));
      if(troops>=900)result.push({score,base,target,lead,troops});
    }
  }
  return result.sort((a,b)=>b.score-a.score);
}

function maneuverAction(s,fid,p){
  const waiting=operationalArmies(s,fid).filter(a=>a.status==='waiting');
  const direct=[];
  for(const army of waiting){
    const hostile=neighbors(army.location).map(id=>s.strongholds[id]).filter(h=>isHostile(s,fid,h.owner));
    for(const target of hostile){
      const ratio=army.troops/Math.max(500,target.troops);
      let score=p.aggression*42+p.opportunism*Math.max(0,ratio-.45)*32-p.caution*Math.max(0,1-ratio)*28;
      if(fid==='kozuki'&&target.id==='flower_capital')score+=38;
      if(fid==='kid')score+=9;
      if(fid==='heart'&&ratio>1.15)score+=12;
      direct.push({army,target,score});
    }
  }
  direct.sort((a,b)=>b.score-a.score);
  if(direct[0]?.score>=30){
    const moved=moveArmy(s,direct[0].army.id,direct[0].target.id);
    if(moved)declareWarForAttack(s,fid,direct[0].target.owner);
    return moved;
  }

  const fronts=factionHoldings(s,fid).filter(h=>frontlineInfo(s,h,fid).frontline);
  const reposition=[];
  for(const army of waiting){
    for(const target of fronts){
      if(target.id===army.location)continue;
      const route=path(army.location,target.id);if(!route)continue;
      reposition.push({army,target,len:route.length});
    }
  }
  reposition.sort((a,b)=>a.len-b.len);
  return reposition[0]?moveArmy(s,reposition[0].army.id,reposition[0].target.id):false;
}

function militaryAction(s,fid,p){
  if(maneuverAction(s,fid,p))return true;
  if(operationalArmies(s,fid).length>=maxConcurrentArmies(s,fid,p))return false;
  const c=attackCandidates(s,fid,p)[0];
  if(!c||c.score<42)return false;
  const food=Math.min(900,round100(Math.max(500,c.base.food*.12)));
  const id=createArmy(s,{factionId:fid,origin:c.base.id,destination:c.target.id,commanderId:c.lead.id,troops:c.troops,food});
  if(id)declareWarForAttack(s,fid,c.target.owner);
  return Boolean(id);
}

function defenseAction(s,fid,p){
  const choices=factionHoldings(s,fid).map(h=>({h,...frontlineInfo(s,h,fid)})).filter(x=>x.frontline&&x.h.money>=350&&x.h.food>=250)
    .map(x=>({...x,score:(x.enemyTroops-x.h.troops)/50+p.caution*28+p.aggression*8}))
    .sort((a,b)=>b.score-a.score);
  const c=choices[0];if(!c||c.h.troops>=Math.max(2200,c.enemyTroops*.72))return false;
  return recruit(s,c.h.id,500,fid);
}

function mobilizationAction(s,fid,p){
  const choices=factionHoldings(s,fid).map(h=>{
    const front=frontlineInfo(s,h,fid);
    const desired=front.frontline
      ? 2600+Math.round(p.caution*900+p.aggression*500)
      : 1500+Math.round(p.aggression*1100+p.caution*450);
    return {h,front,desired,gap:desired-h.troops};
  }).filter(x=>x.gap>=300&&x.h.money>=850&&x.h.food>=900)
    .sort((a,b)=>(b.gap+(b.front.frontline?700:0))-(a.gap+(a.front.frontline?700:0)));
  const c=choices[0];if(!c)return false;
  const amount=c.gap>=900?400:300;
  return recruit(s,c.h.id,amount,fid);
}

function logisticsAction(s,fid,p){
  const hs=factionHoldings(s,fid);if(hs.length<2)return false;
  const needs=hs.map(h=>({h,front:frontlineInfo(s,h,fid).frontline,need:(frontlineInfo(s,h,fid).frontline?3500:2200)-h.food})).filter(x=>x.need>500).sort((a,b)=>b.need-a.need);
  const target=needs[0];if(!target)return false;
  const donors=hs.filter(h=>h.id!==target.h.id&&h.food>4800&&path(h.id,target.h.id)).sort((a,b)=>b.food-a.food);
  for(const donor of donors){
    const leader=available(s,fid,donor.id).sort((a,b)=>(b.intelligence+b.politics)-(a.intelligence+a.politics))[0];
    if(!leader)continue;
    const amount=round100(Math.min(1800,donor.food-3200,Math.max(800,target.need)));
    if(amount<500)continue;
    if(createTransport(s,{factionId:fid,origin:donor.id,destination:target.h.id,commanderId:leader.id,cargo:{food:amount}}))return true;
  }
  return false;
}

function administrationAction(s,fid){
  const roleScore={
    governor:o=>o.politics*.62+o.intelligence*.23+o.charisma*.15,
    logistics:o=>o.intelligence*.62+o.politics*.28+o.charisma*.10,
    recruiter:o=>o.charisma*.55+o.martial*.25+o.politics*.20
  };
  for(const h of factionHoldings(s,fid)){
    const assigned=new Set(Object.values(h.officerAssignments||{}).filter(Boolean));
    for(const role of ['governor','logistics','recruiter']){
      const currentId=h.officerAssignments?.[role],current=currentId?s.officers[currentId]:null;
      if(current&&current.faction===fid&&current.status==='available'&&current.location===h.id)continue;
      const candidate=available(s,fid,h.id).filter(o=>!assigned.has(o.id)).sort((a,b)=>roleScore[role](b)-roleScore[role](a))[0];
      if(candidate&&assignOfficerRole(s,h.id,role,candidate.id,fid))return true;
    }
  }
  return false;
}

function economyAction(s,fid,p){
  const hs=factionHoldings(s,fid);
  // First recover a cash-starved city from food reserves instead of spending its last money on another action.
  const cashRisk=hs.filter(h=>h.money<700&&h.food>3000).sort((a,b)=>a.money-b.money)[0];
  if(cashRisk&&trade(s,cashRisk.id,'sell_food',500,fid))return true;
  const foodRisk=hs.filter(h=>h.food<2000&&h.money>=500).sort((a,b)=>a.food-b.food)[0];
  if(foodRisk&&p.logistics>=.45&&produce(s,foodRisk.id,fid))return true;
  const buy=hs.filter(h=>h.food<1000&&h.money>1700).sort((a,b)=>a.food-b.food)[0];
  if(buy&&trade(s,buy.id,'buy_food',500,fid))return true;
  const surplus=hs.filter(h=>h.food>5200&&h.money<1500).sort((a,b)=>b.food-a.food)[0];
  if(surplus&&trade(s,surplus.id,'sell_food',500,fid))return true;
  const dev=hs.filter(h=>h.money>=1100&&h.development<h.cap).sort((a,b)=>(a.development/a.cap)-(b.development/b.cap))[0];
  if(dev&&p.development>.25&&develop(s,dev.id,fid))return true;
  return false;
}

function prisonerAction(s,fid){
  const prisoner=Object.values(s.officers).find(o=>o.status==='prisoner'&&o.captorFaction===fid);if(!prisoner)return false;
  const recruiter=available(s,fid,prisoner.location).sort((a,b)=>b.charisma-a.charisma)[0];
  if(!recruiter)return false;
  return recruitPrisoner(s,prisoner.id,recruiter.id,fid);
}

function diplomacyAction(s,fid,p){
  if(p.diplomacy<.45)return false;
  const own=factionHoldings(s,fid).reduce((n,h)=>n+h.troops,0);
  const wars=FACTIONS.filter(f=>f.id!==fid&&diplomacyStatus(s,fid,f.id).status==='war');
  for(const enemy of wars){
    const theirs=factionHoldings(s,enemy.id).reduce((n,h)=>n+h.troops,0);
    const danger=theirs/Math.max(1,own);
    const desire=p.caution*.55+p.diplomacy*.35-(p.aggression*.30);
    if(danger>1.05&&desire>.45&&rng(s)<clamp01(desire))return setDiplomacy(s,fid,enemy.id,'truce',fid);
  }
  return false;
}

function actionUtilities(s,fid,p){
  const hs=factionHoldings(s,fid);
  const frontline=hs.some(h=>frontlineInfo(s,h,fid).frontline);
  const lowFood=hs.some(h=>h.food<2400);
  const cashStarved=hs.some(h=>h.money<700);
  const armies=operationalArmies(s,fid);
  const armyRoom=armies.length<maxConcurrentArmies(s,fid,p);
  const maneuverable=armies.some(a=>a.status==='waiting');
  const missingAdmin=hs.some(h=>Object.values(h.officerAssignments||{}).some(id=>!id)||Object.values(h.officerAssignments||{}).some(id=>id&&s.officers[id]?.status!=='available'));
  return [
    {kind:'defense',score:(frontline?52:12)+p.caution*24,run:()=>defenseAction(s,fid,p)},
    {kind:'military',score:(frontline?42:28)+p.aggression*42+p.opportunism*12+((armyRoom||maneuverable)?12:-35),run:()=>militaryAction(s,fid,p)},
    {kind:'mobilization',score:28+p.aggression*25+p.caution*12+(frontline?10:0)-(cashStarved?28:0),run:()=>mobilizationAction(s,fid,p)},
    {kind:'logistics',score:(lowFood?48:16)+p.logistics*36,run:()=>logisticsAction(s,fid,p)},
    {kind:'administration',score:(missingAdmin?54:5)+p.development*18+p.logistics*12,run:()=>administrationAction(s,fid)},
    {kind:'economy',score:25+p.development*35+(lowFood?12:0)+(cashStarved?34:0),run:()=>economyAction(s,fid,p)},
    {kind:'prisoner',score:24+p.diplomacy*12,run:()=>prisonerAction(s,fid)},
    {kind:'diplomacy',score:12+p.diplomacy*28+p.caution*10,run:()=>diplomacyAction(s,fid,p)}
  ];
}

function recordAIAction(s,fid,kind){
  s.stats.aiOrders++;
  s.stats.aiByFaction ||= {};
  const row=s.stats.aiByFaction[fid] ||= {total:0,military:0,defense:0,mobilization:0,logistics:0,administration:0,economy:0,prisoner:0,diplomacy:0};
  row.total++;
  row[kind]=(row[kind]||0)+1;
}

export function runStrategicAI(s){
  for(const f of FACTIONS){
    if(f.id===s.playerFaction)continue;
    if(!factionHoldings(s,f.id).length)continue;
    cleanupExhaustedArmies(s,f.id);
    const profile=getFactionAIProfile(s,f.id),budget=cycleBudget(s,f.id),used=new Map();
    for(let slot=0;slot<budget;slot++){
      const actions=actionUtilities(s,f.id,profile)
        .map(a=>({...a,score:a.score-(used.get(a.kind)||0)*18+rng(s)*5}))
        .sort((a,b)=>b.score-a.score);
      let acted=false;
      for(const a of actions){
        if(a.run()){
          used.set(a.kind,(used.get(a.kind)||0)+1);
          recordAIAction(s,f.id,a.kind);
          acted=true;
          break;
        }
      }
      if(!acted)break;
    }
  }
  return s;
}