import type { UmbraSkinId, UmbraSkinPack } from './contract';
import { registerSkinLoader } from './registry';

const modules = import.meta.glob<{ default: UmbraSkinPack }>('./*/index.ts');

const skinIds: UmbraSkinId[] = ['p5r-red', 'p4-yellow', 'p3-blue', 'p3r-pink'];

for (const id of skinIds) {
  const path = `./${id}/index.ts`;
  if (modules[path]) {
    registerSkinLoader(id, async () => {
      const module = await modules[path]();
      return module.default ?? module;
    });
  }
}
