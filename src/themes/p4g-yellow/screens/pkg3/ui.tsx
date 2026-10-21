/**
 * pkg3 私有组件：塔罗牌（官方插槽 arcana-<id> / card-back，缺失用生成素材兜底）、
 * S.Link 状态小签、祈愿快捷键、羁绊之影徽章、四角星、问答步骤等。
 */
import { useLayoutEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import { useLowMotion } from '@yellow/lib/prefs';
import { cx } from '@yellow/lib/cx';
import { useSlot } from '@yellow/lib/slots';
import { TAROT_BY_ID, TRAIT_QUESTIONS } from './arcana';
import './pkg3.css';

import artChariot from './assets/arcana-chariot.webp';
import artLovers from './assets/arcana-lovers.webp';
import artStar from './assets/arcana-star.webp';
import artMoon from './assets/arcana-moon.webp';
import artHermit from './assets/arcana-hermit.webp';
import artSun from './assets/arcana-sun.webp';
import artJustice from './assets/arcana-justice.webp';
import artFool from './assets/arcana-fool.webp';
import cardBack from './assets/card-back.webp';
import shadowBoss from './assets/shadow-boss.webp';

export const PK3_ART: Record<string, string> = { chariot: artChariot, lovers: artLovers, star: artStar, moon: artMoon, hermit: artHermit, sun: artSun, justice: artJustice, fool: artFool };
export const PK3_CARD_BACK = cardBack;
export const PK3_SHADOW_IMG = shadowBoss;

/** P4G 四角星（菜单 / 选中 / 祈愿） */
export const SPARK_PATH = 'M12 0C13.1 6.8 17.2 10.9 24 12C17.2 13.1 13.1 17.2 12 24C10.9 17.2 6.8 13.1 0 12C6.8 10.9 10.9 6.8 12 0Z';
export function Sparkle({ size = 16, className, style, fill = 'currentColor' }: { size?: number; className?: string; style?: CSSProperties; fill?: string }) {
  return <svg viewBox="0 0 24 24" width={size} height={size} className={className} style={style} aria-hidden><path d={SPARK_PATH} fill={fill} /></svg>;
}

/** P4G S.Link 页头那朵橙色星花（asterisk flower） */
export function AsteriskFlower({ size = 64, className }: { size?: number; className?: string }) {
  return (
    <svg viewBox="-12 -12 24 24" width={size} height={size} className={className} aria-hidden>
      {Array.from({ length: 6 }, (_, i) => (
        <ellipse key={i} cx="0" cy="-6.2" rx="2.6" ry="6" fill="var(--p4g-orange)" stroke="var(--p4g-yellow-pale)" strokeWidth=".8" transform={`rotate(${i * 30})`} />
      ))}
      <circle r="2.2" fill="var(--p4g-yellow-pale)" />
    </svg>
  );
}

/** 卡面图：官方插槽优先 → 生成素材 → null（走 CSS 卡面） */
export function useArcanaArt(arcanaId: string): string | null {
  return useArcanaSrc(arcanaId).src;
}
/** official=true：用户放入了官方整张牌面（自带牌名/编号，不再叠我们的名牌） */
export function useArcanaSrc(arcanaId: string): { src: string | null; official: boolean } {
  const gen = PK3_ART[arcanaId] ?? '';
  const src = useSlot(`arcana-${arcanaId}`, gen);
  return { src: src || null, official: !!src && src !== gen };
}
export function useCardBack(): string { return useSlot('card-back', cardBack); }

export interface TarotCardProps {
  arcanaId: string;
  orientation?: 'upright' | 'reversed';
  width?: number | string;
  /** 自定义卡面（头像同步成卡面时） */
  faceUrl?: string;
  showBack?: boolean;
  labels?: boolean;
  className?: string;
  style?: CSSProperties;
  dim?: boolean;
}

/** P4G 塔罗牌：黑粗框 + 顶部罗马数字 + 底部名牌；逆位整张倒置（名牌仍正向可读） */
export function TarotCard({ arcanaId, orientation = 'upright', width = 96, faceUrl, showBack, labels = true, className, style, dim }: TarotCardProps) {
  const card = TAROT_BY_ID[arcanaId];
  const { src: art, official } = useArcanaSrc(arcanaId);
  const back = useCardBack();
  const w = typeof width === 'number' ? `${width}px` : width;
  const rev = orientation === 'reversed';
  const bands = !showBack && !faceUrl && !official && labels && !!card;
  return (
    <div className={cx('relative shrink-0 select-none', className)} style={{ width: w, aspectRatio: '1 / 1.6', containerType: 'inline-size', ...style }}>
      <div className="absolute inset-0 overflow-hidden rounded-[6%/4%] border-[3px] border-p4g-black bg-p4g-black shadow-[3px_3px_0_var(--p4g-shadow-color)]">
        {showBack ? (
          <img src={back} alt="" draggable={false} className="h-full w-full object-cover" />
        ) : faceUrl ? (
          <img src={faceUrl} alt="" draggable={false} className="h-full w-full object-cover" />
        ) : art ? (
          <img src={art} alt="" draggable={false} className={cx('absolute inset-x-0 w-full object-cover', official || !labels ? 'inset-y-0 h-full' : 'top-[13%] h-[73%]')} style={{ transform: rev ? 'rotate(180deg)' : undefined }} />
        ) : (
          <div className="relative flex h-full w-full items-center justify-center" style={{ background: 'var(--p4g-yellow)' }}>
            <img src={back} alt="" draggable={false} className="absolute inset-0 h-full w-full object-cover opacity-30" />
            <span className="relative rounded-sm border-[3px] border-p4g-black bg-p4g-black px-[8%] py-[4%] p4g-num leading-none text-p4g-yellow" style={{ fontSize: '24cqw', transform: rev ? 'rotate(180deg)' : undefined }}>{card?.roman ?? '?'}</span>
          </div>
        )}
        {bands && (
          <>
            <span className="absolute inset-x-0 top-0 flex h-[13%] items-center justify-center bg-p4g-black p4g-num leading-none text-p4g-yellow" style={{ fontSize: '12cqw' }}>{card.roman}</span>
            <span className="absolute inset-x-0 bottom-0 flex h-[14%] items-center justify-center bg-p4g-black px-1 font-display font-bold uppercase leading-none tracking-wide text-white" style={{ fontSize: '9.5cqw' }}>
              <span className="truncate">{card.nameEn.replace(/^The /, '')}</span>
            </span>
            {rev && <span className="absolute right-[6%] top-[15%] rounded-[2px] bg-p4g-red px-1 font-display font-bold leading-tight text-white" style={{ fontSize: '9cqw' }}>逆</span>}
          </>
        )}
        {dim && <span className="absolute inset-0 bg-p4g-black/45" />}
      </div>
    </div>
  );
}

/** S.Link 行内的小签（ONLINE / 逆流 / 归档 / 待回应 / 未缔结） */
export function StatusTag({ tone, children, className }: { tone: 'online' | 'decay' | 'archived' | 'waiting' | 'guest' | 'black'; children: ReactNode; className?: string }) {
  const map = {
    online: 'bg-p4g-success text-p4g-success-ink border-p4g-black night:text-p4g-black',
    decay: 'bg-p4g-danger text-[color:var(--p4g-danger-ink)] border-p4g-black',
    archived: 'bg-p4g-surface-2 text-p4g-ink-soft border-p4g-line',
    waiting: 'bg-p4g-orange text-p4g-black border-p4g-black',
    guest: 'bg-p4g-surface-2 text-p4g-ink border-dashed border-p4g-line',
    black: 'bg-p4g-black text-p4g-yellow border-p4g-black',
  } as const;
  return <span className={cx('inline-flex shrink-0 items-center whitespace-nowrap rounded-[2px] border-2 px-1.5 py-[1px] font-display text-2xs font-bold uppercase leading-tight tracking-wider', map[tone], className)}>{children}</span>;
}

/** 列表右侧 ✦ 祈愿快捷按钮（真实 PrayerQuickButton 四态） */
export function PrayQuickButton({ alreadyPrayed, waitingReciprocity, pending, onClick, className }: { alreadyPrayed: boolean; waitingReciprocity: boolean; pending: boolean; onClick: () => void; className?: string }) {
  const disabled = alreadyPrayed || pending;
  return (
    <button
      type="button"
      data-pray-button="1"
      onClick={(e) => { e.stopPropagation(); if (!disabled) onClick(); }}
      disabled={disabled}
      aria-label={alreadyPrayed ? '今日已祈愿' : '为 Ta 祈愿'}
      title={alreadyPrayed ? '今日已祈愿' : waitingReciprocity ? '回敬祈愿 · 双方 +3 SP' : '祈愿 · 双方各 +2 SP'}
      className={cx('p4g-press relative flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-sm border-3 disabled:cursor-default',
        alreadyPrayed ? 'border-p4g-line bg-p4g-surface-2 text-p4g-muted shadow-none' : waitingReciprocity ? 'border-p4g-black bg-p4g-orange text-p4g-black shadow-hard-sm' : 'border-p4g-black bg-p4g-yellow text-p4g-black shadow-hard-sm', className)}
    >
      {waitingReciprocity && !alreadyPrayed && <span aria-hidden className="pk3-pulse absolute inset-0 bg-white" />}
      {pending ? <span className="pk3-spin relative"><Sparkle size={18} /></span>
        : alreadyPrayed ? <span className="relative font-display text-body font-bold">✓</span>
        : <Sparkle size={22} className="relative" />}
    </button>
  );
}

/** ⚔️ SHADOW 徽章（ConfidantCard / 详情头） */
export function ShadowBadge({ identified, hpPct, onClick }: { identified: boolean; hpPct: number; onClick: () => void }) {
  return (
    <button type="button" data-shadow-badge onClick={(e) => { e.stopPropagation(); onClick(); }}
      title={identified ? `羁绊之影 · HP ${hpPct}%` : '羁绊之影 · 未识破'}
      className="p4g-press inline-flex shrink-0 items-center gap-1 rounded-[2px] border-2 border-p4g-black bg-p4g-black px-1.5 py-[1px] font-display text-2xs font-bold tracking-wider text-p4g-yellow night:border-p4g-yellow">
      <span aria-hidden>⚔️</span><span>SHADOW</span><span className="tabular-nums text-p4g-orange">{identified ? `${hpPct}%` : '未识破'}</span>
    </button>
  );
}

/** 一起进步 / 组织 小签（PactPartnerTag / OrgBadge 的视觉占位：文案沿用真实口径） */
export function PactTag({ text, tone = 'plain' }: { text: string; tone?: 'plain' | 'warm' | 'hot' | 'done' }) {
  const cls = tone === 'hot' ? 'bg-p4g-danger text-[color:var(--p4g-danger-ink)]' : tone === 'warm' ? 'bg-p4g-orange text-p4g-black' : tone === 'done' ? 'bg-p4g-success text-p4g-success-ink' : 'bg-p4g-surface-2 text-p4g-ink';
  return <span className={cx('inline-flex max-w-full items-center gap-1 rounded-[2px] border-2 border-p4g-line px-1.5 py-[1px] text-2xs font-bold leading-tight', cls)}><Sparkle size={9} /><span className="truncate">{text}</span></span>;
}

/**
 * 名字特效（真实 src/components/cooperation/ConfidantNameFx.tsx 的 p4 分支，FX_INK.p4 = { a:#b26a00, hi:#ffd900, max:--p4-orange }）。
 *   waiting = 今日 Ta 为你祈过、你还没回 → background-clip:text 渐变流光（200% 宽、2.6s linear 循环）；
 *   maxBond = 羁绊满级 → 名字转强调橙 + 右上三颗错开上浮的小点（2.2s，间隔 .55s）；两态同时成立时流光优先、满级色作流光基色。
 *   流光亮点往背离底色方向走：读名字本来的字色，深字（浅底：卡片 / 黄页）→ 在 #b26a00 与原字色之间流；浅字（深底：选中行 / 夜间）→ 扫到 #ffd900。
 *   低动效（真实 D0 / useBoldness=false）：两种动画都停，只留静态色。
 *   动的是 background-position（照抄真实，文字盒级别、合成器友好）+ 粒子 transform/opacity。
 */
const NAMEFX_INK = { a: '#b26a00', hi: '#ffd900', max: 'var(--p4g-orange)' } as const;
const lum = (c: string) => {
  const m = c.match(/rgba?\(([\d.]+)[ ,]+([\d.]+)[ ,]+([\d.]+)/); if (!m) return 1;
  const lin = (v: number) => { const x = v / 255; return x <= 0.03928 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4; };
  return 0.2126 * lin(+m[1]) + 0.7152 * lin(+m[2]) + 0.0722 * lin(+m[3]);
};
export function NameFx({ waiting, maxBond, children, className }: { waiting?: boolean; maxBond?: boolean; children: ReactNode; className?: string }) {
  const low = useLowMotion();
  const box = useRef<HTMLSpanElement>(null);
  const [plain, setPlain] = useState<{ color: string; onLight: boolean } | null>(null);
  const animate = !!waiting && !low;
  useLayoutEffect(() => {
    if (!animate) return;
    const read = () => { const el = box.current; if (!el) return; const color = getComputedStyle(el).color; const onLight = lum(color) < 0.3; setPlain((p) => (p && p.color === color && p.onLight === onLight ? p : { color, onLight })); };
    read();
    const t = window.setTimeout(read, 400);
    const mo = new MutationObserver(() => window.setTimeout(read, 60));
    mo.observe(document.documentElement, { attributes: true });
    if (box.current?.parentElement) mo.observe(box.current.parentElement, { attributes: true, attributeFilter: ['class', 'aria-selected', 'data-selected'] });
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
      {maxBond && !low && (
        <span aria-hidden className="pointer-events-none absolute -right-1.5 -top-1 h-3 w-3">
          {[0, 1, 2].map((i) => (
            <span key={i} className="pk3-name-spark absolute rounded-full" style={{ left: i * 4, bottom: 0, width: 3, height: 3, background: NAMEFX_INK.max, boxShadow: '0 0 0 1px var(--p4g-black)', animationDelay: `${i * 0.55}s` }} />
          ))}
        </span>
      )}
    </span>
  );
}

/** 区块小标题（消息框式） */
export function MiniLabel({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cx('mb-1.5 flex items-center gap-1.5 font-display text-cap font-bold uppercase tracking-[0.18em] text-p4g-ink-soft', className)}><span aria-hidden className="h-2.5 w-2.5 rotate-45 bg-p4g-orange" />{children}</div>;
}

/** 4 个小问题（Create / AiMatch 共用）：一题一屏，选完自动下一题 */
export function TraitQuiz({ step, answers, onAnswer, onPrev }: { step: number; answers: string[]; onAnswer: (v: string) => void; onPrev: () => void }) {
  const q = TRAIT_QUESTIONS[step];
  return (
    <div className="min-w-0">
      <div className="mb-2 flex items-center gap-2">
        <span className="rounded-[2px] bg-p4g-black px-2 py-0.5 font-display text-cap font-bold text-p4g-yellow">第 {step + 1} / {TRAIT_QUESTIONS.length} 问 · {q.short}</span>
        <div className="flex flex-1 gap-1">{TRAIT_QUESTIONS.map((_, i) => <span key={i} className={cx('h-1.5 flex-1 rounded-[1px]', i <= step ? 'bg-p4g-orange' : 'bg-[color:var(--p4g-line-soft)]')} />)}</div>
      </div>
      <p className="mb-3 font-display text-lead font-bold text-p4g-ink">{q.question}</p>
      <div className="grid grid-cols-1 gap-2">
        {q.options.map((o) => {
          const on = answers[step] === o;
          return (
            <button key={o} type="button" onClick={() => onAnswer(o)}
              className={cx('p4g-press flex min-w-0 items-center gap-2 rounded-full border-3 px-4 py-2.5 text-left text-body font-bold', on ? 'border-p4g-black bg-p4g-orange text-p4g-black shadow-hard-sm' : 'border-p4g-line bg-p4g-surface text-p4g-ink')}>
              <span aria-hidden className={cx('h-0 w-0 border-y-[6px] border-l-[9px] border-y-transparent', on ? 'border-l-p4g-black' : 'border-l-transparent')} />
              <span className="min-w-0 flex-1">{o}</span>
            </button>
          );
        })}
      </div>
      {step > 0 && <button type="button" onClick={onPrev} className="mt-3 font-display text-meta font-bold text-p4g-ink-soft underline decoration-p4g-orange decoration-2 underline-offset-4">‹ 上一题</button>}
    </div>
  );
}

/** 星象匹配中（塔罗翻动 + 文案） */
export function MatchingSpinner({ title = '星象正在翻动塔罗……', sub = '一段关系的倒影，正从 22 张牌里浮现' }: { title?: string; sub?: string }) {
  const back = useCardBack();
  return (
    <div className="flex flex-col items-center py-8 text-center">
      <div className="pk3-3d relative mb-5 h-[150px] w-[220px]">
        {[-1, 0, 1].map((i) => (
          <img key={i} src={back} alt="" className="pk3-bob absolute top-0 h-[150px] w-[94px] rounded-[6px] border-3 border-p4g-black object-cover shadow-hard"
            style={{ left: `calc(50% - 47px + ${i * 56}px)`, transform: `rotate(${i * 9}deg)`, animationDelay: `${i * 0.25}s`, zIndex: i === 0 ? 2 : 1 }} />
        ))}
        <Sparkle size={26} className="pk3-twinkle absolute -right-1 top-0 text-p4g-orange" />
        <Sparkle size={18} className="pk3-twinkle absolute -left-2 bottom-4 text-white" style={{ animationDelay: '.6s' }} />
      </div>
      <p className="font-display text-lead font-bold text-p4g-ink">{title}</p>
      <p className="mt-1 text-meta text-p4g-ink-soft">{sub}</p>
    </div>
  );
}

/** 等级 1–10 选择格（结果页 / ArcanaPicker） */
export function LevelGrid({ value, onChange, min = 1 }: { value: number; onChange: (v: number) => void; min?: number }) {
  return (
    <div className="grid grid-cols-10 gap-1">
      {Array.from({ length: 11 - min }, (_, i) => i + min).map((lv) => (
        <button key={lv} type="button" onClick={() => onChange(lv)}
          className={cx('h-9 min-w-0 rounded-[2px] border-2 p4g-num text-meta', value === lv ? 'border-p4g-black bg-p4g-black text-p4g-yellow night:bg-p4g-yellow night:text-p4g-black' : 'border-p4g-line bg-p4g-surface-2 text-p4g-ink')}>{lv}</button>
      ))}
    </div>
  );
}

/** 简单的 useState 包装：可从 ?key= 读取初值 */
export function useParam<T extends string>(params: URLSearchParams | undefined, key: string, fallback: T): [T, (v: T) => void] {
  const [v, setV] = useState<T>(((params?.get(key) as T) || fallback));
  return [v, setV];
}
