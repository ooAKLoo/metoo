import { create } from "zustand";

export interface ThemeDefinition {
  id: string;
  name: string;
  deep: string;
  panel: string;
  card: string;
  border: string;
  accentPink: string;
  accentYellow: string;
  accentCyan: string;
  accentGreen: string;
}

export const THEMES: ThemeDefinition[] = [
  {
    id: "minimal",
    name: "极简",
    deep: "#f8f8f8",
    panel: "#ffffff",
    card: "#f0f0f2",
    border: "#e5e5e5",
    accentPink: "#e94560",
    accentYellow: "#f59e0b",
    accentCyan: "#0ea5e9",
    accentGreen: "#10b981",
  },
  {
    id: "cool",
    name: "清冷",
    deep: "#f5f7fa",
    panel: "#ffffff",
    card: "#eef1f6",
    border: "#dde2ea",
    accentPink: "#6366f1",
    accentYellow: "#f59e0b",
    accentCyan: "#0ea5e9",
    accentGreen: "#10b981",
  },
  {
    id: "warm",
    name: "暖阳",
    deep: "#faf8f5",
    panel: "#ffffff",
    card: "#f5f0ea",
    border: "#e8e0d6",
    accentPink: "#e94560",
    accentYellow: "#d97706",
    accentCyan: "#0284c7",
    accentGreen: "#059669",
  },
  {
    id: "rose",
    name: "玫瑰",
    deep: "#1a1a2e",
    panel: "#16213e",
    card: "#0f3460",
    border: "#e94560",
    accentPink: "#e94560",
    accentYellow: "#ffd700",
    accentCyan: "#00d2ff",
    accentGreen: "#00e676",
  },
];

function applyTheme(theme: ThemeDefinition) {
  const root = document.documentElement;
  root.style.setProperty("--bg-deep", theme.deep);
  root.style.setProperty("--bg-panel", theme.panel);
  root.style.setProperty("--bg-card", theme.card);
  root.style.setProperty("--border-color", theme.border);
  root.style.setProperty("--accent-pink", theme.accentPink);
  root.style.setProperty("--accent-yellow", theme.accentYellow);
  root.style.setProperty("--accent-cyan", theme.accentCyan);
  root.style.setProperty("--accent-green", theme.accentGreen);
}

interface ThemeState {
  themeId: string;
  setTheme: (id: string) => void;
  init: () => void;
}

export const useThemeStore = create<ThemeState>((set) => ({
  themeId: localStorage.getItem("metoo-theme") || "minimal",

  setTheme: (id) => {
    const theme = THEMES.find((t) => t.id === id);
    if (!theme) return;
    localStorage.setItem("metoo-theme", id);
    applyTheme(theme);
    set({ themeId: id });
  },

  init: () => {
    const id = localStorage.getItem("metoo-theme") || "minimal";
    const theme = THEMES.find((t) => t.id === id) || THEMES[0];
    applyTheme(theme);
    set({ themeId: theme.id });
  },
}));
