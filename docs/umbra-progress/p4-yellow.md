# p4-yellow 进度（黄 · P4R+P4G）

| 时间 | 完成了什么 | 自查结果 | 下一步 |
|---|---|---|---|
| 10-22 02:20 | ① 素材：assets/ 9 张 webp（首包 5：bg.battle 2240×950 gen / atlas.portraits 2048×1024 官方 4 人×2 层 / cutin.hero 1280×320 官方 / allout.finish.default 1280×720 官方合成漫画四格 / atlas.hud 1024² 程序绘制；延迟 4：bg.map、bg.hub gen，highlight.hero、enemy.calm-pesce 官方）+ 2 个 Pixi 帧表 json + 字体 2 个子集 + manifest.json（46 条，逐张 source/firstPack/w/h/atlas） | 首包图 622.5KiB ≤780；单全屏图最大 195KB ≤200；立绘高 640、单人两层估算 30/32/39/51KB ≤60；图集 ≤2048²；背景宽 2240；字体 display 50.5KB + number 3.6KB = 54KB ≤120；首包图 5 张 ≤14；official 5 文件（manifest 13 条含图集帧）/ generated 4 文件（33 条，含程序绘制 HUD 图集帧） | ② tokens/labels/slots/templates |
| 10-22 02:40 | ② tokens.json（§4.2 全字段，hud grid+fivePlusMore+card）、labels.json（52 条，含 darkHour=午夜电视、more=更多、dive=电视世界、highlight=必杀）、slots.json（§4.1 必填全部 + topInfo 读 $env 日期/曜日/天气、4 人 meshIdle/swayZone）、templates.json（P4 电视交涉模板）、ui.css | 指令区 5 项+更多全部在 x780–1256/y220–696，主 120、次 ≥92，互不重叠（lint 校验）；模板只用白名单标签、无 on*/src/href/url()；ui.css gzip 1.1KB；**hud.system 命中区与插槽范围冲突（Q1）** | ③ recipes + index.ts + skin-lint |
| 10-22 03:10 | ③ recipes 16 个（transition.battleStart tvStatic+blockPush 0.88s、transition.encounterBattle 合流 1.15s、action.default 0.96s、action.ziodyne 1.6s / action.brave-blade 1.5s 含 cut-in、onemore 0.43s、holdup 0.94s、allout.default 3.4s 黄底漫画四格 finishCard+freezeFrame 0.76s、highlight.hero 3.3s + highlight.hero.short 1.18s、unit.down 0.48s、battle.end 1.4s、scene.enter/leave.world dateFlip 取 $env、env.date.flip $prev→$env、talk.start）+ index.ts（只静态 import JSON、组装、registerSkin） | 本地 work/umbra/tools/skin-lint.mjs：0 error / 6 warn（3 张背景 2240 宽 >2048 单图提示；hud.system 命中区出范围 = Q1）。全部 ≤§3 上限；展开后轨道最多 42 ≤64；粒子峰值最高 300 ≤600；rgbSplit/shockwave 均错开 150；hitMarks 升序、末个 ≤duration−200。皮肤首包 695KiB（图 622.5 / 数据 17.7 / ui.css 1.1 / 字体 54.2） | 等引擎 + skin:check 交付后跑 §7.3 第 6 步截图与实测；等 Q1–Q8 答复 |

## 待主策划答复
- **Q1 hud.system**：插槽 x1000–1256 / y24–90（256×66）放不下 3 个 ≥86×86 命中区（3×86=258 宽，高 66<86）。现做法：画面在范围内，命中区 x998 起、向下延到 y110。请定：放宽插槽，还是允许命中区出插槽（仍在安全矩形内）？
- **Q2 背景尺寸**：§4.1/§5 要求宽 ≥2240，且 4:3 需上下出血；§5 又写背景主体 1280×720。现交 2240×950（battle/map）、2240×897（hub），各 ≤200KB；单图超 2048 宽，低端机纹理上限是否需要切成两块？
- **Q3 图集帧在 manifest 的写法**：schema 无帧矩形字段。现做法：图集本体一条（file=webp，note 指向同名 Pixi spritesheet .json），每帧一条（同 file + atlas 字段 + 帧宽高）。帧表 json 计入数据预算。请确认引擎按此读取。
- **Q4 source 二分**：合成图（官方人物渲染 + 程序绘制底/格框，如 allout.finish.default、highlight.hero、cutin.hero）标 official；纯程序绘制（非 AI）的 HUD 图集标 generated。是否需要第三类或 note 足够？
- **Q5 skillId / unitId / 指令 id**：规则侧 id 尚未给出。现用 skillId `ziodyne`、`brave-blade`，actorId `hero`，立绘 unit `hero/yosuke/chie/yukiko`，指令 `attack/skill/guard/persona/item` + 更多里 `analyze/tactics/talk/escape`。请给映射表。
- **Q6 highlight 简短版如何选中**：match 无 `short` 字段。现以 id `highlight.hero.short` 区分，需引擎在 payload.short 时按 id 后缀选用，或给 match.short。
- **Q7 场景/日期 recipe 选择**：`scene:enter/leave` 的 match 没有 sceneId，无法只在进/出电视世界时播 dateFlip；`env:change` 的 match.env 无「date 变了」条件。现交通用版（scene.enter.world / scene.leave.world / env.date.flip）。请定是否加 match.sceneId / match.changed。
- **Q8 总攻 hitMarks**：要求数量 = payload.hits.length，但总攻命中数随队伍/敌人数变化，固定 9 个不可能永远相等。请定引擎是否按比例映射或允许按 partySize 多份 recipe。
- **Q9 推送**：沙盒 `git push` 未拿到 GitHub 凭据（"could not read Username"，API 401），三个 commit 只在本地。
