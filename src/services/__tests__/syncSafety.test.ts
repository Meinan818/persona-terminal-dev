import { beforeEach, describe, expect, it, vi } from 'vitest';

type Row = Record<string, unknown>;
const h = vi.hoisted(() => {
  const rows = new Map<string, Row[]>();
  const table = (key: string) => ({
    toArray: async () => rows.get(key) ?? [],
    count: async () => (rows.get(key) ?? []).length,
    clear: async () => { rows.set(key, []); },
    bulkAdd: async (values: Row[]) => { rows.set(key, values); },
    where: () => ({ equals: () => ({ toArray: async () => [] }) }),
  });
  return {
    rows, table, me: 'test-a' as string | null, generation: 0,
    state: { settings: {}, user: null, attributes: [], achievements: [], skills: [], initializeApp: vi.fn(), runTasksMergeMigration: vi.fn() },
    cloud: { setSyncStatus: vi.fn(), setLastError: vi.fn(), setLastSyncAt: vi.fn(), setLastSyncDirection: vi.fn() },
    records: [] as { id: string; key: string; value: unknown; updated: string; created: string }[],
    listRows: vi.fn(), countRows: vi.fn(), deleteRow: vi.fn(), updateRow: vi.fn(), createRow: vi.fn(), updateProfile: vi.fn(),
    transaction: vi.fn(async (_mode: string, _tables: unknown, fn: () => Promise<void>) => fn()),
  };
});
vi.mock('@/db', () => ({ db: new Proxy({ table: h.table, transaction: h.transaction }, {
  get: (target, key) => Reflect.has(target, key) ? Reflect.get(target, key) : h.table(String(key)),
}) }));
vi.mock('@/store', () => ({ useAppStore: { getState: () => h.state }, toLocalDateKey: () => '2026-10-13' }));
vi.mock('@/store/cloud', () => ({ useCloudStore: { getState: () => h.cloud } }));
vi.mock('@/services/velvetApi', () => ({ getAuthGeneration: () => h.generation, getUserId: () => h.me }));
vi.mock('@/services/userDataApi', () => ({
  isAuthenticated: () => !!h.me, getUserId: () => h.me,
  listRows: h.listRows, getRow: async (id: string) => h.records.find(r => r.id === id),
  countRows: h.countRows, deleteRow: h.deleteRow, updateRow: h.updateRow, createRow: h.createRow,
  updateProfile: h.updateProfile, clearAvatar: async () => {},
}));
import { pullAll, pushAll, readLastSync, syncOnLogin } from '../sync';
import { createUmbraRunRecord } from '@/umbra/runtime';
import { createFreshUmbraProfile, normalizeUmbraProfile } from '@/umbra/state';

const row = (key: string, value: unknown, updated = '2026-10-13T10:00:00.000Z') => ({ id: key, key, value, updated, created: updated });
const meta = (n: number, at = '2026-10-13T12:00:00.000Z') => row('_meta', { schema: 2, chunks: { activities: { n, at } } });
const local = [{ id: 'local-must-survive' }];

