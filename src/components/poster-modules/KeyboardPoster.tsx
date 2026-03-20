import { useMemo } from "react";
import { Rect, Text, Line, Group, Shape, Path } from "react-konva";
import type { PosterModuleProps } from "../../lib/poster-modules";
import { KonvaPosterStage } from "../../lib/poster-stage";
import { useMapStore } from "../../stores/useMapStore";
import { generateFigureScene, type AvoidZone } from "../../lib/line-figures";

/* ── Base design dimensions (for proportional scaling) ── */
const BASE_W = 1100;
const BASE_KB_W = 920;

/* ══════════════════════════════════════════════════════
   Keyboard Layouts
   ══════════════════════════════════════════════════════ */

interface KeyDef {
  l: string;
  w: number;
  type?: "mod" | "accent" | "cmd" | "space";
}

/* 5-row layout (desktop & isometric) */
const KB: KeyDef[][] = [
  [{ l: "esc", w: 4, type: "mod" },{ l: "1", w: 4 },{ l: "2", w: 4 },{ l: "3", w: 4 },{ l: "4", w: 4 },{ l: "5", w: 4 },{ l: "6", w: 4 },{ l: "7", w: 4 },{ l: "8", w: 4 },{ l: "9", w: 4 },{ l: "0", w: 4 },{ l: "-", w: 4 },{ l: "=", w: 4 },{ l: "delete", w: 8, type: "mod" }],
  [{ l: "tab", w: 6, type: "mod" },{ l: "Q", w: 4 },{ l: "W", w: 4 },{ l: "E", w: 4 },{ l: "R", w: 4 },{ l: "T", w: 4 },{ l: "Y", w: 4 },{ l: "U", w: 4 },{ l: "I", w: 4 },{ l: "O", w: 4 },{ l: "P", w: 4 },{ l: "[", w: 4 },{ l: "]", w: 4 },{ l: "\\", w: 6, type: "mod" }],
  [{ l: "caps", w: 7, type: "mod" },{ l: "A", w: 4 },{ l: "S", w: 4 },{ l: "D", w: 4 },{ l: "F", w: 4 },{ l: "G", w: 4 },{ l: "H", w: 4 },{ l: "J", w: 4 },{ l: "K", w: 4 },{ l: "L", w: 4 },{ l: ";", w: 4 },{ l: "'", w: 4 },{ l: "return", w: 9, type: "mod" }],
  [{ l: "shift", w: 9, type: "mod" },{ l: "Z", w: 4 },{ l: "X", w: 4 },{ l: "C", w: 4, type: "accent" },{ l: "V", w: 4, type: "accent" },{ l: "B", w: 4 },{ l: "N", w: 4 },{ l: "M", w: 4 },{ l: ",", w: 4 },{ l: ".", w: 4 },{ l: "/", w: 4 },{ l: "shift", w: 11, type: "mod" }],
  [{ l: "ctrl", w: 5, type: "mod" },{ l: "opt", w: 5, type: "mod" },{ l: "\u2318", w: 6, type: "cmd" },{ l: "", w: 23, type: "space" },{ l: "\u2318", w: 6, type: "cmd" },{ l: "opt", w: 5, type: "mod" },{ l: "fn", w: 5, type: "mod" },{ l: "ctrl", w: 5, type: "mod" }],
];

