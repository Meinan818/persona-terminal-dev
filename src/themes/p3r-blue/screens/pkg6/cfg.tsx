/**
 * P6 私有：P3R「CONFIG」画面原语（蓝白）。API 与黄色版 cfg 同名，便于状态机直接沿用；外观全部按 P3R 重画：
 *   CfgTabBar   —— LB [分组斜页签] RB（P3R 切页：当前页签蓝斜块 + 光标楔下划）
 *   CfgRow      —— CONFIG 行：斜切浅樱行面，悬停 / 聚焦整行翻墨色 + 左缘光标楔（真实 P3R 当前项）
 *   CfgSeg      —— ‹值› 分段：当前值蓝斜块（墨色行内反白）
 *   CfgToggle   —— ON · OFF 两段斜字
 *   CfgSlider   —— 刻度条（P3R 音量格）可拖 / 键盘
 *   CfgSubhead  —— 青斜片 + 超粗斜体中文 + 窄斜体英文 + 臂章红句点
 *   CfgBlock    —— 子块（天气 / 导入音乐…）：层叠错位斜板
 *   CfgConfigBand —— 页头（P3PageHeader + 幽灵大字 CONFIG）
 */
import { type ReactNode, useId } from 'react';
import './pkg6.css';
import { cx } from '@blue/lib/cx';
import { P3R, SelectWedge, slantClip, tickClip, P3PageHeader } from '@blue/kit';

export function CfgTabBar<T extends string>({ items, value, onChange, className }: { items: { id: T; label: string }[]; value: T | null; onChange: (id: T) => void; className?: string }) {
  const idx = Math.max(0, items.findIndex((i) => i.id === value));
  const go = (d: number) => onChange(items[(idx + d + items.length) % items.length].id);
  const lb = (k: string, d: number, label: string) => (
    <button type="button" onClick={() => go(d)} aria-label={label} className="p6-press flex w-10 shrink-0 items-center justify-center">
      <span className="flex h-6 w-9 items-center justify-center font-cond text-[12px]" style={{ background: P3R.ink, color: 'var(--p3r-on-ink)', clipPath: slantClip(5) }}>{k}</span>
    </button>
  );
  return (
    <div className={cx('relative flex min-w-0 items-stretch gap-1 px-1 py-1.5', className)} role="tablist" aria-label="设置分组"
      onKeyDown={(e) => { if (e.key === 'q' || e.key === 'Q') go(-1); if (e.key === 'e' || e.key === 'E') go(1); }}>
      <span aria-hidden className="absolute inset-0" style={{ background: 'var(--p3r-panel-glass)', clipPath: slantClip(10) }} />
      {lb('LB', -1, '上一个分组')}
      <div className="p6-noscroll relative flex min-w-0 flex-1 gap-1 overflow-x-auto">
        {items.map((it) => {
          const on = it.id === value;
          return (
            <button key={it.id} role="tab" aria-selected={on} type="button" onClick={() => onChange(it.id)}
              className="relative shrink-0 px-3.5 py-1.5 font-heavy text-[15px] transition-colors duration-fast wide:px-4 wide:text-[17px]"
              style={{ color: on ? P3R.onBlue : P3R.inkSoft }}>
              {on && <span aria-hidden className="absolute inset-0" style={{ background: P3R.blue, clipPath: slantClip(8) }} />}
              <span className="relative">{it.label}</span>
            </button>
          );
        })}
      </div>
      {lb('RB', 1, '下一个分组')}
    </div>
  );
}

/** 一组 CfgRow 的容器 */
export function CfgList({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cx('grid grid-cols-1 gap-[5px]', className)}>{children}</div>;
}

