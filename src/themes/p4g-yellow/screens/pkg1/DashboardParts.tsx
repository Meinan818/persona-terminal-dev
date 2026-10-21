import { usePinnedCallingCard } from '@yellow/adapters/callingCards';
/**
 * 首页（Dashboard · P4）分块：页头 HUD / 问候题板 / 今日任务 / 今日仪式 / 四格统计。
 * 逻辑与文案来自真实 src/pages/Dashboard.tsx 的 isP4 分支，只换 P4G 渲染。
 */
import { AnimatePresence, motion } from 'framer-motion';
import { useEffect, useRef, useState, type ReactNode, type MouseEvent as RME } from 'react';
import type { AttributeId } from '@/types';
import { P4Outline, WeatherIcon, WEATHER_LABEL, WEEK_EN, periodOf, IconClose, IconChevron, type P4Weather } from '@yellow/kit';
import { useLowMotion } from '@yellow/lib/prefs';
import { useSkyBadge } from '@/components/sky/useSkyBadge';
import { p4gAsset } from '@yellow/lib/asset';
import { cx } from '@yellow/lib/cx';
import { navigate } from '@yellow/shell/shellBus';
import { MoonGlyph, SeasonStamp, Sparkle4, SlantTag, RippleLayer, useRipples, GlyphWave, GlyphHourglass, GlyphStar, GlyphPin } from './bits';
import { ATTR_NAMES, BIG_DEAL_STEPS, MOCK_CALLING_CARD, MOCK_DIVINATION, MOCK_ON_THIS_DAY, MOCK_PERSONA_NAME, callingCardProgress, moonPhaseOf, todayKey, type MockTodo } from '@yellow/adapters/pkg1';

// ───────────────────────────── 页头 HUD ─────────────────────────────
export type SkyWx = 'ok' | 'unset' | 'config' | 'error' | 'loading';

/** 天空角标（真实 P4SkyBadge）：月相 ⇄ 天气，点击翻牌 180° */
export function SkyRing({ mode, onToggle, weather, wx, temp }: { mode: 'moon' | 'weather'; onToggle: () => void; weather: P4Weather; wx: SkyWx; temp: number }) {
  const low = useLowMotion();
  const m = moonPhaseOf(new Date());
  const label = mode === 'weather'
    ? (wx === 'unset' ? '设置天气' : wx === 'config' ? '设置有误' : wx === 'error' ? '取不到' : wx === 'loading' ? '取数中' : `${temp}° ${WEATHER_LABEL[weather]}`)
    : `${m.name} ${Math.round(m.illum * 100)}%`;
  const aria = mode === 'weather' ? '天气（点击切回月相）' : '月相（点击切到天气）';
  const flip = mode === 'weather' ? 180 : 0;
  return (
    <div className="flex flex-col items-center">
      <button type="button" onClick={onToggle} aria-label={aria} className="relative h-[clamp(78px,22vw,104px)] w-[clamp(78px,22vw,104px)] shrink-0" style={{ perspective: 600 }}>
        {/* 天气徽式同心环 */}
        <svg aria-hidden viewBox="0 0 100 100" className="absolute inset-[-10%] h-[120%] w-[120%]" style={{ animation: low ? undefined : 'p4g-spin 30s linear infinite' }}>
          <circle cx="50" cy="50" r="47" fill="none" stroke="var(--p4g-orange)" strokeWidth="4" strokeDasharray="22 6 4 6" />
        </svg>
        <motion.span className="absolute inset-0" style={{ transformStyle: 'preserve-3d' }} initial={false} animate={{ rotateY: low ? 0 : flip }} transition={{ duration: low ? 0 : 0.42, ease: [0.2, 0.9, 0.1, 1] }}>
          {/* 正面：月相 */}
          <span className="absolute inset-0 flex items-center justify-center rounded-pill border-[4px] border-p4g-black bg-p4g-black shadow-[0_0_0_4px_var(--p4g-yellow),5px_6px_0_4px_#000]" style={{ backfaceVisibility: 'hidden', opacity: low && mode === 'weather' ? 0 : 1 }}>
            <MoonGlyph phase={m.phase} size={58} />
          </span>
          {/* 背面：天气 */}
          <span className="absolute inset-0 flex items-center justify-center rounded-pill border-[4px] border-p4g-black bg-p4g-black shadow-[0_0_0_4px_var(--p4g-yellow),5px_6px_0_4px_#000]" style={{ backfaceVisibility: 'hidden', transform: low ? undefined : 'rotateY(180deg)', opacity: low && mode === 'moon' ? 0 : 1 }}>
            {wx === 'ok' ? <WeatherIcon kind={weather} size={58} /> : <span className="font-display text-h2 font-bold text-p4g-yellow">{wx === 'loading' ? '…' : '?'}</span>}
          </span>
        </motion.span>
        <Sparkle4 size={18} color="var(--p4g-white)" className="absolute -right-1 -top-1 drop-shadow-[1px_1px_0_#000]" />
      </button>
      <button type="button" onClick={onToggle} aria-label={aria} className="mt-2.5 flex max-w-[132px] items-center gap-1 rounded-pill bg-p4g-black px-2.5 py-1 shadow-[2px_2px_0_var(--p4g-orange)]">
        {mode === 'weather' ? (wx === 'ok' ? <WeatherIcon kind={weather} size={14} /> : <span className="text-[10px] text-p4g-yellow">⚙</span>) : <MoonGlyph phase={m.phase} size={14} />}
        <span className="truncate font-display text-[10px] font-bold leading-none tracking-wide text-p4g-cream">{label}</span>
      </button>
    </div>
  );
}

