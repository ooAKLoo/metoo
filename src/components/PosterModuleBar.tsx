import { motion, AnimatePresence } from "motion/react";
import { useMapStore } from "../stores/useMapStore";
import { useFavoriteStore } from "../stores/useFavoriteStore";
import { posterModules } from "../lib/poster-modules";
import { getPosterDoodleIcon } from "../lib/poster-doodle-icons";

export function PosterModuleBar({ open }: { open: boolean }) {
  const chartView = useMapStore((s) => s.chartView);
  const activePosterModule = useMapStore((s) => s.activePosterModule);
  const setActivePosterModule = useMapStore((s) => s.setActivePosterModule);
  const status = useFavoriteStore((s) => s.status);
  const items = useFavoriteStore((s) => s.items);

  const visible = open && chartView === "map" && status === "done" && items.length > 0;

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0, x: -12 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -12 }}
          transition={{ duration: 0.18, ease: "easeOut" }}
          className="flex items-center gap-0.5"
        >
          {posterModules.map((mod) => {
            const isActive = activePosterModule === mod.id;
            return (
              <motion.button
                key={mod.id}
                whileTap={{ scale: 0.95 }}
                onClick={() =>
                  setActivePosterModule(isActive ? null : mod.id)
                }
                className={`flex items-center gap-1 px-1.5 py-1 rounded-lg
                           text-[9px] font-medium cursor-pointer
                           transition-colors duration-200
                           ${isActive
                             ? "bg-neutral-800 text-white"
                             : "text-neutral-400 hover:text-neutral-600"
                           }`}
              >
                {getPosterDoodleIcon(mod.id) ? (
                  <svg
                    viewBox="0 0 40 40"
                    className="w-3 h-3 shrink-0"
                    style={{ overflow: "visible" }}
                    dangerouslySetInnerHTML={{ __html: getPosterDoodleIcon(mod.id)! }}
                  />
                ) : (
                  <span className="text-[11px] leading-none shrink-0">{mod.thumbnail}</span>
                )}
                <span className="whitespace-nowrap">{mod.name}</span>
              </motion.button>
            );
          })}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
