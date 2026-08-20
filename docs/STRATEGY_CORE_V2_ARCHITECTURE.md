# Strategy Core V2 — Architecture

Status: IMPLEMENTATION CONTRACT

This document defines the new strategic engine boundary. The existing v1 web implementation remains a playable reference but is **not** an API compatibility target.

## 1. Engine boundary

The core must be deterministic and render-free.

```text
Scenario/Data
   ↓
WorldState ← validated Orders
   ↓
StrategyCore
   ├─ commitCommandPhase()
   ├─ advanceOneDay()
   └─ executeDays(30)
   ↓
WorldState + EventLog + MonthlyReport
   ↓
Browser UI / future Godot UI
```

UI code may submit commands and render state. UI code must not contain authoritative movement, logistics, battle, diplomacy, or AI rules.

## 2. Calendar and turn lifecycle

### Calendar

- authoritative atomic simulation step: **1 day**;
- standard strategic execution window: **30 days**;
- operations may span any number of days and turns;
- month boundaries do not teleport or automatically complete operations.

### Command Phase

Full strategic planning occurs here.

Allowed examples:
- domestic assignments;
- officer transfer;
- recruitment mission;
- diplomacy mission;
- scouting mission;
- create / reorganize army;
- march / attack / reinforce / transport;
- theater priorities;
- defensive doctrine and contingency rules.

### Commit

Commands are validated, resource/personnel reservations are applied, and persistent Operations are created.

### Execution Phase

For each of 30 days, resolve in deterministic order:

1. expire / update diplomatic terms;
2. intelligence and detection updates;
3. operation preparation progress;
4. movement along edges;
5. contact / interception / ambush detection;
6. battle creation and ongoing battle day;
7. reinforcement arrival and battle joining;
8. retreat / pursuit;
9. supply network resolution and consumption;
10. mission task progress;
11. physical transfer / return progress;
12. base economy, recovery, recruitment, training;
13. reactive AI contingencies;
14. event log / invariant checks.

The exact ordering must be covered by tests because it determines whether, for example, a reinforcement arriving on day 12 can participate in day-12 battle resolution.

### Monthly Report

Report:
- territory changes;
- battles begun / ongoing / resolved;
- casualties and prisoners;
- officers departed / arrived / still away;
- diplomacy proposals / results;
- detected enemy operations;
- supply crises;
- completed / failed / continuing operations;
- expected ETAs for next turn.

## 3. World graph

### Node

```js
{
  id,
  type, // base | fort | gate | port | junction | pass | bridge | forest | valley | sea | camp
  x, y,
  ownerFactionId, // null for most operational nodes
  regionId,
  terrain,
  concealment,
  fortification,
  dockCapacity,
  tags: []
}
```

### Edge

```js
{
  id,
  a, b,
  mode, // land | sea
  baseDays,
  terrainFactor,
  roadQuality,
  capacity,
  supplyCost,
  ambushValue,
  weatherExposure,
  blockedBy: []
}
```

The route network is explicit. Euclidean screen distance is not authoritative travel distance.

### First Wano V2 scale target

Not a hard final content count, but a validation target:
- roughly 12–16 economically meaningful bases/forts;
- roughly 20–30 additional operational nodes;
- roughly 40–50 total nodes;
- roughly 50–70 edges.

The map should exceed a phone viewport and use pan + zoom instead of compressing all strategic geography into one screen.

## 4. Travel calculation

Travel is calculated per edge in days.

Conceptual model:

```text
edge travel days
= baseDays
× terrain modifier
× weather modifier
× load modifier
× formation modifier
× mobility modifier
× condition modifier
```

Then:

```text
route ETA = preparation days + Σ(edge travel days)
```

Do not tune by animation pixels.

Initial scale targets for Wano validation:
- adjacent operational node: 2–4 days;
- nearby base-to-base: 6–15 days;
- cross-region expedition: 15–30+ days;
- distant recruitment/diplomatic round trip including task duration: 40–120+ days.

These are playtest ranges, not copied historical constants.

## 5. Operations

Every non-instant action is a persistent operation.

### Operation base schema

