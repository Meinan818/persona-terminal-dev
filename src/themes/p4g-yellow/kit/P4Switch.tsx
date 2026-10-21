/**
 * P4Switch —— 方形拨杆开关：轨道黑描边，开 = 黄轨 + 黑方块推右 + "ON"；关 = 奶油轨 + "OFF"。
 *   <P4Switch checked={on} onChange={setOn} label="夜间模式" />
 *   <P4Switch checked={on} onChange={setOn} aria-label="开关" size="sm" />
 * 滑块位移用 translateX。
 */
import { cx } from '@yellow/lib/cx';

export interface P4SwitchProps { checked: boolean; onChange: (v: boolean) => void; label?: string; disabled?: boolean; size?: 'sm' | 'md'; className?: string; 'aria-label'?: string }

export function P4Switch({ checked, onChange, label, disabled, size = 'md', className, ...a }: P4SwitchProps) {
  const w = size === 'sm' ? 46 : 58;
  const h = size === 'sm' ? 26 : 30;
  const k = h - 10;
  return (
    <label className={cx('inline-flex min-w-0 cursor-pointer select-none items-center gap-2', disabled && 'cursor-not-allowed opacity-50', className)}>
      <button
        type="button" role="switch" aria-checked={checked} aria-label={a['aria-label'] ?? label} disabled={disabled}
        onClick={() => onChange(!checked)}
        className={cx('relative shrink-0 rounded-sm border-3 border-p4g-line transition-colors duration-fast', checked ? 'bg-p4g-yellow' : 'bg-p4g-surface-2')}
        style={{ width: w, height: h }}
      >
        <span className={cx('absolute top-1/2 -translate-y-1/2 font-display text-[9px] font-bold leading-none', checked ? 'left-1.5 text-p4g-black' : 'right-1.5 text-p4g-muted')}>{checked ? 'ON' : 'OFF'}</span>
        <span className="absolute left-[2px] top-[2px] rounded-xs bg-p4g-black transition-transform duration-fast ease-snap night:bg-p4g-yellow" style={{ width: k, height: k, transform: `translateX(${checked ? w - k - 10 : 0}px)`, boxShadow: checked ? 'none' : undefined }} />
      </button>
      {label && <span className="min-w-0 truncate text-body font-bold text-p4g-ink">{label}</span>}
    </label>
  );
}