describe('云同步数据安全', () => {
  beforeEach(() => {
    vi.clearAllMocks(); localStorage.clear(); h.rows.clear(); h.records = []; h.me = 'test-a'; h.generation = 0;
    h.rows.set('activities', local);
    h.listRows.mockImplementation(async () => h.records);
    h.countRows.mockResolvedValue({ totalItems: 0 });
    h.deleteRow.mockResolvedValue(undefined); h.updateProfile.mockResolvedValue({});
    h.updateRow.mockResolvedValue({ id: 'updated', updated: '2026-10-13T14:00:00.000Z' });
    h.createRow.mockResolvedValue({ id: 'created', updated: '2026-10-13T14:00:00.000Z' });
    h.transaction.mockImplementation(async (_mode, _tables, fn) => fn());
  });

  it('缺失声明分片时拒绝覆盖且不更新同步水位', async () => {
    h.records = [meta(2), row('activities#1', [{ id: 'part-1' }])];
    await expect(pullAll()).rejects.toThrow();
    expect(h.rows.get('activities')).toEqual(local);
    expect(h.transaction).not.toHaveBeenCalled();
    expect(localStorage.getItem('velvet:lastSyncAt')).toBeNull();
  });
  it('所有声明分片缺失时也拒绝覆盖', async () => {
    h.records = [meta(2)];
    await expect(pullAll()).rejects.toThrow();
    expect(h.transaction).not.toHaveBeenCalled();
  });
  it.each([{ wrong: 'shape' }, '{bad json', [null], [{ name: 'missing id' }], [{ id: 'same' }, { id: 'same' }]])('拒绝非法表数据 %j', async value => {
    h.records = [row('activities', value)];
    await expect(pullAll()).rejects.toThrow();
    expect(h.rows.get('activities')).toEqual(local);
    expect(h.transaction).not.toHaveBeenCalled();
  });
  it.each([meta(0), meta(1.5), meta(1, 'bad date'), row('_meta', '{bad json'), row('_meta', { chunks: [] }), row('_meta', { schema: '2' })])('拒绝非法元数据 %j', async value => {
    h.records = [value, row('activities#1', [])];
    await expect(pullAll()).rejects.toThrow();
    expect(h.transaction).not.toHaveBeenCalled();
  });
  it('缺少元数据的分片不能被当空表', async () => {
    h.records = [row('activities#1', [])];
    await expect(pullAll()).rejects.toThrow();
    expect(h.rows.get('activities')).toEqual(local);
  });
  it('合法空数组沿用清空语义', async () => {
    h.records = [row('activities', [])];
    await pullAll();
    expect(h.rows.get('activities')).toEqual([]);
    expect(h.cloud.setSyncStatus).toHaveBeenLastCalledWith('success');
  });
  it('最近同步时间按账号隔离，换号后不沿用上一份档案的水位', async () => {
    h.records = [row('activities', [])];
    await pullAll();
    expect(localStorage.getItem('velvet:lastSyncAt')).toBeNull();
    expect(readLastSync()).toBeInstanceOf(Date);

    h.me = 'test-b';
    expect(readLastSync()).toBeNull();
  });
  it.each(['2026-10-13T10:00:00.000Z', '2026-10-13 10:00:00.000Z', '2026-10-13T13:00:00+03:00'])('按时间选择较新分片（旧表时间 %s）', async date => {
    h.records = [meta(1), row('activities', [{ id: 'old' }], date), row('activities#1', [{ id: 'new' }])];
    await pullAll(); expect(h.rows.get('activities')).toEqual([{ id: 'new' }]);
  });
  it('较新整表沿用原有优先策略', async () => {
    h.records = [meta(1), row('activities', [{ id: 'new' }], '2026-10-13T13:00:00Z'), row('activities#1', [{ id: 'old' }])];
    await pullAll(); expect(h.rows.get('activities')).toEqual([{ id: 'new' }]);
  });
  it('版本时间非法时拒绝覆盖', async () => {
    h.records = [meta(1), row('activities', [], 'invalid'), row('activities#1', [])];
    await expect(pullAll()).rejects.toThrow(); expect(h.transaction).not.toHaveBeenCalled();
  });
  it.each(['switch', 'logout', 'same-account-relogin'])('请求期间 %s 后旧响应不能写库或污染新同步状态', async change => {
    h.records = [row('activities', [{ id: 'old-account-data' }])];
    h.listRows.mockImplementation(async () => { h.me = change === 'logout' ? null : change === 'switch' ? 'test-b' : 'test-a'; h.generation++; return h.records; });
    await expect(pullAll()).rejects.toThrow();
    expect(h.rows.get('activities')).toEqual(local); expect(h.transaction).not.toHaveBeenCalled();
    expect(localStorage.getItem('velvet:syncOwner')).toBeNull();
    expect(h.cloud.setSyncStatus).not.toHaveBeenCalledWith('error');
  });
  it('事务中途换号触发回滚而不提交成功水位', async () => {
    h.records = [row('activities', [{ id: 'old-account-data' }])];
    h.transaction.mockImplementation(async (_mode, _tables, fn) => {
      const before = new Map(h.rows); h.generation++;
      try { await fn(); } catch (error) { h.rows.clear(); for (const [k, v] of before) h.rows.set(k, v); throw error; }
    });
    await expect(pullAll()).rejects.toThrow();
    expect(h.rows.get('activities')).toEqual(local);
  });
  it('隐私清理失败必须报失败且不删掉分片登记', async () => {
    h.records = [row('wishes', [{ id: 'private' }])];
    h.deleteRow.mockRejectedValue(new Error('synthetic delete failure'));
    await expect(pushAll()).rejects.toThrow();
    expect(h.cloud.setSyncStatus).toHaveBeenLastCalledWith('error');
    expect(localStorage.getItem('velvet:lastSyncAt')).toBeNull();
    h.deleteRow.mockResolvedValue(undefined);
    await pushAll(); expect(h.cloud.setSyncStatus).toHaveBeenLastCalledWith('success');
  });
  it('推送途中换号后不继续用新账号写后续表', async () => {
    h.listRows.mockImplementation(async () => { h.me = 'test-b'; h.generation++; return []; });
    await expect(pushAll()).rejects.toThrow();
    expect(h.createRow).not.toHaveBeenCalled(); expect(h.updateProfile).not.toHaveBeenCalled();
  });

  it('换到另一账号且云端为空时，本机旧档案不自动推送', async () => {
    h.rows.set('users', [{ id: 'local-user', name: '本机档案' }]);
    localStorage.setItem('velvet:syncOwner', 'old-account');

    await expect(syncOnLogin()).resolves.toBe('conflict');
    expect(h.createRow).not.toHaveBeenCalled();
    expect(localStorage.getItem('velvet:syncOwner')).toBe('old-account');
  });

  it('登录后查不到云端状态时不把本机旧档案当新账号数据推送', async () => {
    h.rows.set('users', [{ id: 'local-user', name: '本机档案' }]);
    h.countRows.mockRejectedValue(new Error('Failed to fetch'));

    await expect(syncOnLogin()).rejects.toThrow('连不上云端');
    expect(h.createRow).not.toHaveBeenCalled();
    expect(h.cloud.setLastError).toHaveBeenCalledWith('连不上云端，先不同步；网络好了再到账号页手动同步');
  });

  it('记账、预算和资产始终留在本地，不被全量推送带上云', async () => {
    h.rows.set('ledgerEntries', [{ id: 'entry-local' }]);
    h.rows.set('budgets', [{ id: 'budget-local' }]);
    h.rows.set('assets', [{ id: 'asset-local' }]);
    h.records = [];

    await pushAll();

    const pushedKeys = h.createRow.mock.calls.map(([key]) => String(key));
    expect(pushedKeys.some((key) => key.startsWith('ledger') || key === 'budgets' || key === 'assets')).toBe(false);
  });

  it('UMBRA 正式资料与 Demo 行程经过推送、清空和拉取后保持完整', async () => {
    const now = new Date('2026-10-20T14:00:00.000Z');
    const profile = createFreshUmbraProfile(now);
    const syncedProfile = {
      ...profile,
      updatedAt: new Date('2026-10-20T15:00:00.000Z'),
      economy: { ...profile.economy, money: 4321, sp: 12, totalSpEarned: 18 },
      combat: {
        ...profile.combat,
        activePersonaId: 'pixie',
        heroPersonaIds: ['arsene', 'pixie', 'angel'],
        allyPersonaIds: ['agathion', 'cait-sith', 'kelpie'],
        equipment: { weapon: 'black-fang', armor: 'school-jacket', accessory: 'old-watch' },
        equipmentLevels: { 'black-fang': 2 },
        ownedEquipment: ['training-blade', 'school-jacket', 'old-watch', 'black-fang'],
        battleItems: { painkiller: 3, sportsDrink: 2 },
        materials: { emberShard: 4 },
      },
      demo: {
        p5r: {
          money: 4321,
          activePersonaId: 'pixie',
          personaRoster: ['arsene', 'pixie', 'angel'],
          allyPersonaIds: ['agathion', 'cait-sith', 'kelpie'],
          equipment: { weapon: 'black-fang', armor: 'school-jacket', accessory: 'old-watch' },
          ownedEquipment: ['training-blade', 'school-jacket', 'old-watch', 'black-fang'],
          equipmentLevels: { 'black-fang': 2 },
          battleItems: { painkiller: 3, sportsDrink: 2 },
          materials: { emberShard: 4 },
          savedAt: '2026-10-20T14:30:00.000Z',
        },
        slice: {
          record: { day: '2026-10-20' },
          run: { active: true, floor: 3 },
        },
        updatedAt: '2026-10-20T14:30:00.000Z',
      },
    };
    const run = createUmbraRunRecord('current', {
      formalMap: { floor: 3, seed: 7 },
      source: 'demo',
      demoRun: {
        journey: { active: true, floor: 3 },
        startedAt: '2026-10-20T14:10:00.000Z',
      },
    }, now);
    h.rows.set('umbraProfiles', [syncedProfile as unknown as Row]);
    h.rows.set('umbraRuns', [run as unknown as Row]);

    let recordSeq = 0;
    const stamp = () => new Date(1_800_000_000_000 + (++recordSeq) * 1000).toISOString();
    h.createRow.mockImplementation(async (key: string, value: unknown) => {
      const record = { id: `cloud-${++recordSeq}`, key, value, updated: stamp(), created: stamp() };
      h.records.push(record);
      return record;
    });
    h.updateRow.mockImplementation(async (id: string, value: unknown) => {
      const record = h.records.find(item => item.id === id);
      if (!record) throw new Error(`missing cloud row ${id}`);
      record.value = value;
      record.updated = stamp();
      return record;
    });
    h.deleteRow.mockImplementation(async (id: string) => {
      h.records = h.records.filter(item => item.id !== id);
    });

    await pushAll({ force: true });
    const compareTime = new Date('2026-10-20T16:00:00.000Z');
    h.rows.set('umbraProfiles', [createFreshUmbraProfile(compareTime) as unknown as Row]);
    h.rows.set('umbraRuns', []);

    await pullAll();

    const pulledProfile = h.rows.get('umbraProfiles')?.[0] as unknown as typeof syncedProfile;
    const pulledRun = h.rows.get('umbraRuns')?.[0] as unknown as typeof run;
    expect(pulledProfile.economy.money).toBe(4321);
    expect(pulledProfile.combat.activePersonaId).toBe('pixie');
    expect(pulledProfile.combat.allyPersonaIds).toEqual(['agathion', 'cait-sith', 'kelpie']);
    expect(pulledProfile.combat.equipment.weapon).toBe('black-fang');
    expect(pulledProfile.combat.battleItems).toEqual({ painkiller: 3, sportsDrink: 2 });
    expect(pulledProfile.combat.materials).toEqual({ emberShard: 4 });
    expect(pulledProfile.demo?.p5r).toMatchObject({
      money: 4321,
      activePersonaId: 'pixie',
      equipment: { weapon: 'black-fang' },
      savedAt: '2026-10-20T14:30:00.000Z',
    });
    expect(pulledProfile.demo?.slice).toEqual(syncedProfile.demo.slice);
    expect(pulledProfile.demo?.updatedAt).toBe('2026-10-20T14:30:00.000Z');
    expect(pulledProfile.createdAt).toBeInstanceOf(Date);
    expect(pulledProfile.updatedAt).toBeInstanceOf(Date);
    expect(pulledRun.payload.formalMap).toEqual({ floor: 3, seed: 7 });
    expect(pulledRun.payload.demoRun).toEqual(run.payload.demoRun);
    expect(pulledRun.updatedAt).toBeInstanceOf(Date);
    expect(normalizeUmbraProfile(pulledProfile).demo?.updatedAt).toBe('2026-10-20T14:30:00.000Z');
  });
});
