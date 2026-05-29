// Multi-map registry for SHASN.
//
// Each map entry has:
//   id, name, viewBox, zones[]
//
// Each zone has:
//   id, name, capacity, majority, neighbors[], axial, volatileSeats[],
//   path (SVG polygon d-string), seats[] (per-seat {x,y} coordinates)
//
// The seat coordinates are computed once at module load via concentric rings
// inside each hex polygon — treated as constants after that.
//
// Capacities/majorities are lifted directly from the rulebook boards.

// ---------------------------------------------------------------------------
// Geometry helpers (inlined to avoid data/ importing from ui/)
// ---------------------------------------------------------------------------

// Flat-top hex grid. We use two separate centers so the two boards render
// nicely on their different viewBoxes.

function hexCenterFor(boardCenter, axial, size) {
  return {
    x: boardCenter.x + size * 1.5 * axial.q,
    y: boardCenter.y + size * Math.sqrt(3) * (axial.r + axial.q / 2)
  };
}

function hexPathFor(boardCenter, axial, size) {
  const c = hexCenterFor(boardCenter, axial, size);
  const pts = [];
  for (let i = 0; i < 6; i++) {
    const a = (Math.PI / 3) * i;
    pts.push({ x: c.x + size * Math.cos(a), y: c.y + size * Math.sin(a) });
  }
  return `M${pts[0].x.toFixed(1)},${pts[0].y.toFixed(1)} ` +
    pts.slice(1).map((p) => `L${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" ") + " Z";
}

// Pack `n` seats in concentric rings inside a hex of given size.
function seatPositionsFor(center, size, n) {
  if (n <= 0) return [];
  if (n === 1) return [{ x: center.x, y: center.y }];
  const out = [];
  const ring1Count = Math.min(6, n - 1);
  const ring2Count = Math.min(12, n - 1 - ring1Count);
  const ring3Count = Math.max(0, n - 1 - ring1Count - ring2Count);

  // Center
  out.push({ x: center.x, y: center.y });

  // Ring 1 (inner)
  for (let i = 0; i < ring1Count; i++) {
    const a = (2 * Math.PI / ring1Count) * i;
    out.push({ x: center.x + size * 0.38 * Math.cos(a), y: center.y + size * 0.38 * Math.sin(a) });
  }

  // Ring 2 (mid)
  for (let i = 0; i < ring2Count; i++) {
    const a = (2 * Math.PI / ring2Count) * i + Math.PI / ring2Count;
    out.push({ x: center.x + size * 0.65 * Math.cos(a), y: center.y + size * 0.65 * Math.sin(a) });
  }

  // Ring 3 (outer)
  if (ring3Count > 0) {
    for (let i = 0; i < ring3Count; i++) {
      const a = (2 * Math.PI / ring3Count) * i + Math.PI / ring3Count * 0.5;
      out.push({ x: center.x + size * 0.88 * Math.cos(a), y: center.y + size * 0.88 * Math.sin(a) });
    }
  }

  // Safety: if we still don't have enough (n > 1+6+12+n-19 shouldn't happen, but guard)
  if (out.length < n) {
    const extra = n - out.length;
    for (let i = 0; i < extra; i++) {
      const a = (2 * Math.PI / extra) * i;
      out.push({ x: center.x + size * 0.95 * Math.cos(a), y: center.y + size * 0.95 * Math.sin(a) });
    }
  }

  return out.slice(0, n).map((p) => ({ x: Math.round(p.x * 10) / 10, y: Math.round(p.y * 10) / 10 }));
}

// Build a zone definition with computed path + seat positions.
function buildZone(boardCenter, hexSize, id, name, capacity, neighbors, axial, volatileSeats) {
  const center = hexCenterFor(boardCenter, axial, hexSize);
  const path = hexPathFor(boardCenter, axial, hexSize);
  const seats = seatPositionsFor(center, hexSize, capacity);
  const majority = Math.ceil((capacity + 1) / 2);
  return { id, name, capacity, majority, neighbors, axial, volatileSeats, path, seats };
}

// ---------------------------------------------------------------------------
// Large board (3-4 players) — 9 zones, hex-tiled hexagonal country
// ---------------------------------------------------------------------------
const LARGE_CENTER = { x: 400, y: 350 };
const LARGE_HEX_SIZE = 110;

const largeZones = [
  buildZone(LARGE_CENTER, LARGE_HEX_SIZE,
    "central", "Central",    9,  ["north","south","east","west","ne","nw","se","sw"], { q:  0, r:  0 }, [2, 6]),
  buildZone(LARGE_CENTER, LARGE_HEX_SIZE,
    "north",   "North",     21,  ["nw","ne","central"],                               { q:  0, r: -2 }, [3, 8, 13, 18]),
  buildZone(LARGE_CENTER, LARGE_HEX_SIZE,
    "south",   "South",     21,  ["sw","se","central"],                               { q:  0, r:  2 }, [3, 8, 13, 18]),
  buildZone(LARGE_CENTER, LARGE_HEX_SIZE,
    "east",    "East",      17,  ["ne","se","central"],                               { q:  2, r:  0 }, [3, 8, 14]),
  buildZone(LARGE_CENTER, LARGE_HEX_SIZE,
    "west",    "West",      17,  ["nw","sw","central"],                               { q: -2, r:  0 }, [3, 8, 14]),
  buildZone(LARGE_CENTER, LARGE_HEX_SIZE,
    "ne",      "North-East",11,  ["north","east","central"],                          { q:  1, r: -1 }, [2, 8]),
  buildZone(LARGE_CENTER, LARGE_HEX_SIZE,
    "nw",      "North-West",11,  ["north","west","central"],                          { q: -1, r: -1 }, [2, 8]),
  buildZone(LARGE_CENTER, LARGE_HEX_SIZE,
    "se",      "South-East",11,  ["south","east","central"],                          { q:  1, r:  1 }, [2, 8]),
  buildZone(LARGE_CENTER, LARGE_HEX_SIZE,
    "sw",      "South-West",11,  ["south","west","central"],                          { q: -1, r:  1 }, [2, 8]),
];

// ---------------------------------------------------------------------------
// Small board (2 players) — 7 zones, hub-and-spoke layout
// Central hex surrounded by 6 perimeter hexes.
//
// Zone capacities / majorities from the spec:
//   central: cap 17, maj 9  (touches all 6)
//   n:  cap 11, maj 6  (touches central, ne, nw)
//   ne: cap 13, maj 7  (touches central, n,  se)
//   se: cap 15, maj 8  (touches central, ne, s)
//   s:  cap 11, maj 6  (touches central, se, sw)
//   sw: cap 13, maj 7  (touches central, s,  nw)
//   nw: cap 15, maj 8  (touches central, sw, n)
//
// Total capacity: 17+11+13+15+11+13+15 = 95
//
// Axial coords (flat-top grid, distance 1 from center):
//   central: {q:0, r:0}
//   n:  {q:0, r:-1}
//   ne: {q:1, r:-1}
//   se: {q:1, r:0}
//   s:  {q:0, r:1}
//   sw: {q:-1, r:1}
//   nw: {q:-1, r:0}
// ---------------------------------------------------------------------------
const SMALL_CENTER = { x: 350, y: 350 };
const SMALL_HEX_SIZE = 110;

const smallZones = [
  buildZone(SMALL_CENTER, SMALL_HEX_SIZE,
    "central", "Central",  17, ["n","ne","se","s","sw","nw"],        { q:  0, r:  0 }, [2, 6, 12]),
  buildZone(SMALL_CENTER, SMALL_HEX_SIZE,
    "n",       "North",    11, ["central","ne","nw"],                 { q:  0, r: -1 }, [2, 8]),
  buildZone(SMALL_CENTER, SMALL_HEX_SIZE,
    "ne",      "North-East",13, ["central","n","se"],                 { q:  1, r: -1 }, [2, 8]),
  buildZone(SMALL_CENTER, SMALL_HEX_SIZE,
    "se",      "South-East",15, ["central","ne","s"],                 { q:  1, r:  0 }, [2, 8, 12]),
  buildZone(SMALL_CENTER, SMALL_HEX_SIZE,
    "s",       "South",    11, ["central","se","sw"],                 { q:  0, r:  1 }, [2, 8]),
  buildZone(SMALL_CENTER, SMALL_HEX_SIZE,
    "sw",      "South-West",13, ["central","s","nw"],                 { q: -1, r:  1 }, [2, 8]),
  buildZone(SMALL_CENTER, SMALL_HEX_SIZE,
    "nw",      "North-West",15, ["central","sw","n"],                 { q: -1, r:  0 }, [2, 8, 12]),
];

// ---------------------------------------------------------------------------
// Registry
// ---------------------------------------------------------------------------

export const MAPS = {
  large: {
    id: "large",
    name: "Large board (3-4 players)",
    viewBox: "0 0 800 700",
    zones: largeZones,
    zoneById: Object.fromEntries(largeZones.map((z) => [z.id, z]))
  },
  small: {
    id: "small",
    name: "Small board (2 players)",
    viewBox: "0 0 700 700",
    zones: smallZones,
    zoneById: Object.fromEntries(smallZones.map((z) => [z.id, z]))
  }
};

export const DEFAULT_MAP = "large";

// ---------------------------------------------------------------------------
// Legacy single-map exports for callers not yet migrated.
// ---------------------------------------------------------------------------
export const ZONES = MAPS[DEFAULT_MAP].zones;
export const ZONE_BY_ID = MAPS[DEFAULT_MAP].zoneById;
