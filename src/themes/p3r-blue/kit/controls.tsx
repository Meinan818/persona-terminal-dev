/**
 * P3R 蓝白 kit · 控件 —— P3Button（SlantButton）· P3SlantTabs · P3LRTabs（LB/RB 切页）· P3Segment
 *   CONFIG 行：P3ConfigRow · P3ValueCycler（‹ 值 ›）· P3OnOff（ON·OFF）· P3Gauge（刻度条）· P3ConfigDesc（描述框）
 *   表单：P3Field · P3Input · P3Textarea · P3Select · P3Stepper · P3Check
 *   菜单：P3MenuList（暂停菜单级联 + 光标楔，↑↓ Enter）
 */
import React, { useId, useState, type CSSProperties, type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes, type TextareaHTMLAttributes, forwardRef } from 'react';
import { motion } from 'framer-motion';
import { useBoldness } from '@blue/lib/prefs';
import { cx } from '@blue/lib/cx';
import { P3R, SelectWedge, slantClip, tickClip } from './base';

/* ───────────────────────── Button ───────────────────────── */
export type P3ButtonTone = 'primary' | 'soft' | 'ghost' | 'danger' | 'ink' | 'warning' | 'outline';
export interface P3ButtonProps {
  children?: ReactNode;
  tone?: P3ButtonTone;
  size?: 'sm' | 'md' | 'lg';
  block?: boolean;
  busy?: boolean;
  busyText?: ReactNode;
  disabled?: boolean;
  leading?: ReactNode;
  trailing?: ReactNode;
  /** 右下臂章红小角（真实 SlantButton magentaCorner：主按钮签名件） */
  corner?: boolean;
  onClick?: (e: React.MouseEvent<HTMLButtonElement>) => void;
  className?: string;
  style?: CSSProperties;
  ariaLabel?: string;
  type?: 'button' | 'submit';
}
const BTN_SKIN: Record<P3ButtonTone, CSSProperties> = {
  primary: { background: P3R.blue, color: P3R.onBlue },
  soft: { background: P3R.cyanPale, color: P3R.ink },
  ghost: { background: P3R.cyanFaint, color: P3R.ink },
  danger: { background: P3R.magenta, color: '#fff' },
  ink: { background: P3R.ink, color: 'var(--p3r-on-ink)' },
  warning: { background: P3R.amber, color: 'var(--p3r-mulberry)' },
  outline: { background: P3R.blue, color: P3R.roseInk },
};
const BTN_SIZE = { sm: 'h-8 px-4 text-[13px]', md: 'h-11 px-6 text-[15px]', lg: 'h-14 px-8 text-[17px]' };

