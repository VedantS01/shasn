// Flat-top hex grid centered on the board.
const CENTER = { x: 400, y: 350 };
const HEX_SIZE = 110;   // hex "radius" (center → vertex)

export function hexCenter(axial) {
  const x = CENTER.x + HEX_SIZE * 1.5 * axial.q;
  const y = CENTER.y + HEX_SIZE * Math.sqrt(3) * (axial.r + axial.q / 2);
  return { x, y };
}

export function hexPath(axial, size = HEX_SIZE) {
  const c = hexCenter(axial);
  const pts = [];
  for (let i = 0; i < 6; i++) {
    const a = (Math.PI / 3) * i;
    pts.push({ x: c.x + size * Math.cos(a), y: c.y + size * Math.sin(a) });
  }
  return `M${pts[0].x.toFixed(1)},${pts[0].y.toFixed(1)} ` +
    pts.slice(1).map((p) => `L${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" ") + " Z";
}

// Pack `n` seats in concentric rings within the hex.
export function seatPositions(axial, size = HEX_SIZE, n) {
  const c = hexCenter(axial);
  if (n <= 0) return [];
  if (n === 1) return [c];
  // Three rings: center, mid, outer.
  const remaining = n;
  const out = [];
  const rings = [
    { r: 0, count: 1 },
    { r: size * 0.4, count: Math.min(6, n - 1) },
    { r: size * 0.7, count: 0 }   // computed below
  ];
  rings[2].count = Math.max(0, n - rings[0].count - rings[1].count);

  for (const ring of rings) {
    if (ring.count <= 0) continue;
    if (ring.r === 0) {
      out.push(c);
      continue;
    }
    for (let i = 0; i < ring.count; i++) {
      const a = (2 * Math.PI / ring.count) * i;
      out.push({ x: c.x + ring.r * Math.cos(a), y: c.y + ring.r * Math.sin(a) });
    }
  }
  // If we still don't have enough points (e.g. n=21), add a fourth ring.
  if (out.length < n) {
    const ring4Count = n - out.length;
    const ringR = size * 0.92;
    for (let i = 0; i < ring4Count; i++) {
      const a = (2 * Math.PI / ring4Count) * i + Math.PI / ring4Count;  // offset for variety
      out.push({ x: c.x + ringR * Math.cos(a), y: c.y + ringR * Math.sin(a) });
    }
  }
  return out.slice(0, n);
}
