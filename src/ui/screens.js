import { renderMap } from "./map.js";
import { DILEMMA_BY_ID } from "../data/dilemmas.js";
import { VOTER_MARKET, VOTER_BY_ID, VOLATILE_COST } from "../data/voters.js";
import { CONSPIRACY_BY_ID } from "../data/conspiracies.js";
import { POWERS } from "../engine/archetypes.js";
import { IDEOLOGIES, RESOURCES, RESOURCE_OF, tierOf } from "../engine/constants.js";
import {
  canPlaceInZone, canReachZone, totalPegs, zoneCapacity, majorityThreshold, standings, neighborsOf
} from "../engine/rules.js";

const COLORS = ["#b3472f", "#2f6aa8", "#caa12f", "#7a3f9d", "#2f7d54"];
const RES_LABEL = { funds: "Funds", clout: "Clout", media: "Media", trust: "Trust" };

// --- tiny DOM helper --------------------------------------------------------
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
function costLabel(cost) { return Object.entries(cost).map(([r, n]) => `${n} ${r}`).join(" · "); }
function resourceChips(player) {
  return h("div", { class: "chips" },
    ...RESOURCES.map((r) => h("span", { class: `chip ${r}` }, `${RES_LABEL[r]}: ${player.resources[r]}`)));
}
function masthead(sub) {
  return h("header", { class: "masthead" }, h("h1", {}, "SHASN"), h("span", { class: "label" }, sub));
}

// --- setup ------------------------------------------------------------------
export function setupScreen(ctx) {
  const root = h("div");
  root.appendChild(masthead("A pass-and-play political strategy game"));
  const rows = [];
  for (let i = 0; i < 5; i++) {
    const input = h("input", { type: "text", value: `Player ${i + 1}`, "aria-label": `Player ${i + 1} name`, maxlength: "16" });
    const row = h("div", { class: "setup-player", style: i < 2 ? "" : "display:none" },
      h("span", { class: "swatch", style: `background:${COLORS[i]}` }), input);
    row._input = input;
    rows.push(row);
  }
  const count = select([2, 3, 4, 5].map((n) => ({ value: String(n), label: `${n} players` })), "2");
  count.addEventListener("change", () => {
    const c = Number(count.value);
    rows.forEach((row, i) => { row.style.display = i < c ? "" : "none"; });
  });
  const begin = h("button", { class: "btn btn-primary btn-lg", onclick: () => {
    const c = Number(count.value);
    const players = rows.slice(0, c).map((row, i) => ({ name: row._input.value.trim() || `Player ${i + 1}`, color: COLORS[i] }));
    ctx.dispatch("newGame", { players });
  } }, "Begin the campaign");
  root.appendChild(h("div", { class: "panel stack pop" },
    h("h3", {}, "Who's running?"),
    h("div", { class: "row" }, h("span", { class: "label" }, "Players"), count),
    ...rows,
    h("hr", { class: "rule" }),
    h("p", { class: "muted" }, "Each turn you answer a dilemma for ideology resources, then spend them to place voters across nine constituencies. Lock a majority everywhere to end the game — most zones held wins."),
    begin));
  return root;
}

// --- starting-resource draft ------------------------------------------------
export function draftScreen(ctx) {
  const { state } = ctx;
  const p = state.players[state.turn.current];
  const root = h("div");
  root.appendChild(masthead("Starting draft — claim your opening resources"));

  const picker = h("div", { class: "chips draft-pick" },
    ...RESOURCES.map((r) => h("button", { class: `chip-btn ${r}`, onclick: () => ctx.dispatch("draftResource", { resource: r }) },
      h("span", { class: `dot ${r}` }), RES_LABEL[r])));

  const tally = h("div", { class: "stack" },
    ...state.players.map((pl) => h("div", { class: "pile-row" + (pl.id === p.id ? " active" : "") },
      h("span", {}, h("span", { class: "swatch", style: `background:${pl.color}` }), " ", pl.name),
      resourceChips(pl))));

  root.appendChild(h("div", { class: "panel stack pop" },
    h("h3", {}, `${p.name}, pick ${state.turn.draftRemaining} resource${state.turn.draftRemaining > 1 ? "s" : ""}`),
    h("p", { class: "muted" }, "Player 1 drafts 1, Player 2 drafts 2, and so on — the later you place on the board, the more you start with."),
    picker,
    h("hr", { class: "rule" }),
    tally));
  return root;
}

