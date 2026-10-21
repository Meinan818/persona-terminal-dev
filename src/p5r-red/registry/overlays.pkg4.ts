/**
 * 工作包 4 的弹层登记（只由工作包 4 修改）。负责：行动（任务 / 愿望 / 本周目标 / BIG DEAL / 成长总结 / 年度回顾 / 图片）、记账、星象、图鉴翻面、回归面板 + fx pkg=4。
 * 弹层文件只是薄包装：内容在 @/screens/pkg4（v3 overlays/d.js · a.js · pages/todos.js 命令式逐字迁移 + FIXLIST 改动）。
 */
import type { OverlayRegistry } from './types';

const ActivitiesCalendarPicker = () => import('@/p5r-red/screens/overlays/ActivitiesCalendarPicker.p5r');
const ActivityImagesSheet = () => import('@/p5r-red/screens/overlays/ActivityImagesSheet.p5r');
const AssetBoardDeleteConfirm = () => import('@/p5r-red/screens/overlays/AssetBoardDeleteConfirm.p5r');
const AssetBoardSheets = () => import('@/p5r-red/screens/overlays/AssetBoardSheets.p5r');
const AstrologyFx = () => import('@/p5r-red/screens/overlays/AstrologyFx.p5r');
const BigDealClearCutIn = () => import('@/p5r-red/screens/overlays/BigDealClearCutIn.p5r');
const BigDealHomeCard = () => import('@/p5r-red/screens/overlays/BigDealHomeCard.p5r');
const BigDealPanel = () => import('@/p5r-red/screens/overlays/BigDealPanel.p5r');
const BigDealStepCutIn = () => import('@/p5r-red/screens/overlays/BigDealStepCutIn.p5r');
const CallingCardEditor = () => import('@/p5r-red/screens/overlays/CallingCardEditor.p5r');
const CallingCardSectionDeleteConfirm = () => import('@/p5r-red/screens/overlays/CallingCardSectionDeleteConfirm.p5r');
const CelebrationModal = () => import('@/p5r-red/screens/overlays/CelebrationModal.p5r');
const ClaimedModal = () => import('@/p5r-red/screens/overlays/ClaimedModal.p5r');
const CodexTabPreview = () => import('@/p5r-red/screens/overlays/CodexTabPreview.p5r');
const DanmakuCompose = () => import('@/p5r-red/screens/overlays/DanmakuCompose.p5r');
const FateDrawSheet = () => import('@/p5r-red/screens/overlays/FateDrawSheet.p5r');
const FateGlimpse = () => import('@/p5r-red/screens/overlays/FateGlimpse.p5r');
const FlipCardView = () => import('@/p5r-red/screens/overlays/FlipCardView.p5r');
const GoalSetupForm = () => import('@/p5r-red/screens/overlays/GoalSetupForm.p5r');
const ImageLightbox = () => import('@/p5r-red/screens/overlays/ImageLightbox.p5r');
const LedgerBatchSheet = () => import('@/p5r-red/screens/overlays/LedgerBatchSheet.p5r');
const LedgerBudgetSheet = () => import('@/p5r-red/screens/overlays/LedgerBudgetSheet.p5r');
const LedgerDeleteConfirm = () => import('@/p5r-red/screens/overlays/LedgerDeleteConfirm.p5r');
const LedgerEntrySheet = () => import('@/p5r-red/screens/overlays/LedgerEntrySheet.p5r');
const LedgerReconcileSheet = () => import('@/p5r-red/screens/overlays/LedgerReconcileSheet.p5r');
const LedgerSavedModal = () => import('@/p5r-red/screens/overlays/LedgerSavedModal.p5r');
const LedgerSettleSheet = () => import('@/p5r-red/screens/overlays/LedgerSettleSheet.p5r');
const QuestBoardSheet = () => import('@/p5r-red/screens/overlays/QuestBoardSheet.p5r');
const ReturnPanel = () => import('@/p5r-red/screens/overlays/ReturnPanel.p5r');
const ShareToOrgSheet = () => import('@/p5r-red/screens/overlays/ShareToOrgSheet.p5r');
const SummaryModal = () => import('@/p5r-red/screens/overlays/SummaryModal.p5r');
const SummaryModalRegenConfirm = () => import('@/p5r-red/screens/overlays/SummaryModalRegenConfirm.p5r');
const TarotFlipView = () => import('@/p5r-red/screens/overlays/TarotFlipView.p5r');
const TodoFormSheet = () => import('@/p5r-red/screens/overlays/TodoFormSheet.p5r');
const TodosDeleteConfirm = () => import('@/p5r-red/screens/overlays/TodosDeleteConfirm.p5r');
const TodosItemMenu = () => import('@/p5r-red/screens/overlays/TodosItemMenu.p5r');
const TodosScheduleImport = () => import('@/p5r-red/screens/overlays/TodosScheduleImport.p5r');
const TodosWishAddSheet = () => import('@/p5r-red/screens/overlays/TodosWishAddSheet.p5r');
const WeeklyGoalSection = () => import('@/p5r-red/screens/overlays/WeeklyGoalSection.p5r');
const WishBoard = () => import('@/p5r-red/screens/overlays/WishBoard.p5r');
const WishFulfillDialog = () => import('@/p5r-red/screens/overlays/WishFulfillDialog.p5r');
const WishMountPicker = () => import('@/p5r-red/screens/overlays/WishMountPicker.p5r');
const WishPanel = () => import('@/p5r-red/screens/overlays/WishPanel.p5r');
const WishProgressCutIn = () => import('@/p5r-red/screens/overlays/WishProgressCutIn.p5r');
const WishProposalDialog = () => import('@/p5r-red/screens/overlays/WishProposalDialog.p5r');
const WishRing = () => import('@/p5r-red/screens/overlays/WishRing.p5r');
const YearRecapStage = () => import('@/p5r-red/screens/overlays/YearRecapStage.p5r');
const ACT = 'page:actions', LED = 'page:ledger', AST = 'page:astrology';

