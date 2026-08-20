# Wano Strategy Sandbox — Strategy Core V2 Design Contract

This document is the branch-level source of truth for the V2 rebuild.

The previous V1 real-time 14-stronghold prototype remains preserved in git history and the V1 branch. V2 intentionally breaks compatibility where needed to establish a proper Three Kingdoms-style strategic foundation.

## Product identity

- **Three Kingdoms grand-strategy skeleton first; One Piece systemic overlay second.**
- Player controls a faction, not a single hero.
- Canon defines starting placement only. Once play starts, outcomes are sandbox-driven.
- The core fantasy is not merely conquering adjacent nodes: it is committing officers, armies, envoys, supplies, and time across a living operational map.
- Distance and time are strategic resources.

## Strategic clock

- Strategic planning uses a **Command Phase → 30-day Execution Phase → Monthly Report** cycle.
- The authoritative simulation step is one calendar day.
- Orders committed for execution are not freely rewritten every day.
- Operations may remain active across multiple 30-day cycles.
- Full faction strategic AI plans during Command Phase.
- Daily AI is limited to operation behaviour and allowed reactive contingencies.

## Operations

- Any non-instant action with meaningful time/distance is a persistent Operation.
- Operation phases may include prepare, outbound travel, execute, return travel, completed/failed/cancelled.
- Officers assigned to an operation are unavailable for conflicting jobs until physically released.
- Recruitment, diplomacy, scouting, transport, army marches, reinforcement, interception, supply raids, prisoner exchange, and physical-object transfer use the same operation framework.
- Multi-turn missions of 60–120+ days are valid and expected when distance/task duration justifies them.

## Strategic map

- V2 is **not** limited to 14 strongholds / 17 direct links.
- The map is a layered route network with ownable/economic nodes and non-ownable operational nodes.
- Node categories may include base, fort, gate, port, junction, mountain pass, bridge/ford, forest, valley, sea waypoint, and camp.
- Route edges carry travel time, terrain, quality, capacity, supply cost, ambush value, weather exposure, and movement mode.
- Screen pixels do not determine travel time.
- The map should be physically larger than a phone viewport; pan/zoom is required instead of compressing the entire theater into one screen.

## Movement and location

- Strategic movement is measured in days along explicit route edges.
- Armies, officers, transports, prisoners, and unique world objects move physically through the operation/movement system when relocation is required.
- There is one authoritative physical-location model. An officer attached to an army cannot independently remain at a city the army has left or failed to capture.
- Movement may be interrupted by contact, interception, ambush, battle, route invalidation, retreat, or supply failure.

## Army structure

- An Army/Expedition is a strategic entity and may contain multiple Units/Detachments.
- Each Unit has a commander and may include deputies/other officers according to scenario rules.
- Army and Unit composition are separated so a campaign can split, reinforce, merge, or arrive in waves.
- Reinforcement is physical movement with ETA, not an instant troop-number transfer.

## Roads, chokepoints, and contact

- Combat can begin on a road, pass, junction, bridge, forest, sea route, camp, fort, or base.
- A defending force may sortie to intercept an invasion before it reaches the target stronghold.
- Two hostile forces meeting on the same route may trigger a field battle according to contact/doctrine rules.
- Ambush, interception, pursuit, and supply-route raids are strategic-map behaviours, not city-only effects.

## Supply

- Moving armies consume supplies.
- Supply originates from physical friendly/allied sources and flows through usable network routes.
- Supply pressure depends on army consumption, source stockpile, path length, terrain/route quality, capacity, and hostile interdiction.
- Long or severed supply routes must have gameplay consequences.
- AI receives no free logistics, teleportation, or hidden resource subsidy.

## Battle persistence

- Manual and AUTO battle modes must share the same underlying battle state/rules when both are supported.
- Strategic battle state may remain ongoing for multiple calendar days and may cross a 30-day command boundary.
- Reinforcements join only when their physical movement reaches the battle location.
- Defeat does not teleport an attacker home and does not leave it parked in an unconquered enemy base.
- Defeated armies enter a legal retreat route toward origin or a reachable friendly/allied base; if no route exists, capture/scatter/destruction is resolved explicitly.

## Intelligence and reaction

