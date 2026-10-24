# 计划09 · 占卜、成就与设置真实生效

核对日期：2026-10-24。工作树：`E:\MASKARIA\worktrees\theme-integrate`；分支：`codex/theme-integrate`；接手基点：计划08交接提交 `23836ca`（`git log -1` 已核实）。

本报告只覆盖计划09「占卜、成就与设置」。没有进入10及后续，没有重做据点、同伴、账号同步、记账、AI或四主题外观，没有重跑764项loader，没有Push、部署、APK、真实账号或真实组织数据，没有收费模型调用。

## 结论

红色频道的占卜、成就与设置原本是「界面演得真、数据不落地」：抽完的牌、解锁的成就、改过的设置都只活在页面本地副本里。本轮把它们接到与蓝粉黄同一套 store / services，视觉与状态机保持原样。

1. **今日塔罗**：红色未抽态的三张候选改为真实抽牌（`constants/tarot` 的 `drawRandomCards`），牌面文案来自同一份牌意数据；点一张即按离线兜底写真实 `dailyDivination`，之后由 store 驱动切到完成态。已完成态读真实记录，跨日自动回到未抽态。
2. **中长期占卜**：提问、周期、六选三、长远档「注入波纹抽底色牌」全部保留原演出，但候选与结果接真实 `longReadings`；解读跑在与蓝粉黄同一套 `utils/tarotJobs` 里（离开页面不中断、可续写、可用同一副牌续跑）。**未配置 AI 时不再假装能解**——与真实仓库同口径，按钮禁用并说明。
3. **占卜档案**：列表、活跃/归档分段、追问次数、删除与归档全部读写真 `longReadings`，空态是真实空态。
4. **成就与技能**：红色成就页从本地 mock 数组改为读 `useAppStore.achievements / skills`；解锁、新增自定义、编辑、删除都等待真实 action，失败不先改界面。进度计算复用三主题同一份 `useAchievementProgressMap`，不再另算一套。
5. **设置**：静音模式、夜间模式接真实 `settings.soundMuted / darkMode`（此前红色读的是 demo 外壳的独立 localStorage，改了对其它主题不生效）；记账开关、货币、消费评估、发薪日周期与发薪日接真实 settings，直接影响计划05已验证的记账周期。AI 服务分区挂载真实 `AIServiceSettings`，密钥保存与测试连接不再是静态文案按钮。
6. **红 `d4.ts` 剩余牌阵数据**：`DRAW3` / `LR_CARDS` / `PERIOD` 三个演示常量及固定档案行已从运行时路径移除，改由 `adapter/tarotData.ts` 从真实数据派生；`OD` 导出同步更新（新增 `cardOf / todayDiv / archiveRows / demoRev / PERIOD_LABELS / spreadPositions`，移除上述常量）。

## 关键代码

| 范围 | 文件 | 改动 |
|---|---|---|
| 占卜适配（新增） | `src/p5r-red/adapter/tarotData.ts` | 真实塔罗 id → demo 卡对象映射、牌阵位置、周期标签、抽牌、档案行派生 |
| 红色星象页 | `src/p5r-red/screens/pkg4/d4.ts` | `openDailyDraw` / `openLongReading` / `openReadingArchive` 接真实 store 与 tarotJobs；恢复被误删的 `openNameReveal` / `openThinking`；补 `PERIOD_LABELS` 导入 |
| 红色星象入口 | `src/p5r-red/screens/pages/Astrology.p5r.tsx` | 档案列表与 tab 计数读真实 `longReadings`；今日塔罗按真实记录决定 idle/done；未抽态三张候选真实抽牌并落库 |
| 红色成就页 | `src/p5r-red/screens/pages/Achievements.p5r.tsx` | 成就/技能两个 Tab 读真实 store，解锁/增改删接真实 action，进度用共用 `useAchievementProgressMap` |
| 红色设置 | `src/p5r-red/screens/overlays/SettingsBlocks.tsx` | 静音/夜间/记账/货币/消费评估/发薪日周期/发薪日接真实 settings；AI 分区挂载真实 `AIServiceSettings` |
| 选择器 | `src/p5r-red/screens/overlays/ObKit.tsx` | `ObSel` 支持受控 `value` + `onChange`（原 `defaultValue` 无法写回） |
| 隔离探针（新增） | `scripts/verify-theme-plan09.mjs` | 四主题真实读写验证 |