/** 斜切按钮（真实 SlantButton 1:1：按下白色硬边斜光扫过；键盘激活在 click 补触发） */
export const P3Button = ({ children, tone = 'primary', size = 'md', block, busy, busyText, disabled, leading, trailing, corner, onClick, className, style, ariaLabel, type = 'button' }: P3ButtonProps) => {
  const anim = useBoldness();
  const [sweep, setSweep] = useState<number | null>(null);
  const off = disabled || busy;
  const cut = size === 'sm' ? 7 : size === 'lg' ? 13 : 10;
  return (
    <button type={type} aria-label={ariaLabel} aria-busy={busy || undefined} disabled={off}
      onPointerDown={() => { if (anim && !off) setSweep(Date.now()); }}
      onClick={(e) => { if (anim && !off && e.detail === 0) setSweep(Date.now()); onClick?.(e); }}
      className={cx('relative inline-flex min-w-0 select-none items-center justify-center gap-2 overflow-hidden font-black tracking-wide active:brightness-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:cursor-not-allowed', off && !busy && (tone === 'danger' ? 'opacity-50 grayscale' : 'opacity-40') /* 红半透叠深底会混成玫红 */, BTN_SIZE[size], block && 'w-full', className)}
      style={{ clipPath: slantClip(cut), ['--tw-ring-color' as string]: 'var(--bk-focus)', ...BTN_SKIN[tone], ...style }}>
      {/* outline：clip-path 会裁掉 inset 描边 → 外层蓝斜片 + 内层面板斜片 = 等宽斜描边 */}
      {tone === 'outline' && <span aria-hidden className="absolute inset-[2px]" style={{ background: P3R.panel, clipPath: slantClip(cut - 1) }} />}
      {busy ? <span aria-hidden className="bk-spin h-4 w-4 shrink-0 rounded-full border-2 border-current border-t-transparent" /> : leading && <span className="relative flex">{leading}</span>}
      <span className="relative min-w-0 truncate">{busy && busyText ? busyText : children}</span>
      {!busy && trailing && <span className="relative flex">{trailing}</span>}
      {sweep !== null && (
        <motion.span key={sweep} aria-hidden className="pointer-events-none absolute inset-y-0 left-0 w-[30%]"
          style={{ background: 'rgba(255,255,255,0.5)', borderLeft: '2px solid rgba(255,255,255,0.95)', skewX: -18 }}
          initial={{ x: '-140%' }} animate={{ x: '480%' }} transition={{ duration: 0.34, ease: 'easeOut' }} onAnimationComplete={() => setSweep(null)} />
      )}
      {corner && <span aria-hidden className={cx('absolute bottom-0 right-3 h-[7px] w-[18px]', anim && 'p3-corner-blink')} style={{ background: P3R.magenta, clipPath: tickClip }} />}
    </button>
  );
};

/** 圆角图标钮（关闭 ✕ / 更多 …）：斜切小方块 */
export const P3IconButton = ({ children, onClick, label, tone = 'ghost', className, size = 40 }: { children: ReactNode; onClick?: () => void; label: string; tone?: 'ghost' | 'ink' | 'rose'; className?: string; size?: number }) => (
  <button type="button" aria-label={label} onClick={onClick}
    className={cx('inline-flex shrink-0 items-center justify-center active:scale-95 focus-visible:outline-none', className)}
    style={{ width: size, height: size, clipPath: slantClip(6), background: tone === 'ink' ? P3R.ink : tone === 'rose' ? P3R.blue : P3R.cyanFaint, color: tone === 'ghost' ? P3R.ink : 'var(--p3r-on-blue)' }}>
    {children}
  </button>
);

/* ───────────────────────── Tabs ───────────────────────── */
export interface TabItem { id: string; label: ReactNode; en?: string; badge?: number | string }

/** 斜切页签（筛选 / 视图切换）：选中 = 墨色斜块 + 蓝小签，超宽横滑 */
export const P3SlantTabs = ({ items, value, onChange, className, size = 'md' }: { items: TabItem[]; value: string; onChange: (id: string) => void; className?: string; size?: 'sm' | 'md' }) => {
  const gid = useId();
  return (
    <div role="tablist" className={cx('no-scrollbar flex min-w-0 gap-1.5 overflow-x-auto pb-1.5', className)}>
      {items.map((it) => {
        const on = it.id === value;
        return (
          <button key={it.id} type="button" role="tab" aria-selected={on} onClick={() => onChange(it.id)}
            className={cx('relative shrink-0 whitespace-nowrap font-black leading-none focus-visible:outline-none', size === 'sm' ? 'px-3 py-1.5 text-[12px]' : 'px-4 py-2 text-[14px]')}
            style={{ color: on ? 'var(--p3r-on-ink)' : P3R.inkSoft }}>
            <span aria-hidden className="absolute inset-0" style={{ background: on ? 'transparent' : P3R.cyanFaint, clipPath: slantClip(7) }} />
            {on && <motion.span layoutId={`st-${gid}`} aria-hidden className="absolute inset-0" style={{ background: P3R.ink, clipPath: slantClip(7) }} transition={{ type: 'spring', stiffness: 520, damping: 34 }} />}
            {on && <span aria-hidden className="absolute -bottom-1 right-1 h-[5px] w-[14px]" style={{ background: P3R.blue, clipPath: slantClip(3) }} />}
            <span className="relative">{it.label}</span>
            {it.badge !== undefined && it.badge !== 0 && <span className="relative ml-1 inline-flex min-w-[16px] items-center justify-center px-1 font-cond text-[11px]" style={{ background: P3R.magenta, color: '#fff', clipPath: slantClip(3) }}>{it.badge}</span>}
          </button>
        );
      })}
    </div>
  );
};

