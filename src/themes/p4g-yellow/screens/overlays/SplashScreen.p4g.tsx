/**
 * SplashScreen.p4g —— 开屏「黄色警戒线」（真实 SplashScreen.tsx#P4Splash）。无按钮，全屏自动播放，≈2.8s × 速率。
 * 分镜：VHS 雪花（phase 0）→ 信号进入：彩条一闪 + 两条斜向 MASKARIA 警戒线交错滚动（phase 1）→
 *   标题闪现：MASKARIA 主标 + 红底黑字副标 + CHANNEL / 04 角标 + REC 00:00:04:12（phase 2）→
 *   电视关机：横线收束成光点 → onComplete。
 * 速率：?speed=fast|normal|slow（设置→开屏速度 快 0.7 / 正常 1 / 慢 1.4）；
 * 安全模式轻开屏：?state=reduced（速率封顶 0.35，几乎直跳 + 极短淡出）。低动效同 reduced。
 */
import { motion } from 'framer-motion';
import { useEffect, useState } from 'react';
import type { OverlayProps } from '@yellow/registry/types';
import { Portal, P4Outline, SlotImg } from '@yellow/kit';
import { NoiseLayer } from '@yellow/fx';
import { useLowMotion } from '@yellow/lib/prefs';
import { p4gAsset } from '@yellow/lib/asset';

const SPEED: Record<string, number> = { fast: 0.7, normal: 1, slow: 1.4 };
const TAPE_A = '⚠ MASKARIA ⚠ CAUTION ⚠ MASKARIA ⚠ DANGER ⚠ MASKARIA ⚠ CAUTION ⚠ MASKARIA ⚠ DANGER ⚠ MASKARIA ⚠ CAUTION ⚠ MASKARIA ⚠ DANGER ';
const TAPE_B = 'MASKARIA ▪ MASKARIA ▪ MASKARIA ▪ MASKARIA ▪ MASKARIA ▪ MASKARIA ▪ MASKARIA ▪ MASKARIA ▪ ';

