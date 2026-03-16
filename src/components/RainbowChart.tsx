import { useMemo, useState, useCallback } from "react";
import { motion, AnimatePresence } from "motion/react";
import { useFavoriteStore, type FavoriteItem } from "../stores/useFavoriteStore";
import { extractTagsFromTitle } from "../hooks/useTagExtraction";
import { TAG_MAP } from "../lib/tag-dictionary";
import { useMapStore } from "../stores/useMapStore";
import { RAINBOW_ARC_COLORS } from "../lib/category-colors";

/* ── Types ─────────────────────────────────────────────── */

interface Fragment {
  id: number;
  x: number;
  y: number;
  size: number;
  type: "circle" | "arc" | "rect" | "dot-cluster";
  color: string;
  opacity: number;
  rotation: number;
  arcStart?: number;
  arcEnd?: number;
  item: FavoriteItem;
}

interface Decoration {
  x: number;
  y: number;
  size: number;
  type: "dot" | "ring" | "dash" | "wave";
  color: string;
  opacity: number;
  rotation: number;
}

interface ArcLayer {
  category: string;
  emoji: string;
  color: string;
  items: FavoriteItem[];
  radius: number;
  arcSpan: number;
  fragments: Fragment[];
  decorations: Decoration[];
}

/* ── Constants ─────────────────────────────────────────── */

const W = 800;
const H = 460;
const CX = 400;
const CY = 430;
const MAX_R = 350;
const MIN_R = 70;
const MAX_LAYERS = 14;

/* ── Seeded random ─────────────────────────────────────── */

