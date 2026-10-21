/**
 * DateRollCutIn.p3r —— 蓝白母题层新增演出（真实 app 暂无；DIFFERENTIATION.md B7 / B2 / B4）。
 *   global-dateroll            每日首开：群青幕自上落下 → 旧日期整格上滑出 / 新日期自下滑入（DateRoll，月相同步换帧）→
 *                              星期块 + 月相名 + 台词「今天也去接近真相吧」→ 幕布沉下退场。0–3200ms。
 *   ?variant=midnight          跨日 0:00：影时间绿闪 → 时钟停摆（StoppedClock）→ 日期推进 → 恢复。0–3600ms。
 *   ?variant=streak            连续天数推进：日期推进后 STREAK 数字整格上推（RollNum）。0–3200ms。
 *   global-darkhour-switch     日夜切换 · 影时间定格（DarkHourFreeze；遮满时才切 .dark，演示结束恢复原日夜）。
 *   global-evoker-cutin        召唤 Cut-in（EvokerCutIn：碎裂 + SUMMON 字样；插槽 slot:cutin-eyes 不放官方立绘）。
 * 低动效：直出终态（日期直接换、无幕布位移）。?hold=1 停在最终态不自动关。
 */
import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import type { OverlayProps } from '@blue/registry/types';
import { Portal, useEscape, P3Button } from '@blue/kit';
import { useBoldness, setPrefs, getPrefs } from '@blue/lib/prefs';
import { DateRoll, MoonPhase, moonPhaseOf, MOON_PHASE_NAMES, StoppedClock, DarkHourGlow, DarkHourFreeze, EvokerCutIn, RollNum, Caustics, SlashBands } from '@blue/fx/motifs';
import { StageChip } from '@blue/screens/pkg1/fxbits';

const DAY = 86400000;
const TODAY = new Date(2026, 9, 21);

