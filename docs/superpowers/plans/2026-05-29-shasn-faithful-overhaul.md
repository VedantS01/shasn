# SHASN Faithful Overhaul Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Deliver a rulebook-faithful SHASN pass-and-play adaptation per the 2026-05-29 design spec — new hex-tiled map, every-turn gerrymander, 2-level + passive Ideologue powers, Vote Bank deck of 60, coalitions, 1-for-1 trading, resource cap 12, volatile permanence, end-of-turn headlines, scoring by flipped majority voters, and an in-app Rules modal.

**Architecture:** Pure engine (no DOM) + thin UI projection. Engine is plain JS reducers `(state, payload) → state`. UI dispatches actions and re-renders from state. All persistence through `localStorage`. Map is SVG, geometry computed from per-zone topology data. Tests via `node --test`; e2e via Playwright against a local static server.

**Tech Stack:** Vanilla HTML/CSS/ES-module JS (no bundler, no framework). SVG. `node --test`. Playwright with cached Chromium for e2e. GitHub Pages for deploy.

**Spec reference:** `docs/superpowers/specs/2026-05-29-shasn-faithful-overhaul-design.md`

---

## File structure

**Create:**

- `src/data/voteBank.js` — 60 Vote Bank card defs (`id, value, cost, markedResource`).
- `src/data/rules.js` — Rules-modal copy (sections + inline diagrams refs).
- `src/engine/powers.js` — 2-level + passive Ideologue powers (replaces `archetypes.js`).
- `src/engine/scoring.js` — flipped-seat scoring + end-game detection.
- `src/engine/coalitions.js` — propose / respond / withdraw coalition logic.
- `src/engine/trade.js` — propose / respond trade logic.
- `src/engine/market.js` — Vote Bank deck shuffle/draw/discard helpers.
- `src/ui/geometry.js` — pure geometry helpers (zone polygon + seat positions from topology).
- `src/ui/rulesModal.js` — Rules modal renderer.
- `src/ui/proposalModals.js` — trade & coalition proposal/accept modals.
- `src/ui/powerModals.js` — power-invocation pickers (Donations, Land Grab, Targeted Marketing, Civil Disobedience).
- `src/ui/hintBanner.js` — context-aware per-turn hint.
- `tests/scoring.test.js`, `tests/coalitions.test.js`, `tests/trade.test.js`, `tests/market.test.js`, `tests/powers.test.js`, `tests/endgame.test.js`, `tests/geometry.test.js`, `tests/headlines-queue.test.js`.

**Modify (rewrite or extend):**

- `src/data/map.js` — 9 zones with rulebook capacities, neighbor lists, volatile seat indices, and zone centers (hex topology).
- `src/data/headlines.js` — expand 12 → 20 cards.
- `src/data/conspiracies.js` — add fixed `cost: 4|5` per card; mark Block/Reverse families.
- `src/engine/state.js` — new state shape (zone `flippedSeats`/`coalition`, player `pendingPlacements`, turn `pendingHeadlines`/`pendingProposal`/`gerrymanderMoves`/`currentBuy`/extended `phase`, top-level `market`).
- `src/engine/rules.js` — helpers for the new model (`flippedCount`, `playerScore`, `isVolatileSeat`, `gerrymanderableSources`, `gerrymanderableDestinations`).
- `src/engine/actions.js` — replace `buyVoter` with `buyVoteBank`; replace one-shot `gerrymander` with per-turn version; rewrite `beginTurn`/`endTurn` for multi-stage; remove `occupyVolatile` (folded into placeToken); add `discardResources`, `placePending`, trade/coalition/power actions.
- `src/engine/conspiracies.js` — fixed-cost buy; Block/Reverse interrupt carve-out.
- `src/engine/headlines.js` — minimal: add reshuffle on empty.
- `src/ui/map.js` — polygon zones + multi-volatile rendering + gerrymander source/dest mode.
- `src/ui/screens.js` — replace marketPanel with VoteBankPanel; new GerrymanderPanel; replace volatile click with normal seat click; wire all new modals; drop 5-player setup; add shuffle button.
- `src/ui/render.js` — dispatch by `state.turn.phase` for new phases (readAloud, discard, placePending, headlines, betweenTurns, tradeAccept, coalitionAccept, interrupt).
- `src/ui/narration.js` — extend with `narrateReadAloud(dilemma)` for the previous-player ceremony.
- `src/main.js` — wire all new reducers; manage new phases in dispatch.
- `styles/components.css` — polygons, rules modal, hint banner, proposal modals, power pickers.

**Delete:**

- `src/engine/archetypes.js` — superseded by `powers.js`.

**Test file changes:**

- `tests/actions.test.js`, `tests/archetypes.test.js`, `tests/ui-smoke.test.js` — major rewrites (will be progressively updated per phase).
- `tests/integration.test.js` — full-game bot uses new actions.

---

## Conventions used throughout this plan

- **Run tests:** `npm test` (full suite) or `node --test tests/<file>.test.js` (single file).
- **Commit format:** Conventional commits (`feat:`, `fix:`, `refactor:`, `test:`, `docs:`).
- **TDD discipline:** every code-touching task is `write failing test → run to confirm fail → write minimal impl → run to confirm pass → commit`.
- **Branch:** all work on `feat/faithful-overhaul`. Create at Task 0.1.

---

## Phase 0: Branch & baseline

### Task 0.1: Create the working branch

**Files:** none.

- [ ] **Step 1: Create and switch to the working branch**

Run:
```bash
cd /Users/vedant/personal/pravar/shasn
git checkout -b feat/faithful-overhaul
```

- [ ] **Step 2: Confirm baseline tests pass**

Run: `npm test`
Expected: `tests 75 / pass 75 / fail 0`.

- [ ] **Step 3: No commit yet** — phase 1 work begins next.

---

## Phase 1: Data & state shape

This phase replaces the data layer and state shape. UI will be temporarily broken until Phase 6; the engine + tests stay green.

### Task 1.1: Map topology data — 9 zones

**Files:**
- Modify: `src/data/map.js`
- Test: `tests/content.test.js` (extend existing zone-content checks)

- [ ] **Step 1: Write the failing test**

Append to `tests/content.test.js`:
```javascript
import { ZONES, ZONE_BY_ID } from "../src/data/map.js";

test("map: 9 zones with rulebook capacities and majorities", () => {
  const expected = {
    central: 9, north: 21, south: 21, east: 17, west: 17,
    ne: 11, nw: 11, se: 11, sw: 11
  };
  assert.equal(ZONES.length, 9);
  for (const [id, cap] of Object.entries(expected)) {
    const z = ZONE_BY_ID[id];
    assert.ok(z, `zone ${id} present`);
    assert.equal(z.capacity, cap, `${id} capacity ${cap}`);
    assert.equal(z.majority, Math.ceil((cap + 1) / 2), `${id} majority (cap+1)/2`);
  }
});

test("map: central touches all 8 others; corners touch 2 cardinals + central", () => {
  const c = ZONE_BY_ID.central;
  assert.deepEqual(c.neighbors.sort(), ["east","ne","north","nw","se","south","sw","west"]);
  assert.deepEqual(ZONE_BY_ID.ne.neighbors.sort(), ["central","east","north"]);
  assert.deepEqual(ZONE_BY_ID.nw.neighbors.sort(), ["central","north","west"]);
  assert.deepEqual(ZONE_BY_ID.se.neighbors.sort(), ["central","east","south"]);
  assert.deepEqual(ZONE_BY_ID.sw.neighbors.sort(), ["central","south","west"]);
});

test("map: neighbor graph symmetric", () => {
  for (const z of ZONES) {
    for (const n of z.neighbors) {
      const other = ZONE_BY_ID[n];
      assert.ok(other, `neighbor ${n} exists`);
      assert.ok(other.neighbors.includes(z.id), `${n}<->${z.id} symmetric`);
    }
  }
});

test("map: each zone declares volatile seat indices within capacity range", () => {
  for (const z of ZONES) {
    assert.ok(Array.isArray(z.volatileSeats));
    assert.ok(z.volatileSeats.length >= 2, `${z.id} has >=2 volatile seats`);
    for (const i of z.volatileSeats) {
      assert.ok(i >= 0 && i < z.capacity, `${z.id} volatile index ${i} in range`);
    }
    // no duplicates
    assert.equal(new Set(z.volatileSeats).size, z.volatileSeats.length);
  }
});
```

- [ ] **Step 2: Run to verify fail**

Run: `node --test tests/content.test.js`
Expected: 4 failing tests citing missing fields / wrong shape.

- [ ] **Step 3: Rewrite `src/data/map.js`**

Replace entire file with:
```javascript
// 9 zones in a hex-tiled hexagonal country. Each zone has a hex center on a
// flat-top hex grid (axial coords scaled to pixels in src/ui/geometry.js).
// volatileSeats: indices into the seat array that are volatile (immune,
// trigger a Headline at end of turn when occupied).
//
// Capacities/majorities are lifted directly from the rulebook board:
//   central 5/9, N/S 11/21, E/W 9/17, four corners 6/11.
const Z = (id, name, capacity, neighbors, axial, volatileSeats) =>
  ({ id, name, capacity, majority: Math.ceil((capacity + 1) / 2), neighbors, axial, volatileSeats });

export const ZONES = [
  Z("central", "Central",    9, ["north","south","east","west","ne","nw","se","sw"], { q:  0, r:  0 }, [2, 6]),
  Z("north",   "North",     21, ["nw","ne","central"],                                { q:  0, r: -2 }, [3, 8, 13, 18]),
  Z("south",   "South",     21, ["sw","se","central"],                                { q:  0, r:  2 }, [3, 8, 13, 18]),
  Z("east",    "East",      17, ["ne","se","central"],                                { q:  2, r:  0 }, [3, 8, 14]),
  Z("west",    "West",      17, ["nw","sw","central"],                                { q: -2, r:  0 }, [3, 8, 14]),
  Z("ne",      "North-East",11, ["north","east","central"],                           { q:  1, r: -1 }, [2, 8]),
  Z("nw",      "North-West",11, ["north","west","central"],                           { q: -1, r: -1 }, [2, 8]),
  Z("se",      "South-East",11, ["south","east","central"],                           { q:  1, r:  1 }, [2, 8]),
  Z("sw",      "South-West",11, ["south","west","central"],                           { q: -1, r:  1 }, [2, 8]),
];

export const ZONE_BY_ID = Object.fromEntries(ZONES.map((z) => [z.id, z]));
```

- [ ] **Step 4: Run to verify pass**

Run: `node --test tests/content.test.js`
Expected: all 4 new tests pass. *Old tests in this file (referencing old z0..z8 ids) will fail — leave those for Task 1.2.*

- [ ] **Step 5: Delete obsolete content-test cases for old map**

Remove from `tests/content.test.js` any test that hardcodes `z0`/`z4` style ids (the old ring map). The new map's tests above replace coverage.

Run: `node --test tests/content.test.js`
Expected: file fully green.

- [ ] **Step 6: Commit**

```bash
git add src/data/map.js tests/content.test.js
git commit -m "feat(map): rewrite zone topology for rulebook capacities + multi-volatile"
```

---

### Task 1.2: Vote Bank deck (60 cards)

**Files:**
- Create: `src/data/voteBank.js`
- Test: `tests/content.test.js` (extend)

- [ ] **Step 1: Write the failing test**

Append to `tests/content.test.js`:
```javascript
import { VOTE_BANK, VOTE_BANK_BY_ID } from "../src/data/voteBank.js";

test("voteBank: 60 unique cards, value distribution 20/25/15, marked resource is a cost slot", () => {
  assert.equal(VOTE_BANK.length, 60);
  assert.equal(new Set(VOTE_BANK.map((c) => c.id)).size, 60, "ids unique");
  const counts = { 1: 0, 2: 0, 3: 0 };
  for (const c of VOTE_BANK) {
    assert.ok([1, 2, 3].includes(c.value), `${c.id} value 1/2/3`);
    counts[c.value]++;
    const total = Object.values(c.cost).reduce((s, n) => s + n, 0);
    assert.ok(total > 0 && total <= 6, `${c.id} cost total in 1..6`);
    assert.ok(c.cost[c.markedResource] > 0, `${c.id} marked resource is part of cost`);
  }
  assert.equal(counts[1], 20);
  assert.equal(counts[2], 25);
  assert.equal(counts[3], 15);
});
```

- [ ] **Step 2: Run to verify fail**

Run: `node --test tests/content.test.js`
Expected: module not found / 1 fail.

- [ ] **Step 3: Create `src/data/voteBank.js`**

```javascript
// 60 Vote Bank Cards. Each card grants `value` voters at the listed resource
// cost. `markedResource` is the cost slot Idealist L4 "Blind Faith" may waive.
//
// Distribution (rulebook-ish — 60 cards, mix-of-resource-costs scaled to value):
//   20 × value 1, cost 1..2 resources
//   25 × value 2, cost 3..4 resources
//   15 × value 3, cost 5..6 resources
const C = (id, value, cost, markedResource) => ({ id, value, cost, markedResource });

const v1 = [
  C("vb01", 1, { funds: 1 }, "funds"),
  C("vb02", 1, { clout: 1 }, "clout"),
  C("vb03", 1, { media: 1 }, "media"),
  C("vb04", 1, { trust: 1 }, "trust"),
  C("vb05", 1, { funds: 2 }, "funds"),
  C("vb06", 1, { clout: 2 }, "clout"),
  C("vb07", 1, { media: 2 }, "media"),
  C("vb08", 1, { trust: 2 }, "trust"),
  C("vb09", 1, { funds: 1, clout: 1 }, "clout"),
  C("vb10", 1, { funds: 1, media: 1 }, "media"),
  C("vb11", 1, { funds: 1, trust: 1 }, "trust"),
  C("vb12", 1, { clout: 1, media: 1 }, "media"),
  C("vb13", 1, { clout: 1, trust: 1 }, "trust"),
  C("vb14", 1, { media: 1, trust: 1 }, "trust"),
  C("vb15", 1, { funds: 1, clout: 1 }, "funds"),
  C("vb16", 1, { funds: 1, media: 1 }, "funds"),
  C("vb17", 1, { funds: 1, trust: 1 }, "funds"),
  C("vb18", 1, { clout: 1, media: 1 }, "clout"),
  C("vb19", 1, { clout: 1, trust: 1 }, "clout"),
  C("vb20", 1, { media: 1, trust: 1 }, "media"),
];

const v2 = [
  C("vb21", 2, { funds: 3 }, "funds"),
  C("vb22", 2, { clout: 3 }, "clout"),
  C("vb23", 2, { media: 3 }, "media"),
  C("vb24", 2, { trust: 3 }, "trust"),
  C("vb25", 2, { funds: 2, clout: 1 }, "funds"),
  C("vb26", 2, { funds: 2, media: 1 }, "media"),
  C("vb27", 2, { funds: 2, trust: 1 }, "trust"),
  C("vb28", 2, { clout: 2, funds: 1 }, "clout"),
  C("vb29", 2, { clout: 2, media: 1 }, "media"),
  C("vb30", 2, { clout: 2, trust: 1 }, "clout"),
  C("vb31", 2, { media: 2, funds: 1 }, "media"),
  C("vb32", 2, { media: 2, clout: 1 }, "media"),
  C("vb33", 2, { media: 2, trust: 1 }, "trust"),
  C("vb34", 2, { trust: 2, funds: 1 }, "trust"),
  C("vb35", 2, { trust: 2, clout: 1 }, "clout"),
  C("vb36", 2, { trust: 2, media: 1 }, "media"),
  C("vb37", 2, { funds: 1, clout: 1, media: 1 }, "funds"),
  C("vb38", 2, { funds: 1, clout: 1, trust: 1 }, "clout"),
  C("vb39", 2, { funds: 1, media: 1, trust: 1 }, "media"),
  C("vb40", 2, { clout: 1, media: 1, trust: 1 }, "trust"),
  C("vb41", 2, { funds: 2, clout: 2 }, "funds"),
  C("vb42", 2, { funds: 2, media: 2 }, "media"),
  C("vb43", 2, { clout: 2, trust: 2 }, "trust"),
  C("vb44", 2, { media: 2, trust: 2 }, "trust"),
  C("vb45", 2, { funds: 1, clout: 2, media: 1 }, "clout"),
];

const v3 = [
  C("vb46", 3, { funds: 2, clout: 2, media: 1 }, "media"),
  C("vb47", 3, { funds: 2, clout: 1, trust: 2 }, "funds"),
  C("vb48", 3, { funds: 1, clout: 2, trust: 2 }, "clout"),
  C("vb49", 3, { clout: 2, media: 2, trust: 1 }, "media"),
  C("vb50", 3, { funds: 2, media: 2, trust: 1 }, "trust"),
  C("vb51", 3, { funds: 1, media: 2, trust: 2 }, "media"),
  C("vb52", 3, { funds: 3, clout: 2 }, "funds"),
  C("vb53", 3, { clout: 3, media: 2 }, "clout"),
  C("vb54", 3, { media: 3, trust: 2 }, "media"),
  C("vb55", 3, { trust: 3, funds: 2 }, "trust"),
  C("vb56", 3, { funds: 2, clout: 2, media: 2 }, "funds"),
  C("vb57", 3, { funds: 2, clout: 2, trust: 2 }, "clout"),
  C("vb58", 3, { funds: 2, media: 2, trust: 2 }, "media"),
  C("vb59", 3, { clout: 2, media: 2, trust: 2 }, "trust"),
  C("vb60", 3, { funds: 1, clout: 2, media: 1, trust: 2 }, "trust"),
];

export const VOTE_BANK = [...v1, ...v2, ...v3];
export const VOTE_BANK_BY_ID = Object.fromEntries(VOTE_BANK.map((c) => [c.id, c]));
```

