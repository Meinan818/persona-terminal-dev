#!/usr/bin/env python3
"""r12：原版回合切换 prefab_ui2d_turn_change_{ally,enemy} + AnimationClip turn_start{,_enemy} → src/ui/data/turn-change.json。
读 umbra-assets/p5t/1_ui/turn_transition/prefabs/*.json（RectTransform/Image/CanvasGroup/RectMask2D 原值）与 animations/*.json（原版曲线，含切线）。
turn_text_image 在 prefab 里没有 Image 组件（运行时绑定）→ 绑 YOUR_TURN_YOUR_TURN / ENEMY_TURN_ENEMY（同包里唯一的字样 sprite，推断）。"""
import json, math, sys, os
UA = sys.argv[1] if len(sys.argv) > 1 else os.environ.get('UMBRA_ASSETS', os.path.normpath(os.path.join(os.path.dirname(os.path.abspath(__file__)), '../../../../umbra-assets')))
D = f'{UA}/p5t/1_ui/turn_transition'
def node(n):
    rt = n.get('rect_transform') or {}
    out = {'n': n['name']}
    if not n.get('active', True): out['off'] = 1
    if rt:
        q = rt.get('rotation') or rt.get('rotation_quaternion') or {'z': 0, 'w': 1}
        out.update(am=[rt['anchor_min']['x'], rt['anchor_min']['y']], aM=[rt['anchor_max']['x'], rt['anchor_max']['y']],
                   ap=[rt['anchored_position']['x'], rt['anchored_position']['y']], sd=[rt['size_delta']['x'], rt['size_delta']['y']],
                   pv=[rt['pivot']['x'], rt['pivot']['y']], sc=[rt['scale']['x'], rt['scale']['y']], rz=round(math.degrees(2 * math.atan2(q.get('z', 0), q.get('w', 1))), 4))
    for c in n.get('component_data', []):
        d = c.get('data', {})
        if c.get('class') == 'Image' or 'image' in c:
            im = c.get('image') or {}
            sp = (im.get('sprite') or {}).get('name')
            col = d.get('m_Color', {'r': 1, 'g': 1, 'b': 1, 'a': 1})
            out['img'] = {'sp': sp, 'type': d.get('m_Type', 0), 'fm': d.get('m_FillMethod', 0), 'fo': d.get('m_FillOrigin', 0), 'fa': d.get('m_FillAmount', 1),
                          'col': [round(col['r'], 4), round(col['g'], 4), round(col['b'], 4), round(col['a'], 4)]}
        if c.get('class') == 'Mask': out['smask'] = 1 if d.get('m_ShowMaskGraphic', 1) else 0
        if c.get('class') == 'RectMask2D': out['mask'] = [d['m_Padding'][k] for k in 'xyzw']
        if c.get('class') == 'CanvasGroup' or ('m_Alpha' in d and 'm_Interactable' in d): out['alpha'] = d['m_Alpha']
    if n['name'] == 'turn_text_image' and 'img' not in out: out['img'] = {'sp': None, 'type': 0, 'col': [1, 1, 1, 1], 'inferred': 1}
    kids = [node(k) for k in n.get('children', [])]
    # 导出树按 m_Father 重建、兄弟顺序不可靠；字样在帧上压在黑带/斜纹之上（other_3405、enemy_turn_3536_5）→ 放到兄弟最后（推断）
    kids.sort(key=lambda k: k['n'] == 'turn_text_image')
    if kids: out['k'] = kids
    return out
def clip(f):
    a = json.load(open(f'{D}/animations/{f}.json'))
    cs = []
    for c in a['m_FloatCurves']:
        cs.append({'p': c['path'], 'a': c['attribute'], 'k': [[round(k['time'], 4), k['value'], k.get('inSlope', 0), k.get('outSlope', 0)] for k in c['curve']['m_Curve']]})
    for c in a['m_ScaleCurves']:
        for i, ax in enumerate('xy'):
            cs.append({'p': c['path'], 'a': 'm_LocalScale.' + ax, 'k': [[round(k['time'], 4), k['value'][ax], k['inSlope'][ax] if isinstance(k.get('inSlope'), dict) else 0, k['outSlope'][ax] if isinstance(k.get('outSlope'), dict) else 0] for k in c['curve']['m_Curve']]})
    for c in a['m_RotationCurves']:
        ks = c['curve']['m_Curve']
        zs = [round(math.degrees(2 * math.atan2(k['value']['z'], k['value']['w'])), 3) for k in ks]
        cs.append({'p': c['path'], 'a': 'rz', 'k': [[round(k['time'], 4), z, 0, 0] for k, z in zip(ks, zs)], 'lin': 1})
    return {'len': max(k[0] for c in cs for k in c['k']), 'curves': cs}
out = {'_src': 'umbra-assets p5t/1_ui/turn_transition（prefabs + animations，原值）；画布 1920×1080', 'ally': node(json.load(open(f'{D}/prefabs/prefab_ui2d_turn_change_ally.json'))),
       'enemy': node(json.load(open(f'{D}/prefabs/prefab_ui2d_turn_change_enemy.json'))), 'clipAlly': clip('turn_start'), 'clipEnemy': clip('turn_start_enemy')}
def setText(n, sp):
    if n['n'] == 'turn_text_image': n['img']['sp'] = sp
    for k in n.get('k', []): setText(k, sp)
setText(out['ally'], 'YOUR_TURN_YOUR_TURN'); setText(out['enemy'], 'ENEMY_TURN_ENEMY')
dst = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'src', 'ui', 'data', 'turn-change.json')
json.dump(out, open(dst, 'w'), ensure_ascii=False, separators=(',', ':'))
print('ok', os.path.getsize(dst), out['clipAlly']['len'], len(out['clipAlly']['curves']))
def show(n, d=0):
    print('  ' * d + n['n'], n.get('img', {}).get('sp', ''), n.get('mask', ''), n.get('alpha', ''), n.get('rz', ''), 'OFF' if n.get('off') else '')
    for k in n.get('k', []): show(k, d + 1)
show(out['ally'])
