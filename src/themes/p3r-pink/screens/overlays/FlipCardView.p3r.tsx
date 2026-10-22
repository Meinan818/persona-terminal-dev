/**
 * 图鉴共用的放大 + 翻面页（真实 src/components/codex/FlipCardView.tsx）+ 岁时卡（SeasonCard.tsx）→ 粉白 P3R。
 * 莓紫幕 + 左上玫红斜标签「X · 图鉴 / 岁时册」+ 右上斜切关闭；卡入场 scale .92 + 斜向位移 springSoft（damping28/stiffness300）；
 * 点一下或横向拖过 90px 翻面，拖动时牌跟手转（rotateY，只动 transform）。intro=true（演出版）：玫红斜带横扫 0–0.7s →
 * 牌自右飞入旋正 + 3D 翻正（spring 200/20，0.35s 起）→ 1.6s 自动翻到背面 → 2.2s 提示出现。低动效直出终态。
 * 默认导出 = 岁时翻面卡（achv-season-flip）：卡面（收录盖「收」印）/ 背面小注 + 收录状态。?mark=<key> ?collected=0
 */
import { useEffect, useState, type ReactNode } from 'react';
import { AnimatePresence, motion, useMotionValue, useSpring, type PanInfo } from 'framer-motion';
import type { OverlayProps } from '@pink/registry/types';
import { Portal, IconClose, useEscape, useScrollLock, P3R, slantClip, tickClip, chamferClip } from '@pink/kit';
import { useBoldness } from '@pink/lib/prefs';
import { seasonAsset } from '@pink/lib/asset';
import { P5_SEASON_PAGES, type P5SeasonMark } from '@pink/mock/pkg5-season';
import { P5_TODAY, SEASON_COLLECTED } from '@pink/mock/pkg5';

