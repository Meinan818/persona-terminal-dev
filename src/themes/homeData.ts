import { useMemo } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { useAppStore, toLocalDateKey } from '@/store';
import { TAROT_BY_ID } from '@/constants/tarot';
import type { AttributeId, CallingCard, Todo } from '@/types';

export interface HomeTodo extends Todo {
  target: number;
  count: number;
  _count: number;
  fateDrawn?: boolean;
}

export interface HomeCallingCard {
  id: string;
  title: string;
  subtitle?: string;
  targetDate?: string;
}

const dateKey = (value: Date | string) => {
  const date = value instanceof Date ? value : new Date(value);
  return toLocalDateKey(date);
};

const todoView = (
  todo: Todo,
  progress: { count: number; target: number; isComplete: boolean },
): HomeTodo => ({
  ...todo,
  fateDrawn: todo.fateDrawnDate === toLocalDateKey(),
  target: todo.isBigDeal ? Math.max(1, todo.steps?.length ?? 1) : progress.target || 1,
  count: todo.isBigDeal ? (todo.steps ?? []).filter((step) => step.done).length : progress.count,
  _count: progress.count,
});

const cardView = (card: CallingCard): HomeCallingCard => ({
  id: card.id,
  title: card.title,
  subtitle: card.subtitle,
  targetDate: card.targetDate,
});

export function useHomeData() {
  const {
    user,
    attributes,
    achievements,
    todos,
    activities,
    attributeNames,
    todoCompletions,
    dailyDivination,
    persona,
    callingCards,
  } = useAppStore(useShallow((state) => ({
    user: state.user,
    attributes: state.attributes,
    achievements: state.achievements,
    todos: state.todos,
    activities: state.activities,
    attributeNames: state.settings.attributeNames,
    todoCompletions: state.todoCompletions,
    dailyDivination: state.dailyDivination,
    persona: state.persona,
    callingCards: state.callingCards,
  })));
  const getDueTodosToday = useAppStore((state) => state.getDueTodosToday);
  const getTodayTodoProgress = useAppStore((state) => state.getTodayTodoProgress);
  const getCountercurrentWarnings = useAppStore((state) => state.getCountercurrentWarnings);

  return useMemo(() => {
    const dueTodos = getDueTodosToday();
    const cards = callingCards.filter((card) => !card.archived);
    const pinnedCard = cards.find((card) => card.pinned) ?? null;
    const unpinnedCards = cards.filter((card) => !card.pinned);
    const mappedTodos = dueTodos.map((todo) => todoView(todo, getTodayTodoProgress(todo.id)));
    const warnings = getCountercurrentWarnings();
    const card = dailyDivination ? TAROT_BY_ID[dailyDivination.cardId] : null;
    const weatherActivity = activities.find((activity) => activity.weather);
    const onThisDay = new Date();
    onThisDay.setFullYear(onThisDay.getFullYear() - 1);
    const onThisDayKey = dateKey(onThisDay);
    const onThisDayActivities = activities.filter((activity) => dateKey(activity.date) === onThisDayKey);

    return {
      MOCK_USER_NAME: user?.name ?? '',
      MOCK_ATTRS: attributes.map((attribute) => ({
        id: attribute.id,
        name: attribute.displayName || attributeNames[attribute.id],
        points: attribute.points,
        level: attribute.level,
      })),
      MOCK_ATTRIBUTES: attributes,
      MOCK_ACHIEVEMENTS: achievements,
      MOCK_TODOS: mappedTodos,
      MOCK_STATS: {
        totalActivities: activities.length,
        uniqueDays: new Set(activities.map((activity) => dateKey(activity.date))).size,
      },
      MOCK_CALLING_CARD: pinnedCard ? cardView(pinnedCard) : null,
      MOCK_CALLING_CARD_FAR: unpinnedCards[0] ? cardView(unpinnedCards[0]) : null,
      MOCK_UNPINNED_COUNT: unpinnedCards.length,
      MOCK_DIVINATION: dailyDivination ? {
        name: card?.name ?? dailyDivination.cardId,
        cardName: card?.name ?? dailyDivination.cardId,
        orientation: dailyDivination.orientation,
        attribute: dailyDivination.effect.attribute,
        multiplier: dailyDivination.effect.multiplier,
        advice: dailyDivination.advice,
      } : null,
      MOCK_COUNTERCURRENT: warnings,
      MOCK_DECAYED: warnings,
      MOCK_PERSONA_NAME: persona?.name ?? '',
      MOCK_WEATHER: weatherActivity?.weather ? {
        temp: weatherActivity.weather.temp ?? 0,
        feelsLike: weatherActivity.weather.temp ?? 0,
        text: weatherActivity.weather.text ?? '',
        icon: weatherActivity.weather.icon,
      } : null,
      MOCK_ON_THIS_DAY: {
        date: onThisDay,
        total: onThisDayActivities.length,
        daysSince: 365,
        streakThen: 0,
        items: onThisDayActivities.map((activity) => ({
          id: activity.id,
          time: new Date(activity.date).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' }),
          text: activity.description,
          important: activity.important,
          pts: Object.entries(activity.pointsAwarded)
            .filter(([, points]) => points > 0)
            .map(([attribute, points]) => ({ attr: attribute as AttributeId, n: points })),
        })),
      },
      ATTR_NAMES: { ...attributeNames } as Record<AttributeId, string>,
      todoCompletions,
    };
  }, [
    user,
    attributes,
    achievements,
    activities,
    attributeNames,
    todoCompletions,
    dailyDivination,
    persona,
    callingCards,
    getDueTodosToday,
    getTodayTodoProgress,
    getCountercurrentWarnings,
  ]);
}

export function relatedAchievements(attribute: AttributeId) {
  return useAppStore.getState().achievements
    .filter((achievement) => achievement.condition.attribute === attribute || achievement.condition.type === 'all_attributes_max')
    .map((achievement) => ({
      id: achievement.id,
      icon: achievement.icon,
      title: achievement.title,
      description: achievement.description,
      attribute: achievement.condition.attribute,
      unlocked: achievement.unlocked,
    }));
}

export function onThisDaySub() {
  const date = new Date();
  date.setFullYear(date.getFullYear() - 1);
  const key = dateKey(date);
  const rows = useAppStore.getState().activities.filter((activity) => dateKey(activity.date) === key);
  if (!rows.length) return '去年今天还没有记录';
  const first = rows[0].description;
  return `记了 ${rows.length} 条 · ${first.length > 18 ? `${first.slice(0, 18)}…` : first}`;
}

export const homeOps = {
  completeTodo: (id: string) => useAppStore.getState().completeTodo(id),
};
