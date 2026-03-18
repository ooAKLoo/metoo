import React, { useState, useMemo } from "react";

// ─── Seeded RNG ─────────────────────────────────────────────────────────

export function mulberry32(a: number) {
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

type RNG = () => number;

function jitter(rng: RNG, v: number, amount = 2) {
  return v + (rng() - 0.5) * amount;
}

// ─── Hand-drawn SVG primitives ──────────────────────────────────────────

function handLine(rng: RNG, x1: number, y1: number, x2: number, y2: number, w = 1.2) {
  const mx = (x1 + x2) / 2, my = (y1 + y2) / 2;
  const cx1 = jitter(rng, mx, 3), cy1 = jitter(rng, my, 3);
  return `<path d="M${jitter(rng, x1, 1)},${jitter(rng, y1, 1)} Q${cx1},${cy1} ${jitter(rng, x2, 1)},${jitter(rng, y2, 1)}" fill="none" stroke="currentColor" stroke-width="${w}" stroke-linecap="round"/>`;
}

function handCircle(rng: RNG, cx: number, cy: number, rx: number, ry?: number, filled = false, w = 1.2) {
  ry = ry || rx;
  const pts: [number, number][] = [];
  const n = 8;
  for (let i = 0; i <= n; i++) {
    const a = (i / n) * Math.PI * 2;
    pts.push([cx + Math.cos(a) * jitter(rng, rx, rx * 0.12), cy + Math.sin(a) * jitter(rng, ry!, ry! * 0.12)]);
  }
  let d = `M${pts[0][0]},${pts[0][1]}`;
  for (let i = 1; i < pts.length; i++) {
    const prev = pts[i - 1], cur = pts[i];
    const cpx = (prev[0] + cur[0]) / 2 + (rng() - 0.5) * 2;
    const cpy = (prev[1] + cur[1]) / 2 + (rng() - 0.5) * 2;
    d += ` Q${cpx},${cpy} ${cur[0]},${cur[1]}`;
  }
  d += "Z";
  return `<path d="${d}" fill="${filled ? "currentColor" : "none"}" stroke="currentColor" stroke-width="${w}" stroke-linecap="round" opacity="${filled ? 0.15 : 1}"/>` +
    (filled ? `<path d="${d}" fill="none" stroke="currentColor" stroke-width="${w}" stroke-linecap="round"/>` : "");
}

function handCurve(rng: RNG, points: number[][], w = 1.2, closed = false) {
  if (points.length < 2) return "";
  let d = `M${jitter(rng, points[0][0], 1)},${jitter(rng, points[0][1], 1)}`;
  for (let i = 1; i < points.length; i++) {
    const prev = points[i - 1], cur = points[i];
    const cpx = (prev[0] + cur[0]) / 2 + (rng() - 0.5) * 3;
    const cpy = (prev[1] + cur[1]) / 2 + (rng() - 0.5) * 3;
    d += ` Q${cpx},${cpy} ${jitter(rng, cur[0], 1)},${jitter(rng, cur[1], 1)}`;
  }
  if (closed) d += "Z";
  return `<path d="${d}" fill="none" stroke="currentColor" stroke-width="${w}" stroke-linecap="round"/>`;
}

function handArc(rng: RNG, cx: number, cy: number, r: number, startA: number, endA: number, w = 1.2) {
  const pts: number[][] = [];
  const n = 6;
  for (let i = 0; i <= n; i++) {
    const a = startA + (endA - startA) * (i / n);
    pts.push([cx + Math.cos(a) * jitter(rng, r, r * 0.08), cy + Math.sin(a) * jitter(rng, r, r * 0.08)]);
  }
  return handCurve(rng, pts, w);
}

function dots(rng: RNG, cx: number, cy: number, r: number, count = 5) {
  let s = "";
  for (let i = 0; i < count; i++) {
    const a = rng() * Math.PI * 2;
    const d = rng() * r * 0.7;
    const x = cx + Math.cos(a) * d, y = cy + Math.sin(a) * d;
    s += `<circle cx="${x}" cy="${y}" r="${jitter(rng, 0.8, 0.3)}" fill="currentColor"/>`;
  }
  return s;
}

// ─── Icon Generators ────────────────────────────────────────────────────

function genFlower1(rng: RNG) {
  let s = "";
  const cy = 18, cx = 20;
  s += handCurve(rng, [[cx, cy + 4], [cx + jitter(rng, 0, 3), cy + 12], [cx + jitter(rng, -1, 4), 38]], 1.3);
  if (rng() > 0.4) {
    const ly = 30 + rng() * 5;
    s += handCurve(rng, [[cx, ly], [cx - 5 - rng() * 3, ly - 3], [cx - 3, ly - 6]], 1);
  }
  const n = 5 + Math.floor(rng() * 3);
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2 + rng() * 0.3;
    const r = 7 + rng() * 3;
    const px = cx + Math.cos(a) * r, py = cy + Math.sin(a) * r;
    s += handCurve(rng, [[cx + Math.cos(a) * 3, cy + Math.sin(a) * 3], [cx + Math.cos(a + 0.3) * r * 0.7, cy + Math.sin(a + 0.3) * r * 0.7], [px, py], [cx + Math.cos(a - 0.3) * r * 0.7, cy + Math.sin(a - 0.3) * r * 0.7], [cx + Math.cos(a) * 3, cy + Math.sin(a) * 3]], 1.1);
  }
  s += handCircle(rng, cx, cy, 3, 3, true);
  return s;
}

function genFlower2(rng: RNG) {
  let s = "";
  const cx = 20, by = 38;
  s += handCurve(rng, [[cx, 22], [cx + jitter(rng, 0, 2), 30], [cx + jitter(rng, 0, 2), by]], 1.3);
  s += handCurve(rng, [[cx - 7, 20], [cx - 8, 14], [cx - 3, 9], [cx, 8]], 1.2);
  s += handCurve(rng, [[cx + 7, 20], [cx + 8, 14], [cx + 3, 9], [cx, 8]], 1.2);
  s += handCurve(rng, [[cx - 7, 20], [cx - 2, 18], [cx, 16]], 1.1);
  s += handCurve(rng, [[cx + 7, 20], [cx + 2, 18], [cx, 16]], 1.1);
  const side = rng() > 0.5 ? 1 : -1;
  s += handCurve(rng, [[cx, 32], [cx + side * 8, 28], [cx + side * 6, 24]], 1.1);
  return s;
}

