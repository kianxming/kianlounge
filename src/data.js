export const GAME_VERSION = '0.2.0';
export const DEFAULT_PLAYER_FACTION = 'straw_hat';
export const SIM_MINUTES_PER_STEP = 30;
export const BASE_TRAVEL_MINUTES = 240;
export const TACTICAL_TICK_SECONDS = 0.5;

export const FACTIONS = [
  { id:'straw_hat', name:'Straw Hat Faction', short:'Straw Hats', color:'#d5a93a', accent:'#f4dc8d' },
  { id:'beasts', name:'Beasts Pirates', short:'Beasts', color:'#7d4ea3', accent:'#c7a9de' },
  { id:'kozuki', name:'Kozuki Faction', short:'Kozuki', color:'#58a87c', accent:'#9ed7b6' },
  { id:'kurozumi', name:'Kurozumi Faction', short:'Kurozumi', color:'#b35643', accent:'#db9d90' },
  { id:'heart', name:'Heart Pirates', short:'Heart', color:'#d3c46e', accent:'#eee4ad' },
  { id:'kid', name:'Kid Pirates', short:'Kid', color:'#a94848', accent:'#dd9191' },
  { id:'big_mom', name:'Big Mom Pirates', short:'Big Mom', color:'#c56f9f', accent:'#e6b5cf' }
];

export const STRONGHOLDS = [
  { id:'flower_capital', name:'Flower Capital', x:51, y:28, owner:'kurozumi', money:5200, food:7800, troops:5200, development:72, cap:100, market:74 },
  { id:'ebisu', name:'Ebisu', x:40, y:35, owner:'kurozumi', money:2400, food:3900, troops:2100, development:45, cap:80, market:46 },
  { id:'onigashima', name:'Onigashima', x:78, y:13, owner:'beasts', money:4200, food:7200, troops:7000, development:48, cap:70, market:28 },
  { id:'udon_prison', name:'Udon Prison', x:66, y:50, owner:'beasts', money:2600, food:5200, troops:4300, development:43, cap:75, market:31 },
  { id:'tokage_port', name:'Tokage Port', x:68, y:38, owner:'kozuki', money:1800, food:4100, troops:2600, development:36, cap:70, market:52 },
  { id:'bakura', name:'Bakura', x:58, y:43, owner:'beasts', money:3100, food:4800, troops:3600, development:50, cap:80, market:58 },
  { id:'amigasa', name:'Amigasa', x:31, y:49, owner:'kozuki', money:1400, food:4400, troops:2500, development:31, cap:65, market:35 },
  { id:'itachi_port', name:'Itachi Port', x:24, y:61, owner:'heart', money:1800, food:3300, troops:2300, development:32, cap:65, market:51 },
  { id:'habu_port', name:'Habu Port', x:45, y:55, owner:'kozuki', money:2000, food:3900, troops:2700, development:38, cap:70, market:55 },
  { id:'mogura_port', name:'Mogura Port', x:36, y:76, owner:'kid', money:1700, food:3500, troops:2600, development:30, cap:60, market:45 },
  { id:'ringo', name:'Northern Cemetery / Ringo', x:20, y:31, owner:'kozuki', money:1300, food:3600, troops:2200, development:30, cap:60, market:32 },
  { id:'kaeru_port', name:'Kaeru Port', x:17, y:72, owner:'heart', money:1600, food:3700, troops:2100, development:29, cap:60, market:44 },
  { id:'kibi_camp', name:'Kibi Camp', x:36, y:44, owner:'straw_hat', money:1300, food:4200, troops:2800, development:24, cap:55, market:30 },
  { id:'big_mom_anchorage', name:'Big Mom Anchorage', x:80, y:63, owner:'big_mom', money:2700, food:5200, troops:4200, development:28, cap:55, market:38 }
];

export const ROUTES = [
  ['flower_capital','ebisu'],['flower_capital','bakura'],['flower_capital','habu_port'],['ebisu','amigasa'],['ebisu','kibi_camp'],['bakura','udon_prison'],['bakura','tokage_port'],['udon_prison','tokage_port'],['tokage_port','habu_port'],['habu_port','itachi_port'],['itachi_port','amigasa'],['amigasa','ringo'],['ringo','kaeru_port'],['kaeru_port','mogura_port'],['mogura_port','big_mom_anchorage'],['onigashima','tokage_port'],['onigashima','big_mom_anchorage']
].map(([a,b],i)=>({id:`route_${String(i+1).padStart(2,'0')}`,a,b}));

