#!/usr/bin/env python3
"""粉 p3r-pink recipes 生成（scratch，不进仓库）。输出 $WT/src/umbra/skins/p3r-pink/recipes/*.json
设计母题（与蓝皮区分，不是换色）：
- 转场 = 樱瓣剪影 maskWipe（mask.petal 由小放大旋入）+ 缎带剪影 maskWipe（mask.ribbon 横扫），不用 slashPanels / cardShatter；
- 总攻定格 = 粉白高光版式（白闪→粉白樱瓣喷流→+0.21rad 斜置定格画，总伤害牌放左下白底玫红字）；
- 菜单入场更轻快（tokens：uiOpen 200 outBack）；
- 召唤 = 举枪（ally.hamuko.evoke）→ 扣扳机前一帧 glassShatter（碎的是举枪剪影本身），无面部特写。
"""
import json, os
WT = '/workspace/projects/86a5b727-7f71-46d0-bb30-e183f98dd9ca/work/wt/p3r-pink'
OUT = WT + '/src/umbra/skins/p3r-pink/recipes/'
os.makedirs(OUT, exist_ok=True)
for f in os.listdir(OUT):
    if f.endswith('.json'): os.remove(OUT + f)

PETALS = ['fx.petal.a', 'fx.petal.b', 'fx.petal.c']
PINKS = ['#ffffff', '@color.primary', '@color.secondary']
TGT = {'x': '$target', 'y': '$target', 'dy': -230}
SCR = {'x': 640, 'y': 360}

def T(at, prim, args=None, dur=None, **kw):
    t = {'at': at}
    if dur is not None: t['dur'] = dur
    t['prim'] = prim
    for k in ('layer', 'ease', 'repeatEvery', 'times', 'minimal'):
        if k in kw: t[k] = kw[k]
    t['args'] = args or {}
    return t

def petals(at, count, life, pos, speed=700, spread=1.2, dir=-1.57, gravity=300, size=1.0, frames=PETALS, colors=PINKS, **kw):
    return T(at, 'particles', {'count': count, 'at': pos, 'speed': speed, 'spread': spread, 'dir': dir, 'life': life,
                               'size': size, 'gravity': gravity, 'frames': frames, 'colors': colors}, **kw)

def evoke_block(t0, actor_ref='$actor'):
    """召唤：举枪剪影入场 → 扣扳机前一帧碎裂（glassShatter，snapshot=target #evk），无特写。占 t0..t0+760。"""
    return [
        T(t0, 'hide', {'target': actor_ref}),
        T(t0, 'show', {'target': '#evk'}),
        T(t0, 'tween', {'target': '#evk', 'from': {'x': actor_ref, 'y': actor_ref, 'alpha': 0, 'scale': 0.96},
                        'to': {'x': actor_ref, 'y': actor_ref, 'alpha': 1, 'scale': 1}}, dur=180, ease='outCubic'),
        T(t0 + 40, 'sfx', {'id': 'evoker.raise'}),
        # 扣扳机前一帧（≈t0+240）切碎：碎片从太阳穴位置炸开
        T(t0 + 240, 'glassShatter', {'snapshot': 'target', 'target': '#evk', 'shards': 34,
                                     'impact': {'x': '#evk', 'y': '#evk', 'dx': -40, 'dy': -560}, 'fallMs': 460},
          dur=520, layer='ally', minimal={'dur': 300}),
        T(t0 + 240, 'sfx', {'id': 'evoker.shatter'}),
        T(t0 + 240, 'hide', {'target': '#evk'}),
        petals(t0 + 260, 50, 500, {'x': actor_ref, 'y': actor_ref, 'dy': -560}, speed=600, spread=3.1, dir=0,
               gravity=500, frames=['fx.shard', 'fx.petal.a'], colors=['#ffffff', '@color.secondary'], minimal='skip'),
        T(t0 + 760, 'show', {'target': actor_ref}),
    ]

