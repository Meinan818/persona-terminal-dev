# 幽影协议 · 玩法 ↔ 演出一一对应表 v1.1（主策划，2026-10-22）

用法：每条玩法 = 一个规则事件 → 一个 recipe id → 四皮各自的样子。规则只发事件，皮肤只管怎么演（契约 v1.2 §3）。
「状态」：✅契约已有 / 🆕 v1.3 要新增 / 🔁 已有事件内的分支（看 payload 选 recipe）。
时长上限见契约 §3；P3 系 = 蓝 p3-blue 与粉 p3r-pink（同结构，粉换女主与配色）。
v1.1（10-22 09:30，随契约 v1.3 定稿）：并入 AUDIO-MAP-v1 §5 的 13 组音频事件（§I）、补 holdup:result（§B）、cueId 名单扩充（§G4）、音频目录改为 skins/<id>/audio/（§H，D-008 05:02）；表中「🆕」凡已写入契约 v1.3 §3 的，以契约为准。
更新 10-22 04:55：并入 SYSTEMS-AUDIT-v1 §5 的 11 条事件 + D-006/D-007/D-008 涉及事件（见 §G、§H），每个事件可挂 sfx 字段，BGM 用 bgm:cue 切换。

## A. 进入与地图（潜入 8–12 分钟主循环）
| 玩法 | 事件 → recipe | P5R 红 | P3 系 蓝/粉 | P4 黄 | 状态 |
|---|---|---|---|---|---|
| 进入异界/场景 | scene:enter → scene.enter.<场景> | 红黑剪影擦除+手机异界导航 App 启动 | 影时间：绿月、血色水面、棺材剪影 | 电视雪花→掉进电视 | ✅ |
| 离开 | scene:leave | 反向擦除 | 影时间褪色 | 电视关机收线 | ✅ |
| 节点间移动 | map:move | Q 版沿红色路线冲刺，镜头跟随 | 塔层楼梯/走廊 | 电视世界迷雾走廊 | ✅ |
| 遇敌（普通/偷袭先手/被偷袭） | map:encounter（nodeType, ambush）→ encounter.normal / .ambush / .ambushed | 扯敌人面具（先手）/红色警告（被袭） | 影子缠绕→玻璃碎（先手蓝、被袭红） | 黄雾凝聚，阴影扑来 | ✅（合流 ≤1.2s） |
| 开战转场 | battle:start → transition.battleStart | 红/黑/米三片斜切+十角星 | 蓝色玻璃碎裂+月光 | 方块推屏+电视雪花 | ✅ |
| 安全屋 回复存档 | scene:enter(safe) | 安全屋门牌+队伍头像回血 | 自习室/天鹅绒门 | 朱奈斯电视屋 | ✅ |
| 机关小谜题 | ui:open(puzzle) | DOM 卡片翻转 | 同 | 同 | ✅（不进 Director） |
| 每日/日期变化、天气、影时间 | env:change → env.date.flip / env.darkHour | 日历撕页（P5 日期） | 绿月浮现、钟停在 0 点 | 日期翻页+天气字 | ✅ |

