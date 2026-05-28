import { test } from "node:test";
import assert from "node:assert/strict";
import { createGame } from "../src/engine/state.js";
import { endTurn, passBetweenTurns } from "../src/engine/actions.js";

const P3 = [
  { name: "A", color: "#1" }, { name: "B", color: "#2" }, { name: "C", color: "#3" }
];

test("endTurn enters betweenTurns; each non-active player gets a pass slot", () => {
  let g = createGame({ players: P3, seed: 1 });
  g.turn = { ...g.turn, phase: "actions", current: 0, draftRemaining: 0 };
  g = endTurn(g);
  assert.equal(g.turn.phase, "betweenTurns");
  // First prompt is the player AFTER the soon-to-be-active player (the next-active
  // player is whoever follows `current`; the spec asks non-active rotation).
  // Implementation: betweenTurnsAt starts at (current+1) % n; if that equals the
  // next-active player ((current+1) % n), the engine skips them and rolls forward.
  // After one pass, betweenTurnsAt advances.
  const firstPrompt = g.turn.betweenTurnsAt;
  assert.notEqual(firstPrompt, null);
  g = passBetweenTurns(g);
  // Eventually the loop terminates and phase becomes readAloud (or dilemma if first turn)
  // since beginTurn is invoked.
  // Pass until phase exits betweenTurns
  let safety = 10;
  while (g.turn.phase === "betweenTurns" && safety-- > 0) g = passBetweenTurns(g);
  assert.notEqual(g.turn.phase, "betweenTurns");
});

test("two players: endTurn enters betweenTurns with just opponent as prompt", () => {
  let g = createGame({ players: [{ name: "A", color: "#1" }, { name: "B", color: "#2" }], seed: 1 });
  g.turn = { ...g.turn, phase: "actions", current: 0, draftRemaining: 0 };
  g = endTurn(g);
  assert.equal(g.turn.phase, "betweenTurns");
  // After P1 (opponent) passes, P1 becomes active (beginTurn).
  g = passBetweenTurns(g);
  assert.notEqual(g.turn.phase, "betweenTurns");
  assert.equal(g.turn.current, 1);
});