function genMushroom(rng: RNG) {
  let s = "";
  const cx = 20, capY = 18;
  s += handCurve(rng, [[cx - 4, capY + 2], [cx - 5, capY + 10], [cx - 3, 38]], 1.2);
  s += handCurve(rng, [[cx + 4, capY + 2], [cx + 5, capY + 10], [cx + 3, 38]], 1.2);
  s += handCurve(rng, [[cx - 3, 38], [cx, 39], [cx + 3, 38]], 1.1);
  s += handArc(rng, cx, capY + 2, 11, Math.PI, 0, 1.4);
  s += handCurve(rng, [[cx - 11, capY + 2], [cx, capY + 5], [cx + 11, capY + 2]], 1.2);
  s += dots(rng, cx, capY - 2, 7, 3 + Math.floor(rng() * 3));
  return s;
}

function genTree(rng: RNG) {
  let s = "";
  const cx = 20;
  s += handCurve(rng, [[cx - 2, 25], [cx - 2, 38]], 1.4);
  s += handCurve(rng, [[cx + 2, 25], [cx + 2, 38]], 1.4);
  const blobs = 4 + Math.floor(rng() * 3);
  for (let i = 0; i < blobs; i++) {
    const a = (i / blobs) * Math.PI * 2;
    const r = 6 + rng() * 4;
    const bx = cx + Math.cos(a) * 5, by = 17 + Math.sin(a) * 4;
    s += handCircle(rng, bx, by, r, r * (0.7 + rng() * 0.3));
  }
  return s;
}

function genGrass(rng: RNG) {
  let s = "";
  const n = 4 + Math.floor(rng() * 4);
  for (let i = 0; i < n; i++) {
    const bx = 8 + i * (24 / n) + rng() * 4;
    const h = 12 + rng() * 16;
    const lean = (rng() - 0.5) * 8;
    s += handCurve(rng, [[bx, 38], [bx + lean * 0.5, 38 - h * 0.6], [bx + lean, 38 - h]], 1.1);
  }
  s += handCurve(rng, [[5, 38], [20, 39], [35, 38]], 1);
  return s;
}

function genSnail(rng: RNG) {
  let s = "";
  s += handCurve(rng, [[6, 30], [10, 32], [18, 32], [26, 30], [30, 26]], 1.3);
  s += handCircle(rng, 24, 22, 8, 7);
  s += handArc(rng, 24, 22, 5, 0, Math.PI * 1.5, 1.1);
  s += handArc(rng, 24, 22, 2.5, Math.PI, Math.PI * 2.5, 1);
  s += handCurve(rng, [[10, 30], [8, 22], [7, 19]], 1);
  s += handCurve(rng, [[13, 29], [12, 22], [11, 19]], 1);
  s += `<circle cx="${jitter(rng, 7, 0.5)}" cy="${jitter(rng, 18, 0.5)}" r="1.2" fill="currentColor"/>`;
  s += `<circle cx="${jitter(rng, 11, 0.5)}" cy="${jitter(rng, 18, 0.5)}" r="1.2" fill="currentColor"/>`;
  return s;
}

function genButterfly(rng: RNG) {
  let s = "";
  const cx = 20, cy = 20;
  s += handCurve(rng, [[cx, cy - 8], [cx, cy], [cx, cy + 8]], 1.5);
  const ww = 10 + rng() * 4, wh = 7 + rng() * 3;
  s += handCurve(rng, [[cx, cy - 3], [cx - ww, cy - wh - 3], [cx - ww + 2, cy - 1], [cx, cy + 1]], 1.2);
  s += handCurve(rng, [[cx, cy - 3], [cx + ww, cy - wh - 3], [cx + ww - 2, cy - 1], [cx, cy + 1]], 1.2);
  s += handCurve(rng, [[cx, cy + 1], [cx - ww + 2, cy + wh - 2], [cx - 3, cy + 5], [cx, cy + 3]], 1.1);
  s += handCurve(rng, [[cx, cy + 1], [cx + ww - 2, cy + wh - 2], [cx + 3, cy + 5], [cx, cy + 3]], 1.1);
  s += handCurve(rng, [[cx, cy - 8], [cx - 5, cy - 14], [cx - 7, cy - 16]], 0.9);
  s += handCurve(rng, [[cx, cy - 8], [cx + 5, cy - 14], [cx + 7, cy - 16]], 0.9);
  s += dots(rng, cx - 6, cy - 4, 3, 2);
  s += dots(rng, cx + 6, cy - 4, 3, 2);
  return s;
}

function genSun(rng: RNG) {
  let s = "";
  const cx = 20, cy = 20;
  s += handCircle(rng, cx, cy, 7, 7);
  const n = 8 + Math.floor(rng() * 4);
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2 + rng() * 0.2;
    const r1 = 9, r2 = 13 + rng() * 4;
    s += handLine(rng, cx + Math.cos(a) * r1, cy + Math.sin(a) * r1, cx + Math.cos(a) * r2, cy + Math.sin(a) * r2, 1.1);
  }
  s += `<circle cx="${cx - 2.5}" cy="${cy - 1}" r="0.9" fill="currentColor"/>`;
  s += `<circle cx="${cx + 2.5}" cy="${cy - 1}" r="0.9" fill="currentColor"/>`;
  s += handArc(rng, cx, cy + 1, 2.5, 0.2, Math.PI - 0.2, 0.9);
  return s;
}

function genLeaf(rng: RNG) {
  let s = "";
  const cx = 20;
  s += handCurve(rng, [[cx, 8], [cx - 10, 16], [cx - 8, 26], [cx, 32]], 1.3);
  s += handCurve(rng, [[cx, 8], [cx + 10, 16], [cx + 8, 26], [cx, 32]], 1.3);
  s += handCurve(rng, [[cx, 9], [cx, 20], [cx, 31]], 1);
  for (let i = 0; i < 3; i++) {
    const y = 14 + i * 5;
    const spread = 5 + rng() * 3;
    s += handCurve(rng, [[cx, y], [cx - spread, y + 2]], 0.8);
    s += handCurve(rng, [[cx, y], [cx + spread, y + 2]], 0.8);
  }
  s += handCurve(rng, [[cx, 32], [cx + 2, 36], [cx + 1, 40]], 1.2);
  return s;
}

