import {BASE_FACILITIES,PLAYER_IDS,START,FACILITIES,GENERAL_GEAR,SPECIAL_ITEMS,nameOf,coreOf,prefsOf,prisonProfile,key,clamp} from './config.js';
import {makeRoads,chooseFacility,canBuild,canBuildRoad} from './village.js';
import {beginBattle,updateBattle} from './battle.js';

const SCOUT_LAYOUTS={
  bakura:[
    {id:'s_lodge',type:'lodge',x:2,y:2},{id:'s_restaurant',type:'restaurant',x:12,y:2},{id:'s_dojo',type:'dojo',x:2,y:8},
    {id:'s_shop',type:'shop',x:13,y:8},{id:'s_tavern',type:'tavern',x:8,y:8},{id:'s_prison',type:'prison',x:7,y:5},{id:'s_square',type:'square',x:12,y:5}
  ],
  udon:[
    {id:'s_lodge',type:'lodge',x:2,y:2},{id:'s_dojo',type:'dojo',x:2,y:8},{id:'s_smithy',type:'smithy',x:12,y:8},
    {id:'s_clinic',type:'clinic',x:13,y:2},{id:'s_prison',type:'prison',x:7,y:5},{id:'s_tavern',type:'tavern',x:8,y:8}
  ],
  onigashima:[
    {id:'s_hq',type:'headquarters',x:7,y:1},{id:'s_lodge',type:'lodge',x:2,y:2},{id:'s_dojo',type:'dojo',x:2,y:8},
    {id:'s_tavern',type:'tavern',x:8,y:8},{id:'s_clinic',type:'clinic',x:13,y:5},{id:'s_prison',type:'prison',x:7,y:5},{id:'s_shop',type:'shop',x:13,y:8}
  ]
};
const SCOUT_POS=[[3,11],[5,11],[8,11],[10,11],[13,11],[15,11]];
const CANON_FRUIT_USERS=new Set(['luffy','law','kid','kaido','big_mom','perospero','orochi','kanjuro','yamato','king','queen','jack']);
const clone=v=>JSON.parse(JSON.stringify(v));

function runtimeFacility(f){return{...f,level:f.level||1,uses:f.uses||0,revenue:f.revenue||0};}
function makeAgent(id,pos,location){
  return{id,name:nameOf(id),core:coreOf(id),prefs:prefsOf(id),x:pos[0],y:pos[1],state:'idle',path:[],wait:.3+Math.random(),step:0,using:null,bubble:'',bubbleTime:0,personalMoney:2500+Math.floor(Math.random()*2500),location,injury:'normal',gearRank:1,gearName:'기본 장비',hasFruit:CANON_FRUIT_USERS.has(id),specialItems:[]};
}
function normalizeAgent(raw){
  const c={...makeAgent(raw.id,[raw.x??8,raw.y??11],raw.location||'flower_capital'),...raw};
  c.core=coreOf(c.id);c.prefs=prefsOf(c.id);c.path=Array.isArray(c.path)?c.path:[];c.specialItems=Array.isArray(c.specialItems)?c.specialItems:[];return c;
}

export class V3Sim{
  constructor(saved=null){
    this.money=25800;this.fame=620;this.townRank=2;this.townName='꽃의 도시';this.day=1;this.minute=490;this.paused=false;this.mode='village';this.currentSettlement='flower_capital';
    this.roads=makeRoads();this.facilities=BASE_FACILITIES.map(runtimeFacility);this.prisoners=[];this.treasury=['fruit_mera','sword_shusui'];this.seq=0;this.nextEnemySortieDay=3;
    this.characters=PLAYER_IDS.map(id=>makeAgent(id,START[id],'flower_capital'));
    this.settlements={
      flower_capital:{id:'flower_capital',name:'꽃의 도시',owner:'straw_hat',troops:2400,x:48,y:52,kind:'성',chars:this.characters.map(c=>c.id)},
      bakura:{id:'bakura',name:'바쿠라',owner:'beasts',troops:2800,x:66,y:47,kind:'마을',chars:['jack','ulti','page_one']},
      udon:{id:'udon',name:'우동',owner:'beasts',troops:3300,x:73,y:60,kind:'감옥도시',chars:['queen']},
      onigashima:{id:'onigashima',name:'오니가시마',owner:'beasts',troops:5200,x:80,y:20,kind:'요새',chars:['kaido','king']},
      amigasa:{id:'amigasa',name:'아미가사',owner:'kozuki',troops:1400,x:31,y:58,kind:'촌락',chars:[]},
      kuri:{id:'kuri',name:'쿠리',owner:'straw_hat',troops:900,x:28,y:37,kind:'촌락',chars:[]}
    };
    this.armies=[];this.encounter=null;this.battle=null;this.scout=null;this.log=['꽃의 도시의 하루가 시작되었습니다.'];this.listeners=[];this.clock=0;
    if(saved)this.restore(saved);
  }

