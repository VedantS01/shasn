import { RESOURCES } from "./constants.js";

// Resolve a headline immediately on the triggering player (mutates cloned state).
export function resolveHeadline(state, headline, playerId) {
  const p = state.players[playerId];
  const { type, params } = headline.effect;
  if (type === "grant") {
    p.resources[params.resource] += params.amount;
  } else if (type === "lose") {
    p.resources[params.resource] = Math.max(0, p.resources[params.resource] - params.amount);
  } else if (type === "windfall") {
    for (const r of RESOURCES) p.resources[r] += 1;
  } else if (type === "extraDilemma") {
    state.turn.pendingExtraDilemma = true;
  } else {
    throw new Error(`unknown headline effect ${type}`);
  }
}
