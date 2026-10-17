import { describe, it, expect } from 'vitest';
import { rankUpVariantFor } from '@/components/cooperation/confidantRankUpShared';

/**
 * 羁绊升级演出 · 频道分流。
 *
 * 为什么测纯函数而不是渲染组件：本项目 vitest 只收 `src/**\/*.test.ts`（不含 .tsx），
 * 且惯例是让这层判据脱离 React / store 独立可测（同 astrology/backSkin.ts 的理由）。
 * 组件里的包装只有一行 `if`，真正会出错的是这张「频道 → 版本」的表。
 *
 * ⚠ 这组用例证明的是「分流判据把红频道归给了红版」。
 * 「红主题下演出在真实 app 里确实播出来」**未在此验证**——本地 dev server 的首次引导
 * （7 步向导）挡住了无头浏览器，那条证路没打通，需人工目视。
 */
describe('羁绊升级演出 · 频道分流', () => {
  it('红频道（p5）归给红黑剪报版 —— 修复前它被判为「非 p3」直接跳过，演出根本不播', () => {
    expect(rankUpVariantFor('p5')).toBe('p5');
  });

  it('蓝频道（p3，含粉主题换色皮）仍归给原有的深蓝水下版', () => {
    expect(rankUpVariantFor('p3')).toBe('p3');
  });

  it('黄频道（p4）走黄色电视节目版；中性（neutral）仍不出新演出', () => {
    expect(rankUpVariantFor('p4')).toBe('p4');
    expect(rankUpVariantFor('neutral')).toBeNull();
  });

  it('四个频道里 p3 / p4 / p5 有演出，neutral 不出', () => {
    const channels = ['p3', 'p4', 'p5', 'neutral'] as const;
    expect(channels.filter(c => rankUpVariantFor(c) !== null)).toEqual(['p3', 'p4', 'p5']);
  });
});
