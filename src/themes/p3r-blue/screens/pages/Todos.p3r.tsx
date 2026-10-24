/**
 * 行动 · 任务子页（真实 src/pages/Todos.tsx 的 TodosView，p3 分支）。
 *   顶部 GoalDeck（本周目标 / 倒计时）；p3 面板头：BigSlantTitle「今日任务」⇄「愿望」（点标题切换，aria「今日任务（点击切到愿望）」）+ PaneSwapMark + 计数「N 项 / N 个」；
 *   命运条「让命运替你挑一件」/「不知道做什么好？命运会替你选择」+「📜 委托」（panel-glass slantClip(10)，角标挂在按钮外层；愿望面隐藏）；
 *   任务卡（p3 ListCard 斜行）：⭐ 重要、✦ 签、约定 / DDL 标签、主属性 +N、副奖励、频次、每日、星期、归档钮、今日 / 长期进度、按住「长按打开菜单」；BIG DEAL 聚合卡；
 *   已归档：「未到日期」「未启用」「已完成」（✓ 今日已完成、撤销今日完成、按此配置新建任务、展开全部（共 N 项）/ 收起）、「✦ 愿望 · 已实现 / 已收起」+ 恢复；空「归档区暂无内容」；
 *   愿望面板 WishBoard（鼓励机会条、愿望环行、拆子任务 / 愿望已实现 / 收起 / 删除、＋ 记下一个愿望）；
 *   空态 P3EmptySlab（slantClip(26) 浅面板）；FAB 右下斜切「接入 / 许愿」。
 * 查询参数：pane=wish；deck=weekly|cards；goal=none|progress|done|claimed；state=empty。
 */
import { AnimatePresence, motion } from 'framer-motion';
import { useEffect, useState } from 'react';
import type { Todo, Wish } from '@real/types';
import { BigSlantTitle, GhostWords, P3Button, P3Input, P3Progress, P3Tag, IconEdit, IconTrash, IconRefresh, IconMore, IconPlus, useToast, P3R, slantClip, tickClip, Glyph } from '@blue/kit';
import { P3Stagger, P3StaggerItem } from '@blue/fx';
import { useBoldness } from '@blue/lib/prefs';
import { actionsOps, useActionsData } from '@blue/adapters/pkg2';
import { useAppStore } from '@/store';
import { Dot, MiniHead, Ring, SlantFab, WEEK_LABELS, daysBetween, qp, setHashParam, useLongPress } from '@blue/screens/pkg2/common';
import { GoalDeck } from '@blue/screens/pkg2/GoalDeck';
import TodoFormSheet, { type TodoForm } from '@blue/screens/overlays/TodoFormSheet.p3r';
import { BandCutInP3 } from '@blue/screens/overlays/TodoCompleteModal.p3r';
import TodosItemMenu from '@blue/screens/overlays/TodosItemMenu.p3r';
import TodosDeleteConfirm from '@blue/screens/overlays/TodosDeleteConfirm.p3r';
import TodosWishAddSheet from '@blue/screens/overlays/TodosWishAddSheet.p3r';
import FateDrawSheet from '@blue/screens/overlays/FateDrawSheet.p3r';
import QuestBoardSheet from '@blue/screens/overlays/QuestBoardSheet.p3r';
import BigDealPanel from '@blue/screens/overlays/BigDealPanel.p3r';
import WishPanel from '@blue/screens/overlays/WishPanel.p3r';
import WishFulfillDialog from '@blue/screens/overlays/WishFulfillDialog.p3r';
import DanmakuCompose from '@blue/screens/overlays/DanmakuCompose.p3r';

