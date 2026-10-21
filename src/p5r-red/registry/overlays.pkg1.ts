/**
 * 工作包 1 的弹层登记（只由工作包 1 修改）。负责：开屏&启动 / 导航外壳 / 首页 / 菜单子页 / 全局弹窗&Toast&Cut-in（宣告卡结算、
 * 大事/愿望/回归类 Cut-in 归 pkg4/5，见 inventory-split.json）+ fxCatalog 里 pkg=1 的演出。
 * key = inventory id 或 fx id（路由 #/overlay/<key>）；同一组件的多个条目用 params 区分。
 */
import type { OverlayRegistry } from './types';

const wheel = () => import('@/p5r-red/screens/overlays/RadialQuickNav.p5r');
const trans = () => import('@/p5r-red/screens/overlays/FxTransitions.p5r');
const dfx = () => import('@/p5r-red/screens/overlays/DashboardFx.p5r');
const toasts = () => import('@/p5r-red/screens/overlays/DashboardToasts.p5r');
const decay = () => import('@/p5r-red/screens/overlays/DashboardDecayModal.p5r');
const splash = () => import('@/p5r-red/screens/overlays/SplashScreen.p5r');
const velvet = () => import('@/p5r-red/screens/overlays/VelvetRoomSplash.p5r');
const banners = () => import('@/p5r-red/screens/overlays/BootBanners.p5r');
const welcome = () => import('@/p5r-red/screens/overlays/WelcomeModal.p5r');
const season = () => import('@/p5r-red/screens/overlays/SeasonStampBadge.p5r');
const otd = () => import('@/p5r-red/screens/overlays/OnThisDaySheet.p5r');
const profile = () => import('@/p5r-red/screens/overlays/UserProfileCard.p5r');
const themeSheet = () => import('@/p5r-red/screens/overlays/MenuThemeSheet.p5r');
const aboutSheet = () => import('@/p5r-red/screens/overlays/MenuAboutSheet.p5r');
const backToast = () => import('@/p5r-red/screens/overlays/GlobalToasts.p5r');
const pwa = () => import('@/p5r-red/screens/overlays/PWAUpdateToast.p5r');
const levelUp = () => import('@/p5r-red/screens/overlays/LevelUpModal.p5r');
const todoDone = () => import('@/p5r-red/screens/overlays/TodoCompleteModal.p5r');
const achUnlock = () => import('@/p5r-red/screens/overlays/AchievementUnlockModal.p5r');
const skillUnlock = () => import('@/p5r-red/screens/overlays/SkillUnlockModal.p5r');
const celeb = () => import('@/p5r-red/screens/overlays/CelebrationCutIn.p5r');
const orphan = () => import('@/p5r-red/screens/overlays/OrphanImagesPrompt.p5r');
const crop = () => import('@/p5r-red/screens/overlays/ImageCropDialog.p5r');
const danmaku = () => import('@/p5r-red/screens/overlays/DanmakuLayer.p5r');
const brand = () => import('@/p5r-red/screens/overlays/BrandTitleReveal.p5r');
const gallery = () => import('@/p5r-red/screens/overlays/CutInGallery.p5r');
const thinking = () => import('@/p5r-red/screens/overlays/ThinkingCircle.p5r');
const aiSummary = () => import('@/p5r-red/screens/overlays/AISummaryStream.p5r');
const fxQueue = () => import('@/p5r-red/screens/overlays/DashboardFxQueue.p5r');

