# Strategy Core V2 — Three Kingdoms Foundation Research

Status: DESIGN INPUT / clean-room synthesis

This document records the research basis for rebuilding the Wano prototype around a mature Three Kingdoms-style strategy-game skeleton before adding One Piece-specific systems.

## 1. Why V1 must be treated as a prototype, not the foundation

The current web slice proves that factions, officers, battles, diplomacy, Devil Fruits, Haki, and a map UI can coexist, but its strategic model is too small and too continuous for the desired game.

V1 assumptions that are now obsolete:

- real-time + pause is the primary strategic clock;
- 14 strongholds connected by 17 direct routes are the whole operational world;
- base travel is measured in hours;
- an army is one commander + at most one deputy;
- combat mostly begins when an army reaches a target base;
- movement is a transient state rather than a persistent campaign commitment;
- the AI replans frequently instead of committing to a monthly plan and reacting within bounded contingencies.

Those assumptions create a compressed world: attacking a city is too close to clicking a neighboring node, officers are rarely absent long enough for assignment choices to matter, roads are decorative links rather than strategic terrain, and defenders have little reason to intercept or reinforce before a siege.

## 2. Games / codebases studied

### Three Kingdoms: The Last Warlord (LongYou / ChengDu LongYou Tech)

Useful gameplay pattern:

- player command work is followed by a 30-day execution window;
- armies, envoys, recruitment attempts, and other assignments can remain in progress across multiple monthly cycles;
- distance is meaningful because officers are physically unavailable while travelling;
- reinforcements can arrive after the original battle has already begun;
- road encounters can become field battles before a force reaches a city;
- large realms benefit from delegation / regional administration.

We do **not** treat community guides as source code or exact formulas. We take the high-level rhythm: monthly commitment, persistent travel, and delayed consequences.

Sources studied:
- Steam store page: https://store.steampowered.com/app/577230/Three_Kingdoms_The_Last_Warlord/
- Steam community strategy/gameplay guides describing the monthly cycle, marching time, road battles, interception, reinforcements, and legion management.

### ROMANCE OF THE THREE KINGDOMS XIV (KOEI TECMO official manual)

The official manual gives the strongest reference for the command/execution split:

- Strategy Phase: issue orders.
- Advancement Phase: time advances and officers execute committed orders; those orders cannot be freely changed during the phase.
- Reporting Phase: summarize the new state.
- One period is 10 days; one month has three periods.

Marching is also more than target selection:

- units can have relay / waypoint destinations;
- the UI exposes days required to reach the destination;
- longer movement consumes more supplies;
- players predefine enemy-contact, retreat, pursuit, and post-command behaviour;
- supply lines connect deployed units to their origin through controlled/allied areas;
- long or difficult supply paths consume more supplies;
- a severed supply line produces severe morale/mobility/combat penalties.

Sources studied:
- Phase Flow: https://www.koeitecmoamerica.com/manual/rtk14/en/3200.html
- Marching: https://www.koeitecmoamerica.com/manual/rtk14/en/5100.html
- Unit Commands: https://www.koeitecmoamerica.com/manual/rtk14/en/6300.html
- Base Government: https://www.koeitecmoamerica.com/manual/rtk14/en/4200.html

### ROMANCE OF THE THREE KINGDOMS 8 REMAKE (KOEI TECMO official manual)

Useful patterns:

- city turns are monthly;
- parliament creates a higher-level strategic cadence and assigns officers to missions;
- officers cannot be treated as infinitely reusable buttons — assignments occupy people;
- transport, conscription, espionage, destruction, collusion, diplomacy, and marching are separate strategic commitments;
- battles track calendar days and defenders can win by surviving the time limit;
- reinforcements are explicitly part of army setup.

Sources studied:
- Annual Overview: https://www.koeitecmoamerica.com/manual/rtk8-remake/en/3200.html
- Parliament: https://www.koeitecmoamerica.com/manual/rtk8-remake/en/4100.html
- Parliament Commands: https://www.koeitecmoamerica.com/manual/rtk8-remake/en/5100.html
- Battles: https://www.koeitecmoamerica.com/manual/rtk8-remake/en/4300.html

### 中华三国志 / ZhongHuaSanGuoZhi-New-Code (public GitHub source)

Repository studied:
https://github.com/kpxp/ZhongHuaSanGuoZhi-New-Code

We inspected architecture, not copied implementation text.

Important responsibility boundaries found in the code:

- `DateRunner`: advances an explicit number of days independently of the UI.
- `Routeway` + `RoutePoint`: roads are persistent world objects with terrain-dependent build/maintenance/consumption costs and can support or fail logistics.
- `Legion`: a strategic army contains multiple troops, has a target architecture, a preferred supply route, offensive/defensive intent, daily events, and supply-aware AI.
- `Section`: groups multiple bases as an administrative/military district and supports intra/inter-region transfer and front-line policy.

These are exactly the separations V1 lacks.

License note: an explicit repository license was not established during this audit. Therefore V2 must be a **clean-room reimplementation** of architectural ideas. Do not copy source code, data, art, formulas, text, or assets from this repository unless licensing is separately verified.

### Histrategy (public GitHub project)

Repository studied:
https://github.com/emergencescience/histrategy

Useful engineering principle rather than gameplay imitation:

- world state is separated from parser/UI;
- commands are validated before resolution;
- deterministic engine steps transform world state;
- results are applied through explicit state transitions;
- simulation can run without rendering.

