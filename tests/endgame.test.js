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
  // close every zone with P0 holding majority + flipped seats
  for (const z of g.zones) {
    z.lockedBy = 0;
    z.seats = z.seats.map(() => 0);
    const need = z.flippedSeats.length;  // we'll just flip all for simplicity here
    for (let i = 0; i < need; i++) z.flippedSeats[i] = true;
  }
  g = endTurn(g);
  assert.equal(g.turn.phase, "gameover");
  assert.equal(g.winner, 0);
});
