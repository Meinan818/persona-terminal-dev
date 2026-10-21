# pink-screens（2026-10-21 19:2x CST 起，umbra-pink-screens）粉 首页修 + 战斗/结算/天鹅绒/HOLD UP·交涉
备份：/workspace/pkcache-umbra/pink-screens-bak/（r4-pink.css reload-hamuko.css inline-skin.mjs theme-p3.css assets/*.webp）
源：build/skins/hamuko/r4-pink.css 段 B:scr-pink（只改此文件 + 粉素材）
截图：/workspace/pkcache-umbra/pink-screens/shots/pink（/tmp/sh.sh 包 qa/_scr.mjs）；瘦身扫描 qa/_pk_eff.mjs → /workspace/pkcache-umbra/pink-screens/eff/
## 进度
- [x] 0 首页头顶：menu-art-rise.webp 头顶发梢原图在第 0 行被切平 → 顶部加 24px 透明 + 按发梢轮廓补 7 行尖（640×885）
- [x] 1 战斗 初版（敌右出血/信息右上/队伍左竖/指令右 +12° 斜列 白底粉字金线）
- [x] 2 结算 初版（+12° 白斜带超大细斜体数字，WIN 竖排暗字）
- [x] 3 天鹅绒 初版（提奥右侧站立，左侧斜体文字列表，衬线 VelvetSerif）
- [x] 4 HOLD UP 包围 cut-in / 交涉 初版
- [ ] 瘦身 ≤175,000B（扫描中）
- [ ] 性能 CPU×4、预览图、12 条自审

## pink-screens2（20:2x CST 起，接崩溃代理）
备份：/workspace/pkcache-umbra/pink-screens2-bak/（r4-pink.css reload-hamuko.css inline-skin.mjs）
注意：崩溃代理的 _pk_decl 声明级扫描（d3-a/d3-b，pid 1964/1966）仍在跑且读交付件 reload-hamuko.css → 扫完前不重建交付件，开发用 SKIN_OUT_DIR+DEV 路由
- [x] 0b 【21:15 用户已通过并锁定人物图，不再改】【20:51 用户：长颈鹿脖子→"别改了，重新设计一张"；21:02 完成】从零 generate_image 4 候选（参照蓝官方 menu-art 旋正 + 旧粉图角色设定，#00FF00 底）：a 长颈无领结、b 颈偏长 → 淘汰；c 发夹读成 IXXI，修后颈仍偏长；d 比例正常（短颈、单一下颌线、颈部暗影、领口贴颈根、无手）→ 水平翻转朝左（对齐过审构图）+ 编辑修镜像发夹为 XXII + P3R 平涂粉白肤色 = d_fix 选用。→ menu-art-rise.webp（640×885，底 120px 渐隐）；menu-art.webp=去顶 24 行上下翻转（HOLD UP 斜带）。候选与对比：/workspace/pkcache-umbra/pink-screens2/new/。首页 390/1024 0 问题；qa/preview/pink-home3.jpg（蓝官方参照｜粉390｜粉1024）。
- [x] 0 （已被 0b 取代）【20:33→20:44】哈姆子双下巴：generate_image 整图编辑（原图垫 #00FF00 方图）出 3 版，c1=单一下颌线+下巴下平涂暗玫投影脖子+明确尖角白衬衫领口、领结不变；c2/c3 下巴下仍有白块轮廓（双下巴残留）弃。选 c1 → assets/hamuko/p3r/official/menu-art-rise.webp（顶 30 行保留原补发梢）；menu-art.webp（HOLD UP 斜带用）= 新 rise 去顶 24 行上下翻转同步更新。旧图备份 pink-screens2-bak/assets/；3 版及对比 /workspace/pkcache-umbra/pink-screens2/chin/。首页 390/1024 复测 0 问题，qa/preview/pink-home2.jpg。蓝 assets/p3/official/menu-art.webp 未动。
- [x] A 主审 1（20:55）：r4-pink 末尾「pink-screens2」小节：body[data-fighting=true] 深底、#content padding0 全高、masthead 绝对定位透明（brand 隐、设置=右上 44 图标）、combat-top=44px 深色渐隐条（RETURN/NAVI=44 图标，文字 opacity0 保留可读名）
- [x] B 主审 2（20:55）：phone 指令右对齐阶梯（右下拇指区）、非选中指令隐小字、选中行高自适应；敌像 1.62 倍下移避开耐性条；意图条 pointer-events:none；交涉 phone 隐队伍栏；1024 敌像 92vh 左移、指令宽=列宽小字不换行。combat/holdup/negotiation ×390/360/1024 全 0
- [ ] C 主审 3：其余屏粉首页语言复核
- [ ] D 瘦身 ≤175,000B  - [ ] E 性能  - [ ] F 3 视口 0 问题  - [ ] G 预览 *2.jpg + 12 条自审
- [~] D 瘦身（21:10）：方案=/workspace/pkcache-umbra/pink-screens2/slim.mjs（① prune-scr.json 声明级死声明，仅 B:r4-pink 之前；② 旧层只含结算/天鹅绒/HOLD UP/交涉选择器的规则整组剔；③ 剔 B:p3r3v/B:p3r3vel）。试算 226,929→165,755B。首轮像素 A/B 发现声明级联动误删（设置钮 ::before 粉底被删→青）→ 正跑 _pk_decl4.mjs mode4 联动检查（d4-a/d4-b，读 scan2 css，后台 pid 13856/13863），完成后 _pk_prune.py 重生 prune-scr.json 再 A/B（qa/_r4ab.mjs，输出 pink-screens2/ab/）。尚未接入 inline-skin.mjs（共享，需 src 锁）。
- 21:3x 整组剔除修正：SCR 正则只留 .vr-*/.velvet-room/.scene-victory/.engine-hold-up/.hold-up-actions/.negotiation-/.n-*（.result-*/.reward-* 会伤失败结算 tower-defeat，已去），保留 vr-bars/vr-moon。A/B：combat/tower-defeat/battle-defeat/loot SAME；天鹅绒 DIFF=旧卡片框/条纹雾被去掉（符合 B:scr-pink 意图，接受），顶部偏蓝→r4-pink 天鹅绒底加 30% 玫莓罩。group-only 202,612B；还需声明级 prune（d4 联动检查重跑中，pid 见 ps _pk_decl4）。
- 21:5x 声明级：d4 联动完成→prune-scr.json；伪元素规则对全部不剪（prune-scr2.json，679 对）→ 172,082B；全状态 A/B 进行中（pink-screens2/ab-a.log ab-b.log，A=devslim B=devgrp），DIFF 用 qa/_pk2bisect.mjs state vp 定位必须保留的对 → pink-screens2/keep.json（已知 [91] 设置钮透明底）。
- 22:1x 方案改为纯整组移除（声明级 prune 全弃：A/B 大量误伤——面板底、敌像、设置钮）。slim.mjs 现为：① 旧层 天鹅绒/胜利/HOLD UP/交涉 整组（:is 内全为该屏才算）② B:p3r3v/vel ③ unhit.json（4 视口 108 状态从未命中、非交互/动效/桌面/伪元素，178 条 19KB）④ p3r2-port..r4-pink 间纯战斗版式规则（非 land/map/trial）⑤ .bb-ci-ghost/band（JS 不生成）⑥ #rrggbb→#rgb。dev 226,971 → 172,819B。全状态 A/B（devslim vs dev，390/1024）后台跑：pink-screens2/ab-a.log ab-b.log。