def cutin_track(at, name_key):
    return T(at, 'cutin', {
        'bandAngle': 0.21, 'speedLines': {'layers': 2, 'count': 36},
        'panels': [{'shape': [-1300, -150, 1300, -110, 1300, 150, -1300, 110], 'art': 'cutin.hamuko', 'enterFrom': 'right'}],
        'nameplate': {'text': name_key, 'font': '@font.display'}}, dur=520, layer='cutin', ease='outBack', minimal={'dur': 250})

R = []

# ------------------------------------------------------------------ 开战转场：樱瓣剪影旋入放大 → 缎带横扫揭开
R.append({'id': 'transition.battleStart', 'event': 'battle:start', 'duration': 880,
  'assets': ['mask.petal', 'mask.ribbon', 'fx.petal.a', 'fx.petal.b', 'fx.petal.c'],
  'tracks': [
    T(0, 'sfx', {'id': 'trans.petal'}),
    T(0, 'maskWipe', {'shape': 'mask.petal', 'from': {'x': 640, 'y': 360, 'scale': 0.04, 'rotation': -0.7},
                      'to': {'x': 640, 'y': 360, 'scale': 7.2, 'rotation': 0.35}, 'color': '@color.primary'},
      dur=480, layer='trans', ease='inOutCubic', minimal={'dur': 350}),
    petals(60, 110, 620, SCR, speed=900, spread=3.1, dir=0, gravity=120, minimal='skip'),
    T(340, 'flashScreen', {'color': '#ffffff', 'alpha': 0.5}, dur=110),
    T(380, 'maskWipe', {'shape': 'mask.ribbon', 'from': {'x': -1500, 'y': 360, 'scale': 1.6}, 'to': {'x': 1500, 'y': 340, 'scale': 1.6},
                        'invert': True, 'color': '@color.secondary'}, dur=480, layer='trans', ease='outCubic', minimal='skip'),
    T(380, 'sfx', {'id': 'trans.ribbon'}),
  ]})

# ------------------------------------------------------------------ 遇敌+开战合流（≤1200）
R.append({'id': 'transition.encounterBattle', 'event': 'map:encounter', 'merges': ['battle:start'], 'duration': 1150,
  'assets': ['mask.petal', 'mask.ribbon', 'fx.petal.a', 'fx.petal.b', 'fx.petal.c'],
  'tracks': [
    T(0, 'sfx', {'id': 'encounter'}),
    T(0, 'vibrate', {'ms': 30}),
    T(0, 'dim', {'color': '#2a0b1f', 'alpha': 0.45}, dur=300),
    T(0, 'maskWipe', {'shape': 'mask.ribbon', 'from': {'x': 1500, 'y': 360, 'scale': 1.4}, 'to': {'x': -200, 'y': 380, 'scale': 1.4},
                      'color': '@color.primary'}, dur=360, layer='trans', ease='outCubic', minimal='skip'),
    T(300, 'maskWipe', {'shape': 'mask.petal', 'from': {'x': 640, 'y': 360, 'scale': 0.04, 'rotation': -0.7},
                        'to': {'x': 640, 'y': 360, 'scale': 7.2, 'rotation': 0.35}, 'color': '@color.primary'},
      dur=480, layer='trans', ease='inOutCubic', minimal={'dur': 300}),
    petals(360, 110, 620, SCR, speed=900, spread=3.1, dir=0, gravity=120, minimal='skip'),
    T(640, 'flashScreen', {'color': '#ffffff', 'alpha': 0.5}, dur=110),
    T(670, 'maskWipe', {'shape': 'mask.ribbon', 'from': {'x': -1500, 'y': 360, 'scale': 1.6}, 'to': {'x': 1500, 'y': 340, 'scale': 1.6},
                        'invert': True, 'color': '@color.secondary'}, dur=460, layer='trans', ease='outCubic', minimal={'dur': 300}),
  ]})

