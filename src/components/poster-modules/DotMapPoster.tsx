import { useMemo, useRef, useState, useEffect, useCallback } from "react";
import type { PosterModuleProps } from "../../lib/poster-modules";
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

function DotMapPoster({ items, cityEntries, posterWidth: POSTER_W, posterHeight: POSTER_H }: PosterModuleProps) {
  /* ── Scale-to-fit container ── */
  const containerRef = useRef<HTMLDivElement>(null);
  const [fitScale, setFitScale] = useState(1);

  const measure = useCallback(() => {
    const el = containerRef.current;
    if (!el) return;
    const pad = 48;
    const sx = (el.clientWidth - pad) / POSTER_W;
    const sy = (el.clientHeight - pad) / POSTER_H;
    setFitScale(Math.min(sx, sy, 1));
  }, [POSTER_W, POSTER_H]);

  useEffect(() => {
    measure();
    const ro = new ResizeObserver(measure);
    if (containerRef.current) ro.observe(containerRef.current);
    return () => ro.disconnect();
  }, [measure]);

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
          const noise = (rand(seed, row * COLS + col + ci * 100) - 0.5) * FUZZINESS;
          if (dist + noise < c.r) {
            color = c.color;
            break;
          }
        }

        if (color === BASE_COLOR && rand(seed, row * COLS + col + 999) > 0.85) {
          color = LIGHT_COLOR;
          isLight = true;
        }

        out.push({ x: col * SPACING, y: row * SPACING, r: isLight ? DOT_R * 0.6 : DOT_R, color });
      }
    }
    return out;
  }, [topCities]);

  const svgW = (COLS - 1) * SPACING;
  const svgH = (ROWS - 1) * SPACING;
  const totalItems = items.length;
  const totalCities = cityEntries.length;

  const covers = useMemo(
    () => cityEntries.flatMap((c) => c.covers).filter(Boolean).slice(0, 3).map(coverSrc),
    [cityEntries],
  );

  return (
    <div
      ref={containerRef}
      className="absolute inset-0 flex items-center justify-center overflow-hidden pointer-events-none"
      style={{ fontFamily: '"Noto Sans SC", "PingFang SC", sans-serif' }}
    >
      <div style={{ transform: `scale(${fitScale})`, transformOrigin: "center" }}>
        <div
          data-poster-export
          className="relative flex flex-col"
          style={{
            width: POSTER_W,
            minHeight: POSTER_H,
            backgroundColor: "#fcfcfc",
            boxShadow: "0 25px 50px -12px rgba(0,0,0,0.15)",
          }}
        >
          {/* ── Header ── */}
          <div className="px-12 pt-12 flex justify-between items-start">
            <div className="flex gap-4">
              <div className="flex flex-col">
                <span className="text-sm font-medium tracking-widest text-neutral-800 mb-1">
                  足迹 / FOOTPRINT
                </span>
                <span className="text-4xl font-normal tracking-tight text-neutral-900 leading-none">
                  {totalCities}
                </span>
                <span className="text-[10px] text-neutral-400 mt-2">
                  {totalItems} 个收藏 · {totalCities} 座城市
                </span>
              </div>

              {covers.length > 0 && (
                <div className="flex gap-1 ml-4 border-r-2 border-red-500 pr-4">
                  {covers.map((src, i) => (
                    <div
                      key={i}
                      className="w-12 h-10 bg-neutral-300 grayscale"
                      style={{
                        backgroundImage: `url("${src}")`,
                        backgroundSize: "cover",
                        backgroundPosition: "center",
                      }}
                    />
                  ))}
                </div>
              )}
            </div>

            <div className="w-1/3 text-[8px] text-neutral-400 leading-tight text-right uppercase">
              Mapping your journey across cities and places.
              Each dot represents a moment captured in your collection.
            </div>
          </div>

          {/* ── Dot Grid ── */}
          <div className="flex-1 flex flex-col items-center justify-center p-12">
            <div className="relative">
              <svg width={svgW + 40} height={svgH + 40}>
                <g transform="translate(20,20)">
                  {dots.map((d, i) => (
                    <circle key={i} cx={d.x} cy={d.y} r={d.r} fill={d.color} />
                  ))}
                  {/* Crosshairs */}
                  {(
                    [
                      [0, 0],
                      [svgW, 0],
                      [0, svgH],
                      [svgW, svgH],
                    ] as [number, number][]
                  ).map(([cx, cy], i) => (
                    <g key={i} transform={`translate(${cx},${cy})`}>
                      <path d="M-6 0L6 0M0-6L0 6" stroke="black" strokeWidth="1.5" />
                    </g>
                  ))}
                </g>
              </svg>
              <div className="text-center text-[8px] text-neutral-400 mt-4 uppercase tracking-widest">
                Travel footprint distribution · dot matrix visualization
              </div>
            </div>
          </div>

          {/* ── Legend ── */}
          {topCities.length > 0 && (
            <div className="absolute right-12 bottom-32 flex flex-col items-end gap-3 text-[10px] tracking-widest text-neutral-600 font-medium uppercase">
              {topCities.map((c) => (
                <div key={c.name} className="flex items-center gap-4">
                  <span>{c.name}</span>
                  <div className="w-6 h-[2px]" style={{ backgroundColor: c.color }} />
                </div>
              ))}
              {totalCities > 6 && (
                <div className="flex items-center gap-4">
                  <span>其他 {totalCities - 6} 城</span>
                  <div className="w-6 h-[2px] bg-neutral-400" />
                </div>
              )}
            </div>
          )}

          {/* ── Footer ── */}
          <div className="mt-auto w-full">
            <div className="border-t-[1.5px] border-neutral-300 px-12 py-6 flex justify-between items-center">
              <div className="flex gap-4 items-center">
                <div className="flex flex-col text-neutral-900 font-bold tracking-tighter text-2xl leading-none">
                  <span>觅途</span>
                  <div className="flex items-center gap-1 mt-1">
                    <span className="text-neutral-400 text-sm font-medium tracking-wide">METOO</span>
                  </div>
                </div>
                <div className="w-[1px] h-10 bg-neutral-400 mx-2" />
                <div className="w-7 h-7 bg-neutral-800 p-[2px]">
                  <div className="w-full h-full bg-white grid grid-cols-3 grid-rows-3 gap-[1px]">
                    <div className="bg-neutral-800" />
                    <div className="bg-white" />
                    <div className="bg-neutral-800" />
                    <div className="bg-white" />
                    <div className="bg-neutral-800" />
                    <div className="bg-white" />
                    <div className="bg-neutral-800" />
                    <div className="bg-neutral-800" />
                    <div className="bg-white" />
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap justify-end gap-x-3 gap-y-1.5 text-[9px] uppercase tracking-wider text-neutral-600 font-semibold">
                {(
                  [
                    ["足迹", "bg-red-500"],
                    ["收藏", "bg-blue-400"],
                    ["城市", "bg-yellow-400"],
                    ["旅行", "bg-purple-400"],
                    ["发现", "bg-neutral-400"],
                  ] as const
                ).map(([text, dot]) => (
                  <span key={text} className="flex items-center gap-1.5">
                    <span className={`w-1.5 h-1.5 rounded-full ${dot}`} />
                    {text}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default DotMapPoster;
