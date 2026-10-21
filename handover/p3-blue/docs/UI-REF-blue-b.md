# UI-REF · 蓝 P3R · B-B（塔内 / 战斗 / 演出）原作对照

> 2026-10-21 B-B。原作帧本地存档（仅作对照，不进交付包）：`work/umbra/qa/compare-blue-b/ref/`。对照拼图：`work/umbra/qa/compare-blue-b/*.jpg`。
> 状态：**1:1** = 版式/框线/配色/字体层级/光标与原作帧逐项对上；**近似** = 元素与配色对上，但位置受骨架区块网格（SKELETON-API §2.1 禁改布局）或无立绘素材限制；**待确认** = 还没找到可靠原作帧，当前实现标明来源推断。**原创补充** = PKG_RULES §9 允许的加法，附理由。
> 视频帧优先（§8）：已检索到的实况视频 URL 列在各条，**时间点尚未逐一核对 → 标「时间点待确认」**；当前比对依据为下列媒体截图（多为评测/攻略站的实机截图）。

## 原作帧清单
| 文件 | 内容 | 来源 URL |
|---|---|---|
| ref/battle-ui.jpg | 战斗 HUD 全貌（敌名红条 / 耐性缩写 / 蓝圆盘指令 / COMMAND 新月弧 / 右侧队伍卡 / 底部按键提示） | https://samurai-gamers.com/persona-3-reload/p3re-battle-system-guide/ |
| ref/medium-2.jpg | 原版 P3（PS2/PSP）COMMAND 转轮（对照用，不复刻） | https://medium.com/design-bootcamp/persona-3-reloads-battle-ui-is-genius-actually-5703a4b56221 |
| ref/theurgy-ready.jpg | cut-in：椭圆透镜眼部特写 + 红色新月弧（风花 Theurgy 预备） | https://www.thegamer.com/persona-3-reload-p3r-theurgy-attacks-raise-meter/ |
| ref/theurgy-armageddon.jpg | Theurgy 选择：红黑底、巨大黑色斜体 THEURGY、红色剪影、蓝色菱形技能图标、白字技能名 + Info 说明 | https://screenrant.com/persona-3-reload-how-to-activate-theurgy-ability/ |
| ref/rpgfan-101.webp | 总攻击开场：深海军蓝背景 + 漂浮蓝色玻璃碎片 + 队伍入镜 | https://www.rpgfan.com/review/persona-3-reload/ |
| ref/results-reddit.jpg | 结算：海军蓝面板、`Lv 19` 白字、HP 青色条、NEXT EXP、白底行 `Lv 17 Rakshasa`、顶部红色 `>` 箭头 | https://www.reddit.com/r/persona3reload/comments/1icd22f/why_does_the_xp_not_match_up/ |
| ref/tartarus-floor1.jpg | 塔尔塔罗斯入口：右上绿色「DARK HOUR」日期牌 + 月相、左下海军蓝位置条「Tartarus: Entrance」、GO TO 提示条、右侧小队伍卡、底部按键提示 | https://www.escapistmagazine.com/tips-for-exploring-tartarus-in-persona-3-reload/ |
| ref/map-gamerant.jpg | 城镇地图：SELECT MAP 海军蓝/白条、蓝色定位钉、右上日期牌 | https://gamerant.com/persona-3-reload-atlus-ui-menu-design-good-rpg-feature/ |
| ref/shift-reddit.jpg | Shift（接力）：左上蓝色名牌、WEAK 圆形标记、右侧队伍卡 | https://www.reddit.com/r/PERSoNA/comments/16nlz4f/shift_functionality_explanation/ |
| ref/yt-BXEHr3QFmQI-maxresdefault.jpg | 全员总攻击收尾合集：角色色纯底 + 巨大半透明「MASS DESTRUCTION」+ 白色粗斜体收尾台词（DONE AND DUSTED. 等）+ 立绘 | https://www.youtube.com/watch?v=BXEHr3QFmQI（缩略图帧） |
| ref/yt-1more-Z4VcLrPs1Y8.jpg / yt-enemy-1more-Z4VcLrPs1Y8.jpg | 「1MORE」：蓝色斜切碎片自右刺入 + 白色超粗斜体「1MORE」；敌方版同构图红色 | https://www.youtube.com/watch?v=Z4VcLrPs1Y8（Battle Sequence Trailer 截帧） |
| ref/yt-skillname-AAdOjGYV_6c.jpg | 技能名：左上蓝色平行四边形名牌 + 白字（Agi），下方 Persona cut-in 宽银幕条 | https://www.youtube.com/watch?v=AAdOjGYV_6c |
| ref/yt-aoa-chance.jpg | 总攻击机会（HOLD UP）：左上导航员头像 + 台词框；右下蓝色斜带、巨大半透明「CHANCE」、白色粗斜体「ALL-OUT ATTACK」「B CANCEL / A GO!」 | https://www.youtube.com/watch?v=Z4VcLrPs1Y8 |
| 视频 | 菜单与 UI 动效 | https://www.youtube.com/watch?v=fXgKcM20M08（时间点待确认） |

