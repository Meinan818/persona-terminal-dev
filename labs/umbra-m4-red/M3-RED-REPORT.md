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

---

# 第二阶段（2026-10-22 收尾）

> 第二阶段①已推送（6403752：队伍名单驱动、官方同伴头像/cut-in/人格面具召唤、四人行动、BATON/SWITCH/SHOWTIME/LEVEL UP 原型）。本节是第二批：UI 打磨、HUD 只在变化时重建、每名同伴总攻收尾立绘、D-004 `?enemies=1..5` + `enemyLayouts[1..5]`、P3/P4 原语 demo、关键姿态形变/敌人漂浮/披风飘动、3 段 clip，以及下面的修正与自检。

## A. 本批修正

| 问题 | 处理 | 验证 |
|---|---|---|
| 1920×1080 / 1024×768 的 1 MORE 截图灰白一片 | 原因：闪白（白 0.45、90ms）按真实时间衰减，软件光栅一帧 >90ms 时定格帧正好停在闪白峰值；同时画面整体去色。改：闪白降到 0.30 / 70ms；截图改在 t=280（闪白 140–210 结束、横幅完整）拍，并等闪白不可见 | 5 尺寸 1 MORE 帧平均亮度 33–45（之前 144–154），饱和度 11–15（世界去色）、红黑横带保留 |
| 1 MORE 粒子越界 | 时长改 420 后粒子 150+280 超出 duration（加载期校验报 error）→ life 260 | 校验 0 error |
| 字体缺「咔」（还发现缺「潜」，「潜入」按钮） | R5 Title SC 全部分片都没有这两个字。新增 `tools/synth_glyphs.py`：用同字体部件拼合成字形（咔 = 吐的口字旁 + 卡横向压缩；潜 = 消的三点水 + 替横向压缩），出 `r5-cjk-synth.woff2`（0.7 KB，同 family `R5 CJK` + unicode-range）。`subset_fonts.py` 缺字时自动调用 | `missing` 为空；笔画粗细与原字体一致 |
| 1/3/5 只敌人时 HOLD UP 包围剪影压住队伍卡 | `setHoldRing` 遍历敌人数组：按敌群宽度展开包围，剪影脚底夹在队伍卡**实际**包围盒（当前行动者卡上浮 + 倾斜，顶边 579）之上，左右不出可视区、不压 HOLD UP 指令盘 | 新增 `tools/enemies.mjs`：n=1/3/5，逐个敌人选目标（准星 + 头顶名牌）、HOLD UP（包围剪影 + 标题）、敌方回合，求包围盒与可见 HUD（指令盘命中区、队伍卡、顶栏、系统键、HOLD UP 标题）以及名牌之间的交集。1280×720：n=1/3/5 **0 重叠**；844×390：n=1/5 **0 重叠**。截图 `shots2/1280x720-{18-target,19-holdup,20-allout,21-enemyturn}-n{1,3,5}.png` |
| 预演期日志混进实战错误 | 预演时队员素材还在懒加载（`char.joker not loaded`）属预期，改记到 `M.rehearseErr` | — |

测试钩子新增 `__umbra.forceHoldup()`（全体倒地直接进 HOLD UP）、`__umbra.enemyAct()`（进敌方回合）。

## B. 自检结果（`tools/check.mjs` → `tools/out/check.json` 的 `gates` / `idle`）

| 指标 | 要求 | 实测 | 结果 |
|---|---|---|---|
| 1 MORE 完整档墙钟 | ≤450ms | 433ms（duration 420） | 通过 |
| 跳过总攻：定格画闪现 | ≤150ms | 131ms（director 120ms + 一帧），闪现期间可见、之后不可见 | 通过 |
| Guard 完整档 | ≤3× 极简档上限（3×600） | 520ms | 通过 |
| Attack 完整档 | ≤3× 极简档上限（3×600） | 1100ms | 通过 |
| 全部 recipe 1×完整 / 1×极简 / 2× / 3× | 墙钟 ≤ 上限，0 次强制推进 | 0 超限、0 forced | 通过 |
| 命中区 / 竖屏点击 / payload 冻结 / 输入缓冲 / 清场 | 同第一阶段 | 全部通过，0 页面错误 | 通过 |

| recipe（duration） | 1×完整 | 1×极简 | 2×极简 | 3×极简 |
|---|---|---|---|---|
| transition.battleStart（860） | 867/900 | 317/350 | 150/175 | 83/117 |
| action.guard（520） | 533/1800 | 533/600 | 267/300 | 174/200 |
| skill.zio（1700，召唤） | 1783/1800 | 567/600 | 264/300 | 167/200 |
| action.attack（1100） | 1160/1800 | 567/600 | 267/300 | 167/200 |
| onemore（420） | 433/450 | 217/250 | 100/125 | 50/83 |
| unit.down（460，重叠层） | 472/500 | 167/200 | 67/100 | 33/67 |
| holdup（950） | 967/1000 | 367/400 | 167/200 | 100/133 |
| allout.default（3060） | 3067/3500 | 1166/1200 | 575/600 | 367/400 |
| battle.end（1300） | 1316/1500 | 467/500 | 217/250 | 133/167 |

