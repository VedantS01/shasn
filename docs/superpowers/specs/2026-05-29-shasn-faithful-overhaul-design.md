# SHASN — Faithful Overhaul (Design Spec)

**Date:** 2026-05-29
**Status:** Approved design, pre-implementation
**Supersedes:** `2026-05-25-shasn-game-design.md` (initial pass)

A near-complete rewrite of the pass-and-play SHASN adaptation to honor the official
rulebook (Memesys Culture Lab) end-to-end: the printed board's geometry and capacities,
the every-turn gerrymander, the 2-level + passive Ideologue powers, the Vote Bank
deck, coalitions, resource trading, the 12-resource cap, volatile permanence,
end-of-turn headlines, and a real in-app rulebook. All copy and card content stays
original — no rulebook text is reproduced.

---

## 1. Why a second spec

The original spec (`2026-05-25-…`) explicitly chose a fictional 9-zone ring map,
a one-shot gerrymander on lock, a 3-tier (2/3/5) power suite, and a fixed
voter shop — calling out each as a deliberate simplification. After re-reading
the rulebook, those choices are the largest sources of "doesn't feel like SHASN"
and the most worth correcting. This spec replaces those decisions and folds in
the missing mechanics (coalitions, trading, cap, end-of-turn headlines, deck-based
market, scoring by flipped voters, volatile immunity).

The architecture (pure engine + thin UI projection, ES-module no-build, GitHub
Pages) and the pass-and-play privacy model stay.

---

## 2. Map

**9 zones in a hex-tiled hexagonal country**, rendered as hand-tuned irregular
SVG `<path>` polygons (book-true silhouettes, not regular hexes).

| Zone     | Capacity | Majority | Neighbors                                 |
|----------|---------:|---------:|-------------------------------------------|
| Central  |        9 |        5 | N, S, E, W, NE, NW, SE, SW (touches all 8) |
| North    |       21 |       11 | NW, NE, Central                            |
| South    |       21 |       11 | SW, SE, Central                            |
| East     |       17 |        9 | NE, SE, Central                            |
| West     |       17 |        9 | NW, SW, Central                            |
| NE       |       11 |        6 | N, E, Central                              |
| NW       |       11 |        6 | N, W, Central                              |
| SE       |       11 |        6 | S, E, Central                              |
| SW       |       11 |        6 | S, W, Central                              |

Total board capacity = 129 seats.

**Volatile seat distribution** (one per cluster in bigger zones, ~one per side
in smaller zones, scaled with capacity):

| Zone    | Volatile | Approx layout                       |
|---------|---------:|-------------------------------------|
| Central |        2 | two opposing seats inside the hex   |
| N, S    |        4 | one per quadrant                    |
| E, W    |        3 | one near each border with neighbor  |
| each corner (NE/NW/SE/SW) | 2 | one each near the two cardinals it touches |

**Total = 24 volatile seats.** Specific seat indices (which of the
`capacity` slots are volatile) are pinned in `src/data/map.js`.

**Rendering:** the polygon is the zone region; seat circles are placed inside it
on hand-picked coordinates. Each seat circle is independently clickable in
placement mode. Volatile seats use dashed strokes + a ⚡ glyph. The
`zone-name + majority/capacity` label sits outside or above the polygon, with
the colored vote-count pips beneath it (carrying over from current build).

---

## 3. Voting, majority, scoring

### 3.1 Placement

A Vote Bank Card (§6) buys 1/2/3 voters. **All voters from a single VBC must
go into the same zone** (rulebook). `placeToken` enforces same-zone for the
current `toPlace` batch; the first placement records the zone, subsequent
placements are restricted to that zone's empty seats (volatile seats are
allowed targets; landing on one queues a headline at end of turn).

**No adjacency / reachability restriction.** The rulebook places voters "in any
zone" — there is no requirement to start near existing presence or expand from
held territory. The current build's adjacency rule was a Spec v1 invention and
is removed. Any unlocked, non-coalition zone with empty seats is a valid
destination for any buy.

### 3.2 Volatile permanence

