export * from '../mock/pkg5';

// ───── 真实数据覆盖区（按 INTEGRATE-THEMES.md 第 6 步填写）─────
import { useEffect, useMemo } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { useAppStore, toLocalDateKey } from '@/store';
import type { LedgerEntry } from '@/types';

// A 类：只转发纯计算/格式化函数（真实仓库同名、同签名、同返回结构）
// catMeta / INCOME_META 不转发：真实版返回结构不同（没有 demo 用的 color 字段），图标/颜色属于设计，保留 demo 版
// fmtSigned 不转发：真实版第二参数必填，demo 有默认值
export { CATEGORY_KEYS, isGrowthCategory, fmtMoney, fmtPlain, roundMoney, sanitizeMoneyInput, moneyFromInput, DEFAULT_CHANNELS, DEFAULT_INCOME_SOURCES, incomeTypeFromSource, isDebtAccount, shiftMonth, monthLabel, weekdayCN, ledgerDateLabel } from '@/utils/ledgerFormat';
// mock 的 daysAgoKey 以固定的 2026-10-20 为"今天" → 用真实今天重写同名函数
export const daysAgoKey = (n: number) => { const d = new Date(); d.setDate(d.getDate() - n); return toLocalDateKey(d); };

// B 类：用户数据 → hook，返回值的键名 = 原 mock 导出名
export function useLedgerData() {
  const { entries, budgets, loaded } = useAppStore(useShallow((s) => ({ entries: s.ledgerEntries, budgets: s.budgets, loaded: s.ledgerLoaded })));
  useEffect(() => { if (!loaded) void useAppStore.getState().loadLedger(); }, [loaded]);
  const getAccountBalances = useAppStore((s) => s.getAccountBalances);
  const getSavings = useAppStore((s) => s.getSavings);
  const getBudget = useAppStore((s) => s.getBudget);
  return useMemo(() => {
    const today = toLocalDateKey();
    const b = getBudget(today.slice(0, 7));
    return {
      LEDGER_ENTRIES: entries as LedgerEntry[],
      LEDGER_ACCOUNTS: getAccountBalances(),
      LEDGER_BUDGET: { monthlyLimit: b?.monthlyLimit ?? 0, savingsGoal: b?.savingsGoal ?? 0, savingsGoalEdits: b?.savingsGoalEdits ?? 0, carriedFrom: b?.carriedFrom },
      LEDGER_SAVINGS: getSavings(),
      P5_TODAY: today,
      CURRENT_MONTH: today.slice(0, 7),
      LEDGER_LOADED: loaded,
    };
  }, [entries, budgets, loaded, getAccountBalances, getSavings, getBudget]);
}

// C 类：操作
type AddInput = Parameters<ReturnType<typeof useAppStore.getState>['addLedgerEntry']>[0];
export const ledgerOps = {
  remove: (id: string) => useAppStore.getState().deleteLedgerEntry(id),
  add: (input: AddInput) => useAppStore.getState().addLedgerEntry(input),
};

// mock 的 P5_TODAY 固定为 2026-10-20（模块顶层被 LedgerEntrySheet 的 emptyDraft 等使用，不能走 hook）→ 同名常量覆盖成真实今天
export const P5_TODAY = toLocalDateKey();