/* 6-row layout (3D perspective — includes F-key row) */
const KB_PERSP: KeyDef[][] = [
  [{l:"esc",w:4,type:"mod"},{l:"F1",w:4},{l:"F2",w:4},{l:"F3",w:4},{l:"F4",w:4},{l:"F5",w:4},{l:"F6",w:4},{l:"F7",w:4},{l:"F8",w:4},{l:"F9",w:4},{l:"F10",w:4},{l:"F11",w:4},{l:"F12",w:4},{l:"del",w:8,type:"mod"}],
  [{l:"`",w:4},{l:"1",w:4},{l:"2",w:4},{l:"3",w:4},{l:"4",w:4},{l:"5",w:4},{l:"6",w:4},{l:"7",w:4},{l:"8",w:4},{l:"9",w:4},{l:"0",w:4},{l:"-",w:4},{l:"=",w:4},{l:"⌫",w:8,type:"mod"}],
  [{l:"tab",w:6,type:"mod"},{l:"Q",w:4},{l:"W",w:4},{l:"E",w:4},{l:"R",w:4},{l:"T",w:4},{l:"Y",w:4},{l:"U",w:4},{l:"I",w:4},{l:"O",w:4},{l:"P",w:4},{l:"[",w:4},{l:"]",w:4},{l:"\\",w:6,type:"mod"}],
  [{l:"caps",w:7,type:"mod"},{l:"A",w:4},{l:"S",w:4},{l:"D",w:4},{l:"F",w:4},{l:"G",w:4},{l:"H",w:4},{l:"J",w:4},{l:"K",w:4},{l:"L",w:4},{l:";",w:4},{l:"'",w:4},{l:"return",w:9,type:"mod"}],
  [{l:"shift",w:9,type:"mod"},{l:"Z",w:4},{l:"X",w:4},{l:"C",w:4,type:"accent"},{l:"V",w:4,type:"accent"},{l:"B",w:4},{l:"N",w:4},{l:"M",w:4},{l:",",w:4},{l:".",w:4},{l:"/",w:4},{l:"shift",w:11,type:"mod"}],
  [{l:"ctrl",w:4,type:"mod"},{l:"opt",w:4,type:"mod"},{l:"alt",w:5,type:"mod"},{l:"⌘",w:5,type:"cmd"},{l:"",w:20,type:"space"},{l:"⌘",w:5,type:"cmd"},{l:"alt",w:5,type:"mod"},{l:"◀",w:4,type:"mod"},{l:"▲▼",w:4,type:"mod"},{l:"▶",w:4,type:"mod"}],
];

/* ══════════════════════════════════════════════════════
   Color Palettes & Style Definitions
   ══════════════════════════════════════════════════════ */

interface Palette {
  surface: string;
  shadow: string;
  caps: string[];
  bases: string[];
}

interface ThemePreset {
  id: string;
  label: string;
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
    id: "flat-pop", label: "Pop", style: "flat",
    posterBg: "#FAFAF8", textColor: "#1a1a1a", subtitleColor: "#999",
    tagBg: "#F0EFEC", tagColor: "#555", kbContainerBg: "rgba(255,255,255,0.6)",
    palette: { surface: "#f3ead8", shadow: "#181818", caps: ["#f47ea5", "#f56c2d", "#2465e3", "#f4d03f"], bases: ["#e92f2f", "#f4d03f", "#2465e3"] },
    accentColor: "#f56c2d",
  },
  {
    id: "flat-cyber", label: "Cyber", style: "flat",
    posterBg: "#0f0f13", textColor: "#f0f0f0", subtitleColor: "#666",
    tagBg: "rgba(255,255,255,0.08)", tagColor: "#aaa", kbContainerBg: "rgba(255,255,255,0.04)",
    palette: { surface: "#2d2d3d", shadow: "#000000", caps: ["#00ff9f", "#00b8ff", "#ff007f", "#ffe600"], bases: ["#7000ff", "#ff007f", "#00b8ff"] },
    accentColor: "#00ff9f",
  },
  {
    id: "flat-pastel", label: "Pastel", style: "flat",
    posterBg: "#F5F0F8", textColor: "#2a2a3a", subtitleColor: "#999",
    tagBg: "#EDE8F2", tagColor: "#666", kbContainerBg: "rgba(255,255,255,0.7)",
    palette: { surface: "#ffffff", shadow: "#a2a8b3", caps: ["#ffb3ba", "#ffdfba", "#ffffba", "#baffc9", "#bae1ff"], bases: ["#ffb3ba", "#bae1ff", "#ffdfba"] },
    accentColor: "#ffb3ba",
  },
  {
    id: "round-pop", label: "Retro Pop", style: "rounded",
    posterBg: "#1a4fd6", textColor: "#ffffff", subtitleColor: "rgba(255,255,255,0.5)",
    tagBg: "rgba(255,255,255,0.15)", tagColor: "rgba(255,255,255,0.8)", kbContainerBg: "rgba(255,255,255,0.08)",
    palette: { surface: "#faf3e0", shadow: "#1a1a2e", caps: ["#f26522", "#f5a0b8", "#2a5cc7", "#f7c948", "#2d936c", "#e63946"], bases: ["#e63946", "#f7c948", "#2a5cc7"] },
    accentColor: "#f7c948",
  },
  {
    id: "round-mono", label: "Mono", style: "rounded",
    posterBg: "#1a1a1a", textColor: "#e8e8e8", subtitleColor: "#666",
    tagBg: "rgba(255,255,255,0.08)", tagColor: "#888", kbContainerBg: "rgba(255,255,255,0.04)",
    palette: { surface: "#ddd", shadow: "#222", caps: ["#555", "#999", "#bbb", "#666", "#777"], bases: ["#333", "#555", "#444"] },
    accentColor: "#999",
  },
  {
    id: "round-pastel", label: "Soft", style: "rounded",
    posterBg: "#e8d8f0", textColor: "#2a2040", subtitleColor: "#8a7a9a",
    tagBg: "rgba(255,255,255,0.5)", tagColor: "#5a4a6a", kbContainerBg: "rgba(255,255,255,0.3)",
    palette: { surface: "#fff", shadow: "#6c5b7b", caps: ["#ffb3a7", "#ffd1dc", "#a8d8ea", "#fff5ba", "#b5ead7", "#ff9a9e"], bases: ["#ffb3a7", "#a8d8ea", "#ffd1dc"] },
    accentColor: "#a8d8ea",
  },
];

