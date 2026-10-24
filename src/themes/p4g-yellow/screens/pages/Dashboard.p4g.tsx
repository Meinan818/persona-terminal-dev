/**
 * Dashboard.p4g —— 首页（真实 src/pages/Dashboard.tsx 的 P4 分支），只换 P4G 渲染，控件/入口一个不少：
 *   页头：TODAY'S SHOW 眉标、MASKARIA 大标题、岁时小签（气泡）、天空角标（月相 ⇄ 天气，翻牌）、大号日期+星期+时段+天气 HUD
 *   问候题板：时段问候（称呼缺省「朋友」）+ 副句；钉选宣告卡横条 / 占位（✕ 不再提示）/「你有 N 张倒计时未钉到主页」；今日进度 N/M
 *   今日任务：「N/M ›」→ 行动·任务；BIG DEAL 行 → 大事面板；任务行点完成（计数型逐次 +1）→ 今日完成 Cut-in
 *   今日仪式：逆流预警（条件置顶）/ 星象入口（未抽/已抽）/ 逆影战场入口 / 当年今日 → 抽屉
 *   人格指数：五角星（点维度 → 星旋转放大沉底 → 原地详情 → 点任意处复原）+「详细统计 ▶」+ 四格统计
 *   临期 Toast（宣告卡 ≤3 天，每天一次）、逆流侵蚀弹窗
 *
 * 演示参数：?state=empty|loading|error  ?greet=card|empty|unpinned  ?sky=moon|weather  ?wx=ok|unset|config|error|loading
 *   ?weather=sunny|cloudy|rain|fog|snow|thunder  ?attr=<knowledge|guts|dexterity|kindness|charm>  ?sec=tasks|ritual|persona
 *   ?slide=countercurrent|astrology|battle|onthisday  ?astro=drawn  ?cc=0（关逆流预警） ?decay=1  ?toast=1  ?bg=anim|image|none
 */
import { useEffect, useMemo, useState } from 'react';
import type { AttributeId } from '@real/types';
import type { PageProps } from '@yellow/registry/types';
import { P4Section, P4Loading, P4ErrorState, type P4Weather } from '@yellow/kit';
import { CollageStagger, CollageItem } from '@yellow/fx';
import { navigate } from '@yellow/shell/shellBus';
import { cx } from '@yellow/lib/cx';
import { OverlayByKey, Sparkle4 } from '@yellow/screens/pkg1/bits';
import { PersonaStarSection, type StarItem } from '@yellow/screens/pkg1/PersonaStar';
import { StageDecor, BackgroundAnim, BackgroundImage } from '@yellow/screens/pkg1/StageLayers';
import {
  DashHeader, GreetingPlate, PanelFrame, BigDealRow, TaskRow, TasksEmpty, RitualCarousel, CountercurrentSlide, AstrologySlide, BattleSlide, OnThisDaySlide, StatCircles,
  type GreetMode, type SkyWx, type RitualSlide,
} from '@yellow/screens/pkg1/DashboardParts';
import { TodoCompleteP4G } from '@yellow/screens/overlays/TodoCompleteModal.p4g';
import { OnThisDaySheetP4G } from '@yellow/screens/overlays/OnThisDaySheet.p4g';
import { DecayModalP4G } from '@yellow/screens/overlays/DashboardDecayModal.p4g';
import { UrgentToastP4G, urgentText } from '@yellow/screens/overlays/DashboardToasts.p4g';
import { ATTR_IDS, levelTitle, masteryOf, masteryTitle } from '@yellow/mock/pkg1';
import { homeOps, useHomeData } from '@/themes/homeData';
import { useAppStore } from '@/store';

