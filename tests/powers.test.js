import { test } from "node:test";
import assert from "node:assert/strict";
import { createGame } from "../src/engine/state.js";
import { passiveFor, level, POWERS } from "../src/engine/powers.js";
import { openMarket } from "../src/engine/actions.js";

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
