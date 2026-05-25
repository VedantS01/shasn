import { test } from "node:test";
import assert from "node:assert/strict";
import { createGame } from "../src/engine/state.js";
import { beginTurn, answerDilemma, endTurn, buyVoter, gerrymander, drawExtraDilemma } from "../src/engine/actions.js";
import { DILEMMA_BY_ID } from "../src/data/dilemmas.js";

const P = [{ name: "A", color: "#1" }, { name: "B", color: "#2" }];

test("beginTurn draws a dilemma and sets phase to dilemma", () => {
  const g = beginTurn(createGame({ players: P, seed: 1 }));
  assert.ok(g.turn.pendingDilemma);
  assert.equal(g.turn.phase, "dilemma");
});

test("answerDilemma applies payout, increments pile, advances to actions", () => {
  let g = beginTurn(createGame({ players: P, seed: 1 }));
  const card = DILEMMA_BY_ID[g.turn.pendingDilemma];
  const ans = card.answers[0];
  g = answerDilemma(g, { answerIndex: 0 });
  for (const [r, n] of Object.entries(ans.payout)) assert.equal(g.players[0].resources[r], n);
  assert.equal(g.players[0].piles[ans.ideology], 1);
  assert.equal(g.turn.phase, "actions");
  assert.equal(g.turn.pendingDilemma, null);
});

test("answerDilemma throws if not in dilemma phase", () => {
  let g = beginTurn(createGame({ players: P, seed: 1 }));
  g = answerDilemma(g, { answerIndex: 0 });
  assert.throws(() => answerDilemma(g, { answerIndex: 0 }), /phase/);
});

test("endTurn advances to next player and begins their turn", () => {
  let g = beginTurn(createGame({ players: P, seed: 1 }));
  g = answerDilemma(g, { answerIndex: 0 });
  g = endTurn(g);
  assert.equal(g.turn.current, 1);
  assert.equal(g.turn.phase, "dilemma");
  assert.ok(g.turn.pendingDilemma);
});

test("endTurn throws during dilemma phase", () => {
  const g = beginTurn(createGame({ players: P, seed: 1 }));
  assert.throws(() => endTurn(g), /phase/);
});

test("Idealist tier-1 grants +1 trust at start of turn", () => {
  let g = createGame({ players: P, seed: 1 });
  g.players[0].piles.idealist = 2;           // tier 1 unlocked
  g = beginTurn(g);
  assert.equal(g.players[0].resources.trust, 1);
});

test("usedThisTurn resets at the start of a turn", () => {
  let g = beginTurn(createGame({ players: P, seed: 1 }));
  g.players[0].usedThisTurn["capitalist:t1"] = true;
  g = answerDilemma(g, { answerIndex: 0 });
  g = endTurn(g);                            // -> player 1
  g = answerDilemma(g, { answerIndex: 0 });
  g = endTurn(g);                            // -> player 0 again, beginTurn ran
  assert.deepEqual(g.players[0].usedThisTurn, {});
});

test("drawExtraDilemma returns to dilemma phase without re-applying start-of-turn bonus", () => {
  let g = beginTurn(createGame({ players: P, seed: 1 }));
  g.players[0].piles.idealist = 2;           // tier 1 (start-of-turn +1 trust)
  g = answerDilemma(g, { answerIndex: 0 });
  const trustBefore = g.players[0].resources.trust;
  g = drawExtraDilemma(g);
  assert.equal(g.turn.phase, "dilemma");
  assert.ok(g.turn.pendingDilemma);
  assert.equal(g.players[0].resources.trust, trustBefore); // no extra trust applied
});

// --- voters / placement / gerrymander --------------------------------------
function giveResources(g, pid, res) { Object.assign(g.players[pid].resources, res); return g; }

