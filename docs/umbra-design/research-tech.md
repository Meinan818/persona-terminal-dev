# 幽影协议 UMBRA 画布重制 · 技术可行性报告

> 调研员：Hark（技术调研） 日期：2026-10-21（Asia/Shanghai）
> 范围：手机 App 内 WebView 运行的 2D 横屏游戏，手机/平板优先，中端机 ≥30fps、目标 60fps，演出参考 P5X。
> 引用规则：正文结论后的链接均为本次实际打开过的页面；少数只来自搜索摘要、未全文核实的，标注「（摘要）」。
> 本次实测：2026-10-21 用 `npm pack` 拉取 pixi.js 8.22.0、phaser 4.2.1、pixi-filters 6.1.5、@esotericsoftware/spine-pixi-v8 4.3.13，本地 `gzip -9` 测量体积（见 §1.2）。

---

## 0. 一页结论

| 议题 | 结论 |
|---|---|
| 渲染引擎 | **PixiJS v8（固定 WebGL 渲染器）**。Phaser 4 为备选；Cocos Creator、纯 Canvas2D 不推荐。 |
| 角色动画 | 第一阶段**不用 Spine / Live2D**：立绘用 AI 拆层 + Pixi `Mesh` 顶点形变做呼吸/受击；第二阶段如果有预算再上 Spine Essential（$69/人）。Live2D 小团队免费，但 Web 端无官方 Pixi v8 运行时，风险更高。 |
| 特效 | 粒子用 v8 `ParticleContainer`（+ v8 版 emitter），滤镜用 pixi-filters v6；**滤镜是全屏填充率成本，限时、限区域、降分辨率**。配合图集、对象池、预热、动态分辨率和三档画质。 |
| 横屏 | **只能靠原生桥接锁方向**，网页 `screen.orientation.lock` 在 WebView 里不可用。**重大新风险**：Android 16（targetSdk 36）在 ≥600dp 平板上忽略方向锁；iPadOS 26 起 iPad 必须支持全方向。游戏必须自带「竖屏兜底」。 |
| 音频 | 首次触摸时解锁 AudioContext（播一段静音 buffer），切后台回来处理 `interrupted`，必要时重建 context。音效预解码，BGM 用流式 `<audio>`。格式以 **AAC（.m4a）** 为主。 |
| 内存与加载 | iPhone WebContent 进程约 1.5GB 上限；纹理常驻预算建议 ≤256MB（手机）。首包（引擎 + 标题场景）≤2–3MB，按场景 `loadBundle`/`unload`。KTX2 能省 4–8 倍显存，但放到第二阶段。 |
| UI 取舍 | 战斗 HUD、伤害数字、Cut-in、转场全进画布；菜单、图鉴、设置、长文本对话用 DOM 叠加层，只做 transform/opacity 动效，演出期间冻结 DOM。 |

---

## 1. 渲染引擎对比

### 1.1 对比表

| 维度 | PixiJS v8 | Phaser 4（2026-04 发布，现 4.2.1） | Cocos Creator 3.8（Web Mobile 导出） | 纯 Canvas2D |
|---|---|---|---|---|
| 定位 | 2D 渲染库（无物理/场景管理，自己搭） | 完整 2D 游戏框架（场景、加载、物理、补间、相机） | 编辑器驱动的 2D/3D 引擎 | 浏览器原生 API |
| 手机 WebView 性能 | v8 渲染循环只更新变化部分；官方 bunnymark：10 万精灵全动时 CPU 约 50ms→15ms（v7→v8）。WebGL 为生产推荐，WebGPU 仍属实验性 | v4 全新渲染器，四边形改用索引缓冲（顶点上传少 1/3），移动端多纹理合批更聪明；RC4 声称滤镜/遮罩在移动端最高 16 倍提升（摘要） | 引擎本身性能不差，但启动和包体是瓶颈（见下） | 无合批、无着色器；大量精灵和任何「滤镜」都要靠 CPU 逐像素，扛不住 P5X 级演出 |
| 包体（本次实测，min+gzip） | **pixi.min.js 全量 231KB**（可 tree-shake 更小） | **phaser.min.js 全量 343KB**（官方 README 写 345KB） | 社区实测：2D 项目裁剪后 `cc` 引擎仍约 800KB gzip，再加 Spine wasm 约 700KB gzip；P90 启动 3–5.5 秒 | 0 |
| 粒子 | v8 `ParticleContainer` + `Particle`：作者在 M3 上 100 万粒子 60fps；配套 emitter 有社区 v8 移植 | 内建粒子系统；v4 新增 `SpriteGPULayer`（百万精灵单次绘制） | 内建 2D 粒子（编辑器配置） | 自己写 |
| 滤镜/着色器 | 内建 Blur/ColorMatrix/Displacement/Noise；pixi-filters v6 提供 Shockwave、RGBSplit、RadialBlur、ZoomBlur、Glow、Bloom、Glitch、MotionBlur 等 30+ 种（全量 43KB gzip） | v4 统一 Filter 系统，任何对象/相机可叠加：Blur、Glow、Bloom、Wipe、ColorMatrix、GradientMap 等 | 需自写 Effect/材质 | 只有 `ctx.filter` 等少量 CSS 滤镜，手机上慢 |
| Spine | 官方 spine-pixi-v8（Esoteric 与 Pixi 团队合作维护），支持全部 Spine 特性；运行时 65KB gzip（实测） | 4.2 起 spine-phaser-v4 走 Mesh2D，与 Phaser 对象合批 | 内建（3.8 起改 wasm，体积大） | 无 |
| 文档/生态 | 官方指南、示例、Playground；滤镜、Sound、UI、Layout、AssetPack、DevTools | 2000+ 示例、500 页免费书、Rex 插件库 | 中文资料多，但多数围绕编辑器操作 | MDN |
| AI 写代码可操作性 | **纯代码，无需编辑器**。官方 25 个 AI Skills，8.19 起随 npm 包附带（`node_modules/pixi.js/skills/`） | **纯代码**。仓库自带覆盖全部子系统的 AI Skills，并宣称各大模型熟悉其 API | **依赖可视化编辑器**：场景/预制体是带 UUID 的序列化文件，构建走编辑器「构建」面板（摘要），AI 难以直接产出和校验 | 纯代码，但一切从零写 |