function genFlower3(rng: RNG) {
  let s = "";
  const cx = 20, cy = 16;
  s += handCurve(rng, [[cx, cy + 6], [cx + jitter(rng, 0, 3), 30], [cx + jitter(rng, 0, 2), 40]], 1.4);
  const n = 8 + Math.floor(rng() * 4);
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2;
    const r = 10 + rng() * 2;
    const px = cx + Math.cos(a) * r, py = cy + Math.sin(a) * r;
    s += handCurve(rng, [
      [cx + Math.cos(a) * 4, cy + Math.sin(a) * 4],
      [cx + Math.cos(a + 0.15) * r * 0.7, cy + Math.sin(a + 0.15) * r * 0.7],
      [px, py],
      [cx + Math.cos(a - 0.15) * r * 0.7, cy + Math.sin(a - 0.15) * r * 0.7],
      [cx + Math.cos(a) * 4, cy + Math.sin(a) * 4],
    ], 1);
  }
  s += handCircle(rng, cx, cy, 5, 5, true);
  s += handCurve(rng, [[cx, 32], [cx - 9, 28], [cx - 12, 25]], 1.1);
  s += handCurve(rng, [[cx, 32], [cx - 7, 30], [cx - 12, 25]], 1);
  return s;
}

function genBird(rng: RNG) {
  let s = "";
  s += handCircle(rng, 20, 22, 8, 7);
  s += handCircle(rng, 28, 16, 5, 5);
  s += `<circle cx="${jitter(rng, 30, 0.5)}" cy="${jitter(rng, 15, 0.5)}" r="1" fill="currentColor"/>`;
  s += handCurve(rng, [[33, 15], [37, 16], [33, 17]], 1);
  s += handCurve(rng, [[12, 20], [6, 16], [4, 12]], 1.2);
  s += handCurve(rng, [[12, 22], [7, 19], [4, 16]], 1.1);
  s += handLine(rng, 18, 29, 16, 36, 1);
  s += handLine(rng, 22, 29, 24, 36, 1);
  s += handLine(rng, 16, 36, 13, 36, 0.9);
  s += handLine(rng, 24, 36, 27, 36, 0.9);
  s += handArc(rng, 18, 21, 5, -0.5, Math.PI * 0.8, 1.1);
  return s;
}

function genCactus(rng: RNG) {
  let s = "";
  const cx = 20;
  s += handCurve(rng, [[cx - 4, 38], [cx - 4, 12], [cx - 2, 8], [cx + 2, 8], [cx + 4, 12], [cx + 4, 38]], 1.3);
  if (rng() > 0.3) {
    const ay = 18 + rng() * 6;
    s += handCurve(rng, [[cx - 4, ay], [cx - 10, ay - 1], [cx - 11, ay - 6], [cx - 9, ay - 10]], 1.2);
  }
  if (rng() > 0.3) {
    const ay = 16 + rng() * 8;
    s += handCurve(rng, [[cx + 4, ay], [cx + 10, ay - 1], [cx + 11, ay - 6], [cx + 9, ay - 10]], 1.2);
  }
  for (let i = 0; i < 5; i++) {
    const y = 10 + i * 5 + rng() * 3;
    const side = rng() > 0.5 ? -1 : 1;
    s += handLine(rng, cx + side * 4, y, cx + side * 7, y - 2 + rng() * 2, 0.7);
  }
  s += handCurve(rng, [[cx - 7, 38], [cx - 6, 42], [cx + 6, 42], [cx + 7, 38]], 1.3);
  s += handCurve(rng, [[cx - 8, 38], [cx + 8, 38]], 1.2);
  return s;
}

function genHeart(rng: RNG) {
  let s = "";
  const cx = 20, top = 14;
  s += handCurve(rng, [
    [cx, top + 5], [cx - 3, top], [cx - 8, top - 1], [cx - 11, top + 3],
    [cx - 10, top + 9], [cx - 5, top + 15], [cx, top + 20],
  ], 1.3);
  s += handCurve(rng, [
    [cx, top + 5], [cx + 3, top], [cx + 8, top - 1], [cx + 11, top + 3],
    [cx + 10, top + 9], [cx + 5, top + 15], [cx, top + 20],
  ], 1.3);
  return s;
}

function genCloud(rng: RNG) {
  let s = "";
  const cy = 22;
  s += handCurve(rng, [
    [8, cy + 4], [6, cy], [8, cy - 4], [14, cy - 6], [18, cy - 8],
    [23, cy - 7], [28, cy - 5], [32, cy - 3], [34, cy + 1], [33, cy + 4],
    [28, cy + 5], [20, cy + 5], [12, cy + 5], [8, cy + 4],
  ], 1.3);
  return s;
}

function genStar(rng: RNG) {
  let s = "";
  const cx = 20, cy = 20, outer = 12, inner = 5;
  const pts: number[][] = [];
  for (let i = 0; i < 10; i++) {
    const a = (i / 10) * Math.PI * 2 - Math.PI / 2;
    const r = i % 2 === 0 ? outer : inner;
    pts.push([cx + Math.cos(a) * jitter(rng, r, 1), cy + Math.sin(a) * jitter(rng, r, 1)]);
  }
  pts.push([...pts[0]]);
  s += handCurve(rng, pts, 1.3);
  return s;
}

function genBee(rng: RNG) {
  let s = "";
  const cx = 20, cy = 22;
  s += handCircle(rng, cx, cy, 6, 5);
  s += handLine(rng, cx - 3, cy - 3, cx - 3, cy + 3, 1.3);
  s += handLine(rng, cx, cy - 5, cx, cy + 5, 1.3);
  s += handLine(rng, cx + 3, cy - 3, cx + 3, cy + 3, 1.3);
  s += handCircle(rng, cx - 5, cy - 7, 4, 3);
  s += handCircle(rng, cx + 5, cy - 7, 4, 3);
  s += handLine(rng, cx, cy + 5, cx, cy + 9, 1);
  s += handCurve(rng, [[cx - 2, cy - 5], [cx - 5, cy - 10], [cx - 7, cy - 12]], 0.8);
  s += handCurve(rng, [[cx + 2, cy - 5], [cx + 5, cy - 10], [cx + 7, cy - 12]], 0.8);
  return s;
}