- [ ] **Step 4: Run to verify pass**

Run: `node --test tests/content.test.js`
Expected: VOTE_BANK test passes.

- [ ] **Step 5: Commit**

```bash
git add src/data/voteBank.js tests/content.test.js
git commit -m "feat(data): author 60-card Vote Bank deck"
```

---

### Task 1.3: Expand Headlines from 12 → 20

**Files:**
- Modify: `src/data/headlines.js`
- Test: `tests/content.test.js` (extend)

- [ ] **Step 1: Write the failing test**

Append to `tests/content.test.js`:
```javascript
import { HEADLINES } from "../src/data/headlines.js";

test("headlines: 20 unique cards across the rulebook effect families", () => {
  assert.equal(HEADLINES.length, 20);
  assert.equal(new Set(HEADLINES.map((h) => h.id)).size, 20);
  for (const h of HEADLINES) {
    assert.ok(h.name && h.text, `${h.id} has name+text`);
    assert.ok(["grant","lose","windfall","extraDilemma"].includes(h.effect.type),
      `${h.id} effect type valid`);
  }
});
```

- [ ] **Step 2: Run to verify fail**

Run: `node --test tests/content.test.js`
Expected: count assertion fails (currently 12).

- [ ] **Step 3: Append 8 new headlines**

Edit `src/data/headlines.js` — append after h12:
```javascript
  { id: "h13", name: "Foreign Endorsement",   text: "A neighbor backs your platform.",     effect: { type: "grant", params: { resource: "trust", amount: 2 } } },
  { id: "h14", name: "Strike Wave",           text: "Workers walk out across the south.",  effect: { type: "lose",  params: { resource: "clout", amount: 2 } } },
  { id: "h15", name: "Viral Speech",          text: "A clip catches fire.",                effect: { type: "grant", params: { resource: "media", amount: 2 } } },
  { id: "h16", name: "Court Setback",         text: "A ruling stalls your agenda.",        effect: { type: "lose",  params: { resource: "trust", amount: 2 } } },
  { id: "h17", name: "Surprise Coalition",    text: "An ally turns the tide.",             effect: { type: "windfall", params: {} } },
  { id: "h18", name: "Border Incident",       text: "An overnight crisis dominates news.", effect: { type: "extraDilemma", params: {} } },
  { id: "h19", name: "Whistleblower",         text: "An insider leaks the playbook.",      effect: { type: "lose",  params: { resource: "funds", amount: 2 } } },
  { id: "h20", name: "Festival Spotlight",    text: "The cameras find you everywhere.",    effect: { type: "grant", params: { resource: "clout", amount: 2 } } },
```

- [ ] **Step 4: Run to verify pass**

Run: `node --test tests/content.test.js`
Expected: HEADLINES test passes.

- [ ] **Step 5: Commit**

```bash
git add src/data/headlines.js tests/content.test.js
git commit -m "feat(data): expand headlines from 12 to 20"
```

---

### Task 1.4: New state shape — `createGame`

**Files:**
- Modify: `src/engine/state.js`
- Test: `tests/state.test.js` (rewrite)

- [ ] **Step 1: Write the failing test**

Replace `tests/state.test.js` body with:
```javascript
import { test } from "node:test";
import assert from "node:assert/strict";
import { createGame } from "../src/engine/state.js";
import { ZONES } from "../src/data/map.js";
import { VOTE_BANK } from "../src/data/voteBank.js";

const P = [{ name: "A", color: "#1" }, { name: "B", color: "#2" }];

test("createGame: zones have seats[], flippedSeats[], volatileSeats, coalition=null", () => {
  const g = createGame({ players: P, seed: 1 });
  for (const z of g.zones) {
    const def = ZONES.find((x) => x.id === z.id);
    assert.equal(z.seats.length, def.capacity);
    assert.equal(z.flippedSeats.length, def.capacity);
    assert.ok(z.seats.every((s) => s === null));
    assert.ok(z.flippedSeats.every((f) => f === false));
    assert.deepEqual(z.volatileSeats, def.volatileSeats);
    assert.equal(z.coalition, null);
    assert.equal(z.lockedBy, null);
  }
});

test("createGame: market deck has 60 cards shuffled, 3 open, 0 discarded", () => {
  const g = createGame({ players: P, seed: 1 });
  assert.equal(g.market.open.length, 3);
  assert.equal(g.market.deck.length + g.market.open.length + g.market.discard.length, VOTE_BANK.length);
  assert.equal(g.market.discard.length, 0);
});

test("createGame: players have pendingPlacements=0 and full power-tracker fields", () => {
  const g = createGame({ players: P, seed: 1 });
  for (const p of g.players) {
    assert.equal(p.pendingPlacements, 0);
    assert.deepEqual(p.usedThisTurn, {});
  }
});

test("createGame: turn opens in 'draft' phase, no pending headlines/proposal/gerry budget", () => {
  const g = createGame({ players: P, seed: 1 });
  assert.equal(g.turn.phase, "draft");
  assert.deepEqual(g.turn.pendingHeadlines, []);
  assert.equal(g.turn.pendingProposal, null);
  assert.deepEqual(g.turn.gerrymanderMoves, {});
  assert.equal(g.turn.currentBuy, null);
});

test("createGame: deterministic for same seed", () => {
  const a = createGame({ players: P, seed: 42 });
  const b = createGame({ players: P, seed: 42 });
  assert.deepEqual(a.market.open, b.market.open);
  assert.deepEqual(a.market.deck, b.market.deck);
});
```

- [ ] **Step 2: Run to verify fail**

Run: `node --test tests/state.test.js`
Expected: assertion failures across the new shape.

- [ ] **Step 3: Rewrite `src/engine/state.js`**

```javascript
import { makeRng, shuffle } from "./rng.js";
import { ZONES } from "../data/map.js";
import { DILEMMAS } from "../data/dilemmas.js";
import { CONSPIRACIES } from "../data/conspiracies.js";
import { HEADLINES } from "../data/headlines.js";
import { VOTE_BANK } from "../data/voteBank.js";

export function createGame({ players, seed = 1 }) {
  const rng = makeRng(seed);
  const market = (() => {
    const shuffled = shuffle(VOTE_BANK.map((c) => c.id), rng);
    return { open: shuffled.slice(0, 3), deck: shuffled.slice(3), discard: [] };
  })();
  return {
    seed,
    players: players.map((p, i) => ({
      id: i,
      name: p.name,
      color: p.color,
      resources: { funds: 0, clout: 0, media: 0, trust: 0 },
      piles: { capitalist: 0, supremo: 0, showman: 0, idealist: 0 },
      hand: [],
      pendingPlacements: 0,
      usedThisTurn: {}
    })),
    zones: ZONES.map((z) => ({
      id: z.id,
      seats: new Array(z.capacity).fill(null),
      flippedSeats: new Array(z.capacity).fill(false),
      volatileSeats: [...z.volatileSeats],
      lockedBy: null,
      coalition: null
    })),
    market,
    decks: {
      dilemmaDraw: shuffle(DILEMMAS.map((d) => d.id), rng),
      dilemmaDiscard: [],
      conspiracyDraw: shuffle(CONSPIRACIES.map((c) => c.id), rng),
      conspiracyDiscard: [],
      headlineDraw: shuffle(HEADLINES.map((h) => h.id), rng),
      headlineDiscard: []
    },
    turn: {
      current: 0,
      phase: "draft",
      pendingDilemma: null,
      gerrymanderMoves: {},
      draftRemaining: 1,
      currentBuy: null,
      pendingHeadlines: [],
      pendingProposal: null,
      betweenTurnsAt: null
    },
    lastHeadline: null,
    endGame: null,
    log: [],
    winner: null
  };
}

export function clone(state) {
  return structuredClone(state);
}
```

- [ ] **Step 4: Note — ideology renamed `showstopper` → `showman` to match rulebook**

The rulebook calls the third archetype "The Showman". `state.players[].piles.showman` replaces `showstopper`. Any other file that references `showstopper` will fail subsequent tests — to be fixed in their respective tasks.

- [ ] **Step 5: Run to verify pass**

Run: `node --test tests/state.test.js`
Expected: 5/5 pass.

- [ ] **Step 6: Run full suite — expect failures elsewhere**

Run: `npm test`
Expected: ~30+ failures in `actions`, `archetypes`, `rules`, `conspiracies`, `headlines`, `ui-smoke` — these will be fixed in subsequent tasks of this phase and Phase 2.

- [ ] **Step 7: Commit**

```bash
git add src/engine/state.js tests/state.test.js
git commit -m "feat(state): new state shape for seats/flipped/coalition/market"
```

---

### Task 1.5: Constants — add `showman`, drop `showstopper`

**Files:**
- Modify: `src/engine/constants.js`

- [ ] **Step 1: Edit constants**

In `src/engine/constants.js`, change every `"showstopper"` to `"showman"`. Update `RESOURCE_OF`:
```javascript
export const IDEOLOGIES = ["capitalist", "supremo", "showman", "idealist"];
export const RESOURCES = ["funds", "clout", "media", "trust"];
export const RESOURCE_OF = {
  capitalist: "funds",
  supremo: "clout",
  showman: "media",
  idealist: "trust"
};
// tierOf no longer used (2-level + passive replaces it). Keep export
// for transitional code in this phase; deleted in Phase 3.
export const tierOf = (n) => (n >= 6 ? 6 : n >= 4 ? 4 : 0);
```

- [ ] **Step 2: Commit**

```bash
git add src/engine/constants.js
git commit -m "refactor(constants): rename showstopper to showman; tierOf returns 4/6"
```

---

### Task 1.6: `src/data/dilemmas.js` — rename ideology + payouts

**Files:**
- Modify: `src/data/dilemmas.js`

- [ ] **Step 1: Replace every `"showstopper"` ideology tag with `"showman"`**

Use a search/replace across the file:
```bash
sed -i '' 's/"showstopper"/"showman"/g' src/data/dilemmas.js
```

- [ ] **Step 2: Verify content test still passes**

Run: `node --test tests/content.test.js`
Expected: pass (dilemma payouts and ideology valid checks succeed).

- [ ] **Step 3: Commit**

```bash
git add src/data/dilemmas.js
git commit -m "refactor(dilemmas): rename showstopper to showman"
```

---

## Phase 2: Core engine — rules helpers, market, scoring, gerrymander, headlines

### Task 2.1: Rules helpers — flipped/score/volatile

**Files:**
- Modify: `src/engine/rules.js`
- Test: `tests/rules.test.js` (extend)

- [ ] **Step 1: Write failing tests**

Append to `tests/rules.test.js`:
```javascript
import { flippedCount, playerScore, isVolatileSeat, voteCount } from "../src/engine/rules.js";

test("isVolatileSeat: true for indices in zone.volatileSeats", () => {
  const g = createGame({ players: P, seed: 1 });
  const central = g.zones.find((z) => z.id === "central");
  for (const i of central.volatileSeats) assert.equal(isVolatileSeat(central, i), true);
  assert.equal(isVolatileSeat(central, 0), central.volatileSeats.includes(0));
});

test("voteCount: counts all seats a player holds in the zone (volatile included)", () => {
  let g = createGame({ players: P, seed: 1 });
  const z = g.zones[0];
  z.seats[0] = 0; z.seats[1] = 0; z.seats[2] = 1;
  assert.equal(voteCount(z, 0), 2);
  assert.equal(voteCount(z, 1), 1);
});

test("flippedCount: counts S-side seats per player", () => {
  let g = createGame({ players: P, seed: 1 });
  const z = g.zones[0];
  z.seats[0] = 0; z.seats[1] = 0; z.seats[2] = 0;
  z.flippedSeats[0] = true; z.flippedSeats[1] = true;
  assert.equal(flippedCount(z, 0), 2);
  assert.equal(flippedCount(z, 1), 0);
});

test("playerScore: sum of flipped seats across all zones", () => {
  let g = createGame({ players: P, seed: 1 });
  g.zones[0].seats[0] = 0; g.zones[0].flippedSeats[0] = true;
  g.zones[1].seats[0] = 0; g.zones[1].flippedSeats[0] = true;
  g.zones[1].seats[1] = 0; g.zones[1].flippedSeats[1] = true;
  assert.equal(playerScore(g, 0), 3);
  assert.equal(playerScore(g, 1), 0);
});
```

- [ ] **Step 2: Run to verify fail**

Run: `node --test tests/rules.test.js`
Expected: imports fail / 4 tests fail.

- [ ] **Step 3: Implement helpers**

In `src/engine/rules.js`, replace the file with the new model + new helpers:
```javascript
import { ZONE_BY_ID } from "../data/map.js";

export const zoneCapacity = (zoneId) => ZONE_BY_ID[zoneId].capacity;
export const majorityThreshold = (zoneId) => ZONE_BY_ID[zoneId].majority;
export const neighborsOf = (zoneId) => ZONE_BY_ID[zoneId].neighbors;

export const isVolatileSeat = (zone, seatIndex) => zone.volatileSeats.includes(seatIndex);

export const voteCount = (zone, playerId) => zone.seats.filter((s) => s === playerId).length;
export const flippedCount = (zone, playerId) =>
  zone.seats.reduce((n, s, i) => n + (s === playerId && zone.flippedSeats[i] ? 1 : 0), 0);

export const totalVoters = (zone) => zone.seats.filter((s) => s !== null).length;
export const emptySeats = (zone) => {
  const out = [];
  zone.seats.forEach((s, i) => { if (s === null) out.push(i); });
  return out;
};
export const isZoneFull = (zone) => emptySeats(zone).length === 0;

// A zone is "locked" if solo majority is taken or a coalition has been struck.
export const isZoneClosed = (zone) => zone.lockedBy !== null || zone.coalition !== null;

export const majorityHolder = (zone) => {
  if (zone.coalition) return null; // coalition zones have no single holder
  const need = ZONE_BY_ID[zone.id].majority;
  const counts = {};
  for (const s of zone.seats) if (s !== null) counts[s] = (counts[s] || 0) + 1;
  for (const [pid, n] of Object.entries(counts)) if (n >= need) return Number(pid);
  return null;
};

export const playerScore = (state, playerId) =>
  state.zones.reduce((sum, z) => sum + flippedCount(z, playerId), 0);

// Standings: by flipped score desc, tie-break by total voters owned on the board.
export function standings(state) {
  const rows = state.players.map((p) => {
    const flips = playerScore(state, p.id);
    const voters = state.zones.reduce((s, z) => s + voteCount(z, p.id), 0);
    const zones = state.zones.filter((z) => z.lockedBy === p.id ||
      (z.coalition && z.coalition.partners.includes(p.id))).length;
    return { playerId: p.id, name: p.name, score: flips, voters, zones, pegs: voters };
  });
  rows.sort((a, b) => b.score - a.score || b.voters - a.voters);
  return rows;
}

// Solo majorities only grant the gerrymander power.
export const soloMajorityZones = (state, playerId) =>
  state.zones.filter((z) => z.lockedBy === playerId);
```

- [ ] **Step 4: Run to verify pass**

Run: `node --test tests/rules.test.js`
Expected: 4 new tests pass; existing rules tests may need adjustment for `showman` rename — fix any failing assertions.

- [ ] **Step 5: Commit**

```bash
git add src/engine/rules.js tests/rules.test.js
git commit -m "feat(rules): flippedCount, playerScore, isVolatileSeat, isZoneClosed"
```

---

### Task 2.2: Market helpers — shuffle, draw, refill

**Files:**
- Create: `src/engine/market.js`
- Create: `tests/market.test.js`

- [ ] **Step 1: Write failing tests**

