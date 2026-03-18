/**
 * Hand-drawn bezier-curve doodle icons for poster module thumbnails.
 * Each icon is a pure SVG string (viewBox 0 0 40 40), rendered with currentColor.
 */

type RNG = () => number;

function mulberry32(a: number): RNG {
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function jitter(rng: RNG, v: number, amount = 2) {
  return v + (rng() - 0.5) * amount;
}

function handLine(rng: RNG, x1: number, y1: number, x2: number, y2: number, w = 1.2) {
  const mx = (x1 + x2) / 2, my = (y1 + y2) / 2;
  const cx = jitter(rng, mx, 3), cy = jitter(rng, my, 3);
  return `<path d="M${jitter(rng, x1, 1)},${jitter(rng, y1, 1)} Q${cx},${cy} ${jitter(rng, x2, 1)},${jitter(rng, y2, 1)}" fill="none" stroke="currentColor" stroke-width="${w}" stroke-linecap="round"/>`;
}

function handCurve(rng: RNG, points: number[][], w = 1.2) {
  if (points.length < 2) return "";
  let d = `M${jitter(rng, points[0][0], 0.8)},${jitter(rng, points[0][1], 0.8)}`;
  for (let i = 1; i < points.length; i++) {
    const prev = points[i - 1], cur = points[i];
    const cpx = (prev[0] + cur[0]) / 2 + (rng() - 0.5) * 2.5;
    const cpy = (prev[1] + cur[1]) / 2 + (rng() - 0.5) * 2.5;
    d += ` Q${cpx},${cpy} ${jitter(rng, cur[0], 0.8)},${jitter(rng, cur[1], 0.8)}`;
  }
  return `<path d="${d}" fill="none" stroke="currentColor" stroke-width="${w}" stroke-linecap="round"/>`;
}

function handCircle(rng: RNG, cx: number, cy: number, rx: number, ry?: number, filled = false, w = 1.2) {
  ry = ry || rx;
  const pts: number[][] = [];
  const n = 8;
  for (let i = 0; i <= n; i++) {
    const a = (i / n) * Math.PI * 2;
    pts.push([cx + Math.cos(a) * jitter(rng, rx, rx * 0.1), cy + Math.sin(a) * jitter(rng, ry, ry * 0.1)]);
  }
  let d = `M${pts[0][0]},${pts[0][1]}`;
  for (let i = 1; i < pts.length; i++) {
    const prev = pts[i - 1], cur = pts[i];
    const cpx = (prev[0] + cur[0]) / 2 + (rng() - 0.5) * 1.5;
    const cpy = (prev[1] + cur[1]) / 2 + (rng() - 0.5) * 1.5;
    d += ` Q${cpx},${cpy} ${cur[0]},${cur[1]}`;
  }
  d += "Z";
  let s = "";
  if (filled) s += `<path d="${d}" fill="currentColor" stroke="none" opacity="0.15"/>`;
  s += `<path d="${d}" fill="none" stroke="currentColor" stroke-width="${w}" stroke-linecap="round"/>`;
  return s;
}

/* ── Icon generators (viewBox 0 0 40 40) ── */

/** 🏔 MUJI - mountain / minimal landscape */
function genMountain(rng: RNG) {
  let s = "";
  // Big mountain
  s += handCurve(rng, [[4, 34], [14, 10], [20, 18], [26, 8], [36, 34]], 1.5);
  // Snow cap
  s += handCurve(rng, [[21, 14], [24, 10], [26, 8], [28, 12]], 1.1);
  // Ground line
  s += handCurve(rng, [[2, 34], [20, 35], [38, 34]], 1);
  return s;
}

/** 🗺 DotMap - abstract dot constellation */
function genDotMap(rng: RNG) {
  let s = "";
  // Scattered dots connected by thin lines
  const pts: number[][] = [];
  for (let i = 0; i < 7; i++) {
    pts.push([6 + rng() * 28, 6 + rng() * 28]);
  }
  // Connect some dots
  for (let i = 0; i < pts.length - 1; i++) {
    if (rng() > 0.3) {
      s += handLine(rng, pts[i][0], pts[i][1], pts[i + 1][0], pts[i + 1][1], 0.7);
    }
  }
  // Draw dots
  for (const p of pts) {
    const r = 1.2 + rng() * 1.2;
    s += `<circle cx="${p[0]}" cy="${p[1]}" r="${r}" fill="currentColor"/>`;
  }
  // Outer frame hint
  s += handCurve(rng, [[3, 3], [37, 3]], 0.6);
  s += handCurve(rng, [[3, 37], [37, 37]], 0.6);
  s += handCurve(rng, [[3, 3], [3, 37]], 0.6);
  s += handCurve(rng, [[37, 3], [37, 37]], 0.6);
  return s;
}

/** 🚃 Discover - subway/train car */
function genTrain(rng: RNG) {
  let s = "";
  // Body
  s += handCurve(rng, [[6, 14], [6, 30], [34, 30], [34, 14], [30, 10], [10, 10], [6, 14]], 1.4);
  // Windows
  s += handCircle(rng, 14, 18, 3, 3);
  s += handCircle(rng, 26, 18, 3, 3);
  // Door
  s += handCurve(rng, [[18, 22], [18, 30]], 1.1);
  s += handCurve(rng, [[22, 22], [22, 30]], 1.1);
  s += handCurve(rng, [[18, 22], [22, 22]], 1.1);
  // Wheels
  s += handCircle(rng, 12, 33, 2.5, 2.5);
  s += handCircle(rng, 28, 33, 2.5, 2.5);
  // Rail
  s += handCurve(rng, [[2, 36], [38, 36]], 1);
  return s;
}

/** ◐ Pattern flat - half circle / yin-yang like */
function genHalfCircle(rng: RNG) {
  let s = "";
  // Full circle outline
  s += handCircle(rng, 20, 20, 13, 13);
  // Vertical divider
  s += handCurve(rng, [[20, 7], [20, 33]], 1.2);
  // Fill left half with horizontal lines
  for (let y = 10; y <= 30; y += 3) {
    const dx = Math.sqrt(Math.max(0, 13 * 13 - (y - 20) * (y - 20)));
    s += handLine(rng, 20 - dx + 1, y, 20, y, 0.7);
  }
  return s;
}

/** ◉ Pattern brutal - concentric circles */
function genConcentricCircle(rng: RNG) {
  let s = "";
  s += handCircle(rng, 20, 20, 15, 15, false, 1.5);
  s += handCircle(rng, 20, 20, 10, 10);
  s += handCircle(rng, 20, 20, 5, 5);
  s += `<circle cx="${jitter(rng, 20, 0.5)}" cy="${jitter(rng, 20, 0.5)}" r="2" fill="currentColor"/>`;
  return s;
}

/** 🃏 Explorer card - playing card */
function genCard(rng: RNG) {
  let s = "";
  // Card outline
  s += handCurve(rng, [[8, 4], [32, 4], [33, 5], [33, 35], [32, 36], [8, 36], [7, 35], [7, 5], [8, 4]], 1.4);
  // Inner border
  s += handCurve(rng, [[11, 8], [29, 8], [29, 32], [11, 32], [11, 8]], 0.8);
  // Star in center
  const cx = 20, cy = 20;
  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * Math.PI * 2 - Math.PI / 2;
    const r = 6;
    s += handLine(rng, cx, cy, cx + Math.cos(a) * r, cy + Math.sin(a) * r, 1);
  }
  s += handCircle(rng, cx, cy, 2.5, 2.5, true);
  // Corner marks
  s += `<circle cx="12" cy="9" r="1" fill="currentColor"/>`;
  s += `<circle cx="28" cy="31" r="1" fill="currentColor"/>`;
  return s;
}


