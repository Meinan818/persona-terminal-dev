# 幽影协议 UMBRA · 主策划决定记录

执行方遇到任务书没写到的取舍，以本文件为准。新在上。

## D-004 敌人数量不写死（10-22 04:20）
- 旧版写死：public/umbra-demo/p5-battle-bridge.js 只生成主敌+副敌（BOSS 单只）；src/umbra/engine/p5-combat-rules.ts createDefaultBattle 默认两只。
- 新规：遭遇由 rules/encounter 遭遇表生成，1–5 只（杂兵 1–4、精英 1 精英+0–2 随从、BOSS 1+0–2 召唤物），按楼层/警戒度加权随机；P3/P4 原作常见 1–5 只。
- 战斗、HOLD UP、总攻、交涉、敌人意图全部遍历 enemies 数组，禁止用 a/b 固定 id 或下标 0/1。
- 皮肤：每皮提供 enemyLayouts[1..5] 站位（横屏 x/y/缩放/层级），5 只也不得与指令区/队伍卡重叠。
- 验收：测试覆盖 1、3、5 只敌人各一场完整流程。

## D-003 探索改 P5T 式 Q 版格子关卡（10-22 03:59，用户拍板）
- 潜入节点内是 Q 版格子小关卡：走位、掩体潜行、背后偷袭、巡逻视线、宝箱机关交涉点。
- 战斗不变：碰敌后切到真人立绘官方素材回合制战斗（M3 样板继续）。
- 必战：每张格子关卡出口被「守门阴影」封住，须击败或 HOLD UP 交涉才开门；主路线含 1 场精英必战+BOSS；潜行只决定先手/被偷袭，不能整局绕开。一局最少约 4 场战斗。
- 四皮同规则不同画面；新事件 explore:move/cover/spotted/interact，见 docs/umbra-design/FX-MAP-v1.md §F。
- App：规则层新增 rules/explore（格子、视线、掩体），与战斗规则分开；不影响已完成的战斗/图鉴/存档。

## D-002 图鉴分片：同步读取 + 异步预载（2026-10-22 03:20 CST）
问题：getPersona/getSkill 同步，而图鉴 2.2MB 要分片动态 import（异步）。
决定：采用「异步预载 + 同步读取」，不改现有同步签名。
1. 保留 `getPersona(id)` / `getSkill(id)` 同步，供规则层与战斗热路径用。
2. 新增 `ensureCompendium(req: { personas?: string[]; skills?: string[] }): Promise<void>`：按 id 找所属分片，动态 import 并写入内存缓存；同一分片并发去重；已加载立即 resolve。
3. 启动只加载索引（id→分片映射 + 名称/阶级等列表字段）。
4. 调用时机：存档载入/潜入开始时预载当前队伍所有人格面具及其技能；`map:encounter` 时预载本场敌人与其技能（计入 `map:encounter + battle:start ≤1.2s` 组合预算）；合成/图鉴页面打开时按页预载。
5. 未预载就同步读取：开发环境抛错（带 id 与调用栈），生产环境记日志并返回 undefined，调用方必须处理。
6. 测试：加「未预载读取抛错」「并发预载只 import 一次」「预载后同步可读」三项。
7. 分片方式：按人格面具阿尔卡纳/技能属性分文件，单片 gzip ≤120KB；不复制、不手改原数据，用脚本生成分片。

## D-001（10-22 02:40）旧 umbra-demo 的重复 JS 怎么处理
- 问题：任务书 ①「删 public/umbra-demo 重复 JS」与「旧 umbra-demo 入口保持可用到 M5」冲突（App 提出）。
- 决定：**本阶段不删**。`public/umbra-demo/` 整个目录冻结为旧版只读：不改、不修 bug、不跟新规则同步。新引擎、新入口、测试一律只引用 `src/umbra/engine` 的 TS，任何新代码不得引用 `public/umbra-demo` 下的 JS。
- 单一规则源的验收口径改为：新代码路径里只有一份 TS 规则。旧 JS 视为旧版产物，不算第二份。
- 删除时机：M5 下线旧入口时，与 `public/umbra-demo` 一起整体删除。
- App 现在要做：在 `public/umbra-demo/` 放一个 `FROZEN.md` 写明上述规则；继续收口剩余 `@ts-nocheck` 模块。
