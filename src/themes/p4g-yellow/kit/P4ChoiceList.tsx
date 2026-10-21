/**
 * P4ChoiceList —— P4G 选项列表（消息框下方的 "Add member / Remove member / Cancel"）：
 * 白字列表，焦点/悬停项 = 橙色圆头高亮条 + 黑字，前缘一个小黑三角。键盘 ↑↓ + Enter 可用。
 *   <P4ChoiceList items={[{id:'yes',label:'是'},{id:'no',label:'否'}]} onSelect={id=>…} defaultIndex={0} />
 * 用于 P4Dialog 的选项、P4ActionSheet 的条目，也可单独放在消息框里。
 */
import { useState, type ReactNode, type KeyboardEvent } from 'react';
import { cx } from '@yellow/lib/cx';

export interface P4Choice { id: string; label: ReactNode; danger?: boolean; disabled?: boolean; hint?: ReactNode; icon?: ReactNode }
export interface P4ChoiceListProps { items: P4Choice[]; onSelect: (id: string) => void; defaultIndex?: number; className?: string; tone?: 'msg' | 'light' }

export function P4ChoiceList({ items, onSelect, defaultIndex = 0, className, tone = 'msg' }: P4ChoiceListProps) {
  const [hi, setHi] = useState(defaultIndex);
  const onKey = (e: KeyboardEvent) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); setHi((h) => (h + 1) % items.length); }
    if (e.key === 'ArrowUp') { e.preventDefault(); setHi((h) => (h - 1 + items.length) % items.length); }
    if (e.key === 'Enter' && items[hi] && !items[hi].disabled) onSelect(items[hi].id);
  };
  const base = tone === 'msg' ? 'text-[color:var(--p4g-msg-ink)]' : 'text-p4g-ink';
  return (
    <div role="listbox" tabIndex={0} onKeyDown={onKey} className={cx('flex min-w-0 flex-col gap-0.5 outline-none', className)}>
      {items.map((it, i) => {
        const on = i === hi;
        return (
          <button
            key={it.id} type="button" role="option" aria-selected={on} disabled={it.disabled}
            onMouseEnter={() => setHi(i)} onFocus={() => setHi(i)}
            onClick={() => !it.disabled && onSelect(it.id)}
            className={cx('relative flex min-h-[44px] w-full min-w-0 items-center gap-2.5 rounded-pill pl-7 pr-4 text-left font-display text-lead font-bold transition-colors duration-instant',
              on ? 'bg-p4g-orange text-p4g-black' : base, it.danger && !on && (tone === 'msg' ? 'text-[color:var(--p4g-danger-on-msg)]' : 'text-p4g-danger'), it.disabled && 'opacity-40')}
          >
            {on && <span aria-hidden className="absolute left-2.5 top-1/2 h-0 w-0 -translate-y-1/2 border-y-[6px] border-l-[9px] border-y-transparent border-l-p4g-black" />}
            {it.icon && <span className="flex shrink-0">{it.icon}</span>}
            <span className="min-w-0 flex-1 truncate">{it.label}</span>
            {it.hint && <span className={cx('shrink-0 text-meta', on ? 'text-p4g-black/70' : 'opacity-70')}>{it.hint}</span>}
          </button>
        );
      })}
    </div>
  );
}
