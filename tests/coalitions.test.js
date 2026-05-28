import { test } from "node:test";
import assert from "node:assert/strict";
import { createGame } from "../src/engine/state.js";
import { proposeCoalition, respondCoalition, withdrawCoalition } from "../src/engine/actions.js";

const P = [{ name: "A", color: "#1" }, { name: "B", color: "#2" }];

function preSeed(g, zoneId, p0count, p1count) {
  const z = g.zones.find((x) => x.id === zoneId);
  for (let i = 0; i < p0count; i++) z.seats[i] = 0;
  for (let i = 0; i < p1count; i++) z.seats[p0count + i] = 1;
  return g;
}

test("proposeCoalition: records pendingProposal; phase=coalitionAccept", () => {
  let g = createGame({ players: P, seed: 1 });
  g.turn = { ...g.turn, phase: "actions", current: 0 };
  preSeed(g, "ne", 3, 3);   // ne majority=6
  g.players[0].piles.capitalist = 2;
  g = proposeCoalition(g, {
    to: 1, zoneId: "ne",
    split: { 0: 3, 1: 3 },
    myCardId: "capitalist"
  });
  assert.equal(g.turn.phase, "coalitionAccept");
  assert.equal(g.turn.pendingProposal.kind, "coalition");
});

test("respondCoalition(accept): flips split, swaps cards, marks zone.coalition, no gerry", () => {
  let g = createGame({ players: P, seed: 1 });
  g.turn = { ...g.turn, phase: "actions", current: 0 };
  preSeed(g, "ne", 3, 3);
  g.players[0].piles.capitalist = 2;
  g.players[1].piles.supremo = 2;
  g = proposeCoalition(g, {
    to: 1, zoneId: "ne", split: { 0: 3, 1: 3 }, myCardId: "capitalist"
  });
  g = respondCoalition(g, { accept: true, partnerCardId: "supremo" });
  const ne = g.zones.find((z) => z.id === "ne");
  assert.ok(ne.coalition);
  assert.deepEqual([...ne.coalition.partners].sort(), [0, 1]);
  assert.equal(ne.flippedSeats.filter(Boolean).length, 6);
  assert.equal(g.players[0].piles.capitalist, 1);
  assert.equal(g.players[0].piles.supremo, 1);
  assert.equal(g.players[1].piles.supremo, 1);
  assert.equal(g.players[1].piles.capitalist, 1);
});

test("respondCoalition: rejects cards not from most-held ideology", () => {
  let g = createGame({ players: P, seed: 1 });
  g.turn = { ...g.turn, phase: "actions", current: 0 };
  preSeed(g, "ne", 3, 3);
  g.players[0].piles.capitalist = 3;
  g.players[1].piles.supremo = 1; g.players[1].piles.showman = 3;
  g = proposeCoalition(g, {
    to: 1, zoneId: "ne", split: { 0: 3, 1: 3 }, myCardId: "capitalist"
  });
  assert.throws(() => respondCoalition(g, { accept: true, partnerCardId: "supremo" }),
    /most-held/i);
});

test("withdrawCoalition: clears coalition, unflips withdrawer's seats; cards stay swapped", () => {
  let g = createGame({ players: P, seed: 1 });
  g.turn = { ...g.turn, phase: "actions", current: 0 };
  preSeed(g, "ne", 3, 3);
  g.players[0].piles.capitalist = 2;
  g.players[1].piles.supremo = 2;
  g = proposeCoalition(g, { to: 1, zoneId: "ne", split: { 0: 3, 1: 3 }, myCardId: "capitalist" });
  g = respondCoalition(g, { accept: true, partnerCardId: "supremo" });
  g = withdrawCoalition(g, { zoneId: "ne" });
  const ne = g.zones.find((z) => z.id === "ne");
  assert.equal(ne.coalition, null);
  assert.equal(ne.lockedBy, null);  // neither alone meets threshold (6)
  assert.equal(g.players[0].piles.supremo, 1);    // cards stayed swapped
  assert.equal(g.players[1].piles.capitalist, 1);
});

test("proposeCoalition: rejects when proposer alone already meets threshold", () => {
  let g = createGame({ players: P, seed: 1 });
  g.turn = { ...g.turn, phase: "actions", current: 0 };
  preSeed(g, "ne", 6, 1);   // proposer already has majority
  g.players[0].piles.capitalist = 2;
  assert.throws(() => proposeCoalition(g, {
    to: 1, zoneId: "ne", split: { 0: 6, 1: 1 }, myCardId: "capitalist"
  }), /already.*threshold|meet.*alone/i);
});
