import { useMemo, useRef, useState, useEffect, useCallback } from "react";
import type { PosterModuleProps } from "../../lib/poster-modules";
import { useMapStore } from "../../stores/useMapStore";

/* ── Base design dimensions (for proportional scaling) ── */
const BASE_W = 1100;
const BASE_KB_W = 920;

/* ── Keyboard layout (shared, 60-column grid) ── */
interface KeyDef { l: string; w: number; type?: "mod" | "accent" | "cmd" | "space" }

const KB: KeyDef[][] = [
  [{ l: "esc", w: 4, type: "mod" },{ l: "1", w: 4 },{ l: "2", w: 4 },{ l: "3", w: 4 },{ l: "4", w: 4 },{ l: "5", w: 4 },{ l: "6", w: 4 },{ l: "7", w: 4 },{ l: "8", w: 4 },{ l: "9", w: 4 },{ l: "0", w: 4 },{ l: "-", w: 4 },{ l: "=", w: 4 },{ l: "delete", w: 8, type: "mod" }],
  [{ l: "tab", w: 6, type: "mod" },{ l: "Q", w: 4 },{ l: "W", w: 4 },{ l: "E", w: 4 },{ l: "R", w: 4 },{ l: "T", w: 4 },{ l: "Y", w: 4 },{ l: "U", w: 4 },{ l: "I", w: 4 },{ l: "O", w: 4 },{ l: "P", w: 4 },{ l: "[", w: 4 },{ l: "]", w: 4 },{ l: "\\", w: 6, type: "mod" }],
  [{ l: "caps", w: 7, type: "mod" },{ l: "A", w: 4 },{ l: "S", w: 4 },{ l: "D", w: 4 },{ l: "F", w: 4 },{ l: "G", w: 4 },{ l: "H", w: 4 },{ l: "J", w: 4 },{ l: "K", w: 4 },{ l: "L", w: 4 },{ l: ";", w: 4 },{ l: "'", w: 4 },{ l: "return", w: 9, type: "mod" }],
  [{ l: "shift", w: 9, type: "mod" },{ l: "Z", w: 4 },{ l: "X", w: 4 },{ l: "C", w: 4, type: "accent" },{ l: "V", w: 4, type: "accent" },{ l: "B", w: 4 },{ l: "N", w: 4 },{ l: "M", w: 4 },{ l: ",", w: 4 },{ l: ".", w: 4 },{ l: "/", w: 4 },{ l: "shift", w: 11, type: "mod" }],
  [{ l: "ctrl", w: 5, type: "mod" },{ l: "opt", w: 5, type: "mod" },{ l: "\u2318", w: 6, type: "cmd" },{ l: "", w: 23, type: "space" },{ l: "\u2318", w: 6, type: "cmd" },{ l: "opt", w: 5, type: "mod" },{ l: "fn", w: 5, type: "mod" },{ l: "ctrl", w: 5, type: "mod" }],
];

/* ── Palette types ── */
interface Palette {
  surface: string;
  shadow: string;
  caps: string[];
  bases: string[];
}

/* ── Theme presets ── */
interface ThemePreset {
  id: string;
  label: string;
  /** "flat" = box-shadow extrusion, "rounded" = 3D front+top */
  style: "flat" | "rounded";
  posterBg: string;
  textColor: string;
  subtitleColor: string;
  tagBg: string;
  tagColor: string;
  kbContainerBg: string;
  palette: Palette;
  accentColor: string;
}

