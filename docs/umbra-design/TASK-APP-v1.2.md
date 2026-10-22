# 幽影协议 UMBRA · App 任务书 v1.2（定稿）
> **✅ 开工令（10-22，主策划）**：本任务书 v1.2 定稿，评审结束，可以开工。
> - 分支：从 `origin/feat/theme-kit-integration` 拉 `feat/umbra-app-m2` 开发，不动 main，不 reset/stash/clean，不改 `src/umbra/skins/` 下任何主题目录。
> - 本阶段只做**最小切片（12–18 人日）**，按顺序：① 规则层单一 TS 源（去 @ts-nocheck、删 public/umbra-demo 重复 JS）+ 无头模拟器 → ② 图鉴 2.2MB 分片懒加载 → ③ UmbraRuntimeBridge + UmbraSaveV4（checkpoint 先落库）+ env 快照 → ④ Director（§3/§3.1/v1.2）→ ⑤ registerSkin 按主题动态加载 + 预热钩子 + 安全区/虚拟横屏 → ⑥ skin:check。
> - 每完成一步：跑 §7.1 对应验收、提交并推送，在 `docs/umbra-progress/app.md` 写一行「完成了什么 / 验收结果 / 下一步」。旧 umbra-demo 入口保持可用，直到 M5。
> - 遇到本文没写到的取舍，写进进度文件等主策划答复，不要自己改契约。
> - 主题皮肤包会由用户以 zip 转给你：**原样**解压到 `src/umbra/skins/<身份>/`，在 `feat/umbra-skin-<身份>` 分支提交推送，不改内容、不评价、不和主题 AI 沟通。
> 本文件只给 App 总负责 AI，**不用和主题 AI 沟通**。

| 本版相对 v1 改了什么 | 位置 |
|---|---|
| ①payload/BattleView/掉落/意图深冻结或拷贝 ②删除 handlers ⑪新增硬规则 11 | §0、§7.1-2/6 |
| ③先提交再演出+幂等 ④主线+1 条重叠层、优先级 ⑤缓冲满保留最新 ⑥encounter+battleStart 组合预算 ≤1.2s 可合流 | §3、§3.1、§7.1-2 |
| ⑦画质测量口径 ⑧粒子总上限 600/300/150+滤镜白名单 ⑨设计坐标恒 1280×720 ⑩预热 300ms 合并/1.5s 回退 | §6、附 A |
| ⑪交涉 AI 桥 ⑫逻辑安全矩形 ⑬切皮肤释放旧资源；新交付：env 快照、env:change、交涉模板校验、命中区 86 | §7.1-3/5/7/8、附 B/C |

（文中 §1.x / §2 / §4.3 指母本章节，摘录见文末附 A–C。）

---

## 0. 硬规则（每条都会验收）

1. 皮肤代码只能 import `umbra/engine` 导出的 API 和 `skins/_contract` 类型，不准 import `rules/`、`ui/`、其他皮肤或 App 的 store。**禁止动态 `import()`、`require`、`import.meta.glob` 和任何副作用导入（`import 'x'`）。** 皮肤包里唯一的 TS 是 `index.ts`，只做组装和注册；**不允许写演出逻辑代码**（v1.1 删除 handlers），演出一律用声明式 recipe + §1 原语 + 素材/参数。
2. 皮肤不读写 localStorage / IndexedDB / Dexie，不发 postMessage，不发网络请求。AI 交涉：皮肤只给事件 id 和展示参数（§4.3），请求由 App 的 AI 桥发出。
3. 每个事件有时长上限（§3），按倍速缩放。到点没播完，引擎中止该演出、清场、推进。原语报错或素材加载失败 = 当作已播完，只记日志。规则结果在演出开始前已经提交（§3.1）。
4. 同屏全屏滤镜最多 2 个：引擎命中特效 1 个，皮肤 1 个。**「不占名额」只认白名单**（§1.6）；模糊、发光、Bloom 类全屏滤镜不在白名单，也不在皮肤滤镜白名单内，等于禁用。
5. 降画质只减数量和分辨率，**不减演出种类**。
6. 坐标一律用 **1280×720 设计像素**（16:9 安全框），任何画质档、任何保底降分辨率都不改变设计坐标，只改渲染像素。安全框外是出血区，只能放背景，不能放按钮和信息。
7. 可点的东西命中区：**次按钮 ≥86 设计像素，主按钮 ≥96**，必须在逻辑安全矩形内；指令类按钮放在 `hud.command` 内。（667×375 下设计→屏幕缩放 0.521：86 → 44.8pt；v1 的 84 只有 43.8pt，低于 44pt，作废。）
8. 演出播完必须清场：所有临时节点隐藏或回池，不留滤镜。
9. 只加载当前皮肤。皮肤之间不共享运行时状态。切换皮肤后，旧皮肤的纹理、字体、音效必须释放。
10. manifest 里每张素材标 `source: official | generated`。
11. 引擎交给皮肤（recipe 求值、DOM 模板填充）的所有数据——payload、BattleView、掉落、敌人意图、env——都是**深冻结或拷贝**的只读对象，改它不会影响规则状态。

