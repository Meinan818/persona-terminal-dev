# UI-REF · 黄皮 Y-B（塔内 / 战斗 / 演出）原作对照表

原则（用户 07:18/07:21）：每个界面 1:1 复刻原作截图；找不到截图的写「待确认」，不凭空设计。横屏/桌面/平板横屏按原作 16:9 版式；手机竖屏把同一套元素重排为竖向（指令在拇指区），字号 ≥12、按钮 ≥44。
参考图本地副本（仅 QA 对照，不进交付）：`work/umbra/qa/compare-yellow-b/ref/`。对照图：`work/umbra/qa/compare-yellow-b/*.jpg`。

| 界面（INVENTORY id） | 原作画面 | 来源 URL | 布局 / 配色 / 字体 / 框线 / 光标 / 转场要点 | 状态 |
|---|---|---|---|---|
| 战斗外框（combat 全部） | P4R 战斗：整屏套电视圆角框 | https://gamermatters.com/whats-new-in-persona-4-revival-new-gameplay-changes-revealed/ （combat-changes-2.jpg） | 圆角矩形框，外圈粗黄 + 内侧细绿、细粉线；框外深色；静态 | 1:1（静态框，颜色取图） |
| 战斗指令（combat / combat-low-sp） | P4R 右下黄色旋钮：PERSONA 上、ATTACK 左、GUARD 右、ITEM 右下、ASSIST 下，旋钮指针指向选中项 | 同上 combat-changes-2.jpg | 黄色圆钮 + 深色指针居中，指令名为白色粗斜体黑描边、围绕旋钮排布；选中项=指针指向 + 字变黄 | 近似（我方指令数 4–7 个、名称为中文；位置按 上/左/右/左下/右下/下 排） |
| 战斗指令（P4G 版，参考） | P4G 左下黄色大圆盘竖排指令，选中=深灰横条白字 | https://github.com/Reloaded-Project/Reloaded-II/issues/63 （p4g-battle-gh1.png） | 黄盘黑字大写居中；选中深灰条 | 仅参考（黄皮按 P4R 旋钮） |
| 帮助栏（command-detail 说明行） | P4G 底部红色帮助条白字「Tactics: Give instructions…」 | 同上 p4g-battle-gh1.png | 全宽红底白字 | 预留：技能说明栏由 umbra-skill-info 按原作做，Y-B 不出样式 |
| 我方 HUD（player-hud / party-rail） | P4R 底部中右：小圆头像 + HP 绿条 / SP 蓝条 + 白色斜体数字，当前行动者放大并带「COMMAND」弧形字 | combat-changes-2.jpg、combat-changes-4.jpg | HP 绿 #6be04a、SP 蓝 #3aa0ff 细条连续（非分格）；数字白粗斜体；当前者黄圆底 | 近似（无官方头像，用黄圆+首字） |
| 技能列表（command-detail .skill-list） | P4R 技能菜单：黄底，左侧黑色圆角条（属性图标 + 名称），右侧深色胶囊显示消耗（绿=SP / 蓝=HP），选中条绿色描边 | combat-changes-6.jpg、https://www.reddit.com/r/PERSoNA/comments/1tzxghv/ | 黑条白字、消耗胶囊；选中=绿描边 | 1:1（布局随 DOM：图标·名·消耗）；INFO 栏归 umbra-skill-info |
| 技能名条（banner） | P4R 左上黑色胶囊白字「Secret Bambino」，倾斜，下沿黄/红边 | combat-changes-2.jpg、combat-changes-4.jpg | 黑胶囊、-6° 倾斜、白字、下缘黄线+红线 | 1:1 |
| 导航员台词（battle-log） | P4R 右上：深色半透明条白字 + 导航员绿色圆角头像 | combat-changes-1.jpg、combat-changes-2.jpg | 深色半透明、白字、右侧绿方块头像框 | 近似（头像位为空绿框，可 official/navi.png 覆盖） |
| 1 MORE（fx-stagger / fx-one-more） | P4R「1 MORE」黑色超粗斜体大字黄描边，压在斜向黄色宽带上，带星形闪光 | combat-changes-2.jpg | 黑字黄边、黄斜带（约 -20°）、闪光 | 1:1 |
| 命中字（hit-fx / fx-hit / fx-critical） | P4R「NICE HIT!」右下黑色粗斜体大字黄边 + 黄斜带 | combat-changes-4.jpg | 同 1 MORE 字体处理 | 1:1 |
| 总攻击（fx-allout） | P4G 总攻击：灰白烟尘团中浮出骷髅形烟、角色血条列右侧；P4R 结尾 FINISH 帧 | 本地帧 `qa/compare-yellow-b/ref/p4g-allout-skull-yt.jpg`（P4G 视频截帧）、`ref/p4r-allout-finish-yt.jpg`；对照图 `qa/compare-yellow-b/allout.jpg`、`allout-finish.jpg` | 现：卡通白云尘团+星+集中线+ALL-OUT ATTACK 条+FINISH/伤害 | 近似（2026-10-21 12:40 同步）：参考帧已找到，构图/母题（尘团+集中线）一致；原作是半透明灰烟+骷髅形，现为不透明卡通云，未 1:1，待 Y-B 下一轮改烟团质感（不阻塞游玩） |
| 觉醒 cut-in（fx-showtime） | P4R 主角特写斜切面板 + 「THE WILD CARD」字带、彩虹线 | combat-changes-3.jpg | 斜切黄黑面板、横向字带 | 近似（眼部横条为替代图） |
| 结算（battle-victory / fx-result） | P4G Result：全屏黄底，左列 EXP / MONEY / ITEM 黑标题+图标块，红色斜体数字，左下巨大黑字「Result」，右侧主角线稿与斜光线 | https://www.reddit.com/r/persona4golden/comments/1uolgub/ 、https://www.reddit.com/r/persona4golden/comments/ipi3u0/ | 黄底、黑标题、红斜体数字、左下 Result | 近似（DOM 为 回合/HP/SP；文案不同） |
| Shuffle Time | P4G 洗牌选卡 | 待确认（未找到截图） | — | 待确认（已从 result 演出移除自创卡牌） |
| 地图（map / map-pending-*） | P4R 迷宫小地图：左侧深灰半透明圆角面板，浅灰走廊块，青绿点状足迹，红白箭头=玩家；左下黄色胶囊楼层名「Yukiko's Castle 3F」 | combat-changes-1.jpg | 深灰半透明、浅灰房间块、青绿足迹、黄胶囊楼层名 | 近似（5×5 格；状态角标沿用骨架钩子） |
| HOLD UP（holdup） | P4G「総攻撃」确认：左上黄黑粗斜带 + 同伴胸像，深色半透明台词框白字，下方整条黄色选项条黑字 | https://www.youtube.com/watch?v=vJF5KvWnrzU（缩略图 ≈25%/50%），本地帧 `qa/compare-yellow-b/ref/p4g-allout-prompt-yt.jpg`；对照 `qa/compare-yellow-b/holdup.jpg` | 黄黑斜带 + 剪影胸像 + 深色台词框 + 黄色选项条；手机竖屏叠底部拇指区（骨架 v1.11），平板/桌面叠右栏 | 1:1（umbra-y-b3 定版，2026-10-21 12:40 复核 360/390/1024 位置正确） |
| 战斗内交涉（negotiation） | 待确认 | — | — | 待确认 |
| 转场（sweep / encounter） | P4R 彩虹弹出 / 电视开关机（文字描述，P4R-REFERENCE #4） | denfaminicogamer 2026-06-08（P4R-REFERENCE.md） | 无截图帧 | 原创补充（P4R 官方文字描述，无帧）：理由=转场是 P4R 宣传重点，按描述做且 ≤450ms 可跳过 |
| VS / READY-ACTION / 红雾（P4U） | P4U 包装 | 待确认（未找到截图） | — | 原创补充：理由=给 BOSS 战/开战一个明确的节奏点，均为平移+淡入、可跳过、低动效改静态 |
| 教室投影开屏（boot） | P4R 标题（文字描述 P4R-REFERENCE #6） | 待确认 | — | 原创补充（按官方描述）：理由=会话首次进入的仪式感，≤1000ms 可跳过 |
| 塔层页 ×15 / 显形 / 影子交涉 / AI LAB | 原作无对应界面 | — | 用 P4R 对话框母题（黄底名牌 + 深色对话框，p4r-screen25.jpg https://gamingtrend.com/previews/persona-4-revival-brings-inaba-back-to-life/） | 近似 |

