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

/* ── Pack category bubbles around a center circle ─────── */

function packAroundCenter(bubbles: Bubble[], centerR: number) {
  if (bubbles.length === 0) return;

  // Place bubbles in concentric rings around the center
  let ringR = centerR;
  let idx = 0;

  while (idx < bubbles.length) {
    const r = bubbles[idx].radius;
    const gap = 2;
    ringR += r + gap;

    const circ = 2 * Math.PI * ringR;
    const fit = Math.max(1, Math.floor(circ / (r * 2 + gap)));
    const count = Math.min(fit, bubbles.length - idx);
    // Offset each ring slightly for organic feel
    const angleOffset = -Math.PI / 2 + (idx % 2) * 0.3;

    for (let j = 0; j < count && idx < bubbles.length; j++, idx++) {
      const angle = angleOffset + (j / count) * 2 * Math.PI;
      bubbles[idx].x = ringR * Math.cos(angle);
      bubbles[idx].y = ringR * Math.sin(angle);
    }

    ringR += r;
  }
}

/* ── Distribute clusters evenly across the viewport ───── */

function distributeInViewport(clusters: Cluster[]) {
  const n = clusters.length;
  if (n === 0) return;

  const usableW = W - PAD * 2;
  const usableH = H - PAD * 2;

  // Grid-based initial placement
  const cols = Math.ceil(Math.sqrt(n * (usableW / usableH)));
  const rows = Math.ceil(n / cols);
  const cellW = usableW / cols;
  const cellH = usableH / rows;

  for (let i = 0; i < n; i++) {
    const col = i % cols;
    const row = Math.floor(i / cols);
    // Center within each cell, with slight jitter for organic look
    const jitterX = (seededRandom(i * 7 + 3) - 0.5) * cellW * 0.2;
    const jitterY = (seededRandom(i * 13 + 7) - 0.5) * cellH * 0.2;
    clusters[i].cx = PAD + cellW * (col + 0.5) + jitterX;
    clusters[i].cy = PAD + cellH * (row + 0.5) + jitterY;
  }

  // Force-based overlap resolution
  for (let iter = 0; iter < 60; iter++) {
    let moved = false;
    for (let i = 0; i < n; i++) {
      for (let j = i + 1; j < n; j++) {
        const a = clusters[i];
        const b = clusters[j];
        const dx = b.cx - a.cx;
        const dy = b.cy - a.cy;
        const dist = Math.sqrt(dx * dx + dy * dy) || 0.1;
        const minDist = a.boundingR + b.boundingR + 12;

        if (dist < minDist) {
          const push = (minDist - dist) * 0.3;
          const nx = dx / dist;
          const ny = dy / dist;
          a.cx -= nx * push;
          a.cy -= ny * push;
          b.cx += nx * push;
          b.cy += ny * push;

          // Clamp
          a.cx = clamp(a.cx, PAD, W - PAD);
          a.cy = clamp(a.cy, PAD, H - PAD);
          b.cx = clamp(b.cx, PAD, W - PAD);
          b.cy = clamp(b.cy, PAD, H - PAD);
          moved = true;
        }
      }
    }
    if (!moved) break;
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
