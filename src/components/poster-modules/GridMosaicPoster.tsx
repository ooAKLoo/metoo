import { useMemo, useRef, useState, useEffect, useCallback } from "react";
import type { PosterModuleProps } from "../../lib/poster-modules";
import { coverSrc } from "../map-shared";
import { PixelSpriteSVG, SPRITE_NAMES } from "../poster-generators/PixelSprites";
import { ElevationPersonSVG } from "../poster-generators/ElevationPeople";
import { CharacterSVG, POSE_CATEGORIES, BODY_TYPES } from "../poster-generators/CharacterGenerator";
import { mulberry32, DOODLE_ENTRIES } from "../poster-generators/DoodleGallery";
import { useMapStore } from "../../stores/useMapStore";

/* ── Theme definitions — cell decoration styles ── */
export type MosaicThemeId = "solid" | "stripe" | "dot";
export const MOSAIC_THEMES: { id: MosaicThemeId; label: string }[] = [
  { id: "solid", label: "纯色" },
  { id: "stripe", label: "斜线" },
  { id: "dot", label: "圆点" },
];

/* ── Grid dimensions (base at 800×1100, scales proportionally) ── */
const BASE_W = 800;
const BORDER_W = 3;
const SHADOW = 6;

/* ── Neo-brutalist palettes — clashing, high-contrast colors ── */
const PALETTES = [
  {
    bg: "#FFF8F0",
    cells: ["#FF6B6B", "#4ECDC4", "#FFE66D", "#FF8A5C", "#A8E6CE", "#FF6F91", "#845EC2", "#FFC75F"],
    ink: "#1A1A2E",
    accent: "#FF6B6B",
  },
  {
    bg: "#F0FFF4",
    cells: ["#00C9A7", "#FF6B6B", "#FFD93D", "#6BCB77", "#FF8066", "#4D96FF", "#9B59B6", "#F39C12"],
    ink: "#1A1A2E",
    accent: "#00C9A7",
  },
  {
    bg: "#FFF0F5",
    cells: ["#FF4081", "#7C4DFF", "#00BCD4", "#FF9100", "#4CAF50", "#E040FB", "#FF5252", "#00E5FF"],
    ink: "#2C003E",
    accent: "#FF4081",
  },
  {
    bg: "#FFFDE7",
    cells: ["#FF5722", "#2196F3", "#4CAF50", "#FF9800", "#9C27B0", "#00BCD4", "#E91E63", "#8BC34A"],
    ink: "#1B1B1B",
    accent: "#FF5722",
  },
  {
    bg: "#1A1A2E",
    cells: ["#E94560", "#0F3460", "#16C79A", "#E07C24", "#9B59B6", "#2E86AB", "#D63031", "#00897B"],
    ink: "#F8F8F8",
    accent: "#E94560",
  },
  {
    bg: "#F5F0FF",
    cells: ["#FF3F00", "#00B4D8", "#FFEA00", "#D500F9", "#00F5D4", "#FE6D73", "#118AB2", "#FFD166"],
    ink: "#111111",
    accent: "#FF3F00",
  },
];

/* ── Cell color index — ensures adjacent cells get different colors ── */
const COLOR_IDX = [
  [0, 1, 2, 3],
  [4, 5, 6, 7],
  [0, 3, 1, 5],
  [6, 2, 4, 7],
  [3, 0, 5, 1],
];

/* ── Seeded icon type assignment — each icon slot gets a generator type ── */
type IconType = "pixel" | "doodle" | "elevation" | "character";
const ICON_TYPE_CYCLE: IconType[] = ["pixel", "doodle", "elevation", "character", "doodle", "pixel", "character", "elevation"];

/* ── Layout: T=text, I=icon, C=cover ── */
const LAYOUT = [
  ["T0", "I0", "T1", "C0"],
  ["I1", "T2", "I2", "T3"],
  ["C1", "I3", "T4", "I4"],
  ["I5", "T5", "I6", "C2"],
  ["T6", "I7", "T7", "T8"],
] as const;

