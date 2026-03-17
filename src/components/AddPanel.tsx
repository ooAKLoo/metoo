import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { ArrowUp, Loader2, Merge, X, Utensils } from "lucide-react";
import { useFavoriteStore } from "../stores/useFavoriteStore";
import { useMapStore } from "../stores/useMapStore";
import { useCityAggregation } from "../hooks/useCityAggregation";
import { isXhsHtml } from "../lib/xhs-parser";

const TABS = [
  { key: "bilibili" as const, label: "B 站" },
  { key: "xhs-paste" as const, label: "小红书" },
] as const;

export function AddPanel() {
  const {
    url, setUrl, fetchAll, importFromXhsHtml,
    status, inputMode, setInputMode,
    savedLists, mergeMode, setMergeMode, items,
  } = useFavoriteStore();

  const routePath = useMapStore((s) => s.routePath);
  const generateRoute = useMapStore((s) => s.generateRoute);
  const clearRoute = useMapStore((s) => s.clearRoute);
  const { entries } = useCityAggregation();

  const [value, setValue] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const isFetching = status === "fetching";

  useEffect(() => {
    if (inputMode === "bilibili") setValue(url);
  }, [url, inputMode]);

  useEffect(() => {
    const t = setTimeout(() => inputRef.current?.focus(), 300);
    return () => clearTimeout(t);
  }, []);

  const placeholder = inputMode === "bilibili"
    ? "粘贴 B 站收藏夹链接..."
    : "粘贴小红书收藏夹页面 HTML...";

  const canSubmit = value.trim().length > 0 && !isFetching;

  const handleSubmit = () => {
    if (!canSubmit) return;
    if (inputMode === "bilibili") {
      setUrl(value);
      fetchAll();
    } else {
      if (isXhsHtml(value)) {
        importFromXhsHtml(value);
        setValue("");
      }
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = e.target.value;
    setValue(v);
    if (inputMode === "bilibili") setUrl(v);
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    const text = e.clipboardData.getData("text");
    if (isXhsHtml(text)) {
      e.preventDefault();
      setInputMode("xhs-paste");
      importFromXhsHtml(text);
      setValue("");
    }
  };

  // Toolbar visibility
  const canMerge = savedLists.length >= 2;
  const canRoute = status === "done" && items.length > 0 && entries.length >= 2;
  const showToolbar = canMerge || canRoute;

  const handleRoute = () => {
    if (routePath) {
      clearRoute();
    } else {
      generateRoute(entries.map((e) => ({ name: e.name, coord: e.coord })));
    }
  };

  return (
    <div className="absolute bottom-3 left-4 right-4 z-10">
      {/* Outer shell — bg transitions to gray when toolbar visible */}
      <div
        className={`rounded-2xl overflow-hidden
                    shadow-[0_2px_20px_rgba(0,0,0,0.08)]
                    transition-colors duration-200
                    ${showToolbar ? "bg-neutral-100" : "bg-white"}`}
      >
        {/* Toolbar — slides open in the gray area */}
        <AnimatePresence initial={false}>
          {showToolbar && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ type: "spring", stiffness: 400, damping: 30 }}
              className="overflow-hidden"
            >
              <div className="px-2.5 py-1.5 flex items-center gap-1">
                {canMerge && (
                  <motion.button
                    whileTap={{ scale: 0.95 }}
                    onClick={() => setMergeMode(!mergeMode)}
                    className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg
                               text-[10px] font-medium cursor-pointer
                               transition-colors duration-200
                               ${mergeMode
                                 ? "bg-neutral-800 text-white"
                                 : "bg-white text-neutral-500 hover:text-neutral-700"
                               }`}
                  >
                    {mergeMode ? <X size={10} /> : <Merge size={10} />}
                    {mergeMode ? "取消合并" : "合并"}
                  </motion.button>
                )}

                {canRoute && (
                  <motion.button
                    whileTap={{ scale: 0.95 }}
                    onClick={handleRoute}
                    className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg
                               text-[10px] font-medium cursor-pointer
                               transition-colors duration-200
                               ${routePath
                                 ? "bg-neutral-800 text-white"
                                 : "bg-white text-neutral-500 hover:text-neutral-700"
                               }`}
                  >
                    {routePath ? <X size={10} /> : <Utensils size={10} />}
                    {routePath ? "清除路线" : "吃一遍"}
                  </motion.button>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Input card — white, with own rounding visible against gray */}
        <div className="bg-white rounded-t-xl p-3 flex flex-col">
          <input
            ref={inputRef}
            type="text"
            value={value}
            onChange={handleChange}
            onKeyDown={handleKeyDown}
            onPaste={handlePaste}
            placeholder={placeholder}
            disabled={isFetching}
            className="w-full bg-transparent text-neutral-700 text-[12px]
                       placeholder:text-neutral-400
                       focus:outline-none
                       disabled:opacity-50 mb-2.5"
          />

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-0.5">
              {TABS.map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => {
                    setInputMode(tab.key);
                    setValue("");
                    inputRef.current?.focus();
                  }}
                  className={`px-2 py-1 text-[10px] font-medium rounded-md
                             transition-colors duration-150 cursor-pointer
                             ${inputMode === tab.key
                               ? "bg-white text-neutral-700"
                               : "text-neutral-400 hover:text-neutral-500"
                             }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            <motion.button
              whileTap={{ scale: 0.9 }}
              onClick={handleSubmit}
              disabled={!canSubmit}
              className={`w-7 h-7 flex items-center justify-center rounded-lg
                         transition-colors cursor-pointer
                         ${canSubmit
                           ? "bg-neutral-800 text-white hover:bg-neutral-700"
                           : "bg-neutral-200 text-neutral-400 cursor-not-allowed"
                         }`}
            >
              {isFetching
                ? <Loader2 size={13} className="animate-spin" />
                : <ArrowUp size={13} strokeWidth={2.5} />
              }
            </motion.button>
          </div>
        </div>
      </div>
    </div>
  );
}
