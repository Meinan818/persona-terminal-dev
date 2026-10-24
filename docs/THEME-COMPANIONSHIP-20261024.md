# 计划07 · 同伴与羁绊

核对日期：2026-10-24。工作树：`E:\MASKARIA\worktrees\theme-integrate`；分支：`codex/theme-integrate`；接手基点：计划06交接提交 `182aa7e`。

本报告只覆盖计划07“同伴与羁绊”。没有进入08及后续，没有重做账号同步、记账、据点、AI或四主题外观，没有重跑764项loader，没有Push、部署、APK、真实账号/社交数据或收费模型调用。

## 结论

1. 同伴创建、互动、归档、删除和星移均以现有`useAppStore` / `PGTDatabase`为权威数据源；页面成功反馈前会等待真实Promise，失败保留现场并显示错误。
2. 互动每日限次与亲密度加点进入同一事务。第二次请求被拒绝时不会再先把`lastInteractionDate`写掉，也不会吞掉当天机会。
3. 星移读取与扣次进入IndexedDB事务；一次确认只扣一次并只写一条`star_shift`事件。共用hook另有双击守卫。
4. 蓝粉页面本地升级链已移除，统一由`ConfidantRankUpCutIn`全局队列消费；黄主题改由黄色`GlobalOverlayHost`消费P4原演出；红频道挂回P5原演出与主角牌层。
5. 已归档同伴不会再播放遗留升级或星移邀请；升级队列中的失效项会被跳过。
6. 在线邀请复用现有用户搜索与好友申请services；COOP提议、接受、拒绝、解除复用`coopBondOps`与现有社交API，不再由页面固定计时器伪造。
7. 红主题真实好友列表和COOP状态已从`useCloudSocialStore`映射到原P5页面；同伴数据刷新时重新投影到`OC.CF`，避免换账号或新增同伴后仍显示旧模块级快照。
8. 红主题原P5演出此前被底导`z-index:600`盖住，确认键无法点击。现由红频道专属层级覆盖到导航之上，浏览器真实点击通过。

## 关键代码

| 范围 | 文件 | 改动 |
|---|---|---|
| 互动/星移事务 | `src/store/index.ts` | 每日限次与加点同事务；星移扣次与事件同事务；缺失同伴明确报错 |
| 星移双击守卫 | `src/components/cooperation/useStarShiftFlow.ts` | 确认期间防重复提交 |
| 升级消费 | `src/components/cooperation/ConfidantRankUpCutIn*.tsx` | 归档同伴不再进入演出；蓝粉页面本地链移除 |
| 黄主题全局宿主 | `src/themes/p4g-yellow/bridge/GlobalOverlayHost.tsx` | 挂载统一升级/星移宿主，消费同一队列 |
| 红主题全局宿主 | `src/p5r-red/RedChannelRoot.tsx` | 挂载P5主角牌层、升级链与星移邀请 |
| 红主题数据桥 | `src/p5r-red/adapter/live.ts`、`src/p5r-red/mock/data.ts` | 真实好友与COOP状态映射到原P5对象 |
| 红主题页面 | `src/p5r-red/screens/pkg3/{oc,coop,hideout}.ts` | 真实互动/星移/归档/删除/COOP；刷新同伴投影；真实好友点击 |
| 三套主题详情 | `themes/p3r-{blue,pink}/screens/overlays/ConfidantDetailModal.p3r.tsx`、`themes/p4g-yellow/.../ConfidantDetailModal.p4g.tsx` | 归档、恢复、删除、解除COOP等待真实写入 |
| 三套主题创建/互动 | `ConfidantCreateModal.*`、`ConfidantInteractionModal.*` | 创建和保存期间锁定按钮，错误留在原界面 |
| 级别层级 | `src/styles/confidant-{rankup,celebrate,starshift}-p5.css` | P5演出压在红频道底导之上 |

## 四主题结果

