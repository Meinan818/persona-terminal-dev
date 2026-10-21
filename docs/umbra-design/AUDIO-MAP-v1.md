# 幽影协议 UMBRA · 音频清单 AUDIO-MAP v1（主策划，2026-10-22）

用途：D-008（音乐/音效用原作、按原作情境切歌、每场景是曲目池）的落地清单，也是 SYSTEMS-AUDIT-v1 §6 必补第 16 项「BGM/音效规格与曲目清单」的交付物（审计 §4.10 原写 `AUDIO-LIST-v1.md`，以本文件为准）。
范围：四皮 —— 红 `p5r-red`（P5R）、蓝 `p3-blue`（P3 / P3 FES / P3P）、粉 `p3r-pink`（P3R，女主皮）、黄 `p4-yellow`（P4G；P4R 出后替换）。
上游：docs/umbra-decisions.md D-008 · docs/umbra-design/FX-MAP-v1.md（全部事件，§G4 cueId 名单、§H sfx 挂法）· SYSTEMS-AUDIT-v1（全部场景/系统）。
本文不改 FX-MAP；需要新增的事件名统一列在 §5「新事件提案」，由主策划并入 FX-MAP。

---

## 0. 怎么读

- **曲目编号写法**（专辑见 §8 来源）：
  - `P5 1-17` = 《PERSONA5 ORIGINAL SOUNDTRACK》LNCM-1175~7 碟 1 第 17 轨。
  - `P5R 1-03` = 《PERSONA5 THE ROYAL》原声（STRAIGHT FLUSH EDITION 690-0086 / 再版 LNCM-1373~4，曲序相同）碟 1 第 3 轨。
  - `P3 1-16` = 《Persona3 Original Soundtrack》2006 日版 2CD。`FES 07` = 《Persona3 FES Original Soundtrack》。`P3P 05` = 《PERSONA3 PORTABLE Original Soundtrack》SVWC-7662。
  - `P3R 1-14` = 《PERSONA3 RELOAD ORIGINAL SOUNDTRACK》AGM-001~2。`P3R-EA 08` = 《Persona 3 Reload: Episode Aigis Original Soundtrack》AGM-007。
  - `P4 1-25` = 《Persona 4 Original Soundtrack》2008 2CD。`P4G 02` = 《Persona4 The GOLDEN Original Soundtrack》SVWC-7859。
- **依据列**：`原作`=来源页写明的原作用法；`借用`=原作没有对应场景，取最接近的曲（注明理由）；`待核`=社区常识但本次来源页没写明，采集时对录像确认。
- **循环**：`L`=无缝循环（必须标 loopStart/loopEnd）；`1`=单次播放（播完回到上一个 cue 或静音）；`J`=短 jingle（≤8s，走 BGM 总线但不打断时用 duck）。
- **切换条件**的键（与 §3 playlist.json 的 `condition` 一致）：`time`(day/night) · `weather`(clear/rain/snow/fog) · `moon`(full) · `callingCard`(true=已发预告信/满月告示/午夜频道) · `encounter`(normal/ambush=我方先手/ambushed=被偷袭) · `tier`(elite/boss/ruler) · `phase`(1/2) · `floorTier`(1–6，探索深度) · `route`(main/risk/request) · `alert`(high) · `season` · `unlock`(剧情/羁绊解锁)。
- **选曲规则**（D-008）：先按条件选「最具体」的池（匹配键数最多者胜），同一池内多首时按 weight 随机且不连续重复；设置里可锁定/关闭单曲；被关完的池回落到上一级池。

---

## 1. BGM cueId 总表（四皮共用；FX-MAP §G4 名单 + 本文新提）

| cueId | 场景 | 触发（FX 事件 / UI） | 状态 |
|---|---|---|---|
| title | 标题画面 | App 启动进 UMBRA / ui:open(title) | 🆕 |
| settings | 设置 | ui:open(settings) —— **不切歌**，沿用当前 cue（原作设置页无专属曲） | 🆕（hold） |
| loading | 加载 | 资源加载 >1.5s 时；<1.5s 不切 | 🆕 |
| hub | 据点（白天/夜晚/雨/雪/雾/满月/预告信后） | scene:enter(hub) / env:change | ✅ |
| hub.home | 据点·住处（Leblanc / 宿舍 / 堂岛家） | scene:enter(home) | 🆕 |
| requests | 委托板 | ui:open(requests) | ✅ |
| explore | 格子关卡（按周统治者异界/深度/路线多首） | scene:enter(explore) | ✅ |
| explore.callingcard | 预告信后潜入 | scene:enter(explore, callingCard) | ✅ |
| explore.safe | 安全屋 | scene:enter(safe) | 🆕 |
| explore.risk | 风险岔路 / Monad 门 / 金色区域 | map:move(node=risk) | 🆕 |
| explore.escape | 撤退 / 殿堂崩塌 / 逃出 | run:retreat 或 BOSS 击破后的出口段 | 🆕 |
| battle.normal | 普通战 | map:encounter(normal) | ✅ |
| battle.ambush | 我方先手 | map:encounter(ambush) | ✅ |
| battle.ambushed | 被偷袭 | map:encounter(ambushed) | ✅ |
| battle.elite | 精英 / 守门阴影 / 中 BOSS | map:encounter(tier=elite) | ✅ |
| boss.intro | BOSS 登场前 | boss:intro（🆕事件，见 §5） | 🆕 |
| boss.p1 / boss.p2 | BOSS 一/二阶段 | map:encounter(tier=boss) / boss:phase | ✅ |
| boss.defeat | BOSS 认输/崩塌 | battle:end(boss, win) 之后 | 🆕 |
| holdup | HOLD UP / 交涉 | holdup / talk:start | ✅ |
| allout.finish | 总攻收尾定格 | allout | ✅（多数原作无专曲，见各皮） |
| highlight | 觉醒/必杀插曲（可选） | highlight / bond:rankup(max) | 🆕（可选） |
| victory | 胜利 fanfare | battle:end(win)，≤300ms 交叉淡化 | ✅ |
| result | 单场结算 / 局末评级 | battle:end → result；局末 rank | ✅ |
| gameover | 失败 / Game Over | run:fail（🆕事件） | 🆕 |
| velvet | 天鹅绒（合成/图鉴/委托/警报都在此 cue 内） | ui:open(velvet) | ✅ |
| velvet.challenge | 天鹅绒试炼 | scene:enter(challenge) | 🆕 |
| shop.\<skinShopId\> | 各店 | shop:enter | ✅ |
| compendium | 图鉴（从据点直接开时） | ui:open(compendium) —— 原作图鉴在天鹅绒内 → 用 velvet 池 | 🆕（=velvet） |
| fusion | 合成 | ui:open(fusion) —— 同 velvet，不切 | 🆕（=velvet） |
| bond | 羁绊事件/羁绊升级场景 | bond:rankup（演出期间 duck，事件页用此池） | 🆕 |

---

## 2. 每皮 BGM 表

### 2.1 红 p5r-red（P5R）