## B. 战斗核心
| 玩法 | 事件 → recipe | P5R 红 | P3 系 | P4 黄 | 状态 |
|---|---|---|---|---|---|
| 轮到某人 | turn:start | 指令轮弹出、角色卡放大 | 指令菜单斜切 | 黄旋钮转出 | ✅ |
| 普攻 | action（kind=attack）→ action.attack | 前冲斩击+残影 | 同（武器各异） | 同 | ✅ |
| 枪击 | action（kind=gun）→ action.gun | 举枪连射弹道 | 无枪→并入普攻 | 无枪→并入普攻 | ✅ |
| **用面具技能（召唤）** | action（kind=skill）→ skill.<技能id>，前段固定召唤 | **扯面具→蓝焰→面具显形→施法** | **召唤器抵头→扣扳机前一帧玻璃碎裂→面具显形** | **塔罗牌浮现→捏碎/挥击→面具显形** | 🔁（v1.3 引擎原语 summon，$actorPersona 引用） |
| 打中弱点 | action（hit.weak）→ 命中段分支 | WEAK 红字+停帧 | **眼部横条 cut-in+「咔」** | **WEAK! 星星字** | 🔁 |
| 暴击 | action（hit.crit） | CRITICAL+cut-in 眼部条 | 眼部横条 cut-in+「咔」 | CRITICAL! 星星字 | 🔁 |
| 被抵抗/吸收/反射 | action（hit.resist/drain/repel） | RESIST/DRAIN/REPEL 字 | 同风格字 | 同 | 🔁 |
| 敌人倒地 | unit:down（重叠层） | 敌人翻倒+星星 | 敌人倒地碎影 | 倒地+星 | ✅ |
| 我方/敌方阵亡 | unit:down（side） | 碎裂消散 | 同 | 同 | ✅ |
| 1 MORE | onemore | 巨型 1 MORE 横幅+画面去色 | 1 MORE 蓝白字 | 1 MORE 黄底黑字 | ✅ |
| 接力（BATON PASS / 1 MORE 追击给队友） | 🆕 baton（from,to） | 击掌交接+加成光圈 | 击掌（P3R 有） | 击掌（P4R 预期） | 🆕 |
| 切换面具（主角） | 🆕 persona:switch | 面具卡旋转换上 | 塔罗牌换牌 | 塔罗牌换牌 | 🆕 |
| 护盾击破（精英/BOSS） | 🆕 shield:break（层数） | 锁链碎裂 | 玻璃盾碎 | 电视屏裂 | 🆕 |
| 敌人意图预告 | HUD 常驻（不进 Director） | 敌人头顶图标 | 同 | 同 | ✅ |
| 敌方行动 | action（敌方，≤1.5s） | 敌人前冲+队伍卡抖动 | 同 | 同 | ✅ |
| 单人必杀 HIGHLIGHT | highlight（kind=solo, actorId） | 角色专属 HIGHLIGHT 动画 | Theurgy 专属演出 | 必杀（P4R 未公开，推演） | ✅ |
| **双人连携必杀** | highlight（kind=duo, pairId）→ duo.<pairId> | **SHOWTIME**：漫画分镜开场+两人合作大招+定格（参考 docs/umbra-ref/videos/p5r-showtime）| 合体魔法：两只面具重叠显形+合击 | 连携追击：两人漫画格合击 | 🔁（玩法统一：特定两人同队、连携槽满后随机提示，可跳过） |
| 全员倒地 → HOLD UP | holdup | 包围剪影+三选项 | 包围+选项 | 包围+选项 | ✅ |
| HOLD UP 选择结果（总攻/交涉/放过） | 🆕 holdup:result（choice, enemyIds）→ holdup.result.<choice> | 总攻：包围收紧一拍；交涉：持枪逼近；放过：敌群散去（接 unit:flee 演出） | 同 | 同 | 🆕（v1.3，0.4s/0.15s） |
| 总攻 | allout → allout.default + finishCard 按发起者 | 红底黑剪影斩击 → **发起者定格画+台词**（Panther OMG!/Queen JUSTICE HAS PREVAILED. 等） | 棋盘格地面 pose → **色块定格+台词+MASS DESTRUCTION** | 尘云+黄底漫画格定格 | ✅ |
| 交涉开始/结果 | talk:start / talk:result | 剪报对话框 | 同风格 | 同 | ✅ |
| 战斗结算 | battle:end | RESULT 红黑斜卡计数 | 蓝色结算 | 黄色结算 | ✅ |
| 升级（D-006：出战 4 人全额经验，替补 50%） | 🆕 levelup（unitId, statsDelta） | LEVEL UP 卡+五维加点闪 | 同风格 | 同 | 🆕 |

