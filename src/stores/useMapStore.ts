import { create } from "zustand";
import type { PosterRatio } from "../lib/poster-modules";
import type { MujiPosterConfig } from "../components/poster-dev/MujiDevPanel";
import type { DiscoverLayoutConfig } from "../components/poster-dev/DiscoverDevPanel";

type ViewMode = "all" | "city";
export type MapLevel = "world" | `country:${string}`;
export type ChartView = "map" | "grid" | "bubble";

export interface RouteNode {
  name: string;
  coord: [number, number];
}

interface MapState {
  selectedItemId: number | null;
  hoveredProvince: string | null;
  selectedCity: string | null;
  selectedProvince: string | null;
  selectedTag: string | null;
  viewMode: ViewMode;
  routePath: RouteNode[] | null;
  mapLevel: MapLevel;
  chartView: ChartView;
  activePosterModule: string | null;
  posterRatios: Record<string, PosterRatio>;
  mujiConfigs: Record<string, MujiPosterConfig>;
  discoverConfigs: Record<string, Partial<DiscoverLayoutConfig>>;
  keyboardThemeIdx: number;
  patternStyleIdx: number;
  popBoardMode: "cells" | "center";
  popBoardHue: number;
  mujiTemplateIdx: number;
  mujiHue: number;
  mujiTextHidden: boolean;
  mosaicThemeIdx: number;
  mosaicHue: number;
  mosaicStyleIdx: number;
  keyboardStyleIdx: number;
  figureSeed: number;
  gridBlankHue: number;
  posterDebug: boolean;
  gridCountry: string | null;
  gridCity: string | null;
  togglePosterDebug: () => void;
  shuffleFigures: () => void;
  setGridBlankHue: (hue: number) => void;
  setGridCountry: (country: string | null) => void;
  setGridCity: (city: string | null) => void;
  setSelectedItem: (id: number | null) => void;
  setHoveredProvince: (name: string | null) => void;
  setSelectedCity: (city: string) => void;
  setSelectedProvince: (prov: string) => void;
  setSelectedTag: (tag: string | null) => void;
  clearCityFilter: () => void;
  generateRoute: (cities: RouteNode[]) => void;
  clearRoute: () => void;
  setMapLevel: (level: MapLevel) => void;
  setChartView: (view: ChartView) => void;
  setActivePosterModule: (id: string | null) => void;
  setPosterRatio: (moduleId: string, ratio: PosterRatio) => void;
  setMujiConfig: (templateId: string, config: MujiPosterConfig) => void;
  setDiscoverConfig: (key: string, config: Partial<DiscoverLayoutConfig>) => void;
  setKeyboardThemeIdx: (idx: number) => void;
  setPatternStyleIdx: (idx: number) => void;
  setPopBoardMode: (mode: "cells" | "center") => void;
  setPopBoardHue: (hue: number) => void;
  setMujiTemplateIdx: (idx: number) => void;
  setMujiHue: (hue: number) => void;
  toggleMujiTextHidden: () => void;
  setMosaicThemeIdx: (idx: number) => void;
  setMosaicHue: (hue: number) => void;
  setMosaicStyleIdx: (idx: number) => void;
  setKeyboardStyleIdx: (idx: number) => void;
}

/** Haversine distance in km (good enough for greedy NN) */
function haversine(a: [number, number], b: [number, number]) {
  const toRad = (d: number) => (d * Math.PI) / 180;
  const [lng1, lat1] = a;
  const [lng2, lat2] = b;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const x =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return 2 * 6371 * Math.asin(Math.sqrt(x));
}

/** Nearest-neighbour greedy TSP — random start for variety */
function nearestNeighbourRoute(cities: RouteNode[]): RouteNode[] {
  if (cities.length <= 2) return [...cities];

  const remaining = new Set(cities.map((_, i) => i));
  const startIdx = Math.floor(Math.random() * cities.length);
  remaining.delete(startIdx);

  const path: RouteNode[] = [cities[startIdx]];

  while (remaining.size > 0) {
    const last = path[path.length - 1];
    let nearest = -1;
    let minDist = Infinity;
    for (const idx of remaining) {
      const d = haversine(last.coord, cities[idx].coord);
      if (d < minDist) {
        minDist = d;
        nearest = idx;
      }
    }
    remaining.delete(nearest);
    path.push(cities[nearest]);
  }

  return path;
}

