/**
 * P6 私有：P4G Golden「Config」画面 1:1 原语。
 *   CfgTabBar   —— 顶部 [Q] Audio | Game | Graphics… [E] 标签条（深灰块，选中橙块黑字）
 *   CfgRow      —— 浅黄横条：左列标签（宽屏右对齐）+ 右列取值；聚焦/悬停整行反黑（夜：反黄），取值框变青柠
 *   CfgSeg      —— 取值分段（ON / OFF、快 / 正常 / 慢…），选中 = 黑块青柠字（聚焦行内 = 青柠块黑字）
 *   CfgSlider   —— 黑胶囊轨 + 白圆钮 + 右侧数字（Contrast 3）
 *   CfgSubhead  —— 橙色斜体副标（"Apply changed settings" 式）
 *   CfgConfigBand —— 底部「Config」紫字条纹带（用作页头）
 *   CfgBlock    —— 子块（天气 / 导入音乐…）：奶油纸 + 黑框 + 彩条顶
 */
import { type ReactNode, type CSSProperties, useId } from 'react';
import './pkg6.css';
import { cx } from '@yellow/lib/cx';
import { P4Outline } from '@yellow/kit';

export function CfgTabBar<T extends string>({ items, value, onChange, className }: { items: { id: T; label: string }[]; value: T | null; onChange: (id: T) => void; className?: string }) {
  const idx = Math.max(0, items.findIndex((i) => i.id === value));
  const go = (d: number) => onChange(items[(idx + d + items.length) % items.length].id);
  return (
    <div className={cx('flex min-w-0 items-stretch gap-1 bg-p4g-black p-1 night:border-b-2 night:border-p4g-yellow', className)} role="tablist" aria-label="设置分组">
      <button type="button" onClick={() => go(-1)} aria-label="上一个分组" className="p4g-press flex w-9 shrink-0 items-center justify-center">
        <span className="flex h-7 w-7 items-center justify-center rounded-sm border-2 border-p4g-white font-display text-meta font-bold text-p4g-white">Q</span>
      </button>
      <div className="p6-noscroll flex min-w-0 flex-1 gap-1 overflow-x-auto">
        {items.map((it) => {
          const on = it.id === value;
          return (
            <button key={it.id} role="tab" aria-selected={on} type="button" onClick={() => onChange(it.id)}
              className={cx('shrink-0 px-3 py-1.5 font-display text-lead font-bold tracking-tight transition-colors duration-fast wide:px-4 wide:text-h3',
                on ? 'bg-p4g-orange text-p4g-black' : 'bg-[rgb(var(--p4g-white-rgb)/0.22)] text-[rgb(var(--p4g-white-rgb)/0.88)] hover:bg-[rgb(var(--p4g-white-rgb)/0.32)]')}>
              {it.label}
            </button>
          );
        })}
      </div>
      <button type="button" onClick={() => go(1)} aria-label="下一个分组" className="p4g-press flex w-9 shrink-0 items-center justify-center">
        <span className="flex h-7 w-7 items-center justify-center rounded-sm border-2 border-p4g-white font-display text-meta font-bold text-p4g-white">E</span>
      </button>
    </div>
  );
}

/** 一组 CfgRow 的容器（行间 6px，P4G 行距） */
export function CfgList({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cx('grid grid-cols-1 gap-[6px]', className)}>{children}</div>;
}

