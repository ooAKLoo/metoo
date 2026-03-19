import { useMemo, useState, useCallback } from "react";
import {
  Rect,
  Text,
  Group,
  Circle,
  Shape,
  Image as KImage,
} from "react-konva";
import useImage from "use-image";
import type { PosterModuleProps } from "../../lib/poster-modules";
import { KonvaPosterStage } from "../../lib/poster-stage";
import { coverSrc } from "../map-shared";
import { useMapStore } from "../../stores/useMapStore";
import { getRegionOutline } from "../../lib/region-outline";

/* ══════════════════════════════════════════════════════
   Shared Utilities
   ══════════════════════════════════════════════════════ */

export function hslToHex(h: number, s: number, l: number): string {
  h = ((h % 360) + 360) % 360;
  s = Math.max(0, Math.min(100, s)) / 100;
  l = Math.max(0, Math.min(100, l)) / 100;
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = l - c / 2;
  let r = 0, g = 0, b = 0;
  if (h < 60) { r = c; g = x; }
  else if (h < 120) { r = x; g = c; }
  else if (h < 180) { g = c; b = x; }
  else if (h < 240) { g = x; b = c; }
  else if (h < 300) { r = x; b = c; }
  else { r = c; b = x; }
  const to = (v: number) =>
    Math.round((v + m) * 255).toString(16).padStart(2, "0");
  return `#${to(r)}${to(g)}${to(b)}`;
}

export function hexToHsl(hex: string): [number, number, number] {
  const raw = hex.replace("#", "");
  const r = parseInt(raw.slice(0, 2), 16) / 255;
  const g = parseInt(raw.slice(2, 4), 16) / 255;
  const b = parseInt(raw.slice(4, 6), 16) / 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  const l = (max + min) / 2;
  if (max === min) return [0, 0, Math.round(l * 100)];
  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  let h = 0;
  if (max === r) h = ((g - b) / d + (g < b ? 6 : 0)) * 60;
  else if (max === g) h = ((b - r) / d + 2) * 60;
  else h = ((r - g) / d + 4) * 60;
  return [Math.round(h), Math.round(s * 100), Math.round(l * 100)];
}


export interface DerivedPopPalette {
  primary: string;
  secondary: string;
  tertiary: string;
  quad: string;
  quinary: string;
  bg: string;
  ink: string;
  lightInk: string;
}

export function derivePopBoardPalette(hue: number): DerivedPopPalette {
  return {
    primary: hslToHex(hue, 90, 65),
    secondary: hslToHex(hue + 55, 95, 62),
    tertiary: hslToHex(hue + 180, 85, 55),
    quad: hslToHex(hue + 150, 80, 62),
    quinary: hslToHex(hue + 30, 88, 58),
    bg: hslToHex(hue + 210, 45, 7),
    ink: hslToHex(hue + 210, 20, 12),
    lightInk: hslToHex(hue + 210, 15, 25),
  };
}

export const POP_BOARD_HUE_PRESETS = [
  { name: "玫粉", hue: 330 },
  { name: "橙红", hue: 15 },
  { name: "金黄", hue: 45 },
  { name: "翠绿", hue: 155 },
  { name: "宝蓝", hue: 220 },
  { name: "靛紫", hue: 275 },
];

/* ── Hue 预设 — 只需定义名字和色相，配色全自动 ── */

const FONT_CN = "'ZCOOL KuaiLe', 'Noto Sans SC', 'PingFang SC', system-ui, sans-serif";

/* ── Dimensions ── */

const N = 7;
const GAP = 3;
const PAD = 4;

function buildEdgePath(): Array<[number, number]> {
  const p: Array<[number, number]> = [];
  for (let c = 0; c < N; c++) p.push([0, c]);
  for (let r = 1; r < N; r++) p.push([r, N - 1]);
  for (let c = N - 2; c >= 0; c--) p.push([N - 1, c]);
  for (let r = N - 2; r >= 1; r--) p.push([r, 0]);
  return p;
}

const EDGE_PATH = buildEdgePath();
const CORNER_IDX = [0, N - 1, 2 * (N - 1), 3 * (N - 1)] as const;
const PATTERN_IDX = new Set([3, 15]);

interface ScatterSlot { x: number; y: number; rot: number; w: number; }

const DEFAULT_SCATTER: ScatterSlot[] = [
  { x: 39, y: 8, rot: -14, w: 105 },
  { x: 43, y: 77, rot: 10, w: 95 },
  { x: 79, y: 41, rot: 20, w: 95 },
  { x: 3, y: 45, rot: -12, w: 100 },
  { x: 8, y: 69, rot: 16, w: 90 },
  { x: 4, y: 19, rot: -18, w: 100 },
  { x: 72, y: 66, rot: 8, w: 88 },
  { x: 74, y: 16, rot: -15, w: 92 },
];

function cellSize(totalLen: number) { return (totalLen - PAD * 2 - GAP * (N - 1)) / N; }
function cellX(col: number, cs: number) { return PAD + col * (cs + GAP); }
function cellY(row: number, cs: number) { return PAD + row * (cs + GAP); }

