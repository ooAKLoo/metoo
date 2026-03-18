import { useRef, useState, useEffect, useCallback } from "react";
import type { PosterModuleProps } from "../../lib/poster-modules";

const W = 1100;
const H = 800;
const CELL = 54;
const GAP = 6;
const COLS = 15;
const ROWS = 10;
const SW = 1.2;
const STROKE = "#333";

function GridBlankPoster(_props: PosterModuleProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [s, setS] = useState(1);

  const measure = useCallback(() => {
    const el = ref.current;
    if (!el) return;
    const p = 48;
    setS(Math.min((el.clientWidth - p) / W, (el.clientHeight - p) / H, 1));
  }, []);

  useEffect(() => {
    measure();
    const ro = new ResizeObserver(measure);
    if (ref.current) ro.observe(ref.current);
    return () => ro.disconnect();
  }, [measure]);

  const gridW = COLS * CELL + (COLS - 1) * GAP;
  const gridH = ROWS * CELL + (ROWS - 1) * GAP;
  const ox = (W - gridW) / 2;
  const oy = (H - gridH) / 2;

  return (
    <div
      ref={ref}
      className="absolute inset-0 flex items-center justify-center overflow-hidden pointer-events-none"
    >
      <div style={{ transform: `scale(${s})`, transformOrigin: "center" }}>
        <div
          data-poster-export
          style={{
            width: W,
            height: H,
            backgroundColor: "#FFFFFF",
            borderRadius: 24,
            boxShadow: "0 4px 24px rgba(0,0,0,0.08), 0 1px 4px rgba(0,0,0,0.04)",
            overflow: "hidden",
          }}
        >
          <svg width="100%" height="100%" viewBox={`0 0 ${W} ${H}`}>
            {Array.from({ length: ROWS }, (_, row) =>
              Array.from({ length: COLS }, (_, col) => (
                <rect
                  key={`${row}-${col}`}
                  x={ox + col * (CELL + GAP)}
                  y={oy + row * (CELL + GAP)}
                  width={CELL}
                  height={CELL}
                  fill="none"
                  stroke={STROKE}
                  strokeWidth={SW}
                />
              )),
            )}
          </svg>
        </div>
      </div>
    </div>
  );
}

export default GridBlankPoster;
