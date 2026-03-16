import { MapPin, Plus, RotateCcw, Map, Sparkles, Shapes } from "lucide-react";
import { motion } from "motion/react";
import { SettingsPanel } from "./SettingsPanel";
import { useFavoriteStore } from "../stores/useFavoriteStore";
import { useMapStore, type ChartView } from "../stores/useMapStore";

const VIEW_OPTIONS: { id: ChartView; icon: typeof Map; label: string }[] = [
  { id: "map", icon: Map, label: "地图" },
  { id: "rainbow", icon: Sparkles, label: "彩虹" },
  { id: "bubble", icon: Shapes, label: "气泡" },
];

interface Props {
  addOpen: boolean;
  onToggleAdd: () => void;
}

export function TitleBar({ addOpen, onToggleAdd }: Props) {
  const status = useFavoriteStore((s) => s.status);
  const reset = useFavoriteStore((s) => s.reset);
  const chartView = useMapStore((s) => s.chartView);
  const setChartView = useMapStore((s) => s.setChartView);

  return (
    <div
      data-tauri-drag-region
      className="h-[48px] flex items-center px-4 select-none shrink-0 relative z-30"
    >
      {/* Traffic light spacer */}
      <div data-tauri-drag-region className="w-[78px] shrink-0" />

      <div data-tauri-drag-region className="flex items-center gap-2 pointer-events-none">
        <MapPin size={16} className="text-[var(--accent-pink)]" />
        <span className="text-[13px] font-bold tracking-wide text-primary">
          觅途
        </span>
        <span className="text-[9px] text-secondary font-medium">MeToo</span>
      </div>

      {/* View switcher */}
      {status === "done" && (
        <div className="flex gap-0.5 bg-[var(--bg-card)] rounded-lg p-0.5 ml-4">
          {VIEW_OPTIONS.map((opt) => {
            const Icon = opt.icon;
            const active = chartView === opt.id;
            return (
              <button
                key={opt.id}
                onClick={() => setChartView(opt.id)}
                className="relative flex items-center gap-1 px-2.5 py-1 rounded-md z-[1]"
              >
                {active && (
                  <motion.div
                    layoutId="chart-view-indicator"
                    className="absolute inset-0 bg-white rounded-md"
                    transition={{ type: "spring", stiffness: 500, damping: 35 }}
                  />
                )}
                <Icon
                  size={12}
                  className={`relative z-[1] transition-colors duration-200 ${
                    active ? "text-[var(--text-primary)]" : "text-[var(--text-secondary)]"
                  }`}
                />
                <span
                  className={`relative z-[1] text-[10px] font-medium transition-colors duration-200 ${
                    active ? "text-[var(--text-primary)]" : "text-[var(--text-secondary)]"
                  }`}
                >
                  {opt.label}
                </span>
              </button>
            );
          })}
        </div>
      )}

      <div data-tauri-drag-region className="flex-1" />

      <div className="flex items-center gap-1.5">
        <motion.button
          whileTap={{ scale: 0.9 }}
          onClick={onToggleAdd}
          className={`p-1.5 rounded-lg transition-colors
            ${addOpen
              ? "bg-[var(--accent-cyan)]/10 text-[var(--accent-cyan)]"
              : "text-secondary hover:bg-card hover:text-primary"
            }`}
        >
          <motion.div
            animate={{ rotate: addOpen ? 45 : 0 }}
            transition={{ type: "spring", stiffness: 500, damping: 30 }}
          >
            <Plus size={16} />
          </motion.div>
        </motion.button>

        {status === "done" && (
          <button
            onClick={reset}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg
                       text-[10px] font-medium text-secondary
                       hover:bg-card hover:text-primary transition-colors"
          >
            <RotateCcw size={12} />
            重置
          </button>
        )}
        <SettingsPanel />
      </div>
    </div>
  );
}
