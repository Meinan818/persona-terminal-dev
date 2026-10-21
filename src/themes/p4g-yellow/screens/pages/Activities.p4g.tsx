/**
 * 行动 · 记录子页（真实 src/pages/Activities.tsx 的 ActivitiesView）。
 *   顶栏：「成长总结」（总结书写中… / 总结草稿 / 成长总结）、搜索「搜索记录内容…」、「日历」「筛选」切换。
 *   筛选面板：⭐ 重要、清除全部、属性（可多选）+ 清除、来源 全部/手动记录/任务完成/战斗奖励、时间 年/月下拉、仅显示重要记录、已选月份 chip。
 *   日历视图：月历 + 前后翻 + 标题开年月跳转浮层；日格选中 →「YYYY/MM/DD 的记录」/「这天暂无记录」；选中过去 7 天内 → FAB 变「补录历史记录」。
 *   列表：年 / 月 折叠分组；记录卡（S.Link 行版式）：标签、配图「查看图片 N」、大事收束卡子步时间线、长按 500ms 开菜单。
 *   FAB：P4 蓝色四角星「添加记录」/「补」。
 * 查询参数：view=calendar|filter；state=empty（无记录）|nomatch（筛选无结果）；summary=running|draft（按钮文案）。
 */
import { AnimatePresence, motion } from 'framer-motion';
import { useMemo, useState } from 'react';
import type { Activity, AttributeId } from '@/types';
import { P4Chip, P4EmptyState, P4Input, P4Select, P4Switch, P4Button, IconSearch, IconChevronDown, IconBack, IconChevron, WeatherIcon, type P4Weather, useToast } from '@yellow/kit';
import { CollageItem, CollageStagger } from '@yellow/fx';
import { useLowMotion } from '@yellow/lib/prefs';
import { p4gAsset } from '@yellow/lib/asset';
import { cx } from '@yellow/lib/cx';
import { ACTIVITIES, ACTIVITY_IMAGES, ATTR_IDS, ATTR_NAMES, BIGDEAL_STEP_LOG, TODAY, TODAY_KEY, dayKey } from '@yellow/adapters/pkg2';
import { StarFab, Tag, fmtTime, qp, setHashParam, useLongPress } from '@yellow/screens/pkg2/common';
import ActivityRecordSheet, { type RecordSavePayload } from '@yellow/screens/overlays/ActivityRecordSheet.p4g';
import ActivitiesRecordMenu from '@yellow/screens/overlays/ActivitiesRecordMenu.p4g';
import ActivitiesDeleteConfirm from '@yellow/screens/overlays/ActivitiesDeleteConfirm.p4g';
import ActivityImagesSheet from '@yellow/screens/overlays/ActivityImagesSheet.p4g';
import ImageLightbox from '@yellow/screens/overlays/ImageLightbox.p4g';
import ShareToOrgSheet from '@yellow/screens/overlays/ShareToOrgSheet.p4g';
import SaveSuccessModal from '@yellow/screens/overlays/SaveSuccessModal.p4g';
import SummaryModal from '@yellow/screens/overlays/SummaryModal.p4g';
import ActivitiesCalendarPicker from '@yellow/screens/overlays/ActivitiesCalendarPicker.p4g';

const SOURCES = [
  { key: 'all', label: '全部' }, { key: 'local', label: '手动记录' }, { key: 'todo', label: '任务完成' }, { key: 'battle', label: '战斗奖励' },
] as const;
const WEEKDAYS = ['日', '一', '二', '三', '四', '五', '六'];

type Accent = 'achievement' | 'skill' | 'shadow' | 'confidant' | 'weekly' | 'card' | 'bigdeal' | 'todo' | 'important' | 'default';
const accentOf = (a: Activity): Accent =>
  a.category === 'achievement_unlock' ? 'achievement' : a.category === 'skill_unlock' ? 'skill' : a.category === 'shadow_defeat' ? 'shadow'
    : a.category === 'confidant' ? 'confidant' : a.category === 'weekly_goal' ? 'weekly' : a.category === 'calling_card_clear' ? 'card'
      : a.category === 'bigdeal_clear' ? 'bigdeal' : a.method === 'todo' ? 'todo' : a.important ? 'important' : 'default';
