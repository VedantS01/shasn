import { test } from "node:test";
import assert from "node:assert/strict";
import { createGame } from "../src/engine/state.js";
import { beginTurn, answerDilemma, buyConspiracy, playConspiracy } from "../src/engine/actions.js";

const P = [{ name: "A", color: "#1" }, { name: "B", color: "#2" }];
function ready(seed = 1) { return answerDilemma(beginTurn(createGame({ players: P, seed })), { answerIndex: 0 }); }
function give(g, pid, res) { Object.assign(g.players[pid].resources, res); return g; }

test("buyConspiracy spends 4-5 chosen resources and draws into hand", () => {
  let g = give(ready(), 0, { funds: 5, clout: 5, media: 5, trust: 5 });
  const before = g.players[0].hand.length;
  g = buyConspiracy(g, { spend: { funds: 2, clout: 2 } });   // total 4
  assert.equal(g.players[0].hand.length, before + 1);
  assert.equal(g.players[0].resources.funds, 3);
  assert.equal(g.players[0].resources.clout, 3);
});

test("buyConspiracy rejects spend below 4 (no Showstopper) or above 5", () => {
  let g = give(ready(), 0, { funds: 9, clout: 9, media: 9, trust: 9 });
  assert.throws(() => buyConspiracy(g, { spend: { funds: 3 } }), /spend/);
  assert.throws(() => buyConspiracy(g, { spend: { funds: 6 } }), /spend/);
});

test("Showstopper tier-2 allows a minimum spend of 3", () => {
  let g = give(ready(), 0, { funds: 9, clout: 9, media: 9, trust: 9 });
  g.players[0].piles.showstopper = 3;     // tier 2
  g = buyConspiracy(g, { spend: { funds: 3 } });
  assert.equal(g.players[0].resources.funds, 6);
});

test("playConspiracy grantResource adds resources and discards the card", () => {
  let g = give(ready(), 0, { funds: 0, clout: 0, media: 0, trust: 0 });
  g.players[0].hand = ["c001"];           // War Chest: +3 funds
  g = playConspiracy(g, { cardId: "c001" });
  assert.equal(g.players[0].resources.funds, 3);
  assert.ok(!g.players[0].hand.includes("c001"));
  assert.ok(g.decks.conspiracyDiscard.includes("c001"));
});

test("playConspiracy stealResource moves resources from target to actor", () => {
  let g = give(ready(), 0, { funds: 0, clout: 0, media: 0, trust: 0 });
  g.players[0].hand = ["c002"];           // Smear: steal 2 media
  g.players[1].resources.media = 5;
  g = playConspiracy(g, { cardId: "c002", target: { playerId: 1 } });
  assert.equal(g.players[1].resources.media, 3);
  assert.equal(g.players[0].resources.media, 2);
});

test("playConspiracy removePeg removes a non-majority peg from a zone", () => {
  let g = ready();
  g.players[0].hand = ["c005"];           // Booth Capture
  g.zones.find((z) => z.id === "z4").pegs = { 1: 2 };
  g = playConspiracy(g, { cardId: "c005", target: { zoneId: "z4", pegOwner: 1 } });
  assert.equal((g.zones.find((z) => z.id === "z4").pegs[1] || 0), 1);
});

test("playConspiracy throws if card not in hand", () => {
  let g = ready();
  assert.throws(() => playConspiracy(g, { cardId: "c001" }), /not in hand/);
});
