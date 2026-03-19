import { useMemo } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { Rect, Text, Line, Group, Circle, Image as KImage } from "react-konva";
import useImage from "use-image";
import type { PosterModuleProps } from "../../lib/poster-modules";
import { KonvaPosterStage } from "../../lib/poster-stage";
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

const FONT_CN = "'Noto Sans SC', 'PingFang SC', system-ui, sans-serif";
const FONT_UI = "ui-sans-serif, system-ui, sans-serif";

/* ── SVG-to-Konva helper: renders a React SVG element as a KImage ── */
function SvgIcon({ element, x, y, size }: { element: React.ReactElement; x: number; y: number; size: number }) {
  const markup = useMemo(() => renderToStaticMarkup(element), [element]);
  const dataUrl = useMemo(() => "data:image/svg+xml," + encodeURIComponent(markup), [markup]);
  const [img] = useImage(dataUrl);
  return img ? <KImage image={img} x={x} y={y} width={size} height={size} /> : null;
}

/* ── Cover image cell rendered via useImage ── */
function CoverCell({ src, x, y, size, cornerRadius }: { src: string; x: number; y: number; size: number; cornerRadius: number }) {
  const [img] = useImage(src, "anonymous");
  if (!img) return null;

  // Compute cover-fit crop
  const imgW = img.naturalWidth || img.width;
  const imgH = img.naturalHeight || img.height;
  const imgAspect = imgW / imgH;
  let cropW = imgW;
  let cropH = imgH;
  let cropX = 0;
  let cropY = 0;
  if (imgAspect > 1) {
    cropW = imgH;
    cropX = (imgW - imgH) / 2;
  } else {
    cropH = imgW;
    cropY = (imgH - imgW) / 2;
  }

  return (
    <Group
      x={x}
      y={y}
      clipFunc={(ctx) => {
        const r = cornerRadius;
        ctx.beginPath();
        ctx.moveTo(r, 0);
        ctx.arcTo(size, 0, size, size, r);
        ctx.arcTo(size, size, 0, size, r);
        ctx.arcTo(0, size, 0, 0, r);
        ctx.arcTo(0, 0, size, 0, r);
        ctx.closePath();
      }}
    >
      <KImage
        image={img}
        x={0}
        y={0}
        width={size}
        height={size}
        crop={{ x: cropX, y: cropY, width: cropW, height: cropH }}
      />
    </Group>
  );
}

/* ── Generated icon renderer — produces a React element for SvgIcon ── */
function generatedIconElement(index: number, size: number, color: string, seed: number): React.ReactElement {
  const type = ICON_TYPE_CYCLE[index % ICON_TYPE_CYCLE.length];
  const rng = mulberry32(seed + index * 7919);

  if (type === "pixel") {
    const spriteIdx = Math.floor(rng() * SPRITE_NAMES.length);
    return <PixelSpriteSVG spriteName={SPRITE_NAMES[spriteIdx]} size={size} color={color} />;
  }

  if (type === "elevation") {
    const personSeed = Math.floor(rng() * 100000);
    return <ElevationPersonSVG seed={personSeed} size={size} artStyle="line" />;
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
    <svg viewBox="0 0 40 44" width={size} height={size} xmlns="http://www.w3.org/2000/svg" style={{ overflow: "visible", color }}>
      <g dangerouslySetInnerHTML={{ __html: svgHtml }} />
    </svg>
  );
}

