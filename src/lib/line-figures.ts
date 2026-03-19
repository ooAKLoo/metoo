/* ══════════════════════════════════════════════════════
   Line Figures — Procedural stick figure generation
   Ported from OVideo ElevationPeople for Konva poster use
   ══════════════════════════════════════════════════════ */

// ── Seeded RNG ──────────────────────────────────────

function mkRng(seed: number): () => number {
  let s = seed | 0;
  if (s === 0) s = 1;
  return () => {
    s ^= s << 13;
    s ^= s >> 17;
    s ^= s << 5;
    return (s >>> 0) / 4294967296;
  };
}

const rand = (rng: () => number, min: number, max: number) =>
  rng() * (max - min) + min;

const pick = <T,>(rng: () => number, arr: T[]): T =>
  arr[Math.floor(rng() * arr.length)];

const coinFlip = (rng: () => number, p = 0.5) => rng() < p;

// ── SVG path constructors ───────────────────────────

const M = (x: number, y: number) => `M ${x.toFixed(1)} ${y.toFixed(1)}`;
const L = (x: number, y: number) => `L ${x.toFixed(1)} ${y.toFixed(1)}`;
const Q = (cx: number, cy: number, x: number, y: number) =>
  `Q ${cx.toFixed(1)} ${cy.toFixed(1)} ${x.toFixed(1)} ${y.toFixed(1)}`;

// ── Types ───────────────────────────────────────────

export interface PathItem {
  d: string;
  stroke?: boolean;
  fill?: boolean;
}

export interface PersonData {
  paths: PathItem[];
  fillPaths: PathItem[];
  totalH: number;
  /** Half-width of the figure's silhouette from center (for shadow sizing) */
  shadowW: number;
}

type HairStyle = "short" | "long" | "ponytail" | "bun";
type Pose = "standing" | "walking" | "phone" | "bag";

// ── Head generation ─────────────────────────────────

function generateHead(
  rng: () => number,
  cx: number,
  cy: number,
  size: number,
): string {
  const r = size;
  const k = r * 0.552;
  const dx = rand(rng, -0.5, 0.5);
  const dy = rand(rng, -0.5, 0.5);
  return (
    `M ${(cx - r + dx).toFixed(1)} ${cy.toFixed(1)} `
    + `C ${(cx - r).toFixed(1)} ${(cy - k + dy).toFixed(1)} ${(cx - k + dx).toFixed(1)} ${(cy - r).toFixed(1)} ${cx.toFixed(1)} ${(cy - r + dy).toFixed(1)} `
    + `C ${(cx + k + dx).toFixed(1)} ${(cy - r).toFixed(1)} ${(cx + r).toFixed(1)} ${(cy - k + dy).toFixed(1)} ${(cx + r + dx).toFixed(1)} ${cy.toFixed(1)} `
    + `C ${(cx + r).toFixed(1)} ${(cy + k + dy).toFixed(1)} ${(cx + k + dx).toFixed(1)} ${(cy + r).toFixed(1)} ${cx.toFixed(1)} ${(cy + r + dy).toFixed(1)} `
    + `C ${(cx - k + dx).toFixed(1)} ${(cy + r).toFixed(1)} ${(cx - r).toFixed(1)} ${(cy + k + dy).toFixed(1)} ${(cx - r + dx).toFixed(1)} ${cy.toFixed(1)} Z`
  );
}

// ── Hair generation ─────────────────────────────────

