/**
 * 工作包 1 私有小件：四角星、月相图、岁时小签、按 key 打开别包弹窗、查询参数读取、波纹。
 */
import { AnimatePresence, motion } from 'framer-motion';
import { Suspense, useEffect, useState, type CSSProperties, type ReactNode } from 'react';
import { useLocation } from 'react-router-dom';
import { OVERLAYS } from '@yellow/registry/overlays';
import { lazyOf } from '@yellow/shell/lazyRegistry';
import { showToast } from '@yellow/kit';
import { useLowMotion } from '@yellow/lib/prefs';
import { cx } from '@yellow/lib/cx';
import { MOCK_SEASON } from '@yellow/adapters/pkg1';

/** 当前路由查询参数（HashRouter 下 location.search）*/
export function useQ(): URLSearchParams {
  const loc = useLocation();
  return new URLSearchParams(loc.search);
}

/** P4G 长尖四角星（Rank Up / 天气徽的闪光）*/
export const Sparkle4 = ({ size = 16, color = 'currentColor', className, style }: { size?: number; color?: string; className?: string; style?: CSSProperties }) => (
  <svg aria-hidden width={size} height={size} viewBox="0 0 24 24" className={className} style={style}>
    <path d="M12 0 C13 8 16 11 24 12 C16 13 13 16 12 24 C11 16 8 13 0 12 C8 11 11 8 12 0Z" fill={color} />
  </svg>
);

/** 月相图（真实 p4MoonLit：两段弧画出被照亮的一块）*/
export const MoonGlyph = ({ phase, size = 20, lit = 'var(--p4g-yellow)', dark = '#3a3a3a' }: { phase: number; size?: number; lit?: string; dark?: string }) => {
  const r = 16, c = 18;
  const rx = Math.max(0.01, Math.abs(Math.cos(2 * Math.PI * phase)) * r);
  const outer = phase < 0.5 ? 1 : 0;
  const term = phase > 0.25 && phase < 0.75 ? outer : 1 - outer;
  const d = `M ${c} ${c - r} A ${r} ${r} 0 0 ${outer} ${c} ${c + r} A ${rx} ${r} 0 0 ${term} ${c} ${c - r} Z`;
  return (
    <svg viewBox="0 0 36 36" width={size} height={size} aria-hidden>
      <circle cx="18" cy="18" r="16" fill={dark} />
      <path d={d} fill={lit} />
    </svg>
  );
};

/** 岁时小签 + 气泡（真实 SeasonStampBadge）：点签弹出/收起，4.5s 自动收起 */
export function SeasonStamp({ collected = false, pop = 'above', align = 'left', defaultOpen = false, className }: { collected?: boolean; pop?: 'above' | 'below'; align?: 'left' | 'right'; defaultOpen?: boolean; className?: string }) {
  const [open, setOpen] = useState(defaultOpen);
  const low = useLowMotion();
  const mark = MOCK_SEASON;
  useEffect(() => {
    if (!open || defaultOpen) return;
    const t = window.setTimeout(() => setOpen(false), 4500);
    return () => clearTimeout(t);
  }, [open, defaultOpen]);
  return (
    <span className={cx('relative inline-flex', className)}>
      <button
        type="button"
        onClick={(e) => { e.stopPropagation(); setOpen((v) => !v); }}
        aria-label={`${mark.name}：${mark.note}${collected ? '（已收进岁时册）' : ''}`}
        aria-expanded={open}
        className={cx(
          'relative inline-flex h-[22px] shrink-0 select-none items-center gap-1 whitespace-nowrap px-2 font-display text-cap font-bold leading-none transition-transform duration-instant active:scale-95',
          collected ? 'bg-p4g-black text-p4g-yellow night:bg-p4g-yellow night:text-p4g-black' : 'border-2 border-dashed border-[color:var(--p4g-on-stage)] text-[color:var(--p4g-on-stage)]',
        )}
        style={{ clipPath: collected ? 'polygon(5px 0,100% 0,calc(100% - 5px) 100%,0 100%)' : undefined }}
      >
        <span aria-hidden className="text-[9px] tracking-widest opacity-80">岁时</span>{mark.name}
      </button>
      <AnimatePresence>
        {open && (
          <motion.span
            role="status"
            className={cx('absolute z-40 w-[228px] max-w-[70vw]', pop === 'above' ? 'bottom-full mb-2' : 'top-full mt-2', align === 'right' ? 'right-0' : 'left-0')}
            initial={low ? { opacity: 0 } : { opacity: 0, y: pop === 'above' ? 8 : -8, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, transition: { duration: 0.12 } }}
            transition={{ duration: 0.18, ease: [0.2, 0.9, 0.1, 1] }}
            style={{ transformOrigin: pop === 'above' ? 'bottom left' : 'top left' }}
          >
            <span className="block rounded-sm border-3 border-p4g-black bg-[color:var(--p4g-msg)] px-3 py-2 text-left text-meta leading-relaxed text-[color:var(--p4g-msg-ink)] shadow-plate">
              <b className="font-display font-bold text-p4g-yellow">{mark.name}</b>
              <span className="mx-1 opacity-50">·</span>
              {mark.note}
              <span className="mt-1 block text-cap font-bold opacity-75">{collected ? '岁时册 · 已收录' : '今天记一条，就收进岁时册'}</span>
            </span>
          </motion.span>
        )}
      </AnimatePresence>
    </span>
  );
}

