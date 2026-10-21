// umbra/engine 公开 API。皮肤只能 import 这里导出的东西和 skins/_contract 的类型。
import type { SkinPack } from '../skins/_contract';
const registry = new Map<string, SkinPack>();
export const UMBRA = {
  registerSkin(id: string, pack: SkinPack) { registry.set(id, pack); },
  getSkin(id: string) { return registry.get(id); },
  get skins() { return [...registry.keys()]; },
};
export { Engine } from './core';
export { Director } from './director';
export type { RunResult } from './director';
export { P5Hud } from './hud';
export type { PartyState, EnemyState, ListRow, ResultData } from './hud';
export { validate, expand, CAPS, IMPLEMENTED } from './recipes';
export { makeUnit, setDownPose } from './units';
export { Particles } from './particles';
export { Fx } from './fx';
export { Quality, TIERS } from './quality';
export { mountTalk, checkTemplate } from './talk';
export { setErrorHook } from './timeline';