A voter sitting on a volatile seat is **immune to every move/remove/convert
action** (gerrymander, Targeted Marketing convert, Civil Disobedience discard,
Land Grab evict, Sway, conspiracy removePeg, etc.). Engine-level: each action
that touches a seat first checks `isVolatileSeat(zone, seatIndex)` and rejects.

### 3.3 Majority & flipping

When a player's voters in a zone first reach the majority threshold, the engine
**flips exactly `threshold` of their seats S-side up** in that zone — these are
the scoring voters. Earliest-placed seats flip first (deterministic). Any
additional voters that player places in the zone afterwards stay flat (no
re-flip). The zone is locked to that player.

### 3.4 Score

A player's score is the **total number of S-side seats they own across all
zones**. Solo majorities: all `threshold` flips count for the lone holder.
Coalition majorities (§11): the agreed split distributes the flips. Non-S
voters do not contribute to score. Standings sort by score; tie-break by total
seats owned on the board (a deterministic house-rule fallback, surfaced in the
Rules modal).

---

## 4. Gerrymandering

The rulebook's strategic engine, completely replacing today's one-shot move.

- **Source of power:** every solo majority you hold grants you 1 gerrymander
  move per turn (Idealist L6 "Mass Mobilisation" doubles to 2 per majority).
  Coalition majorities **do not** grant the power.
- **Per-turn budget** lives in `state.turn.gerrymanderMoves: { [zoneId]: n }`,
  recomputed at `beginTurn` from current majorities. Unused moves expire at
  end of turn.
- **A move:** pick a non-majority, non-volatile voter (yours or any opponent's)
  on a seat in the **majority zone or any of its neighbors**, and move it to an
  empty seat in another such zone *that shares a border with the source*. The
  destination seat may be volatile — landing there queues a headline at end of
  turn on the gerrymandered voter's owner (the rulebook is silent here; this is
  intentional, matching the designer's note that volatile placement is a
  weapon).
- **Constraints:** source must not be S-side (majority voters immune unless
  overridden by a specific power); source must not be on a volatile seat;
  destination must be an empty seat (volatile allowed); source and destination
  must share a border (each is the majority zone or one of its neighbors).

UI: a **Gerrymander** panel listing each majority you hold and the number of
moves remaining for it. Clicking "Move from [Zone]" enters source-pick mode on
the map — eligible voters glow. After a source click, eligible empty
destinations glow (with a "⚡ will fire a headline" inline note on volatile
destinations). A click commits the move and decrements the budget.

---

## 5. Ideologue powers (2-level + universal passive)

Replaces the current 3-tier power list. Each ideology has:

- **Passive (always on):** for every **2 Ideology Cards of that ideology**, +1
  resource of that type granted at the start of your turn. 2 cards → +1, 4 → +2,
  6 → +3. Stacks across all 4 ideologies.
- **Level 4:** unlocks when the pile reaches 4 cards.
- **Level 6:** unlocks when the pile reaches 6 cards.

Powers stay unlocked as long as the pile size stays at the threshold (Coalitions
can drop a pile via the mandatory card swap; the L4/L6 lock relaxes if the pile
falls under threshold).

| Ideology      | Level 4                                        | Level 6 |
|---------------|------------------------------------------------|---------|
| **Capitalist** | **Open Market** — once/turn, return 1 resource to the Public Reserve and take any 2 of your choice. | **Land Grab** — once/turn, evict up to 2 non-volatile voters off the board (incl. majority voters). Evicted opponent voters go to that opponent's `pendingPlacements` queue and must be re-placed on their next turn (or are discarded at the end of that turn). Own evictions can be re-placed anywhere immediately as part of the same action. |
| **Showman**    | **Echo Chamber** — +1 bonus voter on each Vote Bank Card you influence, max 3 *unique* VBCs per turn. | **Targeted Marketing** — once/turn, pay 2 Media + any 3 resources to convert 2 of one opponent's voters in one zone into yours (incl. majority voters; not volatile). The 2 converted voters must belong to the same opponent in the same zone. |
| **Supremo**    | **Donations** — once/turn, snatch up to 2 resources from other players (2 from one or 1+1 from two). No consent required. | **Civil Disobedience** — each turn, pay 1 resource per voter to discard up to 2 opponent voters (incl. majority; not volatile). |
| **Idealist**   | **Blind Faith** — each VBC has a *marked* resource; you may waive the marked resource on up to 3 VBCs per turn. | **Mass Mobilisation** — every solo majority you hold yields 2 gerrymander moves per turn instead of 1. |

