import { ZONE_BY_ID } from "../data/map.js";

export const zoneCapacity = (zoneId) => ZONE_BY_ID[zoneId].capacity;
export const majorityThreshold = (zoneId) => (ZONE_BY_ID[zoneId].capacity + 1) / 2;
export const neighborsOf = (zoneId) => ZONE_BY_ID[zoneId].neighbors;

// zone.seats is an array (length = capacity) of playerId | null — one entry per
// vote circle. The volatile seat (zone.volatileOwner) is an extra slot on top.
export const pegCount = (zone, playerId) => zone.seats.filter((s) => s === playerId).length;
export const totalPegs = (zone) => zone.seats.filter((s) => s !== null).length;
export function emptySeats(zone) {
  const out = [];
  zone.seats.forEach((s, i) => { if (s === null) out.push(i); });
  return out;
}
export const isZoneFull = (zone) => emptySeats(zone).length === 0;

// effective control = circles held + the volatile seat (if held), used for majority & votes
export const effectivePegs = (zone, playerId) =>
  pegCount(zone, playerId) + (zone.volatileOwner === playerId ? 1 : 0);

export function majorityHolder(zone) {
  const need = majorityThreshold(zone.id);
  const owners = new Set(zone.seats.filter((s) => s !== null));
  if (zone.volatileOwner !== null) owners.add(zone.volatileOwner);
  for (const pid of owners) if (effectivePegs(zone, pid) >= need) return pid;
  return null;
}

export const hasPresence = (state, playerId) =>
  state.zones.some((z) => effectivePegs(z, playerId) > 0);

// adjacency rule shared by normal and volatile placement
export function canReachZone(state, playerId, zoneId) {
  const zone = state.zones.find((z) => z.id === zoneId);
  if (!zone || zone.lockedBy !== null) return false;
  if (!hasPresence(state, playerId)) return true;
  if (effectivePegs(zone, playerId) > 0) return true;
  return neighborsOf(zoneId).some((nId) => effectivePegs(state.zones.find((z) => z.id === nId), playerId) > 0);
}

export function canPlaceInZone(state, playerId, zoneId) {
  const zone = state.zones.find((z) => z.id === zoneId);
  if (!zone || isZoneFull(zone)) return false;
  return canReachZone(state, playerId, zoneId);
}

export const isGameOver = (state) =>
  state.zones.every((z) => z.lockedBy !== null || isZoneFull(z));

export function standings(state) {
  const rows = state.players.map((p) => ({
    playerId: p.id,
    name: p.name,
    zones: state.zones.filter((z) => z.lockedBy === p.id).length,
    pegs: state.zones.reduce((s, z) => s + effectivePegs(z, p.id), 0)
  }));
  rows.sort((a, b) => b.zones - a.zones || b.pegs - a.pegs);
  return rows;
}