  onChange(f){this.listeners.push(f);}
  emit(){this.listeners.forEach(f=>f(this));}
  formatTime(){return`${String(Math.floor(this.minute/60)).padStart(2,'0')}:${String(this.minute%60).padStart(2,'0')}`;}
  pushLog(msg,ctx=this){const list=ctx.log||this.log;list.unshift(msg);if(list.length>10)list.length=10;}

  tick(dt){
    if(!this.paused){
      this.clock+=dt*3;
      while(this.clock>=1){this.clock--;if(++this.minute>=1440){this.minute=0;this.day++;this.onNewDay();}}
      this.updateCharacters(dt);
      if(this.mode==='scout'&&this.scout)this.updateAgentGroup(this.scout.characters,this.scout,dt,false);
      this.updateArmies(dt);
      updateBattle(this,dt);
    }
    this.updateBubbles(this.characters,dt);
    if(this.scout)this.updateBubbles(this.scout.characters,dt);
  }

  updateBubbles(list,dt){for(const c of list){if(c.bubbleTime>0)c.bubbleTime-=dt;else c.bubble='';}}
  onNewDay(){
    this.fame+=Math.max(2,Math.floor(this.facilities.reduce((n,f)=>n+f.uses,0)/30));
    for(const p of this.prisoners)if(p.nextPersuadeDay<=this.day)p.cooldown=false;
    if(this.day>=this.nextEnemySortieDay){this.spawnEnemySortie();this.nextEnemySortieDay=this.day+2+Math.floor(Math.random()*2);}
  }

  activeCharacters(){return this.characters.filter(c=>c.location==='flower_capital');}
  facilityAt(id){return this.facilities.find(f=>f.id===id);}
  updateCharacters(dt){this.updateAgentGroup(this.activeCharacters(),this,dt,true);}

  updateAgentGroup(list,ctx,dt,playerEconomy){
    for(const c of list){
      if(c.state==='moving'){
        c.step+=dt;
        if(c.step>=.18){
          c.step=0;const p=c.path.shift();if(p){c.x=p[0];c.y=p[1];}
          if(!c.path.length){const f=ctx.facilities.find(x=>x.id===c.using);if(f){c.state='using';c.wait=FACILITIES[f.type].stay;}else{c.state='idle';c.wait=.7;}}
        }
      }else if(c.state==='using'){
        if((c.wait-=dt)<=0)this.finishUse(c,ctx,list,playerEconomy);
      }else if((c.wait-=dt)<=0){
        const n=chooseFacility(ctx,c);
        if(n){c.using=n.f.id;c.path=n.p;c.state='moving';}
        else c.wait=.8+Math.random();
      }
    }
  }

  finishUse(c,ctx,list,playerEconomy){
    const f=ctx.facilities.find(x=>x.id===c.using);if(!f){c.state='idle';c.wait=1;return;}
    const d=FACILITIES[f.type];f.uses++;
    if(playerEconomy&&d.fee){const paid=Math.min(c.personalMoney,d.fee+f.level*10);c.personalMoney-=paid;this.money+=paid;f.revenue+=paid;}
    c.bubble=d.bubble;c.bubbleTime=1.5;
    if(f.type==='shop'&&playerEconomy&&Math.random()<.34)this.tryAutoBuyGear(c,f);
    if(f.type==='dojo'&&Math.random()<.25)c.bubble='⚔️!';
    if(f.type==='clinic')c.injury='normal';
    const other=list.find(o=>o.id!==c.id&&o.using===f.id&&o.state==='using');
    if(other&&Math.random()<.32){c.bubble='💬🙂';other.bubble='💬';other.bubbleTime=1.3;this.pushLog(`${c.name}와 ${other.name}이(가) ${d.name}에서 마주쳤습니다.`,ctx);}
    c.state='idle';c.using=null;c.wait=.7+Math.random()*1.8;
  }

