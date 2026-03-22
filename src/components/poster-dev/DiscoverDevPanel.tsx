import { useState } from "react";
import { useMapStore } from "../../stores/useMapStore";
import { DISCOVER_RATIO_LAYOUTS } from "../poster-modules/DiscoverWestPoster";
import { DevSlider } from "./DevSlider";

/* ── Config type (shared with DiscoverWestPoster + store) ── */

export interface DiscoverLayoutConfig {
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
}

/* ── Self-contained dev panel ── */

export function DiscoverDevPanel() {
  const discoverConfigs = useMapStore((s) => s.discoverConfigs);
  const setDiscoverConfig = useMapStore((s) => s.setDiscoverConfig);
  const posterRatios = useMapStore((s) => s.posterRatios);
  const activePosterModule = useMapStore((s) => s.activePosterModule);

  const [open, setOpen] = useState(false);

  const ratio = activePosterModule ? (posterRatios[activePosterModule] ?? "4:3") : "4:3";
  const baseConfig = DISCOVER_RATIO_LAYOUTS[ratio];
  const storeOverride = discoverConfigs[ratio] ?? {};
  const config = { ...baseConfig, ...storeOverride };

  const set = <K extends keyof DiscoverLayoutConfig>(k: K, v: DiscoverLayoutConfig[K]) =>
    setDiscoverConfig(ratio, { ...storeOverride, [k]: v });

  return (
    <div data-dev-panel>
      <button
        onClick={() => setOpen(!open)}
        className="w-full py-1.5 text-[10px] font-medium text-neutral-500 hover:text-neutral-700
                   bg-white/80 backdrop-blur rounded-lg transition-colors"
      >
        {open ? "收起调参面板 ▴" : `调参面板 · 发现远方 ▾`}
      </button>

      {open && (
        <div className="mt-1 bg-black/80 backdrop-blur-md rounded-lg p-3 space-y-1.5">
          <p className="text-[9px] text-neutral-500 uppercase tracking-widest mb-2">Layout</p>
          <DevSlider labelWidth="w-20" label="边距" value={config.posterPad} min={20} max={80} step={2} onChange={(v) => set("posterPad", v)} />
          <DevSlider labelWidth="w-20" label="左栏比例" value={config.leftFrac} min={0.15} max={0.55} step={0.01} onChange={(v) => set("leftFrac", v)} />

          <hr className="border-white/10 !my-2" />
          <p className="text-[9px] text-neutral-500 uppercase tracking-widest mb-2">Title</p>
          <DevSlider labelWidth="w-20" label="标题字号" value={config.titleSize} min={32} max={120} step={2} onChange={(v) => set("titleSize", v)} />
          <DevSlider labelWidth="w-20" label="标题上距" value={config.titleMt} min={20} max={200} step={4} onChange={(v) => set("titleMt", v)} />
          <DevSlider labelWidth="w-20" label="JOURNEY 字号" value={config.journeySize} min={10} max={40} step={1} onChange={(v) => set("journeySize", v)} />
          <DevSlider labelWidth="w-20" label="JOURNEY 间距" value={config.journeyMt} min={10} max={120} step={4} onChange={(v) => set("journeyMt", v)} />

          <hr className="border-white/10 !my-2" />
          <p className="text-[9px] text-neutral-500 uppercase tracking-widest mb-2">Footer</p>
          <DevSlider labelWidth="w-20" label="底部高度" value={config.footerH} min={80} max={360} step={10} onChange={(v) => set("footerH", v)} />
          <DevSlider labelWidth="w-20" label="底部文字比" value={config.footerTextFrac} min={0.2} max={0.7} step={0.01} onChange={(v) => set("footerTextFrac", v)} />
          <DevSlider labelWidth="w-20" label="文字字号" value={config.footerFs} min={12} max={40} step={1} onChange={(v) => set("footerFs", v)} />
          <DevSlider labelWidth="w-20" label="数字字号" value={config.footerNumFs} min={14} max={48} step={1} onChange={(v) => set("footerNumFs", v)} />
          <DevSlider labelWidth="w-20" label="文字左右偏移" value={config.footerTextOffsetX} min={-200} max={200} step={2} onChange={(v) => set("footerTextOffsetX", v)} />
          <DevSlider labelWidth="w-20" label="文字上下偏移" value={config.footerTextOffsetY} min={-200} max={200} step={2} onChange={(v) => set("footerTextOffsetY", v)} />

          <hr className="border-white/10 !my-2" />
          <p className="text-[9px] text-neutral-500 uppercase tracking-widest mb-2">Cover & Map</p>
          <DevSlider labelWidth="w-20" label="侧栏宽" value={config.sideColW} min={80} max={300} step={10} onChange={(v) => set("sideColW", v)} />
          <DevSlider labelWidth="w-20" label="路线图上下" value={config.transitMapOffsetY} min={-200} max={200} step={2} onChange={(v) => set("transitMapOffsetY", v)} />
          <DevSlider labelWidth="w-20" label="路线图缩放" value={config.transitMapScale} min={0.5} max={2.5} step={0.05} onChange={(v) => set("transitMapScale", v)} />

          <button
            onClick={() => {
              const payload = { module: "discover", ratio, config };
              const json = JSON.stringify(payload, null, 2);
              console.log(`DiscoverWest config [${ratio}]:`, json);
              navigator.clipboard.writeText(json);
            }}
            className="w-full mt-2 py-1 text-[10px] bg-white/10 hover:bg-white/20 rounded text-white"
          >
            Copy Config (发现·远方 · {ratio})
          </button>
        </div>
      )}
    </div>
  );
}
