/**
 * 工作包 2 的弹层登记（只由工作包 2 修改）。负责：设置各组 / 账号&同步 / 助手（助手 NavigatorWindow 登记后底栏中键短按自动改用它）+ fx pkg=2（fx-level-title、fx-p5-calling-card）
 * key = src/inventory.ts 的 id 或 src/fxCatalog.ts 的 fx id（路由 #/overlay/<key>?step=&state=&variant=）。
 */
import type { OverlayRegistry } from './types';

const nav = () => import('@/p5r-red/screens/overlays/NavigatorWindow.p5r');
const navReal = () => import('@/themes/integration/NavigatorBridge');
const form = () => import('@/p5r-red/screens/overlays/NavigatorActionForm.p5r');
const lvl = () => import('@/p5r-red/screens/overlays/SettingsLevelTitleModal.p5r');
const login = () => import('@/p5r-red/screens/overlays/LoginModal.p5r');
const cc = () => import('@/p5r-red/screens/overlays/P5CallingCard.p5r');

export const overlays: OverlayRegistry = {
  // ── 助手 ──
  'assistant-window': { title: '助手对话窗（NavigatorWindow）', load: navReal },
  'assistant-persona-menu': { title: '助手 · 人格菜单', load: nav, params: { menu: 'persona' } },
  'assistant-action-card': { title: '助手 · 动作确认卡', load: nav, params: { demo: 'card' } },
  'assistant-form': { title: '助手表单（NavigatorActionForm）', load: form },
  'assistant-form-activity': { title: '助手表单 · 记录活动', load: form, params: { kind: 'activity' } },
  'assistant-form-todo': { title: '助手表单 · 添加待办', load: form, params: { kind: 'todo' } },
  'assistant-form-edittodo': { title: '助手表单 · 修改待办', load: form, params: { kind: 'editTodo' } },
  'assistant-form-bigdeal': { title: '助手表单 · 拆一件大事', load: form, params: { kind: 'bigdeal' } },
  'assistant-form-ledger': { title: '助手表单 · 记账', load: form, params: { kind: 'ledger' } },
  'assistant-complete-picker': { title: '助手 · 选择要完成的任务', load: nav, params: { sheet: 'complete' } },
  'assistant-mic': { title: '助手 · 录音/转写状态', load: nav, params: { state: 'recording' } },
  'assistant-notebook': { title: '助手记事本（NavigatorNotebook）', load: () => import('@/p5r-red/screens/overlays/NavigatorNotebook.p5r') },
  'assistant-notebook-confirm': { title: '记事本 · 删除确认（记忆/约定）', load: () => import('@/p5r-red/screens/overlays/NavigatorNotebookConfirm.p5r') },
  // ── 设置各组 ──
  'settings-bgm-delete': { title: '删除曲目确认', load: () => import('@/p5r-red/screens/overlays/BgmSettingsDeleteConfirm.p5r'), backdrop: 'page:settings' },
  'settings-model-picker': { title: '选择模型抽屉（ModelPickerSheet）', load: () => import('@/p5r-red/screens/overlays/ModelPickerSheet.p5r'), backdrop: 'page:settings' },
  'settings-level-title-modal': { title: '刷新等级称号（建议选择）', load: lvl, backdrop: 'page:settings' },
  'settings-name-match-modal': { title: 'AI 匹配成就/技能名称（覆写选择）', load: () => import('@/p5r-red/screens/overlays/SettingsNameMatchModal.p5r'), backdrop: 'page:settings' },
  'settings-threshold-confirm': { title: '等级阈值确认（恢复默认 / 移除 / 新增警告）', load: () => import('@/p5r-red/screens/overlays/SettingsThresholdConfirm.p5r'), backdrop: 'page:settings' },
  'settings-persona-editor': { title: '新建/编辑人格面板', load: () => import('@/p5r-red/screens/overlays/NavigatorPersonaEditor.p5r'), backdrop: 'page:settings' },
  'settings-persona-delete': { title: '删除人格确认', load: () => import('@/p5r-red/screens/overlays/NavigatorSettingsPersonaDeleteConfirm.p5r'), backdrop: 'page:settings' },
  // ── 账号&同步 ──
  'account-consent': { title: '云同步说明（CloudConsentNotice）', load: () => import('@/p5r-red/screens/overlays/CloudConsentNotice.p5r'), backdrop: 'page:account' },
  'account-login': { title: '登录弹窗（LoginModal）', load: login, params: { consent: '1' } },
  'account-login-password': { title: '登录 · 密码方式', load: login, params: { mode: 'password' } },
  'account-login-otp': { title: '登录 · 输入邮箱验证码', load: login, params: { step: 'otp' } },
  'account-manage': { title: '账号管理（AccountManagePanel）', load: () => import('@/p5r-red/screens/overlays/AccountManagePanel.p5r'), backdrop: 'page:account' },
  'account-delete-cloud-data': { title: '确认删除云端数据？', load: () => import('@/p5r-red/screens/overlays/SyncPrivacyPanel.p5r'), backdrop: 'page:account' },
  'account-confirms': { title: '账号页确认框（重置/拉取/退出/删号）', load: () => import('@/p5r-red/screens/overlays/AccountConfirms.p5r'), backdrop: 'page:account' },
  'account-conflict': { title: '冲突对话框（ConflictDialog）', load: () => import('@/p5r-red/screens/overlays/ConflictDialog.p5r') },
  'account-sync-diff': { title: '条目差异提示（SyncDiffDialog）', load: () => import('@/p5r-red/screens/overlays/SyncDiffDialog.p5r') },
  'account-sync-merge': { title: '和云端对一对（SyncMergeSheet）', load: () => import('@/p5r-red/screens/overlays/SyncMergeSheet.p5r'), backdrop: 'page:account' },
  'account-sync-badge': { title: '同步状态浮标（SyncStatusBadge）', load: () => import('@/p5r-red/screens/overlays/SyncStatusBadge.p5r') },
  'auth-p5-calling-card': { title: '验证码预告函 P5CallingCard', load: cc },
  'auth-p5-calling-card-error': { title: '验证码预告函 · 报错态（试输 0000）', load: cc, params: { state: 'error' } },
  // ── 演出 ──
  'fx-level-title': { title: '等级称号 · 刷新建议（弹窗开合）', load: lvl, params: { variant: 'fx' }, backdrop: 'page:settings', ms: 2200 },
  'fx-p5-calling-card': { title: '验证码预告函 P5CallingCard（剪报逐字）', load: cc, ms: 3600 },
};