export interface CfgRowProps { label: ReactNode; hint?: ReactNode; children?: ReactNode; inline?: boolean; badge?: ReactNode; htmlFor?: string; className?: string; tone?: 'default' | 'active'; below?: ReactNode }
/** inline：标签与控件同行（开关类）；否则竖屏上下叠、宽屏左右分栏。悬停 / 聚焦 = P3R 当前项（墨色斜行 + 光标楔） */
export function CfgRow({ label, hint, children, inline, badge, htmlFor, className, tone = 'default', below }: CfgRowProps) {
  const act = tone === 'active';
  return (
    <div className={cx('p6-row group relative min-w-0 px-4 py-2.5', act && 'p6-row-active', below && 'p6-row-below', className)}>
      <span aria-hidden className="p6-row-bg absolute inset-0" style={{ clipPath: slantClip(10) }} />
      <span aria-hidden className="p6-row-wedge pointer-events-none absolute -left-1.5 top-3 h-[24px] w-[22px]"><SelectWedge className="inset-0" /></span>
      <div className={cx('relative flex min-w-0 gap-x-4 gap-y-2', inline ? 'flex-row items-center' : 'flex-col sm:flex-row sm:items-center')}>
        <div className={cx('min-w-0', inline ? 'flex-1' : 'sm:w-[38%] sm:shrink-0')}>
          <label htmlFor={htmlFor} className="p6-row-label block text-[15px] font-black leading-snug">
            {label}{badge && <span className="ml-1.5 inline-block align-middle">{badge}</span>}
          </label>
          {hint && <div className="p6-row-hint mt-0.5 text-[12px] leading-snug">{hint}</div>}
        </div>
        {children !== undefined && <div className={cx('p6-row-ctl flex min-w-0 items-center', inline ? 'shrink-0 justify-end' : 'flex-1 justify-start')}>{children}</div>}
      </div>
      {below && <div className="relative mt-2.5 min-w-0">{below}</div>}
    </div>
  );
}

export interface CfgSegOption<V extends string | number | boolean> { value: V; label: ReactNode; hint?: string; sub?: ReactNode }
export function CfgSeg<V extends string | number | boolean>({ options, value, onChange, ariaLabel, wrap, size = 'md', role = 'radiogroup', className }: { options: CfgSegOption<V>[]; value: V | V[]; onChange: (v: V) => void; ariaLabel?: string; wrap?: boolean; size?: 'sm' | 'md'; role?: 'radiogroup' | 'group'; className?: string }) {
  const isOn = (v: V) => (Array.isArray(value) ? value.includes(v) : value === v);
  return (
    <div role={role} aria-label={ariaLabel} className={cx('flex min-w-0 gap-1', wrap ? 'flex-wrap' : '', className)}>
      {options.map((o) => {
        const on = isOn(o.value);
        return (
          <button key={String(o.value)} type="button" role={role === 'radiogroup' ? 'radio' : undefined} aria-checked={role === 'radiogroup' ? on : undefined} aria-pressed={role === 'group' ? on : undefined}
            title={o.hint} onClick={() => onChange(o.value)}
            className={cx('p6-press p6-seg relative min-w-0 font-heavy leading-tight', on && 'p6-seg-on', size === 'sm' ? 'px-3 py-1 text-[12px]' : 'min-h-[34px] px-3.5 py-1.5 text-[14px]')}>
            <span aria-hidden className="p6-seg-bg absolute inset-0" style={{ clipPath: slantClip(6) }} />
            <span className="relative block truncate">{o.label}</span>
            {o.sub && <span className="relative block truncate font-body text-[10px] font-bold opacity-80">{o.sub}</span>}
          </button>
        );
      })}
    </div>
  );
}

/** ON · OFF（P3R 两段斜字开关，role=switch） */
export function CfgToggle({ checked, onChange, ariaLabel, disabled }: { checked: boolean; onChange: (v: boolean) => void; ariaLabel: string; disabled?: boolean; onDark?: boolean }) {
  return (
    <button type="button" role="switch" aria-checked={checked} aria-label={ariaLabel} disabled={disabled} onClick={() => onChange(!checked)}
      className="p6-press flex shrink-0 items-center font-cond text-[15px] disabled:opacity-40">
      {[true, false].map((v) => (
        <span key={String(v)} className={cx('p6-onoff relative flex h-8 w-12 items-center justify-center', checked === v && (v ? 'p6-onoff-on' : 'p6-onoff-off'))}>
          {checked === v && <span aria-hidden className="p6-onoff-bg absolute inset-0" style={{ clipPath: slantClip(7) }} />}
          <span className="relative">{v ? 'ON' : 'OFF'}</span>
        </span>
      ))}
    </button>
  );
}

