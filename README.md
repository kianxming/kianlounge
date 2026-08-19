# Wano Strategy Sandbox — Web Functional Prototype v0.2

A browser-playable One Piece × grand-strategy sandbox prototype. Canon defines only the starting state. Once the clock starts, factions act autonomously and Wano can diverge from the source story.

## Functional scope completed

- Map-first Wano strategy layer: 14 strongholds / 17 route-graph connections.
- Pause / 1x / 2x / 3x frame-independent global simulation clock.
- Stronghold-local money, food and troops; development, recruitment, production, buy/sell and officer assignments.
- Combat armies with exactly one commander, optional deputy, provisions, route movement, ETA, split / merge / disband.
- Separate transports for money, food, troops, prisoners and Devil Fruits; no Attack command and no food consumption.
- Field battles and sieges using the same tactical simulation.
- One manually controlled battle at a time; all other battles can continue on AUTO.
- 2D square-grid real-time tactical layer with Move / Attack / Hold / Retreat / AUTO and equipped 4 + 1 skills.
- Character HP, army troops and morale as separate values. HP 0 means incapacitation, not automatic death.
- Exactly four character base stats (Martial, Intelligence, Politics, Charisma); Command and Energy are derived.
- 130-character scenario roster with stable IDs and data-driven templates.
- E–S talent and proficiency grades; training and hidden potential caps.
- Armament / Observation / Conqueror Haki lines with grade, talent and independently unlocked advanced techniques.
- Common, unique-style and Devil-Fruit skills with user-dependent scaling; 4 normal + 1 ultimate loadouts.
- Devil Fruits as unique world objects with intrinsic rules, user-specific mastery, delayed regional respawn and new-user reset.
- Named weapons as unique transferable/confiscatable objects, supporting 0–3 equipped weapons.
- Hidden numeric relationships + visible relationship tier + relationship tags.
- Prisoner recruit / release / imprison-by-default / execute / exchange / diplomatic transfer and transport.
- Diplomacy: alliance, truce, joint front, war state, aid, character negotiation, prisoner exchange and Devil Fruit negotiation.
- Competent non-resource-cheating AI using the same recruit, develop, transport, army and battle systems.
- Browser-local save/load backed by a portable JSON world-state serializer.
- Responsive placeholder-first UI for desktop/tablet/mobile layout validation.

## Intentionally excluded by the design contract

These are **not missing features** in this prototype: fog/scouting, forced canon events, random critical hits, wounded-troop recovery, weapon durability, chase/pursuit, Fruit extraction, mass RTS selection, capture gauges and smartphone release packaging.

Production art is also intentionally separate from functional completeness. The current build uses procedural/vector placeholders so gameplay and information hierarchy can be validated before final Wano map art, portraits, sprites, emblems and VFX are produced.

## Run

```bash
python3 -m http.server 4173
```

Open `http://localhost:4173`.

## Test

```bash
npm test
```

The suite covers functional systems, shared AUTO/manual battle logic, save/load, unique world objects, diplomacy, prisoners and multi-seed 30-day simulation invariants.

See `docs/DESIGN_CONTRACT.md` for non-negotiable project rules and `docs/VALIDATION.md` for the validation matrix.
