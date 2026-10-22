# adapter/ —— 红频道数据适配层（整个 `src/p5r-red/` 里唯一允许修改的地方）

> 只改 `adapter/live.ts`。页面、样式、mock 文件、注册表、kit……**一个字节都不要改**（`node scripts/p5r-red/check-copy.mjs` 会逐个比对 sha256）。
> 字段对不上 → 改 `live.ts` 里对应的映射函数；页面没有显示某个真实字段 → 不是你的活，记下来交给 demo 包方。

## 1. 工作方式

```
真实 store（useAppStore，src/store/index.ts）
   │  syncLiveDataNow()：首帧前一次 + 之后每次 store 变化（LIVE.start 订阅）
   ▼
原地写进 demo 的 mock 对象（只改内容不换引用）
   D（mock/data.ts） · ACTIVITIES / CALLING_CARDS / CALLING_ARCHIVED / ACHIEVEMENTS / SKILLS（mock/pkg5-data.ts） · FLOW（screens/pkg4/ledger4.ts）
   │  version+1 → RedChannelCore 整棵重渲染（不重挂载）
   ▼
红频道页面（原样读 mock，不知道数据来自哪里）
```

- 夜间 / 低动效：`useLiveFlags()` = `settings.darkMode` / `!useBoldness()`。
- 真实数据为空 → 写空数组 / 0，**不要回填 mock**。
- 写回：任务 / 记账 / 愿望 / 宣告卡 / 据点 / 成就 / 行动页的写操作已接 store action。仍有 mock 的见 §3「演示固定数据」。

## 2. 映射表（已接）

| demo 字段（mock） | 真实来源（store / types） | 映射（live.ts 函数） | 读它的页面 |
|---|---|---|---|
| `D.user.name` | `user.name` | 原样 | 首页名片、菜单名片、资料卡 |
| `D.user.joined` | `user.createdAt` | `YYYY.MM.DD` | 菜单名片「入学」 |
| `D.user.title` / `D.user.status` | —（真实在资料卡 presence，未接） | 保留 mock | 首页 / 菜单名片小字 |
| `D.streak` | `activities` | `calcCurrentStreak(streakDates(activities))`（utils/streak） | 菜单「连续 N 天」、统计「最长连续」、首页 |
| `D.attrs[a].level` | `attributes[].level` | 原样 | 首页雷达、统计六属性卡 |
| `D.attrs[a].pts` / `.next` | `attributes[].points` + `settings.levelThresholds ?? attributes[].levelThresholds` | 本级内进度：`points − 本级阈值` / `下一级阈值 − 本级阈值`（同 DashboardP5 AttrDetailInlineP5） | 同上 |
| `D.maxLevel` | 阈值数组长度 | 原样 | 雷达刻度 |
| `D.todos[]` | `todos`（`isActive && !archivedAt && !isBigDeal`）+ `todoCompletions`（今天） | `mapTodo`：`count` = 今天完成数，`target` = `targetCount`（count 型）或 1，`fate` = `fateDrawnDate === 今天`，`deadlineDays` 由 `deadline` 算，`extra` ← `extraBoosts` | 首页今日任务、行动 · 任务 |
| `D.archived[]` | `todos`（`archivedAt` 有值，最多 20） | `state`：`completedAt` → done，`isActive` → pending，否则 inactive | 行动 · 任务 归档区 |
| `D.wishes[]` | `wishes`（顶层、未归档） | `{ title, status }` | 首页愿望条 |
| `D.callingCards[]` | `callingCards`（未归档）+ `getCallingCardProgress(id)` | `ccMock` | 首页宣告卡提示条、菜单 |
| `CALLING_CARDS[]` / `CALLING_ARCHIVED[]` | `callingCards`（未归档 / 已归档） | `ccPkg5`：`texture` 固定 lines，`icon` 缺省 ★ | 宣告卡页、倒计时面、编辑器 |
| `D.weeklyGoal` | `weeklyGoals` 中 `weekStart ≤ 今天 ≤ weekEnd` 的一条 | 原对象浅拷贝 / null | 行动 · 任务 周目标卡 |
| `D.activities[]` | `activities`（按日期倒序前 20） | `{ d: 本地日期, desc, pts }` | 首页简表、一年前的今天 |
| `ACTIVITIES[]` | `activities`（倒序前 200） | `activityPkg5`：`category` 只保留 demo 认识的 6 种，`weather` ← `weather.icon` | 行动 · 记录页 |
| `ACHIEVEMENTS[]` | `achievements` | `achievementPkg5`：`progress` ← `condition.currentProgress`，`letter` = id 首个字母，demo 不认识的条件类型按 total_points 显示 | 成就页 |
| `SKILLS[]` | `skills` | `skillPkg5`：`bonusMultiplier` 缺省 1 | 技能页 |
| `D.confidants[]` | `confidants`（未归档） | `confidantMock`：`arcana` ← `arcanaId`（fool → FOOL、high_priestess → PRIESTESS、wheel_of_fortune → FORTUNE、hanged_man → HANGED…），`arcanaCn` / `no` ← `TAROT_BY_ID[arcanaId].name / roman`，`rank` ← `intimacy`，`desc` ← `description` | 羁绊列表 / 专辑墙、同伴详情（牌面读 `public/slots/tarot/p5/<真实文件名>.webp`） |
| `FLOW[]`（记账流水） | `ledgerEntries`（本月，按日期倒序前 30） | `ledgerRow`：`note` ← `note ?? category`，`dir` ← `direction`（adjust 记为支出），`ch` ← `channel`，`d` = 距今天数 | 心相记账 列表 |
| 夜间 | `settings.darkMode` | `useLiveFlags().dark` | 全局 token |
| 低动效 | `useBoldness()` | `useLiveFlags().lowMotion = !bold` | 全局 |

