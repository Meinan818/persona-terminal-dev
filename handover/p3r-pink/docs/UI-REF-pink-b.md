# UI-REF · 粉皮 P-B（塔内 / 战斗 / 演出）P3P 女主线原作对照表

原则（用户 07:18 / 07:21 / 07:24，PKG_RULES §8 §9）：每个界面以 **P3P 女主线（FeMC）实机画面**为底子 1:1 复刻；原作没有的界面用原作同一套界面语言（框线、光标、配色、字体层级）补齐并写明依据；在此之上的「原创补充」必须提升体验、不替换原作标志元素、符合防晕，并逐条标注理由。找不到画面的写「待确认」。
横屏 / 桌面 / 平板横屏按原作 16:9（PSP 480×272）版式；手机竖屏把同一套元素重排为竖向，指令进拇指区，字号 ≥12、按钮 ≥44。

## 参考帧来源

- **实机视频帧（首选）**：YouTube 自动截帧 `i.ytimg.com/vi/<id>/hq1|hq2|hq3.jpg`，分别对应视频 **25% / 50% / 75%** 时间点（由视频时长换算，下表写成 mm:ss）。本机无法下载整段视频（YouTube 要求登录验证、B 站 412），故用这三帧；更细的时间点写「待确认」。
- **P3P 2023 重制版（Switch/PC）官方 1080p 截图**：Game UI Database `https://www.gameuidatabase.com/gameData.php?id=1865`（男主线蓝色，与女主线**版式完全相同、仅换色**，用来量版式/字号/位置；颜色以女主线视频帧为准）。
- 本地副本（只作 QA 对照，**不进交付**）：`work/umbra/qa/compare-pink-b/ref/*.jpg`。

