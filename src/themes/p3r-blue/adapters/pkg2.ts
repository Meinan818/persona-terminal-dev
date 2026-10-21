/**
 * 数据适配层：pkg2
 * 行动页真实数据适配：静态导出只保留设计常量和真实空态；
 * 会变化的数据统一通过 useActionsData() 从 useAppStore / IndexedDB / 现有服务读取。
 */
export * from '../mock/pkg2';

// ───── 真实数据覆盖区（按 INTEGRATE-THEMES.md 第 6 步填写）─────
import { useMemo } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { useShallow } from 'zustand/react/shallow';
import { db } from '@/db';
import { useAppStore, toLocalDateKey, DEFAULT_SUMMARY_PROMPT_PRESETS } from '@/store';
import { useCloudStore } from '@/store/cloud';
import { useCloudSocialStore } from '@/store/cloudSocial';
import { getAIConfig } from '@/utils/aiClient';
import { analyzeActivityAI } from '@/utils/activityAI';
import { MAX_IMAGES_PER_ACTIVITY } from '@/utils/activityImages';
import { getCurrentWeekRange } from '@/components/weeklyGoal/weeklyGoalShared';
import { QUEST_TEMPLATE_IDS, QUEST_TEMPLATES, questHint, questProgress, questTitle, questBoardUnlocked, weekRangeOf, type QuestData } from '@/utils/questBoard';
import { followUpsOf, summaryKindOf } from '@/utils/summaryAI';
import { ATTR_EN as MOCK_ATTR_EN } from '../mock/pkg2';
import type {
  Activity,
  ActivityImage,
  AttributeId,
  CallingCard,
  FateCandidate,
  PeriodSummary,
  Quest,
  Todo,
  WeeklyGoal,
  Wish,
} from '@/types';
import type { TodoForm } from '@blue/screens/overlays/TodoFormSheet.p3r';

export const TODAY = new Date();
export const dayKey = toLocalDateKey;
export const ATTR_IDS: AttributeId[] = ['knowledge', 'guts', 'dexterity', 'kindness', 'charm'];
export { MAX_IMAGES_PER_ACTIVITY };

// 未接的真实来源一律返回空态，不继续转发 mock。
export const ACTIVITIES: Activity[] = [];
export const ACTIVITY_IMAGES: Record<string, string[]> = {};
export const SPARE_IMAGES: string[] = [];
export const BIGDEAL_STEP_LOG: Record<string, { title: string; date: Date }[]> = {};
export const TODOS: Todo[] = [];
export const TODO_PROGRESS: Record<string, number> = {};
export const TODAY_DONE = new Set<string>();
export const WISHES: Wish[] = [];
export const WISH_TIMES: Record<string, number> = {};
const emptyWeek = weekRangeOf(TODAY);
export const WEEKLY_GOAL: WeeklyGoal = {
  id: '',
  weekStart: emptyWeek.weekKey,
  weekEnd: emptyWeek.days[6],
  goals: [],
  reward: '',
  completed: false,
  createdAt: new Date(0),
};
export const CALLING_CARDS: CallingCard[] = [];
export const QUESTS: Quest[] = [];
export const QUEST_TITLES: Record<string, { title: string; desc: string; progress: number }> = {};
export const LIFE_QUESTS: Array<{ id: string; title: string; desc: string; attr: AttributeId; ai: boolean }> = [];
export const ORGS: Array<{ id: string; name: string; left: number }> = [];
export const SUMMARIES: MockSummary[] = [];
export const SUMMARY_BODY = '';
export const SUMMARY_PRESETS: string[] = DEFAULT_SUMMARY_PROMPT_PRESETS.map((p) => p.name);
export const DANMAKU: string[] = [];
export const SCHEDULE_ITEMS: Array<{ title: string; weekdays: number[]; time: string; on: boolean }> = [];
export const KEYWORD_RESULT: Record<AttributeId, number> = { knowledge: 0, guts: 0, dexterity: 0, kindness: 0, charm: 0 };
export const TODAY_KEY = toLocalDateKey();

export interface MockSummary {
  id: string;
  period: 'week' | 'month' | 'year';
  label: string;
  startDate: string;
  endDate: string;
  totalPoints: number;
  activityCount: number;
  promptPresetName: string;
  autoWritten?: boolean;
  viewed?: boolean;
  createdAt: Date;
  followUps: number;
  body: string;
  deliberate?: boolean;
  question?: string;
  content: string;
}

const summaryToView = (s: PeriodSummary): MockSummary => ({
  id: s.id,
  period: summaryKindOf(s),
  label: s.label,
  startDate: s.startDate,
  endDate: s.endDate,
  totalPoints: s.totalPoints,
  activityCount: s.activityCount,
  promptPresetName: s.promptPresetName,
  autoWritten: s.autoWritten,
  viewed: !!s.viewedAt,
  createdAt: new Date(s.createdAt),
  followUps: followUpsOf(s).length,
  body: s.content,
  content: s.content,
  deliberate: s.deliberate,
  question: s.question,
});

