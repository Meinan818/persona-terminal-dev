import test from 'node:test';
import assert from 'node:assert/strict';
import { umbraIdentityForTheme, currentUmbraIdentity, syncUmbraTitle } from './module-identity.js';

for (const [theme, en, zh] of [
  ['blue', 'TARTARUS', '塔尔塔罗斯'], ['pink', 'TARTARUS', '塔尔塔罗斯'],
  ['red', 'Mementos', '印象空间'], ['yellow', 'Mayonaka TV', '电视世界'],
  ['custom', 'UMBRA', '幽影协议'], ['p3', 'TARTARUS', '塔尔塔罗斯'],
  ['hamuko', 'TARTARUS', '塔尔塔罗斯'], ['p5', 'Mementos', '印象空间'],
  ['p4', 'Mayonaka TV', '电视世界'], [undefined, 'UMBRA', '幽影协议'],
  ['not-a-theme', 'UMBRA', '幽影协议'],
]) {
  test('主题 ' + theme + ' 的正式名称', () => {
    assert.deepEqual(umbraIdentityForTheme(theme), { en, zh, full: en + '（' + zh + '）' });
  });
}
test('粉色沿用塔尔塔罗斯，标签页同步完整名称', () => {
  const documentElement = { dataset: { theme: 'p3', skin: 'hamuko' } };
  assert.equal(currentUmbraIdentity(documentElement).en, 'TARTARUS');
  const doc = { documentElement, title: '' };
  syncUmbraTitle(doc);
  assert.equal(doc.title, 'MASKARIA · TARTARUS（塔尔塔罗斯）');
});
