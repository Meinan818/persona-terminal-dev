# MASKARIA 项目总日志

最后更新：2026-10-16（北京时间）。新窗口先完整读本文件，再核 Git 与当前任务现场。这里记录项目全貌、发展过程、踩坑、用户决定、真实发布去向和下一步；只进私有开发仓库，不含凭据正文和真实用户数据。

## 1. 当前全貌：先看这一节

- **【2026-10-16 交接摘要 · 新窗口先读这段】** 本轮（一天内）完成六件事：
  1. **粉主题换新塔罗卡面**（22 张用户私人素材，`90bdc93`）+ **卡背改成品红四角星**（`883eb38`）——用户已在本地登录目视验收通过。
  2. **修线上塔罗全缺事故**（已闭环）：服务器缺 `public/tarot` → nginx 的 `try_files` 把 `/tarot/*.webp` 兜底成 200 的 HTML → PWA 的 `CacheFirst` 把该 HTML 当图片缓存 180 天 → 补传 88 张素材后老浏览器仍显示占位卡。修复：补传素材 + 缓存桶 `tarot-art-v1`→`v2` + 部署新代码；用户确认「羁绊页恢复了」。
  3. **缺陷 A 鸿蒙平板记账字体显示不全**（`7c33d43`）：根因是标题用 `-webkit-text-stroke` + `paint-order` 做描边垫字，部分鸿蒙 WebView 不支持 `paint-order` → 白描边盖住笔画。已改为两层叠字（不依赖该属性），本地复现对照验证。
  4. **缺陷 B 手机 APP 头像图裂**（`6661229`）：根因是后端 `AvatarController` 存相对路径 `/api/avatar/{userId}`，APP 的 WebView origin 是 `https://localhost`（Capacitor `androidScheme:'https'`）→ 请求打到本地 404；网页端同源所以正常，这就是「电脑/手机浏览器好、APP 裂」。新增 `src\utils\assetUrl.ts` 的 `resolveAssetUrl` 补全后端地址，接了 8 处远程头像渲染点。
  5. **打包脚本编码修复**（`584bf7c`）：`scripts/build-release.ps1` 原为 UTF-8 无 BOM，Windows PowerShell 5.1 按 GBK 读会 ParserError（中文注释吃掉引号）→ 已加 BOM，`ParseFile` 零错误。
  6. **图片加载失败退避重试**（`9cb01bf`）：`TarotCardSVG` 原先一次失败即永久占位，改为 5s/15s/45s 三次重试。
- **当前发布状态**：版本已升到 **`2.8.6 / versionCode 21`**（`6601fed`），产物 `outputs\maskaria-2.8.6-release.apk`（32,024,575 B）/ `.aab`。**网页端已部署最新产物**（入口 `index-CxeScLxs.js`，与本地 md5 一致）。
- **⚠️ 唯一悬而未决**：**缺陷 B 在真机 APP 上仍裂**（用户反馈：手机浏览器正常、APP 不正常）。本机已核实三层全部正确——APK 内 `apiBaseUrl` 有值、头像行编译为 `src: nt(n)`（补全函数确实被调用）、`allowMixedContent:true` 与 `usesCleartextTraffic` 均已配。**判断最可能是此前三个包同名同 versionCode 导致装的仍是旧包**，故升 versionCode 21 重打包。**2026-10-16 二次追查（`4fbd0e0`）另修了一条确实也坏的线**（**注意：不是用户看到的那一处，见本段末**）：`resolveAssetUrl` 当时只接在 **8 个直接渲染点**上，**组织/好友卡那条公共线全体漏接** —— `MemberCard.tsx` 的 `useMemberFace`（驱动 BoardSection / OpsSection / RosterWall / MemberCard / OpCreateSheet / ShareToOrgSheet 全部成员牌面）、`ConfidantAlbumWall` 好友卡面与 `faceOf`、`Cooperation.openFriendCrop` / `ConfidantDetailModal.openCardFaceCrop` 两处 fetch 裁切；这些位置拿到的都是后端相对路径 `/api/avatar/{id}`，在 APP（origin `https://localhost`）里必裂、网页端同源正常。已全部补齐，并新增回归测试 `src\components\org\__tests__\memberAvatar.test.ts`（回滚修复确认 RED、修好后 GREEN）。**2026-10-16 三次追查：此判断被用户现象推翻**——用户指出裂的是**据点地图中央自己的座位头像**（`HideoutMap.tsx` 的 `SeatPin`，属 `6661229` 已修的 8 处之一），不是本条这条线；`4fbd0e0` 那批改动本身仍成立（独立缺陷、已测全绿），但**没有解决用户看到的问题**。新取证（全部本机实测）：拆 `outputs\maskaria-2.8.6-release.apk` 核对，`assets/public/assets/Hideout-DAp_s9t0.js` 里头像行确为 `src:nt(`（补全函数确实被调用），全包唯一 API 基址 `http://192.144.227.216`、无 localhost 残留；`curl -k https://192.144.227.216/api/health` → **https_code=000、超时（exit 28）→ 服务器根本没开 https**；在 https 页面注入 `http://192.144.227.216/icon.png` 实测 → **ERROR**。故两个可能并存、未判定：**(a)** 用户装的仍是旧包（其截图自述是「之前的」）；**(b)** 已装 2.8.6 仍裂 → 根因是**混合内容**（页面 origin `https://localhost` + 图片 `http://…`，而服务器无 https）。若 (b)，候选修复（**均未执行、需用户拍板**）：首选把 `server.androidScheme` 由 `https` 改 `http`（**代价：App 内 WebView 存储 origin 变更，未上云的本地数据如记账流水、聊天原文会读不到**）；备选给后端加 https（需域名/证书、要动服务器）；备选远程头像改 fetch→blob（改动点多但不动 origin）。Capacitor 侧已核无缺项（`@capacitor/android` 5.7.8，`Bridge.java:556` 在 `isMixedContentAllowed()` 时设 `MIXED_CONTENT_ALWAYS_ALLOW`，工程 `assets/capacitor.config.json` 确含 `android.allowMixedContent:true`）；外部查证受阻（`developer.chrome.com`、DuckDuckGo 抓取均超时），**「ALWAYS_ALLOW 是否仍会被 Chromium 自动升级为 https」仍是推断、未证**。**用户 2026-10-16 明确「先不管了，准备交接」→ 缺陷 B 暂停、未解决。** 原计划的下一步保留：若装 2.8.6 仍裂，做"在页面上直接显示实际请求地址"的诊断包。
- **未开始**：缺陷 C（平板安装后桌面图标不全）。
- **环境要点（本轮新增）**：部署服务器用 `E:\秘钥\xiangmu.pem` + `ubuntu@192.144.227.216`，静态目录 `/opt/maskaria/web`，**覆盖前必须先备份到 `~/maskaria-backups/`**（`/opt/maskaria/` 本身对 ubuntu 不可写）。构建必须显式 `VITE_API_URL=http://192.144.227.216`，否则 `.env.local` 的 localhost 会被烤进产物。

- 工作目录 `E:\MASKARIA`，分支 `main`。首次整理前 HEAD 为 `f55d8a0`；用户随后批准Push，修复与日志已推至两库main（见§9最新节点）。最新提交请运行 `git log -1 --oneline`，不要把此基线当永久 HEAD。
- MASKARIA（面具庭园）：基于 `YuukiMarine/the-velvet` 二创的个人成长记录应用，也是 Java 全栈毕业设计。功能包括五维成长、行为记录、任务/愿望、记账、同伴/社交、逆影战斗、塔罗、AI 助手与总结、Android 桌面小组件。
- 前端 React 18 / TypeScript 5 / Vite 5 / Zustand / Dexie，本地优先；账号、可选同步和社交走 Java 17 / Spring Boot 3.2 / MyBatis-Plus / MySQL 8 / Flyway。PocketBase 已退役，不恢复旧 SDK 或旧登录判断。
- 记账流水、聊天原文、记录配图、导入音乐按设计不上云；本地备份、图片包、云同步各有范围，不可混同。AI 默认 BYOK，即用户自带 Key，开发者不统一供应 Key。
- Android 当前正式修复版 `2.8.4 / versionCode 19`，已构建并上传腾讯云。2.8.3 APK因误含localhost后端地址导致手机同步失败，已由2.8.4纠正；签名连续；2026-10-15用户明确反馈“手机确认恢复”，手机端同步故障验收通过、此项关闭。Kitool模型列表未单独反馈，不扩大为全部AI验收通过。
- 本地素材恢复候选版 `2.8.5 / versionCode 20` 已构建（**已被 2.8.6 取代，以本节顶部摘要为准**），未公开发布；66张塔罗及26音效已由6f7019b保存，只进私有开发库，不同步公开展示库、不上传安装包或素材到公开渠道。用户本次明确要求素材不公开，后续持续遵守；已有介绍截图保留。2026-10-15用户反馈「验收通过」，素材视觉与听觉验收完成；仍不公开发布，发布或重开下载须用户另行明确要求。
- **粉主题塔罗换新（2026-10-16，已完成、已部署、用户已验收）**：用户提供新私人素材 22 张大阿卡纳（原稿 `D:\文档\塔罗\粉色塔罗`），要求换到粉色主题。核查发现粉主题在频道层就是 p3（`src\ui\channel.ts:25`），原先与蓝主题共用 `public\tarot\p3`——直接覆盖会连蓝主题一起换，用户明确选择「只给粉色主题换，蓝色保持原样」。素材已压缩为 560×896 webp 存 `public\tarot\pink\`（22 张，约 1.6 MB），粉主题单独走这一套。素材仍不入库（`public/tarot/` 在 .gitignore），原稿留在 D 盘。桌面小组件固定读 p3、不跟随，与设置页既有文案一致。
- **手机端体验诊断（2026-10-15，已归档待决定）**：用户反馈 2.8.5 手机端「音画不同步、整体卡、点了过一会才响应」。已定位两类来源：① 音效——恢复的原版素材比 2.8.4 旧音效长 7～13 倍（成功音 0.20s→2.68s、召唤 0.30s→3.35s），播放代码不打断上一实例，连点会叠播；② 持续渲染负载——主界面标题装饰三角每帧重写 SVG 路径（实测约 61 次/秒，`src/components/p3r/kit.tsx` 的 TitleTri wobble）+ 轮播 tween 约 19 次/秒改样式。诊断中我提出的「37 个 JS 动画是主因」已被自己的对照实验推翻（见 §9）。**未改任何代码**，优化档位待用户拍板。
- **下载通道已关闭（2026-10-15）**：官网两处入口均显示“下载已关闭”，最新快照 https://d3ea1293.maskaria.pages.dev/；腾讯云 `/download`、`/download/` 及APK/AAB地址返回410，服务器3个旧APK保留但禁止下载。应用网页和后端保持正常，手机已安装版本不受此关闭影响。此次私有库Push由用户明确授权，结果见§9最新节点。
- **两个网站都已上线**：应用网页在腾讯云，独立官网在 Cloudflare Pages。旧版状态说明“site/ 没有部署位置”是漏查原发布记录造成的错误，见 §3、§9。
- 官网此前已修正源码/隐私/合规链接至公开展示库；2.8.4下载入口现已按用户要求关闭。原快照https://ac1d998c.maskaria.pages.dev/仅作历史回滚依据，旧快照里的APK链接同样被服务器410阻断。
- 应用视觉、布局、配色、主题、动画、图标和音效受保护。本轮修构建发布逻辑及已授权官网链接/版本，新增修复APK并发布Pages，没有改App外观、服务器配置、业务数据或应用网页根。
- 本轮开始已有 `ios/App/Podfile` 修改及未跟踪 `.cache/`、`.rivet-config.json`、`outputs/`；归属未核，不纳入本次提交，不清理或覆盖。

## 2. 日志维护与协作约定

1. 新窗口完整读本文件、`AGENTS.md`、`.rivet.md`，核 `git status --short` 与 `git log -3 --oneline`；需要细节时按 §10 找证据，不让用户重复项目历史。
2. 每个独立功能、修复、发布、部署、仓库同步、重要失败/阻塞、用户决定/验收、交接后，主动更新本文件，不等提醒。当前摘要、发布表、待办就地维护；历史按时间追加，不创建平行总日志。
3. 节点记录：日期、起因、改动和关键文件、验证命令/结果/边界、commit/Push、实际部署版本、遗留与下一步负责人。保留关键失败和根因，避免堆终端全文。
4. 本地 commit 可自主进行，只含本次归属文件；Push 须核目标、内容与影响，获得明确批准。旧交接“私有库可自主 Push”的文字已被更新约定取代。
5. 普通协作完成当前授权范围后交付；本轮未触发“执行自动化任务”，未设定时自动化。旧会话自动化状态不代表当前存在自动化。
6. 高危命令、生产、费用、真实数据和可见 UI 各有授权边界，不能用清空工作区制造测试通过。生图遵循 Kitool 技能，先展示审核再接入。
7. 中文大白话汇报：做了什么、验证与边界、遗留/偏差、commit、Push、下一步由谁做；无需用户操作就直说。程序检查不等于用户验收。
8. 历史项目约定出处为 `.rivet/HANDOFF-2026-10-12.md` §十九；其中有敏感段，按需定位安全段落，禁止整份打印或同步。最新用户要求和当前工具规则优先。

## 3. 发布地图：网站、后端、安装包、仓库分别在哪

### 3.1 2026-10-15 本轮核实

| 对象 | 实际去向 | 现场证据与边界 |
|---|---|---|
| 应用网页/PWA | `http://192.144.227.216/`，腾讯云 nginx；历史应用目录 `/opt/maskaria/web/` | GET 200，标题 `MASKARIA - 个人成长追踪器`，入口 `/assets/index-BCuXre6P.js`。本轮未比对所有产物，不宣称网页代码已同步 2.8.3 |
| Java 后端 | 同主机 `/api/` 反代本机8080；历史路径 `/opt/maskaria/backend/app.jar`，服务 `maskaria-backend` | `/api/health` → 200、`{"status":"UP","db":"UP"}`。目录/配置是历史部署记录，本轮未 SSH 复核 |
| 官网营销页 | `https://maskaria.pages.dev/`，Cloudflare Pages 项目 `maskaria`，发布分支 `main`；源码 `site/` | GET 200，标题 `MASKARIA 面具庭园 · 没人看见的也算数`。这是已部署网站，绝非仅有本地 demo |
| 官网首次发布快照 | `https://2d5f4986.maskaria.pages.dev/` | 2026-10-14 原发布记录；本轮未检查此快照，不冒称最新部署ID |
| APK下载通道（已关闭） | 服务器 `/opt/maskaria/web/download/`；原2.8.4及其他旧直链 | 本次GET/HEAD全部410；3个旧APK保留，不删除，不再公开下载 |
| 官网当前发布 | `https://maskaria.pages.dev/`；快照 `https://d3ea1293.maskaria.pages.dev/` | 下载关闭提示已上线；生产HTML与本地site/index.html逐字节一致；旧APK直链全部410 |
| 本地构建产物 | `outputs/maskaria-2.8.4-release.apk`为线上版；`outputs/maskaria-2.8.5-release.apk`及`.aab`为素材恢复候选版 | 2.8.5已核素材/版本/名称/签名，未上传部署；其素材已于2026-10-15获用户验收通过；AAB未上架商店 |
| 私有开发库 | `git@github.com:Meinan818/persona-terminal-dev.git`，`origin/main` | 本次素材及下载关闭节点已Push至32fb9ec，ls-remote与本地HEAD一致；本条结果日志随后同次授权Push。现场确认Private，素材和项目日志只归此库 |
| 公开展示库 | `git@github.com:Meinan818/Persona-Terminal.git`，`main` | 本轮Push及SSH远端核实为4de5ff5；仅公开8个发布修复文件；可见性沿用原记录 |
| 当前展示库工作区 | `E:/MASKARIA-showcase` | 现场确认原HEAD33f84de且干净；本次8个公开文件提交4de5ff5，已Push并核远端main一致。`.rivet/publish/`只是旧副本，不再作为同步入口 |

