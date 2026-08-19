# ROTK Engineering Study — Wano v1.1

이 문서는 `One Piece × Romance of the Three Kingdoms` 프로젝트의 v1.1 Playability Pass를 위해 삼국지 전략게임의 공개 매뉴얼, 커뮤니티 검증식, 오픈소스 삼국지 시뮬레이션 코드를 조사한 결과를 정리한다.

중요: KOEI TECMO 상용작의 소스 코드는 공개되어 있지 않다. 따라서 상용작은 공식 매뉴얼과 공개된 플레이 규칙을, 수식은 커뮤니티의 역공학/검증 자료를 참고한다. 실제 코드 구조는 오픈소스 `中华三国志 / ZhongHuaSanGuoZhi-New-Code` 등에서 확인한다. 특정 게임의 수치를 그대로 복제하지 않고 설계 원리를 우리 게임 규칙에 맞게 재구성한다.

## 1. 연구 대상

### 三國志 XI

공개 검증 자료에서 확인되는 핵심 설계는 다음과 같다.

- 부대 공격/방어가 단순한 `장수 능력치 합`이 아니라 **주장 능력 + 부장 보정 + 병과 계수 + 병과 적성**처럼 층을 나눠 계산된다.
- 부장은 주장을 무조건 대체하는 것이 아니라 관계에 따라 기여도가 달라진다.
- 적성 S/A/B/C가 곱연산 성격의 계수로 작동해 장수와 병과 조합이 실제 성능 차이로 이어진다.
- 결과적으로 `좋은 개인 스탯`, `좋은 조합`, `좋은 병과 선택`이 서로 다른 축이다.

우리 프로젝트 적용:

- Leadership 기본 능력치는 추가하지 않는다.
- Army의 전투 성능을 Martial 하나로 만들지 않는다.
- Commander + Deputy 조합은 Command, Martial, Intelligence, 관계, Traits, proficiency를 서로 다른 계층에서 반영한다.
- 보정은 가능한 한 `기본값 → 역할 계수 → 상황 계수`의 읽기 쉬운 파이프라인으로 유지한다.

### 三國志 XIV

공식 매뉴얼에서 특히 참고할 점:

- 내정 담당 장수의 능력치가 역할별로 다르게 쓰인다. 예를 들어 상업/농업/모병/훈련은 서로 다른 능력의 영향을 받는다.
- 많은 병력을 보유/출진할수록 군량 부담이 커지고, 군량 부족은 사기 하락과 이탈로 연결된다.
- 부대 능력은 장수 능력, 진형, 병력 수, Traits의 조합으로 구성된다.
- 전투에서 강한 적을 정면으로 수치만으로 찍어 누르는 것보다 병참, 주변 영토, 위치, 진형을 이용하게 만든다.
- 전략 지도는 모든 정보를 항상 크게 띄우는 대신 필요 정보 레이어를 켜고 끄는 방식으로 정보 밀도를 관리한다.

우리 프로젝트 적용:

- stronghold-local Money/Food/Troops 원칙을 유지한다.
- 역할 담당 장수의 능력치를 수입/모병/물류 효율에 명확히 연결하고 UI에 예상 효과를 표시하는 방향으로 간다.
- 현재 vertical slice에서 이동 중 군량 소비는 없다는 기존 설계를 유지한다. 대신 `waiting/battle` 소비와 전선 보급 부족의 압박을 강화한다.
- 거점 아이콘은 작게, 클릭 hit area는 크게 유지한다. 정보는 선택/확대 시 progressive disclosure한다.

## 2. 오픈소스 中华三国志 코드에서 얻은 구조적 교훈

조사 저장소: `kpxp/ZhongHuaSanGuoZhi-New-Code`

### 계층형 책임 분리

소스는 대략 다음 계층을 가진다.

- Faction: 세력 전체 상태/기술/정책/경로 등
- Section: 여러 거점을 묶은 군구/전선 단위
- Legion: 여러 Troop을 묶은 작전 군단
- Troop: 실제 부대 단위 행동

`SectionAIDetail`은 공격 허용, 병력 증강, 농업/상업/훈련/사기/수송 중시 같은 AI 성향을 필드로 보유한다. AI 성향이 함수 안의 임의 확률 몇 개가 아니라 **데이터**다.

우리 프로젝트 적용:

- 지금의 단일 `ai()` 함수에서 v1.1부터 `Faction doctrine/profile → utility actions → Army execution`으로 분리한다.
- Wano 14거점에서는 별도 Section 엔티티를 아직 만들 필요가 없다. 대신 `frontline pressure`를 계산해 군구와 비슷한 중간 판단층으로 사용한다.
- 향후 세계 규모가 커지면 같은 프로필 구조를 Division/Region AI로 확장할 수 있게 한다.

### 병참은 독립된 판단 대상

`Legion.cs`는 공격/방어 군단의 하루 군량 비용을 계산하고, 목표까지 버틸 수 있는 식량이 있는 인근 우호 거점과 보급 경로를 별도로 찾는다. 즉 공격 판단과 보급 판단이 한 덩어리가 아니다.

우리 프로젝트 적용:

- AI 행동 예산을 `군사 / 내정 / 물류 / 외교`로 분리한다.
- 공격군이 하나 존재한다고 세력 전체 군사 AI를 막지 않는다.
- 식량이 부족한 전선은 공격보다 수송/생산을 높은 utility로 평가한다.

## 3. v1.1 AI 설계

### Utility AI