| # | cueId | 情境 / 切换条件 | 原作曲目（编号） | 依据 | 循环 |
|---|---|---|---|---|---|
| R1 | title | 默认 | Royal Days（P5R 1-02） | 原作：P5R 标题曲 | L |
| R2 | title | 设置「经典标题」开 | Phantom（P5 1-02） | 原作：P5 标题曲 | L |
| R3 | settings | — | 不切（沿用当前 cue） | 借用：原作无设置专曲 | — |
| R4 | loading | 加载 >1.5s | Into the Metaverse / 異世界へ（P5 1-11） | 借用：进入异界的过场曲，最贴近「读取→进殿堂」 | 1 |
| R5 | hub | time=day, weather=clear | Tokyo Daylight（P5 2-01）+ Beneath the Mask -instrumental-（P5 1-09） | 原作：白天晴天街区（两首同池随机） | L |
| R6 | hub | time=night, weather=clear | Beneath the Mask（P5 1-29） | 原作：夜晚晴天 | L |
| R7 | hub | time=day, weather=rain | Beneath the Mask -rain, instrumental-（P5 3-01） | 原作：白天雨天 | L |
| R8 | hub | time=night, weather=rain | Beneath the Mask -rain-（P5 2-12） | 原作：夜晚雨天 | L |
| R9 | hub | season=third-semester（活动/特殊周开关） | So Happy World（P5R 2-05） | 原作：1/3–2/2 街区曲 | L |
| R10 | hub.home | 据点主界面「怪盗团基地」 | No More What Ifs -instrumental-（P5R 1-04） | 原作：Thieves Den 默认曲 | L |
| R11 | requests | — | Wicked Plan（P5 2-07） | 借用：原作「怪盗团开会定计划」曲，最贴近委托板选任务 | L |
| R12 | explore | route=main，按周统治者轮换（每周固定一首） | King, Queen and Slaves（P5 1-16）/ A Woman（P5 2-08）/ Price（P5 2-16）/ When Mother Was There（P5 2-23）/ Sweatshop（P5 3-05）/ The Whims of Fate（P5 3-10）/ Ark（P5 3-17）/ Gentle Madman（P5R 2-03） | 原作：各殿堂主题 | L |
| R13 | explore | route=main，接近宝物/深层段（floorTier≥5） | King, Queen and Slaves -another-（P5 1-15）/ A Woman -another-（P5 2-09）/ Price -another-（P5 2-17）/ When Mother Was There -another-（P5 2-22）/ Sweatshop -another-（P5 3-06）/ Out of Kindness（P5R 2-07）/ Impromptu for the Next Prime Minister（P5 3-18） | 原作：同殿堂另一区段曲 | L |
| R14 | explore | route=request（委托关），floorTier 1–2 | Mementos（P5 2-03） | 原作：Mementos 上层 | L |
| R15 | explore | route=request，floorTier 3 | Mementos: Upper Area（P5R 1-07） | 原作：Chemdah/Kaitul 层 | L |
| R16 | explore | route=request，floorTier 4 | Mementos: Mid Area（P5R 1-09） | 原作：Akzeriyyuth/Adyeshach 层 | L |
| R17 | explore | route=request，floorTier 5 | Mementos: Lower Area（P5R 1-12） | 原作：Sheriruth 层 | L |
| R18 | explore | route=request，floorTier 6 | Mementos: New Area（P5R 2-06）+ Freedom and Peace（P5 3-24） | 原作：Da'at 层 / Mementos 深处 | L |
| R19 | explore.callingcard | callingCard=true | Life Will Change（P5 1-04）+ Life Will Change -instrumental-（P5 1-24）+ I believe（P5R 2-08） | 原作：预告信后殿堂曲（P5R 丸喜殿堂用 I believe） | L |
| R20 | explore.risk | 风险岔路 | Disquiet / 不穏（P5 3-09） | 借用：原作新岛殿堂「黑暗之屋」用曲，最贴近高危区 | L |
| R21 | explore | alert=high（警戒度满） | Tension / 緊迫（P5 1-12） | 借用：原作紧张场面曲；原作警戒度无专曲 | L |
| R22 | explore.safe | 安全屋 | Have a Short Rest（P5 2-04） | 原作：安全屋 | L |
| R23 | explore.escape | 撤退 / BOSS 后出口段 | RUN,RUN,RUN!（P5 3-07）+ High Pressure（P5 2-15） | 原作：殿堂崩塌 / 强制潜入逃跑 | L |
| R24 | battle.normal | encounter=normal | Last Surprise（P5 1-17） | 原作：普通战 | L |
| R25 | battle.ambush | encounter=ambush | Take Over（P5R 1-03） | 原作：P5R 我方先手战；设置可「先手也用 Last Surprise」 | L |
| R26 | battle.ambushed | encounter=ambushed | Last Surprise（P5 1-17） | 原作：被偷袭仍是 Last Surprise | L |
| R27 | battle.normal / ambush / ambushed | callingCard=true | Life Will Change -instrumental-（P5 1-24） | 原作：预告信后殿堂曲覆盖战斗曲（P5 至奥村殿堂为止） | L |
| R28 | battle.elite | tier=elite | Keeper of Lust（P5 2-18） | 原作：中 BOSS 曲 | L |
| R29 | boss.intro | 守卫 BOSS / 统治者登场 | Blood of Villain（P5 1-25） | 原作：BOSS 战前 | L |
| R30 | boss.p1 | tier=boss（普通局守卫 BOSS） | Blooming Villain（P5 1-26） | 原作：大部分殿堂主 BOSS | L |
| R31 | boss.p2 | tier=boss, phase=2 | Will Power（P5 1-14） | 原作：新岛冴/明智二阶段 | L |
| R32 | boss.p1 | tier=ruler（预告信后统治者） | Rivers in the Desert -instrumental-（P5 3-20） | 原作：狮童一阶段 | L |
| R33 | boss.p2 | tier=ruler, phase=2 | Rivers in the Desert（P5 3-22） | 原作：狮童二阶段/圣杯 | L |
| R34 | boss.p1/p2 | tier=ruler, unlock=final（周目终局/隐藏 BOSS，可选） | Keep Your Faith（P5R 2-09）→ Throw Away Your Mask（P5R 2-10） | 原作：P5R 最终战一/二段 | L |
| R35 | boss.defeat | BOSS 认输 | Regret（P5 1-27） | 原作：殿堂主认输 | 1 |
| R36 | holdup | HOLD UP / 交涉 | Talk（P5 1-18） | 原作：全员倒地 HOLD UP | L |
| R37 | allout.finish | 总攻 | 不切（战斗曲继续） | 原作：总攻无专曲 | — |
| R38 | highlight | 同伴觉醒 / 羁绊 MAX 演出 | Awakening / 覚醒（P5 1-13）+ Swear to My Bones（P5 3-28） | 原作：觉醒 / 二次觉醒 | 1 |
| R39 | victory | 战斗胜利 | Triumph / 勝利（P5 1-19） | 原作：胜利 fanfare | 1 |
| R40 | result | 局末评级 S/A/B | Sunset Bridge（P5 2-10） | 借用：原作「事件告一段落」曲；单场结算沿用 Triumph | L |
| R41 | gameover | 全灭 | Nothingness...?（P5 3-14） | 借用：原作「主角被宣告死亡」场景；OST 未收录 Game Over 专曲（待核） | 1 |
| R42 | velvet | 天鹅绒 / 合成 / 图鉴 / 天鹅绒委托 / 警报 | Hymn of the Soul / 全ての人の魂の詩（P5 1-08） | 原作：天鹅绒监狱 | L |
| R43 | velvet.challenge | 天鹅绒试炼 | Prison Labor（P5R 1-13） | 原作：挑战战斗 | L |
| R44 | shop.untouchable | 岩井 Untouchable | Layer Cake（P5 1-23） | 原作 | L |
| R45 | shop.takemi | 武见内科 | Butterfly Kiss（P5 2-02） | 原作 | L |
| R46 | shop.drugstore | 药妆店 | Triple Seven（P5 2-35） | 借用：OST 未单列药妆店曲；取同类便利店曲（待核） | L |
| R47 | bond | 羁绊升级 / 羁绊事件页 | The Spirit（P5 2-31）+ Alright（P5 2-29）+ Break it Down（P5 3-02） | 原作：COOP 解锁/升级 + 事件曲 | L |
| R48 | hub | 每日首次打开据点（可选「早晨」） | Life Goes On（P5 2-19） | 借用：原作考试/日常过场曲（默认关） | L |

**红皮 BGM 场景数：48 行；涉及原作曲 66 首（按 OST 编号去重）。**

### 2.2 蓝 p3-blue（P3 / P3 FES / P3P）