// --- turn -------------------------------------------------------------------
export function turnScreen(ctx) {
  const { state, ui } = ctx;
  const me = state.players[state.turn.current];
  const root = h("div");
  if (ui.error) root.appendChild(h("div", { class: "err", role: "alert" }, ui.error));
  root.appendChild(masthead(`${me.name}'s turn · ${state.turn.phase === "dilemma" ? "answer the dilemma" : "spend & maneuver"}`));
  if (state.lastHeadline) root.appendChild(headlineBanner(ctx, state.lastHeadline));

  const placingOffer = ui.placing ? VOTER_BY_ID[ui.placing] : null;
  let selectable = [];
  if (placingOffer) {
    selectable = state.zones
      .filter((z) => canPlaceInZone(state, me.id, z.id) && (zoneCapacity(z.id) - totalPegs(z)) >= placingOffer.value)
      .map((z) => z.id);
  }
  const canAffordVol = RESOURCES.every((r) => me.resources[r] >= (VOLATILE_COST[r] || 0));
  const volatileZoneIds = state.turn.phase === "actions" && canAffordVol
    ? state.zones.filter((z) => z.volatileOwner === null && canReachZone(state, me.id, z.id)).map((z) => z.id)
    : [];

  const map = renderMap(state, {
    selectableZoneIds: selectable,
    onZoneClick: (zoneId) => ctx.dispatch("buyVoter", { offerId: ui.placing, zoneId }),
    volatileZoneIds,
    onVolatileClick: (zoneId) => ctx.dispatch("occupyVolatile", { zoneId })
  });
  const mapCol = h("div", {}, map,
    h("p", { class: "map-legend muted" }, "⚡ volatile seat — costs 1 Clout + 1 Media, can't be gerrymandered, and triggers a Headline."));

  const panel = h("div", {}, playerPanel(ctx, me), marketPanel(ctx, me), conspiracyPanel(ctx, me), gerrymanderPanel(ctx, me), endPanel(ctx));
  root.appendChild(h("div", { class: "turn-grid" }, mapCol, panel));
  if (state.turn.phase === "dilemma") root.appendChild(dilemmaModal(ctx, me));
  return root;
}

function headlineBanner(ctx, hl) {
  return h("div", { class: "headline pop" },
    h("span", { class: "tag" }, "Headline"),
    h("strong", {}, ` ${hl.name} `),
    h("span", { class: "muted" }, `— ${hl.text}`));
}

function playerPanel(ctx, me) {
  const piles = h("div", {});
  for (const ide of IDEOLOGIES) {
    const count = me.piles[ide];
    const tier = tierOf(count);
    const unlocked = [1, 2, 3].filter((t) => tier >= t).map((t) => POWERS[ide].tiers[t].label).join(", ");
    piles.appendChild(h("div", { class: "pile-row" },
      h("span", {}, h("span", { class: `dot ${RESOURCE_OF[ide]}` }), " ", h("strong", {}, POWERS[ide].name.replace("The ", "")), ` · ${count}`),
      h("span", { class: "pow muted" }, tier ? unlocked : "—")));
    const controls = activePowerControls(ctx, me, ide, tier);
    if (controls) piles.appendChild(controls);
  }
  return h("div", { class: "panel" },
    h("h3", {}, me.name),
    resourceChips(me),
    h("hr", { class: "rule" }),
    h("div", { class: "label" }, "Ideology piles & powers"),
    piles);
}