源码commit、Git Push、腾讯云上传、Cloudflare发布、用户验收分别记录。本轮没有证据表明Push会自动部署任何一站；不能写“已推送所以官网更新”。

### 3.2 官网以后怎么发布

- 2026-10-14 经 Wrangler 浏览器登录，创建 Pages 项目 `maskaria`，上传24文件约9.8MB。原会话记录未改用户其他站点；当前授权是否有效未验证，不读取或输出授权配置正文。
- 原成功命令形态：`wrangler pages deploy <仅含官网文件的发布目录> --project-name=maskaria --branch=main`。先核现有Wrangler、登录、项目目标，优先复用，不装全局依赖、不操作其他站点。
- 发布目录只含 `site/` 必需静态文件，排除 `download/*.apk`；安装包继续留腾讯云。先核差异、版本和本次发布授权，再部署；本轮用户要求把待办一并修复后，已按该流程发布2.8.4官网。
- 成功后记实际部署ID/快照、生产URL、源码版本，检查HTML、字体与下载按钮；发布前核上一部署ID作为回滚依据，不能凭记忆选ID。
- 官网HTTPS、APK HTTP；2026-10-14在原电脑真点下载未被拦，不代表所有浏览器相同，不因此擅改配置或转存APK。
- 腾讯云 `/intro/` 不是官网：本轮其HTML与应用根页完全相同。历史还发现App的PWA导航兜底会接管同源子路径，子路径200不能证明营销页发布成功。

### 3.3 腾讯云与Android发布注意

- `deploy/README.md`、nginx/systemd配置是模板，模板域名不是真实线上域名；生产配置以服务器现场为准。
- 历史Java/MySQL/nginx同机，2GB机器做过内存规划。备份脚本存在不等于定时备份已运行，本轮未核备份调度或恢复。数据库操作不能为了验证随便迁移/清空。
- 网页构建必须显式用正式 `VITE_API_URL`，不能烤入localhost。验构建输出独立工作目录，避免覆盖用户现成 `dist/`。
- `scripts/build-release.ps1` 生成APK/AAB到outputs；默认沿用线上2.8.2的Android Debug证书，为覆盖安装保持签名连续。“release构建”不等于商店私钥签名。
- 将来商店签名用脚本 `-KeystorePath` 交互方式输入，不把口令写文件/日志/命令行；改证书影响覆盖升级，需要独立规划。
- Android当前允许混合内容和HTTP明文，服务现有HTTP后端；HTTPS是用户暂缓事项，不擅改。
- 服务器还承载其他项目。历史调查18080已被另一项目占用，当前端口仍需现场核实，不覆盖/占用其他服务。

## 4. 代码与数据地图

| 位置 | 作用及接手重点 |
|---|---|
| `src/pages/`、`src/components/`、`src/ui/`、`src/index.css` | 应用界面与主题；外观受保护 |
| `src/store/index.ts` | 本地业务、结算、导出/导入、回滚；改前查事务及数据归属 |
| `src/db/`、`src/types/` | Dexie表与类型；主备份/图片包/同步清单分别核对 |
| `src/services/velvetApi.ts`、`auth.ts`、`sessionSource.ts` | 自研认证、请求、会话来源，不复活PB判断 |
| `src/services/sync.ts`、`userDataApi.ts` | 分片、冲突、数据归属、在途请求防串号 |
| `src/services/*Api.ts`及社交模块 | 好友、通知、祈愿、同伴、一起进步、羁绊之影、组织、弹幕 |
| `src/utils/` | AI路由、反馈音、总结等；代理/浏览器直连/原生请求各有失败分支 |
| `backend/src/main/java/` | 认证、OTP、改密、头像、档案、同步、AI代理、健康、社交业务 |
| `backend/src/main/resources/db/migration/` | Flyway V1–V13；不能随便修改已应用迁移，否则校验失败 |
| `backend/src/test/resources/application-isolated.properties` | `persona_terminal_test`与`target/test-uploads`，pom/surefire激活isolated |
| `android/`、`capacitor.config.ts` | 原生封装、系统栏、图标、后台提醒、小组件；配置变化要同步工程 |
| `ios/` | 遗留代码，用户决定当前不做；有目录不代表可用 |
| `site/` | 独立静态官网，`serve.mjs`默认8123，和Vite应用是两条线 |
| `public/`、`scripts/MaskariaIcons.java` | 字体、图标、音效等及图标处理；公开库不分发部分素材 |
| `.rivet/`、`.taste-skill/`、`outputs/_recon/` | 本地历史、证据、工具、参考材料，不进公开仓库 |

迁移顺序：V1基础 → V2好友 → V3通知updated修复 → V4祈愿 → V5同伴 → V6一起进步 → V7羁绊之影 → V8组织 → V9公告板 → V10组织作战 → V11团战 → V12弹幕 → V13密码重置。13个迁移文件为本轮目录核实；生产是否全部应用不能凭文件数判断。

早期《策划书-Java全栈改造.md》不是现行架构，其中“替换本地存储”“服务端统一持有AI Key”与后来本地优先/BYOK定稿有偏差，以现行代码及本文件为准。

## 5. 验证账本：分清本轮、历史、人工验收

### 5.1 首次日志恢复时的 2026-10-15 核实（后续发布另记）

- 现行规则/状态、README、部署手册、策划、人工方案；安全过滤读取旧交接、计划、复查与天枢知识，检索可访问项目会话发布记录、全部本地Git索引。没有逐行审计全部源码，不能补回不可访问或丢失的聊天。
- GET应用根页200，GET `/api/health` 200且服务/数据库UP，GET Cloudflare官网200。健康正常不等于登录/发信/同步/AI全链路正常。
- `/intro/`与应用根HTML相同，SHA-256 `f43a908e03bf87929a506d4cb73aa643357d1bdedc260a4d485b9382b3ed1acd`。
- 生产官网HTML SHA-256 `64d500c829b7c1bd61352b784903f7159cab88ac10d984b9388da0d0ed0d82b1`，本地site/index.html为 `40c5eb7d680e3c608e94a8752072ec706e9a90e4b164dae2088a14b2ea838d71`；不同，且直接核出旧/新下载目标差异。
- 新APK HEAD200、26,291,477字节；两个远端main以SSH核实。未重跑测试、构建、SSH服务、真机、收费AI；本轮只有文档/规则修改，验证为文档内容、链接/现场、差异与敏感信息检查。

### 5.2 历史验证：不是本轮重跑

| 日期及出处 | 当时结果 | 限制 |
|---|---|---|
| 2026-10-15发布会话 `01a13dc2…` | 前端32文件203项、类型检查；后端159项；正式APK/AAB构建，版本/签名及线上本地SHA-256核对 | 不能写成本轮通过；后续发现2.8.3误含localhost，已由2.8.4修复，见§9 |
| 2026-10-14应用交接§10 | 用户按清单完成A类验收并通过，当时网页入口与本地产物SHA-256一致 | 不代表2.8.3、全部B/C类、所有机型通过 |
| 2026-10-14官网发布会话 `01a13838…` | 在线、3款字体loaded、0控制台错误、字标尺寸与本地一致、点击APK确实开始下载 | 不代表官网同步新包，也不是所有网络的速度结论 |
| 2026-10-14阶段4复查 | 七条流程，修两处导入缺陷，前端30文件196项 | 当轮主要jsdom/mock及离线构建，不是完整真实浏览器/数据库/设备覆盖 |
| 更早社交迁移 | 多轮双合成账号HTTP、CDP及契约/后端测试 | 不等于真实用户多人全组合验收 |

真机通知/小组件、国产ROM、完整社交组合、实际收费AI、iOS均有边界。旧《人工测试方案》的包名和数字不是当前版本标准。

## 6. 下一步、关闭项与用户决定

### 活跃事项

| 顺序 | 事项及完成标准 | 谁做及边界 |
|---|---|---|
| 0 | 用户要求关闭公开下载、素材不公开；官网与服务器均已关闭，私有Push已获本次授权 | Codex记录并核远端结果；后续禁止把恢复素材同步公开库或发布2.8.5包，重新开放下载须用户明确要求 |
| 1 | 素材恢复本地候选2.8.5：66牌面、26音效已恢复且构建完成；用户已于2026-10-15反馈「验收通过」，视觉/听觉验收完成、此项关闭 | 候选仍未上线；发布2.8.5或重开下载须用户另行明确要求，不默认推进 |
| 2 | 两库Push已完成：用户明确批准后推送并核远端main一致，私有含日志及修复，公开仅8个公开文件 | 此项关闭；后续新Push仍需单独批准 |
| 3 | 官网更新与私有链接修正已关闭：生产入口/快照200，HTML与本地一致，两处下载2.8.4，未含私有库链接 | 无需用户配置或去Cloudflare后台 |
| 4 | 展示库入口核账已关闭：当前工作区E:/MASKARIA-showcase，旧.rivet/publish不使用；8个文件原始基线相同才同步 | 后续仍先核现场，不直接覆盖有差异文件 |
| 5 | 手机端卡顿/音画不同步：诊断已完成并归档（§9 对应节点），用户 2026-10-15 选择「先不动，先记录归档」 | 代码未改。继续推进须用户先挑档：①三角沸腾 60→30fps；②查「低帧率自动降级」为何未在其手机生效；③StackCarousel 每帧样式；音效侧另有「叠播打断」与「高频短反馈音换回短音」两个选项。四项都会动到观感，须用户点头后再动手 |
| 6 | 粉主题塔罗换新：① 卡面 22 张新素材（commit 90bdc93）② 卡背品红四角星（commit 883eb38）均已落地；线上已部署新代码（入口 `index-BZ82oxmb.js`、缓存桶 v2）；单测 / typecheck / 全量测试 / 构建全绿 | **卡面与卡背观感已获用户验收**（用户本地登录目视确认「已经改好了」）；要装到手机看须重新构建 APK，发布须用户另行明确要求 |
| 7 | 线上网页端塔罗全缺：服务器没有 `tarot` 目录，四套图请求都返回网页而非图片，已定位根因并留完整证据（见 §9 2026-10-16 节点） | **未修**。修复需把 5.5 MB 素材上传到生产服务器，属生产操作，须用户明确授权后执行；本地与手机端不受影响 → **同日已获用户授权补传素材，随后用户指令「把新代码部署到服务器」，已一并部署完成**：线上入口现为 `index-BZ82oxmb.js`，缓存桶升 v2，四套图 200 + image/webp，`/api/health` UP。详见 §9 2026-10-16 节点 |
| 8 | 用户报的三处缺陷进展：**A 鸿蒙平板记账字体**已修（`7c33d43`，本地复现验证）／**B 手机 APP 头像图裂**已修（`6661229`）／**C 平板安装后桌面图标不全：未开始排查** | A、B 的代码均已部署到网页端并打进 `maskaria-2.8.6-release.apk`（versionCode 21）；**B 未解决、2026-10-16 用户明确决定暂停**（详见 §1 悬而未决条与 §9「三次追查」节点：用户看到的是据点地图 `HideoutMap.SeatPin` 那处，属 `6661229` 已修那一批、仍裂；`4fbd0e0` 补的是另一条线，未解决该现象；候选修复须用户先拍板）；原计划的下一步：若装上 2.8.6 仍裂则做"显示实际请求地址"的诊断包。C 待用户发起 |

最新授权：用户明确“PUSH吧，记得记进日志，我想关闭软件的下载通道，记得我的素材不公开”。本次只推私有开发库，关闭官网入口和腾讯云APK通道，更新同一日志；不扩展为公开发布素材或新包。用户已确认手机同步恢复，不再重复要求验同一故障。

### 已完成、已关闭、暂缓或不做

