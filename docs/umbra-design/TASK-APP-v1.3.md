# 幽影协议 UMBRA · App 任务书 v1.3（定稿）
> **✅ v1.3 开工令（10-22 09:40，主策划）**：先读**文末「v1.3 修订」节**（逐步照做版，含验证、常见错误、回滚），再按需查正文。冲突时以文末 v1.3 修订为准，其次 v1.2 修订节，最后正文。母本 `CONTRACT-v1.3.md`，对照表 `FX-MAP-v1.1.md`。读者：App 总负责 AI。
> 下面「v1.2 开工令」保留作背景（分支、只改哪些目录等规则仍然有效）。
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

---

## v1.3 修订（主策划定稿，10-22 09:40）——以本节为准，覆盖上文冲突处

> 母本：`docs/umbra-design/CONTRACT-v1.3.md` 文末「v1.3 修订」节（下称「母本 v1.3-§x」）。对照表：`FX-MAP-v1.1.md`。参考实现：分支 `origin/feat/umbra-skin-p5r-red` 的 `labs/umbra-m3-red/`（红色样板，下称「样板」）。
> 本节写给 App 总负责 AI。**照步骤做，每步做完跑「验证」，通过再提交。** 不懂的取舍写进 `docs/umbra-progress/app.md` 等答复，不要自己改契约。

### 0. 开工前（每次都做）
```sh
git fetch origin
git switch feat/umbra-app-m2            # 没有就：git switch -c feat/umbra-app-m2 origin/feat/theme-kit-integration
git merge --no-edit origin/feat/theme-kit-integration    # 拿到 v1.3 文档；有冲突只保留双方内容，不要删别人的
git status                               # 必须干净再开始
```
禁止：动 main、`git reset`、`git stash`、`git clean`、改 `src/umbra/skins/<任何主题>/`。
仓库 `.gitignore` 忽略 `*.md`：提交 md 要 `git add -f 路径`。

### 1. 本版要做的事（按顺序，一步一提交）
| 步 | 内容 | 母本 | 预估 |
|---|---|---|---|
| 1 | 契约类型：EventName / payload / match / Recipe.sfx / Manifest 字段 | v1.3-§3 §4.4 §5 §7.2 | 0.5 天 |
| 2 | 时长上限表 + 校验口径（duration + Σ hitStop） | v1.3-§2 §3 | 0.5 天 |
| 3 | Director：重叠层 4 成员与优先级、A 类旁路、可跳过名单、explore:scan 两段 | v1.3-§3g | 1 天 |
| 4 | 规则层发事件（先提交再演出）+ holdup 三选一与 holdup:result | v1.3-§3a–§3f | 1.5 天 |
| 5 | 引擎原语 17 个（从样板移植）+ 镜头 + HOLD UP 包围构图 | v1.3-§4 | 1.5 天 |
| 6 | 音频总线 + present.json 生成 + bgm:cue 选曲 + 设置三档音量 | v1.3-§7 | 1 天 |
| 7 | skin:check 新校验 | v1.3-§9 | 0.5 天 |

---

