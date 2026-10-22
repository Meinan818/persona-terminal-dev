/**
 * 行动 · 记录子页（真实 src/pages/Activities.tsx 的 ActivitiesView，p3 频道：ListCard / AttachChip / thumbFrame 的 p3 分支）。
 *   顶栏：「成长总结」（总结书写中… / 总结草稿 / 成长总结）、搜索「搜索记录内容…」、「日历」「筛选」切换。
 *   筛选面板：⭐ 重要、清除全部、属性（可多选）+ 清除、来源 全部 / 手动记录 / 任务完成 / 战斗奖励、时间 年 / 月下拉、仅显示重要记录、已选月份 chip。
 *   日历视图：月历（日一二三四五六）+ 前后翻 + 标题开年月跳转浮层；日格选中 →「YYYY/MM/DD 的记录」/「这天暂无记录」；选中过去 7 天内 → FAB 变「补录」。
 *   列表：年 / 月折叠分组 + 日小签；记录卡（Check Status 行）：标签 ✧ 同伴 / ★首杀 / ✓ 任务 / 🏆 本周目标 / ✨ 技能解锁 / 🏆 成就解锁 / ✦ 倒计时 / 补、
 *         大事收束卡子步时间线（可展开 /「子步记录已被单独清理」）、配图缩略「查看图片 N」、长按 500ms 开菜单。
 *   FAB：右下玫红斜切「记录」/「补录」（真实 p3 SlantButton 形态）。
 * 查询参数：view=calendar|filter；state=empty（无记录）|nomatch（筛选无结果）；summary=running|draft（按钮文案）；open=record|menu|summary（页内直接弹出）。
 */
import { AnimatePresence, motion } from 'framer-motion';
import { useMemo, useState } from 'react';
import type { Activity, AttributeId } from '@real/types';
import { P3Button, P3ConfigRow, P3Empty, P3Input, P3OnOff, P3Select, P3Segment, P3Tag, useToast, P3R, slantClip, tickClip, IconSearch, IconChevronDown, IconBack, IconChevron, Glyph } from '@pink/kit';
import { useBoldness } from '@pink/lib/prefs';
import { ACTIVITIES, ACTIVITY_IMAGES, ATTR_IDS, ATTR_NAMES, BIGDEAL_STEP_LOG, TODAY, TODAY_KEY, dayKey } from '@pink/mock/pkg2';
import { Butterfly, Dot, Photo, SlantChip, SlantFab, fmtTime, qp, setHashParam, sumPts, useLongPress } from '@pink/screens/pkg2/common';
import ActivityRecordSheet, { type RecordSavePayload } from '@pink/screens/overlays/ActivityRecordSheet.p3r';
import ActivitiesRecordMenu from '@pink/screens/overlays/ActivitiesRecordMenu.p3r';
import ActivitiesDeleteConfirm from '@pink/screens/overlays/ActivitiesDeleteConfirm.p3r';
import ActivityImagesSheet from '@pink/screens/overlays/ActivityImagesSheet.p3r';
import ImageLightbox from '@pink/screens/overlays/ImageLightbox.p3r';
import ShareToOrgSheet from '@pink/screens/overlays/ShareToOrgSheet.p3r';
import SaveSuccessModal from '@pink/screens/overlays/SaveSuccessModal.p3r';
import SummaryModal from '@pink/screens/overlays/SummaryModal.p3r';
import ActivitiesCalendarPicker from '@pink/screens/overlays/ActivitiesCalendarPicker.p3r';
import WishProgressCutIn from '@pink/screens/overlays/WishProgressCutIn.p3r';

const SOURCES = [{ id: 'all', label: '全部' }, { id: 'local', label: '手动记录' }, { id: 'todo', label: '任务完成' }, { id: 'battle', label: '战斗奖励' }];
const WEEKDAYS = ['日', '一', '二', '三', '四', '五', '六'];
type Accent = 'achievement' | 'skill' | 'shadow' | 'confidant' | 'weekly' | 'card' | 'bigdeal' | 'todo' | 'important' | 'default';
const accentOf = (a: Activity): Accent =>
  a.category === 'achievement_unlock' ? 'achievement' : a.category === 'skill_unlock' ? 'skill' : a.category === 'shadow_defeat' ? 'shadow'
    : a.category === 'confidant' ? 'confidant' : a.category === 'weekly_goal' ? 'weekly' : a.category === 'calling_card_clear' ? 'card'
      : a.category === 'bigdeal_clear' ? 'bigdeal' : a.method === 'todo' ? 'todo' : a.important ? 'important' : 'default';
