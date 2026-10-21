# 幽影协议 UMBRA · 系统盘点（重新设计依据）

> 盘点对象：`/workspace/work/umbra-red/base/`（与正式仓库 `ptd/public/umbra-demo/` 逐文件同名，原生 JS）+ 宿主只读克隆 `/workspace/work/ptd`。
> 参考：`AUDIT.md`、`PLAN.md`、`FINAL-QA.md`、`B-DONE.md`、`REARCH-PROPOSAL-v2.md`、`ptd/docs/策划书-P5R逆影战场重做.md`、`ptd/PROJECT_STATE.md`。
> 方法：只读代码；另把纯规则文件**复制**到项目草稿目录，用 Node 跑了一组种子化战斗模拟（脚本 `/workspace/projects/9c2dd2cf-e4ad-4f26-ac20-01b384ebf00e/work/umbra-sim/sim.mjs`，没有改动任何原文件）。没有开浏览器。
> 记号：**【实测】**＝代码里逐行核对过，或者模拟跑出来的结果；**【推断】**＝根据代码估算的，还没在真机上验证。日期 2026-10-21。

---

## 0. 一页结论

1. **规则内核扎实，外层太厚。** P5 的核心循环已经由纯逻辑类 `P5Battle`（`p5-combat-rules.js`）完整实现：弱点 → 1 MORE → 接力 → HOLD UP → 总攻或交涉。数据直接用 P5R 图鉴：约 2.2 MB 的 Persona、技能、阿卡纳合成表和特殊合成。这部分可以整块搬走。
2. **但它太好打了。** 【实测】200 场种子化模拟里，**从 1F 打到 38F 全程只按普攻，胜率 96%–100%**。打不打弱点只影响按键数（大约 2 倍），不影响胜负。弱点、交涉、准备（商店、合成、装备）因此都没有被逼出来。
3. **一些标着“成长”的数值根本没进伤害公式。** 【实测】Persona 的力、魔五维在我方伤害里恒按 5 计算（`actor.strength` 对队员对象未定义）；禁闭强化“攻击”对我方伤害无效；月光回响或积水给的“伤害 +5%/+6%”只写进 `j.buffs` 文本，任何战斗都不读。
4. **一局极长、极重复。** 一次登塔是 40 层，其中 38 层是同一个 5×5 模板，每层房间构成完全相同（1 守卫、1 钥匙、1 机关、1 异响、2 月匣、2 影子）。【推断】通关一次约 1.5–2.5 小时，而塔门只在**周五到周日 20:00–07:00** 开放。
5. **和宿主 App 的“现实成长”几乎没连上。** 父子桥只同步了钱（¥）、面具名录、装备和道具。主 App 靠生活记录攒的 **SP 没有传进游戏**，影时间窗口也没传。游戏里的“知识/勇气…”属性是按影子名字哈希出来的，不是用户自己的属性值。
6. **拆分可行，集中在 5 个文件。** `app.js`、`tower-flow.js`、`encounters.js`、`preparation.js`、`night-slice-flow.js` 把状态机、奖励结算、HTML 模板和事件处理搅在一起。其余约 30 个规则文件可以直接复用。【推断】只做规则层和渲染层分离（不含新画面），约 **13–18 人日**。

---

## 1. 宿主 App 是什么、幽影协议在里面的位置

**宿主 MASKARIA · 面具庭园**（React 18 + TS + Vite + Capacitor 安卓，后端 Spring Boot + MySQL，现版本 Android 3.0.1）是一个“把日子过成存档”的个人成长记录 App：用户记录读书、熬夜、记账、任务等，换来五维属性（知识、胆量/勇气、灵巧、温柔/体贴、魅力）和 SP，真实成长被包装成一张 Persona 面具。它有四套主题皮肤：蓝（P3）、粉（P3P 女主线）、黄（P4）、红（P5R），另有自定义。

**幽影协议 UMBRA** 是它的战斗模块。按 `ptd/docs/策划书-P5R逆影战场重做.md`，它要整体取代旧的“逆影战场”。同一套玩法和存档按主题显示不同的名字：蓝/粉叫 TARTARUS，红叫 Mementos（印象空间），黄叫 Mayonaka TV，自定义叫 UMBRA（`module-identity.js`）。它的角色是**把用户攒下的资源花在一个 Persona 爬塔 RPG 里**。目前实际进度：U2（战斗、爬塔、Persona、装备、商店、天鹅绒接管）进行中；U3（好友、COOP、团战、借面具重接）和 U4（云同步、旧入口退役）还没做。

**入口**：主 App 的战斗页 `BattleArena.tsx` 调 `resolveUmbraEntry(location.search)`（`src/umbra/entry.ts`）。默认值 `'demo'` 渲染 `UmbraDemoFrame.tsx`：用 portal 挂一个全屏 iframe，`src=/umbra-demo/index.html?theme=<p3|hamuko|p4|p5>&slice-ai=live`。主题映射 red→p5、pink→hamuko、yellow→p4、其余→p3。另有两个开关：`?legacy=1` / `?umbra=0` 回到旧战场，`?umbra=runtime` 打开 TS 引擎检查页 `UmbraRuntimeCheck`。退出用左上角“主页”键或 Esc。

**父子桥：两条通道**