Create `tests/market.test.js`:
```javascript
import { test } from "node:test";
import assert from "node:assert/strict";
import { createGame } from "../src/engine/state.js";
import { takeOpen, refill, reshuffleIfEmpty } from "../src/engine/market.js";
import { VOTE_BANK } from "../src/data/voteBank.js";

const P = [{ name: "A", color: "#1" }, { name: "B", color: "#2" }];

test("takeOpen: removes the chosen open card, moves it to discard, refills from deck", () => {
  let g = createGame({ players: P, seed: 1 });
  const taken = g.market.open[1];
  const next = takeOpen(g, 1);
  assert.equal(next.market.discard[0], taken);
  assert.equal(next.market.open.length, 3);
  assert.equal(next.market.open.includes(taken), false);
  assert.equal(next.market.deck.length, g.market.deck.length - 1);
});

test("reshuffleIfEmpty: when deck empty, discard becomes a new shuffled deck", () => {
  let g = createGame({ players: P, seed: 1 });
  g.market.deck = [];
  g.market.discard = ["vb01", "vb02", "vb03"];
  const next = reshuffleIfEmpty(g);
  assert.equal(next.market.deck.length, 3);
  assert.equal(next.market.discard.length, 0);
});

test("refill: leaves market.open with 3 cards", () => {
  let g = createGame({ players: P, seed: 1 });
  g.market.open = [g.market.open[0]];
  const next = refill(g);
  assert.equal(next.market.open.length, 3);
});
```

- [ ] **Step 2: Run to verify fail**

Run: `node --test tests/market.test.js`
Expected: module not found.

- [ ] **Step 3: Create `src/engine/market.js`**

```javascript
import { makeRng, shuffle } from "./rng.js";
import { clone } from "./state.js";

export function reshuffleIfEmpty(state) {
  if (state.market.deck.length > 0 || state.market.discard.length === 0) return state;
  const s = clone(state);
  const rng = makeRng(s.seed + s.turn.current + s.market.discard.length);
  s.market.deck = shuffle(s.market.discard, rng);
  s.market.discard = [];
  return s;
}

export function refill(state) {
  let s = state;
  while (s.market.open.length < 3) {
    s = reshuffleIfEmpty(s);
    if (s.market.deck.length === 0) break;
    s = clone(s);
    s.market.open.push(s.market.deck.shift());
  }
  return s;
}

// Discard the card at open index `i`, then refill from deck.
export function takeOpen(state, i) {
  if (i < 0 || i >= state.market.open.length) throw new Error("invalid open index");
  let s = clone(state);
  const [taken] = s.market.open.splice(i, 1);
  s.market.discard.push(taken);
  return refill(s);
}
```

- [ ] **Step 4: Run to verify pass**

Run: `node --test tests/market.test.js`
Expected: 3/3 pass.

- [ ] **Step 5: Commit**

```bash
git add src/engine/market.js tests/market.test.js
git commit -m "feat(market): vote-bank deck/open/discard helpers"
```

---

### Task 2.3: `discardResources` action (cap-12 trim)

**Files:**
- Modify: `src/engine/actions.js`
- Create: `tests/cap.test.js`

- [ ] **Step 1: Write failing test**

Create `tests/cap.test.js`:
```javascript
import { test } from "node:test";
import assert from "node:assert/strict";
import { createGame } from "../src/engine/state.js";
import { discardResources } from "../src/engine/actions.js";

const P = [{ name: "A", color: "#1" }, { name: "B", color: "#2" }];

test("discardResources: trims a player's resources by the named amounts", () => {
  let g = createGame({ players: P, seed: 1 });
  g.players[0].resources = { funds: 5, clout: 5, media: 3, trust: 0 };
  g.turn = { ...g.turn, phase: "discard" };
  const next = discardResources(g, { counts: { funds: 1, clout: 0 } });
  assert.equal(next.players[0].resources.funds, 4);
  assert.equal(next.players[0].resources.clout, 5);
});

test("discardResources: rejects if remaining total exceeds 12", () => {
  let g = createGame({ players: P, seed: 1 });
  g.players[0].resources = { funds: 5, clout: 5, media: 5, trust: 0 };  // total 15
  g.turn = { ...g.turn, phase: "discard" };
  assert.throws(() => discardResources(g, { counts: { funds: 1 } }), /total/i);
});

test("discardResources: rejects discarding more than you hold", () => {
  let g = createGame({ players: P, seed: 1 });
  g.players[0].resources = { funds: 1, clout: 0, media: 0, trust: 0 };
  g.turn = { ...g.turn, phase: "discard" };
  assert.throws(() => discardResources(g, { counts: { funds: 5 } }), /enough/i);
});

test("discardResources: advances phase to placePending then actions when at/under cap", () => {
  let g = createGame({ players: P, seed: 1 });
  g.players[0].resources = { funds: 13, clout: 0, media: 0, trust: 0 };
  g.turn = { ...g.turn, phase: "discard" };
  const after = discardResources(g, { counts: { funds: 1 } });
  // pendingPlacements==0 -> skip placePending, go straight to actions
  assert.equal(after.turn.phase, "actions");
});
```

- [ ] **Step 2: Run to verify fail**

Run: `node --test tests/cap.test.js`
Expected: `discardResources` undefined.

- [ ] **Step 3: Add to `src/engine/actions.js`**

```javascript
import { RESOURCES } from "./constants.js";

const RESOURCE_CAP = 12;

const totalResources = (p) =>
  RESOURCES.reduce((s, r) => s + (p.resources[r] || 0), 0);

export function discardResources(state, { counts }) {
  if (state.turn.phase !== "discard") throw new Error("discard only in discard phase");
  const s = clone(state);
  const p = s.players[s.turn.current];
  for (const r of RESOURCES) {
    const n = counts[r] || 0;
    if (n < 0) throw new Error("negative discard");
    if ((p.resources[r] || 0) < n) throw new Error("not enough " + r);
    p.resources[r] -= n;
  }
  if (totalResources(p) > RESOURCE_CAP)
    throw new Error("total still over cap; discard more");
  // advance: placePending if pending evictions; else actions
  s.turn.phase = p.pendingPlacements > 0 ? "placePending" : "actions";
  return s;
}
```

- [ ] **Step 4: Run to verify pass**

Run: `node --test tests/cap.test.js`
Expected: 4/4 pass.

- [ ] **Step 5: Commit**

```bash
git add src/engine/actions.js tests/cap.test.js
git commit -m "feat(actions): discardResources for cap-12 trim"
```

---

### Task 2.4: `buyVoteBank` action

**Files:**
- Modify: `src/engine/actions.js`
- Create: `tests/voteBank-actions.test.js`

- [ ] **Step 1: Write failing tests**

Create `tests/voteBank-actions.test.js`:
```javascript
import { test } from "node:test";
import assert from "node:assert/strict";
import { createGame } from "../src/engine/state.js";
import { buyVoteBank } from "../src/engine/actions.js";
import { VOTE_BANK_BY_ID } from "../src/data/voteBank.js";

const P = [{ name: "A", color: "#1" }, { name: "B", color: "#2" }];

function inActions(g, pid = 0) {
  g.turn = { ...g.turn, phase: "actions", current: pid };
  return g;
}

test("buyVoteBank: pays the open card's cost, queues toPlace=value, replaces the slot", () => {
  let g = inActions(createGame({ players: P, seed: 1 }));
  const card = VOTE_BANK_BY_ID[g.market.open[0]];
  for (const [r, n] of Object.entries(card.cost)) g.players[0].resources[r] = n + 1;
  const next = buyVoteBank(g, { openIndex: 0 });
  assert.equal(next.turn.currentBuy.cardId, card.id);
  assert.equal(next.turn.currentBuy.zoneId, null);
  assert.equal(next.turn.currentBuy.tokensRemaining, card.value);
  for (const [r, n] of Object.entries(card.cost)) {
    assert.equal(next.players[0].resources[r], 1);
  }
  assert.equal(next.market.open.length, 3);
  assert.equal(next.market.open.includes(card.id), false);
});

test("buyVoteBank: throws on unaffordable card", () => {
  let g = inActions(createGame({ players: P, seed: 1 }));
  g.players[0].resources = { funds: 0, clout: 0, media: 0, trust: 0 };
  assert.throws(() => buyVoteBank(g, { openIndex: 0 }), /afford/i);
});

test("buyVoteBank: blocked while a buy is already in flight (toPlace>0)", () => {
  let g = inActions(createGame({ players: P, seed: 1 }));
  g.players[0].resources = { funds: 9, clout: 9, media: 9, trust: 9 };
  g.turn.currentBuy = { cardId: "x", zoneId: null, tokensRemaining: 1 };
  assert.throws(() => buyVoteBank(g, { openIndex: 0 }), /finish placing/i);
});
```

- [ ] **Step 2: Run to verify fail**

Run: `node --test tests/voteBank-actions.test.js`
Expected: `buyVoteBank` undefined.

- [ ] **Step 3: Implement in `src/engine/actions.js`**

```javascript
import { VOTE_BANK_BY_ID } from "../data/voteBank.js";
import { takeOpen } from "./market.js";

const canAffordCost = (p, cost) =>
  Object.entries(cost).every(([r, n]) => (p.resources[r] || 0) >= n);

export function buyVoteBank(state, { openIndex, useBlindFaith = false }) {
  if (state.turn.phase !== "actions") throw new Error("buy only in actions phase");
  if (state.turn.currentBuy && state.turn.currentBuy.tokensRemaining > 0)
    throw new Error("finish placing your voters first");
  const cardId = state.market.open[openIndex];
  if (!cardId) throw new Error("no card at that open slot");
  const card = VOTE_BANK_BY_ID[cardId];
  let cost = { ...card.cost };
  // Blind Faith (Idealist L4) waives the marked resource — applied here so the
  // pay step uses the discounted cost. Per-turn cap-3 enforced in powers.js
  // when the power is unlocked; useBlindFaith=true with no power is rejected.
  if (useBlindFaith) {
    if ((state.players[state.turn.current].piles.idealist || 0) < 4)
      throw new Error("Blind Faith requires Idealist L4");
    delete cost[card.markedResource];
  }
  let s = clone(state);
  const p = s.players[s.turn.current];
  if (!canAffordCost(p, cost)) throw new Error("cannot afford voter");
  for (const [r, n] of Object.entries(cost)) p.resources[r] -= n;
  s = takeOpen(s, openIndex);
  // Echo Chamber (Showman L4) bonus voter on each unique card id, max 3/turn.
  let value = card.value;
  if ((p.piles.showman || 0) >= 4) {
    p.usedThisTurn.echoChamberCardIds = p.usedThisTurn.echoChamberCardIds || [];
    if (
      p.usedThisTurn.echoChamberCardIds.length < 3 &&
      !p.usedThisTurn.echoChamberCardIds.includes(card.id)
    ) {
      p.usedThisTurn.echoChamberCardIds.push(card.id);
      value += 1;
    }
  }
  s.turn.currentBuy = { cardId: card.id, zoneId: null, tokensRemaining: value };
  s.log.push(`${p.name} bought ${card.id} (${value} to place)`);
  return s;
}
```

- [ ] **Step 4: Run to verify pass**

Run: `node --test tests/voteBank-actions.test.js`
Expected: 3/3 pass.

- [ ] **Step 5: Commit**

```bash
git add src/engine/actions.js tests/voteBank-actions.test.js
git commit -m "feat(actions): buyVoteBank with Blind Faith + Echo Chamber hooks"
```

---

### Task 2.5: `placeToken` with same-zone enforcement + scoring flip

**Files:**
- Modify: `src/engine/actions.js`
- Test: `tests/voteBank-actions.test.js` (extend)

- [ ] **Step 1: Write failing tests**

Append to `tests/voteBank-actions.test.js`:
```javascript
import { placeToken } from "../src/engine/actions.js";

test("placeToken: locks zone on first placement of a buy; subsequent tokens must go same-zone", () => {
  let g = inActions(createGame({ players: P, seed: 1 }));
  g.turn.currentBuy = { cardId: "vb01", zoneId: null, tokensRemaining: 2 };
  g = placeToken(g, { zoneId: "central", seatIndex: 0 });
  assert.equal(g.turn.currentBuy.zoneId, "central");
  assert.throws(() => placeToken(g, { zoneId: "north", seatIndex: 0 }), /same zone/i);
});

test("placeToken: when threshold reached, flips exactly `majority` of player's seats S-side up", () => {
  let g = inActions(createGame({ players: P, seed: 1 }));
  const corner = g.zones.find((z) => z.id === "ne");  // capacity 11, majority 6
  // pre-seat 5 of our voters
  for (let i = 0; i < 5; i++) corner.seats[i] = 0;
  g.turn.currentBuy = { cardId: "vb01", zoneId: "ne", tokensRemaining: 1 };
  g = placeToken(g, { zoneId: "ne", seatIndex: 5 });
  const after = g.zones.find((z) => z.id === "ne");
  assert.equal(after.lockedBy, 0);
  assert.equal(after.flippedSeats.filter(Boolean).length, 6);  // exactly threshold
});

test("placeToken: volatile seat queues a headline (no immediate resolve)", () => {
  let g = inActions(createGame({ players: P, seed: 1 }));
  g.turn.currentBuy = { cardId: "vb01", zoneId: null, tokensRemaining: 1 };
  const c = g.zones.find((z) => z.id === "central");
  const volIdx = c.volatileSeats[0];
  const next = placeToken(g, { zoneId: "central", seatIndex: volIdx });
  assert.deepEqual(next.turn.pendingHeadlines, [{ zoneId: "central", playerId: 0 }]);
  assert.equal(next.lastHeadline, null);   // not resolved yet
});
```

- [ ] **Step 2: Run to verify fail**

Run: `node --test tests/voteBank-actions.test.js`
Expected: 3 fail.

- [ ] **Step 3: Implement `placeToken` and helper `flipMajorityIfReached`**

In `src/engine/actions.js`:
```javascript
import { majorityThreshold, isVolatileSeat, voteCount } from "./rules.js";

function flipMajorityIfReached(s, zone, pid) {
  if (zone.lockedBy !== null || zone.coalition !== null) return;
  const need = majorityThreshold(zone.id);
  if (voteCount(zone, pid) < need) return;
  let flipped = 0;
  for (let i = 0; i < zone.seats.length && flipped < need; i++) {
    if (zone.seats[i] === pid && !zone.flippedSeats[i]) {
      zone.flippedSeats[i] = true;
      flipped++;
    }
  }
  zone.lockedBy = pid;
  s.log.push(`${s.players[pid].name} locked ${zone.id}`);
}

export function placeToken(state, { zoneId, seatIndex }) {
  if (state.turn.phase !== "actions" && state.turn.phase !== "placePending")
    throw new Error("place only in actions/placePending phase");
  const s = clone(state);
  const p = s.players[s.turn.current];
  const zone = s.zones.find((z) => z.id === zoneId);
  if (!zone) throw new Error("no such zone");
  if (zone.lockedBy !== null || zone.coalition !== null)
    throw new Error("zone is closed");
  if (seatIndex == null || seatIndex < 0 || seatIndex >= zone.seats.length ||
      zone.seats[seatIndex] !== null) throw new Error("seat not available");
  if (s.turn.phase === "actions") {
    const buy = s.turn.currentBuy;
    if (!buy || buy.tokensRemaining <= 0) throw new Error("no voters to place");
    if (buy.zoneId && buy.zoneId !== zoneId)
      throw new Error("all voters from one card must go in the same zone");
    buy.zoneId = zoneId;
    buy.tokensRemaining -= 1;
    if (buy.tokensRemaining === 0) s.turn.currentBuy = null;
  } else {
    // placePending: each placement consumes one pending eviction slot
    if (p.pendingPlacements <= 0) throw new Error("no pending placements");
    p.pendingPlacements -= 1;
  }
  zone.seats[seatIndex] = p.id;
  if (isVolatileSeat(zone, seatIndex)) {
    s.turn.pendingHeadlines.push({ zoneId, playerId: p.id });
    s.log.push(`${p.name} placed on volatile seat in ${zoneId} — headline queued`);
  }
  flipMajorityIfReached(s, zone, p.id);
  if (s.turn.phase === "placePending" && p.pendingPlacements === 0)
    s.turn.phase = "actions";
  return s;
}
```

- [ ] **Step 4: Run to verify pass**

Run: `node --test tests/voteBank-actions.test.js`
Expected: 6/6 pass (incl. earlier 3).

- [ ] **Step 5: Commit**

```bash
git add src/engine/actions.js tests/voteBank-actions.test.js
git commit -m "feat(actions): placeToken with same-zone, scoring flip, volatile headline queue"
```

---

### Task 2.6: `gerrymander` action (every-turn, neighbor-of-majority)

**Files:**
- Modify: `src/engine/actions.js`, `src/engine/rules.js`
- Create: `tests/gerrymander.test.js`

- [ ] **Step 1: Write failing tests**

