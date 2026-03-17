import { toPng } from "html-to-image";
import { invoke } from "@tauri-apps/api/core";

export async function exportPoster(element: HTMLElement, scale = 3): Promise<Blob> {
  // html-to-image can't capture <canvas> (ECharts).
  // Workaround: temporarily replace each canvas with an <img> snapshot.
  const canvases = element.querySelectorAll("canvas");
  const swaps: { canvas: HTMLCanvasElement; img: HTMLImageElement }[] = [];

  canvases.forEach((canvas) => {
    try {
      const img = document.createElement("img");
      img.src = canvas.toDataURL("image/png");
      img.style.cssText = window.getComputedStyle(canvas).cssText;
      img.style.width = `${canvas.offsetWidth}px`;
      img.style.height = `${canvas.offsetHeight}px`;
      img.style.position = "absolute";
      img.style.inset = "0";
      canvas.parentNode?.insertBefore(img, canvas);
      canvas.style.display = "none";
      swaps.push({ canvas, img });
    } catch {
      // canvas tainted — skip
    }
  });

  try {
    const dataUrl = await toPng(element, {
      pixelRatio: scale,
      quality: 1.0,
      cacheBust: true,
      fontEmbedCSS: "",
      filter: (node: Node) => {
        // Keep our temp data-url images, skip all other <img> (remote covers etc.)
        if (node instanceof HTMLImageElement) {
          return node.src.startsWith("data:");
        }
        // Skip the dev control panel
        if (node instanceof HTMLElement && node.dataset.devPanel) {
          return false;
        }
        return true;
      },
    });
    const res = await fetch(dataUrl);
    return res.blob();
  } finally {
    // Restore original canvases
    swaps.forEach(({ canvas, img }) => {
      canvas.style.display = "";
      img.remove();
    });
  }
}

export async function savePosterToDownloads(element: HTMLElement, name: string) {
  const blob = await exportPoster(element);
  const arrayBuf = await blob.arrayBuffer();
  const data = Array.from(new Uint8Array(arrayBuf));
  const timestamp = new Date().toISOString().slice(0, 10);
  const filename = `觅途-${name}-${timestamp}.png`;
  await invoke("save_image_to_downloads", { data, filename });
}
