#!/usr/bin/env python3
"""r12：原版结算 prefab_ui2d_result_win（page1 = money/exp/persona_exp，page2 = item/turn/award）RectTransform → src/ui/data/result-layout.json。
同 gen-skill-list-layout.py 的父链换算（画布 1920×1080，左上原点）。另附 stage_rewards.csv 里 L01–L09 对应 StageId 的 Money/StageBaseExp/StagePersonaExp。
贴图全部 serialized_null（运行时绑定，image/battle/result 未导出）→ 游戏里画纯色块占位并标「待原版贴图」。"""
import csv, json, math, sys, os
UA = sys.argv[1] if len(sys.argv) > 1 else os.environ.get('UMBRA_ASSETS', os.path.normpath(os.path.join(os.path.dirname(os.path.abspath(__file__)), '../../../../umbra-assets')))
W, H = 1920.0, 1080.0
rows = list(csv.DictReader(open(f'{UA}/p5t/1_ui/ui_layout_v2/screens/result/nodes.csv', encoding='utf-8-sig')))
by = {}
for r in rows: by.setdefault(r['path'], r)  # 同名兄弟只取第一个（prefab 里 smoke/base 有重名）
J = lambda s: json.loads(s) if s else None
cache = {}
def node(p):
    if p in cache: return cache[p]
    r = by[p]; par = p.rsplit('/', 1)[0] if '/' in p else None
    if par is None or par not in by or not r['anchor_min']:
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
    cache[p] = dict(x0=cx + ox * c - oy * s, y0=cy + ox * s + oy * c, w=w, h=h, sx=sx, sy=sy, rot=rot)
    return cache[p]
def box(p):
    R = node(p); c, s = math.cos(math.radians(R['rot'])), math.sin(math.radians(R['rot']))
    pts = [(R['x0'] + u * c - v * s, R['y0'] + u * s + v * c) for u, v in [(0, 0), (R['w'] * R['sx'], 0), (0, R['h'] * R['sy']), (R['w'] * R['sx'], R['h'] * R['sy'])]]
    xs = [q[0] for q in pts]; ys = [H - q[1] for q in pts]
    return [round(min(xs), 1), round(min(ys), 1), round(max(xs) - min(xs), 1), round(max(ys) - min(ys), 1)]
R = 'prefab_ui2d_result_win/bg_ui_position/bg_ui_red/bg_ui_white/bg_ui_capture/'
P1, P2 = R + 'page1/', R + 'page2/'
pick = {
  'p1': {
    'money_base': P1 + 'money/money_base', 'money_title': P1 + 'money/money_title', 'money_num': P1 + 'money/Text (TMP)', 'money_icon': P1 + 'money/Text (TMP)/money_icon',
    'exp_base': P1 + 'exp/exp_base', 'exp_title': P1 + 'exp/exp_title', 'exp_label': P1 + 'exp/exp', 'exp_num': P1 + 'exp/exp/Text (TMP)', 'exp_gauge': P1 + 'exp/exp_gauge',
    'pexp_base': P1 + 'persona_exp/persona_exp_base', 'pexp_title': P1 + 'persona_exp/persona_exp_title',
    **{f'c{i}_{k}': P1 + f'persona_exp/exp_char{i}/' + v for i in (1, 2, 3) for k, v in {'face': 'exp_face', 'gauge': 'exp_persona/exp_gauge_gray', 'name': 'exp_persona/Text (TMP)', 'lv': 'exp_persona/exp_lv'}.items()},
    'next': P1 + 'next', 'next_btn': P1 + 'next/next_button',
  },
  'p2': {
    'item_base': P2 + 'item_small/item_base', 'item_title': P2 + 'item_small/item_title', 'item_none': P2 + 'item_small/item_none',
    'turn_base': P2 + 'turn/turn_base', 'turn_title': P2 + 'turn/turn_title', 'turn_num': P2 + 'turn/turn/Text (TMP)',
    'award_base': P2 + 'award/award_base', 'award_title': P2 + 'award/award_title',
    'next': P2 + 'next', 'next_btn': P2 + 'next/next_button',
  },
}
out = {'_src': 'umbra-assets p5t/1_ui/ui_layout_v2/screens/result/nodes.csv（prefab_ui2d_result_win）；[x,y,w,h] 画布 1920×1080 左上原点', 'canvas': [W, H]}
for pg, d in pick.items(): out[pg] = {k: box(v) for k, v in d.items()}
# award 三行（同名 Toggle 兄弟，按 nodes.csv 出现顺序取三个）
tg = [r for r in rows if r['path'] == P2 + 'award/Toggle']
base = node(P2 + 'award')
aw = []
for r in tg:
    ap = J(r['anchored_position'])
    cx, cy = base['x0'] + base['w'] / 2 + ap['x'], base['y0'] + base['h'] / 2 + ap['y']
    aw.append({'box': [round(cx - 25.5, 1), round(H - cy - 25.5, 1), 51, 51], 'text': [round(cx + 25.5 + 8, 1), round(H - cy - 25 - 0.5, 1), 500, 50]})
out['p2']['award_rows'] = sorted(aw, key=lambda a: a['box'][1])
rw = {r['TargetStageID'].lstrip('0'): r for r in csv.DictReader(open(f'{UA}/p5t/1_data/stage_rewards.csv', encoding='utf-8-sig'))}
LV = {'L01': '1010', 'L02': '1020', 'L03': '1030', 'L04': '1040', 'L05': '1050', 'L06': '1090', 'L07': '1080', 'L08': '1210', 'L09': '1070'}
out['rewards'] = {k: {'money': int(rw[v]['Money']), 'exp': int(rw[v]['StageBaseExp']), 'personaExp': int(rw[v]['StagePersonaExp']), 'stage': v} for k, v in LV.items() if v in rw}
dst = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'src', 'ui', 'data', 'result-layout.json')
json.dump(out, open(dst, 'w'), ensure_ascii=False, indent=1)
for pg in ('p1', 'p2'):
    for k, v in out[pg].items(): print(pg, k, v if not isinstance(v, list) or not v or not isinstance(v[0], dict) else v)
print(out['rewards'])
