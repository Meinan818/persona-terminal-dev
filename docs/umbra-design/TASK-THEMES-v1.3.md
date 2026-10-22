# 幽影协议 UMBRA · 主题皮肤任务书 v1.3（定稿）
> **✅ v1.3 开工令（10-22 09:40，主策划）**：先读**文末「v1.3 修订」节**（逐步照做版，含验证、常见错误、回滚），再按需查正文。冲突时以文末 v1.3 修订为准，其次 v1.2 修订节，最后正文。母本 `CONTRACT-v1.3.md`，对照表 `FX-MAP-v1.1.md`。读者：黄 / 蓝 / 粉。
> 下面「v1.2 开工令」保留作背景（分支、只改哪些目录等规则仍然有效）。
> **✅ 开工令（10-22，主策划）**：本任务书 v1.2 定稿，评审结束，可以开工。
> - 分支：从 `origin/feat/theme-kit-integration` 各拉 `feat/umbra-skin-<你的身份>`（p4-yellow / p3-blue / p3r-pink），只改 `src/umbra/skins/<你的身份>/` 和 `docs/umbra-progress/<你的身份>.md`，不碰引擎、App、规则和其他皮肤。`skins/p5r-red` 样板之后由主策划提交，没出来前照 §2 示例写。
> - 引擎和 skin:check 还没交付，本阶段只做：① 素材（官方/生成，manifest 逐张标 source）→ ② tokens / labels / slots → ③ recipes JSON（按 §2 schema 和示例）。§7.3 里需要跑引擎截图和 skin:check 的自检步骤，等主策划通知再做。
> - 每完成一步：提交并推送自己的分支，在 `docs/umbra-progress/<你的身份>.md` 写一行「完成了什么 / 自查结果 / 下一步」。
> - 遇到本文没写到的取舍，写进进度文件等主策划答复，不要自己改契约。
> 本文件给黄、蓝、粉，**不用和 App AI 沟通**。

| 本版相对 v1 改了什么 | 位置 |
|---|---|
| hud.command y 220–696、「5 项+更多」或双列；命中区次 ≥86/主 ≥96；交涉 DOM 模板；env + env:change | §0.7 §4.1 §4.3 §2 §3 |
| 字体 display+number 首包 ≤120KB、body 系统字体；截图 7 尺寸×8 张=56；swayZone 格式；跳过时 finishCard 闪 ≤150ms；maskWipe 剪影图 | §5 §7.3 §1.5 §3 §1.4 |
| **删除 handlers**（只能写声明式 recipe）；禁动态 import；粒子同屏上限 600/300/150；滤镜白名单（禁模糊/发光）；unit:down 进重叠层、被横幅盖时不出字 | §0 §1.6 §6 §3.1 |
| 召唤/P4 原语/粉色素材来源确认；工作量 黄 4 天、蓝 4 天、粉 4.5–5 天，并行约 1 周；示例修正 | §7.3 §2 |

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

## 7. 交付清单与验收

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

## v1.2 修订（主策划拍板，10-22 01:55）——以本节为准，覆盖上文冲突处

1. **ui:open/close 允许 clip-path 动画**：仅限 ui:open/ui:close、单个面板、≤280ms，可与 transform/opacity 组合；不得阻塞或抢占输入，可被打断。仍不进 Director。
2. **交涉模板允许静态形状**：静态 clip-path、mask-image（只能引用 manifest 内素材 id 生成的 url）允许使用；svg 仍禁止。
3. **labels 必填新增** `label.darkHour`、`label.more`。
4. **Env.weather 枚举新增 `'storm'`**；皮肤没做 storm 时自动落到 `'rain'`。天气未知为 `'unknown'`。
5. **交涉选项上限 4**（规则层保证），choices 子模板不需要滚动。
6. env 由 App 单点计算：date/weekday 用设备本地日期，moonPhase 用固定公式，darkHour 取 App 设置；皮肤不得自行按系统时间重算。
7. 每个 recipe 展开 repeatEvery 后轨道数 ≤64；hitMarks 必须升序、非负、数量 = payload.hits.length，且末个 hitMark ≤ duration−200。

---

## v1.3 修订（主策划定稿，10-22 09:40）——以本节为准，覆盖上文冲突处