State additions: `players[i].pendingPlacements: number` (Land Grab queue size);
per-turn keys on `usedThisTurn` for each L4/L6 invocation.

Conversion / discard / evict / gerrymander all funnel through the **volatile
immunity** check (§3.2). Targets that are flipped (S-side) majority voters are
**explicitly allowed** by Land Grab, Targeted Marketing, and Civil Disobedience
(the powers say "including majority voters") — removing one un-flips the zone if
the holder drops below threshold, and the zone unlocks; flipped seats revert to
flat for the un-locked owner.

---

## 6. Vote Bank market (deck of 60, 3 always open)

Replaces the fixed 3-offer shop with a real card market.

**Card shape:** `{ id, value: 1|2|3, cost: { funds?, clout?, media?, trust? }, markedResource: "funds"|"clout"|"media"|"trust" }`. The marked resource is one of the cost slots (for Idealist L4 Blind Faith).

**Authoring split (60 cards):**

- ~20 cards of value 1, total cost 1–2 resources, single-resource or 2-mix.
- ~25 cards of value 2, total cost 3–4 resources, 2–3-resource mix.
- ~15 cards of value 3, total cost 5–6 resources, 3-resource mix.

All original content. Combos vary so no two cards share an exact cost; the marked
resource is randomized (engine-deterministic per card id).

**HQ Mat = 3 open slots.** State: `state.market = { deck: cardId[], open: [c, c, c], discard: cardId[] }`. On `buyVoteBank({openIndex})`, the open card at that index is paid (with Echo Chamber bonus and Blind Faith discount applied as configured), moved to `discard`, and replaced from the top of `deck`. When `deck` empties, `discard` is reshuffled into a new `deck` deterministically (seeded RNG).

UI: a **Vote Bank** panel showing the 3 open cards side-by-side. Each card displays cost icons (the marked one outlined), a `+1` overlay if Echo Chamber would fire on this card id, a value badge, and a **Buy** button (disabled if unaffordable, currently placing/discarding/etc.). Echo Chamber's 3-unique-card cap only suppresses the bonus on a new card after the cap is met; it never disables Buy. Blind Faith is a separate optional toggle per VBC at buy time when the marked resource is part of the cost — the engine subtracts the marked cost when used and increments the per-turn Blind Faith counter (cap 3).

---

## 7. Resource cap (12)

Per-player cap of 12 total resources. At the **start of each turn**, after the
dilemma payout, passive resource grant, and any pending Land Grab discard, the
engine checks `sum(player.resources) ≤ 12`. If not, the turn pauses in a
`phase: "discard"` state and shows a **Discard modal**: the player picks which
resources to drop until total ≤ 12, then confirms. No other actions are
available until the discard resolves.

---

## 8. Trading (1-for-1, unlimited per turn)

On the active player's turn, they can propose **equitable** swaps with one other
player: resources 1-for-1 and/or conspiracy cards 1-for-1, in any quantity, as
long as the count on both sides matches. Unlimited proposals per turn (but only
one in flight at a time).

**Pass-and-play flow** (canonical negotiation primitive, also reused by Coalitions):

1. Active player opens **Trade** modal → picks partner → drafts offer (give X resources/cards, receive Y resources/cards; engine enforces equal count).
2. Tap **"Propose to [Partner]"** → state advances to `phase: "tradeAccept"` with `pendingProposal` populated → privacy curtain "Pass to [Partner]".
3. Partner reveals → sees the proposal → **Accept** / **Decline**.
4. On Accept: resources and cards swap, `pendingProposal` clears, curtain returns to active player.
5. On Decline: no change, curtain returns to active player.

State: `state.turn.pendingProposal: { kind: "trade", from: pid, to: pid, give: {...}, receive: {...} } | null`.

---

## 9. Headlines (end-of-turn queue, 20-card deck)

