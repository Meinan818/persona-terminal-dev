# 计划03 · 四主题接入边界（已完成）

核对日期：2026-10-24。工作树：`E:\MASKARIA\worktrees\theme-integrate`；分支：`codex/theme-integrate`；核对基点：`b942018`。

本报告只回答“四主题分别从哪里读、写到哪里、错误从哪里来、最终保存在哪里”。本轮没有修改业务、UI、CSS、素材、动画或音效，没有进入计划04及后续修复，也没有重跑计划02的764项loader。

## 结论

1. **核心业务只有一套数据底座。** 本地业务数据走 `src/store/index.ts` 的应用状态和 `src/db/index.ts` 的 `PGTDatabase`；云端身份、同步和社交能力走 `src/services/*`；主题层只负责显示映射和把操作转回现有 action。
2. **没有第二套数据库或第二套业务层。** 当前只有一个 Dexie 类，应用业务只使用 `useAppStore`。云端社交另用 `useCloudStore`、`useCloudSocialStore` 和 navigator store 管理不同职责，不复制本地业务表。
3. **黄、粉、蓝主要通过适配器读取 store 和服务。** 首页已统一从 `src/themes/homeData.ts` 读取；行动、同伴、据点、占星、统计、记账、账号、菜单和导航分别经现有 adapters 接到 store、Dexie 或 services。
4. **红频道主要通过 `src/p5r-red/adapter/live.ts` 把 store 原地投影到 demo mock。** 根入口首帧前同步一次，store 相关字段变化后再同步；业务按钮直接调用同一个 store action。据点另走 `src/p5r-red/adapter/hideoutData.ts`。
5. **业务规则可共用，但闭环尚未全部完成。** 已能确认同一任务、记账、愿望、宣告卡、同伴、账号和同步入口最终落到同一 store/服务；计划02登记的 B01–B18 仍表示具体页面的错误处理、消费、回传或演示残留没有修完。
6. **本轮不提取公共函数。** 三套 adapter 存在形状差异和重复代码，但未在本轮复现出必须靠提取才能解决的缺陷；按计划边界保留现状，交给对应业务计划处理。

## 权威数据地图

