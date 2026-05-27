import { createGame } from "./engine/state.js";
import * as A from "./engine/actions.js";
import { render } from "./ui/render.js";
import { save, load, clearSave } from "./ui/persistence.js";
import { isNarrationEnabled, setNarrationEnabled, cancelNarration } from "./ui/narration.js";

const root = document.getElementById("app");
let state = null;
let ui = { mode: "setup", placing: null, error: null };

function paint() { render(root, { state, ui, dispatch, setUi }); }
function setUi(patch) { ui = { ...ui, ...patch }; paint(); }

const REDUCERS = {
  answerDilemma: A.answerDilemma,
  buyVoter: A.buyVoter,
  placeToken: A.placeToken,
  occupyVolatile: A.occupyVolatile,
  buyConspiracy: A.buyConspiracy,
  playConspiracy: A.playConspiracy,
  usePower: A.usePower,
  gerrymander: A.gerrymander,
  spinDilemma: A.spinDilemma
};

function dispatch(action, payload = {}) {
  try {
    if (action === "newGame") {
      // game opens in the starting-resource draft (phase "draft")
      state = createGame({ players: payload.players, seed: Date.now() >>> 0 });
      ui = { mode: "play", placing: null, error: null };
      save(state); paint(); return;
    }
    if (action === "draftResource") {
      state = A.draftResource(state, payload);
      save(state);
      // when the last pick completes, the engine begins player 0's turn -> hand off
      ui = state.turn.phase === "dilemma"
        ? { mode: "handoff", placing: null, error: null }
        : { ...ui, placing: null, error: null };
      paint(); return;
    }
    if (action === "clearSave") {
      clearSave(); state = null; ui = { mode: "setup", placing: null, error: null }; paint(); return;
    }
    if (action === "continueGame") {
      const saved = load();
      if (saved) { state = saved; ui = { mode: "play", placing: null, error: null, settingsOpen: false }; }
      paint(); return;
    }
    if (action === "requestNewGame") {
      const ok = typeof window === "undefined" || !state ||
        window.confirm("Start a new game? This ends the current campaign.");
      if (ok) { cancelNarration(); clearSave(); state = null; ui = { mode: "setup", placing: null, error: null, settingsOpen: false }; }
      else { ui = { ...ui, settingsOpen: false }; }
      paint(); return;
    }
    if (action === "toggleNarration") {
      setNarrationEnabled(!isNarrationEnabled());
      ui = { ...ui, error: null };   // keep the settings menu open
      paint(); return;
    }
    if (action === "revealTurn") {
      ui = { mode: "play", placing: null, error: null }; paint(); return;
    }
    if (action === "endTurn") {
      const prev = state.turn.current;
      state = A.endTurn(state);
      save(state);
      ui = { ...ui, placing: null, error: null };
      if (state.turn.phase !== "gameover" && state.turn.current !== prev) ui.mode = "handoff";
      paint(); return;
    }
    const fn = REDUCERS[action];
    if (!fn) throw new Error(`unknown action ${action}`);
    state = fn(state, payload);
    if (state.turn.pendingExtraDilemma) {
      delete state.turn.pendingExtraDilemma;
      state = A.drawExtraDilemma(state);
    }
    ui = { ...ui, placing: null, error: null };
    save(state); paint();
  } catch (e) {
    ui = { ...ui, error: e.message };
    paint();
  }
}

// Open on the setup screen. If a campaign is saved, setup offers "Continue";
// otherwise the player starts fresh. New Game is also reachable via the gear menu.
state = null;
ui = { mode: "setup", placing: null, error: null, settingsOpen: false };
paint();