/* ── Mini doodle icons for board game cells ── */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function drawCellDoodle(ctx: any, type: number, s: number, color: string) {
  ctx.save();
  ctx.strokeStyle = color; ctx.fillStyle = color;
  ctx.lineWidth = 1.8; ctx.lineCap = "round"; ctx.lineJoin = "round";
  switch (((type % 6) + 6) % 6) {
    case 0: { // Heart
      const hw = s / 2;
      ctx.beginPath();
      ctx.moveTo(hw, s * 0.22);
      ctx.bezierCurveTo(hw, 0, 0, 0, 0, s * 0.32);
      ctx.bezierCurveTo(0, s * 0.65, hw, s * 0.88, hw, s);
      ctx.bezierCurveTo(hw, s * 0.88, s, s * 0.65, s, s * 0.32);
      ctx.bezierCurveTo(s, 0, hw, 0, hw, s * 0.22);
      ctx.closePath();
      ctx.globalAlpha = 0.13; ctx.fill(); ctx.globalAlpha = 0.28; ctx.stroke();
      break;
    }
    case 1: { // 4-pointed star
      const r = s / 2, ir = r * 0.35;
      ctx.beginPath();
      for (let j = 0; j < 8; j++) {
        const a = (j * Math.PI) / 4 - Math.PI / 2;
        const rad = j % 2 === 0 ? r : ir;
        j === 0 ? ctx.moveTo(r + Math.cos(a) * rad, r + Math.sin(a) * rad) : ctx.lineTo(r + Math.cos(a) * rad, r + Math.sin(a) * rad);
      }
      ctx.closePath();
      ctx.globalAlpha = 0.13; ctx.fill(); ctx.globalAlpha = 0.28; ctx.stroke();
      break;
    }
    case 2: { // Diamond
      ctx.beginPath();
      ctx.moveTo(s / 2, 0); ctx.lineTo(s, s / 2); ctx.lineTo(s / 2, s); ctx.lineTo(0, s / 2);
      ctx.closePath();
      ctx.globalAlpha = 0.13; ctx.fill(); ctx.globalAlpha = 0.28; ctx.stroke();
      break;
    }
    case 3: { // Crown
      ctx.beginPath();
      ctx.moveTo(0, s * 0.85); ctx.lineTo(0, s * 0.3); ctx.lineTo(s * 0.25, s * 0.5);
      ctx.lineTo(s * 0.5, s * 0.15); ctx.lineTo(s * 0.75, s * 0.5);
      ctx.lineTo(s, s * 0.3); ctx.lineTo(s, s * 0.85); ctx.closePath();
      ctx.globalAlpha = 0.13; ctx.fill(); ctx.globalAlpha = 0.28; ctx.stroke();
      break;
    }
    case 4: { // Lightning
      ctx.beginPath();
      ctx.moveTo(s * 0.55, 0); ctx.lineTo(s * 0.15, s * 0.45); ctx.lineTo(s * 0.45, s * 0.45);
      ctx.lineTo(s * 0.4, s); ctx.lineTo(s * 0.85, s * 0.5); ctx.lineTo(s * 0.55, s * 0.5);
      ctx.closePath();
      ctx.globalAlpha = 0.13; ctx.fill(); ctx.globalAlpha = 0.28; ctx.stroke();
      break;
    }
    case 5: { // Target
      ctx.globalAlpha = 0.13;
      ctx.beginPath(); ctx.arc(s / 2, s / 2, s * 0.45, 0, Math.PI * 2); ctx.fill();
      ctx.globalAlpha = 0.28; ctx.stroke();
      ctx.beginPath(); ctx.arc(s / 2, s / 2, s * 0.25, 0, Math.PI * 2); ctx.stroke();
      ctx.beginPath(); ctx.arc(s / 2, s / 2, s * 0.08, 0, Math.PI * 2); ctx.fill();
      break;
    }
  }
  ctx.restore();
}

/* ── Konva icon shapes ── */

function KonvaIconFlag({ x, y, s }: { x: number; y: number; s: number }) {
  return (
    <Shape x={x} y={y} sceneFunc={(ctx, shape) => {
      const sc = s / 448;
      ctx.save(); ctx.scale(sc, sc); ctx.fillStyle = "#fff";
      ctx.beginPath(); ctx.roundRect(0, 0, 32, 512, 16); ctx.fill();
      ctx.save(); ctx.beginPath();
      ctx.moveTo(32, 0); ctx.lineTo(416, 0);
      ctx.quadraticCurveTo(400, 64, 416, 128);
      ctx.quadraticCurveTo(432, 192, 416, 256);
      ctx.lineTo(32, 256); ctx.closePath(); ctx.clip();
      ctx.fillRect(32, 0, 96, 64); ctx.fillRect(224, 0, 96, 64);
      ctx.fillRect(128, 64, 96, 64); ctx.fillRect(320, 64, 96, 64);
      ctx.fillRect(32, 128, 96, 64); ctx.fillRect(224, 128, 96, 64);
      ctx.fillRect(128, 192, 96, 64); ctx.fillRect(320, 192, 96, 64);
      ctx.restore(); ctx.restore(); ctx.fillStrokeShape(shape);
    }} />
  );
}

function KonvaIconCoffee({ x, y, s, ink }: { x: number; y: number; s: number; ink: string }) {
  return (
    <Shape x={x} y={y} sceneFunc={(ctx, shape) => {
      const sc = s / 28;
      ctx.save(); ctx.scale(sc, sc);
      ctx.strokeStyle = ink; ctx.lineCap = "round"; ctx.lineJoin = "round";
      ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.moveTo(10, 6); ctx.quadraticCurveTo(11, 3, 10, 1); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(15, 6); ctx.quadraticCurveTo(16, 3, 15, 1); ctx.stroke();
      ctx.lineWidth = 2.5;
      ctx.beginPath(); ctx.moveTo(4, 9); ctx.lineTo(20, 9); ctx.lineTo(18, 24); ctx.lineTo(6, 24); ctx.closePath();
      ctx.fillStyle = "#fff"; ctx.fill(); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(20, 12); ctx.quadraticCurveTo(26, 12, 26, 17); ctx.quadraticCurveTo(26, 22, 20, 22); ctx.stroke();
      ctx.fillStyle = ink; ctx.globalAlpha = 0.2;
      ctx.beginPath(); ctx.roundRect(7, 14, 10, 4, 1); ctx.fill();
      ctx.globalAlpha = 1; ctx.restore(); ctx.fillStrokeShape(shape);
    }} />
  );
}