### 步 1　契约类型
**做什么**：在 `src/umbra/skins/_contract/recipe.ts` 里把 `EventName` 换成下面整段（只加不删），并加 payload 类型。
```ts
export type EventName =
  // v1.2
  | 'scene:enter' | 'scene:leave' | 'battle:start' | 'turn:start' | 'action' | 'unit:down' | 'onemore'
  | 'highlight' | 'holdup' | 'allout' | 'talk:start' | 'talk:result' | 'battle:end'
  | 'map:move' | 'map:encounter' | 'ui:open' | 'ui:close' | 'env:change'
  // v1.3 §3a 第一批
  | 'baton' | 'persona:switch' | 'shield:break' | 'levelup' | 'card:pick' | 'buff:grant' | 'boss:phase' | 'fusion:result'
  // v1.3 §3b 第二批
  | 'shop:enter' | 'shop:exit' | 'party:switch' | 'bond:assist' | 'ailment:apply' | 'ailment:cure' | 'escape'
  | 'velvet:alarm' | 'fusion:accident' | 'callingcard:send' | 'explore:scan' | 'achievement:unlock'
  | 'persona:levelup' | 'bond:rankup' | 'bgm:cue'
  // v1.3 §3c / §3d
  | 'holdup:result' | 'explore:move' | 'explore:cover' | 'explore:spotted' | 'explore:interact'
  // v1.3 §3e 音频与零散
  | 'ui:cursor' | 'ui:confirm' | 'ui:cancel' | 'ui:page' | 'ui:error' | 'item:get' | 'money:get' | 'shop:buy'
  | 'skill:learn' | 'unit:spawn' | 'unit:flee' | 'unit:revive' | 'unit:lowhp' | 'intent:show' | 'navi:scan'
  | 'explore:sneak' | 'alert:change' | 'explore:exit' | 'boss:intro' | 'run:fail' | 'run:retreat';

export type HoldupPayload = DeepReadonly<{ enemyIds: string[]; partyIds: string[] }>;
export type HoldupResultPayload = DeepReadonly<{ choice: 'allout' | 'talk' | 'release'; enemyIds: string[] }>;
export type HighlightPayload = DeepReadonly<ActionPayload & { kind: 'solo' | 'duo'; pairIds?: [string, string] }>;
export type BatonPayload = DeepReadonly<{ fromId: string; toId: string; bonus: 1 | 2 | 3 }>;
export type LevelupPayload = DeepReadonly<{ unitIds: string[]; stats: { id: string; lv: number; delta: Record<string, number> }[] }>;
export type BgmCuePayload = DeepReadonly<{ cueId: string | null; crossfadeMs?: number; loop?: boolean; cond?: Record<string, string | boolean> }>;
```
`Recipe.match` 增加：`side?`、`summon?: 'full' | 'quick'`、`hit?: 'weak'|'crit'|'resist'|'drain'|'repel'|'miss'`、`highlight?: 'solo'|'duo'`、`pairIds?: [string, string]`、`choice?: 'allout'|'talk'|'release'`、`kind?: string`（bond:assist）、`status?: string`（ailment:*）、`skinShopId?: string`、`result?: 'success'|'fail'`。
`Recipe` 增加：`sfx?: { id: string; at: number; bus?: 'se' | 'voice'; unit?: string; key?: string }[]`、`bgm?: { cueId: string; crossfadeMs?: number }`。
`PrimitiveName` 增加 17 个：`'summon' | 'personaShow' | 'nameplate' | 'pose' | 'batonPass' | 'showtimeLogo' | 'eyeStrip' | 'onomatopoeia' | 'checkerFloor' | 'ringSplash' | 'comicPanels' | 'duoEntrance' | 'duoStrike' | 'duoTitle' | 'maskRip' | 'camera' | 'holdupRing'`。
`ManifestAsset` 增加 `group?: string`、`frames?: Record<string, [number, number, number, number]>`；`Manifest.fonts[]` 增加 `unicodeRange?: string`。
可直接对照样板：`git show origin/feat/umbra-skin-p5r-red:labs/umbra-m3-red/src/umbra/skins/_contract/recipe.ts`。

**验证**：`npx tsc --noEmit` 0 错误；`grep -c "holdup:result" src/umbra/skins/_contract/recipe.ts` ≥1。
**常见错误**：把 v1.2 的事件删了（只加不删）；把 `levelup` 写成单人 `unitId`（v1.3 是合并版 `unitIds`）。
**提交**：`git add src/umbra/skins/_contract && git commit -m "umbra app v1.3-1: 契约类型（49 事件名/17 原语/音频字段）"`。