**待机帧时间（重测，844×390、res 0.25，指令轮静置 6s，360 帧）**：主线程中位 0.5ms、P95 1.9ms、最大 4.4ms、>16.7ms 帧 0 个，帧间隔中位 16.7ms。第一阶段待机最大 42–58ms（每次 syncHud 重建 Text）已消除。流程中 `idle` 段（指令之间的切换帧，含打开列表/结算）最大仍有 21–38ms，来自模式切换时一次性建列表/结算 Text，不是待机常驻。

## C. 画面对照表（第二阶段增补，含召唤）

截图：`shots/<尺寸>-*.png`（5 尺寸 × 7 状态，重拍）+ `shots/contact-*.png` ×5 + `shots/compare-*.png` ×8（新增 `compare-summon.png`）；第二阶段全套 `shots2/844x390-*`、`shots2/667x375-*`、`shots2/1920x1080-*`。

| 状态 | 原作参考 | 一致 | 说明 / 偏差 |
|---|---|---|---|
| 人格面具召唤 | takeover@01:20（面具 → 蓝焰）、各角色召唤实机 | 部分一致 | 蓝色放射线底 + 行动者半身（官方立绘）抓面具 → 撕下 → 蓝焰 → 人格面具（官方渲染 + 离线烘焙蓝焰描边）升起 → 技能名牌 + 施放。**偏差**：原作是 3D 镜头绕角色、面具化为蓝焰；本作 2D 分镜，Queen/Violet 的面具用椭圆近似、Mona 无面具可撕（直接蓝焰） |
| 1 MORE | V:gs50@09:32 | 基本一致 | 已改为整屏去色（ColorMatrix 皮肤滤镜）+ 红黑横带 + 「1 MORE」剪报字 + 行动者眼部横条。**偏差**：世界压得偏黑（去色 + dim 0.22），原作偏中灰；停留 0.42s（契约上限 0.45s，原作约 0.6–0.8s） |
| 队伍卡 | G26499 | 基本一致 | 同伴本人官方头像墨线化；名单驱动可换 |
| BATON PASS | 原作击掌交接 | 部分一致 | 两人半身红/黑对切 + 手套相击星爆 + 剪报字。手套是矢量简画，比原作简陋 |
| SHOWTIME | P5R Showtime 定格画 | 松散参照 | 只用了官方定格画 + 标志 + 伤害，原作是一段专属过场动画，本作没有分镜 |
| 总攻收尾 | 各角色 Finishing Touch | 一致 | 每名同伴各自的官方 Finishing Touch 末帧作定格画（480–678 宽放大到 1280，偏糊） |
| 敌人数量 1–5 | — | 原创 | `enemyLayouts[1..5]` 站位；4–5 只时头顶名牌改紧凑版。n=3/5 时最右敌人有一部分在 Joker 背影后（世界层遮挡，不是 HUD 重叠） |
| LEVEL UP | P5R 结算后升级卡 | 部分一致 | 原型（结算后 1.2s 弹出）；版式参照原作但不是逐元素还原 |

## D. 视觉还原自评（1:1 目标，10 分 = 截图放在原作旁边分不出）

| 项 | 分 | 理由 |
|---|---|---|
| 指令轮 | 7 | 元素和字形齐，布局镜像（契约槽位） |
| 队伍卡 | 7 | 版式对，位置左下（原作右下） |
| 技能列表 | 7 | 版式对，位置/说明栏方向不同 |
| cut-in 眼部横条 | 8 | 官方图 + 撕纸边三层，最接近原作 |
| 人格面具召唤 | 5 | 节奏和元素对，但 2D 分镜代替 3D 镜头；部分角色面具近似 |
| 1 MORE | 7 | 去色到位，世界偏黑、时长偏短 |
| HOLD UP | 6 | 剪影包围是 2D 静态，原作镜头环绕 |
| 总攻 + 收尾 | 8 | 剪影斩击 + 官方收尾画；收尾画分辨率偏低 |
| RESULT | 7 | 版式对，LEVEL UP 只是原型 |
| BATON PASS | 5 | 动作对，手套简陋 |
| SHOWTIME | 3 | 只是定格画 + 标志，不是专属过场 |
| 开战转场 | 5 | 没有面具撕下 |
| 敌方回合 | 5 | 没有左上行动名条 |
| 场上角色 | 4 | 原作 3D 模型；本作背影是生成图替身 |
| **综合** | **≈6** | 静态 UI 7–8；演出 5–6；SHOWTIME / 场上角色是最大短板 |

## E. 已知差距

