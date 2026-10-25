# MASKARIA 当前状态

最后更新：2026-10-25

这是接手项目的第二入口。先读根目录 `README.md` 的「接手先读」，再读本文件；只有追查历史时才读 [完整历史归档](docs/archive/PROJECT_STATE-2026-10-25-full.md)。

## 一眼结论

- 当前开发基线是 **3.0.1**，四主题、真实数据链路、AI 入口和卡面素材已经合入 `main`。
- 本地 `main` 与 `origin/main` 一致，均为 `cfa8967`。
- 远端仓库只保留两个开发分支：
  - `main`：当前唯一主线。
  - `feat/umbra-app-m2`：UMBRA 独立开发线，最新 `d480023`；暂停等待 3D 任务书。
- 历史实验分支已删除，顶端保存在 `archive/2026-10-25/*` 标签中；需要旧代码时从标签恢复，不要重新堆长期分支。
- 最新 Android 候选包是 `artfix-v3`，但没有进行真机验收；线上网页/后端没有因本轮合并重新部署。

## 仓库位置

- 主工作树：`E:\MASKARIA`
- 远端：`git@github.com:Meinan818/persona-terminal-dev.git`
- 当前分支：`main`
- 当前 HEAD：`cfa8967`

## 本轮验证

以下结果均在 2026-10-25 合并后的 `main` 上实跑：

```powershell
npm run typecheck
npm test
npm run build
$env:VITE_API_URL='http://150.158.174.9'; npm run build
node scripts/verify-release.mjs http://150.158.174.9 dist
```

- 类型检查：exit 0。
- 全量测试：**72 个测试文件 / 437 项全部通过**。
- 普通构建：exit 0。
- 正式后端地址构建：exit 0，3429 modules，PWA precache 1036 entries。
- 发布产物检查：`正式产物后端地址校验通过`。
- 构建仍有既有警告：Tailwind `@import` 顺序、动态/静态混合导入、大 chunk、`caniuse-lite` 过期；不影响构建通过，但属于后续性能与依赖维护项。

## 最新产物

`E:\MASKARIA\outputs\maskaria-artfix-20261025-v3\maskaria-3.0.1-artfix-v3.apk`

- 副本：`D:\下载\互传\maskaria-3.0.1-artfix-v3.apk`
- 大小：133,663,911 B
- SHA-256：`9F0AD5519FA3596EA73E244F8D2EACC9504A26FF0F0BC702C82A48A16E78D29F`
- 包名：`com.meinan818.personaterminal`
- 版本：3.0.1 / versionCode 31
- 签名：沿用线上 2.8.2 的 Android Debug 证书，可覆盖安装

这是本地候选包，不是商店正式发布包。

## 项目结构

| 路径 | 用途 |
|---|---|
| `src/pages` | 主应用页面 |
| `src/components` | 共用 UI 与业务组件 |
| `src/services` | 账户、同步、组织、协作等后端调用 |
| `src/store` | Zustand 状态与持久化 |
| `src/db` | Dexie 数据库与本地数据 |
| `src/themes` | 蓝、粉、黄三套主题源码 |
| `src/p5r-red` | 红色主题源码 |
| `src/umbra` | UMBRA 引擎与已有桥接 |
| `backend` | Java 17 / Spring Boot / MySQL 后端 |
| `android` | Capacitor Android 工程 |
| `scripts` | 构建、发布与隔离验收脚本 |
| `docs` | 设计、计划和历史文档 |

## 本地数据边界

- 默认本地优先，数据在 IndexedDB / Dexie；云同步是可选能力。
- 记账流水、聊天原文、记录配图、导入音乐按产品设计不上传。
- AI 使用用户自己的 Key；Key 不得写入仓库、日志或提交。
- 不读取、提交 `.env`、`credentials.*`、`*token*`、`*secret*`、私钥文件。

## 分支与归档

归档标签：

```text
archive/2026-10-25/pre-theme-reset-backup
archive/2026-10-25/theme-real-wiring
archive/2026-10-25/umbra-3d-spike
archive/2026-10-25/umbra-p5t
archive/2026-10-25/umbra-skin-p3-blue
archive/2026-10-25/umbra-skin-p3r-pink
archive/2026-10-25/umbra-skin-p4-yellow
archive/2026-10-25/umbra-skin-p5r-red
```

从归档恢复时使用短生命周期分支，例如：

```powershell
git switch -c investigate/umbra-p5t archive/2026-10-25/umbra-p5t
```

不要把归档标签重新变成常驻分支。合并、删除或重命名发布分支前先核对远端和未推送提交。

## 本地清理记录

- `git status` 的未跟踪项从 397,593 个降到 0 个（已跟踪工作区同样干净）；`deploy/staging/caddy.service.d.conf` 是保留下来的本地部署配置。
- `.cache`、旧 `outputs`、旧工作树、`.rivet/scratch`、`.theme-compare` 已移出项目，保存在 `E:\MASKARIA-ARCHIVE-20261025`。
- 归档目录不是项目的一部分，不进入交接压缩包；确认不再需要历史截图和浏览器档案后，可由用户自行清空该归档目录。
- 最终证据保留在 `outputs/handoff-preserved/20261025/`。

## 已知边界

- 用户明确跳过本轮真机验收；真机返回键、流畅度、闪屏、通知栏、麦克风和真实音频仍未确认。
- 本轮没有部署网页、后端或服务器文件。
- 逆影战场 / `battleAI` / `battleAdvisorAI` / Persona 召唤 / Boss 心魔不在本轮 AI 覆盖范围。
- UMBRA 暂停，不引入 Pixi；等新的 three.js 3D 任务书。
- iOS 未完成；国产 Android ROM 的后台通知策略未完整验证。

## 接手顺序

1. 读 `README.md`、本文件、`AGENTS.md`。
2. 运行 `git status -sb`、`git log -5 --oneline --decorate`、`git branch -vv`、`git tag --list 'archive/*'`。
3. 安装依赖使用 `npm ci`，不要提交 `node_modules`、`dist`、`.cache` 或本地 `outputs`。
4. 改动前先确认当前任务是否属于 `main`，还是应使用 UMBRA 分支或临时调查分支。
5. 代码改动按类型检查、相关测试、全量测试、构建的顺序验证；文档改动至少运行 `git diff --check`。
6. Push 前核对远端目标、敏感文件名和待上传提交。

## 常用命令

```powershell
npm ci
npm run dev
npm run typecheck
npm test
npm run build

cd backend
mvn test
mvn spring-boot:run
```

Android：

```powershell
npm run build
npm run cap:sync
npm run cap:build:android
```

正式后端地址构建：

```powershell
$env:VITE_API_URL='http://150.158.174.9'
npm run build
node scripts/verify-release.mjs http://150.158.174.9 dist
```
