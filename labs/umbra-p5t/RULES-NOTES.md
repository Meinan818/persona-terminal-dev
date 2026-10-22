# 幽影协议 P5T 规则原型 · 规则说明与「与原作差异清单」

2026-10-22 · 分支 feat/umbra-p5t · labs/umbra-p5t · 第 1b 步（在 d4f07a0 基础上补机制）
规则层：`src/rules/`（纯 TypeScript，零 DOM、零画布，只发事件）；测试：`tests/rules.test.ts`（vitest 59 项）。
主策划决定（10-22）：掩体按原作（贴掩体即 Resistance，侧面也有；`coverModel:'directional'` 保留但默认关）；枪默认不限弹数（照原作）。
标记约定：**[源]** = 有公开资料出处；**[PH]** = 原作数值/细节查不到的占位。

## 资料来源（本步逐条核实用）
| 简称 | 链接 | 用到的内容 |
|---|---|---|
| Cogito | https://gamefaqs.gamespot.com/pc/409954-persona-5-tactica/faqs/81199 （GameFAQs《Persona 5 Tactica - Guide and FAQ》v1.0 2024-03-30） | AAA101 异常、AAA103 近战击退 4 格、AAA104 掩体（全掩体挡正面+侧面、减伤约 70%）、AAA106/107 1 More 与 Triple Threat、AAA108 Charge、AAA109 Voltage、AAA110 Dash、AAA111 高台/Follow-Up、AAA112 Baton Pass、AAA100 难度表、AAA115 敌人类型、地图物件（油桶/木箱/摄像头/开关）、关卡目标与奖励栏、角色 Lv19/21 数值表、Charge 技能表、「枪无弹数限制」 |
| MTW-Effects | https://megamitensei.fandom.com/wiki/List_of_Persona_5_Tactica_Effects | 10 种效果（Burn/Freeze/Shock/Sweep/Hypno/Vortex/Dizzy/Despair/Forget/Sleep）的定义 |
| MTW-Skills | https://megamitensei.fandom.com/wiki/List_of_Persona_5_Tactica_Skills | 技能 Power / SP / 范围描述 / Unique（Full Voltage）技能、Charge 被动描述、Follow-Up 被动 |
| MTW-Voltage | https://megamitensei.fandom.com/wiki/Voltage | 共享槽、伤害造成/受到都涨、各角色 Unique 效果 |
| MTW-FollowUp | https://megamitensei.fandom.com/wiki/Follow_Up | P5T Follow-Up：打落高处敌人进入下方队友射程 → 队友开枪追击、攻击者 1 More；Toshiro 无枪不能追击 |
| MTW-BatonPass | https://megamitensei.fandom.com/wiki/Baton_Pass | P5T 的 Baton Pass = 倒下队员换替补；次数按难度（Safe 无限 / Easy·Normal 3 / Hard 2 / Merciless 1） |
| MTW-Guard | https://megamitensei.fandom.com/wiki/Guard | P5T：回合结束时贴掩体获得 Guard；抵抗物理与枪、不能被打倒；被技能或近战命中后失去 |
| MTW-Critical | https://megamitensei.fandom.com/wiki/Critical | P5T 取消弱点：空地被打 = Critical → 倒地 + 1 More |
| MTW-P5T | https://megamitensei.fandom.com/wiki/Persona_5_Tactica | Gameplay：Charge「一回合没攻击也没用技能 → Charge，到下次攻击/技能前有小增益；1 More 也同样可触发」；Triple Threat 三角 |
| altema | https://altema.jp/persona5t/kousyo | 高台：下方攻击会被 Guard 减伤；近战打落；落点有队友 → 追击 + 1MORE |
| TheGamer | https://www.thegamer.com/persona-5-tactica-p5t-beginner-tips-getting-started-pro-tip/ | 梯子/跳台在移动范围内可用；从下往上打伤害降低 |
| RPG Site | https://www.rpgsite.net/review/15107-persona-5-tactica-review | 更正：Triple Threat 没有距离限制 |
| 旧版（1 步） | Twinfinite / EarlyGame / DualShockers / Kotaku / Polygon（见 git 历史 d4f07a0 的本文件） | 掩体被包抄仍有 Resistance、技能无视障碍、撞击双方失去 Resistance |