/* ── Generated icon renderer — uses poster-generators assets ── */
function GeneratedIcon({ index, size, color, seed }: { index: number; size: number; color: string; seed: number }) {
  const type = ICON_TYPE_CYCLE[index % ICON_TYPE_CYCLE.length];
  const rng = mulberry32(seed + index * 7919);

  if (type === "pixel") {
    const spriteIdx = Math.floor(rng() * SPRITE_NAMES.length);
    return <PixelSpriteSVG spriteName={SPRITE_NAMES[spriteIdx]} size={size} color={color} />;
  }

  if (type === "elevation") {
    const personSeed = Math.floor(rng() * 100000);
    return (
      <div style={{ color }}>
        <ElevationPersonSVG seed={personSeed} size={size} artStyle="line" />
      </div>
    );
  }

  if (type === "character") {
    const charSeed = Math.floor(rng() * 100000);
    const poseIdx = Math.floor(rng() * POSE_CATEGORIES.length);
    const bodyIdx = Math.floor(rng() * BODY_TYPES.length);
    const accIdx = Math.floor(rng() * 8);
    return <CharacterSVG poseFn={POSE_CATEGORIES[poseIdx].fn} seed={charSeed} bodyIdx={bodyIdx} accIdx={accIdx} size={size} artStyle="line" />;
  }

  // doodle
  const entryIdx = Math.floor(rng() * DOODLE_ENTRIES.length);
  const doodleRng = mulberry32(Math.floor(rng() * 1000000));
  const svgHtml = DOODLE_ENTRIES[entryIdx].gen(doodleRng);
  return (
    <svg viewBox="0 0 40 44" width={size} height={size * 1.1} xmlns="http://www.w3.org/2000/svg" style={{ overflow: "visible", color }} dangerouslySetInnerHTML={{ __html: svgHtml }} />
  );
}

/* ── Cell pattern overlay — renders decorative SVG pattern on top of cell bg ── */
function CellPatternOverlay({ theme, ink, size }: { theme: MosaicThemeId; ink: string; size: number }) {
  if (theme === "solid") return null;

  if (theme === "stripe") {
    const gap = Math.round(size * 0.11);
    const sw = Math.max(1.5, size * 0.015);
    return (
      <svg
        style={{ position: "absolute", inset: 0, width: "100%", height: "100%", pointerEvents: "none" }}
        viewBox={`0 0 ${size} ${size}`}
      >
        {Array.from({ length: Math.ceil((size * 2) / gap) }, (_, i) => {
          const offset = -size + i * gap;
          return (
            <line
              key={i}
              x1={offset}
              y1={size}
              x2={offset + size}
              y2={0}
              stroke={ink}
              strokeWidth={sw}
              opacity={0.12}
            />
          );
        })}
      </svg>
    );
  }

  // dot
  const dotR = Math.max(2, size * 0.025);
  const gap = Math.round(size * 0.11);
  const cols = Math.ceil(size / gap);
  const rows = Math.ceil(size / gap);
  return (
    <svg
      style={{ position: "absolute", inset: 0, width: "100%", height: "100%", pointerEvents: "none" }}
      viewBox={`0 0 ${size} ${size}`}
    >
      {Array.from({ length: cols * rows }, (_, i) => {
        const col = i % cols;
        const row = Math.floor(i / cols);
        const cx = gap * 0.5 + col * gap;
        const cy = gap * 0.5 + row * gap;
        return <circle key={i} cx={cx} cy={cy} r={dotR} fill={ink} opacity={0.1} />;
      })}
    </svg>
  );
}

/* ── Main Component ── */

