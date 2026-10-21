/** 步进器（React 版新增件，沿用 v3 语汇：墨黑切角 −/+ 键 + 纸白数值牌；样式在 kit.css「P5Stepper」段）。 */
export function P5Stepper({ value, onChange, min = 0, max = 99, step = 1, unit, label }: { value: number; onChange: (v: number) => void; min?: number; max?: number; step?: number; unit?: string; label?: string }) {
  const set = (v: number) => onChange(Math.max(min, Math.min(max, +v.toFixed(4))));
  return (
    <span className="p5-stp" role="group" aria-label={label}>
      <button type="button" aria-label="减少" disabled={value <= min} onClick={() => set(value - step)}>−</button>
      <output>{value}{unit && <small>{unit}</small>}</output>
      <button type="button" aria-label="增加" disabled={value >= max} onClick={() => set(value + step)}>＋</button>
    </span>
  );
}
