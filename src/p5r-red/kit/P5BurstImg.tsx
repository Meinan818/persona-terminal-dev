/** 星爆角标（原 P5.ui.burst）：tone red | cream | ink（素材 starburst_*）。 */
import type { CSSProperties, ReactNode } from 'react';
import { kitImg } from '@/p5r-red/lib/asset';
export function P5BurstImg({ children, tone = 'red', sz = 56, rot = -8, className = '' }: { children?: ReactNode; tone?: 'red' | 'cream' | 'ink'; sz?: number; rot?: number; className?: string }) {
  return (
    <span className={`burst ${tone} ${className}`.trim()} style={{ '--sz': `${sz}px`, '--rot': `${rot}deg` } as CSSProperties}>
      <img src={kitImg('starburst_' + tone)} alt="" />{children != null && <b>{children}</b>}
    </span>
  );
}
