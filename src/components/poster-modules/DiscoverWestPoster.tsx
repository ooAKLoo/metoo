import { useMemo } from "react";
import { Rect, Text, Line, Group, Circle, Path, Image as KImage } from "react-konva";
import useImage from "use-image";
import { detectPosterRatio, type PosterModuleProps, type PosterRatio } from "../../lib/poster-modules";
import { KonvaPosterStage } from "../../lib/poster-stage";
import { coverSrc } from "../map-shared";
import { useMapStore } from "../../stores/useMapStore";

/* ── Fonts ── */
const FONT_SERIF =
  '"Noto Serif SC", "Noto Serif CJK SC", "Source Han Serif SC", "Songti SC", serif';
const FONT_SANS = "ui-sans-serif, system-ui, sans-serif";
const FONT_CN = "'Noto Sans SC', 'PingFang SC', system-ui, sans-serif";

/* ── Text measurement ── */
const _mCtx = document.createElement("canvas").getContext("2d")!;
function measureText(
  text: string,
  fontSize: number,
  fontWeight: string,
  fontFamily: string,
): number {
  _mCtx.font = `${fontWeight} ${fontSize}px ${fontFamily}`;
  return _mCtx.measureText(text).width;
}

/* ── Transit map: build station nodes ── */

interface StationNode {
  id: string;
  x: number;
  y: number;
  name: string;
  count: number;
  type: "major" | "minor" | "highlight";
}

function buildTransitNodes(
  cities: { name: string; count: number }[],
): StationNode[] {
  if (cities.length === 0) return [];

  const mainCount = Math.min(cities.length, 7);
  const branchCount = Math.min(Math.max(cities.length - 7, 0), 3);
  const maxCount = cities[0].count;
  const nodes: StationNode[] = [];

  for (let i = 0; i < mainCount; i++) {
    const city = cities[i];
    const x = 450 - i * (450 / Math.max(mainCount - 1, 1));
    const type: StationNode["type"] =
      i === 0
        ? "highlight"
        : city.count >= maxCount * 0.4
          ? "major"
          : "minor";
    nodes.push({
      id: `main-${i}`,
      x,
      y: 60,
      name: city.name,
      count: city.count,
      type,
    });
  }

  const branchStartX = 230;
  for (let i = 0; i < branchCount; i++) {
    const city = cities[7 + i];
    nodes.push({
      id: `branch-${i}`,
      x: branchStartX - i * 45,
      y: 110,
      name: city.name,
      count: city.count,
      type: "minor",
    });
  }

  return nodes;
}

/* ── Cover image sub-component ── */

function CoverImage({
  src,
  x,
  y,
  w,
  h,
  radius,
  cityName,
  cityFontSize,
  gradientH,
}: {
  src: string;
  x: number;
  y: number;
  w: number;
  h: number;
  radius: number;
  cityName: string;
  cityFontSize: number;
  gradientH: number;
}) {
  const [img] = useImage(src, "anonymous");

  // object-fit: cover — maintain aspect ratio, crop to fill
  let imgX = 0, imgY = 0, imgW = w, imgH = h;
  if (img && img.naturalWidth && img.naturalHeight) {
    const imgRatio = img.naturalWidth / img.naturalHeight;
    const boxRatio = w / h;
    if (imgRatio > boxRatio) {
      // image wider than box → fit height, crop width
      imgH = h;
      imgW = h * imgRatio;
      imgX = (w - imgW) / 2;
    } else {
      // image taller than box → fit width, crop height
      imgW = w;
      imgH = w / imgRatio;
      imgY = (h - imgH) / 2;
    }
  }

  return (
    <Group
      x={x}
      y={y}
      clipFunc={(ctx) => {
        const r = radius;
        ctx.beginPath();
        ctx.moveTo(r, 0);
        ctx.arcTo(w, 0, w, h, r);
        ctx.arcTo(w, h, 0, h, r);
        ctx.arcTo(0, h, 0, 0, r);
        ctx.arcTo(0, 0, w, 0, r);
        ctx.closePath();
      }}
    >
      {/* Gray placeholder */}
      <Rect width={w} height={h} fill="#e5e7eb" />
      {/* Cover image (object-fit: cover) */}
      {img && <KImage image={img} x={imgX} y={imgY} width={imgW} height={imgH} />}
      {/* Gradient overlay */}
      <Rect
        y={h - gradientH}
        width={w}
        height={gradientH}
        fillLinearGradientStartPoint={{ x: 0, y: 0 }}
        fillLinearGradientEndPoint={{ x: 0, y: gradientH }}
        fillLinearGradientColorStops={[
          0,
          "transparent",
          1,
          "rgba(0,0,0,0.5)",
        ]}
      />
      {/* City name label */}
      <Text
        x={16}
        y={h - cityFontSize - 12}
        text={cityName}
        fill="#fff"
        fontSize={cityFontSize}
        fontStyle="700"
        fontFamily={FONT_SANS}
        letterSpacing={cityFontSize * 0.1}
      />
    </Group>
  );
}

