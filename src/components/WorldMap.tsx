import { useEffect, useMemo, useRef, useCallback, useState } from "react";
import * as echarts from "echarts/core";
import { useFavoriteStore } from "../stores/useFavoriteStore";
import { useMapStore } from "../stores/useMapStore";
import { useCityAggregation } from "../hooks/useCityAggregation";
import {
  ensureWorldGeo, coverSrc, hasCountryGeo,
  AVATAR_MIN, AVATAR_MAX,
  type AvatarPos,
} from "./map-shared";

// ── Dot Matrix constants ──
const DOT_BG = "#ffffff";
const DOT_LAND_DEFAULT = "#d0d0d0";
const DOT_LAND_ACTIVE = "#E63946";
const DOT_COLS = 90;
const DOT_RADIUS_RATIO = 2.5 / (1000 / DOT_COLS);
// World map effective aspect ratio: 360° / (145° × aspectScale 0.9) ≈ 2.76
const MAP_W_H_RATIO = 360 / (145 * 0.9);

// ── Geometry helpers ──

interface DotInfo {
  lng: number;
  lat: number;
  countryIdx: number;
}

interface CountryPolygons {
  bbox: [number, number, number, number];
  rings: number[][][];
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

function extractCountryPolygons(
  geometry: { type: string; coordinates: number[][][][] | number[][][][][] },
): CountryPolygons {
  const rings: number[][][] = [];
  let minLng = Infinity, minLat = Infinity, maxLng = -Infinity, maxLat = -Infinity;
  const addRing = (coords: number[][][]) => {
    if (!coords?.[0]?.length) return;
    const outer = coords[0];
    rings.push(outer);
    for (const pt of outer) {
      if (pt[0] < minLng) minLng = pt[0];
      if (pt[0] > maxLng) maxLng = pt[0];
      if (pt[1] < minLat) minLat = pt[1];
      if (pt[1] > maxLat) maxLat = pt[1];
    }
  };
  if (!geometry?.coordinates) return { bbox: [0, 0, 0, 0], rings };
  if (geometry.type === "Polygon") addRing(geometry.coordinates as unknown as number[][][]);
  else if (geometry.type === "MultiPolygon")
    for (const poly of geometry.coordinates as number[][][][]) addRing(poly);
  return { bbox: [minLng, minLat, maxLng, maxLat], rings };
}

type GeoFeature = { geometry: { type: string; coordinates: unknown }; properties?: { name?: string } };

function buildWorldDotGrid(features: GeoFeature[]) {
  const validFeatures = features.filter((f) => f.geometry?.coordinates);
  const countryPolygons = validFeatures.map((f) =>
    extractCountryPolygons(f.geometry as { type: string; coordinates: number[][][][] | number[][][][][] }),
  );

  // Build name → countryIdx mapping for hover lookup
  const nameToIdx = new Map<string, number>();
  validFeatures.forEach((f, i) => {
    if (f.properties?.name) nameToIdx.set(f.properties.name, i);
  });

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
        for (const ring of ct.rings) {
          if (pointInRing(lng, lat, ring)) { countryIdx = ci; break; }
        }
        if (countryIdx >= 0) break;
      }
      if (countryIdx >= 0) dots.push({ lng, lat, countryIdx });
    }
  }
  return { dots, countryPolygons, nameToIdx };
}

// ── Component ──

interface WorldMapProps {
  onDrillDown: (countryName?: string) => void;
}

