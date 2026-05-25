// Original conspiracy cards. effect.type maps to a resolver in src/engine/conspiracies.js.
export const CONSPIRACIES = [
  { id: "c001", name: "War Chest",        text: "A quiet donor fills your coffers.",       canInterrupt: false, effect: { type: "grantResource", params: { resource: "funds", amount: 3 } } },
  { id: "c002", name: "Smear Campaign",   text: "Bleed a rival's momentum dry.",           canInterrupt: true,  effect: { type: "stealResource", params: { resource: "media", amount: 2 } } },
  { id: "c003", name: "Breaking News",    text: "Seize the cycle for an extra story.",     canInterrupt: false, effect: { type: "extraDilemma", params: {} } },
  { id: "c004", name: "Paper Trail",      text: "Expose a hidden scheme — they lose it.",  canInterrupt: true,  effect: { type: "forceDiscardConspiracy", params: {} } },
  { id: "c005", name: "Booth Capture",    text: "Strong-arm a contested booth.",           canInterrupt: false, effect: { type: "removePeg", params: {} } },
  { id: "c006", name: "Loyalist Cordon",  text: "Wall off a stronghold from meddling.",    canInterrupt: false, effect: { type: "protectMajority", params: {} } }
];

export const CONSPIRACY_BY_ID = Object.fromEntries(CONSPIRACIES.map((c) => [c.id, c]));

export const CONSPIRACY_EFFECT_TYPES = [
  "grantResource", "stealResource", "extraDilemma",
  "forceDiscardConspiracy", "removePeg", "protectMajority"
];
