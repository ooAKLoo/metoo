import React, { useMemo, useRef, useState, useEffect, useCallback } from "react";
import type { PosterModuleProps } from "../../lib/poster-modules";
import { coverSrc } from "../map-shared";

/* ── Transit map: dynamic city layout ── */

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

  // Main line: evenly spread from x=450 → x=0
  for (let i = 0; i < mainCount; i++) {
    const city = cities[i];
    const x = 450 - i * (450 / Math.max(mainCount - 1, 1));
    const type: StationNode["type"] =
      i === 0 ? "highlight" : city.count >= maxCount * 0.4 ? "major" : "minor";
    nodes.push({ id: `main-${i}`, x, y: 60, name: city.name, count: city.count, type });
  }

  // Branch line: cities 7-9, from x=230 → x=140 at y=110
  const branchStartX = 230;
  for (let i = 0; i < branchCount; i++) {
    const city = cities[7 + i];
    const x = branchStartX - i * 45;
    nodes.push({ id: `branch-${i}`, x, y: 110, name: city.name, count: city.count, type: "minor" });
  }

  return nodes;
}

/* ── TransitMap component ── */

const TransitMap: React.FC<{ cities: { name: string; count: number }[] }> = ({
  cities,
}) => {
  const nodes = useMemo(() => buildTransitNodes(cities), [cities]);
  const hasBranch = cities.length > 7;
  const mainRight = 480;
  const mainLeft = nodes.length > 0 ? Math.min(...nodes.filter((n) => n.y === 60).map((n) => n.x)) - 20 : 0;

  return (
    <div className="relative mr-4 select-none" style={{ width: 480, height: 160 }}>
      <svg
        width="100%"
        height="100%"
        viewBox="0 0 480 160"
        className="absolute top-0 left-0 z-0 pointer-events-none overflow-visible"
      >
        {/* Main line */}
        <path d={`M ${mainRight} 60 L ${mainLeft} 60`} stroke="#4b5563" strokeWidth="4" fill="none" />
        <path
          d={`M ${mainRight} 60 L ${mainLeft} 60`}
          stroke="#f3f4f6"
          strokeWidth="1.5"
          strokeDasharray="5 3"
          fill="none"
        />
        {/* Branch line */}
        {hasBranch && (
          <path
            d="M 290 60 L 270 60 L 230 110 L 140 110 L 100 60"
            stroke="#6b7280"
            strokeWidth="2.5"
            fill="none"
          />
        )}
      </svg>

      {/* Route labels — z-40 above all station nodes */}
      <div
        className="absolute font-bold tracking-widest text-gray-500"
        style={{ fontSize: 9, left: 210, top: 18, zIndex: 40, backgroundColor: "rgba(255,255,255,0.85)", padding: "1px 4px", borderRadius: 2 }}
      >
        收藏线
      </div>
      {hasBranch && (
        <div
          className="absolute font-bold tracking-widest text-gray-500"
          style={{ fontSize: 9, left: 180, top: 135, zIndex: 40, backgroundColor: "rgba(255,255,255,0.85)", padding: "1px 4px", borderRadius: 2 }}
        >
          发现支线
        </div>
      )}

      {/* Station nodes */}
      {nodes.map((node) => (
        <div
          key={node.id}
          className="absolute flex items-center justify-center -translate-x-1/2 -translate-y-1/2"
          style={{
            left: node.x,
            top: node.y,
            zIndex: node.type === "highlight" ? 30 : node.type === "major" ? 20 : 10,
          }}
        >
          {node.type === "highlight" ? (
            <div
              className="bg-black text-white rounded-full flex items-center justify-center font-bold tracking-widest leading-none"
              style={{
                width: 42,
                height: 42,
                borderWidth: 3,
                borderColor: "white",
                borderStyle: "solid",
                fontSize: node.name.length > 2 ? 11 : 13,
                boxShadow: "0 4px 6px -1px rgba(0,0,0,0.1)",
              }}
            >
              <span style={{ writingMode: "vertical-rl", textOrientation: "upright" }}>
                {node.name.slice(0, 3)}
              </span>
            </div>
          ) : node.type === "major" ? (
            <div
              className="bg-gray-300 text-black rounded-full flex items-center justify-center font-bold tracking-widest leading-none"
              style={{
                width: 24,
                height: node.name.length > 2 ? 62 : 56,
                border: "2px solid white",
                fontSize: node.name.length > 2 ? 9 : 11,
                boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
              }}
            >
              <span style={{ writingMode: "vertical-rl", textOrientation: "upright" }}>
                {node.name.slice(0, 3)}
              </span>
            </div>
          ) : (
            <div
              className="bg-white text-gray-700 rounded-full flex items-center justify-center font-bold tracking-widest leading-none"
              style={{
                width: 18,
                height: node.name.length > 2 ? 48 : 44,
                border: "1px solid #9ca3af",
                fontSize: 9,
                boxShadow: "0 1px 2px rgba(0,0,0,0.05)",
              }}
            >
              <span style={{ writingMode: "vertical-rl", textOrientation: "upright" }}>
                {node.name.slice(0, 3)}
              </span>
            </div>
          )}
        </div>
      ))}
    </div>
  );
};

