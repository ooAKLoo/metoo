import { useMemo } from "react";
import { motion, AnimatePresence } from "motion/react";
import { X, MapPin } from "lucide-react";
import { convertFileSrc } from "@tauri-apps/api/core";
import { useFavoriteStore, type FavoriteItem } from "../stores/useFavoriteStore";
import { useMapStore } from "../stores/useMapStore";
import { useCityAggregation } from "../hooks/useCityAggregation";

function coverSrc(cover: string) {
  if (!cover) return "";
  if (cover.startsWith("/")) return convertFileSrc(cover);
  if (cover.startsWith("//")) return `https:${cover}`;
  return cover;
}

function CityItemCard({ item }: { item: FavoriteItem }) {
  const isXhs = item.source === "xiaohongshu";
  const src = coverSrc(item.cover);

  return (
    <div
      className="relative shrink-0 w-[120px] h-[72px] rounded-[12px] overflow-hidden
                 shadow-[0_2px_12px_rgba(0,0,0,0.08)] cursor-pointer"
      onClick={() => {
        const url = isXhs
          ? `https://www.xiaohongshu.com/explore/${item.bvid}`
          : `https://www.bilibili.com/video/${item.bvid}`;
        window.open(url, "_blank");
      }}
    >
      <div className="absolute inset-0 bg-[#f0f0f2]">
        {src && (
          <img
            src={src}
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
        <p className="text-[9px] font-medium text-white/90 line-clamp-1">
          {item.title}
        </p>
      </div>
    </div>
  );
}

export function CityDetailBar() {
  const items = useFavoriteStore((s) => s.items);
  const selectedCity = useMapStore((s) => s.selectedCity);
  const clearCityFilter = useMapStore((s) => s.clearCityFilter);
  const { entries } = useCityAggregation();

  const cityEntry = useMemo(
    () => entries.find((e) => e.name === selectedCity),
    [entries, selectedCity],
  );

  const cityItems = useMemo(() => {
    if (!selectedCity) return [];
    return items.filter((item) =>
      item.locations.some((loc) => loc.name === selectedCity),
    );
  }, [items, selectedCity]);

  return (
    <AnimatePresence>
      {selectedCity && cityItems.length > 0 && (
        <motion.div
          key="city-detail-bar"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 20 }}
          transition={{ type: "spring", stiffness: 400, damping: 30 }}
          className="absolute bottom-3 inset-x-0 z-10 pointer-events-none
                     flex flex-col items-center"
        >
          {/* City info label — top-left of the strip */}
          <div className="w-full max-w-[85%] mb-1.5 pointer-events-auto">
            <div className="inline-flex items-center gap-1.5
                            bg-white/90 backdrop-blur-md rounded-lg
                            shadow-[0_2px_8px_rgba(0,0,0,0.06)]
                            pl-1.5 pr-2 py-1">
              {cityEntry && cityEntry.covers.length > 0 && (
                <div className="w-5 h-5 rounded-full overflow-hidden shrink-0 border border-neutral-200">
                  <img
                    src={coverSrc(cityEntry.covers[0])}
                    alt=""
                    referrerPolicy="no-referrer"
                    crossOrigin="anonymous"
                    className="w-full h-full object-cover"
                  />
                </div>
              )}
              <MapPin size={8} className="text-neutral-400 shrink-0" />
              <span className="text-[11px] font-medium text-neutral-800">
                {selectedCity}
              </span>
              <span className="text-[9px] text-neutral-400">
                {cityItems.length} 条
              </span>
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
          </div>

          {/* Scrollable item strip — centered, same width as RouteStopList */}
          <div className="pointer-events-auto max-w-[85%]">
            <div className="overflow-x-auto overflow-y-hidden scrollbar-hide">
              <div className="flex gap-1.5">
                {cityItems.map((item) => (
                  <CityItemCard key={item.id} item={item} />
                ))}
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
