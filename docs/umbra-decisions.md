# 幽影协议 UMBRA · 主策划决定记录

执行方遇到任务书没写到的取舍，以本文件为准。新在上。

## D-009 契约 v1.3 定稿（10-22 09:40）
- 定稿 `umbra-design/CONTRACT-v1.3.md`（母本）+ `TASK-APP-v1.3.md` + `TASK-THEMES-v1.3.md`；对照表升 `FX-MAP-v1.1.md`。草案 CONTRACT-v1.3-DRAFT 作废（保留备查）。
- 事件：新增 49 个事件名 = 第一批 8（FX-MAP §D）+ 第二批 15（含 bgm:cue；levelup 与第一批重复）+ 补漏 holdup:result + 探索 4（D-003，v1.2 漏列）+ 音频与零散 13 组 21 个名（AUDIO-MAP §5）。HOLD UP 正式为三选一（总攻/交涉/放过），v1.2「二选一」作废。
- 取舍：levelup 改为同一结算合并一个事件（unitIds[]，M3 实测逐人阻塞过长）；音频与零散事件分 D（进 Director）/ A（只走音频总线与 HUD，不进 Director）两类；重叠层成员扩为 unit:down > shield:break > ailment:*，仍只 1 个。
- 原语：M3 红色样板实际用到的 17 个转正（含 camera 伪 3D 镜头、holdupRing 包围）；HOLD UP 终点站位由引擎统一计算（前排两翼、后排在敌群身后、不进指令区），皮肤不能改站位。
- 音频：目录定为 skins/<id>/audio/{bgm,se,voice}/ + playlist.json / sfx.json / voice.json，present.json 由构建生成，缺文件静默不 404；私有仓库提交音频，公开构建排除（D-008 05:02 优先于 AUDIO-MAP §6.1 的 gitignore 建议）。
- labels：新增必填 label.baton / label.battleStart / label.finish / result.levelup / tag.* 7 个等；可选 showtime.title.<a>-<b>（按 roster.showtime 顺序，缺省「A × B」）。
- 不开：「指令区左下 + 队伍右下」第二套槽位、1 MORE 上限放宽，记入 v1.3 §10 风险。

## D-008 音乐与音效用原作（10-22 04:52）
- 用户确认：私人仓库、粉丝二创、不对外发布。BGM/音效/系统音/角色战斗语音按原作使用，放 skins/<id>/assets/official/audio/，不随任何公开构建发布。
- 每皮一张曲目表（场景 → 原作曲目）：据点、委托板、探索、普通战斗、先手战、被偷袭、精英、BOSS 一/二阶段、胜利、结算、天鹅绒、各商店、HOLD UP、总攻收尾。例：红=Last Surprise / Beneath the Mask / Rivers in the Desert / Life Will Change / Aria of the Soul；蓝粉=Mass Destruction / It's Going Down Now / Iwatodai Dorm / Full Moon Full Life；黄=Reach Out to the Truth / Time to Make History / Your Affection / I'll Face Myself。
- 工程：Opus/AAC 流式加载，不进皮肤首包；每曲标循环点（无缝循环）；响度统一 −16 LUFS；音效池按 recipe 事件触发（FX-MAP 每个事件可挂 sfx 字段）；战斗→胜利交叉淡化 ≤300ms；静音/音量三档（BGM/SE/语音）。
- 手机：首次交互后才解锁 AudioContext；切后台自动暂停。
- 切歌规则按原作（用户 04:51「就和原著一样」）：先按原作的情境规则选曲——先手/被偷袭换战斗曲（P3R 先手 It's Going Down Now）、发出预告信后换曲（P5R 据点 Beneath the Mask 雨天/白天版本、预告信后 Life Will Change）、BOSS 二阶段换曲、昼夜/天气换据点曲（P4 雨天）、P5R Take Over=我方先手战曲（可设置改回 Last Surprise）、P4G 普通战 Time To Make History/先手 Reach Out to the Truth。只有同一情境下有多首时才在池里随机。
- 音频目录（05:02 自定，取代上文 assets/official/audio）：skins/<id>/audio/{bgm,se,voice}/ + playlist.json + sfx.json；私有仓库音频照常提交。全量清单见 docs/umbra-design/AUDIO-MAP-v1.md。
- 曲目池（用户 04:51）：每个场景是一个曲目池而不是单曲，每皮每场景可挂多首，进场时随机抽（不连续重复同一首），可在设置里锁定某首或关闭某首。用户之后会补充自选曲目，加歌只需往 skins/<id>/audio/playlist.json 加一行（场景、文件、循环点）。
- 详细曲目表与音效清单写进 SYSTEMS-AUDIT-v1 必补第 16 项实现时补全。