function activePowerControls(ctx, me, ide, tier) {
  const { state } = ctx;
  const wrap = h("div", { class: "row power-row" });
  let any = false;
  const inActions = state.turn.phase === "actions";
  if (ide === "capitalist" && tier >= 1 && inActions && !me.usedThisTurn["capitalist:t1"] && !me.usedThisTurn["capitalist:discountReady"]) {
    any = true;
    wrap.appendChild(h("button", { class: "btn btn-sm", onclick: () => ctx.dispatch("usePower", { ideology: "capitalist", tier: 1 }) }, "Bankroll (−1 next voter)"));
  }
  if (ide === "capitalist" && tier >= 2 && inActions && !me.usedThisTurn["capitalist:t2"]) {
    any = true;
    const g1 = select(RESOURCES.map((r) => ({ value: r, label: r })), "media");
    const g2 = select(RESOURCES.map((r) => ({ value: r, label: r })), "trust");
    wrap.appendChild(h("span", { class: "cost-mini" }, "Liquidate 3 funds →"));
    wrap.appendChild(g1); wrap.appendChild(g2);
    wrap.appendChild(h("button", { class: "btn btn-sm", onclick: () => {
      const gain = {}; gain[g1.value] = (gain[g1.value] || 0) + 1; gain[g2.value] = (gain[g2.value] || 0) + 1;
      ctx.dispatch("usePower", { ideology: "capitalist", tier: 2, params: { gain } });
    } }, "Convert"));
  }
  if (ide === "supremo" && tier >= 2 && inActions && !me.usedThisTurn["supremo:t2"]) {
    const targets = pegTargets(state, me.id, { requirePresence: true });
    if (targets.length) {
      any = true;
      const sel = select(targets.map((t) => ({ value: t.key, label: t.label })));
      wrap.appendChild(h("span", { class: "cost-mini" }, "Intimidate")); wrap.appendChild(sel);
      wrap.appendChild(h("button", { class: "btn btn-sm", onclick: () => {
        const t = targets.find((x) => x.key === sel.value);
        ctx.dispatch("usePower", { ideology: "supremo", tier: 2, params: { zoneId: t.zoneId, pegOwner: t.pegOwner } });
      } }, "Remove peg"));
    }
  }
  if (ide === "idealist" && tier >= 3 && inActions && !me.usedThisTurn["idealist:t3"]) {
    const targets = pegTargets(state, me.id, { adjacentToPresence: true });
    if (targets.length) {
      any = true;
      const sel = select(targets.map((t) => ({ value: t.key, label: t.label })));
      wrap.appendChild(h("span", { class: "cost-mini" }, "Sway")); wrap.appendChild(sel);
      wrap.appendChild(h("button", { class: "btn btn-sm", onclick: () => {
        const t = targets.find((x) => x.key === sel.value);
        ctx.dispatch("usePower", { ideology: "idealist", tier: 3, params: { zoneId: t.zoneId, pegOwner: t.pegOwner } });
      } }, "Sway peg"));
    }
  }
  return any ? wrap : null;
}

function pegTargets(state, meId, { requirePresence = false, adjacentToPresence = false } = {}) {
  const out = [];
  for (const z of state.zones) {
    if (requirePresence && (z.pegs[meId] || 0) <= 0) continue;
    if (adjacentToPresence && !neighborsOf(z.id).some((nId) => (state.zones.find((x) => x.id === nId).pegs[meId] || 0) > 0)) continue;
    const need = majorityThreshold(z.id);
    for (const [pid, n] of Object.entries(z.pegs)) {
      if (Number(pid) === meId || n >= need) continue;
      out.push({ key: `${z.id}:${pid}`, zoneId: z.id, pegOwner: Number(pid), label: `${z.id} · ${state.players[pid].name}` });
    }
  }
  return out;
}

function marketPanel(ctx, me) {
  const { state, ui } = ctx;
  const inActions = state.turn.phase === "actions";
  const items = VOTER_MARKET.map((o) => h("div", { class: "market-item" },
    h("span", {}, h("strong", {}, o.label), ` · ${o.value} vote${o.value > 1 ? "s" : ""}`, h("div", { class: "cost-mini" }, costLabel(o.cost))),
    h("button", { class: "btn btn-sm" + (ui.placing === o.id ? " btn-primary" : ""), disabled: !inActions ? "disabled" : null,
      onclick: () => ctx.setUi({ placing: ui.placing === o.id ? null : o.id, error: null }) }, ui.placing === o.id ? "Choosing…" : "Place")));
  const hint = ui.placing
    ? h("p", { class: "muted" }, "Click a highlighted constituency on the map. ",
        h("button", { class: "btn btn-sm", onclick: () => ctx.setUi({ placing: null }) }, "Cancel"))
    : null;
  return h("div", { class: "panel" }, h("h3", {}, "Voter market"), ...items, hint);
}

