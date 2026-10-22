# M4b：流程/探索演出改为声明式 recipe（契约 v1.3 §3a/§3b/§3d/§3e），交给 Director。只产出 JSON；index.ts 由 gen_recipes.py 统一组装。
# 时长一律 ≤ 上限（1 倍速）；explore:move 写「一格」，Director 按格数伸缩（整条 ≤2.0s）。
import json, os
D = os.path.join(os.path.dirname(__file__), '..', 'src', 'umbra', 'skins', 'p5r-red', 'recipes')
R = {}
def rec(id, event, duration, tracks, match=None, assets=None):
    r = {'id': id, 'event': event, 'duration': duration, 'assets': assets or [], 'tracks': tracks}
    if match: r['match'] = match
    R[id] = r

# ---------------- 探索（§3d / §3e）
rec('explore.move', 'explore:move', 230, [
    {'at': 0, 'prim': 'gridWalk', 'dur': 220, 'args': {'hop': 10, 'followHop': 6}},
])
rec('explore.sneak', 'explore:sneak', 330, [
    {'at': 0, 'prim': 'gridWalk', 'dur': 320, 'args': {'hop': 4, 'followHop': 3}},
])
rec('explore.cover', 'explore:cover', 270, [
    {'at': 0, 'prim': 'sfx', 'args': {'id': 'se.cover'}},
    {'at': 0, 'prim': 'gridSquash', 'dur': 260, 'args': {'at': '$actor', 'amp': 0.18}},
    {'at': 0, 'prim': 'gridMark', 'dur': 260, 'args': {'kind': 'cover', 'at': '$actor', 'color': '#6fd3ff', 'rise': 12}},
])
rec('explore.spotted', 'explore:spotted', 460, [
    {'at': 0, 'prim': 'sfx', 'args': {'id': 'se.spotted'}},
    {'at': 0, 'prim': 'gridMark', 'dur': 440, 'args': {'kind': 'bang', 'at': '$target', 'color': '@color.primary'}},
    {'at': 0, 'prim': 'flashScreen', 'dur': 200, 'args': {'color': '@color.primary', 'alpha': 0.45}},
    {'at': 0, 'prim': 'gridShake', 'dur': 440, 'args': {'px': 8}},
    {'at': 20, 'prim': 'vibrate', 'args': {'ms': 40}, 'minimal': 'skip'},
])
rec('explore.interact.chest', 'explore:interact', 370, [
    {'at': 0, 'prim': 'sfx', 'args': {'id': 'se.interact'}},
    {'at': 0, 'prim': 'gridProp', 'dur': 350, 'args': {}},
    {'at': 110, 'prim': 'gridMark', 'dur': 250, 'args': {'kind': 'star', 'at': '$cell', 'color': '#ffd34a', 'lift': 70}},
], match={'kind': 'chest'})
rec('explore.interact.device', 'explore:interact', 370, [
    {'at': 0, 'prim': 'sfx', 'args': {'id': 'se.interact'}},
    {'at': 0, 'prim': 'gridProp', 'dur': 350, 'args': {}},
    {'at': 0, 'prim': 'gridMark', 'dur': 340, 'args': {'kind': 'cell', 'color': '#ffd34a'}},
], match={'kind': 'device'})
rec('explore.exit', 'explore:exit', 760, [
    {'at': 0, 'prim': 'sfx', 'args': {'id': 'se.exit.open'}},
    {'at': 0, 'prim': 'gridProp', 'dur': 740, 'args': {}},
    {'at': 0, 'prim': 'gridMark', 'dur': 500, 'args': {'kind': 'cell', 'color': '@color.primary'}},
    {'at': 380, 'prim': 'gridShake', 'dur': 300, 'args': {'px': 5}},
])
rec('explore.scan', 'explore:scan', 370, [
    {'at': 0, 'prim': 'sfx', 'args': {'id': 'se.explore.scan'}},
    {'at': 0, 'prim': 'gridScan', 'dur': 360, 'args': {'color': '@color.primary', 'radius': 900, 'show': 2000}},
])
# 遭遇冲击（map:encounter，本作 0.35s；之后接战斗宿主的 battle:start，组合 ≤1.2s）
rec('map.encounter', 'map:encounter', 340, [
    {'at': 0, 'prim': 'gridSquash', 'dur': 300, 'args': {'at': '$target', 'grow': 0.6}, 'ease': 'outCubic'},
    {'at': 0, 'prim': 'slashPanels', 'dur': 340, 'args': {'colors': ['@color.primary', '#0a0a0a'], 'stagger': 60, 'angle': 0.35}},
    {'at': 0, 'prim': 'flashScreen', 'dur': 120, 'args': {'color': '#ffffff', 'alpha': 0.35}},
])

