import { test } from "node:test";
import assert from "node:assert/strict";
import { createGame } from "../src/engine/state.js";
import { buyVoteBank, placeToken } from "../src/engine/actions.js";
import { VOTE_BANK_BY_ID } from "../src/data/voteBank.js";

const P = [{ name: "A", color: "#1" }, { name: "B", color: "#2" }];

function inActions(g, pid = 0) {
  g.turn = { ...g.turn, phase: "actions", current: pid };
  return g;
}

test("buyVoteBank: pays the open card's cost, queues toPlace=value, replaces the slot", () => {
  let g = inActions(createGame({ players: P, seed: 1 }));
  const card = VOTE_BANK_BY_ID[g.market.open[0]];
  for (const [r, n] of Object.entries(card.cost)) g.players[0].resources[r] = n + 1;
  const next = buyVoteBank(g, { openIndex: 0 });
  assert.equal(next.turn.currentBuy.cardId, card.id);
  assert.equal(next.turn.currentBuy.zoneId, null);
  assert.equal(next.turn.currentBuy.tokensRemaining, card.value);
  for (const [r, n] of Object.entries(card.cost)) {
    assert.equal(next.players[0].resources[r], 1);
  }
  assert.equal(next.market.open.length, 3);
  assert.equal(next.market.open.includes(card.id), false);
});

test("buyVoteBank: throws on unaffordable card", () => {
  let g = inActions(createGame({ players: P, seed: 1 }));
  g.players[0].resources = { funds: 0, clout: 0, media: 0, trust: 0 };
  assert.throws(() => buyVoteBank(g, { openIndex: 0 }), /afford/i);
});

test("buyVoteBank: blocked while a buy is already in flight (tokensRemaining>0)", () => {
  let g = inActions(createGame({ players: P, seed: 1 }));
  g.players[0].resources = { funds: 9, clout: 9, media: 9, trust: 9 };
  g.turn.currentBuy = { cardId: "x", zoneId: null, tokensRemaining: 1 };
  assert.throws(() => buyVoteBank(g, { openIndex: 0 }), /finish placing/i);
});

test("buyVoteBank: Blind Faith with Idealist L4 waives the marked resource", () => {
  let g = inActions(createGame({ players: P, seed: 1 }));
  const card = VOTE_BANK_BY_ID[g.market.open[0]];
  // Make player have everything EXCEPT the marked resource
  g.players[0].piles.idealist = 4;
  for (const [r, n] of Object.entries(card.cost)) {
    g.players[0].resources[r] = r === card.markedResource ? 0 : n;
  }
  const next = buyVoteBank(g, { openIndex: 0, useBlindFaith: true });
  assert.equal(next.turn.currentBuy.cardId, card.id);
  // marked resource was not spent
  assert.equal(next.players[0].resources[card.markedResource], 0);
});

test("buyVoteBank: Blind Faith rejected without Idealist L4", () => {
  let g = inActions(createGame({ players: P, seed: 1 }));
  g.players[0].resources = { funds: 9, clout: 9, media: 9, trust: 9 };
  assert.throws(() => buyVoteBank(g, { openIndex: 0, useBlindFaith: true }), /Blind Faith/);
});

test("buyVoteBank: Showman L4 Echo Chamber grants +1 voter (unique cards, cap 3)", () => {
  let g = inActions(createGame({ players: P, seed: 1 }));
  g.players[0].piles.showman = 4;
  g.players[0].resources = { funds: 9, clout: 9, media: 9, trust: 9 };
  const card = VOTE_BANK_BY_ID[g.market.open[0]];
  const next = buyVoteBank(g, { openIndex: 0 });
  assert.equal(next.turn.currentBuy.tokensRemaining, card.value + 1);
});

test("placeToken: locks zone on first placement of a buy; subsequent tokens must go same-zone", () => {
  let g = inActions(createGame({ players: P, seed: 1 }));
  g.turn.currentBuy = { cardId: "vb01", zoneId: null, tokensRemaining: 2 };
  g = placeToken(g, { zoneId: "central", seatIndex: 0 });
  assert.equal(g.turn.currentBuy.zoneId, "central");
  assert.throws(() => placeToken(g, { zoneId: "north", seatIndex: 0 }), /same zone/i);
});

test("placeToken: when threshold reached, flips exactly `majority` of player's seats S-side up", () => {
  let g = inActions(createGame({ players: P, seed: 1 }));
  const corner = g.zones.find((z) => z.id === "ne");  // capacity 11, majority 6
  for (let i = 0; i < 5; i++) corner.seats[i] = 0;
  g.turn.currentBuy = { cardId: "vb01", zoneId: "ne", tokensRemaining: 1 };
  g = placeToken(g, { zoneId: "ne", seatIndex: 5 });
  const after = g.zones.find((z) => z.id === "ne");
  assert.equal(after.lockedBy, 0);
  assert.equal(after.flippedSeats.filter(Boolean).length, 6);
});

test("placeToken: volatile seat queues a headline (no immediate resolve)", () => {
  let g = inActions(createGame({ players: P, seed: 1 }));
  g.turn.currentBuy = { cardId: "vb01", zoneId: null, tokensRemaining: 1 };
  const c = g.zones.find((z) => z.id === "central");
  const volIdx = c.volatileSeats[0];
  const next = placeToken(g, { zoneId: "central", seatIndex: volIdx });
  assert.deepEqual(next.turn.pendingHeadlines, [{ zoneId: "central", playerId: 0 }]);
  assert.equal(next.lastHeadline, null);
});

test("placeToken: placePending phase consumes from pendingPlacements, no same-zone rule", () => {
  let g = createGame({ players: P, seed: 1 });
  g.turn = { ...g.turn, phase: "placePending", current: 0 };
  g.players[0].pendingPlacements = 2;
  g = placeToken(g, { zoneId: "central", seatIndex: 0 });
  assert.equal(g.players[0].pendingPlacements, 1);
  assert.equal(g.turn.phase, "placePending");   // still 1 to place
  g = placeToken(g, { zoneId: "north", seatIndex: 0 });   // different zone is fine
  assert.equal(g.players[0].pendingPlacements, 0);
  assert.equal(g.turn.phase, "actions");
});