function generateHair(
  rng: () => number,
  cx: number,
  cy: number,
  headSize: number,
  style: HairStyle,
): string[] {
  const paths: string[] = [];
  const r = headSize;

  if (style === "short") {
    paths.push(
      `M ${(cx - r - 1).toFixed(1)} ${(cy - 1).toFixed(1)} `
      + `Q ${(cx - r - 2).toFixed(1)} ${(cy - r - 3).toFixed(1)} ${cx.toFixed(1)} ${(cy - r - 2).toFixed(1)} `
      + `Q ${(cx + r + 2).toFixed(1)} ${(cy - r - 3).toFixed(1)} ${(cx + r + 1).toFixed(1)} ${(cy - 1).toFixed(1)}`,
    );
  } else if (style === "long") {
    const side = coinFlip(rng) ? 1 : -1;
    paths.push(
      `M ${(cx - r - 1).toFixed(1)} ${(cy - 1).toFixed(1)} `
      + `Q ${(cx - r - 2).toFixed(1)} ${(cy - r - 4).toFixed(1)} ${cx.toFixed(1)} ${(cy - r - 3).toFixed(1)} `
      + `Q ${(cx + r + 2).toFixed(1)} ${(cy - r - 4).toFixed(1)} ${(cx + r + 1).toFixed(1)} ${(cy + 2).toFixed(1)} `
      + `Q ${(cx + r + 2 + side * 2).toFixed(1)} ${(cy + r + 10).toFixed(1)} ${(cx + r * 0.6 + side * 3).toFixed(1)} ${(cy + r + 14).toFixed(1)}`,
    );
    paths.push(
      `M ${(cx - r - 1).toFixed(1)} ${(cy + 2).toFixed(1)} `
      + `Q ${(cx - r - 2 - side * 2).toFixed(1)} ${(cy + r + 10).toFixed(1)} ${(cx - r * 0.6 - side * 3).toFixed(1)} ${(cy + r + 14).toFixed(1)}`,
    );
  } else if (style === "ponytail") {
    paths.push(
      `M ${(cx - r - 1).toFixed(1)} ${(cy - 1).toFixed(1)} `
      + `Q ${(cx - r - 2).toFixed(1)} ${(cy - r - 4).toFixed(1)} ${cx.toFixed(1)} ${(cy - r - 3).toFixed(1)} `
      + `Q ${(cx + r + 2).toFixed(1)} ${(cy - r - 4).toFixed(1)} ${(cx + r + 1).toFixed(1)} ${(cy - 1).toFixed(1)}`,
    );
    paths.push(
      `M ${(cx + r * 0.3).toFixed(1)} ${(cy - r - 2).toFixed(1)} `
      + `Q ${(cx + r + 8).toFixed(1)} ${(cy - r - 8).toFixed(1)} ${(cx + r + 5).toFixed(1)} ${(cy + 4).toFixed(1)} `
      + `Q ${(cx + r + 4).toFixed(1)} ${(cy + 10).toFixed(1)} ${(cx + r + 2).toFixed(1)} ${(cy + 14).toFixed(1)}`,
    );
  } else if (style === "bun") {
    paths.push(
      `M ${(cx - r - 1).toFixed(1)} ${(cy - 1).toFixed(1)} `
      + `Q ${(cx - r - 2).toFixed(1)} ${(cy - r - 3).toFixed(1)} ${cx.toFixed(1)} ${(cy - r - 2).toFixed(1)} `
      + `Q ${(cx + r + 2).toFixed(1)} ${(cy - r - 3).toFixed(1)} ${(cx + r + 1).toFixed(1)} ${(cy - 1).toFixed(1)}`,
    );
    const bunR = 3.5;
    const bunY = cy - r - 2 - bunR;
    paths.push(generateHead(rng, cx, bunY, bunR));
  }

  return paths;
}

// ── Person generation ───────────────────────────────

