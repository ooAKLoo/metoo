import { motion } from "motion/react";
import { Utensils, X } from "lucide-react";
import { useFavoriteStore } from "../stores/useFavoriteStore";
import { useMapStore } from "../stores/useMapStore";
import { useTagExtraction } from "../hooks/useTagExtraction";
import { useCityAggregation } from "../hooks/useCityAggregation";

export function FloatingCards() {
  const { items, status } = useFavoriteStore();
  const selectedTag = useMapStore((s) => s.selectedTag);
  const setSelectedTag = useMapStore((s) => s.setSelectedTag);
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

  if (status !== "done" || items.length === 0) return null;

  const hasTags = tags.length > 0 || entries.length >= 2;
  if (!hasTags) return null;

  return (
    <div className="absolute bottom-0 left-0 right-0 z-10 pointer-events-none">
      <div className="pointer-events-auto px-3 pb-3">
        <div
          className="mx-auto max-w-[560px]
                     bg-panel/85 backdrop-blur-xl
                     border border-[var(--border-color)]/30
                     shadow-[0_-2px_20px_rgba(0,0,0,0.06)]
                     rounded-2xl"
        >
          <div className="flex items-center gap-2 px-3 py-2">
            {/* "吃一遍" button */}
            {entries.length >= 2 && (
              <motion.button
                whileTap={{ scale: 0.92 }}
                onClick={handleEatAll}
                className={`shrink-0 flex items-center gap-1 pl-2 pr-2.5 py-1 rounded-full
                  text-[10px] whitespace-nowrap transition-all duration-300 cursor-pointer
                  ${routePath
                    ? "bg-[var(--text-primary)] text-white shadow-[0_1px_6px_rgba(0,0,0,0.12)]"
                    : "bg-gradient-to-r from-[#ff6b6b] to-[#ee5a24] text-white shadow-[0_2px_10px_rgba(238,90,36,0.25)]"
                  }`}
              >
                {routePath ? (
                  <X size={10} strokeWidth={2.5} />
                ) : (
                  <Utensils size={10} />
                )}
                <span className="font-playful text-[11px] tracking-wide">
                  {routePath ? "清除" : "吃一遍"}
                </span>
              </motion.button>
            )}

            {/* Tag pills */}
            <div className="flex gap-1 overflow-x-auto scrollbar-hide flex-1 min-w-0">
              {tags.map((tag) => {
                const isActive = selectedTag === tag.category;
                return (
                  <motion.button
                    key={tag.category}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => setSelectedTag(isActive ? null : tag.category)}
                    className={`shrink-0 flex items-center gap-0.5 px-2 py-1 rounded-lg text-[9px] font-medium
                      whitespace-nowrap transition-colors cursor-pointer
                      ${isActive
                        ? "bg-[var(--accent-pink)] text-white"
                        : "bg-[var(--bg-card)]/80 text-[var(--text-secondary)] hover:bg-[var(--bg-card)]"
                      }`}
                  >
                    <span className="text-[10px]">{tag.emoji}</span>
                    {tag.category}
                    <span className={`text-[8px] ${isActive ? "text-white/70" : "text-[var(--text-secondary)]/60"}`}>
                      {tag.count}
                    </span>
                  </motion.button>
                );
              })}
            </div>

            {/* Summary */}
            <span className="shrink-0 text-[9px] text-secondary tabular-nums">
              {entries.length} 城 · {items.length} 条
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