来源：
- Pixi v8 性能与渲染器状态：https://pixijs.com/blog/pixi-v8-launches ，https://unpkg.com/pixi.js@8.21.0/skills/pixijs-core-concepts/references/renderers.md （摘要）
- Pixi 性能建议：https://pixijs.com/8.x/guides/concepts/performance-tips
- ParticleContainer：https://pixijs.com/blog/particlecontainer-v8
- pixi-filters 列表：https://github.com/pixijs/filters/blob/main/README.md
- Pixi AI Skills：https://pixijs.com/blog/june-2026 （摘要），https://github.com/pixijs/pixijs-skills/blob/main/skills/pixijs-assets/references/compressed-textures.md
- Phaser 体积、v4 特性、AI Skills：https://raw.githubusercontent.com/phaserjs/phaser/master/README.md
- Phaser 3 vs 4：https://phaser.io/news/2026/05/phaser-3-vs-phaser-4
- Phaser 4.2 Spine 渲染器：https://phaser.io/news/2026/07/phaser-4-2-spine-renderer-mesh2d-stencil
- Phaser RC4 移动端提升：https://phaser.io/news/2025/05/phaser-v4-release-candidate-4 （摘要）
- Cocos 引擎体积实测：https://github.com/cocos/cocos-engine/issues/16712 ；3.8.5 包体优化幅度（2D 空工程减 360KB 等）：https://www.cocos.com/post/99e265c4db711b150a4f8e42b1fde028
- spine-pixi 官方运行时：https://esotericsoftware.com/spine-pixi

### 1.2 本次实测体积（npm 包 dist，gzip -9）

| 文件 | 原始 | gzip |
|---|---|---|
| pixi.js 8.22.0 `pixi.min.js`（全量） | 820KB | **231KB** |
| phaser 4.2.1 `phaser.min.js`（全量） | 1343KB | **343KB** |
| pixi-filters 6.1.5（全量） | 212KB | **43KB** |
| spine-pixi-v8 4.3.13 IIFE min | 227KB | **65KB** |

说明：原方案 REARCH-PROPOSAL-v2 写的「PixiJS 本地打包约 450KB」应指未压缩/部分压缩体积；按 gzip 计约 231KB，用 ESM 按需引入还能再少（社区例子：只保留 WebGL 渲染器可再减约 132KB 原始体积，摘要：https://github.com/anchildress1/carbon-trace/commit/80a8fb2213a177ae82872d602f50475b8668a2af ）。

### 1.3 推荐：PixiJS v8

理由：
1. 我们已有完整规则层，缺的是渲染、演出和资源管理。Pixi 只做这几件事，不把场景/物理/输入强加给我们，旧规则层可以原样接入。
2. 体积最小（231KB gzip），滤镜库（冲击波、色差、径向/缩放模糊、辉光、故障）正好覆盖 P5X 式演出。
3. 官方 Spine 运行时与 Pixi 团队共建，后续上 Spine 无缝衔接。
4. 纯代码 + 官方 AI Skills，最适合「多个主题 AI 并行写皮肤」的协作方式。

设置建议：`preference: 'webgl'`（WebGPU 在 v8.1 起已不是默认，官方仍称实验性：https://github.com/pixijs/pixijs/releases/tag/v8.1.0 （摘要））；`antialias: false`；`resolution` 封顶（见 §3.5）。

**备选 Phaser 4**：如果后续希望框架代管场景切换、加载器、补间和相机，Phaser 4 也是合格选择（体积多约 110KB，滤镜系统同样完整，4.2 起 Spine 可合批）。缺点是 v4 刚发布半年，部分插件与教程仍是 v3 写法。

**不推荐 Cocos**：2D 项目 gzip 后引擎 + Spine 约 1.5MB，P90 启动 3–5.5 秒；开发强依赖编辑器，AI 难以操作。
**不推荐纯 Canvas2D**：没有着色器，色差、冲击波、径向模糊只能靠 CPU 逐像素，中端机做不到 30fps 以上的 P5X 演出。

---

## 2. 角色动画

### 2.1 Spine 2D

| 项目 | 情况 |
|---|---|
| Web 运行时 | 官方 `@esotericsoftware/spine-pixi-v8`（要求 Pixi ≥8.16），WebGL/WebGPU 下支持全部 Spine 特性；Canvas 渲染不支持插槽对象、Tint Black、混合模式。v8 版没有 v7 的「网格顶点超过 100 不合批」限制。建议导出二进制 `.skel`（更小更快）。 |
| 授权 | 编辑器 **Essential $69（原价 $99）**，不含网格、IK、物理等高级功能；**Professional $379（原价 $449）**；均为买断、按「具名个人」授权。年收入或融资 ≥$50 万美元须改用 Enterprise（$2,499 + $379/人/年）。运行时可免费集成，但前提是集成方持有 Spine 授权。 |
| 性能 | 骨骼计算在 JS 主线程；同屏 4–8 个角色、每个几十根骨骼，中端机可承受。网格变形顶点多时 CPU 开销上升，需控制。 |
| 制作门槛 | 需要分层立绘（PSD）+ 动画师绑骨、刷权重、做关键帧。无动画师的话，每个角色 idle/攻击/受击/倒地 4 个动作，外包工作量大。Essential 不含网格，无法做柔软的头发/衣服形变。 |

来源：https://esotericsoftware.com/spine-pixi ，https://esotericsoftware.com/spine-purchase ，https://github.com/esotericsoftware/spine-runtimes （摘要，运行时授权条款）

### 2.2 Live2D Cubism

| 项目 | 情况 |
|---|---|
| Web 运行时 | 官方 Cubism SDK for Web（Core 为闭源 js + 开源 Framework）。**没有官方 Pixi v8 插件**；原 pixi-live2d-display 只支持 Pixi v6 且已停更。社区有 v8 移植：`untitled-pixi-live2d-engine`（MIT，支持 Cubism 2–5，自定义 Render Pipe，支持 Filter/RenderTexture、纹理 LOD），星数较少（78），属于社区维护。 |
| 授权 | 发布时需签 SDK 发行许可。**个人与小规模事业者（最近年销售额 <1000 万日元）免签免费**（「可扩展应用」除外）。中规模（<1 亿日元）走 G 方案：每地区初始费 5 万日元 + 每平台每地区月费 2 万日元，**Web 本身算一个平台**；大规模分别为 30 万/10 万日元。须在上线前至少一个月签约。 |
| 性能 | 单模型网格多、蒙版多，同屏通常 1–2 个；适合「对话立绘」，不适合战斗中 4–8 个角色同时动。 |
| 制作门槛 | 需要拆层极细的 PSD（眼、眉、嘴、发束等几十到上百层）+ Live2D 建模师。门槛高于 Spine。 |