---

## 3. 事件列表与时长上限

- 上限按 1 倍速；实际上限 = 上限 ÷ 倍速（2 倍速 onemore = 0.225s）。
- 到上限：引擎 `signal.abort()`，所有该 recipe 的节点回池、滤镜摘掉、时钟解冻，规则继续。**没有宽限期。**
- 点击跳过 = 直接跳到 recipe 末尾的清场状态。**例外：跳过 `highlight` / `allout` 时，若 recipe 含 `finishCard`，引擎先让定格画闪现 ≤150ms，再清场。**
- 皮肤没实现的事件：引擎默认演出兜底（红色样板的通用版本）。
- 演出级别：完整（首次看到）→ 标准（看过 3 次后）→ 极简（倍速 ≥2、自动战斗、或设置里选）。

| 事件 | payload（主要字段） | 完整/标准上限 | 极简上限 | 调度 |
|---|---|---|---|---|
| `battle:start` 开战转场 | enemyIds, ambush? | **0.9s**（目标 0.7–0.9） | 0.35s | 主线阻塞；紧接 map:encounter 时受组合预算 |
| `turn:start` | unitId | 0.3s | 0.1s | 主线阻塞 |
| `action` 普通技能/攻击（含 windup→hit→收招） | ActionPayload | **1.8s**（目标 1.2–1.8；普攻建议 ≤1.0） | 0.6s | 主线阻塞；`hitMarks` ≤ duration−0.2s |
| `action`（敌方行动） | ActionPayload | 1.5s | 0.5s | 主线阻塞 |
| `unit:down` | DownPayload（unitIds[], side） | 0.5s | 0.2s | **重叠层**（§3.1），主线不等它；与 banner/cutin 重叠时只播碎裂不出字 |
| `onemore` | unitId | **0.45s** | 0.25s | 主线阻塞 |
| `highlight` 必杀 | ActionPayload, short? | **3.5s**（简短版 1.2s） | 1.2s | 主线阻塞；**必须可跳过** |
| `holdup` | enemyIds | 1.0s | 0.4s | 主线阻塞，之后弹二选一 |
| `allout` 总攻 | AllOutPayload | **3.5s**（目标 2.8–3.5，定格 0.8） | 1.2s | 主线阻塞，可跳过 |
| `talk:start` | enemyId | 0.8s | 0.3s | 主线阻塞；之后进交涉界面（皮肤 DOM 模板，§4.3；规则统一） |
| `talk:result` | ok, reward? | 1.2s | 0.4s | 主线阻塞 |
| `battle:end` | win, rank, drops | 1.5s | 0.5s | 主线阻塞 |
| `scene:enter` / `scene:leave` | sceneId | 0.6s | 0.25s | 主线阻塞 |
| `map:move` | fromNode, toNode | 0.8s/节点 | 0.3s | 主线阻塞 |
| `map:encounter` | nodeType | 0.9s | 0.35s | 主线阻塞；**接 battle:start 时两者组合预算 ≤1.2s（极简 ≤0.7s），可合流** |
| `env:change`（v1.1 新增） | EnvChangePayload | 0.6s | 0.25s | 主线阻塞；只在主线空闲间隙播（不打断进行中的演出，排到下一个空隙） |
| `ui:open` / `ui:close` | uiId | 0.28s（目标 0.18–0.28） | 0.15s | **不进 Director**：HUD/DOM 自身过渡，动画中可点下一项 |

### 3.1 Director 调度规则（v1.1 新增，App 实现，皮肤需知道结果）

