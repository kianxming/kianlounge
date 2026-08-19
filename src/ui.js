import {
  assignOfficerRole, createArmy, createTransport, develop, diplomaticTransferPrisoner, discoverFruit, disband,
  equipSkill, equipWeapon, exchangePrisoners, executePrisoner, giveFruit, mergeArmies, moveArmy,
  negotiateCharacterTransfer, negotiateFruitTransfer, produce, recruit, recruitPrisoner, releasePrisoner,
  sendAid, setDiplomacy, setPlayerFaction, splitArmy, trade, trainCharacter, trainFruitMastery, trainHaki,
  unlockHakiTechnique, confiscatePrisonerWeapons
} from './world.js';
import { beginManualBattle, setBattleAuto } from './simulation.js';
import { issueOrder } from './tactical.js';
import { koCharacter, koEvent, koFaction } from './i18n.js';

const num=(form,name)=>Number(new FormData(form).get(name)||0);
const val=(form,name)=>String(new FormData(form).get(name)||'');

function notice(s,text,tone='info',rerender){
  s.uiNotice={text,tone,stamp:Date.now()};
  rerender();
  const stamp=s.uiNotice.stamp;
  setTimeout(()=>{if(s.uiNotice?.stamp===stamp){s.uiNotice=null;rerender()}},2200);
}

function successText(s,before,fallback){
  const after=s.eventFeed?.[0]?.text;
  return after&&after!==before?koEvent(after):fallback;
}

function runCommand(s,fn,okText,failText,rerender){
  const before=s.eventFeed?.[0]?.text;
  let result=false;
  try{result=fn()}catch(err){notice(s,`오류: ${err.message}`,'error',rerender);return false}
  if(result===false||result===null||result===undefined)notice(s,failText||'명령을 실행하지 못했습니다. 소유권, 자원, 인물 배치와 목적지를 확인하세요.','warning',rerender);
  else notice(s,successText(s,before,okText||'명령을 실행했습니다.'),'success',rerender);
  return result;
}

function locked(el){
  if(!el)return false;
  if(el.dataset.clickLock==='1')return true;
  el.dataset.clickLock='1';
  setTimeout(()=>{if(el.isConnected)delete el.dataset.clickLock},240);
  return false;
}

