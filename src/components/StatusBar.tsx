import { motion, AnimatePresence } from "motion/react";
import { useFavoriteStore } from "../stores/useFavoriteStore";

export function StatusBar() {
  const { status, error, progress } = useFavoriteStore();

  const pct = progress.total > 0
    ? Math.round((progress.current / progress.total) * 100)
    : 0;

  const show = status === "fetching" || status === "error";

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 10 }}
          transition={{ type: "spring", stiffness: 400, damping: 30 }}
          className="absolute bottom-4 left-1/2 -translate-x-1/2 z-30
                     bg-[var(--bg-panel)]/95 backdrop-blur-lg rounded-full
                     shadow-[0_4px_20px_rgba(0,0,0,0.08)]
                     px-4 py-2 flex items-center gap-3 min-w-[200px]"
        >
          {status === "fetching" && (
            <>
              <div className="flex-1 h-[3px] bg-card rounded-full overflow-hidden min-w-[100px]">
                <motion.div
                  className="h-full bg-[var(--accent-cyan)] rounded-full"
                  initial={{ width: 0 }}
                  animate={{ width: `${pct}%` }}
                  transition={{ type: "spring", stiffness: 300, damping: 30 }}
                />
              </div>
              <span className="text-[10px] text-secondary tabular-nums shrink-0">
                {progress.current}/{progress.total}
              </span>
            </>
          )}

          {status === "error" && (
            <span className="text-[10px] text-[var(--accent-pink)] truncate">
              {error}
            </span>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
