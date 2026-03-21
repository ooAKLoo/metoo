import { useMemo } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { Rect, Text, Line, Group, Circle, Image as KImage, Shape } from "react-konva";
import useImage from "use-image";
import { detectPosterRatio, type PosterModuleProps, type PosterRatio } from "../../lib/poster-modules";
import { KonvaPosterStage } from "../../lib/poster-stage";
import { coverSrc } from "../map-shared";
import { PixelSpriteSVG, SPRITE_NAMES } from "../poster-generators/PixelSprites";
import { ElevationPersonSVG } from "../poster-generators/ElevationPeople";
import { CharacterSVG, POSE_CATEGORIES, BODY_TYPES } from "../poster-generators/CharacterGenerator";
import { mulberry32, DOODLE_ENTRIES } from "../poster-generators/DoodleGallery";
import { NeonSignSVG, NEON_SIGN_COUNT } from "../poster-generators/NeonSigns";
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
}

export const MOSAIC_STYLES: MosaicStylePreset[] = [
  {
    id: "sketch", label: "手绘",
    borderWidth: 2, shadowOffset: 3, shadowBlur: 0, borderRadius: 4,
    insetShadow: "", textStroke: "1.5px", noiseOverlay: true,   },
  {
    id: "neon", label: "霓虹",
    borderWidth: 2, shadowOffset: 0, shadowBlur: 14, borderRadius: 14,
    insetShadow: "", textStroke: "2px", noiseOverlay: false,   },
];

/* ── 色相推导引擎 — 单一色相 → 全套配色 ── */
import { hslToHex } from "./PopBoardPoster";

interface MosaicPalette { bg: string; cells: string[]; ink: string; accent: string }