## D-007 据点商店：规则共用四类，店名/店主/画面按皮（10-22 04:42）
- 四类店（规则 id 固定，数据表驱动）：
  1. 武器/防具店：主角与同伴的近战武器、枪、防具、饰品（装备是第六层成长，按委托档位解锁）。
  2. 道具店：回 HP/SP、复活、解异常、逃脱道具；局内只能带有限数量，逼规划。
  3. 医院/药房：高级回复药、战斗外治疗、限定增益药；羁绊升级解锁新药。
  4. 天鹅绒房间：合成/继承/图鉴购回（已有）。
- 货币仍只用 ¥ + 素材 + 心之力（D-006/§六），不新增货币。
- 各皮包装（店名、店主立绘、BGM、界面）：
  - 红 P5R：Untouchable 岩井（武器）、武见内科（医院）、药妆店（道具）、天鹅绒监狱。
  - 蓝/粉 P3/P3R：辰巳港岛警察署黑泽巡警（武器）、青髭药局（道具/药）、真心堂古董店（饰品/兑换）、天鹅绒电梯。
  - 黄 P4R：大太良金属工艺（武器）、Junes / 四六商店（道具与药，原作医院不卖东西）、天鹅绒豪华轿车。
- 每家店进店转场、店主立绘界面、离店转场按原作还原（四皮各一套），事件 shop:enter / shop:exit（见 SYSTEMS-AUDIT-v1 §5）。
- 原作某店不存在的类目，归到该皮最接近的店，不新造原作没有的地点。
- 店主台词可由 AI 按生活状态生成一句（规则同 §20），价格/库存由数据表定，AI 不碰。
- sim:balance（D-006）里机器人带标准装备和道具配额跑。

## D-006 成长系统 + 数值平衡用模拟器验收（10-22 04:40）
用户反馈：旧版「一个普攻打到底胜率 96%」，太无趣。改为下面的规则，并用自动模拟器把胜率钉死。

### 成长（五层，少而有感）
1. 角色等级：每场战斗给经验，出战 4 人全额，替补同伴 50%（P5R 式），不再只有面具吃经验。升级加 HP/SP/属性，升级时播 levelup 演出。
2. 人格面具：独立等级，升级学技能；天鹅绒合成+技能继承；主角可装多面具、战斗中换面具。
3. 羁绊（COOP）：每个同伴有 1–10 级，靠在 App 里完成真实待办/连续打卡 + 局内交涉事件提升；解锁原作式能力：追击、替主角挡刀、BATON 加成、HOLD UP 交涉加成、濒死时坚持 1HP 等。
4. 五维：来自 App 生活数据（已有，§六），带上限防碾压。
5. 心之卡：每局三选一构筑，局后清空，保证每局玩法不同。
- 防数值碾压：委托有推荐等级，敌人随委托档位成长；超等级碾压时经验递减。

### 平衡目标（每种打法×每档敌人 ≥2000 局蒙特卡洛，同等级队伍）
| 打法机器人 | 杂兵 | 精英 | BOSS |
|---|---|---|---|
| A 只按普攻 | ≤40% | ≤10% | ≈0% |
| B 会打弱点 | 85–90% | 60–70% | 40–50% |
| C 弱点+1MORE+BATON+防御读意图+换面具 | ≥95% | 85–90% | 75–85% |

### 让普攻打不穿的机制
- 普攻伤害约为弱点技能的 1/3，不触发倒地（除暴击）。
- 约 30% 敌人耐/无效/反射物理；反射会伤自己。
- 敌人头顶意图预告（蓄力大招），不防御或不换面具会被打崩。
- 精英/BOSS 有阶段，换阶段换弱点；会放异常状态。
- SP 有限：靠 HOLD UP 勒索、交涉、宝箱回复，逼玩家规划。

### 验收
- 新增 npm run sim:balance：输出三种打法×三档胜率表到 docs/umbra-progress/balance.md；任何一格不达标即失败（接入 CI）。
- 数值全部放数据表（不写死在代码），改数值后必须重跑模拟器。
- 敌人数量按 D-004 覆盖 1/3/5 只。

