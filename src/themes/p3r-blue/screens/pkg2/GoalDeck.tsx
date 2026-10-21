/**
 * 任务子页顶部目标区（真实 weeklyGoal/GoalDeck + WeeklyGoalSection + callingCard/CallingCardSection + CallingCardCard，p3 形态）。
 *   GoalDeck：「目标」「本周推进和重要倒计时」+ 切换「本周目标」「倒计时」（P3Segment 蓝斜块）。
 *   WeeklyGoalSection：未设「+ 设定本周目标」/ 进行（描述 + 分段进度 + 已完成）/ 达成「✦ 目标达成！领取奖励」/ 已领「✦ 已获得 X +N」；
 *     长按（松手打开菜单… / 松手删除记录…）→ 菜单「修改选项」「重置本周目标 / 删除本周目标记录」「取消」。
 *   CallingCardSection：「倒计时」「+ 新建」；空「还没有倒计时 — 立下约定」；卡（icon + 标题 + 台词 + 剩余 / 状态 + % + 菜单 + 进度）；
 *     菜单「📌 钉到主页 / 取消钉选」「编辑」「手动归档」「取消归档」「删除 → 确认删除」；「归档 · N」折叠。
 * 状态改写自黄色版 screens/pkg2/GoalDeck.tsx（复制，不 import）。
 */
import { AnimatePresence, motion } from 'framer-motion';
import { useState } from 'react';
import type { AttributeId, CallingCard } from '@/types';
import { P3ActionSheet, P3Button, P3Progress, P3Segment, P3Tag, useToast, P3R, slantClip, tickClip, IconMore, IconClose, IconChevron, Glyph } from '@blue/kit';
import { useBoldness } from '@blue/lib/prefs';
import { ATTR_NAMES, CALLING_CARDS, TODAY_KEY, TODOS, WEEKLY_GOAL } from '@blue/adapters/pkg2';
import { daysBetween, setHashParam, toneBg, useLongPress } from './common';
import GoalSetupForm, { type GoalItem } from '@blue/screens/overlays/GoalSetupForm.p3r';
import CelebrationModal from '@blue/screens/overlays/CelebrationModal.p3r';
import CallingCardEditor from '@blue/screens/overlays/CallingCardEditor.p3r';
import CallingCardSectionDeleteConfirm from '@blue/screens/overlays/CallingCardSectionDeleteConfirm.p3r';

const goalText = (g: GoalItem) => {
  const n = g.attribute ? ATTR_NAMES[g.attribute] : '';
  switch (g.type) {
    case 'activity_count': return `完成 ${g.target} 次${n}活动`;
    case 'todo_count': return `完成 ${g.target} 次任务`;
    case 'attr_points': return `获得 ${g.target} 点${n}`;
    default: return `获得 ${g.target} 点总点数`;
  }
};
export type GoalState = 'none' | 'progress' | 'done' | 'claimed';

