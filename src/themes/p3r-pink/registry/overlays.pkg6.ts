/**
 * 工作包 6 的弹窗登记（只由工作包 6 的代理修改）。路由：#/overlay/<key>；key = INVENTORY 路由 id。
 * 'NavigatorWindow' 登记后，外壳的「助手」入口（中间按钮短按 / 侧栏助手）自动改用它。
 */
import type { OverlayRegistry } from './types';

const navWin = () => import('@pink/screens/overlays/NavigatorWindow.p3r');
export const overlays: OverlayRegistry = {
  NavigatorWindow: { title: '助手对话窗', load: navWin, backdrop: 'page:dashboard' },
  'assistant-window': { title: '助手对话窗（NavigatorWindow）', load: navWin, backdrop: 'page:dashboard' },
  'assistant-form': { title: '助手表单（NavigatorActionForm）', load: () => import('@pink/screens/overlays/NavigatorActionForm.p3r'), backdrop: 'page:dashboard' },
  'assistant-notebook': { title: '助手记事本（NavigatorNotebook）', load: () => import('@pink/screens/overlays/NavigatorNotebook.p3r') },
  'assistant-notebook-confirm': { title: '记事本 · 删除确认', load: () => import('@pink/screens/overlays/NavigatorNotebookConfirm.p3r') },
  'settings-bgm-delete': { title: '删除曲目确认', load: () => import('@pink/screens/overlays/BgmSettingsDeleteConfirm.p3r'), backdrop: 'page:settings' },
  'settings-model-picker': { title: '选择模型抽屉（ModelPickerSheet）', load: () => import('@pink/screens/overlays/ModelPickerSheet.p3r'), backdrop: 'page:settings' },
  'settings-level-title-modal': { title: '刷新等级称号（建议选择）', load: () => import('@pink/screens/overlays/SettingsLevelTitleModal.p3r'), backdrop: 'page:settings' },
  'settings-name-match-modal': { title: 'AI 匹配成就/技能名称', load: () => import('@pink/screens/overlays/SettingsNameMatchModal.p3r'), backdrop: 'page:settings' },
  'settings-threshold-confirm': { title: '等级阈值确认', load: () => import('@pink/screens/overlays/SettingsThresholdConfirm.p3r'), backdrop: 'page:settings' },
  'settings-persona-editor': { title: '新建/编辑人格面板', load: () => import('@pink/screens/overlays/NavigatorPersonaEditor.p3r'), backdrop: 'page:settings' },
  'settings-persona-delete': { title: '删除人格确认', load: () => import('@pink/screens/overlays/NavigatorSettingsPersonaDeleteConfirm.p3r'), backdrop: 'page:settings' },
  'account-conflict': { title: '冲突对话框（ConflictDialog）', load: () => import('@pink/screens/overlays/ConflictDialog.p3r') },
  'account-sync-diff': { title: '条目差异提示（SyncDiffDialog）', load: () => import('@pink/screens/overlays/SyncDiffDialog.p3r') },
  'account-sync-merge': { title: '和云端对一对（SyncMergeSheet）', load: () => import('@pink/screens/overlays/SyncMergeSheet.p3r'), backdrop: 'page:account' },
  'account-sync-badge': { title: '同步状态浮标（SyncStatusBadge）', load: () => import('@pink/screens/overlays/SyncStatusBadge.p3r') },
  'global-back-toast': { title: '返回键 Toast「再次点击回到现实」', load: () => import('@pink/screens/overlays/GlobalToasts.p3r') },
  'global-pwa-toast': { title: 'PWA 更新 Toast', load: () => import('@pink/screens/overlays/PWAUpdateToast.p3r') },
  'global-calling-card-cutin': { title: '宣告卡结算屏（CallingCardCutIn · pink skin）', load: () => import('@pink/screens/overlays/CallingCardCutIn.p3r'), fullscreen: true },
  'global-orphan-images': { title: '孤儿配图询问（OrphanImagesPrompt）', load: () => import('@pink/screens/overlays/OrphanImagesPrompt.p3r') },
  'global-return-panel': { title: '回归面板（ReturnPanel）', load: () => import('@pink/screens/overlays/ReturnPanel.p3r'), backdrop: 'page:dashboard' },
  'global-confirm-dialog': { title: '确认框基座（ConfirmDialog）', load: () => import('@pink/screens/overlays/ConfirmDialog.p3r') },
  'global-action-sheet': { title: 'ActionSheet 基座', load: () => import('@pink/screens/overlays/ActionSheet.p3r') },
  'global-sheet-modal': { title: '底部抽屉/居中弹窗基座（SheetModal）', load: () => import('@pink/screens/overlays/SheetModal.p3r') },
  'global-image-crop': { title: '图片裁切（ImageCropDialog）', load: () => import('@pink/screens/overlays/ImageCropDialog.p3r') },
};