- V2 removes the V1 non-goal that excluded scouting.
- Factions do not automatically receive perfect information about every enemy operation.
- Detection and last-known information support meaningful interception and reinforcement decisions.
- Observation Haki and reconnaissance traits can later modify this generic intelligence layer.
- Reactive AI must use the same physical rules and costs as the player.

## Administrative hierarchy

- The engine supports Force/Faction → Theater/District → Base → Army/Operation responsibility layers.
- A Theater/District can group multiple bases for front-line policy, reserves, transfers, and delegated AI.
- Rear areas and front-line areas may therefore behave differently without every base independently making global-war decisions.

## Domestic affairs

- Officer time/availability is a primary limiting resource.
- Officers assigned to domestic posts affect base development and administration.
- Leaving a domestic post for war/diplomacy/mission reduces or removes that contribution.
- Recruitment, training, agriculture, commerce, public order, logistics, intelligence, and special projects are resolved through explicit assignments/rules rather than UI-only cooldowns.

## Diplomacy

- Alliances, truces, joint fronts, aid, prisoner exchange, and negotiations remain supported.
- Diplomatic outcomes may require elapsed time and, where appropriate, a travelling envoy/physical transfer.
- Future Den Den Mushi mechanics may reduce communication delay but do not teleport people or physical cargo.

## Character invariants

Unless later explicitly revised:

- Four base stats remain Martial / Intelligence / Politics / Charisma, range 1–100.
- Command/leadership performance is derived rather than adding a mandatory fifth base stat.
- Proficiency grades remain NONE / E / D / C / B / A / S.
- Haki retains independent Armament / Observation / Conqueror lines.
- Advanced Haki techniques are not automatically granted by grade alone.
- Skills and unique techniques scale by user rather than having identical output across characters.

## One Piece world-object invariants

- Devil Fruits remain unique physical world objects tied to owners/locations, not generic passive flags.
- Named weapons remain unique transferable/confiscatable objects.
- Physical object transfer obeys the V2 movement/operation model.
- Special abilities may modify travel/combat/intelligence/logistics only through explicit rules.

## Sandbox invariants

- No forced canon victory, defeat, or date-triggered outcome after the scenario begins unless a future scenario explicitly opts in.
- AI uses the same simulation rules as the player.
- The simulation must remain deterministic under the same state, commands, and RNG seed so long-run tests are reproducible.

## UI / platform invariants

- Map-first presentation remains important, but the map is now a navigable operational surface rather than a compressed diagram.
- Rendering timing and simulation timing remain separated.
- Strategy Core must be usable without DOM/browser rendering.
- Data/state contracts should remain portable to the long-term Godot client.
- Placeholder-first graphics remain required until strategic scale, movement, route readability, and battle footprint pass acceptance tests.

## V2 acceptance gates

Before declaring the strategy foundation ready:

1. 115-day officer mission persists correctly across multiple 30-day cycles.
2. Failed siege physically retreats attacker/officers and never reports them as stationed in the unconquered target.
3. AI can reinforce a threatened base from another base using a real ETA.
4. AI can intercept an invasion at a chokepoint before the city.
5. Hostile armies can meet on a road and create a field battle.
6. Reinforcements can arrive after a battle has started.
7. Battle state can persist through a month boundary.
8. Moving armies consume supply; long/severed supply paths matter.
9. Recruitment/diplomacy/transport may span multiple turns without teleportation.
10. Strategic AI plans once per Command Phase; daily reaction stays within allowed contingency rules.
11. Save/load mid-operation preserves deterministic future resolution.
12. Map is sufficiently large/readable to make geography, routes, fronts, and movement visually meaningful.

## Superseded V1 assumptions

The following are explicitly no longer V2 invariants:

- real-time + pause as the strategic turn model;
- exactly 14 strongholds / 17 routes;
- 4-hour-style compressed base travel;
- city-arrival-only battle creation;
- exactly one commander + one deputy as the entire strategic army;
- free supply consumption while armies are moving;
- no scouting / no interception / no pursuit as design non-goals;
- frequent global AI replanning during continuous time.

The V1 branch remains useful for comparing tactical combat, character systems, and UI experiments, but V2 strategy rules take precedence on `feature/strategy-core-v2`.
