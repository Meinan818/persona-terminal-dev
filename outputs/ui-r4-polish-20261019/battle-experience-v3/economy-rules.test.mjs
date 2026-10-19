import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buy,
  createWallet,
  equip,
  openChest,
  sell,
  statsOf,
} from './economy-rules.js';

const steady = () => 0.5;

test('买药会扣钱并进背包', () => {
  const wallet = createWallet();
  assert.equal(buy(wallet, 'clinic', 'painkiller').ok, true);
  assert.equal(wallet.money, 7700);
  assert.equal(wallet.inventory.painkiller, 3);
});

test('钱不够时买不了', () => {
  const wallet = createWallet(100);
  const result = buy(wallet, 'clinic', 'painkiller');
  assert.equal(result.ok, false);
  assert.match(result.reason, /钱不够/);
});

test('卖东西会加钱并减少数量', () => {
  const wallet = createWallet();
  assert.equal(sell(wallet, 'painkiller', 1).ok, true);
  assert.equal(wallet.money, 8120);
  assert.equal(wallet.inventory.painkiller, 1);
});

test('买装备并装备后攻击/防御会变化', () => {
  const wallet = createWallet();
  buy(wallet, 'arms', 'black-fang');
  buy(wallet, 'arms', 'kevlar-vest');
  assert.equal(equip(wallet, 'weapon', 'black-fang').ok, true);
  assert.equal(equip(wallet, 'armor', 'kevlar-vest').ok, true);
  const stats = statsOf(wallet);
  assert.equal(stats.attack, 8);
  assert.equal(stats.defense, 5);
});

test('元素封印箱必须用对应属性打开', () => {
  const wrong = createWallet();
  const failed = openChest(wrong, 'sealed', { element: 'guts', rng: steady });
  assert.equal(failed.ok, false);
  assert.equal(failed.damage, 20);
  assert.equal(wrong.heroHp, 100);

  const right = createWallet();
  const opened = openChest(right, 'sealed', { element: 'charm', rng: steady });
  assert.equal(opened.ok, true);
  assert.ok(opened.loot.length >= 1);
  assert.ok(right.money > 8000);
});

test('陷阱箱先检查可以免伤', () => {
  const blind = createWallet();
  const hit = openChest(blind, 'trapped', { rng: steady });
  assert.equal(hit.damage, 15);
  assert.equal(blind.heroHp, 105);

  const careful = createWallet();
  const safe = openChest(careful, 'trapped', { inspect: true, rng: steady });
  assert.equal(safe.damage, 0);
  assert.equal(careful.heroHp, 120);
});

test('宝箱会给钱和至少一件物品', () => {
  const wallet = createWallet();
  const result = openChest(wallet, 'wood', { rng: steady });
  assert.equal(result.ok, true);
  assert.ok(result.loot.some(entry => entry.type === 'money'));
  assert.ok(result.loot.some(entry => entry.type === 'item'));
  assert.ok(wallet.money > 8000);
});
