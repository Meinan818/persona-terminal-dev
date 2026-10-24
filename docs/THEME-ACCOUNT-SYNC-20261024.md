# 计划06 · 账号与同步边界（已完成）

核对日期：2026-10-24。工作树：`E:\MASKARIA\worktrees\theme-integrate`；分支：`codex/theme-integrate`；接手基点：计划05交接提交 `7660f3d`。

本报告只覆盖计划06“账号与同步边界”。没有进入计划07及后续，没有重做记账、任务、据点、AI或四主题外观，没有重跑764项loader，没有使用真实账号、真实云端数据或执行真实删云操作，没有Push、部署、APK或收费调用。

## 结论

1. 四主题账号页不再用计时器或本地状态伪造同步、拉取、退出和删号。页面统一经 `accountOps` 调用现有 `auth`、`sync` 与 `cloudStore`。
2. 蓝粉黄账号页的“立即同步”、登录后首次同步、“和云端对一对”、拉取、退出和删号均展示真实Promise结果；失败保留真实服务错误。
3. 红频道登录从演示口令改为真实验证码/密码服务；红账号确认框会等待异步结果，失败时保留弹窗并显示真实错误，不再交替演示失败/成功。
4. 未登录、登录失效和未配置云同步由真实 `cloudUser / syncStatus / lastError` 派生；未登录页不显示演示邮箱或UserID。
5. 同步合并入口不再跳到演示overlay，而是打开真实`SyncMergeSheet`；`SyncConflictError`仍由统一账号操作层转交该弹层，不自动覆盖任一侧。
6. 云同步元数据按账号隔离：最近同步时间、自动同步节流/退避和云端版本水位均使用账号分键。换号或重新登录会清空上一账号的内存同步水位、冲突和待确认提示。
7. 本地旧档案保护继续生效：云端状态无法读取时不推送；同步归属属于另一账号时不自动把本机档案推进新账号。
8. 记账、预算和资产仍未列入云同步表。新增测试明确断言这三类本地财务数据不会被全量推送带上云。
9. 蓝粉登录层关闭后可能残留透明遮罩并截获点击，已通过关闭态禁用指针事件并条件卸载登录层修复。

## 关键代码

| 范围 | 文件 | 改动 |
|---|---|---|
| 共用账号操作 | `src/themes/accountOperations.ts` | 薄适配层：同步前差异检查、`SyncConflictError`转真实合并、拉取、登录后同步、退出、删号 |
| P3R蓝/粉与P4G黄 | `themes/*/screens/pages/Account.*` | 真实同步/拉取/退出/删号、真实最近同步、会话过期、登录后同步、真实合并入口 |
| P3R/P4G确认框 | `themes/*/screens/overlays/AccountConfirms.*` | 等待异步确认，失败保留弹窗并显示真实错误 |
| P3R系统弹层 | `themes/p3r-{blue,pink}/screens/pkg5/sysmodal.tsx` | 关闭态不再以透明层截获指针事件 |
| 红色账号块 | `src/p5r-red/screens/overlays/AccountBlocks.tsx` | 真实同步、拉取、退出、删号；真实合并入口和真实错误 |
| 红色登录 | `src/p5r-red/screens/overlays/LoginModal.p5r.tsx` | 发码、验码、密码登录、重发、重置邮件全部接auth services；成功后触发登录同步 |
| 红色确认基座 | `src/p5r-red/screens/overlays/ObKit.tsx` | `onConfirm`支持Promise，成功才关闭，失败显示真实错误 |
| 云端状态 | `src/store/cloud.ts` | 换号或重登清空上一账号同步水位、冲突、差异和合并提示 |
| 同步边界 | `src/services/sync.ts` | 同步元数据按账号分键；旧键只在同步归属匹配时兼容读取 |

## 四主题结果