| # | cueId | 情境 / 切换条件 | 原作曲目（编号） | 依据 | 循环 |
|---|---|---|---|---|---|
| B1 | title | 默认 | The Voice Someone Calls（P3 1-14） | 原作：P3 原版标题画面 | L |
| B2 | title | 设置「FES 标题」 | Brand New Days -The Beginning-（FES 02） | 原作：FES 标题 | L |
| B3 | title | 设置「P3P 标题」 | Soul Phrase -long ver.-（P3P 09） | 借用：P3P 片头曲长版（P3P 标题曲 OST 未单列） | L |
| B4 | settings | — | 不切 | 借用 | — |
| B5 | loading | 加载 >1.5s | The Voice Someone Calls（P3 1-14） | 原作：塔耳塔洛斯入口 | 1 |
| B6 | hub | time=day（第 1 学期期间 / 默认） | Want To Be Close（P3 1-05） | 原作：月光馆学园第 1 学期 | L |
| B7 | hub | time=day, season=semester2 | Changing Seasons（P3 2-01） | 原作：第 2 学期 | L |
| B8 | hub | time=day，P3P 池（默认开） | Time（P3P 04）/ Sun（P3P 06） | 原作：P3P 学园 1/2 学期 | L |
| B9 | hub | 港岛街区（time=night 或 出门） | When the Moon Reaches for the Stars（P3 1-12）+ A Way of Life（P3P 02） | 原作：Port Island 探索 | L |
| B10 | hub | moon=full（满月当天） | An Unpleasant Premonition / 嫌な予感（P3 1-23） | 原作：满月当天早晨对话 | L |
| B11 | hub | env=darkHour（影时间加成时段） | Fearful Experience（P3 1-24） | 原作：影时间神秘事件 | L |
| B12 | hub | unlock=late（长期玩家/终盘） | Memories of the City / 街の記憶（P3 2-14） | 原作：12/31 后港岛 | L |
| B13 | hub.home | 宿舍 | Iwatodai Dorm / 巌戸台分寮（P3 1-13） | 原作：宿舍 | L |
| B14 | hub.home | unlock=late | Living With Determination -Iwatodai Dormitory Arrange-（P3 2-16） | 原作：12/31 后宿舍 | L |
| B15 | requests | — | Afternoon Break（P3 2-08） | 借用：原作午休；伊丽莎白委托在天鹅绒内，无单独曲 | L |
| B16 | explore | floorTier 1–6（塔耳塔洛斯区块） | tartarus_0d01（P3 1-15）/ 0d02（1-22）/ 0d03（1-29）/ 0d04（2-06）/ 0d05（2-10）/ 0d06（2-17） | 原作：区块 1–6 | L |
| B17 | explore | FES 「塔内 BGM 选择」池（设置开，默认关） | The Snow Queen（FES 08）/ Maya Theme（FES 09）/ Persona（FES 13）/ Time Castle（FES 14） | 原作：FES 塔耳塔洛斯可选 BGM | L |
| B18 | explore.risk | Monad 门 / 风险岔路 | Interstice of Time / 時の狭間（FES 06） | 借用：FES 时之狭间主题，最贴近隐藏高难区 | L |
| B19 | explore.callingcard | callingCard=true（满月告示后） | Crisis（P3 1-07）+ Calamity（P3 1-25） | 借用：原作满月作战前夕的危机/阴影事件曲；满月作战本身在 BOSS 战 | L |
| B20 | explore.safe | 安全屋（塔内转送点） | Peace / やすらぎ（P3 1-11） | 借用：原作安宁事件曲 | L |
| B21 | explore.escape | 撤退 | Calamity（P3 1-25） | 借用：影时间危机 | L |
| B22 | battle.normal | encounter=normal | Mass Destruction（P3 1-16） | 原作：普通战 | L |
| B23 | battle.normal | P3P 池（默认开，权重低） | Wiping All Out（P3P 05） | 原作：P3P 女主线普通战 | L |
| B24 | battle.normal | FES「The Answer」池（默认关） | Mass Destruction -P3fes version-（FES 07） | 原作：The Answer 普通战 | L |
| B25 | battle.ambush | encounter=ambush | Mass Destruction（同 B22） | 借用：P3/FES/P3P 原作先手无换曲 | L |
| B26 | battle.ambushed | encounter=ambushed | Mass Destruction（同 B22） | 原作：被偷袭不换曲 | L |
| B27 | battle.elite | tier=elite（守门/中 BOSS） | Master of Tartarus（P3 2-03）+ Danger Zone（P3P 08） | 原作：塔耳塔洛斯 BOSS 战 | L |
| B28 | battle.elite | 对手为劲敌型精英（可选） | Unavoidable Battle / 避けられぬ戦い（P3 1-10）+ Heartful Cry（FES 12） | 原作：Strega/伊丽莎白战；FES 队员战 | L |
| B29 | boss.intro | — | That Which Comes From The Darkness / 暗闇より出でしもの（P3 2-18） | 原作：Nyx 化身战前 | L |
| B30 | boss.p1 | tier=boss | Master of Shadow（P3 1-20） | 原作：满月大型阴影战 | L |
| B31 | boss.p2 | tier=boss, phase=2 | Basement（P3 2-02） | 借用：原作战车/正义阴影事件曲（原作满月 BOSS 无阶段换曲） | L |
| B32 | boss.p1 | tier=ruler | Battle Hymn of the Soul / 全ての人の魂の戦い（P3 2-19） | 原作：Nyx 化身战 | L |
| B33 | boss.p2 | tier=ruler, phase=2 | Burn My Dread -Last Battle-（P3 2-22）；FES 池：Darkness / 闇（FES 16） | 原作：Nyx 最终战；FES Erebus 战 | L |
| B34 | boss.defeat | — | Peace / やすらぎ（P3 1-11） | 借用 | 1 |
| B35 | holdup | HOLD UP / 交涉 | 不切（战斗曲继续） | 原作：P3 包围总攻前无专曲 | — |
| B36 | allout.finish | 总攻 | 不切 | 原作 | — |
| B37 | highlight | 面具进化 / 羁绊 MAX | The Path is Open（P3 1-31） | 原作：面具进化 | 1 |
| B38 | victory | 胜利 | After the Battle / 戦いのあと（P3 1-17） | 原作：胜利 fanfare | 1 |
| B39 | result | 局末评级 | After the Battle（同上，循环段） | 借用：P3 无独立结算曲 | L |
| B40 | gameover | 全灭 | The Path Was Closed（P3 1-32） | 原作：Game Over | 1 |
| B41 | velvet | 天鹅绒电梯 | Aria of the Soul / 全ての人の魂の詩（P3 1-02） | 原作 | L |
| B42 | velvet | 设置「Blues」彩蛋（默认关） | Blues in Velvet Room（P3 2-26） | 原作：Bonus track | L |
| B43 | velvet.challenge | 天鹅绒试炼 | Between Doors / 扉の間（FES 10） | 借用：FES 时之狭间选门 / P3P Vision Quest 选关曲 | L |
| B44 | shop.kurosawa | 警察署黑泽巡警 | Paulownia Mall / ポロニアンモール（P3 1-21） | 原作：波罗尼亚商城（警署在商城内） | L |
| B45 | shop.aohige | 青髭药局 | Paulownia Mall（同上） | 原作：同商城 | L |
| B46 | shop.shinshoudo | 眞宵堂古董店 | Paulownia Mall（同上） | 原作：同商城 | L |
| B47 | shop.* | 设置「电视购物」彩蛋 | Tanaka's Amazing Commodities / 時価ネットたなか（P3 2-09） | 原作：田中社长电视购物 | L |
| B48 | bond | 羁绊事件 / 升级 | Joy（P3 1-28）+ After School / 放課後（P3P 03）+ Tender Feeling（P3P 07） | 原作：Social Link 事件 | L |
| B49 | bond | 羁绊首次建立 | The Power of the Heart / 心の力（P3 2-13） | 原作：Arcana 显现 | J |

**蓝皮 BGM 场景数：49 行；涉及原作曲 49 首。**

### 2.3 粉 p3r-pink（P3R；女主皮）

| # | cueId | 情境 / 切换条件 | 原作曲目（编号） | 依据 | 循环 |
|---|---|---|---|---|---|
| P1 | title | 默认 | Full Moon Full Life（P3R 1-01） | 借用：P3R 片头主题曲（标题画面实际曲待核） | L |
| P2 | settings | — | 不切 | 借用 | — |
| P3 | loading | 加载 >1.5s | The Voice Someone Calls (P3R ver.)（P3R 1-12） | 原作：塔耳塔洛斯入口 | 1 |
| P4 | hub | time=day | Want To Be Close -Reload-（P3R 1-04） | 原作：第 1 学期学园 | L |
| P5 | hub | time=day, season=semester2 | Changing Seasons -Reload-（P3R 2-01） | 原作：第 2 学期 | L |
| P6 | hub | 港岛街区 | When The Moon's Reaching Out Stars -Reload-（P3R 1-10） | 原作：Port Island | L |
| P7 | hub | time=night | Color Your Night（P3R 1-16） | 待核：P3R 夜间新曲 | L |
| P8 | hub | moon=full | Bad Feeling / 嫌な予感 (P3R ver.)（P3R 1-22） | 原作：满月当天 | L |
| P9 | hub | env=darkHour | Fearful Experience (P3R ver.)（P3R 1-23） | 原作：影时间事件 | L |
| P10 | hub | unlock=late | Memories of the City (P3R ver.)（P3R 2-15） | 原作：12/31 后 | L |
| P11 | hub | 女主皮彩蛋池（设置开，默认关） | A Way of Life（P3P 02）/ Time（P3P 04）/ Sun（P3P 06） | 借用：P3P 女主线曲，贴合粉皮女主 | L |
| P12 | hub.home | 宿舍 | Iwatodai Dorm -Reload-（P3R 1-11） | 原作 | L |
| P13 | hub.home | unlock=late | Living With Determination -Iwatodai Dorm Arrangement- (P3R ver.)（P3R 2-17） | 原作 | L |
| P14 | requests | — | The Meaning of Armbands（P3R 1-20） | 借用：SEES 臂章/作战主题，最贴近接任务 | L |
| P15 | explore | floorTier 1–6 | tartarus_0d01–0d06 (P3R ver.)（P3R 1-13 / 1-21 / 1-28 / 2-06 / 2-10 / 2-18） | 原作 | L |
| P16 | explore | Episode Aigis 池（设置开） | The Snow Queen -Reload-（P3R-EA 09）/ Maya's Theme -Reload-（P3R-EA 10）/ Persona -Reload-（P3R-EA 14）/ Time Castle -Reload-（P3R-EA 15） | 原作：Episode Aigis 时之狭间/选曲 | L |
| P17 | explore.risk | Monad 门 | Interstice of Time（P3R-EA 06） | 借用 | L |
| P18 | explore.callingcard | callingCard=true | Crisis (P3R ver.)（P3R 1-06）+ Calamity (P3R ver.)（P3R 1-24） | 借用（同蓝皮理由） | L |
| P19 | explore.safe | 安全屋 | Peace -Reload-（P3R 1-09） | 借用 | L |
| P20 | explore.escape | 撤退 | Calamity (P3R ver.)（P3R 1-24） | 借用 | L |
| P21 | battle.normal | encounter=normal | Mass Destruction -Reload-（P3R 1-14） | 原作：普通战 | L |
| P22 | battle.ambush | encounter=ambush | It's Going Down Now（P3R 1-30） | 原作：P3R 我方优势战 | L |
| P23 | battle.ambushed | encounter=ambushed | Mass Destruction -Reload-（P3R 1-14） | 原作 | L |
| P24 | battle.normal | Episode Aigis 池（默认关） | Mass Destruction -P3fes Reload-（P3R-EA 08） | 原作：Episode Aigis 普通战 | L |
| P25 | battle.elite | tier=elite | Master of Tartarus -Reload-（P3R 2-03） | 原作：塔 BOSS | L |
| P26 | battle.elite | 劲敌型（可选） | Unavoidable Battle (P3R ver.)（P3R 1-08）+ Heartful Cry（P3R-EA 13） | 原作 | L |
| P27 | boss.intro | — | What Lies in the Darkness (P3R ver.)（P3R 2-19） | 原作 | L |
| P28 | boss.p1 | tier=boss | Master of Shadow -Reload-（P3R 1-18） | 原作：满月 BOSS | L |
| P29 | boss.p2 | tier=boss, phase=2 | Deep Mentality -Reload-（P3R 1-29） | 借用：原作教皇/恋人阴影事件曲，节奏最接近战斗 | L |
| P30 | boss.p1 | tier=ruler | Battle Hymn of the Soul (P3R ver.)（P3R 2-20） | 原作 | L |
| P31 | boss.p2 | tier=ruler, phase=2 | Burn My Dread -Last Battle Reload-（P3R 2-23）；EA 池：Darkness（P3R-EA 17） | 原作 | L |
| P32 | boss.defeat | — | Peace -Reload-（P3R 1-09） | 借用 | 1 |
| P33 | holdup | HOLD UP / 交涉 | 不切 | 原作：无专曲 | — |
| P34 | allout.finish | 总攻 | 不切 | 原作 | — |
| P35 | highlight | 面具进化 / 羁绊 MAX | The Path is Open (P3R ver.)（P3R 1-31） | 原作 | 1 |
| P36 | victory | 胜利 | After the Battle (P3R ver.)（P3R 1-15） | 原作 | 1 |
| P37 | result | 局末评级 | After the Battle (P3R ver.)（循环段） | 借用 | L |
| P38 | gameover | 全灭 | The Path Was Closed (P3R ver.)（P3R 1-32） | 原作 | 1 |
| P39 | velvet | 天鹅绒 | Aria of the Soul (P3R ver.)（P3R 1-02） | 原作 | L |
| P40 | velvet.challenge | 试炼 | Between Doors（P3R-EA 11） | 借用 | L |
| P41 | shop.kurosawa / aohige / shinshoudo | 三店 | Paulownia Mall -Reload-（P3R 1-19） | 原作：波罗尼亚商城 | L |
| P42 | shop.* | 彩蛋 | Tanaka's Amazing Commodities -Reload-（P3R 2-09） | 原作 | L |
| P43 | bond | 羁绊事件 | Joy (P3R ver.)（P3R 1-27）+ Everyone loves 1989（P3R 1-26） | 原作 / 待核（1989 用途） | L |
| P44 | bond | 羁绊首次建立 | Strength of Heart (P3R ver.)（P3R 2-14） | 原作 | J |