- 已完成：自研账号/同步/社交主线、PocketBase退役、审计修复主线、部署准备、腾讯云首次上线、Cloudflare官网首次上线、2.8.3 APK上传；后续2.8.4同步地址修复、官网新下载/公开链接、展示库入口核账也已完成。不能再写“等买服务器”“缺Android SDK”作为当前阻塞。
- 性能反馈已关闭：2026-10-14应用交接§10记录用户确认电脑不卡、手机处理后不卡，原因是设备。README仍有旧性能自述，不能直接当当前复现的代码缺陷。
- 域名/HTTPS暂缓：用户说先这样、正式用前再处理。应用仍IP+HTTP；官网已有Pages HTTPS，二者不同。
- iOS不做；Android通知/小组件ROM差异不专项投入，遇真实故障再单点处理。
- 保持现状：多标签页设置后写覆盖、删战斗记录不回退SP。已决定，不自行重构。
- 可选未做：后端多实例共享验证码/冷却、AI真正流式、备份调度/恢复演练，未获任务不扩展。
- Figma 接入暂缓（2026-10-15 用户「先了解，暂不接」）：已核查——本机 Figma 桌面版 126.10.10 已安装且正在运行，但官方 Dev Mode MCP 服务未启用（实测 `127.0.0.1:3845` 连接失败），该功能需付费席位。三条可选路径已说明：①官方 Dev Mode MCP（读当前选中节点，亦可反向写回画布）；②个人只读令牌走 REST API（凭据只临时用、不入库不记录）；③零配置手动（导出图片或贴 Dev Mode 代码片段）。将来要接须用户明确要求；接入前先确认范围是否触及受保护的现有界面，建议只用于新增页面/模块。
- 旧GitHub CLI下载线已放弃，残留不是新安装任务，不擅删或继续安装。
- 旧官网交接只到b60c1b6，后来已整站重构和发布；不照旧视觉待办直接改当前官网。

## 7. 踩坑与失败：根因、修法、不要重走的路

| 领域 | 问题与根因 | 后续办法 / 证据 |
|---|---|---|
| 状态恢复 | 漏查官网外部发布，错写未部署；Git也不记外部上传 | 每次部署即更新发布表，分别核URL/版本/Git；本次纠正见§9 |
| 旧交接 | 计划前面写完成，后面还写全部未开始、缺SDK/服务器 | 当前摘要保持现行，历史注明被取代，不能按旧标题决策 |
| 好友链路 | 接口/路由/登录态/映射四层不一致，单测绿但实际断；Promise.all单源失败拖垮全页 | 放开入口前列完整下游，统一认证，双账号接口+浏览器模块验证；0b0211c、旧交接§十八 |
| 错误码 | sendError进入/error再次经过security，把404盖成401 | Advice直接写ResponseEntity，不把所有401当登录失效；旧交接§十六 |
| 通知静默失败 | 表漏updated，异常被catch吞，业务成功但通知没落库 | V3、566f866；查实际落库/接收，不只查操作返回 |
| UserID | 设置仍查旧登录源，各入口校验不一致 | 7577e8a、21fc633；注册/修改/资料映射一起查 |
| 同步 | 缺片/坏JSON当空表、时间混比、换号旧响应写库、落盘/隐私删除失败仍报成功 | a0780c3：完整快照/统一时间/会话代次，失败不覆盖、不报成功 |
| 任务奖励 | 并发重复领奖、先完成后奖励失败造成半完成 | bf1db8e：同事务判重结算，跨标签页不用单窗口内存锁 |
| 备份回滚 | 保留onlineCardFaces又bulkAdd同主键，撞库且界面未重载 | 97b6ad4：共用KEEP_WITH_IMAGES_TABLES，重载与回滚分开；当时模拟验证，勿声称真机复现 |
| 备份日期 | 追问/黑猫记忆Date还原漏项，字符串导致去重失败 | ce08545、importRestore.test.ts；按字段核导入导出 |
| 测试污染 | 集成测试曾写应用库、固定用户名重跑冲突 | bab3f52、isolated与随机固件；开跑先核目标库，旧清理不授权重跑 |
| 数据清理险情 | 旧FIND_IN_SET方案列表误带引号，可能误删，审查拦下后修正 | 只读核集合、备份、明确批准；旧脚本仅作证据，不重跑 |
| AI代理 | 无服务端Key白撞502、模型401误译、流式/语音/余额遗漏回退 | 45c5829→0ca4b97→1140e56→6b2e060→7bd96fd→7296918→fe4c45c；按能力和错误分流，不新增开关或统一供应Key |
| Kitool | WebView跨域拒绝，模型列表没切原生请求 | 94557a7：失败后原生兜底；网页/原生验证不能互相代证，待真机反馈 |
| AI错误体 | 手拼JSON非法，解析异常掩盖真错 | 17150ca用Jackson；保留原HTTP错误 |
| 归属/OTP | 羁绊之影越权、验证码并发消费两次 | 87d2d92，归属校验/原子消费，不用真用户验证 |
| 改密/重置 | 自研登录仍走PB、旧会话不失效、重置记录随重启丢失 | 6f38591、17f2cb2、f8f8baf、99acdda；V13落库，冷却/邮箱验证码仍在内存 |
| Android图标 | 前台切launcher alias导致系统终止，诊断又误判用户清理后台 | d4b6b34后台切，0c9a108排除正常退出，38000a4撤临时弹窗；不重加诊断UI |
| 音效 | mp3在仓库根目录，Vite不打进dist，线上静默 | 662c7da放public；公开库另有素材不分发规则；构建成功不代表声音存在 |
| 图标/斜边 | 泛洪去黑伤内部，clip-path裁断边框，肉眼估宽错误 | Java几何圆角处理，内边带和像素测量，1bed535；历史修复不等于新视觉授权 |
| 本地官网 | file://下字体策略引起排版差异，旧文档称双击HTML足够已过时 | node site/serve.mjs或打开官网.bat；不默认替用户开浏览器 |
| 字体/截图 | 黄频道衬线闪动、过早截图只见开屏、画质低误判字体 | 02123b7预热，等演出结束查document.fonts/尺寸，不只目视 |
| 同源官网 | App的PWA兜底抢/intro/，200仍是应用 | 实际采用独立Pages，不能覆盖App根或擅改sw.js |
| CDP | React未挂载白屏、连错扩展页、HMR的?t=造成双模块实例 | 按URL精确选tab，等挂载；导入页面真实模块URL，探针问题不当产品Bug |
| Vitest | Vite5中文路径和@别名、mock漏分流判据测错分支 | 沿用现有配置，升级先核兼容，核Controller参数和mock条件 |
| Maven | PowerShell参数被cmd吞掉，误找C:\.m2 | backend下使用 mvn -o "-Dmaven.repo.local=C:\Users\Lqx24\.m2\repository" test，复用既有缓存，不迁系统目录 |
| 工具限制 | 旧沙箱.git只读、approval异常、浏览器启动受限 | 这是历史环境；当前不能传sandbox_permissions，按实际工具处理，不照旧强行提权 |
| Markdown | *.md忽略导致规则/交接仅留本机 | 状态已豁免；本次将两份规则限定纳入私有库，不整份复制公开库 |
| 历史敏感信息 | 早期启动脚本误入库邮箱授权信息，后来移除，旧历史可能残留 | 1126c5e；不复录原值，不说私有就风险归零；轮换/重写历史另授权 |

## 8. 运行与验证入口

- 前端 `npm test`、`npm run typecheck`；应用 `npm run dev`。官网 `node site/serve.mjs` → `http://127.0.0.1:8123/`，不能假设服务已在跑。
- 验构建用独立outDir，核VITE_API_URL；不为文档检查覆盖现有dist。
- 后端开跑先核isolated目标persona_terminal_test；backend下用上述Maven命令。缺环境只按约定读取本机环境/注册表且不回显凭据。
- Android历史JDK `.rivet/jdk/jdk-17.0.12+7`、SDK `.rivet/android-sdk`、缓存 `.rivet/gradle-home`；已有构建产物，但新构建前仍核实际路径/变量，旧PID不是现行事实。
- 缓存/临时材料优先E盘现有目录；不改系统TEMP、不搬AppData，不承诺工具自动记录全能迁到E盘。
- 模拟网络/SMTP失败日志可能是测试预期，以命令最终结果和断言为准；接口、构建、浏览器、设备、收费AI、用户体验分别记。纯文档无需为了数字重跑全套。

## 9. 按时间的项目历程

### 2026-10-12：导入、Java骨架、登录、品牌

a852d9c导入上游并保留GPL/NOTICE；179550a修启动编码；c9217ae整合monorepo、后端和毕设策划。79171bd建立JWT请求与认证切换，后续接邮箱验证码/自动注册。1034e34修音效缺失。3433b3c做图标透明处理，10889a5正式更名MASKARIA，a709fb5主题与软件图标联动。早期7项测试和移动端未验只是当时状态。

### 2026-10-13：同步、头像、社交迁移、AI与安全

- a11f1e3建立/api/sync/rows；f018b60/efbd43e前端数据面，06600fa档案，f4a7010/54c830c头像，92c61a2引入Flyway及集成测试。
- c5fae5f合规说明；1126c5e移除误入库授权信息，只记录事件，不复录原值。
- 8765316/df41731接AI代理、语音/余额；期间曾加开关，后来69d2634/ba703f9按用户要求删除，45c5829无服务端Key自动回退。旧开关设计已被取代。
- 好友W1 9f59dbf/3237bad，0b0211c修端到端四层缺陷；通知W2 566f866修漏列/写入，7577e8a修UserID；d528e1a祈愿，feabc8f/56982db同伴，7a9475e/432b273一起进步，fb63dd2/e1df96d羁绊之影。各波次补迁移、接口、契约/后端与浏览器模块验收。
- 组织九表按909c98e/88cb36a→c730e9d→cc9671c→3764c69完成基础/公告/作战/团战；b4172be弹幕迁移。
- 用户具体授权的视觉/音效修复：1bed535斜切边框、662c7da音效及public位置、58f3c2a翻牌音、85957bd进入开屏而刷新不重放。不构成以后通用视觉授权。
- 审计D01–D23后：a0780c3同步/持久化，bf1db8e原子奖励，87d2d92归属/OTP，21fc633 UserID，7e26ffc代理契约，6f38591改密及旧会话失效，50361bb互动广播幂等/离线重试。原失败证据仍在审计目录；不能照旧报告说全部未修。

### 2026-10-14：可信测试、PB退役、备份修复、应用上线

- bab3f52隔离测试库/随机固件，终止应用库测试污染；历史测试数据清理已做且留备份，不授权再清。2bf7d37补双合成账号操作→通知→接收。
- 17150ca修AI错误JSON；17f2cb2邮件重置，f8f8baf注销；1c3c8be收敛数据源判据，dfbf735 Android后台提醒契约源码迁移。
- 896ad09/462438a部署材料；f9bccdb到8ab9f08按模块删PB兜底/SDK/mock，a0b08d4清注释，PocketBase退役完成。
- 七线复查修97b6ad4导入回滚、ce08545日期还原；99acdda重置V13落库；962b3fb小服务器内存手册，c87d753健康接口。
- 随后腾讯云实际部署nginx/Java/MySQL，应用网页和后端健康确认；Android从无SDK发展为可构建安装。9fb161b HTTP适配，c2bd26a系统栏，d4b6b34后台切图标，0c9a108排正常退出，38000a4撤临时诊断。2.8.2经历多种字母后缀测试包，不都算独立正式版。
- AI陆续修头部、模型列表、能力探测、流式分支、语音/余额回退；94bc979修开屏更名遗漏。fcd8394旧交接移本地；README/截图整理到5614c2e。
- 应用交接§10记录用户A类验收通过、性能为设备原因关闭、HTTPS/iOS等决定。旧计划“等服务器/SDK”从此不代表现状。

### 2026-10-14：官网制作与Cloudflare实际发布

- 7448f4f官网首版，8d1490d手撕边/斜贴/小车，180fab7开屏放慢，dc36116修遮挡/相纸/四步，b60c1b6文字形状；ce2d817撕边投影、4f7567e窄屏、1804d84海报重构、e64b95e整站重排、02123b7字体、8c649bb本地预览、9bf1b51字标与下载。
- 上传2.8.2i到腾讯云download；查出应用根不是营销页，/intro/有PWA接管风险。曾讨论端口/子路径等，最终实际选择Cloudflare Pages，讨论过不等于执行过。
- 原会话经Wrangler浏览器授权，新建maskaria，发布至https://maskaria.pages.dev/，固定快照2d5f4986；当时检查字体、版式、控制台并真点下载。这个外部部署漏记交接，构成后续“忘记”的关键缺口。

### 2026-10-15：Kitool与2.8.3发布

- 94557a7修WebView模型列表原生兜底；f55d8a0准备正式APK/AAB、versionCode、签名构建脚本、README和官网本地链接；上传新APK，原会话核签名与SHA-256。
- 开发库f55d8a0、展示库33f84de当时Push，本轮两远端main已核实；Cloudflare没有随之发布，官网仍旧按钮。
- 当时新增简版PROJECT_STATE并给规则加入口，但把“腾讯云没放site/”误推成“官网没部署位置”。本次保留纠错经过，不能再次照抄错误。

### 2026-10-15：本次日志恢复与维护完善

- 用户要求一个文件恢复全貌、每步历史/坑/下一步并主动更新。沿用PROJECT_STATE扩充总日志；对照旧交接、计划、Git、天枢知识与可访问项目会话，不新造平行总日志。
- 现场找回Cloudflare官网、新旧包差异、两远端与本地展示副本差异；补发布地图、操作依据、验证层次、关闭决定、技术地图和证据索引。
- 修改AGENTS/.rivet入口，要求每节点主动更新同一文件；规则纳入私有开发库，禁止同步公开库。修改前本地备份在outputs/project-log-recovery-*/。
- 仅文档/规则，没有UI、生产、用户数据、收费调用或部署。未重跑业务测试，历史数字注明来源。本次本地提交通过 `git log --oneline --grep="统一项目总日志"` 定位；未Push。
- 遗留为§6官网同步/链接和手机反馈；不可访问聊天不能保证逐句恢复。下一步由后续维护会话按授权处理并维护本文件，本次阅读无需用户操作。

### 2026-10-15：同步失败定位与2.8.4修复（源码/构建节点）

