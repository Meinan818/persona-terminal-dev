/**
 * 工作包 5 私有 UI 件（只由工作包 5 使用）：类目斜块、圆环、月份导航、P3R 浅斜卡、斜块小钮、状态切换、金额。
 * 形制参照真实 p3 分支（Ledger.tsx p3 / Achievements.tsx p3 / Account.tsx p3），颜色只走 --p3r-* 变量。
 */
import { motion } from 'framer-motion';
import { MoonPhase } from '@blue/fx/motifs';
import { useState, type CSSProperties, type ReactNode } from 'react';
import { P3R, slantClip, tickClip } from '@blue/kit';
import { useBoldness } from '@blue/lib/prefs';
import { cx } from '@blue/lib/cx';
import { catMeta, daysAgoKey, P5_TODAY } from '@blue/mock/pkg5';
import type { LedgerExpenseType } from '@real/types';

/** 斜切小片（臂章红 / 蓝签名件） */
export const Tick = ({ color = P3R.magenta, w = 14, h = 6, className, style }: { color?: string; w?: number; h?: number; className?: string; style?: CSSProperties }) => (
  <span aria-hidden className={cx('inline-block shrink-0', className)} style={{ width: w, height: h, background: color, clipPath: tickClip, ...style }} />
);

/** 类目斜块：单字形（粉版不用彩色 emoji） */
export const CatMark = ({ type, glyph, color, size = 40 }: { type?: LedgerExpenseType; glyph?: string; color?: string; size?: number }) => {
  const m = catMeta(type);
  const bg = color ?? m.color;
  return (
    <span aria-hidden className="relative flex shrink-0 items-center justify-center font-heavy" style={{ width: size, height: size, background: bg, clipPath: slantClip(Math.round(size / 6)), color: 'var(--p3r-on-blue)', fontSize: size * 0.44 }}>
      <span className="not-italic">{glyph ?? m.icon}</span>
    </span>
  );
};

/** P3R 浅斜卡（真实 p3 白斜卡：panelGlass + 轻影；影走外层 drop-shadow 不被 clip 裁） */
export const GlassSlab = ({ children, cut = 14, className, tone = 'glass', style, onClick, as = 'div' }: { children: ReactNode; cut?: number; className?: string; tone?: 'glass' | 'panel' | 'blush' | 'rose' | 'claim'; style?: CSSProperties; onClick?: () => void; as?: 'div' | 'button' }) => {
  const bg = tone === 'panel' ? P3R.panel : tone === 'blush' ? P3R.cyanPale : tone === 'rose' ? P3R.blue : tone === 'claim' ? 'var(--p3r-claim)' : P3R.panelGlass;
  const Tag = as;
  return (
    <div className={cx('relative min-w-0', className)} style={{ filter: 'drop-shadow(0 10px 22px rgb(var(--p3r-ink-rgb) / 0.08))', ...style }}>
      <Tag type={as === 'button' ? 'button' : undefined} onClick={onClick} className={cx('relative block w-full min-w-0 text-left', onClick && 'active:scale-[0.99]')} style={{ clipPath: slantClip(cut), background: bg }}>
        {children}
      </Tag>
    </div>
  );
};

/** 白斜块小钮（真实 p3「编辑预算 / 对账」） */
export const SlabBtn = ({ children, onClick, tone = 'glass', className, disabled, ariaLabel }: { children: ReactNode; onClick?: () => void; tone?: 'glass' | 'rose' | 'lilac' | 'coral'; className?: string; disabled?: boolean; ariaLabel?: string }) => {
  const s: CSSProperties = tone === 'rose' ? { background: P3R.blue, color: P3R.onBlue } : tone === 'lilac' ? { background: P3R.cyan, color: 'var(--p3r-mulberry)' } : tone === 'coral' ? { background: P3R.magenta, color: '#fff' } : { background: P3R.panelGlass, color: P3R.ink };
  return (
    <button type="button" aria-label={ariaLabel} disabled={disabled} onClick={onClick}
      className={cx('relative shrink-0 px-5 py-2 text-[14px] font-black active:scale-[0.97] disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2', className)}
      style={{ clipPath: slantClip(9), ['--tw-ring-color' as string]: 'var(--bk-focus)', ...s }}>{children}</button>
  );
};

