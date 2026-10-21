/**
 * 数据适配层 adapter/live.ts —— 红频道与正式仓库之间唯一的连接点，也是整个 src/p5r-red/ 里【唯一允许修改】的文件
 * （同目录 README.md 是它的说明书 + 映射表）。别的文件一个字节都不要改，改了 check-copy 会失败。
 *
 * 做法：红频道的页面全部读 demo 的 mock 对象（src/p5r-red/mock/data.ts 的 D、mock/pkg5-data.ts 的数组、记账 FLOW）。
 * 这里把真实 store（useAppStore）的字段【原地写进】这些对象（只改内容，不换引用），然后通知 RedChannelCore 重渲染。
 *   · syncLiveDataNow()  首帧前同步一次（RedChannelRoot 调用；pkg3 / pkg4 模块初始化时读一次 mock，所以必须在首帧前）
 *   · LIVE               订阅 store 变化 → 再同步 → version+1 → 红频道整棵重渲染（不重挂载，演出 / 弹层状态不丢）
 *   · useLiveFlags()     夜间（settings.darkMode）与低动效（!useBoldness()）
 * 规则：
 *   1. 真实数据为空就写空数组 / 0（不要回填 mock，给真实用户看假数据是事故）。
 *   2. 用户批准的记账例外：通过 ledgerLiveBridge 调用既有本地记账 action；其它页面仍只读。
 *   3. 字段对不上时只改这里的映射函数，不要去改页面。
 */
import { useAppStore, toLocalDateKey } from '@/store';
import { db } from '@/db';
import { cycleRangeForKey, incomeTypeFromSource, ledgerCycle, roundMoney, shiftMonth } from '@/utils/ledgerFormat';
import { useBoldness } from '@/utils/boldness';
import { calcCurrentStreak, streakDates } from '@/utils/streak';
import { TAROT_BY_ID } from '@/constants/tarot';
import type { Activity, Achievement, AttributeId, CallingCard, Confidant, LedgerEntry, Skill, Todo } from '@/types';
import { D, type AttrId, type MockCallingCard, type MockConfidant, type MockTodo } from '@/p5r-red/mock/data';
import { ACTIVITIES, CALLING_ARCHIVED, CALLING_CARDS, ACHIEVEMENTS, SKILLS, type MockAch, type MockActivity, type MockCC, type MockSkill, type CondType } from '@/p5r-red/mock/pkg5-data';
import { FLOW, connectLedgerLive, type LedgerLiveBridge, type LiveLedgerRow } from '@/p5r-red/screens/pkg4/ledger4';

type S = ReturnType<typeof useAppStore.getState>;
const ATTRS: AttrId[] = ['knowledge', 'guts', 'dexterity', 'kindness', 'charm'];

/* ── 小工具 ── */
const pad = (n: number) => String(n).padStart(2, '0');
const dayKey = (d: Date | string | undefined) => { if (!d) return ''; const x = new Date(d); return Number.isNaN(+x) ? '' : `${x.getFullYear()}-${pad(x.getMonth() + 1)}-${pad(x.getDate())}`; };
const dotDate = (d: Date | string | undefined) => dayKey(d).replace(/-/g, '.');
const iso = (d: Date | string) => new Date(d).toISOString();
const daysAgo = (key: string) => Math.max(0, Math.round((+new Date(new Date().toDateString()) - +new Date(key + 'T00:00:00')) / 864e5));
/** 原地替换数组内容（页面持有的是同一个数组引用） */
function fill<T>(arr: T[], items: T[]) { arr.splice(0, arr.length, ...items); }
const pts = (p: Activity['pointsAwarded'] | undefined) => { const o: Partial<Record<AttrId, number>> = {}; for (const a of ATTRS) { const v = p?.[a as AttributeId] ?? 0; if (v) o[a] = v; } return o; };

/** 真实塔罗 id（constants/tarot：fool / high_priestess / wheel_of_fortune …）→ demo 羁绊用的大写 id（oc.ts TAROT） */
const ARCANA_DEMO: Record<string, string> = { fool: 'FOOL', magician: 'MAGICIAN', high_priestess: 'PRIESTESS', empress: 'EMPRESS', emperor: 'EMPEROR', hierophant: 'HIEROPHANT', lovers: 'LOVERS', chariot: 'CHARIOT', justice: 'JUSTICE', hermit: 'HERMIT', wheel_of_fortune: 'FORTUNE', strength: 'STRENGTH', hanged_man: 'HANGED', death: 'DEATH', temperance: 'TEMPERANCE', devil: 'DEVIL', tower: 'TOWER', star: 'STAR', moon: 'MOON', sun: 'SUN', judgement: 'JUDGEMENT', world: 'WORLD' };