- 用户提供手机“同步失败：Failed to fetch”截图并授权修复前述待办。依debugging/testing流程先取证：线上健康200、App来源预检200、截图时段无对应同步请求；直接解包旧APK，2.8.3入口index-TG_quZCc.js指向http://localhost:8080，2.8.2i指向正确腾讯云。根因是build-release.ps1未显式设置VITE_API_URL，开发配置进入正式包；原Vite检查还错查已退役VITE_PB_URL。不是据错误文本猜测跨域或改动真实数据。
- scripts/build-release.ps1显式设置正式地址，前后验证并恢复进程环境，只同步Android以保护既有iOS改动，产物名读取package版本；新增verify-release.mjs及3项回归，拒绝本机地址、缺目标/混入本机地址的产物；Vite提示改查VITE_API_URL。版本2.8.4/code19；官网修新APK、公开库链接与测试数字。
- 验证：旧dist被新校验拒绝；Node回归3/3，npm test 32文件203项，npm run typecheck通过；正式APK/AAB构建成功，最终APK仅含正确后端地址，aapt核版本，apksigner核2.8.3/2.8.4证书SHA-256一致。APK SHA-256：4ca13223770b7e3647f4b4e66d728ef02fe1b1af16c2a11c1049a45de415cc2f。
- 已新增腾讯云/opt/maskaria/web/download/maskaria-2.8.4-release.apk，本地/上传临时文件/正式文件哈希相同；没覆盖旧包、没改nginx、应用根或后端。Cloudflare官网待发布；上一部署ID 2d5f4986-0b61-4419-a7e0-2cbf5ea5c6d1已用Wrangler核实，保留回退依据。
- 查明当前实际展示库工作区是E:/MASKARIA-showcase，HEAD33f84de且原本干净；.rivet/publish是遗留副本，不作为同步入口。已核8个公开文件基线一致再同步本次代码/发布材料，未复制项目日志、规则、官网或私有材料。公共隐私/合规文档已在33f84de树中核实存在，GitHub HTTPS本机连接失败，不冒称浏览器可达。
- 本节点本地提交见git log最新记录；尚未Push。下一步完成官网Pages发布/公网APK与按钮验证，再更新现行摘要；手机真实上传/拉取仍须用户用自己的账号验收，不擅用真实会话代测。

### 2026-10-15：2.8.4 APK与官网发布完成核验

- 私有修复提交2178a57（fix(release): 修复正式包同步地址并更新官网发布链接）；展示库4de5ff5（fix(release): 修复正式包同步地址并升级2.8.4），均未Push。私有库另有此前日志提交3c792bc尚未Push；当前远端仍为私有f55d8a0/公开33f84de。
- 腾讯云新增/opt/maskaria/web/download/maskaria-2.8.4-release.apk，未覆盖旧包。apksigner确认与2.8.3同证书，aapt确认2.8.4/code19；最终APK入口index-CY1QUEIU.js含正确http://192.144.227.216且无localhost:8080。构建日志.rivet/scratch/sync-fix-release.log；前端测试日志sync-fix-frontend-tests.log。
- Cloudflare使用现有Wrangler4.150.0，发布目录.rivet/scratch/pages-site-2.8.4，24个静态文件排除APK；发布生产main、source2178a57，快照https://ac1d998c.maskaria.pages.dev/，旧快照2d5f4986保留作为回退依据。
- 生产官网和新快照GET均200，HTML与本地完全相同，SHA-256 a29279c4acc24469bbdae690eced2ddd8592027e30bf640cfcebea5dabdd5933；两处APK均2.8.4、无persona-terminal-dev链接。源码/隐私/合规指向公开库，目标文件在展示库33f84de树中存在；GitHub HTTPS本机无法访问，未假称浏览器端验证通过。
- 线上health再次200且db/status UP。本机已完成3项发布回归、203项前端测试、类型检查、正式APK/AAB、地址/签名/版本检查；未用真实用户账号上传/拉取、不改真实数据，手机验收待用户。
- 公网完整下载首次60秒超时，保留失败事实；延长180秒重新以流式SHA-256核验成功：HTTP200、26,291,469字节，与本地/服务器哈希4ca13223770b7e3647f4b4e66d728ef02fe1b1af16c2a11c1049a45de415cc2f相同。没有把SSH哈希或HEAD代替完整下载。
- 后续由用户直接覆盖安装2.8.4（无需卸载/重置），账号与数据→立即同步到云端，预期不再Failed to fetch，再核拉取与Kitool；验收反馈到来后维护会话主动更新本日志。两库代码提交尚未Push，须用户单独批准；官网/APK发布已完成，不依赖Push。

### 2026-10-15：用户批准两库Push并核验

- 用户明确“PUSH吧”，授权本次相关提交与推送。先核两库远端/分支、差异和敏感信息模式，私有12个改动文件、公开8个文件；公开范围不含PROJECT_STATE、AGENTS、.rivet规则或site。
- 开发库git push origin main成功：f55d8a0→4e0c5dd，包含3c792bc、2178a57、4e0c5dd；展示库33f84de→4de5ff5成功。两边随后git ls-remote refs/heads/main均核实一致，展示库干净。
- 本条及现行状态回写另做本地文档提交，并按同一次Push授权同步私有origin/main；最终SHA以git log -1与ls-remote为准，不自引用猜哈希。
- 既有ios/App/Podfile、.cache/、.rivet-config.json、outputs/保留本地未上传。没有新增部署、UI或数据变更；APK/Pages仍为上轮已核的2.8.4，推送不等于用户已验收。
- 下一步：用户手机覆盖安装2.8.4后验同步/Kitool，收到反馈后维护会话更新日志；除此本次Push无需用户操作。

### 2026-10-15：手机同步恢复，用户验收通过

- 用户原话：“手机确认恢复”。据此将2.8.4手机端同步故障标记为用户验收通过，更新现行摘要并关闭同步待验收项，不再反复要求测试该故障。
- 这条反馈未单独说明Kitool模型列表、所有拉取/跨设备组合或其他功能，不扩大为全部功能通过；后续实际使用出现问题再处理。
- 仅更新PROJECT_STATE.md，无代码、UI、部署或数据改动；文档差异检查，不重跑业务测试。此前两库Push状态保持；本次验收记录另做本地commit，未获得新的Push指令，不自动推送。
- 下一步：正常使用，无需用户额外操作；维护会话收到新反馈后继续更新同一日志。

### 2026-10-15：从旧站恢复缺失牌面及原音效（本地候选2.8.5）

- 用户提供https://the-velvet.com/并要求恢复素材，随后明确“保留图标名称，音效也换恢复缺失素材”。该次授权针对素材恢复，不恢复旧名称/图标，不改变布局/主题或业务逻辑，也未授权新的Push/线上部署。
- 先核旧站首页、sw预缓存113条和68个JS/CSS资源引用，仅作为只读取证，不执行远程代码。按现行tarotArt的牌名映射展开三套22张（P5正义/力量顺序不同，按slug恢复，未按罗马数字改名）。识别清单96项：66张WebP本地缺失，26个MP3与旧站不同，4张水面/天空背景与旧站SHA-256一致。
- 从用户指定旧站取回上述素材到.rivet/scratch/asset-recovery-20261015/candidate，验证文件格式而非把SPA的200HTML当图片。FFmpeg解码全部66牌面，26个音频解码PCM哈希也全部与当前不同（不是仅文件元数据差异）。先按原哈希检查并备份26音效到同目录before/，再恢复public/tarot/{p3,p4,p5}各22张、替换public根26个音效；4背景未改。
- 牌面恢复接上既有TarotCardSVG路径，没改组件或数据。真实无头浏览器隔离临时环境加载现行组件，依次切p3/p4/p5，各22张img.decode成功，尺寸560x896；没有退回程序化卡面。截图component-p3/p4/p5.jpg及component-evidence.json留同一证据目录。卡片总览输出outputs/restored-tarot-preview.jpg；音效可试听public/tarots.mp3等。
- 验证：npm test 32文件203项通过；正式前端/Android APK+AAB构建成功（Gradle22秒）。aapt确认包名com.meinan818.personaterminal、名称MASKARIA、2.8.5/code20；apksigner证书SHA-256仍a7f0f3d95edf9947dba5512b04b86fd0faf840236b1448b7412c8b5dbe1c0567。最终APK内96个素材逐文件SHA-256与旧站清单一致；正式后端地址校验通过。
- 候选APK：outputs/maskaria-2.8.5-release.apk，SHA-256 f955e74841f3eb30fef7e41c732ca94bd1c2040a09f7f8c21ab9b0d054ec95e3；本地生成，不冒称已上传或手机验收。线上仍2.8.4，README/官网的正式版本保持2.8.4，未重新发布网站。
- 文件缺失的直接原因：源码已引用牌面，但public/tarot不在当前检出内容，.gitignore还把它排除了；这会让组件无声降级。恢复66张牌面需明确纳入私有库，公开展示库保留美术隔离，不能整仓复制素材过去；不改/删除现有许可声明。仅本机/私有恢复，公开分发仍须遵守ASSETS_LICENSE等现有约定。
- 材料证据：inventory.json保存来源路径、旧/新哈希和差异状态；audio-decoded-comparison.json保存音频内容比对；frontend-tests.log/build.log保存测试/构建。原26音效备份未删除，旧站抓取源码仅本地留存，不提交。
- 收尾仅提交本次66新图、26音效、版本配置及日志；既有iOS/缓存/outputs改动不纳入。未Push、未部署。下一步由用户查看/试听或将本地APK传到手机直接覆盖安装验效果；视觉与听觉未收到反馈前不标用户验收通过，不额外扩展任务。

### 2026-10-15：恢复中断收尾、关闭公开下载并保护素材

- 起因：上个聊天异常终止，恢复现场确认素材恢复工作已暂存；检查96文件差异及归属后提交6f7019b `feat(assets): 恢复塔罗牌面与原音效`。随后用户明确批准Push，并要求关闭软件下载通道、素材不公开。
- 私有性：`gh repo view Meinan818/persona-terminal-dev --json nameWithOwner,isPrivate`确认isPrivate=true；origin仅指向该开发库；没有Actions工作流。公开展示工作区HEAD仍4de5ff5且干净，未跟踪public/tarot或public根MP3；GitHub公开库Releases为空。本次不改、不Push公开展示库，不发布2.8.5包或素材。此检查不代表已经撤回第三方此前下载的副本。
- 官网：仅改site/index.html的两处下载按钮、相应说明和导航文字，保持现有布局/配色/动画。使用已有Wrangler4.150.0上传24个官网文件，仅1个HTML变更，不含APK/AAB及恢复素材。发布项目maskaria/main，快照https://d3ea1293.maskaria.pages.dev/，生产https://maskaria.pages.dev/；上一部署ac1d998c-306b-478d-9d63-ca27c8e76e5c留作回滚依据，回滚官网不应重新开放服务器下载。
- 腾讯云：现场核3个旧APK在/opt/maskaria/web/download/；在/etc/nginx/conf.d/maskaria.conf增加/download精确与目录阻断、APK/AAB后缀阻断，返回410；nginx -t成功后reload。原配置备份/etc/nginx/conf.d/maskaria.conf.before-close-download-20261015160126，3个文件保留。deploy/nginx-maskaria.conf模板同步规则，防止以后部署误开通道。使用旧部署专用SSH身份失败后，查原发布记录改用已授权的E盘身份成功，未读取或输出密钥正文。
- 本轮验证：公网9种路径（含目录、2.8.2i/2.8.3/2.8.4/2.8.5、查询参数及大小写后缀）各GET和HEAD，共18次全410；应用根200，/api/health为status=UP、db=UP；生产官网HTML与本地SHA-256一致。真实无头浏览器1440及390宽度下各有2处“下载已关闭”、0个安装包链接、无横向溢出。证据.rivet/scratch/downloads-closed-browser.json及downloads-closed-1440/390.jpg；未动用户浏览器。
- 本轮额外检查：npm test于16:05开始，32文件203项通过，命令exit0；npm run typecheck通过、exit0；git diff --check通过。只改静态官网文字与下载入口、nginx阻断及日志，未重建Android或重跑后端测试。
- commit/Push：素材节点6f7019b、手机验收日志e4acd86及32fb9ec `fix(download): 关闭公开安装包通道并记录素材保密约定`已成功Push至私有origin/main；git ls-remote确认32fb9eca597435293b65defcdcb3bd0a5e616d82与本地HEAD一致。本次结果回写另做文档提交并沿用同次授权推送；最终SHA用git log/ls-remote核，不自引用尚未生成的SHA。公开展示库保持4de5ff5，未Push。既有ios/App/Podfile、缓存、.rivet-config.json、outputs不纳入。
- 遗留与负责人：素材视觉/听觉仍待用户自愿体验本地2.8.5，不能写已验收；公开下载关闭由Codex验证完成，本次无需用户操作。没有新增外观设计，未改业务、数据或应用网页产物；已安装客户端可继续使用。本轮不把旧测试数字冒称重跑结果。

### 2026-10-15：素材视觉/听觉用户验收通过

- 用户原话「验收通过」。按上一轮推荐项解读，验收对象是本地素材恢复候选2.8.5的66张塔罗牌面与26个音效的视觉/听觉体验；据此把此前「素材视觉/听觉待用户体验」标记为用户验收通过。若用户所指另有范围，以用户后续说明为准并纠正本节。
- 验收边界：只覆盖素材本身。不含2.8.5发布上线、下载通道重开或任何线上/代码变更。用户此前「素材不公开、关闭下载」的要求继续有效，重新开放下载须用户明确要求；公开展示库仍不得含这些素材。
- 本轮改动：仅更新PROJECT_STATE.md（摘要、发布表、活跃事项、本节点）。无代码、素材、UI、部署或数据改动；因无代码改动不重跑业务测试，也不把历史测试数字冒称本轮通过。
- commit/Push：本节点随本次文档提交进入私有开发库；未获新的Push指令，不推送。
- 遗留与负责人：无待用户操作项。如用户希望发布2.8.5或重开下载，须由用户明确提出后再单独规划；如需推送本次文档提交，由用户批准后执行。

### 2026-10-15：手机端卡顿与音画不同步诊断（只读，未改代码）