来源：https://www.live2d.com/en/sdk/license/ ，https://www.live2d.com/en/sdk/license/running_plan01/ ，https://github.com/Untitled-Story/untitled-pixi-live2d-engine/ ，https://www.npmjs.com/package/pixi-live2d-display （摘要，确认只支持 v6）

### 2.3 AI 辅助生成或拆分素材

- **See-through（SIGGRAPH 2026 有条件接收）**：从一张二次元立绘自动拆出最多 23–24 个语义层（前发、后发、脸、眼白、虹膜、眉、嘴、上衣、手套等），被遮挡部分自动补画，按深度排序，导出 PSD。开源，有 ComfyUI 插件；1280 分辨率约需 16GB 显存、单张约 2 分钟（RTX 5090）。产出可直接进 Live2D/Spine 或我们自己的分层形变。
  - https://github.com/jtydhr88/ComfyUI-See-through （ComfyUI 插件，含显存/耗时数据）
  - https://arxiv.org/html/2602.03749 （论文，摘要）
- **Bunraku（2026-07 预印本）**：从单图直接生成 Live2D 所需的层、网格和关键形变，尚属研究阶段，不可作为生产依赖。https://arxiv.org/abs/2607.27348v1 （摘要）
- 商业服务（Layer.ai「Spine 部件生成」、imagetolayers 等）可做拆件，但版权和一致性需逐张审核（摘要）。

结论：**AI 拆层已可用于生产前期**（省掉大部分手工抠图和补画），但绑骨/动作仍需人工或程序化动画。注意官方素材的版权：仅用于本项目内部，不对外分发原图。

### 2.4 没有动画师时的最佳 2D 替代方案（推荐第一阶段采用）

做法：**AI 拆 3–6 个大层 + Pixi `Mesh`/`MeshPlane` 程序化形变 + 演出语言补位**。

1. **拆层**：用 See-through 把每张立绘拆成 后发 / 身体 / 头 / 前发 / 饰品（披风、尾巴）5 层左右，人工修边。比 Live2D 要的层少得多。
2. **Idle 呼吸**：身体层以脚底为锚点做 0.6–1.2% 的 Y 向缩放正弦波（周期 2.5–3.5 秒）；头层跟随但延迟约 80ms；前发/披风用 `MeshPlane`（网格平面）让下半部顶点做小幅正弦摆动，上半部固定。全部是顶点/变换计算，不用滤镜，成本极低。
3. **受击形变**：0.05 秒压扁回弹（squash & stretch）+ 后仰位移 + 闪白（`tint`/ColorMatrix 只作用于角色容器，2–3 帧）+ 镜头震动；重击叠加 0.15 秒 RGBSplit 色差。
4. **出招前冲**：残影（复制 2–3 个半透明精灵按时间淡出）+ 动态模糊滤镜仅在冲刺 0.2 秒内开启。
5. **倒地**：旋转 + 下沉 + 灰度 ColorMatrix + 碎片粒子。
6. **P5X 式 Cut-in**：本来就以「静态立绘 + 动态背景（速度线、色块、文字）」为主，静态图完全够用，重点在版式动画和转场。

这一路线的 AI 可操作性最好：全部是参数化代码，可做成皮肤层的「动作配方」（JSON 关键帧 + 缓动），每个主题只换素材和参数。之后若有预算，可把同一套分层 PSD 交给 Spine 动画师升级，代码接口不变。

Pixi Mesh/MeshPlane 文档入口：https://pixijs.com/8.x/guides/components/scene-objects/mesh （来自已打开的性能页导航，具体 API 以官方文档为准）

---

## 3. 特效：成本与「豪华但不卡」的工程手段

### 3.1 各类特效在手机上的成本

| 类型 | 主要成本 | 手机上的判断 |
|---|---|---|
| 序列帧（spritesheet 动画） | 显存（帧数 × 尺寸）、下载体积 | 每帧本身极便宜，可合批；问题在内存。全屏 30 帧 1024² 的爆炸 ≈ 30 张 4MB = 120MB，**不可接受**。做法：小尺寸（256–512px）+ 放大播放 + 叠加粒子/加法混合补细节。 |
| 粒子 | CPU 更新逻辑、透明叠加的填充率 | v8 `ParticleContainer` 把渲染成本降到极低，瓶颈转为 JS 更新和 overdraw（大面积半透明叠加）。手机上单次爆发建议 ≤300–500 个、尽量小贴图。 |
| 滤镜（闪白、色差、径向模糊、冲击波） | **每个滤镜至少一次离屏渲染 + 全区域像素着色**（填充率） | 最贵的一类。Pixi 官方原话：「滤镜很贵，用多了会变慢」；指定 `filterArea` 可省掉测量。冲击波、径向模糊作用于全屏时，在中端机上应只在关键帧持续 0.2–0.5 秒。 |
| 混合模式（加法发光等） | 打断合批 | 同混合模式的对象要排在一起（官方例：屏幕/普通交替会从 2 次绘制变 4 次）。 |
| 遮罩 | 矩形遮罩最快（scissor），Graphics 次之（stencil），精灵遮罩最贵（走滤镜） | P5X 式斜切转场优先用矩形/多边形 Graphics 遮罩，不用图片遮罩。 |

来源：https://pixijs.com/8.x/guides/concepts/performance-tips ，https://pixijs.com/blog/particlecontainer-v8

### 3.2 粒子方案

- 核心：Pixi v8 原生 `ParticleContainer` / `Particle`（只把位置设为动态，其它属性静态可再快；所有粒子须来自同一张纹理源，即用图集）。
- 发射器：官方 `@pixi/particle-emitter` 未正式升级 v8；可用社区移植 `@spd789562/particle-emitter`（沿用原配置格式，自带编辑器）或 `pixi-v8-particles`、`pixi-particle-system`。都是小项目，**建议锁版本并把源码纳入仓库**，必要时自己维护。
  - https://github.com/spd789562/pixi-v8-particle-emitter
  - https://github.com/pixijs/pixijs/issues/11046 （官方表示等 ParticleContainer 完成后再更新 emitter，摘要）

### 3.3 着色器滤镜清单（pixi-filters v6 对 Pixi v8）