# ------------------------------------------------------------------ 普攻（≤1000）
R.append({'id': 'action.default', 'event': 'action', 'duration': 900, 'hitMarks': [420],
  'assets': ['fx.petal.a', 'fx.petal.b', 'fx.petal.c', 'fx.streak'],
  'tracks': [
    T(160, 'afterimage', {'actor': '$actor', 'to': {'x': '$target', 'y': '$target', 'dx': -150}, 'n': 2, 'tints': ['#ffffff', '@color.primary']},
      dur=260, ease='inCubic'),
    T(400, 'slashLine', {'pos': TGT, 'rot': 0.21, 'len': 520, 'width': 14}, dur=140, layer='fx'),
    T(420, 'hitStop', {'ms': 60}),
    T(420, 'shake', {'px': 12}),
    T(420, 'flashSprite', {'target': '$target', 'ms': 50}),
    T(420, 'squashHit', {'target': '$target', 'squash': 0.16, 'push': 18, 'recoverMs': 260}),
    petals(420, 70, 420, TGT, speed=1000, spread=1.6, dir=-0.3, gravity=400),
    T(420, 'damageNumber', {'font': '@font.number'}),
    T(420, 'tag', {'kind': '$hit', 'pos': {'x': '$target', 'y': '$target', 'dy': -320}}, dur=420),
    T(420, 'sfx', {'id': 'hit.light'}),
    T(540, 'tween', {'target': '$actor', 'to': {'x': 'home', 'y': 'home'}}, dur=300, ease='outCubic'),
  ]})

# ------------------------------------------------------------------ 通用 Persona 魔法（无专属 recipe 的召唤技能都走这里）
R.append({'id': 'action.persona.default', 'event': 'action', 'match': {'kind': 'magic'}, 'duration': 1700, 'hitMarks': [1100],
  'create': [{'name': 'evk', 'asset': 'ally.hamuko.evoke', 'layer': 'ally', 'anchor': [0.5, 1]}],
  'assets': ['ally.hamuko.evoke', 'fx.shard', 'fx.petal.a', 'fx.petal.b', 'fx.petal.c', 'fx.sparkle'],
  'tracks': evoke_block(0) + [
    T(780, 'speedLines', {'count': 30, 'dir': 0.21, 'colors': ['#ffffff', '@color.secondary'], 'scrollSpeed': 1800}, dur=320, layer='fx', minimal='skip'),
    petals(900, 90, 500, TGT, speed=500, spread=3.1, dir=0, gravity=0, frames=['fx.sparkle', 'fx.petal.a'], colors=['#ffffff', '@color.primary', '@color.accent']),
    T(1100, 'hitStop', {'ms': 70}),
    T(1100, 'shake', {'px': 16}),
    T(1100, 'flashSprite', {'target': '$target', 'ms': 50}),
    T(1100, 'squashHit', {'target': '$target', 'squash': 0.2, 'push': 22, 'recoverMs': 300}),
    T(1100, 'rgbSplit', {'offset': 8}, dur=90),
    T(1250, 'shockwave', {'center': TGT, 'amp': 40, 'wavelength': 160, 'speed': 900, 'radius': 520}, dur=420),
    petals(1100, 160, 560, TGT, speed=1300, spread=3.1, dir=0, gravity=200),
    T(1100, 'damageNumber', {'font': '@font.number', 'big': True}),
    T(1100, 'tag', {'kind': '$hit', 'pos': {'x': '$target', 'y': '$target', 'dy': -330}}, dur=500),
    T(1100, 'sfx', {'id': 'hit.magic'}),
  ]})

