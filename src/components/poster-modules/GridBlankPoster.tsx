import { useMemo, useRef, useState, useEffect, useCallback } from "react";
import type { PosterModuleProps } from "../../lib/poster-modules";
import { coverSrc } from "../map-shared";
import { mulberry32, DOODLE_ENTRIES } from "../poster-generators/DoodleGallery";
import { PixelSpriteSVG, SPRITE_NAMES } from "../poster-generators/PixelSprites";
import { ElevationPersonSVG } from "../poster-generators/ElevationPeople";
import { CharacterSVG, POSE_CATEGORIES, BODY_TYPES } from "../poster-generators/CharacterGenerator";

const W = 1100;
const H = 800;
const CELL = 54;
const GAP = 6;
const COLS = 15;
const ROWS = 10;
const SW = 1.2;
const STROKE = "#333";
const TOTAL = COLS * ROWS;

/* ── Cell content types ── */
type IconType = "doodle" | "pixel" | "elevation" | "character";
const ICON_TYPES: IconType[] = ["doodle", "pixel", "elevation", "character"];

interface DoodleCell { kind: "doodle"; iconType: IconType; seed: number }
interface CoverCell { kind: "cover"; src: string }
interface StatCell  { kind: "stat"; label: string; value: string; accent?: boolean }
interface EmptyCell { kind: "empty" }
type FilledCell = DoodleCell | CoverCell | StatCell | EmptyCell;

