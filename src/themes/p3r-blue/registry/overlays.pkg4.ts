/** 工作包 4 的弹窗 / 演出登记（只由工作包 4 修改）。key = INVENTORY 路由 #/overlay/<key> 的 key。 */
import type { OverlayRegistry } from './types';

export const overlays: OverlayRegistry = {
  // 星象
  'astro-day-review': { title: '当日塔罗回看', load: () => import('@blue/screens/overlays/FateGlimpse.p3r').then((m) => ({ default: m.DayReview })), backdrop: 'page:astrology' },
  'astro-glimpse-flow': { title: '窥探命运', load: () => import('@blue/screens/overlays/FateGlimpse.p3r'), fullscreen: true },
  'astro-shuffle': { title: '洗牌 · 粉卡背', load: () => import('@blue/screens/overlays/ShuffleAnim.p3r'), fullscreen: true },
  'astro-card-name-reveal': { title: '牌名揭晓', load: () => import('@blue/screens/overlays/CardNameReveal.p3r'), fullscreen: true },
  'astro-thinking-circle': { title: '推理中光圈', load: () => import('@blue/screens/overlays/ThinkingCircle.p3r'), fullscreen: true },
  // 组织据点
  'hideout-member-flip': { title: '成员牌翻面', load: () => import('@blue/screens/overlays/MemberCardFlip.p3r'), backdrop: 'page:hideout' },
  'hideout-member-menu': { title: '成员操作菜单', load: () => import('@blue/screens/overlays/HideoutMemberMenu.p3r'), backdrop: 'page:hideout' },
  'hideout-board-menus': { title: '公告板菜单', load: () => import('@blue/screens/overlays/BoardMenus.p3r'), backdrop: 'page:hideout' },
  'hideout-op-create': { title: '发起目标 / 作战', load: () => import('@blue/screens/overlays/OpCreateSheet.p3r'), backdrop: 'page:hideout' },
  'hideout-op-dialogs': { title: '作战菜单与确认', load: () => import('@blue/screens/overlays/OpsDialogs.p3r'), backdrop: 'page:hideout' },
  'hideout-raid': { title: '满月团战', load: () => import('@blue/screens/overlays/RaidSheet.p3r'), backdrop: 'page:hideout' },
  'hideout-borrow-mask': { title: '同调 · 借面具', load: () => import('@blue/screens/overlays/BorrowMaskSheet.p3r'), backdrop: 'page:hideout' },
  'hideout-settings': { title: '据点设置', load: () => import('@blue/screens/overlays/OrgSettingsSheet.p3r'), backdrop: 'page:hideout' },
  'hideout-settings-confirm': { title: '据点设置确认', load: () => import('@blue/screens/overlays/OrgSettingsSheetConfirm.p3r'), backdrop: 'page:hideout' },
  'hideout-titles': { title: '等级与称号', load: () => import('@blue/screens/overlays/OrgTitlesSheet.p3r'), backdrop: 'page:hideout' },
  'hideout-onboarding': { title: '建立 / 加入组织', load: () => import('@blue/screens/overlays/OrgOnboardingSheet.p3r'), backdrop: 'page:hideout' },
};
