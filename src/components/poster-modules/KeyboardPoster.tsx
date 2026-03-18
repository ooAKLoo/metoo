import React, { useMemo, useRef, useState, useEffect, useCallback } from "react";
import type { PosterModuleProps } from "../../lib/poster-modules";

/* ── Poster size (landscape postcard) ── */
const W = 1100;
const H = 800;

/* ── Keyboard palette & layout (ported from PopArtKeyboard2, pop theme) ── */
const PALETTE = {
  surface: "#f3ead8",
  shadow: "#181818",
  caps: ["#f47ea5", "#f56c2d", "#2465e3", "#f4d03f"],
  bases: ["#e92f2f", "#f4d03f", "#2465e3"],
};

interface KeyDef { l: string; w: number; type?: "mod" | "accent" | "cmd" | "space" }

const KB_LAYOUT: KeyDef[][] = [
  [{ l: "esc", w: 4, type: "mod" },{ l: "1", w: 4 },{ l: "2", w: 4 },{ l: "3", w: 4 },{ l: "4", w: 4 },{ l: "5", w: 4 },{ l: "6", w: 4 },{ l: "7", w: 4 },{ l: "8", w: 4 },{ l: "9", w: 4 },{ l: "0", w: 4 },{ l: "-", w: 4 },{ l: "=", w: 4 },{ l: "delete", w: 8, type: "mod" }],
  [{ l: "tab", w: 6, type: "mod" },{ l: "Q", w: 4 },{ l: "W", w: 4 },{ l: "E", w: 4 },{ l: "R", w: 4 },{ l: "T", w: 4 },{ l: "Y", w: 4 },{ l: "U", w: 4 },{ l: "I", w: 4 },{ l: "O", w: 4 },{ l: "P", w: 4 },{ l: "[", w: 4 },{ l: "]", w: 4 },{ l: "\\", w: 6, type: "mod" }],
  [{ l: "caps", w: 7, type: "mod" },{ l: "A", w: 4 },{ l: "S", w: 4 },{ l: "D", w: 4 },{ l: "F", w: 4 },{ l: "G", w: 4 },{ l: "H", w: 4 },{ l: "J", w: 4 },{ l: "K", w: 4 },{ l: "L", w: 4 },{ l: ";", w: 4 },{ l: "'", w: 4 },{ l: "return", w: 9, type: "mod" }],
  [{ l: "shift", w: 9, type: "mod" },{ l: "Z", w: 4 },{ l: "X", w: 4 },{ l: "C", w: 4, type: "accent" },{ l: "V", w: 4, type: "accent" },{ l: "B", w: 4 },{ l: "N", w: 4 },{ l: "M", w: 4 },{ l: ",", w: 4 },{ l: ".", w: 4 },{ l: "/", w: 4 },{ l: "shift", w: 11, type: "mod" }],
  [{ l: "ctrl", w: 5, type: "mod" },{ l: "opt", w: 5, type: "mod" },{ l: "\u2318", w: 6, type: "cmd" },{ l: "", w: 23, type: "space" },{ l: "\u2318", w: 6, type: "cmd" },{ l: "opt", w: 5, type: "mod" },{ l: "fn", w: 5, type: "mod" },{ l: "ctrl", w: 5, type: "mod" }],
];

/* ── Seeded RNG ── */
function seededRng(seed: number) {
  let s = seed;
  return () => { s = (s * 16807) % 2147483647; return (s - 1) / 2147483646; };
}

/* ── Solid box-shadow stack for 3D extrusion ── */
function solidShadow(layers: { color: string; depth: number }[]) {
  const parts: string[] = [];
  let offset = 1;
  for (const { color, depth } of layers) {
    for (let i = 0; i < depth; i++) {
      parts.push(`${offset * -1}px ${offset}px 0 ${color}`);
      offset++;
    }
  }
  return parts.join(", ");
}

/* ── Single key (static, no interaction) ── */
const KeyCap: React.FC<{
  data: KeyDef;
  capColor: string;
  baseColor: string;
  keyH: number;
  capInset: number;
  capShadow: number;
  baseExt: number;
  groundShadow: number;
}> = React.memo(({ data, capColor, baseColor, keyH, capInset, capShadow, baseExt, groundShadow }) => {
  const isLetter = data.w === 4 && data.l.length === 1 && !data.type;
  const isAccent = data.type === "accent";
  const bigChar = isLetter || isAccent;

  return (
    <div style={{ position: "relative", gridColumn: `span ${data.w}`, height: keyH }}>
      <div
        style={{
          position: "absolute",
          inset: 0,
          backgroundColor: PALETTE.surface,
          boxShadow: solidShadow([
            { color: baseColor, depth: baseExt },
            { color: PALETTE.shadow, depth: groundShadow },
          ]),
        }}
      >
        <div
          style={{
            position: "absolute",
            top: capInset,
            right: capInset,
            bottom: capInset + capShadow,
            left: capInset + capShadow,
            backgroundColor: capColor,
            boxShadow: solidShadow([{ color: PALETTE.shadow, depth: capShadow }]),
            color: PALETTE.shadow,
            display: "flex",
            alignItems: bigChar ? "center" : "flex-end",
            justifyContent: bigChar ? "center" : "flex-start",
            padding: bigChar ? 0 : "3px 0 3px 5px",
          }}
        >
          <span
            style={{
              fontWeight: 700,
              letterSpacing: "0.05em",
              fontSize: bigChar ? 22 : 8,
              textTransform: bigChar ? "uppercase" : "lowercase",
              fontFamily: "ui-sans-serif, system-ui, sans-serif",
            }}
          >
            {data.l}
          </span>
        </div>
      </div>
    </div>
  );
});
KeyCap.displayName = "KeyCap";