## 原创补充清单（PKG_RULES §9：底子是原作，补充需提升体验、风格一致、不替换标志元素、防晕）
- 地图未探索格：灰色小地图上叠一层极淡雪花静帧 —— 理由：让「迷雾」在 2D 格上可读（原作小地图未探索区直接不显示）。
- 地图可移动格黄黑斜条描边、威胁格红内框、NO SIGNAL/LIVE 角标 —— 理由：P5T 式格子玩法需要可移动/威胁提示，用 P4 黄黑与电视词汇保持风格。
- 按下框内雪花 120ms / 选中扫描线 180ms —— 理由：P4R「每次选择都有电视信号反馈」（官方描述），只在按钮框内。
- 战斗顶栏「● LIVE」与 P-1 下三分之一字幕 —— 理由：P4U 直播包装，提示楼层/回合，静态。
- 环境层底部黄雾慢漂（24s）—— 理由：P4 TV 世界雾，唯一常驻动画，战斗/演出时暂停。

## 视频帧（PKG_RULES §8 优先实机视频帧）
当前来源为媒体评测/新闻截图（P4R 宣传素材与 P4G 玩家实拍）。实机视频帧（B站/YouTube + 时间点）待补：沙箱内无法逐帧截取视频，`analyze_video` 只给字幕。接手者如能取帧，请按上表界面补「链接 + 时间点」。


## umbra-y-p4r（2026-10-21）战斗 / HOLD UP / 结算改版：见 UI-REF-yellow.md「P4R-2026」表（左侧指令竖列、底栏队伍条、HOLD UP 全场景包围、Result 结算），来源与时间点同表。