export interface CfgRowProps { label: ReactNode; hint?: ReactNode; children?: ReactNode; inline?: boolean; badge?: ReactNode; htmlFor?: string; className?: string; tone?: 'default' | 'active'; below?: ReactNode }
/** inline：标签与控件始终同行（开关类）；否则竖屏上下叠、宽屏左右分栏 */
export function CfgRow({ label, hint, children, inline, badge, htmlFor, className, tone = 'default', below }: CfgRowProps) {
  return (
    <div className={cx('p6-row group relative min-w-0 rounded-[4px] px-3 py-2.5 transition-colors duration-fast',
      tone === 'active' ? 'bg-p4g-select text-[color:var(--p4g-select-ink)]' :
        below ? 'border-l-[6px] border-transparent bg-[rgb(var(--p4g-yellow-pale-rgb)/0.92)] text-p4g-black focus-within:border-p4g-orange hover:border-p4g-black night:bg-p4g-surface night:text-p4g-ink night:hover:border-p4g-yellow' :
        'bg-[rgb(var(--p4g-yellow-pale-rgb)/0.92)] text-p4g-black hover:bg-p4g-select hover:text-[color:var(--p4g-select-ink)] focus-within:bg-p4g-select focus-within:text-[color:var(--p4g-select-ink)] night:bg-p4g-surface night:text-p4g-ink night:hover:text-[color:var(--p4g-select-ink)] night:focus-within:text-[color:var(--p4g-select-ink)]',
      className)}>
      <div className={cx('flex min-w-0 gap-x-4 gap-y-2', inline ? 'flex-row items-center' : 'flex-col sm:flex-row sm:items-center')}>
        <div className={cx('min-w-0', inline ? 'flex-1' : 'sm:w-[40%] sm:shrink-0 sm:text-right')}>
          <label htmlFor={htmlFor} className="block font-display text-body font-bold leading-snug tracking-wide">
            {label}{badge && <span className="ml-1.5 inline-block align-middle">{badge}</span>}
          </label>
          {hint && <div className="mt-0.5 text-meta leading-snug opacity-75">{hint}</div>}
        </div>
        {children !== undefined && <div className={cx('flex min-w-0 items-center', inline ? 'shrink-0 justify-end' : 'flex-1 justify-start sm:justify-center')}>{children}</div>}
      </div>
      {below && <div className="mt-2.5 min-w-0">{below}</div>}
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
            className={cx('p4g-press min-w-0 rounded-[3px] font-display font-bold leading-tight transition-colors duration-fast',
              size === 'sm' ? 'px-2.5 py-1 text-meta' : 'min-h-[36px] px-3.5 py-1.5 text-lead',
              on ? 'bg-p4g-black text-p4g-yellow-hi group-hover:bg-p4g-yellow-hi group-hover:text-p4g-black group-focus-within:bg-p4g-yellow-hi group-focus-within:text-p4g-black night:bg-p4g-yellow night:text-p4g-black night:group-hover:bg-p4g-black night:group-hover:text-p4g-yellow night:group-focus-within:bg-p4g-black night:group-focus-within:text-p4g-yellow'
                : 'bg-transparent opacity-60 hover:opacity-100')}>
            <span className="block truncate">{o.label}</span>
            {o.sub && <span className="block truncate text-2xs font-normal opacity-80">{o.sub}</span>}
          </button>
        );
      })}
    </div>
  );
}

/** ON / OFF（P4G 取值式开关，role=switch） */
export function CfgToggle({ checked, onChange, ariaLabel, disabled, onDark }: { checked: boolean; onChange: (v: boolean) => void; ariaLabel: string; disabled?: boolean; onDark?: boolean }) {
  return (
    <button type="button" role="switch" aria-checked={checked} aria-label={ariaLabel} disabled={disabled} onClick={() => onChange(!checked)}
      className="p4g-press flex shrink-0 items-center gap-0.5 rounded-[3px] font-display text-lead font-bold disabled:opacity-40">
      {[true, false].map((v) => (
        <span key={String(v)} className={cx('min-w-[46px] rounded-[3px] px-2 py-1 text-center transition-colors duration-fast',
          checked === v && onDark ? 'bg-p4g-yellow text-p4g-black' : checked === v ? 'bg-p4g-black text-p4g-yellow-hi group-hover:bg-p4g-yellow-hi group-hover:text-p4g-black group-focus-within:bg-p4g-yellow-hi group-focus-within:text-p4g-black night:bg-p4g-yellow night:text-p4g-black night:group-hover:bg-p4g-black night:group-hover:text-p4g-yellow night:group-focus-within:bg-p4g-black night:group-focus-within:text-p4g-yellow' : 'opacity-45')}>
          {v ? 'ON' : 'OFF'}
        </span>
      ))}
    </button>
  );
}