function genWateringCan(rng: RNG) {
  let s = "";
  s += handCurve(rng, [[10, 20], [10, 34], [30, 34], [30, 20], [10, 20]], 1.3);
  s += handCurve(rng, [[12, 20], [8, 12], [15, 8], [22, 12], [20, 20]], 1.2);
  s += handCurve(rng, [[30, 22], [35, 18], [38, 12]], 1.2);
  s += handCurve(rng, [[30, 25], [34, 22], [36, 16]], 1.1);
  if (rng() > 0.3) {
    for (let i = 0; i < 3; i++) {
      const dx = 36 + rng() * 4, dy = 10 + rng() * 5;
      s += handLine(rng, dx, dy, dx + 1, dy + 3, 0.9);
    }
  }
  return s;
}

function genFence(rng: RNG) {
  let s = "";
  const y1 = 12, y2 = 36;
  for (let i = 0; i < 5; i++) {
    const x = 6 + i * 7;
    s += handLine(rng, x, y1 - 2, x, y2, 1.3);
    s += handCurve(rng, [[x - 2, y1], [x, y1 - 4], [x + 2, y1]], 1.1);
  }
  s += handCurve(rng, [[5, 18], [35, 18]], 1.2);
  s += handCurve(rng, [[5, 28], [35, 28]], 1.2);
  return s;
}

function genRabbit(rng: RNG) {
  let s = "";
  s += handCircle(rng, 20, 26, 7, 8);
  s += handCircle(rng, 20, 15, 5, 5);
  s += handCurve(rng, [[17, 11], [14, 2], [16, 5], [18, 10]], 1.1);
  s += handCurve(rng, [[23, 11], [26, 2], [24, 5], [22, 10]], 1.1);
  s += `<circle cx="${jitter(rng, 18, 0.5)}" cy="${jitter(rng, 14, 0.5)}" r="0.9" fill="currentColor"/>`;
  s += `<circle cx="${jitter(rng, 22, 0.5)}" cy="${jitter(rng, 14, 0.5)}" r="0.9" fill="currentColor"/>`;
  s += `<circle cx="20" cy="${jitter(rng, 16.5, 0.3)}" r="0.7" fill="currentColor"/>`;
  s += handCircle(rng, 12, 28, 2, 2);
  s += handCurve(rng, [[16, 34], [14, 37], [18, 37]], 1);
  s += handCurve(rng, [[24, 34], [22, 37], [26, 37]], 1);
  return s;
}

function genPotPlant(rng: RNG) {
  let s = "";
  const cx = 20;
  s += handCurve(rng, [[cx - 8, 26], [cx - 6, 38], [cx + 6, 38], [cx + 8, 26]], 1.4);
  s += handCurve(rng, [[cx - 9, 26], [cx + 9, 26]], 1.3);
  s += handCurve(rng, [[cx - 10, 24], [cx - 9, 26]], 1.2);
  s += handCurve(rng, [[cx + 10, 24], [cx + 9, 26]], 1.2);
  s += handCurve(rng, [[cx - 10, 24], [cx + 10, 24]], 1.2);
  const branches = 3 + Math.floor(rng() * 2);
  for (let i = 0; i < branches; i++) {
    const angle = -Math.PI / 2 + (i - (branches - 1) / 2) * 0.6 + rng() * 0.2;
    const len = 12 + rng() * 6;
    const ex = cx + Math.cos(angle) * len, ey = 24 + Math.sin(angle) * len;
    s += handCurve(rng, [[cx, 24], [(cx + ex) / 2 + rng() * 3, (24 + ey) / 2], [ex, ey]], 1.2);
    s += handCurve(rng, [[ex, ey], [ex - 3, ey - 2], [ex - 5, ey + 1], [ex - 2, ey + 2]], 0.9);
    s += handCurve(rng, [[ex, ey], [ex + 3, ey - 2], [ex + 5, ey + 1], [ex + 2, ey + 2]], 0.9);
  }
  return s;
}

function genLadybug(rng: RNG) {
  let s = "";
  const cx = 20, cy = 22;
  s += handCircle(rng, cx, cy, 9, 8);
  s += handLine(rng, cx, cy - 8, cx, cy + 8, 1.1);
  s += handArc(rng, cx, cy - 7, 5, Math.PI, 2 * Math.PI, 1.3);
  s += dots(rng, cx - 4, cy, 3, 2);
  s += dots(rng, cx + 4, cy, 3, 2);
  s += dots(rng, cx, cy + 4, 2, 1);
  s += handCurve(rng, [[cx - 2, cy - 11], [cx - 5, cy - 16]], 0.9);
  s += handCurve(rng, [[cx + 2, cy - 11], [cx + 5, cy - 16]], 0.9);
  for (let i = 0; i < 3; i++) {
    const y = cy - 3 + i * 4;
    s += handLine(rng, cx - 9, y, cx - 13, y + 2, 0.9);
    s += handLine(rng, cx + 9, y, cx + 13, y + 2, 0.9);
  }
  return s;
}

function genApple(rng: RNG) {
  let s = "";
  const cx = 20, cy = 24;
  s += handCurve(rng, [
    [cx, cy - 9], [cx - 5, cy - 10], [cx - 10, cy - 7], [cx - 11, cy],
    [cx - 9, cy + 7], [cx - 3, cy + 10], [cx, cy + 9],
  ], 1.3);
  s += handCurve(rng, [
    [cx, cy - 9], [cx + 5, cy - 10], [cx + 10, cy - 7], [cx + 11, cy],
    [cx + 9, cy + 7], [cx + 3, cy + 10], [cx, cy + 9],
  ], 1.3);
  s += handCurve(rng, [[cx, cy - 9], [cx + 1, cy - 13], [cx + 2, cy - 15]], 1.2);
  s += handCurve(rng, [[cx + 1, cy - 13], [cx + 6, cy - 15], [cx + 9, cy - 13]], 1);
  s += handCurve(rng, [[cx + 1, cy - 13], [cx + 6, cy - 12], [cx + 9, cy - 13]], 0.9);
  return s;
}

