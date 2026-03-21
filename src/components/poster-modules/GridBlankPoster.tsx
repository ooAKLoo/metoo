import { useMemo } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { Rect, Text, Group, Image as KImage } from "react-konva";
import useImage from "use-image";
import { detectPosterRatio, type PosterModuleProps, type PosterRatio } from "../../lib/poster-modules";
import { KonvaPosterStage } from "../../lib/poster-stage";
import { coverSrc } from "../map-shared";
import { mulberry32, DOODLE_ENTRIES } from "../poster-generators/DoodleGallery";
import { PixelSpriteSVG, SPRITE_NAMES } from "../poster-generators/PixelSprites";
import { ElevationPersonSVG } from "../poster-generators/ElevationPeople";
import {
  CharacterSVG,
  POSE_CATEGORIES,
  BODY_TYPES,
} from "../poster-generators/CharacterGenerator";
import { useMapStore } from "../../stores/useMapStore";
import { hslToHex } from "./PopBoardPoster";

const FONT_CN = "'Noto Sans SC', 'PingFang SC', system-ui, sans-serif";

/* ── Per-ratio layout config ── */

interface GridBlankLayout {
  baseW: number;
  baseCell: number;
  baseGap: number;
  cols: number;
  rows: number;
  sw: number;
  clipR: number;
  fillFrac: number;       // 1 = square cells sized from baseCell; <1 = fill that fraction of poster
  labelFS: number;
  valueFS: number;
  valueShortFS: number;
  iconSizeFrac: number;   // fraction of min(cellW,cellH) used for doodle icons
}

const BASE_LAYOUT: GridBlankLayout = {
  baseW: 1100,
  baseCell: 54,
  baseGap: 6,
  cols: 15,
  rows: 10,
  sw: 1.2,
  clipR: 24,
  fillFrac: 0,
  labelFS: 8,
  valueFS: 11,
  valueShortFS: 18,
  iconSizeFrac: 0.7,
};

const RATIO_LAYOUTS: Record<PosterRatio, GridBlankLayout> = {
  "4:3": BASE_LAYOUT,
  "1:1": {
    ...BASE_LAYOUT,
    baseW: 1000,
    baseCell: 50,
    clipR: 20,
  },
  "3:4": {
    ...BASE_LAYOUT,
    baseW: 1000,
    baseCell: 50,
    clipR: 20,
  },
  "16:9": {
    ...BASE_LAYOUT,
    baseW: 1200,
    baseCell: 54,
    fillFrac: 0.92,
    clipR: 28,
  },
};

/* ── Cell content types ── */
type IconType = "doodle" | "pixel" | "elevation" | "character";
const ICON_TYPES: IconType[] = ["doodle", "pixel", "elevation", "character"];

interface DoodleCell {
  kind: "doodle";
  iconType: IconType;
  seed: number;
}
interface CoverCell {
  kind: "cover";
  src: string;
}
interface StatCell {
  kind: "stat";
  label: string;
  value: string;
  accent?: boolean;
}
interface EmptyCell {
  kind: "empty";
}
type FilledCell = DoodleCell | CoverCell | StatCell | EmptyCell;

/* ── Helper: build a React SVG element for a given cell icon ── */
function buildCellIconElement(
  type: IconType,
  seed: number,
  size: number,
  color: string,
): React.ReactElement | null {
  const rng = mulberry32(seed);

  if (type === "pixel") {
    const idx = Math.floor(rng() * SPRITE_NAMES.length);
    return <PixelSpriteSVG spriteName={SPRITE_NAMES[idx]} size={size} color={color} />;
  }
  if (type === "elevation") {
    return (
      <div style={{ color }}>
        <ElevationPersonSVG seed={seed} size={size} artStyle="line" />
      </div>
    );
  }
  if (type === "character") {
    const poseIdx = Math.floor(rng() * POSE_CATEGORIES.length);
    const bodyIdx = Math.floor(rng() * BODY_TYPES.length);
    const accIdx = Math.floor(rng() * 8);
    return (
      <CharacterSVG
        poseFn={POSE_CATEGORIES[poseIdx].fn}
        seed={seed}
        bodyIdx={bodyIdx}
        accIdx={accIdx}
        size={size}
        artStyle="line"
      />
    );
  }
  // doodle — gen() returns raw SVG markup string
  const entryIdx = Math.floor(rng() * DOODLE_ENTRIES.length);
  const doodleRng = mulberry32(Math.floor(rng() * 1000000));
  const svgHtml = DOODLE_ENTRIES[entryIdx].gen(doodleRng);
  return (
    <svg
      viewBox="0 0 40 44"
      width={size}
      height={size * 1.1}
      xmlns="http://www.w3.org/2000/svg"
      style={{ overflow: "visible", color }}
      dangerouslySetInnerHTML={{ __html: svgHtml }}
    />
  );
}

