/**
 * 数据适配层：pkg2
 * 初始状态 = 原样转发 demo 假数据（外观与 demo 完全一致，用来先验收版式）。
 * 接真实数据时：在下面「真实数据覆盖区」写同名导出覆盖掉 mock 的同名导出（ES 规则：本文件显式导出优先于 export *）。
 * 规则：只在这里接 store / utils，不改 screens/ 里的 JSX、className、style、动画。
 */
export * from '../mock/pkg2';

// ───── 真实数据覆盖区（按 INTEGRATE-THEMES.md 第 6 步填写）─────

import { useEffect, useMemo } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { useAppStore, toLocalDateKey } from '@/store';
import type { Activity, ActivityImage, AttributeId, FateCandidate, PeriodSummary, Quest, Todo, Wish } from '@/types';
import { DEFAULT_SUMMARY_PROMPT_PRESETS, summaryKindOf } from '@/utils/summaryAI';
import { weekRangeOf } from '@/utils/questBoard';
import { MAX_IMAGES_PER_ACTIVITY, loadActivityImageIndex, useActivityImageIndex } from '@/utils/activityImages';
import { analyzeActivityAI } from '@/utils/activityAI';
import type { MockSummary } from '../mock/pkg2';

export { TODAY_KEY } from './callingCards';

export const TODAY = new Date();
export const ATTR_IDS: AttributeId[] = ['knowledge', 'guts', 'dexterity', 'kindness', 'charm'];
export const ATTR_EN: Record<AttributeId, string> = {
  knowledge: 'KNOWLEDGE',
  guts: 'COURAGE',
  dexterity: 'DILIGENCE',
  kindness: 'UNDERSTANDING',
  charm: 'EXPRESSION',
};
export const ATTR_NAMES: Record<AttributeId, string> = {
  knowledge: '知识',
  guts: '胆量',
  dexterity: '灵巧',
  kindness: '温柔',
  charm: '魅力',
};
export { MAX_IMAGES_PER_ACTIVITY };

const EMPTY_POINTS: Record<AttributeId, number> = { knowledge: 0, guts: 0, dexterity: 0, kindness: 0, charm: 0 };
const week = weekRangeOf(new Date());
const weekEnd = new Date(week.start);
weekEnd.setDate(weekEnd.getDate() + 6);
const emptyWeeklyGoal = {
  id: 'current-week-empty',
  weekStart: week.weekKey,
  weekEnd: toLocalDateKey(weekEnd),
  goals: [],
  reward: '',
  completed: false,
  createdAt: new Date(),
};

// Module constants remain only for demo deep-links / non-store fallbacks. Production paths use useActionsData().
export const ACTIVITIES: Activity[] = [];
export const ACTIVITY_IMAGES: Record<string, string[]> = {};
export const SPARE_IMAGES: string[] = [];
export const BIGDEAL_STEP_LOG: Record<string, { title: string; date: Date }[]> = {};
export const TODOS: Todo[] = [];
export const TODO_PROGRESS: Record<string, number> = {};
export const TODAY_DONE = new Set<string>();
export const WISHES: Wish[] = [];
export const WISH_TIMES: Record<string, number> = {};
export const WEEKLY_GOAL = emptyWeeklyGoal;
export const CALLING_CARDS = [];
export const QUESTS: Quest[] = [];
export const QUEST_TITLES: Record<string, { title: string; desc: string; progress: number }> = {};
export const LIFE_QUESTS: Array<{ id: string; title: string; desc: string; attr: AttributeId; ai: boolean }> = [];
export const ORGS: Array<{ id: string; name: string; left: number }> = [];
export const SUMMARY_BODY = '';
export const SUMMARIES: MockSummary[] = [];
export const SUMMARY_PRESETS = DEFAULT_SUMMARY_PROMPT_PRESETS.map((preset) => preset.name);
export const DANMAKU: string[] = [];
export const SCHEDULE_ITEMS: Array<{ title: string; weekdays: number[]; time: string; on: boolean }> = [];
export const KEYWORD_RESULT = { ...EMPTY_POINTS };

const toSummaryView = (summary: PeriodSummary): MockSummary => ({
  id: summary.id,
  period: summaryKindOf(summary),
  label: summary.label,
  startDate: summary.startDate,
  endDate: summary.endDate,
  totalPoints: summary.totalPoints,
  activityCount: summary.activityCount,
  promptPresetName: summary.promptPresetName,
  autoWritten: summary.autoWritten,
  viewed: !!summary.viewedAt,
  createdAt: new Date(summary.createdAt),
  followUps: (summary.followUps?.length ?? 0) + (summary.followUp ? 1 : 0),
  body: summary.content,
  deliberate: summary.deliberate,
});

