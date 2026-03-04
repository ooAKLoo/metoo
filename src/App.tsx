import { useEffect } from "react";
import { MotionConfig } from "motion/react";
import { TitleBar } from "./components/TitleBar";
import { InputPanel } from "./components/InputPanel";
import { MapView } from "./components/MapView";
import { ItemList } from "./components/ItemList";
import { StatusBar } from "./components/StatusBar";
import { SavedLists } from "./components/SavedLists";
import { useThemeStore } from "./stores/useThemeStore";

export default function App() {
  const initTheme = useThemeStore((s) => s.init);
  useEffect(() => { initTheme(); }, [initTheme]);

  return (
    <MotionConfig reducedMotion="user">
      <div className="h-screen flex flex-col bg-deep overflow-hidden">
        <TitleBar />

        {/* Input bar */}
        <InputPanel />

        {/* Main content: list + map */}
        <div className="flex-1 flex min-h-0">
          {/* Left sidebar: saved lists + item list */}
          <div className="w-[360px] shrink-0 flex flex-col min-h-0 border-r border-[var(--accent-pink)]/20">
            <SavedLists />
            <ItemList />
          </div>

          {/* Right: Map */}
          <MapView />
        </div>

        {/* Status bar */}
        <StatusBar />
      </div>
    </MotionConfig>
  );
}
