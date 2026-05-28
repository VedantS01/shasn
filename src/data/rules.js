// In-app rulebook content. Each section is original prose written in SHASN's
// spirit; no rulebook text is reproduced.
export const RULES_SECTIONS = [
  {
    id: "overview", title: "Overview",
    body: `Each player is a politician running a campaign across nine constituencies. Answer dilemmas to earn resources and build ideologies; spend resources to influence voters and form majorities; gerrymander, coalition, and conspire to swing the board. Most flipped majority voters at the end wins.`
  },
  {
    id: "turn", title: "Turn order",
    body: `Turns rotate clockwise. The previous player draws and reads each Ideology Card aloud, hiding the resource payouts until the active player commits to an answer. Then the active player resolves passive resources, trims to the 12 cap, places any pending evictions, and acts freely until they end their turn.`
  },
  {
    id: "resources", title: "Resources & cap",
    body: `Resources are Funds, Clout, Media, Trust. The cap is 12 total. Any excess must be discarded at the start of your turn before you can act. Players trade resources 1-for-1 (and conspiracy cards 1-for-1), unlimited per turn, only on the proposer's turn.`
  },
  {
    id: "voteBank", title: "Vote Bank",
    body: `Three Vote Bank Cards sit face-up on the HQ Mat. Each costs a mix of resources and grants 1, 2, or 3 voters. All voters from one card must go in a single zone. After a buy, the next card from the deck replaces it. When the deck runs out, the discard reshuffles.`
  },
  {
    id: "majorities", title: "Majorities",
    body: `Each zone shows majority/capacity (e.g. 6/11). When you reach the threshold in a zone, the engine flips exactly "majority" of your voters S-side up. Each flipped voter is 1 point. Extra voters you add later in the same zone never flip — they don't score.`
  },
  {
    id: "gerrymander", title: "Gerrymandering",
    body: `Every solo majority you hold grants you 1 gerrymander move per turn (2 with Mass Mobilisation). A move picks a non-majority, non-volatile voter (yours or any opponent's) in the majority zone or one of its neighbors, and slides it to an empty seat in another such zone that shares a border with the source.`
  },
  {
    id: "volatile", title: "Volatile zones",
    body: `Volatile seats are marked with ⚡. A voter on a volatile seat is permanent: it cannot be moved, removed, converted, or discarded by any power, conspiracy, or gerrymander. Landing a voter (by any means) on a volatile seat queues a Headline that fires at the end of the turn on the voter's owner.`
  },
  {
    id: "headlines", title: "Headlines",
    body: `When a voter lands on a volatile seat, a Headline is queued. At the end of your turn, queued Headlines resolve in placement order on the players they apply to. Most Headlines are negative — putting an opponent on a volatile seat is a viable strategy.`
  },
  {
    id: "conspiracies", title: "Conspiracies",
    body: `Conspiracy Cards have a fixed cost printed on the back (4 or 5). On your turn, the top card is visible; you may buy it for that cost from any resource mix. Most cards are played on your own turn; "Block!" and "Reverse!" may be played as interrupts. Other conspiracies may also be played between turns, after one player ends and before the next begins.`
  },
  {
    id: "coalitions", title: "Coalitions",
    body: `Two players may jointly form a majority in a zone if their combined voters meet the threshold and neither alone does. The split is negotiated. Forming a coalition requires both players to trade an Ideology Card from their most-held pile — the ideological cost of compromise. Coalition zones grant no gerrymander, and either partner may withdraw at any time on their own turn. Traded cards are not returned.`
  },
  {
    id: "powers", title: "Ideologue powers",
    body: `Every 2 Ideology Cards of one type give you 1 free resource of that type each turn (passive). At 4 cards in one ideology, you unlock the Level 4 power; at 6, Level 6. Capitalist: Open Market / Land Grab. Supremo: Donations / Civil Disobedience. Showman: Echo Chamber / Targeted Marketing. Idealist: Blind Faith / Mass Mobilisation. Powers stack across ideologies and persist as long as you hold the cards.`
  },
  {
    id: "scoring", title: "Scoring & end game",
    body: `The game ends when every zone is closed (locked or coalition) or every seat on the board is filled. The final round wraps any coalition or conspiracy negotiation; then scores are tallied. Your score is the total number of flipped majority voters you own across the board. Ties are broken by total voters on the board.`
  }
];

export const RULES_BY_ID = Object.fromEntries(RULES_SECTIONS.map((s) => [s.id, s]));