| 帧文件 | 内容 | 来源（链接 + 时间点） |
|---|---|---|
| femc-command-wheel.jpg | **女主线战斗 COMMAND 轮盘**（左下深莓紫半圆 + 粉色圆形图标、选中项白圈、`Attack` 白字、`RUSH △` 粉字、`L ANALYZE` 小签；底部说明 `Attack using equipped weapon.`）+ 右侧队员栏 | https://www.youtube.com/watch?v=Afc8TUEwcpM&t=94 （≈01:34，Floor 10 Boss: Dancing Hands [Female MC]） |
| femc-navi-attack-again.jpg | **ONE MORE 导航台词**：左上粉紫三角头像 + 黑色长条白字 `Attack again!`；倒地敌人 | https://www.youtube.com/watch?v=Afc8TUEwcpM&t=47 （≈00:47） |
| femc-result.jpg | **女主线战斗结算 RESULT**：整屏玫粉底、左上深酒红三角、白色斜带上斜排大字 `RESULT`、`EXP` 斜带、`11 EXP` 斜体、右侧深酒红主角剪影、`STATUS / PLv 9 / 名字` | https://www.youtube.com/watch?v=5S3Dh6VTHiY&t=82 （≈01:22） |
| femc-floor-adamah.jpg | **塔内探索**：左下浅粉胶囊楼层名 `Adamah 239F`（粉边、深字）、半透明小地图（浅灰房块、青色箭头）、右上绿色日期块 `1/22·F Dark Hour Half`、右侧队员头像 | https://www.youtube.com/watch?v=58CnURZKjSM&t=72 （≈01:12，Reaper FemMC Route） |
| femc-party-hud-boss.jpg | **队员栏**：右缘竖排头像，当前行动者头像后深酒红菱形；HP/SP 白字黑描边两行；斜向 HP 橙 / SP 紫细条；青色表情状态；技能名 `Defense down!` 顶部居中白字黑描边 | https://www.youtube.com/watch?v=KMlihoDDwns&t=7 （≈00:07） |
| femc-allout-prompt.jpg | **总攻击 / HOLD UP 提示**：白底浅蓝速度线、斜线分割三格人物特写、红色 `!!`（女主线也是白蓝，不换粉） | https://www.youtube.com/watch?v=0AclI48GMys&t=27 （≈00:27） |
| femc-dialogue-choice.jpg | **对话框 + 选项**：底部白色半透明圆角框、左上小号名字、右下粉色角标；选项列表白底、选中项**玫粉横条白字** | https://www.youtube.com/watch?v=sUNmTL9dGp0&t=10339 （≈2:52:19） |
| femc-skillname-invigorate.jpg | 技能名：顶部居中深色半透明条白字 `Invigorate 1`；右侧队员栏 | https://www.youtube.com/watch?v=GoBbo_mmmr0&t=762 （≈12:42） |
| femc-persona-list.jpg | 列表：白底列表 `LV 5 Angel`、选中项粉条；左下粉色 `Persona` 签 | https://www.youtube.com/watch?v=RJnXOfF7Avw&t=5082 （≈1:24:42） |
| femc-hud-pierce.jpg | 技能名 `Pierce Attack` + 女主线队员栏（粉红 tab） | https://www.youtube.com/watch?v=zpSfxx8PfJo&t=203 （≈03:23） |
| femc-tartarus-checker.jpg | 塔尔塔罗斯 Thebel 区绿黑棋盘地面战斗 | https://www.youtube.com/watch?v=Ldyzw9MXkgE&t=200 （≈03:20） |
| femc-dialog-tartarus.jpg | 塔内对话框（白圆角框 + 粉角标） | https://www.youtube.com/watch?v=h4tDEyfZt-U&t=92 （≈01:32） |
| p3p-1more-diamond.jpg | **女主线 1 MORE**：画面中央玫红细线菱形 + 大号白「1」+ `MORE`，中心红光；顶部技能名 `Garudyne` 深色条；同视频另一帧：`CRITICAL` 绿色标签 + 伤害数字 | https://www.youtube.com/watch?v=2aCsxYr4tSc&t=22 / &t=15 |
| p3fes-gameover.jpg | Game Over：深蓝暗室 + 居中白字台词（P3 FES；P3P 同系列，女主线帧待确认） | https://www.youtube.com/watch?v=6jNySqBrpa8&t=12 |
| shuffle-cards.jpg / shuffle-sweep.jpg | **Shuffle Time** 选卡：金黄放射底 + 阿尔卡纳卡、`SWEEP BONUS` 白字 | https://www.youtube.com/watch?v=zmdOqQPQfiI&t=10 / &t=15 |
| shuffle-title-fes.jpg | `SHUFFLE TIME!!` 斜体标题（FES 男主线蓝；女主线配色待确认） | https://www.youtube.com/watch?v=vVDWjjb8O54&t=466 |
| skill-list-fes.jpg | 技能列表（FES，仅参考结构） | https://www.youtube.com/watch?v=czCZCpDPNic&t=1337 |
| remaster-command-wheel.jpg | 重制版 COMMAND 轮盘 1080p（量位置：左下 ~22% 宽，说明文字底部 35%–70%） | gameuidatabase uploads/Persona-3-Portable02022024-104159-63013.jpg |
| remaster-skill-list.jpg / remaster-item-list.jpg | 技能 / 道具列表：左下浅色半透明面板、深色描边、选中项深色条白字 + 右侧消耗 `6 HP`；左下角 `Skill` 签 + 红圆图标 | …-104159-49945.jpg / …-104200-39721.jpg |
| remaster-target.jpg | 选敌：顶部深色半透明条 `Cowardly Maya  At·Df·Hit`；敌人头顶菱形光标；左下 `TARGET` 小字 + 选中技能条 | …-104159-86617.jpg |
| remaster-result.jpg | 结算版式（蓝；女主线为粉） | …-104200-83415.jpg |
| remaster-allout-prompt.jpg | 总攻击提示 1080p | …-104200-8886.jpg |
| remaster-tartarus-block.jpg | 进塔区块标题：左侧绿色横条白色粗体 `TARTARUS` + `Go for the following block.`、右侧绿条 `1 block` | …-104158-29656.jpg |
| remaster-map-floor.jpg / remaster-explore.jpg | 探索：左下楼层胶囊、左侧半透明小地图、右上日期块 | …-104201-78347.jpg / …-104158-27633.jpg |
| remaster-down-1more.jpg | 敌人倒地（`RUSH` 签） | …-104200-28666.jpg |

## P3P 女主线界面语言（量自上表，全部落到 b.css 变量）

- 主色：玫粉 `#e8508c`（图标圆 / 选中条 / 楼层胶囊边）、浅粉 `#f9c6da`（胶囊底）、结算底 `#e9607f`、深酒红 `#7a0c2e`（结算三角 / 剪影 / 当前队员菱形）、深莓紫 `#3a0d2e`（COMMAND 半圆底）、白 `#fff`。
- 字：英文为细衬线感的窄体白字 + 黑描边（战斗内文字一律白字黑描边，不加底卡）；大标题（RESULT / STATUS）为超粗斜体无衬线。近似：`--u-font-deco`（ShCondU 800 italic）+ 正文 `--u-font-body`；描边用 `-webkit-text-stroke` / 多层 text-shadow。
- 框：圆角半透明白框（对话 / 列表），选中 = 实心玫粉横条白字（**不是**描边、不是缎带）。
- 光标：战斗内选中图标 = 白色圆环；选敌 = 敌人头顶菱形；列表 = 整条高亮（无独立箭头）。
- 转场：进入战斗 = 画面碎裂成玻璃块散开（P3 系列通用）；进塔区块 = 左侧横条标题滑入。

## 逐界面对照（INVENTORY id → 原作画面 → 要点 → 状态）

