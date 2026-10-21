/**
 * 任务子页顶部目标区（真实 GoalDeck + WeeklyGoalSection + CallingCardSection/CallingCardCard）。
 *   GoalDeck：「目标」「本周推进和重要倒计时」+ 切换「本周目标」「倒计时」。
 *   WeeklyGoalSection：未设「+ 设定本周目标」/ 进行中（描述 + 进度 + 已完成）/ 达成「🎉 目标达成！领取奖励」/ 已领「✨ 已获得 X +N」；
 *     长按（松手打开菜单… / 松手删除记录…）→ 菜单「修改选项」「重置本周目标 / 删除本周目标记录」「取消」。
 *   CallingCardSection：「倒计时」「+ 新建」；空「还没有倒计时 — 立下约定」；卡（icon + 标题 + 剩余/状态 + % + ⋯ 菜单 + 进度）；
 *     菜单「📌 钉到主页 / 取消钉选」「编辑」「手动归档」「取消归档」「删除 → 确认删除」；「归档 · N」折叠；宣告卡提示「不再提示」。
 */
import { AnimatePresence, motion } from 'framer-motion';
import { useState } from 'react';
import type { AttributeId, CallingCard } from '@/types';
import { P4ActionSheet, P4Button, P4Progress, P4SegmentTabs, IconMore, IconClose, IconChevron, useToast } from '@yellow/kit';
import { CollageItem, CollageStagger } from '@yellow/fx';
import { useLowMotion } from '@yellow/lib/prefs';
import { cx } from '@yellow/lib/cx';
import { ATTR_NAMES, TODAY_KEY, TODOS, WEEKLY_GOAL } from '@yellow/adapters/pkg2';
import { daysBetween, setHashParam, useLongPress } from './common';
import { toneBg } from './tones';
import { useCallingCards } from './callingCardStore';
import GoalSetupForm, { type GoalItem } from '@yellow/screens/overlays/GoalSetupForm.p4g';
import CelebrationModal from '@yellow/screens/overlays/CelebrationModal.p4g';
import ClaimedModal from '@yellow/screens/overlays/ClaimedModal.p4g';
import CallingCardEditor from '@yellow/screens/overlays/CallingCardEditor.p4g';
import CallingCardSectionDeleteConfirm from '@yellow/screens/overlays/CallingCardSectionDeleteConfirm.p4g';

const goalText = (g: GoalItem) => {
  const n = g.attribute ? ATTR_NAMES[g.attribute] : '';
  switch (g.type) {
    case 'activity_count': return `完成 ${g.target} 次${n}活动`;
    case 'todo_count': return `完成 ${g.target} 次任务`;
    case 'attr_points': return `获得 ${g.target} 点${n}`;
    default: return `获得 ${g.target} 点总点数`;
  }
};

