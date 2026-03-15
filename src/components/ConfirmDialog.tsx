import { useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";

interface Props {
  open: boolean;
  title: string;
  description: string;
  confirmLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel = "删除",
  onConfirm,
  onCancel,
}: Props) {
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onCancel();
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [open, onCancel]);

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.12 }}
            onClick={onCancel}
            className="fixed inset-0 z-50 bg-black/20"
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.92 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.92 }}
            transition={{ type: "spring", stiffness: 500, damping: 32 }}
            className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50
                       w-[min(320px,calc(100%-40px))]
                       bg-[var(--bg-panel)] rounded-2xl
                       shadow-[0_16px_64px_rgba(0,0,0,0.16)]
                       p-5 text-center"
          >
            <div className="text-[13px] font-medium text-primary mb-1.5">
              {title}
            </div>
            <div className="text-[11px] text-secondary mb-5 leading-relaxed">
              {description}
            </div>
            <div className="flex gap-2">
              <button
                onClick={onCancel}
                className="flex-1 py-2 rounded-xl text-[11px] font-medium
                           bg-[var(--bg-card)] text-secondary
                           hover:bg-[var(--bg-deep)] transition-colors"
              >
                取消
              </button>
              <motion.button
                whileTap={{ scale: 0.96 }}
                onClick={onConfirm}
                className="flex-1 py-2 rounded-xl text-[11px] font-medium
                           bg-[var(--accent-pink)] text-white
                           hover:opacity-90 transition-opacity"
              >
                {confirmLabel}
              </motion.button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
