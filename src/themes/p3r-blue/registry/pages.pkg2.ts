/** 工作包 2 的页面登记（只由工作包 2 修改）。key = 真实 currentPage id / INVENTORY 路由里的 pageId。 */
import type { PageRegistry } from './types';

export const pages: PageRegistry = {
  actions: { title: '行动（记录 / 任务）', load: () => import('@blue/screens/pages/Actions.p3r') },
};
