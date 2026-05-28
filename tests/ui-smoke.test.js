import { test } from "node:test";
import assert from "node:assert/strict";

// Minimal DOM shim: enough for render() to build element trees without a browser.
function makeNode(tag) {
  return {
    tag, children: [], attrs: {}, listeners: {}, style: {},
    className: "", textContent: "", innerHTML: "", value: "",
    dataset: {},
    setAttribute(k, v) { this.attrs[k] = v; },
    getAttribute(k) { return this.attrs[k]; },
    addEventListener(k, fn) { (this.listeners[k] = this.listeners[k] || []).push(fn); },
    appendChild(c) { this.children.push(c); return c; },
    removeChild(c) { const i = this.children.indexOf(c); if (i >= 0) this.children.splice(i, 1); return c; },
    get firstChild() { return this.children[0] || null; }
  };
}
globalThis.document = {
  createElement: (t) => makeNode(t),
  createElementNS: (_ns, t) => makeNode(t),
  createTextNode: (s) => ({ text: String(s) })
};

const { createGame } = await import("../src/engine/state.js");
const A = await import("../src/engine/actions.js");
const { render } = await import("../src/ui/render.js");

const P = [{ name: "Asha", color: "#b3472f" }, { name: "Bman", color: "#2f6aa8" }];

function ctx(state, ui) {
  return {
    state,
    ui,
    dispatch() {},
    setUi() {}
  };
}

// Helper: get a game through the draft phase to the first action phase
function gameInActions() {
  let g = createGame({ players: P, seed: 1 });
  // Fast-forward through draft (player 0 drafts 1, player 1 drafts 2)
  g = A.draftResource(g, { resource: "funds" });  // p0 done
  g = A.draftResource(g, { resource: "funds" });  // p1 pick 1
  g = A.draftResource(g, { resource: "clout" }); // p1 pick 2 -> beginTurn -> readAloud
  // Now in readAloud; transition to dilemma
  g = A.doneReadAloud(g);
  // Now in dilemma; answer it -> actions (or discard)
  g = A.answerDilemma(g, { answerIndex: 0 });
  // May be in discard if total > 12; if so, discard down
  if (g.turn.phase === "discard") {
    const p = g.players[g.turn.current];
    const total = ["funds","clout","media","trust"].reduce((s, r) => s + (p.resources[r] || 0), 0);
    const excess = total - 12;
    if (excess > 0) {
      const counts = {};
      let left = excess;
      for (const r of ["funds","clout","media","trust"]) {
        const take = Math.min(left, p.resources[r] || 0);
        if (take > 0) counts[r] = take;
        left -= take;
        if (left === 0) break;
      }
      g = A.discardResources(g, { counts });
    }
  }
  return g;
}

// Helper: get a game in draft phase
function gameInDraft() {
  return createGame({ players: P, seed: 1 });
}

// Helper: game in readAloud phase
function gameInReadAloud() {
  let g = createGame({ players: P, seed: 1 });
  g = A.draftResource(g, { resource: "funds" });
  g = A.draftResource(g, { resource: "funds" });
  g = A.draftResource(g, { resource: "clout" });
  // now in readAloud
  return g;
}

// Helper: game in dilemma phase (first turn skips readAloud)
function gameInDilemma() {
  let g = createGame({ players: P, seed: 1 });
  // Set firstTurn so beginTurn skips readAloud
  g.turn.firstTurn = true;
  // Complete draft manually to trigger beginTurn -> dilemma
  g = A.draftResource(g, { resource: "funds" });
  g = A.draftResource(g, { resource: "funds" });
  g = A.draftResource(g, { resource: "clout" });
  return g;
}

// ---------------------------------------------------------------------------
test("setup screen renders without throwing", () => {
  const root = makeNode("main");
  render(root, ctx(null, { mode: "setup" }));
  assert.ok(root.children.length > 0);
});

