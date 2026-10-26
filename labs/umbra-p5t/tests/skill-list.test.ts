// r10：技能列表数据/布局钉住原版帧（notes/p5t-ref-video/frames/skill_list_*.png）
import { describe, it, expect } from 'vitest';
import ui from '../src/rules/data/p5t-skill-ui.json';
import layout from '../src/ui/data/skill-list-layout.json';
import { SKILLS } from '../src/rules';

const U = ui as unknown as Record<string, { name: string; desc: string; sp: number; power: number; label: string }>;
describe('原版技能列表数据（skills.csv + 中文 word 表）', () => {
  it('吉欧 / 加尔 / 耶哈 与第一章实机帧一致', () => {
    expect(U.Zio).toMatchObject({ name: '吉欧', sp: 12, power: 45, label: '触电', desc: '对敌人造成少量伤害，附加触电。' });
    expect(U.Garu).toMatchObject({ name: '加尔', sp: 8, power: 25, label: '疾风', desc: '对敌人造成少量伤害，击飞敌人。' });
    expect(U.Eiha).toMatchObject({ name: '耶哈', sp: 12, power: 35, label: '绝望', desc: '在小范围内造成少量伤害，附加绝望。' });
  });
  it('游戏里每个 SP 技能都有原版名字和说明', () => {
    for (const s of Object.values(SKILLS)) if (!/测试/.test(s.name)) { expect(U[s.name]?.name, s.name).toBeTruthy(); expect(U[s.name]?.desc, s.name).toBeTruthy(); }
  });
  it('游戏 SP 消耗 = 原版表', () => {
    for (const s of Object.values(SKILLS)) if (U[s.name]) expect(s.sp, s.name).toBe(U[s.name].sp);
  });
});
describe('原版 RectTransform 换算（画布 1920×1080 → 帧 1280×720 ×2/3）', () => {
  const k = 1280 / 1920;
  const L = layout as unknown as Record<string, { x: number; y: number; w: number; h: number }>;
  it('红色光标落在帧 skill_list_1717_2 的红条上（±15px）', () => {
    expect(L.cursor.x * k).toBeCloseTo(210, -1.5); expect((L.cursor.x + L.cursor.w) * k).toBeCloseTo(615, -1.5);
    expect(L.cursor.y * k).toBeCloseTo(466, -1.5);
  });
  it('黑面板与说明行', () => {
    expect((L.window.x + L.window.w) * k).toBeCloseTo(685, -1.5);
    expect(L.window.y * k).toBeCloseTo(415, -1.5);
    expect(L.info.y * k).toBeCloseTo(612, -1.5);
  });
});
