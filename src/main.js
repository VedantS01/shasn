import { createGame } from "./engine/state.js";
import * as A from "./engine/actions.js";
import { render } from "./ui/render.js";
import { save, load, clearSave } from "./ui/persistence.js";
import { isNarrationEnabled, setNarrationEnabled, cancelNarration } from "./ui/narration.js";

const root = document.getElementById("app");
let state = null;
let ui = { mode: "setup", error: null, settingsOpen: false, gerryMode: null };

function paint() { render(root, { state, ui, dispatch, setUi }); }
function setUi(patch) { ui = { ...ui, ...patch }; paint(); }

// All engine reducers wired here.
const REDUCERS = {
  // Core turn actions
  answerDilemma:     A.answerDilemma,
  spinDilemma:       A.spinDilemma,
  drawExtraDilemma:  A.drawExtraDilemma,
  doneReadAloud:     A.doneReadAloud,
  endTurn:           A.endTurn,
  passBetweenTurns:  A.passBetweenTurns,
  donePendingPlace:  A.donePendingPlace,
  discardResources:  A.discardResources,

  // Voter placement
  buyVoteBank:       A.buyVoteBank,
  placeToken:        A.placeToken,
  gerrymander:       A.gerrymander,

  // Old voter market (backward-compat for any saved states)
  buyVoter:          A.buyVoter,

  // Conspiracies
  buyConspiracy:     A.buyConspiracy,
  playConspiracy:    A.playConspiracy,

  // Powers
  openMarket:        A.openMarket,
  landGrab:          A.landGrab,
  donations:         A.donations,
  civilDisobedience: A.civilDisobedience,
  targetedMarketing: A.targetedMarketing,
  usePower:          A.usePower,

  // Trade
  proposeTrade:      A.proposeTrade,
  respondTrade:      A.respondTrade,

  // Coalitions
  proposeCoalition:  A.proposeCoalition,
  respondCoalition:  A.respondCoalition,
  withdrawCoalition: A.withdrawCoalition,
};

function dispatch(action, payload = {}) {
  try {
    // --- Special handlers (not pure reducers) ---

    if (action === "newGame") {
      state = createGame({ players: payload.players, seed: Date.now() >>> 0, mapId: payload.mapId });
      ui = { mode: "play", error: null, settingsOpen: false, gerryMode: null };
      save(state); paint(); return;
    }

    if (action === "continueGame") {
      const saved = load();
      if (saved) {
        state = saved;
        ui = { mode: "play", error: null, settingsOpen: false, gerryMode: null };
      }
      paint(); return;
    }

    if (action === "clearSave") {
      clearSave();
      state = null;
      ui = { mode: "setup", error: null, settingsOpen: false, gerryMode: null };
      paint(); return;
    }

    if (action === "requestNewGame") {
      const ok = typeof window === "undefined" || !state ||
        window.confirm("Start a new game? This ends the current campaign.");
      if (ok) {
        cancelNarration();
        clearSave();
        state = null;
        ui = { mode: "setup", error: null, settingsOpen: false, gerryMode: null };
      } else {
        ui = { ...ui, settingsOpen: false };
      }
      paint(); return;
    }

    if (action === "toggleNarration") {
      setNarrationEnabled(!isNarrationEnabled());
      ui = { ...ui, error: null };
      paint(); return;
    }

    if (action === "toggleSettings") {
      ui = { ...ui, settingsOpen: !ui.settingsOpen };
      paint(); return;
    }

    if (action === "revealTurn") {
      ui = { mode: "play", error: null, settingsOpen: false, gerryMode: null };
      paint(); return;
    }

    if (action === "shuffleOrder") {
      // Handled inside the setup screen UI — no reducer needed.
      paint(); return;
    }

    if (action === "draftResource") {
      state = A.draftResource(state, payload);
      save(state);
      // When the draft ends, the engine transitions to the first player's turn.
      // Show the handoff curtain so the first player gets a fresh reveal.
      if (state.turn.phase !== "draft") {
        ui = { mode: "handoff", error: null, settingsOpen: false, gerryMode: null };
      } else {
        ui = { ...ui, error: null };
      }
      paint(); return;
    }

    // --- Pure reducer path ---
    const fn = REDUCERS[action];
    if (!fn) throw new Error(`unknown action: ${action}`);
    const prev = state;
    state = fn(state, payload);
    save(state);

    // Clear gerry mode after a successful gerrymander
    if (action === "gerrymander") {
      ui = { ...ui, gerryMode: null, error: null };
    } else {
      ui = { ...ui, error: null };
    }

    // After endTurn, manage handoff: if the active player changed, show curtain.
    if (action === "endTurn") {
      if (state.turn.phase !== "gameover" && state.turn.phase !== "betweenTurns") {
        // betweenTurns is handled by its own curtain screen
      }
      // After passBetweenTurns resolves the last between-turn, beginTurn transitions
      // to readAloud — which the render dispatcher handles automatically.
    }

    // Check for mid-turn endTurn that triggers betweenTurns/readAloud — the render
    // dispatcher handles these phases via their own screens automatically.

    // Show handoff curtain when it's a new player's turn (after betweenTurns resolves)
    if (action === "passBetweenTurns" && state.turn.phase === "readAloud") {
      ui = { mode: "handoff", error: null, settingsOpen: false, gerryMode: null };
    }

    paint();
  } catch (e) {
    ui = { ...ui, error: e.message };
    paint();
  }
}

// Boot: show setup screen. If a campaign is saved, setup offers "Continue".
state = null;
ui = { mode: "setup", error: null, settingsOpen: false, gerryMode: null };
paint();
