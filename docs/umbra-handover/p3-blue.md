# UMBRA 皮肤交接 · p3-blue（蓝 · P3R）

## 1. 已完成 & 位置
分支 `feat/umbra-skin-p3-blue`：`f077189` ①素材+manifest → `6e748fa` ②tokens/labels/slots/templates/ui.css → `cfa42f5` ③15 个 recipes+index.ts → `2873303` WIP 交接（handover/）。
- 皮肤包 `src/umbra/skins/p3-blue/`：`assets/`（13 webp + 2 帧表 + fonts/）、`manifest.json`、`tokens.json`、`labels.json`、`slots.json`、`templates.json`、`ui.css`、`recipes/`、`index.ts`。进度/待答 `docs/umbra-progress/p3-blue.md`（12 条）。
- 首包 443.8KB（图 400.6 / 数据 19.4 / ui.css 1.3 / 字体 22.5）。lint 0 error。
- recipes：transition.battleStart（slashPanels + 塔罗 cardShatter + 新月 maskWipe 0.86s）、transition.encounterBattle 1.15s、action.default 0.94s、action.agi / action.bash（cut-in→举 Evoker→扣扳机前 16ms glassShatter→俄耳甫斯，1.72/1.70s）、summon.evoker（通用召唤，无特写 1.5s）、onemore 0.44s、holdup 0.98s、allout.default 3.4s（finishCard 0.96s + freezeFrame 0.76s）、highlight.hero（Theurgy=Cadenza 俄耳甫斯+飞天 3.4s）/ .short 1.15s、unit.down 0.48s、battle.end（无人脸）、env.darkHour.enter/leave（bakedSwap）。cut-in/横幅压在 y≤330。
- tokens：primary #1b57ff、secondary #35d1e8、ink #0a1230、paper #f4fafd、accent #e8283c、hp #5dff9a、sp #ff6ec7；slant −0.21rad；指令区 list + fivePlusMore：5 行斜列（主 96 + 次 4×86，每行右移 20px），「更多」106×86 在第 5 行右侧；队伍 bar。topInfo 读 `$env` 月相/日期/影时间。labels：darkHour=影时间、more=更多、highlight=Theurgy、dive=攀登塔层、world=塔尔塔罗斯。
- 字体：display Noto Serif SC Black 83 字 18KB、number Anton 拉丁 5KB。

## 2. 素材来源
**official（4 文件）**
- `atlas-portraits.webp`：hero 取 https://megamitensei.fandom.com/wiki/File:P3_Protag_Reload.png 上半身；岳羽/顺平/真田取 megatenwiki File:P3RE_Portrait_*.png。高 620，每人 head/body 两层 + meshIdle/swayZone。
- `cutin-hero.webp`：P3_Protag_Reload 裁眼部横条。
- `persona-orpheus.webp`：https://static.wikia.nocookie.net/megamitensei/images/c/c6/Orpheus_P3R.jpg（rembg 抠图）。
- `persona-apsaras.webp`：P3R 图鉴 Apsaras_P3R.jpg。
**generated（9 文件，2026-10-22 生成，原图 `handover/p3-blue/src-art/`）**
- `bg-battle.webp`（+darkhour）：提示词要点「Persona 3 Reload Tartarus Thebel block battle floor, deep blue and cyan geometric architecture, glowing floor tiles, no characters, no text, wide anime game background」；出血 2240×950。原图 `bg-battle-src.png`。
- `bg-hub-night.webp`（+darkhour）：「岩户台/港岛夜景屋顶，P3R 蓝调夜色、城市灯光、水面反光，无人物」。原图 `bg-hub-src.png`。
- `bg-map-tile(-darkhour).webp`：由 bg.battle 地面镜像拼接的 512² 无缝平铺（脚本）。
- `allout-finish.webp`：P3R「Finishing Touch」式总攻定格（青底主角），参考 https://megamitensei.fandom.com/wiki/File:P3RE_FinishingTouch_Protagon…（见 manifest note）与 `refs/ref-ft*.jpg`；提示词要点「P3R 主角斜置剪影定格，青蓝底，大块白色斜切，画风同 P3R 官方立绘，无文字」。原图 `allout-finish-src.png`。
- `highlight-hero.webp`：主角 + 俄耳甫斯 Theurgy 定格（延迟包）。原图 `highlight-hero-src.png`。
- darkhour 三张：原图压暗 + 绿调 + 血月预烘焙（脚本）。
- `atlas-hud.webp`：程序绘制矢量小件（光标、月相 0–7、刀口、斜条、粒子帧、maskWipe 剪影）+ 塔罗卡背（复用 assets/p3/official/tarot-back.png，类官方生成）。
- 生成人物已做解剖自查。未用 P3P 老图。
- 重建：`handover/p3-blue/scripts/build_assets.py`、`recipes.py`；`asset-report.json` 体积报表。

