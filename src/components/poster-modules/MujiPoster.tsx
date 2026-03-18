import { useMemo } from "react";
import type { PosterModuleProps } from "../../lib/poster-modules";
import { DEFAULT_CONFIG, type MujiPosterConfig } from "./MujiPosterDevPanel";
import type { FavoriteItem } from "../../stores/useFavoriteStore";
import type { CityEntry } from "../../hooks/useCityAggregation";
import { useMapStore } from "../../stores/useMapStore";

const WIDESCREEN_CONFIG: MujiPosterConfig = {
  mainSize: 10.5,
  mainSpacing: 0,
  mainWeight: 100,
  mainStroke: 0,
  topPos: 5,
  bottomPos: 7,
  subSize: 4,
  subSpacing: 0.44,
  subWeight: 200,
  subStroke: 1.4,
  subOpacity: 0.98,
  subOffsetX: -3,
  subOffsetY: -5,
  subStartX: 88,
  subEndX: 13,
  subBaseY: 55,
  subWaveAmp: 1,
  lightOpacity: 0.8,
};

const LIGHT_SPOTS = [
  { w: "80%", h: "60%", top: "-10%", left: "-20%", blur: 80, op: 0.8 },
  { w: "50%", h: "50%", top: "10%",  left: "40%",  blur: 60, op: 0.6 },
  { w: "60%", h: "70%", top: "50%",  left: "-10%", blur: 90, op: 0.7 },
  { w: "70%", h: "60%", top: "60%",  left: "50%",  blur: 70, op: 0.5 },
  { w: "40%", h: "40%", top: "30%",  left: "70%",  blur: 50, op: 0.4 },
];

const WAVE_DY = [0, 2, 4, 6, 0, 3, 5, 7, 7, 7];

/* ── Food category keywords ── */
const FOOD_CATS: { label: string; kw: string[] }[] = [
  { label: "火锅", kw: ["火锅"] },
  { label: "烧烤", kw: ["烧烤", "撸串", "烤串"] },
  { label: "咖啡", kw: ["咖啡"] },
  { label: "奶茶", kw: ["奶茶", "果茶", "茶饮"] },
  { label: "甜品", kw: ["甜品", "蛋糕", "甜点", "冰淇淋", "面包", "烘焙"] },
  { label: "面食", kw: ["面馆", "米线", "螺蛳粉", "拉面", "米粉", "面条"] },
  { label: "小吃", kw: ["小吃", "夜市", "街头"] },
  { label: "日料", kw: ["日料", "寿司", "刺身", "居酒屋"] },
  { label: "西餐", kw: ["西餐", "牛排", "披萨", "意面", "汉堡"] },
  { label: "海鲜", kw: ["海鲜", "生蚝", "龙虾", "螃蟹"] },
  { label: "早茶", kw: ["早茶", "点心", "茶楼", "粤菜"] },
];

const SIGHT_KW = [
  "古镇", "古城", "老街", "公园", "森林", "博物馆", "美术馆",
  "展览", "打卡", "拍照", "景点", "风景", "旅行", "旅游",
];

function getTopFoodLabels(items: FavoriteItem[]): string[] {
  const counts = FOOD_CATS.map(() => 0);
  for (const item of items) {
    const text = item.title + item.intro;
    for (let i = 0; i < FOOD_CATS.length; i++) {
      if (FOOD_CATS[i].kw.some((k) => text.includes(k))) counts[i]++;
    }
  }
  const labels = FOOD_CATS
    .map((cat, i) => ({ label: cat.label, count: counts[i] }))
    .filter((c) => c.count > 0)
    .sort((a, b) => b.count - a.count)
    .slice(0, 10)
    .map((c) => c.label);
  if (labels.length < 3) {
    const fallbacks = ["美味", "烟火气", "人间味", "好滋味", "觅食"];
    for (const fb of fallbacks) {
      if (labels.length >= 10) break;
      if (!labels.includes(fb)) labels.push(fb);
    }
  }
  return labels;
}

