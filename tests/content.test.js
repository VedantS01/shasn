import { test } from "node:test";
import assert from "node:assert/strict";
import { ZONES, ZONE_BY_ID } from "../src/data/map.js";
import { VOTER_MARKET } from "../src/data/voters.js";
import { RESOURCES, IDEOLOGIES, RESOURCE_OF } from "../src/engine/constants.js";
import { DILEMMAS } from "../src/data/dilemmas.js";
import { CONSPIRACIES, CONSPIRACY_EFFECT_TYPES } from "../src/data/conspiracies.js";
import { HEADLINES, HEADLINE_EFFECT_TYPES } from "../src/data/headlines.js";

test("there are exactly 9 zones with unique ids", () => {
  assert.equal(ZONES.length, 9);
  assert.equal(new Set(ZONES.map((z) => z.id)).size, 9);
});

test("neighbor graph is symmetric and references real zones", () => {
  for (const z of ZONES) {
    for (const n of z.neighbors) {
      assert.ok(ZONE_BY_ID[n], `${z.id} -> unknown ${n}`);
      assert.ok(ZONE_BY_ID[n].neighbors.includes(z.id), `${n} must list ${z.id} back`);
    }
  }
});

test("voter offers have positive value and valid resource costs", () => {
  for (const v of VOTER_MARKET) {
    assert.ok(v.value >= 1 && v.value <= 3, `${v.id} value`);
    const total = Object.entries(v.cost).reduce((s, [r, n]) => {
      assert.ok(RESOURCES.includes(r), `${v.id} bad resource ${r}`);
      assert.ok(n > 0, `${v.id} non-positive cost`);
      return s + n;
    }, 0);
    assert.ok(total >= v.value, `${v.id} should cost at least its value`);
  }
});

test("dilemmas: unique ids, two answers, valid ideology + dominant payout", () => {
  assert.ok(DILEMMAS.length >= 60);
  assert.equal(new Set(DILEMMAS.map((d) => d.id)).size, DILEMMAS.length);
  for (const d of DILEMMAS) {
    assert.ok(d.question && d.question.length > 0, `${d.id} question`);
    assert.equal(d.answers.length, 2, `${d.id} must have 2 answers`);
    for (const a of d.answers) {
      assert.ok(a.label, `${d.id} answer label`);
      assert.ok(IDEOLOGIES.includes(a.ideology), `${d.id} bad ideology ${a.ideology}`);
      const dom = RESOURCE_OF[a.ideology];
      const domAmt = a.payout[dom] || 0;
      let maxOther = 0;
      for (const [r, n] of Object.entries(a.payout)) { if (r !== dom) maxOther = Math.max(maxOther, n); }
      assert.ok(domAmt >= 1, `${d.id} payout must include its ideology resource`);
      assert.ok(domAmt >= maxOther, `${d.id} payout must be dominant in ${dom}`);
    }
  }
});

test("conspiracies: unique ids and known effect types", () => {
  assert.ok(CONSPIRACIES.length >= 20);
  assert.equal(new Set(CONSPIRACIES.map((c) => c.id)).size, CONSPIRACIES.length);
  for (const c of CONSPIRACIES) {
    assert.ok(c.name && c.text, `${c.id} name/text`);
    assert.equal(typeof c.canInterrupt, "boolean", `${c.id} canInterrupt`);
    assert.ok(CONSPIRACY_EFFECT_TYPES.includes(c.effect.type), `${c.id} effect ${c.effect.type}`);
    assert.ok(c.effect.params && typeof c.effect.params === "object", `${c.id} params`);
  }
});

test("headlines: unique ids, known effect types, valid grant/lose params", () => {
  assert.ok(HEADLINES.length >= 10);
  assert.equal(new Set(HEADLINES.map((h) => h.id)).size, HEADLINES.length);
  for (const hl of HEADLINES) {
    assert.ok(hl.name && hl.text, `${hl.id} name/text`);
    assert.ok(HEADLINE_EFFECT_TYPES.includes(hl.effect.type), `${hl.id} effect ${hl.effect.type}`);
    if (hl.effect.type === "grant" || hl.effect.type === "lose") {
      assert.ok(RESOURCES.includes(hl.effect.params.resource), `${hl.id} resource`);
      assert.ok(hl.effect.params.amount > 0, `${hl.id} amount`);
    }
  }
});

test("map: 9 zones with rulebook capacities and majorities", () => {
  const expected = {
    central: 9, north: 21, south: 21, east: 17, west: 17,
    ne: 11, nw: 11, se: 11, sw: 11
  };
  assert.equal(ZONES.length, 9);
  for (const [id, cap] of Object.entries(expected)) {
    const z = ZONE_BY_ID[id];
    assert.ok(z, `zone ${id} present`);
    assert.equal(z.capacity, cap, `${id} capacity ${cap}`);
    assert.equal(z.majority, Math.ceil((cap + 1) / 2), `${id} majority (cap+1)/2`);
  }
});

test("map: central touches all 8 others; corners touch 2 cardinals + central", () => {
  const c = ZONE_BY_ID.central;
  assert.deepEqual(c.neighbors.sort(), ["east","ne","north","nw","se","south","sw","west"]);
  assert.deepEqual(ZONE_BY_ID.ne.neighbors.sort(), ["central","east","north"]);
  assert.deepEqual(ZONE_BY_ID.nw.neighbors.sort(), ["central","north","west"]);
  assert.deepEqual(ZONE_BY_ID.se.neighbors.sort(), ["central","east","south"]);
  assert.deepEqual(ZONE_BY_ID.sw.neighbors.sort(), ["central","south","west"]);
});

test("map: each zone declares volatile seat indices within capacity range", () => {
  for (const z of ZONES) {
    assert.ok(Array.isArray(z.volatileSeats));
    assert.ok(z.volatileSeats.length >= 2, `${z.id} has >=2 volatile seats`);
    for (const i of z.volatileSeats) {
      assert.ok(i >= 0 && i < z.capacity, `${z.id} volatile index ${i} in range`);
    }
    assert.equal(new Set(z.volatileSeats).size, z.volatileSeats.length);
  }
});
