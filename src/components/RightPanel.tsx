import { useRef, useState, useCallback, useMemo } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Map as MapIcon, LayoutGrid, Shapes, ArrowLeft, Download, Loader2, Check, Layers } from "lucide-react";
import { Tooltip } from "./Tooltip";
import { MapView } from "./MapView";
import { GridView } from "./GridView";
import { BubbleCluster } from "./BubbleCluster";
import { StatusBar } from "./StatusBar";
import { RouteStopList } from "./RouteStopList";
import { PosterModuleBar } from "./PosterModuleBar";
import { PosterPreview } from "./PosterPreview";
import { useMapStore, type ChartView } from "../stores/useMapStore";
import { useFavoriteStore } from "../stores/useFavoriteStore";
import { invoke } from "@tauri-apps/api/core";
import { posterStageRef, saveKonvaPosterToDownloads } from "../lib/poster-stage";
import { getPosterModule, posterModules, POSTER_RATIOS, POSTER_RATIO_OPTIONS } from "../lib/poster-modules";
import { MujiPosterDevPanel, DEFAULT_CONFIG } from "./poster-modules/MujiPosterDevPanel";
import { KEYBOARD_THEMES, KEYBOARD_STYLES } from "./poster-modules/KeyboardPoster";
import { PATTERN_STYLES } from "./poster-modules/PatternCardPoster";
import { MUJI_TEMPLATES, getDefaultTemplateIdx } from "./poster-modules/MujiPoster";
import { MOSAIC_THEMES, deriveMosaicPalette, MOSAIC_STYLES } from "./poster-modules/GridMosaicPoster";
import { derivePopBoardPalette, hslToHex } from "./poster-modules/PopBoardPoster";
import { DATA_POSTCARD_STYLES } from "./poster-modules/DataPostcardPoster";
import { deriveMujiColors } from "./poster-modules/MujiPoster";

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
  const setActivePosterModule = useMapStore((s) => s.setActivePosterModule);
  const posterRatio = useMapStore((s) => s.posterRatio);
  const setPosterRatio = useMapStore((s) => s.setPosterRatio);
  const mujiConfigs = useMapStore((s) => s.mujiConfigs);
  const setMujiConfig = useMapStore((s) => s.setMujiConfig);
  const keyboardThemeIdx = useMapStore((s) => s.keyboardThemeIdx);
  const setKeyboardThemeIdx = useMapStore((s) => s.setKeyboardThemeIdx);
  const patternStyleIdx = useMapStore((s) => s.patternStyleIdx);
  const setPatternStyleIdx = useMapStore((s) => s.setPatternStyleIdx);
  const popBoardMode = useMapStore((s) => s.popBoardMode);
  const setPopBoardMode = useMapStore((s) => s.setPopBoardMode);
  const mujiTemplateIdx = useMapStore((s) => s.mujiTemplateIdx);
  const setMujiTemplateIdx = useMapStore((s) => s.setMujiTemplateIdx);
  const mosaicThemeIdx = useMapStore((s) => s.mosaicThemeIdx);
  const setMosaicThemeIdx = useMapStore((s) => s.setMosaicThemeIdx);
  const popBoardHue = useMapStore((s) => s.popBoardHue);
  const setPopBoardHue = useMapStore((s) => s.setPopBoardHue);
  const mujiHue = useMapStore((s) => s.mujiHue);
  const setMujiHue = useMapStore((s) => s.setMujiHue);
  const mosaicHue = useMapStore((s) => s.mosaicHue);
  const setMosaicHue = useMapStore((s) => s.setMosaicHue);
  const mosaicStyleIdx = useMapStore((s) => s.mosaicStyleIdx);
  const setMosaicStyleIdx = useMapStore((s) => s.setMosaicStyleIdx);
  const dataPostcardHue = useMapStore((s) => s.dataPostcardHue);
  const setDataPostcardHue = useMapStore((s) => s.setDataPostcardHue);
  const dataPostcardStyleIdx = useMapStore((s) => s.dataPostcardStyleIdx);
  const setDataPostcardStyleIdx = useMapStore((s) => s.setDataPostcardStyleIdx);
  const keyboardStyleIdx = useMapStore((s) => s.keyboardStyleIdx);
  const setKeyboardStyleIdx = useMapStore((s) => s.setKeyboardStyleIdx);
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
  const [showModuleBar, setShowModuleBar] = useState(false);

  const handlePosterDownload = useCallback(async () => {
    if (!activePosterModule || dlState === "loading") return;
    const mod = getPosterModule(activePosterModule);
    if (!mod) return;

    setDlState("loading");
    try {
      const timestamp = new Date().toISOString().slice(0, 10);
      const filename = `觅途-${mod.name}-${timestamp}.png`;

      if (activePosterModule === "muji" && posterRef.current) {
        // MujiPoster = DOM dot-matrix map (watermark) + Konva (text).
        // Direct canvas compositing — avoids html2canvas which is extremely
        // slow on the complex SVG/canvas WorldMap DOM.
        const rect = posterRef.current.getBoundingClientRect();
        const W = rect.width;
        const H = rect.height;
        const dpr = 3;

        const output = document.createElement("canvas");
        output.width = Math.round(W * dpr);
        output.height = Math.round(H * dpr);
        const ctx = output.getContext("2d")!;
        ctx.scale(dpr, dpr);

        // White background
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(0, 0, W, H);

        // Replicate CSS `opacity: 0.18` on the parent: composite dots + avatars
        // at full opacity on an offscreen canvas, then stamp it at 0.18.
        const offscreen = document.createElement("canvas");
        offscreen.width = output.width;
        offscreen.height = output.height;
        const oCtx = offscreen.getContext("2d")!;
        oCtx.scale(dpr, dpr);

        // 1) Dot-matrix map (full opacity on offscreen)
        const dotCanvas = posterRef.current.querySelector(".muji-map-bg canvas") as HTMLCanvasElement | null;
        if (dotCanvas) {
          oCtx.drawImage(dotCanvas, 0, 0, W, H);
        }

        // 2) City avatars on top of dots (white border + circular clip)
        const avatarEls = posterRef.current.querySelectorAll<HTMLElement>(".muji-map-bg [data-city]");
        for (const el of avatarEls) {
          const img = el.querySelector("img") as HTMLImageElement | null;
          if (!img?.complete || !img.naturalWidth) continue;
          const elRect = el.getBoundingClientRect();
          const x = elRect.left - rect.left;
          const y = elRect.top - rect.top;
          const s = elRect.width;
          const r = s / 2;
          // White border (2px visible border)
          oCtx.save();
          oCtx.beginPath();
          oCtx.arc(x + r, y + r, r, 0, Math.PI * 2);
          oCtx.fillStyle = "rgba(255,255,255,0.9)";
          oCtx.fill();
          // Clip image to slightly smaller circle (inset by border)
          const border = 2;
          oCtx.beginPath();
          oCtx.arc(x + r, y + r, r - border, 0, Math.PI * 2);
          oCtx.clip();
          oCtx.drawImage(img, x + border, y + border, s - border * 2, s - border * 2);
          oCtx.restore();
        }

        // 3) Stamp offscreen onto output at 0.18 opacity
        ctx.globalAlpha = 0.18;
        ctx.drawImage(offscreen, 0, 0, W, H);
        ctx.globalAlpha = 1;

        // Draw Konva text layer on top
        if (posterStageRef.current) {
          const konvaCanvas = posterStageRef.current.toCanvas({ pixelRatio: dpr });
          ctx.drawImage(konvaCanvas, 0, 0, W, H);
        }

        // Export composite
        const blob = await new Promise<Blob>((res) => output.toBlob((b) => res(b!), "image/png"));
        const buf = await blob.arrayBuffer();
        const data = Array.from(new Uint8Array(buf));
        await invoke("save_image_to_downloads", { data, filename });
      } else if (posterStageRef.current) {
        // All other modules: Konva native export
        await saveKonvaPosterToDownloads(posterStageRef.current, mod.name);
      }

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
                  <Tooltip key={opt.id} label={opt.label}>
                    <button
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
                  </Tooltip>
                );
              })}
            </div>
          )}
        </div>

        {/* Action button in notch area */}
        <AnimatePresence mode="wait">
          {inPosterMode ? (
            <Tooltip
              label={dlState === "done" ? "已保存" : "保存海报"}
              className="absolute z-[11] inline-flex"
              style={{ top: 21 - 13, left: 189 - 13 }}
            >
              <motion.button
                key="poster-download"
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                transition={{ type: "spring", stiffness: 500, damping: 30 }}
                whileTap={{ scale: 0.9 }}
                onClick={handlePosterDownload}
                disabled={dlState === "loading"}
                className={`flex items-center justify-center
                           w-[26px] h-[26px] rounded-full cursor-pointer
                           transition-colors duration-200
                           ${dlState === "done"
                             ? "bg-emerald-500 text-white"
                             : "bg-neutral-800 text-white hover:bg-neutral-700"
                           }`}
              >
                {dlState === "loading" ? (
                  <Loader2 size={12} className="animate-spin" />
                ) : dlState === "done" ? (
                  <Check size={12} />
                ) : (
                  <Download size={12} />
                )}
              </motion.button>
            </Tooltip>
          ) : status === "done" && chartView === "map" && mapLevel.startsWith("country:") ? (
            <Tooltip
              label="返回世界地图"
              className="absolute z-[11] inline-flex"
              style={{ top: 21 - 13, left: 189 - 13 }}
            >
              <motion.button
                key="map-back"
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                transition={{ type: "spring", stiffness: 500, damping: 30 }}
                onClick={() => setMapLevel("world")}
                className="flex items-center justify-center
                           w-[26px] h-[26px] rounded-full
                           text-white hover:text-black
                           transition-colors cursor-pointer"
              >
                <ArrowLeft size={16} strokeWidth={2.5} />
              </motion.button>
            </Tooltip>
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

          {/* Poster overlay — module bar + preview */}
          <div
            className="absolute inset-0 z-10 flex flex-col pointer-events-none"
            style={{ padding: "56px 12px 12px" }}
          >
            {/* Module bar — lightweight, left-aligned above poster */}
            <div className="shrink-0 mb-1.5 pointer-events-auto">
              <PosterModuleBar open={showModuleBar} />
            </div>

            {/* Poster preview — fills remaining space */}
            <AnimatePresence>
              {inPosterMode && (
                <motion.div
                  key="poster-area"
                  className="flex-1 min-h-0 flex flex-col bg-neutral-100 rounded-2xl overflow-hidden origin-center"
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
                          <div className="absolute inset-0 pointer-events-none muji-map-bg">
                            {/* Sharp map at low opacity — watermark on premium paper, colors preserved */}
                            <div
                              className="absolute inset-0"
                              style={{ opacity: 0.18 }}
                            >
                              <MapView />
                            </div>
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
                        {KEYBOARD_STYLES.map((s, i) => {
                          const isActive = keyboardStyleIdx === i;
                          return (
                            <button
                              key={s.id}
                              onClick={() => setKeyboardStyleIdx(i)}
                              className="relative px-2.5 py-1.5 rounded-lg text-[10px] font-medium cursor-pointer z-[1]"
                            >
                              {isActive && (
                                <motion.div
                                  layoutId="keyboard-style-indicator"
                                  className="absolute inset-0 bg-neutral-800 rounded-lg"
                                  transition={{ type: "spring", stiffness: 500, damping: 35 }}
                                />
                              )}
                              <span
                                className={`relative z-[1] transition-colors duration-200 ${
                                  isActive ? "text-white" : "text-neutral-500"
                                }`}
                              >
                                {s.label}
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    )}

                    {activePosterModule === "keyboard" && (
                      <div className="flex items-center gap-0.5 ml-2 pl-2 border-l border-neutral-200">
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

                    {activePosterModule === "pattern" && (
                      <div className="flex items-center">
                        {PATTERN_STYLES.map((s, i) => {
                          const isActive = patternStyleIdx === i;
                          const isBrutal = s.id === "brutalism";
                          return (
                            <button
                              key={s.id}
                              onClick={() => setPatternStyleIdx(i)}
                              className="relative flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-medium cursor-pointer z-[1]"
                            >
                              {isActive && (
                                <motion.div
                                  layoutId="pattern-style-pill"
                                  className="absolute inset-0 bg-neutral-800 rounded-lg"
                                  transition={{ type: "spring", stiffness: 500, damping: 35 }}
                                />
                              )}
                              {/* Style mini preview */}
                              <svg
                                className="relative z-[1] shrink-0"
                                width="16" height="16" viewBox="0 0 16 16" fill="none"
                              >
                                {isBrutal ? (<>
                                  {/* Brutalism: thick border + offset shadow */}
                                  <rect x="1" y="1" width="12" height="12" rx="2" fill="#FDFDFD" stroke="#000" strokeWidth="1.5" />
                                  <rect x="3" y="3" width="12" height="12" rx="2" fill="#FDFDFD" stroke="#000" strokeWidth="1.5" />
                                  <circle cx="9" cy="9" r="3" fill="#4361EE" stroke="#000" strokeWidth="1" />
                                </>) : (<>
                                  {/* Flat: clean thin border */}
                                  <rect x="1.5" y="1.5" width="13" height="13" rx="2" fill="#FDFDFD" stroke="#1a1a1a" strokeWidth="1" />
                                  <circle cx="8" cy="8" r="3" fill="none" stroke="#1a1a1a" strokeWidth="1" />
                                </>)}
                              </svg>
                              <span
                                className={`relative z-[1] transition-colors duration-200 ${
                                  isActive ? "text-white" : "text-neutral-500"
                                }`}
                              >
                                {s.label}
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    )}

                    {activePosterModule === "grid-mosaic" && (
                      <div className="flex items-center">
                        {MOSAIC_THEMES.map((t, i) => {
                          const isActive = mosaicThemeIdx === i;
                          return (
                            <button
                              key={t.id}
                              onClick={() => setMosaicThemeIdx(i)}
                              className="relative flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-medium cursor-pointer z-[1]"
                            >
                              {isActive && (
                                <motion.div
                                  layoutId="poster-style-indicator"
                                  className="absolute inset-0 bg-neutral-800 rounded-lg"
                                  transition={{ type: "spring", stiffness: 500, damping: 35 }}
                                />
                              )}
                              {/* Pattern mini preview */}
                              <svg
                                className="relative z-[1] shrink-0"
                                width="16" height="16" viewBox="0 0 16 16" fill="none"
                              >
                                <rect x="1" y="1" width="14" height="14" rx="2"
                                  fill={isActive ? "#555" : "#e5e5e5"}
                                  stroke={isActive ? "#999" : "#aaa"} strokeWidth="0.8"
                                />
                                {t.id === "stripe" && (<>
                                  <line x1="4" y1="14" x2="14" y2="4" stroke={isActive ? "#fff" : "#666"} strokeWidth="1" opacity="0.6" />
                                  <line x1="1" y1="12" x2="12" y2="1" stroke={isActive ? "#fff" : "#666"} strokeWidth="1" opacity="0.6" />
                                  <line x1="1" y1="8" x2="8" y2="1" stroke={isActive ? "#fff" : "#666"} strokeWidth="1" opacity="0.6" />
                                  <line x1="1" y1="4" x2="4" y2="1" stroke={isActive ? "#fff" : "#666"} strokeWidth="1" opacity="0.6" />
                                  <line x1="8" y1="15" x2="15" y2="8" stroke={isActive ? "#fff" : "#666"} strokeWidth="1" opacity="0.6" />
                                </>)}
                                {t.id === "dot" && (<>
                                  <circle cx="5" cy="5" r="1.2" fill={isActive ? "#fff" : "#666"} opacity="0.6" />
                                  <circle cx="11" cy="5" r="1.2" fill={isActive ? "#fff" : "#666"} opacity="0.6" />
                                  <circle cx="5" cy="11" r="1.2" fill={isActive ? "#fff" : "#666"} opacity="0.6" />
                                  <circle cx="11" cy="11" r="1.2" fill={isActive ? "#fff" : "#666"} opacity="0.6" />
                                  <circle cx="8" cy="8" r="1.2" fill={isActive ? "#fff" : "#666"} opacity="0.6" />
                                </>)}
                              </svg>
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

                    {/* ── Color palette selectors ── */}
                    {/* ── Hue sliders ── */}
                    {activePosterModule === "pop-board" && (
                      <div className="ml-2 pl-2 border-l border-neutral-200">
                        <input type="range" min={0} max={359} value={popBoardHue}
                          onChange={(e) => setPopBoardHue(Number(e.target.value))}
                          className="hue-slider w-16"
                          style={{ "--hue-thumb": derivePopBoardPalette(popBoardHue).primary } as React.CSSProperties} />
                      </div>
                    )}

                    {activePosterModule === "grid-mosaic" && (
                      <div className="ml-2 pl-2 border-l border-neutral-200">
                        <input type="range" min={0} max={359} value={mosaicHue}
                          onChange={(e) => setMosaicHue(Number(e.target.value))}
                          className="hue-slider w-16"
                          style={{ "--hue-thumb": deriveMosaicPalette(mosaicHue).accent } as React.CSSProperties} />
                      </div>
                    )}

                    {activePosterModule === "grid-mosaic" && (
                      <div className="flex items-center gap-0.5 ml-2 pl-2 border-l border-neutral-200">
                        {MOSAIC_STYLES.map((s, i) => {
                          const isActive = mosaicStyleIdx === i;
                          return (
                            <button key={s.id} onClick={() => setMosaicStyleIdx(i)}
                              className="relative px-2 py-1 rounded-lg text-[10px] font-medium cursor-pointer z-[1]">
                              {isActive && <motion.div layoutId="mosaic-style-pill" className="absolute inset-0 bg-neutral-800 rounded-lg" transition={{ type: "spring", stiffness: 500, damping: 35 }} />}
                              <span className={`relative z-[1] transition-colors duration-200 ${isActive ? "text-white" : "text-neutral-500"}`}>{s.label}</span>
                            </button>
                          );
                        })}
                      </div>
                    )}

                    {activePosterModule === "data-postcard" && (
                      <div className="ml-2 pl-2 border-l border-neutral-200">
                        <input type="range" min={0} max={359} value={dataPostcardHue}
                          onChange={(e) => setDataPostcardHue(Number(e.target.value))}
                          className="hue-slider w-16"
                          style={{ "--hue-thumb": hslToHex(dataPostcardHue, 70, 52) } as React.CSSProperties} />
                      </div>
                    )}

                    {activePosterModule === "data-postcard" && (
                      <div className="flex items-center gap-0.5 ml-2 pl-2 border-l border-neutral-200">
                        {DATA_POSTCARD_STYLES.map((s, i) => {
                          const isActive = dataPostcardStyleIdx === i;
                          return (
                            <button key={s.id} onClick={() => setDataPostcardStyleIdx(i)}
                              className="relative px-2 py-1 rounded-lg text-[10px] font-medium cursor-pointer z-[1]">
                              {isActive && <motion.div layoutId="datapc-style-pill" className="absolute inset-0 bg-neutral-800 rounded-lg" transition={{ type: "spring", stiffness: 500, damping: 35 }} />}
                              <span className={`relative z-[1] transition-colors duration-200 ${isActive ? "text-white" : "text-neutral-500"}`}>{s.label}</span>
                            </button>
                          );
                        })}
                      </div>
                    )}

                    {activePosterModule === "muji" && (
                      <div className="ml-2 pl-2 border-l border-neutral-200">
                        <input type="range" min={0} max={359} value={mujiHue}
                          onChange={(e) => setMujiHue(Number(e.target.value))}
                          className="hue-slider w-16"
                          style={{ "--hue-thumb": deriveMujiColors(mujiHue).textColor } as React.CSSProperties} />
                      </div>
                    )}

                  </div>
                </motion.div>
              )}
            </AnimatePresence>

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

          {/* Module bar toggle — inside content card, top-right */}
          <AnimatePresence>
            {status === "done" && chartView === "map" && favItems.length > 0 && (
              <Tooltip
                label={showModuleBar ? "关闭海报" : "海报模式"}
                side="bottom"
                className="absolute z-[11] top-2.5 right-2.5 inline-flex"
              >
                <motion.button
                  key="module-bar-toggle"
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                  transition={{ type: "spring", stiffness: 500, damping: 30 }}
                  whileTap={{ scale: 0.9 }}
                  onClick={() => {
                    const next = !showModuleBar;
                    setShowModuleBar(next);
                    if (next) {
                      if (!activePosterModule) {
                        setActivePosterModule(posterModules[0].id);
                      }
                    } else {
                      setActivePosterModule(null);
                    }
                  }}
                  className={`flex items-center justify-center
                             w-[26px] h-[26px] rounded-full cursor-pointer
                             transition-colors duration-200
                             ${showModuleBar
                               ? "bg-neutral-800 text-white"
                               : "text-neutral-400 hover:text-neutral-600"
                             }`}
                >
                  <Layers size={12} strokeWidth={2} />
                </motion.button>
              </Tooltip>
            )}
          </AnimatePresence>

          {!inPosterMode && chartView === "map" && <RouteStopList />}
          {!inPosterMode && <StatusBar />}
        </div>
      </div>
    </div>
  );
}
