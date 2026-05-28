import { test } from "node:test";
import assert from "node:assert/strict";
import { createGame } from "../src/engine/state.js";
import { draftResource, beginTurn, buyVoteBank, placeToken, endTurn } from "../src/engine/actions.js";
import { voteCount } from "../src/engine/rules.js";

const P = [{ name: "A", color: "#1" }, { name: "B", color: "#2" }];

// Helper: put game into actions phase for player 0, bypassing draft
function inActions(seed = 1) {
  const g = createGame({ players: P, seed });
  g.turn = { ...g.turn, phase: "actions", current: 0, draftRemaining: 0, firstTurn: true };
  return g;
}

// --- draft ------------------------------------------------------------------

test("draft: player 0 picks 1, player 1 picks 2, then the game begins", () => {
  let g = createGame({ players: P, seed: 1 });
  assert.equal(g.turn.phase, "draft");
  g = draftResource(g, { resource: "funds" });          // P0 pick 1 of 1
  assert.equal(g.players[0].resources.funds, 1);
  assert.equal(g.turn.current, 1);
  assert.equal(g.turn.draftRemaining, 2);
  g = draftResource(g, { resource: "clout" });          // P1 pick 1 of 2
  g = draftResource(g, { resource: "media" });          // P1 pick 2 of 2 -> begins
  assert.equal(g.players[1].resources.clout, 1);
  assert.equal(g.players[1].resources.media, 1);
  // After draft completes, beginTurn fires for player 0. The turn enters readAloud
  // (no firstTurn flag), then dilemma after doneReadAloud is called.
  assert.equal(g.turn.current, 0);
  assert.ok(g.turn.phase === "readAloud" || g.turn.phase === "dilemma",
    `expected readAloud or dilemma, got ${g.turn.phase}`);
});

test("draftResource throws once the game has begun", () => {
  let g = createGame({ players: P, seed: 1 });
  g = draftResource(g, { resource: "funds" });
  g = draftResource(g, { resource: "clout" });
  g = draftResource(g, { resource: "media" });          // game begins
  assert.throws(() => draftResource(g, { resource: "funds" }), /draft/);
});

// --- volatile seats via placeToken ------------------------------------------

test("placeToken on a volatile seat queues a headline (not immediate)", () => {
  let g = inActions();
  g.players[0].resources = { funds: 9, clout: 9, media: 9, trust: 9 };
  g = buyVoteBank(g, { openIndex: 0 });
  // Find the first zone with a volatile seat and an empty slot there
  const zone = g.zones.find((z) =>
    z.volatileSeats.length > 0 &&
    z.lockedBy === null &&
    z.coalition === null &&
    z.volatileSeats.some((vi) => z.seats[vi] === null)
  );
  assert.ok(zone, "should find a zone with an empty volatile seat");
  // If the current buy is constrained to a specific zone, reset it to allow any zone
  g.turn.currentBuy.zoneId = zone.id;
  const volIdx = zone.volatileSeats.find((vi) => zone.seats[vi] === null);
  const next = placeToken(g, { zoneId: zone.id, seatIndex: volIdx });
  assert.deepEqual(next.turn.pendingHeadlines, [{ zoneId: zone.id, playerId: 0 }]);
  assert.equal(next.lastHeadline, null);   // not resolved yet
});

test("pending headline from volatile seat resolves at endTurn drain", () => {
  let g = inActions();
  g.players[0].resources = { funds: 9, clout: 9, media: 9, trust: 9 };
  g = buyVoteBank(g, { openIndex: 0 });
  const zone = g.zones.find((z) =>
    z.volatileSeats.length > 0 &&
    z.lockedBy === null &&
    z.coalition === null &&
    z.volatileSeats.some((vi) => z.seats[vi] === null)
  );
  const volIdx = zone.volatileSeats.find((vi) => zone.seats[vi] === null);
  g.turn.currentBuy.zoneId = zone.id;
  g = placeToken(g, { zoneId: zone.id, seatIndex: volIdx });
  assert.equal(g.turn.pendingHeadlines.length, 1);
  // Now place any remaining tokens (currentBuy might still have tokens)
  while (g.turn.currentBuy && g.turn.currentBuy.tokensRemaining > 0) {
    // place in same zone on a non-volatile empty seat
    const nonVolIdx = zone.seats.findIndex((s, i) => s === null && !zone.volatileSeats.includes(i));
    if (nonVolIdx === -1) break;
    // Need to re-fetch zone from g since placeToken clones
    const z = g.zones.find((z2) => z2.id === zone.id);
    const ni = z.seats.findIndex((s, i) => s === null && !z.volatileSeats.includes(i));
    if (ni === -1) break;
    g = placeToken(g, { zoneId: zone.id, seatIndex: ni });
  }
  // Make sure we're in actions phase with no currentBuy before endTurn
  if (g.turn.currentBuy) g.turn.currentBuy = null;
  g = endTurn(g);
  // Headline should have been resolved
  assert.equal(g.turn.pendingHeadlines.length, 0);
  assert.ok(g.lastHeadline !== null);
});

test("placeToken on a volatile seat that completes majority: zone locks, headline queued", () => {
  let g = inActions();
  g.players[0].resources = { funds: 9, clout: 9, media: 9, trust: 9 };
  // Use the 'ne' corner (capacity 11, majority 6), put 5 existing voters there
  const ne = g.zones.find((z) => z.id === "ne");
  for (let i = 0; i < 5; i++) {
    const nonVol = [...Array(ne.seats.length).keys()].find((idx) => !ne.volatileSeats.includes(idx) && ne.seats[idx] === null);
    ne.seats[nonVol] = 0;
  }
  // Buy a card and set up a 1-token buy aimed at 'ne'
  g = buyVoteBank(g, { openIndex: 0 });
  g.turn.currentBuy = { ...g.turn.currentBuy, zoneId: "ne", tokensRemaining: 1 };
  // Place on a volatile seat — this should trigger the 6th voter and lock the zone
  const ne2 = g.zones.find((z) => z.id === "ne");
  const volIdx = ne2.volatileSeats.find((vi) => ne2.seats[vi] === null);
  assert.ok(volIdx !== undefined, "ne should have an empty volatile seat");
  const next = placeToken(g, { zoneId: "ne", seatIndex: volIdx });
  const ne3 = next.zones.find((z) => z.id === "ne");
  assert.equal(ne3.lockedBy, 0);
  assert.equal(next.turn.pendingHeadlines.length, 1);
});