> 母本：`docs/umbra-design/CONTRACT-v1.3.md` 文末「v1.3 修订」节（下称「母本 v1.3-§x」）。对照表：`FX-MAP-v1.1.md`（每个事件四皮各演什么）。音频清单：`AUDIO-MAP-v1.md`。
> 红色样板（照着抄格式）：分支 `origin/feat/umbra-skin-p5r-red` 的 `labs/umbra-m3-red/src/umbra/skins/p5r-red/`。
> 本节写给黄（p4-yellow）、蓝（p3-blue）、粉（p3r-pink）。**一步一步照做，每步做完跑「验证」，通过再提交。** 遇到本文没写的取舍，写进 `docs/umbra-progress/<你的身份>.md` 等答复。

### 0. 开工前（每次都做）
```sh
git fetch origin
git switch feat/umbra-skin-<你的身份>
git merge --no-edit origin/feat/theme-kit-integration     # 拿到 v1.3 文档
git status                                                # 必须干净
```
只改 `src/umbra/skins/<你的身份>/` 和 `docs/umbra-progress/<你的身份>.md`。禁止动 main、`git reset`、`git stash`、`git clean`。提交 md 要 `git add -f`。
看样板文件的办法（只看不改）：
```sh
git show origin/feat/umbra-skin-p5r-red:labs/umbra-m3-red/src/umbra/skins/p5r-red/slots.json | less
git show origin/feat/umbra-skin-p5r-red:labs/umbra-m3-red/src/umbra/skins/p5r-red/recipes/holdup.json
```

### 1. 本版你要交什么
| 步 | 文件 | 必做 / 可选 |
|---|---|---|
| 1 | `slots.json`：hud.system 新范围 + `hud.command.sets.holdup` 三个按钮 | 必做 |
| 2 | `labels.json`：v1.3 必填键 | 必做 |
| 3 | `roster.json`：队伍名单 + 双人组合表 `showtime` | 必做 |
| 4 | `recipes/`：holdup（改）、holdup.result.release、baton、levelup、技能召唤 summon 风格 | 必做 |
| 5 | `recipes/`：其他 v1.3 新事件 | 可选（不做引擎兜底） |
| 6 | `audio/` 三个 json 骨架 | 必做（音频文件可先不放） |
| 7 | 自检脚本 | 必做 |

---

### 步 1　slots.json
1. `hud.system` 改到新范围（x 990–1256、y 24–110），三个按钮各 86×86：
```json
"hud.system": { "rect": [998, 24, 258, 86], "buttons": [
  { "id": "auto",  "label": "sys.auto",  "hit": [998, 24, 86, 86] },
  { "id": "speed", "label": "sys.speed", "hit": [1084, 24, 86, 86] },
  { "id": "pause", "label": "sys.pause", "hit": [1170, 24, 86, 86] } ] }
```
2. 在 `hud.command.sets` 里加 `holdup`（三选一：总攻=主按钮 ≥96 高、交涉、放过；全部在 x 780–1256、y 220–696 内）。形状按你的原作改，坐标可以照抄红色：
```json
"holdup": { "hub": { "x": 1060, "y": 470 }, "items": [
  { "id": "allout",  "label": "cmd.allout",  "sub": "cmd.allout.sub",  "x": 1010, "y": 500, "rot": -0.12, "size": 62, "hit": [780, 440, 476, 110], "main": true },
  { "id": "talk",    "label": "cmd.talk",    "sub": "cmd.talk.sub",    "x": 885,  "y": 604, "rot": -0.06, "size": 50, "hit": [780, 556, 230, 96] },
  { "id": "release", "label": "cmd.release", "sub": "cmd.release.sub", "x": 1132, "y": 604, "rot": -0.06, "size": 44, "hit": [1016, 556, 240, 96] } ] }
```
**验证**：`node -e "const s=require('./src/umbra/skins/<你的身份>/slots.json');for(const b of s['hud.system'].buttons){const[x,y,w,h]=b.hit;if(x<990||x+w>1256||y<24||y+h>110||w<86||h<86)throw b.id}for(const i of s['hud.command'].sets.holdup.items){const[x,y,w,h]=i.hit;if(x<780||x+w>1256||y<220||y+h>696||h<(i.main?96:86)||w<86)throw i.id}console.log('slots OK')"` 打印 `slots OK`。
**常见错误**：主按钮高只给 86（主按钮要 ≥96）；按钮伸出 1256。

