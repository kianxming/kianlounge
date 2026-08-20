from pathlib import Path
import subprocess

ROOT = Path.cwd()
APP = ROOT / 'src/v2/ui/app.js'
CSS = ROOT / 'v2.css'
APP_GZ = ROOT / '.build/v2-app.js.gz'
CSS_GZ = ROOT / '.build/v2.css.gz'


def valid_js(path: Path) -> bool:
    if not path.exists() or not path.stat().st_size:
        return False
    return subprocess.run(['node', '--check', str(path)], capture_output=True).returncode == 0


def gunzip_best_effort(src: Path, dst: Path) -> None:
    dst.parent.mkdir(parents=True, exist_ok=True)
    with dst.open('wb') as out:
        subprocess.run(['gzip', '-dc', str(src)], stdout=out, stderr=subprocess.DEVNULL)
    if not dst.exists() or not dst.stat().st_size:
        raise SystemExit(f'failed to recover {dst}')


def replace_once(text: str, old: str, new: str, label: str) -> str:
    if old not in text:
        raise SystemExit(f'missing repair anchor: {label}')
    return text.replace(old, new, 1)


if not valid_js(APP):
    gunzip_best_effort(APP_GZ, APP)
    raw = APP.read_bytes().splitlines(keepends=True)
    if len(raw) < 168:
        raise SystemExit('Recovered V2 app is shorter than the known-good prefix')
    prefix = b''.join(raw[:168]).decode('utf-8')

    prefix = replace_once(
        prefix,
        "function renderBottom(){const disabled=state.phase!=='command';const cmds=[['target-attack','⚔','출정'],['open-transport','🛒','수송'],['open-scout','🔭','정찰'],['open-diplomacy','🤝','외교'],['open-recruit-officer','🎖','등용'],['quick-develop-selected','🔨','개발'],['quick-recruit-selected','🚩','모집'],['open-form-selected','👥','편성'],['defend-selected','🛡','방어'],['support-selected','🏳','지원']];return `<footer class=\"bottom-bar\">${cmds.map(([a,i,t])=>`<button class=\"cmd\" data-action=\"${a}\" ${disabled?'disabled':''}><i>${i}</i><span>${t}</span></button>`).join('')}<button class=\"commit\" data-action=\"commit-month\" ${state.phase==='execution'?'disabled':''}>${state.phase==='command'?'30일 실행':state.phase==='report'?'다음 달':'실행 중'}</button></footer>`}",
        "function renderBottom(){const disabled=state.phase!=='command';const cmds=[['target-attack','⚔','출정'],['open-transport','🛒','수송'],['open-scout','🔭','정찰'],['open-diplomacy','🤝','외교'],['open-recruit-officer','🎖','등용'],['quick-develop-selected','🔨','개발'],['quick-recruit-selected','🚩','모집'],['quick-production-selected','🌾','생산'],['open-form-selected','👥','편성'],['open-reinforce-selected','➕','보충']];return `<footer class=\"bottom-bar\">${cmds.map(([a,i,t])=>`<button class=\"cmd\" data-action=\"${a}\" ${disabled?'disabled':''}><i>${i}</i><span>${t}</span></button>`).join('')}<button class=\"commit\" data-action=\"commit-month\" ${state.phase==='execution'?'disabled':''}>${state.phase==='command'?'30일 실행':state.phase==='report'?'다음 달':'실행 중'}</button></footer>`}",
        'bottom commands',
    )
    prefix = replace_once(
        prefix,
        "if(op){toast(`${o.name}: ${kind==='develop'?'개발':kind==='recruit'?'모집':'생산'} 명령 접수`);render()}else toast('자원·장수·명령력을 확인하세요.')",
        "if(op){render();requestAnimationFrame(()=>toast(`${o.name}: ${kind==='develop'?'개발':kind==='recruit'?'모집':'생산'} 명령 접수`))}else toast('자원·장수·명령력을 확인하세요.')",
        'quick command toast',
    )
    prefix = replace_once(
        prefix,
        "state=deserializeStrategyState(raw);lastEventIndex=state.events.length;selected={kind:'node',id:state.factions[state.playerFactionId].capitalNodeId};toast('저장된 캠페인을 불러왔습니다.');render()",
        "state=deserializeStrategyState(raw);lastEventIndex=state.events.length;selected={kind:'node',id:state.factions[state.playerFactionId].capitalNodeId};render();requestAnimationFrame(()=>toast('저장된 캠페인을 불러왔습니다.'))",
        'load toast',
    )
    prefix = replace_once(
        prefix,
        "if(ar){selected={kind:'army',id:ar.id};drawer=null;toast('군단이 편성되었습니다.');render()}else toast('병력·식량·지휘관·명령력을 확인하세요.');return}",
        "if(ar){selected={kind:'army',id:ar.id};drawer=null;render();requestAnimationFrame(()=>toast('군단이 편성되었습니다.'))}else toast('병력·식량·지휘관·명령력을 확인하세요.');return}",
        'army form toast',
    )

    tail = r'''  if(a==='target-attack'||a==='target-move'){
  const ar=armyId?state.armies[armyId]:selectedArmy();
  if(!ar)return toast('먼저 대기 중인 군단을 선택하거나 편성하세요.');
  if(ar.status!=='waiting')return toast('대기 중인 군단만 새 이동 명령을 받을 수 있습니다.');
  targetMode={kind:a==='target-attack'?'attack':'move',armyId:ar.id};drawer=null;mobilePanelOpen=false;render();
  requestAnimationFrame(()=>toast(a==='target-attack'?'공격할 거점을 지도에서 선택하세요.':'이동할 거점을 지도에서 선택하세요.'));return;
}
if(a==='open-transport'){const n=selectedNode();return n?openTransport(n):toast('내 거점을 선택하세요.');}
if(a==='open-scout'){return openScout(selectedNode());}
if(a==='open-diplomacy'){return openDiplomacy();}
if(a==='open-recruit-officer'){return openRecruitOfficer();}
if(a==='quick-production-selected'){const n=selectedNode();return n?issueQuick('production',n):toast('내 거점을 선택하세요.');}
if(a==='open-reinforce'||a==='open-reinforce-selected'){const ar=armyId?state.armies[armyId]:selectedArmy();return ar?openReinforce(ar.id):toast('보충할 대기 군단을 선택하세요.');}
if(a==='submit-transport'){
  const commanderId=$('#transport-officer')?.value,destinationNodeId=$('#transport-target')?.value;
  const cargo={food:Number($('#transport-food')?.value||0),troops:Number($('#transport-troops')?.value||0),money:Number($('#transport-money')?.value||0)};
  const op=orderTransport(state,{factionId:state.playerFactionId,originNodeId:node,destinationNodeId,commanderId,cargo});
  if(op){drawer=null;render();requestAnimationFrame(()=>toast(`수송대 출발 · ${nodeName(destinationNodeId)}`))}else toast('수송 조건·자원·명령력을 확인하세요.');return;
}
if(a==='submit-scout'){
  const officerId=$('#scout-officer')?.value,targetNodeId=$('#scout-target')?.value;
  const op=orderScoutMission(state,{factionId:state.playerFactionId,originNodeId:node,targetNodeId,officerId});
  if(op){drawer=null;render();requestAnimationFrame(()=>toast(`정찰대 파견 · ${nodeName(targetNodeId)}`))}else toast('정찰 담당·경로·명령력을 확인하세요.');return;
}
if(a==='submit-diplomacy'){
  const officerId=$('#dip-officer')?.value,targetFactionId=$('#dip-target')?.value,proposal=$('#dip-proposal')?.value||'truce';
  const op=orderDiplomacyMission(state,{factionId:state.playerFactionId,targetFactionId,originNodeId:node,officerId,proposal});
  if(op){drawer=null;render();requestAnimationFrame(()=>toast(`사절 파견 · ${factionName(targetFactionId)}`))}else toast('외교 담당·대상·명령력을 확인하세요.');return;
}
if(a==='submit-recruit-officer'){
  const officerId=$('#recruit-officer')?.value,targetOfficerId=$('#recruit-target')?.value;
  const op=orderRecruitOfficerMission(state,{factionId:state.playerFactionId,originNodeId:node,officerId,targetOfficerId});
  if(op){drawer=null;render();requestAnimationFrame(()=>toast(`등용 사절 파견 · ${state.officers[targetOfficerId]?.name||'대상 장수'}`))}else toast('등용 담당·대상·명령력을 확인하세요.');return;
}
if(a==='submit-reinforce'){
  const troops=Number($('#reinforce-troops')?.value||0),supplyPoints=Number($('#reinforce-supply')?.value||0);
  const ok=reinforceArmy(state,{factionId:state.playerFactionId,armyId,troops,supplyPoints});
  if(ok){drawer=null;render();requestAnimationFrame(()=>toast('군단 보충을 완료했습니다.'))}else toast('주둔 자원·군단 상태·명령력을 확인하세요.');return;
}
}
function actionError(err){console.error(err);toast(`명령 오류: ${err?.message||err}`)}
document.addEventListener('click',e=>{const btn=e.target.closest('[data-action]');if(btn){if(btn.disabled)return;Promise.resolve(handleAction(btn)).catch(actionError);return}const card=e.target.closest('[data-event-node]');if(card?.dataset.eventNode)focusNode(card.dataset.eventNode);});
document.addEventListener('keydown',e=>{if(e.key==='Escape'){if(targetMode){targetMode=null;render();requestAnimationFrame(()=>toast('목표 선택을 취소했습니다.'));return}if(drawer){drawer=null;render();return}if(mobilePanelOpen||showRightPanel){mobilePanelOpen=false;showRightPanel=false;render();}}});
window.addEventListener('resize',()=>{const map=$('#map-scroll');if(map&&window.innerWidth<760)map.style.scrollBehavior='auto'});
render();
'''
    APP.write_text(prefix + tail, encoding='utf-8')

if not CSS.exists() or not CSS.stat().st_size:
    gunzip_best_effort(CSS_GZ, CSS)

css = CSS.read_text(encoding='utf-8')
marker = '/* Mobile viewport containment: keep the world map scrollable without widening the page/grid. */'
if marker not in css:
    css += '''\n/* Mobile viewport containment: keep the world map scrollable without widening the page/grid. */\n.content{min-width:0}\n@media(max-width:760px){\n  html,body,.app-shell{width:100%;max-width:100%;min-width:0}\n  .app-shell{width:100vw;max-width:100vw}\n  .content{width:100%;max-width:100%;min-width:0;overflow:hidden}\n  .map-wrap{width:100%;max-width:100%;min-width:0;overflow:hidden}\n  .map-scroll{display:block;width:100%;max-width:100%;min-width:0;overflow:auto}\n}\n'''
    CSS.write_text(css, encoding='utf-8')

subprocess.run(['node', '--check', str(APP)], check=True)