function conspiracyPanel(ctx, me) {
  const { state } = ctx;
  const inActions = state.turn.phase === "actions";
  const inputs = {};
  const spendRow = h("div", { class: "row" });
  for (const r of RESOURCES) {
    const inp = h("input", { type: "number", min: "0", max: "5", value: "0", style: "width:50px", "aria-label": `spend ${r}` });
    inputs[r] = inp;
    spendRow.appendChild(h("label", { class: "cost-mini spend-lbl" }, h("span", { class: `dot ${r}` }), inp));
  }
  const min = tierOf(me.piles.showstopper) >= 2 ? 3 : 4;
  const buy = h("button", { class: "btn btn-sm", disabled: !inActions ? "disabled" : null, onclick: () => {
    const spend = {};
    for (const r of RESOURCES) { const v = Number(inputs[r].value) || 0; if (v > 0) spend[r] = v; }
    ctx.dispatch("buyConspiracy", { spend });
  } }, `Buy (spend ${min}–5)`);
  const hand = h("div", {});
  if (me.hand.length === 0) hand.appendChild(h("p", { class: "muted" }, "No conspiracies in hand."));
  for (const cardId of me.hand) hand.appendChild(handCard(ctx, me, cardId));
  return h("div", { class: "panel" },
    h("h3", {}, "Conspiracies"),
    h("div", { class: "label" }, "Buy a blind card"),
    spendRow, buy,
    h("hr", { class: "rule" }),
    h("div", { class: "label" }, "Your hand (secret)"),
    hand);
}

function handCard(ctx, me, cardId) {
  const { state } = ctx;
  const card = CONSPIRACY_BY_ID[cardId];
  const controls = h("div", { class: "row", style: "margin-top:6px" });
  const others = state.players.filter((p) => p.id !== me.id).map((p) => ({ value: String(p.id), label: p.name }));
  const myLocked = state.zones.filter((z) => z.lockedBy === me.id).map((z) => ({ value: z.id, label: z.id }));
  const removable = pegTargets(state, me.id, {});
  let getTarget = () => ({});
  if (card.effect.type === "stealResource" || card.effect.type === "forceDiscardConspiracy") {
    const sel = select(others.length ? others : [{ value: "", label: "—" }]);
    controls.appendChild(h("span", { class: "cost-mini" }, "Target")); controls.appendChild(sel);
    getTarget = () => ({ playerId: Number(sel.value) });
  } else if (card.effect.type === "removePeg") {
    const sel = select(removable.length ? removable.map((t) => ({ value: t.key, label: t.label })) : [{ value: "", label: "no targets" }]);
    controls.appendChild(h("span", { class: "cost-mini" }, "Peg")); controls.appendChild(sel);
    getTarget = () => { const t = removable.find((x) => x.key === sel.value); return t ? { zoneId: t.zoneId, pegOwner: t.pegOwner } : {}; };
  } else if (card.effect.type === "protectMajority") {
    const sel = select(myLocked.length ? myLocked : [{ value: "", label: "no held zones" }]);
    controls.appendChild(h("span", { class: "cost-mini" }, "Zone")); controls.appendChild(sel);
    getTarget = () => ({ zoneId: sel.value });
  }
  controls.appendChild(h("button", { class: "btn btn-sm", onclick: () => ctx.dispatch("playConspiracy", { cardId, target: getTarget() }) }, "Play"));
  return h("div", { class: "hand-card" },
    h("h4", {}, card.name, " ", card.canInterrupt ? h("span", { class: "tag" }, "interrupt") : null),
    h("div", { class: "cost-mini" }, card.text), controls);
}

function gerrymanderPanel(ctx, me) {
  const { state } = ctx;
  if (state.turn.gerrymanders <= 0) return h("div");
  const moves = [];
  for (const z of state.zones) {
    const need = majorityThreshold(z.id);
    for (const [pid, n] of Object.entries(z.pegs)) {
      if (n >= need) continue;
      for (const nId of neighborsOf(z.id)) {
        const dest = state.zones.find((x) => x.id === nId);
        if (totalPegs(dest) >= zoneCapacity(nId)) continue;
        moves.push({ key: `${z.id}>${nId}:${pid}`, fromZone: z.id, toZone: nId, pegOwner: Number(pid), label: `${state.players[pid].name}: ${z.id} → ${nId}` });
      }
    }
  }
  const body = h("div", { class: "stack" });
  if (moves.length === 0) body.appendChild(h("p", { class: "muted" }, "No legal gerrymander moves."));
  else {
    const sel = select(moves.map((m) => ({ value: m.key, label: m.label })));
    body.appendChild(sel);
    body.appendChild(h("button", { class: "btn btn-sm", onclick: () => {
      const m = moves.find((x) => x.key === sel.value);
      ctx.dispatch("gerrymander", { fromZone: m.fromZone, toZone: m.toZone, pegOwner: m.pegOwner });
    } }, "Move a voter"));
  }
  return h("div", { class: "panel" }, h("div", { class: "banner pop" }, `Gerrymander available × ${state.turn.gerrymanders}`), h("div", { style: "margin-top:8px" }, body));
}

