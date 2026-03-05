import { useCallback } from "react";
import { MapPin, PanelLeft } from "lucide-react";
import { SettingsPanel } from "./SettingsPanel";
import { RotateCcw } from "lucide-react";
import { useFavoriteStore } from "../stores/useFavoriteStore";
import { useMapStore } from "../stores/useMapStore";

export function TitleBar() {
  const status = useFavoriteStore((s) => s.status);
  const reset = useFavoriteStore((s) => s.reset);
  const sidebarOpen = useMapStore((s) => s.sidebarOpen);
  const setSidebarOpen = useMapStore((s) => s.setSidebarOpen);
  const onToggleSidebar = useCallback(() => setSidebarOpen(!sidebarOpen), [sidebarOpen, setSidebarOpen]);

  return (
    <div
      data-tauri-drag-region
      className="h-[48px] flex items-center px-4 select-none shrink-0"
    >
      {/* Traffic light spacer */}
      <div data-tauri-drag-region className="w-[78px] shrink-0" />

      <button
        onClick={onToggleSidebar}
        className={`p-1.5 rounded-lg transition-colors mr-3
          ${sidebarOpen
            ? "bg-card text-[var(--accent-cyan)]"
            : "text-secondary hover:bg-card hover:text-primary"
          }`}
      >
        <PanelLeft size={16} />
      </button>

      <div data-tauri-drag-region className="flex items-center gap-2 pointer-events-none">
        <MapPin size={16} className="text-[var(--accent-pink)]" />
        <span className="text-[13px] font-bold tracking-wide text-primary">
          觅途
        </span>
        <span className="text-[9px] text-secondary font-medium">MeToo</span>
      </div>

      {/* Drag-transparent spacer fills remaining area */}
      <div data-tauri-drag-region className="flex-1" />

      <div className="flex items-center gap-2">
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