## C. 局内成长与局外
| 玩法 | 事件 → recipe | 演出 | 状态 |
|---|---|---|---|
| 战后三选一「心之卡」 | 🆕 card:pick（cards[]） | 三张卡飞入→翻面→选中放大 | 🆕 |
| 生活桥：今日增益卡 | 🆕 buff:grant（来源=App 待办/记录） | 开局时卡片从手机界面飞入 | 🆕 |
| BOSS 第二阶段 | 🆕 boss:phase（phase） | 黑屏+BOSS 立绘+BGM 切换 | 🆕 |
| 潜入结算评级 | battle:end（rank） 局末版 | 评级大字 S/A/B 盖章 | ✅ |
| 委托板、天鹅绒、合成、图鉴、设置 | ui:open/close（DOM，不进 Director） | 各皮斜切 clip-path ≤280ms | ✅ |
| 合成成功 | 🆕 fusion:result | 断头台/电椅（P5R）合成演出、新面具显形 | 🆕 |

## D. v1.3 契约要补的事件（第一批 8 个；第二批见 §G）
baton、persona:switch、shield:break、levelup、card:pick、buff:grant、boss:phase、fusion:result。另外引擎原语补 summon（读 $actorPersona）、eyeStrip、onomatopoeia、glassShatter、checkerFloor、ringSplash。时长建议：baton 0.6s、persona:switch 0.5s、shield:break 0.5s（重叠层）、levelup 1.0s、card:pick 0.6s、buff:grant 0.8s、boss:phase 2.0s（可跳过）、fusion:result 3.0s（可跳过）。

## E. 地图：规则一样，长相不一样
节点类型、数量、岔路规则四皮完全相同（同一张种子地图）。每皮换：背景插画、路线样式、节点图标、小人移动动作、遇敌转场。
| | P5R 红 | P3 蓝/粉 | P4 黄 |
|---|---|---|---|
| 场景 | 殿堂（城堡长廊/金库） | 塔耳塔洛斯塔层（蓝/粉月光地板） | 电视世界（黄雾、迷宫街） |
| 路线 | 红色发光虚线+红色箭头 | 绿/蓝光走廊+楼梯 | 黄色雾中路标 |
| 小人移动 | 怪盗翻越、贴墙掩护 | 持武器小跑 | 戴眼镜小跑 |
| 节点图标 | 剪报风格图标 | 塔罗/月相图标 | 电视机图标 |

## F. 探索（D-003：P5T 式 Q 版格子，战斗仍是真人立绘）
| 玩法 | 事件 | P5R 红 | P3 蓝/粉 | P4 黄 | 状态 |
|---|---|---|---|---|---|
| 走格子 | explore:move | Q 版怪盗小跑、红色落点格 | Q 版持武器小跑、绿光格 | Q 版小跑、黄雾格 | 🆕 待实现 |
| 贴掩体 | explore:cover | 贴墙翻身+掩体图标 | 蹲伏 | 蹲伏 | 🆕 待实现 |
| 被发现 | explore:spotted | 「！」红闪+警戒度跳 | 影子转头蓝闪 | 电视雪花闪 | 🆕 待实现 |
| 背后接近 | map:encounter(ambush) | 扯面具先手 | 击打影子先手 | 先手 | ✅ 事件已有 |
| 开宝箱/机关/交涉点 | explore:interact | 剪报弹出 | 塔罗弹出 | 电视弹出 | 🆕 待实现 |

## G. v1.3 第二批事件（SYSTEMS-AUDIT-v1 §5 + D-006/D-007/D-008）
列：玩法 → 事件(payload) → recipe 名 → 时长上限 → 四皮演出差异 → sfx/bgm。全部 🆕（v1.3 提案），皮肤未实现走引擎默认演出（红色样板通用版）。

