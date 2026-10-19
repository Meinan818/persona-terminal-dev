import { describe, expect, it } from 'vitest';
import { resolveUmbraEntry } from '@/umbra/entry';

describe('UMBRA entry switch', () => {
  it('没有显式参数时保持旧战场', () => {
    expect(resolveUmbraEntry('')).toBe('legacy');
    expect(resolveUmbraEntry('?theme=p5')).toBe('legacy');
  });

  it('umbra=1 才进入 runtime', () => {
    expect(resolveUmbraEntry('?umbra=1')).toBe('runtime');
    expect(resolveUmbraEntry('?theme=p5&umbra=1#battle')).toBe('runtime');
  });

  it('umbra=0、其它值或重复参数按旧入口处理', () => {
    expect(resolveUmbraEntry('?umbra=0')).toBe('legacy');
    expect(resolveUmbraEntry('?umbra=yes')).toBe('legacy');
    expect(resolveUmbraEntry('?umbra=1&umbra=0')).toBe('legacy');
  });
});
