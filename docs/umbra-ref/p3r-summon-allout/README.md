# P3R 参考：召唤 + 总攻收尾（用户提供视频，23s，2026-10-22）
原视频：用户上传，抖音转载（P3R 官方画面剪辑）。本地帧：/workspace/work/vidref/p3r/（4fps）。

## 触发时机（已核实）
- 0–3s 沙发举召唤器：P3R 官方开场动画片段，不是战斗环节，不做。
- 3–12s 眼部横条 +「咔」+ 名牌：**更正**——这是打出暴击/击倒敌人时的 cut-in（用户另给的「P3R 全角色暴击合集」证实），不是召唤。召唤（扣召唤器→玻璃碎裂→人格面具显形）按契约已拍板做法另做。
- 12–20s 棋盘格地面摆 pose + 角色色块台词定格：总攻击（All-Out Attack）把敌人全部击倒时的「finishing touch」，由发起者那位角色出，替代普通胜利画面；没打完则不出。台词：主角 DONE AND DUSTED. / 由加莉 THERE YOU HAVE IT. / 顺平 THAT'S THE GAME! / 明彦 ON TO THE NEXT BOUT. / 美鹤 KNEEL BEFORE ME. / 爱丽丝 TARGET NEUTRALIZED. / 天田 DON'T LOOK DOWN ON ME. / 荒垣 DON'T WASTE YOUR BREATH. / 小丸 WOOF! WOOF! WOOF!（来源：megamitensei.fandom.com All-Out Attack、dic.pixiv.net 総攻撃チャンス）
- 20s 后：视频片尾，无关。

## 水印
视频带抖音水印，只作时序/构图参考，任何帧都不进素材。正式素材用 Atlus 官方无水印资源（官方 finisher 图集见 personacentral.com/p3r-aoa，官方推特 @p_kouhou 片段），找不到则按构图重绘。

## A. 暴击/击倒 cut-in（原标题「召唤」有误）
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
