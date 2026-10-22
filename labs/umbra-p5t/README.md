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
