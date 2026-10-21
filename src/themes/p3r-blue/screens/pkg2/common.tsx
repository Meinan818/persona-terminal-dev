/**
 * 工作包 2 私有辅助（蓝白 P3R）：长按、斜切 CTA FAB（真实 p3「接入 / 许愿」SlantButton）、愿望环、相片、
 * 节标、查询参数读写、日期小工具。只在 pkg2 内使用；建议沉到 kit 的点写在 status/pkg2-requests.md。
 * 状态机改写自黄色版 screens/pkg2/common.tsx（复制，不 import）。
 */
import { motion } from 'framer-motion';
import { useCallback, useEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import { useBoldness } from '@blue/lib/prefs';
import { cx } from '@blue/lib/cx';
import { seasonAsset } from '@blue/lib/asset';
import { P3R, slantClip, tickClip } from '@blue/kit';

/** 长按（500ms + 10px 位移容差，对齐真实 ListCard useLongPress） */
export function useLongPress(onLong: () => void, ms = 500) {
  const timer = useRef<number | null>(null);
  const start = useRef<{ x: number; y: number } | null>(null);
  const fired = useRef(false);
  const [pressing, setPressing] = useState(false);
  const cb = useRef(onLong); cb.current = onLong;
  const clear = useCallback(() => { if (timer.current) window.clearTimeout(timer.current); timer.current = null; setPressing(false); }, []);
  useEffect(() => clear, [clear]);
  return {
    pressing,
    firedRef: fired,
    handlers: {
      onPointerDown: (e: React.PointerEvent) => {
        if (e.pointerType === 'mouse' && e.button !== 0) return;
        fired.current = false;
        start.current = { x: e.clientX, y: e.clientY };
        setPressing(true);
        timer.current = window.setTimeout(() => { fired.current = true; setPressing(false); timer.current = null; cb.current(); }, ms);
      },
      onPointerMove: (e: React.PointerEvent) => {
        if (!start.current || !timer.current) return;
        if (Math.abs(e.clientX - start.current.x) > 10 || Math.abs(e.clientY - start.current.y) > 10) clear();
      },
      onPointerUp: clear,
      onPointerCancel: clear,
      onPointerLeave: clear,
      onContextMenu: (e: React.MouseEvent) => e.preventDefault(),
    },
  };
}

/**
 * 右下斜切 CTA（真实 Todos p3：SlantButton tone=primary「接入 / 许愿」，fixed bottom-24 right-5，宽屏 bottom-8 right-8）。
 * 记录子页同位置同制式（「记录」/ 选中历史日后「补录」）。
 */
export function SlantFab({ label, text, onClick, tone = 'rose' }: { label: string; text: ReactNode; onClick: () => void; tone?: 'rose' | 'coral' }) {
  const anim = useBoldness();
  return (
    <div className="fixed bottom-[calc(var(--p3r-nav-h)+env(safe-area-inset-bottom)+20px)] right-5 z-nav wide:bottom-8 wide:right-8">
      <motion.button type="button" aria-label={label} title={label} onClick={onClick}
        whileTap={anim ? { scale: 0.94 } : undefined}
        initial={anim ? { x: 40, opacity: 0 } : false} animate={{ x: 0, opacity: 1 }} transition={{ type: 'spring', stiffness: 420, damping: 30 }}
        className="relative flex h-[54px] items-center px-[30px] text-[20px] font-black"
        style={{ clipPath: slantClip(13), background: tone === 'rose' ? P3R.blue : P3R.magenta, color: tone === 'rose' ? P3R.onBlue : '#fff', filter: 'drop-shadow(0 10px 18px rgb(var(--p3r-blue-rgb) / 0.32))' }}>
        <span className="relative">{text}</span>
        <span aria-hidden className={cx('absolute bottom-0 right-3 h-[7px] w-[16px]', anim && 'p3-corner-blink')} style={{ background: tone === 'rose' ? P3R.magenta : P3R.cyan, clipPath: tickClip }} />
      </motion.button>
    </div>
  );
}

/** 愿望 / 大事进度环（真实 WishRing / GoalArc 的 p3 形：蓝弧 + 青轨）——只动 strokeDashoffset 的入场一次 */
export function Ring({ pct, size = 52, stroke = 5, label, dim, color, track, ink }: { pct: number; size?: number; stroke?: number; label?: ReactNode; dim?: boolean; color?: string; track?: string; ink?: string }) {
  const anim = useBoldness();
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const p = Math.max(0, Math.min(100, pct));
  return (
    <div className="relative shrink-0" style={{ width: size, height: size }} role="img" aria-label={`进度 ${Math.round(p)}%`}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-90" aria-hidden>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={track ?? 'var(--p3r-track)'} strokeWidth={stroke} />
        <motion.circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={dim ? 'var(--p3r-grey)' : color ?? P3R.blue} strokeWidth={stroke} strokeDasharray={c}
          initial={anim ? { strokeDashoffset: c } : false} animate={{ strokeDashoffset: c * (1 - p / 100) }} transition={{ duration: 0.7, ease: [0.2, 0.8, 0.2, 1] }} />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center leading-none" style={{ color: ink ?? P3R.ink }}>
        {label ?? <span className="font-cond tabular" style={{ fontSize: size * 0.3 }}>{Math.round(p)}<span style={{ fontSize: size * 0.17 }}>%</span></span>}
      </div>
    </div>
  );
}

/** 记录配图：demo 文件名仍走蓝主题素材；真实 IndexedDB data/blob URL 原样加载。 */
export const Photo = ({ src, className, style, alt = '' }: { src: string; className?: string; style?: CSSProperties; alt?: string }) => (
  <img src={/^(data:|blob:|https?:)/.test(src) ? src : seasonAsset(src)} alt={alt} draggable={false} className={cx('h-full w-full object-cover', className)} style={style} />
);

/** 区块小节题（P3R：蓝小斜片 + 黑粗斜体 + 英文小签 + 右侧槽），比 kit SectionMark 轻（不带入场裁切，列表里用） */
export function MiniHead({ title, en, right, className }: { title: ReactNode; en?: string; right?: ReactNode; className?: string }) {
  return (
    <div className={cx('flex min-w-0 items-center gap-2', className)}>
      <span aria-hidden className="h-[15px] w-[10px] shrink-0" style={{ background: P3R.blue, clipPath: tickClip }} />
      <span className="min-w-0 truncate font-heavy text-[17px] leading-none" style={{ color: P3R.ink }}>{title}</span>
      {en && <span className="shrink-0 font-cond text-[11px] uppercase leading-none" style={{ color: P3R.grey }}>{en}</span>}
      <span aria-hidden className="h-px min-w-[10px] flex-1" style={{ background: P3R.ink, opacity: 0.25 }} />
      {right && <span className="shrink-0">{right}</span>}
    </div>
  );
}

/** 斜切小钮（页内次级操作：日历 / 筛选 / 委托 / 恢复…）：选中墨色 + 蓝小签 */
export function SlantChip({ children, on, onClick, ariaLabel, className, badge, tone = 'glass', disabled, title }: { children: ReactNode; on?: boolean; onClick?: () => void; ariaLabel?: string; className?: string; badge?: ReactNode; tone?: 'glass' | 'soft'; disabled?: boolean; title?: string }) {
  return (
    <span className={cx('relative inline-flex shrink-0', className)}>
      <button type="button" aria-label={ariaLabel} title={title} aria-pressed={on} disabled={disabled} onClick={onClick}
        className="relative flex h-10 min-w-0 items-center gap-1.5 px-4 text-[13px] font-black disabled:opacity-40"
        style={{ clipPath: slantClip(9), background: on ? P3R.ink : tone === 'glass' ? P3R.panelGlass : P3R.cyanPale, color: on ? 'var(--p3r-on-ink)' : P3R.ink }}>
        {children}
        {on && <span aria-hidden className="absolute bottom-0 right-2 h-[5px] w-[12px]" style={{ background: P3R.blue, clipPath: tickClip }} />}
      </button>
      {badge}
    </span>
  );
}

/** 角标（真实：放在斜切按钮外层，免得被 clip 裁掉） */
export const Dot = ({ n, className }: { n?: number; className?: string }) => (
  <span aria-hidden className={cx('pointer-events-none absolute -right-1.5 -top-1.5 z-10 flex h-4 min-w-4 items-center justify-center rounded-full px-1 font-cond text-[11px] leading-none', className)}
    style={{ background: P3R.magenta, color: '#fff', minWidth: n === undefined ? 10 : 16, height: n === undefined ? 10 : 16 }}>{n}</span>
);

/** 读取 ?state= / ?view= 等 */
export const qp = (params: URLSearchParams | undefined, k: string, d = '') => params?.get(k) ?? d;

/** hash 内参数写回（同页切 view / deck 时保持 URL 可分享，不触发转场） */
export function setHashParam(k: string, v: string | null) {
  const [path, q = ''] = window.location.hash.replace(/^#/, '').split('?');
  if (!path.startsWith('/p/')) return;   // 作为弹窗背景页时不改弹窗路由
  const sp = new URLSearchParams(q);
  if (v === null) sp.delete(k); else sp.set(k, v);
  const s = sp.toString();
  window.history.replaceState(window.history.state, '', `#${path}${s ? `?${s}` : ''}`);
}

export const fmtTime = (d: Date) => `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
export const WEEK_LABELS = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
export const daysBetween = (a: string, b: string) => Math.round((new Date(`${b}T12:00:00`).getTime() - new Date(`${a}T12:00:00`).getTime()) / 86400000);
export const sumPts = (p: Record<string, number>) => Object.values(p).reduce((a, b) => a + b, 0);

/** 倒计时卡纹理（斜纹 / 网格 / 点阵 / 纯色）→ CSS 背景，统一走粉变量 */
export const toneBg = (t: string, ink = 'rgb(var(--p3r-blue-rgb) / 0.16)'): string => {
  switch (t) {
    case 'lines': return `repeating-linear-gradient(-45deg, ${ink} 0 6px, transparent 6px 14px)`;
    case 'grid': return `linear-gradient(${ink} 2px, transparent 2px) 0 0/14px 14px, linear-gradient(90deg, ${ink} 2px, transparent 2px) 0 0/14px 14px`;
    case 'dots': return `radial-gradient(${ink} 2px, transparent 2.5px) 0 0/10px 10px`;
    default: return 'none';
  }
};

/** 面板外壳：斜切玻璃面（真实 p3 列表区多为 panel-glass 斜切卡） */
export const GlassSlab = ({ children, className, cut = 14, style, tone = 'glass' }: { children: ReactNode; className?: string; cut?: number; style?: CSSProperties; tone?: 'glass' | 'panel' | 'blush' }) => (
  <div className={cx('relative min-w-0', className)} style={{ clipPath: slantClip(cut), background: tone === 'glass' ? P3R.panelGlass : tone === 'panel' ? P3R.panel : P3R.cyanPale, ...style }}>{children}</div>
);

/** 单色蝴蝶（替代彩色 🦋——Noto 彩色蝴蝶是蓝的，蓝主题禁蓝） */
export const Butterfly = ({ size = 16, className }: { size?: number; className?: string }) => (
  <svg viewBox="0 0 24 24" width={size} height={size} className={className} aria-hidden fill="currentColor">
    <path d="M11.2 11.5C9.4 6.8 5.9 3.6 3.3 4.3 1.2 4.9 1.8 8.6 4.4 10.6c-2.4.9-2.9 3.9-.9 5.4 2.2 1.7 5.6-.2 7.2-3.4zM12.8 11.5c1.8-4.7 5.3-7.9 7.9-7.2 2.1.6 1.5 4.3-1.1 6.3 2.4.9 2.9 3.9.9 5.4-2.2 1.7-5.6-.2-7.2-3.4z" />
    <rect x="11.3" y="7" width="1.4" height="12" rx=".7" />
  </svg>
);
