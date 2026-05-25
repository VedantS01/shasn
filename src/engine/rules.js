import { ZONE_BY_ID } from "../data/map.js";

export const zoneCapacity = (zoneId) => ZONE_BY_ID[zoneId].capacity;
export const majorityThreshold = (zoneId) => (ZONE_BY_ID[zoneId].capacity + 1) / 2;
export const neighborsOf = (zoneId) => ZONE_BY_ID[zoneId].neighbors;

export const pegCount = (zone, playerId) => zone.pegs[playerId] || 0;
export const totalPegs = (zone) => Object.values(zone.pegs).reduce((s, n) => s + n, 0);
export const isZoneFull = (zone) => totalPegs(zone) >= zoneCapacity(zone.id);

export function majorityHolder(zone) {
  const need = majorityThreshold(zone.id);
  for (const [pid, n] of Object.entries(zone.pegs)) if (n >= need) return Number(pid);
  return null;
}

export const hasPresence = (state, playerId) =>
  state.zones.some((z) => pegCount(z, playerId) > 0);

export function canPlaceInZone(state, playerId, zoneId) {
  const zone = state.zones.find((z) => z.id === zoneId);
  if (!zone || zone.lockedBy !== null || isZoneFull(zone)) return false;
  if (!hasPresence(state, playerId)) return true;
  if (pegCount(zone, playerId) > 0) return true;
  return neighborsOf(zoneId).some((nId) => {
    const n = state.zones.find((z) => z.id === nId);
    return pegCount(n, playerId) > 0;
  });
}

export const isGameOver = (state) =>
  state.zones.every((z) => z.lockedBy !== null || isZoneFull(z));

export function standings(state) {
  const rows = state.players.map((p) => ({
    playerId: p.id,
    name: p.name,
    zones: state.zones.filter((z) => z.lockedBy === p.id).length,
    pegs: state.zones.reduce((s, z) => s + pegCount(z, p.id), 0)
  }));
  rows.sort((a, b) => b.zones - a.zones || b.pegs - a.pegs);
  return rows;
}
