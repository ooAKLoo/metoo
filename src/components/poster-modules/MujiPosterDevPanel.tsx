/**
 * DEV ONLY — 海报参数调试面板
 * 使用: 在 MujiPoster 旁引入 <MujiPosterDevPanel config={config} onChange={setConfig} />
 * 完成调试后删除此文件即可
 */
import { useState } from "react";

export interface MujiPosterConfig {
  mainSize: number;
  mainSpacing: number;
  mainWeight: number;
  mainStroke: number;
  topPos: number;
  bottomPos: number;
  subSize: number;
  subSpacing: number;
  subWeight: number;
  subStroke: number;
  subOpacity: number;
  subOffsetX: number;
  subOffsetY: number;
  subStartX: number;
  subEndX: number;
  subBaseY: number;
  subWaveAmp: number;
  lightOpacity: number;
}

export const DEFAULT_CONFIG: MujiPosterConfig = {
  mainSize: 7,
  mainSpacing: 0.21,
  mainWeight: 900,
  mainStroke: 0,
  topPos: 10,
  bottomPos: 10,
  subSize: 4,
  subSpacing: 0.44,
  subWeight: 200,
  subStroke: 1.4,
  subOpacity: 0.98,
  subOffsetX: -3,
  subOffsetY: 2,
  subStartX: 88,
  subEndX: 12,
  subBaseY: 55,
  subWaveAmp: 1,
  lightOpacity: 0.8,
};

function S({ label, value, min, max, step, onChange }: {
  label: string; value: number; min: number; max: number; step: number;
  onChange: (v: number) => void;
}) {
  return (
    <label className="flex items-center gap-1.5 text-[10px] text-neutral-300">
      <span className="w-16 shrink-0 text-right">{label}</span>
      <input
        type="range" min={min} max={max} step={step} value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="flex-1 accent-white h-1"
      />
      <span className="w-10 text-neutral-400 tabular-nums">{value}</span>
    </label>
  );
}

export function MujiPosterDevPanel({
  config,
  onChange,
  templateLabel,
  ratioLabel,
}: {
  config: MujiPosterConfig;
  onChange: (c: MujiPosterConfig) => void;
  templateLabel?: string;
  ratioLabel?: string;
}) {
  const [open, setOpen] = useState(false);
  const set = <K extends keyof MujiPosterConfig>(k: K, v: MujiPosterConfig[K]) =>
    onChange({ ...config, [k]: v });

  return (
    <div data-dev-panel>
      <button
        onClick={() => setOpen(!open)}
        className="w-full py-1.5 text-[10px] font-medium text-neutral-500 hover:text-neutral-700
                   bg-white/80 backdrop-blur rounded-lg transition-colors"
      >
        {open ? "收起调参面板 ▴" : "调参面板 ▾"}
      </button>

      {open && (
        <div className="mt-1 bg-black/80 backdrop-blur-md rounded-lg p-3 space-y-1.5">
          <p className="text-[9px] text-neutral-500 uppercase tracking-widest mb-2">Main Text</p>
          <S label="字号" value={config.mainSize} min={1} max={20} step={0.5} onChange={(v) => set("mainSize", v)} />
          <S label="字间距" value={config.mainSpacing} min={-0.2} max={1} step={0.01} onChange={(v) => set("mainSpacing", v)} />
          <S label="字重" value={config.mainWeight} min={100} max={900} step={100} onChange={(v) => set("mainWeight", v)} />
          <S label="加粗描边" value={config.mainStroke} min={0} max={8} step={0.1} onChange={(v) => set("mainStroke", v)} />
          <S label="上部 top%" value={config.topPos} min={0} max={80} step={1} onChange={(v) => set("topPos", v)} />
          <S label="下部 btm%" value={config.bottomPos} min={0} max={80} step={1} onChange={(v) => set("bottomPos", v)} />

          <hr className="border-white/10 !my-2" />
          <p className="text-[9px] text-neutral-500 uppercase tracking-widest mb-2">Sub Text</p>
          <S label="字号" value={config.subSize} min={0.5} max={12} step={0.1} onChange={(v) => set("subSize", v)} />
          <S label="字间距" value={config.subSpacing} min={-0.2} max={1.5} step={0.01} onChange={(v) => set("subSpacing", v)} />
          <S label="字重" value={config.subWeight} min={100} max={900} step={100} onChange={(v) => set("subWeight", v)} />
          <S label="加粗描边" value={config.subStroke} min={0} max={8} step={0.1} onChange={(v) => set("subStroke", v)} />
          <S label="透明度" value={config.subOpacity} min={0} max={1} step={0.02} onChange={(v) => set("subOpacity", v)} />
          <S label="左右偏移" value={config.subOffsetX} min={-50} max={50} step={1} onChange={(v) => set("subOffsetX", v)} />
          <S label="上下偏移" value={config.subOffsetY} min={-50} max={50} step={1} onChange={(v) => set("subOffsetY", v)} />
          <S label="起始 X" value={config.subStartX} min={0} max={100} step={1} onChange={(v) => set("subStartX", v)} />
          <S label="结束 X" value={config.subEndX} min={0} max={100} step={1} onChange={(v) => set("subEndX", v)} />
          <S label="基准 Y" value={config.subBaseY} min={0} max={100} step={1} onChange={(v) => set("subBaseY", v)} />
          <S label="波浪幅度" value={config.subWaveAmp} min={0} max={5} step={0.1} onChange={(v) => set("subWaveAmp", v)} />

          <hr className="border-white/10 !my-2" />
          <S label="光斑强度" value={config.lightOpacity} min={0} max={1} step={0.05} onChange={(v) => set("lightOpacity", v)} />

          <button
            onClick={() => {
              const label = templateLabel ?? "unknown";
              const size = ratioLabel ?? "unknown";
              const payload = { template: label, ratio: size, config };
              const json = JSON.stringify(payload, null, 2);
              console.log(`MujiPoster config [${label} @ ${size}]:`, json);
              navigator.clipboard.writeText(json);
            }}
            className="w-full mt-2 py-1 text-[10px] bg-white/10 hover:bg-white/20 rounded text-white"
          >
            Copy Config{templateLabel ? ` (${templateLabel}${ratioLabel ? ` · ${ratioLabel}` : ""})` : ""}
          </button>
        </div>
      )}
    </div>
  );
}
