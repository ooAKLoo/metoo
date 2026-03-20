import { motion, AnimatePresence } from "motion/react";
import { Settings, X, ShieldCheck } from "lucide-react";
import { useState } from "react";
import { THEMES, useThemeStore } from "../stores/useThemeStore";
import { Tooltip } from "./Tooltip";

export function SettingsPanel() {
  const [open, setOpen] = useState(false);
  const { themeId, setTheme } = useThemeStore();

  return (
    <>
      <Tooltip label="设置">
        <motion.button
          whileTap={{ scale: 0.9 }}
          onClick={() => setOpen(true)}
          className="w-7 h-7 flex items-center justify-center rounded-lg
                     text-secondary hover:text-primary hover:bg-card transition-colors"
        >
          <Settings size={15} />
        </motion.button>
      </Tooltip>

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
              className="fixed inset-0 bg-black/30 backdrop-blur-[2px] z-50"
            />

            {/* Modal */}
            <motion.div
              key="settings-modal"
              initial={{ opacity: 0, scale: 0.95, y: 12 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 12 }}
              transition={{ type: "spring", stiffness: 500, damping: 35 }}
              className="fixed inset-0 z-50 flex items-center justify-center pointer-events-none"
            >
              <div className="bg-panel border border-[var(--border-color)]
                              shadow-xl rounded-2xl w-[420px] max-h-[80vh]
                              overflow-y-auto pointer-events-auto">
                {/* Header */}
                <div className="flex items-center justify-between px-5 pt-5 pb-3">
                  <span className="text-[14px] font-bold text-primary">设置</span>
                  <motion.button
                    whileTap={{ scale: 0.9 }}
                    onClick={() => setOpen(false)}
                    className="w-7 h-7 flex items-center justify-center rounded-lg
                               text-secondary hover:text-primary hover:bg-card transition-colors"
                  >
                    <X size={15} />
                  </motion.button>
                </div>

                <div className="px-5 pb-5 space-y-5">
                  {/* ── Theme Section ── */}
                  <section>
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

                    {(() => {
                      const active = THEMES.find((t) => t.id === themeId);
                      if (!active) return null;
                      return (
                        <div className="mt-3 flex items-center gap-2 bg-card rounded-xl px-2.5 py-2">
                          <div className="flex gap-1">
                            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: active.accentPink }} />
                            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: active.accentCyan }} />
                            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: active.accentYellow }} />
                          </div>
                          <span className="text-[10px] font-medium text-secondary">
                            {active.name}
                          </span>
                        </div>
                      );
                    })()}
                  </section>

                  {/* ── Divider ── */}
                  <div className="border-t border-[var(--border-color)]/50" />

                  {/* ── Legal Disclaimer ── */}
                  <section>
                    <div className="flex items-center gap-1.5 mb-2.5">
                      <ShieldCheck size={12} className="text-secondary" />
                      <span className="text-[10px] font-medium text-secondary uppercase tracking-wide">
                        地图数据声明
                      </span>
                    </div>

                    <div className="bg-card rounded-xl px-3.5 py-3 space-y-2.5 text-[11px] leading-[1.7] text-secondary">
                      <p>
                        本应用地图功能仅用于个人收藏内容的地理可视化，不具备任何测绘资质，
                        地图展示不代表对任何国家或地区主权、领土边界的官方认定。
                      </p>
                      <p>
                        <span className="text-primary font-medium">中华人民共和国领土</span>包括但不限于中国大陆及其沿海岛屿、
                        <span className="text-primary font-medium">台湾省</span>及其附属岛屿（含钓鱼岛及其附属岛屿）、
                        <span className="text-primary font-medium">南海诸岛</span>（含东沙群岛、西沙群岛、中沙群岛、南沙群岛）
                        等全部领土。
                      </p>
                      <p>
                        受可视化方案限制，地图仅按<span className="text-primary font-medium">省级/州级行政区划</span>聚合显示数据，
                        部分远洋岛屿及海域可能未在默认视口中呈现，
                        但这不代表对相关领土主权的任何立场变化。
                      </p>
                    </div>
                  </section>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
