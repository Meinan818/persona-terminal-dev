# UMBRA M4 · 红色（p5r-red）完整可玩流程垂直切片报告

> 日期 2026-10-22 · 目录 `/workspace/work/umbra-next/m4/`（由 m3 复制扩展；m3 原目录未改）· 仓库 `labs/umbra-m4-red/`（分支 feat/umbra-skin-p5r-red）
> 依据：GDD §17/§19/§20、CONTRACT-v1.3（§3b/§3d/§3e/§7.4）、FX-MAP-v1.1、SYSTEMS-AUDIT-v1、decisions D-001~D-009、M3-RED-REPORT。

## 0. 结论

1. **一局完整跑通**：据点（隐秘之家阁楼 + P5 斜切菜单）→ 委托板（3 个委托，Mementos 委托格式）→ 预告信（可选，发出后 BOSS 强化、必得宝物；3.0s 飞出钉墙演出可跳过）→ Q 版格子潜入（5 节点路线：守门 → 分路（稳路/险路）→ 安全屋 → 守门 → 统治者）→ 战斗（M3 战斗原样复用，按遭遇配置开战）→ BOSS（登场 2.0s 可跳过 + 两阶段换形态/换弱点/一回合两动）→ 局末结算（经验/金钱/等级变化/战利品/宝物/心之卡/评级 S·A·B）→ 回据点（等级、金钱、已完成委托数已更新）。
2. **自动化**：`tools/flow.mjs` 从据点一路走到回据点。真战斗版（844×390、dpr 2）8 场战斗（含 BOSS 两阶段）、125s、**页面错误 0、流程错误 0**；跳过战斗版（`fast=1`）5 个尺寸全部走完。
3. **M3 无回退**：`check.mjs` 全过（1 MORE 433/450ms、跳过闪白 126ms、超上限 0、命中区/竖屏点击/冻结/缓冲/清场全过）；`enemies.mjs` 1280×720 n=1/3/4/5 无重叠。n=2 有一处 0.089 的名牌×行动顺序条重叠——**用 M3 构建复测也一样**，属 M3 遗留，不是本次回退。
4. 数据驱动：关卡种子拼模板（`src/game/data/rooms.json`）、敌人 1–5（`enemies.json`，含精英/BOSS 阶段）、委托（`requests.json`）、成长/警戒/心之卡数值（`economy.json`）；文案全部在皮肤 `labels.json`（BOSS 名按委托覆盖，规则 id 不变）。

## 1. 环节完成表

| 环节 | 状态 | 说明 |
|---|---|---|
| 据点/菜单 | ✅ | 阁楼背景（生成，待换官方）、剪报标题、5 项斜切菜单（委托板/预告信/出发潜入/商店/天鹅绒）、持有金/完成数/队伍 Lv 卡 |
| 委托板 | ✅ | 3 张委托卡：委托人/目标（统治者名）/地点/报酬/故事/星级/已完成章；命名按 §20 规则（殿堂=扭曲认知场所，统治者=神话恶魔名：贝尔芬格/莉莉姆/别西卜），无直白词 |
| 预告信 | ✅ | 红色预告信版式 + 星标 + 剪报字「TAKE YOUR HEART」，发出动画 3.0s 可跳过（实测 2901ms）；效果进规则：BOSS HP×1.15、攻×1.1、击破得宝物「扭曲的王冠」；bgm 条件 callingCard |
| Q 版格子潜入 | ✅ | 9×6 斜 45° 2.5D 格子；点格子 BFS 寻路逐格结算；巡逻阴影每步走一格；视线锥 3 格（被墙/掩体挡）；贴掩体只在 1 格内被发现；被发现=警戒 +20 且被偷袭（敌先手）；从视线外接近=先手；宝箱（钱/道具/心之卡）；隐藏路（知识检定）；守门/精英封出口必战，战胜后铁栅升起；第三只眼（显示视线锥+可交互格 2s，冷却 6s）；警戒度条 + 路线条 + 队伍 HP/SP + 心之卡 + 导航气泡 |
| 警戒度 | ✅ | 被发现 +20、战斗超 3 回合每回合 +5、安全屋 −30；满 100 → 敌攻×1.3/HP×1.2、掉落×2（§17） |
| 分路（稳/险） | ✅ | 稳路=守门+宝箱+隐藏通道（知识≥3），险路=精英+稀有心之卡+大量金钱；bgm explore.risk |
| 安全屋 | ✅ | SAFE ROOM 画面，休息=全恢复+警戒 −30+存档（localStorage 简版） |
| 战斗 | ✅ | 复用 M3：遭遇表 1–5 只、先手/普通/被偷袭（被偷袭先放敌方回合）、精英/BOSS 立绘与高度读数据、跨战斗 HP/SP 继承、心之卡修正伤害/弱点/接力 |
| BOSS | ✅ | boss:intro（2.0s 可跳过）→ 一阶段 → HP 归零换二阶段（boss:phase 2.0s：白红闪 + 剪报名牌 + 立绘换成二形态 + 弱点重置 + 一回合 2 动 + bgm boss.p2）；BOSS 不可交涉（按交涉/放过 → 导航提示）；总攻对 BOSS 只打伤害不秒杀 |
| 结算 | ✅ | 单场 RESULT（M3）+ LEVEL UP 卡；局末 MISSION COMPLETE：经验/金钱（含委托报酬）/等级 a→b/战利品+宝物/心之卡/战斗数+最终警戒度/评级 |
| 回据点 | ✅ | 回到阁楼，Lv/金钱/完成数刷新，可再接委托 |
| 心之卡 | ✅ | 守门/精英战后、宝箱里给；四系三选一，3 张同系触发套装（buff:grant 记日志） |
| 商店/合成 | ⏸ 占位 | 入口在，点进去显示店主/天鹅绒双子立绘 +「施工中」说明（标注） |
| 音频 | ✅ 接口 | 所有画面按 AUDIO-MAP 情境发 bgm:cue（hub.home / requests / explore / explore.callingcard / explore.risk / explore.safe / battle.normal·ambush·ambushed·elite / boss.intro / boss.p1 / boss.p2 / boss.defeat / victory / result）+ se（scene.enter/step/cover/spotted/alert.up/interact/exit.open/explore.scan/callingcard/boss.phase/ui.*）；无文件全部静默 |

