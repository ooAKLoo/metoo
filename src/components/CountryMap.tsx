import { useEffect, useMemo, useRef, useCallback, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Maximize2 } from "lucide-react";
import { MapLegend } from "./MapLegend";
import { useFavoriteStore } from "../stores/useFavoriteStore";
import { useMapStore } from "../stores/useMapStore";
import type { CityEntry } from "../hooks/useCityAggregation";
import {
  coverSrc, ensureCountryGeo, buildGeoSvg, useSvgRoam,
  PROV_FULL, AVATAR_MIN, AVATAR_MAX,
  type AvatarPos, type GeoSvgData,
} from "./map-shared";

// ── Dot Matrix constants (same as WorldMap) ──
const DOT_BG = "#ffffff";
const DOT_LAND_DEFAULT = "#d0d0d0";
const DOT_LAND_ACTIVE = "#E63946";
const DOT_COLS = 90;
const DOT_RADIUS_RATIO = 2.5 / (1000 / DOT_COLS);

// ── Geometry helpers ──

interface DotInfo {
  svgX: number;
  svgY: number;
  provIdx: number;
}

interface ProvPolygons {
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

function extractProvPolygons(
  geometry: { type: string; coordinates: number[][][][] | number[][][][][] },
): ProvPolygons {
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

type GeoFeature = {
  geometry: { type: string; coordinates: unknown };
  properties?: { name?: string };
};

function buildCountryDotGrid(
  features: GeoFeature[],
  svgToGeo: (sx: number, sy: number) => [number, number],
  svgW: number,
  svgH: number,
) {
  const validFeatures = features.filter((f) => f.geometry?.coordinates);
  const provPolygons = validFeatures.map((f) =>
    extractProvPolygons(
      f.geometry as { type: string; coordinates: number[][][][] | number[][][][][] },
    ),
  );

  const nameToIdx = new Map<string, number>();
  validFeatures.forEach((f, i) => {
    if (f.properties?.name) nameToIdx.set(f.properties.name, i);
  });

  const svgSpacing = svgW / DOT_COLS;
  const rows = Math.ceil(svgH / svgSpacing);

  const dots: DotInfo[] = [];
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < DOT_COLS; c++) {
      const svgX = c * svgSpacing + svgSpacing / 2;
      const svgY = r * svgSpacing + svgSpacing / 2;
      const [lng, lat] = svgToGeo(svgX, svgY);
      if (lat < -60 || lat > 85) continue;
      let provIdx = -1;
      for (let pi = 0; pi < provPolygons.length; pi++) {
        const pp = provPolygons[pi];
        if (pp.rings.length === 0) continue;
        if (lng < pp.bbox[0] || lng > pp.bbox[2] || lat < pp.bbox[1] || lat > pp.bbox[3]) continue;
        for (const ring of pp.rings) {
          if (pointInRing(lng, lat, ring)) { provIdx = pi; break; }
        }
        if (provIdx >= 0) break;
      }
      if (provIdx >= 0) {
        dots.push({ svgX, svgY, provIdx });
      }
    }
  }
  return { dots, nameToIdx };
}

// ── Component ──

interface CountryMapProps {
  countryName: string;
  onBack: () => void;
}

