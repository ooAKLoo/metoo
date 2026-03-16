import { convertFileSrc } from "@tauri-apps/api/core";
import type { FavoriteItem } from "../stores/useFavoriteStore";

/* ── Constants ─────────────────────────────────────── */

const DPR = 3;
const W = 1080;
const PAD = 60;
const CONTENT_W = W - PAD * 2;

const PROV_FULL: Record<string, string> = {
  北京: "北京市", 天津: "天津市", 上海: "上海市", 重庆: "重庆市",
  河北: "河北省", 山西: "山西省", 辽宁: "辽宁省", 吉林: "吉林省",
  黑龙江: "黑龙江省", 江苏: "江苏省", 浙江: "浙江省", 安徽: "安徽省",
  福建: "福建省", 江西: "江西省", 山东: "山东省", 河南: "河南省",
  湖北: "湖北省", 湖南: "湖南省", 广东: "广东省", 海南: "海南省",
  四川: "四川省", 贵州: "贵州省", 云南: "云南省", 陕西: "陕西省",
  甘肃: "甘肃省", 青海: "青海省", 台湾: "台湾省",
  内蒙古: "内蒙古自治区", 广西: "广西壮族自治区", 西藏: "西藏自治区",
  宁夏: "宁夏回族自治区", 新疆: "新疆维吾尔自治区",
  香港: "香港特别行政区", 澳门: "澳门特别行政区",
};

/* ── Types ─────────────────────────────────────────── */

interface GeoFeature {
  type: string;
  properties: { name: string; center?: [number, number] };
  geometry: {
    type: "Polygon" | "MultiPolygon";
    coordinates: number[][][] | number[][][][];
  };
}

interface PosterParams {
  cityName: string;
  provinceName: string;
  items: FavoriteItem[];
  cityCoord: [number, number];
}

/* ── Helpers ───────────────────────────────────────── */

function coverSrc(cover: string) {
  if (!cover) return "";
  if (cover.startsWith("/")) return convertFileSrc(cover);
  if (cover.startsWith("//")) return `https:${cover}`;
  return cover;
}

async function loadImage(src: string): Promise<HTMLImageElement | null> {
  if (!src) return null;
  try {
    const resp = await fetch(src);
    if (!resp.ok) return null;
    const blob = await resp.blob();
    const objectUrl = URL.createObjectURL(blob);
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => { URL.revokeObjectURL(objectUrl); resolve(img); };
      img.onerror = () => { URL.revokeObjectURL(objectUrl); resolve(null); };
      img.src = objectUrl;
    });
  } catch {
    return null;
  }
}

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number, y: number, w: number, h: number, r: number,
) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

function getGeoBounds(feature: GeoFeature) {
  let minLng = Infinity, maxLng = -Infinity;
  let minLat = Infinity, maxLat = -Infinity;
  const processRing = (ring: number[][]) => {
    for (const [lng, lat] of ring) {
      if (lng < minLng) minLng = lng;
      if (lng > maxLng) maxLng = lng;
      if (lat < minLat) minLat = lat;
      if (lat > maxLat) maxLat = lat;
    }
  };
  if (feature.geometry.type === "MultiPolygon") {
    for (const polygon of feature.geometry.coordinates as number[][][][])
      for (const ring of polygon) processRing(ring);
  } else {
    for (const ring of feature.geometry.coordinates as number[][][])
      processRing(ring);
  }
  return { minLng, maxLng, minLat, maxLat };
}

/* ── Province Rendering (compact) ──────────────────── */

