# 幽影协议 P5T 规则原型 · 规则说明与「与原作差异清单」

2026-10-22 · 分支 feat/umbra-p5t · labs/umbra-p5t
规则层：`src/rules/`（纯 TypeScript，零 DOM、零画布，只发事件）；测试：`tests/rules.test.ts`（vitest 23 项）。
目标：玩法还原度 >90%（用户硬性要求）。依据：下列公开攻略/百科（未拿到原作数据表），**数值全部是灰盒占位**。

## 资料来源
- Twinfinite「How to Knock Down Enemies」：https://twinfinite.net/guides/how-to-knock-down-enemies-persona-5-tactica/
- EarlyGame「One More And Triple Threat Explained」：https://earlygame.com/gaming/persona-5-tactica-one-more-triple-threat
- DualShockers 战斗指南 / 新手技巧：https://www.dualshockers.com/persona-5-tactica-complete-combat-guide/ 、https://www.dualshockers.com/persona-5-tactica-beginner-tips-tricks/
- Megami Tensei Wiki 效果表：https://megamitensei.fandom.com/wiki/List_of_Persona_5_Tactica_Effects
- GameRant 打倒说明、Wikipedia 条目、GameFAQs 关卡奖励条件（Clear / Clear within N turns / No one KO'd）

## 已实现的规则（按原作）
| # | 规则 | 实现 |
|---|---|---|
| 1 | 每人每回合 **移动一次 + 行动一次**（近战/枪/技能/待机）；我方阶段 → 敌方阶段交替 | `Battle.move/melee/shoot/skill/wait/endPlayerPhase`；全员行动完自动进敌方阶段 |
| 2 | **行动前可在移动范围内反复改站位**（原作移动在行动前可撤回） | 范围从 `anchor`（本次行动起点）算 |
| 3 | **掩体 = Resistance 状态**：紧贴掩体的单位不能被打倒、受伤降低；**与攻击方向无关**（原作：被包抄仍有 Resistance） | `coverModel: 'p5t'`（默认） |
| 4 | **全掩体**：来自其正面的攻击完全落空 | 枪击正面打全掩体 → `miss`，0 伤害 |
| 5 | 命中**无 Resistance** 的敌人 → **倒地 → 攻击者 1 More**（可**再移动 + 再行动**） | `afterHit` |
| 6 | **1 More 可无限连锁**，只要每次打倒的是不同敌人；已倒地的敌人不会再被打倒；范围技打倒多个也只给 1 次 | 去掉了初版「每人每回合限 1 次」 |
| 7 | **近战**：把敌人推出所在格、**攻击者占据其位置**、打破 Resistance；推向另一个单位时两者都失去 Resistance | `push` + `meleeStep`；被墙挡住则原地 |
| 8 | **任何攻击技能都打破 Resistance**（本次不倒地，下一击即可打倒）；**技能无视墙体/障碍** | `breakResist`；`canSkill` 不查视线 |
| 9 | 身上有异常状态的单位任何攻击都能打倒 | `hasResistance` 里 `status.length>0 → false` |
| 10 | 元素异常：Agi=灼烧（轻微击退 + 下回合掉血），Zio=感电（下回合不能移动），Eiha=绝望（下回合不能移动，其移动力加给施法者下回合） | `status` + `immobile` + `pendingBonus` |
| 11 | **Triple Threat**：有人持 1 More，且**三名我方围成的三角内至少有一个倒地敌人** → 可发动；**三角内所有敌人**受伤（无视 Resistance）；**用掉持有者的 1 More**；发动前可让未行动的队友走位调整三角 | `pendingTriple`（实时计算）+ `tripleThreat()` |
| 12 | **敌人也会 1 More**：打倒空地上的我方后再走再打 | `enemyOneMore: true` |
| 13 | 倒地单位在**己方下个阶段开始时起身**；被打破的 Resistance 也在那时恢复 | `beginSidePhase` |
| 14 | 枪：有射程、要视线；**原作无弹数限制** | `gun.ammo` 缺省 = 无限；填数字即启用弹数（GDD 的选项） |
| 15 | 技能消耗 **SP**；枪、近战不耗 SP；SP 战斗中**不自然回复**（原作只有 Invigorate 类被动才回） | `sp -= s.sp` |
| 16 | 胜负：全灭 / 到达出口 / 击败指定目标；失败：我方全倒，或（剧情关）Joker 倒下；可设回合上限 | `MapDef.win` / `turnLimit` / `leaderKoLoses` |
| 17 | 三项奖励（皇冠）：通关 / N 回合内通关 / 无人 KO | `crowns()` |
| 18 | 敌人简单 AI：找最近的我方 → 选能打到它且贴掩体的落点 → 打；避免枪打全掩体正面 | `ai.ts` |
| 19 | 敌人下回合范围：点敌人看红格（可走格 + 攻击格），右上「敌方范围」显示全部 | `computeIntents` |

