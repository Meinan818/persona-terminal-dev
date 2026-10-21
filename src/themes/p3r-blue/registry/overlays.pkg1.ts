/** 工作包 1 的弹窗 / 演出登记（只由工作包 1 修改）。key = INVENTORY 路由 #/overlay/<key> 的 key。 */
import type { OverlayRegistry } from './types';

export const overlays: OverlayRegistry = {
  // 开屏 / 启动
  'boot-splash-p3': { title: '开屏 · 深夜月光录', load: () => import('@blue/screens/overlays/SplashScreen.p3r'), fullscreen: true },
  'boot-splash-velvet': { title: '开屏 · 天鹅绒房间', load: () => import('@blue/screens/overlays/VelvetRoomSplash.p3r'), fullscreen: true },
  'boot-welcome': { title: '欢迎引导', load: () => import('@blue/screens/overlays/WelcomeModal.p3r'), fullscreen: true },
  'home-brand-title': { title: '品牌标题揭示 / 品牌 Logo', load: () => import('@blue/screens/overlays/BrandTitleReveal.p3r'), fullscreen: true },
  'shell-radial-wheel': { title: '长按轮盘（分阶段）', load: () => import('@blue/screens/overlays/RadialQuickNav.p3r'), backdrop: 'page:dashboard' },
  // 成长庆祝
  'global-levelup': { title: '属性升级 LEVEL UP', load: () => import('@blue/screens/overlays/LevelUpModal.p3r'), backdrop: 'page:dashboard' },
  'global-achievement-unlock': { title: '成就解锁 Cut-in', load: () => import('@blue/screens/overlays/AchievementUnlockModal.p3r'), backdrop: 'page:dashboard' },
  'global-skill-unlock': { title: '技能解锁 Cut-in', load: () => import('@blue/screens/overlays/SkillUnlockModal.p3r'), backdrop: 'page:dashboard' },
  'global-todo-complete': { title: '今日完成 Cut-in', load: () => import('@blue/screens/overlays/TodoCompleteModal.p3r'), backdrop: 'page:dashboard' },
  'global-celebration-base': { title: '庆祝基座 CelebrationCutIn', load: () => import('@blue/screens/overlays/CelebrationCutIn.p3r'), backdrop: 'page:dashboard' },
  // 首页弹层
  'home-season-stamp': { title: '岁时小签 + 气泡', load: () => import('@blue/screens/overlays/SeasonStampBadge.p3r'), backdrop: 'page:dashboard' },
  'home-onthisday-sheet': { title: '当年今日抽屉', load: () => import('@blue/screens/overlays/OnThisDaySheet.p3r'), backdrop: 'page:dashboard' },
  'home-urgent-toast': { title: '临期 Toast', load: () => import('@blue/screens/overlays/DashboardToasts.p3r'), backdrop: 'page:dashboard' },
  'home-decay-modal': { title: '逆流侵蚀通知', load: () => import('@blue/screens/overlays/DashboardDecayModal.p3r'), backdrop: 'page:dashboard' },
  // 启动横幅
  'boot-watchdog-banner': { title: '启动看门狗横幅', load: () => import('@blue/screens/overlays/BootBanners.p3r').then((m) => ({ default: m.WatchdogOverlay })), backdrop: 'page:dashboard' },
  'boot-stale-reset-banner': { title: '旧版重置密码链接横幅', load: () => import('@blue/screens/overlays/BootBanners.p3r').then((m) => ({ default: m.StaleResetOverlay })), backdrop: 'page:dashboard' },
  // 转场
  'shell-transition-wave': { title: '重转场 · 玻璃碎裂 / 页面入场', load: () => import('@blue/screens/overlays/HeavyTransition.p3r').then((m) => ({ default: m.WaveDemo })), fullscreen: true },
  'shell-transition-water': { title: '重转场 · 底栏波形圆 / 双圆遮罩', load: () => import('@blue/screens/overlays/HeavyTransition.p3r').then((m) => ({ default: m.WaterDemo })), fullscreen: true },
};
