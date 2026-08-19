# Wano Strategy Sandbox — Design Contract

This document is the repository-level source of truth distilled from the project handoff.

## Product identity

- Real-time + pause **faction strategy sandbox**, not a turn-based tactics game, character-action game or simple RTS.
- Canon defines **starting state only**. No forced outcomes or dates.
- The core fantasy is a living Wano simulation that changes even with zero player input.
- Player controls a faction, not one hero.

## Strategic invariants

- Wano vertical slice: 14 strongholds and 17 route connections.
- Strategic movement follows the route graph; armies physically traverse paths and expose destination / route / ETA.
- No Fog of War in this slice.
- Money, food and troops are stronghold-local. Logistics requires Transport.
- Garrison food consumption is active. Combat-army food is consumed while waiting or in battle, not while moving. Transport consumes no food.
- Troop losses are permanent; no wounded-troop recovery.
- Combat Army = exactly one commander, max one deputy, troops, food. No carried money.
- Transport = exactly one commander, no deputy, can carry troops/money/food/prisoners/Devil Fruits, cannot receive Attack.

## Battle invariants

- Manual and AUTO use the same tactical simulation state and damage rules.
- 2D square-grid real-time tactical battle.
- Commands: Move, Attack, Hold, Retreat, AUTO. No Capture command/gauge.
- Victory occurs when all opposing battle-capable forces are annihilated, routed, retreated, surrendered or otherwise removed.
- Multiple battles may exist; only one may be under manual player control at once.
- Character HP, troop count and morale are distinct damage channels.
- HP 0 = incapacitation. Death requires a separate explicit/rare resolution.

## Character invariants

- Exactly four base stats: Martial / Intelligence / Politics / Charisma, range 1–100.
- No Leadership base stat. Command is derived primarily from Charisma plus other stats and traits.
- Energy is derived; it is not a fifth base stat.
- Proficiency grades: NONE / E / D / C / B / A / S.
- Haki has independent Armament / Observation / Conqueror lines, each with current grade, talent and unlocked techniques.
- Advanced Haki techniques are not automatically granted by grade alone.
- Talent grade E–S affects growth speed and hidden potential cap.
- Skills come from common disciplines, unique fighting styles or Devil Fruit trees. Battle loadout = 4 normal + 1 ultimate.
- Same skill + different user must produce different performance through scaling.

## World-object invariants

- Devil Fruit is a unique world object, not a passive field embedded in a character.
- Fruit intrinsic rules and awakening potential persist across owners; prior user's mastery, stats and Haki do not.
- Death causes delayed, hidden, regional respawn; no extraction system in this version.
- Named weapons are unique, transferable and confiscatable. Internally support 0–3 weapons. No durability.

## Social / diplomacy invariants

- Relationships: hidden numeric value + visible tier + tags.
- Prisoner actions: recruit, release, imprison, execute, exchange, diplomatic transfer; transport is required for physical relocation.
- Diplomacy target scope: Alliance, Truce, Joint Front, Prisoner Exchange, Aid, Character negotiation, Devil Fruit negotiation.

## AI invariants

- AI does not receive free resources or teleporting privileges.
- AI decisions are game-time/event driven, not recomputed every render frame.
- Priority intent: survival → food security → defense → recruitment → development → favorable expansion.

## UI / platform invariants

- Map-first hybrid; strategy map remains the dominant surface.
- Rendering FPS and simulation timing are separated.
- Responsive UI, abstract actions and JSON world state should remain portable.
- Placeholder-first graphics are required until scale/readability/tactical footprint is validated.

## Explicit non-goals for this slice

Fog/scouting, chase/pursuit, weapon durability, wounded troop recovery, random critical hits, forced canon events, Fruit extraction and final smartphone packaging are excluded unless the project owner changes the design contract.

Long-term engine baseline remains Godot 4.7.1 Standard + GDScript; the browser build is a functional validation surface whose domain/simulation rules are intentionally separated from UI.
