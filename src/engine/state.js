import { makeRng, shuffle } from "./rng.js";
import { ZONES } from "../data/map.js";
import { DILEMMAS } from "../data/dilemmas.js";
import { CONSPIRACIES } from "../data/conspiracies.js";
import { HEADLINES } from "../data/headlines.js";
import { VOTE_BANK } from "../data/voteBank.js";

export function createGame({ players, seed = 1 }) {
  const rng = makeRng(seed);
  const market = (() => {
    const shuffled = shuffle(VOTE_BANK.map((c) => c.id), rng);
    return { open: shuffled.slice(0, 3), deck: shuffled.slice(3), discard: [] };
  })();
  return {
    seed,
    players: players.map((p, i) => ({
      id: i,
      name: p.name,
      color: p.color,
      resources: { funds: 0, clout: 0, media: 0, trust: 0 },
      piles: { capitalist: 0, supremo: 0, showman: 0, idealist: 0 },
      hand: [],
      pendingPlacements: 0,
      usedThisTurn: {}
    })),
    zones: ZONES.map((z) => ({
      id: z.id,
      seats: new Array(z.capacity).fill(null),
      flippedSeats: new Array(z.capacity).fill(false),
      volatileSeats: [...z.volatileSeats],
      lockedBy: null,
      coalition: null
    })),
    market,
    decks: {
      dilemmaDraw: shuffle(DILEMMAS.map((d) => d.id), rng),
      dilemmaDiscard: [],
      conspiracyDraw: shuffle(CONSPIRACIES.map((c) => c.id), rng),
      conspiracyDiscard: [],
      headlineDraw: shuffle(HEADLINES.map((h) => h.id), rng),
      headlineDiscard: []
    },
    turn: {
      current: 0,
      phase: "draft",
      pendingDilemma: null,
      gerrymanderMoves: {},
      draftRemaining: 1,
      currentBuy: null,
      pendingHeadlines: [],
      pendingProposal: null,
      betweenTurnsAt: null
    },
    lastHeadline: null,
    endGame: null,
    log: [],
    winner: null
  };
}

// Deep clone used by reducers to preserve purity (state is plain JSON-safe data).
export function clone(state) {
  return structuredClone(state);
}
