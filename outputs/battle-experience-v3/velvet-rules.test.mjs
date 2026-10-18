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

test('双体合成会生成新 Persona，并继承技能', () => {
  const result = fuse('observer', 'rebel', { inherit: ['starfall', 'thrust'] });
  assert.equal(result.ok, true);
  assert.equal(result.persona.level, 6);
  assert.equal(result.persona.arcana, 'star');
  assert.deepEqual(result.persona.skills, ['starfall', 'thrust']);
  assert.equal(result.cost, 3000);
});

test('不能合成同一个 Persona', () => {
  assert.equal(fuse('observer', 'observer').ok, false);
});

test('图鉴登记与取出会扣钱', () => {
  const compendium = createCompendium();
  const fused = fuse('lamplighter', 'echo').persona;
  register(compendium, fused);
  const wallet = { money: 5000 };
  const result = withdraw(compendium, fused.id, wallet);
  assert.equal(result.ok, true);
  assert.equal(wallet.money, 5000 - fused.level * 300);
});

test('献祭会让本体升级并消耗祭品', () => {
  const result = sacrifice(PERSONAS.observer, PERSONAS.rebel);
  assert.equal(result.ok, true);
  assert.equal(result.persona.level, 6);
  assert.equal(result.consumed, 'rebel');
});

test('电椅会把 Persona 变成属性碎片', () => {
  const result = itemize(PERSONAS.echo);
  assert.equal(result.ok, true);
  assert.equal(result.itemId, 'emberShard');
  assert.equal(result.qty, 1);
});

test('禁闭训练会提升指定属性', () => {
  const result = lockdown(PERSONAS.observer, 'attack');
  assert.equal(result.ok, true);
  assert.equal(result.persona.stats.attack, PERSONAS.observer.stats.attack + 2);
});