| 主题 | 本轮真实路径 | 结果 |
|---|---|---|
| 蓝 P3R | 未登录 → 错误密码 → 正确密码 → 网络失败 → 恢复同步 → 合并 → 删号失败 → 401过期 → 退出 | 完整通过 |
| 粉 P3R | 登录态 → 网络失败 → 退出 | 通过 |
| 黄 P4G | 登录态 → 网络失败 → 退出 | 通过 |
| 红 P5R | 登录态 → 网络失败 → 退出 | 通过 |

## 本轮验证

- `node node_modules/vitest/vitest.mjs run --reporter=dot`：**71文件 / 431项通过**。
- `node node_modules/typescript/bin/tsc --noEmit`：exit 0。
- `npm run build`：exit 0；prebuild、TypeScript、Vite与PWA成功。
- `node --check scripts/verify-theme-plan06.mjs`：exit 0。
- `git diff --check`：通过；只有既有Git行尾提示。
- 未重跑764项loader。

构建仍保留既有大chunk、PWA主包不预缓存、Vite CSS `@import`顺序、字体运行时解析和`eval`警告；本轮未扩大范围处理。

## 浏览器证据

探针：`scripts/verify-theme-plan06.mjs`。

最终证据目录：`E:\MASKARIA\outputs\theme-plan06-blue-first-20261024-final`。

报告：同目录`report.json`。结果：

- 12个检查点通过。
- 四主题均`ok=true`。
- `pageErrors=[]`、`localFailures=[]`、`blockedExternal=2`。
- 所有`/api/*`请求均由探针本地路由响应，没有访问真实账号或真实后端。
- 错误密码返回真实401且不保存token；删号仅在隔离接口返回503，没有执行真实删云。
- 蓝主题打开真实合并弹层、完成合并并回推隔离接口。
- 401过期清除token并显示“云端登录已失效，本机数据仍在”。

早期`v1`–`v12`失败目录均保留。`v1`是现场未设置`VITE_API_URL`；`v2`/`v3`/`v5`暴露登录成功后透明系统弹层截获点击，已修代码；其余失败主要是探针在切换主题后过早读取、确认框ARIA角色定位、受控密码输入残留和红色账号卡不直接显示邮箱，均按真实DOM与产品语义修正探针后通过，没有放宽业务断言。

截图：

- `blue-signed-in.png`
- `blue-network-fail.png`
- `blue-merge-done.png`
- `blue-expired.png`
- `pink-signed-out.png`
- `yellow-signed-out.png`
- `red-signed-out.png`

截图已人工检查；这不等于真实账号、真实服务或Android真机验收。

## 复跑

```powershell
cd E:\MASKARIA\worktrees\theme-integrate
$env:TEMP='E:\MASKARIA\.cache'
$env:TMP='E:\MASKARIA\.cache'
$env:VITE_API_URL='same-origin'
node node_modules/vite/bin/vite.js --host 127.0.0.1 --port 5199 --strictPort
```

另开终端：

```powershell
$env:THEME_AUDIT_BASE='http://127.0.0.1:5199'
node scripts/verify-theme-plan06.mjs E:/MASKARIA/outputs/theme-plan06-NEXT
```

输出目录必须不存在。探针使用全新Chrome档案、本地mock API和service worker隔离，不读取真实浏览器档案。

## 保留边界

- 没有连接真实认证服务、真实用户账号或真实云端数据库。
- 没有真实执行删账号或删云数据；只验证了隔离接口失败时的保留行为。
- 浏览器主登录路径使用密码登录；验证码发码、验码、重发和重置邮件已接真实services，并有发码限流单测，但未向真实邮箱发信。
- 没有做Android真机、弱网条件矩阵、并发多标签真实服务或四主题整体视觉验收。
- 没有重跑764项loader；本轮未改四主题CSS、素材、音效或整体布局。

## 计划06收尾

计划06完成标准已达到：未登录不显示演示账号；发码/登录失败不假报成功；登录、退出、过期和网络失败有可操作的真实反馈；合并/冲突复用现有服务；本地旧档案、财务表和账号同步元数据隔离均有代码与证据。计划07及之后未启动。
