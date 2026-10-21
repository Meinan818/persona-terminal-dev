/**
 * 行动 · 记录子视图 Activities（真实 src/pages/Activities.tsx 的 p5 分支；宿主 = pkg4 的 Actions.p5r.tsx 壳，切换头在壳里）。
 * 导出约定：`export default function Activities(props: PageProps & { tabs?: ReactNode })`（= Actions 壳的 ActionsSubViewProps）——
 *   Actions 壳 import.meta.glob + lazy 引用，把 PageProps 原样传入并附 tabs（切换头节点）；本组件把 tabs 放进页头 .t-hd.act-hd（同 v3），
 *   不渲染舞台；只渲染子视图内容 + 右下 FAB（portal）+ 本页弹层。无 tabs 时（#/p/activities-preview）不画页头。
 * 按 P0-08 / P1-01~03 重排：选项行（✦ 成长总结〔草稿 / 书写中 / 红点〕）→ 搜索「搜索记录内容…」→ 日历 / 筛选 + 已选筛选签 + 清除全部
 *   → 日历视图（月切换、年月浮层、重要事件点、选中日记录）/ 筛选面板（属性多选 / 来源 / 时间 / 仅显示重要记录）
 *   → 按月折叠、按日分组的列表（v3 黑长条 .ac-item；长按 = ActionSheet → 两段式删除；缩略图点开 ImageLightbox）
 *   → 右下 P5StarFab（红；日历选中过去 7 天内某天 = 橙「补」→ 补录历史记录）。
 * 直达参数：?view=calendar|filter  &picker=1  &sel=<相对今天的天数，如 -2>  ?state=empty|filtered  ?sheet=1|backdate  ?menu=1  ?del=1
 *   ?summary=draft|running|dot
 */
import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import type { PageProps } from '@/p5r-red/registry/types';
import { Portal } from '@/p5r-red/kit/Portal';
import { P5Empty } from '@/p5r-red/kit/P5States';
import { P5Switch } from '@/p5r-red/kit/P5Switch';
import { P5Mask } from '@/p5r-red/kit/P5Mask';
import { P5StarFab, P5Star } from '@/p5r-red/kit/p5r';
import { useLongPress } from '@/p5r-red/kit/useLongPress';
import { DevStateBar } from '@/p5r-red/kit/DevStateBar';
import { isLowMotion } from '@/p5r-red/lib/prefs';
import { sfx } from '@/p5r-red/fx/sfx';
import { openOverlay } from '@/p5r-red/shell/shellBus';
import { ATTR, ATTR_ORDER, type AttrId } from '@/p5r-red/mock/data';
import { ACTIVITIES, METHOD_FILTER_OPTIONS, localKey, type MethodFilter, type MockActivity } from '@/p5r-red/mock/pkg5-data';
import { ActivityRecordSheet } from '@/p5r-red/screens/overlays/ActivityRecordSheet.p5r';
import { ActivitiesRecordMenu } from '@/p5r-red/screens/overlays/ActivitiesRecordMenu.p5r';
import { ActivitiesDeleteConfirm } from '@/p5r-red/screens/overlays/ActivitiesDeleteConfirm.p5r';
import { OTD_VIEW } from '@/p5r-red/screens/overlays/OnThisDaySheet.p5r';
import '../pkg5.p5r.css';

const WEEKDAYS = ['日', '一', '二', '三', '四', '五', '六'];
const MONTH_EN = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const SUMMARY_SHAPE = 'polygon(7px 0, 100% 2px, calc(100% - 6px) 100%, 0 calc(100% - 3px))';
const offKey = (n: number) => { const d = new Date(); d.setDate(d.getDate() + n); return localKey(d); };
const ptsOf = (a: MockActivity) => Object.values(a.pointsAwarded).reduce((s, v) => s + (v ?? 0), 0);
const isSpecial = (a: MockActivity) => !!(a.important || a.levelUps?.length || a.category === 'achievement_unlock' || a.category === 'skill_unlock');

