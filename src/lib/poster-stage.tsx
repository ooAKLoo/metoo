import { useRef, useState, useEffect, useCallback } from "react";
import { Stage, Layer } from "react-konva";
import type Konva from "konva";
import { invoke } from "@tauri-apps/api/core";

/**
 * Global ref — Canvas-based poster modules register their Stage here.
 * RightPanel reads this for export.
 */
export const posterStageRef: { current: Konva.Stage | null } = { current: null };

interface Props {
  width: number;
  height: number;
  children: React.ReactNode;
  /**
   * Transparent overlay mode (e.g. MujiPoster).
   * - Fills container 100% without padding
   * - No card shadow / border-radius
   * - High z-index to stay above DOM layers (MapView)
   */
  transparent?: boolean;
}

/**
 * Shared shell for all Canvas-based poster modules.
 *
 * - Measures its container and CSS-scales the Stage to fit.
 * - Registers the Stage ref globally so the export function can find it.
 * - Eliminates the per-module ResizeObserver boilerplate.
 */
export function KonvaPosterStage({ width, height, children, transparent }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<Konva.Stage>(null);
  const [scale, setScale] = useState(1);

  const measure = useCallback(() => {
    const el = containerRef.current;
    if (!el) return;
    const pad = transparent ? 0 : 48;
    setScale(
      Math.min(
        (el.clientWidth - pad) / width,
        (el.clientHeight - pad) / height,
        1,
      ),
    );
  }, [width, height, transparent]);

  useEffect(() => {
    measure();
    const ro = new ResizeObserver(measure);
    if (containerRef.current) ro.observe(containerRef.current);
    return () => ro.disconnect();
  }, [measure]);

  // Register / unregister stage ref globally
  useEffect(() => {
    posterStageRef.current = stageRef.current;
    return () => {
      if (posterStageRef.current === stageRef.current)
        posterStageRef.current = null;
    };
  });

  // Force redraw when CJK fonts finish loading (Canvas doesn't auto-redraw)
  useEffect(() => {
    let cancelled = false;
    document.fonts.ready.then(() => {
      if (!cancelled && stageRef.current) stageRef.current.batchDraw();
    });
    return () => { cancelled = true; };
  }, []);

  return (
    <div
      ref={containerRef}
      data-poster-root
      className="absolute inset-0 flex items-center justify-center overflow-hidden pointer-events-none"
      style={transparent ? { zIndex: 10 } : undefined}
    >
      <div
        style={{
          transform: `scale(${scale})`,
          transformOrigin: "center",
          ...(transparent
            ? {}
            : {
                borderRadius: 24,
                boxShadow:
                  "0 4px 24px rgba(0,0,0,0.08), 0 1px 4px rgba(0,0,0,0.04)",
              }),
        }}
      >
        <Stage ref={stageRef} width={width} height={height}>
          <Layer>{children}</Layer>
        </Stage>
      </div>
    </div>
  );
}

/** Generate a standardised poster filename with timestamp down to seconds. */
export function posterFilename(name: string): string {
  const d = new Date();
  const ts = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, "0")}${String(d.getDate()).padStart(2, "0")}_${String(d.getHours()).padStart(2, "0")}${String(d.getMinutes()).padStart(2, "0")}${String(d.getSeconds()).padStart(2, "0")}`;
  return `觅途-${name}-${ts}.png`;
}

/** Export a Konva Stage to PNG and save via Tauri. */
export async function saveKonvaPosterToDownloads(
  stage: Konva.Stage,
  name: string,
) {
  const filename = posterFilename(name);

  // Try Konva native export first (fast, high-quality)
  try {
    const dataURL = stage.toDataURL({ pixelRatio: 3 });
    const res = await fetch(dataURL);
    const buf = await (await res.blob()).arrayBuffer();
    const data = Array.from(new Uint8Array(buf));
    await invoke("save_image_to_downloads", { data, filename });
    return;
  } catch {
    // Tainted canvas — fall through to html2canvas
  }

  // Fallback: capture the stage's container DOM via html2canvas
  const container = stage.container()?.closest?.("[data-poster-root]") as HTMLElement | null;
  if (!container) throw new Error("Poster container not found for fallback export");

  const html2canvas = (await import("html2canvas")).default;
  const canvas = await html2canvas(container, {
    scale: 3,
    useCORS: true,
    allowTaint: false,
    backgroundColor: null,
    logging: false,
  });
  const blob = await new Promise<Blob>((res) => canvas.toBlob((b) => res(b!), "image/png"));
  const buf = await blob.arrayBuffer();
  const data = Array.from(new Uint8Array(buf));
  await invoke("save_image_to_downloads", { data, filename });
}