/* ── Vertical text helper: render each char stacked vertically ── */

function VerticalText({
  x,
  y,
  name,
  fontSize,
  fontStyle,
  fill,
  align,
}: {
  x: number;
  y: number;
  name: string;
  fontSize: number;
  fontStyle: string;
  fill: string;
  align: "center" | "left";
}) {
  const chars = [...name.slice(0, 3)];
  const charH = fontSize * 1.3;
  const totalH = chars.length * charH;
  const startY = align === "center" ? y - totalH / 2 : y;
  return (
    <>
      {chars.map((ch, i) => (
        <Text
          key={i}
          x={x - fontSize / 2}
          y={startY + i * charH}
          text={ch}
          fontSize={fontSize}
          fontStyle={fontStyle}
          fill={fill}
          width={fontSize}
          align="center"
          fontFamily={FONT_CN}
        />
      ))}
    </>
  );
}

/* ── Transit map rendered via Konva shapes ── */

function KonvaTransitMap({
  cities,
  scale,
  offsetX,
  offsetY,
}: {
  cities: { name: string; count: number }[];
  scale: number;
  offsetX: number;
  offsetY: number;
}) {
  const nodes = useMemo(() => buildTransitNodes(cities), [cities]);
  const hasBranch = cities.length > 7;
  const mainRight = 480;
  const mainLeft =
    nodes.length > 0
      ? Math.min(...nodes.filter((n) => n.y === 60).map((n) => n.x)) - 20
      : 0;

  return (
    <Group x={offsetX} y={offsetY} scaleX={scale} scaleY={scale}>
      {/* Main line (solid) */}
      <Line
        points={[mainRight, 60, mainLeft, 60]}
        stroke="#4b5563"
        strokeWidth={4}
      />
      {/* Main line (dashed overlay) */}
      <Line
        points={[mainRight, 60, mainLeft, 60]}
        stroke="#f3f4f6"
        strokeWidth={1.5}
        dash={[5, 3]}
      />

      {/* Branch line */}
      {hasBranch && (
        <Line
          points={[290, 60, 270, 60, 230, 110, 140, 110, 100, 60]}
          stroke="#6b7280"
          strokeWidth={2.5}
        />
      )}

      {/* Route label: 收藏线 */}
      <Group x={210} y={14}>
        <Rect
          width={42}
          height={14}
          fill="rgba(255,255,255,0.85)"
          cornerRadius={2}
        />
        <Text
          x={4}
          y={1}
          text="收藏线"
          fontSize={9}
          fontStyle="700"
          fill="#6b7280"
          fontFamily={FONT_CN}
          letterSpacing={9 * 0.15}
        />
      </Group>

      {/* Route label: 发现支线 */}
      {hasBranch && (
        <Group x={180} y={131}>
          <Rect
            width={52}
            height={14}
            fill="rgba(255,255,255,0.85)"
            cornerRadius={2}
          />
          <Text
            x={4}
            y={1}
            text="发现支线"
            fontSize={9}
            fontStyle="700"
            fill="#6b7280"
            fontFamily={FONT_CN}
            letterSpacing={9 * 0.15}
          />
        </Group>
      )}

      {/* Station nodes */}
      {nodes.map((node) => {
        if (node.type === "highlight") {
          // Large black circle with white border
          const r = 21;
          const fs = node.name.length > 2 ? 11 : 13;
          return (
            <Group key={node.id} x={node.x} y={node.y}>
              {/* White border ring */}
              <Circle radius={r + 3} fill="white" />
              {/* Black circle */}
              <Circle radius={r} fill="black" />
              {/* Vertical station name */}
              <VerticalText
                x={0}
                y={0}
                name={node.name}
                fontSize={fs}
                fontStyle="700"
                fill="white"
                align="center"
              />
            </Group>
          );
        } else if (node.type === "major") {
          // Gray pill shape
          const pillW = 24;
          const pillH = node.name.length > 2 ? 62 : 56;
          const fs = node.name.length > 2 ? 9 : 11;
          return (
            <Group key={node.id} x={node.x} y={node.y}>
              {/* White border */}
              <Rect
                x={-(pillW / 2) - 2}
                y={-(pillH / 2) - 2}
                width={pillW + 4}
                height={pillH + 4}
                cornerRadius={12}
                fill="white"
              />
              {/* Gray background */}
              <Rect
                x={-pillW / 2}
                y={-pillH / 2}
                width={pillW}
                height={pillH}
                cornerRadius={12}
                fill="#d1d5db"
              />
              {/* Vertical station name */}
              <VerticalText
                x={0}
                y={0}
                name={node.name}
                fontSize={fs}
                fontStyle="700"
                fill="black"
                align="center"
              />
            </Group>
          );
        } else {
          // Minor: small white pill
          const pillW = 18;
          const pillH = node.name.length > 2 ? 48 : 44;
          const fs = 9;
          return (
            <Group key={node.id} x={node.x} y={node.y}>
              {/* Border */}
              <Rect
                x={-(pillW / 2) - 1}
                y={-(pillH / 2) - 1}
                width={pillW + 2}
                height={pillH + 2}
                cornerRadius={9}
                fill="#9ca3af"
              />
              {/* White background */}
              <Rect
                x={-pillW / 2}
                y={-pillH / 2}
                width={pillW}
                height={pillH}
                cornerRadius={9}
                fill="white"
              />
              {/* Vertical station name */}
              <VerticalText
                x={0}
                y={0}
                name={node.name}
                fontSize={fs}
                fontStyle="700"
                fill="#374151"
                align="center"
              />
            </Group>
          );
        }
      })}
    </Group>
  );
}

