/**
 * P4Stepper —— 数量步进器：[−] 大号斜体数字 [+]，方形黑描边按钮。
 *   <P4Stepper value={n} onChange={setN} min={0} max={99} step={1} unit="次" />
 */
import { cx } from '@yellow/lib/cx';
import { IconMinus, IconPlus } from './icons';

export interface P4StepperProps { value: number; onChange: (v: number) => void; min?: number; max?: number; step?: number; unit?: string; className?: string; label?: string }

export function P4Stepper({ value, onChange, min = -Infinity, max = Infinity, step = 1, unit, className, label }: P4StepperProps) {
  const clamp = (v: number) => Math.max(min, Math.min(max, v));
  const btn = 'p4g-press flex h-10 w-10 shrink-0 items-center justify-center rounded-sm border-3 border-p4g-line bg-p4g-yellow text-p4g-black shadow-hard-sm disabled:opacity-40';
  return (
    <div className={cx('inline-flex min-w-0 items-center gap-2', className)} role="group" aria-label={label}>
      <button type="button" aria-label="减少" className={btn} disabled={value <= min} onClick={() => onChange(clamp(value - step))}><IconMinus size={16} /></button>
      <span className="min-w-[3.5rem] text-center p4g-num text-h2 leading-none text-p4g-ink" aria-live="polite">{value}{unit && <span className="ml-0.5 text-meta not-italic">{unit}</span>}</span>
      <button type="button" aria-label="增加" className={btn} disabled={value >= max} onClick={() => onChange(clamp(value + step))}><IconPlus size={16} /></button>
    </div>
  );
}
