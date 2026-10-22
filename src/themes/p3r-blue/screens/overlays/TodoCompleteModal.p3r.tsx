/**
 * TodoCompleteModal.p3r —— 今日完成 Cut-in（真实 src/components/TodoCompleteModal.tsx#BandCutInP3，p3-modal-06 稿）1:1 蓝白重配。
 * 时序（真实值）：浅遮罩淡入 → 白斜带自右 spring(220/24) 滑入 + skewX -6→0 → 碎裂勾 spring(220/14) delay .12 →
 *   蓝斜块任务名 clip 揭示 .2s/.38 → 幽灵词 DONE .26 → 勾落地迸溅 .34+ → 三圈波纹 ping 循环（.15 + k×.26）→
 *   3000ms 自动关闭（真实 useAutoClose(3000)）→ 斜带向左 -110% 退场。点遮罩 / ✕ / ESC 关闭。
 * 变体：?points=N（TODAY / +N + 音符雨）、?hint=1（★ 您解锁了新成就 / 新技能！）、?title=…；?eyebrow=记录成功&ghost=SAVED 为同壳其它用法。
 * 低动效：直出终态 + 淡入淡出。
 */
import { AnimatePresence, motion } from 'framer-motion';
import type { OverlayProps } from '@blue/registry/types';
import { Portal, useEscape } from '@blue/kit';
import { useBoldness } from '@blue/lib/prefs';
import { MOCK_TODO_DONE } from '@blue/mock/pkg1';
import { useAutoClose, ShatterCheckP3, TriBurst, MusicalNotes, TwinTicks, LILAC_MID, LILAC_PALE, cyanA, type BurstPiece } from '@blue/screens/pkg1/fxbits';

const CHECK_BURST: BurstPiece[] = [
  { dx: -44, dy: -34, rot: -40, s: 10, c: 'var(--p3r-cyan)', d: 0 },
  { dx: 52, dy: -26, rot: 60, s: 8, c: 'var(--p3r-blue)', d: 0.03 },
  { dx: -30, dy: 40, rot: -80, s: 7, c: LILAC_PALE, d: 0.05 },
  { dx: 58, dy: 30, rot: 45, s: 9, c: 'var(--p3r-magenta)', d: 0.02 },
  { dx: 6, dy: -52, rot: 20, s: 7, c: LILAC_MID, d: 0.06 },
  { dx: -56, dy: 4, rot: -25, s: 8, c: 'var(--p3r-blue)', d: 0.04 },
  { dx: 30, dy: 52, rot: 70, s: 6, c: 'var(--p3r-cyan)', d: 0.07 },
];

export interface TodoCompleteProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  totalPoints?: number;
  unlockHint?: { achievements: number; skills: number };
  eyebrow?: string;
  ghost?: string;
  autoCloseMs?: number;
}