export function P4SplashP4G({ onComplete, s }: { onComplete: () => void; s: number }) {
  const low = useLowMotion();
  const [phase, setPhase] = useState(0);
  const quick = s <= 0.35 || low;
  useEffect(() => {
    const t1 = setTimeout(() => setPhase(1), 280 * s);
    const t2 = setTimeout(() => setPhase(2), 1000 * s);
    const t3 = setTimeout(() => setPhase(3), 2500 * s);
    const t4 = setTimeout(onComplete, 2800 * s + (quick ? 120 : 300));
    return () => { [t1, t2, t3, t4].forEach(clearTimeout); };
  }, [onComplete, s, quick]);

  const off = phase === 3;
  return (
    <motion.div className="fixed inset-0 overflow-hidden bg-[#0d0d0d]" style={{ zIndex: 'var(--p4g-z-system)' as unknown as number }}
      initial={{ opacity: 1 }} exit={{ opacity: 0, transition: { duration: quick ? 0.12 : 0.2 } }} aria-label="MASKARIA 开屏" role="img">
      <motion.div className="absolute inset-0 origin-center bg-[#0d0d0d]"
        animate={off && !quick ? { scaleY: [1, 0.012, 0.012], scaleX: [1, 1, 0.01], opacity: [1, 1, 0] } : { scaleY: 1, scaleX: 1, opacity: off ? 0 : 1 }}
        transition={{ duration: quick ? 0.12 : 0.3 * Math.max(s, 0.5), times: [0, 0.55, 1], ease: [0.7, 0, 0.3, 1] }}>
        {/* phase 0：VHS 雪花 */}
        <NoiseLayer opacity={phase === 0 ? 0.95 : 0.18} />
        {/* phase 1：彩条一闪 */}
        {phase >= 1 && !quick && (
          <motion.div className="absolute inset-0" style={{ backgroundImage: `url(${p4gAsset('color-bars.webp')})`, backgroundSize: 'cover' }}
            initial={{ opacity: 0.9 }} animate={{ opacity: phase >= 2 ? 0 : 0.5 }} transition={{ duration: 0.3 }} />
        )}
        {/* 黄色舞台 + 警戒线 */}
        {phase >= 1 && (
          <motion.div className="absolute inset-0 bg-p4g-yellow" initial={quick ? { opacity: 0 } : { scaleY: 0.03 }} animate={quick ? { opacity: 1 } : { scaleY: 1 }} transition={{ duration: 0.28 * s, ease: [0.2, 0.9, 0.1, 1] }}
            style={{ backgroundImage: `url(${p4gAsset('paper-collage.webp')})`, backgroundSize: '320px' }}>
            {[{ top: '18%', rot: -14, text: TAPE_A, dir: -1, bg: '#111', fg: 'var(--p4g-yellow)' }, { top: '70%', rot: 10, text: TAPE_B, dir: 1, bg: 'var(--p4g-yellow)', fg: '#111' }].map((t, i) => (
              <div key={i} aria-hidden data-qa-ignore className="absolute left-[-20%] right-[-20%] overflow-hidden border-y-[5px] border-p4g-black py-1.5" style={{ top: t.top, rotate: `${t.rot}deg`, background: t.bg }}>
                <motion.div className="whitespace-nowrap font-display text-[clamp(16px,4.6vw,28px)] font-bold tracking-[0.12em]" style={{ color: t.fg }}
                  animate={quick ? undefined : { x: t.dir < 0 ? ['0%', '-30%'] : ['-30%', '0%'] }} transition={{ duration: 3 * s, ease: 'linear' }}>
                  {t.text}{t.text}
                </motion.div>
              </div>
            ))}
          </motion.div>
        )}
        {/* phase 2：标题 */}
        {phase >= 2 && (
          <div className="absolute inset-0 flex flex-col items-center justify-center px-6">
            <motion.div initial={quick ? { opacity: 0 } : { scale: 2.2, opacity: 0, rotate: -6 }} animate={{ scale: 1, opacity: 1, rotate: -4 }} transition={{ duration: 0.22, ease: [0.2, 0.9, 0.1, 1] }} className="max-w-full">
              <SlotImg slot="logo" fallback="" alt="MASKARIA" className="mx-auto max-h-[28vh] max-w-[80vw] object-contain"
                fallbackNode={<P4Outline size="min(15vw, 22vh, 150px)" stroke={10} fill="#fff" strokeColor="#000" italic>MASKARIA</P4Outline>} />
            </motion.div>
            <motion.div className="mt-3 bg-p4g-black px-4 py-1" style={{ rotate: '-4deg' }} initial={quick ? { opacity: 0 } : { scaleX: 0 }} animate={{ scaleX: 1, opacity: 1 }} transition={{ duration: 0.2, delay: quick ? 0 : 0.18 }}>
              <span className="font-display text-[clamp(14px,4vw,24px)] font-bold tracking-[0.5em] text-p4g-red">MASKARIA</span>
            </motion.div>
          </div>
        )}
        {/* 角标 */}
        {phase >= 1 && (
          <>
            <div className="absolute left-4 top-[calc(14px+env(safe-area-inset-top))] flex items-center gap-2 rounded-xs bg-p4g-yellow px-2 py-1 shadow-[2px_2px_0_#000]">
              <span className="h-2.5 w-2.5 rounded-pill bg-p4g-red" style={{ animation: low ? undefined : 'p4g-blink 0.8s steps(1) infinite' }} />
              <span className="font-display text-meta font-bold tracking-wider text-black">REC</span>
            </div>
            <div className="absolute bottom-[calc(16px+env(safe-area-inset-bottom))] left-4 rounded-xs bg-p4g-yellow px-2 py-1 font-mono text-meta font-bold tracking-wider text-black shadow-[2px_2px_0_#000]">00:00:04:12</div>
            <div className="absolute right-4 top-[calc(14px+env(safe-area-inset-top))] flex flex-col items-end">
              <span className="font-display text-meta font-bold tracking-[0.3em] text-black">CHANNEL</span>
              <P4Outline size={44} stroke={6} fill="#fff" strokeColor="#000" italic>04</P4Outline>
            </div>
          </>
        )}
        <div aria-hidden className="pointer-events-none absolute inset-0" style={{ backgroundImage: 'repeating-linear-gradient(0deg, rgba(0,0,0,.18) 0 1px, transparent 1px 3px)' }} />
      </motion.div>
      {/* 关机光点 */}
      {off && !quick && <motion.div className="absolute left-1/2 top-1/2 h-2 w-2 -translate-x-1/2 -translate-y-1/2 rounded-pill bg-white" initial={{ opacity: 0, scale: 1 }} animate={{ opacity: [0, 1, 0], scale: [1, 1.6, 0] }} transition={{ duration: 0.36, delay: 0.16 }} />}
    </motion.div>
  );
}

export default function SplashScreen({ open, onClose, params }: OverlayProps) {
  const reduced = params?.get('state') === 'reduced';
  const s = reduced ? Math.min(0.35, SPEED[params?.get('speed') ?? 'normal'] ?? 1) : SPEED[params?.get('speed') ?? 'normal'] ?? 1;
  return <Portal>{open ? <P4SplashP4G key={String(open)} s={s} onComplete={onClose} /> : null}</Portal>;
}