  tryAutoBuyGear(c,f){
    const next=GENERAL_GEAR.find(g=>g.rank===c.gearRank+1);
    if(!next||c.personalMoney<next.cost)return false;
    c.personalMoney-=next.cost;this.money+=next.cost;f.revenue+=next.cost;c.gearRank=next.rank;c.gearName=next.name;c.bubble='🛍️✨';c.bubbleTime=1.8;
    this.pushLog(`${c.name}이(가) ${next.name}을(를) 직접 구입했습니다.`);return true;
  }

  canBuild(type,x,y){return canBuild(this,type,x,y);}
  build(type,x,y){
    if(!this.canBuild(type,x,y))return false;const cost=600+FACILITIES[type].rank*450;if(this.money<cost)return false;
    this.money-=cost;this.facilities.push(runtimeFacility({id:`${type}_${++this.seq}`,type,x,y}));this.pushLog(`${FACILITIES[type].name}을(를) 건설했습니다.`);this.emit();return true;
  }
  canBuildRoad(x,y){return canBuildRoad(this,x,y);}
  buildRoad(x,y){if(!this.canBuildRoad(x,y)||this.money<40)return false;this.money-=40;this.roads.add(key(x,y));this.emit();return true;}
  upgradeFacility(id){const f=this.facilityAt(id);if(!f||f.level>=5||this.money<700*f.level)return false;this.money-=700*f.level;f.level++;this.emit();return true;}
  rankRequirements(){const t=this.townRank+1;return{target:t,fame:t*500,facilities:t*3+3};}
  canRankUp(){const r=this.rankRequirements();return this.townRank<5&&this.fame>=r.fame&&this.facilities.length>=r.facilities;}
  rankUp(){if(!this.canRankUp())return false;this.townRank++;this.pushLog(`${this.townName}이(가) ★${this.townRank} 거점으로 성장했습니다! 새로운 시설이 해금되었습니다.`);this.emit();return true;}

  startScout(id){
    const s=this.settlements[id];if(!s||s.owner==='straw_hat')return false;
    const layout=(SCOUT_LAYOUTS[id]||SCOUT_LAYOUTS.bakura).map(runtimeFacility);
    const ids=s.chars.length?s.chars:['jack'];
    this.scout={settlementId:id,name:s.name,owner:s.owner,townRank:Math.min(4,Math.max(2,Math.round(s.troops/1600))),roads:makeRoads(),facilities:layout,characters:ids.map((cid,i)=>makeAgent(cid,SCOUT_POS[i%SCOUT_POS.length],id)),log:[`${s.name} 내부를 관찰하고 있습니다.`]};
    this.currentSettlement=id;this.mode='scout';this.paused=false;this.emit();return true;
  }

  availableTroops(){return this.settlements.flower_capital?.troops||0;}
  dispatch(targetId,charIds,troops){
    const home=this.settlements.flower_capital,t=this.settlements[targetId],cs=this.characters.filter(c=>charIds.includes(c.id)&&c.location==='flower_capital');
    troops=Math.floor(troops);
    if(!t||t.owner==='straw_hat'||!cs.length||troops<=0||troops>home.troops)return false;
    home.troops-=troops;home.chars=home.chars.filter(id=>!cs.some(c=>c.id===id));cs.forEach(c=>c.location='march');
    this.armies.push({id:`army_${++this.seq}`,owner:'straw_hat',from:'flower_capital',target:targetId,charIds:cs.map(c=>c.id),troops,progress:0,duration:8+Math.random()*5,done:false});
    this.mode='world';this.pushLog(`${cs.map(c=>c.name).join('·')} 출정!`);this.emit();return true;
  }

