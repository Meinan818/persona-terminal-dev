import type { ThemeType } from '@/types';
import { umbraIdentityForTheme } from '@/utils/umbraIdentity';

export type UmbraSkinId =
  | 'tartarus-blue'
  | 'tartarus-pink'
  | 'mementos-red'
  | 'mayonaka-yellow'
  | 'umbra-custom';

export interface UmbraTheme {
  skin: UmbraSkinId;
  channel: 'p3' | 'p5' | 'p4' | 'neutral';
  terminalLabel: string;
  terminalNote: string;
  identity: ReturnType<typeof umbraIdentityForTheme>;
}

export function umbraThemeFor(theme: ThemeType | string | null | undefined): UmbraTheme {
  switch (theme) {
    case 'blue':
    case 'p3':
      return {
        skin: 'tartarus-blue',
        channel: 'p3',
        terminalLabel: 'TARTARUS / BLUE HOUR',
        terminalNote: '夜间观测终端 · 月光与警戒同步',
        identity: umbraIdentityForTheme(theme),
      };
    case 'pink':
    case 'hamuko':
      return {
        skin: 'tartarus-pink',
        channel: 'p3',
        terminalLabel: 'TARTARUS / PINK HOUR',
        terminalNote: '夜间观测终端 · 月光与警戒同步',
        identity: umbraIdentityForTheme(theme),
      };
    case 'red':
    case 'p5':
      return {
        skin: 'mementos-red',
        channel: 'p5',
        terminalLabel: 'MEMENTOS / VEIL',
        terminalNote: '公众认知深层 · 阴影密度偏高',
        identity: umbraIdentityForTheme(theme),
      };
    case 'yellow':
    case 'p4':
      return {
        skin: 'mayonaka-yellow',
        channel: 'p4',
        terminalLabel: 'MAYONAKA / SIGNAL',
        terminalNote: '午夜电视信号 · 雾中坐标同步',
        identity: umbraIdentityForTheme(theme),
      };
    default:
      return {
        skin: 'umbra-custom',
        channel: 'neutral',
        terminalLabel: 'UMBRA / DIRECT',
        terminalNote: '幽影协议直连 · 未绑定主题皮肤',
        identity: umbraIdentityForTheme(theme),
      };
  }
}
