/**
 * Cut-in 通用框架（升级 / 成就 / 技能解锁 / 庆祝）。
 *   <CutInFrame open={on} onClose={() => setOn(false)} title="LEVEL UP!!" subtitle="勇气 提升到 Lv.4"
 *               charSlot="char-navigator" eyebrow="SKILL UP" autoCloseMs={2400} />
 *
 * 版式（P4G All-Out / 技能 Cut-in）：黑幕压暗 → 斜向黑带从右砸入（内含黄黑速度线 cutin-speedlines.webp，
 * 只做 translate/scale）→ 角色立绘（官方插槽 char-*，缺失用 tv-mascot.webp）从左滑入 →
 * 白字粗黑描边大标题弹出 → 点击任意处 / autoClose 收场。
 * children 可放额外内容（数值变化等），出现在标题下方。
 * 手机（<640px）文字块占满宽度（左右 16px），标题允许换行；≥640 维持右偏 68% 版式。
 */
import { AnimatePresence, motion } from 'framer-motion';
import { useEffect, type ReactNode } from 'react';
import { p4gAsset } from '@yellow/lib/asset';
import { useSlot, useImageOk } from '@yellow/lib/slots';
import { useLowMotion } from '@yellow/lib/prefs';
import { P4Outline } from '@yellow/kit/P4Outline';

export interface CutInFrameProps {
  open: boolean;
  onClose: () => void;
  title: ReactNode;
  subtitle?: ReactNode;
  eyebrow?: string;
  charSlot?: string;
  charFallback?: string;
  autoCloseMs?: number;
  children?: ReactNode;
  tone?: 'yellow' | 'black';
}

export function CutInFrame({ open, onClose, title, subtitle, eyebrow, charSlot = 'char-navigator', charFallback = p4gAsset('tv-mascot.webp'), autoCloseMs, children, tone = 'yellow' }: CutInFrameProps) {
  const low = useLowMotion();
  const char = useSlot(charSlot, charFallback);
  const speed = p4gAsset('cutin-speedlines.webp');
  const speedOk = useImageOk(speed);
  useEffect(() => {
    if (!open || !autoCloseMs) return;
    const t = window.setTimeout(onClose, autoCloseMs);
    return () => clearTimeout(t);
  }, [open, autoCloseMs, onClose]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          key="cutin"
          className="fixed inset-0 flex items-center justify-center overflow-hidden"
          style={{ zIndex: 'var(--p4g-z-cutin)' as unknown as number }}
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0, transition: { duration: 0.2 } }}
          onClick={onClose}
          role="dialog" aria-modal="true"
        >
          <div className="absolute inset-0 bg-black/70" />
          {/* 斜带 */}
          <motion.div
            className="absolute left-[-20%] right-[-20%] top-1/2 h-[46vh] min-h-[260px] overflow-hidden border-y-[6px] border-p4g-black"
            // 垂直居中交给 framer 的 y（不能用 tailwind -translate-y-1/2：framer 写 inline transform 会把它覆盖掉 → 斜带下偏半个身位）
            style={{ rotate: -8, y: '-50%', background: tone === 'yellow' ? 'var(--p4g-yellow)' : '#111' }}
            initial={low ? { opacity: 0 } : { x: '100%' }}
            animate={low ? { opacity: 1 } : { x: '0%' }}
            exit={low ? { opacity: 0 } : { x: '-100%', transition: { duration: 0.22, ease: [0.7, 0, 0.84, 0] } }}
            transition={{ duration: 0.26, ease: [0.2, 0.9, 0.1, 1] }}
          >
            <motion.div
              className="absolute inset-[-10%]"
              style={{ backgroundImage: speedOk === false ? 'repeating-conic-gradient(from 0deg at 35% 50%, #111 0 4deg, transparent 4deg 12deg)' : `url(${speed})`, backgroundSize: 'cover', backgroundPosition: '35% 50%', opacity: tone === 'yellow' ? 0.9 : 0.5 }}
              animate={low ? undefined : { scale: [1, 1.08] }}
              transition={{ duration: 2.4, ease: 'linear' }}
            />
            <div className="absolute inset-x-0 top-0 h-3 p4g-candy" />
            <div className="absolute inset-x-0 bottom-0 h-3 p4g-candy" />
          </motion.div>
          {/* 角色 */}
          <motion.img
            src={char} alt="" draggable={false}
            className="pointer-events-none absolute bottom-[10%] left-[2%] max-h-[62vh] w-[min(46vw,420px)] object-contain"
            initial={low ? { opacity: 0 } : { x: '-60%', opacity: 0 }}
            animate={low ? { opacity: 1 } : { x: '0%', opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3, delay: low ? 0 : 0.12, ease: [0.2, 0.9, 0.1, 1] }}
          />
          {/* 文字 */}
          <motion.div
            className="relative mx-4 flex w-[calc(100%-2rem)] min-w-0 flex-col items-start gap-2 sm:ml-[28%] sm:mr-0 sm:w-auto sm:max-w-[68%] sm:pr-4"
            initial={low ? { opacity: 0 } : { scale: 1.6, opacity: 0, rotate: -8 }}
            animate={low ? { opacity: 1 } : { scale: 1, opacity: 1, rotate: -8 }}
            transition={{ duration: 0.22, delay: low ? 0 : 0.22, ease: [0.2, 0.9, 0.1, 1] }}
          >
            {eyebrow && <span className="rounded-xs bg-p4g-black px-2 py-0.5 font-display text-meta font-bold uppercase tracking-[0.2em] text-p4g-yellow">{eyebrow}</span>}
            <P4Outline size="clamp(30px, 8.5vw, 80px)" stroke={6} wrap className="max-w-full italic leading-none [overflow-wrap:anywhere]">{title}</P4Outline>
            {subtitle && <div className="max-w-full rounded-sm bg-p4g-black px-3 py-1.5 font-display text-lead font-bold text-white p4g-clamp-2">{subtitle}</div>}
            {children}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