export const overlays: OverlayRegistry = {
  // ── 开屏&启动 ──
  'boot-splash-p5': { title: '开屏 · P5 Splash（雷电斜刀 + 剪报标题）', load: splash, params: { style: 'p5' }, ms: 3100 },
  'boot-splash-velvet': { title: '开屏 · 天鹅绒房间 VelvetRoomSplash', load: velvet, ms: 4500 },
  'boot-watchdog-banner': { title: '启动看门狗横幅（安全模式提示）', load: banners, params: { variant: 'watchdog' }, backdrop: 'page:dashboard' },
  'boot-stale-reset-banner': { title: '旧版重置密码链接横幅', load: banners, params: { variant: 'stale' }, backdrop: 'page:dashboard' },
  'boot-welcome': { title: '欢迎引导 WelcomeModal（8 屏）', load: welcome },
  // ── 导航外壳 ──
  'shell-radial-wheel': { title: '长按轮盘（RadialQuickNav + RadialWheelP5 七碑牌）', load: wheel, backdrop: 'page:dashboard' },
  'shell-transition-wedge': { title: '重转场 · 星形反撕', load: trans, params: { variant: 'wedge' }, backdrop: 'page:dashboard' },
  'shell-transition-water': { title: '重转场 · 水波纹 + 圆形揭示', load: trans, params: { variant: 'water' }, backdrop: 'page:dashboard' },
  // ── 首页 ──
  'home-urgent-toast': { title: '临期 Toast', load: toasts, backdrop: 'page:dashboard' },
  'home-decay-modal': { title: '逆流侵蚀通知', load: decay, backdrop: 'page:dashboard' },
  'home-season-stamp': { title: '岁时小签 + 气泡（SeasonStampBadge）', load: season },
  'home-onthisday-sheet': { title: '一年前的今天 OnThisDaySheet', load: otd, backdrop: 'page:dashboard' },
  'home-fx-queue': { title: '首页真实演出队列（今日完成 → 升级/精通 → 成就/技能）', load: fxQueue, backdrop: 'page:dashboard', ms: 13000 },
  // ── 菜单子页 ──
  'menu-profile-sheet': { title: '用户资料抽屉（UserProfileCard）', load: profile, backdrop: 'page:menu' },
  'menu-theme-sheet': { title: '主题抽屉', load: themeSheet, backdrop: 'page:menu' },
  'menu-about-sheet': { title: '关于抽屉', load: aboutSheet, backdrop: 'page:menu' },
  // ── 全局弹窗 & Toast & Cut-in ──
  'global-back-toast': { title: '返回键 Toast「再次点击回到现实」', load: backToast, backdrop: 'page:dashboard' },
  'global-pwa-toast': { title: '新版本提示 PWAUpdateToast', load: pwa, backdrop: 'page:dashboard' },
  'global-levelup': { title: '升级 Cut-in LevelUpP5', load: levelUp },
  'global-achievement-unlock': { title: '成就解锁 Cut-in UnlockCutInP5', load: achUnlock },
  'global-skill-unlock': { title: '技能解锁 Cut-in', load: skillUnlock },
  'global-todo-complete': { title: '今日完成 Cut-in TodoCompleteP5', load: todoDone },
  'global-celebration-base': { title: '庆祝贴纸基座 CelebrationCutIn', load: celeb },
  'global-orphan-images': { title: '孤儿配图询问 OrphanImagesPrompt', load: orphan },
  'global-image-crop': { title: '图片裁切 ImageCropDialog', load: crop },
  'global-danmaku-layer': { title: '弹幕层 DanmakuLayer', load: danmaku },
  'global-brand-title': { title: '品牌标题揭示 BrandTitleReveal（红版）', load: brand },
  // ── 全局基座 ──
  'global-confirm-dialog': { title: '确认框 ConfirmDialog', load: () => import('@/p5r-red/screens/overlays/ConfirmDialog.p5r') },
  'global-action-sheet': { title: 'ActionSheet 基座', load: () => import('@/p5r-red/screens/overlays/ActionSheet.p5r') },
  'global-sheet-modal': { title: 'SheetModal 基座（底部 / 居中）', load: () => import('@/p5r-red/screens/overlays/SheetModal.p5r') },
  // ── 演出（fxCatalog，pkg1 已完成项） ──
  'fx-wedge': { title: '重转场 · 星形反撕', load: trans, params: { variant: 'wedge' }, backdrop: 'page:dashboard' },
  'fx-water': { title: '重转场 · 水波纹 + 圆形揭示', load: trans, params: { variant: 'water' }, backdrop: 'page:dashboard' },
  'fx-circle-reveal': { title: '页面圆形揭示（transform/opacity）', load: trans, params: { variant: 'circle' }, backdrop: 'page:dashboard' },
  'fx-wheel': { title: '长按轮盘展开 RadialWheelP5', load: wheel, backdrop: 'page:dashboard' },
  'fx-wheel-d0': { title: '轮盘 · 低动效纵向菜单', load: wheel, params: { state: 'reduced' }, backdrop: 'page:dashboard' },
  'fx-flower-zoom': { title: '人格星象 · 雷达星旋转 → 原地档案', load: dfx, params: { variant: 'flower' } },
  'fx-sky-flip': { title: '天空位 · 月相⇄天气翻牌', load: dfx, params: { variant: 'sky' } },
  'fx-ritual-stack': { title: '今日仪式横滑轮播', load: dfx, params: { variant: 'ritual' } },
  'fx-countercurrent': { title: '逆流预警仪式卡', load: dfx, params: { variant: 'countercurrent' } },
  'fx-urgent-toast': { title: '临期 Toast', load: toasts, backdrop: 'page:dashboard' },
  'fx-decay': { title: '逆流侵蚀通知', load: decay, backdrop: 'page:dashboard' },
  'fx-splash-p4': { title: '开屏 · P5 Splash', load: splash, params: { style: 'p5' }, ms: 3100 },
  'fx-splash-reduced': { title: '开屏 · 安全模式轻开屏（s ≤ 0.35）', load: splash, params: { style: 'p5', state: 'reduced' }, ms: 1400 },
  'fx-splash-velvet': { title: '开屏 · 天鹅绒房间', load: velvet, ms: 4500 },
  'fx-brand-title': { title: '品牌标题揭示 BrandTitleReveal', load: brand },
  'fx-welcome-blessing': { title: '欢迎引导 · 馆长的赐福（收尾演出）', load: welcome, params: { step: 'blessing', variant: 'fin' } },
  'fx-levelup': { title: '属性升级 LevelUpP5', load: levelUp },
  'fx-levelup-mastery': { title: '精通提升 ★', load: levelUp, params: { variant: 'mastery' } },
  'fx-todo-complete': { title: '今日完成 TodoCompleteP5（音符雨）', load: todoDone },
  'fx-todo-complete-unlock': { title: '今日完成 · 解锁提示', load: todoDone, params: { variant: 'unlock' } },
  'fx-achievement': { title: '成就解锁 UnlockCutInP5', load: achUnlock },
  'fx-skill': { title: '技能解锁', load: skillUnlock },
  'fx-celebration-base': { title: '庆祝基座 CelebrationCutIn', load: celeb },
  'fx-season-stamp': { title: '岁时小签 + 气泡', load: season },
  'fx-danmaku': { title: '弹幕层', load: danmaku },
  'red-cutin-gallery': { title: 'Cut-in 总览 + CutInBackdrop 四纹理', load: gallery },
  'red-thinking': { title: '思索环 ThinkingCircle', load: thinking },
  'red-ai-summary': { title: 'AI 逐字 · 成长总结（生成 → 流式）', load: aiSummary },
  'red-back-toast': { title: '返回键 Toast', load: backToast, backdrop: 'page:dashboard' },
  'red-pwa': { title: '新版本提示 PWAUpdateToast', load: pwa, backdrop: 'page:dashboard' },
  'fx-p5r-gallery': { title: '演出总览 · 一键连播（→ fx-showreel）', load: () => import('@/p5r-red/screens/overlays/FxGalleryJump.p5r') },
  'red-cutin-todo': { title: '首页打勾 · 今日完成 Cut-in 舞台', load: trans, params: { variant: 'cutin-todo' }, backdrop: 'page:dashboard' },
  'red-surprise': { title: '惊喜层 SurpriseFx（随机一种）', load: trans, params: { variant: 'surprise' }, backdrop: 'page:dashboard' },
};
