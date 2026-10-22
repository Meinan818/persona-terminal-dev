# 生成 p5r-red 的技能 recipe（每个技能 full/quick 两版：同场首次召唤完整版、之后快速版）+ 1 MORE / BATON / SHOWTIME / 动作 recipe。
# 只产出数据（JSON），皮肤里没有演出代码。时长全部按契约 §3：我方 action ≤1800（含停帧），highlight ≤3500。
import json, os
D = os.path.join(os.path.dirname(__file__), '..', 'src', 'umbra', 'skins', 'p5r-red', 'recipes')

EL = {  # element: colors, frames, gravity, burst rays colors
 'curse': (['#2a0033', '#7a2bd6', '#e5191c', '#0a0a0a'], ['ink', 'smoke'], -700),
 'elec':  (['#fff7a0', '#ffe600', '#ffffff', '#0a0a0a'], ['spark', 'streak'], 0),
 'fire':  (['#ffe14a', '#ff7a1a', '#e5191c', '#2a0a00'], ['smoke', 'disc'], -900),
 'wind':  (['#d9ffe0', '#37e15a', '#ffffff', '#0a3a10'], ['streak', 'shard'], -200),
 'ice':   (['#ffffff', '#a8ecff', '#5fd4ff', '#0a2a4a'], ['shard', 'square'], 600),
 'nuke':  (['#ffffff', '#3fd0ff', '#ff5ad2', '#0a0a2a'], ['disc', 'star'], 0),
 'psy':   (['#ffffff', '#ff5ad2', '#b02aff', '#2a002a'], ['disc', 'spark'], -300),
 'bless': (['#ffffff', '#ffe14a', '#fff7d0', '#7a5a00'], ['star', 'streak'], -400),
 'phys':  (['#ffffff', '#e5191c', '#0a0a0a', '#f08a1c'], ['shard', 'spark', 'star'], 900),
 'heal':  (['#ffffff', '#37e15a', '#b9ffc9'], ['disc', 'star'], -500),
 'support': (['#ffffff', '#37d6e8', '#e5191c'], ['square', 'streak'], 300),
}
# skillId: element, kind（magic/phys/heal/buff/debuff）
SK = {
 'eiha': ('curse', 'magic'), 'cleave': ('phys', 'phys'), 'sukunda': ('support', 'debuff'),
 'zio': ('elec', 'magic'), 'lunge': ('phys', 'phys'), 'tarukaja': ('support', 'buff'),
 'garu': ('wind', 'magic'), 'dia': ('heal', 'heal'),
 'agi': ('fire', 'magic'), 'tarunda': ('support', 'debuff'),
 'bufu': ('ice', 'magic'), 'frei': ('nuke', 'magic'), 'rakukaja': ('support', 'buff'),
 'psi': ('psy', 'magic'), 'rakunda': ('support', 'debuff'), 'kouha': ('bless', 'magic'),
}
SUMMON = {'full': 820, 'quick': 440}
CAST = 880

def hitpack(h, el, heavy=True):
    cols, frames, grav = EL[el]
    return [
        {'at': h, 'prim': 'hitStop', 'args': {'ms': 70 if heavy else 50}},
        {'at': h, 'prim': 'shake', 'args': {'px': 22 if heavy else 14}},
        {'at': h, 'prim': 'flashSprite', 'args': {'target': '$targets', 'ms': 50}},
        {'at': h, 'prim': 'squashHit', 'args': {'target': '$targets', 'squash': 0.2, 'push': 24, 'recoverMs': 320}},
        {'at': h, 'prim': 'pose', 'dur': 420, 'args': {'target': '$targets', 'keys': [{'at': 0, 'pose': 'idle'}, {'at': 0.25, 'pose': 'recoil', 'ease': 'outCubic'}, {'at': 1, 'pose': 'idle', 'ease': 'outElastic'}]}},
        {'at': h, 'prim': 'rgbSplit', 'dur': 90, 'args': {'offset': 9}},
        {'at': h + 150, 'prim': 'shockwave', 'dur': 300, 'args': {'center': {'x': '$target', 'y': '$target'}, 'amp': 42}, 'minimal': 'skip'},
        {'at': h, 'prim': 'particles', 'args': {'count': 260, 'at': {'x': '$target', 'y': '$target'}, 'speed': 1400, 'life': 560, 'frames': frames + ['shard', 'star'], 'colors': cols, 'gravity': grav}},
        {'at': h, 'prim': 'damageNumber', 'dur': 560, 'args': {'font': '@font.number', 'big': True}},
        {'at': h, 'prim': 'tag', 'dur': 560, 'args': {'kind': 'auto'}},
        {'at': h, 'prim': 'sfx', 'args': {'id': 'hit.heavy'}},
    ]

