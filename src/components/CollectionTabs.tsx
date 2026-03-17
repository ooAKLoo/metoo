import { useEffect, useState, useCallback, useMemo } from "react";
import { motion, AnimatePresence } from "motion/react";
import { ChevronRight, Trash2, Merge, Check, X } from "lucide-react";
import { convertFileSrc } from "@tauri-apps/api/core";
import { useFavoriteStore, type SavedListEntry } from "../stores/useFavoriteStore";
import { ConfirmDialog } from "./ConfirmDialog";

function coverSrc(cover: string) {
  if (!cover) return "";
  if (cover.startsWith("/")) return convertFileSrc(cover);
  if (cover.startsWith("//")) return `https:${cover}`;
  return cover;
}

function CollectionCard({
  entry,
  isActive,
  covers,
  titles,
  onSelect,
  onDelete,
  mergeMode,
  isSelected,
  onToggleSelect,
}: {
  entry: SavedListEntry;
  isActive: boolean;
  covers: string[];
  titles: string[];
  onSelect: () => void;
  onDelete: () => void;
  mergeMode: boolean;
  isSelected: boolean;
  onToggleSelect: () => void;
}) {
  const previewCovers = covers.slice(0, 3);
  const previewTitles = titles.slice(0, 3);

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className={`group rounded-2xl p-3 cursor-pointer transition-colors
        ${mergeMode && isSelected
          ? "bg-neutral-100 ring-2 ring-neutral-800 ring-offset-1"
          : isActive
            ? "bg-neutral-100"
            : "hover:bg-neutral-50"
        }`}
      onClick={mergeMode ? onToggleSelect : onSelect}
    >
      {/* Header: title + count */}
      <div className="flex items-center justify-between mb-2">
        {/* Merge checkbox */}
        {mergeMode && (
          <div
            className={`w-4 h-4 rounded-md shrink-0 mr-2 flex items-center justify-center
              transition-colors duration-150
              ${isSelected ? "bg-neutral-800" : "bg-neutral-200"}`}
          >
            {isSelected && <Check size={10} className="text-white" strokeWidth={3} />}
          </div>
        )}

        <h3 className="text-[13px] font-semibold text-[var(--text-primary)] truncate flex-1">
          {entry.title || `收藏夹 ${entry.media_id}`}
        </h3>
        <div className="flex items-center gap-1 shrink-0 ml-2">
          <span className="text-[10px] text-[var(--text-secondary)]">
            {entry.count} 条
          </span>
          {!mergeMode && isActive && <ChevronRight size={12} className="text-[var(--text-secondary)]" />}
          {!mergeMode && (
            <motion.button
              whileTap={{ scale: 0.85 }}
              onClick={(e) => { e.stopPropagation(); onDelete(); }}
              className="opacity-0 group-hover:opacity-100 p-1 rounded-md
                         hover:bg-[var(--accent-pink)]/10 transition-opacity ml-0.5"
            >
              <Trash2 size={10} className="text-[var(--accent-pink)]" />
            </motion.button>
          )}
        </div>
      </div>

      {/* Cover thumbnails */}
      <AnimatePresence>
        {previewCovers.length > 0 && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="grid grid-cols-3 gap-2">
              {[0, 1, 2].map((i) => (
                <div key={i} className="flex flex-col gap-1.5">
                  <div className="aspect-[4/3] rounded-lg overflow-hidden bg-neutral-200">
                    {previewCovers[i] && (
                      <img
                        src={coverSrc(previewCovers[i])}
                        alt=""
                        referrerPolicy="no-referrer"
                        crossOrigin="anonymous"
                        className="w-full h-full object-cover"
                        loading="lazy"
                      />
                    )}
                  </div>
                  {previewTitles[i] && (
                    <p className="text-[9px] text-[var(--text-secondary)] leading-tight line-clamp-2">
                      {previewTitles[i]}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

export function CollectionTabs() {
  const { savedLists, loadSavedLists, loadList, deleteList, mergeLists, mediaId: activeId, items, listPreviews } =
    useFavoriteStore();

  const [pendingDelete, setPendingDelete] = useState<SavedListEntry | null>(null);
  const [mergeMode, setMergeMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [mergeTitle, setMergeTitle] = useState("");
  const [showMergeInput, setShowMergeInput] = useState(false);

  useEffect(() => { loadSavedLists(); }, [loadSavedLists]);

  const confirmDelete = useCallback(() => {
    if (!pendingDelete) return;
    deleteList(pendingDelete.media_id);
    setPendingDelete(null);
  }, [pendingDelete, deleteList]);

  const activeCovers = useMemo(() => items.map((it) => it.cover).filter(Boolean), [items]);
  const activeTitles = useMemo(() => items.map((it) => it.title), [items]);

  const toggleSelect = useCallback((mediaId: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(mediaId)) next.delete(mediaId);
      else next.add(mediaId);
      return next;
    });
  }, []);

  const exitMergeMode = useCallback(() => {
    setMergeMode(false);
    setSelectedIds(new Set());
    setShowMergeInput(false);
    setMergeTitle("");
  }, []);

  const handleMergeConfirm = useCallback(async () => {
    if (selectedIds.size < 2 || !mergeTitle.trim()) return;
    await mergeLists(Array.from(selectedIds), mergeTitle.trim());
    exitMergeMode();
  }, [selectedIds, mergeTitle, mergeLists, exitMergeMode]);

  // Compute total selected count for display
  const selectedCount = useMemo(() => {
    let total = 0;
    for (const entry of savedLists) {
      if (selectedIds.has(entry.media_id)) total += entry.count;
    }
    return total;
  }, [savedLists, selectedIds]);

  if (savedLists.length === 0) return null;

  return (
    <>
      {/* Header with merge toggle */}
      {savedLists.length >= 2 && (
        <div className="shrink-0 flex items-center justify-end px-1 pb-1.5">
          {mergeMode ? (
            <motion.button
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              whileTap={{ scale: 0.95 }}
              onClick={exitMergeMode}
              className="flex items-center gap-1 px-2 py-1 rounded-md
                         text-[9px] font-medium text-neutral-400 hover:text-neutral-600
                         hover:bg-neutral-100 transition-colors cursor-pointer"
            >
              <X size={10} />
              取消
            </motion.button>
          ) : (
            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={() => setMergeMode(true)}
              className="flex items-center gap-1 px-2 py-1 rounded-md
                         text-[9px] font-medium text-neutral-400 hover:text-neutral-600
                         hover:bg-neutral-100 transition-colors cursor-pointer"
            >
              <Merge size={10} />
              合并
            </motion.button>
          )}
        </div>
      )}

      <div className="flex-1 min-h-0 overflow-y-auto scrollbar-hide -mx-1 px-1 space-y-1">
        {savedLists.map((entry) => {
          const isActive = activeId === entry.media_id;
          const preview = listPreviews[entry.media_id];
          return (
            <CollectionCard
              key={entry.media_id}
              entry={entry}
              isActive={isActive}
              covers={isActive ? activeCovers : (preview?.covers ?? [])}
              titles={isActive ? activeTitles : (preview?.titles ?? [])}
              onSelect={() => { if (!isActive) loadList(entry.media_id); }}
              onDelete={() => setPendingDelete(entry)}
              mergeMode={mergeMode}
              isSelected={selectedIds.has(entry.media_id)}
              onToggleSelect={() => toggleSelect(entry.media_id)}
            />
          );
        })}
      </div>

      {/* Merge action bar — slides up when 2+ selected */}
      <AnimatePresence>
        {mergeMode && selectedIds.size >= 2 && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 12 }}
            transition={{ type: "spring", stiffness: 400, damping: 30 }}
            className="shrink-0 pt-2 pb-1"
          >
            {!showMergeInput ? (
              <motion.button
                whileTap={{ scale: 0.97 }}
                onClick={() => setShowMergeInput(true)}
                className="w-full flex items-center justify-center gap-1.5
                           py-2.5 rounded-xl
                           bg-neutral-800 text-white
                           text-[11px] font-medium
                           hover:bg-neutral-700 transition-colors cursor-pointer"
              >
                <Merge size={12} />
                合并 {selectedIds.size} 个收藏夹（共 {selectedCount} 条）
              </motion.button>
            ) : (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex gap-2 items-center"
              >
                <input
                  autoFocus
                  type="text"
                  value={mergeTitle}
                  onChange={(e) => setMergeTitle(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") handleMergeConfirm(); }}
                  placeholder="为合并后的收藏夹命名..."
                  className="flex-1 px-3 py-2.5 bg-neutral-100 text-neutral-700 text-[12px] rounded-xl
                             placeholder:text-neutral-400
                             focus:outline-none focus:ring-2 focus:ring-neutral-200
                             transition-shadow"
                />
                <motion.button
                  whileTap={{ scale: 0.9 }}
                  onClick={handleMergeConfirm}
                  disabled={!mergeTitle.trim()}
                  className="shrink-0 w-9 h-9 flex items-center justify-center rounded-xl
                             bg-neutral-800 text-white
                             hover:bg-neutral-700 transition-colors cursor-pointer
                             disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <Check size={14} strokeWidth={2.5} />
                </motion.button>
              </motion.div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

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
