import { test } from "node:test";
import assert from "node:assert/strict";

// Minimal DOM shim: enough for render() to build element trees without a browser.
function makeNode(tag) {
  return {
    tag, children: [], attrs: {}, listeners: {}, style: {},
    className: "", textContent: "", innerHTML: "", value: "",
    setAttribute(k, v) { this.attrs[k] = v; },
    getAttribute(k) { return this.attrs[k]; },
    addEventListener(k, fn) { (this.listeners[k] = this.listeners[k] || []).push(fn); },
    appendChild(c) { this.children.push(c); return c; }
  };
}
globalThis.document = {
  createElement: (t) => makeNode(t),
  createElementNS: (_ns, t) => makeNode(t),
  createTextNode: (s) => ({ text: String(s) })
};

const { createGame } = await import("../src/engine/state.js");
const A = await import("../src/engine/actions.js");
const { render } = await import("../src/ui/render.js");

const P = [{ name: "Asha", color: "#b3472f" }, { name: "Bman", color: "#2f6aa8" }];
function ctx(state, ui) {
  return { state, ui, dispatch() {}, setUi() {} };
}

test("setup screen renders without throwing", () => {
  const root = makeNode("main");
  render(root, ctx(null, { mode: "setup" }));
  assert.ok(root.children.length > 0);
});

test("turn screen renders during the dilemma phase", () => {
  const g = A.beginTurn(createGame({ players: P, seed: 1 }));
  const root = makeNode("main");
  render(root, ctx(g, { mode: "play", placing: null, error: null }));
  assert.ok(root.children.length > 0);
});

test("turn screen renders in the actions phase with hand, gerrymander, powers, error", () => {
  let g = A.answerDilemma(A.beginTurn(createGame({ players: P, seed: 1 })), { answerIndex: 0 });
  // exercise the heavy branches
  g.players[0].hand = ["c002", "c005", "c006", "c001"]; // steal, removePeg, protect, grant
  g.players[0].piles = { capitalist: 5, supremo: 5, showstopper: 3, idealist: 5 };
  g.zones.find((z) => z.id === "z4").pegs = { 0: 1, 1: 1 };
  g.zones.find((z) => z.id === "z0").lockedBy = 0;
  g.turn.gerrymanders = 2;
  const root = makeNode("main");
  render(root, ctx(g, { mode: "play", placing: "v2", error: "Test error" }));
  assert.ok(root.children.length > 0);
});

test("handoff curtain renders", () => {
  const g = A.beginTurn(createGame({ players: P, seed: 1 }));
  const root = makeNode("main");
  render(root, ctx(g, { mode: "handoff", placing: null, error: null }));
  assert.ok(root.children.length > 0);
});

test("endgame screen renders", () => {
  const g = createGame({ players: P, seed: 1 });
  g.turn.phase = "gameover"; g.winner = 0;
  g.zones[0].lockedBy = 0; g.zones[1].lockedBy = 1;
  g.log = ["Asha locked z0", "Game over — winner is Asha"];
  const root = makeNode("main");
  render(root, ctx(g, { mode: "play", placing: null, error: null }));
  assert.ok(root.children.length > 0);
});
