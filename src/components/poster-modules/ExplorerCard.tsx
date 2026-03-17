import { useMemo, useRef, useState, useEffect, useCallback } from "react";
import type { PosterModuleProps } from "../../lib/poster-modules";
import { coverSrc } from "../map-shared";

/* ── Poster intrinsic size ── */
const POSTER_W = 800;
const POSTER_H = 1100;

/* ── Explorer levels — gamification ── */
const EXPLORER_LEVELS = [
  { min: 0, title: "萌新探索者", badge: "E" },
  { min: 3, title: "城市漫步者", badge: "D" },
  { min: 6, title: "旅行爱好者", badge: "C" },
  { min: 10, title: "足迹收藏家", badge: "B" },
  { min: 20, title: "城市猎人", badge: "A" },
  { min: 50, title: "旅行达人", badge: "S" },
] as const;

/* ── Theme presets ── */
const THEMES = [
  { bg: "#f43f4a", navy: "#0d145a", accent: "#e63946", artBg: "#7ec8e3" },
  { bg: "#2563eb", navy: "#0f172a", accent: "#3b82f6", artBg: "#bfdbfe" },
  { bg: "#059669", navy: "#022c22", accent: "#10b981", artBg: "#a7f3d0" },
  { bg: "#d946ef", navy: "#1e1b4b", accent: "#a855f7", artBg: "#e9d5ff" },
  { bg: "#ea580c", navy: "#1c1917", accent: "#f97316", artBg: "#fed7aa" },
];

function getExplorerLevel(cityCount: number) {
  let level = EXPLORER_LEVELS[0];
  for (const l of EXPLORER_LEVELS) {
    if (cityCount >= l.min) level = l;
  }
  return level;
}

function getTheme(cityCount: number) {
  return THEMES[cityCount % THEMES.length];
}

/* ── Component ── */

