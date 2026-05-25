import { test } from "node:test";
import assert from "node:assert/strict";
import { createGame } from "../src/engine/state.js";
import { beginTurn, answerDilemma, buyVoter, endTurn } from "../src/engine/actions.js";
import { canPlaceInZone, isZoneFull, totalPegs, zoneCapacity } from "../src/engine/rules.js";

const P = [{ name: "A", color: "#1" }, { name: "B", color: "#2" }];
function topUp(g, pid) { Object.assign(g.players[pid].resources, { funds: 9, clout: 9, media: 9, trust: 9 }); return g; }

test("a greedy bot game reaches game over with a valid winner and no overfilled zones", () => {
  let g = beginTurn(createGame({ players: P, seed: 2 }));
  let guard = 0;
  while (g.turn.phase !== "gameover" && guard++ < 1000) {
    if (g.turn.phase === "dilemma") g = answerDilemma(g, { answerIndex: guard % 2 });
    g = topUp(g, g.turn.current);
    const me = g.turn.current;
    const zone = g.zones.find((z) => z.lockedBy === null && !isZoneFull(z) && canPlaceInZone(g, me, z.id));
    if (zone) g = buyVoter(g, { offerId: "v1", zoneId: zone.id });
    g = endTurn(g);
  }
  assert.equal(g.turn.phase, "gameover", "game should end within the guard");
  assert.ok(g.winner === 0 || g.winner === 1, "a winner is declared");
  for (const z of g.zones) {
    assert.ok(totalPegs(z) <= zoneCapacity(z.id), `${z.id} not overfilled`);
    assert.ok(z.lockedBy !== null || isZoneFull(z), `${z.id} resolved at game end`);
  }
});

test("the engine plays many seeds to completion deterministically", () => {
  for (const seed of [1, 7, 13, 99, 256]) {
    let g = beginTurn(createGame({ players: P, seed }));
    let guard = 0;
    while (g.turn.phase !== "gameover" && guard++ < 1000) {
      if (g.turn.phase === "dilemma") g = answerDilemma(g, { answerIndex: 0 });
      g = topUp(g, g.turn.current);
      const me = g.turn.current;
      const zone = g.zones.find((z) => z.lockedBy === null && !isZoneFull(z) && canPlaceInZone(g, me, z.id));
      if (zone) {
        const room = zoneCapacity(zone.id) - totalPegs(zone);
        g = buyVoter(g, { offerId: room >= 2 ? "v2" : "v1", zoneId: zone.id });
      }
      g = endTurn(g);
    }
    assert.equal(g.turn.phase, "gameover", `seed ${seed} should end`);
  }
});
