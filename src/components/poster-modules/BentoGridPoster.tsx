import { useMemo, useRef, useState, useEffect, useCallback } from "react";
import type { PosterModuleProps } from "../../lib/poster-modules";

/* ── 1:1 card ── */
const CARD_SIZE = 800;
const COLS = 4;
const ROWS = 4;
const GAP = 8;
const PADDING = 8;
const RADIUS = 12;

/* Dopamine Burst — S≥85%, L 58-72%, hue span ≥200°, zero neutral */
const PALETTE = [
  "#55a6f6", "#9049f3", "#f73b99",
  "#f3ad68", "#88f651", "#5cf5c2",
];

/* ── Seeded PRNG (mulberry32) ── */
function mulberry32(seed: number) {
  let s = seed | 0;
  return () => {
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/* ── Cell ── */
interface BentoCell {
  id: string;
  colStart: number;
  rowStart: number;
  colSpan: number;
  rowSpan: number;
  color: string;
  cityIndex: number;
}

/* ── Layout ── */
function generateLayout(cityCount: number, seed: number): BentoCell[] {
  const rand = mulberry32(seed * 2654435761 + 12345);
  const occupied: boolean[][] = Array.from({ length: ROWS }, () =>
    Array(COLS).fill(false),
  );
  const cells: BentoCell[] = [];
  let idx = 0;

  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      if (occupied[r][c]) continue;

      const maxCS = Math.min(COLS - c, 3);
      const maxRS = Math.min(ROWS - r, 3);
      let cs = 1, rs = 1;

      const isTop = idx < Math.max(2, Math.ceil(cityCount * 0.3));
      const roll = rand();

      if (isTop) {
        if (roll < 0.35 && maxCS >= 2 && maxRS >= 2) { cs = 2; rs = 2; }
        else if (roll < 0.6 && maxCS >= 2) { cs = 2; }
        else if (roll < 0.75 && maxRS >= 2) { rs = 2; }
      } else {
        if (roll < 0.15 && maxCS >= 2 && maxRS >= 2) { cs = 2; rs = 2; }
        else if (roll < 0.30 && maxCS >= 2) { cs = 2; }
        else if (roll < 0.42 && maxRS >= 2) { rs = 2; }
      }

      let ok = true;
      for (let dr = 0; dr < rs && ok; dr++)
        for (let dc = 0; dc < cs && ok; dc++)
          if (occupied[r + dr]?.[c + dc]) ok = false;
      if (!ok) { cs = 1; rs = 1; }

      for (let dr = 0; dr < rs; dr++)
        for (let dc = 0; dc < cs; dc++)
          occupied[r + dr][c + dc] = true;

      cells.push({
        id: `${r}-${c}`,
        colStart: c + 1,
        rowStart: r + 1,
        colSpan: cs,
        rowSpan: rs,
        color: PALETTE[idx % PALETTE.length],
        cityIndex: idx < cityCount ? idx : -1,
      });
      idx++;
    }
  }
  return cells;
}

/* ── Text contrast ── */
function fg(hex: string): string {
  const v = parseInt(hex.slice(1), 16);
  const lum = 0.299 * ((v >> 16) & 0xff) + 0.587 * ((v >> 8) & 0xff) + 0.114 * (v & 0xff);
  return lum > 160 ? "#1a1a1a" : "#ffffff";
}

/* ── Component ── */

