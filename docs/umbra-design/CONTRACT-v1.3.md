# 幽影协议 UMBRA · 演出接入契约 v1.3（定稿母本）

> **✅ v1.3 定稿（10-22 09:40，主策划）。** 本文 = v1.2 全文 + 文末「v1.3 修订」节。**冲突时以文末 v1.3 修订为准**，其次 v1.2 修订节，最后才是正文。
> 执行方只读自己的任务书：App 读 `TASK-APP-v1.3.md`，黄/蓝/粉读 `TASK-THEMES-v1.3.md`；两份任务书文末的「v1.3 修订」节是逐步可照做的版本。
> 配套：`FX-MAP-v1.1.md`（玩法↔演出对照，含 v1.3 全部事件）、`AUDIO-MAP-v1.md`（曲目/音效/语音清单）、`docs/umbra-decisions.md` D-009。

## 版本记录

| 版本 | 日期 | 改动 |
|---|---|---|
| v1 | 2026-10-21 | M1 结束时的草案 |
| **v1.1** | 2026-10-22 | 按 App 评审（reviews/app-task-v1.md「对 TASK-APP-v1 的意见」）与黄/蓝/粉评审修订，主策划已全部拍板。改动如下 ↓ |
| **v1.2** | 2026-10-22 01:55 | 主策划拍板 v1.1 评审：clip-path、交涉静态形状、labels、storm、交涉选项 4、env 单点、轨道 ≤64（见文末 v1.2 修订节） |
| **v1.3** | 2026-10-22 09:40 | 定稿：49 个新事件名（含 holdup:result、探索 4、音频 13 组）、17 个新原语（含 camera / holdupRing）、音频清单 skins/<id>/audio/、labels 新键、hud.system 改范围（见文末 v1.3 修订节） |

v1.1 改动一览（§ 号为本文件章节）：

| # | 来源 | 改动 | 位置 |
|---|---|---|---|
| 1 | App-1 | 引擎发给皮肤的 payload / BattleView / 掉落 / 意图一律深冻结或拷贝；skin:check 挡动态 import、require 和 rules/、ui/ 副作用导入 | §0.1 §0.11 §2 §7.1 |
| 2 | App-2 | **删除 `handlers`**：皮肤只允许声明式 recipe + 引擎原语 + 素材/参数；删除原 §8 第 4 条 | §0.1 §2 §8 |
| 3 | App-3 | Director 原则：所有阻塞事件先提交规则结果（Dexie 事务）再播演出；checkpointId / action key 幂等；皮肤异常/超时/连点只影响画面 | §3.1 §7.1 |
| 4 | App-4 | 调度 = 阻塞主线 + 1 条可重叠短层（最多 1 个，计时独立）；banner/cutin 优先于 unit:down，重叠时 unit:down 只播碎裂不出字；同一 action 多个倒地合并为 1 次（payload 改 unitIds[]）；ui:open/close 明确不进 Director | §2 §3.1 §3 表 |
| 5 | App-5 | 输入缓冲上限 2，满时保留最新、丢弃最旧；缓冲动作不得重复结算同一目标 | §3.1 |
| 6 | App-6 | map:encounter + battle:start 组合预算 ≤1.2s，可合流（新增 `merges` 字段） | §2 §3 §3.1 |
| 7 | App-7 | 画质测量口径固定：1 秒一窗、render loop ticker 主线程帧时间中位数、后台/暂停/loading 不计 | §6 |
| 8 | App-8 | 粒子同屏总上限 高 600 / 中 300 / 低 150；「不占滤镜名额」改为白名单，模糊/发光类全屏滤镜不在白名单 | §0.4 §1 §6 |
| 9 | App-9 | 设计坐标永远 1280×720，渲染分辨率单独缩放；±90° 旋转触摸坐标由引擎统一变换 | §0.6 §6 |
| 10 | App-10 | 预热幂等、可中断、有预算：rewarm 300ms 合并触发；rehearse 在 loading 遮罩下，单次超时 1.5s 回退 | §6 §7.1 |
| 11 | App-11 | AI 交涉：皮肤只给事件 id 和展示参数，App 现有 AI 桥发请求，带请求预算和脱敏，超时/取消跟演出时钟 | §0.2 §4.3 §7.1 |
| 12 | App-12 | 安全区桥接只传逻辑安全矩形，变化时 ResizeObserver 通知重算，皮肤不得缓存 | §4.1 §7.1 |
| 13 | App-13 | 网络验收增加：切换皮肤后旧皮肤资源被释放 | §0.9 §7.1 |
| 14 | 主题-1 | `hud.command` y 范围 330–696 → **220–696**（高 476）；允许「5 项 + 更多」或双列 | §4.1 §7.3 |
| 15 | 主题-2 | 命中区：次按钮 84 → **≥86**，主按钮 ≥96，全文统一 | §0.7 §4.1 §7.3 |
| 16 | 主题-3 | ShowCtx 增加只读 `env{date, weekday, weather, moonPhase, darkHour}`；新增事件 `env:change`；env 由 App 经 UmbraRuntimeBridge 快照提供 | §2 §3 §7.1 |
| 17 | 主题-4 | 交涉界面：皮肤可注册声明式 DOM 模板（data-slot，禁 script/内联事件/外链）+ ui.css；引擎默认模板兜底 | §2 §4.3 |
| 18 | 主题-5 | 字体：body 用系统字体不计预算；display 子集首包 ≤120KB（number 计入），超出字形进延迟包 | §4.2 §5 |
| 19 | 主题-6 | 自检截图加 1440×900、1920×1080；每尺寸加「交涉界面」「结算」各 1 张（7 尺寸 × 8 张 = 56 张） | §7.3 |
| 20 | 主题-7 | `meshIdle.swayZone` 给格式和示例：局部像素多边形数组或图层名二选一 | §1.5 |
| 21 | 主题-8 | 跳过 highlight/allout 时 finishCard 仍闪现 ≤150ms 再清场 | §3 |
| 22 | 主题-9 | 确认 maskWipe 可用单色剪影图替代顶点（多边形顶点上限仍 64） | §1.4 |
| 23 | 主题-10 | 召唤、P4 原语、粉色素材来源确认；工作量 黄 4 天 / 蓝 4 天 / 粉 4.5–5 天，三皮并行约 1 周 | §7.3 |
| 24 | 校对 | 示例修正：Eigaon 的 shockwave 按 §1.2 推到 890ms、粒子寿命 700；总攻 slashLine 改成 160ms×8 次展开；`repeatEvery/times` 从 args 提到 Track 字段；新增 §2.3–§2.4 示例 | §2 |

---

- 状态（v1.2 原文）：M3 垂直切片通过后冻结为 v1.0 正式版。冻结前只加不删；改名或删除必须由主策划（红色 P5R 方）发 v1.x 修订（本版删除 `handlers` 即属此类）。
- 依据：GDD-v1 §8–§10、§15、§16；reviews/app.md、reviews/app-task-v1.md；黄/蓝/粉 v1 评审；umbra-next/spike。
- 读者：App 总负责 AI、黄（p4-yellow）、蓝（p3-blue）、粉（p3r-pink）。红色（p5r-red）是样板皮肤。
- 一句话：**规则说了算，皮肤只演戏。** 规则结果先落盘再演出；皮肤拿到的数据只读，不能改变胜负、伤害、掉落和消耗；演出超时就被强制推进。

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

## 1. 演出原语清单

由引擎（红色方实现）提供，皮肤在 recipe 里按名称调用。时间单位毫秒，坐标为设计像素。
「降档」列：**Q** = 画质降档（高→中→低）时怎么变；**M** = 演出级别为「极简」时怎么变。
所有数量类参数（粒子、碎片、速度线等）**只写高档值**，引擎统一乘 §6 系数，并受 §6 同屏总上限约束。

通用参数（所有原语都有）：`at` 开始时间、`dur` 时长、`layer` 图层、`ease` 缓动（linear / outCubic / inCubic / outQuart / inOutCubic / outBack / outElastic）。

### 1.1 基础

| 名称 | 参数 | 时长上限 | 降档 |
|---|---|---|---|
| `tween` | target, to{x,y,scale,rotation,alpha,tint} , from? | 随事件 | Q 不变；M 按事件压缩时间 |
| `show` / `hide` | target | 0 | 不变 |
| `sfx` | id, vol? | 0（触发） | 不变；倍速 ≥2 时同 id 100ms 内去重 |
| `vibrate` | ms(≤40), pattern? | 0 | 不变；用户关闭震动则跳过 |
| `title` | text（文案 key 或字面）, font, size, pos, rot | ≤800 | Q 不变；M 缩到 ≤300 |
| `dim` | color, alpha(≤0.7) | ≤事件时长 | 不变（Graphics 矩形，不是滤镜） |
| `radialBurst` | rays(≤24), colors[], spin(rad) | ≤2200 | Q 低档 rays×0.5；M 跳过旋转 |

