/**
 * 图鉴共用的放大 + 翻面页（真实 src/components/codex/FlipCardView.tsx）+ 岁时卡（SeasonCard.tsx）。
 * P4G 版：黑幕 + 扫描线 + 电视开机弹出；点一下或横向拖过 90px 翻面，拖动时牌跟手转（只动 transform），右上「关闭」。
 * 默认导出 = 岁时翻面卡（achv-season-flip）：「X · 岁时册」卡面（收 朱印）/ 背面小注 + 收录状态。?mark=<key> ?collected=0
 */
import { useEffect, useState, type ReactNode } from 'react';
import { AnimatePresence, motion, useMotionValue, useSpring, type PanInfo } from 'framer-motion';
import type { OverlayProps } from '@yellow/registry/types';
import { Portal, IconClose, useEscape, useScrollLock } from '@yellow/kit';
import { ScanlineOverlay } from '@yellow/fx';
import { useLowMotion } from '@yellow/lib/prefs';
import { asset } from '@yellow/lib/asset';
import { useImageOk } from '@yellow/lib/slots';
import { P5_SEASON_PAGES, type P5SeasonMark } from '@yellow/mock/pkg5-season';
import { P5_TODAY } from '@yellow/mock/pkg5';
import { useSeasonCollectedMap } from '@/themes/astrologyData';

export function FlipCardView({ open, onClose, label, resetKey, front, back, hint = '点一下或左右拖动翻面', footer }: {
  open: boolean; onClose: () => void; label: string; resetKey?: string; front: (w: number, h: number) => ReactNode; back: (w: number, h: number) => ReactNode; hint?: string; footer?: ReactNode;
}) {
  const low = useLowMotion();
  const [flipped, setFlipped] = useState(false);
  const drag = useMotionValue(0);
  const dragSpring = useSpring(drag, { stiffness: 260, damping: 22, mass: 0.9 });
  useScrollLock(open);
  useEscape(open, onClose);
  useEffect(() => { if (open) { setFlipped(false); drag.set(0); } }, [open, resetKey, drag]);
  const width = Math.min(300, Math.round(Math.min(typeof window !== 'undefined' ? window.innerWidth : 390, 480) * 0.68), typeof window !== 'undefined' ? Math.round((window.innerHeight - 170) / 1.6) : 300);
  const height = Math.round(width * 1.6);
  const onPan = (_: unknown, info: PanInfo) => drag.set(Math.max(-140, Math.min(140, info.offset.x)));
  const onPanEnd = (_: unknown, info: PanInfo) => { if (Math.abs(info.offset.x) > 90 || Math.abs(info.velocity.x) > 600) setFlipped((f) => !f); drag.set(0); };
  return (
    <Portal>
      <AnimatePresence>
        {open && (
          <motion.div key="flip" className="fixed inset-0 flex flex-col items-center justify-center bg-[color:var(--p4g-scrim)] p-5" style={{ zIndex: 'var(--p4g-z-celebration)' as unknown as number }}
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} role="dialog" aria-modal="true" aria-label={label}>
            <div aria-hidden className="absolute inset-0 bg-p4g-black/60" />
            <ScanlineOverlay />
            <div className="absolute left-4 top-4 flex max-w-[70%] items-center gap-2" style={{ marginTop: 'env(safe-area-inset-top)' }}>
              <span className="truncate rounded-xs bg-p4g-yellow px-2.5 py-1 font-display text-meta font-bold text-p4g-black">{label}</span>
            </div>
            <button type="button" onClick={onClose} aria-label="关闭" className="p4g-press absolute right-4 top-4 flex h-11 w-11 items-center justify-center rounded-sm border-3 border-p4g-black bg-p4g-yellow text-p4g-black shadow-hard-sm" style={{ marginTop: 'env(safe-area-inset-top)' }}><IconClose size={16} /></button>
            <motion.div className="relative touch-pan-y select-none" style={{ width, height, perspective: 1200 }}
              onClick={(e) => { e.stopPropagation(); setFlipped((f) => !f); }} onPan={onPan} onPanEnd={onPanEnd}
              initial={low ? { opacity: 0 } : { scaleY: 0.02, scaleX: 0.4, opacity: 0 }} animate={low ? { opacity: 1 } : { scaleY: [0.02, 0.02, 1], scaleX: [0.4, 1, 1], opacity: [0, 1, 1] }} exit={{ opacity: 0, scale: 0.85 }}
              transition={{ duration: 0.4, times: [0, 0.35, 1], ease: [0.16, 1, 0.3, 1] }}>
              <motion.div className="relative h-full w-full" style={{ transformStyle: 'preserve-3d', rotateY: dragSpring }} animate={{ rotateY: flipped ? 180 : 0 }} transition={low ? { duration: 0.15 } : { type: 'spring', stiffness: 260, damping: 20 }}>
                <div className="absolute inset-0 overflow-hidden rounded-sm border-3 border-p4g-black shadow-[8px_8px_0_var(--p4g-yellow)]" style={{ backfaceVisibility: 'hidden' }}>{front(width, height)}</div>
                <div className="absolute inset-0 overflow-hidden rounded-sm border-3 border-p4g-black shadow-[8px_8px_0_var(--p4g-orange)]" style={{ backfaceVisibility: 'hidden', transform: 'rotateY(180deg)' }}>{back(width, height)}</div>
              </motion.div>
            </motion.div>
            <p className="relative mt-6 flex items-center gap-2 p4g-outline-sm font-display text-meta font-bold"><span className="rounded-pill border-2 border-white bg-p4g-black px-1.5 text-2xs">⟲</span>{hint}</p>
            {footer && <div className="relative mt-3" onClick={(e) => e.stopPropagation()}>{footer}</div>}
          </motion.div>
        )}
      </AnimatePresence>
    </Portal>
  );
}

