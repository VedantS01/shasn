import { test } from "node:test";
import assert from "node:assert/strict";
import { createGame } from "../src/engine/state.js";
import { viewState } from "../src/multiplayer/privacy.js";

// Helper: create a 3-player game and give each player a few hand cards.
function makeState() {
  const players = [
    { name: "Alice", color: "#b00" },
    { name: "Bob",   color: "#00b" },
    { name: "Carol", color: "#0b0" }
  ];
  const state = createGame({ players, seed: 99 });
  // Manually put fake card ids in each player's hand.
  state.players[0].hand = ["c1", "c2", "c3"];
  state.players[1].hand = ["c4", "c5"];
  state.players[2].hand = ["c6"];
  // Advance past draft phase for cleaner testing.
  state.turn.phase = "actions";
  state.turn.current = 0;
  return state;
}

// ---------------------------------------------------------------------------
// Hand visibility
// ---------------------------------------------------------------------------
test("privacy: viewer sees own hand unchanged", () => {
  const state = makeState();
  const view = viewState(state, 0);
  assert.deepEqual(view.players[0].hand, ["c1", "c2", "c3"]);
});

test("privacy: viewer sees opponent hands as same-length '?' arrays", () => {
  const state = makeState();
  const view = viewState(state, 0);
  assert.deepEqual(view.players[1].hand, ["?", "?"]);
  assert.deepEqual(view.players[2].hand, ["?"]);
});

test("privacy: each player sees only their own hand", () => {
  const state = makeState();
  for (const pid of [0, 1, 2]) {
    const view = viewState(state, pid);
    // Own hand is real.
    assert.deepEqual(view.players[pid].hand, state.players[pid].hand);
    // Others are masked.
    for (const opp of state.players.filter((p) => p.id !== pid)) {
      const masked = view.players[opp.id].hand;
      assert.equal(masked.length, opp.hand.length, `length mismatch for player ${opp.id} seen by ${pid}`);
      assert.ok(masked.every((c) => c === "?"), `non-? card in hand seen by ${pid} for player ${opp.id}`);
    }
  }
});

test("privacy: usedThisTurn visible only for viewer", () => {
  const state = makeState();
  state.players[1].usedThisTurn = { openMarket: true };
  const view = viewState(state, 0);
  // Viewer's own usedThisTurn unchanged.
  assert.deepEqual(view.players[0].usedThisTurn, {});
  // Opponent's usedThisTurn is hidden.
  assert.deepEqual(view.players[1].usedThisTurn, {});
});

// ---------------------------------------------------------------------------
// pendingProposal visibility
// ---------------------------------------------------------------------------
test("privacy: pendingProposal visible to from player", () => {
  const state = makeState();
  state.turn.pendingProposal = { from: 0, to: 1, give: { resources: {} }, receive: { resources: {} } };
  const view = viewState(state, 0);
  assert.ok(view.turn.pendingProposal !== null);
});

test("privacy: pendingProposal visible to to player", () => {
  const state = makeState();
  state.turn.pendingProposal = { from: 0, to: 1, give: { resources: {} }, receive: { resources: {} } };
  const view = viewState(state, 1);
  assert.ok(view.turn.pendingProposal !== null);
});

test("privacy: pendingProposal hidden from uninvolved player", () => {
  const state = makeState();
  state.turn.pendingProposal = { from: 0, to: 1, give: { resources: {} }, receive: { resources: {} } };
  const view = viewState(state, 2);
  assert.equal(view.turn.pendingProposal, null);
});

// ---------------------------------------------------------------------------
// pendingDilemma visibility
// ---------------------------------------------------------------------------
test("privacy: pendingDilemma visible to current player", () => {
  const state = makeState();
  state.turn.phase = "dilemma";
  state.turn.current = 1;
  state.turn.pendingDilemma = "d1";
  const view = viewState(state, 1);
  assert.equal(view.turn.pendingDilemma, "d1");
});

test("privacy: pendingDilemma hidden from non-current player outside readAloud", () => {
  const state = makeState();
  state.turn.phase = "dilemma";
  state.turn.current = 1;
  state.turn.pendingDilemma = "d1";
  const view = viewState(state, 0);
  assert.equal(view.turn.pendingDilemma, null);
});

test("privacy: pendingDilemma visible to previous player during readAloud", () => {
  const state = makeState();
  state.turn.phase = "readAloud";
  state.turn.current = 1;         // current = player 1
  state.turn.pendingDilemma = "d1";
  // previous player = 0 (since (1-1+3)%3 = 0)
  const view = viewState(state, 0);
  assert.equal(view.turn.pendingDilemma, "d1");
});

test("privacy: pendingDilemma hidden from third player during readAloud", () => {
  const state = makeState();
  state.turn.phase = "readAloud";
  state.turn.current = 1;
  state.turn.pendingDilemma = "d1";
  // player 2 is neither current (1) nor previous (0)
  const view = viewState(state, 2);
  assert.equal(view.turn.pendingDilemma, null);
});

// ---------------------------------------------------------------------------
// Public information unchanged
// ---------------------------------------------------------------------------
test("privacy: zones are unchanged", () => {
  const state = makeState();
  const view = viewState(state, 0);
  assert.equal(view.zones.length, state.zones.length);
  for (let i = 0; i < state.zones.length; i++) {
    assert.deepEqual(view.zones[i].seats, state.zones[i].seats);
    assert.deepEqual(view.zones[i].flippedSeats, state.zones[i].flippedSeats);
    assert.equal(view.zones[i].id, state.zones[i].id);
  }
});

test("privacy: market is unchanged", () => {
  const state = makeState();
  const view = viewState(state, 1);
  assert.deepEqual(view.market.open, state.market.open);
  assert.equal(view.market.deck.length, state.market.deck.length);
});

test("privacy: public player fields (resources, piles, name, color) are unchanged", () => {
  const state = makeState();
  state.players[1].resources = { funds: 2, clout: 1, media: 3, trust: 0 };
  const view = viewState(state, 0);
  assert.deepEqual(view.players[1].resources, state.players[1].resources);
  assert.deepEqual(view.players[1].piles, state.players[1].piles);
  assert.equal(view.players[1].name, state.players[1].name);
  assert.equal(view.players[1].color, state.players[1].color);
});

test("privacy: viewState does not mutate the original state", () => {
  const state = makeState();
  state.players[0].hand = ["c1", "c2"];
  const before = JSON.stringify(state);
  viewState(state, 1);
  assert.equal(JSON.stringify(state), before);
});
