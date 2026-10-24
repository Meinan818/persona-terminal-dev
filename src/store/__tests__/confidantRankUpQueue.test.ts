import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Confidant, ConfidantEvent } from '@/types';

/**
 * 羁绊升级「待播队列」——库层触发（计划 Wave 1）
 *
 * 边界说明：只把 IndexedDB 这一层换成内存桩；升级判定（pointsToLevel / thresholdsFor /
 * buffsForLevel）走**真实实现**，所以这条用例覆盖的是「加了多少点 → 到底升没升级 → 入不入队」
 * 的完整链路，而不是被 mock 掉的假路径。
 */
const h = vi.hoisted(() => ({
  confidants: [] as Confidant[],
  events: [] as ConfidantEvent[],
}));

vi.mock('@/db', () => ({
  db: {
    confidants: {
      get: async (id: string) => h.confidants.find(c => c.id === id),
      add: async (c: Confidant) => {
        h.confidants.push(c);
      },
      put: async (c: Confidant) => {
        const i = h.confidants.findIndex(x => x.id === c.id);
        if (i >= 0) h.confidants[i] = c;
        else h.confidants.push(c);
      },
      bulkPut: async (rows: Confidant[]) => {
        for (const r of rows) {
          const i = h.confidants.findIndex(x => x.id === r.id);
          if (i >= 0) h.confidants[i] = r;
          else h.confidants.push(r);
        }
      },
      toArray: async () => [...h.confidants],
      orderBy: () => ({ toArray: async () => [...h.confidants] }),
      update: async () => {},
    },
    confidantEvents: {
      get: async (id: string) => h.events.find(e => e.id === id),
      add: async (row: ConfidantEvent) => {
        h.events.push(row);
      },
      bulkAdd: async (rows: ConfidantEvent[]) => {
        h.events.push(...rows);
      },
      orderBy: () => ({
        toArray: async () => [...h.events],
        reverse: () => ({ toArray: async () => [...h.events] }),
      }),
    },
    // Dexie 的 transaction 是变参：('rw', 表1, 表2, …, 回调)，回调恒为最后一个参数
    transaction: async (...args: unknown[]) => {
      const fn = args[args.length - 1] as () => Promise<unknown>;
      return fn();
    },
  },
}));

import { useAppStore } from '..';

const makeConfidant = (over: Partial<Confidant> = {}): Confidant => ({
  id: 'c1',
  userId: 'u1',
  source: 'offline',
  name: '测试同伴',
  arcanaId: 'fool',
  orientation: 'upright',
  description: '关系描述',
  aiInterpretation: '解读',
  aiAdvice: '建议',
  intimacy: 1,
  intimacyPoints: 4, // 离线曲线：Lv1→Lv2 门槛是累计 9 点，再加 5 点即升级
  buffs: [],
  decayEnabled: false,
  createdAt: new Date('2026-10-01T00:00:00Z'),
  ...over,
});