def skill(sid, el, kind, ver):
    S = SUMMON[ver]; dur = S + CAST
    cols, frames, grav = EL[el]
    tr = [
        {'at': 0, 'prim': 'summon', 'dur': S, 'args': {}},
        {'at': 0, 'prim': 'sfx', 'args': {'id': 'persona'}},
        # 角色动作：起手（重心后移、手抬到面具）→ 扯面具（挥臂、扭身）→ 施法（前倾/指向）→ 收势；全程缓动插值
        {'at': 0, 'prim': 'pose', 'dur': dur - 40, 'args': {'target': '$actor', 'keys': [
            {'at': 0, 'pose': 'idle'}, {'at': S * 0.12 / dur, 'pose': 'windup', 'ease': 'outCubic'}, {'at': S * 0.3 / dur, 'pose': 'grab', 'ease': 'inOutCubic'},
            {'at': S * 0.48 / dur, 'pose': 'rip', 'ease': 'outBack'}, {'at': (S + 240) / dur, 'pose': 'cast', 'ease': 'outCubic'},
            {'at': (S + 640) / dur, 'pose': 'cast'}, {'at': 1, 'pose': 'settle', 'ease': 'inOutCubic'}]}},
        {'at': S - 80, 'prim': 'personaShow', 'dur': 760 if kind in ('magic', 'heal') else 620, 'args': {'dx': -130, 'dy': -30, 'scale': 0.95}},
        {'at': S, 'prim': 'nameplate', 'dur': CAST - 120, 'args': {'element': el}},
        # 第五阶段：施法镜头 —— 从行动者背后推向目标、轻微滚转，命中后回落（伪 3D：背景/敌人/前景按景深视差）
        {'at': S - 40, 'prim': 'camera', 'dur': CAST - 40, 'args': {'focus': '$target' if kind != 'buff' and kind != 'heal' else '$actor', 'keys': [
            {'at': 0}, {'at': 0.3, 'x': -70 if kind not in ('buff', 'heal') else 40, 'y': -10, 'zoom': 0.15, 'rot': 0.018, 'ease': 'outCubic'},
            {'at': 0.62, 'x': -50 if kind not in ('buff', 'heal') else 30, 'y': -6, 'zoom': 0.11, 'rot': 0.01}, {'at': 1, 'ease': 'inOutCubic'}]}, 'minimal': 'skip'},
    ]
    if kind == 'magic':
        h = S + 300
        tr += [
            {'at': S, 'prim': 'dim', 'dur': 520, 'args': {'color': '#000', 'alpha': 0.35}},
            {'at': S + 80, 'prim': 'particles', 'args': {'count': 50, 'at': {'x': '$actor', 'y': '$actor', 'dy': -60}, 'speed': 1600, 'dir': 3.4, 'spread': 0.35, 'gravity': 0, 'life': 360, 'frames': ['streak'], 'colors': cols[:3]}},
            {'at': S + 200, 'prim': 'radialBurst', 'dur': 520, 'layer': 'fx', 'args': {'rays': 16, 'colors': [cols[1], '#0a0a0a'], 'spin': 0.8, 'alpha': 0.35, 'center': {'x': '$target', 'y': '$target'}}},
            {'at': S + 200, 'prim': 'particles', 'args': {'count': 110, 'at': {'x': '$target', 'y': '$target', 'dy': 110}, 'speed': 520, 'dir': -1.5708, 'spread': 1.1, 'gravity': grav, 'life': 560, 'size': 2.0, 'grow': True, 'frames': frames, 'colors': cols}},
            {'at': S + 200, 'prim': 'sfx', 'args': {'id': el}},
        ] + hitpack(h, el)
        marks = [h]
    elif kind == 'phys':
        h = S + 300
        tr += [
            {'at': S, 'prim': 'pose', 'dur': 0, 'args': {}} if False else {'at': S + 40, 'prim': 'afterimage', 'dur': 240, 'args': {'actor': '$actor', 'to': {'x': '$target', 'y': '$target', 'dx': 150, 'dy': 40}, 'n': 3, 'scaleTo': 0.62}},
            {'at': S + 300, 'prim': 'slashLine', 'dur': 150, 'args': {'len': 760, 'width': 22, 'rot': -0.75, 'jitter': 20}},
            {'at': S + 340, 'prim': 'slashLine', 'dur': 150, 'args': {'len': 700, 'width': 18, 'rot': 0.6, 'jitter': 20}},
            {'at': S + 560, 'prim': 'tween', 'dur': 300, 'args': {'target': '$actor', 'to': {'x': 'home', 'y': 'home', 'scale': 1}}},
        ] + hitpack(h, el)
        marks = [h]
    elif kind == 'heal':
        h = S + 300
        tr += [
            {'at': S + 100, 'prim': 'particles', 'args': {'count': 120, 'at': {'x': '$actor', 'y': '$actor', 'dy': 60}, 'speed': 360, 'dir': -1.5708, 'spread': 1.0, 'gravity': -500, 'life': 620, 'frames': frames, 'colors': cols}},
            {'at': S + 160, 'prim': 'radialBurst', 'dur': 500, 'layer': 'fx', 'args': {'rays': 12, 'colors': ['#37e15a', '#ffffff'], 'spin': 0.4, 'alpha': 0.3, 'center': {'x': '$actor', 'y': '$actor'}}},
            {'at': h, 'prim': 'damageNumber', 'dur': 560, 'args': {'font': '@font.number', 'big': False}},
            {'at': h, 'prim': 'sfx', 'args': {'id': 'heal'}},
        ]
        marks = [h]
    else:  # buff / debuff
        h = S + 300
        tgt = '$actor' if kind == 'buff' else '$target'
        tr += [
            {'at': S + 120, 'prim': 'particles', 'args': {'count': 100, 'at': {'x': tgt, 'y': tgt}, 'speed': 320, 'dir': -1.5708 if kind == 'buff' else 1.5708, 'spread': 0.8, 'gravity': -300 if kind == 'buff' else 300, 'life': 560, 'frames': ['streak', 'square'], 'colors': ['#37d6e8', '#ffffff'] if kind == 'buff' else ['#e5191c', '#0a0a0a', '#ffffff']}},
            {'at': h, 'prim': 'flashSprite', 'args': {'target': '$targets', 'ms': 40}},
            {'at': h, 'prim': 'tag', 'dur': 480, 'args': {'kind': 'auto'}},
            {'at': h, 'prim': 'sfx', 'args': {'id': kind}},
        ]
        marks = [h]
    r = {'id': f'skill.{sid}' + ('' if ver == 'full' else '.q'), 'event': 'action', 'match': {'skillId': sid, 'summon': ver},
         'duration': dur, 'hitMarks': marks, 'assets': ['char.$actor', 'persona.$actor'], 'tracks': sorted(tr, key=lambda t: t['at'])}
    return r

