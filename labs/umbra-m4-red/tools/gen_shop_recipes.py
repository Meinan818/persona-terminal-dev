# M5：商店进/离店与合成演出 recipe（契约 v1.3 §3b shop:enter 1.2s/0.5s、shop:exit 0.6s；§3a fusion:result 3.0s 可跳过）
# 只产出 JSON；index.ts 由 gen_recipes.py 统一组装（先跑本脚本，再跑 gen_recipes.py）。
import json, os
D = os.path.join(os.path.dirname(__file__), '..', 'src', 'umbra', 'skins', 'p5r-red', 'recipes')
R = {}
def rec(id, event, duration, tracks, match=None, assets=None):
    r = {'id': id, 'event': event, 'duration': duration, 'assets': assets or [], 'tracks': tracks}
    if match: r['match'] = match
    R[id] = r
# 各店配色：Untouchable 绿网/黑/白；武见 蓝/白；药妆店 黑/黄（FX-MAP G1：P5R 红=红黑斜切擦除 + 店招剪影落定，店色压在第二片）
SHOP = {'untouchable': ('#3fbf2a', 'shop.iwai', 'shop.title.untouchable'), 'takemi': ('#1f6bff', 'shop.takemi', 'shop.title.takemi'),
        'drugstore': ('#ffd21f', 'shop.vendor', 'shop.title.drugstore')}
for sid, (col, keeper, title) in SHOP.items():
    rec(f'shop.enter.{sid}.full', 'shop:enter', 1180, [
        {'at': 0, 'prim': 'sfx', 'args': {'id': 'se.shop.door'}},
        {'at': 0, 'prim': 'slashPanels', 'dur': 760, 'args': {'colors': ['#0a0a0a', '@color.primary', col], 'stagger': 70, 'angle': 0.35}},
        {'at': 260, 'prim': 'sprite', 'dur': 900, 'layer': 'trans', 'ease': 'outBack', 'args': {'asset': keeper, 'height': 600, 'moveMs': 300, 'out': 220,
            'from': {'x': 1180, 'y': 420, 'scale': 1.25, 'rot': 0.12, 'alpha': 0}, 'to': {'x': 960, 'y': 400, 'scale': 1, 'rot': 0, 'alpha': 1}}},
        {'at': 320, 'prim': 'title', 'dur': 800, 'layer': 'trans', 'args': {'text': title, 'size': 92, 'pos': {'x': 470, 'y': 330}, 'rot': -0.12, 'invert': [0, 3]}},
        {'at': 300, 'prim': 'flashScreen', 'dur': 120, 'args': {'color': '#ffffff', 'alpha': 0.35}},
    ], match={'kind': sid + '.full'}, assets=[keeper])
    rec(f'shop.enter.{sid}.short', 'shop:enter', 480, [
        {'at': 0, 'prim': 'sfx', 'args': {'id': 'se.shop.door'}},
        {'at': 0, 'prim': 'slashPanels', 'dur': 460, 'args': {'colors': ['#0a0a0a', col], 'stagger': 60, 'angle': 0.35}},
    ], match={'kind': sid + '.short'})
    rec(f'shop.exit.{sid}', 'shop:exit', 580, [
        {'at': 0, 'prim': 'sfx', 'args': {'id': 'se.shop.exit'}},
        {'at': 0, 'prim': 'slashPanels', 'dur': 560, 'args': {'colors': [col, '@color.primary', '#0a0a0a'], 'stagger': 60, 'angle': -0.35, 'dir': 'ltr'}},
        {'at': 120, 'prim': 'title', 'dur': 440, 'layer': 'trans', 'args': {'text': '{bye}', 'size': 58, 'pos': {'x': 640, 'y': 360}, 'rot': -0.08, 'invert': [1]}},
    ], match={'kind': sid})