모든 가능한 행동에 점수를 주고 높은 점수부터 실행한다.

예:

```text
AttackScore
= 공격 성향
+ 목표 약점
+ 전략 목표 가치
+ 지휘관 적합도
- 전선 과확장
- 방어 예비병력 부족
- 식량 위험
```

랜덤은 최종 동률 해소/성향 흔들림 정도에만 사용한다. `rng > 0.55면 공격` 같은 구조를 줄인다.

### 세력 Doctrine

초기 방향:

- Straw Hat: 공격적, 동맹 지원 높음, 영토 탐욕 낮음
- Beasts: 매우 공격적, 강한 적과 대규모 군단 선호, 휴전 기피
- Kozuki: 수도 탈환, 동맹 방어, 안정적 준비
- Kurozumi: 생존/방어/휴전/내정 우선
- Heart: 높은 신중함, 기회주의, 물류/기동 중시
- Kid: 매우 공격적, 위험 감수 높음
- Big Mom: 공격적이면서 자원/인재/외교 거래에도 적극적

이 Doctrine 위에 실제 지도자 Traits가 추가 보정된다.

예:

- Reckless: aggression ↑, caution ↓
- Strategist: opportunism ↑, caution ↑
- Logistician: logistics ↑
- Cowardly: caution/diplomacy ↑, aggression ↓
- Grand Commander: 동시 운용 가능한 군단 수 ↑

### 행동 빈도

v1.0 문제:

- AI 판단이 180 game-minutes마다 1회
- 한 세력이 한 번 행동하면 `continue`
- 세력에 군단 하나만 있어도 새 공격군 생성 차단

v1.1:

- planning interval: 90 game-minutes
- 세력 규모/인재 수에 따라 cycle당 2~4개 action slot
- 동시 군단 한도를 거점 수/Doctrine으로 계산
- 같은 cycle에서 방어 모집 + 수송 + 공격 준비 등이 동시에 일어날 수 있음

## 4. 전투 수치 설계

### 원칙

- Character HP / troop count / morale을 계속 분리한다.
- random critical hit는 넣지 않는다.
- 한 번의 일반 공격이 전투를 끝내지 못하게 casualty cap과 cooldown을 둔다.
- 스킬은 강하지만 `스킬 한 번 = 부대 삭제`가 되지 않게 대상 현재 병력 대비 최대 피해율을 둔다.
- 강함은 순간 삭제가 아니라 `더 높은 지속 압박 + 사기 우위 + 스킬 효율 + 생존력`으로 표현한다.

### 목표 전투 길이

- 소규모 교전: 약 30~60초
- 주요 장수전/공성: 약 2~4분

이 값은 하드 승리조건이 아니라 밸런스 QA 기준이다.

### 시간축

v1.0에는 전략 배속이 전술 accumulator와 tactical tick 양쪽에 중복 적용될 수 있었다.

v1.1:

- strategic speed와 tactical speed를 분리
- 수동전투 진입 기본 tactical speed = 1x
- 전략 3x 상태에서 수동전투에 들어가도 전술은 1x
- AUTO와 Manual은 여전히 같은 tactical simulation을 사용

## 5. 모바일/UI 설계

v1.0 iPhone 테스트 피드백을 기준으로 다음 원칙을 채택한다.

- visible icon size와 touch hit size를 분리한다.
- 거점 아이콘은 약 30~40% 축소하지만 hit target은 기존보다 작게 만들지 않는다.
- 390×844급 portrait viewport를 정식 E2E 대상에 추가한다.
- 모바일 첫 viewport에 `시간/세력 → 지도 → 선택 거점 핵심 명령`이 최대한 들어오게 한다.
- 인물 도크는 높이를 줄이고 가로 스크롤한다.
- 사건 기록/세부 폼은 기본 정보보다 후순위로 내린다.
- PC의 3-column 정보를 모바일에서 그대로 세로로 쌓지 않는다. 선택 상세는 compact sheet/panel로 다룬다.

## 6. 우리가 그대로 가져오지 않는 것

- ROTK XIV의 HEX territory/supply-line 시스템을 그대로 복제하지 않는다. 현재 Wano는 14 stronghold + 17 route graph가 source of truth다.
- ROTK XIV의 wounded soldiers는 현재 설계상 비목표라 추가하지 않는다.
- ROTK XI의 Leadership/兵種 체계를 그대로 추가하지 않는다.
- 어떤 상용작의 구체적인 내부 상수/수치를 복제하는 것을 목표로 하지 않는다.
- 목표는 `삼국지답게 읽히는 의사결정 구조`를 One Piece 세계관 시스템에 맞게 구현하는 것이다.

## 7. v1.1 Acceptance

- iPhone-size viewport에서 첫 화면 정보 밀도가 v1.0보다 높고 과도한 세로 스크롤이 감소한다.
- 거점 visible icon은 더 작지만 한 번 탭 선택 성공률은 유지된다.
- 전략 3x에서 수동전투 진입 시 전술이 과속되지 않는다.
- 균형 병력 전투가 첫 수 초 안에 결판나지 않는다.
- AI는 7일 방치 시 v1.0보다 의미 있는 명령을 더 자주 낸다.
- 최소 3개 세력이 동시에 복수의 군사/내정/물류 행동을 수행할 수 있다.
- Beasts / Heart / Kid / Kurozumi의 행동 통계가 Doctrine 차이를 드러낸다.
- 기존 14거점/17루트/130명/unique objects/save-load invariants는 유지한다.