| 数据域 | 真实读取来源 | 正式写入入口 | 保存位置 | 主要错误来源 |
|---|---|---|---|---|
| 用户、主题、设置 | `useAppStore.user/settings` | `createUser`、`updateUser`、`setTheme`、`updateSettings` | Dexie `users`、`settings`；改阈值时同事务更新 `attributes`。登录令牌单独保存在 `localStorage` | Dexie 写失败；设置并发写锁会记录并抛出；`themeSelection.ts` 会拒绝无效主题 |
| 属性、活动记录、首页统计 | `useAppStore.attributes/activities/todos/...`；首页统一读 `themes/homeData.ts` | `addActivity`、`updateAttribute`、`deleteActivity`、`deleteActivityRecordOnly`、`completeTodo` | Dexie `activities`、`attributes`、`achievements`、`skills`、`todos`、`todoCompletions` | 事务拒绝、记录不存在、角色切换、撤销链路找不到原活动 |
| 任务、完成计数、BIG DEAL | `useAppStore.todos/todoCompletions/weeklyGoals`，以及 `db.quests` | `addTodo`、`updateTodo`、`completeTodo`、撤销/子步/收官 action、周目标/委托 action | Dexie `todos`、`todoCompletions`、`activities`、`weeklyGoals`、`quests`、`stamps` | `completeTodo` 在单事务内判重；角色变化会中止；AI拆步在无配置或请求失败时抛错，由UI回退 |
| 愿望、宣告卡、成长总结 | `useAppStore.wishes/callingCards/summaries` | 现有 wishes/callingCards/summaries actions | Dexie `wishes`、`callingCards`、`summaries`；宣告卡“留下记录”另写 `activities` | 校验/Dexie失败；愿望AI评估无Key或超时；部分主题未等待写回即更新UI，见B09 |
| 记账、预算、资产 | `useAppStore.ledgerEntries/budgets/assets/ledgerLoaded` | `ledgerOperations.ts` 和 `useAppStore.addLedgerEntry/deleteLedgerEntry/setBudget/adjustAccountBalances/addAsset...` | Dexie `ledgerEntries`、`budgets`、`assets`；结算奖励还会写 `settings`、`attributes`、`activities` 或 `battleStates` | adapter输入校验、Dexie事务、对账失败、月份/周期口径；预算展示仍有B03 |
| 今日塔罗、命运窥探、中长期占卜 | `useAppStore.dailyDivination/fateGlimpses/longReadings`；窗口查询走 `db.dailyDivinations` | `saveDailyDivination`、`createFateGlimpse`、`saveLongReading` 等 | Dexie `dailyDivinations`、`fateGlimpses`、`longReadings` | Dexie失败；AI生成取消、超时、无配置时由UI使用离线内容或明确报错 |
| 成就、技能、岁时收藏 | `useAppStore.achievements/skills/activities/todoCompletions/...`；`db.quests`、`db.stamps` 派生进度 | `unlockAchievement`、`unlockSkill`、自定义成就/技能 actions、委托和岁时写入链路 | Dexie `achievements`、`skills`、`quests`、`stamps`；自定义定义同时镜像到 `settings` | Dexie失败；条件进度按现有计算函数生成；红频道没有完整全局通知消费者，见B07/B09 |
| 同伴、羁绊事件、谏言 | `useAppStore.confidants/confidantEvents/counselSession/counselArchives`；在线档案来自 `useCloudSocialStore` | 同伴 CRUD/互动/星移/归档/谏言 actions | Dexie `confidants`、`confidantEvents`、`counselSessions`、`counselArchives`；在线档案快照写入 `confidants.linkedProfile` | 阿卡纳冲突、当日重复互动、COOP解除失败、AI失败；加点/事件用同一 Dexie 事务防重复 |
| 好友、祈愿、COOP、约定、通知 | `useCloudSocialStore`，数据由 `loadSocial` 从 services 拉取 | `friendsApi`、`prayersApi`、`coopBondsApi`、`coopPactsApi`、`coopShadowsApi`、`notificationsApi` | 主要保存在后端，内存视图不落 Dexie；COOP 事件会物化为本地同伴；待发送描述/偏好使用 `localStorage` | `VelvetApiError`/网络错误；`loadSocial` 把主加载错误写入 `lastError`，部分子流程只记录日志并降级；红频道仍有固定演示数据 |
| 组织、据点、作战、团战 | `useCloudSocialStore.orgs`；黄粉蓝经 `astrologyData.useOrgView`/`orgData`，红经 `hideoutData.ts` | `orgs.ts`、`orgOpsSync.ts`、`orgRaidSync.ts` | 后端 `/api/social/orgs*`、`/ops`、`/raids`、`/checkins`；本机待同步状态和已读偏好写 `localStorage` | `OrgError`/字段错误/网络失败；红历史、纪要和部分写操作尚未完成，按计划08处理 |
| 账号、登录、同步 | `useCloudStore.cloudUser`；令牌记录由 `velvetApi` 恢复 | `accountAuth.ts`、auth/sync services；账号页确认按钮必须分别核对 | 后端 `/api/velvet/*`、`/api/sync/*`、`/api/avatar`；令牌/记录在 `localStorage`；业务数据仍先保存在 Dexie | `VelvetApiError`、会话过期、`SyncConflictError`、`SyncSchemaError`；B01说明部分账号按钮仍只toast或本地切状态 |
| 黑猫助手与AI能力 | `useNavigatorStore`、`useAppStore.settings`、Dexie 会话/记忆；模型配置在 Settings | navigator actions、现有 AI utilities、`updateSettings` | Dexie `navigatorSessions/messages/memos/presets`；配置随 `settings` 保存；部分推送/偏好写 `localStorage` | 缺Key、provider/HTTP错误、Abort、超时；会话写库失败当前多数只 `console.warn`，不伪造成功 |
| UMBRA战斗与高塔 | `useAppStore.persona/shadow/battleState/umbraProfile/umbraRun/stratum` | 现有 battle/stratum actions | Dexie `personas`、`shadows`、`battleStates`、`strata`、`umbraProfiles`、`umbraRuns`、`umbraLegacyArchives` | Dexie事务、战斗合法性、AI超时/取消；引擎仍是数值和状态权威 |

## 四主题接线

### 黄、粉、蓝

| 页面域 | 黄粉蓝使用的现有接入点 | 结论 |
|---|---|---|
| 首页 | 页面直接 import `@/themes/homeData` | 三套共用一套首页投影；`pkg1` 里的同名函数不是页面当前主入口 |
| 行动、任务、记录、愿望、周目标、委托 | 各主题 `adapters/pkg2.ts` | 最终调用同一 store actions；黄的部分回调形状与蓝粉不同，但写入口一致 |
| 同伴、COOP、谏言 | 各主题 `adapters/pkg3.ts` | 导出 `cooperationData.ts` 和 `coopShadowData.ts` 的读取/操作；本地关系写 Dexie，远程关系写服务 |
| 据点、组织作战 | 各主题 `adapters/pkg4-org.ts` 和 `orgData.ts` | 读取 `useCloudSocialStore.orgs`；没有组织时返回空视图，不回填演示成员 |
| 占星、统计 | `pkg4-astro.ts`、`pkg4-stats.ts` | 读取 store 和 Dexie；AI入口沿用现有 settings/API配置 |
| 账本、成就、账号、菜单 | `adapters/pkg5.ts` | 账本再经 `ledgerOperations.ts`；账号再经 `accountAuth.ts`；菜单开关写 `settings` |
| 宣告卡 | `adapters/callingCards.ts` | 读取 `callingCards`，写回同一组 store actions |
| 黑猫与记忆 | `adapters/pkg6.ts` | 复用 `navigatorData.ts` 和 navigator store，不另建会话库 |