1. **先提交，再演出。** 所有阻塞事件：规则结果先在 Dexie 事务里提交（带 `checkpointId` 和 action key），提交成功后才发演出事件。同一 action key 只结算一次；重放、重进、连点都不会重复领奖或重复扣耗。皮肤异常、超时、切后台、连点**只影响画面**。
2. **两条轨道。** 阻塞主线（串行）+ 1 条可重叠短层。重叠层同时最多 1 个演出，计时独立（上限 ÷ 倍速，到点单独 abort 清场），不阻塞主线。v1.1 只有 `unit:down` 进重叠层；重叠层已占用时，新的 unit:down 让旧的直接跳到清场再开始。
3. **图层优先级。** 主线的 `banner` / `cutin` 高于重叠层的 `unit:down`；两者时间重叠时，引擎丢弃 unit:down 里的 `title` / `tag` / 文字类轨道，只播 `portraitDown`、粒子、sfx（只碎裂不出字）。
4. **输入缓冲。** 演出期间玩家输入进缓冲，上限 2；满了再来一个：**保留最新、丢弃最旧**。主线演出结束后依次执行，每个缓冲动作执行前按当前状态重新校验；同一 action key 不执行第二次，缓冲动作不得重复结算同一目标。
5. **组合预算。** `map:encounter` 紧接 `battle:start` 时按组合预算 1.2s（极简 0.7s）调度：
   - 皮肤提供带 `merges: ["battle:start"]` 的 recipe → 合流成一次演出，duration ≤1200，不再单独播 battle:start；
   - 否则顺序播，battle:start 实际上限 = min(0.9s, 1.2s − encounter 实际用时)。

---

## 6. 三档画质参数

演出种类三档完全相同，只调数量和分辨率。recipe 里写的数量都是高档值，引擎乘系数。

| 参数 | 高 | 中（默认） | 低 |
|---|---|---|---|
| 渲染分辨率 `res` | min(dpr, 2) | 1.5 | 1（保底再降 0.85） |
| 全屏滤镜分辨率 | res × 0.5 | 0.75 | 0.5 |
| 粒子系数 | ×1（技能 300） | ×0.6（180） | ×0.33（100） |
| **同屏粒子总上限**（v1.1） | **600** | **300** | **150** |
| 总攻每击粒子 / 烟尘 | 60 / 28 | 36 / 18 | 20 / 12 |
| cut-in 火星 | 40 | 24 | 12 |
| 速度线系数 | ×1 | ×0.7 | ×0.5 |
| 碎片类（glass/card/block） | ×1 | ×0.7 | ×0.5 |
| 网格顶点（meshIdle） | 8×12 | 8×12 | 6×8 |
| 同屏全屏滤镜上限 | 2 | 2 | 2 |

- 粒子总上限对所有 recipe、主线和重叠层合计生效；新发射会超限时，引擎按比例截掉这次发射的数量，已存在的粒子不提前回收。上限可按 spike/真机数据微调，改动走 v1.x。
- **设计坐标永远 1280×720。** 画质档和保底降分辨率只改渲染缓冲大小，舞台缩放补偿；安全框、命中区、插槽坐标不漂。虚拟横屏 ±90° 旋转时，触摸坐标 → 设计坐标的变换由引擎统一做，皮肤和 DOM 模板拿到的都是设计坐标。

自动降档（阈值待真机校准，数值沿用 v1）：
- **测量口径（v1.1 固定）**：窗 = 1 秒墙钟时间；样本 = render loop（Pixi ticker）每帧的主线程帧时间（相邻两次 ticker 回调的 `performance.now()` 差值）；每窗取中位数。**页面后台（`document.hidden`）、暂停、loading 遮罩显示期间的帧不计**，跨越这些状态的窗作废，不计入连续计数。
- 连续 2 个坏窗（中位数 >20ms）降一档；连续 5 个好窗（<14ms）升一档（不超过初始档）；换档后冷却 2 窗。
- 低档仍连续 2 窗 >25ms：渲染分辨率再降一级（1 → 0.85），设计坐标不变。
- 首次启动跑 1 秒基准定初始档，结果缓存；用户可在设置里锁定档位。