/** 圆环（Donut）：段式，scale-only 动画（strokeDashoffset） */
export const Ring = ({ size = 120, stroke = 14, segments, total, track = 'var(--p3r-track)', children }: { size?: number; stroke?: number; segments: { value: number; color: string }[]; total?: number; track?: string; children?: ReactNode }) => {
  const anim = useBoldness();
  const R = (size - stroke) / 2;
  const L = 2 * Math.PI * R;
  const sum = total ?? segments.reduce((s, x) => s + x.value, 0);
  let acc = 0;
  return (
    <span className="relative inline-flex shrink-0 items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="absolute inset-0 -rotate-90" aria-hidden>
        <circle cx={size / 2} cy={size / 2} r={R} fill="none" stroke={track} strokeWidth={stroke} />
        {segments.map((sg, i) => {
          const frac = sum > 0 ? Math.max(0, sg.value) / sum : 0;
          const off = acc; acc += frac;
          return (
            <motion.circle key={i} cx={size / 2} cy={size / 2} r={R} fill="none" stroke={sg.color} strokeWidth={stroke} strokeDashoffset={-L * off}
              initial={anim ? { strokeDasharray: `0 ${L}` } : false} animate={{ strokeDasharray: `${L * frac} ${L}` }} transition={{ duration: 0.7, delay: 0.08 * i, ease: [0.2, 0.8, 0.2, 1] }} />
          );
        })}
      </svg>
      <span className="relative flex flex-col items-center">{children}</span>
    </span>
  );
};

/** 月份导航（真实 p3：蓝实心三角 + 黑粗月份 + 青下划线） */
export const MonthNav = ({ label, sub, onPrev, onNext, nextDisabled }: { label: ReactNode; sub?: ReactNode; onPrev: () => void; onNext: () => void; nextDisabled?: boolean }) => (
  <div className="flex min-w-0 flex-col items-center gap-1">
    <div className="flex items-center gap-4">
      <button type="button" aria-label="上个月" onClick={onPrev} className="flex h-9 w-9 items-center justify-center active:scale-90">
        <span aria-hidden className="h-0 w-0 border-y-[8px] border-r-[12px] border-y-transparent" style={{ borderRightColor: P3R.blue }} />
      </button>
      <div className="relative">
        <span className="font-heavy text-[22px] leading-none" style={{ color: P3R.ink }}>{label}</span>
        <span aria-hidden className="absolute -bottom-1.5 left-0 right-0 h-[3px]" style={{ background: P3R.cyan, clipPath: slantClip(2) }} />
      </div>
      <button type="button" aria-label="下个月" onClick={onNext} disabled={nextDisabled} className="flex h-9 w-9 items-center justify-center active:scale-90 disabled:opacity-25">
        <span aria-hidden className="h-0 w-0 border-y-[8px] border-l-[12px] border-y-transparent" style={{ borderLeftColor: P3R.blue }} />
      </button>
    </div>
    {sub && <div className="mt-1 text-[12px] font-bold" style={{ color: P3R.grey }}>{sub}</div>}
  </div>
);

/** 节标题（小）：蓝斜片 + 黑粗字 + 英文窄签 */
export const MiniHead = ({ title, en, right, className }: { title: ReactNode; en?: string; right?: ReactNode; className?: string }) => (
  <div className={cx('flex min-w-0 items-center gap-2', className)}>
    <span aria-hidden className="h-[15px] w-[11px] shrink-0" style={{ background: P3R.blue, clipPath: 'polygon(32% 0, 100% 0, 68% 100%, 0 100%)' }} />
    <span className="min-w-0 truncate text-[16px] font-black" style={{ color: P3R.ink }}>{title}</span>
    {en && <span className="shrink-0 font-cond text-[11px] uppercase" style={{ color: P3R.grey }}>{en}</span>}
    {right && <span className="ml-auto shrink-0">{right}</span>}
  </div>
);

/** 选择 chip（斜切）：on = 蓝 */
export const Chip = ({ on, children, onClick, ariaLabel, title, dashed }: { on?: boolean; children: ReactNode; onClick?: () => void; ariaLabel?: string; title?: string; dashed?: boolean }) => (
  <button type="button" aria-pressed={on} aria-label={ariaLabel} title={title} onClick={onClick}
    className="relative inline-flex shrink-0 items-center gap-1 whitespace-nowrap px-3 py-1.5 text-[13px] font-black active:scale-95"
    style={{ clipPath: slantClip(6), background: on ? P3R.blue : dashed ? 'transparent' : 'var(--p3r-chip)', color: on ? P3R.onBlue : dashed ? P3R.roseInk : P3R.ink, boxShadow: dashed ? 'inset 0 0 0 1.5px var(--p3r-blue)' : undefined }}>
    {children}
  </button>
);