/** 分段切换（两到四项等宽）：选中项蓝斜块 */
export const P3Segment = ({ items, value, onChange, className }: { items: TabItem[]; value: string; onChange: (id: string) => void; className?: string }) => {
  const gid = useId();
  return (
    <div role="tablist" className={cx('grid min-w-0 gap-1 p-1', className)} style={{ gridTemplateColumns: `repeat(${items.length}, minmax(0, 1fr))`, background: P3R.cyanFaint, clipPath: slantClip(9) }}>
      {items.map((it) => {
        const on = it.id === value;
        return (
          <button key={it.id} type="button" role="tab" aria-selected={on} onClick={() => onChange(it.id)} className="relative min-w-0 py-2 text-[13px] font-black focus-visible:outline-none" style={{ color: on ? P3R.onBlue : P3R.inkSoft }}>
            {on && <motion.span layoutId={`sg-${gid}`} aria-hidden className="absolute inset-0" style={{ background: P3R.blue, clipPath: slantClip(7) }} transition={{ type: 'spring', stiffness: 520, damping: 34 }} />}
            <span className="relative block truncate px-1">{it.label}</span>
          </button>
        );
      })}
    </div>
  );
};

/**
 * LB / RB 切页（P3R「‹L 页名 ●○○ R›」）：粗斜体页名 + 圆点进度 + 两端斜体键位。
 * ≤4 项平铺；>4 项（设置分类）只显示当前页名，圆点可点（避免窄屏挤成竖排）。键盘 ←/→（Q/E）也能切。
 */
export const P3LRTabs = ({ items, value, onChange, className }: { items: TabItem[]; value: string; onChange: (id: string) => void; className?: string }) => {
  const gid = useId();
  const idx = Math.max(0, items.findIndex((i) => i.id === value));
  const step = (d: number) => onChange(items[(idx + d + items.length) % items.length].id);
  const compact = items.length > 4;
  const shown = compact ? [items[idx]] : items;
  return (
    <div className={cx('relative flex min-w-0 items-center gap-2 pb-3', className)} role="tablist"
      onKeyDown={(e) => { if (e.key === 'ArrowLeft' || e.key === 'q') step(-1); if (e.key === 'ArrowRight' || e.key === 'e') step(1); }}>
      <button type="button" aria-label="上一页" onClick={() => step(-1)} className="flex h-9 shrink-0 items-center font-cond text-[22px] leading-none" style={{ color: P3R.ink }}>‹L</button>
      <div className="flex min-w-0 flex-1 items-center justify-center gap-1">
        {shown.map((it) => {
          const on = it.id === items[idx].id;
          return (
            <button key={it.id} type="button" role="tab" aria-selected={on} onClick={() => onChange(it.id)}
              className="relative min-w-0 whitespace-nowrap px-3 py-1.5 text-[15px] font-black leading-none focus-visible:outline-none" style={{ color: on ? 'var(--p3r-on-ink)' : P3R.inkSoft }}>
              {on && <motion.span layoutId={`lr-${gid}`} aria-hidden className="absolute inset-0" style={{ background: P3R.ink, clipPath: slantClip(8) }} transition={{ type: 'spring', stiffness: 520, damping: 34 }} />}
              {on && <span aria-hidden className="absolute -bottom-1 right-1 h-[5px] w-[14px]" style={{ background: P3R.blue, clipPath: slantClip(3) }} />}
              <span className="relative block truncate">{it.label}</span>
              {it.badge !== undefined && it.badge !== 0 && <span className="absolute -right-1 -top-1 h-2 w-2 rounded-full" style={{ background: P3R.magenta }} />}
            </button>
          );
        })}
      </div>
      <button type="button" aria-label="下一页" onClick={() => step(1)} className="flex h-9 shrink-0 items-center font-cond text-[22px] leading-none" style={{ color: P3R.ink }}>R›</button>
      <div className="absolute bottom-0 left-8 right-8 flex items-center justify-center gap-1.5">
        {items.map((it, i) => <button key={it.id} type="button" aria-label={typeof it.label === 'string' ? it.label : it.id} onClick={() => onChange(it.id)} className="h-[6px] w-[6px] rounded-full" style={{ background: i === idx ? P3R.blue : 'var(--p3r-track)' }} />)}
      </div>
    </div>
  );
};