/* ── 映射函数（字段对照见 README.md 映射表） ── */
function mapAttrs(s: S) {
  const th = s.settings.levelThresholds?.length ? s.settings.levelThresholds : undefined;
  for (const a of ATTRS) {
    const r = s.attributes.find((x) => x.id === a);
    if (!r) { D.attrs[a] = { level: 1, pts: 0, next: 1 }; continue; }
    const t = th ?? r.levelThresholds ?? [];
    const max = t.length || 5, lv = r.level || 1;
    const cur = lv > 1 ? t[lv - 1] ?? 0 : 0, nxt = lv < max ? t[lv] ?? cur + 1 : t[max - 1] ?? cur + 1;
    D.attrs[a] = { level: lv, pts: Math.max(0, r.points - cur), next: Math.max(1, nxt - cur) };
  }
  D.maxLevel = (th ?? s.attributes[0]?.levelThresholds ?? []).length || D.maxLevel;
}
function mapTodo(t: Todo, s: S): MockTodo {
  const today = dayKey(new Date());
  const done = s.todoCompletions.filter((c) => c.todoId === t.id && c.date === today).reduce((n, c) => n + (c.count || 0), 0);
  const target = t.frequency === 'count' ? t.targetCount || 1 : 1;
  const deadlineDays = t.deadline ? Math.max(0, -daysAgo(t.deadline)) : undefined;
  return { id: t.id, title: t.title, attribute: t.attribute as AttrId, points: t.points, frequency: t.frequency === 'count' ? 'count' : 'single', targetCount: t.targetCount, repeatDaily: !!t.repeatDaily, important: t.important, fate: t.fateDrawnDate === today, deadlineDays, count: Math.min(done, target), target, extra: t.extraBoosts?.map((b) => ({ attribute: b.attribute as AttrId, points: b.points })) };
}
function ccMock(c: CallingCard, s: S): MockCallingCard {
  const p = s.getCallingCardProgress(c.id);
  return { id: c.id, title: c.title, subtitle: c.subtitle ?? '', mode: c.mode as MockCallingCard['mode'], target: c.targetDate ?? '', start: c.startDate, pinned: c.pinned, todosDone: p?.todosDone, todosTotal: p?.todosTotal };
}
function ccPkg5(c: CallingCard, s: S): MockCC {
  const p = s.getCallingCardProgress(c.id);
  return { id: c.id, title: c.title, subtitle: c.subtitle, icon: c.icon ?? '★', texture: 'lines', mode: c.mode as MockCC['mode'], startDate: c.startDate, targetDate: c.targetDate ?? c.startDate, pinned: c.pinned, todosDone: p?.todosDone, todosTotal: p?.todosTotal, archived: c.archived, archiveReason: c.archiveReason };
}
function confidantMock(c: Confidant): MockConfidant {
  const t = TAROT_BY_ID[c.arcanaId];
  return { name: c.name, arcana: ARCANA_DEMO[c.arcanaId] ?? 'FOOL', arcanaCn: t?.name ?? '', no: t?.roman ?? '', rank: c.intimacy, desc: c.description };
}
const CAT_OK = new Set(['achievement_unlock', 'skill_unlock', 'calling_card_clear', 'weekly_goal', 'confidant', 'shadow_defeat']);
function activityPkg5(a: Activity): MockActivity {
  return { id: a.id, date: iso(a.date), description: a.description, pointsAwarded: pts(a.pointsAwarded), method: a.method, category: CAT_OK.has(a.category as string) ? (a.category as MockActivity['category']) : undefined, important: a.important, backfilled: a.backfilled, levelUps: a.levelUps?.map((l) => ({ attribute: l.attribute as AttrId, fromLevel: l.fromLevel, toLevel: l.toLevel })), weather: a.weather?.icon };
}
const COND_OK = new Set<CondType>(['total_points', 'consecutive_days', 'attribute_level', 'keyword_match', 'todo_completions']);
function achievementPkg5(a: Achievement): MockAch {
  const letter = (a.id.match(/[a-z]/i)?.[0] ?? 'A').toUpperCase();
  const type = (COND_OK.has(a.condition.type as CondType) ? a.condition.type : 'total_points') as CondType;
  return { id: a.id, icon: a.icon, letter, title: a.title, description: a.description, condition: { type, value: a.condition.value, attribute: a.condition.attribute as AttrId | undefined, keywords: a.condition.keywords }, progress: a.condition.currentProgress ?? 0, unlocked: a.unlocked, unlockedDate: dayKey(a.unlockedDate) || undefined };
}
function skillPkg5(k: Skill): MockSkill {
  return { id: k.id, name: k.name, description: k.description, requiredAttribute: k.requiredAttribute as AttrId, requiredLevel: k.requiredLevel, bonusMultiplier: k.bonusMultiplier ?? 1, unlocked: k.unlocked };
}
function ledgerRow(e: LedgerEntry) {
  return { id: e.id, date: e.date, note: e.note || e.category || (e.direction === 'income' ? '收入' : e.direction === 'adjust' ? '余额对账' : '支出'), amount: e.amount, dir: e.direction, ch: e.channel || '', cat: e.category, labor: e.incomeType === 'labor', grantedSp: e.reward?.sp ?? 0, d: daysAgo(e.date) };
}