const freqLabel = (t: Todo) => (t.frequency === 'single' ? '单次' : t.isLongTerm ? `长期 · ${t.targetCount || 1}次` : `多次 · ${t.targetCount || 1}次`);
const ArchiveIcon = ({ size = 14 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.4} strokeLinejoin="round" aria-hidden><path d="M3 4h18v5H3zM5 9v11h14V9M10 13h4" /></svg>
);
function DeadlineTag({ t, done }: { t: Todo; done?: boolean }) {
  const { TODAY_KEY, ATTR_NAMES } = useActionsData();
  if (!t.deadline || done) return null;
  const d = daysBetween(TODAY_KEY, t.deadline);
  const text = d > 0 ? `剩 ${d} 天` : d === 0 ? '今天截止' : `逾期 ${-d} 天`;
  return <span aria-label={`截止日 ${t.deadline}，${text}`}><P3Tag tone={d <= 1 ? 'coral' : 'ink'}><Glyph name="hourglass" /> {text}</P3Tag></span>;
}
const IconBtn = ({ title, onClick, children, tone }: { title: string; onClick: () => void; children: React.ReactNode; tone?: 'danger' }) => (
  <button type="button" title={title} aria-label={title} onPointerDown={(e) => e.stopPropagation()} onClick={(e) => { e.stopPropagation(); onClick(); }}
    className="flex h-8 w-9 shrink-0 items-center justify-center" style={{ clipPath: slantClip(5), background: tone === 'danger' ? 'var(--bk-danger-wash)' : P3R.cyanFaint, color: tone === 'danger' ? 'var(--p3r-coral-ink)' : P3R.ink }}>{children}</button>
);
/** 面板标题右侧的换面记号（真实 PaneSwapMark：两枚错位斜片） */
const PaneSwap = ({ wish }: { wish: boolean }) => (
  <span aria-hidden className="relative ml-2 inline-block h-[22px] w-[26px] shrink-0">
    <motion.span className="absolute left-0 top-0 h-[12px] w-[18px]" style={{ background: P3R.blue, clipPath: slantClip(4) }} animate={{ x: wish ? 8 : 0, y: wish ? 10 : 0 }} transition={{ type: 'spring', stiffness: 420, damping: 26 }} />
    <motion.span className="absolute left-0 top-0 h-[12px] w-[18px]" style={{ background: P3R.cyan, clipPath: slantClip(4) }} animate={{ x: wish ? 0 : 8, y: wish ? 0 : 10 }} transition={{ type: 'spring', stiffness: 420, damping: 26 }} />
  </span>
);
/** 空态斜板（真实 P3EmptySlab：slantClip(26) 浅面板 + 幽灵字） */
const EmptySlab = ({ text, ghost = 'EMPTY', action }: { text: string; ghost?: string; action?: React.ReactNode }) => (
  <div className="relative overflow-hidden px-6 py-8 text-center" style={{ clipPath: slantClip(26), background: P3R.panelGlass }}>
    <span aria-hidden className="pointer-events-none absolute -bottom-3 right-2 font-cond text-[64px] leading-none" style={{ color: 'var(--p3r-ghost)' }}>{ghost}</span>
    <p className="relative text-[15px] font-black" style={{ color: P3R.ink }}>{text}</p>
    {action && <div className="relative mt-3 flex justify-center">{action}</div>}
  </div>
);