/* ───────────────────────── CONFIG 行 ───────────────────────── */
/** CONFIG 行容器：左标签（可带说明）+ 右控件；selected 时墨色斜行 + 光标楔（P3R CONFIG 当前行） */
export const P3ConfigRow = ({ label, hint, children, selected, onFocus, className, danger }: { label: ReactNode; hint?: ReactNode; children?: ReactNode; selected?: boolean; onFocus?: () => void; className?: string; danger?: boolean }) => (
  <div onPointerEnter={onFocus} onFocus={onFocus} className={cx('relative flex min-h-[52px] min-w-0 items-center gap-3 px-4 py-2', className)}>
    <span aria-hidden className="absolute inset-0" style={{ background: selected ? P3R.ink : 'var(--p3r-row)', clipPath: slantClip(10) }} />
    {selected && <SelectWedge className="-left-2 top-1/2 h-[30px] w-[26px] -translate-y-1/2" />}
    <div className={cx('relative min-w-0 flex-1', selected && 'pl-5')}>
      <div className="truncate text-[15px] font-black" style={{ color: danger ? P3R.magenta : selected ? 'var(--p3r-on-ink)' : P3R.ink }}>{label}</div>
      {hint && <div className="p3r-clamp-2 text-[12px] leading-snug" style={{ color: selected ? 'color-mix(in srgb, var(--p3r-on-ink) 70%, transparent)' : P3R.grey }}>{hint}</div>}
    </div>
    {children && <div className="relative flex shrink-0 items-center" style={{ color: selected ? 'var(--p3r-on-ink)' : P3R.ink }}>{children}</div>}
  </div>
);

/** ‹ 值 ›：左右箭头轮换（P3R CONFIG「‹ Normal ›」） */
export function P3ValueCycler<T extends string>({ options, value, onChange, width = 112, className }: { options: { value: T; label: ReactNode }[]; value: T; onChange: (v: T) => void; width?: number; className?: string }) {
  const i = Math.max(0, options.findIndex((o) => o.value === value));
  const go = (d: number) => onChange(options[(i + d + options.length) % options.length].value);
  return (
    <div className={cx('flex items-center gap-1', className)}>
      <button type="button" aria-label="上一个" onClick={() => go(-1)} className="flex h-8 w-6 items-center justify-center font-cond text-[20px]" style={{ color: P3R.blue }}>‹</button>
      <motion.span key={String(value)} initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} className="truncate text-center text-[14px] font-black" style={{ width }}>{options[i]?.label}</motion.span>
      <button type="button" aria-label="下一个" onClick={() => go(1)} className="flex h-8 w-6 items-center justify-center font-cond text-[20px]" style={{ color: P3R.blue }}>›</button>
    </div>
  );
}

/** ON · OFF（P3R 开关）：两段斜字，当前段蓝斜块 */
export const P3OnOff = ({ value, onChange, disabled, labels = ['ON', 'OFF'], ariaLabel }: { value: boolean; onChange: (v: boolean) => void; disabled?: boolean; labels?: [string, string]; ariaLabel?: string }) => (
  <button type="button" role="switch" aria-checked={value} aria-label={ariaLabel} disabled={disabled} onClick={() => onChange(!value)} className={cx('relative flex h-8 items-center font-cond text-[15px]', disabled && 'opacity-40')}>
    {[true, false].map((v, k) => {
      const on = value === v;
      return (
        <span key={k} className="relative flex h-8 w-12 items-center justify-center" style={{ color: on ? P3R.onBlue : P3R.grey }}>
          {on && <motion.span layoutId={undefined} aria-hidden className="absolute inset-0" style={{ background: v ? P3R.blue : P3R.inkSoft, clipPath: slantClip(7) }} initial={{ scaleX: 0.6, opacity: 0 }} animate={{ scaleX: 1, opacity: 1 }} />}
          <span className="relative">{labels[k]}</span>
        </span>
      );
    })}
  </button>
);

