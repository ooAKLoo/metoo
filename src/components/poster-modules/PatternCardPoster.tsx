import { useMemo } from "react";
import { Rect, Text, Group, Circle, Path, Image as KImage, Shape } from "react-konva";
import useImage from "use-image";
import type { PosterModuleProps } from "../../lib/poster-modules";
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

/* ── Single circle cell with image loading ── */
function CityCircleCell({
  cell,
  cx,
  cy,
  radius,
  isBrutal,
  borderWidth,
}: {
  cell: CityCell;
  cx: number;
  cy: number;
  radius: number;
  isBrutal: boolean;
  borderWidth: number;
}) {
  const [img] = useImage(cell.cover, "anonymous");
  const d = radius * 2;

  return (
    <Group x={cx - radius} y={cy - radius}>
      {/* Brutalism shadow offset rect (circle approximation) */}
      {isBrutal && (
        <Circle
          x={radius + 3}
          y={radius + 3}
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
          <KImage
            image={img}
            width={d}
            height={d}
            // cover-fit: crop from center
          />
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

        {/* Star overlay */}
        <Path
          data={starPath(d)}
          fill={cell.cover ? "rgba(255,255,255,0.15)" : "rgba(0,0,0,0.1)"}
        />
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
  posterWidth: W,
  posterHeight: H,
}: PosterModuleProps) {
  const patternStyleIdx = useMapStore((s) => s.patternStyleIdx);
  const cardStyle = PATTERN_STYLES[patternStyleIdx % PATTERN_STYLES.length].id;
  const isBrutal = cardStyle === "brutalism";

  const totalCities = cityEntries.length;
  const totalItems = items.length;
  const topCity = cityEntries[0];

  const borderWidth = 4;
  const brRadius = 16;
  const accentColor = CITY_COLORS[1];
  const primaryColor = CITY_COLORS[0];

  const title = topCity ? `${topCity.name} \u00B7 ${totalCities}\u57CE` : "\u89C5\u9014 \u00B7 \u65C5\u884C";

  /* ── Grid layout from city count ── */
  const cols = Math.min(4, Math.max(2, Math.ceil(Math.sqrt(totalCities || 4))));
  const rows = Math.min(5, Math.max(2, Math.ceil((totalCities || 4) / cols)));
  const cellCount = cols * rows;

  /* ── Build city cells ── */
  const cells: CityCell[] = useMemo(() => {
    const out: CityCell[] = [];
    for (let i = 0; i < cellCount; i++) {
      const city = cityEntries[i];
      if (city) {
        const cover = city.covers[0] ? coverSrc(city.covers[0]) : "";
        out.push({ name: city.name, count: city.count, cover, color: CITY_COLORS[i % CITY_COLORS.length] });
      } else {
        out.push({ name: "", count: 0, cover: "", color: CITY_COLORS[i % CITY_COLORS.length] });
      }
    }
    return out;
  }, [cityEntries, cellCount]);

  /* ── Layout constants ── */
  const GRID_GAP = isBrutal ? 16 : 12;
  const GRID_PAD = 32;
  const HEADER_H = 72;
  const FOOTER_STATS_H = 120;
  const LABEL_H = 28;
  const FOOTER_STRIP_H = isBrutal ? 24 : 4;

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
    const gap = 16;
    const fs = 11;
    let ox = 0;
    return top8.map((city, i) => {
      const label = `${i + 1}. ${city.name}`;
      const countLabel = `(${city.count})`;
      const fw = i === 0 ? "700" : "400";
      // For brutalism first item, add padding
      const extraPad = isBrutal && i === 0 ? 16 : 0;
      const textW = measureText(label + countLabel, fs, fw, FONT_CN) + 4 + extraPad;
      const x = ox;
      ox += textW + gap;
      return { city, label, countLabel, x, w: textW, idx: i };
    });
  }, [cityEntries, isBrutal]);

  return (
    <KonvaPosterStage width={W} height={H}>
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

        {/* ── Brutalism outer border shadow ── */}
        {isBrutal && (
          <>
            {/* Inset highlight is not easily replicated; skip the inset part.
                The solid shadow is approximated by the outer clip + border below. */}
          </>
        )}

        {/* ══════════ HEADER ══════════ */}
        {isBrutal ? (
          <Group>
            {/* Header background */}
            <Rect x={0} y={0} width={W} height={HEADER_H} fill="#FDFDFD" />
            {/* Header bottom border */}
            <Rect x={0} y={HEADER_H - borderWidth} width={W} height={borderWidth} fill="#000" />

            {/* Title text */}
            <Text
              x={28}
              y={0}
              width={W - 28 - 72 - borderWidth}
              height={HEADER_H - borderWidth}
              text={title}
              fontSize={28}
              fontStyle="900"
              fill="#000"
              fontFamily={FONT_CN}
              verticalAlign="middle"
            />

            {/* Right accent box */}
            <Rect
              x={W - 72}
              y={0}
              width={72}
              height={HEADER_H - borderWidth}
              fill={accentColor}
            />
            {/* Left border of accent box */}
            <Rect
              x={W - 72 - borderWidth}
              y={0}
              width={borderWidth}
              height={HEADER_H - borderWidth}
              fill="#000"
            />

            {/* Small square icon in accent box */}
            {/* Shadow offset */}
            <Rect
              x={W - 72 / 2 - 16 + 4}
              y={(HEADER_H - borderWidth) / 2 - 16 + 4}
              width={32}
              height={32}
              cornerRadius={brRadius / 2}
              fill="#000"
            />
            {/* Icon square */}
            <Rect
              x={W - 72 / 2 - 16}
              y={(HEADER_H - borderWidth) / 2 - 16}
              width={32}
              height={32}
              cornerRadius={brRadius / 2}
              fill={primaryColor}
              stroke="#000"
              strokeWidth={3}
            />
          </Group>
        ) : (
          /* ── Flat theme: full border wrapping header + grid ── */
          (() => {
            const boxX = 32;
            const boxY = 20;
            const boxW = W - 64;
            const boxH = statsY - 12 - boxY;
            const hdrH = 60;
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
                  x={boxX + 20}
                  y={boxY}
                  width={boxW - 20 - 60 - 1.5}
                  height={hdrH}
                  text={title}
                  fontSize={22}
                  fontStyle="500"
                  fill="#1a1a1a"
                  fontFamily={FONT_MONO}
                  letterSpacing={-0.44}
                  verticalAlign="middle"
                />
                {/* Right icon box border */}
                <Rect
                  x={boxX + boxW - 60}
                  y={boxY}
                  width={60}
                  height={hdrH}
                  stroke="#1a1a1a"
                  strokeWidth={1.5}
                />
                {/* Circle icon */}
                <Circle
                  x={boxX + boxW - 30}
                  y={boxY + hdrH / 2}
                  radius={12}
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
              />

              {/* City name + count label below circle */}
              {cell.name ? (
                <Group>
                  <Text
                    x={cx - cellW / 2}
                    y={cy + radius + 8}
                    width={cellW}
                    text={cell.name}
                    fontSize={13}
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
                    y={cy + radius + 8 + 16}
                    width={cellW}
                    text={`${cell.count} \u6536\u85CF`}
                    fontSize={10}
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
        <Group x={32} y={statsY}>
          {/* City ranking list (horizontal flow) */}
          {rankingEntries.map((entry) => {
            const isFirst = entry.idx === 0;
            if (isBrutal && isFirst) {
              // Highlighted first city with background
              const bgW = measureText(entry.label + entry.countLabel, 11, "700", FONT_CN) + 20;
              return (
                <Group key={entry.city.name} x={entry.x} y={0}>
                  <Rect
                    width={bgW}
                    height={18}
                    fill={CITY_COLORS[0]}
                    cornerRadius={4}
                    y={-2}
                  />
                  <Text
                    x={8}
                    y={0}
                    text={`${entry.label}${entry.countLabel}`}
                    fontSize={11}
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
                  fontSize={11}
                  fontStyle={isFirst ? "700" : "400"}
                  fill={isFirst ? "#000" : "#737373"}
                  fontFamily={FONT_CN}
                />
                <Text
                  x={measureText(entry.label, 11, isFirst ? "700" : "400", FONT_CN) + 2}
                  text={entry.countLabel}
                  fontSize={11}
                  fill="#a3a3a3"
                  fontFamily={FONT_CN}
                />
              </Group>
            );
          })}

          {/* Divider line below ranking */}
          <Rect
            x={0}
            y={24}
            width={W - 64}
            height={isBrutal ? 3 : 1}
            fill={isBrutal ? "#000" : "#e5e5e5"}
          />

          {/* Stats bar */}
          <Text
            x={0}
            y={38}
            text={`${totalItems} \u4E2A\u6536\u85CF \u00B7 ${totalCities} \u5EA7\u57CE\u5E02`}
            fontSize={12}
            fontStyle="500"
            fill="#737373"
            fontFamily={FONT_CN}
          />
          <Text
            x={0}
            y={38}
            width={W - 64}
            text={"\u89C5\u9014 METOO"}
            fontSize={12}
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
                const stripeW = 8;
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

        {/* ── Brutalism outer border ── */}
        {isBrutal && (
          <Rect
            x={0}
            y={0}
            width={W}
            height={H}
            stroke="#000"
            strokeWidth={borderWidth}
            cornerRadius={brRadius}
            listening={false}
          />
        )}
      </Group>
    </KonvaPosterStage>
  );
}
