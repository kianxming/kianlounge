const FACTION_KO = {
  straw_hat:'밀짚모자 일당', beasts:'백수 해적단', kozuki:'코즈키 세력', kurozumi:'쿠로즈미 세력',
  heart:'하트 해적단', kid:'키드 해적단', big_mom:'빅 맘 해적단'
};

const STRONGHOLD_KO = {
  flower_capital:'꽃의 수도', ebisu:'에비스 마을', onigashima:'오니가시마', udon_prison:'우동 감옥',
  tokage_port:'도카게 항', bakura:'바쿠라 마을', amigasa:'아미가사 마을', itachi_port:'이타치 항',
  habu_port:'하부 항', mogura_port:'모구라 항', ringo:'북쪽 묘지 / 링고', kaeru_port:'카에루 항',
  kibi_camp:'키비 주둔지', big_mom_anchorage:'빅 맘 정박지'
};

const CHARACTER_KO = {
  'Monkey D. Luffy':'몽키 D. 루피','Roronoa Zoro':'롤로노아 조로','Nami':'나미','Usopp':'우솝',
  'Sanji':'상디','Tony Tony Chopper':'토니토니 쵸파','Nico Robin':'니코 로빈','Franky':'프랑키','Brook':'브룩','Jinbe':'징베',
  'Kozuki Momonosuke':'코즈키 모모노스케',"Kin'emon":'킨에몬','Denjiro':'덴지로','Raizo':'라이조','Kikunojo':'키쿠노죠',
  'Kawamatsu':'카와마츠','Ashura Doji':'아슈라 동자','Shinobu':'시노부','Kozuki Hiyori':'코즈키 히요리','Hyogoro':'효고로',
  'Omasa':'오마사','Tsunagoro':'츠나고로','Cho':'쵸','Yatappe':'야탓페','Inuarashi':'이누아라시','Nekomamushi':'네코마무시',
  'Carrot':'캐럿','Wanda':'완다','Shishilian':'시실리안','Miyagi':'미야기','Tristan':'트리스탄','Tama':'오타마','Jibuemon':'지부에몬',
  'Tabuhachiro':'타부하치로','Kagero':'카게로','Kurosawa':'쿠로사와',
  'Kurozumi Orochi':'쿠로즈미 오로치','Kurozumi Kanjuro':'쿠로즈미 칸주로','Fukurokuju':'후쿠로쿠주','Daikoku':'다이코쿠',
  'Fujin':'후진','Raijin':'라이진','Hanzo':'한조','Chome':'쵸메','Sarutobi':'사루토비','Jigoku Benten':'지고쿠 벤텐',
  'Bishamon':'비샤몬','Kazekage':'카제카게',
  'Trafalgar Law':'트라팔가 로','Bepo':'베포','Shachi':'샤치','Penguin':'펭귄','Jean Bart':'장 바르트','Ikkaku':'잇카쿠',
  'Uni':'우니','Clione':'클리오네','Hakugan':'하쿠간',
  'Eustass Kid':'유스타스 키드','Killer':'킬러','Heat':'히트','Wire':'와이어','Gig':'기그','Dive':'다이브','UK':'UK','Pomp':'폼프',
  'Bubblegum':'버블검','Reck':'렉','House':'하우스','Boogie':'부기','Mosh':'모시','Hip':'힙','Papas':'파파스','Jaguar':'재규어',
  'Quincy':'퀸시','Moai':'모아이','Hop':'홉','Emma':'엠마','Compo':'콤포','Disc J':'디스크 J',
  'Charlotte Linlin':'샬롯 링링','Charlotte Perospero':'샬롯 페로스페로','Charlotte Smoothie':'샬롯 스무디',
  'Charlotte Daifuku':'샬롯 다이후쿠','Charlotte Mont-d’Or':'샬롯 몽도르','Charlotte Galette':'샬롯 갈레트',
  'Charlotte Flampe':'샬롯 플랑페','Charlotte Raisin':'샬롯 레이즌','Charlotte Tablet':'샬롯 타블렛',
  'Charlotte Compote':'샬롯 콩포트','Charlotte Amande':'샬롯 아망드','Charlotte Custard':'샬롯 커스터드',
  'Charlotte Angel':'샬롯 엔젤','Charlotte Bavarois':'샬롯 바바루아',
  'Kaido':'카이도','King':'킹','Queen':'퀸','Jack':'잭','Yamato':'야마토','X Drake':'X 드레이크','Page One':'페이지 원',
  'Ulti':'울티',"Who's-Who":'후즈 후','Black Maria':'블랙 마리아','Sasaki':'사사키','Basil Hawkins':'바질 호킨스',
  'Scratchmen Apoo':'스크래치맨 아푸',"Holed'em":'홀뎀','Speed':'스피드','Dobon':'도봉','Babanuki':'바바누키','Daifugo':'다이후고',
  'Solitaire':'솔리테어','Bao Huang':'바오황','Briscola':'브리스콜라','Fourtricks':'포트릭스','Hamlet':'햄릿','Mizerka':'미제르카',
  'Poker':'포커','Gazelleman':'가젤맨','Batman':'배트맨','Mouseman':'마우스맨','Snakeman':'스네이크맨','Rabbitman':'래빗맨',
  'Sarahebi':'사라헤비','Alpacaman':'알파카맨','Madilloman':'마딜로맨','Dachoman':'다초맨','Nure-Onna':'누레온나',
  'Caimanlady':'카이만레이디','Wanyudo':'와뉴도'
};