export function WeeklyGoalSection({ initial }: { initial: GoalState }) {
  const toast = useToast();
  const [goal, setGoal] = useState<{ items: GoalItem[]; reward: string; completed: boolean; rewardAttr?: AttributeId; rewardPoints?: number } | null>(
    initial === 'none' ? null : {
      items: (WEEKLY_GOAL.goals as GoalItem[]).map((g) => (initial === 'progress' ? g : { ...g, current: g.target })),
      reward: WEEKLY_GOAL.reward, completed: initial === 'claimed', rewardAttr: initial === 'claimed' ? 'knowledge' : undefined, rewardPoints: initial === 'claimed' ? 7 : undefined,
    });
  const [setup, setSetup] = useState<false | 'new' | 'edit'>(false);
  const [menu, setMenu] = useState(false);
  const [cel, setCel] = useState(false);
  const lp = useLongPress(() => setMenu(true));
  const allDone = !!goal && goal.items.every((g) => g.current >= g.target);
  const sel = lp.pressing;

  if (!goal) {
    return (
      <>
        <button type="button" onClick={() => setSetup('new')} className="flex h-16 w-full items-center justify-center gap-2 text-[16px] font-black" style={{ clipPath: slantClip(12), background: 'transparent', boxShadow: 'inset 0 0 0 2px rgb(var(--p3r-blue-rgb) / 0.45)', color: P3R.roseInk }}>
          + 设定本周目标
        </button>
        <GoalSetupForm open={!!setup} onClose={() => setSetup(false)} onSubmit={(items, reward) => setGoal({ items: items.map((i) => ({ ...i, current: 0 })), reward, completed: false })} />
      </>
    );
  }
  return (
    <>
      <div {...lp.handlers} className="relative min-w-0 select-none" style={{ WebkitTouchCallout: 'none' }}>
        <div className="relative px-4 py-3 transition-colors" style={{ clipPath: slantClip(12), background: sel ? P3R.ink : P3R.panel }}>
          <div className="flex items-center gap-2">
            <span className="font-heavy text-[16px]" style={{ color: sel ? 'var(--p3r-on-ink)' : P3R.ink }}>本周目标</span>
            <span className="font-cond text-[12px]" style={{ color: sel ? 'var(--p3r-on-ink)' : P3R.grey }}>{WEEKLY_GOAL.weekStart.slice(5).replace('-', '/')}–{WEEKLY_GOAL.weekEnd.slice(5).replace('-', '/')}</span>
            <span className="flex-1" />
            {goal.completed && <P3Tag tone="gold">已完成</P3Tag>}
          </div>
          <div className="mt-2 space-y-2">
            {goal.items.map((g, i) => (
              <div key={i} className="min-w-0">
                <div className="mb-1 flex items-baseline justify-between gap-2">
                  <span className="min-w-0 truncate text-[14px] font-bold" style={{ color: sel ? 'var(--p3r-on-ink)' : P3R.ink }}>{goalText(g)}</span>
                  <span className="shrink-0 font-cond text-[14px]" style={{ color: sel ? 'var(--p3r-on-ink)' : g.current >= g.target ? P3R.roseInk : P3R.ink }}>{Math.min(g.current, g.target)}/{g.target}</span>
                </div>
                <P3Progress variant="segments" value={Math.round((Math.min(g.current, g.target) / g.target) * Math.min(g.target, 12))} max={Math.min(g.target, 12)} color={g.current >= g.target ? P3R.blue : P3R.cyan} />
              </div>
            ))}
            {goal.reward && <div className="text-[12px] font-bold" style={{ color: sel ? 'var(--p3r-on-ink)' : P3R.inkSoft }}>✦ 奖励：{goal.reward}</div>}
            {goal.completed && goal.rewardAttr && <div className="text-[14px] font-black" style={{ color: sel ? 'var(--p3r-on-ink)' : P3R.roseInk }}>✦ 已获得 {ATTR_NAMES[goal.rewardAttr]} +{goal.rewardPoints}</div>}
            {allDone && !goal.completed && (
              <div onPointerDown={(e) => e.stopPropagation()}>
                <P3Button block corner onClick={() => setCel(true)}>✦ 目标达成！领取奖励</P3Button>
              </div>
            )}
            {sel && <p className="text-center text-[12px] font-black" style={{ color: 'var(--p3r-on-ink)' }}>{goal.completed ? '松手删除记录…' : '松手打开菜单…'}</p>}
          </div>
        </div>
      </div>
      <P3ActionSheet open={menu} onClose={() => setMenu(false)} title="本周目标"
        actions={[{ id: 'edit', label: '修改选项' }, { id: 'reset', label: goal.completed ? '删除本周目标记录' : '重置本周目标', tone: 'danger' }]}
        onSelect={(id) => { if (id === 'edit') setSetup('edit'); else { setGoal(null); toast(goal.completed ? '已删除本周目标记录' : '已重置本周目标'); } }} />
      <GoalSetupForm open={!!setup} onClose={() => setSetup(false)} initial={setup === 'edit' ? goal.items : undefined} initialReward={goal.reward}
        onSubmit={(items, reward) => setGoal((g) => g && { ...g, items: items.map((it) => ({ ...it, current: g.items.find((x) => x.type === it.type)?.current ?? 0 })), reward })} />
      <CelebrationModal open={cel} onClose={() => setCel(false)} onClaim={(a, pts) => setGoal((g) => g && { ...g, completed: true, rewardAttr: a, rewardPoints: pts })} />
    </>
  );
}

function cardProgress(c: CallingCard) {
  const isToday = c.targetDate === TODAY_KEY;
  const daysLeft = c.targetDate ? daysBetween(TODAY_KEY, c.targetDate) : undefined;
  const datePct = c.targetDate ? Math.max(0, Math.min(100, (daysBetween(c.startDate, TODAY_KEY) / Math.max(1, daysBetween(c.startDate, c.targetDate))) * 100)) : 0;
  const linked = (c.linkedTodoIds ?? []).map((id) => TODOS.find((t) => t.id === id)).filter(Boolean);
  const todosDone = linked.filter((t) => t!.completedAt || (t!.isBigDeal && (t!.steps ?? []).every((s) => s.done))).length;
  const todoPct = linked.length ? (todosDone / linked.length) * 100 : 0;
  const overall = Math.round(c.mode === 'deadline' ? datePct : c.mode === 'todos' ? todoPct : Math.max(datePct, todoPct));
  const summary = c.archived ? (c.archiveReason === 'auto_todos' ? '已达成' : c.archiveReason === 'auto_date' ? '已至期' : '已收存')
    : c.mode === 'todos' ? `已完成 ${todosDone}/${linked.length} 项` : isToday ? '就是今天' : daysLeft !== undefined ? `还剩 ${daysLeft} 天` : '';
  return { overall, summary, daysLeft };
}