export const GRADE_VALUE = { NONE:0, E:1, D:2, C:3, B:4, A:5, S:6 };
export const TALENT_GRADES = ['E','D','C','B','A','S'];
export const PROFICIENCIES = ['swordsmanship','shooting','handToHand','otherWeapons','devilFruit','specialArts'];

export const SKILLS = {
  basic_strike:{id:'basic_strike',name:'Focused Strike',kind:'common',power:38,cost:10,range:1,area:0,scaling:{martial:.75,proficiency:.2,haki:.05}},
  guard_break:{id:'guard_break',name:'Guard Break',kind:'common',power:34,cost:14,range:1,area:0,morale:12,scaling:{martial:.55,intelligence:.15,proficiency:.2,haki:.1}},
  wide_sweep:{id:'wide_sweep',name:'Wide Sweep',kind:'common',power:28,cost:16,range:1,area:1,troopBias:1.5,scaling:{martial:.6,proficiency:.3,haki:.1}},
  rally:{id:'rally',name:'Rally',kind:'command',power:0,cost:12,range:2,area:1,moraleRestore:18,scaling:{charisma:.8,intelligence:.2}},
  conquerors_burst:{id:'conquerors_burst',name:"Conqueror's Burst",kind:'haki',power:8,cost:24,range:2,area:2,morale:42,troopBias:1.8,requires:{conqueror:'B'},scaling:{charisma:.3,haki:.7}},
  red_hawk:{id:'red_hawk',name:'Red Hawk',kind:'unique',power:68,cost:28,range:1,area:1,scaling:{martial:.45,proficiency:.25,haki:.3}},
  kong_gun:{id:'kong_gun',name:'Kong Gun',kind:'unique',power:92,cost:45,range:1,area:1,ultimate:true,scaling:{martial:.45,proficiency:.25,haki:.3}},
  onigiri:{id:'onigiri',name:'Onigiri',kind:'unique',power:72,cost:25,range:1,area:0,scaling:{martial:.5,proficiency:.35,haki:.15}},
  santoryu_ultimate:{id:'santoryu_ultimate',name:'Three-Sword Secret Art',kind:'unique',power:104,cost:48,range:1,area:1,ultimate:true,scaling:{martial:.45,proficiency:.4,haki:.15}},
  room_slash:{id:'room_slash',name:'ROOM: Amputate',kind:'fruit',power:64,cost:30,range:3,area:1,scaling:{intelligence:.35,martial:.2,proficiency:.35,haki:.1}},
  gamma_knife:{id:'gamma_knife',name:'Gamma Knife',kind:'fruit',power:108,cost:52,range:1,area:0,ultimate:true,scaling:{intelligence:.35,martial:.2,proficiency:.35,haki:.1}},
  punk_gibson:{id:'punk_gibson',name:'Punk Gibson',kind:'fruit',power:70,cost:30,range:2,area:1,scaling:{martial:.4,proficiency:.4,haki:.2}},
  damned_punk:{id:'damned_punk',name:'Damned Punk',kind:'fruit',power:112,cost:55,range:4,area:1,ultimate:true,scaling:{martial:.3,proficiency:.45,haki:.25}},
  thunder_bagua:{id:'thunder_bagua',name:'Thunder Bagua',kind:'unique',power:96,cost:38,range:1,area:0,scaling:{martial:.45,proficiency:.25,haki:.3}},
  flame_dragon:{id:'flame_dragon',name:'Flame Dragon Torch',kind:'fruit',power:128,cost:62,range:2,area:2,ultimate:true,scaling:{martial:.35,proficiency:.35,haki:.3}},
  ikoku:{id:'ikoku',name:'Ikoku Sovereignty',kind:'unique',power:112,cost:52,range:4,area:1,ultimate:true,scaling:{martial:.5,haki:.35,proficiency:.15}},
  candy_wall:{id:'candy_wall',name:'Candy Wall',kind:'fruit',power:22,cost:24,range:2,area:1,moraleRestore:8,scaling:{intelligence:.45,proficiency:.45,haki:.1}},
  black_leg:{id:'black_leg',name:'Black Leg Combo',kind:'unique',power:70,cost:24,range:1,area:0,scaling:{martial:.55,proficiency:.35,haki:.1}},
  radical_beam:{id:'radical_beam',name:'Radical Beam',kind:'unique',power:78,cost:30,range:4,area:1,scaling:{intelligence:.4,martial:.25,proficiency:.35}},
  clima_burst:{id:'clima_burst',name:'Thundercloud Burst',kind:'unique',power:58,cost:26,range:4,area:1,scaling:{intelligence:.55,proficiency:.35,martial:.1}}
};