### 步 2　时长上限表
把 Director 的上限表整段换成（毫秒，[完整/标准, 极简]）：
```ts
export const CAPS: Record<string, [number, number]> = {
  'battle:start': [900, 350], 'turn:start': [300, 100], 'action': [1800, 600], 'action:enemy': [1500, 500],
  'unit:down': [500, 200], 'onemore': [450, 250], 'highlight': [3500, 1200], 'holdup': [1000, 400], 'allout': [3500, 1200],
  'talk:start': [800, 300], 'talk:result': [1200, 400], 'battle:end': [1500, 500], 'scene:enter': [600, 250], 'scene:leave': [600, 250],
  'map:move': [800, 300], 'map:encounter': [900, 350], 'env:change': [600, 250], 'ui:open': [280, 150], 'ui:close': [280, 150],
  // v1.3
  'baton': [600, 250], 'persona:switch': [500, 200], 'shield:break': [500, 200], 'levelup': [1000, 400], 'card:pick': [600, 300],
  'buff:grant': [800, 300], 'boss:phase': [2000, 600], 'fusion:result': [3000, 1000],
  'shop:enter:full': [1200, 300], 'shop:enter:short': [500, 300], 'shop:exit': [600, 250], 'party:switch': [500, 200],
  'bond:assist': [800, 300], 'ailment:apply': [400, 150], 'ailment:cure': [400, 150], 'escape': [600, 250], 'velvet:alarm': [800, 300],
  'fusion:accident': [1000, 400], 'callingcard:send': [3000, 1000], 'explore:scan': [400, 200], 'persona:levelup': [800, 300], 'bond:rankup': [1500, 500],
  'holdup:result': [400, 150], 'explore:move:cell': [250, 120], 'explore:cover': [300, 150], 'explore:spotted': [500, 200], 'explore:interact': [400, 200],
  'unit:spawn': [600, 250], 'unit:flee': [600, 250], 'unit:revive': [600, 250], 'explore:sneak:cell': [350, 150], 'explore:exit': [800, 300],
  'boss:intro': [2000, 600], 'run:fail': [1500, 500], 'run:retreat': [1000, 400],
};
// action 我方/敌方；shop:enter 首访/简短；explore:move/sneak 按格数（封顶 2000）
export const capKey = (ev: string, p: any) =>
  ev === 'action' && p?.side === 'enemy' ? 'action:enemy'
  : ev === 'shop:enter' ? (p?.firstVisitToday ? 'shop:enter:full' : 'shop:enter:short')
  : ev === 'explore:move' ? 'explore:move:cell' : ev === 'explore:sneak' ? 'explore:sneak:cell' : ev;
export const capOf = (ev: string, p: any, minimal: boolean, speed: number) => {
  const [full, min] = CAPS[capKey(ev, p)] ?? [0, 0];
  const cells = ev === 'explore:move' || ev === 'explore:sneak' ? Math.max(1, (p?.path?.length ?? 2) - 1) : 1;
  const raw = (minimal ? min : full) * cells;
  return (cells > 1 ? Math.min(2000, raw) : raw) / speed;
};
/** 校验口径：duration + 所有 hitStop 停帧（v1.3-§2） */
export const wallMs = (r: { duration: number; tracks: { prim: string; dur?: number; args?: any }[] }) =>
  r.duration + r.tracks.filter((t) => t.prim === 'hitStop').reduce((s, t) => s + (t.dur ?? t.args?.ms ?? 0), 0);
```
A 类事件（ui:cursor 等、item:get、money:get、shop:buy、skill:learn、unit:lowhp、intent:show、navi:scan、alert:change、achievement:unlock、bgm:cue）**不在表里**——它们不进 Director。
**验证**：单测 `capOf('action', {side:'enemy'}, false, 1) === 1500`、`capOf('explore:move', {path:[[0,0],[1,0],[2,0]]}, false, 1) === 500`、`capOf('explore:move', {path: Array(20).fill([0,0])}, false, 1) === 2000`、`capOf('onemore', {}, false, 2) === 225`。
**常见错误**：hitStop 停帧没计入 → 墙钟超上限但校验通过；倍速没除。

### 步 3　Director
在 v1.2 的 Director 上加：
1. 重叠层成员表与优先级（v1.3-§3g-1）：
```ts
const OVERLAY_PRIO: Record<string, number> = { 'unit:down': 3, 'shield:break': 2, 'ailment:apply': 1, 'ailment:cure': 1 };
// 来了重叠层事件 ev：
// cur 为空 → 播；OVERLAY_PRIO[ev] >= OVERLAY_PRIO[cur] → cur 跳清场，播 ev；否则丢弃 ev 的演出（HUD 状态照常更新）
```
2. A 类旁路（v1.3-§3g-2）：`emit(ev)` 时若 ev 在 A 类集合，直接 `audio.handle(ev, payload)` + `hud.notify(ev, payload)`，**不入队、不占缓冲、不受暂停演出影响**。
```ts
export const A_CLASS = new Set(['ui:cursor','ui:confirm','ui:cancel','ui:page','ui:error','item:get','money:get','shop:buy',
  'skill:learn','unit:lowhp','intent:show','navi:scan','alert:change','achievement:unlock','bgm:cue']);
```
3. 可跳过：`const SKIPPABLE = new Set(['highlight','allout','boss:phase','boss:intro','fusion:result','callingcard:send','bond:rankup'])`；跳过 highlight/allout 时 finishCard 闪现 ≤150ms（v1.2 规则不变）。
4. explore:scan：起效段按 0.4s 主线事件播；结束后 `hud.scanOverlay(2000)`（不阻塞输入）。
5. 皮肤没有对应 recipe → 用引擎默认 recipe（样板 `engine/defaults.ts` 的写法，每个新事件给一个 ≤上限的 banner/tag 兜底即可）。