function KonvaIconSearch({ x, y, s, ink }: { x: number; y: number; s: number; ink: string }) {
  return (
    <Shape x={x} y={y} sceneFunc={(ctx, shape) => {
      const sc = s / 28;
      ctx.save(); ctx.scale(sc, sc);
      ctx.strokeStyle = ink; ctx.lineCap = "round";
      ctx.lineWidth = 2.5;
      ctx.beginPath(); ctx.arc(12, 12, 8, 0, Math.PI * 2);
      ctx.fillStyle = "#fff"; ctx.fill(); ctx.stroke();
      ctx.fillStyle = ink; ctx.globalAlpha = 0.15;
      ctx.beginPath(); ctx.arc(10, 10, 2, 0, Math.PI * 2); ctx.fill();
      ctx.globalAlpha = 1;
      ctx.lineWidth = 3;
      ctx.beginPath(); ctx.moveTo(18, 18); ctx.lineTo(25, 25); ctx.stroke();
      ctx.restore(); ctx.fillStrokeShape(shape);
    }} />
  );
}

function KonvaIconRocket({ x, y, s, ink }: { x: number; y: number; s: number; ink: string }) {
  return (
    <Shape x={x} y={y} sceneFunc={(ctx, shape) => {
      const sc = s / 28;
      ctx.save(); ctx.scale(sc, sc);
      ctx.strokeStyle = ink; ctx.lineJoin = "round";
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.moveTo(14, 2); ctx.quadraticCurveTo(22, 8, 22, 18);
      ctx.lineTo(18, 22); ctx.lineTo(10, 22); ctx.lineTo(6, 18);
      ctx.quadraticCurveTo(6, 8, 14, 2); ctx.closePath();
      ctx.fillStyle = "#fff"; ctx.fill(); ctx.stroke();
      ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.arc(14, 12, 3, 0, Math.PI * 2);
      ctx.fillStyle = ink; ctx.globalAlpha = 0.25; ctx.fill(); ctx.globalAlpha = 1; ctx.stroke();
      ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.moveTo(6, 18); ctx.lineTo(3, 24); ctx.lineTo(10, 22); ctx.closePath();
      ctx.fillStyle = ink; ctx.fill(); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(22, 18); ctx.lineTo(25, 24); ctx.lineTo(18, 22); ctx.closePath();
      ctx.fill(); ctx.stroke();
      ctx.fillStyle = ink; ctx.globalAlpha = 0.3;
      ctx.beginPath(); ctx.moveTo(11, 22); ctx.quadraticCurveTo(14, 28, 17, 22); ctx.fill();
      ctx.globalAlpha = 1; ctx.restore(); ctx.fillStrokeShape(shape);
    }} />
  );
}

/* ── Corner metadata ── */
interface CornerDef { label: string; iconType: "flag" | "coffee" | "search" | "rocket"; color: string; }

function buildCornerMeta(dp: DerivedPopPalette): Record<number, CornerDef> {
  return {
    [CORNER_IDX[0]]: { label: "起点", iconType: "flag", color: dp.primary },
    [CORNER_IDX[1]]: { label: "休息", iconType: "coffee", color: dp.tertiary },
    [CORNER_IDX[2]]: { label: "发现", iconType: "search", color: dp.secondary },
    [CORNER_IDX[3]]: { label: "传送", iconType: "rocket", color: dp.quad },
  };
}

