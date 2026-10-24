# 计划08 · 据点真实读写

核对日期：2026-10-24。工作树：`E:\MASKARIA\worktrees\theme-integrate`；分支：`codex/theme-integrate`；接手基点：计划07交接提交 `50d4318`。

本报告只覆盖计划08「据点真实读写」。没有进入09及后续，没有重做同伴、账号同步、记账、AI或四主题外观，没有重跑764项loader，没有Push、部署、APK、真实账号或真实组织数据，没有收费模型调用。

## 结论

1. 红色据点数据源改为同一个 `useCloudSocialStore.orgs`，并按 `hideoutOrgId` 选择组织；未登录、未拉完、拉取失败、无组织、有组织是五种不同状态，不再混成空组织。
2. 红色 `hideoutData.ts` 补齐真实纪要、结束的作战、成员称号/五维点数、团战投影与多组织入口；页面不再使用固定演示名册、假血量或假纪要。
3. 红色页面的刷新、分享、贴标签、举报、删除动态、退出/取消作战、写分工、会议提交、建组/加组/选牌、换码/请离/转让/退出/解散、标题与称号保存，都改为等待现有 `orgSync` / `orgOpsSync` / `orgRaidSync`，失败保留现场并显示真实错误。
4. 蓝粉黄三套主题原本共用 `components/org/*`，但各自的叠加层仍有计时器假成功（发起作战、分享到据点、设置确认、称号保存、建组/加组/选牌），本轮也改为等待同一个 services；页面布局、类名与动效未重画。
5. 团战写入走 `strikeFromUi` / `allOutFromUi`；AI 拆解分工仍是原计划10边界，按钮禁用并改为说明文字，不再假装拆完。

## 关键代码

| 范围 | 文件 | 改动 |
||---|---|---|
| 红色数据派生 | `src/p5r-red/adapter/hideoutData.ts` | 按 `hideoutOrgId` 选组织；新增纪要、历史、成员点数/称号、团战、多组织、加载/失败/公告板未拉到等状态 |
| 红色页面 | `src/p5r-red/screens/pkg3/hideout.ts` | 真实纪要卡、真实历史、真实会议周与点名、真实公告板/作战失败态、真实邀请码复制与组织切换 |
| 红色弹层 | `src/p5r-red/screens/pkg3/od.ts` | 建组/加组/选牌、设置、称号、发起作战、分享、会议、团战、地图改为真实 services |
| 红色回归 | `src/p5r-red/adapter/hideoutData.test.ts` | 新增纪要/历史/团战/多组织派生用例，并把原用例改为与真实加载状态一致 |
| 三主题发起作战 | `src/themes/{p3r-blue,p3r-pink}/screens/overlays/OpCreateSheet.p3r.tsx`、`src/themes/p4g-yellow/screens/overlays/OpCreateSheet.p4g.tsx` | 改走 `createOpFromUi` + `refreshOrg`；AI 按钮禁用并说明归属计划10 |
| 三主题分享 | `src/themes/{p3r-blue,p3r-pink,p4g-yellow}/screens/overlays/ShareToOrgSheet.*` | 改走 `shareActivity`；组织、余量、类目名全部来自真实 store |
| 三主题设置/称号/引导 | `OrgSettingsSheet.*`、`OrgTitlesSheet.*`、`OrgOnboardingSheet.*` | 改走 `orgSync` 真实换码/请离/转让/退出/解散/保存称号/建组/加组/选牌 |
| 三主题作战与会议 | `screens/pkg4/org/OpsMeeting.tsx`、`screens/pkg4/org/Board.tsx` | 改走 `orgOpsSync` 与 `orgSync` 的真实打卡/取消/退出/提交/贴标签/删帖/举报 |
| 组织页状态 | `src/themes/p3r-blue/screens/pages/Hideout.p3r.tsx`、`p3r-pink`、`p4g-yellow`、`src/themes/astrologyData.ts` | `useOrgView` 暴露 `lastError`，三主题补 loading/error 状态 |

## 四主题结果

| 主题 | 本轮真实路径 | 结果 |
||---|---|---|
| 蓝 P3R | 登录 → 拉组织/成员 → 名册与队友 → 发起目标 | 通过 |
| 粉 P3R | 同上 | 通过 |
| 黄 P4G | 同上 | 通过 |
| 红 P5R | 同上 + 公告板贴标签 | 通过 |

## 本轮验证

- `node node_modules/typescript/bin/tsc --noEmit`：exit 0。
- `node node_modules/vitest/vitest.mjs run --reporter=dot`：**71 文件 / 435 项通过**。
- `npm run build`：exit 0（prebuild 主题 CSS、TypeScript、Vite、PWA）。
- `node --check scripts/verify-theme-plan08.mjs` 与 `git diff --check`：通过。
- 未重跑764项loader。

## 浏览器证据

探针：`scripts/verify-theme-plan08.mjs`。

最终证据目录：`E:\MASKARIA\outputs\theme-plan08-isolated-20261024-v11`。

报告：同目录 `report.json`。结果：

- `ok=true`，5 条检查，四主题 `ok=true`、`operationPosted=true`。
- 四主题均从同一 mock 组织读到 `计划08真实组织` 与 `计划08真实队友`，正文不出现 `坂本龙司` / `夜读小队` / `高卷杏`。
- 四套「发起目标」界面都产生真实 `POST /api/social/orgs/org1/ops`，请求体带真实标题、截止日与参与者。
- 红主题公告板标签产生真实 `POST /api/social/orgs/org1/reactions`，随后按真实 store 重绘。
- `pageErrors=[]`、`localFailures=[]`、`blockedExternal=2`。
- 截图 4 张（blue/pink/yellow/red-hideout.png）已人工检查渲染。

复跑：

```powershell
cd E:\MASKARIA\worktrees\theme-integrate
$env:TEMP='E:\MASKARIA\.cache'; $env:TMP='E:\MASKARIA\.cache'
$env:VITE_API_URL='same-origin'
node node_modules/vite/bin/vite.js --host 127.0.0.1 --port 5207 --strictPort
```

另开终端：

```powershell
$env:THEME_AUDIT_BASE='http://127.0.0.1:5207'
node scripts/verify-theme-plan08.mjs E:/MASKARIA/outputs/theme-plan08-NEXT
```

输出目录必须不存在。探针使用全新 Chrome 档案、本地 mock 组织 API 与 service worker 隔离，不读取真实浏览器档案。

## 保留边界

- AI 互动解读、星移推演、COOP匹配与作战 AI 分工仍属计划10，本轮只做到「按钮不假装成功」。
- 未连接真实组织后端、真实账号或真实社交关系；所有写操作只在隔离接口验证。
- 未真实请离/转让/解散组织，未发送真实邮件或系统通知。
- 未做 Android 真机、弱网矩阵、并发多标签与四主题整体视觉验收。
- 未重跑764项loader；本轮未改四主题 CSS、素材、音效与整体布局。

## 计划08收尾

计划08完成标准已达到：登录/无组织/加载/失败/有组织各有对应状态；成员数、队长与据点等级来自真实 `OrgView`；发起目标、贴标签等界面按钮产生真实写请求，失败显示真实错误并保留现场。计划09及之后未启动。
