/**
 * P4Slider —— 原生 range 换皮（键盘/读屏可用）：黑槽 + 黄填充 + 黑方块拇指。
 *   <P4Slider value={v} onChange={setV} min={0} max={100} step={5} label="音量" showValue suffix="%" />
 *   ticks：显示 S.Link 式刻度方格
 */
import type { CSSProperties } from 'react';
import { useId } from 'react';
import { cx } from '@yellow/lib/cx';

export interface P4SliderProps { value: number; onChange: (v: number) => void; min?: number; max?: number; step?: number; label?: string; showValue?: boolean; suffix?: string; disabled?: boolean; className?: string; ticks?: boolean }

export function P4Slider({ value, onChange, min = 0, max = 100, step = 1, label, showValue, suffix = '', disabled, className, ticks }: P4SliderProps) {
  const id = useId();
  const pct = ((value - min) / (max - min || 1)) * 100;
  return (
    <div className={cx('flex min-w-0 flex-col gap-1.5', className)}>
      {(label || showValue) && (
        <div className="flex min-w-0 items-center justify-between gap-2">
          {label && <label htmlFor={id} className="min-w-0 truncate font-display text-meta font-bold text-p4g-ink">{label}</label>}
          {showValue && <span className="shrink-0 p4g-num text-body text-p4g-ink">{value}{suffix}</span>}
        </div>
      )}
      <div className="relative">
        <input id={id} type="range" min={min} max={max} step={step} value={value} disabled={disabled} onChange={(e) => onChange(Number(e.target.value))} className="p4g-range w-full" style={{ '--p4g-range-pct': `${pct}%` } as CSSProperties} />
        {ticks && (
          <div aria-hidden className="pointer-events-none absolute inset-x-[4px] top-1/2 flex -translate-y-1/2 justify-between">
            {Array.from({ length: 11 }, (_, i) => <span key={i} className="h-[6px] w-[2px] bg-p4g-black/40" />)}
          </div>
        )}
      </div>
    </div>
  );
}