export function getDefaultTemplateIdx(items: FavoriteItem[]): number {
  let foodCount = 0;
  let sightCount = 0;
  for (const item of items) {
    const text = item.title + item.intro;
    if (FOOD_CATS.some((cat) => cat.kw.some((k) => text.includes(k)))) foodCount++;
    if (SIGHT_KW.some((k) => text.includes(k))) sightCount++;
  }
  const total = foodCount + sightCount;
  if (total === 0) return 0;
  if (foodCount / total > 0.6) return 1;
  if (sightCount / total > 0.6) return 3;
  return 5;
}

/* ── Template definitions ── */
interface MujiTemplateData {
  id: string;
  label: string;
  topText: string;
  bottomText: string;
  /** true = sublabels 在同一水平线上，不做波浪起伏 */
  flatSubs?: boolean;
  /** true = sublabels 放在底部而非中间（主文字在上，sublabels 在下） */
  subBottom?: boolean;
  /** 模板专属默认参数，覆盖全局 DEFAULT_CONFIG */
  defaultConfig?: Partial<MujiPosterConfig>;
  getSubLabels: (items: FavoriteItem[], cityEntries: CityEntry[]) => string[];
}

export const MUJI_TEMPLATES: MujiTemplateData[] = [
  {
    id: "poetic",
    label: "诗意",
    topText: "再见，在",
    bottomText: "见。",
    flatSubs: true,
    getSubLabels: () => [
      "無印良品", "生活里", "下一程", "家", "春夏秋冬",
      "相聚时", "独处时", "卧室", "厨房", "山川",
    ],
  },
  {
    id: "eat-again",
    label: "吃·在吃",
    topText: "吃，在吃",
    bottomText: "",
    flatSubs: true,
    subBottom: true,
    defaultConfig: { mainSpacing: 0.16, topPos: 22, subOffsetX: -4, subOffsetY: -20 },
    getSubLabels: (items) => getTopFoodLabels(items),
  },
  {
    id: "eat-at",
    label: "食·在地",
    topText: "吃，在",
    bottomText: "吃",
    flatSubs: true,
    defaultConfig: { mainSize: 10.5, mainSpacing: 0.17, topPos: 7, bottomPos: 19, subOffsetY: 2 },
    getSubLabels: (_, cityEntries) => {
      if (cityEntries.length > 0) return cityEntries.slice(0, 10).map((c) => c.name);
      return ["这里", "那里", "远方", "下一站", "记忆里"];
    },
  },
  {
    id: "travel-again",
    label: "游·在游",
    topText: "游，在游",
    bottomText: "",
    flatSubs: true,
    subBottom: true,
    getSubLabels: (_, cityEntries) => {
      if (cityEntries.length > 0) return cityEntries.slice(0, 10).map((c) => c.name);
      return ["远方", "山川", "湖海", "下一程", "此刻"];
    },
  },
  {
    id: "travel-at",
    label: "游·在地",
    topText: "游，在",
    bottomText: "游",
    flatSubs: true,
    getSubLabels: (_, cityEntries) => {
      if (cityEntries.length > 0) return cityEntries.slice(0, 10).map((c) => c.name);
      return ["这里", "那里", "远方", "山川", "湖海"];
    },
  },
  {
    id: "discover",
    label: "觅·于途",
    topText: "觅",
    bottomText: "于途",
    flatSubs: true,
    getSubLabels: (items, cityEntries) => {
      const foods = getTopFoodLabels(items).slice(0, 5);
      const cities = cityEntries.slice(0, 5).map((c) => c.name);
      const result: string[] = [];
      const max = Math.max(foods.length, cities.length);
      for (let i = 0; i < max && result.length < 10; i++) {
        if (i < cities.length) result.push(cities[i]);
        if (i < foods.length) result.push(foods[i]);
      }
      return result.length >= 3 ? result : ["远方", "美味", "山川", "烟火气"];
    },
  },
];