const ACCENT_BAR: Record<Accent, string> = {
  achievement: 'bg-p4g-yellow', skill: 'bg-p4g-cyan', shadow: 'bg-p4g-purple', confidant: 'bg-p4g-red', weekly: 'bg-p4g-green',
  card: 'bg-p4g-orange-deep', bigdeal: 'bg-p4g-black night:bg-p4g-yellow', todo: 'bg-p4g-green', important: 'bg-p4g-orange', default: 'bg-p4g-line/30',
};
const weatherKind = (icon?: string): P4Weather | null => (icon === 'rain' ? 'rain' : icon === 'cloudy' ? 'cloudy' : icon === 'sunny' ? 'sunny' : icon === 'snow' ? 'snow' : icon === 'fog' ? 'fog' : null);

function RecordCard({ a, images, onMenu, onImage, expanded, onToggleDeal }: { a: Activity; images: string[]; onMenu: () => void; onImage: (i: number) => void; expanded: boolean; onToggleDeal: () => void }) {
  const lp = useLongPress(onMenu);
  const acc = accentOf(a);
  const pts = Object.entries(a.pointsAwarded).filter(([, v]) => v > 0) as [AttributeId, number][];
  const wk = weatherKind(a.weather?.icon);
  const steps = a.bigDealId ? BIGDEAL_STEP_LOG[a.bigDealId] : undefined;
  const sel = lp.pressing;
  return (
    <div {...lp.handlers} className={cx('relative flex min-w-0 select-none overflow-hidden border-b-[3px] transition-colors', sel ? 'bg-p4g-select text-[color:var(--p4g-select-ink)]' : 'bg-p4g-surface text-p4g-ink', 'border-[color:var(--p4g-separator-a)]')} style={{ WebkitTouchCallout: 'none' }}>
      <span aria-hidden className={cx('w-2 shrink-0', ACCENT_BAR[acc])} />
      <div className="min-w-0 flex-1 px-3 py-2.5">
        <p className="break-words text-[15px] font-bold leading-snug">
          {acc === 'bigdeal' && <span className="mr-1.5 inline-block -translate-y-px rounded-xs bg-p4g-black px-1.5 align-middle font-display text-2xs font-black text-p4g-yellow night:bg-p4g-yellow night:text-p4g-black">BIG DEAL</span>}
          {a.backfilled && <span title="回归时补记" className="mr-1.5 inline-block -translate-y-px rounded-xs border-thin border-current px-1 align-middle text-2xs font-black opacity-60">补</span>}
          {a.description}
        </p>
        {acc === 'bigdeal' && (
          <div className="mt-1.5">
            <button type="button" onPointerDown={(e) => e.stopPropagation()} onClick={(e) => { e.stopPropagation(); onToggleDeal(); }} className="flex items-center gap-1 font-display text-cap font-bold text-p4g-orange-deep night:text-p4g-orange">
              子步时间线（{steps?.length ?? 0}）<IconChevronDown size={11} className={cx('transition-transform', expanded && 'rotate-180')} />
            </button>
            <AnimatePresence initial={false}>
              {expanded && (
                <motion.ol initial={{ opacity: 0, scaleY: 0.6 }} animate={{ opacity: 1, scaleY: 1 }} exit={{ opacity: 0, scaleY: 0.6 }} style={{ originY: 0 }} className="mt-1.5 space-y-1 border-l-3 border-p4g-orange pl-3">
                  {steps?.length ? steps.map((s, k) => (
                    <li key={k} className="flex min-w-0 items-center gap-2 text-meta"><span className="p4g-num shrink-0 text-cap text-p4g-orange-deep night:text-p4g-orange">{String(k + 1).padStart(2, '0')}</span><span className="min-w-0 flex-1 truncate">{s.title}</span><span className="shrink-0 p4g-date-type text-2xs opacity-60">{s.date.getMonth() + 1}/{s.date.getDate()}</span></li>
                  )) : <li className="text-cap opacity-60">子步记录已被单独清理</li>}
                </motion.ol>
              )}
            </AnimatePresence>
          </div>
        )}
        {images.length > 0 && (
          <div className="mt-2 flex gap-1.5">
            {images.slice(0, 4).map((src, i) => (
              <button key={i} type="button" aria-label={`查看图片 ${i + 1}`} onPointerDown={(e) => e.stopPropagation()} onClick={(e) => { e.stopPropagation(); onImage(i); }}
                className="relative h-12 w-12 shrink-0 overflow-hidden rounded-xs border-thin border-p4g-black bg-p4g-black">
                <img src={p4gAsset(src)} alt="" className="h-full w-full object-cover" />
                {i === 3 && images.length > 4 && <span className="absolute inset-0 flex items-center justify-center bg-black/60 p4g-num text-meta text-white">+{images.length - 4}</span>}
              </button>
            ))}
          </div>
        )}
        <div className="mt-2 flex min-w-0 flex-wrap items-center gap-1.5">
          {acc === 'confidant' && <Tag tone="red">✧ 同伴</Tag>}
          {acc === 'shadow' && <Tag tone="black">👁 Shadow击破{a.important ? ' ★首杀' : ''}</Tag>}
          {acc === 'todo' && <Tag tone="green">✓ 任务</Tag>}
          {acc === 'weekly' && <Tag tone="green">🏆 本周目标</Tag>}
          {acc === 'skill' && <Tag tone="cyan">✨ 技能解锁</Tag>}
          {acc === 'achievement' && <Tag tone="yellow">🏆 成就解锁</Tag>}
          {acc === 'card' && <Tag tone="orange">✦ 倒计时</Tag>}
          {a.important && acc !== 'shadow' && <Tag tone="orange">⭐ 重要</Tag>}
          {pts.map(([k, v]) => <span key={k} className="inline-flex shrink-0 items-center rounded-xs border-thin border-current px-1.5 font-display text-2xs font-bold tabular-nums">{ATTR_NAMES[k]} +{v}</span>)}
          <span className="ml-auto flex shrink-0 items-center gap-1 p4g-date-type text-2xs opacity-70">
            {wk && <span title={a.weather?.text ?? ''} aria-label={a.weather?.text ?? '天气'}><WeatherIcon kind={wk} size={16} /></span>}
            {fmtTime(a.date)}
          </span>
        </div>
      </div>
    </div>
  );
}

