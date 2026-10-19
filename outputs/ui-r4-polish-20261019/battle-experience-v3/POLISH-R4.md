# 第四轮：质感/手感打磨（用户在真机上验收 P3R 蓝后的反馈）

用户截图：/workspace/projects/92736949-7e2b-4b54-8868-d2abccfd39b6/files/uploads/image-*.webp
- image-b3af95328b12 据点页：蓝色"水"背景 + 倒悬小人
- image-cff06d36dabf：站立的小人（几何剪影角色）
- image-2f5c24e43761："别急着给它名字。" 蓝字白底，字体重影/描边糊
- image-ff5d45f4d2c2：爬塔 3D 地图，移动时格子被遮住（未探索格子被暗层/平面盖住）
- image-440e9ad2ac8e：DAWN 结算页 "01" 大字压住"时间结束"字，月亮方块被裁成矩形、"01F"卡片叠在月亮上
- image-d3f30c4a4a30 / image-f72d8a579cf9：战斗按键菱形，hover/选中时按钮放大位移太大（GUARD 变大粉圆），底部"物理·18"被执行条遮住

## 用户反馈（原话要点）
1. 水的背景不美观、而且卡顿不流畅
2. 所有这种几何小人都换回塔罗牌（不好看）
3. 很多地方字体重影严重
4. 爬塔界面移动时有遮住的 bug
5. 很多明显的文字遮挡
6. 鼠标移到按钮上位移太大，不丝滑
7. 重叠错误严重、太多类似的东西显得廉价，没有高级感
8. 整体手感怪：有些地方没动画，有些地方动画生硬
9. 其他主题有类似问题一并修复

## 统一打磨标准（四套都适用）
- **高级感 = 克制**：每屏只保留 1 个主视觉 + 1 个次要装饰。删掉重复/堆叠的装饰层（重复描边字、重复水印巨字、多层光圈、相互压住的贴片）。宁少勿多。
- **文字零重影**：正文/中文禁止多层 text-shadow、伪元素复制文字、-webkit-text-stroke 叠阴影、模糊错位色。标题最多 1 层硬阴影（无模糊、偏移≤3px）。去掉 filter:blur/drop-shadow 作用于含文字的容器。中文小字不倾斜过度（skew ≤ 8°），不用 font-synthesis 伪粗体。
- **零遮挡**：任何状态文字、按钮说明、费用、数值不得被装饰/其他面板盖住；装饰层 z-index 低于内容；逐页检查 1440/390/320，用脚本检测"文字元素中心点 elementFromPoint 不是自身/子孙"的情况并修掉。
- **Hover/按下**：位移 ≤ 3px、缩放 ≤ 1.04，只动 transform/opacity，transition 160–220ms cubic-bezier(.2,.8,.2,1)；不改 width/height/padding/font-size；选中态用颜色/描边/光晕表达，不用大幅放大。按下 scale .97 80ms。
- **动画一致**：统一时长档 120/200/320/480ms 与同一缓动；页面切入统一淡入+短位移（≤16px）；列表 stagger ≤ 40ms、总时长 ≤ 400ms；去掉生硬的 linear 跳变和超过 600ms 的 UI 过渡（战斗特效除外 ≤900ms）。没有动画的常用交互（切页、打开面板、选目标、选技能）补上轻量过渡。
- **性能**：背景动画只能用 transform/opacity；禁止全屏 filter 动画、大面积 backdrop-filter 动画、SVG turbulence/feDisplacement 动画、每帧 canvas 全屏重绘。全屏背景改为静态或极慢（≥20s）的 transform 漂移；手机默认静态。
- 红线不变：只改各自皮肤源文件；不改规则/DOM/data-*/index.html；node --test 181；1440/390/320 无横向溢出；Console 无新增 error；reduced-motion 关闭动效。

## 追加（用户 12:09）："我希望高级丝滑的动效，不是生硬的"
- 动效是重点验收项：要有，而且要高级丝滑，不是删掉了事。
- 缓动：进入 cubic-bezier(.16,1,.3,1)（expo-out），退出 cubic-bezier(.7,0,.84,0) 且更短；禁止 linear、ease 默认值、弹跳过冲（除非是战斗特效）。
- 编排：元素分层入场（背景→主视觉→标题→内容→按钮），stagger 30–50ms；进入用 opacity + translate(≤16px) + 轻微 scale(.98→1) 或 clip-path 揭示；退出淡出+轻微位移，时长约为进入的 60%。
- 连续性：选中/hover 指示器用一个滑动的高亮块在选项间平移（transform 过渡），而不是每个按钮各自闪；数值变化（HP/SP/金钱）用平滑过渡；切页时共享元素（标题、角色卡）做位置衔接而不是硬切。
- 只动 transform/opacity/clip-path，加 will-change 只在动画期间；确保 60fps，无抖动、无闪烁、无布局跳动（避免动画中 reflow）。
- 手机同样丝滑，只是减少粒子与层数，不砍掉过渡本身。reduced-motion 下改为短淡入。

## 追加（用户 12:20）："转场动画不丝滑、卡卡的"
- 排查所有转场：页面切换、进塔/出塔、遭遇战开场、战斗胜利/结算、楼层切换（DAWN）、打开天鹅绒/商店、P3 电梯/哈姆子/P4 雪花/P5 转场等主题专属转场。
- 卡顿根因优先查：转场时整页重绘+大图解码、全屏 filter/blur/backdrop-filter、box-shadow 动画、动画 width/height/top/left、多层半透明大图叠加、JS 同步重建 DOM 时动画被阻塞（应先让遮罩完全覆盖，再在遮罩后重建，再揭开）。
- 做法：转场遮罩用单个合成层（transform/clip-path/opacity），will-change 只在转场期间开启；时长 380–600ms，expo-out 揭开；手机同样丝滑。
- 用 Playwright performance trace 或 requestAnimationFrame 帧间隔测量转场，报告每个转场的掉帧情况（目标：长帧 >34ms 不超过 2 个）。
