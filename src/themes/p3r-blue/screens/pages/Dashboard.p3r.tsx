/**
 * Dashboard.p3r —— 首页（真实 src/pages/p3/DashboardP3.tsx，粉 = p3 频道）1:1 结构，P3R 蓝白重画。
 * 自上而下：幽灵字 PERSONA / TERMINAL + 竖排 WILD HEART → MASKARIA 大黑斜体 + 句点 + 底衬三角（沸腾）+ 三角蒙版染字 →
 *   时段问候副题 → 日期块（大日数字 + 月 / 星期 + 岁时小签 + 斜线 + 天空位 月相⇄天气）→ 钉选宣言卡三态 →
 *   今日任务（BIG DEAL 聚合卡置顶 + 可直接打卡的任务行 + 卡底进度细条，完成 → 今日完成 cut-in）→
 *   今日仪式 StackCarousel（逆流预警 / 星象入口 / 逆影战场 / 当年今日；自动轮播 6s）→ 人格指数五角星象仪（点角 → 原地属性详情）→ 四格统计条。
 *   临期 Toast（钉选卡 ≤3 天，每卡每天一次）/ 逆流侵蚀弹窗（?decay=1）。
 * 直达参数：
 *   ?sec=tasks|ritual|persona|stack 滚到该区；?slide=countercurrent|astrology|battle|onthisday 仪式组停在该张；?drawn=1 星象已抽
 *   ?greet=card|far|nodate|unpinned|empty 宣言区三态；?sky=weather（&weather=ok|unset|config|error|loading）
 *   ?state=empty 今日无任务；?card=bigdeal（&deal=empty|done）；?attr=knowledge|… 原地详情；?anim=1 星象仪入场演出（默认进入视口也播）
 *   ?battle=wake|reveal|fight &shadow=1；?cc=0 / ?otd=0 / ?battleOn=0 去掉对应仪式卡；?bg=anim|image（&styles=aurora,particles &opacity=0.45）；?decay=1 ?toast=1
 */
import { AnimatePresence, motion } from 'framer-motion';
import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import type { AttributeId } from '@real/types';
import type { PageProps } from '@blue/registry/types';
import { GhostWords, SectionMark, TitlePeriod, P3R, slantClip } from '@blue/kit';
import { BlueHeroDecor } from '@blue/fx';
import DateRollCutIn from '@blue/screens/overlays/DateRollCutIn.p3r';
import { useBoldness } from '@blue/lib/prefs';
import { navigate } from '@blue/shell/shellBus';
import {
  ATTR_IDS, BIG_DEAL_DONE, BIG_DEAL_EMPTY, MAX_LEVEL, SUBTEXTS, daysUntil, levelTitle, masteryOf, masteryTitle, slotOf, todayKey, type MockTodo,
} from '@blue/mock/pkg1';
import { homeOps, onThisDaySub, useHomeData } from '@/themes/homeData';
import { StarChartP3, type StarItem } from '@blue/screens/pkg1/StarChart';
import {
  AttrDetailInline, BattleSlab, BgAnimLayer, BigDealHomeCard, HourglassGlyph, MoonGlyph, OverlayByKey, RitualSlab, SkyBadge, StackCarousel, TitleTriWobble, TRI_MASK_URI, WaveGlyph,
  type BattleState, type BgAnimStyle, type WeatherState,
} from '@blue/screens/pkg1/DashboardParts';
import { BandCutInP3 } from '@blue/screens/overlays/TodoCompleteModal.p3r';
import { useAppStore } from '@/store';
import { SeasonStampChip } from '@blue/screens/overlays/SeasonStampBadge.p3r';
import { OnThisDaySheetP3 } from '@blue/screens/overlays/OnThisDaySheet.p3r';
import { DecayModal } from '@blue/screens/overlays/DashboardDecayModal.p3r';
import { UrgentToast } from '@blue/screens/overlays/DashboardToasts.p3r';

const MONTHS = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
const WEEKDAYS = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];

