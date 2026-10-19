# MASKARIA 四主题地图（第二轮）

启动：在 demo 根目录运行 `./start-demo.sh`（或 `node serve.mjs`），打开终端提示的地址；全部离线运行。

| 参数 | 主题 | 核心概念 | 文件 | 说明 |
|---|---|---|---|---|
| `?theme=p3`（默认） | P3R 蓝 | 灵魂之海 / 影时间：倾斜巨字菜单、倒悬下沉主角、绿天悬浮立体塔层、按键菱形战斗、左轮弹巢商店、上升电梯天鹅绒 | reload-p3.css / reload-p3.js | THEME-NOTES-P3.md |
| `?theme=hamuko` | P3R 粉 · 哈姆子 | 她的房间 / MP3：播放列表据点、月光塔层、唱片转盘战斗、深夜短信交涉、琴键+八音盒天鹅绒、贩卖机商店、明信片剧情页 | reload-hamuko.css / reload-hamuko.js | THEME-NOTES-HAMUKO.md |
| `?theme=p4` | P4G | 午夜电视台：Junes 电视墙据点、电视迷宫地图、访谈节目交涉、Shuffle Time 结算、电视购物商店、豪华轿车天鹅绒 | reload-p4.css / reload-p4.js / assets/p4 | THEME-NOTES-P4.md |
| `?theme=p5` | P5R | 怪盗团：Phan-Site 手机据点、殿堂蓝图+Third Eye 地图、恶魔交涉、环形指令/Hold Up/SHOW'S OVER 战斗、黑市霓虹商店、蓝色监狱天鹅绒 | reload-p5.css / reload-p5.js / assets/p5 | THEME-NOTES-P5.md |

## 红线遵守
- 只改表现层；规则、数值、存档、AI 契约、所有 data-* 钩子未改；index.html 只增加 link/script 标签与 hamuko 主题参数。
- 纯装饰 JS 只给已有节点加 class / data-ui-* / CSS 变量，插入 aria-hidden + pointer-events:none 节点，不拦截点击。
- 1440×900 / 390×844 / 320×568 无横向溢出；prefers-reduced-motion 下动画关闭；手机端自动降级。
- `node --test` 181/181 通过。

## 第三轮：专属攻击 / 命中特效（2026-10-19）
| 主题 | 普攻 | 技能/召唤 | WEAK / CRITICAL | 击倒 | 防御 / 道具 |
|---|---|---|---|---|---|
| P3R 蓝 | 两道交叉白色斜光 | Evoker 头部裂纹 + 蓝玻璃碎片 + 光环光柱；10 种属性各有形态 | 白色玻璃斜板蓝字 WEAK；蓝白爆线 CRITICAL；DOWN ▸ 1 MORE | 溶解成黑雾 + 蓝色火星 | 蓝色蜂巢六边盾 / 上升光点 |
| 哈姆子 | 唱片刮碟 + 粉色音波斩 SCRATCH♪ | 彩虹唱片爆转 + 心形镭射；属性=不同乐器 | 燕尾丝带横幅 + 1 MORE 圆贴纸 | 花瓣散开 ♡ FADE OUT | 心形泡泡盾 / 星光爆闪 |
| P4G | 信号干扰色带 + 黄色斜切斩痕 | 塔罗牌碎裂化作蓝色火焰 PERSONA!；属性各有形态 | 网点漫画 DOWN! + 1 MORE!；眼部切入条 CRITICAL | 电视关机压成白线 OFF AIR | OSD 盾牌 / 电视购物爆炸星 |
| P5R | 黑色剪影 + 红黑十字斩 + 墨溅 | 面具撕裂 + 蓝焰；13 种属性形态 | WEAK 星贴、CRITICAL 速度线、1 MORE 气泡（已修复位置） | 撕成 16 片剪报纸屑 | 红 X 黑盾 / 胶囊抛弧闪光 |

说明：规则里没有闪避，MISS 只在无效/吸收/反弹/零伤害时出现；ONE MORE（1.6s）与总攻击（4.2s）为规则层时长，只换外观。reduced-motion 下全部关闭，手机端粒子减量。
