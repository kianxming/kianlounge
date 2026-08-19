# Wano Strategy Sandbox — Web Vertical Slice

A placeholder-first browser prototype for a One Piece × grand-strategy sandbox. Canon defines the starting state only; once the clock starts, AI factions can recruit, develop, move, fight, capture strongholds, and alter Wano without scripted outcomes.

## What is implemented

- Map-first Wano strategy screen with 14 strongholds and 17 graph routes.
- Pause / 1x / 2x / 3x global simulation clock, separated from rendering.
- Seven factions with fully visible ownership, armies, transports, destinations and ETAs.
- Stronghold-local money, food, troops, morale and development.
- Development and recruitment.
- Combat army creation: exactly one commander, optional deputy, troops and provisions.
- Route-based physical army movement and hostile encounters.
- Separate transports for money, food and troops; transports cannot attack and consume no food.
- Shared AUTO battle simulation, siege ownership transfer and development damage.
- Event-driven AI priorities for survival, recruitment, expansion, logistics and development.
- Deterministic seeded RNG and browser-local save/load.
- Placeholder-only visual layer so map scale, readability and strategic pacing can be validated before production art.

## Run

Serve the repository as static files. For example:

```bash
python3 -m http.server 4173
```

Then open `http://localhost:4173` in a browser.

## Test

```bash
npm test
```

The tests cover map topology, local resources, army movement/battle, transport delivery, deterministic save roundtrip and autonomous world activity.

## Deliberately deferred

This is the strategic vertical path, not the finished game. Full manual tactical battles, 130-character scenario content, complete Haki/Devil Fruit/weapon/relationship systems, production art, fog/scouting and mobile release are intentionally deferred until the strategic loop is stable.

The long-term project baseline remains Godot 4.7.1 Standard + GDScript. This web build is a fast validation surface: domain rules, stable IDs, simulation timing and UI are separated so the validated model can be ported rather than rewritten conceptually.