export function generatePerson(personSeed: number): PersonData {
  const rng = mkRng(personSeed);

  const paths: PathItem[] = [];
  const fillPaths: PathItem[] = [];
  const scale = rand(rng, 0.85, 1.15);
  const facing = pick(rng, [-1, 1]);
  const headSize = rand(rng, 4.5, 5.5) * scale;
  const headY = 12;
  const neckY = headY + headSize + 1;
  const shoulderY = neckY + rand(rng, 3, 5) * scale;
  const shoulderW = rand(rng, 8, 12) * scale;
  const hipY = shoulderY + rand(rng, 18, 24) * scale;
  const hipW = rand(rng, 5, 8) * scale;
  const kneeY = hipY + rand(rng, 14, 18) * scale;
  const footY = kneeY + rand(rng, 14, 17) * scale;
  const cx = 50;

  const hairStyle = pick<HairStyle>(rng, ["short", "long", "ponytail", "bun", "short", "short"]);
  const pose = pick<Pose>(rng, ["standing", "walking", "walking", "walking", "phone", "bag"]);
  const hasUmbrella = coinFlip(rng, 0.12);
  const hasBag = coinFlip(rng, 0.3) || pose === "bag";
  const hasCoat = coinFlip(rng, 0.25);

  // Track max horizontal extent from center for shadow sizing
  let extent = shoulderW;

  // Head
  paths.push({ d: generateHead(rng, cx, headY, headSize), stroke: true });

  // Hair
  const hairPaths = generateHair(rng, cx, headY, headSize, hairStyle);
  hairPaths.forEach((d) => {
    if (d.includes("Z")) {
      fillPaths.push({ d, fill: true });
    } else {
      paths.push({ d, stroke: true });
    }
  });

  // Neck
  paths.push({ d: `${M(cx, headY + headSize)} ${L(cx, shoulderY)}`, stroke: true });

  // Body
  const bodySlouchX = rand(rng, -1, 1) * facing;
  if (hasCoat) {
    const coatBottom = hipY + rand(rng, 8, 16) * scale;
    const coatW = shoulderW + 3;
    fillPaths.push({
      d:
        `${M(cx - shoulderW * facing, shoulderY)} `
        + `${L(cx + shoulderW * facing, shoulderY)} `
        + `${Q(cx + (coatW + 1) * facing, (shoulderY + coatBottom) / 2, cx + coatW * 0.9 * facing, coatBottom)} `
        + `${L(cx - coatW * 0.9 * facing, coatBottom)} `
        + `${Q(cx - (coatW + 1) * facing, (shoulderY + coatBottom) / 2, cx - shoulderW * facing, shoulderY)} Z`,
      fill: false,
      stroke: true,
    });
  } else {
    paths.push({
      d: `${M(cx - shoulderW, shoulderY)} ${L(cx + shoulderW, shoulderY)}`,
      stroke: true,
    });
    paths.push({
      d: `${M(cx - shoulderW, shoulderY)} ${Q(cx - shoulderW + bodySlouchX, (shoulderY + hipY) / 2, cx - hipW, hipY)}`,
      stroke: true,
    });
    paths.push({
      d: `${M(cx + shoulderW, shoulderY)} ${Q(cx + shoulderW + bodySlouchX, (shoulderY + hipY) / 2, cx + hipW, hipY)}`,
      stroke: true,
    });
    paths.push({
      d: `${M(cx - hipW, hipY)} ${L(cx + hipW, hipY)}`,
      stroke: true,
    });
  }

  // Arms
  const armLen = rand(rng, 16, 22) * scale;
  const elbowDrop = armLen * 0.5;

  if (pose === "phone") {
    const phoneArm = facing;
    const elbowX = cx + shoulderW * phoneArm;
    const elbowY = shoulderY + elbowDrop * 0.4;
    const handX = cx + shoulderW * 0.4 * phoneArm;
    const handY = headY + headSize * 0.3;
    paths.push({
      d: `${M(cx + shoulderW * phoneArm, shoulderY)} ${Q(elbowX + 3 * phoneArm, elbowY, handX, handY)}`,
      stroke: true,
    });
    paths.push({
      d: `${M(handX - 2, handY - 4)} ${L(handX + 2, handY - 4)} ${L(handX + 2, handY + 2)} ${L(handX - 2, handY + 2)} Z`,
      stroke: true,
    });
    const otherX = cx - shoulderW * phoneArm;
    paths.push({
      d: `${M(otherX, shoulderY)} ${Q(otherX - 2 * phoneArm, shoulderY + elbowDrop, otherX - rand(rng, 1, 4) * phoneArm, shoulderY + armLen)}`,
      stroke: true,
    });
  } else if (pose === "walking") {
    const swing = rand(rng, 4, 8);
    ([-1, 1] as const).forEach((side) => {
      const armStartX = cx + shoulderW * side;
      const armEndX = armStartX + swing * side * facing * -1 * (side === 1 ? 1 : -1);
      const armEndY = shoulderY + armLen * rand(rng, 0.7, 0.9);
      paths.push({
        d: `${M(armStartX, shoulderY)} ${Q(armStartX + rand(rng, -3, 3), shoulderY + elbowDrop, armEndX, armEndY)}`,
        stroke: true,
      });
    });
  } else {
    ([-1, 1] as const).forEach((side) => {
      const armStartX = cx + shoulderW * side;
      const armEndX = armStartX + rand(rng, -2, 2) * side;
      const armEndY = shoulderY + armLen;
      paths.push({
        d: `${M(armStartX, shoulderY)} ${Q(armStartX + rand(rng, 1, 4) * side, shoulderY + elbowDrop, armEndX, armEndY)}`,
        stroke: true,
      });
    });
  }

  // Legs
  const legSpread = rand(rng, 2, 6);
  if (pose === "walking") {
    const stride = rand(rng, 6, 14);
    const fKneeX = cx + stride * facing * 0.5;
    const fFootX = cx + stride * facing;
    paths.push({
      d: `${M(cx + hipW * 0.3 * facing, hipY)} ${Q(fKneeX, kneeY, fFootX, footY)}`,
      stroke: true,
    });
    const bFootX = cx - stride * facing * 0.6;
    paths.push({
      d: `${M(cx - hipW * 0.3 * facing, hipY)} ${Q(cx - stride * facing * 0.2, kneeY, bFootX, footY)}`,
      stroke: true,
    });
    extent = Math.max(extent, Math.abs(fFootX - cx), Math.abs(bFootX - cx));
    [fFootX, bFootX].forEach((fx) => {
      paths.push({
        d: `${M(fx, footY)} ${L(fx + 4 * facing, footY)}`,
        stroke: true,
      });
    });
  } else {
    ([-1, 1] as const).forEach((side) => {
      const kneeX = cx + legSpread * side * 0.5 + rand(rng, -1, 1);
      const footX = cx + legSpread * side + rand(rng, -1, 1);
      paths.push({
        d: `${M(cx + hipW * 0.3 * side, hipY)} ${Q(kneeX, kneeY, footX, footY)}`,
        stroke: true,
      });
      extent = Math.max(extent, Math.abs(footX - cx));
      paths.push({
        d: `${M(footX, footY)} ${L(footX + 3 * side, footY)}`,
        stroke: true,
      });
    });
  }

  // Bag
  if (hasBag) {
    const bagSide = facing;
    const bagX = cx + (shoulderW + 3) * bagSide;
    const bagY = shoulderY + rand(rng, 5, 12);
    const bagW = rand(rng, 5, 8);
    const bagH = rand(rng, 7, 12);
    paths.push({
      d: `${M(cx + shoulderW * 0.5 * bagSide, shoulderY)} ${L(bagX, bagY)}`,
      stroke: true,
    });
    paths.push({
      d: `${M(bagX - bagW / 2, bagY)} ${L(bagX + bagW / 2, bagY)} ${L(bagX + bagW / 2, bagY + bagH)} ${L(bagX - bagW / 2, bagY + bagH)} Z`,
      stroke: true,
    });
    extent = Math.max(extent, Math.abs(bagX + bagW / 2 - cx));
  }

  // Umbrella
  if (hasUmbrella) {
    const umbSide = facing;
    const umbX = cx + (shoulderW + 2) * umbSide;
    const umbTopY = headY - headSize - 18;
    const umbW = 18;
    paths.push({
      d: `${M(umbX, shoulderY)} ${L(umbX, umbTopY)}`,
      stroke: true,
    });
    paths.push({
      d: `${M(umbX - umbW, umbTopY + 4)} ${Q(umbX - umbW * 0.5, umbTopY - 4, umbX, umbTopY)} ${Q(umbX + umbW * 0.5, umbTopY - 4, umbX + umbW, umbTopY + 4)}`,
      stroke: true,
    });
    paths.push({
      d: `${M(umbX, shoulderY)} ${Q(umbX + 3 * umbSide, shoulderY + 5, umbX, shoulderY + 6)}`,
      stroke: true,
    });
    extent = Math.max(extent, Math.abs(umbX + umbW * umbSide - cx));
  }

  const totalH = footY + 5;
  return { paths, fillPaths, totalH, shadowW: extent };
}

