import { useEffect, useMemo, useRef, useCallback, useState } from "react";
import * as echarts from "echarts/core";
import {
  GeoComponent,
  TooltipComponent,
  VisualMapComponent,
} from "echarts/components";
import {
  EffectScatterChart,
  LinesChart,
  ScatterChart,
} from "echarts/charts";
import { CanvasRenderer } from "echarts/renderers";
import { useFavoriteStore } from "../stores/useFavoriteStore";
import { useMapStore } from "../stores/useMapStore";

echarts.use([
  GeoComponent,
  TooltipComponent,
  VisualMapComponent,
  EffectScatterChart,
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
  const setHoveredProvince = useMapStore((s) => s.setHoveredProvince);

  // Aggregate locations
  const { scatterData, lineData } = useMemo(() => {
    const cityAgg = new Map<
      string,
      { coord: [number, number]; count: number; titles: string[] }
    >();
    const orderedCoords: { coord: [number, number]; title: string }[] = [];

    for (const item of items) {
      for (const loc of item.locations) {
        const key = loc.name;
        const existing = cityAgg.get(key);
        if (existing) {
          existing.count++;
          if (existing.titles.length < 5) existing.titles.push(item.title);
        } else {
          cityAgg.set(key, {
            coord: [loc.lng, loc.lat],
            count: 1,
            titles: [item.title],
          });
        }
      }
      if (item.locations.length > 0) {
        const first = item.locations[0];
        orderedCoords.push({
          coord: [first.lng, first.lat],
          title: item.title,
        });
      }
    }

    const scatter = Array.from(cityAgg.entries()).map(([name, data]) => ({
      name,
      value: [...data.coord, data.count] as [number, number, number],
      titles: data.titles,
    }));

    const lines: { coords: [number, number][] }[] = [];
    for (let i = 0; i < orderedCoords.length - 1; i++) {
      const from = orderedCoords[i].coord;
      const to = orderedCoords[i + 1].coord;
      if (from[0] !== to[0] || from[1] !== to[1]) {
        lines.push({ coords: [from, to] });
      }
    }

    return { scatterData: scatter, lineData: lines };
  }, [items]);

  const selectedCoord = useMemo(() => {
    if (!selectedItemId) return null;
    const item = items.find((i) => i.id === selectedItemId);
    if (!item || item.locations.length === 0) return null;
    return [item.locations[0].lng, item.locations[0].lat] as [number, number];
  }, [selectedItemId, items]);

  const buildOption = useCallback((): echarts.EChartsCoreOption => {
    return {
      geo: {
        map: "china",
        roam: true,
        zoom: 1.2,
        center: [104, 35],
        itemStyle: {
          areaColor: "#16213e",
          borderColor: "#e94560",
          borderWidth: 1,
        },
        emphasis: {
          itemStyle: { areaColor: "#0f3460" },
          label: { show: false },
        },
        select: {
          itemStyle: { areaColor: "#0f3460" },
        },
        label: { show: false },
      },
      tooltip: {
        trigger: "item",
        backgroundColor: "#1a1a2e",
        borderColor: "#e94560",
        borderWidth: 2,
        textStyle: { color: "#f0f0f0", fontSize: 12 },
        formatter: (params: unknown) => {
          const p = params as { name?: string; data?: { titles?: string[] } };
          if (p.data?.titles) {
            const titleList = p.data.titles
              .map((t: string) => `<div style="font-size:11px;color:#a0a0b8">· ${t}</div>`)
              .join("");
            return `<div style="font-weight:bold;color:#ffd700;margin-bottom:4px">${p.name}</div>${titleList}`;
          }
          return p.name || "";
        },
      },
      series: [
        {
          type: "effectScatter",
          coordinateSystem: "geo",
          data: scatterData,
          symbolSize: (val: number[]) => Math.min(8 + val[2] * 3, 28),
          showEffectOn: "render",
          rippleEffect: { brushType: "stroke", scale: 3, period: 4 },
          itemStyle: {
            color: "#e94560",
            shadowBlur: 10,
            shadowColor: "#e94560",
          },
          zlevel: 1,
        },
        {
          type: "lines",
          coordinateSystem: "geo",
          data: lineData,
          lineStyle: {
            color: "#00d2ff",
            width: 1.5,
            opacity: 0.4,
            curveness: 0.2,
            type: "dashed" as const,
          },
          effect: {
            show: true,
            period: 6,
            trailLength: 0.3,
            symbol: "arrow",
            symbolSize: 6,
            color: "#00d2ff",
          },
          zlevel: 2,
        },
        ...(selectedCoord
          ? [
              {
                type: "scatter" as const,
                coordinateSystem: "geo" as const,
                data: [{ value: selectedCoord }],
                symbolSize: 20,
                itemStyle: {
                  color: "#ffd700",
                  shadowBlur: 20,
                  shadowColor: "#ffd700",
                },
                zlevel: 3,
              },
            ]
          : []),
      ],
    };
  }, [scatterData, lineData, selectedCoord]);

  // Init chart (async GeoJSON load)
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

        instanceRef.current.on("mouseover", { seriesIndex: undefined }, (params: unknown) => {
          const p = params as { componentType?: string; name?: string };
          if (p.componentType === "geo") {
            setHoveredProvince(p.name || null);
          }
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
    };
  }, [buildOption, setHoveredProvince]);

  // ResizeObserver — depends on `ready` so it re-runs after async init completes
  useEffect(() => {
    const el = chartRef.current;
    const chart = instanceRef.current;
    if (!el || !chart || !ready) return;

    // Immediately resize to fill container
    chart.resize();

    const ro = new ResizeObserver(() => {
      chart.resize();
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, [ready]);

  // Center on selected
  useEffect(() => {
    if (!instanceRef.current || !selectedCoord) return;
    instanceRef.current.setOption({
      geo: { center: selectedCoord, zoom: 5 },
    });
  }, [selectedCoord]);

  return (
    <div className="flex-1 min-w-0 min-h-0 relative">
      <div ref={chartRef} className="absolute inset-0" />
      {items.length === 0 && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <span className="text-[12px] text-secondary">地图将在抓取后显示</span>
        </div>
      )}
    </div>
  );
}