export const useMapStore = create<MapState>((set, get) => ({
  selectedItemId: null,
  hoveredProvince: null,
  selectedCity: null,
  selectedProvince: null,
  selectedTag: null,
  viewMode: "all",
  routePath: null,
  mapLevel: "world",
  chartView: "map",
  activePosterModule: null,
  posterRatios: {} as Record<string, PosterRatio>,
  mujiConfigs: {},
  discoverConfigs: {},
  keyboardThemeIdx: 0,
  patternStyleIdx: 0,
  popBoardMode: "cells",
  popBoardHue: 330,
  mujiTemplateIdx: -1,
  mujiHue: 30,
  mujiTextHidden: false,
  mosaicThemeIdx: 0,
  mosaicHue: 250,
  mosaicStyleIdx: 0,
  keyboardStyleIdx: 0,
  figureSeed: 42,
  gridBlankHue: 245,
  posterDebug: false,
  gridCountry: null,
  gridCity: null,
  togglePosterDebug: () => set((s) => ({ posterDebug: !s.posterDebug })),
  shuffleFigures: () => set({ figureSeed: Math.floor(Math.random() * 100000) }),
  setSelectedItem: (id) => set({ selectedItemId: id }),
  setHoveredProvince: (name) => set({ hoveredProvince: name }),
  setSelectedCity: (city) => {
    const current = get().selectedCity;
    if (current === city) {
      set({ selectedCity: null, selectedProvince: null, viewMode: "all" });
    } else {
      set({ selectedCity: city, selectedProvince: null, viewMode: "city" });
    }
  },
  setSelectedProvince: (prov) => {
    const current = get().selectedProvince;
    if (current === prov) {
      set({ selectedProvince: null, selectedCity: null, viewMode: "all" });
    } else {
      set({ selectedProvince: prov, selectedCity: null, viewMode: "city" });
    }
  },
  setSelectedTag: (tag) => {
    const current = get().selectedTag;
    set({ selectedTag: current === tag ? null : tag });
  },
  clearCityFilter: () => set({ selectedCity: null, selectedProvince: null, viewMode: "all" }),
  generateRoute: (cities) => {
    if (cities.length < 2) return;
    const path = nearestNeighbourRoute(cities);
    set({ routePath: path });
  },
  clearRoute: () => set({ routePath: null }),
  setMapLevel: (level) => set({ mapLevel: level }),
  setChartView: (view) => set({ chartView: view, activePosterModule: null }),
  setActivePosterModule: (id) => set({ activePosterModule: id }),
  setPosterRatio: (moduleId, ratio) => set((s) => ({
    posterRatios: { ...s.posterRatios, [moduleId]: ratio },
  })),
  setMujiConfig: (templateId, config) => set((s) => ({
    mujiConfigs: { ...s.mujiConfigs, [templateId]: config },
  })),
  setDiscoverConfig: (key, config) => set((s) => ({
    discoverConfigs: { ...s.discoverConfigs, [key]: config },
  })),
  setKeyboardThemeIdx: (idx) => set({ keyboardThemeIdx: idx }),
  setPatternStyleIdx: (idx) => set({ patternStyleIdx: idx }),
  setPopBoardMode: (mode) => set({ popBoardMode: mode }),
  setPopBoardHue: (hue) => set({ popBoardHue: hue }),
  setMujiTemplateIdx: (idx) => set({ mujiTemplateIdx: idx }),
  setMujiHue: (hue) => set({ mujiHue: hue }),
  toggleMujiTextHidden: () => set((s) => ({ mujiTextHidden: !s.mujiTextHidden })),
  setMosaicThemeIdx: (idx) => set({ mosaicThemeIdx: idx }),
  setMosaicHue: (hue) => set({ mosaicHue: hue }),
  setMosaicStyleIdx: (idx) => set({ mosaicStyleIdx: idx }),
  setKeyboardStyleIdx: (idx) => set({ keyboardStyleIdx: idx }),
  setGridBlankHue: (hue) => set({ gridBlankHue: hue }),
  setGridCountry: (country) => set({ gridCountry: country, gridCity: null }),
  setGridCity: (city) => set({ gridCity: city }),
}));