export const overlays: OverlayRegistry = {
  // ── 行动 ──
  'actions-calendar-picker': { title: '日历 · 年月跳转浮层', load: ActivitiesCalendarPicker },
  'actions-images-sheet': { title: '记录图片管理抽屉', load: ActivityImagesSheet },
  'actions-image-lightbox': { title: '看图大图', load: ImageLightbox },
  'actions-share-to-org': { title: '分享到据点', load: ShareToOrgSheet },
  'actions-summary': { title: '成长总结（生成 / 预览 / 归档 / 详情）', load: SummaryModal, backdrop: ACT },
  'actions-summary-generate': { title: '成长总结 · 生成', load: SummaryModal, params: { view: 'generate' }, backdrop: ACT },
  'actions-summary-preview': { title: '成长总结 · 预览', load: SummaryModal, params: { view: 'preview' }, backdrop: ACT },
  'actions-summary-archive': { title: '成长总结 · 归档', load: SummaryModal, params: { view: 'archive' }, backdrop: ACT },
  'actions-summary-detail': { title: '成长总结 · 详情', load: SummaryModal, params: { view: 'detail' }, backdrop: ACT },
  'state-summary-busy': { title: '成长总结 · 生成中', load: SummaryModal, params: { state: 'busy' }, backdrop: ACT },
  'actions-summary-regen-confirm': { title: '重新生成？（丢弃草稿确认）', load: SummaryModalRegenConfirm, backdrop: ACT },
  'actions-year-recap': { title: '年度回顾分幕舞台', load: YearRecapStage },
  'actions-weekly-goal-setup': { title: '设定本周目标', load: GoalSetupForm, backdrop: ACT },
  'actions-weekly-goal-celebrate': { title: '本周目标达成！选属性领奖', load: CelebrationModal, backdrop: ACT },
  'actions-weekly-goal-claimed': { title: '奖励已领取！', load: ClaimedModal, backdrop: ACT },
  'actions-weekly-goal-card': { title: '本周目标卡（全状态预览）', load: WeeklyGoalSection },
  'actions-wish-board-stage': { title: '愿望面（预览舞台）', load: WishBoard },
  'actions-wish-panel': { title: '愿望进度面板', load: WishPanel, backdrop: ACT },
  'actions-wish-fulfill': { title: '愿望实现（长按确认）', load: WishFulfillDialog },
  'actions-wish-add': { title: '记下一个愿望', load: TodosWishAddSheet, backdrop: ACT },
  'actions-danmaku-compose': { title: '写一句鼓励', load: DanmakuCompose },
  'actions-todo-form': { title: '添加 / 编辑任务抽屉', load: TodoFormSheet, backdrop: ACT },
  'actions-schedule-import': { title: '课表导入 · 确认', load: TodosScheduleImport, backdrop: ACT },
  'actions-todo-menu': { title: '任务长按菜单', load: TodosItemMenu, backdrop: ACT },
  'actions-todo-delete': { title: '删除任务确认', load: TodosDeleteConfirm, backdrop: ACT },
  'actions-fate-draw': { title: '命运抽签', load: FateDrawSheet },
  'actions-quest-board': { title: '委托板', load: QuestBoardSheet },
  'actions-bigdeal-panel': { title: 'BIG DEAL 大事面板', load: BigDealPanel },
  'actions-bigdeal-home': { title: 'BIG DEAL 聚合卡（全状态预览）', load: BigDealHomeCard },
  'actions-bigdeal-step-cutin': { title: '大事推进一步', load: BigDealStepCutIn, backdrop: ACT },
  'actions-wish-mount': { title: '挂到愿望', load: WishMountPicker, backdrop: ACT },
  'actions-wish-ring': { title: '距离环 WishRing / GoalArc', load: WishRing },
  'actions-cc-editor': { title: '宣告卡编辑器（行动页倒计时面）', load: CallingCardEditor, backdrop: ACT },
  'actions-cc-delete': { title: '删除倒计时确认（行动页倒计时面）', load: CallingCardSectionDeleteConfirm, backdrop: ACT },
  // ── 记账 ──
  'ledger-settle-sheet': { title: '心相结算', load: LedgerSettleSheet, backdrop: LED },
  'ledger-asset-register': { title: '登记资产', load: AssetBoardSheets, params: { step: 'register' }, backdrop: LED },
  'ledger-asset-detail': { title: '资产详情（附加费用）', load: AssetBoardSheets, params: { step: 'detail' }, backdrop: LED },
  'ledger-asset-delete': { title: '删除这件资产？', load: AssetBoardDeleteConfirm, backdrop: LED },
  'ledger-entry-confirm': { title: '确认这一笔', load: LedgerEntrySheet, backdrop: LED },
  'ledger-batch-confirm': { title: '确认 N 笔', load: LedgerBatchSheet, backdrop: LED },
  'ledger-delete-confirm': { title: '删除这一笔？', load: LedgerDeleteConfirm, backdrop: LED },
  'ledger-budget-sheet': { title: '本月预算 / 新的一程', load: LedgerBudgetSheet, backdrop: LED },
  'ledger-reconcile-sheet': { title: '余额对账 / 设置当前余额', load: LedgerReconcileSheet, backdrop: LED },
  'ledger-saved': { title: '记账完成', load: LedgerSavedModal, backdrop: LED },
  // ── 星象 / 图鉴 ──
  'astro-day-review': { title: '当日塔罗回看', load: FateGlimpse, params: { step: 'review' }, backdrop: AST },
  'astro-glimpse-flow': { title: '窥探命运（七日连星 → 仪式 → 解读 → 祝福）', load: FateGlimpse, params: { state: 'progress' } },
  'achv-tarot-flip': { title: '塔罗翻面卡', load: TarotFlipView },
  'achv-season-flip': { title: '岁时翻面卡', load: FlipCardView },
  'achv-codex': { title: '图鉴 CodexTab（预览舞台）', load: CodexTabPreview },
  // ── 全局 ──
  'global-bigdeal-clear': { title: 'BIG DEAL 收官结算', load: BigDealClearCutIn },
  'global-wish-progress': { title: '愿望进度 Cut-in', load: WishProgressCutIn },
  'global-wish-proposal': { title: '要更新这个愿望的进度吗？', load: WishProposalDialog },
  'global-return-panel': { title: '回归面板 / 一句话概括 / 补记日历', load: ReturnPanel },
  // ── 演出（fxCatalog pkg=4） ──
  'fx-ledger-saved': { title: '记账完成 · 单笔', load: LedgerSavedModal, backdrop: LED, ms: 3200 },
  'fx-ledger-saved-batch': { title: '记账完成 · 批量', load: LedgerSavedModal, params: { variant: 'batch' }, backdrop: LED, ms: 3200 },
  'fx-bigdeal-step': { title: '大事推进一步', load: BigDealStepCutIn, backdrop: ACT, ms: 3000 },
  'fx-bigdeal-clear': { title: 'BIG DEAL 收官结算', load: BigDealClearCutIn, ms: 4200 },
  'fx-wish-progress': { title: '愿望进度 · 更近了', load: WishProgressCutIn, ms: 3200 },
  'fx-wish-progress-flat': { title: '愿望进度 · 持平', load: WishProgressCutIn, params: { variant: 'flat' }, ms: 3200 },
  'fx-wish-progress-local': { title: '愿望进度 · 本地估算', load: WishProgressCutIn, params: { variant: 'local' }, ms: 3200 },
  'fx-wish-fulfill': { title: '愿望实现 · 长按', load: WishFulfillDialog, params: { auto: '1' }, ms: 3000 },
  'fx-wish-fulfill-done': { title: '愿望实现 · 夺回', load: WishFulfillDialog, params: { state: 'done' }, ms: 3000 },
  'fx-weekly-celebrate': { title: '本周目标达成', load: CelebrationModal, backdrop: ACT, ms: 3400 },
  'fx-weekly-claimed': { title: '奖励已领取', load: ClaimedModal, backdrop: ACT, ms: 3000 },
  'fx-shuffle': { title: '洗牌', load: AstrologyFx, params: { variant: 'shuffle' }, ms: 2400 },
  'fx-daily-flip': { title: '每日翻牌', load: AstrologyFx, params: { variant: 'daily' }, ms: 3600 },
  'fx-card-name': { title: '牌名逐字揭示', load: AstrologyFx, params: { variant: 'name' }, ms: 2600 },
  'fx-long-picking': { title: '中长期六选三', load: AstrologyFx, params: { variant: 'picking' }, ms: 3400 },
  'fx-glimpse': { title: '窥探命运 · 仪式', load: FateGlimpse, params: { state: 'ritual', auto: '1' }, ms: 3400 },
  'fx-fate-draw': { title: '命运抽签 · 闸门 → 洗牌', load: FateDrawSheet, params: { auto: '1' }, ms: 3000 },
  'fx-fate-reveal': { title: '命运抽签 · 揭示', load: FateDrawSheet, params: { state: 'reveal' }, ms: 3000 },
  'fx-tarot-flip': { title: '塔罗翻面', load: TarotFlipView, params: { auto: '1' }, ms: 2600 },
  'fx-season-flip': { title: '岁时翻面', load: FlipCardView, params: { auto: '1' }, ms: 2600 },
  'fx-year-recap': { title: '年度回顾分幕舞台', load: YearRecapStage, params: { auto: '1' }, ms: 5000 },
  'red-ai-reading': { title: 'AI 逐字 · 中长期占卜解读', load: AstrologyFx, params: { variant: 'reading' }, ms: 7200 },
};
