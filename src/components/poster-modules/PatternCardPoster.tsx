import { useMemo, useRef, useState, useEffect, useCallback } from "react";
import type { PosterModuleProps } from "../../lib/poster-modules";
import { coverSrc } from "../map-shared";

/* ── Color palette ── */
const CITY_COLORS = [
  "#4361EE", "#E63946", "#2A9D8F", "#E9C46A", "#6A0572", "#264653",
  "#F765A3", "#FFB703", "#06D6A0", "#118AB2", "#EF476F", "#0B1354",
];

const generateSolidShadow = (depth: number, color: string) => {
  if (depth === 0) return "none";
  return Array.from({ length: depth }, (_, i) => `${i + 1}px ${i + 1}px 0 ${color}`).join(", ");
};

export type PatternStyle = "flat" | "brutalism";

/* ── City cell data ── */
interface CityCell {
  name: string;
  count: number;
  cover: string; // already through coverSrc()
  color: string;
}

/* ── Main Component ── */

export function PatternCardPoster({
  items,
  cityEntries,
  posterWidth: POSTER_W,
  posterHeight: POSTER_H,
  cardStyle,
}: PosterModuleProps & { cardStyle: PatternStyle }) {
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

  const totalCities = cityEntries.length;
  const totalItems = items.length;
  const topCity = cityEntries[0];

  /* ── Grid layout from city count ── */
  const cols = Math.min(4, Math.max(2, Math.ceil(Math.sqrt(totalCities || 4))));
  const rows = Math.min(5, Math.max(2, Math.ceil((totalCities || 4) / cols)));
  const cellCount = cols * rows;

  /* ── Build city cells: one city per cell, with cover + color ── */
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

  /* ── Accent dots at intersections ── */
  const accentColor = CITY_COLORS[1];
  const primaryColor = CITY_COLORS[0];

  const isBrutal = cardStyle === "brutalism";
  const borderWidth = 4;
  const brRadius = 16;

  const title = topCity ? `${topCity.name} · ${totalCities}城` : "觅途 · 旅行";

  const solidShadow = useMemo(() => generateSolidShadow(12, "#000"), []);
  const puffyHighlight = `inset 2px 4px 6px rgba(255,255,255,0.4), ${solidShadow}`;

  /* ── Cell size for HTML grid — fit both W and H ── */
  const GRID_GAP = isBrutal ? 16 : 12;
  const GRID_PAD = 32;
  const HEADER_H = 72;
  const FOOTER_H = 120;
  const LABEL_H = 28;
  const availW = POSTER_W - GRID_PAD * 2;
  const availH = POSTER_H - HEADER_H - FOOTER_H - GRID_PAD * 2;
  const maxByW = (availW - (cols - 1) * GRID_GAP) / cols;
  const maxByH = (availH - (rows - 1) * GRID_GAP - rows * LABEL_H) / rows;
  const cellW = Math.min(maxByW, maxByH);

  return (
    <div
      ref={containerRef}
      className="absolute inset-0 flex items-center justify-center overflow-hidden pointer-events-none"
      style={{}}
    >
      <div style={{ transform: `scale(${fitScale})`, transformOrigin: "center" }}>
        <div
          data-poster-export
          className="relative flex flex-col"
          style={{
            width: POSTER_W,
            height: POSTER_H,
            backgroundColor: "#FDFDFD",
            fontFamily: 'system-ui, -apple-system, "Noto Sans SC", sans-serif',
            ...(isBrutal
              ? { border: `${borderWidth}px solid #000`, borderRadius: brRadius, boxShadow: puffyHighlight }
              : { borderRadius: 2, boxShadow: "0 25px 50px -12px rgba(0,0,0,0.25), 0 8px 20px -8px rgba(0,0,0,0.1)" }),
            overflow: "hidden",
          }}
        >
          {/* ── Header ── */}
          {isBrutal ? (
            <div style={{ display: "flex", borderBottom: `${borderWidth}px solid #000`, height: 72 }}>
              <div style={{ flex: 1, display: "flex", alignItems: "center", paddingLeft: 28 }}>
                <span style={{ fontSize: 28, fontWeight: 900, color: "#000" }}>{title}</span>
              </div>
              <div
                style={{
                  width: 72,
                  borderLeft: `${borderWidth}px solid #000`,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                  backgroundColor: accentColor,
                }}
              >
                <div
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: brRadius / 2,
                    backgroundColor: primaryColor,
                    border: "3px solid #000",
                    boxShadow: generateSolidShadow(4, "#000"),
                  }}
                />
              </div>
            </div>
          ) : (
            <div style={{ padding: "20px 32px 0" }}>
              <div style={{ border: "1.5px solid #1a1a1a" }}>
                <div style={{ display: "flex", borderBottom: "1.5px solid #1a1a1a", height: 60 }}>
                  <div style={{ flex: 1, display: "flex", alignItems: "center", paddingLeft: 20 }}>
                    <span style={{ fontFamily: "monospace", fontSize: 22, fontWeight: 500, letterSpacing: "-0.02em", color: "#1a1a1a" }}>
                      {title}
                    </span>
                  </div>
                  <div style={{ width: 60, borderLeft: "1.5px solid #1a1a1a", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                    <div style={{ width: 24, height: 24, borderRadius: "50%", backgroundColor: primaryColor }} />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ── City Grid ── */}
          <div
            style={{
              flex: 1,
              minHeight: 0,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              padding: GRID_PAD,
              overflow: "hidden",
            }}
          >
            <div
              style={{
                display: "grid",
                gridTemplateColumns: `repeat(${cols}, ${cellW}px)`,
                gap: GRID_GAP,
              }}
            >
              {cells.map((cell, i) => (
                <div key={i} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8 }}>
                  {/* Circle: cover image or color fallback */}
                  <div
                    style={{
                      width: cellW,
                      height: cellW,
                      borderRadius: "50%",
                      overflow: "hidden",
                      position: "relative",
                      backgroundColor: cell.color,
                      ...(isBrutal
                        ? { border: `${borderWidth}px solid #000`, boxShadow: `3px 3px 0 #000` }
                        : {}),
                    }}
                  >
                    {cell.cover ? (
                      <div
                        style={{
                          position: "absolute",
                          inset: 0,
                          backgroundImage: `url(${cell.cover})`,
                          backgroundSize: "cover",
                          backgroundPosition: "center",
                        }}
                      />
                    ) : cell.name ? (
                      /* No cover — show first character */
                      <div
                        style={{
                          position: "absolute",
                          inset: 0,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          color: "#fff",
                          fontSize: cellW * 0.35,
                          fontWeight: 700,
                          textShadow: "0 1px 3px rgba(0,0,0,0.3)",
                        }}
                      >
                        {cell.name[0]}
                      </div>
                    ) : null}
                    {/* Star overlay */}
                    <svg
                      viewBox="0 0 100 100"
                      style={{ position: "absolute", inset: 0, width: "100%", height: "100%", pointerEvents: "none" }}
                    >
                      <path
                        d="M 50 10 Q 50 50 90 50 Q 50 50 50 90 Q 50 50 10 50 Q 50 50 50 10 Z"
                        fill={cell.cover ? "rgba(255,255,255,0.15)" : "rgba(0,0,0,0.1)"}
                      />
                    </svg>
                  </div>

                  {/* City name + count */}
                  {cell.name ? (
                    <div style={{ textAlign: "center", lineHeight: 1.2 }}>
                      <div
                        style={{
                          fontSize: 13,
                          fontWeight: isBrutal ? 800 : 500,
                          color: isBrutal ? "#000" : "#1a1a1a",
                          letterSpacing: "0.02em",
                          whiteSpace: "nowrap",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          maxWidth: cellW,
                        }}
                      >
                        {cell.name}
                      </div>
                      <div style={{ fontSize: 10, color: "#a3a3a3", marginTop: 2 }}>
                        {cell.count} 收藏
                      </div>
                    </div>
                  ) : (
                    <div style={{ height: 28 }} />
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* ── Intersection dots (decorative, between cells) ── */}
          {/* Rendered via absolute positioned dots between grid cells */}

          {/* ── Stats section ── */}
          <div style={{ padding: "0 32px 12px" }}>
            {/* Top cities ranked list */}
            <div
              style={{
                display: "flex",
                flexWrap: "wrap",
                gap: "6px 16px",
                marginBottom: 12,
                paddingBottom: 12,
                borderBottom: isBrutal ? "3px solid #000" : "1px solid #e5e5e5",
              }}
            >
              {cityEntries.slice(0, 8).map((city, i) => (
                <span
                  key={city.name}
                  style={{
                    fontSize: 11,
                    fontWeight: i === 0 ? 700 : 400,
                    color: i === 0 ? "#000" : "#737373",
                    ...(isBrutal && i === 0 ? { backgroundColor: CITY_COLORS[0], color: "#fff", padding: "2px 8px", borderRadius: 4 } : {}),
                  }}
                >
                  {i + 1}. {city.name}
                  <span style={{ color: "#a3a3a3", marginLeft: 2 }}>({city.count})</span>
                </span>
              ))}
            </div>

            {/* Stats bar */}
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                fontSize: 12,
                color: "#737373",
                fontWeight: 500,
                paddingBottom: 8,
              }}
            >
              <span>
                {totalItems} 个收藏 · {totalCities} 座城市
              </span>
              <span style={{ letterSpacing: "0.05em" }}>觅途 METOO</span>
            </div>
          </div>

          {/* ── Footer strip ── */}
          {isBrutal ? (
            <div
              style={{
                borderTop: `${borderWidth}px solid #000`,
                height: 24,
                background: `repeating-linear-gradient(-45deg, ${primaryColor}, ${primaryColor} 8px, ${accentColor} 8px, ${accentColor} 16px)`,
              }}
            />
          ) : (
            <div style={{ height: 4, backgroundColor: primaryColor, opacity: 0.15 }} />
          )}
        </div>
      </div>
    </div>
  );
}