| 演出需求 | 对应滤镜 |
|---|---|
| 闪白/闪红 | 内建 `ColorMatrixFilter`，或直接改 `tint`（零滤镜成本，优先） |
| 色差 | `RGBSplitFilter` |
| 径向模糊/冲刺 | `ZoomBlurFilter`、`RadialBlurFilter`、`MotionBlurFilter` |
| 冲击波 | `ShockwaveFilter`（振幅、波长、速度、半径可调） |
| 发光/泛光 | `GlowFilter`、`AdvancedBloomFilter`、`BloomFilter` |
| 故障/扫描线 | `GlitchFilter`、`CRTFilter`、`OldFilmFilter` |
| 主题配色 | `ColorMapFilter`、`ColorGradientFilter`、`AdjustmentFilter`（P3 蓝 / P4 黄 / P5R 红整体色调） |

来源：https://github.com/pixijs/filters/blob/main/README.md ，https://filters.pixijs.download/main/docs/ShockwaveFilter.html （摘要）

### 3.4 让效果豪华但不卡的工程手段

1. **纹理图集**：同场景素材打进 2048² 图集（Pixi 官方：精灵最多可在一批里混 16 张纹理，视硬件而定）。用官方 AssetPack 在构建期生成图集和 `@0.5x` 低清版本，低档画质自动用半分辨率图。
2. **对象池**：伤害数字、粒子、残影、命中火花全部池化，战斗中不 `new`、不 `destroy`，避免 GC 卡顿。Pixi 官方也建议批量销毁纹理时加随机延迟，避免集中卡顿。
3. **预热**：进入战斗前（加载画面期间）把本场景所有纹理上传 GPU（v8 的 `pixi.js/prepare` 模块）、把每个滤镜各渲染一次（编译着色器）、把每种特效离屏播一帧。第一次放大招时才编译着色器，是 Web 游戏「首次卡一下」的头号原因。
4. **滤镜纪律**：只挂在需要的容器上，不挂整个 stage；设 `filterArea`；滤镜 `resolution` 设 0.5；用完立即 `filters = null` 释放。同一时刻全屏滤镜 ≤2 个。
5. **文字**：伤害数字用 BitmapText（官方：动态文本用 BitmapText 快得多）；中文动态文本不要每帧改。
6. **分辨率缩放**：`resolution` 不直接用 `devicePixelRatio`。Pixi 维护者建议手机封顶 2（`resolution: 2` 像素数是 1 的 4 倍，手机上可能直接掉一半帧率）。建议：高档 min(dpr, 2)，中档 1.5，低档 1。
7. **动态降档**：每 2 秒统计帧时间中位数，持续超过 20ms 就降一档（关闭次要滤镜 → 粒子数减半 → 分辨率降一级），持续低于 14ms 再缓慢升档，加滞回避免来回跳。首次启动用简单基准（如 1 秒精灵压力测试）决定初始档位，结果缓存。
8. **剔除**：屏幕外对象设 `cullable`（官方：GPU 受限时有效，CPU 受限时反而更慢，需按场景测）。
9. **演出期间禁止碰 DOM**：沿用 v2 方案的结论，演出帧内不读布局、不改 DOM。

来源：https://pixijs.com/8.x/guides/concepts/performance-tips ，https://github.com/pixijs/pixijs/discussions/7255 （摘要，维护者建议封顶 2），https://github.com/pixijs/pixijs/blob/dev/skills/pixijs-performance/SKILL.md （摘要，resolution 2 可能使帧率减半），https://pixijs.com/8.x/guides/migrations/v8 （摘要，`pixi.js/prepare` 需手动引入）

### 3.5 画质档位建议（初稿，需实机标定）

| 档位 | resolution | 全屏滤镜 | 粒子上限/次 | 特效纹理 |
|---|---|---|---|---|
| 高 | min(dpr, 2) | 冲击波 + 色差 + 缩放模糊 | 500 | 原尺寸 |
| 中（默认） | 1.5 | 冲击波或色差，二选一 | 250 | 原尺寸 |
| 低 | 1 | 仅 tint 闪白，不用滤镜 | 120 | `@0.5x` |

---

## 4. WebView 横屏

### 4.1 网页端 `screen.orientation.lock()` 不可依赖

- 规范要求浏览器只在全屏文档中允许锁方向；MDN 标注为「非 Baseline」，通常只在移动端且全屏时有效。
- iOS Safari / WKWebView：截至 Safari 27 都不支持 `lock()`（iOS 16.4 只加了 `type`/`angle`/`onchange`）。
- Android Chrome：非全屏调用会抛 `SecurityError`。Android WebView 里网页全屏要靠宿主实现 `WebChromeClient.onShowCustomView`，不可控。

来源：https://developer.mozilla.org/en-US/docs/Web/API/ScreenOrientation/lock ，https://w3c.github.io/screen-orientation/ （摘要），https://caniuse.com/mdn-api_screenorientation_lock （摘要），https://github.com/mdn/browser-compat-data/issues/16872 （摘要，各浏览器报错实测）

**结论：方向切换必须由主 App 原生代码完成，网页只通过桥接发请求。**

### 4.2 Android（原生桥接）

- 进入游戏：网页调用 JS 桥（推荐 `WebViewCompat.addWebMessageListener`，比 `addJavascriptInterface` 更安全）→ Activity 调 `setRequestedOrientation(ActivityInfo.SCREEN_ORIENTATION_SENSOR_LANDSCAPE)`（允许左右横屏随重力翻转）；退出时设回 `SCREEN_ORIENTATION_PORTRAIT` 或 `UNSPECIFIED`。
- Activity 要在 `configChanges` 里声明 `orientation|screenSize|screenLayout`，避免旋转时 Activity 重建导致 WebView 重载、游戏状态丢失。
- 进入游戏时开沉浸模式（隐藏状态栏、导航栏），退出恢复。
- **重大限制（Android 16 起）**：targetSdk 36 的应用在最小宽度 ≥600dp 的设备（平板、折叠屏内屏、桌面窗口）上，`screenOrientation` 与 `setRequestedOrientation()` 的横/竖屏值**全部被忽略**。例外只有：屏幕 <600dp（大多数手机）、`android:appCategory="game"` 的应用、用户手动开启兼容。可用 `PROPERTY_COMPAT_ALLOW_RESTRICTED_RESIZABILITY` 临时退出，但 **API 37 起取消退出**。Google Play 2026 年 8 月起要求 targetSdk 36。主 App 是普通应用，不能标成 game。
  → **在 Android 平板上无法保证横屏**，游戏必须能在竖屏/任意比例窗口里运行（见 §4.5）。

