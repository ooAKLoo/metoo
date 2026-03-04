import { useState, useRef } from "react";
import { motion } from "motion/react";
import { Play, RotateCcw, ClipboardPaste } from "lucide-react";
import { useFavoriteStore } from "../stores/useFavoriteStore";
import { isXhsHtml } from "../lib/xhs-parser";

const TABS = [
  { key: "bilibili" as const, label: "B 站" },
  { key: "xhs-paste" as const, label: "小红书" },
] as const;

export function InputPanel() {
  const { url, setUrl, fetchAll, importFromXhsHtml, reset, status, inputMode, setInputMode } =
    useFavoriteStore();
  const [xhsHtml, setXhsHtml] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const isFetching = status === "fetching";
  const isDone = status === "done";

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
        // Auto-import if clearly XHS
        importFromXhsHtml(text);
      } else {
        setXhsHtml(text);
      }
    } catch {
      // Clipboard API failed, user can paste manually
      textareaRef.current?.focus();
    }
  };

  if (isDone) {
    return (
      <div className="flex gap-3 items-center px-4 py-3 shrink-0">
        <div className="flex-1" />
        <motion.button
          type="button"
          onClick={reset}
          whileTap={{ scale: 0.93 }}
          whileHover={{ scale: 1.05 }}
          transition={{ type: "spring", stiffness: 500, damping: 30 }}
          className="px-5 py-2.5 bg-[var(--accent-cyan)] text-[var(--bg-deep)]
                     font-bold text-[13px] rounded-lg neo-btn flex items-center gap-2"
          style={{ color: "var(--accent-cyan)" }}
        >
          <RotateCcw size={14} />
          <span className="text-[var(--bg-deep)]">重置</span>
        </motion.button>
      </div>
    );
  }

  return (
    <div className="px-4 py-3 shrink-0 space-y-2.5">
      {/* Tab switcher */}
      <div className="flex gap-1 bg-panel rounded-lg p-1 w-fit">
        {TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setInputMode(tab.key)}
            className="relative px-3 py-1.5 text-[11px] font-medium rounded-md z-[1]"
          >
            {inputMode === tab.key && (
              <motion.div
                layoutId="input-mode-tab"
                className="absolute inset-0 bg-card rounded-md"
                transition={{ type: "spring", stiffness: 500, damping: 35 }}
              />
            )}
            <span
              className={`relative z-[1] transition-colors duration-200 ${
                inputMode === tab.key ? "text-[var(--accent-yellow)]" : "text-secondary"
              }`}
            >
              {tab.label}
            </span>
          </button>
        ))}
      </div>

      {/* B站 mode */}
      {inputMode === "bilibili" && (
        <form onSubmit={handleBiliSubmit} className="flex gap-3 items-center">
          <input
            type="text"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="粘贴 B 站收藏夹链接..."
            disabled={isFetching}
            className="flex-1 px-4 py-2.5 bg-panel text-primary text-[13px] rounded-lg
                       neo-border placeholder:text-secondary
                       focus:outline-none focus:shadow-[0_0_0_2px_var(--accent-yellow)]
                       disabled:opacity-50 transition-shadow"
          />
          <motion.button
            type="submit"
            disabled={isFetching || !url.trim()}
            whileTap={{ scale: 0.93 }}
            whileHover={{ scale: 1.05 }}
            transition={{ type: "spring", stiffness: 500, damping: 30 }}
            className="px-5 py-2.5 bg-[var(--accent-yellow)] text-[var(--bg-deep)]
                       font-bold text-[13px] rounded-lg neo-btn
                       disabled:opacity-50 disabled:cursor-not-allowed
                       flex items-center gap-2"
            style={{ color: "var(--accent-yellow)" }}
          >
            <Play size={14} fill="var(--bg-deep)" className="text-[var(--bg-deep)]" />
            <span className="text-[var(--bg-deep)]">{isFetching ? "抓取中..." : "Go"}</span>
          </motion.button>
        </form>
      )}

      {/* 小红书 HTML paste mode */}
      {inputMode === "xhs-paste" && (
        <div className="space-y-2">
          <div className="flex gap-2 items-start">
            <textarea
              ref={textareaRef}
              value={xhsHtml}
              onChange={(e) => setXhsHtml(e.target.value)}
              placeholder={"打开小红书收藏夹页面 → F12 开发者工具 → 复制 .board 元素的 HTML → 粘贴到这里"}
              rows={3}
              className="flex-1 px-4 py-2.5 bg-panel text-primary text-[12px] rounded-lg
                         neo-border placeholder:text-secondary resize-none
                         focus:outline-none focus:shadow-[0_0_0_2px_var(--accent-yellow)]
                         transition-shadow font-mono leading-relaxed"
            />
            <div className="flex flex-col gap-1.5 shrink-0">
              <motion.button
                type="button"
                onClick={handlePaste}
                whileTap={{ scale: 0.93 }}
                whileHover={{ scale: 1.05 }}
                transition={{ type: "spring", stiffness: 500, damping: 30 }}
                className="px-4 py-2 bg-[var(--accent-pink)] font-bold text-[12px]
                           rounded-lg neo-btn flex items-center gap-1.5"
                style={{ color: "var(--accent-pink)" }}
              >
                <ClipboardPaste size={13} className="text-white" />
                <span className="text-white">粘贴</span>
              </motion.button>
              {xhsHtml.trim() && (
                <motion.button
                  type="button"
                  onClick={handleXhsImport}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  whileTap={{ scale: 0.93 }}
                  whileHover={{ scale: 1.05 }}
                  transition={{ type: "spring", stiffness: 500, damping: 30 }}
                  className="px-4 py-2 bg-[var(--accent-yellow)] font-bold text-[12px]
                             rounded-lg neo-btn flex items-center gap-1.5"
                  style={{ color: "var(--accent-yellow)" }}
                >
                  <Play size={13} fill="var(--bg-deep)" className="text-[var(--bg-deep)]" />
                  <span className="text-[var(--bg-deep)]">导入</span>
                </motion.button>
              )}
            </div>
          </div>
          <p className="text-[9px] text-secondary leading-relaxed px-1">
            提示：在收藏夹页面按 F12 → 选择 Elements → 右键 {"<div class=\"board\">"} → Copy → Copy outerHTML
          </p>
        </div>
      )}
    </div>
  );
}
