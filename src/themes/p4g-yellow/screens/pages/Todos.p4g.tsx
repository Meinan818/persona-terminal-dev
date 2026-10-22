/**
 * 行动 · 任务子页（真实 src/pages/Todos.tsx 的 TodosView，P4 分支）。
 *   顶部 GoalDeck（本周目标 / 倒计时）；面板标题「今日任务」⇄「愿望」（点标题切换，aria「今日任务（点击切到愿望）」）+ 计数「N 项 / N 个」；
 *   命运卡「让命运替你挑一件」/「不知道做什么好？命运会替你选择」（愿望面隐藏）；「委托」入口（可领角标）；
 *   任务卡：S.Link 行（⭐ 重要、✦ 签、约定 / DDL 标签、主属性 +N、副奖励、频次、每日、星期、归档钮、今日/长期进度、按住「长按打开菜单」），BIG DEAL 聚合卡；
 *   已归档：「未到日期」「未启用」「已完成」（✓ 今日已完成、撤销今日完成、按此配置新建任务、展开全部（共 N 项）/ 收起）、「✦ 愿望 · 已实现 / 已收起」+ 恢复；空「归档区暂无内容」；
 *   愿望面板 WishBoard；FAB「添加任务 / 添加愿望」（接入 / 许愿）。
 * 查询参数：pane=wish；deck=weekly|cards；goal=none|progress|done|claimed；state=empty。
 */
import { AnimatePresence, motion } from 'framer-motion';
import { useMemo, useState } from 'react';
import type { Todo, Wish } from '@real/types';
import { P4Badge, P4Button, P4EmptyState, P4Input, P4Progress, IconEdit, IconTrash, IconRefresh, IconMore, IconPlus, useToast } from '@yellow/kit';
import { CollageItem, CollageStagger } from '@yellow/fx';
import { useLowMotion } from '@yellow/lib/prefs';
import { cx } from '@yellow/lib/cx';
import { ATTR_NAMES, TODAY, TODAY_DONE, TODAY_KEY, TODOS, TODO_PROGRESS, WISHES, WISH_TIMES } from '@yellow/mock/pkg2';
import { BlockHead, CountPill, Ring, StarFab, Tag, WEEK_LABELS, daysBetween, qp, setHashParam, useLongPress } from '@yellow/screens/pkg2/common';
import { GoalDeck } from '@yellow/screens/pkg2/GoalDeck';
import TodoFormSheet from '@yellow/screens/overlays/TodoFormSheet.p4g';
import TodosItemMenu from '@yellow/screens/overlays/TodosItemMenu.p4g';
import TodosDeleteConfirm from '@yellow/screens/overlays/TodosDeleteConfirm.p4g';
import TodosWishAddSheet from '@yellow/screens/overlays/TodosWishAddSheet.p4g';
import FateDrawSheet from '@yellow/screens/overlays/FateDrawSheet.p4g';
import QuestBoardSheet from '@yellow/screens/overlays/QuestBoardSheet.p4g';
import BigDealPanel from '@yellow/screens/overlays/BigDealPanel.p4g';
import WishPanel from '@yellow/screens/overlays/WishPanel.p4g';
import WishFulfillDialog from '@yellow/screens/overlays/WishFulfillDialog.p4g';
import DanmakuCompose from '@yellow/screens/overlays/DanmakuCompose.p4g';

const freqLabel = (t: Todo) => (t.frequency === 'single' ? '单次' : t.isLongTerm ? `长期 · ${t.targetCount || 1}次` : `多次 · ${t.targetCount || 1}次`);
const ArchiveIcon = ({ size = 14 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.4} strokeLinejoin="round" aria-hidden><path d="M3 4h18v5H3zM5 9v11h14V9M10 13h4" /></svg>
);
function DeadlineTag({ t, done }: { t: Todo; done?: boolean }) {
  if (!t.deadline || done) return null;
  const d = daysBetween(TODAY_KEY, t.deadline);
  const text = d > 0 ? `剩 ${d} 天` : d === 0 ? '今天截止' : `逾期 ${-d} 天`;
  return <span aria-label={`截止日 ${t.deadline}，${text}`}><Tag tone={d <= 1 ? 'red' : 'black'}>⏳ {text}</Tag></span>;
}
const IconBtn = ({ title, onClick, children, tone }: { title: string; onClick: () => void; children: React.ReactNode; tone?: 'danger' }) => (
  <button type="button" title={title} aria-label={title} onPointerDown={(e) => e.stopPropagation()} onClick={(e) => { e.stopPropagation(); onClick(); }}
    className={cx('flex h-8 w-8 shrink-0 items-center justify-center rounded-xs border-thin border-current bg-p4g-surface-2', tone === 'danger' ? 'text-p4g-danger' : 'text-p4g-ink')}>{children}</button>
);