/** 🧩 Grid mosaic - puzzle piece */
function genPuzzle(rng: RNG) {
  let s = "";
  // Puzzle piece outline with tabs
  s += handCurve(rng, [
    [8, 8], [16, 8], [17, 5], [20, 4], [23, 5], [24, 8], [32, 8],
    [32, 16], [35, 17], [36, 20], [35, 23], [32, 24], [32, 32],
    [24, 32], [23, 35], [20, 36], [17, 35], [16, 32], [8, 32],
    [8, 24], [5, 23], [4, 20], [5, 17], [8, 16], [8, 8],
  ], 1.4);
  // Cross-hatch center
  s += handLine(rng, 16, 16, 24, 24, 0.7);
  s += handLine(rng, 24, 16, 16, 24, 0.7);
  return s;
}

/** ◧ Data postcard - mini chart */
function genChart(rng: RNG) {
  let s = "";
  // Frame
  s += handCurve(rng, [[4, 4], [36, 4], [36, 36], [4, 36], [4, 4]], 1.2);
  // Dividers: 2x2 grid
  s += handCurve(rng, [[20, 4], [20, 36]], 0.8);
  s += handCurve(rng, [[4, 20], [36, 20]], 0.8);
  // Top-left: bar chart
  s += handLine(rng, 8, 18, 8, 12, 1.4);
  s += handLine(rng, 12, 18, 12, 8, 1.4);
  s += handLine(rng, 16, 18, 16, 14, 1.4);
  // Top-right: line chart
  s += handCurve(rng, [[23, 14], [26, 9], [30, 12], [34, 7]], 1.1);
  // Bottom-left: pie
  s += handCircle(rng, 12, 28, 5, 5);
  s += handLine(rng, 12, 28, 12, 23, 0.9);
  s += handLine(rng, 12, 28, 16, 31, 0.9);
  // Bottom-right: number
  s += `<circle cx="${jitter(rng, 28, 0.5)}" cy="${jitter(rng, 28, 0.5)}" r="4" fill="currentColor" opacity="0.12"/>`;
  s += `<circle cx="${jitter(rng, 28, 0.3)}" cy="${jitter(rng, 28, 0.3)}" r="1" fill="currentColor"/>`;
  return s;
}

