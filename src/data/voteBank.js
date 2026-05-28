// 60 Vote Bank Cards. Each card grants `value` voters at the listed resource
// cost. `markedResource` is the cost slot Idealist L4 "Blind Faith" may waive.
//
// Distribution (rulebook-ish — 60 cards, mix-of-resource-costs scaled to value):
//   20 × value 1, cost 1..2 resources
//   25 × value 2, cost 3..4 resources
//   15 × value 3, cost 5..6 resources
const C = (id, value, cost, markedResource) => ({ id, value, cost, markedResource });

const v1 = [
  C("vb01", 1, { funds: 1 }, "funds"),
  C("vb02", 1, { clout: 1 }, "clout"),
  C("vb03", 1, { media: 1 }, "media"),
  C("vb04", 1, { trust: 1 }, "trust"),
  C("vb05", 1, { funds: 2 }, "funds"),
  C("vb06", 1, { clout: 2 }, "clout"),
  C("vb07", 1, { media: 2 }, "media"),
  C("vb08", 1, { trust: 2 }, "trust"),
  C("vb09", 1, { funds: 1, clout: 1 }, "clout"),
  C("vb10", 1, { funds: 1, media: 1 }, "media"),
  C("vb11", 1, { funds: 1, trust: 1 }, "trust"),
  C("vb12", 1, { clout: 1, media: 1 }, "media"),
  C("vb13", 1, { clout: 1, trust: 1 }, "trust"),
  C("vb14", 1, { media: 1, trust: 1 }, "trust"),
  C("vb15", 1, { funds: 1, clout: 1 }, "funds"),
  C("vb16", 1, { funds: 1, media: 1 }, "funds"),
  C("vb17", 1, { funds: 1, trust: 1 }, "funds"),
  C("vb18", 1, { clout: 1, media: 1 }, "clout"),
  C("vb19", 1, { clout: 1, trust: 1 }, "clout"),
  C("vb20", 1, { media: 1, trust: 1 }, "media"),
];

const v2 = [
  C("vb21", 2, { funds: 3 }, "funds"),
  C("vb22", 2, { clout: 3 }, "clout"),
  C("vb23", 2, { media: 3 }, "media"),
  C("vb24", 2, { trust: 3 }, "trust"),
  C("vb25", 2, { funds: 2, clout: 1 }, "funds"),
  C("vb26", 2, { funds: 2, media: 1 }, "media"),
  C("vb27", 2, { funds: 2, trust: 1 }, "trust"),
  C("vb28", 2, { clout: 2, funds: 1 }, "clout"),
  C("vb29", 2, { clout: 2, media: 1 }, "media"),
  C("vb30", 2, { clout: 2, trust: 1 }, "clout"),
  C("vb31", 2, { media: 2, funds: 1 }, "media"),
  C("vb32", 2, { media: 2, clout: 1 }, "media"),
  C("vb33", 2, { media: 2, trust: 1 }, "trust"),
  C("vb34", 2, { trust: 2, funds: 1 }, "trust"),
  C("vb35", 2, { trust: 2, clout: 1 }, "clout"),
  C("vb36", 2, { trust: 2, media: 1 }, "media"),
  C("vb37", 2, { funds: 1, clout: 1, media: 1 }, "funds"),
  C("vb38", 2, { funds: 1, clout: 1, trust: 1 }, "clout"),
  C("vb39", 2, { funds: 1, media: 1, trust: 1 }, "media"),
  C("vb40", 2, { clout: 1, media: 1, trust: 1 }, "trust"),
  C("vb41", 2, { funds: 2, clout: 2 }, "funds"),
  C("vb42", 2, { funds: 2, media: 2 }, "media"),
  C("vb43", 2, { clout: 2, trust: 2 }, "trust"),
  C("vb44", 2, { media: 2, trust: 2 }, "trust"),
  C("vb45", 2, { funds: 1, clout: 2, media: 1 }, "clout"),
];

const v3 = [
  C("vb46", 3, { funds: 2, clout: 2, media: 1 }, "media"),
  C("vb47", 3, { funds: 2, clout: 1, trust: 2 }, "funds"),
  C("vb48", 3, { funds: 1, clout: 2, trust: 2 }, "clout"),
  C("vb49", 3, { clout: 2, media: 2, trust: 1 }, "media"),
  C("vb50", 3, { funds: 2, media: 2, trust: 1 }, "trust"),
  C("vb51", 3, { funds: 1, media: 2, trust: 2 }, "media"),
  C("vb52", 3, { funds: 3, clout: 2 }, "funds"),
  C("vb53", 3, { clout: 3, media: 2 }, "clout"),
  C("vb54", 3, { media: 3, trust: 2 }, "media"),
  C("vb55", 3, { trust: 3, funds: 2 }, "trust"),
  C("vb56", 3, { funds: 2, clout: 2, media: 2 }, "funds"),
  C("vb57", 3, { funds: 2, clout: 2, trust: 2 }, "clout"),
  C("vb58", 3, { funds: 2, media: 2, trust: 2 }, "media"),
  C("vb59", 3, { clout: 2, media: 2, trust: 2 }, "trust"),
  C("vb60", 3, { funds: 1, clout: 2, media: 1, trust: 2 }, "trust"),
];

export const VOTE_BANK = [...v1, ...v2, ...v3];
export const VOTE_BANK_BY_ID = Object.fromEntries(VOTE_BANK.map((c) => [c.id, c]));
