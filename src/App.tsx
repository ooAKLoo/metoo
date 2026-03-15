import { useEffect, useState } from "react";
import { MotionConfig } from "motion/react";
import { TitleBar } from "./components/TitleBar";
import { AddPanel } from "./components/AddPanel";
import { MapView } from "./components/MapView";
import { StatusBar } from "./components/StatusBar";
import { CollectionTabs } from "./components/CollectionTabs";
import { FloatingCards } from "./components/FloatingCards";
import { RouteStopList } from "./components/RouteStopList";
import { useThemeStore } from "./stores/useThemeStore";

export default function App() {
  const initTheme = useThemeStore((s) => s.init);
  useEffect(() => { initTheme(); }, [initTheme]);

  const [addOpen, setAddOpen] = useState(false);

  return (
    <MotionConfig reducedMotion="user">
      <div className="h-screen flex flex-col bg-deep overflow-hidden">
        <TitleBar addOpen={addOpen} onToggleAdd={() => setAddOpen((v) => !v)} />
        <AddPanel open={addOpen} onClose={() => setAddOpen(false)} />

        {/* Full-bleed map area */}
        <div className="flex-1 min-h-0 relative">
          <MapView />
          <CollectionTabs />
          <RouteStopList />
          <FloatingCards />
          <StatusBar />
        </div>
      </div>
    </MotionConfig>
  );
}
