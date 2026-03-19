import { useEffect, useMemo, useRef, useCallback, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Maximize2, ArrowLeft } from "lucide-react";
import { MapLegend } from "./MapLegend";
import { useFavoriteStore } from "../stores/useFavoriteStore";
import { useMapStore } from "../stores/useMapStore";
import { useThemeStore } from "../stores/useThemeStore";
import { useCityAggregation } from "../hooks/useCityAggregation";
import {
  coverSrc, lerpColor, ensureCountryGeo, buildGeoSvg, useSvgRoam,
  PROV_FULL, AVATAR_MIN, AVATAR_MAX,
  type AvatarPos, type GeoSvgData,
} from "./map-shared";

const FAUVIST_PALETTE = [
  "#E63946", "#F77F00", "#FCBF49", "#2A9D8F",
  "#3A86FF", "#7209B7", "#8AC926", "#FF006E",
  "#FB5607", "#06D6A0", "#FFBE0B", "#4CC9F0",
];

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

  const themeId = useThemeStore((s) => s.themeId);
  const { entries } = useCityAggregation();

  const [isZoomedIn, setIsZoomedIn] = useState(false);
  const [loadFailed, setLoadFailed] = useState(false);

  // ── GeoJSON → SVG data ──
  const [geo, setGeo] = useState<GeoSvgData | null>(null);

  useEffect(() => {
    let cancelled = false;
    setGeo(null);
    setLoadFailed(false);
    ensureCountryGeo(countryName).then((geoJson) => {
      if (cancelled) return;
      if (!geoJson) { setLoadFailed(true); return; }
      setGeo(buildGeoSvg(geoJson, 1000));
    });
    return () => { cancelled = true; };
  }, [countryName]);

  // ── SVG element ref via callback ──
  const [svgEl, setSvgEl] = useState<SVGSVGElement | null>(null);
  const sketchContainerRef = useRef<SVGSVGElement | null>(null);

  const svgRefCallback = useCallback((el: SVGSVGElement | null) => {
    setSvgEl(el);
    sketchContainerRef.current = el;
  }, []);

  // ── Pan / Zoom ──
  const roam = useSvgRoam(svgEl, geo?.svgW ?? 0, geo?.svgH ?? 0);

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

    const raw: AvatarPos[] = [];
    for (const city of entries) {
      if (city.covers.length === 0) continue;
      const [sx, sy] = geo.geoToSvg(city.coord[0], city.coord[1]);
      const [px, py] = roam.svgToScreen(sx, sy);
      if (!isFinite(px) || !isFinite(py)) continue;
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

    for (const ap of avatarPosRef.current) {
      if (!ap.visible) continue;
      const el = container.querySelector(
        `[data-city="${CSS.escape(ap.city.name)}"]`,
      ) as HTMLElement | null;
      if (!el) continue;
      const [sx, sy] = geo.geoToSvg(ap.city.coord[0], ap.city.coord[1]);
      const [px, py] = roam.svgToScreen(sx, sy);
      if (!isFinite(px) || !isFinite(py)) { el.style.display = "none"; continue; }
      el.style.display = "";
      el.style.transform = `translate3d(${px - ap.size / 2}px, ${py - ap.size / 2}px, 0)`;
      ap.x = px;
      ap.y = py;
    }
  }, [geo, svgEl, roam.svgToScreen]);

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

  // ── Province choropleth ──
  const { provCounts, maxProv } = useMemo(() => {
    const counts = new Map<string, number>();
    for (const item of items) {
      for (const loc of item.locations) {
        // China uses full province names in GeoJSON (北京市), but items may have short (北京)
        const name = isChina ? (PROV_FULL[loc.province] || loc.province) : loc.province;
        if (name) counts.set(name, (counts.get(name) || 0) + 1);
      }
    }
    const max = counts.size > 0 ? Math.max(...counts.values()) : 0;
    return { provCounts: counts, maxProv: max };
  }, [items, isChina]);

  // ── Theme palettes ──
  const isDark = themeId === "rose";
  const isFauvist = themeId === "fauvist";

  const ramp = isDark
    ? { lo: "#1a2240", mid: "#2d4878", hi: "#5a9ad6" }
    : { lo: "#eeeef2", mid: "#a8c8e8", hi: "#3b82f6" };

  const pal = isFauvist
    ? { area: "#f5f0e8", border: "#ffffff", emphasis: "#f5f0e8", borderWidth: 1.5,
        selectedDot: "#ffffff", selectedBorder: "#2D2A32", shadow: 0.12 }
    : isDark
      ? { area: "#1e2744", border: "#2e3d5c", emphasis: "#2a3560", borderWidth: 0.8,
          selectedDot: "#f59e0b", selectedBorder: "#1a2240", shadow: 0.25 }
      : { area: "#f4f4f7", border: "#d8d8e0", emphasis: "#e8e4ee", borderWidth: 0.8,
          selectedDot: "#e94560", selectedBorder: "#ffffff", shadow: 0.06 };

  // ── Province fill map ──
  const provinceFills = useMemo(() => {
    const map = new Map<string, { fill: string; emphFill: string }>();
    if (!geo) return map;

    if (isFauvist) {
      const names = geo.provinces.map((p) => p.name);
      for (let i = 0; i < names.length; i++) {
        const color = FAUVIST_PALETTE[i % FAUVIST_PALETTE.length];
        const hasData = provCounts.has(names[i]);
        map.set(names[i], {
          fill: hasData ? color : lerpColor(color, "#f5f0e8", 0.35),
          emphFill: lerpColor(color, "#ffffff", 0.2),
        });
      }
    } else {
      const safeMax = Math.max(maxProv, 1);
      for (const [name, count] of provCounts.entries()) {
        const t = Math.sqrt(count / safeMax);
        const color = t < 0.5
          ? lerpColor(ramp.lo, ramp.mid, t * 2)
          : lerpColor(ramp.mid, ramp.hi, (t - 0.5) * 2);
        const emphT = Math.min(t + 0.15, 1);
        const emphColor = emphT < 0.5
          ? lerpColor(ramp.lo, ramp.mid, emphT * 2)
          : lerpColor(ramp.mid, ramp.hi, (emphT - 0.5) * 2);
        map.set(name, { fill: color, emphFill: emphColor });
      }
    }
    return map;
  }, [geo, isFauvist, provCounts, maxProv, ramp.lo, ramp.mid, ramp.hi]);

  // ── Hovered province ──
  const [hoveredProv, setHoveredProv] = useState<string | null>(null);

  const handleProvEnter = useCallback((name: string) => {
    setHoveredProv(name);
    setHoveredProvince(name);
  }, [setHoveredProvince]);

  const handleProvLeave = useCallback(() => {
    setHoveredProv(null);
    setHoveredProvince(null);
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

  // ── Sync avatars on viewBox change ──
  const roamIdleTimerRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  useEffect(() => {
    if (!geo) return;
    if (roam.isDragging.current) {
      if (sketchContainerRef.current) sketchContainerRef.current.style.filter = "none";
      syncAvatarDOM();
      clearTimeout(roamIdleTimerRef.current);
      roamIdleTimerRef.current = setTimeout(() => {
        if (sketchContainerRef.current) sketchContainerRef.current.style.filter = "url(#sketch-edges)";
        updateAvatarPositions();
      }, 200);
    } else {
      updateAvatarPositions();
    }
  }, [roam.vb, geo]);

  useEffect(() => () => clearTimeout(roamIdleTimerRef.current), []);

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

  // ── Hover label ──
  const hoveredProvData = useMemo(() => {
    if (!hoveredProv || !geo) return null;
    const prov = geo.provinces.find((p) => p.name === hoveredProv);
    if (!prov) return null;
    const count = provCounts.get(hoveredProv);
    const label = count ? `${hoveredProv} · ${count}` : hoveredProv;
    return { cx: prov.center[0], cy: prov.center[1], label };
  }, [hoveredProv, geo, provCounts]);

  // ── Dash animation ──
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
    <div className="absolute inset-0">
      {/* SVG filters */}
      <svg className="absolute w-0 h-0" aria-hidden>
        <defs>
          <filter id="sketch-edges">
            <feTurbulence type="turbulence" baseFrequency="0.04" numOctaves={4} seed={2} result="noise" />
            <feDisplacementMap in="SourceGraphic" in2="noise" scale={1.8} xChannelSelector="R" yChannelSelector="G" />
          </filter>
          <filter id="noise-grain">
            <feTurbulence type="fractalNoise" baseFrequency="0.65" numOctaves={3} stitchTiles="stitch" />
            <feColorMatrix type="saturate" values="0" />
          </filter>
        </defs>
      </svg>

      {/* Radial vignette */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: isDark
            ? "radial-gradient(ellipse 80% 70% at 50% 45%, transparent 40%, rgba(10,10,25,0.35) 100%)"
            : "radial-gradient(ellipse 80% 70% at 50% 45%, transparent 40%, rgba(0,0,0,0.06) 100%)",
        }}
      />

      {/* Noise grain overlay */}
      <div
        className="absolute inset-0 pointer-events-none mix-blend-soft-light"
        style={{ filter: "url(#noise-grain)", opacity: isDark ? 0.08 : 0.04 }}
      />

      {/* Main SVG map */}
      <svg
        ref={svgRefCallback}
        className="absolute inset-0 w-full h-full z-[2] cursor-grab active:cursor-grabbing"
        viewBox={roam.viewBox}
        preserveAspectRatio="xMidYMid meet"
        style={{ filter: "url(#sketch-edges)" }}
        onPointerDown={roam.onPointerDown}
        onPointerMove={roam.onPointerMove}
        onPointerUp={roam.onPointerUp}
      >
        <defs>
          <linearGradient id="route-grad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor={isFauvist ? "#2D2A32" : "#ff6b6b"} />
            <stop offset="100%" stopColor={isFauvist ? "#7209B7" : "#ee5a24"} />
          </linearGradient>
          <filter id="prov-shadow" x="-5%" y="-5%" width="110%" height="110%">
            <feDropShadow
              dx={isFauvist ? 3 : 2}
              dy={isFauvist ? 4 : 3}
              stdDeviation={isFauvist ? 4 : 3}
              floodColor={
                isDark ? "rgba(0,0,0,0.45)"
                  : isFauvist ? "rgba(80,60,30,0.18)"
                    : "rgba(0,0,0,0.12)"
              }
            />
          </filter>
        </defs>

        {/* Province paths */}
        <g filter="url(#prov-shadow)">
          {geo.provinces.map((prov) => {
            const fills = provinceFills.get(prov.name);
            const isHovered = hoveredProv === prov.name;
            const fillColor = isHovered
              ? (fills?.emphFill ?? pal.emphasis)
              : (fills?.fill ?? pal.area);
            return prov.paths.map((d, pi) => (
              <path
                key={`${prov.name}-${pi}`}
                d={d}
                fill={fillColor}
                stroke={pal.border}
                strokeWidth={pal.borderWidth / z}
                strokeLinejoin="round"
                style={{ transition: "fill 0.15s ease" }}
                onMouseEnter={() => handleProvEnter(prov.name)}
                onMouseLeave={handleProvLeave}
              />
            ));
          })}
        </g>

        {/* Hovered province label */}
        {hoveredProvData && (
          <text
            x={hoveredProvData.cx}
            y={hoveredProvData.cy}
            textAnchor="middle"
            dominantBaseline="central"
            fill={isDark ? "#e2e8f0" : "#4a4a5a"}
            fontSize={11 / z}
            fontWeight={500}
            pointerEvents="none"
          >
            {hoveredProvData.label}
          </text>
        )}

        {/* Fauvist province name labels */}
        {isFauvist && geo.provinces.map((prov) => (
          <text
            key={`label-${prov.name}`}
            x={prov.center[0]}
            y={prov.center[1]}
            textAnchor="middle"
            dominantBaseline="central"
            fill="#3a3a3a"
            fontSize={9 / z}
            pointerEvents="none"
          >
            {prov.name}
          </text>
        ))}

        {/* Route lines */}
        {routeSvgData?.segments.map((seg, i) => (
          <line
            key={`route-seg-${i}`}
            x1={seg.x1} y1={seg.y1} x2={seg.x2} y2={seg.y2}
            stroke="url(#route-grad)"
            strokeWidth={(isFauvist ? 3 : 2) / z}
            strokeDasharray={`${6 / z} ${4 / z}`}
            strokeDashoffset={-dashOffset / z}
            strokeLinecap="round"
            opacity={isFauvist ? 0.85 : 0.7}
          />
        ))}

        {/* Route node circles */}
        {routeSvgData?.nodes.map((node) => {
          const r = (isFauvist ? 11 : 10) / z;
          return (
            <g key={`route-node-${node.label}`}>
              <circle
                cx={node.cx} cy={node.cy} r={r}
                fill={isFauvist ? "#2D2A32" : "url(#route-grad)"}
                stroke={isFauvist ? "#FCBF49" : "#fff"}
                strokeWidth={(isFauvist ? 2.5 : 1.5) / z}
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
            fill={pal.selectedDot}
            stroke={pal.selectedBorder}
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

      {/* Back button + zoom reset */}
      <div className="absolute top-[42px] left-2 z-[10] flex gap-1.5">
        <motion.button
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          whileTap={{ scale: 0.95 }}
          onClick={onBack}
          className="flex items-center gap-1
                     bg-panel/90 backdrop-blur-sm border border-[var(--border-color)]/40
                     shadow-[0_1px_4px_rgba(0,0,0,0.06)]
                     px-2 py-1 rounded-lg
                     text-[10px] font-medium text-secondary
                     hover:text-primary hover:shadow-[0_2px_8px_rgba(0,0,0,0.1)]
                     transition-all cursor-pointer"
        >
          <ArrowLeft size={11} />
          返回
        </motion.button>

        <AnimatePresence>
          {isZoomedIn && (
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
          )}
        </AnimatePresence>
      </div>

      {/* Category legend */}
      <MapLegend />
    </div>
  );
}