## 本轮验证

- `node node_modules/typescript/bin/tsc --noEmit`：exit 0。
- 全量 `node node_modules/vitest/vitest.mjs run --reporter=dot`：**71 文件 / 435 项通过**（与计划08同基线，本轮未新增单测，改动集中在接入层）。
- `npm run build`：exit 0（prebuild 主题 CSS、TypeScript、Vite、PWA）。构建仍保留既有大 chunk、PWA 主包不预缓存、Vite CSS `@import` 顺序、字体运行时解析与 `eval` 警告。
- `node --check scripts/verify-theme-plan09.mjs` 与 `git diff --check`：通过。
- 未重跑764项loader。

## 浏览器证据

探针：`scripts/verify-theme-plan09.mjs`。

最终证据目录：`E:\MASKARIA\outputs\theme-plan09-isolated-20261024-v14`。

报告：同目录 `report.json`。结果：`ok=true`，17 条检查，四主题 `ok=true`，`pageErrors=0`、`localFailures=0`、外网阻断 2。

红色主题完整验证：

- 今日塔罗：点牌 → 真实 `saveDailyDivination`（`source=offline`）→ 刷新后仍是同一张并显示完成态。
- 中长期：提问 → 洗牌 → 六选三 → 真实 AI 流式（隔离 mock SSE）→ 落库 `picked=3` → 档案列表可见。
- 成就：造一条已达成的自定义成就 → 点「已达成，点击解锁」→ 真实 `unlockAchievement` → 刷新后解锁态保留。
- 设置：静音、夜间、发薪日周期切换后均写进真实 settings；刷新后仍保留。

三主题（蓝/粉/黄）回归：档案计数与成就解锁态读真实 store（与红色共享同一份数据）、占卜/成就/设置六个页面均可打开且无 pageerror。

截图 10 张（红色 3 张 + 三主题各 2 张）已人工检查渲染：红色完成态显示真实牌面与牌意，蓝色与黄色档案 tab 显示红色落库的真实占卜，成就页显示真实进度。**程序化断言与截图不等于四主题整体视觉或真机验收。**

复跑：

```powershell
cd E:\MASKARIA\worktrees\theme-integrate
$env:TEMP='E:\MASKARIA\.cache'; $env:TMP='E:\MASKARIA\.cache'
$env:VITE_API_URL='same-origin'
node node_modules/vite/bin/vite.js --host 127.0.0.1 --port 5208 --strictPort
```

另开终端：

```powershell
$env:THEME_AUDIT_BASE='http://127.0.0.1:5208'
node scripts/verify-theme-plan09.mjs E:/MASKARIA/outputs/theme-plan09-NEXT
```

输出目录必须不存在。探针使用全新 Chrome 档案、隔离 IndexedDB、AI 指向本地 mock，不读取真实浏览器档案，不发任何外网请求。

## 保留边界

- AI 解读、星移推演、COOP 匹配与作战 AI 分工仍属计划10。中长期占卜未配置 AI 时按钮禁用并说明，不用占位文案冒充解读。
- 红色设置页仍有演示态分区（天气、BGM、背景图、开屏动画、背景动画、人格、通知时段、总结风格、关键词规则、逆影战场开关等），本轮只接了语义明确且影响已验收闭环的项；`?state=` 演示态预览保留。
- 红色 demo 外壳偏好（`lib/prefs.ts` 的 `motion / fx / sidebar`）仍是独立 localStorage，与真实 settings 分开。
- 未连接真实组织后端、真实账号；未做 Android 真机、弱网、并发多标签与四主题整体视觉验收；未重跑764项loader。
- 本轮未改四主题 CSS、素材、音效与整体布局。

## 计划09收尾

计划09完成标准已达到：日占卜与中长期占卜的历史和进度有真实来源；塔罗与岁时的展示接真实牌意数据；成就与技能的解锁/编辑/删除落库；设置修改后真正生效并跨主题一致；红 `d4.ts` 的演示牌阵常量已从运行时路径移除。计划10及之后未启动。