/** p3 ListCard 行版任务卡（ActiveTodoCard / PendingWeekdayTodoCard） */
function TodoRow({ t, onMenu, onComplete, onUndo, onArchive, onDelete, pending, doneToday }: { t: Todo; onMenu: () => void; onComplete?: () => void; onUndo?: () => void; onArchive?: () => void; onDelete?: () => void; pending?: boolean; doneToday?: boolean }) {
  const anim = useBoldness();
  const lp = useLongPress(onMenu);
  const { TODAY_KEY, TODO_PROGRESS, ATTR_NAMES } = useActionsData();
  const count = TODO_PROGRESS[t.id] ?? 0;
  const target = t.frequency === 'count' ? t.targetCount ?? 1 : 1;
  const sel = lp.pressing;
  const linked = !!(t.pact || t.orgOp);
  const ink = sel ? 'var(--p3r-on-ink)' : P3R.ink;
  return (
    <div {...lp.handlers} role={onComplete ? 'button' : undefined} tabIndex={onComplete ? 0 : undefined}
      onClick={() => { if (!onComplete) return; if (lp.firedRef.current) { lp.firedRef.current = false; return; } onComplete(); }}
      onKeyDown={(e) => { if (e.target !== e.currentTarget) return; if (onComplete && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); onComplete(); } }}
      className="relative min-w-0 select-none" style={{ WebkitTouchCallout: 'none', opacity: pending && !sel ? 0.72 : 1 }}>
      <motion.div className="relative flex min-w-0 items-stretch gap-3 py-2.5 pl-4 pr-5" style={{ clipPath: slantClip(10), background: sel ? P3R.ink : P3R.panel }} animate={{ scale: sel && anim ? 0.985 : 1 }}>
        <span aria-hidden className="mt-0.5 flex h-11 w-8 shrink-0 items-center justify-center" style={{ clipPath: slantClip(5), background: t.important ? P3R.gold : sel ? P3R.blue : P3R.cyanPale }}>
          <span className="font-cond text-[15px] leading-none" style={{ color: t.important ? 'var(--p3r-mulberry)' : sel ? P3R.onBlue : P3R.roseInk }}>{t.important ? '★' : '◆'}</span>
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex min-w-0 flex-wrap items-center gap-1.5">
            <span className="font-heavy text-[16px] leading-none" style={{ color: sel ? ink : P3R.roseInk }}>{ATTR_NAMES[t.attribute]} +{t.points}</span>
            <P3Tag tone={sel ? 'outline' : 'soft'}>{freqLabel(t)}</P3Tag>
            {pending && <P3Tag tone="outline">{t.startDate ? `${t.startDate} 启用` : '未到日期'}</P3Tag>}
            {t.important && <P3Tag tone="gold"><Glyph name="star" />{pending ? '' : ' 重要'}</P3Tag>}
            {t.fateDrawnDate === TODAY_KEY && <P3Tag tone="lilac">✦ 签</P3Tag>}
            {t.pact && <P3Tag tone="coral">与 {t.pact.partnerName}</P3Tag>}
            <DeadlineTag t={t} done={count >= target} />
          </div>
          <div className="mt-1 p3r-clamp-1 text-[16px] font-black leading-tight" style={{ color: ink }}>{t.title}</div>
          <div className="mt-0.5 flex min-w-0 flex-wrap items-center gap-x-2 text-[11px] font-bold" style={{ color: sel ? ink : P3R.grey }}>
            {t.extraBoosts?.map((b, i) => <span key={i}>{ATTR_NAMES[b.attribute]} +{b.points}</span>)}
            {t.repeatDaily && !t.isLongTerm && <span style={{ color: sel ? ink : P3R.roseInk }}>每日</span>}
            {t.weekdays && t.weekdays.length > 0 && <span>{t.weekdays.map((d) => WEEK_LABELS[d]).join(' ')}</span>}
          </div>
          {!pending && (
            <div className="mt-1.5">
              <div className="mb-0.5 flex justify-between text-[11px] font-bold" style={{ color: sel ? ink : P3R.grey }}><span>{t.isLongTerm ? '长期进度' : '今日进度'}</span><span className="font-cond">{count}/{target}</span></div>
              <P3Progress value={Math.round((count / target) * Math.min(target, 10))} max={Math.min(target, 10)} variant="segments" color={sel ? 'var(--p3r-on-ink)' : undefined} />
            </div>
          )}
          {sel && <p className="mt-1.5 text-center text-[11px] font-black" style={{ color: ink }}>长按打开菜单</p>}
        </div>
        <div className="flex shrink-0 flex-col gap-1.5">
          {doneToday && onUndo && <IconBtn title="撤销今日完成（同时回退点数和记录）" onClick={onUndo}><IconRefresh size={13} /></IconBtn>}
          {!linked && onArchive && <IconBtn title={pending ? '归档' : '归档（不启用）'} onClick={onArchive}><ArchiveIcon /></IconBtn>}
          {pending && onDelete && <IconBtn title="删除" tone="danger" onClick={onDelete}><IconTrash size={13} /></IconBtn>}
        </div>
      </motion.div>
    </div>
  );
}