- 起因：用户反馈手机（2.8.5）「音画不同步、卡卡的」，补充「整体一直卡顿，偶尔卡顿，有的时候点了过一会才响应」。用户先选「先定位卡顿」，诊断完成后选「先不动，先记录归档」。
- 音效侧（ffprobe 逐文件对比 `.rivet/scratch/asset-recovery-20261015/before/` 与 `public/*.mp3` 全部 26 个）：恢复的原版音效普遍比 2.8.4 旧音效长 7～13 倍——ok 0.20→2.68s、themea-level 0.19→1.46s、themeb-level 0.09→2.42s、themec-level 0.20→2.25s、ui-menu 0.21→1.33s、battle-summon 0.30→3.35s、battle-impact 0.34→3.04s、battle-fanfare 0.29→3.08s；少数变短（tarots 0.60→0.32、themea-switch 0.55→0.29、themeb-switch 1.79→0.50）。`src/utils/feedback.ts` 每次触发新建 BufferSource、不打断上一实例 → 短动画（0.2～0.45s）配长音效、连点叠播，是「音画不同步」的直接解释。未做真机听感验证。
- 渲染侧（CDP 实测：本机 `dist/`=2.8.5 产物 + Chrome 6x CPU 降速）：首屏一次 654ms 长任务；点「客人模式」408ms 长任务；该次点击后 4 秒拆解为样式重算 1613ms / JS 执行 655ms / 布局 15ms（样式重算 319 次）。
- **自我纠正（重要）**：先前判断「欢迎页 37 个 JS 动画是主因、改成 CSS 即可」被自己的对照实验推翻——关掉全部 CSS 动画后重算次数不变（539→539）；主界面（6 个动画）与欢迎页（40 个动画）每帧重算次数几乎相同（541 vs 539）；空白页对照为 0；手动取消 JS 动画后负载几乎不变（334→293ms）。结论：每帧重算与「动画数量/驱动方式」无关，该方向不成立，勿再照此改。
- 真凶定位（MutationObserver 属性监听，主界面空闲 3 秒 241 次属性写入）：① **185 次（约 61 次/秒）重写 SVG `<path>` 的 d 属性** = `src/components/p3r/kit.tsx:144` 的 `TitleTri`（`wobble` 逐帧「顶点沸腾」，rAF 60fps 直写 d；该处注释自述已做 12 轮优化：顶点量化 0.5 单位、d 不变不写、移出视口停、独立合成层、D0 不启动）；② 56 次（约 19 次/秒）改 `DIV.sl-stack-tween` 的 style（`StackCarousel`）。
- 负载对比（本机无降速）：主界面空闲 3 秒 TaskDuration 399ms、脚本 35ms、每帧布局约 60 次；欢迎页 754ms / 119ms。桌面已占 13%～25% 主线程，手机按 CPU 差距放大，与用户主诉一致。
- 已排除（均有实测）：音效实现本身（Web Audio + 解码缓存 + LRU + 预加载 + 限幅总线）；eruda（仅 `?debug=1` 加载，已在 SW 预缓存中排除）；同步 localStorage 写入（无此模式）；卡面渲染（img loading=lazy + decoding=async）；素材预加载（启动不加载）。另记：2.8.5 包比 2.8.4 大 4.1MB（26.3→30.4MB，即 66 张牌面）；主包 1.15MB、CSS 300KB、页面 chunk 100～400KB。
- 候选方案（均未实施，按「是否动观感」分档）：第一档——三角沸腾 60fps→30fps（幅度形状不变）；第二档——查「低帧率永久降级」为何未在用户机上生效；第三档——StackCarousel 每帧 style；音效侧——同一音效叠播打断/节流，或高频短反馈音换回短音效。
- 证据与边界：测量脚本 `.rivet/scratch/cdp-probe.mjs`（一次性 CDP 探针，留作证据）；数据来自本机 Chrome，headed 与 headless 两种模式交叉一致，**非用户真机**；未改任何项目代码、未部署。
- 遗留与负责人：等用户挑档后动手；动手前须先确认该档是否改变观感（视觉/听觉/手感由用户验收）。

### 2026-10-16：粉主题单独换新塔罗素材（源码已提交，未打包）

- 起因：用户提供新私人素材 `D:\文档\塔罗\粉色塔罗`，要求「替换到粉色主题那套」。核查发现粉主题在频道层就是 p3（`src\ui\channel.ts:25`，blue/pink 同频道、粉是 P3 的换色皮），与蓝主题共用 `public\tarot\p3`——直接覆盖会连蓝主题一起变。用户明确选择「只给粉色主题换新塔罗，蓝色主题保持原样」。
- 改动：① 新建 `public\tarot\pink\` 22 张 560×896 webp（ffmpeg 缩放，quality 85，共约 1.6 MB）；② `src\constants\tarotArt.ts`——TarotArtSet 增 `'pink'`、新增 CustomTarotSet（自定义主题仍只挑蓝/黄/红三套）、`tarotSetOf` 增第三参 theme；③ `src\ui\useTarotArtSet.ts`——读 `useAppStore(s => s.user?.theme)` 并传入（只看 channel 分不开 blue/pink，同类坑见 `src\utils\iconSync.ts`）；④ 新增 `src\constants\__tests__\tarotArt.test.ts` 7 项。`vite.config.ts` 不用改：PWA runtimeCaching 按 `/tarot/` 前缀匹配，新目录自动收编。commit `90bdc93`（3 文件）。
- 验证证据：素材与源图逐张缩放对比，像素差异 0.03%–0.35%（tower/empress/justice/fool/world 五张，ui_diff）；22 张平均色全为粉紫色系、无空白图；抽查五张牌面与文件名一致（justice 印 XI，Rider-Waite 序，与 P3/P4 同体系，无 P5 那套 Thoth 序的编号冲突）；`npx vitest run src/constants/__tests__/tarotArt.test.ts` → 7 passed；`npm run typecheck` → exit 0；`npx vitest run` → 33 文件 / 210 项 passed、exit 0；`npm run build` → exit 0，`dist\tarot\pink\` 22 张且字节数与源一致；dev server 下 `GET /tarot/pink/fool.webp` → 200（79060 bytes）、`GET /tarot/p3/fool.webp` → 200（41630 bytes，旧图未动）。
- 边界（未验证）：未在登录态真实渲染复验「粉主题切换后卡面真的换套」——headless 打开 dev server 时应用停在启动页（`data-theme`/`data-ui-channel` 均为 null、body 仅 73 字符），拿不到真实渲染。该行为目前只有纯函数单测 + 类型检查覆盖。视觉美观须用户验收。
- 交付门降级说明：`deliver_task` 对本次新增测试文件报「未生成可采证批命令 / runner 未适配」，无法采证（该文件隔离单跑 7 passed 全绿）；改为在仓库根做点名文件的限定提交（`git add` 三个文件，未用 `-A`）。
- 遗留：源码未构建进 APK；手机端要看效果须重新构建（构建时 `cap sync` 会把 `public\tarot\pink\` 复制进 `android\...\assets\public\tarot\`）。一次性探针留在 `.rivet\scratch\pink-tarot\`（不入库，待清理）。对照图在 `outputs\pink-tarot-preview\`（4 组新旧并排 + 22 张全景）。

### 2026-10-16：线上网页端塔罗全缺的诊断（未修，待授权）

- 现象：用户报告「网页端所有塔罗牌都不正常显示」，截图显示线上 `http://192.144.227.216/`（红主题下）「月亮」牌显示程序化占位卡面（白底黑框红星），不是实拍图。
- 根因（实测）：线上服务器的静态目录里**没有 `tarot` 目录**。`curl http://192.144.227.216/tarot/{p3,p4,p5,pink}/moon.webp` 四套全部返回 `HTTP 200` 但内容类型 `text/html`、5379 字节——服务器把 SPA 的 index.html 当图片返回；`/tarot/`、`/tarot/p5/` 同样返回 text/html。对照同一台服务器：`fonts/noto-sc-black.v2.css`、`assets/index-DOkhOxrP.css` 都是 text/css，`icon.png` 是 28584B image/png → **只有 tarot 这一块缺失**。浏览器把 HTML 当图片解码失败 → TarotCardSVG 走兜底程序化卡面。
- **与 2026-10-16 粉主题改动无关**：线上入口是 `index-BCuXre6P.js`（1,153,004 B），本地本轮构建产物是 `index-CL4Kx__z.js`（1,153,176 B），两者不同；线上 bundle 内 `grep -c 'tarot/pink'` = 0，不含本次新逻辑。且蓝/黄/红三套（本次未改动）同样缺图——问题不在某套图，而在「塔罗素材整体没上传到服务器」。
- 为什么手机端看着正常：APK 打包时会把 `public/tarot/` 一并打进安装包，手机端图是随包自带的；网页端的图要单独放服务器，那一份没有。
- 历史：本文件 §9「2026-10-15：从旧站恢复缺失牌面及原音效」已发现过同类问题，当时只做了本地候选恢复、未修线上 → 本次属同一族缺陷复发。
- 待修（需用户授权，属生产服务器操作）：把本地 `public/tarot/` 四套共 88 张 webp（合计 5.5 MB：p3 1.1M / p4 1.2M / p5 1.7M / pink 1.6M）上传到线上应用目录（历史路径 `/opt/maskaria/web/tarot/`），上传后以 `curl -I` 复核返回 `image/webp`，并在网页端确认卡面恢复为实拍图。
- 本次诊断未改任何代码、未动服务器、未上传任何文件。
- **修复（同日，用户授权后执行）**：经用户明确指示「去服务器更新」并给出密钥目录，用 `E:\秘钥\xiangmu.pem` 对应的 `ubuntu@192.144.227.216` 账号，把本地 `public/tarot/` 整目录（四套共 88 张 webp，5.5 MB）以 tar 流上传到 `/opt/maskaria/web/tarot/`。该目录原先不存在，本次属**新增**，未覆盖任何既有文件；落地属主权限 `ubuntu:ubuntu 755`（nginx 只需读）。外部独立复核：`curl http://192.144.227.216/tarot/{p3,p4,p5,pink}/moon.webp` 四套全部 `HTTP 200` + `image/webp`，且字节数与本地逐一致（p3 42660 / p4 38806 / p5 71828 / pink 52840）。
- **本次修复的遗留**：线上代码仍是旧构建（入口 `index-BCuXre6P.js`，不含本次粉主题逻辑），所以**线上粉主题依旧显示蓝色那套水下卡**——图片已就位但代码不会去请求它。要让线上粉主题也用新素材，须另行把新代码部署上线（未做、未获授权）。用户需刷新网页确认卡面恢复。
- **根因补全（同日第二次定位）**：素材补传后用户截图仍显示占位卡。查 `vite.config.ts` 的 PWA `runtimeCaching`——`/tarot/` 规则是 `CacheFirst` + `cacheableResponse.statuses:[0,200]`，把 nginx `try_files` 兜底返回的 200 HTML **当成图片缓存了 180 天**；CacheFirst 直接命中缓存、根本不发网络请求，所以补传素材在老浏览器上完全不生效。用干净 profile 的无头浏览器实测线上四套 `new Image()` 全部 `OK 560x896`，证明服务器侧无问题、瓶颈纯在客户端缓存。
- **部署（同日，用户指令「把新代码部署到服务器」后执行）**：① `vite.config.ts` 的 tarot 缓存桶 `tarot-art-v1` → `tarot-art-v2`（弃用被 HTML 污染的缓存桶，注释写明缘由）；② 以 `VITE_API_URL=http://192.144.227.216` 构建——与线上既有构建同值（也与 `scripts/build-release.ps1` 默认值一致），防烤入 `.env.local` 的 `localhost:8080`；③ 产物自检：入口 `index-BZ82oxmb.js` 中 `localhost:8080` = 0、正式地址 = 1，`dist/sw.js` 内为 `tarot-art-v2`；④ 先备份线上现状到 `/home/ubuntu/maskaria-backups/web-20261016-033557.tgz`（20,744,124 B / 235 条，含当时入口 `index-BCuXre6P.js` 作回滚依据），再以 tar 流上传 dist（排除 tarot，线上已有）到 `/opt/maskaria/web/`。
- **部署后线上核验（全部外部 curl）**：首页引用的入口已变为 `/assets/index-BZ82oxmb.js`；新入口内正式地址 = 1、localhost = 0（1,153,177 B）；四套塔罗图均 `200 image/webp`（p3 42660 / p4 38806 / p5 71828 / pink 52840，与本地逐一致）；`/api/health` → `{"status":"UP","db":"UP"}`；`index.html` 与 `sw.js` 时间戳更新为 03:35。tar 在设置目录属主/时间戳时报 `Operation not permitted`（目录属主是 maskaria、不是 ubuntu），**不影响文件内容写入**，已由上述外部 curl 独立证实。
- **用户侧待确认（未验证）**：浏览器须经 SW 更新链（`registerType:'prompt'`，页面会弹「有新版本可用」）拿到新版本后，塔罗才会重新走网络取图；未在用户浏览器实测。若依旧显示占位卡，需清一次该站点的站点数据。
- **用户确认恢复（2026-10-16）**：用户反馈「羁绊页恢复了」。至此本次塔罗事故完整闭环——链路为：服务器缺 `public/tarot` → nginx `try_files` 把 `/tarot/*.webp` 兜底成 200 的 HTML → PWA 规则 `CacheFirst` + `cacheableResponse.statuses:[0,200]` 把该 HTML 当图片缓存 180 天且不再发网络请求 → 补传素材后老浏览器仍显示程序化占位卡。修复分三层：① 补传四套素材到服务器；② 缓存桶 `tarot-art-v1`→`v2` 弃用污染缓存；③ 部署新代码（入口 `index-BZ82oxmb.js`）。用户端残留的 `tarot-art-v1` 桶经手动清理后恢复。
- **同族缺陷线索（供后续排查参考）**：「星象页正常但羁绊页异常」这种**同一组件、不同页面表现不一致**的现象，本质是**组件实例级的 `failedSrc` 状态**（`TarotCardSVG.tsx`：图片失败一次即永久记住该 URL、不再重试）+ **缓存按 URL 粒度命中**（哪些 URL 曾被请求过就只坏哪些）。判断时看"该 URL 之前有没有被加载过"，而不是看"组件或页面有没有坏"。

### 2026-10-16：用户新报三个待修缺陷（用户要求先不修，仅记录）

1. **手机端组织页五角星上方的小头像显示失败**，电脑端正常（用户原话：「手机端组织里面的那个五角星上方的头像显示失败，电脑端就可以正常显示」）。疑点在组织页据点区的头像位（`src\components\org\HideoutMap.tsx` 一带），未取证。
2. **平板端安装软件后图标显示不全**（用户原话：「平板端安装软件后图标显示不全」），未取证。
3. **鸿蒙平板上手动记账完成后字体显示不全**，其他设备正常（用户原话：「鸿蒙平板自己手动记账完之后这个字体显示不全其他设备没问题」；截图显示「记账完成 / TODAY / -¥18.70 · 午饭」字样部分缺失），未取证。
- 三条均未复现、未取证、未改代码；按用户要求暂不修，待用户发起。

