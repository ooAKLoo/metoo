import { lazy, type ComponentType } from "react";
import type { FavoriteItem } from "../stores/useFavoriteStore";
import type { CityEntry } from "../hooks/useCityAggregation";

/* ── Poster aspect-ratio presets ── */
export type PosterRatio = "1:1" | "3:4" | "4:3" | "16:9";

export const POSTER_RATIOS: Record<
  PosterRatio,
  { w: number; h: number; label: string }
> = {
  "1:1": { w: 1080, h: 1080, label: "方形" },
  "3:4": { w: 1080, h: 1440, label: "竖版" },
  "4:3": { w: 1440, h: 1080, label: "横版" },
  "16:9": { w: 1920, h: 1080, label: "宽屏" },
};

export const POSTER_RATIO_OPTIONS: PosterRatio[] = ["1:1", "3:4", "4:3", "16:9"];

export interface PosterModuleProps {
  items: FavoriteItem[];
  selectedCity: string | null;
  cityEntries: CityEntry[];
  posterWidth: number;
  posterHeight: number;
}

export interface PosterModule {
  id: string;
  name: string;
  thumbnail: string;
  description: string;
  component: React.LazyExoticComponent<ComponentType<PosterModuleProps>>;
  /** true = 海报自带不透明背景，无需显示底层 map */
  opaqueBackground?: boolean;
  /** true = 使用 Konva Canvas 渲染，导出走 stage.toDataURL() */
  canvasBased?: boolean;
}

export const posterModules: PosterModule[] = [
  {
    id: "muji",
    name: "MUJI 诗意",
    thumbnail: "🏔",
    description: "极简留白，诗意旅行",
    component: lazy(() => import("../components/poster-modules/MujiPoster")),
    opaqueBackground: true,
    canvasBased: true,
  },
  {
    id: "dotmap",
    name: "星图 · 足迹",
    thumbnail: "🗺",
    description: "点阵分布图，可视化你的城市足迹",
    component: lazy(() => import("../components/poster-modules/DotMapPoster")),
    opaqueBackground: true,
    canvasBased: true,
  },
  {
    id: "discover",
    name: "发现 · 远方",
    thumbnail: "🚃",
    description: "地铁路线图风格，展示你的城市足迹",
    component: lazy(() => import("../components/poster-modules/DiscoverWestPoster")),
    opaqueBackground: true,
    canvasBased: true,
  },
  {
    id: "pattern",
    name: "纹样 · 卡片",
    thumbnail: "◐",
    description: "几何纹样卡片，支持极简 / 粗犷风格切换",
    component: lazy(() => import("../components/poster-modules/PatternCardPoster")),
    opaqueBackground: true,
    canvasBased: true,
  },
{
    id: "grid-mosaic",
    name: "城市 · 拼贴",
    thumbnail: "🧩",
    description: "城市首字 + 封面图交错拼贴，数据驱动的网格海报",
    component: lazy(() => import("../components/poster-modules/GridMosaicPoster")),
    opaqueBackground: true,
    canvasBased: true,
  },
  {
    id: "data-postcard",
    name: "足迹 · 数据报告",
    thumbnail: "◧",
    description: "四宫格数据可视化明信片，极简现代风",
    component: lazy(() => import("../components/poster-modules/DataPostcardPoster")),
    opaqueBackground: true,
    canvasBased: true,
  },
  {
    id: "grid-blank",
    name: "方格 · 留白",
    thumbnail: "▦",
    description: "10×15 纯方格模板，极简网格",
    component: lazy(() => import("../components/poster-modules/GridBlankPoster")),
    opaqueBackground: true,
    canvasBased: true,
  },
  {
    id: "pop-board",
    name: "波普 · 棋盘",
    thumbnail: "🎲",
    description: "Neo-Brutalism 棋盘格，波普风旅行地图",
    component: lazy(
      () => import("../components/poster-modules/PopBoardPoster"),
    ),
    opaqueBackground: true,
    canvasBased: true,
  },
  {
    id: "keyboard",
    name: "键盘 · 桌面",
    thumbnail: "⌨",
    description: "波普键盘透视，桌面视角极简明信片",
    component: lazy(() => import("../components/poster-modules/KeyboardPoster")),
    opaqueBackground: true,
    canvasBased: true,
  },
];

export function getPosterModule(id: string): PosterModule | undefined {
  return posterModules.find((m) => m.id === id);
}
