/** 工作包 6 的页面登记（只由工作包 6 修改）。key = 真实 currentPage id / INVENTORY 路由里的 pageId。 */
import type { PageRegistry } from './types';

export const pages: PageRegistry = {
  settings: { title: '设置', load: () => import('@pink/screens/pages/Settings.p3r') },
  states: { title: '通用状态（加载 / 局部错误 / 空状态）', load: () => import('@pink/screens/pages/States.p3r') },
};
