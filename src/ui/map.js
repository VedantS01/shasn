import { ZONES, ZONE_BY_ID } from "../data/map.js";
import { totalPegs, zoneCapacity } from "../engine/rules.js";

const NS = "http://www.w3.org/2000/svg";
const C = { x: 380, y: 330 };
const R_INNER = 110;
const R_OUTER = 258;
const HALF = 22.5;            // sector half-angle
const SEAT_R = 9;
const VOL_R = 12;

function el(name, attrs = {}, text) {
  const node = document.createElementNS(NS, name);
  for (const [k, v] of Object.entries(attrs)) { if (v != null) node.setAttribute(k, v); }
  if (text != null) node.textContent = text;
  return node;
}
function polar(deg, r) {
  const a = (deg * Math.PI) / 180;
  return { x: C.x + r * Math.sin(a), y: C.y - r * Math.cos(a) };
}

// annular wedge path for a province sector centred on `mid`
function sectorPath(mid, r1, r2) {
  const a0 = mid - HALF, a1 = mid + HALF;
  const i0 = polar(a0, r1), o0 = polar(a0, r2), o1 = polar(a1, r2), i1 = polar(a1, r1);
  return `M${i0.x.toFixed(1)},${i0.y.toFixed(1)} L${o0.x.toFixed(1)},${o0.y.toFixed(1)} ` +
    `A${r2},${r2} 0 0 1 ${o1.x.toFixed(1)},${o1.y.toFixed(1)} L${i1.x.toFixed(1)},${i1.y.toFixed(1)} ` +
    `A${r1},${r1} 0 0 0 ${i0.x.toFixed(1)},${i0.y.toFixed(1)} Z`;
}

// seat-circle positions for a zone (normal seats), plus the volatile seat position
function seatLayout(zone) {
  const cap = zone.capacity;
  if (zone.ring === "center") {
    const seats = [{ x: C.x, y: C.y + 6 }];
    for (const [r, n] of [[42, 5], [76, 5]]) {
      for (let i = 0; i < n && seats.length < cap; i++) {
        const a = (i / n) * 360 + 18;
        seats.push({ x: C.x + r * Math.sin((a * Math.PI) / 180), y: C.y + 6 - r * Math.cos((a * Math.PI) / 180) });
      }
    }
    return { seats, volatile: { x: C.x, y: C.y - 84 } };
  }
  const mid = zone.ring;
  const rings = [R_INNER + 44, R_INNER + 96];
  const perRing = Math.ceil(cap / rings.length);
  const seats = [];
  let placed = 0;
  for (let ri = 0; ri < rings.length && placed < cap; ri++) {
    const n = Math.min(perRing, cap - placed);
    const span = HALF - 7;
    for (let i = 0; i < n; i++) {
      const t = n === 1 ? 0 : (i / (n - 1)) * 2 - 1;
      seats.push(polar(mid + t * span, rings[ri]));
      placed++;
    }
  }
  return { seats, volatile: polar(mid, R_OUTER - 28) };
}

// Per-owner vote tally for a zone (circles + the volatile seat), used for the
// "who holds how many" sub-label under each region.
function tallyByOwner(state, zs) {
  const counts = new Map();
  for (const s of zs.seats) if (s !== null) counts.set(s, (counts.get(s) || 0) + 1);
  if (zs.volatileOwner !== null) counts.set(zs.volatileOwner, (counts.get(zs.volatileOwner) || 0) + 1);
  return counts;
}

export function renderMap(state, opts = {}) {
  const {
    placeableZoneIds = [], onSeatClick = () => {},
    onVolatileClick = null, volatileZoneIds = []
  } = opts;
  const svg = el("svg", { viewBox: "0 0 760 680", class: "map", role: "group", "aria-label": "Constituency map" });

  // soft coastline backdrop
  svg.appendChild(el("circle", { cx: C.x, cy: C.y, r: R_OUTER + 8, class: "coast" }));

  for (const z of ZONES) {
    const zs = state.zones.find((s) => s.id === z.id);
    const placeable = placeableZoneIds.includes(z.id);
    const locked = zs.lockedBy !== null;
    const lockColor = locked ? state.players[zs.lockedBy].color : null;

    // region shape
    const shape = z.ring === "center"
      ? el("circle", { cx: C.x, cy: C.y, r: R_INNER - 4 })
      : el("path", { d: sectorPath(z.ring, R_INNER + 6, R_OUTER) });
    shape.setAttribute("class", `zone-shape${locked ? " locked" : ""}${placeable ? " placeable" : ""}`);
    if (locked) shape.setAttribute("style", `fill:${lockColor}22`);
    svg.appendChild(shape);

    // label outside the ring (or top of centre): name, fill count, and per-player votes
    const labelPos = z.ring === "center" ? { x: C.x, y: C.y - 96 } : polar(z.ring, R_OUTER + 30);
    svg.appendChild(el("text", { x: labelPos.x, y: labelPos.y, class: "zone-name", "text-anchor": "middle" }, z.name));
    svg.appendChild(el("text", { x: labelPos.x, y: labelPos.y + 15, class: "zone-sub", "text-anchor": "middle" },
      `${totalPegs(zs)}/${zoneCapacity(z.id)}${locked ? " ★ " + state.players[zs.lockedBy].name : ""}`));
    // colored vote-count pips: one labelled dot per player holding seats here
    const tally = tallyByOwner(state, zs);
    if (tally.size) {
      const entries = [...tally.entries()];
      const startX = labelPos.x - (entries.length - 1) * 11;
      entries.forEach(([pid, n], k) => {
        const cx = startX + k * 22, cy = labelPos.y + 30;
        svg.appendChild(el("circle", { cx, cy, r: 7, class: "vote-pip", fill: state.players[pid].color }));
        svg.appendChild(el("text", { x: cx, y: cy + 3.5, class: "vote-pip-n", "text-anchor": "middle" }, String(n)));
      });
    }

    // seats — each circle is one vote slot; empty ones become clickable while placing
    const { seats, volatile } = seatLayout(z);
    seats.forEach((pt, i) => {
      const owner = zs.seats[i];
      const filled = owner != null;
      const open = !filled && placeable;
      const seat = el("circle", {
        cx: pt.x.toFixed(1), cy: pt.y.toFixed(1), r: SEAT_R,
        class: `seat${filled ? " filled" : ""}${open ? " placeable" : ""}`,
        fill: filled ? state.players[owner].color : null
      });
      if (open) seat.addEventListener("click", (e) => { if (e && e.stopPropagation) e.stopPropagation(); onSeatClick(z.id, i); });
      svg.appendChild(seat);
    });

    // volatile seat — marked, clickable
    const volTaken = zs.volatileOwner !== null;
    const volSelectable = volatileZoneIds.includes(z.id);
    const vol = el("circle", {
      cx: volatile.x.toFixed(1), cy: volatile.y.toFixed(1), r: VOL_R,
      class: `vol-seat${volTaken ? " filled" : ""}${volSelectable ? " selectable" : ""}`,
      fill: volTaken ? state.players[zs.volatileOwner].color : null
    });
    if (volSelectable && onVolatileClick) {
      vol.addEventListener("click", (e) => { if (e && e.stopPropagation) e.stopPropagation(); onVolatileClick(z.id); });
    }
    svg.appendChild(vol);
    svg.appendChild(el("text", { x: volatile.x.toFixed(1), y: (volatile.y + 4).toFixed(1), class: "vol-mark", "text-anchor": "middle" }, "⚡"));
  }
  return svg;
}

export { ZONE_BY_ID };
