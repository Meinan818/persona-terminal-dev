/**
 * 工作包 5 的弹窗登记（只由工作包 5 的代理修改）。路由：#/overlay/<inventory id>
 */
import type { OverlayRegistry } from './types';

export const overlays: OverlayRegistry = {
  'ledger-settle-sheet': { title: '心相结算（伊戈尔）', load: () => import('@yellow/screens/overlays/LedgerSettleSheet.p4g'), backdrop: 'page:ledger' },
  'ledger-asset-register': { title: '登记资产', load: () => import('@yellow/screens/overlays/AssetBoardSheets.p4g').then((m) => ({ default: m.RegisterOverlay })), backdrop: 'page:ledger' },
  'ledger-asset-detail': { title: '资产详情（附加费用）', load: () => import('@yellow/screens/overlays/AssetBoardSheets.p4g').then((m) => ({ default: m.DetailOverlay })), backdrop: 'page:ledger' },
  'ledger-asset-delete': { title: '删除这件资产？', load: () => import('@yellow/screens/overlays/AssetBoardDeleteConfirm.p4g'), backdrop: 'page:ledger' },
  'ledger-entry-confirm': { title: '确认这一笔', load: () => import('@yellow/screens/overlays/LedgerEntrySheet.p4g'), backdrop: 'page:ledger' },
  'ledger-batch-confirm': { title: '确认 N 笔', load: () => import('@yellow/screens/overlays/LedgerBatchSheet.p4g'), backdrop: 'page:ledger' },
  'ledger-delete-confirm': { title: '删除这一笔？', load: () => import('@yellow/screens/overlays/LedgerDeleteConfirm.p4g'), backdrop: 'page:ledger' },
  'ledger-budget-sheet': { title: '本月预算 / 新的一程', load: () => import('@yellow/screens/overlays/LedgerBudgetSheet.p4g'), backdrop: 'page:ledger' },
  'ledger-reconcile-sheet': { title: '余额对账 / 设置当前余额', load: () => import('@yellow/screens/overlays/LedgerReconcileSheet.p4g'), backdrop: 'page:ledger' },
  'ledger-saved': { title: '记账完成 Cut-in', load: () => import('@yellow/screens/overlays/LedgerSavedModal.p4g'), backdrop: 'page:ledger' },
  'menu-profile-sheet': { title: '用户资料抽屉', load: () => import('@yellow/screens/overlays/UserProfileCard.p4g'), backdrop: 'page:menu' },
  'menu-theme-sheet': { title: '主题抽屉', load: () => import('@yellow/screens/overlays/MenuThemeSheet.p4g'), backdrop: 'page:menu' },
  'menu-about-sheet': { title: '关于抽屉', load: () => import('@yellow/screens/overlays/MenuAboutSheet.p4g'), backdrop: 'page:menu' },
  'account-consent': { title: '云同步说明', load: () => import('@yellow/screens/overlays/CloudConsentNotice.p4g'), backdrop: 'page:account' },
  'account-login': { title: '登录弹窗', load: () => import('@yellow/screens/overlays/LoginModal.p4g'), backdrop: 'page:account' },
  'account-manage': { title: '账号管理', load: () => import('@yellow/screens/overlays/AccountManagePanel.p4g'), backdrop: 'page:account' },
  'account-delete-cloud-data': { title: '确认删除云端数据？', load: () => import('@yellow/screens/overlays/SyncPrivacyPanel.p4g'), backdrop: 'page:account' },
  'account-confirms': { title: '账号页确认框', load: () => import('@yellow/screens/overlays/AccountConfirms.p4g'), backdrop: 'page:account' },
  'achv-achievement-form': { title: '添加 / 编辑成就', load: () => import('@yellow/screens/overlays/AchievementForm.p4g'), backdrop: 'page:achievements' },
  'achv-achievement-delete': { title: '删除成就确认', load: () => import('@yellow/screens/overlays/AchievementsDeleteConfirm.p4g'), backdrop: 'page:achievements' },
  'achv-skill-form': { title: '添加 / 编辑技能', load: () => import('@yellow/screens/overlays/SkillForm.p4g'), backdrop: 'page:achievements' },
  'achv-skill-delete': { title: '删除技能确认', load: () => import('@yellow/screens/overlays/AchievementsSkillDeleteConfirm.p4g'), backdrop: 'page:achievements' },
  'achv-tarot-flip': { title: '塔罗翻面卡', load: () => import('@yellow/screens/overlays/TarotFlipView.p4g'), backdrop: 'page:achievements' },
  'achv-season-flip': { title: '岁时翻面卡', load: () => import('@yellow/screens/overlays/FlipCardView.p4g'), backdrop: 'page:achievements' },
};
