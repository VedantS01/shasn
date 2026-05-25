# SHASN Pass-and-Play Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a complete, single-device pass-and-play SHASN game for 2–5 players, hosted on GitHub Pages, with a pure DOM-free game engine, an editorial-newsprint UI, a fictional 9-zone SVG map, and ~60 original dilemmas + ~20 conspiracies.

**Architecture:** A pure, deterministic **engine** (`src/engine/`) exposes `createGame` plus pure action reducers `(state, payload) → newState` and rule predicates; it never touches the DOM and is fully unit-tested with `node --test`. **Data** (`src/data/`) holds all content (map, dilemmas, conspiracies, voter market) validated by schema tests. A thin **UI** (`src/ui/`) renders state to the DOM and dispatches actions; it is verified by manual playtest. `main.js` owns the dispatch loop and autosaves to localStorage.

**Tech Stack:** Vanilla HTML/CSS/ES-module JS, SVG, `node --test` (Node ≥ 18, no dependencies), GitHub Pages. No build step.

**Spec:** `docs/superpowers/specs/2026-05-25-shasn-game-design.md`

**Conventions for every task:** Run tests with `node --test` from the repo root. Commit with `git -c user.name='pravar' -c user.email='shreyas@gibbous.io' commit`. After each engine task, the full suite must stay green.

---

## Shared definitions (read before starting — all tasks rely on these)

**State shape** (the single source of truth returned by `createGame` and every reducer):

```js
{
  seed: 1,
  players: [{
    id: 0, name: "Asha", color: "#b3472f",
    resources: { funds: 0, clout: 0, media: 0, trust: 0 },
    piles: { capitalist: 0, supremo: 0, showstopper: 0, idealist: 0 },
    hand: ["c003"],            // secret conspiracy card ids
    usedThisTurn: {}            // keys like "capitalist:t1" set true when a once/turn power is used
  }],
  zones: [{ id: "z0", pegs: { 0: 2, 1: 1 }, lockedBy: null }], // pegs keyed by playerId
  decks: {
    dilemmaDraw: ["d014", ...], dilemmaDiscard: [],
    conspiracyDraw: ["c007", ...], conspiracyDiscard: []
  },
  turn: { current: 0, phase: "dilemma", pendingDilemma: null, gerrymanders: 0 },
  log: [],
  winner: null            // playerId once game over; phase becomes "gameover"
}
```

`phase` is one of `"dilemma"` (must answer pendingDilemma), `"actions"` (may buy/play/gerrymander/end), `"gameover"`.

**Ideology ↔ resource mapping** (fixed):

| ideology key | archetype | resource | accent |
|---|---|---|---|
| `capitalist` | The Capitalist | `funds` | gold `#caa12f` |
| `supremo` | The Supremo | `clout` | red `#b3472f` |
| `showstopper` | The Showstopper | `media` | magenta `#a8327d` |
| `idealist` | The Idealist | `trust` | blue `#2f6aa8` |

**Tier thresholds:** pile count `>=2` → tier 1, `>=3` → tier 2, `>=5` → tier 3.

**File structure** (created across the tasks below):

```
shasn/
├── index.html
├── package.json                # {"type":"module"} only, no deps
├── styles/{base.css,components.css}
├── src/
│   ├── engine/{constants.js,rng.js,state.js,rules.js,actions.js,archetypes.js,conspiracies.js}
│   ├── data/{map.js,dilemmas.js,conspiracies.js,voters.js}
│   ├── ui/{render.js,screens.js,map.js,persistence.js}
│   └── main.js
└── tests/{rng.test.js,state.test.js,rules.test.js,actions.test.js,archetypes.test.js,conspiracies.test.js,content.test.js,persistence.test.js}
```

---

## Task 1: Project scaffold + test runner

**Files:**
- Create: `package.json`, `index.html`, `tests/smoke.test.js`

- [ ] **Step 1: Create `package.json`**

```json
{
  "name": "shasn",
  "version": "0.1.0",
  "type": "module",
  "private": true,
  "scripts": { "test": "node --test" }
}
```

- [ ] **Step 2: Create a placeholder `index.html`**

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>SHASN — Pass &amp; Play</title>
  <link rel="stylesheet" href="styles/base.css" />
  <link rel="stylesheet" href="styles/components.css" />
</head>
<body>
  <main id="app" aria-live="polite"></main>
  <script type="module" src="src/main.js"></script>
</body>
</html>
```

- [ ] **Step 3: Write a smoke test** — `tests/smoke.test.js`

```js
import { test } from "node:test";
import assert from "node:assert/strict";

test("test runner works", () => {
  assert.equal(1 + 1, 2);
});
```

- [ ] **Step 4: Run the suite and verify it passes**

Run: `node --test`
Expected: 1 test passing.

- [ ] **Step 5: Commit**

```bash
git add package.json index.html tests/smoke.test.js
git -c user.name='pravar' -c user.email='shreyas@gibbous.io' commit -m "chore: scaffold project and test runner"
```

---

## Task 2: Constants

**Files:**
- Create: `src/engine/constants.js`

- [ ] **Step 1: Write `src/engine/constants.js`** (pure data, no test needed beyond import)

```js
export const IDEOLOGIES = ["capitalist", "supremo", "showstopper", "idealist"];
export const RESOURCES = ["funds", "clout", "media", "trust"];

export const RESOURCE_OF = { capitalist: "funds", supremo: "clout", showstopper: "media", idealist: "trust" };
export const IDEOLOGY_OF = { funds: "capitalist", clout: "supremo", media: "showstopper", trust: "idealist" };

export const ACCENT = { capitalist: "#caa12f", supremo: "#b3472f", showstopper: "#a8327d", idealist: "#2f6aa8" };

// pile count -> unlocked tier (0..3)
export function tierOf(pileCount) {
  if (pileCount >= 5) return 3;
  if (pileCount >= 3) return 2;
  if (pileCount >= 2) return 1;
  return 0;
}
```

- [ ] **Step 2: Commit**

```bash
git add src/engine/constants.js
git -c user.name='pravar' -c user.email='shreyas@gibbous.io' commit -m "feat: engine constants and tier mapping"
```

---

## Task 3: Seeded RNG

**Files:**
- Create: `src/engine/rng.js`, `tests/rng.test.js`

- [ ] **Step 1: Write failing test** — `tests/rng.test.js`

```js
import { test } from "node:test";
import assert from "node:assert/strict";
import { makeRng, shuffle } from "../src/engine/rng.js";

test("makeRng is deterministic for a seed", () => {
  const a = makeRng(42), b = makeRng(42);
  assert.equal(a(), b());
  assert.equal(a(), b());
});

test("makeRng outputs are in [0,1)", () => {
  const r = makeRng(7);
  for (let i = 0; i < 100; i++) { const v = r(); assert.ok(v >= 0 && v < 1); }
});

