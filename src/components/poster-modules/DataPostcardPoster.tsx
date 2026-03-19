import { createContext, useContext, useMemo, useRef, useState, useEffect, useCallback } from "react";
import type { PosterModuleProps } from "../../lib/poster-modules";
import { useMapStore } from "../../stores/useMapStore";

/* ── Palette context — avoids threading props through every sub-component ── */
interface PalCtx { colors: string[]; muted: string; ink: string; line: string; bg: string }
const PalCtxDefault: PalCtx = { colors: ["#D4A853", "#2D4A3E", "#C67F6B", "#7A3B4E", "#8B9E78", "#B8926A"], muted: "#C8C0B8", ink: "#2D2D2D", line: "#E8E2DA", bg: "#F7F5F2" };
const PalContext = createContext<PalCtx>(PalCtxDefault);
const usePal = () => useContext(PalContext);

/* ── Poster & panel dimensions ── */
const PAD = 40;
const GAP = 12;
const HDR = 64;
const FTR = 28;

/* ── 色相推导引擎 — 单色相 → 全套数据配色 ── */
import { hslToHex } from "./PopBoardPoster";

export function deriveDataPalette(hue: number): PalCtx {
  return {
    colors: [
      hslToHex(hue,       70, 52),
      hslToHex(hue + 60,  60, 42),
      hslToHex(hue + 120, 55, 50),
      hslToHex(hue + 180, 50, 48),
      hslToHex(hue + 240, 60, 50),
      hslToHex(hue + 300, 55, 48),
    ],
    muted: hslToHex(hue, 10, 75),
    ink:   hslToHex(hue + 210, 25, 18),
    line:  hslToHex(hue, 10, 90),
    bg:    hslToHex(hue, 8, 96),
  };
}

export const DATA_HUE_PRESETS = [
  { name: "大地", hue: 35 },
  { name: "珊瑚", hue: 0 },
  { name: "森林", hue: 145 },
  { name: "海洋", hue: 200 },
  { name: "薰衣草", hue: 270 },
  { name: "玫瑰", hue: 340 },
];

const FT = '"Noto Sans SC","PingFang SC",system-ui,sans-serif';

/* ── Visual style presets ── */
export interface DataPostcardStylePreset {
  id: string;
  label: string;
  panelRadius: number;
  panelBorder: number;
  panelShadowOffset: number;
  panelShadowBlur: number;
  /** 内阴影（黏土/浮雕） */
  insetShadow: string;
  /** 海报外框圆角 */
  posterRadius: number;
  /** 噪点纹理 */
  noiseOverlay: boolean;
}

export const DATA_POSTCARD_STYLES: DataPostcardStylePreset[] = [
  {
    id: "clean", label: "简约",
    panelRadius: 16, panelBorder: 0, panelShadowOffset: 0, panelShadowBlur: 0,
    insetShadow: "", posterRadius: 24, noiseOverlay: false,
  },
  {
    id: "brutalism", label: "野兽派",
    panelRadius: 8, panelBorder: 3, panelShadowOffset: 5, panelShadowBlur: 0,
    insetShadow: "", posterRadius: 0, noiseOverlay: false,
  },
  {
    id: "card", label: "卡片",
    panelRadius: 16, panelBorder: 0, panelShadowOffset: 0, panelShadowBlur: 12,
    insetShadow: "", posterRadius: 24, noiseOverlay: false,
  },
  {
    id: "outlined", label: "描边",
    panelRadius: 12, panelBorder: 1.5, panelShadowOffset: 0, panelShadowBlur: 0,
    insetShadow: "", posterRadius: 16, noiseOverlay: false,
  },
  {
    id: "clay", label: "黏土",
    panelRadius: 24, panelBorder: 0, panelShadowOffset: 0, panelShadowBlur: 20,
    insetShadow: "inset 2px 2px 8px rgba(255,255,255,0.7), inset -2px -2px 6px rgba(0,0,0,0.05)",
    posterRadius: 32, noiseOverlay: false,
  },
  {
    id: "sketch", label: "手绘",
    panelRadius: 4, panelBorder: 2, panelShadowOffset: 3, panelShadowBlur: 0,
    insetShadow: "", posterRadius: 8, noiseOverlay: true,
  },
];

