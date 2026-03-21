import { useCallback, useEffect, useRef, useState } from "react";
import { convertFileSrc } from "@tauri-apps/api/core";
import type { CityEntry } from "../hooks/useCityAggregation";
import countryRegistry from "../assets/countries/_registry.json";

/* ── Shared types ── */

export interface AvatarPos {
  city: CityEntry;
  x: number;
  y: number;
  size: number;
  visible: boolean;
}

export interface ProvinceData {
  name: string;
  paths: string[];
  center: [number, number];
}

export interface GeoSvgData {
  provinces: ProvinceData[];
  viewBox: string;
  svgW: number;
  svgH: number;
  /** Convert geographic coordinates (lng, lat) → SVG coordinates */
  geoToSvg: (lng: number, lat: number) => [number, number];
  /** Convert SVG coordinates → geographic coordinates (lng, lat) — inverse Mercator */
  svgToGeo: (svgX: number, svgY: number) => [number, number];
}

/* ── Utilities ── */

export function coverSrc(cover: string) {
  if (!cover) return "";
  if (cover.startsWith("//")) return `https:${cover}`;
  if (cover.startsWith("/")) return convertFileSrc(cover);
  return cover;
}

export function lerpColor(a: string, b: string, t: number): string {
  const parse = (hex: string) => {
    const v = parseInt(hex.slice(1), 16);
    return [(v >> 16) & 0xff, (v >> 8) & 0xff, v & 0xff];
  };
  const [r1, g1, b1] = parse(a);
  const [r2, g2, b2] = parse(b);
  return `rgb(${Math.round(r1 + (r2 - r1) * t)},${Math.round(g1 + (g2 - g1) * t)},${Math.round(b1 + (b2 - b1) * t)})`;
}

export const AVATAR_MIN = 22;
export const AVATAR_MAX = 42;

/* ── Mercator projection ── */

export const projectLonLat = (lon: number, lat: number): [number, number] => {
  const rad = Math.PI / 180;
  return [lon * rad, Math.log(Math.tan(Math.PI / 4 + (lat * rad) / 2))];
};

/* ── Build SVG geometry from GeoJSON ── */

export function buildGeoSvg(geoJson: { features: any[] }, svgW = 1000): GeoSvgData {
  const features = geoJson.features || [];
  let mnX = Infinity, mnY = Infinity, mxX = -Infinity, mxY = -Infinity;

  type Ring = [number, number][];
  const parsed: { name: string; polys: Ring[][] }[] = [];

  for (const f of features) {
    const name = f.properties?.name || "Unknown";
    const g = f.geometry;
    if (!g) continue;
    const polys: Ring[][] = [];
    const proc = (rings: number[][][]) => {
      const pr: Ring[] = [];
      for (const ring of rings) {
        const pts: Ring = [];
        for (const pt of ring) {
          const [x, y] = projectLonLat(pt[0], pt[1]);
          if (x < mnX) mnX = x;
          if (x > mxX) mxX = x;
          if (y < mnY) mnY = y;
          if (y > mxY) mxY = y;
          pts.push([x, y]);
        }
        pr.push(pts);
      }
      polys.push(pr);
    };
    if (g.type === "Polygon") proc(g.coordinates);
    else if (g.type === "MultiPolygon") for (const p of g.coordinates) proc(p);
    parsed.push({ name, polys });
  }

  if (!isFinite(mnX)) {
    return { provinces: [], viewBox: "0 0 100 100", svgW: 100, svgH: 100, geoToSvg: () => [0, 0], svgToGeo: () => [0, 0] };
  }

  const w = mxX - mnX, h = mxY - mnY;
  const pad = Math.max(w, h) * 0.03;
  const sc = svgW / (w + pad * 2);
  const svgH = (h + pad * 2) * sc;

  const toSvg = (mx: number, my: number): [number, number] => [
    (mx - mnX + pad) * sc,
    (mxY - my + pad) * sc,
  ];

  const geoToSvg = (lng: number, lat: number): [number, number] => {
    const [mx, my] = projectLonLat(lng, lat);
    return toSvg(mx, my);
  };

  /** Inverse: SVG → Mercator → geographic */
  const svgToGeo = (sx: number, sy: number): [number, number] => {
    const mx = sx / sc + mnX - pad;
    const my = mxY + pad - sy / sc;
    const lng = (mx * 180) / Math.PI;
    const lat = ((2 * Math.atan(Math.exp(my)) - Math.PI / 2) * 180) / Math.PI;
    return [lng, lat];
  };

  const provinces: ProvinceData[] = parsed.map((f) => {
    const paths: string[] = [];
    let cx = 0, cy = 0, n = 0;
    for (const rings of f.polys) {
      let d = "";
      for (let ri = 0; ri < rings.length; ri++) {
        for (let i = 0; i < rings[ri].length; i++) {
          const [sx, sy] = toSvg(rings[ri][i][0], rings[ri][i][1]);
          if (ri === 0) { cx += sx; cy += sy; n++; }
          d += (i === 0 ? "M" : "L") + sx.toFixed(1) + "," + sy.toFixed(1);
        }
        d += "Z";
      }
      paths.push(d);
    }
    return {
      name: f.name,
      paths,
      center: (n > 0 ? [cx / n, cy / n] : [0, 0]) as [number, number],
    };
  });

  return { provinces, viewBox: `0 0 ${svgW} ${svgH.toFixed(0)}`, svgW, svgH, geoToSvg, svgToGeo };
}

