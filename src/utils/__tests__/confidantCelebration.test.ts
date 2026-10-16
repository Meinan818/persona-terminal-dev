import { beforeEach, describe, expect, it } from 'vitest';
import type { Confidant, ConfidantEvent } from '@/types';
import { findUncelebratedLevelUps, levelCelebrationKey, markLevelCelebrated, wasLevelCelebrated } from '@/utils/confidantCelebration';

/**
 * 「已庆祝」标记 —— 升级演出与档案补弹共用同一把键。
 * 这组用例盯的就是那条**共用契约**：演出标记过的等级，档案扫描必须扫不到
 * （否则用户会先看一遍演出、打开档案又被补弹一次）。
 */
const makeConfidant = (over: Partial<Confidant> = {}): Confidant => ({
  id: 'c1',
  userId: 'u1',
  source: 'offline',
  name: '测试同伴',
  arcanaId: 'fool',
  orientation: 'upright',
  description: '',
  aiInterpretation: '',
  aiAdvice: '',
  intimacy: 3,
  intimacyPoints: 0,
  buffs: [],
  decayEnabled: false,
  createdAt: new Date('2026-10-01T00:00:00Z'),
  ...over,
});

const levelUp = (toLevel: number, day = '2026-10-02'): ConfidantEvent => ({
  id: `e${toLevel}_${day}`,
  confidantId: 'c1',
  date: day,
  type: 'level_up',
  toLevel,
  createdAt: new Date(`${day}T10:00:00Z`),
});

describe('羁绊升级「已庆祝」标记', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('按「同伴 + 等级」精确记住，不串到别的等级或别的同伴', () => {
    expect(wasLevelCelebrated('c1', 3)).toBe(false);
    markLevelCelebrated('c1', 3);
    expect(wasLevelCelebrated('c1', 3)).toBe(true);
    expect(wasLevelCelebrated('c1', 2)).toBe(false);
    expect(wasLevelCelebrated('c2', 3)).toBe(false);
  });

  it('扫描未庆祝升级：标记过的等级被排除（这就是「演出播过、档案不再补弹」的判据）', () => {
    const events = [levelUp(2), levelUp(3)];
    expect(findUncelebratedLevelUps(makeConfidant(), events).map(i => i.level)).toEqual([2, 3]);
    markLevelCelebrated('c1', 2);
    expect(findUncelebratedLevelUps(makeConfidant(), events).map(i => i.level)).toEqual([3]);
  });

  it('等级高于当前亲密度的事件不算（防脏数据误弹）', () => {
    expect(findUncelebratedLevelUps(makeConfidant({ intimacy: 2 }), [levelUp(3)]).map(i => i.level)).toEqual([]);
  });

  it('没有 toLevel 的老事件退回解析 narrative 的 Lv.X', () => {
    const legacy: ConfidantEvent = { id: 'old', confidantId: 'c1', date: '2026-10-01', type: 'level_up', narrative: '亲密度到达 Lv.2', createdAt: new Date('2026-10-01T10:00:00Z') };
    expect(findUncelebratedLevelUps(makeConfidant(), [legacy]).map(i => i.level)).toEqual([2]);
  });

  it('键名逐字固定（与线上已写过的键保持兼容，改它会漏弹）', () => {
    expect(levelCelebrationKey('c1', 3)).toBe('velvet_confidant_level_celebrated_c1_3');
  });
});