## 3. 原作关键参考与风格要点
全文：`handover/p3-blue/docs/UI-REF-blue.md`、`UI-REF-blue-b.md`、`UI-REF-p3r-screens.md`。
- 视频：https://www.youtube.com/watch?v=Z4VcLrPs1Y8 、https://www.youtube.com/watch?v=Js7eeQhtDBY 、https://www.youtube.com/watch?v=fXgKcM20M08（时间点见 UI-REF，部分标“待确认”）
- 截图：RPG Site 官方 4K https://www.rpgsite.net/news/15253-persona-3-reload-screenshots-detail-aigis-ken-koromaru-shinjiro-velvet-room-town-activities ；Game UI Database https://gameuidatabase.com/gameData.php?id=1884 ；战斗 UI https://samurai-gamers.com/wp-content/uploads/2023/12/Persona-3-Reload-Battle-UI.jpg
- 分析：https://medium.com/design-bootcamp/persona-3-reloads-battle-ui-is-genius-actually-5703a4b56221 ；Theurgy https://www.thegamer.com/persona-3-reload-p3r-theurgy-attacks-raise-meter/
**风格要点**
- 深海蓝 → 青白高光，“水中沉下去的心之海”；大块斜切（约 −12°/−0.21rad）白色刀片与细线。
- 战斗指令：右侧斜列文字指令，选中项白底大字、其余细体；色差/玻璃碎裂转场；塔罗卡碎裂。
- 召唤：举 Evoker → 扣扳机前一帧玻璃碎裂，无面部特写。
- 影时间：绿黑调 + 血月，预烘焙底图 bakedSwap。日期翻页 dateFlip、月相。
- 人物只在首页/天鹅绒/交涉/cut-in；结算无人脸。

## 4. 未做 / 卡住 / 已知问题
- 12 条待答见进度文件（推送已解决）。hub 若为首屏是否进首包未定；召唤图固定俄耳甫斯；PAUSE 移到 topInfo 右端。
- 生成图原始提示词逐字稿未保存（上为整理版）。

## 5. 本地独有 → 已提交
`handover/p3-blue/`：`scripts/`、`src-art/`（5 张生成原图）、`refs/`（Finishing Touch 参考帧 4 张）、`docs/`（UI-REF 三份、status.md）、`tools/skin-lint.mjs`。
## 通用说明（三皮相同）
- 基线：`feat/theme-kit-integration@dc460f6`；皮肤分支只改 `src/umbra/skins/<id>/`、`docs/umbra-progress/<id>.md`，交接时另加 `handover/<id>/`（本地原图/参考图/脚本/文档）。
- `handover/<id>/tools/skin-lint.mjs`：本地静态校验（预算、坐标、轨道数、hitMarks、白名单），非官方 `skin:check`。用法 `node skin-lint.mjs src/umbra/skins/<id>`。
- **生成图无种子**：所用 generate_image 不暴露 seed，结果不可逐像素复现；以下“提示词”是按当时要点整理的可复用版本（本阶段原始提示词逐字稿未落盘，这是已知缺口），配合 `handover/<id>/refs/` 参考图与 `src-art/` 原图使用。
- 三皮共同未决（契约问题，见各进度文件）：hud.system 256×66 放不下 3 个 ≥86 命中区（现下溢到 y110）；背景 2240 宽 > 2048 纹理上限；规则侧 skill/unit/指令 id 映射表；简短版必杀靠 id 后缀 `.short`；hitMarks 数=payload.hits.length 与静态 recipe 冲突；scene:enter 无 sceneId、env:change 无“日期变了”条件、bakedSwap 只能写死 bgId；召唤图需 `$actorPersona`；交涉 styleId 白名单；图集帧在 manifest 的写法；合成图/程序绘制图的 source 归类；`index.ts` 引用 `../../engine`、`../_contract` 尚不存在→类型检查必报错。
- 未做（按开工令待通知）：引擎截图、`skin:check`/`skin:timing`、实测时长、DONE.md。