const STATUS_KO = {
  available:'대기', deployed:'출진', moving:'이동 중', waiting:'대기', battle:'전투 중', prisoner:'포로',
  incapacitated:'전투불능', dead:'사망', resolved:'종료', auto:'자동', manual:'수동 지휘', awaiting_order:'명령 대기',
  alliance:'동맹', truce:'휴전', joint_front:'공동전선', war:'전쟁', neutral:'중립', same_faction:'동일 세력'
};

const TIER_KO = { CORE:'핵심', MAJOR:'주요', SUPPORT:'지원', MINOR:'일반' };
const STAT_KO = { martial:'무력', intelligence:'지력', politics:'정치', charisma:'매력' };
const HAKI_KO = { armament:'무장색', observation:'견문색', conqueror:'패왕색' };
const PROF_KO = { swordsmanship:'검술', shooting:'사격', handToHand:'체술', otherWeapons:'기타 무기', devilFruit:'악마의 열매', specialArts:'특수 전투술' };

export const koFaction = id => FACTION_KO[id] || id || '알 수 없음';
export const koStronghold = id => STRONGHOLD_KO[id] || id || '알 수 없음';
export const koCharacter = name => CHARACTER_KO[name] || name || '알 수 없음';
export const koStatus = v => STATUS_KO[v] || v || '—';
export const koTier = v => TIER_KO[v] || v || '—';
export const koStat = v => STAT_KO[v] || v || v;
export const koHaki = v => HAKI_KO[v] || v || v;
export const koProficiency = v => PROF_KO[v] || v || v;

export function koWorldTime(minutes=0){
  const total=Math.max(0,Math.floor(minutes));
  const day=Math.floor(total/1440)+1;
  const m=total%1440;
  const hh=String(Math.floor(m/60)).padStart(2,'0');
  const mm=String(m%60).padStart(2,'0');
  return `와노 ${day}일차 ${hh}:${mm}`;
}

export function koRelationshipTier(value){
  return value>=80?'굳건한 유대':value>=50?'친밀':value>=20?'호의':value>-20?'보통':value>-50?'냉담':value>-80?'적대':'불구대천';
}