预热（标准流程，不做验收不过；**幂等、可中断、有预算**）：
1. 上传全部首包纹理 + 舞台；
2. 每个 manifest.filters 和引擎滤镜组合离屏渲染并读回 1 像素；
3. **在真实画布上按真实尺寸快进彩排**：每个皮肤的 1 个技能 recipe + 总攻 + 开战转场。彩排只在 `scene.loading` 遮罩下进行；单次彩排超时 1.5s 或真实画布不可用 → 放弃本次彩排、标记「冷启动」、照常进游戏，**不得卡住进入游戏**；
4. 转屏/改尺寸后 `rewarm()` 重做第 2、3 步的滤镜和遮罩部分：触发在 300ms 内合并为 1 次（以最后一次为准）；新触发会中断进行中的 rewarm；同一尺寸已预热过则直接返回。
实测：不预热首次技能最长帧 693ms → 只预编译 178–294ms → 彩排后 24ms。

---

## 7. 交付清单与验收

### 7.1 App 总负责 AI

交付：
1. `UmbraRuntimeBridge`：父→子只读快照（含 **env 快照**，见 7）；子→父 `commitRun` / `spendHeartPower` / `notifyError` / `exit`。
2. 演出调度器 `Director`，按 §3.1：
   - 所有阻塞事件**先 Dexie 事务提交规则结果再发演出**；维护 `checkpointId` / action key 幂等；
   - 阻塞主线 + 1 条可重叠短层（最多 1 个，计时独立）；banner/cutin 优先于 unit:down，重叠时 unit:down 去掉文字轨；
   - 按 §3 上限 ÷ 倍速计时，到点 abort 并清场；跳过时 finishCard 闪现 ≤150ms；
   - 输入缓冲上限 2，满时保留最新、丢弃最旧，执行前重新校验，同一 action key 不执行两次；
   - `map:encounter` + `battle:start` 组合预算 ≤1.2s（极简 ≤0.7s），支持 `merges` 合流；
   - `env:change` 排进主线空闲间隙；
   - 引擎发给皮肤的 BattleView / payload / 掉落 / 意图 / env 一律深冻结或 structuredClone；
   - 皮肤侧异常吞掉并 notifyError（同一演出只报 1 条）。
