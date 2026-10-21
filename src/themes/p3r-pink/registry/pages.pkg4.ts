/** 工作包 4 的页面登记（只由工作包 4 修改）。key = 真实 currentPage id / INVENTORY 路由里的 pageId。 */
import type { PageRegistry } from './types';

export const pages: PageRegistry = {
  astrology: { title: '星象', load: () => import('@pink/screens/pages/Astrology.p3r') },
  statistics: { title: '统计', load: () => import('@pink/screens/pages/Statistics.p3r') },
  hideout: { title: '组织', load: () => import('@pink/screens/pages/Hideout.p3r') },
};
