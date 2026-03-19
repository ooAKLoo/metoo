import { useMemo, useRef, useState, useEffect, useCallback } from "react";
import type { PosterModuleProps } from "../../lib/poster-modules";
import { coverSrc } from "../map-shared";
import { useMapStore } from "../../stores/useMapStore";

/* ── Dimensions ── */
const N = 7; // 7×7 grid → 24 edge cells
const GAP = 3;
const PAD = 4;

/* ═══════════════════════════════════════════════════
   HSL 色彩推导引擎 — 参考 ThumbnailBanner 思路
   单一色相 → 自动推导 6 色 + 背景 + 描边
   ═══════════════════════════════════════════════════ */

export function hslToHex(h: number, s: number, l: number): string {
  h = ((h % 360) + 360) % 360;
  s = Math.max(0, Math.min(100, s)) / 100;
  l = Math.max(0, Math.min(100, l)) / 100;
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = l - c / 2;
  let r = 0, g = 0, b = 0;
  if (h < 60) { r = c; g = x; }
  else if (h < 120) { r = x; g = c; }
  else if (h < 180) { g = c; b = x; }
  else if (h < 240) { g = x; b = c; }
  else if (h < 300) { r = x; b = c; }
  else { r = c; b = x; }
  const to = (v: number) => Math.round((v + m) * 255).toString(16).padStart(2, "0");
  return `#${to(r)}${to(g)}${to(b)}`;
}

export function hexToHsl(hex: string): [number, number, number] {
  const raw = hex.replace("#", "");
  const r = parseInt(raw.slice(0, 2), 16) / 255;
  const g = parseInt(raw.slice(2, 4), 16) / 255;
  const b = parseInt(raw.slice(4, 6), 16) / 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  const l = (max + min) / 2;
  if (max === min) return [0, 0, Math.round(l * 100)];
  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  let h = 0;
  if (max === r) h = ((g - b) / d + (g < b ? 6 : 0)) * 60;
  else if (max === g) h = ((b - r) / d + 2) * 60;
  else h = ((r - g) / d + 4) * 60;
  return [Math.round(h), Math.round(s * 100), Math.round(l * 100)];
}

/**
 * 从主色色相推导完整 Pop-Art 棋盘配色
 *
 * 设计逻辑：
 *   primary   → HSL(H,   90%, 65%)  主色
 *   secondary → HSL(H+55°, 95%, 62%) 暖邻近（原 yellow 位）
 *   tertiary  → HSL(H+180°,85%, 55%) 补色（原 blue 位）
 *   quad      → HSL(H+150°,80%, 62%) 拆补色（原 mint 位）
 *   quinary   → HSL(H+30°, 88%, 58%) 近邻（原 orange 位）
 *   bg        → HSL(H+210°,45%, 7%)  极暗衬底
 *   ink       → HSL(H+210°,20%, 12%) 暗描边/阴影
 *   lightInk  → HSL(H+210°,15%, 25%) 浅描边（图标用）
 */
export interface DerivedPopPalette {
  primary: string;
  secondary: string;
  tertiary: string;
  quad: string;
  quinary: string;
  bg: string;
  ink: string;
  lightInk: string;
}

export function derivePopBoardPalette(hue: number): DerivedPopPalette {
  return {
    primary:   hslToHex(hue,       90, 65),
    secondary: hslToHex(hue + 55,  95, 62),
    tertiary:  hslToHex(hue + 180, 85, 55),
    quad:      hslToHex(hue + 150, 80, 62),
    quinary:   hslToHex(hue + 30,  88, 58),
    bg:        hslToHex(hue + 210, 45, 7),
    ink:       hslToHex(hue + 210, 20, 12),
    lightInk:  hslToHex(hue + 210, 15, 25),
  };
}

