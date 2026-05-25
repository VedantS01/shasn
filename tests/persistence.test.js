import { test } from "node:test";
import assert from "node:assert/strict";
import { createGame } from "../src/engine/state.js";
import { serialize, deserialize, save, load, clearSave } from "../src/ui/persistence.js";

const P = [{ name: "A", color: "#1" }, { name: "B", color: "#2" }];

test("serialize/deserialize round-trips state", () => {
  const g = createGame({ players: P, seed: 3 });
  const back = deserialize(serialize(g));
  assert.deepEqual(back, g);
});

test("save/load via an injected storage", () => {
  const mem = (() => { const m = {}; return { getItem: (k) => (k in m ? m[k] : null), setItem: (k, v) => { m[k] = v; }, removeItem: (k) => { delete m[k]; } }; })();
  const g = createGame({ players: P, seed: 9 });
  save(g, mem);
  assert.deepEqual(load(mem), g);
  clearSave(mem);
  assert.equal(load(mem), null);
});
