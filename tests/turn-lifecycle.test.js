import { test } from "node:test";
import assert from "node:assert/strict";
import { createGame } from "../src/engine/state.js";
import { beginTurn, answerDilemma, endTurn, doneReadAloud } from "../src/engine/actions.js";

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

test("beginTurn: very first turn (firstTurn flag) skips readAloud", () => {
  let g = createGame({ players: P, seed: 1 });
  g.turn = { ...g.turn, phase: "actions", current: 0, draftRemaining: 0, firstTurn: true };
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

test("answerDilemma: when over cap-12 after payout+passive, enters discard phase", () => {
  let g = createGame({ players: P, seed: 1 });
  g.turn = { ...g.turn, phase: "actions", current: 0, draftRemaining: 0, firstTurn: true };
  g.players[0].resources = { funds: 11, clout: 2, media: 0, trust: 0 };
  g = beginTurn(g);
  g = answerDilemma(g, { answerIndex: 0 });
  assert.equal(g.turn.phase, "discard");
});

test("answerDilemma: when pendingPlacements > 0, enters placePending phase", () => {
  let g = createGame({ players: P, seed: 1 });
  g.turn = { ...g.turn, phase: "actions", current: 0, draftRemaining: 0, firstTurn: true };
  g.players[0].pendingPlacements = 2;
  g = beginTurn(g);
  g = answerDilemma(g, { answerIndex: 0 });
  assert.equal(g.turn.phase, "placePending");
});

test("endTurn: drains pending headlines before handing off; lastHeadline reflects last", () => {
  let g = createGame({ players: P, seed: 1 });
  g.turn = { ...g.turn, phase: "actions", current: 0, draftRemaining: 0, firstTurn: true };
  g.turn.pendingHeadlines = [{ zoneId: "central", playerId: 0 }];
  g.decks.headlineDraw = ["h01"];   // grant trust+2
  g.players[0].resources.trust = 0;
  g = endTurn(g);
  assert.equal(g.players[0].resources.trust, 2);
  assert.deepEqual(g.turn.pendingHeadlines, []);
  assert.equal(g.lastHeadline.id, "h01");
});

test("beginTurn: gerrymander budget computed from solo majorities (1 per, 2 with Idealist L6)", () => {
  let g = createGame({ players: P, seed: 1 });
  g.turn = { ...g.turn, phase: "actions", current: 0, draftRemaining: 0, firstTurn: true };
  const c = g.zones.find((z) => z.id === "central"); c.lockedBy = 0;
  const n = g.zones.find((z) => z.id === "north"); n.lockedBy = 0;
  g.players[0].piles.idealist = 6;   // Mass Mobilisation -> 2 moves per majority
  g = beginTurn(g);
  assert.equal(g.turn.gerrymanderMoves.central, 2);
  assert.equal(g.turn.gerrymanderMoves.north, 2);
});