/** 刻度条（P3R 音量 / 速度）：可拖动 / 点选，steps 格 */
export const P3Gauge = ({ value, onChange, steps = 10, min = 0, max = 10, ariaLabel, showValue = true, width = 150 }: { value: number; onChange: (v: number) => void; steps?: number; min?: number; max?: number; ariaLabel?: string; showValue?: boolean; width?: number }) => {
  const ratio = (value - min) / (max - min);
  const lit = Math.round(ratio * steps);
  const set = (clientX: number, el: HTMLElement) => {
    const r = el.getBoundingClientRect();
    const k = Math.max(0, Math.min(1, (clientX - r.left) / r.width));
    onChange(Math.round((min + k * (max - min)) * 100) / 100);
  };
  return (
    <div className="flex items-center gap-2">
      <div role="slider" tabIndex={0} aria-label={ariaLabel} aria-valuemin={min} aria-valuemax={max} aria-valuenow={value}
        className="flex h-8 cursor-pointer touch-none items-end gap-[3px]" style={{ width }}
        onPointerDown={(e) => { (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId); set(e.clientX, e.currentTarget); }}
        onPointerMove={(e) => { if (e.buttons) set(e.clientX, e.currentTarget); }}
        onKeyDown={(e) => { const st = (max - min) / steps; if (e.key === 'ArrowRight') onChange(Math.min(max, value + st)); if (e.key === 'ArrowLeft') onChange(Math.max(min, value - st)); }}>
        {Array.from({ length: steps }).map((_, i) => (
          <span key={i} className="min-w-0 flex-1 transition-colors duration-fast" style={{ height: `${40 + (i / steps) * 60}%`, background: i < lit ? P3R.blue : 'var(--p3r-track)', clipPath: slantClip(2) }} />
        ))}
      </div>
      {showValue && <span className="w-9 text-right font-cond text-[16px] tabular" style={{ color: P3R.blue }}>{Math.round(value * 10) / 10}</span>}
    </div>
  );
};

/** CONFIG 下方描述框（P3R：当前项的说明，细横线 + 小字） */
export const P3ConfigDesc = ({ children, title = 'DESCRIPTION', className }: { children: ReactNode; title?: string; className?: string }) => (
  <div className={cx('relative min-w-0 px-4 py-3', className)} style={{ background: 'var(--p3r-panel-glass)', clipPath: slantClip(12) }}>
    <div className="flex items-center gap-2"><span className="font-cond-up text-[10px]" style={{ color: P3R.grey }}>{title}</span><span className="h-px flex-1" style={{ background: P3R.ink, opacity: 0.4 }} /></div>
    <div className="mt-1 text-[13px] leading-relaxed" style={{ color: P3R.ink }}>{children}</div>
  </div>
);

/* ───────────────────────── 表单 ───────────────────────── */
export const P3Field = ({ label, hint, error, children, count, className, required }: { label?: ReactNode; hint?: ReactNode; error?: ReactNode; children: ReactNode; count?: string; className?: string; required?: boolean }) => (
  <label className={cx('block min-w-0', className)}>
    {label && (
      <span className="mb-1.5 flex items-center gap-2">
        <span aria-hidden className="h-[10px] w-[7px] shrink-0" style={{ background: P3R.blue, clipPath: tickClip }} />
        <span className="text-[13px] font-black" style={{ color: P3R.ink }}>{label}{required && <span style={{ color: P3R.magenta }}> *</span>}</span>
        {count && <span className="ml-auto font-cond text-[12px]" style={{ color: P3R.grey }}>{count}</span>}
      </span>
    )}
    {children}
    {error ? <span className="mt-1 block text-[12px] font-bold" style={{ color: 'var(--p3r-coral-ink)' }}>{error}</span>
      : hint ? <span className="mt-1 block text-[12px]" style={{ color: P3R.grey }}>{hint}</span> : null}
  </label>
);