export const DEVIL_FRUITS = [
  {id:'fruit_nika',name:'Hito Hito no Mi, Model: Nika',kind:'Mythical Zoan',ownerId:'luffy',passives:['Rubber Body'],skillTree:['red_hawk','kong_gun'],awakeningPotential:'S'},
  {id:'fruit_ope',name:'Ope Ope no Mi',kind:'Paramecia',ownerId:'law',passives:['Operating Room'],skillTree:['room_slash','gamma_knife'],awakeningPotential:'S'},
  {id:'fruit_jiki',name:'Jiki Jiki no Mi',kind:'Paramecia',ownerId:'kid',passives:['Magnetism'],skillTree:['punk_gibson','damned_punk'],awakeningPotential:'S'},
  {id:'fruit_seiryu',name:'Uo Uo no Mi, Model: Seiryu',kind:'Mythical Zoan',ownerId:'kaido',passives:['Dragon Form','Flame Clouds'],skillTree:['thunder_bagua','flame_dragon'],awakeningPotential:'S'},
  {id:'fruit_soru',name:'Soru Soru no Mi',kind:'Paramecia',ownerId:'big_mom',passives:['Soul Pocus'],skillTree:['ikoku'],awakeningPotential:'A'},
  {id:'fruit_pero',name:'Pero Pero no Mi',kind:'Paramecia',ownerId:'perospero',passives:['Candy Creation'],skillTree:['candy_wall'],awakeningPotential:'B'},
  {id:'fruit_yamata',name:'Hebi Hebi no Mi, Model: Yamata no Orochi',kind:'Mythical Zoan',ownerId:'orochi',passives:['Multiple Heads'],skillTree:['basic_strike'],awakeningPotential:'B'},
  {id:'fruit_fude',name:'Fude Fude no Mi',kind:'Paramecia',ownerId:'kanjuro',passives:['Ink Creation'],skillTree:['wide_sweep'],awakeningPotential:'B'},
  {id:'fruit_makami',name:'Inu Inu no Mi, Model: Okuchi no Makami',kind:'Mythical Zoan',ownerId:'yamato',passives:['Guardian Beast'],skillTree:['basic_strike','wide_sweep'],awakeningPotential:'A'},
  {id:'fruit_pteranodon',name:'Ryu Ryu no Mi, Model: Pteranodon',kind:'Ancient Zoan',ownerId:'king',passives:['Flight'],skillTree:['wide_sweep'],awakeningPotential:'A'},
  {id:'fruit_brachio',name:'Ryu Ryu no Mi, Model: Brachiosaurus',kind:'Ancient Zoan',ownerId:'queen',passives:['Ancient Zoan Durability'],skillTree:['wide_sweep'],awakeningPotential:'A'},
  {id:'fruit_mammoth',name:'Zou Zou no Mi, Model: Mammoth',kind:'Ancient Zoan',ownerId:'jack',passives:['Ancient Zoan Durability'],skillTree:['wide_sweep'],awakeningPotential:'A'}
];