let loadingLedger: Promise<void> | undefined;
const ensureLedger = async () => {
  if (useAppStore.getState().ledgerLoaded) return;
  if (!loadingLedger) loadingLedger = useAppStore.getState().loadLedger().finally(() => { loadingLedger = undefined; });
  await loadingLedger;
};
const ledgerWatch: (keyof S)[] = ['ledgerEntries', 'budgets', 'ledgerLoaded', 'settings'];
type EntryInput = Parameters<S['addLedgerEntry']>[0];
const expenseTypes: Record<string, NonNullable<LedgerEntry['type']>> = { 餐饮: 'food', 交通: 'transport', 学习: 'study', 提升: 'study', 娱乐: 'fun', 日用: 'shopping', 购物: 'shopping', 居住: 'home', 其它: 'other' };
const requests = new Map<string, Promise<{ rows: LiveLedgerRow[]; warning?: string }>>();
export const ledgerLiveBridge: LedgerLiveBridge = {
  ready: ensureLedger,
  amount(raw, negative = false) {
    const value = String(raw ?? '').trim().replace(/[，,。]/g, '.');
    if (!new RegExp(`^${negative ? '-?' : ''}(?:\\d+(?:\\.\\d*)?|\\.\\d+)$`).test(value)) return NaN;
    const n = Number(value); return Number.isFinite(n) ? roundMoney(n) : NaN;
  },
  snapshot(month = 0) {
    const s = useAppStore.getState(), today = toLocalDateKey();
    const cycle = ledgerCycle(!!s.settings.ledgerPayCycleEnabled, s.settings.ledgerResetDay ?? 1, today);
    const period = shiftMonth(cycle.key, Math.min(0, month));
    const [start, end] = cycleRangeForKey(!!s.settings.ledgerPayCycleEnabled, s.settings.ledgerResetDay ?? 1, period);
    const entries = s.ledgerLoaded ? s.ledgerEntries : [];
    const budget = s.ledgerLoaded ? s.getBudget(period) : undefined;
    const rows = entries.filter(e => e.date >= start && e.date <= end).sort((a, b) => b.date.localeCompare(a.date) || +new Date(b.createdAt) - +new Date(a.createdAt)).map(ledgerRow);
    const chart = Array.from({ length: 9 }, (_, i) => {
      const date = new Date(`${today}T00:00:00`); date.setDate(date.getDate() - (8 - i));
      const key = toLocalDateKey(date);
      return roundMoney(entries.filter(e => e.direction === 'expense' && e.date === key).reduce((sum, e) => sum + e.amount, 0));
    });
    return {
      ready: s.ledgerLoaded, today, period, rows, first: s.ledgerLoaded && entries.length === 0,
      total: s.ledgerLoaded ? s.getTotalBalance() : 0,
      ex: s.ledgerLoaded ? s.getPeriodExpense(period) : 0, inc: s.ledgerLoaded ? s.getPeriodIncome(period) : 0,
      limit: budget?.monthlyLimit, savings: budget?.savingsGoal, savingsEdits: budget?.savingsGoalEdits ?? 0,
      resetDay: s.settings.ledgerResetDay ?? 1,
      daysLeft: Math.max(1, Math.round((+new Date(`${end}T00:00:00`) - +new Date(`${today}T00:00:00`)) / 864e5) + 1),
      chart, remaining: Math.max(0, 3 - s.getAdjustCountThisMonth()),
      accounts: s.getAccountBalances().map(a => ({ name: a.name, bal: a.balance, debt: a.isDebt, unassigned: a.unassigned })),
    };
  },
  subscribe(cb) {
    return useAppStore.subscribe((s, previous) => { if (ledgerWatch.some(key => s[key] !== previous[key])) cb(); });
  },
  async save(rows, requestId) {
    const existing = requests.get(requestId); if (existing) return existing;
    const operation = (async () => {
      await ensureLedger();
      if (!rows.length || !requestId) throw new Error('没有可保存的流水');
      const inputs: EntryInput[] = rows.map(row => {
        const date = row.date ?? toLocalDateKey();
        if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || toLocalDateKey(new Date(`${date}T00:00:00`)) !== date) throw new Error('日期无效');
        if (!Number.isFinite(row.amount) || roundMoney(row.amount) <= 0 || !['income', 'expense'].includes(row.dir)) throw new Error('金额无效');
        return {
          direction: row.dir as 'income' | 'expense', amount: roundMoney(row.amount), date, source: 'manual', note: row.note,
          channel: row.ch?.trim() || undefined,
          ...(row.dir === 'income' ? { incomeType: row.labor === undefined ? incomeTypeFromSource(row.incomeSource) : row.labor ? 'labor' as const : 'other' as const, category: row.incomeSource } : { type: expenseTypes[row.cat ?? ''] ?? 'other', category: row.subcategory || row.cat, evalWorth: row.worth === '值得' ? 'worth' as const : row.worth === '不值' ? 'notWorth' as const : undefined }),
        };
      });
      const created: LedgerEntry[] = [];
      try {
        await db.transaction('rw', db.ledgerEntries, async () => {
          for (const input of inputs) created.push(await useAppStore.getState().addLedgerEntry(input));
        });
      } catch (error) { await useAppStore.getState().loadLedger(); throw error; }
      let warning: string | undefined;
      for (const entry of created) {
        try { await useAppStore.getState().rewardForLedgerEntry(entry, { evalWorth: entry.evalWorth }); }
        catch { warning = '流水已保存，奖励处理未完成'; }
      }
      return { rows: created.map(entry => ledgerRow(useAppStore.getState().ledgerEntries.find(e => e.id === entry.id) ?? entry)), warning };
    })();
    requests.set(requestId, operation);
    operation.catch(() => { requests.delete(requestId); });
    // 已关闭表单的请求只需保留少量，防止长期使用累积。
    if (requests.size > 100) { const key = requests.keys().next().value; if (key) requests.get(key)?.then(() => requests.delete(key), () => {}); }
    return operation;
  },
  async remove(id) { await ensureLedger(); await useAppStore.getState().deleteLedgerEntry(id); },
  async budget({ period, limit, savings, resetDay }) {
    await ensureLedger();
    if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(period) || !Number.isFinite(limit) || limit <= 0 || (savings !== undefined && (!Number.isFinite(savings) || savings < 0)) || !Number.isInteger(resetDay) || resetDay < 1 || resetDay > 28) throw new Error('预算输入无效');
    const s = useAppStore.getState(), current = s.getBudget(period);
    const changed = savings !== current?.savingsGoal;
    if (changed && (current?.savingsGoalEdits ?? 0) >= 2) throw new Error('本月修改次数已用完');
    await s.setBudget(period, { monthlyLimit: roundMoney(limit), carriedFrom: undefined, ...(changed ? { savingsGoal: savings === undefined ? undefined : roundMoney(savings), savingsGoalEdits: (current?.savingsGoalEdits ?? 0) + 1 } : {}) });
    if (resetDay !== useAppStore.getState().settings.ledgerResetDay) await useAppStore.getState().updateSettings({ ledgerResetDay: resetDay });
  },
  async reconcile(targets) {
    await ensureLedger();
    if (!targets.length || targets.some(t => !Number.isFinite(t.target))) throw new Error('余额输入无效');
    try {
      await db.transaction('rw', db.ledgerEntries, async () => {
        const result = await useAppStore.getState().adjustAccountBalances(targets);
        if (!result.ok) throw new Error(result.reason ?? '对账失败');
      });
    } catch (error) { await useAppStore.getState().loadLedger(); throw error; }
  },
};
connectLedgerLive(ledgerLiveBridge);