out = {}
for sid, (el, kind) in SK.items():
    for ver in ('full', 'quick'): r = skill(sid, el, kind, ver); out[r['id']] = r

# 普攻：前冲挥砍 + 回位（姿态缓动）
out['action.attack'] = {'id': 'action.attack', 'event': 'action', 'match': {'skillId': 'attack'}, 'duration': 1100, 'hitMarks': [440], 'assets': [], 'tracks': sorted([
    {'at': 0, 'prim': 'sfx', 'args': {'id': 'swing'}},
    {'at': 0, 'prim': 'pose', 'dur': 940, 'args': {'target': '$actor', 'keys': [{'at': 0, 'pose': 'idle'}, {'at': 0.1, 'pose': 'windup', 'ease': 'outCubic'},
        {'at': 0.32, 'pose': 'dash', 'ease': 'inCubic'}, {'at': 0.48, 'pose': 'slash', 'ease': 'outBack'}, {'at': 0.72, 'pose': 'slash'}, {'at': 1, 'pose': 'idle', 'ease': 'inOutCubic'}]}},
    {'at': 100, 'prim': 'afterimage', 'dur': 300, 'args': {'actor': '$actor', 'to': {'x': '$target', 'y': '$target', 'dx': 150, 'dy': 40}, 'n': 3, 'scaleTo': 0.62, 'tints': ['#ffffff', '@color.primary', '#ffffff']}},
    {'at': 0, 'prim': 'camera', 'dur': 1000, 'args': {'focus': '$target', 'keys': [{'at': 0}, {'at': 0.12, 'x': 30, 'zoom': 0.04, 'ease': 'outCubic'},
        {'at': 0.42, 'x': -90, 'y': -10, 'zoom': 0.2, 'rot': -0.022, 'ease': 'inCubic'}, {'at': 0.7, 'x': -70, 'y': -6, 'zoom': 0.16, 'rot': -0.012}, {'at': 1, 'ease': 'inOutCubic'}]}, 'minimal': 'skip'},
    {'at': 400, 'prim': 'slashLine', 'dur': 140, 'args': {'len': 560, 'width': 18, 'rot': -0.7, 'jitter': 30}},
    {'at': 440, 'prim': 'slashLine', 'dur': 140, 'args': {'len': 520, 'width': 14, 'rot': 0.55, 'jitter': 30}},
] + [x for x in hitpack(440, 'phys', heavy=False) if x['prim'] != 'shockwave'] + [
    {'at': 600, 'prim': 'tween', 'dur': 320, 'args': {'target': '$actor', 'to': {'x': 'home', 'y': 'home', 'scale': 1}}},
], key=lambda t: t['at'])}