function BentoGridPoster({ cityEntries }: PosterModuleProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);
  const [seed, setSeed] = useState(0);

  const measure = useCallback(() => {
    const el = ref.current;
    if (!el) return;
    const pad = 48;
    setScale(Math.min((el.clientWidth - pad) / CARD_SIZE, (el.clientHeight - pad) / CARD_SIZE, 1));
  }, []);

  useEffect(() => {
    measure();
    const ro = new ResizeObserver(measure);
    if (ref.current) ro.observe(ref.current);
    return () => ro.disconnect();
  }, [measure]);

  const cells = useMemo(() => generateLayout(cityEntries.length, seed), [cityEntries.length, seed]);

  const inner = CARD_SIZE - PADDING * 2;
  const unit = (inner - GAP * (COLS - 1)) / COLS;

  return (
    <div
      ref={ref}
      className="absolute inset-0 flex items-center justify-center overflow-hidden pointer-events-none"
    >
      <div style={{ transform: `scale(${scale})`, transformOrigin: "center" }}>
        <div
          data-poster-export
          style={{
            width: CARD_SIZE,
            height: CARD_SIZE,
            backgroundColor: "#f5f2ed",
            padding: PADDING,
            borderRadius: RADIUS + 4,
            overflow: "hidden",
            boxSizing: "border-box",
            fontFamily: 'system-ui, -apple-system, "Noto Sans SC", sans-serif',
          }}
        >
          <div
            style={{
              display: "grid",
              gridTemplateColumns: `repeat(${COLS}, ${unit}px)`,
              gridTemplateRows: `repeat(${ROWS}, ${unit}px)`,
              gap: GAP,
              width: "100%",
              height: "100%",
            }}
          >
            {cells.map((cell) => {
              const city = cell.cityIndex >= 0 && cell.cityIndex < cityEntries.length
                ? cityEntries[cell.cityIndex]
                : null;
              const area = cell.colSpan * cell.rowSpan;
              const isBig = area >= 4;
              const isMed = area >= 2;
              const color = fg(cell.color);

              return (
                <div
                  key={cell.id}
                  style={{
                    gridColumn: `${cell.colStart} / span ${cell.colSpan}`,
                    gridRow: `${cell.rowStart} / span ${cell.rowSpan}`,
                    borderRadius: RADIUS,
                    backgroundColor: cell.color,
                    position: "relative",
                    overflow: "hidden",
                  }}
                >
                  {city ? (
                    /* ── Cell with data ── */
                    <div
                      style={{
                        position: "absolute",
                        inset: 0,
                        display: "flex",
                        flexDirection: "column",
                        justifyContent: isBig ? "flex-end" : isMed ? "flex-end" : "center",
                        alignItems: isBig || isMed ? "flex-start" : "center",
                        padding: isBig ? 18 : isMed ? 12 : 8,
                      }}
                    >
                      {/* Big decorative initial behind */}
                      {isBig && (
                        <div
                          style={{
                            position: "absolute",
                            top: 8,
                            right: 12,
                            fontSize: 80,
                            fontWeight: 900,
                            lineHeight: 1,
                            color,
                            opacity: 0.12,
                            userSelect: "none",
                          }}
                        >
                          {city.name[0]}
                        </div>
                      )}

                      {/* Count number */}
                      {isBig && (
                        <div
                          style={{
                            fontSize: 48,
                            fontWeight: 900,
                            color,
                            lineHeight: 1,
                            marginBottom: 4,
                          }}
                        >
                          {city.count}
                        </div>
                      )}

                      {/* City name */}
                      <div
                        style={{
                          fontSize: isBig ? 20 : isMed ? 14 : 12,
                          fontWeight: 700,
                          color,
                          lineHeight: 1.2,
                          whiteSpace: "nowrap",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          maxWidth: "100%",
                        }}
                      >
                        {city.name}
                      </div>

                      {/* Count for medium/small */}
                      {!isBig && (
                        <div
                          style={{
                            fontSize: isMed ? 20 : 18,
                            fontWeight: 900,
                            color,
                            opacity: isMed ? 0.9 : 0.8,
                            lineHeight: 1,
                            marginTop: isMed ? 4 : 2,
                          }}
                        >
                          {city.count}
                        </div>
                      )}
                    </div>
                  ) : null}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Shuffle */}
      <button
        onClick={() => setSeed((s) => s + 1)}
        className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-white/90 backdrop-blur rounded-full px-3 py-1.5 shadow-sm text-xs font-medium text-neutral-600 hover:bg-white cursor-pointer transition-colors pointer-events-auto"
        style={{ zIndex: 10 }}
      >
        Shuffle
      </button>
    </div>
  );
}

export default BentoGridPoster;
