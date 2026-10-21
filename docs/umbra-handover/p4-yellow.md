# UMBRA 皮肤交接 · p4-yellow（黄 · P4R + P4G）

## 1. 已完成 & 位置
分支 `feat/umbra-skin-p4-yellow`：`fffa16c` ①素材+manifest → `8a1e418` ②tokens/labels/slots/templates/ui.css → `aa6a16d` ③16 个 recipes+index.ts → `43cff77` WIP 交接（handover/）。
- 皮肤包 `src/umbra/skins/p4-yellow/`：`assets/`（9 webp + atlas-hud/atlas-portraits 帧表 json + fonts/）、`manifest.json`（46 条）、`tokens.json`、`labels.json`（52 条）、`slots.json`、`templates.json`、`ui.css`、`recipes/*.json`、`index.ts`。
- 进度/待答：`docs/umbra-progress/p4-yellow.md`（Q1–Q9）。
- 首包 695.4KiB（图 622.5 / 数据 17.7 / ui.css 1.1 / 字体 54.2），上限 964。lint 0 error / 6 warning。
- recipes：transition.battleStart（tvStatic+blockPush 0.88s）、transition.encounterBattle（合流 1.15s）、action.default 0.96s、action.ziodyne 1.6s、action.brave-blade 1.5s（含 cut-in）、onemore 0.43s、holdup 0.94s、allout.default 3.4s（黄底漫画四格 finishCard + freezeFrame 0.76s）、highlight.hero 3.3s / .short 1.18s、unit.down 0.48s、battle.end 1.4s（无人脸）、scene.enter/leave.world（dateFlip 取 `$env`）、env.date.flip（`$prev`→`$env`）、talk.start。
- tokens 色：primary #FFE200、ink #111111、paper #FFFBE6、accent #FF7A00、hp #9BE03C、sp #F05DA8、crit #E8352B。指令区方块排布 5 项+更多，主 120、次 ≥92，卡片式队伍栏。labels：darkHour=午夜电视、more=更多、dive=电视世界、highlight=必杀。
- 字体：display Noto Serif SC Black 子集 50.5KB，number Bebas Neue 子集 3.6KB（均 OFL），正文系统字体。

## 2. 素材来源
**official（5 文件，Megami Tensei Wiki 官方渲染；逐张来源页见集成仓库 `public/umbra-demo/assets/p4/ASSETS.md`）**
- `atlas-portraits.webp`：P4_Protagonist / Yosuke_Hanamura / Chie_Satonaka / Yukiko_Amagi，高 640，每人 body+head 两层。原裁切 `handover/p4-yellow/src-art/por-*.png`。
- `cutin-hero.webp`：P4_Protagonist 渲染裁眼部 + 程序绘制黄底速度条/网点。
- `allout-finish.webp`：黄/白底黑集中线漫画四格，人物为官方渲染（Yutransparent=P4U 鸣上悠、花村、千枝、雪子），格框/网点程序绘制。
- `highlight-hero.webp`（延迟包）：IzanagiP4Full + Yutransparent 合成，黄底集中线程序绘制。
- `enemy-calm-pesce.webp`（延迟包）：File:Calm_Pesce.png。
**generated（4 文件）**
- `bg-battle.webp`：电视世界摄影棚黄雾战斗场。提示词要点：「Persona 4 Golden TV World battle arena, studio floor with black-and-red target grid, thick yellow fog, distant stage lights and spotlights, no characters, no text, anime game background, wide」；参考 `refs/tv-world-src.png`（如有）、`refs/c1–c6.jpg`。放大至 2240 宽含出血。原图 `src-art/gen-bg-battle-wide.png`。
- `bg-map.webp`：「Yukiko's Castle 风电视世界迷宫走廊，红地毯、和风城郭墙、黄雾，无人物无文字」。原图 `src-art/gen-bg-map-wide.png`。
- `bg-hub.webp`：「稻羽市商店街（Inaba shopping district）白天，乡镇老街、卷帘门、电线杆，P4G 画风，无人物」；参考 `refs/town-day-wide-src.png`。原图 `src-art/gen-bg-hub-wide.png`。
- `atlas-hud.webp`：**程序绘制**（非 AI），`handover/p4-yellow/scripts/build_assets.py` 生成。
- 重建：`scripts/build_assets.py` → `build_manifest.py` → `build_recipes.py`；`fontchars.json` 为字体子集字表；`assets_report.json` 为体积报表。

