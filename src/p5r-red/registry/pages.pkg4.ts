/**
 * 工作包 4 的页面登记（只由工作包 4 修改，避免并行冲突）。负责：行动 actions（?tab=todos 任务子视图归 pkg4；?tab=activities 记录子视图归 pkg5，同一页面文件 Actions.p5r.tsx 由 pkg4 建壳）、星象 astrology、记账 ledger
 * 页面 id = 真实 currentPage；文件 src/screens/pages/<真实组件名>.p5r.tsx；子视图 / 状态用 ?tab=&view=&state= 切换。
 * 字段说明见 ./types.ts；stage 写在 <Page>.stage.ts。
 */
import type { PageRegistry } from './types';
import { actionsStage } from '@/p5r-red/screens/pages/Actions.stage';
import { astrologyStage } from '@/p5r-red/screens/pages/Astrology.stage';
import { ledgerStage } from '@/p5r-red/screens/pages/Ledger.stage';

export const pages: PageRegistry = {
  astrology: { title: '星象', nav: 'dashboard', load: () => import('@/p5r-red/screens/pages/Astrology.p5r'), stage: astrologyStage },
  ledger: { title: '心相记账', nav: 'ledger', load: () => import('@/p5r-red/screens/pages/Ledger.p5r'), stage: ledgerStage },
  actions: { title: '行动', nav: 'actions', load: () => import('@/p5r-red/screens/pages/Actions.p5r'), stage: actionsStage },
};