export function useActionsData() {
  const {
    activities,
    todos,
    todoCompletions,
    wishes,
    weeklyGoals,
    callingCards,
    summaries,
    settings,
    battleState,
    attributes,
    questNotice,
  } = useAppStore(useShallow((s) => ({
    activities: s.activities,
    todos: s.todos,
    todoCompletions: s.todoCompletions,
    wishes: s.wishes,
    weeklyGoals: s.weeklyGoals,
    callingCards: s.callingCards,
    summaries: s.summaries,
    settings: s.settings,
    battleState: s.battleState,
    attributes: s.attributes,
    questNotice: s.questNotice,
  })));
  const getTodayTodoProgress = useAppStore((s) => s.getTodayTodoProgress);
  const getWishProgress = useAppStore((s) => s.getWishProgress);
  const getWeeklyGoalProgress = useAppStore((s) => s.getWeeklyGoalProgress);
  const pacts = useCloudSocialStore((s) => s.pacts);
  const myId = useCloudStore((s) => s.cloudUser?.id);
  const today = new Date();
  const todayKey = toLocalDateKey(today);
  const range = useMemo(() => weekRangeOf(today), [todayKey]);
  const currentWeek = getCurrentWeekRange();
  const quests = useLiveQuery(() => db.quests.where('weekKey').equals(range.weekKey).sortBy('slot'), [range.weekKey]);
  const claimedTotal = useLiveQuery(() => db.quests.filter((q) => !!q.claimedAt).count(), []);
  const activityImageRows = useLiveQuery(() => db.activityImages.orderBy('createdAt').toArray(), []);
  const questAux = useLiveQuery(async () => {
    const [divinations, images, ledger] = await Promise.all([
      db.dailyDivinations.toArray(),
      db.activityImages.where('createdAt').aboveOrEqual(range.start).toArray(),
      db.ledgerEntries.toArray(),
    ]);
    return { divinations, images, ledger };
  }, [range.weekKey]);

  return useMemo(() => {
    const attrNames = { ...settings.attributeNames } as Record<AttributeId, string>;
    const activityImages = (activityImageRows ?? []).reduce<Record<string, string[]>>((map, row: ActivityImage) => {
      (map[row.activityId] ??= []).push(row.thumbDataUrl);
      return map;
    }, {});
    const bigDealStepLog = activities.reduce<Record<string, { title: string; date: Date }[]>>((map, a) => {
      if (a.category !== 'bigdeal_step' || !a.bigDealId) return map;
      (map[a.bigDealId] ??= []).push({ title: a.description, date: new Date(a.date) });
      return map;
    }, {});
    const todoProgress = Object.fromEntries(todos.map((t) => [t.id, getTodayTodoProgress(t.id).count]));
    const todayDone = new Set(todos.filter((t) => t.completedAt && toLocalDateKey(new Date(t.completedAt)) === todayKey).map((t) => t.id));
    const wishTimes = Object.fromEntries(wishes.map((w) => [w.id, getWishProgress(w.id)]));
    const currentGoal = weeklyGoals.find((g) => g.weekStart === currentWeek.weekStart && g.weekEnd === currentWeek.weekEnd) ?? null;
    const weeklyGoal = currentGoal ? { ...currentGoal, goals: getWeeklyGoalProgress(currentGoal) } : null;
    const auxReady = !!questAux;
    const questData: QuestData | null = auxReady ? {
      activities,
      todos,
      completions: todoCompletions,
      divinations: questAux.divinations,
      images: questAux.images,
      summaries,
      ledger: questAux.ledger,
      pacts,
      myId,
      battleState,
      aiReady: !!getAIConfig(settings),
      now: today,
    } : null;
    const realQuests = quests ?? [];
    const questTitles = questData ? Object.fromEntries(realQuests.map((q) => [q.id, {
      title: questTitle(q, attrNames),
      desc: questHint(q),
      progress: Math.min(questProgress(q, questData, range), q.target),
    }])) : {};
    const summaryViews = summaries.map(summaryToView);
    const presetNames = [
      ...DEFAULT_SUMMARY_PROMPT_PRESETS.map((p) => p.name),
      ...(settings.summaryPromptPresets ?? []).map((p) => p.name),
    ].filter((name, i, all) => !!name && all.indexOf(name) === i);
    return {
      ACTIVITIES: activities,
      ACTIVITY_IMAGES: activityImages,
      SPARE_IMAGES: Object.values(activityImages).flat().slice(0, 8),
      BIGDEAL_STEP_LOG: bigDealStepLog,
      TODOS: todos,
      TODO_PROGRESS: todoProgress,
      TODAY_DONE: todayDone,
      WISHES: wishes,
      WISH_TIMES: wishTimes,
      WEEKLY_GOAL: weeklyGoal,
      WEEK_RANGE: currentWeek,
      CALLING_CARDS: callingCards,
      QUESTS: realQuests,
      QUEST_TITLES: questTitles,
      QUEST_UNLOCKED: questBoardUnlocked(activities, today),
      QUEST_RANGE: range,
      QUEST_CLAIMED_TOTAL: claimedTotal ?? 0,
      QUEST_NOTICE: questNotice,
      LIFE_QUESTS: QUEST_TEMPLATE_IDS.filter((id) => id !== 'life_3').slice(0, 3).map((id, i) => ({
        id,
        title: QUEST_TEMPLATES[id].hint,
        desc: QUEST_TEMPLATES[id].hint,
        attr: ATTR_IDS[i % ATTR_IDS.length],
        ai: false,
      })),
      SUMMARIES: summaryViews,
      SUMMARY_PRESETS: presetNames,
      SUMMARY_SETTINGS: settings,
      DANMAKU: [],
      SCHEDULE_ITEMS: [],
      KEYWORD_RESULT: { ...KEYWORD_RESULT },
      ATTR_IDS,
      ATTR_NAMES: attrNames,
      ATTR_EN: MOCK_ATTR_EN,
      TODAY: today,
      TODAY_KEY: todayKey,
      ATTRIBUTES: attributes,
      ORGS: [],
      FATE_POOL: useAppStore.getState().getFateDrawPool(),
      ACTIONS_LOADED: !!quests && !!activityImageRows && auxReady,
    };
  }, [activities, todos, todoCompletions, wishes, weeklyGoals, callingCards, summaries, settings, battleState, attributes, questNotice, activityImageRows, questAux, quests, claimedTotal, pacts, myId, getTodayTodoProgress, getWishProgress, getWeeklyGoalProgress, range, todayKey, currentWeek.weekStart, currentWeek.weekEnd]);
}