const fieldCls = 'w-full min-w-0 border-0 border-b-2 bg-[color:var(--p3r-field)] px-3 py-2.5 text-[15px] font-bold outline-none transition-colors focus:bg-[color:var(--p3r-field-focus)]';
const fieldStyle = (invalid?: boolean): CSSProperties => ({ color: P3R.ink, borderColor: invalid ? 'var(--p3r-magenta)' : 'var(--p3r-cyan)', clipPath: slantClip(6) });

export const P3Input = forwardRef<HTMLInputElement, Omit<InputHTMLAttributes<HTMLInputElement>, 'prefix'> & { invalid?: boolean; lead?: ReactNode }>(
  ({ invalid, lead, className, style, ...r }, ref) => lead ? (
    <span className="relative flex min-w-0 items-center">
      <span className="pointer-events-none absolute left-3 flex items-center" style={{ color: P3R.grey }}>{lead}</span>
      <input ref={ref} {...r} className={cx(fieldCls, 'pl-9', className)} style={{ ...fieldStyle(invalid), ...style }} />
    </span>
  ) : <input ref={ref} {...r} className={cx(fieldCls, className)} style={{ ...fieldStyle(invalid), ...style }} />,
);
P3Input.displayName = 'P3Input';

export const P3Textarea = forwardRef<HTMLTextAreaElement, TextareaHTMLAttributes<HTMLTextAreaElement> & { invalid?: boolean }>(
  ({ invalid, className, style, rows = 3, ...r }, ref) => <textarea ref={ref} rows={rows} {...r} className={cx(fieldCls, 'resize-none leading-relaxed', className)} style={{ ...fieldStyle(invalid), clipPath: 'none', ...style }} />,
);
P3Textarea.displayName = 'P3Textarea';

export const P3Select = ({ children, className, style, ...r }: SelectHTMLAttributes<HTMLSelectElement>) => (
  <span className="relative block min-w-0">
    <select {...r} className={cx(fieldCls, 'appearance-none pr-9', className)} style={{ ...fieldStyle(), ...style }}>{children}</select>
    <span aria-hidden className="pointer-events-none absolute right-3 top-1/2 h-0 w-0 -translate-y-1/2 border-x-[6px] border-t-[8px] border-x-transparent" style={{ borderTopColor: P3R.blue }} />
  </span>
);

export const P3Stepper = ({ value, onChange, min = 0, max = 99, step = 1, unit }: { value: number; onChange: (v: number) => void; min?: number; max?: number; step?: number; unit?: string }) => (
  <div className="inline-flex items-center gap-1">
    <button type="button" aria-label="减少" disabled={value <= min} onClick={() => onChange(Math.max(min, value - step))} className="flex h-8 w-8 items-center justify-center text-[18px] font-black disabled:opacity-30" style={{ background: P3R.cyanPale, color: P3R.ink, clipPath: slantClip(5) }}>−</button>
    <span className="min-w-[44px] text-center font-cond text-[20px] tabular" style={{ color: P3R.blue }}>{value}{unit && <span className="ml-0.5 font-body text-[11px] not-italic" style={{ color: P3R.grey }}>{unit}</span>}</span>
    <button type="button" aria-label="增加" disabled={value >= max} onClick={() => onChange(Math.min(max, value + step))} className="flex h-8 w-8 items-center justify-center text-[18px] font-black disabled:opacity-30" style={{ background: P3R.blue, color: P3R.onBlue, clipPath: slantClip(5) }}>+</button>
  </div>
);