/* ── Cell pattern overlay — stripe / dot in Konva ── */
function CellPatternOverlay({ theme, ink, x, y, size, cornerRadius }: { theme: MosaicThemeId; ink: string; x: number; y: number; size: number; cornerRadius: number }) {
  if (theme === "solid") return null;

  if (theme === "stripe") {
    const gap = Math.round(size * 0.11);
    const sw = Math.max(1.5, size * 0.015);
    const lineCount = Math.ceil((size * 2) / gap);
    return (
      <Group
        x={x}
        y={y}
        clipFunc={(ctx) => {
          const r = cornerRadius;
          ctx.beginPath();
          ctx.moveTo(r, 0);
          ctx.arcTo(size, 0, size, size, r);
          ctx.arcTo(size, size, 0, size, r);
          ctx.arcTo(0, size, 0, 0, r);
          ctx.arcTo(0, 0, size, 0, r);
          ctx.closePath();
        }}
      >
        {Array.from({ length: lineCount }, (_, i) => {
          const offset = -size + i * gap;
          return (
            <Line
              key={i}
              points={[offset, size, offset + size, 0]}
              stroke={ink}
              strokeWidth={sw}
              opacity={0.12}
            />
          );
        })}
      </Group>
    );
  }

  // dot
  const dotR = Math.max(2, size * 0.025);
  const gap = Math.round(size * 0.11);
  const cols = Math.ceil(size / gap);
  const rows = Math.ceil(size / gap);
  return (
    <Group
      x={x}
      y={y}
      clipFunc={(ctx) => {
        const r = cornerRadius;
        ctx.beginPath();
        ctx.moveTo(r, 0);
        ctx.arcTo(size, 0, size, size, r);
        ctx.arcTo(size, size, 0, size, r);
        ctx.arcTo(0, size, 0, 0, r);
        ctx.arcTo(0, 0, size, 0, r);
        ctx.closePath();
      }}
    >
      {Array.from({ length: cols * rows }, (_, i) => {
        const col = i % cols;
        const row = Math.floor(i / cols);
        const cx = gap * 0.5 + col * gap;
        const cy = gap * 0.5 + row * gap;
        return <Circle key={i} x={cx} y={cy} radius={dotR} fill={ink} opacity={0.1} />;
      })}
    </Group>
  );
}

/* ── Crosshatch background — small cross marks ── */
function CrosshatchBackground({ ink }: { ink: string }) {
  const crosses = useMemo(() => {
    const items: { x: number; y: number }[] = [];
    for (let i = 0; i < 180; i++) {
      const col = i % 18;
      const row = Math.floor(i / 18);
      items.push({ x: 30 + col * 44, y: 30 + row * 110 });
    }
    return items;
  }, []);

  return (
    <Group>
      {crosses.map((c, i) => (
        <Group key={i} opacity={0.06}>
          <Line points={[c.x - 3, c.y, c.x + 3, c.y]} stroke={ink} strokeWidth={1.5} />
          <Line points={[c.x, c.y - 3, c.x, c.y + 3]} stroke={ink} strokeWidth={1.5} />
        </Group>
      ))}
    </Group>
  );
}

/* ── Cell background with rounded corners + optional border + shadow ── */
function CellBackground({
  x, y, size, fill, sty, ink,
}: {
  x: number; y: number; size: number; fill: string;
  sty: MosaicStylePreset; ink: string;
}) {
  const hasShadow = sty.shadowOffset > 0;
  const hasBlur = sty.shadowBlur > 0;
  return (
    <Group>
      {/* Drop shadow (offset-based) */}
      {hasShadow && (
        <Rect
          x={x + sty.shadowOffset}
          y={y + sty.shadowOffset}
          width={size}
          height={size}
          fill={ink}
          cornerRadius={sty.borderRadius}
        />
      )}
      {/* Blur shadow */}
      {hasBlur && (
        <Rect
          x={x}
          y={y}
          width={size}
          height={size}
          fill={fill}
          cornerRadius={sty.borderRadius}
          shadowColor={ink}
          shadowBlur={sty.shadowBlur}
          shadowOpacity={0.25}
        />
      )}
      {/* Main fill */}
      <Rect
        x={x}
        y={y}
        width={size}
        height={size}
        fill={fill}
        cornerRadius={sty.borderRadius}
        stroke={sty.borderWidth > 0 ? ink : undefined}
        strokeWidth={sty.borderWidth > 0 ? sty.borderWidth : undefined}
      />
    </Group>
  );
}

/* ── Main Component ── */

