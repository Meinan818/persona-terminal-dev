import { describe, expect, it } from 'vitest';
import { buffsUnlockedInRange } from '@/utils/confidantLevels';

/**
 * 「这次升级到底解锁了哪些能力」的区间口径（2026-10-16 接回 App 时统一）。
 *
 * 升级演出里的奖励胶囊要说这件事，升级恭喜整页也要说 —— 两边必须是同一套口径，
 * 否则同一场升级在演出里和恭喜页里会各报一批。
 * 口径：**旧级之后、新级及以前**（旧级那一轮已经报过，不再重复报）。
 */
const buff = (id: string, unlockAtLevel: number) => ({ id, unlockAtLevel });

describe('buffsUnlockedInRange（升级解锁能力的区间口径）', () => {
  it('只取「旧级之后、新级及以前」解锁的', () => {
    const buffs = [buff('a', 2), buff('b', 3), buff('c', 5)];
    expect(buffsUnlockedInRange(buffs, 2, 3).map(b => b.id)).toEqual(['b']);
  });

  it('正好等于旧级的**不**算（那一级上一轮已经报过）', () => {
    expect(buffsUnlockedInRange([buff('a', 2)], 2, 3)).toHaveLength(0);
  });

  it('正好等于新级的算', () => {
    expect(buffsUnlockedInRange([buff('a', 3)], 2, 3).map(b => b.id)).toEqual(['a']);
  });

  it('一次跨多级：区间内的一次全拿', () => {
    const buffs = [buff('a', 2), buff('b', 3), buff('c', 4), buff('d', 5)];
    expect(buffsUnlockedInRange(buffs, 1, 4).map(b => b.id)).toEqual(['a', 'b', 'c']);
  });

  it('没有解锁项（空数组 / 都不在区间）→ 空', () => {
    expect(buffsUnlockedInRange([], 1, 2)).toHaveLength(0);
    expect(buffsUnlockedInRange([buff('a', 9), buff('b', 1)], 1, 2)).toHaveLength(0);
  });

  it('不改动传入的数组', () => {
    const src = [buff('a', 3), buff('b', 2)];
    buffsUnlockedInRange(src, 2, 3);
    expect(src.map(b => b.id)).toEqual(['a', 'b']);
  });
});