/** 首页页头：TODAY'S SHOW 眉标 + MASKARIA 描边巨标 + 岁时小签 | 大号 P4G 日期 + 天气 HUD */
export function DashHeader({ weather, sky, setSky, wx, temp }: { weather: P4Weather; sky: 'moon' | 'weather'; setSky: (s: 'moon' | 'weather') => void; wx: SkyWx; temp: number }) {
  const low = useLowMotion();
  const live = useSkyBadge();
  const liveState: SkyWx = !live.ready ? 'unset' : live.loading ? 'loading' : live.error ? (live.errorKind === 'config' ? 'config' : 'error') : 'ok';
  const state = wx === 'ok' ? liveState : wx;
  const icon = live.weather?.icon ?? '';
  const p4Weather: P4Weather = wx !== 'ok' || !live.weather ? weather
    : icon.includes('thunder') ? 'thunder'
      : icon.includes('rain') ? 'rain'
        : icon.includes('snow') ? 'snow'
          : icon === 'fog' ? 'fog'
            : icon.includes('cloud') || icon === 'partly' || icon === 'overcast' ? 'cloudy'
              : icon.includes('clear-night') ? 'night' : 'sunny';
  const realTemp = wx === 'ok' && live.weather ? live.weather.temp : temp;
  const d = new Date();
  const wk = d.getDay();
  const p = periodOf(d);
  return (
    <header className="relative min-w-0">
      {/* 背后的天空圆（出血到右上角外）*/}
      <div aria-hidden className="pointer-events-none absolute -right-24 -top-24 h-[280px] w-[280px] rounded-pill border-[22px] border-p4g-orange opacity-90 wide:-right-16" style={{ clipPath: 'inset(0 0 0 0)' }} />
      <div className="relative flex min-w-0 items-start justify-between gap-3">
        <div className="min-w-0 flex-1 pt-1">
          <div className="inline-flex items-center gap-1.5 rounded-xs bg-p4g-black px-2 py-[3px] font-display text-cap font-bold tracking-[0.16em] text-p4g-yellow night:bg-p4g-yellow night:text-p4g-black">
            TODAY&apos;S SHOW · <span className="text-p4g-orange night:text-p4g-orange-deep">04</span>
          </div>
          <motion.div initial={low ? { opacity: 0 } : { x: -24, opacity: 0 }} animate={{ x: 0, opacity: 1 }} transition={{ duration: 0.26, ease: [0.2, 0.9, 0.1, 1] }} className="mt-1 max-w-full overflow-hidden">
            <P4Outline as="h1" size="clamp(34px,10.5vw,64px)" stroke={7} italic className="leading-none">MASKARIA</P4Outline>
          </motion.div>
          <div className="mt-2.5 flex items-center gap-2">
            <SeasonStamp collected={false} pop="below" />
          </div>
        </div>
        <SkyRing mode={live.mode} onToggle={live.toggle} weather={p4Weather} wx={state} temp={realTemp} />
      </div>
      {/* 大号日期条（P4G 日历 HUD）*/}
      <motion.div className="relative mt-3 flex min-w-0 flex-wrap items-end gap-x-3 gap-y-1"
        initial={low ? { opacity: 0 } : { y: 14, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ duration: 0.28, delay: 0.06, ease: [0.2, 0.9, 0.1, 1] }}
        aria-label={`${d.getMonth() + 1}月${d.getDate()}日 ${WEEK_EN[wk]} ${p.zh}`}>
        <span className="flex items-end leading-none">
          <P4Outline size="clamp(56px,17vw,96px)" stroke={8} italic className="leading-[0.86]">{d.getMonth() + 1}</P4Outline>
          <span className="mx-1 mb-1 h-[clamp(36px,10vw,58px)] w-[clamp(6px,1.6vw,9px)] -skew-x-[18deg] bg-p4g-black shadow-[3px_0_0_var(--p4g-white)] night:bg-p4g-yellow" />
          <P4Outline size="clamp(56px,17vw,96px)" stroke={8} italic className="leading-[0.86]">{String(d.getDate()).padStart(2, '0')}</P4Outline>
        </span>
        <span className="mb-1 flex flex-col items-start gap-1">
          <span className={cx('rounded-sm border-2 border-p4g-black px-2 py-[3px] font-display text-lead font-bold italic leading-none shadow-hard-sm', wk === 0 ? 'bg-p4g-red text-white' : wk === 6 ? 'bg-p4g-info text-p4g-info-ink' : 'bg-p4g-black text-p4g-yellow night:bg-p4g-yellow night:text-p4g-black')}>{WEEK_EN[wk].slice(0, 2)}</span>
          <span className="p4g-date-type text-2xs text-[color:var(--p4g-on-stage)]">{d.toLocaleDateString('en-US', { month: 'short' }).toUpperCase()} {d.getFullYear()}</span>
        </span>
        <span className="mb-1.5 flex min-w-0 flex-col items-start">
          <P4Outline size="clamp(16px,4.6vw,22px)" stroke={4} italic>{p.en}</P4Outline>
          <span className="font-display text-meta font-bold text-[color:var(--p4g-on-stage)]">{p.zh} · {WEATHER_LABEL[p4Weather]}</span>
        </span>
      </motion.div>
    </header>
  );
}