export const WEAPONS = [
  {id:'weapon_enma',name:'Enma',type:'sword',ownerId:'zoro',quality:'S',traits:['Haki Draw']},
  {id:'weapon_wado',name:'Wado Ichimonji',type:'sword',ownerId:'zoro',quality:'S',traits:['Great Blade']},
  {id:'weapon_sandai',name:'Sandai Kitetsu',type:'sword',ownerId:'zoro',quality:'A',traits:['Cursed Blade']},
  {id:'weapon_ame',name:'Ame no Habakiri',type:'sword',ownerId:'momonosuke',quality:'S',traits:['Great Blade']},
  {id:'weapon_kaido_kanabo',name:"Kaido's Kanabo",type:'club',ownerId:'kaido',quality:'S',traits:['Heavy']},
  {id:'weapon_napoleon',name:'Napoleon',type:'sword',ownerId:'big_mom',quality:'S',traits:['Homie']},
  {id:'weapon_kikoku',name:'Kikoku',type:'sword',ownerId:'law',quality:'S',traits:['Cursed Blade']},
  {id:'weapon_punk_blades',name:"Kid's Scrap Arsenal",type:'other',ownerId:'kid',quality:'A',traits:['Magnetic']},
  {id:'weapon_rotating',name:"Killer's Punishers",type:'other',ownerId:'killer',quality:'A',traits:['Rotating Blades']}
];

const cores = {
  luffy:{martial:92,intelligence:62,politics:28,charisma:96,tier:'CORE',traits:['Natural Leader','Reckless'],proficiencies:{handToHand:'S',devilFruit:'S',specialArts:'A'},haki:{armament:'A',observation:'A',conqueror:'A'},skills:['basic_strike','red_hawk','wide_sweep','conquerors_burst','kong_gun']},
  zoro:{martial:91,intelligence:55,politics:24,charisma:73,tier:'CORE',traits:['Genius Swordsman','Endurance Monster'],proficiencies:{swordsmanship:'S'},haki:{armament:'A',observation:'B',conqueror:'B'},skills:['basic_strike','onigiri','guard_break','wide_sweep','santoryu_ultimate']},
  nami:{martial:48,intelligence:88,politics:78,charisma:82,tier:'MAJOR',traits:['Logistician','Calm'],proficiencies:{specialArts:'A'},haki:{},skills:['basic_strike','clima_burst','rally','guard_break','clima_burst']},
  sanji:{martial:90,intelligence:74,politics:55,charisma:78,tier:'CORE',traits:['Duelist','Calm'],proficiencies:{handToHand:'S',specialArts:'A'},haki:{armament:'B',observation:'A'},skills:['basic_strike','black_leg','guard_break','wide_sweep','black_leg']},
  kaido:{martial:100,intelligence:71,politics:49,charisma:91,tier:'CORE',traits:['Grand Commander','Endurance Monster','Monstrous Strength'],proficiencies:{otherWeapons:'S',devilFruit:'S'},haki:{armament:'S',observation:'A',conqueror:'S'},skills:['basic_strike','thunder_bagua','wide_sweep','conquerors_burst','flame_dragon']},
  big_mom:{martial:99,intelligence:68,politics:57,charisma:93,tier:'CORE',traits:['Grand Commander','Monstrous Strength'],proficiencies:{otherWeapons:'S',devilFruit:'S'},haki:{armament:'S',observation:'B',conqueror:'S'},skills:['basic_strike','wide_sweep','conquerors_burst','rally','ikoku']},
  law:{martial:90,intelligence:94,politics:69,charisma:82,tier:'CORE',traits:['Strategist','Calm'],proficiencies:{swordsmanship:'A',devilFruit:'S'},haki:{armament:'B',observation:'A'},skills:['basic_strike','room_slash','guard_break','rally','gamma_knife']},
  kid:{martial:91,intelligence:72,politics:40,charisma:84,tier:'CORE',traits:['Commander','Reckless'],proficiencies:{otherWeapons:'A',devilFruit:'S'},haki:{armament:'A',observation:'B',conqueror:'B'},skills:['basic_strike','punk_gibson','wide_sweep','guard_break','damned_punk']},
  killer:{martial:88,intelligence:79,politics:46,charisma:72,tier:'MAJOR',traits:['Duelist','Calm'],proficiencies:{otherWeapons:'S'},haki:{armament:'B',observation:'B'},skills:['basic_strike','guard_break','wide_sweep','rally','wide_sweep']},
  king:{martial:92,intelligence:77,politics:55,charisma:76,tier:'MAJOR',traits:['Commander','Calm'],proficiencies:{swordsmanship:'A',devilFruit:'A'},haki:{armament:'A',observation:'B'},skills:['basic_strike','wide_sweep','guard_break','rally','wide_sweep']},
  queen:{martial:86,intelligence:84,politics:62,charisma:68,tier:'MAJOR',traits:['Engineer','Reckless'],proficiencies:{shooting:'A',devilFruit:'A',specialArts:'A'},haki:{armament:'B',observation:'B'},skills:['basic_strike','wide_sweep','guard_break','rally','wide_sweep']},
  jack:{martial:88,intelligence:58,politics:45,charisma:70,tier:'MAJOR',traits:['Commander','Endurance Monster'],proficiencies:{otherWeapons:'A',devilFruit:'A'},haki:{armament:'B',observation:'C'},skills:['basic_strike','wide_sweep','guard_break','rally','wide_sweep']},
  yamato:{martial:92,intelligence:73,politics:43,charisma:86,tier:'CORE',traits:['Natural Leader','Endurance Monster'],proficiencies:{otherWeapons:'A',devilFruit:'A'},haki:{armament:'A',observation:'B',conqueror:'A'},skills:['basic_strike','wide_sweep','conquerors_burst','guard_break','wide_sweep']},
  perospero:{martial:81,intelligence:82,politics:75,charisma:74,tier:'MAJOR',traits:['Strategist'],proficiencies:{devilFruit:'A'},haki:{armament:'C',observation:'C'},skills:['basic_strike','candy_wall','guard_break','rally','candy_wall']},
  orochi:{martial:37,intelligence:66,politics:74,charisma:42,tier:'MAJOR',traits:['Cowardly'],proficiencies:{devilFruit:'C'},haki:{},skills:['basic_strike','guard_break','rally','wide_sweep','basic_strike']}
};