describe('羁绊升级待播队列（库层触发）', () => {
  beforeEach(() => {
    h.confidants = [makeConfidant()];
    h.events = [];
    useAppStore.setState({ confidantRankUpQueue: [], confidants: [], confidantEvents: [] });
    const state = useAppStore.getState();
    useAppStore.setState({
      user: {
        id: 'u1', name: '测试用户', createdAt: new Date(), updatedAt: new Date(),
      } as never,
      settings: {
        ...state.settings,
        attributeNames: { knowledge: '知识', guts: '胆量', dexterity: '灵巧', kindness: '温柔', charm: '魅力' },
      },
    });
  });

  it('升级：往待播队列压一条，带旧级 / 新级 / 星移次数', async () => {
    const res = await useAppStore.getState().bumpConfidantIntimacy('c1', 5, 'intimacy_up', '一起完成了作战');
    expect(res.leveledUp).toBe(true);
    const q = useAppStore.getState().confidantRankUpQueue;
    expect(q).toHaveLength(1);
    expect(q[0]).toMatchObject({ confidantId: 'c1', oldLevel: 1, newLevel: 2, starShiftGained: 1 });
  });

  it('没升级：队列保持为空', async () => {
    const res = await useAppStore.getState().bumpConfidantIntimacy('c1', 1, 'intimacy_up', '随便聊聊');
    expect(res.leveledUp).toBe(false);
    expect(useAppStore.getState().confidantRankUpQueue).toHaveLength(0);
  });

  /**
   * 回归（2026-10-16 用户报「升级后先弹恭喜页、弄完才跳升级界面，只是偶尔会」）：
   * 原先「先刷新 confidants、再压队列」，中间那一瞬是「等级已是新级 + 队列还空着」——
   * 同伴档案的补弹判据正好是「有新等级 + 不在队列里」，于是抢先弹了恭喜页。
   * 这条用例盯住不变量：**任何看到新等级的快照上，队列都必须已经有这条升级**。
   */
  it('入队先于数据刷新：看到新等级的那一刻，队列里已经有它', async () => {
    const seen: Array<{ level: number; queued: boolean }> = [];
    const unsub = useAppStore.subscribe(s => {
      const c = s.confidants.find(x => x.id === 'c1');
      if (!c) return;
      seen.push({
        level: c.intimacy,
        queued: s.confidantRankUpQueue.some(n => n.confidantId === 'c1' && n.newLevel === c.intimacy),
      });
    });
    await useAppStore.getState().bumpConfidantIntimacy('c1', 5, 'intimacy_up', '一起完成了作战');
    unsub();

    const atNewLevel = seen.filter(s => s.level === 2);
    expect(atNewLevel.length).toBeGreaterThan(0); // 前提：确实观察到过「新等级已就位」
    expect(atNewLevel.every(s => s.queued)).toBe(true);
  });

  it('重复事件（同 eventId）：不重复入队', async () => {
    await useAppStore.getState().bumpConfidantIntimacy('c1', 5, 'intimacy_up', 'n', { eventId: 'e1' });
    await useAppStore.getState().bumpConfidantIntimacy('c1', 5, 'intimacy_up', 'n', { eventId: 'e1' });
    expect(useAppStore.getState().confidantRankUpQueue).toHaveLength(1);
  });

  it('每日互动与加点在同一事务：第二次拒绝且不会吞掉当天机会', async () => {
    const first = await useAppStore.getState().recordConfidantInteraction({
      id: 'c1',
      description: '一起复习',
      delta: 5,
      narrative: '今天一起把重点过完了',
    });
    expect(first.leveledUp).toBe(true);
    expect(h.confidants[0]).toMatchObject({ intimacy: 2, intimacyPoints: 9 });
    expect(h.confidants[0].lastInteractionDate).toBeTruthy();

    await expect(useAppStore.getState().recordConfidantInteraction({
      id: 'c1',
      description: '同一天再记一次',
      delta: 5,
      narrative: '不应写入',
    })).rejects.toThrow('今天已经和 Ta 解读过了');
    expect(h.confidants[0].intimacyPoints).toBe(9);
    expect(h.events.filter((event) => event.type === 'conversation')).toHaveLength(1);
  });

  it('星移事务扣一次次数并只写一条事件；没有次数时不改档案', async () => {
    h.confidants[0].starShiftCharges = 1;
    await useAppStore.getState().consumeStarShift('c1', {
      description: '新的描述',
      interpretation: '新的解读',
      advice: '新的建议',
      orientation: 'reversed',
      summary: '关系变化',
    });
    expect(h.confidants[0].starShiftCharges).toBe(0);
    expect(h.events.filter((event) => event.type === 'star_shift')).toHaveLength(1);

    await expect(useAppStore.getState().consumeStarShift('c1', {
      description: '不应写入',
      interpretation: '不应写入',
      advice: '不应写入',
      orientation: 'upright',
    })).rejects.toThrow('没有可用的星移次数');
    expect(h.confidants[0]).toMatchObject({ description: '新的描述', orientation: 'reversed', starShiftCharges: 0 });
    expect(h.events.filter((event) => event.type === 'star_shift')).toHaveLength(1);
  });

  it('创建同伴写入真实卡片与 created 事件，初始点数走对应阈值曲线', async () => {
    h.confidants = [];
    const created = await useAppStore.getState().addConfidant({
      name: '新同伴',
      description: '一起学习',
      source: 'offline',
      initialLevel: 3,
      match: {
        arcanaId: 'magician',
        orientation: 'upright',
        initialIntimacy: 3,
        initialPoints: 0,
        interpretation: '解读',
        advice: '建议',
        source: 'offline',
      },
    });
    expect(created).toMatchObject({ name: '新同伴', intimacy: 3, intimacyPoints: 16 });
    expect(h.confidants).toHaveLength(1);
    expect(h.events.filter((event) => event.type === 'created')).toHaveLength(1);
  });
});