### 1.2 打击感

| 名称 | 参数 | 时长上限 | 降档 |
|---|---|---|---|
| `hitStop` 停帧 | ms | 60–90（普通），轻击 30 | Q 不变；M 降到 30 |
| `shake` 震屏 | px(≤24), decay=0.86/帧 | ≤400（自然衰减） | Q 不变；M px×0.5 |
| `flashSprite` 闪白 | target, ms | ≤60（约 3 帧） | 不变（单精灵 ColorMatrix，白名单内，不占全屏名额） |
| `flashScreen` 白闪 | color, alpha(≤0.9), ms | ≤200 | 不变；系统「减少闪烁」开启时 alpha≤0.4 |
| `squashHit` 受击压扁回弹 | target, squash(≤0.22), push(px), recoverMs | 压 50 + 回弹 ≤320 | 不变 |
| `particles` 粒子 | count（高档值）, at{x,y}, speed, spread, dir, life, size, gravity, frames[], colors[] | 单粒子寿命 ≤900 | Q ×1 / ×0.6 / ×0.33；M ×0.5；受同屏总上限 |
| `afterimage` 前冲残影 | actor, to, n(≤3), tints[] | ≤300 | Q 不变；M n=1 |
| `slashLine` 斩击线 | pos, rot, len, width | ≤200 | 不变 |
| `damageNumber` | 取自事件 payload（皮肤不能填数字）, font, big? | ≤1100 | Q 不变；M ≤500 |
| `tag` | kind: WEAK/CRIT/RESIST/MISS/NULL/REPEL/DOWN, pos | ≤920 | Q 不变；M ≤400 |
| `shockwave` 冲击波 | center, amp(≤60), wavelength, speed, radius | ≤520 | **引擎滤镜名额**。Q 只降滤镜分辨率；M 不变 |
| `rgbSplit` 色差 | offset(≤10px) | ≤150 | **引擎滤镜名额**。与 shockwave 起点相距 <150ms 时，引擎把后来的那个推迟到前一个开始后 150ms（M1 实测两者叠加糊屏）。recipe 应直接按此错开写，避免被推出 duration |

### 1.3 cut-in / 横幅 / 总攻

| 名称 | 参数 | 时长上限 | 降档 |
|---|---|---|---|
| `cutin` | panels[]（1–4 格分镜，每格 {shape 多边形, art 素材 id, enterFrom, delay}）, bandAngle, speedLines(layers≤2, count≤46), nameplate{text, font} | ≤560（技能内） | Q 速度线 ×1/×0.7/×0.5；M 只留 1 格、≤250 |
| `speedLines` 速度线 | count, dir, colors[], scrollSpeed | ≤事件时长 | Q 同上 |
| `banner` 横幅（1 MORE 等） | text key, shape, enterFrom, artId? | ≤450 | Q 不变；M ≤250 |
| `silhouetteDash` 剪影冲刺 | units[], count(≤8), interval(≥160), path L↔R | ≤1800 | Q 不变；M count=3 |
| `freezeFrame` 停帧定格 | ms(≤800), keepRendering=true | ≤800 | Q 不变；M ≤300 |
| `finishCard` 总攻定格画 | artId, shape, enterFrom, zoom(≤1.04) | 滑入 ≤200 + 停留 ≤800 | Q 不变；M 只停 ≤300；**被跳过时仍闪现 ≤150ms**（§3） |
| `totalDamage` | 取自 payload, plate shape | ≤800 | 同 freezeFrame |

### 1.4 转场与遮罩

| 名称 | 参数 | 时长上限 | 降档 |
|---|---|---|---|
| `slashPanels` 斜切色带扫屏 | colors[]（≤4 片）, angle, stagger(≥50), dir | ≤900 | Q 不变；M 1 片、≤350 |
| `maskWipe` 自定义形状遮罩扫屏 | shape: polygon[] **或** 素材 id（单色剪影图，v1.1 确认可替代顶点）, from→to scale/pos, invert? | ≤900 | Q 不变；M ≤350。多边形 ≤64 顶点；剪影图不限顶点，按普通素材计预算 |
| `blockPush` 方块推屏（P4） | cols×rows(≤8×5), order: rowWave/diagonal/random(seed), color/art | ≤900 | Q 低档块数 ×0.5（保留格子形态）；M ≤350 |
| `tvStatic` 电视雪花（P4） | intensity, scanlines?, rollPx | ≤600 | 预渲染噪点平铺图（2 帧 256² 交替），白名单内不占滤镜；Q 不变；M ≤250 |
| `glassShatter` 玻璃碎裂（P3/P3R 召唤） | snapshot: screen/target, shards(≤40), impact{x,y}, fallMs | ≤700 | RenderTexture 切三角网格，白名单内不占滤镜；Q 碎片 ×1/×0.7/×0.5；M ≤300 |
| `cardFlip` 卡片翻转 | cardArt front/back, axis, flips(≤2) | ≤500 | Q 不变；M ≤250 |
| `cardShatter` 卡片碎裂（P3/P4 塔罗） | cardArt, pieces(≤24), dir | ≤600 | Q 碎片 ×1/×0.7/×0.5；M ≤300 |
| `dateFlip` 日期翻页（P4/P3） | from{date,weekday,weather?}, to{…}（可写 `"$prev"` / `"$env"` 引用 env）, pages(≤3) | ≤900 | Q 不变；M 直接翻 1 页、≤300 |
| `bakedSwap` 预烘焙换底 | from bgId, to bgId（如 P3 影时间绿调/血月） | ≤400（淡入） | 白名单内不占滤镜；不变 |

### 1.5 角色（常驻，不属于单次演出）

| 名称 | 参数 | 降档 |
|---|---|---|
| `meshIdle` 呼吸/发丝 | layers（≤5 层：后发/身体/头/前发/饰品）, breath(0.009–0.012，即 0.9–1.2%), period(2600–3500), swayPx(≤9), swayZone | Q 低档网格 8×12 → 6×8；不停 |
| `portraitDown` 倒地碎裂 | unit, style: shatter/fall | ≤600；M ≤300 |
| `skinFilter` 皮肤滤镜名额 | 白名单：ColorMatrix、Displacement、CRT、Glitch（pixi-filters） | Q 降滤镜分辨率；同一时刻只能 1 个；**必须在 manifest.filters 声明**以便预热 |

`swayZone` 格式（二选一）：
- **图层名**（string）：整层参与摆动，例 `"hairFront"`。
- **局部像素多边形数组**（`number[][]`）：每个多边形是扁平坐标 `[x1,y1,x2,y2,…]`（≥3 点），坐标为**立绘拼合后整体的局部像素**（原点左上、未缩放，与图集切片前的原图一致）；区域内顶点摆动，区域外不动。

写在 `slots.json` 对应立绘插槽下：
```json
{
  "unit.yukiko.portrait": {
    "atlas": "atlas.portraits",
    "layers": ["hairBack", "body", "head", "hairFront", "acc"],
    "meshIdle": {
      "breath": 0.01, "period": 3000, "swayPx": 7,
      "swayZone": [[412, 40, 520, 30, 560, 210, 430, 240], [300, 60, 360, 50, 370, 180, 310, 190]]
    }
  },
  "unit.chie.portrait": {
    "atlas": "atlas.portraits",
    "layers": ["body", "head", "hairFront"],
    "meshIdle": { "breath": 0.011, "period": 2800, "swayPx": 6, "swayZone": "hairFront" }
  }
}
```

### 1.6 「不占全屏滤镜名额」白名单

只有下列做法不计入 §0.4 的 2 个名额；白名单外任何作用于全屏或大面积图层的 Filter 都占名额：

| 白名单项 | 说明 |
|---|---|
| 预烘焙背景图 / 配色图（含 `bakedSwap`） | 静态位图替换 |
| `dim`、`flashScreen` | Graphics 矩形叠色 |
| `flashSprite` | 单精灵 ColorMatrix，面积 ≤ 该精灵 |
| `tvStatic` | 预渲染噪点平铺图 |
| `glassShatter` / `cardShatter` / `blockPush` | 网格或精灵切片，无 Filter |