/** 宣告卡（CallingCardCard p3）：蓝斜切卡 + 纹理 + 白字；归档态 = 浅面淡出 */
function CardRow({ c, onMenu }: { c: CallingCard; onMenu: () => void }) {
  const { overall, summary, daysLeft } = cardProgress(c);
  const urgent = !c.archived && daysLeft !== undefined && daysLeft <= 4;
  return (
    <div aria-label={`倒计时：${c.title}，${summary}，${overall}%`} className="relative min-w-0">
      <div className="relative overflow-hidden" style={{ clipPath: slantClip(12), background: c.archived ? 'var(--p3r-row-alt)' : P3R.blue, opacity: c.archived ? 0.82 : 1 }}>
        {!c.archived && <div aria-hidden className="absolute inset-0" style={{ background: toneBg(c.tone, 'rgba(255,248,240,0.22)') }} />}
        <div className="relative flex min-w-0 items-center gap-2.5 px-4 py-2.5">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center font-heavy text-[17px]" style={{ background: c.archived ? P3R.cyanPale : 'var(--p3r-cream)', color: c.archived ? P3R.ink : 'var(--p3r-mulberry)', clipPath: slantClip(5) }}>{c.icon ?? '✦'}</span>
          <div className="min-w-0 flex-1">
            <div className="flex min-w-0 items-center gap-1.5">
              {c.pinned && <span aria-label="已钉到主页" className="shrink-0 text-[12px]"><Glyph name="pin" /></span>}
              <span className="min-w-0 truncate font-heavy text-[16px]" style={{ color: c.archived ? P3R.ink : P3R.onBlue }}>{c.title}</span>
            </div>
            {c.subtitle && <div className="truncate text-[11px] italic" style={{ color: c.archived ? P3R.grey : P3R.onBlue, opacity: 0.85 }}>「{c.subtitle}」</div>}
          </div>
          <span className="shrink-0 px-2 py-0.5 text-[11px] font-black" style={{ background: urgent ? P3R.magenta : P3R.ink, color: urgent ? '#fff' : 'var(--p3r-on-ink)', clipPath: slantClip(4) }}>{summary}</span>
          <span className="w-12 shrink-0 text-right font-cond text-[22px] leading-none" style={{ color: c.archived ? P3R.ink : P3R.onBlue }}>{overall}%</span>
          <button type="button" aria-label="菜单" onClick={onMenu} className="flex h-9 w-8 shrink-0 items-center justify-center" style={{ background: 'rgba(255,248,240,0.9)', color: 'var(--p3r-mulberry)', clipPath: slantClip(5) }}><IconMore size={16} /></button>
        </div>
        <div className="relative h-[5px]" style={{ background: 'rgba(13,22,42,0.35)' }}><div className="h-full origin-left" style={{ background: c.archived ? P3R.grey : 'var(--p3r-cream)', transform: `scaleX(${overall / 100})` }} /></div>
      </div>
    </div>
  );
}

