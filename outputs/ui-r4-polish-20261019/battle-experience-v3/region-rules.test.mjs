import test from 'node:test';
import assert from 'node:assert/strict';
import { REGIONS, regionForFloor, regionRangeLabel } from './region-rules.js';

test('四个区域连续覆盖 1–40 层', () => {
  assert.equal(REGIONS[0].from, 1);
  assert.equal(REGIONS.at(-1).to, 40);
  for (let index = 1; index < REGIONS.length; index += 1) {
    assert.equal(REGIONS[index].from, REGIONS[index - 1].to + 1);
  }
});

test('区段边界落在正确区域', () => {
  for (const [floor, id] of [[1,'outer'],[10,'outer'],[11,'corrode'],[20,'corrode'],[21,'spotlight'],[30,'spotlight'],[31,'elite'],[40,'elite']]) {
    assert.equal(regionForFloor(floor).id, id);
  }
});

test('越界层数会夹到有效区域', () => {
  assert.equal(regionForFloor(0).id, 'outer');
  assert.equal(regionForFloor(-8).id, 'outer');
  assert.equal(regionForFloor(999).id, 'elite');
  assert.equal(regionForFloor('not-a-floor').id, 'outer');
});

test('每个区域都有可读的规则与范围', () => {
  for (const region of REGIONS) {
    assert.ok(region.name);
    assert.ok(region.rule);
    assert.equal(regionRangeLabel(region), `${region.from}–${region.to}F`);
  }
});
