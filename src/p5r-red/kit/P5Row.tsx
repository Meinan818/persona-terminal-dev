/** P5R 菜单列表行（.row5，委托清单 / 设置项）：墨黑斜行，hover / sel 红白反转。 */
import type { ButtonHTMLAttributes } from 'react';
import { P5Shp } from './P5Shp';
export function P5Row({ sel, seed = 3, className = '', children, ...rest }: ButtonHTMLAttributes<HTMLButtonElement> & { sel?: boolean; seed?: number }) {
  return <P5Shp as="button" type="button" kind="quad" seed={seed} tone="ink" className={`row5 ${sel ? 'sel' : ''} ${className}`} {...rest}>{children}</P5Shp>;
}