test("setup renders with the settings menu open (gear expanded)", () => {
  const root = makeNode("main");
  render(root, ctx(null, { mode: "setup", settingsOpen: true }));
  assert.ok(root.children.length > 0);
});

test("draft screen renders", () => {
  const g = gameInDraft();
  assert.strictEqual(g.turn.phase, "draft");
  const root = makeNode("main");
  render(root, ctx(g, { mode: "play", error: null }));
  assert.ok(root.children.length > 0);
});

test("readAloud curtain renders", () => {
  const g = gameInReadAloud();
  assert.strictEqual(g.turn.phase, "readAloud");
  const root = makeNode("main");
  render(root, ctx(g, { mode: "play", error: null }));
  assert.ok(root.children.length > 0);
});

test("turn screen renders during the dilemma phase", () => {
  const g = gameInDilemma();
  assert.strictEqual(g.turn.phase, "dilemma");
  const root = makeNode("main");
  render(root, ctx(g, { mode: "play", error: null }));
  assert.ok(root.children.length > 0);
});

test("discard modal renders when over resource cap", () => {
  const g = gameInDilemma();
  // Manually override resources to trigger discard
  let gg = A.answerDilemma(g, { answerIndex: 0 });
  // Force over cap
  if (gg.turn.phase !== "discard") {
    gg = { ...gg, turn: { ...gg.turn, phase: "discard" } };
    gg.players = gg.players.map((p, i) => i === gg.turn.current
      ? { ...p, resources: { funds: 5, clout: 5, media: 5, trust: 5 } }
      : p);
  }
  const root = makeNode("main");
  render(root, ctx(gg, { mode: "play", error: null }));
  assert.ok(root.children.length > 0);
});

test("turn screen renders in the actions phase with map modes and panels", () => {
  let g = gameInActions();
  assert.strictEqual(g.turn.phase, "actions");

  // Add hand cards for conspiracy panel
  g.players[0].hand = ["c001", "c002"];

  // Set up a majority zone for gerrymander
  const central = g.zones.find((z) => z.id === "central");
  central.seats[0] = 0;
  central.seats[1] = 0;
  central.seats[2] = 0;
  central.seats[3] = 0;
  central.seats[4] = 0;
  central.flippedSeats[0] = true;
  central.flippedSeats[1] = true;
  central.flippedSeats[2] = true;
  central.flippedSeats[3] = true;
  central.flippedSeats[4] = true;
  central.lockedBy = 0;

  // Give north zone some seats
  const north = g.zones.find((z) => z.id === "north");
  north.seats[0] = 1;
  north.seats[1] = 0;

  // Set gerrymander moves
  g.turn.gerrymanderMoves = { central: 2 };

  // Set headline
  g.lastHeadline = { id: "h01", name: "Endorsement Wave", text: "A beloved figure backs you.", player: 0 };

  // Give powers
  g.players[0].piles = { capitalist: 4, supremo: 4, showman: 6, idealist: 6 };

  // Set a currentBuy with tokensRemaining (placement mode)
  g.turn.currentBuy = { cardId: "vb01", zoneId: null, tokensRemaining: 2 };

  const root = makeNode("main");
  render(root, ctx(g, { mode: "play", error: "Test error", gerryMode: null }));
  assert.ok(root.children.length > 0);
});

test("turn screen renders with gerry source selection mode", () => {
  let g = gameInActions();
  const central = g.zones.find((z) => z.id === "central");
  central.seats[0] = 0;
  central.lockedBy = 0;
  g.turn.gerrymanderMoves = { central: 1 };

  const root = makeNode("main");
  render(root, ctx(g, {
    mode: "play",
    error: null,
    gerryMode: { majorityZoneId: "central", sourceSeat: null }
  }));
  assert.ok(root.children.length > 0);
});

