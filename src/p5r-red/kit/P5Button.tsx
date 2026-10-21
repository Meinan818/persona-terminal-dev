/**
 * 异形按钮（原 P5.ui.btn）：切角 cut(seed) 三层壳；按下「压进影子」x+3 y+4。
 *   <P5Button tone="red|paper|ink" size="sm|lg" seed={7} icon={…}>保存</P5Button>
 */
import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { P5Shp, type ShpTone } from './P5Shp';
export interface P5ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> { tone?: ShpTone; seed?: number; size?: '' | 'sm' | 'lg'; icon?: ReactNode }
export function P5Button({ tone = 'red', seed = 7, size = '', icon, className = '', children, type = 'button', ...rest }: P5ButtonProps) {
  return (
    <P5Shp as="button" type={type} kind="cut" seed={seed} tone={tone} className={`btn ${tone === 'paper' ? 'paper' : ''} ${size} ${className}`} {...rest}>
      {icon}<span>{children}</span>
    </P5Shp>
  );
}