/** BIG DEAL 聚合卡（BigDealHomeCard p3：墨色斜切 + 目标弧 + 蓝进度） */
function BigDealCard({ t, onOpen, onMenu }: { t: Todo; onOpen: () => void; onMenu: () => void }) {
  const { TODAY_KEY, ATTR_NAMES } = useActionsData();
  const steps = t.steps ?? [];
  const done = steps.filter((s) => s.done).length;
  const next = steps.find((s) => !s.done);
  const dl = t.deadline ? daysBetween(TODAY_KEY, t.deadline) : null;
  return (
    <div className="relative min-w-0">
      <div className="relative overflow-hidden" style={{ clipPath: slantClip(12), background: P3R.ink }}>
        <span aria-hidden className="pointer-events-none absolute -right-2 -top-2 font-cond text-[54px] leading-none" style={{ color: 'rgba(240,249,255,0.08)' }}>BIG DEAL</span>
        <button type="button" onClick={onOpen} className="relative flex w-full min-w-0 items-center gap-3 py-3 pl-4 pr-12 text-left">
          <Ring pct={steps.length ? (done / steps.length) * 100 : 0} size={52} stroke={5} track="rgba(255,248,240,0.2)" ink="var(--p3r-on-ink)" label={<span className="font-cond text-[15px]">{done}/{steps.length}</span>} />
          <div className="min-w-0 flex-1">
            <div className="flex min-w-0 items-center gap-1.5">
              <P3Tag tone="rose">BIG DEAL</P3Tag>
              {dl !== null && <P3Tag tone={dl <= 2 ? 'coral' : 'soft'}>{dl > 0 ? `剩 ${dl} 天` : dl === 0 ? '今天截止' : '已过截止'}</P3Tag>}
            </div>
            <div className="mt-1 truncate font-heavy text-[17px]" style={{ color: 'var(--p3r-on-ink)' }}>{t.title}</div>
            <div className="mt-1 flex items-center gap-2 text-[11px] font-bold" style={{ color: 'rgba(240,249,255,0.65)' }}><span>总进度</span><span className="h-[6px] min-w-0 flex-1" style={{ background: 'rgba(255,248,240,0.18)', clipPath: slantClip(2) }}><span className="block h-full origin-left" style={{ background: P3R.blue, transform: `scaleX(${steps.length ? done / steps.length : 0})` }} /></span></div>
            <div className="mt-1 truncate text-[12px] font-bold" style={{ color: P3R.blue }}>{steps.length === 0 ? '去拆第一步' : next ? `下一步：${next.title}` : '全部完成——进去收官'}</div>
          </div>
        </button>
        <button type="button" aria-label="管理这件大事" onClick={onMenu} className="absolute right-3 top-3 flex h-8 w-8 items-center justify-center" style={{ background: 'rgba(255,248,240,0.12)', color: 'var(--p3r-on-ink)', clipPath: slantClip(5) }}><IconMore size={15} /></button>
      </div>
    </div>
  );
}

