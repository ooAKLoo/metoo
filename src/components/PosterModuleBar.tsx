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
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 20 }}
          transition={{ type: "spring", stiffness: 400, damping: 30 }}
          className="absolute bottom-3 left-1/2 -translate-x-1/2 z-20
                     flex items-center gap-2 px-2.5 py-2
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
                           w-[72px] h-[52px] rounded-xl cursor-pointer
                           transition-colors duration-200
                           ${isActive
                             ? "bg-neutral-900 text-white shadow-sm"
                             : "bg-neutral-50 hover:bg-neutral-100 text-neutral-600"
                           }`}
              >
                {getPosterDoodleIcon(mod.id) ? (
                  <svg
                    viewBox="0 0 40 40"
                    className="w-5 h-5"
                    style={{ overflow: "visible" }}
                    dangerouslySetInnerHTML={{ __html: getPosterDoodleIcon(mod.id)! }}
                  />
                ) : (
                  <span className="text-lg leading-none">{mod.thumbnail}</span>
                )}
                <span className="text-[9px] mt-0.5 font-medium tracking-wide whitespace-nowrap">
                  {mod.name}
                </span>
              </motion.button>
            );
          })}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