1. Queen（Johanna 召唤）/ Violet（Cendrillon）的面具用椭圆近似，不是角色真实面具轮廓。
2. Mona 无面具可撕，召唤直接蓝焰。
3. BATON PASS 手套是矢量简画。
4. 场上 9 人背影都是 generate_image 生成的替身（官方没有背影素材），manifest 标 generated。
5. SHOWTIME 只是松散参照（官方定格画 + 标志），没有原作专属过场分镜。
6. 1 MORE 世界偏黑（原作中灰），时长受契约上限限制。
7. 开战转场没有面具撕下；敌方回合没有左上行动名条。
8. 总攻收尾画来自 GIF 末帧，放大后偏糊。
9. 「咔」「潜」是合成字形（同字体部件拼合），不是原字体设计的字。
10. 3 段 clip（`shots/clips/`）是本批改闪白（0.45→0.30）之前录的，1 MORE 那一下闪白比现在亮；其余一致。
11. n=1 时 HOLD UP 导航仍说「它们」（文案没按数量变）。
12. 真机 GPU 帧率仍未测（沙箱只有软件光栅）。

## F. 素材缺口

| 角色 / 项 | 缺口 | 现状 |
|---|---|---|
| Crow · Loki | 没有官方渲染图 | 只记缺口、不顶替；召唤用 Robin Hood（P5R 官方） |
| Violet · Cendrillon | 没有官方渲染图 | 用 P5R 官方概念设定图 |
| Mona | 没有战斗眼部横条官方图 | 用官方对话 cut-in 裁切 |
| 全员场上背影 | 官方没有 | generate_image 替身（参考各自官方立绘） |
| 音效 | 无音频素材 | 只记日志 |
| 总攻收尾高清 | 只有 GIF（480–678 宽） | 放大使用 |

## G. 给 v1.3 的提案（新增事件）

| 事件 | 建议上限（完整/极简） | 说明 |
|---|---|---|
| `baton` | 0.6s / 0.25s | 本作 recipe 540ms。交接：两人半身甩入 + 击掌星爆 + 剪报字；payload `{ actorId, targetIds:[to] }` |
| `levelup` | 1.0s / 0.4s | 本作 recipe 900ms。结算后升级卡；payload `{ unitIds, stats }`，可与 RESULT 重叠（不阻塞 NEXT） |
| `highlight`（SHOWTIME，非新增） | 沿用 v1.2 的 3.5s / 1.2s | 本作 recipe 3300ms；建议在契约里写明 SHOWTIME 走 highlight、payload 带双人 id |
| `summon` 子轨 | 计入 action 上限，`summon: 'full' \| 'quick'` | 首次召唤 full、之后 quick（gen_recipes.py 已生成两版） |

另：`Manifest.fonts` 允许合成字形分片（`note` 写明合成来源）；`hud.party` 可选第二套槽位（右下）以贴近原作。

## H. 预算（`tools/out/budget.json`，本批重算）

| 项 | 实测 | 上限 |
|---|---|---|
| 首包合计（代码 gzip + 首包图 + 字体） | 628 KB | 1.5 MB |
| 代码（gzip） | 243 KB | — |
| 皮肤份额（图 325 + 字体 60 + 数据 16 + ui.css 0.8） | 402 KB | ≤1 MB |
| 首包图张数 | 11 | ≤14 |
| 最大单图 | 120 KB | ≤200 KB |
| 常驻纹理：首包 | 16.8 MB | ≤96 MB |
| 常驻纹理：首包 + 默认队伍懒加载（Skull/Mona/Panther） | 58.2 MB | ≤96 MB |
| 开战后默认队伍懒加载 | 1019 KB | 不计首包 |
| 其他角色（只在换人时加载） | 1804 KB | 不计首包 |

## I. 第二阶段复现

```
cd /workspace/work/umbra-next/m3
PYTHONPATH=/workspace/work/pyf-brotli python3 tools/subset_fonts.py && python3 tools/build_manifest.py
flock /tmp/p5r-heavy.lock sh -c 'npx tsc --noEmit && npx vite build'
sh tools/final_shots2.sh                          # 5 尺寸 × 7 状态 + 第二阶段全套（日志 tools/out/final.log）
TMO=420 tools/run.sh check                        # gates / idle / timing
tools/run.sh enemies 1280 720 n=1 shots=1         # 1–5 只敌人布局重叠检查（每次一个 n，避免超时）
python3 tools/budget.py && python3 tools/sheets.py
```

---

# 第四阶段（2026-10-22）：视觉还原推进

> 目标：自评 6 → ≥9（画面/UI/演出/素材 ≥90% 像原作；演出首要参考 P5X、其次 P5R；不为流畅砍演出）。**结论先说：本批做完 5 项，自评 6 → 7。没到 9，原因见 §4.4。** 主要瓶颈是原作的 3D 镜头/模型（场上角色、召唤、SHOWTIME 主题场景）在 2D 素材下做不到「放在旁边分不出」，另外音频文件一个都还没有。

## 4.1 本批改动（按收益排序）