/** 金额输入大字（窄斜体） */
export const AmountInput = ({ value, onChange, prefix = '¥', autoFocus, invalid, ariaLabel = '金额' }: { value: string; onChange: (v: string) => void; prefix?: string; autoFocus?: boolean; invalid?: boolean; ariaLabel?: string }) => (
  <label className="relative flex min-w-0 items-baseline gap-1 px-4 py-2" style={{ background: 'var(--p3r-field)', clipPath: slantClip(10), borderBottom: `3px solid ${invalid ? P3R.magenta : P3R.cyan}` }}>
    <span className="font-cond text-[24px]" style={{ color: P3R.grey }}>{prefix}</span>
    <input inputMode="decimal" autoFocus={autoFocus} aria-label={ariaLabel} value={value} onChange={(e) => onChange(e.target.value)} placeholder="0"
      className="min-w-0 flex-1 bg-transparent font-cond text-[clamp(30px,9vw,40px)] leading-none outline-none focus-visible:outline-none tabular placeholder:opacity-30" style={{ color: P3R.blue, outline: 'none', boxShadow: 'none' }} />
  </label>
);

/** 演示态提示条（页内说明，不进截图主体）：可点切换 ?state= */
export const StateHint = ({ text }: { text: ReactNode }) => (
  <div className="mt-2 text-center text-[11px] font-bold" style={{ color: P3R.grey }}>{text}</div>
);

/** 读取中的 P3R 加载块 */
export const LoadingBlock = ({ text }: { text: string }) => (
  <div className="flex min-h-[40vh] flex-col items-center justify-center gap-4" role="status">
    <MoonPhase cycling stepMs={110} size={34} variant="line" />
    <span className="font-cond text-[13px] tracking-[0.3em]" style={{ color: P3R.roseInk }}>NOW LOADING</span>
    <span className="text-[14px] font-black" style={{ color: P3R.ink }}>{text}</span>
  </div>
);

/** 表单小标签：蓝斜片 + 粗字 + 可选旁注 */
export const FLabel = ({ children, aside, className }: { children: ReactNode; aside?: ReactNode; className?: string }) => (
  <div className={cx('flex min-w-0 items-center gap-2', className)}>
    <span aria-hidden className="h-[10px] w-[7px] shrink-0" style={{ background: P3R.blue, clipPath: tickClip }} />
    <span className="text-[13px] font-black" style={{ color: P3R.ink }}>{children}</span>
    {aside && <span className="text-[11px] font-bold" style={{ color: P3R.grey }}>{aside}</span>}
  </div>
);