/* ── 日历视图（CalendarView + 年月跳转浮层 showPicker） ── */
function CalendarView({ acts, selected, onSelect, pickerInit }: { acts: MockActivity[]; selected: string | null; onSelect: (k: string | null) => void; pickerInit?: boolean }) {
  const today = new Date();
  const [vy, setVy] = useState(today.getFullYear()), [vm, setVm] = useState(today.getMonth());
  const [picker, setPicker] = useState(!!pickerInit), [py, setPy] = useState(vy);
  const [showImp, setShowImp] = useState(() => { try { return localStorage.getItem('cal-show-important') !== '0'; } catch { return true; } });
  const { map, imp } = useMemo(() => {
    const m = new Map<string, number>(), s = new Set<string>();
    acts.forEach((a) => { const d = new Date(a.date); if (d.getFullYear() !== vy || d.getMonth() !== vm) return; const k = localKey(d); m.set(k, (m.get(k) ?? 0) + ptsOf(a)); if (isSpecial(a)) s.add(k); });
    return { map: m, imp: s };
  }, [acts, vy, vm]);
  const maxPts = Math.max(1, ...map.values());
  const first = new Date(vy, vm, 1).getDay(), dim = new Date(vy, vm + 1, 0).getDate();
  const cells: (number | null)[] = [...Array(first).fill(null), ...Array.from({ length: dim }, (_, i) => i + 1)]; while (cells.length % 7) cells.push(null);
  const step = (d: number) => { let y = vy, m = vm + d; if (m < 0) { m = 11; y--; } if (m > 11) { m = 0; y++; } setVy(y); setVm(m); onSelect(null); };
  const todayK = localKey(today);
  const selActs = selected ? acts.filter((a) => localKey(new Date(a.date)) === selected) : [];
  return (
    <section className="act5-cal" aria-label="日历">
      <div className="act5-cal-hd">
        <button type="button" className="act5-cal-nav" aria-label="上个月" onClick={() => step(-1)}>‹</button>
        <button type="button" className="act5-cal-title" aria-expanded={picker} onClick={() => { setPy(vy); setPicker((v) => !v); }}>
          <small>{MONTH_EN[vm]} {vy}</small><b>{vy}年{vm + 1}月<i className={picker ? 'up' : ''} aria-hidden="true">▾</i></b>
        </button>
        <button type="button" className="act5-cal-nav" aria-label="下个月" onClick={() => step(1)}>›</button>
      </div>
      {picker && (
        <div className="act5-picker" role="dialog" aria-label="年月跳转">
          <div className="act5-pk-y"><button type="button" aria-label="上一年" onClick={() => setPy(py - 1)}>‹</button><b>{py} 年</b><button type="button" aria-label="下一年" onClick={() => setPy(py + 1)}>›</button></div>
          <div className="act5-pk-m">{Array.from({ length: 12 }, (_, i) => (
            <button key={i} type="button" aria-pressed={py === vy && i === vm} onClick={() => { setVy(py); setVm(i); onSelect(null); setPicker(false); }}>{i + 1}月<small>{MONTH_EN[i]}</small></button>
          ))}</div>
          <div className="act5-pk-ft">
            <button type="button" className="act5-pk-today" onClick={() => { setVy(today.getFullYear()); setVm(today.getMonth()); onSelect(todayK); setPicker(false); }}>回到今天</button>
            <label className="act5-pk-imp"><span><i aria-hidden="true" />在日历上显示重要事件</span><P5Switch on={showImp} label="在日历上显示重要事件" onChange={(v) => { setShowImp(v); try { localStorage.setItem('cal-show-important', v ? '1' : '0'); } catch { /* */ } }} /></label>
          </div>
        </div>
      )}
      <div className="act5-cal-wd">{WEEKDAYS.map((w, i) => <b key={w} className={i === 0 || i === 6 ? 'we' : ''}>{w}</b>)}</div>
      <div className="act5-cal-grid">{cells.map((d, i) => {
        if (d === null) return <i key={`e${i}`} />;
        const k = `${vy}-${String(vm + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`, pts = map.get(k) ?? 0, sat = pts ? Math.min(1, 0.15 + (pts / maxPts) * 0.85) : 0;
        const wd = (first + d - 1) % 7;
        return (
          <button key={k} type="button" className={`${k === selected ? 'sel' : ''} ${k === todayK ? 'today' : ''} ${wd === 0 || wd === 6 ? 'we' : ''}`} aria-pressed={k === selected} aria-label={`${vm + 1}月${d}日${pts ? `，+${pts}` : ''}`} onClick={() => onSelect(selected === k ? null : k)}>
            {imp.has(k) && showImp && <span className="act5-imp" aria-hidden="true"><P5Star size={9} fill="var(--yellow)" /></span>}
            <b>{d}</b>
            <span className="act5-slot">{k === selected && pts > 0 ? <em>+{pts}</em> : pts > 0 ? <i style={{ width: 4 + sat * 4, height: 4 + sat * 4, opacity: 0.35 + sat * 0.65 }} /> : null}</span>
          </button>
        );
      })}</div>
      {selected && (
        <div className="act5-cal-day">
          {selActs.length ? <>
            <small>{selected.replace(/-/g, '/')} 的记录</small>
            {selActs.map((a) => <p key={a.id}><time>{new Date(a.date).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })}</time><span>{a.description}</span>{ptsOf(a) > 0 && <em>+{ptsOf(a)}</em>}</p>)}
          </> : <p className="none">这天暂无记录</p>}
        </div>
      )}
    </section>
  );
}

