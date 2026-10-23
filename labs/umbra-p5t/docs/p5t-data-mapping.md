# P5T 数据表 ↔ data.ts 技能映射（tools/import-p5t-data.mjs 生成，勿手改）

来源：umbra-assets/p5t/data/skills.json（291 技能）、personas.json（219 人格）。许可：私用参考，见 umbra-assets/p5t/data/README-data.md。

套用规则（src/rules/p5tData.ts `applyP5t`）：按英文名匹配；伤害公式不变（公开数据没有公式），只换输入。
- 普通技能：sp = 表 cost；power = 表 power；range = 表 range（≥99 记 99；shape=self 的全体技能如 Media 保持 self）。
- 范围（PH 换算）：攻击技能表 area `1x1` → 单体；`WxH` → 以目标为中心的曼哈顿半径 round((W+H−2)/4)（3x3→1、3x5→2、3x7→2、5x9→3、5x11→4、7x13→5）。回复/辅助技能保持原形状。
- Unique（表 cost 1100 = 特殊槽）：只套 power；sp 仍 0（耗 Voltage），射程/形状不换（表的 99 格/3x7 等是 P5T 的放置范围，和引擎 line/self 形状语义不同）。

| data.ts id | 名字 | 表 id | 元素 | 表 range | 表 area | 表 SP | 表 Power |
|---|---|---|---|---|---|---|---|
| agi | Agi | 40101 | fir | 4 | 3x3 | 14 | 45 |
| maragi | Maragi | 40111 | fir | 4 | 3x5 | 24 | 45 |
| bufu | Bufu | 40201 | ice | 5 | 3x3 | 14 | 35 |
| zio | Zio | 40301 | ele | 3 | 1x1 | 12 | 45 |
| zionga | Zionga | 40302 | ele | 4 | 1x1 | 28 | 90 |
| garu | Garu | 40401 | win | 4 | 1x1 | 8 | 25 |
| psi | Psi | 40501 | psy | 6 | 1x1 | 12 | 25 |
| frei | Frei | 40601 | nuk | 3 | 3x5 | 14 | 25 |
| kouha | Kouha | 40701 | ble | 4 | 3x3 | 12 | 40 |
| eiha | Eiha | 40801 | cur | 4 | 3x3 | 12 | 35 |
| partisan | Partisan | 41901 | for | 4 | 1x1 | 12 | 25 |
| megido | Megido | 40901 | alm | 4 | 3x7 | 35 | 75 |
| dormina | Dormina(测试用) | **未匹配** | | | | | |
| dia | Dia | 41101 | rec | 6 | 1x1 | 10 | 65 |
| diamrita | Diamrita | 41201 | rec | 4 | 1x1 | 16 | 65 |
| media | Media | 41111 | rec | 100 | 1x1 | 34 | 65 |
| tarukaja | Tarukaja | 41601 | sup | 6 | 1x1 | 12 | 0 |
| rakukaja | Rakukaja | 41801 | sup | 6 | 1x1 | 12 | 0 |
| sukukaja | Sukukaja | 41701 | sup | 6 | 1x1 | 12 | 0 |
| phantomJudge | Phantom Judge | 81201 | phy | 6 | 3x3 | 槽 | 41 |
| brigantine | Brigantine Blitzkrieg | 80201 | ele | 99 | 3x7 | 槽 | 41 |
| femmeFatale | Femme Fatale | 80401 | sup | 0 | 1x1 | 槽 | 58 |
| windsOfTime | Winds of Time | 80301 | win | 4 | 3x3 | 槽 | 29 |
| fullThrottle | Full Throttle | 80601 | phy | 10 | 3x3 | 槽 | 30 |
| nobleLady | Noble Lady's Invitation | 80701 | psy | 5 | 5x11 | 槽 | 23 |
| pathway | Pathway to the Ball | 81101 | sup | 0 | 1x1 | 槽 | 0 |
| likeAPhantom | Like a Phantom | 80501 | sup | 6 | 3x5 | 槽 | 0 |
| flagOfFreedom | Flag of Freedom | 80901 | sup | 6 | 3x5 | 槽 | 0 |
| truthSeeker | Truth Seeker | 81001 | sup | 100 | 3x3 | 槽 | 0 |

## 未匹配（保留 data.ts 原值）
- `dormina` Dormina(测试用)