const pointsFromText = (description: string, rules: ReturnType<typeof useAppStore.getState>['settings']['keywordRules']) => {
  const points: Record<AttributeId, number> = { ...KEYWORD_RESULT };
  for (const rule of rules) {
    for (const keyword of rule.keywords) {
      if (description.includes(keyword)) {
        points[rule.attribute] += rule.points;
        break;
      }
    }
  }
  return points;
};

export const actionsOps = {
  addActivity: async (p: { description: string; points: Record<AttributeId, number>; important: boolean; backdate?: string; wishId?: string }) => {
    const date = p.backdate ? new Date(`${p.backdate}T21:00:00`) : new Date();
    const result = await useAppStore.getState().addActivity(p.description, p.points, 'local', {
      important: p.important,
      wishId: p.wishId,
      date,
    });
    if (p.backdate && result.activityId) {
      await db.activities.update(result.activityId, {});
      await useAppStore.getState().loadData();
    }
    return result;
  },
  deleteActivity: (id: string) => useAppStore.getState().deleteActivity(id),
  deleteActivityRecordOnly: (id: string) => useAppStore.getState().deleteActivityRecordOnly(id),
  analyzeText: (description: string) => pointsFromText(description, useAppStore.getState().settings.keywordRules),
  analyzeTextAI: (description: string, signal?: AbortSignal) => {
    const s = useAppStore.getState().settings;
    return analyzeActivityAI(description, s.attributeNames, s, signal);
  },
  saveTodo: (f: TodoForm, id?: string) => {
    const patch: Partial<Todo> = {
      title: f.title.trim(),
      attribute: f.attribute,
      points: f.points,
      frequency: f.mode === 'count' ? 'count' : 'single',
      targetCount: f.targetCount,
      important: f.important,
      repeatDaily: f.repeatDaily,
      isLongTerm: f.isLongTerm,
      isBigDeal: f.mode === 'big',
      steps: f.mode === 'big' ? f.steps : undefined,
      deadline: f.deadline || undefined,
      weekdays: f.weekdays,
      isActive: f.isActive,
      startDate: f.startDate || undefined,
      extraBoosts: f.extraBoosts,
      currentState: f.currentState || undefined,
      wishId: f.wishId,
    };
    return id
      ? useAppStore.getState().updateTodo(id, patch)
      : useAppStore.getState().addTodo({
        title: patch.title!,
        attribute: patch.attribute!,
        points: patch.points!,
        frequency: patch.frequency!,
        targetCount: patch.targetCount,
        important: patch.important,
        repeatDaily: patch.repeatDaily,
        isLongTerm: patch.isLongTerm,
        isBigDeal: patch.isBigDeal,
        steps: patch.steps,
        deadline: patch.deadline,
        weekdays: patch.weekdays,
        isActive: patch.isActive!,
        startDate: patch.startDate,
        extraBoosts: patch.extraBoosts,
        currentState: patch.currentState,
        wishId: patch.wishId,
      });
  },
  updateTodo: (id: string, patch: Partial<Todo>) => useAppStore.getState().updateTodo(id, patch),
  deleteTodo: (id: string) => useAppStore.getState().deleteTodo(id),
  completeTodo: (id: string) => useAppStore.getState().completeTodo(id),
  undoTodayTodoCompletion: (id: string) => useAppStore.getState().undoTodayTodoCompletion(id),
  completeTodoStep: (todoId: string, stepId: string) => useAppStore.getState().completeTodoStep(todoId, stepId),
  undoTodoStep: (todoId: string, stepId: string) => useAppStore.getState().undoTodoStep(todoId, stepId),
  addTodoStep: (todoId: string, title: string, source: 'manual' | 'ai' = 'manual') => useAppStore.getState().addTodoStep(todoId, title, { source }),
  removeTodoStep: (todoId: string, stepId: string) => useAppStore.getState().removeTodoStep(todoId, stepId),
  collapseBigDeal: (todoId: string) => useAppStore.getState().collapseBigDeal(todoId),
  rebuildBigDeal: (todoId: string) => useAppStore.getState().rebuildBigDeal(todoId),
  decomposeBigDealAI: (todoId: string) => useAppStore.getState().decomposeBigDealAI(todoId),
  decomposeDraftAI: (title: string, currentState?: string, existing: string[] = []) => {
    const now = new Date();
    return useAppStore.getState().decomposeWishAI(
      { id: `draft-${now.getTime()}`, title: title.trim(), currentState, status: 'active', source: 'manual', createdAt: now },
      existing.map((t, i) => ({ id: `draft-step-${i}`, title: t, status: 'active' as const, source: 'manual' as const, createdAt: now })),
    );
  },
  addWish: (title: string) => useAppStore.getState().addWish({ title: title.trim(), source: 'manual' }),
  deleteWish: (id: string) => useAppStore.getState().deleteWish(id),
  setWishStatus: (id: string, status: Wish['status']) => useAppStore.getState().setWishStatus(id, status),
  fulfillWish: (id: string) => useAppStore.getState().fulfillWish(id),
  saveWish: (w: Wish) => useAppStore.getState().saveWish(w),
  addWishStep: (wishId: string, title: string, source: 'manual' | 'ai' = 'manual') => useAppStore.getState().addWishStep(wishId, title, { source }),
  toggleWishStep: (wishId: string, stepId: string) => useAppStore.getState().toggleWishStep(wishId, stepId),
  removeWishStep: (wishId: string, stepId: string) => useAppStore.getState().removeWishStep(wishId, stepId),
  decomposeWishStepsAI: (wishId: string) => useAppStore.getState().decomposeWishStepsAI(wishId),
  evaluateWishProgress: (wishId: string) => useAppStore.getState().evaluateWishProgress(wishId, { allowDecrease: true }),
  setWishProgress: (wishId: string, pct: number) => useAppStore.getState().setWishProgress(wishId, pct, { source: 'manual' }),
  saveWeeklyGoal: (goal: WeeklyGoal) => useAppStore.getState().saveWeeklyGoal(goal),
  deleteWeeklyGoal: (id: string) => useAppStore.getState().deleteWeeklyGoal(id),
  completeWeeklyGoal: (id: string, attr: AttributeId) => useAppStore.getState().completeWeeklyGoal(id, attr),
  refreshQuests: () => useAppStore.getState().refreshQuests(),
  claimQuest: (id: string) => useAppStore.getState().claimQuest(id),
  swapQuest: (id: string) => useAppStore.getState().swapQuest(id),
  clearQuestNotice: () => useAppStore.getState().clearQuestNotice(),
  drawFate: (pool?: FateCandidate[]) => useAppStore.getState().drawFate(pool),
  acceptFateDraw: (candidate: FateCandidate) => useAppStore.getState().acceptFateDraw(candidate),
  muteFateHistory: (candidate: FateCandidate) => useAppStore.getState().muteFateHistory(candidate),
  saveSummary: (summary: PeriodSummary) => useAppStore.getState().saveSummary(summary),
  deleteSummary: (id: string) => useAppStore.getState().deleteSummary(id),
  markSummaryViewed: (id: string) => useAppStore.getState().markSummaryViewed(id),
  updateSettings: (patch: Partial<ReturnType<typeof useAppStore.getState>['settings']>) => useAppStore.getState().updateSettings(patch),
};
