import { useCallback, useMemo, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import chinaGeoJson from "../../assets/china.json";
import { PRESETS } from "./presets";
import {
  buildProvinces,
  shortenName,
  parseSvgPath,
  rdpSimplify,
  applySmoothing,
  shrinkPolygon,
  pointsToPath,
  jitterPath,
  offsetStrokePath,
  darkenHex,
  getChoroplethColor,
} from "./map-utils";
import type {
  MapStylePreset,
  VisualEnhancements,
  StyleOverrides,
} from "./types";
import {
  DEFAULT_ENHANCEMENTS,
  DEFAULT_OVERRIDES,
} from "./types";
import { StylePanel } from "./StylePanel";

interface CountryMapViewProps {
  /** GeoJSON data to render. Defaults to China map */
  geoData?: { features: any[] };
  /** Initial preset ID */
  initialPreset?: string;
  /** Whether to show the style panel */
  showStylePanel?: boolean;
  /** Callback when a region is selected */
  onRegionSelect?: (name: string | null) => void;
  /** Callback when a region is hovered */
  onRegionHover?: (name: string | null) => void;
  /** Optional className for the container */
  className?: string;
}

export function CountryMapView({
  geoData,
  initialPreset = "neo-brutalism",
  showStylePanel = true,
  onRegionSelect,
  onRegionHover,
  className,
}: CountryMapViewProps) {
  const data = geoData ?? (chinaGeoJson as any);
  const { provinces, viewBox } = useMemo(
    () => buildProvinces(data),
    [data],
  );

  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);
  const [selectedIdx, setSelectedIdx] = useState<number | null>(null);
  const [showLabels, setShowLabels] = useState(true);
  const [activePresetId, setActivePresetId] = useState(initialPreset);
  const [overrides, setOverrides] = useState<StyleOverrides>(DEFAULT_OVERRIDES);
  const [enhancements, setEnhancements] =
    useState<VisualEnhancements>(DEFAULT_ENHANCEMENTS);

  const updateEnhancement = useCallback(
    <K extends keyof VisualEnhancements>(
      key: K,
      value: VisualEnhancements[K],
    ) => {
      setEnhancements((prev) => ({ ...prev, [key]: value }));
    },
    [],
  );

  const updateOverride = useCallback(
    <K extends keyof StyleOverrides>(key: K, value: StyleOverrides[K]) => {
      setOverrides((prev) => ({ ...prev, [key]: value }));
    },
    [],
  );

  const resetOverrides = useCallback(
    () => setOverrides(DEFAULT_OVERRIDES),
    [],
  );

  const hasOverrides = useMemo(() => {
    const o = overrides;
    return (
      o.fillColor !== null ||
      o.background !== null ||
      o.strokeColor !== null ||
      o.strokeWidth !== null ||
      o.shadowColor !== null ||
      o.shadowDepth !== null ||
      o.labelColor !== null ||
      o.glowEnabled ||
      o.tooltipBg !== null ||
      o.tooltipColor !== null
    );
  }, [overrides]);

  // Post-process provinces: simplify → smooth → gap → jitter
  const processedProvinces = useMemo(() => {
    const hasProcessing =
      enhancements.simplifyEnabled ||
      enhancements.smoothEnabled ||
      enhancements.gapEnabled ||
      enhancements.handDrawnEnabled;
    if (!hasProcessing) return provinces;
    return provinces.map((prov, provIdx) => ({
      ...prov,
      paths: prov.paths.map((d, pathIdx) => {
        let rings = parseSvgPath(d);
        if (enhancements.simplifyEnabled) {
          rings = rings.map((r) =>
            rdpSimplify(r, enhancements.simplifyTolerance),
          );
        }
        if (enhancements.smoothEnabled) {
          rings = rings.map((r) =>
            applySmoothing(
              r,
              enhancements.smoothAlgorithm,
              enhancements.smoothIterations,
            ),
          );
        }
        if (enhancements.gapEnabled) {
          rings = rings.map((r) => shrinkPolygon(r, enhancements.gapSize));
        }
        if (enhancements.handDrawnEnabled) {
          const seed =
            enhancements.handDrawnSeed + provIdx * 1000 + pathIdx * 100;
          rings = jitterPath(rings, enhancements.handDrawnJitter, seed);
        }
        return pointsToPath(rings);
      }),
    }));
  }, [
    provinces,
    enhancements.simplifyEnabled,
    enhancements.simplifyTolerance,
    enhancements.smoothEnabled,
    enhancements.smoothAlgorithm,
    enhancements.smoothIterations,
    enhancements.gapEnabled,
    enhancements.gapSize,
    enhancements.handDrawnEnabled,
    enhancements.handDrawnJitter,
    enhancements.handDrawnSeed,
  ]);

  // Generate double-stroke paths
  const doubleStrokePaths = useMemo(() => {
    if (!enhancements.handDrawnEnabled || !enhancements.handDrawnDoubleStroke)
      return null;
    return provinces.map((prov, provIdx) =>
      prov.paths.map((d, pathIdx) => {
        let rings = parseSvgPath(d);
        if (enhancements.simplifyEnabled) {
          rings = rings.map((r) =>
            rdpSimplify(r, enhancements.simplifyTolerance),
          );
        }
        if (enhancements.smoothEnabled) {
          rings = rings.map((r) =>
            applySmoothing(
              r,
              enhancements.smoothAlgorithm,
              enhancements.smoothIterations,
            ),
          );
        }
        if (enhancements.gapEnabled) {
          rings = rings.map((r) => shrinkPolygon(r, enhancements.gapSize));
        }
        const seed =
          enhancements.handDrawnSeed + provIdx * 1000 + pathIdx * 100;
        const offsetRings = offsetStrokePath(
          rings,
          enhancements.handDrawnDoubleStrokeOffset,
          seed,
        );
        return pointsToPath(
          jitterPath(
            offsetRings,
            enhancements.handDrawnJitter * 0.7,
            seed + 3333,
          ),
        );
      }),
    );
  }, [provinces, enhancements]);

  const basePreset = useMemo(
    () => PRESETS.find((p) => p.id === activePresetId) ?? PRESETS[0],
    [activePresetId],
  );

  // Merge overrides into preset
  const preset = useMemo((): MapStylePreset => {
    const o = overrides;
    const fill = o.fillColor;
    const provinceColors = fill
      ? Array(35).fill(fill)
      : basePreset.provinceColors;
    const hoverColors = fill
      ? Array(35).fill(darkenHex(fill, 0.12))
      : basePreset.hoverColors;
    const selectedColors = fill
      ? Array(35).fill(darkenHex(fill, 0.24))
      : basePreset.selectedColors;

    const solidDepth =
      o.shadowDepth !== null ? o.shadowDepth : basePreset.solidShadowDepth;

    const glowFilter = o.glowEnabled
      ? `drop-shadow(0 0 ${o.glowRadius}px ${o.glowColor || basePreset.strokeColor})`
      : undefined;

    return {
      ...basePreset,
      background: o.background ?? basePreset.background,
      provinceColors,
      hoverColors,
      selectedColors,
      strokeColor: o.strokeColor ?? basePreset.strokeColor,
      strokeWidth: o.strokeWidth ?? basePreset.strokeWidth,
      hoverStrokeWidth:
        o.strokeWidth != null
          ? o.strokeWidth + 0.8
          : basePreset.hoverStrokeWidth,
      shadowColor: o.shadowColor ?? basePreset.shadowColor,
      solidShadowDepth: solidDepth,
      hoverFilter: glowFilter ?? basePreset.hoverFilter,
      selectedFilter: glowFilter
        ? `${glowFilter} ${basePreset.selectedFilter || ""}`
        : basePreset.selectedFilter,
      labelColor: o.labelColor ?? basePreset.labelColor,
      labelHoverColor: o.labelColor
        ? darkenHex(o.labelColor, 0.3)
        : basePreset.labelHoverColor,
      tooltipBg: o.tooltipBg ?? basePreset.tooltipBg,
      tooltipColor: o.tooltipColor ?? basePreset.tooltipColor,
    };
  }, [basePreset, overrides]);

  const getColor = useCallback(
    (idx: number, state: "normal" | "hover" | "selected") => {
      if (enhancements.choroplethEnabled) {
        const val = enhancements.choroplethData[idx] ?? 50;
        if (state === "selected")
          return getChoroplethColor(
            Math.min(100, val + 20),
            enhancements.choroplethScale,
          );
        if (state === "hover")
          return getChoroplethColor(
            Math.min(100, val + 10),
            enhancements.choroplethScale,
          );
        return getChoroplethColor(val, enhancements.choroplethScale);
      }
      if (state === "selected")
        return preset.selectedColors[idx % preset.selectedColors.length];
      if (state === "hover")
        return preset.hoverColors[idx % preset.hoverColors.length];
      return preset.provinceColors[idx % preset.provinceColors.length];
    },
    [
      preset,
      enhancements.choroplethEnabled,
      enhancements.choroplethData,
      enhancements.choroplethScale,
    ],
  );

  const handleHover = useCallback(
    (idx: number | null) => {
      setHoveredIdx(idx);
      if (onRegionHover) {
        onRegionHover(idx !== null ? provinces[idx]?.name ?? null : null);
      }
    },
    [provinces, onRegionHover],
  );

  const handleClick = useCallback(
    (idx: number) => {
      const newIdx = selectedIdx === idx ? null : idx;
      setSelectedIdx(newIdx);
      if (onRegionSelect) {
        onRegionSelect(newIdx !== null ? provinces[newIdx]?.name ?? null : null);
      }
    },
    [selectedIdx, provinces, onRegionSelect],
  );

  const selectedProvince =
    selectedIdx !== null ? provinces[selectedIdx] : null;
  const hoveredProvince =
    hoveredIdx !== null ? provinces[hoveredIdx] : null;

  const handlePresetChange = useCallback(
    (presetId: string) => {
      setActivePresetId(presetId);
      setSelectedIdx(null);
      resetOverrides();
      const p = PRESETS.find((pr) => pr.id === presetId);
      if (p && p.id.startsWith("hand-drawn")) {
        setEnhancements((prev) => ({
          ...prev,
          handDrawnEnabled: true,
          handDrawnJitter:
            p.id === "hand-drawn-sketch"
              ? 1.0
              : p.id === "hand-drawn-blueprint"
                ? 0.6
                : 1.5,
          handDrawnDoubleStroke:
            p.id === "hand-drawn-sketch" ||
            p.id === "hand-drawn-blueprint",
          handDrawnDoubleStrokeOpacity: 0.2,
          textureType: p.id === "hand-drawn-sketch" ? "crosshatch" : "none",
          textureOpacity: 0.15,
          textureWeight: 0.5,
          noiseEnabled: true,
          noiseOpacity: 0.06,
        }));
      } else {
        setEnhancements((prev) => ({
          ...prev,
          handDrawnEnabled: false,
          handDrawnDoubleStroke: false,
        }));
      }
    },
    [resetOverrides],
  );

  return (
    <div className={`h-full flex ${className ?? ""}`}>
      {/* Map area */}
      <div className="flex-1 min-w-0 flex flex-col">
        <div
          className="flex-1 min-h-0 rounded-2xl overflow-hidden relative"
          style={{
            background: preset.background,
            transition: "background 0.3s",
          }}
        >
          <AnimatePresence mode="wait">
            <motion.div
              key={activePresetId}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.25 }}
              className="w-full h-full"
            >
              <svg viewBox={viewBox} className="w-full h-full">
                <defs>
                  {/* Inner shadow filter */}
                  {enhancements.innerShadowEnabled && (
                    <filter
                      id="inner-shadow"
                      x="-50%"
                      y="-50%"
                      width="200%"
                      height="200%"
                    >
                      <feComponentTransfer in="SourceAlpha">
                        <feFuncA type="table" tableValues="1 0" />
                      </feComponentTransfer>
                      <feGaussianBlur
                        stdDeviation={enhancements.innerShadowBlur}
                      />
                      <feFlood
                        floodColor={enhancements.innerShadowColor}
                        floodOpacity={enhancements.innerShadowOpacity}
                      />
                      <feComposite in2="SourceAlpha" operator="in" />
                      <feComposite operator="over" in2="SourceGraphic" />
                    </filter>
                  )}

                  {/* Texture patterns */}
                  {enhancements.textureType === "lines" &&
                    (() => {
                      const w = enhancements.textureWeight;
                      const sp = Math.max(3, w * 5);
                      return (
                        <pattern
                          id="tex-lines"
                          width={sp}
                          height={sp}
                          patternUnits="userSpaceOnUse"
                          patternTransform="rotate(45)"
                        >
                          <line
                            x1="0"
                            y1="0"
                            x2="0"
                            y2={sp}
                            stroke="#000"
                            strokeWidth={w}
                          />
                        </pattern>
                      );
                    })()}
                  {enhancements.textureType === "dots" &&
                    (() => {
                      const w = enhancements.textureWeight;
                      const sp = Math.max(3, w * 4);
                      return (
                        <pattern
                          id="tex-dots"
                          width={sp}
                          height={sp}
                          patternUnits="userSpaceOnUse"
                        >
                          <circle
                            cx={sp / 2}
                            cy={sp / 2}
                            r={w * 0.8}
                            fill="#000"
                          />
                        </pattern>
                      );
                    })()}
                  {enhancements.textureType === "crosshatch" &&
                    (() => {
                      const w = enhancements.textureWeight;
                      const sp = Math.max(3, w * 5);
                      return (
                        <pattern
                          id="tex-crosshatch"
                          width={sp}
                          height={sp}
                          patternUnits="userSpaceOnUse"
                        >
                          <line
                            x1="0"
                            y1="0"
                            x2={sp}
                            y2={sp}
                            stroke="#000"
                            strokeWidth={w * 0.6}
                          />
                          <line
                            x1={sp}
                            y1="0"
                            x2="0"
                            y2={sp}
                            stroke="#000"
                            strokeWidth={w * 0.6}
                          />
                        </pattern>
                      );
                    })()}

                  {/* Inverse mask for text repeat */}
                  {enhancements.textRepeatEnabled && (
                    <mask id="map-inverse-mask">
                      <rect
                        x="-50%"
                        y="-50%"
                        width="200%"
                        height="200%"
                        fill="white"
                      />
                      {processedProvinces.map((prov, idx) =>
                        prov.paths.map((d, pi) => (
                          <path key={`${idx}-${pi}`} d={d} fill="black" />
                        )),
                      )}
                    </mask>
                  )}

                  {/* Text repeat pattern */}
                  {enhancements.textRepeatEnabled &&
                    enhancements.textRepeatContent &&
                    (() => {
                      const size = enhancements.textRepeatSize;
                      const gap = enhancements.textRepeatGap;
                      const cellW = Math.max(
                        20,
                        enhancements.textRepeatContent.length * size * 0.6 +
                          size * gap,
                      );
                      const cellH = size * (1.4 + gap * 0.6);
                      return (
                        <pattern
                          id="text-repeat-pat"
                          width={cellW}
                          height={cellH * 2}
                          patternUnits="userSpaceOnUse"
                          patternTransform={`rotate(${enhancements.textRepeatAngle})`}
                        >
                          <text
                            x={0}
                            y={size}
                            fontSize={size}
                            fill={enhancements.textRepeatColor}
                            fontWeight={600}
                            fontFamily="system-ui, sans-serif"
                          >
                            {enhancements.textRepeatContent}
                          </text>
                          <text
                            x={cellW / 2}
                            y={size + cellH}
                            fontSize={size}
                            fill={enhancements.textRepeatColor}
                            fontWeight={600}
                            fontFamily="system-ui, sans-serif"
                          >
                            {enhancements.textRepeatContent}
                          </text>
                        </pattern>
                      );
                    })()}
                </defs>

                {/* Solid-extrusion shadows */}
                {preset.solidShadowDepth &&
                  preset.solidShadowDepth > 0 &&
                  Array.from(
                    { length: preset.solidShadowDepth },
                    (_, layerIdx) => {
                      const offset = layerIdx + 1;
                      return (
                        <g
                          key={`solid-layer-${layerIdx}`}
                          style={{ pointerEvents: "none" }}
                        >
                          {processedProvinces.map((prov, idx) => (
                            <g key={idx}>
                              {prov.paths.map((d, pi) => (
                                <path
                                  key={pi}
                                  d={d}
                                  fill={preset.shadowColor || "#000"}
                                  stroke={preset.shadowColor || "#000"}
                                  strokeWidth={0.5}
                                  style={{
                                    transform: `translate(${offset}px, ${offset}px)`,
                                  }}
                                />
                              ))}
                            </g>
                          ))}
                        </g>
                      );
                    },
                  )}

                {/* Single-offset shadow (neo-brutalism) */}
                {!preset.solidShadowDepth &&
                  preset.shadowOffset &&
                  processedProvinces.map((prov, idx) => (
                    <g key={`shadow-${idx}`}>
                      {prov.paths.map((d, pi) => (
                        <path
                          key={pi}
                          d={d}
                          fill={preset.shadowColor || "#000"}
                          style={{
                            transform: `translate(${preset.shadowOffset![0]}px, ${preset.shadowOffset![1]}px)`,
                            pointerEvents: "none",
                          }}
                        />
                      ))}
                    </g>
                  ))}

                {/* Province fills */}
                {processedProvinces.map((prov, idx) => {
                  const isHovered = hoveredIdx === idx;
                  const isSelected = selectedIdx === idx;
                  const state = isSelected
                    ? "selected"
                    : isHovered
                      ? "hover"
                      : "normal";
                  const strokeW =
                    isHovered || isSelected
                      ? preset.hoverStrokeWidth
                      : preset.strokeWidth;
                  const strokeC =
                    (isHovered || isSelected) && preset.hoverStrokeColor
                      ? preset.hoverStrokeColor
                      : preset.strokeColor;
                  const filterVal = isSelected
                    ? preset.selectedFilter
                    : isHovered
                      ? preset.hoverFilter
                      : undefined;
                  const origCenter = provinces[idx]?.center ?? prov.center;

                  return (
                    <g key={idx} style={{ filter: filterVal }}>
                      {prov.paths.map((d, pi) => (
                        <path
                          key={pi}
                          d={d}
                          fill={getColor(idx, state)}
                          stroke={strokeC}
                          strokeWidth={strokeW}
                          strokeDasharray={preset.strokeDasharray}
                          strokeLinecap={
                            enhancements.handDrawnEnabled
                              ? "round"
                              : undefined
                          }
                          strokeLinejoin={
                            enhancements.handDrawnEnabled
                              ? "round"
                              : undefined
                          }
                          filter={
                            enhancements.innerShadowEnabled
                              ? "url(#inner-shadow)"
                              : undefined
                          }
                          style={{
                            cursor: "pointer",
                            transition:
                              "fill 0.15s, stroke-width 0.15s, stroke 0.15s",
                          }}
                          onMouseEnter={() => handleHover(idx)}
                          onMouseLeave={() => handleHover(null)}
                          onClick={() => handleClick(idx)}
                        />
                      ))}
                      {/* Texture overlay */}
                      {enhancements.textureType !== "none" &&
                        prov.paths.map((d, pi) => (
                          <path
                            key={`tex-${pi}`}
                            d={d}
                            fill={`url(#tex-${enhancements.textureType})`}
                            opacity={enhancements.textureOpacity}
                            style={{ pointerEvents: "none" }}
                          />
                        ))}
                      {showLabels && (
                        <text
                          x={origCenter[0]}
                          y={origCenter[1]}
                          textAnchor="middle"
                          dominantBaseline="central"
                          fill={
                            isHovered || isSelected
                              ? preset.labelHoverColor
                              : preset.labelColor
                          }
                          fontSize={
                            isHovered || isSelected
                              ? preset.labelHoverFontSize
                              : preset.labelFontSize
                          }
                          fontWeight={isHovered || isSelected ? 600 : 400}
                          style={{
                            pointerEvents: "none",
                            transition: "font-size 0.15s, fill 0.15s",
                            userSelect: "none",
                          }}
                        >
                          {shortenName(prov.name)}
                        </text>
                      )}
                    </g>
                  );
                })}

                {/* Hand-drawn double stroke overlay */}
                {doubleStrokePaths &&
                  processedProvinces.map((prov, idx) => (
                    <g
                      key={`dbl-${idx}`}
                      style={{ pointerEvents: "none" }}
                    >
                      {prov.paths.map((_d, pi) => (
                        <path
                          key={pi}
                          d={doubleStrokePaths[idx]?.[pi] ?? ""}
                          fill="none"
                          stroke={preset.strokeColor}
                          strokeWidth={preset.strokeWidth * 0.6}
                          opacity={
                            enhancements.handDrawnDoubleStrokeOpacity
                          }
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      ))}
                    </g>
                  ))}

                {/* Text repeat */}
                {enhancements.textRepeatEnabled &&
                  enhancements.textRepeatContent && (
                    <rect
                      x="-50%"
                      y="-50%"
                      width="200%"
                      height="200%"
                      fill="url(#text-repeat-pat)"
                      opacity={enhancements.textRepeatOpacity}
                      mask="url(#map-inverse-mask)"
                      style={{ pointerEvents: "none" }}
                    />
                  )}
              </svg>
            </motion.div>
          </AnimatePresence>

          {/* Noise texture overlay */}
          {enhancements.noiseEnabled && (
            <svg
              className="absolute inset-0 w-full h-full pointer-events-none"
              style={{ mixBlendMode: "overlay" }}
            >
              <defs>
                <filter id="bg-noise">
                  <feTurbulence
                    type="fractalNoise"
                    baseFrequency={0.65 * enhancements.noiseScale}
                    numOctaves={4}
                    stitchTiles="stitch"
                  />
                </filter>
              </defs>
              <rect
                width="100%"
                height="100%"
                filter="url(#bg-noise)"
                opacity={enhancements.noiseOpacity}
              />
            </svg>
          )}

          {/* Vignette overlay */}
          {enhancements.vignetteEnabled && (
            <div
              className="absolute inset-0 pointer-events-none"
              style={{
                background: `radial-gradient(ellipse at center, transparent 30%, rgba(0,0,0,${enhancements.vignetteIntensity}) 100%)`,
              }}
            />
          )}

          {/* Hover tooltip */}
          {hoveredProvince && (
            <div
              className="absolute top-4 left-4 backdrop-blur-sm rounded-xl px-3 py-2 pointer-events-none"
              style={{
                background: preset.tooltipBg,
                color: preset.tooltipColor,
              }}
            >
              <div className="text-[11px] font-semibold">
                {hoveredProvince.name}
              </div>
            </div>
          )}

          {/* Preset name badge */}
          <div
            className="absolute bottom-4 right-4 rounded-lg px-2.5 py-1 pointer-events-none"
            style={{
              background: preset.tooltipBg,
              color: preset.tooltipColor,
            }}
          >
            <div className="text-[9px] font-medium">{preset.nameCN}</div>
          </div>
        </div>
      </div>

      {/* Style panel */}
      {showStylePanel && (
        <div className="w-60 shrink-0 ml-4 flex flex-col min-h-0">
          <div className="flex-1 min-h-0 overflow-y-auto">
            <StylePanel
              activePresetId={activePresetId}
              onPresetChange={handlePresetChange}
              overrides={overrides}
              onOverrideChange={updateOverride}
              hasOverrides={hasOverrides}
              onResetOverrides={resetOverrides}
              enhancements={enhancements}
              onEnhancementChange={updateEnhancement}
              showLabels={showLabels}
              onShowLabelsChange={setShowLabels}
              preset={preset}
              selectedProvince={selectedProvince}
            />
          </div>
        </div>
      )}
    </div>
  );
}
