/**
 * 工作包 5 私有小件（不进 kit）：P4G 风格的 TagPicker / 日期快捷 / 月份导航 / 环图 / 标签 / 大金额 / 状态切换等。
 * 全部只用 --p4g-* token，动效只动 transform / opacity。
 */
import { useState, type ReactNode } from 'react';
import { motion } from 'framer-motion';
import { cx } from '@yellow/lib/cx';
import { useLowMotion } from '@yellow/lib/prefs';
import { P5_TODAY, daysAgoKey } from '@yellow/adapters/pkg5';


/** 斜切小标签（字段名）：橙色斜块 + 粗体 */
export function P5Label({ children, aside, className }: { children: ReactNode; aside?: ReactNode; className?: string }) {
  return (
    <div className={cx('flex min-w-0 items-center gap-1.5 font-display text-meta font-bold text-p4g-ink', className)}>
      <span aria-hidden className="inline-block h-3 w-1.5 shrink-0 -skew-x-12 bg-p4g-orange" />
      <span className="min-w-0 truncate">{children}</span>
      {aside && <span className="ml-1 min-w-0 truncate text-2xs font-bold text-p4g-ink-soft">{aside}</span>}
    </div>
  );
}

/** 可选中的斜切小片（chips 单选的一枚） */
export function P5Pick({ on, onClick, children, tone = 'ink', dashed, className, ariaLabel }: { on?: boolean; onClick?: () => void; children: ReactNode; tone?: 'ink' | 'green' | 'danger'; dashed?: boolean; className?: string; ariaLabel?: string }) {
  const onCls = tone === 'green' ? 'bg-p4g-green text-p4g-black border-p4g-black' : tone === 'danger' ? 'bg-p4g-danger text-[color:var(--p4g-danger-ink)] border-p4g-black' : 'bg-p4g-select text-[color:var(--p4g-select-ink)] border-p4g-select';
  return (
    <button
      type="button" onClick={onClick} aria-pressed={on} aria-label={ariaLabel}
      className={cx('p4g-press relative inline-flex h-8 min-w-0 max-w-full items-center gap-1 rounded-xs border-thin px-2.5 font-display text-meta font-bold leading-none',
        on ? onCls : dashed ? 'border-dashed border-p4g-line bg-transparent text-p4g-ink-soft' : 'border-p4g-line bg-p4g-surface-2 text-p4g-ink', className)}
    >
      {on && <span aria-hidden className="absolute -left-[3px] top-1/2 h-0 w-0 -translate-y-1/2 border-y-[4px] border-l-[5px] border-y-transparent border-l-p4g-orange" />}
      <span className="min-w-0 truncate">{children}</span>
    </button>
  );
}

/** chips 单选 + ＋自定义 + 可折叠（真实 Ledger.tsx#TagPicker）*/
export function TagPicker({ options, value, onChange, onAdd, addPlaceholder = '新类型', accent, collapsedCount, expanded, onToggleExpand, clearable = true }: {
  options: string[]; value: string; onChange: (v: string) => void; onAdd?: (v: string) => void; addPlaceholder?: string; accent?: 'green';
  collapsedCount?: number; expanded?: boolean; onToggleExpand?: () => void; clearable?: boolean;
}) {
  const [adding, setAdding] = useState(false);
  const [text, setText] = useState('');
  const overflow = collapsedCount != null && options.length > collapsedCount;
  const collapsed = overflow && !expanded;
  const shown = collapsed ? options.slice(0, collapsedCount) : options;
  const commit = () => { const v = text.trim(); if (v) { onAdd?.(v); onChange(v); } setText(''); setAdding(false); };
  return (
    <div className="flex min-w-0 flex-wrap gap-2">
      {shown.map((o) => <P5Pick key={o} on={value === o} tone={accent === 'green' ? 'green' : 'ink'} onClick={() => onChange(clearable && value === o ? '' : o)}>{o}</P5Pick>)}
      {overflow && <P5Pick dashed onClick={onToggleExpand}>{collapsed ? `更多 ${options.length - collapsedCount!}` : '收起'}</P5Pick>}
      {onAdd && (adding ? (
        <input
          autoFocus value={text} maxLength={8} placeholder={addPlaceholder}
          onChange={(e) => setText(e.target.value)} onBlur={commit}
          onKeyDown={(e) => { if (e.key === 'Enter') commit(); if (e.key === 'Escape') { setText(''); setAdding(false); } }}
          className="h-8 w-24 rounded-xs border-thin border-p4g-line bg-p4g-surface-2 px-2 text-meta font-bold text-p4g-ink outline-none focus:shadow-[3px_3px_0_var(--p4g-yellow)]"
        />
      ) : <P5Pick dashed onClick={() => setAdding(true)}>＋自定义</P5Pick>)}
    </div>
  );
}