**粉皮 BGM 场景数：44 行；涉及原作曲 46 首（另可借 P3P 3 首）。**

### 2.4 黄 p4-yellow（P4G；P4R 发售后替换）

> P4R（Persona 4 Revival）截至 2026-10 只有试玩报道：普通战 Time to Make History、优势战 Reach Out to the Truth（重编）、另有一首「防御反击遭遇」新曲（未公布名）。曲名与 OST 编号待发售后补，现阶段全部用 P4/P4G 原版。

| # | cueId | 情境 / 切换条件 | 原作曲目（编号） | 依据 | 循环 |
|---|---|---|---|---|---|
| Y1 | title | 默认 | Glimpse of a Memory / 記憶の片隅（P4 1-02） | 原作：P4 标题画面 | L |
| Y2 | title | 设置「Golden 片头」 | Shadow World（P4G 01） | 借用：P4G 片头曲 | L |
| Y3 | settings | — | 不切 | 借用 | — |
| Y4 | loading | 加载 >1.5s | Midnight Channel / マヨナカテレビ（P4 1-07） | 原作：午夜电视开场，贴合「掉进电视」 | 1 |
| Y5 | hub | weather=clear, time=day | Your Affection（P4 1-08） | 原作：稻羽晴天 | L |
| Y6 | hub | weather=rain（及阴天） | Heartbeat, Heartbreak（P4 2-04） | 原作：来源标「阴天」；雨天沿用（待核） | L |
| Y7 | hub | time=night | A Sky Full Of Stars（P4G 07） | 原作：P4G 夜间 | L |
| Y8 | hub | weather=snow | SNOWFLAKES（P4G 10） | 原作：稻羽雪天 | L |
| Y9 | hub | weather=fog 或 callingCard=true | Omen（P4 2-21） | 原作：11/21 后（浓雾）稻羽 | L |
| Y10 | hub.home | 堂岛家 | Signs of Love（P4 1-06） | 原作 | L |
| Y11 | hub.home | unlock=late | Alone（P4 2-18） | 原作：11/6 后堂岛家 | L |
| Y12 | requests | — | Deduction / 推理（P4 1-14） | 借用：原作调查队讨论案情 | L |
| Y13 | explore | 入口层 / floorTier 1 | Studio Backlot / Backside of the TV（P4 1-13） | 原作：电视世界入口 | L |
| Y14 | explore | 按周统治者轮换 | Castle（P4 1-15）/ Sauna（P4 1-23）/ Theater·Striptease（P4 2-03）/ Game（P4 2-06）/ Secret Base（P4 2-16）/ Heaven（P4 2-17）/ Long Way（P4 2-20）/ Memories / 記憶（P4G 12） | 原作：各迷宫 | L |
| Y15 | explore | floorTier=6 / 终局 | Corridor / 回廊（P4 2-22） | 原作：黄泉比良坂 | L |
| Y16 | explore.callingcard | callingCard=true（午夜频道预告后） | Border of Insanity / 狂気の境界線（P4 1-16） | 借用：剧情紧张事件曲 | L |
| Y17 | explore.risk | 风险岔路 | Zone Time（P4 2-07） | 借用：悬疑事件曲 | L |
| Y18 | explore.safe | 安全屋 | Studio Backlot（P4 1-13） | 借用：入口安全区 | L |
| Y19 | explore.escape | 撤退 | Zone Time（P4 2-07） | 借用 | L |
| Y20 | battle.normal | encounter=normal | Time To Make History（P4G 02） | 原作：P4G 普通战（无先手时） | L |
| Y21 | battle.ambush | encounter=ambush | Reach Out To The Truth（P4 1-25） | 原作：P4G 我方先手 | L |
| Y22 | battle.ambushed | encounter=ambushed | Time To Make History（P4G 02） | 原作：被偷袭用普通战曲 | L |
| Y23 | battle.normal | 设置「P4 原版战斗曲」 | Reach Out To The Truth（P4 1-25） | 原作：P4 普通战 | L |
| Y24 | battle.elite | tier=elite | Reach Out To The Truth -First Battle-（P4 1-11） | 原作：首战 / 迷宫中 BOSS | L |
| Y25 | boss.intro | — | Who's There? / そこにいるのは誰?（P4 1-10） | 原作：阴影事件 | L |
| Y26 | boss.p1 | tier=boss | I'll Face Myself -Battle-（P4 1-17） | 原作：BOSS 战 | L |
| Y27 | boss.p2 | tier=boss, phase=2 | A New World Fool（P4 2-08） | 借用：原作国之狭雾/足立战（原作 BOSS 无阶段换曲） | L |
| Y28 | boss.p1 | tier=ruler | The Almighty（P4 2-23） | 原作：天之狭雾战 | L |
| Y29 | boss.p2 | tier=ruler, phase=2 | The Genesis（P4 2-24）；彩蛋：The Fog / 霧（P4 2-09）、Revelations: Mitsuo（P4G 15） | 原作：伊邪那美战 | L |
| Y30 | boss.defeat | — | I'll Face Myself（P4 1-18） | 原作：面对自我事件 | 1 |
| Y31 | holdup | HOLD UP / 交涉 | 不切 | 原作：无专曲 | — |
| Y32 | allout.finish | 总攻 | 不切 | 原作 | — |
| Y33 | highlight | 觉醒 / 羁绊 MAX | Awakening / 覚醒（P4 1-24）+ The Path is Open (P4 ver.)（P4 2-13） | 原作：觉醒 / Arcana Max | 1 |
| Y34 | victory | 胜利 | Period（P4 2-10） | 原作：结算画面（P4 胜利与结算同一曲） | 1 |
| Y35 | result | 结算 / 局末评级 | Period（P4 2-10） | 原作 | L |
| Y36 | gameover | 全灭 | Traumerei / 夢想曲（P4 2-14） | 借用：OST 未单列 Game Over；取悲伤事件曲（待核） | 1 |
| Y37 | velvet | 进入（jingle）→ 常驻 | Welcome to the Limousine（P4 1-03）→ Aria of the Soul（P4 1-04） | 原作：轿车开场 + 天鹅绒 | J→L |
| Y38 | velvet | 彩蛋 | Electronica In Velvet Room（P4 2-27） | 原作：Bonus | L |
| Y39 | velvet.challenge | 试炼 | Girl of the Hollow Forest / 虚ろの森の少女（P4G 11） | 借用：P4G 玛丽主题 | L |
| Y40 | shop.daidara | 大太良金属工艺 | How Much?（P4 2-15） | 原作：商店 | L |
| Y41 | shop.shiroku | 四六商店 | How Much?（P4 2-15） | 原作：商店 | L |
| Y42 | shop.junes | Junes | Junes Theme / ジュネスのテーマ（P4 2-11） | 原作 | L |
| Y43 | bond | 羁绊事件 | Like a Dream Come True（P4 1-09）+ Smile（P4 1-12） | 原作：Social Link 事件 / 欢乐事件 | L |
| Y44 | bond | 羁绊首次建立 | Strength of Heart (P4 ver.)（P4 2-12） | 原作：Arcana 显现 | J |

**黄皮 BGM 场景数：44 行；涉及原作曲 47 首。**

---

## 3. 音效（SE）清单 —— 四皮同表

列：se id（文件名去扩展名）· 触发事件（FX-MAP；🆕=本文新提，见 §5）· 四皮来源（「原作抓取：…」= 从该作对应画面录屏/音频中截取；「—」= 该皮原作无此机制，不需要；「借用」= 用同作最接近的音）。
所有 SE 走 `se` 总线；`voice.*` 见 §4。挂法沿用 FX-MAP §H：事件/recipe 的 `sfx: [{id, at, bus}]`。

### 3.1 系统音