**验证**：写 4 个单测：①unit:down 正在播时来 ailment:apply → 被丢弃；②ailment 正在播时来 unit:down → ailment 清场；③连发 50 个 ui:cursor 时主线队列长度不变；④跳过 boss:intro 后计时器、节点计数为 0。
**常见错误**：把 bgm:cue 放进主线（会卡住战斗）；重叠层同时播 2 个。

### 步 4　规则层发事件
**原则**：先在 Dexie 事务里提交规则结果（带 checkpointId + action key），提交成功才发事件（v1.2 §3.1 不变）。payload 字段名照母本 v1.3-§3 原样。
| 规则时机 | 发什么 |
|---|---|
| 1 MORE 后玩家选 BATON PASS | `baton { fromId, toId, bonus }` |
| 主角换面具 | `persona:switch { unitId, personaId, prevPersonaId }` |
| 精英/BOSS 护盾层数减少 | action 的 `HitResult.shieldBroken = true`，同时发 `shield:break { unitId, layersLeft }` |
| 战斗结算有人升级 | `battle:end` 之后发**一次** `levelup { unitIds, stats }`，之后每个升级的面具发 `persona:levelup`，学会技能另发 A 类 `skill:learn` |
| 全员倒地 | `holdup { enemyIds, partyIds }` → 显示三选一 → 玩家按下 → 先提交选择 → `holdup:result { choice, enemyIds }` → choice=allout 发 `allout`；talk 发 `talk:start`；release 发 `unit:flee` + `battle:end` |
| SHOWTIME / 合体魔法 / 连携 | `highlight { ...ActionPayload, kind: 'duo', pairIds: [a, b] }`；可组合的两人从 `skin.roster.showtime` 读，**不写死角色 id**（D-005） |
| 开战 | `battle:start { enemyIds, ambush?, leadId, mode: 'turn' }` |
| 进/出店 | `shop:enter { shopId, skinShopId, firstVisitToday }` / `shop:exit { shopId, purchased }`；成交发 A 类 `shop:buy` |
| 探索（rules/explore） | `explore:move`（一条路径一个事件）/ `explore:sneak` / `explore:cover` / `explore:spotted` / `explore:interact` / `explore:exit`；警戒度变化发 A 类 `alert:change` |
| BOSS | 进 BOSS 节点：`boss:intro` → `map:encounter` → `battle:start`；换阶段：`boss:phase` + `bgm:cue boss.p2` |
| 失败/撤退 | `run:fail` / `run:retreat` |
| 场景切换 | 同时发 `bgm:cue`（cueId 名单见 FX-MAP-v1.1 §G4；条件 cond 带 env 与 callingCard/encounter/alert） |

**验证**：无头模拟器跑 1、3、5 只敌人各一场到 HOLD UP，三个选项各一次：事件序列与上表一致；同一 holdup 连点「放过」3 次只结算 1 次（action key 幂等）。
**常见错误**：holdup:result 在提交前发出；release 后忘了 battle:end；levelup 每人发一次（应合并）。

