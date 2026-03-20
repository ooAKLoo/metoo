import { useEffect, useMemo, useRef, useCallback, useState } from "react";
import { useFavoriteStore } from "../stores/useFavoriteStore";
import { useMapStore } from "../stores/useMapStore";
import { useCityAggregation } from "../hooks/useCityAggregation";
import {
  ensureWorldGeo, ensureWorldGeoJson, ensureCountryGeo,
  buildGeoSvg, useSvgRoam,
  coverSrc, hasCountryGeo,
  AVATAR_MIN, AVATAR_MAX,
  type AvatarPos, type GeoSvgData,
} from "./map-shared";

// ── Dot Matrix constants ──
const DOT_BG = "#ffffff";
const DOT_LAND_DEFAULT = "#d0d0d0";
const DOT_LAND_ACTIVE = "#E63946";
const DOT_COLS = 90;
const DOT_RADIUS_RATIO = 2.5 / (1000 / DOT_COLS);

// ── Geometry helpers ──

interface DotInfo {
  lng: number;
  lat: number;
  svgX: number;
  svgY: number;
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

function buildWorldDotGrid(
  features: GeoFeature[],
  svgToGeo: (sx: number, sy: number) => [number, number],
  svgW: number,
  svgH: number,
) {
  const validFeatures = features.filter((f) => f.geometry?.coordinates);
  const countryPolygons = validFeatures.map((f) =>
    extractCountryPolygons(f.geometry as { type: string; coordinates: number[][][][] | number[][][][][] }),
  );

  // Build name → countryIdx mapping for hover lookup
  const nameToIdx = new Map<string, number>();
  validFeatures.forEach((f, i) => {
    if (f.properties?.name) nameToIdx.set(f.properties.name, i);
  });

  // Place dots on a uniform grid in SVG coordinate space (not geographic space)
  // This ensures visually even spacing regardless of Mercator distortion
  const svgSpacing = svgW / DOT_COLS;
  const rows = Math.ceil(svgH / svgSpacing);

  const dots: DotInfo[] = [];
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < DOT_COLS; c++) {
      const svgX = c * svgSpacing + svgSpacing / 2;
      const svgY = r * svgSpacing + svgSpacing / 2;
      // Inverse-project to geographic coordinates for point-in-polygon
      const [lng, lat] = svgToGeo(svgX, svgY);
      if (lat < -60 || lat > 85) continue; // skip extreme latitudes
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
      if (countryIdx >= 0) {
        dots.push({ lng, lat, svgX, svgY, countryIdx });
      }
    }
  }
  return { dots, countryPolygons, nameToIdx };
}

// ── Component ──

interface WorldMapProps {
  onDrillDown: (countryName?: string) => void;
}

