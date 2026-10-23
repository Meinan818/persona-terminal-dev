// L01–L10 关卡数据（从 umbra-assets/specs/levels/ 原样复制；不要手改，Hark 用 gen_levels.py 重新生成后再复制）
import L01 from './L01.json';
import L02 from './L02.json';
import L03 from './L03.json';
import L04 from './L04.json';
import L05 from './L05.json';
import L06 from './L06.json';
import L07 from './L07.json';
import L08 from './L08.json';
import L09 from './L09.json';
import L10 from './L10.json';
import { loadLevel, type LevelJson } from '../level';
import type { MapDef } from '../../rules/types';

export const LEVEL_JSON: LevelJson[] = [L01, L02, L03, L04, L05, L06, L07, L08, L09, L10] as unknown as LevelJson[];
export const LEVEL_IDS = LEVEL_JSON.map((l) => l.id);
export function levelJson(id: string): LevelJson {
  const j = LEVEL_JSON.find((l) => l.id === id);
  if (!j) throw new Error(`no level ${id}`);
  return j;
}
/** 每次调用都生成新的 MapDef（Battle 会改 map.win 等字段） */
export function levelMap(id: string): MapDef { return loadLevel(levelJson(id)); }
