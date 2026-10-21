/**
 * 工作包 2 的页面登记（行动：记录 / 任务 / 愿望 / 大事 / 总结）。
 * actions = 真实 currentPage 'actions'（旧 id todos / activities 由外壳 normalizePage 归一到 ?tab=）。
 */
import type { PageRegistry } from './types';

export const pages: PageRegistry = {
  actions: { title: '行动', load: () => import('@yellow/screens/pages/Actions.p4g') },
  // 宣告卡总览页（真实暂无，用户决定三色都加；菜单「占卜」之后进入）
  callingcard: { title: '宣告卡', load: () => import('@yellow/screens/pages/CallingCardBoard.p4g') },
};
