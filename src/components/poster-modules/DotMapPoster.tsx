import { useMemo } from "react";
import { Rect, Text, Line, Group, Circle, Image as KImage } from "react-konva";
import useImage from "use-image";
import type { PosterModuleProps } from "../../lib/poster-modules";
import { KonvaPosterStage } from "../../lib/poster-stage";
import { coverSrc } from "../map-shared";

/* ── Cluster palette ── */
const PALETTE = [
  "#ff6b6b", "#51cf66", "#339af0", "#fcc419", "#cc5de8", "#ff922b",
];

const BASE_COLOR = "#1a1a1a";
const LIGHT_COLOR = "#e0e0e0";

/* ── China approximate bounds ── */
const LNG_MIN = 73;
const LNG_MAX = 135;
const LAT_MIN = 18;
const LAT_MAX = 53;

/* ── Grid ── */
const COLS = 48;
const ROWS = 48;
const DOT_R = 2;
const SPACING = 9;
const FUZZINESS = 0.15;

/* ── Deterministic random ── */
const rand = (seed: number, offset: number) => {
  const x = Math.sin(seed + offset) * 10000;
  return x - Math.floor(x);
};

/* ── Fonts ── */
const FONT_UI = "ui-sans-serif, system-ui, sans-serif";
const FONT_CN = "'Noto Sans SC', 'PingFang SC', system-ui, sans-serif";

/* ── Footer tag colors (matching original Tailwind classes) ── */
const FOOTER_TAGS: { text: string; color: string }[] = [
  { text: "足迹", color: "#ef4444" },   // red-500
  { text: "收藏", color: "#60a5fa" },   // blue-400
  { text: "城市", color: "#facc15" },   // yellow-400
  { text: "旅行", color: "#c084fc" },   // purple-400
  { text: "发现", color: "#a3a3a3" },   // neutral-400
];

/* ── QR-like 3x3 grid pattern ── */
const QR_PATTERN = [
  1, 0, 1,
  0, 1, 0,
  1, 1, 0,
];

