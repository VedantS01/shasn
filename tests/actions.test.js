import { test } from "node:test";
import assert from "node:assert/strict";
import { createGame } from "../src/engine/state.js";
import { beginTurn, answerDilemma, endTurn, buyVoter, placeToken, gerrymander, drawExtraDilemma } from "../src/engine/actions.js";
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

function actionsReady(seed = 1) {
  return answerDilemma(beginTurn(createGame({ players: P, seed })), { answerIndex: 0 });
}

test("buyVoter deducts cost and grants tokens to place at chosen circles", () => {
  let g = giveResources(actionsReady(), 0, { funds: 9, clout: 9, media: 9, trust: 9 });
  g = buyVoter(g, { offerId: "v1" });                  // v1: value 1, cost trust1+media1
  assert.equal(g.turn.toPlace, 1);
  assert.equal(g.players[0].resources.trust, 8);
  assert.equal(g.players[0].resources.media, 8);
  g = placeToken(g, { zoneId: "z4", seatIndex: 3 });   // chosen circle
  assert.equal(g.zones.find((z) => z.id === "z4").seats[3], 0);
  assert.equal(g.turn.toPlace, 0);
});

test("buyVoter throws when unaffordable; placeToken throws on taken/locked/illegal circle", () => {
  let g = actionsReady();
  assert.throws(() => buyVoter(g, { offerId: "v3" }), /afford/);
  g = giveResources(g, 0, { funds: 9, clout: 9, media: 9, trust: 9 });
  g = buyVoter(g, { offerId: "v1" });
  assert.throws(() => placeToken(g, { zoneId: "z4", seatIndex: 99 }), /not available/);
  g.zones.find((z) => z.id === "z0").lockedBy = 1;
  assert.throws(() => placeToken(g, { zoneId: "z0", seatIndex: 0 }), /place/);
});

test("buyVoter is blocked until bought tokens are placed", () => {
  let g = giveResources(actionsReady(), 0, { funds: 9, clout: 9, media: 9, trust: 9 });
  g = buyVoter(g, { offerId: "v1" });
  assert.throws(() => buyVoter(g, { offerId: "v1" }), /finish placing/);
});

test("placing to a majority locks the zone and grants a gerrymander", () => {
  let g = giveResources(actionsReady(), 0, { funds: 99, clout: 99, media: 99, trust: 99 });
  g = buyVoter(g, { offerId: "v2" });                  // z6 cap5, threshold 3
  g = placeToken(g, { zoneId: "z6", seatIndex: 0 });
  g = placeToken(g, { zoneId: "z6", seatIndex: 1 });
  g = buyVoter(g, { offerId: "v1" });
  g = placeToken(g, { zoneId: "z6", seatIndex: 2 });   // 3rd -> majority
  const z6 = g.zones.find((z) => z.id === "z6");
  assert.equal(z6.lockedBy, 0);
  assert.equal(g.turn.gerrymanders, 1);
});

test("Supremo tier-1 grants an extra gerrymander on lock", () => {
  let g = giveResources(actionsReady(), 0, { funds: 99, clout: 99, media: 99, trust: 99 });
  g.players[0].piles.supremo = 2;                      // tier 1
  g = buyVoter(g, { offerId: "v2" });
  g = placeToken(g, { zoneId: "z6", seatIndex: 0 });
  g = placeToken(g, { zoneId: "z6", seatIndex: 1 });
  g = buyVoter(g, { offerId: "v1" });
  g = placeToken(g, { zoneId: "z6", seatIndex: 2 });
  assert.equal(g.turn.gerrymanders, 2);
});

function setSeats(g, id, owners) {
  const z = g.zones.find((z) => z.id === id);
  z.seats = z.seats.map(() => null);
  owners.forEach((o, i) => { z.seats[i] = o; });
  return g;
}

test("gerrymander moves one non-majority peg to an adjacent zone and decrements", () => {
  let g = setSeats(actionsReady(), "z7", [1]);
  g.turn.gerrymanders = 1;
  g = gerrymander(g, { fromZone: "z7", toZone: "z6", pegOwner: 1 });
  assert.equal(g.zones.find((z) => z.id === "z7").seats.filter((s) => s === 1).length, 0);
  assert.equal(g.zones.find((z) => z.id === "z6").seats.filter((s) => s === 1).length, 1);
  assert.equal(g.turn.gerrymanders, 0);
});

test("gerrymander throws without a grant, across non-neighbors, or on a majority peg", () => {
  let g = setSeats(actionsReady(), "z7", [1]);
  assert.throws(() => gerrymander(g, { fromZone: "z7", toZone: "z6", pegOwner: 1 }), /no gerrymander/);
  g.turn.gerrymanders = 1;
  assert.throws(() => gerrymander(g, { fromZone: "z7", toZone: "z0", pegOwner: 1 }), /adjacent/);
  setSeats(g, "z7", [1, 1, 1, 1]);                     // z7 cap7, threshold 4 -> majority
  assert.throws(() => gerrymander(g, { fromZone: "z7", toZone: "z6", pegOwner: 1 }), /non-majority/);
});
