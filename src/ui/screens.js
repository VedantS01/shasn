import { renderMap } from "./map.js";
import { hintBanner } from "./hintBanner.js";
import { narrateDilemma, narrateChoice, isNarrationEnabled } from "./narration.js";
import { hasSave } from "./persistence.js";
import { DILEMMA_BY_ID } from "../data/dilemmas.js";
import { VOTE_BANK_BY_ID } from "../data/voteBank.js";
import { CONSPIRACY_BY_ID } from "../data/conspiracies.js";
import { POWERS, level } from "../engine/powers.js";
import { IDEOLOGIES, RESOURCES, RESOURCE_OF, tierOf } from "../engine/constants.js";
import { canPlaceInZone, standings, neighborsOf, voteCount, majorityThreshold,
  isZoneFull, soloMajorityZones, emptySeats } from "../engine/rules.js";

const COLORS = ["#b3472f", "#2f6aa8", "#caa12f", "#7a3f9d", "#2f7d54"];
const RES_LABEL = { funds: "Funds", clout: "Clout", media: "Media", trust: "Trust" };

// ---------------------------------------------------------------------------
// Tiny DOM helper
// ---------------------------------------------------------------------------
function h(tag, attrs = {}, ...kids) {
  const n = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (v == null || v === false) continue;
    if (k === "class") n.className = v;
    else if (k === "onclick") n.addEventListener("click", v);
    else if (k === "onchange") n.addEventListener("change", v);
    else if (k === "html") n.innerHTML = v;
    else n.setAttribute(k, v);
  }
  for (const kid of kids.flat()) {
    if (kid == null || kid === false) continue;
    n.appendChild(typeof kid === "string" ? document.createTextNode(kid) : kid);
  }
  return n;
}

function select(options, value) {
  return h("select", {}, ...options.map((o) =>
    h("option", { value: o.value, selected: o.value === value ? "selected" : null }, o.label)));
}

function costLabel(cost) {
  return Object.entries(cost).map(([r, n]) => `${n} ${r}`).join(" · ");
}

function resourceChips(player) {
  return h("div", { class: "chips" },
    ...RESOURCES.map((r) => h("span", { class: `chip ${r}` }, `${RES_LABEL[r]}: ${player.resources[r]}`)));
}

function masthead(ctx, sub) {
  return h("header", { class: "masthead" },
    settingsControl(ctx),
    h("h1", {}, "SHASN"),
    h("span", { class: "label" }, sub));
}

function settingsControl(ctx) {
  const { ui } = ctx;
  const open = !!ui.settingsOpen;
  const gear = h("button", {
    class: "gear-btn",
    "aria-label": "Settings",
    "aria-expanded": String(open),
    onclick: () => ctx.setUi({ settingsOpen: !open })
  }, "⚙");
  if (!open) return h("div", { class: "settings" }, gear);
  const narrOn = isNarrationEnabled();
  const menu = h("div", { class: "settings-menu pop" },
    h("div", { class: "label" }, "Settings"),
    h("button", { class: "btn btn-sm settings-row",
      onclick: () => ctx.dispatch("toggleNarration") },
      `Narration: ${narrOn ? "On" : "Off"}`),
    h("button", { class: "btn btn-sm settings-row",
      onclick: () => ctx.dispatch("requestNewGame") }, "New game…"),
    h("button", { class: "btn btn-sm settings-row",
      onclick: () => ctx.setUi({ settingsOpen: false }) }, "Close"));
  return h("div", { class: "settings" }, gear, menu);
}

// ---------------------------------------------------------------------------
// Setup screen
// ---------------------------------------------------------------------------
export function setupScreen(ctx) {
  const root = h("div");
  root.appendChild(masthead(ctx, "A pass-and-play political strategy game"));

  if (hasSave()) {
    root.appendChild(h("div", { class: "panel pop resume-panel" },
      h("p", { class: "muted" }, "A saved campaign is in progress."),
      h("button", { class: "btn btn-primary",
        onclick: () => ctx.dispatch("continueGame") }, "Continue saved game")));
  }

  // Player rows (max 4, drop the old 5-player row)
  const rows = [];
  for (let i = 0; i < 4; i++) {
    const input = h("input", {
      type: "text", value: `Player ${i + 1}`,
      "aria-label": `Player ${i + 1} name`, maxlength: "16"
    });
    const row = h("div", {
      class: "setup-player",
      style: i < 2 ? "" : "display:none"
    },
      h("span", { class: "swatch", style: `background:${COLORS[i]}` }),
      input);
    row._input = input;
    rows.push(row);
  }

  const count = select(
    [2, 3, 4].map((n) => ({ value: String(n), label: `${n} players` })),
    "2"
  );
  count.addEventListener("change", () => {
    const c = Number(count.value);
    rows.forEach((row, i) => { row.style.display = i < c ? "" : "none"; });
  });

  // Shuffle seat order button
  const shuffle = h("button", { class: "btn btn-sm",
    onclick: () => {
      const c = Number(count.value);
      // Randomly permute only the visible rows
      const indices = Array.from({ length: c }, (_, i) => i);
      for (let i = indices.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [indices[i], indices[j]] = [indices[j], indices[i]];
      }
      // Swap names based on permutation
      const names = indices.map((i) => rows[i]._input.value);
      rows.slice(0, c).forEach((row, i) => { row._input.value = names[i]; });
    }
  }, "Shuffle seat order");

  const begin = h("button", { class: "btn btn-primary btn-lg", onclick: () => {
    const c = Number(count.value);
    const players = rows.slice(0, c).map((row, i) => ({
      name: row._input.value.trim() || `Player ${i + 1}`,
      color: COLORS[i]
    }));
    ctx.dispatch("newGame", { players });
  } }, "Begin the campaign");

  root.appendChild(h("div", { class: "panel stack pop" },
    h("h3", {}, "Who's running?"),
    h("div", { class: "row" }, h("span", { class: "label" }, "Players"), count),
    ...rows,
    shuffle,
    h("hr", { class: "rule" }),
    h("p", { class: "muted" }, "Each turn you answer a dilemma for ideology resources, then spend them to place voters across nine constituencies. Lock a majority everywhere to end the game — most flipped seats wins."),
    begin));

  return root;
}

