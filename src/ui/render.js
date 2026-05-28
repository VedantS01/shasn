import {
  setupScreen,
  draftScreen,
  turnScreen,
  handoffCurtain,
  endgameScreen,
  readAloudCurtain,
  tradeAcceptCurtain,
  coalitionAcceptCurtain,
  betweenTurnsCurtain,
  gameOverScreen
} from "./screens.js";
import { rulesModal } from "./rulesModal.js";

// ctx = { state, ui, dispatch(action, payload), setUi(patch) }
export function render(root, ctx) {
  // Clear root — fall back to innerHTML if removeChild isn't available (test shim).
  if (root.innerHTML !== undefined) {
    root.innerHTML = "";
  } else {
    while (root.firstChild) root.removeChild(root.firstChild);
  }

  const { state, ui } = ctx;

  if (!state || ui.mode === "setup") { root.appendChild(setupScreen(ctx)); }
  else if (ui.mode === "handoff") { root.appendChild(handoffCurtain(ctx)); }
  else if (state.turn.phase === "draft") { root.appendChild(draftScreen(ctx)); }
  else if (state.turn.phase === "gameover") { root.appendChild(gameOverScreen(ctx)); }
  else if (state.turn.phase === "readAloud") { root.appendChild(readAloudCurtain(ctx)); }
  else if (state.turn.phase === "tradeAccept") { root.appendChild(tradeAcceptCurtain(ctx)); }
  else if (state.turn.phase === "coalitionAccept") { root.appendChild(coalitionAcceptCurtain(ctx)); }
  else if (state.turn.phase === "betweenTurns") { root.appendChild(betweenTurnsCurtain(ctx)); }
  else {
    // dilemma / discard / placePending / actions — all show the turn screen
    // (with appropriate modal/banner embedded)
    root.appendChild(turnScreen(ctx));
  }

  // Rules modal overlays on top of whatever screen is active
  if (ctx.ui && ctx.ui.rulesOpen) root.appendChild(rulesModal(ctx));
}
