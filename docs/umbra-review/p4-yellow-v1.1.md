# 主题皮肤任务书 v1.1 · 评审 · p4-yellow

上一轮 6 条问题、4 条修改建议全部采纳，核对无误：指令区 476×476 放得下（5 项竖排 96+4×86=440；双列 5 行 430）；667×375 下 86→44.8pt；env/env:change、交涉模板、字体 120KB、7 尺寸 56 张、swayZone、finishCard 闪现、unit:down 降级都已写进。工作量同意主策划拍板（黄 4、蓝 4、粉 4.5–5 天）。

━━ 一、做不到 / 有冲突 ━━
1. 菜单入场做不出原作味道：删掉 handlers 后，ui:open/close 只能靠 ui.css，而 ui.css 只准 transform/opacity。P3R 的斜切擦入、P4 的方块逐格展开都依赖 clip-path 动画，只用位移和透明度会变成普通淡入。建议：ui.css 允许 clip-path 动画，限 ui:open/close、≤280ms、单个面板；或者给 HUD 插槽加一个可选的声明式入场 recipe（复用 maskWipe/blockPush/slashPanels）。
2. 交涉模板没有 svg、也没说静态 clip-path/mask 能不能用：P3R/P4 的斜切对话框、粉色丝带边框只能靠 CSS 形状。请明确静态 clip-path、mask-image（引用 manifest 素材）允许使用。

━━ 二、想改 ━━
1. labels 必填清单加 `label.darkHour`（§2.4 示例已用到，P3/P3R 必需）和 `label.more`（「5 项 + 更多」的按钮文字）。
2. Env.weather 枚举建议加 'storm'（P4 雷雨夜是剧情招牌，换底和 dateFlip 都要区分），没有就落 'rain'。
3. 交涉模板的 `choices` 子模板若选项数 > 4，命中区 86 × 5 项在 667×375 下会顶出安全框；建议规则层把选项上限写成 4，或模板允许滚动容器。

━━ 三、本皮单独 ━━
p4-yellow：无新增阻塞；§2.3 合流示例可直接作为黄的 transition.encounterBattle 起点。

━━ 四、工作量 ━━
维持 黄 4 天、蓝 4 天、粉 4.5–5 天。若第一节两条不放开，菜单入场改走画布 HUD，三皮各加约 0.5 天。