const roster = {
  straw_hat:['Monkey D. Luffy','Roronoa Zoro','Nami','Usopp','Sanji','Tony Tony Chopper','Nico Robin','Franky','Brook','Jinbe'],
  kozuki:['Kozuki Momonosuke',"Kin'emon",'Denjiro','Raizo','Kikunojo','Kawamatsu','Ashura Doji','Shinobu','Kozuki Hiyori','Hyogoro','Omasa','Tsunagoro','Cho','Yatappe','Inuarashi','Nekomamushi','Carrot','Wanda','Shishilian','Miyagi','Tristan','Tama','Jibuemon','Tabuhachiro','Kagero','Kurosawa'],
  kurozumi:['Kurozumi Orochi','Kurozumi Kanjuro','Fukurokuju','Daikoku','Fujin','Raijin','Hanzo','Chome','Sarutobi','Jigoku Benten','Bishamon','Kazekage'],
  heart:['Trafalgar Law','Bepo','Shachi','Penguin','Jean Bart','Ikkaku','Uni','Clione','Hakugan'],
  kid:['Eustass Kid','Killer','Heat','Wire','Gig','Dive','UK','Pomp','Bubblegum','Reck','House','Boogie','Mosh','Hip','Papas','Jaguar','Quincy','Moai','Hop','Emma','Compo','Disc J'],
  big_mom:['Charlotte Linlin','Charlotte Perospero','Charlotte Smoothie','Charlotte Daifuku','Charlotte Mont-d’Or','Charlotte Galette','Charlotte Flampe','Charlotte Raisin','Charlotte Tablet','Charlotte Compote','Charlotte Amande','Charlotte Custard','Charlotte Angel','Charlotte Bavarois'],
  beasts:['Kaido','King','Queen','Jack','Yamato','X Drake','Page One','Ulti',"Who's-Who",'Black Maria','Sasaki','Basil Hawkins','Scratchmen Apoo',"Holed'em",'Speed','Dobon','Babanuki','Daifugo','Solitaire','Bao Huang','Briscola','Fourtricks','Hamlet','Mizerka','Poker','Gazelleman','Batman','Mouseman','Snakeman','Rabbitman','Sarahebi','Alpacaman','Madilloman','Dachoman','Nure-Onna','Caimanlady','Wanyudo']
};

