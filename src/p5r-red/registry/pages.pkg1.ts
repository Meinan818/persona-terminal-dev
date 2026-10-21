/**
 * 工作包 1 的页面登记（只由工作包 1 修改，避免并行冲突）。
 * 负责：首页 dashboard、菜单 menu、启动类状态页 boot、通用状态页 states（+ 外壳 / 开屏 / 全局弹层见 overlays.pkg1.ts）。
 * 已完成：dashboard、menu、boot（#/p/boot?state=loading|stuck|error|crash|chunk）、states（#/p/states?state=lazy|local-error|empty）。
 * 字段说明见 ./types.ts；stage 写在 <Page>.stage.ts（同步加载，转场时舞台立刻就位）。
 */
import type { PageRegistry } from './types';
import { dashboardStage } from '@/p5r-red/screens/pages/DashboardP5.stage';
import { menuStage } from '@/p5r-red/screens/pages/Menu.stage';
import { defaultStage } from '@/p5r-red/fx/bg';

export const pages: PageRegistry = {
  dashboard: { title: '首页', nav: 'dashboard', flush: true, load: () => import('@/p5r-red/screens/pages/DashboardP5.p5r'), stage: dashboardStage },
  boot: { title: '启动', chromeless: true, load: () => import('@/p5r-red/screens/pages/BootLoading.p5r'), stage: (wide) => defaultStage(wide, { sil: null, seed: 23 }) },
  states: { title: '通用状态', nav: 'dashboard', load: () => import('@/p5r-red/screens/pages/States.p5r'), stage: (wide) => defaultStage(wide, { seed: 31, sil: 'cat' }) },
  menu: { title: '菜单', nav: 'menu', flush: true, load: () => import('@/p5r-red/screens/pages/Menu.p5r'), stage: menuStage },
};
