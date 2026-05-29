/**
 * privacy.js — Filter engine state for a specific viewing player.
 *
 * Public information (unchanged):
 *   zones, market, standings, log, turn phase, current player, headlines,
 *   players' resources, colors, names, piles.
 *
 * Private information (filtered per viewer):
 *   - players[viewerId].hand: real card ids
 *   - players[other].hand: array of "?" with same length (no ids revealed)
 *   - players[viewerId].usedThisTurn: full
 *   - players[other].usedThisTurn: empty {}
 *   - turn.pendingDilemma: visible to current player AND to previous player
 *     during readAloud phase; others see null.
 *   - turn.pendingProposal: visible only to the from/to players; others see null.
 */

/**
 * Return the player id whose turn it was *before* the current one.
 * Used to decide who reads the dilemma aloud during "readAloud" phase.
 */
function previousPlayerId(state) {
  const n = state.players.length;
  return (state.turn.current - 1 + n) % n;
}

/**
 * viewState(state, viewerId) — pure function.
 * Returns a deep-clone of state filtered for the player identified by viewerId.
 * viewerId is a player index (0-based integer).
 */
export function viewState(state, viewerId) {
  const phase = state.turn.phase;

  // Build filtered players array.
  const players = state.players.map((p) => {
    if (p.id === viewerId) {
      // Viewer sees their own hand and usedThisTurn in full.
      return { ...p, hand: [...p.hand], usedThisTurn: { ...p.usedThisTurn } };
    }
    // Other players: mask hand (same length, all "?"), empty usedThisTurn.
    return {
      ...p,
      hand: p.hand.map(() => "?"),
      usedThisTurn: {}
    };
  });

  // pendingDilemma visibility:
  //   - always visible to the current player (state.turn.current)
  //   - also visible to the PREVIOUS player during "readAloud" (they read aloud)
  //   - hidden from everyone else
  let pendingDilemma = state.turn.pendingDilemma;
  if (pendingDilemma !== null) {
    const isCurrent = viewerId === state.turn.current;
    const isPrevDuringReadAloud =
      phase === "readAloud" && viewerId === previousPlayerId(state);
    if (!isCurrent && !isPrevDuringReadAloud) {
      pendingDilemma = null;
    }
  }

  // pendingProposal visibility: only from/to players.
  let pendingProposal = state.turn.pendingProposal;
  if (pendingProposal !== null) {
    const isParty = viewerId === pendingProposal.from || viewerId === pendingProposal.to;
    if (!isParty) {
      pendingProposal = null;
    }
  }

  // Deep-clone the rest of the turn struct, then patch the private fields.
  const turn = {
    ...state.turn,
    pendingDilemma,
    pendingProposal,
    // gerrymanderMoves is per-player keyed by zone; safe to share as-is.
    gerrymanderMoves: { ...(state.turn.gerrymanderMoves || {}) },
    pendingHeadlines: [...(state.turn.pendingHeadlines || [])]
  };

  // Deep-clone zones (seats arrays contain primitives, safe with spread).
  const zones = state.zones.map((z) => ({
    ...z,
    seats: [...z.seats],
    flippedSeats: [...z.flippedSeats],
    volatileSeats: [...z.volatileSeats],
    neighbors: [...z.neighbors]
  }));

  // Market clone.
  const market = {
    open: [...state.market.open],
    deck: [...state.market.deck],
    discard: [...state.market.discard]
  };

  // Decks (draw/discard piles are public order-unknown; clone shallowly).
  const decks = state.decks
    ? {
        dilemmaDraw: [...state.decks.dilemmaDraw],
        dilemmaDiscard: [...state.decks.dilemmaDiscard],
        conspiracyDraw: [...state.decks.conspiracyDraw],
        conspiracyDiscard: [...state.decks.conspiracyDiscard],
        headlineDraw: [...state.decks.headlineDraw],
        headlineDiscard: [...state.decks.headlineDiscard]
      }
    : state.decks;

  return {
    ...state,
    players,
    zones,
    market,
    decks,
    turn,
    log: [...(state.log || [])],
    lastHeadline: state.lastHeadline ? { ...state.lastHeadline } : state.lastHeadline
  };
}
