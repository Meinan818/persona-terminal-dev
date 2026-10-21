/**
 * 工作包 4 的弹窗登记（只由工作包 4 的代理修改）。路由：#/overlay/<key>，key = INVENTORY 条目 id。
 */
import type { OverlayRegistry } from './types';

export const overlays: OverlayRegistry = {
  'astro-day-review': { title: '当日塔罗回看', backdrop: 'page:astrology', load: () => import('@yellow/screens/overlays/FateGlimpse.p4g').then((m) => ({ default: m.DayReview })) },
  'astro-glimpse-flow': { title: '窥探命运（长按 + 结果）', load: () => import('@yellow/screens/overlays/FateGlimpse.p4g').then((m) => ({ default: m.GlimpseFlow })) },
  'hideout-member-flip': { title: '成员牌翻面', backdrop: 'page:hideout', load: () => import('@yellow/screens/overlays/MemberCardFlip.p4g') },
  'hideout-member-menu': { title: '成员操作菜单', backdrop: 'page:hideout', load: () => import('@yellow/screens/overlays/HideoutMemberMenu.p4g') },
  'hideout-board-menus': { title: '公告板菜单 / 举报理由 / 删除确认', backdrop: 'page:hideout', load: () => import('@yellow/screens/overlays/BoardMenus.p4g') },
  'hideout-op-create': { title: '发起目标 / 作战', backdrop: 'page:hideout', load: () => import('@yellow/screens/overlays/OpCreateSheet.p4g') },
  'hideout-op-dialogs': { title: '作战菜单与确认', backdrop: 'page:hideout', load: () => import('@yellow/screens/overlays/OpsDialogs.p4g') },
  'hideout-raid': { title: '满月团战（RaidSheet）', backdrop: 'page:hideout', load: () => import('@yellow/screens/overlays/RaidSheet.p4g') },
  'hideout-borrow-mask': { title: '同调（借面具）', backdrop: 'page:hideout', load: () => import('@yellow/screens/overlays/BorrowMaskSheet.p4g') },
  'hideout-settings': { title: '据点设置', backdrop: 'page:hideout', load: () => import('@yellow/screens/overlays/OrgSettingsSheet.p4g') },
  'hideout-settings-confirm': { title: '据点设置确认框', backdrop: 'page:hideout', load: () => import('@yellow/screens/overlays/OrgSettingsSheetConfirm.p4g') },
  'hideout-titles': { title: '等级与称号', backdrop: 'page:hideout', load: () => import('@yellow/screens/overlays/OrgTitlesSheet.p4g') },
  'hideout-onboarding': { title: '建立/加入组织引导', backdrop: 'page:hideout', load: () => import('@yellow/screens/overlays/OrgOnboardingSheet.p4g') },
  'hideout-org-celebration': { title: '组织庆祝卡', backdrop: 'page:hideout', load: () => import('@yellow/screens/overlays/OrgCelebrationCutIn.p4g') },
};
