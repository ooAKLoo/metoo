import { useEffect, useState, useCallback } from "react";
import { motion } from "motion/react";
import { Trash2 } from "lucide-react";
import { useFavoriteStore, type SavedListEntry } from "../stores/useFavoriteStore";
import { ConfirmDialog } from "./ConfirmDialog";

export function CollectionTabs() {
  const { savedLists, loadSavedLists, loadList, deleteList, mediaId: activeId } =
    useFavoriteStore();

  const [pendingDelete, setPendingDelete] = useState<SavedListEntry | null>(null);

  useEffect(() => { loadSavedLists(); }, [loadSavedLists]);

  const confirmDelete = useCallback(() => {
    if (!pendingDelete) return;
    deleteList(pendingDelete.media_id);
    setPendingDelete(null);
  }, [pendingDelete, deleteList]);

  if (savedLists.length === 0) return null;

  return (
    <>
      <div className="absolute top-0 left-0 right-0 z-20">
        <div className="-m-4">
          <div className="flex gap-1.5 items-center overflow-x-auto scrollbar-hide pl-7 pr-7 pt-7 pb-5">
            {savedLists.map((entry) => {
              const isActive = activeId === entry.media_id;
              return (
                <motion.button
                  key={entry.media_id}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  whileTap={{ scale: 0.97 }}
                  onClick={() => { if (!isActive) loadList(entry.media_id); }}
                  className={`group shrink-0 flex items-center gap-2 px-3 py-2 rounded-xl
                    text-[11px] font-medium backdrop-blur-xl transition-colors
                    ${isActive
                      ? "bg-white/95 text-[var(--text-primary)] shadow-[0_2px_12px_rgba(0,0,0,0.08)]"
                      : "bg-white/60 text-[var(--text-secondary)] hover:bg-white/80 shadow-[0_1px_6px_rgba(0,0,0,0.04)]"
                    }`}
                >
                  <span className="truncate max-w-[120px]">
                    {entry.title || `收藏夹 ${entry.media_id}`}
                  </span>
                  <span className={`text-[9px] ${isActive ? "text-[var(--accent-cyan)]" : "text-[var(--text-secondary)]"}`}>
                    {entry.count}
                  </span>
                  <motion.span
                    whileTap={{ scale: 0.85 }}
                    onClick={(e) => { e.stopPropagation(); setPendingDelete(entry); }}
                    className="opacity-0 group-hover:opacity-100 p-0.5 rounded-md
                               hover:bg-[var(--accent-pink)]/10 transition-opacity"
                  >
                    <Trash2 size={10} className="text-[var(--accent-pink)]" />
                  </motion.span>
                </motion.button>
              );
            })}
          </div>
        </div>
      </div>

      <ConfirmDialog
        open={!!pendingDelete}
        title="删除收藏夹"
        description={
          pendingDelete
            ? `确定删除「${pendingDelete.title || pendingDelete.media_id}」？\n共 ${pendingDelete.count} 条记录，删除后不可恢复。`
            : ""
        }
        confirmLabel="删除"
        onConfirm={confirmDelete}
        onCancel={() => setPendingDelete(null)}
      />
    </>
  );
}