// ---------------------------------------------------------------------------
// Starting-resource draft
// ---------------------------------------------------------------------------
export function draftScreen(ctx) {
  const { state } = ctx;
  const p = state.players[state.turn.current];
  const root = h("div");
  root.appendChild(masthead(ctx, "Starting draft — claim your opening resources"));

  const picker = h("div", { class: "chips draft-pick" },
    ...RESOURCES.map((r) => h("button", { class: `chip-btn ${r}`,
      onclick: () => ctx.dispatch("draftResource", { resource: r }) },
      h("span", { class: `dot ${r}` }), RES_LABEL[r])));

  const tally = h("div", { class: "stack" },
    ...state.players.map((pl) => h("div", {
      class: "pile-row" + (pl.id === p.id ? " active" : "")
    },
      h("span", {},
        h("span", { class: "swatch", style: `background:${pl.color}` }),
        " ", pl.name),
      resourceChips(pl))));

  root.appendChild(h("div", { class: "panel stack pop" },
    h("h3", {}, `${p.name}, pick ${state.turn.draftRemaining} resource${state.turn.draftRemaining > 1 ? "s" : ""}`),
    h("p", { class: "muted" }, "Player 1 drafts 1, Player 2 drafts 2 — the later you go, the more you start with."),
    picker,
    h("hr", { class: "rule" }),
    tally));
  return root;
}

// ---------------------------------------------------------------------------
// Main turn screen
// ---------------------------------------------------------------------------
export function turnScreen(ctx) {
  const { state, ui } = ctx;
  const me = state.players[state.turn.current];
  const phase = state.turn.phase;
  const root = h("div");

  if (ui.error) root.appendChild(h("div", { class: "err", role: "alert" }, ui.error));
  root.appendChild(masthead(ctx, `${me.name}'s turn`));

  // Headline banner if applicable
  if (state.lastHeadline) root.appendChild(headlineBanner(state.lastHeadline));

  // Hint banner
  const hint = hintBanner(ctx);
  if (hint) root.appendChild(hint);

  // Placement mode: when currentBuy has tokensRemaining > 0
  const buy = state.turn.currentBuy;
  const placing = buy && buy.tokensRemaining > 0;

  // Gerry mode from UI state
  const gerryMode = ui.gerryMode || null;

  // Compute placeable zones when placing
  const placeableZoneIds = placing
    ? state.zones
        .filter((z) => canPlaceInZone(state, me.id, z.id) &&
          (!buy.zoneId || buy.zoneId === z.id))
        .map((z) => z.id)
    : [];

  // Compute gerry candidates
  let gerryFromCandidates = [];
  let gerryDestCandidates = [];
  if (gerryMode && !gerryMode.sourceSeat) {
    // Waiting to pick a source: eligible seats = current player's non-flipped, non-volatile seats
    // in the majority zone or its neighbors
    const majZone = state.zones.find((z) => z.id === gerryMode.majorityZoneId);
    if (majZone) {
      const sourceZoneIds = [gerryMode.majorityZoneId, ...neighborsOf(gerryMode.majorityZoneId)];
      for (const zId of sourceZoneIds) {
        const z = state.zones.find((x) => x.id === zId);
        if (!z) continue;
        z.seats.forEach((owner, idx) => {
          if (owner === me.id && !z.flippedSeats[idx] && !z.volatileSeats.includes(idx)) {
            gerryFromCandidates.push({ zoneId: zId, seatIndex: idx });
          }
        });
      }
    }
  } else if (gerryMode && gerryMode.sourceSeat) {
    // Source selected — show dest candidates: adjacent empty seats
    const src = gerryMode.sourceSeat;
    const adjIds = neighborsOf(src.zoneId);
    for (const adjId of adjIds) {
      const z = state.zones.find((x) => x.id === adjId);
      if (!z || isZoneFull(z)) continue;
      emptySeats(z).forEach((idx) => {
        gerryDestCandidates.push({ zoneId: adjId, seatIndex: idx });
      });
    }
  }

  const onGerrySourceClick = (zoneId, seatIndex) => {
    ctx.setUi({ gerryMode: { ...gerryMode, sourceSeat: { zoneId, seatIndex } } });
  };
  const onGerryDestClick = (zoneId, seatIndex) => {
    if (!gerryMode || !gerryMode.sourceSeat) return;
    ctx.dispatch("gerrymander", {
      majorityZoneId: gerryMode.majorityZoneId,
      fromZoneId: gerryMode.sourceSeat.zoneId,
      fromSeatIndex: gerryMode.sourceSeat.seatIndex,
      toZoneId: zoneId,
      toSeatIndex: seatIndex
    });
    ctx.setUi({ gerryMode: null });
  };

  const map = renderMap(state, {
    placeableZoneIds,
    onSeatClick: (zoneId, seatIndex) => ctx.dispatch("placeToken", { zoneId, seatIndex }),
    gerryFromCandidates,
    onGerrySourceClick,
    gerryDestCandidates,
    onGerryDestClick
  });

  const legend = placing
    ? h("p", { class: "map-legend place-prompt" },
        `Place ${buy.tokensRemaining} voter${buy.tokensRemaining > 1 ? "s" : ""} — all in the same zone. Click a highlighted empty seat.`)
    : h("p", { class: "map-legend muted" }, "Seats marked S have been scored (flipped). Dashed seats are volatile.");

  const mapCol = h("div", {}, map, legend);

  const panel = h("div", {},
    playerPanel(ctx, me),
    voteBankPanel(ctx, me, placing),
    gerrymanderPanel(ctx, me),
    conspiracyPanel(ctx, me, placing),
    tradePanel(ctx, me, placing),
    coalitionPanel(ctx, me, placing),
    powerPanel(ctx, me, placing),
    endPanel(ctx, placing)
  );

  root.appendChild(h("div", { class: "turn-grid" }, mapCol, panel));

  // Overlays / modals for sub-phases
  if (phase === "dilemma") root.appendChild(dilemmaModal(ctx, me));
  if (phase === "discard") root.appendChild(discardModal(ctx, me));
  if (phase === "placePending") root.appendChild(placePendingPrompt(ctx, me));

  return root;
}

