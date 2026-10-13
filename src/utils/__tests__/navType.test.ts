/**
 * navType —— 本次加载是否「刷新」的判定。
 *
 * 为什么要这份测试：开屏动画"每次刷新都重放"是用户上报的真实缺陷，
 * 修法是按浏览器 navigation type 区分。而这个判定的正确性**只在边界上**
 * （reload / back_forward / prerender vs navigate / 取不到）——happy path
 * 单跑一次看不出错，所以逐型枚举。
 */
import { describe, it, expect } from 'vitest';
import { isReloadNavigation } from '../navType';

describe('isReloadNavigation', () => {
  it('reload（F5 / 下拉刷新）→ 判为刷新，应跳过动画', () => {
    expect(isReloadNavigation({ type: 'reload' })).toBe(true);
  });

  it('navigate（地址栏进入 / 点链接 / 首次打开）→ 不跳过，照常播放', () => {
    expect(isReloadNavigation({ type: 'navigate' })).toBe(false);
  });

  it('back_forward（后退/前进）→ 判为刷新，不重放', () => {
    expect(isReloadNavigation({ type: 'back_forward' })).toBe(true);
  });

  it('prerender → 判为刷新，不重放', () => {
    expect(isReloadNavigation({ type: 'prerender' })).toBe(true);
  });

  it('取不到 entry（null）→ fail-open 照常播放，不因探测失败而吞掉开屏', () => {
    expect(isReloadNavigation(null)).toBe(false);
  });

  it('type 缺失 → 照常播放', () => {
    expect(isReloadNavigation({})).toBe(false);
    expect(isReloadNavigation({ type: undefined })).toBe(false);
  });

  it('未知 type 字符串 → 照常播放（只对已知的"非新进"型跳过）', () => {
    expect(isReloadNavigation({ type: 'something_else' })).toBe(false);
  });
});
