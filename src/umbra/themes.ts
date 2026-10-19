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
  identity: ReturnType<typeof umbraIdentityForTheme>;
}

export function umbraThemeFor(theme: ThemeType | string | null | undefined): UmbraTheme {
  switch (theme) {
    case 'blue':
    case 'p3':
      return { skin: 'tartarus-blue', channel: 'p3', identity: umbraIdentityForTheme(theme) };
    case 'pink':
    case 'hamuko':
      return { skin: 'tartarus-pink', channel: 'p3', identity: umbraIdentityForTheme(theme) };
    case 'red':
    case 'p5':
      return { skin: 'mementos-red', channel: 'p5', identity: umbraIdentityForTheme(theme) };
    case 'yellow':
    case 'p4':
      return { skin: 'mayonaka-yellow', channel: 'p4', identity: umbraIdentityForTheme(theme) };
    default:
      return { skin: 'umbra-custom', channel: 'neutral', identity: umbraIdentityForTheme(theme) };
  }
}
