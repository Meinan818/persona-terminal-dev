import { describe, expect, it } from 'vitest';
import { resolveUmbraEntry } from '@/umbra/entry';

describe('UMBRA entry switch', () => {
  it('没有显式参数时由幽影协议直接取代旧战场', () => {
    expect(resolveUmbraEntry('')).toBe('demo');
    expect(resolveUmbraEntry('?theme=p5')).toBe('demo');
  });

  it('默认与 umbra=1 进入验收 Demo，umbra=runtime 进入迁移开发页', () => {
    expect(resolveUmbraEntry('?umbra=1')).toBe('demo');
    expect(resolveUmbraEntry('?theme=p5&umbra=1#battle')).toBe('demo');
    expect(resolveUmbraEntry('?theme=p5&umbra=runtime#battle')).toBe('runtime');
  });

  it('legacy=1、umbra=0、其它值或重复参数保留旧战场回退', () => {
    expect(resolveUmbraEntry('?legacy=1')).toBe('legacy');
    expect(resolveUmbraEntry('?umbra=0')).toBe('legacy');
    expect(resolveUmbraEntry('?umbra=yes')).toBe('legacy');
    expect(resolveUmbraEntry('?umbra=1&umbra=0')).toBe('legacy');
  });
});
