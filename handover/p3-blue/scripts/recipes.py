# Generates p3-blue recipes/*.json (scratch generator, not committed). Re-run after edits.
import json, os
OUT = '/workspace/projects/86a5b727-7f71-46d0-bb30-e183f98dd9ca/work/wt/p3-blue/src/umbra/skins/p3-blue/recipes'
os.makedirs(OUT, exist_ok=True)
for f in os.listdir(OUT):
    if f.endswith('.json'): os.remove(os.path.join(OUT, f))

NAVY, BLUE, CYAN, PALE, WHITE, RED, GOLD = '#0a1f7a', '@color.primary', '@color.secondary', '#cfeaf6', '#ffffff', '@color.accent', '@color.weak'
SLANT = -0.21
TGT = {"x": "$target", "y": "$target", "dy": -200}
ACT = {"x": "$actor", "y": "$actor", "dy": -180}
CUT_BAND = [-1300, -330, 1300, -300, 1300, -60, -1300, -30]      # y 30–330 (center-relative), keeps commands/HP/enemy names clear
BANNER = [-1300, -280, 1300, -250, 1300, -110, -1300, -80]
SHARDS = ["fx.shard.0", "fx.shard.1", "fx.shard.2"]

def T(at, prim, args=None, dur=None, **kw):
    t = {"at": at}
    if dur is not None: t["dur"] = dur
    t["prim"] = prim
    for k in ("layer", "ease"):
        if k in kw: t[k] = kw.pop(k)
    t["args"] = args or {}
    t.update(kw)
    return t

def R(id, event, duration, tracks, assets, match=None, hitMarks=None, create=None, merges=None):
    r = {"id": id, "event": event}
    if match: r["match"] = match
    if merges: r["merges"] = merges
    r["duration"] = duration
    if hitMarks is not None: r["hitMarks"] = hitMarks
    if create: r["create"] = create
    r["assets"] = assets
    r["tracks"] = tracks
    json.dump(r, open(f'{OUT}/{id}.json', 'w'), ensure_ascii=False, indent=1)

