/**
 * 三主题共用的记账预算真实数据。
 *
 * 背景：主题包里的 LedgerStats / LedgerBudgetSheet 直接 import mock 常量
 * LEDGER_BUDGET（monthlyLimit 6000 / savingsGoal 500 / edits 1），
 * 于是不管用户真实设了多少钱，统计页都显示 6000、预算页都显示 500。
 * mock 里还有写死的月份 '2026-10' 和硬编码趋势值 [1820, 2410, 2960, 2205]。
 *
 * 这里只提供数据，不碰 JSX / 样式：
 *   · 预算 / 省钱目标 / 修改次数 / 重置日 → 真实 store（getBudget + settings）
 *   · 趋势 → 真实 entries 按月汇总
 */
import { useMemo } from 'react';
import { useAppStore, toLocalDateKey } from '@/store';
import { ledgerCycle } from '@/utils/ledgerFormat';

export interface RealBudget {
  monthlyLimit: number;
  savingsGoal: number;
  savingsGoalEdits: number;
  carriedFrom: string | undefined;
  resetDay: number;
}

export interface MonthlyExpense {
  /** 'YYYY-MM' */
  month: string;
  expense: number;
  income: number;
}

/** 当前记账周期的真实预算设置。 */
export function useRealLedgerBudget(): RealBudget {
  const getBudget = useAppStore((s) => s.getBudget);
  const settings = useAppStore((s) => s.settings);
  return useMemo(() => {
    const today = toLocalDateKey();
    const cycle = ledgerCycle(settings.ledgerPayCycleEnabled === true, settings.ledgerResetDay ?? 1, today);
    const b = getBudget(cycle.key);
    return {
      monthlyLimit: b?.monthlyLimit ?? 0,
      savingsGoal: b?.savingsGoal ?? 0,
      savingsGoalEdits: b?.savingsGoalEdits ?? 0,
      carriedFrom: b?.carriedFrom,
      resetDay: settings.ledgerResetDay ?? 1,
    };
  }, [getBudget, settings]);
}

/** 按月汇总真实流水的收支，用于趋势图（不再用写死的 1820/2410/2960/2205）。 */
export function useMonthlyLedgerTotals(): MonthlyExpense[] {
  const entries = useAppStore((s) => s.ledgerEntries);
  return useMemo(() => {
    const map = new Map<string, { expense: number; income: number }>();
    for (const e of entries) {
      const month = (e.date ?? '').slice(0, 7);
      if (!/^\d{4}-\d{2}$/.test(month)) continue;
      const cur = map.get(month) ?? { expense: 0, income: 0 };
      if (e.direction === 'expense') cur.expense += e.amount;
      else cur.income += e.amount;
      map.set(month, cur);
    }
    return [...map.entries()]
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([month, v]) => ({ month, ...v }));
  }, [entries]);
}

/** 某个月份的真实支出合计；该月没有记录时返回 0（不补 0 以外的占位值）。 */
export function useMonthlyExpense(month: string): number {
  const totals = useMonthlyLedgerTotals();
  return useMemo(() => totals.find((t) => t.month === month)?.expense ?? 0, [totals, month]);
}

