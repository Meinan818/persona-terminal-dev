/**
 * 首页 DashboardP5（真实 src/pages/p5/DashboardP5.tsx；视觉沿用 v3 已验收构图 pages/home.js + legacy/css/home.css）。
 * 按 FIXLIST 首页条目「应为」实现：
 *   P0-03 宣告卡提示条三态（①钉选 PINNED·宣言+剩N天 ②「你有 N 张倒计时未钉到主页 ›」③「为重要的事写一张宣告卡…」+× 不再提示
 *         → localStorage velvet_cc_hint_dismissed）。点击：sessionStorage velvet:todos-goal-panel=countdown 后进宣告卡页
 *         （用户更正：保留 v3 宣告卡页 #/p/callingcard；真实是跳 actions?tab=todos 的倒计时面，接入时以真实为准）。
 *   P0-04 日期纸卡「天空位」点按 = 月相 ⇄ 天气（模式记 localStorage；天气无数据源 → 「去设置天气 / SET UP」，?wx=ok 演示有数据态）；
 *         星期旁「岁时小签」（节气/节日当天，点开 home-season-stamp）；「当年今日」是仪式轮播里的一张，点它开 OnThisDaySheet。
 *   P0-05「今日仪式」= 横滑轮播（ritual-p5，全宽，autoPlay 6000ms）：逆流预警（有才出现，出现时跳回第一页）→ 星象（未抽/已抽）
 *         → BattleDashboardWidget → 当年今日。每张 = RitualSlabP5（v3 红幅 .hm-astro 语汇）。
 *   P0-06 人格星象下方 2×3 统计表格卡。
 *   P1-20 临期 Toast（钉选卡 ≤3 天，每卡每天一次，3.6s）/ 逆流侵蚀弹窗（?state=decay）。
 * 演示参数（底部 Dev 状态条）：?cc=pinned|unpinned|none  ?sky=weather[&wx=ok]  ?astro=drawn  ?state=empty|countercurrent|urgent|decay|back  ?fxq=1|mastery|plain（自动勾第一项看演出队列）
 *   ?season=1  ?otd=0  ?sec=tasks|ritual|persona|stats  ?slide=countercurrent|astrology|battle|onthisday  ?attr=<属性id>
 * 入场（§5）：MASKARIA 字砖砸落 spring 520/26 间隔 .06；分段 .12/.18/.22/.28/.34/.40；月相生长 .8s；剪影侧滑。
 */
import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import type { PageProps } from '@/p5r-red/registry/types';
import { shape } from '@/p5r-red/lib/shape';
import { rng } from '@/p5r-red/lib/rng';
import { isLowMotion } from '@/p5r-red/lib/prefs';
import { P5Sil } from '@/p5r-red/fx/sil';
import { PersonaRadar } from '@/p5r-red/fx/radar';
import { slamTiles, segIn } from '@/p5r-red/fx/motion';
import { P5StackCarousel } from '@/p5r-red/kit/P5StackCarousel';
import { P5Sparkle } from '@/p5r-red/kit/p5r';
import { DevStateBar } from '@/p5r-red/kit/DevStateBar';
import { goTo } from '@/p5r-red/shell/go';
import { navigate, openOverlay, pageHref } from '@/p5r-red/shell/shellBus';
import { sfx } from '@/p5r-red/fx/sfx';
import { ATTR, ATTR_ORDER, D, RANKS, shadowNow, type AttrId, type MockTodo } from '@/p5r-red/mock/data';
import { SeasonStampBadgeP5 } from '@/p5r-red/screens/overlays/SeasonStampBadge.chip';
import { OnThisDayGlyph, onThisDaySub, OTD_VIEW } from '@/p5r-red/screens/overlays/OnThisDaySheet.p5r';
import { playQueue, type QueueStep } from '@/p5r-red/screens/overlays/cutins.p5r';
import { completeRedTask } from '@/p5r-red/screens/taskGrowth';
import { BackToastP5, useBackToast } from '@/p5r-red/screens/overlays/GlobalToasts.p5r';
import { useAppStore, toLocalDateKey } from '@/store';
import { calcMaxStreak, streakDates } from '@/utils/streak';
import './DashboardP5.p5r.css';

