import test from 'node:test';
import assert from 'node:assert/strict';
import {
  PERSONAS,
  createCompendium,
  fuse,
  itemize,
  lockdown,
  register,
  sacrifice,
  withdraw,
} from './velvet-rules.js';

test('双体特殊合成会生成新 Persona，并继承技能', () => {
  const result = fuse('belial', 'nebiros', { inherit: ['Eigaon'] });
  assert.equal(result.ok, true);
  assert.equal(result.persona.id, 'alice');
  assert.equal(result.persona.level, 83);
  assert.equal(result.persona.arcana, 'death');
  assert.ok(result.persona.skills.includes('Eigaon'));
  assert.equal(result.cost, 41500);
});

test('不能合成同一个 Persona', () => {
  assert.equal(fuse('alice', 'alice').ok, false);
});

test('图鉴登记与取出会扣钱', () => {
  const compendium = createCompendium();
  const fused = fuse('belial', 'nebiros').persona;
  register(compendium, fused);
  const wallet = { money: 50000 };
  const result = withdraw(compendium, fused.id, wallet);
  assert.equal(result.ok, true);
  assert.equal(wallet.money, 50000 - fused.level * 300);
});

test('献祭会让本体升级并消耗祭品', () => {
  const result = sacrifice(PERSONAS.alice, PERSONAS.nebiros);
  assert.equal(result.ok, true);
  assert.equal(result.persona.level, 84);
  assert.equal(result.consumed, 'nebiros');
});

test('电椅会返回图鉴里的 P5R 物品', () => {
  const result = itemize(PERSONAS.raoul);
  assert.equal(result.ok, true);
  assert.equal(result.itemId, 'Picaresque Hat');
  assert.ok(result.itemLabel);
  assert.equal(result.qty, 1);
});

test('禁闭训练会提升指定属性', () => {
  const result = lockdown(PERSONAS.alice, 'attack');
  assert.equal(result.ok, true);
  assert.equal(result.persona.stats.attack, PERSONAS.alice.stats.attack + 2);
});
