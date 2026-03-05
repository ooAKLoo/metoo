import { useEffect } from "react";
import { MotionConfig, AnimatePresence, motion } from "motion/react";
import { TitleBar } from "./components/TitleBar";
import { InputPanel } from "./components/InputPanel";
import { MapView } from "./components/MapView";
import { ItemList } from "./components/ItemList";
import { StatusBar } from "./components/StatusBar";
import { SavedLists } from "./components/SavedLists";
import { useThemeStore } from "./stores/useThemeStore";
import { useMapStore } from "./stores/useMapStore";

export default function App() {
  const initTheme = useThemeStore((s) => s.init);
  useEffect(() => { initTheme(); }, [initTheme]);

  const sidebarOpen = useMapStore((s) => s.sidebarOpen);

  return (
    <MotionConfig reducedMotion="user">
      <div className="h-screen flex flex-col bg-deep overflow-hidden">
        <TitleBar />

        {/* Full-bleed map area */}
        <div className="flex-1 min-h-0 relative">
          <MapView />

          {/* Floating sidebar card */}
          <AnimatePresence>
            {sidebarOpen && (
              <motion.div
                initial={{ x: -20, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                exit={{ x: -20, opacity: 0 }}
                transition={{ type: "spring", stiffness: 400, damping: 32 }}
                className="absolute top-3 left-3 bottom-3 w-[280px] z-20
                           flex flex-col min-h-0
                           bg-[var(--bg-panel)]/95 backdrop-blur-xl
                           rounded-2xl
                           shadow-[0_8px_40px_rgba(0,0,0,0.08),0_1px_3px_rgba(0,0,0,0.04)]"
              >
                <InputPanel />
                <SavedLists />
                <ItemList />
              </motion.div>
            )}
          </AnimatePresence>

          {/* Floating status pill */}
          <StatusBar />
        </div>
      </div>
    </MotionConfig>
  );
}
