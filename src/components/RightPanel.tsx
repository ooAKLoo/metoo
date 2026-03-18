import { useRef, useState, useCallback } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Map as MapIcon, LayoutGrid, Shapes, ArrowLeft, Download, Loader2, Check } from "lucide-react";
import { MapView } from "./MapView";
import { GridView } from "./GridView";
import { BubbleCluster } from "./BubbleCluster";
import { StatusBar } from "./StatusBar";
import { RouteStopList } from "./RouteStopList";
import { PosterModuleBar } from "./PosterModuleBar";
import { PosterPreview } from "./PosterPreview";
import { useMapStore, type ChartView } from "../stores/useMapStore";
import { useFavoriteStore } from "../stores/useFavoriteStore";
import { savePosterToDownloads } from "../lib/poster-export";
import { getPosterModule, POSTER_RATIOS, POSTER_RATIO_OPTIONS } from "../lib/poster-modules";
import { MujiPosterDevPanel } from "./poster-modules/MujiPosterDevPanel";

const VIEW_OPTIONS: { id: ChartView; icon: typeof MapIcon; label: string }[] = [
  { id: "map", icon: MapIcon, label: "地图" },
  { id: "grid", icon: LayoutGrid, label: "网格" },
  { id: "bubble", icon: Shapes, label: "气泡" },
];

