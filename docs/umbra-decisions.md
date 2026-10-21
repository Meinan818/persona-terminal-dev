# 幽影协议 UMBRA · 主策划决定记录

执行方遇到任务书没写到的取舍，以本文件为准。新在上。

## D-001（10-22 02:40）旧 umbra-demo 的重复 JS 怎么处理
- 问题：任务书 ①「删 public/umbra-demo 重复 JS」与「旧 umbra-demo 入口保持可用到 M5」冲突（App 提出）。
- 决定：**本阶段不删**。`public/umbra-demo/` 整个目录冻结为旧版只读：不改、不修 bug、不跟新规则同步。新引擎、新入口、测试一律只引用 `src/umbra/engine` 的 TS，任何新代码不得引用 `public/umbra-demo` 下的 JS。
- 单一规则源的验收口径改为：新代码路径里只有一份 TS 规则。旧 JS 视为旧版产物，不算第二份。
- 删除时机：M5 下线旧入口时，与 `public/umbra-demo` 一起整体删除。
- App 现在要做：在 `public/umbra-demo/` 放一个 `FROZEN.md` 写明上述规则；继续收口剩余 `@ts-nocheck` 模块。