/** ▦ Grid blank - grid pattern */
function genGrid(rng: RNG) {
  let s = "";
  // Draw a 5x5 grid
  for (let i = 0; i <= 5; i++) {
    const y = 5 + i * 6;
    s += handCurve(rng, [[5, y], [35, y]], 0.8);
  }
  for (let i = 0; i <= 5; i++) {
    const x = 5 + i * 6;
    s += handCurve(rng, [[x, 5], [x, 35]], 0.8);
  }
  // A few filled cells for visual weight
  const fills = [[1, 0], [3, 2], [0, 4], [4, 3]];
  for (const [col, row] of fills) {
    const x = 5 + col * 6 + 3;
    const y = 5 + row * 6 + 3;
    s += `<rect x="${x - 2.5}" y="${y - 2.5}" width="5" height="5" rx="0.5" fill="currentColor" opacity="0.12"/>`;
  }
  return s;
}

/** 🎲 Pop board - checkered dice */
function genDice(rng: RNG) {
  let s = "";
  // Outer cube face
  s += handCurve(rng, [[6, 6], [34, 6], [34, 34], [6, 34], [6, 6]], 1.5);
  // Checkerboard 4x4
  for (let r = 0; r < 4; r++) {
    for (let c = 0; c < 4; c++) {
      if ((r + c) % 2 === 0) {
        const x = 6 + c * 7 + 3.5;
        const y = 6 + r * 7 + 3.5;
        s += `<rect x="${x - 3}" y="${y - 3}" width="6" height="6" fill="currentColor" opacity="0.13" rx="0.5"/>`;
      }
    }
  }
  // Diagonal bold line for pop feel
  s += handLine(rng, 6, 6, 34, 34, 1.2);
  // Center dot
  s += `<circle cx="20" cy="20" r="2" fill="currentColor"/>`;
  return s;
}

/** ⌨ Keyboard - mini keyboard icon */
function genKeyboard(rng: RNG) {
  let s = "";
  // Keyboard body
  s += handCurve(rng, [[4, 12], [36, 12], [36, 32], [4, 32], [4, 12]], 1.3);
  // Key rows — 3 rows of small squares
  for (let r = 0; r < 3; r++) {
    const y = 15 + r * 6;
    const cols = r === 2 ? 3 : 5;
    const kw = r === 2 ? 7 : 5;
    const ox = r === 2 ? 9 : 6;
    for (let c = 0; c < cols; c++) {
      const x = ox + c * (kw + 1.2);
      s += handCurve(rng, [[x, y], [x + kw, y], [x + kw, y + 4.5], [x, y + 4.5], [x, y]], 0.8);
    }
  }
  // Spacebar in last row
  s += handCurve(rng, [[12, 27], [28, 27], [28, 31], [12, 31], [12, 27]], 0.9);
  return s;
}

/* ── Build icon map (generated once at module load) ── */

const ICON_GENS: Record<string, (rng: RNG) => string> = {
  muji: genMountain,
  dotmap: genDotMap,
  discover: genTrain,
  "pattern-flat": genHalfCircle,
  "pattern-brutal": genConcentricCircle,
  "explorer-card": genCard,
  "grid-mosaic": genPuzzle,
  "data-postcard": genChart,
  "grid-blank": genGrid,
  "pop-board": genDice,
  keyboard: genKeyboard,
};

const iconCache: Record<string, string> = {};

export function getPosterDoodleIcon(moduleId: string): string | null {
  if (iconCache[moduleId]) return iconCache[moduleId];
  const gen = ICON_GENS[moduleId];
  if (!gen) return null;
  // Use a fixed seed per module ID for consistency
  let seed = 0;
  for (let i = 0; i < moduleId.length; i++) seed = seed * 31 + moduleId.charCodeAt(i);
  const rng = mulberry32(seed);
  iconCache[moduleId] = gen(rng);
  return iconCache[moduleId];
}
