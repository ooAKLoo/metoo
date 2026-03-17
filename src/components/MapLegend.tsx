import { useMemo } from "react";
import { motion } from "motion/react";
import { useTagExtraction } from "../hooks/useTagExtraction";
import { useCityAggregation } from "../hooks/useCityAggregation";
import { getCategoryColor } from "../lib/category-colors";

export function MapLegend() {
  const tags = useTagExtraction();
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
      className="absolute bottom-5 left-5 z-[4] pointer-events-none
                 flex flex-col gap-[3px]"
    >
      {/* Category rows */}
      {tags.map((tag, i) => (
        <motion.div
          key={tag.category}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: i * 0.025, duration: 0.3 }}
          className="flex items-center gap-1.5"
        >
          <span
            className="w-[5px] h-[5px] rounded-full shrink-0"
            style={{ backgroundColor: getCategoryColor(tag.category) }}
          />
          <span className="text-[8px] leading-none shrink-0 opacity-80">
            {tag.emoji}
          </span>
          <span className="text-[8px] text-[var(--text-secondary)] leading-none">
            {tag.category}
          </span>
          <span className="text-[8px] text-[var(--text-secondary)] tabular-nums leading-none opacity-50">
            {tag.count}
          </span>
        </motion.div>
      ))}

      {/* Footer stats */}
      <div className="mt-0.5">
        <span className="text-[7px] text-[var(--text-secondary)] opacity-40 tracking-wide">
          {cities.length} 城 · {totalItems} 条
        </span>
      </div>
    </motion.div>
  );
}