export const KEYBOARD_THEMES: ThemePreset[] = [
  {
    id: "flat-pop",
    label: "Pop",
    style: "flat",
    posterBg: "#FAFAF8",
    textColor: "#1a1a1a",
    subtitleColor: "#999",
    tagBg: "#F0EFEC",
    tagColor: "#555",
    kbContainerBg: "rgba(255,255,255,0.6)",
    palette: {
      surface: "#f3ead8",
      shadow: "#181818",
      caps: ["#f47ea5", "#f56c2d", "#2465e3", "#f4d03f"],
      bases: ["#e92f2f", "#f4d03f", "#2465e3"],
    },
    accentColor: "#f56c2d",
  },
  {
    id: "flat-cyber",
    label: "Cyber",
    style: "flat",
    posterBg: "#0f0f13",
    textColor: "#f0f0f0",
    subtitleColor: "#666",
    tagBg: "rgba(255,255,255,0.08)",
    tagColor: "#aaa",
    kbContainerBg: "rgba(255,255,255,0.04)",
    palette: {
      surface: "#2d2d3d",
      shadow: "#000000",
      caps: ["#00ff9f", "#00b8ff", "#ff007f", "#ffe600"],
      bases: ["#7000ff", "#ff007f", "#00b8ff"],
    },
    accentColor: "#00ff9f",
  },
  {
    id: "flat-pastel",
    label: "Pastel",
    style: "flat",
    posterBg: "#F5F0F8",
    textColor: "#2a2a3a",
    subtitleColor: "#999",
    tagBg: "#EDE8F2",
    tagColor: "#666",
    kbContainerBg: "rgba(255,255,255,0.7)",
    palette: {
      surface: "#ffffff",
      shadow: "#a2a8b3",
      caps: ["#ffb3ba", "#ffdfba", "#ffffba", "#baffc9", "#bae1ff"],
      bases: ["#ffb3ba", "#bae1ff", "#ffdfba"],
    },
    accentColor: "#ffb3ba",
  },
  {
    id: "round-pop",
    label: "Retro Pop",
    style: "rounded",
    posterBg: "#1a4fd6",
    textColor: "#ffffff",
    subtitleColor: "rgba(255,255,255,0.5)",
    tagBg: "rgba(255,255,255,0.15)",
    tagColor: "rgba(255,255,255,0.8)",
    kbContainerBg: "rgba(255,255,255,0.08)",
    palette: {
      surface: "#faf3e0",
      shadow: "#1a1a2e",
      caps: ["#f26522", "#f5a0b8", "#2a5cc7", "#f7c948", "#2d936c", "#e63946"],
      bases: ["#e63946", "#f7c948", "#2a5cc7"],
    },
    accentColor: "#f7c948",
  },
  {
    id: "round-mono",
    label: "Mono",
    style: "rounded",
    posterBg: "#1a1a1a",
    textColor: "#e8e8e8",
    subtitleColor: "#666",
    tagBg: "rgba(255,255,255,0.08)",
    tagColor: "#888",
    kbContainerBg: "rgba(255,255,255,0.04)",
    palette: {
      surface: "#ddd",
      shadow: "#222",
      caps: ["#555", "#999", "#bbb", "#666", "#777"],
      bases: ["#333", "#555", "#444"],
    },
    accentColor: "#999",
  },
  {
    id: "round-pastel",
    label: "Soft",
    style: "rounded",
    posterBg: "#e8d8f0",
    textColor: "#2a2040",
    subtitleColor: "#8a7a9a",
    tagBg: "rgba(255,255,255,0.5)",
    tagColor: "#5a4a6a",
    kbContainerBg: "rgba(255,255,255,0.3)",
    palette: {
      surface: "#fff",
      shadow: "#6c5b7b",
      caps: ["#ffb3a7", "#ffd1dc", "#a8d8ea", "#fff5ba", "#b5ead7", "#ff9a9e"],
      bases: ["#ffb3a7", "#a8d8ea", "#ffd1dc"],
    },
    accentColor: "#a8d8ea",
  },
];

/* ── Helpers ── */
function seededRng(seed: number) {
  let s = seed;
  return () => { s = (s * 16807) % 2147483647; return (s - 1) / 2147483646; };
}

