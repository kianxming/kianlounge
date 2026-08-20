import {pairEvent} from '../core/config.js';

// Kairosoft-style "watching is fun" layer for the first V3 village slice.
// It deliberately stays simple: no hunger/fatigue meters, only preferences,
// short reactions, character relationships, and visible prisoner life.
function install(){
  const api=window.__V3__;
  if(!api?.sim||api.sim.__kairoLifeInstalled)return false;
  const sim=api.sim;sim.__kairoLifeInstalled=true;
  const baseFinishUse=sim.finishUse.bind(sim);
  const baseCapture=sim.capture.bind(sim);
  const basePersuade=sim.persuade.bind(sim);
  const basePrisonBreak=sim.tryPrisonBreak.bind(sim);

  sim.prisonVisuals=[];

  function prisonCells(){
    const prison=sim.facilities.find(f=>f.type==='prison');
    if(!prison)return [[8,6]];
    return [
      [prison.x,prison.y],[prison.x+1,prison.y],[prison.x+2,prison.y],
      [prison.x,prison.y+1],[prison.x+1,prison.y+1],[prison.x+2,prison.y+1]
    ];
  }

  function syncPrisonVisuals(){
    const old=new Map(sim.prisonVisuals.map(v=>[v.prisonerId,v]));
    const cells=prisonCells();
    sim.prisonVisuals=sim.prisoners.map((p,i)=>{
      const prev=old.get(p.id),cell=cells[i%cells.length];
      return prev||{
        id:`prison_visual_${p.id}`,
        prisonerId:p.id,
        name:`${p.name} ⛓`,
        x:cell[0],y:cell[1],state:'prison',bubble:'',bubbleTime:0,
        _wander:.8+Math.random()*1.8
      };
    });
  }

  function updatePrisonVisuals(dt){
    const cells=prisonCells();
    for(const v of sim.prisonVisuals){
      if(v.bubbleTime>0){v.bubbleTime-=dt;if(v.bubbleTime<=0)v.bubble='';}
      v._wander-=dt;
      if(v._wander>0)continue;
      const cell=cells[Math.floor(Math.random()*cells.length)];
      v.x=cell[0];v.y=cell[1];v._wander=1.1+Math.random()*2.1;
      if(Math.random()<.28){v.bubble=Math.random()<.45?'…':Math.random()<.6?'💢':'😐';v.bubbleTime=1.1;}
    }
  }

  // Render named prisoners inside the actual prison building, but never let them
  // join the normal town facility-selection AI.
  sim.activeCharacters=function(){
    return this.characters.filter(c=>c.location==='flower_capital').concat(this.prisonVisuals);
  };
  sim.updateCharacters=function(dt){
    this.updateAgentGroup(this.characters.filter(c=>c.location==='flower_capital'),this,dt,true);
    updatePrisonVisuals(dt);
  };

  // Layer canon-flavoured pair reactions over the generic same-facility chatter.
  sim.finishUse=function(c,ctx,list,playerEconomy){
    const facility=ctx.facilities.find(f=>f.id===c.using);
    const other=facility&&list.find(o=>o.id!==c.id&&o.using===facility.id&&o.state==='using');
    const evt=other?pairEvent(c.id,other.id):null;
    baseFinishUse(c,ctx,list,playerEconomy);
    if(evt&&Math.random()<.7){
      c.bubble=evt.bubble;c.bubbleTime=1.7;
      other.bubble=evt.bubble;other.bubbleTime=1.35;
      this.pushLog(evt.text,ctx);
    }
  };

  sim.capture=function(...args){const r=baseCapture(...args);syncPrisonVisuals();return r;};
  sim.persuade=function(...args){const r=basePersuade(...args);syncPrisonVisuals();return r;};
  sim.tryPrisonBreak=function(...args){const r=basePrisonBreak(...args);syncPrisonVisuals();return r;};

  syncPrisonVisuals();
  api.render();
  return true;
}

if(!install()){
  let tries=0;
  const timer=setInterval(()=>{tries++;if(install()||tries>100)clearInterval(timer);},20);
}
