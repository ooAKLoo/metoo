import { useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { MapPin } from "lucide-react";
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

// Set of all known Chinese province names (short + full)
const CHINA_PROV_SET = new Set([
  ...Object.keys(PROV_FULL),
  ...Object.values(PROV_FULL),
]);

interface RouteGroup {
  key: string;
  cityCount: number;
  cover: string;
}

export function RouteStopList() {
  const routePath = useMapStore((s) => s.routePath);
  const mapLevel = useMapStore((s) => s.mapLevel);
  const items = useFavoriteStore((s) => s.items);
  const { entries } = useCityAggregation();

  const cityCovers = useMemo(() => {
    const map = new Map<string, string>();
    for (const e of entries) {
      if (e.covers.length > 0) {
        map.set(e.name, coverSrc(e.covers[0]));
      }
    }
    return map;
  }, [entries]);

  const cityRegion = useMemo(() => {
    const map = new Map<string, { province: string; country: string }>();
    for (const item of items) {
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
  }, [items]);

  const routeGroups = useMemo((): RouteGroup[] | null => {
    if (!routePath || routePath.length === 0) return null;
    const isWorld = mapLevel === "world";

    const getKey = (name: string) => {
      const region = cityRegion.get(name);
      if (!region) return name;
      return isWorld ? region.country : region.province;
    };

    const groups: RouteGroup[] = [];
    let currentKey = "";
    let currentCount = 0;
    let currentCover = "";

    const flush = () => {
      if (currentCount > 0) {
        groups.push({ key: currentKey, cityCount: currentCount, cover: currentCover });
      }
    };

    for (const node of routePath) {
      const key = getKey(node.name);
      if (key !== currentKey) {
        flush();
        currentKey = key;
        currentCount = 0;
        currentCover = "";
      }
      currentCount++;
      if (!currentCover) {
        currentCover = cityCovers.get(node.name) || "";
      }
    }
    flush();

    return groups.length > 0 ? groups : null;
  }, [routePath, mapLevel, cityRegion, cityCovers]);

  const total = routeGroups?.length ?? 0;
  const [revealedCount, setRevealedCount] = useState(0);

  useEffect(() => {
    if (!routeGroups || total === 0) { setRevealedCount(0); return; }
    setRevealedCount(0);
    let current = 0;
    const timer = setInterval(() => {
      current++;
      setRevealedCount(current);
      if (current >= total) clearInterval(timer);
    }, 600);
    return () => clearInterval(timer);
  }, [routeGroups, total]);

  const scrollRef = useRef<HTMLDivElement>(null);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (revealedCount > 0 && endRef.current) {
      endRef.current.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "nearest" });
    }
  }, [revealedCount]);

  if (!routeGroups || routeGroups.length === 0) return null;

  const visibleStops = routeGroups.slice(0, revealedCount);

  return (
    <div className="absolute bottom-3 inset-x-0 z-10 pointer-events-none
                    flex flex-col items-center">
      {/* Header */}
      <AnimatePresence>
        {revealedCount > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 12 }}
            transition={{ type: "spring", stiffness: 400, damping: 30 }}
            className="mb-1.5 pointer-events-auto"
          >
            <div className="flex items-baseline gap-2 px-1">
              <span className="font-playful text-[14px] text-[var(--text-primary)]">
                路线
              </span>
              <span className="text-[10px] text-[var(--text-secondary)] tabular-nums">
                {revealedCount}/{total}
              </span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Bottom bar: scrollable stops + fixed tail */}
      <div className="flex items-end gap-2 pointer-events-auto max-w-[85%]">
        {/* Scrollable stop strip */}
        <div
          ref={scrollRef}
          className="flex-1 min-w-0 overflow-x-auto overflow-y-hidden scrollbar-hide"
        >
          <div className="flex gap-1.5">
            <AnimatePresence>
              {visibleStops.map((group, i) => (
                <motion.div
                  key={`${group.key}-${i}`}
                  initial={{ opacity: 0, y: 20, scale: 0.92 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 20, scale: 0.92 }}
                  transition={{
                    type: "spring",
                    stiffness: 350,
                    damping: 25,
                    mass: 0.8,
                  }}
                  className="relative shrink-0 w-[120px] h-[72px] rounded-[12px] overflow-hidden
                             shadow-[0_2px_12px_rgba(0,0,0,0.08)]"
                >
                  <div className="absolute inset-0 bg-[#f0f0f2]">
                    {group.cover && (
                      <img
                        src={group.cover}
                        alt=""
                        referrerPolicy="no-referrer"
                        crossOrigin="anonymous"
                        className="w-full h-full object-cover"
                        loading="lazy"
                      />
                    )}
                  </div>

                  <div
                    className="absolute top-1.5 left-1.5 w-[20px] h-[20px] rounded-full
                               flex items-center justify-center
                               text-white font-playful text-[9px]
                               shadow-[0_2px_6px_rgba(0,0,0,0.2)]"
                    style={{
                      background: "linear-gradient(135deg, #ff6b6b, #ee5a24)",
                    }}
                  >
                    {i + 1}
                  </div>

                  <div className="absolute bottom-0 inset-x-0
                                  bg-gradient-to-t from-black/50 to-transparent
                                  px-1.5 pb-1 pt-3">
                    <div className="flex items-center gap-0.5 justify-end">
                      <MapPin size={7} className="text-white/80" />
                      <span className="text-[9px] font-medium text-white/90 truncate">
                        {group.key}
                      </span>
                      {group.cityCount > 1 && (
                        <span className="text-[8px] text-white/60">
                          ·{group.cityCount}
                        </span>
                      )}
                    </div>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>

            {/* Scroll sentinel */}
            <div ref={endRef} className="shrink-0 w-px" />
          </div>
        </div>

        {/* Fixed tail: drawing indicator or completion card */}
        <div className="shrink-0">
          <AnimatePresence mode="wait">
            {revealedCount > 0 && revealedCount < total && (
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
            {revealedCount >= total && (
              <motion.div
                key="done"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.3, type: "spring", stiffness: 300, damping: 25 }}
              >
                <div className="bg-white/80 backdrop-blur-md rounded-[14px] px-3 py-2
                                shadow-[0_2px_12px_rgba(0,0,0,0.04)] text-center">
                  <span className="font-playful text-[11px] text-[var(--text-primary)]">
                    出发!
                  </span>
                  <span className="block text-[8px] text-[var(--text-secondary)] mt-0.5">
                    共 {routePath?.length ?? 0} 站
                  </span>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
