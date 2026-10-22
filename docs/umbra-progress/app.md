# App · UMBRA M2 进度

当前节点：v1.3 已按 TASK-APP-v1.3.md 完成步 1–4（契约类型 49 事件/17 原语、时长上限表、Director 重叠/A 类/可跳过、HOLD UP 三选一事件序列）；步 5–7 待接，依赖皮肤包/音频与 GPU 视觉验收。

分支：`feat/umbra-app-m2`（基于 `origin/feat/theme-kit-integration`）。

## v1.3 进度（TASK-APP-v1.3.md）

- 步 1 契约类型：`src/umbra/skins/_contract/{recipe,skin,index}.ts`，49 事件名（含 `holdup:result`）、53 原语（含 `camera`/`holdupRing`）、payload、`Recipe.sfx/bgm`、`match` 扩展、`ManifestAsset.group/frames`、`fonts.unicodeRange`、`roster.showtime`。旧 `contract.ts` 转为兼容层。
- 步 2 时长上限：`director.ts` 的 `CAPS` / `capKey` / `capOf` / `wallMs`，含探索按格数与 2000ms 封顶、hitStop 计入墙钟。
- 步 3 Director：重叠层优先级（unit:down > shield:break > ailment:*）、A 类旁路、可跳过名单、`skip` 清场。
- 步 4 规则事件：`P5Battle.emit` + HOLD UP 三选一（allout/talk/release）→ `holdup → holdup:result → allout/talk:start/unit:flee+battle:end`，连点幂等，1/3/5 敌覆盖。
- 步 6 音频核心：`src/umbra/audio/audioBus.ts`（缺文件静默、三档音量、解锁、voiceLine）+ `bgm.ts`（`bgm:cue` 条件键最多胜出、权重随机、noRepeat、prefs off/lock）。

## 皮肤包 v1 合并与接线

- 已合并 `origin/feat/umbra-skins-v1`（`01bf490`）：四皮 `src/umbra/skins/{p5r-red,p3-blue,p3r-pink,p4-yellow}/` + `tools/umbra-skins/build_packs.py` + `skinPacks.test.ts`。
- 接线 1：`SkinRoster.partyDefault?` + `partyFromRoster` 优先读初始三人，回退 `companions.slice(0,3)`。
- 接线 2：新增 `src/umbra/engine/companionPersonas.ts` 同伴专属面具数据表（captain-kidd/io/jiraiya 等 24 个），经 `registerSyntheticPersona` 注册，`buildBattlePersona` 不再过滤；`createDefaultBattle` 建队前注册。

验收：`tsc --noEmit` 0 错误；`src/umbra` 34 文件 / 171 项通过；`npm run skin:check` 四皮全 OK。

## 待接（v1.3 步 5–7）

- 步 5 引擎原语（17 个 Pixi 原语 + camera + holdupRing）：样板在 `origin/feat/umbra-skin-p5r-red:labs/umbra-m3-red/src/umbra/engine/`（16 文件），移植量大；本机无 GPU、红色皮肤包未进 `src/umbra/skins/`，无法按任务书截图验收。
- 步 6 剩余：present.json 生成脚本、设置页三档音量写档、首包不含音频的构建排除，依赖 `skins/<id>/audio/` 音频文件（D-008，尚未入库）。
- 步 7 skin:check 新校验：可在皮肤包就位后补事件/原语名单、wallMs、labels、音频引用与 hud 命中区校验。

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

- `node node_modules/vitest/vitest.mjs run src/umbra --reporter=dot`：31 文件 / 120 项通过。
- 全仓 `node node_modules/vitest/vitest.mjs run --reporter=dot`：90 文件 / 481 项通过。
- `npx tsc --noEmit`：exit 0。
- `npm run build`：`✓ built in 29.52s`，PWA 生成成功（exit 0）。

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
- 100 局公平敌人表：basic 35/0/0，weakness 89/76/14，advanced 88/77/10；advanced 与 weakness 已同构，需补真实加成机制再重跑。
- 2000 局正式表已达标：basic 32.9/0/0，weakness 88.5/67.2/41.4，advanced 95.7/87.9/81.0。