## pink-screens3（21:50 CST 起，接 umbra-pink-screens2）
- 21:55 A/B（devslim vs dev）部分结果：390 段 masthead..velvet-chair、tower-*..loot 全 SAME/DIFF 0(噪声)，唯 **hit-fx 390 DIFF 35118**（ANALYZE/ATTACK… 指令大字丢失、队伍栏错位）。变体定位：关掉 slim ④（p3r2-port..r4-pink 战斗版式整组剔）即 SAME，unhit 无责。④ 共 80 条 10,484B；去 ④ 后 179,571B 超 175,000 → 对 ④ 做规则级二分（var/bisC.mjs，状态 hit-fx,combat,combat-enemy-turn,holdup,negotiation,fx-qte ×390/1024，持 /tmp/umbra-heavy.lock）。
- 负载 ~21（三代理），按用户：重任务一律 flock /tmp/umbra-heavy.lock，单任务、worker≤2；已杀掉旧 A/B（pid 8509/8511，日志存 ab-a/b.partial.log）。
- 22:2x 二分改用计算样式逐条检测（var/eff.mjs：候选包 @media all，逐条 not all，比全元素+伪元素 48 属性+rect；18 战斗态×390/360/1024/844x390，72 页）：④ 80 条中 32 条有效必须留；未生效 48 条再排除 pressed/selected(21,22,23,28,74) 与 tablet-p(0) → 42 条并入 unhit.json（220 条），slim.mjs 去掉 ④ 选择器整组剔。坑：C[13] 带 "/* == /B:p3r3v == */" 结束注释，按原文删会让 ② 的 p3r3v 段正则失配（多留 3.7KB）→ unhit 条目剥前导注释。devslim=174,754B（≤175,000）。旧版存 var/slim.v1.mjs、var/unhit.v1.json。下一步：全状态 A/B（持 heavy 锁）。
- 22:3x 接入：build/skins/hamuko/slim.mjs + unhit.json；inline-skin.mjs hamuko 分支在 writeFileSync 前调用（持 src 锁，原文件备份 pkcache pink-screens2/var/inline-skin.pre3.mjs）。临时输出验证 = devslim 逐字节相同（174,754B）。全状态 A/B（devslim vs dev，390/1024，heavy 锁，var/fullab.sh → ab-a.log/ab-b.log）进行中；未正式重建交付件。
- 22:5x 全状态 A/B 结果（devslim vs dev）：390 全过；1024 有 5 处真差：arsenal-tab-oath（.vr-panel-inline 武库也用，被 ① 的 .vr-* 整组剔 → 变蓝底），velvet-compendium/network/materials/preview（vr-empty 等内容块变蓝底文字不可读、右上蓝渐变露出）。→ 不接受。处理：对 ① 剔除的 165 条（21.8KB）跑计算样式逐条检测（var/effG.mjs，天鹅绒 10 态+武库 2+结算/HOLD UP/交涉/loot ×4 视口），保留有效者，再找等量字节。
- 23:1x slim.mjs 新增 keep 参数（①～⑤ 整组剔的例外，pkcache keep.json：vr-panel-inline、vr-locked/empty、vr-result×2）+ ⑦ 去注释与规则间换行（-1.4KB）。仍有天鹅绒 1024 差异：根因 ① 剔了 `.velvet-room :is(.vr-curtain,.vr-spot,.vr-slot){display:none}` 等（右上蓝窗帘露出、颜色继承变暗）。effG 命中 38 条/5.9KB，预算仅 ~1.2KB → 像素二分（var/bisG.mjs，天鹅绒 6 态+HOLD UP/交涉/结算 ×1024/390，heavy 锁）找真正影响像素的规则。
- 23:3x 结论：天鹅绒差异按交接"旧卡片框去掉"属预期，但全剔还带出右上蓝窗帘/vr-empty 文字不可读 → keep.json 定为 7 条（vr-panel-inline×2 武库用、vr-locked/empty×2、vr-result×2、velvet-room 内 curtain/spot/slot display:none），像素复核：arsenal-tab-oath SAME，天鹅绒仅剩菜单旧卡片框差异（预期）。
- 23:4x 【正式重建完成】build/skins/hamuko/{slim.mjs,unhit.json,keep.json}；inline-skin.mjs hamuko 分支 writeFileSync 前调用 slim(out, unhit, keep)。umbra-demo/reload-hamuko.css = 174,062B（≤175,000，含 r4-pink pink-screens2 小节），与 devslim 逐字节一致；theme-p3.css 重生后与原文件一致（未动蓝）。旧交付件备份 pkcache pink-screens2/var/reload-hamuko.deliv-before.css。下一步：正式件 vs dev 全状态 A/B（heavy 锁）。
- 23:5x 正式件全状态 A/B：非天鹅绒差异逐个单测复核——hit-fx/combat-low-sp/negotiation/fx-stagger/fx-showtime/room-nav/reveal-error/fx-hit/battle-flow 单测 SAME（全量跑中受并发干扰的假差）；**battle-victory/fx-result 真差**（② 剔 B:p3r3v 带走 .scene-victory 的 flow-return 透明底、result-stats/reward-progress 网格）→ slim ② 改为块内 keep 规则原位保留，keep.json +3 条（共 10 条）→ 结算 390/1024 SAME。天鹅绒仅剩菜单旧卡片框差异（预期）。
- 正式重建 v2：reload-hamuko.css 174,506B（≤175,000），= devslim 逐字节；theme-p3.css 未变。mkslim.mjs 基线改 var/dev.prev.css（未瘦身 dev，dev/ 目录今后经 mk.sh 会带瘦身）。
- 步骤2 首页：正式件 _scr 截图 home 390/1024 与 pink-home3 所用 shots/pink/home__*.jpg 像素零差异（1024 首跑一次假差，复跑 None）。targeted A/B（结算/武库/首页/战斗/HOLD UP/交涉 ×390/1024）→ var/ab14.log。
- 00:0x 步骤2 完成（targeted A/B 全 SAME/噪声；home/room-nav 1024 单跑 SAME）。步骤3 扫描进行中（正式件，10 屏×390/360/1024 → var/scan3.log，截图 shots/pink/）。
- 00:1x 容器又重启一次（~15:27 UTC），首轮扫描 5311 拒连全 ERR，服务恢复后重跑。

