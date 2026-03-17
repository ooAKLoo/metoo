import { motion } from "motion/react";
import { Utensils, X } from "lucide-react";
import { useFavoriteStore } from "../stores/useFavoriteStore";
import { useMapStore } from "../stores/useMapStore";
import { useCityAggregation } from "../hooks/useCityAggregation";

export function FloatingCards() {
  const { items, status } = useFavoriteStore();
  const routePath = useMapStore((s) => s.routePath);
  const generateRoute = useMapStore((s) => s.generateRoute);
  const clearRoute = useMapStore((s) => s.clearRoute);
  const { entries } = useCityAggregation();

  const handleEatAll = () => {
    if (routePath) {
      clearRoute();
    } else {
      generateRoute(entries.map((e) => ({ name: e.name, coord: e.coord })));
    }
  };

  if (status !== "done" || items.length === 0) return null;
  if (entries.length < 2) return null;

  return (
    <div className="shrink-0 pt-2 pb-1">
      <div className="flex justify-center">
        <motion.button
          whileTap={{ scale: 0.92 }}
          onClick={handleEatAll}
          className={`flex items-center gap-1 pl-2 pr-2.5 py-1 rounded-full
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
      </div>
    </div>
  );
}