/** 刻度条（P3R 音量格）：点 / 拖 / ←→；onCommit 在松手 / 键抬起触发 */
export function CfgSlider({ value, onChange, onCommit, min = 0, max = 100, step = 1, ariaLabel, suffix = '', className, left, right }: { value: number; onChange: (v: number) => void; onCommit?: () => void; min?: number; max?: number; step?: number; ariaLabel: string; suffix?: string; className?: string; left?: ReactNode; right?: ReactNode }) {
  const steps = 16;
  const lit = Math.round(((value - min) / (max - min)) * steps);
  const set = (clientX: number, el: HTMLElement) => {
    const r = el.getBoundingClientRect();
    const k = Math.max(0, Math.min(1, (clientX - r.left) / r.width));
    const raw = min + k * (max - min);
    onChange(Math.round(raw / step) * step);
  };
  return (
    <div className={cx('flex w-full min-w-0 items-center gap-3', className)}>
      {left && <span aria-hidden className="shrink-0 select-none">{left}</span>}
      <div role="slider" tabIndex={0} aria-label={ariaLabel} aria-valuemin={min} aria-valuemax={max} aria-valuenow={value}
        className="flex h-8 min-w-0 flex-1 cursor-pointer touch-none items-end gap-[3px] focus-visible:outline-none"
        onPointerDown={(e) => { (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId); set(e.clientX, e.currentTarget); }}
        onPointerMove={(e) => { if (e.buttons) set(e.clientX, e.currentTarget); }}
        onPointerUp={onCommit}
        onKeyDown={(e) => { if (e.key === 'ArrowRight') onChange(Math.min(max, value + step)); if (e.key === 'ArrowLeft') onChange(Math.max(min, value - step)); }}
        onKeyUp={onCommit}>
        {Array.from({ length: steps }).map((_, i) => (
          <span key={i} className="min-w-0 flex-1 transition-colors duration-fast" style={{ height: `${36 + (i / steps) * 64}%`, background: i < lit ? P3R.blue : 'var(--p3r-track)', clipPath: slantClip(2) }} />
        ))}
      </div>
      {right && <span aria-hidden className="shrink-0 select-none">{right}</span>}
      <span className="w-[3.4em] shrink-0 text-right font-cond text-[17px] tabular" style={{ color: 'var(--p3r-rose-ink)' }}>{value}{suffix}</span>
    </div>
  );
}

export function CfgSubhead({ children, en, icon, className }: { children: ReactNode; en?: string; icon?: ReactNode; className?: string }) {
  return (
    <div className={cx('flex min-w-0 items-end gap-2 pb-1 pt-3', className)}>
      <span aria-hidden className="mb-[3px] h-[13px] w-[9px] shrink-0" style={{ background: P3R.cyan, clipPath: tickClip }} />
      {icon && <span aria-hidden className="shrink-0" style={{ color: 'var(--p3r-rose-ink)' }}>{icon}</span>}
      <h4 className="shrink-0 font-heavy text-[18px] leading-none" style={{ color: P3R.ink }}>{children}<span aria-hidden style={{ color: P3R.magenta }}>.</span></h4>
      {en && <span className="min-w-0 truncate font-cond text-[11px] uppercase tracking-[0.18em]" style={{ color: 'var(--p3r-lilac-ink)' }}>{en}</span>}
      <span aria-hidden className="mb-1 h-px min-w-[12px] flex-1" style={{ background: P3R.ink, opacity: 0.3 }} />
    </div>
  );
}

/** 子块：层叠错位斜板（后层青，内收不溢出） */
export function CfgBlock({ title, en, aside, children, className, id }: { title: ReactNode; en?: string; aside?: ReactNode; children: ReactNode; className?: string; id?: string }) {
  return (
    <section id={id} className={cx('relative min-w-0 pb-[6px] pr-[6px]', className)}>
      <span aria-hidden className="absolute bottom-0 left-[6px] right-0 top-[6px]" style={{ background: 'var(--p3r-slab-back)', clipPath: slantClip(14) }} />
      <div className="relative min-w-0" style={{ background: P3R.panel, clipPath: slantClip(14) }}>
        <span aria-hidden className="absolute left-0 top-0 h-full w-[4px]" style={{ background: P3R.blue }} />
        <div className="flex min-w-0 items-center gap-2 px-4 pb-2 pt-3" style={{ borderBottom: '1px solid rgb(var(--p3r-cyan-rgb) / 0.35)' }}>
          <div className="min-w-0 flex-1">
            <h4 className="truncate font-heavy text-[17px]" style={{ color: P3R.ink }}>{title}</h4>
            {en && <div className="truncate font-cond text-[10px] uppercase tracking-[0.2em]" style={{ color: 'var(--p3r-lilac-ink)' }}>{en}</div>}
          </div>
          {aside && <div className="shrink-0">{aside}</div>}
        </div>
        <div className="min-w-0 space-y-3 p-4">{children}</div>
      </div>
    </section>
  );
}

