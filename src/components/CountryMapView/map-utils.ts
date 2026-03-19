import type { Bounds, ProvinceData, SmoothAlgorithm } from "./types";

// ── Mercator projection ──
export const projectLonLat = (lon: number, lat: number): [number, number] => {
  const rad = Math.PI / 180;
  const x = lon * rad;
  const y = Math.log(Math.tan(Math.PI / 4 + (lat * rad) / 2));
  return [x, y];
};

// ── Build geometry from GeoJSON ──
export const buildProvinces = (
  geoJson: { features: any[] },
): { provinces: ProvinceData[]; viewBox: string; svgH: number } => {
  const features = geoJson.features || [];

  let bounds: Bounds | undefined;
  const extend = (b: Bounds | undefined, x: number, y: number): Bounds => {
    if (!b) return { minX: x, minY: y, maxX: x, maxY: y };
    return {
      minX: Math.min(b.minX, x),
      minY: Math.min(b.minY, y),
      maxX: Math.max(b.maxX, x),
      maxY: Math.max(b.maxY, y),
    };
  };

  type RingCoords = [number, number][];
  interface FeatureParsed {
    name: string;
    polygons: RingCoords[][];
  }
  const parsed: FeatureParsed[] = [];

  for (const feature of features) {
    const name = feature.properties?.name || "Unknown";
    const geom = feature.geometry;
    if (!geom) continue;
    const polygons: RingCoords[][] = [];
    const processPolygon = (rings: number[][][]) => {
      const projectedRings: RingCoords[] = [];
      for (const ring of rings) {
        const projectedRing: RingCoords = [];
        for (const pt of ring) {
          const [x, y] = projectLonLat(pt[0], pt[1]);
          bounds = extend(bounds, x, y);
          projectedRing.push([x, y]);
        }
        projectedRings.push(projectedRing);
      }
      polygons.push(projectedRings);
    };
    if (geom.type === "Polygon") processPolygon(geom.coordinates);
    else if (geom.type === "MultiPolygon")
      for (const poly of geom.coordinates) processPolygon(poly);
    parsed.push({ name, polygons });
  }

  if (!bounds) return { provinces: [], viewBox: "0 0 100 100", svgH: 100 };

  const width = bounds.maxX - bounds.minX;
  const height = bounds.maxY - bounds.minY;
  const padding = Math.max(width, height) * 0.03;
  const svgW = 1000;
  const scale = svgW / (width + padding * 2);
  const svgH = (height + padding * 2) * scale;

  const toSvg = (x: number, y: number): [number, number] => [
    (x - bounds!.minX + padding) * scale,
    (bounds!.maxY - y + padding) * scale,
  ];

  const provinces: ProvinceData[] = parsed.map((f) => {
    const paths: string[] = [];
    let cxSum = 0,
      cySum = 0,
      ptCount = 0;
    for (const rings of f.polygons) {
      let d = "";
      for (let ri = 0; ri < rings.length; ri++) {
        const ring = rings[ri];
        for (let i = 0; i < ring.length; i++) {
          const [sx, sy] = toSvg(ring[i][0], ring[i][1]);
          if (ri === 0) {
            cxSum += sx;
            cySum += sy;
            ptCount++;
          }
          d +=
            i === 0
              ? `M${sx.toFixed(1)},${sy.toFixed(1)}`
              : `L${sx.toFixed(1)},${sy.toFixed(1)}`;
        }
        d += "Z";
      }
      paths.push(d);
    }
    return {
      name: f.name,
      paths,
      center: ptCount > 0 ? [cxSum / ptCount, cySum / ptCount] : [0, 0],
    };
  });

  return {
    provinces,
    viewBox: `0 0 ${svgW.toFixed(0)} ${svgH.toFixed(0)}`,
    svgH,
  };
};

// ── Name shortening (Chinese province names) ──
export const shortenName = (name: string) =>
  name.replace(/(省|市|自治区|特别行政区|壮族|回族|维吾尔)/g, "");

// ── Path processing utilities ──

/** Parse SVG path d-string (M/L/Z commands) into arrays of point rings */
export const parseSvgPath = (d: string): [number, number][][] => {
  const rings: [number, number][][] = [];
  let current: [number, number][] = [];
  const parts = d.match(/[MLZ][^MLZ]*/g) || [];
  for (const part of parts) {
    const cmd = part[0];
    if (cmd === "Z") {
      if (current.length > 0) {
        rings.push(current);
        current = [];
      }
    } else {
      const coords = part.slice(1).trim();
      if (coords) {
        const [xStr, yStr] = coords.split(",");
        current.push([parseFloat(xStr), parseFloat(yStr)]);
      }
    }
  }
  if (current.length > 0) rings.push(current);
  return rings;
};