### 2026-10-16：粉主题卡背改为专属品红四角星（用户已验收）

- 起因：用户提供卡背参考图（品红底 + 白色四角星 + 圆环 + 白细框），要求把粉主题抽卡界面的卡背换成这张，并担心「尺寸可能不对」。
- 核查：`CardBack.tsx` 原有 p5 / p4 / p3 / neutral 四个分支，**全是程序化矢量 SVG**（不是图片）；粉主题在频道层就是 p3（`ui/channel.ts`），所以翻牌前借用的是**蓝色星盘卡背**。消费方共 10 处（DailyDraw 2 / FateGlimpse 1 / LongReadingFlow 6 / ShuffleAnim 1），全在占卜流程内。
- 改动：① 新增 `src\components\astrology\backSkin.ts` —— `backSkinOf(channel, theme)` 纯映射（必须认 user.theme 才分得开 blue/pink，同类坑见 `utils/iconSync.ts`）；单独成文件是为了让单测不连带拉起 store/Dexie。② `CardBack.tsx` 新增粉主题分支（品红渐变底 + 白色细长四角星 + 双环 + 白细框 + 四角斜切 + 两处小闪光 + 左上小圆圈），判定从 `channel ===` 改为 `skin ===`。③ 新增 `src\components\astrology\__tests__\cardBack.test.ts` 4 项。commit `883eb38`。
- 方案取舍：用**矢量复刻**而非塞入用户的原图文件——任意尺寸不糊（直接回应「尺寸不对」），且不引入图片加载失败/缓存桶一类风险（当天刚踩过 `tarot-art` 缓存的坑）。底色与渐变由目测取值，与原稿可能有细微出入。
- 验证证据：`npx vitest run src/components/astrology/__tests__/cardBack.test.ts` → 4 passed；`npm run typecheck` → exit 0；`npx vitest run` → 34 文件 / 214 项 passed、exit 0；多尺寸渲染核对（40 / 88 / 126 / 170 px 四档均清晰），产物 `outputs\pink-tarot-preview\cardback-sizes.html`。
- 边界（已如实交付）：无头浏览器走首次引导时被「上次打开没走完」的恢复模式拦住（要求登录云端或导入备份），**进不到抽卡界面**，因此本轮没有应用内真实渲染截图，交给用户的是自包含预览页。
- **用户验收（同日）**：用户本地登录后目视确认「已经改好了」——卡背视觉验收通过。

### 2026-10-16：卡背上线 + APK 重打包 + 图片失败退避重试（用户按序授权的四件事）

- **① 卡背部署到线上**：以 `VITE_API_URL=http://192.144.227.216` 重新构建（新入口 `index-bSmY4YbN.js`），先备份线上到 `/home/ubuntu/maskaria-backups/web-20261016-040418.tgz`（21,950,355 B），再 tar 流上传（排除 tarot）。线上核验：首页引用新入口；**卡背代码所在的星象分包 `Astrology-ChJdHCoK.js` 与本地 md5 完全一致**（`16a1ed87bb9e3ec2f9e34a132ceeed85`，含 `pink-back-bg` 标记）；缓存桶仍为 `tarot-art-v2`（**未重置**，不触发客户端缓存失效）；四套塔罗图 200 image/webp；`/api/health` UP。
- **② 重新打包 APK**：`scripts/build-release.ps1` **执行失败**——PowerShell 5.1 按 GBK 读取 UTF-8 无 BOM 的脚本，中文注释被解码成乱码吃掉引号，**解析阶段即 ParserError**（一条命令都没执行，`dist/` 与产物未受影响）；本机无 `pwsh`。改为**手动执行等价步骤**：`npx cap sync android` → `cd android && ./gradlew.bat assembleRelease bundleRelease`（BUILD SUCCESSFUL in 3m 4s）→ 复制产物到 `outputs/`。新 APK 32,024,256 B（旧 30,445,504）、AAB 31,826,041 B；旧产物先留底为 `*.before-cardback-20261016`。**决定性验证**：`unzip -p` 解开 APK 取 `assets/public/assets/Astrology-ChJdHCoK.js` 命中 `pink-back-bg`，且包内 `assets/public/tarot/pink/` 有 22 张。
- **③ 清理临时文件**：删除 `.rivet/scratch/pink-tarot/`（本次排查自建），保留 `outputs/pink-tarot-preview/` 对照图；scratch 下其他历史文件未动。
- **④ 图片加载失败加固**（commit `9cb01bf`）：`tarotArt.ts` 新增 `ART_RETRY_DELAYS_MS` / `nextArtRetryDelay`（5s / 15s / 45s 三次，用尽即停）；`TarotCardSVG.tsx` 失败后按节奏清除 `failedSrc` 重试、`onLoad` 重置计数。验证：tarotArt 单测 11 passed、typecheck exit 0、全量 34 文件 218 项 passed。
- **遗留**：第 ④ 项**尚未部署到线上**（线上仍是旧代码，加固未生效）；本轮重打的 APK 也**不含**该加固（但对 APK 意义有限——包内图片是本地打包的、不依赖服务器）。`build-release.ps1` 的编码缺陷仍在（未修），下次打包仍需手动执行，或先给脚本加 BOM / 改用 pwsh。

### 2026-10-16（续）：加固上线的部署 + 打包脚本编码修复

- **加固部署到线上**（用户「你进行你的」后执行）：以 `VITE_API_URL=http://192.144.227.216` 重建（新入口 `index-DYndqtMl.js`），先备份线上到 `/home/ubuntu/maskaria-backups/web-20261016-041636.tgz`（22,978,640 B），再 tar 流上传。核验：首页引用新入口；**加固代码所在的星象分包由 `Astrology-ChJdHCoK.js` 变为 `Astrology-BjlH4v2b.js`**，且线上与本地 md5 完全一致（`ffa1be6d332b3a3067cea9b2cf875a46`）——这是"退避重试确实上线"的逐字节证据；缓存桶仍 `tarot-art-v2`；四套塔罗图 200 image/webp；`/api/health` UP。至此 2026-10-16 的第 ④ 项加固**已在生产生效**。
- **打包脚本编码缺陷已修**（commit `584bf7c`）：根因是 `scripts/build-release.ps1` 存为 UTF-8 无 BOM，而 Windows PowerShell 5.1 按 GBK 读，中文注释解码成乱码吃掉引号 → `ParserError`（本次手动打包时就是这么失败的）。加 UTF-8 BOM 后 `ParserFile` 零错误、中文可正确读出。本机无 `pwsh`，故采用 BOM 方案而非换 PowerShell 版本。**下次打包可恢复直接跑脚本**（未再实跑验证，仅静态解析通过）。
- **残留**：线上 `assets/` 下留有历史分包（`Astrology-ChJdHCoK.js` 等），无害；本轮重打的 APK **不含**退避重试（对 APK 影响有限，包内图片为本地自带）。

### 2026-10-16（续）：Push 到私有开发库

- 用户指令「Push」后执行：`git push origin main` → `5983b00..1834c7e`（15 个提交，覆盖本日全部塔罗/卡背/加固/脚本修复与日志）。
- **独立核验**（不取信 push 自身输出）：`git ls-remote origin main` = `1834c7e5e69aea97f41e6c4146f80f6816c66f95`，与本地 `git rev-parse HEAD` 完全一致。
- 目标库：`git@github.com:Meinan818/persona-terminal-dev.git`（私有）。**公开展示库未动**——本次改动含项目日志与素材相关约定，按既定规则不同步公开库。
- 未使用 `--force`；远端此前无分叉，为快进推送。

### 2026-10-16（续）：缺陷 A —— 鸿蒙平板「记账完成」字体显示不全（已定位并修复）

- 现象：用户鸿蒙平板手动记账后，弹出的「记账完成」标题显示不全；其他设备正常。
- 定位：「记账完成」由 `TodoCompleteModal.tsx` 的 `BandCutInP3` 渲染（`LedgerSavedModal` 按频道分发）。标题 span 用 `WebkitTextStroke:'5px #ffffff'` + `paintOrder:'stroke fill'` 把白描边垫在字底下。
- 根因：`paint-order` 是较新的 CSS 特性，部分鸿蒙设备 WebView 不支持；不支持时描边按默认顺序画在填充**之上**，5px 白边把笔画糊掉 —— 即用户看到的「显示不全」。**已排除字体缺字**：脚本解析字体 CSS 的 9068 个 unicode-range，「记账完成」四字均在 Noto Sans SC 黑体子集内。
- **本地复现**（决定性）：自包含对照页 `outputs/pink-tarot-preview/ledger-font-repro.html` —— 去掉 `paint-order` 的那行字被白边糊掉，与用户描述吻合。
- 修复（commit `7c33d43`）：改为**两层叠字**——底层 span 只画白描边（`absolute inset-0`）、上层只画填充（`relative`），先后由 DOM 层级决定，不依赖 `paint-order`。对照验证页 `outputs/pink-tarot-preview/ledger-font-fixed.html`：新结构在不支持该属性时仍清晰。
- 验证：typecheck exit 0、全量 34 文件 218 项 passed。**鸿蒙真机未验证**（无该设备），依据为本地复现 + 对照；该修复需重新部署网页端 / 重打 APK 才能到达设备。
- 同族风险（未修，用户未报）：项目内 `paintOrder` 仍有 9 处。其中 `p4r/cutins.tsx`、`p5r/kit.tsx` 用的是 **SVG 呈现属性**（支持早，风险低）；`AchievementUnlockModal.tsx`、`CallingCardCutIn.tsx` 与本次同为 **CSS 属性**（同源风险）。暂不扩大改动。
- **缺陷 B/C 状态**：B 已定位到 `src/components/org/HideoutMap.tsx` 的 `SeatPin`（232 行，`avatarUrl` 走 `<img loading="lazy" className="absolute inset-[2px] …">`，按频道分别加 `clipPath`/圆角），但「手机端失败、电脑端正常」的具体表现未经用户确认，尚不能定根因；C（平板安装后图标不全）未开始。

### 2026-10-16（续）：A/B 修复部署上线 + 重打 APK + Push（用户指令「1和2＆3」）

- **① 重打 APK**：`npx cap sync android` → `cd android && ./gradlew.bat assembleRelease bundleRelease`（BUILD SUCCESSFUL in 20s）。产物 `outputs\maskaria-2.8.5-release.apk`（32,024,486 B）/ `maskaria-2.8.5-release.aab`（31,826,262 B）；上一版留底为 `*.before-abfix-20261016`。核验：APK 内含本次构建的星象分包 `Astrology-BlGOEOCe.js`（证明包体来自本次 dist）。
- **② 部署网页端**：以 `VITE_API_URL=http://192.144.227.216` 重建（新入口 `index-CxeScLxs.js`），先备份线上到 `/home/ubuntu/maskaria-backups/web-20261016-043553.tgz`，再 tar 流上传。核验：线上首页已引用新入口；星象分包 `Astrology-BlGOEOCe.js` 线上与本地 **md5 一致**。
- **③ Push**：`git push origin main` → `8a03c54..6661229`（3 个提交：`7c33d43` 记账字体、`f629ed7` 日志、`6661229` 头像地址解析）。
- **待用户真机验收**：缺陷 A（鸿蒙平板记账字体）与 B（手机端头像图裂）——两者都需安装本次新 APK 才能验；本机无鸿蒙设备与手机，**不得声称已验证**。缺陷 C（平板图标）仍未开始。

### 2026-10-16（续）：缺陷 B 的追查 —— 代码/配置全部核实无误，改版本号重打包

- **用户反馈**：手机**浏览器**打开网页端头像正常，**只有 APP 里**裂（图二是红主题 APP，五角星上方是图裂图标；图一是网页端，真人头像正常）。
- **本轮实测（全部通过，但现象未复现改善）**：
  - APK 主 bundle 内 `const Ue="http://192.144.227.216".trim().replace(/\/+$/,"")` —— `apiBaseUrl` **有值**；
  - 星象/组织分包内头像那行编译为 `src: nt(n)` —— **新加的补全函数确实被调用**（`Hintout-fTVWh3MO.js`）；
  - APK 内 `capacitor.config.json` 含 `"android": { "allowMixedContent": true }`；Manifest 含 `usesCleartextTraffic="true"`。
  - 即：**代码路径、构建产物、原生配置三项都正确**，但用户端仍裂 → 剩下的可能性发生在设备/安装环节，非本机可验证。
- **处置（用户选择"换版本号重打"）**：`versionCode 20 → 21`、`versionName "2.8.5" → "2.8.6"`（同步 `android/app/build.gradle` 与 `package.json`）。重跑 `npm run build`（正式地址）→ `cap sync` → `gradlew assembleRelease bundleRelease`（BUILD SUCCESSFUL in 37s）。
- **产物与核验**：`outputs\maskaria-2.8.6-release.apk`（32,024,575 B）/ `maskaria-2.8.6-release.aab`（31,826,323 B）。**决定性核验**：gradle 的 `output-metadata.json` 记 `versionCode: 21` —— Android 会认成升级，必定覆盖旧包（此前三个包同名 + 同 versionCode，用户很可能装的仍是旧包，这是最可能的原因）。
- **仍未验证**：缺陷 B 在真机 APP 上是否已修好，**只能由用户装 2.8.6 后确认**。若装 2.8.6 仍裂，则需做"显示实际请求地址"的诊断包。

## 10. 证据索引：需要时再定位原文

