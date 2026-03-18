import React, { useMemo, useRef, useState, useEffect, useCallback } from "react";
import type { PosterModuleProps } from "../../lib/poster-modules";
import { useMapStore } from "../../stores/useMapStore";

/* ── Base design dimensions (for proportional scaling) ── */
const BASE_W = 1100;
const BASE_KB_W = 920;

/* ── Keyboard layout (shared, 60-column grid) ── */
interface KeyDef { l: string; w: number; type?: "mod" | "accent" | "cmd" | "space" }

const KB: KeyDef[][] = [
  [{ l: "esc", w: 4, type: "mod" },{ l: "1", w: 4 },{ l: "2", w: 4 },{ l: "3", w: 4 },{ l: "4", w: 4 },{ l: "5", w: 4 },{ l: "6", w: 4 },{ l: "7", w: 4 },{ l: "8", w: 4 },{ l: "9", w: 4 },{ l: "0", w: 4 },{ l: "-", w: 4 },{ l: "=", w: 4 },{ l: "delete", w: 8, type: "mod" }],
  [{ l: "tab", w: 6, type: "mod" },{ l: "Q", w: 4 },{ l: "W", w: 4 },{ l: "E", w: 4 },{ l: "R", w: 4 },{ l: "T", w: 4 },{ l: "Y", w: 4 },{ l: "U", w: 4 },{ l: "I", w: 4 },{ l: "O", w: 4 },{ l: "P", w: 4 },{ l: "[", w: 4 },{ l: "]", w: 4 },{ l: "\\", w: 6, type: "mod" }],
  [{ l: "caps", w: 7, type: "mod" },{ l: "A", w: 4 },{ l: "S", w: 4 },{ l: "D", w: 4 },{ l: "F", w: 4 },{ l: "G", w: 4 },{ l: "H", w: 4 },{ l: "J", w: 4 },{ l: "K", w: 4 },{ l: "L", w: 4 },{ l: ";", w: 4 },{ l: "'", w: 4 },{ l: "return", w: 9, type: "mod" }],
  [{ l: "shift", w: 9, type: "mod" },{ l: "Z", w: 4 },{ l: "X", w: 4 },{ l: "C", w: 4, type: "accent" },{ l: "V", w: 4, type: "accent" },{ l: "B", w: 4 },{ l: "N", w: 4 },{ l: "M", w: 4 },{ l: ",", w: 4 },{ l: ".", w: 4 },{ l: "/", w: 4 },{ l: "shift", w: 11, type: "mod" }],
  [{ l: "ctrl", w: 5, type: "mod" },{ l: "opt", w: 5, type: "mod" },{ l: "\u2318", w: 6, type: "cmd" },{ l: "", w: 23, type: "space" },{ l: "\u2318", w: 6, type: "cmd" },{ l: "opt", w: 5, type: "mod" },{ l: "fn", w: 5, type: "mod" },{ l: "ctrl", w: 5, type: "mod" }],
];

/* ── Palette types ── */
interface Palette {
  surface: string;
  shadow: string;
  caps: string[];
  bases: string[];
}

/* ── Theme presets ── */
interface ThemePreset {
  id: string;
  label: string;
  /** "flat" = box-shadow extrusion (KB2), "rounded" = 3D front+top (KB1) */
  style: "flat" | "rounded";
  posterBg: string;
  textColor: string;
  subtitleColor: string;
  tagBg: string;
  tagColor: string;
  kbContainerBg: string;
  palette: Palette;
  accentColor: string;
}