| # | 项 | 做了什么 | 素材来源 |
|---|---|---|---|
| 1 | **SHOWTIME 重做**（`highlight.showtime`，3360ms + 停帧 70） | 按双人连携结构拆成 4 个新原语：① `comicPanels` 漫画分格开场（0–1000：三格斜切漫画框依次拍入，格内是两人官方眼部特写、网点、速度线，代号剪报字 + 「&」，每次拍入 40ms 白闪，镜头推近，最后两格向外撕开）+ SHOWTIME 剪报字砸下；② `duoEntrance` 人物入场（960–1900：红色放射线舞台 + 黑白斜带，两人官方全身依次甩入、落地压缩回弹、代号名牌、呼吸，最后蓄力下蹲 → 冲出）；③ `duoStrike` 合击（1840–2460：回到战场，HUD 隐去，两人剪影从左右对冲交叉斩过敌群，X 形巨斩 + 星爆，命中 2120 带停帧/震屏/RGB 分离/粒子）；④ 定格画 + `duoTitle`（2380–3340：「A × B」剪报标题逐字砸下 + SHOWTIME 红印章 + TOTAL DAMAGE）。默认组合 **Joker + Skull**（roster.showtime 第一位），其余 6 组（原作组合）同一套结构自动套用 | 全身：官方立绘（Joker = 官方素材包 F hero.webp；其余 Fandom 官方渲染），每组一张 `duo.<pair>` 图集（描边离线烘焙）。**Joker×Skull 定格画 `show.joker-skull` 是伪官方合成（原作 P5R 没有这一组），manifest 标 generated、待替换**；其余 6 组仍是 P5R 官方 SHOWTIME 截图 |
| 2 | **场上角色** | Noir、Crow 两张背影重新生成（原来 Noir 是侧身跳跃、Crow 太瘦），绿幕去溢色；9 张背影统一离线烘焙「3D 卡通模型」观感：外描边 + 左暗右亮 + 右侧（敌方向）红色轮廓光；敌方行动命中时被打队员走 `pose: recoil` 网格形变（后仰→回正），与已有的呼吸/摆动/出招（windup→dash→slash）形变连起来 | generate_image（伪官方，待替换）；官方没有 2D 背影 |
| 3a | **开战扯面具** | 新原语 `maskRip`（0–520）：红手套从右下扑上、手指扣住阴影白面具右上缘 → 向右下猛扯（面具翻转压扁飞出）→ 黑底溅开暗红黏液铺满 → 接原来的三色斜切 + 十角星（顺延到 300–860）。极简档跳过扯面具，只保留斜切 | 程序绘制 |
| 3b | **敌方回合左上行动名条** | `nameplate` 加 `side:'enemy'`：黑底红描边斜条 + 白色反向投影 + 属性圆标 + 技能名，上方红底小牌写出手敌人名（payload 带 `actorName`） | — |
| 3c | **1 MORE 中灰** | `skinFilter` 新增 `grey`：去色 + 提亮 18% + 对比 −22%，去掉原来的额外压暗（dim 0.22）。5 尺寸截图世界是中灰而不是黑 | — |
| 4a | **Queen / Violet 面具精确形状** | 不再用椭圆：同姿势官方「戴面具 / 不戴面具」两张立绘逐像素差分 ∩ 面具材质（低饱和金属灰 / 黑），取最大连通块；眼洞透空；Queen 被刘海遮住的上缘用凸包补齐并刷成面具本色。Noir 同法。扯面具时手改成指尖扣住面具右缘（不再整只手盖住面具），手套按角色配色 | 官方立绘（Fandom） |
| 4b | **Mona 召唤** | 无面具可撕：原地转身一圈蓄力 → 蓝焰从脚下卷起成柱 → Zorro 升起（**此做法凭记忆，未逐帧对过原作录像，标「待核」**） | — |
| 4c | **BATON 手套重画** | `glove2`：张开手掌（四指 + 拇指 + 掌 + 袖口 + 高光），按角色配色（Joker 红、Skull 黄、Panther 粉、Fox 蓝、Queen 黑、Noir 紫、Mona/Crow 白、Violet 深红）；星爆移到手套下层，相击时两手反弹 | 程序绘制 |
| 4d | **总攻定格画高清** | 9 人全部换官方 Finishing Touch 高清 PNG（3000×1680）缩到 1280×720，不再用 GIF 末帧放大；原图存 `red/assets/official/finish-hd/` | Fandom（Joker/Ryuji/Ann/Yusuke/Makoto/Haru/Morgana/Akechi/Sumire FinishingTouch.png） |
| 5a | **单敌台词** | n=1 时导航用单数：`navi.holdup.one`「倒下了！一口气解决它吧！」、`navi.idle.one`「敌人只有一只。先找出它的弱点！」 | — |
| 5b | **音效占位接口** | 新 `engine/audio.ts`（`AudioBus`）：按 AUDIO-MAP §6 读 `skins/p5r-red/audio/{playlist,sfx,voice}.json`；recipe 里的短 sfx id 经 `sfx.json.alias` 映射到 `se.*`；BGM 按 condition 匹配键最多者胜、池内按权重随机不连续重复、交叉淡化、loop 点；语音 `voice/<unit>/<key>_<nn>.opus`。**只请求 `present.json` 里登记的文件**（build_manifest 扫 `m3/audio-local/{bgm,se,voice}/` 生成）→ 缺文件完全静默，不发 404；一个文件都没有时不建 AudioContext。已挂：开战 battle.normal、HOLD UP holdup、胜利 victory、1 MORE/HOLD UP/胜利/SHOWTIME 语音、全部 recipe sfx | 清单按 AUDIO-MAP §2.1（R24–R39 子集）、§3、§4.1；音频文件本身 0 个 |