# 1 MORE：去色定格（皮肤滤镜 ColorMatrix）+ 行动者眼部横条 cut-in（原作对齐：倒地瞬间）+ 1 MORE 横幅
out['onemore'] = {'id': 'onemore', 'event': 'onemore', 'duration': 420, 'assets': ['char.$actor'], 'tracks': [
    {'at': 0, 'prim': 'skinFilter', 'dur': 420, 'args': {'kind': 'grey', 'amount': 1}},   # 第四阶段：原作中灰（去色 + 抬黑位压对比），不再额外压暗
    {'at': 0, 'prim': 'cutin', 'dur': 300, 'ease': 'outCubic', 'args': {'bandAngle': -0.14, 'speedLines': {'layers': 2, 'count': 46}, 'panels': [{'shape': [], 'art': 'char.$actor#cutin', 'enterFrom': 'left'}]}, 'minimal': {'dur': 160}},
    {'at': 0, 'prim': 'sfx', 'args': {'id': 'cutin'}},
    {'at': 150, 'prim': 'flashScreen', 'dur': 90, 'args': {'color': '#ffffff', 'alpha': 0.45}},
    {'at': 140, 'prim': 'banner', 'dur': 280, 'args': {'text': 'label.onemore', 'shape': 'onemore', 'enterFrom': 'right'}},
    {'at': 150, 'prim': 'particles', 'args': {'count': 40, 'at': {'x': 640, 'y': 330}, 'speed': 1300, 'life': 260, 'gravity': 0, 'frames': ['star', 'shard'], 'colors': ['#ffffff', '@color.primary', '#0a0a0a']}, 'minimal': 'skip'},
    {'at': 150, 'prim': 'sfx', 'args': {'id': 'onemore'}},
]}

# BATON PASS：击掌交接（payload.actorId = 交出者，targetIds[0] = 接棒者）
out['baton'] = {'id': 'baton', 'event': 'baton', 'duration': 540, 'assets': ['char.$actor'], 'tracks': [
    {'at': 0, 'prim': 'batonPass', 'dur': 540, 'args': {}},
    {'at': 0, 'prim': 'sfx', 'args': {'id': 'baton'}},
]}

