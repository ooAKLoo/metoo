import { useEffect, useMemo, useRef, useCallback, useState } from "react";
import * as echarts from "echarts/core";
import { motion, AnimatePresence } from "motion/react";
import { Maximize2 } from "lucide-react";
import { MapLegend } from "./MapLegend";
import { useFavoriteStore } from "../stores/useFavoriteStore";
import { useMapStore } from "../stores/useMapStore";
import { useThemeStore } from "../stores/useThemeStore";
import { useCityAggregation } from "../hooks/useCityAggregation";
import {
  coverSrc, lerpColor, ensureChinaGeo,
  PROV_FULL, AVATAR_MIN, AVATAR_MAX,
  type AvatarPos,
} from "./map-shared";

export function ChinaMap() {
  const chartRef = useRef<HTMLDivElement>(null);
  const instanceRef = useRef<echarts.ECharts | null>(null);
  const [ready, setReady] = useState(false);

  const items = useFavoriteStore((s) => s.items);
  const selectedItemId = useMapStore((s) => s.selectedItemId);
  const selectedCity = useMapStore((s) => s.selectedCity);
  const routePath = useMapStore((s) => s.routePath);
  const setSelectedCity = useMapStore((s) => s.setSelectedCity);
  const setHoveredProvince = useMapStore((s) => s.setHoveredProvince);

  const themeId = useThemeStore((s) => s.themeId);
  const { entries } = useCityAggregation();

  const [isZoomedIn, setIsZoomedIn] = useState(false);

  // ── Avatar overlay positions ──
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

  // ── Progressive route drawing ──
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
        const fullName = PROV_FULL[loc.province] || loc.province;
        counts.set(fullName, (counts.get(fullName) || 0) + 1);
      }
    }
    const max = counts.size > 0 ? Math.max(...counts.values()) : 0;
    return { provCounts: counts, maxProv: max };
  }, [items]);

  // ── Reset view ──
  const resetView = useCallback(() => {
    if (!instanceRef.current) return;
    instanceRef.current.setOption({
      geo: {
        layoutCenter: ["50%", "50%"],
        layoutSize: "115%",
        zoom: 1,
        center: [104.5, 36.5],
        animationDurationUpdate: 500,
      },
    });
    setIsZoomedIn(false);
  }, []);

  // ── Build chart option ──
  const buildOption = useCallback((): echarts.EChartsCoreOption => {
    const isDark = themeId === "rose";
    const isFauvist = themeId === "fauvist";

    const FAUVIST_PALETTE = [
      "#E63946", "#F77F00", "#FCBF49", "#2A9D8F",
      "#3A86FF", "#7209B7", "#8AC926", "#FF006E",
      "#FB5607", "#06D6A0", "#FFBE0B", "#4CC9F0",
    ];

    const ramp = isDark
      ? { lo: "#1a2240", mid: "#2d4878", hi: "#5a9ad6" }
      : { lo: "#eeeef2", mid: "#a8c8e8", hi: "#3b82f6" };

    const pal = isFauvist
      ? {
          area: "#f5f0e8", border: "#ffffff", emphasis: "#f5f0e8",
          borderWidth: 1.5,
          selectedDot: "#ffffff", selectedBorder: "#2D2A32",
          tipBg: "#fffdf8", tipBd: "#e0d5c5", tipTxt: "#2D2A32", tipSub: "#6a6a6a",
          shadow: 0.12,
        }
      : isDark
        ? {
            area: "#1e2744", border: "#2e3d5c", emphasis: "#2a3560",
            borderWidth: 0.8,
            selectedDot: "#f59e0b", selectedBorder: "#1a2240",
            tipBg: "#1e2a45", tipBd: "#2d3f5f", tipTxt: "#e2e8f0", tipSub: "#94a3b8",
            shadow: 0.25,
          }
        : {
            area: "#f4f4f7", border: "#d8d8e0", emphasis: "#e8e4ee",
            borderWidth: 0.8,
            selectedDot: "#e94560", selectedBorder: "#ffffff",
            tipBg: "#ffffff", tipBd: "#eeeeee", tipTxt: "#1a1a1a", tipSub: "#999999",
            shadow: 0.06,
          };

    // Build regions
    let regions;

    if (isFauvist) {
      const allProvNames = Object.values(PROV_FULL);
      regions = allProvNames.map((name, i) => {
        const color = FAUVIST_PALETTE[i % FAUVIST_PALETTE.length];
        const hasData = provCounts.has(name);
        const count = provCounts.get(name) || 0;
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

    return {
      geo: {
        map: "china",
        roam: true,
        aspectScale: 0.75,
        center: [104.5, 36.5],
        layoutCenter: ["50%", "50%"],
        layoutSize: "115%",
        scaleLimit: { min: 0.8, max: 10 },
        animationDurationUpdate: 500,
        animationEasingUpdate: "cubicInOut",
        itemStyle: {
          areaColor: pal.area,
          borderColor: pal.border,
          borderWidth: pal.borderWidth,
          borderType: "solid" as const,
          shadowColor: isDark ? "rgba(0,0,0,0.45)" : isFauvist ? "rgba(80,60,30,0.18)" : "rgba(0,0,0,0.12)",
          shadowBlur: isFauvist ? 8 : 6,
          shadowOffsetX: isFauvist ? 3 : 2,
          shadowOffsetY: isFauvist ? 4 : 3,
        },
        emphasis: {
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
        },
        select: { itemStyle: { areaColor: pal.emphasis } },
        label: { show: false },
        regions,
      },
      tooltip: {
        trigger: "item",
        backgroundColor: pal.tipBg,
        borderColor: pal.tipBd,
        borderWidth: 1,
        textStyle: { color: pal.tipTxt, fontSize: 12 },
        extraCssText: `box-shadow: 0 4px 16px rgba(0,0,0,${pal.shadow}); border-radius: 10px; padding: 10px 12px;`,
        formatter: (params: unknown) => {
          const d = params as { name?: string; data?: { titles?: string[] } };
          if (!d.data?.titles) return d.name || "";
          const list = d.data.titles
            .slice(0, 4)
            .map((t: string) => `<div style="font-size:11px;color:${pal.tipSub};margin-top:2px;line-height:1.4">· ${t}</div>`)
            .join("");
          const more = d.data.titles.length > 4
            ? `<div style="font-size:10px;color:${pal.tipSub};margin-top:3px">还有 ${d.data.titles.length - 4} 条…</div>`
            : "";
          return `<div style="font-weight:600;font-size:13px;margin-bottom:4px">${d.name}</div>${list}${more}`;
        },
      },
      series: [
        // 0: Route lines
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
        // 1: Route node numbers
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
        // 2: Selected item highlight dot
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
  }, [selectedCoord, themeId, provCounts, maxProv]);

  // ── Init chart ──
  useEffect(() => {
    if (!chartRef.current) return;
    let disposed = false;

    const init = async () => {
      await ensureChinaGeo();
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

    return () => { disposed = true; };
  }, [buildOption, setHoveredProvince]);

  // ── Route animation ──
  useEffect(() => {
    const chart = instanceRef.current;
    if (!chart || !ready) return;

    if (!routePath || revealedSegments === 0) {
      chart.setOption({ series: [{ data: [] }, { data: [] }] });
      return;
    }

    const segCount = Math.min(revealedSegments, routePath.length - 1);
    const nodeCount = Math.min(revealedSegments + 1, routePath.length);

    const lines: { coords: [number, number][] }[] = [];
    for (let i = 0; i < segCount; i++) {
      lines.push({ coords: [routePath[i].coord, routePath[i + 1].coord] });
    }

    const nodes = routePath.slice(0, nodeCount).map((node, i) => ({
      name: `${i + 1}. ${node.name}`,
      value: [...node.coord, i + 1] as [number, number, number],
    }));

    chart.setOption({ series: [{ data: lines }, { data: nodes }] });
  }, [ready, routePath, revealedSegments]);

  // ── ResizeObserver ──
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

  // ── Georoam: fast DOM sync + filter toggle ──
  const sketchContainerRef = useRef<HTMLDivElement>(null);
  const roamIdleTimerRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  useEffect(() => {
    const chart = instanceRef.current;
    if (!chart || !ready) return;

    const onRoam = () => {
      if (sketchContainerRef.current) {
        sketchContainerRef.current.style.filter = "none";
      }
      clearTimeout(roamIdleTimerRef.current);

      syncAvatarDOM();

      roamIdleTimerRef.current = setTimeout(() => {
        if (sketchContainerRef.current) {
          sketchContainerRef.current.style.filter = "url(#sketch-edges)";
        }
        updateAvatarPositions();
      }, 200);
    };
    chart.on("georoam", onRoam);
    return () => {
      chart.off("georoam", onRoam);
      clearTimeout(roamIdleTimerRef.current);
    };
  }, [ready, syncAvatarDOM, updateAvatarPositions]);

  // ── Update on option change ──
  useEffect(() => {
    if (!ready) return;
    const timer = setTimeout(() => {
      instanceRef.current?.resize();
      updateAvatarPositions();
    }, 120);
    return () => clearTimeout(timer);
  }, [ready, buildOption, updateAvatarPositions]);

  const isDark = themeId === "rose";

  return (
    <div className="absolute inset-0">
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

      {/* ECharts container */}
      <div
        ref={sketchContainerRef}
        className="absolute inset-0 z-[2]"
        style={{ filter: "url(#sketch-edges)" }}
      >
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

      {/* Zoom reset */}
      <div className="absolute top-[42px] left-2 z-[10]">
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
