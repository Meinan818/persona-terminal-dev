# UMBRA 皮肤交接 · p3r-pink（粉 · P3R 精致度粉色版：哈姆子 + 提奥）

## 1. 已完成 & 位置
分支 `feat/umbra-skin-p3r-pink`：`7f2a517` ①素材+manifest → `04d27a3` ②tokens/labels/slots/templates/ui.css → `4930ee8` ③16 个 recipes+index.ts（立绘图集按来源拆两张）→ `82a6e4d` + `9aa350d` WIP 交接（handover/，含 locked/）。
- 皮肤包 `src/umbra/skins/p3r-pink/`：`assets/`（atlas.hamuko / atlas.portraits / atlas.hud + 帧表、mask.ribbon、cutin.hamuko、allout.finish.default、highlight.hamuko、bg.battle/hub/map.tile 及 *.darkhour、npc.theodore、fonts/）、`manifest.json`（38 条）、`tokens.json`、`labels.json`、`slots.json`、`templates.json`、`ui.css`、`recipes/`、`index.ts`。进度/待答 `docs/umbra-progress/p3r-pink.md`（13 条 + 生成人物自查）。
- 首包 530KB（图 493.6 / 数据 16.9 / ui.css 1.5 / 字体 18.0）；全屏图最大 101.8KB；每人立绘 26.8–42.6KB。lint 0 error / 7 warning。
- recipes：transition.battleStart（樱瓣剪影 maskWipe 旋入放大 → 缎带剪影横扫揭开）、transition.encounterBattle、action.default、action.agilao / action.cadenza（cut-in+召唤）、action.persona.default（通用召唤）、onemore、holdup、allout.default（白闪→樱瓣喷流→+0.21rad 斜置定格 finishCard 980ms + freezeFrame 760ms，总伤害牌白底玫红字）、highlight.hamuko（Theurgy 3.46s）/ .short 1.15s、unit.down、battle.end（无人脸：缎带 + RESULT + 缎带结）、env.darkHour.enter/leave、talk.start。召唤：举枪剪影入场 → +240ms（扣扳机前一帧）glassShatter 打碎举枪剪影本身，无面部特写。
- tokens：primary 樱玫红 #e64a84、secondary #fbe2ec、ink 莓紫墨 #3b1531、paper #fffdfc、accent 琥珀缎带 #ffb36b、hp #9be36b、sp #c79bff；slant **+0.21rad（与蓝相反）**；uiOpen 200ms outBack 回弹；指令区 P3R 斜列 6 格 主 96 / 次 86，cmd.4 与「更多」同行。labels：darkHour=DARK HOUR、more=更多、highlight=THEURGY、dive=攀登塔层、world=塔尔塔罗斯。交涉模板：粉白缎带斜带 + 樱瓣选项，静态 clip-path，无 svg/url。
- 字体：Barlow Condensed（OFL）display 12.6KB / number 5.4KB。

## 2. 素材来源
**official**：P3R 官方立绘 岳羽 / 顺平 / 真田（megatenwiki File:P3RE_Portrait_*.png，下载记录 `handover/p3r-pink/official-src/sources.json`，原图同目录）→ `atlas.portraits`。
**generated（P3R 无哈姆子、提奥官方图，已核实 Category:Persona 3 Reload Renders 与 Theodore 页）**：原图 `handover/p3r-pink/src-art/`，参考 `refs/`，锁定图 `locked/`。