| 界面 | 原作画面 | 布局 / 配色 / 字体 / 框线 / 光标 / 转场要点 | 状态 |
|---|---|---|---|
| 战斗指令 `combat` `.command-grid` | femc-command-wheel、remaster-command-wheel | 横屏/平板/桌面：指令区底板为**深莓紫半圆**（左下）+ 顶缘弧形 `COMMAND` 小字；每个指令 = **玫粉实心圆图标** + 白字名；选中 = 图标外**白色圆环**、图标变深莓紫、名字放大白字。DOM 是网格按钮（不可改结构），故圆形图标排成两行网格而非真正弧形。竖屏：同一套元素放拇指区两行。 | 近似（排布为网格，非弧形；元素/配色 1:1） |
| 指令说明 `.command-detail>p` | femc-command-wheel 底部说明 | 白字黑描边，底部深色渐隐带 | 预留给 umbra-skill-info（P-B 只给容器透明 + 白字，不做卡片） |
| 技能 / 面具选择 `.mask-switcher` `.action-banner` `.combat-skill` | remaster-skill-list、femc-persona-list | 浅色半透明面板 + 深色细边；选中项**玫粉实心横条白字**，消耗右对齐（`4 SP`）；左下小签 `Skill` | 1:1（版式随 DOM） |
| 选敌 `.enemy-name` `.enemy-unit[aria-pressed]` | remaster-target | 敌名 = 顶部**深色半透明长条**白字（`名字  弱点…`）；选中敌头顶**玫粉菱形**光标（女主线色） | 1:1 / 菱形颜色近似（女主线选敌帧待确认） |
| 我方 HUD `.player-hud` `.party-rail` | femc-party-hud-boss、femc-command-wheel 右侧 | 头像位用首字圆标；当前行动者背后**深酒红菱形**；HP/SP 白字黑描边上下两行；**斜向细条** HP 橙 `#f59a3a` / SP 紫 `#9a6cf0`；队伍条 = 右缘竖排（横屏）/ 顶部横排（竖屏） | 近似（无官方头像，DOM 位置由骨架定） |
| 技能名条 `banner` / `fx-banner` | femc-skillname-invigorate、femc-party-hud-boss | 顶部居中**深色半透明条**、白字黑描边，进出只 opacity + 轻 translateY | 1:1 |
| 回合交接 `.turn-handoff` / `fx-turn` | 原作无回合大字；最接近 = 导航台词条 femc-navi-attack-again | 左上**粉紫三角头像位 + 黑色长条白字**（`轮到你了` / `敌人行动`） | 近似（原作无此界面，用导航台词语言补齐） |
| ONE MORE `fx-one-more` `fx-stagger` | p3p-1more-diamond、femc-navi-attack-again | 中央玫红菱形「1 MORE」+ 导航台词条 `ATTACK AGAIN!` + 敌人立绘倒地 | 1:1 |
| 命中 `fx-hit` `fx-critical` | femc-party-hud-boss（`Defense down!`）、p3p-1more-diamond 同视频 CRITICAL 帧 | 普通命中 = 白字黑描边短句；CRITICAL = 绿色六角标签白字 | 1:1 |
| 总攻击提示 / HOLD UP `holdup` | femc-allout-prompt、remaster-allout-prompt | **白底速度线（原作浅蓝 → 粉皮改淡玫粉，禁蓝青硬约束）+ 斜线分割三格**（人物格为剪影线稿，可 official 覆盖）+ 红色 `!!`；选项按原作对话选项：白底列表、选中玫粉条 | 近似（构图/!!/选项 1:1；速度线色因禁蓝青改粉；人物为剪影替代） |
| 总攻击 `fx-allout` | P3P 总攻击 = 卡通尘团 + 拳脚 + 星星（系列通用）；女主线帧待确认 | 尘团（SVG 云团）+ 剪影四肢穿出 + 星形 → 伤害数字白字黑描边 | 待确认（无女主线实机帧，按系列尘团语言） |
| 战斗胜利 `battle-victory` `fx-result` | femc-result | 玫粉底 + 左上深酒红三角 + 白斜带斜排 `RESULT` + 右侧深酒红剪影 + `STATUS` 斜体；数据行 = 斜带上的 `EXP` 式行 | 1:1（剪影为替代线稿） |
| 败退 `battle-defeat` / `tower-defeat` | p3fes-gameover（FES） | 深色底 + 白字 | 近似（女主线帧待确认） |
| 战利品 `loot` | shuffle-cards / shuffle-sweep（Shuffle Time） | 金黄放射底 + 竖卡；标题 `SHUFFLE TIME!!` 白字斜体 | 近似（卡面为我方 DOM 内容；女主线标题配色待确认） |
| 战斗舞台 `.sh-stage` | femc-tartarus-checker、femc-command-wheel | 战斗在塔尔塔罗斯：**暗绿底 + 绿黑棋盘地面**（静态，不做 3D）；UI 粉色叠在上面 | 1:1（地面为 CSS 棋盘，静态透视用 ≤8° 斜切代替） |
| 转场 `sweep`（遭遇） | P3 系列进入战斗玻璃碎裂（女主线同） | 画面碎成 8 块斜切玻璃片向外散开 ≤420ms | 近似（无逐帧，按系列碎裂语言；碎片带粉边为原创补充） |
| 进塔 / 显形 `reveal` `transition kind=room` | remaster-tartarus-block | 左侧横条 `TARTARUS` 白色粗体 + 副字，右侧小条楼层数，横向滑入 | 1:1（条色：原作绿；粉皮保留原作绿，见下「有意保留」） |
| 地图 `map` `map-pending-*` | femc-floor-adamah、remaster-map-floor | 原作无格子地图 → 以 GRID-P5T 结构为骨，视觉全用 P3P 小地图语言：**深色半透明底、已探索 = 浅灰房块、未探索 = 透明暗格、当前 = 玫粉箭头白描边/白框（原作青箭头，禁蓝青改粉）、可移动 = 玫粉细边**；楼层名 = 左下**浅粉胶囊**（`Adamah 239F` 式） | 近似（格子结构来自 GRID-P5T；配色/胶囊 1:1） |
| 塔层页 ×15 `tower-*` / 影子交涉 `shadow-talk*` / 交涉 `negotiation` | femc-dialogue-choice、femc-dialog-tartarus | 文本 = 白色半透明圆角对话框 + 左上名字 + 右下玫粉角标；选项 = 白底列表、选中玫粉条白字 | 1:1（对话框语言）；页面结构为我方 DOM |
| 弹层 `mask-sheet` `items-sheet` `advisor-sheet` `leave-sheet` | remaster-item-list、femc-persona-list | 列表面板（浅半透明 + 选中玫粉条） | 1:1（外框 `#sheet` 归 P-A，P-B 只管内部） |
| 琴音 cut-in `fx-showtime` | megatenwiki「P3P Kotone Shiomi Battle Cut-in Graphic」（女主 cut-in 存在，实机帧待确认） | 横向斜条面部特写（面部为线稿替代，official/hero-cutin.png 可覆盖） | 近似 |
| BOSS 阶段 `fx-boss-phase` | 原作无 | 导航台词条语言（黑条白字）+ 深酒红 | 近似（原作无） |
| QTE `fx-qte` | 原作无 | 同 COMMAND 语言 | 近似（原作无） |
| 开屏 `boot` | QjtEBaEa0sc 帧（女主线标题背景：白底 + 粉色樱花藤蔓 + 粉色同心圆） https://www.youtube.com/watch?v=QjtEBaEa0sc&t=33 | 白底、粉樱花枝、粉同心圆、字标 | 1:1（字标为 MASKARIA 自绘） |
| AI LAB `slice-*` | 原作无 | 用对话框 / 列表语言 | 近似（原作无） |

