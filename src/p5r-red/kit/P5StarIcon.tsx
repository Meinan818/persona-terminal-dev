/** 五角星（原 P5.ui.star(fill, stroke, sw, cls)）。默认红芯奶白描边。 */
import type { CSSProperties } from 'react';
import { shape } from '@/p5r-red/lib/shape';
export interface P5StarIconProps { fill?: string; stroke?: string; sw?: number; className?: string; style?: CSSProperties }
export function P5StarIcon({ fill = 'var(--red)', stroke = 'var(--paper)', sw = 1.6, className = 'star', style }: P5StarIconProps) {
  return <svg className={className} viewBox="0 0 24 24" aria-hidden="true" style={style}><polygon points={shape.starPts(12, 12.6, 11)} fill={fill} stroke={stroke} strokeWidth={sw} strokeLinejoin="round" /></svg>;
}
/** 实心星（首页等用：starPts(12,12.8,11.5)，无描边） */
export function P5SolidStar({ fill = 'currentColor', className = '', style }: { fill?: string; className?: string; style?: CSSProperties }) {
  return <svg className={className || undefined} viewBox="0 0 24 24" aria-hidden="true" style={style}><polygon points={shape.starPts(12, 12.8, 11.5)} fill={fill} /></svg>;
}