export function WeeklyGoalSection({ initial }: { initial: 'none' | 'progress' | 'done' | 'claimed' }) {
  const toast = useToast();
  const [goal, setGoal] = useState<{ items: GoalItem[]; reward: string; completed: boolean; rewardAttr?: AttributeId; rewardPoints?: number } | null>(
    initial === 'none' ? null : {
      items: (WEEKLY_GOAL.goals as GoalItem[]).map((g) => (initial === 'progress' ? g : { ...g, current: g.target })),
      reward: WEEKLY_GOAL.reward, completed: initial === 'claimed', rewardAttr: initial === 'claimed' ? 'knowledge' : undefined, rewardPoints: initial === 'claimed' ? 7 : undefined,
    });
  const [setup, setSetup] = useState<false | 'new' | 'edit'>(false);
  const [menu, setMenu] = useState(false);
  const [cel, setCel] = useState(false);
  const [claimed, setClaimed] = useState<{ attrName: string; pts: number } | null>(null);
  const lp = useLongPress(() => setMenu(true));
  const allDone = !!goal && goal.items.every((g) => g.current >= g.target);

  if (!goal) {
    return (
      <>
        <button type="button" onClick={() => setSetup('new')} className="p4g-press flex h-16 w-full items-center justify-center gap-2 rounded-sm border-3 border-dashed border-p4g-line bg-p4g-surface font-display text-lead font-bold text-p4g-ink">+ 设定本周目标</button>
        <GoalSetupForm open={!!setup} onClose={() => setSetup(false)} onSubmit={(items, reward) => setGoal({ items: items.map((i) => ({ ...i, current: 0 })), reward, completed: false })} />
      </>
    );
  }
  return (
    <>
      <div {...lp.handlers} className={cx('relative min-w-0 select-none overflow-hidden rounded-sm border-3 border-p4g-black shadow-hard transition-colors night:border-p4g-yellow', lp.pressing ? 'bg-p4g-select text-[color:var(--p4g-select-ink)]' : 'bg-p4g-surface text-p4g-ink')}>
        <div className="flex items-center gap-2 border-b-3 border-p4g-black bg-p4g-yellow px-3 py-1.5 text-p4g-black night:border-p4g-yellow">
          <span className="font-display text-body font-bold">本周目标</span>
          <span className="p4g-date-type text-2xs opacity-70">{WEEKLY_GOAL.weekStart.slice(5).replace('-', '/')}–{WEEKLY_GOAL.weekEnd.slice(5).replace('-', '/')}</span>
          <span className="flex-1" />
          {goal.completed && <span className="rounded-xs bg-p4g-green px-1.5 font-display text-2xs font-bold text-p4g-black">已完成</span>}
        </div>
        <div className="space-y-2.5 px-3 py-2.5">
          {goal.items.map((g, i) => (
            <div key={i} className="min-w-0">
              <div className="mb-1 flex items-baseline justify-between gap-2"><span className="min-w-0 truncate font-display text-body font-bold">{goalText(g)}</span><span className="shrink-0 p4g-num text-meta">{Math.min(g.current, g.target)}/{g.target}</span></div>
              <P4Progress value={Math.min(g.current, g.target)} max={g.target} variant="segments" segments={Math.min(g.target, 12)} inverted={lp.pressing} />
            </div>
          ))}
          {goal.reward && <div className="text-meta font-bold opacity-80">🎁 奖励：{goal.reward}</div>}
          {goal.completed && goal.rewardAttr && <div className="font-display text-body font-bold text-p4g-orange-deep night:text-p4g-orange">✨ 已获得 {ATTR_NAMES[goal.rewardAttr]} +{goal.rewardPoints}</div>}
          {allDone && !goal.completed && <P4Button block variant="black" onPointerDown={(e) => e.stopPropagation()} onClick={() => setCel(true)}>🎉 目标达成！领取奖励</P4Button>}
          {lp.pressing && <p className="text-center text-cap font-bold">{goal.completed ? '松手删除记录…' : '松手打开菜单…'}</p>}
        </div>
      </div>
      <P4ActionSheet open={menu} onClose={() => setMenu(false)} title="本周目标"
        actions={[{ id: 'edit', label: '修改选项' }, { id: 'reset', label: goal.completed ? '删除本周目标记录' : '重置本周目标', danger: true }]}
        onAction={(id) => { setMenu(false); if (id === 'edit') setSetup('edit'); else { setGoal(null); toast(goal.completed ? '已删除本周目标记录' : '已重置本周目标'); } }} />
      <GoalSetupForm open={!!setup} onClose={() => setSetup(false)} initial={setup === 'edit' ? goal.items : undefined} initialReward={goal.reward}
        onSubmit={(items, reward) => setGoal((g) => g && { ...g, items: items.map((it) => ({ ...it, current: g.items.find((x) => x.type === it.type)?.current ?? 0 })), reward })} />
      <CelebrationModal open={cel} onClose={() => setCel(false)} onClaim={(a, pts) => { setGoal((g) => g && { ...g, completed: true, rewardAttr: a, rewardPoints: pts }); setClaimed({ attrName: ATTR_NAMES[a], pts }); }} />
      <ClaimedModal open={!!claimed} onClose={() => setClaimed(null)} attrName={claimed?.attrName} pts={claimed?.pts} />
    </>
  );
}

export function cardProgress(c: CallingCard) {
  const isToday = c.targetDate === TODAY_KEY;
  const daysLeft = c.targetDate ? daysBetween(TODAY_KEY, c.targetDate) : undefined;
  const datePct = c.targetDate ? Math.max(0, Math.min(100, (daysBetween(c.startDate, TODAY_KEY) / Math.max(1, daysBetween(c.startDate, c.targetDate))) * 100)) : 0;
  const linked = (c.linkedTodoIds ?? []).map((id) => TODOS.find((t) => t.id === id)).filter(Boolean);
  const todosDone = linked.filter((t) => t!.completedAt || (t!.isBigDeal && (t!.steps ?? []).every((s) => s.done))).length;
  const todoPct = linked.length ? (todosDone / linked.length) * 100 : 0;
  const overall = Math.round(c.mode === 'deadline' ? datePct : c.mode === 'todos' ? todoPct : Math.max(datePct, todoPct));
  const summary = c.archived ? (c.archiveReason === 'auto_todos' ? '已达成' : c.archiveReason === 'auto_date' ? '已至期' : '已收存')
    : c.mode === 'todos' ? `已完成 ${todosDone}/${linked.length} 项` : isToday ? '就是今天' : daysLeft !== undefined ? `还剩 ${daysLeft} 天` : '';
  return { overall, summary };
}