> megatenwiki.com 被 Cloudflare 拦截，技能表改用其 Fandom 镜像（同一维基社区内容）。原始摘录存于工作区 web/notes（不进仓库）。

## 已实现的规则
| # | 规则 | 依据 | 实现 |
|---|---|---|---|
| 1 | 每人每回合移动一次 + 行动一次；行动前可在范围内反复改站位；我方阶段 ↔ 敌方阶段 | 旧版 | `move/melee/shoot/skill/wait/endPlayerPhase`，`anchor` |
| 2 | **掩体 = Resistance**：贴着任一掩体（半/全/墙/高台侧壁）就不能被打倒、伤害 ×0.7，与方向无关 | Cogito AAA104（「Basic cover 70% rough estimate」）、MTW-Guard、DualShockers | `hasResistance`；`RESIST_MULT=0.7` |
| 3 | **全掩体（含墙）挡住来自正面和侧面的枪击**，只有背面能打中 | Cogito AAA104 | `grid.fullCoverBlocks` |
| 4 | 空地被打 → 倒地 → 1 More（再移动 + 再行动），不同敌人可无限连锁；已倒地的不再给 | MTW-Critical、Cogito AAA106 | `markDowns` / `grantOneMore` |
| 5 | **近战：击退 4 格**，攻击者站到对方原位，打破 Resistance；途中撞墙/掩体停下；撞到单位 → 双方失去 Resistance | Cogito AAA103、BBB200 | `doMelee` / `push(dist=4)` |
| 6 | 任何攻击技能都打破 Resistance；技能无视墙体视线 | MTW-Guard、旧版 | `doSkill` |
| 7 | **高低差**：地面有层高；不能直接走上/下高台，**梯子/跳台 = Dash**（在移动范围内）；高处单位抵抗来自低处的枪击 | Cogito AAA110/AAA111、TheGamer、altema | `MapDef.heights/links`、`grid.neighbors`、`dash` 事件 |
| 8 | **推下高台**：击退/吹飞/投掷越过高台边缘 → 坠落（受伤），**落点在下方队友枪的射程内 → 队友 Follow-Up 开枪、目标倒地、攻击者 1 More**；每人每回合 Follow-Up 1 次（Follow-Up+ = 2，选项） | MTW-FollowUp、Cogito AAA111、altema | `afterLand` / `followUp`；`opts.followUps` |
| 9 | 护送对象/无枪单位不能 Follow-Up | MTW-FollowUp（Toshiro） | `noFollowUp` |
| 10 | **Charge**：一回合（或一次 1 More）里没攻击就结束 → Charge；到下次攻击/技能前生效后用掉。实现了原作全部 9 种 Charge 效果（Foresight/Spring Storm 射程+1、Clairvoyance +2、Phantom Step 移动+1、Lightning Speed +2、Ferocious Lion 击退+1、Over Powered ×1.2、Bullet Break 枪击无视掩体打倒、Essence of Sorcery 技能范围+1），每名角色配其免费的第一个 | MTW-P5T、Cogito AAA108 + Charge 技能表、MTW-Skills | `maybeCharge` / `chargeBonus` / `useCharge` |
| 11 | **Voltage**：我方共享槽，造成或受到伤害都会涨；满了任一角色可用 Unique，不耗 SP、清空槽 | Cogito AAA109、MTW-Voltage | `voltage`、`unique()` |
| 12 | Unique 技能：Phantom Judge（小范围、**掩体里也打倒**）、Brigantine Blitzkrieg（直线 + 感电）、Femme Fatale（范围伤害、**用完还能行动**）、Winds of Time（周围大范围吹飞）、Full Throttle（直线击退）、Noble Lady's Invitation（范围催眠拉向目标）、Pathway to the Ball（本回合移动 +99、还能行动） | MTW-Voltage / MTW-Skills | `UNIQUES` |
| 13 | **全部 10 种效果**：灼烧（击退 1 格 + 20% MaxHP、不致死）、冻结（1 回合不能行动，受伤解除）、感电（1 回合不能移动）、吹飞（飞 4 格越过障碍，可飞下高台）、催眠（拉近 4 格、绕障碍）、漩涡（把范围内敌人拉向中心）、眩晕（随机移动、仍可攻击）、绝望（目标不能移动，施法者下次移动 +，目标越多越多）、遗忘（1 回合不能攻击）、睡眠（2 回合不能行动、受伤即醒、回合回复） | MTW-Effects、Cogito AAA101 | `STATUS_OF` / `push(fly)` / `pull` / `beginSidePhase` |
| 14 | 身上有异常的单位任何攻击都能打倒 | 旧版（Twinfinite） | `hasResistance` |
| 15 | 回复与辅助：Dia / Diamrita（解异常）/ Media（全体）；Tarukaja 攻↑、Rakukaja 防↑、Sukukaja 移动 +3 | MTW-Skills；Sukukaja +3 来自 Cogito AAA115 | `kind:'heal'/'buff'` |
| 16 | **Triple Threat**：有人持 1 More、三名主力围成的三角里有倒地敌人 → 三角内所有敌人受伤（无视 Resistance）、用掉 1 More；**无距离限制**；**我方有除灼烧/绝望外的异常时不能发动**；伤害按三人近战+枪攻 | Cogito AAA107、RPG Site、MTW-P5T | `pendingTriple` / `tripleThreat` |
| 17 | **特殊敌人（7 类）**：Shooter（只开枪、掩体间移动）；Revenger（被打后跳到攻击者身边近战反击）；Shielder（挡住正面所有攻击，只能从背面/侧面用枪打倒；近战/技能只伤不倒、会转向攻击者；不能被移动）；Teleporter（被打与攻击者换位）；Launcher（投掷身边的敌我单位或扔石头；不能被打倒；击退减半；被推下高台即死）；Supporter（回复/加速/攻击技能）；Loudspeaker（本回合禁止某类行动，范围内违规受罚） | Cogito AAA115 | `role` + `onHitReaction` / `heave` / `ai.ts` |
| 18 | **地图物件**：油桶（被任何攻击/撞击引爆：2 格内全部吹飞、受伤、失去 Resistance，连锁）；木箱（全掩体，可被近战推飞） | Cogito Map objects | 中立单位 `prop:'barrel'/'box'/'speaker'` |
| 19 | **关卡目标**：击败全部 / 击败指定（多个）目标 / 除某人外全灭（误伤即败）/ 到达出口（任一人、指定人、全员）/ 护送（护送对象倒下即败、不能攻击不能 Dash）/ 坚持 N 回合 / N 回合内完成（超限即败） | Cogito 关卡列表（M03/M08/M09/M14/M15、DLC13） | `WinCondition` / `turnLimit` / `escort` |
| 20 | **奖励栏**：通关 / N 回合内通关 / 无人 KO / 击败全部敌人 / 我方受伤少于 N 次 | Cogito 关卡列表 | `BonusDef` / `crowns()` |
| 21 | **Baton Pass**：队员倒下可换替补上场；次数按难度；全员（含替补）倒下才失败 | MTW-BatonPass、Cogito AAA112 | `batonPass()`；`leaderKoLoses` 默认改为 false |
| 22 | **难度**：敌人 HP / 攻击倍率（Safety 50%/25% … Merciless 150%/150%）+ Baton Pass 次数 | Cogito AAA100 / AAA112 | `opts.difficulty` |
| 23 | 敌人也会 1 More（打倒空地上的我方后再走再打） | 旧版 | `runEnemyTurn` |
| 24 | 枪无弹数限制（`ammo` 缺省无限）；枪型 ST 单体 / AoE 散射 / EXP 爆炸（按角色表） | Cogito（「Gun does not have Ammo limit」、角色表 R AoE 列） | `gun.shape` |

