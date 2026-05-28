// 9 zones in a hex-tiled hexagonal country. Each zone has a hex center on a
// flat-top hex grid (axial coords scaled to pixels in src/ui/geometry.js).
// volatileSeats: indices into the seat array that are volatile (immune,
// trigger a Headline at end of turn when occupied).
//
// Capacities/majorities are lifted directly from the rulebook board:
//   central 9 (maj 5), N/S 21 (maj 11), E/W 17 (maj 9), four corners 11 (maj 6).
const Z = (id, name, capacity, neighbors, axial, volatileSeats) =>
  ({ id, name, capacity, majority: Math.ceil((capacity + 1) / 2), neighbors, axial, volatileSeats });

export const ZONES = [
  Z("central", "Central",    9, ["north","south","east","west","ne","nw","se","sw"], { q:  0, r:  0 }, [2, 6]),
  Z("north",   "North",     21, ["nw","ne","central"],                                { q:  0, r: -2 }, [3, 8, 13, 18]),
  Z("south",   "South",     21, ["sw","se","central"],                                { q:  0, r:  2 }, [3, 8, 13, 18]),
  Z("east",    "East",      17, ["ne","se","central"],                                { q:  2, r:  0 }, [3, 8, 14]),
  Z("west",    "West",      17, ["nw","sw","central"],                                { q: -2, r:  0 }, [3, 8, 14]),
  Z("ne",      "North-East",11, ["north","east","central"],                           { q:  1, r: -1 }, [2, 8]),
  Z("nw",      "North-West",11, ["north","west","central"],                           { q: -1, r: -1 }, [2, 8]),
  Z("se",      "South-East",11, ["south","east","central"],                           { q:  1, r:  1 }, [2, 8]),
  Z("sw",      "South-West",11, ["south","west","central"],                           { q: -1, r:  1 }, [2, 8]),
];

export const ZONE_BY_ID = Object.fromEntries(ZONES.map((z) => [z.id, z]));