**不在白名单**：Blur / KawaseBlur / Glow / Bloom / AdvancedBloom 等模糊、发光类全屏滤镜——不能以「背景」「配色」名义豁免，也不在 `skinFilter` 白名单里。

---

## 2. Recipe schema

位置：`umbra/skins/_contract/recipe.ts`（M3 定稿）。recipe 是 JSON，皮肤包里 `recipes/*.json`，加载时用同一份 TS 类型校验。

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

### 2.1 示例：红色技能 Eigaon（1.5s，对应 spike playSkill）

```json
{
  "id": "skill.eigaon", "event": "action",
  "match": { "skillId": "eigaon" },
  "duration": 1500, "hitMarks": [740],
  "create": [{ "name": "cut", "asset": "cutin.joker", "layer": "cutin" }],
  "assets": ["cutin.joker", "ally.joker"],
  "tracks": [
    { "at": 0,   "dur": 140, "prim": "dim", "args": { "color": "#000", "alpha": 0.45 } },
    { "at": 0,   "dur": 560, "prim": "cutin", "ease": "outCubic", "args": {
        "bandAngle": -0.14, "speedLines": { "layers": 2, "count": 46 },
        "panels": [{ "shape": [-1300,-120,1300,-150,1300,120,-1300,150], "art": "cutin.joker", "enterFrom": "left" }],
        "nameplate": { "text": "skill.eigaon.name", "font": "@font.display" } },
      "minimal": { "dur": 250 } },
    { "at": 0,   "prim": "particles", "args": { "count": 40, "life": 500, "at": { "x": "$screen", "y": 330 }, "dir": 0, "spread": 0.5, "frames": ["streak"], "colors": ["#fff", "@color.primary"] }, "minimal": "skip" },
    { "at": 0,   "prim": "sfx", "args": { "id": "cutin" } },
    { "at": 500, "dur": 240, "prim": "afterimage", "ease": "inCubic", "args": { "actor": "$actor", "to": { "x": "$target", "y": "$target", "dx": -160 }, "n": 3, "tints": ["#fff", "@color.primary", "#fff"] } },
    { "at": 740, "prim": "hitStop", "args": { "ms": 70 } },
    { "at": 740, "prim": "shake", "args": { "px": 22 } },
    { "at": 740, "prim": "flashSprite", "args": { "target": "$target", "ms": 50 } },
    { "at": 740, "prim": "squashHit", "args": { "target": "$target", "squash": 0.22, "push": 26, "recoverMs": 320 } },
    { "at": 740, "dur": 90,  "prim": "rgbSplit", "args": { "offset": 10 } },
    { "at": 890, "dur": 520, "prim": "shockwave", "args": { "center": { "x": "$target", "y": "$target", "dy": -230 }, "amp": 46 } },
    { "at": 740, "prim": "particles", "args": { "count": 300, "at": { "x": "$target", "y": "$target", "dy": -230 }, "speed": 1500, "life": 700 } },
    { "at": 740, "prim": "damageNumber", "args": { "font": "@font.number", "big": true } },
    { "at": 740, "prim": "tag", "args": { "kind": "WEAK" } },
    { "at": 740, "prim": "sfx", "args": { "id": "hit.heavy" } },
    { "at": 800, "dur": 380, "prim": "tween", "ease": "outCubic", "args": { "target": "$actor", "to": { "x": "home", "y": "home" } } }
  ]
}
```
（v1.1 修正：shockwave 按 §1.2 写在 rgbSplit 后 150ms（890），结束于 1410；命中粒子寿命 700，结束于 1440。高档同屏粒子峰值 340，< 600。）

### 2.2 示例：红色总攻（3.06s，对应 spike playAllOut）

```json
{
  "id": "allout.default", "event": "allout",
  "duration": 3060, "hitMarks": [400, 610, 820, 1030, 1240, 1450, 1660, 1870, 2050],
  "create": [{ "name": "fin", "asset": "allout.finish.default", "layer": "allout" }],
  "assets": ["allout.finish.default", "ally.joker", "ally.arsene", "ally.caitsith", "ally.kelpie"],
  "tracks": [
    { "at": 0,    "dur": 200,  "prim": "dim", "args": { "color": "#000", "alpha": 0.55 } },
    { "at": 0,    "dur": 2200, "prim": "radialBurst", "args": { "rays": 24, "colors": ["@color.primary", "#fff"], "spin": 0.9 } },
    { "at": 0,    "dur": 660,  "prim": "title", "ease": "outBack", "args": { "text": "label.allout", "font": "@font.display", "size": 120, "pos": { "x": 640, "y": 160 }, "rot": -0.1 } },
    { "at": 300,  "dur": 1750, "prim": "silhouetteDash", "args": { "units": "$party", "count": 8, "interval": 210 }, "minimal": { "args": { "units": "$party", "count": 3, "interval": 210 } } },
    { "at": 400,  "dur": 160,  "prim": "slashLine", "repeatEvery": 210, "times": 8, "args": { "len": 840 } },
    { "at": 400,  "prim": "particles", "repeatEvery": 210, "times": 8, "args": { "count": 60, "life": 600, "at": { "x": "$target", "y": "$target", "dy": -230 } } },
    { "at": 2050, "dur": 160,  "prim": "flashScreen", "args": { "color": "#fff", "alpha": 0.9 } },
    { "at": 2050, "dur": 520,  "prim": "shockwave", "args": { "center": { "x": "$target", "y": "$target", "dy": -230 }, "amp": 60 } },
    { "at": 2050, "dur": 970,  "prim": "finishCard", "ease": "outCubic", "args": {
        "artId": "allout.finish.default", "shape": [-760,-330,700,-400,760,330,-700,400], "enterFrom": "right", "zoom": 1.04 } },
    { "at": 2220, "dur": 780,  "prim": "freezeFrame", "args": { "ms": 780 } },
    { "at": 2220, "dur": 780,  "prim": "totalDamage", "ease": "outBack", "args": { "label": "label.totalDamage", "pos": { "x": 700, "y": 560 } } },
    { "at": 2050, "prim": "sfx", "args": { "id": "allout.finish" } },
    { "at": 2860, "dur": 200,  "prim": "tween", "args": { "target": "#layer.allout", "to": { "alpha": 0 } } }
  ]
}
```
`repeatEvery/times` 展开后：slashLine 最后一条 1870–2030，粒子最后一批 1870–2470，均 ≤3060。`finishCard` 的 `artId` 可以按 `match.partySize`/队伍组合做多份。跳过时 finishCard 闪现 ≤150ms 再清场（§3）。

### 2.3 示例：P4 遇敌 + 开战合流（1.15s，组合预算 ≤1.2s）

```json
{
  "id": "transition.encounterBattle", "event": "map:encounter",
  "merges": ["battle:start"],
  "duration": 1150,
  "assets": ["fx.tvstatic", "fx.block"],
  "tracks": [
    { "at": 0,   "dur": 450, "prim": "tvStatic", "args": { "intensity": 0.8, "scanlines": true, "rollPx": 24 }, "minimal": { "dur": 200 } },
    { "at": 0,   "prim": "sfx", "args": { "id": "tv.static" } },
    { "at": 0,   "prim": "vibrate", "args": { "ms": 30 } },
    { "at": 350, "dur": 800, "prim": "blockPush", "args": { "cols": 8, "rows": 5, "order": "diagonal", "color": "@color.primary" }, "minimal": { "dur": 300 } }
  ]
}
```

### 2.4 示例：P3 影时间开始换底（env:change，0.6s）

```json
{
  "id": "env.darkHour.enter", "event": "env:change",
  "match": { "env": { "darkHour": true } },
  "duration": 600,
  "assets": ["bg.hub.night", "bg.hub.darkhour"],
  "tracks": [
    { "at": 0,   "dur": 600, "prim": "dim", "args": { "color": "#0b2a14", "alpha": 0.35 } },
    { "at": 0,   "dur": 400, "prim": "bakedSwap", "args": { "from": "bg.hub.night", "to": "bg.hub.darkhour" } },
    { "at": 0,   "prim": "sfx", "args": { "id": "darkhour.enter" } },
    { "at": 150, "dur": 400, "prim": "title", "args": { "text": "label.darkHour", "font": "@font.display", "size": 72, "pos": { "x": 640, "y": 360 }, "rot": 0 }, "minimal": "skip" }
  ]
}
```

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

## 4. 皮肤插槽与样式 token

### 4.1 插槽（slots）

