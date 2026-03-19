// GeoJSON types
export interface GeoFeature {
  type: string;
  properties: {
    name: string;
    center?: [number, number];
    centroid?: [number, number];
    [key: string]: unknown;
  };
  geometry: {
    type: "Polygon" | "MultiPolygon";
    coordinates: number[][][] | number[][][][];
  };
}

export interface GeoJSON {
  type: "FeatureCollection";
  features: GeoFeature[];
}

// Province data after projection
export interface ProvinceData {
  name: string;
  paths: string[];
  center: [number, number];
}

export interface Bounds {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
}

// Style preset system
export interface MapStylePreset {
  id: string;
  name: string;
  nameCN: string;
  background: string;
  provinceColors: string[];
  hoverColors: string[];
  selectedColors: string[];
  strokeColor: string;
  strokeWidth: number;
  hoverStrokeWidth: number;
  labelColor: string;
  labelHoverColor: string;
  labelFontSize: number;
  labelHoverFontSize: number;
  /** Neo-brutalism style shadow offset (single layer) */
  shadowOffset?: [number, number];
  shadowColor?: string;
  /** Solid-extrusion depth: renders N stacked copies at 1px increments for a 3D block look */
  solidShadowDepth?: number;
  /** Gradient fill instead of flat */
  useGradient?: boolean;
  gradientDirection?: "vertical" | "radial";
  /** Extra filter on hover */
  hoverFilter?: string;
  /** Selected province filter */
  selectedFilter?: string;
  /** Stroke dash array */
  strokeDasharray?: string;
  /** Province border becomes colored on hover */
  hoverStrokeColor?: string;
  /** Tooltip style */
  tooltipBg: string;
  tooltipColor: string;
  /** Preview swatch colors for the preset selector */
  swatchColors: [string, string, string];
}

// Smoothing algorithm types
export type SmoothAlgorithm = "chaikin" | "bspline" | "catmull-rom";

// Visual enhancements state
export interface VisualEnhancements {
  simplifyEnabled: boolean;
  simplifyTolerance: number;
  smoothEnabled: boolean;
  smoothAlgorithm: SmoothAlgorithm;
  smoothIterations: number;
  gapEnabled: boolean;
  gapSize: number;
  innerShadowEnabled: boolean;
  innerShadowColor: string;
  innerShadowBlur: number;
  innerShadowOpacity: number;
  textureType: "none" | "lines" | "dots" | "crosshatch";
  textureOpacity: number;
  textureWeight: number;
  choroplethEnabled: boolean;
  choroplethScale: "blue" | "green" | "red" | "purple";
  choroplethData: number[];
  vignetteEnabled: boolean;
  vignetteIntensity: number;
  noiseEnabled: boolean;
  noiseOpacity: number;
  noiseScale: number;
  textRepeatEnabled: boolean;
  textRepeatContent: string;
  textRepeatSize: number;
  textRepeatColor: string;
  textRepeatOpacity: number;
  textRepeatAngle: number;
  textRepeatGap: number;
  handDrawnEnabled: boolean;
  handDrawnJitter: number;
  handDrawnSeed: number;
  handDrawnDoubleStroke: boolean;
  handDrawnDoubleStrokeOffset: number;
  handDrawnDoubleStrokeOpacity: number;
}

// Style overrides (null = use preset value)
export interface StyleOverrides {
  fillColor: string | null;
  background: string | null;
  strokeColor: string | null;
  strokeWidth: number | null;
  shadowColor: string | null;
  shadowDepth: number | null;
  labelColor: string | null;
  glowEnabled: boolean;
  glowColor: string | null;
  glowRadius: number;
  tooltipBg: string | null;
  tooltipColor: string | null;
}

// Default values
export const DEFAULT_ENHANCEMENTS: VisualEnhancements = {
  simplifyEnabled: false,
  simplifyTolerance: 2,
  smoothEnabled: false,
  smoothAlgorithm: "chaikin",
  smoothIterations: 2,
  gapEnabled: false,
  gapSize: 1.5,
  innerShadowEnabled: false,
  innerShadowColor: "#000000",
  innerShadowBlur: 3,
  innerShadowOpacity: 0.5,
  textureType: "none",
  textureOpacity: 0.3,
  textureWeight: 1,
  choroplethEnabled: false,
  choroplethScale: "blue",
  choroplethData: Array.from({ length: 35 }, () => Math.round(Math.random() * 100)),
  vignetteEnabled: false,
  vignetteIntensity: 0.6,
  noiseEnabled: false,
  noiseOpacity: 0.08,
  noiseScale: 1,
  textRepeatEnabled: false,
  textRepeatContent: "eat",
  textRepeatSize: 14,
  textRepeatColor: "#000000",
  textRepeatOpacity: 0.06,
  textRepeatAngle: -30,
  textRepeatGap: 1,
  handDrawnEnabled: false,
  handDrawnJitter: 1.5,
  handDrawnSeed: 42,
  handDrawnDoubleStroke: false,
  handDrawnDoubleStrokeOffset: 0.8,
  handDrawnDoubleStrokeOpacity: 0.25,
};

export const DEFAULT_OVERRIDES: StyleOverrides = {
  fillColor: null,
  background: null,
  strokeColor: null,
  strokeWidth: null,
  shadowColor: null,
  shadowDepth: null,
  labelColor: null,
  glowEnabled: false,
  glowColor: null,
  glowRadius: 8,
  tooltipBg: null,
  tooltipColor: null,
};

// Choropleth color scales
export const CHOROPLETH_SCALES = {
  blue: { light: [230, 240, 255], dark: [10, 50, 120] },
  green: { light: [230, 255, 230], dark: [10, 100, 30] },
  red: { light: [255, 230, 230], dark: [150, 20, 20] },
  purple: { light: [245, 230, 255], dark: [80, 10, 120] },
} as const;
