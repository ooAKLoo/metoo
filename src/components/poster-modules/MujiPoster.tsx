import { useMemo } from "react";
import { Text, Group } from "react-konva";
import type { PosterModuleProps } from "../../lib/poster-modules";
import { KonvaPosterStage } from "../../lib/poster-stage";
import { DEFAULT_CONFIG, type MujiPosterConfig } from "./MujiPosterDevPanel";
import type { FavoriteItem } from "../../stores/useFavoriteStore";
import type { CityEntry } from "../../hooks/useCityAggregation";
import { useMapStore } from "../../stores/useMapStore";

/* ── Colour derivation — single hue → text colour + spot tint ── */
import { hslToHex } from "./PopBoardPoster";

export function deriveMujiColors(hue: number): { textColor: string; spotTint: string } {
  return {
    textColor: hslToHex(hue, 30, 18),
    spotTint:  hslToHex(hue, 15, 94),
  };
}

export const MUJI_HUE_PRESETS = [
  { name: "墨色", hue: 30 },
  { name: "靛蓝", hue: 215 },
  { name: "朱红", hue: 0 },
  { name: "松绿", hue: 160 },
  { name: "紫檀", hue: 300 },
  { name: "赭石", hue: 25 },
];

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

const WAVE_DY = [0, 2, 4, 6, 0, 3, 5, 7, 7, 7];

/* ── Food category keywords ── */
// shop: 店铺名 (火锅店/烧烤店…) — used in place-oriented templates (诗意, 觅·于途)
// food: 食品类别名 (火锅/烧烤…) — used in food-oriented templates (吃·在吃)
const FOOD_CATS: { shop: string; food: string; kw: string[] }[] = [
  { shop: "火锅店", food: "火锅", kw: ["火锅"] },
  { shop: "烧烤店", food: "烧烤", kw: ["烧烤", "撸串", "烤串"] },
  { shop: "咖啡馆", food: "咖啡", kw: ["咖啡"] },
  { shop: "奶茶店", food: "奶茶", kw: ["奶茶", "果茶", "茶饮"] },
  { shop: "甜品店", food: "甜品", kw: ["甜品", "蛋糕", "甜点", "冰淇淋", "面包", "烘焙"] },
  { shop: "面馆", food: "面食", kw: ["面馆", "米线", "螺蛳粉", "拉面", "米粉", "面条"] },
  { shop: "小吃摊", food: "小吃", kw: ["小吃", "夜市", "街头"] },
  { shop: "日料店", food: "日料", kw: ["日料", "寿司", "刺身", "居酒屋"] },
  { shop: "西餐厅", food: "西餐", kw: ["西餐", "牛排", "披萨", "意面", "汉堡"] },
  { shop: "海鲜馆", food: "海鲜", kw: ["海鲜", "生蚝", "龙虾", "螃蟹"] },
  { shop: "茶楼", food: "茶点", kw: ["早茶", "点心", "茶楼", "粤菜"] },
];

const SIGHT_KW = [
  "古镇", "古城", "老街", "公园", "森林", "博物馆", "美术馆",
  "展览", "打卡", "拍照", "景点", "风景", "旅行", "旅游",
];

