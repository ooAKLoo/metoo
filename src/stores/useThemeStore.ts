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
  {
    id: "ocean",
    name: "海洋",
    deep: "#0d1b2a",
    panel: "#1b2838",
    card: "#1a3a4a",
    border: "#00b4d8",
    accentPink: "#00b4d8",
    accentYellow: "#fca311",
    accentCyan: "#90e0ef",
    accentGreen: "#52b788",
  },
  {
    id: "violet",
    name: "紫罗兰",
    deep: "#1a1625",
    panel: "#231c35",
    card: "#2d2548",
    border: "#a855f7",
    accentPink: "#a855f7",
    accentYellow: "#facc15",
    accentCyan: "#c4b5fd",
    accentGreen: "#4ade80",
  },
  {
    id: "emerald",
    name: "翡翠",
    deep: "#0f1a15",
    panel: "#142822",
    card: "#1a3a30",
    border: "#34d399",
    accentPink: "#34d399",
    accentYellow: "#fbbf24",
    accentCyan: "#67e8f9",
    accentGreen: "#6ee7b7",
  },
  {
    id: "amber",
    name: "琥珀",
    deep: "#1a1610",
    panel: "#2a2318",
    card: "#3d3222",
    border: "#f59e0b",
    accentPink: "#f59e0b",
    accentYellow: "#fde68a",
    accentCyan: "#38bdf8",
    accentGreen: "#86efac",
  },
  {
    id: "sakura",
    name: "樱花",
    deep: "#1c1520",
    panel: "#2a1f30",
    card: "#3a2a42",
    border: "#f472b6",
    accentPink: "#f472b6",
    accentYellow: "#fcd34d",
    accentCyan: "#e879f9",
    accentGreen: "#a7f3d0",
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
  themeId: localStorage.getItem("metoo-theme") || "rose",

  setTheme: (id) => {
    const theme = THEMES.find((t) => t.id === id);
    if (!theme) return;
    localStorage.setItem("metoo-theme", id);
    applyTheme(theme);
    set({ themeId: id });
  },

  init: () => {
    const id = localStorage.getItem("metoo-theme") || "rose";
    const theme = THEMES.find((t) => t.id === id) || THEMES[0];
    applyTheme(theme);
    set({ themeId: theme.id });
  },
}));
