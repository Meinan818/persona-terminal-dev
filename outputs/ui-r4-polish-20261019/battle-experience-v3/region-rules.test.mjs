import test from 'node:test';
import assert from 'node:assert/strict';
import { REGIONS, regionForFloor, regionRangeLabel } from './region-rules.js';

test('五个区域连续覆盖 1–100 层', () => {
  assert.equal(REGIONS[0].from, 1);
  assert.equal(REGIONS.at(-1).to, 100);
  for (let index = 1; index < REGIONS.length; index += 1) {
    assert.equal(REGIONS[index].from, REGIONS[index - 1].to + 1);
  }
});

test('区段边界落在正确区域', () => {
  assert.equal(regionForFloor(1).id, 'outer');
  assert.equal(regionForFloor(20).id, 'outer');
  assert.equal(regionForFloor(21).id, 'corrode');
  assert.equal(regionForFloor(40).id, 'corrode');
  assert.equal(regionForFloor(41).id, 'spotlight');
  assert.equal(regionForFloor(60).id, 'spotlight');
  assert.equal(regionForFloor(61).id, 'clock');
  assert.equal(regionForFloor(80).id, 'clock');
  assert.equal(regionForFloor(81).id, 'elite');
  assert.equal(regionForFloor(100).id, 'elite');
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
