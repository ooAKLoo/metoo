import { motion, AnimatePresence } from "motion/react";
import { Settings, X } from "lucide-react";
import { useState } from "react";
import { THEMES, useThemeStore } from "../stores/useThemeStore";

export function SettingsPanel() {
  const [open, setOpen] = useState(false);
  const { themeId, setTheme } = useThemeStore();

  return (
    <>
      <motion.button
        whileTap={{ scale: 0.9 }}
        onClick={() => setOpen(true)}
        className="w-7 h-7 flex items-center justify-center rounded-lg
                   text-secondary hover:text-primary hover:bg-card transition-colors"
      >
        <Settings size={15} />
      </motion.button>

      <AnimatePresence>
        {open && (
          <>
            {/* Backdrop */}
            <motion.div
              key="settings-backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
              onClick={() => setOpen(false)}
              className="fixed inset-0 bg-black/20 z-50"
            />

            {/* Panel */}
            <motion.div
              key="settings-panel"
              initial={{ opacity: 0, scale: 0.95, y: -8 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: -8 }}
              transition={{ type: "spring", stiffness: 500, damping: 35 }}
              className="fixed top-[60px] right-4 w-[240px] bg-panel
                         border border-[var(--border-color)] shadow-lg
                         rounded-2xl p-4 z-50"
            >
              {/* Header */}
              <div className="flex items-center justify-between mb-4">
                <span className="text-[13px] font-bold text-primary">设置</span>
                <motion.button
                  whileTap={{ scale: 0.9 }}
                  onClick={() => setOpen(false)}
                  className="w-6 h-6 flex items-center justify-center rounded-lg
                             text-secondary hover:text-primary hover:bg-card transition-colors"
                >
                  <X size={14} />
                </motion.button>
              </div>

              {/* Theme Section */}
              <div className="mb-1">
                <div className="text-[10px] font-medium text-secondary mb-2.5 uppercase tracking-wide">
                  主题配色
                </div>

                <div className="flex flex-wrap gap-2">
                  {THEMES.map((theme) => {
                    const isSelected = theme.id === themeId;
                    return (
                      <motion.button
                        key={theme.id}
                        whileTap={{ scale: 0.9 }}
                        onClick={() => setTheme(theme.id)}
                        className={`w-8 h-8 rounded-lg transition-all flex-shrink-0 ${
                          isSelected
                            ? "ring-2 ring-[var(--accent-cyan)] ring-offset-2 ring-offset-[var(--bg-panel)]"
                            : "opacity-60 hover:opacity-100"
                        }`}
                        style={{
                          background: `linear-gradient(135deg, ${theme.deep} 0%, ${theme.card} 40%, ${theme.accentPink} 100%)`,
                        }}
                        title={theme.name}
                      />
                    );
                  })}
                </div>

                {/* Active theme name */}
                {(() => {
                  const active = THEMES.find((t) => t.id === themeId);
                  if (!active) return null;
                  return (
                    <div className="mt-3 flex items-center gap-2 bg-card rounded-xl px-2.5 py-2">
                      <div className="flex gap-1">
                        <div
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: active.accentPink }}
                        />
                        <div
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: active.accentCyan }}
                        />
                        <div
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: active.accentYellow }}
                        />
                      </div>
                      <span className="text-[10px] font-medium text-secondary">
                        {active.name}
                      </span>
                    </div>
                  );
                })()}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
