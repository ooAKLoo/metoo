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

/* ── Visual style presets — from ovideo design system ── */
export interface MosaicStylePreset {
  id: string;
  label: string;
  borderWidth: number;
  shadowOffset: number;
  shadowBlur: number;
  borderRadius: number;
  /** 内阴影（黏土/浮雕感） */
  insetShadow: string;
  /** 文字描边 */
  textStroke: string;
  /** 噪点纹理叠加 */
  noiseOverlay: boolean;
  /** 背景十字格纹 */
  crosshatch: boolean;
}

export const MOSAIC_STYLES: MosaicStylePreset[] = [
  {
    id: "brutalism", label: "野兽派",
    borderWidth: 3, shadowOffset: 6, shadowBlur: 0, borderRadius: 14,
    insetShadow: "", textStroke: "", noiseOverlay: false, crosshatch: true,
  },
  {
    id: "clay", label: "黏土",
    borderWidth: 0, shadowOffset: 0, shadowBlur: 18, borderRadius: 22,
    insetShadow: "inset 2px 2px 8px rgba(255,255,255,0.6), inset -2px -2px 6px rgba(0,0,0,0.06)",
    textStroke: "", noiseOverlay: false, crosshatch: false,
  },
  {
    id: "flat", label: "扁平",
    borderWidth: 1, shadowOffset: 0, shadowBlur: 0, borderRadius: 8,
    insetShadow: "", textStroke: "", noiseOverlay: false, crosshatch: false,
  },
  {
    id: "sketch", label: "手绘",
    borderWidth: 2, shadowOffset: 3, shadowBlur: 0, borderRadius: 4,
    insetShadow: "", textStroke: "1.5px", noiseOverlay: true, crosshatch: false,
  },
  {
    id: "neon", label: "霓虹",
    borderWidth: 2, shadowOffset: 0, shadowBlur: 14, borderRadius: 14,
    insetShadow: "", textStroke: "2px", noiseOverlay: false, crosshatch: false,
  },
  {
    id: "stacked", label: "3D层叠",
    borderWidth: 2, shadowOffset: 4, shadowBlur: 0, borderRadius: 10,
    insetShadow: "", textStroke: "", noiseOverlay: false, crosshatch: true,
  },
];

/* ── Grid dimensions (base at 800×1100, scales proportionally) ── */
const BASE_W = 800;

/* ── 色相推导引擎 — 单一色相 → 全套配色 ── */
import { hslToHex } from "./PopBoardPoster";

interface MosaicPalette { bg: string; cells: string[]; ink: string; accent: string }

export function deriveMosaicPalette(hue: number): MosaicPalette {
  return {
    bg:     hslToHex(hue, 12, 97),
    ink:    hslToHex(hue + 210, 35, 12),
    accent: hslToHex(hue, 85, 58),
    cells: [
      hslToHex(hue,       80, 62),
      hslToHex(hue + 45,  75, 58),
      hslToHex(hue + 90,  70, 55),
      hslToHex(hue + 135, 65, 60),
      hslToHex(hue + 180, 75, 55),
      hslToHex(hue + 225, 70, 60),
      hslToHex(hue + 270, 80, 58),
      hslToHex(hue + 315, 75, 62),
    ],
  };
}

export const MOSAIC_HUE_PRESETS = [
  { name: "珊瑚", hue: 0 },
  { name: "橙黄", hue: 30 },
  { name: "翠绿", hue: 155 },
  { name: "宝蓝", hue: 220 },
  { name: "紫罗", hue: 280 },
  { name: "玫红", hue: 340 },
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

  /* ── Pick palette & style ── */
  const mosaicHue = useMapStore((s) => s.mosaicHue);
  const pal = useMemo(() => deriveMosaicPalette(mosaicHue), [mosaicHue]);
  const mosaicStyleIdx = useMapStore((s) => s.mosaicStyleIdx);
  const sty = MOSAIC_STYLES[mosaicStyleIdx] ?? MOSAIC_STYLES[0];

  /* ── Stats ── */
  const cityCount = cityEntries.length;
  const totalItems = items.length;
  const iconSeed = cityCount * 31 + totalItems;
  const subtitle = `${cityCount} 座城市的足迹`;
  const cityNames = cityEntries.slice(0, 3).map((c) => c.name).join("、");
  const description = cityCount > 0
    ? `收藏了 ${totalItems} 条内容，足迹遍布 ${cityNames}${cityCount > 3 ? ` 等 ${cityCount} 座城市` : ""}`
    : "开始收藏，记录你的城市足迹";

  /* ── Shared cell base style (driven by sty preset) ── */
  const shadowStr = sty.shadowBlur > 0
    ? `0 0 ${sty.shadowBlur}px ${pal.ink}40`
    : sty.shadowOffset > 0
      ? `${sty.shadowOffset}px ${sty.shadowOffset}px 0 ${pal.ink}`
      : "none";
  const cellBase: React.CSSProperties = {
    width: CELL,
    height: CELL,
    borderRadius: sty.borderRadius,
    border: sty.borderWidth > 0 ? `${sty.borderWidth}px solid ${pal.ink}` : "none",
    boxShadow: [shadowStr, sty.insetShadow].filter(Boolean).join(", ") || "none",
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
          {/* Background cross-hatch pattern (only for styles that use it) */}
          {sty.crosshatch && (
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
          )}

          {/* Noise overlay (sketch / vintage styles) */}
          {sty.noiseOverlay && (
            <svg style={{ position: "absolute", inset: 0, width: "100%", height: "100%", pointerEvents: "none", mixBlendMode: "multiply", opacity: 0.12 }}>
              <filter id="mosaic-noise"><feTurbulence type="fractalNoise" baseFrequency="0.75" numOctaves="3" /></filter>
              <rect width="100%" height="100%" filter="url(#mosaic-noise)" />
            </svg>
          )}

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
                            ...(sty.textStroke ? { WebkitTextStroke: `${sty.textStroke} ${pal.ink}`, paintOrder: "stroke fill" } : {}),
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
                border: sty.borderWidth > 0 ? `${sty.borderWidth}px solid ${pal.accent}` : "none",
                boxShadow: sty.shadowBlur > 0
                  ? `0 0 ${sty.shadowBlur}px ${pal.accent}40`
                  : sty.shadowOffset > 0
                    ? `${sty.shadowOffset}px ${sty.shadowOffset}px 0 ${pal.accent}`
                    : "none",
                borderRadius: sty.borderRadius,
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