/** 打开别的工作包登记的弹窗（按 key 懒加载）；未登记时给出 Toast，不至于点了没反应 */
export function OverlayByKey({ k, open, onClose, params, fallbackLabel }: { k: string; open: boolean; onClose: () => void; params?: URLSearchParams; fallbackLabel: string }) {
  const entry = OVERLAYS[k];
  useEffect(() => {
    if (open && !entry) { showToast(`${fallbackLabel}（由其他工作包实现：#/overlay/${k}）`); onClose(); }
  }, [open, entry]); // eslint-disable-line
  if (!entry) return null;
  const C = lazyOf(`overlay:${k}`, entry.load);
  return <Suspense fallback={null}><C open={open} onClose={onClose} params={params} /></Suspense>;
}

/** 点击波纹（只动 transform/opacity）*/
export interface Ripple { id: number; x: number; y: number }
export function useRipples() {
  const [list, setList] = useState<Ripple[]>([]);
  const spawn = (x: number, y: number) => setList((l) => [...l, { id: Date.now() + Math.random(), x, y }]);
  const remove = (id: number) => setList((l) => l.filter((r) => r.id !== id));
  return { list, spawn, remove };
}
export function RippleLayer({ list, remove, size = 240, className }: { list: Ripple[]; remove: (id: number) => void; size?: number; className?: string }) {
  const low = useLowMotion();
  if (low) return null;
  return (
    <AnimatePresence>
      {list.map((rp) => (
        <motion.span
          key={rp.id}
          aria-hidden
          className={cx('pointer-events-none absolute z-30 rounded-pill border-[3px] border-p4g-orange', className)}
          style={{ left: rp.x - size / 2, top: rp.y - size / 2, width: size, height: size, background: 'radial-gradient(circle, rgba(255,214,90,.45) 0%, rgba(249,161,27,0) 70%)' }}
          initial={{ scale: 0.06, opacity: 0.95 }}
          animate={{ scale: 1, opacity: 0 }}
          transition={{ duration: 0.6, ease: 'easeOut' }}
          onAnimationComplete={() => remove(rp.id)}
        />
      ))}
    </AnimatePresence>
  );
}

/** 黑底斜切小标签 */
export const SlantTag = ({ children, tone = 'black', className }: { children: ReactNode; tone?: 'black' | 'yellow' | 'orange' | 'white'; className?: string }) => (
  <span
    className={cx('inline-flex shrink-0 items-center px-2 py-[3px] font-display text-cap font-bold leading-none',
      tone === 'black' && 'bg-p4g-black text-p4g-yellow',
      tone === 'yellow' && 'bg-p4g-yellow text-p4g-black',
      tone === 'orange' && 'bg-p4g-orange text-p4g-black',
      tone === 'white' && 'bg-p4g-white text-p4g-black',
      className)}
    style={{ clipPath: 'polygon(4px 0,100% 0,calc(100% - 4px) 100%,0 100%)' }}
  >{children}</span>
);

/** 不依赖系统 emoji 字体的小图标（🌊 ⏳ ⭐ 📌 的 SVG 版）*/
export const GlyphWave = ({ size = 22, color = '#111' }: { size?: number; color?: string }) => (
  <svg aria-hidden width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.6" strokeLinecap="round"><path d="M2 9c2.5-3 5-3 7.5 0s5 3 7.5 0 3.5-2 5-1" /><path d="M2 15c2.5-3 5-3 7.5 0s5 3 7.5 0 3.5-2 5-1" /></svg>
);
export const GlyphHourglass = ({ size = 16, color = '#111' }: { size?: number; color?: string }) => (
  <svg aria-hidden width={size} height={size} viewBox="0 0 24 24"><path d="M5 2h14v2l-5.5 8L19 20v2H5v-2l5.5-8L5 4z" fill={color} /><path d="M8 5h8l-4 5.5zM9 19.5l3-3.5 3 3.5z" fill="var(--p4g-yellow)" /></svg>
);
export const GlyphStar = ({ size = 14, color = 'var(--p4g-orange)' }: { size?: number; color?: string }) => (
  <svg aria-hidden width={size} height={size} viewBox="0 0 24 24"><path d="M12 1.5l3.2 6.9 7.3.8-5.5 5 1.6 7.3L12 17.8l-6.6 3.7L7 14.2l-5.5-5 7.3-.8z" fill={color} stroke="#111" strokeWidth="1.6" strokeLinejoin="round" /></svg>
);
export const GlyphPin = ({ size = 14, color = 'var(--p4g-orange)' }: { size?: number; color?: string }) => (
  <svg aria-hidden width={size} height={size} viewBox="0 0 24 24"><circle cx="12" cy="8" r="6" fill={color} stroke="#111" strokeWidth="1.6" /><path d="M12 14v9" stroke="#111" strokeWidth="2.4" /></svg>
);