### 2.1 哈姆子 已锁定设定（21:15 用户通过并锁定，禁改）
锁定图：`locked/d_fix.png`（首页菜单插画原图，绿幕）、`locked/menu-art-rise.webp`（上线版）、`locked/pink-home3.jpg`（蓝官方｜粉390｜粉1024 对照）。
- 发型：**深红/朱红短发，后脑短小马尾**，刘海斜分，一缕发丝可绕过眼角；左侧（画面右）**银色发夹，罗马数字「XXII」**（注意镜像/翻转后必须仍读作 XXII，曾出错读成 IXXI）。
- 眼：**红色眼睛**。
- 耳机：**红白双色头戴耳机**（白外壳 + 红耳罩圈），红色线缆垂到胸前；首页/Theurgy 戴在头上，其他图挂在脖子上。
- 服装（月光馆学园冬服，同 P3R 主角风格）：白衬衫、尖角领贴颈根、**大红色蝴蝶结领结**；黑色西装外套（领口细线）；左臂**红色 S.E.E.S. 臂章**；黑色百褶短裙；白色及膝长袜；棕色乐福鞋；腰挂银色 Evoker 枪套。
- 画风：P3R 官方立绘风格（细线、赛璐璐平涂、副岛脸），粉白肤色平涂；约 7 头身；**短颈、单一下颌线、颈部暗影、领口贴颈根**（被否过：长颈鹿脖子、双下巴）。
- 生成提示词（可复用）：「Persona 3 Reload official character render style (thin clean lineart, cel shading, Shigenori Soejima face). Female protagonist of Persona 3 Portable: short crimson-red hair with a small ponytail, silver hairclip shaped as roman numeral XXII, red eyes, red-and-white over-ear headphones, white shirt with big red bow tie, black Gekkoukan blazer, red S.E.E.S. armband on left arm, black pleated skirt, white knee socks, brown loafers. Normal neck length, single clean jawline. Plain #00FF00 background, no text.」+ 场景动作（见下）。参考：`refs/ref_hamuko.jpg`、`refs/ref-femc*.jpg`（P3P 官方）、`refs/ref_mc_full.jpg`（P3R 主角，比例/线宽基准）。
- 本阶段各图（同一设定）：
  - `pk_bust_a.png` 半身（→ atlas.hamuko head/body）
  - `pk_full_a.png` 全身：左手插腰、右手自然下垂
  - `pk_evoke_b.png` 举枪：Evoker 枪口**贴近但不抵**太阳穴（直接抵住被内容策略拒），闭眼，左臂外展
  - `pk_cutin_a.png` cut-in 眼部特写
  - `pk_finish_a.png` 总攻定格：右侧回眸持薙刀，左 2/3 樱瓣 + 缎带留白放总伤害
  - `pk_theurgy_a.png` Theurgy：前伸手 + 持枪，奥菲斯半透明；原背景蓝 → 脚本转玫红
  - 自查：所有手五指、关节方向正常。
- 另附早期 P3R 画风女主稿 `src-art/femc-p3r-bust-1.png`、`femc-p3r-render-1.png`、首页初稿 `menu-art-pink-gen2.png`（已被 d_fix 取代，仅供参考）。

### 2.2 提奥多亚（Theodore）已定设定
图：`src-art/theo-p3r-gen.png`（原图）、`locked/velvet-host.webp`（上线版）、皮肤内 `npc.theodore.webp`（延迟包）。
- 银白短发，侧分向后；金色眼睛；俊秀细长脸。
- 紫色天鹅绒侍者制服：**紫色小圆筒帽（帽徽 V 字）**、深紫外套带浅紫竖条纹拼接、胸前两排黑色圆形大纽扣、黑色立领衬衫 + 紫领带、袖口黑色金属扣带；**白手套**（右手抚胸）；左手夹棕色皮面书（Compendium）；紫色竖条纹长裤；黑皮鞋。全身站姿。
- 提示词（可复用）：「Theodore from Persona 3 Portable, full body, drawn in Persona 3 Reload official render style (thin lines, cel shading, Soejima face). Silver-white hair, golden eyes, purple Velvet Room bellhop uniform with small pillbox hat, dark purple jacket with lighter purple stripes and large black round buttons, black shirt and purple tie, white gloves, right hand on chest, holding a brown leather book, striped purple trousers, black shoes. #00FF00 background, no text.」参考：`refs/ref-theo.jpg` / `ref_theo.jpg`（P3P 官方提奥）+ `refs/ref-eliz-render.jpg`（P3RE Elizabeth 官方，画风基准）。上线版去描边、制服略调莓紫以融入粉色电梯厢。

### 2.3 其他 generated
- `pk_bg_battle.png` / `pk_bg_hub.png` / `pk_bg_map.png`：塔尔塔罗斯战斗场 / 据点 / 地图底，P3R 画风、粉莓色调、无人物。背景中段 1290 原图 + 两侧镜像补到 2240；darkhour 版为脚本预烘焙（压暗 + 绿阴影 + 残留玫红高光）。
- 程序绘制（非 AI）：`atlas.hud`（粒子/光标/樱瓣遮罩）、`mask.ribbon`（缎带剪影），记 generated + note。
- 重建：`handover/p3r-pink/scripts/build_assets.py`（素材 + assets.json；manifest 需按 build_recipes 段重写）、`build_recipes.py`。