function genSnowman(rng: RNG) {
  let s = "";
  const cx = 20;
  s += handCircle(rng, cx, 30, 8, 7);
  s += handCircle(rng, cx, 18, 6, 5.5);
  s += handCircle(rng, cx, 9, 4.5, 4);
  s += `<circle cx="${cx - 2}" cy="8" r="0.8" fill="currentColor"/>`;
  s += `<circle cx="${cx + 2}" cy="8" r="0.8" fill="currentColor"/>`;
  s += handCurve(rng, [[cx, 10], [cx + 4, 11]], 1);
  s += `<circle cx="${cx}" cy="16" r="0.7" fill="currentColor"/>`;
  s += `<circle cx="${cx}" cy="19" r="0.7" fill="currentColor"/>`;
  s += handCurve(rng, [[cx - 6, 5.5], [cx + 6, 5.5]], 1.2);
  s += handCurve(rng, [[cx - 4, 5.5], [cx - 4, 0], [cx + 4, 0], [cx + 4, 5.5]], 1.2);
  s += handCurve(rng, [[cx - 6, 18], [cx - 14, 14], [cx - 16, 12]], 1);
  s += handCurve(rng, [[cx + 6, 18], [cx + 14, 14], [cx + 16, 12]], 1);
  return s;
}

function genBirdhouse(rng: RNG) {
  let s = "";
  const cx = 20;
  s += handCurve(rng, [[6, 18], [cx, 6], [34, 18]], 1.4);
  s += handCurve(rng, [[9, 18], [9, 36], [31, 36], [31, 18]], 1.3);
  s += handCircle(rng, cx, 25, 4, 4);
  s += handLine(rng, cx, 29, cx, 33, 1.2);
  s += handLine(rng, cx - 3, 33, cx + 3, 33, 1.1);
  s += handLine(rng, cx, 36, cx, 42, 1.5);
  return s;
}

function genRose(rng: RNG) {
  let s = "";
  const cx = 20, cy = 16;
  s += handCurve(rng, [[cx, cy + 6], [cx + 1, 28], [cx - 1, 35], [cx, 40]], 1.3);
  s += handLine(rng, cx, 28, cx + 4, 26, 0.9);
  s += handLine(rng, cx, 33, cx - 4, 31, 0.9);
  s += handArc(rng, cx, cy, 3, 0, Math.PI * 1.3, 1.2);
  s += handArc(rng, cx, cy, 5, Math.PI * 0.5, Math.PI * 2, 1.2);
  s += handArc(rng, cx, cy, 7.5, Math.PI, Math.PI * 2.8, 1.1);
  s += handCurve(rng, [[cx - 8, cy + 2], [cx - 10, cy - 3], [cx - 6, cy - 7]], 1.1);
  s += handCurve(rng, [[cx + 8, cy + 2], [cx + 10, cy - 3], [cx + 6, cy - 7]], 1.1);
  s += handCurve(rng, [[cx + 1, 30], [cx + 8, 27], [cx + 12, 28]], 1);
  s += handCurve(rng, [[cx + 1, 30], [cx + 8, 30], [cx + 12, 28]], 0.9);
  return s;
}

function genAcorn(rng: RNG) {
  let s = "";
  const cx = 20, cy = 22;
  s += handArc(rng, cx, cy, 8, Math.PI, 2 * Math.PI, 1.3);
  s += handCurve(rng, [[cx - 8, cy], [cx + 8, cy]], 1.2);
  for (let i = -1; i <= 1; i++) {
    s += handLine(rng, cx + i * 4, cy - 7, cx + i * 4, cy, 0.7);
  }
  s += handCurve(rng, [[cx - 7, cy - 4], [cx + 7, cy - 4]], 0.7);
  s += handCurve(rng, [[cx - 7, cy], [cx - 6, cy + 8], [cx, cy + 12], [cx + 6, cy + 8], [cx + 7, cy]], 1.3);
  s += handCurve(rng, [[cx, cy - 8], [cx + 1, cy - 12], [cx - 1, cy - 14]], 1);
  return s;
}

function genStripedCan(rng: RNG) {
  let s = "";
  const cx = 24, cy = 24;
  s += handCurve(rng, [
    [cx - 8, cy - 6], [cx - 9, cy - 2], [cx - 9, cy + 4],
    [cx - 7, cy + 8], [cx - 3, cy + 9], [cx + 3, cy + 9],
    [cx + 7, cy + 8], [cx + 9, cy + 4], [cx + 9, cy - 2],
    [cx + 8, cy - 6], [cx + 3, cy - 8], [cx - 3, cy - 8], [cx - 8, cy - 6],
  ], 1.4);
  for (let i = -2; i <= 2; i++) {
    const x = cx + i * 3;
    s += handLine(rng, x, cy - 6, x, cy + 7, 1.1);
  }
  s += handCurve(rng, [[cx - 8, cy - 3], [cx - 13, cy - 8], [cx - 16, cy - 13]], 1.3);
  s += handCurve(rng, [[cx - 7, cy - 5], [cx - 11, cy - 9], [cx - 14, cy - 13]], 1.2);
  s += handCircle(rng, cx - 16, cy - 14, 3, 3);
  s += handCurve(rng, [[cx + 2, cy - 8], [cx + 4, cy - 13], [cx + 1, cy - 15], [cx - 3, cy - 13], [cx - 4, cy - 8]], 1.3);
  return s;
}

function genGnome(rng: RNG) {
  let s = "";
  const cx = 24, by = 40;
  s += handLine(rng, cx - 3, by - 10, cx - 4, by, 1.4);
  s += handLine(rng, cx + 3, by - 10, cx + 4, by, 1.4);
  s += handCurve(rng, [[cx - 4, by], [cx - 7, by], [cx - 8, by - 1]], 1.2);
  s += handCurve(rng, [[cx + 4, by], [cx + 7, by], [cx + 8, by - 1]], 1.2);
  s += handCurve(rng, [
    [cx - 6, by - 10], [cx - 7, by - 16], [cx - 5, by - 20],
    [cx, by - 22], [cx + 5, by - 20], [cx + 7, by - 16],
    [cx + 6, by - 10],
  ], 1.3);
  s += handCurve(rng, [[cx - 6, by - 14], [cx + 6, by - 14]], 1.1);
  s += handCircle(rng, cx, by - 25, 4.5, 4);
  s += `<circle cx="${cx - 2}" cy="${by - 25.5}" r="0.7" fill="currentColor"/>`;
  s += `<circle cx="${cx + 2}" cy="${by - 25.5}" r="0.7" fill="currentColor"/>`;
  s += handCurve(rng, [[cx - 4, by - 23], [cx - 3, by - 19], [cx, by - 17]], 1);
  s += handCurve(rng, [[cx + 4, by - 23], [cx + 3, by - 19], [cx, by - 17]], 1);
  s += handCurve(rng, [[cx - 2, by - 23], [cx - 1, by - 18]], 0.8);
  s += handCurve(rng, [[cx + 2, by - 23], [cx + 1, by - 18]], 0.8);
  s += handCurve(rng, [
    [cx - 5, by - 28], [cx - 3, by - 34], [cx + jitter(rng, 1, 2), by - 40],
  ], 1.3);
  s += handCurve(rng, [
    [cx + 5, by - 28], [cx + 3, by - 34], [cx + jitter(rng, 1, 2), by - 40],
  ], 1.3);
  s += handCurve(rng, [[cx - 5, by - 28], [cx, by - 27], [cx + 5, by - 28]], 1.1);
  s += handCurve(rng, [[cx + 5, by - 18], [cx + 9, by - 16], [cx + 10, by - 10]], 1.1);
  s += handLine(rng, cx + 10, by - 10, cx + 10, by - 2, 1.2);
  s += handCurve(rng, [[cx + 8, by - 2], [cx + 10, by + 1], [cx + 12, by - 2]], 1.1);
  return s;
}

