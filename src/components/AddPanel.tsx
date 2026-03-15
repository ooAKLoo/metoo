import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Play, ClipboardPaste } from "lucide-react";
import { useFavoriteStore } from "../stores/useFavoriteStore";
import { isXhsHtml } from "../lib/xhs-parser";

const TABS = [
  { key: "bilibili" as const, label: "B 站" },
  { key: "xhs-paste" as const, label: "小红书" },
] as const;

interface Props {
  open: boolean;
  onClose: () => void;
}

export function AddPanel({ open, onClose }: Props) {
  const {
    url, setUrl, fetchAll, importFromXhsHtml,
    status, inputMode, setInputMode,
  } = useFavoriteStore();

  const [xhsHtml, setXhsHtml] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const isFetching = status === "fetching";

  // Auto-focus input when panel opens
  useEffect(() => {
    if (!open) return;
    const t = setTimeout(() => {
      if (inputMode === "bilibili") inputRef.current?.focus();
      else textareaRef.current?.focus();
    }, 200);
    return () => clearTimeout(t);
  }, [open, inputMode]);

  const handleBiliSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isFetching || !url.trim()) return;
    fetchAll();
    onClose();
  };

  const handleXhsImport = () => {
    if (!xhsHtml.trim()) return;
    importFromXhsHtml(xhsHtml);
    setXhsHtml("");
    onClose();
  };

  const handlePaste = async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (isXhsHtml(text)) {
        setXhsHtml(text);
        importFromXhsHtml(text);
        onClose();
      } else {
        setXhsHtml(text);
      }
    } catch {
      textareaRef.current?.focus();
    }
  };

  // Close on Escape
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [open, onClose]);

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop — click to close */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            onClick={onClose}
            className="fixed inset-0 z-20 bg-black/10"
          />

          {/* Slide-down floating card */}
          <motion.div
            initial={{ y: -40, opacity: 0, scale: 0.97 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: -40, opacity: 0, scale: 0.97 }}
            transition={{ type: "spring", stiffness: 420, damping: 30 }}
            className="fixed top-[52px] left-1/2 -translate-x-1/2 z-20
                       w-[min(420px,calc(100%-32px))]
                       bg-[var(--bg-panel)] rounded-2xl
                       shadow-[0_12px_48px_rgba(0,0,0,0.12),0_2px_8px_rgba(0,0,0,0.04)]
                       px-5 pb-4 pt-4"
          >
            {/* Tab switcher */}
            <div className="flex gap-1 bg-[var(--bg-card)] rounded-lg p-0.5 w-fit mb-3">
              {TABS.map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => setInputMode(tab.key)}
                  className="relative px-3 py-1.5 text-[10px] font-medium rounded-md z-[1]"
                >
                  {inputMode === tab.key && (
                    <motion.div
                      layoutId="add-panel-tab"
                      className="absolute inset-0 bg-white rounded-md"
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

            {/* B站 input */}
            <AnimatePresence mode="popLayout" initial={false}>
              {inputMode === "bilibili" ? (
                <motion.form
                  key="bili"
                  initial={{ opacity: 0, x: -12 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -12 }}
                  transition={{ duration: 0.2, ease: "easeOut" }}
                  onSubmit={handleBiliSubmit}
                  className="flex gap-2 items-center"
                >
                  <input
                    ref={inputRef}
                    type="text"
                    value={url}
                    onChange={(e) => setUrl(e.target.value)}
                    placeholder="粘贴 B 站收藏夹链接..."
                    disabled={isFetching}
                    className="flex-1 px-3 py-2.5 bg-[var(--bg-card)] text-primary text-[12px] rounded-xl
                               placeholder:text-secondary
                               focus:outline-none focus:ring-2 focus:ring-[var(--accent-cyan)]/20
                               disabled:opacity-50 transition-shadow"
                  />
                  <motion.button
                    type="submit"
                    disabled={isFetching || !url.trim()}
                    whileTap={{ scale: 0.96 }}
                    className="px-4 py-2.5 bg-[var(--accent-cyan)] text-white
                               font-medium text-[12px] rounded-xl
                               hover:opacity-90 transition-opacity
                               disabled:opacity-40 disabled:cursor-not-allowed
                               flex items-center gap-1.5"
                  >
                    <Play size={12} fill="white" />
                    {isFetching ? "抓取中..." : "Go"}
                  </motion.button>
                </motion.form>
              ) : (
                <motion.div
                  key="xhs"
                  initial={{ opacity: 0, x: 12 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 12 }}
                  transition={{ duration: 0.2, ease: "easeOut" }}
                  className="flex gap-2 items-start"
                >
                  <textarea
                    ref={textareaRef}
                    value={xhsHtml}
                    onChange={(e) => setXhsHtml(e.target.value)}
                    placeholder="复制小红书收藏夹页面 HTML → 粘贴到这里"
                    rows={2}
                    className="flex-1 px-3 py-2.5 bg-[var(--bg-card)] text-primary text-[11px] rounded-xl
                               placeholder:text-secondary resize-none
                               focus:outline-none focus:ring-2 focus:ring-[var(--accent-cyan)]/20
                               transition-shadow font-mono leading-relaxed"
                  />
                  <div className="flex flex-col gap-1.5 shrink-0">
                    <motion.button
                      type="button"
                      onClick={handlePaste}
                      whileTap={{ scale: 0.96 }}
                      className="px-4 py-2 bg-[var(--accent-pink)] text-white
                                 font-medium text-[11px] rounded-xl
                                 hover:opacity-90 transition-opacity
                                 flex items-center gap-1.5"
                    >
                      <ClipboardPaste size={12} />
                      粘贴
                    </motion.button>
                    {xhsHtml.trim() && (
                      <motion.button
                        type="button"
                        onClick={handleXhsImport}
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        whileTap={{ scale: 0.96 }}
                        className="px-4 py-2 bg-[var(--accent-cyan)] text-white
                                   font-medium text-[11px] rounded-xl
                                   hover:opacity-90 transition-opacity
                                   flex items-center gap-1.5"
                      >
                        <Play size={12} fill="white" />
                        导入
                      </motion.button>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
