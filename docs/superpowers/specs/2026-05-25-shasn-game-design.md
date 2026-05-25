# SHASN — Pass-and-Play (Design Spec)

**Date:** 2026-05-25
**Status:** Approved design, pre-implementation

A complete single-device, pass-and-play adaptation of the political strategy game
SHASN for 2–5 players, hosted on GitHub Pages. Faithful **mechanics**, **original**
dilemma/conspiracy content (no copyrighted SHASN card text or art is reproduced),
editorial-newsprint look, and a fictional 9-constituency country map.

---

## 1. Scope

**In scope**
- 2–5 player local hot-seat, one shared device.
- Faithful ruleset: 4 ideologies/resources, dilemma deck with two ideology-tagged
  answers, ideology piles unlocking tiered archetype powers (2/3/5), voter purchase
  and peg placement, zone majorities with gerrymandering, secret conspiracy cards
  with interrupts, end-when-all-zones-locked win condition.
- ~60 original dilemma cards, ~20 conspiracy cards, 9 zones.
- Privacy handoff screens for hidden information.
- localStorage autosave / resume.
- Editorial-newsprint visual theme; fictional country map in SVG.

**Out of scope (YAGNI)**
- Backend / networking / online multiplayer.
- AI opponents.
- Build tooling / bundlers / frameworks.
- Reproducing real SHASN content or art.

---

## 2. Tech & deployment