## 数值：哪些是原作公开数据，哪些是占位
- **[源] 角色**：HP / SP / 移动 / 近战 / 枪攻 / 射程 / 枪型取 Cogito 角色表 Lv19（Joker/Mona/Ann/Ryuji/Haru/Erina）与 Lv21（Yusuke/Makoto/Kasumi）那一行；Toshiro（护送）85 HP / 6 移动（Cogito C109）。只有这一个等级的数据点，**没有成长曲线、副面具、武器加成**。
- **[源] 技能 Power / SP**：MTW-Skills（Agi 45/14、Bufu 35/14、Zio 45/12、Garu 25/8、Psi 25/12、Frei 25/14、Kouha 40/12、Eiha 35/12、Partisan 25/12、Dia 65/10、Media 65/34、-kaja 12；Unique 初始级 Phantom Judge 41、Brigantine 41、Femme Fatale 58、Winds of Time 29、Full Throttle 30、Noble Lady 23）。
- **[源] 规则数值**：Resistance ×0.7（Cogito 粗略实测）、近战击退 4、吹飞 4、催眠 4、灼烧 20% MaxHP 且不致死、油桶半径 2、Over Powered ×1.2、Sukukaja +3、睡眠 2 回合、难度表、Baton Pass 次数。
- **[PH] 占位**：
  1. 伤害公式：技能伤害 = Power × 0.45；回复 = Power × 0.5（原作公式未公开）。
  2. 技能射程（单体 5 格、范围 4 格）、「small/medium/large/huge area」→ 半径 1/2/3/4；Unique 的射程/长度。
  3. Triple Threat 倍率（三人近战+枪攻之和 × 0.5）。
  4. Voltage 上限 100、增长 = 伤害 × 0.5。
  5. 坠落伤害 10% MaxHP / 层；油桶伤害 20、吹飞 2 格；绝望每目标 +2 移动；-kaja 倍率与 3 回合；Revenger 反击跳跃 3 格；喇叭半径 3、惩罚 20% MaxHP；睡眠回复 10%。
  6. **全部敌人数值**（HP、攻击、移动、射程）。
  7. 技能分配给谁：Joker Eiha、Ryuji Zio、Ann Agi、Mona Garu、Yusuke Bufu、Makoto Frei、Haru Psi 按原作人格；Erina = Partisan、Kasumi = Kouha、各人的回复/辅助技能是灰盒示意（未核实初始技能）。

