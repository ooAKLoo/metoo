import { motion } from "motion/react";
import { useFavoriteStore } from "../stores/useFavoriteStore";

export function StatusBar() {
  const { status, error, progress } = useFavoriteStore();

  if (status === "idle") return null;

  const pct = progress.total > 0
    ? Math.round((progress.current / progress.total) * 100)
    : 0;

  return (
    <div className="h-[32px] px-4 flex items-center gap-3 bg-panel shrink-0">
      {status === "fetching" && (
        <>
          <div className="flex-1 h-[4px] bg-card rounded-full overflow-hidden">
            <motion.div
              className="h-full bg-[var(--accent-yellow)] rounded-full"
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

      {status === "done" && (
        <span className="text-[10px] text-[var(--accent-green)]">
          抓取完成 · {progress.total} 条视频
        </span>
      )}

      {status === "error" && (
        <span className="text-[10px] text-[var(--accent-pink)] truncate">
          {error}
        </span>
      )}
    </div>
  );
}
