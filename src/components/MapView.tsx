import { useEffect, useMemo, useRef, useCallback, useState } from "react";
import * as echarts from "echarts/core";
import {
  GeoComponent,
  TooltipComponent,
} from "echarts/components";
import { LinesChart, ScatterChart } from "echarts/charts";
import { CanvasRenderer } from "echarts/renderers";
import { motion, AnimatePresence } from "motion/react";
import { Globe, Maximize2 } from "lucide-react";
import { MapLegend } from "./MapLegend";
import { convertFileSrc } from "@tauri-apps/api/core";
import { useFavoriteStore } from "../stores/useFavoriteStore";
import { useMapStore } from "../stores/useMapStore";
import { useThemeStore } from "../stores/useThemeStore";
import { useCityAggregation, type CityEntry } from "../hooks/useCityAggregation";

function coverSrc(cover: string) {
  if (!cover) return "";
  if (cover.startsWith("/")) return convertFileSrc(cover);
  if (cover.startsWith("//")) return `https:${cover}`;
  return cover;
}

/** Min/max avatar sizes */
const AVATAR_MIN = 22;
const AVATAR_MAX = 42;

interface AvatarPos {
  city: CityEntry;
  x: number;
  y: number;
  size: number;    // computed from count
  visible: boolean; // false if occluded by a bigger neighbour
}

echarts.use([
  GeoComponent,
  TooltipComponent,
  LinesChart,
  ScatterChart,
  CanvasRenderer,
]);

/** Map short province names to GeoJSON full names */
const PROV_FULL: Record<string, string> = {
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

/** Interpolate between two hex colors. t: 0→colorA, 1→colorB */
function lerpColor(a: string, b: string, t: number): string {
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

// ── Dot Matrix (World map) — classic-black style ──
const DOT_BG = "#ffffff";
const DOT_LAND_DEFAULT = "#d0d0d0";   // no-data country
const DOT_LAND_ACTIVE = "#E63946";    // data country accent
const DOT_COLS = 90;
const DOT_RADIUS_RATIO = 2.5 / (1000 / DOT_COLS);

interface DotInfo {
  lng: number;
  lat: number;
  countryIdx: number; // index into country list, -1 = sea
}

function pointInRing(lng: number, lat: number, ring: number[][]): boolean {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const xi = ring[i][0], yi = ring[i][1];
    const xj = ring[j][0], yj = ring[j][1];
    if (((yi > lat) !== (yj > lat)) && (lng < (xj - xi) * (lat - yi) / (yj - yi) + xi)) {
      inside = !inside;
    }
  }
  return inside;
}

interface CountryPolygons {
  bbox: [number, number, number, number];
  rings: number[][][];
}

function extractCountryPolygons(geometry: { type: string; coordinates: number[][][][] | number[][][][][] }): CountryPolygons {
  const rings: number[][][] = [];
  let minLng = Infinity, minLat = Infinity, maxLng = -Infinity, maxLat = -Infinity;
  const addRing = (coords: number[][][]) => {
    if (!coords || !coords[0] || coords[0].length === 0) return;
    const outer = coords[0];
    rings.push(outer);
    for (const pt of outer) {
      if (pt[0] < minLng) minLng = pt[0];
      if (pt[0] > maxLng) maxLng = pt[0];
      if (pt[1] < minLat) minLat = pt[1];
      if (pt[1] > maxLat) maxLat = pt[1];
    }
  };
  if (!geometry || !geometry.coordinates) return { bbox: [0, 0, 0, 0], rings };
  if (geometry.type === "Polygon") addRing(geometry.coordinates as unknown as number[][][]);
  else if (geometry.type === "MultiPolygon")
    for (const poly of geometry.coordinates as number[][][][]) addRing(poly);
  return { bbox: [minLng, minLat, maxLng, maxLat], rings };
}

interface WorldDotResult {
  dots: DotInfo[];
  countryPolygons: CountryPolygons[]; // for matching items to countries
}

function buildWorldDotGrid(features: { geometry: { type: string; coordinates: unknown }; properties?: { name?: string } }[]): WorldDotResult {
  const validFeatures = features.filter((f) => f.geometry && f.geometry.coordinates);
  const countryPolygons = validFeatures
    .map((f) => extractCountryPolygons(f.geometry as { type: string; coordinates: number[][][][] | number[][][][][] }));

  const BOUNDS = { minLng: -180, maxLng: 180, minLat: -60, maxLat: 85 };
  const spacing = (BOUNDS.maxLng - BOUNDS.minLng) / DOT_COLS;
  const rows = Math.ceil((BOUNDS.maxLat - BOUNDS.minLat) / spacing);

  const dots: DotInfo[] = [];
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < DOT_COLS; c++) {
      const lng = BOUNDS.minLng + c * spacing + spacing / 2;
      const lat = BOUNDS.maxLat - r * spacing - spacing / 2;
      let countryIdx = -1;
      for (let ci = 0; ci < countryPolygons.length; ci++) {
        const ct = countryPolygons[ci];
        if (ct.rings.length === 0) continue;
        if (lng < ct.bbox[0] || lng > ct.bbox[2] || lat < ct.bbox[1] || lat > ct.bbox[3]) continue;
        let found = false;
        for (const ring of ct.rings) {
          if (pointInRing(lng, lat, ring)) { found = true; break; }
        }
        if (found) { countryIdx = ci; break; }
      }
      if (countryIdx >= 0) dots.push({ lng, lat, countryIdx });
    }
  }
  return { dots, countryPolygons };
}

