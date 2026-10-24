// Plan 02 R03: record formal event producers, consumers and close conditions.
// Runtime evidence is limited to isolated synthetic store payloads in r03.json.
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const path = resolve(process.argv[2] ?? 'docs/THEME-BEHAVIOR-AUDIT-20261024.json');
const audit = JSON.parse(readFileSync(path, 'utf8'));

audit.scope = '计划02已完成：保留764项loader证据，R01定向时序、R02差异分支解释、R03正式演出生产/消费/关闭条件均已补齐。动态业务、视觉、真机和用户验收仍分开记录。';
audit.plan02Status = {
  status: 'complete',
  completedAt: '2026-10-24',
  r01: '7 targeted scenarios x 3 rounds passed; original empty snapshots retained as history',
  r02: '87/87 unresolved differences have branch explanations and follow-up ownership',
  r03: '14 formal event chains recorded; synthetic consumer checks documented',
  notProven: ['real business writes', 'paid model calls', 'visual acceptance', 'physical device', 'user acceptance'],
};

audit.r03Review = {
  reviewedAt: '2026-10-24',
  status: 'formal production/consumer/close map completed',
  dynamicEvidence: 'E:/MASKARIA/outputs/theme-plan02-r03-20261024-v2/r03.json',
  checks: [
    { result: 'pass', theme: 'p3r-blue', event: 'level-up', observed: 'synthetic payload rendered once' },
    { result: 'pass', theme: 'p3r-blue', event: 'wish-proposal', observed: 'synthetic payload rendered once' },
    { result: 'pass', theme: 'p3r-blue', event: 'wish-progress', observed: 'zero consumers' },
    { result: 'pass', theme: 'p3r-blue', event: 'return-panel', observed: 'zero automatic consumers' },
    { result: 'pass', theme: 'p3r-blue', event: 'calling-card', observed: 'one trigger, static reason text instead of real card title' },
    { result: 'pass', theme: 'p4g-yellow', event: 'wish-progress', observed: 'payload rendered' },
    { result: 'pass', theme: 'p4g-yellow', event: 'calling-card', observed: 'duplicate host rendered title twice' },
    { result: 'pass', theme: 'p5r-red', event: 'level-up', observed: 'zero global consumers on dashboard' },
    { result: 'pass', theme: 'p5r-red', event: 'wish-progress', observed: 'zero global consumers' },
    { result: 'pass', theme: 'p5r-red', event: 'big-deal-clear', observed: 'zero global consumers' },
  ],
  eventChains: [
    {
      id: 'boot-splash',
      themes: ['blue', 'pink', 'yellow', 'red'],
      producer: '启动渲染与主题开屏偏好；各主题原 App/shell 决定开屏组件与时长',
      consumer: '蓝粉黄由 ThemeApp 内的原 App/shell 消费；红由 RedChannelCore 内的原 App 消费',
      close: 'SplashScreen onComplete 将 showSplash 置 false；重入与真实时长未在02做像素/声音验收',
      status: 'static connected',
    },
    {
      id: 'navigation-transition',
      themes: ['blue', 'pink', 'yellow', 'red'],
      producer: 'shellBus/navigate 或 hash 路由；蓝粉黄 RouteBridge 双向同步 store.currentPage',
      consumer: '各主题 AppShell/PageHost 与 transitionDirector 对应过渡层',
      close: '过渡导演在动画完成时清当前 transition；overlay/index 等调试路由不写 currentPage',
      status: 'static connected; touch timing not acceptance',
    },
    {
      id: 'day-night-low-motion',
      themes: ['blue', 'pink', 'yellow', 'red'],
      producer: '真实 settings.darkMode 与 useBoldness/低帧/系统减弱动效',
      consumer: 'PrefsBridge 写主题 prefs；红由 RedChannelRoot 传 dark/lowMotion',
      close: '持续订阅，无一次性关闭；R01记录到 p3rMode/p3rMotion/p5rMode/p5rMotion 属性',
      status: 'static + R01 attribute evidence',
    },
    {
      id: 'todo-level-achievement-skill',
      themes: ['blue', 'pink', 'yellow', 'red'],
      producer: 'completeTodo 产生完成条与 levelUpNotification；unlockAchievement/unlockSkill 产生各自通知',
      consumer: '蓝粉黄 GlobalOverlayHost 按 level > achievement > skill 和 modalBlocker 消费；红只在首页 check 的局部队列消费',
      close: '蓝粉黄关闭时 setLevelUp/Achievement/Skill(null)；红首页在650ms后读取并清三类通知后 playQueue',
      status: 'blue dynamic pass; red cross-page gap B07/B09',
    },
    {
      id: 'big-deal-clear',
      themes: ['blue', 'pink', 'yellow', 'red'],
      producer: '完成 BIG DEAL 后 store 写 bigDealClear 载荷并清状态',
      consumer: '蓝粉黄 GlobalOverlayHost；红没有等价全局宿主',
      close: '蓝粉黄 onClose 调 clearBigDealClear；红注入验证无可见消费者',
      status: 'blue/pink/yellow connected; red gap B07',
    },
    {
      id: 'wish-progress',
      themes: ['blue', 'pink', 'yellow', 'red'],
      producer: 'bumpWishProgress/evaluateWishProgress 写 wishProgressCut（本地或AI来源、20秒节流）',
      consumer: '黄色 GlobalOverlayHost 的 WishProgressView；蓝粉红没有自动宿主',
      close: '黄色 onClose 调 clearWishProgressCut；蓝粉可用 registry 预览，但不等于正式消费',
      status: 'yellow dynamic pass; blue dynamic zero; pink static same; red dynamic zero',
    },
    {
      id: 'wish-proposal',
      themes: ['blue', 'pink', 'yellow', 'red'],
      producer: 'store.wishProposal（助手提议，dry-run 不直接写进度）',
      consumer: '蓝粉黄 GlobalOverlayHost 的 WishProposalDialog；红无全局宿主',
      close: '取消清 proposal；确认先 get().setWishProgress，再清 proposal；调用未 await，失败也会先关',
      status: 'blue dynamic pass; async failure gap B09',
    },
    {
      id: 'calling-card-archive',
      themes: ['blue', 'pink', 'yellow'],
      producer: 'callingCards 中出现 archived=true、cutInShown=false、非 terminal 的卡片',
      consumer: '蓝粉由 CallingCardOverlayHost 消费；黄同时由 GlobalOverlayHost 和 CallingCardOverlayHost 消费',
      close: '关闭后 callingCardOps.markShown/id 或 store.markCallingCardCutInShown；蓝粉组件未接收真实 card，标题回退为 reason 演示卡；黄双宿主各自等待关闭',
      status: 'blue dynamic one host with fallback copy B17; yellow dynamic duplicate B18',
    },
    {
      id: 'confidant-rankup-starshift',
      themes: ['blue', 'pink', 'yellow', 'red'],
      producer: '同伴互动保存后的真实亲密变化与星移结果',
      consumer: '蓝粉 Cooperation 本地 RankUpChain，同时 GlobalOverlayHost 挂旧 ConfidantRankUpCutIn/Invite；黄 Cooperation 调 P4CinemaChain；红 oc 读真实同伴/事件',
      close: '由各 RankUpChain/星移流程结束回调关闭；固定 gained/charges 与全局队列关系未验',
      status: 'static risk B05; no real interaction executed in02',
    },
    {
      id: 'org-celebration',
      themes: ['blue', 'pink', 'yellow', 'red'],
      producer: 'cloudSocial.pushOrgCelebration 按 op/level/raid 去重入队',
      consumer: '蓝粉 GlobalOverlayHost 在 !modalBlocker 时显示；黄 GlobalOverlayHost 直接显示队首；红无等价全局宿主',
      close: '每次 onClose 调 shiftOrgCelebration，队列空则结束；黄的 blocker 条件不与蓝粉等价',
      status: 'static; yellow blocker gap, red consumer gap',
    },
    {
      id: 'return-panel',
      themes: ['blue', 'pink', 'yellow', 'red'],
      producer: 'markAppOpened 在离开达到阈值后写 pendingReturnPayload，并更新 lastOpenedAt/lastReturnPanelAt',
      consumer: '旧 App 顶层 ReturnPanel 在主题提前 return 后不会挂载；主题内只有 overlay registry，无自动宿主',
      close: '面板完成 commitReturn 后 clearPendingReturnPayload；当前正式链无法自动进入',
      status: 'blue dynamic zero; B04 confirmed',
    },
    {
      id: 'pwa-update',
      themes: ['blue', 'pink', 'yellow', 'red'],
      producer: 'App 的 service worker/registerSW 更新提示',
      consumer: '旧 App PWAUpdateToast 被主题提前 return 绕过；主题 overlay registry 可预览但没有自动宿主',
      close: 'Toast 选择稍后或更新后自行关闭；本轮未注册 service worker，不能做帧级动态验证',
      status: 'static consumer gap; no fake pass',
    },
    {
      id: 'orphan-image-prune',
      themes: ['blue', 'pink', 'yellow'],
      producer: 'store.orphanImagesPrompt',
      consumer: '三主题 GlobalOverlayHost',
      close: 'onConfirm 调 void pruneOrphan 后立即 dismissOrphan，未等待真实删除结果',
      status: 'static confirmed B02',
    },
    {
      id: 'red-local-notification',
      themes: ['red'],
      producer: 'store completeTodo/unlock 与 bigDealClear/wishProgress 等跨页事件',
      consumer: '只有 DashboardP5.check 读取 level/achievement/skill；RedChannelRoot/Core没有全局宿主',
      close: '首页局部消费后显式 set null；其它页面生成的同类通知会留在 store，注入动态验证无可见UI',
      status: 'R03 dynamic zero; B07 confirmed',
    },
  ],
};

for (const item of audit.differences) {
  if (/\/screens\/pages\/CallingCards\./.test(item.path)) {
    item.issueRefs = [...new Set([...(item.issueRefs ?? []), 'B17'])];
  }
  if (/\/screens\/pages\/CallingCardBoard\./.test(item.path)) {
    item.issueRefs = [...new Set([...(item.issueRefs ?? []), 'B17', 'B18'])];
  }
}

audit.r02Review.knownDefectReferences = [...new Set([
  ...audit.r02Review.knownDefectReferences,
  'B17',
  'B18',
])].sort();

writeFileSync(path, `${JSON.stringify(audit, null, 2)}\n`);
console.log(`Recorded ${audit.r03Review.eventChains.length} formal event chains in ${path}`);