function GridMosaicPoster({ items, cityEntries, posterWidth: POSTER_W, posterHeight: POSTER_H }: PosterModuleProps) {
  const mosaicThemeIdx = useMapStore((s) => s.mosaicThemeIdx);
  const themeId = MOSAIC_THEMES[mosaicThemeIdx]?.id ?? "solid";

  const containerRef = useRef<HTMLDivElement>(null);
  const [fitScale, setFitScale] = useState(1);

  /* Scale grid dimensions proportionally to poster width */
  const ratio = POSTER_W / BASE_W;
  const CELL = Math.round(138 * ratio);
  const GAP = Math.round(14 * ratio);
  const GRID_W = CELL * 4 + GAP * 3;

  const measure = useCallback(() => {
    const el = containerRef.current;
    if (!el) return;
    const pad = 48;
    const sx = (el.clientWidth - pad) / POSTER_W;
    const sy = (el.clientHeight - pad) / POSTER_H;
    setFitScale(Math.min(sx, sy, 1));
  }, [POSTER_W, POSTER_H]);

  useEffect(() => {
    measure();
    const ro = new ResizeObserver(measure);
    if (containerRef.current) ro.observe(containerRef.current);
    return () => ro.disconnect();
  }, [measure]);

  /* ── Derive grid text from city names ── */
  const gridChars = useMemo(() => {
    const chars: string[] = [];
    for (const city of cityEntries) {
      if (chars.length >= 9) break;
      const ch = city.name[0];
      if (ch && !chars.includes(ch)) chars.push(ch);
    }
    const fb = ["去", "过", "的", "城", "市", "足", "迹", "地", "图"];
    while (chars.length < 9) chars.push(fb[chars.length] || "·");
    return chars;
  }, [cityEntries]);

  /* ── Collect cover images ── */
  const covers = useMemo(() => {
    const out: string[] = [];
    for (const city of cityEntries) {
      for (const c of city.covers) {
        if (out.length >= 3) break;
        const src = coverSrc(c);
        if (src) out.push(src);
      }
      if (out.length >= 3) break;
    }
    return out;
  }, [cityEntries]);

  /* ── Pick palette ── */
  const pal = PALETTES[cityEntries.length % PALETTES.length];

  /* ── Stats ── */
  const cityCount = cityEntries.length;
  const totalItems = items.length;
  const iconSeed = cityCount * 31 + totalItems;
  const subtitle = `${cityCount} 座城市的足迹`;
  const cityNames = cityEntries.slice(0, 3).map((c) => c.name).join("、");
  const description = cityCount > 0
    ? `收藏了 ${totalItems} 条内容，足迹遍布 ${cityNames}${cityCount > 3 ? ` 等 ${cityCount} 座城市` : ""}`
    : "开始收藏，记录你的城市足迹";

  /* ── Shared cell base style ── */
  const cellBase: React.CSSProperties = {
    width: CELL,
    height: CELL,
    borderRadius: 14,
    border: `${BORDER_W}px solid ${pal.ink}`,
    boxShadow: `${SHADOW}px ${SHADOW}px 0 ${pal.ink}`,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
    position: "relative",
  };

  return (
    <div
      ref={containerRef}
      className="absolute inset-0 flex items-center justify-center overflow-hidden pointer-events-none"
    >
      <div style={{ transform: `scale(${fitScale})`, transformOrigin: "center" }}>
        <div
          data-poster-export
          style={{
            width: POSTER_W,
            height: POSTER_H,
            backgroundColor: "#FFFFFF",
            borderRadius: 24,
            boxShadow: "0 4px 24px rgba(0,0,0,0.08), 0 1px 4px rgba(0,0,0,0.04)",
            fontFamily: '"Noto Sans SC", "PingFang SC", system-ui, sans-serif',
            position: "relative",
            overflow: "hidden",
          }}
        >
          {/* Background cross-hatch pattern */}
          <svg
            style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }}
            viewBox={`0 0 ${POSTER_W} ${POSTER_H}`}
          >
            {Array.from({ length: 180 }, (_, i) => {
              const col = i % 18;
              const row = Math.floor(i / 18);
              const x = 30 + col * 44;
              const y = 30 + row * 110;
              return (
                <g key={i} opacity={0.06}>
                  <line x1={x - 3} y1={y} x2={x + 3} y2={y} stroke={pal.ink} strokeWidth={1.5} />
                  <line x1={x} y1={y - 3} x2={x} y2={y + 3} stroke={pal.ink} strokeWidth={1.5} />
                </g>
              );
            })}
          </svg>

          {/* Content layer */}
          <div
            style={{
              position: "relative",
              zIndex: 1,
              padding: "48px 0 32px",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              height: "100%",
            }}
          >
            {/* ── Grid ── */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: `repeat(4, ${CELL}px)`,
                gridTemplateRows: `repeat(5, ${CELL}px)`,
                gap: GAP,
              }}
            >
              {LAYOUT.map((row, ri) =>
                row.map((cell, ci) => {
                  const bg = pal.cells[COLOR_IDX[ri][ci]];
                  const key = `${ri}-${ci}`;

                  /* Text cell — bold city character */
                  if (cell.startsWith("T")) {
                    const idx = parseInt(cell.substring(1));
                    return (
                      <div key={key} style={{ ...cellBase, backgroundColor: bg }}>
                        <CellPatternOverlay theme={themeId} ink={pal.ink} size={CELL} />
                        <span
                          style={{
                            fontSize: 72,
                            fontWeight: 900,
                            color: pal.ink,
                            lineHeight: 1,
                            userSelect: "none",
                            position: "relative",
                            zIndex: 1,
                          }}
                        >
                          {gridChars[idx]}
                        </span>
                      </div>
                    );
                  }

                  /* Cover photo cell */
                  if (cell.startsWith("C")) {
                    const idx = parseInt(cell.substring(1));
                    const src = covers[idx];
                    if (!src) {
                      /* Fallback → icon */
                      return (
                        <div key={key} style={{ ...cellBase, backgroundColor: bg }}>
                          <CellPatternOverlay theme={themeId} ink={pal.ink} size={CELL} />
                          <div style={{ position: "relative", zIndex: 1 }}>
                            <GeneratedIcon index={ri * 2 + ci} size={70} color={pal.ink} seed={iconSeed} />
                          </div>
                        </div>
                      );
                    }
                    return (
                      <div key={key} style={cellBase}>
                        <div
                          style={{
                            position: "absolute",
                            inset: 0,
                            backgroundImage: `url(${src})`,
                            backgroundSize: "cover",
                            backgroundPosition: "center",
                          }}
                        />
                        {/* Subtle color tint */}
                        <div
                          style={{
                            position: "absolute",
                            inset: 0,
                            backgroundColor: bg,
                            opacity: 0.12,
                            mixBlendMode: "multiply",
                          }}
                        />
                      </div>
                    );
                  }

                  /* Icon cell — hand-drawn SVG */
                  const iIdx = parseInt(cell.substring(1));
                  return (
                    <div key={key} style={{ ...cellBase, backgroundColor: bg }}>
                      <CellPatternOverlay theme={themeId} ink={pal.ink} size={CELL} />
                      <div style={{ position: "relative", zIndex: 1 }}>
                        <GeneratedIcon index={iIdx} size={70} color={pal.ink} seed={iconSeed} />
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* ── Bottom info card — inverted color scheme ── */}
            <div
              style={{
                marginTop: "auto",
                width: GRID_W,
                padding: "22px 28px",
                backgroundColor: pal.ink,
                border: `${BORDER_W}px solid ${pal.accent}`,
                boxShadow: `${SHADOW}px ${SHADOW}px 0 ${pal.accent}`,
                borderRadius: 14,
                display: "flex",
                alignItems: "center",
                gap: 24,
              }}
            >
              {/* Big number */}
              <div style={{ flexShrink: 0, textAlign: "center" }}>
                <div
                  style={{
                    fontSize: 60,
                    fontWeight: 900,
                    lineHeight: 1,
                    color: pal.accent,
                  }}
                >
                  {cityCount}
                </div>
                <div
                  style={{
                    fontSize: 10,
                    fontWeight: 800,
                    letterSpacing: "0.15em",
                    color: pal.bg,
                    opacity: 0.6,
                    marginTop: 4,
                    textTransform: "uppercase",
                  }}
                >
                  CITIES
                </div>
              </div>

              {/* Divider */}
              <div
                style={{
                  width: 3,
                  alignSelf: "stretch",
                  backgroundColor: pal.accent,
                  borderRadius: 2,
                  opacity: 0.4,
                }}
              />

              {/* Text */}
              <div style={{ flex: 1 }}>
                <h2
                  style={{
                    fontSize: 22,
                    fontWeight: 900,
                    color: pal.bg,
                    marginBottom: 6,
                    letterSpacing: "-0.02em",
                  }}
                >
                  {subtitle}
                </h2>
                <p
                  style={{
                    fontSize: 12,
                    color: pal.bg,
                    opacity: 0.7,
                    lineHeight: 1.6,
                  }}
                >
                  {description}
                </p>
              </div>
            </div>

            {/* ── Brand footer ── */}
            <div
              style={{
                marginTop: 16,
                textAlign: "center",
                fontSize: 13,
                fontWeight: 900,
                letterSpacing: "0.2em",
                color: pal.ink,
                opacity: 0.35,
              }}
            >
              METOO · 城市拼贴
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default GridMosaicPoster;
