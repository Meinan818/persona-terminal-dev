/**
 * 本周目标达成！（真实 src/components/weeklyGoal/CelebrationModal.tsx）：
 *   打开瞬间 40 片彩纸迸开（真实 particles：随机散开 1.2s，delay ≤ .6）→ 奖杯 spring .1 → 标题 .3 → 说明「选择这周最用力的方向，领取奖励」.45
 *   → 五维选择 .5（Lv≥3 +7 点，否则 +5 点）→ 按钮行 .6「取消」「领取奖励 ✨」。
 * P3R：斜带横扫 + 系统框（墨色标题条 + 光标楔选项行）；彩纸 = 樱瓣 / 斜片（只动 transform / opacity；低动效不放）。
 * 领奖 → 奖励已领取！（ClaimedModal 2.6s）一镜到底。?pick=charm 直达已选态。
 */
import { AnimatePresence, motion } from 'framer-motion';
import { useMemo, useState } from 'react';
import type { AttributeId } from '@/types';
import type { OverlayProps } from '@pink/registry/types';
import { Portal, useEscape, useScrollLock, P3Button, ShatteredStar, P3R, slantClip, tickClip, SelectWedge } from '@pink/kit';
import { useBoldness } from '@pink/lib/prefs';
import { ATTR_EN, ATTR_IDS, useActionsData } from '@pink/adapters/pkg2';
import ClaimedModal from './ClaimedModal.p3r';

export const rewardPts = (a: AttributeId, levels: Partial<Record<AttributeId, number>> = {}) => ((levels[a] ?? 1) >= 3 ? 7 : 5);
const CONF_C = ['var(--p3r-blue)', 'var(--p3r-cyan)', 'var(--p3r-magenta)', 'var(--p3r-gold)', 'var(--pk-petal-a)', 'var(--p3r-cream)'];