/** S.Link 行版任务卡（ActiveTodoCard / PendingWeekdayTodoCard） */
function TodoRow({ t, onMenu, onArchive, onDelete, pending }: { t: Todo; onMenu: () => void; onArchive?: () => void; onDelete?: () => void; pending?: boolean }) {
  const lp = useLongPress(onMenu);
  const count = TODO_PROGRESS[t.id] ?? 0;
  const target = t.frequency === 'count' ? t.targetCount ?? 1 : 1;
  const sel = lp.pressing;
  const linked = !!(t.pact || t.orgOp);
  return (
    <div {...lp.handlers} className={cx('relative flex min-w-0 select-none items-stretch gap-3 px-3 py-2.5 transition-colors', sel ? 'bg-p4g-select text-[color:var(--p4g-select-ink)]' : 'text-p4g-ink', pending && !sel && 'opacity-70')}
      style={sel ? { WebkitTouchCallout: 'none' } : { background: 'var(--p4g-surface-grad)', WebkitTouchCallout: 'none' }}>
      <span aria-hidden className={cx('mt-0.5 flex h-11 w-9 shrink-0 items-center justify-center rounded-sm border-[3px]', sel ? 'border-current bg-current' : t.important ? 'border-p4g-orange-deep bg-p4g-orange' : 'border-p4g-orange bg-p4g-yellow-pale')}>
        <span className={cx('h-7 w-5 rounded-xs', sel ? 'bg-p4g-select' : t.important ? 'bg-p4g-yellow' : 'bg-p4g-orange')} />
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex min-w-0 flex-wrap items-center gap-1.5">
          <span className={cx('font-display text-lead font-bold italic leading-none', !sel && 'text-[color:var(--p4g-rank)]')}>{ATTR_NAMES[t.attribute]} +{t.points}</span>
          <Tag tone={sel ? 'black' : 'orange'}>{freqLabel(t)}</Tag>
          {pending && <Tag tone="muted">{t.startDate ? `📅 ${t.startDate} 启用` : '📅 未到日期'}</Tag>}
          {t.important && <Tag tone="yellow">⭐{pending ? '' : ' 重要'}</Tag>}
          {t.fateDrawnDate === TODAY_KEY && <Tag tone="cyan">✦ 签</Tag>}
          {t.pact && <Tag tone="red">与 {t.pact.partnerName}</Tag>}
          <DeadlineTag t={t} done={count >= target} />
        </div>
        <div className="mt-1 p4g-clamp-1 font-display text-lead font-bold leading-tight">{t.title}</div>
        <div className="mt-0.5 flex min-w-0 flex-wrap items-center gap-x-2 text-2xs font-bold opacity-75">
          {t.extraBoosts?.map((b, i) => <span key={i}>{ATTR_NAMES[b.attribute]} +{b.points}</span>)}
          {t.repeatDaily && !t.isLongTerm && <span className="text-p4g-green">每日</span>}
          {t.weekdays && t.weekdays.length > 0 && <span>{t.weekdays.map((d) => WEEK_LABELS[d]).join(' ')}</span>}
        </div>
        {!pending && (
          <div className="mt-1.5">
            <div className="mb-0.5 flex justify-between text-2xs font-bold opacity-75"><span>{t.isLongTerm ? '长期进度' : '今日进度'}</span><span className="p4g-num">{count}/{target}</span></div>
            <P4Progress value={count} max={target} variant="segments" segments={Math.min(target, 10)} inverted={sel} />
          </div>
        )}
        {sel && <p className="mt-1.5 text-center text-2xs font-bold">长按打开菜单</p>}
      </div>
      <div className="flex shrink-0 flex-col gap-1.5">
        {!linked && onArchive && <IconBtn title={pending ? '归档' : '归档（不启用）'} onClick={onArchive}><ArchiveIcon /></IconBtn>}
        {pending && onDelete && <IconBtn title="删除" tone="danger" onClick={onDelete}><IconTrash size={13} /></IconBtn>}
      </div>
      <span aria-hidden className="absolute inset-x-0 bottom-0 h-[2px]" style={{ background: 'var(--p4g-separator-a)' }} />
    </div>
  );
}