function ExplorerCard({ items, cityEntries }: PosterModuleProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [fitScale, setFitScale] = useState(1);

  const measure = useCallback(() => {
    const el = containerRef.current;
    if (!el) return;
    const pad = 48;
    const sx = (el.clientWidth - pad) / POSTER_W;
    const sy = (el.clientHeight - pad) / POSTER_H;
    setFitScale(Math.min(sx, sy, 1));
  }, []);

  useEffect(() => {
    measure();
    const ro = new ResizeObserver(measure);
    if (containerRef.current) ro.observe(containerRef.current);
    return () => ro.disconnect();
  }, [measure]);

  /* ── Derive stats from real data ── */
  const stats = useMemo(() => {
    const cityCount = cityEntries.length;
    const totalItems = items.length;
    const topCity = cityEntries[0]?.name ?? "—";
    const topCityCount = cityEntries[0]?.count ?? 0;
    const biliCount = items.filter((i) => i.source === "bilibili").length;
    const xhsCount = items.filter((i) => i.source === "xiaohongshu").length;

    return {
      cityCount,
      totalItems,
      topCity,
      topCityCount,
      biliCount,
      xhsCount,
      sourceLabel: biliCount >= xhsCount ? "B站" : "小红书",
      sourceCount: Math.max(biliCount, xhsCount),
    };
  }, [items, cityEntries]);

  const level = getExplorerLevel(stats.cityCount);
  const theme = getTheme(stats.cityCount);
  const cardId = `#${String(stats.cityCount).padStart(3, "0")}`;

  const statRows = useMemo(
    () => [
      { label: "足迹城市", value: `${stats.cityCount}` },
      { label: "收藏内容", value: `${stats.totalItems}` },
      { label: "最热城市", value: stats.topCity },
      { label: "热门收藏", value: `${stats.topCityCount} 篇` },
      { label: stats.sourceLabel, value: `${stats.sourceCount} 篇` },
    ],
    [stats],
  );

  /* ── Collect cover images from top cities ── */
  const heroCovers = useMemo(() => {
    const out: { src: string; city: string }[] = [];
    for (const city of cityEntries) {
      if (out.length >= 4) break;
      const cover = city.covers[0];
      if (cover) out.push({ src: coverSrc(cover), city: city.name });
    }
    return out;
  }, [cityEntries]);

  return (
    <div
      ref={containerRef}
      className="absolute inset-0 flex items-center justify-center overflow-hidden pointer-events-none"
    >
      <div
        style={{
          width: POSTER_W,
          height: POSTER_H,
          transform: `scale(${fitScale})`,
          transformOrigin: "center",
          fontFamily: '"Noto Sans SC", "PingFang SC", system-ui, sans-serif',
        }}
        className="relative flex items-center justify-center"
      >
        {/* Background: split */}
        <div className="absolute inset-0 flex">
          <div className="w-[45%] h-full" style={{ backgroundColor: theme.bg }} />
          <div className="w-[55%] h-full" style={{ backgroundColor: theme.navy }} />
        </div>

        {/* Decorative dots (background) */}
        <svg className="absolute inset-0 w-full h-full opacity-[0.06]" viewBox="0 0 800 1100">
          {Array.from({ length: 40 }, (_, i) => (
            <circle
              key={i}
              cx={80 + (i % 8) * 90}
              cy={80 + Math.floor(i / 8) * 200}
              r={4}
              fill="white"
            />
          ))}
        </svg>

        {/* Card */}
        <div
          className="bg-white flex flex-col relative z-10"
          style={{
            width: 420,
            height: 600,
            borderRadius: 20,
            padding: "20px 22px",
            boxShadow: "0 25px 50px -12px rgba(0,0,0,0.5), 0 0 20px rgba(0,0,0,0.1)",
            transform: "rotate(-8deg) scale(1.05)",
          }}
        >
          {/* Header */}
          <div className="flex justify-between items-center mb-3">
            <span
              className="font-bold text-gray-900 tracking-tight"
              style={{ fontSize: 22 }}
            >
              {stats.topCity || "探索者"}
            </span>
            <div className="flex items-center gap-2">
              <div
                className="flex items-center justify-center"
                style={{
                  width: 24,
                  height: 24,
                  borderRadius: 6,
                  backgroundColor: theme.accent,
                }}
              >
                <span
                  className="text-white font-bold leading-none"
                  style={{ fontSize: 13 }}
                >
                  {level.badge}
                </span>
              </div>
              <span className="font-bold text-gray-800 tracking-wide" style={{ fontSize: 16 }}>
                {cardId}
              </span>
            </div>
          </div>

          {/* Illustration area — cover photos */}
          <div
            className="w-full relative overflow-hidden mb-4"
            style={{
              height: 270,
              borderRadius: 10,
              backgroundColor: theme.artBg,
            }}
          >
            {/* Main cover as background */}
            {heroCovers.length > 0 && (
              <div
                className="absolute inset-0 bg-cover bg-center"
                style={{ backgroundImage: `url(${heroCovers[0].src})` }}
              />
            )}

            {/* Diagonal color overlay */}
            <div
              className="absolute bottom-0 right-0 origin-bottom-right"
              style={{
                width: "120%",
                height: "120%",
                backgroundColor: theme.accent,
                transform: "rotate(-45deg) translateY(50%) translateX(25%)",
                mixBlendMode: "multiply",
                opacity: 0.6,
              }}
            />

            {/* Bottom gradient for readability */}
            <div
              className="absolute bottom-0 left-0 right-0"
              style={{
                height: "60%",
                background: "linear-gradient(transparent, rgba(0,0,0,0.5))",
              }}
            />

            {/* Stripes decoration */}
            <div
              className="absolute"
              style={{
                bottom: -10,
                left: -10,
                width: 140,
                height: 140,
                transform: "rotate(12deg)",
                opacity: 0.3,
                background: `repeating-linear-gradient(45deg, transparent, transparent 4px, white 4px, white 8px)`,
              }}
            />

            {/* Mini cover thumbnails — bottom-left */}
            {heroCovers.length > 1 && (
              <div
                className="absolute flex gap-1.5"
                style={{ bottom: 12, left: 12, zIndex: 2 }}
              >
                {heroCovers.slice(1, 4).map((item, i) => (
                  <div
                    key={i}
                    className="relative overflow-hidden bg-gray-300"
                    style={{
                      width: 52,
                      height: 52,
                      borderRadius: 8,
                      border: "2px solid rgba(255,255,255,0.8)",
                      boxShadow: "0 2px 8px rgba(0,0,0,0.2)",
                    }}
                  >
                    <div
                      className="absolute inset-0 bg-cover bg-center"
                      style={{ backgroundImage: `url(${item.src})` }}
                    />
                    <div
                      className="absolute bottom-0 left-0 right-0 px-1 pb-0.5"
                      style={{
                        background: "linear-gradient(transparent, rgba(0,0,0,0.6))",
                        paddingTop: 12,
                      }}
                    >
                      <span
                        className="text-white font-bold block truncate"
                        style={{ fontSize: 7 }}
                      >
                        {item.city}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* City count number — bottom-right */}
            <div
              className="absolute font-bold"
              style={{
                bottom: 10,
                right: 16,
                fontSize: 72,
                color: "white",
                lineHeight: 1,
                zIndex: 2,
                textShadow: "0 2px 12px rgba(0,0,0,0.4)",
              }}
            >
              {stats.cityCount}
            </div>

            {/* Top city label */}
            {heroCovers.length > 0 && (
              <div
                className="absolute flex items-center gap-1.5"
                style={{ top: 12, left: 12, zIndex: 2 }}
              >
                <div
                  className="rounded-full"
                  style={{
                    width: 8,
                    height: 8,
                    backgroundColor: theme.accent,
                    boxShadow: `0 0 0 2px white`,
                  }}
                />
                <span
                  className="text-white font-bold"
                  style={{
                    fontSize: 11,
                    textShadow: "0 1px 4px rgba(0,0,0,0.5)",
                    letterSpacing: "0.05em",
                  }}
                >
                  {heroCovers[0].city}
                </span>
              </div>
            )}
          </div>

          {/* Info + stats */}
          <div className="flex flex-col flex-grow px-1">
            <div className="flex justify-between items-end mb-1.5">
              <span className="font-bold text-gray-900" style={{ fontSize: 18 }}>
                {level.title}
              </span>
              <span className="font-bold" style={{ fontSize: 14, color: theme.accent }}>
                Lv.{EXPLORER_LEVELS.indexOf(level) + 1}
              </span>
            </div>
            <div
              className="w-full mb-2 rounded-full"
              style={{ height: 4, backgroundColor: theme.accent }}
            />
            <div className="flex flex-col gap-1 mt-1">
              {statRows.map((stat, i) => (
                <div
                  key={i}
                  className="flex justify-between items-end"
                  style={{
                    paddingBottom: 3,
                    borderBottom: `2px solid ${theme.accent}`,
                  }}
                >
                  <span
                    className="text-gray-800 font-semibold tracking-tight"
                    style={{ fontSize: 15 }}
                  >
                    {stat.label}
                  </span>
                  <span className="text-gray-900 font-bold" style={{ fontSize: 15 }}>
                    {stat.value}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Bottom watermark */}
        <div
          className="absolute bottom-8 left-0 right-0 text-center text-white/30"
          style={{ fontSize: 14, letterSpacing: "0.2em" }}
        >
          METOO · 足迹探索卡
        </div>
      </div>
    </div>
  );
}

export default ExplorerCard;