/* ── 列表卡（长按 = 菜单） ── */
function RecordItem({ a, i, onMenu }: { a: MockActivity; i: number; onMenu: (a: MockActivity) => void }) {
  const lp = useLongPress(() => { navigator.vibrate?.(10); onMenu(a); });
  const ach = a.category === 'achievement_unlock', sk = a.category === 'skill_unlock';
  return (
    <div className={`ac-item act5-item${lp.pressing ? ' pressing' : ''}${a.important ? ' imp' : ''}`} style={{ ['--r' as string]: `${i % 2 ? 0.8 : -0.8}deg` }} {...lp.handlers}
      onContextMenu={(e) => { e.preventDefault(); onMenu(a); }} tabIndex={0} onKeyDown={(e) => { if (e.key === 'ContextMenu' || (e.shiftKey && e.key === 'F10')) onMenu(a); }} aria-label={`${a.description}（长按打开菜单）`}>
      <p className="ac-t act5-t">{a.backfilled && <span className="act5-bf" title="回归时补记">补</span>}{a.important && <span className="act5-star" aria-label="重要">★</span>}{a.description}</p>
      {!!a.images && <div className="act5-thumbs">{Array.from({ length: a.images }, (_, j) => (
        <button key={j} type="button" aria-label={`看图 ${j + 1}`} onPointerDown={(e) => e.stopPropagation()} onClick={() => openOverlay('actions-image-lightbox', { index: String(j) })}><i style={{ background: ['var(--red)', '#2a2826', '#8e0010'][j % 3] }} /></button>
      ))}</div>}
      <div className="act5-meta">
        {a.category === 'confidant' && <span className="tag ink">✧ 同伴</span>}
        {a.category === 'shadow_defeat' && <span className="tag">👁 Shadow击破{a.important ? ' ★首杀' : ''}</span>}
        {a.method === 'todo' && <span className="tag paper">✓ 任务</span>}
        {a.category === 'weekly_goal' && <span className="tag paper">🏆 本周目标</span>}
        {a.levelUps?.map((lu, k) => <span key={k} className="tag act5-lv">🎉 {ATTR[lu.attribute].name} {lu.fromLevel}→{lu.toLevel}</span>)}
        {sk && <span className="tag line">✨ 技能解锁</span>}
        {ach && <span className="tag act5-ach">🏆 成就解锁</span>}
        {a.category === 'calling_card_clear' && <span className="tag">✦ 倒计时</span>}
        {Object.entries(a.pointsAwarded).map(([k, n]) => (n ?? 0) > 0 && <span key={k} className="tag">{ATTR[k as AttrId].name} +{n}</span>)}
        <span className="ac-src act5-time">{a.weather && <i aria-label="天气">{a.weather}</i>}{new Date(a.date).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })}</span>
      </div>
    </div>
  );
}

