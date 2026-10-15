/**
 * 卡背皮肤映射。
 *
 * 与 CardBack 组件分文件，是为了让这层纯映射能脱离 React / motion / store 独立单测
 * （直接 import 组件文件会连带拉起 store → Dexie → jsdom 缺 IndexedDB 的噪音）。
 *
 * 粉主题在频道层就是 p3（ui/channel.ts 把 blue/pink 都映射成 'p3'），只看 channel
 * 会把粉主题判成蓝卡背——必须再认 user.theme 才分得开。
 * 同类坑见 utils/iconSync.ts（图标）与 constants/tarotArt.ts（牌面）。
 */
import type { UIChannel } from '@/ui/channel';
import type { ThemeType } from '@/types';

export type BackSkin = 'p5' | 'p4' | 'p3' | 'pink' | 'neutral';

export const backSkinOf = (channel: UIChannel, theme?: ThemeType | null): BackSkin =>
  theme === 'pink' ? 'pink'
    : channel === 'p5' ? 'p5'
      : channel === 'p4' ? 'p4'
        : channel === 'p3' ? 'p3'
          : 'neutral';