## 4.2 自检（不回退）

| 项 | 结果 |
|---|---|
| `tools/check.mjs`（gates / idle / timing / 命中区 / 竖屏 / 跳过 / 冻结 / 缓冲 / 清场） | 全部通过：1 MORE 434ms ≤450；跳过闪现 134ms ≤150；Guard 520、Attack 1100；全部 recipe 0 超限 0 forced；待机主线程 P95 1.9ms、最大 5.8ms、>16.7ms 帧 0；0 页面错误 |
| `tools/enemies.mjs` | 1280×720 n=1/3/5、844×390 n=1：**0 重叠**（含敌方回合新行动名条） |
| 新增/改动演出墙钟（`tools/p4timing.mjs` → `tools/out/p4timing.json`） | SHOWTIME 3432/3500、1175/1200（极简）、579/600（2×）、368/400（3×）；开战 867/900、317/350、143/175、82/117；敌方行动 1150/1500、466/500、217/250、133/167。0 forced，0 校验 error |
| 预算（`tools/out/budget.json`） | 首包 628 KB（≤1.5 MB）、皮肤份额 399 KB（≤1 MB）、首包图 11 张、最大单图 180 KB（≤200）、常驻纹理首包 16.8 MB / +默认队伍 58.3 MB（≤96）。高清总攻画只进各角色懒加载组 |

## 4.3 逐项重新自评（10 分 = 截图放在原作旁边分不出；对照 `shots4/compare4-*.png`）

| 项 | 二阶段 | 四阶段 | 对照原作说明差距 |
|---|---|---|---|
| SHOWTIME | 3 | **6** | 结构对了（分格开场 → 入场 → 合击 → 定格标题），节奏和 P5X 的漫画化演出接近。差距：原作 P5R 每组是**专属主题 3D 短片**（西部决斗、拉面、摔角擂台、教堂…，见 vidref f0071/f0267/f0393/f0617），镜头、场景、道具都不同；本作是一套 2D 通用模板。Joker×Skull 原作不存在，定格画是合成图 |
| 场上角色 | 4 | **5** | 观感统一了（描边 + 红轮廓光），Noir/Crow 变成真背影，受击/出招/呼吸都有网格形变。差距：原作是 3D 模型 + 镜头环绕 + 逐帧动作，本作仍是生成图替身 + 2D 形变 |
| 开战转场 | 5 | **6.5** | 有了扯面具 → 黏液 → 斜切。差距：原作是 3D 实拍（Joker 扑到阴影身上扯下），面具是具体阴影的面具；本作是程序绘制的通用面具 + 手套 |
| 敌方回合 | 5 | **7** | 左上行动名条 + 敌人名 + 受击后仰齐了。差距：名条细节（字体比例、图标）未逐像素对齐 |
| 1 MORE | 7 | **8** | 世界中灰对了。差距：停留 0.42s（契约上限 0.45s，原作约 0.6–0.8s） |
| 人格面具召唤 | 5 | **6.5** | Queen/Violet/Noir 面具形状精确、眼洞透空，手指扣面具边缘；Mona 不撕面具。差距：原作 3D 镜头绕身；Mona 做法待对录像 |
| BATON PASS | 5 | **6.5** | 手套有手形、按角色配色。差距：原作是两人手部特写实拍 + 加成文字条，本作是半身 + 矢量手 |
| 总攻 + 收尾 | 8 | **9** | 收尾画换官方高清原图，清晰度与原作一致（原作台词字样就在原图里）。剪影斩击段仍是 2D |
| 指令轮 / 队伍卡 / 技能列表 / RESULT / HOLD UP / cut-in | 7 / 7 / 7 / 7 / 6 / 8 | 不变 | 本批没动 |
| **综合** | **≈6** | **≈7** | 静态 UI 7–8；演出 6–7；总攻收尾 9；SHOWTIME / 场上角色 / 3D 镜头类演出是剩余短板 |

## 4.4 剩余缺口（为什么到不了 9）

