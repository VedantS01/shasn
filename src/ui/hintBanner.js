// Context-aware hint banner for the turn screen.
// Returns a DOM element or null if there is no hint for the current phase.

function h(tag, attrs = {}, ...kids) {
  const n = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (v == null || v === false) continue;
    if (k === "class") n.className = v;
    else if (k === "onclick") n.addEventListener("click", v);
    else n.setAttribute(k, v);
  }
  for (const kid of kids.flat()) {
    if (kid == null || kid === false) continue;
    n.appendChild(typeof kid === "string" ? document.createTextNode(kid) : kid);
  }
  return n;
}

export function hintBanner(ctx) {
  const { state, ui } = ctx;
  if (!state) return null;
  const phase = state.turn.phase;
  const me = state.players[state.turn.current];

  let msg = null;

  if (phase === "dilemma") {
    msg = `${me.name}: read the dilemma aloud, then pick an answer to earn ideology resources.`;
  } else if (phase === "discard") {
    const total = ["funds","clout","media","trust"].reduce((s, r) => s + (me.resources[r] || 0), 0);
    msg = `You have ${total} resources — discard down to 12 before continuing.`;
  } else if (phase === "placePending") {
    msg = `${me.name}: place your ${me.pendingPlacements} pending voter${me.pendingPlacements > 1 ? "s" : ""} on the map.`;
  } else if (phase === "actions") {
    const buy = state.turn.currentBuy;
    if (buy && buy.tokensRemaining > 0) {
      msg = `Place ${buy.tokensRemaining} more voter${buy.tokensRemaining > 1 ? "s" : ""} in the same zone — click a highlighted seat.`;
    } else {
      const gerryZones = Object.entries(state.turn.gerrymanderMoves || {}).filter(([, v]) => v > 0);
      if (gerryZones.length > 0) {
        msg = `You have gerrymander moves available — use them to redraw the map before ending your turn.`;
      } else {
        msg = `Buy Vote Bank cards, play conspiracies, propose trades or coalitions, then end your turn.`;
      }
    }
  } else if (phase === "readAloud") {
    msg = `Read the dilemma question aloud for all players to hear, then tap Done.`;
  } else if (phase === "tradeAccept") {
    const prop = state.turn.pendingProposal;
    if (prop) {
      const from = state.players[prop.from];
      msg = `${from.name} has proposed a trade — the recipient must accept or decline.`;
    }
  } else if (phase === "coalitionAccept") {
    const prop = state.turn.pendingProposal;
    if (prop) {
      const from = state.players[prop.from];
      msg = `${from.name} has proposed a coalition — the recipient must respond.`;
    }
  } else if (phase === "betweenTurns") {
    const at = state.players[state.turn.betweenTurnsAt];
    if (at) msg = `${at.name}: play an interrupt conspiracy if you wish, then pass.`;
  }

  if (!msg) return null;
  return h("div", { class: "hint-banner" }, msg);
}