/* ── Cover image sub-component ── */
function CoverImageCell({
  src, x, y, w, h, name, count, ink, mode, bgColor, outline,
}: {
  src: string; x: number; y: number; w: number; h: number;
  name: string; count: number; ink: string; mode: "cells" | "center"; bgColor: string;
  outline?: number[][][] | null;
}) {
  const [img] = useImage(src, "anonymous");
  const showCover = mode === "cells" && !!src && !!img;
  const fs = name.length > 5 ? 11 : name.length > 3 ? 13 : 15;
  const contentH = fs * 1.2 + 2 + 14;
  const contentTop = (h - contentH) / 2;
  const nameY = contentTop;
  const badgeY = contentTop + fs * 1.2 + 2;
  const badgeW = 11 * String(count).length + 18;

  return (
    <Group x={x} y={y} clipX={0} clipY={0} clipWidth={w} clipHeight={h}>
      <Rect width={w} height={h} fill={bgColor} />
      {showCover && img && (
        <>
          <KImage image={img} x={0} y={0} width={w} height={h}
            crop={img.width && img.height ? (() => {
              const imgAspect = img.width / img.height;
              const cellAspect = w / h;
              if (imgAspect > cellAspect) {
                const cropW = img.height * cellAspect;
                return { x: (img.width - cropW) / 2, y: 0, width: cropW, height: img.height };
              } else {
                const cropH = img.width / cellAspect;
                return { x: 0, y: (img.height - cropH) / 2, width: img.width, height: cropH };
              }
            })() : undefined}
          />
          <Rect x={0} y={0} width={w} height={h}
            fillLinearGradientStartPoint={{ x: 0, y: h }}
            fillLinearGradientEndPoint={{ x: 0, y: h * 0.4 }}
            fillLinearGradientColorStops={[0, "rgba(0,0,0,0.75)", 1, "rgba(0,0,0,0.1)"]}
          />
        </>
      )}
      {/* Region outline — on cover: white semi-transparent; on color bg: ink tint */}
      {outline && (
        <Shape
          sceneFunc={(ctx, shape) => {
            ctx.beginPath();
            for (const ring of outline) {
              ring.forEach((pt: number[], i: number) => {
                if (i === 0) ctx.moveTo(pt[0], pt[1]);
                else ctx.lineTo(pt[0], pt[1]);
              });
              ctx.closePath();
            }
            ctx.fillStrokeShape(shape);
          }}
          fill={showCover ? "#fff" : ink}
          opacity={showCover ? 0.15 : 0.07}
        />
      )}
      {showCover && [[1, 1], [-1, -1], [1, -1], [-1, 1]].map(([dx, dy], i) => (
        <Text key={i} x={dx} y={nameY + dy} width={w} align="center"
          text={name} fontSize={fs} fontStyle="900" fill={ink} fontFamily={FONT_CN} />
      ))}
      <Text x={0} y={nameY} width={w} align="center"
        text={name} fontSize={fs} fontStyle="900" fill={showCover ? "#fff" : ink} fontFamily={FONT_CN} />
      <Rect x={(w - badgeW) / 2} y={badgeY} width={badgeW} height={14}
        fill={showCover ? "rgba(0,0,0,0.5)" : ink} cornerRadius={2} />
      <Text x={(w - badgeW) / 2} y={badgeY + 1} width={badgeW} align="center"
        text={`\u00d7${count}`} fontSize={11} fontStyle="700" fill="#fff" fontFamily={FONT_CN} />
      <Circle x={5.5} y={5.5} radius={2.5} fill="#fff" stroke={ink} strokeWidth={1.5} opacity={0.5} />
    </Group>
  );
}

/* ── Scattered photo card ── */
function ScatteredPhotoCard({
  src, name, slot, centerW, centerH, ink, yellow, onDragEnd,
}: {
  src: string; name: string; slot: ScatterSlot;
  centerW: number; centerH: number; ink: string; yellow: string;
  onDragEnd: (x: number, y: number) => void;
}) {
  const [img] = useImage(src, "anonymous");
  const baseCenter = 750;
  const photoScale = Math.max(centerW, centerH) / baseCenter;
  const pw = Math.round(slot.w * photoScale);
  const ph = Math.round(pw * 0.75);
  const border = 4;
  const innerW = pw - border * 2 - 4;
  const innerH = ph - border * 2 - 4;
  const labelW = Math.max(name.length * 10 + 16, 40);
  const labelH = 16;

  return (
    <Group draggable
      x={(slot.x / 100) * centerW} y={(slot.y / 100) * centerH} rotation={slot.rot}
      onDragEnd={(e) => {
        const node = e.target;
        const newX = (node.x() / centerW) * 100;
        const newY = (node.y() / centerH) * 100;
        onDragEnd(Math.round(Math.max(-5, Math.min(88, newX))), Math.round(Math.max(-5, Math.min(88, newY))));
      }}
    >
      <Rect x={5} y={5} width={pw} height={ph} fill={ink} />
      <Rect x={0} y={0} width={pw} height={ph} fill="#fff" stroke={ink} strokeWidth={border} />
      {img && (
        <KImage image={img} x={border + 2} y={border + 2} width={innerW} height={innerH}
          crop={img.width && img.height ? (() => {
            const imgAspect = img.width / img.height;
            const cellAspect = innerW / innerH;
            if (imgAspect > cellAspect) {
              const cropW = img.height * cellAspect;
              return { x: (img.width - cropW) / 2, y: 0, width: cropW, height: img.height };
            } else {
              const cropH = img.width / cellAspect;
              return { x: 0, y: (img.height - cropH) / 2, width: img.width, height: cropH };
            }
          })() : undefined}
        />
      )}
      <Group x={(pw - labelW) / 2} y={ph - 10}>
        <Rect x={2} y={2} width={labelW} height={labelH} fill={ink} />
        <Rect x={0} y={0} width={labelW} height={labelH} fill={yellow} stroke={ink} strokeWidth={2} />
        <Text x={0} y={2} width={labelW} align="center"
          text={name} fontSize={10} fontStyle="900" fill={ink} fontFamily={FONT_CN} />
      </Group>
    </Group>
  );
}