test("shuffle is a permutation and deterministic per seed", () => {
  const src = [1, 2, 3, 4, 5];
  const s1 = shuffle(src, makeRng(1));
  const s2 = shuffle(src, makeRng(1));
  assert.deepEqual(s1, s2);
  assert.deepEqual([...s1].sort(), src);
  assert.deepEqual(src, [1, 2, 3, 4, 5]); // original unmutated
});
```

- [ ] **Step 2: Run and verify it fails**

Run: `node --test tests/rng.test.js`
Expected: FAIL — cannot find module `../src/engine/rng.js`.

- [ ] **Step 3: Implement `src/engine/rng.js`**

```js
// mulberry32 — small deterministic PRNG
export function makeRng(seed) {
  let s = seed >>> 0;
  return function () {
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function shuffle(arr, rng) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
```

- [ ] **Step 4: Run and verify it passes**

Run: `node --test tests/rng.test.js`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add src/engine/rng.js tests/rng.test.js
git -c user.name='pravar' -c user.email='shreyas@gibbous.io' commit -m "feat: seeded deterministic RNG and shuffle"
```

---

## Task 4: Map data + content validation (zones)

**Files:**
- Create: `src/data/map.js`, `tests/content.test.js`

The map is 9 zones with odd capacities (5–11), a symmetric neighbor graph, and an SVG path for later rendering. Layout (logical adjacency), capacities chosen for a ~60-peg board:

```
 z0 — z1 — z2
 |  X  |  X  |
 z3 — z4 — z5
 |  X  |  X  |
 z6 — z7 — z8
```
Neighbors include diagonals through the center where noted below; the test enforces whatever you encode is **symmetric**.

- [ ] **Step 1: Write `src/data/map.js`**

```js
// Fictional nation "Bharatpur" — 9 constituencies.
// capacity is odd (majority = (capacity+1)/2). svgPath drawn on a 600x600 viewBox.
export const ZONES = [
  { id: "z0", name: "Northgate",   capacity: 5,  neighbors: ["z1", "z3", "z4"],             svgPath: "M40,40 H210 V190 H40 Z" },
  { id: "z1", name: "Highcrest",   capacity: 7,  neighbors: ["z0", "z2", "z4"],             svgPath: "M210,40 H390 V190 H210 Z" },
  { id: "z2", name: "Eastmarsh",   capacity: 5,  neighbors: ["z1", "z4", "z5"],             svgPath: "M390,40 H560 V190 H390 Z" },
  { id: "z3", name: "Millfield",   capacity: 7,  neighbors: ["z0", "z4", "z6"],             svgPath: "M40,190 H210 V410 H40 Z" },
  { id: "z4", name: "Capital",     capacity: 11, neighbors: ["z0","z1","z2","z3","z5","z6","z7","z8"], svgPath: "M210,190 H390 V410 H210 Z" },
  { id: "z5", name: "Saltcoast",   capacity: 7,  neighbors: ["z2", "z4", "z8"],             svgPath: "M390,190 H560 V410 H390 Z" },
  { id: "z6", name: "Lowdowns",    capacity: 5,  neighbors: ["z3", "z4", "z7"],             svgPath: "M40,410 H210 V560 H40 Z" },
  { id: "z7", name: "Ironreach",   capacity: 7,  neighbors: ["z4", "z6", "z8"],             svgPath: "M210,410 H390 V560 H210 Z" },
  { id: "z8", name: "Sunderlands", capacity: 5,  neighbors: ["z4", "z5", "z7"],             svgPath: "M390,410 H560 V560 H390 Z" }
];

export const ZONE_BY_ID = Object.fromEntries(ZONES.map((z) => [z.id, z]));
```

- [ ] **Step 2: Write failing test** — `tests/content.test.js` (zones section; other content added in later tasks)

```js
import { test } from "node:test";
import assert from "node:assert/strict";
import { ZONES, ZONE_BY_ID } from "../src/data/map.js";

test("there are exactly 9 zones with unique ids", () => {
  assert.equal(ZONES.length, 9);
  assert.equal(new Set(ZONES.map((z) => z.id)).size, 9);
});

test("every zone has an odd capacity between 5 and 11", () => {
  for (const z of ZONES) {
    assert.ok(z.capacity >= 5 && z.capacity <= 11, `${z.id} capacity range`);
    assert.equal(z.capacity % 2, 1, `${z.id} capacity odd`);
  }
});

test("neighbor graph is symmetric and references real zones", () => {
  for (const z of ZONES) {
    for (const n of z.neighbors) {
      assert.ok(ZONE_BY_ID[n], `${z.id} -> unknown ${n}`);
      assert.ok(ZONE_BY_ID[n].neighbors.includes(z.id), `${n} must list ${z.id} back`);
    }
  }
});

test("every zone has a name and svgPath", () => {
  for (const z of ZONES) {
    assert.ok(z.name && typeof z.name === "string");
    assert.ok(z.svgPath && z.svgPath.startsWith("M"));
  }
});
```

- [ ] **Step 3: Run and verify it passes**

Run: `node --test tests/content.test.js`
Expected: PASS (4 tests). If a neighbor asymmetry is reported, fix `map.js` until green.

- [ ] **Step 4: Commit**

```bash
git add src/data/map.js tests/content.test.js
git -c user.name='pravar' -c user.email='shreyas@gibbous.io' commit -m "feat: 9-zone map data with validated symmetric adjacency"
```

---

## Task 5: Voter market data

**Files:**
- Create: `src/data/voters.js`; Modify: `tests/content.test.js`

Voter offers replace SHASN's variable-cost voter cards: a small fixed market where each offer grants `value` pegs for a specific resource mix (more votes → more/mixed resources).

- [ ] **Step 1: Write `src/data/voters.js`**

```js
// Each offer: id, label, value (pegs granted), cost (resource -> amount).
export const VOTER_MARKET = [
  { id: "v1", label: "Doorstep Canvass", value: 1, cost: { trust: 1, media: 1 } },
  { id: "v2", label: "Ward Rally",       value: 2, cost: { media: 2, clout: 1, funds: 1 } },
  { id: "v3", label: "Party Machine",    value: 3, cost: { funds: 3, clout: 2, media: 1 } }
];

export const VOTER_BY_ID = Object.fromEntries(VOTER_MARKET.map((v) => [v.id, v]));
```

- [ ] **Step 2: Add failing test** — append to `tests/content.test.js`

```js
import { VOTER_MARKET } from "../src/data/voters.js";
import { RESOURCES } from "../src/engine/constants.js";

test("voter offers have positive value and valid resource costs", () => {
  for (const v of VOTER_MARKET) {
    assert.ok(v.value >= 1 && v.value <= 3, `${v.id} value`);
    const total = Object.entries(v.cost).reduce((s, [r, n]) => {
      assert.ok(RESOURCES.includes(r), `${v.id} bad resource ${r}`);
      assert.ok(n > 0, `${v.id} non-positive cost`);
      return s + n;
    }, 0);
    assert.ok(total >= v.value, `${v.id} should cost at least its value`);
  }
});
```

- [ ] **Step 3: Run and verify it passes**

Run: `node --test tests/content.test.js`
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add src/data/voters.js tests/content.test.js
git -c user.name='pravar' -c user.email='shreyas@gibbous.io' commit -m "feat: voter market offers with validation"
```

---

## Task 6: Dilemma deck — schema, seed cards, validation

**Files:**
- Create: `src/data/dilemmas.js`; Modify: `tests/content.test.js`

Each dilemma: `id`, `question`, and exactly two `answers`, each with a `label`, an `ideology` (the pile it feeds), and a `payout` (resource → amount; should be dominant in that answer's ideology resource). **All content is original** — do not copy real SHASN cards.

This task seeds **8 exemplar cards** across themes to establish the pattern and pass validation. Task 14 expands the deck to ~60 against the same validation.

- [ ] **Step 1: Write `src/data/dilemmas.js`** with 8 cards

```js
// Original dilemmas. answers[i].ideology selects the pile; payout is dominant
// in that ideology's resource (capitalist=funds, supremo=clout, showstopper=media, idealist=trust).
export const DILEMMAS = [
  {
    id: "d001",
    question: "A drought empties the reservoirs. Do you ration water by price, letting the market decide?",
    answers: [
      { label: "Yes — price signals end waste", ideology: "capitalist", payout: { funds: 2, media: 1 } },
      { label: "No — water is a right, ration it equally", ideology: "idealist", payout: { trust: 2, clout: 1 } }
    ]
  },
  {
    id: "d002",
    question: "Migrants flood the capital for work. Do you seal the city's borders to outsiders?",
    answers: [
      { label: "Yes — the city belongs to its own", ideology: "supremo", payout: { clout: 2, media: 1 } },
      { label: "No — open arms build a bigger nation", ideology: "idealist", payout: { trust: 2, funds: 1 } }
    ]
  },
  {
    id: "d003",
    question: "A scandal could sink a rival. Do you leak it to a friendly broadcaster?",
    answers: [
      { label: "Yes — control the headline", ideology: "showstopper", payout: { media: 2, clout: 1 } },
      { label: "No — keep your hands clean", ideology: "idealist", payout: { trust: 2, media: 1 } }
    ]
  },
  {
    id: "d004",
    question: "Industrialists offer to fund schools if you cut their taxes. Do you take the deal?",
    answers: [
      { label: "Yes — private money, public good", ideology: "capitalist", payout: { funds: 3 } },
      { label: "No — tax them and build it ourselves", ideology: "supremo", payout: { clout: 2, funds: 1 } }
    ]
  },
  {
    id: "d005",
    question: "Protesters camp outside parliament. Do you send in the police at dawn?",
    answers: [
      { label: "Yes — order above all", ideology: "supremo", payout: { clout: 3 } },
      { label: "No — let them be heard on camera", ideology: "showstopper", payout: { media: 2, trust: 1 } }
    ]
  },
  {
    id: "d006",
    question: "A viral rumor flatters your image but isn't true. Do you let it spread?",
    answers: [
      { label: "Yes — a useful myth is still useful", ideology: "showstopper", payout: { media: 3 } },
      { label: "No — correct the record publicly", ideology: "idealist", payout: { trust: 2, media: 1 } }
    ]
  },
  {
    id: "d007",
    question: "A foreign firm will build highways for mining rights. Do you sign?",
    answers: [
      { label: "Yes — growth needs roads", ideology: "capitalist", payout: { funds: 2, clout: 1 } },
      { label: "No — our land, our terms", ideology: "supremo", payout: { clout: 2, trust: 1 } }
    ]
  },
  {
    id: "d008",
    question: "Famous artists endorse you if you fund the festival. Do you bankroll it?",
    answers: [
      { label: "Yes — spectacle wins hearts", ideology: "showstopper", payout: { media: 2, funds: 1 } },
      { label: "No — spend it on clinics instead", ideology: "idealist", payout: { trust: 3 } }
    ]
  }
];

export const DILEMMA_BY_ID = Object.fromEntries(DILEMMAS.map((d) => [d.id, d]));
```

- [ ] **Step 2: Add failing test** — append to `tests/content.test.js`

```js
import { DILEMMAS } from "../src/data/dilemmas.js";
import { IDEOLOGIES, RESOURCE_OF } from "../src/engine/constants.js";

test("dilemmas: unique ids, two answers, valid ideology + dominant payout", () => {
  assert.ok(DILEMMAS.length >= 8);
  assert.equal(new Set(DILEMMAS.map((d) => d.id)).size, DILEMMAS.length);
  for (const d of DILEMMAS) {
    assert.ok(d.question && d.question.length > 0, `${d.id} question`);
    assert.equal(d.answers.length, 2, `${d.id} must have 2 answers`);
    for (const a of d.answers) {
      assert.ok(a.label, `${d.id} answer label`);
      assert.ok(IDEOLOGIES.includes(a.ideology), `${d.id} bad ideology ${a.ideology}`);
      const dom = RESOURCE_OF[a.ideology];
      const domAmt = a.payout[dom] || 0;
      let maxOther = 0;
      for (const [r, n] of Object.entries(a.payout)) { if (r !== dom) maxOther = Math.max(maxOther, n); }
      assert.ok(domAmt >= 1, `${d.id} payout must include its ideology resource`);
      assert.ok(domAmt >= maxOther, `${d.id} payout must be dominant in ${dom}`);
    }
  }
});
```

- [ ] **Step 3: Run and verify it passes**

Run: `node --test tests/content.test.js`
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add src/data/dilemmas.js tests/content.test.js
git -c user.name='pravar' -c user.email='shreyas@gibbous.io' commit -m "feat: dilemma schema, 8 seed cards, validation"
```

---

## Task 7: Conspiracy deck — schema, seed cards, validation

**Files:**
- Create: `src/data/conspiracies.js`; Modify: `tests/content.test.js`

Conspiracies are **bought blind for a generic spend** (no per-card cost). Each card: `id`, `name`, `text`, `canInterrupt` (bool), and `effect` (`{ type, params }`) where `type` is one of the resolver families implemented in Task 12: `grantResource`, `stealResource`, `extraDilemma`, `forceDiscardConspiracy`, `removePeg`, `protectMajority`. This task seeds **6 exemplars**; Task 15 expands to ~20.

- [ ] **Step 1: Write `src/data/conspiracies.js`** with 6 cards

```js
// Original conspiracy cards. effect.type maps to a resolver in src/engine/conspiracies.js.
export const CONSPIRACIES = [
  { id: "c001", name: "War Chest",        text: "A quiet donor fills your coffers.",       canInterrupt: false, effect: { type: "grantResource", params: { resource: "funds", amount: 3 } } },
  { id: "c002", name: "Smear Campaign",   text: "Bleed a rival's momentum dry.",           canInterrupt: true,  effect: { type: "stealResource", params: { resource: "media", amount: 2 } } },
  { id: "c003", name: "Breaking News",    text: "Seize the cycle for an extra story.",     canInterrupt: false, effect: { type: "extraDilemma", params: {} } },
  { id: "c004", name: "Paper Trail",      text: "Expose a hidden scheme — they lose it.",  canInterrupt: true,  effect: { type: "forceDiscardConspiracy", params: {} } },
  { id: "c005", name: "Booth Capture",    text: "Strong-arm a contested booth.",           canInterrupt: false, effect: { type: "removePeg", params: {} } },
  { id: "c006", name: "Loyalist Cordon",  text: "Wall off a stronghold from meddling.",    canInterrupt: false, effect: { type: "protectMajority", params: {} } }
];

export const CONSPIRACY_BY_ID = Object.fromEntries(CONSPIRACIES.map((c) => [c.id, c]));

export const CONSPIRACY_EFFECT_TYPES = [
  "grantResource", "stealResource", "extraDilemma",
  "forceDiscardConspiracy", "removePeg", "protectMajority"
];
```

- [ ] **Step 2: Add failing test** — append to `tests/content.test.js`

```js
import { CONSPIRACIES, CONSPIRACY_EFFECT_TYPES } from "../src/data/conspiracies.js";

test("conspiracies: unique ids and known effect types", () => {
  assert.ok(CONSPIRACIES.length >= 6);
  assert.equal(new Set(CONSPIRACIES.map((c) => c.id)).size, CONSPIRACIES.length);
  for (const c of CONSPIRACIES) {
    assert.ok(c.name && c.text, `${c.id} name/text`);
    assert.equal(typeof c.canInterrupt, "boolean", `${c.id} canInterrupt`);
    assert.ok(CONSPIRACY_EFFECT_TYPES.includes(c.effect.type), `${c.id} effect ${c.effect.type}`);
    assert.ok(c.effect.params && typeof c.effect.params === "object", `${c.id} params`);
  }
});
```

- [ ] **Step 3: Run and verify it passes**

Run: `node --test tests/content.test.js`
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add src/data/conspiracies.js tests/content.test.js
git -c user.name='pravar' -c user.email='shreyas@gibbous.io' commit -m "feat: conspiracy schema, 6 seed cards, validation"
```

---

## Task 8: Game state — `createGame`

**Files:**
- Create: `src/engine/state.js`, `tests/state.test.js`

- [ ] **Step 1: Write failing test** — `tests/state.test.js`

```js
import { test } from "node:test";
import assert from "node:assert/strict";
import { createGame } from "../src/engine/state.js";
import { ZONES } from "../src/data/map.js";

const PLAYERS = [{ name: "Asha", color: "#b3472f" }, { name: "Bman", color: "#2f6aa8" }];

test("createGame builds players with zeroed resources and piles", () => {
  const g = createGame({ players: PLAYERS, seed: 1 });
  assert.equal(g.players.length, 2);
  assert.deepEqual(g.players[0].resources, { funds: 0, clout: 0, media: 0, trust: 0 });
  assert.deepEqual(g.players[0].piles, { capitalist: 0, supremo: 0, showstopper: 0, idealist: 0 });
  assert.deepEqual(g.players[0].hand, []);
  assert.equal(g.players[0].id, 0);
});

test("createGame builds 9 empty unlocked zones", () => {
  const g = createGame({ players: PLAYERS, seed: 1 });
  assert.equal(g.zones.length, ZONES.length);
  for (const z of g.zones) { assert.deepEqual(z.pegs, {}); assert.equal(z.lockedBy, null); }
});

test("decks are shuffled deterministically by seed and contain all ids", () => {
  const a = createGame({ players: PLAYERS, seed: 5 });
  const b = createGame({ players: PLAYERS, seed: 5 });
  assert.deepEqual(a.decks.dilemmaDraw, b.decks.dilemmaDraw);
  const c = createGame({ players: PLAYERS, seed: 6 });
  assert.notDeepEqual(a.decks.dilemmaDraw, c.decks.dilemmaDraw); // overwhelmingly likely
});

test("turn starts at player 0, dilemma phase, no winner", () => {
  const g = createGame({ players: PLAYERS, seed: 1 });
  assert.deepEqual(g.turn, { current: 0, phase: "dilemma", pendingDilemma: null, gerrymanders: 0 });
  assert.equal(g.winner, null);
});
```

- [ ] **Step 2: Run and verify it fails**

Run: `node --test tests/state.test.js`
Expected: FAIL — cannot find `../src/engine/state.js`.

- [ ] **Step 3: Implement `src/engine/state.js`**

```js
import { makeRng, shuffle } from "./rng.js";
import { ZONES } from "../data/map.js";
import { DILEMMAS } from "../data/dilemmas.js";
import { CONSPIRACIES } from "../data/conspiracies.js";

export function createGame({ players, seed = 1 }) {
  const rng = makeRng(seed);
  return {
    seed,
    players: players.map((p, i) => ({
      id: i,
      name: p.name,
      color: p.color,
      resources: { funds: 0, clout: 0, media: 0, trust: 0 },
      piles: { capitalist: 0, supremo: 0, showstopper: 0, idealist: 0 },
      hand: [],
      usedThisTurn: {}
    })),
    zones: ZONES.map((z) => ({ id: z.id, pegs: {}, lockedBy: null })),
    decks: {
      dilemmaDraw: shuffle(DILEMMAS.map((d) => d.id), rng),
      dilemmaDiscard: [],
      conspiracyDraw: shuffle(CONSPIRACIES.map((c) => c.id), rng),
      conspiracyDiscard: []
    },
    turn: { current: 0, phase: "dilemma", pendingDilemma: null, gerrymanders: 0 },
    log: [],
    winner: null
  };
}

// Deep clone used by reducers to preserve purity (state is plain JSON-safe data).
export function clone(state) {
  return structuredClone(state);
}
```

- [ ] **Step 4: Run and verify it passes**

Run: `node --test tests/state.test.js`
Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
git add src/engine/state.js tests/state.test.js
git -c user.name='pravar' -c user.email='shreyas@gibbous.io' commit -m "feat: createGame initial state with seeded decks"
```

---

## Task 9: Rule predicates

**Files:**
- Create: `src/engine/rules.js`, `tests/rules.test.js`

Pure, read-only helpers used by actions and UI.

- [ ] **Step 1: Write failing test** — `tests/rules.test.js`

```js
import { test } from "node:test";
import assert from "node:assert/strict";
import { createGame } from "../src/engine/state.js";
import {
  pegCount, totalPegs, zoneCapacity, majorityThreshold, majorityHolder,
  isZoneFull, hasPresence, canPlaceInZone, neighborsOf, isGameOver, standings
} from "../src/engine/rules.js";

const P = [{ name: "A", color: "#1" }, { name: "B", color: "#2" }];
function withZone(g, zoneId, pegs, lockedBy = null) {
  const z = g.zones.find((z) => z.id === zoneId);
  z.pegs = pegs; z.lockedBy = lockedBy; return g;
}

test("zoneCapacity and majorityThreshold", () => {
  assert.equal(zoneCapacity("z0"), 5);
  assert.equal(majorityThreshold("z0"), 3);   // (5+1)/2
  assert.equal(majorityThreshold("z4"), 6);   // (11+1)/2
});

test("pegCount / totalPegs", () => {
  const g = withZone(createGame({ players: P, seed: 1 }), "z0", { 0: 2, 1: 1 });
  const z = g.zones.find((z) => z.id === "z0");
  assert.equal(pegCount(z, 0), 2);
  assert.equal(pegCount(z, 1), 1);
  assert.equal(totalPegs(z), 3);
});

test("majorityHolder returns player at/over threshold else null", () => {
  let g = withZone(createGame({ players: P, seed: 1 }), "z0", { 0: 3, 1: 1 });
  assert.equal(majorityHolder(g.zones.find((z) => z.id === "z0")), 0);
  g = withZone(createGame({ players: P, seed: 1 }), "z0", { 0: 2, 1: 2 });
  assert.equal(majorityHolder(g.zones.find((z) => z.id === "z0")), null);
});

test("isZoneFull when total pegs reach capacity", () => {
  const g = withZone(createGame({ players: P, seed: 1 }), "z0", { 0: 3, 1: 2 });
  assert.equal(isZoneFull(g.zones.find((z) => z.id === "z0")), true);
});

test("placement: first peg anywhere; then only own or adjacent zones; never locked/full", () => {
  let g = createGame({ players: P, seed: 1 });
  assert.equal(hasPresence(g, 0), false);
  assert.equal(canPlaceInZone(g, 0, "z8"), true);            // no presence -> anywhere
  g = withZone(g, "z0", { 0: 1 });
  assert.equal(hasPresence(g, 0), true);
  assert.equal(canPlaceInZone(g, 0, "z0"), true);            // own zone
  assert.equal(canPlaceInZone(g, 0, "z1"), true);            // neighbor of z0
  assert.equal(canPlaceInZone(g, 0, "z8"), false);           // not adjacent to presence
  g = withZone(g, "z1", { 1: 5 }, 1);                        // locked
  assert.equal(canPlaceInZone(g, 0, "z1"), false);
});

test("neighborsOf returns the map adjacency", () => {
  assert.deepEqual(neighborsOf("z0").sort(), ["z1", "z3", "z4"]);
});

test("isGameOver when every zone locked or full; standings rank by zones then pegs", () => {
  let g = createGame({ players: P, seed: 1 });
  assert.equal(isGameOver(g), false);
  for (const z of g.zones) z.lockedBy = 0;
  assert.equal(isGameOver(g), true);
  g.zones[0].lockedBy = 1; // give one to player 1
  const s = standings(g);
  assert.equal(s[0].playerId, 0);  // 8 zones
  assert.equal(s[0].zones, 8);
});
```

- [ ] **Step 2: Run and verify it fails**

Run: `node --test tests/rules.test.js`
Expected: FAIL — cannot find `../src/engine/rules.js`.

- [ ] **Step 3: Implement `src/engine/rules.js`**

```js
import { ZONE_BY_ID } from "../data/map.js";

export const zoneCapacity = (zoneId) => ZONE_BY_ID[zoneId].capacity;
export const majorityThreshold = (zoneId) => (ZONE_BY_ID[zoneId].capacity + 1) / 2;
export const neighborsOf = (zoneId) => ZONE_BY_ID[zoneId].neighbors;

export const pegCount = (zone, playerId) => zone.pegs[playerId] || 0;
export const totalPegs = (zone) => Object.values(zone.pegs).reduce((s, n) => s + n, 0);
export const isZoneFull = (zone) => totalPegs(zone) >= zoneCapacity(zone.id);

export function majorityHolder(zone) {
  const need = majorityThreshold(zone.id);
  for (const [pid, n] of Object.entries(zone.pegs)) if (n >= need) return Number(pid);
  return null;
}

export const hasPresence = (state, playerId) =>
  state.zones.some((z) => pegCount(z, playerId) > 0);

export function canPlaceInZone(state, playerId, zoneId) {
  const zone = state.zones.find((z) => z.id === zoneId);
  if (!zone || zone.lockedBy !== null || isZoneFull(zone)) return false;
  if (!hasPresence(state, playerId)) return true;
  if (pegCount(zone, playerId) > 0) return true;
  return neighborsOf(zoneId).some((nId) => {
    const n = state.zones.find((z) => z.id === nId);
    return pegCount(n, playerId) > 0;
  });
}

export const isGameOver = (state) =>
  state.zones.every((z) => z.lockedBy !== null || isZoneFull(z));

export function standings(state) {
  const rows = state.players.map((p) => ({
    playerId: p.id,
    name: p.name,
    zones: state.zones.filter((z) => z.lockedBy === p.id).length,
    pegs: state.zones.reduce((s, z) => s + pegCount(z, p.id), 0)
  }));
  rows.sort((a, b) => b.zones - a.zones || b.pegs - a.pegs);
  return rows;
}
```

- [ ] **Step 4: Run and verify it passes**

Run: `node --test tests/rules.test.js`
Expected: PASS (7 tests).

- [ ] **Step 5: Commit**

```bash
git add src/engine/rules.js tests/rules.test.js
git -c user.name='pravar' -c user.email='shreyas@gibbous.io' commit -m "feat: rule predicates (majority, adjacency, placement, game over)"
```

---

## Task 10: Core actions — beginTurn, answerDilemma, endTurn

**Files:**
- Create: `src/engine/actions.js`, `tests/actions.test.js`

Reducers are pure: they `clone` then mutate the copy and return it; they throw `Error` on illegal calls. `beginTurn` applies start-of-turn powers (Idealist tier-1 grants +1 trust) and draws a dilemma. Deck auto-reshuffles from discard when empty.

- [ ] **Step 1: Write failing test** — `tests/actions.test.js`

```js
import { test } from "node:test";
import assert from "node:assert/strict";
import { createGame } from "../src/engine/state.js";
import { beginTurn, answerDilemma, endTurn } from "../src/engine/actions.js";
import { DILEMMA_BY_ID } from "../src/data/dilemmas.js";

const P = [{ name: "A", color: "#1" }, { name: "B", color: "#2" }];

test("beginTurn draws a dilemma and sets phase to dilemma", () => {
  const g = beginTurn(createGame({ players: P, seed: 1 }));
  assert.ok(g.turn.pendingDilemma);
  assert.equal(g.turn.phase, "dilemma");
  assert.equal(g.decks.dilemmaDraw.length, DILEMMA_BY_ID ? g.decks.dilemmaDraw.length : 0);
});

test("answerDilemma applies payout, increments pile, advances to actions", () => {
  let g = beginTurn(createGame({ players: P, seed: 1 }));
  const card = DILEMMA_BY_ID[g.turn.pendingDilemma];
  const ans = card.answers[0];
  g = answerDilemma(g, { answerIndex: 0 });
  for (const [r, n] of Object.entries(ans.payout)) assert.equal(g.players[0].resources[r], n);
  assert.equal(g.players[0].piles[ans.ideology], 1);
  assert.equal(g.turn.phase, "actions");
  assert.equal(g.turn.pendingDilemma, null);
});

test("answerDilemma throws if not in dilemma phase", () => {
  let g = beginTurn(createGame({ players: P, seed: 1 }));
  g = answerDilemma(g, { answerIndex: 0 });
  assert.throws(() => answerDilemma(g, { answerIndex: 0 }), /phase/);
});

test("endTurn advances to next player and begins their turn", () => {
  let g = beginTurn(createGame({ players: P, seed: 1 }));
  g = answerDilemma(g, { answerIndex: 0 });
  g = endTurn(g);
  assert.equal(g.turn.current, 1);
  assert.equal(g.turn.phase, "dilemma");
  assert.ok(g.turn.pendingDilemma);
});

test("endTurn throws during dilemma phase", () => {
  const g = beginTurn(createGame({ players: P, seed: 1 }));
  assert.throws(() => endTurn(g), /phase/);
});

test("Idealist tier-1 grants +1 trust at start of turn", () => {
  let g = createGame({ players: P, seed: 1 });
  g.players[0].piles.idealist = 2;           // tier 1 unlocked
  g = beginTurn(g);
  assert.equal(g.players[0].resources.trust, 1);
});

test("usedThisTurn resets at the start of a turn", () => {
  let g = beginTurn(createGame({ players: P, seed: 1 }));
  g.players[0].usedThisTurn["capitalist:t1"] = true;
  g = answerDilemma(g, { answerIndex: 0 });
  g = endTurn(g);                            // -> player 1
  g = answerDilemma(g, { answerIndex: 0 });
  g = endTurn(g);                            // -> player 0 again, beginTurn ran
  assert.deepEqual(g.players[0].usedThisTurn, {});
});
```

- [ ] **Step 2: Run and verify it fails**

Run: `node --test tests/actions.test.js`
Expected: FAIL — cannot find `../src/engine/actions.js`.

- [ ] **Step 3: Implement `src/engine/actions.js`** (this file grows in Tasks 11–13)

```js
import { clone } from "./state.js";
import { shuffle, makeRng } from "./rng.js";
import { tierOf } from "./constants.js";
import { DILEMMA_BY_ID } from "../data/dilemmas.js";
import { isGameOver } from "./rules.js";

// --- deck helpers -----------------------------------------------------------
function drawDilemma(state) {
  if (state.decks.dilemmaDraw.length === 0) {
    const rng = makeRng(state.seed + state.log.length + 1);
    state.decks.dilemmaDraw = shuffle(state.decks.dilemmaDiscard, rng);
    state.decks.dilemmaDiscard = [];
  }
  return state.decks.dilemmaDraw.shift();
}

// --- turn lifecycle ---------------------------------------------------------
export function beginTurn(state) {
  const s = clone(state);
  const p = s.players[s.turn.current];
  p.usedThisTurn = {};
  if (tierOf(p.piles.idealist) >= 1) { p.resources.trust += 1; }
  s.turn.pendingDilemma = drawDilemma(s);
  s.turn.phase = "dilemma";
  s.turn.gerrymanders = 0;
  return s;
}

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
  s.turn.phase = "actions";
  s.log.push(`${p.name} chose "${answer.label}"`);
  return s;
}

export function endTurn(state) {
  if (state.turn.phase !== "actions") throw new Error("can only end turn in actions phase");
  let s = clone(state);
  if (isGameOver(s)) { return finishGame(s); }
  s.turn.current = (s.turn.current + 1) % s.players.length;
  return beginTurn(s);
}

export function finishGame(state) {
  const s = clone(state);
  // standings imported lazily to avoid cycle at module top
  const ranked = [...s.players].map((p) => ({
    id: p.id,
    zones: s.zones.filter((z) => z.lockedBy === p.id).length,
    pegs: s.zones.reduce((t, z) => t + (z.pegs[p.id] || 0), 0)
  })).sort((a, b) => b.zones - a.zones || b.pegs - a.pegs);
  s.winner = ranked[0].id;
  s.turn.phase = "gameover";
  s.log.push(`Game over — winner is ${s.players[s.winner].name}`);
  return s;
}
```

- [ ] **Step 4: Run and verify it passes**

Run: `node --test tests/actions.test.js`
Expected: PASS (7 tests).

- [ ] **Step 5: Commit**

```bash
git add src/engine/actions.js tests/actions.test.js
git -c user.name='pravar' -c user.email='shreyas@gibbous.io' commit -m "feat: turn lifecycle actions (begin/answer/end/finish)"
```

---

## Task 11: Voter purchase, peg placement, majority lock, gerrymander

**Files:**
- Modify: `src/engine/actions.js`; Modify: `tests/actions.test.js`

`buyVoter` deducts an offer's cost, places `value` pegs into one legal zone, then locks the zone and grants a gerrymander if the active player now holds a majority. `gerrymander` moves one **non-majority** peg from one zone to an adjacent zone (capacity-permitting) and decrements the grant; it re-detects locks but grants no further gerrymanders.

- [ ] **Step 1: Add failing tests** — append to `tests/actions.test.js`

```js
import { buyVoter, gerrymander } from "../src/engine/actions.js";

function giveResources(g, pid, res) { Object.assign(g.players[pid].resources, res); return g; }

test("buyVoter deducts cost and places pegs in a legal zone", () => {
  let g = beginTurn(createGame({ players: P, seed: 1 }));
  g = answerDilemma(g, { answerIndex: 0 });
  g = giveResources(g, 0, { funds: 9, clout: 9, media: 9, trust: 9 });
  g = buyVoter(g, { offerId: "v1", zoneId: "z4" });    // v1: value 1, cost trust1+media1
  const z4 = g.zones.find((z) => z.id === "z4");
  assert.equal(z4.pegs[0], 1);
  assert.equal(g.players[0].resources.trust, 8);
  assert.equal(g.players[0].resources.media, 8);
});

test("buyVoter throws when unaffordable or illegal placement", () => {
  let g = beginTurn(createGame({ players: P, seed: 1 }));
  g = answerDilemma(g, { answerIndex: 0 });
  assert.throws(() => buyVoter(g, { offerId: "v3", zoneId: "z4" }), /afford/);
  g = giveResources(g, 0, { funds: 9, clout: 9, media: 9, trust: 9 });
  g.zones.find((z) => z.id === "z0").lockedBy = 1;
  assert.throws(() => buyVoter(g, { offerId: "v1", zoneId: "z0" }), /place/);
});

test("buyVoter locks zone and grants a gerrymander on reaching majority", () => {
  let g = beginTurn(createGame({ players: P, seed: 1 }));
  g = answerDilemma(g, { answerIndex: 0 });
  g = giveResources(g, 0, { funds: 99, clout: 99, media: 99, trust: 99 });
  // z6 capacity 5, threshold 3. Place value-3 then value-... use v2(2)+v1(1) = 3 pegs.
  g = buyVoter(g, { offerId: "v2", zoneId: "z6" });    // 2 pegs
  g = buyVoter(g, { offerId: "v1", zoneId: "z6" });    // +1 => 3 pegs == threshold
  const z6 = g.zones.find((z) => z.id === "z6");
  assert.equal(z6.lockedBy, 0);
  assert.equal(g.turn.gerrymanders, 1);
});

test("Supremo tier-1 grants an extra gerrymander on lock", () => {
  let g = beginTurn(createGame({ players: P, seed: 1 }));
  g = answerDilemma(g, { answerIndex: 0 });
  g.players[0].piles.supremo = 2;                       // tier 1
  g = giveResources(g, 0, { funds: 99, clout: 99, media: 99, trust: 99 });
  g = buyVoter(g, { offerId: "v2", zoneId: "z6" });
  g = buyVoter(g, { offerId: "v1", zoneId: "z6" });
  assert.equal(g.turn.gerrymanders, 2);
});

test("gerrymander moves one non-majority peg to an adjacent zone and decrements", () => {
  let g = beginTurn(createGame({ players: P, seed: 1 }));
  g = answerDilemma(g, { answerIndex: 0 });
  // set up: opponent has 1 non-majority peg in z7 (neighbor of z6); player just locked z6
  g.zones.find((z) => z.id === "z7").pegs = { 1: 1 };
  g.turn.gerrymanders = 1;
  g = gerrymander(g, { fromZone: "z7", toZone: "z6", pegOwner: 1 });
  assert.equal((g.zones.find((z) => z.id === "z7").pegs[1] || 0), 0);
  assert.equal(g.zones.find((z) => z.id === "z6").pegs[1], 1);
  assert.equal(g.turn.gerrymanders, 0);
});

test("gerrymander throws without a grant, across non-neighbors, or on a majority peg", () => {
  let g = beginTurn(createGame({ players: P, seed: 1 }));
  g = answerDilemma(g, { answerIndex: 0 });
  g.zones.find((z) => z.id === "z7").pegs = { 1: 1 };
  assert.throws(() => gerrymander(g, { fromZone: "z7", toZone: "z6", pegOwner: 1 }), /no gerrymander/);
  g.turn.gerrymanders = 1;
  assert.throws(() => gerrymander(g, { fromZone: "z7", toZone: "z0", pegOwner: 1 }), /adjacent/);
  g.zones.find((z) => z.id === "z7").pegs = { 1: 5 };  // majority peg block
  assert.throws(() => gerrymander(g, { fromZone: "z7", toZone: "z6", pegOwner: 1 }), /non-majority/);
});
```

- [ ] **Step 2: Run and verify they fail**

Run: `node --test tests/actions.test.js`
Expected: FAIL — `buyVoter`/`gerrymander` not exported.

- [ ] **Step 3: Extend `src/engine/actions.js`** — add imports and functions

Add to the imports at the top:

```js
import { VOTER_BY_ID } from "../data/voters.js";
import {
  canPlaceInZone, majorityHolder, majorityThreshold, neighborsOf,
  isZoneFull, totalPegs, zoneCapacity
} from "./rules.js";
```

Append these functions:

```js
function canAfford(player, cost) {
  return Object.entries(cost).every(([r, n]) => player.resources[r] >= n);
}

function relockZones(state) {
  // set lockedBy for any zone that now has a majority and isn't locked
  for (const z of state.zones) {
    if (z.lockedBy === null) {
      const holder = majorityHolder(z);
      if (holder !== null) z.lockedBy = holder;
    }
  }
}

export function buyVoter(state, { offerId, zoneId }) {
  if (state.turn.phase !== "actions") throw new Error("buy only in actions phase");
  const offer = VOTER_BY_ID[offerId];
  if (!offer) throw new Error("unknown voter offer");
  const s = clone(state);
  const p = s.players[s.turn.current];
  if (!canAfford(p, offer.cost)) throw new Error("cannot afford voter");
  if (!canPlaceInZone(s, p.id, zoneId)) throw new Error("cannot place in that zone");
  const zone = s.zones.find((z) => z.id === zoneId);
  if (totalPegs(zone) + offer.value > zoneCapacity(zoneId)) throw new Error("exceeds zone capacity");

  for (const [r, n] of Object.entries(offer.cost)) p.resources[r] -= n;
  zone.pegs[p.id] = (zone.pegs[p.id] || 0) + offer.value;
  s.log.push(`${p.name} placed ${offer.value} in ${zoneId}`);

  if (zone.lockedBy === null && majorityHolder(zone) === p.id) {
    zone.lockedBy = p.id;
    let grants = 1;
    if (tierOf(p.piles.supremo) >= 1) grants += 1;   // Supremo T1
    s.turn.gerrymanders += grants;
    s.log.push(`${p.name} locked ${zoneId}`);
  }
  return s;
}

export function gerrymander(state, { fromZone, toZone, pegOwner }) {
  if (state.turn.gerrymanders <= 0) throw new Error("no gerrymander available");
  if (!neighborsOf(fromZone).includes(toZone)) throw new Error("zones not adjacent");
  const s = clone(state);
  const from = s.zones.find((z) => z.id === fromZone);
  const to = s.zones.find((z) => z.id === toZone);
  if ((from.pegs[pegOwner] || 0) <= 0) throw new Error("no such peg to move");
  if ((from.pegs[pegOwner] || 0) >= majorityThreshold(fromZone)) throw new Error("cannot move a non-majority peg from a majority stack");
  if (isZoneFull(to)) throw new Error("destination full");

  from.pegs[pegOwner] -= 1;
  if (from.pegs[pegOwner] === 0) delete from.pegs[pegOwner];
  to.pegs[pegOwner] = (to.pegs[pegOwner] || 0) + 1;
  s.turn.gerrymanders -= 1;
  s.log.push(`gerrymander: moved a ${s.players[pegOwner].name} peg ${fromZone}→${toZone}`);
  relockZones(s);   // a forced move may create a new majority; lock it (no new grants)
  return s;
}
```

- [ ] **Step 4: Run and verify it passes**

Run: `node --test tests/actions.test.js`
Expected: PASS (all actions tests).

- [ ] **Step 5: Commit**

```bash
git add src/engine/actions.js tests/actions.test.js
git -c user.name='pravar' -c user.email='shreyas@gibbous.io' commit -m "feat: voter purchase, peg placement, majority lock, gerrymander"
```

---

## Task 12: Conspiracy buy/play + effect resolvers

**Files:**
- Create: `src/engine/conspiracies.js`, `tests/conspiracies.test.js`; Modify: `src/engine/actions.js`

`buyConspiracy` deducts a generic spend (total 4–5, or 3+ with Showstopper tier-2) of the player's chosen resources and draws a card blind into the hand. `playConspiracy` removes a held card and applies its effect via a resolver registry keyed by `effect.type`. Each resolver: `(state, ctx, params) → void` (mutating the already-cloned state); `ctx = { actorId, target }` where `target` is UI-supplied selection data.

- [ ] **Step 1: Write failing test** — `tests/conspiracies.test.js`

```js
import { test } from "node:test";
import assert from "node:assert/strict";
import { createGame } from "../src/engine/state.js";
import { beginTurn, answerDilemma, buyConspiracy, playConspiracy } from "../src/engine/actions.js";

const P = [{ name: "A", color: "#1" }, { name: "B", color: "#2" }];
function ready(seed = 1) { return answerDilemma(beginTurn(createGame({ players: P, seed })), { answerIndex: 0 }); }
function give(g, pid, res) { Object.assign(g.players[pid].resources, res); return g; }

test("buyConspiracy spends 4-5 chosen resources and draws into hand", () => {
  let g = give(ready(), 0, { funds: 5, clout: 5, media: 5, trust: 5 });
  const before = g.players[0].hand.length;
  g = buyConspiracy(g, { spend: { funds: 2, clout: 2 } });   // total 4
  assert.equal(g.players[0].hand.length, before + 1);
  assert.equal(g.players[0].resources.funds, 3);
  assert.equal(g.players[0].resources.clout, 3);
});

test("buyConspiracy rejects spend below 4 (no Showstopper) or above 5", () => {
  let g = give(ready(), 0, { funds: 9, clout: 9, media: 9, trust: 9 });
  assert.throws(() => buyConspiracy(g, { spend: { funds: 3 } }), /spend/);
  assert.throws(() => buyConspiracy(g, { spend: { funds: 6 } }), /spend/);
});

test("Showstopper tier-2 allows a minimum spend of 3", () => {
  let g = give(ready(), 0, { funds: 9, clout: 9, media: 9, trust: 9 });
  g.players[0].piles.showstopper = 3;     // tier 2
  g = buyConspiracy(g, { spend: { funds: 3 } });
  assert.equal(g.players[0].resources.funds, 6);
});

test("playConspiracy grantResource adds resources and discards the card", () => {
  let g = give(ready(), 0, { funds: 0, clout: 0, media: 0, trust: 0 });
  g.players[0].hand = ["c001"];           // War Chest: +3 funds
  g = playConspiracy(g, { cardId: "c001" });
  assert.equal(g.players[0].resources.funds, 3);
  assert.ok(!g.players[0].hand.includes("c001"));
  assert.ok(g.decks.conspiracyDiscard.includes("c001"));
});

test("playConspiracy stealResource moves resources from target to actor", () => {
  let g = ready();
  g.players[0].hand = ["c002"];           // Smear: steal 2 media
  g.players[1].resources.media = 5;
  g = playConspiracy(g, { cardId: "c002", target: { playerId: 1 } });
  assert.equal(g.players[1].resources.media, 3);
  assert.equal(g.players[0].resources.media, 2);
});

test("playConspiracy removePeg removes a non-majority peg from a zone", () => {
  let g = ready();
  g.players[0].hand = ["c005"];           // Booth Capture
  g.zones.find((z) => z.id === "z4").pegs = { 1: 2 };
  g = playConspiracy(g, { cardId: "c005", target: { zoneId: "z4", pegOwner: 1 } });
  assert.equal((g.zones.find((z) => z.id === "z4").pegs[1] || 0), 1);
});

test("playConspiracy throws if card not in hand", () => {
  let g = ready();
  assert.throws(() => playConspiracy(g, { cardId: "c001" }), /not in hand/);
});
```

- [ ] **Step 2: Run and verify it fails**

Run: `node --test tests/conspiracies.test.js`
Expected: FAIL — functions not exported.

- [ ] **Step 3: Implement `src/engine/conspiracies.js`** (resolver registry)

```js
import { majorityThreshold } from "./rules.js";

// Each resolver mutates the (already cloned) state in place.
export const RESOLVERS = {
  grantResource(state, ctx, params) {
    state.players[ctx.actorId].resources[params.resource] += params.amount;
  },
  stealResource(state, ctx, params) {
    const victim = state.players[ctx.target.playerId];
    const taken = Math.min(victim.resources[params.resource], params.amount);
    victim.resources[params.resource] -= taken;
    state.players[ctx.actorId].resources[params.resource] += taken;
  },
  extraDilemma(state, ctx) {
    // signal the UI/main loop to draw an extra dilemma this turn
    state.turn.pendingExtraDilemma = true;
  },
  forceDiscardConspiracy(state, ctx) {
    const victim = state.players[ctx.target.playerId];
    if (victim.hand.length === 0) return;
    const idx = ctx.target.cardIndex ?? 0;
    const [card] = victim.hand.splice(idx, 1);
    state.decks.conspiracyDiscard.push(card);
  },
  removePeg(state, ctx) {
    const zone = state.zones.find((z) => z.id === ctx.target.zoneId);
    const owner = ctx.target.pegOwner;
    if ((zone.pegs[owner] || 0) >= majorityThreshold(zone.id)) throw new Error("cannot remove a majority peg");
    if (!zone.pegs[owner]) throw new Error("no such peg");
    zone.pegs[owner] -= 1;
    if (zone.pegs[owner] === 0) delete zone.pegs[owner];
  },
  protectMajority(state, ctx) {
    const zone = state.zones.find((z) => z.id === ctx.target.zoneId);
    zone.protected = true;   // honored by removePeg/flip effects via guard below
  }
};

export function resolveEffect(state, effect, ctx) {
  const fn = RESOLVERS[effect.type];
  if (!fn) throw new Error(`no resolver for ${effect.type}`);
  fn(state, ctx, effect.params || {});
}
```

Add a guard at the top of `removePeg` (and any future peg-removal) so `protectMajority` is honored:

```js
  removePeg(state, ctx) {
    const zone = state.zones.find((z) => z.id === ctx.target.zoneId);
    if (zone.protected && zone.lockedBy !== null) throw new Error("zone is protected");
    const owner = ctx.target.pegOwner;
    if ((zone.pegs[owner] || 0) >= majorityThreshold(zone.id)) throw new Error("cannot remove a majority peg");
    if (!zone.pegs[owner]) throw new Error("no such peg");
    zone.pegs[owner] -= 1;
    if (zone.pegs[owner] === 0) delete zone.pegs[owner];
  },
```

- [ ] **Step 4: Extend `src/engine/actions.js`** — add conspiracy actions

Add imports:

```js
import { CONSPIRACY_BY_ID } from "../data/conspiracies.js";
import { resolveEffect } from "./conspiracies.js";
```

Add helper and actions:

```js
function drawConspiracy(state) {
  if (state.decks.conspiracyDraw.length === 0) {
    const rng = makeRng(state.seed + state.log.length + 7);
    state.decks.conspiracyDraw = shuffle(state.decks.conspiracyDiscard, rng);
    state.decks.conspiracyDiscard = [];
  }
  return state.decks.conspiracyDraw.shift();
}

export function buyConspiracy(state, { spend }) {
  if (state.turn.phase !== "actions") throw new Error("buy only in actions phase");
  const s = clone(state);
  const p = s.players[s.turn.current];
  const total = Object.values(spend).reduce((a, b) => a + b, 0);
  const min = tierOf(p.piles.showstopper) >= 2 ? 3 : 4;   // Showstopper T2
  if (total < min || total > 5) throw new Error(`spend must total ${min}-5`);
  for (const [r, n] of Object.entries(spend)) {
    if (p.resources[r] < n) throw new Error("cannot afford spend");
  }
  for (const [r, n] of Object.entries(spend)) p.resources[r] -= n;
  const card = drawConspiracy(s);
  if (card) p.hand.push(card);
  s.log.push(`${p.name} bought a conspiracy`);
  return s;
}

export function playConspiracy(state, { cardId, target, actorId }) {
  const s = clone(state);
  const actor = actorId ?? s.turn.current;
  const p = s.players[actor];
  const idx = p.hand.indexOf(cardId);
  if (idx === -1) throw new Error("card not in hand");
  const card = CONSPIRACY_BY_ID[cardId];
  resolveEffect(s, card.effect, { actorId: actor, target: target || {} });
  p.hand.splice(idx, 1);
  s.decks.conspiracyDiscard.push(cardId);
  s.log.push(`${p.name} played ${card.name}`);
  return s;
}
```

- [ ] **Step 5: Run and verify both test files pass**

Run: `node --test`
Expected: PASS across all suites.

- [ ] **Step 6: Commit**

```bash
git add src/engine/conspiracies.js src/engine/actions.js tests/conspiracies.test.js
git -c user.name='pravar' -c user.email='shreyas@gibbous.io' commit -m "feat: conspiracy buy/play with effect resolvers"
```

---

## Task 13: Archetype active powers

**Files:**
- Create: `src/engine/archetypes.js`, `tests/archetypes.test.js`; Modify: `src/engine/actions.js`

Tiered powers split into **passive** (already wired: Idealist T1 trust in `beginTurn`, Supremo T1 gerrymander and Showstopper T2 discount in their actions) and **active** powers invoked via `usePower(state, { ideology, tier, params })`. This task implements the active ones: Capitalist T1 (voter discount, applied as a flag consumed by `buyVoter`), Capitalist T2 (convert), Supremo T2 (remove opponent peg), Idealist T3 (sway adjacent peg), Showstopper T1 (draw 2 dilemmas pick 1). Each respects `usedThisTurn`.

`src/engine/archetypes.js` documents the power table; the executable logic lives in `usePower` within `actions.js` (so it can mutate turn/deck state uniformly).

- [ ] **Step 1: Write `src/engine/archetypes.js`** (declarative table for UI labels)

```js
// Reference table for UI rendering. Logic is enforced in actions.usePower / passives.
export const POWERS = {
  capitalist: {
    name: "The Capitalist",
    tiers: {
      1: { key: "capitalist:t1", label: "Bankroll", desc: "Once/turn: next voter card costs 1 less (min 1).", active: true },
      2: { key: "capitalist:t2", label: "Liquidate", desc: "Once/turn: convert 3 funds → any 2 resources.", active: true },
      3: { key: "capitalist:t3", label: "Open Market", desc: "Place voters in any zone (ignore adjacency).", active: false }
    }
  },
  supremo: {
    name: "The Supremo",
    tiers: {
      1: { key: "supremo:t1", label: "Strongarm", desc: "+1 gerrymander whenever you lock a majority.", active: false },
      2: { key: "supremo:t2", label: "Intimidate", desc: "Once/turn: remove an opponent's non-majority peg from a zone you're in.", active: true },
      3: { key: "supremo:t3", label: "Iron Grip", desc: "Your majorities can't be flipped by conspiracies.", active: false }
    }
  },
  showstopper: {
    name: "The Showstopper",
    tiers: {
      1: { key: "showstopper:t1", label: "Spin", desc: "Draw 2 dilemmas, keep 1.", active: true },
      2: { key: "showstopper:t2", label: "Cheap Seats", desc: "Conspiracies may be bought for as few as 3 resources.", active: false },
      3: { key: "showstopper:t3", label: "Encore", desc: "Once/game: copy a conspiracy as it's played.", active: true }
    }
  },
  idealist: {
    name: "The Idealist",
    tiers: {
      1: { key: "idealist:t1", label: "Grassroots", desc: "+1 trust at the start of your turn.", active: false },
      2: { key: "idealist:t2", label: "Mandate", desc: "You win ties for zone majority.", active: false },
      3: { key: "idealist:t3", label: "Sway", desc: "Once/turn: turn one neighboring non-majority peg into yours.", active: true }
    }
  }
};
```

- [ ] **Step 2: Write failing test** — `tests/archetypes.test.js`

```js
import { test } from "node:test";
import assert from "node:assert/strict";
import { createGame } from "../src/engine/state.js";
import { beginTurn, answerDilemma, usePower, buyVoter } from "../src/engine/actions.js";

const P = [{ name: "A", color: "#1" }, { name: "B", color: "#2" }];
function ready(seed = 1) { return answerDilemma(beginTurn(createGame({ players: P, seed })), { answerIndex: 0 }); }
function give(g, pid, res) { Object.assign(g.players[pid].resources, res); return g; }

test("Capitalist T2 converts 3 funds into 2 chosen resources, once per turn", () => {
  let g = give(ready(), 0, { funds: 3 });
  g.players[0].piles.capitalist = 3;   // tier 2
  g = usePower(g, { ideology: "capitalist", tier: 2, params: { gain: { media: 1, trust: 1 } } });
  assert.equal(g.players[0].resources.funds, 0);
  assert.equal(g.players[0].resources.media, 1);
  assert.equal(g.players[0].resources.trust, 1);
  assert.throws(() => usePower(g, { ideology: "capitalist", tier: 2, params: { gain: { media: 2 } } }), /already used/);
});

test("Capitalist T1 discount makes the next voter cost 1 less", () => {
  let g = give(ready(), 0, { trust: 1, media: 0 });   // v1 normally needs trust1+media1
  g.players[0].piles.capitalist = 2;   // tier 1
  g = usePower(g, { ideology: "capitalist", tier: 1, params: {} });
  g = buyVoter(g, { offerId: "v1", zoneId: "z4" });    // discount waives 1 resource
  assert.equal(g.zones.find((z) => z.id === "z4").pegs[0], 1);
});

test("Supremo T2 removes an opponent non-majority peg from a zone you're in", () => {
  let g = ready();
  g.players[0].piles.supremo = 3;   // tier 2
  const z = g.zones.find((z) => z.id === "z4");
  z.pegs = { 0: 1, 1: 2 };
  g = usePower(g, { ideology: "supremo", tier: 2, params: { zoneId: "z4", pegOwner: 1 } });
  assert.equal(g.zones.find((z) => z.id === "z4").pegs[1], 1);
});

test("usePower throws when tier not unlocked", () => {
  let g = ready();
  assert.throws(() => usePower(g, { ideology: "supremo", tier: 2, params: { zoneId: "z4", pegOwner: 1 } }), /not unlocked/);
});

test("Idealist T3 sways one neighboring non-majority peg to you", () => {
  let g = ready();
  g.players[0].piles.idealist = 5;   // tier 3
  g.zones.find((z) => z.id === "z4").pegs = { 0: 1 };  // presence
  g.zones.find((z) => z.id === "z5").pegs = { 1: 1 };  // neighbor with opp peg
  g = usePower(g, { ideology: "idealist", tier: 3, params: { zoneId: "z5", pegOwner: 1 } });
  const z5 = g.zones.find((z) => z.id === "z5");
  assert.equal((z5.pegs[1] || 0), 0);
  assert.equal(z5.pegs[0], 1);
});
```

- [ ] **Step 3: Run and verify it fails**

Run: `node --test tests/archetypes.test.js`
Expected: FAIL — `usePower` not exported.

- [ ] **Step 4: Extend `src/engine/actions.js`** — add `usePower` and discount hook

`neighborsOf` and `majorityThreshold` are already imported from `./rules.js` in Task 11 — reuse them; add no new imports.

Add the discount consumption inside `buyVoter`, right after computing `offer` cost and before `canAfford`. Replace the affordability/deduction block in `buyVoter` with discount-aware logic:

```js
  // discount: Capitalist T1 sets p.usedThisTurn["capitalist:discountReady"]
  let cost = { ...offer.cost };
  if (p.usedThisTurn["capitalist:discountReady"]) {
    // waive one unit of the single largest cost resource (min total stays >=1)
    const entries = Object.entries(cost).sort((a, b) => b[1] - a[1]);
    if (entries.length) {
      const [r] = entries[0];
      cost[r] = Math.max(0, cost[r] - 1);
      if (cost[r] === 0) delete cost[r];
    }
    delete p.usedThisTurn["capitalist:discountReady"];
  }
  if (!canAfford(p, cost)) throw new Error("cannot afford voter");
  if (!canPlaceInZone(s, p.id, zoneId)) throw new Error("cannot place in that zone");
  const zone = s.zones.find((z) => z.id === zoneId);
  if (totalPegs(zone) + offer.value > zoneCapacity(zoneId)) throw new Error("exceeds zone capacity");
  for (const [r, n] of Object.entries(cost)) p.resources[r] -= n;
```

(Remove the old `if (!canAfford(p, offer.cost)) ...` and the old deduction loop that used `offer.cost`.)

Append `usePower`:

```js
export function usePower(state, { ideology, tier, params = {} }) {
  const s = clone(state);
  const p = s.players[s.turn.current];
  if (tierOf(p.piles[ideology]) < tier) throw new Error("power not unlocked");
  const key = `${ideology}:t${tier}`;
  const onceKeys = ["capitalist:t1", "capitalist:t2", "supremo:t2", "idealist:t3"];
  if (onceKeys.includes(key) && p.usedThisTurn[key]) throw new Error("power already used this turn");

  if (key === "capitalist:t1") {
    p.usedThisTurn["capitalist:discountReady"] = true;
  } else if (key === "capitalist:t2") {
    if (p.resources.funds < 3) throw new Error("need 3 funds");
    const gain = params.gain || {};
    if (Object.values(gain).reduce((a, b) => a + b, 0) !== 2) throw new Error("must gain exactly 2");
    p.resources.funds -= 3;
    for (const [r, n] of Object.entries(gain)) p.resources[r] += n;
  } else if (key === "supremo:t2") {
    const zone = s.zones.find((z) => z.id === params.zoneId);
    if (!zone || (zone.pegs[p.id] || 0) <= 0) throw new Error("need presence in zone");
    if ((zone.pegs[params.pegOwner] || 0) >= majorityThreshold(params.zoneId)) throw new Error("cannot remove a majority peg");
    if (!zone.pegs[params.pegOwner]) throw new Error("no such peg");
    zone.pegs[params.pegOwner] -= 1;
    if (zone.pegs[params.pegOwner] === 0) delete zone.pegs[params.pegOwner];
  } else if (key === "idealist:t3") {
    const zone = s.zones.find((z) => z.id === params.zoneId);
    const adjacentToPresence = neighborsOf(params.zoneId).some((nId) => (s.zones.find((z) => z.id === nId).pegs[p.id] || 0) > 0);
    if (!adjacentToPresence) throw new Error("zone must neighbor your presence");
    if ((zone.pegs[params.pegOwner] || 0) >= majorityThreshold(params.zoneId)) throw new Error("cannot sway a majority peg");
    if (!zone.pegs[params.pegOwner]) throw new Error("no such peg");
    zone.pegs[params.pegOwner] -= 1;
    if (zone.pegs[params.pegOwner] === 0) delete zone.pegs[params.pegOwner];
    zone.pegs[p.id] = (zone.pegs[p.id] || 0) + 1;
  } else if (key === "showstopper:t1") {
    // handled in UI/main loop (offers a choice of two drawn dilemmas); no-op here
    throw new Error("showstopper:t1 is resolved by the turn loop, not usePower");
  } else {
    throw new Error("not an active power");
  }

  if (onceKeys.includes(key)) p.usedThisTurn[key] = true;
  s.log.push(`${p.name} used ${key}`);
  return s;
}
```

- [ ] **Step 5: Run the full suite**

Run: `node --test`
Expected: PASS across all suites (archetypes + earlier voter tests still green).

- [ ] **Step 6: Commit**

```bash
git add src/engine/archetypes.js src/engine/actions.js tests/archetypes.test.js
git -c user.name='pravar' -c user.email='shreyas@gibbous.io' commit -m "feat: archetype active powers (convert, discount, intimidate, sway)"
```

---

## Task 14: Expand dilemma deck to ~60 cards

**Files:**
- Modify: `src/data/dilemmas.js`

This is **content authoring**, gated by the Task 6 validation test. "Done" = ≥ 60 unique dilemmas, all green.

- [ ] **Step 1: Author ~52 additional original dilemmas** following the exact schema of the 8 seed cards. Spread themes (economy, security, civil liberties, media/press, environment, identity, public health, corruption) and balance ideology coverage so each of `capitalist/supremo/showstopper/idealist` is the chosen pile on a comparable number of answers. Each answer's `payout` must be dominant in its ideology resource (the validation enforces this). Keep all text original — do not reproduce real SHASN cards.

- [ ] **Step 2: Update the count assertion** in `tests/content.test.js` from `>= 8` to `>= 60`:

```js
  assert.ok(DILEMMAS.length >= 60);
```

- [ ] **Step 3: Run and verify it passes**

Run: `node --test tests/content.test.js`
Expected: PASS. Fix any card the validator flags (missing dominant resource, duplicate id, etc.).

- [ ] **Step 4: Commit**

```bash
git add src/data/dilemmas.js tests/content.test.js
git -c user.name='pravar' -c user.email='shreyas@gibbous.io' commit -m "content: expand dilemma deck to 60 cards"
```

---

## Task 15: Expand conspiracy deck to ~20 cards

**Files:**
- Modify: `src/data/conspiracies.js`

Content authoring gated by the Task 7 validation. "Done" = ≥ 20 unique conspiracies using only the implemented effect types.

- [ ] **Step 1: Author ~14 additional original conspiracies** using only `grantResource`, `stealResource`, `extraDilemma`, `forceDiscardConspiracy`, `removePeg`, `protectMajority`. Vary `params` (different resources/amounts), set `canInterrupt` thoughtfully (e.g., `stealResource`, `forceDiscardConspiracy`, `removePeg` make good interrupts; `grantResource`, `extraDilemma` do not). Original names/text only.

- [ ] **Step 2: Update the count assertion** in `tests/content.test.js` from `>= 6` to `>= 20`:

```js
  assert.ok(CONSPIRACIES.length >= 20);
```

- [ ] **Step 3: Run and verify it passes**

Run: `node --test tests/content.test.js`
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add src/data/conspiracies.js tests/content.test.js
git -c user.name='pravar' -c user.email='shreyas@gibbous.io' commit -m "content: expand conspiracy deck to 20 cards"
```

---

## Task 16: Persistence (localStorage save/load)

**Files:**
- Create: `src/ui/persistence.js`, `tests/persistence.test.js`

Pure (de)serialization so it is testable without a browser: `serialize(state) → string`, `deserialize(string) → state`. The localStorage read/write wrappers (`save`, `load`, `clearSave`) accept a storage object (defaults to `globalThis.localStorage`) for testability.

- [ ] **Step 1: Write failing test** — `tests/persistence.test.js`

```js
import { test } from "node:test";
import assert from "node:assert/strict";
import { createGame } from "../src/engine/state.js";
import { serialize, deserialize, save, load, clearSave } from "../src/ui/persistence.js";

const P = [{ name: "A", color: "#1" }, { name: "B", color: "#2" }];

test("serialize/deserialize round-trips state", () => {
  const g = createGame({ players: P, seed: 3 });
  const back = deserialize(serialize(g));
  assert.deepEqual(back, g);
});

test("save/load via an injected storage", () => {
  const mem = (() => { const m = {}; return { getItem: (k) => (k in m ? m[k] : null), setItem: (k, v) => { m[k] = v; }, removeItem: (k) => { delete m[k]; } }; })();
  const g = createGame({ players: P, seed: 9 });
  save(g, mem);
  assert.deepEqual(load(mem), g);
  clearSave(mem);
  assert.equal(load(mem), null);
});
```

- [ ] **Step 2: Run and verify it fails**

Run: `node --test tests/persistence.test.js`
Expected: FAIL — module missing.

- [ ] **Step 3: Implement `src/ui/persistence.js`**

```js
const KEY = "shasn:savegame:v1";

export const serialize = (state) => JSON.stringify(state);
export const deserialize = (str) => JSON.parse(str);

export function save(state, storage = globalThis.localStorage) {
  if (!storage) return;
  storage.setItem(KEY, serialize(state));
}
export function load(storage = globalThis.localStorage) {
  if (!storage) return null;
  const raw = storage.getItem(KEY);
  return raw ? deserialize(raw) : null;
}
export function clearSave(storage = globalThis.localStorage) {
  if (!storage) return;
  storage.removeItem(KEY);
}
```

- [ ] **Step 4: Run and verify it passes**

Run: `node --test tests/persistence.test.js`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/ui/persistence.js tests/persistence.test.js
git -c user.name='pravar' -c user.email='shreyas@gibbous.io' commit -m "feat: localStorage persistence with pure (de)serialize"
```

---

## Task 17: Newsprint theme CSS

**Files:**
- Create: `styles/base.css`, `styles/components.css`

No automated test — verified visually in Task 22. Establish design tokens and the editorial-newsprint look.

- [ ] **Step 1: Write `styles/base.css`** — tokens, typography, layout

```css
@import url("https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,600;0,9..144,800;1,9..144,500&family=Hanken+Grotesk:wght@400;500;600;700&display=swap");

:root {
  --ink: #1a1714; --paper: #f6f1e7; --paper-2: #efe7d6; --rule: #cdbfa6; --muted: #6b6256;
  --funds: #caa12f; --clout: #b3472f; --media: #a8327d; --trust: #2f6aa8;
  --serif: "Fraunces", Georgia, serif; --sans: "Hanken Grotesk", system-ui, sans-serif;
  --maxw: 1100px;
}
* { box-sizing: border-box; }
html, body { margin: 0; }
body {
  font-family: var(--sans); color: var(--ink); background: var(--paper);
  background-image: radial-gradient(rgba(0,0,0,.015) 1px, transparent 1px);
  background-size: 4px 4px; line-height: 1.5;
}
h1, h2, h3 { font-family: var(--serif); font-weight: 800; line-height: 1.1; margin: 0 0 .4em; }
#app { max-width: var(--maxw); margin: 0 auto; padding: 24px 18px 60px; }
.rule { border: 0; border-top: 2px solid var(--ink); margin: 12px 0; }
.label { font-size: 11px; text-transform: uppercase; letter-spacing: .12em; color: var(--muted); }
button { font-family: var(--sans); cursor: pointer; }
.btn { border: 2px solid var(--ink); background: var(--paper); padding: 8px 14px; font-weight: 700; border-radius: 2px; }
.btn:hover { background: var(--ink); color: var(--paper); }
.btn[disabled] { opacity: .4; cursor: not-allowed; }
```

- [ ] **Step 2: Write `styles/components.css`** — map, cards, panels, handoff curtain, resource chips

```css
/* Resource chips & ideology accents */
.chip { display: inline-flex; align-items: center; gap: 4px; font-weight: 700; font-size: 12px; padding: 3px 8px; border-radius: 2px; border: 1.5px solid currentColor; }
.chip.funds { color: var(--funds); } .chip.clout { color: var(--clout); }
.chip.media { color: var(--media); } .chip.trust { color: var(--trust); }

/* Layout: map + side panel */
.turn-grid { display: grid; grid-template-columns: 1fr 320px; gap: 22px; align-items: start; }
@media (max-width: 820px) { .turn-grid { grid-template-columns: 1fr; } }

/* SVG map */
.map { width: 100%; height: auto; background: var(--paper-2); border: 2px solid var(--ink); }
.zone-shape { fill: var(--paper); stroke: var(--ink); stroke-width: 2; cursor: pointer; }
.zone-shape.locked { fill: var(--paper-2); cursor: default; }
.zone-shape.selectable:hover { fill: #fff7e6; }
.zone-name { font: 600 13px var(--sans); fill: var(--ink); pointer-events: none; }
.peg { stroke: var(--ink); stroke-width: 1; }

/* Cards (dilemma, conspiracy) */
.card { border: 2px solid var(--ink); background: var(--paper); padding: 16px; border-radius: 2px; }
.card h3 { font-size: 20px; }
.answer { border: 2px solid var(--ink); background: var(--paper); padding: 12px; margin-top: 10px; text-align: left; width: 100%; }
.answer:hover { background: var(--ink); color: var(--paper); }

/* Side panel */
.panel { border: 2px solid var(--ink); padding: 14px; border-radius: 2px; }
.pile-row { display: flex; justify-content: space-between; padding: 4px 0; border-bottom: 1px dashed var(--rule); }

/* Privacy handoff curtain */
.curtain { position: fixed; inset: 0; background: var(--ink); color: var(--paper); display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 18px; z-index: 50; text-align: center; padding: 24px; }
.curtain h2 { color: var(--paper); font-size: 34px; }

/* Modal */
.modal-scrim { position: fixed; inset: 0; background: rgba(20,18,16,.55); display: flex; align-items: center; justify-content: center; z-index: 40; padding: 18px; }
.modal { background: var(--paper); border: 2px solid var(--ink); max-width: 520px; width: 100%; padding: 20px; border-radius: 2px; }
```

- [ ] **Step 3: Commit**

```bash
git add styles/base.css styles/components.css
git -c user.name='pravar' -c user.email='shreyas@gibbous.io' commit -m "style: editorial newsprint theme tokens and components"
```

---

## Task 18: SVG map rendering + peg placement interaction

**Files:**
- Create: `src/ui/map.js`

No automated test (DOM). Verified in Task 22. Renders the 9-zone SVG from `ZONES`, draws pegs colored per player, and emits a zone-click callback only for legally selectable zones.

- [ ] **Step 1: Implement `src/ui/map.js`**

```js
import { ZONES } from "../data/map.js";
import { majorityThreshold, totalPegs } from "../engine/rules.js";

// renderMap(state, { selectableZoneIds, onZoneClick }) -> SVGElement
export function renderMap(state, { selectableZoneIds = [], onZoneClick = () => {} } = {}) {
  const NS = "http://www.w3.org/2000/svg";
  const svg = document.createElementNS(NS, "svg");
  svg.setAttribute("viewBox", "0 0 600 600");
  svg.setAttribute("class", "map");
  svg.setAttribute("role", "group");
  svg.setAttribute("aria-label", "Constituency map");

  for (const z of ZONES) {
    const zoneState = state.zones.find((s) => s.id === z.id);
    const path = document.createElementNS(NS, "path");
    path.setAttribute("d", z.svgPath);
    const selectable = selectableZoneIds.includes(z.id);
    path.setAttribute("class", `zone-shape${zoneState.lockedBy !== null ? " locked" : ""}${selectable ? " selectable" : ""}`);
    if (selectable) path.addEventListener("click", () => onZoneClick(z.id));
    svg.appendChild(path);

    // name + capacity label (rough centroid from path bbox start)
    const [, x, y] = z.svgPath.match(/M(\d+),(\d+)/).map(Number);
    const text = document.createElementNS(NS, "text");
    text.setAttribute("x", x + 12); text.setAttribute("y", y + 22);
    text.setAttribute("class", "zone-name");
    text.textContent = `${z.name} (${totalPegs(zoneState)}/${z.capacity})`;
    svg.appendChild(text);

    // pegs as a small grid
    let i = 0;
    for (const [pid, n] of Object.entries(zoneState.pegs)) {
      const color = state.players[pid].color;
      for (let k = 0; k < n; k++) {
        const c = document.createElementNS(NS, "circle");
        c.setAttribute("cx", x + 18 + (i % 6) * 16);
        c.setAttribute("cy", y + 44 + Math.floor(i / 6) * 16);
        c.setAttribute("r", 6);
        c.setAttribute("fill", color);
        c.setAttribute("class", "peg");
        svg.appendChild(c);
        i++;
      }
    }
    // mark locked majority
    if (zoneState.lockedBy !== null) {
      const star = document.createElementNS(NS, "text");
      star.setAttribute("x", x + 12); star.setAttribute("y", y + 40);
      star.setAttribute("class", "zone-name");
      star.textContent = "★ held";
      svg.appendChild(star);
    }
  }
  return svg;
}
```

- [ ] **Step 2: Commit**

```bash
git add src/ui/map.js
git -c user.name='pravar' -c user.email='shreyas@gibbous.io' commit -m "feat: SVG map rendering with peg display and zone selection"
```

---

## Task 19: Screens (setup, turn, handoff, endgame)

**Files:**
- Create: `src/ui/screens.js`, `src/ui/render.js`

No automated test (DOM). Verified in Task 22. `render.js` owns a single `render(root, ctx)` entry that switches on `ctx.state.turn.phase` plus UI sub-mode (setup/handoff). `screens.js` builds each screen as DOM and wires controls to `ctx.dispatch(actionName, payload)`.

- [ ] **Step 1: Implement `src/ui/render.js`** — the projection switch

```js
import { setupScreen, turnScreen, handoffCurtain, endgameScreen } from "./screens.js";

// ctx = { state, dispatch(action,payload), ui:{ mode }, setUi(patch) }
export function render(root, ctx) {
  root.innerHTML = "";
  const { state, ui } = ctx;
  if (ui.mode === "setup") { root.appendChild(setupScreen(ctx)); return; }
  if (ui.mode === "handoff") { root.appendChild(handoffCurtain(ctx)); return; }
  if (state.turn.phase === "gameover") { root.appendChild(endgameScreen(ctx)); return; }
  root.appendChild(turnScreen(ctx));
}
```

- [ ] **Step 2: Implement `src/ui/screens.js`** — build each screen

Build these exact screens (DOM creation; wire buttons to `ctx.dispatch`):

1. **`setupScreen(ctx)`** — heading "SHASN"; a control to choose 2–5 players; a name input per player with a preset color swatch (use colors `#b3472f,#2f6aa8,#caa12f,#a8327d,#2f7d54`); a "Begin" button that calls `ctx.dispatch("newGame", { players })` then `ctx.setUi({ mode: "play" })` and triggers `beginTurn` for player 0 (the dispatch loop handles this — see Task 20).

2. **`turnScreen(ctx)`** — a `.turn-grid` with:
   - **Left:** the map via `renderMap(state, { selectableZoneIds, onZoneClick })`. `selectableZoneIds` = zones where `canPlaceInZone(state, current, id)` when a voter offer is selected, or eligible target zones during gerrymander/power targeting.
   - **Right `.panel`:** active player's name; resource chips (funds/clout/media/trust counts); ideology piles with unlocked power labels (from `POWERS`); the voter market (buttons per `VOTER_MARKET` offer, disabled if unaffordable); a "Buy Conspiracy" control (choose resources totalling 4–5, or 3 if Showstopper T2); the player's hand (face-up here because we're behind the handoff) with "Play" buttons; active power buttons; a gerrymander prompt when `turn.gerrymanders > 0`; and an "End turn" button.
   - **Dilemma modal:** when `state.turn.phase === "dilemma"`, show a `.modal` with the question and two `.answer` buttons → `ctx.dispatch("answerDilemma", { answerIndex })`. Payouts are NOT shown before clicking (faithful hidden payout).

3. **`handoffCurtain(ctx)`** — full-screen `.curtain`: "Pass the device to **[next player name]**", and an "I'm [name] — reveal my turn" button → `ctx.setUi({ mode: "play" })`.

4. **`endgameScreen(ctx)`** — `standings(state)` table (zones, pegs), the winner highlighted, a short recap from `state.log` (last ~12 entries), and a "New game" button → `ctx.setUi({ mode: "setup" })` + `ctx.dispatch("clearSave")`.

Each control calls `ctx.dispatch(name, payload)`; never mutate state directly. Use the CSS classes from Task 17. Include `aria-label`s on icon/short buttons.

- [ ] **Step 3: Commit**

```bash
git add src/ui/render.js src/ui/screens.js
git -c user.name='pravar' -c user.email='shreyas@gibbous.io' commit -m "feat: setup, turn, handoff, and endgame screens"
```

---

## Task 20: Dispatch loop + autosave (`main.js`)

**Files:**
- Create: `src/main.js`

No automated test (DOM/integration). Verified in Task 22. `main.js` holds the live `state` and `ui` mode, maps action names to engine reducers, autosaves after each dispatch, inserts a handoff between turns, and handles the two turn-loop-resolved powers (Showstopper T1 "draw 2 pick 1" and the `extraDilemma` conspiracy signal).

- [ ] **Step 1: Implement `src/main.js`**

```js
import { createGame } from "./engine/state.js";
import * as A from "./engine/actions.js";
import { canPlaceInZone } from "./engine/rules.js";
import { render } from "./ui/render.js";
import { save, load, clearSave } from "./ui/persistence.js";

const root = document.getElementById("app");
let state = null;
let ui = { mode: "setup" };

const REDUCERS = {
  answerDilemma: A.answerDilemma,
  buyVoter: A.buyVoter,
  buyConspiracy: A.buyConspiracy,
  playConspiracy: A.playConspiracy,
  usePower: A.usePower,
  gerrymander: A.gerrymander
};

function paint() {
  render(root, { state, ui, dispatch, setUi, canPlaceInZone });
}
function setUi(patch) { ui = { ...ui, ...patch }; paint(); }

function dispatch(action, payload = {}) {
  if (action === "newGame") {
    state = A.beginTurn(createGame({ players: payload.players, seed: Date.now() >>> 0 }));
    ui = { mode: "play" };
    save(state); paint(); return;
  }
  if (action === "clearSave") { clearSave(); return; }
  if (action === "endTurn") {
    const prev = state.turn.current;
    state = A.endTurn(state);
    save(state);
    if (state.turn.phase !== "gameover" && state.turn.current !== prev) ui = { mode: "handoff" };
    paint(); return;
  }
  const fn = REDUCERS[action];
  if (!fn) throw new Error(`unknown action ${action}`);
  state = fn(state, payload);
  // extraDilemma signal from a conspiracy: draw another dilemma immediately
  if (state.turn.pendingExtraDilemma) {
    delete state.turn.pendingExtraDilemma;
    state = A.beginTurn({ ...state, turn: { ...state.turn, phase: "actions" } });
  }
  save(state); paint();
}

// Resume an in-progress game if present
const saved = load();
if (saved) { state = saved; ui = { mode: saved.turn.phase === "gameover" ? "play" : "play" }; }
paint();

// expose for screens that need it (endTurn lives outside REDUCERS)
window.__shasnDispatch = dispatch;
```

Note: `screens.js` should call `ctx.dispatch("endTurn")` and `ctx.dispatch("newGame", {...})`; these are handled by the special-cases above, not the `REDUCERS` map.

- [ ] **Step 2: Sanity-check imports resolve** — run the engine suite once more (no regressions from refactors):

Run: `node --test`
Expected: PASS (UI files aren't imported by tests).

- [ ] **Step 3: Commit**

```bash
git add src/main.js
git -c user.name='pravar' -c user.email='shreyas@gibbous.io' commit -m "feat: dispatch loop, autosave, resume, handoff orchestration"
```

---

## Task 21: README + GitHub Pages deploy notes

**Files:**
- Create: `README.md`

- [ ] **Step 1: Write `README.md`**

```markdown
# SHASN — Pass & Play

A single-device, pass-and-play adaptation of the political strategy game SHASN for
2–5 players. Faithful mechanics, original content, built with vanilla HTML/CSS/JS.

## Play locally
Open `index.html` in a browser, or serve the folder:
`python3 -m http.server` then visit the printed URL.

## Run tests
`node --test` (Node ≥ 18, no dependencies).

## Deploy (GitHub Pages)
Push to GitHub, then in **Settings → Pages** set the source to the `main` branch,
`/ (root)` folder. The game will be served at `https://<user>.github.io/<repo>/`.

## Credits
Original digital adaptation inspired by SHASN's mechanics. All card text and art in
this project are original; no copyrighted SHASN content is reproduced.
```

- [ ] **Step 2: Commit**

```bash
git add README.md
git -c user.name='pravar' -c user.email='shreyas@gibbous.io' commit -m "docs: README with play, test, and deploy instructions"
```

---

## Task 22: Manual playtest + verification

**Files:** none (verification task). Follows superpowers:verification-before-completion.

- [ ] **Step 1: Confirm the full automated suite is green**

Run: `node --test`
Expected: ALL suites pass. Record the pass count.

- [ ] **Step 2: Serve and run a full 2-player game**

Run: `python3 -m http.server 8000` and open `http://localhost:8000`.
Walk a complete game and confirm: setup → dilemma modal hides payouts → resources update → voter purchase places pegs → reaching threshold locks a zone and offers a gerrymander → buying/playing a conspiracy works → handoff curtain appears between turns and hides the previous hand → archetype powers unlock at 2/3/5 and function → game ends when all zones are locked/full → endgame shows correct standings and winner.

- [ ] **Step 3: Run a 4-player game** focusing on adjacency placement, multiple archetypes unlocking, and interrupt-flagged conspiracies.

- [ ] **Step 4: Verify persistence** — mid-game, refresh the browser; confirm the game resumes in the same state. Finish a game, start a new one; confirm the old save is cleared.

- [ ] **Step 5: Record results.** Note any defects, fix them (adding a regression test in the engine suite where the bug was logic, not layout), and re-run Steps 1–4 until clean. Only then declare complete.

- [ ] **Step 6: Final commit (if fixes were made)**

```bash
git add -A
git -c user.name='pravar' -c user.email='shreyas@gibbous.io' commit -m "fix: playtest corrections"
```

---

## Self-review notes (coverage check)

- Spec §3.1 resources/ideologies → constants (T2), accents in CSS (T17). ✓
- §3.2 turn sequence → beginTurn/answerDilemma/buyVoter/buyConspiracy/endTurn (T10–T12). ✓
- §3.3 archetype powers (passive + active, tiers 2/3/5) → T10 (Idealist T1), T11 (Supremo T1), T12 (Showstopper T2), T13 (active powers + table). ✓
- §3.4 zones & majority & gerrymander → rules (T9), buyVoter/gerrymander (T11). ✓
- §3.5 conspiracies (blind buy, interrupt flag, resolvers) → T7, T12. ✓
- §3.6 win/end → isGameOver/standings/finishGame (T9–T10). ✓
- §4 architecture (engine/data/ui split, pure reducers, autosave) → T8–T16, T20. ✓
- §5 UX (setup/turn/handoff/interrupt/endgame, newsprint) → T17–T20. Interrupt UI is folded into the hand "Play" controls usable during another player's turn via a brief handoff — exercised in T22 Step 3. ✓
- §6 content (~60 dilemmas, ~20 conspiracies, schema) → T6/T7 seeds, T14/T15 expansion. ✓
- §7 testing (engine units, content validation, manual playtest) → throughout + T22. ✓

Open items from spec §8 resolved here: voter price table (T5), conspiracy generic buy (T12), zone geometry/neighbors (T4), archetype values (T13).
```