## 与原作差异清单（不确定 / 有出入 / 未做）
**A. 数值不确定（原作未公开，需对照正版数据或实机测）**
1. Resistance 减伤倍率：暂定 ×0.5。
2. Triple Threat 伤害：暂定「三人近战力之和 ×1.0」；原作是「全队合计伤害的一定比例」，比例未知。
3. 灼烧掉血 5 点、灼烧击退 1 格、异常持续 1 回合：方向与持续正确，数值占位。
4. 角色 HP/SP/移动/射程/攻击力、敌人数值：全部占位，不是原作数值。
5. 伤害无随机浮动、无命中率（原作有暴击/命中细节，资料未写清）。

**B. 规则理解有分歧（已按原作资料做，旧理解保留为开关）**
6. 掩体方向：GDD 里写的「侧面才可倒地」与资料不符——资料明确「被包抄仍有 Resistance，只要贴着掩体」。默认按资料（`coverModel:'p5t'`），GDD 理解保留为 `coverModel:'directional'`，一行切换。
7. 枪弹数：用户/GDD 要求「枪+弹数」，原作无弹数限制。默认无限，数据里写 `ammo` 即可启用。

**C. 原作有、这一步没做（后续步骤）**
8. 高低差、梯子、从高处推落 + 下方队友 **Follow-up** 追击（另一种拿 1 More 的方式）。
9. **Baton Pass**（把 1 More 交给队友）——印象中原作有，资料本步未核实。
10. 「不行动直接结束」的增益（原作：提前结束可在下回合获得增益；Erina 为 Charge）。目前「待机」无增益。
11. Voltage 槽与 Unique Skill（如 Joker 的 Phantom Judge 无视掩体直接打倒）。
12. 其余元素异常：Bufu 冻结、Garu 吹飞（越过障碍）、Psi 催眠、Frei 漩涡、Kouha 眩晕、Sleep、Forget。
13. 特殊敌人：Revenger（回合开始自带 Resistance，被打后反击并失去 Resistance）等；爆炸桶。
14. 部分角色枪可穿透打多个敌人；武器/副面具/技能树加成。
15. 敌人倒地后起身时是否照常行动：目前照常行动（资料未写明）。
16. 敌人连锁 1 More 设了上限 3 次防死循环（原作无此上限说明）。
17. 「意图」只显示范围和预计目标；原作是点敌人看移动/攻击范围，没有明示目标——目标标注是我们加的辅助。
18. 视线算法为格子 supercover 近似；全掩体若紧贴射手或目标则可探身射击（原作具体判定未知）。
19. 近战推向墙/掩体时原作可能有额外伤害，目前只是不动。

## 玩法还原度自评：约 75%
依据（按核心系统加权）：
- 核心循环（移动+行动、阶段交替、行动前改站位）：≈95%
- 掩体/Resistance/全掩体落空：≈90%（倍率未知）
- 打倒 + 1 More 连锁：≈95%
- 近战推出 + 占位 + 撞击：≈90%
- Triple Threat（条件、范围、用掉 1 More、调站位）：≈90%（伤害比例未知）
- 技能/异常：≈55%（只做了 3 种元素）
- 敌人 AI 与敌方 1 More：≈65%（AI 简单）
- 地形（高低差/推落/Follow-up/爆炸桶）：≈0%
- 特殊敌人、Voltage/Unique、Baton Pass：≈0%
→ 当前核心战斗规则 ≈90% 吻合；离整体 >90% 还差：高低差+Follow-up、Baton Pass、全部元素效果、Revenger 等特殊敌人、Voltage，以及用正版数据核对数值。
视觉：灰盒方块，视觉还原度不在本步评估（第 2 步接 P5T 素材）。
