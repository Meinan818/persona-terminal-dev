/**
 * 工作包 2 的弹窗登记（行动）。key = INVENTORY 的 demo 路由 id：#/overlay/<key>
 * 页面内使用时由 Activities / Todos 直接 import 组件，这里只供 Harness 单独预览。
 */
import type { OverlayRegistry } from './types';

const P = 'page:actions';
export const overlays: OverlayRegistry = {
  'actions-calendar-picker': { title: '日历 · 年月跳转浮层', load: () => import('@yellow/screens/overlays/ActivitiesCalendarPicker.p4g'), backdrop: P },
  'actions-record-sheet': { title: '记录一件事（新增 / 补录）', load: () => import('@yellow/screens/overlays/ActivityRecordSheet.p4g'), backdrop: P },
  'actions-record-menu': { title: '记录长按菜单', load: () => import('@yellow/screens/overlays/ActivitiesRecordMenu.p4g'), backdrop: P },
  'actions-record-delete': { title: '确认删除这条记录？', load: () => import('@yellow/screens/overlays/ActivitiesDeleteConfirm.p4g'), backdrop: P },
  'actions-images-sheet': { title: '记录图片管理抽屉', load: () => import('@yellow/screens/overlays/ActivityImagesSheet.p4g'), backdrop: P },
  'actions-image-lightbox': { title: '看图大图', load: () => import('@yellow/screens/overlays/ImageLightbox.p4g'), backdrop: P },
  'actions-share-to-org': { title: '分享到据点', load: () => import('@yellow/screens/overlays/ShareToOrgSheet.p4g'), backdrop: P },
  'actions-save-success': { title: '记录成功 Cut-in', load: () => import('@yellow/screens/overlays/SaveSuccessModal.p4g'), backdrop: P },
  'actions-summary': { title: '成长总结（生成 / 预览 / 归档 / 详情）', load: () => import('@yellow/screens/overlays/SummaryModal.p4g'), backdrop: P },
  'actions-summary-regen-confirm': { title: '重新生成？', load: () => import('@yellow/screens/overlays/SummaryModalRegenConfirm.p4g'), backdrop: P },
  'actions-year-recap': { title: '年度回顾舞台', load: () => import('@yellow/screens/overlays/YearRecapStage.p4g') },
  'actions-weekly-goal-setup': { title: '设定本周目标', load: () => import('@yellow/screens/overlays/GoalSetupForm.p4g'), backdrop: P },
  'actions-weekly-goal-celebrate': { title: '本周目标达成！', load: () => import('@yellow/screens/overlays/CelebrationModal.p4g'), backdrop: P },
  'actions-weekly-goal-claimed': { title: '奖励已领取！', load: () => import('@yellow/screens/overlays/ClaimedModal.p4g'), backdrop: P },
  'actions-calling-card-editor': { title: '新建 / 编辑倒计时', load: () => import('@yellow/screens/overlays/CallingCardEditor.p4g'), backdrop: P },
  'actions-calling-card-delete': { title: '删除倒计时确认', load: () => import('@yellow/screens/overlays/CallingCardSectionDeleteConfirm.p4g'), backdrop: P },
  'actions-wish-panel': { title: '愿望进度面板', load: () => import('@yellow/screens/overlays/WishPanel.p4g'), backdrop: P },
  'actions-wish-fulfill': { title: '愿望实现（长按确认）', load: () => import('@yellow/screens/overlays/WishFulfillDialog.p4g'), backdrop: P },
  'actions-wish-add': { title: '记下一个愿望', load: () => import('@yellow/screens/overlays/TodosWishAddSheet.p4g'), backdrop: P },
  'actions-danmaku-compose': { title: '写一句鼓励', load: () => import('@yellow/screens/overlays/DanmakuCompose.p4g'), backdrop: P },
  'actions-todo-form': { title: '添加 / 编辑任务', load: () => import('@yellow/screens/overlays/TodoFormSheet.p4g'), backdrop: P },
  'actions-schedule-import': { title: '课表导入 · 确认', load: () => import('@yellow/screens/overlays/TodosScheduleImport.p4g'), backdrop: P },
  'actions-todo-menu': { title: '任务长按菜单', load: () => import('@yellow/screens/overlays/TodosItemMenu.p4g'), backdrop: P },
  'actions-todo-delete': { title: '删除任务确认', load: () => import('@yellow/screens/overlays/TodosDeleteConfirm.p4g'), backdrop: P },
  'actions-fate-draw': { title: '命运抽签', load: () => import('@yellow/screens/overlays/FateDrawSheet.p4g'), backdrop: P },
  'actions-quest-board': { title: '委托板', load: () => import('@yellow/screens/overlays/QuestBoardSheet.p4g'), backdrop: P },
  'actions-bigdeal-panel': { title: 'BIG DEAL 大事面板', load: () => import('@yellow/screens/overlays/BigDealPanel.p4g'), backdrop: P },
  'actions-bigdeal-step-cutin': { title: '大事推进一步 Cut-in', load: () => import('@yellow/screens/overlays/BigDealStepCutIn.p4g'), backdrop: P },
  'global-bigdeal-clear': { title: 'BIG DEAL 收官结算', load: () => import('@yellow/screens/overlays/BigDealClearCutIn.p4g') },
  'global-wish-progress': { title: '愿望进度 Cut-in', load: () => import('@yellow/screens/overlays/WishProgressCutIn.p4g'), backdrop: P },
  'global-wish-proposal': { title: '要更新这个愿望的进度吗？', load: () => import('@yellow/screens/overlays/WishProposalDialog.p4g'), backdrop: P },
  'global-danmaku-layer': { title: '弹幕层', load: () => import('@yellow/screens/overlays/DanmakuLayer.p4g') },
};
