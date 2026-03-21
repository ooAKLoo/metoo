import { useMemo } from "react";
import { Rect, Text, Group, Circle, Path, Image as KImage, Shape } from "react-konva";
import useImage from "use-image";
import { detectPosterRatio, type PosterModuleProps, type PosterRatio } from "../../lib/poster-modules";
import { KonvaPosterStage } from "../../lib/poster-stage";
import { coverSrc } from "../map-shared";
import { useMapStore } from "../../stores/useMapStore";

/* ── Color palette ── */
const CITY_COLORS = [
  "#4361EE", "#E63946", "#2A9D8F", "#E9C46A", "#6A0572", "#264653",
  "#F765A3", "#FFB703", "#06D6A0", "#118AB2", "#EF476F", "#0B1354",
];

export type PatternStyle = "flat" | "brutalism";

export const PATTERN_STYLES: { id: PatternStyle; label: string }[] = [
  { id: "flat", label: "极简" },
  { id: "brutalism", label: "粗犷" },
];

/* ── Fonts ── */
const FONT_UI = "ui-sans-serif, system-ui, sans-serif";
const FONT_CN = "'Noto Sans SC', 'PingFang SC', system-ui, sans-serif";
const FONT_MONO = "'SF Mono', 'Menlo', monospace";

/* ── Text measurement ── */
const _mCtx = document.createElement("canvas").getContext("2d")!;
function measureText(text: string, fs: number, fw: string, ff: string): number {
  _mCtx.font = `${fw} ${fs}px ${ff}`;
  return _mCtx.measureText(text).width;
}

/* ── City cell data ── */
interface CityCell {
  name: string;
  count: number;
  cover: string;
  color: string;
}

/* ── Star SVG path scaled to a given diameter ── */
function starPath(d: number): string {
  const s = d / 100;
  return [
    `M ${50 * s} ${10 * s}`,
    `Q ${50 * s} ${50 * s} ${90 * s} ${50 * s}`,
    `Q ${50 * s} ${50 * s} ${50 * s} ${90 * s}`,
    `Q ${50 * s} ${50 * s} ${10 * s} ${50 * s}`,
    `Q ${50 * s} ${50 * s} ${50 * s} ${10 * s}`,
    "Z",
  ].join(" ");
}

/* ── Per-ratio layout config ── */

interface PatternLayout {
  /* Card inset (brutal vs flat) */
  cardMarginBrutal: number;
  cardMarginFlat: number;
  shadowDepthBrutal: number;
  /* Grid */
  gridGapBrutal: number;
  gridGapFlat: number;
  gridPad: number;
  /* Sections */
  headerH: number;
  footerStatsH: number;
  labelH: number;
  footerStripHBrutal: number;
  footerStripHFlat: number;
  /* Border / radius */
  borderWidth: number;
  brRadius: number;
  /* Header – brutalism */
  headerPadX: number;
  headerTitleFS: number;
  accentBoxW: number;
  iconSize: number;
  iconStrokeWidth: number;
  /* Header – flat */
  flatBoxPadX: number;
  flatBoxPadY: number;
  flatHeaderH: number;
  flatTitlePadX: number;
  flatTitleFS: number;
  flatIconBoxW: number;
  flatIconR: number;
  /* Cell labels */
  cellNameFS: number;
  cellCountFS: number;
  cellLabelGap: number;
  cellLabelLineH: number;
  /* Stats section */
  statsPadX: number;
  statsFS: number;
  rankingFS: number;
  rankingGap: number;
  rankingDividerY: number;
  statsTextY: number;
  rankingBgH: number;
  rankingBgPad: number;
  rankingBgCornerR: number;
  rankingBgTextX: number;
  rankingFirstExtraPad: number;
  /* Footer stripe */
  stripeW: number;
  /* Circle shadow offset (brutal) */
  circleShadowOffset: number;
}