function hexDarken(hex: string, factor: number) {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgb(${(r * factor) | 0},${(g * factor) | 0},${(b * factor) | 0})`;
}

function luminance(hex: string) {
  return parseInt(hex.slice(1, 3), 16) * 0.299 +
    parseInt(hex.slice(3, 5), 16) * 0.587 +
    parseInt(hex.slice(5, 7), 16) * 0.114;
}

/* ── Perspective projection (replaces CSS 3D transforms) ──
 *
 * Equivalent to: perspective(1200px) rotateX(42deg) scale(0.72)
 * with transform-origin at center-bottom of the keyboard.
 *
 * By computing the projection in JS and rendering as SVG polygons,
 * the keyboard looks identical in both browser preview and
 * modern-screenshot export (which cannot handle CSS 3D transforms).
 */
const PERSP_D = 1200;
const ROT_RAD = 42 * Math.PI / 180;
const COS_R = Math.cos(ROT_RAD);
const SIN_R = Math.sin(ROT_RAD);
const KB_SCALE = 0.72;
const BOTTOM_OFFSET = 30; // keyboard extends 30px below poster bottom

/* ── SVG key data ── */
interface SvgKey {
  layers: { p: string; f: string }[];
  label: string;
  lx: number; ly: number;
  fs: number;
  tc: string;
  ta: "middle" | "start";
  db: "central" | "auto";
}

/* ── Main Component ── */

function KeyboardPoster({ items, cityEntries, posterWidth, posterHeight }: PosterModuleProps) {
  const W = posterWidth;
  const H = posterHeight;

  const kbW = Math.round(W * (BASE_KB_W / BASE_W));
  const kbRatio = kbW / BASE_KB_W;
  const kbGap = Math.round(8 * kbRatio);
  const kH = Math.round(48 * kbRatio);

  const containerRef = useRef<HTMLDivElement>(null);
  const [fitScale, setFitScale] = useState(1);
  const themeIdx = useMapStore((s) => s.keyboardThemeIdx);
  const theme = KEYBOARD_THEMES[themeIdx % KEYBOARD_THEMES.length];

  const measure = useCallback(() => {
    const el = containerRef.current;
    if (!el) return;
    const pad = 48;
    setFitScale(Math.min((el.clientWidth - pad) / W, (el.clientHeight - pad) / H, 1));
  }, [W, H]);

  useEffect(() => {
    measure();
    const ro = new ResizeObserver(measure);
    if (containerRef.current) ro.observe(containerRef.current);
    return () => ro.disconnect();
  }, [measure]);

  const cityCount = cityEntries.length;
  const totalItems = items.length;
  const topCity = cityEntries[0]?.name ?? "";
  const topCities = cityEntries.slice(0, 4).map((c) => c.name);

  const keyColors = useMemo(() => {
    const rng = seededRng(cityCount * 31 + totalItems + 42);
    return KB.map((row) =>
      row.map(() => ({
        cap: theme.palette.caps[Math.floor(rng() * theme.palette.caps.length)],
        base: theme.palette.bases[Math.floor(rng() * theme.palette.bases.length)],
      })),
    );
  }, [cityCount, totalItems, theme]);

  /* ── Compute projected keyboard as SVG geometry ── */
  const kbSvg = useMemo(() => {
    const pad = Math.round(20 * kbRatio);
    const contentW = kbW - 2 * pad;
    const colW = (contentW - 59 * kbGap) / 60;
    const totalH = 2 * pad + 5 * kH + 4 * kbGap;

    /** Project a point from flat keyboard space → poster space */
    const proj = (kx: number, ky: number): [number, number] => {
      const rx = (kx - kbW / 2) * KB_SCALE;
      const ry = (ky - totalH) * KB_SCALE;
      const yr = ry * COS_R;
      const zr = ry * SIN_R;
      const w = 1 - zr / PERSP_D;
      return [rx / w + W / 2, yr / w + H + BOTTOM_OFFSET];
    };

    /** Corners → SVG polygon points string */
    const pts = (cs: [number, number][]) =>
      cs.map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join(" ");

    /** Perspective scale factor at a given keyboard y */
    const pScale = (ky: number) => {
      const zr = (ky - totalH) * KB_SCALE * SIN_R;
      return KB_SCALE / (1 - zr / PERSP_D);
    };

    // Background quad
    const bg = pts([proj(0, 0), proj(kbW, 0), proj(kbW, totalH), proj(0, totalH)]);

    const keys: SvgKey[] = [];

    for (let ri = 0; ri < KB.length; ri++) {
      let col = 0;
      for (let ki = 0; ki < KB[ri].length; ki++) {
        const kd = KB[ri][ki];
        const cc = keyColors[ri][ki];
        const kx = pad + col * (colW + kbGap);
        const ky = pad + ri * (kH + kbGap);
        const kw = kd.w * colW + (kd.w - 1) * kbGap;
        col += kd.w;

        const big = (kd.w === 4 && kd.l.length === 1 && !kd.type) || kd.type === "accent";
        const layers: { p: string; f: string }[] = [];

        if (theme.style === "flat") {
          /* ── Flat style: layered extrusion ──
           * Draw back to front: shadow(14px) → base(8px) → surface → cap-shadow(4px) → cap
           * Each layer covers its predecessor, leaving only the edge band visible.
           */
          // Shadow extrusion (offset -14, +14 in flat keyboard space)
          layers.push({ p: pts([proj(kx-14,ky+14), proj(kx+kw-14,ky+14), proj(kx+kw-14,ky+kH+14), proj(kx-14,ky+kH+14)]), f: theme.palette.shadow });
          // Base extrusion (offset -8, +8)
          layers.push({ p: pts([proj(kx-8,ky+8), proj(kx+kw-8,ky+8), proj(kx+kw-8,ky+kH+8), proj(kx-8,ky+kH+8)]), f: cc.base });
          // Surface
          layers.push({ p: pts([proj(kx,ky), proj(kx+kw,ky), proj(kx+kw,ky+kH), proj(kx,ky+kH)]), f: theme.palette.surface });
          // Cap shadow (4px offset from cap edges)
          layers.push({ p: pts([proj(kx+3,ky+7), proj(kx+kw-7,ky+7), proj(kx+kw-7,ky+kH-3), proj(kx+3,ky+kH-3)]), f: theme.palette.shadow });
          // Cap face
          const capC: [number, number][] = [proj(kx+7,ky+3), proj(kx+kw-3,ky+3), proj(kx+kw-3,ky+kH-7), proj(kx+7,ky+kH-7)];
          layers.push({ p: pts(capC), f: cc.cap });

          const s = pScale(ky + kH / 2);
          const fs = (big ? 22 : 8) * s;
          const tc = theme.palette.shadow;
          let lx: number, ly: number;
          let ta: "middle" | "start", db: "central" | "auto";

          if (big) {
            lx = capC.reduce((a, p) => a + p[0], 0) / 4;
            ly = capC.reduce((a, p) => a + p[1], 0) / 4;
            ta = "middle"; db = "central";
          } else {
            [lx, ly] = proj(kx + 12, ky + kH - 10);
            ta = "start"; db = "auto";
          }

          keys.push({ layers, label: big ? kd.l.toUpperCase() : kd.l.toLowerCase(), lx, ly, fs, tc, ta, db });
        } else {
          /* ── Rounded style: shadow → front face → top face ── */
          const depth = 7;

          // Drop shadow
          layers.push({ p: pts([proj(kx+3,ky+kH-depth-2), proj(kx+kw+3,ky+kH-depth-2), proj(kx+kw+3,ky+kH+2), proj(kx-3,ky+kH+2)]), f: "rgba(0,0,0,0.35)" });
          // Front face
          const fc = hexDarken(cc.cap, 0.72);
          layers.push({ p: pts([proj(kx,ky+kH-depth-5), proj(kx+kw,ky+kH-depth-5), proj(kx+kw,ky+kH), proj(kx,ky+kH)]), f: fc });
          // Top face
          const topC: [number, number][] = [proj(kx,ky), proj(kx+kw,ky), proj(kx+kw,ky+kH-depth), proj(kx,ky+kH-depth)];
          layers.push({ p: pts(topC), f: cc.cap });

          const tc = luminance(cc.cap) < 128 ? "#faf3e0" : "#1a1a2e";
          const s = pScale(ky + (kH - depth) / 2);
          const fs = (big ? 20 : 8) * s;
          let lx: number, ly: number;
          let ta: "middle" | "start", db: "central" | "auto";

          if (big) {
            lx = topC.reduce((a, p) => a + p[0], 0) / 4;
            ly = topC.reduce((a, p) => a + p[1], 0) / 4;
            ta = "middle"; db = "central";
          } else {
            [lx, ly] = proj(kx + 5, ky + kH - depth - 3);
            ta = "start"; db = "auto";
          }

          keys.push({ layers, label: big ? kd.l.toUpperCase() : kd.l.toLowerCase(), lx, ly, fs, tc, ta, db });
        }
      }
    }

    return { bg, keys };
  }, [kbW, kH, kbGap, kbRatio, W, H, keyColors, theme]);

  return (
    <div
      ref={containerRef}
      className="absolute inset-0 flex items-center justify-center overflow-hidden pointer-events-none"
    >
      <div style={{ transform: `scale(${fitScale})`, transformOrigin: "center" }}>
        <div
          data-poster-export
          style={{
            width: W,
            height: H,
            backgroundColor: theme.posterBg,
            borderRadius: 24,
            overflow: "hidden",
            position: "relative",
            fontFamily: '"Noto Sans SC","PingFang SC",system-ui,sans-serif',
            transition: "background-color 0.4s ease",
          }}
        >
          {/* ── Top: typography ── */}
          <div style={{
            position: "absolute", top: 0, left: 0, right: 0, height: "52%",
            display: "flex", flexDirection: "column", justifyContent: "flex-end",
            padding: "48px 64px 24px", zIndex: 2,
          }}>
            <div style={{
              fontSize: 13, fontWeight: 600, color: theme.subtitleColor,
              letterSpacing: "0.15em", textTransform: "uppercase", marginBottom: 12,
              fontFamily: "ui-sans-serif, system-ui, sans-serif",
            }}>
              {cityCount} cities · {totalItems} saved
            </div>

            <h1 style={{
              fontSize: topCity.length > 3 ? 64 : 80,
              fontWeight: 800, color: theme.textColor,
              lineHeight: 1.1, letterSpacing: "-0.02em", margin: 0,
            }}>
              {topCity || "旅行足迹"}
            </h1>

            {topCities.length > 1 && (
              <div style={{ display: "flex", gap: 10, marginTop: 16, flexWrap: "wrap" }}>
                {topCities.slice(1).map((name) => (
                  <span key={name} style={{
                    fontSize: 12, fontWeight: 600, color: theme.tagColor,
                    padding: "4px 12px", backgroundColor: theme.tagBg,
                    borderRadius: 20, letterSpacing: "0.05em",
                  }}>
                    {name}
                  </span>
                ))}
              </div>
            )}

            <div style={{
              width: 48, height: 3, backgroundColor: theme.accentColor,
              borderRadius: 2, marginTop: 20,
            }} />
          </div>

          {/* ── Keyboard: SVG with pre-computed perspective geometry ── */}
          <svg
            style={{ position: "absolute", inset: 0, zIndex: 1 }}
            viewBox={`0 0 ${W} ${H}`}
          >
            {/* Container background */}
            <polygon points={kbSvg.bg} fill={theme.kbContainerBg} />
            {/* Keys (drawn top-row first for correct painter's-algorithm overlap) */}
            {kbSvg.keys.map((k, i) => (
              <g key={i}>
                {k.layers.map((l, li) => (
                  <polygon key={li} points={l.p} fill={l.f} />
                ))}
                {k.label && (
                  <text
                    x={k.lx} y={k.ly}
                    fill={k.tc} fontSize={k.fs}
                    fontWeight={700} letterSpacing="0.05em"
                    fontFamily="ui-sans-serif, system-ui, sans-serif"
                    textAnchor={k.ta} dominantBaseline={k.db}
                  >
                    {k.label}
                  </text>
                )}
              </g>
            ))}
          </svg>

          {/* ── Brand mark ── */}
          <div style={{
            position: "absolute", bottom: 16, left: 64,
            fontSize: 10, fontWeight: 600, color: theme.subtitleColor,
            letterSpacing: "0.2em", zIndex: 3,
          }}>
            METOO
          </div>
        </div>
      </div>
    </div>
  );
}

export default KeyboardPoster;
