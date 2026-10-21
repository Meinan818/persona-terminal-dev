/**
 * B7 日历翻页（日期切换）—— 蓝专属：P3 的「日期推进」画面——整格竖向推移（不是翻纸），星期与月相一起换帧。
 *   <DateRoll date={d} />                 d 变化即播：旧格上滑出、新格自下滑入（320ms，--bk-ease-sink）
 *   <DateRoll date={d} size={64} showMoon={false} />
 * 窄斜体大字月/日 + 英文星期块（周六蓝、周日红）+ 当日月相；低动效：直接换。
 */
import { type CSSProperties } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useBoldness, slantClip } from './_env';
import { MoonPhase, moonPhaseOf } from './Moon';

const WD = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];

export const DateRoll = ({ date, size = 56, showMoon = true, className, style }: { date: Date; size?: number; showMoon?: boolean; className?: string; style?: CSSProperties }) => {
  const anim = useBoldness();
  const key = `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
  const wd = date.getDay();
  const wdBg = wd === 0 ? 'var(--bk-red)' : wd === 6 ? 'var(--p3r-blue)' : 'var(--p3r-ink)';
  const cond: CSSProperties = { fontFamily: 'var(--p3r-font-cond)', fontStyle: 'italic', fontWeight: 800, lineHeight: 0.9 };
  return (
    <div className={className} aria-live="polite" style={{ position: 'relative', overflow: 'hidden', height: size * 1.12, display: 'inline-block', minWidth: size * 3.2, ...style }}>
      <AnimatePresence initial={false} mode="popLayout">
        <motion.div key={key} style={{ display: 'flex', alignItems: 'flex-end', gap: size * 0.14, height: '100%' }}
          initial={anim ? { y: '100%' } : { opacity: 0 }} animate={{ y: '0%', opacity: 1 }} exit={anim ? { y: '-100%' } : { opacity: 0 }}
          transition={{ duration: anim ? 0.32 : 0.01, ease: [0.33, 0, 0.15, 1] }}>
          <span style={{ ...cond, fontSize: size * 0.5, color: 'var(--p3r-ink-soft)', paddingBottom: size * 0.06 }}>{date.getMonth() + 1}/</span>
          <span style={{ ...cond, fontSize: size, color: 'var(--p3r-ink)' }}>{String(date.getDate()).padStart(2, '0')}</span>
          <span style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 4, paddingBottom: size * 0.08 }}>
            {showMoon && <MoonPhase phase={moonPhaseOf(date)} size={size * 0.34} halo={false} />}
            <span style={{ ...cond, fontSize: size * 0.24, letterSpacing: '0.08em', padding: '1px 8px 1px 6px', background: wdBg, color: 'var(--p3r-cream)', clipPath: slantClip(5) }}>{WD[wd]}</span>
          </span>
        </motion.div>
      </AnimatePresence>
    </div>
  );
};