const BASE_LAYOUT: PatternLayout = {
  cardMarginBrutal: 20,
  cardMarginFlat: 0,
  shadowDepthBrutal: 12,
  gridGapBrutal: 16,
  gridGapFlat: 12,
  gridPad: 32,
  headerH: 72,
  footerStatsH: 120,
  labelH: 28,
  footerStripHBrutal: 28,
  footerStripHFlat: 4,
  borderWidth: 5,
  brRadius: 16,
  headerPadX: 28,
  headerTitleFS: 28,
  accentBoxW: 72,
  iconSize: 32,
  iconStrokeWidth: 3,
  flatBoxPadX: 32,
  flatBoxPadY: 20,
  flatHeaderH: 60,
  flatTitlePadX: 20,
  flatTitleFS: 22,
  flatIconBoxW: 60,
  flatIconR: 12,
  cellNameFS: 13,
  cellCountFS: 10,
  cellLabelGap: 8,
  cellLabelLineH: 16,
  statsPadX: 32,
  statsFS: 12,
  rankingFS: 11,
  rankingGap: 16,
  rankingDividerY: 24,
  statsTextY: 38,
  rankingBgH: 18,
  rankingBgPad: 20,
  rankingBgCornerR: 4,
  rankingBgTextX: 8,
  rankingFirstExtraPad: 16,
  stripeW: 11,
  circleShadowOffset: 6,
};

const RATIO_LAYOUTS: Record<PosterRatio, PatternLayout> = {
  "4:3": BASE_LAYOUT,
  "1:1": {
    ...BASE_LAYOUT,
    cardMarginBrutal: 16,
    shadowDepthBrutal: 10,
    gridGapBrutal: 14,
    gridGapFlat: 10,
    gridPad: 26,
    headerH: 60,
    footerStatsH: 100,
    labelH: 24,
    footerStripHBrutal: 24,
    footerStripHFlat: 3,
    borderWidth: 4,
    brRadius: 14,
    headerPadX: 22,
    headerTitleFS: 23,
    accentBoxW: 60,
    iconSize: 26,
    iconStrokeWidth: 2.5,
    flatBoxPadX: 26,
    flatBoxPadY: 16,
    flatHeaderH: 50,
    flatTitlePadX: 16,
    flatTitleFS: 18,
    flatIconBoxW: 50,
    flatIconR: 10,
    cellNameFS: 11,
    cellCountFS: 9,
    cellLabelGap: 6,
    cellLabelLineH: 14,
    statsPadX: 26,
    statsFS: 10,
    rankingFS: 10,
    rankingGap: 14,
    rankingDividerY: 20,
    statsTextY: 32,
    rankingBgH: 16,
    rankingBgPad: 16,
    rankingBgCornerR: 3,
    rankingBgTextX: 6,
    rankingFirstExtraPad: 14,
    stripeW: 9,
    circleShadowOffset: 5,
  },
  "3:4": {
    ...BASE_LAYOUT,
    cardMarginBrutal: 18,
    shadowDepthBrutal: 10,
    gridGapBrutal: 14,
    gridGapFlat: 10,
    gridPad: 28,
    headerH: 64,
    footerStatsH: 106,
    labelH: 26,
    footerStripHBrutal: 24,
    footerStripHFlat: 3,
    borderWidth: 4,
    brRadius: 14,
    headerPadX: 24,
    headerTitleFS: 24,
    accentBoxW: 64,
    iconSize: 28,
    iconStrokeWidth: 2.5,
    flatBoxPadX: 28,
    flatBoxPadY: 18,
    flatHeaderH: 52,
    flatTitlePadX: 18,
    flatTitleFS: 20,
    flatIconBoxW: 52,
    flatIconR: 11,
    cellNameFS: 12,
    cellCountFS: 9,
    cellLabelGap: 7,
    cellLabelLineH: 14,
    statsPadX: 28,
    statsFS: 11,
    rankingFS: 10,
    rankingGap: 14,
    rankingDividerY: 22,
    statsTextY: 34,
    rankingBgH: 16,
    rankingBgPad: 18,
    rankingBgCornerR: 3,
    rankingBgTextX: 7,
    rankingFirstExtraPad: 14,
    stripeW: 10,
    circleShadowOffset: 5,
  },
  "16:9": {
    ...BASE_LAYOUT,
    cardMarginBrutal: 24,
    shadowDepthBrutal: 14,
    gridGapBrutal: 18,
    gridGapFlat: 14,
    gridPad: 36,
    headerH: 80,
    footerStatsH: 130,
    labelH: 30,
    footerStripHBrutal: 32,
    footerStripHFlat: 5,
    borderWidth: 6,
    brRadius: 18,
    headerPadX: 32,
    headerTitleFS: 32,
    accentBoxW: 80,
    iconSize: 36,
    iconStrokeWidth: 3.5,
    flatBoxPadX: 36,
    flatBoxPadY: 24,
    flatHeaderH: 68,
    flatTitlePadX: 22,
    flatTitleFS: 26,
    flatIconBoxW: 68,
    flatIconR: 14,
    cellNameFS: 15,
    cellCountFS: 11,
    cellLabelGap: 10,
    cellLabelLineH: 18,
    statsPadX: 36,
    statsFS: 14,
    rankingFS: 12,
    rankingGap: 18,
    rankingDividerY: 28,
    statsTextY: 44,
    rankingBgH: 20,
    rankingBgPad: 24,
    rankingBgCornerR: 5,
    rankingBgTextX: 10,
    rankingFirstExtraPad: 18,
    stripeW: 13,
    circleShadowOffset: 7,
  },
};

