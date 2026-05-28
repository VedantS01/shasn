import { test } from "node:test";
import assert from "node:assert/strict";
import { hexPath, hexCenter, seatPositions } from "../src/ui/geometry.js";

test("hexCenter: axial (0,0) is the board center", () => {
  const c = hexCenter({ q: 0, r: 0 });
  assert.equal(c.x, 400);
  assert.equal(c.y, 350);
});

test("hexPath: returns an SVG path string with 6 segments", () => {
  const d = hexPath({ q: 0, r: 0 }, 80);
  assert.ok(/^M[0-9.,-]+( L[0-9.,-]+){5} Z$/.test(d), `unexpected path: ${d}`);
});

test("seatPositions: returns `capacity` points inside the hex", () => {
  const pts = seatPositions({ q: 0, r: 0 }, 80, 9);
  assert.equal(pts.length, 9);
});

test("seatPositions: handles smaller capacities (1, 7, 21)", () => {
  assert.equal(seatPositions({ q: 0, r: 0 }, 80, 1).length, 1);
  assert.equal(seatPositions({ q: 0, r: 0 }, 80, 7).length, 7);
  assert.equal(seatPositions({ q: 0, r: 0 }, 80, 21).length, 21);
});

test("hexCenter: non-zero axial offsets", () => {
  const c = hexCenter({ q: 1, r: 0 });
  assert.notEqual(c.x, 400);
  // q=1 moves rightward
  assert.ok(c.x > 400);
});