export const BandCutInP3 = ({ isOpen, onClose, title, totalPoints, unlockHint, eyebrow = '今日完成', ghost = 'DONE', autoCloseMs = 3000 }: TodoCompleteProps) => {
  const anim = useBoldness();
  useAutoClose(isOpen, autoCloseMs, onClose);
  useEscape(isOpen, onClose);
  const pts = totalPoints ?? 0;
  return (
    <Portal>
      <AnimatePresence>
        {isOpen && (
          <motion.div key="band" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: anim ? 0.22 : 0.16 }}
            className="fixed inset-0 flex flex-col items-stretch justify-center overflow-hidden" style={{ zIndex: 'var(--p3r-z-celebration)' as unknown as number, background: 'rgba(13,22,42,0.35)' }}
            onClick={onClose}>
            <div role="dialog" aria-modal="true" aria-label={`${eyebrow}：${title}`} className="relative">
              {/* 位移层（✕ 挂在这一层，斜度恒定）与斜切层拆开：同真实 */}
              <motion.div className="relative w-full" onClick={(e) => e.stopPropagation()}
                initial={anim ? { x: '110%' } : { opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={anim ? { x: '-110%' } : { opacity: 0 }}
                transition={anim ? { type: 'spring', damping: 24, stiffness: 220 } : { duration: 0.16 }}>
                <motion.div className="p3-dayface relative overflow-hidden px-6 pb-10 pt-9"
                  initial={anim ? { skewX: -6 } : false} animate={{ skewX: 0 }} transition={{ type: 'spring', damping: 24, stiffness: 220 }}
                  style={{ background: 'var(--p3r-sheet-grad)', clipPath: 'polygon(0 12%, 100% 0, 100% 88%, 0 100%)', boxShadow: '0 22px 60px rgba(13,22,42,0.35)' }}>
                  {/* 三道圆形波纹（从勾处 ping ×3，循环保活整场庆祝） */}
                  {anim && [0, 1, 2].map((k) => (
                    <motion.span key={k} aria-hidden className="pointer-events-none absolute z-10 rounded-full"
                      style={{ left: '82%', top: '50%', x: '-50%', y: '-50%', border: `3px solid ${cyanA(0.85)}` }}
                      initial={{ width: 26, height: 26, opacity: 0 }} animate={{ width: 240, height: 240, opacity: [0, 0.85, 0] }}
                      transition={{ duration: 1.15, delay: 0.15 + k * 0.26, ease: 'easeOut', repeat: Infinity, repeatDelay: 0.35 }} />
                  ))}
                  {/* 幽灵词 */}
                  <motion.div aria-hidden className="pointer-events-none absolute -right-3 bottom-0 select-none font-cond leading-none"
                    style={{ fontSize: '5.2rem', color: cyanA(0.24) }}
                    initial={anim ? { x: 46, opacity: 0 } : false} animate={{ x: 0, opacity: 1 }} transition={{ duration: 0.35, delay: 0.26, ease: [0.2, 0.8, 0.3, 1] }}>
                    {ghost}
                  </motion.div>
                  <div className="relative flex items-center gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-end gap-2">
                        {/* 两层叠字：底层白描边、上层填充（真实 2026-10-16 修法） */}
                        <span className="relative inline-block whitespace-nowrap font-heavy leading-[0.9]" style={{ fontSize: 'min(52px, 11.5vw)' }}>
                          <span aria-hidden className="absolute inset-0" style={{ color: 'var(--p3r-panel)', WebkitTextStroke: '5px var(--p3r-panel)' }}>{eyebrow}</span>
                          <span className="relative" style={{ color: 'var(--p3r-ink)' }}>{eyebrow}</span>
                        </span>
                        <TwinTicks />
                      </div>
                      <div className="mt-2.5 flex items-center gap-2.5">
                        <span aria-hidden className="h-[4px] w-9" style={{ background: 'var(--p3r-blue)', transform: 'skewX(-24deg)' }} />
                        <span className="font-cond text-[19px] tracking-[0.18em]" style={{ color: 'var(--p3r-rose-ink)' }}>TODAY{pts > 0 ? ` / +${pts}` : ''}</span>
                      </div>
                      <motion.div className="mt-3 inline-block max-w-full align-top"
                        initial={anim ? { clipPath: 'inset(-6% 102% -6% -3%)' } : false} animate={{ clipPath: 'inset(-6% -3% -6% -3%)' }}
                        transition={{ duration: 0.38, delay: 0.2, ease: [0.25, 0.1, 0.25, 1] }}>
                        <div className="inline-block max-w-full px-5 py-2.5" style={{ background: 'var(--p3r-blue)', clipPath: 'polygon(12px 0, 100% 0, calc(100% - 12px) 100%, 0 100%)' }}>
                          <span className="block truncate text-[clamp(18px,5.6vw,24px)] font-black" style={{ color: 'var(--p3r-on-blue)' }}>{title}</span>
                        </div>
                      </motion.div>
                      {unlockHint && (unlockHint.achievements > 0 || unlockHint.skills > 0) && (
                        <motion.div className="mt-2.5 text-[13px] font-black" style={{ color: 'var(--p3r-coral-ink)' }}
                          initial={anim ? { opacity: 0, x: -10 } : false} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.5, duration: 0.3 }}>★ 您解锁了新成就 / 新技能！</motion.div>
                      )}
                    </div>
                    <motion.div className="relative shrink-0" initial={anim ? { scale: 0, rotate: -18 } : false} animate={{ scale: 1, rotate: 0 }}
                      transition={{ type: 'spring', damping: 14, stiffness: 220, delay: 0.12 }}>
                      <ShatterCheckP3 className="w-[clamp(96px,30vw,148px)]" />
                      {anim && <TriBurst pieces={CHECK_BURST} delay={0.34} />}
                    </motion.div>
                  </div>
                </motion.div>
                {/* 右上青斜块 ✕（斜切层之外） */}
                <motion.button type="button" whileTap={{ scale: 0.9 }} onClick={onClose} aria-label="关闭"
                  className="absolute right-3 top-0 z-20 flex h-11 w-14 items-center justify-center text-xl font-black"
                  style={{ background: 'var(--p3r-cyan)', color: 'var(--p3r-mulberry)', clipPath: 'polygon(14px 0, 100% 0, calc(100% - 14px) 100%, 0 100%)' }}>×</motion.button>
              </motion.div>
              <div aria-hidden className="mt-5 flex items-center justify-center gap-3 text-[12px] font-black" style={{ color: 'rgba(255,255,255,0.92)' }}>
                <span className="h-px w-12 bg-white/60" />
                即将自动关闭 <span style={{ color: 'var(--bk-bubble-b)' }}>{Math.round(autoCloseMs / 1000)}s</span>
                <span className="h-px w-12 bg-white/60" />
              </div>
            </div>
            {pts > 0 && anim && <MusicalNotes count={pts} delay={0.3} />}
          </motion.div>
        )}
      </AnimatePresence>
    </Portal>
  );
};

/** 真实 TodoCompleteModal（p3 频道 = BandCutInP3 今日完成 / DONE） */
export const TodoCompleteModal = (p: TodoCompleteProps) => <BandCutInP3 {...p} />;

export default function TodoCompleteOverlay({ open, onClose, params }: OverlayProps) {
  const pts = Number(params?.get('points') ?? 0) || 0;
  const hint = params?.get('hint') === '1';
  return (
    <BandCutInP3 isOpen={open} onClose={onClose}
      title={params?.get('title') ?? MOCK_TODO_DONE.title}
      totalPoints={pts}
      unlockHint={hint ? { achievements: 1, skills: 1 } : { achievements: 0, skills: 0 }}
      eyebrow={params?.get('eyebrow') ?? '今日完成'} ghost={params?.get('ghost') ?? 'DONE'} />
  );
}