# ------------------------------------------------------------------ 招牌技 1：Agilao（火，cut-in + 召唤）
R.append({'id': 'action.agilao', 'event': 'action', 'match': {'skillId': 'agilao', 'actorId': 'hamuko'}, 'duration': 1780, 'hitMarks': [1180],
  'create': [{'name': 'evk', 'asset': 'ally.hamuko.evoke', 'layer': 'ally', 'anchor': [0.5, 1]}],
  'assets': ['cutin.hamuko', 'ally.hamuko.evoke', 'fx.shard', 'fx.petal.a', 'fx.petal.b', 'fx.petal.c', 'fx.streak', 'fx.sparkle'],
  'tracks': [
    T(0, 'dim', {'color': '#2a0b1f', 'alpha': 0.4}, dur=160),
    cutin_track(0, 'skill.agilao.name'),
    petals(0, 36, 480, {'x': 640, 'y': 360}, speed=1400, spread=0.4, dir=3.14, gravity=0, frames=['fx.streak', 'fx.petal.a'], colors=['#ffffff', '@color.primary'], minimal='skip'),
    T(0, 'sfx', {'id': 'cutin'}),
  ] + evoke_block(400) + [
    petals(1000, 120, 520, TGT, speed=600, spread=0.9, dir=-1.57, gravity=-200, frames=['fx.sparkle', 'fx.petal.b'], colors=['#ffd0a0', '@color.accent', '@color.primary']),
    T(1180, 'hitStop', {'ms': 80}),
    T(1180, 'shake', {'px': 18}),
    T(1180, 'flashSprite', {'target': '$target', 'ms': 50}),
    T(1180, 'squashHit', {'target': '$target', 'squash': 0.22, 'push': 26, 'recoverMs': 320}),
    T(1180, 'rgbSplit', {'offset': 9}, dur=90),
    T(1330, 'shockwave', {'center': TGT, 'amp': 46, 'wavelength': 180, 'speed': 1000, 'radius': 560}, dur=440),
    petals(1180, 220, 580, TGT, speed=1500, spread=3.1, dir=0, gravity=250, colors=['#ffffff', '@color.accent', '@color.primary']),
    T(1180, 'damageNumber', {'font': '@font.number', 'big': True}),
    T(1180, 'tag', {'kind': '$hit', 'pos': {'x': '$target', 'y': '$target', 'dy': -330}}, dur=520),
    T(1180, 'sfx', {'id': 'hit.fire'}),
  ]})

# ------------------------------------------------------------------ 招牌技 2：Cadenza（全队回复，cut-in + 召唤，无震屏）
R.append({'id': 'action.cadenza', 'event': 'action', 'match': {'skillId': 'cadenza', 'actorId': 'hamuko'}, 'duration': 1700, 'hitMarks': [1150],
  'create': [{'name': 'evk', 'asset': 'ally.hamuko.evoke', 'layer': 'ally', 'anchor': [0.5, 1]}],
  'assets': ['cutin.hamuko', 'ally.hamuko.evoke', 'fx.shard', 'fx.petal.a', 'fx.petal.b', 'fx.petal.c', 'fx.sparkle', 'hud.bow'],
  'tracks': [
    T(0, 'dim', {'color': '#fbe2ec', 'alpha': 0.25}, dur=160),
    cutin_track(0, 'skill.cadenza.name'),
    T(0, 'sfx', {'id': 'cutin'}),
  ] + evoke_block(400) + [
    T(1000, 'radialBurst', {'rays': 16, 'colors': ['#ffffff', '@color.secondary'], 'spin': 0.4}, dur=600, layer='fx', minimal={'dur': 300}),
    petals(1000, 160, 640, {'x': '$party', 'y': '$party', 'dy': 40}, speed=380, spread=0.7, dir=-1.57, gravity=-120,
           frames=['fx.petal.a', 'fx.petal.b', 'fx.sparkle'], colors=['#ffffff', '@color.secondary', '@color.primary']),
    T(1150, 'flashSprite', {'target': '$party', 'ms': 50}),
    T(1150, 'damageNumber', {'font': '@font.number'}),
    T(1150, 'sfx', {'id': 'heal'}),
  ]})

# ------------------------------------------------------------------ 1 MORE（≤450）：缎带横幅从右弹入 + 小樱瓣
R.append({'id': 'onemore', 'event': 'onemore', 'duration': 440,
  'assets': ['mask.ribbon', 'fx.petal.a', 'fx.petal.b'],
  'tracks': [
    T(0, 'banner', {'text': 'label.onemore', 'shape': [-700, -70, 700, -100, 700, 70, -700, 100], 'enterFrom': 'right', 'artId': 'mask.ribbon'},
      dur=380, layer='cutin', ease='outBack', minimal={'dur': 250}),
    petals(40, 40, 320, {'x': 900, 'y': 300}, speed=800, spread=1.4, dir=3.4, gravity=200, frames=['fx.petal.a', 'fx.petal.b'], minimal='skip'),
    T(0, 'sfx', {'id': 'onemore'}),
  ]})

