/**
 * multiplayerScreens.js — Host lobby, join lobby, and connection status badge.
 *
 * SDP exchange UX: text copy-paste via textareas and clipboard buttons.
 * No external libraries required.
 */

import { MAPS } from "../data/map.js";
import { createHostPeer, acceptClientAnswer, createClientPeer } from "../multiplayer/peer.js";

// ---------------------------------------------------------------------------
// Tiny DOM helper (mirrors the one in screens.js — local copy to avoid coupling)
// ---------------------------------------------------------------------------
function h(tag, attrs = {}, ...kids) {
  const n = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (v == null || v === false) continue;
    if (k === "class") n.className = v;
    else if (k === "onclick") n.addEventListener("click", v);
    else if (k === "oninput") n.addEventListener("input", v);
    else if (k === "html") n.innerHTML = v;
    else n.setAttribute(k, v);
  }
  for (const kid of kids.flat()) {
    if (kid == null || kid === false) continue;
    n.appendChild(typeof kid === "string" ? document.createTextNode(kid) : kid);
  }
  return n;
}

function masthead(title, subtitle) {
  return h("header", { class: "masthead" },
    h("h1", {}, title),
    h("span", { class: "label" }, subtitle));
}

function copyBtn(getText) {
  const btn = h("button", { class: "btn btn-sm" }, "Copy");
  btn.addEventListener("click", () => {
    const text = getText();
    navigator.clipboard.writeText(text).then(() => {
      btn.textContent = "Copied!";
      setTimeout(() => { btn.textContent = "Copy"; }, 1500);
    }).catch(() => {
      // Fallback: select the text in a hidden input
      const inp = document.createElement("textarea");
      inp.value = text;
      document.body.appendChild(inp);
      inp.select();
      document.execCommand("copy");
      document.body.removeChild(inp);
      btn.textContent = "Copied!";
      setTimeout(() => { btn.textContent = "Copy"; }, 1500);
    });
  });
  return btn;
}

const COLORS = ["#b3472f", "#2f6aa8", "#caa12f", "#7a3f9d", "#2f7d54"];

// ---------------------------------------------------------------------------
// Host lobby screen
// ---------------------------------------------------------------------------

/**
 * hostLobbyScreen(ctx)
 *
 * ctx shape:
 *   { ui, dispatch, setUi }
 *   ui.multiplayer = { role: "host", hostRoom?, peers?, playerSlots?, ... }
 *
 * Flow:
 *   1. Host fills in their name, picks map + seat count.
 *   2. For each remaining seat, click "Generate offer" → textarea shows offer SDP.
 *   3. Joiner pastes their answer SDP into a second textarea → "Apply answer".
 *   4. Once all seats filled (or manually via "Start anyway"), click "Start game".
 */
