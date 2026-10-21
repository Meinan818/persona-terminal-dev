/**
 * P4ListRow —— S.Link 列表行（实机 1:1）：左方框图标 + 橙 Rank 字 + 橙标签 + 名称 + 分段进度；
 * 选中 = 整行反黑（夜间反黄），标签反白。行间分隔线绿/橙交替。
 *   <P4ListRow title="Chie Satonaka" eyebrow="Rank 8" tag="Chariot" progress={8} progressMax={10} selected />
 *   <P4ListRow title="设置" subtitle="通知、外观" leading={<Icon/>} trailing="chevron" onClick={…} />
 *   <P4ListRow title="夜间模式" trailing={<P4Switch …/>} />
 * 文字：title 单行省略、subtitle 两行截断；整行 min-w-0 不会被长文撑破。
 */
import type { ReactNode, MouseEventHandler } from 'react';
import { cx } from '@yellow/lib/cx';
import { IconChevron } from './icons';
import { P4Progress } from './P4Progress';

export interface P4ListRowProps {
  title: ReactNode;
  subtitle?: ReactNode;
  eyebrow?: ReactNode;
  tag?: ReactNode;
  leading?: ReactNode | 'box';
  trailing?: ReactNode | 'chevron';
  meta?: ReactNode;
  progress?: number;
  progressMax?: number;
  selected?: boolean;
  separator?: 'green' | 'orange' | 'none';
  disabled?: boolean;
  danger?: boolean;
  onClick?: MouseEventHandler;
  className?: string;
}

export function P4ListRow({ title, subtitle, eyebrow, tag, leading = 'box', trailing, meta, progress, progressMax = 10, selected, separator = 'green', disabled, danger, onClick, className }: P4ListRowProps) {
  const Tag = onClick ? 'button' : 'div';
  return (
    <Tag
      type={onClick ? 'button' : undefined}
      onClick={disabled ? undefined : onClick}
      aria-pressed={onClick && selected !== undefined ? selected : undefined}
      className={cx(
        'group relative flex w-full min-w-0 items-center gap-3 px-3 py-2.5 text-left transition-colors duration-fast',
        selected ? 'bg-p4g-select text-[color:var(--p4g-select-ink)]' : 'text-p4g-ink',
        onClick && !disabled && 'cursor-pointer active:translate-x-[2px]',
        disabled && 'opacity-50',
        className,
      )}
      style={selected ? undefined : { background: 'var(--p4g-surface-grad)' }}
    >
      {leading === 'box' ? (
        <span aria-hidden className={cx('flex h-11 w-9 shrink-0 items-center justify-center rounded-sm border-[3px]', selected ? 'border-[color:var(--p4g-select-ink)] bg-[color:var(--p4g-select-ink)]' : 'border-p4g-orange bg-p4g-yellow-pale')}>
          <span className={cx('h-7 w-5 rounded-xs', selected ? 'bg-p4g-select' : 'bg-p4g-orange')} />
        </span>
      ) : leading ? <span className="flex shrink-0 items-center">{leading}</span> : null}
      <span className="flex min-w-0 flex-1 flex-col gap-0.5">
        {(eyebrow || tag) && (
          <span className="flex min-w-0 items-center gap-2">
            {eyebrow && <span className={cx('font-display text-lead font-bold italic leading-none', selected ? '' : 'text-[color:var(--p4g-rank)]')}>{eyebrow}</span>}
            {tag && <span className={cx('min-w-0 truncate rounded-xs px-2 py-[3px] font-display text-meta font-bold leading-none', selected ? 'bg-[color:var(--p4g-select-ink)] text-[color:var(--p4g-select)]' : 'bg-p4g-tag text-[color:var(--p4g-tag-ink)]')}>{tag}</span>}
          </span>
        )}
        <span className={cx('p4g-clamp-1 font-display text-lead font-bold leading-tight', danger && !selected && 'text-p4g-danger')}>{title}</span>
        {subtitle && <span className={cx('p4g-clamp-2 text-meta', selected ? 'opacity-80' : 'text-p4g-ink-soft')}>{subtitle}</span>}
        {progress !== undefined && <P4Progress className="mt-1" value={progress} max={progressMax} variant="segments" inverted={selected} />}
      </span>
      {meta && <span className={cx('shrink-0 text-meta font-bold', selected ? '' : 'text-p4g-ink-soft')}>{meta}</span>}
      {trailing === 'chevron' ? <IconChevron size={18} className="shrink-0" /> : trailing ? <span className="flex shrink-0 items-center" onClick={(e) => e.stopPropagation()}>{trailing}</span> : null}
      {separator !== 'none' && !selected && (
        <span aria-hidden className="absolute inset-x-0 bottom-0 h-[2px]" style={{ background: separator === 'green' ? 'var(--p4g-separator-a)' : 'var(--p4g-separator-b)' }} />
      )}
    </Tag>
  );
}

/** 列表容器：黑描边框 + 硬阴影，行之间无缝（S.Link 面板）*/
export function P4List({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cx('min-w-0 overflow-hidden rounded-sm border-3 border-p4g-line shadow-hard', className)}>{children}</div>;
}
