import { domToBlob } from "modern-screenshot";
import { invoke } from "@tauri-apps/api/core";

/* ── 3D transform helpers ─────────────────────────────────────────────
 * modern-screenshot clones the DOM into an SVG foreignObject where the
 * 3D rendering context (perspective, transform-origin) differs from the
 * original page.  Named 3D functions like perspective(), rotateX(), etc.
 * are NOT reliably reproduced.
 *
 * Fix: read the browser's pre-computed matrix3d, bake the transform-origin
 * into it (T · M · T⁻¹), then set transform-origin to 0 0.  The result is
 * a single self-contained matrix3d that renders identically in any context.
 * ─────────────────────────────────────────────────────────────────────── */

const HAS_3D = /perspective|rotateX|rotateY|rotateZ|rotate3d|translateZ|translate3d/i;

function parseCSSMatrix(s: string): number[] | null {
  const m3 = s.match(/matrix3d\((.+)\)/);
  if (m3) return m3[1].split(",").map(Number);
  const m2 = s.match(/matrix\((.+)\)/);
  if (m2) {
    const v = m2[1].split(",").map(Number);
    // Promote 2D matrix(a,b,c,d,e,f) → column-major 4×4
    return [v[0],v[1],0,0, v[2],v[3],0,0, 0,0,1,0, v[4],v[5],0,1];
  }
  return null;
}

/** Column-major 4×4 multiply */
function mul4(a: number[], b: number[]): number[] {
  const r = new Array(16).fill(0);
  for (let c = 0; c < 4; c++)
    for (let i = 0; i < 4; i++)
      for (let k = 0; k < 4; k++)
        r[c * 4 + i] += a[k * 4 + i] * b[c * 4 + k];
  return r;
}

/**
 * Flatten all 3D CSS transforms inside `root` to baked matrix3d values.
 * Returns a list of swaps to restore later.
 */
function flatten3dTransforms(root: HTMLElement) {
  const swaps: { el: HTMLElement; t: string; o: string }[] = [];
  root.querySelectorAll("*").forEach((node) => {
    const el = node as HTMLElement;
    const t = el.style.transform;
    if (!t || !HAS_3D.test(t)) return;
    const cs = window.getComputedStyle(el);
    const mat = parseCSSMatrix(cs.transform);
    if (!mat) return;
    // Parse transform-origin (e.g. "460px 240px")
    const op = cs.transformOrigin.split(/\s+/).map(parseFloat);
    const ox = op[0] || 0, oy = op[1] || 0;
    // Bake origin into the matrix: translate(origin) · M · translate(-origin)
    const T  = [1,0,0,0, 0,1,0,0, 0,0,1,0,  ox, oy,0,1];
    const Ti = [1,0,0,0, 0,1,0,0, 0,0,1,0, -ox,-oy,0,1];
    const baked = mul4(mul4(T, mat), Ti);
    swaps.push({ el, t, o: el.style.transformOrigin });
    el.style.transform = `matrix3d(${baked.join(",")})`;
    el.style.transformOrigin = "0px 0px";
  });
  return swaps;
}

function restore3dTransforms(swaps: { el: HTMLElement; t: string; o: string }[]) {
  for (const { el, t, o } of swaps) {
    el.style.transform = t;
    el.style.transformOrigin = o;
  }
}

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

  // Strip box-shadow from rounded-full elements to avoid modern-screenshot
  // rendering bug (box-shadow + border-radius: 50% → gray semicircle artifact)
  const shadowSwaps: { el: HTMLElement; original: string }[] = [];
  element.querySelectorAll(".rounded-full").forEach((node) => {
    const el = node as HTMLElement;
    const computed = window.getComputedStyle(el);
    if (computed.boxShadow && computed.boxShadow !== "none") {
      shadowSwaps.push({ el, original: el.style.boxShadow });
      el.style.boxShadow = "none";
    }
  });

  // Remove crossOrigin to prevent CORS-tainted image rendering artifacts
  const crossOriginSwaps: { img: HTMLImageElement; original: string | null }[] = [];
  element.querySelectorAll("img[crossorigin]").forEach((node) => {
    const img = node as HTMLImageElement;
    crossOriginSwaps.push({ img, original: img.getAttribute("crossorigin") });
    img.removeAttribute("crossorigin");
  });

  // Disable transitions to prevent capturing mid-transition states
  const transitionSwaps: { el: HTMLElement; original: string }[] = [];
  element.querySelectorAll('[class*="transition"]').forEach((node) => {
    const el = node as HTMLElement;
    transitionSwaps.push({ el, original: el.style.transition });
    el.style.transition = "none";
  });
  // Also handle inline transitions on the root element
  if (element.style.transition) {
    transitionSwaps.push({ el: element, original: element.style.transition });
    element.style.transition = "none";
  }

  // Hide data-no-export elements directly (filter callback may not work
  // reliably when modern-screenshot clones the DOM)
  const noExportSwaps: { el: HTMLElement; original: string }[] = [];
  element.querySelectorAll("[data-no-export]").forEach((node) => {
    const el = node as HTMLElement;
    noExportSwaps.push({ el, original: el.style.display });
    el.style.display = "none";
  });

  // Flatten 3D CSS transforms to baked matrix3d (see top-of-file comment)
  const transform3dSwaps = flatten3dTransforms(element);

  try {
    const blob = await domToBlob(element, {
      scale,
      width: element.offsetWidth,
      height: element.offsetHeight,
      debug: true,
      filter: (node: Node) => {
        if (node instanceof HTMLElement) {
          if (node.dataset.devPanel) return false;
          if (node.dataset.noExport !== undefined) return false;
        }
        return true;
      },
    });
    return blob;
  } finally {
    swaps.forEach(({ canvas, img }) => {
      canvas.style.display = "";
      img.remove();
    });
    shadowSwaps.forEach(({ el, original }) => {
      el.style.boxShadow = original;
    });
    crossOriginSwaps.forEach(({ img, original }) => {
      if (original !== null) img.setAttribute("crossorigin", original);
    });
    transitionSwaps.forEach(({ el, original }) => {
      el.style.transition = original;
    });
    noExportSwaps.forEach(({ el, original }) => {
      el.style.display = original;
    });
    restore3dTransforms(transform3dSwaps);
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