/** 日期快捷（今天 / 昨天 + 原生日期选择）*/
export function DateQuickPicker({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <div className="flex min-w-0 flex-wrap items-center gap-2">
      {([['今天', 0], ['昨天', 1]] as const).map(([lbl, n]) => { const dk = daysAgoKey(n); return <P5Pick key={lbl} on={value === dk} onClick={() => onChange(dk)}>{lbl}</P5Pick>; })}
      <input type="date" value={value} onChange={(e) => onChange(e.target.value || P5_TODAY)}
        className="h-8 min-w-0 rounded-xs border-thin border-p4g-line bg-p4g-surface-2 px-2 p4g-num-upright text-meta text-p4g-ink outline-none" />
    </div>
  );
}

/** P4G 日历胶囊式月份导航：◀ [黑胶囊 2026年10月] ▶ + 副行 */
export function MonthNav({ label, sub, onPrev, onNext, nextDisabled, onStage = true }: { label: ReactNode; sub?: ReactNode; onPrev: () => void; onNext: () => void; nextDisabled?: boolean; onStage?: boolean }) {
  const btn = 'p4g-press flex h-10 w-10 shrink-0 items-center justify-center rounded-sm border-3 border-p4g-line bg-p4g-yellow text-p4g-black shadow-hard-sm disabled:opacity-35';
  return (
    <div className="flex min-w-0 items-center justify-between gap-2">
      <button type="button" aria-label="上个月" onClick={onPrev} className={btn}><Tri dir="left" /></button>
      <div className="flex min-w-0 flex-col items-center gap-1 text-center">
        <span className="max-w-full truncate rounded-pill bg-p4g-black px-4 py-1 p4g-date-type text-body text-white night:bg-p4g-yellow night:text-p4g-black">{label}</span>
        {sub && <span className={cx('max-w-full truncate font-display text-meta font-bold', onStage ? 'text-[color:var(--p4g-on-stage)]' : 'text-p4g-ink-soft')}>{sub}</span>}
      </div>
      <button type="button" aria-label="下个月" onClick={onNext} disabled={nextDisabled} className={btn}><Tri dir="right" /></button>
    </div>
  );
}

export const Tri = ({ dir = 'right', size = 8 }: { dir?: 'left' | 'right' | 'down'; size?: number }) => (
  <span aria-hidden className="inline-block h-0 w-0" style={dir === 'down'
    ? { borderLeft: `${size}px solid transparent`, borderRight: `${size}px solid transparent`, borderTop: `${size * 1.2}px solid currentColor` }
    : { borderTop: `${size}px solid transparent`, borderBottom: `${size}px solid transparent`, [dir === 'left' ? 'borderRight' : 'borderLeft']: `${size * 1.3}px solid currentColor` }} />
);

/** 环图（SVG stroke-dasharray；进场只动 opacity/rotate）*/
export function Ring({ segments, total, size = 200, stroke = 22, children, track = 'var(--p4g-surface-2)' }: { segments: { value: number; color: string }[]; total: number; size?: number; stroke?: number; children?: ReactNode; track?: string }) {
  const low = useLowMotion();
  const r = (size - stroke) / 2;
  const C = 2 * Math.PI * r;
  let acc = 0;
  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <motion.svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="absolute inset-0" initial={low ? { opacity: 0 } : { opacity: 0, rotate: -60 }} animate={{ opacity: 1, rotate: 0 }} transition={{ duration: 0.32, ease: [0.2, 0.9, 0.1, 1] }}>
        <circle cx={size / 2} cy={size / 2} r={r + stroke / 2 + 2} fill="none" stroke="var(--p4g-line)" strokeWidth={3} />
        <circle cx={size / 2} cy={size / 2} r={r - stroke / 2 - 2} fill="none" stroke="var(--p4g-line)" strokeWidth={3} />
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={track} strokeWidth={stroke} />
        {segments.map((s, i) => {
          const len = total > 0 ? Math.max(0, s.value / total) * C : 0;
          const el = <circle key={i} cx={size / 2} cy={size / 2} r={r} fill="none" stroke={s.color} strokeWidth={stroke} strokeDasharray={`${len} ${C - len}`} strokeDashoffset={-acc} transform={`rotate(-90 ${size / 2} ${size / 2})`} />;
          acc += len;
          return el;
        })}
        {/* 刻度 */}
        {Array.from({ length: 24 }, (_, i) => <line key={i} x1={size / 2} y1={stroke / 2 - 1} x2={size / 2} y2={stroke / 2 + 4} stroke="var(--p4g-line)" strokeWidth={2} transform={`rotate(${i * 15} ${size / 2} ${size / 2})`} opacity={0.45} />)}
      </motion.svg>
      <div className="absolute inset-0 flex items-center justify-center">{children}</div>
    </div>
  );
}