function CardRow({ c, onMenu }: { c: CallingCard; onMenu: () => void }) {
  const { overall, summary } = cardProgress(c);
  return (
    <div aria-label={`倒计时：${c.title}，${summary}，${overall}%`} className={cx('relative min-w-0 overflow-hidden rounded-sm border-3 border-p4g-black shadow-hard-sm night:border-p4g-yellow', c.archived ? 'bg-p4g-surface-2 opacity-80' : 'bg-p4g-yellow text-p4g-black')}
      style={{ backgroundImage: c.archived ? undefined : toneBg(c.tone) }}>
      <div className="flex min-w-0 items-center gap-2 px-2.5 py-2">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xs border-3 border-p4g-black bg-white text-[18px] text-p4g-black">{c.icon ?? '✦'}</span>
        <div className="min-w-0 flex-1">
          <div className="flex min-w-0 items-center gap-1.5">
            {c.pinned && <span aria-label="已钉到主页" className="shrink-0 text-meta">📌</span>}
            <span className={cx('min-w-0 truncate font-display text-lead font-bold', c.archived ? 'text-p4g-ink' : 'text-p4g-black')}>{c.title}</span>
          </div>
          {c.subtitle && <div className={cx('truncate text-cap italic', c.archived ? 'text-p4g-ink-soft' : 'text-p4g-black/70')}>「{c.subtitle}」</div>}
        </div>
        <span className="shrink-0 rounded-xs bg-p4g-black px-1.5 py-0.5 font-display text-cap font-bold text-p4g-yellow">{summary}</span>
        <span className={cx('w-11 shrink-0 text-right p4g-num text-h3', c.archived ? 'text-p4g-ink' : 'text-p4g-black')}>{overall}%</span>
        <button type="button" aria-label="菜单" onClick={onMenu} className="flex h-9 w-8 shrink-0 items-center justify-center rounded-xs border-thin border-p4g-black bg-white text-p4g-black"><IconMore size={16} /></button>
      </div>
      <div className="h-1.5 bg-p4g-black/80"><div className="h-full origin-left bg-p4g-orange" style={{ transform: `scaleX(${overall / 100})` }} /></div>
    </div>
  );
}

