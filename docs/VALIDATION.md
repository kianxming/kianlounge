# Validation Matrix — v0.2

## Automated checks

Run `npm test`.

Current coverage includes:

- exact 14 strongholds / 17 routes / 130 unique character IDs;
- four-stat bounds and core character overrides;
- same-skill / different-user performance;
- HP 0 incapacitation vs explicit death;
- Devil Fruit death → delay → regional reappearance → new owner reset;
- prisoner capture, recruitment, release/transfer/execution pathways;
- diplomacy durability, aid and negotiated transfers;
- army movement, food rules, split / merge;
- transport of resources, prisoners and Devil Fruits;
- shared tactical-state machinery for AUTO and Manual;
- one-manual-battle-at-a-time gate;
- stat, Haki and Fruit mastery progression;
- 4 normal + 1 ultimate loadout constraints;
- JSON save/load roundtrip;
- static renderer output for map / roster / diplomacy / world objects;
- multi-seed 30-day simulation invariant checks.

## Long-run simulation

Five deterministic 30-day runs are used to check that:

- resources never become negative;
- development stays inside its cap;
- deployed commanders point to their actual unit;
- unique Devil Fruit and weapon ownership remains consistent;
- AI continues issuing orders;
- battles resolve and ownership can change.

## Browser validation

The static server is expected to return HTTP 200 and all JavaScript modules must pass `node --check` / module-import validation. If the execution environment blocks local Chromium navigation, visual QA must be performed in an unrestricted browser before calling pixel-level polish complete.

## Production-art boundary

Functional completeness is validated with vector/procedural placeholders. Final Wano map artwork, character portraits, tactical sprites, faction emblems and VFX remain an art-production milestone, not a simulation blocker.
