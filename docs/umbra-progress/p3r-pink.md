# p3r-pink 进度（粉 · P3R 精致度粉色版：哈姆子 + 提奥）

| 时间 (CST) | 完成了什么 | 自查结果 | 下一步 |
|---|---|---|---|
| 10-22 02:40 | ① 素材：`src/umbra/skins/p3r-pink/assets/` + `manifest.json`（38 条，逐条 source/firstPack/w/h/atlas）。官方：P3RE Portrait 岳羽/顺平/真田（megatenwiki File:P3RE_Portrait_*.png）；生成：哈姆子半身/全身/举枪/cut-in/总攻定格/Theurgy、提奥、三张背景（同一人物设定＝已锁定的粉色首页哈姆子：深红短发小马尾、XXII 发夹、红眼、红白耳机、红领结）。立绘 640 高拆 head/body 两层进 `atlas.portraits`（2048×1288）；HUD/粒子/樱瓣遮罩进 `atlas.hud`（1024²）；缎带剪影 `mask.ribbon`；背景 2240×720（中段原图+两侧镜像出血）+ 影时间预烘焙 `*.darkhour`；字体 Barlow Condensed（OFL）display/number 子集。 | 首包图 7 个文件 545KB（≤780）；全屏图最大 101.8KB（≤200）；每人立绘 26.8–42.6KB（≤60）；字体 18.0KB（≤120）；图集 ≤2048²。生成人物解剖自查：手指 5、关节/颈长正常，四张人物图同一设定（见进度文件末「自查」）。P3P 老图 0 引用。 | ② tokens / labels / slots / templates |
| 10-22 03:00 | ② tokens.json（§4.2 全字段：樱玫红 #e64a84 / 莓紫墨 #3b1531 / 琥珀缎带 #ffb36b；slant +0.21rad 与蓝皮反向；uiOpen 200ms outBack 轻快；hud list + fivePlusMore + card）、labels.json（必填 11 项 + darkHour/more；highlight=THEURGY、dive=攀登塔层、world=塔尔塔罗斯）、slots.json（全部必填插槽；指令区 P3R 斜列 6 格：主 96、次 86，cmd.4 与「更多」同一行；4 人立绘 body/head 两层 + meshIdle/swayZone 多边形）、templates.json（交涉：粉白缎带斜带 + 樱瓣选项，静态 clip-path，无 svg/url）、ui.css（仅交涉 + ui:open/close）。 | 全部 JSON 可解析；指令 6 格均在 x780–1256 y220–696 内且互不重叠；模板标签全在白名单、无 on*/src/href/style；ui.css gzip 1.5KB（≤24）；labels display 文案全为拉丁字形（子集覆盖）。 | ③ recipes + index.ts + skin-lint |

## 待主策划答复
1. **图集容器的 source**：`atlas.portraits` / `atlas.hud` 混有 official 帧与 generated 帧，manifest 的 `source` 只能二选一。现做法：容器记 `generated`（保守）并在 note 写明，逐帧另列条目（`atlas` 字段指向容器，`file` 写 `assets/<atlas>.json#<帧名>`，帧坐标在 Pixi spritesheet 格式 json 里）。如契约要求按来源拆图集，请告知。
2. **程序绘制素材的 source**：樱瓣/光标/缎带遮罩等由脚本画的几何图，既非官方也非 AI；暂记 `generated` + note「程序绘制」。
3. **影时间配色**：粉皮的影时间仍用 P3 系列标志性的绿黑调（压暗+绿阴影+残留玫红高光），没改成粉色；若希望粉皮影时间也走粉/血月系，请告知。
5. **hud.system 高度矛盾**：§4.1 给 y 24–90（66 高），§0.7 要求命中区 ≥86。现做法：视觉 66 高，三个按钮命中区 86×86 写到 y24–110（向下溢出 20）。请确认允许或放宽插槽范围。
6. **技能 id 大小写**：规则数据里技能键是 `Agilao` / `Cadenza`，红样板写 `eigaon`（小写）。recipe match 现用小写 `agilao` / `cadenza`，请确认 skillId 规范。
7. **talk params.styleId**：App 预置白名单未公布，暂写 `p3r-pink-ribbon`；ui.css 用了 `--umbra-scale`（设计→CSS 像素）保证 86/96 命中区，若引擎不注入此变量请告知变量名。
4. **背景出血**：生成图是 16:9，用两侧镜像补到 2240 宽；安全框（1280）内全是原图，镜像只落在出血区。

## 自查（生成人物）
- 哈姆子半身 bust（atlas ally.hamuko.head/body）：五官对称、单一下颌线、颈长正常、无手入画；发夹 XXII 字向正确。
- 全身 ally.hamuko.full：左手插腰五指可见、右手自然下垂五指；肘/膝关节方向正常；约 7 头身。
- 举枪 ally.hamuko.evoke：持枪手握把、食指位置正常，枪口贴近太阳穴但不抵（原作姿势的安全版）；左臂外展五指；闭眼。
- cut-in：眼部特写，一缕发丝绕过眼角（原作常见），无畸形。
- 总攻定格：右侧回眸持薙刀，握杆五指正常；左侧 2/3 樱瓣 + 缎带留白放总伤害。
- Theurgy：前伸手五指透视正常、持枪手正常；奥菲斯半透明；蓝色背景已转玫红。（此张耳机戴在头上，与首页锁定图一致；其他张挂颈。）
- 提奥：沿用 p3r-art 已生成的 P3R 画风提奥（白手套五指正常）。