| 通道 | 机制 | 传什么 |
|---|---|---|
| 存档桥 `src/umbra/demoBridge.ts` | 同源 iframe **共享 localStorage**。父页面加载前写种子，iframe 写回后靠 `storage` 事件合并进 IndexedDB 的 `umbraProfile` / `umbraRun`，再云同步 | 3 个键：① `maskaria.p5r.rebuild.v1`（永久档）。父→子种子 `demoProfileSeed` 包含 activePersonaId、allyPersonaIds、personaRoster、battleItems、**money（¥）**、materials、equipment、ownedEquipment、equipmentLevels、borrowedMask（含 **weekKey**，按周借面具）。子→父 `mergeDemoP5rState` 取回这些字段，并把整份快照存进 `profile.demo.p5r`。② `maskaria.p5r.run.v1`（当前登塔进度，整包存进 `umbraRun.payload.demoRun`）。③ `maskaria.p5r.slice.v1`（AI LAB 夜层） |
| AI 桥 `src/utils/umbraDemoAiBridge.ts` | `postMessage`，`source:'maskaria-umbra-ai'`，校验 origin，可取消 | 3 种请求：`judge-shadow-talk`（自由交涉判定）、`advise-battle`（战术顾问）、`plan-night-floor`（夜层生成）。密钥留在父页面（BYOK），iframe 只发公开快照 |

**没过桥的东西（重新设计要补）**
- **生活 SP 不进游戏。** `profile.economy.sp`（真实生活攒的 SP，COOP、团战、借面具要消耗）不在种子里。游戏里的“SP”只是战斗蓝条。【实测】
- **影时间窗口不进游戏。** iframe 用的是自己存档里的 `shadowTime`，默认 `[5,6,0] 20:00–07:00`，判定在 `shadow-time.js`。旧战场设置 `battleShadowTimeStart/End` 不会传进来。时区按设备本地时钟。【实测】
- **“星期”只出现在两处**：影时间的星期几，和借面具的 `weekKey`（按周一算）。主 App 的周深化 `deepenStratumIfNewWeek` 只服务旧战场。
- 宿主的 `src/umbra/engine/*.ts` 已经把一部分规则**机械迁成 TS**（`@ts-nocheck`）：economy、equipment、floor-map、inventory、loot、p5-combat-rules、adapter、compendium、tower-layout。这样同一套规则有 JS、TS 两份，**已经有漂移风险**。

---

## 2. 现有玩法全景

### 2.1 一局完整流程（主线“格子高塔”）

```
iframe 载入 → 首页“印象空间”(#battle) ── 也可以进 Persona(#persona) / 武库(#arsenal)
   │ 首次：觉醒契约（4 道题 + 一段自述 → AI/离线从名录里挑一张面具；preparation.js）
   ▼
#tower 影时间据点 prepPage ── 塔门：canEnterTower = 已觉醒 且 影时间（周五到周日 20–07，?shadow=1 可强开）
   │ 据点服务：商店 / 装备 / 背包 / 天鹅绒 9 项服务 / 今夜请求 / NPC 信任；AI LAB 入口
   │ 有存档时：“继续 xF”或“重新开始”
   ▼ enter-tower → model.beginFloor(1)
塔内 5×5 房间地图（迷雾、月光步数、警戒）
   │ 移动到相邻格（2026-10-21 已改成只能点相邻格）：守卫/影子格 → 遭遇
   │   影子房：先“开口”（自由文字交涉，shadowTalkPage）或“拔刀”
   │   守卫房：直接战斗（过守卫或用钥匙才开出口）
   │ 其他房：月匣（检查/打开）、钥匙、机关（拆/硬闯）、异响（回血/增益）、安全屋（每 10 层一次）
   ▼ 战斗（app.js combat）— P5Battle：我方 4 人（主角 + 3 名同伴，玩家逐个下令）对 2 敌（Boss 战 1 敌）
   │   技能/普攻/手枪/防御/洞察/道具/换面具/接力/SHOWTIME → 打出弱点或暴击就倒地、获得 1 MORE
   │   全员倒地 → HOLD UP：总攻 / 交涉（4 选 1 → 收服或领奖）/ 放过
   ▼ 胜利结算 tower-flow.battleReturn：掉落、¥、SP、当前面具 XP、请求进度 → 回地图
出口 → 下一层 … 39F 预告信（点一下）→ 40F Boss（两形态，同一舞台变身）
   ▼ 通关 → 回城页 return（可去天鹅绒）→ 回顾 recap → 首页；也可选择无尽模式（周目 +1，起始警戒 20+10×周目）
失败：在地图里战败 → clearRun，本次登塔进度清零，但已拿到的钱和物品保留；撤退 descend 同样 clearRun
```

还有一条**平行支线 AI LAB**（`night-slice*.js`）：白天写一条记录 → AI 或离线生成一晚 3–5 间房 → 每间可以绕行、硬刚（只做数值判定，不进入战斗舞台）或自由交涉 → 回到白天。夜色共 6 点。

### 2.2 各系统规则要点（全部【实测】自代码）