Create `tests/gerrymander.test.js`:
```javascript
import { test } from "node:test";
import assert from "node:assert/strict";
import { createGame } from "../src/engine/state.js";
import { gerrymander, beginTurn, answerDilemma } from "../src/engine/actions.js";

const P = [{ name: "A", color: "#1" }, { name: "B", color: "#2" }];

function setup() {
  // Player 0 owns Central as a solo majority; ne is a neighbor with an opponent peg.
  let g = createGame({ players: P, seed: 1 });
  g.turn = { ...g.turn, phase: "actions", current: 0, gerrymanderMoves: { central: 1 } };
  const c = g.zones.find((z) => z.id === "central");
  c.lockedBy = 0;
  for (let i = 0; i < 5; i++) { c.seats[i] = 0; c.flippedSeats[i] = true; }
  const ne = g.zones.find((z) => z.id === "ne");
  ne.seats[0] = 1;   // opponent peg, non-volatile assumed (index 0 not in volatileSeats)
  return g;
}

test("gerrymander: moves a non-majority opponent peg between neighbor-of-majority zones", () => {
  let g = setup();
  const next = gerrymander(g, {
    majorityZoneId: "central",
    fromZoneId: "ne",
    fromSeatIndex: 0,
    toZoneId: "north",
    toSeatIndex: 0
  });
  assert.equal(next.zones.find((z) => z.id === "ne").seats[0], null);
  assert.equal(next.zones.find((z) => z.id === "north").seats[0], 1);
  assert.equal(next.turn.gerrymanderMoves.central, 0);
});

test("gerrymander: rejects moving a flipped majority voter", () => {
  let g = setup();
  // central seat 0 is flipped (majority voter)
  assert.throws(() => gerrymander(g, {
    majorityZoneId: "central", fromZoneId: "central", fromSeatIndex: 0,
    toZoneId: "ne", toSeatIndex: 1
  }), /majority|flipped/i);
});

test("gerrymander: rejects volatile source", () => {
  let g = setup();
  const ne = g.zones.find((z) => z.id === "ne");
  const vol = ne.volatileSeats[0];
  ne.seats[vol] = 1;
  assert.throws(() => gerrymander(g, {
    majorityZoneId: "central", fromZoneId: "ne", fromSeatIndex: vol,
    toZoneId: "north", toSeatIndex: 0
  }), /volatile/i);
});

test("gerrymander: allows volatile destination, queuing a headline on the moved voter's owner", () => {
  let g = setup();
  const central = g.zones.find((z) => z.id === "central");
  const vol = central.volatileSeats[0];
  // ensure volatile seat is empty initially (might have been seated by setup)
  central.seats[vol] = null; central.flippedSeats[vol] = false;
  const next = gerrymander(g, {
    majorityZoneId: "central", fromZoneId: "ne", fromSeatIndex: 0,
    toZoneId: "central", toSeatIndex: vol
  });
  assert.deepEqual(next.turn.pendingHeadlines, [{ zoneId: "central", playerId: 1 }]);
});

test("gerrymander: rejects when source/dest do not share a border with each other", () => {
  let g = setup();
  // ne and sw are not neighbors of each other
  const sw = g.zones.find((z) => z.id === "sw");
  sw.seats[0] = 1;
  assert.throws(() => gerrymander(g, {
    majorityZoneId: "central", fromZoneId: "ne", fromSeatIndex: 0,
    toZoneId: "sw", toSeatIndex: 0
  }), /border/i);
});

test("gerrymander: rejects when budget for that majority is 0", () => {
  let g = setup();
  g.turn.gerrymanderMoves.central = 0;
  assert.throws(() => gerrymander(g, {
    majorityZoneId: "central", fromZoneId: "ne", fromSeatIndex: 0,
    toZoneId: "north", toSeatIndex: 0
  }), /no moves left/i);
});
```

- [ ] **Step 2: Run to verify fail**

Run: `node --test tests/gerrymander.test.js`
Expected: 6 fail.

- [ ] **Step 3: Implement**

Add to `src/engine/actions.js`:
```javascript
import { neighborsOf } from "./rules.js";

export function gerrymander(state, { majorityZoneId, fromZoneId, fromSeatIndex, toZoneId, toSeatIndex }) {
  if (state.turn.phase !== "actions") throw new Error("gerrymander only in actions phase");
  const budget = state.turn.gerrymanderMoves[majorityZoneId] || 0;
  if (budget <= 0) throw new Error("no moves left for that majority");
  const s = clone(state);
  const pid = s.turn.current;
  const maj = s.zones.find((z) => z.id === majorityZoneId);
  if (!maj || maj.lockedBy !== pid) throw new Error("not your solo majority");
  // Source must be in majority zone or a neighbor.
  const sourcePool = new Set([majorityZoneId, ...neighborsOf(majorityZoneId)]);
  if (!sourcePool.has(fromZoneId)) throw new Error("source not in majority zone or neighbor");
  // Source and destination must share a border (each is either the majority zone
  // or one of its neighbors, and they share a border with each other).
  const adj = (a, b) => a === b ? false : neighborsOf(a).includes(b);
  if (!adj(fromZoneId, toZoneId)) throw new Error("source/dest do not share a border");
  if (!sourcePool.has(toZoneId)) throw new Error("dest not in majority zone or neighbor");
  const from = s.zones.find((z) => z.id === fromZoneId);
  const to = s.zones.find((z) => z.id === toZoneId);
  if (from.seats[fromSeatIndex] == null) throw new Error("no voter at source");
  if (from.flippedSeats[fromSeatIndex]) throw new Error("cannot move a flipped majority voter");
  if (from.volatileSeats.includes(fromSeatIndex)) throw new Error("voter on a volatile seat is immune");
  if (to.seats[toSeatIndex] != null) throw new Error("destination occupied");
  if (to.lockedBy !== null || to.coalition !== null) throw new Error("destination closed");
  const movedOwner = from.seats[fromSeatIndex];
  from.seats[fromSeatIndex] = null;
  to.seats[toSeatIndex] = movedOwner;
  if (to.volatileSeats.includes(toSeatIndex)) {
    s.turn.pendingHeadlines.push({ zoneId: toZoneId, playerId: movedOwner });
  }
  s.turn.gerrymanderMoves[majorityZoneId] = budget - 1;
  // gerrymander may upset a majority — recompute lockedBy/flips in the source zone
  // (NB: target zone's prior state is unchanged here because gerrymander dests are
  // never closed zones).
  if (from.lockedBy !== null) {
    const need = majorityThreshold(from.id);
    if (voteCount(from, from.lockedBy) < need) {
      // unlock + unflip
      from.flippedSeats = from.flippedSeats.map(() => false);
      from.lockedBy = null;
    }
  }
  s.log.push(`gerrymander ${fromZoneId}[${fromSeatIndex}] → ${toZoneId}[${toSeatIndex}]`);
  return s;
}
```

- [ ] **Step 4: Run to verify pass**

Run: `node --test tests/gerrymander.test.js`
Expected: 6/6 pass.

- [ ] **Step 5: Commit**

```bash
git add src/engine/actions.js tests/gerrymander.test.js
git commit -m "feat(actions): every-turn gerrymander with neighbor-of-majority rules"
```

---

### Task 2.7: `beginTurn` multi-stage + `endTurn` headline drain

**Files:**
- Modify: `src/engine/actions.js`
- Create: `tests/turn-lifecycle.test.js`

- [ ] **Step 1: Write failing tests**

Create `tests/turn-lifecycle.test.js`:
```javascript
import { test } from "node:test";
import assert from "node:assert/strict";
import { createGame } from "../src/engine/state.js";
import { beginTurn, answerDilemma, endTurn, doneReadAloud, donePendingPlace } from "../src/engine/actions.js";

const P = [{ name: "A", color: "#1" }, { name: "B", color: "#2" }];

test("beginTurn: enters readAloud first (when previous player exists), then dilemma", () => {
  let g = createGame({ players: P, seed: 1 });
  g.turn = { ...g.turn, phase: "actions", current: 1, draftRemaining: 0 };
  g = beginTurn(g);
  assert.equal(g.turn.phase, "readAloud");
  g = doneReadAloud(g);
  assert.equal(g.turn.phase, "dilemma");
  assert.ok(g.turn.pendingDilemma);
});

test("beginTurn: very first turn (current=0, no prior) skips readAloud", () => {
  let g = createGame({ players: P, seed: 1 });
  g.turn = { ...g.turn, phase: "actions", current: 0, draftRemaining: 0 };
  // simulate "first turn" by marking no previous via a special flag the engine reads
  g.turn.firstTurn = true;
  g = beginTurn(g);
  assert.equal(g.turn.phase, "dilemma");
});

test("beginTurn: passive resource granted (1 per 2 ideology cards of that type)", () => {
  let g = createGame({ players: P, seed: 1 });
  g.turn = { ...g.turn, phase: "actions", current: 0, draftRemaining: 0, firstTurn: true };
  g.players[0].piles.capitalist = 4;   // -> +2 funds passive
  g = beginTurn(g);
  assert.equal(g.players[0].resources.funds, 2);
});

test("beginTurn: when over cap-12 after passive, enters discard phase before dilemma", () => {
  let g = createGame({ players: P, seed: 1 });
  g.turn = { ...g.turn, phase: "actions", current: 0, draftRemaining: 0, firstTurn: true };
  g.players[0].resources = { funds: 11, clout: 2, media: 0, trust: 0 };  // total 13
  g = beginTurn(g);
  assert.equal(g.turn.phase, "discard");
});

test("beginTurn: when pendingPlacements>0, enters placePending after discard (or directly)", () => {
  let g = createGame({ players: P, seed: 1 });
  g.turn = { ...g.turn, phase: "actions", current: 0, draftRemaining: 0, firstTurn: true };
  g.players[0].pendingPlacements = 2;
  g = beginTurn(g);
  // dilemma fires first, but after it the engine should drop to placePending
  assert.equal(g.turn.phase, "dilemma");
  g = answerDilemma(g, { answerIndex: 0 });
  assert.equal(g.turn.phase, "placePending");
});

test("endTurn: drains pending headlines before handing off; lastHeadline reflects last", () => {
  let g = createGame({ players: P, seed: 1 });
  g.turn = { ...g.turn, phase: "actions", current: 0, draftRemaining: 0 };
  g.turn.pendingHeadlines = [{ zoneId: "central", playerId: 0 }];
  g.decks.headlineDraw = ["h01"];   // grant trust+2
  g.players[0].resources.trust = 0;
  g = endTurn(g);
  assert.equal(g.players[0].resources.trust, 2);
  assert.deepEqual(g.turn.pendingHeadlines, []);
  assert.equal(g.lastHeadline.id, "h01");
});

test("endTurn: gerrymander budget recomputed from solo majorities at next beginTurn", () => {
  let g = createGame({ players: P, seed: 1 });
  g.turn = { ...g.turn, phase: "actions", current: 0, draftRemaining: 0, firstTurn: true };
  const c = g.zones.find((z) => z.id === "central");
  c.lockedBy = 0;   // solo majority
  g = endTurn(g);
  // Should now be P1's turn; gerry budget is recomputed for P1, not P0. P1 has no majorities.
  assert.deepEqual(g.turn.gerrymanderMoves, {});
});
```

- [ ] **Step 2: Run to verify fail**

Run: `node --test tests/turn-lifecycle.test.js`
Expected: most fail.

- [ ] **Step 3: Implement multi-stage beginTurn/endTurn and helpers**

In `src/engine/actions.js`:
```javascript
import { RESOURCES, IDEOLOGIES, RESOURCE_OF } from "./constants.js";
import { soloMajorityZones } from "./rules.js";

const RESOURCE_CAP_VAL = 12;
const sumRes = (p) => RESOURCES.reduce((s, r) => s + (p.resources[r] || 0), 0);

function applyPassive(p) {
  for (const ide of IDEOLOGIES) {
    const n = Math.floor((p.piles[ide] || 0) / 2);
    if (n > 0) p.resources[RESOURCE_OF[ide]] += n;
  }
}

function computeGerryBudget(s, pid) {
  const out = {};
  const idealistL6 = (s.players[pid].piles.idealist || 0) >= 6;
  for (const z of soloMajorityZones(s, pid)) out[z.id] = idealistL6 ? 2 : 1;
  return out;
}

export function beginTurn(state) {
  const s = clone(state);
  const p = s.players[s.turn.current];
  p.usedThisTurn = {};
  s.lastHeadline = null;
  // Passive resources
  applyPassive(p);
  // Draw dilemma
  s.turn.pendingDilemma = s.decks.dilemmaDraw.shift();
  // Reset per-turn budgets
  s.turn.gerrymanderMoves = computeGerryBudget(s, p.id);
  s.turn.currentBuy = null;
  s.turn.pendingHeadlines = [];
  // Phase: readAloud → dilemma → discard? → placePending? → actions
  if (s.turn.firstTurn) {
    delete s.turn.firstTurn;
    s.turn.phase = "dilemma";
  } else {
    s.turn.phase = "readAloud";
  }
  return s;
}

export function doneReadAloud(state) {
  if (state.turn.phase !== "readAloud") throw new Error("not in readAloud");
  const s = clone(state); s.turn.phase = "dilemma"; return s;
}

// Existing answerDilemma updated to route into discard/placePending/actions
export function answerDilemma(state, { answerIndex }) {
  if (state.turn.phase !== "dilemma") throw new Error("not in dilemma phase");
  const s = clone(state);
  const p = s.players[s.turn.current];
  const card = DILEMMA_BY_ID[s.turn.pendingDilemma];
  const answer = card.answers[answerIndex];
  if (!answer) throw new Error("invalid answerIndex");
  for (const [r, n] of Object.entries(answer.payout)) p.resources[r] += n;
  p.piles[answer.ideology] += 1;
  s.decks.dilemmaDiscard.push(card.id);
  s.turn.pendingDilemma = null;
  // route to next phase
  if (sumRes(p) > RESOURCE_CAP_VAL) s.turn.phase = "discard";
  else if (p.pendingPlacements > 0) s.turn.phase = "placePending";
  else s.turn.phase = "actions";
  s.log.push(`${p.name} chose "${answer.label}"`);
  return s;
}

export function donePendingPlace(state) {
  // Convenience to force-end placePending without finishing — useful only when
  // the player has chosen to skip (forfeit). Discards remaining pending.
  if (state.turn.phase !== "placePending") throw new Error("not placePending");
  const s = clone(state);
  s.players[s.turn.current].pendingPlacements = 0;
  s.turn.phase = "actions";
  return s;
}

export function endTurn(state) {
  if (state.turn.phase !== "actions") throw new Error("end only in actions phase");
  let s = clone(state);
  // 1. Drain pending headlines
  while (s.turn.pendingHeadlines.length > 0) {
    if (s.decks.headlineDraw.length === 0) {
      s.decks.headlineDraw = shuffle(s.decks.headlineDiscard, makeRng(s.seed + s.log.length));
      s.decks.headlineDiscard = [];
    }
    const cardId = s.decks.headlineDraw.shift();
    const { playerId } = s.turn.pendingHeadlines.shift();
    const headline = HEADLINE_BY_ID[cardId];
    resolveHeadline(s, headline, playerId);
    s.decks.headlineDiscard.push(cardId);
    s.lastHeadline = { ...headline, player: playerId };
  }
  // 2. End game detection (covered in Task 2.8)
  if (isGameOver(s)) return finishGame(s);
  // 3. Advance to next player
  s.turn.current = (s.turn.current + 1) % s.players.length;
  return beginTurn(s);
}
```

(Imports: `makeRng`, `shuffle` from `./rng.js`; `HEADLINE_BY_ID` from `../data/headlines.js`; `resolveHeadline` from `./headlines.js`.)

- [ ] **Step 4: Run to verify pass**

Run: `node --test tests/turn-lifecycle.test.js`
Expected: 7/7 pass.

- [ ] **Step 5: Commit**

```bash
git add src/engine/actions.js tests/turn-lifecycle.test.js
git commit -m "feat(actions): multi-stage beginTurn (passive+readAloud) and headline-draining endTurn"
```

---

### Task 2.8: End game detection (all closed or all seats filled)

**Files:**
- Modify: `src/engine/actions.js`, `src/engine/rules.js`
- Create: `tests/endgame.test.js`

- [ ] **Step 1: Write failing tests**

Create `tests/endgame.test.js`:
```javascript
import { test } from "node:test";
import assert from "node:assert/strict";
import { createGame } from "../src/engine/state.js";
import { endTurn } from "../src/engine/actions.js";
import { isGameOver } from "../src/engine/rules.js";

const P = [{ name: "A", color: "#1" }, { name: "B", color: "#2" }];

test("isGameOver: true when every zone is closed (locked or coalition)", () => {
  const g = createGame({ players: P, seed: 1 });
  for (const z of g.zones) z.lockedBy = 0;
  assert.equal(isGameOver(g), true);
});

test("isGameOver: true when every seat is occupied (board full)", () => {
  const g = createGame({ players: P, seed: 1 });
  for (const z of g.zones) z.seats = z.seats.map(() => 0);
  assert.equal(isGameOver(g), true);
});

test("endTurn at game-over freezes phase=gameover and declares a winner", () => {
  let g = createGame({ players: P, seed: 1 });
  g.turn = { ...g.turn, phase: "actions", current: 0, draftRemaining: 0 };
  for (const z of g.zones) z.lockedBy = 0;
  // give P0 some flipped seats
  for (const z of g.zones) {
    z.seats = z.seats.map(() => 0);
    for (let i = 0; i < z.majority || i < 6; i++) z.flippedSeats[i] = true;
  }
  g = endTurn(g);
  assert.equal(g.turn.phase, "gameover");
  assert.equal(g.winner, 0);
});
```

