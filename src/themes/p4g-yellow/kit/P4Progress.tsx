/**
 * P4Progress —— 进度条。
 *   variant="segments"：S.Link 分段条（橙色长条内嵌奶白方格，已达成格为白，未达成为橙）
 *   variant="hp" | "sp"：Status 的 HP/SP 条（黑槽 + 奶黄/绿填充）
 *   variant="bar"：通用（黑描边 + 黄填充 + 斜纹）
 *   <P4Progress value={6} max={10} variant="segments" />
 *   <P4Progress value={65} max={94} variant="hp" label="HP" showValue />
 * 动画：填充用 scaleX（transform），不改 width。
 */
import { cx } from '@yellow/lib/cx';

export interface P4ProgressProps { value: number; max?: number; variant?: 'segments' | 'hp' | 'sp' | 'bar'; label?: string; showValue?: boolean; inverted?: boolean; className?: string; segments?: number }

export function P4Progress({ value, max = 100, variant = 'bar', label, showValue, inverted, className, segments }: P4ProgressProps) {
  const ratio = Math.max(0, Math.min(1, max ? value / max : 0));
  if (variant === 'segments') {
    const n = segments ?? (max <= 12 ? max : 10);
    const filled = Math.round(ratio * n);
    return (
      <div className={cx('flex h-[14px] w-full min-w-0 items-center gap-[3px] rounded-[2px] px-[4px]', inverted ? 'bg-[color:var(--p4g-select-ink)]' : 'bg-p4g-orange', className)} role="progressbar" aria-valuenow={value} aria-valuemax={max}>
        {Array.from({ length: n }, (_, i) => (
          <span key={i} className={cx('h-[6px] flex-1 rounded-[1px]', i < filled ? (inverted ? 'bg-p4g-select' : 'bg-white') : (inverted ? 'bg-p4g-select/25' : 'bg-p4g-orange-deep/60'))} />
        ))}
      </div>
    );
  }
  const fill = variant === 'hp' ? 'bg-p4g-hp' : variant === 'sp' ? 'bg-p4g-sp' : 'bg-p4g-yellow';
  return (
    <div className={cx('flex min-w-0 items-center gap-2', className)}>
      {label && <span className="w-7 shrink-0 font-display text-meta font-bold italic">{label}</span>}
      <div className={cx('relative h-3 min-w-0 flex-1 overflow-hidden', variant === 'bar' ? 'rounded-xs border-thin border-p4g-line bg-p4g-surface-2' : 'rounded-[2px] bg-p4g-black')} role="progressbar" aria-valuenow={value} aria-valuemax={max}>
        <div className={cx('absolute inset-y-0 left-0 w-full origin-left transition-transform duration-slow ease-out', fill)} style={{ transform: `scaleX(${ratio})`, backgroundImage: variant === 'bar' ? 'repeating-linear-gradient(-45deg, rgba(0,0,0,.12) 0 4px, transparent 4px 8px)' : undefined }} />
      </div>
      {showValue && <span className="shrink-0 p4g-num text-meta">{value}<span className="opacity-60"> / {max}</span></span>}
    </div>
  );
}