**战斗公式**（`P5Battle.hitEnemy`，`p5-combat-rules.js:532`）
- 伤害 = `power × (1+skillBonus) × skillPower[技能] × 攻击系数 × 防御系数 × mult`，最少 1。
  - 攻击系数 = `1 + max(0, stat−5)×0.03`。stat 取 `actor.strength` 或 `actor.magic` 再加 `attackBonus`。**主角和同伴对象都没有 strength/magic 字段，恒按 5 计算**，所以实际只有武器的 `attackBonus` 生效（每点 +3%）。
  - 防御系数 = `1 − min(0.45, 敌防×0.02)`。
  - mult：弱点 1.25（加连锁 weakBonus）、抗性 0.5、TECHNICAL ×1.5、暴击 ×1.5、接力 ×(1+0.25×层数，最多 3 层)、蓄力类 attackUp（2.5 或 1.3）、敌人防御下降 ×1.25。无效/吸收/反弹另算。
- 技能威力不按 Persona 等级计算，而是按 P5R 技能描述分档（`p5r-battle-adapter.js parsedPower`）：light 24 / medium 36 / heavy 52 / severe 72，打全体 ×0.78。治疗 30/55/85/120。SP 消耗取原作值，原作 ≥100 的按 /100 折算。
- 普攻威力 18，手枪 26（暴击率 20%，弹药 3 发），默认暴击率 8%。“洞察”花 2 SP 揭示一项抗性。
- Persona 数值：maxHp = 48+4×等级，maxSp = 32+2×等级，attack = 8+2×力（**我方伤害不用**），defense = 5+耐（**用于减免敌方伤害**）。
- 敌方伤害 = `敌攻 × 技能系数(0.75–1.3) × 随机(0.9–1.1) × 暴怒 1.4 − (Persona 防御 + 装备防御)×0.5`，防御时减半，再按我方当前面具的抗性结算。敌人的目标随机。
- 敌人数值（`tower-journey.encounterFor` 加 `p5-battle-bridge.primary/secondaryEnemySpec`）：HP = 42+21×区段+3×段内层数；守卫 ×1.3，区段 Boss 守卫 ×1.5，第二只敌人 ×0.55。弱点按 `(层数−4) mod 8` 在 8 种属性里**轮换，每只敌人只有一个弱点**，抗性最多一个。难度档 easy/normal/hard 调敌人 HP 和攻击（0.8 / 1 / 1.2）。
- 敌人意图：每回合按 `(回合+序号) mod 技能数` 轮选技能，提前显示属性和招式名，这是 P3R/暗喻式的预告。

**弱点与 ONE MORE**：打中弱点或暴击 → 目标倒地（null/吸收/反弹除外）；**每名角色每回合只能拿一次** 1 MORE（`oneMoreUsed`）。倒地的敌人跳过下次行动。状态异常和指定属性配合触发 TECHNICAL（例如燃烧遇风/核，冰冻遇物理/核）。
**接力 Baton Pass**：场上有倒地敌人时可以把回合交给同伴，伤害 +25/50/75%（最多 3 层），每次出手后清零。
**SHOWTIME**：主角从第 2 回合起、每战一次，对全体造成 `72+10×回合` 伤害并把它们打倒，**几乎必定接 HOLD UP**。
**HOLD UP 与总攻**：所有活着的敌人都倒地时进入。总攻伤害固定 `30+10×存活我方人数`（4 人时 70），对全体生效，没打死就继续战斗。**总攻 QTE（3.5 秒连点）只存在于演出索引 `?scene=qte` 和排练里，没有接进实战伤害**。P3 和哈姆子主题用 `p3-signature-fx.playAllOut` 演出，P4、P5 回落到通用 impact 动画。
**交涉**有 3 套各自独立的实现（这一点在 §5 详述）：
1. 战斗中 HOLD UP 交涉（`P5Battle.holdUp`）：成功率 = 50 + 性格修正 + 10 + 低血 5，限制在 10–90。性格修正例如：傲慢者被威胁 −20、被讨好 +20；怯懦者被威胁 +25；贪婪者收买 +30；冷静者讲理 +25。“给 SP”花 20 SP。成功后二选一：**收服**（拿到一张图鉴 Persona，按弱点和等级挑最接近的）或**奖励**（SP 和碎片）。失败时敌人起身并暴怒（攻击 ×1.4）。
2. 界面上显示的概率由 `negotiation-rules.negotiationChance` 另算，用的是 AI 或离线生成的性格；引擎掷骰用的是按属性映射的 `enemy.personality`。**两者可能不一致，玩家看到的概率不等于实际概率**（`app.js:996` 对 `p5-combat-rules.js:213`）。
3. 地图影子房自由交涉（`night-slice.resolveTalkCheck`）：玩家写一句话 → AI 或离线判定（离线版靠关键词匹配和字数）给出语气 tone 和质量 quality(0–100) → 成功率 = 50 + 性格修正 + (quality−50)×0.5 + 低血 5，限制在 5–95。成功：拿奖励，警戒 −4。失败：HP 扣危险档的一半，警戒 +18，还可以改为拔刀。

