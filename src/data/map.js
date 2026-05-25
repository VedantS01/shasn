// Fictional nation "Bharatpur" — 9 constituencies.
// capacity is odd (majority = (capacity+1)/2). svgPath drawn on a 600x600 viewBox.
export const ZONES = [
  { id: "z0", name: "Northgate",   capacity: 5,  neighbors: ["z1", "z3", "z4"],             svgPath: "M40,40 H210 V190 H40 Z" },
  { id: "z1", name: "Highcrest",   capacity: 7,  neighbors: ["z0", "z2", "z4"],             svgPath: "M210,40 H390 V190 H210 Z" },
  { id: "z2", name: "Eastmarsh",   capacity: 5,  neighbors: ["z1", "z4", "z5"],             svgPath: "M390,40 H560 V190 H390 Z" },
  { id: "z3", name: "Millfield",   capacity: 7,  neighbors: ["z0", "z4", "z6"],             svgPath: "M40,190 H210 V410 H40 Z" },
  { id: "z4", name: "Capital",     capacity: 11, neighbors: ["z0","z1","z2","z3","z5","z6","z7","z8"], svgPath: "M210,190 H390 V410 H210 Z" },
  { id: "z5", name: "Saltcoast",   capacity: 7,  neighbors: ["z2", "z4", "z8"],             svgPath: "M390,190 H560 V410 H390 Z" },
  { id: "z6", name: "Lowdowns",    capacity: 5,  neighbors: ["z3", "z4", "z7"],             svgPath: "M40,410 H210 V560 H40 Z" },
  { id: "z7", name: "Ironreach",   capacity: 7,  neighbors: ["z4", "z6", "z8"],             svgPath: "M210,410 H390 V560 H210 Z" },
  { id: "z8", name: "Sunderlands", capacity: 5,  neighbors: ["z4", "z5", "z7"],             svgPath: "M390,410 H560 V560 H390 Z" }
];

export const ZONE_BY_ID = Object.fromEntries(ZONES.map((z) => [z.id, z]));