/** 首页标题（MASKARIA + 句点 + 沸腾底衬三角 + 蒙版染字）——home-brand-title 演出复用同一块 */
export const HomeBrandTitle = ({ play = true }: { play?: boolean }) => (
  <h1 className="relative inline-flex items-end font-heavy leading-[0.95] tracking-tight" style={{ color: P3R.ink, fontSize: 'min(54px, 13.4vw)', isolation: 'isolate' }}>
    MASKARIA
    <TitlePeriod className="mb-1.5 ml-1.5" />
    <TitleTriWobble play={play} style={{ left: -10, right: 30, top: 6, bottom: -8, transform: 'translate(-1.6px, -6.9px) rotate(3deg)' }} />
    <span aria-hidden className="pointer-events-none absolute inset-0 select-none"
      style={{ backgroundImage: TRI_MASK_URI, backgroundRepeat: 'no-repeat', backgroundPosition: '-11.6px -0.9px', backgroundSize: 'calc(100% - 20px) calc(100% + 2px)', WebkitBackgroundClip: 'text', backgroundClip: 'text', color: 'transparent', WebkitTextFillColor: 'transparent', textShadow: 'none' }}>MASKARIA</span>
  </h1>
);

export default function Dashboard({ params }: PageProps) {
  const anim = useBoldness();
  const q = (k: string) => params.get(k);
  const now = useMemo(() => new Date(), []);
  const subtext = useMemo(() => { const pool = SUBTEXTS[slotOf(now.getHours())]; return pool[Math.floor(Math.random() * pool.length)]; }, [now]);
  const {
    ATTR_NAMES,
    MOCK_ATTRS,
    MOCK_CALLING_CARD,
    MOCK_CALLING_CARD_FAR,
    MOCK_COUNTERCURRENT,
    MOCK_DECAYED,
    MOCK_DIVINATION,
    MOCK_PERSONA_NAME,
    MOCK_STATS,
    MOCK_TODOS,
    MOCK_UNPINNED_COUNT,
    MOCK_USER_NAME,
  } = useHomeData();

  // ── 今日任务 ──
  const dealVariant = q('deal');
  const emptyParam = q('state') === 'empty';
  const [todos, setTodos] = useState<MockTodo[]>([]);
  useEffect(() => {
    if (emptyParam) {
      setTodos([]);
      return;
    }
    const base = MOCK_TODOS.map((t) => ({ ...t })) as unknown as MockTodo[];
    if (dealVariant === 'empty') base[0] = { ...BIG_DEAL_EMPTY } as unknown as MockTodo;
    if (dealVariant === 'done') base[0] = { ...BIG_DEAL_DONE } as unknown as MockTodo;
    setTodos(base);
  }, [MOCK_TODOS, dealVariant, emptyParam]);
  const tickable = todos.filter((t) => !t.isBigDeal);
  const completed = tickable.filter((t) => t.count >= t.target).length;
  const total = tickable.length;
  const [cutin, setCutin] = useState<null | { title: string; points: number; hint: boolean }>(null);
  useEffect(() => () => useAppStore.getState().setModalBlocker(false), []);
  const [rowRipple, setRowRipple] = useState<string | null>(null);
  const [dealOpen, setDealOpen] = useState(false);
  const complete = (t: MockTodo) => {
    if (t.count >= t.target) return;
    setRowRipple(t.id + Date.now());
    const next = { ...t, count: t.count + 1 };
    setTodos((ts) => ts.map((x) => (x.id === t.id ? next : x)));
    const willComplete = next.count >= next.target;
    if (willComplete) {
      useAppStore.getState().setModalBlocker(true);
      const pts = t.points + (t.extraBoosts?.reduce((s, b) => s + b.points, 0) ?? 0);
      window.setTimeout(() => setCutin({ title: t.title, points: pts, hint: false }), anim ? 260 : 0);
    }
    void homeOps.completeTodo(t.id).then((result) => {
      if (!result && willComplete) useAppStore.getState().setModalBlocker(false);
    }).catch(() => {
      if (willComplete) useAppStore.getState().setModalBlocker(false);
    });
  };

  // ── 宣言卡三态 ──
  const greet = (q('greet') as 'card' | 'far' | 'nodate' | 'unpinned' | 'empty' | null) ?? (MOCK_CALLING_CARD ? 'card' : MOCK_UNPINNED_COUNT > 0 ? 'unpinned' : 'empty');
  const pinned = greet === 'card' ? MOCK_CALLING_CARD : greet === 'far' ? MOCK_CALLING_CARD_FAR : greet === 'nodate' && MOCK_CALLING_CARD ? { ...MOCK_CALLING_CARD, targetDate: undefined } : null;
  const daysLeft = pinned?.targetDate ? Math.max(0, daysUntil(pinned.targetDate)) : null;
  const [hintDismissed, setHintDismissed] = useState(false);
  const jumpToCallingCard = () => navigate('actions', 'todos', { params: { panel: 'countdown' } });

  // 临期 Toast：≤3 天且 >0、每卡每天首次（localStorage 节流，同真实键名）
  const [toast, setToast] = useState<string | null>(null);
  useEffect(() => {
    if (!pinned || daysLeft == null || daysLeft > 3 || daysLeft <= 0) return;
    const key = `velvet_cc_urgent_${pinned.id}_${todayKey}`;
    if (q('toast') !== '1') { try { if (localStorage.getItem(key) === '1') return; localStorage.setItem(key, '1'); } catch { /* */ } }
    setToast(`「${pinned.title}」还剩 ${daysLeft} 天`);
    const t = window.setTimeout(() => setToast(null), 3600);
    return () => clearTimeout(t);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // 逆流：衰减通知（进入首页执行；demo 由 ?decay=1 触发）+ 预警卡
  const [decayed, setDecayed] = useState<AttributeId[]>(q('decay') === '1' ? MOCK_DECAYED : []);
  const ccOn = q('cc') !== '0';
  const warnings = ccOn ? MOCK_COUNTERCURRENT : [];

  // ── 今日仪式 ──
  const drawn = q('drawn') === '1' && !!MOCK_DIVINATION;
  const divination = drawn ? MOCK_DIVINATION : null;
  const battleOn = q('battleOn') !== '0';
  const otdOn = q('otd') !== '0';
  const [otdOpen, setOtdOpen] = useState(false);
  const [dateRoll, setDateRoll] = useState(false);
  const slideKeys: string[] = [];
  const slides: ReactNode[] = [];
  if (warnings.length) {
    slideKeys.push('countercurrent');
    slides.push(<RitualSlab key="cc" icon={<WaveGlyph />} accent={P3R.magenta}
      title={<span style={{ color: 'var(--p3r-coral-ink)' }}>逆流预警</span>}
      sub={`${warnings.map((id) => ATTR_NAMES[id]).join('、')} 已连续3日无增长，明日将${warnings.length > 1 ? '各' : ''}扣减 1 点`} />);
  }
  slideKeys.push('astrology');
  slides.push(<RitualSlab key="astro" icon={<MoonGlyph />} onClick={() => navigate('astrology')}
    title={divination ? `${divination.name} · ${divination.orientation === 'upright' ? '正位' : '逆位'}` : '今日星象尚未展开'}
    sub={divination ? `${ATTR_NAMES[divination.attribute]} × ${divination.multiplier}${divination.advice ? ` · ${divination.advice}` : ''}` : '点击进入星象，从三张塔罗中抽取一张'} />);
  if (battleOn && MOCK_PERSONA_NAME) {
    slideKeys.push('battle');
    slides.push(<BattleSlab key="battle" state={(q('battle') as BattleState) || 'fight'} shadowTime={q('shadow') === '1'} persona={MOCK_PERSONA_NAME} onClick={() => navigate('battle')} />);
  }
  if (otdOn) {
    slideKeys.push('onthisday');
    slides.push(<RitualSlab key="otd" icon={<HourglassGlyph />} accent={P3R.magenta} title="一年前的今天" sub={onThisDaySub()} onClick={() => setOtdOpen(true)} />);
  }
  const slideParam = q('slide');
  const initialSlide = slideParam ? Math.max(0, slideKeys.indexOf(slideParam)) : undefined;

  // ── 人格指数 ──
  const starItems: StarItem[] = useMemo(() => ATTR_IDS.map((id) => {
    const a = MOCK_ATTRS.find((x) => x.id === id) ?? { id, name: ATTR_NAMES[id], points: 0, level: 1 };
    const stars = a.level >= MAX_LEVEL ? masteryOf(a.points)?.stars ?? 0 : 0;
    return { id, name: a.name, level: a.level, maxLevel: MAX_LEVEL, stars, title: stars > 0 ? masteryTitle(id, stars) : levelTitle(id, a.level) };
  }), [MOCK_ATTRS, ATTR_NAMES]);
  const attrParam = q('attr') as AttributeId | null;
  const [dossier, setDossier] = useState<AttributeId | null>(attrParam && ATTR_IDS.includes(attrParam) ? attrParam : null);
  const [ripples, setRipples] = useState<{ id: number; x: number; y: number }[]>([]);
  const starRef = useRef<HTMLDivElement>(null);
  const [introKey, setIntroKey] = useState(0);

  const stats = useMemo(() => ({
    totalPoints: MOCK_ATTRS.reduce((s, a) => s + a.points, 0),
    totalLevel: MOCK_ATTRS.reduce((s, a) => s + a.level, 0),
  }), [MOCK_ATTRS]);

  // ── 区块直达滚动 ──
  const refs = { tasks: useRef<HTMLElement>(null), ritual: useRef<HTMLElement>(null), persona: useRef<HTMLElement>(null), greet: useRef<HTMLDivElement>(null) };
  useEffect(() => {
    const sec = q('card') === 'bigdeal' ? 'tasks' : q('sec') ?? (attrParam ? 'persona' : null);
    const target = sec === 'tasks' ? refs.tasks : sec === 'ritual' || sec === 'stack' ? refs.ritual : sec === 'persona' ? refs.persona : null;
    if (!target?.current) return;
    const t = window.setTimeout(() => { const y = target.current!.getBoundingClientRect().top + window.scrollY - 16; window.scrollTo({ top: y }); if (q('anim') === '1') setIntroKey((k) => k + 1); }, 60);
    return () => clearTimeout(t);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const bg = q('bg');
  const bgStyles = (q('styles')?.split(',') as BgAnimStyle[] | undefined) ?? ['aurora', 'particles'];

  return (
    <div className="relative pb-6">
      {bg && <BgAnimLayer styles={bg === 'image' ? [] : bgStyles.slice(0, 2)} image={bg === 'image'} imageOpacity={Number(q('opacity') ?? 0.45) || 0.45} />}
      {!bg && <BlueHeroDecor />}
      <DateRollCutIn open={dateRoll} onClose={() => setDateRoll(false)} />
      <GhostWords words={['PERSONA', 'TERMINAL']} className="right-[10px] top-[10px] text-right text-[58px]" />
      <GhostWords words={['WILD HEART']} className="left-[104px] top-[336px] whitespace-nowrap text-[104px]" style={{ transform: 'rotate(90deg)', transformOrigin: 'left top' }} />

      {/* ── 页头 ── */}
      <header className="relative pt-4">
        <HomeBrandTitle />
        <p className="mt-2 text-[15px] font-bold" style={{ color: P3R.roseInk }}>{subtext}</p>
        <div className="mt-4 flex min-w-0 flex-wrap items-center gap-x-2.5 gap-y-2">
          {/* 蓝白 B7：点日期重播「日期推进」演出（每日首开 / 跨日同款，#/overlay/global-dateroll） */}
          <button type="button" aria-label="日期推进演出" onClick={() => setDateRoll(true)} className="flex items-center gap-x-2.5 active:scale-95">
            <span className="font-cond text-[58px] leading-none" style={{ color: P3R.blue }}>{now.getDate()}</span>
            <span className="flex flex-col gap-0.5 font-cond text-[14px] leading-none" style={{ color: P3R.roseInk }}><span>{MONTHS[now.getMonth()]}</span><span>{WEEKDAYS[now.getDay()]}</span></span>
          </button>
          {q('season') !== '0' && <SeasonStampChip collected={q('collected') === '1'} className="self-center" />}
          <span aria-hidden className="ml-1 h-10 w-[3px]" style={{ background: P3R.blue, transform: 'skewX(-24deg)' }} />
          <SkyBadge date={now} initial={q('sky') === 'weather' ? 'weather' : 'moon'} weather={(q('weather') as WeatherState) || 'ok'} />
        </div>
      </header>

      {/* ── 钉选宣言卡 / 倒计时（三态）── */}
      <div ref={refs.greet}>
        {pinned ? (
          <button type="button" onClick={jumpToCallingCard} className="mt-5 flex w-full items-center gap-3 px-5 py-3 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--p3r-blue)]"
            style={{ clipPath: slantClip(10), background: P3R.panel, boxShadow: 'var(--p3r-shadow)' }}>
            <span aria-hidden className="h-9 w-[4px] shrink-0" style={{ background: P3R.blue, transform: 'skewX(-20deg)' }} />
            <span className="min-w-0 flex-1">
              <span className="block text-[10px] font-black tracking-[0.18em]" style={{ color: P3R.grey }}>PINNED · 宣言</span>
              <span className="mt-0.5 block truncate text-[15px] font-black" style={{ color: P3R.ink }}>{pinned.title}</span>
              {pinned.subtitle && <span className="mt-0.5 block truncate text-[11px] font-semibold" style={{ color: P3R.inkSoft }}>{pinned.subtitle}</span>}
            </span>
            {daysLeft !== null ? (
              <span className="flex shrink-0 items-baseline gap-1">
                <span className="text-[11px] font-bold" style={{ color: P3R.inkSoft }}>剩</span>
                <span className="font-cond text-[30px] leading-none tabular" style={{ color: daysLeft <= 3 ? 'var(--p3r-coral-ink)' : P3R.blue }}>{daysLeft}</span>
                <span className="text-[11px] font-bold" style={{ color: P3R.inkSoft }}>天</span>
              </span>
            ) : <span aria-hidden className="shrink-0 text-lg font-black" style={{ color: P3R.blue }}>›</span>}
          </button>
        ) : greet === 'unpinned' ? (
          <button type="button" onClick={jumpToCallingCard} className="mt-5 flex w-full items-center gap-2.5 px-5 py-2.5 text-left text-[12px] font-bold"
            style={{ clipPath: slantClip(8), background: P3R.cyanFaint, color: P3R.inkSoft }}>
            <span className="min-w-0 flex-1 truncate">你有 {MOCK_UNPINNED_COUNT} 张倒计时未钉到主页</span><span aria-hidden style={{ color: P3R.blue }}>›</span>
          </button>
        ) : hintDismissed ? null : (
          <AnimatePresence>
            <motion.div exit={{ opacity: 0, height: 0 }} className="relative mt-5 flex w-full items-center gap-1 py-2.5 pl-5 pr-2 text-[12px] font-bold" style={{ color: P3R.inkSoft }}>
              {/* 虚线平行四边形框（clip 会吃掉 border → 用 SVG 画虚线描边） */}
              <svg aria-hidden viewBox="0 0 100 100" preserveAspectRatio="none" className="pointer-events-none absolute inset-0 h-full w-full overflow-visible">
                <polygon points="2.2,1 99.4,1 97.8,99 0.6,99" fill="none" stroke="rgb(var(--p3r-blue-rgb) / 0.45)" strokeWidth="1.5" strokeDasharray="5 4" vectorEffect="non-scaling-stroke" />
              </svg>
              <button type="button" onClick={jumpToCallingCard} className="relative flex min-w-0 flex-1 items-center gap-2.5 text-left">
                <span className="min-w-0 flex-1 truncate">还没有宣言卡——立下一个倒计时或目标宣言</span><span aria-hidden style={{ color: P3R.blue }}>›</span>
              </button>
              <button type="button" aria-label="不再提示" onClick={() => { try { localStorage.setItem('velvet_cc_hint_dismissed', '1'); } catch { /* */ } setHintDismissed(true); }}
                className="relative flex h-7 w-7 shrink-0 items-center justify-center text-base leading-none" style={{ color: P3R.grey }}>×</button>
            </motion.div>
          </AnimatePresence>
        )}
      </div>

      {/* ── 今日任务 ── */}
      <section ref={refs.tasks} className="mt-7 scroll-mt-4" aria-label="今日任务">
        <SectionMark tri title="今日任务" meta={
          <button type="button" onClick={() => navigate('actions', 'todos')} aria-label="查看全部任务" className="flex items-baseline gap-1.5 text-[14px] font-bold" style={{ color: P3R.roseInk }}>
            {total > 0 && <span className="font-cond text-[17px] tabular">{completed}<span className="mx-0.5" style={{ color: P3R.grey }}>/</span>{total}</span>}
            <span aria-hidden>›</span>
          </button>} />
        <div className="relative mt-3 flex items-stretch">
          <div className="relative min-h-[96px] min-w-0 flex-1" style={{ clipPath: slantClip(14), background: P3R.panel, boxShadow: 'var(--p3r-shadow)' }}>
            {todos.length === 0 ? (
              <div className="flex h-full min-h-[96px] items-center gap-2.5 pl-7 pr-5">
                <span aria-hidden className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: P3R.cyan }} />
                <span className="min-w-0 flex-1">
                  <span className="block text-[17px] font-black" style={{ color: P3R.ink }}>暂无待播行动</span>
                  <span className="block text-[12px] font-bold" style={{ color: P3R.grey }}>去「行动」页添加吧</span>
                </span>
                <button type="button" onClick={() => navigate('actions', 'todos')} className="shrink-0 px-3.5 py-2 text-[13px] font-black" style={{ clipPath: slantClip(8), background: P3R.blue, color: 'var(--p3r-on-blue)' }}>去添加 ›</button>
              </div>
            ) : (
              <div className="flex flex-col gap-0.5 py-3 pl-6 pr-3">
                {todos.map((t) => t.isBigDeal ? (
                  <BigDealHomeCard key={t.id} todo={t} highlight={q('card') === 'bigdeal'} onOpen={() => setDealOpen(true)} />
                ) : (
                  <TaskRow key={t.id} t={t} ripple={rowRipple?.startsWith(t.id) ? rowRipple : null} onTap={() => complete(t)} />
                ))}
              </div>
            )}
            {total > 0 && (
              <div aria-hidden className="absolute bottom-0 left-0 right-0 h-[5px]" style={{ background: 'rgb(var(--p3r-wash) / 0.9)' }}>
                <motion.div className="h-full origin-left" style={{ background: P3R.cyan }} initial={{ scaleX: 0 }} animate={{ scaleX: completed / total }} transition={{ duration: 0.5, ease: 'easeOut' }} />
              </div>
            )}
          </div>
        </div>
      </section>

      {/* ── 今日仪式 ── */}
      <section ref={refs.ritual} className="mt-7" aria-label="今日仪式">
        <SectionMark tri title="今日仪式" meta={<span className="text-[11px] font-bold" style={{ color: P3R.grey }}>滑动切换</span>} />
        <div className="mt-3">
          <StackCarousel page={initialSlide} autoPlayMs={slideParam ? 0 : 6000}>{slides}</StackCarousel>
        </div>
      </section>

      {/* ── 人格指数 ── */}
      <section ref={refs.persona} className="mt-7" aria-label="人格指数">
        <SectionMark tri title="人格指数" meta={<button type="button" onClick={() => navigate('statistics')} className="text-[14px] font-bold" style={{ color: P3R.roseInk }}>详细统计 <span aria-hidden>›</span></button>} />
        <div ref={starRef} className="relative min-h-[352px] overflow-hidden">
          <motion.div className="absolute inset-x-0 top-2 z-0" style={{ transformOrigin: 'center', pointerEvents: dossier ? 'none' : 'auto' }}
            animate={dossier ? { scale: 1.42, rotate: -122, x: '14%', y: '16%', opacity: 0.16 } : { scale: 1, rotate: 0, x: '0%', y: '0%', opacity: 1 }}
            transition={anim ? { type: 'spring', stiffness: 190, damping: 24 } : { duration: 0 }}>
            <StarChartP3 items={starItems} intro replayKey={introKey} showLabels={!dossier}
              onSelect={(id, e) => {
                const r = starRef.current?.getBoundingClientRect();
                if (r) setRipples((rs) => [...rs, { id: Date.now(), x: e.clientX - r.left, y: e.clientY - r.top }]);
                setDossier(id);
              }} />
          </motion.div>
          <motion.div className="relative z-10 overflow-hidden" initial={false} animate={{ height: dossier ? 'auto' : 0 }} transition={{ duration: anim ? 0.34 : 0, ease: [0.3, 0, 0.2, 1] }}>
            <AnimatePresence>{dossier && <AttrDetailInline key={dossier} attrId={dossier} onBack={() => setDossier(null)} />}</AnimatePresence>
          </motion.div>
          <AnimatePresence>
            {anim && ripples.map((rp) => (
              <motion.span key={rp.id} aria-hidden className="pointer-events-none absolute z-30 rounded-full"
                style={{ left: rp.x, top: rp.y, width: 250, height: 250, marginLeft: -125, marginTop: -125, border: `3px solid ${P3R.blue}`, background: 'radial-gradient(circle, rgb(var(--p3r-cyan-rgb) / 0.4) 0%, rgb(var(--p3r-blue-rgb) / 0) 70%)' }}
                initial={{ scale: 0.064, opacity: 0.85 }} animate={{ scale: 1, opacity: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.6, ease: 'easeOut' }}
                onAnimationComplete={() => setRipples((rs) => rs.filter((x) => x.id !== rp.id))} />
            ))}
          </AnimatePresence>
        </div>
      </section>

      {/* ── 四格统计条 ── */}
      <div className="mt-2 grid grid-cols-4 py-3.5" style={{ clipPath: slantClip(12), background: 'var(--p3r-statstrip)' }}>
        {[
          { v: stats.totalPoints, label: '累计点数', c: P3R.blue },
          { v: MOCK_STATS.totalActivities, label: '总记录数', c: P3R.blue },
          { v: stats.totalLevel, label: '总等级', c: P3R.blue },
          { v: MOCK_STATS.uniqueDays, label: '记录天数', c: 'var(--p3r-mint)' },
        ].map((s, i) => (
          <div key={s.label} className="flex min-w-0 flex-col items-center gap-1 px-1" style={i > 0 ? { borderLeft: '1px solid var(--p3r-statstrip-div)' } : undefined}>
            <span className="font-cond text-[clamp(22px,6.6vw,28px)] leading-none tabular" style={{ color: s.c }}>{s.v}</span>
            <span className="text-center text-[11px] font-bold leading-tight" style={{ color: P3R.inkSoft }}>{s.label}</span>
          </div>
        ))}
      </div>

      <h2 className="sr-only">{MOCK_USER_NAME || 'MASKARIA'}的面具庭园</h2>

      <BandCutInP3 isOpen={!!cutin} onClose={() => { setCutin(null); useAppStore.getState().setModalBlocker(false); }} title={cutin?.title ?? ''} totalPoints={cutin?.points} unlockHint={cutin?.hint ? { achievements: 1, skills: 0 } : { achievements: 0, skills: 0 }} />
      <UrgentToast text={toast} />
      <DecayModal attrs={decayed} onClose={() => setDecayed([])} />
      <OnThisDaySheetP3 isOpen={otdOpen} onClose={() => setOtdOpen(false)} />
      <OverlayByKey k="actions-bigdeal-panel" open={dealOpen} onClose={() => setDealOpen(false)} />
    </div>
  );
}

/** 任务行：斜切勾选框（完成 = 青底白勾）· 重要三角 · ✦今日抽签 · 一起进步 / 组织作战 / 截止标签 · 属性 +N · 计数 n/target · 完成波纹 */
const TaskRow = ({ t, onTap, ripple }: { t: MockTodo; onTap: () => void; ripple: string | null }) => {
  const { ATTR_NAMES } = useHomeData();
  const done = t.count >= t.target;
  const dl = t.deadline ? daysUntil(t.deadline) : null;
  const tag = (txt: string, tone: 'lilac' | 'rose' | 'coral') => (
    <span className="shrink-0 px-1.5 py-[2px] text-[10px] font-black leading-none" style={{ clipPath: slantClip(3), background: tone === 'lilac' ? 'rgb(var(--p3r-cyan-rgb) / 0.22)' : tone === 'rose' ? 'rgb(var(--p3r-blue-rgb) / 0.14)' : 'var(--bk-danger-wash)', color: tone === 'lilac' ? P3R.lilacInk : tone === 'rose' ? P3R.roseInk : 'var(--p3r-coral-ink)' }}>{txt}</span>
  );
  return (
    <button type="button" disabled={done} onClick={onTap} className={`relative flex w-full items-center gap-3 overflow-hidden px-1.5 py-2 text-left ${done ? 'cursor-not-allowed opacity-55' : ''}`}>
      {ripple && <motion.span key={ripple} aria-hidden className="pointer-events-none absolute left-2 top-1/2 h-10 w-10 -translate-y-1/2 rounded-full" style={{ background: 'rgb(var(--p3r-cyan-rgb) / 0.35)' }} initial={{ scale: 0.2, opacity: 1 }} animate={{ scale: 9, opacity: 0 }} transition={{ duration: 0.6, ease: 'easeOut' }} />}
      <span aria-hidden className="relative h-[18px] w-[18px] shrink-0" style={{ clipPath: slantClip(4), background: done ? P3R.cyan : 'rgb(var(--p3r-cyan-rgb) / 0.45)' }}>
        {!done && <span className="absolute inset-[2.5px]" style={{ clipPath: slantClip(3), background: P3R.panel }} />}
        {done && <svg viewBox="0 0 12 12" className="absolute inset-0 m-auto h-3 w-3" fill="none"><path d="M2 6l3 3 5-5" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>}
      </span>
      <span className="relative min-w-0 flex-1">
        <span className="flex min-w-0 flex-wrap items-center gap-x-1.5 gap-y-1">
          <span className="flex min-w-0 max-w-full items-center gap-1.5">
            {t.important && <span aria-label="重要" className="h-2 w-2 shrink-0" style={{ background: P3R.magenta, clipPath: 'polygon(50% 0, 100% 100%, 0 100%)' }} />}
            {t.fateDrawn && <span className="shrink-0 text-[11px] font-black" style={{ color: P3R.roseInk }} title="今日抽签选中">★</span>}
            <span className={`min-w-0 truncate text-[15px] font-black ${done ? 'line-through' : ''}`} style={{ color: done ? P3R.grey : P3R.ink }}>{t.title}</span>
          </span>
          {t.pact && tag(`一起进步 · ${t.pact.partner}`, 'lilac')}
          {t.orgOp && tag(`作战 · ${t.orgOp.org}`, 'rose')}
          {dl !== null && !done && tag(dl > 0 ? `剩 ${dl} 天` : dl === 0 ? '今天截止' : '已逾期', dl <= 2 ? 'coral' : 'rose')}
        </span>
        <span className="mt-0.5 block truncate text-[11px] font-semibold" style={{ color: P3R.grey }}>
          {ATTR_NAMES[t.attribute]} +{t.points}{t.extraBoosts?.map((b, i) => <span key={i}> · {ATTR_NAMES[b.attribute]} +{b.points}</span>)}
        </span>
        {t.frequency === 'count' && (
          <span aria-hidden className="mt-1 flex max-w-[160px] gap-[3px]">
            {Array.from({ length: t.target }).map((_, i) => <span key={i} className="h-[4px] flex-1" style={{ background: i < t.count ? P3R.cyan : 'var(--p3r-track)', clipPath: slantClip(2) }} />)}
          </span>
        )}
      </span>
      <span className="relative shrink-0 font-cond text-[14px] tabular" style={{ color: done ? P3R.lilacInk : P3R.grey }}>{t.count}/{t.target}</span>
    </button>
  );
};