export const KEYBOARD_THEMES: ThemePreset[] = [
  {
    id: "flat-pop",
    label: "Pop",
    style: "flat",
    posterBg: "#FAFAF8",
    textColor: "#1a1a1a",
    subtitleColor: "#999",
    tagBg: "#F0EFEC",
    tagColor: "#555",
    kbContainerBg: "rgba(255,255,255,0.6)",
    palette: {
      surface: "#f3ead8",
      shadow: "#181818",
      caps: ["#f47ea5", "#f56c2d", "#2465e3", "#f4d03f"],
      bases: ["#e92f2f", "#f4d03f", "#2465e3"],
    },
    accentColor: "#f56c2d",
  },
  {
    id: "flat-cyber",
    label: "Cyber",
    style: "flat",
    posterBg: "#0f0f13",
    textColor: "#f0f0f0",
    subtitleColor: "#666",
    tagBg: "rgba(255,255,255,0.08)",
    tagColor: "#aaa",
    kbContainerBg: "rgba(255,255,255,0.04)",
    palette: {
      surface: "#2d2d3d",
      shadow: "#000000",
      caps: ["#00ff9f", "#00b8ff", "#ff007f", "#ffe600"],
      bases: ["#7000ff", "#ff007f", "#00b8ff"],
    },
    accentColor: "#00ff9f",
  },
  {
    id: "flat-pastel",
    label: "Pastel",
    style: "flat",
    posterBg: "#F5F0F8",
    textColor: "#2a2a3a",
    subtitleColor: "#999",
    tagBg: "#EDE8F2",
    tagColor: "#666",
    kbContainerBg: "rgba(255,255,255,0.7)",
    palette: {
      surface: "#ffffff",
      shadow: "#a2a8b3",
      caps: ["#ffb3ba", "#ffdfba", "#ffffba", "#baffc9", "#bae1ff"],
      bases: ["#ffb3ba", "#bae1ff", "#ffdfba"],
    },
    accentColor: "#ffb3ba",
  },
  {
    id: "round-pop",
    label: "Retro Pop",
    style: "rounded",
    posterBg: "#1a4fd6",
    textColor: "#ffffff",
    subtitleColor: "rgba(255,255,255,0.5)",
    tagBg: "rgba(255,255,255,0.15)",
    tagColor: "rgba(255,255,255,0.8)",
    kbContainerBg: "rgba(255,255,255,0.08)",
    palette: {
      surface: "#faf3e0",
      shadow: "#1a1a2e",
      caps: ["#f26522", "#f5a0b8", "#2a5cc7", "#f7c948", "#2d936c", "#e63946"],
      bases: ["#e63946", "#f7c948", "#2a5cc7"],
    },
    accentColor: "#f7c948",
  },
  {
    id: "round-mono",
    label: "Mono",
    style: "rounded",
    posterBg: "#1a1a1a",
    textColor: "#e8e8e8",
    subtitleColor: "#666",
    tagBg: "rgba(255,255,255,0.08)",
    tagColor: "#888",
    kbContainerBg: "rgba(255,255,255,0.04)",
    palette: {
      surface: "#ddd",
      shadow: "#222",
      caps: ["#555", "#999", "#bbb", "#666", "#777"],
      bases: ["#333", "#555", "#444"],
    },
    accentColor: "#999",
  },
  {
    id: "round-pastel",
    label: "Soft",
    style: "rounded",
    posterBg: "#e8d8f0",
    textColor: "#2a2040",
    subtitleColor: "#8a7a9a",
    tagBg: "rgba(255,255,255,0.5)",
    tagColor: "#5a4a6a",
    kbContainerBg: "rgba(255,255,255,0.3)",
    palette: {
      surface: "#fff",
      shadow: "#6c5b7b",
      caps: ["#ffb3a7", "#ffd1dc", "#a8d8ea", "#fff5ba", "#b5ead7", "#ff9a9e"],
      bases: ["#ffb3a7", "#a8d8ea", "#ffd1dc"],
    },
    accentColor: "#a8d8ea",
  },
];

/* ── Helpers ── */
function seededRng(seed: number) {
  let s = seed;
  return () => { s = (s * 16807) % 2147483647; return (s - 1) / 2147483646; };
}

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

