/**
 * 工作包 1 的页面登记（只由工作包 1 的代理修改，避免并行冲突）。
 *   dashboard   首页（#/、#/p/dashboard）
 *   boot        启动类状态页（?state=loading|stuck|error|crash|chunk），全屏无导航
 *   navigation  导航外壳核对页（底导 / 侧栏 / 轮盘 / 转场入口与再点规则）
 *   stage       页面舞台 & 背景层（装饰 / 背景动画 / 背景图）
 */
import type { PageRegistry } from './types';

export const pages: PageRegistry = {
  dashboard: { title: '首页', load: () => import('@yellow/screens/pages/Dashboard.p4g') },
  boot: { title: '启动状态', load: () => import('@yellow/screens/pages/BootLoading.p4g'), chromeless: true },
  navigation: { title: '导航外壳', load: () => import('@yellow/screens/pages/Navigation.p4g') },
  stage: { title: '舞台 & 背景层', load: () => import('@yellow/screens/pages/AppShell.p4g') },
};
