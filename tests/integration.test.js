import { test } from "node:test";
import assert from "node:assert/strict";
import { createGame } from "../src/engine/state.js";
import {
  beginTurn, doneReadAloud, answerDilemma, buyVoteBank, placeToken,
  endTurn, passBetweenTurns, discardResources
} from "../src/engine/actions.js";
import { RESOURCES } from "../src/engine/constants.js";

const P = [{ name: "A", color: "#1" }, { name: "B", color: "#2" }];

function topUp(g, pid) {
  Object.assign(g.players[pid].resources, { funds: 9, clout: 9, media: 9, trust: 9 });
  return g;
}

// Walk the game past readAloud + dilemma phases
function flowPastDilemma(g) {
  if (g.turn.phase === "readAloud") g = doneReadAloud(g);
  if (g.turn.phase === "dilemma") g = answerDilemma(g, { answerIndex: 0 });
  return g;
}

// Handle discard: trim total resources to 12 by zeroing the largest piles
function handleDiscard(g) {
  if (g.turn.phase !== "discard") return g;
  const p = g.players[g.turn.current];
  const res = { ...p.resources };
  let total = RESOURCES.reduce((s, r) => s + res[r], 0);
  const counts = { funds: 0, clout: 0, media: 0, trust: 0 };
  const sorted = [...RESOURCES].sort((a, b) => res[b] - res[a]);
  for (const r of sorted) {
    if (total <= 12) break;
    const excess = Math.min(res[r], total - 12);
    counts[r] = excess;
    total -= excess;
  }
  return discardResources(g, { counts });
}

// Try to buy the cheapest available card and place all its tokens greedily
function greedyBuyAndPlace(g) {
  for (let i = 0; i < g.market.open.length; i++) {
    let next;
    try { next = buyVoteBank(g, { openIndex: i }); } catch { continue; }
    g = next;
    break;
  }
  if (!g.turn.currentBuy || g.turn.currentBuy.tokensRemaining <= 0) return g;
  while (g.turn.currentBuy && g.turn.currentBuy.tokensRemaining > 0) {
    let placed = false;
    for (const z of g.zones) {
      if (z.lockedBy !== null || z.coalition !== null) continue;
      // Respect same-zone constraint
      if (g.turn.currentBuy.zoneId && g.turn.currentBuy.zoneId !== z.id) continue;
      const emptyIdx = z.seats.findIndex((s) => s === null);
      if (emptyIdx === -1) continue;
      try { g = placeToken(g, { zoneId: z.id, seatIndex: emptyIdx }); placed = true; break; }
      catch { continue; }
    }
    if (!placed) { g.turn.currentBuy = null; break; }
  }
  return g;
}

test("a greedy bot game reaches game over with a valid winner", () => {
  let g = createGame({ players: P, seed: 2 });
  // Skip the draft phase by jumping straight to player 0's first turn
  g.turn = { ...g.turn, phase: "actions", current: 0, draftRemaining: 0, firstTurn: true };
  g = beginTurn(g);

  let guard = 0;
  while (g.turn.phase !== "gameover" && guard++ < 600) {
    g = flowPastDilemma(g);
    if (g.turn.phase === "discard") g = handleDiscard(g);
    if (g.turn.phase === "placePending") {
      // Place any pending placements greedily
      while (g.players[g.turn.current].pendingPlacements > 0) {
        let placed = false;
        for (const z of g.zones) {
          if (z.lockedBy !== null || z.coalition !== null) continue;
          const emptyIdx = z.seats.findIndex((s) => s === null);
          if (emptyIdx === -1) continue;
          try { g = placeToken(g, { zoneId: z.id, seatIndex: emptyIdx }); placed = true; break; }
          catch { continue; }
        }
        if (!placed) { g.players[g.turn.current].pendingPlacements = 0; break; }
      }
    }
    if (g.turn.phase !== "actions") break;
    g = topUp(g, g.turn.current);
    g = greedyBuyAndPlace(g);
    g = endTurn(g);
    while (g.turn.phase === "betweenTurns") g = passBetweenTurns(g);
  }

  assert.equal(g.turn.phase, "gameover", `game should end within guard (phase=${g.turn.phase})`);
  assert.ok(g.winner === 0 || g.winner === 1, "a winner is declared");
});

test("bot game runs deterministically across multiple seeds", () => {
  for (const seed of [1, 7, 42]) {
    let g = createGame({ players: P, seed });
    g.turn = { ...g.turn, phase: "actions", current: 0, draftRemaining: 0, firstTurn: true };
    g = beginTurn(g);
    let guard = 0;

    while (g.turn.phase !== "gameover" && guard++ < 600) {
      g = flowPastDilemma(g);
      if (g.turn.phase === "discard") g = handleDiscard(g);
      if (g.turn.phase === "placePending") {
        while (g.players[g.turn.current].pendingPlacements > 0) {
          let placed = false;
          for (const z of g.zones) {
            if (z.lockedBy !== null || z.coalition !== null) continue;
            const emptyIdx = z.seats.findIndex((s) => s === null);
            if (emptyIdx === -1) continue;
            try { g = placeToken(g, { zoneId: z.id, seatIndex: emptyIdx }); placed = true; break; }
            catch { continue; }
          }
          if (!placed) { g.players[g.turn.current].pendingPlacements = 0; break; }
        }
      }
      if (g.turn.phase !== "actions") break;
      g = topUp(g, g.turn.current);
      g = greedyBuyAndPlace(g);
      g = endTurn(g);
      while (g.turn.phase === "betweenTurns") g = passBetweenTurns(g);
    }

    assert.equal(g.turn.phase, "gameover", `seed ${seed} should reach gameover (phase=${g.turn.phase})`);
    assert.ok(g.winner === 0 || g.winner === 1, `seed ${seed}: valid winner`);
  }
});