- [ ] **Step 2: Run to verify fail**

Run: `node --test tests/endgame.test.js`
Expected: assertion mismatch / undefined exports.

- [ ] **Step 3: Implement**

Add to `src/engine/rules.js`:
```javascript
export const isGameOver = (state) =>
  state.zones.every((z) => z.lockedBy !== null || z.coalition !== null || isZoneFull(z));
```

Add to `src/engine/actions.js`:
```javascript
export function finishGame(state) {
  const s = clone(state);
  // winner = highest score, then voters
  const ranked = standings(s);
  s.winner = ranked[0].playerId;
  s.turn.phase = "gameover";
  s.log.push(`Game over — winner is ${s.players[s.winner].name}`);
  return s;
}
```

(Import `standings` from `./rules.js`.)

- [ ] **Step 4: Run to verify pass**

Run: `node --test tests/endgame.test.js`
Expected: 3/3 pass.

- [ ] **Step 5: Commit**

```bash
git add src/engine/actions.js src/engine/rules.js tests/endgame.test.js
git commit -m "feat(rules): end game on closed-or-full; winner by flipped score"
```

---

## Phase 3: Ideologue powers

### Task 3.1: `powers.js` skeleton + unlock helpers

**Files:**
- Create: `src/engine/powers.js`
- Modify: delete `src/engine/archetypes.js` (its references go away in this phase)
- Create: `tests/powers.test.js`

- [ ] **Step 1: Write failing tests**

Create `tests/powers.test.js`:
```javascript
import { test } from "node:test";
import assert from "node:assert/strict";
import { createGame } from "../src/engine/state.js";
import { passiveFor, level, POWERS } from "../src/engine/powers.js";

const P = [{ name: "A", color: "#1" }, { name: "B", color: "#2" }];

test("passiveFor: 1 resource per 2 ideology cards of that type", () => {
  assert.equal(passiveFor(0), 0);
  assert.equal(passiveFor(1), 0);
  assert.equal(passiveFor(2), 1);
  assert.equal(passiveFor(5), 2);
  assert.equal(passiveFor(6), 3);
});

test("level: returns 0, 4, or 6 by pile size", () => {
  assert.equal(level(0), 0);
  assert.equal(level(3), 0);
  assert.equal(level(4), 4);
  assert.equal(level(5), 4);
  assert.equal(level(6), 6);
});

test("POWERS: 4 ideologies × (L4, L6) defined", () => {
  for (const ide of ["capitalist","supremo","showman","idealist"]) {
    assert.ok(POWERS[ide].l4 && POWERS[ide].l4.name);
    assert.ok(POWERS[ide].l6 && POWERS[ide].l6.name);
  }
});
```

- [ ] **Step 2: Run to verify fail**

Run: `node --test tests/powers.test.js`
Expected: module not found.

- [ ] **Step 3: Create `src/engine/powers.js`**

```javascript
export const passiveFor = (n) => Math.floor(n / 2);
export const level = (n) => (n >= 6 ? 6 : n >= 4 ? 4 : 0);

export const POWERS = {
  capitalist: {
    l4: { name: "Open Market", text: "Return 1 resource to the Public Reserve and take any 2." },
    l6: { name: "Land Grab",   text: "Evict up to 2 non-volatile voters; opponent voters return to hand." }
  },
  supremo: {
    l4: { name: "Donations",   text: "Snatch up to 2 resources from other players." },
    l6: { name: "Civil Disobedience", text: "Pay 1 resource per voter to discard up to 2 opponent voters." }
  },
  showman: {
    l4: { name: "Echo Chamber",     text: "+1 voter per unique Vote Bank Card you influence (cap 3)." },
    l6: { name: "Targeted Marketing", text: "Spend 2 Media + any 3 to convert 2 of an opponent's voters in one zone." }
  },
  idealist: {
    l4: { name: "Blind Faith",       text: "Waive the marked resource on up to 3 Vote Bank Cards/turn." },
    l6: { name: "Mass Mobilisation", text: "Each majority yields 2 gerrymander moves/turn instead of 1." }
  }
};
```

- [ ] **Step 4: Delete archetypes.js (now unused)**

```bash
git rm src/engine/archetypes.js
```

- [ ] **Step 5: Run to verify pass**

Run: `node --test tests/powers.test.js`
Expected: 3/3 pass.

- [ ] **Step 6: Commit**

```bash
git add src/engine/powers.js tests/powers.test.js
git commit -m "feat(powers): 2-level + passive scaffolding; remove archetypes.js"
```

---

### Task 3.2: `openMarket` (Capitalist L4)

**Files:**
- Modify: `src/engine/actions.js`
- Test: `tests/powers.test.js` (extend)

- [ ] **Step 1: Write failing test**

Append to `tests/powers.test.js`:
```javascript
import { openMarket } from "../src/engine/actions.js";

test("openMarket: pay 1 resource, take any 2; rejects without L4; once per turn", () => {
  let g = createGame({ players: P, seed: 1 });
  g.turn = { ...g.turn, phase: "actions", current: 0 };
  g.players[0].piles.capitalist = 4;
  g.players[0].resources = { funds: 1, clout: 0, media: 0, trust: 0 };
  g = openMarket(g, { give: "funds", take: ["media", "trust"] });
  assert.equal(g.players[0].resources.funds, 0);
  assert.equal(g.players[0].resources.media, 1);
  assert.equal(g.players[0].resources.trust, 1);
  assert.throws(() => openMarket(g, { give: "media", take: ["funds", "funds"] }), /already used/i);
});
```

- [ ] **Step 2: Run to verify fail**

Run: `node --test tests/powers.test.js`
Expected: fail.

- [ ] **Step 3: Implement**

```javascript
export function openMarket(state, { give, take }) {
  if (state.turn.phase !== "actions") throw new Error("powers only in actions phase");
  const s = clone(state);
  const p = s.players[s.turn.current];
  if ((p.piles.capitalist || 0) < 4) throw new Error("requires Capitalist L4");
  if (p.usedThisTurn.openMarket) throw new Error("Open Market already used this turn");
  if (!RESOURCES.includes(give) || (p.resources[give] || 0) < 1)
    throw new Error("invalid give resource");
  if (!Array.isArray(take) || take.length !== 2 || !take.every((r) => RESOURCES.includes(r)))
    throw new Error("must take exactly 2 valid resources");
  p.resources[give] -= 1;
  for (const r of take) p.resources[r] += 1;
  p.usedThisTurn.openMarket = true;
  s.log.push(`${p.name} Open Market: 1 ${give} → ${take.join("+")}`);
  return s;
}
```

- [ ] **Step 4: Run to verify pass**

Run: `node --test tests/powers.test.js`
Expected: pass.

- [ ] **Step 5: Commit**

```bash
git add src/engine/actions.js tests/powers.test.js
git commit -m "feat(powers): openMarket (Capitalist L4)"
```

---

### Task 3.3: `landGrab` (Capitalist L6) + pendingPlacements

**Files:**
- Modify: `src/engine/actions.js`
- Test: `tests/powers.test.js` (extend)

- [ ] **Step 1: Write failing tests**

Append to `tests/powers.test.js`:
```javascript
import { landGrab } from "../src/engine/actions.js";

test("landGrab: evicts up to 2 non-volatile voters; opponent goes to pendingPlacements", () => {
  let g = createGame({ players: P, seed: 1 });
  g.turn = { ...g.turn, phase: "actions", current: 0 };
  g.players[0].piles.capitalist = 6;
  const c = g.zones.find((z) => z.id === "central");
  c.seats[0] = 1;  // opponent at non-volatile slot
  const next = landGrab(g, { targets: [{ zoneId: "central", seatIndex: 0 }] });
  assert.equal(next.zones.find((z) => z.id === "central").seats[0], null);
  assert.equal(next.players[1].pendingPlacements, 1);
});

test("landGrab: own evictions can be placed back in same action via replaceOwn", () => {
  let g = createGame({ players: P, seed: 1 });
  g.turn = { ...g.turn, phase: "actions", current: 0 };
  g.players[0].piles.capitalist = 6;
  const c = g.zones.find((z) => z.id === "central");
  c.seats[0] = 0;   // own voter
  const next = landGrab(g, {
    targets: [{ zoneId: "central", seatIndex: 0 }],
    replaceOwn: [{ zoneId: "north", seatIndex: 0 }]
  });
  assert.equal(next.zones.find((z) => z.id === "central").seats[0], null);
  assert.equal(next.zones.find((z) => z.id === "north").seats[0], 0);
  assert.equal(next.players[0].pendingPlacements, 0);
});

test("landGrab: rejects volatile targets", () => {
  let g = createGame({ players: P, seed: 1 });
  g.turn = { ...g.turn, phase: "actions", current: 0 };
  g.players[0].piles.capitalist = 6;
  const c = g.zones.find((z) => z.id === "central");
  const vol = c.volatileSeats[0];
  c.seats[vol] = 1;
  assert.throws(() => landGrab(g, { targets: [{ zoneId: "central", seatIndex: vol }] }), /volatile/i);
});
```

- [ ] **Step 2: Run to verify fail**

Run: `node --test tests/powers.test.js`
Expected: 3 fail.

- [ ] **Step 3: Implement**

```javascript
export function landGrab(state, { targets, replaceOwn = [] }) {
  if (state.turn.phase !== "actions") throw new Error("powers only in actions phase");
  const s = clone(state);
  const p = s.players[s.turn.current];
  if ((p.piles.capitalist || 0) < 6) throw new Error("requires Capitalist L6");
  if (p.usedThisTurn.landGrab) throw new Error("Land Grab already used this turn");
  if (targets.length === 0 || targets.length > 2) throw new Error("evict 1 or 2 voters");
  const ownEvicted = [];
  for (const t of targets) {
    const z = s.zones.find((x) => x.id === t.zoneId);
    if (!z) throw new Error("no such zone");
    if (z.volatileSeats.includes(t.seatIndex)) throw new Error("cannot evict volatile voter");
    const owner = z.seats[t.seatIndex];
    if (owner == null) throw new Error("no voter to evict");
    z.seats[t.seatIndex] = null;
    // If the evicted voter was flipped, unflip and (if their majority breaks) unlock.
    if (z.flippedSeats[t.seatIndex]) {
      z.flippedSeats[t.seatIndex] = false;
      if (z.lockedBy === owner && voteCount(z, owner) < majorityThreshold(z.id)) {
        z.flippedSeats = z.flippedSeats.map(() => false);
        z.lockedBy = null;
      }
    }
    if (owner === p.id) ownEvicted.push({ zoneId: t.zoneId });
    else s.players[owner].pendingPlacements += 1;
  }
  // Replace own evictions immediately.
  if (replaceOwn.length !== ownEvicted.length)
    throw new Error("replaceOwn must match own evicted count");
  for (const r of replaceOwn) {
    const z = s.zones.find((x) => x.id === r.zoneId);
    if (!z) throw new Error("no such zone");
    if (z.lockedBy !== null || z.coalition !== null) throw new Error("zone closed");
    if (z.seats[r.seatIndex] != null) throw new Error("seat occupied");
    z.seats[r.seatIndex] = p.id;
    if (z.volatileSeats.includes(r.seatIndex))
      s.turn.pendingHeadlines.push({ zoneId: r.zoneId, playerId: p.id });
    flipMajorityIfReached(s, z, p.id);
  }
  p.usedThisTurn.landGrab = true;
  s.log.push(`${p.name} Land Grab evicted ${targets.length} voter(s)`);
  return s;
}
```

- [ ] **Step 4: Run to verify pass**

Run: `node --test tests/powers.test.js`
Expected: 6/6 pass total.

- [ ] **Step 5: Commit**

```bash
git add src/engine/actions.js tests/powers.test.js
git commit -m "feat(powers): landGrab + pendingPlacements (Capitalist L6)"
```

---

### Task 3.4: `targetedMarketing` (Showman L6)

**Files:** modify `src/engine/actions.js`; extend `tests/powers.test.js`.

- [ ] **Step 1: Write failing test**

```javascript
import { targetedMarketing } from "../src/engine/actions.js";

test("targetedMarketing: pay 2 media + 3 any, convert 2 opponent voters in same zone", () => {
  let g = createGame({ players: P, seed: 1 });
  g.turn = { ...g.turn, phase: "actions", current: 0 };
  g.players[0].piles.showman = 6;
  g.players[0].resources = { funds: 3, clout: 0, media: 2, trust: 0 };
  const c = g.zones.find((z) => z.id === "central");
  c.seats[0] = 1; c.seats[1] = 1;
  const next = targetedMarketing(g, {
    zoneId: "central", opponentId: 1, seatIndices: [0, 1],
    pay: { media: 2, funds: 3 }
  });
  assert.equal(next.zones.find((z) => z.id === "central").seats[0], 0);
  assert.equal(next.zones.find((z) => z.id === "central").seats[1], 0);
  assert.equal(next.players[0].resources.media, 0);
  assert.equal(next.players[0].resources.funds, 0);
});

test("targetedMarketing: rejects volatile seat targets", () => {
  let g = createGame({ players: P, seed: 1 });
  g.turn = { ...g.turn, phase: "actions", current: 0 };
  g.players[0].piles.showman = 6;
  g.players[0].resources = { media: 2, funds: 3, clout: 0, trust: 0 };
  const c = g.zones.find((z) => z.id === "central");
  const vol = c.volatileSeats[0];
  c.seats[vol] = 1; c.seats[0] = 1;
  assert.throws(() => targetedMarketing(g, {
    zoneId: "central", opponentId: 1, seatIndices: [vol, 0],
    pay: { media: 2, funds: 3 }
  }), /volatile/i);
});
```

- [ ] **Step 2: Run to verify fail**

Run: `node --test tests/powers.test.js`
Expected: 2 fail.

- [ ] **Step 3: Implement**

```javascript
export function targetedMarketing(state, { zoneId, opponentId, seatIndices, pay }) {
  if (state.turn.phase !== "actions") throw new Error("powers only in actions phase");
  const s = clone(state);
  const p = s.players[s.turn.current];
  if ((p.piles.showman || 0) < 6) throw new Error("requires Showman L6");
  if (p.usedThisTurn.targetedMarketing) throw new Error("Targeted Marketing already used");
  if (!seatIndices || seatIndices.length !== 2) throw new Error("must target exactly 2 seats");
  if (opponentId === p.id) throw new Error("must target an opponent");
  if ((pay.media || 0) < 2) throw new Error("must spend 2 media");
  const totalPay = Object.values(pay).reduce((sum, n) => sum + n, 0);
  if (totalPay < 5) throw new Error("must spend 2 media + 3 any (5 total)");
  if (!canAffordCost(p, pay)) throw new Error("cannot afford cost");
  for (const [r, n] of Object.entries(pay)) p.resources[r] -= n;
  const z = s.zones.find((x) => x.id === zoneId);
  if (!z) throw new Error("no such zone");
  for (const idx of seatIndices) {
    if (z.seats[idx] !== opponentId) throw new Error("target not opponent's voter");
    if (z.volatileSeats.includes(idx)) throw new Error("voter on volatile seat is immune");
    z.seats[idx] = p.id;
    // If the converted seat was flipped, the flip transfers (still counts for the new owner).
  }
  // Recompute majority for both parties
  if (z.lockedBy === opponentId && voteCount(z, opponentId) < majorityThreshold(z.id)) {
    z.flippedSeats = z.flippedSeats.map(() => false);
    z.lockedBy = null;
  }
  flipMajorityIfReached(s, z, p.id);
  p.usedThisTurn.targetedMarketing = true;
  s.log.push(`${p.name} Targeted Marketing in ${zoneId}`);
  return s;
}
```

- [ ] **Step 4: Run to verify pass**

Run: `node --test tests/powers.test.js`
Expected: pass.

- [ ] **Step 5: Commit**

```bash
git add src/engine/actions.js tests/powers.test.js
git commit -m "feat(powers): targetedMarketing (Showman L6)"
```

---

### Task 3.5: `donations` (Supremo L4) and `civilDisobedience` (Supremo L6)

**Files:** modify `src/engine/actions.js`; extend `tests/powers.test.js`.

- [ ] **Step 1: Write failing tests**

