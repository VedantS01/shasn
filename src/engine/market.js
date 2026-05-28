import { makeRng, shuffle } from "./rng.js";
import { clone } from "./state.js";

export function reshuffleIfEmpty(state) {
  if (state.market.deck.length > 0 || state.market.discard.length === 0) return state;
  const s = clone(state);
  const rng = makeRng(s.seed + s.turn.current + s.market.discard.length);
  s.market.deck = shuffle(s.market.discard, rng);
  s.market.discard = [];
  return s;
}

export function refill(state) {
  let s = state;
  while (s.market.open.length < 3) {
    s = reshuffleIfEmpty(s);
    if (s.market.deck.length === 0) break;
    s = clone(s);
    s.market.open.push(s.market.deck.shift());
  }
  return s;
}

// Discard the card at open index `i`, then refill from deck.
export function takeOpen(state, i) {
  if (i < 0 || i >= state.market.open.length) throw new Error("invalid open index");
  let s = clone(state);
  const [taken] = s.market.open.splice(i, 1);
  s.market.discard.push(taken);
  return refill(s);
}