/* ── Konva helper: render a React SVG element to a Konva-usable Image ── */
function SvgIcon({
  element,
  x,
  y,
  w,
  h,
}: {
  element: React.ReactElement;
  x: number;
  y: number;
  w: number;
  h: number;
}) {
  const dataUrl = useMemo(() => {
    const markup = renderToStaticMarkup(element);
    return "data:image/svg+xml," + encodeURIComponent(markup);
  }, [element]);
  const [img] = useImage(dataUrl);
  return img ? <KImage image={img} x={x} y={y} width={w} height={h} /> : null;
}

/* ── Konva helper: load a cover image from URL ── */
function CoverImage({
  src,
  x,
  y,
  w,
  h,
}: {
  src: string;
  x: number;
  y: number;
  w: number;
  h: number;
}) {
  const [img] = useImage(src, "anonymous");
  if (!img) return null;

  // Cover-fit: scale to fill, then crop to cell
  const imgRatio = img.naturalWidth / img.naturalHeight;
  const cellRatio = w / h;
  let sw: number, sh: number, sx: number, sy: number;
  if (imgRatio > cellRatio) {
    sh = img.naturalHeight;
    sw = sh * cellRatio;
    sx = (img.naturalWidth - sw) / 2;
    sy = 0;
  } else {
    sw = img.naturalWidth;
    sh = sw / cellRatio;
    sx = 0;
    sy = (img.naturalHeight - sh) / 2;
  }

  return (
    <KImage
      image={img}
      x={x}
      y={y}
      width={w}
      height={h}
      crop={{ x: sx, y: sy, width: sw, height: sh }}
    />
  );
}

/* ── Main Component ── */

