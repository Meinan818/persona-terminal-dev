# UMBRA 交接文档（给下一个 Hark）— 2026-10-27

> ⚠️ **安全：Meinan818/persona-terminal-dev 当前是 PUBLIC，且含原作衍生文件（`labs/umbra-p5t/public` 下模型等、`scripts/p5r-red/reference`）。此仓库须设为 private。** 我们的 GitHub 授权无权改可见性（API：Resource not accessible by integration），需用户本人在 GitHub → Settings → Danger Zone → Change visibility 改为 Private。不要删历史。

## 交接（2026-10-28 02:20 CST，用户叫停本会话，交回给之前的 Hark）
- 最新提交 8be15d3（r19 Joker 面具眼白修复）。从 e17941b（上个 Hark 最终版）到现在：0 个文件被删，src 76 个文件不变，+958/−104 行。
- r20（命中定格/死亡墨团）已取消，未提交，没有半成品。
- 已知回归只在录像：tools/rec-gun 无音轨且 15fps。交付视频请用 tools/rec-r15（mix.py 混 BGM+SFX）/ rec-r16b，30fps+AAC。
- 新沙箱开工必须先跑全部 tools/fetch-*.sh（地图/BGM/音效等 gitignore 素材），Playwright 查 0 个 404/回退。
- 待办：r20 命中/死亡打击感、瞄准 UI 换 Codex R6c 原版、帧率显示+删 main.ts Kenney 预加载、手机实测；Codex R7/R8 待验收。详见 umbra-assets hark-workspace/notes/STATUS-LOG.md、R13-BACKLOG.md。
- 每日 00:20 定时续干任务已暂停。

## 0. 最新（2026-10-28 01:25 CST，每日续干）
- 代码 feat/umbra-app-m2 2ed1745：r18 枪击流程——过肩瞄准红描边改「剪影左移投影」（aim_1420_3 逐行实测左侧纯红 22px@720、右侧 0）；瞄准中射手不再被每帧拧回掩体朝向；敌人接 batch-08 全量动作（Em0001_110/610 共用 016 骨骼，121 根同名）；rec-gun 正面特写剪影改取切入首帧。
- 实测（第一章 M01，参考帧 notes/p5t-ref-video/frames）：过肩瞄准 aim_1420_3 位置误差 ≤1.3%、高度 1.3%、剪影 IoU 0.850（参考剪影为手工描点 = guessed）；暴击特写 hit_1422 位置误差 ≤1.6%、高度 0.7%（参考只有手画框，未算 IoU）；开火 hit_1304 位置误差 ≤3.6%，但原版是 Skull 开枪、我方是 Joker → 不算同刻对比。
- 剩余差距：导航员吐槽框（等 Codex R7b 台词表）、我方 BACK 牌原版此帧未显示待核、测试布景机位/地面与原版不同站位、Skull 同刻开火对比未做。
- Codex：R6a–d 验收通过；R7（镜头组件实例/导航员台词/敌人全量动作/结算表情）已派。
- ⚠️ 本轮发现另一个 Hark 会话同时在改同一工作区（提交 5a9a820 r17c、/workspace/work/recgun_r17d、refvid-user），接手先 git log/status，避免互相覆盖。

## 1. 项目目标
- UMBRA = 1:1 还原《女神异闻录5 战略版》(P5T) 战斗，网页 + 安卓。
- 皮肤顺序：**红 P5 优先** → P4 黄 → P3 蓝 → P3R 粉。
- 视觉与玩法还原度 98%；**小米 17 Pro 稳 60 帧**；**安装包 ≤400MB**。
- 剧情：Hark 写的轻量原创框架（每关前后 2–4 句，换皮只换角色）；战斗/地图/数值按原版。

## 2. 当前进度（2026-10-27 00:45）
- 整体约 45%，战斗约 70%。
- r15（4b578d1）已交付：batch-08 动作、倒地起身、心形血条、瞄准/指令/结算镜头、原版 BGM L01/02/04/05/08/09。
- r16（ddb1a7b）：9 队员人格面具召唤原版等；**结算画面被用户否决**（无胜利姿势大特写、镜头远、红带/手写标题/继续按钮不对）。
- r16b 未达门槛未提交（红带 IoU 0.60/0.64）；已做出原版标题/GET/CLEAR/继续 Sprite、Skull 枪挂点修正、进结算音效。
- **round16c 正在重做结算 + 9 人武器挂点**，其**未提交改动就在本工作区**（`src/main.ts`、`ui/resultScreen.ts`、`view/p5tChar.ts`、`view/origMap.ts`、`view/sfx.ts`、`p5t-hud.css`、`tools/r16b-*`、`tools/r16c-*`、`src/view/data/result-bands.json`、`src/fonts/` 等）。接手时先 `git status` 看清，别 reset/stash 掉。
- Codex R 批（R1 d 系列 BGM 转 Opus、R2 KTX2+meshopt 手机 GLB 到 `p5t/3_mobile`（662MB→190MB）、R3 大字补搜、R4 语音长度矩阵）**已全部回报完成**（umbra-assets `CODEX-TO-HARK.md`），**待 Hark 验收并接入**。

