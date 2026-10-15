/**
 * tarotArt —— 塔罗卡面套映射单测。
 *
 * 重点防回归：pink 主题必须拿到 'pink' 那套，而不是跟 blue 共用 'p3'。
 * 历史坑：data-ui-channel 把 blue/pink 都归到 'p3'（ui/channel.ts），
 * 若卡面判定只看 channel，粉主题会继续显示蓝那套水下卡。
 * 同类坑见 utils/iconSync.ts（图标联动）。
 */
import { describe, it, expect } from 'vitest';
import { tarotSetOf, tarotArtUrl } from '../tarotArt';

/** constants/tarot.ts 里的 22 张大阿卡纳 id（与 tarotArt 的 MAJOR_WITH_ART 同口径） */
const MAJORS = [
  'fool', 'magician', 'high_priestess', 'empress', 'emperor', 'hierophant',
  'lovers', 'chariot', 'strength', 'hermit', 'wheel_of_fortune', 'justice',
  'hanged_man', 'death', 'temperance', 'devil', 'tower', 'star',
  'moon', 'sun', 'judgement', 'world',
] as const;

describe('tarotArt 卡面套映射', () => {
  it('三大频道各自钉死自己的套', () => {
    expect(tarotSetOf('p3', undefined, 'blue')).toBe('p3');
    expect(tarotSetOf('p4', undefined, 'yellow')).toBe('p4');
    expect(tarotSetOf('p5', undefined, 'red')).toBe('p5');
  });

  it('粉主题拿到粉那套，且与蓝那套不同（防 channel 混淆回归）', () => {
    // 粉在频道层就是 p3，只看 channel 会判成蓝那套
    expect(tarotSetOf('p3', undefined, 'pink')).toBe('pink');
    expect(tarotSetOf('p3', undefined, 'pink')).not.toBe(tarotSetOf('p3', undefined, 'blue'));
  });

  it('自定义主题读设置，缺省仍是 p3（老档案观感不变）', () => {
    expect(tarotSetOf('neutral', undefined, 'custom')).toBe('p3');
    expect(tarotSetOf('neutral', 'p4', 'custom')).toBe('p4');
    expect(tarotSetOf('neutral', 'p5', 'custom')).toBe('p5');
  });

  it('粉主题不吃 customTarotSet（粉那套是专属卡面）', () => {
    expect(tarotSetOf('p3', 'p4', 'pink')).toBe('pink');
  });

  it('主题缺失时按频道兜底', () => {
    expect(tarotSetOf('p4', undefined, undefined)).toBe('p4');
    expect(tarotSetOf('p3', undefined, null)).toBe('p3');
  });

  it('22 张大阿卡纳四套都有图，路径带对套名', () => {
    for (const set of ['p3', 'p4', 'p5', 'pink'] as const) {
      for (const id of MAJORS) {
        expect(tarotArtUrl(id, set)).toBe(`/tarot/${set}/${id}.webp`);
      }
    }
  });

  it('小阿卡纳没有配图，返回 null 走程序化卡面', () => {
    expect(tarotArtUrl('wands_1', 'pink')).toBeNull();
    expect(tarotArtUrl('cups_14', 'p3')).toBeNull();
  });
});