/** BIG DEAL 聚合卡（BigDealHomeCard，P4） */
function BigDealCard({ t, onOpen, onMenu }: { t: Todo; onOpen: () => void; onMenu: () => void }) {
  const steps = t.steps ?? [];
  const done = steps.filter((s) => s.done).length;
  const next = steps.find((s) => !s.done);
  const dl = t.deadline ? daysBetween(TODAY_KEY, t.deadline) : null;
  return (
    <div className="relative min-w-0 border-b-[3px] border-[color:var(--p4g-separator-a)] bg-p4g-black text-white">
      <div aria-hidden className="absolute inset-y-0 right-0 w-16 opacity-25" style={{ background: 'repeating-linear-gradient(-45deg, var(--p4g-yellow) 0 6px, transparent 6px 14px)' }} />
      <button type="button" onClick={onOpen} className="relative flex w-full min-w-0 items-center gap-3 px-3 py-3 text-left">
        <Ring pct={steps.length ? (done / steps.length) * 100 : 0} size={50} stroke={7} label={<span className="p4g-num text-body text-p4g-ink">{done}/{steps.length}</span>} />
        <div className="min-w-0 flex-1">
          <div className="flex min-w-0 items-center gap-1.5">
            <span className="rounded-xs bg-p4g-yellow px-1.5 font-display text-2xs font-black text-p4g-black">BIG DEAL</span>
            {dl !== null && <span className={cx('rounded-xs px-1.5 font-display text-2xs font-bold', dl <= 2 ? 'bg-p4g-red text-white' : 'bg-white text-p4g-black')}>{dl > 0 ? `剩 ${dl} 天` : dl === 0 ? '今天截止' : '已过截止'}</span>}
          </div>
          <div className="mt-1 truncate font-display text-lead font-bold">{t.title}</div>
          <div className="mt-1 flex items-center gap-2 text-2xs font-bold text-white/70"><span>总进度</span><span className="h-1.5 min-w-0 flex-1 bg-white/20"><span className="block h-full origin-left bg-p4g-orange" style={{ transform: `scaleX(${steps.length ? done / steps.length : 0})` }} /></span></div>
          <div className="mt-1 truncate text-cap text-p4g-yellow">{steps.length === 0 ? '去拆第一步' : next ? `下一步：${next.title}` : '全部完成——进去收官'}</div>
        </div>
      </button>
      <button type="button" aria-label="管理这件大事" onClick={onMenu} className="absolute right-2 top-2 flex h-8 w-8 items-center justify-center rounded-xs border-thin border-p4g-yellow text-p4g-yellow"><IconMore size={15} /></button>
    </div>
  );
}