## 与原作差异清单（仍不一致 / 未做）
**A. 数值（见上「PH」）**——伤害公式、敌人数值、技能射程是最大缺口；需要正版实机测或数据表。

**B. 机制细节有出入**
1. Guard 的获得时机：原作是「回合结束时贴掩体」获得 Guard 状态；本原型是「被打的那一刻贴着掩体」实时判定（大多数情况结果相同；单位被吹飞离开掩体后立刻失去，原作可能还留着到被技能/近战命中）。
2. Dash：原作 Dash 是单独一步（Stop & Go 可在 Dash 后 +1 移动、Kasumi 的 +99 移动在 Dash 后结束）；这里梯子/跳台只是路径里耗 1 格的边（Pathway 在 Dash 后取消已做）。跳台与梯子没区分。
3. 跨高度近战：这里要求同一高度相邻才可近战（原作未查到明确说明）。「从上往下打伤害更高」（TheGamer）未实现；Broad Perspective（高处射击有几率打倒）未做。
4. 坠落：只在击退到更低格时触发并停在落点；原作是否继续滑行、坠落是否必定倒地（无追击时）未知——这里无追击就不倒地。
5. Revenger：这里「被打且没倒地」才反击、跳跃范围 3 格；原作触发条件与距离未写明。
6. Launcher 投掷：AI 只做「把身边同伴扔到我方旁边 / 把身边我方扔走（可扔下高台）/ 扔石头」，最多扔 1 个（原作可扔 2 个）。
7. Loudspeaker：禁止的行动按回合轮换、惩罚是掉血+破防（原作惩罚形式未写明）。
8. Supporter AI 简化（回复 < 60% 的同伴 > 给近战同伴 Sukukaja > 攻击）。
9. 眩晕的我方单位：阶段开始随机走一步后本回合不能自主移动（原作玩家侧表现未核实）。
10. 漩涡/催眠的拉动路径是近似（最多 N 步、取离中心/施法者最近的可达格）。
11. 撞击是否有额外伤害未知（这里没有）。
12. 敌方 1 More 连锁上限 3 次（防死循环，原作无此说明）。
13. 敌方意图只显示范围与预计目标（目标标注是我们加的辅助）。
14. Baton Pass 的替补出现在倒下者的位置（或最近空格）——原作出现位置未核实；Safe 模式「全灭后全员复活继续」未做。
15. AoE / EXP 枪的打击形状按「目标 + 周围 1 格」近似。

