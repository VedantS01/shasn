import { test } from "node:test";
import assert from "node:assert/strict";
import { createGame } from "../src/engine/state.js";
import { draftResource, occupyVolatile } from "../src/engine/actions.js";
import { effectivePegs } from "../src/engine/rules.js";

const P = [{ name: "A", color: "#1" }, { name: "B", color: "#2" }];
function actions(seed = 1) {
  const g = createGame({ players: P, seed });
  g.turn = { current: 0, phase: "actions", pendingDilemma: null, gerrymanders: 0 };
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
  g = draftResource(g, { resource: "media" });          // P1 pick 2 of 2 -> begin
  assert.equal(g.players[1].resources.clout, 1);
  assert.equal(g.players[1].resources.media, 1);
  assert.equal(g.turn.phase, "dilemma");
  assert.equal(g.turn.current, 0);
  assert.ok(g.turn.pendingDilemma);
});

test("draftResource throws once the game has begun", () => {
  let g = createGame({ players: P, seed: 1 });
  g = draftResource(g, { resource: "funds" });
  g = draftResource(g, { resource: "clout" });
  g = draftResource(g, { resource: "media" });          // game begins
  assert.throws(() => draftResource(g, { resource: "funds" }), /draft/);
});

// --- volatile seats + headlines --------------------------------------------
test("occupyVolatile pays the cost, seizes the seat, and triggers a headline", () => {
  let g = actions();
  Object.assign(g.players[0].resources, { funds: 0, clout: 2, media: 2, trust: 0 });
  g.decks.headlineDraw = ["h07"];                        // Donor Surge: +2 funds
  g = occupyVolatile(g, { zoneId: "z4" });
  const z4 = g.zones.find((z) => z.id === "z4");
  assert.equal(z4.volatileOwner, 0);
  assert.equal(g.players[0].resources.clout, 1);         // paid 1 clout
  assert.equal(g.players[0].resources.media, 1);         // paid 1 media
  assert.equal(g.players[0].resources.funds, 2);         // headline granted +2
  assert.equal(g.lastHeadline.id, "h07");
  assert.ok(g.decks.headlineDiscard.includes("h07"));
});

test("a windfall/extra-dilemma headline applies its effect", () => {
  let g = actions();
  Object.assign(g.players[0].resources, { funds: 0, clout: 2, media: 2, trust: 0 });
  g.decks.headlineDraw = ["h06"];                        // Breaking Story: extra dilemma
  g = occupyVolatile(g, { zoneId: "z4" });
  assert.equal(g.turn.pendingExtraDilemma, true);
});

test("the volatile peg counts toward majority and locks the zone", () => {
  let g = actions();
  Object.assign(g.players[0].resources, { clout: 2, media: 2 });
  g.zones.find((z) => z.id === "z6").pegs = { 0: 2 };    // z6 cap5, threshold 3
  g.decks.headlineDraw = ["h07"];
  g = occupyVolatile(g, { zoneId: "z6" });
  const z6 = g.zones.find((z) => z.id === "z6");
  assert.equal(effectivePegs(z6, 0), 3);
  assert.equal(z6.lockedBy, 0);
  assert.equal(g.turn.gerrymanders, 1);
});

test("occupyVolatile rejects an already-taken seat and unaffordable cost", () => {
  let g = actions();
  g.zones.find((z) => z.id === "z4").volatileOwner = 1;
  Object.assign(g.players[0].resources, { clout: 2, media: 2 });
  assert.throws(() => occupyVolatile(g, { zoneId: "z4" }), /already taken/);
  let g2 = actions();
  g2.players[0].resources = { funds: 0, clout: 0, media: 0, trust: 0 };
  assert.throws(() => occupyVolatile(g2, { zoneId: "z4" }), /afford/);
});
