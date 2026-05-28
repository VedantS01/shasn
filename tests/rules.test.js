import { test } from "node:test";
import assert from "node:assert/strict";
import { createGame } from "../src/engine/state.js";
import {
  pegCount, totalPegs, zoneCapacity, majorityThreshold, majorityHolder,
  isZoneFull, hasPresence, canPlaceInZone, neighborsOf, isGameOver, standings,
  flippedCount, playerScore, isVolatileSeat, voteCount
} from "../src/engine/rules.js";


const P = [{ name: "A", color: "#1" }, { name: "B", color: "#2" }];
// owners: array of seat occupants (playerId), rest of the zone stays empty
function withZone(g, zoneId, owners = [], lockedBy = null) {
  const z = g.zones.find((z) => z.id === zoneId);
  z.seats = z.seats.map(() => null);
  owners.forEach((o, i) => { z.seats[i] = o; });
  z.lockedBy = lockedBy;
  return g;
}

test("zoneCapacity and majorityThreshold", () => {
  assert.equal(zoneCapacity("central"), 9);
  assert.equal(majorityThreshold("central"), 5);  // ceil((9+1)/2) = 5
  assert.equal(majorityThreshold("north"), 11);   // ceil((21+1)/2) = 11
});

test("pegCount / totalPegs count seat occupants", () => {
  const g = withZone(createGame({ players: P, seed: 1 }), "central", [0, 0, 1]);
  const z = g.zones.find((z) => z.id === "central");
  assert.equal(pegCount(z, 0), 2);
  assert.equal(pegCount(z, 1), 1);
  assert.equal(totalPegs(z), 3);
});

test("majorityHolder returns player at/over threshold else null", () => {
  // central capacity=9, majority=5 — give player 0 five seats
  let g = withZone(createGame({ players: P, seed: 1 }), "central", [0, 0, 0, 0, 0, 1]);
  assert.equal(majorityHolder(g.zones.find((z) => z.id === "central")), 0);
  g = withZone(createGame({ players: P, seed: 1 }), "central", [0, 0, 1, 1, 1, 1]);
  assert.equal(majorityHolder(g.zones.find((z) => z.id === "central")), null);
});

test("the volatile seat counts toward majority via plain seats array", () => {
  // central needs 5; give player 0 seats at indices 0,1 plus volatile indices [2,6]
  // Set all 5 needed seats explicitly — 4 normal + 1 of the volatile index seats
  const g = withZone(createGame({ players: P, seed: 1 }), "central", [0, 0, 0, null, null, null, 0]);
  // that's indices 0,1,2,6 = 4 seats; not yet at 5
  assert.equal(majorityHolder(g.zones.find((z) => z.id === "central")), null);
  // now add a 5th
  g.zones.find((z) => z.id === "central").seats[3] = 0;
  assert.equal(majorityHolder(g.zones.find((z) => z.id === "central")), 0);
});

test("isZoneFull when every normal seat is occupied", () => {
  // central capacity = 9
  const owners = new Array(9).fill(0);
  owners[5] = 1; owners[6] = 1;
  const g = withZone(createGame({ players: P, seed: 1 }), "central", owners);
  assert.equal(isZoneFull(g.zones.find((z) => z.id === "central")), true);
});

test("placement: first peg anywhere; then only own or adjacent zones; never locked/full", () => {
  let g = createGame({ players: P, seed: 1 });
  assert.equal(hasPresence(g, 0), false);
  assert.equal(canPlaceInZone(g, 0, "sw"), true);          // no presence -> anywhere
  g = withZone(g, "central", [0]);
  assert.equal(hasPresence(g, 0), true);
  assert.equal(canPlaceInZone(g, 0, "central"), true);     // own zone
  assert.equal(canPlaceInZone(g, 0, "north"), true);       // neighbor of central
  assert.equal(canPlaceInZone(g, 0, "sw"), true);          // sw is neighbor of central too
  // lock "north" and verify can't place there
  g = withZone(g, "north", [1, 1], 1);                     // locked
  assert.equal(canPlaceInZone(g, 0, "north"), false);
});

test("neighborsOf returns the map adjacency", () => {
  assert.deepEqual(neighborsOf("ne").slice().sort(), ["central", "east", "north"]);
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

// ── new helpers ──────────────────────────────────────────────────────────────

test("isVolatileSeat: true for indices in zone.volatileSeats", () => {
  const g = createGame({ players: P, seed: 1 });
  const central = g.zones.find((z) => z.id === "central");
  for (const i of central.volatileSeats) assert.equal(isVolatileSeat(central, i), true);
  assert.equal(isVolatileSeat(central, 0), central.volatileSeats.includes(0));
});

test("voteCount: counts all seats a player holds in the zone (volatile included)", () => {
  let g = createGame({ players: P, seed: 1 });
  const z = g.zones[0];
  z.seats[0] = 0; z.seats[1] = 0; z.seats[2] = 1;
  assert.equal(voteCount(z, 0), 2);
  assert.equal(voteCount(z, 1), 1);
});

test("flippedCount: counts S-side seats per player", () => {
  let g = createGame({ players: P, seed: 1 });
  const z = g.zones[0];
  z.seats[0] = 0; z.seats[1] = 0; z.seats[2] = 0;
  z.flippedSeats[0] = true; z.flippedSeats[1] = true;
  assert.equal(flippedCount(z, 0), 2);
  assert.equal(flippedCount(z, 1), 0);
});

test("playerScore: sum of flipped seats across all zones", () => {
  let g = createGame({ players: P, seed: 1 });
  g.zones[0].seats[0] = 0; g.zones[0].flippedSeats[0] = true;
  g.zones[1].seats[0] = 0; g.zones[1].flippedSeats[0] = true;
  g.zones[1].seats[1] = 0; g.zones[1].flippedSeats[1] = true;
  assert.equal(playerScore(g, 0), 3);
  assert.equal(playerScore(g, 1), 0);
});