### G1. 据点、商店、天鹅绒、日程
| 玩法 | 事件(payload) | recipe | 时长上限 | P5R 红 | P3 系 蓝/粉 | P4 黄 | sfx / bgm | 来源 |
|---|---|---|---|---|---|---|---|---|
| 进店 | shop:enter（shopId, skinShopId, firstVisitToday） | shop.enter.<skinShopId>.full / .short | 完整 1.2s / 简短 0.5s | 红黑斜切擦除+店招剪影落定（Untouchable/武见内科/药妆店/天鹅绒监狱铁栏锁链） | 蓝色水面/玻璃横扫+店牌（黑泽巡警/青髭药局/眞宵堂/天鹅绒电梯上升） | 电视雪花/方块推屏+黄底店名卡（大太良/四六商店/天鹅绒轿车雾中车厢） | sfx：se.shop.door + voice.<店主>.hello；bgm：bgm:cue shop.<skinShopId> | §5 / D-007 |
| 离店 | shop:exit（shopId, purchased） | shop.exit.<skinShopId> | 0.6s | 反向擦除+店主离店台词 | 反向横扫 | 反向推屏 | sfx：se.shop.exit + voice.<店主>.bye（purchased 分两句）；bgm：bgm:cue hub | §5 / D-007 |
| 合成警报 | velvet:alarm（—） | velvet.alarm | 0.8s | 监狱门闪红+锁链抖 | 电梯门闪红 | 轿车门闪红 | sfx：se.velvet.alarm；bgm 不切 | §5 / §4.4 |
| 合成事故 | fusion:accident（resultId） | fusion.accident（插在 fusion:result 前） | 1.0s | 断头台/电椅失控火花 | 电梯灯闪、塔罗乱洗 | 轿车颠簸、雾涌 | sfx：se.fusion.accident | §5 / §4.4 |
| 发出预告信 | callingcard:send（targetId） | callingcard.send | 3.0s 可跳过 | 红黑预告信飞出钉墙 | 满月告示 | 午夜频道雪花画面 | sfx：se.callingcard；bgm：下一局潜入 bgm:cue explore.callingcard | §5 / §4.9 |
| 羁绊升级 | bond:rankup（unitId, rank, unlocked[]） | bond.rankup | 1.5s 可跳过 | RANK UP 阿尔卡纳卡翻转 | 塔罗牌浮现+升级字 | 塔罗牌+RANK UP | sfx：se.bond.rankup | D-006 第 3 层（推导） |
| 成就 | achievement:unlock（id） | —（DOM 角标，不进 Director） | — | 红黑角标 | 蓝色角标 | 黄底角标 | sfx：se.achievement | §5 / §4.12 |

### G2. 战斗追加
| 玩法 | 事件(payload) | recipe | 时长上限 | P5R 红 | P3 系 蓝/粉 | P4 黄 | sfx / bgm | 来源 |
|---|---|---|---|---|---|---|---|---|
| 换人 SWITCH | party:switch（outId, inId） | party.switch | 0.5s | 剪影交换 | 召唤器举起交接 | 塔罗换卡 | sfx：se.party.switch + voice.<inId>.switchIn | §5 / §4.7 |
| 羁绊协助（追击/挡刀/硬撑/治异常/扶起） | bond:assist（kind, unitId） | bond.assist.<kind> | 0.8s | 漫画格 | 塔罗闪 | 黄底漫画格 | sfx：voice.<unitId>.assist.<kind> + se.bond.assist | §5 / §4.6 / D-006 |
| 异常附加 | ailment:apply（unitId, status） | ailment.apply.<status> | 0.4s（重叠层） | 头顶图标+红黑短特效 | 头顶图标+蓝色短特效 | 头顶图标+黄色短特效 | sfx：se.ailment.<status> | §5 |
| 异常解除 | ailment:cure（unitId, status） | ailment.cure | 0.4s（重叠层） | 图标碎掉 | 图标淡出 | 图标弹走 | sfx：se.ailment.cure | §5 |
| 逃跑 | escape（result） | escape.success / escape.fail | 0.6s | 烟雾闪退 / 被拦回 | 跑出画面 / 被拦回 | 跑出画面 / 被拦回 | sfx：se.escape.<result>；成功后 bgm:cue 回探索曲 | §5 / §4.8 |
| 面具升级学技能 | persona:levelup（personaId, newLevel, learned[]） | persona.levelup | 0.8s | 面具卡亮+新技能字 | 同风格（蓝） | 同风格（黄） | sfx：se.persona.levelup | D-006 第 2 层（推导） |
| 角色升级 | levelup（unitId, statsDelta） | levelup | 1.0s | 见 §B | 见 §B | 见 §B | sfx：se.levelup + voice.<unitId>.levelup | D-006（§B 已列） |

