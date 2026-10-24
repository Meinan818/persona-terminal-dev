# 计划10 · AI 能力专项

核对日期：2026-10-24。工作树：`E:\MASKARIA\worktrees\theme-integrate`；分支：`codex/theme-integrate`；接手基点：计划09交接提交 `d28f5cc`（`git log -1` 已核实）。

本报告只覆盖计划10「AI 能力专项」：给每个 AI 入口标注「真实 AI / 等待配置 / 离线」，核取消、超时、失败时不伪造结果，梳理 BYOK、模型/连接、对话/谏言/解读/总结与费用触发边界。没有进入11及后续，没有重做据点、同伴、账号同步、记账、占卜、成就、设置或四主题外观，没有重跑764项loader，没有Push、部署、APK、真实账号、真实组织数据或收费模型调用。默认只用隔离 mock 响应验证。

## 结论

App 内 AI 全部走同一把 BYOK 钥匙（`settings.summaryApiKey` 与 `aiProfiles`），统一经 `src/utils/aiClient.ts` 出门。**没有第二套 AI 连接、没有服务端代答、没有把离线兜底冒充真实模型回复的设计**。未配 Key 时五档全部解析为 `null`，入口只能禁用或明确走离线兜底；配了 Key 的功能都真的发请求，失败时有真实错误、取消时立即停。

## 传输层（所有 AI 的唯一出口）

`aiClient.ts` 集中管鉴权头、SSE 解析、超时与取消：

- 超时分两类：`chatComplete` 是「发起→拿到完整响应」的总超时（默认 90s，思维链模型放宽到 300s，瞬发调用收紧到 20/60s）；`chatStream` 是**空闲超时**（每收到一段就重置，默认 90s，思维链 150s）——既抓得住挂死连接，也不误杀正常的长思考。
- 调用方的 `AbortSignal`（「停止」按钮 / 组件卸载）与内部超时合流；调用方提前退出流式循环时，`finally` 里主动掐断底层请求，服务商那边不再继续生成、继续计费。
- 失败归一：预算被推理吃光自动加预算重来、超服务商上限自动降档、不认 `reasoning_effort` 自动去掉重发、中转站 400 自动带「保险」参数重发、代理 502 自动回退直连、5xx 隔一下重试一次。空响应与 `finish_reason=length` 都有明确文案，不用「空响应」一句话糊。

## AI 入口清单（逐个标注）