### 步 2　labels.json（必填新增；值按你的原作写）
```json
"label.baton": "（P5R=BATON PASS；P3R=SHIFT；P4=—— 没有就写本作最接近的叫法）",
"label.battleStart": "（开战标语）",
"label.finish": "（总攻收尾默认台词）",
"result.levelup": "LEVEL UP",
"tag.WEAK": "WEAK", "tag.CRIT": "CRITICAL", "tag.RESIST": "RESIST", "tag.MISS": "MISS",
"tag.NULL": "BLOCK", "tag.REPEL": "REPEL", "tag.DOWN": "DOWN",
"cmd.allout": "ALL-OUT ATTACK", "cmd.allout.sub": "总攻击",
"cmd.talk": "TALK", "cmd.talk.sub": "交涉",
"cmd.release": "LET GO", "cmd.release.sub": "放过"
```
再加：roster 里每个人的 `unit.<id>`（代号）和 `persona.<id>`（初始面具名）；你的 recipe 里用到的每个技能的 `skill.<id>.name`。
可选：`showtime.title.<a>-<b>`（某对组合专属标题，a、b 顺序与 roster.showtime 一致）、`label.massDestruction`（P3 系总攻收尾底字）、`sfx.kacha`（P3「咔」）、`navi.*`。
**验证**：`node -e "const l=require('./src/umbra/skins/<你的身份>/labels.json');const need=['label.baton','label.battleStart','label.finish','result.levelup','tag.WEAK','tag.CRIT','tag.RESIST','tag.MISS','tag.NULL','tag.REPEL','tag.DOWN','label.holdup','label.allout','label.onemore','label.highlight','label.more','label.darkHour'];const miss=need.filter(k=>!l[k]);console.log(miss.length?'缺 '+miss:'labels OK')"`。
**常见错误**：把括号说明原样留在值里——一定换成本作文字；用了别的作品的叫法（D-005）。

### 步 3　roster.json
```json
{ "lead": "<主角 id>", "navigator": "<导航 id>", "default": ["<id>", "<id>", "<id>"],
  "chars": { "<id>": { "field": { "h": 430, "dy": 0 } } },
  "showtime": [["<a>", "<b>"]],
  "gaps": { "<id>": "缺什么素材，只记不顶替" } }
```
- 只放本作角色（D-005）：蓝/粉 = 特别课外活动部，黄 = 调查队。
- `showtime` = 可以发动双人必杀（P3R 合体魔法 / P4 连携）的两人组合；原作没有就写空数组 `[]`。
- `field.h` = 场上背影高度（设计像素）；`dy` = 落脚微调。
**验证**：`node -e "const r=require('./src/umbra/skins/<你的身份>/roster.json');const ids=Object.keys(r.chars);for(const p of r.showtime)for(const x of p)if(!ids.includes(x))throw x;console.log('roster OK',ids.length)"`。