/* ── Per-ratio layout config ── */

interface DiscoverLayout {
  posterPad: number;
  titleSize: number;
  journeySize: number;
  sideColW: number;
  footerFs: number;
  footerNumFs: number;
  leftFrac: number;
  titleMt: number;
  journeyMt: number;
  footerH: number;
  footerTextFrac: number;
  footerTextOffsetX: number;
  footerTextOffsetY: number;
  transitMapOffsetY: number;
  transitMapScale: number;
  isVerticalLayout: boolean;
}

const BASE_LAYOUT: DiscoverLayout = {
  posterPad: 40,
  titleSize: 100,
  journeySize: 22,
  sideColW: 180,
  footerFs: 24,
  footerNumFs: 28,
  leftFrac: 0.32,
  titleMt: 80,
  journeyMt: 48,
  footerH: 180,
  footerTextFrac: 0.45,
  footerTextOffsetX: 8,
  footerTextOffsetY: 66,
  transitMapOffsetY: 0,
  transitMapScale: 1,
  isVerticalLayout: false,
};

export const DISCOVER_RATIO_LAYOUTS: Record<PosterRatio, DiscoverLayout> = {
  "4:3": BASE_LAYOUT,
  "3:4": {
    ...BASE_LAYOUT,
    posterPad: 44,
    titleSize: 74,
    journeySize: 26,
    sideColW: 240,
    footerFs: 22,
    footerNumFs: 26,
    leftFrac: 0.32,
    titleMt: 60,
    journeyMt: 48,
    footerH: 180,
    footerTextFrac: 0.45,
    footerTextOffsetX: -16,
    footerTextOffsetY: 44,
    transitMapOffsetY: 48,
    transitMapScale: 1,
    isVerticalLayout: true,
  },
  "1:1": {
    ...BASE_LAYOUT,
    posterPad: 40,
    titleSize: 56,
    journeySize: 18,
    sideColW: 140,
    footerFs: 20,
    footerNumFs: 24,
    leftFrac: 0.36,
    titleMt: 56,
    journeyMt: 32,
    footerH: 180,
    footerTextFrac: 0.48,
    transitMapScale: 1,
    isVerticalLayout: false,
  },
  "16:9": {
    ...BASE_LAYOUT,
    posterPad: 40,
    titleSize: 80,
    journeySize: 24,
    sideColW: 220,
    footerFs: 24,
    footerNumFs: 28,
    leftFrac: 0.28,
    titleMt: 96,
    journeyMt: 56,
    footerH: 240,
    footerTextFrac: 0.44,
    footerTextOffsetX: 8,
    footerTextOffsetY: 158,
    transitMapScale: 1.35,
    isVerticalLayout: false,
  },
};

