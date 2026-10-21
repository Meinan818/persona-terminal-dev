# UI-REF-blue.md · 蓝白 P3R 原作参考（B-A：外壳 / 据点 / 经营）

参考帧本地副本（仅 QA 对照用，不进交付包）：`work/umbra/qa/compare-blue/ref/*.jpg`。
来源 A = ATLUS 官方 2023-12-18 发布的 P3R 实机截图（4K），转载页 RPG Site：https://www.rpgsite.net/news/15253-persona-3-reload-screenshots-detail-aigis-ken-koromaru-shinjiro-velvet-room-town-activities （原图 `https://images.rpgsite.net/image/a3ecf1c/<id>/original/Persona-3-Reload_20231218_NN.jpg`）。
来源 B = 玩家实机截图：Reddit r/PERSoNA「Can someone send me screenshots of persona 3 reload Menu UI」https://www.reddit.com/r/PERSoNA/comments/1h22rs3/ ；Medium「A Love Letter to Persona 3 Reload's UI」https://medium.com/illumination-gaming/a-love-letter-to-persona-3-reloads-ui-3eae29554134 ；GamesRadar 暂停菜单图 https://www.gamesradar.com/persona-3-reloads-ui-goes-hard-and-one-indie-dev-reckons-theyve-figured-out-why/ 。
来源 C = Game UI Database「Persona 3 Reload」实机截图集（@Hector_plz 投稿）https://gameuidatabase.com/gameData.php?id=1884 （原图 `https://www.gameuidatabase.com/uploads/Persona-3-Reload02182024-<id>.jpg`；静态截图，无视频时间点）。
实况视频（用户 §8 要求优先视频帧）：YouTube「Persona 3 Reload - Menus」https://www.youtube.com/watch?v=fXgKcM20M08 、「Persona 3 Reload - Persona Fusion Velvet Room」https://www.youtube.com/watch?v=Js7eeQhtDBY （已取视频缩略帧：`ref/yt-Js7eeQhtDBY.jpg` = 天鹅绒内景 · 伊丽莎白左下对话框 · 右上 DARK HOUR 日期；`ref/yt-fXgKcM20M08.jpg` = 暂停主菜单 SKILL 选中）——**视频内具体时间点待确认**（本环境无法逐帧拉取视频画面，暂以上面的官方 4K 实机截图为准；接手者补帧时把时间点写进下表）。

图例：**1:1** = 版式/框线/配色/字体层级/光标与原作帧逐项对上；**近似** = 原作无同功能画面，借用最接近画面的元素；**待确认** = 未找到原作帧。

