import { test } from "node:test";
import assert from "node:assert/strict";
import { ZONES, ZONE_BY_ID } from "../src/data/map.js";
import { VOTER_MARKET } from "../src/data/voters.js";
import { RESOURCES, IDEOLOGIES, RESOURCE_OF } from "../src/engine/constants.js";
import { DILEMMAS } from "../src/data/dilemmas.js";
import { CONSPIRACIES, CONSPIRACY_EFFECT_TYPES } from "../src/data/conspiracies.js";

test("there are exactly 9 zones with unique ids", () => {
  assert.equal(ZONES.length, 9);
  assert.equal(new Set(ZONES.map((z) => z.id)).size, 9);
});

test("every zone has an odd capacity between 5 and 11", () => {
  for (const z of ZONES) {
    assert.ok(z.capacity >= 5 && z.capacity <= 11, `${z.id} capacity range`);
    assert.equal(z.capacity % 2, 1, `${z.id} capacity odd`);
  }
});

test("neighbor graph is symmetric and references real zones", () => {
  for (const z of ZONES) {
    for (const n of z.neighbors) {
      assert.ok(ZONE_BY_ID[n], `${z.id} -> unknown ${n}`);
      assert.ok(ZONE_BY_ID[n].neighbors.includes(z.id), `${n} must list ${z.id} back`);
    }
  }
});

test("every zone has a name and svgPath", () => {
  for (const z of ZONES) {
    assert.ok(z.name && typeof z.name === "string");
    assert.ok(z.svgPath && z.svgPath.startsWith("M"));
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