布局插槽给位置范围（设计像素，相对 1280×720 安全框），皮肤在范围内自由画形状。每个插槽都可以换样式，不能挪出范围。
引擎把 App 给的**逻辑安全矩形**映射到设计坐标；安全矩形变化（转屏、键盘、手势条）时引擎重算插槽位置，皮肤不得缓存旧值。ui.css 里需要贴边时用引擎注入的 CSS 变量 `--umbra-safe-x / -y / -w / -h`，不要写死 inset。

| 插槽 id | 范围（设计像素，安全框内） | 必填 | 说明 |
|---|---|---|---|
| `hud.order` 行动顺序条 | 左上 x 24–520, y 24–110 | 是 | |
| `hud.system` 自动/倍速/暂停 | 右上 x 1000–1256, y 24–90 | 是 | 每个命中区 ≥86 |
| `hud.topInfo` 顶栏信息 | 顶部中间 x 520–1000, y 24–90 | 否 | P4 日期/天气，P3 月相（读 `$env`） |
| `hud.enemyOver` 敌人头顶 | 跟随敌人 | 是 | 弱点、护盾层数、HP |
| `hud.party` 队伍头像 | 左下 x 24–660, y 600–696 | 是 | 只看不点 |
| `hud.command` 指令区 | 右下 **x 780–1256, y 220–696**（宽 476 × 高 476） | 是 | 形状自由（P5 圆弧 / P3 斜列文字 / P4 方块）。布局二选一：**「5 项 + 更多」**（第 6 项起收进「更多」）或**双列**。主 ≥96、次 ≥86 |
| `hud.intent` 敌人意图 | 敌人旁或顶部 | 是 | |
| `fx.banner` 1 MORE 横幅 | 全屏 | 否（有兜底） | |
| `fx.cutin` | 全屏 | 否 | |
| `fx.allout` | 全屏 | **是** | 定格画至少 1 张 |
| `fx.transition` | 全屏 | 否 | 开战/场景转场 |
| `scene.<id>.bg` | 安全框 + 出血 | 是（battle/map/hub） | 背景必须延伸到出血区：横向 ≥2240 宽或可平铺；1920×1080、1440×900 下出血区不得出现大块空白 |
| `scene.talk` | DOM 叠加层 | 否 | 交涉界面，见 §4.3；缺省用引擎默认模板 |
| `scene.result` | 画布 + DOM | 否 | |
| `scene.loading` | 全屏 | 否 | 预热/彩排期间盖住画布 |
| `unit.<id>.portrait` | — | 我方 4 人起 | ≤5 层 + 可选背影；`meshIdle` 配置见 §1.5 |
| `unit.<id>.cutin` / `.highlight` | — | 主角必填 | |
| `enemy.<id>` | — | 否（缺了用通用剪影） | |

### 4.2 样式 token（tokens）

```ts
export interface Tokens {
  color: { primary: string; secondary: string; ink: string; paper: string; accent: string;
           hp: string; sp: string; weak: string; crit: string; resist: string; shadow: string; overlay: string };
  font: { display: string; body: string; number: string };    // display/number 必须在 manifest.fonts 有子集文件；body 写系统字体栈
  stroke: { thin: number; bold: number };                     // 描边宽度（设计像素）
  shape: { slant: number /*rad，P5≈-0.14*/; radius: number; panelSkew: number };
  motion: { uiOpen: Ms /*180–280*/; uiClose: Ms; press: number /*按下缩放，默认 0.9*/ };
  ease: { enter: Ease; exit: Ease; pop: Ease };
  hud: { commandShape: 'arc'|'list'|'grid'|'custom'; commandLayout: 'fivePlusMore'|'twoColumn'; partyStyle: 'card'|'bar'|'portrait' };
}
```
`font.body` 例：`"system-ui, -apple-system, 'PingFang SC', 'Noto Sans CJK SC', sans-serif"`，不打包、不计预算。
文案改名一律走 `labels`，规则 id 不变。至少要给：`label.requestBoard`（委托板）、`label.heartCard`（心之卡）、`label.holdup`、`label.allout`、`label.onemore`、`label.highlight`（P5 HIGHLIGHT/Showtime，P3 Theurgy，P4 必杀/Team Up）、`label.rank`（怪盗等级）、`label.world`（异界）、`label.dive`（潜入/攀登塔层/电视世界）、`label.totalDamage`、`label.more`（「更多」，用 fivePlusMore 时必填）。
ui.css 只能写在 `.umbra-skin-<id>` 根节点下，只能用 transform/opacity 做动效，不准 `@import`、不准外链 `url()`（只能引用 manifest 素材，由引擎改写路径）。

### 4.3 交涉界面 DOM 模板（v1.1 新增）

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

## 5. 每个皮肤的素材预算

参考实测（spike）：首包 gzip 599KB = 代码 196KB + 7 张 webp 403KB；最大单图 allout-finish 1280×720 = 179KB；立绘 360–560px 宽，26–42KB。

| 项 | 上限（每个皮肤） | 说明 |
|---|---|---|
| **首包合计**（引擎 + 标题 + 当前皮肤，gzip） | ≤1.5MB | GDD 原写 2–3MB，按实测收紧 |
| 皮肤首包份额 | ≤1MB（主策划 v1.1 拍板，原 900KB） | 四项各自封顶：图 ≤780KB；recipes/manifest/labels/templates ≤40KB；ui.css ≤24KB（gzip）；字体 ≤120KB；合计 ≤964KB |
| 字体（v1.1） | display 子集首包 ≤120KB，**number 字体计入这 120KB** | body 用系统字体，不打包不计；超出首包字形（如剧情生僻字）放 `pack: "deferred"` 延迟包 |
| 首包图片张数 | ≤14 张或 ≤3 张图集 | 首包只放：战斗背景、我方 4 人立绘、主角 cut-in、通用总攻定格画、HUD 图集、转场所需 |
| 单张全屏图（定格画、cut-in 带、背景主体） | 1280×720（cut-in 带 1280×320）；webp q≈80；≤200KB | 不做 @2x |
| 立绘（每层合计） | 高 ≤640px；整人 ≤60KB | 拆层后进 1 张图集 |
| 图集 | ≤2048×2048 | 粒子/UI 小件必须进图集 |
| 背景出血 | 宽 ≥2240 或可平铺 | 4:3 时上下出血；16:10、16:9 大屏不得出现大块空白 |
| 延迟包（每个异界/BOSS） | ≤600KB，进场景前加载 | 必杀、额外定格画、敌人、延迟字形 |
| 常驻纹理内存（解码后） | ≤96MB | 2048² RGBA = 16MB；全机 ≤256MB |
| 皮肤滤镜 | ≤1 个同屏 | 只有 §1.6 白名单项不计 |
| 音效 | 首包 ≤12 个，AAC，单个 ≤30KB | BGM 流式，不计首包 |

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

## 7. 各方交付清单与验收

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

### 7.2 红色主策划（样板）

交付：§1 全部原语（含 §1.6 白名单判定、粒子同屏总上限、渲染分辨率与设计坐标分离、旋转触摸变换）、默认兜底演出、引擎默认交涉模板与模板填充器、`skins/_contract` 类型、`p5r-red` 完整皮肤包、`skin:timing` 与截图工具。M3 冻结本契约。

### 7.3 黄（p4-yellow）、蓝（p3-blue）、粉（p3r-pink）主题 AI

**照下面顺序做，每步做完打勾再做下一步。** 不懂某个字段时，打开 `skins/p5r-red/` 里同名文件照抄结构再改内容。

**工作量（v1.1 主策划拍板）**：黄 4 天、蓝 4 天、粉 4.5–5 天；三皮并行，约 1 周完成。

第 1 步 建目录（复制红色样板）
```
umbra/skins/<skinId>/
  manifest.json   tokens.json   slots.json   labels.json   templates.json(可选)
  recipes/        assets/       ui.css       index.ts
```
`index.ts` 只做一件事：组装 SkinPack 并 `UMBRA.registerSkin('<skinId>', pack)`。不写任何演出代码，不用动态 import。

第 2 步 素材
- 按 §5 出图：webp、尺寸不超、首包标 `firstPack: true`。
- manifest 每张写 `source`：官方图写 `official`，AI 生成写 `generated`（粉色女主和提奥 = generated，其余 P3R 同伴 = official；v1.1 确认）。
- 立绘拆 ≤5 层，进同一张 ≤2048² 图集；`meshIdle.swayZone` 按 §1.5 写。
- 粉色 `maskWipe` 可用单色剪影图替代顶点（多边形仍 ≤64 顶点）。
- 字体：display + number 首包合计 ≤120KB，超出字形放延迟包；body 写系统字体栈。