**合成与天鹅绒**（`velvet-rules.js` + `p5r-compendium.js` + `tower-flow.js` 的处理函数）
- 普通合成按 P5R 阿卡纳组合表算：目标等级 = 1+⌊(a+b)/2⌋；同阿卡纳取向下最近的一张；稀有面具按偏移表；特殊合成按配方。费用 = 结果等级 × ¥500，天鹅绒 NPC 信任每级 −5%，最多 −25%。
- **素材面具不消耗**，结果直接加进名录，所以合成实际上等于“付钱解锁”。技能继承接口存在（`inherit` 参数），但界面没有接上，结果只带图鉴默认技能（前 6 个主动技能）。
- 9 项服务：融合、特殊融合、网络融合（随机挑一个未拥有的合法结果，+¥1000）、图鉴登记与取回（等级 × ¥300）、处刑（献祭一张面具让另一张 +1 级，HP+5、SP+3、攻+1）、电椅（把面具变成素材或技能卡）、禁闭（¥800，HP+8 或 SP+6 或攻/防+2）、技能卡（把技能塞进未满 6 格的面具）、素材一览。**基础契约的 6 张面具不能献祭，也不能送电椅**。

**商店与经济**（`economy-rules.js`、`equipment.js`、`inventory.js`、`tower-flow.js`）
- 起始钱：iframe 默认 ¥8,000；宿主新档 `economy.money = 1000`，由种子覆盖。
- 据点商店实际只卖 4 种消耗品：止痛药 ¥300（+40 HP）、运动饮料 ¥280（+10 SP）、能量饮 ¥500（+20 SP）、复苏针 ¥1,500（50% 复活），再加“黑鸦军品”的装备。`economy-rules` 里定义的另外 3 家店（诊所、军品、贩卖机）、`buy/sell/createWallet` **只有 velvet-lab 用到**。
- 装备共 3 个栏位，约 20 件，分 T0–T5（武器攻击 2→14；防具防御和 HP；饰品有暴击、月光步数、警戒减免、金钱、宝箱、掉率、治疗、免先制等效果）。可强化 0–5 级，消耗强化石。出售按价格的 40%。
- 收入：每场战斗 ¥(240+60×层数)，乘装备或遗物的金钱加成，再乘区段倍率（聚光区 1.35，镜厅区 1.2）。月匣按品级给 ¥300–700 / 700–1,400 / 1,400–2,600，外加道具、装备和碎片。今夜请求一次 ¥500–1,500。
- NPC 信任 0–5 级（看守、枪匠、医生、店主），**只在击败 Boss 时全体 +1**，每级是很小的百分比折扣或加成。

**掉落**（`loot-rules.js`）：普通影子 55% 回声碎片、35% 游荡碎片、22% 消耗品、10% 装备；守卫或精英必掉强化石，55% 碎片，35% 装备（区段守卫必出装备）；Boss 掉执念残片、强化石 ×2 和本塔专属装备。装备层级 = ⌈层数 ÷ 8⌉（最高 5）。月匣品级：前 20% 层数木箱，60% 以前银箱，之后金箱；30F 以后有 18% 是陷阱箱。

**影时间与星期**：塔门只在影时间开；据点随时可进。跨夜判定的凌晨部分算前一天（例如周一 02:00 仍算周日晚上）。没有日或周的结算，没有体力，也没有每日重置。请求是“每次登塔一张”，不按天或周刷新。

**塔层与探索**（`dungeon-run.js`、`floor-map.js`、`region-rules.js`）
- 40 层，每 10 层一个区段：外环（基础）→ 腐蚀区（每 4 步 HP−2）→ 聚光区（每步警戒 +2，钱 ×1.35）→ 镜厅区（守卫更硬，安全屋只回 15%）。旧版 100 层的“钟摆区”已排除。
- 地图：起点在左下，出口在右上，主路是一条随机单调路径，**最短 8 步**；守卫放在出口前一格；侧房随机放钥匙、月匣 ×2、异响、机关、影子 ×2。10/20/30F 的路径中段有安全屋。
- 月光步数：1–10F 20 步、11–20F 18 步、21F 起 16 步，再加装备和区段修正。每移动一格 −1 步、警戒 +1；进遭遇格警戒 +8；“听墙”消耗 1 步、警戒 +4，可揭示 2 格外的房间。警戒到 100 → 下一战被先制（开场 HP −8%）。**每进一层警戒 −15**。步数用完 → timeout，本次登塔结束。
- 塔层（stratum）有 3 种，只开放了“回声之庭”；“虚荣剧场”和“逃避回廊”标着“等独立玩法开放”。

**成长线**
- Persona XP：每场胜利只给**当前出战的那张面具** `20+4×层数`；升级需要 `60+30×等级`。同伴永不升级。等级提高 HP/SP 并解锁原作技能。
- 名录扩充靠 4 条路：交涉收服、合成、取回、借面具（每周一张，来自联机好友）。
- 武库：遗物最多装 2 个（月光碎片：SP+8、技能 +6%；回响之线：钱 +15%、掉率 +5%）；共鸣链 3 选 1（弱点 +10%、暴击 +6%、治疗 +30%）；“迷思”给某技能 +10% 暴击；“誓约”把某技能换成 0 SP 防御；技能等级每级 +6%。全是小幅百分比。
- 装备强化，NPC 信任。**主 App 的五维属性和生活 SP 都不参与。**

### 2.3 模拟数值（【实测】：200 局 × 每格，复制的规则文件，默认面具、默认同伴，起始满血满蓝，武器 +2，防具 +2）

smart 策略 = 已知弱点就打弱点，否则用威力最高的技能；basic 策略 = 只按普攻。表里“输入次数”= 玩家需要下的指令数（一个回合里 4 名角色各算一次）。

