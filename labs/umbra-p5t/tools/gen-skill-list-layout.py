#!/usr/bin/env python3
"""r10：原版技能列表 prefab_ui2d_skill_select 的 RectTransform → src/ui/data/skill-list-layout.json。
读 umbra-assets/p5t/1_ui/ui_layout_v2/screens/skill_list/nodes.csv，按父链（锚点/轴心/位移/尺寸/缩放/旋转 z）算出每个节点在
Unity 画布 1920×1080（左上原点、y 向下）里的外接矩形和旋转。画布参考分辨率 1920×1080 是推断：用它换算后与原版帧 skill_list_1717_2
（1280×720）对得上（黑面板 x92–691 y414–691 vs 帧 160–685/415–690；红色光标 x199–604 y471–502 vs 帧 210–615/466–498；
说明 y601–634 vs 帧 612–640）。用法：python3 tools/gen-skill-list-layout.py [umbra-assets]"""
import csv, json, math, sys, os
UA = sys.argv[1] if len(sys.argv) > 1 else os.environ.get('UMBRA_ASSETS', os.path.normpath(os.path.join(os.path.dirname(os.path.abspath(__file__)), '../../../../umbra-assets')))
W, H = 1920.0, 1080.0
rows = list(csv.DictReader(open(f'{UA}/p5t/1_ui/ui_layout_v2/screens/skill_list/nodes.csv', encoding='utf-8-sig')))
by = {r['path']: r for r in rows}
J = lambda s: json.loads(s) if s else None
cache = {}
def node(p):
    if p in cache: return cache[p]
    r = by[p]; par = p.rsplit('/', 1)[0] if '/' in p else None
    if par is None or par not in by:
        cache[p] = dict(x0=0, y0=0, w=W, h=H, sx=1, sy=1, rot=0); return cache[p]
    P = node(par)
    amin, amax, ap, sd, pv = J(r['anchor_min']), J(r['anchor_max']), J(r['anchored_position']), J(r['size_delta']), J(r['pivot'])
    sc = J(r['scale']) or {'x': 1, 'y': 1}; eu = J(r['rotation_euler_deg']) or {'z': 0}
    pw, ph = P['w'], P['h']
    ax0, ax1, ay0, ay1 = amin['x'] * pw, amax['x'] * pw, amin['y'] * ph, amax['y'] * ph
    w, h = ax1 - ax0 + sd['x'], ay1 - ay0 + sd['y']
    px, py = ax0 + (ax1 - ax0) * pv['x'] + ap['x'], ay0 + (ay1 - ay0) * pv['y'] + ap['y']
    c, s = math.cos(math.radians(P['rot'])), math.sin(math.radians(P['rot']))
    lx, ly = px * P['sx'], py * P['sy']
    cx, cy = P['x0'] + lx * c - ly * s, P['y0'] + lx * s + ly * c
    sx, sy, rot = P['sx'] * sc['x'], P['sy'] * sc['y'], P['rot'] + eu['z']
    c, s = math.cos(math.radians(rot)), math.sin(math.radians(rot))
    ox, oy = -pv['x'] * w * sx, -pv['y'] * h * sy
    cache[p] = dict(x0=cx + ox * c - oy * s, y0=cy + ox * s + oy * c, w=w, h=h, sx=sx, sy=sy, rot=rot, cx=cx, cy=cy)
    return cache[p]
def box(p):
    R = node(p); c, s = math.cos(math.radians(R['rot'])), math.sin(math.radians(R['rot']))
    pts = [(R['x0'] + u * c - v * s, R['y0'] + u * s + v * c) for u, v in [(0, 0), (R['w'] * R['sx'], 0), (0, R['h'] * R['sy']), (R['w'] * R['sx'], R['h'] * R['sy'])]]
    xs = [q[0] for q in pts]; ys = [H - q[1] for q in pts]
    return {'x': round(min(xs), 1), 'y': round(min(ys), 1), 'w': round(max(xs) - min(xs), 1), 'h': round(max(ys) - min(ys), 1), 'rot': round(R['rot'], 2)}
B = 'prefab_ui2d_skill_select/CommandParent/'
WG = B + 'Command/action_window/window_group/'
C = WG + 'command_parent/Scroll View/Viewport/Content/prefab_ui2d_skill_contents (4)/offset/'
C5 = WG + 'command_parent/Scroll View/Viewport/Content/prefab_ui2d_skill_contents (5)/offset/'
ST = B + 'CharacterGroup/status/'
pick = {
  'window': B + 'Command/action_window', 'cursor': WG + 'command_parent/cursor_contents/cursor', 'viewport': WG + 'command_parent/Scroll View/Viewport',
  'row0': WG + 'command_parent/Scroll View/Viewport/Content/prefab_ui2d_skill_contents (4)', 'row1': WG + 'command_parent/Scroll View/Viewport/Content/prefab_ui2d_skill_contents (5)',
  'label': C + 'Image', 'name': C + 'skill_name', 'cost': C + 'skill_cost', 'costSp': C + 'skill_cost/sp', 'label1': C5 + 'Image',
  'scrollbar': WG + 'command_parent/Scroll View/Scrollbar Vertical',
  'info': WG + 'skill_info', 'dmgWin': WG + 'damage/damage_window', 'dmgNum': WG + 'damage/damage_window/damage_num', 'dmgIcon': WG + 'damage/damage_label/damage_icon',
  'chara': B + 'CharacterGroup/chara/Character', 'charaShadow': B + 'CharacterGroup/chara/Character_Shadow',
  'hpNum': ST + 'hp/hp_num/num', 'spNum': ST + 'sp/sp_num/num', 'hpGauge': ST + 'hp/hp_gauge', 'spGauge': ST + 'sp/sp_gauge', 'hpLabel': ST + 'hp_label', 'spLabel': ST + 'sp_label', 'slash': ST + 'slash',
}
out = {'_src': 'umbra-assets p5t/1_ui/ui_layout_v2/screens/skill_list/nodes.csv（prefab_ui2d_skill_select）；画布 1920×1080 左上原点，单位=画布像素', 'canvas': [W, H]}
for k, p in pick.items(): out[k] = box(p)
out['rowPitch'] = round(out['row1']['y'] - out['row0']['y'], 1)
out['rowStagger'] = round(out['label1']['x'] - out['label']['x'], 1)
dst = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'src', 'ui', 'data', 'skill-list-layout.json')
json.dump(out, open(dst, 'w'), ensure_ascii=False, indent=1)
for k, v in out.items(): print(k, v)