# ------------------------------------------------------------------ HOLD UP（≤1000）：缎带环绕剪影 + 樱瓣圈 + 标题
R.append({'id': 'holdup', 'event': 'holdup', 'duration': 980,
  'assets': ['mask.ribbon', 'mask.petal', 'fx.petal.a', 'fx.petal.b', 'fx.petal.c', 'hud.bow'],
  'create': [{'name': 'bow', 'asset': 'hud.bow', 'layer': 'hud', 'anchor': [0.5, 0.5]}],
  'tracks': [
    T(0, 'dim', {'color': '#2a0b1f', 'alpha': 0.5}, dur=260),
    T(0, 'maskWipe', {'shape': 'mask.ribbon', 'from': {'x': 1600, 'y': 360, 'scale': 1.3, 'rotation': 0.21},
                      'to': {'x': 640, 'y': 360, 'scale': 1.3, 'rotation': 0.21}, 'color': '@color.primary'}, dur=360, layer='trans', ease='outCubic', minimal={'dur': 250}),
    petals(120, 120, 640, {'x': '$targets', 'y': '$targets', 'dy': -200}, speed=420, spread=3.1, dir=0, gravity=0, minimal='skip'),
    T(200, 'title', {'text': 'label.holdup', 'font': '@font.display', 'size': 112, 'pos': {'x': 640, 'y': 170}, 'rot': 0.21}, dur=600, ease='outBack', minimal={'dur': 300}),
    T(260, 'show', {'target': '#bow'}),
    T(260, 'tween', {'target': '#bow', 'from': {'x': 640, 'y': 500, 'scale': 0.2, 'alpha': 0}, 'to': {'x': 640, 'y': 500, 'scale': 1, 'alpha': 1}}, dur=260, ease='outElastic'),
    T(420, 'title', {'text': 'label.chance', 'font': '@font.display', 'size': 54, 'pos': {'x': 640, 'y': 500}, 'rot': 0.21}, dur=420, minimal='skip'),
    T(0, 'sfx', {'id': 'holdup'}),
    T(820, 'tween', {'target': '#bow', 'to': {'alpha': 0}}, dur=150),
  ]})

# ------------------------------------------------------------------ 总攻（≤3500）：粉白高光版式
hits = [420 + 200 * i for i in range(8)]
R.append({'id': 'allout.default', 'event': 'allout', 'duration': 3300, 'hitMarks': hits + [2280],
  'create': [{'name': 'fin', 'asset': 'allout.finish.default', 'layer': 'allout'}],
  'assets': ['allout.finish.default', 'fx.petal.a', 'fx.petal.b', 'fx.petal.c', 'fx.streak', 'fx.sparkle', 'hud.avatar.hamuko', 'hud.avatar.yukari', 'hud.avatar.junpei', 'hud.avatar.akihiko'],
  'tracks': [
    T(0, 'flashScreen', {'color': '#ffffff', 'alpha': 0.7}, dur=120),
    T(0, 'dim', {'color': '#fbe2ec', 'alpha': 0.45}, dur=220),
    T(0, 'title', {'text': 'label.allout', 'font': '@font.display', 'size': 116, 'pos': {'x': 640, 'y': 150}, 'rot': 0.21}, dur=640, ease='outBack', minimal={'dur': 300}),
    T(0, 'speedLines', {'count': 40, 'dir': 0.21, 'colors': ['#ffffff', '@color.secondary'], 'scrollSpeed': 2200}, dur=2100, layer='fx'),
    T(300, 'silhouetteDash', {'units': '$party', 'count': 8, 'interval': 200, 'path': 'R2L'}, dur=1700,
      minimal={'args': {'units': '$party', 'count': 3, 'interval': 200, 'path': 'R2L'}}),
    T(420, 'slashLine', {'pos': TGT, 'rot': -0.21, 'len': 800, 'width': 12}, dur=150, layer='fx', repeatEvery=200, times=8),
    petals(420, 60, 520, TGT, speed=1100, spread=3.1, dir=0, gravity=300, repeatEvery=200, times=8),
    T(420, 'sfx', {'id': 'allout.hit'}, repeatEvery=200, times=8),
    # 收尾：白闪 → 樱瓣喷流 → 定格
    T(2280, 'flashScreen', {'color': '#ffffff', 'alpha': 0.9}, dur=160),
    T(2280, 'shockwave', {'center': TGT, 'amp': 56, 'wavelength': 200, 'speed': 1100, 'radius': 640}, dur=500),
    petals(2280, 240, 700, {'x': -40, 'y': 680}, speed=1600, spread=0.5, dir=-0.55, gravity=-60, colors=['#ffffff', '@color.secondary', '@color.primary']),
    T(2280, 'finishCard', {'artId': 'allout.finish.default', 'shape': [-700, -400, 760, -330, 700, 400, -760, 330], 'enterFrom': 'left', 'zoom': 1.03},
      dur=980, layer='allout', ease='outCubic'),
    T(2460, 'freezeFrame', {'ms': 760, 'keepRendering': True}, dur=760),
    T(2460, 'totalDamage', {'label': 'label.totalDamage', 'plate': [-300, -60, 320, -80, 300, 60, -320, 80], 'pos': {'x': 420, 'y': 470}, 'font': '@font.number'},
      dur=760, ease='outBack'),
    T(2280, 'sfx', {'id': 'allout.finish'}),
    T(3100, 'tween', {'target': '#layer.allout', 'to': {'alpha': 0}}, dur=200),
  ]})

