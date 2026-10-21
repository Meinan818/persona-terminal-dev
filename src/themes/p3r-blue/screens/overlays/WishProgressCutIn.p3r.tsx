/**
 * 愿望进度 Cut-in（真实 src/components/wish/WishProgressCutIn.tsx → CelebrationCutIn theme=emerald，p3 斜切卡，2600ms 自动关，粒子 14）：
 *   icon ✧；标题 = 愿望名；副题「离这个愿望」；进度环 + 「+N% / 持平」+ 理由「这一下是真的往前了。/ 这次没往前，但路还在脚下。」
 *   +「已完成相关任务 N 次」+「 · 本地估算」（source=local）。delta=0 照实说「持平」。
 * 变体（独立条目）：?delta=12 前进 / ?delta=0 持平 / ?delta=20&to=100 满格（引导去「愿望已实现」）/ ?delta=8&source=local 本地估算。
 * 粉版环：旧进度先在，新增弧段推进（strokeDashoffset 一次）+ 增量数字计数。
 */
import { motion } from 'framer-motion';
import { useEffect, useState } from 'react';
import type { OverlayProps } from '@blue/registry/types';
import { CelebCard } from '@blue/screens/pkg2/cutins';
import { useBoldness } from '@blue/lib/prefs';
import { slantClip } from '@blue/kit';
import { navigate } from '@blue/shell/shellBus';

const deltaLabel = (d: number) => (d > 0 ? `+${d}%` : d < 0 ? `${d}%` : '持平');
function ProgressRing({ from, to, size = 64 }: { from: number; to: number; size?: number }) {
  const anim = useBoldness();
  const r = (size - 5) / 2; const c = 2 * Math.PI * r;
  const [shown, setShown] = useState(anim ? from : to);
  useEffect(() => {
    if (!anim) return;
    const t0 = performance.now() + 400; let raf = 0;
    const tick = (t: number) => { const k = Math.max(0, Math.min(1, (t - t0) / 700)); setShown(Math.round(from + (to - from) * k)); if (k < 1) raf = requestAnimationFrame(tick); };
    raf = requestAnimationFrame(tick); return () => cancelAnimationFrame(raf);
  }, [anim, from, to]);
  return (
    <div className="relative shrink-0" style={{ width: size, height: size }} role="img" aria-label={`离这个愿望 ${to}%`}>
      <svg width={size} height={size} className="-rotate-90" aria-hidden>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(255,255,255,0.28)" strokeWidth={5} />
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(255,248,240,0.55)" strokeWidth={5} strokeDasharray={c} strokeDashoffset={c * (1 - from / 100)} />
        <motion.circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--p3r-cream)" strokeWidth={5} strokeDasharray={c}
          initial={anim ? { strokeDashoffset: c * (1 - from / 100) } : false} animate={{ strokeDashoffset: c * (1 - to / 100) }} transition={{ duration: 0.7, delay: 0.4, ease: [0.2, 0.8, 0.2, 1] }} />
      </svg>
      <span className="absolute inset-0 flex items-center justify-center font-cond text-[17px] tabular" style={{ color: 'var(--p3r-cream)' }}>{shown}%</span>
    </div>
  );
}
export default function WishProgressCutIn({ open, onClose, params }: OverlayProps) {
  const anim = useBoldness();
  const delta = Number(params?.get('delta') ?? 12);
  const to = Number(params?.get('to') ?? (delta === 0 ? 58 : 58 + delta));
  const from = Math.max(0, to - delta);
  const local = params?.get('source') === 'local';
  const reach = to >= 100;
  const reason = reach ? '路走到头了——去按下「愿望已实现」吧。' : delta > 0 ? '这一下是真的往前了。' : '这次没往前，但路还在脚下。';
  return (
    <CelebCard open={open} onClose={onClose} theme={reach ? 'gold' : 'emerald'} autoCloseMs={reach ? 0 : 2600} particles={reach ? 24 : 14} eyebrow={reach ? 'WISH · 100%' : 'WISH PROGRESS'}
      icon={<span className="font-heavy text-[40px] leading-none">✧</span>} title="一年读完 24 本书" subtitle={reach ? '离这个愿望 · 到了' : '离这个愿望'}>
      <div className="mt-1 flex w-full items-center gap-3.5">
        <ProgressRing from={from} to={Math.min(100, to)} />
        <div className="min-w-0 flex-1 text-left">
          <motion.div className="font-cond text-[26px] leading-none tabular" style={{ color: 'var(--p3r-cream)' }}
            initial={anim ? { opacity: 0, x: -12 } : false} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.5 }}>{deltaLabel(delta)}</motion.div>
          <p className="mt-1 text-[12px] font-bold leading-relaxed" style={{ color: 'rgba(255,248,240,0.86)' }}>{reason}</p>
          <p className="mt-0.5 text-[11px] font-bold" style={{ color: 'rgba(255,248,240,0.62)' }}>已完成相关任务 {local ? 5 : 17} 次{local && ' · 本地估算'}</p>
        </div>
      </div>
      {local && <p className="mt-3 px-3 py-1 text-left text-[11px] font-bold" style={{ background: 'rgba(255,255,255,0.14)', color: 'rgba(255,248,240,0.86)', clipPath: slantClip(6) }}>还没配 AI：按挂上来的记录次数在本机估的，配好后会更准。</p>}
      {reach && (
        <motion.button type="button" onClick={() => { onClose(); navigate('actions', 'todos', { params: { pane: 'wish' } }); }} className="mt-4 w-full py-2.5 text-[14px] font-black"
          style={{ background: 'var(--p3r-cream)', color: 'var(--p3r-mulberry)', clipPath: slantClip(10) }} initial={anim ? { opacity: 0, y: 10 } : false} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.9 }}>
          去实现它 ›
        </motion.button>
      )}
    </CelebCard>
  );
}