1. **3D 镜头/模型类**：场上角色、召唤、HOLD UP 环绕、开战扑击、SHOWTIME 主题场景，原作全是 3D 实时演出。2D 静态素材 + 网格形变最多到 6–7。要再往上，只能拿到原作的逐帧动画素材（或 3D 模型自渲染序列帧），这超出「官方 2D 素材」的范围，需要主策划决定。
2. **场上背影**仍是 generate_image 替身（9 张，manifest 标 generated / 待替换）。官方没有 2D 背影图。
3. **SHOWTIME**：原作 9 组每组专属场景；本作只有一套模板。Joker×Skull 原作不存在（P5R 双人 SHOWTIME 没有这组），定格画是合成。
4. **音频**：接口、清单都在，文件 0 个（D-008：自行采集，不进公开构建）。演出没声音是「像不像」的一大块缺口。
5. Mona 召唤做法未对录像核实；1 MORE 时长受契约上限。
6. 「咔」「潜」仍是合成字形；真机 GPU 帧率仍未测。
7. 同一处失败两次跳过的：无（Queen 面具上缘的刘海去除试了 4 版才过，最终用凸包 + 眼洞以上暗色刷面具本色）。

## 4.5 素材

| 文件 | 来源 | 状态 |
|---|---|---|
| `allout.finish.default` + `finish.<8人>` | Fandom 官方 Finishing Touch PNG 3000×1680 → 1280×720（q72–80，≤191 KB） | 官方 |
| `duo.<7组>` | 官方立绘（hero.webp / Fandom 渲染），描边烘焙 | 官方 |
| `show.joker-skull` | 官方立绘合成 | **伪官方·待替换** |
| `back.noir` / `back.crow` | generate_image 重画（参考官方立绘） | 伪官方·待替换 |
| 9 张 `back.*` | 统一卡通描边 + 红轮廓光（离线烘焙） | 伪官方·待替换 |
| `char.queen/violet/noir` 的 mask 帧 | 官方戴/不戴面具立绘差分 | 官方 |
| 音频 | 无 | 缺 |

原图另存：`/workspace/work/umbra-red/red/assets/official/finish-hd/`（9 张）、`m3/work/party-src/p4/`（含 sources.json：每张 Fandom 页面 URL）。

## 4.6 截图与录像

- 5 尺寸 × 7 状态重拍：`shots/<尺寸>-*.png`、`shots/contact-*.png`、`shots/compare-*.png`；第二阶段全套 `shots2/`。
- 第四阶段关键帧（5 尺寸）：`shots4/<尺寸>-{41-start-*,42-showtime-*,43-enemy-*,44-onemore,45-baton}.png`，召唤 `shots4/844x390-46-summon-{queen,violet,mona}-*.png`；拼图 `shots4/contact4-<尺寸>.png`；对比表 `shots4/compare4-{showtime-open,showtime-entrance,showtime-strike,showtime-title,onemore,baton,enemyturn,summon-queen}.png`（视频参考帧带水印，只作对照）。
- clips（844×390，15fps，演出时钟逐帧推进）：`shots/clips/{showtime,summon-eiha,attack,allout,battlestart}.mp4`。

## 4.7 复现

```
cd /workspace/work/umbra-next/m3
pip install numpy scipy                                   # 面具差分
ONLY=chars python3 tools/prep_party.py                    # 角色图集/背影（>1 分钟；ONLY=show|bg|finish 分段）
python3 tools/gen_recipes.py && python3 tools/build_manifest.py
flock /tmp/p5r-heavy.lock sh -c 'npx tsc --noEmit && npx vite build'
sh tools/final4.sh                                        # 时长复测 → 5 尺寸截图 → 第四阶段关键帧 → clips（日志 tools/out/final4.log）
TMO=420 tools/run.sh check; tools/run.sh enemies 1280 720 n=1 shots=1
python3 tools/sheets.py && python3 tools/sheets4.py && python3 tools/budget.py
# 音频：把文件按 AUDIO-MAP §6.1 命名放进 m3/audio-local/{bgm,se,voice}/，重跑 build_manifest 即生效（不进仓库）
```

# 第五阶段（2026-10-22）：伪 3D 镜头 + 召唤 / HOLD UP / 开战 / SHOWTIME 镜头感

> 目标：自评约 7 → ≥9。**结论先说：本批 5 项都做了并逐项推送，综合自评 7 → 7.5，没到 9。** 卡点没变：原作是 3D 模型 + 实时镜头，场上角色官方根本没有 2D 背影/战斗姿态图（已搜，只有手办和同人渲染，不能用），只能做伪 3D。本批最大的改动是给引擎加了一个**镜头系统**，所有 3D 镜头类演出共用它。

## 5.1 本批改动

