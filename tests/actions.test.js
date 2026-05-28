import { test } from "node:test";
import assert from "node:assert/strict";
import { createGame } from "../src/engine/state.js";
import {
  beginTurn, doneReadAloud, answerDilemma, endTurn,
  drawExtraDilemma, spinDilemma, passBetweenTurns
} from "../src/engine/actions.js";
import { DILEMMA_BY_ID } from "../src/data/dilemmas.js";

const P = [{ name: "A", color: "#1" }, { name: "B", color: "#2" }];

// Helper: game state in the dilemma phase for player 0's first turn (skip draft + readAloud)
function inDilemma(seed = 1) {
  let g = createGame({ players: P, seed });
  g.turn = { ...g.turn, phase: "actions", current: 0, draftRemaining: 0, firstTurn: true };
  return beginTurn(g);
}

// Helper: game state past the dilemma phase (in actions) for player 0
function inActions(seed = 1) {
  return answerDilemma(inDilemma(seed), { answerIndex: 0 });
}

// Helper: walk through betweenTurns to get back to dilemma/readAloud
function passBetween(g) {
  while (g.turn.phase === "betweenTurns") g = passBetweenTurns(g);
  return g;
}

// --- beginTurn ---------------------------------------------------------------

test("beginTurn: first turn (firstTurn flag) skips readAloud and enters dilemma", () => {
  const g = inDilemma();
  assert.equal(g.turn.phase, "dilemma");
  assert.ok(g.turn.pendingDilemma);
});

test("beginTurn: subsequent turns enter readAloud before dilemma", () => {
  let g = createGame({ players: P, seed: 1 });
  g.turn = { ...g.turn, phase: "actions", current: 0, draftRemaining: 0 };
  g = beginTurn(g);
  assert.equal(g.turn.phase, "readAloud");
  g = doneReadAloud(g);
  assert.equal(g.turn.phase, "dilemma");
  assert.ok(g.turn.pendingDilemma);
});

// --- answerDilemma -----------------------------------------------------------

test("answerDilemma: applies payout, increments pile, advances to actions", () => {
  let g = inDilemma();
  const card = DILEMMA_BY_ID[g.turn.pendingDilemma];
  const ans = card.answers[0];
  g = answerDilemma(g, { answerIndex: 0 });
  for (const [r, n] of Object.entries(ans.payout)) {
    assert.equal(g.players[0].resources[r], n);
  }
  assert.equal(g.players[0].piles[ans.ideology], 1);
  assert.equal(g.turn.phase, "actions");
  assert.equal(g.turn.pendingDilemma, null);
});

test("answerDilemma: throws if not in dilemma phase", () => {
  const g = inActions();
  assert.throws(() => answerDilemma(g, { answerIndex: 0 }), /phase/);
});

// --- endTurn -----------------------------------------------------------------

test("endTurn: throws during dilemma phase", () => {
  const g = inDilemma();
  assert.throws(() => endTurn(g), /phase/);
});

test("endTurn: advances to betweenTurns after actions phase with 2 players", () => {
  let g = inActions();
  g = endTurn(g);
  assert.equal(g.turn.phase, "betweenTurns");
});

// --- usedThisTurn resets at turn start ---------------------------------------

test("usedThisTurn resets at the start of a new turn for that player", () => {
  // Player 0 first turn: mark something in usedThisTurn, end it, walk through
  // betweenTurns and player 1's turn, then verify player 0's usedThisTurn is
  // cleared when their second turn begins.
  let g = inDilemma();
  g = answerDilemma(g, { answerIndex: 0 });
  g.players[0].usedThisTurn["capitalist:t1"] = true;
  g = endTurn(g);
  g = passBetween(g);
  // Player 1's turn
  if (g.turn.phase === "readAloud") g = doneReadAloud(g);
  g = answerDilemma(g, { answerIndex: 0 });
  g = endTurn(g);
  g = passBetween(g);
  // Player 0's second turn should have started; usedThisTurn cleared
  if (g.turn.phase === "readAloud") g = doneReadAloud(g);
  assert.equal(g.turn.current, 0);
  assert.deepEqual(g.players[0].usedThisTurn, {});
});

// --- drawExtraDilemma --------------------------------------------------------

test("drawExtraDilemma: returns to dilemma phase without re-applying start-of-turn bonus", () => {
  let g = inDilemma();
  g.players[0].piles.capitalist = 4;   // +2 funds passive at beginTurn, already applied
  g = answerDilemma(g, { answerIndex: 0 });
  const fundsBefore = g.players[0].resources.funds;
  g = drawExtraDilemma(g);
  assert.equal(g.turn.phase, "dilemma");
  assert.ok(g.turn.pendingDilemma);
  assert.equal(g.players[0].resources.funds, fundsBefore); // no extra passive applied
});

// --- spinDilemma -------------------------------------------------------------

test("spinDilemma: swaps current dilemma for a fresh one, once per turn", () => {
  let g = inDilemma();
  g.players[0].piles.showman = 4;   // showman tier 1 unlocked (tierOf >= 4)
  const first = g.turn.pendingDilemma;
  g = spinDilemma(g);
  assert.notEqual(g.turn.pendingDilemma, first);
  assert.equal(g.turn.phase, "dilemma");
  assert.throws(() => spinDilemma(g), /already/);
});

test("spinDilemma: requires Showstopper tier 1 (showman piles)", () => {
  const g = inDilemma();
  assert.throws(() => spinDilemma(g), /Showstopper tier 1/);
});