### 步 4　必做 recipe（放 `recipes/`，文件名 = recipe id + `.json`）
**4a. holdup.json（改）**——加镜头和包围原语，站位由引擎算（前排两翼、后排在敌群身后，不进指令区），你只选 orbit 和横幅：
```json
{ "id": "holdup", "event": "holdup", "duration": 950, "assets": ["char.$party"],
  "tracks": [
    { "at": 0, "dur": 950, "prim": "dim", "layer": "dmg", "args": { "color": "#000", "alpha": 0.5 } },
    { "at": 0, "prim": "sfx", "args": { "id": "se.holdup" } },
    { "at": 0, "dur": 920, "prim": "camera", "minimal": "skip",
      "args": { "focus": "$enemies", "keys": [ { "at": 0, "x": -150, "y": -40, "zoom": 0.32, "rot": 0.1 },
                                              { "at": 0.55, "x": -30, "y": -8, "zoom": 0.12, "rot": 0.025, "ease": "outCubic" },
                                              { "at": 1, "ease": "inOutCubic" } ] } },
    { "at": 0, "dur": 900, "prim": "holdupRing", "args": { "orbit": 1.2 } },
    { "at": 160, "dur": 450, "prim": "banner", "args": { "text": "label.holdup", "shape": "holdup" }, "minimal": { "dur": 250 } }
  ] }
```
素材：manifest 里每个队员要有 `char.<id>`，并在 `frames` 里有 `body` 帧（全身本色图）；没有就记进 roster.gaps，引擎跳过该人。
**4b. holdup.result.release.json（新）**——放过：敌群散去，≤400ms：
```json
{ "id": "holdup.result.release", "event": "holdup:result", "match": { "choice": "release" }, "duration": 380, "assets": [],
  "tracks": [ { "at": 0, "dur": 380, "prim": "tween", "args": { "target": "$targets", "to": { "alpha": 0 } } },
              { "at": 0, "prim": "sfx", "args": { "id": "se.enemy.vanish" } } ] }
```
（allout / talk 两个结果可以不写，引擎直接接 allout / talk:start。）
**4c. baton.json**——≤600ms，用 `batonPass` 原语（读 `$actor` 交出、`$target` 接住）：
```json
{ "id": "baton", "event": "baton", "duration": 540, "assets": [],
  "tracks": [ { "at": 0, "dur": 540, "prim": "batonPass", "args": {} },
              { "at": 0, "prim": "sfx", "args": { "id": "se.baton" } },
              { "at": 120, "prim": "sfx", "args": { "bus": "voice", "unit": "$target", "key": "baton.take" } } ] }
```
**4d. levelup.json**——≤1000ms，一张卡把本次所有升级的人一起亮出来（payload 是 `unitIds` 数组）。参考样板 `recipes/levelup.json`，把颜色/字体换成你的 tokens（写 `"@color.primary"` 这类引用，不要写死色值）。
**4e. 技能召唤**——每个技能 recipe 前段加 `summon`，`style` 按你的原作：蓝/粉 `"evoker"`（召唤器）、黄 `"tarot"`（塔罗牌）。同场第一次召唤用完整版、之后用快速版，所以每个技能写两个文件：
```json
{ "id": "skill.agi", "event": "action", "match": { "skillId": "agi", "summon": "full" }, "duration": 1500, ... ,
  "tracks": [ { "at": 0, "dur": 800, "prim": "summon", "args": { "style": "evoker" } }, ... ] }
{ "id": "skill.agi.q", "event": "action", "match": { "skillId": "agi", "summon": "quick" }, "duration": 1100, ... }
```
**验证**（每个 recipe）：见步 7 的脚本，全部 `OK`。
**常见错误**：duration 写在上限内，但加上 hitStop 停帧超了（v1.3 按 duration + 停帧之和算）；summon 的 style 写成别作的（红色才用 maskRip）。

### 步 5　可选 recipe（不做 = 引擎用红色通用版）
想做的话，事件名、payload、上限、recipe 名一律查母本 v1.3-§3 和 FX-MAP-v1.1（§B §C §F §G §I 每行有四皮各自演什么）。建议优先：`shield:break`、`persona:switch`、`boss:phase`、`highlight`（kind=duo，写 `"match": { "highlight": "duo", "pairIds": ["a", "b"] }`）、`shop:enter.<skinShopId>`。
A 类事件（ui:*、item:get、money:get、shop:buy、skill:learn、unit:lowhp、intent:show、navi:scan、alert:change、achievement:unlock、bgm:cue）**不能写 recipe**，只在 sfx.json / labels 里给音和字。

### 步 6　audio/ 骨架（文件放 `src/umbra/skins/<你的身份>/audio/`）
```
audio/playlist.json   audio/sfx.json   audio/voice.json   audio/bgm/   audio/se/   audio/voice/<unitId>/
```
**不要**手写 `present.json`（引擎构建时自动生成）。音频文件可以暂时一个都没有——缺文件引擎完全静音，不报错。
playlist.json 最小样例（曲目照 AUDIO-MAP §2 你那一皮的表填；loopStart/loopEnd 不知道就写 0，会被告警但不失败）：
```json
{ "skin": "<你的身份>", "version": 1,
  "defaults": { "crossfadeMs": 800, "victoryCrossfadeMs": 300, "noRepeat": true },
  "entries": [
    { "id": "<短名>.battle.normal", "scene": "battle.normal",
      "tracks": [ { "file": "bgm/battle.normal__<曲名英文小写连字符>.opus", "title": "<原作曲名>", "loopStart": 0, "loopEnd": 0, "weight": 1 } ],
      "loop": true, "basis": "original", "priority": "P1", "enabledByDefault": true } ] }
```
sfx.json 最小样例（alias 把 recipe 里写的短 id 映射到 se.*）：
```json
{ "skin": "<你的身份>", "se": { "se.holdup": { "files": ["se/se.holdup.opus"] }, "se.baton": { "files": ["se/se.baton.opus"] } },
  "alias": { "holdup": "se.holdup" } }
```
voice.json 最小样例（key 名单见 AUDIO-MAP §4.1）：
```json
{ "skin": "<你的身份>", "voice": { "<unitId>": { "holdup": ["voice/<unitId>/holdup_01.opus"] } } }
```
- `scene` 只能用 FX-MAP-v1.1 §G4 的 cueId（battle.normal、battle.ambush、boss.p1、victory、holdup、velvet、shop.<skinShopId> ……）。
- 文件名：`bgm/<cueId>__<slug>.opus`、`se/<se-id>.opus`、`voice/<unitId>/<key>_<nn>.opus`。
- 私有仓库可以提交音频文件（D-008）；不要放进任何公开构建。
**验证**：`node -e "for(const f of ['playlist','sfx','voice'])JSON.parse(require('fs').readFileSync('src/umbra/skins/<你的身份>/audio/'+f+'.json','utf8'));console.log('audio json OK')"`。