/* ── Hue 预设 — 只需定义名字和色相，配色全自动 ── */
export const POP_BOARD_HUE_PRESETS = [
  { name: "玫粉", hue: 330 },
  { name: "橙红", hue: 15 },
  { name: "金黄", hue: 45 },
  { name: "翠绿", hue: 155 },
  { name: "宝蓝", hue: 220 },
  { name: "靛紫", hue: 275 },
];

/* ── Hand-drawn SVG corner icons ── */
const S = 28; // icon size
const ICON_STYLE: React.CSSProperties = {
  width: S,
  height: S,
  display: "block",
};

function IconFlag() {
  // Single-color checkered flag matching FA fa-flag-checkered (white on pink bg)
  const f = "#fff";
  return (
    <svg viewBox="0 0 448 512" style={ICON_STYLE} fill={f}>
      {/* pole */}
      <rect x="0" y="0" width="32" height="512" rx="16" />
      {/* flag body with checkered cutouts — matching FA path */}
      <clipPath id="fg">
        <path d="M32 0 H416 Q400 64 416 128 Q432 192 416 256 H32 Z" />
      </clipPath>
      <g clipPath="url(#fg)">
        {/* row 0 */}
        <rect x="32" y="0" width="96" height="64" />
        <rect x="224" y="0" width="96" height="64" />
        {/* row 1 */}
        <rect x="128" y="64" width="96" height="64" />
        <rect x="320" y="64" width="96" height="64" />
        {/* row 2 */}
        <rect x="32" y="128" width="96" height="64" />
        <rect x="224" y="128" width="96" height="64" />
        {/* row 3 */}
        <rect x="128" y="192" width="96" height="64" />
        <rect x="320" y="192" width="96" height="64" />
      </g>
    </svg>
  );
}

function IconCoffee({ ink }: { ink: string }) {
  return (
    <svg viewBox="0 0 28 28" style={ICON_STYLE} fill="none">
      <path d="M10 6 Q11 3 10 1" stroke={ink} strokeWidth="1.5" strokeLinecap="round" />
      <path d="M15 6 Q16 3 15 1" stroke={ink} strokeWidth="1.5" strokeLinecap="round" />
      <path d="M4 9 H20 L18 24 H6 Z" fill="#fff" stroke={ink} strokeWidth="2.5" strokeLinejoin="round" />
      <path d="M20 12 Q26 12 26 17 Q26 22 20 22" stroke={ink} strokeWidth="2.5" fill="none" strokeLinecap="round" />
      <rect x="7" y="14" width="10" height="4" rx="1" fill={ink} opacity="0.2" />
    </svg>
  );
}