/* ── Main component ── */

function DiscoverWestPoster({
  items,
  cityEntries,
  posterWidth: W,
  posterHeight: H,
}: PosterModuleProps) {
  /* ── Ratio-based layout config (merged with store overrides) ── */
  const ratio = detectPosterRatio(W, H);
  const discoverConfigs = useMapStore((s) => s.discoverConfigs);
  const figureSeed = useMapStore((s) => s.figureSeed);
  const storeOverride = discoverConfigs[ratio] ?? {};
  const L = { ...DISCOVER_RATIO_LAYOUTS[ratio], ...storeOverride };

  /* ── Data ── */
  const totalCities = cityEntries.length;
  const totalItems = items.length;
  const topCity = cityEntries[0];

  const heroCovers = useMemo(() => {
    const out: { src: string; city: string }[] = [];
    for (const city of cityEntries) {
      if (out.length >= 5) break;
      const cover = city.covers[0];
      if (cover) out.push({ src: coverSrc(cover), city: city.name });
    }
    // shuffle with figureSeed
    if (figureSeed !== 42 && out.length > 1) {
      for (let i = out.length - 1; i > 0; i--) {
        const j = Math.abs(Math.round(Math.sin(figureSeed * 0.1 + i * 7.919) * 10000)) % (i + 1);
        [out[i], out[j]] = [out[j], out[i]];
      }
    }
    return out;
  }, [cityEntries, figureSeed]);

  const transitCities = useMemo(
    () =>
      cityEntries.slice(0, 10).map((c) => ({ name: c.name, count: c.count })),
    [cityEntries],
  );

  const footerLine1 = topCity
    ? `从收藏夹出发，${topCity.name}是你最常标记的城市。`
    : "从收藏夹出发，探索你的旅行足迹。";

  /* ── Layout-adaptive values (from ratio config) ── */
  const {
    posterPad, titleSize, journeySize, sideColW,
    footerFs, footerNumFs, leftFrac, titleMt,
    journeyMt, footerH, footerTextFrac,
    footerTextOffsetX, footerTextOffsetY, transitMapOffsetY, transitMapScale,
    isVerticalLayout,
  } = L;

  /* ── Title text lines ── */
  const titleLine1 = topCity
    ? `${topCity.name.slice(0, 2)}，`
    : "出发，";
  const titleLine2 = topCity
    ? topCity.name.length > 2
      ? `${topCity.name.slice(2)}。`
      : "印记。"
    : "去远方。";

  /* ── Pre-compute footer text layout ── */
  const footerLayout = useMemo(() => {
    const numW1 = measureText(String(totalItems), footerNumFs, "700", FONT_SANS);
    const numW2 = measureText(String(totalCities), footerNumFs, "700", FONT_SANS);
    const t1 = "个收藏 · ";
    const t2 = "座城市";
    const tW1 = measureText(t1, footerFs, "400", FONT_SERIF);
    const tW2 = measureText(t2, footerFs, "400", FONT_SERIF);
    return { numW1, numW2, tW1, tW2, t1, t2 };
  }, [totalItems, totalCities, footerFs, footerNumFs]);

  /* ── Compute layout positions ── */
  const layout = useMemo(() => {
    if (isVerticalLayout) {
      /* ── Portrait (3:4) ── */
      const brandY = posterPad;
      const brandH = 40;

      // Cover images area
      const coverY = brandY + brandH + 24;
      const coverH = 440;
      const coverAreaW = W - posterPad * 2;

      // Main cover
      const sideW = heroCovers.length > 1 ? sideColW : 0;
      const gapW = heroCovers.length > 1 ? 10 : 0;
      const mainCoverW = coverAreaW - sideW - gapW;

      // Side covers
      const sideCovers = heroCovers.slice(1, 4);
      const sideGap = 10;
      const sideCoverH =
        sideCovers.length > 0
          ? (coverH - (sideCovers.length - 1) * sideGap) / sideCovers.length
          : 0;

      // Title area: between covers and footer
      const titleAreaTop = coverY + coverH + 20;

      // Footer area
      const footerTextH = footerFs * 1.6 * 2 + 8;
      const transitMapH = 160;
      const footerTotalH = footerTextH + 20 + transitMapH + 16;
      const footerY = H - posterPad - footerTotalH;

      // Title vertically centered between covers and footer
      const titleAreaH = footerY - titleAreaTop;
      const titleBlockH = titleSize * 1.2 * 2 + journeySize + 32;
      const titleY = titleAreaTop + (titleAreaH - titleBlockH) / 2;

      return {
        isVerticalLayout: true as const,
        brandY,
        coverY,
        coverH,
        mainCoverW,
        mainCoverX: posterPad,
        sideX: posterPad + mainCoverW + gapW,
        sideW,
        sideCovers,
        sideCoverH,
        sideGap,
        titleY,
        journeyY: titleY + titleSize * 1.2 * 2 + 32,
        footerTextY: footerY,
        transitMapY: footerY + footerTextH + 20,
        brandingY: H - posterPad - 48,
        transitMapScale,
        transitMapX: posterPad,
      };
    } else {
      /* ── Horizontal (1:1, 4:3, 16:9) ── */
      const innerW = W - posterPad * 2;
      const leftW = Math.round(innerW * leftFrac);
      const rightW = innerW - leftW;

      // Top section height (above footer)
      const topH = H - posterPad * 2 - footerH;

      // Brand
      const brandY = posterPad + 8;

      // Title
      const titleY = posterPad + 8 + titleMt;

      // Journey
      const journeyY = titleY + titleSize * 1.2 * 2 + journeyMt;

      // Right cover area
      const coverX = posterPad + leftW + 8;
      const coverAreaW = rightW - 8;
      const coverH = topH;

      const sideW = heroCovers.length > 1 ? sideColW : 0;
      const gapW = heroCovers.length > 1 ? 10 : 0;
      const mainCoverW = coverAreaW - sideW - gapW;

      // Side covers — up to 4 for horizontal
      const sideCovers = heroCovers.slice(1, 5);
      const sideGap = 10;
      const sideCoverH =
        sideCovers.length > 0
          ? (coverH - (sideCovers.length - 1) * sideGap) / sideCovers.length
          : 0;

      // Footer
      const footerY = posterPad + topH + 32;
      const footerTextW = Math.round(innerW * footerTextFrac);

      return {
        isVerticalLayout: false as const,
        brandY,
        titleY,
        journeyY,
        coverX,
        coverH: topH,
        mainCoverW,
        sideX: coverX + mainCoverW + gapW,
        sideW,
        sideCovers,
        sideCoverH,
        sideGap,
        footerY,
        footerMapX: posterPad + footerTextW,
        transitMapScale,
        brandingY: H - posterPad - 48,
      };
    }
  }, [W, H, L, heroCovers]);

  /* ── Brand elements helper ── */
  const renderBrand = (x: number, y: number) => (
    <Group x={x} y={y}>
      {/* "在路上，发现远方。" */}
      <Text
        x={0}
        y={0}
        text="在路上，发现远方。"
        fontSize={11}
        fontStyle="700"
        fill="#1f2937"
        fontFamily={FONT_CN}
        letterSpacing={11 * 0.2}
      />
      {/* Triangle + DISCOVER */}
      <Group y={18}>
        {/* Triangle arrow */}
        <Path
          data="M 0 5 L 8 0 L 8 10 Z"
          fill="black"
          scaleX={-1}
          x={8}
        />
        <Text
          x={16}
          y={-2}
          text="DISCOVER"
          fontSize={15}
          fontStyle="700"
          fill="#1f2937"
          fontFamily={FONT_SANS}
          letterSpacing={15 * 0.15}
        />
      </Group>
    </Group>
  );

  /* ── Branding mark (觅途 / METOO) ── */
  const renderBrandingMark = (x: number, y: number) => (
    <Group x={x} y={y}>
      <Text
        x={0}
        y={0}
        text="觅途"
        fontSize={30}
        fontStyle="700"
        fill="#1a1a1a"
        fontFamily={FONT_CN}
        letterSpacing={-1}
        align="center"
        width={60}
      />
      <Text
        x={0}
        y={36}
        text="METOO"
        fontSize={8}
        fontStyle="400"
        fill="#6b7280"
        fontFamily={FONT_SANS}
        letterSpacing={8 * 0.2}
        align="center"
        width={60}
      />
    </Group>
  );

  /* ── Title block ── */
  const renderTitle = (x: number, y: number) => (
    <Group x={x} y={y}>
      <Text
        x={0}
        y={0}
        text={titleLine1}
        fontSize={titleSize}
        fontStyle="500"
        fill="#111827"
        fontFamily={FONT_SERIF}
        letterSpacing={titleSize * 0.15}
      />
      <Text
        x={0}
        y={titleSize * 1.2}
        text={titleLine2}
        fontSize={titleSize}
        fontStyle="500"
        fill="#111827"
        fontFamily={FONT_SERIF}
        letterSpacing={titleSize * 0.15}
      />
    </Group>
  );

  /* ── JOURNEY. divider ── */
  const renderJourney = (x: number, y: number) => (
    <Group x={x} y={y}>
      <Line
        points={[0, journeySize / 2, 64, journeySize / 2]}
        stroke="#9ca3af"
        strokeWidth={1}
      />
      <Text
        x={88}
        y={0}
        text="JOURNEY."
        fontSize={journeySize}
        fontStyle="400"
        fill="#1f2937"
        fontFamily={FONT_SANS}
        letterSpacing={journeySize * 0.35}
      />
    </Group>
  );

  /* ── Footer stats text ── */
  const renderFooterText = (x: number, y: number) => {
    const lineH = footerFs * 1.6;
    // Line 1: footerLine1
    // Line 2: {totalItems} 个收藏 · {totalCities} 座城市
    const { numW1, numW2, tW1, t1, t2 } = footerLayout;
    const numStr1 = String(totalItems);
    const numStr2 = String(totalCities);

    return (
      <Group x={x} y={y}>
        {/* Line 1 */}
        <Text
          x={0}
          y={0}
          text={footerLine1}
          fontSize={footerFs}
          fontStyle="400"
          fill="#111827"
          fontFamily={FONT_SERIF}
          letterSpacing={footerFs * 0.1}
        />
        {/* Line 2: mixed font sizes */}
        <Group y={lineH}>
          <Text
            x={0}
            y={0}
            text={numStr1}
            fontSize={footerNumFs}
            fontStyle="700"
            fill="#111827"
            fontFamily={FONT_SANS}
          />
          <Text
            x={numW1 + 4}
            y={footerNumFs - footerFs}
            text={t1}
            fontSize={footerFs}
            fontStyle="400"
            fill="#111827"
            fontFamily={FONT_SERIF}
            letterSpacing={footerFs * 0.1}
          />
          <Text
            x={numW1 + 4 + tW1}
            y={0}
            text={numStr2}
            fontSize={footerNumFs}
            fontStyle="700"
            fill="#111827"
            fontFamily={FONT_SANS}
          />
          <Text
            x={numW1 + 4 + tW1 + numW2 + 4}
            y={footerNumFs - footerFs}
            text={t2}
            fontSize={footerFs}
            fontStyle="400"
            fill="#111827"
            fontFamily={FONT_SERIF}
            letterSpacing={footerFs * 0.1}
          />
        </Group>
      </Group>
    );
  };

  /* ── Cover images block ── */
  const renderCovers = (
    x: number,
    y: number,
    mainW: number,
    h: number,
    _sideX: number,
    _sideW: number,
    _sideCovers: { src: string; city: string }[],
    _sideCoverH: number,
    _sideGap: number,
  ) => (
    <Group x={x} y={y}>
      {/* Main hero cover */}
      {heroCovers.length > 0 && (
        <CoverImage
          src={heroCovers[0].src}
          x={0}
          y={0}
          w={mainW}
          h={h}
          radius={16}
          cityName={heroCovers[0].city}
          cityFontSize={13}
          gradientH={60}
        />
      )}
      {/* Side covers */}
      {_sideCovers.map((item, i) => (
        <CoverImage
          key={i}
          src={item.src}
          x={_sideX - x}
          y={i * (_sideCoverH + _sideGap)}
          w={_sideW}
          h={_sideCoverH}
          radius={12}
          cityName={item.city}
          cityFontSize={9}
          gradientH={40}
        />
      ))}
    </Group>
  );

  return (
    <KonvaPosterStage width={W} height={H}>
      {/* Outer rounded-corner clip */}
      <Group
        clipFunc={(ctx) => {
          const r = 24;
          ctx.beginPath();
          ctx.moveTo(r, 0);
          ctx.arcTo(W, 0, W, H, r);
          ctx.arcTo(W, H, 0, H, r);
          ctx.arcTo(0, H, 0, 0, r);
          ctx.arcTo(0, 0, W, 0, r);
          ctx.closePath();
        }}
      >
        {/* White background */}
        <Rect width={W} height={H} fill="white" />

        {layout.isVerticalLayout ? (
          /* ── Portrait layout (3:4) ── */
          <>
            {/* Brand */}
            {renderBrand(posterPad, layout.brandY)}

            {/* Cover images */}
            {renderCovers(
              layout.mainCoverX,
              layout.coverY,
              layout.mainCoverW,
              layout.coverH,
              layout.sideX,
              layout.sideW,
              layout.sideCovers,
              layout.sideCoverH,
              layout.sideGap,
            )}

            {/* Title */}
            {renderTitle(posterPad, layout.titleY)}

            {/* JOURNEY. divider */}
            {renderJourney(posterPad, layout.journeyY)}

            {/* Footer stats text */}
            {renderFooterText(posterPad + footerTextOffsetX, layout.footerTextY + footerTextOffsetY)}

            {/* Transit map + branding mark at bottom */}
            <KonvaTransitMap
              cities={transitCities}
              scale={layout.transitMapScale}
              offsetX={layout.transitMapX}
              offsetY={layout.transitMapY + transitMapOffsetY}
            />

            {/* Branding mark (bottom right) */}
            {renderBrandingMark(
              W - posterPad - 60,
              layout.brandingY,
            )}
          </>
        ) : (
          /* ── Horizontal layouts (1:1, 4:3, 16:9) ── */
          <>
            {/* Brand (top-left) */}
            {renderBrand(posterPad, layout.brandY)}

            {/* Title (left column) */}
            {renderTitle(posterPad, layout.titleY)}

            {/* JOURNEY. divider (left column) */}
            {renderJourney(posterPad, layout.journeyY)}

            {/* Cover images (right column) */}
            {renderCovers(
              layout.coverX,
              posterPad,
              layout.mainCoverW,
              layout.coverH,
              layout.sideX,
              layout.sideW,
              layout.sideCovers,
              layout.sideCoverH,
              layout.sideGap,
            )}

            {/* Footer text (bottom-left) */}
            {renderFooterText(posterPad + footerTextOffsetX, layout.footerY + footerTextOffsetY)}

            {/* Transit map (bottom-right) */}
            <KonvaTransitMap
              cities={transitCities}
              scale={layout.transitMapScale}
              offsetX={layout.footerMapX}
              offsetY={layout.footerY + transitMapOffsetY}
            />

            {/* Branding mark (bottom far right) */}
            {renderBrandingMark(
              W - posterPad - 60,
              layout.brandingY,
            )}
          </>
        )}
      </Group>
    </KonvaPosterStage>
  );
}

export default DiscoverWestPoster;