function headlineBanner(hl) {
  return h("div", { class: "headline pop" },
    h("span", { class: "tag" }, "Headline"),
    h("strong", {}, ` ${hl.name} `),
    h("span", { class: "muted" }, `— ${hl.text}`));
}

// ---------------------------------------------------------------------------
// Player panel
// ---------------------------------------------------------------------------
function playerPanel(ctx, me) {
  const piles = h("div", {});
  for (const ide of IDEOLOGIES) {
    const count = me.piles[ide] || 0;
    const lvl = level(count);
    const passive = Math.floor(count / 2);
    const powList = [];
    if (lvl >= 4) powList.push(POWERS[ide].l4.name);
    if (lvl >= 6) powList.push(POWERS[ide].l6.name);

    piles.appendChild(h("div", { class: "pile-row" },
      h("span", {},
        h("span", { class: `dot ${RESOURCE_OF[ide]}` }),
        " ",
        h("strong", {}, ide.charAt(0).toUpperCase() + ide.slice(1)),
        ` · ${count}`),
      h("span", { class: "pow muted" },
        passive > 0 ? `+${passive}/turn` : "",
        lvl >= 4 ? ` | ${powList.join(", ")}` : "")));
  }
  return h("div", { class: "panel" },
    h("h3", {}, me.name),
    resourceChips(me),
    h("hr", { class: "rule" }),
    h("div", { class: "label" }, "Ideology piles"),
    piles);
}

// ---------------------------------------------------------------------------
// Vote Bank panel
// ---------------------------------------------------------------------------
function voteBankPanel(ctx, me, placing) {
  const { state } = ctx;
  const inActions = state.turn.phase === "actions";
  const open = state.market.open;
  const buy = state.turn.currentBuy;
  const hasPending = buy && buy.tokensRemaining > 0;

  const blindFaith = (me.piles.idealist || 0) >= 4;

  const items = open.map((cardId, idx) => {
    if (!cardId) return h("div", { class: "market-item" }, h("span", { class: "muted" }, "—"));
    const card = VOTE_BANK_BY_ID[cardId];
    if (!card) return h("div", { class: "market-item" }, h("span", { class: "muted" }, cardId));
    const canAfford = RESOURCES.every((r) => me.resources[r] >= (card.cost[r] || 0));
    const canAffordBF = blindFaith && RESOURCES.every((r) => {
      const c = r === card.markedResource ? 0 : (card.cost[r] || 0);
      return me.resources[r] >= c;
    });
    const disabled = !inActions || hasPending;
    return h("div", { class: "market-item" },
      h("span", {},
        h("strong", {}, card.id),
        ` · ${card.value} vote${card.value > 1 ? "s" : ""}`,
        h("div", { class: "cost-mini" }, costLabel(card.cost))),
      h("div", { class: "row" },
        h("button", { class: "btn btn-sm",
          disabled: (disabled || !canAfford) ? "disabled" : null,
          onclick: () => ctx.dispatch("buyVoteBank", { openIndex: idx }) }, "Buy"),
        blindFaith ? h("button", { class: "btn btn-sm",
          disabled: (disabled || !canAffordBF) ? "disabled" : null,
          onclick: () => ctx.dispatch("buyVoteBank", { openIndex: idx, useBlindFaith: true }) }, "Blind Faith") : null));
  });

  const hint = hasPending
    ? h("p", { class: "muted" },
        `Placing ${buy.tokensRemaining} voter${buy.tokensRemaining > 1 ? "s" : ""} — finish before buying more.`)
    : null;

  return h("div", { class: "panel" },
    h("h3", {}, "Vote Bank"),
    ...items,
    hint);
}

// ---------------------------------------------------------------------------
// Gerrymander panel
// ---------------------------------------------------------------------------
function gerrymanderPanel(ctx, me) {
  const { state, ui } = ctx;
  const moves = state.turn.gerrymanderMoves || {};
  const eligible = Object.entries(moves).filter(([, v]) => v > 0);
  if (eligible.length === 0) return h("div");

  const gerryMode = ui.gerryMode || null;

  const rows = eligible.map(([zoneId, remaining]) => {
    const isActive = gerryMode && gerryMode.majorityZoneId === zoneId;
    return h("div", { class: "pile-row" },
      h("span", {}, `★ ${zoneId} · ${remaining} move${remaining > 1 ? "s" : ""} left`),
      isActive
        ? h("span", { class: "muted" },
            gerryMode.sourceSeat
              ? `Pick destination (from ${gerryMode.sourceSeat.zoneId}[${gerryMode.sourceSeat.seatIndex}])`
              : "Pick a voter to move")
        : h("button", { class: "btn btn-sm",
            onclick: () => ctx.setUi({ gerryMode: { majorityZoneId: zoneId, sourceSeat: null } }) },
            "Move from here"));
  });

  const cancel = gerryMode
    ? h("button", { class: "btn btn-sm",
        onclick: () => ctx.setUi({ gerryMode: null }) }, "Cancel gerrymander")
    : null;

  return h("div", { class: "panel" },
    h("div", { class: "banner pop" }, `Gerrymander available`),
    h("div", { class: "stack", style: "margin-top:8px" }, ...rows, cancel));
}