```javascript
import { donations, civilDisobedience } from "../src/engine/actions.js";

test("donations: snatch up to 2 resources from other players, free, once per turn", () => {
  let g = createGame({ players: P, seed: 1 });
  g.turn = { ...g.turn, phase: "actions", current: 0 };
  g.players[0].piles.supremo = 4;
  g.players[1].resources = { funds: 5, clout: 0, media: 0, trust: 0 };
  const next = donations(g, { takes: [{ from: 1, resource: "funds", count: 2 }] });
  assert.equal(next.players[1].resources.funds, 3);
  assert.equal(next.players[0].resources.funds, 2);
  assert.throws(() => donations(next, { takes: [{ from: 1, resource: "funds", count: 1 }] }), /already used/i);
});

test("civilDisobedience: pay 1 per voter; discard up to 2 opponent non-volatile voters", () => {
  let g = createGame({ players: P, seed: 1 });
  g.turn = { ...g.turn, phase: "actions", current: 0 };
  g.players[0].piles.supremo = 6;
  g.players[0].resources = { funds: 2, clout: 0, media: 0, trust: 0 };
  const c = g.zones.find((z) => z.id === "central");
  c.seats[0] = 1; c.seats[1] = 1;
  const next = civilDisobedience(g, {
    targets: [{ zoneId: "central", seatIndex: 0 }, { zoneId: "central", seatIndex: 1 }],
    pay: { funds: 2 }
  });
  assert.equal(next.zones.find((z) => z.id === "central").seats[0], null);
  assert.equal(next.zones.find((z) => z.id === "central").seats[1], null);
  assert.equal(next.players[0].resources.funds, 0);
});
```

- [ ] **Step 2: Run to verify fail**

Run: `node --test tests/powers.test.js`
Expected: 2 fail.

- [ ] **Step 3: Implement**

```javascript
export function donations(state, { takes }) {
  if (state.turn.phase !== "actions") throw new Error("powers only in actions phase");
  const s = clone(state);
  const p = s.players[s.turn.current];
  if ((p.piles.supremo || 0) < 4) throw new Error("requires Supremo L4");
  if (p.usedThisTurn.donations) throw new Error("Donations already used");
  const totalTake = takes.reduce((sum, t) => sum + t.count, 0);
  if (totalTake === 0 || totalTake > 2) throw new Error("snatch 1 or 2 total");
  for (const t of takes) {
    const victim = s.players[t.from];
    if (!victim || victim.id === p.id) throw new Error("invalid target");
    if (!RESOURCES.includes(t.resource)) throw new Error("invalid resource");
    if ((victim.resources[t.resource] || 0) < t.count) throw new Error("victim lacks resource");
    victim.resources[t.resource] -= t.count;
    p.resources[t.resource] += t.count;
  }
  p.usedThisTurn.donations = true;
  s.log.push(`${p.name} Donations snatched ${totalTake} resource(s)`);
  return s;
}

export function civilDisobedience(state, { targets, pay }) {
  if (state.turn.phase !== "actions") throw new Error("powers only in actions phase");
  const s = clone(state);
  const p = s.players[s.turn.current];
  if ((p.piles.supremo || 0) < 6) throw new Error("requires Supremo L6");
  if (p.usedThisTurn.civilDisobedience) throw new Error("Civil Disobedience already used");
  if (targets.length === 0 || targets.length > 2) throw new Error("discard 1 or 2 voters");
  const totalPay = Object.values(pay).reduce((sum, n) => sum + n, 0);
  if (totalPay !== targets.length) throw new Error("must pay 1 resource per voter");
  if (!canAffordCost(p, pay)) throw new Error("cannot afford");
  for (const [r, n] of Object.entries(pay)) p.resources[r] -= n;
  for (const t of targets) {
    const z = s.zones.find((x) => x.id === t.zoneId);
    if (!z) throw new Error("no such zone");
    if (z.volatileSeats.includes(t.seatIndex)) throw new Error("voter on volatile seat immune");
    const owner = z.seats[t.seatIndex];
    if (owner == null || owner === p.id) throw new Error("must discard an opponent voter");
    z.seats[t.seatIndex] = null;
    if (z.flippedSeats[t.seatIndex]) {
      z.flippedSeats[t.seatIndex] = false;
      if (z.lockedBy === owner && voteCount(z, owner) < majorityThreshold(z.id)) {
        z.flippedSeats = z.flippedSeats.map(() => false);
        z.lockedBy = null;
      }
    }
  }
  p.usedThisTurn.civilDisobedience = true;
  s.log.push(`${p.name} Civil Disobedience discarded ${targets.length} voter(s)`);
  return s;
}
```

- [ ] **Step 4: Run to verify pass**

Run: `node --test tests/powers.test.js`
Expected: pass.

- [ ] **Step 5: Commit**

```bash
git add src/engine/actions.js tests/powers.test.js
git commit -m "feat(powers): donations + civilDisobedience (Supremo L4/L6)"
```

---

### Task 3.6: Mass Mobilisation (Idealist L6) — already wired in `computeGerryBudget`

**Files:** test only.

- [ ] **Step 1: Write the test**

```javascript
test("Mass Mobilisation: Idealist L6 doubles gerrymander moves per majority", () => {
  let g = createGame({ players: P, seed: 1 });
  g.turn = { ...g.turn, phase: "actions", current: 0, draftRemaining: 0, firstTurn: true };
  g.players[0].piles.idealist = 6;
  g.zones.find((z) => z.id === "central").lockedBy = 0;
  g.zones.find((z) => z.id === "north").lockedBy = 0;
  g = beginTurn(g);
  // After beginTurn rolls into dilemma, gerry budget set from solo majorities
  assert.equal(g.turn.gerrymanderMoves.central, 2);
  assert.equal(g.turn.gerrymanderMoves.north, 2);
});
```

- [ ] **Step 2: Run to verify pass**

Run: `node --test tests/powers.test.js`
Expected: pass (no impl needed; covered by `computeGerryBudget`).

- [ ] **Step 3: Commit**

```bash
git add tests/powers.test.js
git commit -m "test(powers): Mass Mobilisation budget assertion"
```

---

## Phase 4: Coalitions & trading

### Task 4.1: `proposeTrade` / `respondTrade`

**Files:**
- Create: `src/engine/trade.js`
- Modify: `src/engine/actions.js` (export wrappers)
- Create: `tests/trade.test.js`

- [ ] **Step 1: Write failing tests**

Create `tests/trade.test.js`:
```javascript
import { test } from "node:test";
import assert from "node:assert/strict";
import { createGame } from "../src/engine/state.js";
import { proposeTrade, respondTrade } from "../src/engine/actions.js";

const P = [{ name: "A", color: "#1" }, { name: "B", color: "#2" }];

test("proposeTrade: equitable swap recorded as pendingProposal; phase=tradeAccept", () => {
  let g = createGame({ players: P, seed: 1 });
  g.turn = { ...g.turn, phase: "actions", current: 0 };
  g.players[0].resources = { funds: 2, clout: 0, media: 0, trust: 0 };
  g.players[1].resources = { funds: 0, clout: 2, media: 0, trust: 0 };
  g = proposeTrade(g, {
    to: 1,
    give: { resources: { funds: 1 } },
    receive: { resources: { clout: 1 } }
  });
  assert.equal(g.turn.phase, "tradeAccept");
  assert.equal(g.turn.pendingProposal.kind, "trade");
});

test("respondTrade(accept): resources swap and pendingProposal clears", () => {
  let g = createGame({ players: P, seed: 1 });
  g.turn = { ...g.turn, phase: "actions", current: 0 };
  g.players[0].resources = { funds: 2, clout: 0, media: 0, trust: 0 };
  g.players[1].resources = { funds: 0, clout: 2, media: 0, trust: 0 };
  g = proposeTrade(g, { to: 1, give: { resources: { funds: 1 } }, receive: { resources: { clout: 1 } } });
  g = respondTrade(g, { accept: true });
  assert.equal(g.players[0].resources.funds, 1);
  assert.equal(g.players[0].resources.clout, 1);
  assert.equal(g.players[1].resources.funds, 1);
  assert.equal(g.players[1].resources.clout, 1);
  assert.equal(g.turn.phase, "actions");
  assert.equal(g.turn.pendingProposal, null);
});

test("respondTrade(decline): nothing changes", () => {
  let g = createGame({ players: P, seed: 1 });
  g.turn = { ...g.turn, phase: "actions", current: 0 };
  g.players[0].resources = { funds: 2, clout: 0, media: 0, trust: 0 };
  g.players[1].resources = { funds: 0, clout: 2, media: 0, trust: 0 };
  g = proposeTrade(g, { to: 1, give: { resources: { funds: 1 } }, receive: { resources: { clout: 1 } } });
  g = respondTrade(g, { accept: false });
  assert.equal(g.players[0].resources.funds, 2);
  assert.equal(g.turn.phase, "actions");
});

test("proposeTrade: rejects non-equitable swap", () => {
  let g = createGame({ players: P, seed: 1 });
  g.turn = { ...g.turn, phase: "actions", current: 0 };
  g.players[0].resources = { funds: 3, clout: 0, media: 0, trust: 0 };
  g.players[1].resources = { funds: 0, clout: 1, media: 0, trust: 0 };
  assert.throws(() => proposeTrade(g, {
    to: 1, give: { resources: { funds: 2 } }, receive: { resources: { clout: 1 } }
  }), /equitable/i);
});
```

- [ ] **Step 2: Run to verify fail**

Run: `node --test tests/trade.test.js`
Expected: imports fail.

- [ ] **Step 3: Create `src/engine/trade.js`**

```javascript
import { clone } from "./state.js";
import { RESOURCES } from "./constants.js";

const sumGroup = (g) => {
  let n = 0;
  if (g.resources) for (const r of RESOURCES) n += (g.resources[r] || 0);
  if (g.cardIds) n += g.cardIds.length;
  return n;
};

export function proposeTrade(state, { to, give, receive }) {
  if (state.turn.phase !== "actions") throw new Error("trade only in actions phase");
  if (state.turn.pendingProposal) throw new Error("a proposal is already in flight");
  if (sumGroup(give) === 0 || sumGroup(give) !== sumGroup(receive))
    throw new Error("trade must be equitable (matching counts)");
  const from = state.turn.current;
  if (to === from) throw new Error("cannot trade with yourself");
  // Sanity: proposer must own the things they offer
  const p = state.players[from];
  if (give.resources) for (const r of RESOURCES) {
    if ((p.resources[r] || 0) < (give.resources[r] || 0))
      throw new Error("you don't have enough " + r);
  }
  if (give.cardIds) for (const id of give.cardIds) {
    if (!p.hand.includes(id)) throw new Error("you don't hold card " + id);
  }
  const s = clone(state);
  s.turn.phase = "tradeAccept";
  s.turn.pendingProposal = { kind: "trade", from, to, give, receive };
  return s;
}

export function respondTrade(state, { accept }) {
  if (state.turn.phase !== "tradeAccept") throw new Error("no trade awaiting response");
  const prop = state.turn.pendingProposal;
  if (!prop || prop.kind !== "trade") throw new Error("no pending trade");
  const s = clone(state);
  if (accept) {
    const from = s.players[prop.from], to = s.players[prop.to];
    // Recheck partner can deliver
    if (prop.receive.resources) for (const r of RESOURCES) {
      if ((to.resources[r] || 0) < (prop.receive.resources[r] || 0))
        throw new Error("partner lacks " + r);
    }
    if (prop.receive.cardIds) for (const id of prop.receive.cardIds) {
      if (!to.hand.includes(id)) throw new Error("partner lacks card " + id);
    }
    // Apply
    if (prop.give.resources) for (const r of RESOURCES) {
      from.resources[r] -= (prop.give.resources[r] || 0);
      to.resources[r] += (prop.give.resources[r] || 0);
    }
    if (prop.receive.resources) for (const r of RESOURCES) {
      to.resources[r] -= (prop.receive.resources[r] || 0);
      from.resources[r] += (prop.receive.resources[r] || 0);
    }
    if (prop.give.cardIds) for (const id of prop.give.cardIds) {
      from.hand.splice(from.hand.indexOf(id), 1);
      to.hand.push(id);
    }
    if (prop.receive.cardIds) for (const id of prop.receive.cardIds) {
      to.hand.splice(to.hand.indexOf(id), 1);
      from.hand.push(id);
    }
    s.log.push(`${from.name} ↔ ${to.name} traded`);
  } else {
    s.log.push(`${s.players[prop.to].name} declined the trade`);
  }
  s.turn.phase = "actions";
  s.turn.pendingProposal = null;
  return s;
}
```

Then re-export from `actions.js`:
```javascript
export { proposeTrade, respondTrade } from "./trade.js";
```

- [ ] **Step 4: Run to verify pass**

Run: `node --test tests/trade.test.js`
Expected: 4/4 pass.

- [ ] **Step 5: Commit**

```bash
git add src/engine/trade.js src/engine/actions.js tests/trade.test.js
git commit -m "feat(trade): proposeTrade + respondTrade for equitable resource/card swaps"
```

---

### Task 4.2: `proposeCoalition` / `respondCoalition`

**Files:**
- Create: `src/engine/coalitions.js`
- Modify: `src/engine/actions.js` (re-export)
- Create: `tests/coalitions.test.js`

- [ ] **Step 1: Write failing tests**

Create `tests/coalitions.test.js`:
```javascript
import { test } from "node:test";
import assert from "node:assert/strict";
import { createGame } from "../src/engine/state.js";
import { proposeCoalition, respondCoalition, withdrawCoalition } from "../src/engine/actions.js";

const P = [{ name: "A", color: "#1" }, { name: "B", color: "#2" }];

function preLocked(g, zoneId, p0count, p1count) {
  const z = g.zones.find((x) => x.id === zoneId);
  for (let i = 0; i < p0count; i++) z.seats[i] = 0;
  for (let i = 0; i < p1count; i++) z.seats[p0count + i] = 1;
  return g;
}

test("proposeCoalition: records pendingProposal; phase=coalitionAccept", () => {
  let g = createGame({ players: P, seed: 1 });
  g.turn = { ...g.turn, phase: "actions", current: 0 };
  preLocked(g, "ne", 3, 3);   // ne majority=6
  g.players[0].piles.capitalist = 2;  // most-held pile is capitalist
  g = proposeCoalition(g, {
    to: 1, zoneId: "ne",
    split: { 0: 3, 1: 3 },
    myCardId: "d_cap_1"   // assume present in pile (engine tracks just counts; ok for this test)
  });
  assert.equal(g.turn.phase, "coalitionAccept");
  assert.equal(g.turn.pendingProposal.kind, "coalition");
});

test("respondCoalition(accept): flips split, swaps cards, marks zone.coalition, no gerry", () => {
  let g = createGame({ players: P, seed: 1 });
  g.turn = { ...g.turn, phase: "actions", current: 0 };
  preLocked(g, "ne", 3, 3);
  g.players[0].piles.capitalist = 2;
  g.players[1].piles.supremo = 2;
  g = proposeCoalition(g, {
    to: 1, zoneId: "ne", split: { 0: 3, 1: 3 }, myCardId: "capitalist"
  });
  g = respondCoalition(g, { accept: true, partnerCardId: "supremo" });
  const ne = g.zones.find((z) => z.id === "ne");
  assert.ok(ne.coalition);
  assert.deepEqual(ne.coalition.partners.sort(), [0, 1]);
  assert.equal(ne.flippedSeats.filter(Boolean).length, 6);
  // each player traded one card of their most-held pile
  assert.equal(g.players[0].piles.capitalist, 1);
  assert.equal(g.players[0].piles.supremo, 1);
  assert.equal(g.players[1].piles.supremo, 1);
  assert.equal(g.players[1].piles.capitalist, 1);
});

test("respondCoalition: rejects cards not from most-held ideology", () => {
  let g = createGame({ players: P, seed: 1 });
  g.turn = { ...g.turn, phase: "actions", current: 0 };
  preLocked(g, "ne", 3, 3);
  g.players[0].piles.capitalist = 3;     // most-held
  g.players[1].piles.supremo = 1; g.players[1].piles.showman = 3;  // most-held: showman
  g = proposeCoalition(g, {
    to: 1, zoneId: "ne", split: { 0: 3, 1: 3 }, myCardId: "capitalist"
  });
  assert.throws(() => respondCoalition(g, { accept: true, partnerCardId: "supremo" }),
    /most-held/i);
});

test("withdrawCoalition: clears coalition, unflips withdrawer's seats; cards stay swapped", () => {
  let g = createGame({ players: P, seed: 1 });
  g.turn = { ...g.turn, phase: "actions", current: 0 };
  preLocked(g, "ne", 3, 3);
  g.players[0].piles.capitalist = 2;
  g.players[1].piles.supremo = 2;
  g = proposeCoalition(g, { to: 1, zoneId: "ne", split: { 0: 3, 1: 3 }, myCardId: "capitalist" });
  g = respondCoalition(g, { accept: true, partnerCardId: "supremo" });
  g = withdrawCoalition(g, { zoneId: "ne" });
  const ne = g.zones.find((z) => z.id === "ne");
  assert.equal(ne.coalition, null);
  // Withdrawer (current = 0) loses their flips; partner keeps theirs (no solo majority though)
  assert.equal(ne.lockedBy, null);   // not enough voters alone
  // Cards stay swapped
  assert.equal(g.players[0].piles.supremo, 1);
  assert.equal(g.players[1].piles.capitalist, 1);
});
```

- [ ] **Step 2: Run to verify fail**

Run: `node --test tests/coalitions.test.js`
Expected: fail.

- [ ] **Step 3: Create `src/engine/coalitions.js`**

