/**
 * 数据适配层：pkg2
 * 初始状态 = 原样转发 demo 假数据（外观与 demo 完全一致，用来先验收版式）。
 * 接真实数据时：在下面「真实数据覆盖区」写同名导出覆盖掉 mock 的同名导出（ES 规则：本文件显式导出优先于 export *）。
 * 规则：只在这里接 store / utils，不改 screens/ 里的 JSX、className、style、动画。
 */
export * from '../mock/pkg2';

// ───── 真实数据覆盖区（按 INTEGRATE-THEMES.md 第 6 步填写）─────
import { useMemo } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { useAppStore, toLocalDateKey } from '@/store';
import type { AttributeId, PeriodSummary, Quest, Todo, WeeklyGoal, Wish } from '@/types';
import { useActivityImageIndex, MAX_IMAGES_PER_ACTIVITY as REAL_MAX_IMAGES_PER_ACTIVITY } from '@/utils/activityImages';
import { followUpsOf, DEFAULT_SUMMARY_PROMPT_PRESETS } from '@/utils/summaryAI';
import { weekRangeOf } from '@/utils/questBoard';
import { questHint, questProgress, questTitle, questBoardUnlocked, type QuestData } from '@/utils/questBoard';
import {
  addActivityImages as persistActivityImages,
  removeActivityImage as persistRemoveActivityImage,
} from '@/utils/activityImages';
import { db } from '@/db';
import { useLiveQuery } from 'dexie-react-hooks';
import { getAIConfig } from '@/utils/aiClient';
import type { MockSummary } from '../mock/pkg2';

export const TODAY = new Date();
export const TODAY_KEY = toLocalDateKey(TODAY);
export const MAX_IMAGES_PER_ACTIVITY = REAL_MAX_IMAGES_PER_ACTIVITY;

// 暂无对应真实服务的数据出口：保持空态，不把演示内容当成用户数据。
export const ACTIVITIES: import('@/types').Activity[] = [];
export const ACTIVITY_IMAGES: Record<string, string[]> = {};
export const DANMAKU: string[] = [];
export const SCHEDULE_ITEMS: { title: string; weekdays: number[]; time: string; on: boolean }[] = [];
export const TODOS: Todo[] = [];
export const TODO_PROGRESS: Record<string, number> = {};
export const TODAY_DONE = new Set<string>();
export const WISHES: Wish[] = [];
export const BIGDEAL_STEP_LOG: Record<string, { title: string; date: Date }[]> = {};
export const QUESTS: Quest[] = [];
export const QUEST_TITLES: Record<string, { title: string; desc: string; progress: number }> = {};
export const LIFE_QUESTS: { id: string; title: string; desc: string; attr: AttributeId; ai: boolean }[] = [];
export const ORGS: { id: string; name: string; left: number }[] = [];
export const SUMMARIES: MockSummary[] = [];
export const SUMMARY_BODY = '';
export const SUMMARIES_EMPTY: MockSummary[] = SUMMARIES;
export const WISH_TIMES: Record<string, number> = {};

const EMPTY_ATTR_POINTS = (): Record<AttributeId, number> => ({
  knowledge: 0, guts: 0, dexterity: 0, kindness: 0, charm: 0,
});

export const KEYWORD_RESULT = EMPTY_ATTR_POINTS();

const emptyWeek = weekRangeOf(TODAY);
export const WEEKLY_GOAL: WeeklyGoal = {
  id: '',
  weekStart: emptyWeek.days[0],
  weekEnd: emptyWeek.days[6],
  goals: [],
  reward: '',
  completed: false,
  createdAt: new Date(0),
};

export function useActionAttributes() {
  const attributeNames = useAppStore((s) => s.settings.attributeNames);
  return useMemo(() => ({
    ATTR_NAMES: { ...attributeNames } as Record<AttributeId, string>,
  }), [attributeNames]);
}