Headlines no longer resolve at the instant of placement. Volatile placement still
seats the voter normally, but the engine pushes
`{ zoneId, playerId }` onto `state.turn.pendingHeadlines[]`.

`endTurn` then runs three stages before handoff:

1. **Headlines drain.** For each queued entry (in placement order), draw one
   card from `state.decks.headlineDraw`, resolve its effect on the named
   player, push to `headlineDiscard`. If `headlineDraw` is empty, the engine
   reshuffles `headlineDiscard` into a new `headlineDraw` deterministically
   before drawing. UI: a **Headline sequence** modal walks through one card at
   a time with **Continue**.
2. **Between turns.** §10 conspiracy interrupt prompt.
3. **`beginTurn`** for the next player.

Author count expands from 12 → **20** original headlines so the deck size matches
the rulebook.

---

## 10. Coalitions

The marquee missing feature. Two players jointly form a majority in a zone and
**trade an Ideology Card each** from their most-held pile.

### 10.1 State

Each zone gains:
```
coalition: { partners: [pid, pid], split: { [pid]: n, [pid]: n } } | null
```
A zone is **locked** if `lockedBy != null` (solo) **or** `coalition != null`
(joint). The two states are mutually exclusive.

### 10.2 Eligibility to propose

The active player can propose a coalition in a zone where:

- the zone is not locked (no `lockedBy`, no existing `coalition`);
- they hold ≥ 1 voter there;
- a target opponent holds ≥ 1 voter there;
- their **combined non-volatile** voter counts ≥ `threshold`;
- the proposing player alone does **not** already meet threshold (no
  unnecessary coalitions).

### 10.3 Proposal flow

