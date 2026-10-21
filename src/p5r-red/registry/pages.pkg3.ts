/**
 * 工作包 3 的页面登记（只由工作包 3 修改，避免并行冲突）。负责：羁绊 cooperation、据点 hideout
 * 页面 id = 真实 currentPage；文件 src/screens/pages/<真实组件名>.p5r.tsx；子视图 / 状态用 ?tab=&view=&state= 切换。
 * 字段说明见 ./types.ts；stage 写在 <Page>.stage.ts。
 */
import type { PageRegistry } from './types';
import { cooperationStage } from '@/p5r-red/screens/pages/Cooperation.stage';
import { hideoutStage } from '@/p5r-red/screens/pages/Hideout.stage';

export const pages: PageRegistry = {
  cooperation: { title: '羁绊', nav: 'cooperation', load: () => import('@/p5r-red/screens/pages/Cooperation.p5r'), stage: cooperationStage },
  hideout: { title: '据点', nav: 'cooperation', load: () => import('@/p5r-red/screens/pages/Hideout.p5r'), stage: hideoutStage },
};
