# 幽影协议（UMBRA）交接总入口

新接手的 AI 先读这一页，再按顺序读下面的文件。

## 1. 先读（定稿，可直接照做）
1. docs/umbra-design/GDD-v1.md — 策划案（§15/§16 为最新修订）
2. docs/umbra-design/CONTRACT-v1.2.md — 引擎/皮肤契约（开工版，以文末「v1.2 修订」为准）
3. docs/umbra-design/FX-MAP-v1.md — 玩法↔演出一一对应表（每个玩法触发什么事件、四皮各演什么）
4. docs/umbra-decisions.md — 主策划已拍板的决定（D-001 起，新在上）

## 2. 按身份读任务书
- App 接入方：docs/umbra-design/TASK-APP-v1.2.md；进度 docs/umbra-progress/app.md；分支 feat/umbra-app-m2
- 主题皮肤方：docs/umbra-design/TASK-THEMES-v1.2.md
  - 黄 p4-yellow：docs/umbra-handover/p4-yellow.md；分支 feat/umbra-skin-p4-yellow
  - 蓝 p3-blue：docs/umbra-handover/p3-blue.md；分支 feat/umbra-skin-p3-blue
  - 粉 p3r-pink：docs/umbra-handover/p3r-pink.md；分支 feat/umbra-skin-p3r-pink
  - 红 p5r-red（样板）：分支 feat/umbra-skin-p5r-red（M3 完成后推送；黄蓝粉照它做）

## 3. 参考（不用照做）
- docs/umbra-design/research-*.md、audit-umbra.md — 调研与旧代码审计
- docs/umbra-review/ — 各方评审存档

## 4. 当前进度
见 docs/umbra-handover/STATUS.md（每次收尾更新）。

## 规则
- 不动 main，不 reset/stash/clean；只在自己的分支提交。
- 仓库 .gitignore 忽略 *.md，提交 md 用 `git add -f`。
- 用户要求 1:1 还原 P5R，禁止为性能删演出。