## 3. 仓库与目录
| 仓库 | 用途 | 分支 |
|---|---|---|
| https://github.com/Meinan818/persona-terminal-dev | 代码（⚠️须改 private） | `feat/umbra-app-m2` |
| https://github.com/Meinan818/umbra-assets | 原版素材 + 数据库 + Hark 工作区存档（private） | `main` |

- 游戏：`labs/umbra-p5t/`（`src/` 代码，`tests/` Vitest，`tools/` 抓素材/截图/录像/对比脚本，`public/` 运行时素材，`notes/`）。
- 私有素材由 `tools/fetch-private-*.sh`、`tools/fetch-p5t-*.sh` 从 umbra-assets 拉到 `public/`。
- umbra-assets：`p5t/data/`（291 技能、219 副面具，README-data.md）、`p5t/1_data/`（原表 skills.csv/personas.csv 等）、`p5t/1_battle/`（模型/动作 GLB）、`p5t/3_mobile/`（KTX2+meshopt 手机版）、`p5t/1_audio/`（BGM/语音，`ogg/` 为 Opus）、`p5t/1_ui/`（UI 贴图）。
- **Hark 工作区存档：umbra-assets/`hark-workspace/`**（见其中 `MANIFEST.md`、`PROJECT-SKILL.md`）：
  - `notes/STATUS-LOG.md`（进度，新在上）、`R13-BACKLOG.md`、`PENDING-QUESTIONS.md`、`SKILL-HISTORY.md`、`THEME-SPLIT-PLAN.md`、`ORIGINAL-ASSET-AUDIT.md`、`P5T-R*.md` 各轮报告。
  - `notes/p5t-ref-video/INDEX.md` = 原版实机帧库（对比基准）。
  - `umbra-red/design/` 设计文档。

## 4. 构建与运行（`labs/umbra-p5t`）
```bash
cd labs/umbra-p5t
npm install
bash tools/fetch-private-models.sh   # 等 fetch-* 脚本：从 umbra-assets 拉私有素材（需 umbra-assets 克隆在旁）
npm run dev        # Vite 开发服务器（?debug 显示调试工具栏）
npm run build      # tsc --noEmit && vite build → dist/
npm test           # vitest run（r12 时 214 个测试）
npx tsc --noEmit   # 仅类型检查
```
- 录像：`tools/rec-r15/rec.mjs <from> <to>`（虚拟时钟+固定种子，分段续录），最新 `tools/rec-r16b/`；外层循环脚本见 `hark-workspace/scripts/r15/run-rec.sh`。
- 对比图：`python3 tools/r12-sbs.py`（原版帧并排）；结算 IoU：`tools/r16b-iou.py` / `tools/r16c-iou.py`。
- Playwright 环境（沙箱）：`export PLAYWRIGHT_BROWSERS_PATH=/workspace/work/ms-playwright LD_LIBRARY_PATH=/workspace/work/pw-libs`（新环境需 `npx playwright install chromium` 重建，这两个目录未存档）。
- 机器 2 核无 GPU：重活一律 `flock /tmp/p5r-heavy.lock <命令>`。

## 5. 真机测试（小米 17 Pro）—— **未验证**
- 仓库根有 Capacitor 安卓工程 `android/`，`capacitor.config.ts`：appId `com.meinan818.personaterminal`、appName `MASKARIA`、`webDir: 'dist'`（**这是主 App 的 dist，不是 UMBRA lab**）。根 package.json 脚本：`cap:sync`、`cap:open:android`、`cap:run:android`、`cap:build:android`。
- 打 UMBRA APK 的设想步骤（**从未跑过，未验证**）：
  1. `cd labs/umbra-p5t && npm run build`
  2. 把 `labs/umbra-p5t/dist/*` 放到根 `dist/`（或单独建一份 capacitor 配置把 webDir 指向 `labs/umbra-p5t/dist`，appId 另起避免覆盖主 App）
  3. 根目录 `npx cap sync android`
  4. `cd android && ./gradlew assembleDebug` → `android/app/build/outputs/apk/debug/app-debug.apk`（需 JDK 17 + Android SDK；沙箱没有，需用户电脑或 Codex 执行）
  5. 手机装 APK，测帧率（Chrome `chrome://inspect` 远程调试 / 页面内 FPS 计）与包体。
- 手机素材应改用 `p5t/3_mobile` 的 KTX2+meshopt GLB（three 需 KTX2Loader + MeshoptDecoder）与 Opus 音频。