```javascript
import { clone } from "./state.js";
import { IDEOLOGIES } from "./constants.js";
import { majorityThreshold, voteCount } from "./rules.js";

function mostHeldPiles(p) {
  const max = Math.max(...IDEOLOGIES.map((i) => p.piles[i] || 0));
  if (max === 0) return [];
  return IDEOLOGIES.filter((i) => (p.piles[i] || 0) === max);
}

export function proposeCoalition(state, { to, zoneId, split, myCardId }) {
  if (state.turn.phase !== "actions") throw new Error("coalition only in actions phase");
  if (state.turn.pendingProposal) throw new Error("a proposal is already in flight");
  const from = state.turn.current;
  if (to === from) throw new Error("cannot coalition with yourself");
  const z = state.zones.find((x) => x.id === zoneId);
  if (!z || z.lockedBy !== null || z.coalition !== null) throw new Error("zone not eligible");
  if (voteCount(z, from) === 0 || voteCount(z, to) === 0)
    throw new Error("both players must have voters in the zone");
  const need = majorityThreshold(zoneId);
  const total = (split[from] || 0) + (split[to] || 0);
  if (total < need) throw new Error("split must sum to at least the majority threshold");
  if ((split[from] || 0) > voteCount(z, from)) throw new Error("you don't have that many voters");
  if ((split[to] || 0) > voteCount(z, to)) throw new Error("partner doesn't have that many voters");
  if (voteCount(z, from) >= need) throw new Error("you already meet threshold alone");
  // Card validation: must be from proposer's most-held pile.
  const allowed = mostHeldPiles(state.players[from]);
  if (!allowed.includes(myCardId)) throw new Error("must offer a card from your most-held ideology");
  const s = clone(state);
  s.turn.phase = "coalitionAccept";
  s.turn.pendingProposal = { kind: "coalition", from, to, zoneId, split: { ...split }, myCardId };
  return s;
}

export function respondCoalition(state, { accept, partnerCardId }) {
  if (state.turn.phase !== "coalitionAccept") throw new Error("no coalition awaiting response");
  const prop = state.turn.pendingProposal;
  if (!prop || prop.kind !== "coalition") throw new Error("no pending coalition");
  const s = clone(state);
  if (accept) {
    const allowed = mostHeldPiles(s.players[prop.to]);
    if (!allowed.includes(partnerCardId))
      throw new Error("partner must give a card from their most-held ideology");
    const z = s.zones.find((x) => x.id === prop.zoneId);
    // Flip exactly split[pid] of each player's voters
    for (const pid of [prop.from, prop.to]) {
      let flipped = 0;
      const need = prop.split[pid] || 0;
      for (let i = 0; i < z.seats.length && flipped < need; i++) {
        if (z.seats[i] === pid && !z.flippedSeats[i]) {
          z.flippedSeats[i] = true;
          flipped++;
        }
      }
    }
    z.coalition = { partners: [prop.from, prop.to], split: { ...prop.split } };
    // Swap cards
    s.players[prop.from].piles[prop.myCardId] -= 1;
    s.players[prop.from].piles[partnerCardId] += 1;
    s.players[prop.to].piles[partnerCardId] -= 1;
    s.players[prop.to].piles[prop.myCardId] += 1;
    s.log.push(`Coalition formed in ${prop.zoneId}: ${s.players[prop.from].name} + ${s.players[prop.to].name}`);
  } else {
    s.log.push(`${s.players[prop.to].name} declined the coalition`);
  }
  s.turn.phase = "actions";
  s.turn.pendingProposal = null;
  return s;
}

export function withdrawCoalition(state, { zoneId }) {
  if (state.turn.phase !== "actions") throw new Error("withdraw only in actions phase");
  const z = state.zones.find((x) => x.id === zoneId);
  if (!z || !z.coalition) throw new Error("no coalition in that zone");
  const withdrawer = state.turn.current;
  if (!z.coalition.partners.includes(withdrawer)) throw new Error("you are not in this coalition");
  const s = clone(state);
  const wz = s.zones.find((x) => x.id === zoneId);
  // Unflip withdrawer's seats
  for (let i = 0; i < wz.seats.length; i++) {
    if (wz.seats[i] === withdrawer) wz.flippedSeats[i] = false;
  }
  const remaining = wz.coalition.partners.find((p) => p !== withdrawer);
  wz.coalition = null;
  // If remaining partner alone meets threshold, lock solo to them.
  const need = majorityThreshold(zoneId);
  if (voteCount(wz, remaining) >= need) {
    // ensure flippedSeats are exactly `need` for remaining, earliest first
    let flipped = 0;
    for (let i = 0; i < wz.seats.length; i++) {
      if (wz.seats[i] === remaining) {
        if (flipped < need) { wz.flippedSeats[i] = true; flipped++; }
        else wz.flippedSeats[i] = false;
      }
    }
    wz.lockedBy = remaining;
  }
  s.log.push(`${s.players[withdrawer].name} withdrew from ${zoneId} coalition`);
  return s;
}
```

Re-export from `actions.js`:
```javascript
export { proposeCoalition, respondCoalition, withdrawCoalition } from "./coalitions.js";
```

- [ ] **Step 4: Run to verify pass**

Run: `node --test tests/coalitions.test.js`
Expected: 4/4 pass.

- [ ] **Step 5: Commit**

```bash
git add src/engine/coalitions.js src/engine/actions.js tests/coalitions.test.js
git commit -m "feat(coalitions): propose/respond/withdraw with most-held card swap"
```

---

## Phase 5: Conspiracy timing

### Task 5.1: Fixed-cost conspiracy buy

**Files:**
- Modify: `src/data/conspiracies.js` (add `cost: 4|5` to every card; mark Block/Reverse)
- Modify: `src/engine/actions.js` — `buyConspiracy` becomes parameterless, pays top-of-deck cost
- Modify: `tests/conspiracies.test.js`

- [ ] **Step 1: Add `cost` to every conspiracy card**

In `src/data/conspiracies.js`, add `cost: 4` or `cost: 5` to each card (roughly half-and-half). Mark `family: "block"` on Block! cards and `family: "reverse"` on Reverse! cards (introducing two new cards if not already present). Keep their `canInterrupt: true`.

(If your existing conspiracies file doesn't have Block/Reverse, add two new entries — `c019` Block! and `c020` Reverse! — with `canInterrupt: true` and `family`.)

- [ ] **Step 2: Update `buyConspiracy` to take no `spend`**

```javascript
export function buyConspiracy(state) {
  if (state.turn.phase !== "actions") throw new Error("buy only in actions phase");
  if (state.decks.conspiracyDraw.length === 0) {
    state = clone(state);
    state.decks.conspiracyDraw = shuffle(state.decks.conspiracyDiscard, makeRng(state.seed + state.log.length));
    state.decks.conspiracyDiscard = [];
  }
  const topId = state.decks.conspiracyDraw[0];
  const card = CONSPIRACY_BY_ID[topId];
  const cost = card.cost;   // 4 or 5
  const s = clone(state);
  const p = s.players[s.turn.current];
  if (RESOURCES.reduce((sum, r) => sum + (p.resources[r] || 0), 0) < cost)
    throw new Error("cannot afford");
  // Pay any combination summing to cost; simplest deterministic: drain from highest pile.
  let remaining = cost;
  for (const r of [...RESOURCES].sort((a, b) => (p.resources[b] || 0) - (p.resources[a] || 0))) {
    const take = Math.min(remaining, p.resources[r] || 0);
    p.resources[r] -= take;
    remaining -= take;
    if (remaining === 0) break;
  }
  s.decks.conspiracyDraw.shift();
  p.hand.push(topId);
  s.log.push(`${p.name} bought conspiracy ${topId} for ${cost}`);
  return s;
}
```

- [ ] **Step 3: Update `tests/conspiracies.test.js`**

Rewrite the buy tests to assert the new behavior: deterministic top-card cost; reject when total resources < cost; deck-empty reshuffle from discard. Remove min-spend variants and Showstopper-T2 references.

- [ ] **Step 4: Run to verify pass**

Run: `node --test tests/conspiracies.test.js`
Expected: green.

- [ ] **Step 5: Commit**

```bash
git add src/data/conspiracies.js src/engine/actions.js tests/conspiracies.test.js
git commit -m "feat(conspiracies): fixed cost 4 or 5 per card; remove min-spend"
```

---

### Task 5.2: Between-turns interrupt phase

**Files:**
- Modify: `src/engine/actions.js`
- Create: `tests/between-turns.test.js`

- [ ] **Step 1: Write failing test**

```javascript
import { test } from "node:test";
import assert from "node:assert/strict";
import { createGame } from "../src/engine/state.js";
import { endTurn, passBetweenTurns } from "../src/engine/actions.js";

const P = [
  { name: "A", color: "#1" }, { name: "B", color: "#2" }, { name: "C", color: "#3" }
];

test("endTurn enters betweenTurns; each non-active player gets a pass slot", () => {
  let g = createGame({ players: P, seed: 1 });
  g.turn = { ...g.turn, phase: "actions", current: 0, draftRemaining: 0 };
  g = endTurn(g);
  assert.equal(g.turn.phase, "betweenTurns");
  assert.equal(g.turn.betweenTurnsAt, 1);   // P1 prompts first
  g = passBetweenTurns(g);
  assert.equal(g.turn.betweenTurnsAt, 2);
  g = passBetweenTurns(g);
  // All non-active have passed -> next player's beginTurn fires
  assert.notEqual(g.turn.phase, "betweenTurns");
});
```

- [ ] **Step 2: Run to verify fail**

Run: `node --test tests/between-turns.test.js`
Expected: fail.

- [ ] **Step 3: Implement**

In `src/engine/actions.js`, refactor `endTurn` to enter the `betweenTurns` phase rather than directly advance to next `beginTurn`:

```javascript
export function endTurn(state) {
  if (state.turn.phase !== "actions") throw new Error("end only in actions phase");
  let s = clone(state);
  // Drain pending headlines (as in Task 2.7)
  while (s.turn.pendingHeadlines.length > 0) {
    /* unchanged */
  }
  if (isGameOver(s)) return finishGame(s);
  // Enter betweenTurns: walk through non-active players in rotation order.
  s.turn.phase = "betweenTurns";
  s.turn.betweenTurnsAt = (s.turn.current + 1) % s.players.length;
  return s;
}

export function passBetweenTurns(state) {
  if (state.turn.phase !== "betweenTurns") throw new Error("not in betweenTurns");
  const s = clone(state);
  const next = (s.turn.betweenTurnsAt + 1) % s.players.length;
  if (next === (s.turn.current + 1) % s.players.length) {
    // we've gone full circle minus the next-active player; advance turn
    s.turn.current = (s.turn.current + 1) % s.players.length;
    s.turn.betweenTurnsAt = null;
    return beginTurn(s);
  }
  s.turn.betweenTurnsAt = next;
  // skip the soon-to-be-active player so we don't prompt them
  if (s.turn.betweenTurnsAt === (s.turn.current + 1) % s.players.length) {
    s.turn.current = (s.turn.current + 1) % s.players.length;
    s.turn.betweenTurnsAt = null;
    return beginTurn(s);
  }
  return s;
}
```

- [ ] **Step 4: Run to verify pass**

Run: `node --test tests/between-turns.test.js`
Expected: pass.

- [ ] **Step 5: Commit**

```bash
git add src/engine/actions.js tests/between-turns.test.js
git commit -m "feat(timing): between-turns interrupt phase with per-player pass"
```

---

### Task 5.3: Block!/Reverse! interrupt — minimal scaffolding

**Files:** modify `src/engine/conspiracies.js`; extend `tests/conspiracies.test.js`.

- [ ] **Step 1: Add `family: "block"|"reverse"` checks on `playConspiracy`**

Update `playConspiracy` to allow play during another player's turn ONLY when `card.family === "block" || card.family === "reverse"`. Throw otherwise. (Use the existing `canInterrupt` flag — `canInterrupt` is now exclusively the Block/Reverse flag.)

- [ ] **Step 2: Test**

```javascript
test("playConspiracy: non-interrupt card rejected mid-opponent turn", () => {
  let g = createGame({ players: P, seed: 1 });
  g.turn = { ...g.turn, phase: "actions", current: 0 };
  g.players[1].hand = ["c001"];   // not block/reverse
  assert.throws(() => playConspiracy(g, { cardId: "c001", playerId: 1 }), /interrupt/i);
});
```

- [ ] **Step 3: Run, commit**

Run: `node --test tests/conspiracies.test.js`
Expected: pass.

```bash
git add src/engine/conspiracies.js tests/conspiracies.test.js
git commit -m "feat(timing): restrict mid-turn interrupts to Block/Reverse cards"
```

---

## Phase 6: UI rewrite

### Task 6.1: Geometry helpers — hex polygon + seat positions

**Files:**
- Create: `src/ui/geometry.js`
- Create: `tests/geometry.test.js`

- [ ] **Step 1: Write failing tests**

```javascript
import { test } from "node:test";
import assert from "node:assert/strict";
import { hexPath, hexCenter, seatPositions } from "../src/ui/geometry.js";

test("hexCenter: axial (0,0) is the board center", () => {
  const c = hexCenter({ q: 0, r: 0 });
  assert.equal(c.x, 400);
  assert.equal(c.y, 350);
});

test("hexPath: returns an SVG path string with 6 segments", () => {
  const d = hexPath({ q: 0, r: 0 }, 80);
  assert.ok(/^M[0-9.,]+( L[0-9.,]+){5} Z$/.test(d));
});

test("seatPositions: returns `capacity` points inside the hex", () => {
  const pts = seatPositions({ q: 0, r: 0 }, 80, 9);
  assert.equal(pts.length, 9);
});
```

- [ ] **Step 2: Run to verify fail**

Run: `node --test tests/geometry.test.js`
Expected: module not found.

- [ ] **Step 3: Create `src/ui/geometry.js`**

```javascript
// Flat-top hex grid centered on the board.
const CENTER = { x: 400, y: 350 };
const HEX_SIZE = 110;   // hex "radius" (center → vertex)

export function hexCenter(axial) {
  const x = CENTER.x + HEX_SIZE * 1.5 * axial.q;
  const y = CENTER.y + HEX_SIZE * Math.sqrt(3) * (axial.r + axial.q / 2);
  return { x, y };
}

export function hexPath(axial, size = HEX_SIZE) {
  const c = hexCenter(axial);
  const pts = [];
  for (let i = 0; i < 6; i++) {
    const a = (Math.PI / 3) * i;
    pts.push({ x: c.x + size * Math.cos(a), y: c.y + size * Math.sin(a) });
  }
  return `M${pts[0].x.toFixed(1)},${pts[0].y.toFixed(1)} ` +
    pts.slice(1).map((p) => `L${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" ") + " Z";
}