export function MapView() {
  const chartRef = useRef<HTMLDivElement>(null);
  const instanceRef = useRef<echarts.ECharts | null>(null);
  const geoRegistered = useRef({ china: false, world: false });
  const [ready, setReady] = useState(false);

  const items = useFavoriteStore((s) => s.items);
  const selectedItemId = useMapStore((s) => s.selectedItemId);
  const selectedCity = useMapStore((s) => s.selectedCity);
  const routePath = useMapStore((s) => s.routePath);
  const mapLevel = useMapStore((s) => s.mapLevel);
  const setSelectedCity = useMapStore((s) => s.setSelectedCity);
  const setHoveredProvince = useMapStore((s) => s.setHoveredProvince);
  const setMapLevel = useMapStore((s) => s.setMapLevel);

  const themeId = useThemeStore((s) => s.themeId);
  const { scatterData, entries } = useCityAggregation();

  // ── Dot matrix for world map ──
  const [worldFeatures, setWorldFeatures] = useState<{ geometry: { type: string; coordinates: unknown }; properties?: { name?: string } }[] | null>(null);
  const dotCanvasRef = useRef<HTMLCanvasElement>(null);
  const worldDotData = useMemo(
    () => (worldFeatures ? buildWorldDotGrid(worldFeatures) : { dots: [], countryPolygons: [] }),
    [worldFeatures],
  );
  const dotGrid = worldDotData.dots;

  // Match items to countries → countryIdx → count
  const countryDataCounts = useMemo(() => {
    const counts = new Map<number, number>();
    if (worldDotData.countryPolygons.length === 0) return counts;
    for (const item of items) {
      for (const loc of item.locations) {
        const { lng, lat } = loc;
        for (let ci = 0; ci < worldDotData.countryPolygons.length; ci++) {
          const ct = worldDotData.countryPolygons[ci];
          if (ct.rings.length === 0) continue;
          if (lng < ct.bbox[0] || lng > ct.bbox[2] || lat < ct.bbox[1] || lat > ct.bbox[3]) continue;
          let found = false;
          for (const ring of ct.rings) {
            if (pointInRing(lng, lat, ring)) { found = true; break; }
          }
          if (found) {
            counts.set(ci, (counts.get(ci) || 0) + 1);
            break;
          }
        }
      }
    }
    return counts;
  }, [items, worldDotData.countryPolygons]);

  // Track whether view has been zoomed in programmatically
  const [isZoomedIn, setIsZoomedIn] = useState(false);

  // ── Map transition animation ──
  const [mapOpacity, setMapOpacity] = useState(1);
  const transitioningRef = useRef(false);

  const drillDownRef = useRef<(name: string) => void>(() => {});

  const drillDown = useCallback((countryName: string) => {
    if (transitioningRef.current || !instanceRef.current) return;
    if (countryName !== "China") return;
    transitioningRef.current = true;

    // Step 1: zoom world map toward China
    instanceRef.current.setOption({
      geo: { center: [104.5, 35.5], zoom: 3, animationDurationUpdate: 450, animationEasingUpdate: "cubicInOut" },
    });

    // Step 2: after zoom, fade out
    setTimeout(() => {
      setMapOpacity(0);
      // Step 3: after fade, switch map
      setTimeout(() => {
        setMapLevel("china");
        setIsZoomedIn(false);
        // Step 4: fade back in
        requestAnimationFrame(() => {
          setTimeout(() => {
            setMapOpacity(1);
            transitioningRef.current = false;
          }, 50);
        });
      }, 280);
    }, 400);
  }, [setMapLevel]);

  drillDownRef.current = drillDown;

  const drillUp = useCallback(() => {
    if (transitioningRef.current || !instanceRef.current) return;
    transitioningRef.current = true;

    // Step 1: fade out
    setMapOpacity(0);

    // Step 2: after fade, switch to world
    setTimeout(() => {
      setMapLevel("world");
      setIsZoomedIn(false);

      // Step 3: wait for ECharts to rebuild with world map, then resize + position
      const waitForRebuild = () => {
        requestAnimationFrame(() => {
          setTimeout(() => {
            const chart = instanceRef.current;
            if (!chart) return;

            // Force resize to fit current container
            chart.resize();

            // Set initial position: zoomed into China area (instant, no animation)
            chart.setOption({
              geo: { center: [104.5, 35.5], zoom: 3, animationDurationUpdate: 0 },
            });

            // Step 4: fade back in
            requestAnimationFrame(() => {
              setMapOpacity(1);

              // Step 5: zoom out to global view
              setTimeout(() => {
                if (instanceRef.current) {
                  instanceRef.current.setOption({
                    geo: {
                      zoom: 1,
                      center: [10, 30],
                      animationDurationUpdate: 600,
                      animationEasingUpdate: "cubicInOut",
                    },
                  });
                  setTimeout(() => {
                    transitioningRef.current = false;
                  }, 650);
                }
              }, 350);
            });
          }, 120);
        });
      };
      waitForRebuild();
    }, 280);
  }, [setMapLevel]);

  // ── Reset view to overview ──
  const resetView = useCallback(() => {
    if (!instanceRef.current) return;
    const isWorld = mapLevel === "world";
    instanceRef.current.setOption({
      geo: {
        layoutCenter: ["50%", isWorld ? "55%" : "48%"],
        layoutSize: isWorld ? "140%" : "105%",
        zoom: 1,
        center: isWorld ? [10, 30] : [104.5, 35.5],
        animationDurationUpdate: 500,
      },
    });
    setIsZoomedIn(false);
  }, [mapLevel]);

  // ── Dot matrix canvas rendering (world mode) ──
  const drawDotMatrix = useCallback(() => {
    const canvas = dotCanvasRef.current;
    const chart = instanceRef.current;
    if (!canvas || !chart || dotGrid.length === 0 || mapLevel !== "world") {
      if (canvas) {
        const ctx = canvas.getContext("2d");
        if (ctx) ctx.clearRect(0, 0, canvas.width, canvas.height);
      }
      return;
    }
    const ctx = canvas.getContext("2d")!;
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, rect.width, rect.height);

    if (!chart.getWidth() || !chart.getHeight()) return;

    const geoSpacing = 360 / DOT_COLS;
    const p0 = chart.convertToPixel("geo", [0, 0]);
    const p1 = chart.convertToPixel("geo", [geoSpacing, 0]);
    if (!p0 || !p1 || !isFinite(p0[0]) || !isFinite(p1[0])) return;
    const spacingPx = Math.abs(p1[0] - p0[0]);
    const baseR = spacingPx * DOT_RADIUS_RATIO;
    if (baseR < 0.3) return;

    const maxCount = countryDataCounts.size > 0 ? Math.max(...countryDataCounts.values()) : 1;
    const defaultDots: { x: number; y: number }[] = [];
    const activeBuckets = new Map<number, { x: number; y: number }[]>();

    for (const dot of dotGrid) {
      const px = chart.convertToPixel("geo", [dot.lng, dot.lat]);
      if (!px || !isFinite(px[0]) || !isFinite(px[1])) continue;
      if (px[0] < -baseR * 2 || px[0] > rect.width + baseR * 2) continue;
      if (px[1] < -baseR * 2 || px[1] > rect.height + baseR * 2) continue;

      const count = countryDataCounts.get(dot.countryIdx) || 0;
      if (count > 0) {
        const t = Math.sqrt(count / maxCount);
        const opacity = Math.round((0.45 + t * 0.55) * 10) / 10;
        if (!activeBuckets.has(opacity)) activeBuckets.set(opacity, []);
        activeBuckets.get(opacity)!.push({ x: px[0], y: px[1] });
      } else {
        defaultDots.push({ x: px[0], y: px[1] });
      }
    }

    ctx.fillStyle = DOT_LAND_DEFAULT;
    ctx.beginPath();
    for (const p of defaultDots) {
      ctx.moveTo(p.x + baseR, p.y);
      ctx.arc(p.x, p.y, baseR, 0, Math.PI * 2);
    }
    ctx.fill();

    for (const [opacity, pts] of activeBuckets) {
      ctx.fillStyle = DOT_LAND_ACTIVE;
      ctx.globalAlpha = opacity;
      ctx.beginPath();
      for (const p of pts) {
        ctx.moveTo(p.x + baseR, p.y);
        ctx.arc(p.x, p.y, baseR, 0, Math.PI * 2);
      }
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }, [dotGrid, mapLevel, countryDataCounts]);

  // ── Avatar overlay positions ──
  const [avatarPositions, setAvatarPositions] = useState<AvatarPos[]>([]);

  const updateAvatarPositions = useCallback(() => {
    const chart = instanceRef.current;
    if (!chart || entries.length === 0) {
      setAvatarPositions([]);
      return;
    }
    const geoOpt = (chart.getOption() as { geo?: { zoom?: number }[] })?.geo;
    const zoom = geoOpt?.[0]?.zoom ?? 1;
    const zoomScale = Math.pow(zoom, 0.4);
    const effectiveMin = Math.max(18, AVATAR_MIN * zoomScale);
    const effectiveMax = Math.min(72, AVATAR_MAX * zoomScale);
    const maxCount = Math.max(...entries.map((e) => e.count), 1);

    const raw: AvatarPos[] = [];
    for (const city of entries) {
      if (city.covers.length === 0) continue;
      const px = chart.convertToPixel("geo", city.coord);
      if (!px || !isFinite(px[0]) || !isFinite(px[1])) continue;
      const t = Math.sqrt(city.count / maxCount);
      const size = effectiveMin + t * (effectiveMax - effectiveMin);
      raw.push({ city, x: px[0], y: px[1], size, visible: true });
    }

    for (let i = 0; i < raw.length; i++) {
      if (!raw[i].visible) continue;
      for (let j = i + 1; j < raw.length; j++) {
        if (!raw[j].visible) continue;
        const dx = raw[i].x - raw[j].x;
        const dy = raw[i].y - raw[j].y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < (raw[i].size + raw[j].size) * 0.5) raw[j].visible = false;
      }
    }
    setAvatarPositions(raw);
  }, [entries]);

  // Progressive route drawing
  const totalSegments = routePath ? routePath.length - 1 : 0;
  const [revealedSegments, setRevealedSegments] = useState(0);

  useEffect(() => {
    if (!routePath || totalSegments === 0) {
      setRevealedSegments(0);
      return;
    }
    setRevealedSegments(0);
    let current = 0;
    const timer = setInterval(() => {
      current++;
      setRevealedSegments(current);
      if (current >= totalSegments) clearInterval(timer);
    }, 600);
    return () => clearInterval(timer);
  }, [routePath, totalSegments]);

  const selectedCoord = useMemo(() => {
    if (!selectedItemId) return null;
    const item = items.find((i) => i.id === selectedItemId);
    if (!item || item.locations.length === 0) return null;
    return [item.locations[0].lng, item.locations[0].lat] as [number, number];
  }, [selectedItemId, items]);

  // Province counts for choropleth + legend (keyed by GeoJSON full name)
  const { provCounts, maxProv } = useMemo(() => {
    const counts = new Map<string, number>();
    for (const item of items) {
      for (const loc of item.locations) {
        const fullName = PROV_FULL[loc.province] || loc.province;
        counts.set(fullName, (counts.get(fullName) || 0) + 1);
      }
    }
    if (counts.size > 0) {
      console.log("[MapView] province choropleth:", Object.fromEntries(counts));
    }
    const max = counts.size > 0 ? Math.max(...counts.values()) : 0;
    return { provCounts: counts, maxProv: max };
  }, [items]);

  // ── Build chart option ──
  const buildOption = useCallback((): echarts.EChartsCoreOption => {
    const isDark = themeId === "rose";
    const isFauvist = themeId === "fauvist";

    // Fauvist: bold distinct colors per province
    const FAUVIST_PALETTE = [
      "#E63946", "#F77F00", "#FCBF49", "#2A9D8F",
      "#3A86FF", "#7209B7", "#8AC926", "#FF006E",
      "#FB5607", "#06D6A0", "#FFBE0B", "#4CC9F0",
    ];

    // 3-stop gradient: base → mid → high
    const ramp = isDark
      ? { lo: "#1a2240", mid: "#2d4878", hi: "#5a9ad6" }
      : { lo: "#eeeef2", mid: "#a8c8e8", hi: "#3b82f6" };

    const pal = isFauvist
      ? {
          area: "#f5f0e8", border: "#ffffff", emphasis: "#f5f0e8",
          borderWidth: 1.5, borderOpacity: 1,
          dot: "#2D2A32", selectedDot: "#ffffff", selectedBorder: "#2D2A32",
          tipBg: "#fffdf8", tipBd: "#e0d5c5", tipTxt: "#2D2A32", tipSub: "#6a6a6a",
          shadow: 0.12, lbl: "#4a4a4a",
        }
      : isDark
        ? {
            area: "#1e2744", border: "#2e3d5c", emphasis: "#2a3560",
            borderWidth: 0.8, borderOpacity: 0.6,
            dot: "#7c9cbf", selectedDot: "#f59e0b", selectedBorder: "#1a2240",
            tipBg: "#1e2a45", tipBd: "#2d3f5f", tipTxt: "#e2e8f0", tipSub: "#94a3b8",
            shadow: 0.25, lbl: "#94a3b8",
          }
        : {
            area: "#f4f4f7", border: "#d8d8e0", emphasis: "#e8e4ee",
            borderWidth: 0.8, borderOpacity: 0.5,
            dot: "#9070a0", selectedDot: "#e94560", selectedBorder: "#ffffff",
            tipBg: "#ffffff", tipBd: "#eeeeee", tipTxt: "#1a1a1a", tipSub: "#999999",
            shadow: 0.06, lbl: "#9ca3af",
          };

    // Build regions
    let regions;

    if (isFauvist) {
      // Fauvist: every province gets a bold color
      const allProvNames = Object.values(PROV_FULL);
      regions = allProvNames.map((name, i) => {
        const color = FAUVIST_PALETTE[i % FAUVIST_PALETTE.length];
        const hasData = provCounts.has(name);
        const count = provCounts.get(name) || 0;
        // Non-data provinces: mix toward cream for a washed/muted feel
        const areaColor = hasData ? color : lerpColor(color, "#f5f0e8", 0.35);
        return {
          name,
          itemStyle: { areaColor },
          emphasis: {
            itemStyle: { areaColor: lerpColor(color, "#ffffff", 0.2) },
            label: {
              show: true,
              formatter: count > 0 ? `${name} · ${count}` : name,
              color: "#2D2A32",
              fontSize: 11,
              fontWeight: 600,
            },
          },
          label: {
            show: true,
            formatter: `${name}`,
            color: "#3a3a3a",
            fontSize: 9,
          },
        };
      });
    } else {
      // Default gradient choropleth
      const safeMax = Math.max(maxProv, 1);
      regions = [...provCounts.entries()].map(([name, count]) => {
        const t = Math.sqrt(count / safeMax);
        const color = t < 0.5
          ? lerpColor(ramp.lo, ramp.mid, t * 2)
          : lerpColor(ramp.mid, ramp.hi, (t - 0.5) * 2);
        const emphT = Math.min(t + 0.15, 1);
        const emphColor = emphT < 0.5
          ? lerpColor(ramp.lo, ramp.mid, emphT * 2)
          : lerpColor(ramp.mid, ramp.hi, (emphT - 0.5) * 2);
        return {
          name,
          itemStyle: { areaColor: color },
          emphasis: { itemStyle: { areaColor: emphColor } },
          label: {
            show: true,
            formatter: `${name}`,
            color: isDark ? "#8899b4" : "#6a6a80",
            fontSize: 9,
          },
        };
      });
    }

    const isWorld = mapLevel === "world";

    // World dot matrix: transparent geo (canvas draws dots), China: normal geo
    const geoItemStyle = isWorld
      ? {
          areaColor: "rgba(0,0,0,0)",
          borderColor: "rgba(0,0,0,0)",
          borderWidth: 0,
          borderType: "solid" as const,
          shadowBlur: 0, shadowOffsetX: 0, shadowOffsetY: 0, shadowColor: "transparent",
        }
      : {
          areaColor: pal.area,
          borderColor: pal.border,
          borderWidth: pal.borderWidth,
          borderType: "solid" as const,
          shadowColor: isDark ? "rgba(0,0,0,0.45)" : isFauvist ? "rgba(80,60,30,0.18)" : "rgba(0,0,0,0.12)",
          shadowBlur: isFauvist ? 8 : 6,
          shadowOffsetX: isFauvist ? 3 : 2,
          shadowOffsetY: isFauvist ? 4 : 3,
        };

    const geoEmphasis = isWorld
      ? {
          itemStyle: { areaColor: "rgba(0,0,0,0.04)", borderColor: "rgba(0,0,0,0)", shadowBlur: 0, shadowOffsetX: 0, shadowOffsetY: 0 },
          label: {
            show: true,
            formatter: (params: { name: string }) => params.name,
            color: "#333",
            fontSize: 11, fontWeight: 500,
          },
        }
      : {
          itemStyle: {
            areaColor: pal.emphasis, borderColor: pal.border,
            shadowColor: isDark ? "rgba(0,0,0,0.6)" : isFauvist ? "rgba(80,60,30,0.3)" : "rgba(0,0,0,0.2)",
            shadowBlur: isFauvist ? 14 : 10,
            shadowOffsetX: isFauvist ? 4 : 3,
            shadowOffsetY: isFauvist ? 6 : 5,
          },
          label: {
            show: true,
            formatter: (params: { name: string }) => {
              const c = provCounts.get(params.name);
              return c ? `${params.name} · ${c}` : params.name;
            },
            color: isDark ? "#e2e8f0" : "#4a4a5a",
            fontSize: 11, fontWeight: 500,
          },
        };

    const tipPal = isWorld
      ? { bg: "rgba(255,255,255,0.95)", bd: "#e0e0e0", txt: "#1a1a1a", sub: "#888", shadow: 0.08 }
      : { bg: pal.tipBg, bd: pal.tipBd, txt: pal.tipTxt, sub: pal.tipSub, shadow: pal.shadow };

    return {
      geo: {
        map: isWorld ? "world" : "china",
        roam: true,
        aspectScale: isWorld ? 0.9 : 0.75,
        layoutCenter: ["50%", isWorld ? "55%" : "48%"],
        layoutSize: isWorld ? "140%" : "105%",
        scaleLimit: { min: 0.8, max: 10 },
        animationDurationUpdate: 500,
        animationEasingUpdate: "cubicInOut",
        itemStyle: geoItemStyle,
        emphasis: geoEmphasis,
        select: { itemStyle: { areaColor: isWorld ? "rgba(0,0,0,0)" : pal.emphasis } },
        label: { show: false },
        regions: isWorld ? [] : regions,
      },
      tooltip: {
        trigger: "item",
        backgroundColor: tipPal.bg,
        borderColor: tipPal.bd,
        borderWidth: 1,
        textStyle: { color: tipPal.txt, fontSize: 12 },
        extraCssText: `box-shadow: 0 4px 16px rgba(0,0,0,${tipPal.shadow}); border-radius: 10px; padding: 10px 12px;`,
        formatter: (params: unknown) => {
          const d = params as { name?: string; data?: { titles?: string[] } };
          if (!d.data?.titles) return d.name || "";
          const list = d.data.titles
            .slice(0, 4)
            .map((t: string) => `<div style="font-size:11px;color:${tipPal.sub};margin-top:2px;line-height:1.4">· ${t}</div>`)
            .join("");
          const more = d.data.titles.length > 4
            ? `<div style="font-size:10px;color:${tipPal.sub};margin-top:3px">还有 ${d.data.titles.length - 4} 条…</div>`
            : "";
          return `<div style="font-weight:600;font-size:13px;margin-bottom:4px">${d.name}</div>${list}${more}`;
        },
      },
      series: [
        // 0: City dots (hidden — replaced by avatar overlay, but kept for coordinate mapping)
        {
          type: "scatter",
          coordinateSystem: "geo",
          data: scatterData,
          symbolSize: 0,
          silent: true,
          zlevel: 1,
        },
        // 1: Route lines
        {
          type: "lines",
          coordinateSystem: "geo",
          data: [],
          lineStyle: {
            color: new echarts.graphic.LinearGradient(0, 0, 1, 0, [
              { offset: 0, color: isFauvist ? "#2D2A32" : "#ff6b6b" },
              { offset: 1, color: isFauvist ? "#7209B7" : "#ee5a24" },
            ]),
            width: isFauvist ? 3 : 2,
            opacity: isFauvist ? 0.85 : 0.7,
            curveness: 0.15,
            type: "dashed" as const,
          },
          effect: {
            show: true,
            period: 5,
            trailLength: 0.25,
            symbol: "circle",
            symbolSize: isFauvist ? 5 : 4,
            color: isFauvist ? "#FF006E" : "#ff6b6b",
          },
          zlevel: 2,
        },
        // 2: Route node numbers
        {
          type: "scatter",
          coordinateSystem: "geo",
          data: [],
          symbolSize: isFauvist ? 22 : 20,
          itemStyle: {
            color: isFauvist
              ? "#2D2A32"
              : new echarts.graphic.LinearGradient(0, 0, 0, 1, [
                  { offset: 0, color: "#ff6b6b" },
                  { offset: 1, color: "#ee5a24" },
                ]),
            borderColor: isFauvist ? "#FCBF49" : "#fff",
            borderWidth: isFauvist ? 2.5 : 1.5,
            shadowColor: isFauvist ? "rgba(45,42,50,0.4)" : "rgba(238,90,36,0.35)",
            shadowBlur: 8,
          },
          label: {
            show: true,
            formatter: (pr: unknown) => {
              const params = pr as { data?: { value?: number[] } };
              return `${params.data?.value?.[2] ?? ""}`;
            },
            color: "#fff",
            fontSize: 9,
            fontFamily: "ZCOOL KuaiLe, cursive",
          },
          zlevel: 3,
        },
        // 3: Selected item highlight dot
        {
          type: "scatter",
          coordinateSystem: "geo",
          data: selectedCoord ? [{ value: selectedCoord }] : [],
          symbolSize: 8,
          itemStyle: {
            color: pal.selectedDot,
            borderColor: pal.selectedBorder,
            borderWidth: 1.5,
          },
          zlevel: 4,
        },
      ],
    };
  }, [scatterData, selectedCoord, themeId, items, provCounts, maxProv, mapLevel]);

  // ── Init chart ──
  useEffect(() => {
    if (!chartRef.current) return;

    let disposed = false;

    const init = async () => {
      if (!geoRegistered.current.china) {
        const geoJson = await import("../assets/china.json");
        echarts.registerMap(
          "china",
          geoJson as unknown as Parameters<typeof echarts.registerMap>[1]
        );
        geoRegistered.current.china = true;
      }
      if (!geoRegistered.current.world) {
        const worldJson = await import("../assets/world.json");
        echarts.registerMap(
          "world",
          worldJson as unknown as Parameters<typeof echarts.registerMap>[1]
        );
        geoRegistered.current.world = true;
        const wf = (worldJson as unknown as { default?: { features: unknown[] }; features?: unknown[] }).default?.features
          ?? (worldJson as unknown as { features: unknown[] }).features ?? [];
        setWorldFeatures(wf as { geometry: { type: string; coordinates: unknown }; properties?: { name?: string } }[]);
      }

      if (disposed) return;

      if (!instanceRef.current) {
        instanceRef.current = echarts.init(chartRef.current!, undefined, {
          renderer: "canvas",
        });

        instanceRef.current.on(
          "mouseover",
          { seriesIndex: undefined },
          (params: unknown) => {
            const p = params as { componentType?: string; name?: string };
            if (p.componentType === "geo") {
              setHoveredProvince(p.name || null);
            }
          }
        );
        instanceRef.current.on(
          "mouseout",
          { seriesIndex: undefined },
          () => {
            setHoveredProvince(null);
          }
        );

        // Click on scatter dots → select city (china level only)
        instanceRef.current.on(
          "click",
          { seriesIndex: 0 },
          (params: unknown) => {
            const p = params as { name?: string };
            if (p.name) {
              setSelectedCity(p.name);
            }
          }
        );

        // Click on geo region → drill down if in world view
        instanceRef.current.on(
          "click",
          (params: unknown) => {
            const p = params as { componentType?: string; name?: string };
            if (p.componentType === "geo" && p.name) {
              drillDownRef.current(p.name);
            }
          }
        );

        setReady(true);
      }

      instanceRef.current.setOption(buildOption(), true);
    };

    init();

    return () => {
      disposed = true;
    };
  }, [buildOption, setHoveredProvince, setSelectedCity]);

  // ── Route animation ──
  useEffect(() => {
    const chart = instanceRef.current;
    if (!chart || !ready) return;

    if (!routePath || revealedSegments === 0) {
      chart.setOption({
        series: [
          { /* 0 city dots — skip */ },
          { data: [] },   // 1: lines
          { data: [] },   // 2: route nodes
        ],
      });
      return;
    }

    const segCount = Math.min(revealedSegments, routePath.length - 1);
    const nodeCount = Math.min(revealedSegments + 1, routePath.length);

    const lines: { coords: [number, number][] }[] = [];
    for (let i = 0; i < segCount; i++) {
      lines.push({
        coords: [routePath[i].coord, routePath[i + 1].coord],
      });
    }

    const nodes = routePath.slice(0, nodeCount).map((node, i) => ({
      name: `${i + 1}. ${node.name}`,
      value: [...node.coord, i + 1] as [number, number, number],
    }));

    chart.setOption({
      series: [
        { /* 0 city dots — skip */ },
        { data: lines },
        { data: nodes },
      ],
    });
  }, [ready, routePath, revealedSegments]);

  // ── ResizeObserver ──
  useEffect(() => {
    const el = chartRef.current;
    const chart = instanceRef.current;
    if (!el || !chart || !ready) return;

    const ro = new ResizeObserver(() => {
      chart.resize();
      requestAnimationFrame(() => {
        updateAvatarPositions();
        drawDotMatrix();
      });
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, [ready, updateAvatarPositions, drawDotMatrix]);

  // ── Center on selected item ──
  useEffect(() => {
    if (!instanceRef.current || !selectedCoord) return;
    instanceRef.current.setOption({
      geo: { center: selectedCoord, zoom: 4, animationDurationUpdate: 500 },
    });
    setIsZoomedIn(true);
  }, [selectedCoord]);

  // ── Zoom to selected city ──
  useEffect(() => {
    if (!instanceRef.current || !selectedCity) return;
    const city = entries.find((e) => e.name === selectedCity);
    if (city) {
      instanceRef.current.setOption({
        geo: { center: city.coord, zoom: 5, animationDurationUpdate: 500 },
      });
      setIsZoomedIn(true);
    }
  }, [selectedCity, entries]);

  // Update positions on georoam (pan/zoom)
  useEffect(() => {
    const chart = instanceRef.current;
    if (!chart || !ready) return;

    const onRoam = () => {
      requestAnimationFrame(() => {
        updateAvatarPositions();
        drawDotMatrix();
      });
    };
    chart.on("georoam", onRoam);
    return () => { chart.off("georoam", onRoam); };
  }, [ready, updateAvatarPositions, drawDotMatrix]);

  // Also update when buildOption changes (map switch, theme, data)
  useEffect(() => {
    if (!ready) return;
    // Resize + redraw after ECharts finishes rendering the new option
    const timer = setTimeout(() => {
      instanceRef.current?.resize();
      updateAvatarPositions();
      drawDotMatrix();
    }, 120);
    return () => clearTimeout(timer);
  }, [ready, buildOption, updateAvatarPositions, drawDotMatrix]);

  const isDark = themeId === "rose";
  const isWorldDot = mapLevel === "world";

  return (
    <div className="absolute inset-0" style={{ background: isWorldDot ? DOT_BG : undefined }}>
      {/* SVG filters */}
      <svg className="absolute w-0 h-0" aria-hidden>
        <defs>
          <filter id="sketch-edges">
            <feTurbulence type="turbulence" baseFrequency="0.04" numOctaves="4" seed="2" result="noise" />
            <feDisplacementMap in="SourceGraphic" in2="noise" scale="1.8" xChannelSelector="R" yChannelSelector="G" />
          </filter>
          <filter id="noise-grain">
            <feTurbulence type="fractalNoise" baseFrequency="0.65" numOctaves="3" stitchTiles="stitch" />
            <feColorMatrix type="saturate" values="0" />
          </filter>
        </defs>
      </svg>

      {/* Radial vignette */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: isWorldDot
            ? "radial-gradient(ellipse 80% 70% at 50% 45%, transparent 50%, rgba(0,0,0,0.04) 100%)"
            : isDark
              ? "radial-gradient(ellipse 80% 70% at 50% 45%, transparent 40%, rgba(10,10,25,0.35) 100%)"
              : "radial-gradient(ellipse 80% 70% at 50% 45%, transparent 40%, rgba(0,0,0,0.06) 100%)",
        }}
      />

      {/* Noise grain overlay */}
      {!isWorldDot && (
        <div
          className="absolute inset-0 pointer-events-none mix-blend-soft-light"
          style={{ filter: "url(#noise-grain)", opacity: isDark ? 0.08 : 0.04 }}
        />
      )}

      {/* Map layers — shared opacity transition for drill-down/up */}
      <div
        className="absolute inset-0 transition-opacity duration-[280ms] ease-in-out"
        style={{ opacity: mapOpacity }}
      >
        {/* Dot matrix canvas (world mode only) */}
        {isWorldDot && (
          <canvas ref={dotCanvasRef} className="absolute inset-0 w-full h-full pointer-events-none z-[1]" />
        )}

        {/* ECharts container */}
        <div className="absolute inset-0 z-[2]" style={{ filter: !isWorldDot ? "url(#sketch-edges)" : undefined }}>
          <div ref={chartRef} className="absolute inset-0" />
        </div>
      </div>
      {/* City avatar overlay */}
      <div className="absolute inset-0 pointer-events-none z-[5]">
        {avatarPositions.map((ap) => {
          if (!ap.visible) return null;
          const cover = ap.city.covers[0];
          const isActive = selectedCity === ap.city.name;
          const s = ap.size;

          return (
            <div
              key={ap.city.name}
              className="absolute pointer-events-auto cursor-pointer group"
              style={{
                left: ap.x - s / 2,
                top: ap.y - s / 2,
                width: s,
                height: s,
              }}
              onClick={() => setSelectedCity(ap.city.name)}
            >
              {/* Avatar circle */}
              <div
                className={`w-full h-full rounded-full overflow-hidden bg-[#f0f0f2]
                  border-[2px] transition-all duration-200
                  ${isActive
                    ? "border-[var(--accent-cyan)] shadow-[0_2px_12px_rgba(14,165,233,0.35)] scale-110"
                    : "border-white/90 shadow-[0_1px_6px_rgba(0,0,0,0.15)] group-hover:shadow-[0_3px_14px_rgba(0,0,0,0.2)] group-hover:scale-105"
                  }`}
              >
                <img
                  src={coverSrc(cover)}
                  alt=""
                  referrerPolicy="no-referrer"
                  crossOrigin="anonymous"
                  className="w-full h-full object-cover"
                  loading="lazy"
                />
              </div>

              {/* Count badge — top-right */}
              {ap.city.count > 1 && (
                <div
                  className={`absolute flex items-center justify-center rounded-full
                    text-white font-semibold leading-none
                    ${isActive
                      ? "bg-[var(--accent-cyan)]"
                      : "bg-[var(--text-primary)]/70"
                    }`}
                  style={{
                    top: -2,
                    right: -2,
                    minWidth: s * 0.38,
                    height: s * 0.38,
                    fontSize: Math.max(8, s * 0.24),
                    padding: "0 3px",
                  }}
                >
                  {ap.city.count}
                </div>
              )}

              {/* City name tooltip — hover only */}
              <div className="absolute left-1/2 -translate-x-1/2 opacity-0
                              group-hover:opacity-100 transition-opacity duration-150
                              pointer-events-none whitespace-nowrap"
                style={{ top: s + 4 }}
              >
                <span className="text-[9px] font-medium text-[var(--text-primary)]
                                  bg-panel/90 backdrop-blur-sm
                                  border border-[var(--border-color)]/30
                                  shadow-[0_1px_4px_rgba(0,0,0,0.08)]
                                  px-1.5 py-0.5 rounded-md">
                  {ap.city.name}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Map controls — breadcrumb + zoom reset */}
      <div className="absolute top-3 left-3 z-[10] flex items-center gap-1.5">
        {/* Breadcrumb navigation */}
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-0
                     bg-panel/90 backdrop-blur-sm border border-[var(--border-color)]/40
                     shadow-[0_1px_4px_rgba(0,0,0,0.06)]
                     rounded-lg overflow-hidden"
        >
          {/* World level */}
          <button
            onClick={mapLevel === "china" ? drillUp : undefined}
            className={`flex items-center gap-1 px-2.5 py-1.5
                       text-[10px] font-medium transition-all
                       ${mapLevel === "china"
                         ? "text-secondary hover:text-primary hover:bg-[var(--border-color)]/20 cursor-pointer"
                         : "text-primary cursor-default"
                       }`}
          >
            <Globe size={11} />
            世界
          </button>

          {/* China level */}
          <AnimatePresence>
            {mapLevel === "china" && (
              <motion.div
                initial={{ width: 0, opacity: 0 }}
                animate={{ width: "auto", opacity: 1 }}
                exit={{ width: 0, opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="flex items-center overflow-hidden"
              >
                <span className="text-[10px] text-[var(--border-color)]">/</span>
                <span className="px-2.5 py-1.5 text-[10px] font-medium text-primary">
                  中国
                </span>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>

        {/* Zoom reset */}
        <AnimatePresence>
          {isZoomedIn && (
            <motion.button
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              whileTap={{ scale: 0.95 }}
              onClick={resetView}
              className="flex items-center gap-1.5
                         bg-panel/90 backdrop-blur-sm border border-[var(--border-color)]/40
                         shadow-[0_1px_4px_rgba(0,0,0,0.06)]
                         px-2.5 py-1.5 rounded-lg
                         text-[10px] font-medium text-secondary
                         hover:text-primary hover:shadow-[0_2px_8px_rgba(0,0,0,0.1)]
                         transition-all cursor-pointer"
            >
              <Maximize2 size={12} />
              全览
            </motion.button>
          )}
        </AnimatePresence>
      </div>

      {/* Category legend */}
      {mapLevel === "china" && <MapLegend />}
    </div>
  );
}
