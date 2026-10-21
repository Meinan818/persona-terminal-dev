# assets/hamuko · 粉皮（P3P 女主线粉色界面）素材清单 · P-A（外壳/据点/经营）

全部为**手写 SVG**（路径自绘，未描摹任何官方位图），无 AI 生成位图、无官方 Logo / 立绘 / 字体。许可：本项目自有，随 MASKARIA 代码一起使用。
`fx/` 子目录归 P-B（演出素材），清单见 `fx/ASSETS.md`。原作对照帧只在 `work/umbra/qa/compare-pink/ref/`（QA 用，**不进交付**）。

## 在用（a.css / tokens.css 引用）
| 文件 | viewBox | 体积 | 用途 | 用在（选择器） |
|---|---|---|---|---|
| `logo-redraw.svg` | 348×92 | 3.2KB | 「MASKARIA」手绘字标（窄斜几何字形、skewX −12°） | 顶栏 `.brand`（官方插槽 `official/logo.png` 在上） |
| `hero-silhouette.svg` | 600×720 | 2.8KB | 首页主角位剪影线稿（原作 COMMAND 画面右侧立绘位） | `.hero-stage` 背景（`official/hero-portrait.png` 在上） |
| `tarot-back.svg` | 220×320 | 1.2KB | Persona 位塔罗牌背（原作 PERSONA 页右侧立绘位的替代） | Persona 页 `.mask-display .mask-art` |
| `velvet-host.svg` | 300×420 | 1.5KB | 天鹅绒侍者剪影（原作 Theo 站位） | `.velvet-room .vr-side::before`（`official/velvet-host.png` 在上） |
| `deco-main.svg` | 160×72 | 0.5KB | 背景巨字「MAIN」（原作 COMMAND 右缘竖排 MAIN） | 页头 `.page-heading/.scene-heading::after` 默认 |
| `deco-persona.svg` `deco-arsenal.svg` | 320×72 | 0.9KB | 背景巨字 PERSONA / ARSENAL | Persona / 武库页头 |
| `deco-base.svg` `deco-equip.svg` `deco-item.svg` `deco-rest.svg` `deco-return.svg` | ≤276×72 | ≤0.8KB | 背景巨字 BASE / EQUIP / ITEM（原作 ITEM 子菜单底部描边巨字）/ REST / RETURN | 据点 / 装备 / 背包 / 幕间 / 回城页头 |
| `deco-buy.svg` | 144×72 | 0.5KB | 背景巨字「BUY」（原作商店 BUY 窗左上巨字） | 商店页头 |
| `deco-config.svg` | 248×72 | 0.7KB | 背景巨字「CONFIG」（原作设置页左下巨字） | 设置弹层 `#sheet .preparation-panel::after` |

生成脚本：`work/pa/deco.py`（`python3 deco.py <输出目录>`，自绘几何字形表，加字母在 `L` 字典里补多边形）。

## 保留未引用（上一版「粉白晨光」遗留，原作无对应母题，已从样式撤下；可删）
`bow.svg`（缎带结）、`ribbon-cursor.svg`（缎带光标）、`petal-mark.svg`（樱瓣）、`xxii.svg`（发夹标）、`washi-dots.svg`（和纸点阵）、`deco-list.svg` `deco-system.svg` `deco-velvet.svg`（备用巨字）；`deco-shop.svg` 仍被一条早期规则引用，但同选择器后文改用 `deco-buy.svg`，实际不显示。tokens.css 里 `--pk-ribbon/--pk-bow/--pk-petal` 变量仍指向前三个，但无规则使用。

合计约 20KB（远低于首屏 300KB / 全皮 1.5MB 预算）。

## 官方覆盖插槽 `official/`（2026-10-21 起放入官方素材并默认启用，见文末）
CSS 均为「官方在上、替代在下」双层背景，缺文件自动显示替代：`logo.png`（1200×360 透明）、`hero-portrait.png`（900×1200 透明）、`velvet-host.png`（900×1200 透明）、`font-display.woff2`（族名 `HamukoOfficial`，只覆盖拉丁 U+0000-024F）。`hero-cutin.png` / `party-*.png` / `navi.png` 由 P-B 演出读取。

## 用法约束（2026-10-21 复核）
- 背景巨字 `deco-*` 只在 A 画面（`@S` 作用域）显示，P-B 塔层页不出现；844×390 横屏收起（避免压标题）。
- Persona / 武库页头 `::after` 用作 ◀ ▶ 箭头，不放巨字。

## 审核
新增的仅为几何字形背景巨字（BUY / CONFIG），风格同既有 deco-*；成品见 `work/umbra/qa/compare-pink/*.jpg`。

## official/ 官方素材（2026-10-21 用户拍板启用；官方素材，自用，仅本地，随包提交（13:27 用户：私有仓库））

