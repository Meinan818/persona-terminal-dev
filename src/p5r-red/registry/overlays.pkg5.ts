/**
 * 工作包 5 的弹层登记（只由工作包 5 修改）。负责：记录 / 宣告卡（含 CallingCardCutIn）/ 统计 / 成就 + fx pkg=5（记录成功、宣告卡结算、STAT UP、AI 记录分析）
 * key = src/inventory.ts 的 id 或 src/fxCatalog.ts 的 fx id（路由 #/overlay/<key>?step=&state=&variant=）。
 */
import type { OverlayRegistry } from './types';

const rec = () => import('@/p5r-red/screens/overlays/ActivityRecordSheet.p5r');
const save = () => import('@/p5r-red/screens/overlays/SaveSuccessModal.p5r');
const cci = () => import('@/p5r-red/screens/overlays/CallingCardCutIn.p5r');
const cce = () => import('@/p5r-red/screens/overlays/CallingCardEditor.p5r');
const achf = () => import('@/p5r-red/screens/overlays/AchievementForm.p5r');
const skf = () => import('@/p5r-red/screens/overlays/SkillForm.p5r');
const ACT = 'page:activities-preview';

export const overlays: OverlayRegistry = {
  // ── 行动 · 记录 ──
  'actions-record-sheet': { title: '记录一件事（新增 / 补录抽屉）', load: rec, backdrop: ACT },
  'actions-record-menu': { title: '记录长按菜单（ActionSheet）', load: () => import('@/p5r-red/screens/overlays/ActivitiesRecordMenu.p5r'), backdrop: ACT },
  'actions-record-delete': { title: '确认删除这条记录？', load: () => import('@/p5r-red/screens/overlays/ActivitiesDeleteConfirm.p5r'), backdrop: ACT },
  'actions-save-success': { title: '记录成功 Cut-in', load: save, backdrop: ACT },
  // ── 行动 · 宣告卡 ──
  'actions-calling-cards': { title: '倒计时（宣告卡）区块', load: () => import('@/p5r-red/screens/overlays/CallingCardSectionPreview.p5r') },
  'actions-calling-card-editor': { title: '新建 / 编辑倒计时', load: cce, backdrop: 'page:callingcard' },
  'actions-calling-card-delete': { title: '删除倒计时确认', load: () => import('@/p5r-red/screens/overlays/CallingCardSectionDeleteConfirm.p5r'), backdrop: 'page:callingcard' },
  'global-calling-card-cutin': { title: '宣告卡结算屏（CallingCardCutIn）', load: cci, params: { variant: 'expired' } },
  // ── 成就 / 技能 ──
  'achv-achievement-form': { title: '添加自定义成就 / 编辑成就', load: achf, backdrop: 'page:achievements' },
  'achv-achievement-delete': { title: '删除成就确认', load: () => import('@/p5r-red/screens/overlays/AchievementsDeleteConfirm.p5r'), backdrop: 'page:achievements' },
  'achv-skill-form': { title: '添加 / 编辑技能', load: skf, backdrop: 'page:achievements' },
  'achv-skill-delete': { title: '删除技能确认', load: () => import('@/p5r-red/screens/overlays/AchievementsSkillDeleteConfirm.p5r'), backdrop: 'page:achievements' },
  // ── 演出（fxCatalog pkg=5） ──
  'fx-save-success': { title: '记录成功（复用 TodoCompleteP5）', load: save, backdrop: ACT },
  'fx-save-success-unlock': { title: '记录成功 · 解锁提示', load: save, params: { variant: 'unlock' }, backdrop: ACT },
  'fx-calling-cleared': { title: '宣告卡结算 · 达成', load: cci, params: { variant: 'cleared', demo: '0' } },
  'fx-calling-expired': { title: '宣告卡结算 · 时之至', load: cci, params: { variant: 'expired', demo: '0' } },
  'fx-calling-archived': { title: '宣告卡结算 · 已收', load: cci, params: { variant: 'archived', demo: '0' } },
  'red-statup': { title: 'STAT UP 属性提升通知', load: () => import('@/p5r-red/screens/overlays/ActivitiesStatUp.p5r'), backdrop: ACT },
  'red-ai-record': { title: 'AI 思考 → 逐字 · 记录关键词分析', load: rec, params: { step: 'ai-play' }, backdrop: ACT },
};
