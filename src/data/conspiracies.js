// Original conspiracy cards. effect.type maps to a resolver in src/engine/conspiracies.js.
// All content is original; no copyrighted SHASN card text is reproduced.
export const CONSPIRACIES = [
  { id: "c001", name: "War Chest",         text: "A quiet donor fills your coffers.",          canInterrupt: false, effect: { type: "grantResource", params: { resource: "funds", amount: 3 } } },
  { id: "c002", name: "Smear Campaign",    text: "Bleed a rival's momentum dry.",              canInterrupt: true,  effect: { type: "stealResource", params: { resource: "media", amount: 2 } } },
  { id: "c003", name: "Breaking News",     text: "Seize the cycle for an extra story.",        canInterrupt: false, effect: { type: "extraDilemma", params: {} } },
  { id: "c004", name: "Paper Trail",       text: "Expose a hidden scheme — they lose it.",     canInterrupt: true,  effect: { type: "forceDiscardConspiracy", params: {} } },
  { id: "c005", name: "Booth Capture",     text: "Strong-arm a contested booth.",              canInterrupt: false, effect: { type: "removePeg", params: {} } },
  { id: "c006", name: "Loyalist Cordon",   text: "Wall off a stronghold from meddling.",       canInterrupt: false, effect: { type: "protectMajority", params: {} } },
  { id: "c007", name: "Slush Fund",        text: "Untraceable money, freely spent.",           canInterrupt: false, effect: { type: "grantResource", params: { resource: "funds", amount: 2 } } },
  { id: "c008", name: "Astroturf Army",    text: "Manufacture a groundswell of support.",      canInterrupt: false, effect: { type: "grantResource", params: { resource: "media", amount: 3 } } },
  { id: "c009", name: "Goodwill Tour",     text: "Handshakes and promises build faith.",       canInterrupt: false, effect: { type: "grantResource", params: { resource: "trust", amount: 3 } } },
  { id: "c010", name: "Show of Force",     text: "A parade of power cows the doubters.",       canInterrupt: false, effect: { type: "grantResource", params: { resource: "clout", amount: 3 } } },
  { id: "c011", name: "Bribe the Press",   text: "Buy a rival's headlines out from under them.", canInterrupt: true, effect: { type: "stealResource", params: { resource: "media", amount: 3 } } },
  { id: "c012", name: "Audit Ambush",      text: "Freeze a rival's accounts mid-move.",        canInterrupt: true,  effect: { type: "stealResource", params: { resource: "funds", amount: 2 } } },
  { id: "c013", name: "Defection",         text: "Poach a rival's most trusted aide.",         canInterrupt: true,  effect: { type: "stealResource", params: { resource: "trust", amount: 2 } } },
  { id: "c014", name: "Whisper Network",   text: "Erode a rival's standing among elites.",     canInterrupt: true,  effect: { type: "stealResource", params: { resource: "clout", amount: 2 } } },
  { id: "c015", name: "Exclusive Scoop",   text: "Break a story no one else has.",             canInterrupt: false, effect: { type: "extraDilemma", params: {} } },
  { id: "c016", name: "Leaked Memo",       text: "A careless rival drops a card.",             canInterrupt: true,  effect: { type: "forceDiscardConspiracy", params: {} } },
  { id: "c017", name: "Midnight Raid",     text: "Clear a booth before dawn.",                 canInterrupt: false, effect: { type: "removePeg", params: {} } },
  { id: "c018", name: "Ballot Challenge",  text: "Disqualify a single planted vote.",          canInterrupt: true,  effect: { type: "removePeg", params: {} } },
  { id: "c019", name: "Fortify the Base",  text: "Dig in where you already rule.",             canInterrupt: false, effect: { type: "protectMajority", params: {} } },
  { id: "c020", name: "Emergency Grant",   text: "A windfall lands at the right moment.",      canInterrupt: false, effect: { type: "grantResource", params: { resource: "funds", amount: 3 } } }
];

export const CONSPIRACY_BY_ID = Object.fromEntries(CONSPIRACIES.map((c) => [c.id, c]));

export const CONSPIRACY_EFFECT_TYPES = [
  "grantResource", "stealResource", "extraDilemma",
  "forceDiscardConspiracy", "removePeg", "protectMajority"
];
