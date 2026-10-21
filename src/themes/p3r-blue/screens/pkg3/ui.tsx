/**
 * 工作包 3 私有组件（蓝白 P3R）：塔罗牌（kit TarotFace 包一层）、状态小签、祈愿快捷键、羁绊之影徽章、
 * 一起进步小签、名字闪烁、小节标题、4 个小问题、星象匹配中、等级格、在线星徽。
 * 形制参照真实 p3 分支（slantClip 斜块 / 蓝 + 臂章红角 / 青杠）；颜色只走 --p3r-*。
 */
import { useLayoutEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import { useLowMotion } from '@blue/lib/prefs';
import { P3R, TarotFace, slantClip, tickClip } from '@blue/kit';
import { cx } from '@blue/lib/cx';
import { TAROT_BY_ID, TRAIT_QUESTIONS } from './arcana';
import './pkg3.css';

/** 四角星（祈愿 / 在线星） */
export const SPARK_PATH = 'M12 0C13.1 6.8 17.2 10.9 24 12C17.2 13.1 13.1 17.2 12 24C10.9 17.2 6.8 13.1 0 12C6.8 10.9 10.9 6.8 12 0Z';
export function Sparkle({ size = 16, className, style, fill = 'currentColor' }: { size?: number; className?: string; style?: CSSProperties; fill?: string }) {
  return <svg viewBox="0 0 24 24" width={size} height={size} className={className} style={style} aria-hidden><path d={SPARK_PATH} fill={fill} /></svg>;
}

/** 在线星徽（真实 OnlineStarBadge：待回应时发光闪烁） */
export function OnlineStar({ glow, size = 13, color }: { glow?: boolean; size?: number; color?: string }) {
  return <Sparkle size={size} className={cx('shrink-0', glow && 'pk3-twinkle')} style={{ color: color ?? (glow ? P3R.magenta : P3R.blue) }} />;
}

/** 粉套塔罗（大阿卡纳程序卡面）：width 像素；dim=归档压暗；faceUrl=自定义卡面 */
export function Tarot({ arcanaId, reversed, width = 96, faceUrl, back, dim, className, glow }: { arcanaId: string; reversed?: boolean; width?: number; faceUrl?: string; back?: boolean; dim?: boolean; className?: string; glow?: boolean }) {
  const c = TAROT_BY_ID[arcanaId];
  return (
    <span className={cx('relative inline-block shrink-0', className)} style={{ width, height: Math.round(width * 1.66) }}>
      <TarotFace width={width} name={c?.name} roman={c?.roman} en={c?.nameEn.replace(/^The /, '')} reversed={reversed} back={back} src={faceUrl} glow={glow} />
      {dim && <span aria-hidden className="absolute inset-0" style={{ background: 'rgb(var(--p3r-ink-rgb) / 0.38)', clipPath: 'polygon(12px 0, 100% 0, 100% calc(100% - 12px), calc(100% - 12px) 100%, 0 100%, 0 12px)' }} />}
    </span>
  );
}

/** 行内状态小签（ONLINE / 逆流 / 归档 / 待回应 / GUEST） */
export function StatusTag({ tone, children, className }: { tone: 'online' | 'decay' | 'archived' | 'waiting' | 'guest' | 'ink'; children: ReactNode; className?: string }) {
  const skin: Record<string, CSSProperties> = {
    online: { background: P3R.cyan, color: 'var(--p3r-mulberry)' },
    decay: { background: P3R.magenta, color: '#fff' },
    archived: { background: P3R.track, color: P3R.inkSoft },
    waiting: { background: P3R.blue, color: P3R.onBlue },
    guest: { background: P3R.cyanFaint, color: P3R.roseInk },
    ink: { background: P3R.ink, color: 'var(--p3r-on-ink)' },
  };
  return <span className={cx('inline-flex shrink-0 items-center whitespace-nowrap px-2 py-[1px] font-cond text-[11px] uppercase leading-[15px]', className)} style={{ clipPath: slantClip(4), ...skin[tone] }}>{children}</span>;
}

/** ✦ 祈愿快捷键（真实 PrayerQuickButton 四态：常态 / 待回敬脉冲 / 祈愿中转圈 / 已祈愿勾） */
export function PrayQuickButton({ alreadyPrayed, waitingReciprocity, pending, onClick, className }: { alreadyPrayed: boolean; waitingReciprocity: boolean; pending: boolean; onClick: () => void; className?: string }) {
  const disabled = alreadyPrayed || pending;
  const bg = alreadyPrayed ? P3R.track : waitingReciprocity ? P3R.blue : P3R.cyanPale;
  const fg = alreadyPrayed ? P3R.grey : waitingReciprocity ? P3R.onBlue : P3R.roseInk;
  return (
    <button type="button" data-pray-button="1" onPointerDown={(e) => e.stopPropagation()} onClick={(e) => { e.stopPropagation(); if (!disabled) onClick(); }} disabled={disabled}
      aria-label={alreadyPrayed ? '今日已祈愿' : waitingReciprocity ? '回敬祈愿' : '为 Ta 祈愿'} title={alreadyPrayed ? '今日已祈愿' : waitingReciprocity ? '回敬祈愿 · 双方 +3 SP' : '祈愿 · 双方各 +2 SP'}
      className={cx('relative flex h-11 w-12 shrink-0 items-center justify-center overflow-hidden disabled:cursor-default', className)} style={{ clipPath: slantClip(8), background: bg, color: fg }}>
      {waitingReciprocity && !alreadyPrayed && <span aria-hidden className="pk3-pulse absolute inset-0 bg-white" />}
      {pending ? <span className="pk3-spin-fast relative"><Sparkle size={18} /></span> : alreadyPrayed ? <span className="relative font-cond text-[18px]">✓</span> : <Sparkle size={20} className="relative" />}
      {!alreadyPrayed && <span aria-hidden className="absolute bottom-0 right-1 h-[5px] w-[11px]" style={{ background: P3R.magenta, clipPath: tickClip }} />}
    </button>
  );
}

/** ⚔ SHADOW 徽章（ConfidantCard / 详情头） */
export function ShadowBadge({ identified, hpPct, onClick }: { identified: boolean; hpPct: number; onClick: () => void }) {
  return (
    <button type="button" data-shadow-badge onPointerDown={(e) => e.stopPropagation()} onClick={(e) => { e.stopPropagation(); onClick(); }} title={identified ? `羁绊之影 · HP ${hpPct}%` : '羁绊之影 · 未识破'}
      className="inline-flex shrink-0 items-center gap-1 px-2 py-[1px] font-cond text-[11px] leading-[15px]" style={{ clipPath: slantClip(4), background: P3R.ink, color: 'var(--p3r-on-ink)' }}>
      <span aria-hidden>⚔</span><span>SHADOW</span><span className="tabular-nums" style={{ color: 'var(--bk-bubble-a)' }}>{identified ? `${hpPct}%` : '未识破'}</span>
    </button>
  );
}

/** 一起进步 / 组织 小签（PactPartnerTag / OrgBadge 视觉，文案沿用真实口径） */
export function PactTag({ text, tone = 'plain' }: { text: string; tone?: 'plain' | 'warm' | 'hot' | 'done' }) {
  const skin: Record<string, CSSProperties> = {
    plain: { background: P3R.cyanFaint, color: P3R.roseInk },
    warm: { background: P3R.cyanPale, color: P3R.roseInk },
    hot: { background: P3R.magenta, color: '#fff' },
    done: { background: P3R.cyan, color: 'var(--p3r-mulberry)' },
  };
  return <span className="inline-flex max-w-full items-center gap-1 px-2 py-[2px] text-[10px] font-black leading-tight" style={{ clipPath: slantClip(4), ...skin[tone] }}><Sparkle size={9} /><span className="truncate">{text}</span></span>;
}

/**
 * 名字特效（真实 src/components/cooperation/ConfidantNameFx.tsx 的 p3 分支，蓝室重取色）。
 *   waiting = 今日 Ta 为你祈过、你还没回 → background-clip:text 渐变流光（200% 宽、2.6s linear 循环）；
 *   maxBond = 羁绊满级 → 名字转强调青墨 + 右上三颗错开上浮的小点（2.2s，间隔 .55s）；两态同时成立：流光优先、满级色作流光基色。
 *   流光亮点往背离底色方向走：读名字本来的字色，深字（浅底：白斜卡 / 冰白页）→ 在蓝与原字色之间流；浅字（深底：蓝选中行 / 夜间）→ 扫到冰白高光。
 *   真实 FX_INK.p3 = { a: --p3r-blue, hi: #7fe3f4（青）, max: --p3r-cyan } —— hi 是硬编码青，蓝室会出现青色流光；demo 换为冰白 #d3e0ff。
 *   低动效：两种动画都停，只留静态色。动的是 background-position + 粒子 transform/opacity。
 */
const NAMEFX_INK = { a: 'var(--p3r-blue)', hi: '#d3e0ff', max: 'var(--p3r-lilac-ink)', spark: 'var(--p3r-cyan)' } as const;
const lum = (c: string) => {
  const m = c.match(/rgba?\(([\d.]+)[ ,]+([\d.]+)[ ,]+([\d.]+)/); if (!m) return 1;
  const lin = (v: number) => { const x = v / 255; return x <= 0.03928 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4; };
  return 0.2126 * lin(+m[1]) + 0.7152 * lin(+m[2]) + 0.0722 * lin(+m[3]);
};
export function NameFx({ waiting, maxBond, children, className, paused }: { waiting?: boolean; maxBond?: boolean; children: ReactNode; className?: string; paused?: boolean }) {
  const low = useLowMotion();
  const box = useRef<HTMLSpanElement>(null);
  const [plain, setPlain] = useState<{ color: string; onLight: boolean } | null>(null);
  const animate = !!waiting && !low && !paused;
  useLayoutEffect(() => {
    if (!animate) return;
    const read = () => { const el = box.current; if (!el) return; const color = getComputedStyle(el).color; const onLight = lum(color) < 0.3; setPlain((p) => (p && p.color === color && p.onLight === onLight ? p : { color, onLight })); };
    read();
    const t = window.setTimeout(read, 400);
    const mo = new MutationObserver(() => window.setTimeout(read, 60));
    mo.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
    return () => { window.clearTimeout(t); mo.disconnect(); };
  }, [animate]);
  if (!waiting && !maxBond) return <span className={cx('min-w-0', className)}>{children}</span>;
  const base = maxBond ? NAMEFX_INK.max : undefined;
  const from = plain?.onLight ? NAMEFX_INK.a : base ?? NAMEFX_INK.a;
  const peak = plain?.onLight ? plain.color : NAMEFX_INK.hi;
  const style: CSSProperties | undefined = animate
    ? { backgroundImage: `linear-gradient(90deg, ${from} 0%, ${peak} 22%, ${from} 46%, ${peak} 70%, ${from} 100%)`, backgroundSize: '200% auto', WebkitBackgroundClip: 'text', backgroundClip: 'text', WebkitTextFillColor: 'transparent', animation: 'pk3-name-flow 2.6s linear infinite' }
    : base ? { color: base } : undefined;
  return (
    <span ref={box} className={cx('relative min-w-0 max-w-full', !/\bblock\b/.test(className ?? '') && 'inline-flex items-center', className)}>
      <span className="block min-w-0 truncate" style={style}>{children}</span>
      {maxBond && !low && !paused && (
        <span aria-hidden className="pointer-events-none absolute -right-1 -top-1 h-3 w-3">
          {[0, 1, 2].map((i) => (
            <span key={i} className="pk3-name-spark absolute" style={{ left: i * 4, bottom: 0, width: 4, height: 4, background: NAMEFX_INK.spark, clipPath: 'polygon(50% 0, 100% 50%, 50% 100%, 0 50%)', animationDelay: `${i * 0.55}s` }} />
          ))}
        </span>
      )}
    </span>
  );
}

/** 区块小标题：青斜片 + 窄体大写 */
export function MiniLabel({ children, en, className }: { children: ReactNode; en?: string; className?: string }) {
  return (
    <div className={cx('mb-1.5 flex min-w-0 items-center gap-1.5', className)}>
      <span aria-hidden className="h-[11px] w-[8px] shrink-0" style={{ background: P3R.blue, clipPath: tickClip }} />
      <span className="min-w-0 truncate text-[12px] font-black" style={{ color: P3R.ink }}>{children}</span>
      {en && <span className="shrink-0 font-cond text-[11px] uppercase" style={{ color: P3R.lilacInk }}>{en}</span>}
    </div>
  );
}

/** 面板（白斜卡 / 冰白卡） */
export function Panel({ children, tone = 'panel', className, style }: { children: ReactNode; tone?: 'panel' | 'blush' | 'ink' | 'rose'; className?: string; style?: CSSProperties }) {
  const skin: Record<string, CSSProperties> = {
    panel: { background: P3R.panel, color: P3R.ink, boxShadow: 'var(--p3r-shadow)' },
    blush: { background: P3R.cyanFaint, color: P3R.ink },
    ink: { background: P3R.ink, color: 'var(--p3r-on-ink)' },
    rose: { background: P3R.blue, color: P3R.onBlue },
  };
  return <div className={cx('min-w-0 px-4 py-3', className)} style={{ clipPath: slantClip(10), ...skin[tone], ...style }}>{children}</div>;
}

/** 4 个小问题（Create / AiMatch 共用）：一题一屏，选完自动下一题；选中项 = 光标楔 + 蓝斜条 */
export function TraitQuiz({ step, answers, onAnswer, onPrev }: { step: number; answers: string[]; onAnswer: (v: string) => void; onPrev: () => void }) {
  const q = TRAIT_QUESTIONS[step];
  return (
    <div className="min-w-0">
      <div className="mb-3 flex min-w-0 items-center gap-2">
        <span className="shrink-0 px-2.5 py-0.5 font-cond text-[12px]" style={{ background: P3R.ink, color: 'var(--p3r-on-ink)', clipPath: slantClip(5) }}>Q{step + 1} / {TRAIT_QUESTIONS.length}</span>
        <span className="shrink-0 text-[12px] font-black" style={{ color: P3R.roseInk }}>{q.short}</span>
        <div className="flex min-w-0 flex-1 gap-1">{TRAIT_QUESTIONS.map((_, i) => <span key={i} className="h-[6px] min-w-0 flex-1" style={{ clipPath: slantClip(3), background: i <= step ? P3R.blue : 'var(--p3r-track)' }} />)}</div>
      </div>
      <p className="mb-3 font-heavy text-[19px] leading-snug" style={{ color: P3R.ink }}>{q.question}</p>
      <div className="grid grid-cols-1 gap-2">
        {q.options.map((o) => {
          const on = answers[step] === o;
          return (
            <button key={o} type="button" onClick={() => onAnswer(o)} className="relative flex min-w-0 items-center gap-2 py-2.5 pl-5 pr-4 text-left text-[14px] font-black"
              style={{ clipPath: slantClip(10), background: on ? P3R.blue : P3R.panel, color: on ? P3R.onBlue : P3R.ink, boxShadow: on ? undefined : 'var(--p3r-shadow)' }}>
              <span aria-hidden className="h-0 w-0 shrink-0 border-y-[6px] border-l-[9px] border-y-transparent" style={{ borderLeftColor: on ? 'var(--p3r-on-blue)' : 'transparent' }} />
              <span className="min-w-0 flex-1">{o}</span>
              {on && <span aria-hidden className="absolute bottom-0 right-3 h-[6px] w-[14px]" style={{ background: P3R.magenta, clipPath: tickClip }} />}
            </button>
          );
        })}
      </div>
      {step > 0 && <button type="button" onClick={onPrev} className="mt-3 text-[13px] font-black" style={{ color: P3R.roseInk }}>‹ 上一题</button>}
    </div>
  );
}

/** 星象匹配中：三张牌背上下浮 + 两圈水波 + 文案 */
export function MatchingSpinner({ title = '星象正在翻动塔罗……', sub = '一段关系的倒影，正从 22 张牌里浮现' }: { title?: string; sub?: string }) {
  return (
    <div className="flex flex-col items-center py-6 text-center" role="status" aria-live="polite">
      <div className="relative mb-5 h-[150px] w-[220px]">
        <svg aria-hidden viewBox="0 0 220 150" className="absolute inset-0 h-full w-full overflow-visible">
          {[0, 1].map((i) => <circle key={i} cx="110" cy="75" r={56 + i * 22} fill="none" stroke={i ? 'var(--p3r-blue)' : 'var(--p3r-cyan)'} strokeWidth={i ? 3 : 2} strokeDasharray={i ? '0' : '4 6'} opacity={0.4} className="pk3-twinkle" style={{ animationDelay: `${i * 0.4}s`, transformOrigin: '110px 75px' }} />)}
        </svg>
        {[-1, 0, 1].map((i) => (
          <span key={i} className="pk3-bob absolute top-1" style={{ left: `calc(50% - 40px + ${i * 52}px)`, transform: `rotate(${i * 9}deg)`, animationDelay: `${i * 0.25}s`, zIndex: i === 0 ? 2 : 1 }}>
            <span className="block" style={{ transform: `rotate(${i * 9}deg)` }}><TarotFace back width={80} /></span>
          </span>
        ))}
        <Sparkle size={24} className="pk3-twinkle absolute -right-1 top-0" style={{ color: P3R.magenta }} />
        <Sparkle size={16} className="pk3-twinkle absolute -left-2 bottom-4" style={{ color: P3R.cyan, animationDelay: '.6s' }} />
      </div>
      <p className="font-heavy text-[18px]" style={{ color: P3R.ink }}>{title}</p>
      <p className="mt-1 text-[12px]" style={{ color: P3R.grey }}>{sub}</p>
    </div>
  );
}

/** 等级 1–10 选择格（结果页 / ArcanaPicker） */
export function LevelGrid({ value, onChange, min = 1 }: { value: number; onChange: (v: number) => void; min?: number }) {
  return (
    <div className="grid grid-cols-5 gap-1.5 min-[420px]:grid-cols-10">
      {Array.from({ length: 11 - min }, (_, i) => i + min).map((lv) => (
        <button key={lv} type="button" onClick={() => onChange(lv)} aria-pressed={value === lv} className="h-9 min-w-0 font-cond text-[16px]"
          style={{ clipPath: slantClip(6), background: value === lv ? P3R.blue : P3R.cyanFaint, color: value === lv ? P3R.onBlue : P3R.ink }}>{lv}</button>
      ))}
    </div>
  );
}

/** 参数读初值 */
export function useParam<T extends string>(params: URLSearchParams | undefined, key: string, fallback: T): [T, (v: T) => void] {
  const [v, setV] = useState<T>(((params?.get(key) as T) || fallback));
  return [v, setV];
}

/** 段落小字（日夜高对比） */
export const Sub = ({ children, className }: { children: ReactNode; className?: string }) => <p className={cx('text-[12px] leading-relaxed', className)} style={{ color: P3R.grey }}>{children}</p>;