| 我们的界面（INVENTORY id） | 原作画面 | 参考帧 / 来源 | 布局要点 | 配色 | 字体 | 框线 / 光标 | 转场 | 状态 |
|---|---|---|---|---|---|---|---|---|
| velvet-fusion / gallows / chair / lockdown / special / network / materials / skill（服务选择） | 天鹅绒房间「Choose a fusion method.」法术牌选单 | `ref/velvet-fusion-method.jpg`（A-11） | 左上衬线标题 + 白色长下划线；服务为**倾斜的牌卡**错位叠放；主角坐右侧 | 深蓝天鹅绒 `#081a86→#2a56f2` + 蓝色水纹；牌 `#1c4fe6`；选中牌薄荷青 `#3ff0d8` + 藏青字 | 衬线（牌名大、英文副名小斜体） | 牌 = 白色双线花框；选中 = 换底色（**无三角光标**） | 进入为 Velvet 擦除遮罩（B-B transition） | 近似（已加四角卷草花纹 `vr-corner.svg`；主角坐椅改为看守剪影；另见 `ref/velvet-wish.jpg` C-103902-7619） |
| velvet-compendium（图鉴） | 「Compendium Summon」列表 | `ref/velvet-compendium.jpg`（A-23） | 伊丽莎白左下；右侧黑底列表：青色阿尔卡那签 · 斜体等级 · 名字 · 右侧价格；左上黑框「Lv / 名字」「¥ Pay money」 | 黑行 `#05060f`；阿尔卡那签暗青 + 青边；选中行亮青 `#3ff0f0` + 深紫字 | 无衬线；等级斜体 | 列表行上下细分隔；选中 = 整行青底 | — | 近似（缺「Completed 4%」与排序页签；我们数据无阿尔卡那字段只画签框） |
| velvet-preview（融合预览/结果） | 融合结果卡 | 待确认 | — | 用选中牌的薄荷青卡 | — | — | — | 待确认 |
| shop（商店 · 诊所/军品/贩卖机） | 青ひげ药局购买菜单 | `ref/shop-aohige.jpg`（A-25） | 中下部藏青底板：顶部青色衬线招呼语；白行藏青字；左侧物品图标（蓝斜块 + HP）；价格右对齐细体大数字；右上黑框「¥ / Pay money」；右下「Owned 00」 | 底板 `#0b1446`；招呼语 `#4ff0e6`；行白；选中行藏青 + 右端青刀口 | 招呼语衬线；物品名粗无衬线；价格细体数字 | 行间 2px 藏青线；选中整行反色 | — | 近似（宽屏已有右栏招牌卡「月見坂」+ INFO 商品说明随悬停/聚焦切换；手机说明在行内下方；无 NEW 徽章、持有数在行内） |
| gear（装备） | 辰巳东交番 DIRECTORY 菜单 | `ref/police-directory.jpg`（A-26） | 黑色粗框；灰色「PRIVATE CATALOGUE / DIRECTORY」大字；白底菜单行；左侧竖排 POLICE | 黑 `#000` / 白 / 灰 `#e4e6ec` / 红 `#e8283c` | 粗无衬线 | 选中行 = 白底 + 红色底条 + 左侧红三角 ▶ | — | 近似（无竖排 POLICE 与 KEEP OUT 胶带、无汉字招牌块） |
| inventory / inventory-empty（背包） | ITEM 物品菜单（左队伍栏 · 中物品列表 · ×数量 · 下方青色说明） | `ref/item-menu.jpg`（C-103857-77108） | 列表行全宽；数量右对齐；说明青字在列表下 | 深蓝面板、选中白行 | 无衬线 + 斜体数字 | 选中整行白 | — | 近似（无左侧队伍栏：本作背包无队伍目标） |
| arsenal + 5 页签（武库） | 同上 Quest 列表 + 顶部 LB/RB 页签 | `ref/quest-list.jpg` | 同上；页签 = 白色药丸选中 + 红色 `<` `>` | 同上 | 斜体粗 | 同上 | — | 近似 |
| persona（Persona） | 队伍状态 Check Status | `ref/party-status.jpg`（B Medium） | 黑底行：头像签 · 名字 · Lv / HP / SP 斜体数字（HP 青、SP 黄） | 黑行、选中白行 + 红描边 | 斜体数字 | — | — | 近似（技能列表沿用斜切行） |
| home / home-no-persona（首页） | 暂停主菜单 | `ref/pause-menu-full.jpg`（C-103856-27402）、`ref/pause-menu.jpg` | 左大幅主角，右侧倾斜阶梯超粗斜体大字菜单，左上钱包框 | 蓝色水下渐变；选中项红色碎块 + 红白三角 | 超粗斜体 | 红白双三角 | — | 近似（已做蓝水下底 + −8° 阶梯大字：继续登塔 / 进入训练遭遇 / 交换；菜单项只有 3 个，非原作 9 项） |
| prep / prep-locked / prep-strata-locked（据点） | Tartarus 传送终端 SELECT TERMINAL + 城镇 FACILITY GUIDE | `ref/select-terminal.jpg`（C-103847-66641）、`ref/facility-guide.jpg`（C-103846-93697） | 塔门卡 = 影时间绿终端 + 白选中按钮；设施 = 蓝底「FACILITY GUIDE」白字列表 | 绿 `#5dff9a` / 蓝 | 超粗斜体标题 | 白色选中行 | — | 近似（原作是两个不同画面，这里合在一页） |
| interlude / return | SHORTCUT「Where should I go?」/ SELECT MAP | `ref/shortcut.jpg`（C-103847-97069）、`ref/select-map.jpg`（C-103847-6000） | 文案卡 + 右侧藏青列表「Where should I go?」，首项/悬停项白底 | 藏青 `#0b1446` + 白 | 衬线斜体引导句 | 白选中行 + 左蓝条 | — | 近似（无地图缩略图） |
| settings-sheet | CONFIG | `ref/config.jpg`（C-103844-65985）、`ref/config-detail.jpg`（C-103845-5759） | 深藏青斜分底；青字设置行；悬停/聚焦行白底 + 红描边；左下巨型「CONFIG」 | 藏青 / 青 `#9ff6ff` / 红 | 衬线引导句 | 白行红框 | — | 近似（弹层形态保留底部/侧边抽屉） |
| sheet / party-sheet / awaken-* / reshape | 系统确认框 | `ref/modal-yesno.jpg`（C-103853-9118） | — | — | — | — | — | 待确认（保留冷白斜切卡，未找到同功能原作帧） |
| masthead / room-nav / toast | 原作无（App 外壳） | — | — | — | — | — | — | 近似（取暂停菜单红白三角 + 蓝白斜块） |
| sweep / hit-fx / btn-feedback | 归 B-B 演出 | 见 B-B | — | — | — | — | — | — |
| frame-loading / frame-exit | 父应用 | — | — | — | — | — | — | 不在 iframe |