- §11为本地完整Git提交索引；先git show --stat查范围，再按非敏感文件查内容。历史可能含凭据，禁止批量输出历史文件。
- `.rivet/HANDOFF-2026-10-12.md`：早期过程、社交波次、§十九约定；有敏感段，只定位安全段。
- `.rivet/HANDOFF-2026-10-13.md`：原D01–D23审计及当时待授权，后续已修，不当今日待办。
- `.rivet/HANDOFF-2026-10-14.md`：PB退役、§10最终应用验收/关闭决定；上部旧环境/Push许可已过时。
- `.rivet/HANDOFF-2026-10-14-site.md`：官网到b60c1b6的旧版本；后面仍有重构及发布。
- `.rivet/plans/maskaria-上线计划-2026-10-13.md`及同目录审计修复计划：分批执行历史，摘要与旧正文可能冲突，以最新事实为准。
- `.rivet/scratch/audit-20261013/`：原失败、探针、接口/浏览器取证；`.rivet/scratch/audit-20261014/阶段4-复查报告-2026-10-14.md`：导入缺陷、七线复查、验证边界。
- `.rivet/knowledge/memory.jsonl`：天枢零散知识，本轮筛选比对；有旧方案/错误摘要，不覆盖Git和现场。
- README用于对外介绍/运行/许可，可能有旧性能文字；COMPLIANCE/NOTICE/ASSETS_LICENSE用于合规；deploy/README是模板；人工测试方案是旧版操作参考。
- 本机原会话在 `C:\Users\Lqx24\.codex\sessions\2026\10\`，只读，不搬移、不提交：
  - `14/rollout-2026-10-14T01-15-14-01a13642-de24-7a83-8675-bdd7b20f10fa.jsonl`：腾讯云/Android迭代。
  - `14/rollout-2026-10-14T10-22-43-01a13838-1b27-7342-a972-cd33efde2081.jsonl`：Cloudflare部署、真实下载、固定快照。
  - `15/rollout-2026-10-15T12-11-30-01a13dc2-0d9b-7d51-aea8-2d21c27d96e9.jsonl`：2.8.3构建/签名/上传、两库Push与错误官网摘要。
- 只恢复有证据的过程，不复制凭据或用户数据来充当“恢复记忆”。

## 11. 恢复时的完整Git提交索引

截至整理前f55d8a0的全部本地可达提交，按先后排列，补足§9按功能归纳的过程。日期来自Git；提交不证明Push/部署/验收。早期标题邮箱已省略。后续节点写§9，不每轮复制全量索引。

| 提交 | 日期 | 保存的节点 |
|---|---|---|
| `a852d9c` | 2026-10-12 | chore: initial import of Persona Terminal (fork of YuukiMarine/the-velvet, GPL-3.0-or-later) |
| `179550a` | 2026-10-12 | fix: 修复 start.bat 在 GBK 控制台下的中文乱码（chcp 65001） |
| `c9217ae` | 2026-10-12 | feat: monorepo 整合——后端 Spring Boot 骨架、毕设策划书纳入版本管理 |
| `79171bd` | 2026-10-12 | feat: 前端认证切换自研后端——velvetApi 客户端(JWT)+auth.ts 三口切换+MeController(/api/me,/api/velvet/profile)+vitest 基建(7 用例全绿) |
| `1034e34` | 2026-10-12 | fix: 恢复根路径音效文件（26 个 mp3）——修复网站无声 |
| `b636d10` | 2026-10-12 | feat: 邮箱验证码登录——163 SMTP([邮箱省略])+OtpService/OTP 接口+X 风格邮件模板+启动脚本提速 |
| `fa914e6` | 2026-10-12 | feat: 前端验证码登录接线自研后端——requestLoginOrSignupOTP/verifyOTP 切 velvetApi，清理 PB OTP 死代码 |
| `40404d7` | 2026-10-12 | docs: 交接文档——路径/凭据/踩坑/下一步，供改名后新会话直接续作 |
| `3433b3c` | 2026-10-12 | feat(icons): MASKARIA 主题图标——圆角外黑底透明 + 三平台资源生成 |
| `10889a5` | 2026-10-12 | refactor(brand): 「面具终端」正式更名为 MASKARIA（面具庭园） |
| `a709fb5` | 2026-10-12 | feat(theme): 主题 ↔ 软件图标联动（Android 桌面 / Web favicon / 应用内 logo） |
| `318b05c` | 2026-10-12 | docs: 交接文档记录 MASKARIA 更名 + 主题图标工作（含未验证项与算法说明） |
| `06e783a` | 2026-10-12 | chore(icons): 加 ContactSheet.java——生成 5 主题图标对比图供人眼目检 |
| `a11f1e3` | 2026-10-13 | feat(sync): 后端同步接口 /api/sync/rows——镜像 PB 的 user_data KV 模型 |
| `f018b60` | 2026-10-13 | feat(sync): 前端同步数据面迁移至自研后端 + userDataApi 契约测试 |
| `efbd43e` | 2026-10-13 | feat(sync): 前端同步数据面迁移至自研后端 + userDataApi 契约测试 |
| `06600fa` | 2026-10-13 | feat(sync): 档案同步切自研后端——users.profile JSON 列 + 扩展字段读写 |
| `468aa31` | 2026-10-13 | test(sync): 补档案推送前端回归测试 + vitest 补 '@' 路径别名 |
| `f4a7010` | 2026-10-13 | feat(avatar): 后端头像文件存取接口（上传/公开读取/删除） |
| `54c830c` | 2026-10-13 | feat(avatar): 前端头像上传切自研后端 + 回归测试 |
| `c9d3f8c` | 2026-10-13 | docs(handoff): 补记姊妹项目对照（喵叽智账 vs MASKARIA）+ 本次会话进度 |
| `92c61a2` | 2026-10-13 | chore(db): 引入 Flyway 版本化迁移 + 补 AuthController 集成测试 |
| `c5fae5f` | 2026-10-13 | docs: 新增 COMPLIANCE.md 合规与使用边界提醒 |
| `9435e9c` | 2026-10-13 | docs(handoff): 追加 §十二——Flyway 迁移、合规建档、部署调研结论 |
| `1126c5e` | 2026-10-13 | security: 移除入库的明文邮箱授权码 |
| `dc63089` | 2026-10-13 | docs(readme): 补项目归属说明 + 拆分上游历程与本仓历程 |
| `181765e` | 2026-10-13 | docs(readme): 顶部聚焦本项目 + 致谢移至末尾小字 |
| `9596011` | 2026-10-13 | docs(readme): 按项目实际情况重写，移除 iOS 与上游开发史 |
| `1fc5136` | 2026-10-13 | docs(readme): 顶部定位语改为更有张力的表达 |
| `e50a6a6` | 2026-10-13 | docs(handoff): §十三 收尾补记——安全事件、环境现状、下一步优先级（供新窗口交接） |
| `8765316` | 2026-10-13 | feat(ai): AI 请求可走自研后端代理——API Key 不再进浏览器 |
| `df41731` | 2026-10-13 | feat(ai): 语音转写与余额查询接入后端代理（补全改道面） |
| `297acd4` | 2026-10-13 | feat(ai): AI 设置页加「走后端代理」开关（用户授权动 UI） |
| `055cc2e` | 2026-10-13 | fix(ai): 代理开关移出折叠区，独立成卡放主干 |
| `f87adc7` | 2026-10-13 | docs(handoff): §十四 收灯补记——AI 代理线完结、BYOK 定位、社交迁移为下一步 |
| `aa0e385` | 2026-10-13 | docs(handoff): §十五 安全审计补记——历史授权码残留、公网前三件套、健康项清单 |
| `b83ca38` | 2026-10-13 | docs(handoff): §十五 红色项销账——仓库确认 Private，历史授权码风险归零 |
| `c226bf2` | 2026-10-13 | fix(ui): 「关于」弹窗 logo 接主题联动图标（替换写死的蝴蝶 emoji） |
| `9f59dbf` | 2026-10-13 | feat(social): 好友模块后端——五接口+双表迁移+集成测试（社交迁移 W1） |
| `3237bad` | 2026-10-13 | feat(social): 好友模块前端切流 + 契约测试 + §十六交接（社交迁移 W2） |
| `69d2634` | 2026-10-13 | refactor(social): 去掉 socialUseBackend 设置开关——按登录态自动分流 |
| `ba703f9` | 2026-10-13 | refactor(ai): 代理改自动分流——删设置页开关与 aiUseBackendProxy 字段 |
| `45c5829` | 2026-10-13 | feat(ai): 代理 502 自动回退直连（登录即代理、无钥匙无感降级） |
| `171b7e8` | 2026-10-13 | docs(handoff): §十七 交接快照——社交W1完结、自动分流定稿、下一步优先级 |
| `0b0211c` | 2026-10-13 | fix(social): 修复好友模块自研模式下整条链路失效（四层缺陷） |
| `6e382d3` | 2026-10-13 | docs(handoff): §十八 好友模块端到端修复——四层缺陷与关键教训 |
| `fda7eac` | 2026-10-13 | docs(handoff): §十九 项目权威约定唯一源 + 顶部权威源声明 |
| `566f866` | 2026-10-13 | feat(social): 通知中心迁移 W2——后端读接口 + 前端分流（并修 W1 遗留写入 bug） |
| `8ce7dae` | 2026-10-13 | docs(handoff): §二十 通知中心迁移 W2——含 W1 遗留写入 bug 的发现 |
| `7577e8a` | 2026-10-13 | fix(auth): 设置 UserID 报「未登录」——补自研后端分流（并加唯一性校验） |
| `a66ee38` | 2026-10-13 | docs(handoff): §二十一 设置 UserID 报未登录的修复（同族第四实例） |
| `32b0726` | 2026-10-13 | docs(handoff): §二十二 浏览器级验收（CDP 真机调 setOrChangeUserId）+ 可复用探针骨架 |
| `edf7f3f` | 2026-10-13 | docs(handoff): §十九 B2 用户深度参与验收——固化成交付固定动作 |
| `662a92b` | 2026-10-13 | docs(handoff): §二十三 W2 通知中心浏览器级验收 + W3 规模提示 |
| `d528e1a` | 2026-10-13 | feat(social): 祈愿迁移 W3 第一波——后端从零建 prayers 模块 + 前端分流 |
| `61d7a9f` | 2026-10-13 | docs(handoff): §二十四 W3 第一波（祈愿迁移）+ W3 规模判断 + 两处测试坑 |
| `bf51afe` | 2026-10-13 | docs(handoff): §二十四补记 祈愿浏览器级验收（读/写/去重三路径全通） |
| `1bed535` | 2026-10-13 | fix(ui): 斜切按钮/卡片的边框在斜角处断裂——描边改画进形状内部 |
| `071bb34` | 2026-10-13 | docs(handoff): §二十五 斜切边框断裂修复（含 3px 估算被像素测量推翻的记录） |
| `662c7da` | 2026-10-13 | fix(audio): 替换三套主题音效 + 26 个 mp3 迁入 public/（修线上静默根因） |
| `58f3c2a` | 2026-10-13 | feat(audio): 卡牌翻转音效换成 00031.wav（4 个卡牌界面共用） |
| `85957bd` | 2026-10-13 | feat(splash): 开屏动画只在「进入」时放，刷新不再重放 |
| `fec6401` | 2026-10-13 | docs(handoff): §二十八 W3 第二波（同伴羁绊 coopBonds）调研成果交接 |
| `feabc8f` | 2026-10-13 | feat(social): 同伴羁绊 W3 第二波——后端从零建 coop_bonds 模块（V5 + 6 接口） |
| `56982db` | 2026-10-13 | feat(social): 同伴羁绊 W3 第二波——前端 Api 层 + 6 函数自动分流 |
| `abef912` | 2026-10-13 | docs(handoff): §二十九 W3 第二波（同伴羁绊 coopBonds）迁移完结 |
| `7a9475e` | 2026-10-13 | feat(social): 一起进步 W3 第三波——后端从零建 coop_pacts 模块（V6 + 7 接口） |
| `432b273` | 2026-10-13 | feat(social): 一起进步 W3 第三波——前端 Api 层 + 6 函数自动分流 |
| `456a50a` | 2026-10-13 | docs(handoff): §三十 W3 第三波（一起进步 coopPacts）迁移完结 |
| `fb63dd2` | 2026-10-13 | feat(social): 羁绊之影 W3 第四波——后端建 coop_shadows + coop_attacks 两表模块（V7 + 8 接口） |
| `e1df96d` | 2026-10-13 | feat(social): 羁绊之影 W3 第四波——前端 Api 层 + 8 函数自动分流 |
| `c774721` | 2026-10-13 | docs(handoff): §三十一 W3 第四波（羁绊之影 coopShadows）迁移完结 |
| `6400c38` | 2026-10-13 | docs(handoff): §三十二 会话交接——4 波迁移收官（coopBonds/coopPacts/coopShadows + 套路模板） |
| `909c98e` | 2026-10-13 | feat(social): 组织模块 W3 第五波 第一步——后端建 orgs + org_members 两表模块（V8 + 15 接口） |
| `88cb36a` | 2026-10-13 | feat(social): 组织模块 W3 第五波 第一步——前端 orgsApi 层 + orgs.ts 15 函数自动分流 |
| `c730e9d` | 2026-10-13 | feat(social): 组织模块 W3 第五波 第二步——公告板三表（org_posts/reactions/reports）前后端 + 分流 |
| `cc9671c` | 2026-10-13 | feat(social): 组织模块 W3 第五波 第三步——作战两表（org_operations/checkins）前后端 + 分流 |
| `3764c69` | 2026-10-13 | feat(social): 组织模块 W3 第五波 第四步——满月团战两表（org_raids/raid_hits）前后端 + 分流 |
| `47aa0c4` | 2026-10-13 | docs(handoff): §三十三 W3 第五波（组织模块 9 表）迁移完结 |
| `b4172be` | 2026-10-13 | feat(social): 弹幕 W5 迁移——danmaku/danmaku_reports 两表前后端 + 分流（自动过审策略） |
| `dc89460` | 2026-10-13 | docs(handoff): §三十四 W5（弹幕 danmaku）迁移完结 |
| `15e2ecd` | 2026-10-13 | docs(handoff): §三十五 会话交接——组织模块 9 表 + 弹幕 W5 收官 |
| `871fd0e` | 2026-10-13 | docs(handoff): §三十五 修正——遗留项实测核实（PB fallback 11 文件非 28，user_data 早已迁完） |
| `a0780c3` | 2026-10-13 | fix(sync): 校验云快照并保证本地持久化失败可恢复 |
| `bf1db8e` | 2026-10-13 | fix(tasks): 原子提交任务完成与奖励并阻止并发重复领取 |
| `87d2d92` | 2026-10-13 | fix(security): 校验羁绊之影归属并原子消费验证码 |
| `21fc633` | 2026-10-13 | fix(auth): 统一UserID写入口校验与登录资料字段 |
| `7e26ffc` | 2026-10-13 | fix(proxy): 固定服务端凭据映射并对齐认证与响应契约 |
| `6f38591` | 2026-10-13 | fix(auth): 接通自研改密并使旧登录会话失效 |
| `50361bb` | 2026-10-13 | feat(social): 互动广播迁移自研接口并保证幂等与离线重试 |
| `bab3f52` | 2026-10-14 | test(backend): 集成测试改用隔离测试库并修掉固定用户名固件 |
| `2bf7d37` | 2026-10-14 | test(social): 补 D22 双合成账号「操作→通知→接收」端到端 |
| `17150ca` | 2026-10-14 | fix(ai): AI 代理错误体改由 Jackson 序列化，修掉非法 JSON |
| `17f2cb2` | 2026-10-14 | feat(auth): 自研账号补上邮件重置密码 |
| `f8f8baf` | 2026-10-14 | feat(auth): 自研账号可以注销（App 内必须能注销） |
| `896ad09` | 2026-10-14 | docs(deploy): 补部署准备材料（腾讯云/Linux 上线可直接照做） |
| `1c3c8be` | 2026-10-14 | refactor(services): 数据源路由判据收敛成一份 |
| `462438a` | 2026-10-14 | docs(deploy): 手册补「构建时把正式地址烤进前端」与数据迁移步骤 |
| `dfbf735` | 2026-10-14 | feat(android): 后台提醒契约迁到自研后端（D23 源码层） |
| `fceda6f` | 2026-10-14 | docs(readme): 按当前实际重写「后端改造进度」与验证数字 |
| `f9bccdb` | 2026-10-14 | refactor(danmaku): 去掉 PocketBase 兜底，弹幕只走自研接口 |
| `a2ab3e8` | 2026-10-14 | refactor(social): 通知 / 好友 / 祈愿去掉 PocketBase 兜底 |
| `e8b140a` | 2026-10-14 | refactor(coop): 互动事件与一起进步去掉 PocketBase 兜底 |
| `2e5b736` | 2026-10-14 | refactor(coop): 同伴羁绊 coopBonds 去掉 PocketBase 兜底 |
| `a1732d0` | 2026-10-14 | refactor(coop): 羁绊之影 coopShadows 去掉 PocketBase 兜底（最大的一块） |
| `c4bff79` | 2026-10-14 | refactor(org): 组织模块 orgs 去掉 PocketBase 兜底 |
| `8fc8010` | 2026-10-14 | refactor(auth): 账号服务只留自研路径，删掉 PocketBase 遗留 |
| `8ab9f08` | 2026-10-14 | refactor: PocketBase 退役完成——删掉模块、依赖与全部回落 |
| `6492b37` | 2026-10-14 | docs(readme): PocketBase 已退役 |
| `a0b08d4` | 2026-10-14 | docs: 清掉 PB 退役后残留的过时注释 |
| `83fdaa7` | 2026-10-14 | docs(handoff): 2026-10-14 会话交接（PocketBase 退役完成后） |
| `97b6ad4` | 2026-10-14 | fix(store): 导入失败回滚不再重写保留表，回滚后必定重载界面 |
| `ce08545` | 2026-10-14 | fix(store): 导入主备份补齐周总结与黑猫记忆的 Date 还原 |
| `763f0e2` | 2026-10-14 | docs(readme): 前端测试数字按实测更新为 30 文件 / 196 项 |
| `99acdda` | 2026-10-14 | feat(auth): 密码重置令牌落库，重启后端不再作废未使用的重置链接 |
| `962b3fb` | 2026-10-14 | docs(deploy): 补 2 GB 试用机的内存调优与自检项 |
| `c87d753` | 2026-10-14 | feat(health): 自研 /api/health 健康端点，修正部署手册里的检查地址 |
| `9fb161b` | 2026-10-14 | feat(android): 适配 http 后端出 APK（明文与混合内容放行） |
| `c2bd26a` | 2026-10-14 | fix(android): 底部导航栏透明并跟随主题明暗，加异常退出诊断 |
| `d4b6b34` | 2026-10-14 | fix(android): 桌面图标切换挪到退到后台再执行，退出诊断换成对话框 |
| `0c9a108` | 2026-10-14 | fix(android): 退出诊断排除用户上滑清理这类正常退出 |
| `38000a4` | 2026-10-14 | chore(android): 移除临时退出诊断弹窗 |
| `0ca4b97` | 2026-10-14 | fix(ai): 测试连接与拉模型列表补上 X-Upstream-Provider 头 |
| `1140e56` | 2026-10-14 | fix(ai): 测试连接与拉模型遇到「服务端未配置钥匙」时回退直连 |
| `6b2e060` | 2026-10-14 | fix(ai): 拉模型列表不再走代理，修掉被误译成「密钥无效」的 401 |
| `7bd96fd` | 2026-10-14 | feat(ai): 代理按服务端实际持有的钥匙决定走不走，省掉每次都白撞的 502 |
| `94bc979` | 2026-10-14 | fix(splash): 开屏大字「面具终端」改为「面具庭园」 |
| `7296918` | 2026-10-14 | fix(ai): 流式路径补上代理 502 回退，修掉塔罗/谏言这类功能直接报「服务端未配置」 |
| `fe4c45c` | 2026-10-14 | fix(ai): 语音与余额两条出口补齐代理回退；诊断输出补代理状态 |
| `fcd8394` | 2026-10-14 | docs: 交接文档移出仓库，改放 .rivet/ 只在本地留存 |
| `2e2174f` | 2026-10-14 | docs(readme): 重写为项目真实口吻，换成红色主题图标 |
| `fcad8e6` | 2026-10-14 | docs(readme): 说明音效与场景图不随仓库分发，缺失时静默降级 |
| `b190173` | 2026-10-14 | docs(readme): 重写为项目口吻，图标换成红色主题 |
| `5614c2e` | 2026-10-14 | docs(readme): 加展示截图（红主题首页 / 助手记账 / 蓝主题首页） |
| `7448f4f` | 2026-10-14 | site: 新增官网 demo（P5 风格落地页） |
| `8d1490d` | 2026-10-14 | site: 全站改成手撕边与斜贴，开屏补上颠簸的小车 |
| `180fab7` | 2026-10-14 | site: 放慢进场演出，让开屏全貌看得清 |
| `dc36116` | 2026-10-14 | site: 修遮挡、相纸比例、四步改横排、文案改 P5 口吻 |
| `b60c1b6` | 2026-10-14 | site: 文字块的形状换成带牙的凶边，斜角加大 |
| `ce2d817` | 2026-10-14 | site: 撕边改成真手撕纸，纸片补上投影 |
| `4f7567e` | 2026-10-14 | site: 修四步横幅在窄窗口里被挤成竖排 |
| `1804d84` | 2026-10-14 | site: 视觉重构，按海报式构图重排全部章节与形状层级 |
| `e64b95e` | 2026-10-14 | site: 按 Persona 5 官网的构成与动效重排整站 |
| `02123b7` | 2026-10-14 | site: 换到黄色频道前先把衬线体热一下，不让标题在切换时闪一下 |
| `8c649bb` | 2026-10-14 | site: 加一个双击就能看的预览入口（本地静态服务 + open-bat） |
| `9bf1b51` | 2026-10-14 | site: 首屏改成 P5 风格的 MASKARIA 字标，下载按钮接上安装包 |
| `94557a7` | 2026-10-15 | fix(ai): 拉模型列表回退原生通道 |
| `f55d8a0` | 2026-10-15 | release: 准备 2.8.3 正式安装包 |

### 2026-10-16（续）：缺陷 B 二次追查 —— 找到「组织/好友卡那条线」整体漏接（`4fbd0e0`）

- **起因**：用户新窗口接手时反馈「图标还是裂的」。前一轮判断为「装的仍是旧包」，本机重查后发现还有一处结构性漏网。
- **根因**：`6661229` 引入 `resolveAssetUrl` 时只接在 8 个**直接**渲染点上（AddOnlineConfidantModal / ConfidantCard / ConfidantDetailModal / NotificationsPanel / OnlineConfidantProfileCard / HideoutMap.SeatPin / RaidSheet / Cooperation:1154）。而组织与好友卡走的是**间接公共线**：
  - `src\components\org\MemberCard.tsx` 的 `useMemberFace` —— BoardSection（3 处）/ OpsSection / RosterWall / MemberCard（2 处）/ OpCreateSheet / ShareToOrgSheet 的牌面全经它取 `url`，但它返回的是原始 `m.avatarUrl`；
  - `src\components\cooperation\ConfidantAlbumWall.tsx` 的 `FriendCardFace`（`faceDataUrl || profile.avatarUrl`）与 `faceOf`（`avatarAsCardFace` 时）；
  - `src\pages\Cooperation.tsx` 的 `openFriendCrop`、`src\components\cooperation\ConfidantDetailModal.tsx` 的 `openCardFaceCrop` 两处 **fetch 原图**（APP 里 fetch 相对路径同样 404）。
  后端 `OrgService.toMemberView`（OrgService.java:406）直接回 `users.avatar`，即 `/api/avatar/{id}` 相对路径，所以这些位置在 APP（origin `https://localhost`）里必然请求 `https://localhost/api/avatar/…` → 404 → 图裂；网页端同源解析所以看不出来。
