# 计划04 · 任务与成长闭环（已完成）

核对日期：2026-10-24。工作树：`E:\MASKARIA\worktrees\theme-integrate`；分支：`codex/theme-integrate`；接手基点：`3928e2a`。

本报告只覆盖计划04“任务与成长闭环”。没有进入计划05，没有重建业务层，没有重跑764项loader，没有改四主题视觉、素材、CSS或音效，没有Push、部署、APK、真实登录或收费AI调用。

## 结论

1. 任务完成结果现在有明确契约：`null`表示拒绝，`completed=false`表示计次任务中间进度已落库，`completed=true`表示目标达成并发放奖励。
2. 蓝、粉、黄三套任务页的创建、编辑、归档、删除、恢复和撤销改为等待真实store/Dexie结果；失败不再先改列表或假报成功。
3. 计次任务只有到达目标才发属性和成就/技能奖励；每日任务完成条只在目标达成时播放；长期任务按跨天累计进度结算一次并归档。
4. 撤销今日完成会删除当天整条完成计数。此前只减1，导致`3/3`撤销后停在`2/3`且奖励历史已删除的不一致已修复。
5. BIG DEAL 子步完成、撤销、添加、删除、收官和重建均走现有store actions；计划01/03已有的Dexie事务和奖励规则没有复制。
6. 红色新增跨页成长消费者`RedGrowthHost`：完成条关闭后，按升级→成就→技能顺序播放；BIG DEAL和愿望进度也复用原P5演出。
7. 蓝粉黄任务页直接完成时也使用原主题完成条；没有新增第二套通知系统。
8. 空愿望库时关闭状态的愿望面板/实现弹窗曾读取未定义对象，导致整个任务页崩溃；已用空态占位修复。

## 关键代码

| 范围 | 文件 | 改动 |
|---|---|---|
| store契约 | `src/store/index.ts` | `addTodo`返回真实`Todo`；`completeTodo`返回`completed + unlockHints`；长期任务累计、达标归档；撤销删除当天整条计数 |
| 导航器 | `src/utils/navigatorRegistry.ts` | 中间计次不再回复“点数已到账” |
| 蓝/粉/黄 | `themes/*/screens/pages/Todos.*` | 任务页完成、创建、编辑、归档、删除、恢复、撤销；愿望新增/收起/删除/恢复全部接真实action |
| 蓝/粉/黄 | `themes/*/screens/overlays/TodoFormSheet.*` | 保存等待写入结果，失败保留表单 |
| 蓝/粉/黄 | `themes/*/screens/overlays/BigDealPanel.*` | 子步、收官、重建接真实store；AI续拆仍属计划10 |
| 蓝/粉/黄 | `themes/*/screens/overlays/WishPanel.*` | 手动进度和子任务走wish actions；自动重估设置写回settings |
| 蓝/粉/黄 | `themes/*/screens/overlays/WishFulfillDialog.*` | 空愿望安全；黄实现愿望接真实store |
| 蓝/粉/黄 | `themes/*/bridge/GlobalOverlayHost.tsx` | 愿望提议确认等待写回成功后才关闭 |
| 红 | `src/p5r-red/screens/taskGrowth.ts` | 红色完成任务统一入口，拒绝/失败回滚语义 |
| 红 | `src/p5r-red/RedGrowthHost.tsx` | 跨页消费升级、成就、技能、BIG DEAL和愿望进度 |
| 红 | `src/p5r-red/screens/pkg4/todos4.ts` | 任务完成/编辑/归档/删除/恢复/撤销真实落库 |
| 红 | `src/p5r-red/screens/pkg4/d4.ts` | BIG DEAL读取真实任务，子步、收官、重建、归档、删除接store |

## 本轮验证

- `node node_modules/typescript/bin/tsc --noEmit`：exit 0。
- `node node_modules/vitest/vitest.mjs run --reporter=dot`：**70文件 / 414项通过**。
- `npm run build`：exit 0；prebuild、TypeScript、Vite与PWA生成成功。仍有既有大chunk/PWA预缓存上限与Vite CSS `@import`顺序警告，本轮未扩大范围处理。
- `node --check scripts/verify-theme-plan04.mjs`：exit 0。
- `git diff --check`：exit 0；只有Git行尾提示。
- 未重跑764项loader。

## 浏览器证据

探针脚本：`scripts/verify-theme-plan04.mjs`。

最终证据目录：
`E:\MASKARIA\outputs\theme-plan04-blue-first-20261024-final-v3`

证据报告：同目录`report.json`。结果：

- 蓝：计次任务`1/3`、`2/3`只记进度，`3/3`才发奖励与完成条。
- 蓝：刷新后完成计数与奖励记录保留。
- 蓝：撤销今日完成后，计数、点数记录和归档状态一起回退。
- 蓝：任务页新建使用真实UUID；长按编辑、归档均落Dexie。
- 蓝：愿望创建和收起落Dexie。
- 蓝：BIG DEAL两步落库，末步真实收官，既有结算屏出现。
- 蓝：完成条关闭后，只有真实升级才出现升级演出。
- 粉/黄/红：任务页完成一次，进度和奖励记录同步落库。
- 红：完成条关闭后由`RedGrowthHost`继续播放升级，`魅力`从Lv.1升到Lv.2。
- `pageerror=0`，本地资源请求失败=0；外网/API与service worker被隔离阻断。

截图：

- `blue-count-complete.png`
- `blue-wish-archived.png`
- `blue-bigdeal-clear.png`
- `blue-levelup.png`
- `pink-task-complete.png`
- `yellow-task-complete.png`
- `red-task-complete.png`
- `red-levelup.png`

截图已人工检查，完成条、BIG DEAL结算和升级弹窗均正常渲染；这不等于四主题整体视觉再验收或真机验收。

## 复跑

```powershell
cd E:\MASKARIA\worktrees\theme-integrate
$env:THEME_AUDIT_BASE='http://127.0.0.1:5197'
node scripts/verify-theme-plan04.mjs E:/MASKARIA/outputs/theme-plan04-NEXT
```

输出目录必须不存在。默认服务启动：

```powershell
node node_modules/vite/bin/vite.js --host 127.0.0.1 --port 5197 --strictPort
```

缓存与TEMP/TMP放`E:\MASKARIA\.cache`。探针读取全新隔离Chrome档案，不读取真实浏览器档案。

## 保留边界

- 蓝粉黄和红色BIG DEAL中的AI续拆仍是演示计时器，真实AI拆解留给计划10；本轮没有发收费调用。
- 蓝粉黄愿望面板的“评估一次距离”仍保留演示文案/计时器，真实AI评估与取消/超时留给计划10。手动进度、子任务、自动重估设置已真实落库。
- B17蓝粉宣告卡载荷、B18黄宣告卡双宿主属于计划09，本轮未修。
- 红跨页只补齐成长类消费者；回归面板、PWA更新、完整组织/宣告卡通知仍按计划02/09边界保留。
- 没有真实登录、真实社交、线上组织、真实账本、Android/真机、音效节奏或四主题整体视觉验收。
- 没有重跑764项loader；不能把本轮70文件/414项测试和任务Flow探针当全登记目标回归。

## 计划04收尾

计划04完成标准已达到：蓝主题完整真实路径通过，粉/黄/红完成主流程回归；创建、编辑、完成、撤销、归档、计次、每日、长期、属性升级、BIG DEAL与愿望非AI主路径均复用现有store/Dexie/services；完成条与后续通知顺序在蓝和红有浏览器证据。计划05及之后未启动。