# ------------------------------------------------------------------ Theurgy（≤3500）
R.append({'id': 'highlight.hamuko', 'event': 'highlight', 'match': {'actorId': 'hamuko'}, 'duration': 3460, 'hitMarks': [2600],
  'create': [{'name': 'evk', 'asset': 'ally.hamuko.evoke', 'layer': 'ally', 'anchor': [0.5, 1]}],
  'assets': ['highlight.hamuko', 'cutin.hamuko', 'ally.hamuko.evoke', 'mask.petal', 'fx.shard', 'fx.petal.a', 'fx.petal.b', 'fx.petal.c', 'fx.sparkle', 'fx.streak'],
  'tracks': [
    T(0, 'dim', {'color': '#2a0b1f', 'alpha': 0.55}, dur=300),
    T(0, 'maskWipe', {'shape': 'mask.petal', 'from': {'x': 640, 'y': 360, 'scale': 7.2, 'rotation': 0.35},
                      'to': {'x': 640, 'y': 360, 'scale': 0.6, 'rotation': -0.3}, 'invert': True, 'color': '@color.primary'}, dur=420, layer='trans', ease='outCubic', minimal='skip'),
    T(120, 'title', {'text': 'label.highlight', 'font': '@font.display', 'size': 128, 'pos': {'x': 640, 'y': 160}, 'rot': 0.21}, dur=700, ease='outBack', minimal={'dur': 300}),
    T(120, 'sfx', {'id': 'theurgy.start'}),
    cutin_track(320, 'skill.theurgy.hamuko.name'),
  ] + evoke_block(860) + [
    T(1500, 'finishCard', {'artId': 'highlight.hamuko', 'shape': [-760, -330, 700, -400, 760, 330, -700, 400], 'enterFrom': 'right', 'zoom': 1.04},
      dur=1000, layer='allout', ease='outCubic'),
    T(1700, 'freezeFrame', {'ms': 700, 'keepRendering': True}, dur=700),
    T(1500, 'radialBurst', {'rays': 24, 'colors': ['#ffffff', '@color.primary', '@color.secondary'], 'spin': 0.8}, dur=1600, layer='fx'),
    petals(2400, 120, 500, {'x': 1320, 'y': 360}, speed=1800, spread=0.4, dir=3.14, gravity=0, frames=['fx.streak', 'fx.petal.a'], colors=['#ffffff', '@color.primary']),
    T(2600, 'hitStop', {'ms': 90}),
    T(2600, 'shake', {'px': 24}),
    T(2600, 'flashScreen', {'color': '#ffffff', 'alpha': 0.85}, dur=160),
    T(2600, 'flashSprite', {'target': '$targets', 'ms': 60}),
    T(2600, 'squashHit', {'target': '$targets', 'squash': 0.22, 'push': 30, 'recoverMs': 320}),
    T(2600, 'rgbSplit', {'offset': 10}, dur=120),
    T(2750, 'shockwave', {'center': TGT, 'amp': 60, 'wavelength': 220, 'speed': 1200, 'radius': 700}, dur=500),
    petals(2600, 300, 700, TGT, speed=1700, spread=3.1, dir=0, gravity=260, colors=['#ffffff', '@color.primary', '@color.secondary']),
    T(2600, 'damageNumber', {'font': '@font.number', 'big': True}),
    T(2600, 'sfx', {'id': 'theurgy.hit'}),
    T(3300, 'tween', {'target': '#layer.allout', 'to': {'alpha': 0}}, dur=160),
  ]})