/* ── Doodle icon renderer ── */
function CellIcon({ type, seed, size }: { type: IconType; seed: number; size: number }) {
  const rng = mulberry32(seed);
  const color = STROKE;

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
  // doodle
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

/* ── Main Component ── */

function GridBlankPoster({ items, cityEntries }: PosterModuleProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [s, setS] = useState(1);

  const measure = useCallback(() => {
    const el = ref.current;
    if (!el) return;
    const p = 48;
    setS(Math.min((el.clientWidth - p) / W, (el.clientHeight - p) / H, 1));
  }, []);

  useEffect(() => {
    measure();
    const ro = new ResizeObserver(measure);
    if (ref.current) ro.observe(ref.current);
    return () => ro.disconnect();
  }, [measure]);

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
        if (out.length >= 10) break;
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
    const indices = Array.from({ length: TOTAL }, (_, i) => i);
    for (let i = indices.length - 1; i > 0; i--) {
      const j = Math.floor(rng() * (i + 1));
      [indices[i], indices[j]] = [indices[j], indices[i]];
    }
    let cursor = 0;

    // Helper: take next N shuffled indices
    const take = (n: number) => {
      const out = indices.slice(cursor, cursor + n);
      cursor += n;
      return out;
    };

    // 1) Stat cells — key data points
    const statItems: { label: string; value: string; accent?: boolean }[] = [
      { label: "城市", value: `${stats.cityCount}`, accent: true },
      { label: "收藏", value: `${stats.totalItems}` },
    ];
    if (stats.topCity) {
      statItems.push({ label: "最多", value: stats.topCity.name, accent: true });
      statItems.push({ label: "", value: `${stats.topCity.count} 篇` });
    }
    // Brand label
    statItems.push({ label: "", value: "METOO" });

    const statSlots = take(statItems.length);
    statItems.forEach((item, i) => {
      map.set(statSlots[i], { kind: "stat", ...item });
    });

    // 2) Cover cells — showcase city photos
    const coverCount = Math.min(covers.length, 8);
    const coverSlots = take(coverCount);
    coverSlots.forEach((idx, i) => {
      map.set(idx, { kind: "cover", src: covers[i] });
    });

    // 3) Doodle cells — 3/4 of remaining, 1/4 stays empty for breathing
    const remaining = TOTAL - cursor;
    const doodleCount = Math.round(remaining * 0.75);
    const doodleSlots = take(doodleCount);
    doodleSlots.forEach((idx) => {
      const iconType = ICON_TYPES[Math.floor(rng() * ICON_TYPES.length)];
      const seed = Math.floor(rng() * 1000000);
      map.set(idx, { kind: "doodle", iconType, seed });
    });

    // 4) Remaining cells stay empty — breathing room (~60%+)

    return map;
  }, [dataSeed, stats, covers]);

  const gridW = COLS * CELL + (COLS - 1) * GAP;
  const gridH = ROWS * CELL + (ROWS - 1) * GAP;
  const ox = (W - gridW) / 2;
  const oy = (H - gridH) / 2;

  return (
    <div
      ref={ref}
      className="absolute inset-0 flex items-center justify-center overflow-hidden pointer-events-none"
    >
      <div style={{ transform: `scale(${s})`, transformOrigin: "center" }}>
        <div
          data-poster-export
          style={{
            width: W,
            height: H,
            backgroundColor: "#FFFFFF",
            borderRadius: 24,
            boxShadow:
              "0 4px 24px rgba(0,0,0,0.08), 0 1px 4px rgba(0,0,0,0.04)",
            overflow: "hidden",
            position: "relative",
          }}
        >
          {/* Grid lines */}
          <svg
            width="100%"
            height="100%"
            viewBox={`0 0 ${W} ${H}`}
            style={{ position: "absolute", inset: 0 }}
          >
            {Array.from({ length: ROWS }, (_, row) =>
              Array.from({ length: COLS }, (_, col) => (
                <rect
                  key={`${row}-${col}`}
                  x={ox + col * (CELL + GAP)}
                  y={oy + row * (CELL + GAP)}
                  width={CELL}
                  height={CELL}
                  fill="none"
                  stroke={STROKE}
                  strokeWidth={SW}
                />
              )),
            )}
          </svg>

          {/* Filled cells */}
          {Array.from(cellMap.entries()).map(([idx, cell]) => {
            if (cell.kind === "empty") return null;
            const row = Math.floor(idx / COLS);
            const col = idx % COLS;
            const cx = ox + col * (CELL + GAP);
            const cy = oy + row * (CELL + GAP);

            const base: React.CSSProperties = {
              position: "absolute",
              left: cx,
              top: cy,
              width: CELL,
              height: CELL,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              overflow: "hidden",
            };

            if (cell.kind === "cover") {
              return (
                <div key={idx} style={base}>
                  <div
                    style={{
                      position: "absolute",
                      inset: 0,
                      backgroundImage: `url(${cell.src})`,
                      backgroundSize: "cover",
                      backgroundPosition: "center",
                    }}
                  />
                </div>
              );
            }

            if (cell.kind === "stat") {
              return (
                <div
                  key={idx}
                  style={{
                    ...base,
                    flexDirection: "column",
                    gap: 1,
                    backgroundColor: cell.accent ? STROKE : "transparent",
                  }}
                >
                  {cell.label && (
                    <span
                      style={{
                        fontSize: 8,
                        fontWeight: 600,
                        letterSpacing: "0.06em",
                        color: cell.accent ? "#fff" : "#999",
                        lineHeight: 1,
                        fontFamily: '"Noto Sans SC","PingFang SC",system-ui,sans-serif',
                      }}
                    >
                      {cell.label}
                    </span>
                  )}
                  <span
                    style={{
                      fontSize: cell.value.length <= 3 ? 18 : 11,
                      fontWeight: 800,
                      color: cell.accent ? "#fff" : STROKE,
                      lineHeight: 1.1,
                      letterSpacing: "-0.02em",
                      fontFamily: '"Noto Sans SC","PingFang SC",system-ui,sans-serif',
                    }}
                  >
                    {cell.value}
                  </span>
                </div>
              );
            }

            // doodle
            return (
              <div key={idx} style={base}>
                <CellIcon
                  type={cell.iconType}
                  seed={cell.seed}
                  size={CELL * 0.7}
                />
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export default GridBlankPoster;
