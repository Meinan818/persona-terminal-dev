import { db } from '@/db';
import { useAppStore, toLocalDateKey } from '@/store';
import type { AttributeId, LedgerAsset, LedgerEntry, SpendWorth } from '@/types';
import { ledgerCycle, roundMoney } from '@/utils/ledgerFormat';

type Store = ReturnType<typeof useAppStore.getState>;
type EntryInput = Parameters<Store['addLedgerEntry']>[0];
export interface SaveEntryOptions {
  attribute?: AttributeId;
  attrPoints?: number;
  evalWorth?: SpendWorth;
  registerAsset?: boolean;
  assetCategory?: string;
}
export interface SaveEntryRequest {
  input: EntryInput;
  options?: SaveEntryOptions;
}
interface WrittenEntry {
  entry: LedgerEntry;
  assetId?: string;
}

let budgetQueue: Promise<unknown> = Promise.resolve();
let reconcileQueue: Promise<unknown> = Promise.resolve();
let entryQueue: Promise<unknown> = Promise.resolve();
const ensureLoaded = async () => {
  if (!useAppStore.getState().ledgerLoaded) await useAppStore.getState().loadLedger();
};
function validateAsset(asset: LedgerAsset) {
  if (!asset.name.trim() || !Number.isFinite(asset.price) || asset.price <= 0 ||
      asset.addOns?.some(a => !a.name.trim() || !Number.isFinite(a.amount) || a.amount <= 0)) {
    throw new Error('请输入有效的资产名称和金额');
  }
}
function validateEntry(input: EntryInput) {
  if (!Number.isFinite(input.amount) || input.amount <= 0) throw new Error('请输入有效金额');
  if (!/^\d{4}-\d{2}-\d{2}$/.test(input.date)) throw new Error('请选择有效日期');
}
async function cleanupEntry(written: WrittenEntry) {
  const st = useAppStore.getState();
  if (written.assetId) {
    try { await st.deleteAsset(written.assetId); } catch { /* 回滚按尽力而为，保留原错误 */ }
  }
  try { await st.deleteLedgerEntry(written.entry.id); } catch { /* 回滚按尽力而为，保留原错误 */ }
}
async function writeEntry(input: EntryInput, options?: SaveEntryOptions): Promise<WrittenEntry> {
  await ensureLoaded();
  validateEntry(input);
  const st = useAppStore.getState();
  let entry: LedgerEntry | undefined;
  let assetId: string | undefined;
  try {
    entry = await st.addLedgerEntry({ ...input, amount: roundMoney(input.amount) });
    await st.rewardForLedgerEntry(entry, {
      attribute: options?.attribute,
      attrPoints: options?.attrPoints,
      evalWorth: options?.evalWorth,
    });
    if (input.direction === 'expense' && options?.registerAsset) {
      const asset = await st.addAsset({
        name: input.note?.trim() || '新资产',
        category: options.assetCategory || 'other',
        price: roundMoney(input.amount),
        purchaseDate: input.date,
        status: 'inuse',
        linkedEntryId: entry.id,
      });
      assetId = asset.id;
    }
    const channel = input.direction === 'expense' ? input.channel?.trim() : '';
    if (channel && st.settings.ledgerLastChannel !== channel) {
      await st.updateSettings({ ledgerLastChannel: channel });
    }
    return { entry, assetId };
  } catch (error) {
    if (entry) await cleanupEntry({ entry, assetId });
    throw error;
  }
}

