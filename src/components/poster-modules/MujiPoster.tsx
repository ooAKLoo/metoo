import type { PosterModuleProps } from "../../lib/poster-modules";
import type { MujiPosterConfig } from "./MujiPosterDevPanel";
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

const SUB_LABELS = [
  { text: "無印良品", dy: 0 },
  { text: "生活里",   dy: 2 },
  { text: "下一程",   dy: 4 },
  { text: "家",       dy: 6 },
  { text: "春夏秋冬", dy: 0 },
  { text: "相聚时",   dy: 3 },
  { text: "独处时",   dy: 5 },
  { text: "卧室",     dy: 7 },
  { text: "厨房",     dy: 7 },
  { text: "山川",     dy: 7 },
];

const LIGHT_SPOTS = [
  { w: "80%", h: "60%", top: "-10%", left: "-20%", blur: 80, op: 0.8 },
  { w: "50%", h: "50%", top: "10%",  left: "40%",  blur: 60, op: 0.6 },
  { w: "60%", h: "70%", top: "50%",  left: "-10%", blur: 90, op: 0.7 },
  { w: "70%", h: "60%", top: "60%",  left: "50%",  blur: 70, op: 0.5 },
  { w: "40%", h: "40%", top: "30%",  left: "70%",  blur: 50, op: 0.4 },
];

function MujiPoster({ posterWidth, posterHeight }: PosterModuleProps) {
    const storeConfig = useMapStore((s) => s.mujiConfig);
    const c = posterWidth / posterHeight >= 1.5 ? WIDESCREEN_CONFIG : storeConfig;

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
          {/* "再见，在" */}
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
            再见，在
          </div>

          {/* "见。" */}
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
            见。
          </div>

          {/* Sub-texts — equal spacing */}
          {SUB_LABELS.map(({ text, dy }, i) => {
            const count = SUB_LABELS.length;
            const rightPct = c.subStartX - (c.subStartX - c.subEndX) * (i / (count - 1)) + c.subOffsetX;
            const topPct = c.subBaseY + dy * c.subWaveAmp + c.subOffsetY;
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
                  top: `${topPct}%`,
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
