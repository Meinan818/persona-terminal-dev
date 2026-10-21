import { describe, expect, it } from 'vitest';
import { skinIdForTheme } from '../themeLoader';

describe('UMBRA theme skin loader', () => {
  it('把 App 主题映射到契约 SkinId', () => {
    expect(skinIdForTheme('red')).toBe('p5r-red');
    expect(skinIdForTheme('yellow')).toBe('p4-yellow');
    expect(skinIdForTheme('blue')).toBe('p3-blue');
    expect(skinIdForTheme('pink')).toBe('p3r-pink');
  });
});