/** Ramer-Douglas-Peucker simplification */
export const rdpSimplify = (
  points: [number, number][],
  tolerance: number,
): [number, number][] => {
  if (points.length <= 2) return points;
  const first = points[0],
    last = points[points.length - 1];
  let maxDist = 0,
    maxIdx = 0;
  const lx = last[0] - first[0],
    ly = last[1] - first[1];
  const lenSq = lx * lx + ly * ly;
  for (let i = 1; i < points.length - 1; i++) {
    let dist: number;
    if (lenSq === 0) {
      const dx = points[i][0] - first[0],
        dy = points[i][1] - first[1];
      dist = Math.sqrt(dx * dx + dy * dy);
    } else {
      const t = Math.max(
        0,
        Math.min(
          1,
          ((points[i][0] - first[0]) * lx + (points[i][1] - first[1]) * ly) /
            lenSq,
        ),
      );
      const px = first[0] + t * lx,
        py = first[1] + t * ly;
      const dx = points[i][0] - px,
        dy = points[i][1] - py;
      dist = Math.sqrt(dx * dx + dy * dy);
    }
    if (dist > maxDist) {
      maxDist = dist;
      maxIdx = i;
    }
  }
  if (maxDist > tolerance) {
    const left = rdpSimplify(points.slice(0, maxIdx + 1), tolerance);
    const right = rdpSimplify(points.slice(maxIdx), tolerance);
    return [...left.slice(0, -1), ...right];
  }
  return [first, last];
};

/** Chaikin's corner-cutting subdivision */
export const chaikinSmooth = (
  points: [number, number][],
  iterations: number,
): [number, number][] => {
  if (points.length < 3) return points;
  let pts = points;
  for (let iter = 0; iter < iterations; iter++) {
    const next: [number, number][] = [];
    for (let i = 0; i < pts.length; i++) {
      const p0 = pts[i];
      const p1 = pts[(i + 1) % pts.length];
      next.push([0.75 * p0[0] + 0.25 * p1[0], 0.75 * p0[1] + 0.25 * p1[1]]);
      next.push([0.25 * p0[0] + 0.75 * p1[0], 0.25 * p0[1] + 0.75 * p1[1]]);
    }
    pts = next;
  }
  return pts;
};

/** Cubic B-Spline */
export const cubicBSplineSmooth = (
  points: [number, number][],
  segments: number,
): [number, number][] => {
  if (points.length < 4) return chaikinSmooth(points, 2);
  const n = points.length;
  const result: [number, number][] = [];
  for (let i = 0; i < n; i++) {
    const p0 = points[(i - 1 + n) % n];
    const p1 = points[i];
    const p2 = points[(i + 1) % n];
    const p3 = points[(i + 2) % n];
    for (let s = 0; s < segments; s++) {
      const t = s / segments;
      const t2 = t * t,
        t3 = t2 * t;
      const b0 = (-t3 + 3 * t2 - 3 * t + 1) / 6;
      const b1 = (3 * t3 - 6 * t2 + 4) / 6;
      const b2 = (-3 * t3 + 3 * t2 + 3 * t + 1) / 6;
      const b3 = t3 / 6;
      result.push([
        b0 * p0[0] + b1 * p1[0] + b2 * p2[0] + b3 * p3[0],
        b0 * p0[1] + b1 * p1[1] + b2 * p2[1] + b3 * p3[1],
      ]);
    }
  }
  return result;
};

/** Catmull-Rom spline — passes through ALL original points */
export const catmullRomSmooth = (
  points: [number, number][],
  segments: number,
): [number, number][] => {
  if (points.length < 4) return chaikinSmooth(points, 2);
  const n = points.length;
  const result: [number, number][] = [];
  for (let i = 0; i < n; i++) {
    const p0 = points[(i - 1 + n) % n];
    const p1 = points[i];
    const p2 = points[(i + 1) % n];
    const p3 = points[(i + 2) % n];
    for (let s = 0; s < segments; s++) {
      const t = s / segments;
      const t2 = t * t,
        t3 = t2 * t;
      result.push([
        0.5 *
          ((-t3 + 2 * t2 - t) * p0[0] +
            (3 * t3 - 5 * t2 + 2) * p1[0] +
            (-3 * t3 + 4 * t2 + t) * p2[0] +
            (t3 - t2) * p3[0]),
        0.5 *
          ((-t3 + 2 * t2 - t) * p0[1] +
            (3 * t3 - 5 * t2 + 2) * p1[1] +
            (-3 * t3 + 4 * t2 + t) * p2[1] +
            (t3 - t2) * p3[1]),
      ]);
    }
  }
  return result;
};

