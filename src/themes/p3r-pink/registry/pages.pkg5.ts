/** 工作包 5 的页面登记（只由工作包 5 修改）。key = 真实 currentPage id / INVENTORY 路由里的 pageId。 */
import type { PageRegistry } from './types';

export const pages: PageRegistry = {
  ledger: { title: '心相记账', load: () => import('@pink/screens/pages/Ledger.p3r') },
  menu: { title: '菜单', load: () => import('@pink/screens/pages/Menu.p3r') },
  account: { title: '账号与数据', load: () => import('@pink/screens/pages/Account.p3r') },
  'reset-password': { title: '重置密码', load: () => import('@pink/screens/pages/ResetPasswordPage.p3r'), chromeless: true },
  achievements: { title: '成就·技能', load: () => import('@pink/screens/pages/Achievements.p3r') },
  // 用户追加：宣告卡总览（真实 app 暂无），入口 = 菜单「宣告卡」
  'calling-cards': { title: '宣告卡', load: () => import('@pink/screens/pages/CallingCards.p3r') },
};
