import { test } from "node:test";
import assert from "node:assert/strict";
import { createGame } from "../src/engine/state.js";
import { passiveFor, level, POWERS } from "../src/engine/powers.js";
import { openMarket, landGrab } from "../src/engine/actions.js";

const P = [{ name: "A", color: "#1" }, { name: "B", color: "#2" }];

test("passiveFor: 1 resource per 2 ideology cards of that type", () => {
  assert.equal(passiveFor(0), 0);
  assert.equal(passiveFor(1), 0);
  assert.equal(passiveFor(2), 1);
  assert.equal(passiveFor(5), 2);
  assert.equal(passiveFor(6), 3);
});

test("level: returns 0, 4, or 6 by pile size", () => {
  assert.equal(level(0), 0);
  assert.equal(level(3), 0);
  assert.equal(level(4), 4);
  assert.equal(level(5), 4);
  assert.equal(level(6), 6);
});

test("POWERS: 4 ideologies × (L4, L6) defined", () => {
  for (const ide of ["capitalist","supremo","showman","idealist"]) {
    assert.ok(POWERS[ide].l4 && POWERS[ide].l4.name);
    assert.ok(POWERS[ide].l6 && POWERS[ide].l6.name);
  }
});

test("openMarket: pay 1 resource, take any 2; rejects without L4; once per turn", () => {
  let g = createGame({ players: P, seed: 1 });
  g.turn = { ...g.turn, phase: "actions", current: 0 };
  g.players[0].piles.capitalist = 4;
  g.players[0].resources = { funds: 1, clout: 0, media: 0, trust: 0 };
  g = openMarket(g, { give: "funds", take: ["media", "trust"] });
  assert.equal(g.players[0].resources.funds, 0);
  assert.equal(g.players[0].resources.media, 1);
  assert.equal(g.players[0].resources.trust, 1);
  assert.throws(() => openMarket(g, { give: "media", take: ["funds", "funds"] }), /already used/i);
});

test("openMarket: rejects without Capitalist L4", () => {
  let g = createGame({ players: P, seed: 1 });
  g.turn = { ...g.turn, phase: "actions", current: 0 };
  g.players[0].piles.capitalist = 3;   // below L4
  g.players[0].resources.funds = 1;
  assert.throws(() => openMarket(g, { give: "funds", take: ["media", "trust"] }), /L4|requires/i);
});

test("openMarket: requires exactly 2 valid 'take' resources", () => {
  let g = createGame({ players: P, seed: 1 });
  g.turn = { ...g.turn, phase: "actions", current: 0 };
  g.players[0].piles.capitalist = 4;
  g.players[0].resources.funds = 1;
  assert.throws(() => openMarket(g, { give: "funds", take: ["media"] }), /2/);
});

test("landGrab: evicts up to 2 non-volatile voters; opponent goes to pendingPlacements", () => {
  let g = createGame({ players: P, seed: 1 });
  g.turn = { ...g.turn, phase: "actions", current: 0 };
  g.players[0].piles.capitalist = 6;
  const c = g.zones.find((z) => z.id === "central");
  // pick a non-volatile seat for the opponent
  const nv = [...Array(c.seats.length).keys()].find((i) => !c.volatileSeats.includes(i));
  c.seats[nv] = 1;
  const next = landGrab(g, { targets: [{ zoneId: "central", seatIndex: nv }] });
  assert.equal(next.zones.find((z) => z.id === "central").seats[nv], null);
  assert.equal(next.players[1].pendingPlacements, 1);
});

test("landGrab: own evictions can be placed back in same action via replaceOwn", () => {
  let g = createGame({ players: P, seed: 1 });
  g.turn = { ...g.turn, phase: "actions", current: 0 };
  g.players[0].piles.capitalist = 6;
  const c = g.zones.find((z) => z.id === "central");
  const nv = [...Array(c.seats.length).keys()].find((i) => !c.volatileSeats.includes(i));
  c.seats[nv] = 0;
  const north = g.zones.find((z) => z.id === "north");
  const nDest = [...Array(north.seats.length).keys()].find((i) => north.seats[i] === null && !north.volatileSeats.includes(i));
  const next = landGrab(g, {
    targets: [{ zoneId: "central", seatIndex: nv }],
    replaceOwn: [{ zoneId: "north", seatIndex: nDest }]
  });
  assert.equal(next.zones.find((z) => z.id === "central").seats[nv], null);
  assert.equal(next.zones.find((z) => z.id === "north").seats[nDest], 0);
  assert.equal(next.players[0].pendingPlacements, 0);
});

test("landGrab: rejects volatile targets", () => {
  let g = createGame({ players: P, seed: 1 });
  g.turn = { ...g.turn, phase: "actions", current: 0 };
  g.players[0].piles.capitalist = 6;
  const c = g.zones.find((z) => z.id === "central");
  const vol = c.volatileSeats[0];
  c.seats[vol] = 1;
  assert.throws(() => landGrab(g, { targets: [{ zoneId: "central", seatIndex: vol }] }), /volatile/i);
});

test("landGrab: rejects without Capitalist L6", () => {
  let g = createGame({ players: P, seed: 1 });
  g.turn = { ...g.turn, phase: "actions", current: 0 };
  g.players[0].piles.capitalist = 5;
  const c = g.zones.find((z) => z.id === "central");
  const nv = [...Array(c.seats.length).keys()].find((i) => !c.volatileSeats.includes(i));
  c.seats[nv] = 1;
  assert.throws(() => landGrab(g, { targets: [{ zoneId: "central", seatIndex: nv }] }), /L6|requires/i);
});

test("landGrab: replaceOwn count must equal own-evicted count", () => {
  let g = createGame({ players: P, seed: 1 });
  g.turn = { ...g.turn, phase: "actions", current: 0 };
  g.players[0].piles.capitalist = 6;
  const c = g.zones.find((z) => z.id === "central");
  const nv = [...Array(c.seats.length).keys()].find((i) => !c.volatileSeats.includes(i));
  c.seats[nv] = 0;
  assert.throws(() => landGrab(g, { targets: [{ zoneId: "central", seatIndex: nv }] }), /replaceOwn/);
});
