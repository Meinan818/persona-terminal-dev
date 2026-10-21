# p3-blue 进度（蓝 · P3R）

| 时间 | 完成了什么 | 自查结果 | 下一步 |
|---|---|---|---|
| 10-22 02:3x | ① 素材：assets/ 13 个 webp（首包 6 个：bg.battle 2240×950、atlas.portraits 4 人×2 层、cutin.hero 1280×320、allout.finish.default、atlas.hud、persona.orpheus）+ 2 个子集字体（display NotoSerifSC Black 83 字 18KB、number Anton 拉丁 5KB）；manifest 逐张 source/firstPack/w/h/atlas；影时间预烘焙 bg.battle/hub/map.tile.darkhour（绿调+血月） | 本地 skin-lint：首包图 6 张 400.6KB ≤780KB、皮肤首包份额 427KB；official 4 文件/generated 9 文件；单图 ≤200KB、立绘高 620 ≤640、每人 24–39KB ≤60KB、图集 ≤2048²、字体 23KB ≤120KB；无 P3P 老图；generated 图已自查解剖（手指/单头） | ② tokens / labels / slots / templates |
| 10-22 03:0x | ② tokens.json（§4.2 全字段；slant −0.21rad、commandShape list、commandLayout fivePlusMore、partyStyle bar）、labels.json（必填全齐 + label.darkHour=影时间、label.more=更多、label.highlight=Theurgy、label.dive=攀登塔层、label.world=塔尔塔罗斯）、slots.json（必填插槽全部；指令区 5 项斜列：主 96 + 次 4×86、行距 9、每行右移 20px，「更多」106×86 与第 5 行同带靠右，全部在 x780–1256 y220–696；4 人立绘 2 层 + meshIdle/swayZone 多边形；topInfo 读 $env 月相/日期/影时间）、templates.json（P3R 斜板交涉模板，选项 86 高 ≤4 行不滚动）、ui.css（gzip 1.3KB，仅 transform/opacity 动效 + 静态 clip-path） | skin-lint：tokens/labels/slots/templates/ui.css 0 错；警告：hud.system 命中区高 86 越出插槽 y≤90、背景 2240 宽超 2048 纹理（均列入待答） | ③ recipes + index.ts |
| 10-22 03:3x | ③ recipes 15 个：transition.battleStart（slashPanels+塔罗 cardShatter+新月 maskWipe 0.86s）、transition.encounterBattle（merges 1.15s）、action.default 0.94s、action.agi / action.bash（主角招牌：cut-in→举 Evoker→扣扳机前 16ms glassShatter→俄耳甫斯，1.72/1.70s）、summon.evoker（kind=magic 通用召唤，无特写 1.5s）、onemore 0.44s、holdup 0.98s、allout.default 3.4s（finishCard 0.96s + freezeFrame 0.76s）、highlight.hero（Theurgy=Cadenza 俄耳甫斯+飞天 3.4s）+ highlight.hero.short 1.15s、unit.down 0.48s（碎裂承载信息，文字可丢）、battle.end 1.4s（无人脸）、env.darkHour.enter/leave（bakedSwap 0.6s）；index.ts 只静态 import + registerSkin | skin-lint 0 错 6 警告：全部 ≤§3 上限；展开后轨道 ≤41；at+dur/粒子 at+life ≤duration；hitMarks 升序且 ≤duration−200；rgbSplit/shockwave 均错开 150ms；高档粒子峰值 ≤300；cut-in/横幅限 y≤330 不挡指令/HP/敌名。皮肤首包 443.8KB（图 400.6 / 数据 19.4 / ui.css 1.3 / 字体 22.5） | 等主策划答复下列问题；引擎+skin:check 到位后跑 §7.3 第 6 步截图/时长 |

## 待主策划答复
1. 推送：github 凭据未注入 git（could not read Username；helper 假凭据 → Invalid token），三步均只有本地 commit。
2. hud.system 宽 256 放不下 3×86、高 66 不足 86：现 AUTO/SPEED 在 system（126×86），PAUSE 放 hud.topInfo 右端（86×86），命中区下沿到 y110。可否？
3. 背景出血要求宽 ≥2240，但 §5 图集/纹理上限 2048：bg.battle/hub 现为 2240×950 单图（非图集），是否允许？
4. §5 首包只列战斗背景：bg.hub/bg.map 现标 deferred，hub 若是首屏是否要进首包？
5. 规则层同伴 id 是 ally:<personaId>，皮肤立绘是 yukari/junpei/akihiko：现按队伍栏位次映射（slots._party），引擎是否支持？
6. highlight 简短版：match 无 short 字段，现用 id 后缀 `.short`（highlight.hero.short）区分。
7. hitMarks 必须 = payload.hits.length，但 recipe 是静态的：单体技能写 1 个；多目标/多段（总攻照示例 9 个）不等时引擎如何处理？
8. env:change 的 bakedSwap 只能写死 bgId（现按 §2.4 用 hub）；战斗/地图场景下影时间换底建议引擎读 scene.<id>.bg.darkHour 自动选。
9. 召唤 Persona 图固定为俄耳甫斯；按当前出战 Persona 换图需要引擎 Ref（如 `$actorPersona`）。
10. cutin/banner 的 shape 按示例理解为屏幕中心相对坐标；技能 match.skillId 用规则层英文技能名（Agi / Bash）。
11. 交涉模板 params.styleId 填 `p3-blue`，需 App 预置白名单含此值或给出可选列表。
12. index.ts 引用路径 `../../engine`（UMBRA）与 `../_contract`（类型）待红色样板确认；图集为 Pixi JSON hash，manifest 帧条目 file 指向图集 webp。