1. Active player opens **Coalition** panel → picks zone → picks partner →
   adjusts the **split** (two numbers summing to ≥ threshold, each ≤ the
   respective player's non-volatile voter count in that zone) → picks **which
   of their own Ideology Cards** to offer (engine enforces: must be from the
   most-held ideology pile; ties broken by player's pick).
2. Tap **"Propose to [Partner]"** → `phase: "coalitionAccept"`, `pendingProposal`
   set, privacy curtain to partner.
3. Partner reveals → sees the proposal → picks **their own** Ideology Card to
   give (same most-held constraint) → **Accept** / **Decline**.
4. On Accept:
   - For each player, mark `split[pid]` of their existing voters in the zone
     S-side up (earliest-placed first), counting toward score.
   - The two Ideology Cards swap (each is added to the receiving player's
     corresponding pile).
   - `zone.coalition` is set; `zone.lockedBy` remains null.
   - Zone is closed to further placement.
   - Zone yields **no gerrymander** to either player.
5. On Decline: no change; curtain returns to active player.

### 10.4 Withdrawal

At any time on their own turn, a coalition member can **withdraw**:

- `zone.coalition` clears.
- The withdrawer's flipped voters in that zone revert to flat (their score
  loses those points).
- The remaining partner's flipped voters stay flipped (their score is preserved).
- Traded Ideology Cards **stay** with their new owners (rulebook: "The Ideology
  Cards that were swapped will not be returned").
- If the remaining partner alone meets threshold from their own voters in the
  zone (volatile-seat voters count toward majority just like any other), the
  zone immediately re-locks solo to them, with their flipped count topped up
  to exactly `threshold` (earliest-placed seats flip first).
- Otherwise the zone is unlocked and contestable again.

---

## 11. Conspiracy cards & interrupt timing

### 11.1 Buying

Each Conspiracy Card has a **fixed cost printed on its back: 4 or 5** resources
(any combination). The Conspiracy deck is a single shuffled pile; the cost on
the back of the top card is visible to all players. A player on their own turn
may buy the top card by paying that exact cost (any resource mix totalling the
cost), at which point the card flips into their secret hand. There is no
variable spend; the previous build's `buyConspiracy({ spend })` action becomes
`buyConspiracy()` with cost taken from the top card. There is no minimum-spend
discount — the Showstopper T2 / `min: 3` mechanic is gone (it never existed in
the rulebook).

When the deck empties, the discard is reshuffled into a new deck deterministically.

### 11.2 Playing — timing

The current "interrupt anywhere" model is loosened to match the rulebook.

- **Most cards:** playable only on the holder's own turn.
- **Between turns:** after the active player's `endTurn` finishes (headlines
  drained), the engine enters `phase: "betweenTurns"` and walks through each
  non-active player in turn order, presenting a privacy curtain that lets them
  optionally play one or more conspiracies, then pass. Once all non-active
  players have passed, the next `beginTurn` runs.
- **Block! / Reverse!** (two specific card families) keep their `canInterrupt`
  flag and may be played by a non-active player mid-turn, targeting the action
  they want to block or reverse. The engine exposes an "Interrupt!" handoff
  curtain for these.

State: `state.turn.betweenTurnsAt: number | null` (index into the non-active
rotation).

---

## 12. Setup & player count

- **Player count cap = 4** (drop the 5-player setup row).
- Keep the **starting-resource draft** (Player *i* gets *i* resources) — already
  rulebook-faithful.
- Add a **"Shuffle seat order"** button on the setup screen. The rulebook's
  vote-for-Player-1 ceremony is replaced by a single tap that randomizes the
  order, honoring the *intent* (don't always start with the first-named player)
  without a 4-curtain voting dance.

---

## 13. Dilemma reading (previous player reads aloud)

Faithful touch from the rulebook: the **previous player** draws and reads each
Ideology Card to the current player, hiding the resources from them until they
commit.

`beginTurn` becomes a 5-stage sequence:

1. **`readAloud`** — privacy curtain "Pass to [previous player] — read this aloud
   to [current player]." Previous player reveals → sees the question + the two
   answer labels (no resources, no ideology accents — same neutral styling we
   already enforce). A **"Read aloud"** button triggers the existing Web Speech
   narration. They tap **Done**, surfacing a curtain "Pass to [current player]".
2. **`dilemma`** — current player answers.
3. **`discard`** — if over the cap-12, the discard modal blocks until trimmed.
4. **`placePending`** — if `pendingPlacements > 0` from a previous Land Grab
   eviction, the player must place all evicted voters in any zone(s) before
   continuing; any not placed by end of turn are discarded.
5. **`actions`** — normal play.

For the very first turn (no previous player exists), `readAloud` is skipped —
the active player reads it themselves (still with hidden resources, same
narration).

---

## 14. Rules UI

Today's in-app rules content is one sentence on setup. We replace it with a real
in-app rulebook plus contextual hints.

### 14.1 Rules modal

Opened from the **settings gear → Rules** entry and from a prominent **"How to
play"** CTA on the setup screen. Left-nav sectioned exactly to the rulebook's
chapters:

Overview · Turn order · Resources & cap · Vote Bank · Majorities · Gerrymandering
· Volatile zones · Headlines · Conspiracies · Coalitions · Ideologue powers ·
Scoring & end game.

Each section is ~150 words of original prose plus, where one helps, a small
inline SVG diagram: a sample zone illustrating a majority flip; a 3-panel
gerrymander illustration (into majority / into adjoining / between adjoinings);
a coalition split; a Vote Bank Card showing a marked resource.

### 14.2 Contextual hints

- Every panel header on the turn screen gets a small **ⓘ** glyph that opens the
  Rules modal scrolled to that section.
- Hover/long-press tooltips on key terms: "Volatile (immune)", "Marked
  resource", "Flipped majority voter (1 pt)", "Coalition zone (no gerry)",
  "Land Grab (re-place next turn)".
- A **per-turn hint banner** above the action panels shows one short
  context-aware sentence: *"Place 2 voters — same zone, your choice of
  circles"*, *"2 Headlines pending — resolve before ending turn"*, *"Coalition
  pending: pass to Bman"*, etc.

### 14.3 Content

All Rules-modal copy is original — section-keyed prose lives in
`src/data/rules.js` for editability.

---

## 15. Architecture

### 15.1 State shape additions

```
state.zones[i]:
  + coalition: { partners: [pid, pid], split: { [pid]: n } } | null
  + flippedSeats: boolean[]           // parallel to seats[]
  + volatileSeats: number[]           // immutable: indices that are volatile

state.players[i]:
  + pendingPlacements: number         // Land Grab queue
  + usedThisTurn: { ...existing, openMarket?, landGrab?, targetedMarketing?, donations?, civilDisobedience?, blindFaithUses: number, echoChamberCardIds: cardId[] }

state.turn:
  + pendingHeadlines: { zoneId, playerId }[]
  + pendingProposal: { kind: "trade"|"coalition", from, to, ... } | null
  + betweenTurnsAt: number | null
  + gerrymanderMoves: { [zoneId]: number }
  + phase: ... | "readAloud" | "discard" | "placePending" | "headlines" | "betweenTurns"
           | "tradeAccept" | "coalitionAccept" | "interrupt"
  + currentBuy: { offerId: cardId, zoneId: string | null }  // same-zone enforcement

state:
  + market: { deck: cardId[], open: [cardId, cardId, cardId], discard: cardId[] }
```

### 15.2 New / changed actions

`gerrymander({ majorityZoneId, fromZoneId, fromSeatIndex, toZoneId, toSeatIndex })`,
`discardResources({ counts })`,
`buyVoteBank({ openIndex })` (replaces `buyVoter`),
`placeToken({ zoneId, seatIndex })` (now enforces same-zone for the in-flight buy),
`proposeTrade({ to, give: { resources?, cardIds? }, receive: { resources?, cardIds? } })`,
`respondTrade({ accept })`,
`proposeCoalition({ to, zoneId, split, myCardId })`,
`respondCoalition({ accept, partnerCardId })`,
`withdrawCoalition({ zoneId })`,
`openMarket({ give, take })`,
`landGrab({ targets: [{ zoneId, seatIndex }], replaceOwn: [{ zoneId, seatIndex }] })` — single action: evict up to 2 voters; if any of the targets belong to the Capitalist, they may be re-placed in the same call via `replaceOwn`. Opponent-owned evictions increment that opponent's `pendingPlacements` to be cleared in the `placePending` stage of their next `beginTurn`,
`targetedMarketing({ zoneId, opponentId, seatIndices: [a, b] })`,
`donations({ takes: [{ from, resource, count }] })`,
`civilDisobedience({ targets: [{ zoneId, seatIndex }] })`,
`interruptConspiracy({ cardId, target })`,
`shuffleSeatOrder()` (setup-only),
plus a multi-stage `beginTurn` that flows `readAloud → dilemma → (discard if needed) → actions`
and an `endTurn` that flows `headlines → betweenTurns → next beginTurn`.

Existing actions that change semantics: `buyConspiracy` (no `Showstopper t2` discount; tiers gone), `gerrymander` (replaced entirely), `usePower` (replaced by the eight specific power actions), `occupyVolatile` (folded into `placeToken` — there is no separate volatile-only action; volatile seats are just placeable seats that queue a headline).

### 15.3 New data files

- `src/data/voteBank.js` — 60 cards (`id, value, cost, markedResource`).
- `src/data/rules.js` — section-keyed copy + diagram refs for the Rules modal.
- `src/data/map.js` — rewritten: 9 polygon `<path>` strings, capacities, neighbor lists, per-zone `volatileSeats: number[]`, per-zone seat coordinate arrays.

### 15.4 New / changed UI

`RulesModal`, `VoteBankPanel` (replaces `marketPanel`), `GerrymanderPanel` (lists each majority + remaining moves; map enters source-pick → dest-pick), `TradeProposalModal` / `TradeAcceptModal`, `CoalitionProposalModal` / `CoalitionAcceptModal`, `BetweenTurnsCurtain`, `HeadlineSequence`, `DiscardModal`, `LandGrabPicker`, `CivilDisobediencePicker`, plus polygon-based `map.js`. The masthead's settings menu gains a **Rules** entry.

---

## 16. End game

Replaces today's "all zones locked" condition with the rulebook's two-clause
end:

- **Standard end:** every zone is locked (solo or coalition).
- **End-game clause:** every seat on the board is filled, even if some zones
  remain unlocked. The player who placed the final voter starts the **final
  round**, in which each other player (in rotation) gets **one more turn** to
  form/collapse coalitions, play conspiracies, trade, and use powers (no new
  placement, since the board is full). Headlines from the final round still
  resolve at end of each of those turns.
- **Buy spillover:** during the end game, if there aren't enough empty seats
  in any one zone to accept all voters from a freshly bought VBC, the *excess*
  voters from that buy are discarded. The engine refuses the buy entirely if
  *no* zone has any empty seats.

State: a `state.endGame: { active: bool, finalRoundStartedBy: pid | null,
turnsRemaining: number } | null` slot is set when either clause fires; once
`turnsRemaining` hits 0 we score and surface the winner.

Winner: highest **score** (sum of S-flipped seats). Tie → highest total seats
owned on the board (per §3.4); persistent tie → declared draw in the standings.

---

## 17. Delivery plan (one PR, internal phases)

Each phase ends green-tests before the next begins.

1. **Data & state shape** — polygon map, 60 Vote Bank cards, 20 headlines, new state fields.
2. **Core engine** — `gerrymander` (every-turn neighbor-of-majority), `discardResources`, `buyVoteBank`, headline queue, scoring by flipped voters.
3. **Powers** — rewrite `archetypes.js` to 2-level + passive; the 8 specific powers.
4. **Coalitions & trading** — propose/respond/withdraw flows; ideology-card swap validation.
5. **Conspiracy timing** — between-turns phase + Block/Reverse mid-turn carve-out.
6. **UI rewrite** — polygon map, Rules modal + tooltips, all new panels, hint banner.
7. **Rules content** — write every section + tooltip copy.
8. **E2E verification** — Playwright drive of a 2-player and a 4-player game touching every new path; deploy; smoke against live.

---

## 18. Testing

Engine unit tests grow from 75 → ~140. New coverage:

- **Gerrymander legality:** source non-majority, non-volatile, in majority zone or its neighbor; destination empty, shares a border with source. Volatile destinations are allowed and queue a headline. Mass Mobilisation doubles the per-turn budget.
- **Scoring by flipped voters:** flipping exactly `threshold` seats on lock; no re-flip on later additions; total = sum of flipped seats per player; coalition splits distribute flips correctly.
- **Coalition lifecycle:** propose / accept / decline; ideology-card swap from most-held pile (with tie pick); withdrawal reverts withdrawer's flips and re-locks solo if remaining partner meets threshold.
- **Resource cap:** `discardResources` blocks actions while over 12.
- **Vote Bank deck:** 3 always open; buy replaces from draw; reshuffle when empty; Echo Chamber bonus is per *unique* card id, capped at 3; Blind Faith waives the marked slot up to 3 cards.
- **Volatile immunity:** every effect that moves/removes/converts a voter rejects volatile-seat targets.
- **Headline queue:** placement queues, `endTurn` drains in order, fires before handoff.
- **Powers:** each of 8 powers — cost, restriction, effect.
- **Conspiracy timing:** non-interrupt cards rejected mid-opponent-turn; between-turns prompt iterates each non-active player; Block/Reverse may interrupt.

UI smoke: every new modal/panel renders without throwing under the DOM shim.

End-to-end Playwright run: a scripted full 2-player game using a seeded state, exercising buy → place same-zone → gerrymander → coalition → headline → between-turns interrupt, with screenshots at each milestone. A second 4-player game tests the rotation of read-aloud, between-turns, and donations.

---

## 19. Resolved open questions

- **Player count.** 2–4 (drop 5).
- **Map style.** Irregular polygons (book-true silhouettes), §2.
- **Vote-for-Player-1.** Replaced by a "Shuffle seat order" button at setup, §12.
- **Tie-break on score.** Total seats owned on the board (deterministic fallback), §3.4 — surfaced in the Rules modal.
- **Gerrymander destination on a volatile seat.** Allowed; queues a headline at end of turn on the moved voter's owner, §4.
- **Powers when a pile drops below threshold.** L4 / L6 lock relaxes when the pile falls under the required count (Coalition swaps can move you below 4 or 6).

---

## 20. Out of scope

- Online multiplayer / networking.
- AI opponents.
- Scenario/legacy/hidden-objective/incumbent modes (extras in the physical box).
- Reproducing rulebook text, card text, or printed art.
- Build tooling / bundlers.