- Vanilla **HTML / CSS / ES-module JS**, no framework, no build step (consistent
  with the user's `learning-html` project).
- **SVG** for the map and pegs.
- Self-contained git repo at `~/personal/pravar/shasn`, published via **GitHub Pages**
  from the repo root on `main` (user toggles Pages source in repo settings).
- **localStorage** autosave after every action; resume the in-progress game on load.

---

## 3. Game model (faithful ruleset)

### 3.1 Resources / ideologies

| Ideology    | Archetype     | Resource | Accent color |
|-------------|---------------|----------|--------------|
| Capitalist  | The Capitalist| Funds    | gold         |
| Supremo     | The Supremo   | Clout    | red          |
| Showstopper | The Showstopper| Media   | magenta      |
| Idealist    | The Idealist  | Trust    | blue         |

### 3.2 Turn sequence (active player)

1. **Draw a dilemma.** A political question with **two answers**. Each answer is
   tagged to one ideology and pays a small resource mix (dominant in that ideology).
   Exact payouts are hidden until the player commits — you answer by conviction.
   The resolved card is added to the chosen ideology's **pile** for that player.
2. **Spend resources** (any order, repeat while affordable):
   - **Buy voter cards** (worth 1/2/3 votes; higher value costs more / mixed
     resources) and **place pegs** into a zone.
   - **Buy a conspiracy card** (any combination totalling **4–5 resources**) into
     the player's secret hand.
3. **End turn** → privacy handoff to next player.

### 3.3 Ideology piles → archetype powers

Reaching **2 / 3 / 5** cards in a single ideology pile unlocks that archetype's
tiered power. Tiers are cumulative. Proposed powers (final values tuned during
build/balancing):

- **Capitalist (Funds) — economic muscle**
  - T1 (2): Voter cards cost 1 less resource (min 1), once per turn.
  - T2 (3): Once per turn, convert 3 Funds → any 2 resources.
  - T3 (5): Place voters in any zone, ignoring placement adjacency restriction.
- **Supremo (Clout) — force & control**
  - T1 (2): +1 gerrymander move whenever you lock a majority.
  - T2 (3): Once per turn, remove one opponent non-majority peg from a zone you
    have presence in.
  - T3 (5): Majorities you hold cannot be flipped by conspiracy effects.
- **Showstopper (Media) — spectacle**
  - T1 (2): Draw 2 dilemmas, choose 1 (discard the other).
  - T2 (3): Conspiracy cards cost 1 less resource (min total 3).
  - T3 (5): Once per game, copy the effect of a conspiracy as it is played.
- **Idealist (Trust) — grassroots**
  - T1 (2): +1 Trust at the start of each of your turns.
  - T2 (3): Win ties for zone majority.
  - T3 (5): Once per turn, sway one neighboring non-majority peg to become yours.

### 3.4 Zones & majority

- **9 constituencies**, each with an **odd peg capacity in 5–11**.
- A player holding **more than half** a zone's pegs **locks the majority**:
  the zone is awarded and (unless modified) no longer contestable by new pegs.
- Locking a majority grants a **gerrymander**: move one non-majority peg in a
  **neighboring** zone in or out of that zone.
- Adjacency is defined by the map's shared borders (`neighbors[]` per zone).

### 3.5 Conspiracy cards

- Bought with mixed resources (4–5 total), held **secretly**.
- Played on your own turn **or as an interrupt** during another player's turn.
- Effects map to engine resolvers. Effect families (each card is one of these,
  parameterized): flip/convert a contested peg, block a purchase or action,
  force a discard, steal/grant resources, extra draw, protect a majority,
  forced gerrymander. ~20 cards authored across these families; each flags
  whether it can interrupt.

### 3.6 Win / end condition

- Game ends when **all 9 zones are locked** (or no legal peg placement remains).
- **Most zones controlled** wins; tie-break by **total votes (pegs) on the board**.

---

## 4. Architecture

Pure, DOM-free **engine** + thin **UI** projection.

```
shasn/
├── index.html
├── styles/
│   ├── base.css            # newsprint theme: type, color tokens, layout
│   └── components.css       # cards, map, panels, handoff curtain
├── src/
│   ├── engine/
│   │   ├── state.js         # createGame(), state shape
│   │   ├── actions.js        # pure (state, payload) -> newState reducers
│   │   ├── rules.js          # majority, adjacency, win detection, legality
│   │   ├── archetypes.js     # tiered power definitions + effects
│   │   └── conspiracies.js    # conspiracy effect resolvers
│   ├── data/
│   │   ├── dilemmas.js        # ~60 original dilemma cards (data only)
│   │   ├── conspiracies.js    # ~20 conspiracy card definitions
│   │   └── map.js             # 9 zones: id, name, capacity, svgPath, neighbors[]
│   ├── ui/
│   │   ├── render.js          # state -> DOM (declarative re-render)
│   │   ├── screens.js         # setup, turn, handoff curtain, endgame
│   │   ├── map.js             # SVG map render + peg placement interaction
│   │   └── persistence.js     # localStorage save/load
│   └── main.js                # wires engine <-> ui, owns dispatch loop
└── tests/
    └── engine.test.*          # node --test, headless
```

**State shape (single source of truth):** one plain object —
`players[]` (id, name, color, resources{funds,clout,media,trust}, piles{4 counts},
archetypeTiers, secretHand[], zonesControlled), `zones[]` (id, pegs{playerId:count},
lockedBy), `decks` (dilemma draw/discard, conspiracy draw/discard), `turn`
(currentPlayer, phase, pendingInterrupt), `log[]`.

**Action discipline:** actions are pure functions `(state, payload) → newState`.
The UI never mutates state; it **dispatches** and **re-renders** from the result.
Autosave serializes the object to localStorage after each action. This keeps the
ruleset fully unit-testable without a browser and the UI a restyleable projection.

---

## 5. UX flow & visual

1. **Setup** — player count (2–5), names, color/cipher per player → Begin.
2. **Turn screen** — country map center; active player's resource bank, ideology
   piles, and unlocked powers on one side; drawn dilemma's two answers in a modal;
   buy-voter / buy-conspiracy actions; per-zone vote tally always visible.
3. **Privacy handoff curtain** — full-screen "Pass to [Next Player]" lock; nothing
   private shows until they confirm "I'm [Name]." Secret hands revealed only here.
4. **Interrupts** — engine pauses, prompts the interrupting player privately (brief
   handoff) so secrecy holds mid-action.
5. **Endgame** — standings (zones won, total votes), winner, short "how the nation
   voted" recap from the log.

**Visual:** editorial newsprint — serif display headlines (Fraunces-like), restrained
ink palette with the 4 ideology colors as accents only, ruled dividers, subtle paper
texture. Responsive for a tablet/laptop passed around a table. Accessible markup
(semantic regions, ARIA, keyboard-operable controls), matching the user's existing
patterns.

---

## 6. Content plan

All content is **original writing** in SHASN's spirit; **no real SHASN card text is
reproduced**. Content lives in data files for easy editing/expansion.

- **~60 dilemmas** — question + two ideology-tagged answers with resource payouts,
  spanning economy, security, civil liberties, media, environment, identity.
- **~20 conspiracies** — name, cost (resource combo), effect descriptor → engine
  resolver, interrupt flag.
- **9 zones** — names, odd capacities (5–11), neighbors, SVG geometry.
- **Archetype powers** — all four ideologies at tiers 2/3/5 (see §3.3).

Author with a **balance pass**: payout distribution, conspiracy cost vs. power, zone
capacities, and reachability of archetype tiers in a typical game.

---

## 7. Testing

- **Engine unit tests (priority):** majority/win detection; adjacency & gerrymander
  legality; resource spend/affordability; dilemma resolution & pile thresholds;
  conspiracy effects; invariants (pegs never exceed capacity, turn order holds,
  end condition fires). Pure functions → runnable headless via `node --test`.
- **Content validation test:** every dilemma/conspiracy/zone matches its schema —
  no missing fields, costs payable, neighbor lists symmetric — catching authoring
  typos across 80+ entries.
- **Manual playtest:** a full 2-player and 4-player game through the UI before
  completion, per verification-before-completion discipline.

---

## 8. Open items for implementation planning

- Exact voter-card price table (value 1/2/3 → resource combos).
- Exact resource payouts per dilemma answer (set during authoring + balance).
- Final conspiracy effect parameters and counts per family.
- Concrete zone map geometry (SVG paths) and the neighbor graph.
- Final archetype power values after balance tuning.
