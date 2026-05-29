import { createGame } from "./engine/state.js";
import * as A from "./engine/actions.js";
import { render } from "./ui/render.js";
import { save, load, clearSave } from "./ui/persistence.js";
import { isNarrationEnabled, setNarrationEnabled, cancelNarration } from "./ui/narration.js";
import { HostRoom } from "./multiplayer/host.js";
import { ClientLink } from "./multiplayer/client.js";

const root = document.getElementById("app");
let state = null;

// ui.multiplayer = null | { role: "host"|"client", hostRoom?, clientLink?, peers?, ... }
let ui = { mode: "setup", error: null, settingsOpen: false, gerryMode: null, multiplayer: null };

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

// ---------------------------------------------------------------------------
// Multiplayer helpers
// ---------------------------------------------------------------------------

/**
 * When the host dispatches a game action, route it through HostRoom so it
 * runs the reducer and broadcasts filtered state to all peers.
 */
function hostDispatch(action, payload = {}) {
  const mp = ui.multiplayer;
  if (!mp || !mp.hostRoom) return;
  const hostRoom = mp.hostRoom;

  // draftResource needs special phase transition handling.
  if (action === "draftResource") {
    hostRoom.state = A.draftResource(hostRoom.state, payload);
    save(hostRoom.state);
    hostRoom._broadcast();
    hostRoom._notifyListeners();
    state = hostRoom.getOwnView();
    if (hostRoom.state.turn.phase !== "draft") {
      ui = { ...ui, mode: "handoff", error: null, gerryMode: null };
    } else {
      ui = { ...ui, error: null };
    }
    paint(); return;
  }

  hostRoom.dispatchFrom(0, action, payload);
  state = hostRoom.getOwnView();
  save(hostRoom.state);

  if (action === "gerrymander") {
    ui = { ...ui, gerryMode: null, error: null };
  } else {
    ui = { ...ui, error: null };
  }

  if (action === "passBetweenTurns" && hostRoom.state.turn.phase === "readAloud") {
    ui = { ...ui, mode: "handoff", error: null, gerryMode: null };
  }

  paint();
}

// ---------------------------------------------------------------------------
// Main dispatch function
// ---------------------------------------------------------------------------

function dispatch(action, payload = {}) {
  try {
    const mp = ui.multiplayer;

    // -----------------------------------------------------------------------
    // Multiplayer mode: "host"
    // -----------------------------------------------------------------------
    if (mp && mp.role === "host" && mp.hostRoom && ui.mode === "play") {
      // Route game actions through the host room.
      hostDispatch(action, payload);
      return;
    }

    // -----------------------------------------------------------------------
    // Multiplayer mode: "client"
    // -----------------------------------------------------------------------
    if (mp && mp.role === "client" && mp.clientLink && ui.mode === "play") {
      // Clients forward all actions to the host; state arrives via onStateChange.
      mp.clientLink.dispatch(action, payload);
      return;
    }

    // -----------------------------------------------------------------------
    // Multiplayer setup actions
    // -----------------------------------------------------------------------

    // Navigate to host lobby.
    if (action === "goHostLobby") {
      ui = { ...ui, mode: "hostLobby", multiplayer: { role: "host" } };
      paint(); return;
    }

    // Navigate to join lobby.
    if (action === "goJoinLobby") {
      ui = { ...ui, mode: "joinLobby", multiplayer: { role: "client" } };
      paint(); return;
    }

    // Host starts the game: create HostRoom, wire peers, switch to play.
    if (action === "newGame:host") {
      const { players, mapId, slots } = payload;
      const seed = Date.now() >>> 0;
      const hostRoom = new HostRoom({ players, seed, mapId });

      // Wire each already-connected slot into the host room.
      if (slots) {
        slots.forEach((slot, i) => {
          if (slot.dc && slot.pc) {
            const peerId = `peer-${i}`;
            hostRoom.attachClient({ peerId, pc: slot.pc, dataChannel: slot.dc });
          }
        });
      }

      // Host's own view.
      state = hostRoom.getOwnView();
      save(hostRoom.state);

      // On state change (from client actions) refresh host view.
      hostRoom.onStateChange(() => {
        state = hostRoom.getOwnView();
        save(hostRoom.state);
        paint();
      });

      ui = {
        mode: "play",
        error: null,
        settingsOpen: false,
        gerryMode: null,
        multiplayer: { role: "host", hostRoom, peers: slots }
      };
      paint(); return;
    }

    // Client connects and waits for state from host.
    if (action === "newGame:client") {
      const { dataChannel } = payload;
      const clientLink = new ClientLink(dataChannel);

      clientLink.onStateChange((newState) => {
        state = newState;
        // If the game has started (state is non-null), switch to play mode.
        if (state && ui.mode !== "play") {
          ui = { ...ui, mode: "play", error: null };
        }
        paint();
      });

      ui = {
        ...ui,
        mode: "joinLobby",
        multiplayer: { ...ui.multiplayer, clientLink, connected: true }
      };
      paint(); return;
    }

    // -----------------------------------------------------------------------
    // Special handlers (not pure reducers) — local / pass-and-play mode
    // -----------------------------------------------------------------------

    if (action === "newGame") {
      state = createGame({ players: payload.players, seed: Date.now() >>> 0, mapId: payload.mapId });
      ui = { mode: "play", error: null, settingsOpen: false, gerryMode: null, multiplayer: null };
      save(state); paint(); return;
    }

    if (action === "continueGame") {
      const saved = load();
      if (saved) {
        state = saved;
        ui = { mode: "play", error: null, settingsOpen: false, gerryMode: null, multiplayer: null };
      }
      paint(); return;
    }

    if (action === "clearSave") {
      clearSave();
      state = null;
      ui = { mode: "setup", error: null, settingsOpen: false, gerryMode: null, multiplayer: null };
      paint(); return;
    }

    if (action === "requestNewGame") {
      const ok = typeof window === "undefined" || !state ||
        window.confirm("Start a new game? This ends the current campaign.");
      if (ok) {
        cancelNarration();
        clearSave();
        state = null;
        ui = { mode: "setup", error: null, settingsOpen: false, gerryMode: null, multiplayer: null };
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
      ui = { mode: "play", error: null, settingsOpen: false, gerryMode: null, multiplayer: ui.multiplayer };
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
        ui = { mode: "handoff", error: null, settingsOpen: false, gerryMode: null, multiplayer: ui.multiplayer };
      } else {
        ui = { ...ui, error: null };
      }
      paint(); return;
    }

    // --- Pure reducer path ---
    const fn = REDUCERS[action];
    if (!fn) throw new Error(`unknown action: ${action}`);
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
      ui = { mode: "handoff", error: null, settingsOpen: false, gerryMode: null, multiplayer: ui.multiplayer };
    }

    paint();
  } catch (e) {
    ui = { ...ui, error: e.message };
    paint();
  }
}

// Boot: show setup screen. If a campaign is saved, setup offers "Continue".
state = null;
ui = { mode: "setup", error: null, settingsOpen: false, gerryMode: null, multiplayer: null };
paint();