### 步 7　自检脚本（复制到终端直接跑，把 <你的身份> 换掉）
```sh
node -e '
const fs=require("fs"),dir="src/umbra/skins/<你的身份>/recipes/";
const CAP={"battle:start":900,"turn:start":300,"action":1800,"unit:down":500,"onemore":450,"highlight":3500,"holdup":1000,"allout":3500,
"talk:start":800,"talk:result":1200,"battle:end":1500,"scene:enter":600,"scene:leave":600,"map:move":800,"map:encounter":900,"env:change":600,
"baton":600,"persona:switch":500,"shield:break":500,"levelup":1000,"card:pick":600,"buff:grant":800,"boss:phase":2000,"fusion:result":3000,
"shop:enter":1200,"shop:exit":600,"party:switch":500,"bond:assist":800,"ailment:apply":400,"ailment:cure":400,"escape":600,"velvet:alarm":800,
"fusion:accident":1000,"callingcard:send":3000,"explore:scan":400,"persona:levelup":800,"bond:rankup":1500,"holdup:result":400,
"explore:cover":300,"explore:spotted":500,"explore:interact":400,"unit:spawn":600,"unit:flee":600,"unit:revive":600,"explore:exit":800,
"boss:intro":2000,"run:fail":1500,"run:retreat":1000};
let bad=0;for(const f of fs.readdirSync(dir).filter(f=>f.endsWith(".json"))){const r=JSON.parse(fs.readFileSync(dir+f,"utf8"));
 let cap=CAP[r.event]; if(r.event==="action"&&r.match&&r.match.side==="enemy")cap=1500;
 if(cap===undefined){console.log("✗",f,"未知事件或 A 类事件不能写 recipe:",r.event);bad++;continue}
 const stop=r.tracks.filter(t=>t.prim==="hitStop").reduce((s,t)=>s+(t.dur||(t.args&&t.args.ms)||0),0);
 const wall=r.duration+stop; const ok=wall<=cap&&r.id+".json"===f; if(!ok)bad++;
 console.log(ok?"OK":"✗",f,r.event,"duration",r.duration,"+停帧",stop,"=",wall,"/ 上限",cap)}
process.exit(bad?1:0)'
```
全部 `OK`、退出码 0 才算过。引擎和 skin:check 交付后，再按 §7.3 跑截图（v1.3 加 1 张：每尺寸「HOLD UP 菜单」，看四人是否都看得见、没人挡按钮）。

### 收尾（每步都做）
```sh
git add src/umbra/skins/<你的身份>
git add -f docs/umbra-progress/<你的身份>.md
git commit -m "umbra <你的身份> v1.3-<步号>: <一句话>"
git push origin feat/umbra-skin-<你的身份>
```
进度文件写一行「完成了什么 / 自查结果 / 下一步」。
**回滚**：某步做坏了 → `git revert <那次提交的 hash>` 再推送。不要 reset、不要 stash、不要删文件重来。

### v1.3 相对 v1.2 改了什么（速查）
| 项 | v1.2 | v1.3 |
|---|---|---|
| hud.system | x 1000–1256, y 24–90 | x 990–1256, y 24–110 |
| HOLD UP | 二选一 | 三选一 + `holdup:result` + 镜头 `camera` + 包围 `holdupRing` |
| 新事件 | — | 49 个事件名（母本 v1.3-§3a–§3e） |
| 新原语 | blockPush 等在名单未实现 | 17 个新原语 + 原名单全部实现（母本 v1.3-§4） |
| 时长口径 | duration | duration + 停帧之和；敌方 action 1.5s |
| 音频 | 无 | `audio/` 三个 json，缺文件静默 |
| labels | 11 个必填 | 再加 label.baton / battleStart / finish、result.levelup、tag.* 7 个、cmd.allout/talk/release（+sub）、unit/persona/skill 名 |
