/**
 * Color palette for food categories.
 * Used by RainbowChart and BubbleCluster visualizations.
 */
export const CATEGORY_COLORS: Record<string, string> = {
  "火锅": "#E63946",
  "烧烤": "#FF6B4A",
  "川菜": "#D62828",
  "麻辣烫": "#C1121F",
  "串串": "#F77F00",
  "烤鱼": "#FB8500",
  "烤鸭": "#BC6C25",
  "小龙虾": "#E76F51",
  "湘菜": "#FF6B6B",
  "粉面": "#F4A261",
  "西餐": "#9B2226",
  "韩餐": "#4361EE",
  "披萨": "#FCA311",
  "汉堡": "#E9C46A",
  "炸鸡": "#D4A373",
  "饺子": "#FFB4A2",
  "咖啡": "#6F4E37",
  "奶茶": "#C19A6B",
  "面包": "#DDB892",
  "甜品": "#FFB5C2",
  "抹茶": "#90BE6D",
  "早茶": "#8AC926",
  "下午茶": "#CDB4DB",
  "粤菜": "#06D6A0",
  "日料": "#457B9D",
  "海鲜": "#2A9D8F",
  "冰淇淋": "#A8DADC",
  "酒吧": "#7209B7",
  "自助餐": "#3A86FF",
  "探店": "#5E60CE",
};

export function getCategoryColor(category: string): string {
  return CATEGORY_COLORS[category] || "#94a3b8";
}

/** Rainbow arc palette — warm-to-cool progression for stacked arcs */
export const RAINBOW_ARC_COLORS = [
  "#FF6B6B", "#FF8E72", "#FFB347", "#FFD93D",
  "#6BCB77", "#4ECDC4", "#45B7D1", "#6C5CE7",
  "#A29BFE", "#FF6B9D", "#DDA0DD", "#87CEEB",
  "#96CEB4", "#FFEAA7",
];
