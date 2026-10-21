/**
 * 工作包 6 的页面登记（只由工作包 6 的代理修改，避免并行冲突）。
 */
import type { PageRegistry } from './types';

export const pages: PageRegistry = {
  settings: { title: '设置', load: () => import('@yellow/screens/pages/Settings.p4g') },
  states: { title: '通用状态（加载 / 局部错误 / 空状态）', load: () => import('@yellow/screens/pages/States.p4g') },
};
