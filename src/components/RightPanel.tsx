import { useRef, useState, useCallback, useMemo } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Map as MapIcon, LayoutGrid, Shapes, Palette, ArrowLeft, Download, Loader2, Check } from "lucide-react";
import { MapView } from "./MapView";
import { GridView } from "./GridView";
import { BubbleCluster } from "./BubbleCluster";
import { CountryMapView } from "./CountryMapView";
import { StatusBar } from "./StatusBar";
import { RouteStopList } from "./RouteStopList";
import { PosterModuleBar } from "./PosterModuleBar";
import { PosterPreview } from "./PosterPreview";
import { useMapStore, type ChartView } from "../stores/useMapStore";
import { useFavoriteStore } from "../stores/useFavoriteStore";
import { savePosterToDownloads } from "../lib/poster-export";
import { getPosterModule, POSTER_RATIOS, POSTER_RATIO_OPTIONS } from "../lib/poster-modules";
import { MujiPosterDevPanel, DEFAULT_CONFIG } from "./poster-modules/MujiPosterDevPanel";
import { KEYBOARD_THEMES } from "./poster-modules/KeyboardPoster";
import { MUJI_TEMPLATES, getDefaultTemplateIdx } from "./poster-modules/MujiPoster";

const VIEW_OPTIONS: { id: ChartView; icon: typeof MapIcon; label: string }[] = [
  { id: "map", icon: MapIcon, label: "地图" },
  { id: "grid", icon: LayoutGrid, label: "网格" },
  { id: "bubble", icon: Shapes, label: "气泡" },
  { id: "artmap", icon: Palette, label: "风格" },
];