export default function CountryMap({ countryName, onBack }: CountryMapProps) {
  const isChina = countryName === "China";

  const items = useFavoriteStore((s) => s.items);
  const selectedItemId = useMapStore((s) => s.selectedItemId);
  const selectedCity = useMapStore((s) => s.selectedCity);
  const routePath = useMapStore((s) => s.routePath);
  const setSelectedCity = useMapStore((s) => s.setSelectedCity);
  const setHoveredProvince = useMapStore((s) => s.setHoveredProvince);

  const [isZoomedIn, setIsZoomedIn] = useState(false);
  const [loadFailed, setLoadFailed] = useState(false);

  // ── GeoJSON → SVG data + raw features ──
  const [geo, setGeo] = useState<GeoSvgData | null>(null);
  const [countryFeatures, setCountryFeatures] = useState<GeoFeature[] | null>(null);

  useEffect(() => {
    let cancelled = false;
    setGeo(null);
    setCountryFeatures(null);
    setLoadFailed(false);
    ensureCountryGeo(countryName).then((geoJson) => {
      if (cancelled) return;
      if (!geoJson) { setLoadFailed(true); return; }
      setGeo(buildGeoSvg(geoJson, 1000));
      setCountryFeatures((geoJson.features || []) as GeoFeature[]);
    });
    return () => { cancelled = true; };
  }, [countryName]);

  // ── Country-filtered city aggregation ──
  // Only include cities whose province belongs to the current country's GeoJSON
  const entries = useMemo((): CityEntry[] => {
    if (!geo) return [];
    const provNames = new Set(geo.provinces.map((p) => p.name));

    const cityAgg = new Map<
      string,
      { coord: [number, number]; count: number; titles: string[]; covers: string[] }
    >();

    for (const item of items) {
      for (const loc of item.locations) {
        const fullProv = isChina
          ? (PROV_FULL[loc.province] || loc.province)
          : loc.province;
        if (!provNames.has(fullProv)) continue;

        const key = loc.name;
        const existing = cityAgg.get(key);
        if (existing) {
          existing.count++;
          if (existing.titles.length < 5) existing.titles.push(item.title);
          if (existing.covers.length < 4 && item.cover) existing.covers.push(item.cover);
        } else {
          cityAgg.set(key, {
            coord: [loc.lng, loc.lat],
            count: 1,
            titles: [item.title],
            covers: item.cover ? [item.cover] : [],
          });
        }
      }
    }

    return Array.from(cityAgg.entries())
      .map(([name, data]) => ({ name, ...data }))
      .sort((a, b) => b.count - a.count);
  }, [items, geo, isChina]);

  // ── SVG element ref ──
  const [svgEl, setSvgEl] = useState<SVGSVGElement | null>(null);
  const svgRefCallback = useCallback((el: SVGSVGElement | null) => setSvgEl(el), []);

  // ── Pan / Zoom ──
  const roam = useSvgRoam(svgEl, geo?.svgW ?? 0, geo?.svgH ?? 0);

  // ── Canvas + container refs ──
  const dotCanvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const svgSpacingRef = useRef(0);

  // ── Hover animation refs ──
  const hoverAnimRef = useRef({ provIdx: -1, dotOpacity: 1, rafId: 0 });
  const nameToIdxRef = useRef(new Map<string, number>());
  const drawDotMatrixRef = useRef(() => {});

  // ── Avatar overlay ──
  const [avatarPositions, setAvatarPositions] = useState<AvatarPos[]>([]);
  const avatarPosRef = useRef<AvatarPos[]>([]);
  const avatarContainerRef = useRef<HTMLDivElement>(null);

  const computeAvatarPositions = useCallback((): AvatarPos[] => {
    if (!geo || entries.length === 0 || !svgEl) return [];

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
      const [sx, sy] = geo.geoToSvg(city.coord[0], city.coord[1]);
      const [px, py] = roam.svgToScreen(sx, sy);
      if (!isFinite(px) || !isFinite(py)) continue;
      if (px < -maxSize || px > w + maxSize) continue;
      if (py < -maxSize || py > h + maxSize) continue;
      const t = Math.sqrt(city.count / maxCount);
      const size = effectiveMin + t * (effectiveMax - effectiveMin);
      raw.push({ city, x: px, y: py, size, visible: true });
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
  }, [entries, geo, svgEl, roam.zoom, roam.svgToScreen]);

  const updateAvatarPositions = useCallback(() => {
    const positions = computeAvatarPositions();
    avatarPosRef.current = positions;
    setAvatarPositions(positions);
  }, [computeAvatarPositions]);

  const syncAvatarDOM = useCallback(() => {
    if (!geo || !svgEl) return;
    const container = avatarContainerRef.current;
    if (!container) return;

    const rect = svgEl.getBoundingClientRect();
    const w = rect.width;
    const h = rect.height;

    for (const ap of avatarPosRef.current) {
      if (!ap.visible) continue;
      const el = container.querySelector(
        `[data-city="${CSS.escape(ap.city.name)}"]`,
      ) as HTMLElement | null;
      if (!el) continue;
      const [sx, sy] = geo.geoToSvg(ap.city.coord[0], ap.city.coord[1]);
      const [px, py] = roam.svgToScreen(sx, sy);
      if (!isFinite(px) || !isFinite(py)) { el.style.display = "none"; continue; }
      if (w && h && (px < -ap.size || px > w + ap.size || py < -ap.size || py > h + ap.size)) {
        el.style.display = "none"; continue;
      }
      el.style.display = "";
      el.style.transform = `translate3d(${px - ap.size / 2}px, ${py - ap.size / 2}px, 0)`;
      ap.x = px;
      ap.y = py;
    }
  }, [geo, svgEl, roam.svgToScreen]);

  // ── Build dot grid ──
  const dotData = useMemo(() => {
    if (!countryFeatures || !geo) {
      return { dots: [] as DotInfo[], nameToIdx: new Map<string, number>() };
    }
    const data = buildCountryDotGrid(countryFeatures, geo.svgToGeo, geo.svgW, geo.svgH);
    svgSpacingRef.current = geo.svgW / DOT_COLS;
    return data;
  }, [countryFeatures, geo]);

  const dotGrid = dotData.dots;
  nameToIdxRef.current = dotData.nameToIdx;

  // ── Province counts (by name) ──
  const provCounts = useMemo(() => {
    const counts = new Map<string, number>();
    for (const item of items) {
      for (const loc of item.locations) {
        const name = isChina ? (PROV_FULL[loc.province] || loc.province) : loc.province;
        if (name) counts.set(name, (counts.get(name) || 0) + 1);
      }
    }
    return counts;
  }, [items, isChina]);

  // ── Province counts (by feature index) ──
  const provIdxCounts = useMemo(() => {
    const counts = new Map<number, number>();
    for (const [name, count] of provCounts.entries()) {
      const idx = dotData.nameToIdx.get(name);
      if (idx !== undefined) counts.set(idx, count);
    }
    return counts;
  }, [provCounts, dotData.nameToIdx]);

  // ── Draw dot matrix on canvas ──
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
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, rect.width, rect.height);

    const canvasW = rect.width;
    const canvasH = rect.height;
    if (canvasW <= 0 || canvasH <= 0) return;

    const vb = roam.vbRef.current;
    const scX = canvasW / vb.w;
    const scY = canvasH / vb.h;
    const scale = Math.min(scX, scY);
    const offX = (canvasW - vb.w * scale) / 2;
    const offY = (canvasH - vb.h * scale) / 2;

    const svgSpacing = svgSpacingRef.current;
    if (svgSpacing <= 0) return;
    const spacingPx = svgSpacing * scale;
    const baseR = spacingPx * DOT_RADIUS_RATIO;
    if (baseR < 0.3) return;

    const padSvg = svgSpacing * 2;
    const visMinX = vb.x - padSvg;
    const visMaxX = vb.x + vb.w + padSvg;
    const visMinY = vb.y - padSvg;
    const visMaxY = vb.y + vb.h + padSvg;

    const maxCount = provIdxCounts.size > 0 ? Math.max(...provIdxCounts.values()) : 1;
    const defaultDots: { x: number; y: number }[] = [];
    const activeBuckets = new Map<number, { x: number; y: number }[]>();
    const hoverIdx = hoverAnimRef.current.provIdx;
    const hoverDefaultDots: { x: number; y: number }[] = [];
    const hoverActiveBuckets = new Map<number, { x: number; y: number }[]>();

    for (const dot of dotGrid) {
      if (dot.svgX < visMinX || dot.svgX > visMaxX) continue;
      if (dot.svgY < visMinY || dot.svgY > visMaxY) continue;

      const screenX = (dot.svgX - vb.x) * scale + offX;
      const screenY = (dot.svgY - vb.y) * scale + offY;

      const isHovered = hoverIdx >= 0 && dot.provIdx === hoverIdx;
      const targetDefault = isHovered ? hoverDefaultDots : defaultDots;
      const targetActive = isHovered ? hoverActiveBuckets : activeBuckets;

      const count = provIdxCounts.get(dot.provIdx) || 0;
      if (count > 0) {
        const t = Math.sqrt(count / maxCount);
        const opacity = Math.round((0.45 + t * 0.55) * 10) / 10;
        if (!targetActive.has(opacity)) targetActive.set(opacity, []);
        targetActive.get(opacity)!.push({ x: screenX, y: screenY });
      } else {
        targetDefault.push({ x: screenX, y: screenY });
      }
    }

    // Draw non-hovered dots
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

    // Draw hovered province dots with animated fade
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
  }, [dotGrid, provIdxCounts, roam.vbRef]);
  drawDotMatrixRef.current = drawDotMatrix;

  // ── Hover animation ──
  const startHoverAnim = useCallback((newIdx: number) => {
    const anim = hoverAnimRef.current;
    if (newIdx === anim.provIdx) return;

    const fadeOut = newIdx >= 0;
    anim.provIdx = newIdx;
    const startOpacity = anim.dotOpacity;
    const endOpacity = fadeOut ? 0 : 1;
    if (startOpacity === endOpacity) {
      drawDotMatrixRef.current();
      return;
    }

    const start = performance.now();
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

  // ── Progressive route drawing ──
  const totalSegments = routePath ? routePath.length - 1 : 0;
  const [revealedSegments, setRevealedSegments] = useState(0);

  useEffect(() => {
    if (!routePath || totalSegments === 0) { setRevealedSegments(0); return; }
    setRevealedSegments(0);
    let current = 0;
    const timer = setInterval(() => {
      current++;
      setRevealedSegments(current);
      if (current >= totalSegments) clearInterval(timer);
    }, 600);
    return () => clearInterval(timer);
  }, [routePath, totalSegments]);

  // ── Selected item coord ──
  const selectedCoord = useMemo(() => {
    if (!selectedItemId) return null;
    const item = items.find((i) => i.id === selectedItemId);
    if (!item || item.locations.length === 0) return null;
    return [item.locations[0].lng, item.locations[0].lat] as [number, number];
  }, [selectedItemId, items]);

  // ── Hovered province ──
  const [hoveredProv, setHoveredProv] = useState<string | null>(null);

  const handleProvEnter = useCallback((name: string) => {
    setHoveredProv(name);
    setHoveredProvince(name);
    const idx = nameToIdxRef.current.get(name) ?? -1;
    startHoverAnimRef.current(idx);
  }, [setHoveredProvince]);

  const handleProvLeave = useCallback(() => {
    setHoveredProv(null);
    setHoveredProvince(null);
    startHoverAnimRef.current(-1);
  }, [setHoveredProvince]);

  // ── Reset view ──
  const resetView = useCallback(() => {
    roam.resetView();
    setIsZoomedIn(false);
  }, [roam]);

  // ── Center on selected item ──
  useEffect(() => {
    if (!geo || !selectedCoord) return;
    const [sx, sy] = geo.geoToSvg(selectedCoord[0], selectedCoord[1]);
    roam.centerOn(sx, sy, 4);
    setIsZoomedIn(true);
  }, [selectedCoord, geo, roam.centerOn]);

  // ── Center on selected city ──
  useEffect(() => {
    if (!geo || !selectedCity) return;
    const city = entries.find((e) => e.name === selectedCity);
    if (city) {
      const [sx, sy] = geo.geoToSvg(city.coord[0], city.coord[1]);
      roam.centerOn(sx, sy, 5);
      setIsZoomedIn(true);
    }
  }, [selectedCity, entries, geo, roam.centerOn]);

  // ── Redraw canvas + sync avatars on viewBox change ──
  useEffect(() => {
    drawDotMatrix();
    syncAvatarDOM();
  }, [roam.viewBox, drawDotMatrix, syncAvatarDOM]);

  // ── Debounced avatar recalc after zoom/pan settles ──
  useEffect(() => {
    const timer = setTimeout(updateAvatarPositions, 200);
    return () => clearTimeout(timer);
  }, [roam.viewBox, updateAvatarPositions]);

  // ── Update avatar positions on data change ──
  useEffect(() => {
    updateAvatarPositions();
  }, [updateAvatarPositions]);

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
  }, [dotGrid, provIdxCounts, drawDotMatrix, updateAvatarPositions]);

  // ── Route geometry in SVG coords ──
  const routeSvgData = useMemo(() => {
    if (!geo || !routePath || revealedSegments === 0) return null;
    const segCount = Math.min(revealedSegments, routePath.length - 1);
    const nodeCount = Math.min(revealedSegments + 1, routePath.length);
    const segments: { x1: number; y1: number; x2: number; y2: number }[] = [];
    for (let i = 0; i < segCount; i++) {
      const [x1, y1] = geo.geoToSvg(routePath[i].coord[0], routePath[i].coord[1]);
      const [x2, y2] = geo.geoToSvg(routePath[i + 1].coord[0], routePath[i + 1].coord[1]);
      segments.push({ x1, y1, x2, y2 });
    }
    const nodes = routePath.slice(0, nodeCount).map((node, i) => {
      const [cx, cy] = geo.geoToSvg(node.coord[0], node.coord[1]);
      return { cx, cy, label: i + 1, name: node.name };
    });
    return { segments, nodes };
  }, [geo, routePath, revealedSegments]);

  // ── Selected item in SVG coords ──
  const selectedSvg = useMemo(() => {
    if (!geo || !selectedCoord) return null;
    const [cx, cy] = geo.geoToSvg(selectedCoord[0], selectedCoord[1]);
    return { cx, cy };
  }, [geo, selectedCoord]);

  // ── Dash animation for routes ──
  const dashAnimRef = useRef(0);
  const dashRafRef = useRef(0);
  const [dashOffset, setDashOffset] = useState(0);

  useEffect(() => {
    if (!routeSvgData || routeSvgData.segments.length === 0) {
      cancelAnimationFrame(dashRafRef.current);
      return;
    }
    let active = true;
    const tick = () => {
      if (!active) return;
      dashAnimRef.current = (dashAnimRef.current + 0.5) % 20;
      setDashOffset(dashAnimRef.current);
      dashRafRef.current = requestAnimationFrame(tick);
    };
    dashRafRef.current = requestAnimationFrame(tick);
    return () => { active = false; cancelAnimationFrame(dashRafRef.current); };
  }, [routeSvgData]);

  // ── Load failed ──
  if (loadFailed) {
    return (
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="text-center text-secondary">
          <p className="text-sm">No province data for {countryName}</p>
          <button onClick={onBack} className="mt-3 text-xs text-blue-500 hover:underline cursor-pointer">
            Back to world
          </button>
        </div>
      </div>
    );
  }

  if (!geo) return <div className="absolute inset-0" />;

  const z = Math.max(roam.zoom, 1);

  return (
    <div ref={containerRef} className="absolute inset-0" style={{ background: DOT_BG }}>
      {/* Radial vignette (same as WorldMap) */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: "radial-gradient(ellipse 80% 70% at 50% 45%, transparent 50%, rgba(0,0,0,0.04) 100%)",
        }}
      />

      {/* Dot matrix canvas */}
      <canvas ref={dotCanvasRef} className="absolute inset-0 w-full h-full pointer-events-none z-[1]" />

      {/* SVG overlay for events + route + selected dot */}
      <svg
        ref={svgRefCallback}
        className="absolute inset-0 w-full h-full z-[2]"
        viewBox={roam.viewBox}
        preserveAspectRatio="xMidYMid meet"
        onPointerDown={roam.onPointerDown}
        onPointerMove={roam.onPointerMove}
        onPointerUp={roam.onPointerUp}
        style={{ touchAction: "none", cursor: "grab" }}
      >
        <defs>
          <linearGradient id="route-grad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#ff6b6b" />
            <stop offset="100%" stopColor="#ee5a24" />
          </linearGradient>
        </defs>

        {/* Transparent province paths for event detection */}
        {geo.provinces.map((prov) => {
          const isHovered = hoveredProv === prov.name;
          return (
            <g
              key={prov.name}
              onMouseEnter={() => handleProvEnter(prov.name)}
              onMouseLeave={handleProvLeave}
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
                  fontSize={14 / z}
                  fontWeight={500}
                  fontFamily="system-ui, sans-serif"
                  style={{ pointerEvents: "none" }}
                >
                  {prov.name}
                  {provCounts.get(prov.name) ? ` · ${provCounts.get(prov.name)}` : ""}
                </text>
              )}
            </g>
          );
        })}

        {/* Route lines */}
        {routeSvgData?.segments.map((seg, i) => (
          <line
            key={`route-seg-${i}`}
            x1={seg.x1} y1={seg.y1} x2={seg.x2} y2={seg.y2}
            stroke="url(#route-grad)"
            strokeWidth={2 / z}
            strokeDasharray={`${6 / z} ${4 / z}`}
            strokeDashoffset={-dashOffset / z}
            strokeLinecap="round"
            opacity={0.7}
          />
        ))}

        {/* Route node circles */}
        {routeSvgData?.nodes.map((node) => {
          const r = 10 / z;
          return (
            <g key={`route-node-${node.label}`}>
              <circle
                cx={node.cx} cy={node.cy} r={r}
                fill="url(#route-grad)"
                stroke="#fff"
                strokeWidth={1.5 / z}
              />
              <text
                x={node.cx} y={node.cy}
                textAnchor="middle" dominantBaseline="central"
                fill="#fff" fontSize={9 / z}
                fontFamily="ZCOOL KuaiLe, cursive"
                pointerEvents="none"
              >
                {node.label}
              </text>
            </g>
          );
        })}

        {/* Selected item dot */}
        {selectedSvg && (
          <circle
            cx={selectedSvg.cx} cy={selectedSvg.cy}
            r={4 / z}
            fill={DOT_LAND_ACTIVE}
            stroke="#ffffff"
            strokeWidth={1.5 / z}
          />
        )}
      </svg>

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
                position: "absolute", left: 0, top: 0, width: s, height: s,
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
                  src={coverSrc(cover)} alt=""
                  referrerPolicy="no-referrer" crossOrigin="anonymous"
                  className="w-full h-full object-cover" loading="lazy"
                />
              </div>
              {ap.city.count > 1 && (
                <div
                  className={`absolute flex items-center justify-center rounded-full
                    text-white font-semibold leading-none
                    ${isActive ? "bg-[var(--accent-cyan)]" : "bg-[var(--text-primary)]/70"}`}
                  style={{
                    top: -2, right: -2,
                    minWidth: s * 0.38, height: s * 0.38,
                    fontSize: Math.max(8, s * 0.24), padding: "0 3px",
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

      {/* Zoom reset */}
      <AnimatePresence>
        {isZoomedIn && (
          <div className="absolute top-[42px] left-2 z-[10]">
            <motion.button
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              whileTap={{ scale: 0.95 }}
              onClick={resetView}
              className="flex items-center gap-1
                         bg-panel/90 backdrop-blur-sm border border-[var(--border-color)]/40
                         shadow-[0_1px_4px_rgba(0,0,0,0.06)]
                         px-2 py-1 rounded-lg
                         text-[10px] font-medium text-secondary
                         hover:text-primary hover:shadow-[0_2px_8px_rgba(0,0,0,0.1)]
                         transition-all cursor-pointer"
            >
              <Maximize2 size={11} />
              全览
            </motion.button>
          </div>
        )}
      </AnimatePresence>

      {/* Category legend */}
      <MapLegend />
    </div>
  );
}
