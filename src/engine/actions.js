import { clone } from "./state.js";
import { shuffle, makeRng } from "./rng.js";
import { tierOf, RESOURCES, IDEOLOGIES, RESOURCE_OF } from "./constants.js";
import { DILEMMA_BY_ID } from "../data/dilemmas.js";
import { VOTER_BY_ID, VOLATILE_COST } from "../data/voters.js";
import { CONSPIRACY_BY_ID } from "../data/conspiracies.js";
import { HEADLINE_BY_ID } from "../data/headlines.js";
import { VOTE_BANK_BY_ID } from "../data/voteBank.js";
import { resolveEffect } from "./conspiracies.js";
import { resolveHeadline } from "./headlines.js";
import { takeOpen } from "./market.js";
import {
  isGameOver, canReachZone, majorityHolder, majorityThreshold,
  neighborsOf, emptySeats, pegCount, effectivePegs, voteCount,
  soloMajorityZones, standings
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

function drawConspiracy(state) {
  if (state.decks.conspiracyDraw.length === 0) {
    const rng = makeRng(state.seed + state.log.length + 7);
    state.decks.conspiracyDraw = shuffle(state.decks.conspiracyDiscard, rng);
    state.decks.conspiracyDiscard = [];
  }
  return state.decks.conspiracyDraw.shift();
}

function drawHeadline(state) {
  if (state.decks.headlineDraw.length === 0) {
    const rng = makeRng(state.seed + state.log.length + 13);
    state.decks.headlineDraw = shuffle(state.decks.headlineDiscard, rng);
    state.decks.headlineDiscard = [];
  }
  return state.decks.headlineDraw.shift();
}

// --- starting resource draft ------------------------------------------------
// Player i (0-indexed) drafts i+1 resources of their choice, in player order.
export function draftResource(state, { resource }) {
  if (state.turn.phase !== "draft") throw new Error("not in draft phase");
  if (!RESOURCES.includes(resource)) throw new Error("invalid resource");
  let s = clone(state);
  const p = s.players[s.turn.current];
  p.resources[resource] += 1;
  s.turn.draftRemaining -= 1;
  s.log.push(`${p.name} drafted 1 ${resource}`);
  if (s.turn.draftRemaining <= 0) {
    if (s.turn.current < s.players.length - 1) {
      s.turn.current += 1;
      s.turn.draftRemaining = s.turn.current + 1;
    } else {
      s.turn.current = 0;
      s = beginTurn(s); // draft complete -> first player's turn begins
    }
  }
  return s;
}

// --- turn lifecycle ---------------------------------------------------------
const RESOURCE_CAP_VAL = 12;
const sumRes = (p) => RESOURCES.reduce((s, r) => s + (p.resources[r] || 0), 0);

function applyPassive(p) {
  for (const ide of IDEOLOGIES) {
    const n = Math.floor((p.piles[ide] || 0) / 2);
    if (n > 0) p.resources[RESOURCE_OF[ide]] += n;
  }
}

function computeGerryBudget(s, pid) {
  const out = {};
  const idealistL6 = (s.players[pid].piles.idealist || 0) >= 6;
  for (const z of soloMajorityZones(s, pid)) out[z.id] = idealistL6 ? 2 : 1;
  return out;
}

export function beginTurn(state) {
  const s = clone(state);
  const p = s.players[s.turn.current];
  p.usedThisTurn = {};
  s.lastHeadline = null;
  applyPassive(p);
  s.turn.pendingDilemma = s.decks.dilemmaDraw.shift();
  s.turn.gerrymanderMoves = computeGerryBudget(s, p.id);
  s.turn.currentBuy = null;
  s.turn.pendingHeadlines = [];
  if (s.turn.firstTurn) {
    delete s.turn.firstTurn;
    s.turn.phase = "dilemma";
  } else {
    s.turn.phase = "readAloud";
  }
  return s;
}

export function doneReadAloud(state) {
  if (state.turn.phase !== "readAloud") throw new Error("not in readAloud");
  const s = clone(state);
  s.turn.phase = "dilemma";
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
  if (sumRes(p) > RESOURCE_CAP_VAL) s.turn.phase = "discard";
  else if (p.pendingPlacements > 0) s.turn.phase = "placePending";
  else s.turn.phase = "actions";
  s.log.push(`${p.name} chose "${answer.label}"`);
  return s;
}

export function donePendingPlace(state) {
  if (state.turn.phase !== "placePending") throw new Error("not placePending");
  const s = clone(state);
  s.players[s.turn.current].pendingPlacements = 0;
  s.turn.phase = "actions";
  return s;
}

export function endTurn(state) {
  if (state.turn.phase !== "actions") throw new Error("end only in actions phase");
  let s = clone(state);
  // 1. Drain pending headlines
  while (s.turn.pendingHeadlines.length > 0) {
    if (s.decks.headlineDraw.length === 0) {
      s.decks.headlineDraw = shuffle(s.decks.headlineDiscard, makeRng(s.seed + s.log.length));
      s.decks.headlineDiscard = [];
    }
    const cardId = s.decks.headlineDraw.shift();
    const entry = s.turn.pendingHeadlines.shift();
    const headline = HEADLINE_BY_ID[cardId];
    resolveHeadline(s, headline, entry.playerId);
    s.decks.headlineDiscard.push(cardId);
    s.lastHeadline = { ...headline, player: entry.playerId };
  }
  // 2. End game check
  if (isGameOver(s)) return finishGame(s);
  // 3. Advance and begin next turn, preserving lastHeadline from drain
  const savedLastHeadline = s.lastHeadline;
  s.turn.current = (s.turn.current + 1) % s.players.length;
  const next = beginTurn(s);
  if (savedLastHeadline) next.lastHeadline = savedLastHeadline;
  return next;
}

export function finishGame(state) {
  const s = clone(state);
  const ranked = standings(s);
  s.winner = ranked[0].playerId;
  s.turn.phase = "gameover";
  s.log.push(`Game over — winner is ${s.players[s.winner].name}`);
  return s;
}

// Draw one extra dilemma mid-turn (e.g. from the "Breaking News" conspiracy)
// WITHOUT re-running start-of-turn effects. Returns to the dilemma phase.
export function drawExtraDilemma(state) {
  const s = clone(state);
  s.turn.pendingDilemma = drawDilemma(s);
  s.turn.phase = "dilemma";
  return s;
}

// Showstopper T1 "Spin": swap the current dilemma for a fresh one, once per turn.
export function spinDilemma(state) {
  if (state.turn.phase !== "dilemma") throw new Error("spin only during the dilemma phase");
  const s = clone(state);
  const p = s.players[s.turn.current];
  if (tierOf(p.piles.showstopper) < 1) throw new Error("requires Showstopper tier 1");
  if (p.usedThisTurn["showstopper:t1"]) throw new Error("already spun this turn");
  s.decks.dilemmaDiscard.push(s.turn.pendingDilemma);
  s.turn.pendingDilemma = drawDilemma(s);
  p.usedThisTurn["showstopper:t1"] = true;
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

// lock a zone and grant gerrymander(s) if `p` just reached a majority there
function lockIfMajority(s, zone, p) {
  if (zone.lockedBy === null && majorityHolder(zone) === p.id) {
    zone.lockedBy = p.id;
    let grants = 1;
    if (tierOf(p.piles.supremo) >= 1) grants += 1;   // Supremo T1
    s.turn.gerrymanders += grants;
    s.log.push(`${p.name} locked ${zone.id}`);
  }
}

// Buy a voter card: pays its cost and grants `value` tokens to place. The player
// then chooses which empty circle in which zone each token goes (see placeToken).
export function buyVoter(state, { offerId }) {
  if (state.turn.phase !== "actions") throw new Error("buy only in actions phase");
  if (state.turn.toPlace > 0) throw new Error("finish placing your voters first");
  const offer = VOTER_BY_ID[offerId];
  if (!offer) throw new Error("unknown voter offer");
  const s = clone(state);
  const p = s.players[s.turn.current];

  // discount: Capitalist T1 waives one unit of the resource the player is most short on
  let cost = { ...offer.cost };
  if (p.usedThisTurn["capitalist:discountReady"]) {
    const entries = Object.entries(cost);
    if (entries.length) {
      entries.sort((a, b) =>
        (p.resources[a[0]] - a[1]) - (p.resources[b[0]] - b[1]) ||
        b[1] - a[1] || a[0].localeCompare(b[0]));
      const [r] = entries[0];
      cost[r] = Math.max(0, cost[r] - 1);
      if (cost[r] === 0) delete cost[r];
    }
    delete p.usedThisTurn["capitalist:discountReady"];
  }
  if (!canAfford(p, cost)) throw new Error("cannot afford voter");
  for (const [r, n] of Object.entries(cost)) p.resources[r] -= n;
  s.turn.toPlace = offer.value;
  s.log.push(`${p.name} bought ${offer.label} (${offer.value} to place)`);
  return s;
}

// Buy a Vote Bank card: pays its cost, queues tokensRemaining to place via turn.currentBuy,
// and advances the market (replaces the slot from the deck).
export function buyVoteBank(state, { openIndex, useBlindFaith = false }) {
  if (state.turn.phase !== "actions") throw new Error("buy only in actions phase");
  if (state.turn.currentBuy && state.turn.currentBuy.tokensRemaining > 0)
    throw new Error("finish placing your voters first");
  const cardId = state.market.open[openIndex];
  if (!cardId) throw new Error("no card at that open slot");
  const card = VOTE_BANK_BY_ID[cardId];
  let cost = { ...card.cost };
  // Blind Faith (Idealist L4) waives the marked resource.
  if (useBlindFaith) {
    if ((state.players[state.turn.current].piles.idealist || 0) < 4)
      throw new Error("Blind Faith requires Idealist L4");
    delete cost[card.markedResource];
  }
  // Affordability check on the original state, before market mutation.
  if (!canAfford(state.players[state.turn.current], cost))
    throw new Error("cannot afford voter");
  // Mutate market first (since takeOpen clones), then apply player changes.
  let s = takeOpen(state, openIndex);
  const p = s.players[s.turn.current];
  for (const [r, n] of Object.entries(cost)) p.resources[r] -= n;
  // Echo Chamber (Showman L4): +1 voter per unique card id influenced this turn, cap 3.
  let value = card.value;
  if ((p.piles.showman || 0) >= 4) {
    p.usedThisTurn.echoChamberCardIds = p.usedThisTurn.echoChamberCardIds || [];
    if (p.usedThisTurn.echoChamberCardIds.length < 3 &&
        !p.usedThisTurn.echoChamberCardIds.includes(card.id)) {
      p.usedThisTurn.echoChamberCardIds.push(card.id);
      value += 1;
    }
  }
  s.turn.currentBuy = { cardId: card.id, zoneId: null, tokensRemaining: value };
  s.log.push(`${p.name} bought ${card.id} (${value} to place)`);
  return s;
}

function flipMajorityIfReached(s, zone, pid) {
  if (zone.lockedBy !== null || zone.coalition !== null) return;
  const need = majorityThreshold(zone.id);
  if (voteCount(zone, pid) < need) return;
  let flipped = 0;
  for (let i = 0; i < zone.seats.length && flipped < need; i++) {
    if (zone.seats[i] === pid && !zone.flippedSeats[i]) {
      zone.flippedSeats[i] = true;
      flipped++;
    }
  }
  zone.lockedBy = pid;
  s.log.push(`${s.players[pid].name} locked ${zone.id}`);
}

// Place one bought token on a specific empty circle in an unlocked zone.
export function placeToken(state, { zoneId, seatIndex }) {
  if (state.turn.phase !== "actions" && state.turn.phase !== "placePending")
    throw new Error("place only in actions/placePending phase");
  const s = clone(state);
  const p = s.players[s.turn.current];
  const zone = s.zones.find((z) => z.id === zoneId);
  if (!zone) throw new Error("no such zone");
  if (zone.lockedBy !== null || zone.coalition !== null)
    throw new Error("zone is closed");
  if (seatIndex == null || seatIndex < 0 || seatIndex >= zone.seats.length ||
      zone.seats[seatIndex] !== null) throw new Error("seat not available");

  if (s.turn.phase === "actions") {
    const buy = s.turn.currentBuy;
    if (!buy || buy.tokensRemaining <= 0) throw new Error("no voters to place");
    if (buy.zoneId && buy.zoneId !== zoneId)
      throw new Error("all voters from one card must go in the same zone");
    buy.zoneId = zoneId;
    buy.tokensRemaining -= 1;
    if (buy.tokensRemaining === 0) s.turn.currentBuy = null;
  } else {
    if (p.pendingPlacements <= 0) throw new Error("no pending placements");
    p.pendingPlacements -= 1;
  }

  zone.seats[seatIndex] = p.id;
  if (zone.volatileSeats.includes(seatIndex)) {
    s.turn.pendingHeadlines.push({ zoneId, playerId: p.id });
    s.log.push(`${p.name} placed on volatile seat in ${zoneId} — headline queued`);
  }
  flipMajorityIfReached(s, zone, p.id);
  if (s.turn.phase === "placePending" && p.pendingPlacements === 0)
    s.turn.phase = "actions";
  return s;
}

export function gerrymander(state, { majorityZoneId, fromZoneId, fromSeatIndex, toZoneId, toSeatIndex }) {
  if (state.turn.phase !== "actions") throw new Error("gerrymander only in actions phase");
  const budget = state.turn.gerrymanderMoves[majorityZoneId] || 0;
  if (budget <= 0) throw new Error("no moves left for that majority");
  const s = clone(state);
  const pid = s.turn.current;
  const maj = s.zones.find((z) => z.id === majorityZoneId);
  if (!maj || maj.lockedBy !== pid) throw new Error("not your solo majority");
  // Source must be in majority zone or a neighbor.
  const sourcePool = new Set([majorityZoneId, ...neighborsOf(majorityZoneId)]);
  if (!sourcePool.has(fromZoneId)) throw new Error("source not in majority zone or neighbor");
  // Source and destination must share a border with each other.
  const adj = (a, b) => a === b ? false : neighborsOf(a).includes(b);
  if (!adj(fromZoneId, toZoneId)) throw new Error("source/dest do not share a border");
  if (!sourcePool.has(toZoneId)) throw new Error("dest not in majority zone or neighbor");
  const from = s.zones.find((z) => z.id === fromZoneId);
  const to = s.zones.find((z) => z.id === toZoneId);
  if (from.seats[fromSeatIndex] == null) throw new Error("no voter at source");
  if (from.flippedSeats[fromSeatIndex]) throw new Error("cannot move a flipped majority voter");
  if (from.volatileSeats.includes(fromSeatIndex)) throw new Error("voter on a volatile seat is immune");
  if (to.seats[toSeatIndex] != null) throw new Error("destination occupied");
  const movedOwner = from.seats[fromSeatIndex];
  from.seats[fromSeatIndex] = null;
  to.seats[toSeatIndex] = movedOwner;
  if (to.volatileSeats.includes(toSeatIndex)) {
    s.turn.pendingHeadlines.push({ zoneId: toZoneId, playerId: movedOwner });
  }
  s.turn.gerrymanderMoves[majorityZoneId] = budget - 1;
  // The source zone might lose its majority lock if the moved voter pushed an
  // existing majority holder under threshold (rare, but handle for correctness).
  if (from.lockedBy !== null && voteCount(from, from.lockedBy) < majorityThreshold(from.id)) {
    from.flippedSeats = from.flippedSeats.map(() => false);
    from.lockedBy = null;
  }
  s.log.push(`gerrymander ${fromZoneId}[${fromSeatIndex}] → ${toZoneId}[${toSeatIndex}]`);
  return s;
}

// Seize a zone's single volatile seat: a non-gerrymanderable token that triggers
// a Headline event immediately on the placer.
export function occupyVolatile(state, { zoneId }) {
  if (state.turn.phase !== "actions") throw new Error("act only in actions phase");
  if (state.turn.toPlace > 0) throw new Error("finish placing your voters first");
  const s = clone(state);
  const p = s.players[s.turn.current];
  const zone = s.zones.find((z) => z.id === zoneId);
  if (!zone) throw new Error("no such zone");
  if (zone.volatileOwner !== null) throw new Error("volatile seat already taken");
  if (!canReachZone(s, p.id, zoneId)) throw new Error("cannot reach that zone");
  if (!canAfford(p, VOLATILE_COST)) throw new Error("cannot afford the volatile seat");

  for (const [r, n] of Object.entries(VOLATILE_COST)) p.resources[r] -= n;
  zone.volatileOwner = p.id;
  s.log.push(`${p.name} seized the volatile seat in ${zoneId}`);

  const hid = drawHeadline(s);
  if (hid) {
    const headline = HEADLINE_BY_ID[hid];
    resolveHeadline(s, headline, p.id);
    s.decks.headlineDiscard.push(hid);
    s.lastHeadline = { id: hid, name: headline.name, text: headline.text, player: p.id };
    s.log.push(`Headline: ${headline.name}`);
  }

  lockIfMajority(s, zone, p);
  return s;
}

// --- conspiracies -----------------------------------------------------------
export function buyConspiracy(state, { spend }) {
  if (state.turn.phase !== "actions") throw new Error("buy only in actions phase");
  if (state.turn.toPlace > 0) throw new Error("finish placing your voters first");
  const s = clone(state);
  const p = s.players[s.turn.current];
  const total = Object.values(spend).reduce((a, b) => a + b, 0);
  const min = tierOf(p.piles.showstopper) >= 2 ? 3 : 4;   // Showstopper T2
  if (total < min || total > 5) throw new Error(`spend must total ${min}-5`);
  for (const [r, n] of Object.entries(spend)) {
    if (p.resources[r] < n) throw new Error("cannot afford spend");
  }
  for (const [r, n] of Object.entries(spend)) p.resources[r] -= n;
  const card = drawConspiracy(s);
  if (card) p.hand.push(card);
  s.log.push(`${p.name} bought a conspiracy`);
  return s;
}

export function playConspiracy(state, { cardId, target, actorId }) {
  const s = clone(state);
  const actor = actorId ?? s.turn.current;
  const p = s.players[actor];
  const idx = p.hand.indexOf(cardId);
  if (idx === -1) throw new Error("card not in hand");
  const card = CONSPIRACY_BY_ID[cardId];
  resolveEffect(s, card.effect, { actorId: actor, target: target || {} });
  p.hand.splice(idx, 1);
  s.decks.conspiracyDiscard.push(cardId);
  s.log.push(`${p.name} played ${card.name}`);
  return s;
}

// --- resource cap / discard -------------------------------------------------
const RESOURCE_CAP = 12;
const totalResources = (p) => RESOURCES.reduce((s, r) => s + (p.resources[r] || 0), 0);

export function discardResources(state, { counts }) {
  if (state.turn.phase !== "discard") throw new Error("discard only in discard phase");
  const s = clone(state);
  const p = s.players[s.turn.current];
  for (const r of RESOURCES) {
    const n = counts[r] || 0;
    if (n < 0) throw new Error("negative discard");
    if ((p.resources[r] || 0) < n) throw new Error("not enough " + r);
    p.resources[r] -= n;
  }
  if (totalResources(p) > RESOURCE_CAP)
    throw new Error("total still over cap; discard more");
  s.turn.phase = p.pendingPlacements > 0 ? "placePending" : "actions";
  return s;
}

// --- archetype active powers ------------------------------------------------
export function usePower(state, { ideology, tier, params = {} }) {
  const s = clone(state);
  const p = s.players[s.turn.current];
  if (tierOf(p.piles[ideology]) < tier) throw new Error("power not unlocked");
  const key = `${ideology}:t${tier}`;
  const onceKeys = ["capitalist:t1", "capitalist:t2", "supremo:t2", "idealist:t3"];
  if (onceKeys.includes(key) && p.usedThisTurn[key]) throw new Error("power already used this turn");

  if (key === "capitalist:t1") {
    p.usedThisTurn["capitalist:discountReady"] = true;
  } else if (key === "capitalist:t2") {
    if (p.resources.funds < 3) throw new Error("need 3 funds");
    const gain = params.gain || {};
    if (Object.values(gain).reduce((a, b) => a + b, 0) !== 2) throw new Error("must gain exactly 2");
    p.resources.funds -= 3;
    for (const [r, n] of Object.entries(gain)) p.resources[r] += n;
  } else if (key === "supremo:t2") {
    const zone = s.zones.find((z) => z.id === params.zoneId);
    if (!zone || pegCount(zone, p.id) <= 0) throw new Error("need presence in zone");
    if (pegCount(zone, params.pegOwner) >= majorityThreshold(params.zoneId)) throw new Error("cannot remove a majority peg");
    const idx = zone.seats.indexOf(params.pegOwner);
    if (idx < 0) throw new Error("no such peg");
    zone.seats[idx] = null;
  } else if (key === "idealist:t3") {
    const zone = s.zones.find((z) => z.id === params.zoneId);
    const adjacentToPresence = neighborsOf(params.zoneId).some((nId) => pegCount(s.zones.find((z) => z.id === nId), p.id) > 0);
    if (!adjacentToPresence) throw new Error("zone must neighbor your presence");
    if (pegCount(zone, params.pegOwner) >= majorityThreshold(params.zoneId)) throw new Error("cannot sway a majority peg");
    const idx = zone.seats.indexOf(params.pegOwner);
    if (idx < 0) throw new Error("no such peg");
    zone.seats[idx] = p.id;
  } else if (key === "showstopper:t1") {
    throw new Error("showstopper:t1 is resolved by the turn loop, not usePower");
  } else {
    throw new Error("not an active power");
  }

  if (onceKeys.includes(key)) p.usedThisTurn[key] = true;
  s.log.push(`${p.name} used ${key}`);
  return s;
}

// --- Capitalist L6: Land Grab --------------------------------------------------
// Evict up to 2 non-volatile voters. Opponent's evicted voters go to
// pendingPlacements; own evictions may be immediately re-placed via replaceOwn.
export function landGrab(state, { targets, replaceOwn = [] }) {
  if (state.turn.phase !== "actions") throw new Error("powers only in actions phase");
  const s = clone(state);
  const p = s.players[s.turn.current];
  if ((p.piles.capitalist || 0) < 6) throw new Error("requires Capitalist L6");
  if (p.usedThisTurn.landGrab) throw new Error("Land Grab already used this turn");
  if (!Array.isArray(targets) || targets.length === 0 || targets.length > 2)
    throw new Error("evict 1 or 2 voters");

  const ownEvicted = [];
  for (const t of targets) {
    const z = s.zones.find((x) => x.id === t.zoneId);
    if (!z) throw new Error("no such zone");
    if (z.volatileSeats.includes(t.seatIndex)) throw new Error("cannot evict volatile voter");
    const owner = z.seats[t.seatIndex];
    if (owner == null) throw new Error("no voter to evict");
    z.seats[t.seatIndex] = null;
    // If evicted voter was a flipped majority voter, unflip and possibly unlock the zone.
    if (z.flippedSeats[t.seatIndex]) {
      z.flippedSeats[t.seatIndex] = false;
      if (z.lockedBy === owner && voteCount(z, owner) < majorityThreshold(z.id)) {
        z.flippedSeats = z.flippedSeats.map(() => false);
        z.lockedBy = null;
      }
    }
    if (owner === p.id) ownEvicted.push({ zoneId: t.zoneId });
    else s.players[owner].pendingPlacements += 1;
  }

  if (replaceOwn.length !== ownEvicted.length)
    throw new Error("replaceOwn count must match own-evicted count");
  for (const r of replaceOwn) {
    const z = s.zones.find((x) => x.id === r.zoneId);
    if (!z) throw new Error("no such zone");
    if (z.lockedBy !== null || z.coalition !== null) throw new Error("zone closed");
    if (z.seats[r.seatIndex] != null) throw new Error("seat occupied");
    z.seats[r.seatIndex] = p.id;
    if (z.volatileSeats.includes(r.seatIndex))
      s.turn.pendingHeadlines.push({ zoneId: r.zoneId, playerId: p.id });
    flipMajorityIfReached(s, z, p.id);
  }

  p.usedThisTurn.landGrab = true;
  s.log.push(`${p.name} Land Grab evicted ${targets.length} voter(s)`);
  return s;
}

// --- Showman L6: Targeted Marketing --------------------------------------------
// Spend 2 Media + any 3 resources to convert 2 of an opponent's voters in one
// zone. Volatile seats are immune.
export function targetedMarketing(state, { zoneId, opponentId, seatIndices, pay }) {
  if (state.turn.phase !== "actions") throw new Error("powers only in actions phase");
  const s = clone(state);
  const p = s.players[s.turn.current];
  if ((p.piles.showman || 0) < 6) throw new Error("requires Showman L6");
  if (p.usedThisTurn.targetedMarketing) throw new Error("Targeted Marketing already used this turn");
  if (!Array.isArray(seatIndices) || seatIndices.length !== 2)
    throw new Error("must target exactly 2 seats");
  if (opponentId === p.id) throw new Error("must target an opponent");
  if ((pay.media || 0) < 2) throw new Error("must spend 2 media");
  const totalPay = Object.values(pay).reduce((sum, n) => sum + n, 0);
  if (totalPay < 5) throw new Error("must spend 2 media + 3 any (5 total)");
  if (!Object.entries(pay).every(([r, n]) => (p.resources[r] || 0) >= n))
    throw new Error("cannot afford cost");
  for (const [r, n] of Object.entries(pay)) p.resources[r] -= n;

  const z = s.zones.find((x) => x.id === zoneId);
  if (!z) throw new Error("no such zone");
  for (const idx of seatIndices) {
    if (z.volatileSeats.includes(idx)) throw new Error("voter on volatile seat is immune");
    if (z.seats[idx] !== opponentId) throw new Error("target not opponent's voter");
    z.seats[idx] = p.id;
    // Note: if a flipped seat is converted, the flip stays — it now counts for the new owner.
  }
  // Opponent might lose their majority if they drop below threshold.
  if (z.lockedBy === opponentId && voteCount(z, opponentId) < majorityThreshold(z.id)) {
    z.flippedSeats = z.flippedSeats.map(() => false);
    z.lockedBy = null;
  }
  flipMajorityIfReached(s, z, p.id);
  p.usedThisTurn.targetedMarketing = true;
  s.log.push(`${p.name} Targeted Marketing in ${zoneId}`);
  return s;
}

// --- Supremo L4: Donations -----------------------------------------------------
// Snatch 1 or 2 resources (total) from other players for free, once per turn.
export function donations(state, { takes }) {
  if (state.turn.phase !== "actions") throw new Error("powers only in actions phase");
  const s = clone(state);
  const p = s.players[s.turn.current];
  if ((p.piles.supremo || 0) < 4) throw new Error("requires Supremo L4");
  if (p.usedThisTurn.donations) throw new Error("Donations already used");
  const totalTake = takes.reduce((sum, t) => sum + t.count, 0);
  if (totalTake === 0 || totalTake > 2) throw new Error("snatch 1 or 2 total");
  for (const t of takes) {
    const victim = s.players[t.from];
    if (!victim || victim.id === p.id) throw new Error("invalid target");
    if (!RESOURCES.includes(t.resource)) throw new Error("invalid resource");
    if ((victim.resources[t.resource] || 0) < t.count) throw new Error("victim lacks resource");
    victim.resources[t.resource] -= t.count;
    p.resources[t.resource] += t.count;
  }
  p.usedThisTurn.donations = true;
  s.log.push(`${p.name} Donations snatched ${totalTake} resource(s)`);
  return s;
}

// --- Supremo L6: Civil Disobedience --------------------------------------------
// Pay 1 resource per voter; discard up to 2 opponent non-volatile voters.
export function civilDisobedience(state, { targets, pay }) {
  if (state.turn.phase !== "actions") throw new Error("powers only in actions phase");
  const s = clone(state);
  const p = s.players[s.turn.current];
  if ((p.piles.supremo || 0) < 6) throw new Error("requires Supremo L6");
  if (p.usedThisTurn.civilDisobedience) throw new Error("Civil Disobedience already used");
  if (!Array.isArray(targets) || targets.length === 0 || targets.length > 2)
    throw new Error("discard 1 or 2 voters");
  const totalPay = Object.values(pay).reduce((sum, n) => sum + n, 0);
  if (totalPay !== targets.length) throw new Error("must pay 1 resource per voter");
  if (!Object.entries(pay).every(([r, n]) => (p.resources[r] || 0) >= n))
    throw new Error("cannot afford");
  for (const [r, n] of Object.entries(pay)) p.resources[r] -= n;
  for (const t of targets) {
    const z = s.zones.find((x) => x.id === t.zoneId);
    if (!z) throw new Error("no such zone");
    if (z.volatileSeats.includes(t.seatIndex)) throw new Error("voter on volatile seat immune");
    const owner = z.seats[t.seatIndex];
    if (owner == null || owner === p.id) throw new Error("must discard an opponent voter");
    z.seats[t.seatIndex] = null;
    if (z.flippedSeats[t.seatIndex]) {
      z.flippedSeats[t.seatIndex] = false;
      if (z.lockedBy === owner && voteCount(z, owner) < majorityThreshold(z.id)) {
        z.flippedSeats = z.flippedSeats.map(() => false);
        z.lockedBy = null;
      }
    }
  }
  p.usedThisTurn.civilDisobedience = true;
  s.log.push(`${p.name} Civil Disobedience discarded ${targets.length} voter(s)`);
  return s;
}

export { proposeTrade, respondTrade } from "./trade.js";
export { proposeCoalition, respondCoalition, withdrawCoalition } from "./coalitions.js";

// --- Capitalist L4: Open Market ------------------------------------------------
// Pay 1 resource, take any 2 in return (once per turn).
export function openMarket(state, { give, take }) {
  if (state.turn.phase !== "actions") throw new Error("powers only in actions phase");
  const s = clone(state);
  const p = s.players[s.turn.current];
  if ((p.piles.capitalist || 0) < 4) throw new Error("requires Capitalist L4");
  if (p.usedThisTurn.openMarket) throw new Error("Open Market already used this turn");
  if (!RESOURCES.includes(give) || (p.resources[give] || 0) < 1)
    throw new Error("invalid give resource");
  if (!Array.isArray(take) || take.length !== 2 || !take.every((r) => RESOURCES.includes(r)))
    throw new Error("must take exactly 2 valid resources");
  p.resources[give] -= 1;
  for (const r of take) p.resources[r] += 1;
  p.usedThisTurn.openMarket = true;
  s.log.push(`${p.name} Open Market: 1 ${give} → ${take.join("+")}`);
  return s;
}