export function useActionsData() {
  const {
    attributes, activities, todos, todoCompletions, wishes, weeklyGoals, summaries, settings,
    battleState,
  } = useAppStore(useShallow((s) => ({
    attributes: s.attributes,
    activities: s.activities,
    todos: s.todos,
    todoCompletions: s.todoCompletions,
    wishes: s.wishes,
    weeklyGoals: s.weeklyGoals,
    summaries: s.summaries,
    settings: s.settings,
    battleState: s.battleState,
  })));
  const getTodayTodoProgress = useAppStore((s) => s.getTodayTodoProgress);
  const getWishRing = useAppStore((s) => s.getWishRing);
  const getWeeklyGoalProgress = useAppStore((s) => s.getWeeklyGoalProgress);
  const getSummaryLabel = useAppStore((s) => s.getSummaryLabel);
  const activityImageIndex = useActivityImageIndex((s) => s.byActivity);
  const todayKey = toLocalDateKey();
  const range = useMemo(() => weekRangeOf(new Date()), [todayKey]);
  const questsRows = useLiveQuery(() => db.quests.where('weekKey').equals(range.weekKey).sortBy('slot'), [range.weekKey]);
  const claimedTotal = useLiveQuery(() => db.quests.filter((q) => !!q.claimedAt).count(), []);
  const questAux = useLiveQuery(async () => {
    const [divinations, images, ledger] = await Promise.all([
      db.dailyDivinations.toArray(),
      db.activityImages.where('createdAt').aboveOrEqual(range.start).toArray(),
      db.ledgerEntries.toArray(),
    ]);
    return { divinations, images, ledger };
  }, [range.weekKey]);

  return useMemo(() => {
    const todayKey = toLocalDateKey();
    const today = new Date();
    const currentWeek = weekRangeOf(today);
    const currentGoal = weeklyGoals.find((g) => g.weekStart === currentWeek.weekKey);
    const attrNames = { ...settings.attributeNames } as Record<AttributeId, string>;
    const todoProgress = Object.fromEntries(todos.map((t) => [t.id, getTodayTodoProgress(t.id).count]));
    const todayDone = new Set(
      todos
        .filter((t) => t.completedAt && toLocalDateKey(new Date(t.completedAt)) === todayKey)
        .map((t) => t.id),
    );
    const wishTimes = Object.fromEntries(wishes.map((w) => [w.id, getWishRing(w.id).times]));
    const activityImages = Object.fromEntries(
      Object.entries(activityImageIndex).map(([id, rows]) => [id, rows.map((r) => r.thumbDataUrl)]),
    );
    const bigDealStepLog = Object.fromEntries(
      todos
        .filter((t): t is Todo & { steps: NonNullable<Todo['steps']> } => !!t.isBigDeal && !!t.steps?.length)
        .map((t) => [
          t.id,
          t.steps
            .filter((step) => step.done && step.doneAt)
            .map((step) => ({ title: step.title, date: new Date(step.doneAt!) })),
        ]),
    );
    const archive: MockSummary[] = summaries
      .map((s: PeriodSummary) => ({
        id: s.id,
        period: s.period,
        label: s.label || getSummaryLabel(s.period, s.startDate),
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
        reqContext: s.reqContext,
        deliberate: s.deliberate,
      }))
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
    const presets = settings.summaryPromptPresets ?? DEFAULT_SUMMARY_PROMPT_PRESETS;
    const weeklyGoal: WeeklyGoal = currentGoal
      ? { ...currentGoal, goals: getWeeklyGoalProgress(currentGoal) }
      : {
        ...WEEKLY_GOAL,
        weekStart: currentWeek.days[0],
        weekEnd: currentWeek.days[6],
        goals: [],
      };
    const quests = questsRows ?? [];
    const questData: QuestData | null = questAux ? {
      activities, todos, completions: todoCompletions, divinations: questAux.divinations,
      images: questAux.images, summaries, ledger: questAux.ledger,
      pacts: [], myId: undefined, battleState, aiReady: !!getAIConfig(settings), now: today,
    } : null;
    const questTitles = questData ? Object.fromEntries(quests.map((q) => [q.id, {
      title: questTitle(q, attrNames), desc: questHint(q),
      progress: Math.min(questProgress(q, questData, range), q.target),
    }])) : {};

    return {
      TODAY: today,
      TODAY_KEY: todayKey,
      attributes,
      ATTR_NAMES: attrNames,
      ACTIVITIES: activities,
      ACTIVITY_IMAGES: activityImages,
      BIGDEAL_STEP_LOG: bigDealStepLog,
      TODOS: todos,
      TODO_PROGRESS: todoProgress,
      TODAY_DONE: todayDone,
      WISHES: wishes,
      WISH_TIMES: wishTimes,
      WISH_AUTO_EVALUATE: settings.wishAutoEvaluate !== false,
      WEEKLY_GOAL: weeklyGoal,
      QUESTS: quests,
      QUEST_TITLES: questTitles,
      LIFE_QUESTS: quests.map((q) => ({ id: q.id, title: questTitle(q, attrNames), desc: questHint(q), attr: q.params?.attribute ?? 'knowledge', ai: false })),
      QUEST_RANGE: range,
      QUEST_UNLOCKED: questBoardUnlocked(activities, today),
      QUEST_CLAIMED_TOTAL: claimedTotal ?? 0,
      FATE_POOL: useAppStore.getState().getFateDrawPool(),
      SUMMARIES: archive,
      SUMMARY_PRESETS: presets.map((p) => p.name),
      KEYWORD_RESULT: EMPTY_ATTR_POINTS(),
    };
  }, [
    attributes, activities, todos, todoCompletions, wishes, weeklyGoals, summaries, settings, battleState,
    activityImageIndex, getTodayTodoProgress, getWishRing, getWeeklyGoalProgress, getSummaryLabel,
    questsRows, questAux, claimedTotal, range,
  ]);
}

