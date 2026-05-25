// Reference table for UI rendering. Logic is enforced in actions.usePower / passives.
export const POWERS = {
  capitalist: {
    name: "The Capitalist",
    tiers: {
      1: { key: "capitalist:t1", label: "Bankroll", desc: "Once/turn: next voter card costs 1 less (min 1).", active: true },
      2: { key: "capitalist:t2", label: "Liquidate", desc: "Once/turn: convert 3 funds → any 2 resources.", active: true },
      3: { key: "capitalist:t3", label: "Open Market", desc: "Place voters in any zone (ignore adjacency).", active: false }
    }
  },
  supremo: {
    name: "The Supremo",
    tiers: {
      1: { key: "supremo:t1", label: "Strongarm", desc: "+1 gerrymander whenever you lock a majority.", active: false },
      2: { key: "supremo:t2", label: "Intimidate", desc: "Once/turn: remove an opponent's non-majority peg from a zone you're in.", active: true },
      3: { key: "supremo:t3", label: "Iron Grip", desc: "Your majorities can't be flipped by conspiracies.", active: false }
    }
  },
  showstopper: {
    name: "The Showstopper",
    tiers: {
      1: { key: "showstopper:t1", label: "Spin", desc: "Draw 2 dilemmas, keep 1.", active: true },
      2: { key: "showstopper:t2", label: "Cheap Seats", desc: "Conspiracies may be bought for as few as 3 resources.", active: false },
      3: { key: "showstopper:t3", label: "Encore", desc: "Once/game: copy a conspiracy as it's played.", active: true }
    }
  },
  idealist: {
    name: "The Idealist",
    tiers: {
      1: { key: "idealist:t1", label: "Grassroots", desc: "+1 trust at the start of your turn.", active: false },
      2: { key: "idealist:t2", label: "Mandate", desc: "You win ties for zone majority.", active: false },
      3: { key: "idealist:t3", label: "Sway", desc: "Once/turn: turn one neighboring non-majority peg into yours.", active: true }
    }
  }
};
