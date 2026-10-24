# 计划02 · 四主题行为对照（已完成）

核对日期：2026-10-24；源码基点 `f4b35577a14d46a4713459abdf8e70e2b4b4d211`；工作树 `E:\MASKARIA\worktrees\theme-integrate`，分支 `codex/theme-integrate`。

本报告是计划02的专项证据，项目实时状态仍以 `PROJECT_STATE.md` 为唯一入口。计划02没有业务、CSS、素材、音效或动画修改，没有实施计划03及之后的修复。原交接已保留764项loader结果；接手后只补R01–R03：7个页面/宿主场景各3轮定向时序复核、87项差异的分支解释、14条正式演出的生产/消费/关闭条件。**计划02可以关闭为“差异解释与正式链路对照完成”，不等于后续业务、视觉、真机或用户验收完成。**

## 证据与本轮结果

- [逐项机器清单](THEME-BEHAVIOR-AUDIT-20261024.json)：212项逐文件ID、主题、路径、原/现SHA-256、解释、归类、问题关联、后续计划；含四ZIP哈希、7缺失文件、764登记目标加载结果和64页面快照计数。`wasInOriginal211`区分历史211项与计划01新增项。
- 原始证据 `E:\MASKARIA\outputs\theme-plan02-20261024\`：`files/report.json`、`files/report.md`、`changes.json`、`diffs/D001.patch`至`D212.patch`、`semantic/`、`runtime.json`。原始报告SHA-256已存上述JSON，可追溯但不整批提交浏览器档案/输出目录。
- 文件核查使用已有 `scripts/audit-theme-demos.mjs`，本轮exit1来自7项缺失，非脚本崩溃。只是为02取得基点对照，未重复修复01。
- 新增 `scripts/audit-theme-behavior.mjs`，`node --check`通过；本轮实际执行exit0，764/764个loader均成功，默认导出均为function，pageerror 0，本地HTTP 4xx/5xx为0，阻断外网/API请求2次。
- R01使用独立探针和新隔离档案，只查原5个空正文及红色battle，不重跑loader：蓝/粉dashboard、蓝/粉boot、黄dashboard、红battle默认UMBRA门户、红battle `legacy=1`回退共7场景×3轮全部通过；pageerror 0、本地HTTP失败0。证据 `E:\MASKARIA\outputs\theme-plan02-r01-20261024-v3\r01.json`。
- R02已为JSON中的87项“待确认”逐项补充分支说明、证据边界和后续计划归属；`待确认`仍表示动态业务验收未完成，不再表示差异原因未知。由 `scripts/review-theme-plan02-r02.mjs` 可复现。
- R03用隔离store合成载荷补证正式宿主：蓝升级/愿望提议有消费者，蓝愿望进度/回归面板无自动消费者；黄愿望进度有消费者，黄一张归档宣告卡被两个宿主渲染为2份；红dashboard注入升级、愿望进度、BIG DEAL后均无全局消费者。证据 `E:\MASKARIA\outputs\theme-plan02-r03-20261024-v2\r03.json`。
- 102项暂归“正常接入”、19项“需修复”、4项“仅说明”、87项“待确认”。这里是**文件数**，不能当功能通过数/独立缺陷数。正常接入仅指已查明改动意图及静态连接；没有证明业务闭环。
- 没有重跑Vitest、类型检查、完整构建、Android或真机验证。计划01和历史406/413项数字均不计本轮成果；没有真实登录、真实账本/组织写入、收费模型调用或主观视觉验收。

| 主题 | 对照文件 | 字节一致 | 仅别名/换行 | 内容差异 | 缺失 | 仅核存在 | 页面加载 | 弹层加载 |
|---|---:|---:|---:|---:|---:|---:|---:|---:|
| 蓝 | 427 | 181 | 178 | 64 | 3 | 1 | 15/15 | 149/149 |
| 粉 | 389 | 147 | 179 | 60 | 2 | 1 | 15/15 | 146/146 |
| 黄 | 400 | 136 | 200 | 61 | 2 | 1 | 17/17 | 143/143 |
| 红 | 693 | 665 | 0 | 27 | 0 | 1 | 17/17 | 262/262 |

1,342个inventory ID保留，清单路由变化0、未登记目标0。696个资源文件，695字节相同，蓝favicon缺失；4个受保护命名路径仅核存在、不读正文。原报告红色是666一致/26差异，本轮是665/27：多的D198为计划01修改的 `screens/pages/Hideout.p5r.tsx`；D197据点逻辑文件原本就在211项内。不是本轮丢文件，也不是本轮修改页面。D173黄色 `HeavyTransitions.tsx`仅注释和重导出别名变化，审计只归一引号内别名，注释未归一而落入“内容差异”；已人工归“仅说明”，保留原统计不悄悄改成211。

## 正式主路径与原demo预览

| 主题 | 正式入口/宿主 | 主路径（登记键） | 原demo预览与区别 |
|---|---|---|---|
| 蓝/粉 | `src/App.tsx`登录用户且kitTheme匹配后提前return `KitHost` → 对应 `ThemeApp` → 原 `DemoApp`；并挂PrefsBridge、RouteBridge、PresenceSync、ThemeSfxBridge、GlobalOverlayHost、CallingCardOverlayHost | dashboard、actions、cooperation、astrology、statistics、hideout、ledger、menu、account、reset-password、achievements、calling-cards、settings；另boot、states为登记预览/状态入口 | `#/__index`原清单、`#/__kit`组件、`#/overlay/:id`弹层Harness、ReelBar连播仍在；正式adapters/store已改变，不能视为原包纯mock运行 |
| 黄 | 同上，另init时安装官方字体插槽；GlobalOverlayHost与蓝粉内容不同 | dashboard、actions、callingcard、cooperation、astrology、statistics、hideout、ledger、menu、account、achievements、reset-password、settings；另boot、navigation、stage、states | 同一HashRouter/清单/Harness结构；P4CinemaChain在Cooperation页面局部挂载，不是全局旧P4宿主 |
| 红 | `src/App.tsx`uiChannel=p5提前return `RedChannelRoot` → `syncLiveDataNow/useLiveFlags` → `RedChannelCore` → 原App；live订阅使树重渲染 | dashboard、menu、settings、account、reset-password、cooperation、hideout、astrology、ledger、actions、callingcard、statistics、achievements；另boot、states、activities-preview；battle被正式BattleArena替换 | Core无live时可纯demo，但正式Root传LIVE，不能把正式页面当纯原包。`#/p/battle`原占位已被正式组件替换；CutInGallery/fx入口仅证明预览组件存在 |

