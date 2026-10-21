/** 工作包 3 的页面登记（只由工作包 3 修改）。key = 真实 currentPage id / INVENTORY 路由里的 pageId。 */
import type { PageRegistry } from './types';

export const pages: PageRegistry = {
  cooperation: { title: '同伴（羁绊）', load: () => import('@pink/screens/pages/Cooperation.p3r') },
};