export function CallingCardSection({ empty }: { empty?: boolean }) {
  const toast = useToast();
  const anim = useBoldness();
  const [cards, setCards] = useState<CallingCard[]>(empty ? [] : CALLING_CARDS);
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
        <span className="font-heavy text-[16px]" style={{ color: P3R.ink }}>倒计时</span>
        <P3Button size="sm" tone="ink" onClick={() => setEditor({ card: null })}>+ 新建</P3Button>
      </div>
      {hint && active.length > 0 && (
        <div className="flex min-w-0 items-center gap-2 px-4 py-1.5 text-[11px] font-bold" style={{ background: P3R.cyanFaint, color: P3R.ink, clipPath: slantClip(7) }}>
          <span className="min-w-0 flex-1 leading-snug">为重要的事写一张「宣告卡」，倒计时随时在此映入眼帘</span>
          <button type="button" aria-label="不再提示" onClick={() => setHint(false)} className="shrink-0" style={{ color: P3R.grey }}><IconClose size={12} /></button>
        </div>
      )}
      {active.length === 0 ? (
        <button type="button" onClick={() => setEditor({ card: null })} className="flex h-14 w-full items-center justify-center gap-2 text-[14px] font-black" style={{ clipPath: slantClip(10), boxShadow: 'inset 0 0 0 2px rgb(var(--p3r-blue-rgb) / 0.4)', color: P3R.roseInk }}>还没有倒计时 — 立下约定</button>
      ) : (
        <div className="grid grid-cols-1 gap-2">
          {active.map((c, i) => (
            <motion.div key={c.id} initial={anim ? { opacity: 0, x: -18 } : false} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.05 }}>
              <CardRow c={c} onMenu={() => { setConfirmDel(false); setMenu(c); }} />
            </motion.div>
          ))}
        </div>
      )}
      {archived.length > 0 && (
        <div>
          <button type="button" onClick={() => setArchOpen((v) => !v)} aria-expanded={archOpen} className="flex items-center gap-1 text-[12px] font-black" style={{ color: P3R.grey }}>
            <IconChevron size={11} className={archOpen ? 'rotate-90 transition-transform' : 'transition-transform'} /><span>归档</span><span className="font-cond">· {archived.length}</span>
          </button>
          <AnimatePresence initial={false}>
            {archOpen && <motion.div initial={anim ? { opacity: 0, y: -6 } : { opacity: 0 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="mt-1.5 grid grid-cols-1 gap-2">{archived.map((c) => <CardRow key={c.id} c={c} onMenu={() => { setConfirmDel(false); setMenu(c); }} />)}</motion.div>}
          </AnimatePresence>
        </div>
      )}
      <P3ActionSheet open={!!menu} onClose={() => setMenu(null)} title={menu?.title}
        keepOpen={(id) => id === 'delete' && !confirmDel}
        actions={menu ? [
          ...(menu.archived ? [] : [{ id: 'pin', label: menu.pinned ? '取消钉选' : '钉到主页' }, { id: 'edit', label: '编辑' }, { id: 'archive', label: '手动归档' }]),
          ...(menu.archived ? [{ id: 'unarchive', label: '取消归档' }] : []),
          { id: 'delete', label: confirmDel ? '确认删除' : '删除', tone: 'danger' as const },
        ] : []}
        onSelect={(id) => {
          const c = menu!;
          if (id === 'delete' && !confirmDel) { setConfirmDel(true); return; }
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

export function GoalDeck({ deck: d0, goalState, cardsEmpty }: { deck: 'weekly' | 'cards'; goalState: GoalState; cardsEmpty?: boolean }) {
  const anim = useBoldness();
  const [deck, setDeck] = useState(d0);
  return (
    <section className="relative min-w-0">
      <span aria-hidden className="absolute inset-0 translate-x-[6px] translate-y-[6px]" style={{ background: 'var(--p3r-slab-back)', clipPath: slantClip(16) }} />
      <div className="relative" style={{ clipPath: slantClip(16), background: P3R.panelGlass }}>
        <span aria-hidden className="absolute right-6 top-0 h-[8px] w-[22px]" style={{ background: P3R.magenta, clipPath: tickClip }} />
        <div className="flex min-w-0 flex-wrap items-end gap-x-3 gap-y-2 px-5 pt-4">
          <div className="min-w-0 flex-1">
            <h3 className="font-heavy text-[24px] leading-none" style={{ color: P3R.ink }}>目标<span aria-hidden className="ml-1 inline-block h-[10px] w-[13px]" style={{ background: P3R.blue, clipPath: 'polygon(100% 0, 100% 100%, 0 100%)' }} /></h3>
            <p className="mt-1 p3r-clamp-2 text-[12px] font-bold" style={{ color: P3R.grey }}>本周推进和重要倒计时</p>
          </div>
          <P3Segment className="w-[196px] shrink-0" items={[{ id: 'weekly', label: '本周目标' }, { id: 'cards', label: '倒计时' }]} value={deck} onChange={(id) => { setDeck(id as 'weekly'); setHashParam('deck', id); }} />
        </div>
        <div className="px-4 pb-4 pt-3">
          <AnimatePresence mode="wait" initial={false}>
            <motion.div key={deck} initial={anim ? { opacity: 0, x: deck === 'cards' ? 24 : -24 } : { opacity: 0 }} animate={{ opacity: 1, x: 0 }} exit={anim ? { opacity: 0, x: deck === 'cards' ? -24 : 24 } : { opacity: 0 }} transition={{ duration: 0.18 }}>
              {deck === 'weekly' ? <WeeklyGoalSection initial={goalState} /> : <CallingCardSection empty={cardsEmpty} />}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </section>
  );
}