共用Hash入口：`#/`首页，`#/p/:pageId?tab=...`页面，`#/overlay/:id?...`弹层，`#/__index`索引，`#/__kit`组件。原 `shell`将todos/activities规范到actions及tab，terminal规范到dashboard；单独页面文件和正式导航入口不一定一一对应。三主题RouteBridge负责hash与store.currentPage双向同步，overlay/index不当业务页同步。KitHost切主题会reload以隔离CSS，`kit:off`为回退边界。

`__mode/__motion/__dev`外壳覆盖从 `location.search`读取，正确示例为 `http://127.0.0.1:5196/?__dev=1&__motion=low#/__index`。原说明举例混入hash，不能保证有效。三主题PrefsBridge仅 `location.search.__dev=1`显示开发胶囊；黄色菜单DEV区域是否存在额外正式入口留R03。**本轮探针把`__motion/__snd`放在hash内，不能宣称实际关闭了全部动效或声音。** 浏览器设置reducedMotion=reduce，仍不等于原demo自己的low模式。

### 加载与页面挂载的边界

探针在E盘新建隔离Chrome profile，block serviceworker、外网和`/api`，写入合成本地用户及主题并禁用openaiEnabled；不读取真实登录档案。它直接调用registry的`entry.load()`，未渲染700个弹层、未逐参数打开1,342个清单状态。

