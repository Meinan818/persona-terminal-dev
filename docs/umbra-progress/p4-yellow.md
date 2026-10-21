# p4-yellow 进度（黄 · P4R+P4G）

| 时间 | 完成了什么 | 自查结果 | 下一步 |
|---|---|---|---|
| 10-22 02:20 | ① 素材：assets/ 9 张 webp（首包 5：bg.battle 2240×950 gen / atlas.portraits 2048×1024 官方 4 人×2 层 / cutin.hero 1280×320 官方 / allout.finish.default 1280×720 官方合成漫画四格 / atlas.hud 1024² 程序绘制；延迟 4：bg.map、bg.hub gen，highlight.hero、enemy.calm-pesce 官方）+ 2 个 Pixi 帧表 json + 字体 2 个子集 + manifest.json（46 条，逐张 source/firstPack/w/h/atlas） | 首包图 637KB ≤780；单全屏图最大 195KB ≤200；立绘高 640、单人两层估算 30/32/39/51KB ≤60；图集 ≤2048²；背景宽 2240；字体 display 50.5KB + number 3.6KB = 54KB ≤120；首包图 5 张 ≤14；official 6 文件 / generated 3 文件 | ② tokens/labels/slots/templates |
| 10-22 02:40 | ② tokens.json（§4.2 全字段，hud grid+fivePlusMore+card）、labels.json（52 条，含 darkHour=午夜电视、more=更多、dive=电视世界、highlight=必杀）、slots.json（§4.1 必填全部 + topInfo 读 $env 日期/曜日/天气、4 人 meshIdle/swayZone）、templates.json（P4 电视交涉模板）、ui.css | 指令区 5 项+更多全部在 x780–1256/y220–696，主 120、次 ≥92，互不重叠（lint 校验）；模板只用白名单标签、无 on*/src/href/url()；ui.css gzip 1.1KB；**hud.system 命中区与插槽范围冲突（Q1）** | ③ recipes + index.ts + skin-lint |