## 3. 原作关键参考与风格要点
全文：`handover/p3r-pink/docs/UI-REF-pink.md`、`UI-REF-pink-b.md`、`pink-p3r-review.md`、`pink-screens.md`、`hamuko-ASSETS.md`。
- 定调（用户 13:11/13:36）：**版式、质感、动效按 P3R；P3P 只留粉色、提奥多亚、女主线身份**；禁 P3P 老图；粉不是蓝的换色。
- 视频：https://www.youtube.com/watch?v=Z4VcLrPs1Y8 、https://www.youtube.com/watch?v=Js7eeQhtDBY（天鹅绒，时间点待确认）
- 截图：RPG Site 官方 4K https://www.rpgsite.net/news/15253 ；Game UI Database https://gameuidatabase.com/gameData.php?id=1884 ；开发访谈「水中沉下去的心之海」https://www.famitsu.com/news/202311/29325647.html ；P3R UI 复刻分析 https://ultipuk.xyz/blog/recreation-of-persona-3-reload-ui/ 、https://www.mariellepalatino.com/p3r
- P3R UI 纹理（月/塔/云/天鹅绒花纹/樱）：skowt.cc https://skowt.cc/games/persona-3-reload/ui
**风格要点**
- P3R 的斜切刀片、细线、玻璃反光、水下光束，换为樱玫红 / 莓紫墨 / 琥珀缎带体系；斜角 +0.21rad 与蓝反向。
- 粉皮自有母题：樱瓣、缎带、缎带结（转场 maskWipe、总攻樱瓣喷流、结算缎带结）；菜单入场带回弹，比蓝更轻快。
- 天鹅绒 = P3R 上升电梯厢 + 衬线标题 + 白发丝下划线 + 细线菜单，提奥站厢内右侧出血渐隐，不做卡片。
- 人物大立绘出血斜放、去 3–4px 外缘描边；HOLD UP 无立绘；结算无人脸。

## 4. 未做 / 卡住 / 已知问题
- 13 条待答见进度文件。粉皮影时间仍为 P3 绿黑调（是否改粉/血月待定）；立绘图集拆两张（任务书要求 1 张）；技能 id 大小写（规则 `Agilao`，recipe 用小写）；`--umbra-scale` 变量、`"kind":"$hit"` 写法待引擎确认。
- 耳机佩戴不统一：Theurgy 戴头上，其余挂颈。
- 生成图无种子；本阶段 pk_* 原始提示词逐字稿未落盘（上为按锁定设定整理的版本，首页/提奥提示词要点有原始记录，见 hamuko-ASSETS.md 末节）。

## 5. 本地独有 → 已提交
`handover/p3r-pink/`：`locked/`（锁定首页图、提奥上线版、对照图）、`src-art/`（pk_* 9 张 + 提奥 + 早期女主稿）、`refs/`、`official-src/`（3 张官方原图 + sources.json）、`scripts/`、`docs/`、`tools/skin-lint.mjs`。
## 通用说明（三皮相同）
- 基线：`feat/theme-kit-integration@dc460f6`；皮肤分支只改 `src/umbra/skins/<id>/`、`docs/umbra-progress/<id>.md`，交接时另加 `handover/<id>/`（本地原图/参考图/脚本/文档）。
- `handover/<id>/tools/skin-lint.mjs`：本地静态校验（预算、坐标、轨道数、hitMarks、白名单），非官方 `skin:check`。用法 `node skin-lint.mjs src/umbra/skins/<id>`。
- **生成图无种子**：所用 generate_image 不暴露 seed，结果不可逐像素复现；以下“提示词”是按当时要点整理的可复用版本（本阶段原始提示词逐字稿未落盘，这是已知缺口），配合 `handover/<id>/refs/` 参考图与 `src-art/` 原图使用。
- 三皮共同未决（契约问题，见各进度文件）：hud.system 256×66 放不下 3 个 ≥86 命中区（现下溢到 y110）；背景 2240 宽 > 2048 纹理上限；规则侧 skill/unit/指令 id 映射表；简短版必杀靠 id 后缀 `.short`；hitMarks 数=payload.hits.length 与静态 recipe 冲突；scene:enter 无 sceneId、env:change 无“日期变了”条件、bakedSwap 只能写死 bgId；召唤图需 `$actorPersona`；交涉 styleId 白名单；图集帧在 manifest 的写法；合成图/程序绘制图的 source 归类；`index.ts` 引用 `../../engine`、`../_contract` 尚不存在→类型检查必报错。
- 未做（按开工令待通知）：引擎截图、`skin:check`/`skin:timing`、实测时长、DONE.md。
