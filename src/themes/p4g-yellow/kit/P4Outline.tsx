/**
 * P4Outline —— 白字粗黑描边标题（"S.Link" / "Status" / "Rank Up" 式）。
 * 双层渲染：底层 -webkit-text-stroke 加粗描边，顶层纯填充——描边圆润、不吃字形内部。
 *   <P4Outline size={40}>S.Link</P4Outline>
 *   <P4Outline size="clamp(28px,8vw,44px)" fill="var(--p4g-yellow)" stroke={6} italic>羁绊</P4Outline>
 * 夜间自动：填充=黄、描边=黑（--p4g-title-fill / --p4g-title-stroke）。
 * 注意：文字本身不换行（white-space: nowrap），长文案请用 clamp 字号或外层 min-w-0 + 缩放。
 */
import type { CSSProperties, ReactNode, ElementType } from 'react';
import { cx } from '@yellow/lib/cx';

export interface P4OutlineProps {
  children: ReactNode;
  size?: number | string;
  stroke?: number;
  fill?: string;
  strokeColor?: string;
  italic?: boolean;
  /** 额外的硬投影（偏移量 px），P4G Logo 式 */
  drop?: number;
  as?: ElementType;
  className?: string;
  style?: CSSProperties;
  wrap?: boolean;
}

export function P4Outline({ children, size = 32, stroke = 5, fill = 'var(--p4g-title-fill)', strokeColor = 'var(--p4g-title-stroke)', italic, drop = 0, as: Tag = 'span', className, style, wrap = false }: P4OutlineProps) {
  const fs = typeof size === 'number' ? `${size}px` : size;
  const common: CSSProperties = { fontSize: fs, fontFamily: 'var(--p4g-font-display)', fontWeight: 700, letterSpacing: '-0.01em', lineHeight: 1.05, fontStyle: italic ? 'italic' : undefined, whiteSpace: wrap ? 'normal' : 'nowrap' };
  return (
    <Tag className={cx('relative inline-block', className)} style={{ ...common, ...style }}>
      <span aria-hidden className="absolute inset-0 select-none" style={{ WebkitTextStroke: `${stroke * 2}px ${strokeColor}`, color: strokeColor, transform: drop ? `translate(${drop}px, ${drop}px)` : undefined, paintOrder: 'stroke fill' }}>{children}</span>
      {drop > 0 && <span aria-hidden className="absolute inset-0 select-none" style={{ WebkitTextStroke: `${stroke * 2}px ${strokeColor}`, color: strokeColor }}>{children}</span>}
      <span className="relative" style={{ color: fill }}>{children}</span>
    </Tag>
  );
}