const WD = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'], MON = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
const moon = () => { const syn = 29.530588853, ref = Date.UTC(2000, 0, 6, 18, 14); const age = (((Date.now() - ref) / 864e5) % syn + syn) % syn; const ill = Math.round((1 - Math.cos(2 * Math.PI * age / syn)) / 2 * 100); const names = ['新月', '娥眉月', '上弦月', '盈凸月', '满月', '亏凸月', '下弦月', '残月']; return { name: names[Math.floor((age / syn) * 8 + 0.5) % 8], ill, wax: age < syn / 2 }; };
const daysLeft = (k: string) => Math.max(0, Math.round((+new Date(k + 'T00:00:00') - +new Date(new Date().toDateString())) / 864e5));
const todayKey = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; };
/** 岁时（演示用小表：节气 / 节日当天才出小签；真实走 SeasonStampBadge 的 44 张表） */
const SEASON: Record<string, string> = { '10-23': '霜降', '11-07': '立冬', '11-22': '小雪', '12-07': '大雪', '12-21': '冬至', '01-01': '元旦', '09-23': '秋分', '10-08': '寒露' };

/** 实心星（v3 home.js star(cls, fill)） */
const Star = ({ cls = '', fill = 'currentColor' }: { cls?: string; fill?: string }) => <svg className={cls || undefined} viewBox="0 0 24 24" aria-hidden="true"><polygon points={shape.starPts(12, 12.8, 11.5)} fill={fill} /></svg>;

function Dots({ w, h, step, rMax, dir, cls }: { w: number; h: number; step: number; rMax: number; dir: 'tl' | 'br'; cls: string }) {
  const c: JSX.Element[] = [];
  for (let y = 0; y <= h; y += step) for (let x = (Math.round(y / step) % 2) * step / 2; x <= w; x += step) {
    const t = dir === 'tl' ? Math.min(1, (x / w + y / h) / 1.1) : Math.min(1, ((w - x) / w + (h - y) / h) / 1.1);
    const r = rMax * (1 - t); if (r > 0.45) c.push(<circle key={c.length} cx={x.toFixed(1)} cy={y.toFixed(1)} r={r.toFixed(2)} />);
  }
  return <svg className={cls} viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" aria-hidden="true">{c}</svg>;
}

function RansomTiles({ text }: { text: string }) {
  const r = rng(9), tones = ['ink', 'paper', 'ink', 'red', 'paper', 'ink', 'red', 'paper'];
  return (
    <div className="hm-ransom" role="img" aria-label={text}>
      {[...text].map((ch, i) => { const rot = ((r() - 0.5) * 16).toFixed(1), dy = ((r() - 0.5) * 8).toFixed(1), sc = (0.92 + r() * 0.16).toFixed(2);
        return <span key={i} className={`hm-tile ${tones[i % tones.length]}`} style={{ ['--r' as string]: `${rot}deg`, ['--y' as string]: `${dy}px`, ['--s' as string]: sc }}><b>{ch}</b></span>; })}
    </div>
  );
}

const MiniTarot = () => (
  <svg className="hm-tarot" viewBox="0 0 120 92" aria-hidden="true">
    {([[-14, 6, 0], [0, 26, 0], [14, 48, 4]] as const).map(([rot, x, y], i) => (
      <g key={i} transform={`translate(${x} ${y}) rotate(${rot} 22 34)`}>
        <rect x="0" y="0" width="44" height="68" fill="#111" /><rect x="3" y="3" width="38" height="62" fill={i === 2 ? '#F2E9DA' : '#D7000F'} />
        <rect x="7" y="7" width="30" height="54" fill="none" stroke={i === 2 ? '#111' : '#F2E9DA'} strokeWidth="2" />
        {i === 2 ? <><path d="M10 34 q12 -12 24 0 q-12 10 -24 0z" fill="#111" /><path d="M14 33 l5 -2 1 4z M30 33 l-5 -2 -1 4z" fill="#D7000F" /></> : <polygon points={shape.starPts(22, 34, 10)} fill="#F2E9DA" />}
      </g>
    ))}
  </svg>
);