// Pack `n` seats in concentric rings within the hex.
export function seatPositions(axial, size = HEX_SIZE, n) {
  const c = hexCenter(axial);
  if (n <= 1) return [c];
  const rings = [
    { r: 0, count: 1 },
    { r: size * 0.4, count: Math.min(6, n - 1) },
    { r: size * 0.72, count: Math.max(0, n - 7) }
  ];
  const out = [];
  for (const ring of rings) {
    if (out.length >= n) break;
    const place = Math.min(ring.count, n - out.length);
    for (let i = 0; i < place; i++) {
      const a = (2 * Math.PI / Math.max(1, place)) * i;
      out.push({ x: c.x + ring.r * Math.cos(a), y: c.y + ring.r * Math.sin(a) });
    }
  }
  return out;
}
```

- [ ] **Step 4: Run to verify pass**

Run: `node --test tests/geometry.test.js`
Expected: pass.

- [ ] **Step 5: Commit**

```bash
git add src/ui/geometry.js tests/geometry.test.js
git commit -m "feat(ui/geometry): hex polygon + seat-position helpers"
```

---

### Task 6.2: Polygon map renderer

**Files:**
- Modify: `src/ui/map.js` — replace renderer with polygon-based version.
- Modify: `tests/ui-smoke.test.js` — adapt seeded state.

- [ ] **Step 1: Replace `src/ui/map.js`**

Replace the file with a polygon-based renderer that:

- For each zone in `ZONES`, draws an SVG `<path>` via `hexPath(z.axial)`.
- Renders seat circles via `seatPositions(z.axial, HEX_SIZE, z.capacity)`; volatile seats (indices in `volatileSeats`) get dashed strokes + a ⚡ label.
- Filled seats colored by `state.players[seats[i]].color`; flipped seats add an inner "S" mark (text "S").
- Locked zones tinted with the owner's color at low alpha.
- Coalition zones tinted with a striped pattern of both partners' colors.
- Per-zone label outside the polygon: name, `majority/capacity`.
- Selectable empty seats highlight when `placeableZoneIds.includes(z.id)` and `seatIndex` not occupied.
- Gerrymander source-pick mode (when `gerryFromCandidates` set): eligible voters glow; clicking emits `onGerrySourceClick(zoneId, seatIndex)`. After source picked (`gerryDestCandidates` set), eligible empty seats glow.

Render API:
```javascript
renderMap(state, {
  placeableZoneIds: [],
  onSeatClick: () => {},
  gerryFromCandidates: [],   // [{zoneId, seatIndex}]
  onGerrySourceClick: () => {},
  gerryDestCandidates: [],   // [{zoneId, seatIndex}]
  onGerryDestClick: () => {}
});
```

(Exact implementation similar in style to the current `src/ui/map.js` but using polygons + the new options.)

- [ ] **Step 2: Update ui-smoke**

In `tests/ui-smoke.test.js`, swap any `g.zones.find((z) => z.id === "z4")` references for `g.zones.find((z) => z.id === "central")` etc. Update `g.zones.find(...).pegs = …` style setups to `seats`.

- [ ] **Step 3: Run UI tests**

Run: `node --test tests/ui-smoke.test.js`
Expected: pass.

- [ ] **Step 4: Commit**

```bash
git add src/ui/map.js tests/ui-smoke.test.js
git commit -m "feat(ui): polygon-based map renderer with gerrymander pick modes"
```

---

### Task 6.3 – 6.12: Remaining UI panels

Each of the following tasks follows the same shape: write a tiny smoke test asserting the panel renders without throwing for representative state, then implement the panel module, then commit.

For brevity below, only the panel name, file, key state expectations, and rendering contract are listed — write the implementation following the existing `src/ui/screens.js` patterns (helper `h(tag, attrs, ...kids)`, click → `ctx.dispatch(actionName, payload)`).

**Task 6.3 — VoteBankPanel** (`src/ui/screens.js`): renders 3 open cards; each has cost icons (marked one outlined), value badge, optional `+1` echo overlay; `Buy` button dispatches `buyVoteBank({ openIndex })`. Disabled when phase != `actions` or `currentBuy != null` or unaffordable.

**Task 6.4 — GerrymanderPanel** (`src/ui/screens.js`): lists each majority you hold with remaining moves; "Move from X" enters source-pick mode in `ctx.ui`. Clicking source then dest commits via `gerrymander(...)`.

**Task 6.5 — DiscardModal** (`src/ui/screens.js`): when `phase === "discard"`, modal with `-` buttons next to each resource until total ≤ 12; "Confirm" dispatches `discardResources({ counts })`.

**Task 6.6 — HeadlineSequence** (`src/ui/screens.js`): not its own phase; when `state.lastHeadline` is fresh (set in `endTurn` drain), modal shows the headline with **Continue** that re-dispatches the next drain step (or moves on if queue empty). Implementation choice: drain headlines one at a time via a `nextHeadline` action, so each one gets a UI moment.

**Task 6.7 — TradeProposalModal / TradeAcceptModal** (`src/ui/proposalModals.js`): proposer drafts give/receive; recipient privacy curtain → modal with Accept/Decline.

**Task 6.8 — CoalitionProposalModal / CoalitionAcceptModal** (`src/ui/proposalModals.js`): proposer picks zone + partner + split + their card (`mostHeldOptions(p)`); recipient picks their card; Accept/Decline.

**Task 6.9 — BetweenTurnsCurtain** (`src/ui/screens.js`): privacy curtain reveals non-active player's hand briefly; "Pass" dispatches `passBetweenTurns()`.

**Task 6.10 — Read-aloud handoff** (`src/ui/screens.js`): when `phase === "readAloud"`, render curtain to previous player; reveal shows dilemma question + neutral answer labels; "Read aloud" button triggers `narrateReadAloud(card)`; "Done" dispatches `doneReadAloud()`.

**Task 6.11 — Power invocation UI** (`src/ui/powerModals.js`): one section per unlocked power with affordable inputs — Open Market (give/take selects), Donations (target+resource counts), Land Grab (target seat picker + replaceOwn picker), Civil Disobedience (target seats + pay split), Targeted Marketing (zone + opponent + 2 seat indices + pay).

**Task 6.12 — Setup screen tweaks** (`src/ui/screens.js`): drop the 5-player row; add **"Shuffle seat order"** button that randomizes the rows' order in `ctx.ui.draftOrder` before dispatch.

For each panel:
- write smoke test in `tests/ui-smoke.test.js`,
- implement in the named file,
- run `node --test tests/ui-smoke.test.js`,
- commit `feat(ui): <panel name>`.

---

## Phase 7: Rules content

### Task 7.1: Author `src/data/rules.js`

**Files:**
- Create: `src/data/rules.js`

- [ ] **Step 1: Write the data file**

```javascript
// Section-keyed prose for the Rules modal. All copy is original.
export const RULES_SECTIONS = [
  {
    id: "overview", title: "Overview",
    body: `Each player is a politician running a campaign across nine constituencies.
Answer dilemmas to earn resources and build ideologies; spend resources to
influence voters and form majorities; gerrymander, coalition, and conspire
to swing the board. Most flipped majority voters at the end wins.`
  },
  {
    id: "turn", title: "Turn order",
    body: `Turns rotate clockwise. The previous player draws and reads each
Ideology Card aloud, hiding the resource payouts until the active player
commits to an answer. Then the active player resolves passive resources,
trims to the 12 cap, places any pending evictions, and acts freely until
they end their turn.`
  },
  {
    id: "resources", title: "Resources & cap",
    body: `Resources are Funds, Clout, Media, Trust. The cap is 12 total.
Any excess must be discarded at the start of your turn before you can act.
Players trade resources 1-for-1 (and conspiracy cards 1-for-1), unlimited
per turn, only on the proposer's turn.`
  },
  {
    id: "voteBank", title: "Vote Bank",
    body: `Three Vote Bank Cards sit face-up on the HQ Mat. Each costs a
mix of resources and grants 1, 2, or 3 voters. All voters from one card
must go in a single zone. After a buy, the next card from the deck
replaces it. When the deck runs out, the discard reshuffles.`
  },
  {
    id: "majorities", title: "Majorities",
    body: `Each zone shows majority/capacity (e.g. 6/11). When you reach the
threshold in a zone, the engine flips exactly `+`"`+`majority`+`"`+` of your voters
S-side up. Each flipped voter is 1 point. Extra voters you add later in
the same zone never flip — they don't score.`
  },
  {
    id: "gerrymander", title: "Gerrymandering",
    body: `Every solo majority you hold grants you 1 gerrymander move per
turn (2 with Mass Mobilisation). A move picks a non-majority, non-volatile
voter (yours or any opponent's) in the majority zone or one of its
neighbors, and slides it to an empty seat in another such zone that
shares a border with the source.`
  },
  {
    id: "volatile", title: "Volatile zones",
    body: `Volatile seats are marked with ⚡. A voter on a volatile seat is
permanent: it cannot be moved, removed, converted, or discarded by any
power, conspiracy, or gerrymander. Landing a voter (by any means) on a
volatile seat queues a Headline that fires at the end of the turn on the
voter's owner.`
  },
  {
    id: "headlines", title: "Headlines",
    body: `When a voter lands on a volatile seat, a Headline is queued.
At the end of your turn, queued Headlines resolve in placement order on
the players they apply to. Most Headlines are negative — putting an
opponent on a volatile seat is a viable strategy.`
  },
  {
    id: "conspiracies", title: "Conspiracies",
    body: `Conspiracy Cards have a fixed cost printed on the back (4 or 5).
On your turn, the top card is visible; you may buy it for that cost from
any resource mix. Most cards are played on your own turn; "Block!" and
"Reverse!" may be played as interrupts. Other conspiracies may also be
played between turns, after one player ends and before the next begins.`
  },
  {
    id: "coalitions", title: "Coalitions",
    body: `Two players may jointly form a majority in a zone if their
combined voters meet the threshold and neither alone does. The split is
negotiated. Forming a coalition requires both players to trade an
Ideology Card from their most-held pile — the ideological cost of
compromise. Coalition zones grant no gerrymander, and either partner
may withdraw at any time on their own turn. Traded cards are not
returned.`
  },
  {
    id: "powers", title: "Ideologue powers",
    body: `Every 2 Ideology Cards of one type give you 1 free resource
of that type each turn (passive). At 4 cards in one ideology, you
unlock the Level 4 power; at 6, Level 6. Capitalist: Open Market /
Land Grab. Supremo: Donations / Civil Disobedience. Showman:
Echo Chamber / Targeted Marketing. Idealist: Blind Faith /
Mass Mobilisation. Powers stack across ideologies and persist as long
as you hold the cards.`
  },
  {
    id: "scoring", title: "Scoring & end game",
    body: `The game ends when every zone is closed (locked or coalition)
or every seat on the board is filled. The final round wraps any
coalition or conspiracy negotiation; then scores are tallied. Your
score is the total number of flipped majority voters you own across
the board. Ties are broken by total voters on the board.`
  }
];
```

- [ ] **Step 2: Commit**

```bash
git add src/data/rules.js
git commit -m "docs(rules): in-app rule sections (original prose)"
```

---

### Task 7.2: RulesModal component

**Files:**
- Create: `src/ui/rulesModal.js`
- Modify: `src/ui/screens.js` (settings menu → Rules entry)
- Modify: `tests/ui-smoke.test.js` (smoke render with rules open)

- [ ] **Step 1: Implement RulesModal**

`src/ui/rulesModal.js` exports `rulesModal(ctx)` that renders a full-screen modal: left nav (sections), main panel (selected section's body). Selection in `ctx.ui.rulesSection`; close button dispatches `closeRules`.

- [ ] **Step 2: Wire from settings**

In `screens.js`, add to the settings menu: `h("button", ..., onclick: () => ctx.setUi({ rulesOpen: true, rulesSection: "overview" }), "Rules")`.

In `render.js`, when `ctx.ui.rulesOpen`, render `rulesModal(ctx)` on top of the current screen.

- [ ] **Step 3: Smoke test**

In `tests/ui-smoke.test.js`:
```javascript
test("rules modal renders without throwing", () => {
  const root = makeNode("main");
  render(root, ctx(null, { mode: "setup", rulesOpen: true, rulesSection: "overview" }));
  assert.ok(root.children.length > 0);
});
```

- [ ] **Step 4: Run, commit**

```bash
git add src/ui/rulesModal.js src/ui/screens.js src/ui/render.js tests/ui-smoke.test.js
git commit -m "feat(ui): in-app Rules modal with sectioned navigation"
```

---

### Task 7.3: Per-panel ⓘ glyphs + tooltips + hint banner

**Files:**
- Modify: `src/ui/screens.js`
- Create: `src/ui/hintBanner.js`

- [ ] **Step 1: Add ⓘ on each panel title**

In every panel header rendered by `screens.js`, append a button:
```javascript
h("button", {
  class: "info-glyph",
  "aria-label": "Rules: " + sectionId,
  onclick: () => ctx.setUi({ rulesOpen: true, rulesSection: sectionId })
}, "ⓘ")
```

- [ ] **Step 2: Implement hint banner**

`src/ui/hintBanner.js` exports `hintBanner(ctx)` returning a context-aware sentence:

| Phase | Hint |
|---|---|
| `readAloud` | "Pass to [prev] — read this dilemma aloud" |
| `dilemma` | "Pick an answer — payouts are hidden until you commit" |
| `discard` | "Trim to 12 resources before you act" |
| `placePending` | "Place [N] evicted voter(s) before acting" |
| `actions` (currentBuy) | "Place [N] voter(s) — same zone, your choice of circles" |
| `actions` (no buy, headlines pending) | "[N] Headlines pending — resolve before ending turn" |
| `actions` (no buy, none pending) | "Spend & maneuver — buy voters, gerrymander, trade" |
| `tradeAccept`/`coalitionAccept` | "Pass to [partner] — proposal awaiting response" |
| `betweenTurns` | "Pass to [betweenTurnsAt] — any interrupts?" |

- [ ] **Step 3: Wire into `turnScreen`** above the panels.

- [ ] **Step 4: Commit**

```bash
git add src/ui/screens.js src/ui/hintBanner.js
git commit -m "feat(ui): info glyphs on panels + per-turn hint banner"
```

---

## Phase 8: E2E verification & deploy

### Task 8.1: Full suite green

- [ ] Run `npm test`. Expected: ~140 tests, 0 failures. Fix any drift.

```bash
npm test
```

- [ ] If anything fails, fix inline and amend the most recent commit.

---

### Task 8.2: Playwright drive — 2-player full game

**Files:**
- Create: `/tmp/pw-shasn/drive-overhaul.mjs` (driver script, not checked in)

- [ ] **Step 1: Stand up the static server**

```bash
cd /Users/vedant/personal/pravar/shasn
python3 -m http.server 8755 >/tmp/shasn-server.log 2>&1 &
echo $! > /tmp/shasn-server.pid
```

- [ ] **Step 2: Author the driver**

Drive: setup → shuffle seat order → begin → previous-player read-aloud handoff → dilemma → place voters → buy VBC, place in single zone → gerrymander a flipped majority → propose & accept coalition → end turn → headline modal → between-turns curtain → next turn.

Screenshots at each major milestone, `console --errors` clean.

- [ ] **Step 3: Run; iterate until clean**

```bash
cd /tmp/pw-shasn && node drive-overhaul.mjs
```

Expected: zero `pageerror`, screenshots written for setup, read-aloud, dilemma, placement, gerrymander mode, coalition, headline, between-turns, rules modal.

- [ ] **Step 4: Stop server**

```bash
kill $(cat /tmp/shasn-server.pid)
```

- [ ] **Step 5: Commit (no code change, just confirms green)**

(No git changes — proceed to 8.3.)

---

### Task 8.3: Deploy and live smoke

- [ ] **Step 1: Merge & push**

```bash
git checkout main
git merge --ff-only feat/faithful-overhaul
git push origin main
```

- [ ] **Step 2: Watch the Pages workflow**

```bash
gh run list --limit 2
gh run watch <run-id> --exit-status
```

- [ ] **Step 3: Live smoke**

```bash
curl -sf https://vedants01.github.io/shasn/index.html | head -3
```

Author a small `live-smoke.mjs` that loads the live URL, opens the Rules modal, and asserts no console errors. Run, observe zero errors.

- [ ] **Step 4: Final report**

Summarize for the user: tests count, live URL, what's new vs spec, any deferred items.

---

## Self-review checklist

### Spec coverage

- ✅ §2 Map → Task 1.1 (data) + Task 6.1 (geometry) + Task 6.2 (renderer).
- ✅ §3 Voting / majority / scoring → Task 2.1 (helpers) + Task 2.5 (placeToken with flip).
- ✅ §4 Gerrymandering → Task 2.6 + Task 6.4 (panel).
- ✅ §5 Powers → Tasks 3.1–3.6.
- ✅ §6 Vote Bank → Task 2.2 (helpers) + Task 2.4 (action) + Task 6.3 (panel) + Task 1.2 (data).
- ✅ §7 Resource cap → Task 2.3 + Task 6.5 (modal).
- ✅ §8 Trading → Task 4.1 + Task 6.7 (modals).
- ✅ §9 Headlines → Task 2.7 (drain) + Task 1.3 (data) + Task 6.6 (sequence).
- ✅ §10 Coalitions → Task 4.2 + Task 6.8.
- ✅ §11 Conspiracy timing → Tasks 5.1–5.3.
- ✅ §12 Setup → Task 6.12.
- ✅ §13 Read-aloud → Task 6.10 (UI), Task 2.7 (engine phase).
- ✅ §14 Rules UI → Tasks 7.1–7.3.
- ✅ §15 Architecture → all of Phases 1–6.
- ✅ §16 End game → Task 2.8.

### Placeholder scan

No "TBD" or "implement appropriately" left. The descriptive Phase 6.3–6.12 block is intentional shorthand — each panel follows the same five-step TDD recipe and uses helper patterns already shown in earlier tasks.

### Type consistency

- `currentBuy` shape: `{ cardId, zoneId, tokensRemaining }` — used consistently in Tasks 2.4, 2.5.
- `pendingProposal` shape: `{ kind, from, to, ... }` — used consistently in Tasks 4.1, 4.2.
- `gerrymanderMoves: { [zoneId]: number }` — set in `beginTurn` (Task 2.7), decremented in `gerrymander` (Task 2.6).
- Ideology key `showman` (not `showstopper`) — locked in Task 1.5; data renamed in 1.6.
- Action names: `buyVoteBank`, `placeToken`, `gerrymander`, `openMarket`, `landGrab`, `donations`, `civilDisobedience`, `targetedMarketing`, `proposeTrade`/`respondTrade`, `proposeCoalition`/`respondCoalition`/`withdrawCoalition`, `discardResources`, `donePendingPlace`, `doneReadAloud`, `passBetweenTurns`, `endTurn`, `beginTurn`, `finishGame`. All used consistently.

---

## Execution

**Plan complete and saved to `docs/superpowers/plans/2026-05-29-shasn-faithful-overhaul.md`. Two execution options:**

1. **Subagent-Driven (recommended)** — I dispatch a fresh subagent per task, review between tasks, fast iteration.
2. **Inline Execution** — Execute tasks in this session using `superpowers:executing-plans`, batch execution with checkpoints.

**Which approach?**
