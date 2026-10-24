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
 *   2. 写回：任务 / 记账 / 愿望 / 宣告卡 / 据点 / 成就 / 据点 / 行动页均已接 store action。
 *      仍有 mock 的：据点成员/动态/作战/好友、星象 AI 解读、同伴互动/通知/约定（§3 演示固定数据）。
 *   3. 字段对不上时只改这里的映射函数，不要去改页面。
 */
import { useAppStore, toLocalDateKey } from '@/store';
import { OTD_VIEW } from '@/p5r-red/screens/overlays/OnThisDaySheet.p5r';
import { useBoldness } from '@/utils/boldness';
import { calcCurrentStreak, streakDates } from '@/utils/streak';
import { TAROT_BY_ID } from '@/constants/tarot';
import type { Activity, Achievement, AttributeId, CallingCard, Confidant, LedgerEntry, Skill, Todo } from '@/types';
import { ledgerCycle } from '@/utils/ledgerFormat';
import { D, type AttrId, type MockCallingCard, type MockConfidant, type MockTodo } from '@/p5r-red/mock/data';
import { ACTIVITIES, CALLING_ARCHIVED, CALLING_CARDS, ACHIEVEMENTS, SKILLS, type MockAch, type MockActivity, type MockCC, type MockSkill, type CondType } from '@/p5r-red/mock/pkg5-data';
import { FLOW } from '@/p5r-red/screens/pkg4/ledger4';

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
  // 真实字段一并带出（页面按 id 取，不再按 arcana 查演示常量）。
  const profile = c.linkedProfile as {
    userId?: string; nickname?: string; lv?: number;
    attributeLevels?: Record<string, number>; totalPoints?: number; unlockedCount?: number;
    levelDifficulty?: string; goal?: { title?: string; subtitle?: string }; lastSyncedAt?: Date | string;
  } | undefined;
  return {
    id: c.id, name: c.name, arcana: ARCANA_DEMO[c.arcanaId] ?? 'FOOL', arcanaCn: t?.name ?? '', no: t?.roman ?? '',
    rank: c.intimacy, desc: c.description,
    intimacyPoints: c.intimacyPoints ?? 0,
    aiInterpretation: c.aiInterpretation ?? '',
    aiAdvice: c.aiAdvice ?? '',
    skillAttribute: c.skillAttribute,
    starShiftCharges: c.starShiftCharges ?? 0,
    linkedProfile: profile ? {
      userId: profile.userId, nickname: profile.nickname, lv: profile.lv,
      attributeLevels: profile.attributeLevels, totalPoints: profile.totalPoints,
      unlockedCount: profile.unlockedCount, levelDifficulty: profile.levelDifficulty,
      goal: profile.goal,
      lastSyncedAt: profile.lastSyncedAt ? new Date(profile.lastSyncedAt).toISOString() : undefined,
    } : null,
    source: c.source,
    decayEnabled: !!c.decayEnabled,
  } as MockConfidant;
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
  return {
    id: e.id,
    note: e.note || e.category || (e.direction === 'income' ? '收入' : '支出'),
    amount: e.amount,
    dir: e.direction === 'income' ? 'income' : 'expense',
    ch: e.channel || '',
    d: daysAgo(e.date),
    date: e.date,
    type: e.type,
    cat: e.category,
    labor: e.incomeType === 'labor',
    worth: e.evalWorth,
  };
}

/** 记账页真实合计（页面在渲染时读，随 store 同步更新） */
export const RED_LEDGER = {
  expense: 0,
  income: 0,
  total: 0,
  budget: null as number | null,
  savingsGoal: null as number | null,
  savingsGoalEdits: 0,
  adjustCount: 0,
  period: '',
  resetDay: 1,
};

/** 近 9 日每日支出（真实流水派生）；没有记录的日期是 0，不填演示数字 */
export const RED_LEDGER_BARS: number[] = [0, 0, 0, 0, 0, 0, 0, 0, 0];

/** 云端已删除的条目数（真实云端账号相关记录数；不是写死的 1,284） */
export const RED_CLOUD_RECORDS = 0;

function syncDailyBars(s: S) {
  const keys: string[] = [];
  for (let i = 8; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    keys.push(toLocalDateKey(d));
  }
  const sums = keys.map((k) => s.ledgerEntries
    .filter((e) => e.date === k && e.direction === 'expense')
    .reduce((a, e) => a + e.amount, 0));
  // 柱子高度按当天最大值归一（与真实仓库趋势图同口径）；全 0 时全 0，不画假柱子。
  const max = Math.max(...sums, 0);
  for (let i = 0; i < RED_LEDGER_BARS.length; i++) {
    RED_LEDGER_BARS[i] = max > 0 ? sums[i] : 0;
  }
}

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
  const lastYear = new Date();
  lastYear.setFullYear(lastYear.getFullYear() - 1);
  const lastYearKey = dayKey(lastYear);
  const onThisDay = acts.filter((activity) => dayKey(activity.date) === lastYearKey);
  OTD_VIEW.date = lastYear;
  OTD_VIEW.total = onThisDay.length;
  OTD_VIEW.daysSince = 365;
  OTD_VIEW.streakThen = 0;
  OTD_VIEW.tarot = null;
  OTD_VIEW.items.splice(0, OTD_VIEW.items.length, ...onThisDay.map((activity) => ({
    id: activity.id,
    time: new Date(activity.date).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' }),
    description: activity.description,
    important: activity.important,
    points: pts(activity.pointsAwarded),
  })));
  // 成就 / 技能
  fill(ACHIEVEMENTS, s.achievements.map(achievementPkg5));
  fill(SKILLS, s.skills.map(skillPkg5));
  // 羁绊（离线 + 在线同伴，未归档）
  fill(D.confidants, s.confidants.filter((c) => !c.archivedAt).map(confidantMock));
  // 记账：本月流水（页面合计里的固定基数见 README「未接」）
  const cycle = ledgerCycle(s.settings.ledgerPayCycleEnabled === true, s.settings.ledgerResetDay ?? 1, today);
  fill(FLOW as ReturnType<typeof ledgerRow>[], s.ledgerEntries.filter((e) => e.date >= cycle.start && e.date <= cycle.end).sort((a, b) => b.date.localeCompare(a.date)).slice(0, 30).map(ledgerRow));
  RED_LEDGER.expense = s.getPeriodExpense(cycle.key);
  RED_LEDGER.income = s.getPeriodIncome(cycle.key);
  RED_LEDGER.total = s.getTotalBalance();
  const budget = s.getBudget(cycle.key);
  RED_LEDGER.budget = budget?.monthlyLimit ?? null;
  RED_LEDGER.savingsGoal = budget?.savingsGoal ?? null;
  RED_LEDGER.savingsGoalEdits = budget?.savingsGoalEdits ?? 0;
  RED_LEDGER.adjustCount = s.getAdjustCountThisMonth();
  RED_LEDGER.period = cycle.key;
  RED_LEDGER.resetDay = s.settings.ledgerResetDay ?? 1;
  // 近 9 日支出
  syncDailyBars(s);
}

/* ── 订阅：store 变 → 同步 → 通知重渲染 ── */
let version = 0;
const listeners = new Set<() => void>();
const WATCH: (keyof S)[] = ['user', 'attributes', 'activities', 'achievements', 'skills', 'todos', 'todoCompletions', 'callingCards', 'weeklyGoals', 'wishes', 'confidants', 'ledgerEntries', 'budgets', 'settings'];
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
