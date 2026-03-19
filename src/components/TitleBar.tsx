import { MapPin } from "lucide-react";
import { SettingsPanel } from "./SettingsPanel";

export function TitleBar() {
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

      <div data-tauri-drag-region className="flex-1" />

      <div className="flex items-center gap-1.5">
        <SettingsPanel />
      </div>
    </div>
  );
}
