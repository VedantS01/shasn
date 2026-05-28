import { test } from "node:test";
import assert from "node:assert/strict";
import { createGame } from "../src/engine/state.js";
import { proposeTrade, respondTrade } from "../src/engine/actions.js";

const P = [{ name: "A", color: "#1" }, { name: "B", color: "#2" }];

test("proposeTrade: equitable swap recorded as pendingProposal; phase=tradeAccept", () => {
  let g = createGame({ players: P, seed: 1 });
  g.turn = { ...g.turn, phase: "actions", current: 0 };
  g.players[0].resources = { funds: 2, clout: 0, media: 0, trust: 0 };
  g.players[1].resources = { funds: 0, clout: 2, media: 0, trust: 0 };
  g = proposeTrade(g, {
    to: 1,
    give: { resources: { funds: 1 } },
    receive: { resources: { clout: 1 } }
  });
  assert.equal(g.turn.phase, "tradeAccept");
  assert.equal(g.turn.pendingProposal.kind, "trade");
});

test("respondTrade(accept): resources swap and pendingProposal clears", () => {
  let g = createGame({ players: P, seed: 1 });
  g.turn = { ...g.turn, phase: "actions", current: 0 };
  g.players[0].resources = { funds: 2, clout: 0, media: 0, trust: 0 };
  g.players[1].resources = { funds: 0, clout: 2, media: 0, trust: 0 };
  g = proposeTrade(g, { to: 1, give: { resources: { funds: 1 } }, receive: { resources: { clout: 1 } } });
  g = respondTrade(g, { accept: true });
  assert.equal(g.players[0].resources.funds, 1);
  assert.equal(g.players[0].resources.clout, 1);
  assert.equal(g.players[1].resources.funds, 1);
  assert.equal(g.players[1].resources.clout, 1);
  assert.equal(g.turn.phase, "actions");
  assert.equal(g.turn.pendingProposal, null);
});

test("respondTrade(decline): nothing changes", () => {
  let g = createGame({ players: P, seed: 1 });
  g.turn = { ...g.turn, phase: "actions", current: 0 };
  g.players[0].resources = { funds: 2, clout: 0, media: 0, trust: 0 };
  g.players[1].resources = { funds: 0, clout: 2, media: 0, trust: 0 };
  g = proposeTrade(g, { to: 1, give: { resources: { funds: 1 } }, receive: { resources: { clout: 1 } } });
  g = respondTrade(g, { accept: false });
  assert.equal(g.players[0].resources.funds, 2);
  assert.equal(g.turn.phase, "actions");
});

test("proposeTrade: rejects non-equitable swap", () => {
  let g = createGame({ players: P, seed: 1 });
  g.turn = { ...g.turn, phase: "actions", current: 0 };
  g.players[0].resources = { funds: 3, clout: 0, media: 0, trust: 0 };
  g.players[1].resources = { funds: 0, clout: 1, media: 0, trust: 0 };
  assert.throws(() => proposeTrade(g, {
    to: 1, give: { resources: { funds: 2 } }, receive: { resources: { clout: 1 } }
  }), /equitable/i);
});

test("proposeTrade: card-for-card swap works", () => {
  let g = createGame({ players: P, seed: 1 });
  g.turn = { ...g.turn, phase: "actions", current: 0 };
  g.players[0].hand = ["c001"];
  g.players[1].hand = ["c002"];
  g = proposeTrade(g, { to: 1, give: { cardIds: ["c001"] }, receive: { cardIds: ["c002"] } });
  g = respondTrade(g, { accept: true });
  assert.ok(g.players[0].hand.includes("c002"));
  assert.ok(g.players[1].hand.includes("c001"));
});