R01前，页面每项仅等600ms，reload后等1500ms，未断言主题标记/目标页面标题已稳定：

- 蓝dashboard、boot；粉dashboard、boot；黄dashboard共5个快照正文空、rootChildren=0。
- 红battle快照正文只有“主页”、rootChildren=0；该路径为正式替换，不能归为原红demo缺页。
- 其余58个快照有正文，但不构成58页业务通过或四主题外观通过。异步启动/Suspense/路由时序仍可能影响结果，尚未复验，不能直接判定业务白屏。
- R01已解释上述异常，原结果仍保留：蓝/粉boot在启动期有意等待，目标正文在稳定阶段出现；红battle默认由`UmbraDemoFrame`通过portal挂到body，`#root=0`不是白屏，`legacy=1`则挂正式BattleArena。7场景各3轮最终连续两次采样通过，R01的exit0仍不等于视觉验收。

## 演出触发地图（静态核实与待核分开）

| 演出/预览入口 | 蓝/粉正式条件与宿主 | 黄正式条件与宿主 | 红正式条件与宿主/边界 |
|---|---|---|---|
| 开屏，`boot-splash-*` | App/Boot与主题壳保留，原demo开屏也可Harness直达；本轮未实测时间/重入 | 同左，黄色字体初始化仍在 | Core保留原App，正式传dark/lowMotion并隐藏dev；真实开屏/音效时序未验 |
| 任务完成 `global-todo-complete`，后续升级 `global-levelup` | Dashboard完成真实任务后显示完成条；modalBlocker让全局升级等条结束；GlobalOverlayHost消费levelUpNotification | 同类规则，P4组件 | Dashboard `check()`调用completeTodo，完成后650ms取store通知并playQueue；catch空。仅当前局部链，跨页来源待核 |
| 成就/技能 `global-achievement-unlock/global-skill-unlock` | 全局条件依次为ach&&!blocker&&!level，skill&&!blocker&&!level&&!ach；页面自身解锁cut-in和全局队列关系待核 | 同序但组件与页面局部链不同 | 首页局部链可取并清ach/skill通知；未发现与三主题等价的全局宿主，成就页实际消费另核 |
| BIG DEAL `global-bigdeal-clear` | bigDealClear&&!blocker，由全局宿主关后清状态；步骤cut-in是页面局部入口 | 同类全局宿主 | registry/预览存在；真实全局消费未确认 |
| 愿望 `global-wish-progress/global-wish-proposal` | proposal由真实wishProposal&&!blocker显示，确认void setWishProgress后即关；progress宿主与黄色不同，待R03 | WishProgressView接wishProgressCut；proposal同蓝粉。不能假定wishProgress也被同一个blocker保护 | 组件/原fx可预览；真实触发链待R03 |
| 宣告卡 `global-calling-card-cutin` | 独立CallingCardOverlayHost | GlobalOverlayHost查archived&&!cutInShown并关后markShown；ThemeApp另挂CallingCardOverlayHost，需核是否重复 | 预览可加载；真实归档事件消费未确认 |
| 羁绊 `bond-rankup-*`/星移 | Cooperation互动保存后若fresh.intimacy>old，1200ms后本主题RankUpChain，starShiftGained固定1、charges又+1；同时全局挂旧ConfidantRankUpCutIn/Invite消费队列，有双宿主/次数口径风险 | Cooperation保存后700ms检查等级提升，启动P4CinemaChain(stage)，starShiftGained固定true；手动星移从page3；**本地演出已接，不能说黄色完全不播**；无旧全局rankup消费 | 同伴真实写回与原P5演出链对应尚待R03；能打开fx-rankup/starshift不证明真实互动可播 |
| 组织庆祝 | orgCelebrations[0]&&!blocker，经OrgCelebrationView关闭shift | OrgCelebration直接接head，外层没有与蓝粉相同的blocker条件 | 原fx-org-level存在，真实队列消费待确认 |
| 回归 `global-return-panel` | overlay读pendingReturnPayload/commitReturn，但ThemeApp与GlobalOverlayHost未见自动宿主；App旧挂载在提前return之后 | 同左 | 原ReturnPanel是预览，旧App宿主同样绕过；未找到主题自动消费者 |
| 清孤儿图、同步 | orphanImagesPrompt&&!blocker；prune立即dismiss，失败无对应主题反馈。还挂旧SyncStatusBadge/MergeSheet/GlobalSyncDialogs | 同样孤儿图问题，但没有蓝粉旧同步四组件 | AccountBlocks/SyncPrivacyPanel有部分真实服务；不能凭预览conflict/pull按钮称完整同步 |
| 日期/日夜/导航/返回/PWA/裁图/通用弹层 | 日期推进、蓝影时间、导航转场、返回Toast等原demo入口保留，shell/Fx层触发；未逐个核真实手势、日夜、安装与返回条件 | P4楔形/方块/水波等保留，真实条件逐项待R03 | 红wedge/historyTear/轮盘/返回等保留，存在既有轮盘缩放/样式差异；未做像素/声音验收 |