  spawnEnemySortie(){
    if(this.encounter||this.battle||this.armies.some(a=>!a.done&&a.owner==='beasts'))return false;
    const sources=Object.values(this.settlements).filter(s=>s.owner==='beasts'&&s.troops>=900&&s.chars.length);
    const targets=Object.values(this.settlements).filter(s=>s.owner==='straw_hat');
    if(!sources.length||!targets.length)return false;
    sources.sort((a,b)=>b.troops-a.troops);targets.sort((a,b)=>(a.troops+a.chars.length*300)-(b.troops+b.chars.length*300));
    const from=sources[0],target=targets[0],count=Math.min(2,from.chars.length),charIds=from.chars.slice(0,count),troops=Math.min(1600,Math.max(700,Math.floor(from.troops*.28)));
    from.troops-=troops;from.chars=from.chars.filter(id=>!charIds.includes(id));
    this.armies.push({id:`army_${++this.seq}`,owner:'beasts',from:from.id,target:target.id,charIds,troops,progress:0,duration:9+Math.random()*5,done:false});
    this.pushLog(`⚠ ${charIds.map(nameOf).join('·')}이(가) ${target.name}(으)로 출정했습니다!`);this.emit();return true;
  }

  updateArmies(dt){
    for(const a of this.armies){
      if(a.done)continue;
      a.progress+=dt/a.duration;if(a.progress<1)continue;
      a.progress=1;const t=this.settlements[a.target];
      if(t.owner===a.owner){
        a.done=true;t.troops+=Math.max(0,Math.floor(a.troops));t.chars=[...new Set([...t.chars,...a.charIds])];
        for(const id of a.charIds){const c=this.characters.find(x=>x.id===id);if(c)c.location=t.id;}
        if(a.returning)this.pushLog(`${a.charIds.map(nameOf).join('·')}이(가) ${t.name}에 귀환했습니다.`);
        continue;
      }
      const playerSide=a.owner==='straw_hat'?'attacker':'defender';
      this.encounter={armyId:a.id,targetId:t.id,playerSide};
      if(playerSide==='defender')this.tryPrisonBreak(a,t.id);
      this.paused=true;this.mode='world';this.pushLog(`⚔ ${t.name}에서 군단이 조우했습니다!`);this.emit();break;
    }
  }

  tryPrisonBreak(attackingArmy,targetId){
    if(targetId!=='flower_capital'||!this.prisoners.length)return[];
    const prison=this.facilities.find(f=>f.type==='prison'),security=prison?.level||1,escaped=[];
    for(const p of [...this.prisoners]){
      const profile=prisonProfile(p.id);if(profile.faction!==attackingArmy.owner)continue;
      const chance=clamp((.52-security*.07)*profile.escapeBias,.06,.72);
      if(Math.random()<chance){escaped.push(p);this.prisoners=this.prisoners.filter(x=>x.id!==p.id);attackingArmy.charIds.push(p.id);}
    }
    if(escaped.length)this.pushLog(`🚨 ${escaped.map(p=>p.name).join('·')} 탈옥! 침공군에 합류했습니다.`);
    return escaped;
  }

  startBattle(){beginBattle(this);this.emit();}
  setBattleFocus(a,e){
    if(!this.battle)return;this.battle.focus[a]=e;
    const names=Object.entries(this.battle.focus).filter(([,enemy])=>enemy===e).map(([ally])=>this.battle.allies.find(x=>x.id===ally)?.name).filter(Boolean);
    const target=this.battle.enemies.find(x=>x.id===e)?.name||e;
    this.battle.log.unshift(names.length>1?`🔥 ${names.join('·')} → ${target} ${names.length}대1 협공!`:`⚔ ${names[0]||a} → ${target} 강자 교전!`);
  }
  autoResolveEncounter(){beginBattle(this);let guard=0;while(this.battle&&!this.battle.finished&&guard++<500)updateBattle(this,.8);this.mode='world';this.paused=false;this.emit();}

  createReturnArmy(from,charIds,troops){
    if(!charIds.length)return null;
    for(const id of charIds){const c=this.characters.find(x=>x.id===id);if(c)c.location='march';}
    const a={id:`army_${++this.seq}`,owner:'straw_hat',from,target:'flower_capital',charIds:[...charIds],troops:Math.max(0,Math.floor(troops)),progress:0,duration:6+Math.random()*3,done:false,returning:true};
    this.armies.push(a);return a;
  }

