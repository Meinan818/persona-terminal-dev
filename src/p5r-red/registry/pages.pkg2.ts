/**
 * 工作包 2 的页面登记（只由工作包 2 修改，避免并行冲突）。负责：设置 settings、账号 account、重置密码 reset-password（#/p/reset-password，P1-15）
 * 页面 id = 真实 currentPage；文件 src/screens/pages/<真实组件名>.p5r.tsx；子视图 / 状态用 ?tab=&view=&state= 切换。
 */
import type { PageRegistry } from './types';
import { settingsStage } from '@/p5r-red/screens/pages/Settings.stage';
import { accountStage } from '@/p5r-red/screens/pages/Account.stage';
import { resetPasswordStage } from '@/p5r-red/screens/pages/ResetPasswordPage.stage';

export const pages: PageRegistry = {
  settings: { title: '设置', nav: 'menu', load: () => import('@/p5r-red/screens/pages/Settings.p5r'), stage: settingsStage },
  account: { title: '账号与数据', nav: 'menu', load: () => import('@/p5r-red/screens/pages/Account.p5r'), stage: accountStage },
  'reset-password': { title: '重置密码', chromeless: true, load: () => import('@/p5r-red/screens/pages/ResetPasswordPage.p5r'), stage: resetPasswordStage },
};