test("turn screen renders with gerry dest selection mode", () => {
  let g = gameInActions();
  const central = g.zones.find((z) => z.id === "central");
  central.seats[0] = 0;
  central.lockedBy = 0;
  g.turn.gerrymanderMoves = { central: 1 };

  const root = makeNode("main");
  render(root, ctx(g, {
    mode: "play",
    error: null,
    gerryMode: { majorityZoneId: "central", sourceSeat: { zoneId: "central", seatIndex: 0 } }
  }));
  assert.ok(root.children.length > 0);
});

test("placePending prompt renders", () => {
  let g = gameInDilemma();
  // Give player pending placements
  g = A.answerDilemma(g, { answerIndex: 0 });
  // Force placePending phase
  g = {
    ...g,
    turn: { ...g.turn, phase: "placePending" },
    players: g.players.map((p, i) =>
      i === g.turn.current ? { ...p, pendingPlacements: 2 } : p)
  };
  const root = makeNode("main");
  render(root, ctx(g, { mode: "play", error: null }));
  assert.ok(root.children.length > 0);
});

test("handoff curtain renders", () => {
  const g = gameInReadAloud();
  const root = makeNode("main");
  render(root, ctx(g, { mode: "handoff", error: null }));
  assert.ok(root.children.length > 0);
});

test("tradeAccept curtain renders", () => {
  let g = gameInActions();
  g = {
    ...g,
    turn: {
      ...g.turn,
      phase: "tradeAccept",
      pendingProposal: {
        kind: "trade",
        from: 0,
        to: 1,
        give: { resources: { funds: 1 } },
        receive: { resources: { clout: 1 } }
      }
    }
  };
  const root = makeNode("main");
  render(root, ctx(g, { mode: "play", error: null }));
  assert.ok(root.children.length > 0);
});

test("coalitionAccept curtain renders", () => {
  let g = gameInActions();
  g = {
    ...g,
    turn: {
      ...g.turn,
      phase: "coalitionAccept",
      pendingProposal: {
        kind: "coalition",
        from: 0,
        to: 1,
        zoneId: "north",
        split: "equal",
        ownCardId: null
      }
    }
  };
  const root = makeNode("main");
  render(root, ctx(g, { mode: "play", error: null }));
  assert.ok(root.children.length > 0);
});

test("betweenTurns curtain renders", () => {
  let g = gameInActions();
  g = {
    ...g,
    turn: {
      ...g.turn,
      phase: "betweenTurns",
      betweenTurnsAt: 1
    }
  };
  const root = makeNode("main");
  render(root, ctx(g, { mode: "play", error: null }));
  assert.ok(root.children.length > 0);
});

test("endgame screen renders", () => {
  let g = createGame({ players: P, seed: 1 });
  g.turn.phase = "gameover";
  g.winner = 0;
  // Lock some zones
  g.zones.find((z) => z.id === "central").lockedBy = 0;
  g.zones.find((z) => z.id === "north").lockedBy = 1;
  g.log = ["Asha locked central", "Game over — winner is Asha"];
  const root = makeNode("main");
  render(root, ctx(g, { mode: "play", error: null }));
  assert.ok(root.children.length > 0);
});

test("turn screen renders with the settings menu open without throwing", () => {
  const g = gameInDilemma();
  const root = makeNode("main");
  render(root, ctx(g, { mode: "play", error: null, settingsOpen: true }));
  assert.ok(root.children.length > 0);
});

test("rules modal renders without throwing", () => {
  const root = makeNode("main");
  render(root, ctx(null, { mode: "setup", rulesOpen: true, rulesSection: "overview" }));
  assert.ok(root.children.length > 0);
});

test("rules modal: different section selection", () => {
  const g = createGame({ players: P, seed: 1 });
  g.turn = { ...g.turn, phase: "actions", current: 0, draftRemaining: 0 };
  const root = makeNode("main");
  render(root, ctx(g, { mode: "play", rulesOpen: true, rulesSection: "gerrymander" }));
  assert.ok(root.children.length > 0);
});