- **改动**：上述 4 个文件各补 `resolveAssetUrl`（`MemberCard` 一处覆盖其全部消费点），新增 `src\components\org\__tests__\memberAvatar.test.ts` 3 项。
- **验证**：`npx tsc --noEmit` 无错误；`npx vitest run` **36 文件 / 227 项全通过**；回归测试做了 **RED 校验**（把 `useMemberFace` 的补全临时回滚 → 1 failed，恢复 → 3 passed），证明测试确有判别力。
- **commit**：`4fbd0e0`（5 文件）。**未 Push**。
- **边界与遗留**：**真机 APP 未验证**（本机无手机）——本次修的是代码层漏网，仍需用户装新包确认；「是否装的仍是旧包」这一可能未排除。缺陷 C（平板桌面图标不全）仍未开始。
- **下一步（负责人）**：用户 —— 装含 `4fbd0e0` 的新包后确认；我 —— 若仍裂，做「页面上直接显示实际请求地址」的诊断包，并继续排查设备/安装环节。
- **交付门备注**：`deliver_task` 判 YELLOW 且无法采证（自述「未生成可采证批命令（E:\MASKARIA）：请确认该项目的 runner 与采证适配」），故按降级路径用**显式点名文件**的 scoped 提交（只含本次 5 个文件，未用 `-A`）。

### 2026-10-16（三次追查）：纠错 + 混合内容线索；用户决定暂停并交接

- **起因**：用户接手会话后反馈「是组织界面的这个自己头像裂，你确定修对了吗」，并附两张截图（一张浅色界面、一张红主题 APP，红主题那张中央五角星上方是破图）。
- **纠错（重要，纠正上一节点）**：用户指的是**据点地图中央、五角星上方的自己的座位头像**（`src\components\org\HideoutMap.tsx` 的 `SeatPin`；`:153` 传 `m.avatarUrl`、`:234` 调 `resolveAssetUrl`）——**属 `6661229` 已修的 8 处之一**，不是 `4fbd0e0` 补的 org/好友卡那条线。上一节点「找到真正的漏网点」的判断**被用户现象推翻**；`4fbd0e0` 那批改动本身仍成立（独立缺陷、测试全绿、已提交），但它**没有解决用户看到的问题**。
- **本轮取证（全部本机实测，非推断）**：
  - 拆 `outputs\maskaria-2.8.6-release.apk`：`assets/public/assets/Hideout-DAp_s9t0.js` 里头像行编译为 **`src:nt(`**（补全函数确实被调用）；全包唯一 API 基址 `http://192.144.227.216`，**无 localhost 残留**；`org-map-pulse` 在包内（确认与截图同一界面）。
  - `curl -k -m12 https://192.144.227.216/api/health` → **https_code=000、超时（exit 28）→ 服务器没有 https**；同路径的 http → 200 正常。
  - 在 `https://example.com` 注入 `<img src="http://192.144.227.216/icon.png">`，6 秒后 → **ERROR**（加密页面加载不加密图片会失败）。
  - Capacitor 侧：装的 `@capacitor/android` 为 `5.7.8`；`Bridge.java:556` 在 `config.isMixedContentAllowed()` 为真时设 `MIXED_CONTENT_ALWAYS_ALLOW`；工程 `assets/capacitor.config.json` 确含 `android.allowMixedContent:true` → **配置本身不缺项**。
- **未判定**：**(a)** 用户手机上装的仍是旧包（其截图自述是「之前的」，无法确认现装版本）；**(b)** 已装 2.8.6 仍裂 → 根因指向**混合内容**。外部查证受阻（`developer.chrome.com`、DuckDuckGo 抓取均超时），**「ALWAYS_ALLOW 下被动混合内容是否仍被自动升级为 https」这一点仍是推断、未证**。
- **若 (b) 的候选修复（均未执行、需用户拍板）**：① `capacitor.config.ts` 的 `server.androidScheme` 由 `https` 改 `http`（最小改动；**代价：App 内 WebView 存储 origin 变更，未上云的本地数据——记账流水、聊天原文等——会读不到**）；② 给后端加 https（需域名/证书 + 动服务器，用户既有边界是「不改服务器配置」）；③ 远程头像改 fetch→blob（改动点多，但不动 origin 与服务器）。
- **commit / Push**：本轮无新代码提交（`4fbd0e0` 是上一节点）；**未 Push**。
- **状态**：用户 2026-10-16 明确「先不管了，准备交接」→ **缺陷 B 暂停、未解决**；缺陷 C（平板安装后桌面图标不全）仍未开始。
- **下一步（负责人）**：**用户**——有空时装 2.8.6 后重截一张「现在」的图（用于区分 (a)/(b)，截图最好带设置页版本号）；**我**——拿到图后按 (a)/(b) 分支推进；走 (b) 的修复前必须先让用户确认代价。
