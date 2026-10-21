# UI-REF-p4r · 黄皮 P4R 重做参考帧（umbra-y-p4r2，2026-10-21 14:05 CST）
帧存 `qa/ref-p4r/`（不进交付包）。时间点：截图类无视频时间点标「截图」。

| 帧 | 画面 | 来源 URL | 时间点 |
|---|---|---|---|
| 01-item-paper.jpg | P4R 道具菜单：亮黄底 + 白纸/笔记本纸叠层（斜放）+ 黑胶囊数量 + 手写体「Info」便签条 + 3D 立体字「ITEM」 | 中文演示 snapshot，Reddit https://www.reddit.com/r/persona4golden/comments/1usi6tb/ | 截图 |
| 02-mainmenu-velvetpeek.jpg | P4R 主菜单：亮黄底 + 白/黄雏菊 + 蓝天云 + 深紫斜带 + 斜排衬线菜单词（Skills/Items/Equip/Personas/Stats/Request/Social Links/Calendar/System），右侧小 Q 版头像列 | https://www.reddit.com/r/persona4revival/comments/1u9msse/ | 截图 |
| 03-skill-cyan.jpg | P4R 技能页：天蓝/青底 + 巨型浅黄衬线「Skill」+ 左上白卡 LEADER/PARTY（斜切、PLV 黄角标、HP 绿条/SP 蓝条）+ 「NONE」深青方框 | 同 01 | 截图 |
| 04-status.jpg | P4R 状态页：黄/橙光带 + 巨型「Status」水印 + 白色剪影 + 人物单色出血 + LEADER/PARTY 白卡 | 同 01 | 截图 |
| 05-equip.jpg | P4R 装备页：黄底 + 白斜卡 LEADER/PARTY + 小号斜签 WEAPON/PROTECTOR/ACCESSORY/CLOTHES + 巨型「Equip」 | 同 01 | 截图 |
| 06-battle-hud.jpg | P4R 战斗：3D 场景 + 黄色漫画斜框 + 右下黄色旋钮指令（PERSONA/ATTACK/GUARD/ITEM/ASSIST 斜排标签）+ 底部队伍小头像 HP 绿/SP 蓝 + 左上红黑斜签技能名 | 早轮下载（compare-yellow-b/ref/p4r-combat-2.jpg），原 URL 未登记；同类画面见官方 Combat & TV World Overview https://www.youtube.com/watch?v=dZk3sBEWsoc | 截图 |
| 07-battle-skill.jpg | P4R 战斗技能选单：黄色覆盖 + 黑色斜行（属性图标+技能名）+ 绿/黄 SP 胶囊 + 「INFO」深色斜框 + PRIME TIME 星 | 同 06 | 截图 |
| 08-p4g-result.png | P4G Result：亮黄底 + 黑色粗斜体 EXP/MONEY/ITEM 标签 + 橙色斜体数字 + 巨型黑「Result」+ 单色线稿主角 | https://www.reddit.com/r/persona4golden/comments/10r5r34/ | 截图 |
| 09-yt-dZk3sBEWsoc.jpg | 官方 Combat and the TV World Overview 缩略图 | https://www.youtube.com/watch?v=dZk3sBEWsoc（GameTrailers，2026-07-15） | 缩略图 |

## 提炼（以帧为准）
- 主底：亮黄 #ffe10a–#ffd200，叠浅黄斜光带；技能/Persona 用天蓝 #3fd0f0–#7fe6ff。
- 卡片：白/米白纸片，轻微倾斜（-3°～-6°），细投影；数量用黑胶囊。
- 字：巨型浅色衬线水印（Skill/Equip/Status，压在底上，低对比）；菜单词黑/白粗衬线斜体；标签小号黑斜切签。
- 状态条：HP 绿 #6fe04a、SP 天蓝 #39b8ff，细条，白卡内。
- 暗色只出现在：战斗 3D 场景、天鹅绒、P4R 技能行（黑斜行）与 INFO 框。
- 人物：菜单里是单色出血半身或小 Q 版头像列；不在主菜单放全身大立绘。

## P4R 首页（Camp 暂停菜单）风格要点 · 18:05 用户定稿，实现逐条对照（umbra-p4r-home，2026-10-21）
参考帧：`qa/ref-p4r/02-mainmenu-velvetpeek.jpg`；官方菜单人物图 `pkcache-umbra/p4r-home-src/gr-menu.jpg`（Atlus 官方图，GamesRadar 2026-07-10 文首图 https://cdn.mos.cms.futurecdn.net/MKpbryjMFUYR3wYiKjTRPR.jpg ）。
1. **主场亮黄**（#ffe100→#ffc400 向右下转橙黄），叠一条**蓝天白云斜带**（约 -20°，硬边，边缘细白线），**雏菊花**：6 瓣圆头花，大白花（红/绿错位描边）左下、大黄花压在外套切边、小黑花右下、零星飘落黄花瓣。
2. **人物 = 2D 动画风插画**（P4R 官方菜单立绘：鸣上悠推眼镜，强烈明暗、暖黄光、深棕阴影），不是 3D 渲染、不是灰度/双色调；**大尺寸占左半屏、斜向出血**（头顶/左/下出画），外套甩出的深色剪影伸向菜单区——菜单字压在外套上。
3. **菜单 = 大小错落的衬线大字沿斜线阶梯排列**：上小下大、自左上向右下逐级右移，角度从约 -22° 渐变到 -12°；黄字/黑描影，选中项**放大 + 白色发光 + 白字**（原作 Stats 白色发光叠字）。中文衬线粗体 + 小号英文副标。
4. **电视质感点缀**：极淡扫描线 / 雪花噪点，只做质感不抢主体。
5. **无方框、无白卡**：信息只有**右侧竖排小头像 + HP/SP 细条**、**右下 ✦ 提示胶囊 + Ⓐ决定 Ⓑ返回**、**左下小字（原作金钱位）**。

