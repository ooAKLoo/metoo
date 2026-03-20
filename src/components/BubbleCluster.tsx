import { useMemo, useState, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "motion/react";
import { useFavoriteStore, type FavoriteItem } from "../stores/useFavoriteStore";
import { extractTagsFromTitle } from "../hooks/useTagExtraction";
import { getCategoryColor } from "../lib/category-colors";
import { TAG_MAP } from "../lib/tag-dictionary";
import { coverSrc } from "./map-shared";

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
  city: string;
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

  const [hoveredCity, setHoveredCity] = useState<string | null>(null);

  /* ── Popover state ── */
  const [popover, setPopover] = useState<{
    city: string;
    category: string;
    emoji: string;
    color: string;
    count: number;
    items: FavoriteItem[];
    x: number;
    y: number;
  } | null>(null);
  const closeTimer = useRef<ReturnType<typeof setTimeout>>(null);

  /** Schedule popover close — cancelled if mouse re-enters bubble or popover */
  const scheduleClose = useCallback(() => {
    if (closeTimer.current) clearTimeout(closeTimer.current);
    closeTimer.current = setTimeout(() => setPopover(null), 180);
  }, []);
  const cancelClose = useCallback(() => {
    if (closeTimer.current) { clearTimeout(closeTimer.current); closeTimer.current = null; }
  }, []);

  /* ── Aggregate: city → category → count ── */

  const clusters = useMemo(() => {
    if (items.length === 0) return [];

    const cityMap = new Map<string, Map<string, number>>();

    for (const item of items) {
      const tags = extractTagsFromTitle(item.title);
      if (tags.length === 0 || item.locations.length === 0) continue;

      for (const loc of item.locations) {
        const city = loc.name;
        if (!city) continue;

        let catMap = cityMap.get(city);
        if (!catMap) {
          catMap = new Map();
          cityMap.set(city, catMap);
        }
        for (const tag of tags) {
          catMap.set(tag, (catMap.get(tag) || 0) + 1);
        }
      }
    }

    if (cityMap.size === 0) return [];

    // Global max for radius scaling
    const allTotals = Array.from(cityMap.values()).map((m) =>
      Array.from(m.values()).reduce((a, b) => a + b, 0),
    );
    const globalMax = Math.max(...allTotals, 1);

    const rawClusters: Cluster[] = [];

    for (const [city, catMap] of cityMap) {
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
        city,
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

  /* ── Index: "city::category" → FavoriteItem[] for popover ── */
  const itemIndex = useMemo(() => {
    const idx = new Map<string, FavoriteItem[]>();
    for (const item of items) {
      const tags = extractTagsFromTitle(item.title);
      if (tags.length === 0 || item.locations.length === 0) continue;
      for (const loc of item.locations) {
        if (!loc.name) continue;
        for (const tag of tags) {
          const key = `${loc.name}::${tag}`;
          let arr = idx.get(key);
          if (!arr) { arr = []; idx.set(key, arr); }
          if (!arr.some((x) => x.id === item.id)) arr.push(item);
        }
      }
    }
    return idx;
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
          const isHovered = hoveredCity === cluster.city;
          const dimmed = hoveredCity !== null && !isHovered;

          return (
            <motion.g
              key={cluster.city}
              initial={{ opacity: 0, scale: 0 }}
              animate={{ opacity: dimmed ? 0.25 : 1, scale: 1 }}
              transition={{
                delay: ci * 0.035,
                type: "spring",
                stiffness: 320,
                damping: 24,
                opacity: { duration: 0.2 },
              }}
              onMouseEnter={() => setHoveredCity(cluster.city)}
              onMouseLeave={() => {
                setHoveredCity(null);
                scheduleClose();
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

                {/* City name inside center bubble */}
                <text
                  textAnchor="middle"
                  dominantBaseline="central"
                  className="text-[9px] font-medium pointer-events-none select-none"
                  fill="#6b6256"
                  opacity={0.85}
                >
                  {cluster.city}
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
                      cancelClose();
                      const matchedItems = itemIndex.get(`${cluster.city}::${b.category}`) ?? [];
                      setPopover({
                        city: cluster.city,
                        category: b.category,
                        emoji: b.emoji,
                        color: b.color,
                        count: b.count,
                        items: matchedItems,
                        x: e.clientX,
                        y: e.clientY,
                      });
                    }}
                    onMouseLeave={() => scheduleClose()}
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
                      {cluster.city} · {cluster.totalCount}
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

      {/* Interactive popover */}
      <AnimatePresence>
        {popover && (
          <motion.div
            key={`${popover.city}::${popover.category}`}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 4 }}
            transition={{
              type: "spring",
              stiffness: 500,
              damping: 35,
              opacity: { duration: 0.15, ease: "easeOut" },
            }}
            className="fixed z-50 w-60"
            style={{
              left: Math.min(popover.x + 16, window.innerWidth - 260),
              top: Math.max(popover.y - 40, 8),
            }}
            onMouseEnter={cancelClose}
            onMouseLeave={scheduleClose}
          >
            <div className="bg-white/95 backdrop-blur-md rounded-2xl
                            shadow-[0_8px_32px_rgba(0,0,0,0.10),0_1px_4px_rgba(0,0,0,0.06)]
                            overflow-hidden">
              {/* Header */}
              <div className="px-3 pt-3 pb-2 flex items-center gap-2">
                <span
                  className="w-2.5 h-2.5 rounded-full shrink-0"
                  style={{ backgroundColor: popover.color }}
                />
                <span className="text-[11px] font-semibold text-[var(--text-primary)] truncate">
                  {popover.city} · {popover.emoji} {popover.category}
                </span>
                <span className="ml-auto text-[9px] text-[var(--text-secondary)] shrink-0">
                  {popover.count} 条
                </span>
              </div>

              {/* Scrollable item list */}
              {popover.items.length > 0 ? (
                <div className="max-h-52 overflow-y-auto px-1.5 pb-1.5">
                  {popover.items.map((item) => (
                    <div
                      key={item.id}
                      className="flex items-center gap-2 px-1.5 py-1.5 rounded-lg
                                 hover:bg-black/[0.04] transition-colors cursor-default"
                    >
                      {item.cover && (
                        <img
                          src={coverSrc(item.cover)}
                          alt=""
                          className="w-9 h-9 rounded-lg object-cover shrink-0 bg-neutral-100"
                          loading="lazy"
                          draggable={false}
                        />
                      )}
                      <div className="min-w-0 flex-1">
                        <div className="text-[10px] font-medium text-[var(--text-primary)] line-clamp-2 leading-tight">
                          {item.title}
                        </div>
                        <div className="text-[9px] text-[var(--text-secondary)] mt-0.5 truncate">
                          {item.author}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="px-3 pb-3 text-[10px] text-[var(--text-secondary)]">
                  暂无匹配内容
                </div>
              )}
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

