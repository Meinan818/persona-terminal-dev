import test from 'node:test';
import assert from 'node:assert/strict';
import {
  P5R_COMPENDIUM_META,
  P5R_DLC_GROUPS,
  P5R_PERSONA_BY_ID,
  P5R_PERSONAS,
  P5R_RARE_PERSONA_IDS,
  P5R_SKILLS,
  P5R_SPECIAL_FUSIONS,
  compendiumSummary,
  fusionResult,
  recipesForTarget,
  resolveFusion,
  specialFusionResult,
  validateP5RCompendium,
} from './p5r-compendium.js';

const RESIST_CODES = new Set(['wk', 'rs', 'nu', 'ab', 'rp', '-']);

test('P5R 导入数据通过完整性检查并保持已核实数量', () => {
  assert.deepEqual(validateP5RCompendium(), []);
  assert.deepEqual(compendiumSummary(), {
    personas: 232,
    skills: 525,
    arcanaCombos: 273,
    specialFusions: 24,
    rarePersonas: 9,
    dlcGroups: 13,
    dlcPersonas: 25,
    confidantRequirements: 23,
  });
  assert.equal(P5R_COMPENDIUM_META.source.license, 'Apache-2.0');
  assert.equal(
    P5R_COMPENDIUM_META.source.revision,
    'd23ca126c8e9282f94cadc7036529eaa8af4eb5b',
  );
});

test('Persona 名称、等级、五项属性、抗性和技能学习等级完整', () => {
  const ids = new Set();
  const names = new Set();
  for (const persona of P5R_PERSONAS) {
    assert.equal(ids.has(persona.id), false, `duplicate id ${persona.id}`);
    assert.equal(names.has(persona.nameEn), false, `duplicate name ${persona.nameEn}`);
    ids.add(persona.id);
    names.add(persona.nameEn);
    assert.ok(Number.isInteger(persona.level));
    assert.equal(persona.sourceStats.length, 5);
    assert.equal(persona.resistances.length, 10);
    assert.ok(persona.resistances.every(code => RESIST_CODES.has(code)));
    assert.ok(persona.skills.length > 0);
    assert.equal(persona.skillNames.length, persona.skills.length);
    assert.ok(
      persona.skillNames.every((name, index) => name !== persona.skills[index]),
      `${persona.id} still has an English display skill`,
    );
    assert.ok(persona.elementLabel);
    for (const skill of persona.skills) {
      assert.ok(P5R_SKILLS[skill], `${persona.id} references missing skill ${skill}`);
      assert.equal(Number.isInteger(persona.skillLevels[skill]), true);
    }
  }
});

test('关键 P5R 数值与来源一致', () => {
  const alice = P5R_PERSONA_BY_ID.alice;
  assert.equal(alice.name, '爱丽丝');
  assert.equal(alice.level, 83);
  assert.equal(alice.arcana, 'death');
  assert.equal(alice.elementLabel, '咒怨');
  assert.deepEqual(alice.sourceStats, [45, 61, 49, 54, 47]);
  assert.deepEqual(alice.resistances, ['-', '-', '-', '-', '-', '-', 'rs', 'rs', 'wk', 'rp']);
  assert.equal(alice.skillLevels['Die For Me!'], 85);
  assert.ok(P5R_SKILLS['Die For Me!'].nameZh);
  assert.equal(P5R_SKILLS['Absorb Phys'].nameZh, '物理吸收');
  assert.equal(P5R_SKILLS['Akashic Arts'].nameZh, '虚无艺术');

  const raoul = P5R_PERSONA_BY_ID.raoul;
  assert.equal(raoul.level, 76);
  assert.equal(raoul.dlc, true);
});

test('DLC 分组覆盖全部 25 个 DLC Persona 且与标志一致', () => {
  const grouped = P5R_DLC_GROUPS.flatMap(group => group.personaIds);
  assert.equal(new Set(grouped).size, 25);
  assert.equal(grouped.length, 25);
  for (const id of grouped) {
    assert.equal(P5R_PERSONA_BY_ID[id]?.dlc, true, `${id} should be marked dlc`);
  }
  assert.deepEqual(
    P5R_PERSONAS.filter(persona => persona.dlc && !grouped.includes(persona.id)),
    [],
  );
});

test('特殊融合包含双体与多种子配方，且全部落到目录内', () => {
  assert.equal(P5R_SPECIAL_FUSIONS.length, 24);
  assert.equal(fusionResult('belial', 'nebiros')?.id, 'alice');
  assert.equal(
    specialFusionResult(['jikokuten', 'zouchouten', 'koumokuten', 'bishamonten'])?.id,
    'asura',
  );
  for (const recipe of P5R_SPECIAL_FUSIONS) {
    assert.ok(P5R_PERSONA_BY_ID[recipe.resultId], `${recipe.result} missing result`);
    assert.ok(recipe.sources.length >= 2, `${recipe.result} needs ingredients`);
    for (const id of recipe.sources) assert.ok(P5R_PERSONA_BY_ID[id], `${recipe.result} source`);
  }
  assert.ok(recipesForTarget('alice').some(recipe =>
    recipe.sources.map(source => source.id).sort().join(',') === 'belial,nebiros'));
});

test('普通融合与 rare 融合返回目录内结果', () => {
  const normal = resolveFusion('arsene', 'pixie');
  assert.equal(normal?.kind, 'normal');
  assert.equal(normal?.result.id, 'agathion');

  const rare = P5R_RARE_PERSONA_IDS[0];
  const rareResult = resolveFusion(rare, 'jack-frost');
  assert.equal(rareResult?.kind, 'rare');
  assert.ok(rareResult.result.id);
});

test('DLC 开关会影响 DLC 专属结果', () => {
  const recipe = P5R_SPECIAL_FUSIONS.find(item => item.resultId === 'izanagi-no-okami');
  assert.ok(recipe);
  assert.equal(specialFusionResult(recipe.sources, { allowDlc: false }), null);
  assert.equal(
    specialFusionResult(recipe.sources, { allowDlc: true })?.id,
    'izanagi-no-okami',
  );
});

test('全 Persona 两两融合不返回目录外对象', () => {
  for (const a of P5R_PERSONAS) {
    for (const b of P5R_PERSONAS) {
      const result = fusionResult(a.id, b.id);
      if (result) assert.ok(P5R_PERSONA_BY_ID[result.id], `${a.id} + ${b.id}`);
    }
  }
});

test('数据完整性检查覆盖重复 ID、抗性和技能关联', () => {
  assert.deepEqual(validateP5RCompendium(), []);
  assert.equal(P5R_PERSONAS.filter(persona => persona.id === 'alice').length, 1);
  assert.equal(P5R_PERSONAS.filter(persona => persona.nameEn === 'Alice').length, 1);
});