第 3 步 tokens + labels
- 填 §4.2 全部字段，不准留空（含 `hud.commandLayout`）。
- labels 按原作改名（例：P4 `label.dive` = 电视世界，`label.highlight` = 必杀；P3 `label.highlight` = Theurgy）。

第 4 步 slots
- §4.1 「必填」的插槽全部实现。指令区画在 **x 780–1256、y 220–696** 内，「5 项 + 更多」或双列二选一；每个按钮命中区次 ≥86、主 ≥96。
- 交涉界面想改结构就写 `templates.json`（§4.3），否则用引擎默认模板。

第 5 步 recipes（最少这些）
| 必交 recipe | 说明 |
|---|---|
| `transition.battleStart` | P4 建议 tvStatic + blockPush；P3/P3R 建议 maskWipe 或 cardShatter。可另交 `merges` 合流版（§2.3） |
| `action.default` | 通用攻击，≤1.0s |
| `action.<主角招牌技能>` ×2 | 含 cut-in，≤1.8s |
| `onemore` | ≤0.45s |
| `holdup` | ≤1.0s |
| `allout.default` | ≤3.5s，含 finishCard + freezeFrame ≤0.8s |
| `highlight.<主角>` + 简短版 | ≤3.5s / ≤1.2s |
| `unit:down`、`battle:end` | unit:down 会在重叠层播，被横幅盖住时文字轨会被丢，别把关键信息只放文字里 |
| 召唤（P3/P3R，v1.1 确认） | 举枪 → 扣扳机前一帧切 glassShatter，**无特写** |
| 日期（P4，可选 P3） | `dateFlip` 用于进/出异界，日期取 `$env` |
| 影时间换底（P3/P3R 用到时必交；P4 可选） | `env:change` + `match.env`，用 `bakedSwap`（§2.4） |
每个 recipe 先写 `duration`，确认 ≤ §3 上限；所有轨道（展开 repeatEvery 后）at+dur ≤ duration，粒子 at+life ≤ duration；所有 `hitMarks` ≤ duration−200。

第 6 步 自检（每条都要过）
1. `npm run skin:check <skinId>` 全绿（schema、时间轴、预算、source、import 白名单、模板白名单）。
2. `npm run skin:timing <skinId>` 1/2/3 倍速 × 完整/极简：每个事件实测时长 ≤ 上限，且没有一次是被强制推进结束的。
3. 截图 **7 个尺寸**：844×390、667×375、1180×820、1024×768、390×844（竖屏旋转）、**1440×900、1920×1080**；每个尺寸 **8 张**（待机、转场、cut-in、命中、总攻中、总攻定格、**交涉界面、结算**），共 56 张。逐张看：按钮不被挡、血条和弱点可见、文字不溢出、出血区有背景且无大块空白、4:3 下角色不被裁、交涉按钮命中区够大。
4. 演出结束后截一张待机图，和演出前对比：没有残留节点或滤镜。跳过 highlight/allout 时确认定格画闪现后清场。
5. 切到其他三个主题再切回来：画面、存档、数值都不变。
（M3 前这两个命令还没有：先用 `umbra-next/spike/tools/run.sh shots <w> <h>` 截图，时长用浏览器 performance 面板量。）

第 7 步 提交说明 `skins/<skinId>/DONE.md`
- 首包份额（KB，分图/数据/ui.css/字体四项）、图集数、常驻纹理估算（MB）。
- 每个 recipe 的 duration 与实测时长表。
- 56 张截图路径。
- 素材清单：official / generated 各几张。
- 没做完的项和原因。

**主策划验收（不过就退回）：** 契约 §0 全部 11 条；§3 时长全部合规；§5 预算全部合规；manifest 逐张核对 source；真机（中端 Android + iPhone 11 级）最密集演出 250ms 窗口最低 ≥30fps；首次技能最长帧 ≤50ms；四主题互相切换无污染。

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

## v1.2 修订（主策划拍板，10-22 01:55）——以本节为准，覆盖上文冲突处

1. **ui:open/close 允许 clip-path 动画**：仅限 ui:open/ui:close、单个面板、≤280ms，可与 transform/opacity 组合；不得阻塞或抢占输入，可被打断。仍不进 Director。
2. **交涉模板允许静态形状**：静态 clip-path、mask-image（只能引用 manifest 内素材 id 生成的 url）允许使用；svg 仍禁止。
3. **labels 必填新增** `label.darkHour`、`label.more`。
4. **Env.weather 枚举新增 `'storm'`**；皮肤没做 storm 时自动落到 `'rain'`。天气未知为 `'unknown'`。
5. **交涉选项上限 4**（规则层保证），choices 子模板不需要滚动。
6. env 由 App 单点计算：date/weekday 用设备本地日期，moonPhase 用固定公式，darkHour 取 App 设置；皮肤不得自行按系统时间重算。
7. 每个 recipe 展开 repeatEvery 后轨道数 ≤64；hitMarks 必须升序、非负、数量 = payload.hits.length，且末个 hitMark ≤ duration−200。

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

依据：CONTRACT-v1.3-DRAFT（03:55 / 04:55 两批）、FX-MAP-v1.1（§D §F §G §I）、AUDIO-MAP-v1（§1 §4 §5 §6）、M3 红色样板 `labs/umbra-m3-red/`（feat/umbra-skin-p5r-red，第五阶段 + 10-22 HOLD UP 构图修复）、决定 D-003～D-008。
原则不变：**只加不删**。v1.2 的事件、原语、字段、上限全部保留；本节写明的改动覆盖上文同名条目。草案里所有「v1.3 提案」标记到此作废，下表即正式条目。

### v1.3-0 一览（每条后面是本节小节号）

| # | 改动 | 小节 |
|---|---|---|
| 1 | `hud.system` 槽位改为 x 990–1256、y 24–110 | 1 |
| 2 | 时长校验口径 = duration + 全部 hitStop 停帧之和；`match.side` / `ActionPayload.side` 区分我方 1.8s / 敌方 1.5s | 2 |
| 3 | 新增事件 **8 + 15 + 1 + 4 + 21 = 49 个事件名**（第一批 8、第二批 15（含 bgm:cue）、holdup:result、探索 4、音频与零散 13 组 21 个名）；holdup 改三选一；highlight 增加 SHOWTIME 字段；battle:start 增加 leadId / mode | 3a–3f |
| 4 | Director：重叠层成员扩到 4 个事件并定优先级；新增「A 类（只发音频/HUD，不进 Director）」；可跳过事件名单 | 3g |
| 5 | 新增引擎原语 17 个（含 camera、holdupRing）+ 原 v1.2 名单里的 blockPush/tvStatic/glassShatter/cardFlip/cardShatter/dateFlip/skinFilter 转为「已实现」 | 4 |
| 6 | 名单驱动素材引用 `$actor.*` / `char.$party`、manifest `group` 懒加载分组、`frames` 图集帧、fonts `unicodeRange` | 4.4 |
| 7 | 命中结果分支 `match.hit` | 5 |
| 8 | 预留玩法模式 `battle:start.mode = turn | tactics` | 6 |
| 9 | **音频**：目录 `skins/<id>/audio/{bgm,se,voice}/` + `playlist.json` / `sfx.json` / `voice.json`（+ 引擎生成的 `present.json`），缺文件静默；sfx 原语与 recipe `sfx` 简写；bgm:cue 选曲规则 | 7 |
| 10 | labels 新增必填与可选键（含 `showtime.title.<a>-<b>`） | 8 |
| 11 | skin:check 新增校验项 | 9 |

---

### 1. 槽位
- `hud.system`：**x 990–1256、y 24–110**（rect `[990, 24, 266, 86]`）。原 256×66 放不下 3 个 ≥86 的命中区（红黄蓝粉四皮都撞到）。其他槽位不变。
- `hud.command` 增加一个**状态子集** `sets.holdup`（HOLD UP 三选一用，仍在 x 780–1256、y 220–696 内）。引擎的 HOLD UP 包围构图会避开 `sets.holdup` 所有命中区的最左缘（见 §4.2 holdupRing）。
- 「指令区左下 + 队伍右下」第二套槽位（左手/更贴近 P5R 原作）**本版不开**，记入 §8 风险。

