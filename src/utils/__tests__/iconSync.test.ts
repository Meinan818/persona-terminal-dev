/**
 * iconSync —— 主题图标映射单测。
 *
 * 重点防回归：blue 与 pink 必须是**不同**的图标。
 * 历史坑：data-ui-channel 把 blue/pink 都归到 'p3'，若图标联动误用 channel 判定，
 * 粉主题会错切成蓝图标。本测试用纯函数逐主题钉死映射。
 */
import { describe, it, expect } from 'vitest';
import { THEME_ICON_NAMES, themeIconSrc, themeFaviconHref } from '../iconSync';
import type { ThemeType } from '@/types';

const ALL: ThemeType[] = ['blue', 'yellow', 'red', 'pink', 'custom'];

describe('iconSync 主题图标映射', () => {
  it('五个主题各有独立图标名', () => {
    const names = ALL.map((t) => THEME_ICON_NAMES[t]);
    expect(new Set(names).size).toBe(5);
    expect(names).toEqual(['blue', 'yellow', 'red', 'pink', 'custom']);
  });

  it('blue 与 pink 映射到不同图标（防 channel 混淆回归）', () => {
    expect(themeIconSrc('blue')).not.toBe(themeIconSrc('pink'));
    expect(themeFaviconHref('blue')).not.toBe(themeFaviconHref('pink'));
  });

  it('每个主题解析出正确的资源路径', () => {
    for (const t of ALL) {
      expect(themeIconSrc(t)).toBe(`/theme-icons/${t}.png`);
      expect(themeFaviconHref(t)).toBe(`/theme-icons/${t}.png`);
    }
  });

  it('主题缺失时兜底到默认图标（不破图）', () => {
    expect(themeIconSrc(undefined)).toBe('/icon.png');
  });
});
