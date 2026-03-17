import { useEffect } from "react";
import { MotionConfig, AnimatePresence, motion } from "motion/react";
import { Map as MapIcon, LayoutGrid, Shapes, ArrowLeft } from "lucide-react";
import { TitleBar } from "./components/TitleBar";
import { AddPanel } from "./components/AddPanel";
import { MapView } from "./components/MapView";
import { GridView } from "./components/GridView";
import { BubbleCluster } from "./components/BubbleCluster";
import { StatusBar } from "./components/StatusBar";
import { CollectionTabs } from "./components/CollectionTabs";
import { FloatingCards } from "./components/FloatingCards";
import { CityDetailPanel } from "./components/CityDetailPanel";
import { RouteStopList } from "./components/RouteStopList";
import { useThemeStore } from "./stores/useThemeStore";
import { useMapStore, type ChartView } from "./stores/useMapStore";
import { useFavoriteStore } from "./stores/useFavoriteStore";

const VIEW_OPTIONS: { id: ChartView; icon: typeof MapIcon; label: string }[] = [
  { id: "map", icon: MapIcon, label: "地图" },
  { id: "grid", icon: LayoutGrid, label: "网格" },
  { id: "bubble", icon: Shapes, label: "气泡" },
];

export default function App() {
  const initTheme = useThemeStore((s) => s.init);
  useEffect(() => { initTheme(); }, [initTheme]);

  const chartView = useMapStore((s) => s.chartView);
  const setChartView = useMapStore((s) => s.setChartView);
  const mapLevel = useMapStore((s) => s.mapLevel);
  const setMapLevel = useMapStore((s) => s.setMapLevel);
  const status = useFavoriteStore((s) => s.status);

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
            <div className="h-full relative">
            {/* Concave top-left notch — layout container for view buttons */}
            <div className="absolute top-0 left-0 z-10" style={{ width: 160, height: 52 }}>
              {/* SVG shape background */}
              <svg
                className="absolute inset-0 pointer-events-none"
                width="160"
                height="52"
                viewBox="0 0 160 52"
                fill="none"
              >
                <path
                  d="M0 0H160C128 0 143 35.5 118 35.5H15.9714C7.13487 35.5 0 42.6635 0 51.5V0Z"
                  fill="white"
                />
              </svg>

              {/* Button shelf — positioned on the flat bottom edge of the curve (y≈35.5, x: 16→118) */}
              {status === "done" && (
                <div
                  className="absolute flex items-center justify-evenly"
                  style={{ left: 16, top: 6, width: 100, height: 26 }}
                >
                  {VIEW_OPTIONS.map((opt) => {
                    const Icon = opt.icon;
                    const active = chartView === opt.id;
                    return (
                      <button
                        key={opt.id}
                        onClick={() => setChartView(opt.id)}
                        className="relative flex items-center justify-center"
                        style={{ width: 28, height: 26 }}
                      >
                        {active && (
                          <motion.div
                            layoutId="notch-view-indicator"
                            className="absolute inset-0 bg-neutral-100 rounded-lg"
                            transition={{ type: "spring", stiffness: 500, damping: 35 }}
                          />
                        )}
                        <Icon
                          size={14}
                          strokeWidth={active ? 2.2 : 1.6}
                          className={`relative z-[1] transition-colors duration-200 ${
                            active ? "text-neutral-700" : "text-neutral-400 hover:text-neutral-500"
                          }`}
                        />
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Map back button — positioned at the red circle marker (157, 21), only visible in china level */}
            {status === "done" && chartView === "map" && mapLevel === "china" && (
              <button
                onClick={() => setMapLevel("world")}
                className="absolute z-[11] flex items-center justify-center
                           w-[26px] h-[26px] rounded-full
                           text-white hover:text-black
                           transition-colors cursor-pointer"
                style={{ top: 21 - 13, left: 157 - 13 }}
              >
                <ArrowLeft size={16} strokeWidth={2.5} />
              </button>
            )}

            <div className="h-full bg-neutral-100 rounded-2xl rounded-tl-none relative overflow-hidden">
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
                {chartView === "grid" && (
                  <motion.div
                    key="grid"
                    className="absolute inset-0"
                    initial={{ opacity: 0, scale: 0.97 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.97 }}
                    transition={{ duration: 0.25, ease: "easeOut" }}
                  >
                    <GridView />
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
      </div>
    </MotionConfig>
  );
}
