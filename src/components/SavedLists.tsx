import { useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Bookmark, Trash2, FolderOpen } from "lucide-react";
import { useFavoriteStore } from "../stores/useFavoriteStore";

export function SavedLists() {
  const { savedLists, loadSavedLists, loadList, deleteList, mediaId: activeId } =
    useFavoriteStore();

  useEffect(() => {
    loadSavedLists();
  }, [loadSavedLists]);

  if (savedLists.length === 0) return null;

  return (
    <div className="px-3 py-2 shrink-0">
      <div className="flex items-center gap-1.5 mb-2 px-1">
        <Bookmark size={12} className="text-[var(--accent-cyan)]" />
        <span className="text-[9px] font-medium text-secondary uppercase tracking-wide">
          已保存的收藏夹
        </span>
      </div>
      <div className="space-y-1">
        <AnimatePresence mode="popLayout">
          {savedLists.map((entry) => {
            const isActive = activeId === entry.media_id;
            return (
              <motion.div
                key={entry.media_id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.2, ease: "easeOut" }}
                className={`flex items-center gap-2 px-2.5 py-2 rounded-xl cursor-pointer group transition-colors
                  ${isActive
                    ? "bg-[var(--accent-cyan)]/8 ring-1 ring-[var(--accent-cyan)]/30"
                    : "bg-panel hover:bg-card"
                  }`}
                onClick={() => {
                  if (!isActive) loadList(entry.media_id);
                }}
              >
                <FolderOpen
                  size={14}
                  className={isActive ? "text-[var(--accent-cyan)]" : "text-secondary"}
                />
                <div className="flex-1 min-w-0">
                  <div className="text-[11px] font-medium text-primary truncate">
                    {entry.title || `收藏夹 ${entry.media_id}`}
                  </div>
                  <div className="text-[9px] text-secondary">
                    {entry.count} 条 · {entry.saved_at}
                  </div>
                </div>
                <motion.button
                  whileTap={{ scale: 0.85 }}
                  onClick={(e) => {
                    e.stopPropagation();
                    deleteList(entry.media_id);
                  }}
                  className="opacity-0 group-hover:opacity-100 p-1 rounded-lg
                             hover:bg-[var(--accent-pink)]/10 transition-opacity"
                >
                  <Trash2 size={12} className="text-[var(--accent-pink)]" />
                </motion.button>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </div>
  );
}
