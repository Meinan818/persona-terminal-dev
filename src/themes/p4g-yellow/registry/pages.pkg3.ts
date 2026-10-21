/**
 * 工作包 3 的页面登记（只由工作包 3 的代理修改，避免并行冲突）。
 * cooperation：羁绊 · 同伴（?view=list|wall&filter=&state=empty|loading|error；?tab=org → 组织据点）
 */
import type { PageRegistry } from './types';

export const pages: PageRegistry = {
  cooperation: { title: '羁绊 · 同伴', load: () => import('@yellow/screens/pages/Cooperation.p4g') },
};
