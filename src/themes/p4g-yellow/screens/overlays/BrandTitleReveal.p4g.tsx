/**
 * 品牌标题揭示（真实 src/components/BrandTitleReveal.tsx：GSAP 时间线——眉标落位 → 八个字符带斜界微旋逐字升起 → MASKARIA 侧滑 → 分隔线自左拉出）。
 * 真实只在**非 p4** 频道首页用（黄频道首页是静态衬线 h1，见 Dashboard.tsx `isP4 ?` 分支），红色 P5R demo 做了红主题版；
 * 这里补 P4G 版供对照 / 可选接入：节奏照抄 GSAP 时间线，流光改成 P4G 黄黑描边 + 一道白光横扫（translateX，不用 background-clip 动画）。
 * 只动 transform / opacity；低动效直接终态。点击任意处 / 3.6s 自动收场（demo 宿主行为，真实是常驻页头）。
 */
import { AnimatePresence, motion } from 'framer-motion';
import { useEffect } from 'react';
import type { OverlayProps } from '@yellow/registry/types';
import { P4Outline, Portal, useEscape } from '@yellow/kit';
import { useLowMotion } from '@yellow/lib/prefs';
import { Sparkle4 } from '@yellow/screens/pkg1/bits';

const CHARS = Array.from('面具庭园');
const LATIN = Array.from('MASKARIA');

export default function BrandTitleReveal({ open, onClose }: OverlayProps) {
  const low = useLowMotion();
  useEscape(open, onClose);
  useEffect(() => { if (!open) return; const t = setTimeout(onClose, 3600); return () => clearTimeout(t); }, [open, onClose]);
  const ease = [0.2, 0.9, 0.1, 1] as const;
  return (
    <Portal>
      <AnimatePresence>
        {open && (
          <motion.div key="brand" role="dialog" aria-modal="true" aria-label="面具庭园 MASKARIA" onClick={onClose}
            className="fixed inset-0 flex items-center justify-center overflow-hidden p-4" style={{ zIndex: 'var(--p4g-z-celebration)' as unknown as number }}
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0, transition: { duration: 0.2 } }}>
            <div className="absolute inset-0 bg-black/[0.72]" />
            <div className="relative flex w-full max-w-[560px] min-w-0 flex-col items-start rounded-sm border-3 border-p4g-black bg-p4g-yellow px-5 pb-5 pt-4 shadow-hard-lg night:border-p4g-yellow">
              <div aria-hidden className="absolute inset-x-0 top-0 h-2 p4g-candy-h" />
              {/* 眉标落位 */}
              <motion.span className="mt-2 -rotate-2 rounded-xs bg-p4g-black px-2.5 py-0.5 font-display text-meta font-bold italic tracking-[0.3em] text-p4g-yellow"
                initial={low ? false : { y: -16, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ duration: 0.3, ease }}>TODAY&apos;S SHOW</motion.span>
              {/* 逐字升起（带斜界微旋） */}
              <div className="relative mt-3 flex max-w-full overflow-hidden pb-1">
                {CHARS.map((c, i) => (
                  <motion.span key={i} className="inline-block" initial={low ? false : { y: '110%', rotate: 8, opacity: 0 }} animate={{ y: '0%', rotate: 0, opacity: 1 }}
                    transition={{ duration: 0.42, delay: 0.18 + i * 0.07, ease }}>
                    <P4Outline size="clamp(44px,15vw,84px)" stroke={7} className="leading-none">{c}</P4Outline>
                  </motion.span>
                ))}
                {!low && (
                  <motion.span aria-hidden className="pointer-events-none absolute inset-y-0 left-0 w-1/3" style={{ background: 'linear-gradient(100deg, transparent, rgba(255,255,255,0.75), transparent)' }}
                    initial={{ x: '-120%', opacity: 0 }} animate={{ x: '320%', opacity: [0, 1, 0] }} transition={{ duration: 0.9, delay: 0.7, ease: 'easeInOut' }} />
                )}
              </div>
              {/* MASKARIA 侧滑 */}
              <motion.div className="mt-1 flex items-center gap-2" initial={low ? false : { x: -40, opacity: 0 }} animate={{ x: 0, opacity: 1 }} transition={{ duration: 0.36, delay: 0.5, ease }}>
                <span className="font-display text-h2 font-bold italic tracking-[0.32em] text-p4g-black">{LATIN.join('')}</span>
                <Sparkle4 size={18} color="var(--p4g-orange)" />
              </motion.div>
              {/* 分隔线自左拉出 */}
              <motion.div aria-hidden className="mt-3 h-[6px] w-full origin-left border-y-2 border-p4g-black p4g-hazard"
                initial={low ? false : { scaleX: 0 }} animate={{ scaleX: 1 }} transition={{ duration: 0.45, delay: 0.72, ease }} />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </Portal>
  );
}