## 2. 演出时长（契约上限 vs 实测墙钟）

| 事件 | 上限 | 实测 | 备注 |
|---|---|---|---|
| explore:move | 0.25s/格，封顶 2.0s | 6 格 1393/1500 | 跟随者沿轨迹跳步 |
| explore:spotted | 0.5s | 466 | 「！」+ 红闪 + 抖动 |
| explore:cover | 0.3s | ≤300 | 下蹲 + 蓝色掩体标 |
| explore:interact | 0.4s | ≤400 | 宝箱开盖 / 隐藏墙下沉 |
| explore:exit | 0.8s | ≤800 | 铁栅升起 |
| explore:scan | 起效 0.4s + 显示 2s 不阻塞 | ≤400 | 红色扫描环 |
| map:encounter 冲击 | （本作自定 0.35s） | 300 | 红黑斜切 + 敌人放大，接 M3 开战转场 |
| callingcard:send | 3.0s 可跳过 | 2901 | |
| boss:intro | 2.0s 可跳过 | 1900 | |
| boss:phase | 2.0s 可跳过 | 1901 | |
| card:pick | 0.6s | 560 | 翻牌入场，之后 DOM 选择 |
| 转场 wipe（本作） | 0.7s | 680–692 | 中点的内容构建/加载另记 build 字段（首进潜入约 1.5–4s，见缺口 4） |

数据：`tools/out/flow-844x390.json`（timings / exLog / log / audio）。

## 3. 截图（`shots-m4/`，仓库 `labs/umbra-m4-red/shots/*.jpg`）

- 5 尺寸 × 流程画面：`<尺寸>-01-hub / 02-board / 03-callingcard / 04-cc-send / 05-explore-gate / 05-fork / 05-explore-risk / 05-safe / 08-card / 09-boss-intro / 10-end / 11-hub-after`（尺寸：667×375、844×390、1024×768、1180×820、1920×1080）。
- 844×390 真战斗版另有：`06-battle`、`07-result`、`09-boss-phase`。
- 代表 3 张：`844x390-05-explore-gate.png`（Q 版格子潜入）、`844x390-09-boss-phase.png`（BOSS 二形态）、`844x390-10-end.png`（局末结算）。

## 4. 自评（满分 10）

| 项 | 分 | 理由 |
|---|---|---|
| 流程完整度 | 8 | 据点→结算→回据点全链路可玩、数据驱动、可复现种子；商店/合成只是占位 |
| 探索玩法 | 7 | 视线/掩体/先手/被偷袭/警戒/隐藏路/必战都有；巡逻只走固定路线，不会追击；只有 4 个房间模板 |
| 探索画面（P5T 味道） | 6.5 | 红黑格子 + Q 版小人 + 剪报 HUD 方向对；小人是生成的单帧图（不走路动画只有跳步），格子是程序画的 |
| 据点/菜单/结算 UI | 7.5 | P5 语言（斜切黑红块、剪报字、星标、预告信）到位；菜单还不是原作的立体旋转菜单 |
| BOSS | 7 | 登场/两阶段/换弱点/双动都在；阶段演出是 DOM 简版，不是 recipe |
| 战斗 | 7.5 | 沿用 M3（不变） |
| 手机横屏 | 7.5 | 667/844 全部画面可读、按钮 ≥88 设计像素；探索棋盘在 667×375 上偏小 |
| **综合** | **7.3** | |

