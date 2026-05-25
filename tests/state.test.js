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