3. `UMBRA.registerSkin` 与按 App 主题只 import 当前皮肤包（宿主动态 import，保留开发用 `?umbra=<skinId>`）；切换皮肤时卸载旧皮肤（纹理 destroy、Assets.unload、字体/音效释放、引用清空）。
4. 预热钩子：加载期调用 `prewarm()` + `rehearse()`（loading 遮罩下，单次 1.5s 超时回退）；resize/转屏后调用 `rewarm()`（300ms 合并、可中断、幂等）。
5. 安全区：`env(safe-area-inset-*)` + `ResizeObserver` 算出**逻辑安全矩形**传给引擎，变化即通知重算，不传固定 inset；虚拟横屏默认开启。
6. 校验脚本 `npm run skin:check <skinId>`：schema 校验（含展开后时间轴 ≤ duration、hitMarks ≤ duration−200）、预算统计（含字体 120KB、粒子高档值）、source 标注、§0 import 白名单（AST 查静态 import，**并挡动态 `import()`、`require`、`import.meta.glob`、副作用导入 rules/、ui/**）、拒绝 `handlers` 字段、交涉模板白名单校验（§4.3）、ui.css 规则（§4.2）。
7. **env 快照（v1.1）**：Bridge 快照提供 `Env{date, weekday, weather, moonPhase, darkHour}`（§2）；date/weekday 用本地日期，moonPhase 由日期算，darkHour 取生活桥影时间加成时段，拿不到天气时填 `'unknown'`；值变化时引擎派发 `env:change`。
8. **交涉 AI 桥（v1.1）**：引擎只把皮肤给的 `{事件 id, enemyId, 回合, params.styleId}` 和玩家输入交给 App 现有 AI 桥；App 负责发请求、**请求预算**（单次交涉的请求次数/超时上限由 App 定，写进交付说明）、**脱敏**（不带凭据、不带 App 内部数据，只带交涉必要字段）；超时/取消跟随演出时钟和 `signal`，超时用规则给的兜底台词。交涉成败只由规则判定。

验收：
- [ ] 故障注入（测试专用开关绕过 skin:check）：测试皮肤 `onemore` recipe 写 10s、素材 Promise 永不 resolve：0.45s 后战斗继续，节点已清空，控制台只有 1 条 notifyError。
- [ ] 故障注入原语抛异常：胜负、伤害、掉落与无皮肤时完全一致（同种子跑无头模拟器对比）。
- [ ] 演出播到一半强杀进程再进：该次结果已提交且只提交 1 次（同 checkpointId 不重复领奖/扣耗）。
- [ ] 测试代码对冻结的 payload / BattleView 写属性：抛错或无效，规则状态不变。
- [ ] skin:check 能拦下：动态 `import()`、`require`、`import '…/rules/x'` 副作用导入、含 `handlers` 的 pack、含 `<script>` / `onclick` / 外链 `src` 的交涉模板。
- [ ] 2 倍、3 倍速下上限按比例缩小（日志打印实际上限）。
- [ ] 演出中连点 5 次攻击：只执行 1 次 + 缓冲 2 个（保留最后 2 次），不重复结算同一目标。
- [ ] 一次 action 击倒 2 个敌人 + 紧接 1 MORE：unit:down 合并为 1 次、在重叠层播放、不阻塞主线；与横幅重叠时无 DOWN 字样。
- [ ] 遇敌接开战：合流与顺序两种写法，总时长都 ≤1.2s（极简 ≤0.7s）。
- [ ] 画质日志按窗打印（中位数、是否计入）；切后台/暂停/loading 的窗不计入。
- [ ] 高档下同时触发 3 个 300 粒子演出：同屏粒子 ≤600。
- [ ] 虚拟横屏 ±90° 下点击 HUD 和交涉模板按钮，命中位置正确；低档 0.85 保底下命中区不漂。
- [ ] 1 秒内连续改尺寸 10 次：rewarm 只跑 1 次；人为让 rehearse 卡 5s：1.5s 后照常进游戏。
- [ ] 交涉 AI 请求超时/取消：演出按时推进，用兜底台词；抓包请求体无凭据和无关字段。
- [ ] 转屏、弹键盘后安全矩形更新，HUD 位置随之重算。
- [ ] 网络与内存：运行中只出现当前皮肤目录的请求；切换皮肤后旧皮肤纹理/字体/音效从内存释放（内存快照可见），不依赖浏览器缓存判定。
- [ ] env：改系统日期/进入影时间时，快照字段正确，env:change 只在主线空隙播出。

---

## 8. 未定 / 风险（M3 前解决）

1. 真机帧率尚未测（沙箱无 GPU）；§6 阈值、粒子总上限（600/300/150）和 §5 内存上限以真机/spike 数据修订。
2. `skin:check`、`skin:timing`、`rewarm()`、按方向旋转 ±90°、安全区逻辑矩形、字体子集、交涉模板填充器——spike 未实现，属 App/红色 M3 交付。
3. 立绘 5 层拆分效果未验证；官方素材无背影，需生成。
4. ~~`handlers` 权限边界~~ → v1.1 已删除 handlers，P3 菜单改用声明式 recipe + 交涉/HUD 模板 + ui.css 实现。若 M3 证明不够用，再由主策划发 v1.x 讨论，不在 v1 内开口子。
5. 事件名 `allout:start`/`allout:end` 合并为 `allout`、`action:windup`/`action:hit` 合并为 `action`（用 hitMarks 表达命中点）——与 GDD §10 草案不同，以本契约为准。
6. env 的天气数据源未定（App 侧），v1 允许 `'unknown'`；皮肤必须有 unknown 的兜底表现。
7. 交涉 AI 请求预算的具体数值由 App 在交付说明中给出，主策划 M3 审。

---

## 附录（母本摘录，供实现 Director / skin:check / Bridge 用；以母本为准）

### 附 A. 「不占全屏滤镜名额」白名单（母本 §1.6）


只有下列做法不计入 §0.4 的 2 个名额；白名单外任何作用于全屏或大面积图层的 Filter 都占名额：

| 白名单项 | 说明 |
|---|---|
| 预烘焙背景图 / 配色图（含 `bakedSwap`） | 静态位图替换 |
| `dim`、`flashScreen` | Graphics 矩形叠色 |
| `flashSprite` | 单精灵 ColorMatrix，面积 ≤ 该精灵 |
| `tvStatic` | 预渲染噪点平铺图 |
| `glassShatter` / `cardShatter` / `blockPush` | 网格或精灵切片，无 Filter |

**不在白名单**：Blur / KawaseBlur / Glow / Bloom / AdvancedBloom 等模糊、发光类全屏滤镜——不能以「背景」「配色」名义豁免，也不在 `skinFilter` 白名单里。

### 附 B. 契约类型（母本 §2，含 v1.1 新增 Env / DownPayload / EnvChangePayload / TalkTemplate / merges；handlers 已删）

```ts
// ---------- 基础 ----------
export type SkinId = 'p5r-red' | 'p4-yellow' | 'p3-blue' | 'p3r-pink';
export type Ms = number;                       // 毫秒，按 1 倍速写
export type Ease = 'linear'|'outCubic'|'inCubic'|'outQuart'|'inOutCubic'|'outBack'|'outElastic';
export type Layer = 'bg'|'enemy'|'ally'|'fx'|'dmg'|'hud'|'cutin'|'allout'|'trans';   // 从下到上
/** '$actor' 出手者 | '$target' 主目标 | '$targets' 全部目标 | '$party' 我方 | '$screen' 全屏
 *  | '$env' 当前环境 | '$prev' env:change 之前的环境 | '$env.<key>' 单个字段 | '#节点名'（本 recipe 创建的节点） */