CSS 已引用的插槽文件缺失时自动回落上表替代；新增文件需接线（见 `work/umbra/status/official-art.md`）。来源均为 Megami Tensei Wiki (Fandom) 文件页；裁透明边、等比放入透明画布、256 色量化。Logo 不放（MASKARIA 为本 App 名）。

| 文件 | 尺寸 | 体积 | 用途 | 来源 | 备注 |
|---|---|---|---|---|---|
| `official/hero-portrait.png` | 900×1200 | 91 KB | 首页女主位（P3P 主菜单女主） | https://megamitensei.fandom.com/wiki/File:Protagonist_(Female).png | 官方素材，自用，仅本地 |
| `official/hero-cutin.png` | 1600×400 | 64 KB | 女主 cut-in 眼部横条 | https://megamitensei.fandom.com/wiki/File:Protagonist_(Female).png | 官方素材，自用，仅本地 |
| `official/result-portrait.png` | 900×1200 | 100 KB | 胜利结算立绘（P3P 女主胸像） | https://megamitensei.fandom.com/wiki/File:Female_Protagonist_protrait.png | 官方素材，自用，仅本地 |
| `official/velvet-host.png` | 900×1200 | 78 KB | 天鹅绒看守提奥多亚（P3P） | https://megamitensei.fandom.com/wiki/File:P3P_Theo_Render.png | 官方素材，自用，仅本地 |
| `official/hero-full.png` | 592×1800 | 96 KB | 首页主视觉全身立绘 | https://megamitensei.fandom.com/wiki/File:Protagonist_(Female).png | 官方素材，自用，仅本地 |
| `official/persona-main.png` | 906×1600 | 189 KB | Persona 页主 Persona 奥菲斯（女主版） | https://megamitensei.fandom.com/wiki/File:FemOrpheus_Render.png | 官方素材，自用，仅本地 |
| `official/enemy-1.png` | 800×800 | 34 KB | 敌人 1（与蓝皮同图：P3P 与 P3 共用 Shadow） | generate_image 生成「类官方」（无官方透明图） | 类官方生成，自用，仅本地 |
| `official/enemy-2.png` | 800×800 | 62 KB | 敌人 2（同蓝皮） | generate_image 生成「类官方」（无官方透明图） | 类官方生成，自用，仅本地 |
| `official/enemy-3.png` | 800×800 | 80 KB | 敌人 3（同蓝皮） | generate_image 生成「类官方」（无官方透明图） | 类官方生成，自用，仅本地 |
| `official/tarot-back.png` | 600×900 | 192 KB | 粉色塔罗卡背 | generate_image 生成「类官方」（无官方透明图） | 类官方生成，自用，仅本地 |
| `official/velvet-bg.webp` | 1376×768 | 147 KB | 天鹅绒电梯背景（同蓝皮生成图；P3P 天鹅绒同为电梯） | generate_image 生成「类官方」（无官方透明图） | 类官方生成，自用，仅本地 |
| `official/femc-sil.png` | 900×1200 | 57 KB | fx/femc-sil.svg 位全身 | https://megamitensei.fandom.com/wiki/File:Protagonist_(Female).png | 官方素材，自用，仅本地 |
| `official/talk-portrait.png` | 900×1200 | 113 KB | 交涉 TALK 半身 | https://megamitensei.fandom.com/wiki/File:Protagonist_(Female).png | 官方素材，自用，仅本地 |
| `official/allout-hero.png` | 973×1400 | 130 KB | 总攻击动作大图（P5X 官方女主立绘，画风略新） | https://megamitensei.fandom.com/wiki/File:Kotone_p5x_render.png | 官方素材，自用，仅本地 |

本皮 official/ 合计 ≈ 1.40 MB（≤3 MB）。首屏只应加载 hero-portrait 或 hero-full 其一（各 <100 KB）。
| `official/hero-portrait.png` | 900×1200 | — | 首页女主半身（P3R 结城理画风重绘的 P3P 女主，用户 13:02 认可此方向；原 P3P 立绘备份为 hero-portrait-p3p.png） | generate_image（参考 P3P 立绘 + P3REMC） | 类官方生成，自用，仅本地 |

