/** 工作包 1 的页面登记（只由工作包 1 修改）。key = 真实 currentPage id / INVENTORY 路由里的 pageId。 */
import type { PageRegistry } from './types';

export const pages: PageRegistry = {
  dashboard: { title: '首页', load: () => import('@blue/screens/pages/Dashboard.p3r') },
  boot: { title: '启动 · 加载 / 看门狗 / 出错', load: () => import('@blue/screens/pages/BootLoading.p3r'), chromeless: true },
};
