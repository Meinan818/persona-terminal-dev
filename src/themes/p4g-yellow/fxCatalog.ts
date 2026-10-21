/* 演出总览（FX 审计清单，与 FX-AUDIT.md 同源）。
 * 每一项 = 真实 repo/src 里的一段动画/演出/转场/庆祝/揭示（变体与阶段各算一项），并入了红色 P5R demo INVENTORY 的演出类条目（逆影战场除外）。
 * status：ok=原本就完整 | fixed=原本浅/偏差，本轮补完整 | added=原本缺，本轮新做 | entry=原本已实现但没有独立入口，本轮补入口 | dev=有意偏差 | na=黄频道不适用
 * play：showreel（#/overlay/fx-showreel）里一键连播的步骤；key 为 OVERLAYS 键，q 为演示参数，max 为最长停留毫秒（不自动收场的演出按此切走）。
 */
export type FxStatus = 'ok' | 'fixed' | 'added' | 'entry' | 'dev' | 'na';
export interface FxItem { id: string; title: string; group: string; real: string; route: string; status: FxStatus; note?: string; play?: { key: string; q?: string; max: number } }

const O = (key: string, q = '') => `#/overlay/${key}${q ? `?${q}` : ''}`;
const P = (key: string, max: number, q = '') => ({ key, q, max });

export const FX_GROUPS = ['开屏 · 品牌 · 转场', '成长庆祝', '宣告 · 大事 · 愿望 · 目标', '羁绊', '组织据点', '星象 · 抽签 · 翻牌', '首页', '其它'] as const;