/* ── GeoJSON loading ── */

/* (China is loaded via ensureCountryGeo("China") — no separate function needed) */

type GeoFeature = {
  geometry: { type: string; coordinates: unknown };
  properties?: { name?: string };
};
let _worldGeo: any = null;
let _worldFeatures: GeoFeature[] | null = null;

export async function ensureWorldGeo(): Promise<GeoFeature[]> {
  if (_worldFeatures) return _worldFeatures;
  const mod = await import("../assets/world.json");
  _worldGeo = mod.default ?? mod;
  _worldFeatures = (_worldGeo.features ?? []) as GeoFeature[];
  return _worldFeatures;
}

export async function ensureWorldGeoJson() {
  if (_worldGeo) return _worldGeo;
  await ensureWorldGeo();
  return _worldGeo;
}

const _registry = countryRegistry as Record<
  string,
  { file: string; provinces: number; size_kb: number }
>;
const _countryCache: Record<string, any> = {};

export async function ensureCountryGeo(countryName: string) {
  if (_countryCache[countryName]) return _countryCache[countryName];

  // China uses its own detailed GeoJSON (includes Taiwan, 南海诸岛)
  if (countryName === "China") {
    const mod = await import("../assets/china.json");
    _countryCache.China = mod.default ?? mod;
    return _countryCache.China;
  }

  const entry = _registry[countryName];
  if (!entry) return null;
  try {
    const mod = await import(`../assets/countries/${entry.file}.json`);
    _countryCache[countryName] = mod.default ?? mod;
    return _countryCache[countryName];
  } catch {
    return null;
  }
}

export function hasCountryGeo(name: string): boolean {
  return name === "China" || name in _registry;
}

