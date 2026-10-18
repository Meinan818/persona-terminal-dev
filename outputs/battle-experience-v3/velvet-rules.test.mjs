import test from 'node:test';
import assert from 'node:assert/strict';
import {
  PERSONAS,
  createCompendium,
  fuse,
  itemize,
  lockdown,
  materialEntries,
  register,
  sacrifice,
  specialFuse,
  specialRecipes,
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

test('特殊融合按多张素材生成图鉴结果', () => {
  const result = specialFuse(['jack-o-lantern', 'jack-frost', 'king-frost']);
  assert.equal(result.ok, true);
  assert.equal(result.persona.id, 'black-frost');
  assert.equal(result.persona.name, '邪恶霜精');
  assert.deepEqual(result.sourceIds, ['jack-o-lantern', 'jack-frost', 'king-frost']);
  assert.equal(result.cost, result.persona.level * 500);
});

test('特殊融合拒绝重复或缺失素材', () => {
  assert.equal(specialFuse(['shiva', 'shiva']).ok, false);
  assert.equal(specialFuse(['shiva']).ok, false);
  assert.equal(specialFuse(['shiva', 'not-a-persona']).ok, false);
  assert.equal(specialFuse(['alice', 'nebiros']).ok, false);
});

test('特殊配方书标出素材缺口并优先排可融合项', () => {
  const recipes = specialRecipes(['jack-o-lantern', 'jack-frost', 'king-frost', 'shiva']);
  assert.equal(recipes[0].resultId, 'black-frost');
  assert.equal(recipes[0].ready, true);
  assert.equal(recipes[0].resultOwned, false);
  const ardha = recipes.find(recipe => recipe.resultId === 'ardha');
  assert.equal(ardha.ready, false);
  assert.equal(ardha.ownedCount, 1);
  assert.equal(ardha.missing, 1);
  assert.deepEqual(ardha.sources.filter(source => !source.owned).map(source => source.id), ['parvati']);
  const ownedRecipes = specialRecipes(['jack-o-lantern', 'jack-frost', 'king-frost', 'black-frost']);
  assert.equal(ownedRecipes.find(recipe => recipe.resultId === 'black-frost').resultOwned, true);
});

test('素材背包会聚合同类电椅产物并标注中文来源', () => {
  const entries = materialEntries({ Zio: 2, 'Megaton Raid Belt': 1, broken: 0 });
  assert.equal(entries.length, 2);
  const zio = entries.find(entry => entry.id === 'Zio');
  assert.equal(zio.label, '吉欧');
  assert.equal(zio.qty, 2);
  assert.equal(zio.category, 'skill-card');
  assert.ok(zio.sourceNames.includes('阿珈席翁'));
  const belt = entries.find(entry => entry.id === 'Megaton Raid Belt');
  assert.equal(belt.label, '百万吨腰带');
  assert.equal(belt.category, 'equipment');
});
