import { test } from "node:test";
import assert from "node:assert/strict";
import { createGame } from "../src/engine/state.js";
import { beginTurn, answerDilemma, usePower, buyVoter } from "../src/engine/actions.js";

const P = [{ name: "A", color: "#1" }, { name: "B", color: "#2" }];
function ready(seed = 1) { return answerDilemma(beginTurn(createGame({ players: P, seed })), { answerIndex: 0 }); }
function give(g, pid, res) { Object.assign(g.players[pid].resources, res); return g; }

test("Capitalist T2 converts 3 funds into 2 chosen resources, once per turn", () => {
  let g = give(ready(), 0, { funds: 3, clout: 0, media: 0, trust: 0 });
  g.players[0].piles.capitalist = 3;   // tier 2
  g = usePower(g, { ideology: "capitalist", tier: 2, params: { gain: { media: 1, trust: 1 } } });
  assert.equal(g.players[0].resources.funds, 0);
  assert.equal(g.players[0].resources.media, 1);
  assert.equal(g.players[0].resources.trust, 1);
  assert.throws(() => usePower(g, { ideology: "capitalist", tier: 2, params: { gain: { media: 2 } } }), /already used/);
});

test("Capitalist T1 discount makes the next voter cost 1 less", () => {
  let g = give(ready(), 0, { trust: 1, media: 0 });   // v1 normally needs trust1+media1
  g.players[0].piles.capitalist = 2;   // tier 1
  g = usePower(g, { ideology: "capitalist", tier: 1, params: {} });
  g = buyVoter(g, { offerId: "v1", zoneId: "z4" });    // discount waives 1 resource
  assert.equal(g.zones.find((z) => z.id === "z4").pegs[0], 1);
});

test("Supremo T2 removes an opponent non-majority peg from a zone you're in", () => {
  let g = ready();
  g.players[0].piles.supremo = 3;   // tier 2
  const z = g.zones.find((z) => z.id === "z4");
  z.pegs = { 0: 1, 1: 2 };
  g = usePower(g, { ideology: "supremo", tier: 2, params: { zoneId: "z4", pegOwner: 1 } });
  assert.equal(g.zones.find((z) => z.id === "z4").pegs[1], 1);
});

test("usePower throws when tier not unlocked", () => {
  let g = ready();
  assert.throws(() => usePower(g, { ideology: "supremo", tier: 2, params: { zoneId: "z4", pegOwner: 1 } }), /not unlocked/);
});

test("Idealist T3 sways one neighboring non-majority peg to you", () => {
  let g = ready();
  g.players[0].piles.idealist = 5;   // tier 3
  g.zones.find((z) => z.id === "z4").pegs = { 0: 1 };  // presence
  g.zones.find((z) => z.id === "z5").pegs = { 1: 1 };  // neighbor with opp peg
  g = usePower(g, { ideology: "idealist", tier: 3, params: { zoneId: "z5", pegOwner: 1 } });
  const z5 = g.zones.find((z) => z.id === "z5");
  assert.equal((z5.pegs[1] || 0), 0);
  assert.equal(z5.pegs[0], 1);
});
