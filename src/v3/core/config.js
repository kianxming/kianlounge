import { CHARACTERS } from '../../data.js';

export const GRID={w:18,h:13};
export const FACILITIES={
  headquarters:{name:'본부',icon:'🏯',rank:1,size:[3,2],fee:0,stay:2.8,bubble:'📋'},
  lodge:{name:'공동 숙소',icon:'🛏️',rank:1,size:[3,2],fee:0,stay:3.2,bubble:'😌'},
  restaurant:{name:'음식점',icon:'🍖',rank:1,size:[2,2],fee:90,stay:2.4,bubble:'😋'},
  dojo:{name:'연무장',icon:'⚔️',rank:1,size:[3,2],fee:0,stay:3,bubble:'💪'},
  shop:{name:'장비점',icon:'🛍️',rank:1,size:[2,2],fee:130,stay:2.5,bubble:'✨'},
  tavern:{name:'술집',icon:'🍶',rank:2,size:[2,2],fee:100,stay:2.8,bubble:'🙂'},
  bath:{name:'목욕탕',icon:'♨️',rank:2,size:[3,2],fee:80,stay:3,bubble:'♨️'},
  clinic:{name:'치료소',icon:'🏥',rank:2,size:[2,2],fee:0,stay:3.4,bubble:'😊'},
  prison:{name:'감옥',icon:'⛓️',rank:2,size:[3,2],fee:0,stay:0,bubble:''},
  square:{name:'광장',icon:'🌸',rank:2,size:[3,2],fee:0,stay:2,bubble:'💬'},
  smithy:{name:'무기 공방',icon:'🔨',rank:3,size:[3,2],fee:150,stay:2.8,bubble:'⚒️'},
  theater:{name:'극장',icon:'🎭',rank:4,size:[3,2],fee:180,stay:3,bubble:'🎉'}
};

export const BASE_FACILITIES=[
  {id:'hq',type:'headquarters',x:7,y:1},{id:'lodge',type:'lodge',x:2,y:2},{id:'restaurant',type:'restaurant',x:12,y:2},
  {id:'dojo',type:'dojo',x:2,y:8},{id:'shop',type:'shop',x:13,y:8},{id:'tavern',type:'tavern',x:8,y:8},
  {id:'clinic',type:'clinic',x:13,y:5},{id:'prison',type:'prison',x:7,y:5}
];

export const PLAYER_IDS=['luffy','zoro','sanji','nami','usopp','chopper','robin','franky'];
export const PREFS={
  luffy:{restaurant:10,square:6,lodge:4,dojo:4,tavern:2,shop:1},
  zoro:{dojo:10,tavern:8,bath:4,restaurant:4,lodge:3},
  sanji:{restaurant:8,square:5,shop:4,lodge:3,dojo:4},
  nami:{shop:9,restaurant:5,square:5,bath:5,tavern:4},
  usopp:{shop:7,square:7,restaurant:6,dojo:3,lodge:4},
  chopper:{clinic:10,restaurant:6,square:6,lodge:5},
  robin:{square:8,restaurant:5,lodge:6,bath:5},
  franky:{shop:8,dojo:7,restaurant:5,square:4},
  kaido:{tavern:10,dojo:9,lodge:4,square:2},
  king:{dojo:10,lodge:6,tavern:3,square:2},
  queen:{shop:9,smithy:9,tavern:8,restaurant:6,clinic:4},
  jack:{dojo:9,lodge:6,restaurant:4,tavern:3},
  ulti:{square:9,restaurant:8,dojo:6,shop:5,tavern:3},
  page_one:{lodge:7,restaurant:6,dojo:6,square:5,shop:3},
  law:{clinic:8,lodge:6,shop:5,dojo:5,square:3}
};
export const prefsOf=id=>PREFS[id]||{dojo:6,restaurant:5,lodge:4,square:4,tavern:3,shop:3};

export const START={luffy:[8,11],zoro:[5,11],sanji:[10,11],nami:[12,11],usopp:[3,11],chopper:[14,11],robin:[7,11],franky:[16,11]};
const KO={luffy:'루피',zoro:'조로',sanji:'상디',nami:'나미',usopp:'우솝',chopper:'쵸파',robin:'로빈',franky:'프랑키',law:'로',king:'킹',queen:'퀸',jack:'잭',ulti:'울티',page_one:'페이지원',kaido:'카이도'};
export const coreOf=id=>CHARACTERS.find(c=>c.id===id)||{};
export const nameOf=id=>KO[id]||coreOf(id).name||id;
export const key=(x,y)=>`${x},${y}`;
export const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
export const pick=a=>a[Math.floor(Math.random()*a.length)];