/** @param mode "shop" → 火锅店/烧烤店 (地点); "food" → 火锅/烧烤 (食品类别) */
function getTopFoodLabels(items: FavoriteItem[], mode: "shop" | "food" = "shop"): string[] {
  const counts = FOOD_CATS.map(() => 0);
  for (const item of items) {
    const text = item.title + item.intro;
    for (let i = 0; i < FOOD_CATS.length; i++) {
      if (FOOD_CATS[i].kw.some((k) => text.includes(k))) counts[i]++;
    }
  }
  const labels = FOOD_CATS
    .map((cat, i) => ({ label: cat[mode], count: counts[i] }))
    .filter((c) => c.count > 0)
    .sort((a, b) => b.count - a.count)
    .slice(0, 10)
    .map((c) => c.label);
  if (labels.length < 3) {
    const fallbacks = mode === "food"
      ? ["美味", "烟火气", "人间味", "好滋味", "觅食"]
      : ["美味", "烟火气", "人间味", "好滋味", "觅食"];
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
  flatSubs?: boolean;
  subBottom?: boolean;
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
    getSubLabels: (items, cityEntries) => {
      const foods = getTopFoodLabels(items).slice(0, 5);
      const cities = cityEntries.slice(0, 5).map((c) => c.name);
      const mixed: string[] = [];
      const max = Math.max(foods.length, cities.length);
      for (let i = 0; i < max && mixed.length < 10; i++) {
        if (i < cities.length) mixed.push(cities[i]);
        if (i < foods.length) mixed.push(foods[i]);
      }
      if (mixed.length < 3) {
        const fb = ["远方", "美味", "山川", "烟火气", "人间味", "下一程", "归途", "此刻", "记忆里", "旅途"];
        for (const f of fb) { if (mixed.length >= 10) break; if (!mixed.includes(f)) mixed.push(f); }
      }
      return mixed;
    },
  },
  {
    id: "eat-again",
    label: "吃·在吃",
    topText: "吃，在吃",
    bottomText: "",
    flatSubs: true,
    subBottom: true,
    defaultConfig: { mainSpacing: 0.16, topPos: 22, subOffsetX: -4, subOffsetY: -20 },
    getSubLabels: (items) => getTopFoodLabels(items, "food"),
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

/* ── Font families ── */
const FONT_CN = "'Noto Sans SC', 'PingFang SC', 'Microsoft YaHei', system-ui, sans-serif";

/* ── CJK punctuation that needs repositioning in vertical text ── */
const CJK_PUNCT = new Set("，。、！？：；）」』】");

/* ── Vertical text helper (each character as a separate Konva Text node) ── */
function VerticalText({
  text,
  x,
  y,
  fontSize,
  fontWeight,
  fill,
  letterSpacing = 0,
  stroke,
  strokeWidth,
  opacity,
}: {
  text: string;
  x: number;
  y: number;
  fontSize: number;
  fontWeight: string;
  fill: string;
  letterSpacing?: number;
  stroke?: string;
  strokeWidth?: number;
  opacity?: number;
}) {
  // CJK vertical stacking: 1em per character (no line-height multiplier)
  const charH = fontSize + letterSpacing;
  return (
    <Group x={x} y={y} opacity={opacity}>
      {[...text].map((ch, i) => {
        const isPunct = CJK_PUNCT.has(ch);
        return isPunct ? (
          // Punctuation: no centering logic, raw position at right side of column
          <Text
            key={i}
            x={fontSize * 0.55}
            y={i * charH - fontSize * 0.35}
            text={ch}
            fontSize={fontSize}
            fontStyle={fontWeight}
            fill={fill}
            fontFamily={FONT_CN}
            stroke={stroke}
            strokeWidth={strokeWidth}
          />
        ) : (
          // Regular CJK character: centered in column
          <Text
            key={i}
            y={i * charH}
            text={ch}
            fontSize={fontSize}
            fontStyle={fontWeight}
            fill={fill}
            width={fontSize * 1.5}
            offsetX={fontSize * 0.25}
            align="center"
            fontFamily={FONT_CN}
            stroke={stroke}
            strokeWidth={strokeWidth}
          />
        );
      })}
    </Group>
  );
}

/** Compute the total pixel height of a vertical text run. */
function verticalTextHeight(text: string, fontSize: number, letterSpacing: number): number {
  const charH = fontSize + letterSpacing;
  return text.length * charH;
}

/* ── Component ── */

function MujiPoster({ items, cityEntries, posterWidth, posterHeight }: PosterModuleProps) {
  const W = posterWidth;
  const H = posterHeight;
  const cqmin = Math.min(W, H);

  const mujiConfigs = useMapStore((s) => s.mujiConfigs);
  const rawTemplateIdx = useMapStore((s) => s.mujiTemplateIdx);
  const mujiHue = useMapStore((s) => s.mujiHue);
  const colorPreset = useMemo(() => deriveMujiColors(mujiHue), [mujiHue]);

  const autoIdx = useMemo(() => getDefaultTemplateIdx(items), [items]);
  const templateIdx = rawTemplateIdx < 0 ? autoIdx : rawTemplateIdx % MUJI_TEMPLATES.length;
  const template = MUJI_TEMPLATES[templateIdx];

  // Fallback chain: store custom -> template-specific default -> global default
  const templateDefault = template.defaultConfig
    ? { ...DEFAULT_CONFIG, ...template.defaultConfig }
    : DEFAULT_CONFIG;
  const storeConfig = mujiConfigs[template.id] ?? templateDefault;
  const c = W / H >= 1.5 ? WIDESCREEN_CONFIG : storeConfig;

  const subLabels = useMemo(
    () =>
      template.getSubLabels(items, cityEntries).map((text, i) => ({
        text,
        dy: template.flatSubs ? 0 : WAVE_DY[i % WAVE_DY.length],
      })),
    [template, items, cityEntries],
  );

  /* ── Convert cqmin-based config values to absolute pixels ── */
  const mainFontSize = c.mainSize * cqmin / 100;
  const mainLetterSpacing = c.mainSpacing * mainFontSize; // em -> px
  const mainStrokeWidth = c.mainStroke > 0 ? c.mainStroke : undefined;
  const mainStroke = mainStrokeWidth ? colorPreset.textColor : undefined;
  // Konva fontStyle = "normal {weight}" — explicit "normal" prefix ensures
  // WebKit Canvas parses the font-weight correctly (bare "100" can fail)
  const mainFontWeight = `normal ${c.mainWeight}`;

  const subFontSize = c.subSize * cqmin / 100;
  const subLetterSpacing = c.subSpacing * subFontSize; // em -> px
  const subStrokeWidth = c.subStroke > 0 ? c.subStroke : undefined;
  const subStroke = subStrokeWidth ? colorPreset.textColor : undefined;
  const subFontWeight = `normal ${c.subWeight}`;

  /* ── Top text position: centered horizontally, top-aligned ── */
  // CSS: left: 50%, transform: translateX(-50%), top: topPos%
  // In Konva: x = W/2 - fontSize/2 (center the single-column vertical text)
  const topTextX = W / 2 - mainFontSize / 2;
  const topTextY = H * c.topPos / 100;

  /* ── Bottom text position: centered horizontally, bottom-aligned ── */
  // CSS: left: 50%, transform: translateX(-50%), bottom: bottomPos%
  // bottom: X% means the bottom edge of the element is at (100-X)% from top
  // So: elementTop = H - H*bottomPos/100 - elementHeight
  const bottomTextHeight = template.bottomText
    ? verticalTextHeight(template.bottomText, mainFontSize, mainLetterSpacing)
    : 0;
  const bottomTextX = W / 2 - mainFontSize / 2;
  const bottomTextY = template.bottomText
    ? H - H * c.bottomPos / 100 - bottomTextHeight
    : 0;

  /* ── Sub-text positions ── */
  // CSS used: right: rightPct%, vertical-rl
  // For subBottom: bottom positioning with translateY(50%)
  // For normal: top positioning with translateY(-50%)
  const subPositions = useMemo(() => {
    const count = subLabels.length;
    return subLabels.map(({ text, dy }, i) => {
      const t = count > 1 ? i / (count - 1) : 0.5;
      const rightPct = c.subStartX - (c.subStartX - c.subEndX) * t + c.subOffsetX;

      // right: rightPct% → x = W - W * rightPct / 100 - textWidth
      // textWidth for vertical text is ~fontSize
      const x = W - W * rightPct / 100 - subFontSize;

      const textH = verticalTextHeight(text, subFontSize, subLetterSpacing);

      let y: number;
      if (template.subBottom) {
        // CSS: bottom: bottomPos - subOffsetY + dy*waveAmp %, transform: translateY(50%)
        // bottom: X% → element's bottom edge is at H * (100 - X) / 100
        // translateY(50%) shifts down by half the element height
        const bottomPct = c.bottomPos - c.subOffsetY + dy * c.subWaveAmp;
        const bottomEdgeFromTop = H - H * bottomPct / 100;
        // translateY(50%) in CSS means element center is at the anchor point
        y = bottomEdgeFromTop - textH / 2;
      } else {
        // CSS: top: subBaseY + dy*waveAmp + subOffsetY %, transform: translateY(-50%)
        const topPct = c.subBaseY + dy * c.subWaveAmp + c.subOffsetY;
        const topFromTop = H * topPct / 100;
        // translateY(-50%) centers the element vertically at the anchor
        y = topFromTop - textH / 2;
      }

      return { text, x, y };
    });
  }, [subLabels, W, H, c, subFontSize, subLetterSpacing, template.subBottom]);

  return (
    <KonvaPosterStage width={W} height={H} transparent>
      {/* Transparent overlay — no background, renders above MapView */}

      {/* Top text (vertical) */}
      <VerticalText
        text={template.topText}
        x={topTextX}
        y={topTextY}
        fontSize={mainFontSize}
        fontWeight={mainFontWeight}
        fill={colorPreset.textColor}
        letterSpacing={mainLetterSpacing}
        stroke={mainStroke}
        strokeWidth={mainStrokeWidth}
      />

      {/* Bottom text (vertical) */}
      {template.bottomText && (
        <VerticalText
          text={template.bottomText}
          x={bottomTextX}
          y={bottomTextY}
          fontSize={mainFontSize}
          fontWeight={mainFontWeight}
          fill={colorPreset.textColor}
          letterSpacing={mainLetterSpacing}
          stroke={mainStroke}
          strokeWidth={mainStrokeWidth}
        />
      )}

      {/* Sub-texts (vertical, scattered) */}
      {subPositions.map(({ text, x, y }, i) => (
        <VerticalText
          key={i}
          text={text}
          x={x}
          y={y}
          fontSize={subFontSize}
          fontWeight={subFontWeight}
          fill={colorPreset.textColor}
          letterSpacing={subLetterSpacing}
          stroke={subStroke}
          strokeWidth={subStrokeWidth}
          opacity={c.subOpacity}
        />
      ))}
    </KonvaPosterStage>
  );
}

export default MujiPoster;
