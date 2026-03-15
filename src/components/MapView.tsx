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

    // 3-stop gradient: base → mid → high
    const ramp = isDark
      ? { lo: "#1a2240", mid: "#2d4878", hi: "#5a9ad6" }
      : { lo: "#eeeef2", mid: "#a8c8e8", hi: "#3b82f6" };

    const pal = isDark
      ? {
          area: "#1a2240", border: "#283050", emphasis: "#2a3560",
          dot: "#7c9cbf", selectedDot: "#f59e0b", selectedBorder: "#1a2240",
          tipBg: "#1e2a45", tipBd: "#2d3f5f", tipTxt: "#e2e8f0", tipSub: "#94a3b8",
          shadow: 0.25, lbl: "#94a3b8",
        }
      : {
          area: "#eeeef2", border: "#dddde2", emphasis: "#ddd8e6",
          dot: "#9070a0", selectedDot: "#e94560", selectedBorder: "#ffffff",
          tipBg: "#ffffff", tipBd: "#eeeeee", tipTxt: "#1a1a1a", tipSub: "#999999",
          shadow: 0.06, lbl: "#9ca3af",
        };

    // Build regions with gradient fill
    const safeMax = Math.max(maxProv, 1);
    const regions = [...provCounts.entries()].map(([name, count]) => {
      // Non-linear mapping: sqrt to make low counts more visible
      const t = Math.sqrt(count / safeMax);
      // 2-segment interpolation through mid stop
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
          itemStyle: { areaColor: pal.emphasis, borderColor: pal.border },
          label: {
            show: true,
            formatter: (params: { name: string }) => {
              const c = provCounts.get(params.name);
              return c ? `${params.name} · ${c}` : params.name;
            },
            color: isDark ? "#e2e8f0" : "#4a4a5a",
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
        // 0: City dots
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
            color: new echarts.graphic.LinearGradient(0, 0, 1, 0, [
              { offset: 0, color: "#ff6b6b" },
              { offset: 1, color: "#ee5a24" },
            ]),
            width: 2,
            opacity: 0.7,
            curveness: 0.15,
            type: "dashed" as const,
          },
          effect: {
            show: true,
            period: 5,
            trailLength: 0.25,
            symbol: "circle",
            symbolSize: 4,
            color: "#ff6b6b",
          },
          zlevel: 2,
        },
        // 2: Route node numbers
        {
          type: "scatter",
          coordinateSystem: "geo",
          data: [],
          symbolSize: 20,
          itemStyle: {
            color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
              { offset: 0, color: "#ff6b6b" },
              { offset: 1, color: "#ee5a24" },
            ]),
            borderColor: "#fff",
            borderWidth: 1.5,
            shadowColor: "rgba(238,90,36,0.35)",
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
  }, [scatterData, selectedCoord, themeId, items, provCounts, maxProv]);

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

  const isDark = themeId === "rose";
  const rampLo = isDark ? "#1a2240" : "#eeeef2";
  const rampHi = isDark ? "#5a9ad6" : "#3b82f6";

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

      {/* Gradient legend bar */}
      {maxProv > 0 && (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-[5] pointer-events-none
                        flex items-center gap-2">
          <span className="text-[8px] text-secondary tabular-nums">0</span>
          <div
            className="w-[100px] h-[6px] rounded-full"
            style={{
              background: `linear-gradient(to right, ${rampLo}, ${rampHi})`,
            }}
          />
          <span className="text-[8px] text-secondary tabular-nums">{maxProv}</span>
        </div>
      )}
    </div>
  );
}
