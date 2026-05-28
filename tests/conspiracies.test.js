import { test } from "node:test";
import assert from "node:assert/strict";
import { createGame } from "../src/engine/state.js";
import { beginTurn, answerDilemma, buyConspiracy, playConspiracy } from "../src/engine/actions.js";
import { CONSPIRACY_BY_ID } from "../src/data/conspiracies.js";
import { pegCount } from "../src/engine/rules.js";

const P = [{ name: "A", color: "#1" }, { name: "B", color: "#2" }];
// Produce a game state in the "actions" phase by fast-forwarding through draft+dilemma.
// beginTurn enters dilemma directly only when state.turn.firstTurn is set.
function ready(seed = 1) {
  const raw = createGame({ players: P, seed });
  raw.turn.firstTurn = true;
  return answerDilemma(beginTurn(raw), { answerIndex: 0 });
}
function give(g, pid, res) { Object.assign(g.players[pid].resources, res); return g; }

test("buyConspiracy: pays the top card's fixed cost and draws into hand", () => {
  let g = createGame({ players: P, seed: 1 });
  g.turn = { ...g.turn, phase: "actions", current: 0 };
  g.players[0].resources = { funds: 9, clout: 9, media: 9, trust: 9 };
  const top = g.decks.conspiracyDraw[0];
  const expectedCost = CONSPIRACY_BY_ID[top].cost;
  const before = g.players[0].hand.length;
  g = buyConspiracy(g);
  assert.equal(g.players[0].hand.length, before + 1);
  assert.ok(g.players[0].hand.includes(top));
  const totalAfter = ["funds","clout","media","trust"].reduce((s, r) => s + g.players[0].resources[r], 0);
  assert.equal(totalAfter, 36 - expectedCost);
});

test("buyConspiracy: throws when total resources < top card's cost", () => {
  let g = createGame({ players: P, seed: 1 });
  g.turn = { ...g.turn, phase: "actions", current: 0 };
  g.players[0].resources = { funds: 1, clout: 0, media: 0, trust: 0 };  // less than min cost
  assert.throws(() => buyConspiracy(g), /afford/i);
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
  const zone = g.zones.find((z) => z.id === "central");
  zone.seats[0] = 1; zone.seats[1] = 1;
  g = playConspiracy(g, { cardId: "c005", target: { zoneId: "central", pegOwner: 1 } });
  assert.equal(pegCount(g.zones.find((z) => z.id === "central"), 1), 1);
});

test("playConspiracy throws if card not in hand", () => {
  let g = ready();
  assert.throws(() => playConspiracy(g, { cardId: "c001" }), /not in hand/);
});

test("playConspiracy: non-interrupt card rejected mid-opponent turn", () => {
  let g = createGame({ players: P, seed: 1 });
  g.turn = { ...g.turn, phase: "actions", current: 0 };
  g.players[1].hand = ["c001"];   // War Chest, not interruptible
  assert.throws(() => playConspiracy(g, { cardId: "c001", playerId: 1 }), /interrupt/i);
});

test("playConspiracy: Block! (canInterrupt) can be played by an opponent during your turn", () => {
  let g = createGame({ players: P, seed: 1 });
  g.turn = { ...g.turn, phase: "actions", current: 0 };
  g.players[1].hand = ["c021"];   // Block!
  // Should not throw; the no-op block effect resolves cleanly.
  g = playConspiracy(g, { cardId: "c021", playerId: 1 });
  assert.ok(!g.players[1].hand.includes("c021"));
  assert.ok(g.decks.conspiracyDiscard.includes("c021"));
});