**时机**：pkg3（羁绊 / 据点）与 pkg4（行动 / 星象 / 记账）的命令式页面在**模块初始化时读一次** mock（例如 `oc.ts` 的 `CF = D.confidants.map(...)`）。`RedChannelRoot` 已在首帧前调 `syncLiveDataNow()`，所以首次进入就是真实数据；之后 store 变化会同步进 mock 并重渲染，但这些模块已算好的派生数据要等下次打开 App 才刷新。React 页面里 `useState(() => structuredClone(...))` 的本地副本在下次进入该页时刷新。

## 3. 演示固定数据（仍未接真实数据，保持 mock）

下面这些是写在页面模块内部的常量（v3 逐字迁移，非导出），adapter 无法改写。要接真实数据需要 demo 包方出新版本把它们挪进 mock 并导出——**接入 AI 不要自己动手**。

| 位置（src/p5r-red/…） | 内容 | 真实来源（将来） |
|---|---|---|
| `screens/pkg3/oc.ts` `EXTRA` / `EVENTS` / `RECENT` / `NTF` | 同伴亲密点数、AI 解读 / 建议、互动记录、通知 | `confidants[].intimacyPoints / aiInterpretation / aiAdvice`、`confidantEvents`、cloudSocial 通知 |
| `screens/pkg3/hideout.ts` `MEM` / `POSTS` / `OPS` / `HIST` / `FRIENDS` | 据点成员、动态、作战、历史、在线好友 | cloudSocial / org 服务 |
| `screens/pkg4/d4.ts` `LR_CARDS` / `CAT` | 长读牌阵、记账分类统计 | `longReadings`、`ledgerEntries` 汇总 |
| `screens/pkg4/todos4.ts` 周目标四态 | 周目标展示态 | `weeklyGoals` |
| 星象（DailyDraw / LongReading / FateGlimpse 预览）、统计趋势图、成就图鉴收集数 | 演示数据 | `dailyDivination` / `longReadings` / `fateGlimpses`、`activities` 聚合 |

## 4. 写回业务（已接）

以下写操作已通过 `live.ts` 和页面直接调用 store action，不再走 demo 本地状态：

- **任务**：完成任务、撤销今日完成、归档/删除/恢复、编辑、子任务增删/切换、BIG DEAL 折叠/重建/AI 拆步
- **记账**：记一笔 / 一句话记多笔 / 删除 / 预算设置 / 对账（多账户） / 余额设置
- **愿望**：新增 / 删除 / 收起 / 恢复 / 已实现 / 子任务增删/切换 / 进度评估 / 手动设定 / AI 拆步
- **命运抽签**：抽签 / 接受（转任务）/ 静默（旧事不再抽）
- **委托板**：领取 / 换一张 / 刷新
- **本周目标**：创建 / 修改 / 删除 / 重置 / 领取奖励
- **宣告卡**：新建 / 编辑 / 删除 / 钉选 / 归档 / 取消归档
- **据点 / 组织**：据点数据接真实 store（`pkg4-org.ts` 的 `buildView()`）；作战达成 / 据点升级庆祝通过 `GlobalOverlayHost` 挂真实弹层
- **成就 / 技能**：解锁 / 编辑 / 删除 / 赐福
- **行动记录**：新增 / 补录 / 删除（含回退点数）/ 撤销今日完成 / 配图上传与删除
- **羁绊**：新建 / 编辑 / 删除 / 亲密互动 / 通知已读 / 约定 / 塔罗冲突

## 5. 改完 adapter 之后

```bash
npx tsc --noEmit                                   # 0 错误
node scripts/p5r-red/check-copy.mjs                # RESULT: OK（adapter 改动会显示为「adapter 已改 N（允许）」）
node scripts/p5r-red/compare.mjs --base http://127.0.0.1:5173   # RESULT: PASS（验收页只用 mock，adapter 改动不影响像素）
```