## 5. 缺口 / 下一步（按优先级）

1. **探索演出走宿主代码，没走 recipe/Director**：explore:* / boss:* / callingcard:send / card:pick 目前由 `flow/exploreView.ts` 与 DOM CSS 直接播（时长按契约上限）。下一步：把它们写成 `recipes/explore.*.json` 交给 Director（需要格子层原语：tileFlash、unitHop、coneShow）。
2. **全灭失败没做**：敌方伤害保底 1 HP（沿用 M3），run:fail / 撤退（B11/B19）未接；BOSS 平衡没跑 sim:balance。
3. 巡逻不追击、不会在窄路堵人（§19 ④ 只靠路线设计近似）；房间模板只有 gate×2、vault×1、risk×1（GDD 要每类约 20 张）；BOSS 关没有专用格子房间。
4. 首次进潜入的转场中点要 1.5–4s（Pixi Graphics 首次构建 + 纹理上传，软件 GL 下）；应在据点空闲时预构建/预热（AUDIO-MAP P1 同理）。
5. Q 版素材是 generate_image 伪官方（manifest 标 generated）：Joker / Skull·Mona·Panther / 守卫 / 精英；其他 5 名同伴没有 Q 版（队伍换人后探索里会用 Joker 图兜底）。官方 P5T 素材未入库（待用户决定，见 PENDING-QUESTIONS）。
6. 商店四类 / 合成·献祭·电椅 只有入口占位；心之卡套装只做了数值，套装触发演出（buff:grant recipe）未做；成就、图鉴、换人 SWITCH 以外的 v1 必补项未动。
7. AI 文字桥未接（委托故事/预告信/交涉用内置文案）；命名黑名单检查未做成代码。
8. 字体子集里没有的字已改写文案（如「偷袭」→「奇袭」、「欲望」→「心」）；真机 body 字体走系统字体栈不受影响，但标题字体仍需补字（建议换完整 R5 Title SC 或扩充子集）。
9. 预告信「先完成 2 局才能发」（D3）这一步简化成随时可发。

## 6. 产出与复现

| 路径（m4/ 下） | 内容 |
|---|---|
| `src/game/explore.ts` | 探索规则（格子、寻路、巡逻、视线锥、掩体、遭遇判定、宝箱、隐藏路、守门开门），零 DOM |
| `src/game/run.ts` | 一局状态（种子拼图、分路、警戒度、心之卡、奖励入账/升级、评级）+ 据点存档 |
| `src/game/battle.ts` | M3 规则层 + 遭遇表/精英/BOSS 阶段/心之卡修正/HP 继承/数据驱动奖励 |
| `src/game/data/*.json` | rooms / enemies / requests / economy |
| `src/flow/flow.ts`、`src/flow/exploreView.ts` | 流程宿主（DOM 画面）与 Q 版格子画面（Pixi） |
| `src/main.ts` | M3 宿主改为可按遭遇开战（`runBattle`），`?battle=1` = M3 单场模式（check/enemies/shots 用） |
| `src/umbra/skins/p5r-red/` | labels 新增 flow.* / req.* / card.*；ui.css 新增流程样式；assets 新增 14 张（manifest 逐张 source） |
| `/workspace/work/p5r-red-m4-demo.zip` | demo 包（dist + serve.py + 打开方法.txt，5.2 MB）|
| `tools/flow.mjs` | 流程自动化（`fast=1` 跳过战斗只截画面）；`tools/run4.sh`（8767 服务 + 重活锁）；`tools/prep_m4.py`；`tools/sync_repo.sh` |

```
cd /workspace/work/umbra-next/m4
python3 tools/prep_m4.py && npm run prep && flock /tmp/p5r-heavy.lock npm run build
TMO=300 tools/run4.sh tools/flow.mjs 844 390 dpr=2        # 真战斗完整流程
TMO=300 tools/run4.sh tools/flow.mjs 667 375 fast=1       # 各尺寸流程截图
TMO=200 tools/run4.sh tools/check.mjs ; TMO=400 tools/run4.sh tools/enemies.mjs 1280 720
python3 serve.py 8767   # http://127.0.0.1:8767/ （据点开始）；?battle=1&demo=1 = M3 战斗自动演示
```
