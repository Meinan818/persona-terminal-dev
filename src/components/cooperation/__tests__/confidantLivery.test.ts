import { describe, it, expect } from 'vitest';
import { confidantLiveryFor } from '@/components/cooperation/confidantLivery';
import type { UIChannel } from '@/ui/channel';

/**
 * 恭喜整页 / 星移四屏的换装判据。
 *
 * 关键断言不止「p5 → 'p5'」这一条：**p4 / neutral 必须落回 'legacy'**——
 * 它们本来就在显示这两件（走各主题 --p3r-* 变量），若被误判成不出（照搬演出的
 * rankUpVariantFor 口径），这两个频道的用户点开会看到空白。
 */
describe('confidantLiveryFor', () => {
  it('红频道（p5）换 P5 剪报版', () => {
    expect(confidantLiveryFor('p5')).toBe('p5');
  });

  it('p3 沿用原 P3R 版', () => {
    expect(confidantLiveryFor('p3')).toBe('legacy');
  });

  it('p4 / neutral 也沿用原版（不是「不出」——它们本来就显示这两件）', () => {
    expect(confidantLiveryFor('p4')).toBe('legacy');
    expect(confidantLiveryFor('neutral')).toBe('legacy');
  });

  it('覆盖全部频道取值，无一漏判', () => {
    const all: UIChannel[] = ['p5', 'p4', 'p3', 'neutral'];
    expect(all.map(confidantLiveryFor)).toEqual(['p5', 'legacy', 'legacy', 'legacy']);
  });
});
