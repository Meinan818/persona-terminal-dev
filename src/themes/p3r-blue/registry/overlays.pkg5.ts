/** 工作包 5 的弹窗 / 演出登记（只由工作包 5 修改）。key = INVENTORY 路由 #/overlay/<key> 的 key。 */
import type { OverlayRegistry } from './types';

export const overlays: OverlayRegistry = {
  // 记账
  'ledger-settle-sheet': { title: '心相结算', load: () => import('@blue/screens/overlays/LedgerSettleSheet.p3r'), backdrop: 'page:ledger' },
  'ledger-asset-register': { title: '登记资产', load: () => import('@blue/screens/overlays/AssetBoardSheets.p3r'), backdrop: 'page:ledger' },
  'ledger-asset-detail': { title: '资产详情', load: () => import('@blue/screens/overlays/AssetBoardSheets.p3r').then((m) => ({ default: m.DetailOverlay })), backdrop: 'page:ledger' },
  'ledger-asset-delete': { title: '删除这件资产？', load: () => import('@blue/screens/overlays/AssetBoardDeleteConfirm.p3r'), backdrop: 'page:ledger' },
  'ledger-entry-confirm': { title: '确认这一笔', load: () => import('@blue/screens/overlays/LedgerEntrySheet.p3r'), backdrop: 'page:ledger' },
  'ledger-batch-confirm': { title: '确认 N 笔', load: () => import('@blue/screens/overlays/LedgerBatchSheet.p3r'), backdrop: 'page:ledger' },
  'ledger-delete-confirm': { title: '删除这一笔？', load: () => import('@blue/screens/overlays/LedgerDeleteConfirm.p3r'), backdrop: 'page:ledger' },
  'ledger-budget-sheet': { title: '本月预算 / 新的一程', load: () => import('@blue/screens/overlays/LedgerBudgetSheet.p3r'), backdrop: 'page:ledger' },
  'ledger-reconcile-sheet': { title: '余额对账 / 设置当前余额', load: () => import('@blue/screens/overlays/LedgerReconcileSheet.p3r'), backdrop: 'page:ledger' },
  'ledger-saved': { title: '记账完成 Cut-in', load: () => import('@blue/screens/overlays/LedgerSavedModal.p3r'), backdrop: 'page:ledger' },
  // 菜单
  'menu-profile-sheet': { title: '用户资料', load: () => import('@blue/screens/overlays/UserProfileCard.p3r'), backdrop: 'page:menu' },
  'menu-theme-sheet': { title: '主题', load: () => import('@blue/screens/overlays/MenuThemeSheet.p3r'), backdrop: 'page:menu' },
  'menu-about-sheet': { title: '关于', load: () => import('@blue/screens/overlays/MenuAboutSheet.p3r'), backdrop: 'page:menu' },
  // 账号
  'account-consent': { title: '云同步说明', load: () => import('@blue/screens/overlays/CloudConsentNotice.p3r'), backdrop: 'page:account' },
  'account-login': { title: '登录', load: () => import('@blue/screens/overlays/LoginModal.p3r'), backdrop: 'page:account' },
  'account-manage': { title: '账号管理', load: () => import('@blue/screens/overlays/AccountManagePanel.p3r'), backdrop: 'page:account' },
  'account-delete-cloud-data': { title: '确认删除云端数据？', load: () => import('@blue/screens/overlays/SyncPrivacyPanel.p3r'), backdrop: 'page:account' },
  'account-confirms': { title: '账号页确认框', load: () => import('@blue/screens/overlays/AccountConfirms.p3r'), backdrop: 'page:account' },
  // 成就 / 图鉴
  'achv-achievement-form': { title: '添加 / 编辑成就', load: () => import('@blue/screens/overlays/AchievementForm.p3r'), backdrop: 'page:achievements' },
  'achv-achievement-delete': { title: '删除成就确认', load: () => import('@blue/screens/overlays/AchievementsDeleteConfirm.p3r'), backdrop: 'page:achievements' },
  'achv-skill-form': { title: '添加 / 编辑技能', load: () => import('@blue/screens/overlays/SkillForm.p3r'), backdrop: 'page:achievements' },
  'achv-skill-delete': { title: '删除技能确认', load: () => import('@blue/screens/overlays/AchievementsSkillDeleteConfirm.p3r'), backdrop: 'page:achievements' },
  'achv-tarot-flip': { title: '塔罗翻面卡', load: () => import('@blue/screens/overlays/TarotFlipView.p3r'), backdrop: 'page:achievements' },
  'achv-season-flip': { title: '岁时翻面卡', load: () => import('@blue/screens/overlays/FlipCardView.p3r'), backdrop: 'page:achievements' },
  // 据点庆祝（App 顶层，任意页）
  'hideout-org-celebration': { title: '据点庆祝', load: () => import('@blue/screens/overlays/OrgCelebrationCutIn.p3r') },
};
