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
import type { AttributeId } from '@/types';
import type { MockAttr, MockTodo } from '../mock/pkg1';

export function useHomeData() {
  const { attributes, todos, activities, attributeNames, todoCompletions } = useAppStore(useShallow((s) => ({ attributes: s.attributes, todos: s.todos, activities: s.activities, attributeNames: s.settings.attributeNames, todoCompletions: s.todoCompletions })));
  const getTodayTodoProgress = useAppStore((s) => s.getTodayTodoProgress);
  return useMemo(() => {
    const names = { ...attributeNames } as Record<AttributeId, string>;
    return {
      MOCK_ATTRS: attributes.map((a): MockAttr => ({ id: a.id, name: names[a.id] ?? a.displayName, points: a.points, level: a.level })),
      MOCK_TODOS: todos.filter((t) => t.isActive && !t.archivedAt).map((t): MockTodo => {
        const p = getTodayTodoProgress(t.id);
        return { id: t.id, title: t.title, attribute: t.attribute, points: t.points, important: t.important, isBigDeal: t.isBigDeal, deadline: t.deadline, frequency: t.frequency === 'count' ? 'count' : 'daily', target: p.target, count: p.count, extraBoosts: t.extraBoosts, steps: t.steps?.map((s) => ({ id: s.id, title: s.title, done: !!s.done })) };
      }),
      MOCK_STATS: { totalActivities: activities.length, uniqueDays: new Set(activities.map((a) => new Date(a.date).toDateString())).size },
      ATTR_NAMES: names,
    };
  }, [attributes, todos, activities, attributeNames, todoCompletions, getTodayTodoProgress]);
}

export const homeOps = { completeTodo: (id: string) => useAppStore.getState().completeTodo(id) };