export default function Activities({ params, wide, tabs }: PageProps & { tabs?: ReactNode }) {
  const root = useRef<HTMLDivElement>(null);
  const st = params.get('state'), view = params.get('view');
  const jump = params.get('jump'); // 首页「当年今日」→「去记录页看这一天 →」带来的 YYYY-MM-DD（真实 store.activitiesJumpDate）
  /* demo：从「当年今日」跳来时把那天的 3 条假记录并进列表（同 OnThisDaySheet 的 OTD_VIEW，真实里它们本来就在 activities 里） */
  const [acts, setActs] = useState<MockActivity[]>(() => (st === 'empty' ? [] : [...ACTIVITIES.map((a) => ({ ...a })), ...(jump ? OTD_VIEW.items.map((o) => { const [h, mi] = o.time.split(':').map(Number); const d = new Date(OTD_VIEW.date); d.setHours(h, mi, 0, 0); return { id: `otd-${o.id}`, date: d.toISOString(), description: o.description, pointsAwarded: o.points, method: 'local' as const, important: o.important, images: o.images }; }) : [])]));
  const [q, setQ] = useState(st === 'filtered' ? '冲浪' : '');
  const [showCal, setShowCal] = useState(view === 'calendar' || params.has('sel'));
  const [showFilters, setShowFilters] = useState(view === 'filter');
  const [selDay, setSelDay] = useState<string | null>(params.has('sel') ? offKey(Number(params.get('sel'))) : null);
  const [fAttrs, setFAttrs] = useState<AttrId[]>(view === 'filter' ? ['knowledge'] : []);
  const [fMethod, setFMethod] = useState<MethodFilter>('all');
  const [fYear, setFYear] = useState<string>('all'), [fMonth, setFMonth] = useState<string>('all');
  const [impOnly, setImpOnly] = useState(false);
  const [sheet, setSheet] = useState<false | 'new' | 'backdate'>(params.get('sheet') === 'backdate' ? 'backdate' : params.get('sheet') ? 'new' : false);
  const [backdate, setBackdate] = useState<string | null>(params.get('sheet') === 'backdate' ? offKey(-2) : null);
  const [menu, setMenu] = useState<MockActivity | null>(params.get('menu') ? ACTIVITIES[0] : null);
  const [del, setDel] = useState<MockActivity | null>(params.get('del') ? ACTIVITIES[0] : null);
  const [openMonths, setOpenMonths] = useState<Record<string, boolean>>({});
  const summary = params.get('summary');

  const years = useMemo(() => [...new Set([new Date().getFullYear(), ...acts.map((a) => new Date(a.date).getFullYear())])].sort((a, b) => b - a), [acts]);
  const hasFilter = fAttrs.length > 0 || fMethod !== 'all' || fYear !== 'all' || impOnly || !!q.trim();
  const filtered = useMemo(() => acts.filter((a) => {
    const d = new Date(a.date);
    if (q.trim() && !a.description.includes(q.trim())) return false;
    if (fAttrs.length && !fAttrs.some((k) => (a.pointsAwarded[k] ?? 0) > 0)) return false;
    if (fMethod === 'achievement' && a.category !== 'achievement_unlock') return false;
    if (fMethod === 'skill' && a.category !== 'skill_unlock') return false;
    if ((fMethod === 'local' || fMethod === 'todo' || fMethod === 'battle') && a.method !== fMethod) return false;
    if (fYear !== 'all' && String(d.getFullYear()) !== fYear) return false;
    if (fMonth !== 'all' && String(d.getMonth() + 1) !== fMonth) return false;
    if (impOnly && !a.important) return false;
    return true;
  }).sort((a, b) => +new Date(b.date) - +new Date(a.date)), [acts, q, fAttrs, fMethod, fYear, fMonth, impOnly]);

  const groups = useMemo(() => {
    const months: { mk: string; month: number; days: { dk: string; label: string; items: MockActivity[] }[] }[] = [];
    const tk = offKey(0), yk = offKey(-1);
    filtered.forEach((a) => {
      const d = new Date(a.date), mk = `${d.getFullYear()}-${d.getMonth() + 1}`, dk = localKey(d);
      let m = months.find((x) => x.mk === mk); if (!m) months.push(m = { mk, month: d.getMonth() + 1, days: [] });
      let day = m.days.find((x) => x.dk === dk); if (!day) m.days.push(day = { dk, label: dk === tk ? '今天' : dk === yk ? '昨天' : `${d.getMonth() + 1}月${d.getDate()}日 周${WEEKDAYS[d.getDay()]}`, items: [] });
      day.items.push(a);
    });
    return months;
  }, [filtered]);

  const sevenAgo = offKey(-7), todayK = offKey(0);
  const pastSel = showCal && !!selDay && selDay < todayK && selDay >= sevenAgo;
  const clearAll = () => { setFAttrs([]); setFMethod('all'); setFYear('all'); setFMonth('all'); setImpOnly(false); setQ(''); };

  useEffect(() => {
    const r = root.current; if (!r || isLowMotion()) return;
    const anims = [...r.querySelectorAll<HTMLElement>('.act5-opt, .act5-search, .act5-frow, .act5-cal, .act5-filters')].map((el, i) => el.animate([{ opacity: 0, transform: 'translateX(-24px) rotate(-2deg)' }, { opacity: 1, transform: 'none' }], { duration: 260, delay: 60 + i * 50, easing: 'cubic-bezier(.2,.9,.2,1)', fill: 'backwards' }));
    r.querySelectorAll('.ac-date').forEach((d, i) => anims.push(d.animate([{ transform: 'translateX(-60px) rotate(-12deg)', opacity: 0 }, { transform: 'rotate(-4deg)', opacity: 1 }], { duration: 320, delay: 200 + i * 80, easing: 'cubic-bezier(.34,1.56,.64,1)', fill: 'backwards' })));
    r.querySelectorAll('.act5-item').forEach((it, i) => anims.push(it.animate([{ opacity: 0, transform: 'translateX(50px) skewX(-10deg)' }, { opacity: 1, transform: `rotate(${i % 2 ? 0.8 : -0.8}deg)` }], { duration: 280, delay: 260 + i * 45, easing: 'cubic-bezier(.2,.9,.3,1)', fill: 'backwards' })));
    return () => anims.forEach((a) => a.cancel());
  }, []);

  /* 「当年今日」跳过来（真实 Activities.tsx 第 6 轮）：清掉筛选、展开那个月、滚到那一天 */
  useEffect(() => {
    if (!jump) return;
    const [y, m] = jump.split('-').map(Number);
    clearAll(); setShowCal(false); setOpenMonths((p) => ({ ...p, [`${y}-${m}`]: true }));
    const t = window.setTimeout(() => { document.querySelector(`[data-day-key="${jump}"]`)?.scrollIntoView({ block: 'start', behavior: isLowMotion() ? 'auto' : 'smooth' }); }, 400);
    return () => window.clearTimeout(t);
  }, [jump]); // eslint-disable-line react-hooks/exhaustive-deps

  const summaryLabel = summary === 'running' ? '总结书写中…' : summary === 'draft' ? '总结草稿' : '成长总结';
  const chip = (label: string, onX: () => void, cls = '') => <span key={label} className={`act5-fchip ${cls}`}>{label}<button type="button" aria-label={`移除筛选 ${label}`} onClick={onX}>✕</button></span>;

  return (
    <div className={`act5${wide ? ' wd' : ''}`} ref={root}>
      {tabs && <header className="t-hd act-hd">{tabs}<P5Mask w={wide ? 110 : 60} /></header>}
      <div className="act5-opt">
        <button type="button" className="act5-sum" onClick={() => { sfx('nav', 0.4); openOverlay('actions-summary', { view: summary === 'draft' ? 'preview' : 'generate' }); }}>
          <span aria-hidden="true" className="act5-sum-sh" style={{ clipPath: SUMMARY_SHAPE }} /><span aria-hidden="true" className="act5-sum-fr" style={{ clipPath: SUMMARY_SHAPE }} /><span aria-hidden="true" className="act5-sum-fc" style={{ clipPath: SUMMARY_SHAPE }} />
          <P5Star size={13} fill="var(--red)" className="act5-sum-st" /><span className="act5-sum-t">{summaryLabel}</span>
          {summary === 'running' && <i className="act5-sum-run" aria-hidden="true" />}
          {summary === 'dot' && <i className="act5-sum-dot" aria-label="有新总结" />}
        </button>
      </div>
      <div className="act5-search">
        <svg viewBox="0 0 20 20" aria-hidden="true"><path fillRule="evenodd" d="M9 3.5a5.5 5.5 0 100 11 5.5 5.5 0 000-11zM2 9a7 7 0 1112.452 4.391l3.328 3.329a.75.75 0 11-1.06 1.06l-3.329-3.328A7 7 0 012 9z" /></svg>
        <input className="inp" value={q} onChange={(e) => setQ(e.target.value)} placeholder="搜索记录内容…" aria-label="搜索记录内容" />
        {q && <button type="button" aria-label="清空搜索" onClick={() => setQ('')}>✕</button>}
      </div>
      <div className="act5-frow">
        <button type="button" className={`act5-fbtn${showCal ? ' on' : ''}`} aria-pressed={showCal} onClick={() => { sfx('switch', 0.4); setShowCal((v) => !v); }}>
          <svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="4" width="18" height="18" /><path d="M16 2v4M8 2v4M3 10h18" /></svg>日历
        </button>
        <button type="button" className={`act5-fbtn${showFilters || (hasFilter && !q.trim()) ? ' on' : ''}`} aria-pressed={showFilters} onClick={() => setShowFilters((v) => !v)}>
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 4.5h14.25M3 9h9.75M3 13.5h5.25m5.25-.75l2.25 2.25m0 0l2.25 2.25M15.75 15l2.25-2.25M15.75 15l2.25 2.25" /></svg>筛选{hasFilter && !q.trim() && <i className="act5-fdot" />}
        </button>
        {fAttrs.map((a) => chip(ATTR[a].name, () => setFAttrs((p) => p.filter((x) => x !== a))))}
        {fMethod !== 'all' && chip(METHOD_FILTER_OPTIONS.find((o) => o.key === fMethod)!.label, () => setFMethod('all'))}
        {fYear !== 'all' && chip(`${fYear}年${fMonth !== 'all' ? `${fMonth}月` : ''}`, () => { setFYear('all'); setFMonth('all'); })}
        {impOnly && chip('★ 重要', () => setImpOnly(false), 'imp')}
        {hasFilter && <button type="button" className="act5-clear" onClick={clearAll}>清除全部</button>}
      </div>

      {showCal && <CalendarView acts={acts} selected={selDay} onSelect={setSelDay} pickerInit={params.get('picker') === '1'} />}

      {showFilters && (
        <section className="act5-filters" aria-label="筛选">
          <div className="act5-fsec"><p>属性（可多选）</p><div className="seg">
            {ATTR_ORDER.map((a) => <button key={a} type="button" aria-pressed={fAttrs.includes(a)} onClick={() => setFAttrs((p) => (p.includes(a) ? p.filter((x) => x !== a) : [...p, a]))}>{ATTR[a].name}</button>)}
            {fAttrs.length > 0 && <button type="button" className="act5-fx" onClick={() => setFAttrs([])}>清除</button>}
          </div></div>
          <div className="act5-fsec"><p>来源</p><div className="seg">{METHOD_FILTER_OPTIONS.map((o) => <button key={o.key} type="button" aria-pressed={fMethod === o.key} onClick={() => setFMethod(o.key)}>{o.label}</button>)}</div></div>
          <div className="act5-fsec"><p>时间</p>
            <div className="seg"><button type="button" aria-pressed={fYear === 'all'} onClick={() => { setFYear('all'); setFMonth('all'); }}>全部年份</button>{years.map((y) => <button key={y} type="button" aria-pressed={fYear === String(y)} onClick={() => { setFYear(String(y)); setFMonth('all'); }}>{y}年</button>)}</div>
            <div className={`seg act5-months${fYear === 'all' ? ' off' : ''}`}><button type="button" disabled={fYear === 'all'} aria-pressed={fMonth === 'all'} onClick={() => setFMonth('all')}>全部月份</button>{Array.from({ length: 12 }, (_, i) => <button key={i} type="button" disabled={fYear === 'all'} aria-pressed={fMonth === String(i + 1)} onClick={() => setFMonth(String(i + 1))}>{i + 1}月</button>)}</div>
          </div>
          <label className="act5-fsec act5-imp-row"><span>仅显示重要记录</span><P5Switch on={impOnly} onChange={setImpOnly} label="仅显示重要记录" /></label>
        </section>
      )}

      <div className="act5-list">
        {filtered.length === 0 ? (
          <P5Empty text={hasFilter ? '没有符合条件的记录' : '还没有任何记录'} hint={hasFilter ? '试试调整或清除筛选条件' : '把今天做过的一件小事记下来吧'} seed={5} />
        ) : groups.map((m) => {
          const open = openMonths[m.mk] ?? true;
          return (
            <div key={m.mk} className="act5-month">
              <button type="button" className="act5-mh" aria-expanded={open} onClick={() => setOpenMonths((p) => ({ ...p, [m.mk]: !open }))}><span>{+m.mk.split('-')[0] !== new Date().getFullYear() && `${m.mk.split('-')[0]} 年 `}{m.month} 月</span><i className={open ? 'up' : ''} aria-hidden="true">▾</i></button>
              {open && m.days.map((d) => (
                <div key={d.dk} className="ac-day act5-day" data-day-key={d.dk}>
                  <div className="ac-date"><b>{+d.dk.slice(5, 7)}/{+d.dk.slice(8)}</b><span>{d.label.length <= 2 ? d.label : `周${WEEKDAYS[new Date(d.dk + 'T00:00').getDay()]}`}</span></div>
                  {d.items.map((a, i) => <RecordItem key={a.id} a={a} i={i} onMenu={setMenu} />)}
                </div>
              ))}
            </div>
          );
        })}
      </div>

      <DevStateBar page="actions" items={[
        { label: '列表', q: 'tab=activities' }, { label: '日历', q: 'tab=activities&view=calendar' }, { label: '年月浮层', q: 'tab=activities&view=calendar&picker=1' },
        { label: '日历·选过去（补录 FAB）', q: 'tab=activities&view=calendar&sel=-2' }, { label: '筛选面板', q: 'tab=activities&view=filter' },
        { label: '空', q: 'tab=activities&state=empty' }, { label: '筛选无结果', q: 'tab=activities&state=filtered' }, { label: '记录抽屉', q: 'tab=activities&sheet=1' },
        { label: '补录抽屉', q: 'tab=activities&sheet=backdate' }, { label: '长按菜单', q: 'tab=activities&menu=1' }, { label: '删除确认', q: 'tab=activities&del=1' },
        { label: '总结草稿', q: 'tab=activities&summary=draft' }, { label: '总结书写中', q: 'tab=activities&summary=running' }, { label: '总结红点', q: 'tab=activities&summary=dot' },
      ]} />

      <Portal>
        <button type="button" className={`act5-fab${pastSel ? ' past' : ''}`} aria-label={pastSel ? '补录历史记录' : '添加记录'}
          onClick={() => { sfx('nav', 0.4); setBackdate(pastSel ? selDay : null); setSheet(pastSel ? 'backdate' : 'new'); }}>
          <P5StarFab face={pastSel ? '#e08a00' : '#c00008'} seed={6} />
          {pastSel ? <span className="act5-fab-t">补</span> : <svg viewBox="0 0 24 24" className="act5-fab-p" aria-hidden="true"><path d="M12 4.5v15m7.5-7.5h-15" /></svg>}
        </button>
      </Portal>
      <ActivityRecordSheet open={!!sheet} onClose={() => setSheet(false)} backdate={sheet === 'backdate' ? backdate : null}
        onSaved={(desc, pts, important) => setActs((p) => [{ id: `n${Date.now()}`, date: backdate ? `${backdate}T12:00:00` : new Date().toISOString(), description: desc || '一件小事', pointsAwarded: pts, method: 'local', important, backfilled: !!backdate }, ...p])} />
      <ActivitiesRecordMenu open={!!menu} onClose={() => setMenu(null)} desc={menu?.description ?? ''} onDelete={() => { const m = menu; setTimeout(() => setDel(m), 0); }} />
      <ActivitiesDeleteConfirm open={!!del} onClose={() => setDel(null)} desc={del?.description ?? ''} onDelete={() => { const id = del?.id; setActs((p) => p.filter((a) => a.id !== id)); }} />
    </div>
  );
}
