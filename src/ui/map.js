import { ZONES } from "../data/map.js";
import { totalPegs } from "../engine/rules.js";

const NS = "http://www.w3.org/2000/svg";

// All zone paths have the form "Mx1,y1 Hx2 Vy2 Hx1 Z" — parse the bounding box.
function boxOf(svgPath) {
  const m = svgPath.match(/M([\d.]+),([\d.]+)\s*H([\d.]+)\s*V([\d.]+)/);
  const [x1, y1, x2, y2] = [+m[1], +m[2], +m[3], +m[4]];
  return { x: x1, y: y1, w: x2 - x1, h: y2 - y1 };
}

function el(name, attrs = {}, text) {
  const node = document.createElementNS(NS, name);
  for (const [k, v] of Object.entries(attrs)) node.setAttribute(k, v);
  if (text != null) node.textContent = text;
  return node;
}

// renderMap(state, { selectableZoneIds, onZoneClick }) -> SVGElement
export function renderMap(state, { selectableZoneIds = [], onZoneClick = () => {} } = {}) {
  const svg = el("svg", { viewBox: "0 0 600 600", class: "map", role: "group", "aria-label": "Constituency map" });

  for (const z of ZONES) {
    const zs = state.zones.find((s) => s.id === z.id);
    const box = boxOf(z.svgPath);
    const selectable = selectableZoneIds.includes(z.id);

    const path = el("path", {
      d: z.svgPath,
      class: `zone-shape${zs.lockedBy !== null ? " locked" : ""}${selectable ? " selectable" : ""}`
    });
    if (selectable) {
      path.addEventListener("click", () => onZoneClick(z.id));
      const t = el("title", {}, `Place in ${z.name}`);
      path.appendChild(t);
    }
    svg.appendChild(path);

    svg.appendChild(el("text", { x: box.x + 10, y: box.y + 22, class: "zone-name" }, z.name));
    svg.appendChild(el("text", { x: box.x + 10, y: box.y + 38, class: "zone-sub" },
      `${totalPegs(zs)}/${z.capacity}${zs.lockedBy !== null ? ` · ★ ${state.players[zs.lockedBy].name}` : ""}`));

    // pegs as a small grid below the labels
    let i = 0;
    const perRow = Math.max(3, Math.floor((box.w - 16) / 16));
    for (const [pid, n] of Object.entries(zs.pegs)) {
      const color = state.players[pid].color;
      for (let k = 0; k < n; k++) {
        svg.appendChild(el("circle", {
          cx: box.x + 16 + (i % perRow) * 16,
          cy: box.y + 54 + Math.floor(i / perRow) * 16,
          r: 6, fill: color, class: "peg"
        }));
        i++;
      }
    }
  }
  return svg;
}
