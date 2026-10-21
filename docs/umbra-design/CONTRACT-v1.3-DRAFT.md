# 契约 v1.3 修订草案（主策划，2026-10-22 03:55，待 M3 第二阶段结果后定稿）
基于 CONTRACT-v1.2.md，只列增改。依据：M3 第一阶段报告三项契约问题 + FX-MAP-v1 缺口。
10-22 04:55 追加：§3b 第二批事件（SYSTEMS-AUDIT-v1 §5 + D-006/D-007/D-008）、§7 sfx/bgm 字段。全部标「v1.3 提案」，未定稿。

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

## 3b. 新增事件 · 第二批（v1.3 提案；演出见 FX-MAP-v1 §G）
| 事件 | payload | 完整/标准 | 极简 | 调度 | 状态 |
|---|---|---|---|---|---|
| shop:enter | shopId, skinShopId, firstVisitToday | 完整 1.2s / 简短 0.5s | 0.3s | 主线阻塞，之后店主界面 DOM | v1.3 提案 |
| shop:exit | shopId, purchased | 0.6s | 0.25s | 主线阻塞 | v1.3 提案 |
| party:switch | outId, inId | 0.5s | 0.2s | 主线阻塞 | v1.3 提案 |
| bond:assist | kind(followup/protect/endure/cure/lift), unitId | 0.8s | 0.3s | 主线阻塞 | v1.3 提案 |
| ailment:apply | unitId, status | 0.4s | 0.15s | 重叠层 | v1.3 提案 |
| ailment:cure | unitId, status | 0.4s | 0.15s | 重叠层 | v1.3 提案 |
| escape | result(success/fail) | 0.6s | 0.25s | 主线阻塞 | v1.3 提案 |
| velvet:alarm | — | 0.8s | 0.3s | 主线阻塞（据点） | v1.3 提案 |
| fusion:accident | resultId | 1.0s | 0.4s | 主线阻塞，接 fusion:result 前 | v1.3 提案 |
| callingcard:send | targetId | 3.0s | 1.0s | 主线阻塞，可跳过 | v1.3 提案 |
| explore:scan | — | 起效 0.4s，显示 ≤2s | 0.2s / ≤2s | 起效段阻塞，显示段不阻塞 | v1.3 提案 |
| achievement:unlock | id | — | — | DOM 角标，不进 Director | v1.3 提案 |
| levelup | unitId, statsDelta | 1.0s | 0.4s | 主线阻塞（战斗结算后；D-006 确认，已在 §3） | v1.3 提案 |
| persona:levelup | personaId, newLevel, learned[] | 0.8s | 0.3s | 主线阻塞（结算后，接 levelup） | v1.3 提案（D-006 推导） |
| bond:rankup | unitId, rank, unlocked[] | 1.5s | 0.5s | 主线阻塞，可跳过（据点/App） | v1.3 提案（D-006 推导） |
| bgm:cue | cueId \| null, crossfadeMs?, loop? | 不占 Director 时钟；淡化 战斗→胜利 ≤300ms、其余 ≤1000ms | 同 | 音频总线 | v1.3 提案（D-008） |

## 4. 新增引擎原语
- summon：读 `$actorPersona`（引擎按行动者当前面具解析素材 id `persona.<id>`），参数 style: maskRip | evoker | tarot。
- eyeStrip、onomatopoeia、glassShatter、checkerFloor、ringSplash（P3 系）；blockPush、tvStatic、dateFlip、cardFlip（已在 v1.2 名单，M3 第二阶段实现）。
- 名单驱动素材引用：`$actor.portrait`、`$actor.cutin`、`$actor.finish`、`$actor.persona`，素材按角色 id 懒加载，不进首包。

## 5. 命中结果分支
- action recipe 可按 `match.hit: weak|crit|resist|drain|repel|miss` 选命中段子 recipe（P3 系弱点/暴击 cut-in、P4 星星字都挂这里）。

## 6. 预留玩法模式
- battle:start 增加 `mode: "turn" | "tactics"`（默认 turn）。tactics 预留事件 unit:move、cover:take、triplethreat，皮肤未实现走引擎兜底。

## 7. sfx / bgm 字段（v1.3 提案，D-008）
- 任意 recipe 可写 `sfx: [{ id, at, bus }]`：id 指皮肤音效池（skins/<id>/assets/official/audio/），at 为 recipe 内毫秒，bus = se | voice；停帧期间不推进。未写 → 引擎按 FX-MAP §H 默认 sfx。
- 场景类 recipe 可写 `bgm: { cueId, crossfadeMs }`，等价于发 bgm:cue。
- 皮肤提供 `audio.cues: Record<cueId, { src, loopStart, loopEnd }>`；cueId 名单见 FX-MAP §G4。音频 Opus/AAC 流式、不进首包、响度 −16 LUFS。
- skin:check 校验：sfx id / cue 的 src 存在；缺失只告警不失败（引擎静音兜底）。