function endPanel(ctx) {
  const { state } = ctx;
  const inActions = state.turn.phase === "actions";
  const rows = standings(state).map((s) => h("li", {}, `${s.name}: ${s.zones} zones, ${s.pegs} votes`));
  return h("div", { class: "panel" },
    h("h3", {}, "Standings"),
    h("ul", { class: "tally" }, ...rows),
    h("hr", { class: "rule" }),
    h("button", { class: "btn btn-primary", disabled: !inActions ? "disabled" : null, onclick: () => ctx.dispatch("endTurn") }, "End turn →"));
}

function dilemmaModal(ctx, me) {
  const { state } = ctx;
  const card = DILEMMA_BY_ID[state.turn.pendingDilemma];
  const cardEl = h("div", { class: "modal dilemma-card pop" },
    h("span", { class: "label" }, `${me.name} — a dilemma`),
    h("h3", {}, card.question));
  const mkAnswer = (idx) => {
    // Neutral styling — the ideology/payout must stay hidden until the player commits.
    const btn = h("button", { class: "answer" }, card.answers[idx].label);
    btn.addEventListener("click", () => animateAnswer(ctx, cardEl, card.answers[idx], idx));
    return btn;
  };
  cardEl.appendChild(mkAnswer(0));
  cardEl.appendChild(mkAnswer(1));
  if (tierOf(me.piles.showstopper) >= 1 && !me.usedThisTurn["showstopper:t1"]) {
    cardEl.appendChild(h("div", { class: "row", style: "margin-top:12px;justify-content:flex-end" },
      h("button", { class: "btn btn-sm", onclick: () => ctx.dispatch("spinDilemma") }, "↻ Spin (Showstopper)")));
  }
  return h("div", { class: "modal-scrim" }, cardEl);
}

// Card flips to the chosen ideology's color; reward tokens appear and fly to your stash.
function animateAnswer(ctx, cardEl, answer, idx) {
  if (cardEl.dataset.answered) return;
  cardEl.dataset.answered = "1";
  cardEl.classList.add("answered", `accent-${answer.ideology}`);
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
  requestAnimationFrame(() => requestAnimationFrame(() => burst.classList.add("fly")));
  setTimeout(() => ctx.dispatch("answerDilemma", { answerIndex: idx }), 900);
}

// --- handoff ----------------------------------------------------------------
export function handoffCurtain(ctx) {
  const { state } = ctx;
  const next = state.players[state.turn.current];
  return h("div", { class: "curtain" },
    h("span", { class: "label" }, "Pass the device"),
    h("h2", { style: `color:${next.color}` }, `${next.name}, you're up`),
    h("p", {}, "Make sure no one else can see the screen."),
    h("button", { class: "btn btn-lg", onclick: () => ctx.dispatch("revealTurn") }, `I'm ${next.name} — reveal my turn`));
}

// --- endgame ----------------------------------------------------------------
export function endgameScreen(ctx) {
  const { state } = ctx;
  const rows = standings(state);
  const table = h("table", { class: "standings" },
    h("tr", {}, h("th", {}, "Politician"), h("th", {}, "Zones"), h("th", {}, "Votes")),
    ...rows.map((s) => h("tr", { class: s.playerId === state.winner ? "winner" : null },
      h("td", {}, s.name), h("td", {}, String(s.zones)), h("td", {}, String(s.pegs)))));
  const recap = h("div", { class: "recap" }, ...state.log.slice(-14).map((l) => h("div", {}, l)));
  return h("div", {},
    masthead(`${state.players[state.winner].name} forms the government`),
    h("div", { class: "panel pop" }, h("h3", {}, "Final standings"), table,
      h("hr", { class: "rule" }), h("div", { class: "label" }, "How the nation voted"), recap,
      h("hr", { class: "rule" }),
      h("button", { class: "btn btn-primary", onclick: () => ctx.dispatch("clearSave") }, "New game")));
}
