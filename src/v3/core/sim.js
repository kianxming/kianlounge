import {BASE_FACILITIES,PLAYER_IDS,START,FACILITIES,nameOf,coreOf,prefsOf} from './config.js';
import {makeRoads,chooseFacility,canBuild,canBuildRoad,key} from './village.js';
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

function runtimeFacility(f){return{...f,level:1,uses:0,revenue:0};}
function makeAgent(id,pos,location){
  return{id,name:nameOf(id),core:coreOf(id),prefs:prefsOf(id),x:pos[0],y:pos[1],state:'idle',path:[],wait:.3+Math.random(),step:0,using:null,bubble:'',bubbleTime:0,personalMoney:2500+Math.floor(Math.random()*2500),location,injury:'normal'};
}

export class V3Sim{
  constructor(){
    this.money=25800;this.fame=620;this.townRank=2;this.townName='꽃의 도시';this.day=1;this.minute=490;this.paused=false;this.mode='village';this.currentSettlement='flower_capital';
    this.roads=makeRoads();this.facilities=BASE_FACILITIES.map(runtimeFacility);this.prisoners=[];this.seq=0;
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
  }

  onChange(f){this.listeners.push(f);}
  emit(){this.listeners.forEach(f=>f(this));}
  formatTime(){return`${String(Math.floor(this.minute/60)).padStart(2,'0')}:${String(this.minute%60).padStart(2,'0')}`;}
  pushLog(msg,ctx=this){const list=ctx.log||this.log;list.unshift(msg);if(list.length>8)list.length=8;}

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
  onNewDay(){this.fame+=Math.max(2,Math.floor(this.facilities.reduce((n,f)=>n+f.uses,0)/30));for(const p of this.prisoners)if(p.nextPersuadeDay<=this.day)p.cooldown=false;}

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
    if(f.type==='shop'&&Math.random()<.3)c.bubble='🛍️✨';
    if(f.type==='dojo'&&Math.random()<.25)c.bubble='⚔️!';
    if(f.type==='clinic')c.injury='normal';
    const other=list.find(o=>o.id!==c.id&&o.using===f.id&&o.state==='using');
    if(other&&Math.random()<.32){c.bubble='💬🙂';other.bubble='💬';other.bubbleTime=1.3;this.pushLog(`${c.name}와 ${other.name}이(가) ${d.name}에서 마주쳤습니다.`,ctx);}
    c.state='idle';c.using=null;c.wait=.7+Math.random()*1.8;
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
  rankUp(){if(!this.canRankUp())return false;this.townRank++;this.pushLog(`${this.townName}이(가) ★${this.townRank} 거점으로 성장했습니다!`);this.emit();return true;}

  startScout(id){
    const s=this.settlements[id];if(!s||s.owner==='straw_hat')return false;
    const layout=(SCOUT_LAYOUTS[id]||SCOUT_LAYOUTS.bakura).map(runtimeFacility);
    const ids=s.chars.length?s.chars:['jack'];
    this.scout={settlementId:id,name:s.name,owner:s.owner,townRank:Math.min(4,Math.max(2,Math.round(s.troops/1600))),roads:makeRoads(),facilities:layout,characters:ids.map((cid,i)=>makeAgent(cid,SCOUT_POS[i%SCOUT_POS.length],id)),log:[`${s.name} 내부를 관찰하고 있습니다.`]};
    this.currentSettlement=id;this.mode='scout';this.paused=false;this.emit();return true;
  }

  dispatch(targetId,charIds,troops){
    const t=this.settlements[targetId],cs=this.characters.filter(c=>charIds.includes(c.id)&&c.location==='flower_capital');
    if(!t||!cs.length||troops<=0)return false;
    cs.forEach(c=>c.location='march');this.armies.push({id:`army_${++this.seq}`,from:'flower_capital',target:targetId,charIds:cs.map(c=>c.id),troops,progress:0,duration:8+Math.random()*5});
    this.mode='world';this.pushLog(`${cs.map(c=>c.name).join('·')} 출정!`);this.emit();return true;
  }

  updateArmies(dt){
    for(const a of this.armies){
      if(a.done)continue;
      if((a.progress+=dt/a.duration)>=1){
        a.progress=1;a.done=true;const t=this.settlements[a.target];
        if(t.owner!=='straw_hat'){this.encounter={armyId:a.id,targetId:t.id};this.paused=true;}
        else a.charIds.forEach(id=>{const c=this.characters.find(x=>x.id===id);if(c)c.location=t.id;});
      }
    }
  }

  startBattle(){beginBattle(this);this.emit();}
  setBattleFocus(a,e){
    if(!this.battle)return;this.battle.focus[a]=e;
    const names=Object.entries(this.battle.focus).filter(([,enemy])=>enemy===e).map(([ally])=>this.battle.allies.find(x=>x.id===ally)?.name).filter(Boolean);
    const target=this.battle.enemies.find(x=>x.id===e)?.name||e;
    this.battle.log.unshift(names.length>1?`🔥 ${names.join('·')} → ${target} ${names.length}대1 협공!`:`⚔ ${names[0]||a} → ${target} 강자 교전!`);
  }
  autoResolveEncounter(){beginBattle(this);let guard=0;while(this.battle&&!this.battle.finished&&guard++<300)updateBattle(this,.8);this.mode='world';this.paused=false;this.emit();}

  capture(id,from){
    if(this.prisoners.some(p=>p.id===id))return;
    this.prisoners.push({id,name:nameOf(id),from,loyalty:id==='king'?95:id==='queen'?76:65,cooldown:false,nextPersuadeDay:this.day});
    const s=this.settlements[from];if(s)s.chars=s.chars.filter(x=>x!==id);
  }
  persuade(id){
    const p=this.prisoners.find(x=>x.id===id);if(!p||p.cooldown)return{ok:false,msg:'아직 다시 회유할 수 없습니다.'};
    const ok=Math.random()<Math.max(.04,(100-p.loyalty)/150);p.cooldown=true;p.nextPersuadeDay=this.day+5;
    if(ok){
      this.prisoners=this.prisoners.filter(x=>x.id!==id);const c=makeAgent(p.id,[8,11],'flower_capital');c.bubble='😐';c.bubbleTime=2;this.characters.push(c);this.settlements.flower_capital.chars.push(c.id);
      return{ok:true,msg:`${p.name}이(가) 합류했습니다.`};
    }
    return{ok:false,msg:`${p.name}은(는) 아직 마음을 열지 않았습니다.`};
  }

  returnToWorld(){this.mode='world';this.scout=null;this.currentSettlement='flower_capital';this.paused=false;this.emit();}
  returnToVillage(){this.currentSettlement='flower_capital';this.mode='village';this.scout=null;this.paused=false;this.emit();}
}