export function WorldMap({ onDrillDown }: WorldMapProps) {
  const [svgEl, setSvgEl] = useState<SVGSVGElement | null>(null);
  const svgCallbackRef = useCallback((node: SVGSVGElement | null) => setSvgEl(node), []);

  const items = useFavoriteStore((s) => s.items);
  const selectedCity = useMapStore((s) => s.selectedCity);
  const setSelectedCity = useMapStore((s) => s.setSelectedCity);
  const setHoveredProvince = useMapStore((s) => s.setHoveredProvince);
  const { entries } = useCityAggregation();

  // ── Geo data state ──
  const [geoSvgData, setGeoSvgData] = useState<GeoSvgData | null>(null);
  const [worldFeatures, setWorldFeatures] = useState<GeoFeature[] | null>(null);

  // ── Pan/Zoom ──
  const roam = useSvgRoam(svgEl, geoSvgData?.svgW ?? 0, geoSvgData?.svgH ?? 0, {
    minZoom: 0.8,
    maxZoom: 10,
  });

  // ── Hover state ──
  const [hoveredCountry, setHoveredCountry] = useState<string | null>(null);

  // ── Hover animation refs ──
  const hoverAnimRef = useRef({ countryIdx: -1, dotOpacity: 1, rafId: 0 });
  const nameToIdxRef = useRef(new Map<string, number>());
  const drawDotMatrixRef = useRef(() => {});

  // ── Canvas ref ──
  const dotCanvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const svgSpacingRef = useRef(0);

  // ── Avatar overlay ──
  const [avatarPositions, setAvatarPositions] = useState<AvatarPos[]>([]);
  const avatarPosRef = useRef<AvatarPos[]>([]);
  const avatarContainerRef = useRef<HTMLDivElement>(null);

  // Stable ref for drill-down callback
  const drillDownRef = useRef(onDrillDown);
  drillDownRef.current = onDrillDown;

  // ── Load GeoJSON ──
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const [features, geoJson] = await Promise.all([
        ensureWorldGeo(),
        ensureWorldGeoJson(),
      ]);
      if (cancelled) return;
      if (features) setWorldFeatures(features);
      if (geoJson) {
        const svgData = buildGeoSvg(geoJson);
        setGeoSvgData(svgData);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  // ── Build dot grid with pre-computed SVG coordinates ──
  const worldDotData = useMemo(() => {
    if (!worldFeatures || !geoSvgData) {
      return { dots: [] as DotInfo[], countryPolygons: [] as CountryPolygons[], nameToIdx: new Map<string, number>() };
    }
    const data = buildWorldDotGrid(worldFeatures, geoSvgData.svgToGeo, geoSvgData.svgW, geoSvgData.svgH);
    // SVG spacing is uniform: svgW / DOT_COLS
    svgSpacingRef.current = geoSvgData.svgW / DOT_COLS;
    return data;
  }, [worldFeatures, geoSvgData]);

  const dotGrid = worldDotData.dots;
  const nameToIdx = worldDotData.nameToIdx;
  nameToIdxRef.current = nameToIdx;

  // Refs for fly-to animation (avoid stale closures)
  const geoSvgDataRef = useRef(geoSvgData);
  geoSvgDataRef.current = geoSvgData;
  const worldDotDataRef = useRef(worldDotData);
  worldDotDataRef.current = worldDotData;

  // ── Country data counts ──
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

  // ── Avatar position computation ──
  const computeAvatarPositions = useCallback((): AvatarPos[] => {
    if (!geoSvgData || !svgEl || entries.length === 0) return [];

    const zoomScale = Math.pow(roam.zoom, 0.4);
    const effectiveMin = Math.max(18, AVATAR_MIN * zoomScale);
    const effectiveMax = Math.min(72, AVATAR_MAX * zoomScale);
    const maxCount = Math.max(...entries.map((e) => e.count), 1);
    const maxSize = effectiveMax;

    const rect = svgEl.getBoundingClientRect();
    const w = rect.width;
    const h = rect.height;
    if (!w || !h) return [];

    const raw: AvatarPos[] = [];
    for (const city of entries) {
      if (city.covers.length === 0) continue;
      const [svgX, svgY] = geoSvgData.geoToSvg(city.coord[0], city.coord[1]);
      const [px, py] = roam.svgToScreen(svgX, svgY);
      if (!isFinite(px) || !isFinite(py)) continue;
      if (px < -maxSize || px > w + maxSize) continue;
      if (py < -maxSize || py > h + maxSize) continue;
      const t = Math.sqrt(city.count / maxCount);
      const size = effectiveMin + t * (effectiveMax - effectiveMin);
      raw.push({ city, x: px, y: py, size, visible: true });
    }

    // Collision detection
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
  }, [entries, geoSvgData, svgEl, roam.zoom, roam.svgToScreen]);

  const updateAvatarPositions = useCallback(() => {
    const positions = computeAvatarPositions();
    avatarPosRef.current = positions;
    setAvatarPositions(positions);
  }, [computeAvatarPositions]);

  const syncAvatarDOM = useCallback(() => {
    if (!geoSvgData || !svgEl) return;
    const container = avatarContainerRef.current;
    if (!container) return;

    const rect = svgEl.getBoundingClientRect();
    const w = rect.width;
    const h = rect.height;

    for (const ap of avatarPosRef.current) {
      if (!ap.visible) continue;
      const el = container.querySelector(`[data-city="${CSS.escape(ap.city.name)}"]`) as HTMLElement | null;
      if (!el) continue;
      const [svgX, svgY] = geoSvgData.geoToSvg(ap.city.coord[0], ap.city.coord[1]);
      const [px, py] = roam.svgToScreen(svgX, svgY);
      if (!isFinite(px) || !isFinite(py)) {
        el.style.display = "none";
        continue;
      }
      if (w && h && (px < -ap.size || px > w + ap.size || py < -ap.size || py > h + ap.size)) {
        el.style.display = "none";
        continue;
      }
      el.style.display = "";
      el.style.transform = `translate3d(${px - ap.size / 2}px, ${py - ap.size / 2}px, 0)`;
      ap.x = px;
      ap.y = py;
    }
  }, [geoSvgData, svgEl, roam.svgToScreen]);

  // ── Dot matrix canvas rendering ──
  const drawDotMatrix = useCallback(() => {
    const canvas = dotCanvasRef.current;
    if (!canvas || dotGrid.length === 0) {
      if (canvas) {
        const ctx = canvas.getContext("2d");
        if (ctx) ctx.clearRect(0, 0, canvas.width, canvas.height);
      }
      return;
    }
    const ctx = canvas.getContext("2d")!;
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    const needW = Math.round(rect.width * dpr);
    const needH = Math.round(rect.height * dpr);
    // Only resize when dimensions actually change — avoids expensive backing store reset
    if (canvas.width !== needW || canvas.height !== needH) {
      canvas.width = needW;
      canvas.height = needH;
    }
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, rect.width, rect.height);

    const canvasW = rect.width;
    const canvasH = rect.height;
    if (canvasW <= 0 || canvasH <= 0) return;

    // Read viewBox from ref for immediate access during drag
    const vb = roam.vbRef.current;

    // Match SVG preserveAspectRatio="xMidYMid meet": uniform scale + centering
    const scX = canvasW / vb.w;
    const scY = canvasH / vb.h;
    const scale = Math.min(scX, scY);
    const offX = (canvasW - vb.w * scale) / 2;
    const offY = (canvasH - vb.h * scale) / 2;

    // Dot radius from pre-computed SVG spacing
    const svgSpacing = svgSpacingRef.current;
    if (svgSpacing <= 0) return;
    const spacingPx = svgSpacing * scale;
    const baseR = spacingPx * DOT_RADIUS_RATIO;
    if (baseR < 0.3) return;

    // Visible area in SVG coordinates with padding
    const padSvg = svgSpacing * 2;
    const visMinX = vb.x - padSvg;
    const visMaxX = vb.x + vb.w + padSvg;
    const visMinY = vb.y - padSvg;
    const visMaxY = vb.y + vb.h + padSvg;

    const maxCount = countryDataCounts.size > 0 ? Math.max(...countryDataCounts.values()) : 1;
    const defaultDots: { x: number; y: number }[] = [];
    const activeBuckets = new Map<number, { x: number; y: number }[]>();
    const hoverIdx = hoverAnimRef.current.countryIdx;
    const hoverDefaultDots: { x: number; y: number }[] = [];
    const hoverActiveBuckets = new Map<number, { x: number; y: number }[]>();

    for (const dot of dotGrid) {
      // Cull dots outside visible SVG area
      if (dot.svgX < visMinX || dot.svgX > visMaxX) continue;
      if (dot.svgY < visMinY || dot.svgY > visMaxY) continue;

      // Convert SVG coords to canvas pixels (uniform scale + offset, matching SVG meet)
      const screenX = (dot.svgX - vb.x) * scale + offX;
      const screenY = (dot.svgY - vb.y) * scale + offY;

      const isHovered = hoverIdx >= 0 && dot.countryIdx === hoverIdx;
      const targetDefault = isHovered ? hoverDefaultDots : defaultDots;
      const targetActive = isHovered ? hoverActiveBuckets : activeBuckets;

      const count = countryDataCounts.get(dot.countryIdx) || 0;
      if (count > 0) {
        const t = Math.sqrt(count / maxCount);
        const opacity = Math.round((0.45 + t * 0.55) * 10) / 10;
        if (!targetActive.has(opacity)) targetActive.set(opacity, []);
        targetActive.get(opacity)!.push({ x: screenX, y: screenY });
      } else {
        targetDefault.push({ x: screenX, y: screenY });
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
  }, [dotGrid, countryDataCounts, roam.vbRef]);
  drawDotMatrixRef.current = drawDotMatrix;

  // ── Hover animation trigger ──
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

  // ── SVG event handlers ──
  const handleCountryMouseEnter = useCallback((name: string) => {
    if (roam.isAnimating.current) return;
    setHoveredProvince(name);
    setHoveredCountry(name);
    const idx = nameToIdxRef.current.get(name) ?? -1;
    startHoverAnimRef.current(idx);
  }, [setHoveredProvince, roam.isAnimating]);

  const handleCountryMouseLeave = useCallback(() => {
    if (roam.isAnimating.current) return;
    setHoveredProvince(null);
    setHoveredCountry(null);
    startHoverAnimRef.current(-1);
  }, [setHoveredProvince, roam.isAnimating]);

  const handleCountryClick = useCallback((name: string) => {
    if (roam.isDragging.current || roam.isAnimating.current) return;
    if (!hasCountryGeo(name)) return;

    const geo = geoSvgDataRef.current;
    const data = worldDotDataRef.current;
    const idx = nameToIdxRef.current.get(name);

    // Fallback: no geo data or index → immediate drill-down
    if (idx === undefined || !geo || !data.countryPolygons[idx]) {
      drillDownRef.current(name);
      return;
    }

    const cpoly = data.countryPolygons[idx];
    if (cpoly.rings.length === 0) {
      drillDownRef.current(name);
      return;
    }

    // Clear hover state before animation
    setHoveredCountry(null);
    setHoveredProvince(null);
    startHoverAnimRef.current(-1);

    // Prefetch country GeoJSON so CountryMap loads instantly
    ensureCountryGeo(name);

    // Compute country bounding box in SVG coordinates
    const [minLng, minLat, maxLng, maxLat] = cpoly.bbox;
    const [svgL, svgB] = geo.geoToSvg(minLng, minLat);
    const [svgR, svgT] = geo.geoToSvg(maxLng, maxLat);

    const cw = svgR - svgL;
    const ch = svgB - svgT;
    if (cw <= 0 || ch <= 0) {
      drillDownRef.current(name);
      return;
    }

    const cx = (svgL + svgR) / 2;
    const cy = (svgT + svgB) / 2;

    // Target zoom: fit country with ~50% padding, clamped
    const pad = 1.5;
    const z = Math.min(geo.svgW / (cw * pad), geo.svgH / (ch * pad), 8);
    const tw = geo.svgW / z;
    const th = geo.svgH / z;

    // Fire BOTH at the same time — CountryMap fades in DURING the zoom
    drillDownRef.current(name);
    roam.animateTo(
      { x: cx - tw / 2, y: cy - th / 2, w: tw, h: th },
      400,
      () => drawDotMatrixRef.current(), // canvas-only redraw per frame, no React
    );
  }, [roam.isDragging, roam.isAnimating, roam.animateTo, setHoveredProvince]);

  // ── Redraw canvas on viewBox change ──
  useEffect(() => {
    drawDotMatrix();
    syncAvatarDOM();
  }, [roam.viewBox, drawDotMatrix, syncAvatarDOM]);

  // ── Update avatar positions on zoom or data change ──
  useEffect(() => {
    updateAvatarPositions();
  }, [updateAvatarPositions]);

  // ── Debounced avatar recalc after zoom/pan settles ──
  useEffect(() => {
    const timer = setTimeout(updateAvatarPositions, 200);
    return () => clearTimeout(timer);
  }, [roam.viewBox, updateAvatarPositions]);

  // ── ResizeObserver ──
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => {
      requestAnimationFrame(() => {
        drawDotMatrix();
        updateAvatarPositions();
      });
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, [drawDotMatrix, updateAvatarPositions]);

  // ── Redraw when data changes ──
  useEffect(() => {
    const timer = setTimeout(() => {
      drawDotMatrix();
      updateAvatarPositions();
    }, 120);
    return () => clearTimeout(timer);
  }, [dotGrid, countryDataCounts, drawDotMatrix, updateAvatarPositions]);

  return (
    <div ref={containerRef} className="absolute inset-0" style={{ background: DOT_BG }}>
      {/* Radial vignette */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: "radial-gradient(ellipse 80% 70% at 50% 45%, transparent 50%, rgba(0,0,0,0.04) 100%)",
        }}
      />

      {/* Dot matrix canvas */}
      <canvas ref={dotCanvasRef} className="absolute inset-0 w-full h-full pointer-events-none z-[1]" />

      {/* SVG overlay for event detection (transparent paths) */}
      {geoSvgData && (
        <svg
          ref={svgCallbackRef}
          className="absolute inset-0 w-full h-full z-[2]"
          viewBox={roam.viewBox}
          preserveAspectRatio="xMidYMid meet"
          onPointerDown={roam.onPointerDown}
          onPointerMove={roam.onPointerMove}
          onPointerUp={roam.onPointerUp}
          style={{ touchAction: "none", cursor: "grab" }}
        >
          {geoSvgData.provinces.map((prov, provIdx) => {
            const isHovered = hoveredCountry === prov.name;
            return (
              <g
                key={`${prov.name}-${provIdx}`}
                onMouseEnter={() => handleCountryMouseEnter(prov.name)}
                onMouseLeave={handleCountryMouseLeave}
                onClick={() => handleCountryClick(prov.name)}
                style={{ cursor: hasCountryGeo(prov.name) ? "pointer" : "default" }}
              >
                {prov.paths.map((d, i) => (
                  <path
                    key={i}
                    d={d}
                    fill={isHovered ? "rgba(0,0,0,0.045)" : "transparent"}
                    stroke="none"
                  />
                ))}
                {isHovered && (
                  <text
                    x={prov.center[0]}
                    y={prov.center[1]}
                    textAnchor="middle"
                    dominantBaseline="central"
                    fill="#333"
                    fontSize={14 / roam.zoom}
                    fontWeight={500}
                    fontFamily="system-ui, sans-serif"
                    style={{ pointerEvents: "none" }}
                  >
                    {prov.name}
                  </text>
                )}
              </g>
            );
          })}
        </svg>
      )}

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
                  data-no-export
                  className={`absolute flex items-center justify-center rounded-full
                    text-white font-semibold leading-none
                    ${isActive ? "bg-[var(--accent-cyan)]" : "bg-[rgba(26,26,26,0.7)]"}`}
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