## pink-screens4（2026-10-21 23:35 CST 起，接 pink-screens3）
- 接手状态：瘦身已接入（build/skins/hamuko/{slim.mjs,unhit.json,keep.json}，inline-skin.mjs 调用），reload-hamuko.css 174,506B ≤175,000（余量 494B），A/B 通过。日志 /workspace/pkcache-umbra/pink-screens2/var/。
- scan3（正式件 10 屏×3 视口）遗留：combat-enemy-turn 390/360 + holdup 360 `.combat-top>p` 截断"ROUND 01 /"；velvet-special 配方 10–11px（vr-recipe-state/owned/missing）+390「离开房间」被遮挡；battle-defeat .result-stats span 11px（390/360）；scene-ghost 水印（battle-defeat/loot）clip 误报。
- 待办：1 修遗留→复扫 0 + A/B；2 CPU×4 性能 qa/_pk2perf.mjs 3 轮；3 预览 pink-{combat,holdup,result,velvet}2.jpg；4 12 条自审。
- 23:5x 步骤1 修复（r4-pink）：.combat-top>p max-width:none（原 48% 截'猫妖精'）；.vr-exit 底 margin 64px（phone 底栏 room-nav 65px 盖住滚到底的'离开房间'）；.vr-recipe small/state/sources>* 与 .scene-defeat .result-stats span 12px。scene-ghost 已是 aria-hidden=true → 扫描副本 qa/_pk4scr.mjs（tiny/clip 跳过 aria-hidden 装饰层，不改共享 _scr.mjs）。dev 174,680B。dev 6 屏×3 视口 0 问题。备份 /workspace/pkcache-umbra/pink-screens4-bak/。
- 00:0x(10-22) 败退屏自审发现 .result-layout 白底+浅色字（预存在缺陷，不可读）→ .scene-defeat .result-layout 深底 #2a0c30、.result-layout .outcome-note span #7a1c3f（原残留浅蓝）。正式重建 reload-hamuko.css 174,834B（=dev 逐字节；theme-p3.css 未变）。下一步：正式件 10 屏×3 复扫 + A/B。