function createRng(seed: number) {
  let s = Math.abs(seed) + 1;
  return () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

/* ── SVG arc path helper ───────────────────────────────── */

function arcPath(
  cx: number, cy: number, r: number,
  startAngle: number, endAngle: number,
): string {
  const x1 = cx + r * Math.cos(startAngle);
  const y1 = cy - r * Math.sin(startAngle);
  const x2 = cx + r * Math.cos(endAngle);
  const y2 = cy - r * Math.sin(endAngle);
  let span = startAngle - endAngle;
  if (span < 0) span += Math.PI * 2;
  const large = span > Math.PI ? 1 : 0;
  return `M ${x1} ${y1} A ${r} ${r} 0 ${large} 1 ${x2} ${y2}`;
}

/* ── Component ─────────────────────────────────────────── */

export function RainbowChart() {
  const items = useFavoriteStore((s) => s.items);
  const setSelectedItem = useMapStore((s) => s.setSelectedItem);
  const selectedItemId = useMapStore((s) => s.selectedItemId);

  const [hoveredArc, setHoveredArc] = useState<number | null>(null);
  const [tooltip, setTooltip] = useState<{
    text: string;
    x: number;
    y: number;
  } | null>(null);

  /* ── Data aggregation ── */

  const arcLayers = useMemo(() => {
    if (items.length === 0) return [];

    // Group items by first matched food category
    const catMap = new Map<string, FavoriteItem[]>();
    for (const item of items) {
      const tags = extractTagsFromTitle(item.title);
      if (tags.length === 0) continue;
      const cat = tags[0];
      const list = catMap.get(cat);
      if (list) list.push(item);
      else catMap.set(cat, [item]);
    }

    // Sort by count desc → outermost arc = most popular
    const sorted = Array.from(catMap.entries())
      .map(([cat, its]) => ({ category: cat, items: its }))
      .sort((a, b) => b.items.length - a.items.length)
      .slice(0, MAX_LAYERS);

    if (sorted.length === 0) return [];

    const layerCount = sorted.length;
    const gap = Math.min((MAX_R - MIN_R) / layerCount, 32);
    const maxItems = sorted[0].items.length;

    return sorted.map((entry, idx): ArcLayer => {
      const radius = MAX_R - idx * gap;
      const color = RAINBOW_ARC_COLORS[idx % RAINBOW_ARC_COLORS.length];
      const emoji =
        Object.values(TAG_MAP).find((v) => v.category === entry.category)
          ?.emoji ?? "🏷️";

      // Arc span proportional to item count (min 40°, max 170°)
      const spanRatio = entry.items.length / maxItems;
      const arcSpan = (0.22 + spanRatio * 0.73) * Math.PI;
      const halfSpan = arcSpan / 2;
      const startAngle = Math.PI / 2 + halfSpan;

      // Fragment layout along the arc
      const arcLen = arcSpan * radius;
      const baseSize = 5;
      const spacing = baseSize * 3;
      const maxFrag = Math.floor(arcLen / spacing);
      const display = entry.items.slice(0, maxFrag);
      const rng = createRng(idx * 7919 + 42);

      const fragments: Fragment[] = display.map((item, j) => {
        const t = display.length === 1 ? 0.5 : (j + 0.5) / display.length;
        const angle = startAngle - t * arcSpan;

        // Position on arc + jitter
        const nx = Math.cos(angle);
        const ny = -Math.sin(angle);
        const tx = ny;
        const ty = nx;
        const jR = (rng() - 0.5) * 8;
        const jT = (rng() - 0.5) * 4;
        const x = radius * nx + jR * nx + jT * tx;
        const y = radius * ny + jR * ny + jT * ty;

        // Shape type
        const roll = rng();
        let type: Fragment["type"];
        if (roll < 0.48) type = "circle";
        else if (roll < 0.68) type = "arc";
        else if (roll < 0.84) type = "rect";
        else type = "dot-cluster";

        // Size (featured = 12% chance, 1.5× larger)
        const featured = rng() < 0.12;
        const size = Math.max(2.5, (baseSize + (rng() - 0.5) * 3) * (featured ? 1.5 : 1));

        return {
          id: item.id,
          x, y, size, type, color,
          opacity: 0.55 + rng() * 0.4,
          rotation: rng() * 360,
          arcStart: angle + 0.06 + rng() * 0.04,
          arcEnd: angle - 0.06 - rng() * 0.04,
          item,
        };
      });

      // Decorative elements in the gap below this arc
      const decos: Decoration[] = [];
      const numDeco = Math.floor(rng() * 5) + 3;
      for (let d = 0; d < numDeco; d++) {
        const dAngle = startAngle - rng() * arcSpan;
        const dR = radius - gap * (0.3 + rng() * 0.4);
        const dx = dR * Math.cos(dAngle);
        const dy = -dR * Math.sin(dAngle);
        const types: Decoration["type"][] = ["dot", "ring", "dash", "wave"];
        decos.push({
          x: dx, y: dy,
          size: 1 + rng() * 2.5,
          type: types[Math.floor(rng() * types.length)],
          color,
          opacity: 0.2 + rng() * 0.25,
          rotation: rng() * 180,
        });
      }

      return {
        category: entry.category, emoji, color,
        items: entry.items, radius, arcSpan,
        fragments, decorations: decos,
      };
    });
  }, [items]);

  const handleFragClick = useCallback(
    (id: number) => setSelectedItem(selectedItemId === id ? null : id),
    [setSelectedItem, selectedItemId],
  );

  if (items.length === 0) return null;

  if (arcLayers.length === 0) {
    return (
      <div className="w-full h-full flex items-center justify-center">
        <p className="text-[11px] text-secondary">
          当前收藏中没有可识别的美食品类
        </p>
      </div>
    );
  }

  return (
    <div className="w-full h-full flex items-center justify-center relative overflow-hidden">
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="w-full h-full max-h-full"
        preserveAspectRatio="xMidYMid meet"
      >
        {/* Glow filter for featured fragments */}
        <defs>
          <filter id="rainbow-glow">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        <g transform={`translate(${CX}, ${CY})`}>
          {arcLayers.map((layer, li) => {
            const isHovered = hoveredArc === li;
            const dimmed = hoveredArc !== null && hoveredArc !== li;

            return (
              <motion.g
                key={layer.category}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: dimmed ? 0.25 : 1, y: 0 }}
                transition={{
                  delay: li * 0.07,
                  duration: 0.5,
                  ease: "easeOut",
                  opacity: { duration: 0.2 },
                }}
                onMouseEnter={() => setHoveredArc(li)}
                onMouseLeave={() => {
                  setHoveredArc(null);
                  setTooltip(null);
                }}
              >
                {/* Faint guide arc */}
                <path
                  d={arcPath(
                    0, 0, layer.radius,
                    Math.PI / 2 + layer.arcSpan / 2,
                    Math.PI / 2 - layer.arcSpan / 2,
                  )}
                  fill="none"
                  stroke={layer.color}
                  strokeWidth={1.2}
                  opacity={isHovered ? 0.18 : 0.06}
                  strokeLinecap="round"
                />

                {/* Fragments */}
                {layer.fragments.map((f, fi) => (
                  <motion.g
                    key={f.id}
                    initial={{ opacity: 0, scale: 0 }}
                    animate={{
                      opacity: 1,
                      scale: selectedItemId === f.id ? 1.4 : 1,
                    }}
                    transition={{
                      delay: li * 0.07 + fi * 0.012,
                      type: "spring",
                      stiffness: 420,
                      damping: 22,
                    }}
                    onMouseEnter={(e) => {
                      setTooltip({
                        text: f.item.title,
                        x: e.clientX,
                        y: e.clientY,
                      });
                    }}
                    onMouseMove={(e) => {
                      setTooltip((prev) =>
                        prev ? { ...prev, x: e.clientX, y: e.clientY } : null,
                      );
                    }}
                    onMouseLeave={() => setTooltip(null)}
                    onClick={() => handleFragClick(f.id)}
                    className="cursor-pointer"
                    filter={f.size > 7 ? "url(#rainbow-glow)" : undefined}
                  >
                    <FragmentShape frag={f} arcRadius={layer.radius} />
                  </motion.g>
                ))}

                {/* Decorations */}
                {layer.decorations.map((d, di) => (
                  <motion.g
                    key={`d${di}`}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: d.opacity }}
                    transition={{ delay: li * 0.07 + 0.4 + di * 0.04 }}
                  >
                    <DecoShape deco={d} />
                  </motion.g>
                ))}

                {/* Category label on hover */}
                <AnimatePresence>
                  {isHovered && (
                    <motion.text
                      initial={{ opacity: 0, y: 4 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.15 }}
                      x={0}
                      y={-layer.radius - 14}
                      textAnchor="middle"
                      className="text-[12px] font-medium"
                      fill="var(--text-primary)"
                    >
                      {layer.emoji} {layer.category} · {layer.items.length}
                    </motion.text>
                  )}
                </AnimatePresence>
              </motion.g>
            );
          })}
        </g>
      </svg>

      {/* Floating tooltip */}
      <AnimatePresence>
        {tooltip && (
          <motion.div
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.12 }}
            className="fixed pointer-events-none z-50 max-w-[200px]
                       bg-white/95 backdrop-blur-sm rounded-xl
                       px-3 py-2 shadow-[0_4px_20px_rgba(0,0,0,0.08)]"
            style={{
              left: tooltip.x,
              top: tooltip.y - 44,
              transform: "translateX(-50%)",
            }}
          >
            <div className="text-[10px] font-medium text-[var(--text-primary)] line-clamp-2">
              {tooltip.text}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ── Fragment renderer ─────────────────────────────────── */