/** Apply the selected smoothing algorithm */
export const applySmoothing = (
  points: [number, number][],
  algo: SmoothAlgorithm,
  iterations: number,
): [number, number][] => {
  switch (algo) {
    case "chaikin":
      return chaikinSmooth(points, iterations);
    case "bspline":
      return cubicBSplineSmooth(points, Math.max(2, iterations + 1));
    case "catmull-rom":
      return catmullRomSmooth(points, Math.max(2, iterations + 1));
  }
};

/** Shrink polygon toward its centroid by a pixel amount */
export const shrinkPolygon = (
  points: [number, number][],
  amount: number,
): [number, number][] => {
  if (points.length < 3) return points;
  let cx = 0,
    cy = 0;
  for (const p of points) {
    cx += p[0];
    cy += p[1];
  }
  cx /= points.length;
  cy /= points.length;
  return points.map(([x, y]) => {
    const dx = x - cx;
    const dy = y - cy;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist < 0.001) return [x, y] as [number, number];
    const factor = Math.max(0, (dist - amount) / dist);
    return [cx + dx * factor, cy + dy * factor] as [number, number];
  });
};

/** Rebuild SVG d-string from point rings */
export const pointsToPath = (rings: [number, number][][]): string => {
  return rings
    .map(
      (ring) =>
        ring
          .map(
            (p, i) =>
              `${i === 0 ? "M" : "L"}${p[0].toFixed(1)},${p[1].toFixed(1)}`,
          )
          .join("") + "Z",
    )
    .join("");
};

// ── Hand-drawn jitter utilities ──

/** Seeded PRNG (mulberry32) for deterministic jitter */
export const mulberry32 = (seed: number) => {
  let s = seed | 0;
  return () => {
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
};

/** Add hand-drawn jitter to path points */
export const jitterPath = (
  rings: [number, number][][],
  amplitude: number,
  seed: number,
): [number, number][][] => {
  const rng = mulberry32(seed);
  return rings.map((ring) =>
    ring.map(([x, y]) => {
      const angle = rng() * Math.PI * 2;
      const dist = rng() * amplitude;
      return [
        x + Math.cos(angle) * dist,
        y + Math.sin(angle) * dist,
      ] as [number, number];
    }),
  );
};

/** Generate a second offset stroke path for double-line sketch effect */
export const offsetStrokePath = (
  rings: [number, number][][],
  offset: number,
  seed: number,
): [number, number][][] => {
  const rng = mulberry32(seed + 7777);
  return rings.map((ring) =>
    ring.map(([x, y]) => {
      const angle = rng() * Math.PI * 2;
      const dist = offset + rng() * offset * 0.5;
      return [
        x + Math.cos(angle) * dist,
        y + Math.sin(angle) * dist,
      ] as [number, number];
    }),
  );
};

// ── Color utilities ──

/** Normalise any hex (#rgb, #rrggbb, #rrggbbaa) to #rrggbb */
export const toHex6 = (hex: string): string => {
  const h = hex.replace("#", "");
  if (h.length === 3) return `#${h[0]}${h[0]}${h[1]}${h[1]}${h[2]}${h[2]}`;
  if (h.length === 8) return `#${h.slice(0, 6)}`;
  return hex.startsWith("#") ? hex : `#${hex}`;
};

/** Darken a hex color by a ratio (0–1) */
export const darkenHex = (hex: string, amount: number): string => {
  const c = hex.replace("#", "");
  const r = Math.max(
    0,
    Math.round(parseInt(c.slice(0, 2), 16) * (1 - amount)),
  );
  const g = Math.max(
    0,
    Math.round(parseInt(c.slice(2, 4), 16) * (1 - amount)),
  );
  const b = Math.max(
    0,
    Math.round(parseInt(c.slice(4, 6), 16) * (1 - amount)),
  );
  return `#${r.toString(16).padStart(2, "0")}${g.toString(16).padStart(2, "0")}${b.toString(16).padStart(2, "0")}`;
};

/** Get choropleth color from value (0-100) and scale */
export const getChoroplethColor = (
  value: number,
  scale: "blue" | "green" | "red" | "purple",
): string => {
  const SCALES = {
    blue: { light: [230, 240, 255], dark: [10, 50, 120] },
    green: { light: [230, 255, 230], dark: [10, 100, 30] },
    red: { light: [255, 230, 230], dark: [150, 20, 20] },
    purple: { light: [245, 230, 255], dark: [80, 10, 120] },
  } as const;
  const { light, dark } = SCALES[scale];
  const t = value / 100;
  const r = Math.round(light[0] + (dark[0] - light[0]) * t);
  const g = Math.round(light[1] + (dark[1] - light[1]) * t);
  const b = Math.round(light[2] + (dark[2] - light[2]) * t);
  return `rgb(${r},${g},${b})`;
};