function MujiPoster({ items, cityEntries, posterWidth, posterHeight }: PosterModuleProps) {
  const mujiConfigs = useMapStore((s) => s.mujiConfigs);
  const rawTemplateIdx = useMapStore((s) => s.mujiTemplateIdx);

  const autoIdx = useMemo(() => getDefaultTemplateIdx(items), [items]);
  const templateIdx = rawTemplateIdx < 0 ? autoIdx : rawTemplateIdx % MUJI_TEMPLATES.length;
  const template = MUJI_TEMPLATES[templateIdx];

  // 回退链: store 自定义 → 模板专属默认 → 全局默认
  const templateDefault = template.defaultConfig
    ? { ...DEFAULT_CONFIG, ...template.defaultConfig }
    : DEFAULT_CONFIG;
  const storeConfig = mujiConfigs[template.id] ?? templateDefault;
  const c = posterWidth / posterHeight >= 1.5 ? WIDESCREEN_CONFIG : storeConfig;

  const subLabels = useMemo(
    () =>
      template.getSubLabels(items, cityEntries).map((text, i) => ({
        text,
        dy: template.flatSubs ? 0 : WAVE_DY[i % WAVE_DY.length],
      })),
    [template, items, cityEntries],
  );

  return (
    <div
      className="absolute inset-0 overflow-hidden pointer-events-none z-10"
      style={{
        containerType: "size",
        fontFamily: '"Noto Sans SC", "Microsoft YaHei", "PingFang SC", sans-serif',
        color: "#2a2825",
      }}
    >
      {/* Light spots */}
      <div className="absolute inset-0 overflow-hidden" style={{ opacity: c.lightOpacity }}>
        {LIGHT_SPOTS.map((s, i) => (
          <div
            key={i}
            className="absolute rounded-full bg-white/80"
            style={{
              width: s.w, height: s.h,
              top: s.top, left: s.left,
              filter: `blur(${s.blur}px)`,
              opacity: s.op,
            }}
          />
        ))}
      </div>

      {/* Text content */}
      <div className="absolute inset-0">
        {/* Top text */}
        <div
          className="absolute"
          style={{
            writingMode: "vertical-rl",
            textOrientation: "mixed",
            fontSize: `${c.mainSize}cqmin`,
            fontWeight: c.mainWeight,
            letterSpacing: `${c.mainSpacing}em`,
            left: "50%",
            transform: "translateX(-50%)",
            top: `${c.topPos}%`,
            WebkitTextStroke: c.mainStroke > 0 ? `${c.mainStroke}px currentColor` : undefined,
            paintOrder: "stroke fill",
          }}
        >
          {template.topText}
        </div>

        {/* Bottom text */}
        {template.bottomText && (
          <div
            className="absolute"
            style={{
              writingMode: "vertical-rl",
              textOrientation: "mixed",
              fontSize: `${c.mainSize}cqmin`,
              fontWeight: c.mainWeight,
              letterSpacing: `${c.mainSpacing}em`,
              left: "50%",
              transform: "translateX(-50%)",
              bottom: `${c.bottomPos}%`,
              WebkitTextStroke: c.mainStroke > 0 ? `${c.mainStroke}px currentColor` : undefined,
              paintOrder: "stroke fill",
            }}
          >
            {template.bottomText}
          </div>
        )}

        {/* Sub-texts — dynamic */}
        {subLabels.map(({ text, dy }, i) => {
          const count = subLabels.length;
          const t = count > 1 ? i / (count - 1) : 0.5;
          const rightPct = c.subStartX - (c.subStartX - c.subEndX) * t + c.subOffsetX;

          // subBottom: 用 bottom 定位，sublabels 在海报底部
          // subBottom: bottom 定位，subOffsetY 取反（正值=下移=bottom 减小）
          const posStyle = template.subBottom
            ? { bottom: `${c.bottomPos - c.subOffsetY + dy * c.subWaveAmp}%` }
            : { top: `${c.subBaseY + dy * c.subWaveAmp + c.subOffsetY}%` };

          return (
            <div
              key={i}
              className="absolute"
              style={{
                writingMode: "vertical-rl",
                textOrientation: "mixed",
                fontSize: `${c.subSize}cqmin`,
                fontWeight: c.subWeight,
                letterSpacing: `${c.subSpacing}em`,
                right: `${rightPct}%`,
                ...posStyle,
                transform: template.subBottom ? "translateY(50%)" : "translateY(-50%)",
                opacity: c.subOpacity,
                WebkitTextStroke: c.subStroke > 0 ? `${c.subStroke}px currentColor` : undefined,
                paintOrder: "stroke fill",
              }}
            >
              {text}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default MujiPoster;