/** 背面纸面：奶油纸 + 黑字 + 顶部彩条 */
export const FlipBackPanel = ({ children }: { children: ReactNode }) => (
  <div className="relative h-full w-full overflow-y-auto bg-p4g-cream p-5 text-left text-p4g-black">
    <div aria-hidden className="absolute inset-x-0 top-0 h-2 p4g-candy-h" />
    <div className="pt-1">{children}</div>
  </div>
);

/** 岁时卡（原画：public/assets/season/p4/*.webp；未收录灰化半透明；收录盖「收」朱印）*/
export function SeasonCard({ mark, collected, className }: { mark: P5SeasonMark; collected: boolean; className?: string }) {
  const src = asset(`season/p4/${mark.art}`);
  const ok = useImageOk(src);
  return (
    <span className={className} style={{ display: 'block', position: 'relative', width: '100%', aspectRatio: '5 / 8' }}>
      {ok === false ? (
        <span className="flex h-full w-full flex-col items-center justify-center rounded-sm border-3 border-p4g-black bg-p4g-yellow-pale text-p4g-black" style={{ opacity: collected ? 1 : 0.5 }}>
          <span className="font-display text-2xs font-bold tracking-widest">{mark.kind === 'term' ? 'SOLAR TERM' : 'FESTIVAL'}</span>
          <span className="mt-2 font-display text-h2 font-bold">{mark.name}</span>
          <span className="mt-1 text-2xs">{mark.en}</span>
        </span>
      ) : (
        <img src={src} alt={`${mark.name} · ${mark.en}`} loading="lazy" decoding="async" draggable={false} className="block h-full w-full rounded-sm object-contain" style={{ filter: collected ? undefined : 'grayscale(1)', opacity: collected ? 1 : 0.5 }} />
      )}
      {collected && <span aria-hidden className="absolute right-[10%] top-[7%] flex h-[13%] max-h-7 w-[13%] max-w-7 rotate-6 items-center justify-center rounded-xs bg-p4g-red font-display text-[11px] font-bold text-white shadow-hard-sm">收</span>}
    </span>
  );
}

export const seasonStatus = (m: P5SeasonMark, collectedAt?: string) =>
  collectedAt ? `已收录 · ${collectedAt.slice(0, 10)}`
    : m.date === P5_TODAY ? '今天记一条，就收进岁时册'
      : m.date < P5_TODAY ? '那天没有记录，这一枚空着了'
        : `${m.date.slice(5).replace('-', '/')} 那天记一条就能收`;

export function SeasonFlipView({ mark, open, onClose }: { mark: P5SeasonMark | null; open: boolean; onClose: () => void }) {
  // 收录状态来自真实岁时印章表（stamps），不是演示常量。
  const collected = useSeasonCollectedMap();
  if (!mark) return null;
  const at = collected[mark.date];
  return (
    <FlipCardView open={open} onClose={onClose} label={`${mark.name} · 岁时册`} resetKey={mark.key} hint="点一下或左右拖动翻面 · 背面是小注"
      front={() => <span className="block h-full w-full bg-p4g-cream"><SeasonCard mark={mark} collected={!!at} className="!h-full" /></span>}
      back={() => (
        <FlipBackPanel>
          <div className="flex items-baseline justify-between gap-2">
            <div className="min-w-0"><div className="font-display text-[24px] font-bold leading-none">{mark.name}</div><div className="mt-1 text-2xs font-bold tracking-[0.2em] opacity-60">{mark.en.toUpperCase()}</div></div>
            <div className="shrink-0 rounded-xs bg-p4g-black px-1.5 py-0.5 font-display text-meta font-bold text-p4g-yellow">{mark.kind === 'term' ? '节气' : '节日'} · {mark.date.slice(5).replace('-', '/')}</div>
          </div>
          <p className="mt-5 font-display text-[15px] font-bold leading-relaxed">{mark.note}</p>
          <div className="mt-5 border-t-2 border-dashed border-p4g-black/25 pt-3 text-2xs font-bold opacity-75">{seasonStatus(mark, at)}</div>
        </FlipBackPanel>
      )} />
  );
}

export default function FlipCardViewOverlay({ open, onClose, params }: OverlayProps) {
  const all = Object.values(P5_SEASON_PAGES[2026]).flatMap((p) => p.marks);
  const mark = all.find((m) => m.key === params?.get('mark')) ?? all.find((m) => m.name === '中秋') ?? all[0];
  return <SeasonFlipView mark={mark} open={open} onClose={onClose} />;
}
