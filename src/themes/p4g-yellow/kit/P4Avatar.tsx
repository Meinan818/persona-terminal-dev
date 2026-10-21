/**
 * P4Avatar —— 方形头像（P4G 队伍头像：方框 + 黑描边 + 底部名牌可选）。
 *   <P4Avatar src={url} name="千枝" size={48} />
 *   <P4Avatar name="雪子" ring="orange" badge={<P4Badge dot/>} />      无图时显示首字
 *   <P4Avatar slot="char-chie" name="千枝" />                         官方插槽（存在时优先）
 */
import type { ReactNode } from 'react';
import { cx } from '@yellow/lib/cx';
import { useSlot } from '@yellow/lib/slots';

export interface P4AvatarProps { src?: string; slot?: string; name?: string; size?: number; ring?: 'black' | 'yellow' | 'orange'; shape?: 'square' | 'circle'; badge?: ReactNode; className?: string }

export function P4Avatar({ src, slot, name = '', size = 44, ring = 'black', shape = 'square', badge, className }: P4AvatarProps) {
  const slotted = useSlot(slot ?? '__none__', src ?? '');
  const url = slot ? slotted : src;
  const ringCls = ring === 'yellow' ? 'border-p4g-yellow' : ring === 'orange' ? 'border-p4g-orange' : 'border-p4g-line';
  return (
    <span className={cx('relative inline-flex shrink-0', className)} style={{ width: size, height: size }}>
      <span className={cx('flex h-full w-full items-center justify-center overflow-hidden border-3 bg-p4g-yellow-pale shadow-hard-sm', ringCls, shape === 'circle' ? 'rounded-pill' : 'rounded-sm')}>
        {url ? <img src={url} alt={name} className="h-full w-full object-cover" draggable={false} /> : <span className="font-display font-bold text-p4g-black" style={{ fontSize: size * 0.42 }}>{name.slice(0, 1) || '?'}</span>}
      </span>
      {badge && <span className="absolute -right-1 -top-1">{badge}</span>}
    </span>
  );
}