export function CfgSlider({ value, onChange, onCommit, min = 0, max = 100, step = 1, ariaLabel, suffix = '', className, left, right }: { value: number; onChange: (v: number) => void; onCommit?: () => void; min?: number; max?: number; step?: number; ariaLabel: string; suffix?: string; className?: string; left?: ReactNode; right?: ReactNode }) {
  const pct = ((value - min) / (max - min)) * 100;
  return (
    <div className={cx('flex w-full min-w-0 items-center gap-3', className)}>
      {left && <span aria-hidden className="shrink-0 select-none">{left}</span>}
      <input type="range" className="p6-range min-w-0 flex-1" min={min} max={max} step={step} value={value} aria-label={ariaLabel}
        onChange={(e) => onChange(Number(e.target.value))} onPointerUp={onCommit} onKeyUp={onCommit}
        style={{ '--p6-fill': `${pct}%` } as CSSProperties} />
      {right && <span aria-hidden className="shrink-0 select-none">{right}</span>}
      <span className="p4g-num w-[3.2em] shrink-0 text-right text-lead">{value}{suffix}</span>
    </div>
  );
}

export function CfgSubhead({ children, en, icon, className }: { children: ReactNode; en?: string; icon?: ReactNode; className?: string }) {
  return (
    <div className={cx('flex min-w-0 items-end gap-2 pb-1 pt-2', className)}>
      {icon && <span aria-hidden className="shrink-0 text-[color:var(--p4g-orange-deep)] night:text-p4g-orange">{icon}</span>}
      <h4 className="shrink-0 font-display text-h3 font-bold italic leading-none text-[color:var(--p4g-orange-deep)] night:text-p4g-orange">{children}</h4>
      {en && <span className="min-w-0 truncate font-display text-2xs font-bold italic uppercase tracking-[0.2em] text-[color:var(--p4g-orange-deep)] opacity-80 night:text-p4g-orange">{en}</span>}
      <span aria-hidden className="mb-1 h-[3px] min-w-[12px] flex-1 bg-[color:var(--p4g-orange-deep)] night:bg-p4g-orange" />
    </div>
  );
}

export function CfgBlock({ title, en, aside, children, className, id }: { title: ReactNode; en?: string; aside?: ReactNode; children: ReactNode; className?: string; id?: string }) {
  return (
    <section id={id} className={cx('relative min-w-0 overflow-hidden rounded-[4px] border-3 border-p4g-black bg-p4g-surface-2 text-p4g-ink shadow-hard night:border-p4g-yellow', className)}>
      <div aria-hidden className="h-2 p4g-candy" />
      <div className="flex min-w-0 items-center gap-2 border-b-2 border-dashed border-p4g-line/30 px-3 py-2">
        <div className="min-w-0 flex-1">
          <h4 className="truncate font-display text-lead font-bold">{title}</h4>
          {en && <div className="truncate font-display text-2xs font-bold uppercase tracking-[0.22em] text-p4g-ink-soft">{en}</div>}
        </div>
        {aside && <div className="shrink-0">{aside}</div>}
      </div>
      <div className="min-w-0 space-y-3 p-3">{children}</div>
    </section>
  );
}

/** 页头：P4G「Config」底带 —— 条纹 + 紫字白边特大标题 */
export function CfgConfigBand({ title, en, onBack, right }: { title: string; en: string; onBack?: () => void; right?: ReactNode }) {
  return (
    <div className="relative -mx-4 min-w-0 overflow-hidden wide:-mx-8">
      <div aria-hidden className="p6-config-band absolute inset-0" />
      <div className="relative flex min-w-0 items-end gap-2 px-4 pb-2 pt-3 wide:px-8">
        {onBack && (
          <button type="button" onClick={onBack} aria-label="返回" className="p4g-press mb-2 flex h-10 w-10 shrink-0 items-center justify-center rounded-sm border-3 border-p4g-black bg-p4g-yellow text-p4g-black shadow-hard-sm night:border-p4g-yellow night:bg-p4g-black night:text-p4g-yellow">
            <span aria-hidden className="h-0 w-0 border-y-[7px] border-r-[11px] border-y-transparent border-r-current" />
          </button>
        )}
        <div className="min-w-0 flex-1">
          <P4Outline as="h1" size="clamp(48px, 15vw, 88px)" stroke={6} fill="var(--p4g-purple)" strokeColor="var(--p4g-white)" className="block leading-[0.95]">{title}</P4Outline>
          <div className="-mt-0.5 pl-1"><span className="inline-block -skew-x-12 bg-p4g-white px-2 font-display text-lead font-bold italic tracking-wide text-p4g-purple shadow-[2px_2px_0_var(--p4g-black)] night:bg-p4g-black night:shadow-[2px_2px_0_var(--p4g-purple)]">{en}</span></div>
        </div>
        {right && <div className="mb-2 shrink-0">{right}</div>}
      </div>
    </div>
  );
}