export default function CelebrationModal({ open, onClose, params, onClaim }: OverlayProps & { onClaim?: (a: AttributeId, pts: number) => void }) {
  const anim = useBoldness();
  const { ATTR_NAMES, attributes, WEEK_RANGE } = useActionsData();
  const levels = Object.fromEntries(attributes.map((a) => [a.id, a.level])) as Partial<Record<AttributeId, number>>;
  const [sel, setSel] = useState<AttributeId | null>((params?.get('pick') as AttributeId) || null);
  const [claimed, setClaimed] = useState<{ attrName: string; pts: number } | null>(null);
  useScrollLock(open && !claimed);
  useEscape(open && !claimed, onClose);
  const confetti = useMemo(() => Array.from({ length: 40 }, (_, i) => ({
    x: Math.sin(i * 12.9898) * 140 + Math.cos(i * 4.1) * 60, y: Math.cos(i * 78.233) * 130 - 20, d: ((i * 37) % 60) / 100, c: CONF_C[i % CONF_C.length], s: 6 + (i % 4) * 2, r: (i * 53) % 360, petal: i % 3 === 0,
  })), []);
  const claim = () => {
    if (!sel) return;
    const pts = rewardPts(sel, levels);
    onClaim?.(sel, pts);
    setClaimed({ attrName: ATTR_NAMES[sel], pts });
  };
  return (
    <>
      <Portal>
        <AnimatePresence>
          {open && !claimed && (
            <motion.div key="cel" className="fixed inset-0 z-celebration flex items-center justify-center p-4" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <div className="absolute inset-0" style={{ background: 'var(--p3r-scrim)' }} onClick={onClose} />
              {anim && (
                <motion.div aria-hidden className="pointer-events-none absolute -left-[20vw] top-[20%] w-[140vw] py-3" style={{ rotate: -12, background: 'var(--pk-band)', boxShadow: '0 -3px 0 var(--pk-band-edge), 0 3px 0 var(--p3r-cyan)' }}
                  initial={{ x: '-100%' }} animate={{ x: ['-100%', '0%', '0%', '100%'] }} transition={{ duration: 1.1, times: [0, 0.3, 0.7, 1], ease: [0.5, 0, 0.3, 1] }}>
                  <div className="whitespace-nowrap text-center font-cond text-[clamp(36px,10vw,80px)] leading-none" style={{ color: 'var(--p3r-cream)' }}>WEEKLY CLEAR</div>
                </motion.div>
              )}
              {anim && (
                <div aria-hidden className="pointer-events-none absolute left-1/2 top-[36%] z-10">
                  {confetti.map((p, i) => (
                    <motion.span key={i} className="absolute block" style={{ width: p.s, height: p.petal ? p.s * 1.3 : p.s, marginLeft: -p.s / 2, background: p.c, clipPath: p.petal ? 'ellipse(50% 50% at 50% 50%)' : tickClip, borderRadius: p.petal ? '60% 0 60% 0' : undefined }}
                      initial={{ x: 0, y: 0, opacity: 1, scale: 0 }} animate={{ x: p.x, y: p.y, opacity: 0, scale: 1, rotate: p.r }} transition={{ duration: 1.2, delay: p.d, ease: 'easeOut' }} />
                  ))}
                </div>
              )}
              <motion.div role="dialog" aria-modal="true" aria-label="本周目标达成！" className="relative w-full max-w-sm"
                initial={anim ? { scale: 0.92, opacity: 0, x: -12, y: 12 } : { opacity: 0 }} animate={{ scale: 1, opacity: 1, x: 0, y: 0 }} exit={anim ? { scale: 0.92, opacity: 0 } : { opacity: 0 }}
                transition={{ type: 'spring', stiffness: 300, damping: 26 }}>
                <span aria-hidden className="absolute inset-0 translate-x-[8px] translate-y-[8px]" style={{ background: 'var(--p3r-slab-back)', clipPath: slantClip(16) }} />
                <div className="relative overflow-hidden" style={{ background: P3R.panel, clipPath: slantClip(16) }}>
                  <div className="relative flex items-center gap-2 px-6 py-3" style={{ background: P3R.ink }}>
                    <span aria-hidden className="h-[14px] w-[10px]" style={{ background: P3R.gold, clipPath: tickClip }} />
                    <span className="font-cond text-[12px] tracking-[0.3em]" style={{ color: 'var(--p3r-on-ink)' }}>WEEKLY GOAL</span>
                    <span className="ml-auto font-cond text-[11px]" style={{ color: P3R.blue }}>{WEEK_RANGE.days[0].slice(5).replace('-', '/')} – {WEEK_RANGE.days[6].slice(5).replace('-', '/')}</span>
                  </div>
                  <div className="px-6 pb-6 pt-4">
                    <div className="text-center">
                      <motion.div className="mx-auto w-[96px]" initial={anim ? { scale: 0, rotate: -30 } : false} animate={{ scale: 1, rotate: 0 }} transition={{ type: 'spring', duration: 0.6, delay: 0.1 }}>
                        <ShatteredStar className="w-[96px]" />
                      </motion.div>
                      <motion.h2 className="mt-1 font-heavy text-[clamp(24px,7vw,28px)] leading-tight" style={{ color: P3R.ink }} initial={anim ? { y: 10, opacity: 0 } : false} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.3, duration: 0.4 }}>本周目标达成！</motion.h2>
                      <motion.p className="mt-1 text-[13px]" style={{ color: P3R.inkSoft }} initial={anim ? { y: 10, opacity: 0 } : false} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.45, duration: 0.4 }}>选择这周最用力的方向，领取奖励</motion.p>
                    </div>
                    <motion.div role="radiogroup" aria-label="选择奖励属性" className="mt-4 space-y-1" initial={anim ? { y: 12, opacity: 0 } : false} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.5, duration: 0.4 }}>
                      {ATTR_IDS.map((a) => {
                        const on = sel === a;
                        return (
                          <button key={a} type="button" role="radio" aria-checked={on} onClick={() => setSel(a)} className="relative flex h-11 w-full min-w-0 items-center gap-3 px-5 text-left">
                            <span aria-hidden className="absolute inset-0" style={{ background: on ? 'transparent' : 'var(--p3r-row)', clipPath: slantClip(9) }} />
                            {on && <SelectWedge className="-left-1 -right-2 inset-y-0" />}
                            <span className="relative min-w-0 flex-1 truncate font-heavy text-[17px]" style={{ color: on ? 'var(--p3r-mulberry)' : P3R.ink }}>{ATTR_NAMES[a]}</span>
                            <span className="relative hidden shrink-0 font-cond text-[11px] min-[380px]:inline" style={{ color: on ? 'var(--p3r-mulberry)' : P3R.grey }}>{ATTR_EN[a]}</span>
                            <span className="relative shrink-0 font-cond text-[16px] tabular" style={{ color: on ? 'var(--p3r-mulberry)' : P3R.roseInk }}>+{rewardPts(a, levels)} 点</span>
                          </button>
                        );
                      })}
                    </motion.div>
                    <motion.div className="mt-5 flex gap-3" initial={anim ? { y: 12, opacity: 0 } : false} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.6, duration: 0.4 }}>
                      <P3Button tone="soft" className="flex-1" onClick={onClose}>取消</P3Button>
                      <P3Button className="flex-1" corner disabled={!sel} onClick={claim}>领取奖励 ✦</P3Button>
                    </motion.div>
                  </div>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </Portal>
      <ClaimedModal open={!!claimed} onClose={() => { setClaimed(null); onClose(); }} attrName={claimed?.attrName} pts={claimed?.pts} />
    </>
  );
}