## 6. 已完成 / 未完成
**已完成**：原版逐关场景 L01–L09（M01…M17）+ 原版灯光/lightmap；原版 gimmick 掩体/炸弹桶；命中火花/伤害数字/22 SE；回合横幅、移动范围/路径、指令菜单（原版底板+TMP 字体）、技能列表（原版流程+低角镜头）、HUD 原版化、预测头顶；闪出开枪/遮挡半透/盾牌平贴；原版 BGM（L01/02=bgm_002 用户最爱）；9 队员人格面具召唤原版（蓝焰）；batch-08 动作、倒地起身、心形血条。
**未完成**：结算画面（r16c 进行中）；9 人武器挂点；L10 场景换 M22；战斗语音接入；Kouha 等其余技能特效（Q2 参数已到）；FINISH/SHOWTIME 等大字（R3：原版无独立 Sprite）；总攻击；手机性能（KTX2/Opus 接入）；APK 真机；P4/P3/P3R 换皮；剧情文字与天鹅绒房间。

## 7. 下一步待办（按顺序）
1. **结算达标**（round16c）：门槛 = 角色位置/尺寸误差 ≤5%、红带 IoU ≥0.85、全部用原版 Sprite；第 2 页特写 = 最后一击者；与原版帧同刻并排对比图 + 数值。
2. **9 人武器挂点**（Loc_Wp_Gun_R 等骨点 + 朝向，Skull 已改 Y180）。
3. **L10 换 M22**（地图已在 umbra-assets）。
4. **接战斗语音**：用 `p5t/1_audio/voice/btl_length_matrix.csv`（R4）听判 btl_NNN 时机。
5. **性能**：接 Opus（R1）、KTX2+meshopt（R2，`p5t/3_mobile`），量包体与帧率，目标稳 60 帧、≤400MB。
6. 验收 Codex R 批后给 Codex 写下一批（CODEX-TASK-NOW.md 顶部保留「做完立刻做下一项」段）。
7. 剩余见 `hark-workspace/notes/R13-BACKLOG.md`、`PENDING-QUESTIONS.md`。

## 8. 已知问题
- 结算红带形状/位置不准（r16b IoU 0.60/0.64）。
- 部分角色武器挂点歪/反向；PC0008 无 BTL 动作；Erina 刀 SwordId 21101 无武器模型。
- bpNN↔角色语音映射为 Codex 推测，需抽查。
- bgm_002 是否官方名 Tension 未证实。
- 主仓库 PUBLIC（见顶部）。

## 9. 硬规则
- 能用原版绝不自创；自绘只作临时占位并标注。
- 不破解 DRM、不逆向 GameAssembly.dll；**P3R 不提取**。
- 素材仅私用（仓库必须 private）。
- 交付前逐屏对原版帧（`notes/p5t-ref-video/INDEX.md`）并附实测数值；子任务自评分常偏高，以实测为准。

## 10. Codex 协作
- Codex 在用户电脑上从正版游戏提素材，推到 umbra-assets `main`。
- 任务单 `umbra-assets/CODEX-TASK-NOW.md`：顶部永远保留「⚠️ 工作方式：做完一项立刻做下一项、不要停」段；每项写「为什么 / 要什么 / 完成标准」，要详细分步（Codex 看不懂简短指令）。
- 回报 `CODEX-TO-HARK.md`（新在上）；记忆 `CODEX-MEMORY.md`；长期 `LONG-PLAN.md`。
- 每次到货 Hark 抽查验收后写进 STATUS-LOG，再派下一批。

## 11. 用户偏好
- 中文、极简；用户是纯新手：每次只给**一句结论 + 「你现在要做的」**（可直接复制的原话，发给谁）。没事就说「你什么都不用做」。
- 不刷屏，以截图/视频为主。
- 自主连续干：只有用户叫停或额度不足才停；需要 Codex/用户配合的等用户出现，其余自己做。
- 每日/月度额度用到 95% 收尾存档（月度 95% 时全部上传 GitHub + 交接文档）。
- 用户最喜欢的战斗曲 bgm_002；手机为小米 17 Pro。
- 天鹅绒：红=拉雯妲监狱、黄=玛格丽特轿车、蓝/粉=伊丽莎白电梯；召唤：P5 扯面具蓝焰、P3 召唤器玻璃碎裂、P4 捏碎塔罗。

## 12. 存档位置
完整 Hark 工作区（笔记、帧库、视频、设计、脚本）：**umbra-assets/`hark-workspace/`**，清单见 `hark-workspace/MANIFEST.md`。

## 最新状态（2026-10-27 01:20 CST，月度额度到 95% 停止开发时）
- 代码最终提交 327a888（feat/umbra-app-m2）：结算按原版同帧对齐（头部框误差 0%、红带区域 IoU 0.885–0.954、原版标题/GET!!/CLEAR!!/继续 Sprite）；Mona/Queen/Erina 枪挂点修正（GUN_FIX，rebuilt，等原版 weapon_motion）。
- 结算剩余差距：第2页青色描边偏细；场景B Joker 非原版出拳姿势；Skull 表情不同；胜利曲无 ≥0.9 匹配未接。见 notes/R13-BACKLOG.md。
- Codex：R1–R4 已报完成待验收；R5（weapon_motion 导出）已派。
- 对比图/视频：hark-workspace/notes/shots/2026-10-26/r16b-result-vs-orig.jpg、r16b-result.mp4、r16c-weapons.jpg。
