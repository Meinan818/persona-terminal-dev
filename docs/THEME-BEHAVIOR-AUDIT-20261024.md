# 计划02 · 四主题行为对照（待续）

核对日期：2026-10-24；源码基点 `f4b35577a14d46a4713459abdf8e70e2b4b4d211`；工作树 `E:\MASKARIA\worktrees\theme-integrate`，分支 `codex/theme-integrate`。

本报告是计划02的专项证据，项目实时状态仍以 `PROJECT_STATE.md` 为唯一入口。本轮没有业务、CSS、素材、音效或动画修改，没有实施计划03及之后的修复。两次实际上下文压缩后按规则停止新增业务核查/测试，收尾提交已取得的结果。**计划02未关闭**：有逐项分类与具体缺陷，但正式首页快照、部分演出触发和87项内容差异的完整行为仍待确认，不能把初步分类写成全部审查完成。

## 证据与本轮结果

- [逐项机器清单](THEME-BEHAVIOR-AUDIT-20261024.json)：212项逐文件ID、主题、路径、原/现SHA-256、解释、归类、问题关联、后续计划；含四ZIP哈希、7缺失文件、764登记目标加载结果和64页面快照计数。`wasInOriginal211`区分历史211项与计划01新增项。
- 原始证据 `E:\MASKARIA\outputs\theme-plan02-20261024\`：`files/report.json`、`files/report.md`、`changes.json`、`diffs/D001.patch`至`D212.patch`、`semantic/`、`runtime.json`。原始报告SHA-256已存上述JSON，可追溯但不整批提交浏览器档案/输出目录。
- 文件核查使用已有 `scripts/audit-theme-demos.mjs`，本轮exit1来自7项缺失，非脚本崩溃。只是为02取得基点对照，未重复修复01。
- 新增 `scripts/audit-theme-behavior.mjs`，`node --check`通过；本轮实际执行exit0，764/764个loader均成功，默认导出均为function，pageerror 0，本地HTTP 4xx/5xx为0，阻断外网/API请求2次。
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

页面每项仅等600ms，reload后等1500ms，未断言主题标记/目标页面标题已稳定：

- 蓝dashboard、boot；粉dashboard、boot；黄dashboard共5个快照正文空、rootChildren=0。
- 红battle快照正文只有“主页”、rootChildren=0；该路径为正式替换，不能归为原红demo缺页。
- 其余58个快照有正文，但不构成58页业务通过或四主题外观通过。异步启动/Suspense/路由时序仍可能影响结果，尚未复验，不能直接判定业务白屏。
- 所以脚本exit0只说明其loader/error断言通过，不等于64页通过。脚本没有对上述空快照设失败断言，原结果保留，不删除或补造通过。

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

以下均未修复。确证的是源码分支/调用关系；没有声称真实网络/业务故障已经动态复现。

| ID/优先级 | 具体触发、影响、证据锚点 | 证据等级与去向 |
|---|---|---|
| B01/P1 | 四主题账号页点拉取、退出、删账号：三主题Account `AccountConfirmView.onConfirm`除reset外仅toast，pull改lastSync、logout/delete切signed-out；红AccountBlocks `done`/deleteCloud演示failNow。真实身份未退出/账号未删除却报成功。红SyncPrivacyPanel.deleteAllCloudData是另一真实清云操作，不混报 | 静态确证，D040/100/159/210；计划06隔离请求验证，不真实删云 |
| B02/P1 | 三主题OrphanImagesPrompt的800ms结果不await onConfirm；GlobalOverlayHost `void pruneOrphan(); dismissOrphan()`。失败仍可能提示删完或直接消失 | 静态确证，D028/091/150；06/09故障注入 |
| B03/P1 | 三主题LedgerStats `budget = period === latestMonth ? realBudget.monthlyLimit : 0`。例如当前10月但最后流水9月，10月预算会展示到9月、10月隐藏；源码currentMonth已存在却未用于budget | 静态表达式确证，D060/120/181；05隔离月份复现 |
| B04/P1 | pendingReturnPayload由旧App挂ReturnPanel，但四主题提前return绕过，主题中仅overlay registry引用/三主题组件内部读取，未找到自动消费者；因此“离开后首次打开”不由能预览证明 | 静态挂载缺口，D031/094/153及App/四主题宿主；09确认启动事件与最小恢复 |
| B05/P1 | 蓝粉Cooperation本地链与旧全局rankup队列并存，固定gained/charges+1与store真实奖励可能重复；黄已有本地P4链但旧队列未消费。成就/宣告卡也须核局部与全局重复 | 静态风险，未证明已实际双播；D045/105/165、054/114/175及ThemeApp/bridge；07/09 |
| B06/P1待核 | 蓝粉dashboard/boot、黄dashboard短等待后body空，红battle未见内容；不是模块加载失败，不直接断业务白屏 | 动态采样异常，runtime.json；R01，不先修业务 |
| B07/P1待核 | 红首页check局部读取并清3种通知，RedChannelRoot/Core无三主题GlobalOverlayHost；其它页生成通知与BIG DEAL/组织/回归等全局消费未找到等价链 | 静态链缺口，D199与Root/Core；R03后04/07/09，不泛称全部不播 |
| B08/P2 | 三主题账号固定“128张/约46.2MB”；红菜单LV5、委托2、星象档案4等空库演示字样，d4的LR_CARDS/CAT仍常量；蓝粉统计Lv4/Lv3与points0需比真实字段，不直接认等级算法坏 | 动态正文+静态常量线索，D186/194/201、Account/Menu/Statistics；R02及05/09/10 |
| B09/P1待核 | CounselArchive void delete后即成功；活动/任务/宣告卡/愿望部分先更新UI或关闭再void写回；红Activities/Dashboard有catch空 | 部分静态假成功确证、其余乐观更新风险；逐项JSON定位；04/07/09隔离失败验证 |
| B10/P2边界 | 三主题LongReading/Summary自由生成明确等待确认；DailyDraw用离线牌意；助手草稿是真写回但自由AI不是；黄AISection真实诊断/save与蓝粉不同 | 能力未接/差异，非丢文件；D026/033/055/056/063等；10，不新增收费调用 |
| B11/P1待核 | ConflictDialog读真实diff，覆盖按钮却转提示去账号；蓝粉正式有旧全局同步组件、黄色没有；需把Harness和正式同步链分开 | 静态不等价，D011/074/133及bridge；06 |
| B12/P2 | inventory todo→done与红adapter README“都接真”不能证明完成，README混入三主题路径 | 文档偏差，D001/065/187；本轮只记录，12再局部修正 |
| B13/P2待核 | 红轮盘缩放、移除随机高亮、touch-action和文字混合模式已有差异；缩小有历史用户要求记录，D212授权/最终观感本轮未核 | D188/189/212；11同环境对比。本轮保留，不能承诺与原包逐像素完全相同 |
| B14/P1待核 | 红pkg3/openers删除/解除COOP确认的onOk仍仅toast，D195只加防空。需核真实页面点击是否走该演示opener，不能把接口存在当按钮已接 | 静态演示回调确证，正式可达性待R02；07 |
| B15/P2 | 红个人卡“点击复制UserID”只setCopied(true)，未调用clipboard。真实identity替代了固定文本，但原包已有假复制未修 | 静态确证，D202；06 |
| B16/P1 | 红SettingsBlocks.AISection保存/连接测试/逐档测试仍BusyBtn/setTimeout演示，声明成功、固定延迟/模型数；ObKit注释及BusyBtn实现可证。只把配置状态接真不能称AI设置已能保存/测试 | 静态确证，D204与ObKit.BusyBtn；09/10隔离验证，不发真实模型请求 |

## 下一聊天仅续计划02

1. **R01 页面采样复核**：先核基点、既有证据和服务；只补5个空正文及红battle的主题/路由稳定断言和启动时序证据。修正探针外壳参数放错位置的局限，保留原失败；不重复跑764项已有成功结果，不先改业务消除白屏。
2. **R02 差异解释补完**：从JSON的87项“待确认”逐项缩小剩余分支，特别是红oc/d4/live、三主题设置持久化和账号/统计演示字样；已确证待后续计划修的缺陷不用提前修。不是开展03的全库权威来源审计，不能建立第二套store。
3. **R03 演出生产者与消费者补齐**：核正式路径的开屏、导航、日夜、返回、PWA、愿望、宣告卡、羁绊/组织与红通知触发/关闭/消费条件；区分preview参数、局部宿主、旧全局宿主。对有疑问的具体链做隔离触发取证，不把700弹层全量渲染当必要业务验证。
4. 02完成门槛是每项有足够解释或明确可追溯的缺陷归属，主路径加载异常均有结论、演出对照无未说明断点；达到后才在STATE/详细计划标完成并本地提交。该聊天随后仍停止，03另开聊天，不能自动跨计划。

本轮只交付已完成的核对工具、证据整理和待续清单，不把未完成检查混写成完成。原始证据中的失败/空快照、7项缺失保持。本轮首次渲染分类JSON曾因文档脚本回调内await语法错误、继而黄色ModalP4匹配漏项退出；均在生成前失败，无业务影响，修正文档渲染后生成212行，未为此重跑浏览器。

后续如需复跑，必须新输出目录：先 `node scripts/audit-theme-demos.mjs --out E:/MASKARIA/outputs/theme-plan02-NEXT/files`，缺失仍会exit1；已有证据够用时直接复用，不机械重审。行为脚本 `node scripts/audit-theme-behavior.mjs E:/MASKARIA/outputs/theme-plan02-NEXT` 读取其files/report.json；不可覆盖原runtime.json。它会重跑全部loader，R01优先做针对性探针。默认服务5196，环境变量 `THEME_AUDIT_BASE`可调整；缓存/TEMP/TMP留E盘。既有Vite不是本轮启动，是否存活现场核，不代用户打开浏览器。