This reinforces the decision that Strategy Core V2 must be a deterministic domain engine that the browser prototype and later Godot client both consume.

## 3. Cross-game conclusions

The recurring durable pattern is not a particular Three Kingdoms stat formula. It is a set of structural constraints.

### 3.1 Time must create opportunity cost

Distance matters only when time has consequences.

If an officer is sent on a 95-day recruitment mission:

- that officer is unavailable for domestic work, war, diplomacy, and another recruitment mission;
- the destination may change ownership before arrival;
- the target officer may move;
- return travel still has to occur;
- several 30-day command phases can pass while the mission remains active.

Therefore every long action must be represented as a persistent `Operation`, not an instant command with a delayed notification.

### 3.2 Space needs intermediate places

A graph composed only of cities cannot create a believable operational game.

The strategic map must contain both economic/ownable nodes and non-ownable operational nodes:

- cities / strongholds;
- forts / gates;
- ports;
- road junctions;
- mountain passes;
- bridges / fords;
- forests / valleys suitable for ambush;
- sea lanes / anchorages;
- temporary camps.

This permits an army to be **between** cities in a meaningful place.

### 3.3 Orders need doctrine / contingencies

A monthly locked execution phase cannot work if every unexpected event requires a full new player turn.

When an army is dispatched, the command should contain behaviour rules such as:

- engage / avoid enemy contact;
- intercept enemies threatening a named region;
- hold this pass;
- retreat below a supply or morale threshold;
- pursue / do not pursue;
- continue siege / return after objective;
- accept reinforcements at a rally point.

The AI should use the same rule system. Reactive AI may execute permitted contingency actions but may not secretly receive a new unlimited strategy phase every day.

### 3.4 Logistics is a network, not an army food field

Moving forces must consume supplies.

Supply effectiveness depends on:

- origin stockpile;
- route length;
- terrain / route quality;
- hostile control;
- ports / ships for sea supply;
- transport capacity;
- army size and composition.

A force can therefore win strategically by cutting a route, holding a pass, or forcing an enemy onto a long supply path even before a city falls.

### 3.5 Reinforcement has an ETA

A threatened stronghold should not simply add nearby troops instantly.

The defender evaluates:

- detection day;
- estimated enemy ETA;
- friendly reinforcement ETA;
- whether the reinforcing base can safely spare troops;
- whether intercepting at a chokepoint gives a better result than joining the city defence.

A reinforcement is another physical operation. It may arrive during an existing battle, after the battle, or never.

### 3.6 Defeat must produce a physical retreat

A defeated attacker cannot remain logically inside an enemy city.

After defeat:

1. choose legal retreat destination (prefer origin, otherwise nearest reachable friendly/allied base);
2. compute path through the strategic network;
3. enter `retreating` state;
4. move day by day;
5. allow pursuit / interception if the rules permit it;
6. if no retreat route exists, resolve capture / scatter / destruction.

Officers attached to the army share the army's physical location until detached, captured, incapacitated, or returned.

## 4. V2 product identity

**Three Kingdoms strategy skeleton first, One Piece systemic overlay second.**

The first Wano scenario remains a sandbox after the starting placement, but its simulation should feel like a grand-strategy campaign:

- one command phase represents the player's opportunity to reorganize strategy;
- pressing End Turn commits plans and advances the world for 30 calendar days;
- operations may continue for many turns;
- battles and diplomacy emerge during those 30 days;
- the map is large enough that watching armies move and fronts form has value;
- AI factions reinforce, intercept, retreat, raid logistics, negotiate, and redeploy instead of only attacking adjacent city nodes.

## 5. One Piece systems must modify the skeleton, not bypass it

Examples:

- Observation Haki: scouting quality, ambush detection, pursuit awareness.
- Conqueror's Haki: morale/cohesion shock, surrender/rout pressure.
- Armament Haki: tactical matchup/combat resolution.
- Devil Fruits: character-specific tactical/operational modifiers and unique world objects.
- Flight-capable abilities: route-mode or terrain modifiers, not universal teleportation.
- Den Den Mushi: can reduce **communication** latency, but does not teleport officers, troops, supplies, prisoners, or physical items.
- Ships: sea route movement/supply layer.
- named weapons: transferable physical objects.

## 6. What we intentionally do not copy

- commercial game code;
- proprietary maps, art, UI layouts, text, sounds, data tables, or exact formulas;
- an open-source repository's source code when license compatibility is unclear;
- exact balance constants merely because another game uses them.

We copy the **problem decomposition**: calendar, orders, routes, operations, logistics, armies, districts, battles, and reports. All implementation and Wano balance remain original.

## 7. Design decision

Strategy Core V2 will use the following high-level rhythm:

```text
COMMAND PHASE
  player + faction strategic AI create/modify allowed orders
        ↓
COMMIT
  orders become persistent operations + doctrines
        ↓
EXECUTION: DAY 1 ... DAY 30
  movement
  supply
  missions
  detection
  reactive defence/interception
  diplomacy arrivals/responses
  battles/reinforcements
  economy/events
        ↓
MONTHLY REPORT
  outcomes + unfinished operations + next-month warnings
        ↓
next COMMAND PHASE
```

The daily simulation is authoritative. The 30-day turn is a planning cadence, not a shortcut that jumps directly from month A to month B.
