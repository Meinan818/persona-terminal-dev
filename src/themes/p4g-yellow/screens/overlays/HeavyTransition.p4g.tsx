/**
 * HeavyTransition.p4g —— 重转场演出（真实 transition/HeavyTransition.tsx）：
 *   shell-transition-wedge  P4 楔形切台（轮盘松手跳转 / 仪式点）：五色信号带斜扫铺满 → 全遮时刻切页 → 续扫出右缘；D0 直接切
 *   shell-transition-water  底栏涨潮（底导点击切页）：P4G 版改为从指尖处涨起黄色方块 → 幕后切页 → 退潮
 * 演示：舞台上两页「节目 A / 节目 B」互切。楔形：点「再播一次」；涨潮：点画面任意处从该点起潮。
 */
import { useState } from 'react';
import type { OverlayProps } from '@yellow/registry/types';
import { P4Button, P4Card, P4Outline } from '@yellow/kit';
import { WedgeCut, TideSquares } from '@yellow/screens/pkg1/HeavyTransitions';

function DemoPage({ b }: { b: boolean }) {
  return (
    <P4Card tone={b ? 'black' : 'yellow'} cut="br" padding="lg" className="mx-auto w-full max-w-[520px]">
      <div className="font-display text-2xs font-bold uppercase tracking-[0.24em] opacity-80">{b ? 'NOW ON AIR · CH 05' : 'NOW ON AIR · CH 04'}</div>
      <P4Outline size="clamp(36px,10vw,64px)" stroke={6} italic>{b ? '节目 B' : '节目 A'}</P4Outline>
      <p className="mt-2 text-body opacity-80">全遮时刻（onCovered）在幕后切页，再退场。</p>
    </P4Card>
  );
}

function Host({ kind, open, onClose }: OverlayProps & { kind: 'wedge' | 'water' }) {
  const [b, setB] = useState(false);
  const [run, setRun] = useState(0);
  const [origin, setOrigin] = useState<{ x: number; y: number } | null>(null);
  const play = (o?: { x: number; y: number }) => { setOrigin(o ?? { x: window.innerWidth / 2, y: window.innerHeight - 40 }); setRun((r) => r + 1); };
  if (!open) return null;
  return (
    <div className="relative z-10 flex min-h-screen flex-col items-center justify-center gap-6 px-4 pt-16" onClick={(e) => kind === 'water' && play({ x: e.clientX, y: e.clientY })}>
      <DemoPage b={b} />
      <div className="flex flex-wrap justify-center gap-2" onClick={(e) => e.stopPropagation()}>
        <P4Button variant="black" onClick={() => play()}>{kind === 'wedge' ? '再播一次（楔形切台）' : '从底栏中央涨潮'}</P4Button>
        <P4Button variant="secondary" onClick={onClose}>关闭</P4Button>
      </div>
      {kind === 'water' && <p className="p4g-outline-sm font-display text-body font-bold">点画面任意处：从该点涨潮</p>}
      {kind === 'wedge'
        ? <WedgeCut key={run} active={run > 0} onCovered={() => setB((v) => !v)} />
        : <TideSquares key={run} active={run > 0} origin={origin} onCovered={() => setB((v) => !v)} />}
    </div>
  );
}

export function WaterRippleOverlay(p: OverlayProps) { return <Host kind="water" {...p} />; }
export default function HeavyTransition(p: OverlayProps) { return <Host kind="wedge" {...p} />; }