### 步 5　引擎原语（从样板移植）
1. 取样板文件（只读参考，复制到 App 的引擎目录后按 App 结构改 import）：
```sh
for f in camera.ts p5.ts p4.ts summon.ts prims2.ts hud.ts; do
  git show origin/feat/umbra-skin-p5r-red:labs/umbra-m3-red/src/umbra/engine/$f > /tmp/m3-$f
done
```
2. 移植清单（母本 v1.3-§4）：`summon personaShow nameplate pose batonPass showtimeLogo maskRip`（summon.ts / p4.ts）、`eyeStrip onomatopoeia checkerFloor ringSplash`（prims2.ts）、`comicPanels duoEntrance duoStrike duoTitle`（p4.ts）、`camera holdupRing`（camera.ts / p5.ts）。单项上限照母本表写进 PRIM_MAX。
3. **镜头**：Camera 类每帧 `update(t, dt)`，在 render loop 里 HUD 之前调用；景深 bg 0.35 / enemy 0.75 / ally 1.15 / fx 0.75，dmg 跟 enemy；待机环绕幅度 `idleK`：画质 low 或演出级别 minimal 时设 0。
4. **HOLD UP 包围构图**：`holdLayout(eng, enemyIds, party, partyTop)` 从 /tmp/m3-hud.ts 复制（10-22 修复版：前排两翼、后排抬高缩小进敌人层底部、右翼立绘框不进 `sets.holdup` 指令区）。`holdupRing` 演出终点和 HOLD UP 菜单静帧**必须都调用它**，否则会跳。
5. 原语报错/素材缺失 = 当作已播完，记日志（v1.2 §0.3）。

**验证**：用红色皮跑 `holdup` 演出，在 844×390、667×375、1280×720 截图菜单帧：四人都看得见脸、没有人压住 ALL-OUT/TALK/LET GO 按钮；`camera` 轨道结束 300ms 后镜头偏移 <1px；连续 20 场后临时节点计数为 0。
**常见错误**：camera 影响了 hud 层（按钮会跟着晃，命中区偏）；holdupRing 结束后没把场上队员 alpha 恢复 1。
**回滚**：某个原语移植后出问题 → `git revert <该提交 hash>`，Director 会把缺失原语按「已播完」处理，不影响规则。

### 步 6　音频总线
1. 复制样板 `engine/audio.ts`（AudioBus：init/unlock/play/voiceLine/bgm/stopBgm）。
2. **present.json**：构建时扫 `skins/<id>/audio/{bgm,se,voice}/` 生成 `{ "files": ["bgm/xxx.opus", ...] }`（样板 `tools/build_manifest.py` 有写法）。运行时只请求 present.json 里有的文件 → 缺文件不发请求、不 404。
3. `bgm:cue` 处理：按母本 v1.3-§7.4 选曲（条件键最多者胜 → weight 随机 → noRepeat → audioPrefs lock/off）；战斗→victory 淡化 ≤300ms。
4. sfx 原语：`args.bus === 'voice'` 走 `voiceLine(args.unit ?? $actor, args.key)`，否则 `play(args.id)`；Recipe 级 `sfx` 数组在加载时展开成 sfx 轨道。
5. 设置页三档音量（BGM/SE/语音）存存档；首次 pointerdown/keydown 解锁 AudioContext；`visibilitychange` 暂停/恢复。
6. 首包不含音频：构建产物里 `audio/` 不进主包，公开目标打包时排除（skin:check 报错兜底）。

**验证**：①删掉所有音频文件跑一场：浏览器 Network 面板 0 个音频 404，控制台无报错；②放 1 个 `se/se.hit.fire.opus`：火属性命中时有声；③静音档下 AudioContext 不播放。
**常见错误**：没文件也去 fetch（满屏 404）；在第一次点击前 new AudioContext（iOS 无声）。

### 步 7　skin:check 新校验（母本 v1.3-§9）
加 6 项：时长口径（wallMs）、事件/原语名单、原语单项上限与 camera.keys、labels 必填（v1.3-§8）、音频引用（缺失只告警）、`hud.system` 新范围与 `sets.holdup` 命中区。
**验证**：拿红色样板皮跑 skin:check：0 错误；故意把一个 holdup 命中区改成 80 宽 → 报错带文件+行+路径。

### 收尾（每步都做）
```sh
npx tsc --noEmit && npm test
git add <改动的文件>            # md 用 git add -f
git commit -m "umbra app v1.3-<步号>: <一句话>"
git push origin feat/umbra-app-m2
```
在 `docs/umbra-progress/app.md` 写一行「完成了什么 / 验收结果 / 下一步」（`git add -f`）。
**回滚**：只用 `git revert <hash>`，不要 reset；revert 后再推送。