export function FlipCardView({ open, onClose, label, resetKey, front, back, hint = '点一下或左右拖动翻面', footer, intro }: {
  open: boolean; onClose: () => void; label: string; resetKey?: string; front: (w: number, h: number) => ReactNode; back: (w: number, h: number) => ReactNode; hint?: string; footer?: ReactNode; intro?: boolean;
}) {
  const anim = useBoldness();
  const playIntro = !!intro && anim;
  const [flipped, setFlipped] = useState(false);
  const [hintOn, setHintOn] = useState(!playIntro);
  const drag = useMotionValue(0);
  const dragSpring = useSpring(drag, { stiffness: 260, damping: 22, mass: 0.9 });
  useScrollLock(open);
  useEscape(open, onClose);
  useEffect(() => {
    if (!open) return;
    setFlipped(!!intro && !anim); setHintOn(!playIntro); drag.set(0);
    if (!playIntro) return;
    const t1 = window.setTimeout(() => setFlipped(true), 1600);
    const t2 = window.setTimeout(() => setHintOn(true), 2200);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, [open, resetKey, drag, intro, anim, playIntro]);
  const vw = typeof window !== 'undefined' ? window.innerWidth : 390;
  const vh = typeof window !== 'undefined' ? window.innerHeight : 844;
  const width = Math.min(300, Math.round(Math.min(vw, 480) * 0.68), Math.round((vh - 170) / 1.6));
  const height = Math.round(width * 1.6);
  const onPan = (_: unknown, info: PanInfo) => drag.set(Math.max(-140, Math.min(140, info.offset.x)));
  const onPanEnd = (_: unknown, info: PanInfo) => { if (Math.abs(info.offset.x) > 90 || Math.abs(info.velocity.x) > 600) setFlipped((f) => !f); drag.set(0); };
  return (
    <Portal>
      <AnimatePresence>
        {open && (
          <motion.div key="flip" className="fixed inset-0 flex flex-col items-center justify-center overflow-hidden p-5" style={{ zIndex: 'var(--p3r-z-celebration)' as unknown as number, background: 'var(--p3r-scrim)' }}
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} role="dialog" aria-modal="true" aria-label={label}>
            {playIntro && (
              <motion.div aria-hidden className="pointer-events-none absolute left-[-20vw] top-1/2 w-[140vw] py-6" style={{ rotate: -12, background: 'var(--pk-band)', boxShadow: '0 -3px 0 var(--pk-band-edge), 0 3px 0 var(--p3r-cyan)' }}
                initial={{ x: '-100%' }} animate={{ x: ['-100%', '0%', '0%', '100%'] }} transition={{ duration: 0.9, times: [0, 0.3, 0.6, 1], ease: [0.5, 0, 0.3, 1] }}>
                <div className="whitespace-nowrap text-center font-cond text-[clamp(44px,12vw,96px)] leading-none" style={{ color: 'var(--p3r-cream)' }}>ARCANA</div>
              </motion.div>
            )}
            <motion.div className="absolute left-4 top-4 flex max-w-[70%] items-center gap-2" style={{ marginTop: 'env(safe-area-inset-top)' }} initial={anim ? { x: -30, opacity: 0 } : false} animate={{ x: 0, opacity: 1 }} transition={{ delay: playIntro ? 0.5 : 0.08 }}>
              <span className="truncate px-4 py-1.5 text-[13px] font-black" style={{ background: P3R.blue, color: P3R.onBlue, clipPath: slantClip(7) }}>{label}</span>
              <span aria-hidden className="h-[9px] w-[16px] shrink-0" style={{ background: P3R.cyan, clipPath: tickClip }} />
            </motion.div>
            <button type="button" onClick={onClose} aria-label="关闭" className="absolute right-4 top-4 flex h-11 w-11 items-center justify-center active:scale-90" style={{ marginTop: 'env(safe-area-inset-top)', background: P3R.panel, color: P3R.ink, clipPath: slantClip(7) }}><IconClose size={18} /></button>
            <motion.div className="relative touch-pan-y select-none" style={{ width, height, perspective: 1200 }}
              onClick={(e) => { e.stopPropagation(); setFlipped((f) => !f); }} onPan={onPan} onPanEnd={onPanEnd}
              initial={playIntro ? { x: '70vw', rotate: 40, opacity: 0 } : anim ? { opacity: 0, scale: 0.92, x: -14, y: 14 } : { opacity: 0 }}
              animate={{ x: 0, y: 0, rotate: 0, scale: 1, opacity: 1 }} exit={{ opacity: 0, scale: 0.92 }}
              transition={playIntro ? { type: 'spring', stiffness: 200, damping: 20, delay: 0.35 } : { type: 'spring', damping: 28, stiffness: 300 }}>
              <motion.div className="relative h-full w-full" style={{ transformStyle: 'preserve-3d', rotateY: dragSpring }}
                initial={playIntro ? { rotateX: 0, rotateZ: 0 } : false}
                animate={{ rotateY: flipped ? 180 : 0 }} transition={anim ? { type: 'spring', stiffness: 200, damping: 20 } : { duration: 0.15 }}>
                <div className="absolute inset-0" style={{ backfaceVisibility: 'hidden', filter: 'drop-shadow(10px 12px 0 rgb(var(--p3r-blue-rgb) / 0.45))' }}>
                  <div className="h-full w-full overflow-hidden" style={{ clipPath: chamferClip(14, 14) }}>{front(width, height)}</div>
                </div>
                <div className="absolute inset-0" style={{ backfaceVisibility: 'hidden', transform: 'rotateY(180deg)', filter: 'drop-shadow(-10px 12px 0 rgb(var(--p3r-cyan-rgb) / 0.5))' }}>
                  <div className="h-full w-full overflow-hidden" style={{ clipPath: chamferClip(14, 14) }}>{back(width, height)}</div>
                </div>
              </motion.div>
            </motion.div>
            <AnimatePresence>
              {hintOn && (
                <motion.p key="hint" className="relative mt-6 flex items-center gap-2 px-4 py-1.5 text-[12px] font-black" style={{ background: 'rgb(var(--p3r-ink-rgb) / 0.75)', color: 'var(--p3r-on-ink)', clipPath: slantClip(6) }} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}>
                  <span aria-hidden style={{ color: P3R.blue }}>⟲</span>{hint}
                </motion.p>
              )}
            </AnimatePresence>
            {footer && <div className="relative mt-3" onClick={(e) => e.stopPropagation()}>{footer}</div>}
          </motion.div>
        )}
      </AnimatePresence>
    </Portal>
  );
}

/** 背面纸面：象牙白 + 顶部玫红→樱斜条 */
export const FlipBackPanel = ({ children }: { children: ReactNode }) => (
  <div className="relative h-full w-full overflow-y-auto p-5 text-left" style={{ background: P3R.panel, color: P3R.ink }}>
    <div aria-hidden className="absolute inset-x-0 top-0 h-2" style={{ background: `linear-gradient(90deg, ${P3R.blue}, ${P3R.cyan})` }} />
    <div className="pt-1">{children}</div>
  </div>
);