export function useActionsData() {
  const { activities, todos, todoCompletions, wishes, weeklyGoals, summaries, callingCards, settings, attributes } = useAppStore(useShallow((s) => ({
    activities: s.activities,
    todos: s.todos,
    todoCompletions: s.todoCompletions,
    wishes: s.wishes,
    weeklyGoals: s.weeklyGoals,
    summaries: s.summaries,
    callingCards: s.callingCards,
    settings: s.settings,
    attributes: s.attributes,
  })));
  const imageRows = useActivityImageIndex((s) => s.byActivity);
  const wishProgressCut = useAppStore((s) => s.wishProgressCut);
  const getTodayTodoProgress = useAppStore((s) => s.getTodayTodoProgress);
  const getWishProgress = useAppStore((s) => s.getWishProgress);
  const getWeeklyGoalProgress = useAppStore((s) => s.getWeeklyGoalProgress);
  const todayKey = toLocalDateKey();

  useEffect(() => {
    const s = useAppStore.getState();
    if (!s.user) return;
    void loadActivityImageIndex();
    if (!s.wishes.length) void s.loadWishes();
    if (!s.summaries.length) void s.loadSummaries();
    if (!s.callingCards.length) void s.loadCallingCards();
  }, []);

  return useMemo(() => {
    const attrNames = { ...ATTR_NAMES, ...settings.attributeNames };
    const progress = Object.fromEntries(todos.map((todo) => [todo.id, getTodayTodoProgress(todo.id).count])) as Record<string, number>;
    const doneToday = new Set(todoCompletions.filter((c) => c.date === todayKey && c.count > 0).map((c) => c.todoId));
    const wishTimes = Object.fromEntries(wishes.filter((wish) => !wish.parentId).map((wish) => [wish.id, getWishProgress(wish.id)]));
    const images = Object.fromEntries(Object.entries(imageRows).map(([activityId, rows]) => [activityId, rows.map((row) => row.thumbDataUrl)]));
    const stepLog: Record<string, { title: string; date: Date }[]> = {};
    activities
      .filter((activity) => activity.category === 'bigdeal_step' && activity.bigDealId)
      .forEach((activity) => {
        (stepLog[activity.bigDealId!] ??= []).push({ title: activity.description, date: new Date(activity.date) });
      });
    Object.values(stepLog).forEach((rows) => rows.sort((a, b) => a.date.getTime() - b.date.getTime()));
    const currentWeek = weekRangeOf(new Date());
    const currentEnd = new Date(currentWeek.start);
    currentEnd.setDate(currentEnd.getDate() + 6);
    const currentWeekGoal = weeklyGoals.find((goal) => goal.weekStart === currentWeek.weekKey) ?? {
      ...emptyWeeklyGoal,
      weekStart: currentWeek.weekKey,
      weekEnd: toLocalDateKey(currentEnd),
    };
    const currentGoal = weeklyGoals.find((goal) => goal.weekStart === currentWeek.weekKey);
    const weeklyGoal = currentGoal
      ? { ...currentGoal, goals: getWeeklyGoalProgress(currentGoal) }
      : currentWeekGoal;

    return {
      TODAY: new Date(`${todayKey}T12:00:00`),
      TODAY_KEY: todayKey,
      ACTIVITIES: activities,
      ACTIVITY_IMAGES: images,
      ACTIVITY_IMAGE_ROWS: imageRows as Record<string, ActivityImage[]>,
      BIGDEAL_STEP_LOG: stepLog,
      TODOS: todos,
      TODO_PROGRESS: progress,
      TODAY_DONE: doneToday,
      WISHES: wishes,
      WISH_TIMES: wishTimes,
      WEEKLY_GOAL: weeklyGoal,
      WEEK_RANGE: currentWeek,
      CALLING_CARDS: callingCards,
      SUMMARIES: summaries.map(toSummaryView),
      PERIOD_SUMMARIES: summaries,
      SUMMARY_PRESETS: (settings.summaryPromptPresets ?? DEFAULT_SUMMARY_PROMPT_PRESETS).map((preset) => preset.name),
      ATTR_NAMES: attrNames,
      SETTINGS: settings,
      attributes,
      WISH_PROGRESS_CUT: wishProgressCut,
    };
  }, [activities, todos, todoCompletions, wishes, weeklyGoals, summaries, callingCards, settings, attributes, imageRows, wishProgressCut, todayKey, getTodayTodoProgress, getWishProgress, getWeeklyGoalProgress]);
}

export function analyzeActivityLocally(description: string): Record<AttributeId, number> {
  const points = { ...EMPTY_POINTS };
  for (const rule of useAppStore.getState().settings.keywordRules) {
    if (rule.keywords.some((keyword) => description.includes(keyword))) points[rule.attribute] += rule.points;
  }
  return points;
}