## 3. 原作关键参考与风格要点
参考清单全文：`handover/p4-yellow/docs/UI-REF-p4r.md`、`UI-REF-yellow.md`、`UI-REF-yellow-b.md`。
- SEGA P4R press kit（战斗主参考 1MORE、Prime Time、Guard 迷宫 HUD 等 1920×1080）：https://sega.prezly.com/new-persona-4-revival-details-in-xbox-wire-blog-post-new-screenshots
  - 1MORE：https://cdn.assets.prezly.com/ba4fb719-d7bb-4cdf-82e2-a1b561bbb29a/-/preview/-/format/auto/P4R_1More_Screen.jpg
  - 迷宫 HUD：https://cdn.assets.prezly.com/5fdfb473-f116-4122-8e8c-16dbfe113844/-/preview/-/format/auto/P4R_Guard_Screen.jpg
- 官方视频 Combat and the TV World Overview：https://www.youtube.com/watch?v=dZk3sBEWsoc（缩略图帧；具体时间点未登记）
- P4R 菜单：Reddit https://www.reddit.com/r/persona4golden/comments/1usi6tb/（道具/技能/状态/装备截图）、https://www.reddit.com/r/persona4revival/comments/1u9msse/（主菜单）、GamesRadar 菜单图 https://cdn.mos.cms.futurecdn.net/MKpbryjMFUYR3wYiKjTRPR.jpg
- P4G 结算：https://www.reddit.com/r/persona4golden/comments/10r5r34/
**风格要点**
- 亮黄主场 #ffe10a–#ffd200 转橙黄；技能/Persona 页天蓝 #3fd0f0–#7fe6ff；暗色只在 3D 战斗场景、天鹅绒、技能黑斜行。
- 战斗指令：右下黄旋钮（深蓝环）+ 环外斜排衬线粗斜体 PERSONA/ATTACK/GUARD/ITEM/ASSIST（深蓝字白描边约 −12°）；左上红黑斜签敌名；底部小头像 HP 绿/SP 蓝；巨型「1 MORE」。
- 白/米白纸片卡斜放 −3°～−6°，黑胶囊数量，巨型浅色衬线水印（Skill/Equip/Status）。
- 电视质感：雪花/扫描线只做质感；转场 tvStatic + blockPush；总攻黄底黑集中线漫画格。
- 人物：菜单单色出血半身或 Q 版头像列；结算不放人脸。首页定稿（鸣上悠推眼镜、雏菊、蓝天斜带、阶梯斜排衬线菜单）见 UI-REF-p4r.md「P4R 首页」节。

## 4. 未做 / 卡住 / 已知问题
- Q1–Q9 见 `docs/umbra-progress/p4-yellow.md`；Q9 推送已解决（交接时已推）。
- 背景 2240×950 / 2240×897 单图超 2048。
- 合成图标 official 是否合适待定；生成背景原始提示词逐字稿未保存（上为整理版）。

## 5. 本地独有 → 已提交
`handover/p4-yellow/`：`scripts/`（build_assets/manifest/recipes.py、fontchars.json、assets_report.json）、`src-art/`（3 张生成背景原图、4 张官方立绘裁切）、`refs/`（c1–c6 参考帧等）、`docs/`（UI-REF 三份、断点 status.md）、`tools/skin-lint.mjs`。
## 通用说明（三皮相同）
- 基线：`feat/theme-kit-integration@dc460f6`；皮肤分支只改 `src/umbra/skins/<id>/`、`docs/umbra-progress/<id>.md`，交接时另加 `handover/<id>/`（本地原图/参考图/脚本/文档）。
- `handover/<id>/tools/skin-lint.mjs`：本地静态校验（预算、坐标、轨道数、hitMarks、白名单），非官方 `skin:check`。用法 `node skin-lint.mjs src/umbra/skins/<id>`。
- **生成图无种子**：所用 generate_image 不暴露 seed，结果不可逐像素复现；以下“提示词”是按当时要点整理的可复用版本（本阶段原始提示词逐字稿未落盘，这是已知缺口），配合 `handover/<id>/refs/` 参考图与 `src-art/` 原图使用。
- 三皮共同未决（契约问题，见各进度文件）：hud.system 256×66 放不下 3 个 ≥86 命中区（现下溢到 y110）；背景 2240 宽 > 2048 纹理上限；规则侧 skill/unit/指令 id 映射表；简短版必杀靠 id 后缀 `.short`；hitMarks 数=payload.hits.length 与静态 recipe 冲突；scene:enter 无 sceneId、env:change 无“日期变了”条件、bakedSwap 只能写死 bgId；召唤图需 `$actorPersona`；交涉 styleId 白名单；图集帧在 manifest 的写法；合成图/程序绘制图的 source 归类；`index.ts` 引用 `../../engine`、`../_contract` 尚不存在→类型检查必报错。
- 未做（按开工令待通知）：引擎截图、`skin:check`/`skin:timing`、实测时长、DONE.md。