| 入口 | 代码路径 | 判定 | 说明 |
|---|---|---|---|
| 助手对话 / 每日问候 / 人格生成 | `navigatorIntent.ts`、`store/navigator.ts` | 真实 AI | 分诊走快速档、表演走助手档；无 Key 时 `runNavigatorTurn` 直接抛「未配置 AI」，不假装回复 |
| 谏言（残响） | `counselAI.ts` + 四主题 `CounselChatModal` | 真实 AI + 离线兜底 | 无 Key 走关键词模板并在横幅明说「现在是简版离线回复」；连接失败回落离线，同时显示「无法连接到 AI 服务」；已说出口一半就到此为止，不换一副嗓子接着说 |
| 今日塔罗 / 中长期占卜 / 追问 | `tarotAI.ts`、`tarotJobs.ts` | 真实 AI + 离线兜底 | 中长期**未配 AI 时按钮禁用并说明**（计划09已修成与真实仓库同口径）；今日塔罗可离线兜底，落库标 `source=offline` |
| 命运瞥视（七日连星） | `fateGlimpseAI.ts` | 真实 AI + 离线兜底 | 无 Key 直接走 `resolveFateOffline` 落库，标 `source=offline` |
| 成长总结 / 自动总结 / 追问 | `summaryAI.ts`、`summaryJobs.ts`、`autoSummary.ts` | 真实 AI | 任务在模块级跑，关弹层不中断；截断留草稿可「接着写」最多三次；未配 Key 时 `buildSummaryRequest` 抛错，不出占位信 |
| 记账自然语言 / 批量 / 拍照 | `ledgerAI.ts` | 真实 AI + 离线兜底 | 无 Key 或失败退离线正则解析；离线也抽不出金额就转手动，不编一笔账 |
| 活动五维分析 | `activityAI.ts` | 真实 AI | 无 Key 抛「请先配置 API 密钥」，UI 显示真实错误，不猜点数 |
| 愿望评估 / 续拆 / BIG DEAL 续拆 | `store/index.ts`（`evaluateWishProgress`、`decomposeWishAI`） | 真实 AI + 离线兜底 | 愿望评估失败回落本地估算并标 `source=local`；续拆无 Key 抛错，UI 走 `minimalStep` 本地兜底 |
| 同伴匹配 / 互动评估 / 星移 / 解读 | `confidantAI.ts` | 真实 AI + 离线兜底 | 全部 `source: ai 或 offline` 明确区分；在线同伴且未登录云端时**不允许走 AI**（`allowAI=false`），避免无云态白嫖 |
| COOP 星象匹配 | `CoopAiMatchModal` + `confidantAI.matchConfidant` | 真实 AI + 离线兜底 | 未配 Key 界面标注「将使用离线模式进行匹配」 |
| 据点作战 AI 拆解分工 | `orgOpsAI.ts` | 真实 AI | 无 Key 抛「去设置填好 API Key」，按钮置灰；拆不出来抛错让队长自己写，不填假分工 |
| Persona 召唤 / 洗牌 / 誓约技 / 召唤台词 / 胜利叙事 / 影之评语 / 败因信 | `battleAI.ts` + `PersonaCreateModal`、`PersonaShuffleModal` | 真实 AI + 模板兜底 | 召唤走深思熟虑档，失败不保存默认面、可只补缺的属性；无 Key 全部回落本地模板 |
| 区层显形 / 伪神 / 月影显形 | `revealJobs.ts` + `battleAI.ts` | 真实 AI | 截断抛 `JSONTruncatedError` 带半截可续写；无 Key 时 `prepare*` 直接抛，任务不建 |
| 视觉档（聊天发图 / 拍照记账 / 课表 / 战绩截图） | `visionIntake.ts`、`ledgerAI.parseLedgerShot` | 真实 AI（独立分档） | 未配视觉档抛 `VISION_UNCONFIGURED`；拍照记账三级降级：视觉模型、本机 OCR、手输，图片只走用户自己配的服务商或不出设备 |
| 听觉档（语音转写） | `speech.ts` | 真实 AI（独立分档） | 未配听觉档时话筒不出现；60 秒超时，取消即停 |
| 等级称号 / 成就技能命名 | `attributeLevelTitles.ts`、`presetNameMatcher.ts` | 真实 AI | 无 Key 抛错并指向设置页；格式不可用抛错，不落半成品 |
| 今日委托属性对应 / 第四张卡 | `lifeQuestAI.ts` | 真实 AI（后台静默） | 不需要、已在要、退避期内直接返回；失败记时间，10/15 分钟后再试，不打扰用户 |
| UMBRA 影子交涉 / 战场谏言 / 夜层规划 | `umbraDemoAiBridge.ts` + `public/umbra-demo/*-ai.js` | 真实 AI + 离线兜底 | iframe 不接触 Key，父子桥传请求/取消/结果；7 秒超时；`slice-ai=off` 全程离线，`preview` 明确标注「未连接真实模型」 |
| 红 · 同伴互动 / 星移 / 星象匹配（`oc.ts`） | `p5r-red/screens/pkg3/oc.ts` | **演示态（不调用 AI）** | 固定文案 + 计时器，落库存的是写死内容；本轮只标注，未擅改 |
| 红 · 成长总结弹层（`a4.ts openSummary`） | `p5r-red/screens/pkg4/a4.ts` | **演示态（不调用 AI）** | 从红色「行动」页真实入口可达，生成/流式/归档都是本地 `LETTER` 常量；本轮只标注，未擅改 |
| 红 · 记录页列表 | `p5r-red/screens/pages/Activities.p5r.tsx` | 演示列表 + 真实写入 | 列表读 mock 数据，但新增/删除走真实 store |

## 取消 / 超时 / 失败的行为边界

- 取消：所有流式入口都接调用方 `AbortSignal`；`chatStream` 在 generator `finally` 里掐断底层请求（不掐服务商会继续计费）；`counselAI`、`navigatorIntent` 被打断时把已输出的部分标「已打断」留下，不补一段离线模板。
- 超时：按任务性质分档（见上），`AbortError` 与普通错误分开处理——用户取消不报错，超时才报真实原因。
- 失败：**不伪造结果**。塔罗/命运/总结失败只把已写的部分标 `truncated` 并给「接着写」；记账、活动、拆分工失败抛真实错误让用户改；愿望评估、同伴解读、Persona 台词失败回落本地兜底并标 `source`；没有任何一处把失败写成成功。

## BYOK / 模型分档 / 费用触发

