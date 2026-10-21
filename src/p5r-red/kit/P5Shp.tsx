/**
 * 分层异形壳（原 P5.ui.shp）：影层 sh / 框层 fr / 面层 fc 三层 <i class="lyr"> + 内容。
 * clip-path 只加在装饰层上（CSS 变量 --clip / --clip2 / --clip-sh），内容层永不裁切。同 seed 恒同形。
 *   <P5Shp as="section" kind="torn" seed={31} tone="paper" className="sheet">…</P5Shp>
 * kind: torn 撕边 | quad 四角错动 | cut 切角 | plate 斜牌；tone: paper | ink | red（可再加 redsh 红影）
 */
import { forwardRef, useMemo, type CSSProperties, type ElementType, type HTMLAttributes, type ReactNode } from 'react';
import { clipFor } from './html';

export type ShpKind = 'torn' | 'quad' | 'cut' | 'plate';
export type ShpTone = 'paper' | 'ink' | 'red';
export interface P5ShpProps extends HTMLAttributes<HTMLElement> {
  as?: ElementType; kind?: ShpKind; seed?: number; tone?: ShpTone | ''; shadow?: boolean; jag?: number;
  className?: string; style?: CSSProperties; children?: ReactNode; [k: string]: any; // eslint-disable-line @typescript-eslint/no-explicit-any
}

export const shpVars = (kind: ShpKind, seed: number, jag?: number) => ({
  '--clip': clipFor(kind, seed, jag), '--clip2': clipFor(kind, seed + 5, jag), '--clip-sh': clipFor(kind, seed + 11, jag),
}) as CSSProperties;

export const P5Shp = forwardRef<HTMLElement, P5ShpProps>(function P5Shp({ as: Tag = 'div', kind = 'quad', seed = 1, tone = 'paper', shadow = true, jag, className = '', style, children, ...rest }, ref) {
  const vars = useMemo(() => shpVars(kind, seed, jag), [kind, seed, jag]);
  return (
    <Tag ref={ref} className={`shp ${tone} ${className}`.replace(/\s+/g, ' ').trim()} style={{ ...vars, ...style }} {...rest}>
      {shadow && <i className="lyr sh" aria-hidden="true" />}<i className="lyr fr" aria-hidden="true" /><i className="lyr fc" aria-hidden="true" />
      {children}
    </Tag>
  );
});

/** 卡片 = 撕边纸面（设计规范：卡片用 torn(seed)） */
export const P5Card = forwardRef<HTMLElement, P5ShpProps>(function P5Card(p, ref) { return <P5Shp ref={ref} kind="torn" tone="paper" {...p} />; });