// ───────────────────────────── 问候题板 ─────────────────────────────
export type GreetMode = 'card' | 'empty' | 'unpinned';

export function GreetingPlate({ subtext, greeting, mode: requestedMode, completed, total, unpinnedCount: _demoUnpinned = 2 }: { subtext: string; greeting: string; mode: GreetMode; completed: number; total: number; unpinnedCount?: number }) {
  const { pinned, unpinned: unpinnedCount, progress } = usePinnedCallingCard();
  const mode = requestedMode === 'card' ? pinned ? 'card' : unpinnedCount ? 'unpinned' : 'empty' : requestedMode;
  const callingCardProgress = { overall: progress };
  const low = useLowMotion();
  const [hintHidden, setHintHidden] = useState(false);
  const jump = () => { try { sessionStorage.setItem('velvet:todos-goal-panel', 'countdown'); } catch { /* ignore */ } navigate('actions', 'todos', { params: { deck: 'cards' } }); };
  const cc = { title: pinned?.title ?? '', targetDate: pinned?.targetDate ?? todayKey };
  const daysLeft = Math.max(0, Math.round((new Date(cc.targetDate + 'T00:00:00').getTime() - new Date(todayKey + 'T00:00:00').getTime()) / 86400000));
  const summary = daysLeft === 0 ? '就是今天' : `还剩 ${daysLeft} 天`;
  return (
    <motion.section className="relative min-w-0" initial={low ? { opacity: 0 } : { y: -12, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ duration: 0.24 }}>
      <div aria-hidden className="absolute inset-0 translate-x-[9px] translate-y-[9px] rounded-sm bg-p4g-orange" style={{ transform: 'translate(9px,9px) skewX(-2deg)' }} />
      <div aria-hidden className="absolute inset-0 rounded-sm bg-p4g-yellow" style={{ transform: 'translate(5px,5px) skewX(-2deg)' }} />
      <div className="relative overflow-hidden rounded-sm border-3 border-p4g-black bg-[color:var(--p4g-msg)] night:border-p4g-yellow" style={{ transform: 'skewX(-2deg)' }}>
        <div aria-hidden className="h-[6px] p4g-candy" />
        <div className="absolute left-4 top-[6px] rounded-b-sm bg-p4g-yellow px-2.5 py-0.5 font-display text-cap font-bold text-p4g-black">MASKARIA</div>
        <div className="px-5 pb-4 pt-8" style={{ transform: 'skewX(2deg)' }}>
          <p className="mb-1 font-display text-meta font-bold text-p4g-yellow">{subtext}</p>
          <h2 className="font-display text-[clamp(20px,6vw,26px)] font-bold leading-tight text-p4g-cream">{greeting}<span aria-hidden className="ml-1 inline-block text-p4g-yellow" style={{ animation: low ? undefined : 'p4g-blink 1s steps(1) infinite' }}>▼</span></h2>

          {mode === 'card' && (
            <button type="button" onClick={jump} aria-label={`倒计时：${cc.title}，${summary}，${callingCardProgress.overall}%`}
              className="group mt-4 block w-full min-w-0 text-left">
              <span className="flex min-w-0 items-center gap-2 border-2 border-p4g-black bg-p4g-yellow px-2.5 py-1.5 text-p4g-black shadow-[3px_3px_0_var(--p4g-orange)]" style={{ clipPath: 'polygon(0 0,100% 0,calc(100% - 10px) 100%,0 100%)' }}>
                <GlyphHourglass size={16} />
                <span className="min-w-0 flex-1 truncate font-display text-body font-bold">{cc.title}</span>
                <span className="shrink-0 bg-p4g-black px-1.5 py-0.5 font-display text-cap font-bold text-p4g-yellow">{summary}</span>
                <span className="shrink-0 pr-2 p4g-num text-meta">{callingCardProgress.overall}%</span>
              </span>
              <span className="mt-1.5 block h-[5px] w-full overflow-hidden rounded-pill bg-white/15">
                <span className="block h-full w-full origin-left bg-gradient-to-r from-p4g-orange to-p4g-yellow" style={{ transform: `scaleX(${callingCardProgress.overall / 100})` }} />
              </span>
            </button>
          )}
          {mode === 'empty' && !hintHidden && (
            <div className="mt-4 flex min-w-0 items-center gap-2 border-2 border-dashed border-p4g-yellow/70 px-3 py-2 text-meta text-p4g-cream">
              <button type="button" onClick={jump} className="min-w-0 flex-1 text-left leading-snug">为重要的事写一张「宣告卡」，倒计时随时在此映入眼帘</button>
              <button type="button" aria-label="不再提示" onClick={() => setHintHidden(true)} className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xs bg-p4g-yellow text-p4g-black"><IconClose size={13} /></button>
            </div>
          )}
          {mode === 'unpinned' && (
            <button type="button" onClick={jump} className="mt-4 flex w-full min-w-0 items-center gap-2 bg-white/10 px-3 py-2 text-left text-cap font-bold text-p4g-cream hover:bg-white/20">
              <GlyphPin size={14} /><span className="min-w-0 flex-1 truncate">你有 {unpinnedCount} 张倒计时未钉到主页</span><span className="opacity-60">›</span>
            </button>
          )}

          {total > 0 && (
            <div className="mt-4">
              <div className="mb-1.5 flex items-center justify-between font-display text-meta font-bold text-p4g-cream/85">
                <span>今日进度</span><span><span className="p4g-num text-p4g-yellow">{completed}/{total}</span> 项完成</span>
              </div>
              <div className="flex h-[12px] w-full items-center gap-[3px] rounded-[2px] bg-black/40 px-[3px]">
                {Array.from({ length: total }, (_, i) => <span key={i} className={cx('h-[6px] flex-1 rounded-[1px] transition-colors duration-base', i < completed ? 'bg-p4g-yellow' : 'bg-white/15')} />)}
              </div>
            </div>
          )}
        </div>
      </div>
    </motion.section>
  );
}

