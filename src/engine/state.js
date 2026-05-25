import { makeRng, shuffle } from "./rng.js";
import { ZONES } from "../data/map.js";
import { DILEMMAS } from "../data/dilemmas.js";
import { CONSPIRACIES } from "../data/conspiracies.js";

export function createGame({ players, seed = 1 }) {
  const rng = makeRng(seed);
  return {
    seed,
    players: players.map((p, i) => ({
      id: i,
      name: p.name,
      color: p.color,
      resources: { funds: 0, clout: 0, media: 0, trust: 0 },
      piles: { capitalist: 0, supremo: 0, showstopper: 0, idealist: 0 },
      hand: [],
      usedThisTurn: {}
    })),
    zones: ZONES.map((z) => ({ id: z.id, pegs: {}, lockedBy: null })),
    decks: {
      dilemmaDraw: shuffle(DILEMMAS.map((d) => d.id), rng),
      dilemmaDiscard: [],
      conspiracyDraw: shuffle(CONSPIRACIES.map((c) => c.id), rng),
      conspiracyDiscard: []
    },
    turn: { current: 0, phase: "dilemma", pendingDilemma: null, gerrymanders: 0 },
    log: [],
    winner: null
  };
}

// Deep clone used by reducers to preserve purity (state is plain JSON-safe data).
export function clone(state) {
  return structuredClone(state);
}