/* ── Single circle cell with image loading ── */
function CityCircleCell({
  cell,
  cx,
  cy,
  radius,
  isBrutal,
  borderWidth,
  circleShadowOffset,
}: {
  cell: CityCell;
  cx: number;
  cy: number;
  radius: number;
  isBrutal: boolean;
  borderWidth: number;
  circleShadowOffset: number;
}) {
  const [img] = useImage(cell.cover, "anonymous");
  const d = radius * 2;

  return (
    <Group x={cx - radius} y={cy - radius}>
      {/* Brutalism shadow offset */}
      {isBrutal && (
        <Circle
          x={radius + circleShadowOffset}
          y={radius + circleShadowOffset}
          radius={radius}
          fill="#000"
        />
      )}

      {/* Circle clip group */}
      <Group
        clipFunc={(ctx) => {
          ctx.arc(radius, radius, radius, 0, Math.PI * 2);
        }}
      >
        {/* Background color fill */}
        <Rect width={d} height={d} fill={cell.color} />

        {/* Cover image or fallback character */}
        {img ? (
          (() => {
            // object-fit: cover
            const nw = img.naturalWidth || d;
            const nh = img.naturalHeight || d;
            const imgRatio = nw / nh;
            let iw = d, ih = d, ix = 0, iy = 0;
            if (imgRatio > 1) {
              iw = d * imgRatio;
              ix = (d - iw) / 2;
            } else {
              ih = d / imgRatio;
              iy = (d - ih) / 2;
            }
            return <KImage image={img} x={ix} y={iy} width={iw} height={ih} />;
          })()
        ) : cell.name ? (
          <Text
            x={0}
            y={0}
            width={d}
            height={d}
            text={cell.name[0]}
            fontSize={radius * 0.7}
            fontStyle="700"
            fill="#fff"
            fontFamily={FONT_CN}
            align="center"
            verticalAlign="middle"
          />
        ) : null}

      </Group>

      {/* Brutalism border ring */}
      {isBrutal && (
        <Circle
          x={radius}
          y={radius}
          radius={radius}
          stroke="#000"
          strokeWidth={borderWidth}
        />
      )}
    </Group>
  );
}

/* ── Main Component ── */

