# labs/umbra-p5t · 幽影协议 P5T 战棋 · 第 1 步：规则原型（灰盒）

- `src/rules/`：纯逻辑规则层（零 DOM/画布，只发事件）。`new Battle(map, opts)` → `start()` → `move/melee/shoot/skill/wait/tripleThreat/endPlayerPhase`，每个指令返回本次事件数组，也可 `on(fn)` 订阅。
- `src/main.ts`：three.js 灰盒页面（斜 45° 俯视，点我方选人 → 点蓝格看路线 → 再点确认；点敌人看预估/GET EM!! → 再点确认；点敌人（未选人时）看红格）。
- 测试图：8×6，Joker + 龙司 + 杏 vs 4 个 Shadow，击败全部，6 回合内拿皇冠。
- 规则依据与差异清单：`RULES-NOTES.md`。

```bash
npm install
npm test            # vitest 无头规则测试
npm run build       # tsc + vite build
npm run dev         # 本地试玩（手机同局域网访问 http://<ip>:5173）
PLAYWRIGHT_BROWSERS_PATH=/workspace/work/ms-playwright LD_LIBRARY_PATH=/workspace/work/pw-libs npm run shots
```
`npm run shots` 会截 `shots/p5t-844x390.png`、`shots/p5t-1280x720.png`，并在浏览器里纯靠 UI 点击自动打完测试图（输出 FULLPLAY 结果 + `shots/p5t-result-1280x720.png`）。
中文字体复用仓库 `public/fonts` 的思源黑体 Black 分片（vite 插件代理，build 时拷入 dist/fonts）。