export const FX: FxItem[] = [
  // ── 开屏 · 品牌 · 转场 ──
  { id: 'fx-splash-p4', title: '开屏 · 黄色警戒线 P4Splash', group: '开屏 · 品牌 · 转场', real: 'src/components/SplashScreen.tsx#P4Splash', route: O('boot-splash-p4'), status: 'ok', play: P('boot-splash-p4', 6500) },
  { id: 'fx-splash-reduced', title: '开屏 · 安全模式轻开屏', group: '开屏 · 品牌 · 转场', real: 'src/App.tsx（reduced=safeMode）', route: O('boot-splash-p4', 'state=reduced'), status: 'ok', play: P('boot-splash-p4', 3000, 'state=reduced') },
  { id: 'fx-splash-velvet', title: '开屏 · MASKARIA 默认（VelvetRoomSplash）', group: '开屏 · 品牌 · 转场', real: 'src/components/splash/VelvetRoomSplash.tsx', route: O('boot-splash-velvet'), status: 'ok', play: P('boot-splash-velvet', 6500) },
  { id: 'fx-brand-title', title: '品牌标题揭示 BrandTitleReveal（P4G 版）', group: '开屏 · 品牌 · 转场', real: 'src/components/BrandTitleReveal.tsx', route: O('fx-brand-title-reveal'), status: 'added', note: '真实只在非 p4 首页用（Dashboard.tsx `isP4 ? 静态 h1 MASKARIA : <BrandTitleReveal/>`）；按真实**不接入**黄色首页，仅作对照演出保留', play: P('fx-brand-title-reveal', 3800) },
  { id: 'fx-wedge', title: '重转场 · 楔形切台 WedgeCutAct', group: '开屏 · 品牌 · 转场', real: 'src/components/transition/HeavyTransition.tsx#WedgeCutAct', route: O('shell-transition-wedge'), status: 'ok', play: P('shell-transition-wedge', 2600) },
  { id: 'fx-water', title: '重转场 · 底栏涨潮 WaterRippleAct', group: '开屏 · 品牌 · 转场', real: 'src/components/transition/HeavyTransition.tsx#WaterRippleAct', route: O('shell-transition-water'), status: 'ok', play: P('shell-transition-water', 2600) },
  { id: 'fx-circle-reveal', title: '页面圆形揭示 PageShell（REVEAL_MS 540）', group: '开屏 · 品牌 · 转场', real: 'src/App.tsx#PageShell + ui/transitionDirector', route: '#/p/dashboard', status: 'dev', note: '真实靠 clip-path 圆扩散，违反「只动 transform/opacity」；demo 由 TideSquares 涨潮→退潮承担同一段' },
  { id: 'fx-wheel', title: '长按轮盘展开 RadialWheelP4', group: '开屏 · 品牌 · 转场', real: 'src/components/RadialWheelP4.tsx', route: O('shell-radial-wheel'), status: 'ok' },
  { id: 'fx-wheel-d0', title: '轮盘 · 低动效纵向菜单 WheelD0Menu', group: '开屏 · 品牌 · 转场', real: 'src/components/RadialQuickNav.tsx（D0）', route: O('shell-radial-wheel', 'state=reduced'), status: 'ok' },
  { id: 'fx-welcome-blessing', title: '欢迎引导 · 赐福收尾（黄黑条纹 + 英文巨词横穿）', group: '开屏 · 品牌 · 转场', real: 'src/components/WelcomeModal.tsx（blessing）', route: O('boot-welcome', 'step=blessing'), status: 'ok' },
  // ── 成长庆祝 ──
  { id: 'fx-levelup', title: '属性升级 LevelUp（恭喜升级！）', group: '成长庆祝', real: 'src/components/LevelUpModal.tsx → p4r/cutins.tsx#LevelUpP4', route: O('global-levelup'), status: 'fixed', note: '补：属性大字 .32 / Lv 行 .46 / 蓝圆号 .62 分段弹出、星花迸开、背后同心环、主徽呼吸', play: P('global-levelup', 4600) },
  { id: 'fx-levelup-mastery', title: '精通提升（★ 精通，LevelUp 精通变体）', group: '成长庆祝', real: 'src/components/LevelUpModal.tsx（masteryStars）→ LevelUpP4', route: O('global-levelup', 'variant=mastery'), status: 'entry', note: '原来只有 ?variant=mastery、索引无入口', play: P('global-levelup', 4600, 'variant=mastery') },
  { id: 'fx-todo-complete', title: '今日完成（+点数 · 跳音符）', group: '成长庆祝', real: 'src/components/TodoCompleteModal.tsx → TodoCompleteP4', route: O('global-todo-complete'), status: 'ok', play: P('global-todo-complete', 3600) },
  { id: 'fx-todo-complete-unlock', title: '今日完成 · 解锁提示「✦ 你解锁了新成就 / 新技能！」', group: '成长庆祝', real: 'TodoCompleteP4（unlockHint）', route: O('global-todo-complete', 'variant=unlock'), status: 'entry', play: P('global-todo-complete', 3600, 'variant=unlock') },
  { id: 'fx-save-success', title: '记录成功（复用今日完成贴纸）', group: '成长庆祝', real: 'src/components/SaveSuccessModal.tsx（p4 → TodoCompleteP4 heading=记录成功）', route: O('actions-save-success'), status: 'fixed', note: '原来是 CutInFrame 斜带立绘版，与真实 p4 分支不符', play: P('actions-save-success', 3600) },
  { id: 'fx-save-success-unlock', title: '记录成功 · 解锁提示', group: '成长庆祝', real: 'SaveSuccessModal（unlockHint）', route: O('actions-save-success', 'variant=unlock'), status: 'entry', play: P('actions-save-success', 3600, 'variant=unlock') },
  { id: 'fx-ledger-saved', title: '记账完成 · 单笔', group: '成长庆祝', real: 'src/components/LedgerSavedModal.tsx（p4 → TodoCompleteP4 heading=记账完成）', route: O('ledger-saved'), status: 'fixed', note: '原来是 CutInFrame + 2.6s；改为贴纸演出 3.2s', play: P('ledger-saved', 3600) },
  { id: 'fx-ledger-saved-batch', title: '记账完成 · 批量「共 N 笔已入账」', group: '成长庆祝', real: 'LedgerSavedModal（batch title）', route: O('ledger-saved', 'variant=batch'), status: 'entry', play: P('ledger-saved', 3600, 'variant=batch') },
  { id: 'fx-achievement', title: '成就解锁（奖杯徽 + 蓝名板）', group: '成长庆祝', real: 'src/components/AchievementUnlockModal.tsx → AchievementUnlockP4', route: O('global-achievement-unlock'), status: 'fixed', note: '补：蓝名板 .48 自左拉开、旗标 .62、星花迸开', play: P('global-achievement-unlock', 4900) },
  { id: 'fx-skill', title: '技能解锁（橙圆贴纸）', group: '成长庆祝', real: 'src/components/SkillUnlockModal.tsx → CelebrationCutIn(p4)', route: O('global-skill-unlock'), status: 'fixed', note: 'autoClose 4.2→4.0s 对齐真实', play: P('global-skill-unlock', 4400) },
  { id: 'fx-celebration-base', title: '庆祝贴纸基座 CelebrationCutIn', group: '成长庆祝', real: 'src/components/CelebrationCutIn.tsx（isP4）', route: O('global-celebration-base', 'variant=plain'), status: 'ok' },
  // ── 宣告 · 大事 · 愿望 · 目标 ──
  { id: 'fx-calling-cleared', title: '宣告卡结算 · 达成 CLEARED', group: '宣告 · 大事 · 愿望 · 目标', real: 'src/components/callingCard/CallingCardCutIn.tsx（auto_todos）', route: O('global-calling-card-cutin'), status: 'fixed', note: '时序对齐：印章 1.05s SLAM、按钮 1.4s', play: P('global-calling-card-cutin', 4200) },
  { id: 'fx-calling-expired', title: '宣告卡结算 · 时之至 EXPIRED', group: '宣告 · 大事 · 愿望 · 目标', real: 'CallingCardCutIn（auto_date）', route: O('global-calling-card-cutin', 'variant=expired'), status: 'entry', play: P('global-calling-card-cutin', 4200, 'variant=expired') },
  { id: 'fx-calling-archived', title: '宣告卡结算 · 已收（手动收存）', group: '宣告 · 大事 · 愿望 · 目标', real: 'CallingCardCutIn（manual）', route: O('global-calling-card-cutin', 'variant=archived'), status: 'entry', note: '页面真实触发：#/p/callingcard（宣告卡总览，demo 新增页）任一卡点「归档」', play: P('global-calling-card-cutin', 4200, 'variant=archived') },
  { id: 'fx-bigdeal-step', title: 'BIG DEAL 推进一步', group: '宣告 · 大事 · 愿望 · 目标', real: 'src/components/bigdeal/BigDealStepCutIn.tsx → CelebrationCutIn(p4)', route: O('actions-bigdeal-step-cutin'), status: 'fixed', note: '原 CutInFrame 3.0s → 橙贴纸 2.2s + 进度条推进', play: P('actions-bigdeal-step-cutin', 2600) },
  { id: 'fx-bigdeal-clear', title: 'BIG DEAL 大功告成（+弹幕 / 写一句鼓励）', group: '宣告 · 大事 · 愿望 · 目标', real: 'src/components/bigdeal/BigDealClearCutIn.tsx', route: O('global-bigdeal-clear'), status: 'ok', play: P('global-bigdeal-clear', 4200) },
  { id: 'fx-wish-progress', title: '愿望进度 · 又近了一步（+N%）', group: '宣告 · 大事 · 愿望 · 目标', real: 'src/components/wish/WishProgressCutIn.tsx → CelebrationCutIn(p4)', route: O('global-wish-progress'), status: 'fixed', note: '原 CutInFrame 3.6s → 橙贴纸 2.6s + 距离环推进', play: P('global-wish-progress', 3000) },
  { id: 'fx-wish-progress-flat', title: '愿望进度 · 持平态', group: '宣告 · 大事 · 愿望 · 目标', real: 'WishProgressCutIn（delta=0）', route: O('global-wish-progress', 'variant=flat'), status: 'entry', play: P('global-wish-progress', 3000, 'variant=flat') },
  { id: 'fx-wish-progress-local', title: '愿望进度 · 本地估算', group: '宣告 · 大事 · 愿望 · 目标', real: 'WishProgressCutIn（source=local）', route: O('global-wish-progress', 'variant=local'), status: 'entry' },
  { id: 'fx-wish-fulfill', title: '愿望实现 · 长按确认', group: '宣告 · 大事 · 愿望 · 目标', real: 'src/components/wish/WishFulfillDialog.tsx', route: O('actions-wish-fulfill'), status: 'ok' },
  { id: 'fx-wish-fulfill-done', title: '愿望实现 · 结算「这一路你为它记下了 N 次」', group: '宣告 · 大事 · 愿望 · 目标', real: 'WishFulfillDialog（done）', route: O('actions-wish-fulfill', 'step=done'), status: 'entry', play: P('actions-wish-fulfill', 3000, 'step=done') },
  { id: 'fx-weekly-celebrate', title: '本周目标达成！（彩纸迸开 + 领奖选择）', group: '宣告 · 大事 · 愿望 · 目标', real: 'src/components/weeklyGoal/CelebrationModal.tsx', route: O('actions-weekly-goal-celebrate'), status: 'fixed', note: '补：打开瞬间彩纸迸开（真实 40 片 particles）', play: P('actions-weekly-goal-celebrate', 3000) },
  { id: 'fx-weekly-claimed', title: '奖励已领取！', group: '宣告 · 大事 · 愿望 · 目标', real: 'src/components/weeklyGoal/ClaimedModal.tsx → CelebrationCutIn(p4)', route: O('actions-weekly-goal-claimed'), status: 'fixed', note: '原 CutInFrame → 橙贴纸 2.6s', play: P('actions-weekly-goal-claimed', 3000) },
  // ── 羁绊 ──
  { id: 'fx-rankup', title: '羁绊 RANK UP · 电视节目版', group: '羁绊', real: 'src/components/cooperation/ConfidantRankUpCutInP4.tsx', route: O('bond-rankup-cutin-p4'), status: 'ok', play: P('bond-rankup-cutin-p4', 7000) },
  { id: 'fx-celebrate', title: '亲密度升级恭喜页 · 有星移次数', group: '羁绊', real: 'src/components/cooperation/ConfidantCelebrateScreenP4.tsx', route: O('bond-celebrate-p4'), status: 'ok', play: P('bond-celebrate-p4', 4500) },
  { id: 'fx-celebrate-0', title: '亲密度升级恭喜页 · 无星移次数（欣然接受）', group: '羁绊', real: 'ConfidantCelebrateScreenP4（charges=0）', route: O('bond-celebrate-p4', 'charges=0'), status: 'entry', play: P('bond-celebrate-p4', 4500, 'charges=0') },
  { id: 'fx-starshift-input', title: '星移 · 输入', group: '羁绊', real: 'src/components/cooperation/ConfidantStarShiftModalP4.tsx（input）', route: O('bond-starshift-p4'), status: 'ok' },
  { id: 'fx-starshift-loading', title: '星移 · 推演中', group: '羁绊', real: 'ConfidantStarShiftModalP4（loading）', route: O('bond-starshift-p4', 'stage=loading'), status: 'entry', play: P('bond-starshift-p4', 3500, 'stage=loading') },
  { id: 'fx-starshift-preview', title: '星移 · 预览', group: '羁绊', real: 'ConfidantStarShiftModalP4（preview）', route: O('bond-starshift-p4', 'stage=preview'), status: 'entry' },
  { id: 'fx-starshift-done', title: '星移 · 完成', group: '羁绊', real: 'ConfidantStarShiftModalP4（done）', route: O('bond-starshift-p4', 'stage=done'), status: 'entry', play: P('bond-starshift-p4', 3500, 'stage=done') },
  { id: 'fx-starshift-error', title: '星移 · 出错', group: '羁绊', real: 'ConfidantStarShiftModalP4（error）', route: O('bond-starshift-p4', 'stage=error'), status: 'entry' },
  { id: 'fx-cinema', title: '升级链电影层（RANK UP → 恭喜 → 星移 全链）', group: '羁绊', real: 'src/components/cooperation/confidantP4Cinema.tsx', route: O('bond-p4-cinema'), status: 'ok' },
  { id: 'fx-prayer', title: '祈愿特效 · 送出', group: '羁绊', real: 'src/components/cooperation/PrayerEffectOverlay.tsx', route: O('bond-prayer-fx'), status: 'fixed', note: '红色审计回补：时长改回真实 1800ms；补外圈辐射环 2.6× + 10 颗星粒（半径 140）', play: P('bond-prayer-fx', 2400) },
  { id: 'fx-prayer-recip', title: '祈愿特效 · 互祈 RECIPROCAL', group: '羁绊', real: 'PrayerEffectOverlay（reciprocal）', route: O('bond-prayer-fx', 'kind=reciprocal'), status: 'fixed', note: '红色审计回补：入口原已有；补真实两态差异——2400ms、16 颗星粒半径 180、外圈 3.2×、中心星 -30° 转入、副星交汇', play: P('bond-prayer-fx', 2800, 'kind=reciprocal') },
  { id: 'fx-allout', title: '总攻击 ALL-OUT', group: '羁绊', real: 'src/components/cooperation/AllOutOverlay.tsx', route: O('bond-allout'), status: 'ok', play: P('bond-allout', 2600) },
  { id: 'fx-victory', title: '共战结算 · 胜利', group: '羁绊', real: 'src/components/cooperation/CoopVictoryScreen.tsx', route: O('bond-victory'), status: 'ok', play: P('bond-victory', 3500) },
  { id: 'fx-victory-retreat', title: '共战结算 · 撤退', group: '羁绊', real: 'CoopVictoryScreen（retreat）', route: O('bond-victory', 'kind=retreat'), status: 'entry' },
  { id: 'fx-namefx', title: '名字特效 ConfidantNameFx（待回祈流光 / 满级粒子）', group: '羁绊', real: 'src/components/cooperation/ConfidantNameFx.tsx', route: O('bond-namefx'), status: 'fixed', note: '红色审计回补：原为透明度闪烁 + 下划线（浅）；按真实 p4 分支重写为 background-clip 流光（#b26a00 ⇄ #ffd900 / 原字色）+ 满级橙字三粒子，补独立入口 #/overlay/bond-namefx', play: P('bond-namefx', 3200) },
  { id: 'fx-wall-spin', title: '专辑墙翻牌 / 背景星（WallSpinBackdrop 对应）', group: '羁绊', real: 'src/components/cooperation/ConfidantAlbumWall.tsx + WallSpinBackdrop.tsx', route: '#/p/cooperation?view=wall', status: 'ok' },
  // ── 组织据点 ──
  { id: 'fx-org-level', title: '组织庆祝 · 据点升级', group: '组织据点', real: 'src/components/org/OrgCelebrationCutIn.tsx → CelebrationCutIn(p4)', route: O('hideout-org-celebration', 'kind=level'), status: 'fixed', note: '原 CutInFrame → 橙贴纸 3.6s', play: P('hideout-org-celebration', 4000, 'kind=level') },
  { id: 'fx-org-raid', title: '组织庆祝 · 满月团战 · 暗影击退', group: '组织据点', real: 'OrgCelebrationCutIn（raid）', route: O('hideout-org-celebration', 'kind=raid'), status: 'entry', play: P('hideout-org-celebration', 4000, 'kind=raid') },
  { id: 'fx-org-op', title: '组织庆祝 · 目标 / 作战达成', group: '组织据点', real: 'OrgCelebrationCutIn（op）', route: O('hideout-org-celebration', 'kind=op'), status: 'entry', play: P('hideout-org-celebration', 4000, 'kind=op') },
  { id: 'fx-raid-strike', title: '满月团战 · 出手', group: '组织据点', real: 'src/components/org/RaidSheet.tsx', route: O('hideout-raid', 'state=struck'), status: 'ok' },
  { id: 'fx-member-flip', title: '成员牌翻面', group: '组织据点', real: 'src/pages/Hideout.tsx（FlipCardView）', route: O('hideout-member-flip'), status: 'ok' },
  // ── 星象 · 抽签 · 翻牌 ──
  { id: 'fx-shuffle', title: '每日塔罗 · 洗牌 ShuffleAnim（1.8s：交错 → 收叠）', group: '星象 · 抽签 · 翻牌', real: 'src/components/astrology/ShuffleAnim.tsx', route: '#/p/astrology?tab=daily&state=intro', status: 'fixed', note: '原来无限循环 2.6s、没有收叠阶段' },
  { id: 'fx-daily-flip', title: '每日塔罗 · 翻牌', group: '星象 · 抽签 · 翻牌', real: 'src/components/astrology/DailyDraw.tsx（flipping）', route: '#/p/astrology?tab=daily&state=flipping', status: 'entry' },
  { id: 'fx-card-name', title: '牌名逐字揭示 CardNameReveal（逐字弹入 + 逆位签 + 高光扫过）', group: '星象 · 抽签 · 翻牌', real: 'src/components/astrology/CardNameReveal.tsx', route: '#/p/astrology?tab=daily&state=flipping', status: 'added', note: '原来翻牌后牌名是静态文字' },
  { id: 'fx-long-picking', title: '中长期占卜 · 六选三 / 揭示', group: '星象 · 抽签 · 翻牌', real: 'src/components/astrology/LongReadingFlow.tsx（picking/revealing）', route: '#/p/astrology?tab=long&step=picking', status: 'ok' },
  { id: 'fx-glimpse', title: '窥探命运 · 长按蓄力 + 揭示', group: '星象 · 抽签 · 翻牌', real: 'src/components/astrology/FateGlimpse.tsx', route: O('astro-glimpse-flow'), status: 'ok' },
  { id: 'fx-fate-draw', title: '命运抽签 · 洗牌（1s）', group: '星象 · 抽签 · 翻牌', real: 'src/components/fate/FateDrawSheet.tsx', route: O('actions-fate-draw'), status: 'ok' },
  { id: 'fx-fate-reveal', title: '命运抽签 · 翻面揭示', group: '星象 · 抽签 · 翻牌', real: 'FateDrawSheet（reveal）', route: O('actions-fate-draw', 'step=reveal'), status: 'entry' },
  { id: 'fx-tarot-flip', title: '图鉴 · 塔罗翻面', group: '星象 · 抽签 · 翻牌', real: 'src/components/codex/TarotFlipView.tsx', route: O('achv-tarot-flip'), status: 'ok' },
  { id: 'fx-season-flip', title: '图鉴 · 岁时翻面', group: '星象 · 抽签 · 翻牌', real: 'src/components/codex/FlipCardView.tsx + SeasonCard.tsx', route: O('achv-season-flip'), status: 'ok' },
  // ── 首页 ──
  { id: 'fx-decay', title: '逆流侵蚀（衰减）通知', group: '首页', real: 'src/pages/Dashboard.tsx（decayedAttrs）', route: O('home-decay-modal'), status: 'ok', play: P('home-decay-modal', 2500) },
  { id: 'fx-countercurrent', title: '逆流预警仪式卡', group: '首页', real: 'src/pages/Dashboard.tsx（countercurrent slide）', route: '#/p/dashboard?sec=ritual&slide=countercurrent', status: 'ok' },
  { id: 'fx-flower-zoom', title: '人格五角星 · 旋转放大 → 原地属性详情', group: '首页', real: 'src/components/FlowerChart.tsx + AttrDetailInlineP4.tsx', route: '#/p/dashboard?attr=knowledge', status: 'ok' },
  { id: 'fx-sky-flip', title: '天空角标 · 月相⇄天气翻牌', group: '首页', real: 'src/pages/Dashboard.tsx#P4SkyBadge', route: '#/p/dashboard?sky=weather', status: 'ok' },
  { id: 'fx-season-stamp', title: '岁时小签 + 气泡', group: '首页', real: 'src/components/dashboard/SeasonStampBadge.tsx', route: O('home-season-stamp'), status: 'ok' },
  { id: 'fx-urgent-toast', title: '临期 Toast（扫描线闪）', group: '首页', real: 'src/pages/Dashboard.tsx（urgentToast）', route: O('home-urgent-toast'), status: 'ok' },
  { id: 'fx-ritual-stack', title: '今日仪式横滑卡组（StackCarousel 对应）', group: '首页', real: 'src/components/StackCarousel.tsx', route: '#/p/dashboard?sec=ritual', status: 'ok' },
  // ── 其它 ──
  { id: 'fx-danmaku', title: '弹幕层 DanmakuLayer', group: '其它', real: 'src/components/danmaku/DanmakuLayer.tsx', route: O('global-danmaku-layer'), status: 'ok', play: P('global-danmaku-layer', 3000) },
  { id: 'fx-year-recap', title: '年度回顾分幕舞台', group: '其它', real: 'src/components/annual/YearRecapStage.tsx', route: O('actions-year-recap'), status: 'ok' },
  { id: 'fx-level-title', title: '等级称号 · 刷新建议（AI 刷新）', group: '其它', real: 'src/pages/Settings.tsx（levelTitleModal）', route: O('settings-level-title-modal'), status: 'ok', note: '真实无独立庆祝演出，只有弹窗开合' },
  { id: 'fx-p5-calling-card', title: '验证码预告函 P5CallingCard（剪报逐字）', group: '其它', real: 'src/components/auth/P5CallingCard.tsx', route: O('account-login', 'step=otp'), status: 'na', note: '真实仅红频道；黄频道走普通验证码步骤' },
  { id: 'fx-p5r-gallery', title: '演出总览 · 一键连播（对应 P5R CutIns-gallery）', group: '其它', real: '（demo 索引）', route: O('fx-showreel'), status: 'added' },
];

export const FX_PLAYLIST = FX.filter((f) => f.play).map((f) => ({ id: f.id, title: f.title, ...f.play! }));
