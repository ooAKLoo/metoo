import * as echarts from "echarts/core";
import {
  GeoComponent,
  TooltipComponent,
} from "echarts/components";
import { LinesChart, ScatterChart } from "echarts/charts";
import { CanvasRenderer } from "echarts/renderers";
import { convertFileSrc } from "@tauri-apps/api/core";
import type { CityEntry } from "../hooks/useCityAggregation";

// ── ECharts module registration (idempotent) ──
echarts.use([
  GeoComponent,
  TooltipComponent,
  LinesChart,
  ScatterChart,
  CanvasRenderer,
]);

// ── Shared types ──

export interface AvatarPos {
  city: CityEntry;
  x: number;
  y: number;
  size: number;
  visible: boolean;
}

// ── Shared utilities ──

export function coverSrc(cover: string) {
  if (!cover) return "";
  if (cover.startsWith("//")) return `https:${cover}`;
  if (cover.startsWith("/")) return convertFileSrc(cover);
  return cover;
}

export function lerpColor(a: string, b: string, t: number): string {
  const parse = (hex: string) => {
    const v = parseInt(hex.slice(1), 16);
    return [(v >> 16) & 0xff, (v >> 8) & 0xff, v & 0xff];
  };
  const [r1, g1, b1] = parse(a);
  const [r2, g2, b2] = parse(b);
  const r = Math.round(r1 + (r2 - r1) * t);
  const g = Math.round(g1 + (g2 - g1) * t);
  const bl = Math.round(b1 + (b2 - b1) * t);
  return `rgb(${r},${g},${bl})`;
}

/** Min/max avatar sizes */
export const AVATAR_MIN = 22;
export const AVATAR_MAX = 42;

// ── GeoJSON registration guard (shared across map instances) ──

const geoRegistered: Record<string, boolean> = { china: false, world: false };

export async function ensureChinaGeo() {
  if (geoRegistered.china) return;
  const geoJson = await import("../assets/china.json");
  echarts.registerMap(
    "china",
    geoJson as unknown as Parameters<typeof echarts.registerMap>[1],
  );
  geoRegistered.china = true;
}

type GeoFeature = { geometry: { type: string; coordinates: unknown }; properties?: { name?: string } };
let _worldFeatures: GeoFeature[] | null = null;

export async function ensureWorldGeo() {
  if (_worldFeatures) return _worldFeatures;
  const worldJson = await import("../assets/world.json");
  if (!geoRegistered.world) {
    echarts.registerMap(
      "world",
      worldJson as unknown as Parameters<typeof echarts.registerMap>[1],
    );
    geoRegistered.world = true;
  }
  const wf =
    (worldJson as unknown as { default?: { features: unknown[] }; features?: unknown[] })
      .default?.features ??
    (worldJson as unknown as { features: unknown[] }).features ??
    [];
  _worldFeatures = wf as GeoFeature[];
  return _worldFeatures;
}

// ── Country GeoJSON registry (for drill-down into non-China countries) ──

import countryRegistry from "../assets/countries/_registry.json";

const _registry = countryRegistry as Record<string, { file: string; provinces: number; size_kb: number }>;

export async function ensureCountryGeo(countryName: string) {
  const mapKey = `country:${countryName}`;
  if (geoRegistered[mapKey]) return true;

  const entry = _registry[countryName];
  if (!entry) return false;

  try {
    const mod = await import(`../assets/countries/${entry.file}.json`);
    const geoJson = mod.default ?? mod;
    echarts.registerMap(mapKey, geoJson as Parameters<typeof echarts.registerMap>[1]);
    geoRegistered[mapKey] = true;
    return true;
  } catch {
    return false;
  }
}

/** Check if a country has province-level GeoJSON available */
export function hasCountryGeo(name: string): boolean {
  return name === "China" || name in _registry;
}

/** Map short province names to GeoJSON full names */
export const PROV_FULL: Record<string, string> = {
  北京: "北京市", 天津: "天津市", 上海: "上海市", 重庆: "重庆市",
  河北: "河北省", 山西: "山西省", 辽宁: "辽宁省", 吉林: "吉林省",
  黑龙江: "黑龙江省", 江苏: "江苏省", 浙江: "浙江省", 安徽: "安徽省",
  福建: "福建省", 江西: "江西省", 山东: "山东省", 河南: "河南省",
  湖北: "湖北省", 湖南: "湖南省", 广东: "广东省", 海南: "海南省",
  四川: "四川省", 贵州: "贵州省", 云南: "云南省", 陕西: "陕西省",
  甘肃: "甘肃省", 青海: "青海省", 台湾: "台湾省",
  内蒙古: "内蒙古自治区", 广西: "广西壮族自治区", 西藏: "西藏自治区",
  宁夏: "宁夏回族自治区", 新疆: "新疆维吾尔自治区",
  香港: "香港特别行政区", 澳门: "澳门特别行政区",
};