来源：https://developer.android.com/develop/adaptive-apps/guides/app-orientation-aspect-ratio-resizability ，https://developer.android.com/develop/ui/views/layout/webapps/native-api-access-jsbridge （摘要），https://stackoverflow.com/questions/5424233/how-to-keep-the-screen-in-landscape-mode-in-android （摘要）

### 4.3 iOS / iPadOS（原生桥接）

- 推荐做法：游戏 WebView 放在**单独的 ViewController** 里全屏 present。AppDelegate 实现 `application(_:supportedInterfaceOrientationsFor:)` 返回一个可变的方向掩码；进入游戏时把掩码改为 `.landscape`，在 VC 里调用 `setNeedsUpdateOfSupportedInterfaceOrientations()`，再调 `windowScene.requestGeometryUpdate(.iOS(interfaceOrientations: .landscape))`（iOS 16+ 官方 API；旧的 `UIDevice setValue:forKey:"orientation"` 已不可用）。退出时反向操作。
- 系统可能拒绝请求（通过 errorHandler 回调），网页需要收到「最终方向」的回执，而不是假定成功。
- **iPad 限制**：iPadOS 26 起 `UIRequiresFullScreen` 已弃用，iPad 应用须声明支持全部方向；`prefersInterfaceOrientationLocked` 只是「偏好」，系统不保证遵守；iPadOS 27 起该键不再阻止窗口缩放。窗口化多任务下，游戏可能被缩成任意尺寸。
  → **iPad 同样不能保证横屏**。

来源：https://sosumi.ai/documentation/uikit/uiwindowscene/requestgeometryupdate(_:errorhandler:) （Apple 文档镜像），https://developer.apple.com/documentation/technotes/tn3192-migrating-your-app-from-the-deprecated-uirequiresfullscreen-key.md ，https://stackoverflow.com/questions/73727291/ios16-present-uiviewcontroller-in-landscape-only-for-single-screen-not-working （摘要），https://github.com/apache/cordova-ios/issues/1626 （摘要，iPadOS 26 下 WebView 应用横屏锁失效的实例）

### 4.4 安全区、刘海、手势条

- HTML 加 `<meta name="viewport" content="viewport-fit=cover, ...">`，用 `env(safe-area-inset-left/right/top/bottom)` 取安全区。横屏时刘海在左或右，手势条在底部。
- Android WebView：M136 起只在**全屏 WebView** 中通过 CSS `safe-area-inset-*` 传递刘海和系统栏；**M144 起所有 WebView 都支持**；键盘（IME）从 M139 起通过缩小 visual viewport 处理。旧版本 WebView 的 `env()` 常为 0 → **原生侧读取 `WindowInsets`，经桥接注入 CSS 变量（如 `--sai-left`）兜底**。注意不要原生和网页各加一遍内边距（官方称「双重内边距」）。
- iOS WKWebView：`viewport-fit=cover` 时 `env()` 值正常。
- 画布层：背景和特效铺满全屏（出血），**可交互按钮和关键 HUD 只放在安全区内**；底部手势条区域不放需要上滑的操作，避免误触回到桌面。
- 画布尺寸用 `visualViewport` 的宽高，监听 `resize`，不要用 `screen.width`。

来源：https://developer.android.com/develop/ui/views/layout/webapps/understand-window-insets ，https://chromium.googlesource.com/chromium/src/+/HEAD/android_webview/docs/insets.md （摘要），https://issues.chromium.org/issues/40699457 （摘要，旧版 WebView 安全区为 0 的问题）

### 4.5 必须的兜底：「虚拟横屏」

因为 Android 平板与 iPad 都可能拒绝横屏，游戏层需要：
1. 设计分辨率按横屏 16:9（如 1280×720 逻辑像素），短边适配，长边留出血区，兼容 4:3（iPad）到 20:9（全面屏手机）。
2. 若实际窗口为竖屏：
   - 平板（短边 ≥600dp）：优先显示「请横置设备」提示 + 自动暂停，横过来即恢复。
   - 若产品要求必须可玩：画布内整体旋转 90°（舞台根容器 rotation，输入坐标做同样变换），而不是用 CSS 旋转 DOM，避免 DOM 叠加层错位。
3. 监听 `resize` 而不是 `orientationchange`，任何尺寸变化都重新布局；尺寸变化时不重建纹理，只调整渲染器尺寸（iOS 上反复改 WebGL 画布尺寸有内存泄漏的历史问题，见 §6）。

---

## 5. 音频

### 5.1 iOS 解锁与中断

- 浏览器要求用户手势后才能播放：AudioContext 默认 `suspended`，须在真实触摸/点击事件的回调里 `resume()`。iOS 上仅 `resume()` 不够可靠，**还要在同一手势里播放一个 1 采样的静音 buffer**。
- 静音键：iOS 静音（响铃/振动开关）会让 Web Audio 无声（Matt Montag 文章）。可提示用户；部分方案通过同时播放一个 `<audio>` 元素把会话改为播放类，效果因系统版本而异，需实测。若宿主 App 可控，**原生侧把 `AVAudioSession` 类别设为 `.playback`** 最可靠。
- 切后台/锁屏/来电：iOS Safari 会把 context 置为 `interrupted`（MDN 已收录），回到前台需 `resume()`。WebKit 有多个已知缺陷：`resume()` 永不返回、状态显示 running 但无声。稳妥做法：
  - 监听 `visibilitychange` 与 `statechange`；回前台先 `suspend()` 再 `resume()`；
  - 若 1 秒内仍无效，**在下一次用户触摸时销毁并重建 AudioContext**，重新解码已缓存的原始音频数据。
- 原生桥接：App 进入后台时通知网页暂停 BGM 和游戏循环。

来源：https://developer.mozilla.org/en-US/docs/Web/API/BaseAudioContext/state ，https://www.mattmontag.com/web/unlock-web-audio-in-safari-for-ios-and-macos （摘要），https://bugs.webkit.org/show_bug.cgi?id=276016 （摘要），https://bugs.webkit.org/show_bug.cgi?id=281566 （摘要），https://github.com/ux-ui-pro/clicktone （摘要，「僵尸 context」重建方案）

### 5.2 预解码方案

