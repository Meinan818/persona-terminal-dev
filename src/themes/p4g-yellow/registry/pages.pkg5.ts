/**
 * 工作包 5 的页面登记（只由工作包 5 的代理修改）。
 */
import type { PageRegistry } from './types';

export const pages: PageRegistry = {
  ledger: { title: '心相记账', load: () => import('@yellow/screens/pages/Ledger.p4g') },
  menu: { title: '菜单', load: () => import('@yellow/screens/pages/Menu.p4g') },
  account: { title: '账号与数据', load: () => import('@yellow/screens/pages/Account.p4g') },
  achievements: { title: '成就', load: () => import('@yellow/screens/pages/Achievements.p4g') },
  'reset-password': { title: '重置密码', load: () => import('@yellow/screens/pages/ResetPasswordPage.p4g'), chromeless: true },
};