| 层 | 敌 HP（主+副） | smart：胜率 / 回合 / 输入次数 / 剩余血 | basic：胜率 / 回合 / 输入次数 / 剩余血 |
|---|---|---|---|
| 普通 1F | 66+36 | 100% / 1.1 / 5.6 / 100% | 100% / 2.0 / 6.8 / 98% |
| 普通 20F | 114+63 | 100% / 1.8 / 8.8 / 96% | 100% / 3.5 / 12.6 / 87% |
| 普通 38F | 150+83 | 100% / 1.9 / 9.3 / 94% | 100% / 4.2 / 16.6 / 63% |
| 守卫 10F（区段） | 140+77 | 100% / 2.7 / 11.0 / 84% | 100% / 3.8 / 15.0 / 70% |
| 守卫 30F（区段） | 203+112 | 100% / 2.8 / 13.6 / 82% | 96% / 6.2 / 21.9 / 33% |
| Boss 40F 一阶段 | — | 91% / 6.0 / 22.8 | 88% / 6.4 / 23.8 |

另外两组地图统计：每层平均最短 8.0 步；每层房间构成固定（空房约 15、守卫 1、钥匙 1、机关 1、异响 1、月匣 2、影子 2）。注意：模拟每场都满血开打，而实战的 HP 会在整次登塔里一路带着走。我方损耗主要靠消耗品和安全屋处理，所以实战压力会比表格略高，但差得不多。

---

## 3. 代码位置与可复用性

标记：**可复用**＝没有 DOM，可以原样（或仅改 import）搬进规则层；**需拆分**＝里面有可复用的规则，但和 DOM、HTML 字符串缠在一起；**应重写**＝纯表现，或者是废代码。

### 3.1 规则层（JS 模块）

| 文件 | 行数 | 内容 | 标记 | 备注 |
|---|---|---|---|---|
| `p5-combat-rules.js` | 854 | `P5Battle` 类：回合、行动、伤害、1 MORE、接力、SHOWTIME、HOLD UP、交涉、快照 | **可复用** | 需修 strength/magic 不生效；把交涉概率抽成公共函数 |
| `p5r-battle-adapter.js` | 333 | 把图鉴转成战斗 Persona、技能（威力分档、状态、目标） | **可复用** | 平衡层的单一来源 |
| `p5r-compendium.js` + `p5r-compendium-data.js` | 245 + 112k（2.2 MB） | P5R 图鉴、合成计算、特殊配方、按属性找可收服的面具 | **可复用** | 数据应该懒加载 |
| `p5-battle-bridge.js` | 539 | 生成塔内战斗、敌人规格、战斗视图模型 `buildBattleView`、道具、Boss 变身、回执 | **可复用** | 实际上就是“战斗工厂 + 视图模型”，无 DOM |
| `dungeon-run.js` | 571 | 一次登塔的状态：楼层、警戒、钥匙、地图驱动、楼层推进、结算 | **可复用** | 前半段的“三选一路线”模型（ROUTES、RISK、choices/enter/advance、echo/quiz）是旧版，删掉或另存 |
| `floor-map.js` | 352 | 5×5 地图生成、迷雾、移动、听墙、遭遇、钥匙、月匣、机关、安全屋 | **可复用** | 文件头已声明“不画 UI” |
| `tower-layout.js` / `region-rules.js` / `tower-registry.js` | 7 / 103 / 59 | 层数、区段规则、塔层 | **可复用** | |
| `tower-journey.js` | 86 | `encounterFor`（敌人数值）+ `towerNodes` 文案 + 旧的 `createTowerJourney` | **需拆分**（小） | `encounterFor` 留下；`createTowerJourney` 是废代码 |
| `loot-rules.js` / `equipment.js` / `inventory.js` / `economy-rules.js` | 96 / 185 / 188 / 217 | 掉落表、装备目录、背包写入、道具与商店定义 | **可复用** | economy 里的 `buy/sell/createWallet/SHOP_DEFS` 只有 lab 用到 |
| `velvet-rules.js` | 288 | 合成、特殊合成、网络合成、登记、取回、处刑、电椅、禁闭 | **可复用** | 不消耗素材这一点要在设计上重新决定 |
| `negotiation-rules.js` | 124 | 交涉的性格、选项、概率 | **可复用** | 要和另外两套合并 |
| `night-slice.js` | 811 | AI LAB 夜层规则 + 自由交涉判定 `resolveTalkCheck` + 离线判定 | **可复用** | 塔内影子房也在用它的判定 |
| `grid-negotiation.js` | 38 | 影子房的人格、开场白、要求 | **可复用** | |
| `shadow-time.js` | 110 | 影时间判定、倒计时 | **可复用** | |
| `persona-progress.js` / `arsenal-effects.js` / `npcs.js` / `requests.js` / `awakening-state.js` / `map-interaction.js` | 25 / 81 / 39 / 68 / 37 / 13 | XP、遗物与共鸣链、NPC、请求、觉醒契约、相邻格判断 | **可复用** | |
| `module-identity.js` | 22 | 按主题给出塔的名称 | **可复用** | `syncUmbraTitle` 只碰一下 document.title |
| `negotiation-ai.js` / `night-slice-ai.js` / `battle-advisor.js` / `persona-ai.js` | 252 / 336 / 341 / 96 | AI 契约、参数归一化、离线兜底、postMessage 桥 | **可复用**（属于桥接层） | 只有零星 DOM 引用，用来更新状态文字 |
| `persona-compendium.js` | 163 | 旧的自制图鉴 | **应重写，直接删** | 没有任何文件 import 它 |

