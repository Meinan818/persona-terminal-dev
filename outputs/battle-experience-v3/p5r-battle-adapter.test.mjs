import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildBattleSkill,
  buildBattlePersona,
  catalogPersonaChoices,
  recruitDataForPersona,
} from './p5r-battle-adapter.js';

test('232 个 Persona 都能生成战斗单位且不丢目录数据', () => {
  const choices = catalogPersonaChoices();
  assert.equal(choices.length, 232);
  for (const choice of choices) {
    const persona = buildBattlePersona(choice.id);
    assert.ok(persona, `${choice.id} should build`);
    assert.equal(persona.id, choice.id);
    assert.equal(persona.name, choice.name);
    assert.equal(persona.level, choice.level);
    assert.ok(persona.skills.length >= 1);
    assert.equal(Object.keys(persona.resistances).length, 10);
    assert.ok(persona.maxHp > 0);
    assert.ok(persona.maxSp > 0);
  }
});

test('战斗技能保留 P5R 属性、中文名和学习等级约束', () => {
  const pixie = buildBattlePersona('pixie');
  assert.deepEqual(pixie.skills.map(skill => skill.name), ['吉欧', '迪亚']);
  assert.equal(pixie.skills[0].element, 'electric');
  assert.equal(pixie.skills[1].heal, true);
  assert.equal(pixie.resistances.electric, 'rs');
  assert.equal(pixie.skillLevels.Zio, 0);

  const arseneAtOne = buildBattlePersona('arsene', { level: 1 });
  const arseneAtFour = buildBattlePersona('arsene', { level: 4 });
  assert.equal(arseneAtOne.skills.length, 1);
  assert.ok(arseneAtFour.skills.some(skill => skill.name === '斯坤达'));
});

test('交涉收服提案引用目录内 Persona 的中文名和技能', () => {
  const recruit = recruitDataForPersona('agathion');
  assert.equal(recruit.personaId, 'agathion');
  assert.equal(recruit.name, '阿珈席翁');
  assert.ok(recruit.skillName);
  assert.match(recruit.skillDesc, /图鉴技能/);
});

test('蓄力、即死、复活等 P5 技能不会被当成普通伤害', () => {
  assert.equal(buildBattleSkill('Charge').attackUp, 2.5);
  assert.equal(buildBattleSkill('Hama').instantKill, true);
  assert.equal(buildBattleSkill('Recarm').revive, true);
});
