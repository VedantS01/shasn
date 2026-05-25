// Original dilemmas. answers[i].ideology selects the pile; payout is dominant
// in that ideology's resource (capitalist=funds, supremo=clout, showstopper=media, idealist=trust).
export const DILEMMAS = [
  {
    id: "d001",
    question: "A drought empties the reservoirs. Do you ration water by price, letting the market decide?",
    answers: [
      { label: "Yes — price signals end waste", ideology: "capitalist", payout: { funds: 2, media: 1 } },
      { label: "No — water is a right, ration it equally", ideology: "idealist", payout: { trust: 2, clout: 1 } }
    ]
  },
  {
    id: "d002",
    question: "Migrants flood the capital for work. Do you seal the city's borders to outsiders?",
    answers: [
      { label: "Yes — the city belongs to its own", ideology: "supremo", payout: { clout: 2, media: 1 } },
      { label: "No — open arms build a bigger nation", ideology: "idealist", payout: { trust: 2, funds: 1 } }
    ]
  },
  {
    id: "d003",
    question: "A scandal could sink a rival. Do you leak it to a friendly broadcaster?",
    answers: [
      { label: "Yes — control the headline", ideology: "showstopper", payout: { media: 2, clout: 1 } },
      { label: "No — keep your hands clean", ideology: "idealist", payout: { trust: 2, media: 1 } }
    ]
  },
  {
    id: "d004",
    question: "Industrialists offer to fund schools if you cut their taxes. Do you take the deal?",
    answers: [
      { label: "Yes — private money, public good", ideology: "capitalist", payout: { funds: 3 } },
      { label: "No — tax them and build it ourselves", ideology: "supremo", payout: { clout: 2, funds: 1 } }
    ]
  },
  {
    id: "d005",
    question: "Protesters camp outside parliament. Do you send in the police at dawn?",
    answers: [
      { label: "Yes — order above all", ideology: "supremo", payout: { clout: 3 } },
      { label: "No — let them be heard on camera", ideology: "showstopper", payout: { media: 2, trust: 1 } }
    ]
  },
  {
    id: "d006",
    question: "A viral rumor flatters your image but isn't true. Do you let it spread?",
    answers: [
      { label: "Yes — a useful myth is still useful", ideology: "showstopper", payout: { media: 3 } },
      { label: "No — correct the record publicly", ideology: "idealist", payout: { trust: 2, media: 1 } }
    ]
  },
  {
    id: "d007",
    question: "A foreign firm will build highways for mining rights. Do you sign?",
    answers: [
      { label: "Yes — growth needs roads", ideology: "capitalist", payout: { funds: 2, clout: 1 } },
      { label: "No — our land, our terms", ideology: "supremo", payout: { clout: 2, trust: 1 } }
    ]
  },
  {
    id: "d008",
    question: "Famous artists endorse you if you fund the festival. Do you bankroll it?",
    answers: [
      { label: "Yes — spectacle wins hearts", ideology: "showstopper", payout: { media: 2, funds: 1 } },
      { label: "No — spend it on clinics instead", ideology: "idealist", payout: { trust: 3 } }
    ]
  }
];

export const DILEMMA_BY_ID = Object.fromEntries(DILEMMAS.map((d) => [d.id, d]));
