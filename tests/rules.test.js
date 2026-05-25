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
  assert.deepEqual(neighborsOf("z0").slice().sort(), ["z1", "z3", "z4"]);
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
