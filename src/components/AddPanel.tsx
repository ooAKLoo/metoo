import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { ArrowUp, Loader2, Merge, X, Utensils, MapPin } from "lucide-react";
import { useFavoriteStore } from "../stores/useFavoriteStore";
import { useMapStore } from "../stores/useMapStore";
import { useCityAggregation } from "../hooks/useCityAggregation";
import { isXhsHtml, XHS_COLLECT_SCRIPT } from "../lib/xhs-parser";
import { classifyCollection } from "./poster-modules/MujiPoster";

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

  const listTitle = useFavoriteStore((s) => s.listTitle);
  const routePath = useMapStore((s) => s.routePath);
  const generateRoute = useMapStore((s) => s.generateRoute);
  const clearRoute = useMapStore((s) => s.clearRoute);
  const { entries } = useCityAggregation();
  const isTravel = classifyCollection(listTitle, items) === "travel";

  const [value, setValue] = useState("");
  const [scriptCopied, setScriptCopied] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const isFetching = status === "fetching";
  const [xhsRawData, setXhsRawData] = useState<string | null>(null);
  const showXhsIndicator = xhsRawData !== null || (isFetching && inputMode === "xhs-paste");

  useEffect(() => {
    if (inputMode === "bilibili") setValue(url);
  }, [url, inputMode]);

  useEffect(() => {
    const t = setTimeout(() => inputRef.current?.focus(), 300);
    return () => clearTimeout(t);
  }, []);

  const placeholder = inputMode === "bilibili"
    ? "粘贴 B 站收藏夹链接..."
    : "粘贴小红书数据...";

  const handleCopyScript = async () => {
    try {
      await navigator.clipboard.writeText(XHS_COLLECT_SCRIPT);
      setScriptCopied(true);
      setTimeout(() => setScriptCopied(false), 2000);
    } catch { /* ignore */ }
  };

  const canSubmit = inputMode === "xhs-paste"
    ? xhsRawData !== null && !isFetching
    : value.trim().length > 0 && !isFetching;

  const handleSubmit = () => {
    if (!canSubmit) return;
    if (inputMode === "bilibili") {
      setUrl(value);
      fetchAll();
    } else {
      if (xhsRawData) {
        importFromXhsHtml(xhsRawData);
        setXhsRawData(null);
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
      setXhsRawData(text);
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
    <div className="shrink-0 pt-2">
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
                    {routePath ? <X size={10} /> : isTravel ? <MapPin size={10} /> : <Utensils size={10} />}
                    {routePath ? "清除路线" : isTravel ? "游一遍" : "吃一遍"}
                  </motion.button>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Input card — white, with own rounding visible against gray */}
        <div className="bg-white rounded-t-xl p-3 flex flex-col">
          {showXhsIndicator ? (
            <div className="flex items-center gap-1.5 mb-2.5">
              <div className="flex-1 flex items-center gap-1.5 px-2.5 py-1 bg-neutral-50 rounded-lg">
                {isFetching ? (
                  <>
                    <Loader2 size={12} className="animate-spin text-neutral-400" />
                    <span className="text-[12px] text-neutral-500">正在导入...</span>
                  </>
                ) : (
                  <>
                    <div className="w-1.5 h-1.5 rounded-full bg-green-500 shrink-0" />
                    <span className="text-[12px] text-neutral-600">小红书数据已就绪</span>
                  </>
                )}
              </div>
              {!isFetching && (
                <button
                  onClick={() => setXhsRawData(null)}
                  className="p-0.5 text-neutral-400 hover:text-neutral-600
                             transition-colors cursor-pointer"
                >
                  <X size={12} />
                </button>
              )}
            </div>
          ) : (
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
          )}

          {inputMode === "xhs-paste" && (
            <button
              onClick={handleCopyScript}
              className="text-[10px] text-neutral-400 hover:text-neutral-600
                         transition-colors cursor-pointer mb-1.5 text-left"
            >
              {scriptCopied
                ? "已复制，请到浏览器控制台粘贴运行 ✓"
                : "收藏超 30 条？复制采集脚本 →"}
            </button>
          )}

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-0.5">
              {TABS.map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => {
                    setInputMode(tab.key);
                    setValue("");
                    setXhsRawData(null);
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