export const PROV_FULL: Record<string, string> = {
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

/* ── SVG Pan / Zoom hook ── */

interface VB {
  x: number;
  y: number;
  w: number;
  h: number;
}

export function useSvgRoam(
  svgEl: SVGSVGElement | null,
  baseW: number,
  baseH: number,
  opts?: {
    minZoom?: number;
    maxZoom?: number;
    /** Optional initial view override: { cx, cy } as fractions of base dims, zoom level */
    initialView?: { cx: number; cy: number; zoom: number };
  },
) {
  const { minZoom = 0.8, maxZoom = 10, initialView } = opts ?? {};

  const [vb, _setVb] = useState<VB>({
    x: 0,
    y: 0,
    w: baseW || 100,
    h: baseH || 100,
  });
  const vbRef = useRef(vb);
  const setVb = useCallback(
    (next: VB) => {
      vbRef.current = next;
      _setVb(next);
    },
    [],
  );

  const dragging = useRef(false);
  const lastPt = useRef<[number, number]>([0, 0]);
  const animRafRef = useRef(0);
  const isAnimating = useRef(false);

  // Reset when base dims change (e.g. GeoJSON loads)
  useEffect(() => {
    if (baseW > 0 && baseH > 0) {
      if (initialView) {
        const nw = baseW / initialView.zoom;
        const nh = baseH / initialView.zoom;
        setVb({
          x: initialView.cx * baseW - nw / 2,
          y: initialView.cy * baseH - nh / 2,
          w: nw,
          h: nh,
        });
      } else {
        setVb({ x: 0, y: 0, w: baseW, h: baseH });
      }
    }
  }, [baseW, baseH, setVb]);

  const zoom = baseW > 0 ? baseW / vb.w : 1;

  const onPointerDown = useCallback((e: React.PointerEvent) => {
    if (e.button !== 0 || isAnimating.current) return;
    dragging.current = true;
    lastPt.current = [e.clientX, e.clientY];
    (e.target as Element).setPointerCapture?.(e.pointerId);
  }, []);

  const onPointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (!dragging.current || !svgEl) return;
      const rect = svgEl.getBoundingClientRect();
      const v = vbRef.current;
      const dx = ((e.clientX - lastPt.current[0]) / rect.width) * v.w;
      const dy = ((e.clientY - lastPt.current[1]) / rect.height) * v.h;
      lastPt.current = [e.clientX, e.clientY];
      setVb({ ...v, x: v.x - dx, y: v.y - dy });
    },
    [svgEl, setVb],
  );

  const onPointerUp = useCallback(() => {
    dragging.current = false;
  }, []);

  // Wheel zoom (non-passive for preventDefault)
  useEffect(() => {
    if (!svgEl) return;
    const handler = (e: WheelEvent) => {
      e.preventDefault();
      if (isAnimating.current) return;
      const rect = svgEl.getBoundingClientRect();
      const v = vbRef.current;
      const mx = v.x + ((e.clientX - rect.left) / rect.width) * v.w;
      const my = v.y + ((e.clientY - rect.top) / rect.height) * v.h;
      const f = e.deltaY > 0 ? 1.12 : 1 / 1.12;
      const nw = v.w * f;
      const nz = baseW / nw;
      if (nz < minZoom || nz > maxZoom) return;
      const nh = v.h * f;
      setVb({
        x: mx - (mx - v.x) * f,
        y: my - (my - v.y) * f,
        w: nw,
        h: nh,
      });
    };
    svgEl.addEventListener("wheel", handler, { passive: false });
    return () => svgEl.removeEventListener("wheel", handler);
  }, [svgEl, baseW, minZoom, maxZoom, setVb]);

  const viewBox = `${vb.x.toFixed(1)} ${vb.y.toFixed(1)} ${vb.w.toFixed(1)} ${vb.h.toFixed(1)}`;

  /** Convert SVG coordinates → screen pixel coordinates (matches xMidYMid meet) */
  const svgToScreen = useCallback(
    (sx: number, sy: number): [number, number] => {
      if (!svgEl) return [0, 0];
      const rect = svgEl.getBoundingClientRect();
      const v = vbRef.current;
      const scX = rect.width / v.w;
      const scY = rect.height / v.h;
      const sc = Math.min(scX, scY);
      const offX = (rect.width - v.w * sc) / 2;
      const offY = (rect.height - v.h * sc) / 2;
      return [
        (sx - v.x) * sc + offX,
        (sy - v.y) * sc + offY,
      ];
    },
    [svgEl],
  );

  const resetView = useCallback(() => {
    setVb({ x: 0, y: 0, w: baseW, h: baseH });
  }, [baseW, baseH, setVb]);

  const centerOn = useCallback(
    (sx: number, sy: number, z: number) => {
      const nw = baseW / z;
      const nh = baseH / z;
      setVb({ x: sx - nw / 2, y: sy - nh / 2, w: nw, h: nh });
    },
    [baseW, baseH, setVb],
  );

  /**
   * Smoothly animate viewBox to target over `duration` ms (easeInOutCubic).
   * During animation: updates ref + SVG DOM only (no React re-renders).
   * `onTick` is called each frame for external work (e.g. canvas redraw).
   */
  const animateTo = useCallback(
    (target: VB, duration = 400, onTick?: () => void): Promise<void> => {
      return new Promise((resolve) => {
        cancelAnimationFrame(animRafRef.current);
        isAnimating.current = true;
        const from = { ...vbRef.current };
        const t0 = performance.now();

        const tick = (now: number) => {
          const elapsed = now - t0;
          const t = Math.min(elapsed / duration, 1);
          // easeInOutCubic
          const e =
            t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;

          const next: VB = {
            x: from.x + (target.x - from.x) * e,
            y: from.y + (target.y - from.y) * e,
            w: from.w + (target.w - from.w) * e,
            h: from.h + (target.h - from.h) * e,
          };

          // Update ref only — no React state update per frame
          vbRef.current = next;
          // Update SVG viewBox via direct DOM manipulation
          svgEl?.setAttribute(
            "viewBox",
            `${next.x.toFixed(1)} ${next.y.toFixed(1)} ${next.w.toFixed(1)} ${next.h.toFixed(1)}`,
          );
          onTick?.();

          if (t < 1) {
            animRafRef.current = requestAnimationFrame(tick);
          } else {
            isAnimating.current = false;
            // Single React state sync at the end
            setVb(next);
            resolve();
          }
        };

        animRafRef.current = requestAnimationFrame(tick);
      });
    },
    [setVb, svgEl],
  );

  // Cleanup fly-to animation on unmount
  useEffect(() => () => cancelAnimationFrame(animRafRef.current), []);

  return {
    viewBox,
    vb,
    vbRef,
    zoom,
    onPointerDown,
    onPointerMove,
    onPointerUp,
    svgToScreen,
    resetView,
    centerOn,
    animateTo,
    isDragging: dragging,
    isAnimating,
  };
}
