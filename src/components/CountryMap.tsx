import { useEffect, useRef, useState, useCallback, useMemo } from "react";
import * as echarts from "echarts/core";
import { motion, AnimatePresence } from "motion/react";
import { ArrowLeft } from "lucide-react";
import { useMapStore } from "../stores/useMapStore";
import { useFavoriteStore } from "../stores/useFavoriteStore";
import { useCityAggregation } from "../hooks/useCityAggregation";
import {
  ensureCountryGeo, coverSrc,
  AVATAR_MIN, AVATAR_MAX,
  type AvatarPos,
} from "./map-shared";

interface CountryMapProps {
  countryName: string;
  onBack: () => void;
}

export default function CountryMap({ countryName, onBack }: CountryMapProps) {
  const chartRef = useRef<HTMLDivElement>(null);
  const instanceRef = useRef<echarts.ECharts | null>(null);
  const [ready, setReady] = useState(false);
  const [loadFailed, setLoadFailed] = useState(false);

  const selectedCity = useMapStore((s) => s.selectedCity);
  const setSelectedCity = useMapStore((s) => s.setSelectedCity);
  const setHoveredProvince = useMapStore((s) => s.setHoveredProvince);
  const items = useFavoriteStore((s) => s.items);
  const { entries } = useCityAggregation();

  // ── Avatar overlay ──
  const [avatarPositions, setAvatarPositions] = useState<AvatarPos[]>([]);
  const avatarPosRef = useRef<AvatarPos[]>([]);
  const avatarContainerRef = useRef<HTMLDivElement>(null);

  const computeAvatarPositions = useCallback((): AvatarPos[] => {
    const chart = instanceRef.current;
    if (!chart || entries.length === 0) return [];

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

    for (const ap of avatarPosRef.current) {
      if (!ap.visible) continue;
      const el = container.querySelector(`[data-city="${CSS.escape(ap.city.name)}"]`) as HTMLElement | null;
      if (!el) continue;
      const px = chart.convertToPixel("geo", ap.city.coord);
      if (!px || !isFinite(px[0]) || !isFinite(px[1])) {
        el.style.display = "none";
        continue;
      }
      el.style.display = "";
      el.style.transform = `translate3d(${px[0] - ap.size / 2}px, ${px[1] - ap.size / 2}px, 0)`;
      ap.x = px[0];
      ap.y = px[1];
    }
  }, []);

  // ── Province counts for choropleth ──
  const { provCounts, maxProv } = useMemo(() => {
    const counts = new Map<string, number>();
    for (const item of items) {
      for (const loc of item.locations) {
        if (loc.province) {
          counts.set(loc.province, (counts.get(loc.province) || 0) + 1);
        }
      }
    }
    const max = counts.size > 0 ? Math.max(...counts.values()) : 0;
    return { provCounts: counts, maxProv: max };
  }, [items]);

  // ── Build option ──
  const mapKey = `country:${countryName}`;

  const buildOption = useCallback((): echarts.EChartsCoreOption => {
    const ramp = { lo: "#eeeef2", mid: "#a8c8e8", hi: "#3b82f6" };

    const lerpColor = (a: string, b: string, t: number): string => {
      const parse = (hex: string) => {
        const v = parseInt(hex.slice(1), 16);
        return [(v >> 16) & 0xff, (v >> 8) & 0xff, v & 0xff];
      };
      const [r1, g1, b1] = parse(a);
      const [r2, g2, b2] = parse(b);
      return `rgb(${Math.round(r1 + (r2 - r1) * t)},${Math.round(g1 + (g2 - g1) * t)},${Math.round(b1 + (b2 - b1) * t)})`;
    };

    const safeMax = Math.max(maxProv, 1);
    const regions = [...provCounts.entries()].map(([name, count]) => {
      const t = Math.sqrt(count / safeMax);
      const color = t < 0.5
        ? lerpColor(ramp.lo, ramp.mid, t * 2)
        : lerpColor(ramp.mid, ramp.hi, (t - 0.5) * 2);
      return {
        name,
        itemStyle: { areaColor: color },
        label: { show: true, formatter: name, color: "#6a6a80", fontSize: 9 },
      };
    });

    return {
      geo: {
        map: mapKey,
        roam: true,
        aspectScale: 0.85,
        layoutCenter: ["50%", "50%"],
        layoutSize: "95%",
        scaleLimit: { min: 0.8, max: 10 },
        animationDurationUpdate: 500,
        animationEasingUpdate: "cubicInOut",
        itemStyle: {
          areaColor: "#f4f4f7",
          borderColor: "#d8d8e0",
          borderWidth: 0.8,
          shadowColor: "rgba(0,0,0,0.12)",
          shadowBlur: 6,
          shadowOffsetX: 2,
          shadowOffsetY: 3,
        },
        emphasis: {
          itemStyle: {
            areaColor: "#e8e4ee",
            borderColor: "#d8d8e0",
            shadowColor: "rgba(0,0,0,0.2)",
            shadowBlur: 10,
          },
          label: {
            show: true,
            color: "#4a4a5a",
            fontSize: 11,
            fontWeight: 500,
          },
        },
        select: { itemStyle: { areaColor: "#e8e4ee" } },
        label: { show: true, color: "#8a8a9a", fontSize: 8 },
        regions,
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
    };
  }, [mapKey, provCounts, maxProv]);

  // ── Init ──
  useEffect(() => {
    if (!chartRef.current) return;
    let disposed = false;

    const init = async () => {
      const ok = await ensureCountryGeo(countryName);
      if (!ok) {
        setLoadFailed(true);
        return;
      }
      if (disposed) return;

      if (!instanceRef.current) {
        instanceRef.current = echarts.init(chartRef.current!, undefined, { renderer: "canvas" });

        instanceRef.current.on("mouseover", { seriesIndex: undefined }, (params: unknown) => {
          const p = params as { componentType?: string; name?: string };
          if (p.componentType === "geo") setHoveredProvince(p.name || null);
        });
        instanceRef.current.on("mouseout", { seriesIndex: undefined }, () => {
          setHoveredProvince(null);
        });

        setReady(true);
      }
      instanceRef.current.setOption(buildOption(), true);
    };
    init();

    return () => {
      disposed = true;
      if (instanceRef.current) {
        instanceRef.current.dispose();
        instanceRef.current = null;
      }
    };
  }, [countryName, buildOption, setHoveredProvince]);

  // ── Georoam ──
  useEffect(() => {
    const chart = instanceRef.current;
    if (!chart || !ready) return;
    const onRoam = () => {
      syncAvatarDOM();
    };
    chart.on("georoam", onRoam);
    return () => { chart.off("georoam", onRoam); };
  }, [ready, syncAvatarDOM]);

  // ── Resize ──
  useEffect(() => {
    const el = chartRef.current;
    const chart = instanceRef.current;
    if (!el || !chart || !ready) return;
    const ro = new ResizeObserver(() => {
      chart.resize();
      requestAnimationFrame(updateAvatarPositions);
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, [ready, updateAvatarPositions]);

  // ── Update on data change ──
  useEffect(() => {
    if (!ready) return;
    const timer = setTimeout(() => {
      instanceRef.current?.resize();
      updateAvatarPositions();
    }, 120);
    return () => clearTimeout(timer);
  }, [ready, buildOption, updateAvatarPositions]);

  if (loadFailed) {
    return (
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="text-center text-secondary">
          <p className="text-sm">No province data for {countryName}</p>
          <button
            onClick={onBack}
            className="mt-3 text-xs text-blue-500 hover:underline cursor-pointer"
          >
            Back to world
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="absolute inset-0">
      {/* Radial vignette */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: "radial-gradient(ellipse 80% 70% at 50% 45%, transparent 40%, rgba(0,0,0,0.06) 100%)",
        }}
      />

      {/* ECharts container */}
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
            </div>
          );
        })}
      </div>

      {/* Back to world button */}
      <div className="absolute top-[42px] left-2 z-[10]">
        <AnimatePresence>
          <motion.button
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
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
            {countryName}
          </motion.button>
        </AnimatePresence>
      </div>
    </div>
  );
}
