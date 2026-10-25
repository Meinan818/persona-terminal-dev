// 10-26：L01–L06、L08 换成 P5T 原版 StageSettingData 布局（gen_levels.py from_stage）。原来 Hark 自编图纸里专门用来测引擎接口的
// 区域/门/开关/宝箱/升降台/staysInZone/aiTarget 等在原版布局里没有 → 这些「引擎接口」测试改用自编图纸的冻结副本（tests/fixtures/legacy-levels，
// 10-25 版 gen_levels.py 输出）。规则逻辑不变，只是测试夹具换了来源。
import { loadLevel, type LevelJson } from '../src/game/level';
import type { MapDef } from '../src/rules/types';
const files = import.meta.glob('./fixtures/legacy-levels/L*.json', { eager: true, import: 'default' }) as Record<string, LevelJson>;
export function legacyJson(id: string): LevelJson {
  const j = files[`./fixtures/legacy-levels/${id}.json`];
  if (!j) throw new Error(`no legacy level ${id}`);
  return j;
}
export const legacyMap = (id: string): MapDef => loadLevel(legacyJson(id));
