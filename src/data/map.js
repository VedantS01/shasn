// Fictional nation "Bharatpur" — 9 constituencies arranged as a central capital
// region (z4) encircled by 8 provinces. The ring order makes consecutive provinces
// neighbours and every province border the capital — matching `neighbors` below.
// Geometry (sector wedges + seat circles) is computed by src/ui/map.js from `ring`.
export const ZONES = [
  { id: "z0", name: "Northgate",   capacity: 5,  neighbors: ["z1", "z3", "z4"], ring: 315 },
  { id: "z1", name: "Highcrest",   capacity: 7,  neighbors: ["z0", "z2", "z4"], ring: 0 },
  { id: "z2", name: "Eastmarsh",   capacity: 5,  neighbors: ["z1", "z4", "z5"], ring: 45 },
  { id: "z3", name: "Millfield",   capacity: 7,  neighbors: ["z0", "z4", "z6"], ring: 270 },
  { id: "z4", name: "The Capital", capacity: 11, neighbors: ["z0","z1","z2","z3","z5","z6","z7","z8"], ring: "center" },
  { id: "z5", name: "Saltcoast",   capacity: 7,  neighbors: ["z2", "z4", "z8"], ring: 90 },
  { id: "z6", name: "Lowdowns",    capacity: 5,  neighbors: ["z3", "z4", "z7"], ring: 225 },
  { id: "z7", name: "Ironreach",   capacity: 7,  neighbors: ["z4", "z6", "z8"], ring: 180 },
  { id: "z8", name: "Sunderlands", capacity: 5,  neighbors: ["z4", "z5", "z7"], ring: 135 }
];

export const ZONE_BY_ID = Object.fromEntries(ZONES.map((z) => [z.id, z]));
