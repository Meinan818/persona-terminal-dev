/**
 * 工作包 6 的弹窗登记（只由工作包 6 的代理修改）。路由：#/overlay/<key>；key = INVENTORY 路由 id。
 * 'NavigatorWindow' 登记后，外壳的「助手」入口（中间按钮短按 / 侧栏助手）自动改用它。
 */
import type { OverlayRegistry } from './types';

const navWin = () => import('@blue/screens/overlays/NavigatorWindow.p3r');
const dateRoll = () => import('@blue/screens/overlays/DateRollCutIn.p3r');
export const overlays: OverlayRegistry = {
  // ── 蓝白母题层新增演出（B7 日期推进 / B2 影时间切换 / B4 召唤）──
  'global-dateroll': { title: '日期切换 · 整格推移 + 月相', load: dateRoll, fullscreen: true },
  'global-darkhour-switch': { title: '日夜切换 · 影时间定格', load: () => dateRoll().then((m) => ({ default: m.DarkHourSwitchDemo })), backdrop: 'page:dashboard' },
  'global-evoker-cutin': { title: '召唤 Cut-in（EvokerCutIn）', load: () => dateRoll().then((m) => ({ default: m.EvokerDemo })), fullscreen: true },
  NavigatorWindow: { title: '助手对话窗', load: navWin, backdrop: 'page:dashboard' },
  'assistant-window': { title: '助手对话窗（NavigatorWindow）', load: navWin, backdrop: 'page:dashboard' },
  'assistant-form': { title: '助手表单（NavigatorActionForm）', load: () => import('@blue/screens/overlays/NavigatorActionForm.p3r'), backdrop: 'page:dashboard' },
  'assistant-notebook': { title: '助手记事本（NavigatorNotebook）', load: () => import('@blue/screens/overlays/NavigatorNotebook.p3r') },
  'assistant-notebook-confirm': { title: '记事本 · 删除确认', load: () => import('@blue/screens/overlays/NavigatorNotebookConfirm.p3r') },
  'settings-bgm-delete': { title: '删除曲目确认', load: () => import('@blue/screens/overlays/BgmSettingsDeleteConfirm.p3r'), backdrop: 'page:settings' },
  'settings-model-picker': { title: '选择模型抽屉（ModelPickerSheet）', load: () => import('@blue/screens/overlays/ModelPickerSheet.p3r'), backdrop: 'page:settings' },
  'settings-level-title-modal': { title: '刷新等级称号（建议选择）', load: () => import('@blue/screens/overlays/SettingsLevelTitleModal.p3r'), backdrop: 'page:settings' },
  'settings-name-match-modal': { title: 'AI 匹配成就/技能名称', load: () => import('@blue/screens/overlays/SettingsNameMatchModal.p3r'), backdrop: 'page:settings' },
  'settings-threshold-confirm': { title: '等级阈值确认', load: () => import('@blue/screens/overlays/SettingsThresholdConfirm.p3r'), backdrop: 'page:settings' },
  'settings-persona-editor': { title: '新建/编辑人格面板', load: () => import('@blue/screens/overlays/NavigatorPersonaEditor.p3r'), backdrop: 'page:settings' },
  'settings-persona-delete': { title: '删除人格确认', load: () => import('@blue/screens/overlays/NavigatorSettingsPersonaDeleteConfirm.p3r'), backdrop: 'page:settings' },
  'account-conflict': { title: '冲突对话框（ConflictDialog）', load: () => import('@blue/screens/overlays/ConflictDialog.p3r') },
  'account-sync-diff': { title: '条目差异提示（SyncDiffDialog）', load: () => import('@blue/screens/overlays/SyncDiffDialog.p3r') },
  'account-sync-merge': { title: '和云端对一对（SyncMergeSheet）', load: () => import('@blue/screens/overlays/SyncMergeSheet.p3r'), backdrop: 'page:account' },
  'account-sync-badge': { title: '同步状态浮标（SyncStatusBadge）', load: () => import('@blue/screens/overlays/SyncStatusBadge.p3r') },
  'global-back-toast': { title: '返回键 Toast「再次点击回到现实」', load: () => import('@blue/screens/overlays/GlobalToasts.p3r') },
  'global-pwa-toast': { title: 'PWA 更新 Toast', load: () => import('@blue/screens/overlays/PWAUpdateToast.p3r') },
  'global-calling-card-cutin': { title: '宣告卡结算屏（CallingCardCutIn · pink skin）', load: () => import('@blue/screens/overlays/CallingCardCutIn.p3r'), fullscreen: true },
  'global-orphan-images': { title: '孤儿配图询问（OrphanImagesPrompt）', load: () => import('@blue/screens/overlays/OrphanImagesPrompt.p3r') },
  'global-return-panel': { title: '回归面板（ReturnPanel）', load: () => import('@blue/screens/overlays/ReturnPanel.p3r'), backdrop: 'page:dashboard' },
  'global-confirm-dialog': { title: '确认框基座（ConfirmDialog）', load: () => import('@blue/screens/overlays/ConfirmDialog.p3r') },
  'global-action-sheet': { title: 'ActionSheet 基座', load: () => import('@blue/screens/overlays/ActionSheet.p3r') },
  'global-sheet-modal': { title: '底部抽屉/居中弹窗基座（SheetModal）', load: () => import('@blue/screens/overlays/SheetModal.p3r') },
  'global-image-crop': { title: '图片裁切（ImageCropDialog）', load: () => import('@blue/screens/overlays/ImageCropDialog.p3r') },
};
