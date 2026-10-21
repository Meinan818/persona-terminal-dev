/**
 * BrandTitleReveal.p3r —— 品牌标题揭示（两个演出共用一个文件）。
 * 默认 home-brand-title（≈3.0s，首页首屏每次挂载播一次）：DashboardP3 标题区——
 *   .08s 起 MASKARIA 八字带斜界微旋逐字升起（yPercent 110 / rotate -8° / scale .92，.72s，错帧 .06，同 BrandTitleReveal GSAP 时间线）→
 *   .35s 底衬三角自左揭示（TitleTri .55s）→ 三角蒙版染字层同步显形 → 句点青 / 臂章红双片 spring 戳入 → .9s 问候副题滑入 →
 *   1.1s 日期块（大日数字 / 月 / 星期 / 斜线 / 天空位）错帧上推 → 1.8s 起底衬三角顶点持续沸腾、斜光片扫过标题一次 → 停留。
 * ?mode=logo home-brand-logo-reveal（≈3.6s，开屏标题段 / 欢迎第一页的品牌 Logo）：BrandTitleReveal 时间线 + P3R 标题画面——
 *   0s 眉标「欢迎来到」落位（y -10，.4s）→ .08s 逐字升起 → .5s 副标「面具庭园」侧滑（x -8 / rotate -4°）→ .55s 分隔斜带自左拉出 →
 *   .9s 句点戳入 → 1.4s「TOUCH TO START」呼吸闪烁（循环）。
 * 「再播一次」重放。低动效：直出终态 + 淡入。
 */
import { motion } from 'framer-motion';
import { useEffect, useState } from 'react';
import type { OverlayProps } from '@blue/registry/types';
import { P3Button, P3R, TitlePeriod, GhostWords, slantClip } from '@blue/kit';
import { BlueStage, BlueHeroDecor } from '@blue/fx';
import { useBoldness } from '@blue/lib/prefs';
import { MoonPhase, TitleTriWobble, TRI_MASK_URI } from '@blue/screens/pkg1/DashboardParts';
import { SeasonStampChip } from './SeasonStampBadge.p3r';
import { StageChip } from '@blue/screens/pkg1/fxbits';

const CHARS = 'MASKARIA'.split('');
const charAnim = (anim: boolean, i: number, base = 0.08) => ({
  initial: anim ? { y: '110%', opacity: 0, rotate: -8, scale: 0.92 } : false as const,
  animate: { y: '0%', opacity: 1, rotate: 0, scale: 1 },
  transition: { duration: 0.72, delay: base + i * 0.06, ease: [0.215, 0.61, 0.355, 1] as [number, number, number, number] },
});

function HomeTitleShow({ k }: { k: number }) {
  const anim = useBoldness();
  const [sheen, setSheen] = useState(false);
  useEffect(() => { if (!anim) return; setSheen(false); const t = window.setTimeout(() => setSheen(true), 1800); return () => clearTimeout(t); }, [k, anim]);
  const now = new Date();
  return (
    <div key={k} className="relative mx-auto w-full max-w-page px-4 pt-6 wide:px-8">
      <BlueHeroDecor />
      <GhostWords words={['PERSONA', 'TERMINAL']} className="right-[10px] top-[10px] text-right text-[58px]" />
      <header className="relative pt-4">
        <h1 className="relative inline-flex items-end font-heavy leading-[0.95] tracking-tight" style={{ color: P3R.ink, fontSize: 'min(54px, 13.4vw)', isolation: 'isolate' }} aria-label="MASKARIA">
          <span className="relative inline-flex overflow-hidden pb-[0.08em] pr-[0.06em]" aria-hidden>
            {CHARS.map((c, i) => <motion.span key={i} className="inline-block origin-bottom" {...charAnim(anim, i)}>{c}</motion.span>)}
            {sheen && <motion.span className="pointer-events-none absolute inset-y-0 w-[22%]" style={{ background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.7), transparent)', skewX: -20 }} initial={{ left: '-30%' }} animate={{ left: '120%' }} transition={{ duration: 0.7, ease: 'easeInOut' }} />}
          </span>
          <motion.span initial={anim ? { opacity: 0 } : false} animate={{ opacity: 1 }} transition={{ delay: 0.6 }}><TitlePeriod className="mb-1.5 ml-1.5" /></motion.span>
          <TitleTriWobble delay={0.35} style={{ left: -10, right: 30, top: 6, bottom: -8, transform: 'translate(-1.6px, -6.9px) rotate(3deg)' }} />
          <motion.span aria-hidden className="pointer-events-none absolute inset-0 select-none"
            initial={anim ? { opacity: 0 } : false} animate={{ opacity: 1 }} transition={{ delay: 0.85, duration: 0.3 }}
            style={{ backgroundImage: TRI_MASK_URI, backgroundRepeat: 'no-repeat', backgroundPosition: '-11.6px -0.9px', backgroundSize: 'calc(100% - 20px) calc(100% + 2px)', WebkitBackgroundClip: 'text', backgroundClip: 'text', color: 'transparent', WebkitTextFillColor: 'transparent' }}>MASKARIA</motion.span>
        </h1>
        <motion.p className="mt-2 text-[15px] font-bold" style={{ color: P3R.roseInk }} initial={anim ? { opacity: 0, x: -14 } : false} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.9, duration: 0.35 }}>深夜努力的人终会发光</motion.p>
        <motion.div className="mt-4 flex flex-wrap items-center gap-x-2.5 gap-y-2" initial={anim ? 'h' : false} animate="s" variants={{ h: {}, s: { transition: { staggerChildren: 0.07, delayChildren: 1.1 } } }}>
          {[
            <span key="d" className="font-cond text-[58px] leading-none" style={{ color: P3R.blue }}>{now.getDate()}</span>,
            <span key="m" className="flex flex-col gap-0.5 font-cond text-[14px] leading-none" style={{ color: P3R.roseInk }}><span>{['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'][now.getMonth()]}</span><span>{['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'][now.getDay()]}</span></span>,
            <SeasonStampChip key="s" collected={false} />,
            <span key="b" aria-hidden className="ml-1 block h-10 w-[3px]" style={{ background: P3R.blue, transform: 'skewX(-24deg)' }} />,
            <MoonPhase key="mo" date={now} />,
          ].map((el, i) => <motion.span key={i} className="inline-flex" variants={{ h: { opacity: 0, y: 14 }, s: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 420, damping: 30 } } }}>{el}</motion.span>)}
        </motion.div>
      </header>
    </div>
  );
}

