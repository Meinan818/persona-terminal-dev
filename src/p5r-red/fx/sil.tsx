/**
 * 剪影（原 P5.sil(name, {fill, rim, rw, cls, style, flip})）：leap | point | crouch | cat。
 * 默认暗红填充 + 奶白描边（--p5r-sil / --p5r-sil-rim，随日夜切换）。
 *   <P5Sil name="leap" style={{ height: '100%', width: 'auto' }} />
 */
import type { CSSProperties } from 'react';
import { SIL_DATA, type SilName } from './silData';

export interface P5SilProps { name: SilName; fill?: string; rim?: string; rw?: number; className?: string; style?: CSSProperties; flip?: boolean }

export function P5Sil({ name, fill = 'var(--p5r-sil)', rim = 'var(--p5r-sil-rim)', rw = 5, className = '', style, flip = false }: P5SilProps) {
  const s = SIL_DATA[name];
  return (
    <svg className={`sil ${className}`.trim()} viewBox={`${-rw} ${-rw} ${s.w + rw * 2} ${s.h + rw * 2}`} style={style} aria-hidden="true" transform={flip ? 'scale(-1,1)' : undefined}>
      <path d={s.d} fill={fill} fillRule="evenodd" stroke={rim} strokeWidth={rw} strokeLinejoin="round" paintOrder="stroke" />
    </svg>
  );
}
export const SIL_NAMES = Object.keys(SIL_DATA) as SilName[];
export type { SilName };
