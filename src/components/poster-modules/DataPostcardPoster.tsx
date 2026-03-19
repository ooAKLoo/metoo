import { createContext, useContext, useMemo } from "react";
import { Rect, Text, Line, Group, Circle, Path } from "react-konva";
import type { PosterModuleProps } from "../../lib/poster-modules";
import { KonvaPosterStage } from "../../lib/poster-stage";
import { useMapStore } from "../../stores/useMapStore";

/* ── Palette context ── */
interface PalCtx { colors: string[]; muted: string; ink: string; line: string; bg: string }
const PalCtxDefault: PalCtx = { colors: ["#D4A853", "#2D4A3E", "#C67F6B", "#7A3B4E", "#8B9E78", "#B8926A"], muted: "#C8C0B8", ink: "#2D2D2D", line: "#E8E2DA", bg: "#F7F5F2" };
const PalContext = createContext<PalCtx>(PalCtxDefault);
const usePal = () => useContext(PalContext);

/* ── Poster & panel dimensions ── */
const PAD = 40;
const GAP = 12;
const HDR = 64;
const FTR = 28;

/* ── Hue-to-palette engine ── */
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

const FT = "'Noto Sans SC','PingFang SC',system-ui,sans-serif";

/* ── Visual style presets ── */
export interface DataPostcardStylePreset {
  id: string;
  label: string;
  panelRadius: number;
  panelBorder: number;
  panelShadowOffset: number;
  panelShadowBlur: number;
  /** inset shadow (clay/emboss) — omitted in Canvas */
  insetShadow: string;
  /** poster outer corner radius */
  posterRadius: number;
  /** noise texture — omitted in Canvas */
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

/* ── Cardinal spline through points → SVG path data ── */
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

/* ── Sub-category keywords ── */
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

/* ── Theme-aware copy ── */
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
   Konva Panel sub-components
   ════════════════════════════════════════════════════ */

/** Section label rendered at top-left of each panel */
function KSectionLabel({ text, ox, oy }: { text: string; ox: number; oy: number }) {
  const { muted } = usePal();
  return (
    <Text
      x={ox + 16}
      y={oy + 18}
      text={text}
      fontSize={9}
      fontStyle="700"
      fill={muted}
      letterSpacing={9 * 0.15}
      fontFamily={FT}
    />
  );
}

/** Empty fallback panel content */
function KEmptyPanel({ label, ox, oy, pw, ph }: { label: string; ox: number; oy: number; pw: number; ph: number }) {
  const { muted } = usePal();
  return (
    <Group>
      <KSectionLabel text={label} ox={ox} oy={oy} />
      <Text
        x={ox}
        y={oy + ph / 2 - 5}
        width={pw}
        text="暂无数据"
        fontSize={10}
        fill={muted}
        fontFamily={FT}
        align="center"
      />
    </Group>
  );
}

/* ════════════════════════════════════════════════════
   Panel A — City Pill Bar Chart
   ════════════════════════════════════════════════════ */

function KPanelPills({ cities, ox, oy, pw, ph }: { cities: { name: string; count: number }[]; ox: number; oy: number; pw: number; ph: number }) {
  const { colors: EARTH, ink: INK, line: LINE } = usePal();
  const top = cities.slice(0, 8);
  if (!top.length) return <KEmptyPanel label="CITIES" ox={ox} oy={oy} pw={pw} ph={ph} />;

  const maxC = Math.max(...top.map((c) => c.count));
  const pad = 16;
  const y0 = 48;
  const yBot = ph - 30;
  const chartH = yBot - y0 - 12;
  const colW = (pw - pad * 2) / top.length;
  const pillW = Math.min(22, colW * 0.48);

  // Compute pill positions for trend line
  const pts: [number, number][] = top.map((city, i) => {
    const cx = pad + colW * i + colW / 2;
    const h = Math.max(pillW, (city.count / maxC) * chartH);
    return [ox + cx, oy + y0 + chartH - h];
  });

  const trendPath = spline(pts);

  return (
    <Group>
      <KSectionLabel text="CITIES" ox={ox} oy={oy} />

      {/* Trend line behind bars */}
      {trendPath && (
        <Path data={trendPath} stroke={LINE} strokeWidth={1.5} />
      )}

      {top.map((city, i) => {
        const cx = pad + colW * i + colW / 2;
        const h = Math.max(pillW, (city.count / maxC) * chartH);
        const y = y0 + chartH - h;
        const color = EARTH[i % EARTH.length];

        return (
          <Group key={i}>
            {city.count <= 2 ? (
              /* Small dots for tiny values */
              <>
                {Array.from({ length: city.count }, (_, j) => (
                  <Circle
                    key={j}
                    x={ox + cx}
                    y={oy + yBot - 8 - j * 14}
                    radius={5}
                    fill={color}
                  />
                ))}
              </>
            ) : (
              <>
                <Rect
                  x={ox + cx - pillW / 2}
                  y={oy + y}
                  width={pillW}
                  height={h}
                  cornerRadius={pillW / 2}
                  fill={color}
                />
                <Text
                  x={ox + cx - 20}
                  y={oy + y - 16}
                  width={40}
                  text={String(city.count)}
                  fontSize={8}
                  fontStyle="700"
                  fill={INK}
                  fontFamily={FT}
                  align="center"
                />
              </>
            )}

            {/* City name label */}
            <Text
              x={ox + cx - 20}
              y={oy + ph - pad + 2}
              width={40}
              text={city.name.slice(0, 2)}
              fontSize={8}
              fontStyle="600"
              fill={INK}
              fontFamily={FT}
              align="center"
            />
          </Group>
        );
      })}
    </Group>
  );
}

/* ════════════════════════════════════════════════════
   Panel B — Sub-category Heatmap Grid
   ════════════════════════════════════════════════════ */

function KPanelTopics({ items, ox, oy, pw, ph }: { items: PosterModuleProps["items"]; ox: number; oy: number; pw: number; ph: number }) {
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
      .slice(0, 9);

    const tc: Record<string, number> = { food: 0, sight: 0, other: 0 };
    for (const m of matched) tc[m.theme] += m.count;
    const dom = Object.entries(tc).sort((a, b) => b[1] - a[1])[0]?.[0] ?? "other";

    return { blocks: matched, label: THEME_COPY[dom]?.section ?? "TOPICS" };
  }, [items]);

  if (!blocks.length) return <KEmptyPanel label="TOPICS" ox={ox} oy={oy} pw={pw} ph={ph} />;

  const pad = 16;
  const gap = 6;
  const aW = pw - pad * 2;
  const aH = ph - 48 - pad;
  const maxC = blocks[0].count;

  const cols = Math.min(3, blocks.length);
  const rows = Math.ceil(blocks.length / cols);
  const cellW = (aW - gap * (cols - 1)) / cols;
  const cellH = (aH - gap * (rows - 1)) / rows;
  const cell = Math.min(cellW, cellH);

  const gridW = cell * cols + gap * (cols - 1);
  const gridH = cell * rows + gap * (rows - 1);
  const gox = pad + (aW - gridW) / 2;
  const goy = 48 + (aH - gridH) / 2;

  return (
    <Group>
      <KSectionLabel text={label} ox={ox} oy={oy} />
      {blocks.map((b, i) => {
        const col = i % cols;
        const row = Math.floor(i / cols);
        const x = gox + col * (cell + gap);
        const y = goy + row * (cell + gap);
        const ratio = b.count / maxC;
        const opacity = 0.18 + 0.82 * ratio;
        const textFill = ratio > 0.45 ? "#FFFFFF" : INK;

        return (
          <Group key={i}>
            <Rect
              x={ox + x}
              y={oy + y}
              width={cell}
              height={cell}
              cornerRadius={10}
              fill={EARTH[0]}
              opacity={opacity}
            />
            <Text
              x={ox + x}
              y={oy + y + cell / 2 - 8}
              width={cell}
              text={b.label}
              fontSize={11}
              fontStyle="700"
              fill={textFill}
              fontFamily={FT}
              align="center"
            />
            <Text
              x={ox + x}
              y={oy + y + cell / 2 + 8}
              width={cell}
              text={String(b.count)}
              fontSize={10}
              fontStyle="600"
              fill={textFill}
              fontFamily={FT}
              align="center"
              opacity={0.7}
            />
          </Group>
        );
      })}
    </Group>
  );
}

