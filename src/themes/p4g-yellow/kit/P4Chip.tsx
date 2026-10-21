/**
 * P4Chip —— 小标签。tone：tag（橙底白字，S.Link 的 "Chariot"）/ black / yellow / outline / danger。
 *   <P4Chip>Chariot</P4Chip>
 *   <P4Chip tone="outline" selected={on} onClick={…}>运动</P4Chip>   可选中（选中=黑底）
 *   <P4Chip tone="yellow" icon={<IconStar size={12}/>} onRemove={…}>标签</P4Chip>
 */
import type { ReactNode, MouseEventHandler } from 'react';
import { cx } from '@yellow/lib/cx';
import { IconClose } from './icons';

export interface P4ChipProps { children: ReactNode; tone?: 'tag' | 'black' | 'yellow' | 'outline' | 'danger'; selected?: boolean; icon?: ReactNode; onClick?: MouseEventHandler; onRemove?: () => void; size?: 'sm' | 'md'; className?: string }

const T = {
  tag: 'bg-p4g-tag text-[color:var(--p4g-tag-ink)] border-transparent',
  black: 'bg-p4g-black text-white border-p4g-black night:border-p4g-yellow',
  yellow: 'bg-p4g-yellow text-p4g-black border-p4g-black',
  outline: 'bg-p4g-surface-2 text-p4g-ink border-p4g-line',
  danger: 'bg-p4g-danger text-[color:var(--p4g-danger-ink)] border-transparent',
};

export function P4Chip({ children, tone = 'tag', selected, icon, onClick, onRemove, size = 'md', className }: P4ChipProps) {
  const Tag = onClick ? 'button' : 'span';
  const cls = selected ? 'bg-p4g-select text-[color:var(--p4g-select-ink)] border-p4g-select' : T[tone];
  return (
    <Tag type={onClick ? 'button' : undefined} onClick={onClick} aria-pressed={onClick ? !!selected : undefined}
      className={cx('inline-flex min-w-0 max-w-full items-center gap-1 rounded-xs border-thin font-display font-bold leading-none', size === 'sm' ? 'h-6 px-1.5 text-2xs' : 'h-7 px-2.5 text-meta', onClick && 'p4g-press cursor-pointer', className, cls)}>
      {icon && <span className="flex shrink-0">{icon}</span>}
      <span className="min-w-0 truncate">{children}</span>
      {onRemove && <span role="button" aria-label="移除" onClick={(e) => { e.stopPropagation(); onRemove(); }} className="-mr-1 flex h-5 w-5 shrink-0 items-center justify-center"><IconClose size={12} /></span>}
    </Tag>
  );
}
