# 幽影协议 P5T 规则原型 · 规则说明与「与原作差异清单」

2026-10-22 · 分支 feat/umbra-p5t · labs/umbra-p5t · 第 1c 步（在 738eca3 基础上补不需要素材的机制；数值项不动，等 Codex 从正版提取数据表）
规则层：`src/rules/`（纯 TypeScript，零 DOM、零画布，只发事件）；测试：`tests/rules.test.ts`（59 项）+ `tests/rules-1c.test.ts`（27 项）= vitest 86 项。
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
| SG-Guard | https://samurai-gamers.com/persona-5-tactica/p5t-guard-guide/ | **回合结束时贴掩体才进入 Guard**；Guard 减远程伤害、不会被打倒；**近战伤害不受 Guard 减免**、技能（算远程）会被减免；近战/技能打破 Guard |
| SG-Objects | https://samurai-gamers.com/persona-5-tactica/p5t-stage-objects-guide/ | 「They will enter a Guard state if you end their turn while being covered by an object」 |
| SG-Elements | https://samurai-gamers.com/persona-5-tactica/p5t-stage-elements-guide/ | 监视摄像头（进入彩色范围 → 召唤援军）、门（开关控制）、升降台（开关上下）、Dash 格（高处 → 高处）、梯子（从下方爬上高台）、油桶 |
| SG-Unique | https://samurai-gamers.com/persona-5-tactica/p5t-unique-skill-guide/ | Like a Phantom（召唤 2 个诱饵 + 可再行动）、Flag of Freedom（插旗：破附近敌人掩体、每回合结束回复附近我方）、Truth Seeker（我方再行动一次，之后 3 回合 Voltage 不涨）、Pathway（无限移动直到使用 Dash） |
| SG-Chars | Samurai Gamers 角色页（crow / violet / fox / elle）| 明智初始 Megido、Charge Phantom Step → Essence of Sorcery、Follow-Up / Follow-Up+、Reverse the Scales；Kasumi Phantom Step → Ferocious Lion；通用树 Stop & Go / Ironclad Guard / Hawkeye / Daredevil / God-Like Speed / Soul Repose / Break & Recovery |
| SG-Charge | https://samurai-gamers.com/persona-5-tactica/p5t-charge-attacks-guide/ | 各角色第一 Charge（Joker 射程+1、Erina 枪击打倒、Mona 移动+2、Ryuji/Yusuke 击退、Ann/Makoto 移动+1、Haru 移动+2） |
| ibunroku | https://www.ibunroku.com/p5t/skills | 291 个技能的描述与数值字段（被动：Ironclad Guard -40%、Iron Body -20%、Regenerate/Invigorate 5/7/10%、Soul Repose 7%、Broad Perspective 35%、Lucky Punch 25%、Pedal +2、Comandante +1、Daredevil +2、Trump Card Power 80 / ×1.5、Unstoppable SP -50%、Endure 1HP 一次；Unique 的 Power/说明） |
| GF-Grades | GameFAQs 版块帖「Personal Character Grades」（boards/410286-persona-5-tactica/80633069，搜索摘录） | 每人两个 Charge（Joker Foresight/Phantom Step、Ann Phantom Step/Over Powered、Ryuji Ferocious Lion/Over Powered、Haru Lightning Speed/Spring Storm、Makoto Phantom Step/Essence of Sorcery、Erina Bullet Break/Foresight）与专属被动（Joker Trump Card、Ryuji Endure、Yusuke Broad Perspective、Makoto Pedal to the Metal、Erina Comandante） |
| GG-TT / GG-1More | Gamer Guides「Triple Threat Attacks Explained」「One More Explained」 | **只有打倒该敌人的那名角色、且被它打倒的那个敌人在三角里才能发动**；Toshiro 能发动但不构成三角；Revenger「先打一下耗掉反击才能打倒，每回合刷新」；Launcher 不能被打倒；Shielder 会一直面向你 |
| GG-Yusuke | Gamer Guides「Best Skills for Yusuke」 | Yusuke Ferocious Lion → Clairvoyance |
| Twinfinite-KD | https://twinfinite.net/guides/how-to-knock-down-enemies-persona-5-tactica/ | Revenger 反击后立刻失去 Resistance；反击够不着时可以马上打倒它 |
| Cogito 摘录 | GameFAQs Cogito 指南（网页直连 400，用搜索摘录核对） | Launcher「can throw **up to two** nearby units」；Supporter「swap the position of an ally with a random enemy（rarely used）」；Shooter「moves from cover to cover」；Pink Switch 开 1/3 号门关 2/4 号门；踩摄像头被 Yoshiki 攻击并召唤敌人；Phase 1/Phase 2 关卡；Safe 模式全灭复活 |
| gameline | https://gameline.jp/persona5-tactica/story/2nd-kingdom/ | 「スイッチを踏んでいる間だけ扉が開き、やめると閉じる」（踩着才开的门） |
| Neoseeker | Neoseeker M24/M25/M27 攻略 | 每隔一回合开关的门；开关控制的门 |
| gamecap | https://gamecap.jp/p5t/quest_3.html | 升降台上下会让借升降台侧壁做掩体的敌人失去 Guard |
| ESTNN / TMG | ESTNN Yoshiki Boss 攻略；Too Much Gaming 官方情报转述 | Boss 战分阶段（坐升降台、阶段 2）；摄像头「summon reinforcements if you enter their line of sight」 |
| 旧版（1 步） | Twinfinite / EarlyGame / DualShockers / Kotaku / Polygon（见 git 历史 d4f07a0 的本文件） | 掩体被包抄仍有 Resistance、技能无视障碍、撞击双方失去 Resistance |