| se id | 事件 | 红 P5R | 蓝 P3 | 粉 P3R | 黄 P4G |
|---|---|---|---|---|---|
| se.ui.cursor | 🆕 ui:cursor | 原作抓取：菜单光标 | 原作抓取 | 原作抓取 | 原作抓取 |
| se.ui.confirm | 🆕 ui:confirm | 原作抓取：确认 | 原作抓取 | 原作抓取 | 原作抓取 |
| se.ui.cancel | 🆕 ui:cancel | 原作抓取：取消/返回 | 原作抓取 | 原作抓取 | 原作抓取 |
| se.ui.page | 🆕 ui:page | 原作抓取：切页签（L1/R1） | 原作抓取 | 原作抓取 | 原作抓取 |
| se.ui.error | 🆕 ui:error | 原作抓取：不可选/钱不够 | 原作抓取 | 原作抓取 | 原作抓取 |
| se.ui.open / se.ui.close | ui:open / ui:close | 原作抓取：主菜单开/关（红黑斜切声） | 原作抓取 | 原作抓取 | 原作抓取 |
| se.item.get | 🆕 item:get | 原作抓取：获得道具 | 原作抓取 | 原作抓取 | 原作抓取 |
| se.money.get | 🆕 money:get | 原作抓取：获得 ¥（结算计数音） | 原作抓取 | 原作抓取 | 原作抓取 |
| se.shop.buy | 🆕 shop:buy | 原作抓取：购买成交 | 原作抓取 | 原作抓取 | 原作抓取 |
| se.levelup | levelup | 原作抓取：LEVEL UP | 原作抓取 | 原作抓取 | 原作抓取 |
| se.persona.levelup | persona:levelup | 原作抓取：面具升级 | 原作抓取 | 原作抓取 | 原作抓取 |
| se.skill.learn | 🆕 skill:learn（或 persona:levelup.learned[] 分支） | 原作抓取：学会技能 | 原作抓取 | 原作抓取 | 原作抓取 |
| se.bond.rankup | bond:rankup | 原作抓取：COOP RANK UP | 原作抓取：Social Link 升级 | 原作抓取 | 原作抓取 |
| se.bond.new | bond:rankup(rank=1) | 原作抓取：COOP 成立「我即是汝」 | 原作抓取 | 原作抓取 | 原作抓取 |
| se.achievement | achievement:unlock | 借用：se.item.get 高音版 | 借用 | 借用 | 借用 |
| se.date.flip | env:change(date) | 原作抓取：日历翻页 | 原作抓取：日期切换 | 原作抓取 | 原作抓取：日期+天气 |
| se.card.flip | card:pick | 借用：P5R 菜单翻卡 | 原作抓取：Shuffle Time 翻牌 | 原作抓取：Shuffle Time | 原作抓取：Shuffle Time |
| se.buff | buff:grant | 借用：手机通知音 | 借用 | 借用 | 借用 |
| se.velvet.alarm | velvet:alarm | 原作抓取：合成警报 | 借用：电梯警示 | 借用 | 借用 |
| se.fusion | fusion:result | 原作抓取：断头台落下 | 原作抓取：合成 | 原作抓取 | 原作抓取 |
| se.fusion.accident | fusion:accident | 原作抓取：合成事故 | 原作抓取：合成事故（P3 有事故） | 借用 | 原作抓取：合成事故 |
| se.fusion.chair | fusion:result(kind=itemize) | 原作抓取：电椅 | — | — | — |
| se.callingcard | callingcard:send | 原作抓取：预告信钉墙 | 借用：满月钟声 | 借用 | 借用：午夜电视雪花 |
| se.compendium.page | 🆕 ui:page(compendium) | 原作抓取 | 原作抓取 | 原作抓取 | 原作抓取 |

### 3.2 战斗音

| se id | 事件 | 红 P5R | 蓝 P3 | 粉 P3R | 黄 P4G |
|---|---|---|---|---|---|
| se.turn | turn:start | 原作抓取：指令轮弹出 | 原作抓取 | 原作抓取 | 原作抓取 |
| se.attack.slash | action(kind=attack) | 原作抓取：近战斩 | 原作抓取：斩/打/贯三种 | 原作抓取 | 原作抓取 |
| se.gun | action(kind=gun) | 原作抓取：枪击 | — | — | — |
| se.hit.phys | action(hit) | 原作抓取 | 原作抓取（物理） | 原作抓取 | 原作抓取 |
| se.hit.gun | action(hit, element=gun) | 原作抓取 | — | — | — |
| se.hit.fire / ice / elec / wind | action(hit, element) | 原作抓取：Agi/Bufu/Zio/Garu 系 | 原作抓取 | 原作抓取 | 原作抓取 |
| se.hit.psy / se.hit.nuke | action(hit, element) | 原作抓取：Psi/Frei 系 | 借用：万能音降调（P3 无念/核） | 借用 | 借用 |
| se.hit.bless / se.hit.curse | action(hit, element) | 原作抓取：Kouha/Eiha 系 | 原作抓取：光/暗（Hama/Mudo 伤害版借用） | 原作抓取 | 原作抓取 |
| se.hit.almighty | action(hit, element) | 原作抓取：Megido 系 | 原作抓取 | 原作抓取 | 原作抓取 |
| se.hit.heal / se.hit.buff / se.hit.debuff | action(kind=skill, support) | 原作抓取：Dia / -kaja / -nda | 原作抓取 | 原作抓取 | 原作抓取 |
| se.weak | action(hit.weak) | 原作抓取：WEAK | 原作抓取：弱点「咔」+眼部条 | 原作抓取 | 原作抓取 |
| se.crit | action(hit.crit) | 原作抓取：CRITICAL cut-in | 原作抓取：暴击 cut-in | 原作抓取 | 原作抓取 |
| se.technical | action(hit.technical) | 原作抓取：TECHNICAL | 借用：se.crit | 借用 | 借用 |
| se.miss | action(hit.miss) | 原作抓取：MISS | 原作抓取 | 原作抓取 | 原作抓取 |
| se.resist / se.null / se.drain / se.repel | action(hit.resist/null/drain/repel) | 原作抓取：四种 | 原作抓取 | 原作抓取 | 原作抓取 |
| se.down | unit:down | 原作抓取：敌人倒地 | 原作抓取 | 原作抓取 | 原作抓取 |
| se.ko | unit:down(dead) | 原作抓取：消散 | 原作抓取 | 原作抓取 | 原作抓取 |
| se.onemore | onemore | 原作抓取：1 MORE | 原作抓取 | 原作抓取 | 原作抓取 |
| se.baton | baton | 原作抓取：BATON PASS 击掌 | 借用：se.onemore（P3 原作无） | 原作抓取：Shift | 借用（P4G 无；P4R 出后替换） |
| se.holdup | holdup | 原作抓取：HOLD UP 包围 | 原作抓取：包围 | 原作抓取 | 原作抓取 |
| se.allout | allout | 原作抓取：总攻斩击 + 定格「咔嚓」 | 原作抓取：尘云 + 定格 | 原作抓取 | 原作抓取 |
| se.highlight.duo | highlight(kind=duo) | 原作抓取：SHOWTIME 开场 | 借用：Fusion Spell 音 | 原作抓取：Theurgy | 借用：追击连携 |
| se.highlight.solo | highlight(kind=solo) | 借用：se.crit 加长 | 借用 | 原作抓取：Theurgy 开场 | 借用 |
| se.summon | action(kind=skill) 前段 summon 原语 | 原作抓取：扯面具 + 蓝焰 | 原作抓取：召唤器扣扳机 + 玻璃碎 | 原作抓取：召唤器（P3R 版） | 原作抓取：塔罗牌捏碎 |
| se.persona.switch | persona:switch | 原作抓取：换面具 | 原作抓取：换面具（塔罗） | 原作抓取 | 原作抓取 |
| se.party.switch | party:switch | 原作抓取：SWITCH | 借用：se.persona.switch | 借用 | 借用 |
| se.guard | action(kind=guard) | 原作抓取：防御 | 原作抓取 | 原作抓取 | 原作抓取 |
| se.escape.success / se.escape.fail | escape | 原作抓取：逃跑成功/失败 | 原作抓取 | 原作抓取 | 原作抓取 |
| se.enemy.appear | 🆕 unit:spawn | 原作抓取：阴影现形（面具碎） | 原作抓取：阴影涌出 | 原作抓取 | 原作抓取 |
| se.enemy.vanish | 🆕 unit:flee（交涉后逃散/宝魔逃走） | 原作抓取 | 原作抓取 | 原作抓取 | 原作抓取 |
| se.intent | 🆕 intent:show（蓄力预告亮起） | 借用：se.ui.error 低频版 | 借用 | 借用 | 借用 |
| se.shield.break | shield:break | 借用：玻璃碎 | 借用 | 借用 | 借用 |
| se.boss.phase | boss:phase | 借用：se.allout 前段 + 低频 | 借用 | 借用 | 借用 |
| se.ailment.\<status\> ×11 | ailment:apply | 原作抓取：每种异常 | 原作抓取（P3 叫法） | 原作抓取 | 原作抓取 |
| se.ailment.cure | ailment:cure | 原作抓取 | 原作抓取 | 原作抓取 | 原作抓取 |
| se.bond.assist | bond:assist | 原作抓取：追击/挡刀提示 | 借用 | 借用 | 原作抓取：羁绊追击 |
| se.talk / se.talk.success / se.talk.fail | talk:start / talk:result | 原作抓取：交涉开始/成功/失败 | 原作抓取（P3 无交涉 → 借用 HOLD UP 选项音） | 借用 | 借用 |
| se.navi.scan | 🆕 navi:scan（首次命中弱点亮起） | 原作抓取：分析 | 原作抓取：风花分析 | 原作抓取 | 原作抓取：久慈川分析 |
| se.result | battle:end | 原作抓取：RESULT 计数 | 原作抓取 | 原作抓取 | 原作抓取 |
| se.rank.stamp | battle:end(rank) | 借用：se.allout 定格 | 借用 | 借用 | 借用 |

