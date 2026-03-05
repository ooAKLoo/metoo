import { useEffect, useMemo, useRef, useCallback, useState } from "react";
import * as echarts from "echarts/core";
import {
  GeoComponent,
  TooltipComponent,
} from "echarts/components";
import { LinesChart, ScatterChart } from "echarts/charts";
import { CanvasRenderer } from "echarts/renderers";
import { useFavoriteStore } from "../stores/useFavoriteStore";
import { useMapStore } from "../stores/useMapStore";
import { useThemeStore } from "../stores/useThemeStore";
import { useCityAggregation } from "../hooks/useCityAggregation";
import { CityGallery } from "./CityGallery";

echarts.use([
  GeoComponent,
  TooltipComponent,
  LinesChart,
  ScatterChart,
  CanvasRenderer,
]);

export function MapView() {
  const chartRef = useRef<HTMLDivElement>(null);
  const instanceRef = useRef<echarts.ECharts | null>(null);
  const geoRegistered = useRef(false);
  const [ready, setReady] = useState(false);

  const items = useFavoriteStore((s) => s.items);
  const selectedItemId = useMapStore((s) => s.selectedItemId);
  const selectedCity = useMapStore((s) => s.selectedCity);
  const routePath = useMapStore((s) => s.routePath);
  const setSelectedCity = useMapStore((s) => s.setSelectedCity);
  const setHoveredProvince = useMapStore((s) => s.setHoveredProvince);

  const themeId = useThemeStore((s) => s.themeId);
  const { scatterData, entries } = useCityAggregation();

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

  // ── Build chart option ──
  // Province choropleth (primary) + uniform city dots (secondary).
  // No heatmap, no ripple effects — clean & modern.
  const buildOption = useCallback((): echarts.EChartsCoreOption => {
    const isDark = themeId === "rose";

    // ── Province choropleth: aggregate items per province ──
    const provCounts = new Map<string, number>();
    for (const item of items) {
      for (const loc of item.locations) {
        provCounts.set(loc.province, (provCounts.get(loc.province) || 0) + 1);
      }
    }
    const maxProv = provCounts.size > 0 ? Math.max(...provCounts.values()) : 1;

    // Smooth fill: linear interpolation in RGB
    const fill = (t: number) => {
      if (isDark) {
        // #1a2240 → #1e5588
        return `rgb(${26 + Math.round(t * 4)},${34 + Math.round(t * 51)},${64 + Math.round(t * 72)})`;
      }
      // #fce8ec → #e87088
      return `rgb(${252 - Math.round(t * 20)},${232 - Math.round(t * 120)},${236 - Math.round(t * 100)})`;
    };

    const regions = [...provCounts.entries()].map(([name, count]) => {
      const t = count / Math.max(maxProv, 3); // dampen single-item provinces
      return {
        name,
        itemStyle: { areaColor: fill(t) },
        emphasis: { itemStyle: { areaColor: fill(Math.min(t + 0.1, 1)) } },
      };
    });

    // ── Theme palette ──
    const pal = isDark
      ? {
          area: "#1a2240", border: "#283050", emphasis: "#222d50",
          dot: "#4a90b8", selectedDot: "#f59e0b", selectedBorder: "#1a2240",
          tipBg: "#1e2a45", tipBd: "#2d3f5f", tipTxt: "#e2e8f0", tipSub: "#94a3b8",
          shadow: 0.25, lbl: "#94a3b8",
        }
      : {
          area: "#f5f5f8", border: "#e8e8ec", emphasis: "#eeeef2",
          dot: "#e94560", selectedDot: "#f59e0b", selectedBorder: "#ffffff",
          tipBg: "#ffffff", tipBd: "#eeeeee", tipTxt: "#1a1a1a", tipSub: "#999999",
          shadow: 0.06, lbl: "#6b7280",
        };

    return {
      geo: {
        map: "china",
        roam: true,
        zoom: 1.2,
        center: [104, 35],
        itemStyle: {
          areaColor: pal.area,
          borderColor: pal.border,
          borderWidth: 0.5,
        },
        emphasis: {
          itemStyle: { areaColor: pal.emphasis },
          label: {
            show: true,
            formatter: (params: { name: string }) => {
              const c = provCounts.get(params.name);
              return c ? `${params.name} · ${c}` : params.name;
            },
            color: pal.lbl,
            fontSize: 11,
            fontWeight: 500,
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
        // 0: City dots — small, uniform size, no effects
        {
          type: "scatter",
          coordinateSystem: "geo",
          data: scatterData,
          symbolSize: 5,
          itemStyle: { color: pal.dot },
          zlevel: 1,
        },
        // 1: Route lines
        {
          type: "lines",
          coordinateSystem: "geo",
          data: [],
          lineStyle: {
            color: "#0ea5e9",
            width: 1.5,
            opacity: 0.6,
            curveness: 0.1,
          },
          effect: {
            show: true,
            period: 6,
            trailLength: 0.2,
            symbol: "arrow",
            symbolSize: 6,
            color: "#0ea5e9",
          },
          zlevel: 2,
        },
        // 2: Route node numbers
        {
          type: "scatter",
          coordinateSystem: "geo",
          data: [],
          symbolSize: 18,
          itemStyle: { color: "#0ea5e9" },
          label: {
            show: true,
            formatter: (pr: unknown) => {
              const params = pr as { data?: { value?: number[] } };
              return `${params.data?.value?.[2] ?? ""}`;
            },
            color: "#fff",
            fontSize: 8,
            fontWeight: "bold" as const,
          },
          zlevel: 3,
        },
        // 3: Selected item — subtle highlight dot
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
  }, [scatterData, selectedCoord, themeId, items]);

  // ── Init chart ──
  useEffect(() => {
    if (!chartRef.current) return;

    let disposed = false;

    const init = async () => {
      if (!geoRegistered.current) {
        const geoJson = await import("../assets/china.json");
        echarts.registerMap(
          "china",
          geoJson as unknown as Parameters<typeof echarts.registerMap>[1]
        );
        geoRegistered.current = true;
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

        setReady(true);
      }

      instanceRef.current.setOption(buildOption(), true);
    };

    init();

    return () => {
      disposed = true;
    };
  }, [buildOption, setHoveredProvince, setSelectedCity]);

  // ── Route animation: incremental series update only ──
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

    chart.resize();

    const ro = new ResizeObserver(() => {
      chart.resize();
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, [ready]);

  // ── Center on selected item ──
  useEffect(() => {
    if (!instanceRef.current || !selectedCoord) return;
    instanceRef.current.setOption({
      geo: { center: selectedCoord, zoom: 5 },
    });
  }, [selectedCoord]);

  // ── Zoom to selected city ──
  useEffect(() => {
    if (!instanceRef.current || !selectedCity) return;
    const city = entries.find((e) => e.name === selectedCity);
    if (city) {
      instanceRef.current.setOption({
        geo: { center: city.coord, zoom: 6 },
      });
    }
  }, [selectedCity, entries]);

  return (
    <div className="absolute inset-0">
      <div ref={chartRef} className="absolute inset-0" />
      {items.length === 0 && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <span className="text-[12px] text-secondary">
            地图将在抓取后显示
          </span>
        </div>
      )}
      <CityGallery />
    </div>
  );
}