function drawProvince(
  ctx: CanvasRenderingContext2D,
  feature: GeoFeature,
  areaX: number, areaY: number, areaW: number, areaH: number,
  cityCoord: [number, number],
) {
  const bounds = getGeoBounds(feature);
  const geoW = bounds.maxLng - bounds.minLng;
  const geoH = bounds.maxLat - bounds.minLat;

  const innerPad = 8;
  const fitW = areaW - innerPad * 2;
  const fitH = areaH - innerPad * 2;
  const scale = Math.min(fitW / geoW, fitH / geoH);

  const centerX = areaX + areaW / 2;
  const centerY = areaY + areaH / 2;
  const geoCenterLng = (bounds.minLng + bounds.maxLng) / 2;
  const geoCenterLat = (bounds.minLat + bounds.maxLat) / 2;

  const project = (lng: number, lat: number): [number, number] => [
    centerX + (lng - geoCenterLng) * scale,
    centerY - (lat - geoCenterLat) * scale,
  ];

  ctx.lineJoin = "round";
  ctx.lineCap = "round";

  ctx.strokeStyle = "#c0c0c0";
  ctx.lineWidth = 1.2;

  const drawPolygonRings = (rings: number[][][]) => {
    for (const ring of rings) {
      ctx.beginPath();
      for (let i = 0; i < ring.length; i++) {
        const [x, y] = project(ring[i][0], ring[i][1]);
        if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
      }
      ctx.closePath();
      ctx.stroke();
    }
  };

  if (feature.geometry.type === "MultiPolygon") {
    for (const polygon of feature.geometry.coordinates as number[][][][])
      drawPolygonRings(polygon);
  } else {
    drawPolygonRings(feature.geometry.coordinates as number[][][]);
  }

  ctx.lineJoin = "miter";
  ctx.lineCap = "butt";
}

/* ── Main Poster Generation ────────────────────────── */

