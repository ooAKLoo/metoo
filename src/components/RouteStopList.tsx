import { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { MapPin } from "lucide-react";
import { convertFileSrc } from "@tauri-apps/api/core";
import { useMapStore } from "../stores/useMapStore";
import { useCityAggregation } from "../hooks/useCityAggregation";

function coverSrc(cover: string) {
  if (!cover) return "";
  if (cover.startsWith("/")) return convertFileSrc(cover);
  if (cover.startsWith("//")) return `https:${cover}`;
  return cover;
}

export function RouteStopList() {
  const routePath = useMapStore((s) => s.routePath);
  const { entries } = useCityAggregation();
  const [revealedCount, setRevealedCount] = useState(0);

  // Build a lookup: city name → cover
  const cityCovers = useMemo(() => {
    const map = new Map<string, string>();
    for (const e of entries) {
      if (e.covers.length > 0) {
        map.set(e.name, coverSrc(e.covers[0]));
      }
    }
    return map;
  }, [entries]);

  // Sync with MapView's 600ms progressive reveal
  useEffect(() => {
    if (!routePath || routePath.length === 0) {
      setRevealedCount(0);
      return;
    }
    setRevealedCount(0);
    let current = 0;
    const timer = setInterval(() => {
      current++;
      setRevealedCount(current);
      if (current >= routePath.length) clearInterval(timer);
    }, 600);
    return () => clearInterval(timer);
  }, [routePath]);

  if (!routePath || routePath.length === 0) return null;

  const visibleStops = routePath.slice(0, revealedCount);
  const total = routePath.length;

  return (
    <div className="absolute right-4 top-16 bottom-28 z-10 w-[156px]
                    pointer-events-none flex flex-col">
      {/* Header */}
      <AnimatePresence>
        {revealedCount > 0 && (
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            transition={{ type: "spring", stiffness: 400, damping: 30 }}
            className="mb-2 pointer-events-auto"
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

      {/* Stop list */}
      <div className="flex-1 min-h-0 overflow-y-auto scrollbar-hide pointer-events-auto">
        <div className="flex flex-col gap-1.5">
          <AnimatePresence>
            {visibleStops.map((stop, i) => {
              const cover = cityCovers.get(stop.name) || "";
              return (
                <motion.div
                  key={`${stop.name}-${i}`}
                  initial={{ opacity: 0, x: 30, scale: 0.92 }}
                  animate={{ opacity: 1, x: 0, scale: 1 }}
                  exit={{ opacity: 0, x: 30, scale: 0.92 }}
                  transition={{
                    type: "spring",
                    stiffness: 350,
                    damping: 25,
                    mass: 0.8,
                  }}
                  className="relative rounded-[14px] overflow-hidden
                             shadow-[0_2px_12px_rgba(0,0,0,0.08)]"
                >
                  {/* Cover image */}
                  <div className="w-full h-[80px] bg-[#f0f0f2]">
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

                  {/* Number badge — top left */}
                  <div
                    className="absolute top-1.5 left-1.5 w-[22px] h-[22px] rounded-full
                               flex items-center justify-center
                               text-white font-playful text-[10px]
                               shadow-[0_2px_6px_rgba(0,0,0,0.2)]"
                    style={{
                      background: "linear-gradient(135deg, #ff6b6b, #ee5a24)",
                    }}
                  >
                    {i + 1}
                  </div>

                  {/* City name — bottom right overlay */}
                  <div className="absolute bottom-0 inset-x-0
                                  bg-gradient-to-t from-black/50 to-transparent
                                  px-2 pb-1.5 pt-4">
                    <div className="flex items-center gap-0.5 justify-end">
                      <MapPin size={8} className="text-white/80" />
                      <span className="text-[10px] font-medium text-white/90 truncate">
                        {stop.name}
                      </span>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>

          {/* "Drawing..." indicator */}
          <AnimatePresence>
            {revealedCount > 0 && revealedCount < total && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex items-center justify-center py-2"
              >
                <motion.div
                  animate={{ scale: [1, 1.3, 1] }}
                  transition={{ repeat: Infinity, duration: 1.2 }}
                  className="w-[6px] h-[6px] rounded-full bg-[#ee5a24]/40"
                />
                <span className="text-[10px] text-[var(--text-secondary)] ml-2">
                  规划中...
                </span>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Completion */}
          <AnimatePresence>
            {revealedCount >= total && (
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3, type: "spring", stiffness: 300, damping: 25 }}
              >
                <div className="bg-white/80 backdrop-blur-md rounded-[14px] px-3 py-2
                                shadow-[0_2px_12px_rgba(0,0,0,0.04)] text-center">
                  <span className="font-playful text-[12px] text-[var(--text-primary)]">
                    出发!
                  </span>
                  <span className="block text-[9px] text-[var(--text-secondary)] mt-0.5">
                    共 {total} 站
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
