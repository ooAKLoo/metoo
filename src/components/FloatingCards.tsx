import { useMemo } from "react";
import { motion, AnimatePresence } from "motion/react";
import { MapPin, Heart, Utensils, X } from "lucide-react";
import { convertFileSrc } from "@tauri-apps/api/core";
import { useFavoriteStore } from "../stores/useFavoriteStore";
import { useMapStore } from "../stores/useMapStore";
import { useTagExtraction, titleMatchesTag } from "../hooks/useTagExtraction";
import { useCityAggregation } from "../hooks/useCityAggregation";

function coverSrc(cover: string) {
  if (!cover) return "";
  if (cover.startsWith("/")) return convertFileSrc(cover);
  if (cover.startsWith("//")) return `https:${cover}`;
  return cover;
}

export function FloatingCards() {
  const { items, status } = useFavoriteStore();
  const selectedCity = useMapStore((s) => s.selectedCity);
  const selectedTag = useMapStore((s) => s.selectedTag);
  const setSelectedTag = useMapStore((s) => s.setSelectedTag);
  const viewMode = useMapStore((s) => s.viewMode);
  const selectedItemId = useMapStore((s) => s.selectedItemId);
  const setSelectedItem = useMapStore((s) => s.setSelectedItem);
  const routePath = useMapStore((s) => s.routePath);
  const generateRoute = useMapStore((s) => s.generateRoute);
  const clearRoute = useMapStore((s) => s.clearRoute);
  const tags = useTagExtraction();
  const { entries } = useCityAggregation();

  const handleEatAll = () => {
    if (routePath) {
      clearRoute();
    } else {
      generateRoute(entries.map((e) => ({ name: e.name, coord: e.coord })));
    }
  };

  const filteredItems = useMemo(() => {
    let result = items;
    if (viewMode === "city" && selectedCity) {
      result = result.filter((item) =>
        item.locations.some((loc) => loc.name === selectedCity)
      );
    }
    if (selectedTag) {
      result = result.filter((item) => titleMatchesTag(item.title, selectedTag));
    }
    return result;
  }, [items, viewMode, selectedCity, selectedTag]);

  if (status !== "done" || items.length === 0) return null;

  return (
    <div className="absolute bottom-0 left-0 right-0 z-10 pointer-events-none">
      {/* Tag pills floating row */}
      {(tags.length > 0 || entries.length >= 2) && (
        <div className="pointer-events-auto -mx-3">
          <div className="flex gap-1.5 overflow-x-auto scrollbar-hide px-7 py-3">
            {entries.length >= 2 && (
              <motion.button
                whileTap={{ scale: 0.92 }}
                whileHover={{ scale: 1.04 }}
                onClick={handleEatAll}
                className={`shrink-0 flex items-center gap-1.5 pl-2 pr-3 py-1.5 rounded-full
                  whitespace-nowrap transition-all duration-300
                  ${routePath
                    ? "bg-[var(--text-primary)] text-white shadow-[0_2px_12px_rgba(0,0,0,0.15)]"
                    : "bg-gradient-to-r from-[#ff6b6b] to-[#ee5a24] text-white shadow-[0_3px_16px_rgba(238,90,36,0.3)]"
                  }`}
              >
                {routePath ? (
                  <X size={11} strokeWidth={2.5} />
                ) : (
                  <Utensils size={11} />
                )}
                <span className="font-playful text-[12px] tracking-wide">
                  {routePath ? "清除路线" : "吃一遍"}
                </span>
              </motion.button>
            )}
            {tags.map((tag) => {
              const isActive = selectedTag === tag.category;
              return (
                <motion.button
                  key={tag.category}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setSelectedTag(isActive ? null : tag.category)}
                  className={`shrink-0 flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-[10px] font-medium
                    whitespace-nowrap backdrop-blur-xl transition-colors
                    shadow-[0_2px_8px_rgba(0,0,0,0.06)]
                    ${isActive
                      ? "bg-[var(--accent-pink)] text-white"
                      : "bg-white/80 text-[var(--text-secondary)] hover:bg-white/95"
                    }`}
                >
                  <span className="text-[11px]">{tag.emoji}</span>
                  {tag.category}
                  <span className={`text-[8px] ${isActive ? "text-white/70" : "text-[var(--text-secondary)]"}`}>
                    {tag.count}
                  </span>
                </motion.button>
              );
            })}
          </div>
        </div>
      )}

      {/* Floating cards row — large padding to fully contain card shadows */}
      <div className="pointer-events-auto -m-6">
        <div className="flex gap-3.5 overflow-x-auto scrollbar-hide px-10 pt-8 pb-10">
          <AnimatePresence mode="popLayout">
            {filteredItems.map((item, i) => {
              const isSelected = selectedItemId === item.id;
              const isXhs = item.source === "xiaohongshu";
              const cover = coverSrc(item.cover);

              return (
                <motion.div
                  key={item.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 20 }}
                  transition={{ delay: Math.min(i * 0.03, 0.3), duration: 0.25, ease: "easeOut" }}
                  whileHover={{ y: -2 }}
                  whileTap={{ scale: 0.97 }}
                  onClick={() => setSelectedItem(isSelected ? null : item.id)}
                  className={`shrink-0 w-[172px] rounded-[18px] cursor-pointer
                    transition-shadow duration-300
                    ${isSelected
                      ? "bg-white ring-[1.5px] ring-[var(--accent-cyan)] shadow-[0_8px_40px_rgba(0,0,0,0.10)]"
                      : "bg-white shadow-[0_2px_16px_rgba(0,0,0,0.06)] hover:shadow-[0_8px_40px_rgba(0,0,0,0.10)]"
                    }`}
                >
                  {/* Cover image — inset with rounded corners */}
                  <div className="p-1.5 pb-0">
                    <div className="w-full h-[108px] rounded-[13px] overflow-hidden bg-[#f5f5f7] relative">
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
                  </div>

                  {/* Content */}
                  <div className="px-3 pt-2 pb-2.5 space-y-1.5">
                    <div className="text-[11px] font-medium text-[var(--text-primary)] leading-snug line-clamp-2">
                      {item.title}
                    </div>
                    <div className="flex items-center gap-1.5">
                      {item.locations.length > 0 ? (
                        <span className="inline-flex items-center gap-0.5
                                         text-[9px] text-[var(--text-secondary)]">
                          <MapPin size={8} className="text-[var(--accent-pink)]" />
                          {item.locations[0].name}
                        </span>
                      ) : (
                        <span className="text-[9px] text-[var(--text-secondary)]/50">未识别地点</span>
                      )}
                      {isXhs && item.likes && (
                        <span className="text-[9px] text-[var(--text-secondary)] flex items-center gap-0.5 ml-auto">
                          <Heart size={8} className="text-[#fe2c55]/60" />
                          {item.likes}
                        </span>
                      )}
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