export async function analyzeActivity(description: string, signal?: AbortSignal) {
  const settings = useAppStore.getState().settings;
  return analyzeActivityAI(description, settings.attributeNames, settings, signal);
}

export const actionsOps = {
  addActivity: (description: string, points: Record<AttributeId, number>, method: 'local' | 'todo' | 'battle', options?: Parameters<ReturnType<typeof useAppStore.getState>['addActivity']>[3]) =>
    useAppStore.getState().addActivity(description, points, method, options),
  addTodo: (todo: Parameters<ReturnType<typeof useAppStore.getState>['addTodo']>[0]) => useAppStore.getState().addTodo(todo),
  updateTodo: (id: string, patch: Partial<Todo>) => useAppStore.getState().updateTodo(id, patch),
  deleteTodo: (id: string) => useAppStore.getState().deleteTodo(id),
  completeTodo: (id: string) => useAppStore.getState().completeTodo(id),
  undoTodayTodoCompletion: (id: string) => useAppStore.getState().undoTodayTodoCompletion(id),
  addTodoStep: (todoId: string, title: string, source: 'manual' | 'ai' = 'manual') => useAppStore.getState().addTodoStep(todoId, title, { source }),
  removeTodoStep: (todoId: string, stepId: string) => useAppStore.getState().removeTodoStep(todoId, stepId),
  completeTodoStep: (todoId: string, stepId: string) => useAppStore.getState().completeTodoStep(todoId, stepId),
  undoTodoStep: (todoId: string, stepId: string) => useAppStore.getState().undoTodoStep(todoId, stepId),
  collapseBigDeal: (todoId: string) => useAppStore.getState().collapseBigDeal(todoId),
  decomposeBigDealAI: (todoId: string) => useAppStore.getState().decomposeBigDealAI(todoId),
  rebuildBigDeal: (todoId: string) => useAppStore.getState().rebuildBigDeal(todoId),
  getFateDrawPool: () => useAppStore.getState().getFateDrawPool(),
  drawFate: (pool?: FateCandidate[]) => useAppStore.getState().drawFate(pool),
  acceptFateDraw: (candidate: FateCandidate) => useAppStore.getState().acceptFateDraw(candidate),
  muteFateHistory: (candidate: FateCandidate) => useAppStore.getState().muteFateHistory(candidate),
  deleteActivity: (id: string, rollback: boolean) => rollback ? useAppStore.getState().deleteActivity(id) : useAppStore.getState().deleteActivityRecordOnly(id),
  saveWish: (wish: Wish) => useAppStore.getState().saveWish(wish),
  addWish: (title: string) => useAppStore.getState().addWish({ title }),
  deleteWish: (id: string) => useAppStore.getState().deleteWish(id),
  setWishStatus: (id: string, status: Wish['status']) => useAppStore.getState().setWishStatus(id, status),
  fulfillWish: (id: string) => useAppStore.getState().fulfillWish(id),
  addWishStep: (wishId: string, title: string, source: 'manual' | 'ai' = 'manual') => useAppStore.getState().addWishStep(wishId, title, { source }),
  toggleWishStep: (wishId: string, stepId: string) => useAppStore.getState().toggleWishStep(wishId, stepId),
  removeWishStep: (wishId: string, stepId: string) => useAppStore.getState().removeWishStep(wishId, stepId),
  decomposeWishStepsAI: (wishId: string) => useAppStore.getState().decomposeWishStepsAI(wishId),
  decomposeDraftAI: (title: string, currentState?: string, existing: string[] = []) => {
    const now = new Date();
    return useAppStore.getState().decomposeWishAI(
      { id: `draft-${now.getTime()}`, title: title.trim(), currentState, status: 'active', source: 'manual', createdAt: now },
      existing.map((stepTitle, i) => ({ id: `draft-step-${i}`, title: stepTitle, status: 'active' as const, source: 'manual' as const, createdAt: now })),
    );
  },
  evaluateWishProgress: (wishId: string) => useAppStore.getState().evaluateWishProgress(wishId),
  setWishProgress: (wishId: string, pct: number) => useAppStore.getState().setWishProgress(wishId, pct, { source: 'manual' }),
  saveWeeklyGoal: (goal: Parameters<ReturnType<typeof useAppStore.getState>['saveWeeklyGoal']>[0]) => useAppStore.getState().saveWeeklyGoal(goal),
  deleteWeeklyGoal: (id: string) => useAppStore.getState().deleteWeeklyGoal(id),
  completeWeeklyGoal: (id: string, attribute: AttributeId) => useAppStore.getState().completeWeeklyGoal(id, attribute),
  updateSettings: (patch: Parameters<ReturnType<typeof useAppStore.getState>['updateSettings']>[0]) => useAppStore.getState().updateSettings(patch),
  clearWishProgressCut: () => useAppStore.getState().clearWishProgressCut(),
};
