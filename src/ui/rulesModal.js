import { RULES_SECTIONS, RULES_BY_ID } from "../data/rules.js";

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

export function rulesModal(ctx) {
  const { ui } = ctx;
  const currentId = ui.rulesSection || "overview";
  const current = RULES_BY_ID[currentId] || RULES_SECTIONS[0];

  const nav = h("nav", { class: "rules-nav" },
    ...RULES_SECTIONS.map((s) => h("button", {
      class: "rules-nav-btn" + (s.id === currentId ? " active" : ""),
      onclick: () => ctx.setUi({ rulesSection: s.id })
    }, s.title))
  );

  const body = h("div", { class: "rules-body" },
    h("h2", {}, current.title),
    h("p", {}, current.body)
  );

  const close = h("button", {
    class: "btn rules-close",
    onclick: () => ctx.setUi({ rulesOpen: false })
  }, "Close");

  const modal = h("div", { class: "rules-modal pop" }, nav, body, close);
  return h("div", { class: "modal-scrim rules-scrim" }, modal);
}