任务正确口径是“完成条出现；真的属性升级才追加升级演出；成就/技能由各自解锁动作触发”，不能把preview `homeQueue`按任务ID拼的演示四连当真实规则。上表记录消费者条件，尚未穷尽所有生产事件、互斥、重入与关闭后消费；尤其不能拿 `inventory.status='done'`作通过证据。原 `?rankup=`是DEV preview注入，非真实同伴升级。

### R03 正式演出生产·消费·关闭矩阵

逐项机器记录见JSON的`r03Review.eventChains`。这里的“已连接”指生产载荷和正式消费者有静态调用，且R03动态补证未出现相反结果；不表示业务触发、动画节奏、音效或视觉已验收。

| 事件 | 正式生产 | 正式消费 | 关闭/清除条件 | R03结论 |
|---|---|---|---|---|
| 开屏 | 启动渲染 + 主题开屏偏好 | 蓝粉黄ThemeApp内原App/shell；红RedChannelCore内原App | SplashScreen `onComplete`后`showSplash=false` | 静态连接；时长/重入/音效未验 |
| 导航转场 | shellBus/hash；三主题RouteBridge双向同步`currentPage` | 各主题AppShell/PageHost与transitionDirector | 过渡完成时清当前transition；overlay/index不写currentPage | 静态连接；真实手势与转场未验 |
| 日夜/低动效 | 真实`settings.darkMode`、`useBoldness`、低帧/系统减弱动效 | 三主题PrefsBridge；红RedChannelRoot | 持续订阅，无一次性关闭 | 静态 + R01属性证据 |
| 完成/升级/成就/技能 | `completeTodo`、`unlockAchievement`、`unlockSkill`写通知 | 蓝粉黄GlobalOverlayHost按升级>成就>技能消费；红只有Dashboard局部消费 | 宿主关闭时清对应通知；红首页650ms后取并清三类通知 | 蓝动态连接；红跨页缺口B07/B09 |
| BIG DEAL收官 | 完成后写`bigDealClear` | 蓝粉黄GlobalOverlayHost；红无等价宿主 | `clearBigDealClear` | 红动态无消费者，B07 |
| 愿望进度 | `bumpWishProgress/evaluateWishProgress`写`wishProgressCut` | 黄GlobalOverlayHost；蓝粉红无自动宿主 | 黄`clearWishProgressCut` | 蓝/红动态无消费者；黄有消费者 |
| 愿望提议 | store `wishProposal`（dry-run） | 蓝粉黄GlobalOverlayHost | 取消清提议；确认先`setWishProgress`再关闭 | 蓝动态连接；未await写回风险B09 |
| 宣告卡归档 | `archived && cutInShown=false && !terminal` | 蓝粉CallingCardOverlayHost；黄GlobalOverlayHost + CallingCardOverlayHost | 关闭后`markShown`；黄两宿主各自等待 | 蓝显示reason演示卡B17；黄动态双份B18 |
| 羁绊升级/星移 | 真实互动结果与亲密变化 | 蓝粉页面本地链+旧全局队列；黄P4CinemaChain；红oc真实数据 | 各演出链结束回调 | 静态风险B05；未真实互动 |
| 组织庆祝 | `pushOrgCelebration`按op/level/raid去重入队 | 蓝粉`!modalBlocker`消费；黄直接消费队首；红无 | 每次关闭`shiftOrgCelebration` | 黄blocker不等价；红消费缺口 |
| 回归面板 | `markAppOpened`写`pendingReturnPayload` | 旧App ReturnPanel在主题提前return后绕过；主题无自动宿主 | `commitReturn`后`clearPendingReturnPayload` | 蓝动态无宿主；B04确认 |
| PWA更新 | App内service worker/registerSW更新提示 | 旧App PWAUpdateToast；主题提前return后绕过 | 更新或“稍后”关闭 | 消费者缺口；本轮未注册service worker |
| 孤儿图清理 | store `orphanImagesPrompt` | 三主题GlobalOverlayHost | `pruneOrphan`后立即dismiss | 失败不等待，B02 |
| 红全局/局部通知 | 各业务写level/achievement/skill/bigdeal/wish等状态 | 红Dashboard仅局部消费三类；无红色全局宿主 | 首页清三类；其它状态不清 | R03注入三类均无全局UI；B07 |