const MaskSVG = ({ w = 120 }: { w?: number }) => (
  <svg className="hm-mask" width={w} viewBox="0 0 120 54" aria-hidden="true">
    <path d="M4 10 Q30 0 60 14 Q90 0 116 10 Q114 36 92 46 Q74 52 60 38 Q46 52 28 46 Q6 36 4 10Z" fill="#111" stroke="#F2E9DA" strokeWidth="3" strokeLinejoin="round" />
    <path d="M18 22 Q30 14 46 24 Q34 34 18 22Z M102 22 Q90 14 74 24 Q86 34 102 22Z" fill="#D7000F" />
    <path className="hm-mask-eye" d="M24 23 Q32 19 40 24 Q32 28 24 23Z M96 23 Q88 19 80 24 Q88 28 96 23Z" fill="#fff" />
  </svg>
);

/* ── 天空位（P0-04）：月相 ⇄ 天气。模式记 localStorage（真实记进 settings.skyMode） ── */
const SKY_KEY = 'p5r-demo:sky-mode';
const WeatherGlyphP5 = () => (
  <svg className="hm-wx" viewBox="0 0 40 40" aria-hidden="true"><rect x="1" y="1" width="38" height="38" fill="#111" /><circle cx="15" cy="15" r="6" fill="#D7000F" /><path d="M10 29 q-5 0 -5 -5 q0 -5 6 -5 q2 -6 9 -6 q8 0 9 7 q6 0 6 5 q0 4 -5 4z" fill="#F2E9DA" stroke="#111" strokeWidth="1.5" /></svg>
);
export function DateCardP5({ initialSky, wxOk, season, seasonCollected = false, seasonAutoOpen = false }: { initialSky?: 'moon' | 'weather'; wxOk?: boolean; season?: string | null; seasonCollected?: boolean; seasonAutoOpen?: boolean }) {
  const n = new Date(), m = moon();
  const [sky, setSky] = useState<'moon' | 'weather'>(() => initialSky ?? ((localStorage.getItem(SKY_KEY) as 'moon' | 'weather') || 'moon'));
  const [flip, setFlip] = useState(false);
  const toggle = () => {
    const next = sky === 'weather' ? 'moon' : 'weather';
    if (isLowMotion()) { setSky(next); localStorage.setItem(SKY_KEY, next); return; }
    setFlip(true); setTimeout(() => { setSky(next); localStorage.setItem(SKY_KEY, next); setFlip(false); }, 180);
  };
  return (
    <div className="hm-date hseg s1">
      <div className="hm-date-in">
        <div className="hm-quote">
          <button type="button" className={`hm-sky${flip ? ' flip' : ''}`} onClick={toggle} aria-label={sky === 'weather' ? '天气（点击切回月相）' : '月相（点击切到天气）'}>
            {sky === 'weather' ? <WeatherGlyphP5 /> : (
              <svg className="hm-moon" viewBox="0 0 40 40" aria-hidden="true"><rect x="1" y="1" width="38" height="38" fill="#111" /><circle cx="20" cy="20" r="13" fill="#2a2826" stroke="#F2E9DA" strokeWidth="2.5" /><circle className="moon-lit" cx="20" cy="20" r="11.5" fill="#F2E9DA" style={{ clipPath: `inset(0 ${m.wax ? 0 : 100 - m.ill}% 0 ${m.wax ? 100 - m.ill : 0}%)` }} /></svg>
            )}
          </button>
          <p>凝夜努力的人<br />终会发光</p>
        </div>
        <div className="hm-lunar">
          {sky === 'weather'
            ? (wxOk ? <><b>18°C 多云</b><span>FEELS 16°</span></> : <><b>去设置天气</b><span>SET UP</span></>)
            : <><b>{m.name}</b><span>LUNAR {m.ill}%</span></>}
        </div>
        <div className="hm-day">
          <em>{n.getDate()}</em><span><b>{MON[n.getMonth()]}</b><i>{WD[n.getDay()]}</i></span>
          {season && <SeasonStampBadgeP5 name={season} collected={seasonCollected} align="right" pop="above" autoOpen={seasonAutoOpen} />}
        </div>
      </div>
    </div>
  );
}