export function WorldMap({ onDrillDown }: WorldMapProps) {
  const chartRef = useRef<HTMLDivElement>(null);
  const instanceRef = useRef<echarts.ECharts | null>(null);
  const [ready, setReady] = useState(false);

  const items = useFavoriteStore((s) => s.items);
  const selectedCity = useMapStore((s) => s.selectedCity);
  const setSelectedCity = useMapStore((s) => s.setSelectedCity);
  const setHoveredProvince = useMapStore((s) => s.setHoveredProvince);
  const { entries } = useCityAggregation();

  // ── Hover animation (driven directly from ECharts events via refs) ──
  const hoverAnimRef = useRef({ countryIdx: -1, dotOpacity: 1, rafId: 0 });
  const nameToIdxRef = useRef(new Map<string, number>());
  const drawDotMatrixRef = useRef(() => {});

  // ── Avatar overlay ──
  const [avatarPositions, setAvatarPositions] = useState<AvatarPos[]>([]);
  const avatarPosRef = useRef<AvatarPos[]>([]);
  const avatarContainerRef = useRef<HTMLDivElement>(null);

  const computeAvatarPositions = useCallback((): AvatarPos[] => {
    const chart = instanceRef.current;
    if (!chart || entries.length === 0) return [];

    const w = chart.getWidth();
    const h = chart.getHeight();
    if (!w || !h) return [];

    const geoOpt = (chart.getOption() as { geo?: { zoom?: number }[] })?.geo;
    const zoom = geoOpt?.[0]?.zoom ?? 1;
    const zoomScale = Math.pow(zoom, 0.4);
    const effectiveMin = Math.max(18, AVATAR_MIN * zoomScale);
    const effectiveMax = Math.min(72, AVATAR_MAX * zoomScale);
    const maxCount = Math.max(...entries.map((e) => e.count), 1);
    const maxSize = effectiveMax;

    const raw: AvatarPos[] = [];
    for (const city of entries) {
      if (city.covers.length === 0) continue;
      const px = chart.convertToPixel("geo", city.coord);
      if (!px || !isFinite(px[0]) || !isFinite(px[1])) continue;
      // Skip avatars outside viewport
      if (px[0] < -maxSize || px[0] > w + maxSize) continue;
      if (px[1] < -maxSize || px[1] > h + maxSize) continue;
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
    return raw;
  }, [entries]);

  const updateAvatarPositions = useCallback(() => {
    const positions = computeAvatarPositions();
    avatarPosRef.current = positions;
    setAvatarPositions(positions);
  }, [computeAvatarPositions]);

  const syncAvatarDOM = useCallback(() => {
    const chart = instanceRef.current;
    const container = avatarContainerRef.current;
    if (!chart || !container) return;

    const w = chart.getWidth();
    const h = chart.getHeight();

    for (const ap of avatarPosRef.current) {
      if (!ap.visible) continue;
      const el = container.querySelector(`[data-city="${CSS.escape(ap.city.name)}"]`) as HTMLElement | null;
      if (!el) continue;
      const px = chart.convertToPixel("geo", ap.city.coord);
      if (!px || !isFinite(px[0]) || !isFinite(px[1])) {
        el.style.display = "none";
        continue;
      }
      // Hide avatars outside viewport
      if (w && h && (px[0] < -ap.size || px[0] > w + ap.size || px[1] < -ap.size || px[1] > h + ap.size)) {
        el.style.display = "none";
        continue;
      }
      el.style.display = "";
      el.style.transform = `translate3d(${px[0] - ap.size / 2}px, ${px[1] - ap.size / 2}px, 0)`;
      ap.x = px[0];
      ap.y = px[1];
    }
  }, []);

  // ── World features & dot grid ──
  const [worldFeatures, setWorldFeatures] = useState<GeoFeature[] | null>(null);
  const dotCanvasRef = useRef<HTMLCanvasElement>(null);

  const worldDotData = useMemo(
    () => (worldFeatures
      ? buildWorldDotGrid(worldFeatures)
      : { dots: [], countryPolygons: [], nameToIdx: new Map<string, number>() }),
    [worldFeatures],
  );
  const dotGrid = worldDotData.dots;
  const nameToIdx = worldDotData.nameToIdx;
  nameToIdxRef.current = nameToIdx;

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

  // ── Dot matrix canvas rendering ──
  const drawDotMatrix = useCallback(() => {
    const canvas = dotCanvasRef.current;
    const chart = instanceRef.current;
    if (!canvas || !chart || dotGrid.length === 0) {
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

    const cw = chart.getWidth();
    const ch = chart.getHeight();
    if (!cw || !ch) return;

    const geoSpacing = 360 / DOT_COLS;
    const p0 = chart.convertToPixel("geo", [0, 0]);
    const p1 = chart.convertToPixel("geo", [geoSpacing, 0]);
    if (!p0 || !p1 || !isFinite(p0[0]) || !isFinite(p1[0])) return;
    const spacingPx = Math.abs(p1[0] - p0[0]);
    const baseR = spacingPx * DOT_RADIUS_RATIO;
    if (baseR < 0.3) return;

    // Pre-calculate visible geographic bounds to skip off-screen dots early
    const pad = geoSpacing * 2;
    const geoTL = chart.convertFromPixel("geo", [0, 0]);
    const geoBR = chart.convertFromPixel("geo", [rect.width, rect.height]);
    let visMinLng = -180, visMaxLng = 180, visMinLat = -90, visMaxLat = 90;
    if (geoTL && geoBR && isFinite(geoTL[0]) && isFinite(geoBR[0])
        && isFinite(geoTL[1]) && isFinite(geoBR[1])) {
      visMinLng = Math.min(geoTL[0], geoBR[0]) - pad;
      visMaxLng = Math.max(geoTL[0], geoBR[0]) + pad;
      visMaxLat = Math.max(geoTL[1], geoBR[1]) + pad;
      visMinLat = Math.min(geoTL[1], geoBR[1]) - pad;
    }

    const maxCount = countryDataCounts.size > 0 ? Math.max(...countryDataCounts.values()) : 1;
    const defaultDots: { x: number; y: number }[] = [];
    const activeBuckets = new Map<number, { x: number; y: number }[]>();
    // Hovered country dots separated for fade animation
    const hoverIdx = hoverAnimRef.current.countryIdx;
    const hoverDefaultDots: { x: number; y: number }[] = [];
    const hoverActiveBuckets = new Map<number, { x: number; y: number }[]>();

    for (const dot of dotGrid) {
      // Fast geographic bounds check — skip dots outside visible area
      if (dot.lng < visMinLng || dot.lng > visMaxLng) continue;
      if (dot.lat < visMinLat || dot.lat > visMaxLat) continue;

      const px = chart.convertToPixel("geo", [dot.lng, dot.lat]);
      if (!px || !isFinite(px[0]) || !isFinite(px[1])) continue;
      if (px[0] < -baseR * 2 || px[0] > rect.width + baseR * 2) continue;
      if (px[1] < -baseR * 2 || px[1] > rect.height + baseR * 2) continue;

      const isHovered = hoverIdx >= 0 && dot.countryIdx === hoverIdx;
      const targetDefault = isHovered ? hoverDefaultDots : defaultDots;
      const targetActive = isHovered ? hoverActiveBuckets : activeBuckets;

      const count = countryDataCounts.get(dot.countryIdx) || 0;
      if (count > 0) {
        const t = Math.sqrt(count / maxCount);
        const opacity = Math.round((0.45 + t * 0.55) * 10) / 10;
        if (!targetActive.has(opacity)) targetActive.set(opacity, []);
        targetActive.get(opacity)!.push({ x: px[0], y: px[1] });
      } else {
        targetDefault.push({ x: px[0], y: px[1] });
      }
    }

    // ── Draw non-hovered dots (always full opacity) ──
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

    // ── Draw hovered country dots with animated fade ──
    const dotAlpha = hoverAnimRef.current.dotOpacity;
    if (dotAlpha > 0.01) {
      if (hoverDefaultDots.length > 0) {
        ctx.fillStyle = DOT_LAND_DEFAULT;
        ctx.globalAlpha = dotAlpha;
        ctx.beginPath();
        for (const p of hoverDefaultDots) {
          ctx.moveTo(p.x + baseR, p.y);
          ctx.arc(p.x, p.y, baseR, 0, Math.PI * 2);
        }
        ctx.fill();
      }
      for (const [opacity, pts] of hoverActiveBuckets) {
        ctx.fillStyle = DOT_LAND_ACTIVE;
        ctx.globalAlpha = opacity * dotAlpha;
        ctx.beginPath();
        for (const p of pts) {
          ctx.moveTo(p.x + baseR, p.y);
          ctx.arc(p.x, p.y, baseR, 0, Math.PI * 2);
        }
        ctx.fill();
      }
    }
    ctx.globalAlpha = 1;
  }, [dotGrid, countryDataCounts]);
  drawDotMatrixRef.current = drawDotMatrix;

  // ── Hover animation trigger (called directly from ECharts events) ──
  const startHoverAnim = useCallback((newIdx: number) => {
    const anim = hoverAnimRef.current;
    if (newIdx === anim.countryIdx) return;

    const fadeOut = newIdx >= 0;
    anim.countryIdx = newIdx;
    const startOpacity = anim.dotOpacity;
    const endOpacity = fadeOut ? 0 : 1;
    if (startOpacity === endOpacity) {
      drawDotMatrixRef.current();
      return;
    }

    const start = performance.now();
    // Per motion spec: exit (fade-out) 200ms easeIn, enter (fade-in) 150ms easeOut
    const duration = fadeOut ? 200 : 150;

    const animate = (now: number) => {
      const t = Math.min((now - start) / duration, 1);
      const eased = fadeOut ? t * t : 1 - (1 - t) * (1 - t);
      anim.dotOpacity = startOpacity + (endOpacity - startOpacity) * eased;
      drawDotMatrixRef.current();
      if (t < 1) anim.rafId = requestAnimationFrame(animate);
    };

    cancelAnimationFrame(anim.rafId);
    anim.rafId = requestAnimationFrame(animate);
  }, []);
  const startHoverAnimRef = useRef(startHoverAnim);
  startHoverAnimRef.current = startHoverAnim;

  // ── Contain-fit: compute layoutSize so full map fills the container ──
  const getContainSize = useCallback((): number | string => {
    const el = chartRef.current;
    if (!el) return "100%";
    const { width, height } = el.getBoundingClientRect();
    if (width <= 0 || height <= 0) return "100%";
    // layoutSize constrains map width; choose largest size where map still fits
    // World map: 360° wide, ~145° tall, aspectScale 0.9 → W:H ≈ 2.76
    const fitByWidth = width;
    const fitByHeight = height * MAP_W_H_RATIO;
    return Math.min(fitByWidth, fitByHeight);
  }, []);

  // ── Build chart option ──
  const buildOption = useCallback((): echarts.EChartsCoreOption => ({
    geo: {
      map: "world",
      roam: true,
      aspectScale: 0.9,
      layoutCenter: ["50%", "50%"],
      layoutSize: getContainSize(),
      scaleLimit: { min: 1, max: 10 },
      animationDurationUpdate: 500,
      animationEasingUpdate: "cubicInOut",
      itemStyle: {
        areaColor: "rgba(0,0,0,0)",
        borderColor: "rgba(0,0,0,0)",
        borderWidth: 0,
        borderType: "solid" as const,
        shadowBlur: 0, shadowOffsetX: 0, shadowOffsetY: 0, shadowColor: "transparent",
      },
      emphasis: {
        itemStyle: {
          areaColor: "rgba(0,0,0,0.02)",
          borderColor: "rgba(0,0,0,0.2)",
          borderWidth: 1.5,
          shadowBlur: 0, shadowOffsetX: 0, shadowOffsetY: 0,
        },
        label: {
          show: true,
          formatter: (params: { name: string }) => params.name,
          color: "#333",
          fontSize: 11, fontWeight: 500,
        },
      },
      select: { itemStyle: { areaColor: "rgba(0,0,0,0)" } },
      label: { show: false },
      regions: [],
    },
    tooltip: {
      trigger: "item",
      backgroundColor: "rgba(255,255,255,0.95)",
      borderColor: "#e0e0e0",
      borderWidth: 1,
      textStyle: { color: "#1a1a1a", fontSize: 12 },
      extraCssText: "box-shadow: 0 4px 16px rgba(0,0,0,0.08); border-radius: 10px; padding: 10px 12px;",
    },
    series: [],
  }), [getContainSize]);

  // Stable ref for drill-down callback
  const drillDownRef = useRef(onDrillDown);
  drillDownRef.current = onDrillDown;

  // ── Init chart ──
  useEffect(() => {
    if (!chartRef.current) return;
    let disposed = false;

    const init = async () => {
      const features = await ensureWorldGeo();
      if (features) setWorldFeatures(features);
      if (disposed) return;

      if (!instanceRef.current) {
        instanceRef.current = echarts.init(chartRef.current!, undefined, { renderer: "canvas" });

        instanceRef.current.on("mouseover", (params: unknown) => {
          const p = params as { componentType?: string; name?: string };
          if (p.componentType === "geo") {
            setHoveredProvince(p.name || null);
            const idx = p.name ? (nameToIdxRef.current.get(p.name) ?? -1) : -1;
            startHoverAnimRef.current(idx);
          }
        });
        instanceRef.current.on("mouseout", (params: unknown) => {
          const p = params as { componentType?: string; name?: string };
          if (p.componentType === "geo") {
            setHoveredProvince(null);
            startHoverAnimRef.current(-1);
          }
        });

        instanceRef.current.on("click", (params: unknown) => {
          const p = params as { componentType?: string; name?: string };
          if (p.componentType === "geo" && p.name && hasCountryGeo(p.name)) {
            drillDownRef.current(p.name);
          }
        });

        setReady(true);
      }
      instanceRef.current.setOption(buildOption(), true);
    };
    init();

    return () => { disposed = true; };
  }, [buildOption, setHoveredProvince]);

  // ── Georoam → redraw dot matrix + sync avatars ──
  useEffect(() => {
    const chart = instanceRef.current;
    if (!chart || !ready) return;
    let idleTimer: ReturnType<typeof setTimeout>;
    const onRoam = () => {
      syncAvatarDOM();
      drawDotMatrix();
      clearTimeout(idleTimer);
      idleTimer = setTimeout(updateAvatarPositions, 200);
    };
    chart.on("georoam", onRoam);
    return () => {
      chart.off("georoam", onRoam);
      clearTimeout(idleTimer);
    };
  }, [ready, drawDotMatrix, syncAvatarDOM, updateAvatarPositions]);

  // ── ResizeObserver ──
  useEffect(() => {
    const el = chartRef.current;
    const chart = instanceRef.current;
    if (!el || !chart || !ready) return;
    const ro = new ResizeObserver(() => {
      // Recompute contain-fit layout size for new container dimensions
      const size = getContainSize();
      chart.setOption({ geo: { layoutSize: size } }, false);
      chart.resize();
      requestAnimationFrame(() => {
        drawDotMatrix();
        updateAvatarPositions();
      });
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, [ready, getContainSize, drawDotMatrix, updateAvatarPositions]);

  // ── Redraw when data changes ──
  useEffect(() => {
    if (!ready) return;
    const timer = setTimeout(() => {
      instanceRef.current?.resize();
      drawDotMatrix();
      updateAvatarPositions();
    }, 120);
    return () => clearTimeout(timer);
  }, [ready, buildOption, drawDotMatrix, updateAvatarPositions]);

  return (
    <div className="absolute inset-0" style={{ background: DOT_BG }}>
      {/* Radial vignette */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: "radial-gradient(ellipse 80% 70% at 50% 45%, transparent 50%, rgba(0,0,0,0.04) 100%)",
        }}
      />

      {/* Dot matrix canvas */}
      <canvas ref={dotCanvasRef} className="absolute inset-0 w-full h-full pointer-events-none z-[1]" />

      {/* ECharts container (transparent geo for roam/click) */}
      <div className="absolute inset-0 z-[2]">
        <div ref={chartRef} className="absolute inset-0" />
      </div>

      {/* City avatar overlay */}
      <div ref={avatarContainerRef} className="absolute inset-0 pointer-events-none z-[5]">
        {avatarPositions.map((ap) => {
          if (!ap.visible) return null;
          const cover = ap.city.covers[0];
          const isActive = selectedCity === ap.city.name;
          const s = ap.size;

          return (
            <div
              key={ap.city.name}
              data-city={ap.city.name}
              className="pointer-events-auto cursor-pointer group"
              style={{
                position: "absolute",
                left: 0,
                top: 0,
                width: s,
                height: s,
                transform: `translate3d(${ap.x - s / 2}px, ${ap.y - s / 2}px, 0)`,
                willChange: "transform",
              }}
              onClick={() => setSelectedCity(ap.city.name)}
            >
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

              {ap.city.count > 1 && (
                <div
                  className={`absolute flex items-center justify-center rounded-full
                    text-white font-semibold leading-none
                    ${isActive ? "bg-[var(--accent-cyan)]" : "bg-[var(--text-primary)]/70"}`}
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

              <div
                className="absolute left-1/2 -translate-x-1/2 opacity-0
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
    </div>
  );
}
