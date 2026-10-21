# App · UMBRA M2 进度

分支：`feat/umbra-app-m2`（基于 `origin/feat/theme-kit-integration`）。

## 已完成

- 新增规则层无头模拟器 `src/umbra/engine/headless-simulator.ts`：确定性 PRNG、basic / weakness / random 三种策略，不依赖 DOM、Pixi、React 或本地存储。
- 新增测试 `src/umbra/engine/__tests__/headless-simulator.test.ts`：4 项通过。
- 去掉 `src/umbra/engine/p5r-compendium.ts` 的 `@ts-nocheck`，补齐图鉴查询、合成、校验与摘要函数的显式类型。
- 去掉 `src/umbra/engine/p5r-battle-adapter.ts` 的 `@ts-nocheck`，补齐 Persona/技能适配与合成函数的显式类型。
- `npx tsc --noEmit` 通过。

## 验收结果

- `node node_modules/vitest/vitest.mjs run src/umbra/engine/__tests__/headless-simulator.test.ts --reporter=dot`：4/4 通过。
- `node node_modules/vitest/vitest.mjs run src/umbra --reporter=dot`：10 文件 / 54 项通过。
- `npx tsc --noEmit`：exit 0。

## 下一步

- 继续去掉 `src/umbra/engine/p5-combat-rules.ts` 的 `@ts-nocheck`；该文件 `P5Battle` 类字段和方法的类型缺口较大，已恢复原标记，留作下一节点单独收口。
- 之后处理 `public/umbra-demo` 重复 JS；删除前等主策划确认旧入口策略。
- 当前契约冲突需主策划拍板：任务书既要求删除重复 JS，又要求旧 `umbra-demo` 入口保持可用到 M5。旧入口直接 import 这些 JS，直接删除会让回退入口失效；在明确“M5 前是否允许旧入口改用新引擎或只保留最后一版构建快照”之前，暂不删文件。
