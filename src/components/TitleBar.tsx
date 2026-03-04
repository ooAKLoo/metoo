import { MapPin } from "lucide-react";
import { SettingsPanel } from "./SettingsPanel";

export function TitleBar() {
  return (
    <div
      data-tauri-drag-region
      className="h-[52px] flex items-center px-4 bg-panel select-none shrink-0"
    >
      {/* Traffic light spacer */}
      <div className="w-[78px] shrink-0" />
      <div className="flex items-center gap-2">
        <MapPin size={18} className="text-[var(--accent-pink)]" />
        <span className="text-[14px] font-bold tracking-wide text-primary">
          觅途
        </span>
        <span className="text-[10px] text-secondary font-medium">MeToo</span>
      </div>

      <div className="ml-auto">
        <SettingsPanel />
      </div>
    </div>
  );
}