/* ── 宣告卡提示条三态（P0-03） ── */
const jumpToCallingCard = () => {
  try { sessionStorage.setItem('velvet:todos-goal-panel', 'countdown'); } catch { /* ignore */ }
  sfx('nav', 0.48);
  navigate('callingcard', { via: 'tear' });
};
function CallingCardBar({ mode }: { mode: 'pinned' | 'unpinned' | 'none' }) {
  const [dismissed, setDismissed] = useState(() => { try { return localStorage.getItem('velvet_cc_hint_dismissed') === '1'; } catch { return false; } });
  const pinned = D.callingCards.find((c) => c.pinned);
  if (mode === 'pinned' && pinned) {
    return (
      <div className="hm-pin nox hseg s2">
        <a className="hm-pin-card" href={pageHref('callingcard')} aria-label={`打开宣告卡：${pinned.title}`} onClick={(e) => { e.preventDefault(); jumpToCallingCard(); }}>
          <svg className="hm-pin-bg" viewBox="0 0 600 120" preserveAspectRatio="none" aria-hidden="true"><polygon points="0,62 34,18 560,4 548,-10 600,30 584,96 548,112 552,128 30,112" fill="var(--p5r-paper)" /><polygon points="8,62 40,24 556,12 590,34 576,92 36,106" fill="#111" /></svg>
          <i className="hm-pin-dot" aria-hidden="true"><Star fill="var(--p5r-red)" /></i>
          <span className="hm-pin-txt"><small>PINNED · 宣言</small><b>{pinned.title}</b></span>
          <span className="hm-pin-cd"><i>剩</i><em>{daysLeft(pinned.target)}</em><i>天</i></span>
        </a>
      </div>
    );
  }
  if (mode === 'unpinned') {
    const n = D.callingCards.length;
    return (
      <div className="hm-cc hseg s2">
        <button type="button" className="hm-cc-go" onClick={jumpToCallingCard}><P5Sparkle size={14} color="var(--red)" className="hm-cc-spark" /><span>你有 {n} 张倒计时未钉到主页</span><em aria-hidden="true">›</em></button>
      </div>
    );
  }
  if (dismissed) return null;
  return (
    <div className="hm-cc hseg s2">
      <button type="button" className="hm-cc-go" onClick={jumpToCallingCard}><P5Sparkle size={14} color="var(--red)" className="hm-cc-spark" /><span>为重要的事写一张「宣告卡」，倒计时随时在此映入眼帘</span></button>
      <button type="button" className="hm-cc-x" aria-label="不再提示" onClick={() => { try { localStorage.setItem('velvet_cc_hint_dismissed', '1'); } catch { /* */ } setDismissed(true); }}>×</button>
    </div>
  );
}

