export * from '../mock/pkg5';

// ───── 真实数据覆盖区（按 INTEGRATE-THEMES.md 第 6 步填写）─────
import { THEME_SWATCHES } from '../mock/pkg5';
export { useCloudUser, useCodexCollections, useRealCodex, useAchievementProgressMap, useTarotCollectedMap, useSeasonCollectedMap } from '@/themes/astrologyData';

/** 真实五维：从 store 读，用户未建档时空数组 */
export function useRealAttributes() {
  const attributes = useAppStore((s) => s.attributes);
  return useMemo(() => attributes as Attribute[], [attributes]);
}
import { useEffect, useMemo } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { useAppStore, toLocalDateKey } from '@/store';
import type { LedgerEntry, Attribute } from '@/types';
import { calcCurrentStreak, streakDates } from '@/utils/streak';
import type { User } from '@/types';
import { useCloudUser } from '@/themes/astrologyData';

export function useAccountData() {
  const attributes = useAppStore((s) => s.attributes);
  const { cloudUser, cloudEnabled } = useCloudUser();
  const { TOTAL_LEVEL, TOTAL_POINTS } = useMenuData();
  return useMemo(() => ({
    ATTRIBUTES: attributes as Attribute[],
    CLOUD_USER: {
      username: String(cloudUser?.userId ?? ''),
      email: String((cloudUser as unknown as { email?: string } | null)?.email ?? cloudUser?.nickname ?? ''),
    },
    SIGNED_IN: !!cloudUser,
    CLOUD_ENABLED: !!cloudEnabled,
    TOTAL_LEVEL,
    TOTAL_POINTS,
  }), [attributes, cloudUser, cloudEnabled, TOTAL_LEVEL, TOTAL_POINTS]);
}

// A 类：只转发纯计算/格式化函数（真实仓库同名、同签名、同返回结构）
// catMeta / INCOME_META 不转发：真实版返回结构不同（没有 demo 用的 color 字段），图标/颜色属于设计，保留 demo 版
// fmtSigned 不转发：真实版第二参数必填，demo 有默认值
export { CATEGORY_KEYS, isGrowthCategory, fmtMoney, fmtPlain, roundMoney, sanitizeMoneyInput, moneyFromInput, DEFAULT_CHANNELS, DEFAULT_INCOME_SOURCES, incomeTypeFromSource, isDebtAccount, shiftMonth, monthLabel, weekdayCN, ledgerDateLabel } from '@/utils/ledgerFormat';
// mock 的 daysAgoKey 以固定的 2026-10-20 为"今天" → 用真实今天重写同名函数
export const daysAgoKey = (n: number) => { const d = new Date(); d.setDate(d.getDate() - n); return toLocalDateKey(d); };

// B 类：用户数据 → hook，返回值的键名 = 原 mock 导出名
/** 菜单 / 学生证：总等级、总点数、连续天数、当前用户。 */
export function useMenuData() {
  const { user, attributes, activities } = useAppStore(useShallow((s) => ({ user: s.user, attributes: s.attributes, activities: s.activities })));
  return useMemo(() => ({
    USER: (user ?? { id: '', name: '', createdAt: new Date(2025, 0, 1), theme: 'yellow' }) as User,
    TOTAL_LEVEL: attributes.reduce((s, a) => s + a.level, 0),
    TOTAL_POINTS: attributes.reduce((s, a) => s + a.points, 0),
    CURRENT_STREAK: calcCurrentStreak(streakDates(activities), new Date()),
    THEME_SWATCHES,
  }), [user, attributes, activities]);
}

export function useLedgerData() {
  const { entries, budgets, loaded, assets, settings } = useAppStore(useShallow((s) => ({ entries: s.ledgerEntries, budgets: s.budgets, loaded: s.ledgerLoaded, assets: s.assets, settings: s.settings })));
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
      LEDGER_ASSETS: assets,
      LEDGER_RESET_DAY: settings.ledgerResetDay ?? 1,
      ADJUST_LEFT: Math.max(0, 3 - useAppStore.getState().getAdjustCountThisMonth()),
    };
  }, [entries, budgets, loaded, assets, settings, getAccountBalances, getSavings, getBudget]);
}

// C 类：操作
export { ledgerOps } from '@/themes/ledgerOperations';

// mock 的 P5_TODAY 固定为 2026-10-20（模块顶层被 LedgerEntrySheet 的 emptyDraft 等使用，不能走 hook）→ 同名常量覆盖成真实今天
export const P5_TODAY = toLocalDateKey();
