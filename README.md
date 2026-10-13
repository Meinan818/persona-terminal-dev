<p align="center">
  <img src="icon.png" width="96" height="96" alt="MASKARIA" />
</p>

<h1 align="center">MASKARIA</h1>
<p align="center"><em>面具庭园 —— 把人生过成一场 RPG</em></p>

<p align="center">
  <img src="https://img.shields.io/badge/version-1.0.0-8B5CF6?style=flat-square" />
  <img src="https://img.shields.io/badge/React-18-61DAFB?style=flat-square&logo=react" />
  <img src="https://img.shields.io/badge/TypeScript-5-3178C6?style=flat-square&logo=typescript" />
  <img src="https://img.shields.io/badge/Spring%20Boot-3.2-6DB33F?style=flat-square&logo=springboot" />
  <img src="https://img.shields.io/badge/MySQL-8-4479A1?style=flat-square&logo=mysql" />
  <img src="https://img.shields.io/badge/Android-Capacitor-3DDC84?style=flat-square&logo=android" />
  <img src="https://img.shields.io/badge/license-GPL--3.0--or--later-blue?style=flat-square" />
</p>

---

> *"你已经签订了契约。你拥有面对命运的力量……"*
>
> 欢迎来到 MASKARIA。这里介于梦与现实之间，专为拥有特别潜能之人而存在。
> 在这里，你的每一次行动化为属性加点，你的成长轨迹被 AI 回望与诠释，你的人格，正在逐渐成形。

---

## 这是什么

**MASKARIA（面具庭园）** —— **你人生的 RPG 化身**。这是一款把真实生活搬进 JRPG 世界观的状态存档器：

> 记录你做的事 → 换成属性点数 → 升级 → 解锁技能与成就 → 与内心的「逆影」对战 → 让 AI 回望你的成长弧线。

**技术形态**：

| 层 | 实现 |
|---|---|
| 前端 | React 18 + TypeScript + Vite，PWA 可安装到手机桌面（离线可用） |
| 后端 | **Java 17 / Spring Boot 3 + MySQL 8**，JWT 认证（自研） |
| 客户端 | Android（Capacitor 打包） |
| 数据 | 默认存本机（IndexedDB）；云同步可选，且分类目——**记账流水与聊天原文永不上传** |

后端正在从第三方云服务（PocketBase）迁往**自研实现**，进度见下方「后端改造进度」。

---

## 核心功能

### 人格五维

| 属性 | 默认名 | 代表的行为 |
|------|--------|-----------|
| Knowledge | 知识 | 阅读、学习、思考 |
| Guts | 胆量 | 挑战、运动、意志力 |
| Dexterity | 灵巧 | 技艺、创作、动手能力 |
| Kindness | 温柔 | 关怀、帮助、共情 |
| Charm | 魅力 | 社交、表达、气场 |

五项**全部可自定义命名**。每升一级解锁对应技能，技能激活后为该属性的加点提供额外加成。

### 记录

自然语言描述你做了什么，关键词规则自动建议加点；也可以手动调每项 0–5。
支持补记一周内的事、标记重要事件、日历热力图、按年/月/日归档与全文搜索。

### 任务

绑定属性与点数，完成自动加点。「每日重复」养习惯，「长期目标」记累计次数，
「本周目标」盯住一周的推进。**BIG DEAL** 可以把大事拆成子步逐个勾掉，收官时一次结算。
还没想清楚的事先写成**愿望**，想动手了再转成任务；选择困难时让「命运抽签」替你挑一件。

### 宣言卡

为重要的事写一张「宣告卡」——立下目标宣言或倒计时，钉到首页后每天映入眼帘，
临期自动提醒，收官时有专属的庆祝演出。

### 记账

一句话记一笔，AI 认金额与类目；支持一句多笔。
真实总余额 + 月度预算环 + 「今日还可以花多少」；资产板块与月末结算。
「成长」类支出会回过来给属性加点——花在自己身上的不算白花。

### 同伴

用 22 张大阿卡纳代表你身边重要的人。记录互动涨亲密度，等级上去解锁道具与日常加成。
每天可以向同伴祈愿（凌晨 4 点重置）。登录后输入对方 UserID 可缔结 COOP，双向同步。

### 逆影战场

「影时间」降临时暗影出现。召唤属于你的「面具」，为五项属性各绑一套技能，
出招看局势（伤害 / 暴击 / 蓄力 / 易伤）。想再往深处走就顺着高塔一层层往上爬，
最深处是无尽的深渊回廊。

### 星象

每日三选一抽塔罗，给出运势与一句建议，并为某项属性加成。
另有持续 14 天、可追问一次的中长期占卜。未配置 AI 也能抽——离线解读兜底。

### 统计与 AI 回望

人格指数五角星随成长伸展；连续打卡、热力日历、属性曲线一目了然。
配置 AI 后可生成**每周 / 每月成长总结**，替你回头看一眼这段时间的弧线。

### 助手

住在底部中央 ◈ 里的对话式助手。说人话就能记账、加任务、写记录；
它记得你手头在做的事，会在合适的时候提一句。人格可换，也可以自己捏一个。
**聊天原文只存在你的设备上，永不上传。**

### 桌面小组件