### G3. 探索追加
| 玩法 | 事件(payload) | recipe | 时长上限 | P5R 红 | P3 系 蓝/粉 | P4 黄 | sfx / bgm | 来源 |
|---|---|---|---|---|---|---|---|---|
| 第三只眼 / 探知 / 侦测 | explore:scan（—） | explore.scan | 起效 0.4s，显示 ≤2s（显示段不阻塞） | 画面去色+敌人红光、视线锥 | 风花「探知」绿色扫描波 | 久慈川「侦测」黄色雷达波纹 | sfx：se.explore.scan + voice.navi.scan | §5 / §4.9 |

### G4. 音乐
| 玩法 | 事件(payload) | recipe | 时长上限 | 四皮差异 | sfx / bgm | 来源 |
|---|---|---|---|---|---|---|
| 切换 BGM | bgm:cue（cueId, crossfadeMs?, loop?；cueId=null 为停） | 无（音频总线，不占 Director 时钟） | 交叉淡化：战斗→胜利 ≤300ms，其余 ≤1000ms | cueId 共用，每皮曲目表映射到原作曲（D-008） | bgm 本身 | D-008 |
cueId 固定名单：hub、requests、explore、explore.callingcard、battle.normal、battle.ambush、battle.ambushed、battle.elite、boss.p1、boss.p2、victory、result、velvet、shop.<skinShopId>、holdup、allout.finish。
v1.1 追加 cueId（AUDIO-MAP §1/§5）：title、settings（hold，不切歌）、loading、hub.home、explore.safe、explore.risk、explore.escape、boss.intro、boss.defeat、highlight（可选）、gameover、velvet.challenge、compendium（=velvet 池）、fusion（=velvet 池）、bond。

## H. sfx / bgm 挂法（D-008）
- 每个事件、每个 recipe 可挂 `sfx` 字段：`[{ id, at(ms), bus: "se" | "voice" }]`，id 指向 skins/<id>/audio/sfx.json 里登记的 SE（文件在 skins/<id>/audio/se/；voice 总线查 voice.json，文件在 audio/voice/<unitId>/）；缺文件静默（v1.1 改，D-008 05:02）；Director 按 recipe 时间轴触发，停帧期间不推进。皮肤没写 → 用下表默认 sfx。
- 场景切换类事件可挂 `bgm` 字段（等价于同时发 bgm:cue）。
- 三档音量（BGM / SE / 语音）；首次交互后才解锁 AudioContext；切后台暂停。

| 已有事件 | 默认 sfx | bgm 动作 |
|---|---|---|
| scene:enter / scene:leave | se.scene.enter / se.scene.leave | bgm:cue explore / hub |
| map:encounter | se.encounter.<normal/ambush/ambushed> | bgm:cue battle.normal / battle.ambush / battle.ambushed（精英 battle.elite、BOSS boss.p1） |
| battle:start | se.transition.battle | — |
| turn:start | se.turn | — |
| action | se.hit.<属性>、se.crit、se.weak、se.miss；voice.<actorId>.skill | — |
| unit:down | se.down | — |
| onemore | se.onemore + voice.<actorId>.onemore | — |
| baton | se.baton + voice.<toId>.baton | — |
| persona:switch | se.persona.switch | — |
| shield:break | se.shield.break | — |
| highlight | voice.<actorId>.highlight | 可选 bgm 插曲 |
| holdup | se.holdup | bgm:cue holdup |
| allout | se.allout + voice.<发起者>.finish | bgm:cue allout.finish |
| talk:start / talk:result | se.talk / se.talk.<success/fail> | — |
| battle:end | se.result | bgm:cue victory（≤300ms）→ result |
| boss:phase | se.boss.phase | bgm:cue boss.p2 |
| card:pick / buff:grant | se.card.flip / se.buff | — |
| fusion:result | se.fusion | （在天鹅绒 bgm 内） |
| ui:open / ui:close | se.ui.open / se.ui.close | 天鹅绒 bgm:cue velvet |
| explore:move / cover / spotted / interact | se.step / se.cover / se.spotted / se.interact | — |

