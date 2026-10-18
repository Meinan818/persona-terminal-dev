import test from 'node:test';
import assert from 'node:assert/strict';
import { EQUIPMENT, equipItem, equipmentBonuses, equipmentRows, unequipItem } from './equipment.js';

test('装备加成按武器/防具/饰品汇总', () => {
  const bonuses = equipmentBonuses({
    weapon: 'iron-knife',
    armor: 'kevlar-vest',
    accessory: 'old-watch',
  });
  assert.deepEqual(bonuses, { attack: 5, defense: 5, hp: 8, sp: 6 });
});

test('未拥有或不存在的东西不能装备', () => {
  assert.equal(equipItem({}, [], 'iron-knife').ok, false);
  assert.equal(equipItem({}, ['iron-knife'], 'not-real').ok, false);
});

test('装备按槽位替换，卸下只影响该槽位', () => {
  const owned = ['training-blade', 'iron-knife', 'school-jacket'];
  const first = equipItem({ weapon: 'training-blade' }, owned, 'iron-knife');
  assert.equal(first.ok, true);
  assert.equal(first.equipment.weapon, 'iron-knife');
  const removed = unequipItem(first.equipment, 'weapon');
  assert.equal(removed.ok, true);
  assert.equal(removed.equipment.weapon, null);
  assert.equal(removed.equipment.armor, undefined);
});

test('装备行按固定槽位输出，商店可读价格与描述', () => {
  const rows = equipmentRows({ weapon: 'black-fang' });
  assert.deepEqual(rows.map(row => row.slot), ['weapon', 'armor', 'accessory']);
  assert.equal(rows[0].item.name, '黑牙');
  assert.equal(EQUIPMENT['black-fang'].price, 4200);
});
