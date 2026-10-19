import { describe, expect, it } from 'vitest';
import { UMBRA_IDENTITY, umbraIdentityForTheme } from './umbraIdentity';

describe('UMBRA 正式命名', () => {
  it.each([
  ['blue', 'TARTARUS', '塔尔塔罗斯'], ['pink', 'TARTARUS', '塔尔塔罗斯'],
  ['red', 'Mementos', '印象空间'], ['yellow', 'Mayonaka TV', '电视世界'],
  ['custom', 'UMBRA', '幽影协议'], ['p3', 'TARTARUS', '塔尔塔罗斯'],
  ['hamuko', 'TARTARUS', '塔尔塔罗斯'], ['p5', 'Mementos', '印象空间'],
  ['p4', 'Mayonaka TV', '电视世界'], [undefined, 'UMBRA', '幽影协议'],
  ['not-a-theme', 'UMBRA', '幽影协议'],
])('主题 %s 使用正式名称 %s', (theme, en, zh) => {
    expect(umbraIdentityForTheme(theme)).toEqual({ en, zh, full: en + '（' + zh + '）' });
  });
  it('未知和自定义主题回到 UMBRA，而不是借用其他频道的名字', () => {
    expect(umbraIdentityForTheme('custom')).toBe(UMBRA_IDENTITY);
    expect(umbraIdentityForTheme(null)).toBe(UMBRA_IDENTITY);
  });
});