> megatenwiki.com 被 Cloudflare 拦截，技能表改用其 Fandom 镜像（同一维基社区内容）。原始摘录存于工作区 web/notes（不进仓库）。

## 已实现的规则
| # | 规则 | 依据 | 实现 |
|---|---|---|---|
| 1 | 每人每回合移动一次 + 行动一次；行动前可在范围内反复改站位；我方阶段 ↔ 敌方阶段 | 旧版 | `move/melee/shoot/skill/wait/endPlayerPhase`，`anchor` |
| 2 | **掩体 = Guard（1c 改为原作时机）**：**一方回合结束时**贴着任一掩体（半/全/墙/高台侧壁/关着的门）才获得 Guard → 不能被打倒、远程（枪/技能）伤害 ×0.7，与方向无关；开场已贴掩体的单位带 Guard；被近战/技能/撞击/爆炸命中、被推离掩体、掩体消失（开门/升降台/插旗）就失去；**近战伤害不受 Guard 减免**（仍不倒地） | SG-Guard、SG-Objects、Cogito AAA104、MTW-Guard、gamecap | `Unit.guard`、`updateGuards`、`recheckGuards`、`hasResistance`；`RESIST_MULT=0.7` |
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
| 25 | **敌人 AI 提升**：回合结束才有 Guard → 停在掩体旁加分；停在我方火力可及的空地减分（暴露度）；优先打能打倒的（+25）、能击杀的、本阶段已被打过的（集火）、HP 低的；已倒地的降权；**优先攻击诱饵**；近战优先能把目标推下高台/推向别人的方向；Launcher 不近战；盾兵每回合转向自己的目标 | Cogito AAA115、GG-1More、Escapist（诱饵骗敌人浪费回合）；权重为自定 | `ai.ts` |
| 26 | **敌方 1 More 去掉 3 次上限**：每次 1 More 都要打倒一个新的未倒地目标，天然有限；留 `opts.enemyChainCap`（默认无限）与「我方人数+1」安全上限 | 原作无上限说明 | `runEnemyTurn` |
| 27 | **Revenger 按原作**：每回合第一次被打（任何攻击）不会被打倒，跳过去反击（跳跃 4 格 PH），**反击后失去 Resistance**；够不着也算用掉；每个我方回合开始刷新 | Cogito AAA115、GG-1More、Twinfinite-KD、Gamer Guides（被击退后反击多半跳回原位） | `counterReady`、`counterAttack` |
| 28 | **Launcher 一次投掷最多 2 个**身边单位；**Supporter 换位**（把我方一人与离我方最远的敌人交换，分数低于其他行动） | Cogito 摘录 | `ai.ts heave/swap`、`swapUnits` |
| 29 | **地图机关**：门（关着 = 墙，挡路挡视线、算掩体；门上有人关不上）；开关 hold（踩着开、离开关）/ toggle（踩上去切换一组门）/ elevator（切换升降台高低，上面的单位跟着走）；定时门（每 N 回合开关）；监视摄像头（我方经过/停在黄色监视格 → 警报 + 援军，一次） | SG-Elements、gameline、Cogito 摘录、Neoseeker、gamecap、TMG | `MapDef.doors/switches/elevators/cameras`、`applyMechanisms`、`setDoor/setElevator`、`checkCameras` |
| 30 | **关卡事件接口**：触发 = 第 N 回合（我方/敌方阶段）/ 某单位 HP ≤ 比例 / 剩余敌人 ≤ N / 某单位倒下 / 有人到达某格 / 标记；动作 = 刷援军 / 消息 / 改单位（Boss 阶段：换属性、回复、阶段号）/ 开关门 / 改胜利条件 / 设标记 / 直接胜负；`hpFloor` = Boss 锁血到阶段切换；「剩余 0 → 下一波」先刷援军再判胜 | Cogito Phase 1/2、ESTNN | `MapDef.events`、`runEvents`、`spawnUnits` |
| 31 | **Dash 细节**：梯子 = 连接不同高度；跳台 = 连接两处高台（可隔空、高度可相同）；**Dash 后本次移动结束**（Stop & Go +1）；升降台让连接条件不满足时连接暂时不可用 | SG-Elements；Pathway「until dash is used」、Stop & Go「after dashing」的描述 | `grid.linkUsable`、`reachable(afterDash)` |
| 32 | **专属技能补齐**：祐介 Like a Phantom（在 5 格内放 2 个诱饵，可再行动；诱饵 1 HP、不能行动、敌人优先打、不算存活人数）；艾丽娜 Flag of Freedom（插旗：半径 3 内敌人立刻失去 Guard 且回合结束拿不到，我方回合结束回复 10%）；明智 Truth Seeker（其余已行动的队员再行动一次，之后 3 回合 Voltage 不涨） | SG-Unique、ibunroku、Escapist | `uniqueAt`、`summonDecoys`、`placeFlag`、`allyExtra` |
| 33 | **每人第二个 Charge 技能**（10 名角色的两个 Charge 都有出处），可在未 Charge 时换装 | GF-Grades、GG-Yusuke、SG-Chars、Cogito 摘录 | `CHARGES`、`selectCharge` |
| 34 | **被动技能框架（26 个）**：Follow-Up+、Stop & Go、Hawkeye、Daredevil、God-Like Speed、Magical Mastery、Ironclad Guard、Iron Body、Regenerate 1、Invigorate 1、Soul Repose、Endure、Trump Card、Broad Perspective、Lucky Punch、Comandante、Pedal to the Metal、Never Say Die、Punisher of the Reckless、Sharp-Eyed Wildcat、Finishing Blow、Unstoppable、Break & Recovery、First Aid、Ailment Shield、Reverse the Scales；角色默认带专属被动（Joker Trump Card、Mona Lucky Punch、Ryuji Endure、Ann Unstoppable、Yusuke Broad Perspective、Makoto Pedal to the Metal、Erina Comandante、Akechi Reverse the Scales） | ibunroku（数值）、SG-Chars、GF-Grades；专属被动归属按 ibunroku 技能 id 段推断 | `PASSIVE_INFO`、`Battle.has` |
| 35 | **Triple Threat 修正**：只有持 1 More 的角色**自己打倒的那个敌人**在三角里才能发动（之前是任意倒地敌人） | GG-TT | `downedBy`、`tripleFor` |
| 36 | 明智 Crow 加入名单（技能/Charge/Unique/被动有出处，数值 PH） | SG-Chars | `CROW` |
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
**A. 数值（见上「PH」）**——伤害公式、敌人数值、技能射程是最大缺口；需要正版数据表（等 Codex 提取，本步不动）。新增 PH：Revenger 跳跃 4 格、诱饵 1 HP / 放置射程 5、旗子半径 3 / 回复 10% / 永久、First Aid 范围 3 与 Power 65、明智全部数值。