export function analyzeActivityLocally(description: string, settings = useAppStore.getState().settings): Record<AttributeId, number> {
  const points = EMPTY_ATTR_POINTS();
  for (const rule of settings.keywordRules ?? []) {
    for (const keyword of rule.keywords) {
      if (description.includes(keyword)) {
        points[rule.attribute] += rule.points;
        break;
      }
    }
  }
  return points;
}

type TodoInput = Omit<Todo, 'id' | 'createdAt'>;
type WishInput = Parameters<ReturnType<typeof useAppStore.getState>['addWish']>[0];
type ActivityInput = Parameters<ReturnType<typeof useAppStore.getState>['addActivity']>[0];

export const actionsOps = {
  addActivity: async (
    description: string,
    points: Record<string, number>,
    important: boolean,
    backdate?: string,
    wishId?: string,
  ) => useAppStore.getState().addActivity(description, points, 'local', {
    important,
    wishId,
    date: backdate ? new Date(`${backdate}T12:00:00`) : undefined,
  }),
  deleteActivity: (id: string, rollback: boolean) =>
    rollback
      ? useAppStore.getState().deleteActivity(id)
      : useAppStore.getState().deleteActivityRecordOnly(id),
  addTodo: (todo: TodoInput) => useAppStore.getState().addTodo(todo),
  updateTodo: (id: string, patch: Partial<Todo>) => useAppStore.getState().updateTodo(id, patch),
  deleteTodo: (id: string) => useAppStore.getState().deleteTodo(id),
  completeTodo: (id: string) => useAppStore.getState().completeTodo(id),
  undoTodayTodoCompletion: (id: string) => useAppStore.getState().undoTodayTodoCompletion(id),
  addTodoStep: (todoId: string, title: string, source: 'manual' | 'ai' = 'manual') =>
    useAppStore.getState().addTodoStep(todoId, title, { source }),
  updateTodoStep: (todoId: string, stepId: string, patch: { title?: string; attribute?: AttributeId }) =>
    useAppStore.getState().updateTodoStep(todoId, stepId, patch),
  removeTodoStep: (todoId: string, stepId: string) =>
    useAppStore.getState().removeTodoStep(todoId, stepId),
  completeTodoStep: (todoId: string, stepId: string) =>
    useAppStore.getState().completeTodoStep(todoId, stepId),
  undoTodoStep: (todoId: string, stepId: string) =>
    useAppStore.getState().undoTodoStep(todoId, stepId),
  collapseBigDeal: (todoId: string) => useAppStore.getState().collapseBigDeal(todoId),
  rebuildBigDeal: (todoId: string) => useAppStore.getState().rebuildBigDeal(todoId),
  decomposeBigDealAI: (todoId: string) => useAppStore.getState().decomposeBigDealAI(todoId),
  addWish: (input: WishInput) => useAppStore.getState().addWish(input),
  saveWish: (wish: Wish) => useAppStore.getState().saveWish(wish),
  deleteWish: (id: string) => useAppStore.getState().deleteWish(id),
  setWishStatus: (id: string, status: Wish['status']) => useAppStore.getState().setWishStatus(id, status),
  fulfillWish: (id: string) => useAppStore.getState().fulfillWish(id),
  addWishStep: (wishId: string, title: string, source: 'manual' | 'ai' = 'manual') =>
    useAppStore.getState().addWishStep(wishId, title, { source }),
  toggleWishStep: (wishId: string, stepId: string) =>
    useAppStore.getState().toggleWishStep(wishId, stepId),
  removeWishStep: (wishId: string, stepId: string) =>
    useAppStore.getState().removeWishStep(wishId, stepId),
  setWishProgress: (wishId: string, pct: number, source: Wish['progressSource'] = 'manual') =>
    useAppStore.getState().setWishProgress(wishId, pct, { source }),
  evaluateWishProgress: (wishId: string) => useAppStore.getState().evaluateWishProgress(wishId),
  decomposeWishStepsAI: (wishId: string) => useAppStore.getState().decomposeWishStepsAI(wishId),
  decomposeWishAI: (parent: Wish) => useAppStore.getState().decomposeWishAI(parent),
  setWishAutoEvaluate: (enabled: boolean) => useAppStore.getState().updateSettings({ wishAutoEvaluate: enabled }),
  saveWeeklyGoal: (goal: WeeklyGoal) => useAppStore.getState().saveWeeklyGoal(goal),
  deleteWeeklyGoal: (id: string) => useAppStore.getState().deleteWeeklyGoal(id),
  completeWeeklyGoal: (id: string, attribute: AttributeId) =>
    useAppStore.getState().completeWeeklyGoal(id, attribute),
  addActivityImages: persistActivityImages,
  removeActivityImage: persistRemoveActivityImage,
  removeActivityImageAt: async (activityId: string, index: number) => {
    const row = useActivityImageIndex.getState().byActivity[activityId]?.[index];
    if (row) await persistRemoveActivityImage(row.id);
  },
  refreshQuests: () => useAppStore.getState().refreshQuests(),
  claimQuest: (id: string) => useAppStore.getState().claimQuest(id),
  swapQuest: (id: string) => useAppStore.getState().swapQuest(id),
  drawFate: (pool?: Parameters<ReturnType<typeof useAppStore.getState>['drawFate']>[0]) => useAppStore.getState().drawFate(pool),
  acceptFateDraw: (candidate: Parameters<ReturnType<typeof useAppStore.getState>['acceptFateDraw']>[0]) => useAppStore.getState().acceptFateDraw(candidate),
  muteFateHistory: (candidate: Parameters<ReturnType<typeof useAppStore.getState>['muteFateHistory']>[0]) => useAppStore.getState().muteFateHistory(candidate),
};

export type { TodoInput, WishInput };