// ---------------------------------------------------------------------------
// Conspiracy panel
// ---------------------------------------------------------------------------
function conspiracyPanel(ctx, me, placing) {
  const { state } = ctx;
  const inActions = state.turn.phase === "actions";

  const buy = h("button", {
    class: "btn btn-sm",
    disabled: (!inActions || placing) ? "disabled" : null,
    onclick: () => ctx.dispatch("buyConspiracy")
  }, "Buy conspiracy (blind draw)");

  const hand = h("div", {});
  if (me.hand.length === 0) hand.appendChild(h("p", { class: "muted" }, "No conspiracies in hand."));
  for (const cardId of me.hand) hand.appendChild(handCard(ctx, me, cardId, placing));

  return h("div", { class: "panel" },
    h("h3", {}, "Conspiracies"),
    buy,
    h("hr", { class: "rule" }),
    h("div", { class: "label" }, "Your hand (secret)"),
    hand);
}

function handCard(ctx, me, cardId, placing) {
  const { state } = ctx;
  const card = CONSPIRACY_BY_ID[cardId];
  if (!card) return h("div", { class: "hand-card" }, cardId);
  const inActions = state.turn.phase === "actions";
  const controls = h("div", { class: "row", style: "margin-top:6px" });
  const others = state.players.filter((p) => p.id !== me.id).map((p) => ({
    value: String(p.id), label: p.name
  }));
  const removable = [];
  for (const z of state.zones) {
    z.seats.forEach((owner, idx) => {
      if (owner !== null && owner !== me.id && !z.flippedSeats[idx]) {
        removable.push({ key: `${z.id}:${idx}:${owner}`, zoneId: z.id, seatIndex: idx, pegOwner: owner,
          label: `${state.players[owner].name} in ${z.id}[${idx}]` });
      }
    });
  }
  const myLocked = state.zones.filter((z) => z.lockedBy === me.id).map((z) => ({
    value: z.id, label: z.id
  }));
  let getTarget = () => ({});
  if (card.effect && (card.effect.type === "stealResource" || card.effect.type === "forceDiscardConspiracy")) {
    const sel = select(others.length ? others : [{ value: "", label: "—" }]);
    controls.appendChild(h("span", { class: "cost-mini" }, "Target"));
    controls.appendChild(sel);
    getTarget = () => ({ playerId: Number(sel.value) });
  } else if (card.effect && card.effect.type === "removePeg") {
    const sel = select(removable.length ? removable.map((t) => ({ value: t.key, label: t.label })) : [{ value: "", label: "no targets" }]);
    controls.appendChild(h("span", { class: "cost-mini" }, "Peg"));
    controls.appendChild(sel);
    getTarget = () => {
      const t = removable.find((x) => x.key === sel.value);
      return t ? { zoneId: t.zoneId, seatIndex: t.seatIndex, pegOwner: t.pegOwner } : {};
    };
  } else if (card.effect && card.effect.type === "protectMajority") {
    const sel = select(myLocked.length ? myLocked : [{ value: "", label: "no held zones" }]);
    controls.appendChild(h("span", { class: "cost-mini" }, "Zone"));
    controls.appendChild(sel);
    getTarget = () => ({ zoneId: sel.value });
  }
  controls.appendChild(h("button", { class: "btn btn-sm",
    disabled: (!inActions || placing) ? "disabled" : null,
    onclick: () => ctx.dispatch("playConspiracy", { cardId, target: getTarget() }) }, "Play"));
  return h("div", { class: "hand-card" },
    h("h4", {}, card.name, " ", card.canInterrupt ? h("span", { class: "tag" }, "interrupt") : null),
    h("div", { class: "cost-mini" }, card.text || ""),
    controls);
}

// ---------------------------------------------------------------------------
// Trade panel
// ---------------------------------------------------------------------------
function tradePanel(ctx, me, placing) {
  const { state } = ctx;
  const inActions = state.turn.phase === "actions";
  const others = state.players.filter((p) => p.id !== me.id);
  if (others.length === 0) return h("div");

  const partnerSel = select(others.map((p) => ({ value: String(p.id), label: p.name })));

  const giveInputs = {};
  const receiveInputs = {};
  const giveRow = h("div", { class: "row" });
  const recvRow = h("div", { class: "row" });
  for (const r of RESOURCES) {
    const gi = h("input", { type: "number", min: "0", max: "8", value: "0",
      style: "width:44px", "aria-label": `give ${r}` });
    giveInputs[r] = gi;
    giveRow.appendChild(h("label", { class: "cost-mini spend-lbl" },
      h("span", { class: `dot ${r}` }), gi));
    const ri = h("input", { type: "number", min: "0", max: "8", value: "0",
      style: "width:44px", "aria-label": `receive ${r}` });
    receiveInputs[r] = ri;
    recvRow.appendChild(h("label", { class: "cost-mini spend-lbl" },
      h("span", { class: `dot ${r}` }), ri));
  }

  const propose = h("button", { class: "btn btn-sm",
    disabled: (!inActions || placing) ? "disabled" : null,
    onclick: () => {
      const give = { resources: {} };
      const receive = { resources: {} };
      for (const r of RESOURCES) {
        const gv = Number(giveInputs[r].value) || 0;
        const rv = Number(receiveInputs[r].value) || 0;
        if (gv > 0) give.resources[r] = gv;
        if (rv > 0) receive.resources[r] = rv;
      }
      ctx.dispatch("proposeTrade", { to: Number(partnerSel.value), give, receive });
    }
  }, "Propose trade");

  return h("div", { class: "panel" },
    h("h3", {}, "Trade"),
    h("div", { class: "row" }, h("span", { class: "label" }, "With"), partnerSel),
    h("div", { class: "label" }, "You give"), giveRow,
    h("div", { class: "label" }, "You receive"), recvRow,
    propose);
}