/* ── Main component ── */

function DiscoverWestPoster({ items, cityEntries, posterWidth: POSTER_W, posterHeight: POSTER_H }: PosterModuleProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [fitScale, setFitScale] = useState(1);

  const measure = useCallback(() => {
    const el = containerRef.current;
    if (!el) return;
    const containerGap = 48;
    const sx = (el.clientWidth - containerGap) / POSTER_W;
    const sy = (el.clientHeight - containerGap) / POSTER_H;
    setFitScale(Math.min(sx, sy, 1));
  }, [POSTER_W, POSTER_H]);

  useEffect(() => {
    measure();
    const ro = new ResizeObserver(measure);
    if (containerRef.current) ro.observe(containerRef.current);
    return () => ro.disconnect();
  }, [measure]);

  /* ── Aspect-ratio detection ── */
  const aspect = POSTER_W / POSTER_H;
  const isPortrait = aspect < 0.8;
  const isSquare = aspect >= 0.8 && aspect < 1.15;
  const isWide = aspect >= 1.5;

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
    return out;
  }, [cityEntries]);

  const transitCities = useMemo(
    () => cityEntries.slice(0, 10).map((c) => ({ name: c.name, count: c.count })),
    [cityEntries],
  );

  const footerLine1 = topCity
    ? `从收藏夹出发，${topCity.name}是你最常标记的城市。`
    : "从收藏夹出发，探索你的旅行足迹。";

  /* ── Layout-adaptive values ── */
  const posterPad = isPortrait ? 44 : 40;
  const serifFont = '"Noto Serif SC", "Noto Serif CJK SC", "Source Han Serif SC", "Songti SC", serif';
  const titleSize = isPortrait ? 64 : isSquare ? 56 : isWide ? 80 : 72;
  const journeySize = isPortrait ? 20 : isSquare ? 18 : isWide ? 24 : 22;
  const sideColW = isPortrait ? 180 : isSquare ? 140 : isWide ? 220 : 180;
  const footerFs = isPortrait ? 22 : isSquare ? 20 : 24;
  const footerNumFs = isPortrait ? 26 : isSquare ? 24 : 28;

  /* ── Horizontal-layout values (1:1 / 4:3 / 16:9) ── */
  const leftW = isSquare ? "36%" : isWide ? "28%" : "32%";
  const rightW = isSquare ? "64%" : isWide ? "72%" : "68%";
  const titleMt = isSquare ? 56 : isWide ? 96 : 80;
  const journeyMt = isSquare ? 32 : isWide ? 56 : 48;
  const footerTextW = isSquare ? "48%" : isWide ? "38%" : "45%";
  const footerMapW = isSquare ? "52%" : isWide ? "62%" : "55%";

  /* ── Shared sub-elements ── */
  const titleContent = topCity ? (
    <>
      {topCity.name.slice(0, 2)}，
      <br />
      {topCity.name.length > 2 ? topCity.name.slice(2) + "。" : "印记。"}
    </>
  ) : (
    <>
      出发，
      <br />
      去远方。
    </>
  );

  const brandEl = (
    <div className="space-y-1 shrink-0">
      <div
        className="font-bold text-gray-800"
        style={{ fontSize: 11, letterSpacing: "0.2em" }}
      >
        在路上，发现远方。
      </div>
      <div
        className="font-bold flex items-center gap-2"
        style={{ fontSize: 15, letterSpacing: "0.15em" }}
      >
        <div
          style={{
            width: 0,
            height: 0,
            borderTop: "5px solid transparent",
            borderLeft: "8px solid black",
            borderBottom: "5px solid transparent",
          }}
        />
        DISCOVER
      </div>
    </div>
  );

  const brandingMark = (
    <div className="flex flex-col items-center justify-end pb-2 shrink-0">
      <div className="font-bold font-sans tracking-tighter" style={{ fontSize: 30 }}>
        觅途
      </div>
      <div className="tracking-widest mt-1" style={{ fontSize: 8 }}>
        METOO
      </div>
    </div>
  );

  return (
    <div
      ref={containerRef}
      className="absolute inset-0 flex items-center justify-center overflow-hidden pointer-events-none"
    >
      <div style={{ transform: `scale(${fitScale})`, transformOrigin: "center" }}>
        <div
          data-poster-export
          className="bg-white relative flex flex-col"
          style={{
            width: POSTER_W,
            height: POSTER_H,
            padding: posterPad,
            fontFamily: serifFont,
            boxShadow: "0 25px 50px -12px rgba(0,0,0,0.25), 0 8px 20px -8px rgba(0,0,0,0.1)",
          }}
        >
          {isPortrait ? (
            /* ── Portrait layout (3:4) ──
               Vertical stack: brand → hero images → title → footer/transit
               Images dominant (~31%), title centered in remaining space,
               transit map + stats anchored at bottom */
            <>
              {brandEl}

              {/* Cover images — hero + 3 side photos */}
              <div className="flex gap-2.5 mt-6 shrink-0" style={{ height: 440 }}>
                {heroCovers.length > 0 && (
                  <div className="flex-1 min-w-0 relative rounded-2xl overflow-hidden bg-gray-200">
                    <div
                      className="absolute inset-0 bg-cover bg-center"
                      style={{ backgroundImage: `url(${heroCovers[0].src})` }}
                    />
                    <div
                      className="absolute bottom-0 left-0 right-0 px-4 pb-3 pt-8"
                      style={{ background: "linear-gradient(transparent, rgba(0,0,0,0.5))" }}
                    >
                      <span
                        className="text-white font-bold font-sans"
                        style={{ fontSize: 13, letterSpacing: "0.1em" }}
                      >
                        {heroCovers[0].city}
                      </span>
                    </div>
                  </div>
                )}
                {heroCovers.length > 1 && (
                  <div className="flex flex-col gap-2.5" style={{ width: sideColW }}>
                    {heroCovers.slice(1, 4).map((item, i) => (
                      <div
                        key={i}
                        className="flex-1 min-h-0 relative rounded-xl overflow-hidden bg-gray-200"
                      >
                        <div
                          className="absolute inset-0 bg-cover bg-center"
                          style={{ backgroundImage: `url(${item.src})` }}
                        />
                        <div
                          className="absolute bottom-0 left-0 right-0 px-2.5 pb-1.5 pt-5"
                          style={{ background: "linear-gradient(transparent, rgba(0,0,0,0.45))" }}
                        >
                          <span
                            className="text-white font-bold font-sans"
                            style={{ fontSize: 9, letterSpacing: "0.05em" }}
                          >
                            {item.city}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Title — flex-1 centers content vertically with breathing room */}
              <div className="flex-1 flex flex-col justify-center min-h-0">
                <h1
                  className="font-medium text-gray-900 whitespace-nowrap"
                  style={{ fontSize: titleSize, lineHeight: 1.2, letterSpacing: "0.15em" }}
                >
                  {titleContent}
                </h1>
                <div className="flex items-center gap-6 mt-8">
                  <div className="h-[1px] w-16 bg-gray-400" />
                  <span
                    className="text-gray-800 font-sans uppercase"
                    style={{ fontSize: journeySize, letterSpacing: "0.35em" }}
                  >
                    JOURNEY.
                  </span>
                </div>
              </div>

              {/* Footer: stats text stacked above transit map + branding */}
              <div className="shrink-0">
                <div
                  className="text-gray-900"
                  style={{ fontSize: footerFs, lineHeight: 1.6, letterSpacing: "0.1em" }}
                >
                  <p>{footerLine1}</p>
                  <p>
                    <span className="font-bold font-sans mx-1" style={{ fontSize: footerNumFs }}>
                      {totalItems}
                    </span>
                    个收藏 ·
                    <span className="font-bold font-sans mx-1" style={{ fontSize: footerNumFs }}>
                      {totalCities}
                    </span>
                    座城市
                  </p>
                </div>
                <div className="flex items-end justify-end gap-6 mt-5">
                  <TransitMap cities={transitCities} />
                  {brandingMark}
                </div>
              </div>
            </>
          ) : (
            /* ── Horizontal layouts (1:1 / 4:3 / 16:9) ──
               Left text column + right cover grid on top,
               footer text + transit map at bottom.
               Proportions scale by aspect ratio. */
            <>
              {/* Top: text + image */}
              <div className="flex-1 flex min-h-0">
                {/* Left text column */}
                <div className="flex flex-col justify-between pr-8 py-2" style={{ width: leftW }}>
                  {brandEl}

                  {/* Main title */}
                  <div style={{ marginTop: titleMt }} className="mb-auto">
                    <h1
                      className="font-medium text-gray-900 whitespace-nowrap"
                      style={{ fontSize: titleSize, lineHeight: 1.2, letterSpacing: "0.15em" }}
                    >
                      {titleContent}
                    </h1>
                    <div className="flex items-center gap-6" style={{ marginTop: journeyMt }}>
                      <div className="h-[1px] w-16 bg-gray-400" />
                      <span
                        className="text-gray-800 font-sans uppercase"
                        style={{ fontSize: journeySize, letterSpacing: "0.35em" }}
                      >
                        JOURNEY.
                      </span>
                    </div>
                  </div>

                  {/* Spacer — keep left column bottom breathing */}
                  <div className="mt-auto mb-8" />
                </div>

                {/* Right cover grid */}
                <div className="h-full flex gap-2.5" style={{ width: rightW }}>
                  {/* Main large cover */}
                  {heroCovers.length > 0 && (
                    <div className="flex-1 min-w-0 relative rounded-2xl overflow-hidden bg-gray-200">
                      <div
                        className="absolute inset-0 bg-cover bg-center"
                        style={{ backgroundImage: `url(${heroCovers[0].src})` }}
                      />
                      <div
                        className="absolute bottom-0 left-0 right-0 px-4 pb-3 pt-8"
                        style={{
                          background: "linear-gradient(transparent, rgba(0,0,0,0.5))",
                        }}
                      >
                        <span
                          className="text-white font-bold font-sans"
                          style={{ fontSize: 13, letterSpacing: "0.1em" }}
                        >
                          {heroCovers[0].city}
                        </span>
                      </div>
                    </div>
                  )}
                  {/* Side column: stacked smaller covers */}
                  {heroCovers.length > 1 && (
                    <div className="flex flex-col gap-2.5" style={{ width: sideColW }}>
                      {heroCovers.slice(1, 5).map((item, i) => (
                        <div
                          key={i}
                          className="flex-1 min-h-0 relative rounded-xl overflow-hidden bg-gray-200"
                        >
                          <div
                            className="absolute inset-0 bg-cover bg-center"
                            style={{ backgroundImage: `url(${item.src})` }}
                          />
                          <div
                            className="absolute bottom-0 left-0 right-0 px-2.5 pb-1.5 pt-5"
                            style={{
                              background: "linear-gradient(transparent, rgba(0,0,0,0.45))",
                            }}
                          >
                            <span
                              className="text-white font-bold font-sans"
                              style={{ fontSize: 9, letterSpacing: "0.05em" }}
                            >
                              {item.city}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* ── Bottom: footer text + transit map ── */}
              <div className="flex items-end justify-between pt-8 pb-4" style={{ height: 180 }}>
                <div
                  className="text-gray-900 pb-2"
                  style={{ width: footerTextW, fontSize: footerFs, lineHeight: 1.6, letterSpacing: "0.1em" }}
                >
                  <p>{footerLine1}</p>
                  <p>
                    <span className="font-bold font-sans mx-1" style={{ fontSize: footerNumFs }}>
                      {totalItems}
                    </span>
                    个收藏 ·
                    <span className="font-bold font-sans mx-1" style={{ fontSize: footerNumFs }}>
                      {totalCities}
                    </span>
                    座城市
                  </p>
                </div>

                <div className="flex items-end justify-end gap-6 relative" style={{ width: footerMapW }}>
                  <TransitMap cities={transitCities} />
                  {brandingMark}
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default DiscoverWestPoster;