- **音效（SFX）**：短音频，按场景在加载画面中 `decodeAudioData` 成 AudioBuffer，播放时新建 `AudioBufferSourceNode`（一次性节点，开销小），同一音效限制同时发声数（如 ≤4）。
- **BGM 不要整首解码**：解码后是 32 位浮点 PCM，3 分钟立体声 44.1kHz ≈ **60MB**（本报告计算：3×60×44100×2×4 字节）。BGM 用 `<audio>` 元素流式播放，必要时接 `MediaElementAudioSourceNode` 做淡入淡出。场景切换只保留当前与下一首。
- 封装：一个统一的 AudioManager（总线：BGM / SFX / 语音三路 GainNode），设置页音量映射到总线。也可直接用官方 `@pixi/sound`（Pixi 生态库，基于 WebAudio），但上面的 iOS 中断处理仍需自己补。

### 5.3 格式选择

| 格式 | iOS（WKWebView） | Android WebView | 建议 |
|---|---|---|---|
| AAC（.m4a） | 全版本支持（Apple 官方列为支持格式） | 支持 | **主格式**，BGM 与 SFX 都用 |
| MP3 | 支持 | 支持 | 备选，同码率体积略大 |
| Opus in Ogg | **仅 iOS 18.4+** | 支持 | 不作主格式 |
| Opus in WebM | Safari 17.4 起两端一致支持 | 支持 | Android 可用更小体积，但需要双份资源 |
| WAV | 支持 | 支持 | 只用于极短 UI 音（体积大） |

建议：统一 **AAC-LC 96–128kbps（BGM）/ 64–96kbps（SFX，单声道）**，一套资源两端通用；需要省流量时再给 Android 加 WebM/Opus。

来源：https://stackoverflow.com/questions/62216863/how-to-play-decode-ogg-opus-audio-in-safari （引 WebKit 18.4 公告），https://bugs.webkit.org/show_bug.cgi?id=238546 （摘要，Safari 17.4 起 WebM Opus 一致），https://developer.apple.com/library/archive/documentation/AudioVideo/Conceptual/Using_HTML5_Audio_Video/Device-SpecificConsiderations/Device-SpecificConsiderations.html （摘要，iOS 支持 AAC/MP3/WAV）

---

## 6. 内存与加载

### 6.1 内存上限

- **iOS**：WebKit 工程师说明，网页运行在 WebContent 进程，**多数 iPhone 上该进程上限约 1.5GB**（系统宽裕时可略超）；iPad 更高（8GB 机型 4GB+）。TypedArray/wasm 另有 Gigacage 限制。Apple 论坛另有报告称 iPhone 上 ActiveHard 上限 2048MB（摘要）。超限时进程被系统杀掉，**JS 收不到任何错误，也没有 `webglcontextlost` 事件**，页面直接白屏或重载，甚至循环重载。
- iOS 历史缺陷：反复改 WebGL 画布尺寸会泄漏内存（摘要）。
- **Android**：WebView 渲染进程上限因机型差异大，没有统一数字；中低端 3–4GB 机型同样会被系统回收。需以低端测试机实测为准。
- 纹理换算：RGBA8 2048×2048 = 16MB，带 mipmap ≈ 21MB。一个 4096² 图集 = 64MB。
- **建议预算（手机）**：GPU 纹理常驻 ≤256MB，JS 堆 ≤150MB，音频解码缓冲 ≤40MB；iPad 可放宽到 1.5 倍。立绘按显示尺寸裁切（横屏 720p 逻辑分辨率下，立绘高度 1440px 已足够），不要直接用 4K 原图。

来源：https://bugs.webkit.org/show_bug.cgi?id=268816 （WebKit 工程师 Ben Nham 的说明），https://bugs.webkit.org/show_bug.cgi?id=300782 （摘要，纹理过多导致重载循环、无 context lost 事件），https://developer.apple.com/forums/thread/668999 （摘要，画布改尺寸泄漏），https://developer.apple.com/forums/thread/823061 （摘要）

### 6.2 首包与按场景加载

- **首包（进入游戏到可交互）建议 ≤2–3MB**：引擎（Pixi ~231KB gzip，按需引入更少）+ 规则层 + 当前主题皮肤脚本 + 标题场景图集 + 字体子集。原方案里 2.2MB 的 `p5r-compendium-data.js` 必须拆分，按需加载或改成 JSON 分片。
- 用 Pixi `Assets` 的 manifest + bundle：每个场景（标题、据点、天鹅绒、商店、塔内、战斗、结算）一个 bundle，**进入当前场景时后台预取下一个可能的场景**；离开时 `Assets.unloadBundle()` 释放（Spine 数据另需 `unloadFromCache()`）。
- 主题隔离：只加载当前主题的皮肤包，四套主题资源完全分目录。
- 资源离线：WebView 里优先由宿主 App 内置资源或拦截请求返回本地文件（Android `WebViewAssetLoader` / iOS `WKURLSchemeHandler`），避免每次网络下载；版本号写进文件名便于缓存。
- 字体：中文字体全量数 MB，需按游戏用字做子集，或数字和标题用位图字体。

来源：https://esotericsoftware.com/spine-pixi （Spine 资源卸载），https://pixijs.com/8.x/guides/concepts/performance-tips

### 6.3 压缩纹理（KTX2/Basis）是否值得

- 收益：Pixi 官方称 GPU 压缩纹理比 PNG/JPEG **省 4–8 倍显存**，并跳过运行时解码；推荐新项目用 KTX2 + Basis，通过 resolver 写 `bg.{ktx2,webp,png}` 自动回退。
- 代价：需引入转码器（wasm + worker），增加包体；Basis 在 WebGL1 无扩展时会回退为未压缩格式；有用户报告 v8.18.1 反复加载/卸载 KTX2 时转码 worker 内存泄漏（issue #12073）；带透明通道的立绘压缩后边缘可能有色块，需美术验收；BC7 等格式要求宽高为 4 的倍数。
- **建议**：第一阶段用 WebP/PNG + 严格尺寸预算即可；当实测纹理常驻超过 200MB，或要支持 2GB 内存机型时，第二阶段对**大背景和全屏 Cut-in 图**改 KTX2（UASTC/ETC1S 按质量选），小图标/UI 保持 PNG。

来源：https://github.com/pixijs/pixijs-skills/blob/main/skills/pixijs-assets/references/compressed-textures.md ，https://pixijs.com/8.x/guides/components/assets/compressed-textures （摘要），https://github.com/pixijs/pixijs/issues/12073 （摘要），https://github.com/pixijs/pixijs/discussions/10222 （摘要，BC7 需 4 的倍数）

