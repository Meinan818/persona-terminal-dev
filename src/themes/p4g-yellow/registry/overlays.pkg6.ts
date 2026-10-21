/**
 * 工作包 6 的弹窗登记（只由工作包 6 的代理修改）。路由：#/overlay/<key>；key = INVENTORY 路由 id。
 * 'NavigatorWindow' 登记后，外壳的「助手」入口（中间按钮短按 / 侧栏助手）自动改用它。
 */
import type { OverlayRegistry } from './types';

const navWin = () => import('@yellow/screens/overlays/NavigatorWindow.p4g');
export const overlays: OverlayRegistry = {
  NavigatorWindow: { title: '助手对话窗', load: navWin, backdrop: 'page:dashboard' },
  'assistant-window': { title: '助手对话窗（NavigatorWindow）', load: navWin, backdrop: 'page:dashboard' },
  'assistant-form': { title: '助手表单（NavigatorActionForm）', load: () => import('@yellow/screens/overlays/NavigatorActionForm.p4g') },
  'assistant-notebook': { title: '助手记事本（NavigatorNotebook）', load: () => import('@yellow/screens/overlays/NavigatorNotebook.p4g') },
  'assistant-notebook-confirm': { title: '记事本 · 删除确认', load: () => import('@yellow/screens/overlays/NavigatorNotebookConfirm.p4g') },
  'settings-bgm-delete': { title: '删除曲目确认', load: () => import('@yellow/screens/overlays/BgmSettingsDeleteConfirm.p4g'), backdrop: 'page:settings' },
  'settings-model-picker': { title: '选择模型抽屉（ModelPickerSheet）', load: () => import('@yellow/screens/overlays/ModelPickerSheet.p4g'), backdrop: 'page:settings' },
  'settings-level-title-modal': { title: '刷新等级称号（建议选择）', load: () => import('@yellow/screens/overlays/SettingsLevelTitleModal.p4g'), backdrop: 'page:settings' },
  'settings-name-match-modal': { title: 'AI 匹配成就/技能名称', load: () => import('@yellow/screens/overlays/SettingsNameMatchModal.p4g'), backdrop: 'page:settings' },
  'settings-threshold-confirm': { title: '等级阈值确认', load: () => import('@yellow/screens/overlays/SettingsThresholdConfirm.p4g'), backdrop: 'page:settings' },
  'settings-persona-editor': { title: '新建/编辑人格面板', load: () => import('@yellow/screens/overlays/NavigatorPersonaEditor.p4g'), backdrop: 'page:settings' },
  'settings-persona-delete': { title: '删除人格确认', load: () => import('@yellow/screens/overlays/NavigatorSettingsPersonaDeleteConfirm.p4g'), backdrop: 'page:settings' },
  'account-conflict': { title: '冲突对话框（ConflictDialog）', load: () => import('@yellow/screens/overlays/ConflictDialog.p4g') },
  'account-sync-diff': { title: '条目差异提示（SyncDiffDialog）', load: () => import('@yellow/screens/overlays/SyncDiffDialog.p4g') },
  'account-sync-merge': { title: '和云端对一对（SyncMergeSheet）', load: () => import('@yellow/screens/overlays/SyncMergeSheet.p4g') },
  'account-sync-badge': { title: '同步状态浮标（SyncStatusBadge）', load: () => import('@yellow/screens/overlays/SyncStatusBadge.p4g') },
  'global-back-toast': { title: '返回键 Toast「再次点击回到现实」', load: () => import('@yellow/screens/overlays/GlobalToasts.p4g') },
  'global-pwa-toast': { title: 'PWA 更新 Toast', load: () => import('@yellow/screens/overlays/PWAUpdateToast.p4g') },
  'global-calling-card-cutin': { title: '宣告卡结算屏（CallingCardCutIn）', load: () => import('@yellow/screens/overlays/CallingCardCutIn.p4g') },
  'global-orphan-images': { title: '孤儿配图询问（OrphanImagesPrompt）', load: () => import('@yellow/screens/overlays/OrphanImagesPrompt.p4g') },
  'global-return-panel': { title: '回归面板（ReturnPanel）', load: () => import('@yellow/screens/overlays/ReturnPanel.p4g') },
  'global-confirm-dialog': { title: '确认框基座（ConfirmDialog）', load: () => import('@yellow/screens/overlays/ConfirmDialog.p4g') },
  'global-action-sheet': { title: 'ActionSheet 基座', load: () => import('@yellow/screens/overlays/ActionSheet.p4g') },
  'global-sheet-modal': { title: '底部抽屉/居中弹窗基座（SheetModal）', load: () => import('@yellow/screens/overlays/SheetModal.p4g') },
  'global-image-crop': { title: '图片裁切（ImageCropDialog）', load: () => import('@yellow/screens/overlays/ImageCropDialog.p4g') },
};