export function CallingCardSection({ empty }: { empty?: boolean }) {
  const toast = useToast();
  const low = useLowMotion();
  // 与「宣告卡」总览页（#/p/callingcard）共用一份 store；?state=empty 演示时用本地空列表
  const [shared, setShared] = useCallingCards();
  const [local, setLocal] = useState<CallingCard[]>([]);
  const cards = empty ? local : shared;
  const setCards = (empty ? setLocal : setShared) as (f: (l: CallingCard[]) => CallingCard[]) => void;
  const [menu, setMenu] = useState<CallingCard | null>(null);
  const [confirmDel, setConfirmDel] = useState(false);
  const [del, setDel] = useState<CallingCard | null>(null);
  const [editor, setEditor] = useState<false | { card: CallingCard | null }>(false);
  const [archOpen, setArchOpen] = useState(false);
  const [hint, setHint] = useState(true);
  const active = cards.filter((c) => !c.archived);
  const archived = cards.filter((c) => c.archived);
  const upd = (id: string, p: Partial<CallingCard>) => setCards((l) => l.map((c) => (c.id === id ? { ...c, ...p } : p.pinned ? { ...c, pinned: false } : c)));
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="font-display text-body font-bold text-p4g-ink">倒计时</span>
        <P4Button size="sm" variant="black" onClick={() => setEditor({ card: null })}>+ 新建</P4Button>
      </div>
      {hint && active.length > 0 && (
        <div className="flex min-w-0 items-center gap-2 rounded-sm bg-p4g-msg px-3 py-1.5 text-cap font-bold text-[color:var(--p4g-msg-ink)]">
          <span className="min-w-0 flex-1 leading-snug">为重要的事写一张「宣告卡」，倒计时随时在此映入眼帘</span>
          <button type="button" aria-label="不再提示" onClick={() => setHint(false)} className="shrink-0 text-p4g-yellow"><IconClose size={12} /></button>
        </div>
      )}
      {active.length === 0 ? (
        <button type="button" onClick={() => setEditor({ card: null })} className="flex h-14 w-full items-center justify-center gap-2 rounded-sm border-3 border-dashed border-p4g-line bg-p4g-surface font-display text-body font-bold text-p4g-ink-soft"><span>还没有倒计时 — 立下约定</span></button>
      ) : (
        <CollageStagger className="grid grid-cols-1 gap-2">{active.map((c, i) => <CollageItem key={c.id} tilt={i % 2 ? 0.4 : -0.4}><CardRow c={c} onMenu={() => { setConfirmDel(false); setMenu(c); }} /></CollageItem>)}</CollageStagger>
      )}
      {archived.length > 0 && (
        <div>
          <button type="button" onClick={() => setArchOpen((v) => !v)} aria-expanded={archOpen} className="flex items-center gap-1 font-display text-cap font-bold text-p4g-ink-soft">
            <IconChevron size={11} className={cx('transition-transform', archOpen && 'rotate-90')} /><span className="uppercase tracking-wider">归档</span><span className="opacity-70">· {archived.length}</span>
          </button>
          <AnimatePresence initial={false}>
            {archOpen && <motion.div initial={low ? { opacity: 0 } : { opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="mt-1.5 grid grid-cols-1 gap-2">{archived.map((c) => <CardRow key={c.id} c={c} onMenu={() => { setConfirmDel(false); setMenu(c); }} />)}</motion.div>}
          </AnimatePresence>
        </div>
      )}
      <P4ActionSheet open={!!menu} onClose={() => setMenu(null)} title={menu?.title}
        actions={menu ? [
          ...(menu.archived ? [] : [{ id: 'pin', label: menu.pinned ? '取消钉选' : '📌 钉到主页' }, { id: 'edit', label: '编辑' }, { id: 'archive', label: '手动归档' }]),
          ...(menu.archived ? [{ id: 'unarchive', label: '取消归档' }] : []),
          { id: 'delete', label: confirmDel ? '确认删除' : '删除', danger: true },
        ] : []}
        onAction={(id) => {
          const c = menu!;
          if (id === 'delete' && !confirmDel) { setConfirmDel(true); setMenu(c); return; }
          setMenu(null);
          if (id === 'pin') upd(c.id, { pinned: !c.pinned });
          if (id === 'edit') setEditor({ card: c });
          if (id === 'archive') { upd(c.id, { archived: true, archiveReason: 'manual', pinned: false }); toast('已归档'); }
          if (id === 'unarchive') upd(c.id, { archived: false, archiveReason: undefined });
          if (id === 'delete') setDel(c);
        }} />
      <CallingCardSectionDeleteConfirm open={!!del} onClose={() => setDel(null)} title={del?.title} onConfirm={() => { setCards((l) => l.filter((c) => c.id !== del?.id)); toast.success('已删除'); }} />
      <CallingCardEditor open={!!editor} onClose={() => setEditor(false)} initialCard={editor ? editor.card : null}
        onSave={(c) => setCards((l) => { const exists = l.some((x) => x.id === c.id); const base = c.pinned ? l.map((x) => ({ ...x, pinned: false })) : l; return exists ? base.map((x) => (x.id === c.id ? { ...x, ...c } : x)) : [c, ...base]; })} />
    </div>
  );
}

export function GoalDeck({ deck: d0, goalState, cardsEmpty }: { deck: 'weekly' | 'cards'; goalState: 'none' | 'progress' | 'done' | 'claimed'; cardsEmpty?: boolean }) {
  const low = useLowMotion();
  const [deck, setDeck] = useState(d0);
  return (
    <section className="relative min-w-0 overflow-hidden rounded-sm border-3 border-p4g-black bg-p4g-surface-2 shadow-hard-lg night:border-p4g-yellow">
      <div aria-hidden className="h-2 p4g-candy-h" />
      <div className="flex min-w-0 flex-wrap items-end gap-x-3 gap-y-2 px-3 pt-2.5">
        <div className="min-w-0 flex-1">
          <h3 className="font-display text-h2 font-black italic leading-none text-p4g-ink">目标</h3>
          <p className="mt-1 p4g-clamp-2 text-cap font-bold text-p4g-ink-soft">本周推进和重要倒计时</p>
        </div>
        <P4SegmentTabs size="sm" className="w-[188px] shrink-0" items={[{ id: 'weekly', label: '本周目标' }, { id: 'cards', label: '倒计时' }]} value={deck}
          onChange={(id) => { setDeck(id as 'weekly'); setHashParam('deck', id); }} />
      </div>
      <div className="p-3">
        <AnimatePresence mode="wait" initial={false}>
          <motion.div key={deck} initial={low ? { opacity: 0 } : { opacity: 0, x: deck === 'cards' ? 24 : -24 }} animate={{ opacity: 1, x: 0 }} exit={low ? { opacity: 0 } : { opacity: 0, x: deck === 'cards' ? -24 : 24 }} transition={{ duration: 0.18 }}>
            {deck === 'weekly' ? <WeeklyGoalSection initial={goalState} /> : <CallingCardSection empty={cardsEmpty} />}
          </motion.div>
        </AnimatePresence>
      </div>
    </section>
  );
}
