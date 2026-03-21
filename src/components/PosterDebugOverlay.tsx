import { useEffect, useState } from "react";
import { useMapStore } from "../stores/useMapStore";

const COLORS = [
  "#FF0000", "#FF8800", "#CCAA00", "#00AA44", "#0066FF", "#8833CC",
];

interface LayerRect {
  name: string;
  top: number;
  left: number;
  width: number;
  height: number;
  color: string;
}

/**
 * Zero-impact debug overlay.
 * Queries all [data-dbg] elements, reads their bounding rects,
 * and draws colored borders + labels in a single fixed-position layer.
 * Does NOT modify any existing DOM element styles or layout.
 */
export function PosterDebugOverlay() {
  const debug = useMapStore((s) => s.posterDebug);
  const [layers, setLayers] = useState<LayerRect[]>([]);

  useEffect(() => {
    if (!debug) {
      setLayers([]);
      return;
    }

    const scan = () => {
      const els = document.querySelectorAll<HTMLElement>("[data-dbg]");
      const result: LayerRect[] = [];
      els.forEach((el, i) => {
        const rect = el.getBoundingClientRect();
        if (rect.width === 0 && rect.height === 0) return;
        result.push({
          name: el.dataset.dbg || "",
          top: rect.top,
          left: rect.left,
          width: rect.width,
          height: rect.height,
          color: COLORS[i % COLORS.length],
        });
      });
      setLayers(result);
    };

    scan();
    // Re-scan on resize/animation
    const interval = setInterval(scan, 500);
    window.addEventListener("resize", scan);
    return () => {
      clearInterval(interval);
      window.removeEventListener("resize", scan);
    };
  }, [debug]);

  if (!debug || layers.length === 0) return null;

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 99999,
        pointerEvents: "none",
        overflow: "hidden",
      }}
    >
      {layers.map((l, i) => (
        <div key={`${l.name}-${i}`}>
          {/* Border */}
          <div
            style={{
              position: "absolute",
              top: l.top,
              left: l.left,
              width: l.width,
              height: l.height,
              border: `2px dashed ${l.color}`,
              boxSizing: "border-box",
            }}
          />
          {/* Label */}
          <span
            style={{
              position: "absolute",
              top: l.top + i * 18,
              left: l.left,
              background: l.color,
              color: "#fff",
              fontSize: 10,
              fontFamily: "ui-monospace, monospace",
              fontWeight: 700,
              padding: "1px 5px",
              lineHeight: "16px",
              whiteSpace: "nowrap",
            }}
          >
            L{i} {l.name}
          </span>
        </div>
      ))}
    </div>
  );
}