/* ── Main Poster Component ── */

function KeyboardPoster({ items, cityEntries }: PosterModuleProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [fitScale, setFitScale] = useState(1);

  const measure = useCallback(() => {
    const el = containerRef.current;
    if (!el) return;
    const pad = 48;
    setFitScale(Math.min((el.clientWidth - pad) / W, (el.clientHeight - pad) / H, 1));
  }, []);

  useEffect(() => {
    measure();
    const ro = new ResizeObserver(measure);
    if (containerRef.current) ro.observe(containerRef.current);
    return () => ro.disconnect();
  }, [measure]);

  /* Stats */
  const cityCount = cityEntries.length;
  const totalItems = items.length;
  const topCity = cityEntries[0]?.name ?? "";
  const topCities = cityEntries.slice(0, 4).map((c) => c.name);

  /* Keyboard colors — seeded by data */
  const keyColors = useMemo(() => {
    const rng = seededRng(cityCount * 31 + totalItems + 42);
    return KB_LAYOUT.map((row) =>
      row.map(() => ({
        cap: PALETTE.caps[Math.floor(rng() * PALETTE.caps.length)],
        base: PALETTE.bases[Math.floor(rng() * PALETTE.bases.length)],
      })),
    );
  }, [cityCount, totalItems]);

  return (
    <div
      ref={containerRef}
      className="absolute inset-0 flex items-center justify-center overflow-hidden pointer-events-none"
    >
      <div style={{ transform: `scale(${fitScale})`, transformOrigin: "center" }}>
        <div
          data-poster-export
          style={{
            width: W,
            height: H,
            backgroundColor: "#FAFAF8",
            borderRadius: 24,
            overflow: "hidden",
            position: "relative",
            fontFamily: '"Noto Sans SC","PingFang SC",system-ui,sans-serif',
          }}
        >
          {/* ── Top: typography area ── */}
          <div
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              right: 0,
              height: "52%",
              display: "flex",
              flexDirection: "column",
              justifyContent: "flex-end",
              padding: "48px 64px 24px",
              zIndex: 2,
            }}
          >
            {/* Subtitle */}
            <div
              style={{
                fontSize: 13,
                fontWeight: 600,
                color: "#999",
                letterSpacing: "0.15em",
                textTransform: "uppercase",
                marginBottom: 12,
                fontFamily: "ui-sans-serif, system-ui, sans-serif",
              }}
            >
              {cityCount} cities · {totalItems} saved
            </div>

            {/* Main title */}
            <h1
              style={{
                fontSize: topCity.length > 3 ? 64 : 80,
                fontWeight: 800,
                color: "#1a1a1a",
                lineHeight: 1.1,
                letterSpacing: "-0.02em",
                margin: 0,
              }}
            >
              {topCity || "旅行足迹"}
            </h1>

            {/* City tags */}
            {topCities.length > 1 && (
              <div style={{ display: "flex", gap: 10, marginTop: 16, flexWrap: "wrap" }}>
                {topCities.slice(1).map((name) => (
                  <span
                    key={name}
                    style={{
                      fontSize: 12,
                      fontWeight: 600,
                      color: "#555",
                      padding: "4px 12px",
                      backgroundColor: "#F0EFEC",
                      borderRadius: 20,
                      letterSpacing: "0.05em",
                    }}
                  >
                    {name}
                  </span>
                ))}
              </div>
            )}

            {/* Decorative line */}
            <div
              style={{
                width: 48,
                height: 3,
                backgroundColor: PALETTE.caps[1],
                borderRadius: 2,
                marginTop: 20,
              }}
            />
          </div>

          {/* ── Bottom: keyboard with perspective ── */}
          <div
            style={{
              position: "absolute",
              bottom: -30,
              left: "50%",
              transform: "translateX(-50%)",
              perspective: 1200,
              zIndex: 1,
            }}
          >
            <div
              style={{
                transform: "rotateX(42deg) scale(0.72)",
                transformOrigin: "center bottom",
              }}
            >
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(60, minmax(0, 1fr))",
                  gap: 8,
                  width: 920,
                  padding: 20,
                  backgroundColor: "rgba(255,255,255,0.6)",
                  borderRadius: 12,
                }}
              >
                {KB_LAYOUT.map((row, ri) =>
                  row.map((keyData, ki) => (
                    <KeyCap
                      key={`${ri}-${ki}`}
                      data={keyData}
                      capColor={keyColors[ri][ki].cap}
                      baseColor={keyColors[ri][ki].base}
                      keyH={48}
                      capInset={3}
                      capShadow={4}
                      baseExt={8}
                      groundShadow={6}
                    />
                  )),
                )}
              </div>
            </div>
          </div>

          {/* ── Brand mark — subtle bottom-left ── */}
          <div
            style={{
              position: "absolute",
              bottom: 16,
              left: 64,
              fontSize: 10,
              fontWeight: 600,
              color: "#ccc",
              letterSpacing: "0.2em",
              zIndex: 3,
            }}
          >
            METOO
          </div>
        </div>
      </div>
    </div>
  );
}

export default KeyboardPoster;