/** 岁时卡（原画 public/assets/season/pink/*.webp；未收录灰化半透明；收录盖「收」印） */
export function SeasonCard({ mark, collected, className, eager }: { mark: P5SeasonMark; collected: boolean; className?: string; eager?: boolean }) {
  const [broken, setBroken] = useState(false);
  return (
    <span className={className} style={{ display: 'block', position: 'relative', width: '100%', aspectRatio: '5 / 8' }}>
      {broken ? (
        <span className="flex h-full w-full flex-col items-center justify-center" style={{ background: P3R.cyanPale, color: P3R.ink, opacity: collected ? 1 : 0.5, clipPath: chamferClip(8, 8) }}>
          <span className="font-cond text-[10px] tracking-widest">{mark.kind === 'term' ? 'SOLAR TERM' : 'FESTIVAL'}</span>
          <span className="mt-2 font-heavy text-[20px]">{mark.name}</span>
          <span className="mt-1 text-[10px]">{mark.en}</span>
        </span>
      ) : (
        <img src={seasonAsset(mark.art)} alt={`${mark.name} · ${mark.en}`} loading={eager ? "eager" : "lazy"} decoding="async" draggable={false} onError={() => setBroken(true)} className="block h-full w-full object-contain" style={{ filter: collected ? undefined : 'grayscale(1)', opacity: collected ? 1 : 0.42 }} />
      )}
      {collected && <span aria-hidden className="absolute right-[8%] top-[6%] flex h-[13%] max-h-7 w-[13%] max-w-7 rotate-6 items-center justify-center text-[11px] font-black text-white" style={{ background: P3R.magenta, clipPath: slantClip(3) }}>收</span>}
    </span>
  );
}

export function SeasonFlipView({ mark, open, onClose, collectedOverride }: { mark: P5SeasonMark | null; open: boolean; onClose: () => void; collectedOverride?: boolean }) {
  if (!mark) return null;
  const collected = collectedOverride ?? !!SEASON_COLLECTED[mark.date];
  const isToday = mark.date === P5_TODAY;
  const future = mark.date > P5_TODAY;
  return (
    <FlipCardView open={open} onClose={onClose} label={`${mark.name} · 岁时册`} resetKey={mark.key} hint="点一下或左右拖动翻面 · 背面是小注"
      front={() => <SeasonCard mark={mark} collected={collected} />}
      back={() => (
        <FlipBackPanel>
          <div className="font-cond text-[11px] tracking-[0.25em]" style={{ color: P3R.roseInk }}>{mark.kind === 'term' ? 'SOLAR TERM · 节气' : 'FESTIVAL · 节日'}</div>
          <div className="mt-1 font-heavy text-[26px] leading-none">{mark.name}</div>
          <div className="mt-1 text-[11px] font-bold tracking-[0.2em]" style={{ color: P3R.grey }}>{mark.en.toUpperCase()}</div>
          <p className="mt-4 text-[14px] leading-relaxed">{mark.note}</p>
          <div className="mt-5 px-3 py-2 text-[12px] font-black" style={{ clipPath: slantClip(6), background: collected ? P3R.blue : 'var(--p3r-row)', color: collected ? P3R.onBlue : P3R.inkSoft }}>
            {collected ? `已收录 · ${SEASON_COLLECTED[mark.date] ?? mark.date}` : isToday ? '今天记一条，就收进岁时册' : future ? `${mark.date.slice(5).replace('-', '月')}日到来 · 当天记一条就收` : '那天没有记录，这一枚空着了'}
          </div>
        </FlipBackPanel>
      )} />
  );
}

export default function SeasonFlipDemo({ open, onClose, params }: OverlayProps) {
  const all = P5_SEASON_PAGES[2026].flatMap((p) => p.marks);
  const key = params?.get('mark');
  const mark = all.find((m) => m.key === key) ?? all.find((m) => m.name === '寒露') ?? all[0];
  const c = params?.get('collected');
  return <SeasonFlipView mark={mark} open={open} onClose={onClose} collectedOverride={c === '0' ? false : c === '1' ? true : undefined} />;
}
