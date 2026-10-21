# UI-REF-pink.md · 粉皮 = P3R 设计语言的粉色版（2026-10-21 13:xx 重做）

> 方向（用户 13:11/13:36 定）：版式、质感、动效按 **P3R**；女主线识别（粉色、提奥多亚、女主）按 **P3P**。不参考 P5 / 其他皮的版式。
> 旧版（P3P 1:1 复刻：热粉底 + 黄标题 + 黄竖条）备份：`/workspace/pkcache-umbra/pink-p3r-bak/UI-REF-pink.md`。
> 原作帧本地副本（只作对照，不进交付）：`work/umbra/qa/compare-blue/ref/`、`work/umbra/qa/compare-blue-b/ref/`（P3R），`work/umbra/qa/compare-pink/ref/`、`compare-pink-b/ref/`（P3P 女主线）。
> **视频时间点**：下表视频 URL 已核实为对应画面的实况/官方视频，但逐帧时间点在本环境无法拉取视频画面，统一标「时间点待确认」；比对依据是同表所列的实机截图（静态帧，URL 可查）。

## 一、P3R 设计语言 → 粉色版取值
| P3R 原作要素 | 出处（实机帧） | 粉色版做法 | token / 位置 |
|---|---|---|---|
| 菜单 = 主角沉入水中、深蓝水面渐变、水下光束 | 暂停主菜单 `compare-blue/ref/pause-menu-full.jpg`（Game UI Database https://gameuidatabase.com/gameData.php?id=1884）；开发访谈「水中沉下去的心之海」https://www.famitsu.com/news/202311/29325647.html | 深莓水：`--pr-water` = P3R 水下光束图（调粉）+ 樱粉右上光 + #5c1443→#1d0515 | `tokens.pink.css` |
| 冷色 5 段亮度映射（深蓝→亮青→白） | Ultipuk 复刻解析 https://ultipuk.xyz/blog/recreation-of-persona-3-reload-ui/ | 深莓→玫莓→樱粉→珍珠白（`port.py` mapc：蓝/青色相→317–346°，中明度压暗降饱和，避开荧光粉） | `port.py` |
| 选中/悬停 = 青红互补成白 | Marielle Palatino 分析 https://www.mariellepalatino.com/p3r | 选中 = 珍珠白刀片 + 樱粉竖线 + 玫莓三角光标（粉无互补青可用 → 白 + 樱粉） | `PR:home/.main-button`、`.combat-skill` |
| 右侧斜置阶梯超粗斜体菜单 + 主角为主体 | `pause-menu-full.jpg` | 首页（立绘 -12° 出血，字压人物）「继续登塔 / 进入训练遭遇 / 契约面具」-7° 阶梯，手机自上而下逐级右移 | `PR:home` |
| 左上钱包框（细线白框） | `pause-menu-full.jpg` | 首页信息块（下一层还在 / 区段 / 进度）= 右上透明块 + 樱粉发丝分隔线 | `PR:home .mission-line` |
| 战斗：敌名暗→红斜切横条、耐性缩写 | `compare-blue-b/ref/battle-ui.jpg`（https://samurai-gamers.com/persona-3-reload/p3re-battle-system-guide/） | 敌名 #3a0b2b→#b0306c 斜切条白字 | `PR:combat .enemy-name h1` |
| 战斗：指令 = 无框白色粗斜体大字 + 圆形按键位，斜置 | 同上 | 指令去框、白粗斜体 + 深莓描边、樱粉圆形图标位，整组 -4° 且逐列下沉 3px（斜列） | `PR:combat .command-grid` |
| 战斗：右侧队伍卡（斜条 HP/SP、白斜体数字） | 同上 | 队伍卡深色斜切 + 樱粉标签；HP 樱粉 / SP 金细斜条（skewX -24°） | `.party-rail` `.player-hud` |
| HOLD UP：右下大斜带 + 半透明巨字 CHANCE + ALL-OUT ATTACK / GO! / CANCEL | `compare-blue-b/ref/yt-aoa-chance.jpg`（视频 https://www.youtube.com/watch?v=Z4VcLrPs1Y8 ，时间点待确认） | 深莓→玫粉斜带 + 半透明 CHANCE 字；总攻击 = 白刀片主钮 | `PR:holdup` |
| 结算：深色面板、白斜体大数字、细线、红 `>` | `compare-blue-b/ref/results-reddit.jpg`（https://www.reddit.com/r/persona3reload/comments/1icd22f/） | 深莓水底 + 斜置描边大字 RESULT + 逐行数值（发丝线 + 樱粉 `>`）+ 女主小幅斜裁渐隐 | `PR:results` |
| 天鹅绒：上升电梯厢、衬线标题 + 白色长下划线、玻璃反光、侍者立在厢内 | `compare-blue/ref/velvet-elizabeth.jpg`、`velvet-fusion-method.jpg`（RPG Site 官方 4K 截图 https://www.rpgsite.net/news/15253 ；视频 https://www.youtube.com/watch?v=Js7eeQhtDBY 时间点待确认） | 电梯厢（类官方 [G] 图调粉）+ 斜向玻璃反光 + 衬线标题 + 白发丝下划线 + 细线菜单；提奥多亚（P3P 女主线侍者）站厢内右侧，渐隐入暗部，不做卡片 | `PR:velvet` |

## 二、P3P 女主线识别（只作身份点缀）
| 要素 | 出处 | 用法 |
|---|---|---|
| 粉色主色 | P3P 女主线 COMMAND 画面 `compare-pink/ref/`（旧 UI-REF K1） | 只作色相来源：深莓 / 玫莓 / 樱粉，不再用热粉大色块与黄标题 |
| 提奥多亚 | P3P 天鹅绒（旧 K8） | 天鹅绒侍者位（官方立绘去描边、制服调莓紫以融入粉色厢体） |
| 女主（P3R 画风立绘） | official/hero-portrait、result-portrait、allout-hero | 首页菜单主体（P3R 暂停菜单式斜置出血）、结算立绘位（小幅渐隐）；HOLD UP 不放（P3R CHANCE 画面无主角立绘） |

## 三、逐界面状态
| 界面 | 原作帧 | 状态 |
|---|---|---|
| home | pause-menu-full.jpg | 近似：A/B 选 B——女主立绘 -12° 斜置出血为主体（调粉 + 轮廓光）、-12° 阶梯大字压在人物前、深水 + 官方月 / 塔纹理景深 |
| combat | battle-ui.jpg | 近似：指令斜列 / 敌名条 / 队伍卡配色与形 1:1；队伍栏位置由骨架定在顶部（手机），平板右对齐斜置 |
| holdup | yt-aoa-chance.jpg | 近似：斜带 + CHANCE + 主钮 1:1；平板横屏面板受骨架容器限制在右栏（fixed 被祖先 transform 截住），未做到整屏包围 → pink-requests |
| battle-victory / tower-clear / tower-recap / slice-settle | results-reddit.jpg | 近似：RESULT 斜置大字、逐行数值、细线、`>`；原作无「塔层回看 / AI LAB 结算」→ 同语言补齐（原创补充） |
| velvet-* | velvet-elizabeth.jpg / velvet-fusion-method.jpg | 近似：电梯厢 / 衬线标题 / 细线菜单 1:1 语言；原作服务为倾斜牌卡，DOM 为按钮网格 → 细线列表 |
| map | tartarus-floor1.jpg | 近似：方向键托盘白底板撤掉 |
| persona | — | 面具图（.mask-art / persona-main）归 umbra-mask-art，本轮未动 |