/** 愿望面板（WishBoard） */
function WishBoard({ wishes, setWishes, onOpen, onFulfill, tokens, pendingReview, onCompose }: { wishes: Wish[]; setWishes: (f: (w: Wish[]) => Wish[]) => void; onOpen: (w: Wish) => void; onFulfill: (w: Wish) => void; tokens: number; pendingReview: number; onCompose: () => void }) {
  const toast = useToast();
  const [menu, setMenu] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [draft, setDraft] = useState('');
  const active = wishes.filter((w) => w.status === 'active' && !w.parentId);
  return (
    <div className="min-w-0">
      {(tokens > 0 || pendingReview > 0) && (
        <button type="button" disabled={tokens <= 0} onClick={onCompose} className="flex w-full min-w-0 items-center gap-2 border-b-[3px] border-[color:var(--p4g-separator-a)] bg-p4g-msg px-3 py-2 text-left text-cap font-bold text-[color:var(--p4g-msg-ink)]">
          <span className="min-w-0 flex-1 truncate">{tokens > 0 ? `你还有 ${tokens} 次机会鼓励同样努力的人` : `${pendingReview} 条鼓励正在审核中`}{tokens > 0 && pendingReview > 0 && <span className="opacity-70"> · {pendingReview} 条审核中</span>}</span>
          {tokens > 0 && <span className="shrink-0 font-black text-p4g-yellow">去写 ›</span>}
        </button>
      )}
      {active.length === 0 && <p className="bg-p4g-surface px-4 py-6 text-center text-meta leading-relaxed text-p4g-ink-soft">还没有愿望。<br />写下一个远一点的——记录时把事挂上去，就能看见自己在靠近它。</p>}
      {active.map((w) => {
        const steps = w.steps ?? []; const done = steps.filter((s) => s.done).length; const times = WISH_TIMES[w.id] ?? 0;
        return (
          <div key={w.id} className="relative flex min-w-0 items-center gap-3 border-b-[3px] border-[color:var(--p4g-separator-a)] px-3 py-2.5 text-p4g-ink" style={{ background: 'var(--p4g-surface-grad)' }}>
            <button type="button" onClick={() => onOpen(w)} aria-label={`打开「${w.title}」的进度面板`} className="flex min-w-0 flex-1 items-center gap-3 text-left">
              <Ring pct={w.progressPct ?? 0} size={46} stroke={6} dim={typeof w.progressPct !== 'number'} />
              <span className="min-w-0 flex-1">
                <span className="block p4g-clamp-1 font-display text-lead font-bold">{w.title}</span>
                <span className="block truncate text-cap text-p4g-ink-soft">{times > 0 ? <>已完成相关任务 {times} 次{steps.length > 0 && <span> · 子任务 {done}/{steps.length}</span>}</> : steps.length > 0 ? `子任务 ${done}/${steps.length}` : '还没有记录挂到这里'}</span>
              </span>
            </button>
            <button type="button" aria-label={`「${w.title}」的操作`} onClick={() => setMenu(menu === w.id ? null : w.id)} className="flex h-9 w-8 shrink-0 items-center justify-center rounded-xs border-thin border-p4g-line bg-p4g-surface-2 text-p4g-ink"><IconMore size={15} /></button>
            <AnimatePresence>
              {menu === w.id && (
                <motion.div initial={{ opacity: 0, scale: 0.9, y: -4 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95 }} style={{ originX: 1, originY: 0 }}
                  className="absolute right-3 top-12 z-20 w-36 overflow-hidden rounded-sm border-3 border-p4g-black bg-[color:var(--p4g-msg)] shadow-plate night:border-p4g-yellow">
                  {[['split', '拆子任务'], ['fulfill', '愿望已实现'], ['archive', '收起'], ['delete', '删除']].map(([id, label]) => (
                    <button key={id} type="button" onClick={() => {
                      setMenu(null);
                      if (id === 'split') onOpen(w);
                      if (id === 'fulfill') onFulfill(w);
                      if (id === 'archive') { setWishes((l) => l.map((x) => (x.id === w.id ? { ...x, status: 'archived', archivedAt: new Date() } : x))); toast('已收起'); }
                      if (id === 'delete') setWishes((l) => l.filter((x) => x.id !== w.id));
                    }} className={cx('block w-full px-3 py-2 text-left font-display text-body font-bold hover:bg-p4g-yellow hover:text-p4g-black', id === 'delete' ? 'text-[#ff8a7a]' : 'text-[color:var(--p4g-msg-ink)]')}>{label}</button>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        );
      })}
      {adding ? (
        <div className="flex min-w-0 gap-2 bg-p4g-surface px-3 py-2.5">
          <P4Input autoFocus wrapClassName="min-w-0 flex-1" placeholder="想实现的事…" aria-label="愿望标题" value={draft} onChange={(e) => setDraft(e.target.value)} />
          <P4Button disabled={!draft.trim()} onClick={() => { setWishes((l) => [{ id: `w${Date.now()}`, title: draft.trim(), status: 'active', source: 'manual', createdAt: new Date() }, ...l]); setDraft(''); setAdding(false); }}>记下</P4Button>
        </div>
      ) : (
        <button type="button" onClick={() => setAdding(true)} className="block w-full bg-p4g-surface px-3 py-2.5 text-center font-display text-body font-bold text-p4g-ink">＋ 记下一个愿望</button>
      )}
    </div>
  );
}

export function TodosView({ params }: { params: URLSearchParams }) {
  const toast = useToast();
  const low = useLowMotion();
  const empty = qp(params, 'state') === 'empty';
  const [todos, setTodos] = useState<Todo[]>(empty ? [] : TODOS);
  const [wishes, setWishes] = useState<Wish[]>(empty ? [] : WISHES);
  const [pane, setPane] = useState<'todo' | 'wish'>(qp(params, 'pane') === 'wish' ? 'wish' : 'todo');
  const [doneToday, setDoneToday] = useState(new Set(empty ? [] : TODAY_DONE));
  const [expandCompleted, setExpandCompleted] = useState(false);
  const [form, setForm] = useState<false | { todo: Todo | null }>(false);
  const [menuId, setMenuId] = useState<string | null>(null);
  const [delId, setDelId] = useState<string | null>(null);
  const [wishAdd, setWishAdd] = useState(false);
  const [fate, setFate] = useState(false);
  const [quest, setQuest] = useState(false);
  const [deal, setDeal] = useState<Todo | null>(null);
  const [wishPanel, setWishPanel] = useState<Wish | null>(null);
  const [fulfill, setFulfill] = useState<Wish | null>(null);
  const [compose, setCompose] = useState(false);
  const isWish = pane === 'wish';

  const pendingDate = todos.filter((t) => t.isActive && !t.completedAt && ((t.startDate && t.startDate > TODAY_KEY) || (t.weekdays?.length && !t.weekdays.includes(TODAY.getDay()))));
  const active = todos.filter((t) => t.isActive && !t.completedAt && !t.archivedAt && !pendingDate.includes(t));
  const inactive = todos.filter((t) => !t.isActive && !t.completedAt);
  const completed = todos.filter((t) => t.completedAt).sort((a, b) => b.completedAt!.getTime() - a.completedAt!.getTime());
  const goneWishes = wishes.filter((w) => w.status !== 'active');
  const archivedCount = completed.length + inactive.length + pendingDate.length;
  const activeWishCount = wishes.filter((w) => w.status === 'active' && !w.parentId).length;
  const togglePane = () => { const n = isWish ? 'todo' : 'wish'; setPane(n); setHashParam('pane', n === 'wish' ? 'wish' : null); };
  const paneLabel = isWish ? '愿望（点击切回今日任务）' : '今日任务（点击切到愿望）';
  const menuTodo = todos.find((t) => t.id === menuId) ?? null;
  const delTodo = todos.find((t) => t.id === delId);
  const shownCompleted = expandCompleted ? completed : completed.slice(0, 3);
  const goal = (qp(params, 'goal') || (empty ? 'none' : 'progress')) as 'none';

  const saveForm = (f: { title: string; attribute: Todo['attribute']; points: number; mode: string; targetCount: number; important: boolean; repeatDaily: boolean; isLongTerm: boolean; steps: Todo['steps']; deadline: string; weekdays: number[]; isActive: boolean; startDate: string; extraBoosts: Todo['extraBoosts']; currentState: string; wishId?: string }, id?: string) => {
    const patch: Partial<Todo> = { title: f.title, attribute: f.attribute, points: f.points, frequency: f.mode === 'count' ? 'count' : 'single', targetCount: f.targetCount, important: f.important, repeatDaily: f.repeatDaily, isLongTerm: f.isLongTerm, isBigDeal: f.mode === 'big', steps: f.mode === 'big' ? f.steps : undefined, deadline: f.deadline || undefined, weekdays: f.weekdays, isActive: f.isActive, startDate: f.startDate || undefined, extraBoosts: f.extraBoosts, currentState: f.currentState || undefined, wishId: f.wishId };
    if (id) setTodos((l) => l.map((t) => (t.id === id ? { ...t, ...patch } : t)));
    else setTodos((l) => [{ id: `t${Date.now()}`, createdAt: new Date(), ...patch } as Todo, ...l]);
  };

  return (
    <div className="min-w-0 space-y-5 pb-24">
      <GoalDeck deck={qp(params, 'deck') === 'cards' ? 'cards' : 'weekly'} goalState={goal} cardsEmpty={empty} />

      {/* 今日任务 ⇄ 愿望 */}
      <section className="min-w-0">
        <BlockHead title={<>{isWish ? '愿望' : '今日任务'}<span aria-hidden className="text-p4g-orange">⇄</span></>} en={isWish ? 'WISHES' : "TODAY'S QUEST"} meta={<CountPill>{isWish ? `${activeWishCount} 个` : `${active.length} 项`}</CountPill>} onTitleClick={togglePane} titleAria={paneLabel} />
        {!isWish && (
          <div className="mb-3 flex min-w-0 gap-2">
            <button type="button" onClick={() => setFate(true)} className="p4g-press relative flex min-w-0 flex-1 items-center gap-2 overflow-hidden rounded-sm border-3 border-p4g-black bg-p4g-black px-3 py-2.5 text-left text-p4g-yellow shadow-hard night:border-p4g-yellow">
              <span aria-hidden className="absolute -right-3 top-0 h-full w-12 -skew-x-12 p4g-candy opacity-80" />
              <span aria-hidden className="relative text-[20px]">🂠</span>
              <span className="relative min-w-0 truncate font-display text-body font-bold"><span className="min-[400px]:hidden">让命运替你挑一件</span><span className="hidden min-[400px]:inline">不知道做什么好？命运会替你选择</span></span>
            </button>
            <div className="relative shrink-0">
              <button type="button" onClick={() => setQuest(true)} aria-label="委托板，1 张可领取" className="p4g-press flex h-full items-center gap-1 rounded-sm border-3 border-p4g-black bg-p4g-yellow px-3 font-display text-body font-bold text-p4g-black shadow-hard">📜<span>委托</span></button>
              <P4Badge count={1} className="absolute -right-2 -top-2" />
            </div>
          </div>
        )}
        <AnimatePresence mode="wait" initial={false}>
          <motion.div key={pane} initial={low ? { opacity: 0 } : { opacity: 0, x: 18 }} animate={{ opacity: 1, x: 0 }} exit={low ? { opacity: 0 } : { opacity: 0, x: -18 }} transition={{ duration: 0.2, ease: [0.2, 0, 0.1, 1] }}
            className="min-w-0 overflow-visible rounded-sm border-3 border-p4g-black shadow-hard night:border-p4g-yellow">
            {isWish ? (
              <WishBoard wishes={wishes} setWishes={setWishes} onOpen={setWishPanel} onFulfill={setFulfill} tokens={empty ? 0 : 2} pendingReview={empty ? 0 : 1} onCompose={() => setCompose(true)} />
            ) : active.length === 0 ? (
              <div className="bg-p4g-surface"><P4EmptyState compact title="还没有任务，添加一个开始吧" /></div>
            ) : (
              <CollageStagger>
                {active.map((t) => (
                  <CollageItem key={t.id}>
                    {t.isBigDeal ? <BigDealCard t={t} onOpen={() => setDeal(t)} onMenu={() => setMenuId(t.id)} />
                      : <TodoRow t={t} onMenu={() => setMenuId(t.id)} onArchive={() => { setTodos((l) => l.map((x) => (x.id === t.id ? { ...x, isActive: false } : x))); toast('已归档（不启用）'); }} />}
                  </CollageItem>
                ))}
              </CollageStagger>
            )}
          </motion.div>
        </AnimatePresence>
      </section>

      {/* 已归档 */}
      {!isWish && (
        <section className="min-w-0">
          <BlockHead title="已归档" en="ARCHIVE" meta={<CountPill>{archivedCount} 项</CountPill>} />
          {archivedCount === 0 && goneWishes.length === 0 ? <P4EmptyState compact title="归档区暂无内容" /> : (
            <div className="space-y-3">
              {pendingDate.length > 0 && (
                <div>
                  <div className="px-1 pb-1 font-display text-2xs font-bold uppercase tracking-wider text-[color:var(--p4g-on-stage)]">未到日期</div>
                  <div className="overflow-hidden rounded-sm border-3 border-p4g-black shadow-hard-sm night:border-p4g-yellow">
                    {pendingDate.map((t) => <TodoRow key={t.id} t={t} pending onMenu={() => setMenuId(t.id)} onArchive={() => setTodos((l) => l.map((x) => (x.id === t.id ? { ...x, isActive: false } : x)))} onDelete={() => setDelId(t.id)} />)}
                  </div>
                </div>
              )}
              {inactive.length > 0 && (
                <div>
                  <div className="px-1 pb-1 font-display text-2xs font-bold uppercase tracking-wider text-[color:var(--p4g-on-stage)]">未启用</div>
                  <div className="overflow-hidden rounded-sm border-3 border-p4g-line shadow-hard-sm">
                    {inactive.map((t) => (
                      <div key={t.id} className="flex min-w-0 items-center gap-2 border-b-2 border-[color:var(--p4g-separator-a)] bg-p4g-surface-2 px-3 py-2 text-p4g-ink">
                        <span className="min-w-0 flex-1"><span className="block truncate font-display text-body font-bold opacity-70">{t.title}</span><span className="text-2xs opacity-60">{ATTR_NAMES[t.attribute]} +{t.points} · {freqLabel(t)}</span></span>
                        <IconBtn title="编辑" onClick={() => setForm({ todo: t })}><IconEdit size={13} /></IconBtn>
                        <IconBtn title="删除" tone="danger" onClick={() => setDelId(t.id)}><IconTrash size={13} /></IconBtn>
                        <IconBtn title="恢复（重置为未完成）" onClick={() => setTodos((l) => l.map((x) => (x.id === t.id ? { ...x, isActive: true, archivedAt: undefined } : x)))}><IconRefresh size={13} /></IconBtn>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {completed.length > 0 && (
                <div>
                  <div className="px-1 pb-1 font-display text-2xs font-bold uppercase tracking-wider text-p4g-green">已完成</div>
                  <div className="overflow-hidden rounded-sm border-3 border-p4g-line shadow-hard-sm">
                    {shownCompleted.map((t) => {
                      const today = doneToday.has(t.id);
                      return (
                        <div key={t.id} className="flex min-w-0 items-center gap-2 border-b-2 border-[color:var(--p4g-separator-a)] bg-p4g-surface-2 px-3 py-2 text-p4g-ink">
                          <span className="min-w-0 flex-1">
                            <span className="flex min-w-0 items-center gap-1.5">
                              <span className="min-w-0 truncate font-display text-body font-bold line-through decoration-p4g-orange decoration-2">{t.title}</span>
                              {t.wishId && <Tag tone="orange">✦ 愿望</Tag>}
                            </span>
                            {today ? <Tag tone="green">✓ 今日已完成</Tag> : <span className="text-2xs opacity-70">✓ {t.completedAt!.getMonth() + 1}月{t.completedAt!.getDate()}日完成</span>}
                          </span>
                          <IconBtn title="删除" tone="danger" onClick={() => setDelId(t.id)}><IconTrash size={13} /></IconBtn>
                          {today && <IconBtn title="撤销今日完成（同时回退点数和记录）" onClick={() => { setDoneToday((s) => { const n = new Set(s); n.delete(t.id); return n; }); setTodos((l) => l.map((x) => (x.id === t.id ? { ...x, completedAt: undefined, archivedAt: undefined } : x))); toast('已撤销今日完成'); }}><IconRefresh size={13} /></IconBtn>}
                          <IconBtn title="按此配置新建任务" onClick={() => setForm({ todo: { ...t, id: '', completedAt: undefined } as Todo })}><IconPlus size={13} /></IconBtn>
                        </div>
                      );
                    })}
                  </div>
                  {completed.length > 3 && <button type="button" onClick={() => setExpandCompleted((v) => !v)} className="mt-1.5 w-full text-center font-display text-meta font-bold text-[color:var(--p4g-on-stage)] underline decoration-p4g-orange decoration-[3px] underline-offset-4">{expandCompleted ? '收起' : `展开全部（共 ${completed.length} 项）`}</button>}
                </div>
              )}
              {goneWishes.map((w) => (
                <div key={w.id} className="flex min-w-0 items-center gap-2 rounded-sm border-3 border-p4g-line bg-p4g-surface-2 px-3 py-2 text-p4g-ink">
                  <span className="min-w-0 flex-1"><span className="block truncate font-display text-body font-bold">{w.title}</span><Tag tone={w.fulfilledAt ? 'orange' : 'muted'}>{w.fulfilledAt ? '✦ 愿望 · 已实现' : '✦ 愿望 · 已收起'}</Tag></span>
                  <P4Button size="sm" variant="secondary" onClick={() => setWishes((l) => l.map((x) => (x.id === w.id ? { ...x, status: 'active', fulfilledAt: undefined, archivedAt: undefined } : x)))}>恢复</P4Button>
                </div>
              ))}
            </div>
          )}
        </section>
      )}

      <StarFab label={isWish ? '添加愿望' : '添加任务'} glyph="+" caption={isWish ? '许愿' : '接入'} onClick={() => (isWish ? setWishAdd(true) : setForm({ todo: null }))} />

      <TodoFormSheet open={!!form} onClose={() => setForm(false)} todo={form ? (form.todo?.id ? form.todo : null) : null} onSave={saveForm} />
      <TodosItemMenu open={!!menuTodo} onClose={() => setMenuId(null)} todo={menuTodo}
        onAction={(a) => { const t = menuTodo!; if (a === 'edit') setForm({ todo: t }); if (a === 'archive') { setTodos((l) => l.map((x) => (x.id === t.id ? { ...x, isActive: false } : x))); toast('已归档'); } if (a === 'delete') setDelId(t.id); }} />
      <TodosDeleteConfirm open={!!delTodo} onClose={() => setDelId(null)} title={delTodo?.title} onConfirm={() => { setTodos((l) => l.filter((x) => x.id !== delId)); toast.success('已删除'); }} />
      <TodosWishAddSheet open={wishAdd} onClose={() => setWishAdd(false)} onAdd={(title) => setWishes((l) => [{ id: `w${Date.now()}`, title, status: 'active', source: 'manual', createdAt: new Date() }, ...l])} />
      <FateDrawSheet open={fate} onClose={() => setFate(false)} onGo={(kind, title) => { if (kind === 'quest') setQuest(true); else { setTodos((l) => [{ id: `f${Date.now()}`, title, attribute: 'knowledge', points: 1, frequency: 'single', isActive: true, createdAt: new Date(), fateDrawnDate: TODAY_KEY }, ...l]); toast.success('接住了 · ✦ 签'); } }} />
      <QuestBoardSheet open={quest} onClose={() => setQuest(false)} />
      <BigDealPanel open={!!deal} onClose={() => setDeal(null)} todo={deal} onChange={(n) => setTodos((l) => l.map((x) => (x.id === n.id ? n : x)))} />
      <WishPanel open={!!wishPanel} onClose={() => setWishPanel(null)} wish={wishPanel} onChange={(n) => setWishes((l) => l.map((x) => (x.id === n.id ? n : x)))} />
      <WishFulfillDialog open={!!fulfill} onClose={() => setFulfill(null)} wish={fulfill} onFulfilled={(id) => setWishes((l) => l.map((x) => (x.id === id ? { ...x, status: 'done', fulfilledAt: new Date() } : x)))} />
      <DanmakuCompose open={compose} onClose={() => setCompose(false)} tokens={2} />
    </div>
  );
}

export default function Todos({ params }: { params: URLSearchParams }) {
  return <TodosView params={params} />;
}