### 红

| 页面域 | 真实读取 | 写回 | 边界 |
|---|---|---|---|
| 首页、行动、历史、属性、愿望、宣告卡、成就、技能、账本 | `live.ts` 把 `useAppStore` 原地映射到红demo对象；`LIVE` 订阅相关字段变化后重渲染 | 页面直接调用同一 store actions | 可确认接线方向一致；部分页面先改本地副本再 `void action.catch(()=>{})`，失败反馈不完整，见B09 |
| 据点 | `hideoutData.getRedHideoutData()` 从 `cloudSocial.orgs` 派生组织、成员、动态、进行中作战 | 计划01只接通读取和安全空态；历史、纪要、团战及写操作留给计划08 | 无组织不填假成员；正式权限按 `view.me.userId` 和 `org.leaderId` |
| 账号、设置 | `accountAuth` 和 `useAppStore.settings` | 登录/改ID/改密等走auth services；部分设置仍为演示回调 | 红AccountBlocks的pull/logout/delete和AISection不能按已闭环理解，见B01/B16 |
| 同伴互动 | `live.ts` 映射真实同伴；`oc.ts` 直接调用同伴 store actions | 新建、互动等写 `confidants/confidantEvents/activities` | `README` 仍列出部分演示固定数据，页面静态常量要以实际调用为准，不能把“有action”当完整覆盖 |

## 接入判定

| 后续业务 | 接入边界判定 | 直接依据 |
|---|---|---|
| 04 任务与成长 | 复用 `useAppStore` 即可；不重建任务表或奖励引擎 | `completeTodo` 已用 Dexie事务判重，任务/计数/属性/成就/活动共用一套链路 |
| 05 记账 | 复用 `ledgerOps`、`ledgerEntries/budgets/assets`；先修后续计划中确认的月份展示等缺陷 | `ledgerOperations.ts` 负责校验、串行预算/对账，store负责Dexie写入 |
| 06 账号与同步 | 复用 `accountAuth`、`velvetApi`、`sync.ts`；不能让页面toast冒充远程成功 | auth/sync错误类型和接口端点已统一，B01/B11仍待动态验证 |
| 07 同伴与羁绊 | 复用同伴 store 与社交 services；不能为红频道另建关系表 | 本地关系在Dexie，远程关系在`/api/social/*`，在线档案只做快照 |
| 08 据点真实读写 | 复用`cloudSocial.orgs`和org services；沿用计划01红适配，不填演示成员 | 黄粉蓝和红都已从同一组织视图读取，未完成的是写操作和历史/团战边界 |
| 09 占卜、成就、设置 | 复用`astrologyData`、现有achievements/skills及settings；先核B04/B07/B17/B18 | 数据表和action都在主store，缺口集中在事件消费和部分演示回调 |
| 10 AI专项 | 复用AI utils和Settings配置；引擎或业务写入不交给模型 | navigator、活动分析、愿望评估等都已通过现有服务/配置，缺Key和超时需按真实错误显示 |

## 已确认的边界缺口

以下只登记，不在计划03修复。详细触发和证据见计划02专项报告。

- B01：账号页部分拉取、退出、删账号仍可能只改本地状态或toast，远程没有成功。
- B02：孤儿图清理不等待真实结果，失败仍可能关闭提示。
- B03：账本统计的月份与预算月份口径仍有代码级不一致。
- B04/B07：回归面板和红频道全局演出消费者不完整。
- B05/B17/B18：羁绊、宣告卡等演出存在重复宿主或真实载荷未传入的风险。
- B08：部分主题仍显示演示等级、数量或固定文案。
- B09：多个写操作先更新UI、后`void`写回，失败反馈不足。
- B16：红设置里的AI测试/保存仍有演示计时器，不能把配置读取成功当成设置已真实可用。

## 本轮验证与边界

- 只读核对：`src/store/index.ts`、`src/db/index.ts`、`src/services/*`、`src/themes/*` 共用数据模块、黄粉蓝adapters、红`live.ts`/`hideoutData.ts`以及各主题调用点。
- 静态交叉检查：黄粉蓝首页均引用`@/themes/homeData`；黄粉蓝`pkg2/pkg3/pkg5/pkg6`及`pkg4-*`已指向现有store、Dexie或services；红`live.ts`覆盖store中用户、属性、任务、愿望、宣告卡、记录、成就、技能、同伴、账本和设置等字段。
- 没有重跑764项loader、Vitest、类型检查、完整构建、Android构建、真实登录、真实社交写入、收费AI或真机验收。本轮结论是静态接入边界，不是业务闭环、视觉或用户验收。
- 没有第二套Dexie存储或第二套任务/记账业务层；没有修改store数据结构，没有改四主题外观。

## 计划03收尾

计划03完成标准已达到：每类核心业务都能指出真实读取源、正式写入口、最终保存位置和主要错误来源；四主题能追到同一套store/services；未接入或演示残留按B编号留给对应后续计划。计划04及之后仍未启动。
