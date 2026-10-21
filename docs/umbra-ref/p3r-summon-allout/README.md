# P3R 参考：召唤 + 总攻收尾（用户提供视频，23s，2026-10-22）
原视频：用户上传，抖音转载（P3R 官方画面剪辑）。本地帧：/workspace/work/vidref/p3r/（4fps）。

## A. 召唤（使用 Persona 技能时触发）
1. 角色举召唤器抵太阳穴（P3R 开场段有沙发蓝光版本）。
2. 横贯画面的「眼部横条」特写：角色双眼大特写，蓝青色水泡/光粒，右侧巨大剪影拟声字「咔」（扳机声），角色全身小像叠在横条中央，脚下蓝白冰晶/玻璃爆裂。左上蓝色名牌条显示角色名。
3. 扣扳机前一帧切「玻璃碎裂」：画面炸成大片蓝白玻璃碎片，人格面具从碎片中显形（契约已拍板：无召唤特写镜头，直接碎裂）。
4. 每个角色各一套，同一结构，换眼部特写与配色（女主红/粉发）。

## B. 总攻收尾（All-Out Attack 结束）
1. 蓝色棋盘格地面 3D 姿势镜头：发起者摆收尾 pose（女主拉弓等）。
2. 角色专属定格画：大色块底（粉/青/红/黄/灰，按角色）+ 同心圆弧，半身立绘，白色粗体英文台词（DONE AND DUSTED. / KNEEL BEFORE ME. / ON TO THE NEXT BOUT. / TARGET NEUTRALIZED. / DON'T WASTE YOUR BREATH. / THERE YOU HAVE IT），背景描边大字「MASS DESTRUCTION」。
3. 粉色皮(p3r-pink) 女主用粉/洋红色块。

## 落地
- p3r-pink 与 p3-blue 皮肤：recipe skill.* 前置「召唤」段（evoker → eyeStrip+拟声字 → glassShatter → persona 显形），allout.finish 按角色 id 选色块+台词。
- 需要原语：eyeStrip、onomatopoeia、glassShatter、checkerFloor、ringSplash（M3 第二阶段实现 P3/P4 原语时一并做）。
