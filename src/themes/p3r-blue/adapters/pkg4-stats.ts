/**
 * 数据适配层：pkg4-stats
 * 初始状态 = 原样转发 demo 假数据（外观与 demo 完全一致，用来先验收版式）。
 * 接真实数据时：在下面「真实数据覆盖区」写同名导出覆盖掉 mock 的同名导出（ES 规则：本文件显式导出优先于 export *）。
 * 规则：只在这里接 store / utils，不改 screens/ 里的 JSX、className、style、动画。
 */
export * from '../mock/pkg4-stats';

// ───── 真实数据覆盖区（按 INTEGRATE-THEMES.md 第 6 步填写）─────
import { useAppStore } from '@/store';
import type { StatActivity } from '../mock/pkg4-stats';

/** 真实统计活动：从 store activities 映射 { date, pts } */
export function useStatActivities(): StatActivity[] {
  const activities = useAppStore((s) => s.activities);
  return activities.map((a) => ({
    date: a.date instanceof Date ? a.date.toISOString().slice(0, 10) : String(a.date).slice(0, 10),
    pts: a.pointsAwarded,
  }));
}