## 通用要点（全部来自上面参考帧）
- **金额框**：黑底、白色细框、`¥` 与数字同行，下面一行小字「Pay money」青色 + 细下划线（A-23、A-25、A-26 三张一致）——已用于商店、天鹅绒、背包。
- **引导字幕**：衬线/斜体白字 + 向左延伸的白色长线（A-11「Choose a fusion method.」、A-23「Select a Persona.」、Quest「Which request do you want to view?」）——已用于天鹅绒标题与宽屏页面说明句。
- **选中行**：列表类 = 整行反色（青底 / 白底），不是三角；菜单类（暂停菜单、DIRECTORY）= 红白三角 / 红三角 ▶。
- **手机竖屏**（用户 07:21）：同一套元素竖排——天鹅绒牌卡 3×3、列表行全宽、金额框置顶；不缩字、不横向滚动；主按钮在拇指区。

## 原创补充（§9：原作为底，以下为我们加的，均符合防晕、不替换原作标志元素）
| 补充 | 位置 | 理由 |
|---|---|---|
| 原创补充：按下三态（下沉 2px + 缩 97.5% + 底色加深；选中高亮 160ms 扫入；确认闪一下） | 所有按钮 | 原作是手柄操作无触屏按压反馈，触屏必须有按下/选中/确认可感知 |
| 原创补充：竖屏重排（天鹅绒牌卡 3×3、商店/背包行全宽、金额框置顶、主按钮在拇指区） | 360/390 竖屏 | 原作只有 16:9 横版，竖屏照搬会缩到看不清 |
| 原创补充：844×390 压缩说明文案、[状态│塔门] 并排、设施三列 | 手机横屏 | 用户硬要求一屏可操作 |
| 原创补充：浅色冷白水面舞台（外壳页） | 首页/据点/武库等外壳 | 原作暂停菜单为浅青水下；App 外壳页无原作对应，取暂停菜单底色延伸 |
| 原创补充：顶栏手绘字标 + 房间导航蓝条 | 顶栏/导航 | App 外壳原作无对应，取 P3R 标题字标构图与暂停菜单红白三角 |

## 第 3 轮定稿（2026-10-21 B-A 接续，未开浏览器，只用本地 `qa/compare-blue/ref/` 与 `web/downloads/p3r-ref/`）
- 据点 prep / prep-locked / prep-strata-locked：本地有 `select-terminal.jpg` + `facility-guide.jpg` → **近似**（两画面合一页；844×390 塔门排在数值前进首屏）。
- 幕间 interlude：`shortcut.jpg` → **近似**；回城 return：`select-map.jpg` → **近似**（无地图缩略图）。
- 设置 settings-sheet：`config.jpg` / `config-detail.jpg` → **近似**（保留抽屉形态）。
- velvet-preview、sheet / party-sheet / awaken-* / reshape：本地无同功能原作帧 → 维持 **待确认**；视觉定稿 = 冷白斜切卡（弹层）/ 薄荷青牌卡（预览），理由：沿用同页已 1:1 的元素，不引入原作没有的新母题。
- 原创补充定稿（不再留选择题）：上表「原创补充」5 条全部保留；新增 2 条：①窄屏页签只显示中文（英文副名在 ≥1024 宽屏才出现）——原作是 16:9 横版，竖屏放不下双语；②平板竖屏 NPC 卡 2 列、塔层卡单列——原作无此画面，按可读性定。

