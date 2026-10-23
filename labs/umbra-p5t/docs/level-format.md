# 关卡 JSON 格式（Q4）

权威数据：`umbra-assets/specs/levels/Lxx.json`（Hark 用 `gen_levels.py` 生成）。引擎侧原样复制到 `src/game/levels/`，**不手改**。
读取器：`src/game/level.ts`（`loadLevel(json) → MapDef`、`validateLevel(json) → 错误列表`、`cellAt(json,x,y)`）。
关卡列表：`src/game/levels/index.ts`（`LEVEL_JSON`、`levelMap('L01')`）。

## 坐标
`(x, y)`：x 从左到右，y 从上到下。所有 `[x, y]` 数组读进来变 `{x, y}`。最大 **32 × 40**（宽 × 高），高度 **0–3 层**。

## 地块（队列 Q4 的 `tiles[x][y] = {height, cover, zone}`）
JSON 用三张等大的「行字符串」图（下标 `[y]`，每行字符下标 `x`），读取器合成一格：

| 字段 | 字符 | 含义 |
|---|---|---|
| `tiles` | `.` 地面 `#` 墙 `h` 半掩体 `H` 全掩体 `E` 出口 | cover：`h`=half、`H`=full，其余 none；门格写 `.`，门关着时当墙 |
| `heights` | `0`–`3` | 层数；缺省全 0 |
| `zones` | `A`–`Z` | 区域字母；有 zones 时 `unlockedZones` 缺省 `["A"]` |

`cellAt(json, x, y)` 返回 `{kind, height, cover: 'none'|'half'|'full', zone}`。

## 顶层字段
| 字段 | 说明 |
|---|---|
| `id` `name` `scene` `width` `height` | 基本信息（scene 给美术用） |
| `party` | `[[角色id, x, y], …]`，角色 id：joker skull panther mona fox queen noir erina kasumi crow |
| `party_extra` | 同上，额外我方（如护送对象 `toshiro`，读成 `TOSHIRO_ESCORT`） |
| `reserves` | 替补角色 id 列表（Baton Pass） |
| `win` | 胜利条件，见下 |
| `lose` | 败北条件数组：`{type:'allKo'}`、`{type:'unitKo',unitId}`、`{type:'turnLimit',n}` |
| `objective` `turnTarget` `bonus` | 目标文字、皇冠回合、三星条件（`clear` / `withinTurns{n}` / `noKo` / `defeatAll` / `hurtFewerThan{n}`） |
| `doors` | `{id, cells:[[x,y]…], open, everyTurns?}` |
| `switches` | `{id, pos, kind:'toggle'|'hold'|'elevator', doors?:[门id], elevator?:升降台id}` |
| `elevators` | `{id, cells, low, high, up}` |
| `links` | `{a, b, kind:'ladder'|'jump'}` 梯子 / 跳台（Dash） |
| `cameras` | `{id, pos, cells, spawn:[单位], damage?}` 我方踏入 cells → 警报刷出 spawn |
| `chests` | `{id, pos, reward:{gp:3,…}}` 走上去 = 拿到，奖励记账 |
| `props` | `{id, kind:'box'|'barrel'|'speaker'|'flag', pos, hp?, aura?, bans?}` |
| `enemies` | 单位数组，见下 |
| `events` | `{id, when, do:[动作], repeat?}`，见下 |
| `reinforcements` | （队列格式，可选）`[{turn?, phase?, trigger?, units}]`，读成 events（turn 缺省 phase=enemy） |
| `unlockedZones` | 开局解锁区域 |

## 单位（enemies / spawn / camera spawn）
`{id, name, role, hp, pos, zone?, isLeader?, isTarget?, protected?, staysInZone?, aiTarget?, gunRange?, hpFloor?, bossPhase?, facing?}`
- `role`：shooter brute revenger shielder teleporter launcher supporter（决定 AI，见 specs/ENEMY-AI.md）
- `hp:"PH"` → `PH_HP[role]`（data.ts 现有 enemy() 同 role 默认：shooter/teleporter 60、brute/shielder 70、revenger/launcher 80、supporter 55）。攻击/移动 = enemy() 同 role 默认。
- `hpFloor`：**比例**（0.5 = 锁在 50%），读成绝对 HP `floor(maxHp × 比例)`；事件 `setUnit.patch.hpFloor: 0` 解除。
- `gunRange`：覆盖枪射程。`facing:[dx,dy]`：盾兵朝向。
- `protected`：打到 HP 1 停住，不会被打倒（Down）、不给 1 MORE。
- 增援（spawn）单位没有 zone → 始终激活；同 id 重复刷（如 `rN`/`sN`）自动加后缀 `_2`、`_3`…

## 胜利条件（`win`）——P5T 7 类
| # | 类型 | JSON |
|---|---|---|
| 1 | 全灭 | `{type:'defeatAll'}` |
| 2 | 限时全灭 | `{type:'defeatAll'}` + `lose:[…,{type:'turnLimit',n}]` |
| 3 | 击破指定 Boss | `{type:'defeatTarget', targetId}` 或 `targetIds:[…]` |
| 4 | 全队抵达 / 护送 | `{type:'reachExit', all:true}` / `{type:'reachExit', unitId}`（护送 NPC 另配 `lose unitKo`） |
| 5 | 破坏物体 | `{type:'defeatTarget', targetIds:['flag']}`（flag 是 props 里的敌方红旗） |
| 6 | 生存 N 回合 | `{type:'survive', turns:N}` |
| 7 | 保护式全灭 | `{type:'defeatAllExcept', exceptIds:[…]}` + `lose unitKo` |

## 事件
触发 `when`：`turn{turn,phase?}`、`hpBelow{unitId,ratio}`、`enemiesLeft{n}`、`unitKo{unitId}`、`reach{pos,side?}`、`flag{flag}`、
`doorOpened{id}`、`zoneCleared{zone}`、`enterZone{zone,side?}`、`everyTurns{n,phase?,whileAlive?,flag?}`。
动作 `do`：`spawn{units}`、`message{text}`、`door{id,open}`、`unlockZone{zone}`、`moveUnit{unitId,pos}`（瞬移，被占找最近空格）、
`setUnit{unitId,patch,healRatio?,bossPhase?}`（patch.skills 为技能 id 列表）、`setWin{win,objective?}`、`setFlag{flag}`、`end{outcome}`。
每个事件执行时自动 `setFlag(自己的 id)`（供 `everyTurns.flag` 用）。`repeat:true` 的 `everyTurns` 每个满足的回合只触发一次。