def hit_block(at, *, shake=16, shake_dur=320, stop=70, parts=200, life=500, dmg_dur=600, big=False, rgb=True, wave_at=None, wave_dur=420, colors=None, tag=True, sfx="hit.p3"):
    tr = [
        T(at, "hitStop", {"ms": stop}),
        T(at, "shake", {"px": shake}, dur=shake_dur),
        T(at, "flashSprite", {"target": "$target", "ms": 50}),
        T(at, "squashHit", {"target": "$target", "squash": 0.2, "push": 22, "recoverMs": 280}),
        T(at, "particles", {"count": parts, "at": TGT, "speed": 1300, "spread": 6.28, "life": life, "size": 10,
                            "frames": SHARDS + ["fx.spark"], "colors": colors or [WHITE, PALE, CYAN]}, layer="fx", minimal={"args": {"count": parts // 2, "at": TGT, "life": life, "frames": SHARDS}}),
        T(at, "damageNumber", {"font": "@font.number", "big": big}, dur=dmg_dur, layer="dmg"),
        T(at, "sfx", {"id": sfx}),
    ]
    if tag: tr.append(T(at, "tag", {"kind": "WEAK", "pos": {"x": "$target", "y": "$target", "dy": -300}}, dur=dmg_dur, layer="dmg"))
    if rgb: tr.append(T(at, "rgbSplit", {"offset": 8}, dur=90))
    if wave_at is not None: tr.append(T(wave_at, "shockwave", {"center": TGT, "amp": 40, "wavelength": 160, "speed": 900, "radius": 520}, dur=wave_dur))
    return tr

def evoker(at_raise, at_shot, shards=36, fall=480, shatter_dur=520, impact=ACT):
    """P3/P3R summon: raise Evoker -> glassShatter one frame (16ms) before the trigger -> shot. No close-up."""
    return [
        T(at_raise, "tween", {"target": "$actor", "to": {"rotation": -0.08, "scale": 1.04}}, dur=160, ease="outCubic"),
        T(at_raise, "sfx", {"id": "evoker.raise"}),
        T(at_shot - 16, "glassShatter", {"snapshot": "screen", "shards": shards, "impact": impact, "fallMs": fall}, dur=shatter_dur, layer="trans", minimal={"dur": 300}),
        T(at_shot, "sfx", {"id": "evoker.shot"}),
        T(at_shot, "vibrate", {"ms": 20}),
        T(at_shot, "flashScreen", {"color": PALE, "alpha": 0.55}, dur=100),
    ]

def persona_in(node, at, dur=240):
    return [T(at, "show", {"target": node}),
            T(at, "tween", {"target": node, "from": {"alpha": 0, "scale": 0.9}, "to": {"alpha": 1, "scale": 1}}, dur=dur, ease="outBack")]

def persona_out(node, at, dur=280):
    return [T(at, "tween", {"target": node, "to": {"alpha": 0}}, dur=dur, ease="inCubic"), T(at + dur, "hide", {"target": node})]

def cutin(at, dur, name, art="cutin.hero", panels=None, lines=40):
    return T(at, "cutin", {"bandAngle": -0.14, "speedLines": {"layers": 2, "count": lines},
                           "panels": panels or [{"shape": CUT_BAND, "art": art, "enterFrom": "right", "delay": 0}],
                           "nameplate": {"text": name, "font": "@font.display"}}, dur=dur, ease="outCubic", layer="cutin", minimal={"dur": 250})

# 1 transition.battleStart — slashPanels + tarot cardShatter + crescent maskWipe (0.86s)
R("transition.battleStart", "battle:start", 860, [
    T(0, "sfx", {"id": "encounter"}),
    T(0, "vibrate", {"ms": 30}),
    T(0, "slashPanels", {"colors": [NAVY, BLUE, CYAN, WHITE], "angle": SLANT, "stagger": 60, "dir": "left"}, dur=480, layer="trans", ease="outQuart", minimal={"dur": 300}),
    T(260, "cardShatter", {"cardArt": "fx.tarot", "pieces": 20, "dir": "out"}, dur=420, layer="trans", minimal="skip"),
    T(260, "particles", {"count": 40, "at": {"x": 640, "y": 360}, "speed": 900, "spread": 6.28, "life": 500, "frames": SHARDS, "colors": [WHITE, PALE]}, layer="trans", minimal="skip"),
    T(420, "maskWipe", {"shape": "fx.wipe.crescent", "from": {"scale": 0.1, "x": 640, "y": 360}, "to": {"scale": 7, "x": 640, "y": 360}, "invert": True}, dur=440, layer="trans", ease="inOutCubic", minimal={"dur": 300}),
], ["fx.tarot", "fx.wipe.crescent"] + SHARDS)

# 1b merged encounter + battle start (1.15s ≤ 1.2s)
R("transition.encounterBattle", "map:encounter", 1150, [
    T(0, "sfx", {"id": "encounter.touch"}),
    T(0, "flashScreen", {"color": WHITE, "alpha": 0.6}, dur=120),
    T(0, "dim", {"color": NAVY, "alpha": 0.4}, dur=300),
    T(0, "speedLines", {"count": 30, "dir": SLANT, "colors": [WHITE, CYAN], "scrollSpeed": 2400}, dur=300, minimal="skip"),
    T(280, "sfx", {"id": "encounter"}),
    T(280, "vibrate", {"ms": 30}),
    T(280, "slashPanels", {"colors": [NAVY, BLUE, CYAN, WHITE], "angle": SLANT, "stagger": 60, "dir": "left"}, dur=480, layer="trans", ease="outQuart", minimal={"dur": 250}),
    T(540, "cardShatter", {"cardArt": "fx.tarot", "pieces": 20, "dir": "out"}, dur=420, layer="trans", minimal="skip"),
    T(700, "maskWipe", {"shape": "fx.wipe.crescent", "from": {"scale": 0.1, "x": 640, "y": 360}, "to": {"scale": 7, "x": 640, "y": 360}, "invert": True}, dur=440, layer="trans", ease="inOutCubic", minimal={"dur": 250}),
], ["fx.tarot", "fx.wipe.crescent"], merges=["battle:start"])

# 2 action.default — generic attack (0.94s)
R("action.default", "action", 940, [
    T(0, "afterimage", {"actor": "$actor", "to": {"x": "$target", "y": "$target", "dx": -150}, "n": 2, "tints": [WHITE, BLUE]}, dur=220, ease="inCubic"),
    T(0, "sfx", {"id": "swing"}),
    T(240, "slashLine", {"pos": TGT, "rot": -0.6, "len": 520, "width": 18}, dur=140, layer="fx"),
    *hit_block(300, shake=12, shake_dur=280, parts=80, life=480, dmg_dur=600, rgb=False, tag=False, sfx="hit.light"),
    T(300, "tag", {"kind": "WEAK", "pos": {"x": "$target", "y": "$target", "dy": -300}}, dur=600, layer="dmg"),
    T(440, "tween", {"target": "$actor", "to": {"x": "home", "y": "home"}}, dur=300, ease="outCubic"),
], SHARDS + ["fx.spark"], hitMarks=[300])

# 3 action.agi — hero signature #1: cut-in -> Evoker -> Orpheus fire (1.72s)
R("action.agi", "action", 1720, [
    T(0, "dim", {"color": NAVY, "alpha": 0.45}, dur=1600),
    cutin(0, 520, "skill.agi.name"),
    T(0, "sfx", {"id": "cutin"}),
    T(0, "particles", {"count": 40, "at": {"x": 640, "y": 180}, "dir": 3.14, "spread": 0.4, "speed": 1600, "life": 460, "frames": ["fx.streak"], "colors": [WHITE, CYAN]}, layer="cutin", minimal="skip"),
    *evoker(520, 700),
    *persona_in("#persona", 720),
    T(1000, "particles", {"count": 80, "at": TGT, "dir": -1.57, "spread": 0.7, "speed": 600, "gravity": -400, "life": 500, "frames": ["fx.dot", "fx.spark"], "colors": [GOLD, "#ff7a2a", RED]}, layer="fx"),
    T(1000, "sfx", {"id": "agi.cast"}),
    *hit_block(1120, shake=18, shake_dur=360, stop=80, parts=220, life=520, dmg_dur=560, big=True, wave_at=1270, colors=[GOLD, "#ff7a2a", WHITE], sfx="hit.fire"),
    *persona_out("#persona", 1360),
    T(1400, "tween", {"target": "$actor", "to": {"rotation": 0, "scale": 1}}, dur=300, ease="outCubic"),
], ["cutin.hero", "persona.orpheus", "fx.streak", "fx.dot", "fx.spark"] + SHARDS,
  match={"skillId": "Agi", "actorId": "hero"}, hitMarks=[1120],
  create=[{"name": "persona", "asset": "persona.orpheus", "layer": "ally", "anchor": [0.5, 1]}])

# 4 action.bash — hero signature #2: cut-in -> Evoker -> Orpheus lyre strike (1.7s)
R("action.bash", "action", 1700, [
    T(0, "dim", {"color": NAVY, "alpha": 0.45}, dur=1560),
    cutin(0, 520, "skill.bash.name"),
    T(0, "sfx", {"id": "cutin"}),
    T(0, "particles", {"count": 40, "at": {"x": 640, "y": 180}, "dir": 3.14, "spread": 0.4, "speed": 1600, "life": 460, "frames": ["fx.streak"], "colors": [WHITE, CYAN]}, layer="cutin", minimal="skip"),
    *evoker(520, 700),
    *persona_in("#persona", 720, dur=200),
    T(920, "afterimage", {"actor": "#persona", "to": {"x": "$target", "y": "$target", "dx": -180}, "n": 3, "tints": [WHITE, CYAN, BLUE]}, dur=240, ease="inCubic"),
    T(1120, "slashLine", {"pos": TGT, "rot": -0.4, "len": 640, "width": 24}, dur=160, layer="fx"),
    *hit_block(1180, shake=20, shake_dur=360, stop=85, parts=200, life=480, dmg_dur=500, big=True, wave_at=1330, wave_dur=360, sfx="hit.heavy"),
    *persona_out("#persona", 1360),
    T(1380, "tween", {"target": "$actor", "to": {"rotation": 0, "scale": 1}}, dur=300, ease="outCubic"),
], ["cutin.hero", "persona.orpheus", "fx.streak", "fx.spark"] + SHARDS,
  match={"skillId": "Bash", "actorId": "hero"}, hitMarks=[1180],
  create=[{"name": "persona", "asset": "persona.orpheus", "layer": "ally", "anchor": [0.5, 1]}])

# 5 summon.evoker — any Persona magic: raise -> glassShatter one frame before trigger, no close-up (1.5s)
R("summon.evoker", "action", 1500, [
    *evoker(0, 300, shards=32, fall=440, shatter_dur=480),
    *persona_in("#persona", 320),
    T(620, "particles", {"count": 100, "at": TGT, "speed": 700, "spread": 1.2, "dir": -1.57, "life": 460, "frames": ["fx.dot", "fx.spark"], "colors": [WHITE, CYAN, BLUE]}, layer="fx"),
    T(620, "sfx", {"id": "magic.cast"}),
    *hit_block(820, shake=14, shake_dur=300, parts=160, life=480, dmg_dur=560, rgb=True, sfx="hit.magic"),
    *persona_out("#persona", 1000, dur=260),
    T(1080, "tween", {"target": "$actor", "to": {"rotation": 0, "scale": 1}}, dur=240, ease="outCubic"),
], ["persona.orpheus", "fx.dot", "fx.spark"] + SHARDS, match={"kind": "magic"}, hitMarks=[820],
  create=[{"name": "persona", "asset": "persona.orpheus", "layer": "ally", "anchor": [0.5, 1]}])

# 6 onemore (0.44s) — upper-half band, never over command list
R("onemore", "onemore", 440, [
    T(0, "banner", {"text": "label.onemore", "shape": BANNER, "enterFrom": "right", "artId": "cutin.hero"}, dur=420, layer="cutin", ease="outQuart", minimal={"dur": 250}),
    T(0, "sfx", {"id": "onemore"}),
    T(0, "particles", {"count": 30, "at": {"x": 1280, "y": 180}, "dir": 3.14, "spread": 0.3, "speed": 1800, "life": 380, "frames": ["fx.streak"], "colors": [WHITE, CYAN]}, layer="cutin", minimal="skip"),
    T(60, "slashLine", {"pos": {"x": 640, "y": 190}, "rot": SLANT, "len": 1400, "width": 10}, dur=160, layer="cutin"),
], ["cutin.hero", "fx.streak"])

# 7 holdup (0.98s)
R("holdup", "holdup", 980, [
    T(0, "dim", {"color": NAVY, "alpha": 0.5}, dur=980),
    T(0, "sfx", {"id": "holdup"}),
    T(0, "slashPanels", {"colors": [NAVY, BLUE, WHITE], "angle": SLANT, "stagger": 60, "dir": "right"}, dur=380, layer="trans", minimal={"dur": 250}),
    T(200, "radialBurst", {"rays": 12, "colors": [BLUE, CYAN], "spin": 0.4}, dur=700, layer="fx", minimal="skip"),
    T(220, "title", {"text": "label.holdup", "font": "@font.display", "size": 96, "pos": {"x": 640, "y": 190}, "rot": SLANT}, dur=560, ease="outBack", layer="hud", minimal={"dur": 300}),
    T(300, "particles", {"count": 40, "at": {"x": 640, "y": 360}, "speed": 300, "spread": 6.28, "life": 500, "frames": ["fx.dot"], "colors": [PALE, WHITE]}, layer="fx", minimal="skip"),
    T(780, "tween", {"target": "#layer.fx", "to": {"alpha": 0}}, dur=180),
], ["fx.dot"])

# 8 allout.default (3.4s, finishCard + freezeFrame 0.76s)
ao_hits = [400, 610, 820, 1030, 1240, 1450, 1660, 1870, 2100]
R("allout.default", "allout", 3400, [
    T(0, "dim", {"color": NAVY, "alpha": 0.5}, dur=3200),
    T(0, "sfx", {"id": "allout.start"}),
    T(0, "slashPanels", {"colors": [WHITE, CYAN, BLUE], "angle": SLANT, "stagger": 60, "dir": "left"}, dur=420, layer="allout", minimal={"dur": 250}),
    T(0, "title", {"text": "label.allout", "font": "@font.display", "size": 120, "pos": {"x": 640, "y": 170}, "rot": SLANT}, dur=700, ease="outBack", layer="allout", minimal={"dur": 300}),
    T(300, "silhouetteDash", {"units": "$party", "count": 8, "interval": 200, "path": "L-R"}, dur=1700, layer="allout", minimal={"args": {"units": "$party", "count": 3, "interval": 200}}),
    T(400, "slashLine", {"pos": TGT, "rot": SLANT, "len": 760, "width": 14}, dur=150, layer="allout", repeatEvery=210, times=8),
    T(400, "particles", {"count": 60, "at": TGT, "speed": 1100, "spread": 6.28, "life": 450, "frames": SHARDS + ["fx.spark"], "colors": [WHITE, CYAN]}, layer="allout", repeatEvery=210, times=8),
    T(400, "particles", {"count": 28, "at": {"x": "$target", "y": "$target", "dy": -80}, "speed": 260, "spread": 3.14, "dir": -1.57, "life": 600, "frames": ["fx.dot"], "colors": [PALE, "#8fa3c8"]}, layer="allout", repeatEvery=420, times=4),
    T(400, "sfx", {"id": "hit.light"}, repeatEvery=210, times=8),
    T(2100, "flashScreen", {"color": WHITE, "alpha": 0.85}, dur=150),
    T(2100, "hitStop", {"ms": 90}),
    T(2100, "shockwave", {"center": TGT, "amp": 50, "wavelength": 180, "speed": 900, "radius": 640}, dur=450),
    T(2100, "sfx", {"id": "allout.finish"}),
    T(2100, "finishCard", {"artId": "allout.finish.default", "shape": [-760, -330, 700, -400, 760, 330, -700, 400], "enterFrom": "right", "zoom": 1.03}, dur=960, ease="outCubic", layer="allout"),
    T(2300, "freezeFrame", {"ms": 760, "keepRendering": True}, dur=760),
    T(2300, "totalDamage", {"label": "label.totalDamage", "pos": {"x": 300, "y": 520}, "plate": "ui.slab"}, dur=760, ease="outBack", layer="allout"),
    T(3160, "tween", {"target": "#layer.allout", "to": {"alpha": 0}}, dur=200),
], ["allout.finish.default", "ui.slab", "fx.dot", "fx.spark"] + SHARDS, hitMarks=ao_hits)

# 9 highlight.hero — Theurgy (Cadenza: Orpheus + Apsaras) full (3.4s, skippable; finishCard flashes on skip)
R("highlight.hero", "highlight", 3400, [
    T(0, "dim", {"color": NAVY, "alpha": 0.6}, dur=3200),
    T(0, "sfx", {"id": "theurgy.start"}),
    T(0, "slashPanels", {"colors": [NAVY, BLUE, CYAN, WHITE], "angle": SLANT, "stagger": 70, "dir": "left"}, dur=500, layer="trans", minimal={"dur": 250}),
    T(200, "maskWipe", {"shape": "fx.wipe.blade", "from": {"scale": 0.2, "x": 640, "y": 360}, "to": {"scale": 5, "x": 640, "y": 360}}, dur=500, layer="trans", ease="inOutCubic", minimal="skip"),
    T(300, "title", {"text": "label.highlight", "font": "@font.number", "size": 130, "pos": {"x": 640, "y": 140}, "rot": SLANT}, dur=700, ease="outBack", layer="cutin", minimal={"dur": 300}),
    cutin(300, 560, "label.highlight", panels=[
        {"shape": [-1300, -330, 1300, -300, 1300, -170, -1300, -150], "art": "cutin.hero", "enterFrom": "right", "delay": 0},
        {"shape": [-1300, -140, 1300, -160, 1300, -30, -1300, -10], "art": "highlight.hero", "enterFrom": "left", "delay": 80}], lines=46),
    *evoker(860, 1000, shards=40, fall=480, shatter_dur=520),
    T(1000, "finishCard", {"artId": "highlight.hero", "shape": [-700, -380, 760, -360, 700, 380, -760, 360], "enterFrom": "left", "zoom": 1.02}, dur=700, ease="outCubic", layer="cutin"),
    *persona_in("#p1", 1700, dur=260),
    *persona_in("#p2", 1760, dur=260),
    T(1800, "radialBurst", {"rays": 24, "colors": [WHITE, CYAN, BLUE], "spin": 0.9}, dur=1000, layer="fx", minimal="skip"),
    T(1800, "speedLines", {"count": 40, "dir": SLANT, "colors": [WHITE, CYAN], "scrollSpeed": 2200}, dur=700, layer="fx", minimal="skip"),
    T(1900, "particles", {"count": 160, "at": {"x": 640, "y": 300}, "speed": 500, "spread": 6.28, "life": 600, "frames": ["fx.spark", "fx.dot"], "colors": [WHITE, PALE, GOLD]}, layer="fx", minimal="skip"),
    T(1900, "sfx", {"id": "theurgy.cast"}),
    *hit_block(2500, shake=20, shake_dur=360, stop=90, parts=300, life=650, dmg_dur=700, big=True, wave_at=2650, wave_dur=480, sfx="hit.theurgy"),
    T(2500, "flashScreen", {"color": WHITE, "alpha": 0.8}, dur=150),
    *persona_out("#p1", 2900, dur=300),
    *persona_out("#p2", 2900, dur=300),
    T(3000, "tween", {"target": "$actor", "to": {"rotation": 0, "scale": 1}}, dur=300, ease="outCubic"),
], ["cutin.hero", "highlight.hero", "persona.orpheus", "persona.apsaras", "fx.wipe.blade", "fx.spark", "fx.dot"] + SHARDS,
  match={"actorId": "hero"}, hitMarks=[2500],
  create=[{"name": "p1", "asset": "persona.orpheus", "layer": "ally", "anchor": [0.5, 1]},
          {"name": "p2", "asset": "persona.apsaras", "layer": "ally", "anchor": [0.5, 1]}])

# 10 highlight.hero.short (1.15s)
R("highlight.hero.short", "highlight", 1150, [
    T(0, "dim", {"color": NAVY, "alpha": 0.5}, dur=1100),
    cutin(0, 420, "label.highlight.short", art="highlight.hero", lines=30),
    T(0, "sfx", {"id": "theurgy.start"}),
    *evoker(220, 396, shards=24, fall=320, shatter_dur=360),
    *persona_in("#p1", 420, dur=180),
    *hit_block(700, shake=16, shake_dur=300, stop=70, parts=160, life=400, dmg_dur=400, big=True, rgb=True, sfx="hit.theurgy"),
    *persona_out("#p1", 800, dur=250),
    T(820, "tween", {"target": "$actor", "to": {"rotation": 0, "scale": 1}}, dur=240, ease="outCubic"),
], ["highlight.hero", "persona.orpheus", "fx.spark"] + SHARDS, match={"actorId": "hero"}, hitMarks=[700],
  create=[{"name": "p1", "asset": "persona.orpheus", "layer": "ally", "anchor": [0.5, 1]}])

# 11 unit.down (0.48s, overlap layer: shatter carries the meaning; text may be dropped)
R("unit.down", "unit:down", 480, [
    T(0, "portraitDown", {"unit": "$targets", "style": "shatter"}, dur=420, minimal={"dur": 200}),
    T(0, "flashSprite", {"target": "$targets", "ms": 40}),
    T(0, "particles", {"count": 30, "at": TGT, "speed": 700, "spread": 6.28, "gravity": 900, "life": 420, "frames": SHARDS, "colors": [WHITE, PALE, CYAN]}, layer="fx"),
    T(0, "sfx", {"id": "down"}),
    T(60, "tag", {"kind": "DOWN", "pos": {"x": "$target", "y": "$target", "dy": -300}}, dur=400, layer="dmg", minimal="skip"),
], SHARDS)

# 12 battle.end (1.4s, no faces)
R("battle.end", "battle:end", 1400, [
    T(0, "dim", {"color": NAVY, "alpha": 0.55}, dur=1400),
    T(0, "sfx", {"id": "battle.end"}),
    T(0, "slashPanels", {"colors": [WHITE, CYAN, BLUE, NAVY], "angle": SLANT, "stagger": 60, "dir": "left"}, dur=520, layer="trans", minimal={"dur": 300}),
    T(200, "cardFlip", {"cardArt": {"front": "fx.tarot", "back": "fx.tarot"}, "axis": "y", "flips": 1}, dur=480, layer="hud", minimal="skip"),
    T(300, "title", {"text": "label.result", "font": "@font.number", "size": 110, "pos": {"x": 900, "y": 200}, "rot": SLANT}, dur=700, ease="outBack", layer="hud", minimal={"dur": 300}),
    T(400, "particles", {"count": 60, "at": {"x": 900, "y": 220}, "speed": 240, "spread": 6.28, "life": 800, "frames": ["fx.dot", "fx.spark"], "colors": [PALE, WHITE]}, layer="hud", minimal="skip"),
    T(1150, "tween", {"target": "#layer.trans", "to": {"alpha": 0}}, dur=200),
], ["fx.tarot", "fx.dot", "fx.spark"])

# 13 env:change — Dark Hour enter / leave (bakedSwap, §2.4)
R("env.darkHour.enter", "env:change", 600, [
    T(0, "dim", {"color": "#0b2a14", "alpha": 0.35}, dur=600),
    T(0, "bakedSwap", {"from": "bg.hub.night", "to": "bg.hub.darkhour"}, dur=400),
    T(0, "sfx", {"id": "darkhour.enter"}),
    T(150, "title", {"text": "label.darkHour", "font": "@font.display", "size": 72, "pos": {"x": 640, "y": 360}, "rot": 0}, dur=400, layer="hud", minimal="skip"),
], ["bg.hub.night", "bg.hub.darkhour"], match={"env": {"darkHour": True}})
R("env.darkHour.leave", "env:change", 600, [
    T(0, "flashScreen", {"color": PALE, "alpha": 0.35}, dur=120),
    T(0, "bakedSwap", {"from": "bg.hub.darkhour", "to": "bg.hub.night"}, dur=400),
    T(0, "sfx", {"id": "darkhour.leave"}),
    T(150, "title", {"text": "label.darkHour.end", "font": "@font.display", "size": 60, "pos": {"x": 640, "y": 360}, "rot": 0}, dur=400, layer="hud", minimal="skip"),
], ["bg.hub.darkhour", "bg.hub.night"], match={"env": {"darkHour": False}})

print(sorted(os.listdir(OUT)))