## 7个缺文件逐项解释

精确字节数与SHA见JSON的`missing`；蓝/粉TXT在旧报告中的 `鎵撳紑璇存槑.txt` 是文件名解码乱码，ZIP直接读取显示“打开说明.txt”，不是另一个业务模块。两项cacheOK=false，本轮直接读取ZIP对应TXT而未信任缓存。

| 项 | 路径/范围 | 归类与解释 | 未验证/后续 |
|---|---|---|---|
| M01 蓝 | `public/favicon.png`，28,584 B | 资源确实缺失，属于品牌图标；正式根index.html引用的是`/icon.png`，不能据此宣称正式启动404或主题页面丢失 | 计划11核原包图标是否需保留/正式引用设计；本轮不恢复素材 |
| M02 蓝 | `public/打开说明.txt`，1,977 B | 仅说明：离线打开、DEV/索引/Kit/Harness/参数及蓝母题演出直达说明；不是JS依赖 | 本报告保留预览指引；未机械复制文档 |
| M03 蓝 | `src/themes/p3r-blue/main.tsx`，403 B | 被入口接管：原tokens→motifs.css→index.css顺序、initPrefs/initLayout及App改由ThemeApp初始化/渲染；React根由正式入口拥有 | 静态对应成立，不等于启动/StrictMode生命周期/视觉全等 |
| M04 粉 | `public/打开说明.txt`，1,299 B | 仅说明，同类DEV/索引/参数/Harness打开方法，非运行模块 | ZIP正文已核，不使用损坏缓存 |
| M05 粉 | `src/themes/p3r-pink/main.tsx`，370 B | 被入口接管：tokens→index.css、initPrefs/initLayout及App在ThemeApp，正式入口拥有React根 | 不重复createRoot，不补原独立入口 |
| M06 黄 | `public/assets/p4g/ASSETS.md`，12,311 B | 仅说明：位图用途、尺寸、字体/官方插槽和回退方法；缺它不等于清单中的25张位图丢失。已读哈希匹配缓存正文，696资源另有哈希统计 | 来源说明中的历史生成/版权文字只是原材料内容，本轮未独立审定；计划11按实际引用核效果 |
| M07 黄 | `src/themes/p4g-yellow/main.tsx`，446 B | 被入口接管：index.css→tokens、initPrefs/initLayout/installOfficialFonts和App在ThemeApp | 原始初始化顺序已比，动态同等性仍待R01 |

## 具体缺陷与风险列表