R.append({'id': 'highlight.hamuko.short', 'event': 'highlight', 'match': {'actorId': 'hamuko'}, 'duration': 1150, 'hitMarks': [620],
  'assets': ['highlight.hamuko', 'fx.petal.a', 'fx.petal.b', 'fx.petal.c'],
  'tracks': [
    T(0, 'flashScreen', {'color': '#ffffff', 'alpha': 0.6}, dur=100),
    T(0, 'finishCard', {'artId': 'highlight.hamuko', 'shape': [-760, -330, 700, -400, 760, 330, -700, 400], 'enterFrom': 'right', 'zoom': 1.02},
      dur=560, layer='allout', ease='outCubic'),
    T(0, 'title', {'text': 'label.theurgy.short', 'font': '@font.display', 'size': 96, 'pos': {'x': 640, 'y': 150}, 'rot': 0.21}, dur=420, minimal={'dur': 300}),
    T(0, 'sfx', {'id': 'theurgy.start'}),
    T(560, 'tween', {'target': '#layer.allout', 'to': {'alpha': 0}}, dur=120),
    T(620, 'hitStop', {'ms': 70}),
    T(620, 'shake', {'px': 20}),
    T(620, 'flashSprite', {'target': '$targets', 'ms': 50}),
    T(620, 'rgbSplit', {'offset': 8}, dur=90),
    petals(620, 200, 460, TGT, speed=1500, spread=3.1, dir=0, gravity=260),
    T(620, 'damageNumber', {'font': '@font.number', 'big': True}),
    T(620, 'sfx', {'id': 'theurgy.hit'}),
  ]})
# 简短版的选择：契约 match 无 short 字段（payload 里有 short?），id 带 .short；见进度待答

# ------------------------------------------------------------------ 倒地（重叠层，≤500）：樱瓣碎裂；文字被丢时信息仍由碎裂传达
R.append({'id': 'unit.down', 'event': 'unit:down', 'duration': 480,
  'assets': ['fx.petal.a', 'fx.petal.b', 'fx.shard'],
  'tracks': [
    T(0, 'portraitDown', {'unit': '$targets', 'style': 'shatter'}, dur=420, minimal={'dur': 200}),
    petals(0, 80, 420, {'x': '$targets', 'y': '$targets', 'dy': -200}, speed=700, spread=3.1, dir=0, gravity=600,
           frames=['fx.petal.a', 'fx.petal.b', 'fx.shard'], colors=['#ffffff', '@color.primary', '@color.resist']),
    T(0, 'tag', {'kind': 'DOWN', 'pos': {'x': '$targets', 'y': '$targets', 'dy': -320}}, dur=420, minimal='skip'),
    T(0, 'sfx', {'id': 'down'}),
  ]})