**C. 原作有、本步没做**
16. Unique：Yusuke「Like a Phantom」（召唤诱饵）、Erina「Flag of Freedom」（插旗破掩体/回复）、Akechi「Truth Seeker」（全员再行动一次）；Femme Fatale 没有真的召唤一个会走路的单位。
17. 每人第二个 Charge 技能、技能树（GP）、副面具、武器、Peak Condition、等级成长。
18. 被动/自动技能：Ambush、First Aid、Ailment Shield、Invigorate/Regenerate、Iron Body 等。
19. 地图机关：开关/升降台/定时开关门、监视摄像头（踩到召唤敌人）、Flag of Control、Crystal of Rebirth、DLC 涂色。
20. Toshiro 作为可战斗角色（Baywell 45、远程 Triple Threat）。
21. 剧情关的中途事件（援军按回合出现、Boss 阶段）。

## 玩法还原度自评：约 82%（机制面约 86%；未达 90%）
按核心系统加权（权重/得分）：
- 核心循环（移动+行动、阶段、行动前改站位）10 / 95%
- 掩体 / Resistance / 全掩体正面+侧面 10 / 90%（Guard 获得时机近似）
- 打倒 + 1 More 连锁 10 / 95%
- 近战击退 4 格 / 占位 / 撞击 6 / 90%
- Triple Threat（条件、无距离限制、异常限制）6 / 85%（倍率 PH）
- 高低差 / Dash / 推落 / Follow-Up 8 / 80%（坠落伤害 PH、Dash 简化）
- Charge（9 种效果全有）5 / 90%
- Voltage / Unique（7/10 名角色）5 / 75%
- 10 种元素效果 8 / 85%
- 回复/辅助 3 / 75%
- 特殊敌人 7 类 6 / 75%
- 地图物件（油桶/木箱；机关未做）4 / 60%
- 关卡目标 + 奖励栏 5 / 90%
- Baton Pass / 难度 3 / 90%
- 数值（角色真数据 1 个等级、技能 Power 真；伤害公式/敌人/射程 PH）7 / 40%
- 敌人 AI（启发式，原作 AI 不明）4 / 65%
→ 加权 ≈ 81.7%；去掉「数值」和「AI」两项只看机制 ≈ 85.7%。
上一步 75% → 本步约 82%。离 90% 还差的主要是：**伤害公式与敌人数值（公开资料没有，需要正版实机测）**、地图机关、剩余 3 个 Unique、Dash/Guard 细节。
视觉：灰盒方块，视觉还原度不在本步评估（第 2 步接 P5T 素材）。
