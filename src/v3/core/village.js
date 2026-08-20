import {GRID,FACILITIES,key,pick} from './config.js';

export function makeRoads(){
  const r=new Set();
  for(let x=0;x<GRID.w;x++){r.add(key(x,11));r.add(key(x,7));r.add(key(x,4));}
  for(let y=0;y<GRID.h;y++){r.add(key(1,y));r.add(key(6,y));r.add(key(11,y));r.add(key(16,y));}
  return r;
}

export function footprint(f){
  const [w,h]=FACILITIES[f.type].size,out=[];
  for(let y=f.y;y<f.y+h;y++)for(let x=f.x;x<f.x+w;x++)out.push([x,y]);
  return out;
}

const near=(x,y)=>[[x+1,y],[x-1,y],[x,y+1],[x,y-1]].filter(([a,b])=>a>=0&&b>=0&&a<GRID.w&&b<GRID.h);

export function entrance(sim,f){
  const [w,h]=FACILITIES[f.type].size,c=[];
  for(let x=f.x;x<f.x+w;x++)c.push([x,f.y-1],[x,f.y+h]);
  for(let y=f.y;y<f.y+h;y++)c.push([f.x-1,y],[f.x+w,y]);
  return c.find(([x,y])=>x>=0&&y>=0&&x<GRID.w&&y<GRID.h&&sim.roads.has(key(x,y)))||null;
}

export function path(sim,sx,sy,tx,ty){
  const blocked=new Set(sim.facilities.flatMap(footprint).map(([x,y])=>key(x,y))),q=[[sx,sy]],prev=new Map([[key(sx,sy),null]]);
  while(q.length){
    const [x,y]=q.shift();
    if(x===tx&&y===ty)break;
    for(const [nx,ny] of near(x,y)){
      const k=key(nx,ny);
      if(prev.has(k)||blocked.has(k)||!sim.roads.has(k))continue;
      prev.set(k,[x,y]);q.push([nx,ny]);
    }
  }
  if(!prev.has(key(tx,ty)))return[];
  const out=[];let p=[tx,ty];
  while(p&&!(p[0]===sx&&p[1]===sy)){out.unshift(p);p=prev.get(key(p[0],p[1]));}
  return out;
}

export function chooseFacility(sim,c){
  const list=sim.facilities.filter(f=>!['headquarters','prison'].includes(f.type)&&FACILITIES[f.type].rank<=sim.townRank),bag=[];
  for(const f of list)for(let i=0;i<Math.max(1,c.prefs[f.type]??2);i++)bag.push(f);
  if(!bag.length)return null;
  for(let n=0;n<12;n++){
    const f=pick(bag),e=f&&entrance(sim,f);
    if(!e)continue;
    const p=path(sim,c.x,c.y,e[0],e[1]);
    if(p.length)return{f,p};
  }
  return null;
}

export function canBuild(sim,type,x,y){
  const d=FACILITIES[type];
  if(!d||d.rank>sim.townRank)return false;
  const blocked=new Set(sim.facilities.flatMap(footprint).map(([a,b])=>key(a,b))),[w,h]=d.size;
  for(let yy=y;yy<y+h;yy++)for(let xx=x;xx<x+w;xx++){
    if(xx<0||yy<0||xx>=GRID.w||yy>=GRID.h||blocked.has(key(xx,yy))||sim.roads.has(key(xx,yy)))return false;
  }
  return !!entrance(sim,{type,x,y});
}

export function canBuildRoad(sim,x,y){
  if(x<0||y<0||x>=GRID.w||y>=GRID.h||sim.roads.has(key(x,y)))return false;
  return !sim.facilities.some(f=>footprint(f).some(([fx,fy])=>fx===x&&fy===y));
}
