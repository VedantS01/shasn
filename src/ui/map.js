import { ZONES } from "../data/map.js";
import { hexPath, hexCenter, seatPositions } from "./geometry.js";
import { voteCount } from "../engine/rules.js";

const NS = "http://www.w3.org/2000/svg";
const SEAT_R = 9;
const HEX_SIZE = 110;

function svgEl(name, attrs = {}, text) {
  const node = document.createElementNS(NS, name);
  for (const [k, v] of Object.entries(attrs)) { if (v != null) node.setAttribute(k, v); }
  if (text != null) node.textContent = text;
  return node;
}

// Per-owner vote tally used for pip labels under each zone name.
function tallyByOwner(zoneState) {
  const counts = new Map();
  for (const s of zoneState.seats) {
    if (s !== null) counts.set(s, (counts.get(s) || 0) + 1);
  }
  return counts;
}

export function renderMap(state, opts = {}) {
  const {
    placeableZoneIds = [],
    onSeatClick = () => {},
    gerryFromCandidates = [],   // [{zoneId, seatIndex}]
    onGerrySourceClick = () => {},
    gerryDestCandidates = [],   // [{zoneId, seatIndex}]
    onGerryDestClick = () => {}
  } = opts;

  const svg = svgEl("svg", {
    viewBox: "0 0 800 700",
    class: "map",
    role: "group",
    "aria-label": "Constituency map"
  });

  for (const zDef of ZONES) {
    const z = state.zones.find((s) => s.id === zDef.id);
    if (!z) continue;

    const locked = z.lockedBy !== null;
    const coalition = z.coalition !== null;
    const lockColor = locked ? state.players[z.lockedBy].color : null;
    const placeable = placeableZoneIds.includes(z.id);

    // Zone polygon
    const d = hexPath(zDef.axial, HEX_SIZE);
    const shape = svgEl("path", {
      d,
      class: `zone-shape${locked ? " locked" : ""}${coalition ? " coalition" : ""}${placeable ? " placeable" : ""}`,
      style: locked && lockColor ? `fill:${lockColor}22` : null
    });
    svg.appendChild(shape);

    // Zone label position: above the hex center
    const center = hexCenter(zDef.axial);
    const labelX = center.x;
    const labelY = center.y - HEX_SIZE * 0.72;

    const filledCount = z.seats.filter((s) => s !== null).length;
    const cap = zDef.capacity;
    let lockLabel = "";
    if (locked) lockLabel = ` ★ ${state.players[z.lockedBy].name}`;
    else if (coalition) lockLabel = ` 🤝`;

    svg.appendChild(svgEl("text", {
      x: String(labelX.toFixed(1)),
      y: String(labelY.toFixed(1)),
      class: "zone-name",
      "text-anchor": "middle"
    }, zDef.name));
    svg.appendChild(svgEl("text", {
      x: String(labelX.toFixed(1)),
      y: String((labelY + 14).toFixed(1)),
      class: "zone-sub",
      "text-anchor": "middle"
    }, `${filledCount}/${cap}${lockLabel}`));

    // Per-player vote-count pips
    const tally = tallyByOwner(z);
    if (tally.size > 0) {
      const entries = [...tally.entries()];
      const startX = labelX - (entries.length - 1) * 11;
      entries.forEach(([pid, n], k) => {
        const cx = startX + k * 22;
        const cy = labelY + 28;
        svg.appendChild(svgEl("circle", {
          cx: String(cx.toFixed(1)),
          cy: String(cy.toFixed(1)),
          r: "7",
          class: "vote-pip",
          fill: state.players[pid].color
        }));
        svg.appendChild(svgEl("text", {
          x: String(cx.toFixed(1)),
          y: String((cy + 3.5).toFixed(1)),
          class: "vote-pip-n",
          "text-anchor": "middle"
        }, String(n)));
      });
    }

    // Seat circles
    const positions = seatPositions(zDef.axial, HEX_SIZE, zDef.capacity);
    positions.forEach((pt, i) => {
      const owner = z.seats[i];
      const filled = owner != null;
      const isVolatile = z.volatileSeats.includes(i);
      const isFlipped = z.flippedSeats[i];
      const isPlaceable = !filled && placeable;

      // Check gerry candidates
      const isGerrySource = gerryFromCandidates.some(
        (c) => c.zoneId === z.id && c.seatIndex === i
      );
      const isGerryDest = gerryDestCandidates.some(
        (c) => c.zoneId === z.id && c.seatIndex === i
      );

      let cls = `seat`;
      if (filled) cls += " filled";
      if (isPlaceable) cls += " placeable";
      if (isVolatile) cls += " vol-seat";
      if (isGerrySource) cls += " gerry-source";
      if (isGerryDest) cls += " gerry-dest";

      const seat = svgEl("circle", {
        cx: String(pt.x.toFixed(1)),
        cy: String(pt.y.toFixed(1)),
        r: String(SEAT_R),
        class: cls,
        fill: filled ? state.players[owner].color : null
      });

      if (isPlaceable) {
        seat.addEventListener("click", (e) => {
          if (e && e.stopPropagation) e.stopPropagation();
          onSeatClick(z.id, i);
        });
      } else if (isGerrySource) {
        seat.addEventListener("click", (e) => {
          if (e && e.stopPropagation) e.stopPropagation();
          onGerrySourceClick(z.id, i);
        });
      } else if (isGerryDest) {
        seat.addEventListener("click", (e) => {
          if (e && e.stopPropagation) e.stopPropagation();
          onGerryDestClick(z.id, i);
        });
      }

      svg.appendChild(seat);

      // "S" label for flipped seats
      if (isFlipped) {
        svg.appendChild(svgEl("text", {
          x: String(pt.x.toFixed(1)),
          y: String((pt.y + 4).toFixed(1)),
          class: "s-mark",
          "text-anchor": "middle"
        }, "S"));
      }

      // ⚡ glyph for volatile seats
      if (isVolatile) {
        svg.appendChild(svgEl("text", {
          x: String(pt.x.toFixed(1)),
          y: String((pt.y + 4).toFixed(1)),
          class: "vol-mark",
          "text-anchor": "middle"
        }, "⚡"));
      }
    });
  }

  return svg;
}