| 主题 | 本轮真实路径 | 结果 |
|---|---|---|
| 蓝 P3R | 互动落库 → 升级演出1次 → 恭喜 → 星移扣次/写事件 → 归档 | 完整通过 |
| 粉 P3R | 互动落库 → 升级演出1次 → 恭喜关闭 → 队列清空 | 通过 |
| 黄 P4G | 互动落库 → P4原升级链1次 → 继续收看 → 队列清空 | 通过 |
| 红 P5R | 命令式互动落库 → P5升级演出1次 → 星移扣次/写事件 → 归档 | 通过 |

## 本轮验证

- `node node_modules/vitest/vitest.mjs run --reporter=dot`：**71文件 / 434项通过**（创建同伴用例补齐后，专项文件为7/7通过）。
- `node node_modules/typescript/bin/tsc --noEmit`：exit 0。
- `npm run build`：exit 0；prebuild、TypeScript、Vite与PWA成功。
- `node --check scripts/verify-theme-plan07.mjs`：exit 0。
- `git diff --check`：通过；仅保留Git行尾提示。
- 未重跑764项loader。

构建仍保留既有大chunk、PWA主包不预缓存、Vite CSS `@import`顺序、字体运行时解析和`eval`警告；本轮未扩大范围处理。

## 浏览器证据

探针：`scripts/verify-theme-plan07.mjs`。

最终证据目录：`E:\MASKARIA\outputs\theme-plan07-blue-first-20261024-final-v14`。

报告：同目录`report.json`。结果：

- 11个检查点通过，四主题均`ok=true`。
- `pageErrors=[]`、`localFailures=[]`、`blockedExternal=2`。
- 蓝：互动→升级→星移→归档完整路径；星移只写1条事件。
- 粉：互动→升级只出现1个演出。
- 黄：P4原升级链只出现1次，实际星移次数为1，确认后队列清空。
- 红：命令式互动走真实Dexie；P5升级与星移各消费1次；归档落库。
- 在线邀请请求命中`/api/social/users`与`/api/social/friends/request`。
- COOP提议、接受、拒绝请求均命中隔离接口，响应状态决定UI状态。

截图：

- `blue-rankup.png`
- `pink-rankup.png`
- `yellow-rankup.png`
- `red-rankup.png`
- `blue-online-invite.png`

截图已人工检查；这不等于Android真机、真实社交服务或四主题整体视觉验收。

## 复跑

```powershell
cd E:\MASKARIA\worktrees\theme-integrate
$env:TEMP='E:\MASKARIA\.cache'
$env:TMP='E:\MASKARIA\.cache'
$env:VITE_API_URL='same-origin'
node node_modules/vite/bin/vite.js --host 127.0.0.1 --port 5207 --strictPort
```

另开终端：

```powershell
$env:THEME_AUDIT_BASE='http://127.0.0.1:5207'
node scripts/verify-theme-plan07.mjs E:/MASKARIA/outputs/theme-plan07-NEXT
```

输出目录必须不存在。探针使用全新Chrome档案、本地mock社交API和service worker隔离，不读取真实浏览器档案。

## 保留边界

- 没有连接真实社交后端、真实账号或真实用户数据；好友/COOP只验证隔离接口契约与状态机入口。
- 没有发送真实邮件或系统通知，没有执行真实解绑/删云端关系。
- AI互动解读、星移推演和COOP星象匹配仍保留离线模板/原有未配置分支；真实AI流式、取消、超时和费用边界属于计划10。
- 没有做Android真机、弱网矩阵、并发多标签或四主题整体视觉验收。
- 没有重跑764项loader；本轮未重做四主题CSS、素材、音效或整体布局。
- 红主题在线祈愿、约定等其他社交能力仍按计划边界保留，没有扩写成计划07已全部闭环。

## 计划07收尾

计划07完成标准已达到：等级、累计点和阈值同口径；每日互动与星移防重；升级事件只消费一次；四主题原升级/星移演出在真实路径触发；创建、归档、删除、在线邀请与COOP均有真实写入口或隔离服务验证。计划08及之后未启动。
