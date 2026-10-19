import { describe, expect, it } from 'vitest';
import { umbraThemeFor } from '@/umbra/themes';

describe('UMBRA theme contract', () => {
  it('蓝色与粉色共用 TARTARUS 结构但保留不同皮肤', () => {
    expect(umbraThemeFor('blue')).toMatchObject({
      skin: 'tartarus-blue',
      channel: 'p3',
      identity: { en: 'TARTARUS' },
    });
    expect(umbraThemeFor('pink')).toMatchObject({
      skin: 'tartarus-pink',
      channel: 'p3',
      identity: { en: 'TARTARUS' },
    });
  });

  it('红色使用 Mementos 皮肤', () => {
    expect(umbraThemeFor('red')).toMatchObject({
      skin: 'mementos-red',
      channel: 'p5',
      identity: { en: 'Mementos' },
    });
  });

  it('黄色使用 Mayonaka TV 皮肤', () => {
    expect(umbraThemeFor('yellow')).toMatchObject({
      skin: 'mayonaka-yellow',
      channel: 'p4',
      identity: { en: 'Mayonaka TV' },
    });
  });

  it('自定义和未知主题落到 UMBRA 中性皮肤', () => {
    expect(umbraThemeFor('custom').skin).toBe('umbra-custom');
    expect(umbraThemeFor(undefined).skin).toBe('umbra-custom');
    expect(umbraThemeFor('not-a-theme').skin).toBe('umbra-custom');
  });
});