/* ── Style definitions (rendering approach) ── */
export const KEYBOARD_STYLES = [
  { id: "persp3d", label: "3D透视" },
  { id: "isometric", label: "等距" },
];

/* ══════════════════════════════════════════════════════
   Shared Helpers
   ══════════════════════════════════════════════════════ */

function seededRng(seed: number) {
  let s = seed;
  return () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

function hexDarken(hex: string, factor: number) {
  if (!hex.startsWith("#")) return hex;
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgb(${(r * factor) | 0},${(g * factor) | 0},${(b * factor) | 0})`;
}

function luminance(hex: string) {
  if (!hex.startsWith("#")) return 128;
  return (
    parseInt(hex.slice(1, 3), 16) * 0.299 +
    parseInt(hex.slice(3, 5), 16) * 0.587 +
    parseInt(hex.slice(5, 7), 16) * 0.114
  );
}

const _mCtx = document.createElement("canvas").getContext("2d")!;
function measureText(text: string, fontSize: number, fontWeight: string, fontFamily: string): number {
  _mCtx.font = `${fontWeight} ${fontSize}px ${fontFamily}`;
  return _mCtx.measureText(text).width;
}

const FONT_UI = "ui-sans-serif, system-ui, sans-serif";
const FONT_CN = "'Noto Sans SC', 'PingFang SC', system-ui, sans-serif";

/* ══════════════════════════════════════════════════════
   Shared: Top Typography Layout
   ══════════════════════════════════════════════════════ */

function useTypographyLayout(
  H: number,
  topCity: string,
  topCities: string[],
  sectionBottomRatio: number,
) {
  return useMemo(() => {
    const padLeft = 64;
    const sectionBottom = H * sectionBottomRatio - 24;
    const titleFS = topCity.length > 3 ? 64 : 80;
    const titleH = titleFS * 1.1;
    const subtitleFS = 13;
    const subtitleH = subtitleFS;
    const accentH = 3;
    const tagFS = 12;
    const tagPadX = 12;
    const tagPadY = 4;
    const tagGap = 10;
    const tagH = tagFS + tagPadY * 2;
    const hasTags = topCities.length > 1;

    const tags = hasTags
      ? (() => {
          let ox = 0;
          return topCities.slice(1).map((name) => {
            const tw = measureText(name, tagFS, "600", FONT_CN);
            const w = tw + tagPadX * 2;
            const x = ox;
            ox += w + tagGap;
            return { name, x, w, h: tagH };
          });
        })()
      : [];

    const accentY = sectionBottom - accentH;
    const tagsY = accentY - 20 - (hasTags ? tagH : 0);
    const titleY = tagsY - (hasTags ? 16 : 0) - titleH;
    const subtitleY = titleY - 12 - subtitleH;

    return { padLeft, subtitleY, subtitleFS, titleY, titleFS, tags, tagsY, accentY, accentH };
  }, [H, topCity, topCities, sectionBottomRatio]);
}

/* ══════════════════════════════════════════════════════
   Shared: Typography + Brand JSX
   ══════════════════════════════════════════════════════ */

function TypographySection({
  layout,
  cityCount,
  totalItems,
  topCity,
  theme,
}: {
  layout: ReturnType<typeof useTypographyLayout>;
  cityCount: number;
  totalItems: number;
  topCity: string;
  theme: ThemePreset;
}) {
  return (
    <>
      <Text
        x={layout.padLeft} y={layout.subtitleY}
        text={`${cityCount} cities \u00B7 ${totalItems} saved`}
        fontSize={layout.subtitleFS} fontStyle="600" fill={theme.subtitleColor}
        letterSpacing={layout.subtitleFS * 0.15} fontFamily={FONT_UI}
      />
      <Text
        x={layout.padLeft} y={layout.titleY}
        text={topCity || "旅行足迹"}
        fontSize={layout.titleFS} fontStyle="800" fill={theme.textColor}
        letterSpacing={layout.titleFS * -0.02} fontFamily={FONT_CN}
      />
      {layout.tags.map((tag) => (
        <Group key={tag.name} x={layout.padLeft + tag.x} y={layout.tagsY}>
          <Rect width={tag.w} height={tag.h} fill={theme.tagBg} cornerRadius={20} />
          <Text x={12} y={4} text={tag.name} fontSize={12} fontStyle="600"
            fill={theme.tagColor} letterSpacing={0.6} fontFamily={FONT_CN} />
        </Group>
      ))}
      <Rect x={layout.padLeft} y={layout.accentY} width={48} height={layout.accentH}
        fill={theme.accentColor} cornerRadius={2} />
    </>
  );
}

/* ══════════════════════════════════════════════════════
   Scattered Line Figures (近大远小)
   ══════════════════════════════════════════════════════ */

const FIGURE_COUNT = 28;

/** Compute normalized (0-100) bounding box from flat polygon points with padding */
function kbBoundsFromPts(pts: number[], W: number, H: number, pad = 3): AvoidZone {
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (let i = 0; i < pts.length; i += 2) {
    minX = Math.min(minX, pts[i]);
    maxX = Math.max(maxX, pts[i]);
    minY = Math.min(minY, pts[i + 1]);
    maxY = Math.max(maxY, pts[i + 1]);
  }
  return {
    x1: Math.max(0, (minX / W) * 100 - pad),
    y1: Math.max(0, (minY / H) * 100 - pad),
    x2: Math.min(100, (maxX / W) * 100 + pad),
    y2: Math.min(100, (maxY / H) * 100 + pad),
  };
}

function ScatteredFigures({
  W, H, seed, figureColor, groundColor, avoidZones,
}: {
  W: number; H: number; seed: number;
  figureColor: string; groundColor: string;
  avoidZones: AvoidZone[];
}) {
  const figures = useMemo(
    () => generateFigureScene(seed, FIGURE_COUNT, avoidZones),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [seed, FIGURE_COUNT, JSON.stringify(avoidZones)],
  );

  const baseScale = W / 1600;

  return (
    <>
      {figures.map((fig, i) => {
        const s = baseScale * fig.scale;
        const fx = (fig.x / 100) * W;
        const fy = (fig.y / 100) * H;
        /* 大气透视：远处人物显著变淡，近处清晰 */
        const atmosOpacity = 0.35 + fig.scale * 0.65;
        /* 线宽随深度递减：近处粗、远处细 */
        const strokeW = 1.4 + fig.scale * 1.6;
        /* 地面接触标记宽度 */
        const groundW = fig.person.shadowW * 0.45;
        return (
          <Group key={i} x={fx} y={fy} scaleX={s} scaleY={s}>
            {/* 地面接触标记 — 脚下短横线锚定人物 */}
            <Line
              points={[-groundW, 0, groundW, 0]}
              stroke={groundColor}
              strokeWidth={1.2}
              opacity={atmosOpacity * 0.5}
              lineCap="round"
            />
            {/* Figure — offset so feet are at origin */}
            <Group offsetX={50} offsetY={fig.person.totalH} opacity={atmosOpacity}>
              {fig.person.fillPaths.map((p, j) => (
                <Path
                  key={`f${j}`}
                  data={p.d}
                  fill={p.fill ? figureColor : undefined}
                  stroke={p.stroke ? figureColor : undefined}
                  strokeWidth={strokeW}
                  lineCap="round"
                  lineJoin="round"
                />
              ))}
              {fig.person.paths.map((p, j) => (
                <Path
                  key={`s${j}`}
                  data={p.d}
                  stroke={figureColor}
                  strokeWidth={strokeW}
                  lineCap="round"
                  lineJoin="round"
                />
              ))}
            </Group>
          </Group>
        );
      })}
    </>
  );
}

function useFigureColors(theme: ThemePreset) {
  const isLight = luminance(theme.posterBg) > 140;
  return useMemo(() => ({
    figureColor: isLight ? "rgb(40,40,38)" : "rgb(210,210,208)",
    groundColor: isLight ? "rgba(0,0,0,0.25)" : "rgba(255,255,255,0.15)",
  }), [isLight]);
}

interface KonvaKey {
  layers: { pts: number[]; fill: string }[];
  label: string;
  lx: number;
  ly: number;
  fs: number;
  tc: string;
  centered: boolean;
  rotation: number;
  keyW: number;
}

/* ══════════════════════════════════════════════════════
   STYLE 1 — 3D Perspective (F-key row, rounded quads)
   ══════════════════════════════════════════════════════ */

const PERSP3D_D = 1400;
const PERSP3D_ROT_RAD = (32 * Math.PI) / 180;
const PERSP3D_COS_R = Math.cos(PERSP3D_ROT_RAD);
const PERSP3D_SIN_R = Math.sin(PERSP3D_ROT_RAD);
const PERSP3D_KB_SCALE = 0.62;
const PERSP3D_BOTTOM_OFFSET = 25;

function drawRoundedQuad(
  ctx: { beginPath(): void; moveTo(x: number, y: number): void; arcTo(x1: number, y1: number, x2: number, y2: number, r: number): void; closePath(): void },
  c: [number, number][],
  radii: [number, number, number, number],
) {
  const midX = (c[0][0] + c[1][0]) / 2;
  const midY = (c[0][1] + c[1][1]) / 2;
  ctx.beginPath(); ctx.moveTo(midX, midY);
  for (let i = 0; i < 4; i++) {
    const ni = (i + 1) % 4;
    const nn = (i + 2) % 4;
    ctx.arcTo(c[ni][0], c[ni][1], c[nn][0], c[nn][1], radii[ni]);
  }
  ctx.closePath();
}

interface Persp3DKeyLayer { corners: [number, number][]; radii: [number, number, number, number]; fill: string; }
interface Persp3DKey { layers: Persp3DKeyLayer[]; label: string; lx: number; ly: number; fs: number; tc: string; centered: boolean; rotation: number; keyW: number; }

function Persp3DContent({ items, cityEntries, posterWidth, posterHeight }: PosterModuleProps) {
  const W = posterWidth;
  const H = posterHeight;

  const kbW = Math.round(W * (BASE_KB_W / BASE_W));
  const kbRatio = kbW / BASE_KB_W;
  const kbGap = Math.round(8 * kbRatio);
  const kH = Math.round(42 * kbRatio);

  const themeIdx = useMapStore((s) => s.keyboardThemeIdx);
  const theme = KEYBOARD_THEMES[themeIdx % KEYBOARD_THEMES.length];

  const cityCount = cityEntries.length;
  const totalItems = items.length;
  const topCity = cityEntries[0]?.name ?? "";
  const topCities = cityEntries.slice(0, 4).map((c) => c.name);

  const keyColors = useMemo(() => {
    const rng = seededRng(cityCount * 31 + totalItems + 42);
    return KB_PERSP.map((row) =>
      row.map(() => theme.palette.caps[Math.floor(rng() * theme.palette.caps.length)]),
    );
  }, [cityCount, totalItems, theme]);

  const kbData = useMemo(() => {
    const pad = Math.round(20 * kbRatio);
    const contentW = kbW - 2 * pad;
    const colW = (contentW - 59 * kbGap) / 60;
    const rowCount = KB_PERSP.length;
    const totalH = 2 * pad + rowCount * kH + (rowCount - 1) * kbGap;

    const proj = (kx: number, ky: number): [number, number] => {
      const rx = (kx - kbW / 2) * PERSP3D_KB_SCALE;
      const ry = (ky - totalH) * PERSP3D_KB_SCALE;
      const yr = ry * PERSP3D_COS_R;
      const zr = ry * PERSP3D_SIN_R;
      const w = 1 - zr / PERSP3D_D;
      return [rx / w + W / 2, yr / w + H + PERSP3D_BOTTOM_OFFSET];
    };

    const flat = (cs: [number, number][]) => cs.flatMap(([x, y]) => [x, y]);
    const pScale = (ky: number) => {
      const zr = (ky - totalH) * PERSP3D_KB_SCALE * PERSP3D_SIN_R;
      return PERSP3D_KB_SCALE / (1 - zr / PERSP3D_D);
    };

    const bgPts = flat([proj(0, 0), proj(kbW, 0), proj(kbW, totalH), proj(0, totalH)]);
    const keys: Persp3DKey[] = [];
    const depth = 7;
    const BASE_RADIUS = 7;

    for (let ri = 0; ri < KB_PERSP.length; ri++) {
      let col = 0;
      for (let ki = 0; ki < KB_PERSP[ri].length; ki++) {
        const kd = KB_PERSP[ri][ki];
        const capColor = keyColors[ri][ki];
        const kx = pad + col * (colW + kbGap);
        const ky = pad + ri * (kH + kbGap);
        const kw = kd.w * colW + (kd.w - 1) * kbGap;
        col += kd.w;

        const big = (kd.w === 4 && kd.l.length === 1 && !kd.type) || kd.type === "accent";
        const s = pScale(ky + kH / 2);
        const r = BASE_RADIUS * s;
        const layers: Persp3DKeyLayer[] = [];

        layers.push({
          corners: [proj(kx + 3, ky + kH - depth - 2), proj(kx + kw + 3, ky + kH - depth - 2), proj(kx + kw + 3, ky + kH + 2), proj(kx - 3, ky + kH + 2)],
          radii: [0, 0, r, r], fill: "rgba(0,0,0,0.35)",
        });
        layers.push({
          corners: [proj(kx, ky + kH - depth - 5), proj(kx + kw, ky + kH - depth - 5), proj(kx + kw, ky + kH), proj(kx, ky + kH)],
          radii: [0, 0, r, r], fill: hexDarken(capColor, 0.72),
        });
        const topC: [number, number][] = [proj(kx, ky), proj(kx + kw, ky), proj(kx + kw, ky + kH - depth), proj(kx, ky + kH - depth)];
        layers.push({ corners: topC, radii: [r, r, r, r], fill: capColor });

        const tc = luminance(capColor) < 128 ? "#faf3e0" : "#1a1a2e";
        const fs = (big ? 20 : 8) * s;

        const keyCx = topC.reduce((a, p) => a + p[0], 0) / 4;
        const keyCy = topC.reduce((a, p) => a + p[1], 0) / 4;
        const rot = Math.atan2(topC[1][1] - topC[0][1], topC[1][0] - topC[0][0]) * 180 / Math.PI;
        const kpw = Math.hypot(topC[1][0] - topC[0][0], topC[1][1] - topC[0][1]);
        keys.push({ layers, label: big ? kd.l.toUpperCase() : kd.l.toLowerCase(), lx: keyCx, ly: keyCy, fs, tc, centered: big, rotation: rot, keyW: kpw });
      }
    }

    return { bgPts, keys };
  }, [kbW, kH, kbGap, kbRatio, W, H, keyColors]);

  const layout = useTypographyLayout(H, topCity, topCities, 0.48);
  const { figureColor, groundColor } = useFigureColors(theme);
  const figureSeed = useMapStore((s) => s.figureSeed);
  const perspAvoid = useMemo<AvoidZone[]>(() => [
    { x1: 0, y1: 0, x2: 22, y2: 50 },
    kbBoundsFromPts(kbData.bgPts, W, H),
  ], [kbData.bgPts, W, H]);

  return (
    <KonvaPosterStage width={W} height={H}>
      <Group clipFunc={(ctx) => {
        const r = 24;
        ctx.beginPath(); ctx.moveTo(r, 0);
        ctx.arcTo(W, 0, W, H, r); ctx.arcTo(W, H, 0, H, r);
        ctx.arcTo(0, H, 0, 0, r); ctx.arcTo(0, 0, W, 0, r); ctx.closePath();
      }}>
        <Rect width={W} height={H} fill={theme.posterBg} />
        <ScatteredFigures W={W} H={H} seed={figureSeed}
          figureColor={figureColor} groundColor={groundColor} avoidZones={perspAvoid} />
        <TypographySection layout={layout} cityCount={cityCount} totalItems={totalItems}
          topCity={topCity} theme={theme} />
        <Line points={kbData.bgPts} closed fill={theme.kbContainerBg} />
        {kbData.keys.map((k, i) => (
          <Group key={i}>
            {k.layers.map((layer, li) => (
              <Shape key={li} fill={layer.fill} sceneFunc={(ctx, shape) => {
                drawRoundedQuad(ctx, layer.corners, layer.radii);
                ctx.fillStrokeShape(shape);
              }} />
            ))}
            {k.label && (
              <Text
                x={k.lx} y={k.ly}
                offsetX={k.keyW * 0.5} offsetY={k.fs * 0.5}
                rotation={k.rotation}
                text={k.label} fontSize={k.fs} fontStyle="700" fill={k.tc}
                letterSpacing={k.fs * 0.05} fontFamily={FONT_UI}
                width={k.keyW} align="center" />
            )}
          </Group>
        ))}
      </Group>
    </KonvaPosterStage>
  );
}

/* ══════════════════════════════════════════════════════
   STYLE 2 — Isometric Keyboard
   ══════════════════════════════════════════════════════ */

const ISO_S = 0.85;
const ISO_R = (-24 * Math.PI) / 180;
const ISO_K = Math.tan((25 * Math.PI) / 180);
const ISO_M00 = ISO_S * Math.cos(ISO_R);
const ISO_M01 = ISO_S * (Math.cos(ISO_R) * ISO_K - Math.sin(ISO_R));
const ISO_M10 = ISO_S * Math.sin(ISO_R);
const ISO_M11 = ISO_S * (Math.sin(ISO_R) * ISO_K + Math.cos(ISO_R));

function IsometricContent({ items, cityEntries, posterWidth, posterHeight }: PosterModuleProps) {
  const W = posterWidth;
  const H = posterHeight;

  const kbW = Math.round(W * (BASE_KB_W / BASE_W));
  const kbRatio = kbW / BASE_KB_W;
  const kbGap = Math.round(10 * kbRatio);
  const kH = Math.round(52 * kbRatio);

  const themeIdx = useMapStore((s) => s.keyboardThemeIdx);
  const theme = KEYBOARD_THEMES[themeIdx % KEYBOARD_THEMES.length];

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

  const kbData = useMemo(() => {
    const pad = Math.round(20 * kbRatio);
    const contentW = kbW - 2 * pad;
    const colW = (contentW - 59 * kbGap) / 60;
    const rowCount = KB.length;
    const totalH = 2 * pad + rowCount * kH + (rowCount - 1) * kbGap;

    const kcx = kbW / 2;
    const kcy = totalH / 2;
    const pcx = W / 2;
    const pcy = H * 0.58;

    const proj = (kx: number, ky: number): [number, number] => {
      const dx = kx - kcx;
      const dy = ky - kcy;
      return [ISO_M00 * dx + ISO_M01 * dy + pcx, ISO_M10 * dx + ISO_M11 * dy + pcy];
    };

    const flat = (cs: [number, number][]) => cs.flatMap(([x, y]) => [x, y]);

    const bg = flat([proj(-pad, -pad), proj(kbW + pad, -pad), proj(kbW + pad, totalH + pad), proj(-pad, totalH + pad)]);
    const keys: KonvaKey[] = [];

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
        const layers: { pts: number[]; fill: string }[] = [];

        layers.push({ pts: flat([proj(kx - 14, ky + 14), proj(kx + kw - 14, ky + 14), proj(kx + kw - 14, ky + kH + 14), proj(kx - 14, ky + kH + 14)]), fill: theme.palette.shadow });
        layers.push({ pts: flat([proj(kx - 8, ky + 8), proj(kx + kw - 8, ky + 8), proj(kx + kw - 8, ky + kH + 8), proj(kx - 8, ky + kH + 8)]), fill: cc.base });
        layers.push({ pts: flat([proj(kx, ky), proj(kx + kw, ky), proj(kx + kw, ky + kH), proj(kx, ky + kH)]), fill: theme.palette.surface });
        layers.push({ pts: flat([proj(kx + 3, ky + 7), proj(kx + kw - 7, ky + 7), proj(kx + kw - 7, ky + kH - 3), proj(kx + 3, ky + kH - 3)]), fill: theme.palette.shadow });
        const capC: [number, number][] = [proj(kx + 7, ky + 3), proj(kx + kw - 3, ky + 3), proj(kx + kw - 3, ky + kH - 7), proj(kx + 7, ky + kH - 7)];
        layers.push({ pts: flat(capC), fill: cc.cap });

        const tc = theme.palette.shadow;
        const fs = big ? 18 * kbRatio : 7 * kbRatio;

        const keyCx = capC.reduce((a, p) => a + p[0], 0) / 4;
        const keyCy = capC.reduce((a, p) => a + p[1], 0) / 4;
        const rot = Math.atan2(capC[1][1] - capC[0][1], capC[1][0] - capC[0][0]) * 180 / Math.PI;
        const kpw = Math.hypot(capC[1][0] - capC[0][0], capC[1][1] - capC[0][1]);
        keys.push({ layers, label: big ? kd.l.toUpperCase() : kd.l.toLowerCase(), lx: keyCx, ly: keyCy, fs, tc, centered: big, rotation: rot, keyW: kpw });
      }
    }

    return { bg, keys };
  }, [kbW, kH, kbGap, kbRatio, W, H, keyColors, theme]);

  const layout = useTypographyLayout(H, topCity, topCities, 0.28);
  const { figureColor, groundColor } = useFigureColors(theme);
  const figureSeed = useMapStore((s) => s.figureSeed);
  const isoAvoid = useMemo<AvoidZone[]>(() => [
    { x1: 0, y1: 0, x2: 22, y2: 32 },
    kbBoundsFromPts(kbData.bg, W, H, 4),
  ], [kbData.bg, W, H]);

  return (
    <KonvaPosterStage width={W} height={H}>
      <Group clipFunc={(ctx) => {
        const r = 24;
        ctx.beginPath(); ctx.moveTo(r, 0);
        ctx.arcTo(W, 0, W, H, r); ctx.arcTo(W, H, 0, H, r);
        ctx.arcTo(0, H, 0, 0, r); ctx.arcTo(0, 0, W, 0, r); ctx.closePath();
      }}>
        <Rect width={W} height={H} fill={theme.posterBg} />
        {/* Noise texture */}
        <Shape sceneFunc={(ctx, shape) => {
          ctx.save(); ctx.globalAlpha = 0.08;
          const step = 3;
          for (let y = 0; y < H; y += step) {
            for (let x = 0; x < W; x += step) {
              const v = Math.random() * 255;
              ctx.fillStyle = `rgb(${v},${v},${v})`;
              ctx.fillRect(x, y, step, step);
            }
          }
          ctx.restore(); ctx.fillStrokeShape(shape);
        }} />
        <ScatteredFigures W={W} H={H} seed={figureSeed}
          figureColor={figureColor} groundColor={groundColor} avoidZones={isoAvoid} />
        <TypographySection layout={layout} cityCount={cityCount} totalItems={totalItems}
          topCity={topCity} theme={theme} />
        <Line points={kbData.bg} closed fill={theme.kbContainerBg} />
        {kbData.keys.map((k, i) => (
          <Group key={i}>
            {k.layers.map((l, li) => (
              <Line key={li} points={l.pts} closed fill={l.fill} />
            ))}
            {k.label && (
              <Text
                x={k.lx} y={k.ly}
                offsetX={k.keyW * 0.5} offsetY={k.fs * 0.5}
                rotation={k.rotation}
                text={k.label} fontSize={k.fs} fontStyle="700" fill={k.tc}
                letterSpacing={k.fs * 0.05} fontFamily={FONT_UI}
                width={k.keyW} align="center" />
            )}
          </Group>
        ))}
      </Group>
    </KonvaPosterStage>
  );
}

/* ══════════════════════════════════════════════════════
   Main Component — Style Switch
   ══════════════════════════════════════════════════════ */

function KeyboardPoster(props: PosterModuleProps) {
  const styleIdx = useMapStore((s) => s.keyboardStyleIdx);
  switch (styleIdx) {
    case 1: return <IsometricContent {...props} />;
    default: return <Persp3DContent {...props} />;
  }
}

export default KeyboardPoster;
