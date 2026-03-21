import { useMemo } from "react";
import { motion } from "motion/react";
import { useTagExtraction } from "../hooks/useTagExtraction";
import { useCityAggregation } from "../hooks/useCityAggregation";
import { getCategoryColor } from "../lib/category-colors";
import { FoodDoodleIcon, hasFoodDoodle } from "./FoodDoodleIcon";
import type { FavoriteItem } from "../stores/useFavoriteStore";

interface MapLegendProps {
  columns?: 1 | 2;
  items?: FavoriteItem[];
}

export function MapLegend({ columns = 1, items }: MapLegendProps = {}) {
  const tags = useTagExtraction(items);
  const { entries: cities } = useCityAggregation();

  const totalItems = useMemo(
    () => tags.reduce((sum, t) => sum + t.count, 0),
    [tags],
  );

  if (tags.length === 0) return null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.4, ease: "easeOut" }}
      className="absolute bottom-5 left-5 z-[4] pointer-events-none"
    >
      {/* Category rows */}
      <div
        className={columns === 2
          ? "grid grid-cols-2 gap-x-4 gap-y-[3px]"
          : "flex flex-col gap-[3px]"
        }
      >
        {tags.map((tag, i) => (
          <motion.div
            key={tag.category}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: i * 0.025, duration: 0.3 }}
            className="flex items-center gap-1.5"
          >
            <span className="shrink-0 opacity-80 flex items-center">
              {hasFoodDoodle(tag.category) ? (
                <FoodDoodleIcon
                  category={tag.category}
                  size={12}
                  color={getCategoryColor(tag.category)}
                  seed={tag.category.charCodeAt(0) * 7 + tag.category.length}
                />
              ) : (
                <span className="text-[8px] leading-none">{tag.emoji}</span>
              )}
            </span>
            <span className="text-[8px] text-[var(--text-secondary)] leading-none">
              {tag.category}
            </span>
            <span className="text-[8px] text-[var(--text-secondary)] tabular-nums leading-none opacity-50">
              {tag.count}
            </span>
          </motion.div>
        ))}
      </div>

      {/* Footer stats */}
      <div className="mt-0.5">
        <span className="text-[7px] text-[var(--text-secondary)] opacity-40 tracking-wide">
          {cities.length} 城 · {totalItems} 条
        </span>
      </div>
    </motion.div>
  );
}
