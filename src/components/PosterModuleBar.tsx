import { motion, AnimatePresence } from "motion/react";
import { useMapStore } from "../stores/useMapStore";
import { useFavoriteStore } from "../stores/useFavoriteStore";
import { posterModules } from "../lib/poster-modules";
import { getPosterDoodleIcon } from "../lib/poster-doodle-icons";

export function PosterModuleBar() {
  const chartView = useMapStore((s) => s.chartView);
  const activePosterModule = useMapStore((s) => s.activePosterModule);
  const setActivePosterModule = useMapStore((s) => s.setActivePosterModule);
  const status = useFavoriteStore((s) => s.status);
  const items = useFavoriteStore((s) => s.items);

  const visible = chartView === "map" && status === "done" && items.length > 0;

  return (
    <AnimatePresence>
      {visible && (
        <div className="absolute bottom-3 left-3 right-3 z-20 flex justify-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            transition={{ type: "spring", stiffness: 400, damping: 30 }}
            className="flex items-center gap-[clamp(4px,0.8vw,8px)] px-[clamp(6px,1vw,10px)] py-2
                       bg-white/80 backdrop-blur-xl
                       rounded-2xl shadow-[0_2px_16px_rgba(0,0,0,0.06)]
                       border border-white/60"
          >
            {posterModules.map((mod) => {
              const isActive = activePosterModule === mod.id;
              return (
                <motion.button
                  key={mod.id}
                  whileHover={{ y: -2 }}
                  whileTap={{ scale: 0.97 }}
                  onClick={() =>
                    setActivePosterModule(isActive ? null : mod.id)
                  }
                  className={`relative flex flex-col items-center justify-center
                             min-w-0 w-[clamp(48px,6vw,72px)] h-[clamp(36px,4.5vw,52px)] rounded-xl cursor-pointer
                             transition-colors duration-200
                             ${isActive
                               ? "bg-neutral-900 text-white shadow-sm"
                               : "bg-neutral-50 hover:bg-neutral-100 text-neutral-600"
                             }`}
                >
                  {getPosterDoodleIcon(mod.id) ? (
                    <svg
                      viewBox="0 0 40 40"
                      className="w-[clamp(14px,1.6vw,20px)] h-[clamp(14px,1.6vw,20px)]"
                      style={{ overflow: "visible" }}
                      dangerouslySetInnerHTML={{ __html: getPosterDoodleIcon(mod.id)! }}
                    />
                  ) : (
                    <span className="text-[clamp(12px,1.4vw,18px)] leading-none">{mod.thumbnail}</span>
                  )}
                  <span className="text-[clamp(7px,0.8vw,9px)] mt-0.5 font-medium tracking-wide whitespace-nowrap">
                    {mod.name}
                  </span>
                </motion.button>
              );
            })}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