function GridMosaicPoster({ items, cityEntries, posterWidth: POSTER_W, posterHeight: POSTER_H }: PosterModuleProps) {
  const mosaicThemeIdx = useMapStore((s) => s.mosaicThemeIdx);
  const themeId = MOSAIC_THEMES[mosaicThemeIdx]?.id ?? "solid";

  /* Scale grid dimensions proportionally to poster width */
  const ratio = POSTER_W / BASE_W;
  const CELL = Math.round(138 * ratio);
  const GAP = Math.round(14 * ratio);
  const GRID_W = CELL * 4 + GAP * 3;
  const GRID_X = Math.round((POSTER_W - GRID_W) / 2);
  const GRID_Y = 48;

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

  /* ── Precompute icon elements for SvgIcon ── */
  const iconElements = useMemo(() => {
    const elements: Record<string, React.ReactElement> = {};
    for (let ri = 0; ri < LAYOUT.length; ri++) {
      for (let ci = 0; ci < LAYOUT[ri].length; ci++) {
        const cell = LAYOUT[ri][ci];
        if (cell.startsWith("I")) {
          const iIdx = parseInt(cell.substring(1));
          elements[cell] = generatedIconElement(iIdx, 70, pal.ink, iconSeed);
        }
        // Fallback cover → icon
        if (cell.startsWith("C")) {
          const cIdx = parseInt(cell.substring(1));
          if (!covers[cIdx]) {
            elements[cell] = generatedIconElement(ri * 2 + ci, 70, pal.ink, iconSeed);
          }
        }
      }
    }
    return elements;
  }, [pal.ink, iconSeed, covers]);

  /* ── Bottom info card layout ── */
  const INFO_PAD_X = 28;
  const INFO_PAD_Y = 22;
  const INFO_H = 110;
  const INFO_Y = POSTER_H - 32 - 30 - INFO_H; // leave room for brand footer
  const INFO_X = GRID_X;
  const INFO_W = GRID_W;

  /* ── Brand footer Y ── */
  const BRAND_Y = POSTER_H - 32;

  /* ── Text stroke props ── */
  const textStrokeProps = sty.textStroke
    ? { stroke: pal.ink, strokeWidth: parseFloat(sty.textStroke) || 1.5 }
    : {};

  return (
    <KonvaPosterStage width={POSTER_W} height={POSTER_H}>
      {/* Rounded-corner clip */}
      <Group
        clipFunc={(ctx) => {
          const r = 24;
          ctx.beginPath();
          ctx.moveTo(r, 0);
          ctx.arcTo(POSTER_W, 0, POSTER_W, POSTER_H, r);
          ctx.arcTo(POSTER_W, POSTER_H, 0, POSTER_H, r);
          ctx.arcTo(0, POSTER_H, 0, 0, r);
          ctx.arcTo(0, 0, POSTER_W, 0, r);
          ctx.closePath();
        }}
      >
        {/* White background */}
        <Rect width={POSTER_W} height={POSTER_H} fill="#FFFFFF" />

        {/* Crosshatch background (conditional) */}
        {sty.crosshatch && (
          <CrosshatchBackground ink={pal.ink} />
        )}

        {/* ── Grid cells ── */}
        {LAYOUT.map((row, ri) =>
          row.map((cell, ci) => {
            const bg = pal.cells[COLOR_IDX[ri][ci]];
            const cx = GRID_X + ci * (CELL + GAP);
            const cy = GRID_Y + ri * (CELL + GAP);
            const key = `${ri}-${ci}`;

            /* Text cell — bold city character */
            if (cell.startsWith("T")) {
              const idx = parseInt(cell.substring(1));
              return (
                <Group key={key}>
                  <CellBackground x={cx} y={cy} size={CELL} fill={bg} sty={sty} ink={pal.ink} />
                  <CellPatternOverlay theme={themeId} ink={pal.ink} x={cx} y={cy} size={CELL} cornerRadius={sty.borderRadius} />
                  <Text
                    x={cx}
                    y={cy}
                    width={CELL}
                    height={CELL}
                    text={gridChars[idx]}
                    fontSize={72}
                    fontStyle="900"
                    fill={pal.ink}
                    fontFamily={FONT_CN}
                    align="center"
                    verticalAlign="middle"
                    {...textStrokeProps}
                  />
                </Group>
              );
            }

            /* Cover photo cell */
            if (cell.startsWith("C")) {
              const cIdx = parseInt(cell.substring(1));
              const src = covers[cIdx];
              if (!src) {
                /* Fallback → icon */
                const iconEl = iconElements[cell];
                const iconSize = 70;
                return (
                  <Group key={key}>
                    <CellBackground x={cx} y={cy} size={CELL} fill={bg} sty={sty} ink={pal.ink} />
                    <CellPatternOverlay theme={themeId} ink={pal.ink} x={cx} y={cy} size={CELL} cornerRadius={sty.borderRadius} />
                    {iconEl && (
                      <SvgIcon
                        element={iconEl}
                        x={cx + (CELL - iconSize) / 2}
                        y={cy + (CELL - iconSize) / 2}
                        size={iconSize}
                      />
                    )}
                  </Group>
                );
              }
              return (
                <Group key={key}>
                  <CellBackground x={cx} y={cy} size={CELL} fill={bg} sty={sty} ink={pal.ink} />
                  <CoverCell src={src} x={cx} y={cy} size={CELL} cornerRadius={sty.borderRadius} />
                </Group>
              );
            }

            /* Icon cell — generated SVG icon */
            const iconEl = iconElements[cell];
            const iconSize = 70;
            return (
              <Group key={key}>
                <CellBackground x={cx} y={cy} size={CELL} fill={bg} sty={sty} ink={pal.ink} />
                <CellPatternOverlay theme={themeId} ink={pal.ink} x={cx} y={cy} size={CELL} cornerRadius={sty.borderRadius} />
                {iconEl && (
                  <SvgIcon
                    element={iconEl}
                    x={cx + (CELL - iconSize) / 2}
                    y={cy + (CELL - iconSize) / 2}
                    size={iconSize}
                  />
                )}
              </Group>
            );
          })
        )}

        {/* ── Bottom info card — inverted color scheme ── */}
        <Group x={INFO_X} y={INFO_Y}>
          {/* Shadow (offset or blur based) */}
          {sty.shadowOffset > 0 && (
            <Rect
              x={sty.shadowOffset}
              y={sty.shadowOffset}
              width={INFO_W}
              height={INFO_H}
              fill={pal.accent}
              cornerRadius={sty.borderRadius}
            />
          )}
          {sty.shadowBlur > 0 && (
            <Rect
              width={INFO_W}
              height={INFO_H}
              fill={pal.ink}
              cornerRadius={sty.borderRadius}
              shadowColor={pal.accent}
              shadowBlur={sty.shadowBlur}
              shadowOpacity={0.25}
            />
          )}
          {/* Background */}
          <Rect
            width={INFO_W}
            height={INFO_H}
            fill={pal.ink}
            cornerRadius={sty.borderRadius}
            stroke={sty.borderWidth > 0 ? pal.accent : undefined}
            strokeWidth={sty.borderWidth > 0 ? sty.borderWidth : undefined}
          />

          {/* Big number */}
          <Text
            x={INFO_PAD_X}
            y={INFO_PAD_Y}
            text={String(cityCount)}
            fontSize={60}
            fontStyle="900"
            fill={pal.accent}
            fontFamily={FONT_CN}
            lineHeight={1}
          />
          <Text
            x={INFO_PAD_X}
            y={INFO_PAD_Y + 62}
            text="CITIES"
            fontSize={10}
            fontStyle="800"
            fill={pal.bg}
            opacity={0.6}
            letterSpacing={10 * 0.15}
            fontFamily={FONT_UI}
          />

          {/* Divider */}
          <Rect
            x={INFO_PAD_X + 80}
            y={INFO_PAD_Y + 4}
            width={3}
            height={INFO_H - INFO_PAD_Y * 2 - 8}
            fill={pal.accent}
            opacity={0.4}
            cornerRadius={2}
          />

          {/* Text content */}
          <Text
            x={INFO_PAD_X + 100}
            y={INFO_PAD_Y + 4}
            text={subtitle}
            fontSize={22}
            fontStyle="900"
            fill={pal.bg}
            letterSpacing={22 * -0.02}
            fontFamily={FONT_CN}
            width={INFO_W - INFO_PAD_X - 100 - INFO_PAD_X}
          />
          <Text
            x={INFO_PAD_X + 100}
            y={INFO_PAD_Y + 36}
            text={description}
            fontSize={12}
            fill={pal.bg}
            opacity={0.7}
            lineHeight={1.6}
            fontFamily={FONT_CN}
            width={INFO_W - INFO_PAD_X - 100 - INFO_PAD_X}
          />
        </Group>

        {/* ── Brand footer ── */}
        <Text
          x={0}
          y={BRAND_Y}
          width={POSTER_W}
          text="METOO · 城市拼贴"
          fontSize={13}
          fontStyle="900"
          fill={pal.ink}
          opacity={0.35}
          letterSpacing={13 * 0.2}
          fontFamily={FONT_CN}
          align="center"
        />
      </Group>
    </KonvaPosterStage>
  );
}

export default GridMosaicPoster;
