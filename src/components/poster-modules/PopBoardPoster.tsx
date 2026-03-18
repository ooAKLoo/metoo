import { useMemo, useRef, useState, useEffect, useCallback } from "react";
import type { PosterModuleProps } from "../../lib/poster-modules";

/* ── Dimensions ── */
const SIZE = 800;
const N = 7; // 7×7 grid → 24 edge cells
const GAP = 3;
const PAD = 4;

/* ── Pop-Art palette ── */
const C = {
  pink: "#FF5CB5",
  yellow: "#FFEB00",
  blue: "#3B6BFF",
  mint: "#00E5FF",
  orange: "#FF9800",
};

const CELL_PALETTE = [C.pink, C.yellow, "#fff", C.mint, C.orange, "#fff"];

/* ── Corner definitions ── */
const CORNER_IDX = [0, N - 1, 2 * (N - 1), 3 * (N - 1)] as const; // 0,6,12,18
const CORNER_META: Record<number, { label: string; emoji: string; color: string }> = {
  [CORNER_IDX[0]]: { label: "起点", emoji: "🏁", color: C.pink },
  [CORNER_IDX[1]]: { label: "休息", emoji: "☕", color: C.blue },
  [CORNER_IDX[2]]: { label: "发现", emoji: "🔍", color: C.yellow },
  [CORNER_IDX[3]]: { label: "传送", emoji: "🚀", color: C.mint },
};

/* ── Pattern cell indices (decorative breaks) ── */
const PATTERN_IDX = new Set([3, 15]);

/** Clockwise edge path: top → right → bottom(rev) → left(rev) = 24 cells */
function buildEdgePath(): Array<[number, number]> {
  const p: Array<[number, number]> = [];
  for (let c = 0; c < N; c++) p.push([0, c]);
  for (let r = 1; r < N; r++) p.push([r, N - 1]);
  for (let c = N - 2; c >= 0; c--) p.push([N - 1, c]);
  for (let r = N - 2; r >= 1; r--) p.push([r, 0]);
  return p;
}

const EDGE_PATH = buildEdgePath(); // static, never changes

/* ── Starburst conic-gradient (static, no animation for export) ── */
const STARBURST_BG = Array.from({ length: 12 }, (_, i) => {
  const a = i * 30;
  return `${C.yellow}40 ${a}deg ${a + 15}deg, transparent ${a + 15}deg ${a + 30}deg`;
}).join(", ");

