import { setupScreen, draftScreen, turnScreen, handoffCurtain, endgameScreen } from "./screens.js";

// ctx = { state, ui, dispatch(action, payload), setUi(patch) }
export function render(root, ctx) {
  root.innerHTML = "";
  const { state, ui } = ctx;
  if (!state || ui.mode === "setup") { root.appendChild(setupScreen(ctx)); return; }
  if (ui.mode === "handoff") { root.appendChild(handoffCurtain(ctx)); return; }
  if (state.turn.phase === "gameover") { root.appendChild(endgameScreen(ctx)); return; }
  if (state.turn.phase === "draft") { root.appendChild(draftScreen(ctx)); return; }
  root.appendChild(turnScreen(ctx));
}