### 3.3 探索音

| se id | 事件 | 红 P5R | 蓝 P3 | 粉 P3R | 黄 P4G |
|---|---|---|---|---|---|
| se.step | explore:move | 原作抓取：殿堂脚步（Q 版缩短） | 原作抓取：塔内脚步 | 原作抓取 | 原作抓取 |
| se.cover | explore:cover | 原作抓取：贴掩体 | 借用：蹲伏衣料声 | 借用 | 借用 |
| se.sneak | 🆕 explore:sneak（掩体间移动） | 原作抓取：掩体跳转 | 借用 | 借用 | 借用 |
| se.spotted | explore:spotted | 原作抓取：被发现「！」 | 原作抓取：阴影追击 | 原作抓取 | 原作抓取 |
| se.alert.up | 🆕 alert:change | 原作抓取：警戒度上升 | 借用 | 借用 | 借用 |
| se.chest.open | explore:interact(kind=chest) | 原作抓取：开宝箱 | 原作抓取 | 原作抓取 | 原作抓取 |
| se.chest.locked | explore:interact(kind=lock) | 原作抓取：撬锁 | 借用 | 借用 | 借用 |
| se.mechanism | explore:interact(kind=puzzle) / ui:open(puzzle) | 原作抓取：机关 | 借用 | 借用 | 原作抓取 |
| se.explore.scan | explore:scan | 原作抓取：第三只眼 | 原作抓取：风花「探知」 | 原作抓取 | 原作抓取：久慈川侦测 |
| se.exit.open | 🆕 explore:exit（守门击败后开门） | 原作抓取：开门 | 原作抓取：传送装置 | 原作抓取 | 原作抓取 |
| se.ambush.hit | map:encounter(ambush) 前段 | 原作抓取：扯敌人面具 | 原作抓取：先手击打 | 原作抓取 | 原作抓取 |
| se.safe.save | scene:enter(safe) | 原作抓取：安全屋 | 原作抓取：转送点 | 原作抓取 | 借用 |

### 3.4 转场音

| se id | 事件 | 红 P5R | 蓝 P3 | 粉 P3R | 黄 P4G |
|---|---|---|---|---|---|
| se.scene.enter / se.scene.leave | scene:enter / scene:leave | 原作抓取：异界导航启动 / 回现实 | 原作抓取：影时间开始 | 原作抓取 | 原作抓取：掉进电视 |
| se.map.move | map:move | 原作抓取：路线冲刺 | 借用：楼梯 | 借用 | 借用 |
| se.encounter.normal / ambush / ambushed | map:encounter | 原作抓取：三种遭遇 | 原作抓取 | 原作抓取 | 原作抓取 |
| se.transition.battle | battle:start | 原作抓取：开战斜切 | 原作抓取：玻璃碎 | 原作抓取 | 原作抓取：方块推屏 |
| se.shop.door / se.shop.exit | shop:enter / shop:exit | 借用：进店门铃（录像确认） | 借用 | 借用 | 借用 |
| se.velvet.enter / se.velvet.exit | ui:open(velvet) / ui:close(velvet) | 原作抓取：牢门 / 锁链 | 原作抓取：电梯上升 | 原作抓取 | 原作抓取：轿车门 |
| se.env.darkhour | env:change(darkHour) | — | 原作抓取：影时间钟停 | 原作抓取 | — |
| se.env.weather | env:change(weather) | 借用：雨声环境（循环，走 se 总线 30% 音量） | 借用 | 借用 | 原作抓取：雨/雪/雾 |

### 3.5 SE 条数统计（按行计；一行含多个 id 的按 id 展开计）

| 皮 | 系统 | 战斗 | 探索 | 转场 | 合计（需采集，去掉「—」） |
|---|---|---|---|---|---|
| 红 p5r-red | 25 | 63 | 12 | 12 | **112** |
| 蓝 p3-blue | 24 | 61 | 12 | 13 | **110** |
| 粉 p3r-pink | 24 | 61 | 12 | 13 | **110** |
| 黄 p4-yellow | 24 | 61 | 12 | 12 | **109** |

（统计口径：se.hit.fire/ice/elec/wind 计 4 条；se.resist/null/drain/repel 计 4 条；se.ailment.\<status\> 计 11 条；se.ui.open/close 计 2 条；「借用」也计入（要有文件）；「—」不计。红独有 se.gun、se.hit.gun、se.fusion.chair；蓝/粉独有 se.env.darkhour；黄与红都没有影时间音。数字由脚本按表逐行展开统计。）

---

## 4. 角色战斗语音（voice 总线）

### 4.1 分类（每个同伴同一套 key；文件 `voice/<unitId>/<key>_<nn>.opus`，每类 2–4 条随机）

| key | 触发事件 | 说明 |
|---|---|---|
| turn | turn:start | 轮到我（可选，30% 概率） |
| skill | action(kind=skill) 前段 | 出招 / 召唤面具台词（P5「Persona!」、P3 召唤器前、P4「Persona!」） |
| attack | action(kind=attack/gun) | 普攻/枪击 |
| hurt | action(target=self, hit) | 受击 |
| hurt.weak | action(target=self, hit.weak) | 被打弱点 |
| down | unit:down(side=ally) | 倒地 |
| ko | unit:down(dead) | 战斗不能 |
| revived | 🆕 unit:revive | 被复活 |
| lift | bond:assist(kind=lift) | 扶起队友（施救方） |
| onemore | onemore | 1 MORE |
| baton.give / baton.take | baton | 交棒 / 接棒 |
| holdup | holdup | HOLD UP 台词（P5「Hold up!」类；P3/P4 包围台词） |
| allout | allout | 总攻发起 |
| finish | allout 收尾 | 定格台词（Panther「OMG!」/ Queen「JUSTICE HAS PREVAILED.」等） |
| highlight | highlight | 必杀 / SHOWTIME / Theurgy 台词 |
| victory | battle:end(win) | 胜利 |
| levelup | levelup | 升级 |
| switchIn | party:switch | 被换上场 |
| assist.followup / protect / endure / cure | bond:assist | 羁绊能力台词 |
| lowhp | 🆕 unit:lowhp | HP <25% |
| guard | action(kind=guard) | 防御（可选） |
| navi.* | 导航角色专用 | scan（分析）、weakFound（弱点）、enemyDown、holdupPrompt、bossPhase（换阶段警告）、ambushWarn（被偷袭）、healHint、victory |

### 4.2 名单（D-005：只用本作角色）

| 皮 | 战斗成员（unitId） | 导航 | 备注 |
|---|---|---|---|
| 红 | joker、mona、skull、panther、fox、queen、noir、crow、violet | oracle（双叶）；mona 早期兼导航 | 全员有 BATON / SHOWTIME 语音 |
| 蓝 | makoto（男主）、yukari、junpei、akihiko、mitsuru、aigis、koromaru、ken、shinjiro；FES 选：metis | fuuka（风花）；mitsuru 早期兼导航 | P3 原作无 BATON → baton.* 借 onemore；男主原作语音少，缺的类回落为 SE |
| 粉 | kotone（女主）+ 同蓝皮队员（P3R 版语音），EA 选：metis | fuuka（P3R 版） | P3R 无女主 → 女主语音借 P3P（女主线）；队员用 P3R 语音（有 Shift/Theurgy） |
| 黄 | yu、yosuke、chie、yukiko、kanji、teddie、naoto | rise（久慈川）；teddie 早期兼导航 | P4G 无 BATON → 借 onemore；P4R 出后补 baton |

估计每人约 25 类 × 平均 3 条 ≈ 75 条；导航约 8 类 × 3 ≈ 24 条。红 9 人+1 导航 ≈ 700 条；蓝 10+1 ≈ 770；粉 10+1 ≈ 770；黄 7+1 ≈ 550。v1 只采 §6 的「必需语音」子集。

---

## 5. 新事件提案（FX-MAP 现无，需主策划并入；本文不改 FX-MAP）

| 事件 | payload | 用途 | 挂的音 |
|---|---|---|---|
| ui:cursor / ui:confirm / ui:cancel / ui:page / ui:error | context | DOM 系统音（不进 Director，直接调音频总线） | se.ui.* |
| item:get / money:get | itemId,count / amount | 获得物品/金钱 | se.item.get / se.money.get |
| shop:buy | shopId,itemId | 成交 | se.shop.buy |
| skill:learn | unitId/personaId, skillId | 学会技能（可作 persona:levelup 分支） | se.skill.learn |
| unit:spawn / unit:flee | enemyId | 敌人现形 / 逃散 | se.enemy.appear / vanish |
| unit:revive / unit:lowhp | unitId | 复活 / 濒死 | voice.*.revived / lowhp |
| intent:show | enemyId, intentId | 蓄力意图亮起（HUD 常驻之外的提示音） | se.intent |
| navi:scan | enemyId, affinity | 导航首次揭示弱点 | se.navi.scan + voice.navi.scan |
| explore:sneak | from,to | 掩体间移动 | se.sneak |
| alert:change | level | 警戒度变化 | se.alert.up；level=high → bgm 条件 alert=high |
| explore:exit | gateId | 守门击败后出口开门 | se.exit.open |
| boss:intro | bossId | BOSS 登场 | bgm:cue boss.intro |
| run:fail / run:retreat | reason | 全灭失败 / 主动撤退 | bgm:cue gameover / explore.escape |
| cueId 新增 | — | title、settings(hold)、loading、hub.home、explore.safe、explore.risk、explore.escape、boss.intro、boss.defeat、highlight、gameover、velvet.challenge、compendium(=velvet)、fusion(=velvet)、bond | — |