function TaskCard({ todos, onCheck }: { todos: MockTodo[]; onCheck: (t: MockTodo) => void }) {
  const done = todos.filter((x) => x.count >= x.target).length;
  return (
    <section className="hm-task hseg s3" aria-label="今日任务" id="sec-tasks">
      <div className="hm-tab"><span>今日任务</span><Star cls="hm-tab-star" /></div>
      <a className="hm-chip" href={pageHref('actions', { tab: 'todos' })} aria-label="去任务页" onClick={goTo('actions', 'water', 'todos')}>{todos.length ? todos.length + '项' : '暂无'}</a>
      <div className="hm-paper">
        <Dots w={220} h={150} step={11} rMax={5} dir="tl" cls="hm-dots tl" /><Dots w={240} h={120} step={11} rMax={5} dir="br" cls="hm-dots br" />
        <div className="hm-rows">
          {todos.length ? todos.slice(0, 4).map((x) => (
            <div key={x.id} className={`h-row ${x.count >= x.target ? 'done' : ''}`} data-id={x.id}>
              <button className="h-chk" aria-label={`完成 ${x.title}`} onClick={() => onCheck(x)}><svg viewBox="0 0 34 34"><path d="M5 17l8 9L31 4" fill="none" stroke="#D7000F" strokeWidth="6" strokeLinecap="square" /></svg></button>
              <span className="h-t">{x.important && <i className="h-imp">★</i>}{x.title}</span><span className="tag">{ATTR[x.attribute].name}+{x.points}</span><span className="h-c">{x.count}/{x.target}</span>
            </div>
          )) : (
            <div className="hm-empty"><svg viewBox="0 0 60 60" aria-hidden="true"><rect x="12" y="8" width="36" height="46" fill="#F2E9DA" stroke="#111" strokeWidth="4" /><path d="M20 22h20M20 32h16M20 42h10" stroke="#111" strokeWidth="4" /><polygon points={shape.starPts(46, 46, 12)} fill="#111" /></svg><p>今日暂无任务，去「任务」页添加吧</p></div>
          )}
        </div>
        {todos.length > 0 && <div className="h-prog"><span>今日进度</span><i><b style={{ width: `${Math.round(done / todos.length * 100)}%` }} /></i><em>{done}/{todos.length}</em></div>}
      </div>
    </section>
  );
}

/* ── 今日仪式（P0-05）：RitualSlabP5 = v3 红幅 .hm-astro 语汇 ── */
function RitualSlab({ icon, title, sub, trailing, onClick, cls = '' }: { icon?: ReactNode; title: ReactNode; sub?: ReactNode; trailing?: ReactNode; onClick?: () => void; cls?: string }) {
  return (
    <button type="button" className={`hm-astro hm-slab ${cls}`} onClick={onClick}>
      <i className="hm-astro-ico" aria-hidden="true">{icon ?? <Star fill="#F2E9DA" />}</i>
      <span className="hm-astro-txt"><b>{title}</b>{sub && <small>{sub}</small>}</span>
      {trailing ?? <i className="hm-astro-go" aria-hidden="true">›</i>}
    </button>
  );
}
/** BattleDashboardWidget 红频道（v3 .hm-bt 外观 + 真实文案：唤醒 Persona → / ★ 影时间 / 20:00 显形） */
function BattleSlab({ on }: { on: boolean }) {
  return (
    <a className={`hm-bt hm-slab${on ? ' on' : ''}`} href={pageHref('battle')} aria-label={on ? '逆影战场：影时间进行中' : '逆影战场'} onClick={goTo('battle', 'tear')}>
      <i className="hm-bt-ico" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M13.6 1.5 L5.2 13.4 h5.1 l-2 9.1 L17.1 10 h-5.2 Z" fill="#F2E9DA" /></svg></i>
      <span className="hm-bt-txt"><b>逆影战场</b><small>唤醒 Persona →</small></span>
      <span className={`hm-bt-tag${on ? ' on' : ''}`}>{on ? '★ 影时间' : '20:00 显形'}</span>
    </a>
  );
}
export type RitualKey = 'countercurrent' | 'astrology' | 'battle' | 'onthisday';
export function RitualCarouselP5({ countercurrent, drawn, onThisDay = true, battle = true, slide }: { countercurrent: boolean; drawn: boolean; onThisDay?: boolean; battle?: boolean; slide?: RitualKey }) {
  const slides: { k: RitualKey; el: ReactNode }[] = [];
  if (countercurrent) slides.push({ k: 'countercurrent', el: <RitualSlab cls="cc" icon={<em>🌊</em>} title="逆流预警" sub="胆量、魅力 已连续3日无增长，明日将各扣减 1 点" /> });
  slides.push({ k: 'astrology', el: <RitualSlab onClick={() => { sfx('nav', 0.48); navigate('astrology', { via: 'tear' }); }}
    title={drawn ? '太阳 · 正位' : '今日星象尚未展开'} sub={drawn ? '知识 × 1.5 · 把白天的专注留给最难的那件事' : '点击进入星象，从三张塔罗中抽取一张'}
    trailing={<><MiniTarot /><i className="hm-astro-go" aria-hidden="true">›</i></>} /> });
  if (battle) slides.push({ k: 'battle', el: <BattleSlab on={shadowNow()} /> });
  if (onThisDay) slides.push({ k: 'onthisday', el: <RitualSlab onClick={() => openOverlay('home-onthisday-sheet')} icon={<OnThisDayGlyph color="#F2E9DA" size={28} />} title="一年前的今天" sub={onThisDaySub(OTD_VIEW)} /> });
  // 预警 false→true：跳回第一页（真实 ritualPage=0 → 600ms 后释放）
  const [page, setPage] = useState<number | undefined>(undefined);
  const prev = useRef(countercurrent);
  useEffect(() => { const p = prev.current; prev.current = countercurrent; if (p || !countercurrent) return; setPage(0); const t = setTimeout(() => setPage(undefined), 600); return () => clearTimeout(t); }, [countercurrent]);
  const initial = Math.max(0, slides.findIndex((s) => s.k === slide));
  return (
    <P5StackCarousel id="ritual-p5" autoPlayMs={6000} page={page} initial={slide ? initial : 0}>
      {slides.map((s) => <div key={s.k}>{s.el}</div>)}
    </P5StackCarousel>
  );
}