export const ledgerOps = {
  remove: (id: string) => useAppStore.getState().deleteLedgerEntry(id),
  add: (input: Parameters<Store['addLedgerEntry']>[0]) => useAppStore.getState().addLedgerEntry(input),
  saveEntry(input: EntryInput, options?: SaveEntryOptions): Promise<LedgerEntry> {
    const operation = entryQueue.then(async () => (await writeEntry(input, options)).entry);
    entryQueue = operation.catch(() => {});
    return operation;
  },
  saveBatch(requests: SaveEntryRequest[]): Promise<LedgerEntry[]> {
    const operation = entryQueue.then(async () => {
      if (!requests.length) throw new Error('没有可保存的流水');
      for (const request of requests) validateEntry(request.input);
      const written: WrittenEntry[] = [];
      try {
        for (const request of requests) written.push(await writeEntry(request.input, request.options));
        return written.map(item => item.entry);
      } catch (error) {
        for (const item of [...written].reverse()) await cleanupEntry(item);
        throw error;
      }
    });
    entryQueue = operation.catch(() => {});
    return operation;
  },
  rememberOption(kind: 'channel' | 'incomeSource' | 'category', value: string) {
    const label = value.trim();
    if (!label) return Promise.resolve();
    const st = useAppStore.getState();
    if (kind === 'channel') {
      const cur = st.settings.ledgerChannels ?? ['支付宝', '微信', '现金', '银行卡', '信用卡'];
      return cur.includes(label) ? Promise.resolve() : st.updateSettings({ ledgerChannels: [...cur, label] });
    }
    if (kind === 'incomeSource') {
      const cur = st.settings.ledgerIncomeSources ?? ['工资', '兼职', '投资理财', '红包', '报销', '退款'];
      return cur.includes(label) ? Promise.resolve() : st.updateSettings({ ledgerIncomeSources: [...cur, label] });
    }
    const cur = st.settings.ledgerCategories ?? [];
    return cur.includes(label) ? Promise.resolve() : st.updateSettings({ ledgerCategories: [...cur, label] });
  },
  saveBudget(monthly: number, savings: number | undefined, resetDay: number, newCycle = false) {
    const operation = budgetQueue.then(async () => {
      await ensureLoaded();
      if (!Number.isFinite(monthly) || monthly <= 0 ||
          (savings !== undefined && (!Number.isFinite(savings) || savings < 0)) ||
          !Number.isInteger(resetDay) || resetDay < 1 || resetDay > 28) throw new Error('预算输入无效');
      const st = useAppStore.getState();
      const period = ledgerCycle(
        st.settings.ledgerPayCycleEnabled === true,
        resetDay,
        toLocalDateKey(),
      ).key;
      const current = st.getBudget(period);
      // 达到修改上限后仍可改花费上限和重置日，保留原挑战目标。
      const nextSavings = savings !== undefined && savings > 0 ? roundMoney(savings) : undefined;
      const currentSavings = current?.savingsGoal !== undefined && current.savingsGoal > 0 ? current.savingsGoal : undefined;
      const changed = nextSavings !== currentSavings && (current?.savingsGoalEdits ?? 0) < 2;
      await st.setBudget(period, {
        monthlyLimit: roundMoney(monthly), carriedFrom: undefined,
        ...(changed ? { savingsGoal: nextSavings, savingsGoalEdits: (current?.savingsGoalEdits ?? 0) + 1 } : {}),
      });
      await st.updateSettings({ ledgerResetDay: resetDay, ...(newCycle ? { ledgerCycleConfirmed: period } : {}) });
    });
    budgetQueue = operation.catch(() => {});
    return operation;
  },
  reconcile(targets: Array<{ account: string | null; target: number }>): Promise<{ ok: boolean; reason?: string }> {
    const operation = reconcileQueue.then(async () => {
      await ensureLoaded();
      if (!targets.length || targets.some(t => !Number.isFinite(t.target))) throw new Error('余额输入无效');
      try {
        await db.transaction('rw', db.ledgerEntries, async () => {
          const result = await useAppStore.getState().adjustAccountBalances(targets);
          if (!result.ok) throw new Error(result.reason || '对账失败');
        });
        return { ok: true };
      } catch (error) {
        await useAppStore.getState().loadLedger();
        throw error;
      }
    });
    reconcileQueue = operation.catch(() => {});
    return operation;
  },
  async addAsset(asset: LedgerAsset) {
    await ensureLoaded(); validateAsset(asset);
    const { id: _id, createdAt: _createdAt, ...input } = asset;
    return useAppStore.getState().addAsset({ ...input, price: roundMoney(input.price) });
  },
  async updateAsset(asset: LedgerAsset) {
    await ensureLoaded(); validateAsset(asset);
    if (!useAppStore.getState().assets.some(a => a.id === asset.id)) throw new Error('资产不存在');
    await useAppStore.getState().updateAsset(asset.id, asset);
  },
  removeAsset: (id: string) => useAppStore.getState().deleteAsset(id),
  budgetFor: (period: string) => useAppStore.getState().getBudget(period),
};
