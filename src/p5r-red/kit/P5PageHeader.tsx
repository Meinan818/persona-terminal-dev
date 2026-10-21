/**
 * 通用页头（原 pages_a.js 的 P5.hdr / P5.back）：剪报英文 + 标题牌中文 + 副标题 + 右侧操作。
 *   <P5PageHeader ransom="SOCIAL STATS" cn="统计" sub="五维社会属性" seed={61} right={<P5Back to="menu" />} />
 * 剪报高度：宽屏 56；否则 min(36, floor(250/len*1.25))；标题牌字号 宽屏 24 / 19（与原生一致）。
 */
import type { ReactNode, MouseEvent } from 'react';
import { useWide } from '@/p5r-red/lib/layout';
import { P5Ransom } from './P5Ransom';
import { P5Plate } from './P5Plate';
import { P5StarIcon } from './P5StarIcon';
import { navigate } from '@/p5r-red/shell/shellBus';
import { sfx } from '@/p5r-red/fx/sfx';

export function P5PageHeader({ ransom, cn, sub, seed, right }: { ransom: string; cn: ReactNode; sub?: ReactNode; seed: number; right?: ReactNode }) {
  const wide = useWide();
  return (
    <header className="pg-hd">
      <div className="pg-hd-l">
        <P5Ransom text={ransom} h={wide ? 56 : Math.min(36, Math.floor(250 / ransom.length * 1.25))} seed={seed} />
        <div className="pg-cn"><P5Plate fs={wide ? 24 : 19}>{cn}</P5Plate><span className="pg-sub">{sub}</span></div>
      </div>
      <div className="pg-hd-r">{right}</div>
    </header>
  );
}

/** 返回键（原 P5.back(to)）：水波纹回到目标页 */
export function P5Back({ to = 'menu', onClick }: { to?: string; onClick?: (e: MouseEvent) => void }) {
  return (
    <button className="pg-back" data-back={to} aria-label="返回" onClick={(e) => { onClick?.(e); sfx('nav'); navigate(to, { via: 'water', origin: { x: e.clientX, y: e.clientY } }); }}>
      <P5StarIcon fill="var(--paper)" stroke="var(--ink)" sw={2} /><span>返回</span>
    </button>
  );
}