**B. 1c 逐条核实结果**
1. ✅ Guard 获得时机改为「回合结束时贴掩体」（SG-Guard / SG-Objects）。被强制位移后若新位置没掩体就失去（原作这种情况多由近战/技能引起，本来就破防）。
2. ✅ 近战伤害不受 Guard 减免（SG-Guard）。⚠ Cogito 的「Basic cover 70%」只说远程，没写近战，以 SG 为准。
3. ✅ 敌方 1 More 3 次上限已去掉（原作无此规则）。
4. ✅ 梯子/跳台区分；⚠「Dash 后移动结束」是从 Pathway 与 Stop & Go 的描述推出来的，没有攻略直接写明。
5. ✅ 投掷者一次最多扔 2 个（Cogito）。
6. ⚠ **跨高度近战**：继续要求同一高度相邻。公开资料只写「上了高台用近战把敌人打下去」（SG Height Damage Guide），没有跨高度近战的例子 → 保持。
7. ⚠ **高打低加伤**：没有找到通用的「高处攻击伤害更高」规则；资料只有「从下往上打会被 Guard 减伤」（TheGamer/altema，已实现）和被动 Broad Perspective（高处射击 35% 打倒，已实现）→ 不加通用加伤。
8. ❌ **替补上场位置**：仍是「倒下者的位置或最近空格」，没找到原作说明；Safe 模式「全灭后全员复活」仍未做。
9. Revenger 跳跃距离（PH 4）、反击够不着时的表现（这里：不移动，直接失去 Resistance）。
10. Loudspeaker：禁止行动按回合轮换、惩罚是掉血+破防（原作惩罚形式未写明）。
11. Supporter 换位的目标选择（原作是「随机」敌人；这里选离我方最远的，确定性）。
12. 眩晕的我方单位：阶段开始随机走一步后本回合不能自主移动（未核实）。
13. 漩涡/催眠的拉动路径是近似。撞击额外伤害未知（无）。
14. AoE / EXP 枪的打击形状按「目标 + 周围 1 格」近似。
15. 敌人 AI 评分权重是自定的：原作 AI 只有行为描述（IGN：敌人行为没有随机性），具体优先级未公开。
16. 摄像头：只做了「踏入监视格 → 援军（可选伤害）」；原作摄像头的视野形状、是否能被破坏未核实。
17. 诱饵：被打一下就消失、永久存在直到被打；原作诱饵 HP 与持续时间未核实。旗子永久存在（原作持续时间未核实）。
18. Femme Fatale 仍是范围伤害，没有真的召唤一个会走路的单位。