---

## 6. 工程字段

### 6.1 目录与文件名

```
skins/<skinId>/audio/
  playlist.json          # BGM 池（场景→曲目、条件、循环点、权重）
  sfx.json               # SE id → 文件（可多变体）
  voice.json             # unitId → key → 文件[]
  bgm/<cueId>__<slug>.opus          例：bgm/battle.normal__last-surprise.opus
  bgm/<cueId>__<slug>.m4a           AAC 回落（iOS Safari 旧版）
  se/<se-id>.opus                   例：se/se.hit.fire.opus；变体 se/se.hit.fire~2.opus
  voice/<unitId>/<key>_<nn>.opus    例：voice/panther/finish_01.opus
```
- skinId：`p5r-red` / `p3-blue` / `p3r-pink` / `p4-yellow`。slug 用英文曲名小写连字符（日文曲用官方英文名）。
- **与 D-008 的路径差异**：D-008 写「放 skins/<id>/assets/official/audio/」，本任务书要求 `skins/<id>/audio/{bgm,se,voice}/`。建议：`audio/` 下只提交 json 清单；`bgm/ se/ voice/` 三个目录整体 `.gitignore`、不进任何公开构建（与 D-008「不随公开构建发布」一致）。二者取一需主策划拍板。
- 编码：Opus 96 kbps 立体声（BGM）、Opus 64 kbps 单声道（SE/语音）；AAC 128 kbps 回落。响度 −16 LUFS（D-008），真峰值 ≤ −1 dBTP。

### 6.2 playlist.json 结构样例

```json
{
  "skin": "p5r-red",
  "version": 1,
  "defaults": { "crossfadeMs": 800, "victoryCrossfadeMs": 300, "noRepeat": true },
  "entries": [
    {
      "id": "red.hub.day.tokyo-daylight",
      "scene": "hub",
      "condition": { "time": "day", "weather": "clear" },
      "tracks": [
        { "file": "bgm/hub__tokyo-daylight.opus", "title": "Tokyo Daylight",
          "source": "P5 OST 2-01", "loopStart": 6.412, "loopEnd": 151.870, "weight": 1 },
        { "file": "bgm/hub__beneath-the-mask-inst.opus", "title": "Beneath the Mask -instrumental version-",
          "source": "P5 OST 1-09", "loopStart": 0.000, "loopEnd": 0.000, "weight": 1 }
      ],
      "loop": true,
      "basis": "original",
      "priority": "P1",
      "enabledByDefault": true
    },
    {
      "id": "red.battle.callingcard",
      "scene": "battle.normal",
      "condition": { "callingCard": true },
      "tracks": [
        { "file": "bgm/battle.normal__life-will-change-inst.opus", "title": "Life Will Change -instrumental version-",
          "source": "P5 OST 1-24", "loopStart": 0.000, "loopEnd": 0.000, "weight": 1 }
      ],
      "loop": true, "basis": "original", "priority": "P2", "enabledByDefault": true
    },
    {
      "id": "red.battle.ambush",
      "scene": "battle.ambush",
      "condition": { "encounter": "ambush" },
      "tracks": [
        { "file": "bgm/battle.ambush__take-over.opus", "title": "Take Over",
          "source": "P5R OST 1-03", "loopStart": 0.000, "loopEnd": 0.000, "weight": 1 }
      ],
      "loop": true, "basis": "original", "priority": "P1", "enabledByDefault": true
    }
  ]
}
```
- `loopStart`/`loopEnd` 单位秒（float，采样精确到 1/48000）；`0/0` = 待标（CI 检查：`loop:true` 且 loopEnd=0 报警）。
- `basis`: `original | borrowed | unverified`（对应本文依据列）。
- 用户自加曲：只往 `entries` 加一行或往某条的 `tracks` 加一项（D-008）。
- 设置里「锁定/关闭」存在存档 `audioPrefs[skinId][entryId|trackFile] = "lock" | "off"`，不改 json。

### 6.3 sfx.json 样例

```json
{ "skin": "p5r-red",
  "se": {
    "se.hit.fire": { "files": ["se/se.hit.fire.opus", "se/se.hit.fire~2.opus"], "gainDb": 0, "basis": "original" },
    "se.baton":    { "files": ["se/se.baton.opus"], "gainDb": -2, "basis": "original" },
    "se.intent":   { "files": ["se/se.intent.opus"], "gainDb": -4, "basis": "borrowed" }
  } }
```

### 6.4 加载优先级（首包一律不含音频，D-008）

| 级别 | 何时取 | 内容 |
|---|---|---|
| P0 | 首次交互解锁 AudioContext 时（≈200 KB） | se.ui.* 6 条、se.turn、se.confirm 类（让第一下点击就有声） |
| P1 | 进入据点（hub）后空闲时预取 | 当前天气/时段的 hub 曲、title、battle.normal、battle.ambush、victory、全部战斗 SE、主角+当前 3 名同伴的 skill/finish/victory 语音 |
| P2 | 进入格子关卡前（scene:enter(explore) 的转场期间） | 本局 explore 曲、battle.ambushed、battle.elite、holdup、result、探索 SE、全队语音 |
| P3 | 走到 BOSS 节点前一格 / 发出预告信后 | boss.intro、boss.p1、boss.p2、boss.defeat、explore.escape |
| P4 | 打开对应界面时懒加载（流式边下边播） | shop.*、velvet、velvet.challenge、bond、requests、gameover、所有彩蛋池 |
- 预取失败：该 cue 静音不阻塞玩法；切后台暂停（D-008）。
- 缓存：Service Worker / Capacitor 本地文件缓存，按皮分桶，LRU 上限 150 MB（设置可清）。

### 6.5 体积估算

| 项 | 单位体积 | 红 | 蓝 | 粉 | 黄 |
|---|---|---|---|---|---|
| BGM 全量（Opus 96k，平均 2.8 分钟 ≈ 2.0 MB/首） | — | 66 首 ≈ 132 MB | 49 ≈ 98 MB | 46(+3) ≈ 98 MB | 47 ≈ 94 MB |
| BGM v1 必需（§7 的 20 首） | — | ≈ 40 MB | ≈ 40 MB | ≈ 40 MB | ≈ 40 MB |
| SE（Opus 64k 单声道，平均 0.8 s ≈ 7 KB） | — | 112 条 ≈ 0.8 MB | ≈ 0.8 MB | ≈ 0.8 MB | ≈ 0.8 MB |
| 语音全量（平均 1.5 s ≈ 12 KB/条） | — | ~700 条 ≈ 8.4 MB | ~770 ≈ 9.2 MB | ~770 ≈ 9.2 MB | ~550 ≈ 6.6 MB |
| 语音 v1 必需（每人 8 类×2 条） | — | ≈ 1.9 MB | ≈ 2.1 MB | ≈ 2.1 MB | ≈ 1.5 MB |
| **v1 每皮合计** | — | **≈ 43 MB** | **≈ 43 MB** | **≈ 43 MB** | **≈ 42 MB** |
- AAC 回落另 +33%。首局（P1+P2）实际下载约 12–16 MB。

---

## 7. 获取清单（v1 必须先有；按优先级）

规则：每皮 20 首 BGM + 必需 SE + 必需语音。P1 = 一局能完整跑通（据点→委托→探索→战斗→结算）；P2 = 原作情境切歌成立（先手/被偷袭/精英/BOSS 两阶段/预告信）；P3 = 店与天鹅绒。

### 7.1 红 p5r-red（20 首）
| 优先 | 曲 | 用于 |
|---|---|---|
| P1 | Last Surprise（P5 1-17） | battle.normal / ambushed |
| P1 | Triumph（P5 1-19） | victory |
| P1 | Beneath the Mask -instrumental-（P5 1-09） | hub 白天 |
| P1 | Beneath the Mask（P5 1-29） | hub 夜晚 |
| P1 | Mementos（P5 2-03） | explore（委托关） |
| P1 | King, Queen and Slaves（P5 1-16） | explore（第 1 周统治者） |
| P1 | Royal Days（P5R 1-02） | title |
| P2 | Take Over（P5R 1-03） | battle.ambush |
| P2 | Keeper of Lust（P5 2-18） | battle.elite |
| P2 | Blooming Villain（P5 1-26） | boss.p1 |
| P2 | Will Power（P5 1-14） | boss.p2 |
| P2 | Life Will Change（P5 1-04） | explore.callingcard |
| P2 | Life Will Change -instrumental-（P5 1-24） | 预告信后战斗 |
| P2 | Rivers in the Desert（P5 3-22） | ruler p2 |
| P2 | Talk（P5 1-18） | holdup |
| P2 | Beneath the Mask -rain-（P5 2-12） | hub 雨夜 |
| P3 | Hymn of the Soul（P5 1-08） | velvet |
| P3 | Layer Cake（P5 1-23） | shop.untouchable |
| P3 | Butterfly Kiss（P5 2-02） | shop.takemi |
| P3 | Wicked Plan（P5 2-07） | requests |

