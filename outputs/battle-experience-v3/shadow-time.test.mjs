import test from 'node:test';
import assert from 'node:assert/strict';
import {
  formatCountdown,
  formatShadowTimeRange,
  isShadowTime,
  nextShadowTime,
  shadowTimeStatus,
} from './shadow-time.js';

const at = (day, hour, minute = 0) => new Date(2026, 9, day, hour, minute, 0, 0);

test('周五晚间与周六凌晨属于同一段影时间', () => {
  assert.equal(isShadowTime(at(16, 21)), true);
  assert.equal(isShadowTime(at(17, 2)), true);
  assert.equal(isShadowTime(at(17, 12)), false);
});

test('周一凌晨仍属于周日晚上的影时间', () => {
  assert.equal(isShadowTime(at(19, 2)), true);
  assert.equal(isShadowTime(at(19, 12)), false);
});

test('非开放日白天不进入影时间', () => {
  assert.equal(isShadowTime(at(14, 21)), false);
  assert.equal(isShadowTime(at(15, 6, 59)), false);
});

test('同日窗口按开始小时与结束小时判断', () => {
  const options = { days: [5], startHour: 9, endHour: 12 };
  assert.equal(isShadowTime(at(16, 10), options), true);
  assert.equal(isShadowTime(at(16, 12), options), false);
});

test('影时间状态给出窗口、结束时间和下次开启时间', () => {
  const active = shadowTimeStatus(at(17, 2));
  assert.equal(active.active, true);
  assert.equal(active.start?.getDate(), 16);
  assert.equal(active.end?.getDate(), 17);
  assert.equal(active.end?.getHours(), 7);
  assert.equal(active.nextStart?.getDate(), 17);
  assert.equal(active.nextStart?.getHours(), 20);

  const inactive = shadowTimeStatus(at(19, 12));
  assert.equal(inactive.active, false);
  assert.equal(inactive.nextStart?.getDate(), 23);
  assert.equal(inactive.nextStart?.getDay(), 5);
});

test('下一次影时间从当前时刻之后计算', () => {
  assert.equal(nextShadowTime(at(16, 19))?.getDate(), 16);
  assert.equal(nextShadowTime(at(16, 21))?.getDate(), 17);
  assert.equal(nextShadowTime(at(23, 12))?.getDate(), 23);
});

test('窗口与倒计时文案可用于据点提示', () => {
  assert.equal(formatShadowTimeRange(), '周五、周六、周日 20:00–07:00');
  assert.equal(formatCountdown(0), '现在');
  assert.equal(formatCountdown(90 * 60000), '1 小时 30 分钟');
  assert.equal(formatCountdown(30 * 1000), '不到 1 分钟');
});
