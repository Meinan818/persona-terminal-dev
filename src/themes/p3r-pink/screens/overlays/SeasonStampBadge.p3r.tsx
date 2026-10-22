/**
 * SeasonStampBadge.p3r —— 岁时小签 + 气泡（真实 src/components/dashboard/SeasonStampBadge.tsx p3 分支）。
 *   小签：已收录 = 玫红实心平行四边形（clip 4px）+ 面板色字；未收录 = 透明底 + 玫红 1.5px 虚线框 + 玫红字。
 *   点击弹出 / 收起小注气泡（220px，面板底 + 投影）：「节气名 · 小注」+「岁时册 · 已收录 / 今天记一条，就收进岁时册」；4.5s 自动收起。
 * 演示：#/overlay/home-season-stamp（在首页上弹出，自动打开气泡）；?collected=1 已收录态；?pop=above 气泡朝上。
 */
import { AnimatePresence, motion } from 'framer-motion';
import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import type { OverlayProps } from '@pink/registry/types';
import { P3R, P3Tag } from '@pink/kit';
import { useBoldness } from '@pink/lib/prefs';
import { seasonAsset } from '@pink/lib/asset';
import { MOCK_SEASON } from '@pink/mock/pkg1';

export const SeasonStampChip = ({ collected, defaultOpen = false, pop = 'below', align = 'left', className = '' }: { collected: boolean; defaultOpen?: boolean; pop?: 'above' | 'below'; align?: 'left' | 'right'; className?: string }) => {
  const [open, setOpen] = useState(defaultOpen);
  const anim = useBoldness();
  useEffect(() => { if (!open) return; const t = window.setTimeout(() => setOpen(false), 4500); return () => clearTimeout(t); }, [open]);
  const mark = MOCK_SEASON;
  // 气泡定位：宽 min(220, 视口-24)，左缘夹在视口 [12, vw-12-w] 内（窄屏 / 靠右的小签不越界）
  const host = useRef<HTMLSpanElement>(null);
  const [dx, setDx] = useState<number | null>(null);
  useLayoutEffect(() => {
    if (!open || !host.current) return;
    const r = host.current.getBoundingClientRect(); const vw = window.innerWidth; const w = Math.min(220, vw - 24);
    const want = align === 'right' ? r.right - w : r.left;
    setDx(Math.max(12, Math.min(vw - 12 - w, want)) - r.left);
  }, [open, align]);
  return (
    <span ref={host} className={`relative inline-flex ${className}`}>
      <button type="button" onClick={(e) => { e.stopPropagation(); setOpen((v) => !v); }} aria-expanded={open}
        aria-label={`${mark.name}：${mark.note}${collected ? '（已收进岁时册）' : ''}`}
        className="relative inline-flex h-[18px] shrink-0 select-none items-center whitespace-nowrap px-1.5 text-[10px] font-black leading-none tracking-[0.06em] transition-transform active:scale-95"
        style={collected ? { background: P3R.blue, color: P3R.panel, clipPath: 'polygon(4px 0, 100% 0, calc(100% - 4px) 100%, 0 100%)' } : { background: 'transparent', color: P3R.roseInk, outline: `1.5px dashed ${P3R.blue}`, outlineOffset: -1.5 }}>
        {mark.name}
      </button>
      <AnimatePresence>
        {open && (
          <motion.span role="status" className={`absolute z-40 w-[min(220px,calc(100vw-24px))] px-3 py-2 text-left text-[12px] leading-relaxed ${pop === 'above' ? 'bottom-full mb-1.5' : 'top-full mt-1.5'} left-0`}
            style={{ left: dx ?? 0, background: P3R.panel, color: P3R.ink, boxShadow: '0 10px 28px rgba(42,13,34,0.18)', clipPath: 'polygon(0 0, 100% 0, calc(100% - 8px) 100%, 0 100%)' }}
            initial={anim ? { opacity: 0, y: pop === 'above' ? 6 : -6, scale: 0.96 } : { opacity: 0 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.18 }}>
            <b className="font-black">{mark.name}</b><span className="mx-1 opacity-50">·</span>{mark.note}
            <span className="mt-1 block text-[11px] font-bold opacity-70">{collected ? '岁时册 · 已收录' : '今天记一条，就收进岁时册'}</span>
          </motion.span>
        )}
      </AnimatePresence>
    </span>
  );
};

export default function SeasonStampOverlay({ open, onClose, params }: OverlayProps) {
  const collected = params?.get('collected') === '1';
  if (!open) return null;
  return (
    <div className="fixed inset-x-0 top-[calc(18px+env(safe-area-inset-top))] z-[60] flex justify-center px-4" onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} className="w-full max-w-[420px]">
        <div className="relative px-5 py-4">
          <span aria-hidden className="absolute inset-0" style={{ background: P3R.panel, clipPath: 'polygon(14px 0, 100% 0, calc(100% - 14px) 100%, 0 100%)', boxShadow: 'var(--p3r-shadow)' }} />
          <div className="relative flex items-center gap-3">
            <img src={seasonAsset(MOCK_SEASON.file)} alt="" className="h-14 w-14 shrink-0 object-cover" style={{ clipPath: 'polygon(6px 0, 100% 0, calc(100% - 6px) 100%, 0 100%)' }} onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }} />
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <span className="font-cond text-[24px] leading-none" style={{ color: P3R.blue }}>21</span>
                <span className="font-cond text-[12px] leading-tight" style={{ color: P3R.roseInk }}>OCT<br />WED</span>
                <SeasonStampChip collected={collected} defaultOpen />
              </div>
              <div className="mt-1 truncate text-[11px] font-bold" style={{ color: P3R.grey }}>首页 TODAY'S SHOW 日期行 · 点小签开合气泡</div>
            </div>
            <P3Tag tone={collected ? 'rose' : 'outline'}>{collected ? '已收录' : '未收录'}</P3Tag>
          </div>
        </div>
      </div>
    </div>
  );
}
