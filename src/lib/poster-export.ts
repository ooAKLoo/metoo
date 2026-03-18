import { domToBlob } from "modern-screenshot";
import { invoke } from "@tauri-apps/api/core";

export async function exportPoster(element: HTMLElement, scale = 3): Promise<Blob> {
  // Snapshot <canvas> elements (ECharts etc.) as static <img>
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
    // Use offsetWidth/offsetHeight (layout size, unaffected by parent transforms)
    // to override modern-screenshot's getBoundingClientRect which includes
    // the parent's scale(fitScale) and returns a smaller viewport.
    const blob = await domToBlob(element, {
      scale,
      width: element.offsetWidth,
      height: element.offsetHeight,
      debug: true,
      filter: (node: Node) => {
        if (node instanceof HTMLElement && node.dataset.devPanel) return false;
        return true;
      },
    });
    return blob;
  } finally {
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