// ───────────────────────────── 今日任务 ─────────────────────────────
const deadlineText = (deadline?: string) => {
  if (!deadline) return null;
  const n = Math.round((new Date(deadline + 'T00:00:00').getTime() - new Date(todayKey + 'T00:00:00').getTime()) / 86400000);
  return { n, text: n > 0 ? `剩 ${n} 天` : n === 0 ? '今天截止' : `逾期 ${-n} 天` };
};

export function PanelFrame({ title, en, right, children, className }: { title: string; en: string; right?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <section className={cx('relative min-w-0 overflow-hidden rounded-sm border-3 border-p4g-line bg-p4g-surface-2 shadow-hard', className)}>
      <div className="flex min-w-0 items-center gap-2 border-b-3 border-p4g-line bg-p4g-yellow px-3 py-2">
        <span className="relative shrink-0">
          <span aria-hidden className="absolute inset-0 -skew-x-12 bg-p4g-black shadow-[2px_2px_0_var(--p4g-orange)]" />
          <span className="relative block px-2.5 py-0.5 font-display text-body font-bold text-p4g-yellow">{title}</span>
        </span>
        <span className="min-w-0 flex-1 truncate font-display text-2xs font-bold italic tracking-[0.2em] text-p4g-black">{en}</span>
        {right}
      </div>
      {children}
    </section>
  );
}

