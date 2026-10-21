# UMBRA M3 · 红色样板第一阶段报告（p5r-red 战斗画面 1:1 还原）

> 日期 2026-10-22 · 目录 `/workspace/work/umbra-next/m3/` · 栈 Vite 6 + TS 5.6 + PixiJS 8.22（WebGL）+ pixi-filters 6.1.5（node_modules 软链到 spike）
> 依据：CONTRACT-v1.2（含两段 v1.2 修订）、GDD §8–§10/§16、spike、refs/MAP.md、OFFICIAL-ASSETS。未改动任何仓库、`/workspace/work/ptd`、`umbra-red/base`；官方图只读取后缩放进本目录（ATLUS/SEGA 版权，仅私有自用）。

## 0. 结论

1. **完整可玩**：开战转场 → 指令轮 → PERSONA 技能列表（Eiha 打聒噪假面弱点，cut-in）→ 1 MORE → ATTACK 打游荡回声弱点 → 1 MORE → HOLD UP 包围（总攻/交涉/放过）→ 总攻（黑红剪影斩击 + THE SHOW'S OVER 定格 + TOTAL DAMAGE）→ RESULT（EXP/BONUS/MONEY/ITEM 计数）→ NEXT 重开。打非弱点会进入敌方回合（敌人前冲、队伍卡抖动掉血、倒地的敌人起身）。另有 GUARD、GUN、ITEM 列表、ORDER 列表（Analysis 揭示弱点）、交涉 DOM 模板。`?demo=1` 自动循环。
2. **结构按契约**：`src/umbra/engine/`（全部演出原语中红色用到的 31 个 + Director 简版 + HUD + 交涉模板填充器）、`src/umbra/skins/_contract/`（Recipe/Track/payload/Env/SkinPack/Manifest/Tokens/Slots 类型）、`src/umbra/skins/p5r-red/`（index.ts 只组装注册；manifest 逐张 source；tokens/slots/labels/templates/ui.css；17 个 recipes/*.json）。规则层 `src/game/battle.ts` 零 DOM/零画布，先提交（带 action key 幂等）再演出。
3. **时长全部合规**：1×完整、1×极简、2×、3× 四组实测墙钟均 ≤ §3 上限，0 次强制推进（§4）。
4. **spike 遗留已修**：色差与冲击波起点错开 150ms（recipe 写 740/890，引擎再兜底推迟，实测同屏引擎滤镜峰值 1 个）；4:3 不再裁角色（Arsène 不再上场，Joker 背影整身在安全框内，背景 2260×960 上下左右出血）；16:9 安全框 + 出血（HUD 全在 1280×720 内，出血区只有背景）。
5. **首包** 704 KB（代码 222 KB gzip + 9 张图 431 KB + 字体 50 KB）；皮肤份额 491 KB，低于 §5 的 1 MB。

## 1. 产出

| 路径（m3/ 下） | 内容 |
|---|---|
| `src/umbra/engine/` | `stage.ts` 舞台/出血/虚拟横屏 ±90°/逻辑安全矩形/DOM 叠加层同步变换；`timeline.ts`；`prims.ts` 原语；`recipes.ts` 上限表、repeatEvery 展开、校验、match；`director.ts`；`fx.ts` 停帧/震屏/滤镜名额；`particles.ts` 池化+同屏上限+按 owner 回收；`units.ts` meshIdle（swayZone 支持图层名/多边形）与倒地姿态；`hud.ts` P5 HUD；`talk.ts` 交涉模板；`quality.ts`；`defaults.ts` 兜底演出；`index.ts` UMBRA.registerSkin |
| `src/umbra/skins/_contract/` | `recipe.ts`、`skin.ts`、`index.ts`（纯类型） |
| `src/umbra/skins/p5r-red/` | `index.ts`、`manifest.json`、`tokens.json`、`slots.json`、`labels.json`、`templates.json`、`ui.css`、`recipes/*.json`（17）、`assets/`（9 图 + 8 字体分片） |
| `src/game/battle.ts`、`src/main.ts` | 规则层；宿主（建引擎、接 Director、流程、demo、测试钩子 `window.__umbra`） |
| `tools/` | `prep_assets.py` 出图、`subset_fonts.py` 字体子集、`build_manifest.py`、`shots.mjs` 截图、`check.mjs` 自检、`budget.py`、`sheets.py` 拼图、`run.sh`（flock + 超时） |
| `tools/out/` | `check.json`（时长/帧时间/命中区/竖屏点击/跳过/冻结/缓冲）、`budget.json`、`shots-*.json` |
| `shots/` | 5 尺寸 × 7 状态 + `contact-*.png` ×5 + `compare-*.png` ×7 |
| `dist/` + `serve.py` | 构建产物；`python3 serve.py 8766` → `http://127.0.0.1:8766/?demo=1` |

URL 参数：`demo=1`；`q=high|mid|low`；`auto=0` 关自动降档；`res=`；`hit=1` 画出全部命中区；`prewarm=0`/`rehearse=0`；`maxdt=`（测试用）。

## 2. 画面对照表（每状态 vs 原作帧）

截图：`shots/<尺寸>-{1-idle,2-skilllist,3-cutin,4-onemore,5-holdup,6-allout,7-result}.png`；左右对比：`shots/compare-{idle,skilllist,allout,cutin,onemore,holdup,result}.png`（844×390）。

| 状态 | 原作参考（refs/MAP.md） | 一致 | 说明 / 偏差 |
|---|---|---|---|
| 待机·指令轮 | `battle/cmd-menu-xbox.jpg`、V:gs50@00:20、V:ngt@00:36、G26498/26499 | **基本一致** | 原作七个标签全部在：ORDER/GUN/PERSONA/ITEM/GUARD/ATTACK + 1 MORE 后才出的 BATON PASS；剪报字（单字母反色）、黑牌 + 白描边、按键图标（△○□× + L2/R1/R2）、中文小字说明（原作是日文说明）、标签背后红色锯齿放射 + 黑碎片、Joker 背影居中。**偏差**：布局左右镜像（原作 Joker 在左、标签往右放射；本作 Joker 在右下拇指区、标签往敌人一侧放射），原因是契约 `hud.command` 在右下；原作是 3D 场景、本作是 2D 背景图 |
| 队伍 HP/SP 斜卡 | G26499、cmd-menu-xbox 右下 | **基本一致** | 黑白墨线头像 + 斜体 HP（绿）/SP（粉）数字 + 短条 + 黑色斜卡，当前行动者红底上浮；受击抖动 + 数字回落。**偏差**：位置在左下（契约 `hud.party` 槽位 x24–660），原作在右下 |
| 敌人头顶 / 目标 | G26499、V:rt@03:30 | **基本一致** | 红色锯齿准星 + 心形 HP 水位（原作目标光标）、准星上方红箭头；左上黑色名牌条「Lv + 敌人名 + 已知弱点 + ?」（原作目标名牌）。头顶小名牌/弱点/HP 条为**原创补充**（契约 `hud.enemyOver` 必填；原作只在选目标时出名牌） |
| 顶部回合 / 1 MORE | V:gs50@05:30、G26500 | 部分一致 | 原作没有回合数和行动顺序；`TURN 01` + 行动顺序小头像为**原创补充**（契约 `hud.order` 必填，参照 P5X）。1 MORE 后导航改口、BATON PASS 出现，与原作一致 |
| 导航气泡 | V:gs50@00:20、takeover@01:27 | 一致 | 白底黑字气泡 + 角色头像（NAVI 为包 F 伪官方角色，替代原作 Morgana/Oracle） |
| 技能列表 | V:gs50@00:22、@05:20、@09:42、V:rt@03:10 | **基本一致** | 「PERSONA」剪报标题 + 面具名红条、每行属性图标 + 名 + 右侧粉色 SP/绿色 HP 消耗、选中行红底外凸 + 白三角、锯齿右缘、奶白说明栏、灰字不可用、整体 -2° 倾斜。**偏差**：位置在右侧（契约「指令类按钮放在 hud.command 内」，原作左上）；说明栏放列表上方（原作在下方）；触屏改为「点一次选中、再点确认」 |
| cut-in（眼部横条） | G26513、takeover@01:33 | 一致 | 撕纸边横条（红/白/黑三层锯齿）+ 官方 Joker 眼部横条 + 红网点 + 双层速度线，左上技能名牌（属性色圆标 + Eiha，原作 G26517 位置） |
| 1 MORE | V:gs50@09:32、G26500 | 部分一致 | 巨大「1」+ 剪报「MORE」+ 黑色星芒 + 红黑横带，背景压暗。**偏差**：原作是整屏去色（灰度）定格，本作用 dim 压暗近似（契约禁止全屏模糊/发光类滤镜，去色需要皮肤滤镜名额，第一阶段未用）；原作停留约 0.6–0.8s，契约上限 0.45s，本作 0.42s |
| HOLD UP 包围 | V:gs50@01:00、talk/holdup.jpg | 基本一致 | 「HOLD UP!」两行剪报大字 + 青色碎片横幅，红色剪影队员包围倒地敌人（倒地 = 横倒 + 转星），左上 HOLD UP! 标识，右下三选项 ALL-OUT ATTACK / TALK / LET GO。**偏差**：原作镜头环绕，本作 2D 剪影冲入 + 静态包围 |
| 总攻 | takeover@01:00–01:01、V:gs50@00:30/@00:34、finishem@01:46.5、`battle/allout-finish.jpg` | **一致** | 黑底 → 红底（两层 dim）+ 红白放射线 + 黑色速度线 + 8 次黑剪影（红描边）L↔R 冲刺斩击 + 烟尘 + 白闪/冲击波 → 官方 THE SHOW'S OVER 定格画斜切滑入（白黑双框）+ 0.78s 世界定格 + 红色 TOTAL DAMAGE 牌 |
| RESULT | G26519、`battle/results-gameui.jpg`、A:results1 | 基本一致 | 灰色网点底 + 去色主角立绘 + 红色闪电折线，EXP 星芒 + 黄色 BONUS! 贴纸、MONEY ¥ 红牌、ITEM 灰条（无掉落时 NONE），数字计数 0.9s，块错开 80ms 甩入，右下 NEXT。**偏差**：原作之后还有 LEVEL UP 卡，未做 |
| 开战转场 | takeover@00:16→00:19、V:gs50@09:14 | 部分一致 | 黑/红/奶白三片斜切 + 红色十角星擦除 + 碎片。原作的「面具撕下」没做 |
| 敌方回合 | takeover@01:22、V:gs50@00:58 | 部分一致 | 敌人前冲残影、红闪、Joker 压扁、伤害数字、对应队伍卡抖动掉血；原作左上行动名条未做 |

## 3. 原创补充（原作没有，按 P5R 语言补）

| 项 | 理由 |
|---|---|
| 右上 AUTO / x1 / II | 契约 `hud.system` 必填；原作用手柄键提示。做成黑色斜切小牌，命中区 86×86 |
| 回合数 + 行动顺序小头像 | 契约 `hud.order` 必填；P5X 式，挂在原作名牌条下面 |
| 敌人头顶名牌/已知弱点/HP 条 | 契约 `hud.enemyOver` 必填；原作要按 ORDER→ANALYSIS 才能看 |
| 指令中文小字 | 原作日版是日文说明，这里同版式换中文 |
| NAVI 导航 | 本作自创角色（包 F 伪官方），替代 Morgana |
| Joker 背影立绘、宫殿战斗背景 | 原作是 3D 模型；官方无背影素材 → generate_image（manifest 标 generated） |
| 交涉 DOM 模板 | 原作是选项斜条，本作模板保留选项斜条版式（白底黑字斜切、按下变红），自由输入留给 App 的 AI 桥 |

## 4. 时长（skin:timing 简版，`tools/out/check.json`）

844×390、res 0.25（去掉软件光栅瓶颈，帧间隔接近真实）。数值 = 实测墙钟 ms / 上限 ms；全部 `forced=false`。

| recipe（duration） | 1×完整 | 1×极简 | 2×极简 | 3×极简 |
|---|---|---|---|---|
| transition.battleStart（860） | 869/900 | 315/350 | 161/175 | 83/117 |
| skill.eiha（1500，停帧 70） | 1583/1800 | 567/600 | 267/300 | 165/200 |
| action.attack（960，停帧 60） | 1031/1800 | 567/600 | 270/300 | 163/200 |
| action.guard（520） | 533/1800 | 531/600 | 267/300 | 188/200 |
| action.enemy（1100，敌方） | 1150/1500 | 467/500 | 217/250 | 137/167 |
| turn.start（240） | 250/300 | 67/100 | 17/50 | 15/33 |
| onemore（420） | 434/450 | 217/250 | 102/125 | 53/83 |
| unit.down（460，重叠层） | 469/500 | 167/200 | 67/100 | 35/67 |
| holdup（950） | 967/1000 | 367/400 | 162/200 | 99/133 |
| allout.default（3060，定格 780） | 3066/3500 | 1169/1200 | 572/600 | 366/400 |
| battle.end（1300） | 1300/1500 | 465/500 | 215/250 | 134/167 |

另：skill.cleave 1500、skill.sukunda 1200、action.gun 900、action.item 760、talk.start 700、talk.result 1000 通过加载期校验（不在主流程里）。
校验（`recipes.ts validate`，加载时跑，0 error）：duration ≤ 上限、**duration + 停帧 ≤ 上限**（新增：停帧冻结演出时钟，墙钟会超）、展开后轨道 ≤64、at+dur ≤ duration、粒子 at+life ≤ duration、hitMarks 升序且末个 ≤ duration−200、原语单项上限、rgbSplit/shockwave <150ms 警告、未实现原语警告、拒绝 handlers。

## 5. Director / 硬规则自检（`tools/out/check.json`）

| 项 | 结果 |
|---|---|
| 时长上限 ÷ 倍速、到点 abort + 清场 | 上表 0 次强制推进；早期版本敌方 action 极简下被强制推进（停帧没算进压缩），已修：极简压缩目标 = 上限 − 停帧 − 一帧余量，停帧按倍速缩短 |
| 跳过总攻：finishCard 闪现 ≤150ms 再清场 | 定格画闪现期间可见、132ms 后清场、之后不可见 |
| payload 深冻结（§0.11） | structuredClone + 深冻结；写嵌套属性无效，规则状态不变 |
| 输入缓冲上限 2、保留最新 | 演出中连点 5 次 → 缓冲 [k3,k4]，演出后依次执行；同一 action key 不执行两次（action key 带战斗编号） |
| 重叠层 unit:down + 横幅期间去文字轨 | 两次 unit:down 都和 1 MORE 横幅重叠，DOWN 字样被丢、只播倒地 + 烟尘（日志 `dropText unit.down`） |
| 清场 | 每次演出后：粒子 0、引擎滤镜 0、cut-in/总攻/转场层可见节点 0、伤害层节点 0 |
| 同屏滤镜 | 实测引擎滤镜峰值 1（色差与冲击波已错开）；皮肤滤镜未用（manifest.filters=[]） |
| 粒子 | 高档峰值 410（技能命中）/ 240（总攻），≤600；中/低档上限 300/150 |
| 命中区 | 11 个指令全部次 ≥86、主 ≥96，全在 `hud.command`（780–1256 × 220–696）内，同组无重叠；667×375 下次 86 = 44.8pt、主 96 = 50pt |
| 竖屏 390×844 虚拟横屏点击 | PERSONA/ORDER/ITEM/BACK 6 次屏幕坐标点击全部命中（触摸经 root/view 统一变换；DOM 叠加层用同一矩阵） |
| 主线程帧时间（不测 fps） | 各阶段中位数 0.6–4.7ms；单帧最大 12–19ms 在演出中、待机最大 42–58ms（见遗留 3） |

## 6. 预算（`tools/out/budget.json`）

| 项 | 实测 | 上限 |
|---|---|---|
| 首包合计（代码 gzip + 图 + 字体） | 704 KB | 1.5 MB |
| 代码（JS + HTML，gzip，不含未加载的 WebGPU/Canvas 渲染器） | 222 KB | — |
| 皮肤份额：图 / 数据 / ui.css / 字体 | 431 / 8.7 / 0.8 / 50.3 KB = 491 KB | 780 / 40 / 24 / 120（合计 ≤1 MB） |
| 首包图张数 | 9（含 2 张图集） | ≤14 |
| 最大单图 | allout.finish.default 1280×720 119 KB | ≤200 KB |
| 背景出血 | 2260×960 | 宽 ≥2240 |
| 常驻纹理（解码） | ≈19 MB | ≤96 MB |

素材 source：official 7 张（敌人 ×2、cut-in、总攻定格画、队伍图集、HUD 头像图集、结算去色立绘），generated 2 张（宫殿背景、Joker 背影）。HUD 头像图集里 navi 头像来自包 F 伪官方图，整张按更严的 official 标、note 写明。
字体：R5 Latin Display 8.9 KB + R5 Num 10.3 KB（原样）+ R5 CJK 31 KB（从 R5 Title SC 分片按 labels 实际用到的 177 字抽子集，6 个 unicode-range 分片）。沙箱没有系统中文字体，所以 body 文字也走 R5 CJK；真机上 body 走系统字体栈。

## 7. 截图

最后一次拍摄（1920×1080 首次因软件 GL 启动超过 90s 超时，加长等待后重拍通过）：667×375（dpr 2）、844×390（dpr 2）、1024×768、1180×820、1920×1080（dpr 1：软件 GL 下 dpr 2 单尺寸要几分钟，布局按 CSS 像素，与 dpr 2 一样）。每尺寸 7 张 + `contact-<尺寸>.png`；`compare-*.png` 7 张（要求 3 张，多做了 cut-in/1 MORE/HOLD UP/RESULT）。

## 8. 契约问题与提案（给 v1.3）

1. **`hud.system` 槽位放不下 3 个 86 命中区**：x 1000–1256 宽 256 < 3×86=258，y 24–90 高 66 < 86。本作用 x 998–1256、y 24–110。建议改为 x 990–1256、y 24–110。
2. **action 两档上限需要 match 区分**：§3 我方 1.8s / 敌方 1.5s，但 `Recipe.match` 没有 side。本作加了 `match.side` 和 `ActionPayload.side`（类型里已标注为提案）。
3. **duration + 停帧必须 ≤ 上限**：hitStop 冻结演出时钟，只校验 duration 会在墙钟上超。已写进校验，建议写入 §2/§7.1。
4. **hud.party 在左下与「原作 1:1」冲突**：P5R 队伍在右下，但右下给了指令区。保留契约，红色皮按镜像布局处理；如果要更像原作，可以考虑允许「指令区左下 + 队伍右下」作为第二套槽位（左手操作）。
5. 图集新增 `frames` 字段（name→[x,y,w,h]）；Manifest.fonts 新增 `unicodeRange`（中文分片必需）。
6. `dim` 的淡入淡出语义契约没写：本作 = 淡入 min(120, 30%)、淡出最后 30%；`hold:true` 不淡出。

## 9. 遗留

1. **原语未实现**：blockPush、tvStatic、glassShatter、cardFlip、cardShatter、dateFlip、skinFilter（P3/P4 用到；运行时按「已播完」处理并记日志）；highlight/SHOWTIME recipe 没做；音效只记日志（没有音频素材）。
2. **Director 简版**：没接 Dexie / checkpointId（规则层用内存日志 + action key 模拟「先提交再演出」）；env:change 排队、map:encounter 合流没做；rewarm 只做了 300ms 合并 + 同尺寸跳过；演出中指令区隐藏，所以 UI 上点不到缓冲（缓冲用钩子测过）。
3. **待机偶发 40–58ms 主线程帧**：syncHud 每次重建名牌条/敌人头顶的 Text（重新光栅化）。应改成复用 Text 只改内容，或换 BitmapText。
4. 同伴不行动（只有 Joker 出招），BATON PASS 只显示不生效；没有 LEVEL UP 卡、面具撕下转场、1 MORE 去色。
5. 立绘没拆 5 层（meshIdle 用多边形 swayZone 做衣摆和头发）。
6. 交涉模板只做了离线三选项（规则判定），没接 AI 桥。
7. 真机帧率没测（沙箱无 GPU），帧时间只是主线程数据。
8. skin:check 的 AST import 白名单、对外打包拦截 official 素材，还没做成独立命令（加载期校验只覆盖 schema/时间轴）。

## 10. 复现

```
cd /workspace/work/umbra-next/m3
python3 tools/prep_assets.py && npm run prep        # 出图、字体子集、manifest
flock /tmp/p5r-heavy.lock npm run build             # tsc + vite build
python3 serve.py 8766 &                             # http://127.0.0.1:8766/?demo=1
tools/run.sh shots 844 390 dpr=2                    # 7 状态截图
tools/run.sh check                                  # 时长/命中区/竖屏/跳过/冻结/缓冲
python3 tools/budget.py && python3 tools/sheets.py  # 预算、拼图
```
