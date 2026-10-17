import { describe, expect, it } from 'vitest';
import { existsSync, readdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { FESTIVAL_EN, SOLAR_TERM_NAMES, seasonMarksOfYear } from '@/utils/calendar';
import { seasonArtUrl } from '../seasonArt';
import { tarotSetOf } from '../tarotArt';

const SETS = ['p3', 'p4', 'p5', 'pink'] as const;

describe('岁时主题美术', () => {
  it('每套 24 节气和 20 节日都对应独立且实际存在的素材', () => {
    const marks = [
      ...SOLAR_TERM_NAMES.map(name => ({ kind: 'term' as const, name })),
      ...Object.keys(FESTIVAL_EN).map(name => ({ kind: 'festival' as const, name })),
    ];
    expect(marks).toHaveLength(44);
    for (const set of SETS) {
      const urls = marks.map(mark => seasonArtUrl(mark, set));
      expect(new Set(urls).size).toBe(44);
      for (const url of urls) {
        expect(url).toMatch(new RegExp(`^/season/${set}/[a-z_]+\\.webp$`));
        expect(existsSync(resolve('public', url!.slice(1))), url!).toBe(true);
      }
      expect(readdirSync(resolve('public/season', set)).sort()).toEqual(urls.map(url => url!.split('/').pop()).sort());
    }
  });

  it('2026–2030 年历的岁时键都能查到图，换年不影响卡面', () => {
    for (let year = 2026; year <= 2030; year++) {
      for (const mark of seasonMarksOfYear(year)) {
        for (const set of SETS) expect(seasonArtUrl(mark, set), mark.key).not.toBeNull();
      }
    }
  });

  it('特殊来源文件名归到对应节日 / 节气，不能串卡', () => {
    expect(seasonArtUrl({ kind: 'term', name: '立夏' }, 'p5')).toBe('/season/p5/lixia.webp');
    expect(seasonArtUrl({ kind: 'term', name: '夏至' }, 'pink')).toBe('/season/pink/xiazhi.webp');
    expect(seasonArtUrl({ kind: 'festival', name: '中秋' }, 'pink')).toBe('/season/pink/festival_zhongqiu.webp');
    expect(seasonArtUrl({ kind: 'festival', name: '跨年夜' }, 'p4')).toBe('/season/p4/festival_kuanianye.webp');
    expect(seasonArtUrl({ kind: 'festival', name: '妇女节' }, 'p5')).toBe('/season/p5/festival_funvjie.webp');
  });

  it('同属 p3 频道的蓝 / 粉仍分别使用自己的图片，自定义沿用已选的卡面套', () => {
    const mark = { kind: 'term' as const, name: '立春' };
    expect(seasonArtUrl(mark, tarotSetOf('p3', undefined, 'blue'))).toBe('/season/p3/lichun.webp');
    expect(seasonArtUrl(mark, tarotSetOf('p3', undefined, 'pink'))).toBe('/season/pink/lichun.webp');
    expect(seasonArtUrl(mark, tarotSetOf('neutral', 'p4', 'custom'))).toBe('/season/p4/lichun.webp');
  });

  it('未知名称、错误分类和对象原型名称保留程序化兜底', () => {
    for (const name of ['', '不存在的节日', 'constructor', '__proto__']) {
      for (const kind of ['term', 'festival'] as const) {
        expect(seasonArtUrl({ kind, name }, 'p3')).toBeNull();
      }
    }
    expect(seasonArtUrl({ kind: 'festival', name: '立春' }, 'p5')).toBeNull();
    expect(seasonArtUrl({ kind: 'term', name: '春节' }, 'p5')).toBeNull();
  });
});
