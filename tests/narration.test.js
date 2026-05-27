import { test } from "node:test";
import assert from "node:assert/strict";

// Provide a localStorage so the narration preference can persist; there is no
// speech engine in Node, so speak/cancel must be safe no-ops.
const mem = {};
globalThis.localStorage = {
  getItem: (k) => (k in mem ? mem[k] : null),
  setItem: (k, v) => { mem[k] = v; },
  removeItem: (k) => { delete mem[k]; }
};

const { isNarrationEnabled, setNarrationEnabled, narrateDilemma, narrateChoice, cancelNarration } =
  await import("../src/ui/narration.js");

test("narration defaults on and toggles through storage", () => {
  assert.equal(isNarrationEnabled(), true);   // default when unset
  setNarrationEnabled(false);
  assert.equal(isNarrationEnabled(), false);
  setNarrationEnabled(true);
  assert.equal(isNarrationEnabled(), true);
});

test("narration calls don't throw without a speech engine", () => {
  const card = { id: "x1", question: "Build the dam?", answers: [{ label: "Yes" }, { label: "No" }] };
  assert.doesNotThrow(() => narrateDilemma(card));
  assert.doesNotThrow(() => narrateChoice("Yes"));
  assert.doesNotThrow(() => cancelNarration());
});
