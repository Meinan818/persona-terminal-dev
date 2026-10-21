/**
 * P4Tabs —— 斜切标签（平行四边形，字恒水平）。选中：黑底白字（夜：黄底黑字）+ 下沉黄条；未选：浅黄面黑字。
 * 超出宽度横向滚动（不换行、不裁字）。
 *   <P4Tabs value={tab} onChange={setTab} items={[{ id:'todos', label:'任务' }, { id:'activities', label:'记录', badge: 3 }]} />
 *   size="sm"|"md"，fill（等分撑满）
 */
import type { ReactNode } from 'react';
import { cx } from '@yellow/lib/cx';

export interface P4TabItem { id: string; label: ReactNode; badge?: number | string; disabled?: boolean; en?: string }
export interface P4TabsProps { items: P4TabItem[]; value: string; onChange: (id: string) => void; size?: 'sm' | 'md'; fill?: boolean; className?: string; ariaLabel?: string }

export function P4Tabs({ items, value, onChange, size = 'md', fill, className, ariaLabel }: P4TabsProps) {
  return (
    <div role="tablist" aria-label={ariaLabel} className={cx('p4g-noscroll flex min-w-0 gap-1.5 overflow-x-auto px-2 pb-1.5 pt-0.5', className)}>
      {items.map((it) => {
        const on = it.id === value;
        return (
          <button
            key={it.id} role="tab" aria-selected={on} disabled={it.disabled} type="button"
            onClick={() => onChange(it.id)}
            className={cx('group relative shrink-0 select-none', fill && 'flex-1', it.disabled && 'opacity-40')}
          >
            <span
              aria-hidden
              className={cx('absolute inset-0 border-3 transition-transform duration-fast ease-snap', on ? 'border-p4g-select bg-p4g-select shadow-hard-sm' : 'border-p4g-line bg-p4g-surface-2 group-active:translate-y-[2px]')}
              style={{ transform: 'skewX(-14deg)' }}
            />
            {on && <span aria-hidden className="absolute -bottom-1.5 left-1 right-1 h-1.5 bg-p4g-orange" style={{ transform: 'skewX(-14deg)' }} />}
            <span className={cx('relative flex items-center justify-center gap-1.5 whitespace-nowrap font-display font-bold', size === 'sm' ? 'h-8 px-4 text-meta' : 'h-10 px-5 text-body', on ? 'text-[color:var(--p4g-select-ink)]' : 'text-p4g-ink')}>
              {it.label}
              {it.badge !== undefined && <span className={cx('min-w-[18px] rounded-pill px-1 text-2xs leading-[18px]', on ? 'bg-p4g-yellow text-p4g-black night:bg-p4g-black night:text-p4g-yellow' : 'bg-p4g-red text-white')}>{it.badge}</span>}
            </span>
          </button>
        );
      })}
    </div>
  );
}
