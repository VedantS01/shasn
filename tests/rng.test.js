import { test } from "node:test";
import assert from "node:assert/strict";
import { makeRng, shuffle } from "../src/engine/rng.js";

test("makeRng is deterministic for a seed", () => {
  const a = makeRng(42), b = makeRng(42);
  assert.equal(a(), b());
  assert.equal(a(), b());
});

test("makeRng outputs are in [0,1)", () => {
  const r = makeRng(7);
  for (let i = 0; i < 100; i++) { const v = r(); assert.ok(v >= 0 && v < 1); }
});

test("shuffle is a permutation and deterministic per seed", () => {
  const src = [1, 2, 3, 4, 5];
  const s1 = shuffle(src, makeRng(1));
  const s2 = shuffle(src, makeRng(1));
  assert.deepEqual(s1, s2);
  assert.deepEqual([...s1].sort(), src);
  assert.deepEqual(src, [1, 2, 3, 4, 5]); // original unmutated
});