  capture(id,from,faction='beasts'){
    if(this.prisoners.some(p=>p.id===id))return;
    const profile=prisonProfile(id);this.prisoners.push({id,name:nameOf(id),from,faction:profile.faction||faction,loyalty:profile.loyalty,cooldown:false,nextPersuadeDay:this.day,capturedDay:this.day});
    const s=this.settlements[from];if(s)s.chars=s.chars.filter(x=>x!==id);
  }
  persuasionLabel(p){const days=Math.max(0,this.day-p.capturedDay);const score=(100-p.loyalty)+days*2;return score>=55?'보통':score>=30?'낮음':'매우 낮음';}
  persuade(id){
    const p=this.prisoners.find(x=>x.id===id);if(!p||p.cooldown)return{ok:false,msg:'아직 다시 회유할 수 없습니다.'};
    const profile=prisonProfile(p.id),days=Math.max(0,this.day-p.capturedDay),factionAlive=Object.values(this.settlements).some(s=>s.owner===p.faction);
    let chance=.02+((100-p.loyalty)/180)*profile.recruitBias+days*.004;if(!factionAlive)chance+=.18;chance=clamp(chance,.02,.55);
    const ok=Math.random()<chance;p.cooldown=true;p.nextPersuadeDay=this.day+5;
    if(ok){
      this.prisoners=this.prisoners.filter(x=>x.id!==id);const c=makeAgent(p.id,[8,11],'flower_capital');c.bubble='🙂';c.bubbleTime=2;this.characters.push(c);this.settlements.flower_capital.chars.push(c.id);this.pushLog(`${p.name}이(가) 회유되어 동료가 되었습니다!`);return{ok:true,msg:`${p.name}이(가) 합류했습니다.`};
    }
    return{ok:false,msg:`${p.name}은(는) 아직 마음을 열지 않았습니다.`};
  }

  giveTreasure(itemId,charId){
    if(!this.treasury.includes(itemId))return{ok:false,msg:'보물고에 없는 물건입니다.'};
    const item=SPECIAL_ITEMS[itemId],c=this.characters.find(x=>x.id===charId);if(!item||!c)return{ok:false,msg:'대상을 찾을 수 없습니다.'};
    if(item.kind==='fruit'&&c.hasFruit)return{ok:false,msg:`${c.name}은(는) 이미 악마의 열매 능력자입니다.`};
    this.treasury=this.treasury.filter(id=>id!==itemId);c.specialItems.push(itemId);if(item.kind==='fruit')c.hasFruit=true;c.bubble=item.kind==='fruit'?'🍈✨':'⚔️✨';c.bubbleTime=2;
    this.pushLog(`${item.name}을(를) ${c.name}에게 수여했습니다.`);this.emit();return{ok:true,msg:`${c.name}에게 ${item.name}을(를) 수여했습니다.`};
  }

  snapshot(){
    return{version:3,money:this.money,fame:this.fame,townRank:this.townRank,townName:this.townName,day:this.day,minute:this.minute,currentSettlement:'flower_capital',roads:[...this.roads],facilities:clone(this.facilities),prisoners:clone(this.prisoners),treasury:[...this.treasury],seq:this.seq,nextEnemySortieDay:this.nextEnemySortieDay,characters:clone(this.characters),settlements:clone(this.settlements),armies:clone(this.armies),log:[...this.log]};
  }
  restore(d){
    if(!d||d.version!==3)return false;
    this.money=d.money??this.money;this.fame=d.fame??this.fame;this.townRank=d.townRank??this.townRank;this.townName=d.townName||this.townName;this.day=d.day||1;this.minute=d.minute??490;
    this.roads=new Set(d.roads||[...this.roads]);this.facilities=(d.facilities||this.facilities).map(runtimeFacility);this.prisoners=clone(d.prisoners||[]);this.treasury=[...(d.treasury||[])];this.seq=d.seq||0;this.nextEnemySortieDay=d.nextEnemySortieDay||this.day+2;
    this.characters=(d.characters||this.characters).map(normalizeAgent);this.settlements=clone(d.settlements||this.settlements);this.armies=clone(d.armies||[]);this.log=[...(d.log||this.log)];
    this.mode='village';this.currentSettlement='flower_capital';this.paused=false;this.encounter=null;this.battle=null;this.scout=null;this.clock=0;return true;
  }

  returnToWorld(){this.mode='world';this.scout=null;this.currentSettlement='flower_capital';this.paused=false;this.emit();}
  returnToVillage(){this.currentSettlement='flower_capital';this.mode='village';this.scout=null;this.paused=false;this.emit();}
}
