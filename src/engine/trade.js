import { clone } from "./state.js";
import { RESOURCES } from "./constants.js";

const sumGroup = (g) => {
  let n = 0;
  if (g.resources) for (const r of RESOURCES) n += (g.resources[r] || 0);
  if (g.cardIds) n += g.cardIds.length;
  return n;
};

export function proposeTrade(state, { to, give, receive }) {
  if (state.turn.phase !== "actions") throw new Error("trade only in actions phase");
  if (state.turn.pendingProposal) throw new Error("a proposal is already in flight");
  if (sumGroup(give) === 0 || sumGroup(give) !== sumGroup(receive))
    throw new Error("trade must be equitable (matching counts)");
  const from = state.turn.current;
  if (to === from) throw new Error("cannot trade with yourself");
  const p = state.players[from];
  if (give.resources) for (const r of RESOURCES) {
    if ((p.resources[r] || 0) < (give.resources[r] || 0))
      throw new Error("you don't have enough " + r);
  }
  if (give.cardIds) for (const id of give.cardIds) {
    if (!p.hand.includes(id)) throw new Error("you don't hold card " + id);
  }
  const s = clone(state);
  s.turn.phase = "tradeAccept";
  s.turn.pendingProposal = { kind: "trade", from, to, give, receive };
  return s;
}

export function respondTrade(state, { accept }) {
  if (state.turn.phase !== "tradeAccept") throw new Error("no trade awaiting response");
  const prop = state.turn.pendingProposal;
  if (!prop || prop.kind !== "trade") throw new Error("no pending trade");
  const s = clone(state);
  if (accept) {
    const from = s.players[prop.from], to = s.players[prop.to];
    if (prop.receive.resources) for (const r of RESOURCES) {
      if ((to.resources[r] || 0) < (prop.receive.resources[r] || 0))
        throw new Error("partner lacks " + r);
    }
    if (prop.receive.cardIds) for (const id of prop.receive.cardIds) {
      if (!to.hand.includes(id)) throw new Error("partner lacks card " + id);
    }
    if (prop.give.resources) for (const r of RESOURCES) {
      const n = prop.give.resources[r] || 0;
      from.resources[r] -= n; to.resources[r] += n;
    }
    if (prop.receive.resources) for (const r of RESOURCES) {
      const n = prop.receive.resources[r] || 0;
      to.resources[r] -= n; from.resources[r] += n;
    }
    if (prop.give.cardIds) for (const id of prop.give.cardIds) {
      from.hand.splice(from.hand.indexOf(id), 1);
      to.hand.push(id);
    }
    if (prop.receive.cardIds) for (const id of prop.receive.cardIds) {
      to.hand.splice(to.hand.indexOf(id), 1);
      from.hand.push(id);
    }
    s.log.push(`${from.name} ↔ ${to.name} traded`);
  } else {
    s.log.push(`${s.players[prop.to].name} declined the trade`);
  }
  s.turn.phase = "actions";
  s.turn.pendingProposal = null;
  return s;
}
