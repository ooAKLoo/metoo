import { create } from "zustand";

type ViewMode = "all" | "city";

export interface RouteNode {
  name: string;
  coord: [number, number];
}

interface MapState {
  selectedItemId: number | null;
  hoveredProvince: string | null;
  selectedCity: string | null;
  selectedTag: string | null;
  sidebarOpen: boolean;
  viewMode: ViewMode;
  routePath: RouteNode[] | null;
  setSelectedItem: (id: number | null) => void;
  setHoveredProvince: (name: string | null) => void;
  setSelectedCity: (city: string) => void;
  setSelectedTag: (tag: string | null) => void;
  setSidebarOpen: (open: boolean) => void;
  clearCityFilter: () => void;
  generateRoute: (cities: RouteNode[]) => void;
  clearRoute: () => void;
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
  selectedTag: null,
  sidebarOpen: true,
  viewMode: "all",
  routePath: null,
  setSelectedItem: (id) => set({ selectedItemId: id }),
  setHoveredProvince: (name) => set({ hoveredProvince: name }),
  setSelectedCity: (city) => {
    const current = get().selectedCity;
    if (current === city) {
      set({ selectedCity: null, viewMode: "all" });
    } else {
      set({ selectedCity: city, viewMode: "city" });
    }
  },
  setSelectedTag: (tag) => {
    const current = get().selectedTag;
    set({ selectedTag: current === tag ? null : tag });
  },
  setSidebarOpen: (open) => set({ sidebarOpen: open }),
  clearCityFilter: () => set({ selectedCity: null, viewMode: "all" }),
  generateRoute: (cities) => {
    if (cities.length < 2) return;
    const path = nearestNeighbourRoute(cities);
    set({ routePath: path });
  },
  clearRoute: () => set({ routePath: null }),
}));
