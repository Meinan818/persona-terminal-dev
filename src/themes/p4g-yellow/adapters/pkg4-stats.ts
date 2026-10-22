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
import { useMemo } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { toLocalDateKey } from '@/store';
import type { AttributeId } from '@/types';

/** 真实统计活动：从 store activities 映射 { date, pts } */
export function useStatActivities(): StatActivity[] {
  const activities = useAppStore((s) => s.activities);
  return activities.map((a) => ({
    date: a.date instanceof Date ? a.date.toISOString().slice(0, 10) : String(a.date).slice(0, 10),
    pts: a.pointsAwarded,
  }));
}

export function useStatisticsData() {
  const { activities, attributes, achievements, skills, attributeNames } = useAppStore(useShallow((s) => ({
    activities: s.activities,
    attributes: s.attributes,
    achievements: s.achievements,
    skills: s.skills,
    attributeNames: s.settings.attributeNames,
  })));
  return useMemo(() => ({
    ACTIVITIES: activities.map((a) => ({ date: toLocalDateKey(new Date(a.date)), pts: a.pointsAwarded })),
    ATTR_LEVELS: Object.fromEntries(attributes.map((a) => [a.id, a.level])) as Record<AttributeId, number>,
    ACHIEVEMENTS: { unlocked: achievements.filter((a) => a.unlocked).length, total: achievements.length },
    SKILLS: { unlocked: skills.filter((s) => s.unlocked).length, total: skills.length },
    ATTR_NAMES: { ...attributeNames } as Record<AttributeId, string>,
  }), [activities, attributes, achievements, skills, attributeNames]);
}
