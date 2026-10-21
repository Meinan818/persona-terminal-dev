# 粉皮 P3R 粉色版 · REVIEW-RED-AI.md 逐条核对（2026-10-21 14:0x CST）

> 该评审只当问题清单使用；设计手法全部取自 P3R（版式/质感/动效）与 P3P（粉色、提奥多亚、女主线身份），对照依据见 `work/umbra/UI-REF-pink.md`。
> 截图证据：`/workspace/pkcache-umbra/pink-p3r/after/pink/<id>__<WxH>.jpg`（改后）、`.../before/{pink,blue}/`（改前 / 蓝皮同屏）。
> 原作 | 成品：`work/umbra/qa/compare-pink-p3r/{home,combat,holdup,battle-victory,velvet-fusion,tower-clear,map,negotiation}.jpg`。三联：`work/umbra/qa/preview/pink-p3r.jpg`。

## 一、根本问题：重排而不是换色
- [x] 首页 = P3R 暂停菜单构图：A/B 后选 B（14:07 更正）：P3R 式立绘为构图主体，-12° 斜置、被画框裁切出血、统一粉调 + 樱粉轮廓光、460ms 斜切滑入；-12° 阶梯超粗斜体大字（继续登塔 → 进入训练遭遇 → 契约面具），右上细线信息块。证据 `after/pink/home__390x844.jpg`、`home__1024x768.jpg`；对照 `compare-pink-p3r/home.jpg`。
- [x] 战斗：指令去框、白粗斜体 + 樱粉圆形按键位，整组斜置逐列下沉（斜列）；敌名暗莓→玫红斜切条；队伍卡深色斜切 + HP/SP 斜细条。证据 `combat__390x844.jpg`、`combat__1024x768.jpg`。
- [~] 队伍 HP「右侧竖排」：队伍栏 DOM 在顶栏（骨架网格），皮肤在平板横屏右对齐 + 斜置；**未做成竖排**（需骨架移动 party-rail 位置，未写骨架）。Theurgy 条：DOM 无对应数据，**未做**（不伪造数据）。
- [x] 天鹅绒 = P3R 电梯厢 + 衬线标题 + 白发丝下划线 + 细线菜单；提奥多亚站在厢内右侧渐隐（P3P 侍者），不做卡片。证据 `velvet-fusion__390x844.jpg`、`__1024x768.jpg`。
- [x] 结算（battle-victory / tower-clear / tower-recap / slice-settle）= 深莓水底 + 斜置描边大字 RESULT + 逐行数值（发丝线 + 樱粉 `>`）+ 女主小幅斜裁渐隐（只在胜利结算）。证据对应 `after/pink/*`。

## 二、硬伤
1. [x] 敌人：官方 Shadow 图（enemy-1..3：爬行影 / 面具骑士 / 骷髅巨手），内联黑圆脸 svg 透明化；名牌改下浓上透，露出面具。敌名不截断（trunc 扫描 0）。
2. [x] 队伍条 / 技能说明截断：截断扫描 `trunc.mjs`（12 状态 × 360/390/1024）= 0（`logs/trunc3.log`）。手机指令副字（SP·属性）收起，信息在技能说明栏完整显示。
3. [x] 地图方向键白底板：`.map-pad/.map-actions/.map-side-foot` 底板撤掉。证据 `map__390x844.jpg`。
4. —（蓝天鹅绒，非本皮）
5. [x] 粉天鹅绒「FUS…」「GAL…」：服务按钮英文副字收起、中文不截断（trunc 0）。证据 `velvet-fusion__390x844.jpg`、`velvet-gallows__*`。
6. [~] 平板横屏战斗右侧空缺：命令详情深色底板撤为透明（露出水面），空块感消失；HOLD UP 斜带 + CHANCE + 女主切入在 1024×768 实现，但面板仍被骨架容器限制在右栏，**未做到整屏包围** → `status/pink-requests.md` 已写骨架请求。
7. [x] 首页自绘脸 / 自绘剪影：撤下（hero-silhouette / velvet-host / sil-hero / face-cutin / vr-corner / water-caustic / velvet-elevator.svg → 透明），人物只用官方立绘（去描边版）。

## 三、官方素材
- [x] 人物：官方立绘去 3–4px 外缘描边（贴纸感根源）+ 残留青光边调樱粉；提奥多亚制服调莓紫融入粉厢。
- [x] 质感：P3R 官方 UI 纹理（skowt.cc 提取：TartarusMapBG 月、VelvetRoom 转场纹样）调粉；P3R 水下光束图调粉做深水 / 浅水底。来源表 `assets/hamuko/ASSETS.md`「P3R 粉色版」节。
- [x] 不再引用 persona-main（Persona 图由 persona-art.js / J21 接线）。

