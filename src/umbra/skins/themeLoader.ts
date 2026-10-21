import type { ThemeType } from '@/types';
import type { UmbraSkinId, UmbraSkinPack } from './contract';
import { loadSkin } from './registry';
import './loaders';

const skinModules = import.meta.glob<{ default: UmbraSkinPack }>('./*/index.ts');

const SKIN_PATH: Record<UmbraSkinId, string> = {
  'p5r-red': './p5r-red/index.ts',
  'p4-yellow': './p4-yellow/index.ts',
  'p3-blue': './p3-blue/index.ts',
  'p3r-pink': './p3r-pink/index.ts',
};

export function skinIdForTheme(theme: ThemeType | string | null | undefined): UmbraSkinId {
  switch (theme) {
    case 'red':
    case 'p5':
      return 'p5r-red';
    case 'yellow':
    case 'p4':
      return 'p4-yellow';
    case 'pink':
    case 'hamuko':
      return 'p3r-pink';
    case 'blue':
    case 'p3':
      return 'p3-blue';
    default:
      return 'p3-blue';
  }
}

export function loadSkinForTheme(
  theme: ThemeType | string | null | undefined,
): Promise<UmbraSkinPack> {
  const id = skinIdForTheme(theme);
  return loadSkin(id).catch(() => {
    const loader = skinModules[SKIN_PATH[id]];
    if (!loader) return Promise.reject(new Error(`未找到皮肤入口：${id}`));
    return loader().then(module => module.default ?? module);
  });
}