export default function PatternCardPoster({
  items,
  cityEntries,
  posterWidth: PW,
  posterHeight: PH,
}: PosterModuleProps) {
  const patternStyleIdx = useMapStore((s) => s.patternStyleIdx);
  const figureSeed = useMapStore((s) => s.figureSeed);
  const cardStyle = PATTERN_STYLES[patternStyleIdx % PATTERN_STYLES.length].id;
  const isBrutal = cardStyle === "brutalism";

  /* ── Resolve per-ratio layout ── */
  const ratio = detectPosterRatio(PW, PH);
  const L = RATIO_LAYOUTS[ratio];
  const CARD_MARGIN = isBrutal ? L.cardMarginBrutal : L.cardMarginFlat;
  const SHADOW_DEPTH = isBrutal ? L.shadowDepthBrutal : 0;
  const W = PW - CARD_MARGIN * 2 - SHADOW_DEPTH;
  const H = PH - CARD_MARGIN * 2 - SHADOW_DEPTH;

  const totalCities = cityEntries.length;
  const totalItems = items.length;
  const topCity = cityEntries[0];

  const borderWidth = L.borderWidth;
  const brRadius = L.brRadius;
  const accentColor = CITY_COLORS[1];
  const primaryColor = CITY_COLORS[0];

  const title = topCity ? `${topCity.name} \u00B7 ${totalCities}\u57CE` : "\u89C5\u9014 \u00B7 \u65C5\u884C";

  /* ── Grid layout from city count ── */
  const cols = Math.min(4, Math.max(2, Math.ceil(Math.sqrt(totalCities || 4))));
  const rows = Math.min(5, Math.max(2, Math.ceil((totalCities || 4) / cols)));
  const cellCount = cols * rows;

  /* ── Build city cells ── */
  const shuffledColors = useMemo(() => {
    const arr = [...CITY_COLORS];
    if (figureSeed !== 42) {
      for (let i = arr.length - 1; i > 0; i--) {
        const j = Math.abs(Math.round(Math.sin(figureSeed * 0.1 + i * 7.919) * 10000)) % (i + 1);
        [arr[i], arr[j]] = [arr[j], arr[i]];
      }
    }
    return arr;
  }, [figureSeed]);

  const cells: CityCell[] = useMemo(() => {
    const out: CityCell[] = [];
    for (let i = 0; i < cellCount; i++) {
      const city = cityEntries[i];
      if (city) {
        const cover = city.covers[0] ? coverSrc(city.covers[0]) : "";
        out.push({ name: city.name, count: city.count, cover, color: shuffledColors[i % shuffledColors.length] });
      } else {
        out.push({ name: "", count: 0, cover: "", color: shuffledColors[i % shuffledColors.length] });
      }
    }
    return out;
  }, [cityEntries, cellCount, shuffledColors]);

  /* ── Layout constants ── */
  const GRID_GAP = isBrutal ? L.gridGapBrutal : L.gridGapFlat;
  const GRID_PAD = L.gridPad;
  const HEADER_H = L.headerH;
  const FOOTER_STATS_H = L.footerStatsH;
  const LABEL_H = L.labelH;
  const FOOTER_STRIP_H = isBrutal ? L.footerStripHBrutal : L.footerStripHFlat;

  /* ── Compute cell size to fit both W and H ── */
  const availW = W - GRID_PAD * 2;
  const availH = H - HEADER_H - FOOTER_STATS_H - FOOTER_STRIP_H - GRID_PAD * 2;
  const maxByW = (availW - (cols - 1) * GRID_GAP) / cols;
  const maxByH = (availH - (rows - 1) * GRID_GAP - rows * LABEL_H) / rows;
  const cellW = Math.min(maxByW, maxByH);
  const radius = cellW / 2;

  /* ── Grid origin (centered) ── */
  const gridTotalW = cols * cellW + (cols - 1) * GRID_GAP;
  const gridTotalH = rows * (cellW + LABEL_H) + (rows - 1) * GRID_GAP;
  const gridOriginX = (W - gridTotalW) / 2;
  const gridOriginY = HEADER_H + (H - HEADER_H - FOOTER_STATS_H - FOOTER_STRIP_H - gridTotalH) / 2;

  /* ── Stats section layout ── */
  const statsY = H - FOOTER_STATS_H - FOOTER_STRIP_H;

  /* ── City ranking layout (horizontal flow) ── */
  const rankingEntries = useMemo(() => {
    const top8 = cityEntries.slice(0, 8);
    const gap = L.rankingGap;
    const fs = L.rankingFS;
    let ox = 0;
    return top8.map((city, i) => {
      const label = `${i + 1}. ${city.name}`;
      const countLabel = `(${city.count})`;
      const fw = i === 0 ? "700" : "400";
      // For brutalism first item, add padding
      const extraPad = isBrutal && i === 0 ? L.rankingFirstExtraPad : 0;
      const textW = measureText(label + countLabel, fs, fw, FONT_CN) + 4 + extraPad;
      const x = ox;
      ox += textW + gap;
      return { city, label, countLabel, x, w: textW, idx: i };
    });
  }, [cityEntries, isBrutal, L]);

  return (
    <KonvaPosterStage width={PW} height={PH}>
      {/* ── Brutalism: stacked card shadow ── */}
      {isBrutal && (
        <>
          <Rect width={PW} height={PH} fill="#FDFDFD" />
          {/* Stacked solid shadow (depth = 12) */}
          <Shape
            sceneFunc={(ctx, shape) => {
              ctx.fillStyle = "#000";
              const r = brRadius;
              for (let d = 1; d <= SHADOW_DEPTH; d++) {
                const x = CARD_MARGIN + d, y = CARD_MARGIN + d;
                ctx.beginPath();
                ctx.moveTo(x + r, y);
                ctx.arcTo(x + W, y, x + W, y + H, r);
                ctx.arcTo(x + W, y + H, x, y + H, r);
                ctx.arcTo(x, y + H, x, y, r);
                ctx.arcTo(x, y, x + W, y, r);
                ctx.closePath();
                ctx.fill();
              }
              ctx.fillStrokeShape(shape);
            }}
          />
        </>
      )}

      {/* ── Card content ── */}
      <Group x={CARD_MARGIN} y={CARD_MARGIN}>
      {/* Rounded-corner clip */}
      <Group
        clipFunc={(ctx) => {
          const r = isBrutal ? brRadius : 2;
          ctx.beginPath();
          ctx.moveTo(r, 0);
          ctx.arcTo(W, 0, W, H, r);
          ctx.arcTo(W, H, 0, H, r);
          ctx.arcTo(0, H, 0, 0, r);
          ctx.arcTo(0, 0, W, 0, r);
          ctx.closePath();
        }}
      >
        {/* Background */}
        <Rect width={W} height={H} fill="#FDFDFD" />

        {/* ══════════ HEADER ══════════ */}
        {isBrutal ? (
          <Group>
            {/* Header background */}
            <Rect x={0} y={0} width={W} height={HEADER_H} fill="#FDFDFD" />
            {/* Header bottom border */}
            <Rect x={0} y={HEADER_H - borderWidth} width={W} height={borderWidth} fill="#000" />

            {/* Title text */}
            <Text
              x={L.headerPadX}
              y={0}
              width={W - L.headerPadX - L.accentBoxW - borderWidth}
              height={HEADER_H - borderWidth}
              text={title}
              fontSize={L.headerTitleFS}
              fontStyle="900"
              fill="#000"
              fontFamily={FONT_CN}
              verticalAlign="middle"
            />

            {/* Right accent box */}
            <Rect
              x={W - L.accentBoxW}
              y={0}
              width={L.accentBoxW}
              height={HEADER_H - borderWidth}
              fill={accentColor}
            />
            {/* Left border of accent box */}
            <Rect
              x={W - L.accentBoxW - borderWidth}
              y={0}
              width={borderWidth}
              height={HEADER_H - borderWidth}
              fill="#000"
            />

            {/* Small square icon in accent box */}
            {/* Stacked solid shadow (1..4px offsets, matches ovideo CSS box-shadow) */}
            {[1, 2, 3, 4].map(d => (
              <Rect
                key={d}
                x={W - L.accentBoxW / 2 - L.iconSize / 2 + d}
                y={(HEADER_H - borderWidth) / 2 - L.iconSize / 2 + d}
                width={L.iconSize}
                height={L.iconSize}
                cornerRadius={brRadius / 2}
                fill="#000"
              />
            ))}
            {/* Icon square */}
            <Rect
              x={W - L.accentBoxW / 2 - L.iconSize / 2}
              y={(HEADER_H - borderWidth) / 2 - L.iconSize / 2}
              width={L.iconSize}
              height={L.iconSize}
              cornerRadius={brRadius / 2}
              fill={primaryColor}
              stroke="#000"
              strokeWidth={L.iconStrokeWidth}
            />
          </Group>
        ) : (
          /* ── Flat theme: full border wrapping header + grid ── */
          (() => {
            const boxX = L.flatBoxPadX;
            const boxY = L.flatBoxPadY;
            const boxW = W - L.flatBoxPadX * 2;
            const boxH = statsY - 12 - boxY;
            const hdrH = L.flatHeaderH;
            return (
              <Group>
                {/* Full outer border around header + grid area */}
                <Rect
                  x={boxX}
                  y={boxY}
                  width={boxW}
                  height={boxH}
                  stroke="#1a1a1a"
                  strokeWidth={1.5}
                />
                {/* Header bottom divider */}
                <Rect
                  x={boxX}
                  y={boxY + hdrH}
                  width={boxW}
                  height={1.5}
                  fill="#1a1a1a"
                />
                {/* Title text */}
                <Text
                  x={boxX + L.flatTitlePadX}
                  y={boxY}
                  width={boxW - L.flatTitlePadX - L.flatIconBoxW - 1.5}
                  height={hdrH}
                  text={title}
                  fontSize={L.flatTitleFS}
                  fontStyle="500"
                  fill="#1a1a1a"
                  fontFamily={FONT_MONO}
                  letterSpacing={-0.44}
                  verticalAlign="middle"
                />
                {/* Right icon box border */}
                <Rect
                  x={boxX + boxW - L.flatIconBoxW}
                  y={boxY}
                  width={L.flatIconBoxW}
                  height={hdrH}
                  stroke="#1a1a1a"
                  strokeWidth={1.5}
                />
                {/* Circle icon */}
                <Circle
                  x={boxX + boxW - L.flatIconBoxW / 2}
                  y={boxY + hdrH / 2}
                  radius={L.flatIconR}
                  fill={primaryColor}
                />
              </Group>
            );
          })()
        )}

        {/* ══════════ CITY GRID ══════════ */}
        {cells.map((cell, i) => {
          const col = i % cols;
          const row = Math.floor(i / cols);
          const cx = gridOriginX + col * (cellW + GRID_GAP) + radius;
          const cy = gridOriginY + row * (cellW + LABEL_H + GRID_GAP) + radius;

          return (
            <Group key={i}>
              <CityCircleCell
                cell={cell}
                cx={cx}
                cy={cy}
                radius={radius}
                isBrutal={isBrutal}
                borderWidth={borderWidth}
                circleShadowOffset={L.circleShadowOffset}
              />

              {/* City name + count label below circle */}
              {cell.name ? (
                <Group>
                  <Text
                    x={cx - cellW / 2}
                    y={cy + radius + L.cellLabelGap}
                    width={cellW}
                    text={cell.name}
                    fontSize={L.cellNameFS}
                    fontStyle={isBrutal ? "800" : "500"}
                    fill={isBrutal ? "#000" : "#1a1a1a"}
                    fontFamily={FONT_CN}
                    letterSpacing={0.26}
                    align="center"
                    ellipsis={true}
                    wrap="none"
                  />
                  <Text
                    x={cx - cellW / 2}
                    y={cy + radius + L.cellLabelGap + L.cellLabelLineH}
                    width={cellW}
                    text={`${cell.count} \u6536\u85CF`}
                    fontSize={L.cellCountFS}
                    fill="#a3a3a3"
                    fontFamily={FONT_CN}
                    align="center"
                  />
                </Group>
              ) : null}
            </Group>
          );
        })}

        {/* ══════════ STATS SECTION ══════════ */}
        <Group x={L.statsPadX} y={statsY}>
          {/* City ranking list (horizontal flow) */}
          {rankingEntries.map((entry) => {
            const isFirst = entry.idx === 0;
            if (isBrutal && isFirst) {
              // Highlighted first city with background
              const bgW = measureText(entry.label + entry.countLabel, L.rankingFS, "700", FONT_CN) + L.rankingBgPad;
              return (
                <Group key={entry.city.name} x={entry.x} y={0}>
                  <Rect
                    width={bgW}
                    height={L.rankingBgH}
                    fill={CITY_COLORS[0]}
                    cornerRadius={L.rankingBgCornerR}
                    y={-2}
                  />
                  <Text
                    x={L.rankingBgTextX}
                    y={0}
                    text={`${entry.label}${entry.countLabel}`}
                    fontSize={L.rankingFS}
                    fontStyle="700"
                    fill="#fff"
                    fontFamily={FONT_CN}
                  />
                </Group>
              );
            }
            return (
              <Group key={entry.city.name} x={entry.x} y={0}>
                <Text
                  text={entry.label}
                  fontSize={L.rankingFS}
                  fontStyle={isFirst ? "700" : "400"}
                  fill={isFirst ? "#000" : "#737373"}
                  fontFamily={FONT_CN}
                />
                <Text
                  x={measureText(entry.label, L.rankingFS, isFirst ? "700" : "400", FONT_CN) + 2}
                  text={entry.countLabel}
                  fontSize={L.rankingFS}
                  fill="#a3a3a3"
                  fontFamily={FONT_CN}
                />
              </Group>
            );
          })}

          {/* Divider line below ranking */}
          <Rect
            x={0}
            y={L.rankingDividerY}
            width={W - L.statsPadX * 2}
            height={isBrutal ? borderWidth : 1}
            fill={isBrutal ? "#000" : "#e5e5e5"}
          />

          {/* Stats bar */}
          <Text
            x={0}
            y={L.statsTextY}
            text={`${totalItems} \u4E2A\u6536\u85CF \u00B7 ${totalCities} \u5EA7\u57CE\u5E02`}
            fontSize={L.statsFS}
            fontStyle="500"
            fill="#737373"
            fontFamily={FONT_CN}
          />
          <Text
            x={0}
            y={L.statsTextY}
            width={W - L.statsPadX * 2}
            text={"\u89C5\u9014 METOO"}
            fontSize={L.statsFS}
            fontStyle="500"
            fill="#737373"
            letterSpacing={0.6}
            fontFamily={FONT_UI}
            align="right"
          />
        </Group>

        {/* ══════════ FOOTER STRIP ══════════ */}
        {isBrutal ? (
          <Group>
            {/* Top border of footer strip */}
            <Rect
              x={0}
              y={H - FOOTER_STRIP_H - borderWidth}
              width={W}
              height={borderWidth}
              fill="#000"
            />
            {/* Diagonal stripes via Shape sceneFunc */}
            <Shape
              x={0}
              y={H - FOOTER_STRIP_H}
              sceneFunc={(ctx, shape) => {
                const w = W;
                const h = FOOTER_STRIP_H;
                ctx.save();
                ctx.beginPath();
                ctx.rect(0, 0, w, h);
                ctx.clip();

                // Draw repeating diagonal stripes
                const stripeW = L.stripeW;
                const totalStripes = Math.ceil((w + h) / stripeW) * 2;
                for (let i = 0; i < totalStripes; i++) {
                  const x0 = i * stripeW - h;
                  ctx.fillStyle = i % 2 === 0 ? primaryColor : accentColor;
                  ctx.beginPath();
                  ctx.moveTo(x0, h);
                  ctx.lineTo(x0 + stripeW, h);
                  ctx.lineTo(x0 + stripeW + h, 0);
                  ctx.lineTo(x0 + h, 0);
                  ctx.closePath();
                  ctx.fill();
                }

                ctx.restore();
                ctx.fillStrokeShape(shape);
              }}
            />
          </Group>
        ) : (
          <Rect
            x={0}
            y={H - FOOTER_STRIP_H}
            width={W}
            height={FOOTER_STRIP_H}
            fill={primaryColor}
            opacity={0.15}
          />
        )}

        {/* ── Brutalism outer border (inset so full stroke visible inside clip) ── */}
        {isBrutal && (
          <Rect
            x={borderWidth / 2}
            y={borderWidth / 2}
            width={W - borderWidth}
            height={H - borderWidth}
            stroke="#000"
            strokeWidth={borderWidth}
            cornerRadius={brRadius - borderWidth / 2}
            listening={false}
          />
        )}
      </Group>
      </Group>
    </KonvaPosterStage>
  );
}
