/**
 * 工作包 5 的页面登记（只由工作包 5 修改，避免并行冲突）。负责：记录（actions?tab=activities 子视图，文件 Activities.p5r.tsx，由 pkg4 的 Actions 壳 lazy 引用）、
 * 宣告卡页 callingcard（用户更正保留，v3 设计）、统计 statistics、成就 achievements（图鉴 Tab 归 pkg4，CodexTab.p5r.tsx 建好后自动接上）、逆影战场占位 battle。
 * 'activities-preview'：Actions 壳就绪前的记录子视图单独预览（#/p/activities-preview?…，参数同 actions?tab=activities），壳接好后可删。
 */
import type { PageRegistry } from './types';
import { defaultStage } from '@/p5r-red/fx/bg';
import { battleStage } from '@/p5r-red/screens/pages/Battle.stage';
import { callingCardStage } from '@/p5r-red/screens/pages/CallingCardPage.stage';

export const pages: PageRegistry = {
  battle: { title: '逆影战场', nav: 'menu', load: () => import('@/p5r-red/screens/pages/Battle.p5r'), stage: battleStage },
  callingcard: { title: '宣告卡', nav: 'actions', load: () => import('@/p5r-red/screens/pages/CallingCardPage.p5r'), stage: callingCardStage },
  statistics: { title: '统计', nav: 'menu', load: () => import('@/p5r-red/screens/pages/Statistics.p5r'), stage: (wide) => defaultStage(wide) },
  achievements: { title: '成就 · 技能', nav: 'menu', load: () => import('@/p5r-red/screens/pages/Achievements.p5r'), stage: (wide) => defaultStage(wide) },
  'activities-preview': { title: '记录（子视图预览）', nav: 'actions', load: () => import('@/p5r-red/screens/pages/Activities.p5r'), stage: (wide) => defaultStage(wide, { seed: 9, sil: 'point' }) },
};
