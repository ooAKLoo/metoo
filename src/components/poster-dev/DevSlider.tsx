export function DevSlider({ label, value, min, max, step, onChange, labelWidth = "w-16" }: {
  label: string; value: number; min: number; max: number; step: number;
  onChange: (v: number) => void;
  labelWidth?: string;
}) {
  return (
    <label className="flex items-center gap-1.5 text-[10px] text-neutral-300">
      <span className={`${labelWidth} shrink-0 text-right`}>{label}</span>
      <input
        type="range" min={min} max={max} step={step} value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="flex-1 accent-white h-1"
      />
      <span className="w-10 text-neutral-400 tabular-nums">{value}</span>
    </label>
  );
}
