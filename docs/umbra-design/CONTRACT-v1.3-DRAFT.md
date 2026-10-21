# 契约 v1.3 修订草案（主策划，2026-10-22 03:55，待 M3 第二阶段结果后定稿）
基于 CONTRACT-v1.2.md，只列增改。依据：M3 第一阶段报告三项契约问题 + FX-MAP-v1 缺口。

## 1. 槽位
- hud.system 改为 x 990–1256、y 24–110（原 256×66 放不下 3 个 ≥86 命中区；红黄蓝粉四皮都撞到）。

## 2. 时长计算
- recipe 校验口径：duration + 所有 hitStop 停帧之和 ≤ 事件上限（停帧冻结演出时钟，实际耗时会超）。skin:check 与引擎同口径。
- recipe 可写 `match.side: "ally" | "enemy"`，action 我方/敌方分别取上限 1.8s / 1.5s。

## 3. 新增事件（FX-MAP-v1 §D）
| 事件 | payload | 完整/标准 | 极简 | 调度 |
|---|---|---|---|---|
| baton | fromId, toId, bonus | 0.6s | 0.25s | 主线阻塞 |
| persona:switch | unitId, personaId | 0.5s | 0.2s | 主线阻塞 |
| shield:break | unitId, layersLeft | 0.5s | 0.2s | 重叠层 |
| levelup | unitId, statsDelta | 1.0s | 0.4s | 主线阻塞（战斗结算后） |
| card:pick | cards[] | 0.6s | 0.3s | 主线阻塞，之后 DOM 选择 |
| buff:grant | buffs[], source | 0.8s | 0.3s | 主线阻塞（开局） |
| boss:phase | phase | 2.0s | 0.6s | 主线阻塞，可跳过 |
| fusion:result | personaId | 3.0s | 1.0s | 主线阻塞，可跳过（天鹅绒，非战斗） |
皮肤未实现 → 引擎默认演出兜底（红色样板通用版）。

## 4. 新增引擎原语
- summon：读 `$actorPersona`（引擎按行动者当前面具解析素材 id `persona.<id>`），参数 style: maskRip | evoker | tarot。
- eyeStrip、onomatopoeia、glassShatter、checkerFloor、ringSplash（P3 系）；blockPush、tvStatic、dateFlip、cardFlip（已在 v1.2 名单，M3 第二阶段实现）。
- 名单驱动素材引用：`$actor.portrait`、`$actor.cutin`、`$actor.finish`、`$actor.persona`，素材按角色 id 懒加载，不进首包。

## 5. 命中结果分支
- action recipe 可按 `match.hit: weak|crit|resist|drain|repel|miss` 选命中段子 recipe（P3 系弱点/暴击 cut-in、P4 星星字都挂这里）。

## 6. 预留玩法模式
- battle:start 增加 `mode: "turn" | "tactics"`（默认 turn）。tactics 预留事件 unit:move、cover:take、triplethreat，皮肤未实现走引擎兜底。