### 2. 时长计算
1. **校验口径**：`duration + Σ(hitStop 停帧时长) ≤ 事件上限`（停帧冻结演出时钟，墙钟会比 duration 长）。skin:check 与引擎 Director 用同一口径；hitStop 单次 ≤90ms 不变。
2. `Recipe.match.side?: 'ally' | 'enemy'`；`ActionPayload.side?: 'ally' | 'enemy'`（App 必填，皮肤只读）。action 上限：`side='enemy'` 取 1.5s / 0.5s，其余取 1.8s / 0.6s。
3. 停帧期间不推进 sfx 时间轴（§7）。

### 3. 新增事件
通用规则（3a–3f 全部适用）：
- 上限按 1 倍速，实际上限 = 上限 ÷ 倍速；到点 abort 清场，无宽限期（同 §3）。
- 皮肤没实现 → 引擎默认演出兜底（红色样板通用版）。
- 「完整/标准 | 极简」两档同 §3；「可跳过」= 点击直接跳到清场状态。
- payload 一律深冻结（§0.11）。下表 payload 字段名是正式名，App 必须原样发出。

#### 3a. 第一批（FX-MAP §D）

| 事件 | payload | 完整/标准 | 极简 | 调度 |
|---|---|---|---|---|
| `baton` | `{ fromId, toId, bonus }`（bonus = 接棒加成档 1–3） | 0.6s | 0.25s | 主线阻塞 |
| `persona:switch` | `{ unitId, personaId, prevPersonaId }` | 0.5s | 0.2s | 主线阻塞 |
| `shield:break` | `{ unitId, layersLeft }` | 0.5s | 0.2s | **重叠层**（3g） |
| `levelup` | `{ unitIds: string[], stats: { id, lv, delta: Record<stat, number> }[] }`（同一次结算的多人合并为 1 个事件） | 1.0s | 0.4s | 主线阻塞；战斗结算后，可与 RESULT 画面并存（不阻塞 NEXT 按钮） |
| `card:pick` | `{ cards: { id, rarity, title }[] }` | 0.6s | 0.3s | 主线阻塞，之后进 DOM 选择 |
| `buff:grant` | `{ buffs: { id, source }[], source: 'todo' | 'record' | 'other' }` | 0.8s | 0.3s | 主线阻塞（开局） |
| `boss:phase` | `{ bossId, phase }` | 2.0s | 0.6s | 主线阻塞，**可跳过**；同时发 bgm:cue boss.p2 |
| `fusion:result` | `{ personaId, accident: boolean }` | 3.0s | 1.0s | 主线阻塞，**可跳过**（天鹅绒，非战斗） |

> 与草案差异：levelup 由 `{unitId, statsDelta}` 改为合并版（M3 样板实测，四人逐个阻塞太长）；baton 的 `$actor` = fromId、`$target` = toId（引擎解析 Ref，原语不用自己读字段）。

#### 3b. 第二批（FX-MAP §G；SYSTEMS-AUDIT-v1 §5 + D-006/D-007/D-008）

| 事件 | payload | 完整/标准 | 极简 | 调度 |
|---|---|---|---|---|
| `shop:enter` | `{ shopId, skinShopId, firstVisitToday }` | 完整 1.2s（当天首次）/ 简短 0.5s | 0.3s | 主线阻塞，之后店主界面 DOM；recipe 名 `shop.enter.<skinShopId>.full / .short` |
| `shop:exit` | `{ shopId, purchased }` | 0.6s | 0.25s | 主线阻塞 |
| `party:switch` | `{ outId, inId }` | 0.5s | 0.2s | 主线阻塞 |
| `bond:assist` | `{ kind: 'followup'|'protect'|'endure'|'cure'|'lift', unitId, targetId? }` | 0.8s | 0.3s | 主线阻塞；recipe 名 `bond.assist.<kind>` |
| `ailment:apply` | `{ unitId, status }` | 0.4s | 0.15s | **重叠层** |
| `ailment:cure` | `{ unitId, status }` | 0.4s | 0.15s | **重叠层** |
| `escape` | `{ result: 'success' | 'fail' }` | 0.6s | 0.25s | 主线阻塞；成功后发 bgm:cue 回探索曲 |
| `velvet:alarm` | `{}` | 0.8s | 0.3s | 主线阻塞（据点） |
| `fusion:accident` | `{ resultId }` | 1.0s | 0.4s | 主线阻塞，紧接 fusion:result 之前 |
| `callingcard:send` | `{ targetId }` | 3.0s | 1.0s | 主线阻塞，**可跳过** |
| `explore:scan` | `{}` | 起效 0.4s，显示 ≤2s | 0.2s / ≤2s | 起效段阻塞；显示段不阻塞（引擎转为 HUD 覆盖层，2s 后自动撤） |
| `achievement:unlock` | `{ id }` | — | — | **A 类**：DOM 角标，不进 Director |
| `persona:levelup` | `{ personaId, newLevel, learned: string[] }` | 0.8s | 0.3s | 主线阻塞（结算后，接在 levelup 后） |
| `bond:rankup` | `{ unitId, rank, unlocked: string[] }` | 1.5s | 0.5s | 主线阻塞，**可跳过**（据点/App） |
| `bgm:cue` | `{ cueId: string | null, crossfadeMs?, loop?, cond? }` | 不占 Director 时钟 | 同 | **音频总线**；交叉淡化 战斗→胜利 ≤300ms，其余 ≤1000ms；cueId=null 为停（§7.4） |

（第二批共 16 行，其中 levelup 与 3a 同一事件，故新增事件名 15 个。）

#### 3c. HOLD UP 结果（补漏）
- `holdup` payload 正式为 `{ enemyIds: string[], partyIds: string[] }`（原 v1.2 只有 enemyIds）；演出后弹**三选一**（总攻 / 交涉 / 放过；v1.2 写的「二选一」作废），按钮在 `hud.command.sets.holdup`。
- 新增 `holdup:result`：

| 事件 | payload | 完整/标准 | 极简 | 调度 |
|---|---|---|---|---|
| `holdup:result` | `{ choice: 'allout' | 'talk' | 'release', enemyIds: string[] }` | 0.4s | 0.15s | 主线阻塞；recipe 名 `holdup.result.<choice>`，用 `match.choice` 选；播完：allout → `allout`，talk → `talk:start`，release → `unit:flee` + `battle:end`（奖励由规则层定） |

- 规则层在玩家按下按钮时先提交选择（幂等键 = holdup 的 checkpointId + choice），再发 holdup:result。连点、重进不会重复选择。

#### 3d. 探索事件（D-003，FX-MAP §F；v1.2 未列，本版补齐）

| 事件 | payload | 完整/标准 | 极简 | 调度 |
|---|---|---|---|---|
| `explore:move` | `{ unitId, from: [x,y], to: [x,y], path: [x,y][] }` | 0.25s / 格 | 0.12s / 格 | 主线阻塞（整条路径一个事件，上限 = 格数 × 单格上限，封顶 2.0s） |
| `explore:cover` | `{ unitId, cell: [x,y], coverId }` | 0.3s | 0.15s | 主线阻塞 |
| `explore:spotted` | `{ enemyId, alert }` | 0.5s | 0.2s | 主线阻塞 |
| `explore:interact` | `{ kind: 'chest'|'device'|'talk', targetId }` | 0.4s | 0.2s | 主线阻塞，之后 DOM |

#### 3e. 音频与零散事件（AUDIO-MAP §5 的 13 组；FX-MAP-v1.1 §I）
类：**D** = Director 主线；**A** = 不进 Director（音频总线 + HUD/DOM 小提示，皮肤只给 sfx id、labels、HUD 样式）。

