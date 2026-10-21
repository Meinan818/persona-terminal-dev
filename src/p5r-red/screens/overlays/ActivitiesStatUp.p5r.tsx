/**
 * STAT UP 属性提升通知（红色独有 red-statup；v3 pages_a.js P5.statUp 原样迁移）：记录保存后，每个加点属性一行
 * 「红星爆 + 属性名 + UP! + +N」从右横穿砸入（spring 360/24，间隔 .12；UP! 印章 300ms 延迟 260+i*120），1.9s 后淡出卸载。
 * 只动 transform / opacity；低动效 = 直接显示终态 900ms。
 *   ?attrs=knowledge:3,guts:1   自定行
 */
import { createRoot } from 'react-dom/client';
import { useEffect } from 'react';
import type { OverlayProps } from '@/p5r-red/registry/types';
import { P5BurstImg } from '@/p5r-red/kit/P5BurstImg';
import { spring } from '@/p5r-red/fx/spring';
import { sfx } from '@/p5r-red/fx/sfx';
import { lerp } from '@/p5r-red/lib/rng';
import { isLowMotion } from '@/p5r-red/lib/prefs';
import { ATTR, type AttrId } from '@/p5r-red/mock/data';

export function playStatUp(attrs: Partial<Record<AttrId, number>>, onDone?: () => void) {
  sfx('level', 0.54);
  const low = isLowMotion();
  const v = document.createElement('div'); v.className = 'statup'; document.body.appendChild(v);
  const root = createRoot(v);
  const rows = Object.entries(attrs).filter(([, n]) => (n ?? 0) > 0) as [AttrId, number][];
  root.render(<>{rows.map(([k, n], i) => (
    <div key={k} className="su-row" style={{ ['--i' as string]: i, transform: low ? undefined : 'translateX(110vw) skewX(-20deg)' }}>
      <span className="su-burst"><P5BurstImg sz={120} rot={i * 20} /></span><b className="su-n">{ATTR[k].name}</b><span className="su-up">UP!</span><em className="su-p">+{n}</em>
    </div>
  ))}</>);
  requestAnimationFrame(() => {
    if (low) return;
    v.querySelectorAll<HTMLElement>('.su-row').forEach((r, i) => {
      spring({ stiffness: 360, damping: 24, delay: i * 0.12, onUpdate: (p) => { r.style.transform = `translateX(${lerp(110, 0, p)}vw) skewX(${lerp(-20, 0, p)}deg)`; } });
      r.querySelector('.su-up')!.animate([{ transform: 'scale(2.4) rotate(-20deg)', opacity: 0 }, { transform: 'scale(1) rotate(-8deg)', opacity: 1 }], { duration: 300, delay: 260 + i * 120, easing: 'cubic-bezier(.15,.95,.1,1)', fill: 'both' });
    });
  });
  setTimeout(() => {
    v.animate([{ opacity: 1 }, { opacity: 0, transform: 'translateX(-40px)' }], { duration: 260, fill: 'both' }).onfinish = () => { root.unmount(); v.remove(); onDone?.(); };
  }, low ? 900 : 1900);
}

export default function ActivitiesStatUp({ open, onClose, params }: OverlayProps) {
  useEffect(() => {
    if (!open) return;
    const q = params?.get('attrs') ?? 'knowledge:3,guts:1';
    const attrs = Object.fromEntries(q.split(',').map((p) => p.split(':')).filter(([k]) => k in ATTR).map(([k, n]) => [k, Number(n) || 1])) as Partial<Record<AttrId, number>>;
    playStatUp(attrs, onClose);
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps
  return null;
}