以下均未修复。除B17/B18有R03隔离合成载荷证据外，其余主要是源码分支/调用关系；没有声称真实网络或真实业务故障已经动态复现。

| ID/优先级 | 具体触发、影响、证据锚点 | 证据等级与去向 |
|---|---|---|
| B01/P1 | 四主题账号页点拉取、退出、删账号：三主题Account `AccountConfirmView.onConfirm`除reset外仅toast，pull改lastSync、logout/delete切signed-out；红AccountBlocks `done`/deleteCloud演示failNow。真实身份未退出/账号未删除却报成功。红SyncPrivacyPanel.deleteAllCloudData是另一真实清云操作，不混报 | 静态确证，D040/100/159/210；计划06隔离请求验证，不真实删云 |
| B02/P1 | 三主题OrphanImagesPrompt的800ms结果不await onConfirm；GlobalOverlayHost `void pruneOrphan(); dismissOrphan()`。失败仍可能提示删完或直接消失 | 静态确证，D028/091/150；06/09故障注入 |
| B03/P1 | 三主题LedgerStats `budget = period === latestMonth ? realBudget.monthlyLimit : 0`。例如当前10月但最后流水9月，10月预算会展示到9月、10月隐藏；源码currentMonth已存在却未用于budget | 静态表达式确证，D060/120/181；05隔离月份复现 |
| B04/P1 | pendingReturnPayload由旧App挂ReturnPanel，但四主题提前return绕过，主题中仅overlay registry引用/三主题组件内部读取，未找到自动消费者；因此“离开后首次打开”不由能预览证明 | 静态挂载缺口，D031/094/153及App/四主题宿主；09确认启动事件与最小恢复 |
| B05/P1 | 蓝粉Cooperation本地链与旧全局rankup队列并存，固定gained/charges+1与store真实奖励可能重复；黄已有本地P4链但旧队列未消费。成就/宣告卡也须核局部与全局重复 | 静态风险，未证明已实际双播；D045/105/165、054/114/175及ThemeApp/bridge；07/09 |
| B06/P2已解释 | 蓝粉dashboard/boot、黄dashboard短等待后body空，红battle未见内容；R01确认前5项是启动/采样窗口，红battle是`UmbraDemoFrame` portal到body而非root白屏 | 原runtime保留，R01 v3共7场景×3轮通过；不再列为白屏缺陷 |
| B07/P1已确认 | 红首页check局部读取并清3种通知，RedChannelRoot/Core无三主题GlobalOverlayHost；R03注入level/wish/bigdeal后均无全局UI，跨页生产事件会留在store | 静态链 + R03动态，D199与Root/Core；04/07/09补全局消费与关闭 |
| B08/P2 | 三主题账号固定“128张/约46.2MB”；红菜单LV5、委托2、星象档案4等空库演示字样，d4的LR_CARDS/CAT仍常量；蓝粉统计Lv4/Lv3与points0需比真实字段，不直接认等级算法坏 | 动态正文+静态常量线索，D186/194/201、Account/Menu/Statistics；R02及05/09/10 |
| B09/P1待核 | CounselArchive void delete后即成功；活动/任务/宣告卡/愿望部分先更新UI或关闭再void写回；红Activities/Dashboard有catch空 | 部分静态假成功确证、其余乐观更新风险；逐项JSON定位；04/07/09隔离失败验证 |
| B10/P2边界 | 三主题LongReading/Summary自由生成明确等待确认；DailyDraw用离线牌意；助手草稿是真写回但自由AI不是；黄AISection真实诊断/save与蓝粉不同 | 能力未接/差异，非丢文件；D026/033/055/056/063等；10，不新增收费调用 |
| B11/P1待核 | ConflictDialog读真实diff，覆盖按钮却转提示去账号；蓝粉正式有旧全局同步组件、黄色没有；需把Harness和正式同步链分开 | 静态不等价，D011/074/133及bridge；06 |
| B12/P2 | inventory todo→done与红adapter README“都接真”不能证明完成，README混入三主题路径 | 文档偏差，D001/065/187；本轮只记录，12再局部修正 |
| B13/P2待核 | 红轮盘缩放、移除随机高亮、touch-action和文字混合模式已有差异；缩小有历史用户要求记录，D212授权/最终观感本轮未核 | D188/189/212；11同环境对比。本轮保留，不能承诺与原包逐像素完全相同 |
| B14/P1待核 | 红pkg3/openers删除/解除COOP确认的onOk仍仅toast，D195只加防空。需核真实页面点击是否走该演示opener，不能把接口存在当按钮已接 | 静态演示回调确证，正式可达性待R02；07 |
| B15/P2 | 红个人卡“点击复制UserID”只setCopied(true)，未调用clipboard。真实identity替代了固定文本，但原包已有假复制未修 | 静态确证，D202；06 |
| B16/P1 | 红SettingsBlocks.AISection保存/连接测试/逐档测试仍BusyBtn/setTimeout演示，声明成功、固定延迟/模型数；ObKit注释及BusyBtn实现可证。只把配置状态接真不能称AI设置已能保存/测试 | 静态确证，D204与ObKit.BusyBtn；09/10隔离验证，不发真实模型请求 |
| B17/P1 | 蓝粉CallingCardOverlayHost能从真实`callingCards`挑出归档事件并打开演出，但没有把`card`传给CutIn；组件只按`reason`使用固定示例卡。R03注入标题「R03蓝宣告卡」后，实际显示「学会游泳 / 手动收存」，真实事件触发成立但内容不是当前卡 | R03动态确证 + 蓝组件静态；04/09修宿主数据传递并复验关闭后的markShown |
| B18/P1 | 黄主题同时挂GlobalOverlayHost与CallingCardOverlayHost，两者都消费同一张`archived && cutInShown!==true`卡。R03注入一张「R03黄宣告卡」后同屏出现2份完整CALLING CARD演出 | R03动态确证；04/09去重为一个消费者并验证只markShown一次 |

