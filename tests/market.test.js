import { test } from "node:test";
import assert from "node:assert/strict";
import { createGame } from "../src/engine/state.js";
import { takeOpen, refill, reshuffleIfEmpty } from "../src/engine/market.js";
import { VOTE_BANK } from "../src/data/voteBank.js";

const P = [{ name: "A", color: "#1" }, { name: "B", color: "#2" }];

test("takeOpen: removes the chosen open card, moves it to discard, refills from deck", () => {
  let g = createGame({ players: P, seed: 1 });
  const taken = g.market.open[1];
  const next = takeOpen(g, 1);
  assert.equal(next.market.discard[0], taken);
  assert.equal(next.market.open.length, 3);
  assert.equal(next.market.open.includes(taken), false);
  assert.equal(next.market.deck.length, g.market.deck.length - 1);
});

test("reshuffleIfEmpty: when deck empty, discard becomes a new shuffled deck", () => {
  let g = createGame({ players: P, seed: 1 });
  g.market.deck = [];
  g.market.discard = ["vb01", "vb02", "vb03"];
  const next = reshuffleIfEmpty(g);
  assert.equal(next.market.deck.length, 3);
  assert.equal(next.market.discard.length, 0);
});

test("refill: leaves market.open with 3 cards", () => {
  let g = createGame({ players: P, seed: 1 });
  g.market.open = [g.market.open[0]];
  const next = refill(g);
  assert.equal(next.market.open.length, 3);
});