function LogoShow({ k }: { k: number }) {
  const anim = useBoldness();
  return (
    <div key={k} className="relative flex min-h-[100dvh] items-center justify-center overflow-hidden px-6">
      <GhostWords words={['MASKARIA', 'GARDEN']} outline className="left-[-6%] top-[8%] text-[clamp(90px,26vw,240px)]" />
      <div aria-hidden className="absolute -left-[10%] top-[66%] h-[60px] w-[130%] -rotate-[9deg]" style={{ background: 'var(--bk-band)' }} />
      <div className="relative inline-flex flex-col items-start">
        <motion.span className="mb-1 ml-0.5 block text-[12px] font-black tracking-[0.25em]" style={{ color: P3R.grey }} initial={anim ? { y: -10, opacity: 0 } : false} animate={{ y: 0, opacity: 1 }} transition={{ duration: 0.4, ease: [0.215, 0.61, 0.355, 1] }}>欢迎来到</motion.span>
        <div className="relative flex items-end">
          <h1 className="flex overflow-hidden pb-[0.06em] font-heavy leading-none" style={{ fontSize: 'clamp(46px, 14.5vw, 120px)', letterSpacing: '-0.04em' }} aria-label="MASKARIA">
            {CHARS.map((c, i) => <motion.span key={i} aria-hidden className="inline-block origin-bottom" style={{ color: P3R.ink }} {...charAnim(anim, i)}>{c}</motion.span>)}
          </h1>
          <motion.span initial={anim ? { scale: 0, opacity: 0 } : false} animate={{ scale: 1, opacity: 1 }} transition={{ delay: 0.9, type: 'spring', stiffness: 520, damping: 22 }}><TitlePeriod className="mb-[0.2em] ml-1.5 scale-125" /></motion.span>
        </div>
        <motion.span aria-hidden className="mt-1 block h-[8px] w-full origin-left" style={{ background: P3R.blue, clipPath: slantClip(6) }} initial={anim ? { scaleX: 0 } : false} animate={{ scaleX: 1 }} transition={{ delay: 0.55, duration: 0.6, ease: [0.215, 0.61, 0.355, 1] }} />
        <motion.span className="mt-2 inline-block px-3 py-1 font-heavy text-[clamp(18px,5vw,30px)] tracking-[0.3em]" style={{ background: P3R.blue, color: 'var(--p3r-on-blue)', clipPath: slantClip(10) }}
          initial={anim ? { x: -8, opacity: 0, rotate: -4 } : false} animate={{ x: 0, opacity: 1, rotate: 0 }} transition={{ delay: 0.5, duration: 0.5 }}>面具庭园</motion.span>
        <motion.span className="mt-10 self-center font-cond text-[15px] tracking-[0.42em]" style={{ color: P3R.roseInk }}
          initial={{ opacity: 0 }} animate={anim ? { opacity: [0, 1, 0.3, 1] } : { opacity: 1 }} transition={anim ? { delay: 1.4, duration: 2.2, repeat: Infinity } : undefined}>TOUCH TO START</motion.span>
      </div>
    </div>
  );
}

export default function BrandTitleOverlay({ open, params }: OverlayProps) {
  const logo = params?.get('mode') === 'logo';
  const [k, setK] = useState(0);
  if (!open) return null;
  return (
    <div className="fixed inset-0 overflow-y-auto" style={{ zIndex: 'var(--p3r-z-celebration)' as unknown as number, background: 'var(--p3r-bg)' }} >
      <BlueStage variant={logo ? 'plain' : 'home'} />
      <StageChip text={logo ? 'LOGO REVEAL' : 'HOME TITLE'} />
      <div className="relative z-10">{logo ? <LogoShow k={k} /> : <HomeTitleShow k={k} />}</div>
      <div className="fixed bottom-[calc(18px+env(safe-area-inset-bottom))] right-3 z-20"><P3Button size="sm" tone="ink" onClick={() => setK((x) => x + 1)}>再播一次</P3Button></div>
    </div>
  );
}
