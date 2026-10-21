# 幽影协议 UMBRA · 主策划决定记录

执行方遇到任务书没写到的取舍，以本文件为准。新在上。

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