export function BigDealRow({ todo, onOpen }: { todo: MockTodo; onOpen: () => void }) {
  const steps = BIG_DEAL_STEPS;
  const done = steps.filter((s) => s.done).length;
  const next = steps.find((s) => !s.done);
  const dl = deadlineText(todo.deadline);
  const total = steps.length;
  return (
    <button type="button" onClick={onOpen} aria-label="管理这件大事" className="relative block w-full min-w-0 overflow-hidden bg-p4g-black text-left text-white p4g-press">
      <span aria-hidden className="absolute inset-y-0 left-0 w-2 p4g-hazard" />
      <span className="block py-2.5 pl-5 pr-3">
        <span className="flex min-w-0 items-center gap-2">
          <SlantTag tone="yellow">BIG DEAL</SlantTag>
          <span className="min-w-0 flex-1 truncate font-display text-lead font-bold">{todo.title}</span>
          {dl && <span className={cx('shrink-0 px-1.5 py-0.5 font-display text-cap font-bold', dl.n <= 0 ? 'bg-p4g-red text-white' : dl.n <= 3 ? 'bg-p4g-orange text-p4g-black' : 'bg-white/15 text-p4g-cream')}>{dl.n > 0 ? `剩 ${dl.n} 天` : dl.n === 0 ? '今天截止' : '已过截止'}</span>}
        </span>
        <span className="mt-1.5 flex items-center gap-2">
          <span className="shrink-0 font-display text-cap font-bold text-p4g-yellow">总进度</span>
          <span className="flex h-[12px] min-w-0 flex-1 items-center gap-[3px] rounded-[2px] bg-p4g-yellow px-[3px]">
            {steps.map((s, i) => <span key={i} className={cx('h-[6px] flex-1 rounded-[1px]', s.done ? 'bg-p4g-black' : 'bg-p4g-black/20')} />)}
          </span>
          <span className="shrink-0 p4g-num text-meta text-p4g-yellow">{done}/{total}</span>
        </span>
        <span className="mt-1 flex min-w-0 items-center gap-1 font-display text-meta font-bold text-p4g-cream/85">
          <span className="min-w-0 truncate">{total === 0 ? '去拆第一步' : next ? `下一步：${next.title}` : '全部完成——进去收官'}</span>
          <IconChevron size={14} className="shrink-0 text-p4g-yellow" />
        </span>
      </span>
    </button>
  );
}

const pactText = (t: MockTodo) => t.pact ? `与 ${(t.pact as unknown as { partnerName: string }).partnerName} · Ta 已完成` : null;
const orgText = (t: MockTodo) => t.orgOp ? `目标 · ${(t.orgOp as unknown as { orgName: string }).orgName} · 2/5` : null;

