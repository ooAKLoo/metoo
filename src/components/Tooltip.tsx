import { useState, useRef, useCallback, type ReactNode, type CSSProperties } from "react";
import { AnimatePresence, motion } from "motion/react";

interface TooltipProps {
  label: string;
  children: ReactNode;
  side?: "top" | "bottom";
  delay?: number;
  className?: string;
  style?: CSSProperties;
}

export function Tooltip({ label, children, side = "bottom", delay = 400, className, style }: TooltipProps) {
  const [open, setOpen] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  const handleEnter = useCallback(() => {
    timerRef.current = setTimeout(() => setOpen(true), delay);
  }, [delay]);

  const handleLeave = useCallback(() => {
    clearTimeout(timerRef.current);
    setOpen(false);
  }, []);

  const isTop = side === "top";

  return (
    <div
      className={className ?? "relative inline-flex"}
      style={style}
      onMouseEnter={handleEnter}
      onMouseLeave={handleLeave}
    >
      {children}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: isTop ? 4 : -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: isTop ? 4 : -4 }}
            transition={{ duration: 0.15, ease: "easeOut" }}
            className={`absolute left-1/2 -translate-x-1/2 z-50
                       px-2 py-1 rounded-lg
                       bg-neutral-800 text-white
                       text-[9px] font-medium whitespace-nowrap
                       pointer-events-none
                       ${isTop ? "bottom-full mb-1.5" : "top-full mt-1.5"}`}
          >
            {label}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