---
## 第二轮重排（p3r2，2026-10-21 13:3x）· 每屏一帧 P3R 实机参考 → 设计决定
本地帧：`qa/compare-blue/ref/`、`qa/compare-blue-b/ref/`。视频逐帧：本环境访问 YouTube 播放接口 403（yt-dlp 拉不到），**无法取 mm:ss 精确帧**；下表用媒体实机截图 URL（原 brief 允许），YouTube 只有官方缩略帧（hq1/hq2/hq3 = 视频约 25%/50%/75% 处）。补 mm:ss 需能播放视频的环境。

| 画面 | P3R 实机帧（URL） | 本地帧 | 由此推导的设计决定 |
|---|---|---|---|
| 首页 home | Game UI Database P3R 暂停菜单 https://gameuidatabase.com/gameData.php?id=1884 ；GamesRadar https://www.gamesradar.com/persona-3-reloads-ui-goes-hard-and-one-indie-dev-reckons-theyve-figured-out-why/ ；YouTube fXgKcM20M08 缩略帧 | pause-menu-full.jpg、yt-fXgKcM20M08.jpg | 人物占左半、水下蓝渐变（上深下浅 + 斜向光柱）；右侧「斜向阶梯大字列表」：超粗斜体、逐行右移、整体 −8°；选中项白字 + 红碎块；右上队伍头像竖排 → 我方状态条竖排在右 |
| 战斗 combat | Medium「Persona 3 Reload's battle UI is genius」https://medium.com/design-bootcamp/persona-3-reloads-battle-ui-is-genius-actually-5703a4b56221 | battle-ui.jpg | 指令在右下：斜排超粗斜体（PERSONA/ITEM/GUARD/ATTACK 逐行错位）→ 竖排斜向指令列表，放拇指区；队伍 HP/SP 卡在画面右侧竖排（青 HP、黄 SP 细条）；敌名左上红斜条 |
| Theurgy | TheGamer https://www.thegamer.com/persona-3-reload-p3r-theurgy-attacks-raise-meter/ | theurgy-ready.jpg | 主角卡下方细长 Theurgy 计量条（本 App 无 Theurgy 数值，见 wpB-A-requests） |
| HOLD UP | YouTube Battle Sequence Trailer https://www.youtube.com/watch?v=Z4VcLrPs1Y8 缩略帧 | yt-aoa-chance.jpg | 全屏：画面压暗包围倒地敌人、右下大蓝斜带 + 半透明巨字 CHANCE、ALL-OUT ATTACK / GO! / CANCEL 斜排，左上导航员头像对白框 |
| 结算 result | Reddit 实机照 https://www.reddit.com/r/persona3reload/comments/1icd22f/ | results-reddit.jpg | 海军蓝斜切面板、白色大数字 Lv、青色细 HP 条、红 `>` 箭头；无「剑图标」→ 去掉剑+WIN 实心块 |
| 天鹅绒 | RPG Site 官方 4K 截图 https://www.rpgsite.net/news/15253-persona-3-reload-screenshots-detail-aigis-ken-koromaru-shinjiro-velvet-room-town-activities （A-11/A-23）；YouTube Js7eeQhtDBY 缩略帧 | velvet-fusion-method.jpg、velvet-compendium.jpg、yt-Js7eeQhtDBY.jpg | 衬线标题横排 + 长白下划线；选项为斜置卡/细线列表；下拉框 = 黑底青签行列表风（非原生控件外观） |
| 地图 | Escapist https://www.escapistmagazine.com/tips-for-exploring-tartarus-in-persona-3-reload/ ；GameRant https://gamerant.com/persona-3-reload-atlus-ui-menu-design-good-rpg-feature/ | tartarus-floor1.jpg、map-gamerant.jpg | 地图满屏，操作件浮在角落、无不透明底板 |
