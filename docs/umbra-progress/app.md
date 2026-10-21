# App · UMBRA M2 进度

当前节点：D-006 sim:balance 初步建立并调参；常规测试 12 项通过、tsc exit 0。

分支：`feat/umbra-app-m2`（基于 `origin/feat/theme-kit-integration`）。

## 已完成

- 新增规则层无头模拟器 `src/umbra/engine/headless-simulator.ts`：确定性 PRNG、basic / weakness / random 三种策略，不依赖 DOM、Pixi、React 或本地存储。
- 新增测试 `src/umbra/engine/__tests__/headless-simulator.test.ts`：4 项通过。
- 去掉 `src/umbra/engine/p5r-compendium.ts` 的 `@ts-nocheck`，补齐图鉴查询、合成、校验与摘要函数的显式类型。
- 去掉 `src/umbra/engine/p5r-battle-adapter.ts` 的 `@ts-nocheck`，补齐 Persona/技能适配与合成函数的显式类型。
- 去掉 `src/umbra/engine/p5-combat-rules.ts` 的 `@ts-nocheck`，补齐 `P5Battle` 字段、方法与规则对象的显式类型。
- 按 D-001 在 `public/umbra-demo/FROZEN.md` 写明旧 demo 目录冻结到 M5。
- 收口 `economy-rules.ts`、`equipment.ts`、`inventory.ts`、`loot-rules.ts`、`floor-map.ts`、`tower-layout.ts` 的显式类型，并清掉 `p5r-compendium-data.ts` 末尾的死 `@ts-nocheck`。
- 新增 ③ 的纯契约层：`src/umbra/env.ts`、`src/umbra/saveV4.ts`、`src/umbra/runtimeBridge.ts`，定义 `UmbraEnv`、`UmbraSaveV4` checkpoint 幂等键和 `UmbraRuntimeBridge` 快照。
- `npx tsc --noEmit` 通过。

## 验收结果

- `node node_modules/vitest/vitest.mjs run src/umbra/engine/__tests__/headless-simulator.test.ts --reporter=dot`：4/4 通过。
- `node node_modules/vitest/vitest.mjs run src/umbra --reporter=dot`：10 文件 / 54 项通过。
- `node node_modules/vitest/vitest.mjs run src/umbra --reporter=dot`：11 文件 / 60 项通过（含 runtimeBridge 6 项）。
- `npx tsc --noEmit`：exit 0。

## 下一步

- 步骤 ① 的“单一 TS 源”中，三份核心规则 TS 已全部去掉 `@ts-nocheck`。
- `src/umbra/engine` 下已无 `@ts-nocheck`。
- 之后处理 `public/umbra-demo` 重复 JS；删除前等主策划确认旧入口策略。

## 待主策划答复

- **② 图鉴分片懒加载与同步接口冲突**：`getPersona(id)` / `getSkill(name)` 是同步纯函数，动态 `import()` 分片是异步。若启动只加载索引，未加载分片时同步查询无法阻塞等待，必须三选一：A) 接口改为异步或增加 `ensureCompendiumLoaded()` 预载；B) 保留同步接口但启动同步加载全部分片（体积拆分、不真懒加载）；C) 只把非查询的大表做异步预载，战斗 Persona/技能仍同步预载。答复前不复制数据、不改数据文件。
- 当前契约冲突需主策划拍板：任务书既要求删除重复 JS，又要求旧 `umbra-demo` 入口保持可用到 M5。旧入口直接 import 这些 JS，直接删除会让回退入口失效；在明确“M5 前是否允许旧入口改用新引擎或只保留最后一版构建快照”之前，暂不删文件。

- 按 D-002 完成图鉴分片：`scripts/generate-compendium-chunks.mjs` 生成 24 个 Persona 分片、16 个技能分片和索引；运行时 `compendiumPreload.ts` 支持异步预载、并发去重与同步读取，`getPersona/getSkill` 签名不变。
- 图鉴体积：索引 151,002 B，最大单分片 gzip 8,926 B（上限 120KB）。
- 全量 `src/umbra`：12 文件 / 63 项通过。
- 全量 `src/umbra`：15 文件 / 73 项通过。
- Bridge 已接 Dexie：新增 `src/umbra/dexieBridge.ts`，把 `UmbraRuntimeBridge` 映射到现有 `saveUmbraProfile` / `saveUmbraRun`，checkpoint 幂等键写入 `run.payload.checkpoints`。
- Director 纯调度核心已落：`src/umbra/director.ts` 支持倍速时长、主线/重叠层、输入缓冲保留最新 2 条、action key 幂等和 `env:change` 空闲接续。
- 皮肤契约/注册表已落：`src/umbra/skins/contract.ts`、`src/umbra/skins/registry.ts`；安全区与虚拟横屏坐标变换在 `src/umbra/layout.ts`。
- `skin:check` CLI 已落：`scripts/skin-check.mjs` + `npm run skin:check`，校验 pack schema、时长预算、source、字体 120KB 与 import 白名单。

## D-003 · 后续任务

- 新增 `rules/explore`：P5T 式 Q 版格子关卡、走位、掩体、巡逻视线、背后偷袭、宝箱机关交涉点；必战守门阴影 + 1 场精英 + BOSS。
- 事件清单按 FX-MAP §F：`explore:move` / `explore:cover` / `explore:spotted` / `explore:interact`，复用现有 `map:encounter(ambush)`。
- 规则层与战斗规则分开，不影响已完成的战斗/图鉴/存档；四皮同规则不同画面。

## D-004 · 后续任务

- `rules/encounter` 按楼层/警戒度生成 1–5 只；`createDefaultBattle` 默认不再写死两只。
- 战斗、HOLD UP、总攻、交涉、意图遍历 `enemies` 数组；补 1/3/5 只完整流程测试。

## D-006 · 平衡模拟

- 已建立 `npm run sim:balance`、`src/umbra/balance`、`docs/umbra-progress/balance.md`。
- 首次 500 局小样本胜率表已写入 `docs/umbra-progress/balance.md`；当前普攻杂兵/精英仍偏高、弱点打法偏低，继续调 `rules/combatNumbers.ts` 与 `balanceData.ts`。
- 100 局当前表：basic 35/0/0，weakness 89/80/11，advanced 94/14/3；目标尚未全达标，重点还差 elite/boss 的 advanced。