// ---------------------------------------------------------------------------
// Coalition panel
// ---------------------------------------------------------------------------
function coalitionPanel(ctx, me, placing) {
  const { state } = ctx;
  const inActions = state.turn.phase === "actions";
  const others = state.players.filter((p) => p.id !== me.id);
  const openZones = state.zones.filter((z) => z.lockedBy === null && z.coalition === null);
  if (others.length === 0 || openZones.length === 0) return h("div");

  const partnerSel = select(others.map((p) => ({ value: String(p.id), label: p.name })));
  const zoneSel = select(openZones.map((z) => ({ value: z.id, label: z.id })));
  const splitSel = select([
    { value: "equal", label: "Equal split" },
    { value: "senior", label: `${me.name} leads` }
  ]);

  // Own card picker for coalition offer
  const myCards = me.hand.map((cid) => ({ value: cid, label: CONSPIRACY_BY_ID[cid]?.name || cid }));
  const cardSel = select([{ value: "", label: "no card" }, ...myCards]);

  const propose = h("button", { class: "btn btn-sm",
    disabled: (!inActions || placing) ? "disabled" : null,
    onclick: () => {
      ctx.dispatch("proposeCoalition", {
        to: Number(partnerSel.value),
        zoneId: zoneSel.value,
        split: splitSel.value,
        ownCardId: cardSel.value || null
      });
    }
  }, "Propose coalition");

  return h("div", { class: "panel" },
    h("h3", {}, "Coalition"),
    h("div", { class: "row" }, h("span", { class: "label" }, "With"), partnerSel),
    h("div", { class: "row" }, h("span", { class: "label" }, "Zone"), zoneSel),
    h("div", { class: "row" }, h("span", { class: "label" }, "Split"), splitSel),
    myCards.length > 0 ? h("div", { class: "row" }, h("span", { class: "label" }, "Offer card"), cardSel) : null,
    propose);
}

