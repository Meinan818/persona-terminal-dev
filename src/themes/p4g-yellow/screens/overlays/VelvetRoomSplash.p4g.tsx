/**
 * VelvetRoomSplash.p4g —— 开屏「MASKARIA」默认（真实 splash/VelvetRoomSplash.tsx；splashStyle 缺省 velvet）。
 * 真实分镜：镜头推门 → 门扇开启 → 白光 → 标题浮出 + 上下两条大字 MASKARIA 划过 → 水波纹 + 粒子收尾。
 * P4G 版：午夜频道 —— 雨夜和室里自己亮起的电视（splash-midnight）镜头推进 → 电视屏幕吞没画面（白光）→
 *   黄色舞台上 MASKARIA 逐字砸出 + 上下两条大字横穿 → 黄色同心环扩散收尾 → 首页。
 * 交互：全屏任意点击 = 跳过到标题段（skip）。只动 transform/opacity；低动效 / reduced 直接落到标题段。
 */
import { AnimatePresence, motion } from 'framer-motion';
import { useEffect, useState } from 'react';
import type { OverlayProps } from '@yellow/registry/types';
import { Portal, P4Outline } from '@yellow/kit';
import { FogRain, NoiseLayer } from '@yellow/fx';
import { useLowMotion } from '@yellow/lib/prefs';
import { p4gAsset } from '@yellow/lib/asset';

type Phase = 'push' | 'flash' | 'title' | 'out';

export function VelvetSplashP4G({ onComplete, s = 1, reduced }: { onComplete: () => void; s?: number; reduced?: boolean }) {
  const low = useLowMotion() || !!reduced;
  const [phase, setPhase] = useState<Phase>(low ? 'title' : 'push');
  const portrait = typeof window !== 'undefined' && window.innerHeight > window.innerWidth;
  useEffect(() => {
    if (phase === 'push') { const t = setTimeout(() => setPhase('flash'), 2100 * s); return () => clearTimeout(t); }
    if (phase === 'flash') { const t = setTimeout(() => setPhase('title'), 380 * s); return () => clearTimeout(t); }
    if (phase === 'title') { const t = setTimeout(() => setPhase('out'), (low ? 900 : 1950) * s); return () => clearTimeout(t); }
    if (phase === 'out') { const t = setTimeout(onComplete, 420); return () => clearTimeout(t); }
  }, [phase, s, low, onComplete]);
  const skip = () => { if (phase === 'push' || phase === 'flash') setPhase('title'); };

  return (
    <motion.div className="fixed inset-0 cursor-pointer overflow-hidden bg-black" style={{ zIndex: 'var(--p4g-z-system)' as unknown as number }} onClick={skip}
      role="button" aria-label="MASKARIA 开屏（点击跳过）" animate={{ opacity: phase === 'out' ? 0 : 1 }} transition={{ duration: 0.4 }}>
      {/* ① 镜头推进：电视在 (50%,58%) / 横版 (47%,52%) */}
      {(phase === 'push' || phase === 'flash') && (
        <motion.div className="absolute inset-0" style={{ backgroundImage: `url(${p4gAsset(portrait ? 'splash-midnight.webp' : 'splash-midnight-wide.webp')})`, backgroundSize: 'cover', backgroundPosition: 'center 60%', transformOrigin: portrait ? '50% 58%' : '47% 52%' }}
          initial={{ scale: 1, rotate: -2 }} animate={{ scale: phase === 'flash' ? 4.2 : 2.4, rotate: 0 }} transition={{ duration: phase === 'flash' ? 0.38 * s : 2.1 * s, ease: phase === 'flash' ? [0.7, 0, 0.84, 0] : [0.4, 0, 0.2, 1] }}>
          <FogRain rain fog intensity={0.7} />
        </motion.div>
      )}
      {phase === 'push' && (
        <motion.div className="pointer-events-none absolute left-1/2 top-[14%] -translate-x-1/2 text-center" initial={{ opacity: 0 }} animate={{ opacity: [0, 1, 1, 0] }} transition={{ duration: 2 * s, times: [0, 0.2, 0.8, 1] }}>
          <div className="font-display text-meta font-bold tracking-[0.5em] text-p4g-yellow">MIDNIGHT CHANNEL</div>
          <div className="mt-1 p4g-num text-h2 text-white/80">00:00</div>
        </motion.div>
      )}
      {/* ② 白光（屏幕吞没）*/}
      <AnimatePresence>{phase === 'flash' && <motion.div key="f" className="absolute inset-0 bg-white" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.3 * s }} />}</AnimatePresence>
      {/* ③ 标题 */}
      {(phase === 'title' || phase === 'out') && (
        <div className="absolute inset-0 flex items-center justify-center bg-p4g-yellow" style={{ backgroundImage: `url(${p4gAsset('paper-collage.webp')})`, backgroundSize: '320px' }}>
          {[{ top: '14%', from: '100%', to: '-100%' }, { top: '76%', from: '-100%', to: '100%' }].map((m, i) => (
            <motion.div key={i} aria-hidden className="absolute left-0 whitespace-nowrap font-display font-bold italic leading-none text-p4g-black/90" style={{ top: m.top, fontSize: "min(18vw, 30vh, 200px)" }}
              initial={{ x: low ? '0%' : m.from }} animate={{ x: low ? '0%' : m.to }} transition={{ duration: 3.4 * s, ease: 'linear' }}>MASKARIA MASKARIA</motion.div>
          ))}
          {!low && [0, 1, 2].map((k) => (
            <motion.span key={k} aria-hidden className="absolute left-1/2 top-1/2 -ml-[30vmin] -mt-[30vmin] h-[60vmin] w-[60vmin] rounded-pill border-[8px] border-p4g-orange"
              initial={{ scale: 0.2, opacity: 0.8 }} animate={{ scale: 2.4, opacity: 0 }} transition={{ duration: 1.4, delay: 0.5 + k * 0.25 }} />
          ))}
          <div className="relative flex flex-col items-center px-4" aria-label="MASKARIA">
            <div className="flex">
              {'MASKARIA'.split('').map((ch, i) => (
                <motion.span key={i} initial={low ? { opacity: 0 } : { y: -60, opacity: 0, rotate: -20 }} animate={{ y: 0, opacity: 1, rotate: 0 }} transition={{ duration: 0.2, delay: low ? 0 : 0.06 * i, ease: [0.2, 0.9, 0.1, 1] }}>
                  <P4Outline size="min(10.5vw, 20vh, 128px)" stroke={9} fill="#fff" strokeColor="#000" italic>{ch}</P4Outline>
                </motion.span>
              ))}
            </div>
            <motion.div className="mt-2 bg-p4g-black px-3 py-1 font-display text-[clamp(13px,3.6vw,20px)] font-bold tracking-[0.4em] text-p4g-yellow" initial={{ opacity: 0, scaleX: 0 }} animate={{ opacity: 1, scaleX: 1 }} transition={{ delay: low ? 0 : 0.6, duration: 0.2 }}>面具庭园</motion.div>
          </div>
          <NoiseLayer opacity={0.06} />
        </div>
      )}
      {(phase === 'push' || phase === 'flash') && <span className="pointer-events-none absolute bottom-[calc(18px+env(safe-area-inset-bottom))] left-1/2 -translate-x-1/2 font-display text-meta font-bold tracking-[0.3em] text-white/60">TAP TO SKIP</span>}
    </motion.div>
  );
}

export default function VelvetRoomSplash({ open, onClose, params }: OverlayProps) {
  return <Portal>{open ? <VelvetSplashP4G onComplete={onClose} reduced={params?.get('state') === 'reduced'} /> : null}</Portal>;
}
