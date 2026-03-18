import React from "react";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface BodyType {
  name: string;
  shoulderW: number;
  torsoW: number;
  hipW: number;
  headS: number;
  legW: number;
  armW: number;
  heightMul: number;
}

export interface PoseCategory {
  name: string;
  fn: PoseFn;
}

export interface SceneCharacter {
  x: number;
  y: number;
  scale: number;
  seed: number;
  poseIdx: number;
  bodyIdx: number;
  accIdx: number;
}

interface PathData {
  d: string;
  stroke: boolean;
  fill: boolean;
  fillColor?: string;
  strokeWidth?: number;
}

type PoseFn = (seed: number, bodyIdx: number, accIdx: number) => PathData[];

// ---------------------------------------------------------------------------
// Utility: seeded random for reproducible "hand-drawn" wobble
// ---------------------------------------------------------------------------

export function mkRng(seed: number): () => number {
  let s = seed | 0;
  return () => {
    s = (s * 1103515245 + 12345) & 0x7fffffff;
    return s / 0x7fffffff;
  };
}

function wobble(val: number, amount: number, rng: () => number): number {
  return val + (rng() - 0.5) * amount * 2;
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

// ---------------------------------------------------------------------------
// Data
// ---------------------------------------------------------------------------

export const BODY_TYPES: BodyType[] = [
  { name: "\u7ea4\u7ec6", shoulderW: 0.7, torsoW: 0.6, hipW: 0.65, headS: 0.95, legW: 0.7, armW: 0.7, heightMul: 1.05 },
  { name: "\u4e2d\u7b49", shoulderW: 1, torsoW: 1, hipW: 1, headS: 1, legW: 1, armW: 1, heightMul: 1 },
  { name: "\u58ee\u5b9e", shoulderW: 1.35, torsoW: 1.3, hipW: 1.15, headS: 1.05, legW: 1.15, armW: 1.2, heightMul: 0.95 },
  { name: "\u9ad8\u7626", shoulderW: 0.8, torsoW: 0.7, hipW: 0.7, headS: 0.85, legW: 0.75, armW: 0.7, heightMul: 1.2 },
  { name: "\u5706\u6da6", shoulderW: 1.1, torsoW: 1.5, hipW: 1.4, headS: 1.1, legW: 1.0, armW: 1.1, heightMul: 0.9 },
  { name: "\u5a07\u5c0f", shoulderW: 0.75, torsoW: 0.75, hipW: 0.8, headS: 1.15, legW: 0.8, armW: 0.75, heightMul: 0.8 },
];

export const ACCESSORIES: string[] = [
  "\u65e0",
  "\u5e3d\u5b50",
  "\u80cc\u5305",
  "\u624b\u673a",
  "\u96e8\u4f1e",
  "\u624b\u63d0\u5305",
  "\u5496\u5561\u676f",
  "\u773c\u955c",
];

// ---------------------------------------------------------------------------
// Drawing helpers
// ---------------------------------------------------------------------------

function drawHead(
  cx: number,
  cy: number,
  r: number,
  rng: () => number,
  wb: number,
  _filled: boolean = false,
  hasHat: boolean = false,
  hasGlasses: boolean = false,
  _facing: number = 0,
): PathData[] {
  const paths: PathData[] = [];
  const pts: [number, number][] = [];

  for (let i = 0; i <= 20; i++) {
    const a = (i / 20) * Math.PI * 2;
    const rx = r * (1 + 0.05 * Math.sin(a * 3));
    const ry = r * 1.05 * (1 + 0.03 * Math.cos(a * 2));
    pts.push([
      cx + Math.cos(a) * wobble(rx, wb, rng),
      cy + Math.sin(a) * wobble(ry, wb, rng),
    ]);
  }

  let d = `M ${pts[0][0]} ${pts[0][1]}`;
  for (let i = 1; i < pts.length; i++) {
    const prev = pts[i - 1];
    const curr = pts[i];
    const cpx = (prev[0] + curr[0]) / 2 + (rng() - 0.5) * wb;
    const cpy = (prev[1] + curr[1]) / 2 + (rng() - 0.5) * wb;
    d += ` Q ${cpx} ${cpy} ${curr[0]} ${curr[1]}`;
  }
  d += " Z";
  paths.push({ d, stroke: true, fill: false });

  const hairD = `M ${cx - r * 0.7} ${cy - r * 0.6} Q ${cx - r * 0.5} ${cy - r * 1.4}, ${cx} ${cy - r * 1.3} Q ${cx + r * 0.5} ${cy - r * 1.4}, ${cx + r * 0.7} ${cy - r * 0.6}`;
  paths.push({ d: hairD, stroke: true, fill: true, fillColor: "#1a1a1a" });

  if (hasHat) {
    const hatD = `M ${cx - r * 1.2} ${cy - r * 0.7} L ${cx - r * 0.9} ${cy - r * 1.5} Q ${cx} ${cy - r * 1.8}, ${cx + r * 0.9} ${cy - r * 1.5} L ${cx + r * 1.2} ${cy - r * 0.7} Z`;
    paths.push({ d: hatD, stroke: true, fill: true, fillColor: "#1a1a1a" });
  }

  if (hasGlasses) {
    const gy = cy + r * 0.05;
    const gd = `M ${cx - r * 0.55} ${gy} A ${r * 0.2} ${r * 0.18} 0 1 1 ${cx - r * 0.15} ${gy} M ${cx - r * 0.15} ${gy} L ${cx + r * 0.15} ${gy} M ${cx + r * 0.15} ${gy} A ${r * 0.2} ${r * 0.18} 0 1 1 ${cx + r * 0.55} ${gy}`;
    paths.push({ d: gd, stroke: true, fill: false, strokeWidth: 1.5 });
  }

  return paths;
}

// ---------------------------------------------------------------------------
// Pose functions
// ---------------------------------------------------------------------------

function poseStanding(seed: number, bodyIdx: number, accIdx: number): PathData[] {
  const rng = mkRng(seed);
  const bt = BODY_TYPES[bodyIdx];
  const wb = 0.8;
  const paths: PathData[] = [];
  const s = bt.heightMul;
  const cx = 60,
    groundY = 175;
  const headR = 9 * bt.headS;
  const headCy = groundY - 140 * s;
  const neckBot = headCy + headR + 6;
  const shoulderY = neckBot + 2;
  const sw = 20 * bt.shoulderW;
  const waistY = shoulderY + 38 * s;
  const tw = 14 * bt.torsoW;
  const hipY = waistY + 12 * s;
  const hw = 16 * bt.hipW;
  const legBot = groundY;

  paths.push(...drawHead(cx, headCy, headR, rng, wb, false, accIdx === 1, accIdx === 7));
  paths.push({
    d: `M ${cx - 3} ${headCy + headR * 0.8} L ${wobble(cx - 3, wb, rng)} ${neckBot} L ${wobble(cx + 3, wb, rng)} ${neckBot} L ${cx + 3} ${headCy + headR * 0.8}`,
    stroke: true,
    fill: false,
  });

  const torsoD = `M ${cx - sw / 2} ${shoulderY} Q ${cx - sw / 2 - 2} ${lerp(shoulderY, waistY, 0.4)}, ${cx - tw / 2} ${waistY} L ${cx - hw / 2} ${hipY} L ${cx + hw / 2} ${hipY} L ${cx + tw / 2} ${waistY} Q ${cx + sw / 2 + 2} ${lerp(shoulderY, waistY, 0.4)}, ${cx + sw / 2} ${shoulderY} Z`;
  paths.push({ d: torsoD, stroke: true, fill: false });

  const armW = 4 * bt.armW;
  const laX = cx - sw / 2;
  const laEndY = waistY + 20 * s;
  paths.push({
    d: `M ${laX} ${shoulderY + 3} C ${laX - 8} ${lerp(shoulderY, laEndY, 0.3)}, ${laX - 10} ${lerp(shoulderY, laEndY, 0.6)}, ${laX - 5} ${laEndY}`,
    stroke: true,
    fill: false,
    strokeWidth: armW,
  });
  const raX = cx + sw / 2;
  paths.push({
    d: `M ${raX} ${shoulderY + 3} C ${raX + 8} ${lerp(shoulderY, laEndY, 0.3)}, ${raX + 10} ${lerp(shoulderY, laEndY, 0.6)}, ${raX + 5} ${laEndY}`,
    stroke: true,
    fill: false,
    strokeWidth: armW,
  });

  if (accIdx === 3) {
    paths.push({
      d: `M ${raX + 3} ${laEndY - 8} L ${raX + 3} ${laEndY + 2} L ${raX + 9} ${laEndY + 2} L ${raX + 9} ${laEndY - 8} Z`,
      stroke: true,
      fill: true,
      fillColor: "#1a1a1a",
    });
  }
  if (accIdx === 6) {
    paths.push({
      d: `M ${raX + 2} ${laEndY - 6} L ${raX + 1} ${laEndY + 2} L ${raX + 8} ${laEndY + 2} L ${raX + 7} ${laEndY - 6} Z`,
      stroke: true,
      fill: false,
      strokeWidth: 1.5,
    });
  }

  const legW = 5 * bt.legW;
  const legSpread = hw * 0.3;
  paths.push({
    d: `M ${cx - legSpread} ${hipY} C ${cx - legSpread - 2} ${lerp(hipY, legBot, 0.5)}, ${cx - legSpread + 1} ${lerp(hipY, legBot, 0.7)}, ${cx - legSpread - 1} ${legBot}`,
    stroke: true,
    fill: false,
    strokeWidth: legW,
  });
  paths.push({
    d: `M ${cx + legSpread} ${hipY} C ${cx + legSpread + 2} ${lerp(hipY, legBot, 0.5)}, ${cx + legSpread - 1} ${lerp(hipY, legBot, 0.7)}, ${cx + legSpread + 1} ${legBot}`,
    stroke: true,
    fill: false,
    strokeWidth: legW,
  });
  paths.push({
    d: `M ${cx - legSpread - 4} ${legBot} L ${cx - legSpread + 6} ${legBot}`,
    stroke: true,
    fill: false,
    strokeWidth: 2,
  });
  paths.push({
    d: `M ${cx + legSpread - 4} ${legBot} L ${cx + legSpread + 6} ${legBot}`,
    stroke: true,
    fill: false,
    strokeWidth: 2,
  });

  if (accIdx === 2) {
    paths.push({
      d: `M ${cx - sw / 2 - 3} ${shoulderY + 5} Q ${cx - sw / 2 - 12} ${lerp(shoulderY, waistY, 0.5)}, ${cx - sw / 2 - 4} ${waistY + 5} L ${cx - sw / 2 + 2} ${waistY + 5} L ${cx - sw / 2 + 2} ${shoulderY + 5} Z`,
      stroke: true,
      fill: false,
    });
  }
  if (accIdx === 5) {
    paths.push({
      d: `M ${raX + 4} ${laEndY - 2} L ${raX + 4} ${laEndY + 10} L ${raX + 14} ${laEndY + 10} L ${raX + 14} ${laEndY - 2} Z`,
      stroke: true,
      fill: false,
    });
    paths.push({
      d: `M ${raX + 6} ${laEndY - 2} Q ${raX + 9} ${laEndY - 8}, ${raX + 12} ${laEndY - 2}`,
      stroke: true,
      fill: false,
    });
  }

  return paths;
}

function poseWalking(seed: number, bodyIdx: number, accIdx: number): PathData[] {
  const rng = mkRng(seed);
  const bt = BODY_TYPES[bodyIdx];
  const wb = 0.6;
  const paths: PathData[] = [];
  const s = bt.heightMul;
  const cx = 60,
    groundY = 175;
  const headR = 8.5 * bt.headS;
  const headCy = groundY - 135 * s;
  const neckBot = headCy + headR + 5;
  const shoulderY = neckBot + 2;
  const sw = 18 * bt.shoulderW;
  const waistY = shoulderY + 35 * s;
  const tw = 13 * bt.torsoW;
  const hipY = waistY + 10 * s;
  const hw = 14 * bt.hipW;
  const legBot = groundY;
  const lean = 3;

  paths.push(...drawHead(cx + lean, headCy, headR, rng, wb, false, accIdx === 1, accIdx === 7));
  paths.push({
    d: `M ${cx + lean - 3} ${headCy + headR * 0.8} L ${cx - 2} ${neckBot} L ${cx + 4} ${neckBot} L ${cx + lean + 3} ${headCy + headR * 0.8}`,
    stroke: true,
    fill: false,
  });

  const torsoD = `M ${cx - sw / 2 + lean / 2} ${shoulderY} Q ${cx - sw / 2} ${lerp(shoulderY, waistY, 0.5)}, ${cx - tw / 2} ${waistY} L ${cx - hw / 2} ${hipY} L ${cx + hw / 2} ${hipY} L ${cx + tw / 2} ${waistY} Q ${cx + sw / 2} ${lerp(shoulderY, waistY, 0.5)}, ${cx + sw / 2 + lean / 2} ${shoulderY} Z`;
  paths.push({ d: torsoD, stroke: true, fill: false });

  const armW = 3.5 * bt.armW;
  const laX = cx - sw / 2 + lean / 2;
  paths.push({
    d: `M ${laX} ${shoulderY + 3} C ${laX + 6} ${lerp(shoulderY, waistY, 0.4)}, ${laX + 10} ${lerp(shoulderY, waistY, 0.7)}, ${laX + 8} ${waistY + 8}`,
    stroke: true,
    fill: false,
    strokeWidth: armW,
  });
  const raX = cx + sw / 2 + lean / 2;
  paths.push({
    d: `M ${raX} ${shoulderY + 3} C ${raX - 4} ${lerp(shoulderY, waistY, 0.4)}, ${raX - 8} ${lerp(shoulderY, waistY, 0.7)}, ${raX - 10} ${waistY + 5}`,
    stroke: true,
    fill: false,
    strokeWidth: armW,
  });

  const legW = 4.5 * bt.legW;
  const flX = cx + hw * 0.15;
  paths.push({
    d: `M ${flX} ${hipY} C ${flX + 10} ${lerp(hipY, legBot, 0.3)}, ${flX + 14} ${lerp(hipY, legBot, 0.6)}, ${flX + 10} ${legBot}`,
    stroke: true,
    fill: false,
    strokeWidth: legW,
  });
  const blX = cx - hw * 0.15;
  paths.push({
    d: `M ${blX} ${hipY} C ${blX - 8} ${lerp(hipY, legBot, 0.3)}, ${blX - 12} ${lerp(hipY, legBot, 0.6)}, ${blX - 8} ${legBot}`,
    stroke: true,
    fill: false,
    strokeWidth: legW,
  });
  paths.push({
    d: `M ${flX + 7} ${legBot} L ${flX + 16} ${legBot}`,
    stroke: true,
    fill: false,
    strokeWidth: 2,
  });
  paths.push({
    d: `M ${blX - 12} ${legBot} L ${blX - 3} ${legBot}`,
    stroke: true,
    fill: false,
    strokeWidth: 2,
  });

  if (accIdx === 4) {
    const ux = raX + 2,
      uy = shoulderY - 5;
    paths.push({
      d: `M ${ux} ${uy} L ${ux} ${shoulderY + 30}`,
      stroke: true,
      fill: false,
      strokeWidth: 1.5,
    });
    paths.push({
      d: `M ${ux - 18} ${uy} Q ${ux} ${uy - 20}, ${ux + 18} ${uy}`,
      stroke: true,
      fill: false,
      strokeWidth: 1.5,
    });
    paths.push({
      d: `M ${ux - 18} ${uy} L ${ux + 18} ${uy}`,
      stroke: true,
      fill: false,
    });
  }
  if (accIdx === 2) {
    paths.push({
      d: `M ${cx + sw / 2 + 1} ${shoulderY + 3} Q ${cx + sw / 2 + 10} ${lerp(shoulderY, waistY, 0.5)}, ${cx + sw / 2 + 3} ${waistY + 3} L ${cx + sw / 2 - 1} ${waistY} L ${cx + sw / 2 - 1} ${shoulderY + 3} Z`,
      stroke: true,
      fill: false,
    });
  }
  if (accIdx === 3) {
    paths.push({
      d: `M ${laX + 6} ${waistY} L ${laX + 6} ${waistY + 8} L ${laX + 12} ${waistY + 8} L ${laX + 12} ${waistY} Z`,
      stroke: true,
      fill: true,
      fillColor: "#1a1a1a",
    });
  }

  return paths;
}

function poseSitting(seed: number, bodyIdx: number, accIdx: number): PathData[] {
  const rng = mkRng(seed);
  const bt = BODY_TYPES[bodyIdx];
  const paths: PathData[] = [];
  const s = bt.heightMul;
  const cx = 60,
    groundY = 175;
  const headR = 9 * bt.headS;
  const seatY = groundY - 40;
  const headCy = seatY - 55 * s;
  const neckBot = headCy + headR + 5;
  const shoulderY = neckBot + 2;
  const sw = 19 * bt.shoulderW;
  const waistY = shoulderY + 30 * s;
  const tw = 14 * bt.torsoW;

  paths.push(...drawHead(cx, headCy, headR, rng, 0.6, false, accIdx === 1, accIdx === 7));
  paths.push({
    d: `M ${cx - 3} ${headCy + headR * 0.8} L ${cx - 3} ${neckBot} L ${cx + 3} ${neckBot} L ${cx + 3} ${headCy + headR * 0.8}`,
    stroke: true,
    fill: false,
  });
  paths.push({
    d: `M ${cx - sw / 2} ${shoulderY} Q ${cx - sw / 2 - 1} ${lerp(shoulderY, waistY, 0.5)}, ${cx - tw / 2} ${waistY} L ${cx + tw / 2} ${waistY} Q ${cx + sw / 2 + 1} ${lerp(shoulderY, waistY, 0.5)}, ${cx + sw / 2} ${shoulderY} Z`,
    stroke: true,
    fill: false,
  });

  const armW = 3.5 * bt.armW;
  paths.push({
    d: `M ${cx - sw / 2} ${shoulderY + 3} C ${cx - sw / 2 - 5} ${lerp(shoulderY, waistY, 0.5)}, ${cx - sw / 2 + 5} ${waistY - 3}, ${cx - tw / 2 + 5} ${waistY + 5}`,
    stroke: true,
    fill: false,
    strokeWidth: armW,
  });
  paths.push({
    d: `M ${cx + sw / 2} ${shoulderY + 3} C ${cx + sw / 2 + 5} ${lerp(shoulderY, waistY, 0.5)}, ${cx + sw / 2 - 5} ${waistY - 3}, ${cx + tw / 2 - 5} ${waistY + 5}`,
    stroke: true,
    fill: false,
    strokeWidth: armW,
  });

  const legW = 5.5 * bt.legW;
  const kneeX1 = cx - 20,
    kneeX2 = cx + 20;
  paths.push({
    d: `M ${cx - tw / 2 - 2} ${waistY + 2} C ${cx - 10} ${waistY + 5}, ${kneeX1 + 5} ${seatY - 3}, ${kneeX1} ${seatY}`,
    stroke: true,
    fill: false,
    strokeWidth: legW,
  });
  paths.push({
    d: `M ${cx + tw / 2 + 2} ${waistY + 2} C ${cx + 10} ${waistY + 5}, ${kneeX2 - 5} ${seatY - 3}, ${kneeX2} ${seatY}`,
    stroke: true,
    fill: false,
    strokeWidth: legW,
  });

  const shinW = 4.5 * bt.legW;
  paths.push({
    d: `M ${kneeX1} ${seatY} C ${kneeX1 - 2} ${lerp(seatY, groundY, 0.5)}, ${kneeX1 - 1} ${lerp(seatY, groundY, 0.7)}, ${kneeX1 - 2} ${groundY}`,
    stroke: true,
    fill: false,
    strokeWidth: shinW,
  });
  paths.push({
    d: `M ${kneeX2} ${seatY} C ${kneeX2 + 2} ${lerp(seatY, groundY, 0.5)}, ${kneeX2 + 1} ${lerp(seatY, groundY, 0.7)}, ${kneeX2 + 2} ${groundY}`,
    stroke: true,
    fill: false,
    strokeWidth: shinW,
  });
  paths.push({
    d: `M ${kneeX1 - 6} ${groundY} L ${kneeX1 + 4} ${groundY}`,
    stroke: true,
    fill: false,
    strokeWidth: 2.2,
  });
  paths.push({
    d: `M ${kneeX2 - 4} ${groundY} L ${kneeX2 + 6} ${groundY}`,
    stroke: true,
    fill: false,
    strokeWidth: 2.2,
  });

  // Seat line
  paths.push({
    d: `M ${cx - 30} ${seatY + 3} L ${cx + 30} ${seatY + 3}`,
    stroke: true,
    fill: false,
    strokeWidth: 1.5,
  });

  if (accIdx === 3) {
    paths.push({
      d: `M ${cx + tw / 2 - 2} ${waistY - 2} L ${cx + tw / 2 - 2} ${waistY + 8} L ${cx + tw / 2 + 4} ${waistY + 8} L ${cx + tw / 2 + 4} ${waistY - 2} Z`,
      stroke: true,
      fill: true,
      fillColor: "#1a1a1a",
    });
  }
  if (accIdx === 6) {
    paths.push({
      d: `M ${cx - tw / 2 + 2} ${waistY} L ${cx - tw / 2 + 1} ${waistY + 8} L ${cx - tw / 2 + 8} ${waistY + 8} L ${cx - tw / 2 + 7} ${waistY} Z`,
      stroke: true,
      fill: false,
      strokeWidth: 1.3,
    });
  }

  return paths;
}

function poseLookingAtArt(seed: number, bodyIdx: number, accIdx: number): PathData[] {
  const rng = mkRng(seed);
  const bt = BODY_TYPES[bodyIdx];
  const paths: PathData[] = [];
  const s = bt.heightMul;
  const cx = 60,
    groundY = 175;
  const headR = 8.5 * bt.headS;
  const headCy = groundY - 130 * s;
  const neckBot = headCy + headR + 5;
  const shoulderY = neckBot + 2;
  const sw = 20 * bt.shoulderW;
  const waistY = shoulderY + 36 * s;
  const tw = 15 * bt.torsoW;
  const hipY = waistY + 10 * s;
  const hw = 16 * bt.hipW;
  const legBot = groundY;

  // Head (silhouette style)
  const headPts: [number, number][] = [];
  for (let i = 0; i <= 16; i++) {
    const a = (i / 16) * Math.PI * 2;
    headPts.push([
      cx + Math.cos(a) * headR * (1 + 0.04 * Math.sin(a * 3)),
      headCy + Math.sin(a) * headR * 1.05,
    ]);
  }
  let hd = `M ${headPts[0][0]} ${headPts[0][1]}`;
  for (let i = 1; i < headPts.length; i++) {
    hd += ` L ${headPts[i][0]} ${headPts[i][1]}`;
  }
  hd += " Z";
  paths.push({ d: hd, stroke: true, fill: true, fillColor: "#1a1a1a" });

  // Neck
  paths.push({
    d: `M ${cx - 3.5} ${headCy + headR * 0.7} L ${cx - 3.5} ${neckBot} L ${cx + 3.5} ${neckBot} L ${cx + 3.5} ${headCy + headR * 0.7}`,
    stroke: true,
    fill: false,
  });

  // Coat / torso
  const coatD = `M ${cx - sw / 2} ${shoulderY} L ${cx - sw / 2 - 1} ${waistY} L ${cx - hw / 2} ${hipY + 15} L ${cx + hw / 2} ${hipY + 15} L ${cx + sw / 2 + 1} ${waistY} L ${cx + sw / 2} ${shoulderY} Z`;
  paths.push({ d: coatD, stroke: true, fill: false });
  paths.push({
    d: `M ${cx} ${shoulderY + 3} L ${cx} ${hipY + 12}`,
    stroke: true,
    fill: false,
    strokeWidth: 0.7,
  });

  // Arms
  const armW = 3.5 * bt.armW;
  const armEndY = waistY + 15 * s;
  paths.push({
    d: `M ${cx - sw / 2} ${shoulderY + 3} C ${cx - sw / 2 - 3} ${lerp(shoulderY, armEndY, 0.4)}, ${cx - sw / 2 - 2} ${lerp(shoulderY, armEndY, 0.7)}, ${cx - sw / 2 - 1} ${armEndY}`,
    stroke: true,
    fill: false,
    strokeWidth: armW,
  });
  paths.push({
    d: `M ${cx + sw / 2} ${shoulderY + 3} C ${cx + sw / 2 + 3} ${lerp(shoulderY, armEndY, 0.4)}, ${cx + sw / 2 + 2} ${lerp(shoulderY, armEndY, 0.7)}, ${cx + sw / 2 + 1} ${armEndY}`,
    stroke: true,
    fill: false,
    strokeWidth: armW,
  });

  // Legs
  const legW = 5 * bt.legW;
  const ls = hw * 0.25;
  paths.push({
    d: `M ${cx - ls} ${hipY + 15} L ${cx - ls - 1} ${legBot}`,
    stroke: true,
    fill: false,
    strokeWidth: legW,
  });
  paths.push({
    d: `M ${cx + ls} ${hipY + 15} L ${cx + ls + 1} ${legBot}`,
    stroke: true,
    fill: false,
    strokeWidth: legW,
  });
  paths.push({
    d: `M ${cx - ls - 5} ${legBot} L ${cx - ls + 4} ${legBot}`,
    stroke: true,
    fill: false,
    strokeWidth: 2,
  });
  paths.push({
    d: `M ${cx + ls - 4} ${legBot} L ${cx + ls + 5} ${legBot}`,
    stroke: true,
    fill: false,
    strokeWidth: 2,
  });

  // Art frame above head
  paths.push({
    d: `M ${cx - 22} ${headCy - headR - 60} L ${cx + 22} ${headCy - headR - 60} L ${cx + 22} ${headCy - headR - 25} L ${cx - 22} ${headCy - headR - 25} Z`,
    stroke: true,
    fill: false,
    strokeWidth: 1.2,
  });

  if (accIdx === 5) {
    paths.push({
      d: `M ${cx + sw / 2 + 1} ${shoulderY + 10} L ${cx + sw / 2 + 1} ${waistY + 5} L ${cx + sw / 2 + 10} ${waistY + 5} L ${cx + sw / 2 + 10} ${shoulderY + 10} Z`,
      stroke: true,
      fill: false,
    });
  }

  // Suppress unused variable warnings
  void rng;
  void tw;

  return paths;
}

function poseUsingPhone(seed: number, bodyIdx: number, accIdx: number): PathData[] {
  const rng = mkRng(seed);
  const bt = BODY_TYPES[bodyIdx];
  const paths: PathData[] = [];
  const s = bt.heightMul;
  const cx = 60,
    groundY = 175;
  const headR = 8.5 * bt.headS;
  const headCy = groundY - 128 * s;
  const headTilt = 4;
  const headDrawCy = headCy + headTilt;

  paths.push(...drawHead(cx + 2, headDrawCy, headR, rng, 0.6, false, accIdx === 1, accIdx === 7));

  const neckBot = headDrawCy + headR + 4;
  const shoulderY = neckBot + 2;
  const sw = 18 * bt.shoulderW;
  const waistY = shoulderY + 34 * s;
  const tw = 13 * bt.torsoW;
  const hipY = waistY + 10 * s;
  const hw = 14 * bt.hipW;
  const legBot = groundY;

  paths.push({
    d: `M ${cx - 2} ${headDrawCy + headR * 0.8} L ${cx - 3} ${neckBot} L ${cx + 3} ${neckBot} L ${cx + 4} ${headDrawCy + headR * 0.8}`,
    stroke: true,
    fill: false,
  });
  paths.push({
    d: `M ${cx - sw / 2} ${shoulderY} Q ${cx - sw / 2} ${lerp(shoulderY, waistY, 0.5)}, ${cx - tw / 2} ${waistY} L ${cx - hw / 2} ${hipY} L ${cx + hw / 2} ${hipY} L ${cx + tw / 2} ${waistY} Q ${cx + sw / 2} ${lerp(shoulderY, waistY, 0.5)}, ${cx + sw / 2} ${shoulderY} Z`,
    stroke: true,
    fill: false,
  });

  const armW = 3.5 * bt.armW;
  const phoneY = shoulderY + 22;
  const phoneX = cx + 2;
  paths.push({
    d: `M ${cx - sw / 2} ${shoulderY + 3} C ${cx - sw / 2 + 2} ${shoulderY + 12}, ${phoneX - 8} ${phoneY - 5}, ${phoneX - 3} ${phoneY}`,
    stroke: true,
    fill: false,
    strokeWidth: armW,
  });
  paths.push({
    d: `M ${cx + sw / 2} ${shoulderY + 3} C ${cx + sw / 2 - 2} ${shoulderY + 12}, ${phoneX + 8} ${phoneY - 5}, ${phoneX + 3} ${phoneY}`,
    stroke: true,
    fill: false,
    strokeWidth: armW,
  });
  paths.push({
    d: `M ${phoneX - 4} ${phoneY - 5} L ${phoneX - 4} ${phoneY + 5} L ${phoneX + 4} ${phoneY + 5} L ${phoneX + 4} ${phoneY - 5} Z`,
    stroke: true,
    fill: true,
    fillColor: "#1a1a1a",
  });

  const legW = 4.5 * bt.legW;
  const ls = hw * 0.25;
  paths.push({
    d: `M ${cx - ls} ${hipY} L ${cx - ls - 1} ${legBot}`,
    stroke: true,
    fill: false,
    strokeWidth: legW,
  });
  paths.push({
    d: `M ${cx + ls} ${hipY} L ${cx + ls + 1} ${legBot}`,
    stroke: true,
    fill: false,
    strokeWidth: legW,
  });
  paths.push({
    d: `M ${cx - ls - 5} ${legBot} L ${cx - ls + 4} ${legBot}`,
    stroke: true,
    fill: false,
    strokeWidth: 2,
  });
  paths.push({
    d: `M ${cx + ls - 4} ${legBot} L ${cx + ls + 5} ${legBot}`,
    stroke: true,
    fill: false,
    strokeWidth: 2,
  });

  return paths;
}

function poseWaving(seed: number, bodyIdx: number, accIdx: number): PathData[] {
  const rng = mkRng(seed);
  const bt = BODY_TYPES[bodyIdx];
  const paths: PathData[] = [];
  const s = bt.heightMul;
  const cx = 60,
    groundY = 175;
  const headR = 9 * bt.headS;
  const headCy = groundY - 138 * s;

  paths.push(...drawHead(cx, headCy, headR, rng, 0.7, false, accIdx === 1, accIdx === 7));

  const neckBot = headCy + headR + 5;
  const shoulderY = neckBot + 2;
  const sw = 19 * bt.shoulderW;
  const waistY = shoulderY + 36 * s;
  const tw = 14 * bt.torsoW;
  const hipY = waistY + 10 * s;
  const hw = 15 * bt.hipW;
  const legBot = groundY;

  paths.push({
    d: `M ${cx - 3} ${headCy + headR * 0.8} L ${cx - 3} ${neckBot} L ${cx + 3} ${neckBot} L ${cx + 3} ${headCy + headR * 0.8}`,
    stroke: true,
    fill: false,
  });
  paths.push({
    d: `M ${cx - sw / 2} ${shoulderY} Q ${cx - sw / 2 - 1} ${lerp(shoulderY, waistY, 0.5)}, ${cx - tw / 2} ${waistY} L ${cx - hw / 2} ${hipY} L ${cx + hw / 2} ${hipY} L ${cx + tw / 2} ${waistY} Q ${cx + sw / 2 + 1} ${lerp(shoulderY, waistY, 0.5)}, ${cx + sw / 2} ${shoulderY} Z`,
    stroke: true,
    fill: false,
  });

  const armW = 3.5 * bt.armW;
  const laEndY = waistY + 18 * s;
  paths.push({
    d: `M ${cx - sw / 2} ${shoulderY + 3} C ${cx - sw / 2 - 5} ${lerp(shoulderY, laEndY, 0.4)}, ${cx - sw / 2 - 3} ${lerp(shoulderY, laEndY, 0.7)}, ${cx - sw / 2 - 2} ${laEndY}`,
    stroke: true,
    fill: false,
    strokeWidth: armW,
  });

  const raX = cx + sw / 2;
  const waveTopY = headCy - headR * 0.5;
  paths.push({
    d: `M ${raX} ${shoulderY + 3} C ${raX + 12} ${shoulderY - 10}, ${raX + 16} ${waveTopY + 10}, ${raX + 12} ${waveTopY}`,
    stroke: true,
    fill: false,
    strokeWidth: armW,
  });
  paths.push({
    d: `M ${raX + 10} ${waveTopY - 3} L ${raX + 14} ${waveTopY - 3} L ${raX + 14} ${waveTopY + 4} L ${raX + 10} ${waveTopY + 4} Z`,
    stroke: true,
    fill: false,
    strokeWidth: 1,
  });

  const legW = 4.5 * bt.legW;
  const ls = hw * 0.25;
  paths.push({
    d: `M ${cx - ls} ${hipY} L ${cx - ls} ${legBot}`,
    stroke: true,
    fill: false,
    strokeWidth: legW,
  });
  paths.push({
    d: `M ${cx + ls} ${hipY} L ${cx + ls} ${legBot}`,
    stroke: true,
    fill: false,
    strokeWidth: legW,
  });
  paths.push({
    d: `M ${cx - ls - 5} ${legBot} L ${cx - ls + 4} ${legBot}`,
    stroke: true,
    fill: false,
    strokeWidth: 2,
  });
  paths.push({
    d: `M ${cx + ls - 4} ${legBot} L ${cx + ls + 5} ${legBot}`,
    stroke: true,
    fill: false,
    strokeWidth: 2,
  });

  return paths;
}

function poseRunning(seed: number, bodyIdx: number, accIdx: number): PathData[] {
  const rng = mkRng(seed);
  const bt = BODY_TYPES[bodyIdx];
  const paths: PathData[] = [];
  const s = bt.heightMul;
  const cx = 60,
    groundY = 175;
  const headR = 8 * bt.headS;
  const headCy = groundY - 130 * s;
  const lean = 8;

  paths.push(...drawHead(cx + lean + 4, headCy - 3, headR, rng, 0.5, false, accIdx === 1, accIdx === 7));

  const neckBot = headCy + headR + 3;
  const shoulderY = neckBot + 2;
  const sw = 18 * bt.shoulderW;
  const waistY = shoulderY + 30 * s;
  const hipY = waistY + 8 * s;
  const hw = 13 * bt.hipW;
  const legBot = groundY;

  paths.push({
    d: `M ${cx + lean + 1} ${headCy + headR * 0.7} L ${cx + lean / 2 - 2} ${neckBot} L ${cx + lean / 2 + 3} ${neckBot} L ${cx + lean + 5} ${headCy + headR * 0.7}`,
    stroke: true,
    fill: false,
  });
  paths.push({
    d: `M ${cx - sw / 2 + lean} ${shoulderY} L ${cx - (sw / 2) * 0.7} ${waistY} L ${cx - hw / 2} ${hipY} L ${cx + hw / 2} ${hipY} L ${cx + (sw / 2) * 0.7} ${waistY} L ${cx + sw / 2 + lean} ${shoulderY} Z`,
    stroke: true,
    fill: false,
  });

  const armW = 3 * bt.armW;
  paths.push({
    d: `M ${cx - sw / 2 + lean} ${shoulderY + 2} C ${cx + lean + 10} ${shoulderY + 10}, ${cx + lean + 18} ${shoulderY + 15}, ${cx + lean + 15} ${shoulderY + 25}`,
    stroke: true,
    fill: false,
    strokeWidth: armW,
  });
  paths.push({
    d: `M ${cx + sw / 2 + lean} ${shoulderY + 2} C ${cx + lean - 8} ${shoulderY + 15}, ${cx - 12} ${waistY - 5}, ${cx - 15} ${waistY + 8}`,
    stroke: true,
    fill: false,
    strokeWidth: armW,
  });

  const legW = 4.5 * bt.legW;
  paths.push({
    d: `M ${cx + hw * 0.2} ${hipY} C ${cx + 15} ${lerp(hipY, legBot, 0.3)}, ${cx + 25} ${lerp(hipY, legBot, 0.5)}, ${cx + 22} ${legBot}`,
    stroke: true,
    fill: false,
    strokeWidth: legW,
  });
  paths.push({
    d: `M ${cx - hw * 0.2} ${hipY} C ${cx - 15} ${lerp(hipY, legBot, 0.2)}, ${cx - 25} ${lerp(hipY, legBot, 0.5)}, ${cx - 20} ${legBot - 8}`,
    stroke: true,
    fill: false,
    strokeWidth: legW,
  });
  paths.push({
    d: `M ${cx + 19} ${legBot} L ${cx + 28} ${legBot}`,
    stroke: true,
    fill: false,
    strokeWidth: 2,
  });
  paths.push({
    d: `M ${cx - 24} ${legBot - 8} L ${cx - 16} ${legBot - 10}`,
    stroke: true,
    fill: false,
    strokeWidth: 2,
  });

  return paths;
}

function poseTalking(seed: number, bodyIdx: number, accIdx: number): PathData[] {
  const rng = mkRng(seed);
  const bt = BODY_TYPES[bodyIdx];
  const bt2 = BODY_TYPES[(bodyIdx + 2) % BODY_TYPES.length];
  const paths: PathData[] = [];
  const groundY = 175;

  // Person 1
  const cx1 = 38;
  const s1 = bt.heightMul;
  const headR1 = 7.5 * bt.headS;
  const headCy1 = groundY - 115 * s1;

  paths.push(...drawHead(cx1, headCy1, headR1, rng, 0.5, false, false, false));

  const neckBot1 = headCy1 + headR1 + 4;
  const shY1 = neckBot1 + 2;
  const sw1 = 15 * bt.shoulderW;
  const wY1 = shY1 + 28 * s1;
  const hY1 = wY1 + 8 * s1;

  paths.push({
    d: `M ${cx1 - 3} ${headCy1 + headR1 * 0.7} L ${cx1 - 2} ${neckBot1} L ${cx1 + 2} ${neckBot1} L ${cx1 + 3} ${headCy1 + headR1 * 0.7}`,
    stroke: true,
    fill: false,
  });
  paths.push({
    d: `M ${cx1 - sw1 / 2} ${shY1} L ${cx1 - (sw1 / 2) * 0.7} ${wY1} L ${cx1 - sw1 * 0.35} ${hY1} L ${cx1 + sw1 * 0.35} ${hY1} L ${cx1 + (sw1 / 2) * 0.7} ${wY1} L ${cx1 + sw1 / 2} ${shY1} Z`,
    stroke: true,
    fill: false,
  });
  paths.push({
    d: `M ${cx1 + sw1 / 2} ${shY1 + 2} C ${cx1 + sw1 / 2 + 8} ${shY1 + 8}, ${cx1 + sw1 / 2 + 12} ${shY1 + 5}, ${cx1 + sw1 / 2 + 10} ${shY1 + 15}`,
    stroke: true,
    fill: false,
    strokeWidth: 3 * bt.armW,
  });
  paths.push({
    d: `M ${cx1 - sw1 / 2} ${shY1 + 2} C ${cx1 - sw1 / 2 - 3} ${lerp(shY1, wY1, 0.5)}, ${cx1 - sw1 / 2 - 1} ${wY1 - 2}, ${cx1 - sw1 / 2} ${wY1 + 8}`,
    stroke: true,
    fill: false,
    strokeWidth: 3 * bt.armW,
  });
  paths.push({
    d: `M ${cx1 - 4} ${hY1} L ${cx1 - 5} ${groundY}`,
    stroke: true,
    fill: false,
    strokeWidth: 4 * bt.legW,
  });
  paths.push({
    d: `M ${cx1 + 4} ${hY1} L ${cx1 + 5} ${groundY}`,
    stroke: true,
    fill: false,
    strokeWidth: 4 * bt.legW,
  });
  paths.push({
    d: `M ${cx1 - 9} ${groundY} L ${cx1 + 1} ${groundY}`,
    stroke: true,
    fill: false,
    strokeWidth: 2,
  });
  paths.push({
    d: `M ${cx1 + 1} ${groundY} L ${cx1 + 9} ${groundY}`,
    stroke: true,
    fill: false,
    strokeWidth: 2,
  });

  // Person 2
  const cx2 = 82;
  const s2 = bt2.heightMul;
  const headR2 = 7.5 * bt2.headS;
  const headCy2 = groundY - 115 * s2;

  paths.push(...drawHead(cx2, headCy2, headR2, rng, 0.5, false, accIdx === 1, accIdx === 7));

  const neckBot2 = headCy2 + headR2 + 4;
  const shY2 = neckBot2 + 2;
  const sw2 = 15 * bt2.shoulderW;
  const wY2 = shY2 + 28 * s2;
  const hY2 = wY2 + 8 * s2;

  paths.push({
    d: `M ${cx2 - 3} ${headCy2 + headR2 * 0.7} L ${cx2 - 2} ${neckBot2} L ${cx2 + 2} ${neckBot2} L ${cx2 + 3} ${headCy2 + headR2 * 0.7}`,
    stroke: true,
    fill: false,
  });
  paths.push({
    d: `M ${cx2 - sw2 / 2} ${shY2} L ${cx2 - (sw2 / 2) * 0.7} ${wY2} L ${cx2 - sw2 * 0.35} ${hY2} L ${cx2 + sw2 * 0.35} ${hY2} L ${cx2 + (sw2 / 2) * 0.7} ${wY2} L ${cx2 + sw2 / 2} ${shY2} Z`,
    stroke: true,
    fill: false,
  });
  paths.push({
    d: `M ${cx2 - sw2 / 2} ${shY2 + 2} C ${cx2 - sw2 / 2 - 6} ${shY2 + 10}, ${cx2 - sw2 / 2 - 4} ${shY2 + 18}, ${cx2 - sw2 / 2 - 2} ${wY2 + 5}`,
    stroke: true,
    fill: false,
    strokeWidth: 3 * bt2.armW,
  });
  paths.push({
    d: `M ${cx2 + sw2 / 2} ${shY2 + 2} C ${cx2 + sw2 / 2 + 3} ${lerp(shY2, wY2, 0.5)}, ${cx2 + sw2 / 2 + 1} ${wY2 - 2}, ${cx2 + sw2 / 2} ${wY2 + 8}`,
    stroke: true,
    fill: false,
    strokeWidth: 3 * bt2.armW,
  });
  paths.push({
    d: `M ${cx2 - 4} ${hY2} L ${cx2 - 5} ${groundY}`,
    stroke: true,
    fill: false,
    strokeWidth: 4 * bt2.legW,
  });
  paths.push({
    d: `M ${cx2 + 4} ${hY2} L ${cx2 + 5} ${groundY}`,
    stroke: true,
    fill: false,
    strokeWidth: 4 * bt2.legW,
  });
  paths.push({
    d: `M ${cx2 - 9} ${groundY} L ${cx2 + 1} ${groundY}`,
    stroke: true,
    fill: false,
    strokeWidth: 2,
  });
  paths.push({
    d: `M ${cx2 + 1} ${groundY} L ${cx2 + 9} ${groundY}`,
    stroke: true,
    fill: false,
    strokeWidth: 2,
  });

  return paths;
}

function poseLeaning(seed: number, bodyIdx: number, accIdx: number): PathData[] {
  const rng = mkRng(seed);
  const bt = BODY_TYPES[bodyIdx];
  const paths: PathData[] = [];
  const s = bt.heightMul;
  const cx = 55,
    groundY = 175;
  const headR = 9 * bt.headS;
  const headCy = groundY - 125 * s;
  const lean = -6;

  paths.push(...drawHead(cx + lean, headCy, headR, rng, 0.6, false, accIdx === 1, accIdx === 7));

  const neckBot = headCy + headR + 5;
  const shoulderY = neckBot + 2;
  const sw = 19 * bt.shoulderW;
  const waistY = shoulderY + 34 * s;
  const tw = 14 * bt.torsoW;
  const hipY = waistY + 10 * s;
  const hw = 15 * bt.hipW;
  const legBot = groundY;

  paths.push({
    d: `M ${cx + lean - 3} ${headCy + headR * 0.8} L ${cx - 2} ${neckBot} L ${cx + 4} ${neckBot} L ${cx + lean + 3} ${headCy + headR * 0.8}`,
    stroke: true,
    fill: false,
  });
  paths.push({
    d: `M ${cx - sw / 2 + lean} ${shoulderY} Q ${cx - sw / 2 + lean - 2} ${lerp(shoulderY, waistY, 0.5)}, ${cx - tw / 2 + lean / 2} ${waistY} L ${cx - hw / 2} ${hipY} L ${cx + hw / 2} ${hipY} L ${cx + tw / 2 + lean / 2} ${waistY} Q ${cx + sw / 2 + lean + 2} ${lerp(shoulderY, waistY, 0.5)}, ${cx + sw / 2 + lean} ${shoulderY} Z`,
    stroke: true,
    fill: false,
  });

  // Wall / post to lean against
  paths.push({
    d: `M ${cx - sw / 2 + lean - 6} ${headCy - headR - 10} L ${cx - sw / 2 + lean - 6} ${groundY}`,
    stroke: true,
    fill: false,
    strokeWidth: 1.5,
  });

  // Arms crossed
  const armW = 3.5 * bt.armW;
  paths.push({
    d: `M ${cx - sw / 2 + lean} ${shoulderY + 3} C ${cx + lean} ${shoulderY + 15}, ${cx + lean + 8} ${shoulderY + 18}, ${cx + tw / 2 + lean / 2 - 2} ${waistY - 5}`,
    stroke: true,
    fill: false,
    strokeWidth: armW,
  });
  paths.push({
    d: `M ${cx + sw / 2 + lean} ${shoulderY + 3} C ${cx + lean} ${shoulderY + 15}, ${cx + lean - 8} ${shoulderY + 18}, ${cx - tw / 2 + lean / 2 + 2} ${waistY - 5}`,
    stroke: true,
    fill: false,
    strokeWidth: armW,
  });

  // Legs
  const legW = 4.5 * bt.legW;
  paths.push({
    d: `M ${cx - hw * 0.2} ${hipY} C ${cx + 5} ${lerp(hipY, legBot, 0.4)}, ${cx + 8} ${lerp(hipY, legBot, 0.7)}, ${cx + 5} ${legBot}`,
    stroke: true,
    fill: false,
    strokeWidth: legW,
  });
  paths.push({
    d: `M ${cx + hw * 0.2} ${hipY} C ${cx - 2} ${lerp(hipY, legBot, 0.3)}, ${cx - 5} ${lerp(hipY, legBot, 0.6)}, ${cx - 3} ${legBot}`,
    stroke: true,
    fill: false,
    strokeWidth: legW,
  });
  paths.push({
    d: `M ${cx + 2} ${legBot} L ${cx + 11} ${legBot}`,
    stroke: true,
    fill: false,
    strokeWidth: 2,
  });
  paths.push({
    d: `M ${cx - 7} ${legBot} L ${cx + 2} ${legBot}`,
    stroke: true,
    fill: false,
    strokeWidth: 2,
  });

  return paths;
}

// ---------------------------------------------------------------------------
// Pose categories
// ---------------------------------------------------------------------------

export const POSE_CATEGORIES: PoseCategory[] = [
  { name: "\u7ad9\u7acb", fn: poseStanding },
  { name: "\u884c\u8d70", fn: poseWalking },
  { name: "\u5750\u59ff", fn: poseSitting },
  { name: "\u770b\u753b", fn: poseLookingAtArt },
  { name: "\u73a9\u624b\u673a", fn: poseUsingPhone },
  { name: "\u6325\u624b", fn: poseWaving },
  { name: "\u5954\u8dd1", fn: poseRunning },
  { name: "\u5bf9\u8bdd", fn: poseTalking },
  { name: "\u501a\u9760", fn: poseLeaning },
];

// ---------------------------------------------------------------------------
// CharacterSVG component
// ---------------------------------------------------------------------------

const FAUVISM_FILL_COLORS = [
  "#E63946", "#F4A261", "#2A9D8F", "#264653", "#E9C46A",
  "#D62828", "#F77F00", "#003049", "#6A0572", "#1B998B",
];

const POPART_FILL_COLORS = [
  "#FF0000", "#0000FF", "#FFFF00", "#FF00FF", "#00CC00", "#FF6600",
];

interface CharacterSVGProps {
  poseFn: PoseFn;
  seed: number;
  bodyIdx: number;
  accIdx: number;
  size?: number;
  artStyle?: "line" | "fauvism" | "popart";
  colorIndex?: number;
}

export const CharacterSVG: React.FC<CharacterSVGProps> = React.memo(
  ({ poseFn, seed, bodyIdx, accIdx, size = 120, artStyle = "line", colorIndex = 0 }) => {
    const drawPaths = poseFn(seed, bodyIdx, accIdx);

    const strokeMul = artStyle === "fauvism" ? 2.5 : artStyle === "popart" ? 3.5 : 1;
    const fillColor = artStyle === "fauvism"
      ? FAUVISM_FILL_COLORS[colorIndex % FAUVISM_FILL_COLORS.length]
      : artStyle === "popart"
      ? POPART_FILL_COLORS[colorIndex % POPART_FILL_COLORS.length]
      : null;
    const strokeColor = artStyle === "popart" ? "#000000" : "#1a1a1a";

    return (
      <svg
        width={size}
        height={size}
        viewBox="0 0 120 185"
        style={{ overflow: "visible" }}
      >
        {drawPaths.map((p, i) => {
          const baseFill = p.fill ? p.fillColor || "#1a1a1a" : "none";
          const resolvedFill = artStyle === "line"
            ? baseFill
            : p.fill
            ? fillColor || baseFill
            : fillColor
            ? fillColor
            : "none";
          return (
            <path
              key={i}
              d={p.d}
              fill={resolvedFill}
              stroke={p.stroke ? strokeColor : "none"}
              strokeWidth={(p.strokeWidth || 1.8) * strokeMul}
              strokeLinecap="round"
              strokeLinejoin="round"
              opacity={artStyle !== "line" && !p.fill && !p.stroke ? 0.8 : undefined}
            />
          );
        })}
      </svg>
    );
  },
);

CharacterSVG.displayName = "CharacterSVG";

// ---------------------------------------------------------------------------
// Scene character generation
// ---------------------------------------------------------------------------

export function generateSceneCharacters(
  seed: number,
  count: number,
  poseIdx: number,
  bodyIdx: number,
  accIdx: number,
): SceneCharacter[] {
  const rng = mkRng(seed);
  const characters: SceneCharacter[] = [];

  for (let i = 0; i < count; i++) {
    const charSeed = Math.floor(rng() * 100000);
    const x = 5 + rng() * 90; // 5-95%
    const y = 15 + rng() * 75; // 15-90%

    // Depth-based scale: further up (smaller y) = smaller
    const depthT = (y - 15) / 75; // 0 at top, 1 at bottom
    const scale = 0.4 + depthT * 0.6; // 0.4 - 1.0

    const charPoseIdx =
      poseIdx === -1
        ? Math.floor(rng() * POSE_CATEGORIES.length)
        : poseIdx;

    const charBodyIdx =
      bodyIdx === -1
        ? Math.floor(rng() * BODY_TYPES.length)
        : bodyIdx;

    characters.push({
      x,
      y,
      scale,
      seed: charSeed,
      poseIdx: charPoseIdx,
      bodyIdx: charBodyIdx,
      accIdx,
    });
  }

  // Sort by y for depth ordering (characters further back rendered first)
  characters.sort((a, b) => a.y - b.y);

  return characters;
}