## 原创补充（PKG_RULES §9，逐条理由）

1. **按下樱瓣迸发（≤6 片，380ms）**——保留前任实现：P3P 女主线标题/菜单背景本身就是樱花（开屏帧），作为触控反馈能补足手机上没有手柄震动的「按到了」确认感；只在按下点、不覆盖原作元素。
2. **环境层稀疏樱瓣漂移（6 片静态位图，24s）**——保留：唯一常驻层，幅度 ≤3% 视口，给浅色页面一点生气，不出现在战斗舞台上方的 UI 元素里。
3. **碎裂转场的玻璃片带 2px 玫粉边**——原作碎片无色边；加粉边让粉/蓝两皮在同一转场下一眼可辨（PKG_RULES §0 三色一眼可辨）。
4. **地图当前格呼吸光标（1.8s，opacity/scale）**——原作小地图箭头不呼吸；手机上格子小，呼吸能让玩家一眼找到自己（GRID-P5T 要求的唯一第 2 个 infinite）。

删除（无原作依据、且不提升体验）：粉白樱瓣棋盘地图格、缎带光标（指令 / 地图 / 敌人）、缎带横穿回合字、玫红印章命中字、花环结算与花环套总攻击终帧、晨光缎带开屏、晨光纸面圆角卡战斗舞台。

## 有意保留的原作「非粉」元素

- 塔尔塔罗斯区块标题的**绿色横条**、日期块的**绿色**、战斗地面绿黑棋盘：女主线原作即如此，1:1 保留。
- 2026-10-21 08:40 修订：总攻击/HOLD UP 速度线（原作浅蓝）与小地图玩家箭头（原作青）按「粉皮禁蓝青」硬约束改为淡玫粉 / 玫粉白描边，标近似。