## p4r-screens · 官方 press kit 帧（2026-10-21 19:10 CST 起，umbra-p4r-screens）
来源页：SEGA press kit「New Persona 4 Revival Details in XBOX Wire Blog Post + New Screenshots」https://sega.prezly.com/new-persona-4-revival-details-in-xbox-wire-blog-post-new-screenshots 。帧存 `qa/ref-p4r/pk/`（1920×1080 原图，不进交付包）。
| 帧 | 画面 | 原图 URL |
|---|---|---|
| pk/1more.jpg（**战斗主参考**） | 战斗：3D 场景 + 黄绿漫画框边 + 橙→黄斜带横贯右下 + 右下黄旋钮（深蓝环）+ 环外斜排衬线粗斜体 PERSONA/ATTACK/GUARD/ITEM/ASSIST（深蓝字白描边，约 -12°）+ 左上红黑斜签敌名 + 底部队伍小头像 HP 绿/SP 蓝 + 巨型「1 MORE」 | https://cdn.assets.prezly.com/ba4fb719-d7bb-4cdf-82e2-a1b561bbb29a/-/preview/-/format/auto/P4R_1More_Screen.jpg |
| pk/prime1.jpg | 战斗 4 MORE：同指令旋钮，黄绿舞台 | https://cdn.assets.prezly.com/38ad6572-7a83-407f-b2c0-d497bac6f863/-/preview/-/format/auto/P4R_Prime%20Time1_Screen.jpg |
| pk/battle.jpg / battle2.jpg | 战斗演出（Persona 召唤、巨幅立绘屏），无指令 UI | https://cdn.assets.prezly.com/83de8a7e-7183-4f2d-89ec-1979c6c9f0eb/-/preview/-/format/auto/P4R_Battle_Screen.jpg ；https://cdn.assets.prezly.com/49d4dd6e-4446-40d7-8e2d-bf8f6abcdd42/-/preview/-/format/auto/P4R_Battle2_Screen.jpg |
| pk/guard.jpg（**地图 HUD 参考**） | 迷宫：左下黄色斜签楼层名「Yukiko's Castle 3F」+ 左侧灰底小地图（白走廊、绿箭头）+ 右侧竖排小头像 + 绿 HP 竖条 + 右上黄日期/任务签 | https://cdn.assets.prezly.com/5fdfb473-f116-4122-8e8c-16dbfe113844/-/preview/-/format/auto/P4R_Guard_Screen.jpg |
| pk/advantage.jpg、enemy1more.jpg、knockdown.jpg、baton.jpg | 战斗演出字（ADVANTAGE / 敌方 1 MORE 红黑 / BATON 衬线巨字） | 同页，见 press kit 列表 |

## 结算 + 天鹅绒 参考帧（umbra-p4r-velvet，2026-10-21 19:40 CST）· 全部 SEGA/ATLUS 官方 press kit 1920×1080
来源页：https://sega.prezly.com/new-persona-4-revival-details-in-xbox-wire-blog-post-new-screenshots （76 张；无专门「战斗结算」图，结算取官方升级/数值版式）
| 帧 | 画面 | 原图 URL |
|---|---|---|
| 10-velvet-menu.jpg | 天鹅绒豪车：蓝丝绒车厢 + 左侧 4 块雕花牌匾菜单（斜放错落，选中黄绿、其余蓝底双线框，大衬线英文 + 小副标）+ 右下紫色大衬线「VELVET ROOM / What do you desire?」 | https://cdn.assets.prezly.com/cc3e4dd7-576d-4aad-a471-9a8a3420cd09/P4R_Persona%20Fusion2_Screen.jpg |
| 11-velvet-igor.jpg | 车厢 + 左下伊戈尔 2D 对话立绘（黄黑斜框 cut-in，原色）| https://cdn.assets.prezly.com/4148e3bf-5502-4048-8d98-419d52a5c8aa/P4R_Persona%20Fusion%201_Screen.jpg |
| 12-persona-status-exp.jpg | Persona 数值页：「Result」菱形标 + 巨型斜体数字 Lv16 / EXP 5,356 + St/Ma/En 阶梯右移 | https://cdn.assets.prezly.com/020db32b-018c-4a95-87e7-557ea2a226f6/P4R_Persona%20Fusion3_Screen.jpg |
| 13-strengthen-lv.jpg | 强化 Persona 等级数字 | https://cdn.assets.prezly.com/011cc50b-6c0d-4600-87da-10c2f9bac959/P4R_Strengthen%20Your%20Persona4_Screen.jpg |
| 14-rankup-yellow.jpg | 社群升级：黄调、衬线 RANK 大字、黑胶囊图标行（NEW ABILITY） | https://cdn.assets.prezly.com/6668d876-5234-46ea-95cc-40fd0d45fb63/P4R_Daily%20Life2_Screen.jpg |
| 15-velvet-fusion-list.jpg | 融合列表（蓝车厢内深色斜行） | https://cdn.assets.prezly.com/d00778cc-4d9d-4528-9f65-e49185a7a18b/P4R_Strengthen%20Your%20Persona3_Screen.jpg |
提炼：结算＝黄底 + 黑色斜条承载超大斜体衬线数字、阶梯右移、菱形标；天鹅绒＝蓝丝绒钉扣纹 + 雕花牌匾竖排（选中黄绿放大）+ 右下紫色描边衬线标题 + 人物原色。