function genDandelion(rng: RNG) {
  let s = "";
  const cx = 20, by = 40;
  s += handCurve(rng, [[cx, by], [cx + jitter(rng, 0, 2), by - 12], [cx + jitter(rng, 0, 1), by - 20]], 1.3);
  s += handCurve(rng, [[cx, by - 4], [cx - 8, by - 8], [cx - 10, by - 4], [cx - 6, by - 1]], 1.1);
  s += handCurve(rng, [[cx, by - 4], [cx + 8, by - 8], [cx + 10, by - 4], [cx + 6, by - 1]], 1.1);
  s += handCurve(rng, [[cx, by - 6], [cx - 6, by - 12], [cx - 8, by - 8]], 1);
  s += handCurve(rng, [[cx, by - 6], [cx + 6, by - 12], [cx + 8, by - 8]], 1);
  const puffCx = cx + jitter(rng, 0, 1), puffCy = by - 24;
  const dotCount = 12 + Math.floor(rng() * 8);
  for (let i = 0; i < dotCount; i++) {
    const a = rng() * Math.PI * 2;
    const d = rng() * 7;
    const dx = puffCx + Math.cos(a) * d;
    const dy = puffCy + Math.sin(a) * d;
    s += `<circle cx="${dx}" cy="${dy}" r="${0.6 + rng() * 0.6}" fill="currentColor"/>`;
  }
  return s;
}

function genSimpleDaisy(rng: RNG) {
  let s = "";
  const x1 = 14 + rng() * 3, h1 = 28 + rng() * 6;
  s += handCurve(rng, [[x1, 40], [x1 + jitter(rng, 0, 2), 40 - h1 * 0.6], [x1 + jitter(rng, 0, 1), 40 - h1]], 1.4);
  const fc1x = x1 + jitter(rng, 0, 1), fc1y = 40 - h1;
  const n1 = 5 + Math.floor(rng() * 2);
  for (let i = 0; i < n1; i++) {
    const a = (i / n1) * Math.PI * 2 + rng() * 0.4;
    const r = 5 + rng() * 2;
    const px = fc1x + Math.cos(a) * r, py = fc1y + Math.sin(a) * r;
    s += handCurve(rng, [
      [fc1x, fc1y],
      [fc1x + Math.cos(a + 0.4) * r, fc1y + Math.sin(a + 0.4) * r],
      [px, py],
      [fc1x + Math.cos(a - 0.4) * r, fc1y + Math.sin(a - 0.4) * r],
      [fc1x, fc1y],
    ], 1.2);
  }
  s += handCircle(rng, fc1x, fc1y, 2, 2, true);
  const x2 = 24 + rng() * 4, h2 = 16 + rng() * 8;
  s += handCurve(rng, [[x2, 40], [x2 + jitter(rng, 0, 2), 40 - h2 * 0.6], [x2 + jitter(rng, 0, 1), 40 - h2]], 1.3);
  const fc2x = x2 + jitter(rng, 0, 1), fc2y = 40 - h2;
  const n2 = 4 + Math.floor(rng() * 3);
  for (let i = 0; i < n2; i++) {
    const a = (i / n2) * Math.PI * 2 + rng() * 0.3;
    const r = 4 + rng() * 1.5;
    const px = fc2x + Math.cos(a) * r, py = fc2y + Math.sin(a) * r;
    s += handCurve(rng, [
      [fc2x, fc2y],
      [fc2x + Math.cos(a + 0.45) * r, fc2y + Math.sin(a + 0.45) * r],
      [px, py],
      [fc2x + Math.cos(a - 0.45) * r, fc2y + Math.sin(a - 0.45) * r],
      [fc2x, fc2y],
    ], 1.1);
  }
  s += handCircle(rng, fc2x, fc2y, 1.5, 1.5, true);
  return s;
}

// ─── From sketchy-card illustrations ─────────────────────────────────────

function genSeedDandelion(rng: RNG) {
  let s = "";
  const cx = 20, by = 42;
  // Jagged leaves at base
  s += handCurve(rng, [
    [cx - 8, by - 6], [cx - 14, by - 5], [cx - 10, by],
    [cx - 16, by + 1], [cx - 8, by + 4], [cx, by + 2],
    [cx + 8, by + 4], [cx + 16, by + 1], [cx + 10, by],
    [cx + 14, by - 5], [cx + 8, by - 6],
  ], 1.2);
  // Stem
  s += handLine(rng, cx, by - 4, cx, by - 28, 1.3);
  // Center dot
  s += `<circle cx="${cx}" cy="${by - 30}" r="1" fill="currentColor"/>`;
  // Radiating seed lines with dots at tips
  const n = 8 + Math.floor(rng() * 4);
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2 + rng() * 0.3;
    const r1 = 3;
    const r2 = 10 + rng() * 4;
    const x1 = cx + Math.cos(a) * r1;
    const y1 = (by - 30) + Math.sin(a) * r1;
    const x2 = cx + Math.cos(a) * r2;
    const y2 = (by - 30) + Math.sin(a) * r2;
    s += `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="currentColor" stroke-width="0.6" stroke-dasharray="0.8 2" stroke-linecap="round"/>`;
    s += `<circle cx="${x2}" cy="${y2}" r="${0.7 + rng() * 0.4}" fill="currentColor"/>`;
  }
  // Scattered seeds floating away
  for (let i = 0; i < 3; i++) {
    const fx = cx + (rng() - 0.5) * 30;
    const fy = by - 34 - rng() * 10;
    s += `<circle cx="${fx}" cy="${fy}" r="${0.5 + rng() * 0.3}" fill="currentColor"/>`;
  }
  return s;
}