## 四、流程 / 硬指标
- [x] 参考表：`UI-REF-pink.md`（每屏对应 P3R 实机帧 + URL）。**视频逐帧时间点待确认**（本环境拉不到视频画面，表内已注明）。
- [x] 原作 | 成品：8 张（见上）。
- [x] 截断 0（`logs/trunc3.log`）；遮挡：360/390/1024 全部 cov=0，除 holdup 360/390（cov=2）、negotiation 1024（cov=3）——HOLD UP/交涉叠底盖住面具切换钮，改前同样存在（骨架 v1.11 叠底设计，该阶段不用换面具）。触控：small=0（无 <44px 可点元素）。
- [x] 蓝/青残留：blue-scan 10 状态 @390 = 0。
- [x] 动效：只 transform/opacity（keyframes 检查 PASS）；演出 = 蓝皮 P3R 演出移植（reload-hamuko.js 注册 'hamuko'）。
- [x] 卡顿（perf-check 390×844、CPU×4 节流，同机连测）：selectCommand 长任务 **153ms**（蓝皮 125ms；改前粉皮 r4 记录 105ms）、execute 合计 376ms（蓝 351；改前 302）、启动 307ms（蓝 310；改前 587）。点指令→反馈 ≤250ms 在 CPU×4 下达标；长任务主要来自 app.js 渲染（非皮肤 CSS）。皮肤 CSS 228KB（gzip 31KB ≤40 PASS；raw >180KB FAIL，根选择器长，见 HANDOFF）。
- [x] 首屏图 ≤300KB：首页 ≈210KB（调色立绘 92 + 塔纹理 57 + 月 43 + 水面 12）、战斗 ≈190KB、天鹅绒 ≈286KB；立绘/纹理全是 CSS 背景，进对应界面才请求。

## A/B（图位分寸）
- 首页：`qa/ab/pink-home-A-noportrait-{390x844,1024x768}.jpg` vs `qa/ab/pink-home-B-portrait-*.jpg` → **选 B**（P3R 暂停菜单本来就以主角为主体；B 斜置出血 + 字压人物，A 只剩纹理、认不出 P3R）。
- HOLD UP：撤掉切入立绘（P3R CHANCE 画面无主角立绘）。结算：保留小幅渐隐立绘（原作结算有角色位）。天鹅绒：提奥多亚保留（侍者位）。指令 / 列表 / HUD：无图。

## UI-LEAD-REVIEW 12 条逐屏自评（✓ 过 / △ 部分 / ✗ 未过）
| 屏 | 1 主体出血斜置 | 2 角度统一 | 3 ≥4 层 | 4 留白 | 5 立绘调色 | 6 主色≤2 | 7 素材干净 | 8 大字图形 | 9 选中跳 | 10 零截断遮挡 | 11 拇指区/反馈 | 12 动效 |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| home | ✓ 女主 -12° 出血 | ✓ 大字/立绘 -12°；刀片切角为同向小斜 | ✓ 水底→月/塔纹理→立绘→菜单→细线/光 | ✓ 信息挤左上，右侧给人物 | ✓ 双色调 35% + 轮廓光 | ✓ 深莓/樱粉 + 白 | ✓ 去描边 webp | ✓ | ✓ 白刀片 + 三角光标 | ✓ | ✓ 主钮在中下部 | ✓ 斜切滑入，低动效关 |
| combat | △ 主体=敌人，官方 Shadow 图小（骨架定高敌区） | ✓ 指令字 -12° | ✓ | △ 信息密（骨架一屏布局） | — 无立绘 | ✓ | ✓ | ✓ 指令粗斜体 | ✓ 圆盘反白 + 技能白刀片 | ✓ | ✓ 执行贴底；点指令长任务 153ms（CPU×4） | ✓ P3R 演出移植 |
| holdup | ✓ CHANCE 巨字 + 斜带 | ✓ | ✓ | ✓ | — | ✓ | ✓ | ✓ | ✓ 总攻击白刀片 | △ 叠底盖面具钮（骨架，改前同） | ✓ 底部 | ✓ |
| battle-victory | ✓ RESULT 大字 + 小幅斜裁立绘 | ✓ -12° | ✓ | ✓ | ✓ 去描边 + 渐隐 | ✓ | ✓ | ✓ | ✓ 主钮玫粉刀片 | ✓ | ✓ | ✓ 入场沿用 |
| tower-clear / recap / slice-settle | ✓ 楼层大数字 / RESULT 语言 | ✓ | ✓ | ✓ | — | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| velvet | ✓ 提奥多亚站厢内右侧出血 | △ 衬线标题水平（原作即水平） | ✓ 电梯厢→玻璃反光→侍者→菜单→细线 | ✓ | ✓ 制服调莓紫、去描边 | ✓ | ✓ | △ 衬线标题非粗斜体（原作天鹅绒即衬线） | ✓ 白刀片 | ✓ | ✓ | ✓ |
| map | △ 主体=地图格（骨架） | ✓ 轻倾斜 | ✓ | △ | — | ✓ | ✓ | ✓ | ✓ 当前格呼吸 | ✓ 白底板已撤 | ✓ 方向键右下 | ✓ |
| negotiation | △ 无立绘位放图（列表为主） | ✓ | ✓ | △ 选项密 | — | ✓ 立场色统一莓粉系 | ✓ | ✓ | ✓ | △ 1024 叠底盖面具钮（骨架，改前同） | ✓ | ✓ |
未全过项均为骨架布局 / 原作本身如此，已在 pink-requests 与上文标注；「截掉 logo 能否认出 P3R」：首页、HOLD UP、结算、天鹅绒能（深水 + 斜置大字 + CHANCE / RESULT + 电梯厢）；战斗靠指令斜字与敌名条，次之。