function hexDarken(hex: string, factor: number) {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgb(${(r * factor) | 0},${(g * factor) | 0},${(b * factor) | 0})`;
}

function luminance(hex: string) {
  return parseInt(hex.slice(1, 3), 16) * 0.299 +
    parseInt(hex.slice(3, 5), 16) * 0.587 +
    parseInt(hex.slice(5, 7), 16) * 0.114;
}

/* ── Flat-style key (PopArtKeyboard2) ── */
const FlatKey: React.FC<{
  data: KeyDef; pal: Palette; capColor: string; baseColor: string; keyH: number;
}> = React.memo(({ data, pal, capColor, baseColor, keyH }) => {
  const bigChar = (data.w === 4 && data.l.length === 1 && !data.type) || data.type === "accent";
  return (
    <div style={{ position: "relative", gridColumn: `span ${data.w}`, height: keyH }}>
      <div style={{
        position: "absolute", inset: 0, backgroundColor: pal.surface,
        boxShadow: solidShadow([{ color: baseColor, depth: 8 }, { color: pal.shadow, depth: 6 }]),
      }}>
        <div style={{
          position: "absolute", top: 3, right: 3, bottom: 7, left: 7,
          backgroundColor: capColor,
          boxShadow: solidShadow([{ color: pal.shadow, depth: 4 }]),
          color: pal.shadow,
          display: "flex",
          alignItems: bigChar ? "center" : "flex-end",
          justifyContent: bigChar ? "center" : "flex-start",
          padding: bigChar ? 0 : "3px 0 3px 5px",
        }}>
          <span style={{
            fontWeight: 700, letterSpacing: "0.05em",
            fontSize: bigChar ? 22 : 8,
            textTransform: bigChar ? "uppercase" : "lowercase",
            fontFamily: "ui-sans-serif, system-ui, sans-serif",
          }}>
            {data.l}
          </span>
        </div>
      </div>
    </div>
  );
});
FlatKey.displayName = "FlatKey";

/* ── Rounded-style key (PopArtKeyboard) ── */
const RoundKey: React.FC<{
  data: KeyDef; capColor: string; keyH: number;
}> = React.memo(({ data, capColor, keyH }) => {
  const bigChar = (data.w === 4 && data.l.length === 1 && !data.type) || data.type === "accent";
  const frontColor = hexDarken(capColor, 0.72);
  const textColor = luminance(capColor) < 128 ? "#faf3e0" : "#1a1a2e";
  const depth = 7;
  const radius = 7;

  return (
    <div style={{ position: "relative", gridColumn: `span ${data.w}`, height: keyH }}>
      {/* shadow */}
      <div style={{
        position: "absolute", bottom: -2, left: 3, right: -3, height: depth + 2,
        background: "rgba(0,0,0,0.35)", borderRadius: `0 0 ${radius}px ${radius}px`,
      }} />
      {/* front */}
      <div style={{
        position: "absolute", left: 0, right: 0, bottom: 0, height: depth + 5,
        background: frontColor, borderRadius: `0 0 ${radius}px ${radius}px`,
      }} />
      {/* top face */}
      <div style={{
        position: "absolute", top: 0, left: 0, right: 0, bottom: depth,
        borderRadius: radius,
        display: "flex", alignItems: bigChar ? "center" : "flex-end",
        justifyContent: bigChar ? "center" : "flex-start",
        padding: bigChar ? 0 : "3px 0 3px 5px",
        background: capColor, color: textColor,
        border: "1.5px solid rgba(0,0,0,0.05)",
        fontFamily: "ui-sans-serif, system-ui, sans-serif",
      }}>
        <span style={{
          fontWeight: 700, letterSpacing: "0.05em",
          fontSize: bigChar ? 20 : 8,
          textTransform: bigChar ? "uppercase" : "lowercase",
        }}>
          {data.l}
        </span>
      </div>
    </div>
  );
});
RoundKey.displayName = "RoundKey";

/* ── Main Component ── */

function KeyboardPoster({ items, cityEntries, posterWidth, posterHeight }: PosterModuleProps) {
  const W = posterWidth;
  const H = posterHeight;

  /* Scale keyboard proportionally to poster width */
  const kbW = Math.round(W * (BASE_KB_W / BASE_W));
  const kbRatio = kbW / BASE_KB_W;
  const kbGap = Math.round(8 * kbRatio);
  const kH = Math.round(48 * kbRatio);

  const containerRef = useRef<HTMLDivElement>(null);
  const [fitScale, setFitScale] = useState(1);
  const themeIdx = useMapStore((s) => s.keyboardThemeIdx);
  const theme = KEYBOARD_THEMES[themeIdx % KEYBOARD_THEMES.length];

  const measure = useCallback(() => {
    const el = containerRef.current;
    if (!el) return;
    const pad = 48;
    setFitScale(Math.min((el.clientWidth - pad) / W, (el.clientHeight - pad) / H, 1));
  }, [W, H]);

  useEffect(() => {
    measure();
    const ro = new ResizeObserver(measure);
    if (containerRef.current) ro.observe(containerRef.current);
    return () => ro.disconnect();
  }, [measure]);

  const cityCount = cityEntries.length;
  const totalItems = items.length;
  const topCity = cityEntries[0]?.name ?? "";
  const topCities = cityEntries.slice(0, 4).map((c) => c.name);

  const keyColors = useMemo(() => {
    const rng = seededRng(cityCount * 31 + totalItems + 42);
    return KB.map((row) =>
      row.map(() => ({
        cap: theme.palette.caps[Math.floor(rng() * theme.palette.caps.length)],
        base: theme.palette.bases[Math.floor(rng() * theme.palette.bases.length)],
      })),
    );
  }, [cityCount, totalItems, theme]);

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
            backgroundColor: theme.posterBg,
            borderRadius: 24,
            overflow: "hidden",
            position: "relative",
            fontFamily: '"Noto Sans SC","PingFang SC",system-ui,sans-serif',
            transition: "background-color 0.4s ease",
          }}
        >
          {/* ── Top: typography ── */}
          <div style={{
            position: "absolute", top: 0, left: 0, right: 0, height: "52%",
            display: "flex", flexDirection: "column", justifyContent: "flex-end",
            padding: "48px 64px 24px", zIndex: 2,
          }}>
            <div style={{
              fontSize: 13, fontWeight: 600, color: theme.subtitleColor,
              letterSpacing: "0.15em", textTransform: "uppercase", marginBottom: 12,
              fontFamily: "ui-sans-serif, system-ui, sans-serif",
            }}>
              {cityCount} cities · {totalItems} saved
            </div>

            <h1 style={{
              fontSize: topCity.length > 3 ? 64 : 80,
              fontWeight: 800, color: theme.textColor,
              lineHeight: 1.1, letterSpacing: "-0.02em", margin: 0,
            }}>
              {topCity || "旅行足迹"}
            </h1>

            {topCities.length > 1 && (
              <div style={{ display: "flex", gap: 10, marginTop: 16, flexWrap: "wrap" }}>
                {topCities.slice(1).map((name) => (
                  <span key={name} style={{
                    fontSize: 12, fontWeight: 600, color: theme.tagColor,
                    padding: "4px 12px", backgroundColor: theme.tagBg,
                    borderRadius: 20, letterSpacing: "0.05em",
                  }}>
                    {name}
                  </span>
                ))}
              </div>
            )}

            <div style={{
              width: 48, height: 3, backgroundColor: theme.accentColor,
              borderRadius: 2, marginTop: 20,
            }} />
          </div>

          {/* ── Bottom: keyboard with perspective ── */}
          <div style={{
            position: "absolute", bottom: -30, left: "50%",
            transform: "translateX(-50%)", perspective: 1200, zIndex: 1,
          }}>
            <div style={{
              transform: "rotateX(42deg) scale(0.72)",
              transformOrigin: "center bottom",
            }}>
              <div style={{
                display: "grid",
                gridTemplateColumns: "repeat(60, minmax(0, 1fr))",
                gap: kbGap, width: kbW, padding: Math.round(20 * kbRatio),
                backgroundColor: theme.kbContainerBg,
                borderRadius: 12,
              }}>
                {KB.map((row, ri) =>
                  row.map((keyData, ki) =>
                    theme.style === "flat" ? (
                      <FlatKey
                        key={`${ri}-${ki}`}
                        data={keyData}
                        pal={theme.palette}
                        capColor={keyColors[ri][ki].cap}
                        baseColor={keyColors[ri][ki].base}
                        keyH={kH}
                      />
                    ) : (
                      <RoundKey
                        key={`${ri}-${ki}`}
                        data={keyData}
                        capColor={keyColors[ri][ki].cap}
                        keyH={kH}
                      />
                    ),
                  ),
                )}
              </div>
            </div>
          </div>

          {/* ── Brand mark ── */}
          <div style={{
            position: "absolute", bottom: 16, left: 64,
            fontSize: 10, fontWeight: 600, color: theme.subtitleColor,
            letterSpacing: "0.2em", zIndex: 3,
          }}>
            METOO
          </div>
        </div>
      </div>
    </div>
  );
}

export default KeyboardPoster;
