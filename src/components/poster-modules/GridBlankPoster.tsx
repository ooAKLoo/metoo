import { useMemo } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { Rect, Text, Group, Image as KImage } from "react-konva";
import useImage from "use-image";
import type { PosterModuleProps } from "../../lib/poster-modules";
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

const BASE_W = 1100;
const BASE_CELL = 54;
const BASE_GAP = 6;
const COLS = 15;
const ROWS = 10;
const SW = 1.2;

const FONT_CN = "'Noto Sans SC', 'PingFang SC', system-ui, sans-serif";

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
  /* Hue-driven stroke color — S/L fixed at #4338ca levels (s=58,l=51) */
  const gridBlankHue = useMapStore((s) => s.gridBlankHue);
  const STROKE = hslToHex(gridBlankHue, 58, 51);

  /* Scale grid dimensions proportionally to poster width */
  const ratio = W / BASE_W;
  const GAP = Math.round(BASE_GAP * ratio);

  /* Widescreen edge-bleed: stretch square cells to fill ~92% of poster */
  const isWide = W / H >= 16 / 9 - 0.01;
  const cellW = isWide
    ? Math.floor((W * 0.92 - (COLS - 1) * GAP) / COLS)
    : Math.round(BASE_CELL * ratio);
  const cellH = isWide
    ? Math.floor((H * 0.92 - (ROWS - 1) * GAP) / ROWS)
    : cellW; /* square for non-widescreen */

  const dataSeed = cityEntries.length * 31 + items.length;

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
    const indices = Array.from({ length: COLS * ROWS }, (_, i) => i);
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
    const remaining = COLS * ROWS - cursor;
    const doodleCount = Math.round(remaining * 0.5);
    const doodleSlots = take(doodleCount);
    doodleSlots.forEach((idx) => {
      const iconType = ICON_TYPES[Math.floor(rng() * ICON_TYPES.length)];
      const seed = Math.floor(rng() * 1000000);
      map.set(idx, { kind: "doodle", iconType, seed });
    });

    return map;
  }, [dataSeed, stats, covers]);

  /* ── Grid geometry ── */
  const gridW = COLS * cellW + (COLS - 1) * GAP;
  const gridH = ROWS * cellH + (ROWS - 1) * GAP;
  const ox = (W - gridW) / 2;
  const oy = (H - gridH) / 2;

  /* ── Pre-compute doodle icon React elements (for renderToStaticMarkup) ── */
  const doodleElements = useMemo(() => {
    const out = new Map<number, React.ReactElement>();
    for (const [idx, cell] of cellMap.entries()) {
      if (cell.kind === "doodle") {
        const iconSize = Math.min(cellW, cellH) * 0.7;
        const el = buildCellIconElement(cell.iconType, cell.seed, iconSize, STROKE);
        if (el) out.set(idx, el);
      }
    }
    return out;
  }, [cellMap, cellW, cellH, STROKE]);

  /* ── Build grid outline rects ── */
  const gridRects = useMemo(() => {
    const rects: { x: number; y: number }[] = [];
    for (let row = 0; row < ROWS; row++) {
      for (let col = 0; col < COLS; col++) {
        rects.push({
          x: ox + col * (cellW + GAP),
          y: oy + row * (cellH + GAP),
        });
      }
    }
    return rects;
  }, [ox, oy, cellW, cellH, GAP]);

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
      const row = Math.floor(idx / COLS);
      const col = idx % COLS;
      out.push({
        idx,
        cell,
        cx: ox + col * (cellW + GAP),
        cy: oy + row * (cellH + GAP),
      });
    }
    return out;
  }, [cellMap, ox, oy, cellW, cellH, GAP]);

  return (
    <KonvaPosterStage width={W} height={H}>
      {/* Rounded-corner clip */}
      <Group
        clipFunc={(ctx) => {
          const r = 24;
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
            stroke={STROKE}
            strokeWidth={SW}
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
            const labelFS = 8;
            const valueFS = cell.value.length <= 3 ? 18 : 11;
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
                    fill={STROKE}
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
                  fill={cell.accent ? "#fff" : STROKE}
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
            const iconSize = Math.min(cellW, cellH) * 0.7;
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