/** 标签选择器（真实 Ledger TagPicker：选项 chip + 「＋新XX」输入 + 折叠「更多 N / 收起」） */
export function TagPicker({ options, value, onChange, onAdd, addPlaceholder = '新类型', collapsedCount, expanded, onToggleExpand, clearable = true }: {
  options: string[]; value: string; onChange: (v: string) => void; onAdd?: (v: string) => void; addPlaceholder?: string;
  collapsedCount?: number; expanded?: boolean; onToggleExpand?: () => void; clearable?: boolean;
}) {
  const [adding, setAdding] = useState(false);
  const [txt, setTxt] = useState('');
  const shown = collapsedCount && !expanded ? options.slice(0, collapsedCount) : options;
  const hidden = collapsedCount ? options.length - collapsedCount : 0;
  const commit = () => { const v = txt.trim(); if (v) { onAdd?.(v); onChange(v); } setTxt(''); setAdding(false); };
  return (
    <div className="flex min-w-0 flex-wrap items-center gap-1.5">
      {shown.map((o) => <Chip key={o} on={value === o} onClick={() => onChange(clearable && value === o ? '' : o)}>{o}</Chip>)}
      {collapsedCount && hidden > 0 && <Chip dashed onClick={onToggleExpand}>{expanded ? '收起' : `更多 ${hidden}`}</Chip>}
      {onAdd && (adding ? (
        <span className="inline-flex items-center gap-1" style={{ background: 'var(--p3r-field)', clipPath: slantClip(6) }}>
          <input autoFocus value={txt} onChange={(e) => setTxt(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') commit(); if (e.key === 'Escape') setAdding(false); }} onBlur={commit}
            placeholder={addPlaceholder} aria-label={addPlaceholder} className="w-24 bg-transparent px-3 py-1.5 text-[13px] font-bold outline-none" style={{ color: P3R.ink }} />
        </span>
      ) : <Chip dashed onClick={() => setAdding(true)}>＋ {addPlaceholder}</Chip>)}
    </div>
  );
}

/** 日期快选：今天 / 昨天 / 日期框 */
export function DateQuickPicker({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <div className="flex min-w-0 flex-wrap items-center gap-2">
      {([['今天', 0], ['昨天', 1]] as const).map(([lbl, n]) => { const dk = daysAgoKey(n); return <Chip key={lbl} on={value === dk} onClick={() => onChange(dk)}>{lbl}</Chip>; })}
      <input type="date" aria-label="选择日期" value={value} onChange={(e) => onChange(e.target.value || P5_TODAY)}
        className="h-8 min-w-0 px-3 font-cond text-[14px] outline-none" style={{ background: 'var(--p3r-field)', color: P3R.ink, clipPath: slantClip(6) }} />
    </div>
  );
}

/** 横条（统计用）：斜切条 scaleX 入场 */
export function BarRow({ label, amount, max, color = P3R.blue, right }: { label: ReactNode; amount: number; max: number; color?: string; right?: ReactNode }) {
  const anim = useBoldness();
  const r = max > 0 ? Math.max(0.02, Math.min(1, amount / max)) : 0;
  return (
    <div className="flex min-w-0 items-center gap-2.5">
      <span className="w-[4.5em] shrink-0 truncate text-[12px] font-black" style={{ color: P3R.ink }}>{label}</span>
      <span className="relative h-[10px] min-w-0 flex-1 overflow-hidden" style={{ background: 'var(--p3r-track)', clipPath: slantClip(3) }}>
        <motion.span className="absolute inset-y-0 left-0 w-full origin-left" style={{ background: color, clipPath: slantClip(3) }} initial={anim ? { scaleX: 0 } : false} animate={{ scaleX: r }} transition={{ duration: 0.6, ease: [0.2, 0.8, 0.2, 1] }} />
      </span>
      {right && <span className="shrink-0 font-cond text-[14px] tabular" style={{ color: P3R.ink }}>{right}</span>}
    </div>
  );
}

/** 奖杯单色字形（替代彩色 🏆） */
export const TrophyGlyph = ({ size = 14, color = 'var(--p3r-gold)' }: { size?: number; color?: string }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden fill={color} className="inline-block shrink-0 align-[-2px]"><path d="M6 2h12v3h4v3a5 5 0 0 1-5 5h-.4A6 6 0 0 1 13 16.9V19h4v3H7v-3h4v-2.1A6 6 0 0 1 7.4 13H7a5 5 0 0 1-5-5V5h4zM4 7v1a3 3 0 0 0 2 2.8V7zm16 0h-2v3.8A3 3 0 0 0 20 8z" /></svg>
);

/** 斜切金额框（月预算 / 日均 / 想省下） */
export function MoneyBox({ label, value, onChange, placeholder, accent, disabled }: { label: string; value: string; onChange: (v: string) => void; placeholder: string; accent?: boolean; disabled?: boolean }) {
  return (
    <label className={cx('flex min-w-0 cursor-text flex-col px-4 py-2', disabled && 'opacity-60')} style={{ clipPath: slantClip(10), background: accent ? P3R.blue : 'var(--p3r-field)', color: accent ? P3R.onBlue : P3R.ink, borderBottom: accent ? undefined : `3px solid ${P3R.cyan}` }}>
      <span className="text-[11px] font-black tracking-wider opacity-80">{label}</span>
      <span className="flex min-w-0 items-baseline gap-1">
        <span className="font-cond text-[16px] opacity-70">¥</span>
        <input type="text" inputMode="decimal" aria-label={label} value={value} placeholder={placeholder} disabled={disabled} onChange={(e) => onChange(e.target.value.replace(/[^\d.]/g, ''))}
          className="min-w-0 flex-1 bg-transparent font-cond text-[clamp(22px,6vw,28px)] leading-tight outline-none placeholder:opacity-40 disabled:cursor-not-allowed" style={{ color: 'inherit' }} />
      </span>
    </label>
  );
}

/** 剧情台词式说明框（P3R：墨底斜框 + 蓝 ▶ 引导符） */
export const NoteBox = ({ children, tone = 'blush' }: { children: ReactNode; tone?: 'blush' | 'ink' }) => (
  <div className="relative min-w-0 px-4 py-3 text-[14px] leading-relaxed" style={{ clipPath: slantClip(12), background: tone === 'ink' ? P3R.ink : P3R.cyanPale, color: tone === 'ink' ? 'var(--p3r-on-ink)' : P3R.ink }}>
    <span aria-hidden className="mr-1.5 inline-block h-0 w-0 border-y-[5px] border-l-[8px] border-y-transparent align-middle" style={{ borderLeftColor: P3R.blue }} />
    {children}
  </div>
);