export function hostLobbyScreen(ctx) {
  const { ui, dispatch, setUi } = ctx;
  const mp = ui.multiplayer || {};

  const root = h("div");
  root.appendChild(masthead("SHASN", "Host a LAN game"));

  // If the game has already started on the host side, show waiting message.
  if (mp.started) {
    root.appendChild(h("div", { class: "panel pop" },
      h("p", {}, "Game started! Waiting for players to connect…"),
      h("button", { class: "btn btn-primary",
        onclick: () => setUi({ mode: "play" }) }, "Go to game board")));
    return root;
  }

  // --- Step 1: Configuration ---
  const nameInput = h("input", { type: "text", value: mp.hostName || "Player 1",
    "aria-label": "Your name", maxlength: "16" });

  const boardSel = h("select", {},
    ...Object.values(MAPS).map((m) =>
      h("option", { value: m.id, selected: m.id === (mp.mapId || "small") ? "selected" : null }, m.name)));

  const countSel = h("select", {},
    ...[2, 3, 4].map((n) =>
      h("option", { value: String(n), selected: n === (mp.maxPlayers || 2) ? "selected" : null }, `${n} players`)));

  // Player slots state: array of { name, offerSdp, answerSdp, dc, pc, connected }
  const slots = mp.playerSlots || [];
  const slotsContainer = h("div", { class: "stack" });

  function renderSlots() {
    slotsContainer.innerHTML = "";
    const count = Number(countSel.value) - 1; // seats for remote players
    while (slots.length < count) slots.push({ name: `Player ${slots.length + 2}` });
    while (slots.length > count) slots.pop();

    slots.forEach((slot, i) => {
      const slotEl = h("div", { class: "panel" },
        h("div", { class: "panel-header" },
          h("h4", {}, `Player ${i + 2}`),
          slot.connected ? h("span", { class: "tag" }, "Connected") : null));

      if (!slot.offerSdp) {
        // Step: generate offer
        const genBtn = h("button", { class: "btn btn-sm",
          onclick: async () => {
            genBtn.disabled = true;
            genBtn.textContent = "Generating…";
            try {
              const { pc, dataChannel, offerSdpPromise } = createHostPeer((msg) => {
                // Messages from this peer are handled in HostRoom; here just trigger re-render.
                setUi({});
              });
              const offerSdp = await offerSdpPromise;
              slot.offerSdp = offerSdp;
              slot.pc = pc;
              slot.dc = dataChannel;
              dataChannel.addEventListener("open", () => {
                slot.connected = true;
                renderSlots();
              });
              setUi({ multiplayer: { ...mp, playerSlots: slots } });
              renderSlots();
            } catch (e) {
              genBtn.disabled = false;
              genBtn.textContent = "Generate offer";
              slotEl.appendChild(h("p", { class: "err" }, e.message));
            }
          }
        }, "Generate offer for this player");
        slotEl.appendChild(genBtn);
      } else if (!slot.connected) {
        // Step: show offer SDP + accept answer
        const offerArea = h("textarea", {
          class: "sdp-area", readonly: "readonly", rows: "4",
          "aria-label": "Offer SDP (give to joiner)"
        });
        offerArea.value = slot.offerSdp;

        const answerArea = h("textarea", {
          class: "sdp-area", rows: "4", placeholder: "Paste joiner's answer SDP here",
          "aria-label": "Answer SDP from joiner"
        });

        const applyBtn = h("button", { class: "btn btn-sm",
          onclick: async () => {
            applyBtn.disabled = true;
            applyBtn.textContent = "Applying…";
            try {
              await acceptClientAnswer(slot.pc, answerArea.value.trim());
              slot.answerSdp = answerArea.value.trim();
            } catch (e) {
              applyBtn.disabled = false;
              applyBtn.textContent = "Apply answer";
              slotEl.appendChild(h("p", { class: "err" }, e.message));
            }
          }
        }, "Apply answer");

        slotEl.appendChild(h("div", { class: "label" }, "Offer SDP — share with Player " + (i + 2)));
        slotEl.appendChild(h("div", { class: "row" }, offerArea, copyBtn(() => slot.offerSdp)));
        slotEl.appendChild(h("div", { class: "label" }, "Paste their answer SDP below:"));
        slotEl.appendChild(answerArea);
        slotEl.appendChild(applyBtn);
      } else {
        slotEl.appendChild(h("p", { class: "muted" }, "Player connected and ready."));
      }

      slotsContainer.appendChild(slotEl);
    });
  }

  countSel.addEventListener("change", renderSlots);
  renderSlots();

  const startBtn = h("button", { class: "btn btn-primary btn-lg",
    onclick: () => {
      const hostName = nameInput.value.trim() || "Player 1";
      const maxPlayers = Number(countSel.value);
      const mapId = boardSel.value;

      // Build player list: host first, then remote slots.
      const players = [
        { name: hostName, color: COLORS[0] },
        ...slots.slice(0, maxPlayers - 1).map((s, i) => ({
          name: s.name || `Player ${i + 2}`,
          color: COLORS[i + 1]
        }))
      ];

      dispatch("newGame:host", { players, mapId, slots });
    }
  }, "Start game");

  root.appendChild(h("div", { class: "panel stack pop" },
    h("h3", {}, "Setup"),
    h("div", { class: "row" }, h("span", { class: "label" }, "Your name"), nameInput),
    h("div", { class: "row" }, h("span", { class: "label" }, "Board"), boardSel),
    h("div", { class: "row" }, h("span", { class: "label" }, "Players"), countSel),
    h("hr", { class: "rule" }),
    h("h4", {}, "Remote players"),
    h("p", { class: "muted" }, "For each seat: generate an offer, share it with that player, then paste their answer SDP back."),
    slotsContainer,
    h("hr", { class: "rule" }),
    startBtn));

  root.appendChild(h("button", { class: "btn btn-sm",
    style: "margin-top:8px",
    onclick: () => setUi({ mode: "setup", multiplayer: null }) }, "← Back"));

  return root;
}

// ---------------------------------------------------------------------------
// Join lobby screen
// ---------------------------------------------------------------------------

/**
 * joinLobbyScreen(ctx)
 *
 * ctx.ui.multiplayer = { role: "client", ... }
 *
 * Flow:
 *   1. Player enters name.
 *   2. Pastes host's offer SDP into textarea.
 *   3. Clicks "Generate answer" → answer SDP shown for them to copy and send back.
 *   4. When connection opens, "Waiting for host…" message shown.
 */