```js
{
  id,
  type,
  factionId,
  status, // preparing | outbound | executing | returning | completed | failed | cancelled
  originNodeId,
  destinationNodeId,
  actorIds: [],
  startDay,
  routeEdgeIds: [],
  routeIndex,
  edgeProgress,
  prepareDaysRemaining,
  taskDaysRemaining,
  returnRequired,
  returnRouteEdgeIds: [],
  doctrine: {},
  payload: {},
  result: null
}
```

Operation types:
- `officer_mission`;
- `diplomacy`;
- `recruitment`;
- `scouting`;
- `army_march`;
- `reinforcement`;
- `intercept`;
- `raid_supply`;
- `transport`;
- `prisoner_exchange`;
- future One Piece physical-object missions.

An actor reserved by an operation cannot be simultaneously assigned elsewhere.

## 6. Officer physical state

There must be one authoritative physical-location model.

```js
Officer.assignment =
  {kind:'base', nodeId}
  | {kind:'operation', operationId}
  | {kind:'army', armyId}
  | {kind:'prisoner', captorFactionId, nodeId}
```

Do not maintain an independent stale `officer.location` that can disagree with the army/operation.

This directly eliminates the V1 failure where Luffy/Zoro could be shown at a city that their defeated army failed to capture.

## 7. Army / unit hierarchy

### Army

Strategic campaign entity:

```js
{
  id,
  factionId,
  originNodeId,
  objective,
  unitIds: [],
  supply,
  morale,
  doctrine,
  operationId,
  currentNodeId,
  currentEdgeId,
  retreatTargetNodeId
}
```

### Unit / Detachment

```js
{
  id,
  armyId,
  commanderId,
  deputyIds: [],
  officerIds: [],
  troops,
  troopType,
  formation,
  mobility,
  morale
}
```

An expedition may contain multiple units. Strategic army cohesion and tactical unit composition are separate concerns.

## 8. Supply

Moving armies consume supplies every day.

Supply source selection must find a reachable friendly/allied source through usable network edges.

Supply pressure depends on:
- force consumption/day;
- source stockpile;
- route distance;
- route terrain / quality;
- hostile interdiction;
- capacity;
- sea transport where required.

Supply states:
- `secure`;
- `strained`;
- `critical`;
- `cut`.

Possible effects:
- slower movement;
- morale loss;
- reduced tactical readiness;
- forced retreat doctrine trigger;
- attrition only where explicitly designed and tested.

Supply is not allowed to be free while moving.

## 9. Intelligence and detection

A force should not automatically know every enemy operation.

V2 minimum model:
- owned/allied base visibility;
- nearby road-node observation;
- scout operations;
- detection quality / confidence;
- last-known operation position and ETA range.

Observation Haki and special reconnaissance traits later modify this system.

## 10. Reactive defence

Full strategic AI runs only in Command Phase. During execution, a bounded Reactive AI may respond to detected events.

Threat response candidates:

```text
enemy operation detected
  ↓
Is target critical?
  ├─ no → observe / conserve / local intercept
  └─ yes
       ↓
Can nearby base reinforce before likely siege outcome?
       ├─ yes → create reinforcement operation
       └─ no
            ↓
Is there a useful chokepoint ahead of enemy?
            ├─ yes → sortie/intercept/ambush
            └─ no → fortify / evacuate / request theater support
```

Reactive AI may only use pre-authorized contingency categories and must pay the same movement/resource costs as the player.

Player parity: the Command Phase lets the player define defensive doctrines such as:
- reinforce any Tier-A base threatened by >X estimated troops;
- intercept at designated passes;
- do not strip a base below minimum garrison;
- retreat if supply is cut for N days.

## 11. Contact and road battles

Battle creation is not limited to a target base.

Create a field battle when, for example:
- hostile armies enter the same node;
- hostile armies meet on an edge under contact rules;
- defender's intercept operation reaches the invasion route;
- ambush succeeds at an eligible node/edge;
- pursuit catches a retreating army.

Battle location may be `nodeId` or `edgeId`.

## 12. Persistent battle and reinforcement

```js
{
  id,
  location,
  startDay,
  attackerArmyIds: [],
  defenderArmyIds: [],
  reinforcementOperationIds: [],
  status, // ongoing | resolved
  elapsedBattleDays,
  tacticalState,
  result
}
```

