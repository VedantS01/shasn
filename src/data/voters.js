// Each offer: id, label, value (pegs granted), cost (resource -> amount).
export const VOTER_MARKET = [
  { id: "v1", label: "Doorstep Canvass", value: 1, cost: { trust: 1, media: 1 } },
  { id: "v2", label: "Ward Rally",       value: 2, cost: { media: 2, clout: 1, funds: 1 } },
  { id: "v3", label: "Party Machine",    value: 3, cost: { funds: 3, clout: 2, media: 1 } }
];

export const VOTER_BY_ID = Object.fromEntries(VOTER_MARKET.map((v) => [v.id, v]));

// Cost to seize a zone's single volatile seat (a contested, non-gerrymanderable
// spot that triggers a Headline). One token is placed there.
export const VOLATILE_COST = { clout: 1, media: 1 };

