import { create } from "zustand";

interface MapState {
  selectedItemId: number | null;
  hoveredProvince: string | null;
  setSelectedItem: (id: number | null) => void;
  setHoveredProvince: (name: string | null) => void;
}

export const useMapStore = create<MapState>((set) => ({
  selectedItemId: null,
  hoveredProvince: null,
  setSelectedItem: (id) => set({ selectedItemId: id }),
  setHoveredProvince: (name) => set({ hoveredProvince: name }),
}));