/* ── Component ── */
function PopBoardPoster({ cityEntries }: PosterModuleProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);

  const measure = useCallback(() => {
    const el = ref.current;
    if (!el) return;
    const pad = 48;
    setScale(
      Math.min(
        (el.clientWidth - pad) / SIZE,
        (el.clientHeight - pad) / SIZE,
        1,
      ),
    );
  }, []);

  useEffect(() => {
    measure();
    const ro = new ResizeObserver(measure);
    if (ref.current) ro.observe(ref.current);
    return () => ro.disconnect();
  }, [measure]);

  const cities = useMemo(
    () => [...cityEntries].sort((a, b) => b.count - a.count),
    [cityEntries],
  );

  const totalVisits = useMemo(
    () => cityEntries.reduce((s, c) => s + c.count, 0),
    [cityEntries],
  );

  /* Assign cities to edge cells (skip corners & pattern cells for city data) */
  const cellMap = useMemo(() => {
    let ci = 0;
    return EDGE_PATH.map(([row, col], idx) => {
      const corner = CORNER_META[idx];
      const isPattern = PATTERN_IDX.has(idx);
      const city =
        !corner && !isPattern && ci < cities.length ? cities[ci++] : null;
      const bgColor = corner
        ? corner.color
        : isPattern
          ? "#fff"
          : CELL_PALETTE[idx % CELL_PALETTE.length];
      return { row, col, idx, corner, isPattern, city, bgColor };
    });
  }, [cities]);

  return (
    <div
      ref={ref}
      className="absolute inset-0 flex items-center justify-center overflow-hidden pointer-events-none"
    >
      <div style={{ transform: `scale(${scale})`, transformOrigin: "center" }}>
        <div
          data-poster-export
          style={{
            width: SIZE,
            height: SIZE,
            backgroundColor: "#000",
            padding: PAD,
            boxSizing: "border-box",
            fontFamily: '"ZCOOL KuaiLe", system-ui, -apple-system, sans-serif',
            position: "relative",
            overflow: "hidden",
          }}
        >
          <div
            style={{
              display: "grid",
              gridTemplateColumns: `repeat(${N}, 1fr)`,
              gridTemplateRows: `repeat(${N}, 1fr)`,
              gap: GAP,
              width: "100%",
              height: "100%",
            }}
          >
            {/* ── Edge cells ── */}
            {cellMap.map((cell) => (
              <div
                key={cell.idx}
                style={{
                  gridColumn: cell.col + 1,
                  gridRow: cell.row + 1,
                  backgroundColor: cell.bgColor,
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                  padding: cell.corner ? 6 : 4,
                  position: "relative",
                  overflow: "hidden",
                  ...(cell.isPattern
                    ? {
                        backgroundImage: `linear-gradient(45deg, ${C.pink} 25%, transparent 25%), linear-gradient(-45deg, ${C.pink} 25%, transparent 25%), linear-gradient(45deg, transparent 75%, ${C.pink} 75%), linear-gradient(-45deg, transparent 75%, ${C.pink} 75%)`,
                        backgroundSize: "16px 16px",
                        backgroundPosition: "0 0, 0 8px, 8px -8px, -8px 0",
                      }
                    : {}),
                }}
              >
                {cell.corner ? (
                  /* ── Corner cell ── */
                  <>
                    <div style={{ fontSize: 28, lineHeight: 1 }}>
                      {cell.corner.emoji}
                    </div>
                    <div
                      style={{
                        fontSize: 14,
                        fontWeight: 900,
                        color: "#fff",
                        textShadow:
                          "1px 1px 0 #000, -1px -1px 0 #000, 1px -1px 0 #000, -1px 1px 0 #000",
                        marginTop: 2,
                      }}
                    >
                      {cell.corner.label}
                    </div>
                  </>
                ) : cell.isPattern ? null : cell.city ? (
                  /* ── City cell ── */
                  <>
                    <div
                      style={{
                        fontSize: 15,
                        fontWeight: 900,
                        color: "#000",
                        lineHeight: 1.1,
                        textAlign: "center",
                        whiteSpace: "nowrap",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        maxWidth: "100%",
                      }}
                    >
                      {cell.city.name}
                    </div>
                    <div
                      style={{
                        fontSize: 11,
                        fontWeight: 700,
                        color: "#fff",
                        backgroundColor: "#000",
                        padding: "0 5px",
                        borderRadius: 2,
                        marginTop: 2,
                      }}
                    >
                      ×{cell.city.count}
                    </div>
                  </>
                ) : (
                  /* ── Empty cell with hatch pattern ── */
                  <div
                    style={{
                      width: "100%",
                      height: "100%",
                      opacity: 0.15,
                      background:
                        "repeating-linear-gradient(45deg, #000, #000 2px, transparent 2px, transparent 8px)",
                    }}
                  />
                )}
                {/* Decorative dot */}
                {!cell.corner && !cell.isPattern && cell.city && (
                  <div
                    style={{
                      position: "absolute",
                      top: 3,
                      left: 3,
                      width: 5,
                      height: 5,
                      borderRadius: "50%",
                      border: "1.5px solid #000",
                      backgroundColor: "#fff",
                      opacity: 0.5,
                    }}
                  />
                )}
              </div>
            ))}

            {/* ── Center area (5×5) ── */}
            <div
              style={{
                gridColumn: "2 / 7",
                gridRow: "2 / 7",
                position: "relative",
                overflow: "hidden",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                background:
                  "repeating-linear-gradient(45deg, #fff, #fff 20px, #f0f0f0 20px, #f0f0f0 40px)",
              }}
            >
              {/* Starburst */}
              <div
                style={{
                  position: "absolute",
                  top: "-50%",
                  left: "-50%",
                  width: "200%",
                  height: "200%",
                  background: `conic-gradient(${STARBURST_BG})`,
                }}
              />

              {/* Center content group */}
              <div
                style={{
                  position: "relative",
                  zIndex: 1,
                  textAlign: "center",
                }}
              >
                {/* Title banner */}
                <div
                  style={{
                    transform: "rotate(-6deg)",
                    backgroundColor: C.pink,
                    padding: "14px 32px",
                    border: "4px solid #000",
                    boxShadow: "6px 6px 0 0 #000",
                    marginBottom: 14,
                    display: "inline-block",
                  }}
                >
                  <div
                    style={{
                      fontSize: 42,
                      fontWeight: 900,
                      color: "#fff",
                      textShadow: "3px 3px 0 #000",
                      WebkitTextStroke: "2px #000",
                      letterSpacing: 4,
                    }}
                  >
                    旅行棋盘
                  </div>
                </div>

                {/* Stats pills */}
                <div
                  style={{
                    display: "flex",
                    gap: 10,
                    justifyContent: "center",
                  }}
                >
                  <div
                    style={{
                      backgroundColor: "#fff",
                      border: "3px solid #000",
                      boxShadow: "3px 3px 0 0 #000",
                      borderRadius: 999,
                      padding: "4px 14px",
                      transform: "rotate(3deg)",
                    }}
                  >
                    <span
                      style={{
                        fontSize: 14,
                        fontWeight: 700,
                        letterSpacing: 2,
                      }}
                    >
                      {cityEntries.length} 座城市
                    </span>
                  </div>
                  <div
                    style={{
                      backgroundColor: C.yellow,
                      border: "3px solid #000",
                      boxShadow: "3px 3px 0 0 #000",
                      borderRadius: 999,
                      padding: "4px 14px",
                      transform: "rotate(-2deg)",
                    }}
                  >
                    <span
                      style={{
                        fontSize: 14,
                        fontWeight: 700,
                        letterSpacing: 2,
                      }}
                    >
                      {totalVisits} 次足迹
                    </span>
                  </div>
                </div>
              </div>

              {/* ── Floating decorations ── */}

              {/* Smiley face */}
              <div
                style={{
                  position: "absolute",
                  top: 16,
                  right: 24,
                  width: 48,
                  height: 48,
                  borderRadius: "50%",
                  backgroundColor: C.yellow,
                  border: "3px solid #000",
                  boxShadow: "3px 3px 0 0 #000",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <div style={{ display: "flex", gap: 6, marginBottom: 2 }}>
                  <div
                    style={{
                      width: 5,
                      height: 7,
                      backgroundColor: "#000",
                      borderRadius: "50%",
                    }}
                  />
                  <div
                    style={{
                      width: 5,
                      height: 7,
                      backgroundColor: "#000",
                      borderRadius: "50%",
                    }}
                  />
                </div>
                <div
                  style={{
                    width: 16,
                    height: 8,
                    borderBottom: "3px solid #000",
                    borderRadius: "0 0 50% 50%",
                  }}
                />
              </div>

              {/* Radio */}
              <div
                style={{
                  position: "absolute",
                  top: 16,
                  left: 16,
                  backgroundColor: C.orange,
                  border: "3px solid #000",
                  boxShadow: "3px 3px 0 0 #000",
                  padding: 6,
                  transform: "rotate(-12deg)",
                  width: 72,
                }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    marginBottom: 4,
                  }}
                >
                  <div
                    style={{
                      width: 10,
                      height: 10,
                      borderRadius: "50%",
                      border: "2px solid #000",
                      backgroundColor: "#fff",
                    }}
                  />
                  <div
                    style={{
                      width: 30,
                      height: 6,
                      border: "2px solid #000",
                      backgroundColor: "#fff",
                      marginTop: 2,
                    }}
                  />
                </div>
                <div
                  style={{
                    display: "flex",
                    gap: 4,
                    justifyContent: "center",
                  }}
                >
                  {[0, 1].map((i) => (
                    <div
                      key={i}
                      style={{
                        width: 20,
                        height: 20,
                        borderRadius: "50%",
                        border: "3px solid #000",
                        backgroundColor: "#fff",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      <div
                        style={{
                          width: 5,
                          height: 5,
                          backgroundColor: "#000",
                          borderRadius: "50%",
                        }}
                      />
                    </div>
                  ))}
                </div>
              </div>

              {/* Dice */}
              <div
                style={{
                  position: "absolute",
                  bottom: 20,
                  left: 24,
                  width: 36,
                  height: 36,
                  backgroundColor: "#fff",
                  border: "3px solid #000",
                  boxShadow: "3px 3px 0 0 #000",
                  transform: "rotate(15deg)",
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gridTemplateRows: "1fr 1fr",
                  padding: 4,
                }}
              >
                {[0, 1, 2, 3].map((i) => (
                  <div
                    key={i}
                    style={{
                      width: 7,
                      height: 7,
                      backgroundColor: "#000",
                      borderRadius: "50%",
                      margin: "auto",
                    }}
                  />
                ))}
              </div>

              {/* "Good Time!" sticker */}
              <div
                style={{
                  position: "absolute",
                  bottom: 16,
                  right: 16,
                  backgroundColor: C.blue,
                  color: "#fff",
                  fontWeight: 900,
                  fontSize: 13,
                  padding: "3px 10px",
                  border: "3px solid #000",
                  boxShadow: "3px 3px 0 0 #000",
                  transform: "rotate(-6deg)",
                  textShadow: "1px 1px 0 #000",
                }}
              >
                Good Time!
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default PopBoardPoster;