## 计划02收尾结果

1. **R01已完成**：没有重跑764项loader。新探针只查原5个空正文和红battle，共7场景×3轮，最后一轮窗口延至12秒，全部通过；原空快照与第一次错误r01保留。默认红battle在4000ms出现`UmbraDemoFrame`与iframe，legacy回退在4000ms出现正式BattleArena。
2. **R02已完成**：87项全部补了具体分支、读/写或回调位置、证据边界和后续计划。`classificationCounts`仍保留87“待确认”，含义改为“业务动态验收待后续计划”，不再是“差异原因未知”。
3. **R03已完成**：14条正式事件链写入JSON；动态补证蓝愿望进度/回归面板无自动宿主、蓝宣告卡显示reason演示文案、黄宣告卡双宿主双份、红升级/愿望/BIG DEAL无全局消费者。
4. 计划02关闭标准已达到：每个差异有解释或明确缺陷归属，主路径空快照有结论，演出生产/消费/关闭无未说明断点；B01–B18全部保留为后续计划工作，不在本轮修复。

本轮仍没有业务、CSS、素材、音效或动画修改；没有真实登录、账本/组织写入、收费模型、真机、像素或用户验收。四主题外观和原失败证据均保留。

复跑R01/R02/R03均必须使用新的输出目录：

```powershell
node scripts/verify-theme-plan02-r01.mjs E:/MASKARIA/outputs/theme-plan02-r01-NEXT
node scripts/review-theme-plan02-r02.mjs docs/THEME-BEHAVIOR-AUDIT-20261024.json
node scripts/verify-theme-plan02-r03.mjs E:/MASKARIA/outputs/theme-plan02-r03-NEXT
node scripts/review-theme-plan02-r03.mjs docs/THEME-BEHAVIOR-AUDIT-20261024.json
```

默认服务为`http://127.0.0.1:5196`，可用`THEME_AUDIT_BASE`覆盖。R01/R03会阻断外网、API和service worker，保留隔离profile；缓存/TEMP/TMP应留E盘。
