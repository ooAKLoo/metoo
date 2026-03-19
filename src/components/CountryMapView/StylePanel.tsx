import type {
  MapStylePreset,
  VisualEnhancements,
  StyleOverrides,
  ProvinceData,
  SmoothAlgorithm,
} from "./types";
import { PRESETS } from "./presets";
import { toHex6, getChoroplethColor } from "./map-utils";

const sliderClass =
  "w-full h-1 bg-neutral-200 rounded-full appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-2.5 [&::-webkit-slider-thumb]:h-2.5 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-neutral-800";

interface StylePanelProps {
  activePresetId: string;
  onPresetChange: (id: string) => void;
  overrides: StyleOverrides;
  onOverrideChange: <K extends keyof StyleOverrides>(
    key: K,
    value: StyleOverrides[K],
  ) => void;
  hasOverrides: boolean;
  onResetOverrides: () => void;
  enhancements: VisualEnhancements;
  onEnhancementChange: <K extends keyof VisualEnhancements>(
    key: K,
    value: VisualEnhancements[K],
  ) => void;
  showLabels: boolean;
  onShowLabelsChange: (show: boolean) => void;
  preset: MapStylePreset;
  selectedProvince: ProvinceData | null;
}

export function StylePanel({
  activePresetId,
  onPresetChange,
  overrides,
  onOverrideChange,
  hasOverrides,
  onResetOverrides,
  enhancements,
  onEnhancementChange,
  showLabels,
  onShowLabelsChange,
  preset,
  selectedProvince,
}: StylePanelProps) {
  return (
    <div className="bg-neutral-100 rounded-2xl p-3 space-y-2">
      {/* Style presets grid */}
      <div className="bg-white rounded-xl p-3">
        <div className="text-[9px] font-medium text-neutral-400 uppercase tracking-wide mb-2">
          Style Preset
        </div>
        <div className="grid grid-cols-2 gap-1.5">
          {PRESETS.map((p) => {
            const isActive = activePresetId === p.id;
            return (
              <button
                key={p.id}
                onClick={() => onPresetChange(p.id)}
                className={`relative flex flex-col items-start gap-1 p-2 rounded-lg transition-all ${
                  isActive
                    ? "ring-2 ring-neutral-800 ring-offset-1"
                    : "hover:bg-neutral-50"
                }`}
              >
                <div className="flex gap-0.5">
                  {p.swatchColors.map((c, ci) => (
                    <div
                      key={ci}
                      className="w-4 h-4 rounded"
                      style={{ backgroundColor: c }}
                    />
                  ))}
                </div>
                <span className="text-[9px] font-medium text-neutral-600 leading-tight">
                  {p.nameCN}
                </span>
                <span className="text-[8px] text-neutral-400 leading-tight">
                  {p.name}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Style Controls */}
      <div className="bg-white rounded-xl p-3">
        <div className="flex items-center justify-between mb-2">
          <div className="text-[9px] font-medium text-neutral-400 uppercase tracking-wide">
            Style Controls
          </div>
          {hasOverrides && (
            <button
              onClick={onResetOverrides}
              className="text-[8px] text-neutral-400 hover:text-neutral-600 transition-colors"
            >
              Reset
            </button>
          )}
        </div>
        <div className="space-y-3">
          {/* Fill color */}
          <div className="flex items-center justify-between">
            <span className="text-[9px] text-neutral-400">Fill Color</span>
            <div className="flex items-center gap-1">
              {overrides.fillColor !== null && (
                <button
                  onClick={() => onOverrideChange("fillColor", null)}
                  className="text-[8px] text-neutral-300 hover:text-neutral-500"
                >
                  x
                </button>
              )}
              <input
                type="color"
                value={overrides.fillColor ?? preset.provinceColors[0]}
                onChange={(e) => onOverrideChange("fillColor", e.target.value)}
                className="w-5 h-5 rounded cursor-pointer"
              />
            </div>
          </div>

          {/* Background */}
          <div className="flex items-center justify-between">
            <span className="text-[9px] text-neutral-400">Background</span>
            <div className="flex items-center gap-1">
              {overrides.background !== null && (
                <button
                  onClick={() => onOverrideChange("background", null)}
                  className="text-[8px] text-neutral-300 hover:text-neutral-500"
                >
                  x
                </button>
              )}
              <input
                type="color"
                value={overrides.background ?? preset.background}
                onChange={(e) => onOverrideChange("background", e.target.value)}
                className="w-5 h-5 rounded cursor-pointer"
              />
            </div>
          </div>

          {/* Stroke color */}
          <div className="flex items-center justify-between">
            <span className="text-[9px] text-neutral-400">Stroke Color</span>
            <div className="flex items-center gap-1">
              {overrides.strokeColor !== null && (
                <button
                  onClick={() => onOverrideChange("strokeColor", null)}
                  className="text-[8px] text-neutral-300 hover:text-neutral-500"
                >
                  x
                </button>
              )}
              <input
                type="color"
                value={overrides.strokeColor ?? preset.strokeColor}
                onChange={(e) =>
                  onOverrideChange("strokeColor", e.target.value)
                }
                className="w-5 h-5 rounded cursor-pointer"
              />
            </div>
          </div>

          {/* Stroke width */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <span className="text-[9px] text-neutral-400">Stroke Width</span>
              <span className="text-[9px] font-semibold text-neutral-700">
                {(overrides.strokeWidth ?? preset.strokeWidth).toFixed(1)}
              </span>
            </div>
            <input
              type="range"
              min={0}
              max={4}
              step={0.1}
              value={overrides.strokeWidth ?? preset.strokeWidth}
              onChange={(e) =>
                onOverrideChange("strokeWidth", parseFloat(e.target.value))
              }
              className={sliderClass}
            />
          </div>

          {/* Shadow color */}
          <div className="flex items-center justify-between">
            <span className="text-[9px] text-neutral-400">Shadow Color</span>
            <div className="flex items-center gap-1">
              {overrides.shadowColor !== null && (
                <button
                  onClick={() => onOverrideChange("shadowColor", null)}
                  className="text-[8px] text-neutral-300 hover:text-neutral-500"
                >
                  x
                </button>
              )}
              <input
                type="color"
                value={
                  overrides.shadowColor ?? preset.shadowColor ?? "#000000"
                }
                onChange={(e) =>
                  onOverrideChange("shadowColor", e.target.value)
                }
                className="w-5 h-5 rounded cursor-pointer"
              />
            </div>
          </div>

          {/* Shadow depth */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <span className="text-[9px] text-neutral-400">Shadow Depth</span>
              <span className="text-[9px] font-semibold text-neutral-700">
                {overrides.shadowDepth ?? preset.solidShadowDepth ?? 0}
              </span>
            </div>
            <input
              type="range"
              min={0}
              max={14}
              step={1}
              value={overrides.shadowDepth ?? preset.solidShadowDepth ?? 0}
              onChange={(e) =>
                onOverrideChange("shadowDepth", parseInt(e.target.value))
              }
              className={sliderClass}
            />
          </div>

          {/* Label color */}
          <div className="flex items-center justify-between">
            <span className="text-[9px] text-neutral-400">Label Color</span>
            <div className="flex items-center gap-1">
              {overrides.labelColor !== null && (
                <button
                  onClick={() => onOverrideChange("labelColor", null)}
                  className="text-[8px] text-neutral-300 hover:text-neutral-500"
                >
                  x
                </button>
              )}
              <input
                type="color"
                value={overrides.labelColor ?? toHex6(preset.labelColor)}
                onChange={(e) =>
                  onOverrideChange("labelColor", e.target.value)
                }
                className="w-5 h-5 rounded cursor-pointer"
              />
            </div>
          </div>

          {/* Glow */}
          <div>
            <label className="flex items-center gap-2 text-[10px] text-neutral-600 cursor-pointer mb-1">
              <input
                type="checkbox"
                checked={overrides.glowEnabled}
                onChange={(e) =>
                  onOverrideChange("glowEnabled", e.target.checked)
                }
                className="rounded"
              />
              Glow Effect
            </label>
            {overrides.glowEnabled && (
              <div className="space-y-2 pl-4">
                <div className="flex items-center justify-between">
                  <span className="text-[9px] text-neutral-400">Color</span>
                  <input
                    type="color"
                    value={overrides.glowColor ?? preset.strokeColor}
                    onChange={(e) =>
                      onOverrideChange("glowColor", e.target.value)
                    }
                    className="w-5 h-5 rounded cursor-pointer"
                  />
                </div>
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[9px] text-neutral-400">Radius</span>
                    <span className="text-[9px] font-semibold text-neutral-700">
                      {overrides.glowRadius}
                    </span>
                  </div>
                  <input
                    type="range"
                    min={2}
                    max={24}
                    step={1}
                    value={overrides.glowRadius}
                    onChange={(e) =>
                      onOverrideChange("glowRadius", parseInt(e.target.value))
                    }
                    className={sliderClass}
                  />
                </div>
              </div>
            )}
          </div>

          {/* Tooltip colors */}
          <div>
            <div className="text-[9px] text-neutral-400 mb-1.5">Tooltip</div>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1">
                <span className="text-[8px] text-neutral-300">BG</span>
                <input
                  type="color"
                  value={
                    overrides.tooltipBg ??
                    (preset.tooltipBg.startsWith("rgba")
                      ? "#ffffff"
                      : preset.tooltipBg)
                  }
                  onChange={(e) =>
                    onOverrideChange("tooltipBg", e.target.value)
                  }
                  className="w-4 h-4 rounded cursor-pointer"
                />
              </div>
              <div className="flex items-center gap-1">
                <span className="text-[8px] text-neutral-300">Text</span>
                <input
                  type="color"
                  value={
                    overrides.tooltipColor ?? toHex6(preset.tooltipColor)
                  }
                  onChange={(e) =>
                    onOverrideChange("tooltipColor", e.target.value)
                  }
                  className="w-4 h-4 rounded cursor-pointer"
                />
              </div>
              {(overrides.tooltipBg !== null ||
                overrides.tooltipColor !== null) && (
                <button
                  onClick={() => {
                    onOverrideChange("tooltipBg", null);
                    onOverrideChange("tooltipColor", null);
                  }}
                  className="text-[8px] text-neutral-300 hover:text-neutral-500"
                >
                  x
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Path Processing */}
      <div className="bg-white rounded-xl p-3">
        <div className="text-[9px] font-medium text-neutral-400 uppercase tracking-wide mb-2">
          Path Processing
        </div>
        <label className="flex items-center gap-2 text-[10px] text-neutral-600 cursor-pointer mb-1.5">
          <input
            type="checkbox"
            checked={enhancements.simplifyEnabled}
            onChange={(e) =>
              onEnhancementChange("simplifyEnabled", e.target.checked)
            }
            className="rounded"
          />
          Simplify (RDP)
        </label>
        {enhancements.simplifyEnabled && (
          <div className="mb-2.5 pl-4">
            <div className="flex items-center justify-between mb-1">
              <span className="text-[9px] text-neutral-400">Tolerance</span>
              <span className="text-[9px] font-semibold text-neutral-700">
                {enhancements.simplifyTolerance.toFixed(1)}
              </span>
            </div>
            <input
              type="range"
              min={0.5}
              max={8}
              step={0.5}
              value={enhancements.simplifyTolerance}
              onChange={(e) =>
                onEnhancementChange(
                  "simplifyTolerance",
                  parseFloat(e.target.value),
                )
              }
              className={sliderClass}
            />
          </div>
        )}
        <label className="flex items-center gap-2 text-[10px] text-neutral-600 cursor-pointer mb-1.5">
          <input
            type="checkbox"
            checked={enhancements.smoothEnabled}
            onChange={(e) =>
              onEnhancementChange("smoothEnabled", e.target.checked)
            }
            className="rounded"
          />
          Smooth
        </label>
        {enhancements.smoothEnabled && (
          <div className="pl-4 space-y-2">
            <div>
              <div className="text-[9px] text-neutral-400 mb-1">Algorithm</div>
              <div className="flex gap-1">
                {(["chaikin", "bspline", "catmull-rom"] as const).map(
                  (algo) => (
                    <button
                      key={algo}
                      onClick={() =>
                        onEnhancementChange(
                          "smoothAlgorithm",
                          algo as SmoothAlgorithm,
                        )
                      }
                      className={`flex-1 py-1 px-1 text-[9px] font-medium rounded-lg transition-all ${
                        enhancements.smoothAlgorithm === algo
                          ? "bg-neutral-800 text-white"
                          : "bg-neutral-100 text-neutral-500 hover:bg-neutral-200"
                      }`}
                    >
                      {algo === "chaikin"
                        ? "Chaikin"
                        : algo === "bspline"
                          ? "B-Spline"
                          : "Catmull"}
                    </button>
                  ),
                )}
              </div>
            </div>
            <div>
              <div className="flex items-center justify-between mb-1">
                <span className="text-[9px] text-neutral-400">
                  {enhancements.smoothAlgorithm === "chaikin"
                    ? "Iterations"
                    : "Segments"}
                </span>
                <span className="text-[9px] font-semibold text-neutral-700">
                  {enhancements.smoothIterations}
                </span>
              </div>
              <input
                type="range"
                min={1}
                max={enhancements.smoothAlgorithm === "chaikin" ? 4 : 6}
                step={1}
                value={enhancements.smoothIterations}
                onChange={(e) =>
                  onEnhancementChange(
                    "smoothIterations",
                    parseInt(e.target.value),
                  )
                }
                className={sliderClass}
              />
            </div>
          </div>
        )}
      </div>

      {/* Hand-Drawn Effect */}
      <div className="bg-white rounded-xl p-3">
        <div className="text-[9px] font-medium text-neutral-400 uppercase tracking-wide mb-2">
          Hand-Drawn Effect
        </div>
        <label className="flex items-center gap-2 text-[10px] text-neutral-600 cursor-pointer mb-1.5">
          <input
            type="checkbox"
            checked={enhancements.handDrawnEnabled}
            onChange={(e) =>
              onEnhancementChange("handDrawnEnabled", e.target.checked)
            }
            className="rounded"
          />
          Enable Hand-Drawn
        </label>
        {enhancements.handDrawnEnabled && (
          <div className="space-y-2">
            <div>
              <div className="flex items-center justify-between mb-1">
                <span className="text-[9px] text-neutral-400">Jitter</span>
                <span className="text-[9px] font-semibold text-neutral-700">
                  {enhancements.handDrawnJitter.toFixed(1)}
                </span>
              </div>
              <input
                type="range"
                min={0.3}
                max={4}
                step={0.1}
                value={enhancements.handDrawnJitter}
                onChange={(e) =>
                  onEnhancementChange(
                    "handDrawnJitter",
                    parseFloat(e.target.value),
                  )
                }
                className={sliderClass}
              />
            </div>
            <label className="flex items-center gap-2 text-[10px] text-neutral-600 cursor-pointer">
              <input
                type="checkbox"
                checked={enhancements.handDrawnDoubleStroke}
                onChange={(e) =>
                  onEnhancementChange(
                    "handDrawnDoubleStroke",
                    e.target.checked,
                  )
                }
                className="rounded"
              />
              Double Stroke
            </label>
            {enhancements.handDrawnDoubleStroke && (
              <div className="pl-4 space-y-2">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[9px] text-neutral-400">Offset</span>
                    <span className="text-[9px] font-semibold text-neutral-700">
                      {enhancements.handDrawnDoubleStrokeOffset.toFixed(1)}
                    </span>
                  </div>
                  <input
                    type="range"
                    min={0.3}
                    max={2}
                    step={0.1}
                    value={enhancements.handDrawnDoubleStrokeOffset}
                    onChange={(e) =>
                      onEnhancementChange(
                        "handDrawnDoubleStrokeOffset",
                        parseFloat(e.target.value),
                      )
                    }
                    className={sliderClass}
                  />
                </div>
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[9px] text-neutral-400">
                      Opacity
                    </span>
                    <span className="text-[9px] font-semibold text-neutral-700">
                      {enhancements.handDrawnDoubleStrokeOpacity.toFixed(2)}
                    </span>
                  </div>
                  <input
                    type="range"
                    min={0.1}
                    max={0.5}
                    step={0.05}
                    value={enhancements.handDrawnDoubleStrokeOpacity}
                    onChange={(e) =>
                      onEnhancementChange(
                        "handDrawnDoubleStrokeOpacity",
                        parseFloat(e.target.value),
                      )
                    }
                    className={sliderClass}
                  />
                </div>
              </div>
            )}
            <button
              onClick={() =>
                onEnhancementChange(
                  "handDrawnSeed",
                  Math.floor(Math.random() * 100000),
                )
              }
              className="w-full py-1 text-[9px] font-medium rounded-lg bg-neutral-100 text-neutral-500 hover:bg-neutral-200 transition-all"
            >
              Randomize
            </button>
          </div>
        )}
      </div>

      {/* Province Gap */}
      <div className="bg-white rounded-xl p-3">
        <div className="text-[9px] font-medium text-neutral-400 uppercase tracking-wide mb-2">
          Province Gap
        </div>
        <label className="flex items-center gap-2 text-[10px] text-neutral-600 cursor-pointer mb-2">
          <input
            type="checkbox"
            checked={enhancements.gapEnabled}
            onChange={(e) =>
              onEnhancementChange("gapEnabled", e.target.checked)
            }
            className="rounded"
          />
          Enable Gap
        </label>
        {enhancements.gapEnabled && (
          <div>
            <div className="flex items-center justify-between mb-1">
              <span className="text-[9px] text-neutral-400">Gap Size</span>
              <span className="text-[9px] font-semibold text-neutral-700">
                {enhancements.gapSize.toFixed(1)}px
              </span>
            </div>
            <input
              type="range"
              min={0.5}
              max={5}
              step={0.5}
              value={enhancements.gapSize}
              onChange={(e) =>
                onEnhancementChange("gapSize", parseFloat(e.target.value))
              }
              className={sliderClass}
            />
          </div>
        )}
      </div>

      {/* Inner Shadow */}
      <div className="bg-white rounded-xl p-3">
        <div className="text-[9px] font-medium text-neutral-400 uppercase tracking-wide mb-2">
          Inner Shadow
        </div>
        <label className="flex items-center gap-2 text-[10px] text-neutral-600 cursor-pointer mb-2">
          <input
            type="checkbox"
            checked={enhancements.innerShadowEnabled}
            onChange={(e) =>
              onEnhancementChange("innerShadowEnabled", e.target.checked)
            }
            className="rounded"
          />
          Enable Inner Shadow
        </label>
        {enhancements.innerShadowEnabled && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[9px] text-neutral-400">Color</span>
              <input
                type="color"
                value={enhancements.innerShadowColor}
                onChange={(e) =>
                  onEnhancementChange("innerShadowColor", e.target.value)
                }
                className="w-5 h-5 rounded cursor-pointer"
              />
            </div>
            <div>
              <div className="flex items-center justify-between mb-1">
                <span className="text-[9px] text-neutral-400">Blur</span>
                <span className="text-[9px] font-semibold text-neutral-700">
                  {enhancements.innerShadowBlur}px
                </span>
              </div>
              <input
                type="range"
                min={1}
                max={8}
                step={0.5}
                value={enhancements.innerShadowBlur}
                onChange={(e) =>
                  onEnhancementChange(
                    "innerShadowBlur",
                    parseFloat(e.target.value),
                  )
                }
                className={sliderClass}
              />
            </div>
            <div>
              <div className="flex items-center justify-between mb-1">
                <span className="text-[9px] text-neutral-400">Opacity</span>
                <span className="text-[9px] font-semibold text-neutral-700">
                  {enhancements.innerShadowOpacity.toFixed(2)}
                </span>
              </div>
              <input
                type="range"
                min={0}
                max={1}
                step={0.05}
                value={enhancements.innerShadowOpacity}
                onChange={(e) =>
                  onEnhancementChange(
                    "innerShadowOpacity",
                    parseFloat(e.target.value),
                  )
                }
                className={sliderClass}
              />
            </div>
          </div>
        )}
      </div>

      {/* Texture Fill */}
      <div className="bg-white rounded-xl p-3">
        <div className="text-[9px] font-medium text-neutral-400 uppercase tracking-wide mb-2">
          Texture Fill
        </div>
        <div className="flex gap-1 mb-2">
          {(["none", "lines", "dots", "crosshatch"] as const).map((t) => (
            <button
              key={t}
              onClick={() => onEnhancementChange("textureType", t)}
              className={`flex-1 py-1.5 px-1 text-[10px] font-medium rounded-lg transition-all ${
                enhancements.textureType === t
                  ? "bg-neutral-800 text-white"
                  : "bg-neutral-100 text-neutral-500 hover:bg-neutral-200"
              }`}
            >
              {t === "none"
                ? "None"
                : t === "lines"
                  ? "Lines"
                  : t === "dots"
                    ? "Dots"
                    : "Cross"}
            </button>
          ))}
        </div>
        {enhancements.textureType !== "none" && (
          <div className="space-y-2">
            <div>
              <div className="flex items-center justify-between mb-1">
                <span className="text-[9px] text-neutral-400">Weight</span>
                <span className="text-[9px] font-semibold text-neutral-700">
                  {enhancements.textureWeight.toFixed(1)}
                </span>
              </div>
              <input
                type="range"
                min={0.3}
                max={4}
                step={0.1}
                value={enhancements.textureWeight}
                onChange={(e) =>
                  onEnhancementChange(
                    "textureWeight",
                    parseFloat(e.target.value),
                  )
                }
                className={sliderClass}
              />
            </div>
            <div>
              <div className="flex items-center justify-between mb-1">
                <span className="text-[9px] text-neutral-400">Opacity</span>
                <span className="text-[9px] font-semibold text-neutral-700">
                  {enhancements.textureOpacity.toFixed(2)}
                </span>
              </div>
              <input
                type="range"
                min={0}
                max={1}
                step={0.05}
                value={enhancements.textureOpacity}
                onChange={(e) =>
                  onEnhancementChange(
                    "textureOpacity",
                    parseFloat(e.target.value),
                  )
                }
                className={sliderClass}
              />
            </div>
          </div>
        )}
      </div>

      {/* Data Choropleth */}
      <div className="bg-white rounded-xl p-3">
        <div className="text-[9px] font-medium text-neutral-400 uppercase tracking-wide mb-2">
          Data Choropleth
        </div>
        <label className="flex items-center gap-2 text-[10px] text-neutral-600 cursor-pointer mb-2">
          <input
            type="checkbox"
            checked={enhancements.choroplethEnabled}
            onChange={(e) =>
              onEnhancementChange("choroplethEnabled", e.target.checked)
            }
            className="rounded"
          />
          Enable Choropleth
        </label>
        {enhancements.choroplethEnabled && (
          <div className="space-y-2">
            <div>
              <span className="text-[9px] text-neutral-400 mb-1 block">
                Color Scale
              </span>
              <div className="flex gap-1">
                {(["blue", "green", "red", "purple"] as const).map((s) => (
                  <button
                    key={s}
                    onClick={() => onEnhancementChange("choroplethScale", s)}
                    className={`flex-1 py-1.5 px-1 text-[10px] font-medium rounded-lg transition-all capitalize ${
                      enhancements.choroplethScale === s
                        ? "bg-neutral-800 text-white"
                        : "bg-neutral-100 text-neutral-500 hover:bg-neutral-200"
                    }`}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex gap-1 mt-1">
              {Array.from({ length: 5 }, (_, i) => {
                const val = i * 25;
                return (
                  <div
                    key={i}
                    className="flex-1 h-3 rounded"
                    style={{
                      background: getChoroplethColor(
                        val,
                        enhancements.choroplethScale,
                      ),
                    }}
                  />
                );
              })}
            </div>
            <button
              onClick={() =>
                onEnhancementChange(
                  "choroplethData",
                  Array.from({ length: 35 }, () =>
                    Math.round(Math.random() * 100),
                  ),
                )
              }
              className="w-full py-1.5 text-[10px] font-medium rounded-lg bg-neutral-100 text-neutral-500 hover:bg-neutral-200 transition-all"
            >
              Regenerate Data
            </button>
          </div>
        )}
      </div>

      {/* Background Effects */}
      <div className="bg-white rounded-xl p-3">
        <div className="text-[9px] font-medium text-neutral-400 uppercase tracking-wide mb-2">
          Background Effects
        </div>
        {/* Vignette */}
        <label className="flex items-center gap-2 text-[10px] text-neutral-600 cursor-pointer mb-1.5">
          <input
            type="checkbox"
            checked={enhancements.vignetteEnabled}
            onChange={(e) =>
              onEnhancementChange("vignetteEnabled", e.target.checked)
            }
            className="rounded"
          />
          Vignette
        </label>
        {enhancements.vignetteEnabled && (
          <div className="mb-2.5 pl-4">
            <div className="flex items-center justify-between mb-1">
              <span className="text-[9px] text-neutral-400">Intensity</span>
              <span className="text-[9px] font-semibold text-neutral-700">
                {enhancements.vignetteIntensity.toFixed(2)}
              </span>
            </div>
            <input
              type="range"
              min={0.1}
              max={1}
              step={0.05}
              value={enhancements.vignetteIntensity}
              onChange={(e) =>
                onEnhancementChange(
                  "vignetteIntensity",
                  parseFloat(e.target.value),
                )
              }
              className={sliderClass}
            />
          </div>
        )}
        {/* Noise */}
        <label className="flex items-center gap-2 text-[10px] text-neutral-600 cursor-pointer mb-1.5">
          <input
            type="checkbox"
            checked={enhancements.noiseEnabled}
            onChange={(e) =>
              onEnhancementChange("noiseEnabled", e.target.checked)
            }
            className="rounded"
          />
          Noise Texture
        </label>
        {enhancements.noiseEnabled && (
          <div className="pl-4 space-y-2">
            <div>
              <div className="flex items-center justify-between mb-1">
                <span className="text-[9px] text-neutral-400">Opacity</span>
                <span className="text-[9px] font-semibold text-neutral-700">
                  {enhancements.noiseOpacity.toFixed(2)}
                </span>
              </div>
              <input
                type="range"
                min={0.02}
                max={0.3}
                step={0.01}
                value={enhancements.noiseOpacity}
                onChange={(e) =>
                  onEnhancementChange(
                    "noiseOpacity",
                    parseFloat(e.target.value),
                  )
                }
                className={sliderClass}
              />
            </div>
            <div>
              <div className="flex items-center justify-between mb-1">
                <span className="text-[9px] text-neutral-400">Scale</span>
                <span className="text-[9px] font-semibold text-neutral-700">
                  {enhancements.noiseScale.toFixed(1)}
                </span>
              </div>
              <input
                type="range"
                min={0.3}
                max={3}
                step={0.1}
                value={enhancements.noiseScale}
                onChange={(e) =>
                  onEnhancementChange(
                    "noiseScale",
                    parseFloat(e.target.value),
                  )
                }
                className={sliderClass}
              />
            </div>
          </div>
        )}
        {/* Text Repeat */}
        <label className="flex items-center gap-2 text-[10px] text-neutral-600 cursor-pointer mb-1.5 mt-2.5">
          <input
            type="checkbox"
            checked={enhancements.textRepeatEnabled}
            onChange={(e) =>
              onEnhancementChange("textRepeatEnabled", e.target.checked)
            }
            className="rounded"
          />
          Text Repeat
        </label>
        {enhancements.textRepeatEnabled && (
          <div className="pl-4 space-y-2">
            <div>
              <div className="text-[9px] text-neutral-400 mb-1">Text</div>
              <input
                type="text"
                value={enhancements.textRepeatContent}
                onChange={(e) =>
                  onEnhancementChange("textRepeatContent", e.target.value)
                }
                className="w-full px-2 py-1 text-[10px] bg-neutral-100 rounded-lg text-neutral-700 outline-none focus:ring-1 focus:ring-neutral-300"
                placeholder="eat"
              />
            </div>
            <div className="flex gap-2">
              <div className="flex-1">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[9px] text-neutral-400">Size</span>
                  <span className="text-[9px] font-semibold text-neutral-700">
                    {enhancements.textRepeatSize}
                  </span>
                </div>
                <input
                  type="range"
                  min={6}
                  max={48}
                  step={1}
                  value={enhancements.textRepeatSize}
                  onChange={(e) =>
                    onEnhancementChange(
                      "textRepeatSize",
                      parseInt(e.target.value),
                    )
                  }
                  className={sliderClass}
                />
              </div>
              <div className="flex items-end">
                <input
                  type="color"
                  value={enhancements.textRepeatColor}
                  onChange={(e) =>
                    onEnhancementChange("textRepeatColor", e.target.value)
                  }
                  className="w-5 h-5 rounded cursor-pointer"
                />
              </div>
            </div>
            <div>
              <div className="flex items-center justify-between mb-1">
                <span className="text-[9px] text-neutral-400">Opacity</span>
                <span className="text-[9px] font-semibold text-neutral-700">
                  {enhancements.textRepeatOpacity.toFixed(2)}
                </span>
              </div>
              <input
                type="range"
                min={0.02}
                max={0.4}
                step={0.01}
                value={enhancements.textRepeatOpacity}
                onChange={(e) =>
                  onEnhancementChange(
                    "textRepeatOpacity",
                    parseFloat(e.target.value),
                  )
                }
                className={sliderClass}
              />
            </div>
            <div>
              <div className="flex items-center justify-between mb-1">
                <span className="text-[9px] text-neutral-400">Angle</span>
                <span className="text-[9px] font-semibold text-neutral-700">
                  {enhancements.textRepeatAngle}°
                </span>
              </div>
              <input
                type="range"
                min={-90}
                max={90}
                step={5}
                value={enhancements.textRepeatAngle}
                onChange={(e) =>
                  onEnhancementChange(
                    "textRepeatAngle",
                    parseInt(e.target.value),
                  )
                }
                className={sliderClass}
              />
            </div>
            <div>
              <div className="flex items-center justify-between mb-1">
                <span className="text-[9px] text-neutral-400">Gap</span>
                <span className="text-[9px] font-semibold text-neutral-700">
                  {enhancements.textRepeatGap.toFixed(1)}
                </span>
              </div>
              <input
                type="range"
                min={0.3}
                max={4}
                step={0.1}
                value={enhancements.textRepeatGap}
                onChange={(e) =>
                  onEnhancementChange(
                    "textRepeatGap",
                    parseFloat(e.target.value),
                  )
                }
                className={sliderClass}
              />
            </div>
          </div>
        )}
      </div>

      {/* Display options */}
      <div className="bg-white rounded-xl p-3">
        <div className="text-[9px] font-medium text-neutral-400 uppercase tracking-wide mb-2">
          Display
        </div>
        <label className="flex items-center gap-2 text-[10px] text-neutral-600 cursor-pointer">
          <input
            type="checkbox"
            checked={showLabels}
            onChange={(e) => onShowLabelsChange(e.target.checked)}
            className="rounded"
          />
          Show Labels
        </label>
      </div>

      {/* Selected province info */}
      {selectedProvince && (
        <div className="bg-white rounded-xl p-3">
          <div className="text-[9px] font-medium text-neutral-400 uppercase tracking-wide mb-2">
            Selected
          </div>
          <div className="text-[11px] font-semibold text-neutral-800">
            {selectedProvince.name}
          </div>
          <div className="text-[9px] text-neutral-400 mt-1">
            {selectedProvince.paths.length} polygon(s)
          </div>
        </div>
      )}
    </div>
  );
}
