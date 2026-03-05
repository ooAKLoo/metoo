import { useState, useRef } from "react";
import { motion } from "motion/react";
import { Play, ClipboardPaste } from "lucide-react";
import { useFavoriteStore } from "../stores/useFavoriteStore";
import { isXhsHtml } from "../lib/xhs-parser";

const TABS = [
  { key: "bilibili" as const, label: "B 站" },
  { key: "xhs-paste" as const, label: "小红书" },
] as const;

export function InputPanel() {
  const { url, setUrl, fetchAll, importFromXhsHtml, status, inputMode, setInputMode } =
    useFavoriteStore();
  const [xhsHtml, setXhsHtml] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const isFetching = status === "fetching";

  // Hide when done — reset button is in TitleBar
  if (status === "done") return null;

  const handleBiliSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isFetching || !url.trim()) return;
    fetchAll();
  };

  const handleXhsImport = () => {
    if (!xhsHtml.trim()) return;
    importFromXhsHtml(xhsHtml);
    setXhsHtml("");
  };

  const handlePaste = async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (isXhsHtml(text)) {
        setXhsHtml(text);
        importFromXhsHtml(text);
      } else {
        setXhsHtml(text);
      }
    } catch {
      textareaRef.current?.focus();
    }
  };

  return (
    <div className="px-3 pt-3 pb-2 shrink-0 space-y-2">
      {/* Tab switcher */}
      <div className="flex gap-1 bg-card rounded-lg p-0.5 w-fit">
        {TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setInputMode(tab.key)}
            className="relative px-3 py-1.5 text-[10px] font-medium rounded-md z-[1]"
          >
            {inputMode === tab.key && (
              <motion.div
                layoutId="input-mode-tab"
                className="absolute inset-0 bg-panel rounded-md shadow-sm"
                transition={{ type: "spring", stiffness: 500, damping: 35 }}
              />
            )}
            <span
              className={`relative z-[1] transition-colors duration-200 ${
                inputMode === tab.key ? "text-primary" : "text-secondary"
              }`}
            >
              {tab.label}
            </span>
          </button>
        ))}
      </div>

      {/* B站 mode */}
      {inputMode === "bilibili" && (
        <form onSubmit={handleBiliSubmit} className="flex gap-2 items-center">
          <input
            type="text"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="粘贴 B 站收藏夹链接..."
            disabled={isFetching}
            className="flex-1 px-3 py-2 bg-card text-primary text-[12px] rounded-lg
                       placeholder:text-secondary
                       focus:outline-none focus:ring-2 focus:ring-[var(--accent-cyan)]/20
                       disabled:opacity-50 transition-shadow"
          />
          <motion.button
            type="submit"
            disabled={isFetching || !url.trim()}
            whileTap={{ scale: 0.96 }}
            className="px-4 py-2 bg-[var(--accent-cyan)] text-white
                       font-medium text-[12px] rounded-lg
                       hover:opacity-90 transition-opacity
                       disabled:opacity-40 disabled:cursor-not-allowed
                       flex items-center gap-1.5"
          >
            <Play size={12} fill="white" />
            {isFetching ? "抓取中..." : "Go"}
          </motion.button>
        </form>
      )}

      {/* 小红书 HTML paste mode */}
      {inputMode === "xhs-paste" && (
        <div className="space-y-1.5">
          <div className="flex gap-2 items-start">
            <textarea
              ref={textareaRef}
              value={xhsHtml}
              onChange={(e) => setXhsHtml(e.target.value)}
              placeholder="复制小红书收藏夹页面 HTML → 粘贴到这里"
              rows={2}
              className="flex-1 px-3 py-2 bg-card text-primary text-[11px] rounded-lg
                         placeholder:text-secondary resize-none
                         focus:outline-none focus:ring-2 focus:ring-[var(--accent-cyan)]/20
                         transition-shadow font-mono leading-relaxed"
            />
            <div className="flex flex-col gap-1 shrink-0">
              <motion.button
                type="button"
                onClick={handlePaste}
                whileTap={{ scale: 0.96 }}
                className="px-3 py-1.5 bg-[var(--accent-pink)] text-white
                           font-medium text-[11px] rounded-lg
                           hover:opacity-90 transition-opacity
                           flex items-center gap-1"
              >
                <ClipboardPaste size={11} />
                粘贴
              </motion.button>
              {xhsHtml.trim() && (
                <motion.button
                  type="button"
                  onClick={handleXhsImport}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  whileTap={{ scale: 0.96 }}
                  className="px-3 py-1.5 bg-[var(--accent-cyan)] text-white
                             font-medium text-[11px] rounded-lg
                             hover:opacity-90 transition-opacity
                             flex items-center gap-1"
                >
                  <Play size={11} fill="white" />
                  导入
                </motion.button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
