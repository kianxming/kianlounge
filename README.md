# 와노 전란기 v1.0.0

**One Piece × 삼국지류 실시간 세력 전략 샌드박스 웹 프로토타입**

원작은 시작 시점의 배치만 정의한다. 게임이 시작되면 세력 AI가 같은 규칙 아래 병력을 모집하고, 군단과 수송대를 움직이고, 싸우고, 거점을 빼앗으며 와노의 역사를 바꾼다.

## 바로 플레이

GitHub Pages preview:
`https://kianxming.github.io/kianlounge/`

## v1 핵심

- PC 우선 Map-First 한국어 UI
- 14개 거점 / 17개 route graph
- Pause / 1x / 2x / 3x 실시간 시뮬레이션
- 거점별 독립 자금·식량·병력
- 개발 / 모집 / 생산 / 매매 / 장수 배치
- Combat Army / Transport 분리
- 실제 지도 경로 이동과 ETA
- 야전 / 공성 / 거점 소유권 변경
- AUTO와 수동 전투가 동일한 2D square-grid tactical simulation 사용
- 130명 Wano scenario character
- 무력 / 지력 / 정치 / 매력 4개 기본 능력치
- 패기 3라인, 악마의 열매 world object, named weapons, 관계, 포로, 외교
- 브라우저 save/load
- 이벤트 기반 AI 세력

## v1 그래픽 에셋

모든 v1 에셋은 공식 애니/게임 스크린샷을 복제하지 않고 이 프로토타입을 위해 제작한 벡터 자산이다.

- Wano 전략지도
- 7개 세력 엠블럼
- 거점 타입 아이콘
- CORE / MAJOR / SUPPORT / MINOR 캐릭터 프레임
- 루피 / 조로 / 상디 / 카이도 / 빅 맘 / 로 / 키드 / 야마토 / 킹 / 퀸 초상화
- 구현된 Devil Fruit 아이콘
- 구현된 Named Weapon 아이콘
- 무장색 / 견문색 / 패왕색 아이콘
- Kaido / Law / Zoro / Chopper 전술 스프라이트 + fallback

에셋 ID와 데이터 ID는 분리되어 있으므로 이후 고해상도 이미지로 교체해도 게임 로직을 수정할 필요가 없다.

## 입력 안정성

v0.2의 UI는 자동 렌더 때 DOM을 통째로 교체하면서 각 버튼 이벤트를 재부착했다. v1은 root event delegation을 사용해 이벤트를 한 번만 연결하며, 사용자가 input/select를 조작하는 동안 자동 렌더를 보류한다.

## 검증

```bash
npm test
```

실제 브라우저 E2E:

```bash
npm install --no-save @playwright/test@latest
npx playwright install --with-deps chromium
npm run test:e2e
```

E2E는 Chromium Desktop + Tablet에서 한국어 첫 화면, 단일 클릭 거점 선택, 모집, 군단 편성, 수송, 인물, 외교, 특수 물품, 저장/불러오기, 적 조우, Manual/AUTO 전환과 console error 0을 확인한다.

자세한 v1 acceptance 기준은 `docs/V1_RELEASE.md`, 장기 설계 규칙은 `docs/DESIGN_CONTRACT.md`를 참고한다.

## 의도적으로 제외된 범위

Fog/scouting, chase/pursuit, weapon durability, wounded troop recovery, random critical hit, forced canon events, Fruit extraction, capture gauge, RTS mass-selection, smartphone release packaging은 v1의 미구현 버그가 아니라 현재 설계의 비목표다.

장기 엔진 기준은 여전히 **Godot 4.7.1 Standard + GDScript**이며, 이 웹 버전은 전략 시스템과 UX를 빠르게 검증하기 위한 플레이 가능한 validation surface다.
