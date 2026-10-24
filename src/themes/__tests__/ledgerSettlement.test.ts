import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Budget, LedgerEntry, Settings } from '@/types';

const mockState = vi.hoisted(() => ({
  current: {} as Record<string, unknown>,
}));

vi.mock('@/store', () => ({
  useAppStore: {
    getState: () => mockState.current,
    subscribe: () => () => {},
  },
  toLocalDateKey: () => '2026-10-21',
}));

import { claimLocalSettlement, localLedgerSettlement } from '../ledgerSettlement';

const entry = (
  id: string,
  date: string,
  direction: LedgerEntry['direction'],
  amount: number,
  type?: LedgerEntry['type'],
): LedgerEntry => ({
  id,
  date,
  direction,
  amount,
  type,
  currency: 'CNY',
  source: 'manual',
  createdAt: new Date(`${date}T12:00:00`),
});

describe('theme local ledger settlement', () => {
  const entries = [
    entry('sep-exp', '2026-09-25', 'expense', 50, 'shopping'),
    entry('oct-food', '2026-10-02', 'expense', 100, 'food'),
    entry('oct-income', '2026-10-03', 'income', 300),
    entry('oct-study', '2026-10-10', 'expense', 20, 'study'),
    entry('oct-adjust', '2026-10-11', 'adjust', 5),
  ];

  const budgets: Budget[] = [
    { id: '2026-09', period: '2026-09', monthlyLimit: 100, createdAt: new Date('2026-09-01') },
    { id: '2026-10', period: '2026-10', monthlyLimit: 500, createdAt: new Date('2026-10-01') },
  ];

  const claimLedgerBudgetBonus = vi.fn(async () => true);
  const claimLedgerChallengeBonus = vi.fn(async () => 70);

  beforeEach(() => {
    claimLedgerBudgetBonus.mockClear();
    claimLedgerChallengeBonus.mockClear();
    mockState.current = {
      ledgerEntries: entries,
      ledgerLoaded: true,
      budgets,
      settings: {
        currency: 'CNY',
        ledgerPayCycleEnabled: false,
      } as Settings,
      getBudget: (period?: string) => budgets.find(b => b.period === (period ?? '2026-10')),
      claimLedgerBudgetBonus,
      claimLedgerChallengeBonus,
    };
  });

  it('uses the selected real month, actual categories and budget', () => {
    const snapshot = localLedgerSettlement('month', '2026-10');

    expect(snapshot.data.rangeStart).toBe('2026-10-01');
    expect(snapshot.data.rangeEnd).toBe('2026-10-31');
    expect(snapshot.data.totalExpense).toBe(120);
    expect(snapshot.data.totalIncome).toBe(300);
    expect(snapshot.data.periodBudget).toBe(500);
    expect(snapshot.data.byCat.map(c => [c.key, c.amount])).toEqual([
      ['food', 100],
      ['study', 20],
    ]);
    expect(snapshot.data.extremes.priciestEntry).toMatchObject({ amount: 100, key: 'food' });
    expect(snapshot.empty).toBe(false);
  });

  it('shares one in-flight claim under StrictMode-style duplicate effects', async () => {
    const snapshot = localLedgerSettlement('month', '2026-09');
    const [first, second] = await Promise.all([
      claimLocalSettlement(snapshot),
      claimLocalSettlement(snapshot),
    ]);

    expect(first).toEqual({ bonus: true, challenge: 70 });
    expect(second).toEqual(first);
    expect(claimLedgerBudgetBonus).toHaveBeenCalledTimes(1);
    expect(claimLedgerChallengeBonus).toHaveBeenCalledTimes(1);
  });

  it('uses the configured pay cycle for both totals and completed-period rewards', async () => {
    mockState.current.settings = {
      ...(mockState.current.settings as Settings),
      ledgerPayCycleEnabled: true,
      ledgerResetDay: 15,
    };
    const snapshot = localLedgerSettlement('month', '2026-09');

    expect(snapshot.data.rangeStart).toBe('2026-09-15');
    expect(snapshot.data.rangeEnd).toBe('2026-10-14');
    expect(snapshot.data.totalExpense).toBe(170);
    expect(snapshot.data.totalIncome).toBe(300);
    await expect(claimLocalSettlement(snapshot)).resolves.toEqual({ bonus: true, challenge: 70 });
    expect(claimLedgerBudgetBonus).toHaveBeenCalledWith('2026-09');
    expect(claimLedgerChallengeBonus).toHaveBeenCalledWith('2026-09');
  });
});
