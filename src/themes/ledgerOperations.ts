import { db } from '@/db';
import { useAppStore, toLocalDateKey } from '@/store';
import type { LedgerAsset } from '@/types';
import { roundMoney } from '@/utils/ledgerFormat';

type Store = ReturnType<typeof useAppStore.getState>;
let budgetQueue: Promise<unknown> = Promise.resolve();
let reconcileQueue: Promise<unknown> = Promise.resolve();
const ensureLoaded = async () => {
  if (!useAppStore.getState().ledgerLoaded) await useAppStore.getState().loadLedger();
};
function validateAsset(asset: LedgerAsset) {
  if (!asset.name.trim() || !Number.isFinite(asset.price) || asset.price <= 0 ||
      asset.addOns?.some(a => !a.name.trim() || !Number.isFinite(a.amount) || a.amount <= 0)) {
    throw new Error('请输入有效的资产名称和金额');
  }
}

export const ledgerOps = {
  remove: (id: string) => useAppStore.getState().deleteLedgerEntry(id),
  add: (input: Parameters<Store['addLedgerEntry']>[0]) => useAppStore.getState().addLedgerEntry(input),
  saveBudget(monthly: number, savings: number | undefined, resetDay: number, newCycle = false) {
    const operation = budgetQueue.then(async () => {
      await ensureLoaded();
      if (!Number.isFinite(monthly) || monthly <= 0 ||
          (savings !== undefined && (!Number.isFinite(savings) || savings < 0)) ||
          !Number.isInteger(resetDay) || resetDay < 1 || resetDay > 28) throw new Error('预算输入无效');
      const st = useAppStore.getState();
      const period = toLocalDateKey().slice(0, 7);
      const current = st.getBudget(period);
      // 达到修改上限后仍可改花费上限和重置日，保留原挑战目标。
      const changed = savings !== current?.savingsGoal && (current?.savingsGoalEdits ?? 0) < 2;
      await st.setBudget(period, {
        monthlyLimit: roundMoney(monthly), carriedFrom: undefined,
        ...(changed ? { savingsGoal: savings === undefined ? undefined : roundMoney(savings), savingsGoalEdits: (current?.savingsGoalEdits ?? 0) + 1 } : {}),
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