function GridBlankPoster({
  items,
  cityEntries,
  posterWidth: W,
  posterHeight: H,
}: PosterModuleProps) {
  /* Absolute monochrome — single vivid hue + white */
  const gridBlankHue = useMapStore((s) => s.gridBlankHue);
  const figureSeed = useMapStore((s) => s.figureSeed);
  const BLUE = hslToHex(gridBlankHue, 100, 50);

  /* Per-ratio layout */
  const ratio = detectPosterRatio(W, H);
  const L = RATIO_LAYOUTS[ratio];

  /* Scale grid dimensions proportionally to poster width */
  const scale = W / L.baseW;
  const GAP = Math.round(L.baseGap * scale);

  const cellW = L.fillFrac > 0
    ? Math.floor((W * L.fillFrac - (L.cols - 1) * GAP) / L.cols)
    : Math.round(L.baseCell * scale);
  const cellH = L.fillFrac > 0
    ? Math.floor((H * L.fillFrac - (L.rows - 1) * GAP) / L.rows)
    : cellW; /* square for non-fill layouts */

  const dataSeed = cityEntries.length * 31 + items.length + figureSeed;

  /* ── Derive stats ── */
  const stats = useMemo(() => {
    const cityCount = cityEntries.length;
    const totalItems = items.length;
    const topCity = cityEntries[0];
    return { cityCount, totalItems, topCity };
  }, [items, cityEntries]);

  /* ── Collect available covers ── */
  const covers = useMemo(() => {
    const out: string[] = [];
    for (const city of cityEntries) {
      for (const c of city.covers) {
        const src = coverSrc(c);
        if (src) out.push(src);
        if (out.length >= 30) break;
      }
      if (out.length >= 10) break;
    }
    return out;
  }, [cityEntries]);

  /* ── Build cell map ── */
  const cellMap = useMemo(() => {
    const rng = mulberry32(dataSeed);
    const map = new Map<number, FilledCell>();

    // Shuffle all indices
    const indices = Array.from({ length: L.cols * L.rows }, (_, i) => i);
    for (let i = indices.length - 1; i > 0; i--) {
      const j = Math.floor(rng() * (i + 1));
      [indices[i], indices[j]] = [indices[j], indices[i]];
    }
    let cursor = 0;

    const take = (n: number) => {
      const out = indices.slice(cursor, cursor + n);
      cursor += n;
      return out;
    };

    // 1) Stat cells
    const statItems: { label: string; value: string; accent?: boolean }[] = [
      { label: "城市", value: `${stats.cityCount}`, accent: true },
      { label: "收藏", value: `${stats.totalItems}` },
    ];
    if (stats.topCity) {
      statItems.push({ label: "最多", value: stats.topCity.name, accent: true });
      statItems.push({ label: "", value: `${stats.topCity.count} 篇` });
    }
    statItems.push({ label: "", value: "METOO" });

    const statSlots = take(statItems.length);
    statItems.forEach((item, i) => {
      map.set(statSlots[i], { kind: "stat", ...item });
    });

    // 2) Cover cells — fill generously
    const coverCount = Math.min(covers.length, 30);
    const coverSlots = take(coverCount);
    coverSlots.forEach((idx, i) => {
      map.set(idx, { kind: "cover", src: covers[i] });
    });

    // 3) Doodle cells — half of remaining (rest stay empty)
    const remaining = L.cols * L.rows - cursor;
    const doodleCount = Math.round(remaining * 0.5);
    const doodleSlots = take(doodleCount);
    doodleSlots.forEach((idx) => {
      const iconType = ICON_TYPES[Math.floor(rng() * ICON_TYPES.length)];
      const seed = Math.floor(rng() * 1000000);
      map.set(idx, { kind: "doodle", iconType, seed });
    });

    return map;
  }, [dataSeed, stats, covers, L]);

  /* ── Grid geometry ── */
  const gridW = L.cols * cellW + (L.cols - 1) * GAP;
  const gridH = L.rows * cellH + (L.rows - 1) * GAP;
  const ox = (W - gridW) / 2;
  const oy = (H - gridH) / 2;

  /* ── Pre-compute doodle icon React elements (for renderToStaticMarkup) ── */
  const doodleElements = useMemo(() => {
    const out = new Map<number, React.ReactElement>();
    for (const [idx, cell] of cellMap.entries()) {
      if (cell.kind === "doodle") {
        const iconSize = Math.min(cellW, cellH) * L.iconSizeFrac;
        const el = buildCellIconElement(cell.iconType, cell.seed, iconSize, BLUE);
        if (el) out.set(idx, el);
      }
    }
    return out;
  }, [cellMap, cellW, cellH, BLUE, L]);

  /* ── Build grid outline rects ── */
  const gridRects = useMemo(() => {
    const rects: { x: number; y: number }[] = [];
    for (let row = 0; row < L.rows; row++) {
      for (let col = 0; col < L.cols; col++) {
        rects.push({
          x: ox + col * (cellW + GAP),
          y: oy + row * (cellH + GAP),
        });
      }
    }
    return rects;
  }, [ox, oy, cellW, cellH, GAP, L]);

  /* ── Build filled cell render data ── */
  const filledCells = useMemo(() => {
    const out: {
      idx: number;
      cell: FilledCell;
      cx: number;
      cy: number;
    }[] = [];
    for (const [idx, cell] of cellMap.entries()) {
      if (cell.kind === "empty") continue;
      const row = Math.floor(idx / L.cols);
      const col = idx % L.cols;
      out.push({
        idx,
        cell,
        cx: ox + col * (cellW + GAP),
        cy: oy + row * (cellH + GAP),
      });
    }
    return out;
  }, [cellMap, ox, oy, cellW, cellH, GAP, L]);

  return (
    <KonvaPosterStage width={W} height={H}>
      {/* Rounded-corner clip */}
      <Group
        clipFunc={(ctx) => {
          const r = L.clipR;
          ctx.beginPath();
          ctx.moveTo(r, 0);
          ctx.arcTo(W, 0, W, H, r);
          ctx.arcTo(W, H, 0, H, r);
          ctx.arcTo(0, H, 0, 0, r);
          ctx.arcTo(0, 0, W, 0, r);
          ctx.closePath();
        }}
      >
        {/* White background */}
        <Rect width={W} height={H} fill="#FFFFFF" />

        {/* Grid outline rects */}
        {gridRects.map((r, i) => (
          <Rect
            key={`grid-${i}`}
            x={r.x}
            y={r.y}
            width={cellW}
            height={cellH}
            fill="transparent"
            stroke={BLUE}
            strokeWidth={L.sw}
          />
        ))}

        {/* Filled cells */}
        {filledCells.map(({ idx, cell, cx, cy }) => {
          if (cell.kind === "cover") {
            return (
              <Group
                key={`cell-${idx}`}
                clipFunc={(ctx) => {
                  ctx.beginPath();
                  ctx.rect(cx, cy, cellW, cellH);
                  ctx.closePath();
                }}
              >
                <CoverImage
                  src={cell.src}
                  x={cx}
                  y={cy}
                  w={cellW}
                  h={cellH}
                />
              </Group>
            );
          }

          if (cell.kind === "stat") {
            const labelFS = L.labelFS;
            const valueFS = cell.value.length <= 3 ? L.valueShortFS : L.valueFS;
            const hasLabel = !!cell.label;

            // Vertical centering: compute total text block height
            const labelH = hasLabel ? labelFS * 1.2 : 0;
            const valueH = valueFS * 1.1;
            const gap = hasLabel ? 1 : 0;
            const totalTextH = labelH + gap + valueH;
            const textTopY = cy + (cellH - totalTextH) / 2;

            return (
              <Group key={`cell-${idx}`}>
                {/* Accent background fill */}
                {cell.accent && (
                  <Rect
                    x={cx}
                    y={cy}
                    width={cellW}
                    height={cellH}
                    fill={BLUE}
                  />
                )}
                {/* Label */}
                {hasLabel && (
                  <Text
                    x={cx}
                    y={textTopY}
                    width={cellW}
                    align="center"
                    text={cell.label}
                    fontSize={labelFS}
                    fontStyle="600"
                    fill={cell.accent ? "#fff" : "#999"}
                    letterSpacing={labelFS * 0.06}
                    fontFamily={FONT_CN}
                  />
                )}
                {/* Value */}
                <Text
                  x={cx}
                  y={textTopY + labelH + gap}
                  width={cellW}
                  align="center"
                  text={cell.value}
                  fontSize={valueFS}
                  fontStyle="800"
                  fill={cell.accent ? "#fff" : BLUE}
                  letterSpacing={valueFS * -0.02}
                  fontFamily={FONT_CN}
                />
              </Group>
            );
          }

          // doodle
          if (cell.kind === "doodle") {
            const el = doodleElements.get(idx);
            if (!el) return null;
            const iconSize = Math.min(cellW, cellH) * L.iconSizeFrac;
            // Center icon in cell
            const iconX = cx + (cellW - iconSize) / 2;
            const iconY = cy + (cellH - iconSize) / 2;
            return (
              <SvgIcon
                key={`cell-${idx}`}
                element={el}
                x={iconX}
                y={iconY}
                w={iconSize}
                h={iconSize}
              />
            );
          }

          return null;
        })}
      </Group>
    </KonvaPosterStage>
  );
}

export default GridBlankPoster;
