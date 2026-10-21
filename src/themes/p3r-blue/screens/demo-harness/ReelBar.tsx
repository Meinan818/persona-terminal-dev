/** 演出总览连播控制条（顶部细条）：n/N · 标题 · 暂停 / 上一个 / 下一个 / 停止；按 fxMs 自动前进。 */
import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { useReel, stepReel, pauseReel, stopReel } from '@blue/lib/reel';
import { P3R, slantClip } from '@blue/kit/base';

export function ReelBar() {
  const r = useReel();
  const [t0, setT0] = useState(Date.now());
  useEffect(() => { setT0(Date.now()); }, [r?.i]);
  useEffect(() => {
    if (!r || r.paused) return;
    const left = Math.max(400, r.ms[r.i] - (Date.now() - t0));
    const t = window.setTimeout(() => stepReel(1), left);
    return () => clearTimeout(t);
  }, [r, t0]);
  if (!r) return null;
  const B = ({ l, on, f }: { l: string; on?: boolean; f: () => void }) => (
    <button type="button" onClick={f} className="h-7 shrink-0 px-2.5 text-[12px] font-black" style={{ clipPath: slantClip(5), background: on ? P3R.blue : 'rgba(255,255,255,0.14)', color: '#fff' }}>{l}</button>
  );
  return (
    <div className="fixed inset-x-0 top-0 flex items-center gap-2 px-3 py-1.5" style={{ zIndex: 'var(--p3r-z-dev)' as unknown as number, background: 'var(--p3r-mulberry)' }} role="region" aria-label="演出总览连播">
      <span className="shrink-0 font-cond text-[13px]" style={{ color: 'var(--bk-bubble-a)' }}>REEL {r.i + 1}/{r.ids.length}</span>
      <span className="min-w-0 flex-1 truncate text-[12px] font-black text-white">{r.titles[r.i]}</span>
      <B l="◀" f={() => stepReel(-1)} />
      <B l={r.paused ? '▶' : 'Ⅱ'} on={r.paused} f={() => { pauseReel(!r.paused); setT0(Date.now()); }} />
      <B l="▶▶" f={() => stepReel(1)} />
      <B l="✕" f={() => stopReel(true)} />
      {!r.paused && <motion.span key={r.i} className="absolute bottom-0 left-0 h-[2px] w-full origin-left" style={{ background: P3R.blue }} initial={{ scaleX: 0 }} animate={{ scaleX: 1 }} transition={{ duration: r.ms[r.i] / 1000, ease: 'linear' }} />}
    </div>
  );
}