export function TaskRow({ todo, count, index, onTick }: { todo: MockTodo; count: number; index: number; onTick: (e: RME<HTMLButtonElement>) => void }) {
  const low = useLowMotion();
  const target = todo.frequency === 'count' ? todo.targetCount || 1 : 1;
  const done = count >= target;
  const rp = useRipples();
  const dl = !done ? deadlineText(todo.deadline) : null;
  return (
    <motion.button
      type="button"
      disabled={done}
      onClick={(e) => { const r = e.currentTarget.getBoundingClientRect(); if (!done) rp.spawn(e.clientX - r.left, e.clientY - r.top); onTick(e); }}
      className={cx('group relative block w-full min-w-0 overflow-hidden px-3 py-2.5 text-left', done ? 'cursor-not-allowed' : 'cursor-pointer active:translate-x-[2px]')}
      style={{ background: done ? 'var(--p4g-surface-2)' : todo.important ? 'var(--p4g-surface-grad)' : 'var(--p4g-surface)' }}
      initial={low ? false : { opacity: 0, x: 24 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.22, delay: low ? 0 : index * 0.04, ease: [0.2, 0.9, 0.1, 1] }}
    >
      <RippleLayer list={rp.list} remove={rp.remove} size={160} />
      <span className="relative flex min-w-0 items-center gap-3">
        {/* 完成方框（S.Link 卡槽）*/}
        <span aria-hidden className={cx('flex h-9 w-8 shrink-0 items-center justify-center rounded-sm border-[3px] transition-colors duration-fast', done ? 'border-p4g-black bg-p4g-green text-p4g-black' : 'border-p4g-orange bg-p4g-yellow-pale')}>
          {done ? <svg width="16" height="16" viewBox="0 0 12 12" fill="none"><path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="2.2" strokeLinecap="square" /></svg> : <span className="h-5 w-4 rounded-xs bg-p4g-orange/80" />}
        </span>
        <span className="min-w-0 flex-1">
          <span className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
            <span className="flex min-w-0 max-w-full items-center gap-1.5">
              {todo.important && <span className="shrink-0" title="重要"><GlyphStar size={14} /></span>}
              {todo.fateDrawnDate === todayKey && <span className="shrink-0 font-display text-cap font-bold text-p4g-orange-deep" title="今日抽签选中">✦</span>}
              <span className={cx('min-w-0 truncate font-display text-body font-bold', done ? 'text-p4g-ink/45 line-through' : 'text-p4g-ink')}>{todo.title}</span>
            </span>
            {pactText(todo) && <SlantTag tone="orange">{pactText(todo)}</SlantTag>}
            {orgText(todo) && <SlantTag tone="black">{orgText(todo)}</SlantTag>}
            {dl && <span aria-label={`截止日 ${todo.deadline}，${dl.text}`} className={cx('shrink-0 px-1.5 py-[2px] font-display text-2xs font-bold', dl.n <= 0 ? 'bg-p4g-red text-white' : dl.n <= 3 ? 'bg-p4g-orange text-p4g-black' : 'bg-p4g-black/10 text-p4g-ink')}>{dl.text}</span>}
          </span>
          <span className="mt-0.5 flex min-w-0 flex-wrap items-center gap-x-1.5 font-display text-cap font-bold text-[color:var(--p4g-rank)]">
            <span>{ATTR_NAMES[todo.attribute]} +{todo.points}</span>
            {todo.extraBoosts?.map((b, i) => <span key={i}>· {ATTR_NAMES[b.attribute as AttributeId]} +{b.points}</span>)}
            <span className="p4g-num text-p4g-ink-soft">· {Math.min(count, target)}/{target}</span>
          </span>
        </span>
      </span>
      <span className="relative mt-2 flex h-[10px] w-full items-center gap-[3px] rounded-[2px] bg-p4g-orange px-[3px]">
        {(() => { const n = target === 1 ? 6 : target; return Array.from({ length: n }, (_, i) => (
          <span key={i} className={cx('h-[4px] flex-1 rounded-[1px] transition-colors duration-base', (i + 1) / n <= Math.min(count, target) / target ? 'bg-white' : 'bg-p4g-orange-deep/60')} />
        )); })()}
      </span>
      <span aria-hidden className="absolute inset-x-0 bottom-0 h-[2px]" style={{ background: index % 2 ? 'var(--p4g-separator-b)' : 'var(--p4g-separator-a)' }} />
    </motion.button>
  );
}

export function TasksEmpty() {
  return (
    <div className="relative flex flex-col items-center px-4 py-6 text-center">
      <img src={p4gAsset('empty-nosignal.webp')} alt="" className="w-[120px]" draggable={false} />
      <p className="mt-2 font-display text-body font-bold text-p4g-orange-deep night:text-p4g-yellow">暂无待播行动</p>
      <p className="mt-1 font-display text-cap font-bold text-p4g-ink-soft">去「行动」页添加吧</p>
      <Sparkle4 size={14} color="var(--p4g-orange)" className="absolute bottom-3 right-4" />
    </div>
  );
}

// ───────────────────────────── 今日仪式 ─────────────────────────────
export interface RitualSlide { key: string; node: ReactNode }