const slug=s=>s.toLowerCase().replace(/[’']/g,'').replace(/[^a-z0-9]+/g,'_').replace(/^_|_$/g,'');
const fixedIds = {'Monkey D. Luffy':'luffy','Roronoa Zoro':'zoro','Nami':'nami','Sanji':'sanji','Kaido':'kaido','King':'king','Queen':'queen','Jack':'jack','Yamato':'yamato','Trafalgar Law':'law','Eustass Kid':'kid','Killer':'killer','Charlotte Linlin':'big_mom','Charlotte Perospero':'perospero','Kurozumi Orochi':'orochi','Kurozumi Kanjuro':'kanjuro','Kozuki Momonosuke':'momonosuke',"Kin'emon":'kinemon'};
const tierFor=(f,i)=>i===0?'CORE':i<4?'MAJOR':i<12?'SUPPORT':'MINOR';
const baseByTier={CORE:[87,72,55,83],MAJOR:[79,70,58,75],SUPPORT:[68,64,55,66],MINOR:[56,56,50,56]};
const talent=(tier,axis)=> tier==='CORE'?(axis<2?'S':'A'):tier==='MAJOR'?(axis<2?'A':'B'):tier==='SUPPORT'?'B':'C';
function genericProfile(f,i,name){const tier=tierFor(f,i),b=baseByTier[tier],j=(name.length*7+i*11)%9-4;return{martial:Math.max(20,Math.min(95,b[0]+j)),intelligence:Math.max(20,Math.min(95,b[1]-j)),politics:Math.max(15,Math.min(90,b[2]+Math.floor(j/2))),charisma:Math.max(20,Math.min(95,b[3]-Math.floor(j/2))),tier,traits:i===0?['Commander']:i%7===0?['Logistician']:i%5===0?['Calm']:[],proficiencies:{handToHand:tier==='MINOR'?'C':'B'},haki:{armament:tier==='CORE'?'A':tier==='MAJOR'?'B':tier==='SUPPORT'?'C':'NONE',observation:tier==='CORE'?'B':tier==='MAJOR'?'C':'NONE',conqueror:'NONE'},skills:['basic_strike','guard_break','wide_sweep','rally','wide_sweep']};}

const all=[];
for(const [f,names] of Object.entries(roster)) names.forEach((name,i)=>{const id=fixedIds[name]||slug(name);const p={...genericProfile(f,i,name),...(cores[id]||{})};all.push({id,name,faction:f,...p,talents:{martial:talent(p.tier,0),intelligence:talent(p.tier,1),politics:talent(p.tier,2),charisma:talent(p.tier,3)},proficiencies:Object.fromEntries(PROFICIENCIES.map(k=>[k,p.proficiencies?.[k]||'NONE'])),haki:{armament:{grade:p.haki?.armament||'NONE',talent:p.haki?.armament==='S'?'S':p.tier==='CORE'?'A':'B',techniques:[]},observation:{grade:p.haki?.observation||'NONE',talent:p.tier==='CORE'?'A':'B',techniques:[]},conqueror:{grade:p.haki?.conqueror||'NONE',talent:p.haki?.conqueror&&p.haki.conqueror!=='NONE'?'A':'E',techniques:[]}},skills:p.skills.slice(0,5),loyalty:70,relationshipTags:[]});});

// Scenario target is exactly 130 named/slot characters. Keep the strongest / most relevant entries first per faction.
export const CHARACTERS = all;
if(CHARACTERS.length!==130) throw new Error(`Scenario roster must contain exactly 130 characters, got ${CHARACTERS.length}`);

export const INITIAL_RELATIONSHIPS = [
  ['luffy','zoro',92,['nakama']],['luffy','law',58,['allied_captains']],['luffy','kid',35,['rivals']],['kaido','big_mom',20,['volatile_alliance']],['kid','killer',94,['partners']],['orochi','kaido',15,['dependent']],['momonosuke','kinemon',90,['lord_retainer']],['law','bepo',90,['captain_crew']]
];

export const INITIAL_DIPLOMACY = [
  ['straw_hat','kozuki','alliance'],['straw_hat','heart','joint_front'],['straw_hat','kid','joint_front'],['heart','kozuki','alliance'],['kid','kozuki','truce'],['beasts','kurozumi','alliance'],['beasts','big_mom','truce']
];