export default function DateRollCutIn({ open, onClose, params }: OverlayProps) {
  const anim = useBoldness();
  useEscape(open, onClose);
  const variant = params?.get('variant') ?? 'firstopen';
  const hold = params?.get('hold') === '1';
  const midnight = variant === 'midnight';
  const streak = variant === 'streak';
  const [step, setStep] = useState(0); // 0 幕落 · 1 旧日 · 2 推进 · 3 台词 · 4 退场
  useEffect(() => {
    if (!open) { setStep(0); return; }
    if (!anim) { setStep(3); return; }
    const off = midnight ? 500 : 0;
    const ids = [
      window.setTimeout(() => setStep(1), 260),
      window.setTimeout(() => setStep(2), 900 + off),
      window.setTimeout(() => setStep(3), 1400 + off),
      ...(hold ? [] : [window.setTimeout(() => setStep(4), 2700 + off), window.setTimeout(onClose, 3150 + off)]),
    ];
    return () => ids.forEach(clearTimeout);
  }, [open, anim, midnight, hold, onClose]);
  const date = step >= 2 ? TODAY : new Date(TODAY.getTime() - DAY);
  const ph = moonPhaseOf(date);
  return (
    <Portal>
      <AnimatePresence>
        {open && step < 4 && (
          <motion.div key="dr" role="dialog" aria-label="日期推进" onClick={onClose} className="fixed inset-0 overflow-hidden"
            style={{ zIndex: 'var(--p3r-z-cutin)' as unknown as number }}
            initial={anim ? { clipPath: 'inset(0 0 100% 0)' } : { opacity: 0 }} animate={{ clipPath: 'inset(0 0 0% 0)', opacity: 1 }}
            exit={anim ? { clipPath: 'inset(100% 0 0 0)', transition: { duration: 0.4, ease: [0.7, 0, 0.84, 0] } } : { opacity: 0 }}
            transition={{ duration: 0.34, ease: [0.33, 0, 0.15, 1] }}>
            <StageChip text={`DATE ROLL · ${variant.toUpperCase()}`} />
            <div className="absolute inset-0" style={{ background: 'linear-gradient(180deg, var(--bk-abyss-3) 0%, var(--bk-abyss-2) 55%, var(--bk-sea-3) 100%)' }} />
            <Caustics opacity={0.22} fps={3} scale={1.3} />
            <SlashBands variant="strip" style={{ top: '18%' }} />
            {midnight && step <= 2 && <DarkHourGlow pools={3} moon grain style={{ position: 'absolute', inset: 0 }} />}
            {midnight && anim && (
              <motion.div aria-hidden className="absolute inset-0" style={{ background: 'var(--bk-darkhour)' }} initial={{ opacity: 0 }} animate={{ opacity: [0, 0.6, 0, 0] }} transition={{ duration: 0.6, delay: 0.3, times: [0, 0.2, 0.5, 1] }} />
            )}
            <div className="relative flex h-full flex-col items-center justify-center gap-5 px-6" onClick={(e) => e.stopPropagation()}>
              {midnight && (
                <motion.div className="flex items-center gap-3" initial={{ opacity: 0 }} animate={{ opacity: step <= 2 ? 1 : 0.5 }}>
                  <StoppedClock size={54} spin={step < 2} />
                  <span className="font-cond text-[34px] italic leading-none" style={{ color: 'var(--bk-darkhour)' }}>0:00</span>
                </motion.div>
              )}
              <span className="font-cond text-[12px] tracking-[0.5em]" style={{ color: 'var(--bk-bubble-b)' }}>{midnight ? 'THE DARK HOUR HAS PASSED' : streak ? 'STREAK CONTINUES' : 'A NEW DAY'}</span>
              {/* 日期牌：白纸面整格（P3 原作日期 HUD），内部 DateRoll 竖推 */}
              <div className="relative px-6 py-4" style={{ background: '#ffffff', clipPath: 'polygon(16px 0, 100% 0, calc(100% - 16px) 100%, 0 100%)', boxShadow: '6px 6px 0 #e8283c' }}>
                <div className="p3-dayface"><DateRoll date={date} size={84} /></div>
              </div>
              <div className="flex items-center gap-2">
                <MoonPhase phase={ph} size={22} variant="glow" />
                <span className="text-[14px] font-black tracking-[0.2em]" style={{ color: '#ffffff' }}>{MOON_PHASE_NAMES[ph]}</span>
              </div>
              {streak && (
                <div className="flex items-end gap-2" style={{ color: '#ffffff' }}>
                  <span className="font-cond text-[13px] tracking-[0.3em]" style={{ color: 'var(--bk-bubble-a)' }}>STREAK</span>
                  <span className="font-cond text-[48px] italic leading-none"><RollNum value={step >= 2 ? 13 : 12} /></span>
                  <span className="pb-1 text-[14px] font-black">天</span>
                </div>
              )}
              <AnimatePresence>
                {step >= 3 && (
                  <motion.p key="line" className="px-4 py-2 text-[15px] font-black" style={{ background: 'rgba(5,7,30,0.6)', color: '#ffffff', clipPath: 'polygon(10px 0, 100% 0, calc(100% - 10px) 100%, 0 100%)' }}
                    initial={anim ? { opacity: 0, y: 10 } : false} animate={{ opacity: 1, y: 0 }}>
                    {midnight ? '时钟重新走动了。今天也去接近真相吧。' : streak ? '连续第 13 天。别停下。' : '今天也去接近真相吧。'}
                  </motion.p>
                )}
              </AnimatePresence>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </Portal>
  );
}

/** 日夜切换演示：开场 400ms 后播 DarkHourFreeze；遮满时切夜，结束 1.6s 后恢复原日夜（只为演示，不改用户偏好的最终值） */
export function DarkHourSwitchDemo({ open, onClose }: OverlayProps) {
  const anim = useBoldness();
  const [run, setRun] = useState(0);
  const [orig] = useState(() => getPrefs().mode);
  useEffect(() => {
    if (!open) return;
    setPrefs({ mode: 'day' });
    const t = window.setTimeout(() => setRun((r) => r + 1), 400);
    return () => { clearTimeout(t); setPrefs({ mode: orig }); };
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps
  if (!open) return null;
  return (
    <>
      <StageChip text="DARK HOUR · 日→夜" />
      <div className="fixed bottom-[84px] right-3 z-30 flex gap-2">
        <P3Button size="sm" tone="ink" onClick={() => { setPrefs({ mode: 'day' }); setRun((r) => r + 1); }}>再播一次</P3Button>
        <P3Button size="sm" tone="soft" onClick={onClose}>关闭</P3Button>
      </div>
      {run > 0 && <DarkHourFreeze key={run} active onCovered={() => setPrefs({ mode: 'night' })} onDone={() => { if (!anim) setPrefs({ mode: 'night' }); }} />}
    </>
  );
}

/** 召唤 Cut-in 演示 */
export function EvokerDemo({ open, onClose }: OverlayProps) {
  return (
    <EvokerCutIn open={open} onClose={onClose} eyebrow="SUMMON · 成就解锁" title="PERSONA" sub="「我即是汝，汝即是我」—— 新的面具觉醒了" ghost="AWAKEN" autoCloseMs={2800} />
  );
}