## D-005 同伴与人格面具按主题归属（10-22 04:37）
- 同伴名单由皮肤提供（skin.roster），只能用本作角色：红=P5R 怪盗团，蓝/粉=P3/P3R 特别课外活动部，黄=P4R 调查队。不跨作配队。
- 同伴专属面具（如 Arsène、Orpheus、Izanagi、各同伴初始/觉醒面具）只在本皮出现。
- 主角可换的公共面具（Pixie、Jack Frost 等系列共有恶魔）规则数据共用一份图鉴，但立绘/图标由各皮用本作官方素材；某作没有的面具，该皮图鉴里不出现。
- 存档按皮分开记录队伍；切皮不丢进度（五维/等级共用，队伍与面具收集按皮）。
- 跨作客串留作以后的限时「天鹅绒联动」活动，v1 不做。
- 实现：编队、战斗、合成都从 skin.roster / skin.compendiumArt 读取，禁止写死角色 id。

## D-004 敌人数量不写死（10-22 04:20）
- 旧版写死：public/umbra-demo/p5-battle-bridge.js 只生成主敌+副敌（BOSS 单只）；src/umbra/engine/p5-combat-rules.ts createDefaultBattle 默认两只。
- 新规：遭遇由 rules/encounter 遭遇表生成，1–5 只（杂兵 1–4、精英 1 精英+0–2 随从、BOSS 1+0–2 召唤物），按楼层/警戒度加权随机；P3/P4 原作常见 1–5 只。
- 战斗、HOLD UP、总攻、交涉、敌人意图全部遍历 enemies 数组，禁止用 a/b 固定 id 或下标 0/1。
- 皮肤：每皮提供 enemyLayouts[1..5] 站位（横屏 x/y/缩放/层级），5 只也不得与指令区/队伍卡重叠。
- 验收：测试覆盖 1、3、5 只敌人各一场完整流程。

## D-003 探索改 P5T 式 Q 版格子关卡（10-22 03:59，用户拍板）
- 潜入节点内是 Q 版格子小关卡：走位、掩体潜行、背后偷袭、巡逻视线、宝箱机关交涉点。
- 战斗不变：碰敌后切到真人立绘官方素材回合制战斗（M3 样板继续）。
- 必战：每张格子关卡出口被「守门阴影」封住，须击败或 HOLD UP 交涉才开门；主路线含 1 场精英必战+BOSS；潜行只决定先手/被偷袭，不能整局绕开。一局最少约 4 场战斗。
- 四皮同规则不同画面；新事件 explore:move/cover/spotted/interact，见 docs/umbra-design/FX-MAP-v1.md §F。
- App：规则层新增 rules/explore（格子、视线、掩体），与战斗规则分开；不影响已完成的战斗/图鉴/存档。

## D-002 图鉴分片：同步读取 + 异步预载（2026-10-22 03:20 CST）
问题：getPersona/getSkill 同步，而图鉴 2.2MB 要分片动态 import（异步）。
决定：采用「异步预载 + 同步读取」，不改现有同步签名。
1. 保留 `getPersona(id)` / `getSkill(id)` 同步，供规则层与战斗热路径用。
2. 新增 `ensureCompendium(req: { personas?: string[]; skills?: string[] }): Promise<void>`：按 id 找所属分片，动态 import 并写入内存缓存；同一分片并发去重；已加载立即 resolve。
3. 启动只加载索引（id→分片映射 + 名称/阶级等列表字段）。
4. 调用时机：存档载入/潜入开始时预载当前队伍所有人格面具及其技能；`map:encounter` 时预载本场敌人与其技能（计入 `map:encounter + battle:start ≤1.2s` 组合预算）；合成/图鉴页面打开时按页预载。
5. 未预载就同步读取：开发环境抛错（带 id 与调用栈），生产环境记日志并返回 undefined，调用方必须处理。
6. 测试：加「未预载读取抛错」「并发预载只 import 一次」「预载后同步可读」三项。
7. 分片方式：按人格面具阿尔卡纳/技能属性分文件，单片 gzip ≤120KB；不复制、不手改原数据，用脚本生成分片。

## D-001（10-22 02:40）旧 umbra-demo 的重复 JS 怎么处理
- 问题：任务书 ①「删 public/umbra-demo 重复 JS」与「旧 umbra-demo 入口保持可用到 M5」冲突（App 提出）。
- 决定：**本阶段不删**。`public/umbra-demo/` 整个目录冻结为旧版只读：不改、不修 bug、不跟新规则同步。新引擎、新入口、测试一律只引用 `src/umbra/engine` 的 TS，任何新代码不得引用 `public/umbra-demo` 下的 JS。
- 单一规则源的验收口径改为：新代码路径里只有一份 TS 规则。旧 JS 视为旧版产物，不算第二份。
- 删除时机：M5 下线旧入口时，与 `public/umbra-demo` 一起整体删除。
- App 现在要做：在 `public/umbra-demo/` 放一个 `FROZEN.md` 写明上述规则；继续收口剩余 `@ts-nocheck` 模块。