test("buyVoter deducts cost and places pegs in a legal zone", () => {
  let g = beginTurn(createGame({ players: P, seed: 1 }));
  g = answerDilemma(g, { answerIndex: 0 });
  g = giveResources(g, 0, { funds: 9, clout: 9, media: 9, trust: 9 });
  g = buyVoter(g, { offerId: "v1", zoneId: "z4" });    // v1: value 1, cost trust1+media1
  const z4 = g.zones.find((z) => z.id === "z4");
  assert.equal(z4.pegs[0], 1);
  assert.equal(g.players[0].resources.trust, 8);
  assert.equal(g.players[0].resources.media, 8);
});

test("buyVoter throws when unaffordable or illegal placement", () => {
  let g = beginTurn(createGame({ players: P, seed: 1 }));
  g = answerDilemma(g, { answerIndex: 0 });
  assert.throws(() => buyVoter(g, { offerId: "v3", zoneId: "z4" }), /afford/);
  g = giveResources(g, 0, { funds: 9, clout: 9, media: 9, trust: 9 });
  g.zones.find((z) => z.id === "z0").lockedBy = 1;
  assert.throws(() => buyVoter(g, { offerId: "v1", zoneId: "z0" }), /place/);
});

test("buyVoter locks zone and grants a gerrymander on reaching majority", () => {
  let g = beginTurn(createGame({ players: P, seed: 1 }));
  g = answerDilemma(g, { answerIndex: 0 });
  g = giveResources(g, 0, { funds: 99, clout: 99, media: 99, trust: 99 });
  g = buyVoter(g, { offerId: "v2", zoneId: "z6" });    // 2 pegs
  g = buyVoter(g, { offerId: "v1", zoneId: "z6" });    // +1 => 3 pegs == threshold
  const z6 = g.zones.find((z) => z.id === "z6");
  assert.equal(z6.lockedBy, 0);
  assert.equal(g.turn.gerrymanders, 1);
});

test("Supremo tier-1 grants an extra gerrymander on lock", () => {
  let g = beginTurn(createGame({ players: P, seed: 1 }));
  g = answerDilemma(g, { answerIndex: 0 });
  g.players[0].piles.supremo = 2;                       // tier 1
  g = giveResources(g, 0, { funds: 99, clout: 99, media: 99, trust: 99 });
  g = buyVoter(g, { offerId: "v2", zoneId: "z6" });
  g = buyVoter(g, { offerId: "v1", zoneId: "z6" });
  assert.equal(g.turn.gerrymanders, 2);
});

test("gerrymander moves one non-majority peg to an adjacent zone and decrements", () => {
  let g = beginTurn(createGame({ players: P, seed: 1 }));
  g = answerDilemma(g, { answerIndex: 0 });
  g.zones.find((z) => z.id === "z7").pegs = { 1: 1 };
  g.turn.gerrymanders = 1;
  g = gerrymander(g, { fromZone: "z7", toZone: "z6", pegOwner: 1 });
  assert.equal((g.zones.find((z) => z.id === "z7").pegs[1] || 0), 0);
  assert.equal(g.zones.find((z) => z.id === "z6").pegs[1], 1);
  assert.equal(g.turn.gerrymanders, 0);
});

test("gerrymander throws without a grant, across non-neighbors, or on a majority peg", () => {
  let g = beginTurn(createGame({ players: P, seed: 1 }));
  g = answerDilemma(g, { answerIndex: 0 });
  g.zones.find((z) => z.id === "z7").pegs = { 1: 1 };
  assert.throws(() => gerrymander(g, { fromZone: "z7", toZone: "z6", pegOwner: 1 }), /no gerrymander/);
  g.turn.gerrymanders = 1;
  assert.throws(() => gerrymander(g, { fromZone: "z7", toZone: "z0", pegOwner: 1 }), /adjacent/);
  g.zones.find((z) => z.id === "z7").pegs = { 1: 5 };  // majority peg block
  assert.throws(() => gerrymander(g, { fromZone: "z7", toZone: "z6", pegOwner: 1 }), /non-majority/);
});