- BYOK：Key 只存本机 `settings.summaryApiKey` 与 `aiProfiles[provider].key`；诊断日志只记服务商/主机/模型/状态/耗时，**不记内容与 Key**，像 Key 的长串自动打码。
- 五档模型：快速响应（记账解析、塔罗单抽、打分等瞬发任务）、深思熟虑（助手对话、中长期占卜、人格生成、Persona 召唤）、助手（对话回合、每日问候）、视觉、听觉。跨档可指向别家（`aiProfiles` 里有那家 Key 时）；那家 Key 缺失则整套覆盖作废，回落当前连接——不会拿着别家的模型名套错连接。
- 连接：自定义服务商必须地址+模型都填才算配好；`testAIConnection` 逐档 ping；CORS 不放行的主机自动登记走 App 原生通道（不支持流式，界面明说「回复会整段出现」）；`/models` 列表永不走代理。
- 费用触发：**每一次模型调用都可能计费**，触发点全部在用户动作或明确开关之后——点「生成总结」「解读」「AI 分析」「AI 拆解」「重新匹配」「召唤 Persona」，或设置里开着的「自动撰写上一期总结」「今日委托第四张卡」「愿望自动评估」。中转站保险、加预算重试、5xx 重试会在同一次用户动作内多发出一两次请求；本轮未做任何真实收费调用。

## 本轮验证

- `node node_modules/typescript/bin/tsc --noEmit`：exit 0。
- 全量 `node node_modules/vitest/vitest.mjs run --reporter=dot`：**71 文件 / 435 项通过**（与计划09同基线；本轮未新增单测，改动集中在探针与文档）。
- `npm run build`：exit 0（主题CSS、TypeScript、Vite、PWA）。构建仍保留既有大 chunk、PWA 主包不预缓存、Vite CSS `@import` 顺序、字体运行时解析与 `eval` 警告。
- `node --check scripts/verify-theme-plan10.mjs` 与 `git diff --check`：通过。

## 隔离浏览器证据

探针：`scripts/verify-theme-plan10.mjs`（新增）。

最终证据目录：`E:\MASKARIA\outputs\theme-plan10-ai-20261024-v21`。

报告：同目录 `report.json`。结果：`ok=true`，10 条检查、11 条入口标注、`pageErrors=0`、`localFailures=0`、外网阻断 3、**真实 AI 请求 3 次**（全部指向隔离 mock，无任何外网/收费调用）。

隔离 mock 验证到的关键行为：

- 未配置：五档 AI 全部解析为 `null`（等待配置，不假装可用）。
- 真实 AI：红色中长期占卜跑通「提问 → 洗牌 → 六选三 → 真实 SSE 流式 → 落库 `picked=3`」；档案在蓝/粉/黄三主题读同一份真实 `longReadings`。
- 失败不伪造：把 mock 地址改成不可达后重新发起，界面显示「连不上 AI 服务：网络断了或不稳定……」，`longReadings` **没有新增**（`failureRows` 只有前一次真实 AI 那一条）。
- 谏言：配了 Key 后 `streamCounselReply` 真的向 mock 发出请求（`counselAiFired=true`）。
- COOP 星象匹配：未配置时界面标注「将使用离线模式进行匹配」。

复跑：

```powershell
cd E:\MASKARIA\worktrees\theme-integrate
$env:TEMP='E:\MASKARIA\.cache'; $env:TMP='E:\MASKARIA\.cache'
$env:VITE_API_URL='same-origin'
node node_modules/vite/bin/vite.js --host 127.0.0.1 --port 5211 --strictPort
```

另开终端：

```powershell
$env:THEME_AUDIT_BASE='http://127.0.0.1:5211'
node scripts/verify-theme-plan10.mjs E:/MASKARIA/outputs/theme-plan10-NEXT
```

输出目录必须不存在。探针使用全新 Chrome 档案、隔离 IndexedDB，AI 指向本地 mock，不读取真实浏览器档案，不发任何外网请求。

## 保留边界与待查

- **红色演示态未动**：`oc.ts` 的同伴互动 / 星移 / 星象匹配、`a4.ts` 的成长总结弹层，仍是固定文案 + 计时器 + 写死内容。它们与蓝粉黄的真实 AI 口径不一致，属计划10 已识别、**未修复**的差异——修不修、何时修需要用户决定（涉及是否给红色补真实 AI 链路）。
- **谏言横幅时序待查**：三主题谏言 overlay 挂载时读一次 `settings`；探针里配置写在后、overlay 挂载在前的场景下，横幅会滞后显示「尚未配置 AI 密钥」，而同一时刻 `counselHasKey(settings)` 已为 `true`、真实链路也确实发了请求（`counselAiFired=true`）。这是渲染时序，不影响功能正确性，但用户可能在「配好 Key 后第一次进谏言」时看到过期提示。建议后续在 overlay 打开 effect 里重算一次。
- 未做 Android 真机、弱网、并发多标签、四主题整体视觉验收；未重跑764项loader；未做任何真实账号、真实组织数据或收费模型调用。
- 本轮未改四主题 CSS、素材、音效与整体布局。

## 计划10收尾

计划10的完成标准（每个入口明确「真实 AI / 等待配置 / 离线」；取消/失败不伪造结果；默认只用隔离响应验证）已达到：入口清单见上表，取消/超时/失败边界有代码与隔离探针双重证据，BYOK 与费用触发点已梳理成文。计划11及之后未启动。