export function koEvent(text=''){
  const exact = {
    'Wano sandbox initialized. Canon defines the starting state only.':'와노 샌드박스가 시작되었습니다. 원작은 시작 배치만 정의하며 이후 역사는 자유롭게 변화합니다.',
    'World state saved to this browser.':'현재 세계 상태를 이 브라우저에 저장했습니다.',
    'World state loaded.':'저장된 세계 상태를 불러왔습니다.'
  };
  if(exact[text]) return exact[text];

  let m;
  if((m=text.match(/^Player faction changed to (.+)\.$/))) return `플레이 세력을 ${m[1]}(으)로 변경했습니다.`;
  if((m=text.match(/^(.+) development increased to (\d+)\/(\d+)\.$/))) return `${m[1]}의 개발도가 ${m[2]}/${m[3]}으로 상승했습니다.`;
  if((m=text.match(/^(.+) completed production: \+([\d,]+) food\.$/))) return `${m[1]}에서 생산을 완료해 식량 ${m[2]}을 확보했습니다.`;
  if((m=text.match(/^(.+) recruited ([\d,]+) troops\.$/))) return `${m[1]}에서 병력 ${m[2]}명을 모집했습니다.`;
  if((m=text.match(/^(.+) bought ([\d,]+) food for ([\d,]+) money\.$/))) return `${m[1]}에서 자금 ${m[3]}을 사용해 식량 ${m[2]}을 구입했습니다.`;
  if((m=text.match(/^(.+) sold ([\d,]+) food for ([\d,]+) money\.$/))) return `${m[1]}에서 식량 ${m[2]}을 팔아 자금 ${m[3]}을 확보했습니다.`;
  if((m=text.match(/^(.+) assigned as (.+) at (.+)\.$/))) return `${m[1]}을(를) ${m[3]}의 ${roleKo(m[2])}(으)로 임명했습니다.`;
  if((m=text.match(/^(.+) formed an army of ([\d,]+) at (.+)\.$/))) return `${m[3]}에서 ${m[1]} 지휘의 군단 ${m[2]}명이 출진했습니다.`;
  if((m=text.match(/^(.+) departed (.+) with a transport bound for (.+)\.$/))) return `${m[1]}이(가) ${m[2]}에서 ${m[3]} 방면으로 수송대를 출발시켰습니다.`;
  if((m=text.match(/^(.+)'s army is moving toward (.+)\.$/))) return `${m[1]}의 군단이 ${m[2]} 방면으로 이동합니다.`;
  if((m=text.match(/^(.+)'s army arrived at (.+)\.$/))) return `${m[1]}의 군단이 ${m[2]}에 도착했습니다.`;
  if((m=text.match(/^Transport completed its mission at (.+)\.$/))) return `${m[1]}에서 수송 임무를 완료했습니다.`;
  if((m=text.match(/^Transport evaded hostile forces near (.+) and returned\.$/))) return `${m[1]} 인근에서 적을 회피하고 수송대가 귀환 중입니다.`;
  if((m=text.match(/^Transport was captured near (.+)\.$/))) return `${m[1]} 인근에서 수송대가 나포되었습니다.`;
  if((m=text.match(/^(Siege|Field battle) started(?: at (.+))?: (.+) vs (.+)\.$/))) return `${m[1]==='Siege'?'공성전':'야전'}이 ${m[2]?m[2]+'에서 ':''}시작되었습니다: ${m[3]} vs ${m[4]}.`;
  if((m=text.match(/^Manual command assumed for battle (.+)\.$/))) return `${m[1]} 전투를 수동 지휘합니다.`;
  if((m=text.match(/^Battle (.+) switched to AUTO\.$/))) return `${m[1]} 전투를 자동 지휘로 전환했습니다.`;
  if((m=text.match(/^Battle (.+) resolved: (.+)\.$/))) return `${m[1]} 전투 종료: ${m[2]==='attacker'?'공격측 승리':m[2]==='defender'?'방어측 승리':'무승부'}.`;
  if((m=text.match(/^(.+) captured (.+) from (.+)\.$/))) return `${m[1]}이(가) ${m[3]}에게서 ${m[2]}을(를) 점령했습니다.`;
  if((m=text.match(/^(.+) garrison lost 100 troops to desertion\.$/))) return `${m[1]} 주둔군에서 탈영으로 병력 100명이 감소했습니다.`;
  if((m=text.match(/^(.+)'s army lost 100 troops to desertion\.$/))) return `${m[1]} 군단에서 탈영으로 병력 100명이 감소했습니다.`;
  if((m=text.match(/^(.+) recovered from incapacitation at (.+)\.$/))) return `${m[1]}이(가) ${m[2]}에서 전투불능 상태를 회복했습니다.`;
  if((m=text.match(/^Rumors spread of a Devil Fruit appearing near (.+)\.$/))) return `${m[1]} 인근에 악마의 열매가 나타났다는 소문이 퍼집니다.`;
  return text
    .replaceAll('Straw Hats','밀짚모자 일당').replaceAll('Beasts','백수 해적단')
    .replaceAll('Kozuki','코즈키').replaceAll('Kurozumi','쿠로즈미')
    .replaceAll('Heart','하트 해적단').replaceAll('Kid','키드 해적단').replaceAll('Big Mom','빅 맘 해적단');
}

export function roleKo(role){
  return ({governor:'태수',recruiter:'모병 담당',logistics:'병참 담당'})[role] || role;
}