const ACCENT: Record<Accent, string> = {
  achievement: 'var(--p3r-gold)', skill: 'var(--p3r-cyan)', shadow: 'var(--p3r-mulberry)', confidant: 'var(--p3r-magenta)', weekly: 'var(--p3r-blue)',
  card: 'var(--p3r-blue-deep)', bigdeal: 'var(--p3r-ink)', todo: 'var(--p3r-cyan)', important: 'var(--p3r-blue)', default: 'rgb(var(--p3r-cyan-rgb) / 0.45)',
};

function RecordCard({ a, images, onMenu, onImage, expanded, onToggleDeal }: { a: Activity; images: string[]; onMenu: () => void; onImage: (i: number) => void; expanded: boolean; onToggleDeal: () => void }) {
  const anim = useBoldness();
  const lp = useLongPress(onMenu);
  const acc = accentOf(a);
  const pts = Object.entries(a.pointsAwarded).filter(([, v]) => v > 0) as [AttributeId, number][];
  const steps = a.bigDealId ? BIGDEAL_STEP_LOG[a.bigDealId] : undefined;
  const sel = lp.pressing;
  const ink = sel ? 'var(--p3r-on-ink)' : P3R.ink;
  return (
    <div {...lp.handlers} className="relative min-w-0 select-none" style={{ WebkitTouchCallout: 'none' }}>
      <motion.div className="relative flex min-w-0 overflow-hidden" style={{ clipPath: slantClip(10), background: sel ? P3R.ink : P3R.panel }} animate={{ scale: sel && anim ? 0.985 : 1 }}>
        <span aria-hidden className="w-[6px] shrink-0" style={{ background: ACCENT[acc] }} />
        <div className="min-w-0 flex-1 py-2.5 pl-3 pr-5">
          <p className="break-words text-[15px] font-bold leading-snug" style={{ color: ink }}>
            {acc === 'bigdeal' && <span className="mr-1.5 inline-block -translate-y-px px-1.5 align-middle font-cond text-[11px]" style={{ background: P3R.blue, color: P3R.onBlue, clipPath: slantClip(3) }}>BIG DEAL</span>}
            {a.backfilled && <span title="回归时补记" className="mr-1.5 inline-block -translate-y-px px-1 align-middle text-[10px] font-black" style={{ boxShadow: 'inset 0 0 0 1px currentColor', opacity: 0.6 }}>补</span>}
            {a.description}
          </p>
          {acc === 'bigdeal' && (
            <div className="mt-1.5">
              <button type="button" onPointerDown={(e) => e.stopPropagation()} onClick={(e) => { e.stopPropagation(); onToggleDeal(); }} aria-expanded={expanded} className="flex items-center gap-1 text-[12px] font-black" style={{ color: sel ? ink : P3R.roseInk }}>
                子步时间线（{steps?.length ?? 0}）<IconChevronDown size={11} className={expanded ? 'rotate-180 transition-transform' : 'transition-transform'} />
              </button>
              <AnimatePresence initial={false}>
                {expanded && (
                  <motion.ol initial={anim ? { opacity: 0, y: -6 } : { opacity: 0 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="mt-1.5 space-y-1 pl-3" style={{ borderLeft: `3px solid ${P3R.cyan}` }}>
                    {steps?.length ? steps.map((s, k) => (
                      <li key={k} className="flex min-w-0 items-center gap-2 text-[12px]" style={{ color: ink }}><span className="shrink-0 font-cond" style={{ color: sel ? ink : P3R.roseInk }}>{String(k + 1).padStart(2, '0')}</span><span className="min-w-0 flex-1 truncate">{s.title}</span><span className="shrink-0 font-cond text-[11px] opacity-60">{s.date.getMonth() + 1}/{s.date.getDate()}</span></li>
                    )) : <li className="text-[11px] opacity-60">子步记录已被单独清理</li>}
                  </motion.ol>
                )}
              </AnimatePresence>
            </div>
          )}
          {images.length > 0 && (
            <div className="mt-2 flex gap-1.5" onPointerDown={(e) => e.stopPropagation()}>
              {images.slice(0, 4).map((src, i) => (
                <button key={i} type="button" aria-label={`查看图片 ${i + 1}`} onClick={(e) => { e.stopPropagation(); onImage(i); }} className="relative h-14 w-14 shrink-0 overflow-hidden" style={{ clipPath: slantClip(5) }}>
                  <Photo src={src} />
                  {i === 3 && images.length > 4 && <span className="absolute inset-0 flex items-center justify-center font-cond text-[14px]" style={{ background: 'rgba(27,8,22,0.6)', color: '#fff' }}>+{images.length - 4}</span>}
                </button>
              ))}
            </div>
          )}
          <div className="mt-2 flex min-w-0 flex-wrap items-center gap-1.5">
            {acc === 'confidant' && <P3Tag tone="coral">✧ 同伴</P3Tag>}
            {acc === 'shadow' && <P3Tag tone="ink">◉ Shadow 击破{a.important ? ' ★首杀' : ''}</P3Tag>}
            {acc === 'todo' && <P3Tag tone="lilac">✓ 任务</P3Tag>}
            {acc === 'weekly' && <P3Tag tone="rose"><Glyph name="trophy" /> 本周目标</P3Tag>}
            {acc === 'skill' && <P3Tag tone="lilac"><Glyph name="sparkles" /> 技能解锁</P3Tag>}
            {acc === 'achievement' && <P3Tag tone="gold"><Glyph name="trophy" /> 成就解锁</P3Tag>}
            {acc === 'card' && <P3Tag tone="rose">✦ 倒计时</P3Tag>}
            {a.important && acc !== 'shadow' && <P3Tag tone="gold"><Glyph name="star" /> 重要</P3Tag>}
            {pts.map(([k, v]) => <span key={k} className="inline-flex shrink-0 items-center px-1.5 font-cond text-[12px]" style={{ color: sel ? ink : P3R.roseInk }}>{ATTR_NAMES[k]} +{v}</span>)}
            <span className="ml-auto flex shrink-0 items-center gap-1.5 font-cond text-[12px]" style={{ color: sel ? ink : P3R.grey }}>
              {a.weather?.text && <span>{a.weather.text}</span>}{fmtTime(a.date)}
            </span>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

function Calendar({ year, month, onMonth, selected, onSelect, onPicker, marks, showImportant }: { year: number; month: number; onMonth: (d: number) => void; selected: string | null; onSelect: (k: string | null) => void; onPicker: () => void; marks: Map<string, { n: number; imp: boolean }>; showImportant: boolean }) {
  const first = new Date(year, month, 1).getDay();
  const days = new Date(year, month + 1, 0).getDate();
  const cells: (number | null)[] = [...Array(first).fill(null), ...Array.from({ length: days }, (_, i) => i + 1)];
  while (cells.length % 7) cells.push(null);
  return (
    <div className="relative">
      <span aria-hidden className="absolute inset-0 translate-x-[6px] translate-y-[6px]" style={{ background: 'var(--p3r-slab-back)', clipPath: slantClip(14) }} />
      <div className="relative overflow-hidden" style={{ clipPath: slantClip(14), background: P3R.panel }}>
        <div className="flex items-center gap-2 px-4 py-2" style={{ background: P3R.ink }}>
          <button type="button" aria-label="上个月" onClick={() => onMonth(-1)} className="flex h-9 w-9 items-center justify-center" style={{ background: P3R.blue, color: P3R.onBlue, clipPath: slantClip(5) }}><IconBack size={14} /></button>
          <button type="button" onClick={onPicker} aria-label="选择年月" className="min-w-0 flex-1 truncate text-center font-cond text-[22px]" style={{ color: 'var(--p3r-on-ink)' }}>{year} / {String(month + 1).padStart(2, '0')} <IconChevronDown size={12} className="inline" /></button>
          <button type="button" aria-label="下个月" onClick={() => onMonth(1)} className="flex h-9 w-9 items-center justify-center" style={{ background: P3R.blue, color: P3R.onBlue, clipPath: slantClip(5) }}><IconChevron size={14} /></button>
        </div>
        <div className="grid grid-cols-7 px-2 pt-1.5 text-center text-[12px] font-black">
          {WEEKDAYS.map((w, i) => <div key={w} className="py-1" style={{ color: i === 0 ? 'var(--p3r-coral-ink)' : i === 6 ? P3R.lilacInk : P3R.grey }}>{w}</div>)}
        </div>
        <div className="grid grid-cols-7 gap-0.5 px-2 pb-2">
          {cells.map((d, i) => {
            if (!d) return <div key={i} className="h-11 min-[400px]:h-12" />;
            const k = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
            const m = marks.get(k);
            const sel = selected === k;
            const today = k === TODAY_KEY;
            return (
              <button key={i} type="button" onClick={() => onSelect(sel ? null : k)} aria-pressed={sel} aria-label={`${month + 1}月${d}日${m ? `，${m.n} 条记录` : ''}${today ? '（今天）' : ''}`}
                className="relative flex h-11 min-w-0 flex-col items-center justify-center min-[400px]:h-12">
                {(sel || today) && <span aria-hidden className="absolute inset-0.5" style={{ background: sel ? P3R.ink : P3R.cyanPale, clipPath: slantClip(5) }} />}
                <span className="relative font-cond text-[17px] leading-none" style={{ color: sel ? 'var(--p3r-on-ink)' : i % 7 === 0 ? 'var(--p3r-coral-ink)' : P3R.ink }}>{d}</span>
                {m && <span className="relative mt-1 flex gap-0.5">{Array.from({ length: Math.min(3, m.n) }).map((_, j) => <span key={j} className="h-[5px] w-[5px]" style={{ background: sel ? 'var(--p3r-on-ink)' : P3R.blue, clipPath: tickClip }} />)}</span>}
                {m?.imp && showImportant && <span aria-label="重要事件" className="absolute right-1 top-0.5 text-[10px] leading-none" style={{ color: sel ? 'var(--p3r-on-ink)' : P3R.gold }}>★</span>}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export function ActivitiesView({ params }: { params: URLSearchParams }) {
  const toast = useToast();
  const anim = useBoldness();
  const st = qp(params, 'state');
  const op = qp(params, 'open');
  const [list, setList] = useState<Activity[]>(st === 'empty' ? [] : ACTIVITIES);
  const [imgMap, setImgMap] = useState<Record<string, string[]>>(st === 'empty' ? {} : ACTIVITY_IMAGES);
  const [q, setQ] = useState('');
  const [showCal, setShowCal] = useState(qp(params, 'view') === 'calendar');
  const [showFilter, setShowFilter] = useState(qp(params, 'view') === 'filter' || st === 'nomatch');
  const [attrs, setAttrs] = useState<AttributeId[]>(st === 'nomatch' ? ['charm'] : []);
  const [source, setSource] = useState<string>(st === 'nomatch' ? 'battle' : 'all');
  const [fy, setFy] = useState('all');
  const [fm, setFm] = useState('all');
  const [onlyImp, setOnlyImp] = useState(false);
  const [calY, setCalY] = useState(2026);
  const [calM, setCalM] = useState(9);
  const [calSel, setCalSel] = useState<string | null>(qp(params, 'view') === 'calendar' ? '2026-10-18' : null);
  const [calImp, setCalImp] = useState(true);
  const [picker, setPicker] = useState(false);
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set(['2025']));
  const [deals, setDeals] = useState<Set<string>>(new Set(['bd0']));
  const [sheet, setSheet] = useState<false | { backdate: string | null }>(op === 'record' ? { backdate: null } : false);
  const [menuId, setMenuId] = useState<string | null>(op === 'menu' ? 'a1' : null);
  const [delId, setDelId] = useState<string | null>(null);
  const [imgsId, setImgsId] = useState<string | null>(null);
  const [shareId, setShareId] = useState<string | null>(null);
  const [lb, setLb] = useState<{ id: string; i: number } | null>(null);
  const [saved, setSaved] = useState<RecordSavePayload | null>(null);
  const [wishCut, setWishCut] = useState(false);
  const [summary, setSummary] = useState(op === 'summary');
  const sumState = qp(params, 'summary');

  const toggleSet = (s: Set<string>, k: string) => { const n = new Set(s); if (n.has(k)) n.delete(k); else n.add(k); return n; };
  const hasFilter = attrs.length > 0 || source !== 'all' || fy !== 'all' || fm !== 'all' || onlyImp || !!q.trim();
  const clearAll = () => { setAttrs([]); setSource('all'); setFy('all'); setFm('all'); setOnlyImp(false); setQ(''); };
  const filtered = useMemo(() => list.filter((a) => {
    if (q.trim() && !a.description.includes(q.trim())) return false;
    if (attrs.length && !attrs.some((k) => a.pointsAwarded[k] > 0)) return false;
    if (source !== 'all' && a.method !== source) return false;
    if (fy !== 'all' && String(a.date.getFullYear()) !== fy) return false;
    if (fm !== 'all' && String(a.date.getMonth() + 1) !== fm) return false;
    if (onlyImp && !a.important) return false;
    return true;
  }).sort((x, y) => y.date.getTime() - x.date.getTime()), [list, q, attrs, source, fy, fm, onlyImp]);
  const groups = useMemo(() => {
    const ys = new Map<number, Map<number, Activity[]>>();
    filtered.forEach((a) => { const y = a.date.getFullYear(); const m = a.date.getMonth() + 1; if (!ys.has(y)) ys.set(y, new Map()); const mm = ys.get(y)!; if (!mm.has(m)) mm.set(m, []); mm.get(m)!.push(a); });
    return [...ys.entries()].map(([year, mm]) => ({ year, months: [...mm.entries()].map(([month, items]) => ({ month, items })) }));
  }, [filtered]);
  const marks = useMemo(() => { const m = new Map<string, { n: number; imp: boolean }>(); list.forEach((a) => { const k = dayKey(a.date); const v = m.get(k) ?? { n: 0, imp: false }; m.set(k, { n: v.n + 1, imp: v.imp || !!a.important }); }); return m; }, [list]);
  const years = [...new Set(list.map((a) => a.date.getFullYear()))].sort((a, b) => b - a);
  const months = [...new Set(list.filter((a) => fy === 'all' || String(a.date.getFullYear()) === fy).map((a) => a.date.getMonth() + 1))].sort((a, b) => a - b);
  const sevenAgo = dayKey(new Date(TODAY.getTime() - 7 * 86400000));
  const isPast = showCal && calSel !== null && calSel < TODAY_KEY && calSel >= sevenAgo;
  const dayList = calSel ? list.filter((a) => dayKey(a.date) === calSel) : [];
  const dayLabel = (d: Date) => { const k = dayKey(d); return k === TODAY_KEY ? '今天' : k === dayKey(new Date(TODAY.getTime() - 86400000)) ? '昨天' : `${d.getMonth() + 1}/${d.getDate()} 周${WEEKDAYS[d.getDay()]}`; };

  const onSave = (p: RecordSavePayload) => {
    const d = p.backdate ? new Date(`${p.backdate}T21:00:00`) : new Date(TODAY);
    const a: Activity = { id: `n${Date.now()}`, userId: 'u1', date: d, description: p.description, pointsAwarded: p.points, method: 'local', important: p.important, weather: { icon: 'rain', text: '小雨' }, wishId: p.wishId, backfilled: !!p.backdate };
    setList((l) => [a, ...l]);
    if (p.images.length) setImgMap((m) => ({ ...m, [a.id]: p.images }));
    setSaved(p);
  };
  const menuAct = list.find((a) => a.id === menuId);
  const delAct = list.find((a) => a.id === delId);
  const card = (a: Activity) => (
    <RecordCard key={a.id} a={a} images={imgMap[a.id] ?? []} onMenu={() => setMenuId(a.id)} onImage={(i) => setLb({ id: a.id, i })}
      expanded={!!a.bigDealId && deals.has(a.bigDealId)} onToggleDeal={() => a.bigDealId && setDeals((s) => toggleSet(s, a.bigDealId!))} />
  );
  const sectionLabel = (t: string) => <p className="mb-1.5 text-[12px] font-black" style={{ color: P3R.grey }}>{t}</p>;

  return (
    <div className="min-w-0 pb-28">
      <div className="mb-3 flex min-w-0 items-center gap-2">
        <span className="relative inline-flex min-w-0 shrink">
          <button type="button" onClick={() => setSummary(true)} aria-label="成长总结" className="relative flex h-10 min-w-0 items-center gap-1.5 px-4 text-[14px] font-black" style={{ clipPath: slantClip(9), background: P3R.blue, color: P3R.onBlue }}>
            <Butterfly size={15} /><span className="truncate">{sumState === 'running' ? '总结书写中…' : sumState === 'draft' ? '总结草稿' : '成长总结'}</span>
            {sumState === 'running' && <span aria-hidden className="pk-spin h-3 w-3 shrink-0 rounded-full border-2 border-current border-t-transparent" />}
          </button>
          {sumState === 'draft' && <Dot />}
        </span>
        <div className="flex-1" />
        <SlantChip on={showCal} onClick={() => { setShowCal((v) => !v); setHashParam('view', showCal ? null : 'calendar'); }}>日历</SlantChip>
        <SlantChip on={showFilter} onClick={() => { setShowFilter((v) => !v); setHashParam('view', showFilter ? null : 'filter'); }} badge={hasFilter ? <Dot /> : undefined}>筛选</SlantChip>
      </div>
      <P3Input lead={<IconSearch size={16} />} value={q} onChange={(e) => setQ(e.target.value)} placeholder="搜索记录内容…" aria-label="搜索记录内容" className="mb-3" />

      <AnimatePresence initial={false}>
        {showFilter && (
          <motion.div key="flt" initial={anim ? { opacity: 0, y: -10 } : { opacity: 0 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.18 }} className="relative mb-4 mt-3">
            <span aria-hidden className="absolute inset-0 translate-x-[6px] translate-y-[6px]" style={{ background: 'var(--p3r-slab-back)', clipPath: slantClip(14) }} />
            <div className="relative space-y-3 px-5 py-4" style={{ clipPath: slantClip(14), background: P3R.panelGlass }}>
              <div className="flex min-w-0 flex-wrap items-center gap-2">
                <SlantChip tone="soft" on={onlyImp} onClick={() => setOnlyImp((v) => !v)}><Glyph name="star" /> 重要</SlantChip>
                {fy !== 'all' && <P3Tag tone="rose" onRemove={() => { setFy('all'); setFm('all'); }}>{fy}年{fm !== 'all' ? `${fm}月` : ''}</P3Tag>}
                {fy === 'all' && fm !== 'all' && <P3Tag tone="rose" onRemove={() => setFm('all')}>{fm}月</P3Tag>}
                <div className="flex-1" />
                {hasFilter && <P3Button size="sm" tone="ghost" onClick={clearAll}>清除全部</P3Button>}
              </div>
              <div>
                <div className="mb-1.5 flex items-center justify-between">{sectionLabel('属性（可多选）')}{attrs.length > 0 && <button type="button" onClick={() => setAttrs([])} className="text-[12px] font-black" style={{ color: P3R.roseInk }}>清除</button>}</div>
                <div className="flex flex-wrap gap-1.5">
                  {ATTR_IDS.map((k) => { const on = attrs.includes(k); return <button key={k} type="button" aria-pressed={on} onClick={() => setAttrs((s) => (s.includes(k) ? s.filter((x) => x !== k) : [...s, k]))} className="px-3.5 py-1.5 text-[13px] font-black" style={{ clipPath: slantClip(6), background: on ? P3R.blue : P3R.cyanFaint, color: on ? P3R.onBlue : P3R.ink }}>{ATTR_NAMES[k]}</button>; })}
                </div>
              </div>
              <div>{sectionLabel('来源')}<P3Segment items={SOURCES} value={source} onChange={setSource} /></div>
              <div>
                {sectionLabel('时间')}
                <div className="grid grid-cols-2 gap-2">
                  <P3Select aria-label="年份" value={fy} onChange={(e) => { setFy(e.target.value); setFm('all'); }}><option value="all">全部年份</option>{years.map((y) => <option key={y} value={String(y)}>{y}年</option>)}</P3Select>
                  <P3Select aria-label="月份" value={fm} onChange={(e) => setFm(e.target.value)}><option value="all">全部月份</option>{months.map((m) => <option key={m} value={String(m)}>{m}月</option>)}</P3Select>
                </div>
              </div>
              <P3ConfigRow label="仅显示重要记录"><P3OnOff value={onlyImp} onChange={setOnlyImp} ariaLabel="仅显示重要记录" /></P3ConfigRow>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {showCal && (
        <div className="mb-5 mt-3 space-y-3">
          <Calendar year={calY} month={calM} selected={calSel} onSelect={setCalSel} onPicker={() => setPicker(true)} marks={marks} showImportant={calImp}
            onMonth={(d) => { const m = calM + d; setCalY(calY + Math.floor(m / 12)); setCalM(((m % 12) + 12) % 12); }} />
          {calSel && (
            <div className="space-y-1.5">
              <div className="inline-block px-3 py-0.5 font-cond text-[14px]" style={{ background: P3R.ink, color: 'var(--p3r-on-ink)', clipPath: slantClip(5) }}>{calSel.replace(/-/g, '/')} 的记录</div>
              {dayList.length ? <div className="space-y-1.5">{dayList.map(card)}</div> : <p className="py-3 text-center text-[13px] font-bold" style={{ color: P3R.grey }}>这天暂无记录</p>}
              {isPast && <p className="text-[12px] font-bold" style={{ color: P3R.roseInk }}>▶ 选中了过去 7 天内的日子：右下按钮变为「补录」</p>}
            </div>
          )}
        </div>
      )}

      {filtered.length === 0 ? (
        <motion.div key={hasFilter ? 'nomatch' : 'empty'} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.16 }} className="mt-4">
          <P3Empty ghost={hasFilter ? 'NO MATCH' : 'EMPTY'} text={hasFilter ? '没有符合条件的记录' : '还没有任何记录'} sub={hasFilter ? '试试调整或清除筛选条件' : '把今天做过的一件小事记下来吧'}
            action={hasFilter ? <P3Button tone="ink" onClick={clearAll}>清除全部</P3Button> : <P3Button corner onClick={() => setSheet({ backdate: null })}>记录一件事</P3Button>} />
        </motion.div>
      ) : (
        <div className="space-y-5">
          {groups.map((yg, gi) => {
            const yk = String(yg.year);
            const yOpen = !collapsed.has(yk);
            return (
              <motion.div key={yk} initial={anim ? { opacity: 0, x: -18 } : false} animate={{ opacity: 1, x: 0 }} transition={{ delay: gi * 0.06 }}>
                <button type="button" onClick={() => setCollapsed((s) => toggleSet(s, yk))} aria-expanded={yOpen} className="mb-2 flex w-full min-w-0 items-center gap-2">
                  <span className="font-cond text-[30px] leading-none" style={{ color: P3R.blue }}>{yg.year}</span><span className="font-heavy text-[16px]" style={{ color: P3R.ink }}>年</span>
                  <span className="h-px flex-1" style={{ background: P3R.ink, opacity: 0.3 }} />
                  <span className="font-cond text-[13px]" style={{ color: P3R.grey }}>{yg.months.reduce((n, m) => n + m.items.length, 0)} 条</span>
                  <IconChevronDown size={14} className={yOpen ? 'transition-transform' : '-rotate-90 transition-transform'} style={{ color: P3R.ink }} />
                </button>
                <AnimatePresence initial={false}>
                  {yOpen && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-3">
                      {yg.months.map((mg) => {
                        const mk = `${yk}-${mg.month}`;
                        const mOpen = !collapsed.has(mk);
                        let lastDay = '';
                        return (
                          <div key={mk} className="min-w-0">
                            <button type="button" onClick={() => setCollapsed((s) => toggleSet(s, mk))} aria-expanded={mOpen} className="mb-1.5 inline-flex items-center gap-1.5 px-4 py-1 text-[14px] font-black" style={{ background: P3R.blue, color: P3R.onBlue, clipPath: slantClip(7) }}>
                              <span className="font-cond text-[17px] leading-none">{mg.month}</span> 月<span className="font-cond text-[12px] opacity-85">· {mg.items.length}</span>
                              <IconChevronDown size={11} className={mOpen ? 'transition-transform' : '-rotate-90 transition-transform'} />
                            </button>
                            {mOpen && (
                              <div className="space-y-1.5">
                                {mg.items.map((a) => {
                                  const dl = dayLabel(a.date);
                                  const head = dl !== lastDay; lastDay = dl;
                                  return (
                                    <div key={a.id}>
                                      {head && <div className="mb-1 mt-1 flex items-center gap-1.5 pl-1 text-[11px] font-black" style={{ color: P3R.grey }}><span aria-hidden className="h-[8px] w-[6px]" style={{ background: P3R.cyan, clipPath: tickClip }} />{dl}</div>}
                                      {card(a)}
                                    </div>
                                  );
                                })}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            );
          })}
          <p className="text-center text-[11px] font-bold" style={{ color: P3R.grey }}>长按记录卡打开菜单</p>
        </div>
      )}

      <SlantFab label={isPast ? '补录历史记录' : '添加记录'} text={isPast ? '补录' : '记录'} tone={isPast ? 'coral' : 'rose'} onClick={() => setSheet({ backdate: isPast ? calSel : null })} />

      <ActivityRecordSheet open={!!sheet} onClose={() => setSheet(false)} backdate={sheet ? sheet.backdate : null} onSave={onSave} />
      <SaveSuccessModal open={!!saved} onClose={() => { const w = saved?.wishId; setSaved(null); if (w) setWishCut(true); }} description={saved?.description} totalPoints={saved ? sumPts(saved.points) : 0} unlock={!!saved && sumPts(saved.points) >= 5} />
      <WishProgressCutIn open={wishCut} onClose={() => setWishCut(false)} params={new URLSearchParams('delta=6')} />
      <ActivitiesRecordMenu open={!!menuId} onClose={() => setMenuId(null)} title={menuAct ? (menuAct.description.length > 24 ? `${menuAct.description.slice(0, 24)}…` : menuAct.description) : undefined}
        onAction={(id) => { const t = menuId; if (id === 'share') setShareId(t); if (id === 'images') setImgsId(t); if (id === 'delete') setDelId(t); }} />
      <ActivitiesDeleteConfirm open={!!delId} onClose={() => setDelId(null)} description={delAct?.description}
        onDelete={(rb) => { setList((l) => l.filter((a) => a.id !== delId)); toast.success(rb ? '已删除并回档' : '已删除条目'); }} />
      <ActivityImagesSheet open={!!imgsId} onClose={() => setImgsId(null)} images={imgsId ? imgMap[imgsId] ?? [] : []}
        onChange={(v) => imgsId && setImgMap((m) => ({ ...m, [imgsId]: v }))} />
      <ImageLightbox open={!!lb} onClose={() => setLb(null)} images={lb ? imgMap[lb.id] : []} index={lb?.i ?? 0}
        onDelete={(i) => lb && setImgMap((m) => ({ ...m, [lb.id]: (m[lb.id] ?? []).filter((_, j) => j !== i) }))} />
      <ShareToOrgSheet open={!!shareId} onClose={() => setShareId(null)} activity={list.find((a) => a.id === shareId)} />
      <SummaryModal open={summary} onClose={() => setSummary(false)} params={new URLSearchParams(sumState === 'draft' ? 'view=preview' : sumState === 'running' ? 'state=busy' : '')} />
      <ActivitiesCalendarPicker open={picker} onClose={() => setPicker(false)} year={calY} month={calM} showImportant={calImp} onJump={(y, m) => { setCalY(y); setCalM(m); }} onToggleImportant={setCalImp} />
    </div>
  );
}

export default function Activities({ params }: { params: URLSearchParams }) {
  return <ActivitiesView params={params} />;
}