/* ── Cover image sub-component ── */
function CoverImg({
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
  return img ? (
    <KImage image={img} x={x} y={y} width={w} height={h} />
  ) : null;
}

/* ── Component ── */
function DotMapPoster({
  items,
  cityEntries,
  posterWidth: W,
  posterHeight: H,
}: PosterModuleProps) {
  const totalItems = items.length;
  const totalCities = cityEntries.length;

  /* ── Derive clusters from city data ── */
  const topCities = useMemo(() => {
    if (cityEntries.length === 0) return [];
    const maxCount = cityEntries[0].count;
    return cityEntries.slice(0, 6).map((city, i) => {
      const nx = (city.coord[0] - LNG_MIN) / (LNG_MAX - LNG_MIN);
      const ny = 1 - (city.coord[1] - LAT_MIN) / (LAT_MAX - LAT_MIN);
      return {
        name: city.name,
        x: Math.max(0.06, Math.min(0.94, nx)),
        y: Math.max(0.06, Math.min(0.94, ny)),
        r: 0.08 + (city.count / maxCount) * 0.14,
        color: PALETTE[i % PALETTE.length],
        count: city.count,
      };
    });
  }, [cityEntries]);

  /* ── Generate dot grid ── */
  const dots = useMemo(() => {
    const seed = 42;
    const out: { x: number; y: number; r: number; color: string }[] = [];
    for (let row = 0; row < ROWS; row++) {
      for (let col = 0; col < COLS; col++) {
        const nx = col / (COLS - 1);
        const ny = row / (ROWS - 1);
        let color = BASE_COLOR;
        let isLight = false;

        for (let ci = 0; ci < topCities.length; ci++) {
          const c = topCities[ci];
          const dx = nx - c.x;
          const dy = ny - c.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          const noise =
            (rand(seed, row * COLS + col + ci * 100) - 0.5) * FUZZINESS;
          if (dist + noise < c.r) {
            color = c.color;
            break;
          }
        }

        if (
          color === BASE_COLOR &&
          rand(seed, row * COLS + col + 999) > 0.85
        ) {
          color = LIGHT_COLOR;
          isLight = true;
        }

        out.push({
          x: col * SPACING,
          y: row * SPACING,
          r: isLight ? DOT_R * 0.6 : DOT_R,
          color,
        });
      }
    }
    return out;
  }, [topCities]);

  const svgW = (COLS - 1) * SPACING;
  const svgH = (ROWS - 1) * SPACING;

  /* ── Cover image urls ── */
  const covers = useMemo(
    () =>
      cityEntries
        .flatMap((c) => c.covers)
        .filter(Boolean)
        .slice(0, 3)
        .map(coverSrc),
    [cityEntries],
  );

  /* ── Layout constants ── */
  const PAD = 48;
  const HEADER_Y = PAD;

  // Header text metrics
  const labelFS = 14; // "足迹 / FOOTPRINT"
  const numFS = 36; // city count number
  const statsFS = 10; // stats line

  // Cover thumbnails
  const coverW = 48;
  const coverH = 40;
  const coverGap = 4;

  // Header right description
  const descFS = 8;
  const descW = W / 3;

  // Footer
  const footerH = 80;
  const footerY = H - footerH;
  const footerLineY = footerY;
  const footerContentY = footerY + 24;

  // Dot grid: centered in the middle area
  const gridPad = 20;
  const gridTotalW = svgW + 2 * gridPad;
  const gridTotalH = svgH + 2 * gridPad;
  const headerBottom = HEADER_Y + 100;
  const availH = footerY - headerBottom;
  const gridX = (W - gridTotalW) / 2;
  const gridY = headerBottom + (availH - gridTotalH - 20) / 2;
  const dotsOffsetX = gridX + gridPad;
  const dotsOffsetY = gridY + gridPad;

  // Caption below dot grid
  const captionFS = 8;
  const captionY = gridY + gridTotalH + 8;

  // Legend (right side, above footer)
  const legendFS = 10;
  const legendGap = 16;
  const legendBarW = 24;
  const legendBarH = 2;
  const legendX = W - PAD;
  const legendBottomY = footerY - 32;

  // Compute left-side header positions
  const labelY = HEADER_Y;
  const numY = labelY + labelFS + 4;
  const statsY = numY + numFS + 8;

  // Cover thumbnails: to the right of the text column
  const textColW = 140;
  const coversX = PAD + textColW + 16;
  const coversY = HEADER_Y + 4;
  const coversTotalW = covers.length * coverW + (covers.length - 1) * coverGap;

  // Red border (right side of covers group)
  const coverBorderX = coversX + coversTotalW + 16;

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
        {/* Background */}
        <Rect width={W} height={H} fill="#fcfcfc" />

        {/* ── Header ── */}
        {/* Label: 足迹 / FOOTPRINT */}
        <Text
          x={PAD}
          y={labelY}
          text="足迹 / FOOTPRINT"
          fontSize={labelFS}
          fontStyle="500"
          fill="#262626"
          letterSpacing={labelFS * 0.12}
          fontFamily={FONT_CN}
        />

        {/* City count number */}
        <Text
          x={PAD}
          y={numY}
          text={`${totalCities}`}
          fontSize={numFS}
          fontStyle="normal"
          fill="#171717"
          letterSpacing={-1}
          fontFamily={FONT_CN}
        />

        {/* Stats line */}
        <Text
          x={PAD}
          y={statsY}
          text={`${totalItems} 个收藏 · ${totalCities} 座城市`}
          fontSize={statsFS}
          fontStyle="normal"
          fill="#a3a3a3"
          fontFamily={FONT_CN}
        />

        {/* Cover thumbnails */}
        {covers.length > 0 && (
          <Group>
            {covers.map((src, i) => (
              <CoverImg
                key={i}
                src={src}
                x={coversX + i * (coverW + coverGap)}
                y={coversY}
                w={coverW}
                h={coverH}
              />
            ))}
            {/* Red vertical border to the right of covers */}
            <Rect
              x={coverBorderX}
              y={coversY}
              width={2}
              height={coverH}
              fill="#ef4444"
            />
          </Group>
        )}

        {/* Right-side description text */}
        <Text
          x={W - PAD - descW}
          y={HEADER_Y}
          width={descW}
          text="MAPPING YOUR JOURNEY ACROSS CITIES AND PLACES. EACH DOT REPRESENTS A MOMENT CAPTURED IN YOUR COLLECTION."
          fontSize={descFS}
          fontStyle="normal"
          fill="#a3a3a3"
          lineHeight={1.3}
          align="right"
          fontFamily={FONT_UI}
          letterSpacing={descFS * 0.02}
        />

        {/* ── Dot Grid ── */}
        <Group x={dotsOffsetX} y={dotsOffsetY}>
          {dots.map((d, i) => (
            <Circle
              key={i}
              x={d.x}
              y={d.y}
              radius={d.r}
              fill={d.color}
            />
          ))}

          {/* Crosshair markers at corners */}
          {(
            [
              [0, 0],
              [svgW, 0],
              [0, svgH],
              [svgW, svgH],
            ] as [number, number][]
          ).map(([cx, cy], i) => (
            <Group key={`cross-${i}`} x={cx} y={cy}>
              <Line
                points={[-6, 0, 6, 0]}
                stroke="black"
                strokeWidth={1.5}
              />
              <Line
                points={[0, -6, 0, 6]}
                stroke="black"
                strokeWidth={1.5}
              />
            </Group>
          ))}
        </Group>

        {/* Caption below grid */}
        <Text
          x={0}
          y={captionY}
          width={W}
          text="TRAVEL FOOTPRINT DISTRIBUTION · DOT MATRIX VISUALIZATION"
          fontSize={captionFS}
          fontStyle="normal"
          fill="#a3a3a3"
          align="center"
          letterSpacing={captionFS * 0.15}
          fontFamily={FONT_UI}
        />

        {/* ── Legend (right side) ── */}
        {topCities.length > 0 && (
          <Group>
            {topCities.map((c, i) => {
              const ly =
                legendBottomY - (topCities.length - 1 - i) * legendGap;
              return (
                <Group key={c.name} x={legendX} y={ly}>
                  {/* City name */}
                  <Text
                    x={-legendBarW - 16 - 120}
                    y={-legendFS / 2}
                    width={120}
                    align="right"
                    text={c.name}
                    fontSize={legendFS}
                    fontStyle="500"
                    fill="#525252"
                    letterSpacing={legendFS * 0.12}
                    fontFamily={FONT_CN}
                  />
                  {/* Color bar */}
                  <Rect
                    x={-legendBarW}
                    y={-legendBarH / 2}
                    width={legendBarW}
                    height={legendBarH}
                    fill={c.color}
                  />
                </Group>
              );
            })}
            {totalCities > 6 && (
              <Group
                x={legendX}
                y={legendBottomY + legendGap}
              >
                <Text
                  x={-legendBarW - 16 - 120}
                  y={-legendFS / 2}
                  width={120}
                  align="right"
                  text={`其他 ${totalCities - 6} 城`}
                  fontSize={legendFS}
                  fontStyle="500"
                  fill="#525252"
                  letterSpacing={legendFS * 0.12}
                  fontFamily={FONT_CN}
                />
                <Rect
                  x={-legendBarW}
                  y={-legendBarH / 2}
                  width={legendBarW}
                  height={legendBarH}
                  fill="#a3a3a3"
                />
              </Group>
            )}
          </Group>
        )}

        {/* ── Footer ── */}
        {/* Divider line */}
        <Line
          points={[PAD, footerLineY, W - PAD, footerLineY]}
          stroke="#d4d4d4"
          strokeWidth={1.5}
        />

        {/* Brand: 觅途 */}
        <Text
          x={PAD}
          y={footerContentY}
          text="觅途"
          fontSize={24}
          fontStyle="bold"
          fill="#171717"
          letterSpacing={-1}
          fontFamily={FONT_CN}
        />

        {/* Brand: METOO */}
        <Text
          x={PAD}
          y={footerContentY + 28}
          text="METOO"
          fontSize={14}
          fontStyle="500"
          fill="#a3a3a3"
          letterSpacing={14 * 0.1}
          fontFamily={FONT_UI}
        />

        {/* Vertical separator between brand and QR */}
        <Line
          points={[
            PAD + 60 + 8,
            footerContentY,
            PAD + 60 + 8,
            footerContentY + 40,
          ]}
          stroke="#a3a3a3"
          strokeWidth={1}
        />

        {/* QR-like grid (3x3) */}
        {(() => {
          const qrSize = 28;
          const qrX = PAD + 60 + 8 + 12;
          const qrY = footerContentY + 6;
          const border = 2;
          const inner = qrSize - border * 2;
          const cellSize = (inner - 2) / 3; // 2px total gap
          const cellGap = 1;
          const rects: React.ReactNode[] = [];

          // Outer dark background
          rects.push(
            <Rect
              key="qr-bg"
              x={qrX}
              y={qrY}
              width={qrSize}
              height={qrSize}
              fill="#262626"
            />,
          );
          // Inner white background
          rects.push(
            <Rect
              key="qr-inner"
              x={qrX + border}
              y={qrY + border}
              width={inner}
              height={inner}
              fill="#ffffff"
            />,
          );

          // 3x3 cells
          for (let r = 0; r < 3; r++) {
            for (let c = 0; c < 3; c++) {
              const idx = r * 3 + c;
              const cx = qrX + border + c * (cellSize + cellGap);
              const cy = qrY + border + r * (cellSize + cellGap);
              rects.push(
                <Rect
                  key={`qr-${r}-${c}`}
                  x={cx}
                  y={cy}
                  width={cellSize}
                  height={cellSize}
                  fill={QR_PATTERN[idx] ? "#262626" : "#ffffff"}
                />,
              );
            }
          }
          return rects;
        })()}

        {/* Footer tags with colored dots */}
        {(() => {
          const tagFS = 9;
          const tagGap = 14;
          const dotR = 3;
          const dotGap = 6;
          // Compute total width to right-align
          const tagWidths = FOOTER_TAGS.map(
            (t) => dotR * 2 + dotGap + t.text.length * tagFS,
          );
          const totalTagW =
            tagWidths.reduce((a, b) => a + b, 0) +
            (FOOTER_TAGS.length - 1) * tagGap;
          let ox = W - PAD - totalTagW;
          const tagY = footerContentY + 16;

          return FOOTER_TAGS.map((tag, i) => {
            const x0 = ox;
            ox += tagWidths[i] + tagGap;
            return (
              <Group key={tag.text} x={x0} y={tagY}>
                <Circle x={dotR} y={tagFS / 2} radius={dotR} fill={tag.color} />
                <Text
                  x={dotR * 2 + dotGap}
                  y={0}
                  text={tag.text}
                  fontSize={tagFS}
                  fontStyle="600"
                  fill="#525252"
                  letterSpacing={tagFS * 0.08}
                  fontFamily={FONT_CN}
                />
              </Group>
            );
          });
        })()}
      </Group>
    </KonvaPosterStage>
  );
}

export default DotMapPoster;
