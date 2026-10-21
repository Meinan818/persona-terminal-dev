/**
 * LogoReveal —— 品牌 Logo 逐字揭示（真实 BrandTitleReveal 的 p3 形态 / P3R 开机 Logo + TOUCH TO START）。
 *   <LogoReveal text="MASKARIA" sub="面具庭园" onDone={…} touch />
 * 时序：逐字自左裁切揭示（每字 70ms，斜体窄字）→ 句点双片戳入 → 蓝下划斜带拉出 → 副标淡入 → TOUCH TO START 呼吸。
 * 低动效：直出终态，onDone 立即回调。
 */
import { motion } from 'framer-motion';
import { useEffect, useRef } from 'react';
import { useBoldness } from '@blue/lib/prefs';
import { cx } from '@blue/lib/cx';
import { P3R, TitlePeriod, slantClip } from '@blue/kit/base';

export const LogoReveal = ({ text = 'MASKARIA', sub, touch = false, onDone, size = 'clamp(48px, 15vw, 120px)', className, replayKey }: {
  text?: string; sub?: string; touch?: boolean; onDone?: () => void; size?: string; className?: string; replayKey?: number | string;
}) => {
  const anim = useBoldness();
  const cb = useRef(onDone); cb.current = onDone;
  const total = text.length * 0.07 + 0.9;
  useEffect(() => { const t = window.setTimeout(() => cb.current?.(), anim ? total * 1000 : 0); return () => clearTimeout(t); }, [anim, total, replayKey]);
  return (
    <div key={replayKey} className={cx('relative inline-flex flex-col items-start', className)}>
      <div className="flex items-end">
        {text.split('').map((ch, i) => (
          <motion.span key={i} className="font-cond leading-[0.9]" style={{ fontSize: size, color: P3R.ink }}
            initial={anim ? { clipPath: 'inset(-10% 100% -10% 0)', y: 10, opacity: 0 } : false}
            animate={{ clipPath: 'inset(-10% -20% -10% -10%)', y: 0, opacity: 1 }}
            transition={{ delay: 0.1 + i * 0.07, duration: 0.28, ease: [0.22, 0.9, 0.3, 1] }}>{ch}</motion.span>
        ))}
        <TitlePeriod className="mb-[0.18em] ml-1" />
      </div>
      <motion.span aria-hidden className="mt-1 block h-[8px] w-full" style={{ background: P3R.blue, clipPath: slantClip(6), originX: 0 }}
        initial={anim ? { scaleX: 0 } : false} animate={{ scaleX: 1 }} transition={{ delay: 0.15 + text.length * 0.07, duration: 0.35 }} />
      {sub && (
        <motion.span className="mt-2 font-heavy text-[clamp(16px,4.6vw,26px)] tracking-[0.3em]" style={{ color: P3R.inkSoft }}
          initial={anim ? { opacity: 0, x: -10 } : false} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.3 + text.length * 0.07 }}>{sub}</motion.span>
      )}
      {touch && (
        <motion.span className="mt-8 self-center font-cond text-[14px] tracking-[0.4em]" style={{ color: P3R.blue }}
          initial={{ opacity: 0 }} animate={anim ? { opacity: [0, 1, 0.35, 1] } : { opacity: 1 }} transition={anim ? { delay: total, duration: 2.2, repeat: Infinity } : undefined}>TOUCH TO START</motion.span>
      )}
    </div>
  );
};