### 3.2 编排层（逻辑和 DOM 混在一起）

| 文件 | 行数 | 混了什么 | 标记 |
|---|---|---|---|
| `app.js` | 1,733 | 全局 `state` 仓库（包括旧字段 enemyHp 312/420、stagger、turn）、存档读写 `persistP5State/loadP5State`、面具名录、借面具、开战 `startBattle`、执行 `execute`、HOLD UP 和交涉流程、道具使用、战术顾问、**全部首页、Persona、武库、战斗的 HTML 模板**、`render()` 整块 `innerHTML`、全局点击分发、调试接口 | **需拆分**（工作量最大） |
| `tower-flow.js` | 1,382 | 据点、地图、天鹅绒、商店、背包、交涉页面，全部 HTML。**规则副作用也写在事件处理里**：战斗奖励结算（`battleReturn` 算 ¥、掉落、XP、请求、NPC 信任）、异响回血、机关扣血、安全屋回复、区段每步效果、购买、合成、献祭、禁闭等扣钱改档。用 `document.querySelector('#velvet-a').value` 读表单。登塔存档的序列化也在这里。调试函数引用了未定义的 `MAP_STEPS`，会直接报错 | **需拆分** |
| `encounters.js` | 220 | 演出导演：胜利三步回执、战利品揭晓、QTE、Boss 二阶段变身（直接改 `state.enemyHp=420`）、排练、场景索引 | **需拆分**（Boss 阶段逻辑归入战斗控制器，其余重写） |
| `preparation.js` | 218 | 觉醒和重塑流程（4 题、自述、AI 选面具）、设置抽屉的 HTML | **需拆分** |
| `night-slice-flow.js` | 716 | AI LAB 界面、存档、和背包对接 | **需拆分**（如果 AI LAB 保留） |

### 3.3 表现层

| 文件 | 标记 | 备注 |
|---|---|---|
| `combat-motion.js`（118）、`p3-signature-fx.js`（160）、`shadow-hour.js`（19，整舞台缩放）、`art.js`（22） | **应重写** | 依赖 DOM 布局读取和固定设计稿缩放，这是性能和适配问题的根源（见 AUDIT R1、R4） |
| `reload-p3/p4/p5/hamuko.js` + `.css`（JS 约 200 KB，CSS 约 1.65 MB） | **应重写** | 靠 MutationObserver 往 DOM 里插装饰。规则层和渲染层分离后，原来的选择器全部失效 |
| `styles.css` 等 13 份公共 CSS（约 217 KB）、`theme-p3.css`（71 KB）、`p5-mobile-combat.css` | **应重写** | |
| `fusion.js` / `fusion.css` / `master-battle.css` / `p3-master.css` / `src-p3-*.css` | **应重写，直接删** | 没有任何文件引用。`fusion.js` 是地图装饰脚本，和 Persona 合成无关；`src-p3-*` 已经合进 `theme-p3.css` |
| `theme-p4.css` / `theme-p5.css` | 删 | 0 字节 |
| `p5-combat-lab.*` / `p5-velvet-lab.*` | 留作开发工具或删 | 独立调试页 |
| 测试 `*.test.mjs` ×3 | 保留 | 覆盖面很小（顾问、相邻格、交涉桥） |

> 注：需求里提到的“battle-engine”在 base 里**只有 `battle-engine.css`**，没有同名 JS。实际的引擎是 `p5-combat-rules.js` 加 `p5-battle-bridge.js`。

---

## 4. 四个主题怎么挂进来、共享什么

**选主题**：`index.html` 里的内联脚本读 `?theme=` 或 `localStorage['maskaria-theme']`，默认 p3，写到 `html[data-theme]` 上；hamuko 写成 `data-theme="p3"` 加 `data-skin="hamuko"`。宿主只在 iframe 加载时通过 URL 决定主题，**没有运行中切换主题的通道**。

**挂法**：四套主题都是**纯装饰层**，只在自己的 `data-theme` 下运行，否则立刻 return。
- `reload-<主题>.js`（defer 加载）用 MutationObserver 盯住 `#content` 的每次整块重绘，往里插 `aria-hidden` 并且 `pointer-events:none` 的装饰节点，给已有节点加 class 或 CSS 变量。
- 战斗命中：都监听 `.battle-impact` 节点的插入，各自实现 `onImpact` 播放自己的特效。
- 约定：不改文字，不改 `data-*` 钩子，不拦截点击（见各文件头注释）。
- `reload-<主题>.css` 全部写在 `html[data-theme=…]` 选择器下（p5 有 2,390 处，hamuko 2,623 处）。
- 名称映射：`module-identity.js`。

**共享的部分（四套完全一致）**
- 同一份 DOM 和 HTML 模板（app.js、tower-flow.js 等生成），**同一套规则、存档键和父子桥**。
- 同一批公共 CSS（styles、combat、experience、tower-flow、battle-engine……）。
- **基础构图本身是 P3 风格**：`sh-app-deco` 月亮和水面、“DARK HOUR”、`shadow-hour.js` 固定 390 宽或 1440×820 设计稿再整体缩放。其他主题都在 P3 骨架上“换皮”。
- P3 专属演出 `p3-signature-fx.js`（失衡、总攻）只对 p3 和 hamuko 生效，P4、P5 回落到 `combat-motion` 的通用 impact。

