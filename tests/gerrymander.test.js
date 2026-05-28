import { test } from "node:test";
import assert from "node:assert/strict";
import { createGame } from "../src/engine/state.js";
import { gerrymander } from "../src/engine/actions.js";

const P = [{ name: "A", color: "#1" }, { name: "B", color: "#2" }];

function setup() {
  // Player 0 owns Central as a solo majority; ne is a neighbor with an opponent peg.
  let g = createGame({ players: P, seed: 1 });
  g.turn = { ...g.turn, phase: "actions", current: 0, gerrymanderMoves: { central: 1 } };
  const c = g.zones.find((z) => z.id === "central");
  c.lockedBy = 0;
  for (let i = 0; i < 5; i++) { c.seats[i] = 0; c.flippedSeats[i] = true; }
  const ne = g.zones.find((z) => z.id === "ne");
  // place an opponent voter on a non-volatile seat
  const nonVolatile = [...Array(ne.seats.length).keys()].find((i) => !ne.volatileSeats.includes(i));
  ne.seats[nonVolatile] = 1;
  return { g, neNonVolatileSeat: nonVolatile };
}

test("gerrymander: moves a non-majority opponent peg between neighbor-of-majority zones", () => {
  const { g, neNonVolatileSeat } = setup();
  // destination = north (neighbor of central) on a non-volatile, empty seat
  const north = g.zones.find((z) => z.id === "north");
  const dest = [...Array(north.seats.length).keys()].find((i) => north.seats[i] === null && !north.volatileSeats.includes(i));
  const next = gerrymander(g, {
    majorityZoneId: "central",
    fromZoneId: "ne",
    fromSeatIndex: neNonVolatileSeat,
    toZoneId: "north",
    toSeatIndex: dest
  });
  assert.equal(next.zones.find((z) => z.id === "ne").seats[neNonVolatileSeat], null);
  assert.equal(next.zones.find((z) => z.id === "north").seats[dest], 1);
  assert.equal(next.turn.gerrymanderMoves.central, 0);
});

test("gerrymander: rejects moving a flipped majority voter", () => {
  const { g } = setup();
  assert.throws(() => gerrymander(g, {
    majorityZoneId: "central", fromZoneId: "central", fromSeatIndex: 0,
    toZoneId: "ne", toSeatIndex: 1
  }), /majority|flipped/i);
});

test("gerrymander: rejects volatile source", () => {
  const { g } = setup();
  const ne = g.zones.find((z) => z.id === "ne");
  const vol = ne.volatileSeats[0];
  ne.seats[vol] = 1;
  const north = g.zones.find((z) => z.id === "north");
  const dest = [...Array(north.seats.length).keys()].find((i) => north.seats[i] === null && !north.volatileSeats.includes(i));
  assert.throws(() => gerrymander(g, {
    majorityZoneId: "central", fromZoneId: "ne", fromSeatIndex: vol,
    toZoneId: "north", toSeatIndex: dest
  }), /volatile/i);
});

test("gerrymander: allows volatile destination, queuing a headline on the moved voter's owner", () => {
  const { g, neNonVolatileSeat } = setup();
  const central = g.zones.find((z) => z.id === "central");
  const vol = central.volatileSeats[0];
  central.seats[vol] = null; central.flippedSeats[vol] = false;
  const next = gerrymander(g, {
    majorityZoneId: "central", fromZoneId: "ne", fromSeatIndex: neNonVolatileSeat,
    toZoneId: "central", toSeatIndex: vol
  });
  assert.deepEqual(next.turn.pendingHeadlines, [{ zoneId: "central", playerId: 1 }]);
});

test("gerrymander: rejects when source/dest do not share a border with each other", () => {
  const { g, neNonVolatileSeat } = setup();
  // ne and sw do not share a border
  const sw = g.zones.find((z) => z.id === "sw");
  const swDest = [...Array(sw.seats.length).keys()].find((i) => sw.seats[i] === null && !sw.volatileSeats.includes(i));
  assert.throws(() => gerrymander(g, {
    majorityZoneId: "central", fromZoneId: "ne", fromSeatIndex: neNonVolatileSeat,
    toZoneId: "sw", toSeatIndex: swDest
  }), /border/i);
});

test("gerrymander: rejects when budget for that majority is 0", () => {
  const { g, neNonVolatileSeat } = setup();
  g.turn.gerrymanderMoves.central = 0;
  const north = g.zones.find((z) => z.id === "north");
  const dest = [...Array(north.seats.length).keys()].find((i) => north.seats[i] === null && !north.volatileSeats.includes(i));
  assert.throws(() => gerrymander(g, {
    majorityZoneId: "central", fromZoneId: "ne", fromSeatIndex: neNonVolatileSeat,
    toZoneId: "north", toSeatIndex: dest
  }), /no moves left/i);
});
