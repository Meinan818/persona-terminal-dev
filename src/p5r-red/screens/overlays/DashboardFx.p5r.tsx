/**
 * 首页演出单播（fxCatalog：fx-sky-flip / fx-ritual-stack / fx-countercurrent / fx-flower-zoom）。直接复用 DashboardP5.p5r.tsx 导出的件，
 * 在默认舞台上单独演示：
 *   ?variant=sky        日期纸卡天空位：600ms 后自动 月相 → 天气（翻牌 scaleX）
 *   ?variant=ritual     今日仪式轮播（6s 自动；本预览 2.2s 后翻到下一张）
 *   ?variant=countercurrent  逆流预警出现 → 轮播跳回第一页
 *   ?variant=flower     人格星象：雷达星旋转放大 → 原地档案（自动点「知识」）
 */
import { useEffect, useRef, useState } from 'react';
import type { OverlayProps } from '@/p5r-red/registry/types';
import { Portal } from '@/p5r-red/kit/Portal';
import { DateCardP5, RitualCarouselP5 } from '@/p5r-red/screens/pages/DashboardP5.p5r';
import { PersonaRadar } from '@/p5r-red/fx/radar';
import { D } from '@/p5r-red/mock/data';

export default function DashboardFx({ open, params }: OverlayProps) {
  const v = params?.get('variant') ?? 'ritual';
  const box = useRef<HTMLDivElement>(null);
  const [cc, setCc] = useState(false);
  useEffect(() => {
    if (!open) return;
    const ts: number[] = [];
    if (v === 'sky') ts.push(window.setTimeout(() => box.current?.querySelector<HTMLButtonElement>('.hm-sky')?.click(), 600));
    if (v === 'ritual') ts.push(window.setTimeout(() => box.current?.querySelectorAll<HTMLButtonElement>('.p5-stack-dots button')[1]?.click(), 2200));
    if (v === 'countercurrent') { box.current?.querySelectorAll<HTMLButtonElement>('.p5-stack-dots button')[1]?.click(); ts.push(window.setTimeout(() => setCc(true), 900)); }
    if (v === 'flower') ts.push(window.setTimeout(() => box.current?.querySelector<HTMLElement>('[data-attr="knowledge"], .rd-lb')?.click(), 700));
    return () => ts.forEach(clearTimeout);
  }, [open, v]);
  if (!open) return null;
  return (
    <Portal>
      <div ref={box} className="home2" style={{ position: 'fixed', left: '50%', top: '50%', transform: 'translate(-50%,-50%)', width: 'min(440px, 92vw)', zIndex: 700, margin: 0 }}>
        {v === 'sky' && <div className="hm-head" style={{ gridTemplateColumns: '1fr' }}><DateCardP5 initialSky="moon" /></div>}
        {(v === 'ritual' || v === 'countercurrent') && <section className="hm-ritual"><RitualCarouselP5 countercurrent={cc} drawn={false} /></section>}
        {v === 'flower' && <section className="hm-persona"><div className="h-radar"><PersonaRadar attrs={D.attrs} maxLevel={D.maxLevel} fitHeight /></div></section>}
      </div>
    </Portal>
  );
}