export function RightPanel() {
  const chartView = useMapStore((s) => s.chartView);
  const setChartView = useMapStore((s) => s.setChartView);
  const mapLevel = useMapStore((s) => s.mapLevel);
  const setMapLevel = useMapStore((s) => s.setMapLevel);
  const activePosterModule = useMapStore((s) => s.activePosterModule);
  const posterRatio = useMapStore((s) => s.posterRatio);
  const setPosterRatio = useMapStore((s) => s.setPosterRatio);
  const mujiConfigs = useMapStore((s) => s.mujiConfigs);
  const setMujiConfig = useMapStore((s) => s.setMujiConfig);
  const keyboardThemeIdx = useMapStore((s) => s.keyboardThemeIdx);
  const setKeyboardThemeIdx = useMapStore((s) => s.setKeyboardThemeIdx);
  const popBoardMode = useMapStore((s) => s.popBoardMode);
  const setPopBoardMode = useMapStore((s) => s.setPopBoardMode);
  const mujiTemplateIdx = useMapStore((s) => s.mujiTemplateIdx);
  const setMujiTemplateIdx = useMapStore((s) => s.setMujiTemplateIdx);
  const status = useFavoriteStore((s) => s.status);
  const favItems = useFavoriteStore((s) => s.items);

  const effectiveMujiIdx = useMemo(
    () => mujiTemplateIdx < 0 ? getDefaultTemplateIdx(favItems) : mujiTemplateIdx % MUJI_TEMPLATES.length,
    [mujiTemplateIdx, favItems],
  );
  const currentMujiTemplate = MUJI_TEMPLATES[effectiveMujiIdx];
  const currentMujiDefault = currentMujiTemplate.defaultConfig
    ? { ...DEFAULT_CONFIG, ...currentMujiTemplate.defaultConfig }
    : DEFAULT_CONFIG;
  const currentMujiConfig = mujiConfigs[currentMujiTemplate.id] ?? currentMujiDefault;

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
      <div className="h-full relative overflow-hidden">
        {/* Concave top-left notch */}
        <div
          className="absolute top-0 left-0 z-10"
          style={{ width: 192, height: 52 }}
        >
          <svg
            className="absolute inset-0 pointer-events-none"
            width="192"
            height="52"
            viewBox="0 0 192 52"
            fill="none"
          >
            <path
              d="M0 0H192C160 0 175 35.5 150 35.5H15.9714C7.13487 35.5 0 42.6635 0 51.5V0Z"
              fill="white"
            />
          </svg>

          {status === "done" && (
            <div
              className="absolute flex items-center justify-evenly"
              style={{ left: 16, top: 6, width: 128, height: 26 }}
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
              style={{ top: 21 - 13, left: 189 - 13 }}
            >
              {dlState === "loading" ? (
                <Loader2 size={12} className="animate-spin" />
              ) : dlState === "done" ? (
                <Check size={12} />
              ) : (
                <Download size={12} />
              )}
            </motion.button>
          ) : status === "done" && chartView === "map" && mapLevel.startsWith("country:") ? (
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
              style={{ top: 21 - 13, left: 189 - 13 }}
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
            {chartView === "artmap" && !hideBackground && (
              <motion.div
                key="artmap"
                className="absolute inset-0 p-3"
                initial={{ opacity: 0, scale: 0.97 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.97 }}
                transition={{ duration: 0.25, ease: "easeOut" }}
              >
                <CountryMapView />
              </motion.div>
            )}
          </AnimatePresence>

          {/* Poster preview — two-layer dock: white preview + gray controls */}
          <AnimatePresence>
            {inPosterMode && (
              <div className="absolute inset-0 z-10 flex flex-col items-center justify-center pointer-events-none">
                <motion.div
                  key="poster-area"
                  className="w-[calc(100%-24px)] mx-3 flex flex-col bg-neutral-100 rounded-2xl overflow-hidden origin-center"
                  style={{ height: "78%" }}
                  initial={{ opacity: 0, scale: 0.92 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.92 }}
                  transition={{ duration: 0.5, ease: "easeOut" }}
                >
                  {/* White preview area */}
                  <div className="flex-1 min-h-0 bg-white rounded-b-xl relative overflow-hidden">
                    <div className="absolute inset-0 flex items-center justify-center p-5">
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
                        {activePosterModule === "muji" && (
                          <div className="absolute inset-0 pointer-events-none">
                            <MapView />
                          </div>
                        )}
                        <PosterPreview />
                      </motion.div>
                    </div>
                  </div>

                  {/* Controls dock — ratio left, style right */}
                  <div className="shrink-0 px-2.5 py-1.5 flex items-center justify-between pointer-events-auto">
                    {/* Ratio buttons — layoutId morphing indicator */}
                    <div className="flex items-center gap-0.5">
                      {POSTER_RATIO_OPTIONS.map((ratio) => {
                        const isActive = posterRatio === ratio;
                        return (
                          <button
                            key={ratio}
                            onClick={() => setPosterRatio(ratio)}
                            className="relative px-2.5 py-1.5 rounded-lg text-[10px] font-medium cursor-pointer z-[1]"
                          >
                            {isActive && (
                              <motion.div
                                layoutId="poster-ratio-indicator"
                                className="absolute inset-0 bg-neutral-800 rounded-lg"
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

                    {/* Style buttons — module-specific, morphing indicator */}
                    {activePosterModule === "keyboard" && (
                      <div className="flex items-center gap-0.5">
                        {KEYBOARD_THEMES.map((t, i) => {
                          const isActive = keyboardThemeIdx === i;
                          return (
                            <button
                              key={t.id}
                              onClick={() => setKeyboardThemeIdx(i)}
                              className="relative flex items-center gap-1.5 px-2 py-1 rounded-lg text-[10px] font-medium cursor-pointer z-[1]"
                            >
                              {isActive && (
                                <motion.div
                                  layoutId="poster-style-indicator"
                                  className="absolute inset-0 bg-neutral-800 rounded-lg"
                                  transition={{ type: "spring", stiffness: 500, damping: 35 }}
                                />
                              )}
                              {/* Color tile preview */}
                              <span
                                className="relative z-[1] shrink-0 rounded overflow-hidden flex flex-wrap"
                                style={{
                                  width: 16, height: 16, gap: 1, padding: 1,
                                  backgroundColor: t.posterBg,
                                  border: "1px solid rgba(128,128,128,0.15)",
                                }}
                              >
                                {t.palette.caps.slice(0, 4).map((c, j) => (
                                  <span
                                    key={j}
                                    className="rounded-sm"
                                    style={{ width: 6, height: 6, backgroundColor: c }}
                                  />
                                ))}
                              </span>
                              <span
                                className={`relative z-[1] transition-colors duration-200 ${
                                  isActive ? "text-white" : "text-neutral-500"
                                }`}
                              >
                                {t.label}
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    )}

                    {activePosterModule === "muji" && (
                      <div className="flex items-center gap-0.5">
                        {MUJI_TEMPLATES.map((t, i) => {
                          const isActive = effectiveMujiIdx === i;
                          return (
                            <button
                              key={t.id}
                              onClick={() => setMujiTemplateIdx(i)}
                              className="relative px-2 py-1.5 rounded-lg text-[10px] font-medium cursor-pointer z-[1]"
                            >
                              {isActive && (
                                <motion.div
                                  layoutId="poster-style-indicator"
                                  className="absolute inset-0 bg-neutral-800 rounded-lg"
                                  transition={{ type: "spring", stiffness: 500, damping: 35 }}
                                />
                              )}
                              <span
                                className={`relative z-[1] transition-colors duration-200 ${
                                  isActive ? "text-white" : "text-neutral-500"
                                }`}
                              >
                                {t.label}
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    )}

                    {activePosterModule === "pop-board" && (() => {
                      const POP_MODES = [
                        { id: "cells" as const, label: "格子图" },
                        { id: "center" as const, label: "照片墙" },
                      ];
                      return (
                        <div className="flex items-center gap-0.5">
                          {POP_MODES.map((m) => {
                            const isActive = popBoardMode === m.id;
                            return (
                              <button
                                key={m.id}
                                onClick={() => setPopBoardMode(m.id)}
                                className="relative px-2.5 py-1.5 rounded-lg text-[10px] font-medium cursor-pointer z-[1]"
                              >
                                {isActive && (
                                  <motion.div
                                    layoutId="poster-style-indicator"
                                    className="absolute inset-0 bg-neutral-800 rounded-lg"
                                    transition={{ type: "spring", stiffness: 500, damping: 35 }}
                                  />
                                )}
                                <span
                                  className={`relative z-[1] transition-colors duration-200 ${
                                    isActive ? "text-white" : "text-neutral-500"
                                  }`}
                                >
                                  {m.label}
                                </span>
                              </button>
                            );
                          })}
                        </div>
                      );
                    })()}
                  </div>
                </motion.div>

                {/* Muji dev panel — floating over poster area */}
                {activePosterModule === "muji" && (
                  <div className="absolute top-2 right-2 z-20 w-56 pointer-events-auto">
                    <MujiPosterDevPanel
                      config={currentMujiConfig}
                      onChange={(c) => setMujiConfig(currentMujiTemplate.id, c)}
                      templateLabel={currentMujiTemplate.label}
                    />
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
