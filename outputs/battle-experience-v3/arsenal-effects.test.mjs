import test from 'node:test';
import assert from 'node:assert/strict';
import { arsenalEffects, relicList } from './arsenal-effects.js';

test('遗物与共鸣链会汇总成真实战斗和经济加成', () => {
  const effects = arsenalEffects({ relics: ['moon', 'thread'], chain: 1 });
  assert.equal(effects.sp, 8);
  assert.equal(effects.skillBonus, 0.06);
  assert.equal(effects.money, 0.15);
  assert.equal(effects.drop, 0.05);
  assert.equal(effects.crit, 0.06);
});

test('已分解的遗物不再出现在武库列表', () => {
  const relics = relicList({ relics: ['moon'], relicDisposed: ['thread'] });
  assert.deepEqual(relics.map(relic => relic.id), ['moon']);
  assert.equal(relics[0].equipped, true);
});