export type Ref = `$${string}` | `#${string}`;
/** 数值可以写死，也可以引用 token：'@color.primary' */
export type Tok<T> = T | `@${string}`;
export type Vec = { x: number | Ref; y: number | Ref; dx?: number; dy?: number };

export type EventName =
  | 'scene:enter' | 'scene:leave' | 'battle:start' | 'turn:start'
  | 'action' | 'unit:down' | 'onemore' | 'highlight' | 'holdup'
  | 'allout' | 'talk:start' | 'talk:result' | 'battle:end'
  | 'map:move' | 'map:encounter' | 'ui:open' | 'ui:close'
  | 'env:change';                                            // v1.1 新增

// ---------- 一条轨道 = 一次原语调用 ----------
export interface Track {
  at: Ms;                    // 相对 recipe 开头
  dur?: Ms;                  // 瞬时原语可省
  prim: PrimitiveName;       // §1 的名称
  layer?: Layer;
  ease?: Ease;
  args: Record<string, unknown>;   // 原语参数（引擎按原语逐个校验）
  repeatEvery?: Ms;          // 语法糖：加载时展开成 times 条轨道，第 i 条 at = at + i×repeatEvery（v1.1 从 args 提到这里）
  times?: number;            // 与 repeatEvery 同时出现；展开后每条都必须 ≤ duration
  minimal?: 'keep' | 'skip' | Partial<Track>;  // 极简级别下怎么处理；默认 keep（按比例压缩）
}
export type PrimitiveName =
  | 'tween'|'show'|'hide'|'sfx'|'vibrate'|'title'|'dim'|'radialBurst'
  | 'hitStop'|'shake'|'flashSprite'|'flashScreen'|'squashHit'|'particles'|'afterimage'|'slashLine'
  | 'damageNumber'|'tag'|'shockwave'|'rgbSplit'
  | 'cutin'|'speedLines'|'banner'|'silhouetteDash'|'freezeFrame'|'finishCard'|'totalDamage'
  | 'slashPanels'|'maskWipe'|'blockPush'|'tvStatic'|'glassShatter'|'cardFlip'|'cardShatter'|'dateFlip'|'bakedSwap'
  | 'portraitDown'|'skinFilter';

// ---------- recipe ----------
export interface Recipe {
  id: string;                         // 'skill.eigaon'、'allout.default'
  event: EventName;
  match?: {                           // 选用条件，越具体越优先；都不匹配时用引擎默认演出
    skillId?: string; element?: string; actorId?: string; partySize?: number; kind?: 'phys'|'magic'|'heal'|'buff';
    env?: Partial<Pick<Env, 'weather'|'moonPhase'|'darkHour'|'weekday'>>;   // v1.1 新增
  };
  duration: Ms;                       // 必须 ≤ §3 的上限（1 倍速）；所有轨道（展开后）at+dur ≤ duration，粒子 at+life ≤ duration
  hitMarks?: Ms[];                    // 命中时刻；个数 = payload.hits.length；每个 ≤ duration−200
  merges?: ['battle:start'];          // 仅 map:encounter 可用：本 recipe 合流演完遇敌+开战，组合预算 ≤1.2s（§3.1）
  create?: { name: string; asset: string; layer: Layer; anchor?: [number, number] }[];  // 临时节点（来自对象池）
  tracks: Track[];
  assets: string[];                   // 用到的 manifest 素材 id；预热和预算统计用
}

