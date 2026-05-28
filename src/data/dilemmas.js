// Original dilemmas. answers[i].ideology selects the pile; payout is dominant
// in that ideology's resource (capitalist=funds, supremo=clout, showman=media, idealist=trust).
// All content is original; no copyrighted SHASN card text is reproduced.
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
      { label: "Yes — control the headline", ideology: "showman", payout: { media: 2, clout: 1 } },
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
      { label: "No — let them be heard on camera", ideology: "showman", payout: { media: 2, trust: 1 } }
    ]
  },
  {
    id: "d006",
    question: "A viral rumor flatters your image but isn't true. Do you let it spread?",
    answers: [
      { label: "Yes — a useful myth is still useful", ideology: "showman", payout: { media: 3 } },
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
      { label: "Yes — spectacle wins hearts", ideology: "showman", payout: { media: 2, funds: 1 } },
      { label: "No — spend it on clinics instead", ideology: "idealist", payout: { trust: 3 } }
    ]
  },
  {
    id: "d009",
    question: "A stalled factory could reopen if you waive its pollution fines. Do you waive them?",
    answers: [
      { label: "Yes — jobs first, smoke later", ideology: "capitalist", payout: { funds: 2, clout: 1 } },
      { label: "No — clean air is not negotiable", ideology: "idealist", payout: { trust: 2, media: 1 } }
    ]
  },
  {
    id: "d010",
    question: "A general asks for emergency powers to crush a border insurgency. Do you grant them?",
    answers: [
      { label: "Yes — a strong hand keeps the peace", ideology: "supremo", payout: { clout: 3 } },
      { label: "No — no one stands above the law", ideology: "idealist", payout: { trust: 2, clout: 1 } }
    ]
  },
  {
    id: "d011",
    question: "A talk-show host will run your slogans nightly for a price. Do you pay?",
    answers: [
      { label: "Yes — repetition is persuasion", ideology: "showman", payout: { media: 3 } },
      { label: "No — buy ad space the honest way", ideology: "capitalist", payout: { funds: 2, media: 1 } }
    ]
  },
  {
    id: "d012",
    question: "A bank teeters and could take savers down with it. Do you bail it out?",
    answers: [
      { label: "Yes — stability protects everyone", ideology: "capitalist", payout: { funds: 2, trust: 1 } },
      { label: "No — let reckless lenders fail", ideology: "supremo", payout: { clout: 2, funds: 1 } }
    ]
  },
  {
    id: "d013",
    question: "A minority festival clashes with a national parade. Do you cancel the festival?",
    answers: [
      { label: "Yes — one nation, one calendar", ideology: "supremo", payout: { clout: 2, media: 1 } },
      { label: "No — every community has its day", ideology: "idealist", payout: { trust: 2, clout: 1 } }
    ]
  },
  {
    id: "d014",
    question: "A whistleblower offers documents proving a ministry is corrupt. Do you publish?",
    answers: [
      { label: "Yes — sunlight is the best cure", ideology: "idealist", payout: { trust: 3 } },
      { label: "No — but stage a dramatic reveal later", ideology: "showman", payout: { media: 2, clout: 1 } }
    ]
  },
  {
    id: "d015",
    question: "A tech giant wants to run the national ID system for free. Do you let it?",
    answers: [
      { label: "Yes — efficiency at no cost", ideology: "capitalist", payout: { funds: 2, media: 1 } },
      { label: "No — the state must hold its own keys", ideology: "supremo", payout: { clout: 2, trust: 1 } }
    ]
  },
  {
    id: "d016",
    question: "A famine looms in a rebel province. Do you ship grain to people who oppose you?",
    answers: [
      { label: "Yes — hunger knows no party", ideology: "idealist", payout: { trust: 3 } },
      { label: "No — let them remember who feeds them", ideology: "supremo", payout: { clout: 2, media: 1 } }
    ]
  },
  {
    id: "d017",
    question: "A studio will make a flattering biopic of you. Do you greenlight it?",
    answers: [
      { label: "Yes — legends win elections", ideology: "showman", payout: { media: 3 } },
      { label: "No — fund a literacy drive instead", ideology: "idealist", payout: { trust: 2, media: 1 } }
    ]
  },
  {
    id: "d018",
    question: "A port can be sold to clear the national debt. Do you sell it?",
    answers: [
      { label: "Yes — debt is a chain on growth", ideology: "capitalist", payout: { funds: 3 } },
      { label: "No — strategic assets stay ours", ideology: "supremo", payout: { clout: 2, funds: 1 } }
    ]
  },
  {
    id: "d019",
    question: "A curfew would cut crime but cage the innocent too. Do you impose it?",
    answers: [
      { label: "Yes — safe streets above all", ideology: "supremo", payout: { clout: 2, trust: 1 } },
      { label: "No — fear is not security", ideology: "idealist", payout: { trust: 2, media: 1 } }
    ]
  },
  {
    id: "d020",
    question: "A celebrity offers to host your rally if you back their pet cause. Do you agree?",
    answers: [
      { label: "Yes — borrow their spotlight", ideology: "showman", payout: { media: 2, trust: 1 } },
      { label: "No — keep the message yours", ideology: "supremo", payout: { clout: 2, media: 1 } }
    ]
  },
  {
    id: "d021",
    question: "A startup will digitize farm subsidies, skimming a small fee. Do you let it?",
    answers: [
      { label: "Yes — faster aid is worth the cut", ideology: "capitalist", payout: { funds: 2, trust: 1 } },
      { label: "No — no middleman between state and farmer", ideology: "idealist", payout: { trust: 2, clout: 1 } }
    ]
  },
  {
    id: "d022",
    question: "A historic temple blocks a planned metro line. Do you reroute around it at great cost?",
    answers: [
      { label: "Yes — heritage is priceless", ideology: "idealist", payout: { trust: 2, clout: 1 } },
      { label: "No — progress runs on schedule", ideology: "capitalist", payout: { funds: 2, media: 1 } }
    ]
  },
  {
    id: "d023",
    question: "A border skirmish gives you a chance to rally the flag. Do you escalate the rhetoric?",
    answers: [
      { label: "Yes — nothing unites like a foe", ideology: "supremo", payout: { clout: 2, media: 1 } },
      { label: "No — broadcast calls for calm", ideology: "showman", payout: { media: 2, trust: 1 } }
    ]
  },
  {
    id: "d024",
    question: "A pharma firm will price a new vaccine high but fund free clinics. Do you approve?",
    answers: [
      { label: "Yes — the clinics save lives now", ideology: "capitalist", payout: { funds: 2, trust: 1 } },
      { label: "No — cap the price, full stop", ideology: "idealist", payout: { trust: 2, clout: 1 } }
    ]
  },
  {
    id: "d025",
    question: "A rival's gaffe is trending. Do you flood the feeds with edited clips?",
    answers: [
      { label: "Yes — strike while it's hot", ideology: "showman", payout: { media: 3 } },
      { label: "No — win on substance", ideology: "idealist", payout: { trust: 2, media: 1 } }
    ]
  },
  {
    id: "d026",
    question: "A slum sits on land a developer covets. Do you clear it for a glittering district?",
    answers: [
      { label: "Yes — the city must rise", ideology: "capitalist", payout: { funds: 2, clout: 1 } },
      { label: "No — rehouse them first, with dignity", ideology: "idealist", payout: { trust: 3 } }
    ]
  },
  {
    id: "d027",
    question: "A neighboring state poaches your engineers. Do you ban them from leaving?",
    answers: [
      { label: "Yes — talent is a national asset", ideology: "supremo", payout: { clout: 2, funds: 1 } },
      { label: "No — pay them enough to stay", ideology: "capitalist", payout: { funds: 2, trust: 1 } }
    ]
  },
  {
    id: "d028",
    question: "A documentary exposes your ally's crimes. Do you let the state broadcaster air it?",
    answers: [
      { label: "Yes — truth over loyalty", ideology: "idealist", payout: { trust: 2, media: 1 } },
      { label: "No — bury it, spin a distraction", ideology: "showman", payout: { media: 2, clout: 1 } }
    ]
  },
  {
    id: "d029",
    question: "A flood wrecks two districts — one yours, one a rival's. Do you split relief evenly?",
    answers: [
      { label: "Yes — need decides, not maps", ideology: "idealist", payout: { trust: 3 } },
      { label: "No — reward the loyal first", ideology: "supremo", payout: { clout: 2, funds: 1 } }
    ]
  },
  {
    id: "d030",
    question: "A casino license would flood the treasury but court vice. Do you grant it?",
    answers: [
      { label: "Yes — vice taxed is vice tamed", ideology: "capitalist", payout: { funds: 3 } },
      { label: "No — protect the vulnerable", ideology: "idealist", payout: { trust: 2, clout: 1 } }
    ]
  },
  {
    id: "d031",
    question: "A populist anthem about you tops the charts. Do you adopt it as your campaign song?",
    answers: [
      { label: "Yes — ride the wave", ideology: "showman", payout: { media: 2, funds: 1 } },
      { label: "No — gravitas over jingles", ideology: "supremo", payout: { clout: 2, media: 1 } }
    ]
  },
  {
    id: "d032",
    question: "A surveillance network would catch terrorists and track everyone else. Do you build it?",
    answers: [
      { label: "Yes — nothing to hide, nothing to fear", ideology: "supremo", payout: { clout: 3 } },
      { label: "No — privacy is a pillar of freedom", ideology: "idealist", payout: { trust: 2, media: 1 } }
    ]
  },
  {
    id: "d033",
    question: "A union threatens a transit strike before elections. Do you concede their demands?",
    answers: [
      { label: "Yes — workers keep the city alive", ideology: "idealist", payout: { trust: 2, clout: 1 } },
      { label: "No — break the strike on live TV", ideology: "showman", payout: { media: 2, clout: 1 } }
    ]
  },
  {
    id: "d034",
    question: "A trade pact opens markets but undercuts local farmers. Do you sign it?",
    answers: [
      { label: "Yes — cheaper goods for all", ideology: "capitalist", payout: { funds: 2, media: 1 } },
      { label: "No — shield our own soil", ideology: "supremo", payout: { clout: 2, trust: 1 } }
    ]
  },
  {
    id: "d035",
    question: "A viral charity stunt would boost you but spotlight a real crisis. Do you stage it?",
    answers: [
      { label: "Yes — attention is aid", ideology: "showman", payout: { media: 2, trust: 1 } },
      { label: "No — donate quietly, no cameras", ideology: "idealist", payout: { trust: 2, funds: 1 } }
    ]
  },
  {
    id: "d036",
    question: "A coastal town must move as seas rise. Do you fund a costly managed retreat?",
    answers: [
      { label: "Yes — plan now, suffer less later", ideology: "idealist", payout: { trust: 2, funds: 1 } },
      { label: "No — build a wall and sell the views", ideology: "capitalist", payout: { funds: 2, media: 1 } }
    ]
  },
  {
    id: "d037",
    question: "A rival party's office is raided on thin evidence. Do you publicly cheer the crackdown?",
    answers: [
      { label: "Yes — let enemies feel the law's weight", ideology: "supremo", payout: { clout: 2, media: 1 } },
      { label: "No — demand due process for all", ideology: "idealist", payout: { trust: 3 } }
    ]
  },
  {
    id: "d038",
    question: "A billionaire will erase a hospital's debts for naming rights. Do you accept?",
    answers: [
      { label: "Yes — a name is cheap, care is dear", ideology: "capitalist", payout: { funds: 2, trust: 1 } },
      { label: "No — public health isn't a billboard", ideology: "idealist", payout: { trust: 2, clout: 1 } }
    ]
  },
  {
    id: "d039",
    question: "A heatwave kills the elderly in unpowered homes. Do you nationalize the power grid?",
    answers: [
      { label: "Yes — lifelines belong to the people", ideology: "idealist", payout: { trust: 2, clout: 1 } },
      { label: "No — competition lowers prices", ideology: "capitalist", payout: { funds: 2, media: 1 } }
    ]
  },
  {
    id: "d040",
    question: "A patriotic blockbuster needs army help to film. Do you lend troops as extras?",
    answers: [
      { label: "Yes — pride sells tickets and votes", ideology: "showman", payout: { media: 2, clout: 1 } },
      { label: "No — soldiers aren't props", ideology: "idealist", payout: { trust: 2, media: 1 } }
    ]
  },
  {
    id: "d041",
    question: "A drought relief fund has a surplus. Do you return it to taxpayers?",
    answers: [
      { label: "Yes — their money, give it back", ideology: "capitalist", payout: { funds: 2, trust: 1 } },
      { label: "No — stockpile for the next disaster", ideology: "supremo", payout: { clout: 2, funds: 1 } }
    ]
  },
  {
    id: "d042",
    question: "A foreign news crew wants to film your slums. Do you let them in?",
    answers: [
      { label: "Yes — honesty earns respect", ideology: "idealist", payout: { trust: 2, media: 1 } },
      { label: "No — guard the nation's image", ideology: "supremo", payout: { clout: 2, media: 1 } }
    ]
  },
  {
    id: "d043",
    question: "A crypto exchange offers to pay civil servants instantly — for a cut. Do you adopt it?",
    answers: [
      { label: "Yes — modern money, modern state", ideology: "capitalist", payout: { funds: 2, media: 1 } },
      { label: "No — keep wages in the people's bank", ideology: "idealist", payout: { trust: 2, clout: 1 } }
    ]
  },
  {
    id: "d044",
    question: "A riot is brewing over a hate sermon. Do you arrest the preacher pre-emptively?",
    answers: [
      { label: "Yes — silence the spark", ideology: "supremo", payout: { clout: 2, trust: 1 } },
      { label: "No — answer speech with speech", ideology: "idealist", payout: { trust: 2, media: 1 } }
    ]
  },
  {
    id: "d045",
    question: "A reality show wants you as a guest judge a week before the vote. Do you appear?",
    answers: [
      { label: "Yes — meet voters where they watch", ideology: "showman", payout: { media: 3 } },
      { label: "No — the office demands dignity", ideology: "supremo", payout: { clout: 2, media: 1 } }
    ]
  },
  {
    id: "d046",
    question: "A mine collapse traps workers; a rescue risks more lives. Do you order the costly dig?",
    answers: [
      { label: "Yes — no one is left behind", ideology: "idealist", payout: { trust: 3 } },
      { label: "No — broadcast the vigil instead", ideology: "showman", payout: { media: 2, trust: 1 } }
    ]
  },
  {
    id: "d047",
    question: "A sin tax on sugar would fund clinics but anger the poor. Do you levy it?",
    answers: [
      { label: "Yes — health pays for itself", ideology: "idealist", payout: { trust: 2, funds: 1 } },
      { label: "No — don't tax the workingman's treat", ideology: "showman", payout: { media: 2, clout: 1 } }
    ]
  },
  {
    id: "d048",
    question: "A rival region demands more autonomy. Do you grant it self-rule?",
    answers: [
      { label: "Yes — let them govern themselves", ideology: "idealist", payout: { trust: 2, clout: 1 } },
      { label: "No — the center must hold", ideology: "supremo", payout: { clout: 3 } }
    ]
  },
  {
    id: "d049",
    question: "A defense contract could be awarded to a loyal donor or a cheaper rival. Who wins?",
    answers: [
      { label: "The cheaper bid — taxpayers first", ideology: "capitalist", payout: { funds: 2, trust: 1 } },
      { label: "The loyal donor — reward your friends", ideology: "supremo", payout: { clout: 2, funds: 1 } }
    ]
  },
  {
    id: "d050",
    question: "A heatproof seed is patented abroad. Do you break the patent to feed your people?",
    answers: [
      { label: "Yes — survival trumps property", ideology: "idealist", payout: { trust: 2, clout: 1 } },
      { label: "No — pay and keep trade trust", ideology: "capitalist", payout: { funds: 2, media: 1 } }
    ]
  },
  {
    id: "d051",
    question: "A blackout hits during your big speech. Do you blame saboteurs on every channel?",
    answers: [
      { label: "Yes — turn a fault into a villain", ideology: "showman", payout: { media: 2, clout: 1 } },
      { label: "No — admit the grid is old and fix it", ideology: "idealist", payout: { trust: 2, funds: 1 } }
    ]
  },
  {
    id: "d052",
    question: "A wealthy diaspora will invest if you grant them voting rights. Do you?",
    answers: [
      { label: "Yes — capital and kin return", ideology: "capitalist", payout: { funds: 2, clout: 1 } },
      { label: "No — votes are for those who live here", ideology: "supremo", payout: { clout: 2, trust: 1 } }
    ]
  },
  {
    id: "d053",
    question: "A free press council wants independence from your office. Do you grant it?",
    answers: [
      { label: "Yes — a watchdog needs no leash", ideology: "idealist", payout: { trust: 3 } },
      { label: "No — keep the message disciplined", ideology: "showman", payout: { media: 2, clout: 1 } }
    ]
  },
  {
    id: "d054",
    question: "A toll road would pay for itself but burden commuters. Do you build it privately?",
    answers: [
      { label: "Yes — users pay, budgets breathe", ideology: "capitalist", payout: { funds: 3 } },
      { label: "No — roads are a common right", ideology: "idealist", payout: { trust: 2, clout: 1 } }
    ]
  },
  {
    id: "d055",
    question: "A loud minority demands a statue of a divisive hero. Do you erect it?",
    answers: [
      { label: "Yes — honor our forefathers boldly", ideology: "supremo", payout: { clout: 2, media: 1 } },
      { label: "No — heal, don't reopen old wounds", ideology: "idealist", payout: { trust: 2, clout: 1 } }
    ]
  },
  {
    id: "d056",
    question: "A meme of you dancing goes viral. Do you lean in and post a sequel?",
    answers: [
      { label: "Yes — be the joke and own it", ideology: "showman", payout: { media: 3 } },
      { label: "No — protect a serious image", ideology: "supremo", payout: { clout: 2, media: 1 } }
    ]
  },
  {
    id: "d057",
    question: "A green levy on factories would cut smog but raise prices. Do you impose it?",
    answers: [
      { label: "Yes — our children breathe this air", ideology: "idealist", payout: { trust: 2, media: 1 } },
      { label: "No — keep industry competitive", ideology: "capitalist", payout: { funds: 2, clout: 1 } }
    ]
  },
  {
    id: "d058",
    question: "A spy ring is uncovered in a rival's camp. Do you parade the arrests on live TV?",
    answers: [
      { label: "Yes — make an example of traitors", ideology: "showman", payout: { media: 2, clout: 1 } },
      { label: "No — try them quietly and fairly", ideology: "idealist", payout: { trust: 2, clout: 1 } }
    ]
  },
  {
    id: "d059",
    question: "A sovereign fund could chase high returns abroad or seed local startups. Which?",
    answers: [
      { label: "Chase returns — grow the nest egg", ideology: "capitalist", payout: { funds: 3 } },
      { label: "Seed at home — jobs over yield", ideology: "supremo", payout: { clout: 2, funds: 1 } }
    ]
  },
  {
    id: "d060",
    question: "A landmark trial could be opened to cameras. Do you televise justice?",
    answers: [
      { label: "Yes — let the people watch the law", ideology: "showman", payout: { media: 2, trust: 1 } },
      { label: "No — courts aren't theaters", ideology: "idealist", payout: { trust: 2, clout: 1 } }
    ]
  }
];

export const DILEMMA_BY_ID = Object.fromEntries(DILEMMAS.map((d) => [d.id, d]));
