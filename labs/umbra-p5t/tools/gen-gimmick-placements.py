#!/usr/bin/env python3
"""r8：umbra-assets cover_units/gimmick_placements.csv（原版 m_GimmickList）→ src/view/gimmickData.ts。
引擎格 (x, y) = (stage_x, D-1-stage_z)（同 view/origMap.ts 对齐）。只含坐标/UnitId/朝向，不含美术。"""
import csv, json, os, sys
A = os.environ.get('UMBRA_ASSETS', os.path.normpath(os.path.join(os.path.dirname(os.path.abspath(__file__)), '../../../../umbra-assets')))
P = list(csv.DictReader(open(f'{A}/p5t/1_battle/r7/cover_units/gimmick_placements.csv', encoding='utf-8')))
U = {r['unit_id']: r for r in csv.DictReader(open(f'{A}/p5t/1_battle/r7/cover_units/gimmick_unit_mapping.csv', encoding='utf-8'))}
here = os.path.dirname(os.path.abspath(__file__))
LV = {'L01': 'M01', 'L02': 'M02', 'L03': 'M03', 'L04': 'M04', 'L05': 'M05', 'L06': 'M09', 'L07': 'M08', 'L08': 'M17', 'L09': 'M07'}
extra = json.loads(sys.argv[1]) if len(sys.argv) > 1 else {}
LV.update(extra)
out = {}
for L, m in sorted(LV.items()):
    lv = json.load(open(f'{here}/../src/game/levels/{L}.json', encoding='utf-8'))
    D = lv['height']
    rows = []
    for p in P:
        if p['mission'] != m: continue
        x, y = int(p['x']), D - 1 - int(p['z'])
        rows.append([int(p['unit_id']), x, y, int(p['direction'])])
    out[L] = rows
units = {k: {'file': f"unit_{v['prefab_no']}.glb", 'type': int(v['object_type']), 'cover': float(v['object_cover_height']), 'name': v['name']} for k, v in U.items()}
ts = ['// 自动生成：tools/gen-gimmick-placements.py（原版 StageSettingData.m_GimmickList → 引擎格）。勿手改。',
      '// 行 = [UnitId, 引擎 x, 引擎 y, 原版 direction]；units = UnitId → 预制体文件 / ObjectType(1 炸弹桶, 2 掩体) / ObjectCoverHeight',
      f'export const GIMMICK_UNITS: Record<number, {{ file: string; type: number; cover: number; name: string }}> = {json.dumps({int(k): v for k, v in units.items()}, ensure_ascii=False)};',
      f'export const GIMMICK_PLACEMENTS: Record<string, [number, number, number, number][]> = {json.dumps(out)};', '']
open(f'{here}/../src/view/gimmickData.ts', 'w', encoding='utf-8').write('\n'.join(ts))
print({k: len(v) for k, v in out.items()})
