import { clone } from "./state.js";
import { shuffle, makeRng } from "./rng.js";
import { tierOf } from "./constants.js";
import { DILEMMA_BY_ID } from "../data/dilemmas.js";
import { VOTER_BY_ID } from "../data/voters.js";
import {
  isGameOver, canPlaceInZone, majorityHolder, majorityThreshold,
  neighborsOf, isZoneFull, totalPegs, zoneCapacity
} from "./rules.js";

// --- deck helpers -----------------------------------------------------------
function drawDilemma(state) {
  if (state.decks.dilemmaDraw.length === 0) {
    const rng = makeRng(state.seed + state.log.length + 1);
    state.decks.dilemmaDraw = shuffle(state.decks.dilemmaDiscard, rng);
    state.decks.dilemmaDiscard = [];
  }
  return state.decks.dilemmaDraw.shift();
}

// --- turn lifecycle ---------------------------------------------------------
export function beginTurn(state) {
  const s = clone(state);
  const p = s.players[s.turn.current];
  p.usedThisTurn = {};
  if (tierOf(p.piles.idealist) >= 1) { p.resources.trust += 1; }
  s.turn.pendingDilemma = drawDilemma(s);
  s.turn.phase = "dilemma";
  s.turn.gerrymanders = 0;
  return s;
}

export function answerDilemma(state, { answerIndex }) {
  if (state.turn.phase !== "dilemma") throw new Error("not in dilemma phase");
  const s = clone(state);
  const p = s.players[s.turn.current];
  const card = DILEMMA_BY_ID[s.turn.pendingDilemma];
  const answer = card.answers[answerIndex];
  if (!answer) throw new Error("invalid answerIndex");
  for (const [r, n] of Object.entries(answer.payout)) p.resources[r] += n;
  p.piles[answer.ideology] += 1;
  s.decks.dilemmaDiscard.push(card.id);
  s.turn.pendingDilemma = null;
  s.turn.phase = "actions";
  s.log.push(`${p.name} chose "${answer.label}"`);
  return s;
}

export function endTurn(state) {
  if (state.turn.phase !== "actions") throw new Error("can only end turn in actions phase");
  let s = clone(state);
  if (isGameOver(s)) { return finishGame(s); }
  s.turn.current = (s.turn.current + 1) % s.players.length;
  return beginTurn(s);
}

export function finishGame(state) {
  const s = clone(state);
  const ranked = [...s.players].map((p) => ({
    id: p.id,
    zones: s.zones.filter((z) => z.lockedBy === p.id).length,
    pegs: s.zones.reduce((t, z) => t + (z.pegs[p.id] || 0), 0)
  })).sort((a, b) => b.zones - a.zones || b.pegs - a.pegs);
  s.winner = ranked[0].id;
  s.turn.phase = "gameover";
  s.log.push(`Game over — winner is ${s.players[s.winner].name}`);
  return s;
}

// --- voters, placement, gerrymander ----------------------------------------
function canAfford(player, cost) {
  return Object.entries(cost).every(([r, n]) => player.resources[r] >= n);
}

function relockZones(state) {
  for (const z of state.zones) {
    if (z.lockedBy === null) {
      const holder = majorityHolder(z);
      if (holder !== null) z.lockedBy = holder;
    }
  }
}

export function buyVoter(state, { offerId, zoneId }) {
  if (state.turn.phase !== "actions") throw new Error("buy only in actions phase");
  const offer = VOTER_BY_ID[offerId];
  if (!offer) throw new Error("unknown voter offer");
  const s = clone(state);
  const p = s.players[s.turn.current];

  // discount: Capitalist T1 sets p.usedThisTurn["capitalist:discountReady"]
  let cost = { ...offer.cost };
  if (p.usedThisTurn["capitalist:discountReady"]) {
    const entries = Object.entries(cost).sort((a, b) => b[1] - a[1]);
    if (entries.length) {
      const [r] = entries[0];
      cost[r] = Math.max(0, cost[r] - 1);
      if (cost[r] === 0) delete cost[r];
    }
    delete p.usedThisTurn["capitalist:discountReady"];
  }
  if (!canAfford(p, cost)) throw new Error("cannot afford voter");
  if (!canPlaceInZone(s, p.id, zoneId)) throw new Error("cannot place in that zone");
  const zone = s.zones.find((z) => z.id === zoneId);
  if (totalPegs(zone) + offer.value > zoneCapacity(zoneId)) throw new Error("exceeds zone capacity");

  for (const [r, n] of Object.entries(cost)) p.resources[r] -= n;
  zone.pegs[p.id] = (zone.pegs[p.id] || 0) + offer.value;
  s.log.push(`${p.name} placed ${offer.value} in ${zoneId}`);

  if (zone.lockedBy === null && majorityHolder(zone) === p.id) {
    zone.lockedBy = p.id;
    let grants = 1;
    if (tierOf(p.piles.supremo) >= 1) grants += 1;   // Supremo T1
    s.turn.gerrymanders += grants;
    s.log.push(`${p.name} locked ${zoneId}`);
  }
  return s;
}

export function gerrymander(state, { fromZone, toZone, pegOwner }) {
  if (state.turn.gerrymanders <= 0) throw new Error("no gerrymander available");
  if (!neighborsOf(fromZone).includes(toZone)) throw new Error("zones not adjacent");
  const s = clone(state);
  const from = s.zones.find((z) => z.id === fromZone);
  const to = s.zones.find((z) => z.id === toZone);
  if ((from.pegs[pegOwner] || 0) <= 0) throw new Error("no such peg to move");
  if ((from.pegs[pegOwner] || 0) >= majorityThreshold(fromZone)) throw new Error("cannot move a non-majority peg from a majority stack");
  if (isZoneFull(to)) throw new Error("destination full");

  from.pegs[pegOwner] -= 1;
  if (from.pegs[pegOwner] === 0) delete from.pegs[pegOwner];
  to.pegs[pegOwner] = (to.pegs[pegOwner] || 0) + 1;
  s.turn.gerrymanders -= 1;
  s.log.push(`gerrymander: moved a ${s.players[pegOwner].name} peg ${fromZone}→${toZone}`);
  relockZones(s);
  return s;
}