// ---------- 引擎传给皮肤的数据（深冻结/拷贝，只读，规则已算完并已提交） ----------
type DeepReadonly<T> = { readonly [K in keyof T]: DeepReadonly<T[K]> };
export interface HitResult { targetId: string; dmg: number; weak: boolean; crit: boolean; miss: boolean;
  resist: 'none'|'resist'|'null'|'repel'|'drain'; element: string; down: boolean; shieldBroken?: boolean }
export type ActionPayload = DeepReadonly<{ actorId: string; skillId: string; targetIds: string[]; hits: HitResult[] }>;
export type AllOutPayload = DeepReadonly<{ partyIds: string[]; finisherId: string; total: number; hits: HitResult[] }>;
export type DownPayload   = DeepReadonly<{ unitIds: string[]; side: 'ally'|'enemy' }>;   // 同一次 action 的多个倒地合并成 1 次
export type EnvChangePayload = DeepReadonly<{ prev: Env; next: Env; changed: (keyof Env)[] }>;

// ---------- 环境（v1.1 新增；App 经 UmbraRuntimeBridge 快照提供，引擎转只读） ----------
export interface Env {
  date: string;                                   // 'YYYY-MM-DD'（本地日期）
  weekday: 'mon'|'tue'|'wed'|'thu'|'fri'|'sat'|'sun';
  weather: 'clear'|'cloudy'|'rain'|'snow'|'fog'|'unknown';
  moonPhase: 0|1|2|3|4|5|6|7;                     // 0 新月 … 4 满月
  darkHour: boolean;                              // 影时间（加成时段）是否进行中
}

// ---------- 演出上下文（引擎内部求值 recipe / 填 DOM 模板时使用；皮肤不写代码，只通过 Ref 和 match 读） ----------
export interface ShowCtx {
  signal: AbortSignal; speed: 1|2|3; level: 'full'|'standard'|'minimal'; tier: 'high'|'mid'|'low';
  env: DeepReadonly<Env>;                         // v1.1 新增
}

// ---------- 交涉 DOM 模板（v1.1 新增，§4.3） ----------
export interface TalkTemplate {
  html: string;                                   // 只含白名单标签；用 data-slot 标注引擎要填的元素
  params?: { styleId?: string; maxLineChars?: number; typingCps?: number };   // 展示参数；styleId 从 App 预置白名单里选
}

