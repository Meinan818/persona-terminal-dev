/**
 * 工作包 2 的弹窗 / 演出登记（行动）。key = INVENTORY 路由 #/overlay/<key> 的 key。
 * 页面内使用时由 Activities / Todos 直接 import 组件，这里只供 Harness 单独预览。
 */
import type { OverlayRegistry } from './types';

const P = 'page:actions';
export const overlays: OverlayRegistry = {
  'actions-calendar-picker': { title: '日历 · 年月跳转浮层', load: () => import('@blue/screens/overlays/ActivitiesCalendarPicker.p3r'), backdrop: P },
  'actions-record-sheet': { title: '记录一件事（新增 / 补录）', load: () => import('@blue/screens/overlays/ActivityRecordSheet.p3r'), backdrop: P },
  'actions-record-menu': { title: '记录长按菜单', load: () => import('@blue/screens/overlays/ActivitiesRecordMenu.p3r'), backdrop: P },
  'actions-record-delete': { title: '确认删除这条记录？', load: () => import('@blue/screens/overlays/ActivitiesDeleteConfirm.p3r'), backdrop: P },
  'actions-images-sheet': { title: '记录图片管理抽屉', load: () => import('@blue/screens/overlays/ActivityImagesSheet.p3r'), backdrop: P },
  'actions-image-lightbox': { title: '看图大图', load: () => import('@blue/screens/overlays/ImageLightbox.p3r'), backdrop: P },
  'actions-share-to-org': { title: '分享到据点', load: () => import('@blue/screens/overlays/ShareToOrgSheet.p3r'), backdrop: P },
  'actions-save-success': { title: '记录成功 Cut-in', load: () => import('@blue/screens/overlays/SaveSuccessModal.p3r'), backdrop: P },
  'actions-summary': { title: '成长总结（生成 / 预览 / 归档 / 详情）', load: () => import('@blue/screens/overlays/SummaryModal.p3r'), backdrop: P },
  'actions-summary-regen-confirm': { title: '重新生成？', load: () => import('@blue/screens/overlays/SummaryModalRegenConfirm.p3r'), backdrop: P },
  'actions-year-recap': { title: '年度回顾舞台', load: () => import('@blue/screens/overlays/YearRecapStage.p3r'), fullscreen: true },
  'actions-weekly-goal-setup': { title: '设定本周目标', load: () => import('@blue/screens/overlays/GoalSetupForm.p3r'), backdrop: P },
  'actions-weekly-goal-celebrate': { title: '本周目标达成！', load: () => import('@blue/screens/overlays/CelebrationModal.p3r'), backdrop: P },
  'actions-weekly-goal-claimed': { title: '奖励已领取！', load: () => import('@blue/screens/overlays/ClaimedModal.p3r'), backdrop: P },
  'actions-calling-card-editor': { title: '新建 / 编辑倒计时', load: () => import('@blue/screens/overlays/CallingCardEditor.p3r'), backdrop: P },
  'actions-calling-card-delete': { title: '删除倒计时确认', load: () => import('@blue/screens/overlays/CallingCardSectionDeleteConfirm.p3r'), backdrop: P },
  'actions-wish-panel': { title: '愿望进度面板', load: () => import('@blue/screens/overlays/WishPanel.p3r'), backdrop: P },
  'actions-wish-fulfill': { title: '愿望实现（长按确认）', load: () => import('@blue/screens/overlays/WishFulfillDialog.p3r'), backdrop: P },
  'actions-wish-add': { title: '记下一个愿望', load: () => import('@blue/screens/overlays/TodosWishAddSheet.p3r'), backdrop: P },
  'actions-danmaku-compose': { title: '写一句鼓励', load: () => import('@blue/screens/overlays/DanmakuCompose.p3r'), backdrop: P },
  'actions-todo-form': { title: '添加 / 编辑任务', load: () => import('@blue/screens/overlays/TodoFormSheet.p3r'), backdrop: P },
  'actions-schedule-import': { title: '课表导入 · 确认', load: () => import('@blue/screens/overlays/TodosScheduleImport.p3r'), backdrop: P },
  'actions-todo-menu': { title: '任务长按菜单', load: () => import('@blue/screens/overlays/TodosItemMenu.p3r'), backdrop: P },
  'actions-todo-delete': { title: '删除任务确认', load: () => import('@blue/screens/overlays/TodosDeleteConfirm.p3r'), backdrop: P },
  'actions-fate-draw': { title: '命运抽签', load: () => import('@blue/screens/overlays/FateDrawSheet.p3r'), backdrop: P },
  'actions-quest-board': { title: '委托板', load: () => import('@blue/screens/overlays/QuestBoardSheet.p3r'), backdrop: P },
  'actions-bigdeal-panel': { title: 'BIG DEAL 大事面板', load: () => import('@blue/screens/overlays/BigDealPanel.p3r'), backdrop: P },
  'actions-bigdeal-step-cutin': { title: '大事推进一步 Cut-in', load: () => import('@blue/screens/overlays/BigDealStepCutIn.p3r'), backdrop: P },
  'global-bigdeal-clear': { title: 'BIG DEAL 收官结算', load: () => import('@blue/screens/overlays/BigDealClearCutIn.p3r'), fullscreen: true },
  'global-wish-progress': { title: '愿望进度 Cut-in', load: () => import('@blue/screens/overlays/WishProgressCutIn.p3r'), backdrop: P },
  'global-wish-proposal': { title: '要更新这个愿望的进度吗？', load: () => import('@blue/screens/overlays/WishProposalDialog.p3r'), backdrop: P },
  'global-danmaku-layer': { title: '弹幕层', load: () => import('@blue/screens/overlays/DanmakuLayer.p3r'), fullscreen: true },
  'actions-wish-mount': { title: '挂到愿望 WishMountPicker（记录 / 任务 / 黑猫卡 compact）', load: () => import('@blue/screens/overlays/WishMountPicker.p3r'), backdrop: P },
};