export function joinLobbyScreen(ctx) {
  const { ui, setUi } = ctx;
  const mp = ui.multiplayer || {};

  const root = h("div");
  root.appendChild(masthead("SHASN", "Join a LAN game"));

  if (mp.connected) {
    root.appendChild(h("div", { class: "panel pop" },
      h("h2", {}, "Connected!"),
      h("p", { class: "muted" }, "Waiting for the host to start the game…"),
      connectionStatusBadge(ctx)));
    return root;
  }

  const nameInput = h("input", { type: "text", value: mp.playerName || "Player 2",
    "aria-label": "Your name", maxlength: "16" });

  const offerArea = h("textarea", {
    class: "sdp-area", rows: "4", placeholder: "Paste host's offer SDP here",
    "aria-label": "Host offer SDP"
  });

  const answerSection = h("div", { style: "display:none" });
  const answerArea = h("textarea", {
    class: "sdp-area", readonly: "readonly", rows: "4",
    "aria-label": "Your answer SDP (send to host)"
  });

  const statusMsg = h("p", { class: "muted" }, "");

  const genBtn = h("button", { class: "btn btn-primary",
    onclick: async () => {
      const offerSdp = offerArea.value.trim();
      if (!offerSdp) { statusMsg.textContent = "Paste the host's offer SDP first."; return; }
      genBtn.disabled = true;
      genBtn.textContent = "Generating…";
      statusMsg.textContent = "";
      try {
        const { pc, dataChannelPromise, answerSdpPromise } = createClientPeer(offerSdp, (msg) => {
          // State updates arrive here; wire into ctx.
          if (msg.type === "state" && mp.clientLink) {
            // Handled inside ClientLink; this path is a fallback.
          }
        });

        const answerSdp = await answerSdpPromise;
        answerArea.value = answerSdp;
        answerSection.style.display = "";
        genBtn.textContent = "Answer generated";

        // Wait for the data channel to open.
        dataChannelPromise.then((dc) => {
          setUi({
            multiplayer: {
              ...mp,
              playerName: nameInput.value.trim() || "Player 2",
              pc,
              dataChannel: dc,
              connected: true
            }
          });
        });

        setUi({
          multiplayer: {
            ...mp,
            playerName: nameInput.value.trim() || "Player 2",
            pc,
            answerSdp
          }
        });
      } catch (e) {
        genBtn.disabled = false;
        genBtn.textContent = "Generate answer";
        statusMsg.textContent = "Error: " + e.message;
      }
    }
  }, "Generate answer");

  answerSection.appendChild(h("div", { class: "label" }, "Your answer SDP — send this back to the host:"));
  answerSection.appendChild(h("div", { class: "row" }, answerArea, copyBtn(() => answerArea.value)));
  answerSection.appendChild(h("p", { class: "muted" }, "Once the host applies your answer, the connection will open automatically."));

  root.appendChild(h("div", { class: "panel stack pop" },
    h("h3", {}, "Join game"),
    h("div", { class: "row" }, h("span", { class: "label" }, "Your name"), nameInput),
    h("div", { class: "label" }, "Paste host's offer SDP:"),
    offerArea,
    genBtn,
    statusMsg,
    h("hr", { class: "rule" }),
    answerSection));

  root.appendChild(h("button", { class: "btn btn-sm",
    style: "margin-top:8px",
    onclick: () => setUi({ mode: "setup", multiplayer: null }) }, "← Back"));

  return root;
}

// ---------------------------------------------------------------------------
// Connection status badge
// ---------------------------------------------------------------------------

/**
 * connectionStatusBadge(ctx)
 *
 * Small persistent indicator showing peer count / connection health.
 * Returns a DOM element suitable for appending to any screen.
 */
export function connectionStatusBadge(ctx) {
  const { ui } = ctx;
  const mp = ui.multiplayer;
  if (!mp) return h("span");

  if (mp.role === "host") {
    const hostRoom = mp.hostRoom;
    const count = hostRoom ? hostRoom.peerCount : 0;
    return h("span", { class: "tag", style: "margin-left:8px" },
      `Host · ${count} peer${count !== 1 ? "s" : ""} connected`);
  }

  if (mp.role === "client") {
    const connected = mp.connected || false;
    return h("span", { class: "tag", style: "margin-left:8px" },
      connected ? "Online" : "Connecting…");
  }

  return h("span");
}