export function deriveMosaicPalette(hue: number, styleId?: string): MosaicPalette {
  const h = hue;

  switch (styleId) {
    /* ── 手绘: 水彩画板 — 低饱和暖色系 + 一两个清冷色点睛 ── */
    /*  策略: 不用均匀彩虹，而是构建"纸上水彩"感 —
     *  4 个暖色调（赭/杏/鹅黄/玫瑰）+ 2 个清冷色（水蓝/薄荷）+ 2 个极淡底
     *  明度分层 72-92%，饱和度 30-55%，区别清晰但不刺眼 */
    case "sketch":
      return {
        bg:     "#FFFDF8",                             // 奶白画纸色
        ink:    "#3D4F5F",                             // 蓝灰铅笔色
        accent: hslToHex(h, 50, 58),
        cells: [
          hslToHex(h,        50, 78),   // [0] 主色淡彩（温和锚定）
          hslToHex(25,       55, 82),   // [1] 杏色（暖基调）
          hslToHex(200,      40, 80),   // [2] 水蓝（冷对比）
          hslToHex(48,       50, 85),   // [3] 鹅黄（明亮阳光）
          hslToHex(345,      40, 83),   // [4] 玫瑰灰（柔粉）
          hslToHex(160,      35, 82),   // [5] 薄荷（清新）
          hslToHex(15,       45, 87),   // [6] 浅陶土（暖底）
          hslToHex(h + 180,  30, 90),   // [7] 互补极淡（呼吸留白）
        ],
      };

    /* ── 霓虹: 三色灯管 + 暗色阶梯 — 真实霓虹街区感 ── */
    /*  策略: 真实霓虹灯管只有 2-3 种颜色，其余是暗色底面
     *  主色 h 高亮、暖偏移 h+50 次亮、冷偏移 h+200 点缀
     *  用 2 个深色暗格（建筑墙面感）代替重复色 → 形成明暗节奏 */
    case "neon":
      return {
        bg:     "#0F0F1A",                             // 更深的夜空底
        ink:    "#D8D8EC",                             // 柔白文字
        accent: hslToHex(h, 100, 58),                  // 主灯管色
        cells: [
          hslToHex(h,        100, 58),  // [0] 主灯管 — 明亮
          hslToHex(h + 50,    95, 55),  // [1] 暖灯管（琥珀/粉方向）
          hslToHex(h + 200,   85, 52),  // [2] 冷灯管（对比色）
          hslToHex(h,         30, 18),  // [3] 深色墙面 A（暗休息）
          hslToHex(h,        100, 62),  // [4] 主灯管 — 柔亮
          hslToHex(h + 50,    40, 22),  // [5] 深色墙面 B（微暖暗）
          hslToHex(h + 200,   80, 58),  // [6] 冷灯管 — 提亮
          hslToHex(h + 330,   90, 62),  // [7] 热粉点缀（霓虹感）
        ],
      };

    /* ── 默认 fallback — 同色系渐变 ── */
    default:
      return {
        bg:     "#ffffff",
        ink:    hslToHex(h, 15, 18),
        accent: hslToHex(h, 60, 55),
        cells: [
          hslToHex(h,        50, 70),
          hslToHex(h + 15,   45, 74),
          hslToHex(h - 15,   42, 68),
          hslToHex(h + 25,   38, 76),
          hslToHex(h - 25,   40, 72),
          hslToHex(h + 10,   35, 78),
          hslToHex(h - 10,   44, 70),
          hslToHex(h + 5,    30, 80),
        ],
      };
  }
}

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
function generatedIconElement(index: number, size: number, color: string, seed: number, styleId?: string): React.ReactElement {
  /* Neon style → use dedicated neon sign SVGs */
  if (styleId === "neon") {
    const rng = mulberry32(seed + index * 7919);
    const neonIdx = Math.floor(rng() * NEON_SIGN_COUNT);
    return <NeonSignSVG index={neonIdx} size={size} />;
  }

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

/* ── Wobbly rect — hand-drawn border using bezier curves ── */
function WobblyRect({
  x, y, w, h, fill, stroke, strokeWidth, seed, opacity,
}: {
  x: number; y: number; w: number; h: number;
  fill?: string; stroke?: string; strokeWidth?: number;
  seed: number; opacity?: number;
}) {
  const wb = (n: number) => (Math.sin(seed * n * 1.7) * 0.5 + 0.5) * 5 - 2.5;
  return (
    <Shape
      opacity={opacity}
      fill={fill}
      stroke={stroke}
      strokeWidth={strokeWidth}
      sceneFunc={(ctx, shape) => {
        ctx.beginPath();
        ctx.moveTo(x + wb(1), y + wb(2));
        ctx.quadraticCurveTo(x + w * 0.35 + wb(3), y + wb(4) - 1.5, x + w * 0.65 + wb(17), y + wb(18) + 1);
        ctx.quadraticCurveTo(x + w * 0.85 + wb(5), y + wb(6) - 0.5, x + w + wb(7), y + wb(8));
        ctx.quadraticCurveTo(x + w + wb(9) + 1.5, y + h * 0.5 + wb(10), x + w + wb(11), y + h + wb(12));
        ctx.quadraticCurveTo(x + w * 0.5 + wb(13), y + h + wb(14) + 1.5, x + wb(15), y + h + wb(16));
        ctx.quadraticCurveTo(x + wb(19) - 1.5, y + h * 0.5 + wb(20), x + wb(1), y + wb(2));
        ctx.closePath();
        ctx.fillStrokeShape(shape);
      }}
    />
  );
}

/* ── Scribble lines — hand-drawn marks under a cell ── */
function ScribbleLines({
  x, y, w, seed, ink, strokeW,
}: {
  x: number; y: number; w: number; seed: number; ink: string; strokeW: number;
}) {
  return (
    <Group>
      {[0, 1, 2].map((i) => {
        const lineW = w * (0.25 + (Math.sin(seed + i * 3.7) * 0.5 + 0.5) * 0.45);
        const ox = (Math.sin(seed * (i + 1) * 2.3) * 0.5 + 0.5) * w * 0.35;
        const oy = i * (strokeW * 2.2);
        const wobY = Math.cos(seed + i * 5.1) * 1.5;
        return (
          <Line key={i}
            points={[x + ox, y + oy, x + ox + lineW, y + oy + wobY]}
            stroke={ink} strokeWidth={strokeW * 0.65}
            opacity={0.65} lineCap="round" />
        );
      })}
    </Group>
  );
}

/* ── Cell background — style-aware rendering ── */
function CellBackground({
  x, y, size, fill, sty, ink,
}: {
  x: number; y: number; size: number; fill: string;
  sty: MosaicStylePreset; ink: string;
}) {
  /* ── 手绘: 摇摆边框 + 粗描边 + 涂鸦装饰 ── */
  if (sty.id === "sketch") {
    const seed = x * 7 + y * 13; // deterministic per cell
    return (
      <Group>
        {/* Pencil shadow — wobbly */}
        <WobblyRect x={x + 3} y={y + 3} w={size} h={size}
          fill={ink} seed={seed + 99} opacity={0.1} />
        {/* Main fill — wobbly border */}
        <WobblyRect x={x} y={y} w={size} h={size}
          fill={fill} stroke={ink} strokeWidth={2.5} seed={seed} />
      </Group>
    );
  }

  /* ── 霓虹: 暗底 + 霓虹色光晕反射 + 发光描边 ── */
  if (sty.id === "neon") {
    return (
      <Group>
        {/* Outer glow halo */}
        <Rect x={x - 2} y={y - 2} width={size + 4} height={size + 4}
          cornerRadius={16} stroke={fill} strokeWidth={4}
          shadowColor={fill} shadowBlur={24} shadowOpacity={0.5} />
        {/* Dark base */}
        <Rect x={x} y={y} width={size} height={size}
          fill="#0F0F1A" cornerRadius={14} />
        {/* Neon color tint — glow reflection on wall */}
        <Rect x={x} y={y} width={size} height={size}
          fill={fill} opacity={0.1} cornerRadius={14}
          stroke={fill} strokeWidth={2} />
      </Group>
    );
  }

  /* ── Default ── */
  const hasShadow = sty.shadowOffset > 0;
  const hasBlur = sty.shadowBlur > 0;
  return (
    <Group>
      {hasShadow && (
        <Rect x={x + sty.shadowOffset} y={y + sty.shadowOffset}
          width={size} height={size} fill={ink}
          cornerRadius={sty.borderRadius} />
      )}
      {hasBlur && (
        <Rect x={x} y={y} width={size} height={size}
          fill={fill} cornerRadius={sty.borderRadius}
          shadowColor={fill} shadowBlur={sty.shadowBlur} shadowOpacity={0.4} />
      )}
      <Rect x={x} y={y} width={size} height={size}
        fill={fill} cornerRadius={sty.borderRadius}
        stroke={sty.borderWidth > 0 ? ink : undefined}
        strokeWidth={sty.borderWidth > 0 ? sty.borderWidth : undefined} />
    </Group>
  );
}

/* ── Per-ratio layout config ── */

interface MosaicLayout {
  gridY: number;
  infoH: number;
  infoToBrandGap: number;
  brandFooterH: number;
  gapRatio: number;
  sideMargin: number;
  gridCols: number;
  gridRows: number;
  clipR: number;
  infoPadX: number;
  infoPadY: number;
  bigNumberFS: number;
  citiesLabelFS: number;
  subtitleFS: number;
  descriptionFS: number;
  brandFS: number;
  neonGridSpacing: number;
  bottomPadding: number;
  dividerX: number;
  dividerW: number;
  textBlockX: number;
}

const BASE_LAYOUT: MosaicLayout = {
  gridY: 48,
  infoH: 110,
  infoToBrandGap: 30,
  brandFooterH: 32,
  gapRatio: 14 / 138,
  sideMargin: 32,
  gridCols: 4,
  gridRows: 5,
  clipR: 24,
  infoPadX: 28,
  infoPadY: 22,
  bigNumberFS: 60,
  citiesLabelFS: 10,
  subtitleFS: 22,
  descriptionFS: 12,
  brandFS: 13,
  neonGridSpacing: 60,
  bottomPadding: 16,
  dividerX: 80,
  dividerW: 3,
  textBlockX: 100,
};

const RATIO_LAYOUTS: Record<PosterRatio, MosaicLayout> = {
  "4:3": BASE_LAYOUT,
  "1:1": {
    ...BASE_LAYOUT,
    gridY: 36,
    infoH: 90,
    infoToBrandGap: 24,
    brandFooterH: 28,
    sideMargin: 28,
    clipR: 20,
    infoPadX: 22,
    infoPadY: 18,
    bigNumberFS: 48,
    citiesLabelFS: 8,
    subtitleFS: 18,
    descriptionFS: 10,
    brandFS: 11,
    neonGridSpacing: 50,
    bottomPadding: 12,
    dividerX: 64,
    dividerW: 2,
    textBlockX: 80,
  },
  "3:4": {
    ...BASE_LAYOUT,
    gridY: 40,
    infoH: 96,
    infoToBrandGap: 26,
    brandFooterH: 28,
    sideMargin: 28,
    clipR: 20,
    infoPadX: 24,
    infoPadY: 20,
    bigNumberFS: 52,
    citiesLabelFS: 9,
    subtitleFS: 19,
    descriptionFS: 11,
    brandFS: 11,
    neonGridSpacing: 52,
    bottomPadding: 14,
    dividerX: 68,
    dividerW: 3,
    textBlockX: 86,
  },
  "16:9": {
    ...BASE_LAYOUT,
    gridY: 56,
    infoH: 124,
    infoToBrandGap: 34,
    brandFooterH: 36,
    sideMargin: 38,
    clipR: 28,
    infoPadX: 32,
    infoPadY: 26,
    bigNumberFS: 68,
    citiesLabelFS: 12,
    subtitleFS: 26,
    descriptionFS: 14,
    brandFS: 15,
    neonGridSpacing: 70,
    bottomPadding: 18,
    dividerX: 92,
    dividerW: 3,
    textBlockX: 116,
  },
};

/* ── Main Component ── */

function GridMosaicPoster({ items, cityEntries, posterWidth: POSTER_W, posterHeight: POSTER_H }: PosterModuleProps) {
  const ratio = detectPosterRatio(POSTER_W, POSTER_H);
  const L = RATIO_LAYOUTS[ratio];

  const mosaicThemeIdx = useMapStore((s) => s.mosaicThemeIdx);
  const themeId = MOSAIC_THEMES[mosaicThemeIdx]?.id ?? "solid";

  /* Scale grid to fit both width and height */
  const BOTTOM_H = L.infoH + L.infoToBrandGap + L.brandFooterH;

  const availW = POSTER_W - L.sideMargin * 2;
  const availH = POSTER_H - L.gridY - BOTTOM_H - L.bottomPadding;

  const maxByW = availW / (L.gridCols + (L.gridCols - 1) * L.gapRatio);
  const maxByH = availH / (L.gridRows + (L.gridRows - 1) * L.gapRatio);
  const CELL = Math.round(Math.min(maxByW, maxByH));
  const GAP = Math.round(CELL * L.gapRatio);
  const GRID_W = CELL * L.gridCols + GAP * (L.gridCols - 1);
  const GRID_X = Math.round((POSTER_W - GRID_W) / 2);

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
      if (out.length >= 10) break;
    }
    return out;
  }, [cityEntries]);

  /* ── Pick palette & style ── */
  const mosaicHue = useMapStore((s) => s.mosaicHue);
  const mosaicStyleIdx = useMapStore((s) => s.mosaicStyleIdx);
  const figureSeed = useMapStore((s) => s.figureSeed);
  const sty = MOSAIC_STYLES[mosaicStyleIdx] ?? MOSAIC_STYLES[0];
  const pal = useMemo(() => deriveMosaicPalette(mosaicHue, sty.id), [mosaicHue, sty.id]);

  /* ── Stats ── */
  const cityCount = cityEntries.length;
  const totalItems = items.length;
  const iconSeed = cityCount * 31 + totalItems + figureSeed;
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
        const iconColor = pal.ink;
        if (cell.startsWith("I")) {
          const iIdx = parseInt(cell.substring(1));
          elements[cell] = generatedIconElement(iIdx, Math.round(CELL * 0.5), iconColor, iconSeed, sty.id);
        }
        // Fallback cover → icon
        if (cell.startsWith("C")) {
          const cIdx = parseInt(cell.substring(1));
          if (!covers[cIdx]) {
            elements[cell] = generatedIconElement(ri * 2 + ci, Math.round(CELL * 0.5), iconColor, iconSeed, sty.id);
          }
        }
      }
    }
    return elements;
  }, [pal.ink, pal.bg, pal.cells, sty.id, iconSeed, covers, CELL]);

  /* ── Bottom info card layout ── */
  const INFO_H = L.infoH;
  const INFO_PAD_X = L.infoPadX;
  const INFO_PAD_Y = L.infoPadY;
  const INFO_Y = POSTER_H - L.brandFooterH - L.infoToBrandGap - INFO_H;
  const INFO_X = GRID_X;
  const INFO_W = GRID_W;

  /* ── Brand footer Y ── */
  const BRAND_Y = POSTER_H - L.brandFooterH;

  /* ── Text stroke props ── */
  const textStrokeProps = sty.textStroke
    ? { stroke: pal.ink, strokeWidth: parseFloat(sty.textStroke) || 1.5 }
    : {};

  return (
    <KonvaPosterStage width={POSTER_W} height={POSTER_H}>
      {/* Rounded-corner clip */}
      <Group
        clipFunc={(ctx) => {
          const r = L.clipR;
          ctx.beginPath();
          ctx.moveTo(r, 0);
          ctx.arcTo(POSTER_W, 0, POSTER_W, POSTER_H, r);
          ctx.arcTo(POSTER_W, POSTER_H, 0, POSTER_H, r);
          ctx.arcTo(0, POSTER_H, 0, 0, r);
          ctx.arcTo(0, 0, POSTER_W, 0, r);
          ctx.closePath();
        }}
      >
        {/* Background */}
        <Rect width={POSTER_W} height={POSTER_H} fill={pal.bg} />

        {/* Neon: subtle grid lines */}
        {sty.id === "neon" && (
          <Group opacity={0.08}>
            {Array.from({ length: Math.ceil(POSTER_W / L.neonGridSpacing) }, (_, i) => (
              <Line key={`v${i}`} points={[i * L.neonGridSpacing, 0, i * L.neonGridSpacing, POSTER_H]}
                stroke={pal.accent} strokeWidth={0.5} />
            ))}
            {Array.from({ length: Math.ceil(POSTER_H / L.neonGridSpacing) }, (_, i) => (
              <Line key={`h${i}`} points={[0, i * L.neonGridSpacing, POSTER_W, i * L.neonGridSpacing]}
                stroke={pal.accent} strokeWidth={0.5} />
            ))}
          </Group>
        )}

        {/* ── Grid cells ── */}
        {LAYOUT.map((row, ri) =>
          row.map((cell, ci) => {
            const bg = pal.cells[COLOR_IDX[ri][ci]];
            const cx = GRID_X + ci * (CELL + GAP);
            const cy = L.gridY + ri * (CELL + GAP);
            const key = `${ri}-${ci}`;
            // Neon: bright text on dark cells; Flat: adaptive per luminance; others: ink
            const cellTextColor = sty.id === "neon" ? bg : pal.ink;
            const cellTextStroke = sty.id === "neon"
              ? { stroke: bg, strokeWidth: 1.5, shadowColor: bg, shadowBlur: 12 }
              : textStrokeProps;

            /* Text cell — bold city character */
            if (cell.startsWith("T")) {
              const idx = parseInt(cell.substring(1));
              const isSketch = sty.id === "sketch";
              return (
                <Group key={key}>
                  <CellBackground x={cx} y={cy} size={CELL} fill={bg} sty={sty} ink={pal.ink} />
                  {!isSketch && (
                    <CellPatternOverlay theme={themeId} ink={pal.ink} x={cx} y={cy} size={CELL} cornerRadius={sty.borderRadius} />
                  )}
                  <Text
                    x={cx}
                    y={cy}
                    width={CELL}
                    height={isSketch ? CELL * 0.75 : CELL}
                    text={gridChars[idx]}
                    fontSize={Math.round(CELL * 0.52)}
                    fontStyle="900"
                    fill={cellTextColor}
                    fontFamily={FONT_CN}
                    align="center"
                    verticalAlign="middle"
                    {...cellTextStroke}
                  />
                  {/* Sketch: scribble caption lines */}
                  {isSketch && (
                    <ScribbleLines
                      x={cx + CELL * 0.15}
                      y={cy + CELL * 0.78}
                      w={CELL * 0.7}
                      seed={cx * 3 + cy * 7}
                      ink={pal.ink}
                      strokeW={2.5}
                    />
                  )}
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
                const iconSize = Math.round(CELL * 0.5);
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
            const iconSize = Math.round(CELL * 0.5);
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

        {/* ── Bottom info card ── */}
        <Group x={INFO_X} y={INFO_Y}>
          {/* Style-specific info card background */}
          {sty.id === "neon" ? (() => {
            /* 互补色深暗底 — 与主灯管形成色彩张力 */
            const compDark = hslToHex(mosaicHue + 180, 50, 10);
            return (<>
              <Rect width={INFO_W} height={INFO_H} cornerRadius={14}
                stroke={pal.accent} strokeWidth={2}
                shadowColor={pal.accent} shadowBlur={20} shadowOpacity={0.5} />
              {/* Deep complementary base */}
              <Rect width={INFO_W} height={INFO_H} fill={compDark}
                cornerRadius={14} />
              {/* Accent glow tint */}
              <Rect width={INFO_W} height={INFO_H} fill={pal.accent}
                opacity={0.06} cornerRadius={14}
                stroke={pal.accent} strokeWidth={1.5} />
            </>);
          })() : sty.id === "sketch" ? (<>
            <WobblyRect x={4} y={4} w={INFO_W} h={INFO_H}
              fill={pal.ink} seed={777} opacity={0.06} />
            <WobblyRect x={0} y={0} w={INFO_W} h={INFO_H}
              fill={pal.bg} stroke={pal.ink} strokeWidth={2.5} seed={888} />
          </>) : (<>
            {sty.shadowOffset > 0 && (
              <Rect x={sty.shadowOffset} y={sty.shadowOffset}
                width={INFO_W} height={INFO_H} fill={pal.accent}
                cornerRadius={sty.borderRadius} />
            )}
            <Rect width={INFO_W} height={INFO_H} fill={pal.ink}
              cornerRadius={sty.borderRadius}
              stroke={sty.borderWidth > 0 ? pal.accent : undefined}
              strokeWidth={sty.borderWidth > 0 ? sty.borderWidth : undefined} />
          </>)}

          {/* Big number */}
          {(() => {
            const infoText = sty.id === "neon" ? "#e8e8f4" : sty.id === "sketch" ? pal.ink : pal.bg;
            const numberColor = pal.accent;
            const dividerColor = pal.accent;
            return (<>
              <Text x={INFO_PAD_X} y={INFO_PAD_Y}
                text={String(cityCount)} fontSize={L.bigNumberFS} fontStyle="900"
                fill={numberColor} fontFamily={FONT_CN} lineHeight={1} />
              <Text x={INFO_PAD_X} y={INFO_PAD_Y + L.bigNumberFS + 2}
                text="CITIES" fontSize={L.citiesLabelFS} fontStyle="800"
                fill={infoText} opacity={0.6}
                letterSpacing={L.citiesLabelFS * 0.15} fontFamily={FONT_UI} />
              <Rect x={INFO_PAD_X + L.dividerX} y={INFO_PAD_Y + 4} width={L.dividerW}
                height={INFO_H - INFO_PAD_Y * 2 - 8}
                fill={dividerColor} opacity={0.4} cornerRadius={2} />
              <Text x={INFO_PAD_X + L.textBlockX} y={INFO_PAD_Y + 4}
                text={subtitle} fontSize={L.subtitleFS} fontStyle="900"
                fill={infoText} letterSpacing={L.subtitleFS * -0.02}
                fontFamily={FONT_CN} width={INFO_W - INFO_PAD_X - L.textBlockX - INFO_PAD_X} />
              <Text x={INFO_PAD_X + L.textBlockX} y={INFO_PAD_Y + 36}
                text={description} fontSize={L.descriptionFS}
                fill={infoText} opacity={0.7} lineHeight={1.6}
                fontFamily={FONT_CN} width={INFO_W - INFO_PAD_X - L.textBlockX - INFO_PAD_X} />
            </>);
          })()}
        </Group>

        {/* ── Brand footer ── */}
        <Text
          x={0}
          y={BRAND_Y}
          width={POSTER_W}
          text="METOO · 城市拼贴"
          fontSize={L.brandFS}
          fontStyle="900"
          fill={sty.id === "neon" ? pal.accent : pal.ink}
          opacity={sty.id === "neon" ? 0.5 : 0.35}
          letterSpacing={L.brandFS * 0.2}
          fontFamily={FONT_CN}
          align="center"
        />
      </Group>
    </KonvaPosterStage>
  );
}

export default GridMosaicPoster;