### 7.2 蓝 p3-blue（20 首）
| 优先 | 曲 | 用于 |
|---|---|---|
| P1 | Mass Destruction（P3 1-16） | battle.* |
| P1 | After the Battle（P3 1-17） | victory / result |
| P1 | Want To Be Close（P3 1-05） | hub 白天 |
| P1 | When the Moon Reaches for the Stars（P3 1-12） | hub 街区/夜 |
| P1 | tartarus_0d01（P3 1-15） | explore 1 |
| P1 | tartarus_0d02（P3 1-22） | explore 2 |
| P1 | The Voice Someone Calls（P3 1-14） | title / loading |
| P2 | Master of Tartarus（P3 2-03） | battle.elite |
| P2 | Master of Shadow（P3 1-20） | boss.p1 |
| P2 | Basement（P3 2-02） | boss.p2（借用） |
| P2 | An Unpleasant Premonition（P3 1-23） | hub 满月 |
| P2 | Crisis（P3 1-07） | explore.callingcard（借用） |
| P2 | Burn My Dread -Last Battle-（P3 2-22） | ruler p2 |
| P2 | The Path Was Closed（P3 1-32） | gameover |
| P2 | Iwatodai Dorm（P3 1-13） | hub.home / requests 回落 |
| P2 | Wiping All Out（P3P 05） | battle.normal 池第 2 首 |
| P3 | Aria of the Soul（P3 1-02） | velvet |
| P3 | Paulownia Mall（P3 1-21） | 三店 |
| P3 | Joy（P3 1-28） | bond |
| P3 | tartarus_0d03（P3 1-29） | explore 3 |

### 7.3 粉 p3r-pink（20 首）
| 优先 | 曲 | 用于 |
|---|---|---|
| P1 | Mass Destruction -Reload-（P3R 1-14） | battle.normal / ambushed |
| P1 | After the Battle (P3R ver.)（P3R 1-15） | victory / result |
| P1 | Want To Be Close -Reload-（P3R 1-04） | hub 白天 |
| P1 | Color Your Night（P3R 1-16） | hub 夜晚 |
| P1 | tartarus_0d01 (P3R ver.)（P3R 1-13） | explore 1 |
| P1 | tartarus_0d02 (P3R ver.)（P3R 1-21） | explore 2 |
| P1 | Full Moon Full Life（P3R 1-01） | title |
| P2 | It's Going Down Now（P3R 1-30） | battle.ambush |
| P2 | Master of Tartarus -Reload-（P3R 2-03） | battle.elite |
| P2 | Master of Shadow -Reload-（P3R 1-18） | boss.p1 |
| P2 | Deep Mentality -Reload-（P3R 1-29） | boss.p2（借用） |
| P2 | Bad Feeling (P3R ver.)（P3R 1-22） | hub 满月 |
| P2 | Crisis (P3R ver.)（P3R 1-06） | explore.callingcard |
| P2 | Burn My Dread -Last Battle Reload-（P3R 2-23） | ruler p2 |
| P2 | The Path Was Closed (P3R ver.)（P3R 1-32） | gameover |
| P2 | Iwatodai Dorm -Reload-（P3R 1-11） | hub.home |
| P3 | Aria of the Soul (P3R ver.)（P3R 1-02） | velvet |
| P3 | Paulownia Mall -Reload-（P3R 1-19） | 三店 |
| P3 | The Meaning of Armbands（P3R 1-20） | requests |
| P3 | Joy (P3R ver.)（P3R 1-27） | bond |

### 7.4 黄 p4-yellow（20 首）
| 优先 | 曲 | 用于 |
|---|---|---|
| P1 | Time To Make History（P4G 02） | battle.normal / ambushed |
| P1 | Period（P4 2-10） | victory / result |
| P1 | Your Affection（P4 1-08） | hub 晴 |
| P1 | A Sky Full Of Stars（P4G 07） | hub 夜 |
| P1 | Studio Backlot（P4 1-13） | explore 入口 / safe |
| P1 | Castle（P4 1-15） | explore（第 1 周） |
| P1 | Glimpse of a Memory（P4 1-02） | title |
| P2 | Reach Out To The Truth（P4 1-25） | battle.ambush |
| P2 | Reach Out To The Truth -First Battle-（P4 1-11） | battle.elite |
| P2 | I'll Face Myself -Battle-（P4 1-17） | boss.p1 |
| P2 | A New World Fool（P4 2-08） | boss.p2（借用） |
| P2 | Heartbeat, Heartbreak（P4 2-04） | hub 雨/阴 |
| P2 | Omen（P4 2-21） | hub 雾 / 预告后 |
| P2 | Border of Insanity（P4 1-16） | explore.callingcard（借用） |
| P2 | The Genesis（P4 2-24） | ruler p2 |
| P2 | Midnight Channel（P4 1-07） | loading / 预告信 jingle |
| P3 | Aria of the Soul（P4 1-04） | velvet |
| P3 | How Much?（P4 2-15） | 大太良 / 四六 |
| P3 | Junes Theme（P4 2-11） | shop.junes |
| P3 | Deduction（P4 1-14） | requests |

### 7.5 必需 SE（四皮各一份，共 45 条/皮）
se.ui.cursor · se.ui.confirm · se.ui.cancel · se.ui.page · se.ui.error · se.ui.open · se.ui.close · se.item.get · se.money.get · se.levelup · se.bond.rankup · se.turn · se.attack.slash · se.hit.phys · se.hit.fire · se.hit.ice · se.hit.elec · se.hit.wind · se.hit.bless · se.hit.curse · se.hit.almighty · se.hit.heal · se.weak · se.crit · se.miss · se.resist · se.null · se.drain · se.repel · se.down · se.ko · se.onemore · se.baton · se.holdup · se.allout · se.summon · se.persona.switch · se.guard · se.escape.success · se.result · se.step · se.spotted · se.chest.open · se.encounter.normal · se.transition.battle
（红皮另加 se.gun、se.hit.gun = 47 条。）

### 7.6 必需语音（每名战斗成员 8 类 × 2 条；导航 4 类 × 2 条）
skill · hurt · down · onemore · baton.take（P3/P4G 借 onemore）· finish · victory · holdup；导航：navi.scan · navi.weakFound · navi.enemyDown · navi.bossPhase。
v1 只采 4 人首发队 + 导航：红 joker/mona/skull/panther + oracle；蓝 makoto/yukari/junpei/akihiko + fuuka；粉 kotone/yukari/junpei/akihiko + fuuka；黄 yu/yosuke/chie/yukiko + rise。

---

## 8. 来源（本次查证的页面）

- P5 OST 曲目与用途：https://megamitensei.fandom.com/wiki/Persona_5_Original_Soundtrack （VGMdb 条目 https://vgmdb.net/album/63053 ）
- P5R 新曲 29 首与用途：https://megamitensei.fandom.com/wiki/PERSONA5_THE_ROYAL_STRAIGHT_FLUSH_EDITION_Original_Soundtrack ；英文版 10 首 https://megamitensei.fandom.com/wiki/Persona_5_Royal_Original_Soundtrack ；VGMdb https://vgmdb.net/album/116790 、https://vgmdb.net/album/89135
- P3 OST：https://megamitensei.fandom.com/wiki/Persona_3_Original_Soundtrack
- P3 FES OST：https://megamitensei.fandom.com/wiki/Persona_3_FES_Original_Soundtrack
- P3P OST：https://megamitensei.fandom.com/wiki/Persona_3_Portable_Original_Soundtrack （VGMdb https://vgmdb.net/album/15387 ）
- P3R OST（AGM-001~2 曲序）：https://megatenwiki.com/wiki/Persona_3_Reload_Original_Soundtrack （VGMdb https://vgmdb.net/album/136364 ）
- P3R 优势战曲：https://megamitensei.fandom.com/wiki/It%27s_Going_Down_Now
- P3R Episode Aigis OST 曲序：https://personacentral.com/p3r-episode-aigis-ost-preview
- P4 OST：https://megamitensei.fandom.com/wiki/Persona_4_Original_Soundtrack
- P4G OST：https://megamitensei.fandom.com/wiki/Persona_4_Golden_Original_Soundtrack （VGMdb https://vgmdb.net/album/32667 ）
- P4G 普通战/先手战分工：https://megatenwiki.com/wiki/Time_to_Make_History 、https://megamitensei.fandom.com/wiki/Reach_Out_To_The_Truth
- P4 Revival 试玩音乐信息：https://www.gamerbraves.com/persona-4-revival-preview-a-familiar-classic-getting-a-genuine-glow-up

**没能确认（采集时对录像核实，表里已标「待核」）**：P5 Game Over 曲与药妆店曲（OST 未单列）；P3R 标题画面实际用曲、Color Your Night 的确切时段、Everyone loves 1989 用途；P4 雨天是否与阴天同曲、P4 Game Over 曲；各作商店进店门铃音；P4R 全部曲名与编号（未发售）。所有 SE「原作抓取」是采集方式说明，不是原作内部文件名。

## 9. 统计

| 皮 | BGM 场景行 | 涉及原作曲 | SE 条数 | 必需 BGM | 必需 SE |
|---|---|---|---|---|---|
| 红 p5r-red | 48 | 66 | 112 | 20 | 47 |
| 蓝 p3-blue | 49 | 49 | 110 | 20 | 45 |
| 粉 p3r-pink | 44 | 46（+P3P 3） | 110 | 20 | 45 |
| 黄 p4-yellow | 44 | 47 | 109 | 20 | 45 |
