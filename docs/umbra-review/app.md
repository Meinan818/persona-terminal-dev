# app

## 哪里做不到

- **30/60fps 不能由 App 集成侧单独保证。** 帧率是 M1 技术验证、渲染引擎和真机矩阵共同决定的；App 只能保证不把主线程、DOM 和存档事务卡进演出循环，不能替代红色 P5R 方的实测基准。没有 M1 的帧率数据前，不能承诺验收标准可达成。
- **Android 16 平板和 iPadOS 26 不能依赖原生锁屏。** 策划案已经提到系统可能拒绝锁横屏；当前项目也确实没有横屏插件：`iPhone` 的 `UISupportedInterfaceOrientations` 仍只开竖屏，Android 也没有 `screenOrientation` 或 Screen Orientation 插件。因此虚拟横屏不是可选兜底，而是必须默认可用；不能把原生锁屏当作可靠性来源。
- **“首包 ≤2–3MB”在当前基线做不到。** `src/umbra/engine/p5r-compendium-data.ts` 单文件 2.2MB，`public/umbra-demo/p5r-compendium-data.js` 还保留一份近乎等大的 JS 副本；如果作为主包同步打进 App，预算会直接超标。必须拆成图鉴分片并延迟加载，且砍掉 JS 副本。
- **“规则层合并成一份 TS”目前没有完成。** `src/umbra/engine/p5-combat-rules.ts`、`p5r-battle-adapter.ts`、`p5r-compendium.ts` 三份都带 `@ts-nocheck`，标的是“机械迁移、类型收口随后续节点完成”；`public/umbra-demo` 下另有 `p5-combat-rules.js`、`p5r-battle-adapter.js` 等整套 JS。两份源码字节不一致，双份实现仍在，尚未达到单一权威规则源。
- **生活桥现在没有“生活即战力”。** `src/umbra/demoBridge.ts` 的 `demoProfileSeed` 只传主动面具、队友面具、背包、金币、素材、装备和同调面具，没有把 `attributes` 五维、今日待办/记录、SP 心之力或影时间加成一个统一快照。当前 `UmbraProfile.demo` 是 `Record<string, unknown>` 原档袋，不能作为可迁移、可对账的正式产品存档。
- **保存和奖励不是规则级原子操作。** `UmbraProfile`、`UmbraRunRecord` 分开存 Dexie，当前行程是 `payload` 通用对象；结算、消耗心之力、写回奖励若要保证“同一局只结算一次”，需要新的版本化保存结构和幂等键，现有结构只能做到，尚不能声明已经满足。

## 哪里想改

- **游戏状态不要再用 iframe + localStorage + postMessage。** 当前 `UmbraDemoFrame` 通过 iframe 加载 `/umbra-demo`，用 `localStorage` 的 `storage` 事件把状态写回正式 store，再用 `postMessage` 接 AI。建议新引擎作为同源 TypeScript 模块直接挂进一个 React 容器，走带类型的 `UmbraRuntimeBridge`：父层传快照，子层回 `commitRun`、`spendHeartPower`、`notifyError`、`exit`。这样能去掉 iframe 生命周期、跨文档存储时序和双重状态源；AI 自由交涉如果还想隔离，可以单独保留 postMessage，不要让战斗和存档走它。
- **用版本化 `UmbraSaveV4` 替代 `UmbraProfile.demo` 原档袋。** 建议把“永久资源”和“一局行程”分开，但共同带 `schemaVersion`、`checkpointId`、`updatedAt` 和幂等键；结算结果先写 Dexie 事务，再通知皮肤演出。皮肤异常、切后台、连点都只影响画面，不影响已提交结果。
- **规则层必须引擎权威，皮肤只能订阅演出。** 建议把 `action:hit`、`allout:start` 这类事件改成可等待但可超时/可跳过的展示订阅；规则侧不因皮肤未实现或 Promise 异常而改变胜负、掉落或消耗。主题差异只落在 `skins` 包，不能形成四套并行规则。
- **生活桥改成只读派生快照和确定性种子。** App 层负责把五维 points/level 平滑映射成属性上限，把当天待办/记录生成 1–2 张开局卡（按日期 key 和局种子确定性抽取），把影时间变成倍率/限定敌表；心之力消耗只在规则返回合法结果后走 store action。皮肤不直接读 App 表。
- **横屏和刘海用原生插件 + 虚拟横屏双保险。** 建议新增一个自定义 Capacitor 插件统一 lock/unlock 和沉浸模式，退出游戏恢复竖屏；安全区继续用 `env(safe-area-inset-*)` + `ResizeObserver` 读取实际视图，不必通过 postMessage 传固定数值，避免横竖切换后 stale 值。
- **只保留一份规则和一份图鉴数据。** 以 `src/umbra/engine` 的 TS 为权威，删掉 `public/umbra-demo` 对应 JS，去掉 `@ts-nocheck`，2.2MB 图鉴改为分片 JSON/动态 import。旧 `umbra-demo` 在 M5 下线，不再作为默认入口。
- **切换只加载当前主题。** 新宿主入口由 App 主题决定一个 `skinId`，只 import 当前皮肤包；取消默认 iframe 同时加载整套 demo 的路径。保留开发用 `?umbra=` 逃生口，M5 后移除默认双路径。

## 自己那部分工作量

按单人估算，不含 M1 技术验证、红色皮肤/引擎框架和三套主题素材，只算 App 负责的规则层、生活桥、原生桥、宿主入口和集成回归：

- 规则层 TS 收口、类型清理、去双份、无头模拟器、数值重平衡：12–18 人日。
- 生活桥快照、五维换算、今日卡、心之力事务、版本化保存与迁移：6–9 人日。
- 原生横屏/沉浸模式、iOS `requestGeometryUpdate`、虚拟横屏和安全区适配：4–7 人日。
- 宿主入口替换、皮肤注册与按需加载、旧 demo 下线：5–8 人日。
- 仓库集成、Dexie 事务、备份/云同步、回归测试和浏览器/真机边界：7–12 人日。
- M3 垂直切片中 App 侧的接线和验收支持：3–5 人日。

总计约 **37–59 人日**，更现实的排期中位数约 **45 人日**；其中规则层是最大不确定项，其次是真机横屏与存档迁移。若只做“红色垂直切片能跑通”的最小 App 集成，先按 **12–18 人日**排，等 M1 帧率和 M3 契约冻结后再给精确数。
