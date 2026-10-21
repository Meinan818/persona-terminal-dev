/**
 * 工作包 4 的页面登记（只由工作包 4 的代理修改，避免并行冲突）。
 */
import type { PageRegistry } from './types';

export const pages: PageRegistry = {
  astrology: { title: '星象', load: () => import('@yellow/screens/pages/Astrology.p4g') },
  statistics: { title: '统计', load: () => import('@yellow/screens/pages/Statistics.p4g') },
  hideout: { title: '组织据点', load: () => import('@yellow/screens/pages/Hideout.p4g') },
};
