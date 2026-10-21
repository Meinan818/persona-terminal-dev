/**
 * 重转场（对应真实 components/transition/HeavyTransition.tsx 的 P4 演出）。原 pkg1 实现，已提升进 fx 并由外壳接入：
 *   底导切页 → TideSquares（从指尖涨潮）；轮盘跳转 → WedgeCut。
 *   <WedgeCut active onCovered onDone />      P4 楔形切台：五色信号带 -20° 斜扫铺满 → 全遮时刻 onCovered（切页）→ 续扫出右缘
 *   <TideSquares active origin onCovered onDone />  底栏涨潮（原 WaterRippleAct）P4G 版：从点击点按距离逐格涨起黄色方块 → 切页 → 退潮
 * D0 / 低动效：不演出，同步执行 onCovered + onDone（真实「Layer 拒接请求 → director 同步执行 midpoint」）。
 * 只动 transform / opacity；方块用 CSS keyframes（合成器线程）。
 */
import { useEffect, useMemo, useRef, useState } from 'react';
import { useLowMotion } from '@yellow/lib/prefs';
import { P4Outline } from '@yellow/kit';

interface TransProps { active: boolean; onCovered?: () => void; onDone?: () => void }

const BANDS = ['var(--p4g-yellow)', 'var(--p4g-orange)', 'var(--p4g-white)', 'var(--p4g-cyan)', '#111'];

export function WedgeCut({ active, onCovered, onDone }: TransProps) {
  const low = useLowMotion();
  const cb = useRef({ onCovered, onDone }); cb.current = { onCovered, onDone };
  const [stage, setStage] = useState<'idle' | 'in' | 'out'>('idle');
  useEffect(() => {
    if (!active) return;
    if (low) { cb.current.onCovered?.(); cb.current.onDone?.(); return; }
    setStage('in');
    const t1 = setTimeout(() => { cb.current.onCovered?.(); setStage('out'); }, 420);
    const t2 = setTimeout(() => { setStage('idle'); cb.current.onDone?.(); }, 900);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, [active, low]);
  if (stage === 'idle') return null;
  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 overflow-hidden" style={{ zIndex: 'var(--p4g-z-transition)' as unknown as number }}>
      <style>{`
        @keyframes p1-wedge-in { from { transform: translate3d(-140%,0,0) skewX(-20deg); } to { transform: translate3d(0,0,0) skewX(-20deg); } }
        @keyframes p1-wedge-out { from { transform: translate3d(0,0,0) skewX(-20deg); } to { transform: translate3d(140%,0,0) skewX(-20deg); } }
      `}</style>
      {BANDS.map((c, i) => (
        <div key={i} className="absolute -left-[30%] h-[22%] w-[160%] border-y-[3px] border-black" style={{ top: `${i * 20 - 1}%`, background: c, animation: `${stage === 'in' ? 'p1-wedge-in' : 'p1-wedge-out'} ${stage === 'in' ? 0.34 : 0.4}s cubic-bezier(.2,.9,.1,1) ${i * 0.02}s both` }} />
      ))}
      {stage === 'in' && (
        <div className="absolute inset-0 flex items-center justify-center" style={{ animation: 'p1-wedge-in .34s cubic-bezier(.2,.9,.1,1) .06s both' }}>
          <P4Outline size="clamp(40px,12vw,110px)" stroke={8} fill="#fff" strokeColor="#000" italic>CH 04</P4Outline>
        </div>
      )}
    </div>
  );
}

export function TideSquares({ active, origin, onCovered, onDone, cell = 84 }: TransProps & { origin: { x: number; y: number } | null; cell?: number }) {
  const low = useLowMotion();
  const cb = useRef({ onCovered, onDone }); cb.current = { onCovered, onDone };
  const [stage, setStage] = useState<'idle' | 'in' | 'out'>('idle');
  const grid = useMemo(() => {
    if (typeof window === 'undefined') return { cols: 0, rows: 0 };
    return { cols: Math.ceil(window.innerWidth / cell) + 1, rows: Math.ceil(window.innerHeight / cell) + 1 };
  }, [cell, active]); // eslint-disable-line
  useEffect(() => {
    if (!active) return;
    if (low) { cb.current.onCovered?.(); cb.current.onDone?.(); return; }
    setStage('in');
    const t1 = setTimeout(() => { cb.current.onCovered?.(); setStage('out'); }, 520);
    const t2 = setTimeout(() => { setStage('idle'); cb.current.onDone?.(); }, 1080);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, [active, low]);
  if (stage === 'idle' || !origin) return null;
  const maxD = Math.hypot(window.innerWidth, window.innerHeight);
  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 overflow-hidden" style={{ zIndex: 'var(--p4g-z-transition)' as unknown as number }}>
      <style>{`
        @keyframes p1-tide-in { from { transform: scale(0) rotate(45deg); } to { transform: scale(1.04) rotate(0deg); } }
        @keyframes p1-tide-out { from { transform: scale(1.04) rotate(0deg); } to { transform: scale(0) rotate(-45deg); } }
      `}</style>
      {Array.from({ length: grid.rows }, (_, r) => Array.from({ length: grid.cols }, (_, c) => {
        const cx = c * cell + cell / 2, cy = r * cell + cell / 2;
        const d = Math.hypot(cx - origin.x, cy - origin.y) / maxD;
        const shade = (r + c) % 3 === 0 ? 'var(--p4g-yellow-hi)' : 'var(--p4g-yellow)';
        return (
          <span key={`${r}-${c}`} className="absolute rounded-[10px]" style={{ left: c * cell, top: r * cell, width: cell, height: cell, background: shade, animation: `${stage === 'in' ? 'p1-tide-in' : 'p1-tide-out'} .26s cubic-bezier(.2,.9,.1,1) ${(d * 0.3).toFixed(3)}s both` }} />
        );
      }))}
    </div>
  );
}