/* ── Board Game Content ── */
function PopBoardPoster({ cityEntries, posterWidth: PW, posterHeight: PH }: PosterModuleProps) {
  const mode = useMapStore((s) => s.popBoardMode);
  const popBoardHue = useMapStore((s) => s.popBoardHue);
  const dp = useMemo(() => derivePopBoardPalette(popBoardHue), [popBoardHue]);
  const C = { pink: dp.primary, yellow: dp.secondary, blue: dp.tertiary, mint: dp.quad, orange: dp.quinary };
  const INK = dp.ink;

  const CELL_PALETTE = useMemo(
    () => [C.pink, C.yellow, "#fff", C.mint, C.orange, "#fff"],
    [C.pink, C.yellow, C.mint, C.orange],
  );
  const CORNER_META = useMemo(() => buildCornerMeta(dp), [dp]);
  const [slots, setSlots] = useState<ScatterSlot[]>(DEFAULT_SCATTER);
  const csW = cellSize(PW);
  const csH = cellSize(PH);

  const cities = useMemo(() => [...cityEntries].sort((a, b) => b.count - a.count), [cityEntries]);
  const totalVisits = useMemo(() => cityEntries.reduce((s, c) => s + c.count, 0), [cityEntries]);
  const centerCovers = useMemo(
    () => cities.flatMap((c) => c.covers[0] ? [{ src: coverSrc(c.covers[0]), name: c.name }] : []).slice(0, DEFAULT_SCATTER.length),
    [cities],
  );

  /* Pre-compute region outlines for all cities */
  const outlineMap = useMemo(() => {
    const map = new Map<string, number[][][] | null>();
    for (const c of cities) {
      if (!map.has(c.name)) map.set(c.name, getRegionOutline(c.name, csW, csH));
    }
    return map;
  }, [cities, csW, csH]);

  const cellMap = useMemo(() => {
    let ci = 0;
    return EDGE_PATH.map(([row, col], idx) => {
      const corner = CORNER_META[idx];
      const isPattern = PATTERN_IDX.has(idx);
      const city = !corner && !isPattern && ci < cities.length ? cities[ci++] : null;
      const cover = city?.covers[0] ? coverSrc(city.covers[0]) : "";
      const bgColor = corner ? corner.color : isPattern ? "#fff" : CELL_PALETTE[idx % CELL_PALETTE.length];
      return { row, col, idx, corner, isPattern, city, cover, bgColor, cityStep: city ? ci : 0 };
    });
  }, [cities, CORNER_META, CELL_PALETTE]);

  const centerX = cellX(1, csW);
  const centerY = cellY(1, csH);
  const centerW = 5 * csW + 4 * GAP;
  const centerH = 5 * csH + 4 * GAP;

  const updateSlot = useCallback((i: number, x: number, y: number) => {
    setSlots((prev) => prev.map((s, idx) => (idx === i ? { ...s, x, y } : s)));
  }, []);

  return (
    <KonvaPosterStage width={PW} height={PH}>
      <Rect width={PW} height={PH} fill={dp.bg} />

      {/* Edge cells */}
      {cellMap.map((cell) => {
        const cx = cellX(cell.col, csW);
        const cy = cellY(cell.row, csH);

        if (cell.corner) {
          const iconS = Math.min(csW, csH) * 0.32;
          const iconX = cx + (csW - iconS) / 2;
          const iconY = cy + csH * 0.15;
          const labelFS = Math.min(csW, csH) * 0.13;
          const labelY = cy + csH * 0.55;
          return (
            <Group key={cell.idx}>
              <Rect x={cx} y={cy} width={csW} height={csH} fill={cell.bgColor} />
              {cell.corner.iconType === "flag" && <KonvaIconFlag x={iconX} y={iconY} s={iconS} />}
              {cell.corner.iconType === "coffee" && <KonvaIconCoffee x={iconX} y={iconY} s={iconS} ink={dp.lightInk} />}
              {cell.corner.iconType === "search" && <KonvaIconSearch x={iconX} y={iconY} s={iconS} ink={dp.lightInk} />}
              {cell.corner.iconType === "rocket" && <KonvaIconRocket x={iconX} y={iconY} s={iconS} ink={dp.lightInk} />}
              {[[1, 1], [-1, -1], [1, -1], [-1, 1]].map(([dx, dy], i) => (
                <Text key={i} x={cx + dx} y={labelY + dy} width={csW} align="center"
                  text={cell.corner!.label} fontSize={labelFS} fontStyle="900" fill={INK}
                  fontFamily={FONT_CN} />
              ))}
              <Text x={cx} y={labelY} width={csW} align="center"
                text={cell.corner.label} fontSize={labelFS} fontStyle="900" fill="#fff"
                fontFamily={FONT_CN} />
            </Group>
          );
        }

        if (cell.isPattern) {
          return (
            <Group key={cell.idx}>
              <Shape x={cx} y={cy} sceneFunc={(ctx, shape) => {
                ctx.save(); ctx.beginPath(); ctx.rect(0, 0, csW, csH); ctx.clip();
                ctx.fillStyle = "#fff"; ctx.fillRect(0, 0, csW, csH);
                const tile = 8; ctx.fillStyle = C.pink;
                for (let ry = 0; ry < csH; ry += tile) {
                  for (let rx = 0; rx < csW; rx += tile) {
                    if (((Math.floor(rx / tile) + Math.floor(ry / tile)) & 1) === 0) ctx.fillRect(rx, ry, tile, tile);
                  }
                }
                ctx.restore(); ctx.fillStrokeShape(shape);
              }} />
            </Group>
          );
        }

        if (cell.city) {
          const doodleS = Math.min(csW, csH) * 0.16;
          const dir = cell.idx < N ? 0 : cell.idx < 2 * (N - 1) ? 1 : cell.idx < 3 * (N - 1) ? 2 : 3;
          const chevronPos = [
            [cx + csW - 8, cy + csH / 2],
            [cx + csW / 2, cy + csH - 8],
            [cx + 8, cy + csH / 2],
            [cx + csW / 2, cy + 8],
          ][dir];
          return (
            <Group key={cell.idx}>
              <CoverImageCell src={cell.cover} x={cx} y={cy} w={csW} h={csH}
                name={cell.city.name} count={cell.city.count} ink={INK} mode={mode} bgColor={cell.bgColor}
                outline={outlineMap.get(cell.city.name)} />
              {mode === "center" && (
                <>
                  {/* Step number — top-right */}
                  <Group x={cx + csW - 18} y={cy + 3}>
                    <Circle x={8} y={8} radius={8} fill="#fff" stroke={INK} strokeWidth={2} />
                    <Text x={0} y={cell.cityStep >= 10 ? 3 : 2.5} width={16} align="center"
                      text={`${cell.cityStep}`} fontSize={cell.cityStep >= 10 ? 7.5 : 9}
                      fontStyle="900" fill={INK} fontFamily={FONT_CN} />
                  </Group>
                  {/* Mini doodle — bottom center */}
                  <Shape x={cx + (csW - doodleS) / 2} y={cy + csH - doodleS - 6}
                    sceneFunc={(ctx, shape) => {
                      drawCellDoodle(ctx, cell.cityStep - 1, doodleS, INK);
                      ctx.fillStrokeShape(shape);
                    }} />
                  {/* Path direction chevron */}
                  <Shape x={chevronPos[0]} y={chevronPos[1]} rotation={dir * 90}
                    sceneFunc={(ctx, shape) => {
                      ctx.beginPath();
                      ctx.moveTo(-3, -4); ctx.lineTo(3, 0); ctx.lineTo(-3, 4);
                      ctx.strokeStyle = INK; ctx.lineWidth = 2; ctx.lineCap = "round"; ctx.lineJoin = "round";
                      ctx.globalAlpha = 0.2; ctx.stroke();
                      ctx.fillStrokeShape(shape);
                    }} />
                </>
              )}
            </Group>
          );
        }

        return (
          <Group key={cell.idx}>
            <Rect x={cx} y={cy} width={csW} height={csH} fill={cell.bgColor} />
            <Text x={cx} y={cy + csH * 0.28} width={csW} align="center"
              text="?" fontSize={Math.min(csW, csH) * 0.38} fontStyle="900"
              fill={INK} fontFamily={FONT_CN} opacity={0.06} />
            <Shape x={cx} y={cy} sceneFunc={(ctx, shape) => {
              ctx.save(); ctx.beginPath(); ctx.rect(0, 0, csW, csH); ctx.clip();
              ctx.strokeStyle = INK; ctx.lineWidth = 2; ctx.globalAlpha = 0.15;
              for (let d = -csH; d < csW + csH; d += 8) {
                ctx.beginPath(); ctx.moveTo(d, 0); ctx.lineTo(d - csH, csH); ctx.stroke();
              }
              ctx.globalAlpha = 1; ctx.restore(); ctx.fillStrokeShape(shape);
            }} />
          </Group>
        );
      })}

      {/* Center area (5x5) */}
      <Group x={centerX} y={centerY} clipX={0} clipY={0} clipWidth={centerW} clipHeight={centerH}>
        <Shape sceneFunc={(ctx, shape) => {
          ctx.save(); ctx.beginPath(); ctx.rect(0, 0, centerW, centerH); ctx.clip();
          for (let d = 0; d < centerW + centerH; d += 40) {
            ctx.fillStyle = "#fff";
            ctx.beginPath(); ctx.moveTo(d, 0); ctx.lineTo(d + 20, 0);
            ctx.lineTo(d + 20 - centerH, centerH); ctx.lineTo(d - centerH, centerH); ctx.closePath(); ctx.fill();
            ctx.fillStyle = "#f0f0f0";
            ctx.beginPath(); ctx.moveTo(d + 20, 0); ctx.lineTo(d + 40, 0);
            ctx.lineTo(d + 40 - centerH, centerH); ctx.lineTo(d + 20 - centerH, centerH); ctx.closePath(); ctx.fill();
          }
          ctx.restore(); ctx.fillStrokeShape(shape);
        }} />

        <Shape sceneFunc={(ctx, shape) => {
          const cxc = centerW / 2; const cyc = centerH / 2;
          const radius = Math.max(centerW, centerH);
          for (let i = 0; i < 12; i++) {
            const a1 = (i * 30 * Math.PI) / 180;
            const a2 = ((i * 30 + 15) * Math.PI) / 180;
            ctx.beginPath(); ctx.moveTo(cxc, cyc); ctx.arc(cxc, cyc, radius, a1, a2);
            ctx.closePath(); ctx.fillStyle = `${C.yellow}40`; ctx.fill();
          }
          ctx.fillStrokeShape(shape);
        }} />

        {mode === "center" && centerCovers.map((photo, i) => (
          <ScatteredPhotoCard key={i} src={photo.src} name={photo.name} slot={slots[i]}
            centerW={centerW} centerH={centerH} ink={INK} yellow={C.yellow}
            onDragEnd={(x, y) => updateSlot(i, x, y)} />
        ))}

        <Group x={centerW / 2} y={centerH / 2}>
          {/* Title banner */}
          <Group rotation={-6} y={-40}>
            <Rect x={-100 + 6} y={-32 + 6} width={200} height={64} fill={INK} />
            <Rect x={-100} y={-32} width={200} height={64} fill={C.pink} stroke={INK} strokeWidth={4} />
            <Text x={-100} y={-18} width={200} align="center" text="旅行棋盘"
              fontSize={42} fontStyle="900" fill="#fff" fontFamily={FONT_CN}
              stroke={INK} strokeWidth={2} letterSpacing={4} />
          </Group>

          {/* Stats pills */}
          <Group y={30}>
            <Group x={-75} rotation={3}>
              <Rect x={3} y={3} width={68} height={24} fill={INK} cornerRadius={12} />
              <Rect x={0} y={0} width={68} height={24} fill="#fff" stroke={INK} strokeWidth={3} cornerRadius={12} />
              <Text x={0} y={5} width={68} align="center" text={`${cityEntries.length} 座城市`}
                fontSize={12} fontStyle="700" fill={INK} fontFamily={FONT_CN} letterSpacing={1} />
            </Group>
            <Group x={5} rotation={-2}>
              <Rect x={3} y={3} width={68} height={24} fill={INK} cornerRadius={12} />
              <Rect x={0} y={0} width={68} height={24} fill={C.yellow} stroke={INK} strokeWidth={3} cornerRadius={12} />
              <Text x={0} y={5} width={68} align="center" text={`${totalVisits} 次足迹`}
                fontSize={12} fontStyle="700" fill={INK} fontFamily={FONT_CN} letterSpacing={1} />
            </Group>
          </Group>
        </Group>

        {/* Floating decorations */}
        <Group x={centerW - 72} y={16}>
          <Circle x={24 + 3} y={24 + 3} radius={24} fill={INK} />
          <Circle x={24} y={24} radius={24} fill={C.yellow} stroke={INK} strokeWidth={3} />
          <Circle x={18} y={20} radiusX={2.5} radiusY={3.5} radius={3} fill={INK} />
          <Circle x={30} y={20} radiusX={2.5} radiusY={3.5} radius={3} fill={INK} />
          <Shape sceneFunc={(ctx, shape) => {
            ctx.beginPath(); ctx.arc(24, 26, 8, 0.1 * Math.PI, 0.9 * Math.PI, false);
            ctx.strokeStyle = INK; ctx.lineWidth = 3; ctx.lineCap = "round"; ctx.stroke();
            ctx.fillStrokeShape(shape);
          }} />
        </Group>

        <Group x={16} y={16} rotation={-12}>
          <Rect x={3} y={3} width={72} height={44} fill={INK} />
          <Rect x={0} y={0} width={72} height={44} fill={C.orange} stroke={INK} strokeWidth={3} />
          <Circle x={14} y={14} radius={5} fill="#fff" stroke={INK} strokeWidth={2} />
          <Rect x={28} y={10} width={30} height={6} fill="#fff" stroke={INK} strokeWidth={2} />
          {[0, 1].map((i) => (
            <Group key={i} x={18 + i * 24} y={30}>
              <Circle x={0} y={0} radius={10} fill="#fff" stroke={INK} strokeWidth={3} />
              <Circle x={0} y={0} radius={2.5} fill={INK} />
            </Group>
          ))}
        </Group>

        <Group x={24} y={centerH - 56} rotation={15}>
          <Rect x={3} y={3} width={36} height={36} fill={INK} />
          <Rect x={0} y={0} width={36} height={36} fill="#fff" stroke={INK} strokeWidth={3} />
          {[[9, 9], [27, 9], [9, 27], [27, 27]].map(([dx, dy], i) => (
            <Circle key={i} x={dx} y={dy} radius={3.5} fill={INK} />
          ))}
        </Group>

        <Group x={centerW - 90} y={centerH - 40} rotation={-6}>
          <Rect x={3} y={3} width={76} height={22} fill={INK} />
          <Rect x={0} y={0} width={76} height={22} fill={C.blue} stroke={INK} strokeWidth={3} />
          <Text x={0} y={4} width={76} align="center" text="Good Time!"
            fontSize={13} fontStyle="900" fill="#fff" fontFamily={FONT_CN} stroke={INK} strokeWidth={1} />
        </Group>

        {/* 指南针 — 左侧中部 */}
        <Group x={10} y={centerH * 0.42} rotation={-8}>
          <Circle x={22 + 3} y={22 + 3} radius={22} fill={INK} />
          <Circle x={22} y={22} radius={22} fill="#fff" stroke={INK} strokeWidth={3} />
          <Shape sceneFunc={(ctx, shape) => {
            ctx.beginPath();
            ctx.moveTo(22, 3); ctx.lineTo(26, 22); ctx.lineTo(22, 18); ctx.lineTo(18, 22);
            ctx.closePath(); ctx.fillStyle = C.pink; ctx.fill();
            ctx.strokeStyle = INK; ctx.lineWidth = 1.5; ctx.lineJoin = "round"; ctx.stroke();
            ctx.beginPath();
            ctx.moveTo(22, 41); ctx.lineTo(26, 22); ctx.lineTo(22, 26); ctx.lineTo(18, 22);
            ctx.closePath(); ctx.fillStyle = "#ddd"; ctx.fill();
            ctx.strokeStyle = INK; ctx.lineWidth = 1.5; ctx.lineJoin = "round"; ctx.stroke();
            ctx.beginPath(); ctx.arc(22, 22, 2.5, 0, Math.PI * 2);
            ctx.fillStyle = INK; ctx.fill();
            ctx.fillStrokeShape(shape);
          }} />
          <Text x={16} y={3} text="N" fontSize={7} fontStyle="900" fill={INK} fontFamily={FONT_CN} />
        </Group>

        {/* 纸飞机 — 右侧中部 */}
        <Group x={centerW - 52} y={centerH * 0.43} rotation={22}>
          <Shape sceneFunc={(ctx, shape) => {
            ctx.save(); ctx.lineJoin = "round";
            ctx.beginPath();
            ctx.moveTo(3, 3 + 14); ctx.lineTo(3 + 40, 3); ctx.lineTo(3 + 36, 3 + 30); ctx.lineTo(3 + 14, 3 + 18);
            ctx.closePath(); ctx.fillStyle = INK; ctx.fill();
            ctx.beginPath();
            ctx.moveTo(0, 14); ctx.lineTo(40, 0); ctx.lineTo(36, 30); ctx.lineTo(14, 18);
            ctx.closePath(); ctx.fillStyle = C.mint; ctx.fill();
            ctx.strokeStyle = INK; ctx.lineWidth = 3; ctx.stroke();
            ctx.beginPath();
            ctx.moveTo(0, 14); ctx.lineTo(36, 10); ctx.lineTo(14, 18);
            ctx.strokeStyle = INK; ctx.lineWidth = 2; ctx.stroke();
            ctx.restore(); ctx.fillStrokeShape(shape);
          }} />
        </Group>

        {/* 命运卡 "?" — 下方偏左 */}
        <Group x={centerW * 0.2} y={centerH * 0.7} rotation={-15}>
          <Rect x={4} y={4} width={36} height={48} fill={INK} cornerRadius={4} />
          <Rect x={0} y={0} width={36} height={48} fill={C.blue} stroke={INK} strokeWidth={3} cornerRadius={4} />
          <Text x={0} y={6} width={36} align="center"
            text="?" fontSize={32} fontStyle="900" fill="#fff" fontFamily={FONT_CN}
            stroke={INK} strokeWidth={1.5} />
        </Group>

        {/* 金币 — 下方偏右 */}
        <Group x={centerW * 0.67} y={centerH * 0.69} rotation={8}>
          <Circle x={12 + 3} y={14 + 3} radius={14} fill={INK} />
          <Circle x={12} y={14} radius={14} fill={C.yellow} stroke={INK} strokeWidth={3} />
          <Text x={-2} y={6} width={28} align="center"
            text="$" fontSize={16} fontStyle="900" fill={INK} fontFamily={FONT_CN} />
          <Circle x={28 + 3} y={8 + 3} radius={11} fill={INK} />
          <Circle x={28} y={8} radius={11} fill={C.orange} stroke={INK} strokeWidth={3} />
          <Text x={17} y={2} width={22} align="center"
            text="★" fontSize={12} fontStyle="900" fill="#fff" fontFamily={FONT_CN} />
        </Group>

        {/* 地图标记 — 上方中央偏右 */}
        <Group x={centerW * 0.42} y={centerH * 0.13} rotation={12}>
          <Shape sceneFunc={(ctx, shape) => {
            ctx.save(); ctx.lineJoin = "round";
            ctx.beginPath();
            ctx.moveTo(14 + 3, 0 + 3);
            ctx.bezierCurveTo(22 + 3, 0 + 3, 28 + 3, 6 + 3, 28 + 3, 14 + 3);
            ctx.bezierCurveTo(28 + 3, 22 + 3, 14 + 3, 34 + 3, 14 + 3, 34 + 3);
            ctx.bezierCurveTo(14 + 3, 34 + 3, 0 + 3, 22 + 3, 0 + 3, 14 + 3);
            ctx.bezierCurveTo(0 + 3, 6 + 3, 6 + 3, 0 + 3, 14 + 3, 0 + 3);
            ctx.fillStyle = INK; ctx.fill();
            ctx.beginPath();
            ctx.moveTo(14, 0);
            ctx.bezierCurveTo(22, 0, 28, 6, 28, 14);
            ctx.bezierCurveTo(28, 22, 14, 34, 14, 34);
            ctx.bezierCurveTo(14, 34, 0, 22, 0, 14);
            ctx.bezierCurveTo(0, 6, 6, 0, 14, 0);
            ctx.fillStyle = C.pink; ctx.fill();
            ctx.strokeStyle = INK; ctx.lineWidth = 3; ctx.stroke();
            ctx.beginPath(); ctx.arc(14, 13, 6, 0, Math.PI * 2);
            ctx.fillStyle = "#fff"; ctx.fill();
            ctx.strokeStyle = INK; ctx.lineWidth = 2; ctx.stroke();
            ctx.restore(); ctx.fillStrokeShape(shape);
          }} />
        </Group>

        {/* 散落星星 × 3 */}
        {[
          { x: centerW * 0.13, y: centerH * 0.58, r: 8, rot: 15, c: C.yellow },
          { x: centerW * 0.82, y: centerH * 0.28, r: 7, rot: -20, c: C.orange },
          { x: centerW * 0.55, y: centerH * 0.82, r: 6, rot: 30, c: C.pink },
        ].map((st, i) => (
          <Shape key={`star-${i}`} x={st.x} y={st.y} rotation={st.rot}
            sceneFunc={(ctx, shape) => {
              const r = st.r; const ir = r * 0.35;
              const pts = Array.from({ length: 8 }, (_, j) => {
                const a = (j * Math.PI) / 4 - Math.PI / 2;
                return [Math.cos(a) * (j % 2 === 0 ? r : ir), Math.sin(a) * (j % 2 === 0 ? r : ir)] as const;
              });
              ctx.beginPath();
              pts.forEach(([px, py], j) => j === 0 ? ctx.moveTo(2 + r + px, 2 + r + py) : ctx.lineTo(2 + r + px, 2 + r + py));
              ctx.closePath(); ctx.fillStyle = INK; ctx.fill();
              ctx.beginPath();
              pts.forEach(([px, py], j) => j === 0 ? ctx.moveTo(r + px, r + py) : ctx.lineTo(r + px, r + py));
              ctx.closePath(); ctx.fillStyle = st.c; ctx.fill();
              ctx.strokeStyle = INK; ctx.lineWidth = 2; ctx.stroke();
              ctx.fillStrokeShape(shape);
            }} />
        ))}
      </Group>
    </KonvaPosterStage>
  );
}

export default PopBoardPoster;
