import { describe, it, expect } from 'vitest';
import { confidantLiveryFor } from '@/components/cooperation/confidantLivery';
import type { UIChannel } from '@/ui/channel';

/**
 * 恭喜整页 / 星移四屏的换装判据。
 *
 * 关键断言不止「p5 → 'p5'」这一条：**p4 走 P4 电视版、neutral 落回 legacy**——
 * 它们本来就在显示这两件，若被误判成不出，用户点开会看到空白。
 */
describe('confidantLiveryFor', () => {
  it('红频道（p5）换 P5 剪报版', () => {
    expect(confidantLiveryFor('p5')).toBe('p5');
  });

  it('p3 沿用原 P3R 版', () => {
    expect(confidantLiveryFor('p3')).toBe('legacy');
  });

  it('p4 换 P4 电视节目版；neutral 沿用原版', () => {
    expect(confidantLiveryFor('p4')).toBe('p4');
    expect(confidantLiveryFor('neutral')).toBe('legacy');
  });

  it('覆盖全部频道取值，无一漏判', () => {
    const all: UIChannel[] = ['p5', 'p4', 'p3', 'neutral'];
    expect(all.map(confidantLiveryFor)).toEqual(['p5', 'p4', 'legacy', 'legacy']);
  });
});
