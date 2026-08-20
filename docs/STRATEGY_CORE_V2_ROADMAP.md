# Strategy Core V2 — Implementation Roadmap

This roadmap prioritizes simulation causality over visual polish.

## Rule

A milestone advances only after deterministic acceptance tests pass. A feature is not considered complete because a UI button exists or because one happy-path scenario works.

Status legend:
- ✅ verified foundation
- 🟡 implemented in part; acceptance surface still incomplete
- ⬜ not started as a V2 system

## M0 — Foundation reset ✅

Goal: prove time, distance, persistent operations, and physical retreat.

Verified:
- 30-day Command → Execution → Monthly Report shell;
- weighted route graph using explicit travel days instead of screen pixels;
- persistent officer mission lifecycle;
- 115-day mission crossing multiple monthly windows with physical return;
- physical node/edge army location;
- multi-edge retreat and edge withdrawal;
- expanded Wano operational validation network (40+ nodes / 48+ edges, land + sea);
- Kibi → Flower Capital requires operational waypoints;
- cross-region movement can exceed one monthly window;
- strategic AI hook is monthly while reactive AI is bounded to daily execution.

## M1 — Supply and campaign movement 🟡

Goal: make long-distance war expensive and vulnerable.

Verified now:
- army march Operation with exact edge progress and ETA;
- daily supply consumption while moving / waiting / fighting / retreating;
- explicit supply source and distance stretch;
- secure / strained / critical / cut states;
- hostile armies and active battles physically interdict supply routes;
- morale/readiness consequences from poor supply;
- saving/loading mid-march preserves exact route and edge-day progress.

Still required:
- dedicated Transport Operation in V2 (not merely V1 transport);
- route capacity and congestion consequences;
- robust rerouting when an edge becomes invalid;
- richer march doctrines and explicit precommitted retreat thresholds.

## M2 — Intelligence, threat detection, and reactive defence 🟡

Goal: make defenders react before a siege reaches the city without cheating.

Verified now:
- no reaction to an undetected invasion;
- detected attack operations expose ETA to the defending decision layer;
- physical reinforcement from another base;
- physical intercept Operation when a pass/gate/bridge/forest/junction can be reached in time;
- response is recorded so daily AI does not spam duplicate orders;
- reinforcement only participates after physical arrival.

Still required:
- Scout / intelligence mission Operation;
- imperfect/decaying last-known information and ETA uncertainty;
- defensive doctrine settings;
- source-base minimum-garrison constraint in the mature theater planner;
- evacuation / raid-supply / hopeless-defense withdrawal choices;
- failed-response replan lifecycle.

## M3 — Road contact, persistent battles, strongholds and sieges 🟡

Goal: make the space between cities and the strongholds themselves strategically consequential.

Verified now:
- opposing armies can meet and fight on a route edge before reaching a city;
- node battles and edge battles share persistent strategic battle state;
- daily troop / morale / readiness attrition;
- supply state affects combat effectiveness;
- defender terrain modifiers for passes, gates, bridges, forests, bases and ports;
- reinforcement joins an existing battle only on its physical arrival day;
- a balanced battle can remain unresolved beyond day 30 and continue next month;
- defeated edge armies withdraw physically toward their rear instead of teleporting;
- retreating forces do not immediately re-enter combat because pursuit/chase is outside the current slice;
- physical enemy road occupation can cut a supply line;
- 14 Wano strongholds have local money / food / troops / development / morale;
- garrisons consume local food; starvation reduces morale and eventually causes desertion;
- persistent siege uses real attacker/garrison troops and morale, not a capture meter;
- capture changes both settlement owner and map-node owner and can damage development;
- failed siege physically retreats the attacker;
- a siege can be interrupted by a relief field battle, survive save/load, and resume if the besieger wins.

Still required:
- defender field-army/garrison coordination at siege start;
- surrender / prisoner / scatter resolution;
- richer terrain/ambush rules;
- siege reinforcement and sortie decision policies;
- battle handoff to the future manual tactical layer.