---

## 7. 参考案例

| 案例 | 技术栈 | 可借鉴点 | 可信度 |
|---|---|---|---|
| **Subway Surfers HTML5**（Poki × Goodboy Digital） | HTML5 / WebGL / PixiJS + 自研 Odie 3D 框架 | 从 Unity 移植到手机浏览器：Unity WebGL 版播放器就约 30MB、手机浏览器跑不动，重写后能在手机网页运行且与原版手感一致 | 官方案例页，未公布帧率数字 |
| **Farmageddon（小羊肖恩）三款 H5 游戏**（Nonatomic / Aardman） | PixiJS | 开发商称「所有设备 60fps」、手机友好、即开即玩 | 开发商自述 |
| **原神网页活动（如史莱姆乐园）**（米哈游） | Spine 骨骼动画 + WebGL（引擎未公开） | 社区工具能从活动页提取 Spine 资源，证明其 H5 活动大量使用 Spine；社区用 **Vue + PixiJS + pixi-spine + GSAP** 复刻了史莱姆乐园 | 米哈游所用渲染库未公开；复刻项目代码公开 |
| **PixiJS 官方 Showcase**（Happy Wheels、LEGO City Adventures 等） | PixiJS | 大量商业品牌 H5 游戏案例 | 官方展示，无统一性能数据 |
| **Goodboy Digital 其它 H5 游戏**（Dennis & Gnasher 等） | PixiJS + 自研 3D，打包为 App | 同一代码同时发布手机网页与 App | 官方案例页（摘要） |

来源：https://www.goodboydigital.com/case-study/subway-surfers ，https://nonatomic.co.uk/projects/farmageddon ，https://github.com/journey-ad/slime-pixi ，https://github.com/YuehaiTeam/webstatic-extractor （摘要），https://pixijs.com/showcase （摘要），https://www.goodboydigital.com/case-study/dennis-gnasher-leg-it （摘要）

**坦白说明**：本次没有找到「公开、可复现的手机实机 60fps 测量」的 H5 演出类游戏数据，上述 60fps 均为开发商自述。P5X 本身是原生引擎（原方案已指出），不是网页可直接对标的技术参考。建议我们自己做一个 **2 天的技术验证（Spike）**：在目标中端机（如骁龙 7 系安卓 + iPhone 12/13）的真实宿主 WebView 里，跑「4 角色呼吸 + 一次 Cut-in + 冲击波 + 300 粒子」，记录帧时间，再定画质档位参数。

---

## 8. 推荐技术栈与项目结构草案

### 8.1 技术栈

| 层 | 选型 |
|---|---|
| 语言/构建 | TypeScript（规则层可先保留 JS）+ Vite（ESM、按场景代码分包） |
| 渲染 | PixiJS v8（WebGL）、pixi-filters v6 |
| 粒子 | v8 `ParticleContainer` + v8 版 emitter（源码纳入仓库） |
| 补间/时间轴 | GSAP（社区复刻原神活动同款）或自研轻量 tween；**全部挂在同一个 Ticker 上，可整体暂停/变速** |
| 角色 | 第一阶段：分层立绘 + Mesh 程序化动画；第二阶段可选 spine-pixi-v8 |
| 音频 | 自研 AudioManager（WebAudio + `<audio>` 流式），或 `@pixi/sound` 加 iOS 补丁 |
| 资源 | Pixi Assets manifest/bundle + AssetPack 生成图集与 @0.5x |
| UI | DOM 叠加层（原生 JS 或轻量框架），只在非演出时更新 |
| 原生桥 | `UmbraBridge`：方向、安全区、音频会话、前后台、存档同步、震动 |

### 8.2 目录结构草案

```
umbra/
├─ engine/                 # 引擎层（与主题无关，App AI 负责）
│  ├─ app.ts               # Pixi 初始化、resolution 封顶、画质档位
│  ├─ loop.ts              # 统一 Ticker、时间缩放、暂停
│  ├─ scene/               # SceneManager + 转场（进场/退场/加载画面）
│  ├─ assets/              # manifest、bundle 预取与卸载、预热（prepare + 滤镜编译）
│  ├─ fx/                  # 粒子池、滤镜池、镜头震动、残影、闪白等通用特效原语
│  ├─ anim/                # Mesh 呼吸/摆动/受击形变、动作配方播放器（JSON 关键帧）
│  ├─ audio/               # AudioManager、iOS 解锁与中断恢复
│  ├─ input/               # 指针/手势，含「虚拟横屏」坐标变换
│  ├─ layout/              # 设计分辨率、安全区、横竖屏兜底
│  ├─ quality/             # 帧时间监控与动态降档
│  └─ bridge/              # 与主 App 的消息协议（方向、安全区、生命周期、存档）
├─ rules/                  # 规则层（保留现有代码，纯逻辑，禁止引用 DOM/Pixi）
│  ├─ battle/ fusion/ economy/ encounter/ negotiation/ tower/ save/
│  └─ events.ts            # 规则层只发事件：attack, hit, crit, oneMore, allOut, down...
├─ skins/                  # 皮肤层（每主题一个包，各主题 AI 负责）
│  ├─ _contract/           # 皮肤接口定义：每个规则事件对应的演出钩子 + 必需素材清单
│  ├─ p3-blue/  p3p-pink/  p4-yellow/  p5r-red/
│  │   ├─ manifest.json    # 本主题素材 bundle
│  │   ├─ palette.ts       # 主色、ColorMap 配色
│  │   ├─ recipes/         # 动作配方与特效配方（JSON + 少量代码）
│  │   ├─ cutins/          # Cut-in、总攻击、ONE MORE 版式动画
│  │   └─ ui.css           # 仅本主题的 DOM 叠加层样式（按需加载，不再四套同时加载）
├─ ui/                     # UI 层（DOM 叠加）
│  ├─ overlay/             # 菜单、图鉴、设置、对话、商店列表
│  └─ hud-bridge.ts        # DOM ↔ 画布 的状态同步（节流，演出期间冻结）
└─ host/                   # 主 App 侧原生示例代码（Android/iOS 桥接参考实现）
```

