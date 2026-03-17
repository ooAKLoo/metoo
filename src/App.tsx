import { useEffect } from "react";
import { MotionConfig, AnimatePresence, motion } from "motion/react";
import { TitleBar } from "./components/TitleBar";
import { AddPanel } from "./components/AddPanel";
import { MapView } from "./components/MapView";
import { RainbowChart } from "./components/RainbowChart";
import { BubbleCluster } from "./components/BubbleCluster";
import { StatusBar } from "./components/StatusBar";
import { CollectionTabs } from "./components/CollectionTabs";
import { FloatingCards } from "./components/FloatingCards";
import { CityDetailPanel } from "./components/CityDetailPanel";
import { RouteStopList } from "./components/RouteStopList";
import { useThemeStore } from "./stores/useThemeStore";
import { useMapStore } from "./stores/useMapStore";

export default function App() {
  const initTheme = useThemeStore((s) => s.init);
  useEffect(() => { initTheme(); }, [initTheme]);

  const chartView = useMapStore((s) => s.chartView);

  return (
    <MotionConfig reducedMotion="user">
      <div className="h-screen flex flex-col bg-white overflow-hidden">
        <TitleBar />

        {/* Main content: left-right split */}
        <div className="flex-1 min-h-0 flex">
          {/* Left panel — content & controls */}
          <div className="w-1/2 max-w-[480px] min-w-[280px] flex flex-col px-4 pb-3 relative">
            <div className="flex-1 min-h-0 flex flex-col">
              <CityDetailPanel />
              <CollectionTabs />
            </div>
            <FloatingCards />
            <AddPanel />
          </div>

          {/* Right panel — preview card */}
          <div className="flex-1 min-w-0 pr-3 pb-3">
            <div className="h-full bg-neutral-100 rounded-2xl relative overflow-hidden">
              <AnimatePresence mode="wait">
                {chartView === "map" && (
                  <motion.div
                    key="map"
                    className="absolute inset-0"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.2 }}
                  >
                    <MapView />
                  </motion.div>
                )}
                {chartView === "rainbow" && (
                  <motion.div
                    key="rainbow"
                    className="absolute inset-0"
                    initial={{ opacity: 0, scale: 0.97 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.97 }}
                    transition={{ duration: 0.25, ease: "easeOut" }}
                  >
                    <RainbowChart />
                  </motion.div>
                )}
                {chartView === "bubble" && (
                  <motion.div
                    key="bubble"
                    className="absolute inset-0"
                    initial={{ opacity: 0, scale: 0.97 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.97 }}
                    transition={{ duration: 0.25, ease: "easeOut" }}
                  >
                    <BubbleCluster />
                  </motion.div>
                )}
              </AnimatePresence>

              {chartView === "map" && <RouteStopList />}
              <StatusBar />
            </div>
          </div>
        </div>
      </div>
    </MotionConfig>
  );
}
