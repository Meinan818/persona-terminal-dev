/**
 * 工作包 2 私有辅助组件：长按、P4G 四角星 FAB、进度环、S.Link 式小标、区块头、State 读取。
 * 只在 pkg2 内使用；建议后续沉到 kit 的点见 HANDOFF/回报。
 */
import { motion } from 'framer-motion';
import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { useLowMotion } from '@yellow/lib/prefs';
import { cx } from '@yellow/lib/cx';
import { P4Outline } from '@yellow/kit';

/** 长按（500ms + 10px 位移容差，对齐真实 ListCard useLongPress） */
export function useLongPress(onLong: () => void, ms = 500) {
  const timer = useRef<number | null>(null);
  const start = useRef<{ x: number; y: number } | null>(null);
  const fired = useRef(false);
  const [pressing, setPressing] = useState(false);
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
        timer.current = window.setTimeout(() => { fired.current = true; setPressing(false); onLong(); }, ms);
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

/** 四角星路径（P4 频道 FAB 本体 = 星形，P4G 菜单闪光同款） */
const STAR4 = 'M50 2 C56 34 66 44 98 50 C66 56 56 66 50 98 C44 66 34 56 2 50 C34 44 44 34 50 2Z';

/** 右下浮动按钮：P4 蓝色四角星（真实 p4-redraw），黑描边 + 硬投影；竖屏避开底导，宽屏贴右下 */
export function StarFab({ label, glyph, onClick, tone = 'cyan', caption }: { label: string; glyph: ReactNode; onClick: () => void; tone?: 'cyan' | 'orange'; caption?: string }) {
  const low = useLowMotion();
  return (
    <motion.button
      type="button"
      aria-label={label}
      title={label}
      onClick={onClick}
      whileTap={low ? undefined : { scale: 0.9 }}
      whileHover={low ? undefined : { scale: 1.06, rotate: 8 }}
      className="fixed right-4 z-40 flex h-[72px] w-[72px] items-center justify-center bottom-[calc(var(--p4g-nav-h)+env(safe-area-inset-bottom)+22px)] wide:bottom-8 wide:right-8"
    >
      <svg viewBox="0 0 100 100" className="absolute inset-0 h-full w-full overflow-visible" aria-hidden>
        <path d={STAR4} transform="translate(5 5)" fill="var(--p4g-shadow-color)" />
        <path d={STAR4} fill={tone === 'cyan' ? 'var(--p4g-cyan)' : 'var(--p4g-orange)'} stroke="var(--p4g-black)" strokeWidth="5" strokeLinejoin="round" />
        <path d="M50 14 C53 36 58 42 70 46" fill="none" stroke="#fff" strokeWidth="4" strokeLinecap="round" opacity=".85" />
      </svg>
      <span className="relative font-display text-[22px] font-black leading-none text-p4g-black">{glyph}</span>
      {caption && <span className="absolute -bottom-3 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-xs bg-p4g-black px-1.5 font-display text-2xs font-bold text-p4g-yellow">{caption}</span>}
    </motion.button>
  );
}

/** 进度环（愿望 / 大事 GoalArc）：黄底黑描边 + 橙色弧 */
export function Ring({ pct, size = 52, stroke = 7, label, sub, dim }: { pct: number; size?: number; stroke?: number; label?: ReactNode; sub?: ReactNode; dim?: boolean }) {
  const low = useLowMotion();
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const p = Math.max(0, Math.min(100, pct));
  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-90" aria-hidden>
        <circle cx={size / 2} cy={size / 2} r={r} fill="var(--p4g-surface-2)" stroke="var(--p4g-line)" strokeWidth={stroke + 3} />
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--p4g-surface-2)" strokeWidth={stroke} />
        <motion.circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={dim ? 'var(--p4g-muted)' : 'var(--p4g-orange)'} strokeWidth={stroke} strokeDasharray={c}
          initial={low ? false : { strokeDashoffset: c }} animate={{ strokeDashoffset: c * (1 - p / 100) }} transition={{ duration: 0.6, ease: [0.2, 0.9, 0.1, 1] }} />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center leading-none text-p4g-ink">
        {label ?? <span className="p4g-num" style={{ fontSize: size * 0.28 }}>{Math.round(p)}<span style={{ fontSize: size * 0.16 }}>%</span></span>}
        {sub}
      </div>
    </div>
  );
}