**C. 原作有、本步仍没做**
19. 技能树（GP）、副面具、武器、等级成长；被动里 Ambush（伏击射击）、Elegant Teatime（春）、Brilliant Ballet（霞，DLC 涂色）、Synergy 系、各属性 Boost/Amp、Null 系未做。
20. 地图：Flag of Control、Crystal of Rebirth、DLC 涂色地块。
21. Toshiro 作为可战斗角色（Baywell 45、能发动 Triple Threat 但不构成三角）。
22. 原作具体关卡的援军/Boss 剧本（接口已有，未录入原作关卡数据）。

## 玩法还原度自评：约 86%（机制面约 90%；按 16 系统加权仍未达 90%，差在「数值」与「敌人 AI」两项）
按核心系统加权（权重/得分；1c 变化标 ↑）：
- 核心循环（移动+行动、阶段、行动前改站位）10 / 95%
- 掩体 / Guard（回合结束获得、近战不减伤、全掩体正面+侧面）10 / 93% ↑（90）
- 打倒 + 1 More 连锁（敌方无上限）10 / 96% ↑（95）
- 近战击退 4 格 / 占位 / 撞击 6 / 91% ↑（90）
- Triple Threat（只能由打倒者发动、无距离限制、异常限制）6 / 90% ↑（85；倍率 PH）
- 高低差 / Dash（梯子≠跳台、Dash 后移动结束）/ 推落 / Follow-Up(+) 8 / 86% ↑（80）
- Charge（每人两个、可换装）5 / 95% ↑（90）
- Voltage / Unique（10/10 名角色）5 / 88% ↑（75；诱饵/旗子细节 PH、Femme Fatale 未召唤）
- 10 种元素效果 8 / 85%
- 回复 / 辅助 / 被动（26 个被动）3 / 80% ↑（75）
- 特殊敌人 7 类（Revenger 反击规则、Launcher 扔 2 个、Supporter 换位、盾兵转向）6 / 85% ↑（75）
- 地图物件 + 机关（门/开关/升降台/摄像头/跳台）4 / 85% ↑（60）
- 关卡目标 + 奖励栏 + 事件接口（援军/Boss 阶段）5 / 93% ↑（90）
- Baton Pass / 难度 3 / 90%
- 数值（本步不碰）7 / 40%
- 敌人 AI（掩体/暴露/集火/诱饵/推落，权重自定）4 / 78% ↑（65）
→ 加权 = 86.3%；去掉「数值」「AI」两项只看机制 = 90.3%。
上一步 82% → 本步约 86%。要到整体 ≥90%，主要靠数值项（Codex 提取正版数据表后，伤害公式/敌人数值/技能射程到位可 +3~4 个点）。
视觉：灰盒方块，视觉还原度不在本步评估。
