# SHASN — Pass & Play

A single-device, pass-and-play adaptation of the political strategy game SHASN for
2–5 players. Faithful mechanics, original content, built with vanilla HTML/CSS/JS —
no framework, no build step.

Answer political dilemmas to earn four ideology resources (Funds, Clout, Media,
Trust), spend them to place voters across nine constituencies, lock majorities,
gerrymander your neighbours, and play secret conspiracies. When every zone is
decided, whoever holds the most wins.

## Play locally

Open `index.html` in a browser, or serve the folder (recommended, so ES modules load):

```
python3 -m http.server 8000
# then visit http://localhost:8000
```

The game autosaves to `localStorage` after every action, so a refresh resumes the
game in progress.

## Run tests

```
node --test
```

Node ≥ 18, no dependencies. The game engine is pure and DOM-free, so the full
ruleset (and complete simulated games) are tested headlessly.

## Deploy (GitHub Pages)

Push to GitHub, then in **Settings → Pages** set the source to the `main` branch,
`/ (root)` folder. The game is served at `https://<user>.github.io/<repo>/`.

## How a turn works

1. **Dilemma** — answer one of two choices; each grants resources and adds a card to
   that ideology's pile. Collecting **2 / 3 / 5** cards of one ideology unlocks the
   Capitalist, Supremo, Showstopper, or Idealist's tiered powers.
2. **Actions** — buy voter cards from the market and place them on the map; buy a
   blind **conspiracy** for 4–5 resources (held secretly, some playable as
   interrupts); use any unlocked active powers; spend gerrymanders earned by locking
   majorities.
3. **End turn** — a privacy curtain passes the device to the next player.

## Project layout

```
src/engine/   pure game engine (state, rules, actions, conspiracies, archetypes)
src/data/     content (map, dilemmas, conspiracies, voter market)
src/ui/        DOM rendering (map, screens, persistence)
src/main.js    dispatch loop + autosave
tests/         node --test suites (engine units, content validation, full-game sims)
```

## Credits

Original digital adaptation inspired by SHASN's mechanics. All card text, dilemmas,
and conspiracies in this project are original work; no copyrighted SHASN content or
artwork is reproduced.