# ---------------- 预告信（§3b，3.0s 可跳过）
rec('callingcard.send', 'callingcard:send', 2850, [
    {'at': 0, 'prim': 'sfx', 'args': {'id': 'se.callingcard'}},
    {'at': 0, 'prim': 'dim', 'dur': 2850, 'layer': 'cutin', 'args': {'color': '#0a0a0a', 'alpha': 0.6, 'hold': True}},
    {'at': 0, 'prim': 'sprite', 'dur': 2850, 'layer': 'cutin', 'ease': 'inOutCubic',
     'args': {'asset': 'callingcard', 'height': 560, 'moveMs': 1250, 'from': {'x': 640, 'y': 370, 'scale': 1, 'rot': -0.04}, 'to': {'x': 1010, 'y': 250, 'scale': 0.42, 'rot': 0.26}}},
    {'at': 1150, 'prim': 'flashScreen', 'dur': 160, 'args': {'color': '#ffffff', 'alpha': 0.6}},
    {'at': 1200, 'prim': 'slashPanels', 'dur': 640, 'args': {'colors': ['@color.primary', '#0a0a0a', '#f4eedd'], 'stagger': 70, 'angle': 0.35}},
    {'at': 1650, 'prim': 'title', 'dur': 800, 'layer': 'trans', 'args': {'text': 'flow.cc.stamp', 'size': 104, 'pos': {'x': 600, 'y': 420}, 'rot': -0.12, 'invert': [0, 4, 9]}},
    {'at': 2350, 'prim': 'title', 'dur': 480, 'layer': 'trans', 'args': {'text': 'flow.cc.sent', 'size': 64, 'pos': {'x': 640, 'y': 560}, 'rot': -0.06, 'invert': [1]}},
], assets=['callingcard'])

# ---------------- BOSS（§3e #12 boss:intro 2.0s 可跳过；§3a boss:phase 2.0s 可跳过）
rec('boss.intro', 'boss:intro', 1880, [
    {'at': 0, 'prim': 'dim', 'dur': 1880, 'layer': 'cutin', 'args': {'color': '#0a0a0a', 'alpha': 0.55, 'hold': True}},
    {'at': 0, 'prim': 'slashPanels', 'dur': 700, 'args': {'colors': ['#0a0a0a', '@color.primary', '#0a0a0a'], 'stagger': 80, 'angle': 0.35}},
    {'at': 250, 'prim': 'sprite', 'dur': 1630, 'layer': 'cutin',
     'args': {'asset': '{tex}', 'height': 640, 'moveMs': 650, 'from': {'x': 1250, 'y': 380, 'scale': 1.2, 'alpha': 0}, 'to': {'x': 860, 'y': 390, 'scale': 1, 'alpha': 1}}},
    {'at': 300, 'prim': 'flashScreen', 'dur': 160, 'args': {'color': '@color.primary', 'alpha': 0.5}},
    {'at': 650, 'prim': 'title', 'dur': 800, 'layer': 'trans', 'args': {'text': '{bossRole}', 'size': 54, 'pos': {'x': 420, 'y': 250}, 'rot': -0.1, 'invert': [0]}},
    {'at': 950, 'prim': 'title', 'dur': 800, 'layer': 'trans', 'args': {'text': '{bossLabel}', 'size': 120, 'pos': {'x': 470, 'y': 380}, 'rot': -0.1, 'invert': [0, 3]}},
], assets=['enemy.boss1'])
rec('boss.phase', 'boss:phase', 1900, [
    {'at': 0, 'prim': 'sfx', 'args': {'id': 'se.boss.phase'}},
    {'at': 0, 'prim': 'flashScreen', 'dur': 200, 'args': {'color': '#ffffff', 'alpha': 0.85}},
    {'at': 0, 'prim': 'shake', 'args': {'px': 18}},
    {'at': 80, 'prim': 'radialBurst', 'dur': 1400, 'args': {'colors': ['@color.primary', '#0a0a0a'], 'rays': 18, 'alpha': 0.55, 'spin': 0.5, 'center': {'x': 760, 'y': 330}}},
    {'at': 200, 'prim': 'rgbSplit', 'dur': 150, 'args': {'offset': 8}},
    {'at': 260, 'prim': 'flashScreen', 'dur': 180, 'args': {'color': '@color.primary', 'alpha': 0.55}},
    {'at': 480, 'prim': 'title', 'dur': 700, 'layer': 'trans', 'args': {'text': 'flow.boss.phase', 'size': 60, 'pos': {'x': 640, 'y': 230}, 'rot': -0.08, 'invert': [1]}},
    {'at': 700, 'prim': 'title', 'dur': 800, 'layer': 'trans', 'args': {'text': '{bossName}', 'size': 110, 'pos': {'x': 640, 'y': 360}, 'rot': -0.1, 'invert': [0, 2]}},
])

