import { makeRng, shuffle } from "./rng.js";
import { ZONES } from "../data/map.js";
import { DILEMMAS } from "../data/dilemmas.js";
import { CONSPIRACIES } from "../data/conspiracies.js";
import { HEADLINES } from "../data/headlines.js";

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
    // volatileOwner: an extra, non-gerrymanderable seat per zone (triggers a Headline)
    zones: ZONES.map((z) => ({ id: z.id, pegs: {}, lockedBy: null, volatileOwner: null })),
    decks: {
      dilemmaDraw: shuffle(DILEMMAS.map((d) => d.id), rng),
      dilemmaDiscard: [],
      conspiracyDraw: shuffle(CONSPIRACIES.map((c) => c.id), rng),
      conspiracyDiscard: [],
      headlineDraw: shuffle(HEADLINES.map((h) => h.id), rng),
      headlineDiscard: []
    },
    // Game opens in a starting-resource draft: player i (1-indexed) drafts i tokens,
    // in player order, mitigating the first player's placement advantage.
    turn: { current: 0, phase: "draft", pendingDilemma: null, gerrymanders: 0, draftRemaining: 1 },
    lastHeadline: null,
    log: [],
    winner: null
  };
}

// Deep clone used by reducers to preserve purity (state is plain JSON-safe data).
export function clone(state) {
  return structuredClone(state);
}
