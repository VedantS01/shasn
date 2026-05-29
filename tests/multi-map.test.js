import { test } from "node:test";
import assert from "node:assert/strict";
import { MAPS } from "../src/data/map.js";
import { createGame } from "../src/engine/state.js";

const P = [{ name: "A", color: "#1" }, { name: "B", color: "#2" }];

test("MAPS registry has 'large' and 'small'", () => {
  assert.ok(MAPS.large && MAPS.small);
});

test("small map: 7 zones with hub-spoke topology and correct capacities", () => {
  const m = MAPS.small;
  assert.equal(m.zones.length, 7);
  const expected = { central: 17, n: 11, ne: 13, se: 15, s: 11, sw: 13, nw: 15 };
  for (const z of m.zones) assert.equal(z.capacity, expected[z.id]);
  // Central touches all 6 perimeter zones
  const c = m.zones.find((z) => z.id === "central");
  assert.deepEqual(c.neighbors.sort(), ["n","ne","nw","s","se","sw"]);
});

test("small map: neighbor graph symmetric", () => {
  for (const z of MAPS.small.zones) {
    for (const n of z.neighbors) {
      const other = MAPS.small.zones.find((x) => x.id === n);
      assert.ok(other, `zone ${n} referenced by ${z.id} must exist`);
      assert.ok(other.neighbors.includes(z.id), `${n} <-> ${z.id} symmetric`);
    }
  }
});

test("every zone has per-seat coordinates of length=capacity", () => {
  for (const m of Object.values(MAPS)) {
    for (const z of m.zones) {
      assert.equal(z.seats.length, z.capacity, `${m.id}/${z.id} seats length matches capacity`);
      for (const s of z.seats) {
        assert.ok(typeof s.x === "number" && typeof s.y === "number",
          `${m.id}/${z.id} seat must have numeric x,y`);
      }
    }
  }
});

test("every zone has a non-empty SVG path string", () => {
  for (const m of Object.values(MAPS)) {
    for (const z of m.zones) {
      assert.ok(typeof z.path === "string" && z.path.startsWith("M"),
        `${m.id}/${z.id} must have SVG path starting with M`);
    }
  }
});

test("createGame({ mapId: 'small' }) builds a 7-zone state", () => {
  const g = createGame({ players: P, seed: 1, mapId: "small" });
  assert.equal(g.zones.length, 7);
  assert.equal(g.mapId, "small");
  const central = g.zones.find((z) => z.id === "central");
  assert.ok(central, "central zone exists");
  assert.equal(central.seats.length, 17);
  assert.equal(central.capacity, 17);
  assert.equal(central.majority, 9);
  assert.deepEqual(central.neighbors.sort(), ["n","ne","nw","s","se","sw"]);
});

test("createGame default is large board", () => {
  const g = createGame({ players: P, seed: 1 });
  assert.equal(g.zones.length, 9);
  assert.equal(g.mapId, "large");
});

test("small board zone state objects carry metadata for rules helpers", () => {
  const g = createGame({ players: P, seed: 1, mapId: "small" });
  for (const z of g.zones) {
    assert.ok(typeof z.capacity === "number" && z.capacity > 0, `${z.id} has capacity`);
    assert.ok(typeof z.majority === "number" && z.majority > 0, `${z.id} has majority`);
    assert.ok(Array.isArray(z.neighbors), `${z.id} has neighbors array`);
  }
});

test("large board zones also carry metadata", () => {
  const g = createGame({ players: P, seed: 1 });
  const central = g.zones.find((z) => z.id === "central");
  assert.equal(central.capacity, 9);
  assert.equal(central.majority, 5);
  assert.deepEqual(central.neighbors.sort(), ["east","ne","north","nw","se","south","sw","west"]);
});