## I. v1.1 追加：音频与零散事件（AUDIO-MAP-v1 §5 的 13 组，契约 v1.3 §3d）
分三类：**D** = 进 Director 主线（阻塞、有时长上限、皮肤可写 recipe）；**O** = 重叠层（不阻塞主线）；**A** = 不进 Director，只调音频总线 + HUD/DOM 小提示（皮肤只能给 sfx id / labels / HUD 样式，不写 recipe）。

| # | 玩法 | 事件(payload) | 类 | 时长上限 完整/极简 | P5R 红 | P3 系 蓝/粉 | P4 黄 | sfx / bgm |
|---|---|---|---|---|---|---|---|---|
| 1 | 系统音 | ui:cursor / ui:confirm / ui:cancel / ui:page / ui:error（context） | A | — | — | — | — | se.ui.cursor / confirm / cancel / page / error |
| 2 | 获得物品 / 金钱 | item:get（itemId, count）/ money:get（amount） | A | HUD 角标 ≤1.2s | 剪报角标 | 蓝色角标 | 黄底角标 | se.item.get / se.money.get |
| 3 | 成交 | shop:buy（shopId, itemId） | A | — | 店主界面内 | 同 | 同 | se.shop.buy（+ 可选 voice.<店主>.thanks） |
| 4 | 学会技能 | skill:learn（unitId \| personaId, skillId） | A（接在 persona:levelup / levelup 演出里亮字） | — | 面具卡新技能字 | 同 | 同 | se.skill.learn |
| 5 | 敌人现形 / 逃散 | unit:spawn（enemyIds）/ unit:flee（enemyIds） | D | 0.6s/0.25s；0.6s/0.25s | 红黑面具浮现 / 化黑烟散去 | 影子从地面涌出 / 碎影 | 黄雾凝聚 / 雾散 | se.enemy.appear / se.enemy.vanish |
| 6 | 复活 / 濒死 | unit:revive（unitId）/ unit:lowhp（unitId） | D / A | 0.6s/0.25s；— | 卡片回色+光柱 / 卡片红闪 | 同风格 | 同风格 | voice.<unitId>.revived / voice.<unitId>.lowhp |
| 7 | 蓄力意图亮起 | intent:show（enemyId, intentId） | A | — | 头顶图标放大一拍 | 同 | 同 | se.intent |
| 8 | 导航首次揭示弱点 | navi:scan（enemyId, affinity） | A | — | 导航气泡+弱点图标翻开 | 风花气泡 | 久慈川气泡 | se.navi.scan + voice.navi.scan |
| 9 | 掩体间移动 | explore:sneak（from, to） | D | 0.35s/格，0.15s | 怪盗贴墙翻滚 | 蹲伏小跑 | 蹲伏小跑 | se.sneak |
| 10 | 警戒度变化 | alert:change（level） | A | — | 警戒表跳格+红闪 | 同风格 | 同风格 | se.alert.up；level=high → bgm 条件 alert=high |
| 11 | 出口开门 | explore:exit（gateId） | D | 0.8s/0.3s | 铁栅升起 | 塔门开启 | 电视门打开 | se.exit.open |
| 12 | BOSS 登场 | boss:intro（bossId） | D，可跳过 | 2.0s/0.6s | 殿堂主剪影+名字横幅 | 满月影子+名字 | 雾中现形+名字 | bgm:cue boss.intro |
| 13 | 全灭 / 主动撤退 | run:fail（reason）/ run:retreat（reason） | D | 1.5s/0.5s；1.0s/0.4s | 红黑碎屏 GAME OVER / 手机导航撤离 | 影时间吞没 / 撤离 | 电视关机 / 撤离 | bgm:cue gameover / explore.escape |

另：AUDIO-MAP §5 的 cueId 新增已并入 §G4。D 类事件皮肤未实现 → 引擎默认演出（红色样板通用版）；A 类只播音、HUD 用引擎默认样式 + 皮肤 tokens。
