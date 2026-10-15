/**
 * tarotArt —— 塔罗卡面套映射单测。
 *
 * 重点防回归：pink 主题必须拿到 'pink' 那套，而不是跟 blue 共用 'p3'。
 * 历史坑：data-ui-channel 把 blue/pink 都归到 'p3'（ui/channel.ts），
 * 若卡面判定只看 channel，粉主题会继续显示蓝那套水下卡。
 * 同类坑见 utils/iconSync.ts（图标联动）。
 */
import { describe, it, expect } from 'vitest';
import { tarotSetOf, tarotArtUrl, nextArtRetryDelay, ART_RETRY_DELAYS_MS } from '../tarotArt';

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

describe('卡面加载失败的退避重试', () => {
  it('按节奏给出重试间隔，且递增', () => {
    const delays = ART_RETRY_DELAYS_MS.map((_, i) => nextArtRetryDelay(i));
    expect(delays).toEqual([...ART_RETRY_DELAYS_MS]);
    for (let i = 1; i < delays.length; i++) {
      expect(delays[i]!).toBeGreaterThan(delays[i - 1]!);
    }
  });

  it('重试次数用尽后返回 null（不再死磕真不存在的图）', () => {
    expect(nextArtRetryDelay(ART_RETRY_DELAYS_MS.length)).toBeNull();
    expect(nextArtRetryDelay(ART_RETRY_DELAYS_MS.length + 5)).toBeNull();
  });

  it('非法次数（负数）也返回 null，不抛错', () => {
    expect(nextArtRetryDelay(-1)).toBeNull();
  });

  it('第一次失败就必须有重试机会（防「一次失败=终身占位卡」回归）', () => {
    // 这条对应 2026-10-16 的线上事故：faildstSrc 被永久记住，素材补传后仍显示占位卡
    expect(nextArtRetryDelay(0)).not.toBeNull();
    expect(nextArtRetryDelay(0)).toBeGreaterThan(0);
  });
});