# SHOWTIME（highlight）：剪报 SHOWTIME 字 → 两人眼部横条接力 → 官方定格画 + 全体伤害 → TOTAL
out['highlight.showtime'] = {'id': 'highlight.showtime', 'event': 'highlight', 'duration': 3360, 'hitMarks': [2120], 'assets': ['show.$pair', 'duo.$pair', 'char.$a', 'char.$b'], 'tracks': sorted([
    # 第四阶段：按原作双人连携结构重做 —— ① 漫画分格开场（0–1000）② 人物入场（960–1900）③ 合击（1840–2540，命中 2120）④ 定格画 + 标题（2380–3360；+ 停帧 70 ≈ 墙钟 3440 ≤ 3500，留一帧余量）
    {'at': 0, 'prim': 'sfx', 'args': {'id': 'showtime'}},
    {'at': 0, 'prim': 'comicPanels', 'dur': 1000, 'args': {}},
    {'at': 380, 'prim': 'showtimeLogo', 'dur': 620, 'args': {}},
    {'at': 960, 'prim': 'duoEntrance', 'dur': 940, 'args': {}},
    {'at': 960, 'prim': 'flashScreen', 'dur': 90, 'args': {'color': '#ffffff', 'alpha': 0.5}},
    {'at': 1840, 'prim': 'dim', 'dur': 700, 'args': {'color': '#000', 'alpha': 0.45, 'hold': False}},
    {'at': 1840, 'prim': 'duoStrike', 'dur': 620, 'args': {}},
    # 第五阶段：合击镜头 —— 回到战场时从敌群上方斜俯推入，命中帧（p≈0.45）猛推 + 反向滚转，随后缓推进定格画
    {'at': 1840, 'prim': 'camera', 'dur': 620, 'args': {'focus': '$target', 'keys': [{'at': 0, 'x': 120, 'y': -60, 'zoom': 0.3, 'rot': -0.06},
        {'at': 0.44, 'x': 0, 'y': 0, 'zoom': 0.06, 'rot': 0.0, 'ease': 'outCubic'}, {'at': 0.5, 'zoom': 0.24, 'rot': 0.04, 'ease': 'outQuart'}, {'at': 1, 'zoom': 0.14, 'rot': 0.02, 'ease': 'outCubic'}]}, 'minimal': 'skip'},
    {'at': 2120, 'prim': 'hitStop', 'args': {'ms': 70}},
    {'at': 2120, 'prim': 'shake', 'args': {'px': 24}},
    {'at': 2120, 'prim': 'flashScreen', 'dur': 100, 'args': {'color': '#ffffff', 'alpha': 0.42}},
    {'at': 2120, 'prim': 'flashSprite', 'args': {'target': '$targets', 'ms': 60}},
    {'at': 2120, 'prim': 'rgbSplit', 'dur': 120, 'args': {'offset': 10}},
    {'at': 2130, 'prim': 'particles', 'args': {'count': 260, 'at': {'x': '$target', 'y': '$target'}, 'speed': 1500, 'life': 600, 'frames': ['shard', 'star', 'streak'], 'colors': ['#ffffff', '@color.primary', '#0a0a0a']}},
    {'at': 2380, 'prim': 'finishCard', 'dur': 960, 'args': {'artId': 'show.$pair', 'enterFrom': 'right', 'slideMs': 150, 'zoom': 1.04}},
    {'at': 2500, 'prim': 'freezeFrame', 'dur': 500, 'args': {}},
    {'at': 2440, 'prim': 'duoTitle', 'dur': 900, 'args': {}},
    {'at': 2700, 'prim': 'totalDamage', 'dur': 640, 'args': {'label': 'label.totalDamage', 'pos': {'x': 400, 'y': 190}}},
], key=lambda t: t['at'])}