**不共享 / 代价**：`index.html` **无条件加载四套主题的 CSS 和 JS**（CSS 合计约 2.0 MB、约 1.1 万条规则，红色主题只用到其中约 2,800 条，见 AUDIT R5）。红色主题另外有一套重做层 `red/`（`red/js/00-core…90-guard`，前几包交付），它同样挂在原 DOM 和钩子上。所以只要渲染层一变，四套主题加上 red/ 都要重新接。

---

## 5. 系统策划判断

### 5.1 好玩的地方（保留，并作为重设计的锚点）
- **P5 的“压制链”是完整的。** 弱点 → 倒地 → 1 MORE → 接力加伤 → HOLD UP → 总攻或交涉，规则清楚，状态机干净，加上敌人意图预告，单回合内有“先手排序”的思考空间。
- **真实图鉴驱动的收集。** P5R 的阿卡纳合成和特殊配方是现成的、深的长线目标，而且收服 → 合成 → 换面具打弱点在逻辑上闭环。
- **自由文字交涉是独特卖点。** 玩家说一句话，AI 判断语气和质量，概率和代价由规则决定（AI 不能作弊）。这是最能和“生活记录 App”气质接上的玩法，离线兜底也有。
- **地图有轻 Roguelite 的骨架。** 种子地图，加上月光步数、警戒、钥匙或守卫二选一开门，资源维度设计得对。
- **影时间和现实时间挂钩**，给了“晚上才开塔”的仪式感。借面具按周、联机社交的方向也对。

### 5.2 无聊、重复的地方
1. **战斗没有压力**（§2.3）。只按普攻也能 96%–100% 赢到 38F。根本原因：敌人 HP 曲线平缓（1F→38F 约 ×2.3），我方 4 人满编，HP 在整次登塔里一路带着，消耗品又便宜。结果打弱点、交涉、准备都变成可选项，P5 循环的价值被抹平了。
2. **38 层几乎同构。** 每层房间配比完全一样，敌人名字只有“聒噪的假面 / 游荡的回声 / 守层的假面”几种，弱点按层号机械轮换（看一次就能背下来），每场都是“1 主 + 1 副”。区段规则只有 4 条，而且都是被动数值，不改变行为。
3. **地图没有张力。** 步数预算 16–20 步，最短路径 8 步，几乎不会超时。每进一层警戒 −15，先制惩罚只有开场 HP −8%。“听墙”、钥匙路线这些决策基本不重要。
4. **成长感很弱，甚至是假的。** Persona 五维不进伤害；只有出战的那张面具拿 XP，同伴永远 1 级；合成不消耗素材，名录只涨不减，“取舍”不存在；“伤害 +5%”的增益完全没有生效；禁闭练攻击对伤害无效。
5. **大量小百分比系统堆在一起。** 遗物、共鸣链、迷思、誓约、技能等级、装备特效、NPC 信任、请求，每个只有 2%–15%。难度平缓的前提下，这些全都感受不到。
6. **一些亮点没接进实战**：总攻 QTE、Boss 变身的演出版和实战版是两套；三套交涉里有两套按钮流程，玩家很难分清“HOLD UP 交涉”和“影子房交涉”有什么区别。

### 5.3 冗余与不一致（重设计时直接合并或删除）
- 交涉概率有 3 份实现（`p5-combat-rules` 的 PERSONALITY_MODS、`negotiation-rules`、`night-slice.talkChance`）；性格也有两个来源（界面用 AI 给的，掷骰用按属性映射的）。**显示概率不等于实际概率，这是 bug**。
- `dungeon-run` 里新旧两套登塔模型并存（三选一路线对地图）；`tower-journey.createTowerJourney` 是废代码；`echo` / `quiz` / `elite` 页面只能从旧路线进入。
- `app.state` 里的 hp、sp 和 `P5Battle.party` 里的 hp、sp 双写，靠 `syncAppState` 同步；一批旧战场字段（`enemyHp:312/420`、`stagger`、`turn`、`maybeOpenNegotiation`）仍然留着。
- 属性中文名至少在 5 个文件里重复定义；`ARCANA_LABELS` 在 app.js 和 velvet-rules 里写法不同（女教皇对女祭司，fortune 对 wheel）。
- economy-rules 里的 3 家店和钱包接口没有接进正式商店；废文件见 §3.3。
- `__p5rDebug.shadowTalk/fightShadow/guardian` 会抛 `ReferenceError: MAP_STEPS is not defined`。
- 地图安全屋“休息”只回复主角，同伴的 `partyVitals` 不回复（只有 interlude 里的 `restParty` 会回）。【实测：代码路径】这是不是有意设计还没确认。
- 战斗规则在 JS（base）和 TS（宿主 `src/umbra/engine`）里各有一份。

