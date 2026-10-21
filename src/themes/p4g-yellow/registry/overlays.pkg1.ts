/**
 * 工作包 1 的弹窗登记（只由工作包 1 的代理修改）。路由：#/overlay/<key>，key = INVENTORY 里的路由 id。
 */
import type { OverlayRegistry } from './types';

export const overlays: OverlayRegistry = {
  // 开屏 & 启动
  'boot-splash-p4': { title: '开屏 · 黄色警戒线（?state=reduced 安全模式）', load: () => import('@yellow/screens/overlays/SplashScreen.p4g') },
  'boot-splash-velvet': { title: '开屏 · MASKARIA 默认（点击跳过）', load: () => import('@yellow/screens/overlays/VelvetRoomSplash.p4g') },
  'boot-watchdog-banner': { title: '启动看门狗横幅', load: () => import('@yellow/screens/overlays/BootBanners.p4g'), backdrop: 'page:dashboard' },
  'boot-stale-reset-banner': { title: '旧版重置密码链接横幅', load: () => import('@yellow/screens/overlays/BootBanners.p4g').then((m) => ({ default: m.StaleResetBannerOverlay })), backdrop: 'page:dashboard' },
  'boot-welcome': { title: '欢迎引导（?step=welcome|name|preset|customize|done|guide|blessing|import）', load: () => import('@yellow/screens/overlays/WelcomeModal.p4g') },
  // 导航外壳
  'shell-radial-wheel': { title: '长按轮盘（?state=reduced 低动效垂直菜单）', load: () => import('@yellow/screens/overlays/RadialQuickNav.p4g'), backdrop: 'page:dashboard' },
  'shell-transition-wedge': { title: '重转场 · P4 楔形切台', load: () => import('@yellow/screens/overlays/HeavyTransition.p4g') },
  'shell-transition-water': { title: '重转场 · 底栏涨潮（黄方块）', load: () => import('@yellow/screens/overlays/HeavyTransition.p4g').then((m) => ({ default: m.WaterRippleOverlay })) },
  // 首页
  'home-season-stamp': { title: '岁时小签 + 气泡', load: () => import('@yellow/screens/overlays/SeasonStampBadge.p4g') },
  'home-onthisday-sheet': { title: '当年今日抽屉', load: () => import('@yellow/screens/overlays/OnThisDaySheet.p4g'), backdrop: 'page:dashboard' },
  'home-urgent-toast': { title: '临期 Toast', load: () => import('@yellow/screens/overlays/DashboardToasts.p4g'), backdrop: 'page:dashboard' },
  'home-decay-modal': { title: '逆流侵蚀通知弹窗', load: () => import('@yellow/screens/overlays/DashboardDecayModal.p4g'), backdrop: 'page:dashboard' },
  // 成长庆祝
  'global-levelup': { title: '升级 Cut-in（?variant=mastery）', load: () => import('@yellow/screens/overlays/LevelUpModal.p4g'), backdrop: 'page:dashboard' },
  'global-achievement-unlock': { title: '成就解锁 Cut-in', load: () => import('@yellow/screens/overlays/AchievementUnlockModal.p4g'), backdrop: 'page:dashboard' },
  'global-skill-unlock': { title: '技能解锁 Cut-in', load: () => import('@yellow/screens/overlays/SkillUnlockModal.p4g'), backdrop: 'page:dashboard' },
  'global-todo-complete': { title: '今日完成 Cut-in（?variant=unlock）', load: () => import('@yellow/screens/overlays/TodoCompleteModal.p4g'), backdrop: 'page:dashboard' },
  'global-celebration-base': { title: '庆祝贴纸基座（?variant=ledger|weekly|org|plain）', load: () => import('@yellow/screens/overlays/CelebrationCutIn.p4g'), backdrop: 'page:dashboard' },
};