| # | 项 | 做了什么 | commit |
|---|---|---|---|
| 0 | **伪 3D 镜头（新 `engine/camera.ts` + 原语 `camera`）** | world 四个图层按景深视差（bg 0.35 / 敌 0.75 / 我方 1.15 / fx 0.75），伤害数字层跟敌人层。**待机**：镜头绕敌群缓慢环绕（两个不可公约周期叠加，不显循环），敌人层不动 → 命中区、头顶名牌、准星都不偏；背景反向、前景背影同向。**演出**：`camera` 原语 keys 给推/拉/摇/滚 + 焦点（`$target`/`$actor`/`$enemies`/`$center`），结束后 180ms 指数回落到待机，跳过时直接归零。已挂：技能施法（推向目标 + 微滚）、普攻（随冲刺推近）、敌方行动（转向被打队员）、开战落位、HOLD UP、SHOWTIME 合击。极简档全部 skip | e94a584 |
| 1 | **场上角色**（伪 3D） | ① 镜头环绕时背影按透视微倾（脚底不动、头部随视角偏）；② 新增动态加色轮廓光层：位置随镜头方向移动（光源固定在敌方一侧），强度随呼吸起伏、出招前倾时加强；③ 呼吸/受击后仰/出招形变保留；④ 背景放大到 1.1 给镜头留边（4:3 拉远不露边） | e94a584 |
| 2 | **人格面具召唤** | 召唤 cut-in 内加镜头：手扣面具时**推近**到面具（×1.5）→ 扯下时顿挫滚转 → 蓝焰爆开**猛拉远**（×0.84）+ 低角度、焦点移到人格面具 → 末段缓推。人格面具改成从下方升起、体量放大到压过人物（×1.35→1.8），显形前是蓝色剪影、随显形褪回本色。**Mona 做法核对**：原作 Mona 不撕面具（CBR《5 Weird Facts About Morgana's Body》：「he doesn't need to rip it off of his face to summon his Persona」），现做法（转身蓄力 + 蓝焰）方向正确；具体动作仍未逐帧对录像 | e94a584 |
| 3 | **HOLD UP 环绕镜头 + 包围构图**（新原语 `holdupRing`） | 4 名队员（官方全身图本色 + 黑投影 + 敌方向红轮廓光）依次从上方跃入，镜头绕敌群转约 70° 后停在包围站位；后排压暗缩小、排到敌人身后，前排在前（敌人层临时 zIndex 排序）；场上背影淡出让位。`camera` 同时给斜俯推入 + 滚转。HOLD UP 字移到 160ms 砸下、青色碎片保留（对照原作 V:gs50@01:00 帧）。菜单态的包围站位也从红色剪影改成本色人物，站位常量 `HOLD_SPOTS` 两边共用，镜头终点与菜单态一致无跳变。删掉原来的 silhouetteDash 横穿 | e94a584 |
| 4 | **开战 d-panels** | 三色斜切面板不再是纯色块：加 P5 印刷质感（网点渐变、速度线、白色切边）；纸色面板上插入领队眼部横条（官方 cut-in 素材，黑底，P5 式去掉蓝泡泡）；面板缩短到 500ms 提前退场，露出镜头从近处斜摇落位 | 6a0d67d |
| 5 | **SHOWTIME 镜头感** | 入场段加手持式镜头：跟 A 落地 → 甩到 B → 拉回双人构图 → 蓄力推近 → 冲出猛推 + 滚转。合击段 world 镜头：从敌群上方斜俯推入，命中帧猛推 + 反向滚转，再缓推进定格画。**每对专属标题接口**：`labels['showtime.title.<a>-<b>']` 存在就用它替代「A × B」；定格画已是 `show.<pair>` 每组独立 | e94a584 |

## 5.2 自检（不回退）

| 项 | 结果 |
|---|---|
| `tools/check.mjs` | 全部通过：1 MORE 440ms ≤450；跳过闪现 129ms ≤150；Guard 520、Attack 1100；4 档倍速 × 完整/极简 0 超限 0 forced；0 页面错误；清场计数与第四阶段一致（fx:1 为原有常驻）。待机主线程 P95 **3.2ms**（四阶段 2.3–1.9）、最大 5.4ms、>16.7ms 帧 0 —— 每帧多了镜头 + 轮廓光计算，仍远低于预算 |
| `tools/enemies.mjs` | 1280×720 n=1/3/5、844×390 n=1：**0 重叠**（待机环绕不动敌人层） |
| 预算 | 首包 631 KB、皮肤份额 399 KB、首包图 11 张、最大单图 180 KB、常驻纹理 16.8 / 58.3 MB —— 本批没加素材 |

## 5.3 逐项自评（10 分 = 截图放在原作旁边分不出）

