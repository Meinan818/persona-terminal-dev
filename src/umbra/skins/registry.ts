import type { UmbraSkinId, UmbraSkinPack } from './contract';

export type UmbraSkinLoader = () => Promise<UmbraSkinPack>;

const loaders = new Map<UmbraSkinId, UmbraSkinLoader>();
const packs = new Map<UmbraSkinId, UmbraSkinPack>();

export function registerSkin(id: UmbraSkinId, pack: UmbraSkinPack): void {
  if (pack.id !== id) throw new Error(`皮肤 id 不一致：${id} / ${pack.id}`);
  packs.set(id, pack);
}

export function registerSkinLoader(id: UmbraSkinId, loader: UmbraSkinLoader): void {
  loaders.set(id, loader);
}

export function getRegisteredSkin(id: UmbraSkinId): UmbraSkinPack | null {
  return packs.get(id) ?? null;
}

export async function loadSkin(id: UmbraSkinId): Promise<UmbraSkinPack> {
  const cached = packs.get(id);
  if (cached) return cached;
  const loader = loaders.get(id);
  if (!loader) throw new Error(`未注册皮肤加载器：${id}`);
  const pack = await loader();
  registerSkin(id, pack);
  return pack;
}

export function unloadSkin(id: UmbraSkinId): void {
  packs.delete(id);
}

export function disposeSkinLoader(id: UmbraSkinId): void {
  loaders.delete(id);
}

export function rosterAllowsPersona(skinId: UmbraSkinId, personaId: string): boolean {
  const pack = packs.get(skinId);
  if (!pack) return false;
  return !pack.roster.excludedPersonas.includes(personaId);
}

export function companionPersonaFor(skinId: UmbraSkinId, companionId: string): string | null {
  const pack = packs.get(skinId);
  return pack?.roster.companionPersonas[companionId] ?? null;
}