关键约束：
- 规则层 → 事件总线 → 皮肤层「钩子」→ 引擎特效原语。皮肤层只能调用引擎提供的原语和自己的素材，不能直接改规则状态。
- 每个主题一个独立 bundle，切主题 = 卸载旧包 + 加载新包，引擎与规则层不重载。
- 工作区已有 `HOOK-MAP.md`（本次未审阅其内容），皮肤接口应与之对齐。

### 8.3 UI 层：DOM 叠加 vs 画布内 UI 的取舍

| 放画布内 | 放 DOM 叠加层 |
|---|---|
| 战斗 HUD（HP/SP 条、行动顺序、弱点提示） | 主菜单、设置、存档列表 |
| 伤害数字、ONE MORE、总攻击、Cut-in | 图鉴/合成列表（长列表、需滚动、大量中文） |
| 技能选择环/快捷指令（需要跟随演出动） | 剧情对话框（长文本、富文本、可选中复制、无障碍） |
| 转场、加载画面 | 需要键盘输入的界面（命名、搜索） |

原则：
1. **会动的、要跟演出同步的进画布；文字多、要滚动、要输入的用 DOM**。
2. DOM 只用 `transform`/`opacity` 动效；不在演出帧内读布局；进入演出时给叠加层加 `visibility:hidden` 或 `content-visibility`，结束再恢复。
3. 叠加层 DOM 节点总数控制在数百以内；列表用虚拟滚动。
4. 每个主题只加载自己的 CSS（原问题是四套 CSS 共 1.9MB 同时加载）。
5. 坐标统一：DOM 叠加层与画布使用同一套设计分辨率缩放和安全区变量，「虚拟横屏」旋转时 DOM 层同步旋转或暂时隐藏。

---

## 9. 风险清单与规避办法

| # | 风险 | 影响 | 规避办法 |
|---|---|---|---|
| R1 | **Android 16+ 平板、iPadOS 26+ 拒绝横屏锁** | 平板（项目优先设备）上进不了横屏 | 游戏层实现「请横置」提示 + 画布内虚拟横屏；按任意比例窗口自适应布局；尽早在 Pixel Tablet 模拟器、iPad（iPadOS 26）实测；与主 App 方确认 targetSdk 与是否可在游戏 Activity 退出（API 37 前有效） |
| R2 | iOS WebContent 内存超限被杀（无报错、可能循环重载） | 白屏、进度丢失 | 纹理/音频预算硬上限；场景切换严格卸载；立绘按需裁切；自动存档；原生侧监听 WebView 进程终止（iOS `webViewWebContentProcessDidTerminate`、Android `onRenderProcessGone`）后提示并恢复 |
| R3 | 全屏滤镜叠加导致中端机掉帧 | 大招演出卡顿 | 滤镜纪律（限时、限区域、0.5 分辨率、≤2 个）；三档画质 + 动态降档；Spike 实测定参数 |
| R4 | 首次放特效着色器编译/纹理上传卡顿 | 每场战斗第一次大招顿一下 | 加载画面期间 `prepare` 上传纹理 + 每个滤镜离屏渲染一次 + 每种特效预播一帧 |
| R5 | iOS 音频中断后无法恢复 | 回到游戏没有声音 | 静音 buffer 解锁；visibilitychange 恢复；超时则下次触摸重建 context；原生设置 AVAudioSession；BGM 用 `<audio>` 流式 |
| R6 | 旧版 Android WebView（<M136/M144）安全区为 0 | 按钮被刘海挡住 | 原生注入 inset CSS 变量兜底；关键交互离边缘 ≥24 逻辑像素 |
| R7 | v8 版粒子 emitter、Live2D v8 插件是小型社区项目 | 停更、缺陷无人修 | 锁版本、源码纳入仓库；第一阶段不用 Live2D；粒子行为可自写替换 |
| R8 | Spine/Live2D 授权与收入门槛变化 | 合规风险 | 第一阶段不用；若采用，按「具名个人」购买 Spine；Live2D 发布前一个月确认规模档位并签约 |
| R9 | 官方素材/AI 拆层素材版权 | 下架或纠纷 | 仅内部使用，不对外分发原图；AI 产出逐张人工审核；记录素材来源 |
| R10 | 2.2MB 图鉴数据 + 中文字体拖慢首包 | 启动慢 | 数据分片按需加载；字体子集化；首包 ≤2–3MB；资源随 App 内置或本地拦截 |
| R11 | 四个主题 AI 并行开发风格/接口不一致 | 合并困难、性能参差 | 先定皮肤接口契约（`skins/_contract`）和每主题性能预算（纹理 MB、滤镜数、粒子数），CI 里自动检查 bundle 体积 |
| R12 | WebGPU 或新渲染路径在部分机型异常 | 黑屏/花屏 | 固定 `preference: 'webgl'`；监听 `webglcontextlost` 并重建；保留低档无滤镜路径 |
| R13 | 反复调整画布尺寸引发 iOS WebGL 内存泄漏 | 长时间游玩后崩溃 | 尺寸变化做防抖；只在稳定后 resize 一次；避免每帧改 canvas 宽高 |
| R14 | 主 App 竖屏 ↔ 游戏横屏切换时 WebView 重建 | 状态丢失、重复加载 | Android `configChanges` 声明；游戏放独立 VC/Activity 并复用 WebView 实例；切换期间显示过渡遮罩 |
| R15 | DOM 叠加层再次成为瓶颈 | 回到老问题 | 演出期间冻结 DOM；节点数上限；只用 transform/opacity；性能预算纳入验收 |

---

## 10. 建议的下一步

1. **2 天 Spike**（引擎层负责）：在真实宿主 WebView 中验证 §7 末尾的压力场景，同时验证原生方向桥接与平板兜底。
2. **定皮肤接口契约与性能预算**，四个主题 AI 按契约开工。
3. **立绘流水线**：挑 1 个角色走通 See-through 拆层 → 人工修边 → Mesh 呼吸/受击，评估效果后决定是否采购 Spine。
4. 与主 App 方确认：targetSdk 版本、能否为游戏单独设 Activity/VC、音频会话设置、资源是否内置。

## 附：本报告未能确认的事项

- 没有拿到 Phaser 4 与 PixiJS v8 在同一台手机上的公开对比测试，§1 的性能判断基于官方说明与架构，需 Spike 实测。
- Android WebView 渲染进程的具体内存上限无官方数字。
- 米哈游网页活动使用的渲染库未公开，只确认使用 Spine。
- iOS 静音键对 Web Audio 的影响与绕过方法因系统版本不同，需实机确认。