const GREETINGS: Record<string, string[]> = {
  dawn: ['n，新的一天开始了', 'n，晨光已到，起身了', 'n，早安，今天也要加油', 'n，清晨的空气真好'],
  morning: ['n，上午好呀', 'n，精神抖擞地来了', 'n，今天也是充满可能的一天', 'n，感觉今天会很顺利'],
  noon: ['n，午安', 'n，吃饭了吗', 'n，中午好，休息一下吧', 'n，下午前先补充点能量'],
  afternoon: ['n，下午好', 'n，继续保持状态', 'n，距离傍晚还有一段时光', 'n，喝点水，动一动'],
  dusk: ['n，傍晚好', 'n，今天辛苦了', 'n，夕阳西下，你还在努力', 'n，快到收工时间了'],
  evening: ['n，晚上好', 'n，夜幕降临了', 'n，今天过得怎么样', 'n，享受安静的夜晚吧'],
  night: ['n，还没睡呀', 'n，夜深了，注意休息', 'n，深夜的努力有人看见', 'n，该去睡觉了'],
};
const SUBTEXTS: Record<string, string[]> = {
  dawn: ['🌅 新的一天，从现在开始', '🌄 破晓时分，充满希望', '🌿 清晨最是宝贵的时光', '☀️ 早起的鸟儿有虫吃'],
  morning: ['☀️ 上午阳光正好，继续加油', '🍵 来杯茶，开始高效的上午', '💪 今天的努力从这里出发', '🎯 专注一件事，今天就够了'],
  noon: ['🍽️ 记得好好吃饭休息', '😴 午休一会儿，下午更清醒', '🌞 日正当中，能量满格', '🥗 犒劳一下自己吧'],
  afternoon: ['🌤️ 喝杯水，起来活动一下', '📖 下午适合深度学习', '🎵 放首歌，找回状态', '🌿 离目标又近了一步'],
  dusk: ['🌇 今天的努力都算数', '🌆 收获感悟的黄金时刻', '🍊 傍晚散个步，清空思绪', '✨ 夕阳下的你格外有魅力'],
  evening: ['🌙 享受宁静的夜晚时光', '📝 记录今天的收获吧', '🕯️ 夜晚适合沉淀与反思', '🎮 适当放松，明天更精彩'],
  night: ['🌟 注意休息，明天继续', '🌙 夜深了，给自己点掌声', '💫 深夜努力的人终会发光', '🛌 好好睡一觉，明天见'],
};
const slotOf = (h: number) => (h >= 5 && h < 9 ? 'dawn' : h < 12 && h >= 9 ? 'morning' : h >= 12 && h < 14 ? 'noon' : h >= 14 && h < 17 ? 'afternoon' : h >= 17 && h < 19 ? 'dusk' : h >= 19 && h < 22 ? 'evening' : 'night');
const seed = Math.random();
const pick = (a: string[]) => a[Math.floor(seed * a.length)];