| # | 事件 | payload | 类 | 完整/标准 | 极简 | 默认音 |
|---|---|---|---|---|---|---|
| 1 | `ui:cursor` `ui:confirm` `ui:cancel` `ui:page` `ui:error` | `{ context }` | A | — | — | se.ui.cursor / confirm / cancel / page / error |
| 2 | `item:get` / `money:get` | `{ itemId, count }` / `{ amount }` | A | HUD 角标 ≤1.2s | 同 | se.item.get / se.money.get |
| 3 | `shop:buy` | `{ shopId, itemId }` | A | — | — | se.shop.buy |
| 4 | `skill:learn` | `{ unitId?, personaId?, skillId }` | A（在 persona:levelup / levelup 演出里亮字） | — | — | se.skill.learn |
| 5 | `unit:spawn` / `unit:flee` | `{ enemyIds }` | D | 0.6s | 0.25s | se.enemy.appear / se.enemy.vanish |
| 6 | `unit:revive` / `unit:lowhp` | `{ unitId }` | D / A | 0.6s / — | 0.25s / — | voice.<unitId>.revived / voice.<unitId>.lowhp（lowhp 每人每场最多 1 次，阈值 HP<25%） |
| 7 | `intent:show` | `{ enemyId, intentId }` | A | — | — | se.intent |
| 8 | `navi:scan` | `{ enemyId, affinity }` | A | — | — | se.navi.scan + voice.navi.scan |
| 9 | `explore:sneak` | `{ unitId, from, to }` | D | 0.35s / 格 | 0.15s / 格 | se.sneak |
| 10 | `alert:change` | `{ level: 'low'|'mid'|'high', value }` | A | — | — | se.alert.up；level=high → bgm 条件 `alert: 'high'` |
| 11 | `explore:exit` | `{ gateId }` | D | 0.8s | 0.3s | se.exit.open |
| 12 | `boss:intro` | `{ bossId }` | D，**可跳过** | 2.0s | 0.6s | bgm:cue boss.intro |
| 13 | `run:fail` / `run:retreat` | `{ reason }` | D | 1.5s / 1.0s | 0.5s / 0.4s | bgm:cue gameover / explore.escape |

#### 3f. 已有事件的字段补充
- `Recipe.match` 新增键汇总：`side`、`summon`、`hit`、`highlight`、`pairIds`、`choice`（holdup:result）、`kind`（bond:assist）、`status`（ailment:*）、`skinShopId`（shop:*）、`result`（escape）。未列出的 payload 字段不能用于 match。
- `battle:start`：增加 `leadId`（扯面具/开战眼部横条用的领队）与 `mode: 'turn' | 'tactics'`（默认 turn，§6）。
- `highlight`：`HighlightPayload = ActionPayload & { kind: 'solo' | 'duo'; pairIds?: [string, string] }`。SHOWTIME / 合体魔法 / 连携追击都走 `highlight`（kind=duo），不新增事件。recipe 可写 `match.highlight: 'solo' | 'duo'`、`match.pairIds: [a, b]`（无序匹配）。可组合的两人表由皮肤 `roster.showtime: [a, b][]` 提供（D-005：只用本作角色）。
- `action`：`HitResult` 增加 `shieldBroken?: boolean`（护盾击破时 App 另发 shield:break）。

### 3g. Director 调度补充（覆盖 §3.1 第 2、3 条中冲突处）
1. **重叠层成员**：`unit:down`、`shield:break`、`ailment:apply`、`ailment:cure`。同时最多 1 个；优先级 unit:down > shield:break > ailment:*。新来的优先级 ≥ 当前 → 当前跳到清场、新来的开始；新来的优先级更低 → 新来的丢弃演出（HUD 状态图标照常更新，规则不受影响）。
2. **A 类事件**（3b 的 achievement:unlock、3e 标 A 的全部、bgm:cue）不进 Director：不排队、不占主线、不受输入缓冲影响，直接调音频总线 / HUD；任何时刻都可触发。
3. **可跳过名单**：highlight、allout、boss:phase、boss:intro、fusion:result、callingcard:send、bond:rankup。跳过 highlight/allout 时 finishCard 仍闪现 ≤150ms（§3 例外照旧）。
4. **explore:scan 两段**：起效段（≤0.4s）按主线阻塞事件处理；显示段转为 HUD 覆盖层，2s 内撤掉，期间可以正常输入。
5. **组合预算** 照旧只有 map:encounter + battle:start（≤1.2s，极简 ≤0.7s）。boss:intro 紧接 map:encounter 时不合流，按顺序播。

### 4. 新增引擎原语（M3 红色样板全部实现，2D/Pixi，参数为正式参数）
单项上限超了 skin:check 报错。所有原语都遵守 §0.8 清场、§6 粒子总上限。

#### 4.1 角色与召唤
| 原语 | 参数（args） | 单项上限 | 说明 |
|---|---|---|---|
| `summon` | `style?: 'maskRip' | 'evoker' | 'tarot'`（缺省按皮：红 maskRip、蓝粉 evoker、黄 tarot）、`x?`, `y?` | 900ms | 读 `$actorPersona`：引擎按行动者**当前面具**解析素材 id `persona.<personaId>`。recipe 用 `match.summon: 'full' | 'quick'` 区分本场首次召唤（完整版）与之后（快速版），由宿主传入「该角色本场是否已召唤」 |
| `personaShow` | `dx`, `dy`（相对行动者，设计像素）、`scale` | 1100ms | 人格面具在行动者身后显形、施法姿态、溶解 |
| `nameplate` | `text?`（labels key；缺省 `skill.<skillId>.name`）、`element?`、`side?` | 1200ms | 原作左上技能名黑条 + 属性圆标 |
| `pose` | `pose`（姿态名）、`keys?`、`target?`、`reset?` | 1800ms | 2D 立绘骨骼姿态（前冲/后仰/举枪），只动 `ally/enemy` 层的角色节点 |
| `batonPass` | — | 800ms | 交接：两人半身从两侧甩入 → 击掌星爆 → `label.baton` 剪报字；读 `$actor`/`$target` |
| `showtimeLogo` | — | 900ms | SHOWTIME 立体剪报字逐个砸下（字取 `label.highlight`） |
| `maskRip` | — | 700ms | 开战扯面具（领队 = payload.leadId） |

#### 4.2 镜头与包围（第五阶段新增）
**`camera`**（单项上限 3500ms）——伪 3D 镜头，图层视差。
- args：`keys: { at: 0..1, x?, y?, zoom?, rot?, ease? }[]`（at 是本轨道 dur 的比例；x/y 设计像素，正 = 镜头右/下移 → 画面左/上移；zoom 为增量；rot 为弧度；ease 取 §2 Ease）、`focus?: '$target' | '$actor' | '$enemies' | Vec`（推拉中心，缺省 `$target`；`$enemies` = 存活敌人中心）、`snapFocus?: boolean`。
- 景深权重（引擎常量，皮肤不能改）：bg 0.35、enemy 0.75、ally 1.15、fx 0.75；dmg 层跟随 enemy 层；hud / cutin / allout / trans 层不受镜头影响。
- 同一时刻只有 1 条 camera 轨道生效（后开始的覆盖先开始的）；轨道结束后镜头 180ms 指数回落。
- **待机环绕**由引擎负责（不是 recipe）：镜头绕敌群缓慢环绕，敌人层不动（命中区、头顶名牌不偏），背景反向、前景同向；画质 low 档或演出级别 minimal 时幅度为 0。演出期间待机环绕自动压掉。
- 建议所有 camera 轨道写 `"minimal": "skip"`。

**`holdupRing`**（单项上限 1000ms）——HOLD UP 环绕包围。
- args：`orbit?`（镜头绕敌群转角，弧度，缺省 1.2）。读 payload `partyIds`（前 4 人）、`enemyIds`。
- 素材：每人 `char.<id>#body`（全身本色图，manifest 图集帧）。
- 终点构图由引擎统一计算（与 HOLD UP 菜单静帧同一套，交接无跳变）：**前排两人守左右两翼、后排两人抬高缩小站在倒地敌群身后（敌人层底部）**；四人沿「可视区左缘（宽屏出血区取一半）～ `sets.holdup` 最左命中区 −12」等分站位，不进指令区、脚底不压 `hud.party` 顶边；1–5 只敌人、1–4 名队员都成立。皮肤不能改站位，只能换素材和 orbit。

#### 4.3 P3 / P4 系与 SHOWTIME 四段
| 原语 | 参数 | 单项上限 | 说明 |
|---|---|---|---|
| `eyeStrip` | `art?`, `color?`, `angle?`, `y?`, `figure?`, `figureX?`, `name?`, `plate?`, `noPlate?`, `p5?` | 700ms | 眼部横条 cut-in（P3 暴击/击倒；P5 开战领队眼部） |
| `onomatopoeia` | `text`（labels key，如 `sfx.kacha`）、`size?`, `x?`, `y?`, `rot?`, `fill?`, `stroke?` | 600ms | 巨大剪影拟声字 |
| `checkerFloor` | `color?`, `color2?`, `horizon?`, `sky?` | 1200ms | P3 总攻收尾棋盘地面 |
| `ringSplash` | `art?`, `color?`, `rx?`, `ry?`, `text?`（缺省 `label.finish`）、`bigText?`（缺省 `label.massDestruction`） | 1000ms | P3 总攻收尾色块定格 |
| `comicPanels` | — | 1100ms | SHOWTIME ①漫画分格开场（读 pairIds） |
| `duoEntrance` | — | 1100ms | ②两人入场、名牌、蓄力 |
| `duoStrike` | — | 900ms | ③合击（命中帧在 dur 45%） |
| `duoTitle` | — | 1100ms | ④定格标题：labels `showtime.title.<a>-<b>` 存在就用，否则「A × B」 |

