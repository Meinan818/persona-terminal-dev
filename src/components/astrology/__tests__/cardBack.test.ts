/**
 * CardBack 卡背皮肤映射单测。
 *
 * 重点防回归：pink 主题必须拿到 'pink' 皮肤，而不是跟 blue 共用 'p3'。
 * 历史坑：data-ui-channel 把 blue/pink 都归到 'p3'（ui/channel.ts），
 * 若卡背判定只看 channel，粉主题翻牌前会看到蓝色卡背。
 * 同类坑见 utils/iconSync.ts（图标）与 constants/tarotArt.ts（牌面）。
 *
 * 只 import 纯映射文件，不 import CardBack 组件——否则会连带拉起 store/Dexie。
 */
import { describe, it, expect } from 'vitest';
import { backSkinOf } from '../backSkin';

describe('CardBack 卡背皮肤映射', () => {
  it('三大频道各自钉死自己的卡背', () => {
    expect(backSkinOf('p3', 'blue')).toBe('p3');
    expect(backSkinOf('p4', 'yellow')).toBe('p4');
    expect(backSkinOf('p5', 'red')).toBe('p5');
  });

  it('粉主题拿到粉卡背，且与蓝卡背不同（防 channel 混淆回归）', () => {
    // 粉在频道层就是 p3，只看 channel 会判成蓝卡背
    expect(backSkinOf('p3', 'pink')).toBe('pink');
    expect(backSkinOf('p3', 'pink')).not.toBe(backSkinOf('p3', 'blue'));
  });

  it('自定义主题落 neutral（无频道戏剧化的干净皮）', () => {
    expect(backSkinOf('neutral', 'custom')).toBe('neutral');
  });

  it('主题缺失时按频道兜底', () => {
    expect(backSkinOf('p4', undefined)).toBe('p4');
    expect(backSkinOf('p3', null)).toBe('p3');
    expect(backSkinOf('neutral', undefined)).toBe('neutral');
  });
});