/** 横滑卡组（真实 StackCarousel，满宽 slide + 圆点）；scroll-snap 原生滑动 + 宽屏左右箭头 */
export function RitualCarousel({ slides, initial = 0 }: { slides: RitualSlide[]; initial?: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const [page, setPage] = useState(Math.min(initial, slides.length - 1));
  useEffect(() => {
    const el = ref.current; if (!el) return;
    el.scrollTo({ left: el.clientWidth * Math.min(initial, slides.length - 1), behavior: 'auto' });
  }, []); // eslint-disable-line
  const go = (i: number) => { const el = ref.current; if (!el) return; const n = Math.max(0, Math.min(slides.length - 1, i)); el.scrollTo({ left: el.clientWidth * n, behavior: 'smooth' }); };
  return (
    <div className="relative min-w-0">
      <div ref={ref} className="flex min-w-0 snap-x snap-mandatory overflow-x-auto overscroll-x-contain" style={{ scrollbarWidth: 'none' }}
        onScroll={(e) => { const el = e.currentTarget; setPage(Math.round(el.scrollLeft / Math.max(1, el.clientWidth))); }}>
        {slides.map((s) => <div key={s.key} className="w-full min-w-0 shrink-0 snap-start p-2.5 [&>*]:h-full">{s.node}</div>)}
      </div>
      <div className="flex items-center justify-center gap-2 pb-2.5">
        <button type="button" aria-label="上一张" onClick={() => go(page - 1)} disabled={page === 0} className="flex h-7 w-7 items-center justify-center rounded-xs bg-p4g-black text-p4g-yellow disabled:opacity-30"><IconChevron size={12} style={{ transform: 'scaleX(-1)' }} /></button>
        {slides.map((s, i) => (
          <button key={s.key} type="button" aria-label={`第 ${i + 1} 张`} onClick={() => go(i)} className="p-1">
            <span className={cx('block h-2.5 transition-all duration-fast', i === page ? 'w-6 bg-p4g-black night:bg-p4g-yellow' : 'w-2.5 bg-p4g-black/25 night:bg-p4g-yellow/30')} style={{ clipPath: 'polygon(3px 0,100% 0,calc(100% - 3px) 100%,0 100%)' }} />
          </button>
        ))}
        <button type="button" aria-label="下一张" onClick={() => go(page + 1)} disabled={page === slides.length - 1} className="flex h-7 w-7 items-center justify-center rounded-xs bg-p4g-black text-p4g-yellow disabled:opacity-30"><IconChevron size={12} /></button>
      </div>
    </div>
  );
}

const SlideShell = ({ children, onClick, tone = 'surface', ariaLabel }: { children: ReactNode; onClick?: () => void; tone?: 'surface' | 'black' | 'info'; ariaLabel?: string }) => {
  const cls = cx('relative flex min-h-[112px] w-full min-w-0 items-start gap-3 overflow-hidden rounded-sm border-3 border-p4g-black p-3 text-left shadow-hard-sm',
    tone === 'black' ? 'bg-p4g-black text-white' : tone === 'info' ? 'bg-p4g-black text-white ring-[3px] ring-inset ring-p4g-cyan' : 'bg-p4g-surface text-p4g-ink', onClick && 'p4g-press');
  return onClick ? <button type="button" onClick={onClick} aria-label={ariaLabel} className={cls}>{children}</button> : <div className={cls}>{children}</div>;
};

export const CountercurrentSlide = ({ attrs }: { attrs: AttributeId[] }) => (
  <SlideShell tone="info">
    <span aria-hidden className="absolute inset-x-0 top-0 h-2 p4g-hazard" />
    <span className="mt-1.5 flex h-11 w-11 shrink-0 items-center justify-center rounded-sm border-2 border-p4g-black bg-p4g-cyan"><GlyphWave size={24} /></span>
    <span className="mt-1.5 min-w-0 flex-1">
      <span className="block font-display text-lead font-bold text-p4g-cyan">逆流预警</span>
      <span className="mt-0.5 block text-meta leading-snug text-white/85">{attrs.map((id) => ATTR_NAMES[id]).join('、')} 已连续3日无增长，明日将{attrs.length > 1 ? '各' : ''}扣减 1 点</span>
    </span>
  </SlideShell>
);

export const AstrologySlide = ({ drawn }: { drawn: boolean }) => (
  <SlideShell onClick={() => navigate('astrology')} ariaLabel={drawn ? undefined : '今日星象尚未展开'}>
    {/* 塔罗牌面 */}
    <span aria-hidden className="relative flex h-[76px] w-[50px] shrink-0 items-center justify-center rounded-[4px] border-[3px] border-p4g-black bg-p4g-black shadow-[3px_3px_0_var(--p4g-orange)]">
      <span className="absolute inset-[3px] rounded-[2px] border border-p4g-yellow/60" />
      {drawn ? <span className="font-display text-[22px] font-bold text-p4g-yellow" style={{ writingMode: 'vertical-rl' }}>{MOCK_DIVINATION.cardName}</span> : <Sparkle4 size={24} color="var(--p4g-yellow)" />}
    </span>
    <span className="min-w-0 flex-1">
      {drawn ? (
        <>
          <span className="flex min-w-0 flex-wrap items-center gap-1.5">
            <span className="truncate font-display text-lead font-bold">{MOCK_DIVINATION.cardName} · {MOCK_DIVINATION.orientation === 'upright' ? '正位' : '逆位'}</span>
            <SlantTag tone="orange">{ATTR_NAMES[MOCK_DIVINATION.attribute]} × {MOCK_DIVINATION.multiplier}</SlantTag>
          </span>
          <span className="mt-1 block p4g-clamp-2 text-meta leading-snug text-p4g-ink-soft">{MOCK_DIVINATION.advice}</span>
        </>
      ) : (
        <>
          <span className="block font-display text-lead font-bold">今日星象尚未展开</span>
          <span className="mt-0.5 block text-meta leading-snug text-p4g-ink-soft">点击进入星象，从三张塔罗中抽取一张</span>
        </>
      )}
    </span>
    <IconChevron size={16} className="mt-1 shrink-0" />
  </SlideShell>
);

export const BattleSlide = ({ inShadow, awakened }: { inShadow: boolean; awakened: boolean }) => (
  <SlideShell tone="black" onClick={() => navigate('battle', undefined, { transition: 'noise' })} ariaLabel={inShadow ? '逆影战场：影时间进行中' : '逆影战场'}>
    <span aria-hidden className="absolute -right-6 -top-6 h-24 w-24 rounded-pill border-[10px] border-p4g-yellow/25" />
    <span className="min-w-0 flex-1">
      <span className="flex min-w-0 items-center gap-2">
        <span className="font-display text-lead font-bold text-p4g-yellow">逆影战场</span>
        {inShadow && <SlantTag tone="orange">影时间</SlantTag>}
        <span className="ml-auto shrink-0 p4g-num text-cap text-white/60">20:00 显形</span>
      </span>
      <span className="mt-2 flex min-w-0 items-center gap-1 font-display text-body font-bold">
        {awakened ? (<><span className="min-w-0 truncate">{MOCK_PERSONA_NAME}</span><span className="shrink-0 text-white/75">· 区层显形 →</span></>) : <span className="truncate text-white/80">唤醒 Persona →</span>}
      </span>
      <span className="mt-2 block h-[6px] w-full p4g-hazard opacity-80" />
    </span>
  </SlideShell>
);

export const OnThisDaySlide = ({ onOpen }: { onOpen: () => void }) => (
  <SlideShell onClick={onOpen}>
    <span aria-hidden className="relative flex h-14 w-14 shrink-0 flex-col items-center justify-center rounded-sm border-[3px] border-p4g-black bg-p4g-yellow leading-none text-p4g-black">
      <span className="font-display text-[9px] font-bold tracking-widest">-1 YEAR</span>
      <span className="p4g-num text-h2">{new Date().getDate()}</span>
    </span>
    <span className="min-w-0 flex-1">
      <span className="block font-display text-lead font-bold">一年前的今天</span>
      <span className="mt-0.5 block p4g-clamp-2 text-meta text-p4g-ink-soft">记了 {MOCK_ON_THIS_DAY.total} 条 · {MOCK_ON_THIS_DAY.items[0].text}</span>
    </span>
    <IconChevron size={16} className="mt-1 shrink-0" />
  </SlideShell>
);

// ───────────────────────────── 四格统计 ─────────────────────────────
export function StatCircles({ items }: { items: { v: number; label: string; c: string }[] }) {
  return (
    <div className="mx-auto mt-4 grid max-w-[460px] grid-cols-4 gap-2.5">
      {items.map((s, i) => (
        <div key={s.label} className="relative min-w-0">
          <div className="flex aspect-square w-full flex-col items-center justify-center rounded-pill border-3 border-p4g-black bg-p4g-surface-2 shadow-hard-sm">
            <span className="p4g-num text-[clamp(18px,5.6vw,28px)] leading-none" style={{ color: s.c, textShadow: '1.5px 1.5px 0 #111' }}>{s.v}</span>
            <span className="mt-1 px-0.5 text-center font-display text-[10px] font-bold leading-tight text-p4g-ink">{s.label}</span>
          </div>
          {(i === 0 || i === 2) && <Sparkle4 size={14} color={i === 0 ? 'var(--p4g-orange)' : 'var(--p4g-white)'} className="absolute -top-1 right-0 drop-shadow-[1px_1px_0_#000]" />}
        </div>
      ))}
    </div>
  );
}

export { AnimatePresence };
