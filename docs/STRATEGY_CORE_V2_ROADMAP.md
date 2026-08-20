# Strategy Core V2 — Implementation Roadmap

This roadmap deliberately prioritizes simulation causality over visual polish.

## Rule

Do not start the next milestone merely because code exists. Advance only when the milestone's acceptance tests pass under deterministic simulation.

## M0 — Foundation reset (current)

Goal: prove time, distance, persistent operations, and physical retreat.

Deliverables:
- V2 design contract and research synthesis;
- deterministic 30-day command/execution/report shell;
- explicit weighted route graph;
- persistent officer mission lifecycle;
- physical multi-edge retreat;
- expanded Wano validation network (40+ nodes, operational waypoints, land + sea edges).

Gates:
- 115-day mission crosses multiple months and returns physically;
- Kibi → Flower Capital requires multiple operational waypoints and meaningful days;
- a cross-region Wano route can exceed one 30-day window;
- failed siege removes attacker from hostile city and places it on retreat edge;
- strategic AI planning hook runs once/month while reactive hook is daily.

## M1 — Supply and campaign movement

Goal: make long-distance war expensive and vulnerable.

Implement:
- army march Operation;
- daily army supply consumption while moving/waiting/fighting;
- supply source selection;
- route capacity / distance / terrain pressure;
- secure / strained / critical / cut supply states;
- transport Operation and supply payload capacity;
- rerouting when a path becomes invalid;
- march doctrines: enemy contact, retreat threshold, pursue, post-objective behavior.

Gates:
- identical army on longer route consumes more total supply;
- cut supply route changes state and morale/readiness behavior;
- no free resource teleportation;
- saving/loading mid-march preserves exact route progress.

## M2 — Intelligence, threat detection, and reactive defence

Goal: make the defender react before a siege reaches the city.

Implement:
- visibility / last-known enemy operation;
- estimated ETA and uncertainty;
- scout Operation;
- threat evaluation;
- player defensive doctrine;
- bounded Reactive AI.

Reactive choices:
- reinforce target;
- sortie to designated pass/junction;
- ambush at eligible terrain;
- raid/cut supply;
- hold city;
- evacuate valuable people/items;
- retreat if defence is hopeless.

Gates:
- AI cannot react to an undetected invasion;
- once detected, eligible nearby base can generate reinforcement with physical ETA;
- defender chooses a useful chokepoint when interception ETA beats enemy ETA;
- reaction cannot strip a source base below its doctrine minimum garrison.

## M3 — Road contact, interception, and persistent battles

Goal: make the space between cities tactically consequential.

Implement:
- node contact;
- opposing-edge contact;
- interception resolution;
- ambush check;
- field battle at node/edge;
- ongoing strategic battle days;
- reinforcement queue with ETA;
- retreat/pursuit after battle;
- battle state crossing a 30-day boundary.

Gates:
- two hostile armies can fight before either reaches a city;
- a defender can stop an invasion at a pass;
- reinforcement joins only on physical arrival day;
- unresolved day-30 battle appears in Monthly Report and resumes next month;
- defeat produces retreat/capture/scatter, never stale hostile-base location.

## M4 — Theater/District and mature faction AI

Goal: make multi-base factions behave like organized states rather than independent city bots.

Implement hierarchy:
- FactionStrategicAI;
- Theater/District AI;
- Base AI;
- Operation/Reactive AI.

Theater responsibilities:
- frontline/rear classification;
- reserve base;
- supply hub;
- offensive objective;
- reinforcement priorities;
- intra-theater resource/personnel transfer.

Gates:
- expanding faction does not require global per-base attack spam;
- rear areas prioritize economy/logistics while fronts prioritize military readiness;
- faction can recover and resume campaigning after losses without free resources;
- 12-month unattended simulations show recurring war/rest/redeployment rather than opening rush then freeze.

## M5 — Personnel, diplomacy, and long missions

Goal: make officer time a strategic resource.

Implement:
- recruitment travel/task/return;
- diplomatic envoy operations;
- scouting/intelligence missions;
- officer transfer and summon;
- prisoner exchange/transport;
- domestic posts and assignment opportunity cost;
- operation invalidation when target moves/dies/changes faction.

Gates:
- 100+ day mission behaves correctly across turns;
- officer cannot be double-booked;
- target movement can force reroute/failure/replan at next command phase;
- physical prisoner/item transfer cannot complete without movement.

## M6 — One Piece systemic overlay

Goal: add setting-specific rules without breaking the strategy skeleton.

Implement adapters/modifiers for:
- Observation Haki → detection / anti-ambush;
- Conqueror's Haki → morale/cohesion pressure;
- Armament Haki → combat matchups;
- Devil Fruits → tactical + operational modifiers and physical unique objects;
- named weapons → physical objects;
- Den Den Mushi → communication latency rules;
- ships / navigation → sea operations;
- flight / special mobility → explicit route-mode modifiers.

Gate principle:
No One Piece ability silently bypasses time, supply, detection, or physical location. Every exception must be explicit, inspectable, and testable.

## M7 — Strategic UI / map readability

Only after M0–M6 core state is stable:
- pan/zoom operational map;
- route/terrain rendering;
- army markers located on nodes/edges;
- ETA and operation timeline;
- supply-line overlay;
- intelligence confidence layer;
- threat/reinforcement arrows;
- monthly command queue;
- execution playback with pause only for allowed interrupts;
- Monthly Report.

Phone requirement:
The whole map must **not** be squeezed into the viewport. Phone is a window onto a larger theater.

## M8 — Graphics asset pass

Only after strategic UI scale passes playtest:
- Wano strategic-map art;
- base/fort/port/pass icons;
- faction emblems;
- portraits;
- army markers;
- route/terrain effects;
- tactical assets.

Placeholder-first remains mandatory so art does not conceal structural problems.

## Long-run validation suite

Before V2 can replace V1 as the default playable branch:

- deterministic 30/90/180/360-day simulations across multiple seeds;
- no stale physical locations;
- no negative/duplicated resources;
- no double-booked officers;
- no teleporting operation completion;
- no permanently orphaned armies/operations;
- wars continue to produce movement/contact after opening months;
- peace periods still contain diplomacy, economy, scouting, redeployment;
- AI and player obey identical costs and path rules;
- save/load parity at arbitrary days, including active battle and route-edge movement.