function FragmentShape({
  frag: f,
  arcRadius,
}: {
  frag: Fragment;
  arcRadius: number;
}) {
  switch (f.type) {
    case "circle":
      return (
        <circle cx={f.x} cy={f.y} r={f.size} fill={f.color} opacity={f.opacity} />
      );
    case "rect": {
      const w = f.size * 2.5;
      const h = f.size * 1.2;
      return (
        <rect
          x={f.x - w / 2} y={f.y - h / 2}
          width={w} height={h} rx={h / 2}
          fill={f.color} opacity={f.opacity}
          transform={`rotate(${f.rotation}, ${f.x}, ${f.y})`}
        />
      );
    }
    case "arc":
      return f.arcStart !== undefined && f.arcEnd !== undefined ? (
        <path
          d={arcPath(0, 0, arcRadius, f.arcStart, f.arcEnd)}
          fill="none" stroke={f.color}
          strokeWidth={f.size * 0.9}
          strokeLinecap="round"
          opacity={f.opacity}
        />
      ) : (
        <circle cx={f.x} cy={f.y} r={f.size} fill={f.color} opacity={f.opacity} />
      );
    case "dot-cluster":
      return (
        <g>
          <circle cx={f.x} cy={f.y} r={f.size * 0.6} fill={f.color} opacity={f.opacity} />
          <circle
            cx={f.x + f.size * 1.3} cy={f.y - f.size * 0.5}
            r={f.size * 0.38} fill={f.color} opacity={f.opacity * 0.7}
          />
          <circle
            cx={f.x - f.size * 0.9} cy={f.y + f.size * 0.9}
            r={f.size * 0.32} fill={f.color} opacity={f.opacity * 0.55}
          />
        </g>
      );
  }
}

/* ── Decoration renderer ───────────────────────────────── */

function DecoShape({ deco: d }: { deco: Decoration }) {
  switch (d.type) {
    case "dot":
      return <circle cx={d.x} cy={d.y} r={d.size} fill={d.color} opacity={d.opacity} />;
    case "ring":
      return (
        <circle
          cx={d.x} cy={d.y} r={d.size * 1.8}
          fill="none" stroke={d.color}
          strokeWidth={0.7} opacity={d.opacity}
        />
      );
    case "dash":
      return (
        <line
          x1={d.x - d.size * 2.5} y1={d.y}
          x2={d.x + d.size * 2.5} y2={d.y}
          stroke={d.color} strokeWidth={1.1}
          strokeLinecap="round" opacity={d.opacity}
          transform={`rotate(${d.rotation}, ${d.x}, ${d.y})`}
        />
      );
    case "wave": {
      const s = d.size * 2;
      return (
        <path
          d={`M ${d.x - s * 2} ${d.y} q ${s} ${-s * 1.2} ${s * 2} 0 q ${s} ${s * 1.2} ${s * 2} 0`}
          fill="none" stroke={d.color}
          strokeWidth={0.9} strokeLinecap="round"
          opacity={d.opacity}
          transform={`rotate(${d.rotation}, ${d.x}, ${d.y})`}
        />
      );
    }
  }
}
