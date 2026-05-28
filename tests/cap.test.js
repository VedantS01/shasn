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
  g.players[0].resources = { funds: 5, clout: 5, media: 5, trust: 0 };
  g.turn = { ...g.turn, phase: "discard" };
  assert.throws(() => discardResources(g, { counts: { funds: 1 } }), /total/i);
});

test("discardResources: rejects discarding more than you hold", () => {
  let g = createGame({ players: P, seed: 1 });
  g.players[0].resources = { funds: 1, clout: 0, media: 0, trust: 0 };
  g.turn = { ...g.turn, phase: "discard" };
  assert.throws(() => discardResources(g, { counts: { funds: 5 } }), /enough/i);
});

test("discardResources: advances phase to actions when at/under cap and no pending placements", () => {
  let g = createGame({ players: P, seed: 1 });
  g.players[0].resources = { funds: 13, clout: 0, media: 0, trust: 0 };
  g.turn = { ...g.turn, phase: "discard" };
  const after = discardResources(g, { counts: { funds: 1 } });
  assert.equal(after.turn.phase, "actions");
});

test("discardResources: advances to placePending when pendingPlacements > 0", () => {
  let g = createGame({ players: P, seed: 1 });
  g.players[0].resources = { funds: 13, clout: 0, media: 0, trust: 0 };
  g.players[0].pendingPlacements = 2;
  g.turn = { ...g.turn, phase: "discard" };
  const after = discardResources(g, { counts: { funds: 1 } });
  assert.equal(after.turn.phase, "placePending");
});
