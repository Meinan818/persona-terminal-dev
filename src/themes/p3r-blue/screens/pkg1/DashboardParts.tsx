/**
 * 首页（DashboardP3）区块件 —— 每块对照真实文件 p3 分支：
 *   SkyBadge / MoonPhase（DashboardP3#SkyBadge · #MoonPhase · sky/useSkyBadge）
 *   StackCarousel（components/StackCarousel：Embla → framer 拖拽改写，非激活卡 scale .84 / opacity .4 渐隐、圆点、autoPlay、跳页指令）
 *   RitualSlab（DashboardP3#RitualSlab）· BattleSlab（BattleDashboardWidget 非 p4/p5 分支的 P3R 重画）
 *   BigDealHomeCard（bigdeal/BigDealHomeCard p3 皮）· AttrDetailInline（DashboardP3#AttrDetailInline）
 *   TitleTriWobble（kit TitleTri wobble：顶点沸腾）· BgAnimLayer（BackgroundAnimation 四种 + 背景图片）· OverlayByKey（在本页原地挂其它包登记的弹窗）
 */
import { animate, AnimatePresence, motion, useMotionValue, useTransform, type MotionValue } from 'framer-motion';
import { Suspense, useEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import type { AttributeId } from '@/types';
import { useBoldness } from '@blue/lib/prefs';
import { useSkyBadge } from '@/components/sky/useSkyBadge';
import { P3R, slantClip, showToast } from '@blue/kit';
import { OVERLAYS } from '@blue/registry/overlays';
import { lazyOf } from '@blue/shell/lazyRegistry';
import duskImg from '@blue/assets/blue/p3-water-wide.png';
import { LEVEL_THRESHOLDS, MAX_LEVEL, MOCK_ATTRS, MOCK_WEATHER, levelTitle, masteryOf, masteryTitle, moonPhaseOf, relatedAchievements, daysUntil, type MockTodo } from '@blue/adapters/pkg1';
import { TRI_CLIP, TRI_PATH } from './fxbits';

/* ─────────── 天空位：月相 ⇄ 天气 ─────────── */
const moonLitPath = (phase: number, r: number, c: number) => {
  const rx = Math.max(0.01, Math.abs(Math.cos(2 * Math.PI * phase)) * r);
  const outer = phase < 0.5 ? 1 : 0;
  const term = phase > 0.25 && phase < 0.75 ? outer : 1 - outer;
  return `M ${c} ${c - r} A ${r} ${r} 0 0 ${outer} ${c} ${c + r} A ${rx} ${r} 0 0 ${term} ${c} ${c - r} Z`;
};
const Corner = () => <span aria-hidden className="absolute right-[3px] top-[3px] h-[7px] w-[9px]" style={{ background: P3R.magenta, clipPath: TRI_CLIP }} />;

export const MoonPhase = ({ date }: { date: Date }) => {
  const { phase, name, illum, full } = moonPhaseOf(date);
  const anim = useBoldness();
  const pctV = Math.round(illum * 100);
  const mv = useMotionValue(anim ? 0 : pctV);
  const txt = useTransform(mv, (v) => `${Math.round(v)}`);
  useEffect(() => { if (!anim) { mv.set(pctV); return; } const c = animate(mv, pctV, { duration: 0.9, ease: 'easeOut', delay: 0.25 }); return () => c.stop(); }, [anim, pctV, mv]);
  const waxing = phase < 0.5;
  return (
    <span className="ml-0.5 flex items-center gap-2" role="img" aria-label={`月相 ${name}，亮面 ${pctV}%`}>
      <span className="relative flex h-11 w-12 shrink-0 items-center justify-center" style={{ background: P3R.cyanFaint, clipPath: slantClip(8) }}>
        <svg viewBox="0 0 36 36" className="h-8 w-8" aria-hidden>
          <circle cx="18" cy="18" r="15" fill="var(--p3r-mulberry)" />
          <motion.path d={moonLitPath(phase, 15, 18)} fill={full ? 'var(--p3r-gold)' : P3R.cyan}
            initial={anim ? { clipPath: waxing ? 'inset(0% 0% 0% 100%)' : 'inset(0% 100% 0% 0%)', opacity: 0.4 } : false}
            animate={{ clipPath: 'inset(0% 0% 0% 0%)', opacity: 1 }} transition={{ duration: 0.8, ease: [0.3, 0, 0.2, 1], delay: 0.2 }} />
          <circle cx="18" cy="18" r="15" fill="none" stroke="rgb(var(--p3r-blue-rgb) / 0.35)" strokeWidth="1.5" />
        </svg>
        <Corner />
      </span>
      <span className="flex flex-col gap-1 leading-none">
        <span className="text-[13px] font-black" style={{ color: P3R.ink }}>{name}</span>
        <span className="text-[9px] font-black tracking-[0.16em]" style={{ color: P3R.roseInk }}>LUNAR <motion.span>{txt}</motion.span>%</span>
      </span>
    </span>
  );
};

/** 单色天气图形（真实 WeatherGlyph：双色 SVG，不用 emoji） */
const WeatherGlyph = ({ kind }: { kind: 'cloud' | 'none' }) => (
  <svg viewBox="0 0 24 24" width={24} height={24} aria-hidden>
    {kind === 'cloud' ? (
      <>
        <circle cx="9" cy="9" r="4" fill={P3R.blue} />
        <path d="M7 19h10a4 4 0 0 0 .4-8 5.5 5.5 0 0 0-10.4 1.6A3.2 3.2 0 0 0 7 19Z" fill="var(--p3r-ink)" />
      </>
    ) : (
      <path d="M12 3v3M12 18v3M3 12h3M18 12h3M5.6 5.6l2.1 2.1M16.3 16.3l2.1 2.1M5.6 18.4l2.1-2.1M16.3 7.7l2.1-2.1" stroke="var(--p3r-ink)" strokeWidth="2" strokeLinecap="round" />
    )}
  </svg>
);
export type WeatherState = 'ok' | 'unset' | 'config' | 'error' | 'loading';
export const SkyBadge = ({ date, initial = 'moon', weather = 'ok' }: { date: Date; initial?: 'moon' | 'weather'; weather?: WeatherState }) => {
  const live = useSkyBadge();
  const mode = live.mode;
  const toggle = live.toggle;
  const liveState: WeatherState = !live.ready ? 'unset' : live.loading ? 'loading' : live.error ? (live.errorKind === 'config' ? 'config' : 'error') : 'ok';
  const state = weather !== 'ok' ? weather : liveState;
  const temp = live.weather?.temp ?? MOCK_WEATHER.temp;
  const text = live.weather?.text ?? MOCK_WEATHER.text;
  const feels = live.weather?.feelsLike ?? MOCK_WEATHER.feelsLike;
  if (mode === 'weather') {
    const main = state === 'unset' ? '去设置天气' : state === 'config' ? '天气设置有误' : state === 'error' ? '天气取不到' : state === 'loading' ? '取数中…' : `${temp}°C ${text}`;
    const sub = state === 'unset' || state === 'config' ? 'SET UP' : state === 'error' ? 'RETRY' : `FEELS ${state === 'loading' ? '--' : feels}°`;
    return (
      <button type="button" onClick={toggle} aria-label="天气（点击切回月相）" className="ml-0.5 flex min-w-0 items-center gap-2 text-left">
        <span className="relative flex h-11 w-12 shrink-0 items-center justify-center" style={{ background: P3R.cyanFaint, clipPath: slantClip(8) }}>
          <WeatherGlyph kind={state === 'ok' || state === 'loading' ? 'cloud' : 'none'} />
          <Corner />
        </span>
        <span className="flex min-w-0 flex-col gap-1 leading-none">
          <span className="truncate text-[13px] font-black" style={{ color: P3R.ink }}>{main}</span>
          <span className="text-[9px] font-black tracking-[0.16em]" style={{ color: P3R.roseInk }}>{sub}</span>
        </span>
      </button>
    );
  }
  return <button type="button" onClick={toggle} aria-label="月相（点击切到天气）" className="text-left"><MoonPhase date={date} /></button>;
};

/* ─────────── StackCarousel ─────────── */
const SCALE_MIN = 0.84, OPACITY_MIN = 0.4;
const Slide = ({ x, index, w, gap, anim, hidden, children }: { x: MotionValue<number>; index: number; w: number; gap: number; anim: boolean; hidden?: boolean; children: ReactNode }) => {
  const dist = useTransform(x, (v) => (w ? Math.min(1, Math.abs(v + index * (w + gap)) / (w + gap)) : 0));
  const scale = useTransform(dist, (d) => (anim ? 1 - (1 - SCALE_MIN) * d : 1));
  const opacity = useTransform(dist, (d) => (anim ? 1 - (1 - OPACITY_MIN) * d : 1));
  return (
    <div className="min-w-0 flex-none" aria-hidden={hidden || undefined} style={{ width: w || '100%' }}>
      <motion.div className="h-full" style={{ scale, opacity }}>{children}</motion.div>
    </div>
  );
};
export const StackCarousel = ({ children, page, autoPlayMs = 6000, onPageChange, className }: { children: ReactNode[]; page?: number; autoPlayMs?: number; onPageChange?: (i: number) => void; className?: string }) => {
  const anim = useBoldness();
  const box = useRef<HTMLDivElement>(null);
  const [w, setW] = useState(0);
  const gap = 12;
  const n = children.length;
  const [idx, setIdx] = useState(Math.min(page ?? 0, n - 1));
  const x = useMotionValue(0);
  const paused = useRef(false);
  useEffect(() => {
    const el = box.current; if (!el) return;
    const ro = new ResizeObserver(() => setW(el.clientWidth)); ro.observe(el); setW(el.clientWidth);
    return () => ro.disconnect();
  }, []);
  const go = (i: number, instant = false) => {
    const t = Math.max(0, Math.min(n - 1, i));
    setIdx(t); onPageChange?.(t);
    if (instant || !anim) x.set(-t * (w + gap)); else animate(x, -t * (w + gap), { type: 'spring', stiffness: 320, damping: 36 });
  };
  useEffect(() => { go(idx, true); }, [w]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { if (page != null && page !== idx) go(page); }, [page]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (!autoPlayMs || !anim || n < 2) return;
    const t = window.setInterval(() => { if (!paused.current && !document.hidden) go(idx + 1 >= n ? 0 : idx + 1); }, autoPlayMs);
    return () => clearInterval(t);
  }, [autoPlayMs, anim, n, idx, w]); // eslint-disable-line react-hooks/exhaustive-deps
  return (
    <div className={className}>
      <div ref={box} data-qa-allow-clip className="overflow-hidden" onPointerDown={() => { paused.current = true; }} onPointerUp={() => { paused.current = false; }} onPointerCancel={() => { paused.current = false; }}>
        <motion.div className="flex items-stretch" style={{ x, gap, touchAction: 'pan-y' }} drag={n > 1 ? 'x' : false} dragMomentum={false}
          dragConstraints={{ left: -(n - 1) * (w + gap) - 40, right: 40 }} dragElastic={0.12}
          onDragEnd={(_, info) => { const d = info.offset.x + info.velocity.x * 0.2; go(d < -w * 0.18 ? idx + 1 : d > w * 0.18 ? idx - 1 : idx); }}>
          {children.map((c, i) => <Slide key={i} x={x} index={i} w={w} gap={gap} anim={anim} hidden={i !== idx}>{c}</Slide>)}
        </motion.div>
      </div>
      {n > 1 && (
        <div className="mt-2 flex items-center justify-center gap-1.5" role="tablist" aria-label="切换">
          {children.map((_, i) => (
            <button key={i} type="button" role="tab" aria-selected={i === idx} aria-label={`第 ${i + 1} 张`} onClick={() => go(i)} className="flex h-6 items-center px-0.5">
              <motion.span className="block h-[6px]" animate={{ width: i === idx ? 22 : 8 }} transition={{ type: 'spring', stiffness: 500, damping: 34 }}
                style={{ background: i === idx ? P3R.blue : 'rgb(var(--p3r-cyan-rgb) / 0.45)', clipPath: slantClip(3) }} />
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

/* ─────────── 仪式斜条 ─────────── */
export const RitualSlab = ({ icon, title, sub, onClick, accent, ariaLabel }: { icon: ReactNode; title: ReactNode; sub?: ReactNode; onClick?: () => void; accent?: string; ariaLabel?: string }) => (
  <button type="button" onClick={onClick} aria-label={ariaLabel} className="flex h-full min-h-[76px] w-full items-center gap-3 px-5 py-3.5 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--p3r-blue)]"
    style={{ clipPath: slantClip(12), background: P3R.cyanPale }}>
    <span aria-hidden className="h-9 w-[4px] shrink-0" style={{ background: accent ?? P3R.blue, transform: 'skewX(-9deg)' }} />
    <span aria-hidden className="flex shrink-0 items-center text-xl leading-none">{icon}</span>
    <span className="min-w-0 flex-1">
      <span className="block truncate text-[15px] font-black" style={{ color: P3R.ink }}>{title}</span>
      {sub && <span className="mt-0.5 block truncate text-[12px] font-semibold" style={{ color: P3R.inkSoft }}>{sub}</span>}
    </span>
    <span aria-hidden className="shrink-0 text-lg font-black" style={{ color: P3R.blue }}>›</span>
  </button>
);
/** 波浪单色字形（替代 🌊 emoji） */
export const WaveGlyph = ({ color = 'var(--p3r-magenta)' }: { color?: string }) => (
  <svg viewBox="0 0 24 24" width={24} height={24} aria-hidden><path d="M2 15c2.5 0 2.5-2 5-2s2.5 2 5 2 2.5-2 5-2 2.5 2 5 2M2 19.5c2.5 0 2.5-2 5-2s2.5 2 5 2 2.5-2 5-2 2.5 2 5 2M5 10.5c1-3.5 4-6 8-6 2.5 0 4.6 1 6 2.6-2.6-.4-4.8.9-5.3 3.4" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" /></svg>
);
export const MoonGlyph = () => (<svg viewBox="0 0 24 24" className="h-6 w-6" aria-hidden><path d="M20.5 15.2A9 9 0 1 1 9.2 3.8a7.2 7.2 0 0 0 11.3 11.4Z" fill="var(--p3r-gold)" /></svg>);
export const HourglassGlyph = ({ color = P3R.blue }: { color?: string }) => (
  <svg viewBox="0 0 24 24" width={22} height={22} aria-hidden><path d="M6 3h12v2.2c0 2.4-1.6 4.5-3.6 5.6L13 12l1.4 1.2c2 1.1 3.6 3.2 3.6 5.6V21H6v-2.2c0-2.4 1.6-4.5 3.6-5.6L11 12 9.6 10.8C7.6 9.7 6 7.6 6 5.2V3Zm2 2v.2c0 1.6 1.1 3.1 2.6 3.9l1.4.8 1.4-.8C14.9 8.3 16 6.8 16 5.2V5H8Zm4 9.1-1.4.8C9.1 15.7 8 17.2 8 18.8v.2h8v-.2c0-1.6-1.1-3.1-2.6-3.9L12 14.1Z" fill={color} /></svg>
);

/** 逆影战场入口（BattleDashboardWidget：唤醒 Persona / 区层显形 / 交战中；影时间 = 深蓝夜幅 + 扫描线 + 呼吸徽） */
export type BattleState = 'wake' | 'reveal' | 'fight';
export const BattleSlab = ({ state = 'fight', shadowTime = false, onClick, persona }: { state?: BattleState; shadowTime?: boolean; onClick?: () => void; persona: string }) => {
  const dark = shadowTime;
  const ink = dark ? '#fff' : P3R.ink;
  return (
    <motion.button type="button" whileTap={{ scale: 0.98 }} onClick={onClick} aria-label={shadowTime ? '逆影战场：影时间进行中' : '逆影战场'}
      className="relative flex h-full min-h-[76px] w-full items-center gap-3 overflow-hidden px-5 py-3 text-left"
      style={{ clipPath: slantClip(12), background: dark ? 'linear-gradient(135deg, #0a0f1b 0%, #1a284a 55%, #11182a 100%)' : P3R.cyanPale }}>
      {dark && <span aria-hidden className="pointer-events-none absolute inset-0" style={{ background: 'repeating-linear-gradient(0deg, rgba(255,255,255,0.06) 0 1px, transparent 1px 4px)' }} />}
      <span aria-hidden className="h-9 w-[4px] shrink-0" style={{ background: P3R.magenta, transform: 'skewX(-9deg)' }} />
      <svg viewBox="0 0 24 24" width={24} height={24} aria-hidden className="relative shrink-0"><path d="M4 3l7 7-2 2-7-7V3h2Zm16 0v2l-9.6 9.6 1.4 1.4-1.4 1.4-1.8-1.8L5 19l-2 2-1-1 2-2 3.4-3.6-1.8-1.8L7 11.2l1.4 1.4L18 3h2Z" fill={dark ? 'var(--bk-bubble-a)' : P3R.blue} /></svg>
      <span className="relative min-w-0 flex-1">
        <span className="block text-[10px] font-black tracking-widest" style={{ color: dark ? 'var(--bk-bubble-a)' : P3R.lilacInk }}>逆影战场</span>
        <span className="mt-0.5 flex min-w-0 items-center gap-1.5">
          {state === 'wake' ? <span className="truncate text-[14px] font-bold" style={{ color: dark ? 'rgba(255,255,255,0.7)' : P3R.inkSoft }}>唤醒 Persona →</span> : (
            <>
              <span className="truncate text-[14px] font-black" style={{ color: ink }}>{persona}</span>
              {state === 'reveal' ? <span className="shrink-0 text-[13px] font-bold" style={{ color: dark ? 'rgba(255,255,255,0.6)' : P3R.inkSoft }}>· 区层显形 →</span> : (
                <>
                  <span className="shrink-0 px-1.5 py-0.5 text-[10px] font-black" style={{ background: 'rgb(var(--p3r-cyan-rgb) / 0.25)', color: dark ? '#d8f7ff' : P3R.lilacInk, clipPath: slantClip(3) }}>SP 42</span>
                  <span className="min-w-0 truncate text-[11px] font-bold" style={{ color: dark ? 'rgba(255,255,255,0.65)' : P3R.inkSoft }}>塔尔塔罗斯</span>
                  <span className="shrink-0 px-1 text-[10px] font-black tabular" style={{ background: 'var(--bk-danger-wash)', color: 'var(--p3r-coral-ink)' }}>27F</span>
                  <span className="relative h-1.5 w-10 shrink-0 overflow-hidden" style={{ background: dark ? 'rgba(255,255,255,0.12)' : 'var(--p3r-track)' }}><span className="absolute inset-y-0 left-0 w-[62%]" style={{ background: P3R.magenta }} /></span>
                </>
              )}
            </>
          )}
        </span>
      </span>
      {shadowTime ? (
        <motion.span className="relative shrink-0 px-2 py-1 text-[11px] font-black" style={{ background: P3R.magenta, color: '#fff', clipPath: slantClip(4) }} animate={{ scale: [1, 1.06, 1] }} transition={{ duration: 1.6, repeat: Infinity }}>影时间</motion.span>
      ) : <span className="relative shrink-0 text-[10px] font-black" style={{ color: P3R.grey }}>20:00 显形</span>}
    </motion.button>
  );
};

/* ─────────── BIG DEAL 聚合卡 ─────────── */
export const BigDealHomeCard = ({ todo, onOpen, highlight }: { todo: MockTodo; onOpen: () => void; highlight?: boolean }) => {
  const steps = todo.steps ?? [];
  const done = steps.filter((s) => s.done).length;
  const total = steps.length;
  const pct = total ? Math.round((done / total) * 100) : 0;
  const next = steps.find((s) => !s.done);
  const dl = todo.deadline ? daysUntil(todo.deadline) : null;
  return (
    <motion.button type="button" whileTap={{ scale: 0.985 }} onClick={onOpen} aria-label="管理这件大事"
      className="relative mb-1 w-full overflow-hidden p-4 text-left"
      style={{ background: P3R.panelGlass, clipPath: 'polygon(0 6%, 100% 0, 99% 100%, 1% 100%)', boxShadow: highlight ? 'inset 0 0 0 2px var(--p3r-blue)' : undefined }}>
      <span aria-hidden className="pointer-events-none absolute bottom-0 right-[8%] h-[8px] w-[18px]" style={{ background: P3R.magenta, clipPath: TRI_CLIP }} />
      <div className="flex flex-wrap items-center gap-1.5">
        <span className="px-2 py-0.5 font-cond text-[10px] tracking-wider" style={{ background: 'rgb(var(--p3r-blue-rgb) / 0.12)', color: P3R.roseInk, clipPath: slantClip(4) }}>BIG DEAL</span>
        {dl !== null && <span className="text-[10px] font-bold" style={{ color: dl <= 2 ? 'var(--p3r-coral-ink)' : P3R.inkSoft }}>{dl > 0 ? `剩 ${dl} 天` : dl === 0 ? '今天截止' : '已过截止'}</span>}
      </div>
      <h4 className="mt-1 truncate text-[15px] font-black" style={{ color: P3R.ink }}>{todo.title}</h4>
      <div className="mt-2.5">
        <div className="mb-1 flex items-center justify-between text-[10px]" style={{ color: P3R.inkSoft }}><span>总进度</span><span className="font-bold tabular">{done}/{total}</span></div>
        <div className="h-1.5 overflow-hidden" style={{ background: 'var(--p3r-track)', clipPath: slantClip(2) }}>
          <motion.div className="h-full" style={{ background: P3R.blue }} initial={false} animate={{ width: `${pct}%` }} transition={{ duration: 0.5, ease: 'easeOut' }} />
        </div>
      </div>
      <div className="mt-2 flex items-center gap-1.5 text-xs" style={{ color: next ? P3R.ink : P3R.inkSoft }}>
        <span aria-hidden className="h-0 w-0 border-y-[4px] border-l-[7px] border-y-transparent" style={{ borderLeftColor: P3R.blue, opacity: next ? 1 : 0.4 }} />
        <span className="min-w-0 truncate font-bold">{total === 0 ? '去拆第一步' : next ? `下一步：${next.title}` : '全部完成——进去收官'}</span>
      </div>
    </motion.button>
  );
};

/* ─────────── 原地属性详情 ─────────── */
export const AttrDetailInline = ({ attrId, onBack }: { attrId: AttributeId; onBack: () => void }) => {
  const attr = MOCK_ATTRS.find((a) => a.id === attrId)!;
  const level = attr.level;
  const isMax = level >= MAX_LEVEL;
  const cur = level > 1 ? LEVEL_THRESHOLDS[level - 1] : 0;
  const nxt = !isMax ? LEVEL_THRESHOLDS[level] : LEVEL_THRESHOLDS[MAX_LEVEL - 1];
  const mastery = isMax ? masteryOf(attr.points) : null;
  const stars = mastery?.stars ?? 0;
  const progress = mastery ? mastery.progress : isMax ? 1 : Math.max(0, Math.min(1, (attr.points - cur) / Math.max(1, nxt - cur)));
  const pLabel = isMax ? (mastery ? `精通 ★${stars} · 距下一颗` : '已达最高等级') : `距 Lv.${level + 1}`;
  const pValue = isMax ? (mastery ? `${mastery.step - mastery.toNext}/${mastery.step}` : 'MAX') : `${attr.points - cur}/${nxt - cur}`;
  const title = stars > 0 ? masteryTitle(attrId, stars) : levelTitle(attrId, level);
  const related = relatedAchievements(attrId).filter((a) => a.attribute === attrId);
  const relatedAll = relatedAchievements(attrId);
  const container = { show: { transition: { staggerChildren: 0.06, delayChildren: 0.03 } }, hide: { transition: { staggerChildren: 0.05, staggerDirection: -1 as const } } };
  const fromLeft = { hide: { x: '-116%' }, show: { x: '0%' } };
  const fromRight = { hide: { x: '118%' }, show: { x: '0%' } };
  const spring = { type: 'spring' as const, stiffness: 250, damping: 26 };
  const row = (current: boolean, reached: boolean): CSSProperties => ({ background: current ? P3R.blue : reached ? 'rgb(var(--p3r-wash) / 0.7)' : 'transparent', clipPath: current || reached ? slantClip(6) : undefined, color: current ? 'var(--p3r-on-blue)' : reached ? P3R.ink : P3R.grey });
  return (
    <motion.div className="relative z-10 cursor-pointer pb-2 pt-1" onClick={onBack} variants={container} initial="hide" animate="show" exit="hide">
      <motion.div className="relative origin-top-left" initial={{ x: '34%', y: 44, scale: 0.56 }}
        animate={{ x: ['34%', '9%', '0%'], y: [44, -10, 0], scale: [0.56, 0.94, 1], transition: { duration: 0.5, ease: [0.4, 0, 0.2, 1], times: [0, 0.58, 1] } }}
        exit={{ opacity: 0, transition: { duration: 0.2 } }}>
        <div className="font-heavy text-[52px] leading-none" style={{ color: P3R.ink }}>{attr.name}</div>
        <div className="mt-2.5 flex flex-wrap items-center gap-2.5">
          <span className="relative inline-flex items-baseline gap-1 px-4 py-1" style={{ clipPath: slantClip(8), background: P3R.blue, color: 'var(--p3r-on-blue)' }}>
            <span className="text-[11px] font-black tracking-wider opacity-85">LV</span>
            <span className="font-cond text-[21px] leading-none tabular">{level}{stars > 0 && <span className="ml-0.5 text-[11px] not-italic">★{stars}</span>}</span>
          </span>
          <span className="text-[16px] font-black" style={{ color: P3R.ink }}>{title}</span>
          <span className="ml-auto text-[12px] font-bold tabular" style={{ color: P3R.grey }}>{attr.points} pt</span>
        </div>
      </motion.div>
      <motion.div className="relative mt-4" variants={fromRight} transition={spring}>
        <div className="mb-1 flex items-baseline justify-between text-[11px] font-black" style={{ color: P3R.roseInk }}><span>{pLabel}</span><span className="tabular">{pValue}</span></div>
        <div className="relative h-[10px] w-full overflow-hidden" style={{ background: 'rgb(var(--p3r-wash) / 0.85)', clipPath: slantClip(3) }}>
          <div className="absolute inset-y-0 left-0" style={{ width: `${progress * 100}%`, background: `linear-gradient(90deg, ${P3R.blue}, ${P3R.cyan})`, clipPath: slantClip(3) }} />
        </div>
      </motion.div>
      <motion.div className="relative mt-4" variants={fromRight} transition={spring}>
        <div className="mb-1.5 text-[12px] font-black" style={{ color: P3R.inkSoft }}>称号阶梯</div>
        <div className="space-y-1">
          {Array.from({ length: MAX_LEVEL }, (_, i) => {
            const lv = i + 1; const reached = level >= lv; const current = level === lv;
            return (
              <div key={lv} className="flex items-center gap-2.5 px-3 py-1.5 text-[13px]" style={row(current, reached)}>
                <span className="w-9 shrink-0 text-[11px] font-black tabular">Lv.{lv}</span>
                <span className="min-w-0 flex-1 truncate font-bold">{levelTitle(attrId, lv)}</span>
                {current && <span className="shrink-0 text-[10px] font-black">‹ 现在</span>}
                {!reached && <span className="shrink-0 text-[10px] tabular">{LEVEL_THRESHOLDS[i]} pt</span>}
              </div>
            );
          })}
        </div>
      </motion.div>
      {mastery && (
        <motion.div className="relative mt-4" variants={fromRight} transition={spring}>
          <div className="mb-1.5 text-[12px] font-black" style={{ color: P3R.inkSoft }}>精通 · 每 {mastery.step} 点一颗星</div>
          <div className="space-y-1">
            {Array.from({ length: stars + 1 }, (_, k) => k + 1).map((k) => {
              const reached = k <= stars; const current = k === stars && reached;
              return (
                <div key={k} className="flex items-center gap-2.5 px-3 py-1.5 text-[13px]" style={row(current, reached)}>
                  <span className="w-9 shrink-0 text-[11px] font-black tabular">★{k}</span>
                  <span className="min-w-0 flex-1 truncate font-bold">{masteryTitle(attrId, k)}</span>
                  {current && <span className="shrink-0 text-[10px] font-black">‹ 现在</span>}
                  {!reached && <span className="shrink-0 text-[10px] tabular">还差 {mastery.toNext} pt</span>}
                </div>
              );
            })}
          </div>
        </motion.div>
      )}
      <motion.div className="relative mt-4" variants={fromRight} transition={spring}>
        <div className="mb-1.5 text-[12px] font-black" style={{ color: P3R.inkSoft }}>关联成就（{relatedAll.filter((a) => a.unlocked).length}/{relatedAll.length}）</div>
        {related.length === 0 ? (
          <div className="px-3 py-4 text-center text-[12px] font-semibold" style={{ background: 'rgb(var(--p3r-wash) / 0.5)', clipPath: slantClip(8), color: P3R.grey }}>这个方向还没有专属成就</div>
        ) : (
          <div className="no-scrollbar flex gap-2 overflow-x-auto pb-1" style={{ touchAction: 'pan-x' }} onClick={(e) => e.stopPropagation()}>
            {relatedAll.map((a) => (
              <div key={a.id} className="flex w-[124px] shrink-0 select-none flex-col gap-1 px-3 py-2.5" style={{ background: a.unlocked ? 'rgb(var(--p3r-cyan-rgb) / 0.16)' : 'rgb(var(--p3r-wash) / 0.4)', clipPath: slantClip(8), opacity: a.unlocked ? 1 : 0.72 }}>
                <div className="flex items-center justify-between">
                  <span className="text-lg leading-none" aria-hidden style={{ color: P3R.blue }}>{a.icon}</span>
                  <span className="shrink-0 text-[9px] font-black" style={{ color: a.unlocked ? 'var(--p3r-coral-ink)' : P3R.grey }}>{a.unlocked ? '已解锁' : '未解锁'}</span>
                </div>
                <div className="truncate text-[12px] font-black" style={{ color: P3R.ink }}>{a.title}</div>
                <div className="p3r-clamp-2 text-[10px] font-semibold leading-tight" style={{ color: P3R.grey }}>{a.description}</div>
              </div>
            ))}
          </div>
        )}
      </motion.div>
      <motion.div className="relative mt-5 flex items-center justify-between gap-3" variants={fromLeft} transition={spring}>
        <button type="button" onClick={onBack} className="flex items-center gap-2 text-[15px] font-black" style={{ color: P3R.roseInk }}>
          <span aria-hidden className="h-0 w-0 border-y-[6px] border-r-[9px] border-y-transparent" style={{ borderRightColor: P3R.blue }} />返回
        </button>
        <span className="truncate text-[11px] font-bold" style={{ color: P3R.grey }}>点击任意处返回花瓣图 ›</span>
      </motion.div>
    </motion.div>
  );
};

/* ─────────── 标题底衬三角（wobble）：已上收 kit，这里保留同名导出 ─────────── */
export { TitleTriWobble } from '@blue/kit';
/** 三角蒙版染字（DashboardP3 TRI_MASK_URI：被三角覆盖到的字染深一档，蓝版同 src 染 #0e3a63） */
export const TRI_MASK_URI = `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 300 60' preserveAspectRatio='none'%3E%3Cpath d='M2 32 L296 6 L70 74 Z' transform='rotate(3 150 30)' fill='%230e3a63'/%3E%3C/svg%3E")`;

/* ─────────── 背景动画 / 背景图（P3RPage 让位口径） ─────────── */
export type BgAnimStyle = 'aurora' | 'particles' | 'wave' | 'pulse';
export const BgAnimLayer = ({ styles, image, imageOpacity = 0.45 }: { styles: BgAnimStyle[]; image?: boolean; imageOpacity?: number }) => {
  const anim = useBoldness();
  const on = (s: BgAnimStyle) => styles.includes(s);
  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 overflow-hidden" style={{ zIndex: -1 }}>
      <style>{`
        @keyframes pk1-aur-a { 0%,100% { transform: translate(-10%, -6%); } 50% { transform: translate(14%, 10%); } }
        @keyframes pk1-aur-b { 0%,100% { transform: translate(10%, 8%); } 50% { transform: translate(-12%, -10%); } }
        @keyframes pk1-float { 0%,100% { transform: translateY(0); opacity: .35; } 50% { transform: translateY(-46px); opacity: .9; } }
        @keyframes pk1-wave { from { transform: translateX(0); } to { transform: translateX(-50%); } }
        @keyframes pk1-pulse { 0%,100% { opacity: .18; } 50% { opacity: .55; } }
      `}</style>
      {image && <div className="absolute inset-0" style={{ backgroundImage: `url(${duskImg})`, backgroundSize: 'cover', backgroundPosition: 'center', opacity: imageOpacity }} />}
      {on('aurora') && (
        <>
          <div className="absolute rounded-full" style={{ left: '-10%', top: '-6%', width: '42vmax', height: '42vmax', background: 'radial-gradient(circle, rgb(var(--p3r-blue-rgb) / 0.28), transparent 65%)', animation: anim ? 'pk1-aur-a 16s ease-in-out infinite' : undefined }} />
          <div className="absolute rounded-full" style={{ right: '-8%', top: '24%', width: '38vmax', height: '38vmax', background: 'radial-gradient(circle, rgb(var(--p3r-cyan-rgb) / 0.3), transparent 65%)', animation: anim ? 'pk1-aur-b 19s ease-in-out infinite' : undefined }} />
          <div className="absolute rounded-full" style={{ left: '20%', bottom: '-10%', width: '32vmax', height: '32vmax', background: 'radial-gradient(circle, var(--bk-danger-wash), transparent 65%)', animation: anim ? 'pk1-aur-a 22s ease-in-out infinite reverse' : undefined }} />
        </>
      )}
      {on('particles') && Array.from({ length: 8 }).map((_, i) => (
        <span key={i} className="absolute rounded-full" style={{ left: `${(i * 13 + 7) % 92}%`, top: `${(i * 23 + 15) % 80}%`, width: 4 + (i % 3) * 2, height: 4 + (i % 3) * 2, background: i % 2 ? 'var(--bk-bubble-a)' : 'rgb(var(--p3r-cyan-rgb) / 0.8)', animation: anim ? `pk1-float ${6 + (i % 4)}s ease-in-out ${-i * 1.3}s infinite` : undefined, opacity: anim ? undefined : 0.5 }} />
      ))}
      {on('wave') && (
        <div className="absolute inset-y-0 left-0" style={{ width: '200%', background: 'linear-gradient(100deg, transparent 0%, rgb(var(--p3r-blue-rgb) / 0.12) 15%, transparent 30%, rgb(var(--p3r-cyan-rgb) / 0.14) 45%, transparent 50%, rgb(var(--p3r-blue-rgb) / 0.12) 65%, transparent 80%, rgb(var(--p3r-cyan-rgb) / 0.14) 95%, transparent 100%)', animation: anim ? 'pk1-wave 14s linear infinite' : undefined }} />
      )}
      {on('pulse') && (
        <div className="absolute inset-0" style={{ backgroundImage: 'linear-gradient(rgb(var(--p3r-blue-rgb) / 0.25) 1px, transparent 1px), linear-gradient(90deg, rgb(var(--p3r-blue-rgb) / 0.25) 1px, transparent 1px)', backgroundSize: '44px 44px', animation: anim ? 'pk1-pulse 4s ease-in-out infinite' : undefined, opacity: anim ? undefined : 0.3 }} />
      )}
    </div>
  );
};

/* ─────────── 其它包登记的弹窗：在本页原地挂（未登记 → toast 指路） ─────────── */
export const OverlayByKey = ({ k, open, onClose, params }: { k: string; open: boolean; onClose: () => void; params?: URLSearchParams }) => {
  const entry = OVERLAYS[k];
  useEffect(() => { if (open && !entry) { showToast(`#/overlay/${k} 尚未登记（其它工作包）`); onClose(); } }, [open, entry, k, onClose]);
  if (!entry || !open) return null;
  const C = lazyOf(`overlay:${k}`, entry.load);
  return <Suspense fallback={null}><C open={open} onClose={onClose} params={params ?? new URLSearchParams()} /></Suspense>;
};

export { AnimatePresence };
