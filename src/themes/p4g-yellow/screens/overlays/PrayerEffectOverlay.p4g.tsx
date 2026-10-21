/**
 * 祈愿特效（真实 PrayerEffectOverlay）：送出 = A PRAYER SENT / 愿望已送达；互祈 = RECIPROCAL / 愿望之光交汇。
 * P4G 版：黑幕 → 外圈辐射环 + 中心四角星爆闪 + 放射彩条 + 飞散星粒 → 白字黑描边英文 + 中文副标 → 自动收（点任意处跳过）。
 * 两态差异照抄真实（红色审计回补 2026-10-21）：
 *   时长 sent 1800ms / reciprocal 2400ms（DURATION_SENT / DURATION_RECIP）；星粒 10 颗·半径 140（错开 π/8）/ 16 颗·半径 180；
 *   外圈环放大 2.6× / 3.2×、1.0s / 1.4s；中心星 sent 不转、reciprocal 从 -30° 转入再收 10°（2.0s）；互祈多一颗副星交汇。
 * #/overlay/bond-prayer-fx?kind=sent|reciprocal
 */
import { AnimatePresence, motion } from 'framer-motion';
import { useEffect, useMemo } from 'react';
import type { OverlayProps } from '@yellow/registry/types';
import { P4Outline, Portal } from '@yellow/kit';
import { useLowMotion } from '@yellow/lib/prefs';
import { Sparkle } from '@yellow/screens/pkg3/ui';

export type PrayerEffectKind = 'sent' | 'reciprocal';

export function PrayerEffect({ isOpen, kind, targetName, onDismiss }: { isOpen: boolean; kind: PrayerEffectKind; targetName: string; onDismiss: () => void }) {
  const low = useLowMotion();
  const isRecip = kind === 'reciprocal';
  // 真实：sent 1800 / reciprocal 2400（低动效同时长，只是不演粒子与环）
  useEffect(() => { if (!isOpen) return; const t = window.setTimeout(onDismiss, isRecip ? 2400 : 1800); return () => clearTimeout(t); }, [isOpen, isRecip, onDismiss]);
  const particles = useMemo(() => {
    const count = isRecip ? 16 : 10; const dist = isRecip ? 180 : 140;
    return Array.from({ length: count }, (_, i) => { const a = (Math.PI * 2 * i) / count + (isRecip ? 0 : Math.PI / 8); return { tx: Math.cos(a) * dist, ty: Math.sin(a) * dist, delay: i * 0.02, size: 6 + ((i * 7) % 4) }; });
  }, [isRecip]);
  return (
    <Portal>
      <AnimatePresence>
        {isOpen && (
          <motion.div key="pray" role="status" onClick={onDismiss} className="fixed inset-0 flex cursor-pointer items-center justify-center overflow-hidden bg-p4g-black/80" style={{ zIndex: 'var(--p4g-z-celebration)' as unknown as number }} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            {!low && Array.from({ length: 12 }, (_, i) => (
              <motion.span key={i} aria-hidden className="absolute left-1/2 top-1/2 h-[3px] w-[60vmax] origin-left" style={{ rotate: i * 30, background: i % 3 === 0 ? 'var(--p4g-yellow)' : i % 3 === 1 ? 'var(--p4g-orange)' : 'var(--p4g-white)' }}
                initial={{ scaleX: 0, opacity: 0 }} animate={{ scaleX: [0, 1, 1], opacity: [0, 0.9, 0] }} transition={{ duration: 1.2, delay: 0.1 + i * 0.02 }} />
            ))}
            {!low && (
              <motion.span key={`ring-${kind}`} aria-hidden className="absolute left-1/2 top-1/2 -ml-20 -mt-20 h-40 w-40 rounded-full border-[3px] border-p4g-yellow" style={{ boxShadow: '0 0 0 3px var(--p4g-black), inset 0 0 0 3px var(--p4g-orange)' }}
                initial={{ opacity: 0.85, scale: 0.4 }} animate={{ opacity: 0, scale: isRecip ? 3.2 : 2.6 }} transition={{ duration: isRecip ? 1.4 : 1.0, ease: 'easeOut' }} />
            )}
            {!low && particles.map(({ tx, ty, delay, size }, i) => (
              <motion.span key={`p-${kind}-${i}`} aria-hidden className="absolute left-1/2 top-1/2 rotate-45 border-2 border-p4g-black" style={{ width: size, height: size, marginLeft: -size / 2, marginTop: -size / 2, background: i % 2 ? 'var(--p4g-yellow)' : 'var(--p4g-orange)' }}
                initial={{ x: 0, y: 0, opacity: 0, scale: 0.4 }} animate={{ x: tx, y: ty, opacity: [0, 1, 0], scale: [0.4, 1, 0.3] }} transition={{ duration: isRecip ? 1.4 : 1.0, delay, ease: 'easeOut' }} />
            ))}
            <div className="relative flex flex-col items-center px-6 text-center">
              <motion.div initial={low ? false : { scale: 0.3, rotate: isRecip ? -30 : 0 }} animate={low ? { scale: 1, rotate: 0 } : { scale: isRecip ? [0.3, 1.1, 1.05, 0.95] : [0.3, 1, 0.95, 0.9], rotate: isRecip ? [-30, 0, 0, 10] : 0 }}
                transition={{ duration: isRecip ? 2.0 : 1.5, times: [0, 0.25, 0.7, 1], ease: 'easeOut' }} className="relative">
                <Sparkle size={110} className="text-p4g-yellow" style={{ filter: 'drop-shadow(4px 4px 0 var(--p4g-orange))' }} />
                {isRecip && (
                  <motion.span className="absolute -right-10 top-6 block" initial={low ? false : { x: 60, y: -40, opacity: 0 }} animate={{ x: 0, y: 0, opacity: 1 }} transition={{ delay: 0.15, duration: 0.45, ease: [0.2, 0.9, 0.1, 1] }}>
                    <Sparkle size={70} className="text-white" style={{ filter: 'drop-shadow(3px 3px 0 var(--p4g-orange))' }} />
                  </motion.span>
                )}
              </motion.div>
              <motion.div className="mt-4" initial={low ? false : { y: 24, opacity: 0, scale: 1.4 }} animate={{ y: 0, opacity: 1, scale: 1 }} transition={{ delay: 0.35, duration: 0.3 }}>
                <span className="block font-display text-cap font-bold tracking-[0.3em] text-p4g-yellow">{isRecip ? 'RECIPROCAL' : 'A PRAYER SENT'}</span>
                <P4Outline size="clamp(30px, 9vw, 56px)" stroke={7} italic fill="var(--p4g-white)" strokeColor="var(--p4g-black)" drop={4}>{isRecip ? '愿望之光交汇' : '愿望已送达'}</P4Outline>
              </motion.div>
              <motion.p className="mt-3 rounded-[2px] bg-p4g-yellow px-3 py-1 font-display text-body font-bold text-p4g-black" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.6 }}>
                {isRecip ? <>你与 <span className="text-[color:var(--p4g-orange-deep)]">{targetName}</span> 今日互祈</> : <>送给 <span className="text-[color:var(--p4g-orange-deep)]">{targetName}</span> · 双方 +2 SP</>}
              </motion.p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </Portal>
  );
}

export default function PrayerEffectOverlay({ open, onClose, params }: OverlayProps) {
  return <PrayerEffect isOpen={open} kind={(params?.get('kind') as PrayerEffectKind) || 'sent'} targetName="久慈川" onDismiss={onClose} />;
}
