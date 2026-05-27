import { majorityThreshold, pegCount } from "./rules.js";

// Each resolver mutates the (already cloned) state in place.
export const RESOLVERS = {
  grantResource(state, ctx, params) {
    state.players[ctx.actorId].resources[params.resource] += params.amount;
  },
  stealResource(state, ctx, params) {
    const victim = state.players[ctx.target.playerId];
    const taken = Math.min(victim.resources[params.resource], params.amount);
    victim.resources[params.resource] -= taken;
    state.players[ctx.actorId].resources[params.resource] += taken;
  },
  extraDilemma(state) {
    // signal the UI/main loop to draw an extra dilemma this turn
    state.turn.pendingExtraDilemma = true;
  },
  forceDiscardConspiracy(state, ctx) {
    const victim = state.players[ctx.target.playerId];
    if (victim.hand.length === 0) return;
    const idx = ctx.target.cardIndex ?? 0;
    const [card] = victim.hand.splice(idx, 1);
    state.decks.conspiracyDiscard.push(card);
  },
  removePeg(state, ctx) {
    const zone = state.zones.find((z) => z.id === ctx.target.zoneId);
    if (zone.protected && zone.lockedBy !== null) throw new Error("zone is protected");
    const owner = ctx.target.pegOwner;
    if (pegCount(zone, owner) >= majorityThreshold(zone.id)) throw new Error("cannot remove a majority peg");
    const idx = zone.seats.indexOf(owner);
    if (idx < 0) throw new Error("no such peg");
    zone.seats[idx] = null;
  },
  protectMajority(state, ctx) {
    const zone = state.zones.find((z) => z.id === ctx.target.zoneId);
    zone.protected = true;
  }
};

export function resolveEffect(state, effect, ctx) {
  const fn = RESOLVERS[effect.type];
  if (!fn) throw new Error(`no resolver for ${effect.type}`);
  fn(state, ctx, effect.params || {});
}