/* ════════════════════════════════════════════════════
   Panel C — Waffle Dot Grid
   ════════════════════════════════════════════════════ */

function KPanelWaffle({ cities, total, ox, oy, pw, ph }: { cities: { name: string; count: number }[]; total: number; ox: number; oy: number; pw: number; ph: number }) {
  const { colors: EARTH, muted: MUTED, line: LINE } = usePal();
  const dots = useMemo(() => {
    const out: string[] = [];
    for (const [idx, city] of cities.entries()) {
      const color = idx < EARTH.length ? EARTH[idx] : MUTED;
      for (let j = 0; j < city.count && out.length < 120; j++) out.push(color);
    }
    const rest = Math.min(120 - out.length, Math.max(0, total - out.length));
    for (let j = 0; j < rest; j++) out.push(LINE);
    return out;
  }, [cities, total]);

  if (!dots.length) return <KEmptyPanel label="ITEMS" ox={ox} oy={oy} pw={pw} ph={ph} />;

  const pad = 16;
  const aW = pw - pad * 2;
  const aH = ph - 60;
  const n = dots.length;
  const cols = Math.max(4, Math.round(Math.sqrt(n * (aW / aH))));
  const rows = Math.ceil(n / cols);
  const cell = Math.min(aW / cols, aH / rows);
  const dr = Math.min(cell * 0.36, 8);
  const gW = cols * cell;
  const gH = rows * cell;
  const gox = pad + (aW - gW) / 2;
  const goy = 48 + (aH - gH) / 2;

  return (
    <Group>
      <KSectionLabel text="ITEMS" ox={ox} oy={oy} />
      {dots.map((color, i) => (
        <Circle
          key={i}
          x={ox + gox + (i % cols) * cell + cell / 2}
          y={oy + goy + Math.floor(i / cols) * cell + cell / 2}
          radius={dr}
          fill={color}
        />
      ))}
      {/* Overflow indicator */}
      {total > 120 && (
        <Text
          x={ox + pw - pad - 60}
          y={oy + ph - pad}
          width={60}
          text={`+${total - 120} more`}
          fontSize={8}
          fontStyle="600"
          fill={MUTED}
          fontFamily={FT}
          align="right"
        />
      )}
    </Group>
  );
}

