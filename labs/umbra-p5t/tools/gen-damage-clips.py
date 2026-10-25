#!/usr/bin/env python3
"""r8：umbra-assets damage_ui（Codex a53ccda）原版 AnimationClip 曲线 + prefab_ui2d_damageview 布局 → src/view/damageClips.ts。
只是数值（关键帧时间/值/切线、RectTransform），不含贴图。曲线 key = [t, v, inSlope, outSlope]，向量曲线按分量拆开（.x/.y）。"""
import json, os, csv
A = os.environ.get('UMBRA_ASSETS', '/workspace/work/umbra-assets') + '/p5t/1_battle/r7/damage_ui'
here = os.path.dirname(os.path.abspath(__file__))
def num(v):
    return 0.0 if v is None else float(v)
clips = {}
for n in ['anime_btl_damage', 'anim_ui2d_damage_weak', 'anim_ui2d_damage_resist', 'anime_btl_heal', 'anime_btl_damage_description']:
    d = json.load(open(f'{A}/animations/clips/{n}.json', encoding='utf-8'))
    out = {}
    for c in d['curves']:
        base = (c['path'] or '.') + ':' + (c['attribute'] or c['curve_type'])
        k0 = c['keys'][0]['value']
        comps = ['x', 'y'] if isinstance(k0, dict) else [None]
        for comp in comps:
            key = base + ('.' + comp if comp else '')
            ks = []
            for k in c['keys']:
                g = (lambda o: num(o[comp])) if comp else num
                ks.append([round(k['time'], 5), round(g(k['value']), 5), round(g(k['inSlope']), 5), round(g(k['outSlope']), 5)])
            out[key] = ks
    clips[n] = {'dur': d['duration'], 'curves': out}
R = {r['path']: r for r in csv.DictReader(open(f'{A}/prefab/nodes.csv', encoding='utf-8'))}
def node(p):
    r = R['prefab_ui2d_damageview/' + p]
    return {k: json.loads(r[k]) for k in ('anchored_position', 'size_delta', 'scale', 'rotation_euler_deg')}
layout = {k: node(k) for k in ['Damage/ofs/AnimScaler/CodeScaler/GameObject', 'Damage/ofs/AnimScaler/CodeScaler/GameObject/number1', 'Damage/weak', 'Damage/resist', 'Damage/block', 'Damage/critical', 'Damage/Condition']}
ts = ['// 自动生成：tools/gen-damage-clips.py（原版 prefab_ui2d_damageview 布局 + 5 个 AnimationClip 曲线）。勿手改。',
      '// 曲线 key = [time, value, inSlope, outSlope]（Unity Hermite）；路径 "ofs/AnimScaler:scale.x" 等；单位 = 1920×1080 画布单位',
      f'export const DMG_CLIPS: Record<string, {{ dur: number; curves: Record<string, [number, number, number, number][]> }}> = {json.dumps(clips)};',
      f'export const DMG_LAYOUT: Record<string, {{ anchored_position: {{ x: number; y: number }}; size_delta: {{ x: number; y: number }}; scale: {{ x: number; y: number; z: number }}; rotation_euler_deg: {{ x: number; y: number; z: number }} }}> = {json.dumps(layout)};', '']
open(f'{here}/../src/view/damageClips.ts', 'w', encoding='utf-8').write('\n'.join(ts))
for n, c in clips.items(): print(n, list(c['curves']))
