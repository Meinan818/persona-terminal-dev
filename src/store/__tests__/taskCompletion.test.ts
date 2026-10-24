import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Todo, TodoCompletion } from '@/types';

const h = vi.hoisted(() => ({
  todos: new Map<string, any>(),
  completions: new Map<string, any>(),
  loadData: vi.fn(),
  addActivity: vi.fn(),
  checkAchievements: vi.fn(),
}));

const completionQuery = (todoId: string) => {
  const rows = () => [...h.completions.values()].filter((row) => row.todoId === todoId);
  return {
    toArray: async () => rows(),
    delete: async () => {
      for (const [id, row] of h.completions) if (row.todoId === todoId) h.completions.delete(id);
    },
    filter: (fn: (row: TodoCompletion) => boolean) => ({
      first: async () => rows().find(fn),
      toArray: async () => rows().filter(fn),
    }),
  };
};

vi.mock('@/db', () => ({
  db: {
    open: async () => {},
    transaction: async (_mode: string, _tables: unknown, fn: () => Promise<unknown>) => fn(),
    todos: {
      get: async (id: string) => h.todos.get(id),
      add: async (todo: Todo) => { h.todos.set(todo.id, todo); },
      update: async (id: string, patch: Partial<Todo>) => {
        const row = h.todos.get(id);
        if (row) h.todos.set(id, { ...row, ...patch });
      },
    },
    todoCompletions: {
      where: () => ({ equals: (todoId: string) => completionQuery(todoId) }),
      add: async (row: TodoCompletion) => { h.completions.set(row.id, row); },
      update: async (id: string, patch: Partial<TodoCompletion>) => {
        const row = h.completions.get(id);
        if (row) h.completions.set(id, { ...row, ...patch });
      },
    },
  },
}));

import { useAppStore } from '@/store';

const makeTodo = (patch: Partial<Todo>): Todo => ({
  id: 'task-1',
  title: '整理任务',
  attribute: 'knowledge',
  points: 2,
  frequency: 'count',
  targetCount: 3,
  repeatDaily: false,
  isActive: true,
  important: false,
  createdAt: new Date('2026-10-20T08:00:00+08:00'),
  ...patch,
});

describe('任务完成与成长奖励契约', () => {
  const initial = useAppStore.getState();

  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date('2026-10-24T10:00:00+08:00'));
    vi.clearAllMocks();
    h.todos.clear();
    h.completions.clear();
    h.addActivity.mockResolvedValue({ unlockHints: { achievements: 1, skills: 0 }, activityId: 'activity-1' });
    h.checkAchievements.mockResolvedValue(undefined);
    useAppStore.setState({
      ...initial,
      user: { id: 'user-1', name: '测试', theme: 'blue', createdAt: new Date() } as any,
      todos: [],
      todoCompletions: [],
      activities: [],
      confidants: [],
      weeklyGoals: [],
      battleState: null,
      loadData: h.loadData.mockResolvedValue(undefined),
      addActivity: h.addActivity,
      checkTodoCompletionAchievements: h.checkAchievements,
      sweepCallingCards: vi.fn().mockResolvedValue([]),
      syncNotifications: vi.fn().mockResolvedValue(undefined),
    });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('同一天重复完成被拒绝，只发一次奖励', async () => {
    const todo = makeTodo({ id: 'daily-1', frequency: 'single', repeatDaily: true });
    h.todos.set(todo.id, todo);

    await expect(useAppStore.getState().completeTodo(todo.id)).resolves.toMatchObject({ completed: true });
    await expect(useAppStore.getState().completeTodo(todo.id)).resolves.toBeNull();

    expect(h.addActivity).toHaveBeenCalledTimes(1);
    expect([...h.completions.values()]).toMatchObject([{ todoId: todo.id, date: '2026-10-24', count: 1 }]);
  });

  it('计次任务中间进度返回 completed=false，到目标才写奖励', async () => {
    const todo = makeTodo({ id: 'count-3' });
    h.todos.set(todo.id, todo);

    await expect(useAppStore.getState().completeTodo(todo.id)).resolves.toMatchObject({ completed: false });
    await expect(useAppStore.getState().completeTodo(todo.id)).resolves.toMatchObject({ completed: false });
    expect(h.addActivity).not.toHaveBeenCalled();

    await expect(useAppStore.getState().completeTodo(todo.id)).resolves.toMatchObject({ completed: true });
    expect(h.addActivity).toHaveBeenCalledTimes(1);
    expect(h.todos.get(todo.id)).toMatchObject({ isActive: false });
  });

  it('长期任务累计跨天进度，达标时只结算一次并归档', async () => {
    const todo = makeTodo({ id: 'long-3', isLongTerm: true });
    h.todos.set(todo.id, todo);
    h.completions.set('old-1', { id: 'old-1', todoId: todo.id, date: '2026-10-22', count: 1 });
    h.completions.set('old-2', { id: 'old-2', todoId: todo.id, date: '2026-10-23', count: 1 });

    await expect(useAppStore.getState().completeTodo(todo.id)).resolves.toMatchObject({ completed: true });
    await expect(useAppStore.getState().completeTodo(todo.id)).resolves.toBeNull();

    expect(h.addActivity).toHaveBeenCalledTimes(1);
    expect(h.todos.get(todo.id)).toMatchObject({ isActive: false, completedAt: expect.any(Date), archivedAt: expect.any(Date) });
  });
});