# 天鹅绒进场（蓝色锁链擦除 + 「VELVET ROOM」）
rec('shop.enter.velvet.full', 'shop:enter', 1150, [
    {'at': 0, 'prim': 'sfx', 'args': {'id': 'se.shop.door'}},
    {'at': 0, 'prim': 'slashPanels', 'dur': 780, 'args': {'colors': ['#0a0a0a', '#1f3fbf', '#0b1e6b'], 'stagger': 80, 'angle': 0.35}},
    {'at': 300, 'prim': 'title', 'dur': 820, 'layer': 'trans', 'args': {'text': 'vel.title', 'size': 100, 'pos': {'x': 640, 'y': 340}, 'rot': -0.1, 'invert': [0, 2]}},
], match={'kind': 'velvet.full'})
rec('shop.enter.velvet.short', 'shop:enter', 480, [
    {'at': 0, 'prim': 'slashPanels', 'dur': 460, 'args': {'colors': ['#0a0a0a', '#1f3fbf'], 'stagger': 60, 'angle': 0.35}},
], match={'kind': 'velvet.short'})
rec('shop.exit.velvet', 'shop:exit', 560, [
    {'at': 0, 'prim': 'slashPanels', 'dur': 540, 'args': {'colors': ['#0b1e6b', '#1f3fbf', '#0a0a0a'], 'stagger': 60, 'angle': -0.35, 'dir': 'ltr'}},
], match={'kind': 'velvet'})
# 断头台二体合成（占位演出，§3a fusion:result ≤3.0s 可跳过）：两张面具图鉴图从左右押上 → 断头台落刀白闪 → 结果面具放大现身 + 剪报名
rec('fusion.result', 'fusion:result', 2950, [
    {'at': 0, 'prim': 'sfx', 'args': {'id': 'se.fusion'}},
    {'at': 0, 'prim': 'dim', 'dur': 2950, 'layer': 'cutin', 'args': {'color': '#050b2e', 'alpha': 0.7, 'hold': True}},
    {'at': 0, 'prim': 'sprite', 'dur': 1150, 'layer': 'cutin', 'ease': 'outCubic', 'args': {'asset': 'comp.{a}.l', 'height': 420, 'moveMs': 700, 'out': 120,
        'from': {'x': 120, 'y': 380, 'scale': 0.9, 'rot': -0.12, 'alpha': 0}, 'to': {'x': 470, 'y': 390, 'scale': 0.82, 'rot': -0.04, 'alpha': 1}}},
    {'at': 0, 'prim': 'sprite', 'dur': 1150, 'layer': 'cutin', 'ease': 'outCubic', 'args': {'asset': 'comp.{b}.l', 'height': 420, 'moveMs': 700, 'out': 120,
        'from': {'x': 1160, 'y': 380, 'scale': 0.9, 'rot': 0.12, 'alpha': 0}, 'to': {'x': 810, 'y': 390, 'scale': 0.82, 'rot': 0.04, 'alpha': 1}}},
    {'at': 380, 'prim': 'sprite', 'dur': 900, 'layer': 'cutin', 'ease': 'inCubic', 'args': {'asset': 'fx.guillotine', 'height': 640, 'moveMs': 520, 'out': 160,
        'from': {'x': 640, 'y': -260, 'scale': 1, 'rot': 0}, 'to': {'x': 640, 'y': 370, 'scale': 1, 'rot': 0}}},
    {'at': 900, 'prim': 'shake', 'dur': 260, 'args': {'px': 14}},
    {'at': 900, 'prim': 'flashScreen', 'dur': 200, 'args': {'color': '#ffffff', 'alpha': 0.9}},
    {'at': 920, 'prim': 'radialBurst', 'dur': 1300, 'args': {'colors': ['#1f3fbf', '#ffffff', '@color.primary'], 'rays': 18, 'alpha': 0.55, 'spin': 0.5, 'center': {'x': 640, 'y': 380}}},
    {'at': 1180, 'prim': 'sprite', 'dur': 1760, 'layer': 'cutin', 'ease': 'outBack', 'args': {'asset': 'comp.{personaId}.l', 'height': 560, 'moveMs': 420, 'out': 200,
        'from': {'x': 640, 'y': 390, 'scale': 0.2, 'rot': 0.2, 'alpha': 0}, 'to': {'x': 640, 'y': 380, 'scale': 1, 'rot': 0, 'alpha': 1}}},
    {'at': 1650, 'prim': 'title', 'dur': 1200, 'layer': 'trans', 'args': {'text': '{name}', 'size': 96, 'pos': {'x': 640, 'y': 600}, 'rot': -0.07, 'invert': [0, 3]}},
], assets=['fx.guillotine'])
for k, r in R.items():
    json.dump(r, open(os.path.join(D, k + '.json'), 'w'), ensure_ascii=False, indent=1)
print(len(R), 'shop/fusion recipes')