// ---------------------------------------------------------------------------
// Power panel (unlocked active powers only)
// ---------------------------------------------------------------------------
function powerPanel(ctx, me, placing) {
  const { state } = ctx;
  const inActions = state.turn.phase === "actions";
  const sections = [];

  // Capitalist L4: Open Market
  if ((me.piles.capitalist || 0) >= 4 && !me.usedThisTurn.openMarket) {
    const giveSel = select(RESOURCES.map((r) => ({ value: r, label: r })), "funds");
    const take1 = select(RESOURCES.map((r) => ({ value: r, label: r })), "clout");
    const take2 = select(RESOURCES.map((r) => ({ value: r, label: r })), "media");
    sections.push(h("div", { class: "pile-row" },
      h("span", {}, h("strong", {}, "Open Market"), " · 1 → any 2"),
      h("div", { class: "row" },
        h("span", { class: "cost-mini" }, "Give"), giveSel,
        h("span", { class: "cost-mini" }, "→"), take1, take2,
        h("button", { class: "btn btn-sm",
          disabled: (!inActions || placing) ? "disabled" : null,
          onclick: () => ctx.dispatch("openMarket", { give: giveSel.value, take: [take1.value, take2.value] }) }, "Use"))));
  }

  // Capitalist L6: Land Grab — simplified: evict 1 seat via selects
  if ((me.piles.capitalist || 0) >= 6 && !me.usedThisTurn.landGrab) {
    const evictTargets = [];
    for (const z of state.zones) {
      z.seats.forEach((owner, idx) => {
        if (owner !== null && !z.volatileSeats.includes(idx)) {
          evictTargets.push({ value: `${z.id}:${idx}`, label: `${z.id}[${idx}] (${state.players[owner].name})` });
        }
      });
    }
    if (evictTargets.length > 0) {
      const t1 = select(evictTargets);
      sections.push(h("div", { class: "pile-row" },
        h("span", {}, h("strong", {}, "Land Grab"), " · evict voter"),
        h("div", { class: "row" },
          t1,
          h("button", { class: "btn btn-sm",
            disabled: (!inActions || placing) ? "disabled" : null,
            onclick: () => {
              const [zoneId, idx] = t1.value.split(":");
              ctx.dispatch("landGrab", { targets: [{ zoneId, seatIndex: Number(idx) }], replaceOwn: [] });
            } }, "Evict"))));
    }
  }

  // Supremo L4: Donations
  if ((me.piles.supremo || 0) >= 4 && !me.usedThisTurn.donations) {
    const others = state.players.filter((p) => p.id !== me.id);
    if (others.length > 0) {
      const fromSel = select(others.map((p) => ({ value: String(p.id), label: p.name })));
      const resSel = select(RESOURCES.map((r) => ({ value: r, label: r })), "funds");
      sections.push(h("div", { class: "pile-row" },
        h("span", {}, h("strong", {}, "Donations"), " · snatch 1 resource"),
        h("div", { class: "row" },
          fromSel, resSel,
          h("button", { class: "btn btn-sm",
            disabled: (!inActions || placing) ? "disabled" : null,
            onclick: () => ctx.dispatch("donations", {
              takes: [{ from: Number(fromSel.value), resource: resSel.value, count: 1 }]
            }) }, "Snatch"))));
    }
  }

  // Supremo L6: Civil Disobedience — discard 1 opponent voter
  if ((me.piles.supremo || 0) >= 6 && !me.usedThisTurn.civilDisobedience) {
    const oppTargets = [];
    for (const z of state.zones) {
      z.seats.forEach((owner, idx) => {
        if (owner !== null && owner !== me.id && !z.volatileSeats.includes(idx)) {
          oppTargets.push({ value: `${z.id}:${idx}`, label: `${z.id}[${idx}] (${state.players[owner].name})` });
        }
      });
    }
    if (oppTargets.length > 0) {
      const t1 = select(oppTargets);
      const paySel = select(RESOURCES.map((r) => ({ value: r, label: r })), "funds");
      sections.push(h("div", { class: "pile-row" },
        h("span", {}, h("strong", {}, "Civil Disobedience"), " · discard opponent voter"),
        h("div", { class: "row" },
          t1, h("span", { class: "cost-mini" }, "Pay 1"), paySel,
          h("button", { class: "btn btn-sm",
            disabled: (!inActions || placing) ? "disabled" : null,
            onclick: () => {
              const [zoneId, idx] = t1.value.split(":");
              const pay = {}; pay[paySel.value] = 1;
              ctx.dispatch("civilDisobedience", { targets: [{ zoneId, seatIndex: Number(idx) }], pay });
            } }, "Discard"))));
    }
  }

  // Showman L6: Targeted Marketing — convert 2 in a zone
  if ((me.piles.showman || 0) >= 6 && !me.usedThisTurn.targetedMarketing) {
    const others = state.players.filter((p) => p.id !== me.id);
    if (others.length > 0) {
      const oppSel = select(others.map((p) => ({ value: String(p.id), label: p.name })));
      const zoneSel = select(state.zones.map((z) => ({ value: z.id, label: z.id })));
      sections.push(h("div", { class: "pile-row" },
        h("span", {}, h("strong", {}, "Targeted Marketing"), " · 2 Media+3 any → convert 2 voters"),
        h("div", { class: "row" },
          h("span", { class: "cost-mini" }, "Opp"), oppSel,
          h("span", { class: "cost-mini" }, "Zone"), zoneSel,
          h("button", { class: "btn btn-sm",
            disabled: (!inActions || placing) ? "disabled" : null,
            onclick: () => {
              const oppId = Number(oppSel.value);
              const zoneId = zoneSel.value;
              const z = state.zones.find((x) => x.id === zoneId);
              const oppSeats = z ? z.seats
                .map((s, i) => s === oppId ? i : -1)
                .filter((i) => i >= 0 && !z.volatileSeats.includes(i))
                .slice(0, 2) : [];
              if (oppSeats.length < 2) {
                ctx.setUi({ error: "Need 2 opponent non-volatile voters in that zone." });
                return;
              }
              ctx.dispatch("targetedMarketing", {
                zoneId,
                opponentId: oppId,
                seatIndices: oppSeats,
                pay: { media: 2, funds: 1, clout: 1, trust: 1 }
              });
            } }, "Convert"))));
    }
  }

  if (sections.length === 0) return h("div");
  return h("div", { class: "panel" },
    h("h3", {}, "Active Powers"),
    ...sections);
}

// ---------------------------------------------------------------------------
// End panel (standings + end turn)
// ---------------------------------------------------------------------------
function endPanel(ctx, placing) {
  const { state } = ctx;
  const inActions = state.turn.phase === "actions";
  const buy = state.turn.currentBuy;
  const hasPending = buy && buy.tokensRemaining > 0;
  const blockEnd = placing || hasPending;

  const rows = standings(state).map((s) =>
    h("li", {}, `${s.name}: ${s.zones} zones, ${s.score} flipped`));

  return h("div", { class: "panel" },
    h("h3", {}, "Standings"),
    h("ul", { class: "tally" }, ...rows),
    h("hr", { class: "rule" }),
    blockEnd ? h("p", { class: "cost-mini" }, "Finish placing voters before ending the turn.") : null,
    h("button", { class: "btn btn-primary",
      disabled: (!inActions || blockEnd) ? "disabled" : null,
      onclick: () => ctx.dispatch("endTurn") }, "End turn →"));
}

// ---------------------------------------------------------------------------
// Dilemma modal
// ---------------------------------------------------------------------------
export function dilemmaModal(ctx, me) {
  if (!me) { const { state } = ctx; me = state.players[state.turn.current]; }
  const { state } = ctx;
  const card = DILEMMA_BY_ID[state.turn.pendingDilemma];
  if (!card) return h("div");

  const cardEl = h("div", { class: "modal dilemma-card pop" },
    h("span", { class: "label" }, `${me.name} — a dilemma`),
    h("h3", {}, card.question));

  narrateDilemma(card);

  const mkAnswer = (idx) => {
    const btn = h("button", { class: "answer" }, card.answers[idx].label);
    btn.addEventListener("click", () => {
      narrateChoice(card.answers[idx].label);
      animateAnswer(ctx, cardEl, card.answers[idx], idx);
    });
    return btn;
  };
  cardEl.appendChild(mkAnswer(0));
  cardEl.appendChild(mkAnswer(1));

  // Showstopper T1 spin (kept for backward compat — though it's now "showman")
  const showmanCount = (me.piles.showman || me.piles.showstopper || 0);
  if (tierOf(showmanCount) >= 4 && !me.usedThisTurn["showman:t1"] && !me.usedThisTurn["showstopper:t1"]) {
    cardEl.appendChild(h("div", { class: "row", style: "margin-top:12px;justify-content:flex-end" },
      h("button", { class: "btn btn-sm", onclick: () => ctx.dispatch("spinDilemma") }, "↻ Spin")));
  }

  return h("div", { class: "modal-scrim" }, cardEl);
}