function genSketchyGnome(rng: RNG) {
  let s = "";
  const cx = 20, by = 42;
  // Legs
  s += handLine(rng, cx - 4, by - 6, cx - 4, by, 1.3);
  s += handLine(rng, cx + 4, by - 6, cx + 4, by, 1.3);
  s += handCurve(rng, [[cx - 4, by], [cx - 7, by], [cx - 8, by - 0.5]], 1);
  s += handCurve(rng, [[cx + 4, by], [cx + 7, by], [cx + 8, by - 0.5]], 1);
  // Body rectangle
  s += handCurve(rng, [
    [cx - 7, by - 16], [cx - 7, by - 6], [cx + 7, by - 6], [cx + 7, by - 16], [cx - 7, by - 16],
  ], 1.2);
  // Arms
  s += handCurve(rng, [[cx - 7, by - 14], [cx - 12, by - 10], [cx - 11, by - 6], [cx - 8, by - 8]], 1.1);
  s += handCurve(rng, [[cx + 7, by - 14], [cx + 12, by - 10], [cx + 11, by - 6], [cx + 8, by - 8]], 1.1);
  // Beard
  s += handCurve(rng, [
    [cx - 8, by - 19], [cx - 10, by - 12], [cx, by - 8],
    [cx + 10, by - 12], [cx + 8, by - 19],
  ], 1.2);
  // Nose
  s += handCircle(rng, cx, by - 19, 2.5, 2.5);
  // Eyes
  s += `<circle cx="${cx - 3}" cy="${by - 22}" r="0.6" fill="currentColor"/>`;
  s += `<circle cx="${cx + 3}" cy="${by - 22}" r="0.6" fill="currentColor"/>`;
  // Pointy hat (filled)
  const hatPath = `M ${cx - 8} ${by - 23} L ${cx + jitter(rng, 0, 1)} ${by - 40} L ${cx + 8} ${by - 23} Z`;
  s += `<path d="${hatPath}" fill="currentColor" stroke="currentColor" stroke-width="1" stroke-linecap="round" stroke-linejoin="round"/>`;
  return s;
}

function genFlowerBouquet(rng: RNG) {
  let s = "";
  const cx = 20;
  // Left flower
  const lx = cx - 6, ly = 18;
  s += handCurve(rng, [[lx, ly + 5], [lx + jitter(rng, 0, 1), 34], [lx + 2, 40]], 1.3);
  const n1 = 5 + Math.floor(rng() * 2);
  for (let i = 0; i < n1; i++) {
    const a = (i / n1) * Math.PI * 2 + rng() * 0.3;
    const r = 5 + rng() * 1.5;
    const px = lx + Math.cos(a) * r, py = ly + Math.sin(a) * r;
    s += handCurve(rng, [
      [lx + Math.cos(a) * 2, ly + Math.sin(a) * 2],
      [lx + Math.cos(a + 0.3) * r * 0.6, ly + Math.sin(a + 0.3) * r * 0.6],
      [px, py],
      [lx + Math.cos(a - 0.3) * r * 0.6, ly + Math.sin(a - 0.3) * r * 0.6],
      [lx + Math.cos(a) * 2, ly + Math.sin(a) * 2],
    ], 1);
  }
  s += handCircle(rng, lx, ly, 2, 2, true);
  // Right flower
  const rx = cx + 8, ry = 14;
  s += handCurve(rng, [[rx - 2, ry + 5], [rx - 1, 30], [rx - 3, 40]], 1.3);
  const n2 = 5 + Math.floor(rng() * 2);
  for (let i = 0; i < n2; i++) {
    const a = (i / n2) * Math.PI * 2 + rng() * 0.3;
    const r = 5 + rng() * 1.5;
    const px = rx + Math.cos(a) * r, py = ry + Math.sin(a) * r;
    s += handCurve(rng, [
      [rx + Math.cos(a) * 2, ry + Math.sin(a) * 2],
      [rx + Math.cos(a + 0.3) * r * 0.6, ry + Math.sin(a + 0.3) * r * 0.6],
      [px, py],
      [rx + Math.cos(a - 0.3) * r * 0.6, ry + Math.sin(a - 0.3) * r * 0.6],
      [rx + Math.cos(a) * 2, ry + Math.sin(a) * 2],
    ], 1);
  }
  s += handCircle(rng, rx, ry, 2, 2, true);
  // Small bud (bottom right)
  const bx = cx + 14, bby = 24;
  s += handCurve(rng, [[bx - 3, bby + 3], [bx - 2, 36], [bx - 4, 40]], 1.2);
  const n3 = 4;
  for (let i = 0; i < n3; i++) {
    const a = (i / n3) * Math.PI * 2 + rng() * 0.4;
    const r = 3.5 + rng() * 1;
    const px = bx + Math.cos(a) * r, py = bby + Math.sin(a) * r;
    s += handCurve(rng, [
      [bx + Math.cos(a) * 1.5, bby + Math.sin(a) * 1.5],
      [px, py],
      [bx + Math.cos(a) * 1.5, bby + Math.sin(a) * 1.5],
    ], 0.9);
  }
  s += handCircle(rng, bx, bby, 1.5, 1.5, true);
  return s;
}

// ─── Registry ───────────────────────────────────────────────────────────