## D-005 · 主题归属

- `SkinRoster` 增加 `heroPersona`（主角初始面具）；`rules/rosterParty.partyFromRoster` 从 roster 推导主角与同伴面具，规则层不写死角色 id。
- `createDefaultBattle` 接受可选 `roster`，拿到皮肤包时从 `partyFromRoster` 建队；`catalogPersonaChoicesForSkin(skinId)` 按 `excludedPersonas` 过滤图鉴选择。
- 合成结果按皮肤过滤：`resolveFusionForSkin` / `fusionResultForSkin` 会拒绝落在 `excludedPersonas` 的结果。
- 默认档案初始队伍也按皮肤推导：`createDefaultUmbraCombatForSkin(skinId)` / `createDefaultUmbraCombatFromRoster(roster)`，未注册皮肤时保留演示默认值。
- 注册表提供 `rosterAllowsPersona` / `companionPersonaFor`。

## D-007 · 据点商店

- `src/umbra/rules/shop.ts`：四类店固定 id（weapon/item/clinic/velvet），货币只用 ¥ / 素材 / 心之力；价格、库存、档位由数据表驱动。

## 遭遇预载

- `encounterPersonaIds` + `preloadEncounter`：从遭遇规格提取唯一 Persona，在 `map:encounter` 演出预算内调用 `ensureCompendium`。

## 探索事件

- `exploreDirectorEvent`：把 `explore:move/cover/spotted/interact` 映射为 Director 主线事件并按倍速缩放。

## 动态皮肤加载

- `src/umbra/skins/loaders.ts`：按 `skins/<id>/index.ts` 自动注册皮肤 loader，`themeLoader` 启动时加载。

## 探索局外规则

- `src/umbra/rules/exploreSession.ts`：记录 mob/elite/guardian/boss 战果，出口需守门阴影已败且累计 ≥4 场。

## 探索执行器接口

- `src/umbra/rules/exploreRuntime.ts`：覆盖移动、掩体、发现、交互四类探索动作并返回 Director 事件。

## 探索关卡规划器

- `src/umbra/rules/explorePlanner.ts`：按种子生成节点序，保证 1 精英 + 1 守门阴影 + 1 BOSS，战斗数 ≥4。

## 探索遭遇生成

- `src/umbra/rules/exploreEncounter.ts`：把规划节点映射为 `generateEncounter`，战斗节点生成 1–5 只，非战斗节点返回 null。

## 探索 Run

- `src/umbra/rules/exploreRun.ts`：把规划、遭遇与局外会话串成 `index/session` 状态机，逐节点推进并判定离场。

## 探索 Director

- `src/umbra/rules/exploreRunDirector.ts`：`directorEventsForExploreNode` 按当前节点生成 Director 事件序列；战斗节点为 `map:encounter`(main) + `battle:start`(overlap)，按 D-002 组合预算拆分，其余为 explore 事件。渲染层只需驱动返回的事件数组。

## 待接 · D-005 皮肤 roster 接线

- 机制已就绪：`SkinRoster`（`heroPersona` / `companions` / `companionPersonas` / `excludedPersonas`）、`partyFromRoster`、`catalogPersonaChoicesForSkin`、`fusionResultForSkin`、`createDefaultBattle` 与默认档案的 roster 建队。
- 剩余内容依赖主题方：`src/umbra/skins/` 下还没有四份 `skins/<id>/index.ts` 皮肤包（各皮主角初始面具、同伴名单、同伴专属面具、`excludedPersonas`、`compendiumArt`）。
- 处理：机制已可接入；等四皮皮肤包提供实际 roster 内容后，切皮建队与图鉴过滤即生效，不再写死角色 id。App 侧不擅自写死各皮同伴名单。