| 项 | 四阶段 | 五阶段 | 差距 |
|---|---|---|---|
| 场上角色 | 5 | **6** | 有了 3D 镜头的视差和透视、会动的轮廓光；但人物本身仍是生成的 2D 背影，不会转身、没有逐帧动作 |
| 人格面具召唤 | 6.5 | **7.5** | 推近 → 扯下 → 拉远仰拍、人格面具在身后显形，镜头结构对了。差距：原作在战场上 3D 实拍、绕身旋转；本作是 cut-in 胸像；vidref 里没有 P5R 召唤片段，只能凭记忆对 |
| HOLD UP | 6 | **7.5** | 环绕 + 包围 + 斜字 + 青色碎片接近原作帧。差距：原作人物是 3D 持枪姿态，本作是官方立绘（姿态不是持枪包围） |
| 开战转场 | 6.5 | **7** | 面板有了印刷质感 + 眼部横条 + 镜头落位。差距：扑击扯面具仍是程序绘制 |
| SHOWTIME | 6 | **6.5** | 镜头会动了。差距没变：原作每组专属 3D 主题短片，本作一套 2D 模板 |
| 敌方回合 / 1 MORE / BATON / 总攻 | 7 / 8 / 6.5 / 9 | 7.5 / 8 / 6.5 / 9 | 敌方回合多了转向镜头 |
| **综合** | **≈7** | **≈7.5** | |

## 5.4 剩余缺口（为什么到不了 9）

1. **官方没有场上素材**：背影 / 战斗姿态 / 持枪姿态都只存在于 3D 模型里。要 ≥9，只能用原作 3D 模型渲染序列帧（或录像抠帧），这超出「官方 2D 素材」范围，需要主策划决定。9 张背影仍是 generate_image 伪官方。
2. **召唤没有原作参考帧**：vidref 只有 P5R 总攻和 SHOWTIME 两段。需要补一段 P5R 战斗召唤录像才能逐帧对。
3. SHOWTIME 每组专属场景、Joker×Skull 定格画（伪官方）不变。
4. 音频 0 个文件（接口已就绪）。
5. 真机 GPU 帧率仍未测（镜头系统是每帧 4 个图层变换，开销很小，但未在手机上实测）。
6. 失败两次跳过的：无。

## 5.5 截图与录像

- 拼图：`shots5/contact5-<尺寸>.png`、`shots5/contact5-summon-844x390.png`。
- 第五阶段关键帧：`shots5/<尺寸>-{51-idle-a,51-idle-b,53-holdup-*,54-start-*,55-showtime-*}.png`（844×390 / 667×375 / 1024×768 / 1180×820 / 1280×720 / 1920×1080），召唤 `shots5/844x390-52-summon-{queen,violet,mona}-{a-push,b-rip,c-burst,d-reveal,e-cast}.png`。
- clips（844×390，15fps，本批全部重录）：`shots/clips/{summon-eiha,attack(含 HOLD UP 环绕),showtime,battlestart}.mp4`（allout 沿用第四阶段）。注：中途沙箱重启清空 /tmp，clips 帧缓存已改到 `work/clip-tmp`。

## 5.6 复现

```
cd /workspace/work/umbra-next/m3
python3 tools/gen_recipes.py && python3 tools/build_manifest.py
flock /tmp/p5r-heavy.lock sh -c 'npx tsc --noEmit && npx vite build'
sh tools/final5.sh                       # 6 尺寸关键帧 + 召唤 + clips（日志 tools/out/final5.log）
TMO=600 tools/run.sh check; tools/run.sh enemies 1280 720 n=1   # n=3 / n=5 / 844 390 n=1 分开跑
```

## 5.7 10-22 修复：手机尺寸 HOLD UP 菜单后排被挡

- 问题：844×390、667×375（1280×720 同样）HOLD UP 菜单里后排两人（Joker、Skull）几乎被前排（Mona、Panther）整个挡住；右侧两人被指令区左缘夹紧后叠在一起。
- 改法：`engine/hud.ts` 新增 `holdLayout()`，HUD 菜单静帧与 `holdupRing` 环绕终点共用（交接无跳变）。前排守左右两翼、后排抬高（脚底 cy−75）缩小（0.74）并放进敌人层底部（站在倒地敌群身后）；四人沿「可视区左缘（宽屏出血取一半）～ HOLD UP 指令区最左命中区 −12」等分站位，两翼整张立绘框都在可视区内、右翼不进指令区，脚底不压队伍卡；人均宽度不够时整体缩小（≥0.8）。后排压暗从 0.62 调到 0.78（菜单 0xc8）。
- 自检：`tools/check.mjs` 全过（overCap/geometryBad/overlaps 全空，idle over16=0）；`tools/enemies.mjs` 844×390 / 667×375 / 1280×720 × 1/3/5 只敌人：0 重叠；新增后排遮挡比例（包围盒口径）844 ≤0.139、667 ≤0.143、1280 ≤0.138（阈值 0.6）。enemies.mjs 的包围量测改为只量本体 Sprite、前后排两容器都量。
- 截图：`shots5/<尺寸>-53-holdup-{a,b,c,d}.png` 6 尺寸重拍（仓库 `labs/umbra-m3-red/shots/p5-*-53-holdup-*.jpg`）。
- 复现：`npm run build && sh tools/final6.sh`（日志 tools/out/final6.log）。