## 逐界面
| 界面（INVENTORY id） | 原作画面 | 布局 / 配色 / 字体 / 框线 / 光标 / 转场要点 | 我们的实现 | 状态 |
|---|---|---|---|---|
| 战斗·敌人名 `combat` | battle-ui.jpg 左上 | 暗红→红横条（#4a0710→#d4202f），右端斜切，白字常规字重；下方耐性缩写灰色斜体，已知项青色 | `.enemy-name h1` 红斜切条；`.sh-aff` 灰斜体、弱点青色 | 1:1（配色/框线）；位置近似（骨架把敌人区放在 stage 区块顶部，非屏幕左上） |
| 战斗·指令 `combat` | battle-ui.jpg 左下 | 蓝色圆盘 + 白色粗斜体大字 PERSONA/ITEM/GUARD/ATTACK（深色描边），左侧大号蓝色新月弧，无按钮框 | `.command-grid` 按钮去框，白色粗斜体大字 + 深蓝描边；选中项左侧蓝色圆盘；指令区左缘蓝色新月弧；按钮图标放进圆形「按键位」 | 近似：原作是手柄四键环形，触屏改为 3 列网格（骨架区块）。竖屏 dock 浅色 → 指令区加海军蓝底（**原创补充**：保证白字可读） |
| 战斗·我方 HUD `combat` | battle-ui.jpg 右侧队伍卡 | 海军蓝平行四边形卡、HP/SP 白色粗斜体大数字、HP 青色条、SP 黄色条、斜置条 | `.player-hud` / `.party-rail` 海军蓝斜切卡、白斜体数字、青/黄斜条 | 近似：原作竖排右侧 + 头像；我们无头像（不使用官方立绘），队伍在顶栏横排（骨架） |
| 战斗·底部提示 `combat` | battle-ui.jpg 底部 | 透明底白字按键提示 | `.battle-log` 透明底白斜体 | 近似（内容是战斗日志而非按键提示） |
| 回合交接 `combat-enemy-turn` | shift-reddit.jpg 左上名牌 | 原作没有「YOUR TURN」大横幅；行动者以左上蓝色斜切名牌出现 | `impl.turn` 改为左上蓝色名牌滑入（我方蓝 / 同伴青 / 敌方暗红） | 近似；ENEMY TURN 文案为**原创补充**（触屏下需要明确的回合交接提示） |
| 技能名条 `fx-banner` | yt-skillname-AAdOjGYV_6c.jpg | 左上蓝色平行四边形名牌、白字常规字重 | 左上深蓝斜切条 + 白字，从左滑入 | 1:1（位置/形/配色）；左端红三角为**原创补充**（与 P3R 光标母题一致，提示行动者） |
| ONE MORE `fx-stagger` / `fx-one-more` | yt-1more-*.jpg / yt-enemy-1more-*.jpg | 蓝色斜切碎片自右刺入画面中部，白色超粗斜体「1MORE」，敌方红色版 | 2026-10-21 B-B 第 3 轮改为原作字样「1MORE」+ 右侧蓝色箭形碎片（敌方 `side:'enemy'` 红色）；`fx-one-more` 场景演出由 render 补播 | 1:1（字样/构图/配色）；下方「目标 DOWN」白签 + BATON PASS 红签为**原创补充**（触屏无手柄提示，需说明为何再行动） |
| 命中字 `fx-hit/critical/heal/guard` | shift-reddit.jpg WEAK 标记 | 原作 WEAK 为圆形蓝底标记 + 白斜体 | 白斜体蓝描边大字 + 碎光 | 待确认（WEAK 只一帧且为敌人头顶标记，非命中瞬间字；CRITICAL/回复/格挡帧未找到，维持现状） |
| cut-in（Evoker/Showtime）`fx-showtime` | theurgy-ready.jpg | 椭圆透镜眼部特写 + 外侧红色新月弧，背景压暗 | `impl.cutIn`：椭圆透镜（scaleY 睁开）+ 红色新月弧 + 自绘面部线稿（`official/hero-cutin.png` 可覆盖） | 1:1（构图/框线/配色）；人物为替代线稿 |
| ALL-OUT `fx-allout` | rpgfan-101.webp + yt-BXEHr3QFmQI-maxresdefault.jpg | 深海军蓝场景、漂浮蓝色玻璃碎片、队伍入镜；收尾 = 主角色纯底 + 巨大半透明 MASS DESTRUCTION + 白色粗斜体台词 + 立绘 | 海军蓝擦入 + 8 片碎片 + 4 剪影穿越 → 收尾卡：蓝色斜渐变底 + 半透明「MASS DESTRUCTION」+ 白色粗斜体「DONE AND DUSTED.」+ 伤害签 + 主角剪影（`official/hero-portrait.png` 可覆盖） | 收尾版式 1:1；人物为替代剪影 → 近似 |
| Theurgy（Boss 总攻击）`fx-boss-phase` / allOut boss | theurgy-armageddon.jpg | 红黑：黑底 + 斜贯红带、巨大黑色斜体 THEURGY、红色人物剪影、蓝色菱形技能图标、白字技能名 | `.bb-th-*` 红黑底擦入、巨型黑色 THEURGY、红色剪影（mask）、蓝菱形图标、白字技能名 + 伤害 | 1:1（版式/配色/字体层级）；剪影为替代 |
| HOLD UP `holdup` | yt-aoa-chance.jpg | 右下蓝色斜带、巨大半透明 CHANCE、白色粗斜体 ALL-OUT ATTACK / GO! / CANCEL | 2026-10-21 B-B 第 3 轮：面板改深蓝→蓝斜向渐变、底层半透明「CHANCE」、白色粗斜体标题，「总攻击」白底蓝字为主钮 | 近似：面板位置由骨架决定（横屏叠右栏、竖屏在战斗区下）；导航员头像不做（无立绘） |
| 战斗交涉 `negotiation` | — | P3R 无战斗交涉（本项目自有玩法） | 白卡 + 深蓝引语框 | **原创补充**（玩法自有，按 P3R 白卡/海军蓝配色） |
| 胜利结算 `battle-victory` / `fx-result` | results-reddit.jpg | 海军蓝面板、白字等级/数值、青色 HP 条、红色 `>` 箭头 | 结算卡：海军蓝玻璃片聚合 + 白字标题 + 红 `>` + 青色侧线 | 近似；玻璃片聚合动效为**原创补充**（P3R 玻璃母题，过渡更顺） |
| 塔层页 ×15 / 显形 / 战利品 / 败退 | tartarus-floor1.jpg（位置条、日期牌） | 海军蓝位置条 + 白字；绿色 DARK HOUR 牌 | 白卡 + 蓝顶线（沿用 B-A 白卡族） | 待确认（这些是本项目自有页面，原作无对应画面） |
| 塔尔塔罗斯地图 `map` / `map-pending-*` | tartarus-floor1.jpg（位置条） | 原作楼层小地图帧未找到；位置条为海军蓝 + 白字，DARK HOUR 绿色 | `.map-region` 海军蓝条 + 绿色 DARK HOUR；格子 = 深蓝玻璃地砖（GRID-P5T 蓝段） | 位置条 1:1；网格本身 待确认（P5T 式格子是项目规定，原作无） |
| 影子交涉 `shadow-talk*` / AI LAB `slice-*` | — | 原作无 | 白卡 / 影时间深底 | **原创补充**（玩法自有） |
| 转场·玻璃碎裂 `sweep` / 开战 | — | P3 系列进战斗为画面碎裂；P3R 具体帧待确认 | 撞击点玻璃碎裂 ≤430ms | 待确认 |
| 转场·影时间绿 `x-dh` | tartarus-floor1.jpg（DARK HOUR 绿） | 影时间绿 | 全屏绿层 ≤0.25 一次 + 满月 + 0:00 | 近似（配色对上，演出为**原创补充**：进塔提示） |
| 按下水波 + 碎光 | — | 原作无触屏 | 水波环 + 碎光三角 | **原创补充**（触屏反馈） |
| 技能说明栏 | — | — | 预留 `.command-detail` 区块（不改结构），由 umbra-skill-info 按原作 Info 条实现 | 预留 |