/** 愿望面板（WishBoard p3） */
function WishBoard({ wishes, onArchiveWish, onDeleteWish, onAddWish, onOpen, onFulfill, tokens, pendingReview, onCompose }: {
  wishes: Wish[];
  onArchiveWish: (w: Wish) => Promise<unknown>;
  onDeleteWish: (w: Wish) => Promise<unknown>;
  onAddWish: (title: string) => Promise<unknown>;
  onOpen: (w: Wish) => void;
  onFulfill: (w: Wish) => void;
  tokens: number;
  pendingReview: number;
  onCompose: () => void;
}) {
  const { WISH_TIMES, ATTR_NAMES } = useActionsData();
  const toast = useToast();
  const anim = useBoldness();
  const [menu, setMenu] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [draft, setDraft] = useState('');
  const active = wishes.filter((w) => w.status === 'active' && !w.parentId);
  return (
    <div className="min-w-0 space-y-1.5">
      {(tokens > 0 || pendingReview > 0) && (
        <button type="button" disabled={tokens <= 0} onClick={onCompose} className="flex w-full min-w-0 items-center gap-2 px-4 py-2 text-left text-[12px] font-black" style={{ background: P3R.ink, color: 'var(--p3r-on-ink)', clipPath: slantClip(9) }}>
          <span className="min-w-0 flex-1 truncate">{tokens > 0 ? `你还有 ${tokens} 次机会鼓励同样努力的人` : `${pendingReview} 条鼓励正在审核中`}{tokens > 0 && pendingReview > 0 && <span className="opacity-70"> · {pendingReview} 条审核中</span>}</span>
          {tokens > 0 && <span className="shrink-0" style={{ color: P3R.blue }}>去写 ›</span>}
        </button>
      )}
      {active.length === 0 && <EmptySlab ghost="WISH" text="还没有愿望。写下一个远一点的——记录时把事挂上去，就能看见自己在靠近它。" />}
      {active.map((w) => {
        const steps = w.steps ?? []; const done = steps.filter((s) => s.done).length; const times = WISH_TIMES[w.id] ?? 0;
        return (
          <div key={w.id} className="relative min-w-0">
            <div className="flex min-w-0 items-center gap-3 py-2.5 pl-4 pr-5" style={{ clipPath: slantClip(10), background: P3R.panel }}>
              <button type="button" onClick={() => onOpen(w)} aria-label={`打开「${w.title}」的进度面板`} className="flex min-w-0 flex-1 items-center gap-3 text-left">
                <Ring pct={w.progressPct ?? 0} size={46} stroke={4} dim={typeof w.progressPct !== 'number'} />
                <span className="min-w-0 flex-1">
                  <span className="block p3r-clamp-1 text-[16px] font-black" style={{ color: P3R.ink }}>{w.title}</span>
                  <span className="block truncate text-[12px]" style={{ color: P3R.grey }}>{times > 0 ? `已完成相关任务 ${times} 次${steps.length > 0 ? ` · 子任务 ${done}/${steps.length}` : ''}` : steps.length > 0 ? `子任务 ${done}/${steps.length}` : '还没有记录挂到这里'}</span>
                </span>
              </button>
              <button type="button" aria-label={`「${w.title}」的操作`} aria-expanded={menu === w.id} onClick={() => setMenu(menu === w.id ? null : w.id)} className="flex h-9 w-8 shrink-0 items-center justify-center" style={{ background: menu === w.id ? P3R.ink : P3R.cyanFaint, color: menu === w.id ? 'var(--p3r-on-ink)' : P3R.ink, clipPath: slantClip(5) }}><IconMore size={15} /></button>
            </div>
            <AnimatePresence>
              {menu === w.id && (
                <motion.div initial={anim ? { opacity: 0, x: 14 } : { opacity: 0 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0 }} className="absolute right-2 top-[calc(100%-6px)] z-20 w-40 py-1.5" style={{ background: P3R.ink, clipPath: slantClip(10), filter: 'drop-shadow(0 8px 16px rgba(13,22,42,0.3))' }}>
                  {[['split', '拆子任务'], ['fulfill', '愿望已实现'], ['archive', '收起'], ['delete', '删除']].map(([id, label]) => (
                    <button key={id} type="button" onClick={() => {
                      setMenu(null);
                      if (id === 'split') onOpen(w);
                      if (id === 'fulfill') onFulfill(w);
                      if (id === 'archive') void onArchiveWish(w).then(() => toast('已收起')).catch(() => toast.error('收起失败，请重试'));
                      if (id === 'delete') void onDeleteWish(w).then(() => toast('已删除')).catch(() => toast.error('删除失败，请重试'));
                    }} className="block w-full px-5 py-2 text-left text-[14px] font-black" style={{ color: id === 'delete' ? P3R.magenta : 'var(--p3r-on-ink)' }}>{label}</button>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        );
      })}
      {adding ? (
        <div className="flex min-w-0 gap-2 pt-1">
          <div className="min-w-0 flex-1"><P3Input autoFocus placeholder="想实现的事…" aria-label="愿望标题" value={draft} onChange={(e) => setDraft(e.target.value)} /></div>
          <P3Button disabled={!draft.trim()} onClick={() => { const title = draft.trim(); void onAddWish(title).then(() => { setDraft(''); setAdding(false); toast.success('愿望已记下'); }).catch(() => toast.error('记下失败，请重试')); }}>记下</P3Button>
        </div>
      ) : (
        <button type="button" onClick={() => setAdding(true)} className="block h-11 w-full text-center text-[14px] font-black" style={{ clipPath: slantClip(9), boxShadow: 'inset 0 0 0 2px rgb(var(--p3r-blue-rgb) / 0.4)', color: P3R.roseInk }}>＋ 记下一个愿望</button>
      )}
    </div>
  );
}

export function TodosView({ params }: { params: URLSearchParams }) {
  const toast = useToast();
  const anim = useBoldness();
  const { TODOS: realTODOS, WISHES: realWISHES, TODAY_DONE: realTODAY_DONE, TODAY_KEY, TODAY, ATTR_NAMES } = useActionsData();
  const empty = qp(params, 'state') === 'empty';
  const [todos, setTodos] = useState<Todo[]>(empty ? [] : realTODOS);
  const [wishes, setWishes] = useState<Wish[]>(empty ? [] : realWISHES);
  const [pane, setPane] = useState<'todo' | 'wish'>(qp(params, 'pane') === 'wish' ? 'wish' : 'todo');
  const [doneToday, setDoneToday] = useState(new Set(empty ? [] : realTODAY_DONE));
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
  const [completeCut, setCompleteCut] = useState<{ title: string; points: number; hint: { achievements: number; skills: number } } | null>(null);
  const isWish = pane === 'wish';

  useEffect(() => { setTodos(empty ? [] : realTODOS); setWishes(empty ? [] : realWISHES); setDoneToday(new Set(empty ? [] : realTODAY_DONE)); }, [realTODOS, realWISHES, realTODAY_DONE, empty]);
  useEffect(() => () => useAppStore.getState().setModalBlocker(false), []);

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
  const subLabel = (t: string, c?: string) => <div className="mb-1 flex items-center gap-1.5 px-1 text-[11px] font-black" style={{ color: c ?? P3R.grey }}><span aria-hidden className="h-[8px] w-[6px]" style={{ background: c ?? P3R.cyan, clipPath: tickClip }} />{t}</div>;
  const archRow = 'flex min-w-0 items-center gap-2 py-2 pl-4 pr-5';

  const saveForm = async (f: TodoForm, id?: string) => {
    try {
      await actionsOps.saveTodo(f, id);
      setForm(false);
      toast.success(id ? '任务已保存' : '任务已添加');
      return true;
    } catch {
      toast.error('保存失败，任务没有写入；请重试');
      return false;
    }
  };

  const completeTodo = async (t: Todo) => {
    const progress = useAppStore.getState().getTodayTodoProgress(t.id);
    if (progress.isComplete) return;
    const willComplete = progress.count + 1 >= progress.target;
    if (willComplete) useAppStore.getState().setModalBlocker(true);
    try {
      const result = await actionsOps.completeTodo(t.id);
      if (!result) {
        if (willComplete) useAppStore.getState().setModalBlocker(false);
        toast.error('没有记上：任务可能已完成、已停用或档案已切换');
        return;
      }
      if (!result.completed) {
        if (willComplete) useAppStore.getState().setModalBlocker(false);
        return;
      }
      const points = t.points + (t.extraBoosts?.reduce((sum, boost) => sum + boost.points, 0) ?? 0);
      window.setTimeout(() => setCompleteCut({ title: t.title, points, hint: result.unlockHints }), anim ? 220 : 0);
    } catch {
      if (willComplete) useAppStore.getState().setModalBlocker(false);
      toast.error('任务没有写入，进度已保留原样');
    }
  };

  const taskAction = async (message: string, action: () => Promise<unknown>) => {
    try {
      await action();
      toast.success(message);
      return true;
    } catch {
      toast.error('操作失败，数据没有改变；请重试');
      return false;
    }
  };

  return (
    <div className="relative min-w-0 space-y-6 pb-28">
      <GoalDeck deck={qp(params, 'deck') === 'cards' ? 'cards' : 'weekly'} goalState={goal} cardsEmpty={empty} />

      <section className="relative min-w-0">
        <GhostWords words={[isWish ? 'LOG' : 'PLAN']} className="-right-2 -top-6" style={{ fontSize: '4.2rem', opacity: 0.7 }} />
        <button type="button" onClick={togglePane} aria-label={paneLabel} className="relative mb-3 block w-full min-w-0 text-left">
          <BigSlantTitle title={isWish ? '愿望' : '今日任务'} suffix={<PaneSwap wish={isWish} />}
            count={<span className="font-cond text-[15px]" style={{ color: P3R.roseInk }}>{isWish ? `${activeWishCount} 个` : `${active.length} 项`}</span>} />
        </button>
        {!isWish && (
          <div className="mb-3 flex min-w-0 gap-2">
            <button type="button" onClick={() => setFate(true)} className="relative flex min-w-0 flex-1 items-center gap-2 overflow-hidden px-4 py-2.5 text-left" style={{ clipPath: slantClip(10), background: P3R.panelGlass }}>
              <span aria-hidden className="relative flex h-7 w-5 shrink-0 items-center justify-center text-[11px]" style={{ background: `linear-gradient(165deg, ${P3R.blue}, var(--p3r-mulberry))`, color: 'rgba(214,226,255,0.9)', clipPath: slantClip(3) }}>✦</span>
              <span className="relative min-w-0 truncate text-[14px] font-black" style={{ color: P3R.ink }}><span className="min-[400px]:hidden">让命运替你挑一件</span><span className="hidden min-[400px]:inline">不知道做什么好？命运会替你选择</span></span>
            </button>
            <div className="relative shrink-0">
              <button type="button" onClick={() => setQuest(true)} aria-label="委托板，1 张可领取" className="flex h-full items-center gap-1 px-4 text-[14px] font-black" style={{ clipPath: slantClip(10), background: P3R.panelGlass, color: P3R.ink }}><Glyph name="scroll" /><span>委托</span></button>
              <Dot n={1} />
            </div>
          </div>
        )}
        <AnimatePresence mode="wait" initial={false}>
          <motion.div key={pane} initial={anim ? { opacity: 0, x: 24 } : { opacity: 0 }} animate={{ opacity: 1, x: 0 }} exit={anim ? { opacity: 0, x: -24 } : { opacity: 0 }} transition={{ duration: 0.18 }} className="relative min-w-0">
            {isWish ? (
              <WishBoard wishes={wishes}
                onArchiveWish={(w) => actionsOps.setWishStatus(w.id, 'archived')}
                onDeleteWish={(w) => actionsOps.deleteWish(w.id)}
                onAddWish={(title) => actionsOps.addWish(title)}
                onOpen={setWishPanel} onFulfill={setFulfill} tokens={empty ? 0 : 2} pendingReview={empty ? 0 : 1} onCompose={() => setCompose(true)} />
            ) : active.length === 0 ? (
              <EmptySlab ghost="PLAN" text="还没有任务，添加一个开始吧" action={<P3Button corner onClick={() => setForm({ todo: null })}>添加任务</P3Button>} />
            ) : (
              <P3Stagger className="space-y-1.5">
                {active.map((t) => (
                  <P3StaggerItem key={t.id}>
                    {t.isBigDeal ? <BigDealCard t={t} onOpen={() => setDeal(t)} onMenu={() => setMenuId(t.id)} />
                      : <TodoRow t={t} onMenu={() => setMenuId(t.id)} onComplete={() => void completeTodo(t)}
                        doneToday={doneToday.has(t.id) || useAppStore.getState().getTodayTodoProgress(t.id).isComplete}
                        onUndo={() => void taskAction('已撤销今日完成，点数与记录已回退', () => actionsOps.undoTodayTodoCompletion(t.id))}
                        onArchive={() => void taskAction('已归档（不启用）', () => actionsOps.updateTodo(t.id, { isActive: false }))} />}
                  </P3StaggerItem>
                ))}
              </P3Stagger>
            )}
          </motion.div>
        </AnimatePresence>
      </section>

      {!isWish && (
        <section className="min-w-0 space-y-2">
          <MiniHead title="已归档" en="ARCHIVE" right={<span className="font-cond text-[13px]" style={{ color: P3R.grey }}>{archivedCount} 项</span>} />
          {archivedCount === 0 && goneWishes.length === 0 ? <EmptySlab ghost="ARCHIVE" text="归档区暂无内容" /> : (
            <div className="space-y-3">
              {pendingDate.length > 0 && (
                <div>{subLabel('未到日期')}
                  <div className="space-y-1.5">{pendingDate.map((t) => <TodoRow key={t.id} t={t} pending onMenu={() => setMenuId(t.id)} onArchive={() => void taskAction('已归档（不启用）', () => actionsOps.updateTodo(t.id, { isActive: false }))} onDelete={() => setDelId(t.id)} />)}</div>
                </div>
              )}
              {inactive.length > 0 && (
                <div>{subLabel('未启用')}
                  <div className="space-y-1.5">
                    {inactive.map((t) => (
                      <div key={t.id} className={archRow} style={{ clipPath: slantClip(9), background: 'var(--p3r-row-alt)' }}>
                        <span className="min-w-0 flex-1"><span className="block truncate text-[15px] font-black" style={{ color: P3R.ink, opacity: 0.7 }}>{t.title}</span><span className="text-[11px]" style={{ color: P3R.grey }}>{ATTR_NAMES[t.attribute]} +{t.points} · {freqLabel(t)}</span></span>
                        <IconBtn title="编辑" onClick={() => setForm({ todo: t })}><IconEdit size={13} /></IconBtn>
                        <IconBtn title="删除" tone="danger" onClick={() => setDelId(t.id)}><IconTrash size={13} /></IconBtn>
                        <IconBtn title="恢复（重置为未完成）" onClick={() => void taskAction('已恢复到今日任务', () => actionsOps.updateTodo(t.id, { isActive: true, archivedAt: undefined }))}><IconRefresh size={13} /></IconBtn>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {completed.length > 0 && (
                <div>{subLabel('已完成', P3R.roseInk)}
                  <div className="space-y-1.5">
                    {shownCompleted.map((t) => {
                      const today = doneToday.has(t.id);
                      return (
                        <div key={t.id} className={archRow} style={{ clipPath: slantClip(9), background: 'var(--p3r-row-alt)' }}>
                          <span className="min-w-0 flex-1">
                            <span className="flex min-w-0 items-center gap-1.5">
                              <span className="min-w-0 truncate text-[15px] font-black line-through decoration-2" style={{ color: P3R.ink, textDecorationColor: P3R.blue }}>{t.title}</span>
                              {t.wishId && <P3Tag tone="lilac">✦ 愿望</P3Tag>}
                            </span>
                            {today ? <span className="text-[11px] font-black" style={{ color: P3R.roseInk }}>✓ 今日已完成</span> : <span className="text-[11px]" style={{ color: P3R.grey }}>✓ {t.completedAt!.getMonth() + 1}月{t.completedAt!.getDate()}日完成</span>}
                          </span>
                          <IconBtn title="删除" tone="danger" onClick={() => setDelId(t.id)}><IconTrash size={13} /></IconBtn>
                          {today && <IconBtn title="撤销今日完成（同时回退点数和记录）" onClick={() => void taskAction('已撤销今日完成，点数与记录已回退', () => actionsOps.undoTodayTodoCompletion(t.id))}><IconRefresh size={13} /></IconBtn>}
                          <IconBtn title="按此配置新建任务" onClick={() => setForm({ todo: { ...t, id: '', completedAt: undefined } as Todo })}><IconPlus size={13} /></IconBtn>
                        </div>
                      );
                    })}
                  </div>
                  {completed.length > 3 && <button type="button" onClick={() => setExpandCompleted((v) => !v)} className="mt-2 w-full text-center text-[13px] font-black underline decoration-2 underline-offset-4" style={{ color: P3R.roseInk }}>{expandCompleted ? '收起' : `展开全部（共 ${completed.length} 项）`}</button>}
                </div>
              )}
              {goneWishes.map((w) => (
                <div key={w.id} className={archRow} style={{ clipPath: slantClip(9), background: 'var(--p3r-row-alt)' }}>
                  <span className="min-w-0 flex-1"><span className="block truncate text-[15px] font-black" style={{ color: P3R.ink }}>{w.title}</span><P3Tag tone={w.fulfilledAt ? 'rose' : 'outline'}>{w.fulfilledAt ? '✦ 愿望 · 已实现' : '✦ 愿望 · 已收起'}</P3Tag></span>
                  <P3Button size="sm" tone="soft" onClick={() => void taskAction('愿望已恢复', () => actionsOps.setWishStatus(w.id, 'active'))}>恢复</P3Button>
                </div>
              ))}
            </div>
          )}
        </section>
      )}

      <SlantFab label={isWish ? '添加愿望' : '添加任务'} text={isWish ? '许愿' : '接入'} onClick={() => (isWish ? setWishAdd(true) : setForm({ todo: null }))} />

      <TodoFormSheet open={!!form} onClose={() => setForm(false)} todo={form ? (form.todo?.id ? form.todo : null) : null} onSave={saveForm} />
      <TodosItemMenu open={!!menuTodo} onClose={() => setMenuId(null)} todo={menuTodo}
        onAction={(a) => { const t = menuTodo!; if (a === 'edit') setForm({ todo: t }); if (a === 'archive') void taskAction('已归档', () => actionsOps.updateTodo(t.id, { isActive: false })); if (a === 'delete') setDelId(t.id); }} />
      <TodosDeleteConfirm open={!!delTodo} onClose={() => setDelId(null)} title={delTodo?.title} onConfirm={() => { const id = delId; if (!id) return; void taskAction('已删除', () => actionsOps.deleteTodo(id)).then((ok) => { if (ok) setDelId(null); }); }} />
      <TodosWishAddSheet open={wishAdd} onClose={() => setWishAdd(false)} onAdd={(title) => { void taskAction('愿望已记下', () => actionsOps.addWish(title).then(() => undefined)).then((ok) => { if (ok) setWishAdd(false); }); }} />
      <FateDrawSheet open={fate} onClose={() => setFate(false)} onGo={async (kind, candidate) => { if (kind === 'quest') { setQuest(true); return; } toast.success('接住了 · ✦ 签'); }} />
      <QuestBoardSheet open={quest} onClose={() => setQuest(false)} />
      <BigDealPanel open={!!deal} onClose={() => setDeal(null)} todo={deal} onChange={(n) => setTodos((l) => l.map((x) => (x.id === n.id ? n : x)))} />
      <WishPanel open={!!wishPanel} onClose={() => setWishPanel(null)} wish={wishPanel} onChange={(n) => setWishes((l) => l.map((x) => (x.id === n.id ? n : x)))} />
      <WishFulfillDialog open={!!fulfill} onClose={() => setFulfill(null)} wish={fulfill} onFulfilled={(id) => setWishes((l) => l.map((x) => (x.id === id ? { ...x, status: 'done', fulfilledAt: new Date() } : x)))} />
      <DanmakuCompose open={compose} onClose={() => setCompose(false)} tokens={2} />
      <BandCutInP3 isOpen={!!completeCut} onClose={() => { setCompleteCut(null); useAppStore.getState().setModalBlocker(false); }}
        title={completeCut?.title ?? ''} totalPoints={completeCut?.points} unlockHint={completeCut?.hint} />
    </div>
  );
}

export default function Todos({ params }: { params: URLSearchParams }) {
  return <TodosView params={params} />;
}