/** 勾选：斜方块，选中蓝 + 白勾（P3R 任务行勾选同形） */
export const P3Check = ({ checked, onChange, label, disabled }: { checked: boolean; onChange: (v: boolean) => void; label?: ReactNode; disabled?: boolean }) => (
  <button type="button" role="checkbox" aria-checked={checked} disabled={disabled} onClick={() => onChange(!checked)} className={cx('inline-flex min-w-0 items-center gap-2 text-left', disabled && 'opacity-40')}>
    <span className="relative flex h-[22px] w-[24px] shrink-0 items-center justify-center" style={{ background: checked ? P3R.blue : 'transparent', boxShadow: checked ? undefined : 'inset 0 0 0 2px rgb(var(--p3r-cyan-rgb) / 0.7)', clipPath: slantClip(5) }}>
      {checked && <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="var(--p3r-on-blue)" strokeWidth={3.4}><path d="M4 12.5l5 5L20 6.5" /></svg>}
    </span>
    {label && <span className="min-w-0 text-[14px] font-bold" style={{ color: P3R.ink }}>{label}</span>}
  </button>
);

/* ───────────────────────── 暂停菜单级联 ───────────────────────── */
export interface MenuItem { id: string; label: ReactNode; en?: string; desc?: ReactNode; disabled?: boolean; danger?: boolean; badge?: ReactNode }
/**
 * P3R 暂停菜单（级联斜排大字 + 光标楔 + 右侧英文小签），↑↓ / Enter 键盘可用。
 *   <P3MenuList items={…} value={cur} onChange={setCur} onSelect={(id) => …} />
 */
export const P3MenuList = ({ items, value, onChange, onSelect, cascade = 10, size = 'lg', className }: { items: MenuItem[]; value?: string; onChange?: (id: string) => void; onSelect?: (id: string) => void; cascade?: number; size?: 'md' | 'lg'; className?: string }) => {
  const anim = useBoldness();
  const [inner, setInner] = useState(items[0]?.id);
  const cur = value ?? inner;
  const setCur = (id: string) => { setInner(id); onChange?.(id); };
  const idx = items.findIndex((i) => i.id === cur);
  return (
    <ul role="menu" tabIndex={0} className={cx('flex min-w-0 flex-col gap-1 outline-none', className)}
      onKeyDown={(e) => {
        if (e.key === 'ArrowDown') { e.preventDefault(); setCur(items[(idx + 1) % items.length].id); }
        if (e.key === 'ArrowUp') { e.preventDefault(); setCur(items[(idx - 1 + items.length) % items.length].id); }
        if (e.key === 'Enter' && cur) onSelect?.(cur);
      }}>
      {items.map((it, i) => {
        const on = it.id === cur;
        return (
          <motion.li key={it.id} role="menuitem" aria-disabled={it.disabled} style={{ marginLeft: i * cascade }}
            initial={anim ? { opacity: 0, x: -24 } : false} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.03 * i, type: 'spring', stiffness: 420, damping: 30 }}>
            <button type="button" disabled={it.disabled} onPointerEnter={() => setCur(it.id)} onFocus={() => setCur(it.id)} onClick={() => onSelect?.(it.id)}
              className={cx('relative flex w-full min-w-0 items-center gap-3 py-2 pl-4 pr-6 text-left focus-visible:outline-none disabled:opacity-35', size === 'lg' ? 'min-h-[52px]' : 'min-h-[42px]')}>
              {on && <SelectWedge className="-left-2 -right-1 inset-y-0" />}
              <span className={cx('relative min-w-0 truncate font-heavy leading-none', size === 'lg' ? 'text-[clamp(22px,6.4vw,30px)]' : 'text-[19px]')} style={{ color: on ? 'var(--p3r-mulberry)' : it.danger ? P3R.magenta : P3R.ink }}>{it.label}</span>
              {it.badge && <span className="relative shrink-0">{it.badge}</span>}
              {it.en && <span className="relative ml-auto shrink-0 font-cond text-[12px] uppercase" style={{ color: on ? 'var(--p3r-mulberry)' : P3R.grey }}>{it.en}</span>}
            </button>
          </motion.li>
        );
      })}
    </ul>
  );
};
