# M3 红色样板（p5r-red）
自成一体的可运行样板：引擎原语 + Director 简版（src/umbra/engine）、契约类型（src/umbra/skins/_contract）、红色皮肤包（src/umbra/skins/p5r-red）。
- 运行：npm i && npm run build && python3 serve.py 8766 → http://127.0.0.1:8766/?demo=1
- 报告：M3-RED-REPORT.md；截图 shots/（contact 拼图、compare 对比）
- App 接入时按契约把 engine 演出原语与 skins 目录并入正式 src/umbra/，不要与规则层文件混名。
- 黄蓝粉照 src/umbra/skins/p5r-red 的结构做。
- 已知待修：队伍卡同伴头像误用了人格面具剪影，应为龙司/摩尔加纳/杏（第二阶段修）。