/** 水平条（BarRow）*/
export function BarRow({ label, amount, max, color = 'var(--p4g-orange)', right }: { label: ReactNode; amount: number; max: number; color?: string; right?: ReactNode }) {
  const ratio = max > 0 ? Math.max(0.02, Math.min(1, amount / max)) : 0;
  return (
    <div className="min-w-0">
      <div className="mb-1 flex min-w-0 items-baseline justify-between gap-2 text-meta font-bold">
        <span className="min-w-0 truncate">{label}</span>
        <span className="shrink-0 p4g-num">{right}</span>
      </div>
      <div className="relative h-3 overflow-hidden rounded-xs border-thin border-p4g-line bg-p4g-surface-2">
        <div className="absolute inset-y-0 left-0 w-full origin-left transition-transform duration-slow ease-out" style={{ transform: `scaleX(${ratio})`, background: color, backgroundImage: 'repeating-linear-gradient(-45deg, rgba(0,0,0,.14) 0 4px, transparent 4px 8px)' }} />
      </div>
    </div>
  );
}

/** Dev 状态切换条（页面内：空 / 首次 / 加载 / 报错 …）*/
export function DevStateBar({ value, items, onChange }: { value: string; items: { id: string; label: string }[]; onChange: (id: string) => void }) {
  return (
    <div className="mt-8 flex min-w-0 flex-wrap items-center gap-1.5 border-t-2 border-dashed pt-3" style={{ borderColor: 'var(--p4g-line-soft)' }}>
      <span className="rounded-xs bg-p4g-black px-1.5 py-0.5 font-display text-2xs font-bold tracking-widest text-p4g-yellow night:bg-p4g-yellow night:text-p4g-black">DEV · 状态</span>
      {items.map((it) => (
        <button key={it.id} type="button" onClick={() => onChange(it.id)} aria-pressed={value === it.id}
          className={cx('h-7 rounded-xs border-thin px-2 font-display text-2xs font-bold', value === it.id ? 'border-p4g-select bg-p4g-select text-[color:var(--p4g-select-ink)]' : 'border-p4g-line bg-p4g-surface-2 text-p4g-ink')}>{it.label}</button>
      ))}
    </div>
  );
}

/** 大号金额（Status 式斜体数字，白字粗黑描边）*/
export function BigNum({ children, size = 'clamp(34px, 10vw, 52px)', className, tone = 'ink' }: { children: ReactNode; size?: string; className?: string; tone?: 'ink' | 'outline' | 'danger' }) {
  if (tone === 'outline') {
    return (
      <span className={cx('relative inline-block p4g-num leading-none', className)} style={{ fontSize: size }}>
        <span aria-hidden className="absolute inset-0" style={{ WebkitTextStroke: '8px var(--p4g-title-stroke)', color: 'var(--p4g-title-stroke)' }}>{children}</span>
        <span className="relative" style={{ color: 'var(--p4g-title-fill)' }}>{children}</span>
      </span>
    );
  }
  return <span className={cx('p4g-num leading-none', tone === 'danger' ? 'text-p4g-danger' : 'text-p4g-ink', className)} style={{ fontSize: size }}>{children}</span>;
}

/** 区块小标题（卡片内）：黑底黄字斜签 + 细线 */
export function CardHead({ children, en, aside }: { children: ReactNode; en?: string; aside?: ReactNode }) {
  return (
    <div className="mb-3 flex min-w-0 items-center gap-2">
      <span className="relative shrink-0">
        <span aria-hidden className="absolute inset-0 -skew-x-12 bg-p4g-black night:bg-p4g-yellow" />
        <span className="relative block px-2.5 py-0.5 font-display text-meta font-bold text-p4g-yellow night:text-p4g-black">{children}</span>
      </span>
      {en && <span className="shrink-0 font-display text-2xs font-bold italic tracking-[0.2em] text-p4g-ink-soft">{en}</span>}
      <span aria-hidden className="h-[2px] min-w-[8px] flex-1 bg-p4g-line opacity-40" />
      {aside && <span className="min-w-0 shrink truncate text-meta font-bold text-p4g-ink-soft">{aside}</span>}
    </div>
  );
}

/** 读 ?state=/?variant= 等查询参数（页面/弹窗的 Dev 状态）*/
export const qp = (params: URLSearchParams | undefined, key: string, def = '') => params?.get(key) ?? def;
