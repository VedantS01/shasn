import { clone } from "./state.js";
import { IDEOLOGIES } from "./constants.js";
import { majorityThreshold, voteCount } from "./rules.js";

function mostHeldPiles(p) {
  const max = Math.max(...IDEOLOGIES.map((i) => p.piles[i] || 0));
  if (max === 0) return [];
  return IDEOLOGIES.filter((i) => (p.piles[i] || 0) === max);
}

export function proposeCoalition(state, { to, zoneId, split, myCardId }) {
  if (state.turn.phase !== "actions") throw new Error("coalition only in actions phase");
  if (state.turn.pendingProposal) throw new Error("a proposal is already in flight");
  const from = state.turn.current;
  if (to === from) throw new Error("cannot coalition with yourself");
  const z = state.zones.find((x) => x.id === zoneId);
  if (!z || z.lockedBy !== null || z.coalition !== null) throw new Error("zone not eligible");
  if (voteCount(z, from) === 0 || voteCount(z, to) === 0)
    throw new Error("both players must have voters in the zone");
  const need = majorityThreshold(zoneId);
  const total = (split[from] || 0) + (split[to] || 0);
  if (total < need) throw new Error("split must sum to at least the majority threshold");
  if ((split[from] || 0) > voteCount(z, from)) throw new Error("you don't have that many voters");
  if ((split[to] || 0) > voteCount(z, to)) throw new Error("partner doesn't have that many voters");
  if (voteCount(z, from) >= need) throw new Error("you already meet threshold alone");
  const allowed = mostHeldPiles(state.players[from]);
  if (!allowed.includes(myCardId)) throw new Error("must offer a card from your most-held ideology");
  const s = clone(state);
  s.turn.phase = "coalitionAccept";
  s.turn.pendingProposal = { kind: "coalition", from, to, zoneId, split: { ...split }, myCardId };
  return s;
}

export function respondCoalition(state, { accept, partnerCardId }) {
  if (state.turn.phase !== "coalitionAccept") throw new Error("no coalition awaiting response");
  const prop = state.turn.pendingProposal;
  if (!prop || prop.kind !== "coalition") throw new Error("no pending coalition");
  const s = clone(state);
  if (accept) {
    const allowed = mostHeldPiles(s.players[prop.to]);
    if (!allowed.includes(partnerCardId))
      throw new Error("partner must give a card from their most-held ideology");
    const z = s.zones.find((x) => x.id === prop.zoneId);
    for (const pid of [prop.from, prop.to]) {
      let flipped = 0;
      const need = prop.split[pid] || 0;
      for (let i = 0; i < z.seats.length && flipped < need; i++) {
        if (z.seats[i] === pid && !z.flippedSeats[i]) {
          z.flippedSeats[i] = true;
          flipped++;
        }
      }
    }
    z.coalition = { partners: [prop.from, prop.to], split: { ...prop.split } };
    s.players[prop.from].piles[prop.myCardId] -= 1;
    s.players[prop.from].piles[partnerCardId] += 1;
    s.players[prop.to].piles[partnerCardId] -= 1;
    s.players[prop.to].piles[prop.myCardId] += 1;
    s.log.push(`Coalition formed in ${prop.zoneId}: ${s.players[prop.from].name} + ${s.players[prop.to].name}`);
  } else {
    s.log.push(`${s.players[prop.to].name} declined the coalition`);
  }
  s.turn.phase = "actions";
  s.turn.pendingProposal = null;
  return s;
}

export function withdrawCoalition(state, { zoneId }) {
  if (state.turn.phase !== "actions") throw new Error("withdraw only in actions phase");
  const z = state.zones.find((x) => x.id === zoneId);
  if (!z || !z.coalition) throw new Error("no coalition in that zone");
  const withdrawer = state.turn.current;
  if (!z.coalition.partners.includes(withdrawer)) throw new Error("you are not in this coalition");
  const s = clone(state);
  const wz = s.zones.find((x) => x.id === zoneId);
  for (let i = 0; i < wz.seats.length; i++) {
    if (wz.seats[i] === withdrawer) wz.flippedSeats[i] = false;
  }
  const remaining = wz.coalition.partners.find((p) => p !== withdrawer);
  wz.coalition = null;
  const need = majorityThreshold(zoneId);
  if (voteCount(wz, remaining) >= need) {
    let flipped = 0;
    for (let i = 0; i < wz.seats.length; i++) {
      if (wz.seats[i] === remaining) {
        if (flipped < need) { wz.flippedSeats[i] = true; flipped++; }
        else wz.flippedSeats[i] = false;
      }
    }
    wz.lockedBy = remaining;
  }
  s.log.push(`${s.players[withdrawer].name} withdrew from ${zoneId} coalition`);
  return s;
}
