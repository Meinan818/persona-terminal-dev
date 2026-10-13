/**
 * 导入主备份 / 失败回滚 的回归测试（2026-10-14 阶段 4 复查）。
 *
 * 用真实 store 的 importData / resetAllData，配一个语义贴近 Dexie 的内存库：
 *   · clear 真的清空；bulkAdd 对「表里已有同主键」抛 BulkError（Dexie 的真实行为）
 *   · keepImages 保留哪些表，由真实的 ALL_LOCAL_TABLES + 保留清单决定，不在测试里复刻
 *
 * 钉住两件事：
 *   1. 回滚时不能对自己「有意保留、没清空」的表再 bulkAdd —— 否则拿同主键去撞 Dexie，
 *      回滚被判失败、界面也不再重载（数据其实还在库里，用户只能自己刷新）。
 *   2. 备份里类型是 Date 的字段，导入后必须还是 Date（JSON 往返会把它变成字符串）。
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';

const h = vi.hoisted(() => {
  const rows = {} as Record<string, Record<string, unknown>[]>;
  const log = { cleared: [] as string[], bulkAdd: [] as string[], add: [] as string[] };
  const failAdd = { table: '' };
  const makeTable = (name: string) => ({
    toArray: async () => rows[name] ?? [],
    clear: async () => { log.cleared.push(name); rows[name] = []; },
    put: async (v: Record<string, unknown>) => { upsert(name, v); },
    add: async (v: Record<string, unknown>) => {
      log.add.push(name);
      if (failAdd.table === name) throw new Error('synthetic add failure');
      upsert(name, v);
    },
    bulkAdd: async (list: Record<string, unknown>[]) => {
      log.bulkAdd.push(name);
      if ((rows[name] ?? []).length) throw new Error(`BulkError: ${name} primary key already exists`);
      rows[name] = [...(rows[name] ?? []), ...list];
    },
    bulkPut: async (list: Record<string, unknown>[]) => { list.forEach(v => upsert(name, v)); },
    bulkDelete: async () => {},
    delete: async () => {},
    get: async () => undefined,
    update: async () => {},
    where: () => ({
      equals: () => ({
        toArray: async () => [],
        delete: async () => {},
        filter: () => ({ first: async () => undefined, toArray: async () => [] }),
      }),
    }),
  });
  function upsert(name: string, v: Record<string, unknown>) {
    log.add.push(name);
    const arr = (rows[name] ??= []);
    const i = arr.findIndex(x => x.id === v.id);
    if (i >= 0) arr[i] = v; else arr.push(v);
  }
  const db = new Proxy({}, {
    get(_t, key) {
      if (typeof key !== 'string') return undefined;
      if (key === 'transaction') return async (_mode: string, _tables: unknown[], fn: () => Promise<void>) => fn();
      if (key === 'table') return (n: string) => makeTable(n);
      return makeTable(key);
    },
  });
  return { rows, log, failAdd, db };
});

vi.mock('@/db', () => ({ db: h.db }));

import { useAppStore } from '@/store';

const asRecord = (v: unknown) => v as Record<string, any>;

describe('导入主备份：失败回滚与 Date 还原', () => {
  beforeEach(() => {
    h.log.cleared = [];
    h.log.bulkAdd = [];
    h.log.add = [];
    h.failAdd.table = '';
    for (const k of Object.keys(h.rows)) delete h.rows[k];
    // initializeApp 会去读一整套表并刷新界面状态，与本测试关注的写入路径无关
    useAppStore.setState({ initializeApp: vi.fn(async () => {}) });
  });

  it('回滚不会向「有意保留、未清空」的表 bulkAdd（否则撞主键、回滚失败）', async () => {
    // 用户用过在线名片裁图：表里有行，且这些行按设计不进主备份
    h.rows.onlineCardFaces = [{ id: 'face-1', url: 'blob:x' }];
    h.failAdd.table = 'todos';
    const badBackup = JSON.stringify({
      user: [],
      todos: [{ id: 't1', title: 'x', createdAt: new Date().toISOString() }],
    });

    await expect(useAppStore.getState().importData(badBackup)).rejects.toThrow('导入失败');

    expect(h.log.cleared).not.toContain('onlineCardFaces');
    expect(h.log.bulkAdd).not.toContain('onlineCardFaces');
    expect(h.rows.onlineCardFaces).toHaveLength(1);
  });

  it('回滚之后一定会重新加载界面（原实现把 initializeApp 关在 try 里，出错就不执行）', async () => {
    h.rows.onlineCardFaces = [{ id: 'face-1', url: 'blob:x' }];
    h.failAdd.table = 'todos';
    const reload = vi.fn(async () => {});
    useAppStore.setState({ initializeApp: reload });
    const badBackup = JSON.stringify({ user: [], todos: [{ id: 't1', title: 'x', createdAt: new Date().toISOString() }] });

    await expect(useAppStore.getState().importData(badBackup)).rejects.toThrow('导入失败');
    expect(reload).toHaveBeenCalled();
  });

  it('备份里的 Date 字段导入后仍是 Date（周总结 / 黑猫记忆）', async () => {
    const backup = JSON.stringify({
      user: [],
      summaries: [{
        id: 's1', period: 'week', startDate: '2026-01-01', endDate: '2026-01-07', label: 'x',
        content: '', promptPresetId: 'p', promptPresetName: 'n', totalPoints: 0,
        attributePoints: {}, activityCount: 0,
        createdAt: '2026-01-08T00:00:00.000Z',
        viewedAt: '2026-01-08T01:00:00.000Z',
        followUp: { question: 'q', answer: 'a', createdAt: '2026-01-09T00:00:00.000Z' },
        followUps: [{ question: 'q2', answer: 'a2', createdAt: '2026-01-10T00:00:00.000Z' }],
      }],
      navigatorMemos: [{
        id: 'm1', source: 'chat', text: 't', importance: 3, status: 'active',
        createdAt: '2026-01-01T00:00:00.000Z',
        lastRecalledAt: '2026-01-02T00:00:00.000Z',
        promiseClosedAt: '2026-01-03T00:00:00.000Z',
      }],
    });

    await useAppStore.getState().importData(backup);

    const s = asRecord(h.rows.summaries[0]);
    expect(s.createdAt).toBeInstanceOf(Date);
    expect(s.viewedAt).toBeInstanceOf(Date);
    expect(s.followUp.createdAt).toBeInstanceOf(Date);
    expect(s.followUps[0].createdAt).toBeInstanceOf(Date);

    const m = asRecord(h.rows.navigatorMemos[0]);
    expect(m.createdAt).toBeInstanceOf(Date);
    expect(m.lastRecalledAt).toBeInstanceOf(Date);
    expect(m.promiseClosedAt).toBeInstanceOf(Date);
  });
});
