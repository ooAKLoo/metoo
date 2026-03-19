/**
 * Region outline utility — city name → GeoJSON outline rings
 *
 * Supports Chinese cities (province outline) and international cities (country outline).
 * Returns Mercator-projected point rings scaled to fit a given (w, h) bounding box.
 */

import { projectLonLat, PROV_FULL } from "../components/map-shared";
import { findCity, PROVINCES } from "./china-divisions";
import { findWorldCity, COUNTRIES } from "./world-cities";
import chinaGeo from "../assets/china.json";
import worldGeo from "../assets/world.json";

/* ── Chinese country name → world.json English name ── */

const COUNTRY_CN_EN: Record<string, string> = {
  日本: "Japan", 韩国: "Korea", 朝鲜: "Dem. Rep. Korea", 蒙古: "Mongolia",
  泰国: "Thailand", 越南: "Vietnam", 新加坡: "Singapore", 马来西亚: "Malaysia",
  印度尼西亚: "Indonesia", 印尼: "Indonesia", 菲律宾: "Philippines",
  缅甸: "Myanmar", 柬埔寨: "Cambodia", 老挝: "Lao PDR", 文莱: "Brunei",
  印度: "India", 斯里兰卡: "Sri Lanka", 尼泊尔: "Nepal",
  巴基斯坦: "Pakistan", 孟加拉国: "Bangladesh", 马尔代夫: "Maldives",
  土耳其: "Turkey", 阿联酋: "United Arab Emirates", 以色列: "Israel",
  沙特阿拉伯: "Saudi Arabia", 卡塔尔: "Qatar", 伊朗: "Iran", 约旦: "Jordan",
  英国: "United Kingdom", 法国: "France", 德国: "Germany",
  意大利: "Italy", 西班牙: "Spain", 葡萄牙: "Portugal", 荷兰: "Netherlands",
  比利时: "Belgium", 瑞士: "Switzerland", 奥地利: "Austria",
  瑞典: "Sweden", 挪威: "Norway", 丹麦: "Denmark", 芬兰: "Finland",
  冰岛: "Iceland", 希腊: "Greece", 捷克: "Czech Rep.", 匈牙利: "Hungary",
  波兰: "Poland", 爱尔兰: "Ireland", 克罗地亚: "Croatia", 俄罗斯: "Russia",
  美国: "United States", 加拿大: "Canada", 墨西哥: "Mexico",
  巴西: "Brazil", 阿根廷: "Argentina", 智利: "Chile", 秘鲁: "Peru",
  哥伦比亚: "Colombia", 古巴: "Cuba",
  澳大利亚: "Australia", 新西兰: "New Zealand", 斐济: "Fiji",
  南非: "South Africa", 肯尼亚: "Kenya", 埃及: "Egypt", 摩洛哥: "Morocco",
  坦桑尼亚: "Tanzania", 马达加斯加: "Madagascar", 纳米比亚: "Namibia",
  埃塞俄比亚: "Ethiopia", 加纳: "Ghana", 尼日利亚: "Nigeria",
};

/* ── GeoJSON geometry → Mercator-projected rings scaled to (w, h) ── */

export function geoToRings(
  geometry: { type: string; coordinates: any },
  w: number, h: number, pad = 2,
): number[][] [] {
  let polys: number[][][] = [];
  if (geometry.type === "Polygon") polys = [geometry.coordinates[0]];
  else if (geometry.type === "MultiPolygon")
    polys = (geometry.coordinates as number[][][][]).map((p) => p[0]);
  if (!polys.length) return [];

  const projected = polys.map((ring) =>
    ring.map((pt) => projectLonLat(pt[0], pt[1])),
  );

  let mnX = Infinity, mnY = Infinity, mxX = -Infinity, mxY = -Infinity;
  for (const ring of projected)
    for (const [x, y] of ring) {
      if (x < mnX) mnX = x; if (y < mnY) mnY = y;
      if (x > mxX) mxX = x; if (y > mxY) mxY = y;
    }

  const gW = mxX - mnX || 1, gH = mxY - mnY || 1;
  const aW = w - pad * 2, aH = h - pad * 2;
  const sc = Math.min(aW / gW, aH / gH);
  const ox = pad + (aW - gW * sc) / 2;
  const oy = pad + (aH - gH * sc) / 2;

  return projected.map((ring) =>
    ring.map(([x, y]) => [
      (x - mnX) * sc + ox,
      (mxY - y) * sc + oy,
    ]),
  );
}

/* ── Internal: find GeoJSON feature by province full name ── */

function findChinaFeature(provFullName: string) {
  return (chinaGeo as any).features.find(
    (f: any) => f.properties?.name === provFullName,
  ) ?? null;
}

function findWorldFeature(enName: string) {
  return (worldGeo as any).features.find(
    (f: any) => f.properties?.name === enName,
  ) ?? null;
}

/* ── Public API: city name → outline rings ── */

/**
 * Given a city/province/country name, return Mercator-projected outline rings
 * scaled to fit within (w, h). Returns null if no geometry found.
 *
 * Lookup order:
 * 1. Chinese city → province outline
 * 2. Chinese province name → province outline directly
 * 3. World city → country outline
 * 4. Country name → country outline directly
 */
export function getRegionOutline(
  name: string, w: number, h: number,
): number[][][] | null {
  // 1) Chinese city → province
  const city = findCity(name);
  if (city) {
    const fullName = PROV_FULL[city.province] ?? city.province;
    const feat = findChinaFeature(fullName);
    if (feat) return geoToRings(feat.geometry, w, h);
  }

  // 2) Name is a Chinese province itself (e.g. "陕西", "青海")
  if (name in PROVINCES) {
    const fullName = PROV_FULL[name];
    if (fullName) {
      const feat = findChinaFeature(fullName);
      if (feat) return geoToRings(feat.geometry, w, h);
    }
  }

  // 3) World city → country
  const wc = findWorldCity(name);
  if (wc) {
    const enName = COUNTRY_CN_EN[wc.country];
    if (enName) {
      const feat = findWorldFeature(enName);
      if (feat) return geoToRings(feat.geometry, w, h);
    }
  }

  // 4) Name is a country itself (e.g. "日本", "法国")
  if (name in COUNTRIES) {
    const enName = COUNTRY_CN_EN[name];
    if (enName) {
      const feat = findWorldFeature(enName);
      if (feat) return geoToRings(feat.geometry, w, h);
    }
  }

  return null;
}
