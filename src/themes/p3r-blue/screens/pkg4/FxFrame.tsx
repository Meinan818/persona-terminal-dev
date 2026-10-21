/**
 * 工作包 4 · 全屏演出框（塔罗类单项演出用）：Portal + 粉舞台底 + 斜板切入 / 淡出 + 幽灵大字 + 顶部眉标标题 + 阶段条 + 重播 / 关闭。
 * 只动 transform / opacity / clip-path；低动效直出。
 */
import { AnimatePresence, motion } from 'framer-motion';
import type { ReactNode } from 'react';
import { P3R, Portal, useEscape, useScrollLock, slantClip, GhostWords, TitlePeriod } from '@blue/kit';
import { useLowMotion } from '@blue/lib/prefs';

export function FxFrame({ open, onClose, eyebrow, title, ghost, stages, stage, children, onReplay, footer }: {
  open: boolean; onClose: () => void; eyebrow: string; title: ReactNode; ghost: string; stages?: string[]; stage?: number; children: ReactNode; onReplay?: () => void; footer?: ReactNode;
}) {
  const low = useLowMotion();
  useEscape(open, onClose);
  useScrollLock(open);
  return (
    <Portal>
      <AnimatePresence>
        {open && (
          <motion.div key="fx" role="dialog" aria-modal="true" aria-label={typeof title === 'string' ? title : eyebrow} className="fixed inset-0 overflow-y-auto overflow-x-hidden"
            style={{ zIndex: 'var(--p3r-z-cutin)' as unknown as number, background: 'var(--p3r-bg)' }}
            initial={low ? { opacity: 0 } : { clipPath: 'polygon(0 0, 0 0, 0 100%, 0 100%)' }} animate={low ? { opacity: 1 } : { clipPath: 'polygon(0 0, 130% 0, 100% 100%, 0 100%)' }}
            exit={{ opacity: 0 }} transition={{ duration: low ? 0.12 : 0.34, ease: [0.5, 0, 0.3, 1] }}>
            <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
              <div className="absolute -right-24 top-6 h-16 w-[420px]" style={{ background: 'var(--bk-band)', transform: 'rotate(-27deg)', opacity: 0.85 }} />
              <div className="absolute -left-20 bottom-24 h-[3px] w-[520px]" style={{ background: P3R.blue, transform: 'rotate(-27deg)', opacity: 0.4 }} />
              <GhostWords words={[ghost]} className="-left-4 bottom-10 text-[clamp(80px,26vw,200px)]" />
            </div>
            <button type="button" aria-label="关闭" onClick={onClose} className="fixed right-4 top-[calc(12px+env(safe-area-inset-top))] z-10 flex h-10 w-10 items-center justify-center text-[18px] font-black" style={{ background: P3R.ink, color: 'var(--p3r-on-ink)', clipPath: slantClip(6) }}>✕</button>
            <div className="relative mx-auto flex min-h-full w-full max-w-[560px] flex-col items-center px-4 pb-10 pt-[calc(28px+env(safe-area-inset-top))]">
              <motion.div className="relative flex w-full min-w-0 items-end gap-2 pr-12" initial={low ? false : { opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.18, duration: 0.3 }}>
                <span aria-hidden className="mb-1 h-[32px] w-[20px] shrink-0" style={{ background: P3R.blue, clipPath: 'polygon(36% 0, 100% 0, 64% 100%, 0 100%)' }} />
                <div className="min-w-0">
                  <div className="truncate font-cond text-[13px] uppercase tracking-wider" style={{ color: P3R.blue }}>{eyebrow}</div>
                  <h2 className="truncate font-heavy text-[clamp(26px,8vw,38px)] leading-[1.05]" style={{ color: P3R.ink }}>{title}</h2>
                </div>
                <TitlePeriod className="mb-2" />
              </motion.div>
              {stages && (
                <div className="mt-3 flex w-full min-w-0 flex-wrap gap-1" aria-label="演出阶段">
                  {stages.map((s, i) => {
                    const on = i === stage, past = stage !== undefined && i < stage;
                    return <span key={s} className="px-2.5 py-1 text-[11px] font-black" style={{ clipPath: slantClip(5), background: on ? P3R.blue : past ? 'var(--p3r-cyan-pale)' : 'var(--p3r-row)', color: on ? P3R.onBlue : past ? P3R.ink : P3R.grey }}>{`${i + 1} ${s}`}</span>;
                  })}
                </div>
              )}
              <div className="relative mt-4 flex w-full min-w-0 flex-1 flex-col items-center justify-center">{children}</div>
              {(onReplay || footer) && (
                <div className="mt-6 flex flex-wrap justify-center gap-2">
                  {footer}
                  {onReplay && <button type="button" onClick={onReplay} className="h-10 px-5 text-[14px] font-black" style={{ background: P3R.cyanPale, color: P3R.ink, clipPath: slantClip(8) }}>重播</button>}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </Portal>
  );
}