function IconSearch({ ink }: { ink: string }) {
  return (
    <svg viewBox="0 0 28 28" style={ICON_STYLE} fill="none">
      <circle cx="12" cy="12" r="8" stroke={ink} strokeWidth="2.5" fill="#fff" />
      <circle cx="10" cy="10" r="2" fill={ink} opacity="0.15" />
      <line x1="18" y1="18" x2="25" y2="25" stroke={ink} strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}

function IconRocket({ ink }: { ink: string }) {
  return (
    <svg viewBox="0 0 28 28" style={ICON_STYLE} fill="none">
      <path d="M14 2 Q22 8 22 18 L18 22 H10 L6 18 Q6 8 14 2Z" fill="#fff" stroke={ink} strokeWidth="2.5" strokeLinejoin="round" />
      <circle cx="14" cy="12" r="3" fill={ink} opacity="0.25" stroke={ink} strokeWidth="1.5" />
      <path d="M6 18 L3 24 L10 22" fill={ink} stroke={ink} strokeWidth="1.5" strokeLinejoin="round" />
      <path d="M22 18 L25 24 L18 22" fill={ink} stroke={ink} strokeWidth="1.5" strokeLinejoin="round" />
      <path d="M11 22 Q14 28 17 22" fill={ink} opacity="0.3" />
    </svg>
  );
}

/* ── Corner definitions ── */
const CORNER_IDX = [0, N - 1, 2 * (N - 1), 3 * (N - 1)] as const; // 0,6,12,18

interface CornerDef {
  label: string;
  icon: React.FC;
  color: string;
}

function buildCornerMeta(dp: DerivedPopPalette): Record<number, CornerDef> {
  const ink = dp.lightInk;
  return {
    [CORNER_IDX[0]]: { label: "起点", icon: () => <IconFlag />,      color: dp.primary },
    [CORNER_IDX[1]]: { label: "休息", icon: () => <IconCoffee ink={ink} />, color: dp.tertiary },
    [CORNER_IDX[2]]: { label: "发现", icon: () => <IconSearch ink={ink} />, color: dp.secondary },
    [CORNER_IDX[3]]: { label: "传送", icon: () => <IconRocket ink={ink} />, color: dp.quad },
  };
}

/* ── Pattern cell indices (decorative breaks) ── */
const PATTERN_IDX = new Set([3, 15]);

/** Clockwise edge path: top → right → bottom(rev) → left(rev) = 24 cells */
function buildEdgePath(): Array<[number, number]> {
  const p: Array<[number, number]> = [];
  for (let c = 0; c < N; c++) p.push([0, c]);
  for (let r = 1; r < N; r++) p.push([r, N - 1]);
  for (let c = N - 2; c >= 0; c--) p.push([N - 1, c]);
  for (let r = N - 2; r >= 1; r--) p.push([r, 0]);
  return p;
}

const EDGE_PATH = buildEdgePath();

function buildStarburstBg(yellow: string): string {
  return Array.from({ length: 12 }, (_, i) => {
    const a = i * 30;
    return `${yellow}40 ${a}deg ${a + 15}deg, transparent ${a + 15}deg ${a + 30}deg`;
  }).join(", ");
}

/* ── Scatter slot type & defaults ── */
interface ScatterSlot {
  x: number; // left %
  y: number; // top %
  rot: number; // degrees
  w: number; // px (at intrinsic 800×800)
}

const DEFAULT_SCATTER: ScatterSlot[] = [
  { x: 39, y: 8, rot: -14, w: 105 },
  { x: 43, y: 77, rot: 10, w: 95 },
  { x: 79, y: 41, rot: 20, w: 95 },
  { x: 3, y: 45, rot: -12, w: 100 },
  { x: 8, y: 69, rot: 16, w: 90 },
  { x: 4, y: 19, rot: -18, w: 100 },
  { x: 72, y: 66, rot: 8, w: 88 },
  { x: 74, y: 16, rot: -15, w: 92 },
];

/* ── Component ── */
function PopBoardPoster({ cityEntries, posterWidth: PW, posterHeight: PH }: PosterModuleProps) {
  const ref = useRef<HTMLDivElement>(null);
  const centerRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);
  const mode = useMapStore((s) => s.popBoardMode);
  const popBoardHue = useMapStore((s) => s.popBoardHue);
  const dp = useMemo(() => derivePopBoardPalette(popBoardHue), [popBoardHue]);
  const C = { pink: dp.primary, yellow: dp.secondary, blue: dp.tertiary, mint: dp.quad, orange: dp.quinary };
  const INK = dp.ink;
  const CELL_PALETTE = useMemo(() => [C.pink, C.yellow, "#fff", C.mint, C.orange, "#fff"], [C.pink, C.yellow, C.mint, C.orange]);
  const CORNER_META = useMemo(() => buildCornerMeta(dp), [dp]);
  const STARBURST_BG = useMemo(() => buildStarburstBg(C.yellow), [C.yellow]);
  const [slots, setSlots] = useState<ScatterSlot[]>(DEFAULT_SCATTER);

  /* Drag state (kept in ref to avoid re-renders during move) */
  const dragRef = useRef<{
    idx: number;
    startX: number;
    startY: number;
    origX: number;
    origY: number;
  } | null>(null);

  const measure = useCallback(() => {
    const el = ref.current;
    if (!el) return;
    const pad = 48;
    setScale(
      Math.min(
        (el.clientWidth - pad) / PW,
        (el.clientHeight - pad) / PH,
        1,
      ),
    );
  }, [PW, PH]);

  useEffect(() => {
    measure();
    const ro = new ResizeObserver(measure);
    if (ref.current) ro.observe(ref.current);
    return () => ro.disconnect();
  }, [measure]);

  const cities = useMemo(
    () => [...cityEntries].sort((a, b) => b.count - a.count),
    [cityEntries],
  );

  const totalVisits = useMemo(
    () => cityEntries.reduce((s, c) => s + c.count, 0),
    [cityEntries],
  );

  const centerCovers = useMemo(
    () =>
      cities
        .flatMap((c) =>
          c.covers[0] ? [{ src: coverSrc(c.covers[0]), name: c.name }] : [],
        )
        .slice(0, DEFAULT_SCATTER.length),
    [cities],
  );

  const cellMap = useMemo(() => {
    let ci = 0;
    return EDGE_PATH.map(([row, col], idx) => {
      const corner = CORNER_META[idx];
      const isPattern = PATTERN_IDX.has(idx);
      const city =
        !corner && !isPattern && ci < cities.length ? cities[ci++] : null;
      const cover = city?.covers[0] ? coverSrc(city.covers[0]) : "";
      const bgColor = corner
        ? corner.color
        : isPattern
          ? "#fff"
          : CELL_PALETTE[idx % CELL_PALETTE.length];
      return { row, col, idx, corner, isPattern, city, cover, bgColor };
    });
  }, [cities, CORNER_META, CELL_PALETTE]);

  /* ── Drag handlers ── */
  const onPointerDown = useCallback(
    (e: React.PointerEvent, idx: number) => {
      if (mode !== "center") return;
      e.preventDefault();
      e.stopPropagation();
      (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
      dragRef.current = {
        idx,
        startX: e.clientX,
        startY: e.clientY,
        origX: slots[idx].x,
        origY: slots[idx].y,
      };
    },
    [mode, slots],
  );

  const onPointerMove = useCallback((e: React.PointerEvent) => {
    const d = dragRef.current;
    const el = centerRef.current;
    if (!d || !el) return;
    const rect = el.getBoundingClientRect();
    const dx = ((e.clientX - d.startX) / rect.width) * 100;
    const dy = ((e.clientY - d.startY) / rect.height) * 100;
    setSlots((prev) =>
      prev.map((s, i) =>
        i === d.idx
          ? {
              ...s,
              x: Math.round(Math.max(-5, Math.min(88, d.origX + dx))),
              y: Math.round(Math.max(-5, Math.min(88, d.origY + dy))),
            }
          : s,
      ),
    );
  }, []);

  const onPointerUp = useCallback(() => {
    dragRef.current = null;
  }, []);


  return (
    <div
      ref={ref}
      className="absolute inset-0 flex items-center justify-center overflow-hidden pointer-events-none"
    >
      <div style={{ transform: `scale(${scale})`, transformOrigin: "center" }}>
        <div
          data-poster-export
          style={{
            width: PW,
            height: PH,
            backgroundColor: dp.bg,
            padding: PAD,
            boxSizing: "border-box",
            fontFamily: '"ZCOOL KuaiLe", system-ui, -apple-system, sans-serif',
            position: "relative",
            overflow: "hidden",
          }}
        >
          <div
            style={{
              display: "grid",
              gridTemplateColumns: `repeat(${N}, 1fr)`,
              gridTemplateRows: `repeat(${N}, 1fr)`,
              gap: GAP,
              width: "100%",
              height: "100%",
            }}
          >
            {/* ── Edge cells ── */}
            {cellMap.map((cell) => (
              <div
                key={cell.idx}
                style={{
                  gridColumn: cell.col + 1,
                  gridRow: cell.row + 1,
                  backgroundColor: cell.bgColor,
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                  padding: cell.corner ? 6 : 4,
                  position: "relative",
                  overflow: "hidden",
                  ...(cell.isPattern
                    ? {
                        backgroundImage: `linear-gradient(45deg, ${C.pink} 25%, transparent 25%), linear-gradient(-45deg, ${C.pink} 25%, transparent 25%), linear-gradient(45deg, transparent 75%, ${C.pink} 75%), linear-gradient(-45deg, transparent 75%, ${C.pink} 75%)`,
                        backgroundSize: "16px 16px",
                        backgroundPosition: "0 0, 0 8px, 8px -8px, -8px 0",
                      }
                    : {}),
                }}
              >
                {cell.corner ? (
                  <>
                    <cell.corner.icon />
                    <div
                      style={{
                        fontSize: 14,
                        fontWeight: 900,
                        color: "#fff",
                        textShadow:
                          `1px 1px 0 ${INK}, -1px -1px 0 ${INK}, 1px -1px 0 ${INK}, -1px 1px 0 ${INK}`,
                        marginTop: 2,
                      }}
                    >
                      {cell.corner.label}
                    </div>
                  </>
                ) : cell.isPattern ? null : cell.city ? (
                  (() => {
                    const showCover = mode === "cells" && !!cell.cover;
                    return (
                      <>
                        {showCover && (
                          <>
                            <img
                              src={cell.cover}
                              style={{
                                position: "absolute",
                                inset: 0,
                                width: "100%",
                                height: "100%",
                                objectFit: "cover",
                              }}
                            />
                            <div
                              style={{
                                position: "absolute",
                                inset: 0,
                                background:
                                  "linear-gradient(to top, rgba(0,0,0,0.75) 0%, rgba(0,0,0,0.1) 60%)",
                              }}
                            />
                          </>
                        )}
                        <div
                          style={{
                            position: "relative",
                            zIndex: 1,
                            fontSize: 15,
                            fontWeight: 900,
                            color: showCover ? "#fff" : INK,
                            lineHeight: 1.1,
                            textAlign: "center",
                            whiteSpace: "nowrap",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            maxWidth: "100%",
                            ...(showCover
                              ? {
                                  textShadow:
                                    `1px 1px 0 ${INK}, -1px -1px 0 ${INK}, 1px -1px 0 ${INK}, -1px 1px 0 ${INK}`,
                                }
                              : {}),
                          }}
                        >
                          {cell.city.name}
                        </div>
                        <div
                          style={{
                            position: "relative",
                            zIndex: 1,
                            fontSize: 11,
                            fontWeight: 700,
                            color: "#fff",
                            backgroundColor: showCover
                              ? "rgba(0,0,0,0.5)"
                              : INK,
                            padding: "0 5px",
                            borderRadius: 2,
                            marginTop: 2,
                          }}
                        >
                          ×{cell.city.count}
                        </div>
                      </>
                    );
                  })()
                ) : (
                  <div
                    style={{
                      width: "100%",
                      height: "100%",
                      opacity: 0.15,
                      background:
                        `repeating-linear-gradient(45deg, ${INK}, ${INK} 2px, transparent 2px, transparent 8px)`,
                    }}
                  />
                )}
                {!cell.corner && !cell.isPattern && cell.city && (
                  <div
                    style={{
                      position: "absolute",
                      top: 3,
                      left: 3,
                      width: 5,
                      height: 5,
                      borderRadius: "50%",
                      border: `1.5px solid ${INK}`,
                      backgroundColor: "#fff",
                      opacity: 0.5,
                    }}
                  />
                )}
              </div>
            ))}

            {/* ── Center area (5×5) ── */}
            <div
              ref={centerRef}
              style={{
                gridColumn: "2 / 7",
                gridRow: "2 / 7",
                position: "relative",
                overflow: "hidden",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                background:
                  "repeating-linear-gradient(45deg, #fff, #fff 20px, #f0f0f0 20px, #f0f0f0 40px)",
              }}
            >
              {/* Starburst */}
              <div
                style={{
                  position: "absolute",
                  top: "-50%",
                  left: "-50%",
                  width: "200%",
                  height: "200%",
                  background: `conic-gradient(${STARBURST_BG})`,
                }}
              />

              {/* ── Scattered photo stickers (center mode) ── */}
              {mode === "center" &&
                centerCovers.map((photo, i) => {
                  const slot = slots[i];
                  return (
                    <div
                      key={i}
                      onPointerDown={(e) => onPointerDown(e, i)}
                      onPointerMove={onPointerMove}
                      onPointerUp={onPointerUp}
                      style={{
                        position: "absolute",
                        left: `${slot.x}%`,
                        top: `${slot.y}%`,
                        width: slot.w,
                        height: slot.w * 0.75,
                        transform: `rotate(${slot.rot}deg)`,
                        zIndex: dragRef.current?.idx === i ? 5 : 1,
                        backgroundColor: "#fff",
                        border: `4px solid ${INK}`,
                        boxShadow: `5px 5px 0 0 ${INK}`,
                        padding: 4,
                        boxSizing: "border-box",
                        cursor: "grab",
                        pointerEvents: "auto",
                        touchAction: "none",
                        userSelect: "none",
                      }}
                    >
                      <img
                        src={photo.src}
                        draggable={false}
                        style={{
                          width: "100%",
                          height: "100%",
                          objectFit: "cover",
                          display: "block",
                          pointerEvents: "none",
                        }}
                      />
                      <div
                        style={{
                          position: "absolute",
                          bottom: -10,
                          left: "50%",
                          transform: "translateX(-50%)",
                          backgroundColor: C.yellow,
                          border: `2px solid ${INK}`,
                          boxShadow: `2px 2px 0 0 ${INK}`,
                          padding: "1px 8px",
                          fontSize: 10,
                          fontWeight: 900,
                          whiteSpace: "nowrap",
                          pointerEvents: "none",
                        }}
                      >
                        {photo.name}
                      </div>
                    </div>
                  );
                })}

              {/* Center content group */}
              <div
                style={{
                  position: "relative",
                  zIndex: 2,
                  textAlign: "center",
                }}
              >
                {/* Title banner */}
                <div
                  style={{
                    transform: "rotate(-6deg)",
                    backgroundColor: C.pink,
                    padding: "14px 32px",
                    border: `4px solid ${INK}`,
                    boxShadow: `6px 6px 0 0 ${INK}`,
                    marginBottom: 14,
                    display: "inline-block",
                  }}
                >
                  <div
                    style={{
                      fontSize: 42,
                      fontWeight: 900,
                      color: "#fff",
                      textShadow: `3px 3px 0 ${INK}`,
                      WebkitTextStroke: `2px ${INK}`,
                      letterSpacing: 4,
                    }}
                  >
                    旅行棋盘
                  </div>
                </div>

                {/* Stats pills */}
                <div
                  style={{
                    display: "flex",
                    gap: 10,
                    justifyContent: "center",
                  }}
                >
                  <div
                    style={{
                      backgroundColor: "#fff",
                      border: `3px solid ${INK}`,
                      boxShadow: `3px 3px 0 0 ${INK}`,
                      borderRadius: 999,
                      padding: "4px 14px",
                      transform: "rotate(3deg)",
                    }}
                  >
                    <span
                      style={{
                        fontSize: 14,
                        fontWeight: 700,
                        letterSpacing: 2,
                      }}
                    >
                      {cityEntries.length} 座城市
                    </span>
                  </div>
                  <div
                    style={{
                      backgroundColor: C.yellow,
                      border: `3px solid ${INK}`,
                      boxShadow: `3px 3px 0 0 ${INK}`,
                      borderRadius: 999,
                      padding: "4px 14px",
                      transform: "rotate(-2deg)",
                    }}
                  >
                    <span
                      style={{
                        fontSize: 14,
                        fontWeight: 700,
                        letterSpacing: 2,
                      }}
                    >
                      {totalVisits} 次足迹
                    </span>
                  </div>
                </div>
              </div>

              {/* ── Floating decorations ── */}

              {/* Smiley face */}
              <div
                style={{
                  position: "absolute",
                  top: 16,
                  right: 24,
                  width: 48,
                  height: 48,
                  borderRadius: "50%",
                  backgroundColor: C.yellow,
                  border: `3px solid ${INK}`,
                  boxShadow: `3px 3px 0 0 ${INK}`,
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                  zIndex: 3,
                }}
              >
                <div style={{ display: "flex", gap: 6, marginBottom: 2 }}>
                  <div
                    style={{
                      width: 5,
                      height: 7,
                      backgroundColor: INK,
                      borderRadius: "50%",
                    }}
                  />
                  <div
                    style={{
                      width: 5,
                      height: 7,
                      backgroundColor: INK,
                      borderRadius: "50%",
                    }}
                  />
                </div>
                <div
                  style={{
                    width: 16,
                    height: 8,
                    borderBottom: `3px solid ${INK}`,
                    borderRadius: "0 0 50% 50%",
                  }}
                />
              </div>

              {/* Radio */}
              <div
                style={{
                  position: "absolute",
                  top: 16,
                  left: 16,
                  backgroundColor: C.orange,
                  border: `3px solid ${INK}`,
                  boxShadow: `3px 3px 0 0 ${INK}`,
                  padding: 6,
                  transform: "rotate(-12deg)",
                  width: 72,
                  zIndex: 3,
                }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    marginBottom: 4,
                  }}
                >
                  <div
                    style={{
                      width: 10,
                      height: 10,
                      borderRadius: "50%",
                      border: `2px solid ${INK}`,
                      backgroundColor: "#fff",
                    }}
                  />
                  <div
                    style={{
                      width: 30,
                      height: 6,
                      border: `2px solid ${INK}`,
                      backgroundColor: "#fff",
                      marginTop: 2,
                    }}
                  />
                </div>
                <div
                  style={{
                    display: "flex",
                    gap: 4,
                    justifyContent: "center",
                  }}
                >
                  {[0, 1].map((i) => (
                    <div
                      key={i}
                      style={{
                        width: 20,
                        height: 20,
                        borderRadius: "50%",
                        border: `3px solid ${INK}`,
                        backgroundColor: "#fff",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      <div
                        style={{
                          width: 5,
                          height: 5,
                          backgroundColor: INK,
                          borderRadius: "50%",
                        }}
                      />
                    </div>
                  ))}
                </div>
              </div>

              {/* Dice */}
              <div
                style={{
                  position: "absolute",
                  bottom: 20,
                  left: 24,
                  width: 36,
                  height: 36,
                  backgroundColor: "#fff",
                  border: `3px solid ${INK}`,
                  boxShadow: `3px 3px 0 0 ${INK}`,
                  transform: "rotate(15deg)",
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gridTemplateRows: "1fr 1fr",
                  padding: 4,
                  zIndex: 3,
                }}
              >
                {[0, 1, 2, 3].map((i) => (
                  <div
                    key={i}
                    style={{
                      width: 7,
                      height: 7,
                      backgroundColor: INK,
                      borderRadius: "50%",
                      margin: "auto",
                    }}
                  />
                ))}
              </div>

              {/* "Good Time!" sticker */}
              <div
                style={{
                  position: "absolute",
                  bottom: 16,
                  right: 16,
                  backgroundColor: C.blue,
                  color: "#fff",
                  fontWeight: 900,
                  fontSize: 13,
                  padding: "3px 10px",
                  border: `3px solid ${INK}`,
                  boxShadow: `3px 3px 0 0 ${INK}`,
                  transform: "rotate(-6deg)",
                  textShadow: `1px 1px 0 ${INK}`,
                  zIndex: 3,
                }}
              >
                Good Time!
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Bottom toolbar ── */}
    </div>
  );
}

export default PopBoardPoster;
