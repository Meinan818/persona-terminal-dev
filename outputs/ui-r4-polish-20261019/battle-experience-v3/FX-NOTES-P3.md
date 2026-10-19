# P3R 战斗行动特效（2026-10-19）
源：p3v2/css/55-fx.css（新增）、p3v2/js/reload-p3.js（"战斗行动特效"一节）、css/01-shell.css（r3-lite 降级规则排除 .r3x）。
信号：捕获期被动 click（execute/switch-mask/battle-item）读 aria-pressed 行动 + <small> 属性；body 下 .battle-impact[data-impact]；.damage-number 文本；.sh-aff.is-*；.enemy-unit.is-down 新增；.battle-log 含 "1 MORE"。
不存在的信号：MISS（规则无闪避，仅预留日志匹配）；TECHNICAL（与暴击同 kind=critical）；敌方攻击的属性（不分属性）；Hold Up/总攻击沿用基底 .p3-aoa / body.p3-hold-up。
测试脚本：work/fxshot.py（冻结时钟抓中间帧，仅测试用）。
