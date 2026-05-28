// Original Headline events, triggered when a voter is placed on a zone's volatile
// seat. They resolve immediately on the player who triggered them. effect.type maps
// to a resolver in src/engine/headlines.js. All content is original.
export const HEADLINES = [
  { id: "h01", name: "Endorsement Wave",       text: "A beloved figure backs you.",        effect: { type: "grant", params: { resource: "trust", amount: 2 } } },
  { id: "h02", name: "Funding Probe",          text: "Auditors freeze a war chest.",       effect: { type: "lose",  params: { resource: "funds", amount: 2 } } },
  { id: "h03", name: "Media Blitz",            text: "Your face is on every screen.",      effect: { type: "grant", params: { resource: "media", amount: 2 } } },
  { id: "h04", name: "Street Backlash",        text: "A misstep costs you the crowd.",      effect: { type: "lose",  params: { resource: "clout", amount: 2 } } },
  { id: "h05", name: "Landslide Coverage",     text: "Momentum on every front.",            effect: { type: "windfall", params: {} } },
  { id: "h06", name: "Breaking Story",         text: "The news cycle hands you a gift.",    effect: { type: "extraDilemma", params: {} } },
  { id: "h07", name: "Donor Surge",            text: "Checks pour in overnight.",           effect: { type: "grant", params: { resource: "funds", amount: 2 } } },
  { id: "h08", name: "Mass Mobilization",      text: "The base floods the streets.",        effect: { type: "grant", params: { resource: "clout", amount: 2 } } },
  { id: "h09", name: "Leaked Tape",            text: "A hot mic burns your message.",       effect: { type: "lose",  params: { resource: "media", amount: 2 } } },
  { id: "h10", name: "Town Hall Triumph",      text: "You win the room, and the cameras.",  effect: { type: "grant", params: { resource: "trust", amount: 2 } } },
  { id: "h11", name: "Broken Promise",         text: "An old vow comes back to bite.",      effect: { type: "lose",  params: { resource: "trust", amount: 2 } } },
  { id: "h12", name: "October Surprise",       text: "Everything breaks your way at once.", effect: { type: "windfall", params: {} } },
  { id: "h13", name: "Foreign Endorsement",   text: "A neighbor backs your platform.",     effect: { type: "grant", params: { resource: "trust", amount: 2 } } },
  { id: "h14", name: "Strike Wave",           text: "Workers walk out across the south.",  effect: { type: "lose",  params: { resource: "clout", amount: 2 } } },
  { id: "h15", name: "Viral Speech",          text: "A clip catches fire.",                effect: { type: "grant", params: { resource: "media", amount: 2 } } },
  { id: "h16", name: "Court Setback",         text: "A ruling stalls your agenda.",        effect: { type: "lose",  params: { resource: "trust", amount: 2 } } },
  { id: "h17", name: "Surprise Coalition",    text: "An ally turns the tide.",             effect: { type: "windfall", params: {} } },
  { id: "h18", name: "Border Incident",       text: "An overnight crisis dominates news.", effect: { type: "extraDilemma", params: {} } },
  { id: "h19", name: "Whistleblower",         text: "An insider leaks the playbook.",      effect: { type: "lose",  params: { resource: "funds", amount: 2 } } },
  { id: "h20", name: "Festival Spotlight",    text: "The cameras find you everywhere.",    effect: { type: "grant", params: { resource: "clout", amount: 2 } } }
];

export const HEADLINE_BY_ID = Object.fromEntries(HEADLINES.map((h) => [h.id, h]));

export const HEADLINE_EFFECT_TYPES = ["grant", "lose", "windfall", "extraDilemma"];