export async function generateCityPoster(params: PosterParams): Promise<Blob> {
  const { cityName, provinceName, items, cityCoord } = params;

  // Show ALL items
  const displayItems = items;
  const n = displayItems.length;

  // Pick column count to avoid orphan in last row:
  // prefer 2 cols; switch to 3 when 3 fills evenly but 2 doesn't (e.g. 3,9,15,21)
  const cols = n <= 1 ? 1 : (n % 2 !== 0 && n % 3 === 0) ? 3 : 2;
  const rows = Math.ceil(n / cols);

  // Load GeoJSON
  const geoModule = await import("../assets/china.json");
  const geoJson = (geoModule as { default?: { features?: GeoFeature[] } }).default || geoModule;
  const fullProvName = PROV_FULL[provinceName] || provinceName;
  const features = (geoJson as { features?: GeoFeature[] }).features || [];
  const feature = features.find((f) => f.properties?.name === fullProvName);

  // Pre-load cover images
  const coverImages = await Promise.all(
    displayItems.map((item) => loadImage(coverSrc(item.cover))),
  );

  /* ── Layout ── */

  // Header: province silhouette (left) + text (right), same height
  const HEADER_H = 100;
  const GEO_W = 100; // square area for province
  const TEXT_LEFT = PAD + GEO_W + 24; // gap between geo and text

  const HEADER_BOTTOM_GAP = 32;

  // Cards grid
  const GRID_GAP = 16;
  const CARD_W = (CONTENT_W - GRID_GAP * (cols - 1)) / cols;
  const CARD_IMG_H = CARD_W * 0.62;
  const CARD_TEXT_H = 56;
  const CARD_H = CARD_IMG_H + CARD_TEXT_H;
  const GRID_H = rows * CARD_H + Math.max(0, rows - 1) * GRID_GAP;

  const FOOTER_H = 60;

  const H = PAD + HEADER_H + HEADER_BOTTOM_GAP + GRID_H + FOOTER_H + PAD;

  /* ── Create canvas ── */
  const canvas = document.createElement("canvas");
  canvas.width = W * DPR;
  canvas.height = H * DPR;
  const ctx = canvas.getContext("2d")!;
  ctx.scale(DPR, DPR);

  // Background
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, W, H);

  /* ── 1. Header row: province silhouette + text ── */

  // Province silhouette in a compact square
  if (feature) {
    drawProvince(ctx, feature, PAD, PAD, GEO_W, HEADER_H, cityCoord);
  } else {
    // Fallback: small dot
    const cx = PAD + GEO_W / 2;
    const cy = PAD + HEADER_H / 2;
    ctx.fillStyle = "#f0eeeb";
    ctx.beginPath();
    ctx.arc(cx, cy, 36, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#ef4444";
    ctx.beginPath();
    ctx.arc(cx, cy, 5, 0, Math.PI * 2);
    ctx.fill();
  }

  // City name — vertically centered with the silhouette
  const textCenterY = PAD + HEADER_H / 2;

  ctx.fillStyle = "#1a1a1a";
  ctx.font = "bold 36px -apple-system, 'SF Pro Display', 'PingFang SC', sans-serif";
  ctx.textAlign = "left";
  ctx.textBaseline = "middle";
  ctx.fillText(cityName, TEXT_LEFT, textCenterY - 14);

  ctx.fillStyle = "#999999";
  ctx.font = "15px -apple-system, 'SF Pro Display', 'PingFang SC', sans-serif";
  ctx.fillText(`${items.length} 条收藏 · ${provinceName}`, TEXT_LEFT, textCenterY + 22);

  ctx.textBaseline = "alphabetic"; // reset

  // Subtle divider line
  const dividerY = PAD + HEADER_H + HEADER_BOTTOM_GAP / 2;
  ctx.strokeStyle = "#eeeeee";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(PAD, dividerY);
  ctx.lineTo(W - PAD, dividerY);
  ctx.stroke();

  /* ── 2. Items grid (all items) ── */
  const gridTop = PAD + HEADER_H + HEADER_BOTTOM_GAP;

  for (let i = 0; i < displayItems.length; i++) {
    const item = displayItems[i];
    const col = i % cols;
    const row = Math.floor(i / cols);
    const x = PAD + col * (CARD_W + GRID_GAP);
    const y = gridTop + row * (CARD_H + GRID_GAP);

    // Card background
    roundRect(ctx, x, y, CARD_W, CARD_H, 12);
    ctx.fillStyle = "#f7f7f7";
    ctx.fill();

    // Cover image
    const img = coverImages[i];
    if (img) {
      ctx.save();
      roundRect(ctx, x, y, CARD_W, CARD_IMG_H, 12);
      ctx.rect(x, y + CARD_IMG_H - 12, CARD_W, 12);
      ctx.clip();
      const imgAspect = img.width / img.height;
      const areaAspect = CARD_W / CARD_IMG_H;
      let sx = 0, sy = 0, sw = img.width, sh = img.height;
      if (imgAspect > areaAspect) {
        sw = img.height * areaAspect;
        sx = (img.width - sw) / 2;
      } else {
        sh = img.width / areaAspect;
        sy = (img.height - sh) / 2;
      }
      ctx.drawImage(img, sx, sy, sw, sh, x, y, CARD_W, CARD_IMG_H);
      ctx.restore();
    }

    // Source badge
    const isXhs = item.source === "xiaohongshu";
    const badgeX = x + 8;
    const badgeY = y + 8;
    roundRect(ctx, badgeX, badgeY, 20, 16, 4);
    ctx.fillStyle = isXhs ? "#fe2c55" : "#00a1d6";
    ctx.fill();
    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 9px -apple-system, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(isXhs ? "红" : "B", badgeX + 10, badgeY + 12);
    ctx.textAlign = "left";

    // Title text (truncate to fit)
    const titleY = y + CARD_IMG_H + 20;
    ctx.fillStyle = "#1a1a1a";
    ctx.font = "500 13px -apple-system, 'SF Pro Display', 'PingFang SC', sans-serif";
    const maxTitleW = CARD_W - 16;
    let title = item.title;
    while (ctx.measureText(title).width > maxTitleW && title.length > 0) {
      title = title.slice(0, -1);
    }
    if (title.length < item.title.length) title += "…";
    ctx.fillText(title, x + 8, titleY);

    // Author
    ctx.fillStyle = "#999999";
    ctx.font = "11px -apple-system, 'SF Pro Display', 'PingFang SC', sans-serif";
    ctx.fillText(item.author, x + 8, titleY + 20);
  }

  /* ── 3. Footer ── */
  const footerY = H - PAD - 10;
  ctx.fillStyle = "#cccccc";
  ctx.font = "12px -apple-system, 'SF Pro Display', 'PingFang SC', sans-serif";
  ctx.textAlign = "center";
  ctx.fillText("觅途 · metoo", W / 2, footerY);
  ctx.textAlign = "left";

  /* ── Export ── */
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error("Canvas toBlob failed"))),
      "image/png",
    );
  });
}