export default function Dashboard({ params }: PageProps) {
  const { ATTR_NAMES, MOCK_ACHIEVEMENTS, MOCK_ATTRIBUTES, MOCK_COUNTERCURRENT, MOCK_STATS, MOCK_TODOS, MOCK_USER_NAME } = useHomeData();
  const state = params.get('state');
  const [sky, setSky] = useState<'moon' | 'weather'>(params.get('sky') === 'weather' ? 'weather' : 'moon');
  const wx = (params.get('wx') as SkyWx) || 'ok';
  const weather = (params.get('weather') as P4Weather) || 'rain';
  const greet = (params.get('greet') as GreetMode) || 'card';
  const empty = state === 'empty';
  const [counts, setCounts] = useState<Record<string, number>>(() => Object.fromEntries(MOCK_TODOS.map((t) => [t.id, t._count])));
  const [selected, setSelected] = useState<AttributeId | null>((params.get('attr') as AttributeId) || null);
  const [completed, setCompleted] = useState<{ title: string; pts: number; hint?: { achievements: number; skills: number } } | null>(null);
  useEffect(() => () => useAppStore.getState().setModalBlocker(false), []);
  const [otdOpen, setOtdOpen] = useState(false);
  const [dealOpen, setDealOpen] = useState(false);
  const [decay, setDecay] = useState(params.get('decay') === '1');
  const [toast, setToast] = useState<string | null>(null);
  const bg = params.get('bg');

  // 临期 Toast：每张卡每天最多一次（真实用 localStorage 节流；demo 用 sessionStorage，?toast=1 强制）
  useEffect(() => {
    if (empty || greet !== 'card') return;
    const k = `p4g-demo:cc-urgent:${new Date().toDateString()}`;
    try {
      if (params.get('toast') !== '1' && sessionStorage.getItem(k) === '1') return;
      sessionStorage.setItem(k, '1');
    } catch { /* ignore */ }
    const t = window.setTimeout(() => setToast(urgentText(3)), 700);
    return () => clearTimeout(t);
  }, []); // eslint-disable-line

  useEffect(() => {
    const sec = params.get('sec');
    if (!sec) return;
    const t = window.setTimeout(() => document.getElementById(`home-${sec}`)?.scrollIntoView({ block: 'start', behavior: 'smooth' }), 350);
    return () => clearTimeout(t);
  }, []); // eslint-disable-line

  const todos = empty ? [] : MOCK_TODOS;
  const tickable = todos.filter((t) => !t.isBigDeal);
  const target = (t: (typeof todos)[number]) => (t.frequency === 'count' ? t.targetCount || 1 : 1);
  const doneCount = tickable.filter((t) => (counts[t.id] ?? 0) >= target(t)).length;

  const starItems: StarItem[] = useMemo(() => MOCK_ATTRIBUTES.map((a) => {
    const stars = a.level >= 10 ? masteryOf(a.points)?.stars ?? 0 : 0;
    return { id: a.id, name: ATTR_NAMES[a.id], level: a.level, maxLevel: a.levelThresholds.length || 5, stars, points: a.points, title: stars > 0 ? masteryTitle(a.id, stars) : levelTitle(a.id, a.level) };
  }), []);
  const totalPoints = MOCK_ATTRIBUTES.reduce((s, a) => s + a.points, 0);
  const totalLevel = MOCK_ATTRIBUTES.reduce((s, a) => s + a.level, 0);

  const ccOn = params.get('cc') !== '0';
  const slides: RitualSlide[] = [];
  if (ccOn && MOCK_COUNTERCURRENT.length) slides.push({ key: 'countercurrent', node: <CountercurrentSlide attrs={MOCK_COUNTERCURRENT} /> });
  slides.push({ key: 'astrology', node: <AstrologySlide drawn={params.get('astro') === 'drawn'} /> });
  slides.push({ key: 'battle', node: <BattleSlide inShadow awakened /> });
  slides.push({ key: 'onthisday', node: <OnThisDaySlide onOpen={() => setOtdOpen(true)} /> });
  const slideParam = params.get('slide');
  const initialSlide = Math.max(0, slides.findIndex((s) => s.key === slideParam));

  const tick = (id: string) => {
    const t = todos.find((x) => x.id === id)!;
    const tg = target(t);
    if ((counts[id] ?? 0) >= tg) return;
    const next = Math.min(tg, (counts[id] ?? 0) + 1);
    const willComplete = next >= tg;
    if (willComplete) useAppStore.getState().setModalBlocker(true);
    setCounts((c) => ({ ...c, [id]: next }));
    void homeOps.completeTodo(id).then((result) => {
      if (!result) {
        if (willComplete) useAppStore.getState().setModalBlocker(false);
        setCounts((c) => ({ ...c, [id]: counts[id] ?? 0 }));
        return;
      }
      if (!result.completed) return;
      const pts = t.points + (t.extraBoosts?.reduce((sum, boost) => sum + boost.points, 0) ?? 0);
      setCompleted({ title: t.title, pts, hint: result.unlockHints });
    }).catch(() => {
      if (willComplete) useAppStore.getState().setModalBlocker(false);
      setCounts((c) => ({ ...c, [id]: counts[id] ?? 0 }));
    });
  };

  if (state === 'loading') return <div className="flex min-h-[60vh] items-center justify-center"><P4Loading label="信号接收中" /></div>;
  if (state === 'error') return <div className="flex min-h-[60vh] items-center justify-center"><P4ErrorState message="首页数据没读出来，再试一次。" onRetry={() => navigate('dashboard', undefined, { transition: 'noise', replace: true })} /></div>;

  const h = new Date().getHours();
  return (
    <>
      <StageDecor />
      {bg === 'anim' && <BackgroundAnim kinds={['aurora', 'particles']} />}
      {bg === 'image' && <BackgroundImage opacity={0.3} />}
      <div className="relative z-[1] min-w-0">
        <CollageStagger className="flex min-w-0 flex-col gap-5">
          <CollageItem><DashHeader weather={weather} sky={sky} setSky={setSky} wx={wx} temp={17} /></CollageItem>
          <CollageItem tilt={0}>
            <GreetingPlate subtext={pick(SUBTEXTS[slotOf(h)])} greeting={pick(GREETINGS[slotOf(h)]).replace('n', MOCK_USER_NAME || '朋友')} mode={greet} completed={doneCount} total={tickable.length} />
          </CollageItem>

          <div className="grid min-w-0 grid-cols-1 items-start gap-5 wide:grid-cols-2">
            <CollageItem>
              <div id="home-tasks" className="scroll-mt-4">
                <PanelFrame title="今日任务" en="TODAY'S PROGRAM" right={
                  <button type="button" aria-label="查看全部任务" onClick={() => navigate('actions', 'todos')} className="shrink-0 rounded-pill bg-p4g-black px-2.5 py-0.5 p4g-num text-meta text-p4g-yellow p4g-press">
                    {tickable.length === 0 ? '0 项' : `${doneCount}/${tickable.length}`} ›
                  </button>
                }>
                  {todos.length === 0 ? <TasksEmpty /> : (
                    <div className="grid grid-cols-1">
                      {todos.map((t, i) => t.isBigDeal
                        ? <BigDealRow key={t.id} todo={t} onOpen={() => setDealOpen(true)} />
                        : <TaskRow key={t.id} todo={t} index={i} count={counts[t.id] ?? 0} onTick={() => tick(t.id)} />)}
                    </div>
                  )}
                </PanelFrame>
              </div>
            </CollageItem>
            <CollageItem>
              <div id="home-ritual" className="scroll-mt-4">
                <PanelFrame title="今日仪式" en="DAILY RITUAL" right={<Sparkle4 size={14} color="var(--p4g-orange)" className="shrink-0" />}>
                  <RitualCarousel slides={slides} initial={initialSlide} />
                </PanelFrame>
              </div>
            </CollageItem>
          </div>

          <CollageItem>
            <div id="home-persona" className="scroll-mt-4">
              <P4Section title="人格指数" en="SOCIAL STATS" action={
                <button type="button" onClick={() => navigate('statistics')} className="font-display text-meta font-bold text-[color:var(--p4g-on-stage)] underline-offset-2 hover:underline">详细统计 ▶</button>
              }>
                <div className={cx('mx-auto w-full', selected ? 'max-w-[720px]' : 'max-w-[460px]')}>
                  <PersonaStarSection items={starItems} attributes={MOCK_ATTRIBUTES} achievements={MOCK_ACHIEVEMENTS} selected={selected} onSelectedChange={setSelected} />
                </div>
                <StatCircles items={[
                  { v: totalPoints, label: '累计点数', c: 'var(--p4g-orange)' },
                  { v: MOCK_STATS.totalActivities, label: '总记录数', c: 'var(--p4g-green)' },
                  { v: totalLevel, label: '总等级', c: 'var(--p4g-cyan)' },
                  { v: MOCK_STATS.uniqueDays, label: '记录天数', c: 'var(--p4g-purple)' },
                ]} />
              </P4Section>
            </div>
          </CollageItem>
        </CollageStagger>
      </div>

      <TodoCompleteP4G open={!!completed} onClose={() => { setCompleted(null); useAppStore.getState().setModalBlocker(false); }} title={completed?.title ?? ''} totalPoints={completed?.pts ?? 0} unlockHint={completed?.hint} />
      <OnThisDaySheetP4G open={otdOpen} onClose={() => setOtdOpen(false)} />
      <DecayModalP4G open={decay} onClose={() => setDecay(false)} attrs={['guts', 'kindness']} />
      <UrgentToastP4G text={toast} onDone={() => setToast(null)} />
      <OverlayByKey k="actions-bigdeal-panel" open={dealOpen} onClose={() => setDealOpen(false)} fallbackLabel="大事面板" />
    </>
  );
}

export { ATTR_IDS };