# ---------------- 心之卡（§3a card:pick 0.6s，之后 DOM 三选一）
rec('card.pick', 'card:pick', 550, [
    {'at': 0, 'prim': 'flashScreen', 'dur': 120, 'args': {'color': '#ffffff', 'alpha': 0.5}},
    {'at': 0, 'prim': 'radialBurst', 'dur': 530, 'args': {'colors': ['@color.primary', '#0a0a0a'], 'rays': 16, 'alpha': 0.4, 'spin': 0.4, 'center': {'x': 640, 'y': 380}}},
    {'at': 30, 'prim': 'title', 'dur': 500, 'layer': 'trans', 'args': {'text': 'flow.card.title', 'size': 92, 'pos': {'x': 640, 'y': 330}, 'rot': -0.08, 'invert': [0, 3]}},
])

# ---------------- 失败 / 撤退 / 逃跑（§3e #13、§3b escape）
rec('run.fail', 'run:fail', 1450, [
    {'at': 0, 'prim': 'dim', 'dur': 1450, 'layer': 'cutin', 'args': {'color': '#0a0a0a', 'alpha': 0.7, 'hold': True}},
    {'at': 0, 'prim': 'flashScreen', 'dur': 200, 'args': {'color': '@color.primary', 'alpha': 0.6}},
    {'at': 100, 'prim': 'slashPanels', 'dur': 800, 'args': {'colors': ['#0a0a0a', '@color.primary', '#0a0a0a'], 'stagger': 90, 'angle': 0.35}},
    {'at': 500, 'prim': 'title', 'dur': 800, 'layer': 'trans', 'args': {'text': 'flow.fail.title', 'size': 128, 'pos': {'x': 640, 'y': 330}, 'rot': -0.1, 'invert': [0, 2]}},
    {'at': 900, 'prim': 'title', 'dur': 520, 'layer': 'trans', 'args': {'text': 'flow.fail.sub', 'size': 52, 'pos': {'x': 640, 'y': 470}, 'rot': -0.05, 'invert': [1]}},
])
rec('run.retreat', 'run:retreat', 980, [
    {'at': 0, 'prim': 'slashPanels', 'dur': 700, 'args': {'colors': ['#0a0a0a', '#f4eedd', '@color.primary'], 'stagger': 70, 'angle': -0.35, 'dir': 'ltr'}},
    {'at': 250, 'prim': 'title', 'dur': 700, 'layer': 'trans', 'args': {'text': 'flow.retreat.title', 'size': 110, 'pos': {'x': 640, 'y': 360}, 'rot': -0.1, 'invert': [0]}},
])
rec('escape.success', 'escape', 600, [
    {'at': 0, 'prim': 'flashScreen', 'dur': 120, 'args': {'color': '#ffffff', 'alpha': 0.4}},
    {'at': 0, 'prim': 'slashPanels', 'dur': 560, 'args': {'colors': ['#0a0a0a', '@color.primary'], 'stagger': 60, 'angle': -0.35, 'dir': 'ltr'}},
    {'at': 120, 'prim': 'title', 'dur': 440, 'layer': 'trans', 'args': {'text': 'flow.escape.ok', 'size': 96, 'pos': {'x': 640, 'y': 360}, 'rot': -0.1, 'invert': [0]}},
], match={'result': 'success'})
rec('escape.fail', 'escape', 500, [
    {'at': 0, 'prim': 'flashScreen', 'dur': 120, 'args': {'color': '@color.primary', 'alpha': 0.35}},
    {'at': 0, 'prim': 'title', 'dur': 480, 'layer': 'trans', 'args': {'text': 'flow.escape.ng', 'size': 84, 'pos': {'x': 640, 'y': 360}, 'rot': -0.1, 'invert': [1]}},
], match={'result': 'fail'})

for k, r in R.items():
    json.dump(r, open(os.path.join(D, k + '.json'), 'w'), ensure_ascii=False, indent=1)
print(len(R), 'flow recipes')
