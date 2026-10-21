# 幽影协议 · 玩法 ↔ 演出一一对应表 v1（主策划，2026-10-22）

用法：每条玩法 = 一个规则事件 → 一个 recipe id → 四皮各自的样子。规则只发事件，皮肤只管怎么演（契约 v1.2 §3）。
「状态」：✅契约已有 / 🆕 v1.3 要新增 / 🔁 已有事件内的分支（看 payload 选 recipe）。
时长上限见契约 §3；P3 系 = 蓝 p3-blue 与粉 p3r-pink（同结构，粉换女主与配色）。

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
| 必杀 HIGHLIGHT / SHOWTIME | highlight（short?） | 角色专属；两人组合= SHOWTIME（参考 docs/umbra-ref/videos/p5r-showtime） | Theurgy 专属演出 | 必杀（P4R 未公开，推演） | ✅ |
| 全员倒地 → HOLD UP | holdup | 包围剪影+三选项 | 包围+选项 | 包围+选项 | ✅ |
| 总攻 | allout → allout.default + finishCard 按发起者 | 红底黑剪影斩击 → **发起者定格画+台词**（Panther OMG!/Queen JUSTICE HAS PREVAILED. 等） | 棋盘格地面 pose → **色块定格+台词+MASS DESTRUCTION** | 尘云+黄底漫画格定格 | ✅ |
| 交涉开始/结果 | talk:start / talk:result | 剪报对话框 | 同风格 | 同 | ✅ |
| 战斗结算 | battle:end | RESULT 红黑斜卡计数 | 蓝色结算 | 黄色结算 | ✅ |
| 升级 | 🆕 levelup（unitId, stats） | LEVEL UP 卡+五维加点闪 | 同风格 | 同 | 🆕 |

## C. 局内成长与局外
| 玩法 | 事件 → recipe | 演出 | 状态 |
|---|---|---|---|
| 战后三选一「心之卡」 | 🆕 card:pick（cards[]） | 三张卡飞入→翻面→选中放大 | 🆕 |
| 生活桥：今日增益卡 | 🆕 buff:grant（来源=App 待办/记录） | 开局时卡片从手机界面飞入 | 🆕 |
| BOSS 第二阶段 | 🆕 boss:phase（phase） | 黑屏+BOSS 立绘+BGM 切换 | 🆕 |
| 潜入结算评级 | battle:end（rank） 局末版 | 评级大字 S/A/B 盖章 | ✅ |
| 委托板、天鹅绒、合成、图鉴、设置 | ui:open/close（DOM，不进 Director） | 各皮斜切 clip-path ≤280ms | ✅ |
| 合成成功 | 🆕 fusion:result | 断头台/电椅（P5R）合成演出、新面具显形 | 🆕 |

## D. v1.3 契约要补的事件（8 个）
baton、persona:switch、shield:break、levelup、card:pick、buff:grant、boss:phase、fusion:result。另外引擎原语补 summon（读 $actorPersona）、eyeStrip、onomatopoeia、glassShatter、checkerFloor、ringSplash。时长建议：baton 0.6s、persona:switch 0.5s、shield:break 0.5s（重叠层）、levelup 1.0s、card:pick 0.6s、buff:grant 0.8s、boss:phase 2.0s（可跳过）、fusion:result 3.0s（可跳过）。
