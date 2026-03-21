/**
 * DEV ONLY — CountryMap 视口校正面板
 *
 * 直接拖拽/缩放地图到合适位置，点"捕获当前视口"保存。
 * 复制配置后粘贴到 country-view-overrides.ts。
 */
import { useState } from "react";

interface VB { x: number; y: number; w: number; h: number }

export function CountryMapDevPanel({
  countryName,
  getViewBox,
  baseW,
  baseH,
}: {
  countryName: string;
  getViewBox: () => VB;
  baseW: number;
  baseH: number;
}) {
  const [open, setOpen] = useState(false);
  const [captured, setCaptured] = useState<{ cx: number; cy: number; zoom: number } | null>(null);
  const [copied, setCopied] = useState(false);

  const handleCapture = () => {
    const vb = getViewBox();
    const zoom = +(baseW / vb.w).toFixed(2);
    const cx = +((vb.x + vb.w / 2) / baseW).toFixed(4);
    const cy = +((vb.y + vb.h / 2) / baseH).toFixed(4);
    setCaptured({ cx, cy, zoom });
    setCopied(false);
  };

  const handleCopy = () => {
    if (!captured) return;
    const text = `  ${countryName}: { cx: ${captured.cx}, cy: ${captured.cy}, zoom: ${captured.zoom} },`;
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <div className="absolute top-3 right-[52px] z-50 w-[200px]" data-dev-panel>
      <button
        onClick={() => setOpen(!open)}
        className="w-full py-1.5 text-[10px] font-medium text-neutral-500 hover:text-neutral-700
                   bg-white/80 backdrop-blur rounded-lg transition-colors cursor-pointer"
      >
        {open ? "收起视口校正 ▴" : `视口校正 ▾`}
      </button>

      {open && (
        <div className="mt-1 bg-black/80 backdrop-blur-md rounded-lg p-3 space-y-2">
          <p className="text-[9px] text-neutral-500 leading-relaxed">
            拖拽 / 缩放地图到满意的位置，然后点击捕获。
          </p>

          <button
            onClick={handleCapture}
            className="w-full py-1.5 text-[10px] font-medium rounded
                       bg-white/15 text-neutral-200 hover:bg-white/25
                       transition-colors cursor-pointer"
          >
            捕获当前视口
          </button>

          {captured && (
            <div className="space-y-1.5">
              <div className="bg-white/10 rounded px-2 py-1.5 font-mono text-[9px] text-neutral-300 break-all select-all">
                {countryName}: &#123; cx: {captured.cx}, cy: {captured.cy}, zoom: {captured.zoom} &#125;
              </div>
              <button
                onClick={handleCopy}
                className="w-full py-1 text-[9px] font-medium rounded
                           bg-white/10 text-neutral-300 hover:bg-white/20
                           transition-colors cursor-pointer"
              >
                {copied ? "已复制 ✓" : "复制配置"}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