function Calendar({ year, month, onMonth, selected, onSelect, onPicker, marks, showImportant }: { year: number; month: number; onMonth: (d: number) => void; selected: string | null; onSelect: (k: string | null) => void; onPicker: () => void; marks: Map<string, { n: number; imp: boolean }>; showImportant: boolean }) {
  const first = new Date(year, month, 1).getDay();
  const days = new Date(year, month + 1, 0).getDate();
  const cells: (number | null)[] = [...Array(first).fill(null), ...Array.from({ length: days }, (_, i) => i + 1)];
  while (cells.length % 7) cells.push(null);
  return (
    <div className="overflow-hidden rounded-sm border-3 border-p4g-black bg-p4g-surface shadow-hard night:border-p4g-yellow">
      <div className="flex items-center gap-2 bg-p4g-black px-2 py-2 text-p4g-yellow">
        <button type="button" aria-label="上个月" onClick={() => onMonth(-1)} className="flex h-9 w-9 items-center justify-center rounded-xs bg-p4g-yellow text-p4g-black"><IconBack size={14} /></button>
        <button type="button" onClick={onPicker} className="min-w-0 flex-1 truncate text-center font-display text-h3 font-bold"><span className="p4g-date-type">{year}年{month + 1}月</span> <IconChevronDown size={12} className="inline" /></button>
        <button type="button" aria-label="下个月" onClick={() => onMonth(1)} className="flex h-9 w-9 items-center justify-center rounded-xs bg-p4g-yellow text-p4g-black"><IconChevron size={14} /></button>
      </div>
      <div className="grid grid-cols-7 border-b-3 border-p4g-black bg-p4g-yellow text-center font-display text-cap font-bold text-p4g-black night:border-p4g-yellow">
        {WEEKDAYS.map((w, i) => <div key={w} className={cx('py-1', i === 0 && 'text-p4g-red', i === 6 && 'text-[color:var(--p4g-info)]')}>{w}</div>)}
      </div>
      <div className="grid grid-cols-7">
        {cells.map((d, i) => {
          if (!d) return <div key={i} className="h-12 border-b border-r border-p4g-line/15 min-[400px]:h-14" />;
          const k = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
          const m = marks.get(k);
          const sel = selected === k;
          const today = k === TODAY_KEY;
          return (
            <button key={i} type="button" onClick={() => onSelect(sel ? null : k)} aria-pressed={sel} aria-label={`${month + 1}月${d}日${m ? `，${m.n} 条记录` : ''}`}
              className={cx('relative flex h-12 min-w-0 flex-col min-[400px]:h-14 items-center justify-center border-b border-r border-p4g-line/15', sel ? 'bg-p4g-select text-[color:var(--p4g-select-ink)]' : today ? 'bg-p4g-yellow text-p4g-black' : 'text-p4g-ink')}>
              <span className={cx('p4g-num text-[15px] leading-none', i % 7 === 0 && !sel && !today && 'text-p4g-red')}>{d}</span>
              {m && <span className="mt-1 flex gap-0.5">{Array.from({ length: Math.min(3, m.n) }).map((_, j) => <span key={j} className={cx('h-1.5 w-1.5', sel ? 'bg-current' : 'bg-p4g-orange')} />)}</span>}
              {m?.imp && showImportant && <span aria-label="重要事件" className="absolute right-0.5 top-0 text-[10px] leading-none">★</span>}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export function ActivitiesView({ params }: { params: URLSearchParams }) {
  const toast = useToast();
  const low = useLowMotion();
  const st = qp(params, 'state');
  const [list, setList] = useState<Activity[]>(st === 'empty' ? [] : ACTIVITIES);
  const [imgMap, setImgMap] = useState<Record<string, string[]>>(st === 'empty' ? {} : ACTIVITY_IMAGES);
  const [q, setQ] = useState('');
  const [showCal, setShowCal] = useState(qp(params, 'view') === 'calendar');
  const [showFilter, setShowFilter] = useState(qp(params, 'view') === 'filter' || st === 'nomatch');
  const [attrs, setAttrs] = useState<AttributeId[]>(st === 'nomatch' ? ['charm'] : []);
  const [source, setSource] = useState<(typeof SOURCES)[number]['key']>(st === 'nomatch' ? 'battle' : 'all');
  const [fy, setFy] = useState<string>('all');
  const [fm, setFm] = useState<string>('all');
  const [onlyImp, setOnlyImp] = useState(false);
  const [calY, setCalY] = useState(2026);
  const [calM, setCalM] = useState(9);
  const [calSel, setCalSel] = useState<string | null>(null);
  const [calImp, setCalImp] = useState(true);
  const [picker, setPicker] = useState(false);
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set(['2025']));
  const [deals, setDeals] = useState<Set<string>>(new Set());
  const [sheet, setSheet] = useState<false | { backdate: string | null }>(false);
  const [menuId, setMenuId] = useState<string | null>(null);
  const [delId, setDelId] = useState<string | null>(null);
  const [imgsId, setImgsId] = useState<string | null>(null);
  const [shareId, setShareId] = useState<string | null>(null);
  const [lb, setLb] = useState<{ id: string; i: number } | null>(null);
  const [saved, setSaved] = useState<RecordSavePayload | null>(null);
  const [summary, setSummary] = useState(false);
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
    const a: Activity = { id: `n${Date.now()}`, userId: 'u1', date: d, description: p.description, pointsAwarded: p.points, method: 'local', important: p.important, weather: { icon: 'rain', text: '小雨' }, wishId: p.wishId };
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

  return (
    <div className="min-w-0 pb-24">
      {/* 顶栏 */}
      <div className="mb-3 flex min-w-0 items-center gap-2">
        <button type="button" onClick={() => setSummary(true)} aria-label="成长总结" className="p4g-press relative flex h-11 min-w-0 shrink-0 items-center gap-1.5 rounded-sm border-3 border-p4g-black bg-p4g-black px-3 font-display text-body font-bold text-p4g-yellow shadow-hard night:border-p4g-yellow">
          <span aria-hidden>🦋</span>
          <span className="truncate">{sumState === 'running' ? '总结书写中…' : sumState === 'draft' ? '总结草稿' : '成长总结'}</span>
          {sumState === 'draft' && <span className="absolute -right-1.5 -top-1.5 h-3 w-3 rounded-full border-2 border-p4g-black bg-p4g-red" />}
        </button>
        <div className="flex-1" />
        <button type="button" aria-pressed={showCal} onClick={() => { setShowCal((v) => !v); setHashParam('view', showCal ? null : 'calendar'); }}
          className={cx('p4g-press h-11 shrink-0 rounded-sm border-3 px-3 font-display text-body font-bold shadow-hard-sm', showCal ? 'border-p4g-black bg-p4g-select text-[color:var(--p4g-select-ink)]' : 'border-p4g-line bg-p4g-surface-2 text-p4g-ink')}>日历</button>
        <button type="button" aria-pressed={showFilter} onClick={() => setShowFilter((v) => !v)}
          className={cx('p4g-press relative h-11 shrink-0 rounded-sm border-3 px-3 font-display text-body font-bold shadow-hard-sm', showFilter ? 'border-p4g-black bg-p4g-select text-[color:var(--p4g-select-ink)]' : 'border-p4g-line bg-p4g-surface-2 text-p4g-ink')}>
          筛选{hasFilter && <span className="absolute -right-1.5 -top-1.5 h-3 w-3 rounded-full border-2 border-p4g-black bg-p4g-orange" />}
        </button>
      </div>
      <P4Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="搜索记录内容…" prefix={<IconSearch size={16} />} aria-label="搜索记录内容" wrapClassName="mb-3" />

      {/* 筛选面板（向下展开） */}
      <AnimatePresence initial={false}>
        {showFilter && (
          <motion.div key="flt" initial={low ? { opacity: 0 } : { opacity: 0, scaleY: 0.4 }} animate={{ opacity: 1, scaleY: 1 }} exit={low ? { opacity: 0 } : { opacity: 0, scaleY: 0.4 }} transition={{ duration: 0.18 }} style={{ originY: 0 }}
            className="mb-4 overflow-hidden rounded-sm border-3 border-p4g-black bg-p4g-surface-2 text-p4g-ink shadow-hard night:border-p4g-yellow">
            <div aria-hidden className="h-1.5 p4g-hazard" />
            <div className="space-y-3 p-3">
              <div className="flex min-w-0 flex-wrap items-center gap-2">
                <P4Chip tone={onlyImp ? 'black' : 'outline'} selected={onlyImp} onClick={() => setOnlyImp((v) => !v)}>⭐ 重要</P4Chip>
                {fy !== 'all' && <P4Chip tone="yellow" onRemove={() => { setFy('all'); setFm('all'); }}>{fy}年{fm !== 'all' ? `${fm}月` : ''}</P4Chip>}
                {fy === 'all' && fm !== 'all' && <P4Chip tone="yellow" onRemove={() => setFm('all')}>{fm}月</P4Chip>}
                <div className="flex-1" />
                {hasFilter && <P4Button size="sm" variant="ghost" onClick={clearAll}>清除全部</P4Button>}
              </div>
              <div>
                <div className="mb-1.5 flex items-center justify-between"><p className="font-display text-cap font-bold uppercase tracking-wider text-p4g-ink-soft">属性（可多选）</p>{attrs.length > 0 && <button type="button" onClick={() => setAttrs([])} className="font-display text-cap font-bold text-p4g-orange-deep night:text-p4g-orange">清除</button>}</div>
                <div className="flex flex-wrap gap-1.5">
                  {ATTR_IDS.map((k) => <P4Chip key={k} tone={attrs.includes(k) ? 'tag' : 'outline'} selected={attrs.includes(k)} onClick={() => setAttrs((s) => (s.includes(k) ? s.filter((x) => x !== k) : [...s, k]))}>{ATTR_NAMES[k]}</P4Chip>)}
                </div>
              </div>
              <div>
                <p className="mb-1.5 font-display text-cap font-bold uppercase tracking-wider text-p4g-ink-soft">来源</p>
                <div className="grid grid-cols-2 gap-1.5 min-[420px]:grid-cols-4">
                  {SOURCES.map((s) => <button key={s.key} type="button" onClick={() => setSource(s.key)} className={cx('min-w-0 truncate rounded-sm border-thin py-1.5 font-display text-meta font-bold', source === s.key ? 'border-p4g-black bg-p4g-select text-[color:var(--p4g-select-ink)]' : 'border-p4g-line bg-p4g-surface text-p4g-ink')}>{s.label}</button>)}
                </div>
              </div>
              <div>
                <p className="mb-1.5 font-display text-cap font-bold uppercase tracking-wider text-p4g-ink-soft">时间</p>
                <div className="grid grid-cols-2 gap-2">
                  <P4Select aria-label="年份" value={fy} onChange={(e) => { setFy(e.target.value); setFm('all'); }} options={[{ value: 'all', label: '全部年份' }, ...years.map((y) => ({ value: String(y), label: `${y}年` }))]} />
                  <P4Select aria-label="月份" value={fm} onChange={(e) => setFm(e.target.value)} options={[{ value: 'all', label: '全部月份' }, ...months.map((m) => ({ value: String(m), label: `${m}月` }))]} />
                </div>
              </div>
              <div className="flex items-center justify-between gap-3 border-t-2 border-dashed border-p4g-line/30 pt-2.5">
                <span className="text-body font-bold">仅显示重要记录</span>
                <P4Switch checked={onlyImp} onChange={setOnlyImp} aria-label="仅显示重要记录" />
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 日历视图 */}
      {showCal && (
        <div className="mb-5 space-y-3">
          <Calendar year={calY} month={calM} selected={calSel} onSelect={setCalSel} onPicker={() => setPicker(true)} marks={marks} showImportant={calImp}
            onMonth={(d) => { const m = calM + d; setCalY(calY + Math.floor(m / 12)); setCalM(((m % 12) + 12) % 12); }} />
          {calSel && (
            <div>
              <div className="mb-1.5 inline-block bg-p4g-black px-2 py-0.5 p4g-date-type text-meta text-p4g-yellow night:bg-p4g-yellow night:text-p4g-black">{calSel.replace(/-/g, '/')} 的记录</div>
              {dayList.length ? <div className="overflow-hidden rounded-sm border-3 border-p4g-black shadow-hard night:border-p4g-yellow">{dayList.map(card)}</div>
                : <p className="py-3 text-center text-meta font-bold text-[color:var(--p4g-on-stage)] opacity-80">这天暂无记录</p>}
            </div>
          )}
        </div>
      )}

      {/* 列表 */}
      {filtered.length === 0 ? (
        <P4EmptyState title={hasFilter ? '没有符合条件的记录' : '还没有任何记录'} hint={hasFilter ? '试试调整或清除筛选条件' : '把今天做过的一件小事记下来吧'}
          action={hasFilter ? <P4Button variant="black" onClick={clearAll}>清除全部</P4Button> : undefined} />
      ) : (
        <CollageStagger className="space-y-4">
          {groups.map((yg) => {
            const yk = String(yg.year);
            const yOpen = !collapsed.has(yk);
            return (
              <CollageItem key={yk}>
                <button type="button" onClick={() => setCollapsed((s) => toggleSet(s, yk))} aria-expanded={yOpen} className="mb-2 flex w-full min-w-0 items-center gap-2 text-[color:var(--p4g-on-stage)]">
                  <span className="p4g-num text-h2">{yg.year}</span><span className="font-display text-body font-bold">年</span>
                  <span className="h-[3px] flex-1 bg-current opacity-60" />
                  <span className="font-display text-cap font-bold">{yg.months.reduce((n, m) => n + m.items.length, 0)} 条</span>
                  <IconChevronDown size={14} className={cx('transition-transform', !yOpen && '-rotate-90')} />
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
                            <button type="button" onClick={() => setCollapsed((s) => toggleSet(s, mk))} aria-expanded={mOpen}
                              className="relative z-[1] -mb-[3px] ml-1 inline-flex items-center gap-1.5 bg-p4g-tag px-3 py-0.5 font-display text-body font-bold text-[color:var(--p4g-tag-ink)]" style={{ clipPath: 'polygon(0 0,100% 0,calc(100% - 10px) 100%,0 100%)' }}>
                              <span className="p4g-num">{mg.month}</span> 月<span className="text-cap opacity-80">· {mg.items.length}</span>
                              <IconChevronDown size={11} className={cx('transition-transform', !mOpen && '-rotate-90')} />
                            </button>
                            {mOpen && (
                              <div className="overflow-hidden rounded-sm border-3 border-p4g-black shadow-hard night:border-p4g-yellow">
                                {mg.items.map((a) => {
                                  const dl = dayLabel(a.date);
                                  const head = dl !== lastDay; lastDay = dl;
                                  return (
                                    <div key={a.id}>
                                      {head && <div className="bg-p4g-black px-3 py-0.5 font-display text-2xs font-bold tracking-wider text-p4g-yellow">{dl}</div>}
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
              </CollageItem>
            );
          })}
          <p className="text-center font-display text-cap font-bold text-[color:var(--p4g-on-stage)] opacity-70">长按记录卡打开菜单</p>
        </CollageStagger>
      )}

      <StarFab label={isPast ? '补录历史记录' : '添加记录'} glyph={isPast ? '补' : '+'} tone={isPast ? 'orange' : 'cyan'} onClick={() => setSheet({ backdate: isPast ? calSel : null })} />

      <ActivityRecordSheet open={!!sheet} onClose={() => setSheet(false)} backdate={sheet ? sheet.backdate : null} onSave={onSave} />
      <SaveSuccessModal open={!!saved} onClose={() => setSaved(null)} description={saved?.description} totalPoints={saved ? Object.values(saved.points).reduce((a, b) => a + b, 0) : 0} important={saved?.important} />
      <ActivitiesRecordMenu open={!!menuId} onClose={() => setMenuId(null)} title={menuAct ? (menuAct.description.length > 24 ? `${menuAct.description.slice(0, 24)}…` : menuAct.description) : undefined}
        onAction={(id) => { const t = menuId; if (id === 'share') setShareId(t); if (id === 'images') setImgsId(t); if (id === 'delete') setDelId(t); }} />
      <ActivitiesDeleteConfirm open={!!delId} onClose={() => setDelId(null)} description={delAct?.description}
        onDelete={(rb) => { setList((l) => l.filter((a) => a.id !== delId)); toast.success(rb ? '已删除并回档' : '已删除条目'); }} />
      <ActivityImagesSheet open={!!imgsId} onClose={() => setImgsId(null)} images={imgsId ? imgMap[imgsId] ?? [] : []}
        title={imgsId ? `图片 · ${(list.find((a) => a.id === imgsId)?.description ?? '').slice(0, 16)}` : undefined}
        onChange={(v) => imgsId && setImgMap((m) => ({ ...m, [imgsId]: v }))} />
      <ImageLightbox open={!!lb} onClose={() => setLb(null)} images={lb ? imgMap[lb.id] : []} index={lb?.i ?? 0}
        onDelete={(i) => lb && setImgMap((m) => ({ ...m, [lb.id]: (m[lb.id] ?? []).filter((_, j) => j !== i) }))} />
      <ShareToOrgSheet open={!!shareId} onClose={() => setShareId(null)} activity={list.find((a) => a.id === shareId)} />
      <SummaryModal open={summary} onClose={() => setSummary(false)} />
      <ActivitiesCalendarPicker open={picker} onClose={() => setPicker(false)} year={calY} month={calM} showImportant={calImp} onJump={(y, m) => { setCalY(y); setCalM(m); }} onToggleImportant={setCalImp} />
    </div>
  );
}

export default function Activities({ params }: { params: URLSearchParams }) {
  return <ActivitiesView params={params} />;
}