A strategic battle may remain active across the 30-day boundary.

If day 30 arrives while a battle is ongoing:
- save battle state;
- include it in Monthly Report;
- next Command Phase may permit only rules compatible with already committed forces;
- battle resumes on subsequent execution days.

A reinforcement joins when its physical operation reaches the battle location — never when the order is issued.

## 13. Retreat

Defeat resolution:

```text
defeat
  ↓
origin reachable? ─ yes → retreat toward origin
  │
  no
  ↓
nearest reachable friendly/allied base?
  ├─ yes → retreat there
  └─ no → capture / scatter / destruction resolution
```

The army remains physically on its retreat path. Attached officers remain with it unless separately captured/incapacitated.

## 14. Faction / theater / base AI

### FactionStrategicAI — monthly

Decides:
- war / peace direction;
- strategic objectives;
- theater priorities;
- major diplomacy;
- major army creation / redeployment.

### TheaterAI — monthly + bounded requests

A Theater groups several bases and acts like a military district.

Decides:
- front vs rear allocation;
- reserve location;
- supply hubs;
- reinforcement source priority;
- local offensive objective.

### BaseAI — monthly

Decides:
- agriculture / commerce / order / training / recruitment;
- officer assignment;
- local reserve / garrison;
- transport preparation.

### OperationAI / ReactiveAI — daily

Only handles committed-operation behavior and allowed contingencies:
- engage/avoid;
- intercept;
- reinforce;
- resupply;
- retreat;
- pursue;
- reroute if route becomes illegal.

## 15. Domestic affairs

Officer time is the main limiting resource.

An officer cannot simultaneously:
- administer a base at full effect;
- command an army;
- act as envoy;
- recruit an officer 80 days away;
- transport supplies.

Persistent domestic posts may provide passive monthly/daily effects, while explicit special projects become Operations.

## 16. Diplomacy and recruitment

Diplomatic messages may be communicated quickly later through Den Den Mushi, but a physical envoy is still useful/required for actions involving:
- hostage/prisoner transfer;
- physical gifts/items;
- personal recruitment;
- marriage/ceremonial presence where designed;
- officer relocation.

Recruitment operation example:

```text
Kibi Camp → distant officer
prepare 3d
outbound 31d
negotiation 18d
return 31d
TOTAL 83d
```

On day 30 and 60 the operation simply remains active.

## 17. One Piece overlay boundary

The generic engine does not know that an object is a Devil Fruit until the One Piece domain layer applies modifiers/rules.

Overlay responsibilities:
- Devil Fruit ownership/world-object transfer;
- Haki progression and combat/intelligence modifiers;
- unique skills;
- named weapons;
- Den Den Mushi communication modifiers;
- sea/ship specializations;
- special movement capabilities.

Core invariants remain: physical actors/items cannot teleport without an explicit ability whose rules say they can.

## 18. Required acceptance tests before UI polish

1. A 115-day recruitment mission persists across four 30-day command cycles and returns the officer to the correct physical location.
2. A failed siege never leaves the defeated attacking officers stationed inside the unconquered target.
3. Retreat computes a multi-edge legal route to origin/nearest friendly base.
4. A detected invasion causes an eligible nearby AI base to issue a physical reinforcement with ETA.
5. A defender can intercept at a chokepoint and create a field battle before the target city.
6. Two hostile forces meeting on a road can create a field battle.
7. Reinforcements can join an already ongoing battle on a later day.
8. A battle may cross a 30-day boundary without being auto-resolved or reset.
9. Moving armies consume supplies; a long route costs more than a short equivalent route.
10. Cutting the only valid supply route changes the army's supply state and triggers configured behaviour.
11. Full faction strategic AI runs once per Command Phase, not every daily tick; Reactive AI is limited to contingency actions.
12. No officer, army, prisoner, resource shipment, or unique world object teleports as a side effect of UI/state updates.
13. Map UI is larger than a phone viewport, supports pan/zoom, and preserves readable/tappable strategic nodes.
14. Save/load in the middle of a multi-turn operation reproduces the same future state under the same deterministic inputs.

These tests gate graphical asset work. A prettier map is not evidence that the strategy core works.
