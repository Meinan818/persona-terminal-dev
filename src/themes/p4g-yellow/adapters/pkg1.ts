/**
 * 数据适配层：pkg1
 * 初始状态 = 原样转发 demo 假数据（外观与 demo 完全一致，用来先验收版式）。
 * 接真实数据时：在下面「真实数据覆盖区」写同名导出覆盖掉 mock 的同名导出（ES 规则：本文件显式导出优先于 export *）。
 * 规则：只在这里接 store / utils，不改 screens/ 里的 JSX、className、style、动画。
 */
export * from '../mock/pkg1';

// ───── 真实数据覆盖区（按 INTEGRATE-THEMES.md 第 6 步填写）─────

import { useMemo } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { useAppStore } from '@/store';
import { TAROT_BY_ID } from '@/constants/tarot';
import { buildOnlinePersona } from '@/umbra/onlinePersona';
import type { AttributeId } from '@/types';

export function useHomeData() {
  const { user, attributes, achievements, todos, activities, attributeNames, todoCompletions, dailyDivination, umbraProfile } = useAppStore(useShallow((s) => ({ user: s.user, attributes: s.attributes, achievements: s.achievements, todos: s.todos, activities: s.activities, attributeNames: s.settings.attributeNames, todoCompletions: s.todoCompletions, dailyDivination: s.dailyDivination, umbraProfile: s.umbraProfile })));
  const getTodayTodoProgress = useAppStore((s) => s.getTodayTodoProgress);
  const getCountercurrentWarnings = useAppStore((s) => s.getCountercurrentWarnings);
  return useMemo(() => {
    const card = dailyDivination ? TAROT_BY_ID[dailyDivination.cardId] : null;
    return {
      MOCK_USER_NAME: user?.name ?? '',
      MOCK_ATTRIBUTES: attributes,
      MOCK_ACHIEVEMENTS: achievements,
      MOCK_TODOS: todos.filter((t) => t.isActive && !t.archivedAt).map((t) => ({ ...t, _count: getTodayTodoProgress(t.id).count })),
      MOCK_STATS: { totalActivities: activities.length, uniqueDays: new Set(activities.map((a) => new Date(a.date).toDateString())).size },
      MOCK_DIVINATION: dailyDivination ? {
        name: card?.name ?? dailyDivination.cardId,
        orientation: dailyDivination.orientation,
        attribute: dailyDivination.effect.attribute,
        multiplier: dailyDivination.effect.multiplier,
        advice: dailyDivination.advice,
      } : null,
      MOCK_COUNTERCURRENT: getCountercurrentWarnings(),
      MOCK_PERSONA_NAME: buildOnlinePersona(umbraProfile)?.name ?? '',
      ATTR_NAMES: { ...attributeNames } as Record<AttributeId, string>,
    };
  }, [user, attributes, achievements, todos, activities, attributeNames, todoCompletions, dailyDivination, umbraProfile, getTodayTodoProgress, getCountercurrentWarnings]);
}

export const homeOps = { completeTodo: (id: string) => useAppStore.getState().completeTodo(id) };