/** 小型按钮（行内动作）—— 黑框奶油底，聚焦行内变青柠 */
export function CfgBtn({ children, onClick, disabled, tone = 'default', className, ...a }: { children: ReactNode; onClick?: () => void; disabled?: boolean; tone?: 'default' | 'primary' | 'danger'; className?: string; 'aria-label'?: string; title?: string }) {
  return (
    <button type="button" onClick={onClick} disabled={disabled} {...a}
      className={cx('p4g-press inline-flex min-h-[34px] min-w-0 shrink-0 items-center justify-center gap-1 rounded-[3px] border-2 px-3 py-1 font-display text-meta font-bold shadow-hard-sm disabled:cursor-not-allowed disabled:opacity-45',
        tone === 'primary' ? 'border-p4g-black bg-p4g-yellow text-p4g-black night:border-p4g-yellow'
          : tone === 'danger' ? 'border-p4g-black bg-p4g-danger text-p4g-white night:border-p4g-yellow'
            : 'border-p4g-black bg-p4g-white text-p4g-black night:border-p4g-yellow night:bg-p4g-black night:text-p4g-yellow',
        className)}>
      <span className="truncate">{children}</span>
    </button>
  );
}

/** 原生输入（行内用，避免 P4Input 标签包装过重） */
export function CfgInput({ className, ...rest }: React.InputHTMLAttributes<HTMLInputElement>) {
  const id = useId();
  return <input id={rest.id ?? id} {...rest} className={cx('h-10 w-full min-w-0 rounded-[3px] border-2 border-p4g-black bg-p4g-white px-3 font-body text-body text-p4g-black placeholder:text-p4g-muted focus:outline-none focus:ring-2 focus:ring-p4g-orange night:border-p4g-yellow night:bg-p4g-black night:text-p4g-ink', className)} />;
}
export function CfgTextarea({ className, ...rest }: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea {...rest} className={cx('w-full min-w-0 rounded-[3px] border-2 border-p4g-black bg-p4g-white px-3 py-2 font-body text-body leading-relaxed text-p4g-black placeholder:text-p4g-muted focus:outline-none focus:ring-2 focus:ring-p4g-orange night:border-p4g-yellow night:bg-p4g-black night:text-p4g-ink', className)} />;
}
export function CfgSelect({ className, options, ...rest }: React.SelectHTMLAttributes<HTMLSelectElement> & { options: { value: string; label: string }[] }) {
  return (
    <select {...rest} className={cx('h-10 min-w-0 max-w-full rounded-[3px] border-2 border-p4g-black bg-p4g-white px-2 font-display text-body font-bold text-p4g-black focus:outline-none focus:ring-2 focus:ring-p4g-orange night:border-p4g-yellow night:bg-p4g-black night:text-p4g-ink', className)}>
      {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
    </select>
  );
}

/** 消息条（成功/失败小字） */
export function CfgMsg({ ok, children }: { ok?: boolean; children: ReactNode }) {
  return (
    <p className={cx('whitespace-pre-line rounded-[3px] border-l-4 px-2.5 py-1.5 text-meta font-bold leading-relaxed',
      ok ? 'border-p4g-green bg-[rgb(var(--p4g-green-rgb)/0.14)]' : 'border-p4g-danger bg-[rgb(var(--p4g-danger-rgb)/0.12)]')}>{children}</p>
  );
}