/* ── Cardinal spline through points ── */
function spline(pts: [number, number][]): string {
  if (pts.length < 2) return "";
  const k = 0.3;
  let d = `M${pts[0][0]} ${pts[0][1]}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const a = pts[Math.max(0, i - 1)];
    const b = pts[i];
    const c = pts[i + 1];
    const e = pts[Math.min(pts.length - 1, i + 2)];
    d += ` C${(b[0] + (c[0] - a[0]) * k).toFixed(1)} ${(b[1] + (c[1] - a[1]) * k).toFixed(1)},`
      + `${(c[0] - (e[0] - b[0]) * k).toFixed(1)} ${(c[1] - (e[1] - b[1]) * k).toFixed(1)},`
      + `${c[0]} ${c[1]}`;
  }
  return d;
}

/* ── Shared SVG shell ── */
function Panel({ children, pw, ph }: { children: React.ReactNode; pw: number; ph: number }) {
  return (
    <svg
      width="100%" height="100%"
      viewBox={`0 0 ${pw} ${ph}`}
      style={{ fontFamily: FT, display: "block" }}
    >
      {children}
    </svg>
  );
}

function SectionLabel({ text }: { text: string }) {
  const { muted: MUTED } = usePal();
  return (
    <text x={16} y={28} fontSize={9} fontWeight={700} fill={MUTED}
      letterSpacing="0.15em" fontFamily={FT}>
      {text}
    </text>
  );
}

/* ════════════════════════════════════════════════════
   Panel A — City Pill Bar Chart
   ════════════════════════════════════════════════════ */

function PanelPills({ cities, pw: PW, ph: PH }: { cities: { name: string; count: number }[]; pw: number; ph: number }) {
  const { colors: EARTH, ink: INK, line: LINE } = usePal();
  const top = cities.slice(0, 8);
  if (!top.length) return <EmptyPanel label="CITIES" pw={PW} ph={PH} />;

  const maxC = Math.max(...top.map((c) => c.count));
  const pad = 16;
  const y0 = 48;
  const yBot = PH - 30;
  const chartH = yBot - y0 - 12;
  const colW = (PW - pad * 2) / top.length;
  const pillW = Math.min(22, colW * 0.48);

  // Compute pill positions for trend line
  const pts: [number, number][] = top.map((city, i) => {
    const cx = pad + colW * i + colW / 2;
    const h = Math.max(pillW, (city.count / maxC) * chartH);
    return [cx, y0 + chartH - h];
  });

  return (
    <Panel pw={PW} ph={PH}>
      <SectionLabel text="CITIES" />

      {/* Trend line behind bars */}
      <path d={spline(pts)} stroke={LINE} strokeWidth={1.5} fill="none" />

      {top.map((city, i) => {
        const cx = pad + colW * i + colW / 2;
        const h = Math.max(pillW, (city.count / maxC) * chartH);
        const y = y0 + chartH - h;
        const color = EARTH[i % EARTH.length];

        return (
          <g key={i}>
            {city.count <= 2 ? (
              /* Small dot for tiny values */
              <>
                {Array.from({ length: city.count }, (_, j) => (
                  <circle
                    key={j}
                    cx={cx}
                    cy={yBot - 8 - j * 14}
                    r={5}
                    fill={color}
                  />
                ))}
              </>
            ) : (
              <>
                <rect
                  x={cx - pillW / 2} y={y}
                  width={pillW} height={h}
                  rx={pillW / 2} fill={color}
                />
                <text
                  x={cx} y={y - 8}
                  textAnchor="middle" fontSize={8} fontWeight={700}
                  fill={INK} fontFamily={FT}
                >
                  {city.count}
                </text>
              </>
            )}

            {/* City name label */}
            <text
              x={cx} y={PH - pad + 2}
              textAnchor="middle" fontSize={8} fontWeight={600}
              fill={INK} fontFamily={FT}
            >
              {city.name.slice(0, 2)}
            </text>
          </g>
        );
      })}
    </Panel>
  );
}

/* ── Sub-category keywords — first match wins ── */
const SUBCATS: { label: string; theme: "food" | "sight" | "other"; kw: string[] }[] = [
  { label: "火锅", theme: "food", kw: ["火锅"] },
  { label: "烧烤", theme: "food", kw: ["烧烤", "撸串", "烤串"] },
  { label: "咖啡", theme: "food", kw: ["咖啡"] },
  { label: "奶茶", theme: "food", kw: ["奶茶", "果茶", "茶饮"] },
  { label: "甜品", theme: "food", kw: ["甜品", "蛋糕", "甜点", "冰淇淋", "面包", "烘焙"] },
  { label: "面食", theme: "food", kw: ["面馆", "米线", "螺蛳粉", "拉面", "米粉", "面条"] },
  { label: "小吃", theme: "food", kw: ["小吃", "夜市", "街头"] },
  { label: "日料", theme: "food", kw: ["日料", "寿司", "刺身", "居酒屋"] },
  { label: "西餐", theme: "food", kw: ["西餐", "牛排", "披萨", "意面", "汉堡"] },
  { label: "海鲜", theme: "food", kw: ["海鲜", "生蚝", "龙虾", "螃蟹"] },
  { label: "早茶", theme: "food", kw: ["早茶", "点心", "茶楼", "粤菜"] },
  { label: "探店", theme: "food", kw: ["探店", "种草", "新店"] },
  { label: "古镇", theme: "sight", kw: ["古镇", "古城", "老街"] },
  { label: "自然", theme: "sight", kw: ["公园", "森林", "湖", "山", "海", "草原"] },
  { label: "博物馆", theme: "sight", kw: ["博物馆", "美术馆", "展览"] },
  { label: "打卡", theme: "sight", kw: ["打卡", "拍照", "出片", "网红"] },
  { label: "夜景", theme: "sight", kw: ["夜景", "夜游", "灯光"] },
  { label: "攻略", theme: "other", kw: ["攻略", "行程", "路线", "干货"] },
];

/* ── Theme-aware copy — social / shareable wording ── */
const THEME_COPY: Record<string, { section: string; title: string; sub: string }> = {
  food:  { section: "TASTE",  title: "我的美食版图", sub: "TASTE MAP" },
  sight: { section: "SIGHTS", title: "城市漫游手记", sub: "CITY EXPLORER" },
  other: { section: "TOPICS", title: "探索版图",     sub: "TRAVEL MAP" },
};

function detectTheme(items: { title: string; intro: string }[]): "food" | "sight" | "other" {
  const tc = { food: 0, sight: 0, other: 0 };
  for (const item of items) {
    const text = item.title + item.intro;
    for (const sub of SUBCATS) {
      if (sub.kw.some((k) => text.includes(k))) { tc[sub.theme]++; break; }
    }
  }
  const top = Object.entries(tc).sort((a, b) => b[1] - a[1]);
  return (top[0]?.[0] ?? "other") as "food" | "sight" | "other";
}

/* ════════════════════════════════════════════════════
   Panel B — Sub-category Heatmap Grid (equal blocks)
   ════════════════════════════════════════════════════ */

function PanelTopics({ items, pw: PW, ph: PH }: { items: PosterModuleProps["items"]; pw: number; ph: number }) {
  const { colors: EARTH, ink: INK } = usePal();
  const { blocks, label } = useMemo(() => {
    const counts = SUBCATS.map(() => 0);
    for (const item of items) {
      const text = item.title + item.intro;
      for (let i = 0; i < SUBCATS.length; i++) {
        if (SUBCATS[i].kw.some((k) => text.includes(k))) {
          counts[i]++;
          break;
        }
      }
    }

    const matched = SUBCATS
      .map((s, i) => ({ label: s.label, theme: s.theme, count: counts[i] }))
      .filter((s) => s.count > 0)
      .sort((a, b) => b.count - a.count)
      .slice(0, 9); // max 3×3

    const tc: Record<string, number> = { food: 0, sight: 0, other: 0 };
    for (const m of matched) tc[m.theme] += m.count;
    const dom = Object.entries(tc).sort((a, b) => b[1] - a[1])[0]?.[0] ?? "other";

    return { blocks: matched, label: THEME_COPY[dom]?.section ?? "TOPICS" };
  }, [items]);

  if (!blocks.length) return <EmptyPanel label="TOPICS" pw={PW} ph={PH} />;

  const pad = 16;
  const gap = 6;
  const aW = PW - pad * 2;
  const aH = PH - 48 - pad;
  const maxC = blocks[0].count;

  // Equal-size grid: 3 columns, N rows
  const cols = Math.min(3, blocks.length);
  const rows = Math.ceil(blocks.length / cols);
  const cellW = (aW - gap * (cols - 1)) / cols;
  const cellH = (aH - gap * (rows - 1)) / rows;
  const cell = Math.min(cellW, cellH);

  // Center the grid
  const gridW = cell * cols + gap * (cols - 1);
  const gridH = cell * rows + gap * (rows - 1);
  const ox = pad + (aW - gridW) / 2;
  const oy = 48 + (aH - gridH) / 2;

  return (
    <Panel pw={PW} ph={PH}>
      <SectionLabel text={label} />
      {blocks.map((b, i) => {
        const col = i % cols;
        const row = Math.floor(i / cols);
        const x = ox + col * (cell + gap);
        const y = oy + row * (cell + gap);
        const ratio = b.count / maxC;
        const opacity = 0.18 + 0.82 * ratio;
        const textFill = ratio > 0.45 ? "#FFFFFF" : INK;

        return (
          <g key={i}>
            <rect
              x={x} y={y} width={cell} height={cell}
              rx={10} fill={EARTH[0]} opacity={opacity}
            />
            <text
              x={x + cell / 2} y={y + cell / 2 - 2}
              textAnchor="middle" fontSize={11} fontWeight={700}
              fill={textFill} fontFamily={FT}
            >
              {b.label}
            </text>
            <text
              x={x + cell / 2} y={y + cell / 2 + 14}
              textAnchor="middle" fontSize={10} fontWeight={600}
              fill={textFill} fontFamily={FT} opacity={0.7}
            >
              {b.count}
            </text>
          </g>
        );
      })}
    </Panel>
  );
}

/* ════════════════════════════════════════════════════
   Panel C — Waffle Dot Grid
   ════════════════════════════════════════════════════ */

function PanelWaffle({ cities, total, pw: PW, ph: PH }: { cities: { name: string; count: number }[]; total: number; pw: number; ph: number }) {
  const { colors: EARTH, muted: MUTED, line: LINE } = usePal();
  const dots = useMemo(() => {
    const out: string[] = [];
    for (const [idx, city] of cities.entries()) {
      const color = idx < EARTH.length ? EARTH[idx] : MUTED;
      for (let j = 0; j < city.count && out.length < 120; j++) out.push(color);
    }
    // Unmapped items (no city) → light dots
    const rest = Math.min(120 - out.length, Math.max(0, total - out.length));
    for (let j = 0; j < rest; j++) out.push(LINE);
    return out;
  }, [cities, total]);

  if (!dots.length) return <EmptyPanel label="ITEMS" pw={PW} ph={PH} />;

  const pad = 16;
  const aW = PW - pad * 2;
  const aH = PH - 60;
  const n = dots.length;
  const cols = Math.max(4, Math.round(Math.sqrt(n * (aW / aH))));
  const rows = Math.ceil(n / cols);
  const cell = Math.min(aW / cols, aH / rows);
  const dr = Math.min(cell * 0.36, 8);
  const gW = cols * cell;
  const gH = rows * cell;
  const ox = pad + (aW - gW) / 2;
  const oy = 48 + (aH - gH) / 2;

  return (
    <Panel pw={PW} ph={PH}>
      <SectionLabel text="ITEMS" />
      {dots.map((color, i) => (
        <circle
          key={i}
          cx={ox + (i % cols) * cell + cell / 2}
          cy={oy + Math.floor(i / cols) * cell + cell / 2}
          r={dr}
          fill={color}
        />
      ))}
      {/* Overflow indicator */}
      {total > 120 && (
        <text
          x={PW - pad} y={PH - pad}
          textAnchor="end" fontSize={8} fontWeight={600}
          fill={MUTED} fontFamily={FT}
        >
          +{total - 120} more
        </text>
      )}
    </Panel>
  );
}

/* ════════════════════════════════════════════════════
   Panel D — Key Stats Typography
   ════════════════════════════════════════════════════ */

function PanelStats({
  cityCount,
  totalItems,
  topCity,
  pw: PW,
  ph: PH,
}: {
  cityCount: number;
  totalItems: number;
  topCity: string;
  pw: number;
  ph: number;
}) {
  const { ink: INK, muted: MUTED, line: LINE } = usePal();
  const cx = PW / 2;
  const secH = (PH - 48) / 3;

  const rows = [
    { value: String(cityCount), label: "CITIES", size: 52 },
    { value: String(totalItems), label: "SAVES", size: 52 },
    { value: topCity || "—", label: "TOP CITY", size: topCity.length > 3 ? 24 : 28 },
  ];

  return (
    <Panel pw={PW} ph={PH}>
      <SectionLabel text="OVERVIEW" />
      {rows.map((r, i) => {
        const baseY = 48 + secH * i + secH / 2;
        return (
          <g key={i}>
            <text
              x={cx} y={baseY}
              textAnchor="middle" fontSize={r.size} fontWeight={900}
              fill={INK} fontFamily={FT}
            >
              {r.value}
            </text>
            <text
              x={cx} y={baseY + r.size * 0.55}
              textAnchor="middle" fontSize={9} fontWeight={700}
              fill={MUTED} letterSpacing="0.15em" fontFamily={FT}
            >
              {r.label}
            </text>
            {/* Separator line between sections */}
            {i < 2 && (
              <line
                x1={cx - 20} y1={48 + secH * (i + 1)}
                x2={cx + 20} y2={48 + secH * (i + 1)}
                stroke={LINE} strokeWidth={1}
              />
            )}
          </g>
        );
      })}
    </Panel>
  );
}

/* ── Empty fallback ── */
function EmptyPanel({ label, pw: PW, ph: PH }: { label: string; pw: number; ph: number }) {
  const { muted: MUTED } = usePal();
  return (
    <Panel pw={PW} ph={PH}>
      <SectionLabel text={label} />
      <text
        x={PW / 2} y={PH / 2}
        textAnchor="middle" fontSize={10} fill={MUTED} fontFamily={FT}
      >
        暂无数据
      </text>
    </Panel>
  );
}

/* ════════════════════════════════════════════════════
   Main Component
   ════════════════════════════════════════════════════ */

function DataPostcardPoster({ items, cityEntries, posterWidth: W, posterHeight: H }: PosterModuleProps) {
  const dataPostcardHue = useMapStore((s) => s.dataPostcardHue);
  const activePal = useMemo(() => deriveDataPalette(dataPostcardHue), [dataPostcardHue]);
  const dataPostcardStyleIdx = useMapStore((s) => s.dataPostcardStyleIdx);
  const sty = DATA_POSTCARD_STYLES[dataPostcardStyleIdx] ?? DATA_POSTCARD_STYLES[0];
  const palCtx = useMemo<PalCtx>(() => ({
    colors: activePal.colors, muted: activePal.muted, ink: activePal.ink, line: activePal.line, bg: activePal.bg,
  }), [activePal]);
  const INK = activePal.ink;
  const MUTED = activePal.muted;
  const PBG = activePal.bg;

  const panelFrame: React.CSSProperties = useMemo(() => {
    const shadow = sty.panelShadowBlur > 0
      ? `0 ${sty.panelShadowBlur / 3}px ${sty.panelShadowBlur}px rgba(0,0,0,0.08)`
      : sty.panelShadowOffset > 0
        ? `${sty.panelShadowOffset}px ${sty.panelShadowOffset}px 0 ${INK}20`
        : "none";
    return {
      backgroundColor: PBG,
      borderRadius: sty.panelRadius,
      overflow: "hidden" as const,
      border: sty.panelBorder > 0 ? `${sty.panelBorder}px solid ${INK}30` : "none",
      boxShadow: [shadow, sty.insetShadow].filter(Boolean).join(", ") || "none",
    };
  }, [sty, INK, PBG]);

  const containerRef = useRef<HTMLDivElement>(null);
  const [fitScale, setFitScale] = useState(1);

  /* Panel SVG viewBox dimensions — derived from poster size */
  const PW = (W - PAD * 2 - GAP) / 2;
  const PH = (H - PAD * 2 - HDR - FTR - GAP) / 2;

  const measure = useCallback(() => {
    const el = containerRef.current;
    if (!el) return;
    const p = 48;
    setFitScale(Math.min((el.clientWidth - p) / W, (el.clientHeight - p) / H, 1));
  }, [W, H]);

  useEffect(() => {
    measure();
    const ro = new ResizeObserver(measure);
    if (containerRef.current) ro.observe(containerRef.current);
    return () => ro.disconnect();
  }, [measure]);

  const cities = useMemo(
    () => cityEntries.map((e) => ({ name: e.name, count: e.count })),
    [cityEntries],
  );

  const theme = useMemo(() => detectTheme(items), [items]);
  const copy = THEME_COPY[theme];

  return (
    <PalContext.Provider value={palCtx}>
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
            backgroundColor: "#FFFFFF",
            borderRadius: sty.posterRadius,
            boxShadow: "0 4px 24px rgba(0,0,0,0.08), 0 1px 4px rgba(0,0,0,0.04)",
            fontFamily: FT,
            overflow: "hidden",
            padding: PAD,
            display: "flex",
            flexDirection: "column",
            position: "relative",
          }}
        >
          {/* Noise overlay for sketch/vintage styles */}
          {sty.noiseOverlay && (
            <svg style={{ position: "absolute", inset: 0, width: "100%", height: "100%", pointerEvents: "none", mixBlendMode: "multiply", opacity: 0.1, zIndex: 10 }}>
              <filter id="dp-noise"><feTurbulence type="fractalNoise" baseFrequency="0.7" numOctaves="3" /></filter>
              <rect width="100%" height="100%" filter="url(#dp-noise)" />
            </svg>
          )}
          {/* Header — theme-aware */}
          <div
            style={{
              height: HDR,
              display: "flex",
              flexDirection: "column",
              justifyContent: "flex-end",
            }}
          >
            <div style={{ fontSize: 20, fontWeight: 900, color: INK, letterSpacing: "-0.02em" }}>
              {copy.title}
            </div>
            <div
              style={{
                fontSize: 9,
                fontWeight: 700,
                color: MUTED,
                letterSpacing: "0.15em",
                marginTop: 4,
              }}
            >
              {copy.sub} · {cityEntries.length} CITIES
            </div>
          </div>

          {/* 2×2 Grid */}
          <div
            style={{
              flex: 1,
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gridTemplateRows: "1fr 1fr",
              gap: GAP,
            }}
          >
            {/* A: City Pills */}
            <div style={panelFrame}>
              <PanelPills cities={cities} pw={PW} ph={PH} />
            </div>
            {/* B: Content Topics */}
            <div style={panelFrame}>
              <PanelTopics items={items} pw={PW} ph={PH} />
            </div>
            {/* C: Waffle Grid */}
            <div style={panelFrame}>
              <PanelWaffle cities={cities} total={items.length} pw={PW} ph={PH} />
            </div>
            {/* D: Key Stats */}
            <div style={panelFrame}>
              <PanelStats
                cityCount={cityEntries.length}
                totalItems={items.length}
                topCity={cityEntries[0]?.name ?? ""}
                pw={PW}
                ph={PH}
              />
            </div>
          </div>

          {/* Footer */}
          <div
            style={{
              height: FTR,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <span
              style={{
                fontSize: 10,
                fontWeight: 800,
                color: MUTED,
                letterSpacing: "0.2em",
                opacity: 0.5,
              }}
            >
              METOO
            </span>
          </div>
        </div>
      </div>
    </div>
    </PalContext.Provider>
  );
}

export default DataPostcardPoster;