Explicitly deferred:
- pursuit/chase after retreat. It remains a non-goal for this slice unless the design contract changes.

## M4 — Organized faction AI 🟡

Goal: replace independent city-bot behavior with states that campaign, recover, redeploy, and campaign again.

Implemented foundation:
- monthly strategic faction planner;
- distinct faction profiles for Straw Hats, Beasts, Kozuki, Kurozumi, Heart, Kid and Big Mom;
- leader/commander traits affect actual aggression, caution, logistics and opportunism;
- route distance, estimated enemy strength and projected supply need enter target scoring;
- aggressive factions accept more risk while cautious/logistical factions demand better conditions;
- low supply blocks even aggressive expeditions;
- inactivity pressure prevents a viable faction from remaining passive forever.

Still required:
- Faction → Theater/District → Base → Operation hierarchy;
- frontline / rear-area classification;
- reserve bases and supply hubs;
- multi-base force concentration and relief priority;
- local recruitment/economic planning tied to settlements;
- recovery/rest cycles after losses;
- diplomacy-aware objectives;
- 12-month unattended endurance tests showing recurring war/rest/redeployment rather than opening rush then freeze.

## M5 — Personnel, diplomacy, and long missions 🟡 foundation only

Already proven:
- generic persistent officer mission can span 100+ days;
- officer remains reserved until physical return.

Still required as gameplay systems:
- recruitment target resolution;
- diplomatic envoy operations;
- scouting/intelligence missions;
- officer transfer and summon;
- prisoner exchange/transport;
- domestic posts and assignment opportunity cost;
- target invalidation / reroute / next-turn replanning.

## M6 — One Piece systemic overlay ⬜

Goal: add setting-specific rules without bypassing the strategy skeleton.

Planned adapters/modifiers:
- Observation Haki → detection / anti-ambush;
- Conqueror's Haki → morale/cohesion pressure;
- Armament Haki → combat matchups;
- Devil Fruits → tactical + operational modifiers and physical unique objects;
- named weapons → physical objects;
- Den Den Mushi → communication latency rules;
- ships/navigation → sea operations;
- flight/special mobility → explicit route-mode modifiers.

Gate principle:
No One Piece ability silently bypasses time, supply, detection, or physical location. Every exception must be explicit, inspectable, and testable.

## M7 — Strategic UI / map readability ⬜

Only after the core state is stable enough to be worth representing:
- pan/zoom operational map;
- route/terrain rendering;
- army markers located on nodes/edges;
- ETA and operation timeline;
- supply-line overlay;
- intelligence confidence layer;
- threat/reinforcement arrows;
- monthly command queue;
- 30-day execution playback;
- Monthly Report;
- compact stronghold/army/personnel panels.

Phone rule:
The full map must not be squeezed into one viewport. A phone is a camera onto a larger theater, not a poster containing every control at once.

## M8 — Graphics asset pass ⬜

Only after M7 scale/readability passes playtest:
- Wano strategic-map art;
- stronghold/fort/port/pass icons;
- faction emblems;
- portraits;
- army markers;
- route/terrain effects;
- tactical assets.

Placeholder-first remains mandatory so art does not hide structural problems.

## Quality gates that apply from now on

Every meaningful V2 change should preserve:
- no stale physical locations;
- no simultaneous node+edge occupancy;
- no negative local resources;
- no orphaned army/operation/battle/siege references;
- no duplicate ongoing battle at one exact location;
- settlement owner and map-node owner stay synchronized;
- no officer double booking;
- no teleporting mission/reinforcement/retreat completion;
- save/load parity during edge movement, active battle, and interrupted siege;
- player and AI obey the same route/supply costs;
- no information-cheating reactive AI.

Before V2 replaces V1 as the default playable version, run deterministic 30/90/180/360-day simulations across multiple scenarios/seeds and inspect not only crashes but campaign cadence, faction survival, movement density, resource sustainability, and recurring conflict/recovery cycles.
