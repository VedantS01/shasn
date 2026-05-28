import { ZONE_BY_ID } from "../data/map.js";

export const zoneCapacity = (zoneId) => ZONE_BY_ID[zoneId].capacity;
export const majorityThreshold = (zoneId) => ZONE_BY_ID[zoneId].majority;
export const neighborsOf = (zoneId) => ZONE_BY_ID[zoneId].neighbors;

export const isVolatileSeat = (zone, seatIndex) => zone.volatileSeats.includes(seatIndex);

export const voteCount = (zone, playerId) => zone.seats.filter((s) => s === playerId).length;
export const flippedCount = (zone, playerId) =>
  zone.seats.reduce((n, s, i) => n + (s === playerId && zone.flippedSeats[i] ? 1 : 0), 0);

// Backwards-compat shim while migration is in progress; new code should use voteCount.
export const pegCount = voteCount;

export const totalVoters = (zone) => zone.seats.filter((s) => s !== null).length;
export const totalPegs = totalVoters;   // shim for older code paths until they're migrated

export const emptySeats = (zone) => {
  const out = [];
  zone.seats.forEach((s, i) => { if (s === null) out.push(i); });
  return out;
};
export const isZoneFull = (zone) => emptySeats(zone).length === 0;

// A zone is "closed" if solo majority is taken OR a coalition has been struck.
export const isZoneClosed = (zone) => zone.lockedBy !== null || zone.coalition !== null;

export const majorityHolder = (zone) => {
  if (zone.coalition) return null;   // coalition zones have no single solo holder
  const need = ZONE_BY_ID[zone.id].majority;
  const counts = {};
  for (const s of zone.seats) if (s !== null) counts[s] = (counts[s] || 0) + 1;
  for (const [pid, n] of Object.entries(counts)) if (n >= need) return Number(pid);
  return null;
};

// Effective majority: the volatile seat already counts via plain seats. Kept for
// backward callers; new code can use voteCount directly.
export const effectivePegs = voteCount;

export const playerScore = (state, playerId) =>
  state.zones.reduce((sum, z) => sum + flippedCount(z, playerId), 0);

// Has the player placed any voter on the board? Used by placement reachability,
// which the new rulebook removes — kept as a shim so old code still imports it.
export const hasPresence = (state, playerId) =>
  state.zones.some((z) => voteCount(z, playerId) > 0);

// Reachability is removed by the rulebook (voters can be placed anywhere). These
// shims preserve the signature so old callers compile until they're migrated.
export const canReachZone = (state, playerId, zoneId) => {
  const z = state.zones.find((x) => x.id === zoneId);
  return !!z && !isZoneClosed(z);
};
export const canPlaceInZone = (state, playerId, zoneId) => {
  const z = state.zones.find((x) => x.id === zoneId);
  return !!z && !isZoneClosed(z) && !isZoneFull(z);
};

// Standings: by flipped score desc, tie-break by total voters owned on the board.
export function standings(state) {
  const rows = state.players.map((p) => {
    const flips = playerScore(state, p.id);
    const voters = state.zones.reduce((s, z) => s + voteCount(z, p.id), 0);
    const zones = state.zones.filter((z) =>
      z.lockedBy === p.id ||
      (z.coalition && z.coalition.partners.includes(p.id))
    ).length;
    return { playerId: p.id, name: p.name, score: flips, voters, zones, pegs: voters };
  });
  rows.sort((a, b) => b.score - a.score || b.voters - a.voters);
  return rows;
}

// Solo majorities only grant the gerrymander power.
export const soloMajorityZones = (state, playerId) =>
  state.zones.filter((z) => z.lockedBy === playerId);

// Game ends when every zone is closed OR every seat on the board is filled.
export const isGameOver = (state) =>
  state.zones.every((z) => isZoneClosed(z) || isZoneFull(z));
