# labs/umbra-p5t · 幽影协议 P5T 战棋 · 第 1/1b 步：规则原型（灰盒）

- `src/rules/`：纯逻辑规则层（零 DOM/画布，只发事件）。`new Battle(map, opts)` → `start()` → `move/melee/shoot/skill/unique/wait/tripleThreat/batonPass/endPlayerPhase`，每个指令返回本次事件数组，也可 `on(fn)` 订阅。
  1b 新增：高低差 + 梯子 Dash、推落 + Follow-Up、Charge、Voltage/Unique、10 种元素效果、回复/辅助、7 类特殊敌人、油桶/木箱/喇叭、护送/全员到达/除某人外全灭/坚持 N 回合等目标与奖励栏、Baton Pass、难度。
- `src/main.ts`：three.js 灰盒页面（斜 45° 俯视，点我方选人 → 点蓝格看路线 → 再点确认；点敌人看预估/GET EM!! → 再点确认；点敌人（未选人时）看红格）。
- 测试图（右上下拉切换）：综合测试图（12×8 高架+梯子+油桶+Revenger，替补 Mona/Fox）、教学·推落追击、特殊敌人、护送、元素靶场 A/B、靶场 C（祐介诱饵/艾丽娜插旗/明智 Truth Seeker：选「专属」后点格子两次）、机关图（门/开关/升降台/摄像头/跳台）、Boss/援军图。单位卡里可切换第二个 Charge。右上「充满V」= 灰盒调试直接充满 Voltage。
- 规则依据与差异清单：`RULES-NOTES.md`。

```bash
npm install
npm test            # vitest 无头规则测试
npm run build       # tsc + vite build
npm run dev         # 本地试玩（手机同局域网访问 http://<ip>:5173）
PLAYWRIGHT_BROWSERS_PATH=/workspace/work/ms-playwright LD_LIBRARY_PATH=/workspace/work/pw-libs npm run shots
```
`npm run shots` 会截 `shots/p5t-844x390.png`（推落 → FOLLOW UP）、`shots/p5t-1280x720.png`（油桶爆炸）、`shots/p5t-specials-1280x720.png`（特殊敌人图 + 敌方范围），以及 1c 的 `shots/p5t-1c-1280x720.png`（机关图摄像头警报 + 援军）、`shots/p5t-1c-844x390.png`（插旗 + 诱饵 + 明智的两个 Charge）；`SHOTS=1c` 只截 1c 两张。并在浏览器里纯靠 UI 点击自动打完综合测试图（输出 FULLPLAY 结果 + `shots/p5t-result-1280x720.png`）。
中文字体复用仓库 `public/fonts` 的思源黑体 Black 分片（vite 插件代理，build 时拷入 dist/fonts）。

### Joker 实体模型（私用，不入库）
- 模型来自 P5T 社区提取（仅授权者本地私用），**不提交进 git**：`public/models/private/` 已在 `.gitignore`。
- 拷模型：`./tools/fetch-private-models.sh`（默认从 `/workspace/work/umbra-assets/p5t/2_more/community/glb` 拷；可用 `UMBRA_ASSETS=<目录>` 覆盖），得到 `joker_thief.glb`（怪盗服，优先）和 `joker_school.glb`（学生服，备用）。
- 缺文件时游戏自动退回原来的占位胶囊，规则/测试不受影响。
- 表现见 `src/view/jokerModel.ts`：卡通材质（3 阶 toon + 脸部平涂 + 黑色外描边）、怪盗服发色由 mod 黄改回近黑、学生服镜片隐藏；T-pose 程序化改成自然下垂，并有待机呼吸、跑步、举枪/近战/技能抬手、受击后仰、倒地仰躺、朝移动/目标方向转身。
- 截图：`npm run build && node tools/joker-shot.mjs`（输出到 `OUT`，默认 `/workspace/work/notes/shots/2026-10-25`）。