export function bind(root,getState,setSelected,getSelectedTactical,setSelectedTactical,rerender,save,load){
  if(root.dataset.delegatedUiBound==='1')return;
  root.dataset.delegatedUiBound='1';
  const s=()=>getState();

  root.addEventListener('click',e=>{
    const selectEl=e.target.closest('[data-select]');
    if(selectEl){e.preventDefault();setSelected({type:selectEl.dataset.select,id:selectEl.dataset.id});rerender();return}

    const tunit=e.target.closest('[data-tunit]');
    if(tunit){e.preventDefault();setSelectedTactical(tunit.dataset.tunit);rerender();return}

    const torder=e.target.closest('[data-torder]');
    if(torder){e.preventDefault();if(locked(torder))return;const b=s().battles[s().activeManualBattleId];if(b)runCommand(s(),()=>issueOrder(b.tactical,torder.dataset.unit,torder.dataset.torder),'전술 명령을 내렸습니다.','전술 명령을 실행할 수 없습니다.',rerender);return}

    const skill=e.target.closest('[data-tskill]');
    if(skill){e.preventDefault();if(locked(skill))return;const b=s().battles[s().activeManualBattleId];if(b)runCommand(s(),()=>issueOrder(b.tactical,skill.dataset.unit,'skill',{skillId:skill.dataset.tskill,targetId:skill.dataset.target}),'기술 명령을 내렸습니다.','현재 이 기술을 사용할 수 없습니다.',rerender);return}

    const el=e.target.closest('[data-action]');if(!el)return;e.preventDefault();if(locked(el))return;
    const action=el.dataset.action,id=el.dataset.id;
    if(action==='open'){setSelected({type:el.dataset.type});rerender();return}
    if(action==='close-panel'){setSelected(null);rerender();return}
    if(action==='pause'){s().paused=!s().paused;notice(s(),s().paused?'시간을 일시정지했습니다.':'시간 진행을 재개했습니다.','info',rerender);return}
    if(action==='speed'){s().paused=false;s().speed=Number(el.dataset.speed);notice(s(),`${s().speed}배속으로 시간을 진행합니다.`,'info',rerender);return}
    if(action==='save'){save();return}
    if(action==='load'){load();return}
    if(action==='develop'){runCommand(s(),()=>develop(s(),id),'개발을 완료했습니다.','자금이 부족하거나 개발 한도에 도달했습니다.',rerender);return}
    if(action==='recruit'){runCommand(s(),()=>recruit(s(),id,500),'병력 모집을 완료했습니다.','자금·식량이 부족하거나 소유 거점이 아닙니다.',rerender);return}
    if(action==='produce'){runCommand(s(),()=>produce(s(),id),'생산을 완료했습니다.','자금이 부족하거나 소유 거점이 아닙니다.',rerender);return}
    if(action==='buy-food'){runCommand(s(),()=>trade(s(),id,'buy_food',500),'식량을 구매했습니다.','자금이 부족합니다.',rerender);return}
    if(action==='sell-food'){runCommand(s(),()=>trade(s(),id,'sell_food',500),'식량을 판매했습니다.','판매할 식량이 부족합니다.',rerender);return}
    if(action==='disband'){const loc=s().armies[id]?.location;const ok=runCommand(s(),()=>disband(s(),id),'군단을 해산했습니다.','현재 이 군단을 해산할 수 없습니다.',rerender);if(ok&&loc)setSelected({type:'stronghold',id:loc});rerender();return}
    if(action==='train-stat'){runCommand(s(),()=>trainCharacter(s(),id,el.dataset.stat),'능력치 훈련을 진행했습니다.','현재 이 인물을 훈련할 수 없습니다.',rerender);return}
    if(action==='train-haki'){runCommand(s(),()=>trainHaki(s(),id,el.dataset.line),'패기 수련을 진행했습니다.','현재 이 패기를 수련할 수 없습니다.',rerender);return}
    if(action==='train-fruit'){runCommand(s(),()=>trainFruitMastery(s(),id),'악마의 열매 숙련 훈련을 진행했습니다.','현재 열매 숙련을 훈련할 수 없습니다.',rerender);return}
    if(action==='unlock-haki'){runCommand(s(),()=>unlockHakiTechnique(s(),id,el.dataset.line,el.dataset.technique),'고급 패기 기술을 해금했습니다.','등급 또는 조건이 부족합니다.',rerender);return}
    if(action==='prisoner-recruit'){const p=s().officers[id],r=Object.values(s().officers).find(o=>o.faction===s().playerFaction&&o.status==='available'&&o.location===p?.location);runCommand(s(),()=>r?recruitPrisoner(s(),id,r.id):false,'포로 등용에 성공했습니다.','등용 담당 인물이 없거나 관계·충성 조건이 부족합니다.',rerender);return}
    if(action==='prisoner-release'){runCommand(s(),()=>releasePrisoner(s(),id),'포로를 석방했습니다.','포로를 석방할 수 없습니다.',rerender);return}
    if(action==='prisoner-execute'){runCommand(s(),()=>executePrisoner(s(),id),'포로를 처형했습니다.','처형할 수 없습니다.',rerender);return}
    if(action==='prisoner-confiscate'){runCommand(s(),()=>confiscatePrisonerWeapons(s(),id),'포로의 무기를 몰수했습니다.','몰수할 무기가 없습니다.',rerender);return}
    if(action==='prisoner-transfer'){const sel=root.querySelector(`[data-prisoner-transfer="${CSS.escape(id)}"]`);runCommand(s(),()=>diplomaticTransferPrisoner(s(),id,sel?.value),'포로를 외교 이송했습니다.','이송 조건이 맞지 않습니다.',rerender);return}
    if(action==='fruit-discover'){runCommand(s(),()=>discoverFruit(s(),id),'악마의 열매를 발견했습니다.','아직 발견할 수 없습니다.',rerender);return}
    if(action==='fruit-give'){const sel=root.querySelector(`[data-fruit-officer="${CSS.escape(id)}"]`);runCommand(s(),()=>giveFruit(s(),id,sel?.value),'악마의 열매 사용자를 지정했습니다.','지정할 수 없습니다.',rerender);return}
    if(action==='weapon-equip'){const sel=root.querySelector(`[data-weapon-officer="${CSS.escape(id)}"]`);runCommand(s(),()=>equipWeapon(s(),id,sel?.value),'무기를 장비했습니다.','무기를 장비할 수 없습니다.',rerender);return}
    if(action==='diplomacy'){runCommand(s(),()=>setDiplomacy(s(),s().playerFaction,el.dataset.target,el.dataset.status),'외교 관계를 변경했습니다.','외교 관계를 변경할 수 없습니다.',rerender);return}
    if(action==='manual-battle'){const ok=runCommand(s(),()=>beginManualBattle(s(),id),'전투를 수동 지휘합니다.','이미 다른 전투를 수동 지휘 중이거나 이 전투에 참여하지 않았습니다.',rerender);if(ok){const b=s().battles[id],side=b.attackerFaction===s().playerFaction?'attacker':'defender',u=Object.values(b.tactical.units).find(x=>x.side===side);setSelectedTactical(u?.id||null)}rerender();return}
    if(action==='auto-battle'){runCommand(s(),()=>setBattleAuto(s(),id),'자동 전투로 전환했습니다.','자동 전투로 전환할 수 없습니다.',rerender);setSelectedTactical(null);return}
  },true);

  root.addEventListener('change',e=>{if(e.target.id==='player-faction'){const id=e.target.value;if(setPlayerFaction(s(),id)){setSelected(null);notice(s(),`플레이 세력을 ${koFaction(id)}(으)로 변경했습니다.`,'info',rerender)}}},true);

  root.addEventListener('submit',e=>{
    const f=e.target.closest('form[data-form]');if(!f)return;e.preventDefault();if(locked(f))return;const kind=f.dataset.form;
    if(kind==='assign-officer'){runCommand(s(),()=>assignOfficerRole(s(),f.dataset.origin,val(f,'role'),val(f,'officer')),'거점 담당을 임명했습니다.','해당 인물이 이 거점에 없거나 조건이 맞지 않습니다.',rerender);return}
    if(kind==='equip-skill'){runCommand(s(),()=>equipSkill(s(),f.dataset.id,Number(f.dataset.slot),val(f,'skill')),'기술을 장착했습니다.','이 기술을 장착할 수 없습니다.',rerender);return}
    if(kind==='army'){const id=createArmy(s(),{origin:f.dataset.origin,destination:val(f,'destination'),commanderId:val(f,'commander'),deputyId:val(f,'deputy')||null,troops:num(f,'troops'),food:num(f,'food')});if(id){setSelected({type:'army',id});notice(s(),`${koCharacter(s().officers[s().armies[id].commanderId]?.name)} 군단이 출진했습니다.`,'success',rerender)}else notice(s(),'군단 편성 실패: 지휘관 배치, 병력·식량, 목적지를 확인하세요.','warning',rerender);return}
    if(kind==='transport'){const id=createTransport(s(),{origin:f.dataset.origin,destination:val(f,'destination'),commanderId:val(f,'commander'),cargo:{money:num(f,'money'),food:num(f,'food'),troops:num(f,'troops'),prisoners:val(f,'prisoner')?[val(f,'prisoner')]:[],devilFruits:val(f,'fruit')?[val(f,'fruit')]:[]}});if(id){setSelected({type:'transport',id});notice(s(),'수송대가 출발했습니다.','success',rerender)}else notice(s(),'수송대 편성 실패: 지휘관 배치, 적재량, 목적지를 확인하세요.','warning',rerender);return}
    if(kind==='move-army'){runCommand(s(),()=>moveArmy(s(),f.dataset.id,val(f,'destination')),'이동 명령을 내렸습니다.','현재 이동할 수 없습니다.',rerender);return}
    if(kind==='split-army'){const id=splitArmy(s(),f.dataset.id,{troops:num(f,'troops'),food:num(f,'food'),commanderId:val(f,'commander'),destination:val(f,'destination')});if(id){setSelected({type:'army',id});notice(s(),'군단을 분할했습니다.','success',rerender)}else notice(s(),'군단 분할 조건을 충족하지 못했습니다.','warning',rerender);return}
    if(kind==='merge-army'){runCommand(s(),()=>mergeArmies(s(),f.dataset.id,val(f,'source')),'군단을 병합했습니다.','군단을 병합할 수 없습니다.',rerender);return}
    if(kind==='aid'){runCommand(s(),()=>sendAid(s(),s().playerFaction,f.dataset.target,val(f,'fromStronghold'),val(f,'toStronghold'),{money:num(f,'money'),food:num(f,'food'),troops:num(f,'troops')}),'원조를 보냈습니다.','전쟁 중이거나 자원이 부족합니다.',rerender);return}
    if(kind==='character-transfer'){runCommand(s(),()=>negotiateCharacterTransfer(s(),val(f,'officer'),f.dataset.target),'인물 이적 교섭을 진행했습니다.','신뢰도 또는 인물 조건이 맞지 않습니다.',rerender);return}
    if(kind==='fruit-transfer'){runCommand(s(),()=>negotiateFruitTransfer(s(),val(f,'fruit'),f.dataset.target),'악마의 열매를 양도했습니다.','양도 조건이 맞지 않습니다.',rerender);return}
    if(kind==='prisoner-exchange'){runCommand(s(),()=>exchangePrisoners(s(),val(f,'theirs'),val(f,'ours')),'포로를 교환했습니다.','교환할 포로 조건이 맞지 않습니다.',rerender);return}
    if(kind==='tattack'){const b=s().battles[s().activeManualBattleId];if(b)runCommand(s(),()=>issueOrder(b.tactical,f.dataset.unit,'attack',{targetId:val(f,'target')}),'공격 명령을 내렸습니다.','공격 명령을 실행할 수 없습니다.',rerender);return}
    if(kind==='tmove'){const b=s().battles[s().activeManualBattleId];if(b)runCommand(s(),()=>issueOrder(b.tactical,f.dataset.unit,'move',{x:num(f,'x'),y:num(f,'y')}),'이동 명령을 내렸습니다.','이동 명령을 실행할 수 없습니다.',rerender);return}
  },true);
}