#### 4.4 素材引用与 manifest 补充
- 名单驱动引用：`$actor.portrait`、`$actor.cutin`、`$actor.finish`、`$actor.persona`、`$actorPersona`；recipe `assets` 可写 `char.$party`（展开为当前队伍每人的 `char.<id>`）。素材按角色 id 懒加载，不进首包。
- `ManifestAsset.group?: string`：懒加载分组。`head:<id>` 随队伍进首包；`char:<id>`、`back:<id>`、`show:<a>-<b>` 按需加载。
- `ManifestAsset.frames?: Record<name, [x, y, w, h]>`：图集帧，引用写 `<assetId>#<frame>`。
- `Manifest.fonts[].unicodeRange?`：中文分片必需；允许合成字形分片（`note` 写合成来源）。

### 5. 命中结果分支
action recipe 可写 `match.hit: 'weak' | 'crit' | 'resist' | 'drain' | 'repel' | 'miss'`，作为**命中段子 recipe**：引擎先播主 recipe，到 hitMark 时按该次 HitResult 选子 recipe 叠加（子 recipe 时长计入主 recipe 上限）。P3 弱点/暴击眼部横条、P4 星星字都挂这里。

### 6. 预留玩法模式
`battle:start.mode: 'turn' | 'tactics'`（默认 turn）。tactics 预留事件 `unit:move`、`cover:take`、`triplethreat`，本版不定 payload，皮肤不需要实现，引擎兜底。

### 7. 音频（D-008；取代草案 §7 与 FX-MAP v1 §H 的旧路径）
#### 7.1 目录与清单
```
skins/<skinId>/audio/
  playlist.json   BGM 池（场景 cueId → 曲目、条件、循环点、权重）
  sfx.json        SE id → 文件（可多变体）+ alias（recipe 短 id → se.*）
  voice.json      unitId → key → 文件[]
  present.json    【引擎构建脚本生成，皮肤不手写】实际存在的音频文件列表
  bgm/<cueId>__<slug>.opus（.m4a 回落）
  se/<se-id>.opus（变体 se/<se-id>~2.opus）
  voice/<unitId>/<key>_<nn>.opus
```
- 私有仓库照常提交音频文件（D-008 05:02）；音频 `source` 视同 official：打包到公开/CDN 目标时 skin:check 报错（同 v1.2 修订 8）。
- 编码 Opus 96k 立体声（BGM）/ 64k 单声道（SE、语音），AAC 回落；响度 −16 LUFS，真峰值 ≤ −1 dBTP。
- **首包不含任何音频**，不计入 §5 首包预算。预取分级 P0–P4 照 AUDIO-MAP §6.4；本地缓存按皮分桶，LRU 上限 150MB。

#### 7.2 三个 json 的结构（字段名为正式名）
```ts
// playlist.json
{ skin: SkinId; version: 1;
  defaults?: { crossfadeMs?: number /*800*/; victoryCrossfadeMs?: number /*300*/; noRepeat?: boolean /*true*/ };
  entries: { id: string; scene: string /*cueId*/; condition?: Record<string, string | boolean>;
             tracks: { file: string; title?: string; source?: string; loopStart?: number; loopEnd?: number /*秒；0/0 = 待标*/; weight?: number }[];
             loop?: boolean /*默认 true*/; basis?: 'original' | 'borrowed' | 'unverified'; priority?: 'P0'|'P1'|'P2'|'P3'|'P4'; enabledByDefault?: boolean }[] }
// sfx.json
{ skin: SkinId; se: Record<seId, { files: string[]; gainDb?: number; basis?: string }>; alias?: Record<shortId, seId> }
// voice.json
{ skin: SkinId; voice: Record<unitId, Record<voiceKey, string[]>> }   // voiceKey 名单见 AUDIO-MAP §4.1
```

#### 7.3 触发方式
1. **sfx 原语**（v1.2 已有，参数补正式）：`{ prim: 'sfx', at, args: { id, bus?: 'se' | 'voice', unit?, key? } }`。bus=se：id 先查 `sfx.alias` 再查 `sfx.se`；bus=voice：播 `voice[unit ?? $actor][key]` 随机一条。
2. **recipe 级简写**：`Recipe.sfx?: { id, at, bus?, unit?, key? }[]`，skin:check / 引擎加载时展开成 sfx 轨道（计入轨道数 ≤64）。
3. 皮肤没写 sfx → 引擎按 FX-MAP-v1.1 §H 默认表播。
4. 停帧期间 sfx 时间轴不推进；演出被 abort/跳过时，尚未触发的 sfx 不再触发，已在播的 SE 不截断。
5. **缺文件静默**：文件不在 present.json 里就不发请求（不产生 404），只在调试日志记 `se:<id>(silent)`；音频完全缺失时不创建 AudioContext。

#### 7.4 bgm:cue 选曲
1. 候选 = `entries` 中 `scene === cueId`、`enabledByDefault !== false`、且 `condition` 每个键都与当前条件相等的条目；条件键最多的胜出（D-008「按原作情境」）。条件来源：env（time/weather/darkHour/moonPhase）、局内状态（callingCard、encounter、alert、phase）。
2. 胜出条目内按 weight 随机抽 1 首，`noRepeat` 时不连续重复同一首；存档 `audioPrefs[skinId][entryId | trackFile] = 'lock' | 'off'`（设置里锁定/关闭），不改 json。
3. 同 cueId 正在播 → 不重启。交叉淡化：战斗 → victory ≤300ms，其余用 `crossfadeMs`（≤1000ms）。`loopEnd > loopStart` 时按循环点无缝循环。
4. 场景类 recipe 可写 `bgm: { cueId, crossfadeMs? }`，等价于同时发 bgm:cue。
5. cueId 正式名单 = FX-MAP-v1.1 §G4（含 v1.1 追加）。settings 为 hold（不切歌）；compendium / fusion 用 velvet 池。
6. 三条总线 BGM / SE / 语音各有音量（设置三档）；首次用户输入后才解锁 AudioContext；切后台暂停、回前台恢复。

### 8. labels
- **必填新增**（引擎默认演出会读，缺了 skin:check 报错）：`label.baton`、`label.battleStart`、`label.finish`、`result.levelup`、`tag.WEAK` `tag.CRIT` `tag.RESIST` `tag.MISS` `tag.NULL` `tag.REPEL` `tag.DOWN`、每名 roster 成员的 `unit.<id>` 与 `persona.<id>`、recipe 中出现的每个技能的 `skill.<id>.name`。
- **可选**：`showtime.title.<a>-<b>`（a、b 按 `roster.showtime` 里的书写顺序；没有就显示「A × B」）、`label.massDestruction`（P3 系 ringSplash 底字）、`sfx.<名>`（拟声字，如 `sfx.kacha`）、`navi.*`（导航台词）、`result.levelup.sub`、`num.cn`。
- labels 只放文案；规则 id、cueId、se id 不改名。

### 9. skin:check 新增校验
1. 时长：duration + Σ hitStop ≤ 上限（按 match.side 选我方/敌方上限）。
2. 事件名、原语名必须在 v1.3 名单内；未知原语 = 错误。
3. 原语单项上限（§4 表）；camera.keys 的 at 升序且在 0–1 内。
4. labels 必填键（§8）。
5. 音频：`sfx` 轨道 id 在 sfx.json（含 alias）中、voice key 在 voice.json 中、playlist 的 scene 在 cueId 名单中 —— **缺失只告警不失败**（引擎静音兜底）；`loop: true` 且 loopEnd=0 告警；公开目标包含 audio/ 文件 = 错误。
6. `hud.system` 新范围；`sets.holdup` 存在时 3 个命中区都在 `hud.command` 内且 ≥86（主 ≥96）。

### 10. 本版未定 / 风险（并入 §8）
1. 「指令区左下 + 队伍右下」第二套槽位：本版不开，M4 视用户反馈。
2. 1 MORE 上限 0.45s 短于原作（约 0.6–0.8s）：本版不改，红色样板实测 0.42s 可接受。
3. tactics 模式三个预留事件的 payload 未定。
4. 音频获取：四皮 v1 必需曲目与 SE 尚未入库（AUDIO-MAP §7），缺文件静默，不阻塞开发。