/** S.Link 式橙色小签（Chariot 那种） */
export function Tag({ children, tone = 'orange', className }: { children: ReactNode; tone?: 'orange' | 'black' | 'yellow' | 'green' | 'cyan' | 'muted' | 'red'; className?: string }) {
  const map = {
    orange: 'bg-p4g-tag text-[color:var(--p4g-tag-ink)]',
    black: 'bg-p4g-black text-p4g-yellow night:outline night:outline-1 night:outline-p4g-yellow',
    yellow: 'bg-p4g-yellow text-p4g-black border-thin border-p4g-black',
    green: 'bg-p4g-green text-p4g-black',
    cyan: 'bg-p4g-cyan text-p4g-black',
    muted: 'bg-p4g-ink/10 text-p4g-ink-soft',
    red: 'bg-p4g-danger text-[color:var(--p4g-danger-ink)]',
  } as const;
  return <span className={cx('inline-flex max-w-full shrink-0 items-center gap-0.5 rounded-xs px-1.5 py-[1px] font-display text-2xs font-bold leading-4', map[tone], className)}>{children}</span>;
}

/** 斜切黑签小标题（区块头左侧）+ 右侧计数/操作 */
export function BlockHead({ title, en, meta, action, onTitleClick, titleAria }: { title: ReactNode; en?: string; meta?: ReactNode; action?: ReactNode; onTitleClick?: () => void; titleAria?: string }) {
  const T = onTitleClick ? 'button' : 'div';
  return (
    <div className="flex min-w-0 items-end gap-2 pb-2">
      <T type={onTitleClick ? 'button' : undefined} onClick={onTitleClick} aria-label={titleAria}
        className="relative min-w-0 shrink bg-p4g-black py-1 pl-3 pr-5 text-left text-p4g-yellow night:bg-p4g-yellow night:text-p4g-black" style={{ clipPath: 'polygon(0 0,100% 0,calc(100% - 12px) 100%,0 100%)' }}>
        <span className="flex min-w-0 items-center gap-1.5 truncate font-display text-lead font-bold">{title}</span>
      </T>
      {en && <span className="hidden min-w-0 truncate pb-1 font-display text-cap font-bold italic tracking-[0.2em] text-[color:var(--p4g-on-stage)] opacity-80 min-[380px]:inline">{en}</span>}
      {meta && <span className="shrink-0 pb-0.5">{meta}</span>}
      <span className="mb-1.5 h-[3px] min-w-[12px] flex-1 bg-[color:var(--p4g-on-stage)] opacity-70" />
      {action && <span className="shrink-0">{action}</span>}
    </div>
  );
}

/** 计数胶囊（P4CountPill） */
export const CountPill = ({ children }: { children: ReactNode }) => (
  <span className="inline-flex items-center rounded-pill border-thin border-p4g-black bg-p4g-yellow px-2 font-display text-cap font-bold text-p4g-black">{children}</span>
);

/** 大号 Cut-in 用描边标题 */
export const BigTitle = ({ children, size = 'clamp(30px,9vw,52px)' }: { children: ReactNode; size?: string }) => (
  <P4Outline size={size} stroke={6} italic>{children}</P4Outline>
);

/** 读取 ?state= / ?view= 等 */
export const qp = (params: URLSearchParams | undefined, k: string, d = '') => params?.get(k) ?? d;

/** 简单的「hash 内参数」写回（同页切换 view / deck 时保持 URL 可分享，不触发转场） */
export function setHashParam(k: string, v: string | null) {
  const [path, q = ''] = window.location.hash.replace(/^#/, '').split('?');
  const sp = new URLSearchParams(q);
  if (v === null) sp.delete(k); else sp.set(k, v);
  const s = sp.toString();
  window.history.replaceState(null, '', `#${path}${s ? `?${s}` : ''}`);
}

export const fmtTime = (d: Date) => `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
export const WEEK_LABELS = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
export const daysBetween = (a: string, b: string) => Math.round((new Date(`${b}T12:00:00`).getTime() - new Date(`${a}T12:00:00`).getTime()) / 86400000);
