import { test } from "node:test";
import assert from "node:assert/strict";
import { createGame } from "../src/engine/state.js";
import { ZONES } from "../src/data/map.js";
import { VOTE_BANK } from "../src/data/voteBank.js";

const P = [{ name: "A", color: "#1" }, { name: "B", color: "#2" }];

test("createGame: zones have seats[], flippedSeats[], volatileSeats, coalition=null", () => {
  const g = createGame({ players: P, seed: 1 });
  for (const z of g.zones) {
    const def = ZONES.find((x) => x.id === z.id);
    assert.equal(z.seats.length, def.capacity);
    assert.equal(z.flippedSeats.length, def.capacity);
    assert.ok(z.seats.every((s) => s === null));
    assert.ok(z.flippedSeats.every((f) => f === false));
    assert.deepEqual(z.volatileSeats, def.volatileSeats);
    assert.equal(z.coalition, null);
    assert.equal(z.lockedBy, null);
  }
});

test("createGame: market deck has 60 cards shuffled, 3 open, 0 discarded", () => {
  const g = createGame({ players: P, seed: 1 });
  assert.equal(g.market.open.length, 3);
  assert.equal(g.market.deck.length + g.market.open.length + g.market.discard.length, VOTE_BANK.length);
  assert.equal(g.market.discard.length, 0);
});

test("createGame: players have pendingPlacements=0 and full power-tracker fields", () => {
  const g = createGame({ players: P, seed: 1 });
  for (const p of g.players) {
    assert.equal(p.pendingPlacements, 0);
    assert.deepEqual(p.usedThisTurn, {});
  }
});

test("createGame: turn opens in 'draft' phase, no pending headlines/proposal/gerry budget", () => {
  const g = createGame({ players: P, seed: 1 });
  assert.equal(g.turn.phase, "draft");
  assert.deepEqual(g.turn.pendingHeadlines, []);
  assert.equal(g.turn.pendingProposal, null);
  assert.deepEqual(g.turn.gerrymanderMoves, {});
  assert.equal(g.turn.currentBuy, null);
});

test("createGame: deterministic for same seed", () => {
  const a = createGame({ players: P, seed: 42 });
  const b = createGame({ players: P, seed: 42 });
  assert.deepEqual(a.market.open, b.market.open);
  assert.deepEqual(a.market.deck, b.market.deck);
});