export const DOODLE_ENTRIES: { id: string; name: string; gen: (rng: RNG) => string }[] = [
  { id: "flower1", name: "Daisy", gen: genFlower1 },
  { id: "flower2", name: "Tulip", gen: genFlower2 },
  { id: "flower3", name: "Sunflower", gen: genFlower3 },
  { id: "mushroom", name: "Mushroom", gen: genMushroom },
  { id: "tree", name: "Tree", gen: genTree },
  { id: "grass", name: "Grass", gen: genGrass },
  { id: "snail", name: "Snail", gen: genSnail },
  { id: "butterfly", name: "Butterfly", gen: genButterfly },
  { id: "sun", name: "Sun", gen: genSun },
  { id: "leaf", name: "Leaf", gen: genLeaf },
  { id: "bird", name: "Bird", gen: genBird },
  { id: "cactus", name: "Cactus", gen: genCactus },
  { id: "heart", name: "Heart", gen: genHeart },
  { id: "cloud", name: "Cloud", gen: genCloud },
  { id: "star", name: "Star", gen: genStar },
  { id: "bee", name: "Bee", gen: genBee },
  { id: "watering-can", name: "Watering Can", gen: genWateringCan },
  { id: "fence", name: "Fence", gen: genFence },
  { id: "rabbit", name: "Rabbit", gen: genRabbit },
  { id: "pot-plant", name: "Pot Plant", gen: genPotPlant },
  { id: "ladybug", name: "Ladybug", gen: genLadybug },
  { id: "apple", name: "Apple", gen: genApple },
  { id: "snowman", name: "Snowman", gen: genSnowman },
  { id: "birdhouse", name: "Birdhouse", gen: genBirdhouse },
  { id: "rose", name: "Rose", gen: genRose },
  { id: "acorn", name: "Acorn", gen: genAcorn },
  { id: "striped-can", name: "Striped Can", gen: genStripedCan },
  { id: "gnome", name: "Gnome", gen: genGnome },
  { id: "dandelion", name: "Dandelion", gen: genDandelion },
  { id: "daisy", name: "Simple Daisy", gen: genSimpleDaisy },
  { id: "seed-dandelion", name: "Seed Dandelion", gen: genSeedDandelion },
  { id: "sketchy-gnome", name: "Sketchy Gnome", gen: genSketchyGnome },
  { id: "flower-bouquet", name: "Flower Bouquet", gen: genFlowerBouquet },
];

// ─── Placement (same collision logic as social poster) ──────────────────

const SCALES = [0.7, 0.85, 1.0, 1.2, 1.4] as const;
const MARGIN = 3;
const USABLE = 100 - MARGIN * 2;

export interface DoodleAtom {
  id: string;
  svg: string;
  x: number;
  y: number;
  scale: number;
  rotation: number;
  color: string;
}

const PALETTE = [
  "#44403c", "#57534e", "#78716c", "#292524",
  "#4338ca", "#7c3aed", "#2563eb", "#0369a1",
  "#047857", "#b91c1c", "#c2410c", "#d97706",
];

export function generateDoodles(rng: RNG, count: number, mono: boolean, monoColor: string): DoodleAtom[] {
  const atoms: DoodleAtom[] = [];
  const placed: { x: number; y: number }[] = [];
  const minDist = 6.5;
  const minDistSq = minDist * minDist;

  for (let i = 0; i < count; i++) {
    let x = 0, y = 0, ok = false;
    for (let attempt = 0; attempt < 120; attempt++) {
      x = MARGIN + rng() * USABLE;
      y = MARGIN + rng() * USABLE;
      let conflict = false;
      for (const p of placed) {
        const dx = p.x - x, dy = p.y - y;
        if (dx * dx + dy * dy < minDistSq) { conflict = true; break; }
      }
      if (!conflict) { ok = true; break; }
    }
    if (!ok) continue;

    placed.push({ x, y });
    const entry = DOODLE_ENTRIES[Math.floor(rng() * DOODLE_ENTRIES.length)];
    const iconRng = mulberry32(Math.floor(rng() * 1000000));
    const svg = entry.gen(iconRng);
    const color = mono ? monoColor : PALETTE[Math.floor(rng() * PALETTE.length)];
    atoms.push({
      id: `${i}-${entry.id}`,
      svg,
      x,
      y,
      scale: SCALES[Math.floor(rng() * SCALES.length)],
      rotation: (rng() - 0.5) * 24,
      color,
    });
  }
  return atoms;
}

// ─── Component ──────────────────────────────────────────────────────────

interface DoodleGalleryProps {
  className?: string;
}

export const DoodleGallery: React.FC<DoodleGalleryProps> = ({ className }) => {
  const [seed, setSeed] = useState(42);
  const [density, setDensity] = useState(80);
  const [mono, setMono] = useState(true);
  const [monoColor, setMonoColor] = useState("#44403c");

  const atoms = useMemo(() => {
    const rng = mulberry32(seed);
    return generateDoodles(rng, density, mono, monoColor);
  }, [seed, density, mono, monoColor]);

  return (
    <div className={className}>
      {/* Canvas */}
      <div
        className="relative w-full rounded-xl overflow-hidden"
        style={{
          background: "#f5f3ee",
          aspectRatio: "16/9",
        }}
      >
        {atoms.map((atom) => (
          <div
            key={atom.id}
            className="absolute"
            style={{
              left: `${atom.x}%`,
              top: `${atom.y}%`,
              transform: `translate(-50%, -50%) scale(${atom.scale}) rotate(${atom.rotation}deg)`,
              color: atom.color,
            }}
          >
            <svg
              viewBox="0 0 40 44"
              width="32"
              height="35"
              xmlns="http://www.w3.org/2000/svg"
              style={{ overflow: "visible" }}
              dangerouslySetInnerHTML={{ __html: atom.svg }}
            />
          </div>
        ))}
      </div>

      {/* Inline controls */}
      <div className="flex items-center justify-between mt-2">
        <div className="flex items-center gap-3">
          <div className="text-[9px] font-medium text-neutral-400 uppercase tracking-wide">
            Bezier Doodles
          </div>
          <span className="text-[9px] font-semibold text-neutral-700">{atoms.length}</span>
        </div>
        <div className="flex items-center gap-2.5">
          <label className="flex items-center gap-1.5 text-[9px] text-neutral-500 cursor-pointer">
            <input
              type="checkbox"
              checked={mono}
              onChange={(e) => setMono(e.target.checked)}
              className="accent-neutral-800 w-3 h-3"
            />
            Mono
          </label>
          {mono && (
            <input
              type="color"
              value={monoColor}
              onChange={(e) => setMonoColor(e.target.value)}
              className="w-4 h-4 rounded cursor-pointer p-0 bg-transparent"
            />
          )}
          <input
            type="range"
            min={20}
            max={200}
            value={density}
            onChange={(e) => setDensity(+e.target.value)}
            className="w-14 h-1 bg-neutral-200 rounded-full appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-2.5 [&::-webkit-slider-thumb]:h-2.5 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-neutral-800"
          />
          <button
            onClick={() => setSeed((s) => s + 1)}
            className="p-1 rounded-lg hover:bg-neutral-200 transition-colors text-neutral-500"
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
              <path d="M3 3v5h5" />
              <path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16" />
              <path d="M16 16h5v5" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
};