/* ════════════════════════════════════════════════════
   Panel D — Key Stats Typography
   ════════════════════════════════════════════════════ */

function KPanelStats({
  cityCount,
  totalItems,
  topCity,
  ox,
  oy,
  pw,
  ph,
}: {
  cityCount: number;
  totalItems: number;
  topCity: string;
  ox: number;
  oy: number;
  pw: number;
  ph: number;
}) {
  const { ink: INK, muted: MUTED, line: LINE } = usePal();
  const cx = pw / 2;
  const secH = (ph - 48) / 3;

  const rows = [
    { value: String(cityCount), label: "CITIES", size: 52 },
    { value: String(totalItems), label: "SAVES", size: 52 },
    { value: topCity || "\u2014", label: "TOP CITY", size: topCity.length > 3 ? 24 : 28 },
  ];

  return (
    <Group>
      <KSectionLabel text="OVERVIEW" ox={ox} oy={oy} />
      {rows.map((r, i) => {
        // baseY = vertical center of each section
        const baseY = 48 + secH * i + secH / 2;
        // Value centered at baseY, label right below with gap
        const valueY = baseY - r.size / 2;
        const labelY = baseY + r.size / 2 + 4;
        return (
          <Group key={i}>
            <Text
              x={ox}
              y={oy + valueY}
              width={pw}
              text={r.value}
              fontSize={r.size}
              fontStyle="900"
              fill={INK}
              fontFamily={FT}
              align="center"
            />
            <Text
              x={ox}
              y={oy + labelY}
              width={pw}
              text={r.label}
              fontSize={9}
              fontStyle="700"
              fill={MUTED}
              letterSpacing={9 * 0.15}
              fontFamily={FT}
              align="center"
            />
            {/* Separator line between sections */}
            {i < 2 && (
              <Line
                points={[ox + cx - 20, oy + 48 + secH * (i + 1), ox + cx + 20, oy + 48 + secH * (i + 1)]}
                stroke={LINE}
                strokeWidth={1}
              />
            )}
          </Group>
        );
      })}
    </Group>
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

  /* Panel dimensions in poster coordinate space */
  const PW = (W - PAD * 2 - GAP) / 2;
  const PH = (H - PAD * 2 - HDR - FTR - GAP) / 2;

  /* Grid origin — top-left of the 2x2 panel area */
  const gridX = PAD;
  const gridY = PAD + HDR;

  /* Panel positions */
  const p0x = gridX;
  const p0y = gridY;
  const p1x = gridX + PW + GAP;
  const p1y = gridY;
  const p2x = gridX;
  const p2y = gridY + PH + GAP;
  const p3x = gridX + PW + GAP;
  const p3y = gridY + PH + GAP;

  const cities = useMemo(
    () => cityEntries.map((e) => ({ name: e.name, count: e.count })),
    [cityEntries],
  );

  const theme = useMemo(() => detectTheme(items), [items]);
  const copy = THEME_COPY[theme];

  /* Panel frame Konva props derived from style preset */
  const panelShadow = useMemo(() => {
    if (sty.panelShadowBlur > 0) {
      return {
        shadowColor: "rgba(0,0,0,0.08)",
        shadowBlur: sty.panelShadowBlur,
        shadowOffsetY: sty.panelShadowBlur / 3,
        shadowOffsetX: 0,
      };
    }
    if (sty.panelShadowOffset > 0) {
      return {
        shadowColor: INK + "20",
        shadowBlur: 0,
        shadowOffsetX: sty.panelShadowOffset,
        shadowOffsetY: sty.panelShadowOffset,
      };
    }
    return {};
  }, [sty, INK]);

  const panelStroke = sty.panelBorder > 0 ? INK + "30" : undefined;
  const panelStrokeWidth = sty.panelBorder > 0 ? sty.panelBorder : undefined;

  return (
    <PalContext.Provider value={palCtx}>
      <KonvaPosterStage width={W} height={H}>
        {/* Rounded-corner clip for poster */}
        <Group
          clipFunc={sty.posterRadius > 0 ? (ctx) => {
            const r = sty.posterRadius;
            ctx.beginPath();
            ctx.moveTo(r, 0);
            ctx.arcTo(W, 0, W, H, r);
            ctx.arcTo(W, H, 0, H, r);
            ctx.arcTo(0, H, 0, 0, r);
            ctx.arcTo(0, 0, W, 0, r);
            ctx.closePath();
          } : undefined}
        >
          {/* Outer background (white) */}
          <Rect width={W} height={H} fill="#FFFFFF" />

          {/* ── Header (flex-end aligned within HDR area) ── */}
          <Text
            x={PAD}
            y={PAD + HDR - 33}
            text={copy.title}
            fontSize={20}
            fontStyle="900"
            fill={INK}
            letterSpacing={20 * -0.02}
            fontFamily={FT}
          />
          <Text
            x={PAD}
            y={PAD + HDR - 9}
            text={`${copy.sub} \u00B7 ${cityEntries.length} CITIES`}
            fontSize={9}
            fontStyle="700"
            fill={MUTED}
            letterSpacing={9 * 0.15}
            fontFamily={FT}
          />

          {/* ── Panel A (top-left): Cities ── */}
          <Rect
            x={p0x} y={p0y} width={PW} height={PH}
            fill={PBG}
            cornerRadius={sty.panelRadius}
            stroke={panelStroke}
            strokeWidth={panelStrokeWidth}
            {...panelShadow}
          />
          <Group
            clipFunc={(ctx) => {
              const r = sty.panelRadius;
              ctx.beginPath();
              ctx.moveTo(p0x + r, p0y);
              ctx.arcTo(p0x + PW, p0y, p0x + PW, p0y + PH, r);
              ctx.arcTo(p0x + PW, p0y + PH, p0x, p0y + PH, r);
              ctx.arcTo(p0x, p0y + PH, p0x, p0y, r);
              ctx.arcTo(p0x, p0y, p0x + PW, p0y, r);
              ctx.closePath();
            }}
          >
            <KPanelPills cities={cities} ox={p0x} oy={p0y} pw={PW} ph={PH} />
          </Group>

          {/* ── Panel B (top-right): Topics ── */}
          <Rect
            x={p1x} y={p1y} width={PW} height={PH}
            fill={PBG}
            cornerRadius={sty.panelRadius}
            stroke={panelStroke}
            strokeWidth={panelStrokeWidth}
            {...panelShadow}
          />
          <Group
            clipFunc={(ctx) => {
              const r = sty.panelRadius;
              ctx.beginPath();
              ctx.moveTo(p1x + r, p1y);
              ctx.arcTo(p1x + PW, p1y, p1x + PW, p1y + PH, r);
              ctx.arcTo(p1x + PW, p1y + PH, p1x, p1y + PH, r);
              ctx.arcTo(p1x, p1y + PH, p1x, p1y, r);
              ctx.arcTo(p1x, p1y, p1x + PW, p1y, r);
              ctx.closePath();
            }}
          >
            <KPanelTopics items={items} ox={p1x} oy={p1y} pw={PW} ph={PH} />
          </Group>

          {/* ── Panel C (bottom-left): Waffle ── */}
          <Rect
            x={p2x} y={p2y} width={PW} height={PH}
            fill={PBG}
            cornerRadius={sty.panelRadius}
            stroke={panelStroke}
            strokeWidth={panelStrokeWidth}
            {...panelShadow}
          />
          <Group
            clipFunc={(ctx) => {
              const r = sty.panelRadius;
              ctx.beginPath();
              ctx.moveTo(p2x + r, p2y);
              ctx.arcTo(p2x + PW, p2y, p2x + PW, p2y + PH, r);
              ctx.arcTo(p2x + PW, p2y + PH, p2x, p2y + PH, r);
              ctx.arcTo(p2x, p2y + PH, p2x, p2y, r);
              ctx.arcTo(p2x, p2y, p2x + PW, p2y, r);
              ctx.closePath();
            }}
          >
            <KPanelWaffle cities={cities} total={items.length} ox={p2x} oy={p2y} pw={PW} ph={PH} />
          </Group>

          {/* ── Panel D (bottom-right): Stats ── */}
          <Rect
            x={p3x} y={p3y} width={PW} height={PH}
            fill={PBG}
            cornerRadius={sty.panelRadius}
            stroke={panelStroke}
            strokeWidth={panelStrokeWidth}
            {...panelShadow}
          />
          <Group
            clipFunc={(ctx) => {
              const r = sty.panelRadius;
              ctx.beginPath();
              ctx.moveTo(p3x + r, p3y);
              ctx.arcTo(p3x + PW, p3y, p3x + PW, p3y + PH, r);
              ctx.arcTo(p3x + PW, p3y + PH, p3x, p3y + PH, r);
              ctx.arcTo(p3x, p3y + PH, p3x, p3y, r);
              ctx.arcTo(p3x, p3y, p3x + PW, p3y, r);
              ctx.closePath();
            }}
          >
            <KPanelStats
              cityCount={cityEntries.length}
              totalItems={items.length}
              topCity={cityEntries[0]?.name ?? ""}
              ox={p3x}
              oy={p3y}
              pw={PW}
              ph={PH}
            />
          </Group>

          {/* ── Footer ── */}
          <Text
            x={0}
            y={H - PAD - FTR + (FTR - 10) / 2}
            width={W}
            text="METOO"
            fontSize={10}
            fontStyle="800"
            fill={MUTED}
            letterSpacing={10 * 0.2}
            fontFamily={FT}
            align="center"
            opacity={0.5}
          />
        </Group>
      </KonvaPosterStage>
    </PalContext.Provider>
  );
}

export default DataPostcardPoster;