export function RightPanel() {
  const chartView = useMapStore((s) => s.chartView);
  const setChartView = useMapStore((s) => s.setChartView);
  const mapLevel = useMapStore((s) => s.mapLevel);
  const setMapLevel = useMapStore((s) => s.setMapLevel);
  const activePosterModule = useMapStore((s) => s.activePosterModule);
  const posterRatio = useMapStore((s) => s.posterRatio);
  const setPosterRatio = useMapStore((s) => s.setPosterRatio);
  const mujiConfig = useMapStore((s) => s.mujiConfig);
  const setMujiConfig = useMapStore((s) => s.setMujiConfig);
  const status = useFavoriteStore((s) => s.status);

  const posterRef = useRef<HTMLDivElement>(null);
  const [dlState, setDlState] = useState<"idle" | "loading" | "done">("idle");

  const handlePosterDownload = useCallback(async () => {
    if (!posterRef.current || !activePosterModule || dlState === "loading") return;
    const mod = getPosterModule(activePosterModule);
    if (!mod) return;

    setDlState("loading");
    try {
      const card = posterRef.current.querySelector("[data-poster-export]") as HTMLElement;
      const target = card || posterRef.current;
      await savePosterToDownloads(target, mod.name);
      setDlState("done");
      setTimeout(() => setDlState("idle"), 2000);
    } catch (err) {
      console.error("Poster download failed:", err);
      setDlState("idle");
    }
  }, [activePosterModule, dlState]);

  const inPosterMode = activePosterModule !== null;
  const activeMod = activePosterModule ? getPosterModule(activePosterModule) : undefined;
  const hideBackground = inPosterMode && !!activeMod?.opaqueBackground;
  const ratioPreset = POSTER_RATIOS[posterRatio];

  return (
    <div className="flex-1 min-w-0 pr-3 pb-3">
      <div className="h-full relative">
        {/* Concave top-left notch */}
        <div
          className="absolute top-0 left-0 z-10"
          style={{ width: 160, height: 52 }}
        >
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

        {/* Action button in notch area */}
        <AnimatePresence mode="wait">
          {inPosterMode ? (
            <motion.button
              key="poster-download"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              transition={{ type: "spring", stiffness: 500, damping: 30 }}
              whileTap={{ scale: 0.9 }}
              onClick={handlePosterDownload}
              disabled={dlState === "loading"}
              className={`absolute z-[11] flex items-center justify-center
                         w-[26px] h-[26px] rounded-full cursor-pointer
                         transition-colors duration-200
                         ${dlState === "done"
                           ? "bg-emerald-500 text-white"
                           : "bg-neutral-800 text-white hover:bg-neutral-700"
                         }`}
              style={{ top: 21 - 13, left: 157 - 13 }}
            >
              {dlState === "loading" ? (
                <Loader2 size={12} className="animate-spin" />
              ) : dlState === "done" ? (
                <Check size={12} />
              ) : (
                <Download size={12} />
              )}
            </motion.button>
          ) : status === "done" && chartView === "map" && mapLevel === "china" ? (
            <motion.button
              key="map-back"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              transition={{ type: "spring", stiffness: 500, damping: 30 }}
              onClick={() => setMapLevel("world")}
              className="absolute z-[11] flex items-center justify-center
                         w-[26px] h-[26px] rounded-full
                         text-white hover:text-black
                         transition-colors cursor-pointer"
              style={{ top: 21 - 13, left: 157 - 13 }}
            >
              <ArrowLeft size={16} strokeWidth={2.5} />
            </motion.button>
          ) : null}
        </AnimatePresence>

        {/* Content card */}
        <div className="h-full relative overflow-hidden bg-neutral-100 rounded-2xl rounded-tl-none">
          <AnimatePresence mode="wait">
            {chartView === "map" && !hideBackground && (
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
            {chartView === "grid" && !hideBackground && (
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
            {chartView === "bubble" && !hideBackground && (
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

          {/* Poster preview — fixed preview area, content changes ratio inside */}
          <AnimatePresence>
            {inPosterMode && (
              <div className="absolute inset-0 z-10 flex flex-col items-center justify-center pointer-events-none">
                <motion.div
                  key="poster-area"
                  className="w-[calc(100%-24px)] h-[70%] mx-3 bg-white rounded-2xl shadow-sm relative overflow-hidden origin-center"
                  initial={{ opacity: 0, scale: 0.92 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.92 }}
                  transition={{ duration: 0.5, ease: "easeOut" }}
                >
                  {/* Poster card — sized by selected ratio, centered */}
                  <div className="absolute inset-0 flex items-center justify-center p-5 pb-12">
                    <motion.div
                      layout
                      ref={posterRef}
                      className="relative overflow-hidden rounded-xl"
                      style={{
                        aspectRatio: `${ratioPreset.w} / ${ratioPreset.h}`,
                        height: "100%",
                        maxWidth: "100%",
                      }}
                      transition={{ layout: { type: "spring", stiffness: 400, damping: 35 } }}
                    >
                      {/* Muji: embed map as poster background */}
                      {activePosterModule === "muji" && (
                        <div className="absolute inset-0 pointer-events-none">
                          <MapView />
                        </div>
                      )}
                      <PosterPreview />
                    </motion.div>
                  </div>

                  {/* Ratio switcher — anchored at bottom of preview area */}
                  <div className="absolute bottom-3 left-1/2 -translate-x-1/2 z-10 pointer-events-auto">
                    <div className="flex items-center gap-0.5 bg-neutral-100 rounded-lg p-0.5">
                      {POSTER_RATIO_OPTIONS.map((ratio) => {
                        const isActive = posterRatio === ratio;
                        return (
                          <button
                            key={ratio}
                            onClick={() => setPosterRatio(ratio)}
                            className="relative px-3 py-1.5 text-[10px] font-medium rounded-md z-[1]"
                          >
                            {isActive && (
                              <motion.div
                                layoutId="poster-ratio-indicator"
                                className="absolute inset-0 bg-neutral-800 rounded-md"
                                transition={{ type: "spring", stiffness: 500, damping: 35 }}
                              />
                            )}
                            <span
                              className={`relative z-[1] transition-colors duration-200 ${
                                isActive ? "text-white" : "text-neutral-500"
                              }`}
                            >
                              {POSTER_RATIOS[ratio].label}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </motion.div>

                {/* Muji dev panel — floating over poster area */}
                {activePosterModule === "muji" && (
                  <div className="absolute top-2 right-2 z-20 w-56 pointer-events-auto">
                    <MujiPosterDevPanel config={mujiConfig} onChange={setMujiConfig} />
                  </div>
                )}
              </div>
            )}
          </AnimatePresence>

          {!inPosterMode && chartView === "map" && <RouteStopList />}
          {!inPosterMode && <StatusBar />}
        </div>

        <PosterModuleBar />
      </div>
    </div>
  );
}