/** 把 store 当前状态写进全部 mock 对象 */
export function syncLiveDataNow(s: S = useAppStore.getState()) {
  // 用户 / 名片
  D.user.name = s.user?.name ?? '';
  D.user.joined = dotDate(s.user?.createdAt);
  D.streak = calcCurrentStreak(streakDates(s.activities));
  mapAttrs(s);
  // 任务（活跃 / 归档）
  fill(D.todos, s.todos.filter((t) => t.isActive && !t.archivedAt && !t.isBigDeal).map((t) => mapTodo(t, s)));
  fill(D.archived, s.todos.filter((t) => !!t.archivedAt).slice(0, 20).map((t) => ({ id: t.id, title: t.title, attribute: t.attribute as AttrId, points: t.points, state: t.completedAt ? 'done' as const : t.isActive ? 'pending' as const : 'inactive' as const, weekdays: t.weekdays })));
  // 愿望 / 宣告卡 / 周目标
  fill(D.wishes, s.wishes.filter((w) => !w.archivedAt && !w.parentId).map((w) => ({ title: w.title, status: w.status })));
  const active = s.callingCards.filter((c) => !c.archived);
  fill(D.callingCards, active.map((c) => ccMock(c, s)));
  fill(CALLING_CARDS, active.map((c) => ccPkg5(c, s)));
  fill(CALLING_ARCHIVED, s.callingCards.filter((c) => c.archived).map((c) => ccPkg5(c, s)));
  const today = dayKey(new Date());
  const wg = s.weeklyGoals.find((g) => g.weekStart <= today && today <= g.weekEnd);
  D.weeklyGoal = wg ? { ...wg } as unknown as Record<string, unknown> : null;
  // 记录（首页简表 + 行动 · 记录页）
  const acts = [...s.activities].sort((a, b) => +new Date(b.date) - +new Date(a.date));
  fill(D.activities, acts.slice(0, 20).map((a) => ({ d: dayKey(a.date), desc: a.description, pts: pts(a.pointsAwarded) })));
  fill(ACTIVITIES, acts.slice(0, 200).map(activityPkg5));
  // 成就 / 技能
  fill(ACHIEVEMENTS, s.achievements.map(achievementPkg5));
  fill(SKILLS, s.skills.map(skillPkg5));
  // 羁绊（离线 + 在线同伴，未归档）
  fill(D.confidants, s.confidants.filter((c) => !c.archivedAt).map(confidantMock));
  // 兼容原 FLOW 读点；真实记账页的完整周期数据由 ledgerLiveBridge 提供。
  const month = today.slice(0, 7);
  fill(FLOW as ReturnType<typeof ledgerRow>[], s.ledgerEntries.filter((e) => e.date.startsWith(month)).sort((a, b) => b.date.localeCompare(a.date)).slice(0, 30).map(ledgerRow));
}

/* ── 订阅：store 变 → 同步 → 通知重渲染 ── */
let version = 0;
const listeners = new Set<() => void>();
const WATCH: (keyof S)[] = ['user', 'attributes', 'activities', 'achievements', 'skills', 'todos', 'todoCompletions', 'callingCards', 'weeklyGoals', 'wishes', 'confidants', 'ledgerEntries', 'settings'];
export const LIVE = {
  start() {
    return useAppStore.subscribe((s, prev) => {
      if (!WATCH.some((k) => s[k] !== prev[k])) return;
      syncLiveDataNow(s);
      version++;
      listeners.forEach((l) => l());
    });
  },
  subscribe(cb: () => void) { listeners.add(cb); return () => { listeners.delete(cb); }; },
  version: () => version,
};

/** 夜间 / 低动效：与正式仓库同口径 */
export function useLiveFlags(): { dark: boolean; lowMotion: boolean } {
  const dark = useAppStore((s) => !!s.settings.darkMode);
  const bold = useBoldness();
  return { dark, lowMotion: !bold };
}