## P3R 粉色版（2026-10-21 重做）· `p3r/` 与 `p3r/official/`
生成：`work/pa/p3r/assets.py`（人物去描边 / 纹理调粉）、`work/pa/p3r/port.py`（蓝皮素材换色副本）。
| 文件 | 来源 | 处理 | 用于 |
|---|---|---|---|
| official/hero-portrait.webp · result-portrait.webp · talk-portrait.webp · hero-full.webp · allout-hero.webp · femc-sil.webp | 本目录 official/*.png（P3R 画风女主官方立绘，来源见上节） | alpha 内收 3–4px + 羽化，去掉外缘青/白描边（贴纸感来源）；残留青色光边调樱粉 | 首页菜单立绘、结算、交涉、HOLD UP 切入 |
| official/velvet-host.webp | official/velvet-host.png（提奥多亚官方立绘） | 去描边；蓝制服调莓紫（融入粉色电梯厢） | 天鹅绒 |
| official/water-bg.webp → water-deep.webp / water-pale.webp | 蓝皮 assets/p3/official/water-bg.webp（P3R 水下光束） | 调粉；深版压暗、浅版提亮 | 深水底 `--pr-water` / 页面底 `--u-stage-bg` |
| official/velvet-elevator.webp | 蓝皮 assets/p3/official/velvet-elevator.webp（[G] 类官方生成） | 调粉 | 天鹅绒电梯厢 |
| official/moon-p3r.webp · tower-p3r.webp · cloud-p3r.webp | P3R UI 纹理 T_UI_TartarusMapBG_Moon_00 / Tower_00 / Cloud_00（skowt.cc「Persona 3 Reload / Ui」https://skowt.cc/games/persona-3-reload/ui ，提取版预览图） | 绿 → 樱粉 / 深莓 | 首页右上月（moon）；tower/cloud 备用 |
| official/velvet-pattern.webp | P3R T_UI_Wipe_VelvetRoom_00_texture（同上） | 取上半花纹带，着樱白 | 天鹅绒栅格帘纹 `.vr-bars` |
| official/sakura-p3r.webp · smoke-band.webp | P3R T_UI_SaveLoad_Sakura / T_UI_PartyPanel_Smoke_01（同上） | 原色 | 备用（未上屏） |
| official/moon.png | 蓝皮 official/moon.png（[G]） | 调粉 | 备用 |
| blank.png | — | 1×1 透明 | 撤下的自绘 svg（water-caustic / hero-silhouette / velvet-host / vr-corner / sil-hero / face-cutin / velvet-elevator.svg）指向此图 |
| *.svg（p3r/ 下） | 蓝皮 assets/p3/*.svg 换色副本 | 仅保留 tri-cursor / notch / logo-redraw / 地图徽章 / tarot-back 在用 | — |

## p3r-art（2026-10-21 18:1x CST）P3P 老图全部停用 → P3R 画风 [G]
P3R 没有哈姆子的官方图；megatenwiki 上提奥多亚只有 P3P/PQ/PQ2/P3D 的立绘，**P3R 没有提奥多亚官方立绘**（查了 Category:Persona 3 Reload Renders 和 Theodore 页）。所以下面几张都是 generate_image 生成 [G]，类官方生成，自用，仅本地。原件与参考图都在 /workspace/pkcache-umbra/p3r-art/gen/。
| 文件 | 生成源 / 参考图 | 提示词要点 | 用处 |
|---|---|---|---|
| p3r/official/menu-art.webp (640×861, 49KB) | menu-art-pink-gen2.png；参考 ref-menu-crop.jpg（P3R 暂停菜单原帧）+ ref-femc.jpg（P3P 女主官方） | 「照原菜单插画的构图/线宽/平涂重画，男主换成哈姆子（马尾、XXII 发夹、红眼、红蝴蝶结、红耳机），倒置斜落，线条改热粉/玫瑰/深莓，脸和衬衫纯白，高对比，无文字」；绿幕抠图 + 去绿边 | 首页（替换 hero-r3.webp） |
| p3r/official/velvet-host.webp (900×1200, 35KB) | theo-p3r-gen.png；参考 ref-eliz-render.jpg（P3RE_Elizabeth 官方）+ ref-theo.jpg（P3P 提奥官方） | 「提奥多亚全身，用 P3R 官方立绘画风（细线、赛璐璐、Soejima 脸），紫色侍者服、高帽、白手套、抱书，绿幕」 | 天鹅绒（同名替换 P3P 提奥） |
| p3r/official/av-hero.webp (128²) · official/hero-cutin.png (1600×400, PNG8 103KB) | femc-p3r-bust-1.png；参考 ref-blue-talk-portrait.jpg（P3REMC 官方）+ ref-femc.jpg + ref-femc-full.jpg | 「P3R 官方半身立绘画风的哈姆子，比例/线条/阴影跟结城理 talk 立绘一致」 | 队伍头像 / 技能 cut-in（同名替换 P3P 图） |
| （备用，未上屏）femc-p3r-render-1.png | 参考 P3_Protag_Reload ×2 + P3P 女主 | P3R 全身立绘风 | — |
停用：hero-r3.webp、result-r3.webp、result-portrait.webp（结算改成纯数字排版）；official/*.png 的 P3P 原图留在盘上，样式里已不再引用（enemy-* 除外）。
| p3r/official/menu-art-rise.webp (640×861, 52KB) | p3r/official/menu-art.webp 上下翻转（PIL FLIP_TOP_BOTTOM，XXII 发夹上下对称不反字），webp q86 | 无新生成；倒置下坠 → 正立仰头上浮 | 粉首页 p3r-home2（B:home2-pink）人物，右侧 |