# ------------------------------------------------------------------ 战斗结束（≤1500）：无人脸，缎带扫入 + RESULT + 缎带结
R.append({'id': 'battle.end', 'event': 'battle:end', 'duration': 1400,
  'assets': ['mask.ribbon', 'hud.bow', 'fx.petal.a', 'fx.petal.b', 'fx.petal.c'],
  'create': [{'name': 'bow', 'asset': 'hud.bow', 'layer': 'hud', 'anchor': [0.5, 0.5]}],
  'tracks': [
    T(0, 'maskWipe', {'shape': 'mask.ribbon', 'from': {'x': -1500, 'y': 380, 'scale': 1.5, 'rotation': -0.21},
                      'to': {'x': 640, 'y': 380, 'scale': 1.5, 'rotation': -0.21}, 'color': '@color.paper'}, dur=420, layer='trans', ease='outCubic', minimal={'dur': 300}),
    T(200, 'title', {'text': 'label.result', 'font': '@font.display', 'size': 140, 'pos': {'x': 600, 'y': 330}, 'rot': 0.21}, dur=700, ease='outBack', minimal={'dur': 300}),
    T(380, 'show', {'target': '#bow'}),
    T(380, 'tween', {'target': '#bow', 'from': {'x': 900, 'y': 160, 'scale': 0.2, 'rotation': -0.6, 'alpha': 0},
                     'to': {'x': 900, 'y': 160, 'scale': 1, 'rotation': 0.21, 'alpha': 1}}, dur=300, ease='outElastic'),
    petals(300, 90, 800, {'x': 640, 'y': -20}, speed=200, spread=1.2, dir=1.57, gravity=120, minimal='skip'),
    T(0, 'sfx', {'id': 'victory'}),
    T(1180, 'tween', {'target': '#bow', 'to': {'alpha': 0}}, dur=200),
  ]})

# ------------------------------------------------------------------ 影时间（env:change，≤600）：预烘焙换底
R.append({'id': 'env.darkHour.enter', 'event': 'env:change', 'match': {'env': {'darkHour': True}}, 'duration': 600,
  'assets': ['bg.hub', 'bg.hub.darkhour', 'bg.battle', 'bg.battle.darkhour', 'fx.petal.a'],
  'tracks': [
    T(0, 'dim', {'color': '#0b2a14', 'alpha': 0.35}, dur=600),
    T(0, 'bakedSwap', {'from': 'bg.hub', 'to': 'bg.hub.darkhour'}, dur=400),
    T(0, 'sfx', {'id': 'darkhour.enter'}),
    petals(0, 30, 560, {'x': 640, 'y': 360}, speed=120, spread=3.1, dir=0, gravity=-40, frames=['fx.petal.a'], colors=['#3a5a3f', '#7a1d4f'], minimal='skip'),
    T(150, 'title', {'text': 'label.darkHour', 'font': '@font.display', 'size': 76, 'pos': {'x': 640, 'y': 360}, 'rot': 0.21}, dur=420, minimal='skip'),
  ]})
R.append({'id': 'env.darkHour.leave', 'event': 'env:change', 'match': {'env': {'darkHour': False}}, 'duration': 450,
  'assets': ['bg.hub', 'bg.hub.darkhour'],
  'tracks': [
    T(0, 'flashScreen', {'color': '#ffffff', 'alpha': 0.35}, dur=120),
    T(0, 'bakedSwap', {'from': 'bg.hub.darkhour', 'to': 'bg.hub'}, dur=400),
    T(0, 'sfx', {'id': 'darkhour.leave'}),
  ]})

# ------------------------------------------------------------------ 交涉开始（可选，≤800）
R.append({'id': 'talk.start', 'event': 'talk:start', 'duration': 600,
  'assets': ['mask.ribbon', 'fx.petal.a'],
  'tracks': [
    T(0, 'maskWipe', {'shape': 'mask.ribbon', 'from': {'x': 1500, 'y': 200, 'scale': 1.2}, 'to': {'x': 640, 'y': 200, 'scale': 1.2}, 'color': '@color.paper'},
      dur=320, layer='trans', ease='outBack', minimal={'dur': 200}),
    petals(80, 30, 400, {'x': 900, 'y': 200}, speed=500, spread=1.2, dir=3.3, gravity=200, frames=['fx.petal.a'], minimal='skip'),
    T(0, 'sfx', {'id': 'talk.start'}),
  ]})

for r in R:
    json.dump(r, open(OUT + r['id'] + '.json', 'w'), ensure_ascii=False, indent=1)
print(len(R), 'recipes')
