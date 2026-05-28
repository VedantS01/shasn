import { test } from "node:test";
import assert from "node:assert/strict";
import { createGame } from "../src/engine/state.js";
import { buyVoteBank } from "../src/engine/actions.js";
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