function PersonaCard({ attr }: { attr?: AttrId }) {
  const top = ATTR_ORDER.reduce((a, b) => (D.attrs[a].level >= D.attrs[b].level ? a : b));
  return (
    <section className="hm-persona hseg s5" aria-label="人格星象" id="sec-persona">
      <div className="hm-ph">
        <div className="hm-tab red"><span>人格星象</span><Star cls="hm-tab-star" /></div>
        <a className="hm-stats" href={pageHref('statistics')} onClick={goTo('statistics', 'tear')}>详细统计 <b>→</b></a>
      </div>
      <div className="hm-top"><span className="hm-top-k">最高</span><span className="hm-top-n">{ATTR[top].name}</span><em>{D.attrs[top].level}</em><small>{RANKS[top][D.attrs[top].level - 1]}</small><span className="hm-top-hint">点维度看档案</span></div>
      <div className="h-radar"><PersonaRadar attrs={D.attrs} maxLevel={D.maxLevel} fitHeight initialAttr={attr} /></div>
    </section>
  );
}

/** 2×3 统计表格卡（P0-06；真实 stats useMemo） */
export function StatsTableP5() {
  const attributes = useAppStore((s) => s.attributes);
  const activities = useAppStore((s) => s.activities);
  const achievements = useAppStore((s) => s.achievements);
  const skills = useAppStore((s) => s.skills);
  const s = useMemo(() => {
    const totalPoints = attributes.reduce((a, x) => a + x.points, 0);
    const days = new Set(activities.map((a) => toLocalDateKey(new Date(a.date))));
    return [
      { v: totalPoints, label: '累计点数', c: 'var(--red)' }, { v: calcMaxStreak(streakDates(activities)), label: '最长连续天', c: 'var(--red)' }, { v: activities.length, label: '总记录数', c: 'var(--red)' },
      { v: achievements.filter((a) => a.unlocked).length, label: '成就已解锁', c: '#e06808' }, { v: skills.filter((x) => x.unlocked).length, label: '技能已解锁', c: '#111' }, { v: days.size, label: '记录天数', c: '#111' },
    ];
  }, [attributes, activities, achievements, skills]);
  return (
    <div className="hm-statgrid hseg s6" id="sec-stats">
      <div>{s.map((x) => <div className="c" key={x.label}><b style={{ color: x.c }}>{x.v}</b><span>{x.label}</span></div>)}</div>
    </div>
  );
}

/** 演出队列脚本（demo：按任务 id 决定是否升级 / 解锁；真实由 store 结算 levelUps / newAchievements / newSkills 决定） */
export function homeQueue(t: MockTodo, mode?: string | null): QueueStep[] {
  const a = ATTR[t.attribute].name, lv = D.attrs[t.attribute].level;
  const todo: QueueStep = { kind: 'todo', title: t.title, points: t.points, unlock: true };
  if (mode === 'plain' || t.id === 't5') return [{ ...todo, unlock: false } as QueueStep];
  if (mode === 'mastery' || t.id === 't3') return [todo, { kind: 'level', attr: a, level: D.maxLevel, stars: 2 }, { kind: 'skill', name: '博闻强识' }];
  return [todo, { kind: 'level', attr: a, level: lv + 1 }, { kind: 'achievement', name: '野生之心' }];
}

