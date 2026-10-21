/** ★ 标题牌（原 P5.ui.plate）：墨楔牌 + 红错位影 + 奶白大字 + 红星。 */
import type { CSSProperties, ElementType, ReactNode } from 'react';
import { shape } from '@/p5r-red/lib/shape';
import { P5StarIcon } from './P5StarIcon';
export interface P5PlateProps { children: ReactNode; fs?: number; rot?: number; as?: ElementType; suffix?: ReactNode; className?: string; style?: CSSProperties; [k: string]: any }
export function P5Plate({ children, fs = 22, rot = -2, as: Tag = 'span', suffix, className = '', style, ...rest }: P5PlateProps) {
  return (
    <Tag className={`shp plate ${className}`.trim()} style={{ '--clip': shape.plate, '--fs': `${fs}px`, '--rot': `${rot}deg`, ...style } as CSSProperties} {...rest}>
      <i className="lyr sh" aria-hidden="true" /><i className="lyr fr" aria-hidden="true" /><span>{children}</span>{suffix}<P5StarIcon />
    </Tag>
  );
}