/** 页头：P3PageHeader（≤390 自动 compact）+ 幽灵大字 */
export function CfgConfigBand({ title, en, onBack, right, subtitle }: { title: string; en: string; onBack?: () => void; right?: ReactNode; subtitle?: ReactNode }) {
  return <P3PageHeader title={title} en={en} subtitle={subtitle} onBack={onBack} actions={right} ghost="CONFIG" />;
}

/** 行内小按钮 */
export function CfgBtn({ children, onClick, disabled, tone = 'default', className, ...a }: { children: ReactNode; onClick?: () => void; disabled?: boolean; tone?: 'default' | 'primary' | 'danger'; className?: string; 'aria-label'?: string; title?: string }) {
  const bg = tone === 'primary' ? P3R.blue : tone === 'danger' ? P3R.magenta : 'var(--p3r-cyan-pale)';
  const fg = tone === 'primary' ? P3R.onBlue : tone === 'danger' ? '#fff' : P3R.ink;
  return (
    <button type="button" onClick={onClick} disabled={disabled} {...a}
      className={cx('p6-press relative inline-flex min-h-[34px] min-w-0 shrink-0 items-center justify-center gap-1 px-3.5 py-1 text-[12px] font-black disabled:cursor-not-allowed disabled:opacity-40', className)}
      style={{ background: bg, color: fg, clipPath: slantClip(6) }}>
      <span className="truncate">{children}</span>
    </button>
  );
}

const fieldCls = 'w-full min-w-0 border-0 border-b-2 bg-[color:var(--p3r-field)] text-[15px] font-bold text-p3r-ink outline-none placeholder:text-p3r-grey/70 focus:bg-[color:var(--p3r-field-focus)]';
export function CfgInput({ className, style, ...rest }: React.InputHTMLAttributes<HTMLInputElement>) {
  const id = useId();
  return <input id={rest.id ?? id} {...rest} className={cx(fieldCls, 'h-10 px-3', className)} style={{ borderColor: 'var(--p3r-cyan)', clipPath: slantClip(5), ...style }} />;
}
export function CfgTextarea({ className, style, ...rest }: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea {...rest} className={cx(fieldCls, 'resize-none px-3 py-2 leading-relaxed', className)} style={{ borderColor: 'var(--p3r-cyan)', ...style }} />;
}
export function CfgSelect({ className, options, style, ...rest }: React.SelectHTMLAttributes<HTMLSelectElement> & { options: { value: string; label: string }[] }) {
  return (
    <span className="relative inline-block min-w-0 max-w-full">
      <select {...rest} className={cx(fieldCls, 'h-10 appearance-none pl-3 pr-8 text-[14px]', className)} style={{ borderColor: 'var(--p3r-cyan)', clipPath: slantClip(5), ...style }}>
        {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
      <span aria-hidden className="pointer-events-none absolute right-3 top-1/2 h-0 w-0 -translate-y-1/2 border-x-[5px] border-t-[7px] border-x-transparent" style={{ borderTopColor: P3R.blue }} />
    </span>
  );
}

/** 消息条（成功 / 失败） */
export function CfgMsg({ ok, children }: { ok?: boolean; children: ReactNode }) {
  return (
    <p className="relative whitespace-pre-line px-3 py-1.5 text-[12px] font-bold leading-relaxed" style={{ color: ok ? P3R.ink : 'var(--p3r-coral-ink)', background: ok ? 'rgb(var(--p3r-mint-rgb) / 0.16)' : 'var(--bk-danger-wash)', borderLeft: `4px solid ${ok ? 'var(--p3r-mint)' : 'var(--p3r-magenta)'}` }}>{children}</p>
  );
}
