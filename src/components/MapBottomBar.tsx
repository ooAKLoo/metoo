import { useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { MapPin, X } from "lucide-react";
import { convertFileSrc } from "@tauri-apps/api/core";
import { useMapStore } from "../stores/useMapStore";
import { useFavoriteStore } from "../stores/useFavoriteStore";
import { useCityAggregation } from "../hooks/useCityAggregation";
import { PROV_FULL } from "./map-shared";

function coverSrc(cover: string) {
  if (!cover) return "";
  if (cover.startsWith("/")) return convertFileSrc(cover);
  if (cover.startsWith("//")) return `https:${cover}`;
  return cover;
}

const CHINA_PROV_SET = new Set([
  ...Object.keys(PROV_FULL),
  ...Object.values(PROV_FULL),
]);

// ── Shared card component ──

function BottomCard({
  cover,
  children,
  onClick,
  style,
}: {
  cover: string;
  children: React.ReactNode;
  onClick?: () => void;
  style?: React.CSSProperties;
}) {
  return (
    <div
      className="relative shrink-0 w-[120px] h-[72px] rounded-[12px] overflow-hidden
                 shadow-[0_2px_12px_rgba(0,0,0,0.08)] cursor-pointer"
      style={style}
      onClick={onClick}
    >
      <div className="absolute inset-0 bg-[#f0f0f2]">
        {cover && (
          <img
            src={cover}
            alt=""
            referrerPolicy="no-referrer"
            crossOrigin="anonymous"
            className="w-full h-full object-cover"
            loading="lazy"
          />
        )}
      </div>
      <div className="absolute bottom-0 inset-x-0
                      bg-gradient-to-t from-black/50 to-transparent
                      px-1.5 pb-1 pt-3">
        {children}
      </div>
    </div>
  );
}

// ── Route group types ──

interface RouteGroup {
  key: string;
  cityCount: number;
  cover: string;
}

// ── Main component ──

export function MapBottomBar() {
  const routePath = useMapStore((s) => s.routePath);
  const mapLevel = useMapStore((s) => s.mapLevel);
  const selectedCity = useMapStore((s) => s.selectedCity);
  const selectedProvince = useMapStore((s) => s.selectedProvince);
  const clearCityFilter = useMapStore((s) => s.clearCityFilter);
  const allItems = useFavoriteStore((s) => s.items);
  const { entries } = useCityAggregation();

  // ── Shared data ──
  const cityCovers = useMemo(() => {
    const map = new Map<string, string>();
    for (const e of entries) {
      if (e.covers.length > 0) map.set(e.name, coverSrc(e.covers[0]));
    }
    return map;
  }, [entries]);

  // ── Route mode data ──
  const cityRegion = useMemo(() => {
    const map = new Map<string, { province: string; country: string }>();
    for (const item of allItems) {
      for (const loc of item.locations) {
        if (map.has(loc.name)) continue;
        const isChinese = CHINA_PROV_SET.has(loc.province);
        map.set(loc.name, {
          province: isChinese ? (PROV_FULL[loc.province] || loc.province) : loc.province,
          country: isChinese ? "中国" : loc.province,
        });
      }
    }
    return map;
  }, [allItems]);

  const routeGroups = useMemo((): RouteGroup[] | null => {
    if (!routePath || routePath.length === 0) return null;
    const isWorld = mapLevel === "world";
    const getKey = (name: string) => {
      const region = cityRegion.get(name);
      if (!region) return name;
      return isWorld ? region.country : region.province;
    };
    const acc = new Map<string, { cityCount: number; cover: string }>();
    const order: string[] = [];
    for (const node of routePath) {
      const key = getKey(node.name);
      let g = acc.get(key);
      if (!g) {
        g = { cityCount: 0, cover: "" };
        acc.set(key, g);
        order.push(key);
      }
      g.cityCount++;
      if (!g.cover) g.cover = cityCovers.get(node.name) || "";
    }
    const groups: RouteGroup[] = order.map((key) => {
      const g = acc.get(key)!;
      return { key, cityCount: g.cityCount, cover: g.cover };
    });
    return groups.length > 0 ? groups : null;
  }, [routePath, mapLevel, cityRegion, cityCovers]);

  const routeTotal = routeGroups?.length ?? 0;
  const [revealedCount, setRevealedCount] = useState(0);

  useEffect(() => {
    if (!routeGroups || routeTotal === 0) { setRevealedCount(0); return; }
    setRevealedCount(0);
    let current = 0;
    const timer = setInterval(() => {
      current++;
      setRevealedCount(current);
      if (current >= routeTotal) clearInterval(timer);
    }, 600);
    return () => clearInterval(timer);
  }, [routeGroups, routeTotal]);

  // ── City detail mode data ──
  const cityEntry = useMemo(
    () => entries.find((e) => e.name === selectedCity),
    [entries, selectedCity],
  );

  const cityItems = useMemo(() => {
    if (!selectedCity) return [];
    return allItems.filter((item) =>
      item.locations.some((loc) => loc.name === selectedCity),
    );
  }, [allItems, selectedCity]);

  // ── Province detail mode data ──
  const provItems = useMemo(() => {
    if (!selectedProvince) return [];
    return allItems.filter((item) =>
      item.locations.some((loc) => {
        const fullProv = CHINA_PROV_SET.has(loc.province)
          ? (PROV_FULL[loc.province] || loc.province)
          : loc.province;
        return fullProv === selectedProvince;
      }),
    );
  }, [allItems, selectedProvince]);

  const provCover = useMemo(() => {
    if (!selectedProvince) return "";
    for (const e of entries) {
      if (e.covers.length === 0) continue;
      // Check if this city entry belongs to the selected province
      const item = allItems.find((it) =>
        it.locations.some((loc) => {
          const fullProv = CHINA_PROV_SET.has(loc.province)
            ? (PROV_FULL[loc.province] || loc.province)
            : loc.province;
          return fullProv === selectedProvince && loc.name === e.name;
        }),
      );
      if (item) return coverSrc(e.covers[0]);
    }
    return "";
  }, [selectedProvince, entries, allItems]);

  // ── Auto-scroll ──
  const scrollRef = useRef<HTMLDivElement>(null);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (endRef.current) {
      endRef.current.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "nearest" });
    }
  }, [revealedCount, selectedCity, selectedProvince]);

  // ── Determine active mode ──
  const isRouteMode = !!routeGroups && revealedCount > 0;
  const isProvMode = !routePath && !!selectedProvince && provItems.length > 0;
  const isCityMode = !routePath && !isProvMode && !!selectedCity && cityItems.length > 0;

  if (!isRouteMode && !isCityMode && !isProvMode) return null;

  // ── Header content ──
  const detailLabel = isProvMode ? selectedProvince : selectedCity;
  const detailCount = isProvMode ? provItems.length : cityItems.length;
  const detailCover = isProvMode ? provCover : (cityEntry && cityEntry.covers.length > 0 ? coverSrc(cityEntry.covers[0]) : "");

  const header = isRouteMode ? (
    <div className="flex items-baseline gap-2 px-1">
      <span className="font-playful text-[14px] text-[var(--text-primary)]">路线</span>
      <span className="text-[10px] text-[var(--text-secondary)] tabular-nums">
        {revealedCount}/{routeTotal}
      </span>
    </div>
  ) : (isCityMode || isProvMode) ? (
    <div className="inline-flex items-center gap-1.5
                    bg-white/90 backdrop-blur-md rounded-lg
                    shadow-[0_2px_8px_rgba(0,0,0,0.06)]
                    pl-1.5 pr-2 py-1">
      {detailCover && (
        <div className="w-5 h-5 rounded-full overflow-hidden shrink-0 border border-neutral-200">
          <img
            src={detailCover}
            alt=""
            referrerPolicy="no-referrer"
            crossOrigin="anonymous"
            className="w-full h-full object-cover"
          />
        </div>
      )}
      <MapPin size={8} className="text-neutral-400 shrink-0" />
      <span className="text-[11px] font-medium text-neutral-800">{detailLabel}</span>
      <span className="text-[9px] text-neutral-400">{detailCount} 条</span>
      <motion.button
        whileTap={{ scale: 0.9 }}
        onClick={clearCityFilter}
        className="shrink-0 w-4 h-4 flex items-center justify-center
                   rounded hover:bg-neutral-200
                   text-neutral-400 hover:text-neutral-600
                   transition-colors cursor-pointer ml-0.5"
      >
        <X size={9} />
      </motion.button>
    </div>
  ) : null;

  // ── Card strip content ──
  const visibleRouteStops = isRouteMode ? routeGroups!.slice(0, revealedCount) : [];

  const isDetailMode = isCityMode || isProvMode;
  const detailItems = isProvMode ? provItems : cityItems;

  // Stable key for the detail strip — only changes when switching province/city,
  // so AnimatePresence replays the container entrance, not per-card animations.
  const detailKey = isProvMode ? `prov-${selectedProvince}` : `city-${selectedCity}`;

  // Stagger: each card delays 50ms, cap at 10 so later cards don't wait too long.
  const STAGGER_MS = 50;
  const MAX_STAGGER_IDX = 10;

  return (
    <div className={`absolute bottom-3 z-10 pointer-events-none flex flex-col items-center ${
      isDetailMode ? "left-[220px] right-[220px]" : "inset-x-0"
    }`}>
      {/* Horizontal-only motion blur SVG filters */}
      <svg width="0" height="0" className="absolute" aria-hidden="true">
        <defs>
          <filter id="motion-blur-heavy" x="-30%" width="160%" y="0%" height="100%">
            <feGaussianBlur in="SourceGraphic" stdDeviation="12,0" />
          </filter>
          <filter id="motion-blur-light" x="-15%" width="130%" y="0%" height="100%">
            <feGaussianBlur in="SourceGraphic" stdDeviation="4,0" />
          </filter>
        </defs>
      </svg>
      {/* Header */}
      <AnimatePresence mode="wait">
        {header && (
          <motion.div
            key={isRouteMode ? "route-header" : isProvMode ? "prov-header" : "city-header"}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 8 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            className="mb-1.5 pointer-events-auto"
          >
            {header}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Bottom bar */}
      <AnimatePresence mode="wait">
        <motion.div
          key={isRouteMode ? "route-bar" : detailKey}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 10 }}
          transition={{ duration: 0.2, ease: [0.25, 0.1, 0.25, 1] }}
          className={`flex items-end gap-2 pointer-events-auto ${
            isDetailMode ? "max-w-full" : "max-w-[85%]"
          }`}
          style={{ willChange: "transform, opacity" }}
        >
          {/* Layer 1: Invisible outer capsule — clips scrolling content with large radius */}
          <div className="flex-1 min-w-0 relative rounded-[20px] overflow-hidden"
               style={{ background: "var(--bg-primary)" }}>
            {/* Layer 2: Scroll area */}
            <div
              ref={scrollRef}
              className="overflow-x-auto overflow-y-hidden scrollbar-hide"
            >
              <div className="flex gap-1.5 px-2.5 py-2">
                {/* Route mode: keep per-card AnimatePresence for sequential reveal */}
                {isRouteMode && (
                  <AnimatePresence>
                    {visibleRouteStops.map((group, i) => (
                      <motion.div
                        key={`route-${group.key}-${i}`}
                        initial={{ opacity: 0, y: 20, scale: 0.92 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 20, scale: 0.92 }}
                        transition={{ type: "spring", stiffness: 350, damping: 25, mass: 0.8 }}
                      >
                        <BottomCard cover={group.cover}>
                          <div className="flex items-center gap-0.5 justify-between">
                            <div
                              className="w-[18px] h-[18px] rounded-full flex items-center justify-center
                                         text-white font-playful text-[8px]"
                              style={{ background: "linear-gradient(135deg, #ff6b6b, #ee5a24)" }}
                            >
                              {i + 1}
                            </div>
                            <div className="flex items-center gap-0.5">
                              <MapPin size={7} className="text-white/80" />
                              <span className="text-[9px] font-medium text-white/90 truncate">
                                {group.key}
                              </span>
                              {group.cityCount > 1 && (
                                <span className="text-[8px] text-white/60">·{group.cityCount}</span>
                              )}
                            </div>
                          </div>
                        </BottomCard>
                      </motion.div>
                    ))}
                  </AnimatePresence>
                )}

                {/* Detail mode: CSS stagger — no per-card spring, container handles enter/exit */}
                {isDetailMode && detailItems.map((item, i) => (
                  <BottomCard
                    key={item.id}
                    cover={coverSrc(item.cover)}
                    style={{
                      animation: `bottomcard-in 0.55s cubic-bezier(0.16, 1, 0.3, 1) ${Math.min(i, MAX_STAGGER_IDX) * STAGGER_MS}ms both`,
                      willChange: "opacity, transform, filter",
                    }}
                    onClick={() => {
                      const url = item.source === "xiaohongshu"
                        ? `https://www.xiaohongshu.com/explore/${item.bvid}`
                        : `https://www.bilibili.com/video/${item.bvid}`;
                      window.open(url, "_blank");
                    }}
                  >
                    <p className="text-[9px] font-medium text-white/90 line-clamp-1">
                      {item.title}
                    </p>
                  </BottomCard>
                ))}

                <div ref={endRef} className="shrink-0 w-px" />
              </div>
            </div>
            {/* Layer 3: Edge feather overlays — multi-stop gradient for soft fade */}
            <div className="absolute left-0 top-0 bottom-0 w-10 pointer-events-none z-[1]"
                 style={{
                   background: "linear-gradient(to right, var(--bg-primary) 0%, var(--bg-primary) 30%, transparent 100%)",
                 }} />
            <div className="absolute right-0 top-0 bottom-0 w-10 pointer-events-none z-[1]"
                 style={{
                   background: "linear-gradient(to left, var(--bg-primary) 0%, var(--bg-primary) 30%, transparent 100%)",
                 }} />
          </div>

          {/* Fixed tail */}
          <div className="shrink-0">
            <AnimatePresence mode="wait">
              {isRouteMode && revealedCount > 0 && revealedCount < routeTotal && (
                <motion.div
                  key="drawing"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="flex items-center gap-1.5 h-[72px] px-2"
                >
                  <motion.div
                    animate={{ scale: [1, 1.3, 1] }}
                    transition={{ repeat: Infinity, duration: 1.2 }}
                    className="w-[5px] h-[5px] rounded-full bg-[#ee5a24]/40"
                  />
                  <span className="text-[9px] text-[var(--text-secondary)] whitespace-nowrap">
                    规划中...
                  </span>
                </motion.div>
              )}
              {isRouteMode && revealedCount >= routeTotal && (
                <motion.div
                  key="done"
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.3, type: "spring", stiffness: 300, damping: 25 }}
                >
                  <div className="bg-white/80 backdrop-blur-md rounded-[14px] px-3 py-2
                                  shadow-[0_2px_12px_rgba(0,0,0,0.04)] text-center">
                    <span className="font-playful text-[11px] text-[var(--text-primary)]">出发!</span>
                    <span className="block text-[8px] text-[var(--text-secondary)] mt-0.5">
                      共 {routePath?.length ?? 0} 站
                    </span>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