// ---------- 皮肤注册 ----------
export interface SkinPack {
  id: SkinId;
  manifest: Manifest;
  tokens: Tokens;                     // §4.2
  slots: SlotMap;                     // §4.1
  recipes: Recipe[];
  labels: Record<string, string>;     // 文案改名：'label.allout' → '总攻击'
  templates?: { talk?: TalkTemplate };// 缺省用引擎默认模板
  // v1.1：handlers 字段已删除，皮肤不能注册任何演出代码
}
export interface Manifest {
  assets: { id: string; file: string; w: number; h: number; atlas?: string; firstPack: boolean;
            source: 'official'|'generated'; note?: string }[];
  filters: ('ColorMatrix'|'Displacement'|'CRT'|'Glitch')[];   // 皮肤滤镜名额会用到的，预热用
  fonts: { family: string; file: string; chars: string;
           role: 'display'|'number'; pack: 'first'|'deferred' }[];   // body 用系统字体，不进 manifest
}
// 调用：UMBRA.registerSkin(pack.id, pack)
```


### 附 C. 交涉 DOM 模板规则（母本 §4.3，skin:check 要校验、AI 桥要对接）


皮肤可在 `templates.json` 注册交涉模板（HTML 字符串），配合 ui.css 改样式和结构（P3/P4 可以完全改结构）。不注册或校验不过 → 引擎默认模板兜底。

规则：
- **标签白名单**：`section div span p ul ol li button img input textarea header footer strong em br`。其他标签（含 `script` `style` `iframe` `link` `a` `form` `svg`）一律拒绝。
- **禁止**：任何 `on*` 内联事件、`style` 属性里的 `url()`、`src` / `href` / `srcset` 属性。图片只能写 `data-asset="<manifest 素材 id>"`。
- 引擎用 `data-slot` 找元素，**只用 textContent / 属性赋值填数据**，事件由引擎绑定。
- 可点元素（`choice`、`send`）命中区 ≥86 设计像素（用 ui.css 保证，截图自检）。
- 交涉成败由规则判定（显示概率 = 实际概率），AI 只生成对白；皮肤只提供展示参数 `params`，看不到也不能构造请求。

| data-slot | 必须 | 内容 |
|---|---|---|
| `line` | 是 | 敌方当前台词（逐字出现，速度 `params.typingCps`） |
| `choices` | 是 | 选项容器；其第一个子元素作为重复项模板 |
| `choice` | 是 | 单个可点选项（在 choices 的子模板内） |
| `choiceText` | 否 | 选项文字 |
| `enemyName` / `enemyPortrait` | 否 | 敌人名 / 立绘（引擎按 enemy 素材填） |
| `input` / `send` | 否 | 自由文字输入框 / 发送按钮（有自由交涉时必须成对出现） |
| `odds` | 否 | 成功率显示（规则给值） |
| `status` | 否 | 「思考中…」「超时」等状态文字（label key） |

```json
{
  "talk": {
    "html": "<section class=\"talk\"><header><span data-slot=\"enemyName\"></span><span data-slot=\"odds\"></span></header><img data-slot=\"enemyPortrait\" alt=\"\"><p data-slot=\"line\"></p><ul data-slot=\"choices\"><li><button data-slot=\"choice\"><span data-slot=\"choiceText\"></span></button></li></ul><footer><input data-slot=\"input\" maxlength=\"60\"><button data-slot=\"send\">→</button></footer><span data-slot=\"status\"></span></section>",
    "params": { "styleId": "p4-tv", "maxLineChars": 60, "typingCps": 40 }
  }
}
```

---

## v1.2 修订（主策划拍板，10-22 01:55）——以本节为准，覆盖上文冲突处

App v1.1 评审 16 条全部采纳：
1. 冻结做运行时深冻结/structuredClone，覆盖数组、嵌套对象、Map/Set；Pixi 资源只给只读句柄。
2. 交涉是独立于 Director 的交互阶段：AI 只生成对白、不参与判定；网络耗时不计入任何演出上限；超时用规则兜底台词；talk:result 前规则只提交一次（幂等键）。交涉选项上限 4。
3. env:change 只保留 1 个待播快照，后到覆盖先到；空隙不足可跳过演出但 env 值始终最新。
4. rewarm：中断只取消当前步骤、保留已完成缓存；同尺寸已预热直接返回；入场前无结果就冷启动，不阻塞入口。
5. 皮肤 index.ts 合法边界：允许 const、数组/对象字面量与展开、标签映射、调用 registerSkin；拒绝定时器、DOM 查询、store、网络、运行时分支。skin:check 用完整 AST，覆盖 import()/require/import.meta.glob/副作用 import/字符串拼接，报错给文件+行+路径。
6. repeatEvery 展开后每个 recipe 轨道数 ≤64；hitMarks 升序、非负、数量 = payload.hits.length、末个 ≤ duration−200；多目标按行动聚合（一次行动一组 hitMarks）。
7. 对象池按 owner 回收，演出结束瞬时粒子/临时节点为 0（含重叠层与主线并存时）；验收加连续 20 场 + 切皮后计数为 0。
8. source 标记机器可读并阻断：official 素材只允许进私有仓库构建，打包到公开/CDN 目标时 skin:check 报错。
9. 图鉴 2.2MB 按需分片列为 M3 前必须完成项，计入 App 主包检查。
10. ui:open/close 不进 Director，但必须非阻塞、可打断、不抢占主线输入（v1.2 允许其 clip-path 动画 ≤280ms）。
11. 虚拟横屏坐标变换同时覆盖 DOM（交涉模板、设置、HUD），在逻辑安全矩形内命中；验收含 0.85 渲染缩放下 DOM 命中无漂移。
12. checkpointId 先落 Dexie 再更新内存状态；重启先按 checkpoint 幂等恢复。
13. env 单点计算：date/weekday 本地日期、moonPhase 固定公式、darkHour 取 App 设置、天气未知 'unknown'，新增 'storm'。