function animateAnswer(ctx, cardEl, answer, idx) {
  if (cardEl.dataset && cardEl.dataset.answered) return;
  if (cardEl.dataset) cardEl.dataset.answered = "1";
  cardEl.className += ` answered accent-${answer.ideology}`;
  const burst = document.createElement("div");
  burst.className = "token-burst";
  for (const [r, n] of Object.entries(answer.payout)) {
    for (let k = 0; k < n; k++) {
      const t = document.createElement("span");
      t.className = `token tok-${r}`;
      t.textContent = RES_LABEL[r][0];
      burst.appendChild(t);
    }
  }
  cardEl.appendChild(burst);
  if (typeof requestAnimationFrame !== "undefined") {
    requestAnimationFrame(() => requestAnimationFrame(() => burst.className += " fly"));
  }
  setTimeout(() => ctx.dispatch("answerDilemma", { answerIndex: idx }), 900);
}

// ---------------------------------------------------------------------------
// Discard modal
// ---------------------------------------------------------------------------
export function discardModal(ctx, me) {
  if (!me) { const { state } = ctx; me = state.players[state.turn.current]; }
  const total = RESOURCES.reduce((s, r) => s + (me.resources[r] || 0), 0);
  const excess = total - 12;

  const inputs = {};
  const rows = h("div", { class: "stack" });
  for (const r of RESOURCES) {
    const max = me.resources[r] || 0;
    const inp = h("input", { type: "number", min: "0", max: String(max), value: "0",
      style: "width:60px", "aria-label": `discard ${r}` });
    inputs[r] = inp;
    rows.appendChild(h("div", { class: "row" },
      h("span", { class: `chip ${r}`, style: "min-width:80px" }, `${RES_LABEL[r]}: ${max}`),
      h("span", { class: "cost-mini" }, "Discard"),
      inp));
  }

  const confirm = h("button", { class: "btn btn-primary", onclick: () => {
    const counts = {};
    for (const r of RESOURCES) {
      const v = Number(inputs[r].value) || 0;
      if (v > 0) counts[r] = v;
    }
    ctx.dispatch("discardResources", { counts });
  } }, `Discard (need to shed ${excess})`);

  const card = h("div", { class: "modal pop" },
    h("h3", {}, "Over resource cap"),
    h("p", { class: "muted" }, `You have ${total} resources — discard down to 12.`),
    rows,
    h("hr", { class: "rule" }),
    confirm);

  return h("div", { class: "modal-scrim" }, card);
}

// ---------------------------------------------------------------------------
// Place-pending prompt (overlay over the map, not a full modal)
// ---------------------------------------------------------------------------
export function placePendingPrompt(ctx, me) {
  if (!me) { const { state } = ctx; me = state.players[state.turn.current]; }
  const n = me.pendingPlacements;
  const card = h("div", { class: "modal pop" },
    h("h3", {}, "Place evicted voters"),
    h("p", {}, `${me.name}: place ${n} voter${n > 1 ? "s" : ""} on the map. Click an empty seat in any open zone.`),
    h("button", { class: "btn btn-sm",
      onclick: () => ctx.dispatch("donePendingPlace") }, "Done placing"));
  return h("div", { class: "modal-scrim" }, card);
}

// ---------------------------------------------------------------------------
// Trade accept curtain (phase = "tradeAccept")
// ---------------------------------------------------------------------------
export function tradeAcceptCurtain(ctx) {
  const { state } = ctx;
  const prop = state.turn.pendingProposal;
  if (!prop) return h("div", { class: "curtain" }, "No pending trade.");
  const from = state.players[prop.from];
  const to = state.players[prop.to];

  const giveText = prop.give.resources
    ? Object.entries(prop.give.resources).map(([r, n]) => `${n} ${r}`).join(", ")
    : "—";
  const recvText = prop.receive.resources
    ? Object.entries(prop.receive.resources).map(([r, n]) => `${n} ${r}`).join(", ")
    : "—";

  return h("div", { class: "curtain" },
    h("span", { class: "label" }, "Trade proposal — pass the device"),
    h("h2", { style: `color:${to.color}` }, `${to.name}, you're up`),
    h("p", {}, `${from.name} offers ${giveText} in exchange for ${recvText}.`),
    h("div", { class: "row", style: "gap:16px" },
      h("button", { class: "btn btn-primary",
        onclick: () => ctx.dispatch("respondTrade", { accept: true }) }, "Accept"),
      h("button", { class: "btn",
        onclick: () => ctx.dispatch("respondTrade", { accept: false }) }, "Decline")));
}

