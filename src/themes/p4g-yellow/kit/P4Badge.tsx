/**
 * P4Badge —— 计数气泡 / 角标贴纸。
 *   <P4Badge count={3} />                 红圆白字（>99 显示 99+）
 *   <P4Badge dot />                       小红点
 *   <P4Badge label="NEW!" />              黄底黑字黑描边斜贴纸（P4G 新物品角标）
 *   <P4Badge label="MAX" tone="black" />
 *   放在 relative 父元素里用 className="absolute -top-1 -right-1"
 */
import { cx } from '@yellow/lib/cx';

export interface P4BadgeProps { count?: number; dot?: boolean; label?: string; tone?: 'red' | 'yellow' | 'black' | 'orange'; className?: string }

export function P4Badge({ count, dot, label, tone, className }: P4BadgeProps) {
  if (dot) return <span className={cx('inline-block h-2.5 w-2.5 rounded-pill border-thin border-p4g-black bg-p4g-red', className)} aria-hidden />;
  if (label) {
    const t = tone ?? 'yellow';
    const cls = t === 'yellow' ? 'bg-p4g-yellow text-p4g-black border-p4g-black' : t === 'black' ? 'bg-p4g-black text-p4g-yellow border-p4g-black night:border-p4g-yellow' : t === 'orange' ? 'bg-p4g-tag text-[color:var(--p4g-tag-ink)] border-p4g-black' : 'bg-p4g-red text-white border-p4g-black';
    return <span className={cx('inline-block -rotate-6 whitespace-nowrap rounded-xs border-thin px-1.5 py-[2px] font-display text-2xs font-bold italic leading-none shadow-hard-sm', cls, className)}>{label}</span>;
  }
  if (!count) return null;
  return <span className={cx('inline-flex h-[18px] min-w-[18px] items-center justify-center rounded-pill border-thin border-p4g-black bg-p4g-red px-1 p4g-num-upright text-2xs leading-none text-white', className)}>{count > 99 ? '99+' : count}</span>;
}