Android 桌面小组件：**清单组件**（今日任务 + 完成进度 + 倒计时，4×2 / 2×2 双规格，
BIG DEAL 高亮），跟随夜间模式。

---

## 主题与视觉

四套视觉语言 + 自定义。换主题不是换色号，是换一整套设计语言。

| 主题 | 语言 |
|------|------|
| 蓝 / 粉 | **白日水面** —— 近白底、斜切平行四边形、超大黑斜体、背景幽灵英文大字 |
| 黄 | **今日节目单** —— 高饱和黄舞台、衬线大标题、花瓣雷达、实景云天空 |
| 红 | **剪报怪盗** —— 纯黑舞台、猩红斜块碰撞、半调网点、不规则撕纸卡、拼贴瓷砖标题 |
| 自定义 | 中性皮，整族从你选的主色派生 |

每套都配有各自的长按轮盘、庆祝演出、页对页转场、按压反馈与夜间模式。

---

## 技术栈与运行

**前端**：React 18 · TypeScript 5 · Vite 5 · Tailwind 3 · Zustand · Dexie（IndexedDB）·
motion/react + GSAP · Capacitor（Android）· vite-plugin-pwa

**后端**：Java 17 · Spring Boot 3 · MyBatis-Plus · MySQL 8 · Spring Security + JWT ·
Flyway（数据库版本化迁移）

```bash
# 前端
npm install
npm run dev                     # 开发（http://localhost:5173）
npm run build                   # 构建到 dist/

# 后端（需要 MySQL）
cd backend
mvn spring-boot:run             # 启动（http://localhost:8080）
mvn test                        # 集成测试

# 移动端
npm run cap:sync                # 同步进 Android 工程
npm run cap:build:android       # 打包 Android
```

> **音效素材不在仓库内** —— `public/` 下需要自备若干 UI 反馈音（文件名见
> `src/utils/feedback.ts` 与各处 `playSound()` 调用）。缺失时音效静默，不影响其它功能。

---

## 后端改造进度

数据层已从第三方云服务（PocketBase）迁到**自研 Spring Boot + MySQL + JWT**：
新登录一律走自研后端；PocketBase 只作为历史账号的回落路径保留，
**退役清理还没做**（属于已知欠账，不影响新用户）。已完成的部分均附测试。

| 模块 | 状态 |
|---|---|
| 认证（注册 / 密码登录 / 邮箱验证码 / JWT） | ✅ 自研后端 |
| 忘记密码（邮件一次性链接改密） | ✅ 自研后端 |
| 注销账号（删本人及名下数据） | ✅ 自研后端 |
| 用户档案（昵称 / 等级 / 属性 / 状态 / 头像） | ✅ 自研后端 |
| 云端数据面（`/api/sync/rows`，镜像 KV 模型） | ✅ 自研后端 |
| 数据库版本化迁移（Flyway） | ✅ 已引入 |
| 社交（好友 / 通知 / 同伴 / 组织 / 一起进步 / 弹幕） | ✅ 自研后端（PB 回落仍在） |
| AI 代理层（可选：服务端持 Key 转发；默认关，产品仍是 BYOK） | ✅ 已实现 |
| 记账流水 / 聊天原文 / 记录配图 / 导入音乐 | 按设计只存本机，不上云 |

**验证（2026-10-14 实测）**：后端 `mvn test` **154 项全通过**（集成测试跑在隔离库
`persona_terminal_test` 上，不再污染应用库）；前端 `npm test` **29 文件 / 192 项全通过**；
`tsc --noEmit` 0 报错；生产构建 `VITE_API_URL=<正式地址> npm run build` 通过并正常生成 PWA。

上线步骤见 [`deploy/README.md`](deploy/README.md)，合规边界见 [`COMPLIANCE.md`](COMPLIANCE.md)，
历史交接见 `HANDOFF-2026-10-12.md`。

---

## 平台

| | |
|---|---|
| Web / PWA | ✅ 可安装、离线可用 |
| Android | ✅ Capacitor 打包，含桌面小组件 |
| 后端 | ✅ Spring Boot + MySQL（自研；PocketBase 回落待退役） |

---

## 协议

代码按 **GPL-3.0-or-later** 发布（LICENSE），附两条附加许可（NOTICE）：
允许通过应用商店分发；允许与 GSAP 链接。

名称「MASKARIA」、图标、美术素材**不在 GPL 之内**，保留所有权利，见 ASSETS_LICENSE。

### 贡献

欢迎提 PR。请给每个 commit 加上 `Signed-off-by`（`git commit -s`，即 [DCO](https://developercertificate.org/)），
表示这段代码你有权提交。

---

<p align="center"><sub><strong>关于二次创作与致谢</strong></sub></p>

<p align="center"><sub>
本项目基于开源项目 <a href="https://github.com/YuukiMarine/the-velvet">the-velvet（靛蓝色房间）</a> 二次创作，
在此向原作者 <strong>YuukiMarine</strong> 致以诚挚的敬意与感谢。按 GPL-3.0-or-later 的要求，
本项目保持同样协议开源，并保留上游版权声明（见 <a href="NOTICE">NOTICE</a>）。<br/>
界面与命名借鉴了 Persona 系列，谨向 ATLUS / SEGA 致敬。本项目为粉丝向的个人作品，
与上述公司无关，亦未获其认可，请勿用于商业用途。
</sub></p>