### 5.4 单局时长【推断】
- 单场普通战斗：玩家要下 6–13 个指令（每回合 4 名角色），每个指令配演出约 1.5–3 秒，加上遇敌转场和回执，**大约 40–90 秒**；区段守卫约 1.5–2 分钟；Boss 两阶段约 4–6 分钟。
- 单层：移动 10–14 格，加 1 场守卫，再加 0–2 场可选的影子战或交涉，加月匣和事件，**大约 2–4 分钟**。
- **完整 40 层一次通关：约 1.5–2.5 小时**，再加上据点准备。实际会被切成好几个影时间夜晚（中途离开会自动存档、可以继续）。AI LAB 一晚约 3–5 分钟。
- 现实约束：塔门每周只开 3 个夜晚；在地图里战败一次就清空整次登塔进度（钱和物品保留）。

### 5.5 节奏问题
- **前期没教学，后期没变化**：第 1 层和第 38 层玩起来一样，难度曲线和机制曲线都是平的。
- **一局太长、失败太狠、但又不难**：长时间低压力的重复，最后才有一个 Boss。一旦意外战败，几十分钟的进度一次清零，挫败感集中爆发。
- **准备和冒险脱节**：据点系统很多，但塔内用不上（难度太低），而塔内又不能购物或合成。“回城补给 → 再出发”的 P5 节奏（印象空间和殿堂的循环）没有成立。
- **短会话不友好**：宿主是手机上的日常记录 App，玩家每次大概只有 5–15 分钟。而一个有意义的段落（10 层一个区段）要 20–40 分钟，中间没有自然的停顿点和奖励节点。
- **现实成长没回流**：用户在 App 里的努力（生活 SP、五维）不影响游戏，游戏收获也不反哺 App。这是这个产品最该做、却没做的差异化。

---

## 6. 规则层 / 渲染层分离：改哪些、多少工作量【推断，按 1 名熟悉代码的开发者或 AI 估】

前提：不改现有文件，在新目录 `core/`（规则和控制器）与 `view/`（渲染）重建；不包含 PixiJS 画面和主题皮肤包（那是 REARCH-PROPOSAL-v2 的引擎层和皮肤层）。存档键、父子桥协议保持不变。

| # | 工作 | 涉及文件 | 估算 |
|---|---|---|---|
| 1 | 直接迁入规则层，统一 import，补 JSDoc 类型 | §3.1 里所有“可复用”的约 30 个文件 | 1 天 |
| 2 | 合并三套交涉成一个 `negotiation-core`（统一性格来源、显示概率即实际概率）；删除旧路线模型和废文件；统一属性和阿卡纳名称表 | p5-combat-rules、negotiation-rules、night-slice、dungeon-run、tower-journey、persona-compendium、fusion.* | 1–1.5 天 |
| 3 | 抽出 `GameStore` 和存档：把 app.state 拆成永久档、登塔、战斗三块，读写 `maskaria.p5r.*` 三个键，兼容旧档，清掉旧字段 | app.js（state、persist/load）、tower-flow.js（serialize/restore） | 2 天 |
| 4 | 抽出 `BattleController`：开战参数组装、行动执行、HOLD UP、交涉、道具、换面具、借面具、Boss 变身、战术顾问请求、回执；对外发出事件（action-resolved、one-more、hold-up、victory……），返回 Promise 等演出播完 | app.js（startBattle、execute、performHoldUpAction、negotiation*、useBattleItemAction）、encounters.js（Boss 阶段）、p5-battle-bridge.js | 3 天 |
| 5 | 抽出 `RunController` 加 `BaseServices`：进塔、移动、房间动作、战后奖励结算（从 `battleReturn` 搬出）、区段效果、请求、NPC；商店、装备、背包、天鹅绒 9 项服务改成纯函数加参数，不再读 DOM 表单 | tower-flow.js（约 60% 的代码量） | 3–4 天 |
| 6 | 觉醒和 AI LAB 控制器 | preparation.js、night-slice-flow.js | 1.5 天 |
| 7 | 事件总线和视图契约、无头测试：种子化跑完整一局（不依赖 DOM），把 §2.3 的模拟固化成回归测试 | 新增 | 2 天 |
| 8 | 和宿主 TS 引擎合并成一个来源（建议规则层就以 TS 为准，Demo 引用同一份构建产物） | ptd/src/umbra/engine/*（这一项要宿主方配合） | 1–2 天 |
| | **合计** | | **约 13–18 人日（2.5–3.5 周）** |

后续另算（不在上面的合计里）：新渲染层 `view/`（DOM 或 Canvas，场景包括据点、地图、战斗、天鹅绒、结算）约 10–15 人日；每套主题皮肤（p3、p4、p5、hamuko）按新事件接口重做，各约 5–10 人日；数值重平衡（见 §5.2）约 3–5 人日，可以和第 7 项的模拟测试并行。

**风险**
- 主题层（含 red/）全都靠现有 class 和 `data-*` 钩子。拆分以后，在新视图完成前，旧主题只能冻结在 base 版本上。
- 宿主已经上线的存档里有 `profile.demo.p5r` 快照，字段名不能改，只能加新字段。
- 规则层修 bug（五维生效、增益生效、交涉概率统一）会改变手感，应该和重平衡一起做，不要单独上线。

---

## 附：本次没能确认的事项
- 实机里每个指令的演出时长（§5.4 的秒数是按代码里的动画参数估的，没跑浏览器）。
- “安全屋不回同伴”到底是有意设计还是遗漏。
- 宿主侧有没有别的入口会写 `economy.money`（例如生活记录直接加 ¥）。只读检索没找到，现有路径只有 UMBRA 自身、商店和联机。
