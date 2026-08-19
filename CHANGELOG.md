# Changelog

## 1.1.0 — 2026-08-19

### Research / architecture
- Added `docs/ROTK_ENGINEERING_STUDY.md` documenting lessons from ROTK XI/XIV mechanics and open-source Three Kingdoms simulation code.
- Extracted faction AI into `src/ai.js` with doctrine + leader-trait + utility scoring instead of one monolithic probability chain.
- AI now plans every 90 game-minutes and can spend multiple action slots on military, defense, logistics, economy, prisoners, and diplomacy.
- Concurrent army capacity scales with territory/officers/doctrine instead of blocking a faction after its first army.

### Tactical pacing
- Strategic 1x/2x/3x and manual tactical time are decoupled; entering battle at strategic 3x no longer multiplies tactical time twice.
- Player battles remain in command-waiting state until Manual or AUTO is explicitly chosen.
- Basic attacks and skills use lower casualty bursts, casualty caps, slower movement cadence and longer cooldowns so tactical battles have readable phases.

### Mobile / information density
- Added `v1-1.css` compact layout.
- iPhone-size portrait layout prioritizes compact time controls, map, selected stronghold resources and primary commands.
- Stronghold visible art is reduced while invisible touch hit targets remain generous.
- Phone event feed is deferred instead of forcing another full-height desktop column into the vertical layout.
- Added 390×844 touch E2E viewport alongside Desktop and Tablet.

### Validation
- Added v1.1 regression tests for doctrine differences, multi-action AI, unattended activity, tactical battle duration, independent tactical clock and phone density.
- GitHub Pages only deploys after Node contracts plus Desktop/Tablet/iPhone-size Chrome E2E pass.

## 1.0.0 — 2026-08-19

### Added
- 한국어 중심 UI/상태/명령/이벤트 표시
- Wano production-style vector strategy map
- 7 faction emblems, stronghold icon family, character rarity frames
- 10 representative CORE/MAJOR portrait assets
- Devil Fruit, named weapon, Haki icon sets
- tactical sprites for Kaido, Law, Zoro and Chopper with generic fallback
- Playwright desktop/tablet E2E validation and screenshots

### Changed
- UI input handling now uses one delegated root listener rather than rebinding every button after render
- automatic simulation rendering defers while the user is editing form controls
- context panel remains directly visible beside the map on desktop
- version promoted to 1.0.0

### Preserved
- real-time + pause strategic sandbox
- stronghold-local money/food/troops
- shared AUTO/manual tactical simulation
- data-driven 130-character Wano scenario