// ---------------------------------------------------------------------------
// Coalition accept curtain (phase = "coalitionAccept")
// ---------------------------------------------------------------------------
export function coalitionAcceptCurtain(ctx) {
  const { state } = ctx;
  const prop = state.turn.pendingProposal;
  if (!prop) return h("div", { class: "curtain" }, "No pending coalition.");
  const from = state.players[prop.from];
  const to = state.players[prop.to];

  // Find partner cards (cards the recipient holds most of)
  const partnerCards = to.hand.map((cid) => ({
    value: cid,
    label: CONSPIRACY_BY_ID[cid]?.name || cid
  }));
  const cardSel = partnerCards.length > 0
    ? select(partnerCards)
    : null;

  return h("div", { class: "curtain" },
    h("span", { class: "label" }, "Coalition proposal — pass the device"),
    h("h2", { style: `color:${to.color}` }, `${to.name}, you're up`),
    h("p", {}, `${from.name} proposes a coalition in ${prop.zoneId || "a zone"}.`),
    cardSel ? h("div", { class: "row" }, h("span", { class: "label" }, "Your card"), cardSel) : null,
    h("div", { class: "row", style: "gap:16px" },
      h("button", { class: "btn btn-primary",
        onclick: () => ctx.dispatch("respondCoalition", {
          accept: true,
          partnerCardId: cardSel ? cardSel.value : null
        }) }, "Accept"),
      h("button", { class: "btn",
        onclick: () => ctx.dispatch("respondCoalition", { accept: false }) }, "Decline")));
}

// ---------------------------------------------------------------------------
// Between-turns curtain (phase = "betweenTurns")
// ---------------------------------------------------------------------------
export function betweenTurnsCurtain(ctx) {
  const { state } = ctx;
  const at = state.players[state.turn.betweenTurnsAt];
  if (!at) return h("div", { class: "curtain" }, "...");

  return h("div", { class: "curtain" },
    h("span", { class: "label" }, "Between turns — pass the device"),
    h("h2", { style: `color:${at.color}` }, `${at.name}, your window`),
    h("p", { class: "muted" }, "Play an interrupt conspiracy card now, or pass."),
    conspiracyInterruptRow(ctx, at),
    h("button", { class: "btn btn-lg",
      onclick: () => ctx.dispatch("passBetweenTurns") }, "Pass →"));
}

function conspiracyInterruptRow(ctx, player) {
  const interrupts = player.hand
    .filter((cid) => CONSPIRACY_BY_ID[cid]?.canInterrupt)
    .map((cid) => ({ value: cid, label: CONSPIRACY_BY_ID[cid].name }));
  if (interrupts.length === 0) return h("p", { class: "muted" }, "No interrupt cards.");
  const sel = select(interrupts);
  return h("div", { class: "row", style: "gap:8px" },
    sel,
    h("button", { class: "btn btn-sm",
      onclick: () => ctx.dispatch("playConspiracy", { cardId: sel.value, playerId: player.id }) }, "Play interrupt"));
}

// ---------------------------------------------------------------------------
// Read-aloud curtain (phase = "readAloud")
// ---------------------------------------------------------------------------
export function readAloudCurtain(ctx) {
  const { state } = ctx;
  const me = state.players[state.turn.current];
  const card = DILEMMA_BY_ID[state.turn.pendingDilemma];

  narrateDilemma(card);

  return h("div", { class: "curtain" },
    h("span", { class: "label" }, "Read aloud"),
    h("h2", { style: `color:${me.color}` }, `${me.name}'s dilemma`),
    card ? h("p", { style: "max-width:480px;text-align:center" }, card.question) : null,
    h("p", { class: "muted" }, "Read the question aloud for all players to hear."),
    h("button", { class: "btn btn-lg",
      onclick: () => ctx.dispatch("doneReadAloud") }, "Done — everyone heard it"));
}

// ---------------------------------------------------------------------------
// Handoff curtain
// ---------------------------------------------------------------------------
export function handoffCurtain(ctx) {
  const { state } = ctx;
  const next = state.players[state.turn.current];
  return h("div", { class: "curtain" },
    h("span", { class: "label" }, "Pass the device"),
    h("h2", { style: `color:${next.color}` }, `${next.name}, you're up`),
    h("p", {}, "Make sure no one else can see the screen."),
    h("button", { class: "btn btn-lg",
      onclick: () => ctx.dispatch("revealTurn") }, `I'm ${next.name} — reveal my turn`));
}

// ---------------------------------------------------------------------------
// Game-over screen (phase = "gameover")
// ---------------------------------------------------------------------------
export function gameOverScreen(ctx) {
  const { state } = ctx;
  if (!state.winner && state.winner !== 0) return endgameScreen(ctx);
  return endgameScreen(ctx);
}

export function endgameScreen(ctx) {
  const { state } = ctx;
  const rows = standings(state);
  const winner = state.winner != null ? state.winner : (rows[0] ? rows[0].playerId : 0);
  const winnerName = state.players[winner] ? state.players[winner].name : "—";

  const table = h("table", { class: "standings" },
    h("tr", {},
      h("th", {}, "Politician"),
      h("th", {}, "Zones"),
      h("th", {}, "Voters"),
      h("th", {}, "Flipped")),
    ...rows.map((s) => h("tr", { class: s.playerId === winner ? "winner" : null },
      h("td", {}, s.name),
      h("td", {}, String(s.zones)),
      h("td", {}, String(s.voters)),
      h("td", {}, String(s.score)))));

  const recap = h("div", { class: "recap" },
    ...(state.log || []).slice(-14).map((l) => h("div", {}, l)));

  return h("div", {},
    masthead(ctx, `${winnerName} forms the government`),
    h("div", { class: "panel pop" },
      h("h3", {}, "Final standings"),
      table,
      h("hr", { class: "rule" }),
      h("div", { class: "label" }, "How the nation voted"),
      recap,
      h("hr", { class: "rule" }),
      h("button", { class: "btn btn-primary",
        onclick: () => ctx.dispatch("clearSave") }, "New game")));
}