export default function DashboardP5({ wide, params }: PageProps) {
  const root = useRef<HTMLDivElement>(null);
  const st = params.get('state');
  const cc = (params.get('cc') as 'pinned' | 'unpinned' | 'none') || 'pinned';
  const drawn = params.get('astro') === 'drawn';
  const countercurrent = st === 'countercurrent' || params.get('slide') === 'countercurrent';
  const season = params.get('season') === '1' ? '霜降' : SEASON[todayKey().slice(5)] ?? null;
  const [todos, setTodos] = useState<MockTodo[]>(() => (st === 'empty' ? [] : D.todos.map((t) => ({ ...t }))));
  const check = (t: MockTodo) => {
    if (t.count >= t.target) return;
    setTodos((ts) => ts.map((x) => (x.id === t.id ? { ...x, count: x.count + 1 } : x)));
    void completeRedTask({ id: t.id, title: t.title, points: t.points, extra: t.extra }).then((result) => {
      if (!result.accepted) {
        setTodos((ts) => ts.map((x) => (x.id === t.id ? { ...x, count: t.count } : x)));
      }
    });
  };
  // 返回键 Toast（P1-19）：已在首页时按返回（demo：Esc，且没有弹层开着）→「再次点击回到现实」，2 秒内再按退出
  const back = useBackToast();
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key !== 'Escape' || document.querySelector('.oa-layer, .sheet-veil, .ob-dlg-veil')) return; back.press(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [back]);
  useEffect(() => { if (st === 'back') back.press(); }, [st]); // eslint-disable-line react-hooks/exhaustive-deps
  // ?fxq=1|mastery|plain：进入后自动勾第一项未完成任务，直接看演出队列
  useEffect(() => {
    if (!params.get('fxq')) return;
    const t = window.setTimeout(() => { const first = D.todos.find((x) => x.count < x.target); if (first) check(first); }, 900);
    return () => clearTimeout(t);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // 临期 Toast / 逆流侵蚀（P1-20）：真实为进入首页时按条件触发；demo 用 ?state= 触发
  useEffect(() => {
    const pinned = D.callingCards.find((c) => c.pinned);
    if (st === 'urgent' && pinned) openOverlay('home-urgent-toast');
    if (st === 'decay') openOverlay('home-decay-modal');
  }, [st]);

  // ?sec= 直达区块
  useEffect(() => {
    const sec = params.get('sec') ?? (params.get('attr') ? 'persona' : null); if (!sec) return;
    const t = setTimeout(() => document.getElementById(`sec-${sec}`)?.scrollIntoView({ block: 'start' }), 60);
    return () => clearTimeout(t);
  }, [params]);

  useEffect(() => {
    const eyes = root.current!.querySelectorAll('.hm-mask-eye');
    if (!eyes.length || isLowMotion()) return;
    let t = 0;
    const blink = () => { eyes.forEach((e) => e.animate([{ transform: 'scaleY(1)' }, { transform: 'scaleY(.1)' }, { transform: 'scaleY(1)' }], { duration: 180, easing: 'ease-in-out' })); t = window.setTimeout(blink, 2600 + Math.random() * 2400); };
    t = window.setTimeout(blink, 1800);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    if (isLowMotion()) return;
    const r = root.current!;
    const stops = [slamTiles(r.querySelectorAll('.hm-tile'), 0.06)];
    ([['.s1', 0.12], ['.s2', 0.18], ['.s3', 0.22], ['.s4', 0.28], ['.s5', 0.34], ['.s6', 0.4]] as const).forEach(([s, d]) => stops.push(segIn(r.querySelectorAll(s), d)));
    r.querySelectorAll<SVGCircleElement>('.moon-lit').forEach((m) => m.animate([{ clipPath: 'inset(0 0 0 100%)' }, { clipPath: getComputedStyle(m).clipPath }], { duration: 800, delay: 200, easing: 'cubic-bezier(.3,0,.2,1)', fill: 'backwards' }));
    r.querySelectorAll('.hm-sil,.hm-sil2').forEach((s, i) => s.animate([{ opacity: 0, transform: `translateX(${i % 2 ? -30 : 30}px)` }, { opacity: 1, transform: 'none' }], { duration: 520, delay: 460 + i * 60, easing: 'cubic-bezier(.16,1,.3,1)', fill: 'backwards' }));
    return () => stops.forEach((s) => s());
  }, []);

  const header = (
    <header className="hm-head hseg s0">
      <div className="hm-brand">
        <i className="hm-bigstar" aria-hidden="true"><Star fill="var(--p5r-red)" /></i>
        <div className="hm-sil" aria-hidden="true"><P5Sil name="leap" style={{ height: '100%', width: 'auto' }} /></div>
        <RansomTiles text="MASKARIA" />
        <div className="hm-sub"><b>面具</b> 庭园 <span>☆</span></div>
      </div>
      <DateCardP5 initialSky={params.get('sky') === 'weather' ? 'weather' : params.get('sky') === 'moon' ? 'moon' : undefined} wxOk={params.get('wx') === 'ok'} season={season} />
    </header>
  );
  const ccBar = <CallingCardBar mode={cc} />;
  const task = <TaskCard todos={todos} onCheck={check} />;
  const ritual = (
    <section className="hm-ritual hseg s4" aria-label="今日仪式" id="sec-ritual">
      <RitualCarouselP5 countercurrent={countercurrent} drawn={drawn} onThisDay={params.get('otd') !== '0'} slide={(params.get('slide') as RitualKey) || undefined} />
    </section>
  );
  const persona = <PersonaCard attr={(params.get('attr') as AttrId) || undefined} />;
  const bar = (
    <DevStateBar page="dashboard" items={[
      { label: '默认', q: '' }, { label: '宣告卡·未钉', q: 'cc=unpinned' }, { label: '宣告卡·无卡', q: 'cc=none' },
      { label: '天空·天气（未设置）', q: 'sky=weather' }, { label: '天空·天气（有数据）', q: 'sky=weather&wx=ok' }, { label: '岁时小签', q: 'season=1' },
      { label: '星象已抽', q: 'astro=drawn&slide=astrology' }, { label: '逆流预警', q: 'state=countercurrent' }, { label: '今日任务为空', q: 'state=empty' },
      { label: '临期 Toast', q: 'state=urgent' }, { label: '逆流侵蚀', q: 'state=decay' }, { label: '原地档案·知识', q: 'attr=knowledge&sec=persona' },
      { label: '返回键 Toast', q: 'state=back' }, { label: '演出队列（升级+成就）', q: 'fxq=1' }, { label: '演出队列（精通+技能）', q: 'fxq=mastery' },
    ]} />
  );

  return wide ? (
    <div className="home2 wd" ref={root}>
      <div className="hw-l">{header}{ccBar}{task}<BackToastP5 show={back.show} /></div>
      <div className="hw-r">{ritual}<div className="hm-maskrow"><MaskSVG w={110} /></div>{persona}<StatsTableP5 /></div>
      <div style={{ gridColumn: '1 / -1' }}>{bar}</div>
    </div>
  ) : (
    <div className="home2" ref={root}>
      {header}{ccBar}{task}{ritual}<BackToastP5 show={back.show} />
      <div className="hm-maskrow hseg s4">
        <div className="hm-sil2 l" aria-hidden="true"><P5Sil name="crouch" style={{ height: '100%', width: 'auto' }} /></div>
        <MaskSVG w={118} />
        <div className="hm-sil2 r" aria-hidden="true"><P5Sil name="cat" style={{ height: '100%', width: 'auto' }} /></div>
      </div>
      {persona}
      <StatsTableP5 />
      {bar}
    </div>
  );
}
