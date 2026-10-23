// P5T 数据表导入（tools/import-p5t-data.mjs → src/rules/data/*.json，src/rules/p5tData.ts）
import { describe, expect, it } from 'vitest';
import { SKILLS, UNIQUES } from '../src/rules';
import { P5T_PERSONAS, P5T_SKILLS, P5T_UNMATCHED, areaRadius, p5tPersona, p5tSkill } from '../src/rules/p5tData';
import type { SkillDef } from '../src/rules';

describe('P5T 数据表', () => {
  it('子集字段齐全（技能 291 / 人格 219）', () => {
    expect(P5T_SKILLS.length).toBe(291);
    expect(P5T_PERSONAS.length).toBe(219);
    expect(p5tSkill('Agi')).toMatchObject({ id: 40101, element: 'fir', range: 4, area: '3x3', sp: 14, power: 45, passive: false, names: { ja: 'アギ', 'zh-CN': '亚基' } });
    expect(p5tSkill('Phantom Judge')).toMatchObject({ sp: null, gauge: true });
    expect(p5tPersona('Agathion')).toMatchObject({ lvl: 5, innate: 'Iron Body', stats: { HP: 36, SP: 12, Melee: 8, Gun: 12 }, growth: { HP: 1.37 } });
  });
  it('范围换算：1x1→0、3x3→1、3x5→2、3x7→2、5x11→4', () => {
    expect([areaRadius('1x1'), areaRadius('3x3'), areaRadius('3x5'), areaRadius('3x7'), areaRadius('5x11')]).toEqual([0, 1, 2, 2, 4]);
  });
  it('匹配上的普通技能：sp / power / range / 形状都取表', () => {
    for (const s of Object.values(SKILLS) as SkillDef[]) {
      const t = p5tSkill(s.name);
      if (!t) continue;
      expect(s.sp, s.name).toBe(t.sp);
      expect(s.power, s.name).toBe(t.power);
      if (s.shape !== 'self') expect(s.range, s.name).toBe(Math.min(t.range!, 99));
      if (s.kind === 'attack') expect(s.radius ?? 0, s.name).toBe(areaRadius(t.area));
    }
    expect(SKILLS.zio).toMatchObject({ range: 3, sp: 12, power: 45, shape: 'single' });
    expect(SKILLS.zionga).toMatchObject({ range: 4, sp: 28, power: 90, shape: 'single' });
    expect(SKILLS.megido).toMatchObject({ range: 4, radius: 2, shape: 'area' });
    expect(SKILLS.dia).toMatchObject({ range: 6, sp: 10, power: 65 });
    expect(SKILLS.media).toMatchObject({ shape: 'self', allAllies: true, sp: 34 });
  });
  it('Unique：只换 power，仍耗 Voltage（sp 0）', () => {
    for (const s of Object.values(UNIQUES) as SkillDef[]) {
      expect(s.sp).toBe(0);
      expect(s.voltage).toBe(true);
      expect(s.power).toBe(p5tSkill(s.name)!.power);
    }
  });
  it('未匹配的只有测试用 Dormina', () => {
    expect(P5T_UNMATCHED).toEqual(['Dormina(测试用)']);
    expect(SKILLS.dormina.range).toBe(5);
  });
});
