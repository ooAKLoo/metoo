import { useEffect, useMemo, useRef, useCallback, useState } from "react";
import * as echarts from "echarts/core";
import {
  GeoComponent,
  TooltipComponent,
  VisualMapComponent,
} from "echarts/components";
import {
  EffectScatterChart,
  HeatmapChart,
  LinesChart,
  ScatterChart,
} from "echarts/charts";
import { CanvasRenderer } from "echarts/renderers";
import { useFavoriteStore } from "../stores/useFavoriteStore";
import { useMapStore } from "../stores/useMapStore";
import { useCityAggregation } from "../hooks/useCityAggregation";
import { CityGallery } from "./CityGallery";

echarts.use([
  GeoComponent,
  TooltipComponent,
  VisualMapComponent,
  EffectScatterChart,
  HeatmapChart,
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

  const { scatterData, heatmapData, entries } = useCityAggregation();

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

  // ── Base option (geo + heatmap + effectScatter + selected highlight) ──
  // Does NOT include route data — route is updated incrementally.
  const buildOption = useCallback((): echarts.EChartsCoreOption => {
    const maxCount = Math.max(...scatterData.map((d) => d.value[2]), 1);

    return {
      geo: {
        map: "china",
        roam: true,
        zoom: 1.2,
        center: [104, 35],
        itemStyle: {
          areaColor: "#f0f0f2",
          borderColor: "#d4d4d8",
          borderWidth: 0.8,
        },
        emphasis: {
          itemStyle: { areaColor: "#e4e4e7" },
          label: { show: false },
        },
        select: {
          itemStyle: { areaColor: "#e4e4e7" },
        },
        label: { show: false },
      },
      tooltip: {
        trigger: "item",
        backgroundColor: "#ffffff",
        borderColor: "#e5e5e5",
        borderWidth: 1,
        textStyle: { color: "#1a1a1a", fontSize: 12 },
        extraCssText: "box-shadow: 0 4px 12px rgba(0,0,0,0.08); border-radius: 8px;",
        formatter: (params: unknown) => {
          const p = params as { name?: string; data?: { titles?: string[] } };
          if (p.data?.titles) {
            const titleList = p.data.titles
              .map(
                (t: string) =>
                  `<div style="font-size:11px;color:#8c8c8c">· ${t}</div>`
              )
              .join("");
            return `<div style="font-weight:600;color:#1a1a1a;margin-bottom:4px">${p.name}</div>${titleList}`;
          }
          return p.name || "";
        },
      },
      visualMap: {
        show: false,
        min: 0,
        max: maxCount,
        inRange: {
          color: ["transparent", "rgba(233,69,96,0.15)", "rgba(233,69,96,0.5)", "#e94560"],
        },
        seriesIndex: 0,
      },
      series: [
        // 0: Heatmap
        {
          type: "heatmap",
          coordinateSystem: "geo",
          data: heatmapData,
          pointSize: 30,
          blurSize: 40,
          zlevel: 0,
        },
        // 1: effectScatter
        {
          type: "effectScatter",
          coordinateSystem: "geo",
          data: scatterData,
          symbolSize: (val: number[]) => Math.min(6 + val[2] * 2, 18),
          showEffectOn: "emphasis",
          rippleEffect: { brushType: "stroke", scale: 3, period: 4 },
          itemStyle: {
            color: "#e94560",
            shadowBlur: 4,
            shadowColor: "rgba(233,69,96,0.3)",
          },
          zlevel: 1,
        },
        // 2: Route lines (placeholder — data set by route effect)
        {
          type: "lines",
          coordinateSystem: "geo",
          data: [],
          lineStyle: {
            color: "#0ea5e9",
            width: 2,
            opacity: 0.7,
            curveness: 0.15,
          },
          effect: {
            show: true,
            period: 5,
            trailLength: 0.3,
            symbol: "arrow",
            symbolSize: 8,
            color: "#0ea5e9",
          },
          zlevel: 2,
        },
        // 3: Route node numbers (placeholder)
        {
          type: "scatter",
          coordinateSystem: "geo",
          data: [],
          symbolSize: 22,
          itemStyle: {
            color: "#0ea5e9",
            shadowBlur: 6,
            shadowColor: "rgba(14,165,233,0.3)",
          },
          label: {
            show: true,
            formatter: (p: unknown) => {
              const params = p as { data?: { value?: number[] } };
              return `${params.data?.value?.[2] ?? ""}`;
            },
            color: "#fff",
            fontSize: 9,
            fontWeight: "bold" as const,
          },
          zlevel: 3,
        },
        // 4: Selected item highlight
        {
          type: "scatter",
          coordinateSystem: "geo",
          data: selectedCoord ? [{ value: selectedCoord }] : [],
          symbolSize: 20,
          itemStyle: {
            color: "#f59e0b",
            shadowBlur: 8,
            shadowColor: "rgba(245,158,11,0.4)",
          },
          zlevel: 4,
        },
      ],
    };
  }, [scatterData, heatmapData, selectedCoord]);

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
          "series.effectScatter",
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
      // Clear route series data
      chart.setOption({
        series: [
          { /* 0 heatmap — skip */ },
          { /* 1 effectScatter — skip */ },
          { data: [] },   // 2: lines
          { data: [] },   // 3: route nodes
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

    // Merge — does NOT touch geo/zoom/center
    chart.setOption({
      series: [
        { /* 0 heatmap — skip */ },
        { /* 1 effectScatter — skip */ },
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