// ── Scene layout ────────────────────────────────────

export interface FigureItem {
  x: number;     // 0-100 normalized
  y: number;     // 0-100 normalized
  scale: number; // depth scale (smaller at top, larger at bottom)
  person: PersonData;
}

export interface AvoidZone {
  x1: number; y1: number; x2: number; y2: number; // 0-100
}

export function generateFigureScene(
  seed: number,
  count: number,
  avoidZones: AvoidZone[] = [],
): FigureItem[] {
  const rng = mkRng(seed);
  const items: FigureItem[] = [];
  const minDist = 11;

  for (let i = 0; i < count; i++) {
    let placed = false;
    for (let attempt = 0; attempt < 150; attempt++) {
      const x = rand(rng, 3, 97);
      const y = rand(rng, 4, 93);

      let inZone = false;
      for (const z of avoidZones) {
        if (x >= z.x1 && x <= z.x2 && y >= z.y1 && y <= z.y2) {
          inZone = true;
          break;
        }
      }
      if (inZone) continue;

      let tooClose = false;
      for (const it of items) {
        const dx = x - it.x;
        const dy = y - it.y;
        if (Math.sqrt(dx * dx + dy * dy) < minDist) {
          tooClose = true;
          break;
        }
      }
      if (tooClose) continue;

      const depthScale = 0.25 + (y / 100) * 0.75;
      const personSeed = Math.floor(rng() * 100000);
      items.push({ x, y, scale: depthScale, person: generatePerson(personSeed) });
      placed = true;
      break;
    }

    if (!placed) {
      const x = rand(rng, 5, 95);
      const y = rand(rng, 10, 90);
      const depthScale = 0.25 + (y / 100) * 0.75;
      const personSeed = Math.floor(rng() * 100000);
      items.push({ x, y, scale: depthScale, person: generatePerson(personSeed) });
    }
  }

  items.sort((a, b) => a.y - b.y);
  return items;
}
