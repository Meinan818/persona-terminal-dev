/**
 * P4SegmentTabs —— 紧凑分段切换（P4G 选项高亮 = 橙色圆头条）。
 *   <P4SegmentTabs value={v} onChange={setV} items={[{id:'week',label:'周'},{id:'month',label:'月'}]} />
 * 黑描边槽，选中项橙色胶囊黑字（夜间同）；等分宽度，文字单行省略。
 */
import type { ReactNode } from 'react';
import { motion } from 'framer-motion';
import { useId } from 'react';
import { cx } from '@yellow/lib/cx';
import { useLowMotion } from '@yellow/lib/prefs';

export interface P4SegmentTabsProps { items: { id: string; label: ReactNode }[]; value: string; onChange: (id: string) => void; className?: string; size?: 'sm' | 'md' }

export function P4SegmentTabs({ items, value, onChange, className, size = 'md' }: P4SegmentTabsProps) {
  const id = useId();
  const low = useLowMotion();
  return (
    <div role="tablist" className={cx('flex min-w-0 rounded-pill border-3 border-p4g-line bg-p4g-surface-2 p-[3px]', className)}>
      {items.map((it) => {
        const on = it.id === value;
        return (
          <button key={it.id} type="button" role="tab" aria-selected={on} onClick={() => onChange(it.id)} className={cx('relative min-w-0 flex-1 rounded-pill font-display font-bold', size === 'sm' ? 'h-7 text-meta' : 'h-9 text-body')}>
            {on && <motion.span layoutId={`seg-${id}`} transition={low ? { duration: 0 } : { type: 'tween', duration: 0.16, ease: [0.2, 0.9, 0.1, 1] }} className="absolute inset-0 rounded-pill bg-p4g-orange" />}
            <span className={cx('relative block truncate px-2', on ? 'text-p4g-black' : 'text-p4g-ink-soft')}>{it.label}</span>
          </button>
        );
      })}
    </div>
  );
}
