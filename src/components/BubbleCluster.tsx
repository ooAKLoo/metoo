import { useMemo, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { useFavoriteStore } from "../stores/useFavoriteStore";
import { extractTagsFromTitle } from "../hooks/useTagExtraction";
import { PROVINCES } from "../lib/china-divisions";
import { getCategoryColor } from "../lib/category-colors";
import { TAG_MAP } from "../lib/tag-dictionary";

/* ── Types ─────────────────────────────────────────────── */

interface Bubble {
  category: string;
  emoji: string;
  color: string;
  count: number;
  radius: number;
  x: number;
  y: number;
}

interface Cluster {
  province: string;
  cx: number;
  cy: number;
  totalCount: number;
  centerRadius: number;
  bubbles: Bubble[];
  boundingR: number;
}

/* ── Constants ─────────────────────────────────────────── */

const W = 960;
const H = 700;
const PAD = 80;
const CENTER_COLOR = "#e8e0d4"; // beige for center bubble

/* ── Component ─────────────────────────────────────────── */

export function BubbleCluster() {
  const items = useFavoriteStore((s) => s.items);

  const [hoveredProvince, setHoveredProvince] = useState<string | null>(null);
  const [tooltip, setTooltip] = useState<{
    province: string;
    category: string;
    emoji: string;
    count: number;
    x: number;
    y: number;
  } | null>(null);

  /* ── Aggregate: province → category → count ── */

  const clusters = useMemo(() => {
    if (items.length === 0) return [];

    const provMap = new Map<string, Map<string, number>>();

    for (const item of items) {
      const tags = extractTagsFromTitle(item.title);
      if (tags.length === 0 || item.locations.length === 0) continue;

      const province = item.locations[0].province;
      if (!province || !PROVINCES[province]) continue;

      let catMap = provMap.get(province);
      if (!catMap) {
        catMap = new Map();
        provMap.set(province, catMap);
      }
      for (const tag of tags) {
        catMap.set(tag, (catMap.get(tag) || 0) + 1);
      }
    }

    if (provMap.size === 0) return [];

    // Global max for radius scaling
    const allTotals = Array.from(provMap.values()).map((m) =>
      Array.from(m.values()).reduce((a, b) => a + b, 0),
    );
    const globalMax = Math.max(...allTotals, 1);

    const rawClusters: Cluster[] = [];

    for (const [province, catMap] of provMap) {
      const totalCount = Array.from(catMap.values()).reduce((a, b) => a + b, 0);

      // Center bubble radius based on total count
      const centerRadius = Math.sqrt(totalCount / globalMax) * 30 + 10;

      // Category bubbles
      const bubbles: Bubble[] = Array.from(catMap.entries())
        .map(([cat, count]) => {
          const emoji =
            Object.values(TAG_MAP).find((v) => v.category === cat)?.emoji ?? "🏷️";
          return {
            category: cat,
            emoji,
            color: getCategoryColor(cat),
            count,
            radius: Math.sqrt(count / globalMax) * 20 + 4,
            x: 0,
            y: 0,
          };
        })
        .sort((a, b) => b.radius - a.radius);

      // Pack category bubbles around center
      packAroundCenter(bubbles, centerRadius);

      // Bounding radius
      const boundingR = Math.max(
        centerRadius,
        ...bubbles.map(
          (b) => Math.sqrt(b.x * b.x + b.y * b.y) + b.radius,
        ),
      );

      rawClusters.push({
        province,
        cx: 0,
        cy: 0,
        totalCount,
        centerRadius,
        bubbles,
        boundingR,
      });
    }

    // Sort by total count descending for better layout
    rawClusters.sort((a, b) => b.totalCount - a.totalCount);

    // Distribute clusters evenly across the viewport
    distributeInViewport(rawClusters);

    return rawClusters;
  }, [items]);

  if (items.length === 0) return null;

  if (clusters.length === 0) {
    return (
      <div className="w-full h-full flex items-center justify-center">
        <p className="text-[11px] text-secondary">
          当前收藏中没有可识别的地理位置
        </p>
      </div>
    );
  }

  // Legend: unique categories
  const legendCats = (() => {
    const seen = new Map<string, { emoji: string; color: string }>();
    for (const c of clusters) {
      for (const b of c.bubbles) {
        if (!seen.has(b.category)) {
          seen.set(b.category, { emoji: b.emoji, color: b.color });
        }
      }
    }
    return Array.from(seen.entries())
      .map(([cat, meta]) => ({ category: cat, ...meta }))
      .slice(0, 16);
  })();

  return (
    <div className="w-full h-full flex items-center justify-center relative overflow-hidden">
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="w-full h-full max-h-full"
        preserveAspectRatio="xMidYMid meet"
      >
        {clusters.map((cluster, ci) => {
          const isHovered = hoveredProvince === cluster.province;
          const dimmed = hoveredProvince !== null && !isHovered;

          return (
            <motion.g
              key={cluster.province}
              initial={{ opacity: 0, scale: 0 }}
              animate={{ opacity: dimmed ? 0.25 : 1, scale: 1 }}
              transition={{
                delay: ci * 0.035,
                type: "spring",
                stiffness: 320,
                damping: 24,
                opacity: { duration: 0.2 },
              }}
              onMouseEnter={() => setHoveredProvince(cluster.province)}
              onMouseLeave={() => {
                setHoveredProvince(null);
                setTooltip(null);
              }}
            >
              <g transform={`translate(${cluster.cx}, ${cluster.cy})`}>
                {/* Center bubble (province) — beige */}
                <motion.circle
                  cx={0}
                  cy={0}
                  initial={{ r: 0 }}
                  animate={{ r: cluster.centerRadius }}
                  transition={{
                    delay: ci * 0.035,
                    type: "spring",
                    stiffness: 380,
                    damping: 20,
                  }}
                  fill={CENTER_COLOR}
                  opacity={0.9}
                  className="cursor-pointer"
                />

                {/* Province name inside center bubble */}
                <text
                  textAnchor="middle"
                  dominantBaseline="central"
                  className="text-[9px] font-medium pointer-events-none select-none"
                  fill="#6b6256"
                  opacity={0.85}
                >
                  {cluster.province}
                </text>

                {/* Count below province name */}
                <text
                  y={12}
                  textAnchor="middle"
                  dominantBaseline="central"
                  className="text-[8px] pointer-events-none select-none"
                  fill="#9b9286"
                  opacity={0.7}
                >
                  {cluster.totalCount}
                </text>

                {/* Category bubbles around center */}
                {cluster.bubbles.map((b, bi) => (
                  <motion.circle
                    key={b.category}
                    cx={b.x}
                    cy={b.y}
                    initial={{ r: 0 }}
                    animate={{ r: b.radius }}
                    transition={{
                      delay: ci * 0.035 + bi * 0.025,
                      type: "spring",
                      stiffness: 380,
                      damping: 20,
                    }}
                    fill={b.color}
                    opacity={0.82}
                    className="cursor-pointer"
                    onMouseEnter={(e) => {
                      setTooltip({
                        province: cluster.province,
                        category: b.category,
                        emoji: b.emoji,
                        count: b.count,
                        x: e.clientX,
                        y: e.clientY,
                      });
                    }}
                    onMouseMove={(e) => {
                      setTooltip((prev) =>
                        prev
                          ? { ...prev, x: e.clientX, y: e.clientY }
                          : null,
                      );
                    }}
                    onMouseLeave={() => setTooltip(null)}
                  />
                ))}

                {/* Count badge on hover */}
                <AnimatePresence>
                  {isHovered && (
                    <motion.text
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 0.6 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.12 }}
                      y={-cluster.boundingR - 8}
                      textAnchor="middle"
                      className="text-[10px] font-semibold pointer-events-none"
                      fill="var(--text-primary)"
                    >
                      {cluster.province} · {cluster.totalCount}
                    </motion.text>
                  )}
                </AnimatePresence>
              </g>
            </motion.g>
          );
        })}
      </svg>

      {/* Legend */}
      <div className="absolute bottom-4 right-4 bg-white/80 backdrop-blur-sm rounded-2xl px-4 py-3">
        <div className="text-[9px] font-medium text-[var(--text-secondary)] uppercase tracking-wide mb-2">
          品类图例
        </div>
        <div className="grid grid-cols-2 gap-x-4 gap-y-1">
          {legendCats.map((lc) => (
            <div key={lc.category} className="flex items-center gap-1.5">
              <span
                className="w-2.5 h-2.5 rounded-full shrink-0"
                style={{ backgroundColor: lc.color }}
              />
              <span className="text-[9px] text-[var(--text-primary)] whitespace-nowrap">
                {lc.emoji} {lc.category}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Tooltip */}
      <AnimatePresence>
        {tooltip && (
          <motion.div
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.12 }}
            className="fixed pointer-events-none z-50
                       bg-white/95 backdrop-blur-sm rounded-xl
                       px-3 py-2 shadow-[0_4px_20px_rgba(0,0,0,0.08)]"
            style={{
              left: tooltip.x,
              top: tooltip.y - 50,
              transform: "translateX(-50%)",
            }}
          >
            <div className="text-[10px] font-medium text-[var(--text-primary)]">
              {tooltip.province} · {tooltip.emoji} {tooltip.category}
            </div>
            <div className="text-[9px] text-[var(--text-secondary)]">
              {tooltip.count} 条收藏
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ── Circle packing: place satellites tangent to pairs ── */

function packAroundCenter(bubbles: Bubble[], centerR: number) {
  if (bubbles.length === 0) return;

  const GAP = 1.5; // small visual gap between circles

  // All placed circles (center is always the first)
  const placed: { x: number; y: number; r: number }[] = [
    { x: 0, y: 0, r: centerR },
  ];

  // Place first bubble tangent to center at top
  bubbles[0].x = 0;
  bubbles[0].y = -(centerR + bubbles[0].radius + GAP);
  placed.push({ x: bubbles[0].x, y: bubbles[0].y, r: bubbles[0].radius });

  if (bubbles.length === 1) return;

  // Place second bubble tangent to center and first bubble
  const pos2 = tangentToTwo(
    0, 0, centerR,
    bubbles[0].x, bubbles[0].y, bubbles[0].radius,
    bubbles[1].radius, GAP,
  );
  if (pos2) {
    bubbles[1].x = pos2.x;
    bubbles[1].y = pos2.y;
  } else {
    bubbles[1].x = centerR + bubbles[1].radius + GAP;
    bubbles[1].y = 0;
  }
  placed.push({ x: bubbles[1].x, y: bubbles[1].y, r: bubbles[1].radius });

  // For each remaining bubble, find best position tangent to any pair
  for (let i = 2; i < bubbles.length; i++) {
    const r = bubbles[i].radius;
    let bestX = 0;
    let bestY = 0;
    let bestDist = Infinity;

    for (let a = 0; a < placed.length; a++) {
      for (let b = a + 1; b < placed.length; b++) {
        const solutions = circleTangentPositions(
          placed[a].x, placed[a].y, placed[a].r,
          placed[b].x, placed[b].y, placed[b].r,
          r, GAP,
        );

        for (const sol of solutions) {
          // Verify no overlap with any placed circle
          let valid = true;
          for (const p of placed) {
            const dx = sol.x - p.x;
            const dy = sol.y - p.y;
            if (Math.sqrt(dx * dx + dy * dy) < p.r + r + GAP - 0.5) {
              valid = false;
              break;
            }
          }
          if (valid) {
            const d = Math.sqrt(sol.x * sol.x + sol.y * sol.y);
            if (d < bestDist) {
              bestDist = d;
              bestX = sol.x;
              bestY = sol.y;
            }
          }
        }
      }
    }

    if (bestDist < Infinity) {
      bubbles[i].x = bestX;
      bubbles[i].y = bestY;
    } else {
      // Fallback: place tangent to center at a free angle
      const angle = (i / bubbles.length) * 2 * Math.PI - Math.PI / 2;
      bubbles[i].x = (centerR + r + GAP) * Math.cos(angle);
      bubbles[i].y = (centerR + r + GAP) * Math.sin(angle);
    }
    placed.push({ x: bubbles[i].x, y: bubbles[i].y, r: bubbles[i].radius });
  }
}

/** Find two candidate positions for a circle of radius r tangent to two circles */
function circleTangentPositions(
  x1: number, y1: number, r1: number,
  x2: number, y2: number, r2: number,
  r: number, gap: number,
): { x: number; y: number }[] {
  const d1 = r1 + r + gap;
  const d2 = r2 + r + gap;
  const dx = x2 - x1;
  const dy = y2 - y1;
  const d = Math.sqrt(dx * dx + dy * dy);

  if (d > d1 + d2 || d < Math.abs(d1 - d2) || d === 0) return [];

  const a = (d1 * d1 - d2 * d2 + d * d) / (2 * d);
  const h2 = d1 * d1 - a * a;
  if (h2 < 0) return [];
  const h = Math.sqrt(h2);

  const mx = x1 + (a * dx) / d;
  const my = y1 + (a * dy) / d;

  return [
    { x: mx + (h * dy) / d, y: my - (h * dx) / d },
    { x: mx - (h * dy) / d, y: my + (h * dx) / d },
  ];
}

/** Place tangent to two circles, pick the solution closer to origin */
function tangentToTwo(
  x1: number, y1: number, r1: number,
  x2: number, y2: number, r2: number,
  r: number, gap: number,
): { x: number; y: number } | null {
  const sols = circleTangentPositions(x1, y1, r1, x2, y2, r2, r, gap);
  if (sols.length === 0) return null;
  // Pick solution closer to origin
  return sols.reduce((best, s) => {
    const dBest = best.x * best.x + best.y * best.y;
    const dS = s.x * s.x + s.y * s.y;
    return dS < dBest ? s : best;
  });
}

/* ── Distribute clusters organically via force simulation ── */

function distributeInViewport(clusters: Cluster[]) {
  const n = clusters.length;
  if (n === 0) return;

  const cx = W / 2;
  const cy = H / 2;
  const CLUSTER_GAP = 10;

  // Initial placement: ALL at center with tiny spiral offset
  // This forces collision to push them apart naturally (like soap bubbles)
  for (let i = 0; i < n; i++) {
    const angle = i * 2.399963; // golden angle ≈ 137.5°
    const spiralR = 3 * Math.sqrt(i + 1); // very tight spiral
    clusters[i].cx = cx + spiralR * Math.cos(angle);
    clusters[i].cy = cy + spiralR * Math.sin(angle);
  }

  // Velocity for each cluster
  const vx = new Float64Array(n);
  const vy = new Float64Array(n);

  for (let iter = 0; iter < 300; iter++) {
    const alpha = 1 - iter / 300; // linear decay 1→0
    if (alpha < 0.01) break;

    // 1) Gravity: pull toward center (keeps the whole mass compact)
    for (let i = 0; i < n; i++) {
      const c = clusters[i];
      vx[i] += (cx - c.cx) * 0.008 * alpha;
      vy[i] += (cy - c.cy) * 0.008 * alpha;
    }

    // 2) Collision repulsion: push overlapping clusters apart
    for (let i = 0; i < n; i++) {
      for (let j = i + 1; j < n; j++) {
        const a = clusters[i];
        const b = clusters[j];
        const dx = b.cx - a.cx;
        const dy = b.cy - a.cy;
        const dist = Math.sqrt(dx * dx + dy * dy) || 0.01;
        const minDist = a.boundingR + b.boundingR + CLUSTER_GAP;

        if (dist < minDist) {
          const force = ((minDist - dist) / dist) * 0.5;
          const nx = dx * force;
          const ny = dy * force;
          // Mass-weighted: heavier clusters resist more
          const mA = a.boundingR * a.boundingR;
          const mB = b.boundingR * b.boundingR;
          const total = mA + mB;
          vx[i] -= nx * (mB / total);
          vy[i] -= ny * (mB / total);
          vx[j] += nx * (mA / total);
          vy[j] += ny * (mA / total);
        }
      }
    }

    // 3) Apply velocity with damping
    for (let i = 0; i < n; i++) {
      clusters[i].cx += vx[i];
      clusters[i].cy += vy[i];
      vx[i] *= 0.6; // friction
      vy[i] *= 0.6;

      // Soft boundary: bounce off edges
      const r = clusters[i].boundingR;
      const minX = PAD + r, maxX = W - PAD - r;
      const minY = PAD + r, maxY = H - PAD - r;
      if (clusters[i].cx < minX) { clusters[i].cx = minX; vx[i] = Math.abs(vx[i]) * 0.3; }
      if (clusters[i].cx > maxX) { clusters[i].cx = maxX; vx[i] = -Math.abs(vx[i]) * 0.3; }
      if (clusters[i].cy < minY) { clusters[i].cy = minY; vy[i] = Math.abs(vy[i]) * 0.3; }
      if (clusters[i].cy > maxY) { clusters[i].cy = maxY; vy[i] = -Math.abs(vy[i]) * 0.3; }
    }
  }
}

/* ── Helpers ──────────────────────────────────────────── */

function clamp(v: number, min: number, max: number) {
  return Math.max(min, Math.min(max, v));
}

/** Deterministic pseudo-random for consistent jitter */
function seededRandom(seed: number): number {
  const x = Math.sin(seed * 9301 + 49297) * 233280;
  return x - Math.floor(x);
}
