/**
 * 本周目标达成！（真实 src/components/weeklyGoal/CelebrationModal.tsx）：
 * 🏆「本周目标达成！」「选择这周最用力的方向，领取奖励」；五维选择（Lv≥3 +7 点，否则 +5 点）；取消 / 领取奖励 ✨。
 * P4G：黄黑条纹扫过 + 拼贴块分层 + Status 式五维行 + 打开瞬间彩纸迸开（真实 40 片彩纸 particles，这里 24 片方块/四角星，只动 transform/opacity，低动效不放）。
 */
import { AnimatePresence, motion } from 'framer-motion';
import { useState } from 'react';
import type { AttributeId } from '@/types';
import type { OverlayProps } from '@yellow/registry/types';
import { P4Button, P4Outline, P4Stripe, Portal, useEscape, useScrollLock } from '@yellow/kit';
import { CollageItem, CollageStagger } from '@yellow/fx';
import { useLowMotion } from '@yellow/lib/prefs';
import { ATTR_EN, ATTR_IDS, ATTR_NAMES } from '@yellow/adapters/pkg2';
import { cx } from '@yellow/lib/cx';

const BURST = Array.from({ length: 24 }, (_, i) => {
  const a = (i / 24) * Math.PI * 2 + (i % 3) * 0.21;
  const d = 120 + ((i * 53) % 90);
  return { x: Math.cos(a) * d, y: Math.sin(a) * d * 0.9 - 30, r: (i * 47) % 360, c: ['var(--p4g-yellow)', 'var(--p4g-orange)', 'var(--p4g-blue)', 'var(--p4g-green)', 'var(--p4g-cream)', 'var(--p4g-red)'][i % 6], s: 8 + (i % 4) * 3, star: i % 4 === 0, delay: 0.12 + (i % 6) * 0.03 };
});

const LV: Record<AttributeId, number> = { knowledge: 4, guts: 3, dexterity: 2, kindness: 2, charm: 1 };
export const rewardPts = (a: AttributeId) => (LV[a] >= 3 ? 7 : 5);

export default function CelebrationModal({ open, onClose, onClaim }: OverlayProps & { onClaim?: (a: AttributeId, pts: number) => void }) {
  const low = useLowMotion();
  const [sel, setSel] = useState<AttributeId | null>(null);
  useScrollLock(open);
  useEscape(open, onClose);
  return (
    <Portal>
      <AnimatePresence>
        {open && (
          <motion.div key="cel" className="fixed inset-0 flex items-center justify-center p-4" style={{ zIndex: 'var(--p4g-z-celebration)' as unknown as number }} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <div className="absolute inset-0 bg-[color:var(--p4g-scrim)]" onClick={onClose} />
            {!low && <motion.div aria-hidden className="pointer-events-none absolute inset-x-0 top-[22%] -rotate-6" initial={{ x: '-110%' }} animate={{ x: '110%' }} transition={{ duration: 0.55, ease: [0.2, 0.9, 0.1, 1] }}><P4Stripe variant="hazard" height={28} /></motion.div>}
            {!low && (
              <div aria-hidden className="pointer-events-none absolute left-1/2 top-[30%] z-10">
                {BURST.map((b, i) => (
                  <motion.span key={i} className="absolute block" style={{ width: b.s, height: b.s, marginLeft: -b.s / 2, marginTop: -b.s / 2, background: b.star ? undefined : b.c, border: b.star ? undefined : '2px solid #111' }}
                    initial={{ x: 0, y: 0, scale: 0, rotate: 0, opacity: 0 }} animate={{ x: b.x, y: [0, b.y, b.y + 60], scale: [0, 1.1, 1], rotate: b.r, opacity: [0, 1, 0] }}
                    transition={{ duration: 1.5, delay: b.delay, ease: [0.2, 0.9, 0.1, 1], times: [0, 0.35, 1] }}>
                    {b.star && <svg viewBox="0 0 24 24" width={b.s + 6} height={b.s + 6}><path d="M12 0 C13 8 16 11 24 12 C16 13 13 16 12 24 C11 16 8 13 0 12 C8 11 11 8 12 0Z" fill={b.c} stroke="#111" strokeWidth="1.5" /></svg>}
                  </motion.span>
                ))}
              </div>
            )}
            <motion.div role="dialog" aria-modal="true" aria-label="本周目标达成！" className="relative w-full max-w-[440px] min-w-0"
              initial={low ? { opacity: 0 } : { scale: 0.7, rotate: -4, opacity: 0 }} animate={{ scale: 1, rotate: 0, opacity: 1 }} exit={low ? { opacity: 0 } : { scale: 0.85, opacity: 0 }} transition={{ duration: 0.26, ease: [0.2, 0.9, 0.1, 1] }}>
              <div aria-hidden className="absolute inset-0 translate-x-[10px] translate-y-[10px] bg-p4g-orange" />
              <div className="relative overflow-hidden border-3 border-p4g-black bg-p4g-yellow text-p4g-black night:border-p4g-yellow">
                <div aria-hidden className="h-2 p4g-candy-h" />
                <CollageStagger className="px-5 pb-5 pt-4" stagger={0.06}>
                  <CollageItem className="text-center">
                    <motion.div className="text-[44px] leading-none" initial={low ? false : { scale: 0, rotate: -20 }} animate={{ scale: 1, rotate: 0 }} transition={{ delay: 0.1, type: 'spring', stiffness: 300, damping: 14 }}>🏆</motion.div>
                    <P4Outline as="h2" size="clamp(26px,7.5vw,36px)" stroke={6} italic className="mt-1">本周目标达成！</P4Outline>
                    <p className="mt-1 font-display text-body font-bold">选择这周最用力的方向，领取奖励</p>
                  </CollageItem>
                  <div className="mt-4 grid grid-cols-1 gap-1.5">
                    {ATTR_IDS.map((a, i) => {
                      const on = sel === a;
                      return (
                        <CollageItem key={a} tilt={i % 2 ? 0.6 : -0.6}>
                          <button type="button" onClick={() => setSel(a)} aria-pressed={on}
                            className={cx('flex w-full min-w-0 items-center gap-3 border-3 border-p4g-black px-3 py-2 text-left transition-colors', on ? 'bg-p4g-black text-p4g-yellow' : 'bg-white text-p4g-black')}>
                            <span className={cx('h-5 w-5 shrink-0 border-3', on ? 'border-p4g-yellow bg-p4g-orange' : 'border-p4g-black')} />
                            <span className="min-w-0 flex-1"><span className="font-display text-lead font-bold">{ATTR_NAMES[a]}</span> <span className="font-display text-2xs font-bold italic tracking-wider opacity-70">{ATTR_EN[a]}</span></span>
                            <span className="shrink-0 p4g-num text-h3">+{rewardPts(a)} 点</span>
                          </button>
                        </CollageItem>
                      );
                    })}
                  </div>
                  <CollageItem className="mt-4 flex gap-3">
                    <P4Button variant="secondary" block onClick={onClose}>取消</P4Button>
                    <P4Button variant="black" block disabled={!sel} onClick={() => { if (sel) { onClaim?.(sel, rewardPts(sel)); onClose(); } }}>领取奖励 ✨</P4Button>
                  </CollageItem>
                </CollageStagger>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </Portal>
  );
}