# LEVEL UP（🆕 levelup，FX-MAP 建议 1.0s）：剪报 LEVEL UP 字 + 星芒；能力卡由 HUD 结算页展示
out['levelup'] = {'id': 'levelup', 'event': 'levelup', 'duration': 900, 'assets': [], 'tracks': [
    {'at': 0, 'prim': 'flashScreen', 'dur': 90, 'args': {'color': '#ffffff', 'alpha': 0.4}},
    {'at': 0, 'prim': 'title', 'dur': 780, 'args': {'text': 'result.levelup', 'size': 120, 'pos': {'x': 640, 'y': 320}, 'rot': -0.1, 'invert': [0, 6]}},
    {'at': 0, 'prim': 'particles', 'args': {'count': 80, 'at': {'x': 640, 'y': 320}, 'speed': 1100, 'life': 600, 'gravity': 200, 'frames': ['star', 'shard'], 'colors': ['#ffe14a', '#ffffff', '@color.primary']}},
    {'at': 0, 'prim': 'sfx', 'args': {'id': 'levelup'}},
]}
# P3/P4 原语最小演示（红色皮不在流程里用；__umbra.demoFx(id) 触发）。挂在 highlight 事件（3.5s 上限），P3 暴击眼部横条按更正挂「暴击」演示
out['demo.p3.crit'] = {'id': 'demo.p3.crit', 'event': 'highlight', 'match': {'skillId': 'demo.p3.crit'}, 'duration': 1300, 'assets': [], 'tracks': [
    {'at': 0, 'prim': 'eyeStrip', 'dur': 600, 'args': {'art': 'char.$actor#cutin', 'figure': 'char.$actor#body', 'color': '#0b2a6b'}},
    {'at': 120, 'prim': 'onomatopoeia', 'dur': 480, 'args': {'text': 'sfx.kacha', 'x': 1010, 'y': 330}},
    {'at': 650, 'prim': 'glassShatter', 'dur': 600, 'args': {'art': 'persona.$actor'}},
]}
out['demo.p3.finish'] = {'id': 'demo.p3.finish', 'event': 'highlight', 'match': {'skillId': 'demo.p3.finish'}, 'duration': 1850, 'assets': [], 'tracks': [
    {'at': 0, 'prim': 'checkerFloor', 'dur': 900, 'args': {}},
    {'at': 900, 'prim': 'ringSplash', 'dur': 900, 'args': {'art': 'char.$actor#body', 'text': 'label.finish', 'color': '#e83a8a'}},
]}
out['demo.p4.prims'] = {'id': 'demo.p4.prims', 'event': 'highlight', 'match': {'skillId': 'demo.p4.prims'}, 'duration': 3000, 'assets': [], 'tracks': [
    {'at': 0, 'prim': 'blockPush', 'dur': 700, 'args': {'colors': ['#ffe14a', '#0a0a0a']}},
    {'at': 700, 'prim': 'tvStatic', 'dur': 450, 'args': {}},
    {'at': 1150, 'prim': 'cardFlip', 'dur': 420, 'args': {}},
    {'at': 1600, 'prim': 'cardShatter', 'dur': 520, 'args': {}},
    {'at': 2150, 'prim': 'dateFlip', 'dur': 800, 'args': {}},
]}
for name in ['action.baton.json']:
    try: os.remove(os.path.join(D, name))
    except FileNotFoundError: pass
for name in os.listdir(D):
    if name.startswith('skill.') and name not in [k + '.json' for k in out]: os.remove(os.path.join(D, name))
for k, r in out.items():
    json.dump(r, open(os.path.join(D, k + '.json'), 'w'), ensure_ascii=False, indent=1)
# index.ts：按文件名组装（皮肤只做注册）
files = sorted(f[:-5] for f in os.listdir(D) if f.endswith('.json'))
imp = '\n'.join(f"import r{i} from './recipes/{f}.json';" for i, f in enumerate(files))
idx = f"""// p5r-red 皮肤包：只做组装与注册（契约 §0.1：无演出代码、无动态 import、无副作用 import）。由 tools/gen_recipes.py 生成。
import {{ UMBRA }} from '../../engine';
import type {{ SkinPack, Recipe }} from '../_contract';
import manifest from './manifest.json';
import tokens from './tokens.json';
import slots from './slots.json';
import labels from './labels.json';
import templates from './templates.json';
import roster from './roster.json';
{imp}

const recipes = [{', '.join(f'r{i}' for i in range(len(files)))}] as unknown as Recipe[];
const pack = {{ id: 'p5r-red', manifest, tokens, slots, labels, templates, roster, recipes }} as unknown as SkinPack;
UMBRA.registerSkin('p5r-red', pack);
export default pack;
"""
open(os.path.join(D, '..', 'index.ts'), 'w').write(idx)
print(len(out), 'generated;', len(files), 'recipes total')
